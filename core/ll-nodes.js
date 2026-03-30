// Logic Lab — Node Registration System
// Each node calls registerNode(descriptor) from its own file in nodes/.
// The engine queries these descriptors for all node-type-specific behaviour.

const _nodeRegistry = {};

function registerNode(desc) {
  if (!desc.id) throw new Error('registerNode: missing id');
  _nodeRegistry[desc.id] = desc;
}

// Called by core after restore/init — each descriptor syncs its own timers
function syncTimers() {
  Object.values(_nodeRegistry).forEach(desc => {
    if (desc.syncTimers) desc.syncTimers();
  });
}

// Called by loadDemo() — runs each descriptor's demo() in registry (load) order
function runDemos() {
  Object.values(_nodeRegistry).forEach(desc => {
    if (desc.demo) desc.demo();
  });
}

// Called during initBuiltins() — registers each node's addDef() call
function initRegisteredNodes() {
  Object.values(_nodeRegistry).forEach(desc => {
    addDef({
      id:          desc.id,
      name:        desc.name,
      color:       desc.color,
      isBuiltin:   true,
      // flags — spread all descriptor flags into the def
      ...desc.flags,
      ports:       desc.ports || [],
      logic:       desc.logic || (()=>({})),
    });
  });
}

// Called by addNode() after creating the node object
function nodeInitHook(node, def, opts) {
  const desc = _nodeRegistry[def.id];
  if (desc?.initNode) desc.initNode(node, opts);
}

// Dynamic port list — returns descriptor's getPorts if defined, else def.ports
function getDescPorts(node, def) {
  const desc = _nodeRegistry[def.id];
  if (desc?.getPorts) return desc.getPorts(node);
  return null; // fall through to legacy getNodePorts()
}

// Geometry override — returns descriptor's getGeom result if defined
function getDescGeom(node, def) {
  const desc = _nodeRegistry[def.id];
  if (desc?.getGeom) return desc.getGeom(node, def);
  return null; // fall through to legacy nodeGeom()
}

// Custom draw — returns true if the descriptor handled drawing
function drawDescNode(g, node, def, isSel, isHov) {
  const desc = _nodeRegistry[def.id];
  if (desc?.draw) { desc.draw(g, node, def, isSel, isHov); return true; }
  return false;
}

// Props panel HTML — returns HTML string or '' if none
function getDescPropsHTML(node, def, effectiveBits) {
  const desc = _nodeRegistry[def.id];
  if (desc?.getPropsHTML) return desc.getPropsHTML(node, def, effectiveBits);
  return '';
}

// Props panel event binding
function bindDescProps(node, def, cid) {
  const desc = _nodeRegistry[def.id];
  if (desc?.bindProps) desc.bindProps(node, def, cid);
}

// Live patch (clock tick updates to props panel readouts)
function patchDescLive(node, def) {
  const desc = _nodeRegistry[def.id];
  if (desc?.patchLive) desc.patchLive(node, def);
}

// Lifecycle — called by addNode() after node is inserted into the circuit
function nodeAddedHook(node, def, cid) {
  const desc = _nodeRegistry[def.id];
  if (desc?.onAdded) desc.onAdded(node, cid);
}

// Lifecycle — called by removeNode() before the node is deleted
function nodeRemovedHook(node, def, cid) {
  const desc = _nodeRegistry[def.id];
  if (desc?.onRemoved) desc.onRemoved(node, cid);
}

// Resize — returns true if the descriptor handled the resize (skip default logic)
function descApplyResize(node, def, handleId, snap, dx, dy) {
  const desc = _nodeRegistry[def.id];
  if (desc?.applyResize) { desc.applyResize(node, handleId, snap, dx, dy); return true; }
  return false;
}

// Cell hover hit-test — returns true if (wx,wy) is over a clickable cell of any node
function descHitCell(wx, wy) {
  const c = circuits[currentCircuitId]; if (!c) return false;
  for (const node of Object.values(c.nodes)) {
    const desc = _nodeRegistry[node.defId];
    if (desc?.hitCell && desc.hitCell(wx, wy, node)) return true;
  }
  return false;
}

// Cell click handler — calls desc.clickCell on the hit node, returns true if handled
function descClickCell(node, wx, wy, cid) {
  const desc = _nodeRegistry[node.defId];
  return desc?.clickCell ? !!desc.clickCell(node, wx, wy, cid) : false;
}

// Thumbnail — true if this node type renders itself inside block thumbnails
function descHasThumbnail(def) {
  return !!_nodeRegistry[def.id]?.drawThumbnail;
}

// Thumbnail — draw the node's thumbnail representation
function descDrawThumbnail(g, node, def) {
  const desc = _nodeRegistry[def.id];
  if (desc?.drawThumbnail) desc.drawThumbnail(g, node, def);
}
