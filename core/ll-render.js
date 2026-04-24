// Logic Lab

function render(){
  _colorVisited.clear(); // reset feedback cycle guard each frame
  ctx.clearRect(0,0,canvasW,canvasH);

  // Grid
  ctx.save();
  const gs=20*vpScale, ox=(-vpX*vpScale)%gs, oy=(-vpY*vpScale)%gs;
  ctx.strokeStyle='rgba(255,255,255,0.025)'; ctx.lineWidth=1;
  for(let x=ox;x<canvasW;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvasH);ctx.stroke();}
  for(let y=oy;y<canvasH;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvasW,y);ctx.stroke();}
  const gs2=100*vpScale,ox2=(-vpX*vpScale)%gs2,oy2=(-vpY*vpScale)%gs2;
  ctx.strokeStyle='rgba(255,255,255,0.05)';
  for(let x=ox2;x<canvasW;x+=gs2){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvasH);ctx.stroke();}
  for(let y=oy2;y<canvasH;y+=gs2){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvasW,y);ctx.stroke();}
  ctx.restore();

  const c=circuits[currentCircuitId]; if(!c) return;
  ctx.save();
  ctx.translate(-vpX*vpScale,-vpY*vpScale);
  ctx.scale(vpScale,vpScale);

  // Wires
  Object.values(c.wires).forEach(w=>drawWire(c,w));

  // Active wire being dragged
  if(dragMode==='wire'&&wireStart){
    const fn=c.nodes[wireStart.nodeId];
    const fp=fn?portWorldPos(fn,wireStart.portId):null;
    if(fp){
      const def=blockDefs[fn?.defId];
      const ports=getNodePorts(fn,def);
      const portDef=ports.find(p=>p.id===wireStart.portId);
      const bits=portDef?.bits||fp.bits||1;
      const srcColor=portWireColor(currentCircuitId,wireStart.nodeId,wireStart.portId);
      if(bits===1){
        ctx.save(); ctx.setLineDash([5,4]);
        ctx.strokeStyle=srcColor||'rgba(79,195,247,0.6)'; ctx.lineWidth=1.5;
        ctx.beginPath(); wireCurve(fp.x,fp.y,wireMouseX,wireMouseY); ctx.stroke();
        ctx.restore();
      } else {
        // Ribbon preview — semi-transparent overlay
        ctx.save(); ctx.globalAlpha=0.7;
        drawBusWire(fp.x,fp.y,wireMouseX,wireMouseY,bits,null,srcColor||'#4fc3f7');
        ctx.restore();
      }
    }
  }

  // Nodes
  Object.values(c.nodes).forEach(n=>drawNode(c,n));

  // Wire waypoint handles (rendered after nodes so they appear on top)
  Object.values(c.wires).forEach(w=>drawWireWaypointHandles(c,w));

  // Rubber-band selection box
  if(dragMode==='select'&&selBoxStart&&selBoxEnd){
    const x1=Math.min(selBoxStart.x,selBoxEnd.x),y1=Math.min(selBoxStart.y,selBoxEnd.y);
    const x2=Math.max(selBoxStart.x,selBoxEnd.x),y2=Math.max(selBoxStart.y,selBoxEnd.y);
    ctx.save();
    ctx.fillStyle='rgba(79,195,247,0.07)';
    ctx.fillRect(x1,y1,x2-x1,y2-y1);
    ctx.setLineDash([4/vpScale,3/vpScale]);
    ctx.strokeStyle='rgba(79,195,247,0.7)';
    ctx.lineWidth=1/vpScale;
    ctx.strokeRect(x1,y1,x2-x1,y2-y1);
    ctx.restore();
  }

  ctx.restore();
}

function wireCurve(x1,y1,x2,y2){
  const dx=Math.abs(x2-x1), dy=Math.abs(y2-y1);
  const dist=Math.sqrt(dx*dx+dy*dy);
  if(dist<40){
    // Short stub — draw straight
    ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
  } else {
    const cp=Math.max(50,dx*0.55);
    ctx.moveTo(x1,y1); ctx.bezierCurveTo(x1+cp,y1,x2-cp,y2,x2,y2);
  }
}

// Straight-line version for stubs where we always want no curve
function wireStraight(x1,y1,x2,y2){
  ctx.moveTo(x1,y1); ctx.lineTo(x2,y2);
}

function drawWire(c,w){
  const fn=c.nodes[w.fromNode], tn=c.nodes[w.toNode]; if(!fn||!tn) return;
  const fp=portWorldPos(fn,w.fromPort), tp=portWorldPos(tn,w.toPort); if(!fp||!tp) return;
  const def=blockDefs[fn.defId];
  const fnPorts=getNodePorts(fn,def);
  const portDef=fnPorts.find(p=>p.id===w.fromPort);
  const bits=portDef?.bits||1;
  const val=fn.portValues[w.fromPort];
  const isFloat=val===null;
  const srcColor=portWireColor(currentCircuitId,fn.id,w.fromPort);

  if(w._pts?.length){
    // ── Routed polyline (has waypoints) ──
    const pts=[fp,...w._pts,tp];
    if(bits===1){
      const activeCol=isFloat?'#3a3040':(val?srcColor||'#e74c3c':'#2a2020');
      ctx.lineCap='round'; ctx.lineJoin='round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x,pts[0].y);
      for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
      ctx.strokeStyle=activeCol; ctx.lineWidth=2; ctx.stroke();
      if(isFloat){
        ctx.save(); ctx.setLineDash([3,5]);
        ctx.strokeStyle='#6060a0'; ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.moveTo(pts[0].x,pts[0].y);
        for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x,pts[i].y);
        ctx.stroke(); ctx.restore();
      }
    } else {
      const laneColors=portLaneColors(currentCircuitId,fn.id,w.fromPort);
      const hasLanes=laneColors.some(c=>c!==null&&c!==laneColors[0]);
      rrDrawRibbonBackground(pts,bits);
      rrDrawLanes(pts,bits,val,srcColor,hasLanes||laneColors[0]!==srcColor?laneColors:null);
    }
    return;
  }

  if(bits===1){
    // ── 1-bit wire: single line, src colour when HIGH, dark when LOW, dashed when float ──
    const activeCol=isFloat?'#3a3040':(val?srcColor||'#e74c3c':'#2a2020');
    ctx.beginPath();
    ctx.strokeStyle=activeCol;
    ctx.lineWidth=2;
    wireCurve(fp.x,fp.y,tp.x,tp.y);
    ctx.stroke();
    if(isFloat){
      ctx.save(); ctx.setLineDash([3,5]);
      ctx.strokeStyle='#6060a0'; ctx.lineWidth=1.5;
      ctx.beginPath(); wireCurve(fp.x,fp.y,tp.x,tp.y); ctx.stroke();
      ctx.restore();
    }
  } else {
    // Get per-lane colors for this bus wire
    const laneColors=portLaneColors(currentCircuitId,fn.id,w.fromPort);
    const hasLanes=laneColors.some(c=>c!==null&&c!==laneColors[0]);
    drawBusWire(fp.x,fp.y,tp.x,tp.y,bits,val,srcColor,hasLanes||laneColors[0]!==srcColor?laneColors:null);
  }
}

// Draw waypoint handles for wires that have _pts — called after drawNode so handles sit on top.
function drawWireWaypointHandles(c,w){
  if(!w._pts?.length) return;
  const fn=c.nodes[w.fromNode]; if(!fn) return;
  const srcColor=portWireColor(currentCircuitId,fn.id,w.fromPort)||'#4fc3f7';
  ctx.shadowBlur=0;
  for(let i=0;i<w._pts.length;i++){
    const p=w._pts[i];
    const isActive=dragMode==='wire_wp'&&dragWireId===w.id&&dragWpIdx===i;
    ctx.beginPath(); ctx.arc(p.x,p.y,RH_R+2,0,Math.PI*2);
    ctx.fillStyle='rgba(10,12,16,0.85)'; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x,p.y,RH_R,0,Math.PI*2);
    ctx.fillStyle  =isActive?'#fff':srcColor;
    ctx.strokeStyle=isActive?srcColor:'rgba(255,255,255,0.7)';
    ctx.lineWidth  =1.2/vpScale;
    ctx.fill(); ctx.stroke();
  }
}

function drawBusWire(x1,y1,x2,y2,bits,val,srcColor,laneColors){
  const isFloat=val===null;
  const dx=x2-x1, dy=y2-y1;
  const dist=Math.sqrt(dx*dx+dy*dy);
  const isStub=dist<40;

  const angle=Math.atan2(dy,dx);
  const px=Math.sin(angle), py=-Math.cos(angle);

  const LANE=3, GAP=1;
  const totalW=bits*(LANE+GAP)-GAP;
  const baseOff=-(totalW/2);

  const path=(ax1,ay1,ax2,ay2)=>{
    if(isStub){ ctx.moveTo(ax1,ay1); ctx.lineTo(ax2,ay2); }
    else wireCurve(ax1,ay1,ax2,ay2);
  };

  // 1. Dark outer jacket
  ctx.beginPath();
  ctx.strokeStyle='rgba(0,0,0,0.6)';
  ctx.lineWidth=totalW+4;
  path(x1,y1,x2,y2);
  ctx.stroke();

  // 2. Cable body fill
  ctx.beginPath();
  ctx.strokeStyle='#1a1a24';
  ctx.lineWidth=totalW+1;
  path(x1,y1,x2,y2);
  ctx.stroke();

  // 3. Per-bit lanes — MSB at top/first offset
  for(let b=0;b<bits;b++){
    const bitIdx=bits-1-b;
    const bitVal=isFloat?null:((val>>bitIdx)&1);
    const laneOff=baseOff+b*(LANE+GAP)+LANE/2;
    const ox=px*laneOff, oy=py*laneOff;
    // Use per-lane color if provided, else fall back to srcColor
    const laneCol=laneColors?laneColors[b]||srcColor:srcColor;

    ctx.beginPath();
    ctx.strokeStyle=isFloat?'#3a3040':bitVal===1?(laneCol||'#e74c3c'):'#2a2a38';
    ctx.lineWidth=LANE;
    path(x1+ox,y1+oy,x2+ox,y2+oy);
    ctx.stroke();
  }

  // 4. Value badge
  if(!isStub&&vpScale>0.4&&!isFloat&&showBusValues){
    const mx=(x1+x2)/2, my=(y1+y2)/2;
    let setBits=0;
    for(let b=0;b<bits;b++) if((val>>b)&1) setBits++;
    const txt=`${val} (${setBits}/${bits})`;
    ctx.font=`700 ${10/vpScale}px JetBrains Mono`;
    const tw=ctx.measureText(txt).width;
    const bw=tw+8, bh=15/vpScale;
    rr(mx-bw/2,my-bh/2,bw,bh,2);
    ctx.fillStyle='#12121a'; ctx.fill();
    rr(mx-bw/2,my-bh/2,bw,bh,2);
    ctx.strokeStyle=srcColor||'#4ecb8d'; ctx.lineWidth=1/vpScale; ctx.stroke();
    ctx.fillStyle=srcColor||'#4ecb8d';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(txt,mx,my);
  }
}

// ── 7-segment display helpers ──
// Segments: a=top, b=top-right, c=bot-right, d=bottom, e=bot-left, f=top-left, g=middle

// Draw a single 7-segment digit at (x,y), height h, lit color, dim color
// Draw the 3-digit 7-segment display body
// Recursively collect all DISPLAY nodes at any depth within a block circuit
// ── Logic Analyzer drawing ──
function collectThumbnailNodes(circuit, visited=new Set()){
  const ic=circuits[circuit.id]||circuit;
  if(!ic||visited.has(ic.id)) return [];
  visited.add(ic.id);
  const result=[];
  Object.values(ic.nodes).forEach(n=>{
    const nd=blockDefs[n.defId];
    if(!nd) return;
    if(descHasThumbnail(nd)){
      result.push(n);
    } else if(nd.circuit){
      result.push(...collectThumbnailNodes(nd.circuit, visited));
    }
  });
  return result;
}

function drawNode(c,node){
  const def=blockDefs[node.defId]; if(!def) return;
  const g=nodeGeom(node);
  const isSel=selNodeIds.has(node.id)||node.id===selNodeId;
  const isHov=node.id===hovNodeId&&dragMode===null;

  // Ask the registry first — node descriptor can fully own its drawing
  if(drawDescNode(g,node,def,isSel,isHov)) return;


  // Gate body
  ctx.save();
  if(isSel){ctx.shadowColor=def.color;ctx.shadowBlur=12/vpScale;}
  rr(g.x,g.y,g.w,g.h,4);
  ctx.fillStyle='#181b20'; ctx.fill();
  rr(g.x,g.y,g.w,g.h,4);
  ctx.strokeStyle=isSel?def.color:isHov?'rgba(255,255,255,0.18)':'rgba(255,255,255,0.07)';
  ctx.lineWidth=(isSel?1.5:1)/vpScale; ctx.stroke();
  ctx.restore();

  const hasBody=nodeHasBodyContent(node,def);

  if(hasBody){
    // Header band + label in header
    ctx.beginPath();
    ctx.moveTo(g.x,g.y+NLH); ctx.lineTo(g.x+g.w,g.y+NLH);
    ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=1/vpScale; ctx.stroke();
    ctx.fillStyle=def.color+'28';
    rr(g.x,g.y,g.w,NLH,4);
    ctx.fill();
    ctx.font=`700 ${11/vpScale}px JetBrains Mono`;
    ctx.fillStyle=def.color; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(node.label||def.name,g.x+g.w/2,g.y+NLH/2);
  } else {
    // No header — name centered in the full gate body
    ctx.font=`700 ${11/vpScale}px JetBrains Mono`;
    ctx.fillStyle=def.color; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(node.label||def.name,g.x+g.w/2,g.y+g.h/2);
  }

  // ── Mini displays: recursively collect ALL display nodes at any depth ──
  if(def.circuit){
    const dispNodes=collectThumbnailNodes(def.circuit);
    if(dispNodes.length&&g.h>NLH+20&&vpScale>0.25){
      const pad=4;
      const bodyX=g.x+pad, bodyY=g.y+NLH+pad;
      const bodyW=g.w-pad*2, bodyH=g.h-NLH-pad*2;
      const count=dispNodes.length;
      const miniPAD=3, DIGIT_RATIO=0.55, LABEL_H=10, GAP_UNITS=0.15;
      const miniTotal=dn=>{
        const nd=Math.max(1,Math.min(3,dn._dispDigits??3));
        const mu=dn._dispSigned?0.35:0;
        return mu+nd+(nd>1?(nd-1)*GAP_UNITS:0);
      };
      let bestCols=1, bestCellW=0;
      for(let cols=1;cols<=count;cols++){
        const rows=Math.ceil(count/cols);
        const cellW=Math.floor(bodyW/cols);
        const cellH=Math.floor(bodyH/rows);
        const maxTotal=Math.max(...dispNodes.map(miniTotal));
        const dw=Math.floor((cellW-miniPAD*2)/maxTotal);
        const neededH=Math.round(dw/DIGIT_RATIO)+miniPAD*2+LABEL_H;
        if(neededH<=cellH&&dw>bestCellW){bestCellW=dw;bestCols=cols;}
      }
      const bestRows=Math.ceil(count/bestCols);
      const cellW=Math.floor(bodyW/bestCols);
      const cellH=Math.floor(bodyH/bestRows);
      dispNodes.forEach((dn,idx)=>{
        const col=idx%bestCols, row=Math.floor(idx/bestCols);
        const miniG={
          x:bodyX+col*cellW, y:bodyY+row*cellH,
          w:cellW-2, h:cellH-2
        };
        descDrawThumbnail(miniG,dn,blockDefs[dn.defId]);
      });
    }
  }


  // Call node-specific body drawing hook (e.g. clock waveform)
  const clockDesc=_nodeRegistry[def.id];
  if(clockDesc?.drawBody) clockDesc.drawBody(g,node,def);

  // Ports
  Object.entries(g.ports).forEach(([pid,pp])=>{
    const wx=g.x+pp.x, wy=g.y+pp.y;
    const val=node.portValues[pid];
    const isHovP=hovPortKey===node.id+'_'+pid;
    const wCol=portWireColor(currentCircuitId,node.id,pid);
    const isFloat=val===null;
    const dotX=pp.dir==='in'?wx-STUB_LEN:wx+STUB_LEN;

    if(pp.bits===1){
      // 1-bit: stub line + dot at tip
      const activeCol=isFloat?'#3a3040':(val?wCol:'#2a2020');
      ctx.beginPath();
      ctx.moveTo(pp.dir==='in'?wx-STUB_LEN:wx, wy);
      ctx.lineTo(pp.dir==='in'?wx:wx+STUB_LEN, wy);
      ctx.strokeStyle=activeCol; ctx.lineWidth=1.5/vpScale; ctx.stroke();

      ctx.beginPath(); ctx.arc(dotX,wy,PORT_R/vpScale,0,Math.PI*2);
      ctx.fillStyle=isHovP?'#ffffff':activeCol; ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=1/vpScale; ctx.stroke();
    } else {
      // Multi-bit: no stub — ribbon wire connects flush to node edge, just draw dot
      ctx.beginPath(); ctx.arc(wx,wy,PORT_R/vpScale,0,Math.PI*2);
      ctx.fillStyle=isHovP?'#ffffff':(wCol||'#555'); ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=1/vpScale; ctx.stroke();
    }

    // ── Port name label (outside the node, above the stub dot) ──
    if(pp.name&&vpScale>0.45){
      ctx.font=`600 ${9/vpScale}px JetBrains Mono`;
      const labelX = pp.bits>1 ? wx : dotX;
      const labelY = wy-PORT_R/vpScale-2/vpScale;
      const tw=ctx.measureText(pp.name).width;
      const ph=11/vpScale, pw=tw+6/vpScale, pr=3/vpScale;
      ctx.save();
      rr(labelX-pw/2, labelY-ph, pw, ph, pr);
      ctx.fillStyle='rgba(10,12,18,0.82)'; ctx.fill();
      rr(labelX-pw/2, labelY-ph, pw, ph, pr);
      ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=0.5/vpScale; ctx.stroke();
      ctx.restore();
      ctx.fillStyle='rgba(255,255,255,0.75)';
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(pp.name, labelX, labelY);
    }

    // ── Bus width badge above the dot ──
    if(pp.bits>1&&vpScale>0.4){
      ctx.font=`${8/vpScale}px JetBrains Mono`;
      ctx.fillStyle=wCol; ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(pp.bits+'b', dotX, wy-PORT_R/vpScale-2);
    }
  });

  // Resize handles on selected gate node
  if(isSel) drawResizeHandles(g, def.color);
}

// ═══════════════════════════════════════════════════════════════
