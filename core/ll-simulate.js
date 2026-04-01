// Logic Lab

function simulate(cid, quiet=false){
  const c=circuits[cid]; if(!c) return;
  const nodes=c.nodes, wires=c.wires;

  // Reset input ports to null, but preserve output port values from previous run
  // so feedback loops have a stable starting state (SR latch, etc.)
  Object.values(nodes).forEach(n=>{
    const def=blockDefs[n.defId]; if(!def) return;
    const ports=getNodePorts(n,def);
    ports.filter(p=>p.dir==='in').forEach(p=>{
      if(n.portValues[p.id]===undefined) n.portValues[p.id]=null;
      else n.portValues[p.id]=null;
    });
    // Output ports keep their previous value as seed for feedback resolution
  });

  for(let iter=0;iter<256;iter++){
    let changed=false;
    // IO inputs drive their output port
    Object.values(nodes).forEach(n=>{
      const def=blockDefs[n.defId];
      if(def?.isIO&&def.ioDir==='in'){
        const bits=n._bits||def.ioBits||1;
        const max=(1<<bits)-1;
        const v=Math.max(0,Math.min(max,n._value??0));
        if(n.portValues['out']!==v){n.portValues['out']=v;changed=true;}
      }
    });
    // Propagate wires
    Object.values(wires).forEach(w=>{
      const fn=nodes[w.fromNode],tn=nodes[w.toNode]; if(!fn||!tn) return;
      const v=fn.portValues[w.fromPort];
      if(tn.portValues[w.toPort]!==v){tn.portValues[w.toPort]=v;changed=true;}
    });
    // Evaluate gates (static and dynamic)
    Object.values(nodes).forEach(n=>{
      const def=blockDefs[n.defId]; if(!def?.logic) return;
      const ports=getNodePorts(n,def);
      const inp={};
      ports.filter(p=>p.dir==='in').forEach(p=>inp[p.id]=n.portValues[p.id]??null);
      const outs=def.logic(inp,n);
      ports.filter(p=>p.dir==='out').forEach(p=>{
        if(outs[p.id]!==undefined&&outs[p.id]!==n.portValues[p.id]){
          n.portValues[p.id]=outs[p.id];changed=true;
        }
      });
    });
    if(!changed) break;
  }
  render();
  if(quiet){
    // Clock tick: only patch live read-only values, never rebuild the panel
    patchPropPanelLive();
  } else {
    updatePropPanelIfSafe();
    autosaveDebounced();
  }
}

function simulateCompositeInline(defId, inputMap, inst){
  const def=blockDefs[defId]; if(!def) return {};
  const c=circuits[def.circuit?.id]||def.circuit; if(!c) return {};

  // Gate nodes are the internal combinational/sequential nodes — IO, clock, etc.
  // are excluded via excludeFromSnapshot flag.  Their portValues hold the latch state.
  const gateNodes=Object.values(c.nodes).filter(n=>!blockDefs[n.defId]?.excludeFromSnapshot);

  // Per-instance state: each block node (inst) carries its own copy of gate
  // portValues (and nested _blockState for composite sub-nodes) in _blockState.
  // Load it into the shared circuit before running so two instances of the same
  // block never contaminate each other — including arbitrarily nested blocks.
  if(inst){
    if(!inst._blockState) inst._blockState={};
    for(const gn of gateNodes){
      const saved=inst._blockState[gn.id];
      if(saved){
        gn.portValues={...saved.pv};
        // Restore nested composite block state so inner latches are also isolated
        if(saved.bs!==undefined) gn._blockState=JSON.parse(JSON.stringify(saved.bs));
      } else {
        // Fresh instance — start every port at null (neutral)
        const nd=blockDefs[gn.defId];
        const ports=getNodePorts(gn,nd);
        gn.portValues={};
        ports.forEach(p=>{ gn.portValues[p.id]=null; });
        gn._blockState={};
      }
    }
  }

  // Save _value of INPUT IO nodes we are about to drive so display stays correct
  const savedInputs={};
  def.ports.filter(p=>p.dir==='in').forEach(p=>{
    const ion=Object.values(c.nodes).find(n=>n._ioPortId===p.id);
    if(ion) savedInputs[ion.id]={v:ion._value};
  });

  // Feed inputs
  def.ports.filter(p=>p.dir==='in').forEach(p=>{
    const ion=Object.values(c.nodes).find(n=>n._ioPortId===p.id);
    if(ion){
      const v=inputMap[p.id]??null;
      if(v!==null) ion._value=v;
      ion.portValues['out']=v;
    }
  });

  // Run propagation: wires → gate logic, no global reset
  let changed=true;
  for(let iter=0;iter<64&&changed;iter++){
    changed=false;
    Object.values(c.wires).forEach(w=>{
      const fn=c.nodes[w.fromNode],tn=c.nodes[w.toNode]; if(!fn||!tn) return;
      const v=fn.portValues[w.fromPort];
      if(tn.portValues[w.toPort]!==v){tn.portValues[w.toPort]=v;changed=true;}
    });
    Object.values(c.nodes).forEach(n=>{
      const nd=blockDefs[n.defId]; if(!nd?.logic) return;
      const ports=getNodePorts(n,nd);
      const inp={};
      ports.filter(p=>p.dir==='in').forEach(p=>inp[p.id]=n.portValues[p.id]??null);
      const outs=nd.logic(inp,n);
      ports.filter(p=>p.dir==='out').forEach(p=>{
        if(outs[p.id]!==undefined&&outs[p.id]!==n.portValues[p.id]){
          n.portValues[p.id]=outs[p.id]; changed=true;
        }
      });
    });
  }

  // Save updated gate state (and nested _blockState) back into this instance
  if(inst){
    for(const gn of gateNodes){
      const entry={pv:{...gn.portValues}};
      // If this node is itself a composite block, persist its inner state too
      if(gn._blockState!==undefined) entry.bs=JSON.parse(JSON.stringify(gn._blockState));
      inst._blockState[gn.id]=entry;
    }
  }

  // Collect outputs
  const result={};
  def.ports.filter(p=>p.dir==='out').forEach(p=>{
    const ion=Object.values(c.nodes).find(n=>n._ioPortId===p.id);
    if(ion) result[p.id]=ion.portValues['a']??null;
  });

  // Restore _value on INPUT IO nodes so their display is not stale
  Object.entries(savedInputs).forEach(([nid,s])=>{
    const n=c.nodes[nid]; if(n) n._value=s.v;
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
