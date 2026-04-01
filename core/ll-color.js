// Logic Lab

function hexToRgb(hex){
  if(!hex||hex[0]!=='#') return null;
  const h=hex.slice(1);
  if(h.length===6) return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
  if(h.length===3) return [parseInt(h[0]+h[0],16),parseInt(h[1]+h[1],16),parseInt(h[2]+h[2],16)];
  return null;
}
function rgbToHex(r,g,b){
  return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('');
}
function blendColors(cols){
  // Average RGB of all valid colors
  const valid=cols.map(hexToRgb).filter(Boolean);
  if(!valid.length) return null;
  const avg=valid.reduce((a,c)=>[a[0]+c[0],a[1]+c[1],a[2]+c[2]],[0,0,0]).map(v=>v/valid.length);
  return rgbToHex(...avg);
}
function mixTwoColors(a,b){
  const ra=hexToRgb(a), rb=hexToRgb(b);
  if(!ra||!rb) return a||b||null;
  return rgbToHex((ra[0]+rb[0])/2,(ra[1]+rb[1])/2,(ra[2]+rb[2])/2);
}

// ── Get all source IO colors feeding a port (returns array of hex strings) ──
const _colorVisited=new Set();

function wireSourceColors(cid, nodeId, portId) {
  const c=circuits[cid]; if(!c) return [];
  const fromWire=Object.values(c.wires).find(w=>w.toNode===nodeId&&w.toPort===portId);
  if(!fromWire){
    const n=c.nodes[nodeId]; if(!n) return [];
    const def=blockDefs[n.defId];
    if(def?.isIO&&def.ioDir==='in') return n.wireColor?[n.wireColor]:[];
    return [];
  }
  const fromN=c.nodes[fromWire.fromNode]; if(!fromN) return [];
  const fDef=blockDefs[fromN.defId];
  if(fDef?.isIO&&fDef.ioDir==='in') return fromN.wireColor?[fromN.wireColor]:[];
  const col=gateOutputColor(cid,fromN,fDef,fromWire.fromPort);
  return col?[col]:[];
}

// ── Compute the output wire color of a gate node on a given output port ──
function gateOutputColor(cid, node, def, outPortId){
  if(!def) return null;
  if(def.isIO&&def.ioDir==='in') return node.wireColor||null;
  if(def.isIO&&def.ioDir==='out') return node.wireColor||null;
  // Cycle guard — feedback loops in combinational circuits
  const key=cid+'|'+node.id+'|'+outPortId;
  if(_colorVisited.has(key)) return null;
  _colorVisited.add(key);

  // ── Custom composite block: trace per-lane color through internal circuit ──
  if(def.circuit){
    const ic=circuits[def.circuit.id]||def.circuit;
    if(ic){
      const outIONode=Object.values(ic.nodes).find(n=>n._ioPortId===outPortId);
      if(outIONode){
        const saved={};
        def.ports.filter(p=>p.dir==='in').forEach(p=>{
          const inIONode=Object.values(ic.nodes).find(n=>n._ioPortId===p.id);
          if(!inIONode) return;
          const lanes=portLaneColors(cid,node.id,p.id);
          saved[inIONode.id]={wc:inIONode.wireColor,lc:inIONode._laneColors};
          inIONode.wireColor=lanes.find(c=>c)||inIONode.wireColor;
          inIONode._laneColors=lanes.length>1?lanes:undefined;
        });
        const blockCid=def.circuit.id;
        const result=portLaneColors(blockCid,outIONode.id,'a');
        Object.entries(saved).forEach(([nid,s])=>{
          const n=ic.nodes[nid]; if(!n) return;
          n.wireColor=s.wc; n._laneColors=s.lc;
        });
        _colorVisited.delete(key);
        return result[0]||null;
      }
    }
    _colorVisited.delete(key);
    return null;
  }

  // ── Node descriptor color hook ──
  const descColor=_nodeRegistry[def.id];
  if(descColor?.getOutputColor){
    const result=descColor.getOutputColor(cid,node,outPortId,wireSourceColors,portLaneColors);
    _colorVisited.delete(key);
    return result;
  }

  // Collect colors from all input ports
  const inPorts=getNodePorts(node,def).filter(p=>p.dir==='in');
  const inputColors=inPorts.map(p=>wireSourceColors(cid,node.id,p.id)).flat().filter(Boolean);
  _colorVisited.delete(key);
  if(!inputColors.length) return null;

  if(def.passthroughColor) return inputColors[0]||null;
  return blendColors(inputColors);
}

// ── Trace color backwards through an internal circuit ──
// externalColors maps internal INPUT IO node id → color string
function traceColorInCircuit(ic, nodeId, portId, externalColors, depth=0){
  if(depth>20) return null; // cycle guard
  // Find what feeds this port
  const fromWire=Object.values(ic.wires).find(w=>w.toNode===nodeId&&w.toPort===portId);
  if(!fromWire){
    // No wire — check if this node itself is a color source
    const n=ic.nodes[nodeId]; if(!n) return null;
    return externalColors[nodeId]||null;
  }
  const fromN=ic.nodes[fromWire.fromNode]; if(!fromN) return null;
  const fDef=blockDefs[fromN.defId];
  // Internal INPUT IO node — return its externally-assigned color
  if(fDef?.isIO&&fDef.ioDir==='in') return externalColors[fromN.id]||null;
  // Recurse based on gate type
  const inPorts=getNodePorts(fromN,fDef).filter(p=>p.dir==='in');
  if(fDef?.passthroughColor){
    if(inPorts[0]) return traceColorInCircuit(ic,fromN.id,inPorts[0].id,externalColors,depth+1);
    return null;
  }
  // Blend all inputs — covers gates, bus nodes, composites, and unknowns
  const cols=inPorts.map(p=>traceColorInCircuit(ic,fromN.id,p.id,externalColors,depth+1)).filter(Boolean);
  return cols.length?blendColors(cols):null;
}

// ── Get effective wire color for a FROM port (single representative color) ──
function portWireColor(cid, nodeId, portId) {
  const n=circuits[cid]?.nodes[nodeId]; if(!n) return '#555';
  const def=blockDefs[n.defId];
  // INPUT node — use assigned wireColor
  if(def?.isIO&&def.ioDir==='in') return n.wireColor||'#e74c3c';
  // OUTPUT node (top-level receiver) — trace back through incoming wire
  if(def?.isIO&&def.ioDir==='out'){
    const lc=portLaneColors(cid,nodeId,'a');
    return lc[0]||signalActiveColor(n.portValues['a'],n._bits||1);
  }
  // Gate / other node
  const col=gateOutputColor(cid,n,def,portId);
  return col||signalActiveColor(n.portValues[portId],
    getNodePorts(n,def).find(p=>p.id===portId)?.bits||1);
}

// ── Get per-lane colors for a port (array, one color per bit, MSB first) ──
function portLaneColors(cid, nodeId, portId){
  const c=circuits[cid]; if(!c) return [null];
  const n=c.nodes[nodeId]; if(!n) return [null];
  const def=blockDefs[n.defId];
  // Cycle guard — same set as gateOutputColor, cleared each render()
  const key=cid+'|'+nodeId+'|'+portId;
  if(_colorVisited.has(key)) return [null];
  _colorVisited.add(key);

  // INPUT node — use per-lane colors if available, else uniform wireColor
  if(def?.isIO&&def.ioDir==='in'){
    const bits=n._bits||1;
    if(n._laneColors&&n._laneColors.length===bits) return [...n._laneColors];
    return Array(bits).fill(n.wireColor||null);
  }

  // OUTPUT node (top-level) — trace from incoming wire
  if(def?.isIO&&def.ioDir==='out'){
    const fromWire=Object.values(c.wires).find(w=>w.toNode===nodeId&&w.toPort==='a');
    if(!fromWire) return [null];
    return portLaneColors(cid,fromWire.fromNode,fromWire.fromPort);
  }

  // BITS_TO_BUS 'bus' output — lane[0]=MSB=b(bits-1), lane[bits-1]=LSB=b0
  if(def?.id==='BITS_TO_BUS' && portId==='bus'){
    const bits=n._bits||2;
    // Lane i (MSB first) corresponds to b(bits-1-i)
    return Array.from({length:bits},(_,i)=>wireSourceColors(cid,n.id,'b'+(bits-1-i))[0]||null);
  }

  // BUS_TO_BITS individual bit outputs — b(i) carries lane bits-1-i (MSB-first lanes)
  if(def?.id==='BUS_TO_BITS' && portId!=='bus'){
    const fromWire=Object.values(c.wires).find(w=>w.toNode===nodeId&&w.toPort==='bus');
    if(!fromWire) return [null];
    const lanes=portLaneColors(cid,fromWire.fromNode,fromWire.fromPort);
    const bits=n._bits||2;
    const bitIdx=parseInt(portId.slice(1)); // b0=LSB, b(bits-1)=MSB
    const laneIdx=bits-1-bitIdx;            // lane 0=MSB, lane bits-1=LSB
    return [lanes[laneIdx]||null];
  }

  // For an output port on any other node — compute based on gate type
  const portDef=getNodePorts(n,def).find(p=>p.id===portId);
  if(portDef?.dir==='out'){
    // Composite block — do full per-lane trace through internal circuit
    if(def.circuit){
      const ic=circuits[def.circuit.id]||def.circuit;
      const outIONode=ic?Object.values(ic.nodes).find(nd=>nd._ioPortId===portId):null;
      if(outIONode){
        // Set external lane colors on internal INPUT nodes temporarily
        const saved={};
        def.ports.filter(p=>p.dir==='in').forEach(p=>{
          const inIONode=Object.values(ic.nodes).find(nd=>nd._ioPortId===p.id);
          if(!inIONode) return;
          const lanes=portLaneColors(cid,nodeId,p.id);
          saved[inIONode.id]={wc:inIONode.wireColor,lc:inIONode._laneColors};
          inIONode.wireColor=lanes.find(c=>c)||inIONode.wireColor;
          inIONode._laneColors=lanes.length>1?lanes:undefined;
        });
        const blockCid=def.circuit.id;
        const result=portLaneColors(blockCid,outIONode.id,'a');
        // Restore
        Object.entries(saved).forEach(([nid,s])=>{
          const nd=ic.nodes[nid]; if(!nd) return;
          nd.wireColor=s.wc; nd._laneColors=s.lc;
        });
        return result;
      }
    }
    const col=gateOutputColor(cid,n,def,portId);
    const bits=portDef.bits||1;
    return Array(bits).fill(col||null);
  }

  // Input port — trace from the wire feeding it
  const fromWire=Object.values(c.wires).find(w=>w.toNode===nodeId&&w.toPort===portId);
  if(!fromWire) return [null];
  return portLaneColors(cid,fromWire.fromNode,fromWire.fromPort);
}

// Returns the effective port list for a node — handles dynamic IO and BTB ports
function getNodePorts(node,def){
  // Ask the registry first — node descriptors define getPorts for dynamic port lists
  const descPorts=getDescPorts(node,def);
  if(descPorts) return descPorts;
  // Fallback: static def.ports for simple gates and custom blocks
  return def?.ports||[];
}

// ═══════════════════════════════════════════════════════════════
//  SIMULATION
// ═══════════════════════════════════════════════════════════════

let _autosaveTimer=null;
function autosaveDebounced(){
  clearTimeout(_autosaveTimer);
  _autosaveTimer=setTimeout(autosave,1500);
}

