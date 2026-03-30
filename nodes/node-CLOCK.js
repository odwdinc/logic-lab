// Logic Lab Node — CLOCK
// Square-wave oscillator. Owns its own timer registry and sync logic.

// ── Timer registry (was in ll-state.js) ──
const _clockTimers = {};

function startClockTimer(nodeId, hz){
  stopClockTimer(nodeId);
  if(!hz||hz<=0) return;
  const ms=Math.max(20, 1000/(hz*2));
  _clockTimers[nodeId]=setInterval(()=>{
    let found=null, foundCid=null;
    for(const [cid,c] of Object.entries(allCircuits())){
      if(c.nodes[nodeId]){ found=c.nodes[nodeId]; foundCid=cid; break; }
    }
    if(!found){ stopClockTimer(nodeId); return; }
    found._phase=(found._phase||0)^1;
    const owningDef=Object.values(blockDefs).find(d=>d.circuit?.id===foundCid);
    if(!owningDef){
      simulate(foundCid, true);
    } else {
      Object.keys(circuits).forEach(cid=>{ try{ simulate(cid,true); }catch(_){} });
    }
  }, ms);
}

function stopClockTimer(nodeId){
  if(_clockTimers[nodeId]){ clearInterval(_clockTimers[nodeId]); delete _clockTimers[nodeId]; }
}

function syncClockTimers(){
  const activeClocks=new Set();
  Object.values(allCircuits()).forEach(c=>{
    Object.values(c.nodes).forEach(n=>{
      const def=blockDefs[n.defId];
      if(def?.isClock){
        activeClocks.add(n.id);
        if(!_clockTimers[n.id]) startClockTimer(n.id, n._hz??1);
      }
    });
  });
  Object.keys(_clockTimers).forEach(id=>{ if(!activeClocks.has(id)) stopClockTimer(id); });
}

// ── Node descriptor ──
registerNode({
  id: 'CLOCK', name: 'CLK', color: '#2ecc71',
  flags: { isClock:true, excludeFromSnapshot:true, passthroughColor:true },

  ports: [
    { id:'en',  name:'EN',  dir:'in',  bits:1 },
    { id:'clk', name:'CLK', dir:'out', bits:1 },
  ],

  logic(i, n){
    if(i.en===null) return { clk:null };
    if(i.en===0)    return { clk:0 };
    return { clk: n._phase||0 };
  },

  initNode(node, opts){
    node._hz    = opts.hz ?? 1;
    node._phase = 0;
  },

  // Color: pass-through from EN input
  getOutputColor(cid, node, outPortId, wireSourceColors){
    const cols = wireSourceColors(cid, node.id, 'en');
    return cols[0] || null;
  },

  // Draw: waveform symbol + Hz label in gate body (called from drawNode after gate body)
  drawBody(g, node, def){
    const phase=node._phase||0;
    const hz=node._hz??1;
    const bw=g.w-16, bh=g.h-NLH-12;
    const ww=Math.min(bw-4,36), wh=10, wx2=g.x+g.w/2-ww/2, wy2=g.y+NLH+10;
    ctx.strokeStyle=phase?def.color:def.color+'66'; ctx.lineWidth=1.5/vpScale;
    ctx.beginPath();
    ctx.moveTo(wx2,wy2+wh); ctx.lineTo(wx2,wy2);
    ctx.lineTo(wx2+ww/2,wy2); ctx.lineTo(wx2+ww/2,wy2+wh);
    ctx.lineTo(wx2+ww,wy2+wh);
    ctx.stroke();
    const dotCx=phase?wx2+ww/4:wx2+ww*3/4;
    ctx.beginPath(); ctx.arc(dotCx,wy2+wh/2,2.5/vpScale,0,Math.PI*2);
    ctx.fillStyle=def.color; ctx.fill();
    const hzStr=hz>=1?hz.toFixed(hz%1?1:0)+'Hz':Math.round(hz*1000)+'mHz';
    ctx.font=`500 ${9/vpScale}px JetBrains Mono`;
    ctx.fillStyle=def.color+'cc'; ctx.textAlign='center'; ctx.textBaseline='bottom';
    ctx.fillText(hzStr, g.x+g.w/2, g.y+g.h-4);
  },

  getPropsHTML(n, def){
    const hz=n._hz??1;
    return `
      <div class="prop-row"><div class="prop-label">SPEED (Hz)</div>
        <input class="prop-input" id="phz" type="number" min="0.001" max="50" step="0.5"
          value="${hz}"></div>
      <div class="prop-row"><div class="prop-label">PHASE</div>
        <div id="pclk-phase" class="prop-val" style="color:${n._phase?def.color:'#555'}">${n._phase?'HIGH ↑':'LOW ↓'}</div></div>
      <div style="font-size:9px;color:var(--muted);line-height:1.5;margin-top:2px">
        Toggles every ${hz>0?(1000/(hz*2)).toFixed(0):'–'}ms · connect EN to run
      </div>`;
  },

  bindProps(n, def, cid){
    document.getElementById('phz')?.addEventListener('change', e=>{
      const hz=Math.max(0.001,Math.min(50,parseFloat(e.target.value)||1));
      n._hz=hz; stopClockTimer(n.id); startClockTimer(n.id,hz); updatePropPanel();
    });
  },

  patchLive(n, def){
    const el=document.getElementById('pclk-phase');
    if(el){ el.textContent=n._phase?'HIGH ↑':'LOW ↓'; el.style.color=n._phase?def.color:'#555'; }
  },

  onAdded(node, cid){ syncClockTimers(); },
  onRemoved(node, cid){ stopClockTimer(node.id); },
  syncTimers(){ syncClockTimers(); },
});
