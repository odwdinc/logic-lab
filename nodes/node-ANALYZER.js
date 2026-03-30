// Logic Lab Node — Logic Analyzer
// Owns its own free-running sample timer registry.

// ── Free-running timer registry (was in ll-state.js) ──
const _analyzerTimers = {};

function syncAnalyzerTimers(){
  const active=new Set();
  Object.values(allCircuits()).forEach(c=>{
    Object.values(c.nodes).forEach(n=>{
      const def=blockDefs[n.defId];
      if(def?.isAnalyzer && n._laSampleMode==='free'){
        active.add(n.id);
        const hz=Math.max(1,Math.min(50,n._laFreeHz??10));
        const ms=Math.round(1000/hz);
        if(!_analyzerTimers[n.id]||_analyzerTimers[n.id+'_ms']!==ms){
          if(_analyzerTimers[n.id]) clearInterval(_analyzerTimers[n.id]);
          _analyzerTimers[n.id+'_ms']=ms;
          _analyzerTimers[n.id]=setInterval(()=>{
            if(n._laState!=='RECORDING') return;
            Object.keys(circuits).forEach(cid=>{ try{ simulate(cid,true); }catch(_){} });
          }, ms);
        }
      }
    });
  });
  Object.keys(_analyzerTimers).forEach(id=>{
    if(id.endsWith('_ms')) return;
    if(!active.has(id)){
      clearInterval(_analyzerTimers[id]);
      delete _analyzerTimers[id];
      delete _analyzerTimers[id+'_ms'];
    }
  });
}

// ── Node descriptor ──
registerNode({
  id: 'ANALYZER', name: 'ANALYZER', color: '#00e5ff',
  flags: { isAnalyzer:true, excludeFromSnapshot:true },
  defaultBits: 4,
  ports: [],

  logic(inp, n){
    const ch=Math.max(1,Math.min(8,n._bits||4));
    const rst=inp.rst, trg=inp.trg??0;
    const maxSamples=n._laMaxSamples??64;
    const mode=n._laSampleMode||'free';

    if(rst===1){
      n._laState='IDLE'; n._laRec=[]; n._laTrigSample=null;
      n._laPrevTrg=0; n._laPrevClk=0;
      return {};
    }

    const state=n._laState||'IDLE';
    const prevTrg=n._laPrevTrg??0;
    const trigRise=trg===1&&prevTrg===0;
    n._laPrevTrg=trg;

    const clkVal=inp.clk??0, prevClk=n._laPrevClk??0;
    const clkRise=clkVal===1&&prevClk===0;
    n._laPrevClk=clkVal;

    const shouldSample=mode==='clk'?clkRise:true;

    if(state==='IDLE'){ n._laState='ARMED'; return {}; }
    if(state==='ARMED'){
      if(trigRise){ n._laState='RECORDING'; n._laRec=[]; n._laTrigSample=0; }
      return {};
    }
    if(state==='RECORDING'){
      if(shouldSample){
        const sample=[];
        for(let i=0;i<ch;i++) sample.push(inp['c'+i]??null);
        n._laRec.push(sample);
        if(n._laRec.length>=maxSamples) n._laState='DONE';
      }
      return {};
    }
    return {};
  },

  initNode(node){
    node._laState='IDLE'; node._laRec=[]; node._laTrigSample=null;
    node._laPrevTrg=0; node._laPrevClk=0;
    node._laMaxSamples=64; node._laSampleMode='clk';
    node._laFreeHz=10; node._laSaved=null;
  },

  getPorts(node){
    const ch=Math.max(1,Math.min(8,node._bits||4));
    const ports=[];
    for(let i=0;i<ch;i++) ports.push({id:'c'+i,name:'C'+i,dir:'in',bits:1});
    if(node._laSampleMode==='clk') ports.push({id:'clk',name:'CLK',dir:'in',bits:1});
    ports.push({id:'trg',name:'TRG',dir:'in',bits:1});
    ports.push({id:'rst',name:'RST',dir:'in',bits:1});
    return ports;
  },

  getGeom(node){
    const ch=Math.max(1,Math.min(8,node._bits||4));
    const hasClk=node._laSampleMode==='clk';
    const LAH=18, ROW=20;
    const ctrlPorts=hasClk?3:2;
    const CTRL=ctrlPorts*18+8;
    const minH=LAH+ch*ROW+CTRL;
    const w=Math.max(180,node._w||180);
    const h=Math.max(minH,node._h||minH);
    node._h=h;
    const ports={};
    const bodyH=h-LAH-CTRL;
    for(let i=0;i<ch;i++)
      ports['c'+i]={x:0,y:LAH+bodyH*(i+0.5)/ch,bits:1,dir:'in',name:'C'+i};
    const ctrlY=h-CTRL, ctrlStep=CTRL/ctrlPorts;
    if(hasClk){
      ports['clk']={x:0,y:ctrlY+ctrlStep*0.5,bits:1,dir:'in',name:'CLK'};
      ports['trg']={x:0,y:ctrlY+ctrlStep*1.5,bits:1,dir:'in',name:'TRG'};
      ports['rst']={x:0,y:ctrlY+ctrlStep*2.5,bits:1,dir:'in',name:'RST'};
    } else {
      ports['trg']={x:0,y:ctrlY+ctrlStep*0.5,bits:1,dir:'in',name:'TRG'};
      ports['rst']={x:0,y:ctrlY+ctrlStep*1.5,bits:1,dir:'in',name:'RST'};
    }
    return {x:node.x,y:node.y,w,h,ports};
  },

  draw(g, node, def, isSel, isHov){ drawAnalyzer(g,node,def,isSel,isHov); },

  getPropsHTML(n){
    const ch=n._bits||4, ms=n._laMaxSamples??64;
    const state=n._laState||'IDLE', mode=n._laSampleMode||'clk';
    const rec=n._laRec||[], freeHz=n._laFreeHz??10;
    const stateColors={IDLE:'#555',ARMED:'#f0a940',RECORDING:'#ff4444',DONE:'#00e5ff'};
    const stateCol=stateColors[state]||'#555';
    const chOpts=[1,2,3,4,5,6,7,8].map(b=>`<option value="${b}"${ch===b?' selected':''}>${b} ch</option>`).join('');
    const msOpts=[32,64,128,256,512,1024].map(v=>`<option value="${v}"${ms===v?' selected':''}>${v}</option>`).join('');
    const fhOpts=[1,2,5,10,20,50].map(v=>`<option value="${v}"${freeHz===v?' selected':''}>${v} Hz</option>`).join('');
    return `<div class="prop-sep"></div>
      <div class="prop-row"><div class="prop-label">CHANNELS</div>
        <select class="prop-input" id="pla-ch">${chOpts}</select></div>
      <div class="prop-row"><div class="prop-label">SAMPLE MODE</div>
        <select class="prop-input" id="pla-mode">
          <option value="clk"${mode==='clk'?' selected':''}>CLK pin (rising edge)</option>
          <option value="free"${mode==='free'?' selected':''}>Free-running</option>
        </select></div>
      ${mode==='free'?`<div class="prop-row"><div class="prop-label">SAMPLE RATE</div>
        <select class="prop-input" id="pla-freehz">${fhOpts}</select></div>`:''}
      <div class="prop-row"><div class="prop-label">RECORD LENGTH</div>
        <select class="prop-input" id="pla-ms">${msOpts}</select></div>
      <div class="prop-row"><div class="prop-label">STATUS</div>
        <div class="prop-val" style="color:${stateCol}">${state} · ${rec.length}/${ms} samples</div></div>
      <div style="display:flex;gap:4px;margin-bottom:4px">
        <button class="tb-btn" id="pla-arm"   style="flex:1;justify-content:center;font-size:10px">⟳ Re-arm</button>
        <button class="tb-btn" id="pla-save"  style="flex:1;justify-content:center;font-size:10px">↓ Save CSV</button>
        <button class="tb-btn" id="pla-clear" style="flex:1;justify-content:center;font-size:10px;color:#e74c3c">✕ Clear</button>
      </div>
      ${n._laSaved?`<div style="font-size:9px;color:var(--muted)">Last saved: ${n._laSaved.length} samples · ${new Date(n._laSavedAt||0).toLocaleTimeString()}</div>`:''}`;
  },

  bindProps(n, def, cid){
    document.getElementById('pla-freehz')?.addEventListener('change',e=>{
      n._laFreeHz=parseInt(e.target.value)||10; syncAnalyzerTimers(); updatePropPanel();
    });
    document.getElementById('pla-mode')?.addEventListener('change',e=>{
      const m=e.target.value;
      if(m!=='clk') Object.keys(circuits[cid].wires).forEach(wi=>{
        const w=circuits[cid].wires[wi];
        if(w.toNode===n.id&&w.toPort==='clk') delete circuits[cid].wires[wi];
      });
      n._laSampleMode=m; n._laState='ARMED'; n._laRec=[];
      n._laTrigSample=null; n._laPrevTrg=0; n._laPrevClk=0;
      syncAnalyzerTimers(); simulate(cid); updatePropPanel();
    });
    document.getElementById('pla-ch')?.addEventListener('change',e=>{
      const ch=parseInt(e.target.value)||4; n._bits=ch;
      n._laState='ARMED'; n._laRec=[]; n._laTrigSample=null; n._laPrevTrg=0;
      const ports=getNodePorts(n,def); const pv={};
      ports.forEach(p=>pv[p.id]=n.portValues[p.id]??null);
      n.portValues=pv;
      Object.keys(circuits[cid].wires).forEach(wi=>{
        const w=circuits[cid].wires[wi];
        if(w.toNode===n.id&&!pv.hasOwnProperty(w.toPort)) delete circuits[cid].wires[wi];
      });
      simulate(cid); updatePropPanel();
    });
    document.getElementById('pla-ms')?.addEventListener('change',e=>{
      n._laMaxSamples=parseInt(e.target.value)||64; render(); updatePropPanel();
    });
    document.getElementById('pla-arm')?.addEventListener('click',()=>{
      n._laState='ARMED'; n._laRec=[]; n._laTrigSample=null;
      n._laPrevTrg=0; n._laPrevClk=0; render(); updatePropPanel();
    });
    document.getElementById('pla-save')?.addEventListener('click',()=>{
      const rec=n._laRec||[];
      if(!rec.length){ toast('No samples recorded'); return; }
      n._laSaved=rec.map(s=>[...s]); n._laSavedAt=Date.now();
      const ch=n._bits||4;
      const hdr=['sample',...Array.from({length:ch},(_,i)=>'C'+i)].join(',');
      const csv=[hdr,...rec.map((s,i)=>[i,...s].join(','))].join('\n');
      document.getElementById('modal-body').innerHTML=`
        <div style="font-size:11px;color:var(--muted);margin-bottom:6px">${rec.length} samples · ${ch} ch</div>
        <textarea class="prop-input" style="height:140px;font-size:10px;font-family:var(--font)" readonly>${csv}</textarea>`;
      openModal('Save Recording','Copy CSV data below.',()=>{},'Close');
      setTimeout(()=>{
        const ta=document.querySelector('#modal-body textarea');
        if(ta){ ta.select(); try{ document.execCommand('copy'); toast('Copied'); }catch(e){} }
      },50);
      updatePropPanel();
    });
    document.getElementById('pla-clear')?.addEventListener('click',()=>{
      n._laState='ARMED'; n._laRec=[]; n._laTrigSample=null;
      n._laPrevTrg=0; n._laPrevClk=0; render(); updatePropPanel();
    });
  },

  onAdded(node, cid){ syncAnalyzerTimers(); },
  onRemoved(node, cid){
    if(_analyzerTimers[node.id]){ clearInterval(_analyzerTimers[node.id]); delete _analyzerTimers[node.id]; }
    delete _analyzerTimers[node.id+'_ms'];
  },
  syncTimers(){ syncAnalyzerTimers(); },

  applyResize(n, id, snap, dx, dy){
    const {nx,ny,nw,nh}=snap;
    const ch=Math.max(1,Math.min(8,n._bits||4));
    const minH=18+ch*20+40;
    let rx=nx,ry=ny,rw=nw,rh=nh;
    if(id.includes('e')) rw=Math.max(180,nw+dx);
    if(id.includes('w')){ rw=Math.max(180,nw-dx); rx=nx+nw-rw; }
    if(id.includes('s')) rh=Math.max(minH,nh+dy);
    if(id.includes('n')){ rh=Math.max(minH,nh-dy); ry=ny+nh-rh; }
    n.x=Math.round(rx/10)*10; n.y=Math.round(ry/10)*10;
    n._w=Math.round(rw/10)*10; n._h=Math.round(rh/10)*10;
  },

  demo(){
    makeCircuit('analyzer','Analyzer');
    const aC1   =addNode('analyzer','CLOCK',   60,  60,'1Hz', {hz:1});
    const aC5   =addNode('analyzer','CLOCK',   60, 180,'5Hz', {hz:5});
    const aC20  =addNode('analyzer','CLOCK',   60, 300,'20Hz',{hz:20});
    const aEN   =addNode('analyzer','INPUT',   60, 420,'EN');  aEN._value=1;
    const aAna  =addNode('analyzer','ANALYZER',280,  80,'Signals');
    aAna._bits=3; aAna._laMaxSamples=128;
    const aClk50=addNode('analyzer','CLOCK',   60, 530,'CLK50',{hz:50});
    addWire('analyzer',aEN.id,'out',aC1.id,'en');
    addWire('analyzer',aEN.id,'out',aC5.id,'en');
    addWire('analyzer',aEN.id,'out',aC20.id,'en');
    addWire('analyzer',aC1.id,'clk',aAna.id,'c0');
    addWire('analyzer',aC5.id,'clk',aAna.id,'c1');
    addWire('analyzer',aC20.id,'clk',aAna.id,'c2');
    addWire('analyzer',aClk50.id,'clk',aAna.id,'clk');
    addWire('analyzer',aEN.id,'out',aClk50.id,'en');
    addWire('analyzer',aEN.id,'out',aAna.id,'trg');
  },
});

// ── Analyzer drawing (was in ll-render.js) ──
function drawAnalyzer(g,node,def,isSel,isHov){
  const ch=Math.max(1,Math.min(8,node._bits||4));
  const col=def.color;
  const rec=node._laRec||[];
  const maxSamples=node._laMaxSamples??64;
  const state=node._laState||'IDLE';
  const trigSample=node._laTrigSample??null;
  const LAH=18,CTRL=40;
  const bodyY=g.y+LAH, bodyH=g.h-LAH-CTRL;
  const rowH=bodyH/ch;

  ctx.save();
  if(isSel){ctx.shadowColor=col;ctx.shadowBlur=12/vpScale;}
  rr(g.x,g.y,g.w,g.h,4); ctx.fillStyle='#080c10'; ctx.fill();
  rr(g.x,g.y,g.w,g.h,4);
  ctx.strokeStyle=isSel?col:isHov?'rgba(255,255,255,0.18)':col+'44';
  ctx.lineWidth=(isSel?1.5:1)/vpScale; ctx.stroke();
  ctx.restore();

  rr(g.x,g.y,g.w,LAH,4); ctx.fillStyle=col+'22'; ctx.fill();
  ctx.font=`700 ${9/vpScale}px JetBrains Mono`;
  ctx.fillStyle=col; ctx.textAlign='left'; ctx.textBaseline='middle';
  ctx.fillText('ANALYZER',g.x+8,g.y+LAH/2);
  const statusMap={IDLE:'IDLE',ARMED:'ARMED',RECORDING:'REC●',DONE:'DONE'};
  const statusColMap={IDLE:'#555',ARMED:'#f0a940',RECORDING:'#ff4444',DONE:col};
  ctx.textAlign='right'; ctx.fillStyle=statusColMap[state]||'#555';
  ctx.fillText(statusMap[state]||state,g.x+g.w-8,g.y+LAH/2);

  const plotX=g.x+2, plotW=g.w-4;
  const viewSamples=Math.min(rec.length,maxSamples);
  const startIdx=Math.max(0,rec.length-maxSamples);
  const sampleW=plotW/maxSamples;

  ctx.save();
  ctx.beginPath(); ctx.rect(g.x,bodyY,g.w,bodyH); ctx.clip();

  for(let ci=0;ci<ch;ci++){
    const ry=bodyY+ci*rowH;
    ctx.fillStyle=ci%2?'rgba(255,255,255,0.015)':'rgba(0,0,0,0)';
    ctx.fillRect(g.x,ry,g.w,rowH);
    if(vpScale>0.35){
      ctx.font=`500 ${8/vpScale}px JetBrains Mono`;
      ctx.fillStyle=col+'88'; ctx.textAlign='left'; ctx.textBaseline='top';
      ctx.fillText('C'+ci,g.x+3,ry+2);
    }
    ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=0.5/vpScale;
    ctx.moveTo(g.x,ry+rowH); ctx.lineTo(g.x+g.w,ry+rowH); ctx.stroke();
    if(viewSamples<2) continue;
    const hi=ry+rowH*0.08, lo=ry+rowH*0.88;
    const curVal=rec[rec.length-1]?.[ci];
    ctx.beginPath(); ctx.strokeStyle=curVal===1?col:col+'55'; ctx.lineWidth=1.5/vpScale;
    let prevY=lo, firstPt=true;
    for(let si=0;si<viewSamples;si++){
      const v=rec[startIdx+si]?.[ci]??null;
      const sx=plotX+si*sampleW, sy=v===1?hi:lo;
      if(firstPt){ctx.moveTo(sx,sy);firstPt=false;}
      else{ if(sy!==prevY){ctx.lineTo(sx,prevY);ctx.lineTo(sx,sy);}else ctx.lineTo(sx,sy); }
      prevY=sy;
    }
    ctx.lineTo(plotX+plotW,prevY); ctx.stroke();
  }
  if((state==='RECORDING'||state==='DONE')&&trigSample!==null){
    const tx=plotX+trigSample*sampleW;
    ctx.beginPath(); ctx.strokeStyle=col+'cc'; ctx.lineWidth=1/vpScale;
    ctx.setLineDash([3/vpScale,3/vpScale]);
    ctx.moveTo(tx,bodyY); ctx.lineTo(tx,bodyY+bodyH); ctx.stroke(); ctx.setLineDash([]);
    if(vpScale>0.35){
      ctx.font=`700 ${8/vpScale}px JetBrains Mono`;
      ctx.fillStyle=col; ctx.textAlign='center'; ctx.textBaseline='top';
      ctx.fillText('T',tx,bodyY+1);
    }
  }
  ctx.restore();

  const ctrlY=g.y+g.h-CTRL;
  ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.06)'; ctx.lineWidth=0.5/vpScale;
  ctx.moveTo(g.x,ctrlY); ctx.lineTo(g.x+g.w,ctrlY); ctx.stroke();
  if(vpScale>0.3){
    ctx.font=`${8/vpScale}px JetBrains Mono`;
    ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.textAlign='right'; ctx.textBaseline='middle';
    ctx.fillText(`${rec.length}/${maxSamples} smp`,g.x+g.w-6,ctrlY+CTRL*0.45);
  }

  // Port stubs
  const ports=getNodePorts(node,def);
  ports.forEach(p=>{
    const pp=g.ports[p.id]; if(!pp) return;
    const wx=g.x+pp.x, wy=g.y+pp.y;
    const val=node.portValues[p.id];
    const isHovP=hovPortKey===node.id+'_'+p.id;
    const wCol=portWireColor(currentCircuitId,node.id,p.id);
    const isFloat=val===null;
    const dotX=wx-14;
    const activeCol=isFloat?'#2a3040':(val===1?wCol:'#1a2030');
    ctx.beginPath(); ctx.moveTo(dotX,wy); ctx.lineTo(wx,wy);
    ctx.strokeStyle=activeCol; ctx.lineWidth=1.5/vpScale; ctx.stroke();
    ctx.beginPath(); ctx.arc(dotX,wy,PORT_R/vpScale,0,Math.PI*2);
    ctx.fillStyle=isHovP?'#fff':activeCol; ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,0.6)'; ctx.lineWidth=1/vpScale; ctx.stroke();
    if(vpScale>0.45){
      ctx.font=`600 ${9/vpScale}px JetBrains Mono`;
      const tw=ctx.measureText(p.name).width;
      const ph=11/vpScale, pw=tw+6/vpScale, pr=3/vpScale;
      ctx.save();
      rr(dotX-pw/2,wy-ph-2/vpScale,pw,ph,pr);
      ctx.fillStyle='rgba(8,12,16,0.85)'; ctx.fill();
      rr(dotX-pw/2,wy-ph-2/vpScale,pw,ph,pr);
      ctx.strokeStyle='rgba(255,255,255,0.10)'; ctx.lineWidth=0.5/vpScale; ctx.stroke();
      ctx.restore();
      ctx.fillStyle='rgba(255,255,255,0.75)';
      ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(p.name,dotX,wy-2/vpScale);
    }
  });
  if(isSel) drawResizeHandles(g,col);
}
