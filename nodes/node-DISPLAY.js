// Logic Lab Node — 7-SEG Display
// 8-bit BUS + EN + NEG → up to 3 BCD digits with optional signed mode.
// Geometry is width-driven; height derived from digit aspect ratio.

registerNode({
  id: 'DISPLAY', name: '7-SEG', color: '#ff4444',
  flags: { isDisplay:true, excludeFromSnapshot:true },

  ports: [
    { id:'bus', name:'BUS', dir:'in', bits:8 },
    { id:'en',  name:'EN',  dir:'in', bits:1 },
    { id:'neg', name:'NEG', dir:'in', bits:1 },
  ],

  logic(inp, n) {
    const en     = inp.en;
    const raw    = inp.bus ?? null;
    const signed = inp.neg === 1;
    if (en === 0 || raw === null) {
      n._dispVal = null; n._dispNeg = false; n._dispSigned = signed; return {};
    }
    const val = signed && raw >= 128 ? raw - 256 : raw;
    n._dispVal    = val;
    n._dispNeg    = signed && val < 0;
    n._dispSigned = signed;
    return {};
  },

  // Geometry: width-driven, height derived to preserve digit aspect ratio
  getGeom(node) {
    const HEADER = 18, PAD = 10, DIGIT_RATIO = 0.55, GAP_UNITS = 0.15;
    const numDigits   = Math.max(1, Math.min(3, node._dispDigits ?? 3));
    const MINUS_UNITS = node._dispSigned ? 0.5 : 0;
    const TOTAL_UNITS = MINUS_UNITS + numDigits + (numDigits > 1 ? (numDigits-1)*GAP_UNITS : 0);
    const minW = Math.ceil(TOTAL_UNITS * 24) + PAD * 2;
    const w    = Math.max(minW, node._w || 0) || minW;
    const areaW = w - PAD * 2;
    const dw   = Math.floor(areaW / TOTAL_UNITS);
    const dh   = Math.round(dw / DIGIT_RATIO);
    const h    = dh + HEADER + PAD * 2;
    node._h = h;
    const ports = {
      bus: { x:0, y:h*0.30, bits:8, dir:'in', name:'BUS' },
      en:  { x:0, y:h*0.58, bits:1, dir:'in', name:'EN'  },
      neg: { x:0, y:h*0.82, bits:1, dir:'in', name:'NEG' },
    };
    return { x:node.x, y:node.y, w, h, ports };
  },

  // Draw: delegate to engine's drawDisplayBody + port stubs
  draw(g, node, def, isSel, isHov) {
    drawDisplayBody(g, node, def, isSel, isHov, false);
    // Port stubs with labels outside the body
    const STUB_LEN = 14;
    Object.entries(g.ports).forEach(([pid, pp]) => {
      const wx = g.x + pp.x, wy = g.y + pp.y;
      const val     = node.portValues[pid];
      const isHovP  = hovPortKey === node.id + '_' + pid;
      const wCol    = portWireColor(currentCircuitId, node.id, pid);
      const isFloat = val === null;
      const dotX    = wx - STUB_LEN;
      const activeCol = isFloat ? '#3a3040' : (val ? wCol : '#2a2020');
      ctx.beginPath();
      ctx.moveTo(dotX, wy); ctx.lineTo(wx, wy);
      ctx.strokeStyle = activeCol; ctx.lineWidth = 1.5/vpScale; ctx.stroke();
      ctx.beginPath(); ctx.arc(dotX, wy, PORT_R/vpScale, 0, Math.PI*2);
      ctx.fillStyle = isHovP ? '#fff' : activeCol; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1/vpScale; ctx.stroke();
      if (pp.name && vpScale > 0.45) {
        ctx.font = `${9/vpScale}px JetBrains Mono`;
        ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.textBaseline = 'middle';
        ctx.textAlign = 'right';
        ctx.fillText(pp.name, dotX - PORT_R/vpScale - 3, wy);
      }
    });
    if (vpScale > 0.3) {
      ctx.font = `700 ${9/vpScale}px JetBrains Mono`;
      ctx.fillStyle = def.color + 'cc'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(node.label || '', g.x + g.w/2, g.y + g.h + 3/vpScale);
    }
    if (isSel) drawResizeHandles(g, def.color);
  },

  getPropsHTML(n) {
    const digits = n._dispDigits ?? 3;
    return `<div class="prop-sep"></div>
      <div class="prop-row"><div class="prop-label">DIGITS</div>
        <select class="prop-input" id="pdisp-digits">
          <option value="1"${digits===1?' selected':''}>1 digit (0–9)</option>
          <option value="2"${digits===2?' selected':''}>2 digits (0–99)</option>
          <option value="3"${digits===3?' selected':''}>3 digits (0–255)</option>
        </select></div>`;
  },

  bindProps(n) {
    document.getElementById('pdisp-digits')?.addEventListener('change', e => {
      n._dispDigits = parseInt(e.target.value) || 3;
      n._w = 0; // reset width so nodeGeom picks correct minimum
      render();
    });
  },

  applyResize(n, id, snap, dx, dy){
    const {nx,ny,nw,nh}=snap;
    const numDigits=Math.max(1,Math.min(3,n._dispDigits??3));
    const MINUS_UNITS=n._dispSigned?0.5:0;
    const TOTAL_UNITS=MINUS_UNITS+numDigits+(numDigits>1?(numDigits-1)*0.15:0);
    const minW=Math.ceil(TOTAL_UNITS*24)+20;
    let rw=nw, rx=nx;
    if(id.includes('e')) rw=Math.max(minW,nw+dx);
    if(id.includes('w')){ rw=Math.max(minW,nw-dx); rx=nx+nw-rw; }
    n.x=Math.round(rx/10)*10; n.y=ny;
    n._w=Math.round(rw/10)*10; n._h=0;
  },

  drawThumbnail(g, node, def){ drawDisplayBody(g, node, def, false, false, true); },

  demo(){
    makeCircuit('clkdisp','7-Seg Display');
    const dEN =addNode('clkdisp','INPUT',  60,  60,'EN');             dEN._value=1;
    const dVal=addNode('clkdisp','INPUT',  60, 160,'VALUE',{bits:8}); dVal._value=200;
    const dNeg=addNode('clkdisp','INPUT',  60, 260,'NEG');            dNeg._value=0;
    const dFull=addNode('clkdisp','DISPLAY',260, 60,'Full');   dFull._dispDigits=3;
    const dUnit=addNode('clkdisp','DISPLAY',500, 60,'Units');  dUnit._dispDigits=1;
    const dSign=addNode('clkdisp','DISPLAY',260,220,'Signed'); dSign._dispDigits=3;
    addWire('clkdisp',dEN.id,'out',dFull.id,'en');
    addWire('clkdisp',dVal.id,'out',dFull.id,'bus');
    addWire('clkdisp',dEN.id,'out',dUnit.id,'en');
    addWire('clkdisp',dVal.id,'out',dUnit.id,'bus');
    addWire('clkdisp',dEN.id,'out',dSign.id,'en');
    addWire('clkdisp',dVal.id,'out',dSign.id,'bus');
    addWire('clkdisp',dNeg.id,'out',dSign.id,'neg');
    const dB2B    =addNode('clkdisp','BITS_TO_BUS',260,360,'Bits→Bus'); dB2B._bits=8;
    const dBusSeg =addNode('clkdisp','DISPLAY',    500,320,'From Bits'); dBusSeg._dispDigits=3;
    const dBus2Bit=addNode('clkdisp','BUS_TO_BITS', 60,420,'Splitter'); dBus2Bit._bits=8;
    addWire('clkdisp',dVal.id,'out',dBus2Bit.id,'bus');
    for(let i=0;i<8;i++) addWire('clkdisp',dBus2Bit.id,'b'+i,dB2B.id,'b'+i);
    addWire('clkdisp',dEN.id,'out',dBusSeg.id,'en');
    addWire('clkdisp',dB2B.id,'bus',dBusSeg.id,'bus');
  },
});

// ── 7-Segment helpers (was in ll-render.js) ──
// Segments: a=top(0), b=top-right(1), c=bot-right(2), d=bottom(3),
//           e=bot-left(4), f=top-left(5), g=middle(6)
const SEG_MAP=[
  0b0111111, // 0: abcdef
  0b0000110, // 1: bc
  0b1011011, // 2: abdeg
  0b1001111, // 3: abcdg
  0b1100110, // 4: bcfg
  0b1101101, // 5: acdfg
  0b1111101, // 6: acdefg
  0b0000111, // 7: abc
  0b1111111, // 8: all
  0b1101111, // 9: abcdfg
];

function draw7Seg(x,y,w,h,digit,litCol,dimCol){
  const segs=digit>=0&&digit<=9?SEG_MAP[digit]:-1;
  const t=Math.max(1.5,w*0.12);
  const g=t*0.35;
  const on=s=>segs>=0&&(segs>>s&1)?litCol:dimCol;
  // a = top
  ctx.beginPath(); ctx.strokeStyle=on(0); ctx.lineWidth=t;
  ctx.moveTo(x+g,y+t/2); ctx.lineTo(x+w-g,y+t/2); ctx.stroke();
  // b = top-right
  ctx.beginPath(); ctx.strokeStyle=on(1); ctx.lineWidth=t;
  ctx.moveTo(x+w-t/2,y+g); ctx.lineTo(x+w-t/2,y+h/2-g); ctx.stroke();
  // c = bot-right
  ctx.beginPath(); ctx.strokeStyle=on(2); ctx.lineWidth=t;
  ctx.moveTo(x+w-t/2,y+h/2+g); ctx.lineTo(x+w-t/2,y+h-g); ctx.stroke();
  // d = bottom
  ctx.beginPath(); ctx.strokeStyle=on(3); ctx.lineWidth=t;
  ctx.moveTo(x+g,y+h-t/2); ctx.lineTo(x+w-g,y+h-t/2); ctx.stroke();
  // e = bot-left
  ctx.beginPath(); ctx.strokeStyle=on(4); ctx.lineWidth=t;
  ctx.moveTo(x+t/2,y+h/2+g); ctx.lineTo(x+t/2,y+h-g); ctx.stroke();
  // f = top-left
  ctx.beginPath(); ctx.strokeStyle=on(5); ctx.lineWidth=t;
  ctx.moveTo(x+t/2,y+g); ctx.lineTo(x+t/2,y+h/2-g); ctx.stroke();
  // g = middle
  ctx.beginPath(); ctx.strokeStyle=on(6); ctx.lineWidth=t;
  ctx.moveTo(x+g,y+h/2); ctx.lineTo(x+w-g,y+h/2); ctx.stroke();
}

function drawDisplayBody(g,node,def,isSel,isHov,mini=false){
  const en=node.portValues?.['en'];
  const blanked=en===0;
  const signed=node._dispSigned||(node.portValues?.['neg']===1);
  const rawVal=blanked?null:(node._dispVal??node.portValues?.['bus']??null);
  const neg=node._dispNeg||(signed&&rawVal!==null&&rawVal<0);
  const val=rawVal===null?null:Math.abs(rawVal);
  const col=def.color;

  ctx.save();
  if(isSel&&!mini){ctx.shadowColor=col;ctx.shadowBlur=12/vpScale;}
  rr(g.x,g.y,g.w,g.h,4); ctx.fillStyle='#0a0a0c'; ctx.fill();
  rr(g.x,g.y,g.w,g.h,4);
  ctx.strokeStyle=isSel?col:isHov?'rgba(255,255,255,0.18)':col+'44';
  ctx.lineWidth=(isSel?1.5:1)/vpScale; ctx.stroke();
  ctx.restore();

  const HEADER=mini?0:18, PAD=mini?3:10, LABEL_H=mini&&node.label?10:0;
  if(!mini){
    ctx.font=`700 ${9/vpScale}px JetBrains Mono`;
    ctx.fillStyle=col+'66'; ctx.textAlign='left'; ctx.textBaseline='middle';
    ctx.fillText('7-SEG',g.x+PAD,g.y+HEADER/2);
    if(node.label){ ctx.fillStyle=col+'cc'; ctx.textAlign='center'; ctx.fillText(node.label,g.x+g.w/2,g.y+HEADER/2); }
  }

  const numDigits=Math.max(1,Math.min(3,node._dispDigits??3));
  let digits=[];
  if(val!==null){
    const v=Math.max(0,Math.min(255,val));
    const all=[Math.floor(v/100)%10,Math.floor(v/10)%10,v%10];
    digits=all.slice(3-numDigits);
  } else { digits=Array(numDigits).fill(null); }

  const litCol=blanked?'#1a0000':col, dimCol='#221010';
  const DIGIT_RATIO=0.55, GAP_UNITS=0.15;
  const MINUS_UNITS=signed?(mini?0.35:0.5):0;
  const TOTAL_UNITS=MINUS_UNITS+numDigits+(numDigits>1?(numDigits-1)*GAP_UNITS:0);
  const areaX=g.x+PAD, areaY=g.y+HEADER+PAD;
  const areaW=g.w-PAD*2, areaH=g.h-HEADER-PAD*2-LABEL_H;
  let dw=Math.floor(areaW/TOTAL_UNITS);
  const dwFromH=Math.floor(areaH*DIGIT_RATIO);
  dw=Math.min(dw,dwFromH);
  const dh=Math.round(dw/DIGIT_RATIO);
  const blockW=dw*TOTAL_UNITS;
  const offsetX=Math.floor((areaW-blockW)/2), offsetY=Math.floor((areaH-dh)/2);
  const baseX=areaX+offsetX, baseY=areaY+offsetY;

  // Minus sign
  {
    const mStartX=baseX, mEndX=baseX+dw*MINUS_UNITS*0.85, my=baseY+dh/2;
    ctx.beginPath(); ctx.strokeStyle=neg&&val!==null?col:dimCol;
    ctx.lineWidth=Math.max(1/vpScale,dw*0.12);
    ctx.moveTo(mStartX,my); ctx.lineTo(mEndX,my); ctx.stroke();
  }
  for(let i=0;i<numDigits;i++){
    const dx=baseX+dw*(MINUS_UNITS+i*(1+GAP_UNITS));
    draw7Seg(dx,baseY,dw,dh,digits[i]===null?-1:digits[i],litCol,dimCol);
  }
  if(mini&&node.label&&LABEL_H>0){
    ctx.font=`600 ${Math.max(6,LABEL_H*0.75)/vpScale}px JetBrains Mono`;
    ctx.fillStyle=col+'bb'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(node.label,g.x+g.w/2,g.y+g.h-LABEL_H/2);
  }
}
