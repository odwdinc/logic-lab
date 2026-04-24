// Logic Lab - Undo / Redo

let _undoStack = [], _redoStack = [];
const _UNDO_LIMIT = 50;

function _snapForUndo() {
  const d = projectSnapshot();
  return JSON.parse(JSON.stringify(d, (k,v) => typeof v === 'function' ? undefined : v));
}

function _applySnap(d) {
  Object.keys(blockDefs).forEach(k => delete blockDefs[k]); initBuiltins();
  (d.customDefs||[]).forEach(def => {
    blockDefs[def.id] = def;
    if(def.circuit) def.logic = (inp,inst) => simulateCompositeInline(def.id, inp, inst);
  });
  Object.keys(circuits).forEach(k => delete circuits[k]);
  Object.assign(circuits, d.circuits);
  currentCircuitId = d.currentCircuitId || 'main';
  editStack = d.editStack || ['main'];
  _nid = d._nid || 100; _wid = d._wid || 100; _did = d._did || 1000; _colorIdx = d._colorIdx || 0;
  selNodeId = null; selNodeIds.clear(); _editingDefId = null;
  rebuildLibrary(); updateBreadcrumb(); updateTopBarButtons();
  simulate(currentCircuitId);
  syncTimers();
  render();
  _refreshUndoButtons();
}

// Replace the stub defined in ll-state.js
pushUndo = function() {
  _undoStack.push(_snapForUndo());
  if(_undoStack.length > _UNDO_LIMIT) _undoStack.shift();
  _redoStack = [];
  _refreshUndoButtons();
};

function undo() {
  if(!_undoStack.length) { toast('Nothing to undo'); return; }
  _redoStack.push(_snapForUndo());
  _applySnap(_undoStack.pop());
  toast('Undo');
}

function redo() {
  if(!_redoStack.length) { toast('Nothing to redo'); return; }
  _undoStack.push(_snapForUndo());
  _applySnap(_redoStack.pop());
  toast('Redo');
}

function _refreshUndoButtons() {
  const u = document.getElementById('btn-undo');
  const r = document.getElementById('btn-redo');
  if(u) { u.disabled = !_undoStack.length; u.style.opacity = _undoStack.length ? '1' : '0.4'; }
  if(r) { r.disabled = !_redoStack.length; r.style.opacity = _redoStack.length ? '1' : '0.4'; }
}

// Set initial button state
_refreshUndoButtons();
