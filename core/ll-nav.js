// Logic Lab

//  NAVIGATION
// ═══════════════════════════════════════════════════════════════

function enterBlock(defId, fromNodeId, fromCid){
  const def=blockDefs[defId]; if(!def?.circuit) return;
  editStack.push(def.circuit.id);
  currentCircuitId=def.circuit.id;
  _editingDefId=defId;
  _editingNodeId=fromNodeId||null;
  _editingParentCid=fromCid||null;

  // If entered from a placed instance, feed current parent input values into
  // the block's internal INPUT IO nodes so they reflect live circuit state
  if(fromNodeId&&fromCid){
    const parentNode=circuits[fromCid]?.nodes[fromNodeId];
    if(parentNode){
      feedLiveInputsToBlock(def, parentNode, fromCid);
    }
  }

  selNodeId=null; updateBreadcrumb(); updateTopBarButtons();
  setTimeout(fitView,50); render(); updatePropPanel();
}

// Feed the parent node's current port values AND wire colors into the block's internal IO inputs
function feedLiveInputsToBlock(def, parentNode, parentCid){
  const ic=circuits[def.circuit.id]||def.circuit; if(!ic) return;
  def.ports.filter(p=>p.dir==='in').forEach(p=>{
    const val=parentNode.portValues[p.id]??null;
    const ioNode=Object.values(ic.nodes).find(n=>n._ioPortId===p.id);
    if(ioNode){
      ioNode._value=val??0;
      ioNode._liveFromParent=true;
      // Derive wire color AND lane colors from whatever feeds this port in the parent circuit
      if(parentCid){
        const lanes=portLaneColors(parentCid, parentNode.id, p.id);
        const srcColor=lanes.find(c=>c)||portWireColor(parentCid, parentNode.id, p.id);
        if(srcColor!==undefined) ioNode._savedWireColor=ioNode.wireColor;
        ioNode.wireColor=srcColor||ioNode._savedWireColor||ioNode.wireColor;
        // Store lane colors if there's variation (multi-bit bus from BITS_TO_BUS etc.)
        if(lanes.length>1&&lanes.some(c=>c&&c!==lanes[0])){
          ioNode._savedLaneColors=ioNode._laneColors;
          ioNode._laneColors=lanes;
        }
      }
    }
  });
  simulate(def.circuit.id);
}

// Clear live parent feeds when exiting
function clearLiveInputFeeds(def){
  if(!def?.circuit) return;
  const ic=circuits[def.circuit.id]||def.circuit; if(!ic) return;
  Object.values(ic.nodes).forEach(n=>{
    const nd=blockDefs[n.defId];
    delete n._liveFromParent;
    // Reset INPUT IO node _value to 0 — live preview set it to parent values,
    // but now the parent drives it via simulateCompositeInline inputMap each tick
    if(nd?.isIO&&nd.ioDir==='in'){
      n._value=0;
      n.portValues['out']=null; // let next simulateCompositeInline feed it correctly
    }
    if(n._savedWireColor!==undefined){
      n.wireColor=n._savedWireColor;
      delete n._savedWireColor;
    }
    if(n._savedLaneColors!==undefined){
      n._laneColors=n._savedLaneColors;
      delete n._savedLaneColors;
    } else {
      delete n._laneColors;
    }
  });
}

// Open a custom block for editing directly from the library (double-click)
function editBlockFromLibrary(defId){
  const def=blockDefs[defId]; if(!def?.circuit) return;
  // Clear live feeds from whatever was previously being edited
  if(_editingDefId) clearLiveInputFeeds(blockDefs[_editingDefId]);
  // Also always clear on the target def itself (may have been canvas-entered before)
  clearLiveInputFeeds(def);
  editStack=[def.circuit.id];
  currentCircuitId=def.circuit.id;
  _editingDefId=defId;
  _editingNodeId=null;
  _editingParentCid=null;
  selNodeId=null; updateBreadcrumb(); updateTopBarButtons();
  setTimeout(fitView,50); render(); updatePropPanel();
  toast(`Editing "${def.name}" — use Update Block to save changes`);
}

function exitToCircuit(cid){
  const i=editStack.indexOf(cid); if(i<0) return;
  // Clear live feeds from the block we're leaving
  if(_editingDefId) clearLiveInputFeeds(blockDefs[_editingDefId]);
  editStack=editStack.slice(0,i+1);
  currentCircuitId=cid;
  _editingDefId=findEditingDefForCircuit(cid);
  _editingNodeId=null;
  _editingParentCid=null;
  selNodeId=null; updateBreadcrumb(); updateTopBarButtons();
  simulate(cid); fitView(); updatePropPanel();
}

// Find which custom blockDef owns a given circuitId (if any)
function findEditingDefForCircuit(cid){
  return Object.values(blockDefs).find(d=>d.circuit?.id===cid)?.id||null;
}

// Returns the set of top-level standalone circuits (not owned by any block def)
function topLevelCircuits(){
  const blockCircuitIds=new Set(Object.values(blockDefs).filter(d=>d.circuit).map(d=>d.circuit.id));
  return Object.values(circuits).filter(c=>!blockCircuitIds.has(c.id));
}

function closeCircuit(cid){
  if(cid==='main'){toast('Cannot close main circuit');return;}
  const tabs=topLevelCircuits();
  if(tabs.length<=1){toast('Cannot close the last circuit');return;}
  // Switch away first if this is active
  if(currentCircuitId===cid||editStack[0]===cid){
    const other=tabs.find(c=>c.id!==cid);
    editStack=[other.id]; currentCircuitId=other.id; _editingDefId=null;
    selNodeId=null;
  }
  delete circuits[cid];
  updateBreadcrumb(); updateTopBarButtons(); render(); updatePropPanel(); autosave();
}

function switchToCircuit(cid){
  if(editStack[0]===cid&&_editingDefId===null) return; // already there, not in block edit
  editStack=[cid]; currentCircuitId=cid; _editingDefId=null;
  selNodeId=null;
  updateBreadcrumb(); updateTopBarButtons(); simulate(cid); fitView(); updatePropPanel();
}

function updateBreadcrumb(){
  const tabs=document.getElementById('circuit-tabs');
  const crumbs=document.getElementById('bc-crumbs');
  tabs.innerHTML=''; crumbs.innerHTML='';

  // ── Tab bar: one tab per top-level standalone circuit ──
  topLevelCircuits().forEach(c=>{
    const isActive=editStack[0]===c.id;
    const tab=document.createElement('div');
    tab.className='ctab'+(isActive?' active':'')+(isActive&&_editingDefId?' editing':'');
    tab.title=c.name;

    const label=document.createElement('span');
    label.textContent=c.name;
    label.style.maxWidth='100px';
    label.style.overflow='hidden';
    label.style.textOverflow='ellipsis';
    tab.appendChild(label);

    // Close button (not shown for last tab or main)
    const tops=topLevelCircuits();
    if(tops.length>1){
      const x=document.createElement('span');
      x.className='ctab-close'; x.textContent='×'; x.title='Close';
      x.onclick=e=>{e.stopPropagation();closeCircuit(c.id);};
      tab.appendChild(x);
    }

    tab.onclick=()=>switchToCircuit(c.id);
    tabs.appendChild(tab);
  });

  // ── Breadcrumb crumbs: only shown when inside a block edit ──
  if(!_editingDefId) return;
  const arr0=document.createElement('span'); arr0.className='bc-arrow'; arr0.textContent='›';
  crumbs.appendChild(arr0);

  editStack.forEach((cid,i)=>{
    if(i>0){const a=document.createElement('span');a.className='bc-arrow';a.textContent='›';crumbs.appendChild(a);}
    const s=document.createElement('span');
    s.className='bc-item'+(i===editStack.length-1?' active':'');
    const def=findEditingDefForCircuit(cid);
    s.textContent=def?blockDefs[def].name:(circuits[cid]?.name||cid);
    if(def&&i===editStack.length-1){
      s.style.color='#f0a940'; s.style.cursor='default';
    } else {
      s.onclick=()=>{if(i<editStack.length-1)exitToCircuit(cid);};
    }
    crumbs.appendChild(s);
  });
}

// Show/hide "Update Block" vs "Save as Block" button depending on edit mode
function updateTopBarButtons(){
  const btnSave=document.getElementById('btn-save-block');
  const btnUpdate=document.getElementById('btn-update-block');
  if(_editingDefId&&blockDefs[_editingDefId]){
    btnSave.style.display='none';
    btnUpdate.style.display='flex';
    btnUpdate.textContent='⟳ Update "'+blockDefs[_editingDefId].name+'"';
  } else {
    btnSave.style.display='flex';
    btnUpdate.style.display='none';
  }
}

// ── Delete a custom block def and remove all its instances ──
function deleteCustomDef(defId){
  const def=blockDefs[defId]; if(!def||def.isBuiltin) return;
  // Count instances across all circuits
  let uses=0;
  Object.values(circuits).forEach(c=>{
    Object.values(c.nodes).forEach(n=>{ if(n.defId===defId) uses++; });
  });
  const msg=uses>0
    ? `Remove ${uses} placed instance${uses>1?'s':''} too.`
    : `No placed instances.`;

  document.getElementById('modal-body').innerHTML=`
    <div style="font-size:12px;color:var(--text);margin-bottom:8px">
      Delete block <span style="color:${def.color};font-weight:700">${def.name}</span>?
    </div>
    <div style="font-size:11px;color:var(--muted)">${msg}</div>`;
  openModal('Delete Block','This cannot be undone.',()=>{
    // Snapshot node ids before mutating (avoid mid-loop deletion bugs)
    Object.values(circuits).forEach(c=>{
      const toDelete=Object.keys(c.nodes).filter(nid=>c.nodes[nid].defId===defId);
      toDelete.forEach(nid=>removeNode(c.id,nid));
    });
    if(def.circuit) delete circuits[def.circuit.id];
    delete blockDefs[defId];
    if(_editingDefId===defId){
      editStack=['main']; currentCircuitId='main'; _editingDefId=null;
      updateBreadcrumb(); updateTopBarButtons();
    }
    selNodeId=null;
    rebuildLibrary(); simulate(currentCircuitId); autosave();
    toast(`"${def.name}" deleted`);
  },'Delete');
}
// Rebuilds ports from IO nodes, patches all uses in every circuit.
function commitBlockUpdate(){
  const defId=_editingDefId; if(!defId) return;
  const def=blockDefs[defId]; if(!def?.circuit) return;
  const c=def.circuit;

  const inNodes=Object.values(c.nodes).filter(n=>{const d=blockDefs[n.defId];return d?.isIO&&d.ioDir==='in';}).sort((a,b)=>a.y-b.y);
  const outNodes=Object.values(c.nodes).filter(n=>{const d=blockDefs[n.defId];return d?.isIO&&d.ioDir==='out';}).sort((a,b)=>a.y-b.y);

  // Rebuild ports — reuse existing stable _ioPortId, assign new UUID only for new nodes
  const newPorts=[];
  inNodes.forEach((n,i)=>{
    const portId=n._ioPortId||('p_'+did());
    newPorts.push({id:portId,name:n.label||('IN'+i),dir:'in',bits:n._bits||1});
    n._ioPortId=portId;
  });
  outNodes.forEach((n,i)=>{
    const portId=n._ioPortId||('p_'+did());
    newPorts.push({id:portId,name:n.label||('OUT'+i),dir:'out',bits:n._bits||1});
    n._ioPortId=portId;
    if(!n.wireColor) n.wireColor=portWireColor(currentCircuitId,n.id,'a')||nextIOColor();
  });

  // Patch the def in place — keep def.circuit pointing at the LIVE circuit object
  // so simulateCompositeInline always uses current state
  def.ports=newPorts;
  def.circuit=circuits[c.id]||c; // live reference, not a clone
  // Rebuild logic fn
  def.logic=(inp)=>simulateCompositeInline(defId,inp);

  // ── Propagate: find every use of this block across all circuits and re-simulate ──
  // Any circuit containing a node of this defId needs fresh port value maps
  Object.values(circuits).forEach(circ=>{
    Object.values(circ.nodes).forEach(node=>{
      if(node.defId===defId){
        // Reset port values to match new port list
        const pv={};
        newPorts.forEach(p=>pv[p.id]=node.portValues?.[p.id]??null);
        node.portValues=pv;
        // Remove wires connected to ports that no longer exist
        Object.keys(circ.wires).forEach(wi=>{
          const w=circ.wires[wi];
          const fromOk=w.fromNode!==node.id||(newPorts.find(p=>p.id===w.fromPort&&p.dir==='out'));
          const toOk=w.toNode!==node.id||(newPorts.find(p=>p.id===w.toPort&&p.dir==='in'));
          if(!fromOk||!toOk) delete circ.wires[wi];
        });
      }
    });
  });

  // Re-simulate all circuits to propagate the changes
  Object.keys(circuits).forEach(cid=>{ try{ simulate(cid); }catch(_){} });

  rebuildLibrary();
  render();
  syncTimers();
  autosave();
  toast(`"${def.name}" updated — all uses refreshed`);
}

// ═══════════════════════════════════════════════════════════════
