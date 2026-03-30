// Logic Lab

// Wire color palette — each wire gets a color based on its source node's assigned color
const IO_COLORS = [
  '#e74c3c','#c0392b','#e67e22','#d4ac0d','#27ae60',
  '#1abc9c','#2980b9','#8e44ad','#f06292','#00bcd4',
];
let _colorIdx = 0;
function nextIOColor() { return IO_COLORS[(_colorIdx++)%IO_COLORS.length]; }

// ── BLOCK DEFINITIONS ──
let blockDefs = {};
let circuits  = {};
let currentCircuitId = 'main';
let editStack = ['main'];
let _editingDefId = null;  // defId of the custom block currently being edited
let _editingNodeId = null; // nodeId of the placed instance we entered from (canvas enter only)
let _editingParentCid = null; // parent circuit id of that instance
let _nid=1,_wid=1,_did=1000;
const nid=()=>'n'+(++_nid);
const wid=()=>'w'+(++_wid);
const did=()=>'d'+(++_did);

function addDef(d){ blockDefs[d.id]=d; }
function makeCircuit(id,name){
  circuits[id]={id,name,nodes:{},wires:{}};
  return circuits[id];
}

function initBuiltins(){
  // All built-in nodes are registered via registerNode() in nodes/node-*.js.
  // initRegisteredNodes() calls addDef() for each, spreading descriptor flags into the def.
  initRegisteredNodes();
}

// ── Effective bits for an IO node (stored per-instance) ──
function nodeBits(node){
  const def=blockDefs[node.defId];
  if(!def?.isIO) return null;
  return node._bits||def.ioBits||1;
}

// ── Place node ──
function addNode(cid,defId,x,y,label,opts={}){
  const def=blockDefs[defId]; if(!def) return null;
  const id=nid();
  const pv={};
  const desc=_nodeRegistry[defId];
  const bits=opts.bits||(def.isIO?def.ioBits:null)||desc?.defaultBits||1;
  const wireColor=(def.isIO&&def.ioDir==='in')?nextIOColor():null;
  const tmpNode={defId,_bits:bits,_laSampleMode:'clk'};
  getNodePorts(tmpNode,def).forEach(p=>pv[p.id]=null);
  const node={id,defId,x,y,label:label||def.name,portValues:pv,_value:0,_dispFmt:'dec',wireColor,_bits:bits};
  nodeInitHook(node, def, opts);
  circuits[cid].nodes[id]=node;
  nodeAddedHook(node, def, cid);
  simulate(cid);
  return node;
}

// ── Change bus width on an existing IO node ──
function setNodeBits(cid,nodeId,bits){
  const c=circuits[cid]; const node=c.nodes[nodeId]; if(!node) return;
  const def=blockDefs[node.defId]; if(!def?.isIO) return;
  bits=Math.max(1,Math.min(8,bits));
  node._bits=bits; node._value=0;
  // Disconnect stale wires (port width changed)
  Object.keys(c.wires).forEach(wi=>{const w=c.wires[wi];if(w.fromNode===nodeId||w.toNode===nodeId)delete c.wires[wi];});
  simulate(cid); updatePropPanel();
}
// ── Clock ticker registry ──

// Returns every circuit — both top-level and those embedded in custom block defs
function allCircuits(){
  const all={...circuits};
  Object.values(blockDefs).forEach(def=>{
    if(def.circuit&&!all[def.circuit.id]) all[def.circuit.id]=def.circuit;
  });
  return all;
}


function removeNode(cid,nid){
  const c=circuits[cid];
  const node=c.nodes[nid];
  if(node){ const def=blockDefs[node.defId]; nodeRemovedHook(node, def, cid); }
  delete c.nodes[nid];
  Object.keys(c.wires).forEach(wi=>{const w=c.wires[wi];if(w.fromNode===nid||w.toNode===nid)delete c.wires[wi];});
  simulate(cid);
}
function addWire(cid,fn,fp,tn,tp){
  const c=circuits[cid];
  // only one driver per input port
  Object.keys(c.wires).forEach(wi=>{const w=c.wires[wi];if(w.toNode===tn&&w.toPort===tp)delete c.wires[wi];});
  const id=wid();
  c.wires[id]={id,fromNode:fn,fromPort:fp,toNode:tn,toPort:tp};
  simulate(cid); return c.wires[id];
}
function removeWire(cid,wid){delete circuits[cid].wires[wid];simulate(cid);}

// ── Hex color utilities ──
