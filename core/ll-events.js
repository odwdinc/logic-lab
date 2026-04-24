// Logic Lab

//  MOUSE EVENTS
// ═══════════════════════════════════════════════════════════════

let isPanning=false,panSX=0,panSY=0,panVX=0,panVY=0;

canvas.addEventListener('wheel',e=>{
  e.preventDefault();
  const {cx,cy}=getXY(e);
  const wb=c2w(cx,cy);
  vpScale=Math.max(0.15,Math.min(3,vpScale*(e.deltaY<0?1.1:0.91)));
  const wa=c2w(cx,cy);
  vpX+=wb.x-wa.x; vpY+=wb.y-wa.y; render();
},{passive:false});

canvas.addEventListener('mousedown',e=>{
  const {cx,cy}=getXY(e);
  const {x:wx,y:wy}=c2w(cx,cy);
  if(e.button===1||(e.button===0&&e.altKey)){
    isPanning=true;panSX=cx;panSY=cy;panVX=vpX;panVY=vpY;canvas.style.cursor='grabbing';return;
  }
  if(e.button===2) return;

  // ── Wire waypoint handle drag (check before port/node) ──
  const wwh=hitWireWaypoint(wx,wy);
  if(wwh){
    dragMode='wire_wp'; dragWireId=wwh.wire.id; dragWpIdx=wwh.wpIdx;
    dragWpSnap={mx:wx,my:wy,wpX:wwh.wire._pts[wwh.wpIdx].x,wpY:wwh.wire._pts[wwh.wpIdx].y};
    canvas.style.cursor='move'; return;
  }

  // ── Resize handle hit (must check before port/node) ──
  const rh=hitResizeHandle(wx,wy);
  if(rh){
    const n=circuits[currentCircuitId].nodes[selNodeId];
    const g=nodeGeom(n);
    dragMode='resize'; dragNodeId=selNodeId; resizeHandle=rh;
    resizeSnap={mx:wx,my:wy,nx:n.x,ny:n.y,nw:g.w,nh:g.h};
    // Store initial waypoint position for waypoint-drag handles
    if(rh._wpIdx!==undefined && n._pts?.[rh._wpIdx]){
      resizeSnap._wpX=n._pts[rh._wpIdx].x; resizeSnap._wpY=n._pts[rh._wpIdx].y;
    }
    canvas.style.cursor=rh.cur; return;
  }

  const ph=hitPort(wx,wy);
  if(ph){
    wireStart={nodeId:ph.node.id,portId:ph.portId};
    wireMouseX=wx;wireMouseY=wy;dragMode='wire';canvas.style.cursor='crosshair';return;
  }
  const nh=hitNode(wx,wy);
  if(nh){
    const def=blockDefs[nh.defId];
    // Delegate cell click to descriptor hook (e.g. INPUT bit toggle)
    if(descClickCell(nh, wx, wy, currentCircuitId)) return;
    if(e.shiftKey){
      // Shift+click: toggle node in/out of selection
      if(selNodeIds.has(nh.id)) selNodeIds.delete(nh.id);
      else selNodeIds.add(nh.id);
      selNodeId=selNodeIds.size===1?[...selNodeIds][0]:null;
      updatePropPanel();render();return;
    }
    if(selNodeIds.has(nh.id)&&selNodeIds.size>1){
      // Drag the whole multi-selection
      dragMode='nodes';dragOffX=wx;dragOffY=wy;
      dragNodesSnap={};
      selNodeIds.forEach(id=>{const n=circuits[currentCircuitId].nodes[id];if(n)dragNodesSnap[id]={x:n.x,y:n.y};});
      canvas.style.cursor='grabbing';return;
    }
    // Single select + drag
    selNodeIds=new Set([nh.id]);
    selNodeId=nh.id;dragMode='node';dragNodeId=nh.id;
    dragOffX=wx-nh.x;dragOffY=wy-nh.y;
    canvas.style.cursor='grabbing';updatePropPanel();render();return;
  }
  // Empty space: start rubber-band; clear selection unless shift-extending
  if(!e.shiftKey){selNodeIds.clear();selNodeId=null;}
  selBoxStart={x:wx,y:wy};selBoxEnd={x:wx,y:wy};
  dragMode='select';updatePropPanel();render();
});

canvas.addEventListener('mousemove',e=>{
  const {cx,cy}=getXY(e);
  const {x:wx,y:wy}=c2w(cx,cy);
  mouseWX=wx;mouseWY=wy;
  document.getElementById('coords').textContent=`x:${Math.round(wx)} y:${Math.round(wy)} ${Math.round(vpScale*100)}%`;
  if(isPanning){vpX=panVX-(cx-panSX)/vpScale;vpY=panVY-(cy-panSY)/vpScale;render();return;}
  if(dragMode==='select'){
    selBoxEnd={x:wx,y:wy};render();return;
  }
  if(dragMode==='nodes'){
    const dx=Math.round((wx-dragOffX)/10)*10;
    const dy=Math.round((wy-dragOffY)/10)*10;
    const c=circuits[currentCircuitId];
    selNodeIds.forEach(id=>{const n=c.nodes[id];if(n&&dragNodesSnap[id]){n.x=dragNodesSnap[id].x+dx;n.y=dragNodesSnap[id].y+dy;}});
    simulate(currentCircuitId);return;
  }
  if(dragMode==='node'){
    const n=circuits[currentCircuitId].nodes[dragNodeId];
    if(n){n.x=Math.round((wx-dragOffX)/10)*10;n.y=Math.round((wy-dragOffY)/10)*10;}
    simulate(currentCircuitId);return;
  }
  if(dragMode==='wire'){
    wireMouseX=wx;wireMouseY=wy;
    const ph=hitPort(wx,wy);
    hovPortKey=ph?ph.node.id+'_'+ph.portId:null;
    render();return;
  }
  if(dragMode==='resize'){
    applyResize(wx,wy);
    render(); updatePropPanel(); return;
  }
  if(dragMode==='wire_wp'){
    const c=circuits[currentCircuitId];
    const w=c?.wires[dragWireId];
    if(w?._pts?.[dragWpIdx]!==undefined){
      w._pts[dragWpIdx]={
        x:Math.round((dragWpSnap.wpX+wx-dragWpSnap.mx)/10)*10,
        y:Math.round((dragWpSnap.wpY+wy-dragWpSnap.my)/10)*10,
      };
    }
    render(); return;
  }
  // Hover — check wire waypoint handles, resize handles, port dots, IO cells, nodes
  const wwh2=hitWireWaypoint(wx,wy);
  if(wwh2){canvas.style.cursor='move';return;}
  const rh=hitResizeHandle(wx,wy);
  if(rh){canvas.style.cursor=rh.cur;return;}
  const ph=hitPort(wx,wy);
  if(ph){
    if(hovPortKey!==ph.node.id+'_'+ph.portId){
      hovPortKey=ph.node.id+'_'+ph.portId; hovNodeId=ph.node.id;
      canvas.style.cursor='crosshair'; render();
    }
    return;
  }
  // Check if over a clickable cell (pointer cursor)
  if(descHitCell(wx,wy)){
    if(hovPortKey!==null||canvas.style.cursor!=='pointer'){
      hovPortKey=null; canvas.style.cursor='pointer'; render();
    }
    return;
  }
  const nh=hitNode(wx,wy);
  const newHovNode=nh?.id||null;
  if(hovPortKey!==null||hovNodeId!==newHovNode){
    hovPortKey=null; hovNodeId=newHovNode;
    canvas.style.cursor=nh?'grab':'default';
    render();
  } else if(!nh) canvas.style.cursor='default';
});

canvas.addEventListener('mouseup',e=>{
  if(isPanning){isPanning=false;canvas.style.cursor='default';return;}
  if(dragMode==='select'){
    if(selBoxStart&&selBoxEnd){
      const x1=Math.min(selBoxStart.x,selBoxEnd.x),y1=Math.min(selBoxStart.y,selBoxEnd.y);
      const x2=Math.max(selBoxStart.x,selBoxEnd.x),y2=Math.max(selBoxStart.y,selBoxEnd.y);
      if(x2-x1>4||y2-y1>4){
        Object.values(circuits[currentCircuitId].nodes).forEach(n=>{
          const g=nodeGeom(n);
          if(g.x<x2&&g.x+g.w>x1&&g.y<y2&&g.y+g.h>y1) selNodeIds.add(n.id);
        });
      }
      selNodeId=selNodeIds.size===1?[...selNodeIds][0]:null;
    }
    selBoxStart=null;selBoxEnd=null;dragMode=null;canvas.style.cursor='default';
    updatePropPanel();render();return;
  }
  if(dragMode==='nodes'){
    dragMode=null;dragNodesSnap=null;canvas.style.cursor='default';
    simulate(currentCircuitId);return;
  }
  if(dragMode==='node'){dragMode=null;canvas.style.cursor='default';simulate(currentCircuitId);return;}
  if(dragMode==='resize'){
    dragMode=null;resizeHandle=null;resizeSnap=null;
    canvas.style.cursor='default';simulate(currentCircuitId);return;
  }
  if(dragMode==='wire_wp'){
    dragMode=null; dragWireId=null; dragWpIdx=-1; dragWpSnap=null;
    canvas.style.cursor='default'; render(); return;
  }
  if(dragMode==='wire'&&wireStart){
    const {cx,cy}=getXY(e);
    const {x:wx,y:wy}=c2w(cx,cy);
    const ph=hitPort(wx,wy,true);
    if(ph&&ph.node.id!==wireStart.nodeId){
      const fnId=wireStart.nodeId,fpId=wireStart.portId;
      const tnId=ph.node.id,tpId=ph.portId;
      const fnNode=circuits[currentCircuitId].nodes[fnId];
      const tnNode=circuits[currentCircuitId].nodes[tnId];
      const fndef=blockDefs[fnNode?.defId];
      const tnDef=blockDefs[tnNode?.defId];
      const fnPorts=getNodePorts(fnNode,fndef);
      const tnPorts=getNodePorts(tnNode,tnDef);
      const fpdef=fnPorts.find(p=>p.id===fpId);
      const tnpdef=tnPorts.find(p=>p.id===tpId);
      let af=fnId,afp=fpId,at=tnId,atp=tpId;
      // auto-swap if needed (allow wiring in either direction)
      if(fpdef?.dir==='in'&&tnpdef?.dir==='out'){af=tnId;afp=tpId;at=fnId;atp=fpId;}
      const srcNode=circuits[currentCircuitId].nodes[af];
      const srcDef=blockDefs[srcNode?.defId];
      const srcPorts=getNodePorts(srcNode,srcDef);
      const spp=srcPorts.find(p=>p.id===afp);
      if(spp?.dir==='out') addWire(currentCircuitId,af,afp,at,atp);
      else toast('Connect an output port to an input port');
    }
    wireStart=null;dragMode=null;hovPortKey=null;canvas.style.cursor='default';render();
  }
});
canvas.addEventListener('mouseleave',()=>{
  isPanning=false;dragMode=null;wireStart=null;
  selBoxStart=null;selBoxEnd=null;
  render();
});

canvas.addEventListener('dblclick',e=>{
  const {cx,cy}=getXY(e);
  const {x:wx,y:wy}=c2w(cx,cy);
  const n=hitNode(wx,wy);
  if(n){
    if(descDblClick(wx,wy,n,currentCircuitId)) return;
    const def=blockDefs[n.defId];
    if(def?.circuit) enterBlock(n.defId, n.id, currentCircuitId);
    else if(def?.isIO){
      document.getElementById('modal-body').innerHTML=`
        <div class="mf"><label>LABEL</label>
          <input id="rename-inp" class="prop-input" value="${(n.label||def.name).replace(/"/g,'&quot;')}" maxlength="24" autofocus></div>`;
      openModal('Rename Node','',()=>{
        const v=document.getElementById('rename-inp')?.value?.trim();
        if(v){n.label=v.slice(0,24);render();updatePropPanel();}
      },'Rename');
      setTimeout(()=>{ const el=document.getElementById('rename-inp'); if(el){el.select();} },50);
    }
    return;
  }
  // Wire double-click: add/remove waypoints
  const w=hitWire(wx,wy);
  if(w){
    const c=circuits[currentCircuitId];
    const fn=c.nodes[w.fromNode],tn=c.nodes[w.toNode];
    const fp=portWorldPos(fn,w.fromPort),tp=portWorldPos(tn,w.toPort);
    if(!fp||!tp) return;
    // Near existing waypoint → remove it
    if(w._pts?.length){
      const hitR=(RH_HIT+4)/vpScale;
      for(let i=0;i<w._pts.length;i++){
        if((wx-w._pts[i].x)**2+(wy-w._pts[i].y)**2<=hitR*hitR){
          w._pts.splice(i,1);
          if(!w._pts.length) delete w._pts;
          render(); return;
        }
      }
    }
    // No existing waypoints → place first one at click position
    if(!w._pts){
      w._pts=[{x:Math.round(wx/10)*10,y:Math.round(wy/10)*10}];
      render(); return;
    }
    // Insert waypoint into existing polyline at the nearest segment
    const pts=[fp,...w._pts,tp];
    const info=rrPathInfo(pts);
    const target=rrNearestT(pts,info,wx,wy).t*info.total;
    for(let s=0;s<info.segs.length;s++){
      const seg=info.segs[s];
      if(target<=seg.start+seg.len||s===info.segs.length-1){
        const frac=seg.len>0?(target-seg.start)/seg.len:0;
        const p0=pts[seg.i],p1=pts[seg.i+1];
        w._pts.splice(seg.i,0,{
          x:Math.round((p0.x+(p1.x-p0.x)*frac)/10)*10,
          y:Math.round((p0.y+(p1.y-p0.y)*frac)/10)*10,
        });
        render(); return;
      }
    }
  }
});

canvas.addEventListener('contextmenu',e=>{
  e.preventDefault();
  const {cx,cy}=getXY(e);
  const {x:wx,y:wy}=c2w(cx,cy);
  const n=hitNode(wx,wy), wi=hitWire(wx,wy);
  showCtx(e.clientX,e.clientY,n,wi);
});

// ═══════════════════════════════════════════════════════════════
//  TOUCH SUPPORT
//  Single finger → left-click drag (select / move / wire)
//  Two fingers   → pinch-to-zoom + pan
//  Double-tap    → double-click
// ═══════════════════════════════════════════════════════════════

(function(){
  let _pinchDist0=null, _pinchScale0=1;
  let _pinchMidX=0, _pinchMidY=0, _pinchVpX=0, _pinchVpY=0;
  let _lastTapT=0, _lastTapX=0, _lastTapY=0;
  let _longPressTimer=null, _longPressT=null;
  const LONG_PRESS_MS=600, LONG_PRESS_MOVE=10;

  function _mm(type,t,extra={}){
    return new MouseEvent(type,{bubbles:true,cancelable:true,clientX:t.clientX,clientY:t.clientY,...extra});
  }
  function _cancelLongPress(){
    if(_longPressTimer){clearTimeout(_longPressTimer);_longPressTimer=null;}
    _longPressT=null;
  }

  canvas.addEventListener('touchstart',e=>{
    e.preventDefault();
    if(e.touches.length===1 && _pinchDist0===null){
      const t=e.touches[0];
      canvas.dispatchEvent(_mm('mousedown',t,{button:0}));
      // Start long-press timer for context menu
      _cancelLongPress();
      _longPressT=t;
      _longPressTimer=setTimeout(()=>{
        _longPressTimer=null;
        // Cancel the ongoing drag so it doesn't interfere
        canvas.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true}));
        canvas.dispatchEvent(new MouseEvent('contextmenu',{
          bubbles:true,cancelable:true,
          clientX:_longPressT.clientX,clientY:_longPressT.clientY
        }));
        _longPressT=null;
      },LONG_PRESS_MS);
    } else if(e.touches.length===2){
      _cancelLongPress();
      // Cancel any in-progress single-touch interaction
      canvas.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true}));
      const t0=e.touches[0],t1=e.touches[1];
      const dx=t1.clientX-t0.clientX, dy=t1.clientY-t0.clientY;
      _pinchDist0=Math.sqrt(dx*dx+dy*dy);
      _pinchScale0=vpScale;
      const r=canvas.getBoundingClientRect();
      _pinchMidX=(t0.clientX+t1.clientX)/2-r.left;
      _pinchMidY=(t0.clientY+t1.clientY)/2-r.top;
      _pinchVpX=vpX; _pinchVpY=vpY;
    }
  },{passive:false});

  canvas.addEventListener('touchmove',e=>{
    e.preventDefault();
    if(e.touches.length===1 && _pinchDist0===null){
      const t=e.touches[0];
      // Cancel long-press if finger moved significantly
      if(_longPressT && (Math.abs(t.clientX-_longPressT.clientX)>LONG_PRESS_MOVE ||
                         Math.abs(t.clientY-_longPressT.clientY)>LONG_PRESS_MOVE)){
        _cancelLongPress();
      }
      canvas.dispatchEvent(_mm('mousemove',t));
    } else if(e.touches.length===2 && _pinchDist0!==null){
      const t0=e.touches[0],t1=e.touches[1];
      const dx=t1.clientX-t0.clientX, dy=t1.clientY-t0.clientY;
      const dist=Math.sqrt(dx*dx+dy*dy);
      const r=canvas.getBoundingClientRect();
      const midX=(t0.clientX+t1.clientX)/2-r.left;
      const midY=(t0.clientY+t1.clientY)/2-r.top;
      const newScale=Math.max(0.15,Math.min(3,_pinchScale0*dist/_pinchDist0));
      // Keep the world point under the initial pinch centre anchored
      const wbx=_pinchVpX+_pinchMidX/_pinchScale0;
      const wby=_pinchVpY+_pinchMidY/_pinchScale0;
      vpScale=newScale;
      vpX=wbx-midX/newScale;
      vpY=wby-midY/newScale;
      render();
    }
  },{passive:false});

  canvas.addEventListener('touchend',e=>{
    e.preventDefault();
    _cancelLongPress();
    if(e.touches.length===0){
      if(_pinchDist0===null && e.changedTouches.length){
        const t=e.changedTouches[0];
        canvas.dispatchEvent(_mm('mouseup',t,{button:0}));
        // Double-tap → dblclick
        const now=Date.now();
        if(now-_lastTapT<300 && Math.abs(t.clientX-_lastTapX)<20 && Math.abs(t.clientY-_lastTapY)<20){
          canvas.dispatchEvent(_mm('dblclick',t));
          _lastTapT=0;
        } else {
          _lastTapT=now; _lastTapX=t.clientX; _lastTapY=t.clientY;
        }
      }
      _pinchDist0=null;
    } else if(e.touches.length===1){
      // Dropped from 2 fingers to 1 — end pinch without starting a drag
      _pinchDist0=null;
    }
  },{passive:false});

  canvas.addEventListener('touchcancel',e=>{
    _cancelLongPress();
    _pinchDist0=null;
    canvas.dispatchEvent(new MouseEvent('mouseleave',{bubbles:true}));
  },{passive:false});
})();

