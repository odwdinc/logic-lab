// Logic Lab

//  RESIZE HELPERS
// ═══════════════════════════════════════════════════════════════

function hitResizeHandle(wx,wy){
  if(!selNodeId) return null;
  const n=circuits[currentCircuitId]?.nodes[selNodeId]; if(!n) return null;
  const def=blockDefs[n.defId]; if(!def||def.isIO) return null;
  // Waypoint handles take priority for nodes that define them
  const wh=descHitWaypoint(wx,wy,n);
  if(wh) return wh;
  const g=nodeGeom(n);
  for(const h of RESIZE_HANDLES){
    const hx=g.x+h.xf*g.w, hy=g.y+h.yf*g.h;
    if((wx-hx)**2+(wy-hy)**2<=(RH_HIT/vpScale)**2) return h;
  }
  return null;
}

function applyResize(wx,wy){
  const n=circuits[currentCircuitId]?.nodes[dragNodeId]; if(!n) return;
  const def=blockDefs[n.defId];
  const {mx,my,nx,ny,nw,nh}=resizeSnap;
  const dx=wx-mx, dy=wy-my;
  const id=resizeHandle.id;
  let rx=nx,ry=ny,rw=nw,rh=nh;

  if(descApplyResize(n, def, id, resizeSnap, dx, dy)) return;

  if(id.includes('e')) rw=Math.max(NODE_MIN_W,nw+dx);
  if(id.includes('w')){ rw=Math.max(NODE_MIN_W,nw-dx); rx=nx+nw-rw; }
  if(id.includes('s')) rh=Math.max(NODE_MIN_H,nh+dy);
  if(id.includes('n')){ rh=Math.max(NODE_MIN_H,nh-dy); ry=ny+nh-rh; }

  n.x=Math.round(rx/10)*10; n.y=Math.round(ry/10)*10;
  n._w=Math.round(rw/10)*10; n._h=Math.round(rh/10)*10;
}

// Draw resize handles onto selected gate node (called from drawNode)
function drawResizeHandles(g,col){
  RESIZE_HANDLES.forEach(h=>{
    const hx=g.x+h.xf*g.w, hy=g.y+h.yf*g.h;
    const isActive=dragMode==='resize'&&resizeHandle===h;
    // Dark outer ring
    ctx.beginPath(); ctx.arc(hx,hy,RH_R+2,0,Math.PI*2);
    ctx.fillStyle='rgba(10,12,16,0.85)'; ctx.fill();
    // Coloured dot
    ctx.beginPath(); ctx.arc(hx,hy,RH_R,0,Math.PI*2);
    ctx.fillStyle=isActive?'#fff':col; ctx.fill();
    ctx.strokeStyle=isActive?col:'rgba(255,255,255,0.7)';
    ctx.lineWidth=1.2/vpScale; ctx.stroke();
  });
}

// ═══════════════════════════════════════════════════════════════
//  HIT TESTING
// ═══════════════════════════════════════════════════════════════

function hitNode(wx,wy){
  const c=circuits[currentCircuitId];
  const nodes=Object.values(c.nodes).reverse();
  for(const n of nodes){
    const g=nodeGeom(n);
    if(wx>=g.x&&wx<g.x+g.w&&wy>=g.y&&wy<g.y+g.h){
      const custom=descHitNode(wx,wy,n);
      if(custom===null) return n;   // no custom test — bbox match is enough
      if(custom)        return n;   // custom test passed
      // custom===false — inside bbox but not on the shape; keep scanning
    }
  }
  return null;
}
function hitPort(wx, wy, forDrop=false){
  const c=circuits[currentCircuitId];
  for(const n of Object.values(c.nodes)){
    const def=blockDefs[n.defId];
    const g=nodeGeom(n);
    for(const [pid,pp] of Object.entries(g.ports)){
      let px=g.x+pp.x, py=g.y+pp.y;
      // Only 1-bit gate ports use the stub-tip offset (suppressed if noStub)
      if(!def?.isIO && pp.bits===1 && !pp.noStub){
        if(pp.dir==='in')  px=g.x+pp.x-STUB_LEN;
        else               px=g.x+pp.x+STUB_LEN;
      }
      if((wx-px)**2+(wy-py)**2<=(PORT_HIT/vpScale)**2) return {node:n,portId:pid,pp};
    }
  }
  // Dynamic port resolution (bus wire etc.) — checked after fixed ports
  for(const n of Object.values(c.nodes)){
    const r=descResolveWireDrop(wx,wy,n,currentCircuitId,forDrop);
    if(r) return r;
  }
  return null;
}
function hitWireWaypoint(wx,wy){
  const c=circuits[currentCircuitId]; if(!c) return null;
  const hitR=(RH_HIT+2)/vpScale;
  for(const w of Object.values(c.wires)){
    if(!w._pts?.length) continue;
    for(let i=0;i<w._pts.length;i++){
      const p=w._pts[i];
      if((wx-p.x)**2+(wy-p.y)**2<=hitR*hitR) return {wire:w,wpIdx:i};
    }
  }
  return null;
}

function hitWire(wx,wy){
  const c=circuits[currentCircuitId];
  for(const w of Object.values(c.wires)){
    const fn=c.nodes[w.fromNode],tn=c.nodes[w.toNode]; if(!fn||!tn) continue;
    const fp=portWorldPos(fn,w.fromPort),tp=portWorldPos(tn,w.toPort); if(!fp||!tp) continue;
    if(w._pts?.length){
      // Routed wire: polyline segment hit test
      const pts=[fp,...w._pts,tp];
      const hitR=8/vpScale;
      for(let i=0;i<pts.length-1;i++){
        const p0=pts[i],p1=pts[i+1];
        const dx=p1.x-p0.x,dy=p1.y-p0.y;
        const len2=dx*dx+dy*dy;
        const frac=len2>0?Math.max(0,Math.min(1,((wx-p0.x)*dx+(wy-p0.y)*dy)/len2)):0;
        const px=p0.x+dx*frac,py=p0.y+dy*frac;
        if((wx-px)**2+(wy-py)**2<=hitR*hitR) return w;
      }
    } else {
      // Unrouted wire: bezier hit test
      const dx=Math.abs(tp.x-fp.x), cp=Math.max(50,dx*0.55);
      for(let t=0;t<=1;t+=0.04){
        const bx=bez(fp.x,fp.x+cp,tp.x-cp,tp.x,t);
        const by=bez(fp.y,fp.y,tp.y,tp.y,t);
        if((wx-bx)**2+(wy-by)**2<=(8/vpScale)**2) return w;
      }
    }
  }
  return null;
}
function bez(p0,p1,p2,p3,t){const u=1-t;return u*u*u*p0+3*u*u*t*p1+3*u*t*t*p2+t*t*t*p3;}
function getXY(e){const r=canvas.getBoundingClientRect();return{cx:e.clientX-r.left,cy:e.clientY-r.top};}

// Returns true if wx,wy is over a toggleable bit cell of an IO INPUT node
// ═══════════════════════════════════════════════════════════════
