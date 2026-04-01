// Logic Lab Node — INPUT / OUTPUT / BITS→BUS / BUS→BITS
// All IO and bus conversion nodes in one place.

// ════════════════════════════════════════
//  INPUT
// ════════════════════════════════════════
registerNode({
  id: 'INPUT', name: 'INPUT', color: '#e74c3c',
  flags: { isIO:true, ioDir:'in', ioBits:1, excludeFromSnapshot:true },
  ports: [{ id:'out', name:'', dir:'out', bits:1 }],

  logic(i, n){
    const bits=n._bits||1, max=(1<<bits)-1;
    return { out: Math.max(0,Math.min(max, n._value??0)) };
  },

  getPorts(node){
    const bits=node._bits||1;
    return [{ id:'out', name:'', dir:'out', bits }];
  },

  getGeom(node, def){
    const bits=node._bits||def.ioBits||1;
    const w=ioNodeW(bits)+4, h=ioNodeH(bits)+4;
    return { x:node.x, y:node.y, w, h,
      ports:{ out:{x:w, y:h/2, bits, dir:'out', name:''} },
      isIO:true, ioDir:'in', ioBits:bits };
  },

  draw(g, node, def, isSel, isHov){ drawIONode(null,node,def,g,isSel,isHov); },

  getPropsHTML(n, def, effectiveBits){
    const maxVal=(1<<effectiveBits)-1;
    const bitsOpts=[1,2,3,4,5,6,7,8].map(b=>
      `<option value="${b}"${effectiveBits===b?' selected':''}>${b} bit${b>1?'s':''}</option>`).join('');
    return `
      <div class="prop-row"><div class="prop-label">BUS WIDTH</div>
        <select class="prop-input" id="pbw">${bitsOpts}</select></div>
      <div class="prop-row"><div class="prop-label">VALUE (0–${maxVal})</div>
        <input class="prop-input" id="pvi" type="number" min="0" max="${maxVal}" value="${n._value||0}"></div>
      <div class="prop-row"><div class="prop-label">DISPLAY FORMAT</div>
        <select class="prop-input" id="pfi">
          <option value="dec"${n._dispFmt==='dec'?' selected':''}>Decimal</option>
          <option value="hex"${n._dispFmt==='hex'?' selected':''}>Hex</option>
          <option value="bin"${n._dispFmt==='bin'?' selected':''}>Binary</option>
        </select></div>
      <div class="prop-row"><div class="prop-label">WIRE COLOR</div>
        <input type="color" id="pwc" value="${n.wireColor||'#e74c3c'}"
          style="width:100%;height:26px;background:#111;border:1px solid var(--border2);border-radius:3px;cursor:pointer"></div>`;
  },

  bindProps(n, def, cid){
    document.getElementById('pbw')?.addEventListener('change',e=>setNodeBits(cid,n.id,parseInt(e.target.value)));
    document.getElementById('pvi')?.addEventListener('input',e=>{
      const max=(1<<(n._bits||1))-1;
      n._value=Math.max(0,Math.min(max,parseInt(e.target.value)||0));
      simulate(cid);
    });
    document.getElementById('pfi')?.addEventListener('change',e=>{ n._dispFmt=e.target.value; render(); updatePropPanel(); });
    document.getElementById('pwc')?.addEventListener('input',e=>{ n.wireColor=e.target.value; simulate(cid); });
  },

  hitCell(wx, wy, node){
    if(node._liveFromParent) return false;
    const g=nodeGeom(node), bits=node._bits||1;
    const cols=Math.min(bits,8), gs=IONG_SZ+IONG_GAP;
    const gx=g.x+(g.w-(cols*gs-IONG_GAP))/2, gy=g.y+18;
    for(let b=0;b<bits;b++){
      const bx=gx+(b%cols)*gs, by=gy+Math.floor(b/cols)*gs;
      if(wx>=bx&&wx<bx+IONG_SZ&&wy>=by&&wy<by+IONG_SZ) return true;
    }
    return false;
  },

  clickCell(node, wx, wy, cid){
    if(node._liveFromParent) return false;
    const g=nodeGeom(node), bits=node._bits||1;
    const cols=Math.min(bits,8), gs=IONG_SZ+IONG_GAP;
    const gx=g.x+(g.w-(cols*gs-IONG_GAP))/2, gy=g.y+18;
    for(let b=0;b<bits;b++){
      const bx=gx+(b%cols)*gs, by=gy+Math.floor(b/cols)*gs;
      if(wx>=bx&&wx<bx+IONG_SZ&&wy>=by&&wy<by+IONG_SZ){
        node._value^=(1<<(bits-1-b)); simulate(cid); return true;
      }
    }
    return false;
  },

  // Consume double-clicks on bit cells so rapid clicking never triggers rename
  onDblClick(wx, wy, node){
    if(node._liveFromParent) return false;
    const g=nodeGeom(node), bits=node._bits||1;
    const cols=Math.min(bits,8), gs=IONG_SZ+IONG_GAP;
    const gx=g.x+(g.w-(cols*gs-IONG_GAP))/2, gy=g.y+18;
    for(let b=0;b<bits;b++){
      const bx=gx+(b%cols)*gs, by=gy+Math.floor(b/cols)*gs;
      if(wx>=bx&&wx<bx+IONG_SZ&&wy>=by&&wy<by+IONG_SZ) return true;
    }
    return false;
  },
});

// ════════════════════════════════════════
//  OUTPUT
// ════════════════════════════════════════
registerNode({
  id: 'OUTPUT', name: 'OUTPUT', color: '#e74c3c',
  flags: { isIO:true, ioDir:'out', ioBits:1, excludeFromSnapshot:true },
  ports: [{ id:'a', name:'', dir:'in', bits:1 }],
  logic(){ return {}; },

  getPorts(node){
    const bits=node._bits||1;
    return [{ id:'a', name:'', dir:'in', bits }];
  },

  getGeom(node, def){
    const bits=node._bits||def.ioBits||1;
    const w=ioNodeW(bits)+4, h=ioNodeH(bits)+4;
    return { x:node.x, y:node.y, w, h,
      ports:{ a:{x:0, y:h/2, bits, dir:'in', name:''} },
      isIO:true, ioDir:'out', ioBits:bits };
  },

  draw(g, node, def, isSel, isHov){ drawIONode(null,node,def,g,isSel,isHov); },

  getPropsHTML(n, def, effectiveBits){
    const val=n.portValues['a'];
    const fv=fmtVal(val,effectiveBits,n._dispFmt);
    const cls=val===null?'pv-z':effectiveBits===1?(val?'pv-1':'pv-0'):'pv-bus';
    const bitsOpts=[1,2,3,4,5,6,7,8].map(b=>
      `<option value="${b}"${effectiveBits===b?' selected':''}>${b} bit${b>1?'s':''}</option>`).join('');
    return `
      <div class="prop-row"><div class="prop-label">BUS WIDTH</div>
        <select class="prop-input" id="pbw">${bitsOpts}</select></div>
      <div class="prop-row"><div class="prop-label">RECEIVED VALUE</div>
        <span class="port-val-display ${cls}" style="font-size:12px">${fv}</span></div>
      <div class="prop-row"><div class="prop-label">DISPLAY FORMAT</div>
        <select class="prop-input" id="pfi">
          <option value="dec"${n._dispFmt==='dec'?' selected':''}>Decimal</option>
          <option value="hex"${n._dispFmt==='hex'?' selected':''}>Hex</option>
          <option value="bin"${n._dispFmt==='bin'?' selected':''}>Binary</option>
        </select></div>`;
  },

  bindProps(n, def, cid){
    document.getElementById('pbw')?.addEventListener('change',e=>setNodeBits(cid,n.id,parseInt(e.target.value)));
    document.getElementById('pfi')?.addEventListener('change',e=>{ n._dispFmt=e.target.value; render(); updatePropPanel(); });
  },
});

// ════════════════════════════════════════
//  BITS→BUS  (b0=LSB bottom, b(n-1)=MSB top)
// ════════════════════════════════════════
registerNode({
  id: 'BITS_TO_BUS', name: 'BITS→BUS', color: '#f0a030',
  flags: { isBTB: true },
  defaultBits: 2,
  ports: [],

  logic(inp, n){
    const bits=n._bits||2;
    if(Object.keys(inp).every(k=>inp[k]===null)) return {bus:null};
    let out=0;
    for(let i=0;i<bits;i++){ const v=inp['b'+i]; if(v!==null) out|=(v&1)<<i; }
    return {bus:out};
  },

  getPorts(node){
    const bits=node._bits||2;
    const ports=[];
    for(let i=bits-1;i>=0;i--) ports.push({id:'b'+i,name:'b'+i,dir:'in',bits:1});
    ports.push({id:'bus',name:'BUS',dir:'out',bits});
    return ports;
  },

  getGeom(node, def){ return _btbGeom(node,def); },

  getOutputColor(cid, node, outPortId, wireSourceColorsFn){
    const bits=node._bits||2;
    for(let i=bits-1;i>=0;i--){
      const cols=wireSourceColorsFn(cid,node.id,'b'+i);
      if(cols[0]) return cols[0];
    }
    return null;
  },

  getPropsHTML(n, def, effectiveBits){
    const opts=[2,3,4,5,6,7,8].map(b=>`<option value="${b}"${effectiveBits===b?' selected':''}>${b} bits</option>`).join('');
    return `<div class="prop-row"><div class="prop-label">BUS WIDTH</div>
      <select class="prop-input" id="pbw">${opts}</select></div>`;
  },

  bindProps(n, def, cid){ _btbBindProps(n,cid); },

  demo(){
    makeCircuit('buses','Buses');
    const bD8  = addNode('buses','INPUT',       60,  60,'DATA',{bits:8}); bD8._value=42;
    const bO8  = addNode('buses','OUTPUT',     260,  60,'OUT-8',{bits:8});
    addWire('buses',bD8.id,'out',bO8.id,'a');
    const bI0=addNode('buses','INPUT',60,220,'b0'); bI0._value=1;
    const bI1=addNode('buses','INPUT',60,290,'b1'); bI1._value=0;
    const bI2=addNode('buses','INPUT',60,360,'b2'); bI2._value=1;
    const bI3=addNode('buses','INPUT',60,430,'b3'); bI3._value=1;
    const bB2B =addNode('buses','BITS_TO_BUS',230,325,'B→BUS'); bB2B._bits=4;
    const bBus2=addNode('buses','BUS_TO_BITS',430,325,'BUS→B'); bBus2._bits=4;
    const bOut0=addNode('buses','OUTPUT',620,220,'q0');
    const bOut1=addNode('buses','OUTPUT',620,290,'q1');
    const bOut2=addNode('buses','OUTPUT',620,360,'q2');
    const bOut3=addNode('buses','OUTPUT',620,430,'q3');
    addWire('buses',bI0.id,'out',bB2B.id,'b0');
    addWire('buses',bI1.id,'out',bB2B.id,'b1');
    addWire('buses',bI2.id,'out',bB2B.id,'b2');
    addWire('buses',bI3.id,'out',bB2B.id,'b3');
    addWire('buses',bB2B.id,'bus',bBus2.id,'bus');
    addWire('buses',bBus2.id,'b0',bOut0.id,'a');
    addWire('buses',bBus2.id,'b1',bOut1.id,'a');
    addWire('buses',bBus2.id,'b2',bOut2.id,'a');
    addWire('buses',bBus2.id,'b3',bOut3.id,'a');
  },
});

// ════════════════════════════════════════
//  BUS→BITS  (b0=LSB bottom, b(n-1)=MSB top)
// ════════════════════════════════════════
registerNode({
  id: 'BUS_TO_BITS', name: 'BUS→BITS', color: '#30b0f0',
  flags: { isBTB: true },
  defaultBits: 2,
  ports: [],

  logic(inp, n){
    const bits=n._bits||2, bus=inp['bus'];
    const out={};
    for(let i=0;i<bits;i++) out['b'+i]=bus===null?null:((bus>>i)&1);
    return out;
  },

  getPorts(node){
    const bits=node._bits||2;
    const ports=[{id:'bus',name:'BUS',dir:'in',bits}];
    for(let i=bits-1;i>=0;i--) ports.push({id:'b'+i,name:'b'+i,dir:'out',bits:1});
    return ports;
  },

  getGeom(node, def){ return _btbGeom(node,def); },

  getOutputColor(cid, node, outPortId, wireSourceColorsFn, portLaneColorsFn){
    const fromWire=Object.values(circuits[cid]?.wires||{}).find(w=>w.toNode===node.id&&w.toPort==='bus');
    if(!fromWire) return null;
    const lanes=portLaneColorsFn(cid,fromWire.fromNode,fromWire.fromPort);
    const bits=node._bits||2;
    const bitIdx=parseInt((outPortId||'b0').slice(1));
    return lanes[isNaN(bits-1-bitIdx)?0:bits-1-bitIdx]||null;
  },

  getPropsHTML(n, def, effectiveBits){
    const opts=[2,3,4,5,6,7,8].map(b=>`<option value="${b}"${effectiveBits===b?' selected':''}>${b} bits</option>`).join('');
    return `<div class="prop-row"><div class="prop-label">BUS WIDTH</div>
      <select class="prop-input" id="pbw">${opts}</select></div>`;
  },

  bindProps(n, def, cid){ _btbBindProps(n,cid); },
});

// ── Shared BTB helpers ──
function _btbGeom(node, def){
  const dynPorts=getNodePorts(node,def);
  const dynIn=dynPorts.filter(p=>p.dir==='in');
  const dynOut=dynPorts.filter(p=>p.dir==='out');
  const maxP=Math.max(dynIn.length,dynOut.length,1);
  const minH=Math.max(NLH+NPY+maxP*NPS+NPY,42);
  const w=Math.max(NMW,node._w||0);
  const h=Math.max(minH,node._h||0);
  function portYs(count){ const bodyH=h-NLH,ys=[];for(let i=0;i<count;i++) ys.push(NLH+bodyH*(i+1)/(count+1));return ys;}
  const ports={};
  const inYs=portYs(dynIn.length);
  dynIn.forEach((p,i)=>{ ports[p.id]={x:0,y:inYs[i],bits:p.bits,dir:'in',name:p.name}; });
  const outYs=portYs(dynOut.length);
  dynOut.forEach((p,i)=>{ ports[p.id]={x:w,y:outYs[i],bits:p.bits,dir:'out',name:p.name}; });
  return {x:node.x,y:node.y,w,h,ports,dynPorts};
}

function _btbBindProps(n, cid){
  document.getElementById('pbw')?.addEventListener('change',e=>{
    const b=parseInt(e.target.value);
    const c=circuits[cid];
    Object.keys(c.wires).forEach(wi=>{const w=c.wires[wi];if(w.fromNode===n.id||w.toNode===n.id)delete c.wires[wi];});
    n._bits=b; n.portValues={};
    simulate(cid);
  });
}

// ── IO Node Drawing ──
function drawIONode(c, node, def, g, isSel, isHov){
  const bits=node._bits||def.ioBits||1;
  const val=def.ioDir==='in'?node._value:node.portValues['a'];
  const isIn=def.ioDir==='in';
  let col, laneColors=null;
  if(isIn){
    col=node.wireColor||def.color;
    laneColors=(node._laneColors&&node._laneColors.length>1)?node._laneColors:null;
  } else {
    const lanes=portLaneColors(currentCircuitId,node.id,'a');
    const firstCol=lanes.find(c=>c)||node.wireColor||def.color;
    col=firstCol;
    // Map source lanes to the correct bit positions in a potentially wider OUTPUT.
    // lanes is MSB-first for the source (srcBits wide).
    // Grid cell b = bit (bits-1-b). Source lane for that bit = srcBits-1-(bits-1-b).
    // If out of source range, no lane color (null).
    if(lanes.length>1||bits!==lanes.length){
      const srcBits=lanes.length;
      const mappedLanes=Array.from({length:bits},(_,b)=>{
        const laneIdx=srcBits-1-(bits-1-b); // map output bit to source lane
        return (laneIdx>=0&&laneIdx<srcBits)?lanes[laneIdx]||null:null;
      });
      if(mappedLanes.some(c=>c&&c!==firstCol)) laneColors=mappedLanes;
    }
  }
  ctx.save();
  if(isSel){ctx.shadowColor=col;ctx.shadowBlur=14/vpScale;}
  rr(g.x,g.y,g.w,g.h,4); ctx.fillStyle='#141416'; ctx.fill();
  rr(g.x,g.y,g.w,g.h,4);
  if(node._liveFromParent){
    ctx.setLineDash([3/vpScale,2/vpScale]); ctx.strokeStyle='#f0a940';
  } else {
    ctx.strokeStyle=isSel?col:isHov?'rgba(255,255,255,0.22)':'rgba(255,255,255,0.08)';
  }
  ctx.lineWidth=(isSel?1.5:1)/vpScale; ctx.stroke(); ctx.setLineDash([]);
  ctx.font=`700 ${9/vpScale}px JetBrains Mono`;
  ctx.fillStyle=node._liveFromParent?'#f0a940':(isSel?col:isHov?col+'cc':col+'99');
  ctx.textAlign='center'; ctx.textBaseline='top';
  ctx.fillText(node._liveFromParent?('⟳ '+node.label):node.label, g.x+g.w/2, g.y+4);

  // Bit grid — MSB left, LSB right
  const cols=Math.min(bits,8), gs=IONG_SZ+IONG_GAP;
  const gridW=cols*gs-IONG_GAP;
  const gx=g.x+(g.w-gridW)/2, gy=g.y+18;
  for(let b=0;b<bits;b++){
    const bv=val==null?null:((val>>(bits-1-b))&1);
    const bx=gx+(b%cols)*gs, by=gy+Math.floor(b/cols)*gs;
    const cellCol=laneColors?(laneColors[b]||col):col;
    ctx.fillStyle=bv===1?(cellCol+'ee'):(isIn?'#1a1a24':'#141420');
    rr(bx,by,IONG_SZ,IONG_SZ,2); ctx.fill();
    ctx.strokeStyle=bv===1?cellCol:'rgba(255,255,255,0.07)';
    ctx.lineWidth=1/vpScale; rr(bx,by,IONG_SZ,IONG_SZ,2); ctx.stroke();
    if(vpScale>0.4){
      ctx.font=`700 ${Math.min(8,IONG_SZ*0.65)/vpScale}px JetBrains Mono`;
      ctx.fillStyle=bv===1?'rgba(255,255,255,0.92)':'rgba(255,255,255,0.18)';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(bv===null?'?':(bv?'1':'0'),bx+IONG_SZ/2,by+IONG_SZ/2);
    }
  }
  if(val!=null&&vpScale>0.4){
    ctx.font=`700 ${9/vpScale}px JetBrains Mono`;
    ctx.fillStyle=col; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(fmtVal(val,bits,node._dispFmt),g.x+g.w/2,g.y+g.h-8);
  }
  ctx.restore();

  // Port connector
  const portId=isIn?'out':'a';
  const pp=g.ports[portId]; if(!pp) return;
  const wx=g.x+pp.x, wy=g.y+pp.y;
  const isHovP=hovPortKey===node.id+'_'+portId;
  if(bits===1){
    // 1-bit: short stub
    const activeVal=isIn?node._value:node.portValues['a'];
    const activeCol=(activeVal===null||activeVal===0)?col+'66':col;
    ctx.beginPath(); ctx.strokeStyle=activeCol; ctx.lineWidth=2/vpScale;
    if(pp.dir==='in'){ctx.moveTo(wx-10,wy);ctx.lineTo(wx,wy);}
    else             {ctx.moveTo(wx,wy);ctx.lineTo(wx+10,wy);}
    ctx.stroke();
  }
  // Multi-bit: ribbon wire connects flush — no stub, just the dot
  ctx.beginPath(); ctx.arc(wx,wy,PORT_R/vpScale,0,Math.PI*2);
  ctx.fillStyle=isHovP?'#fff':col; ctx.fill();
  ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=1/vpScale; ctx.stroke();
}

// ── IO Cell Hit Testing ──
function hitIOCell(wx, wy){
  const c=circuits[currentCircuitId];
  for(const n of Object.values(c.nodes)){
    const def=blockDefs[n.defId];
    if(!def?.isIO||def.ioDir!=='in') continue;
    if(n._liveFromParent) continue;
    const g=nodeGeom(n);
    const bits=n._bits||def.ioBits||1;
    const cols=Math.min(bits,8), gs=IONG_SZ+IONG_GAP;
    const gx=g.x+(g.w-(cols*gs-IONG_GAP))/2, gy=g.y+18;
    for(let b=0;b<bits;b++){
      const bx=gx+(b%cols)*gs, by=gy+Math.floor(b/cols)*gs;
      if(wx>=bx&&wx<bx+IONG_SZ&&wy>=by&&wy<by+IONG_SZ) return true;
    }
  }
  return false;
}
