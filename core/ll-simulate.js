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

function simulateCompositeInline(defId,inputMap){
  const def=blockDefs[defId]; if(!def) return {};
  const c=circuits[def.circuit?.id]||def.circuit; if(!c) return {};

  // Snapshot gate nodes only — nodes with excludeFromSnapshot flag are skipped.
  // IO, clock, analyzer, and display nodes register this via their descriptor flags.
  const snap={};
  Object.values(c.nodes).forEach(n=>{
    const nd=blockDefs[n.defId];
    if(nd?.excludeFromSnapshot) return;
    snap[n.id]={pv:{...n.portValues},v:n._value};
  });

  // Feed inputs — preserve null for unconnected/floating ports
  def.ports.filter(p=>p.dir==='in').forEach(p=>{
    const ion=Object.values(c.nodes).find(n=>n._ioPortId===p.id);
    if(ion){
      const v=inputMap[p.id]??null;
      // Only set _value if we have a real value — null means floating, leave as-is
      if(v!==null) ion._value=v;
      ion.portValues['out']=v;
    }
  });

  // Run propagation only (don't call simulate() which would clobber live clock state)
  // Do a simple propagation pass: wires → gate logic, no global reset
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

  // Collect outputs — read live portValues from OUTPUT IO nodes
  const result={};
  def.ports.filter(p=>p.dir==='out').forEach(p=>{
    const ion=Object.values(c.nodes).find(n=>n._ioPortId===p.id);
    if(ion) result[p.id]=ion.portValues['a']??null;
  });

  // Restore snapshotted nodes, preserving _phase/_hz (clock state)
  Object.values(c.nodes).forEach(n=>{
    if(!snap[n.id]) return;
    n.portValues=snap[n.id].pv;
    n._value=snap[n.id].v;
  });

  return result;
}

// ═══════════════════════════════════════════════════════════════
