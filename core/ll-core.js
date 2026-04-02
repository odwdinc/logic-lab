// Logic Lab

//  FIT VIEW / MODAL / SAVE / LOAD
// ═══════════════════════════════════════════════════════════════

function fitView(){
  const c=circuits[currentCircuitId]; const nodes=Object.values(c.nodes);
  if(!nodes.length){vpX=0;vpY=0;vpScale=1;render();return;}
  let mx=Infinity,my=Infinity,Mx=-Infinity,My=-Infinity;
  nodes.forEach(n=>{const g=nodeGeom(n);mx=Math.min(mx,g.x-24);my=Math.min(my,g.y-24);Mx=Math.max(Mx,g.x+g.w+24);My=Math.max(My,g.y+g.h+24);});
  const sx=canvasW/(Mx-mx),sy=canvasH/(My-my);
  vpScale=Math.max(0.15,Math.min(2,Math.min(sx,sy)*0.88));
  vpX=mx-(canvasW/vpScale-(Mx-mx))/2; vpY=my-(canvasH/vpScale-(My-my))/2; render();
}

let _modalOk=null;
function openModal(title,desc,okFn,okLabel='OK'){
  document.getElementById('modal-title').textContent=title;
  document.getElementById('modal-desc').textContent=desc;
  document.getElementById('modal-ok').textContent=okLabel;
  _modalOk=okFn; document.getElementById('modal-backdrop').classList.add('open');
}
function _closeModal(){
  document.getElementById('modal-backdrop').classList.remove('open');
  document.getElementById('modal-body').innerHTML='';
}
document.getElementById('modal-cancel').onclick=_closeModal;
document.getElementById('modal-backdrop').onclick=e=>{if(e.target===document.getElementById('modal-backdrop'))_closeModal();};
document.getElementById('modal-ok').onclick=()=>{if(_modalOk)_modalOk();_closeModal();};

const LS_KEY='logiclab_project';

function projectSnapshot(){
  return {
    v:3, circuits, currentCircuitId, editStack,
    _nid,_wid,_did,_colorIdx,
    customDefs:Object.values(blockDefs).filter(d=>!d.isBuiltin)
  };
}

function autosave(){
  try{
    const data=projectSnapshot();
    const safe=JSON.parse(JSON.stringify(data, (k,v)=>typeof v==='function'?undefined:v));
    localStorage.setItem(LS_KEY, JSON.stringify(safe));
    // Flash the save dot
    const dot=document.getElementById('save-dot');
    if(dot){ dot.style.background='#4ecb8d'; setTimeout(()=>dot.style.background='#27ae60',600); }
  } catch(e){ console.warn('Autosave failed:',e); }
}

function restoreProject(d){
  Object.keys(blockDefs).forEach(k=>delete blockDefs[k]); initBuiltins();
  (d.customDefs||[]).forEach(def=>{
    blockDefs[def.id]=def;
    if(def.circuit) def.logic=(inp,inst)=>simulateCompositeInline(def.id,inp,inst);
  });
  Object.keys(circuits).forEach(k=>delete circuits[k]);
  Object.assign(circuits,d.circuits);
  currentCircuitId=d.currentCircuitId||'main';
  editStack=d.editStack||['main'];
  _nid=d._nid||100;_wid=d._wid||100;_did=d._did||1000;_colorIdx=d._colorIdx||0;
  selNodeId=null; selNodeIds.clear(); _editingDefId=null;
  rebuildLibrary(); updateBreadcrumb(); updateTopBarButtons();
  simulate(currentCircuitId);
  syncTimers();
  // Defer fitView until canvas has been sized by the browser
  setTimeout(()=>{ resizeCanvas(); fitView(); }, 80);
}

function saveProject(){
  const data=projectSnapshot();
  const json=JSON.stringify(data, (k,v)=>typeof v==='function'?undefined:v);
  autosave();
  const body=document.getElementById('modal-body');
  body.innerHTML=`
    <div style="font-size:10px;color:var(--muted);margin-bottom:8px">
      Project is auto-saved to browser storage. Use the JSON below to back up externally or share.
    </div>
    <textarea class="prop-input" style="height:90px;font-size:10px" readonly>${json}</textarea>`;
  openModal('Save Project','Project saved to browser storage.',()=>{
    try{navigator.clipboard.writeText(json);}catch(_){}
    toast('Copied to clipboard');
  },'Copy JSON');
}

function loadProject(){
  const stored=localStorage.getItem(LS_KEY);
  const body=document.getElementById('modal-body');
  body.innerHTML=`
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <button class="tb-btn primary" id="load-from-storage" style="flex:1"
        ${stored?'':'disabled style="flex:1;opacity:0.4"'}>
        ↑ Load from browser storage${stored?' ✓':'  (none)'}
      </button>
    </div>
    <div style="font-size:9px;color:var(--muted);margin-bottom:6px">— or paste JSON below —</div>
    <textarea class="prop-input" id="ljson" style="height:100px;font-size:10px"
      placeholder="Paste exported JSON here…"></textarea>`;
  openModal('Load Project','',()=>{
    const pasteVal=document.getElementById('ljson')?.value?.trim();
    if(pasteVal){
      try{
        restoreProject(JSON.parse(pasteVal));
        autosave();
        toast('Loaded from JSON');
      }catch(ex){alert('Invalid JSON: '+ex.message);}
    }
  },'Import JSON');
  // Wire the storage button
  document.getElementById('load-from-storage')?.addEventListener('click',()=>{
    if(!stored) return;
    try{
      restoreProject(JSON.parse(stored));
      document.getElementById('modal-backdrop').classList.remove('open');
      toast('Loaded from browser storage');
    }catch(ex){alert('Storage corrupt: '+ex.message);}
  });
}

// ═══════════════════════════════════════════════════════════════
//  KEYBOARD
// ═══════════════════════════════════════════════════════════════

document.addEventListener('keydown',e=>{
  if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT') return;
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();
    if(selNodeIds.size>0){
      selNodeIds.forEach(id=>removeNode(currentCircuitId,id));
      selNodeIds.clear();selNodeId=null;updatePropPanel();
    } else if(selNodeId){removeNode(currentCircuitId,selNodeId);selNodeId=null;updatePropPanel();}
  }
  if((e.ctrlKey||e.metaKey)&&e.key==='s'){e.preventDefault();
    if(_editingDefId) commitBlockUpdate();
    else { autosave(); toast('Saved'); }
  }
  if((e.ctrlKey||e.metaKey)&&e.key==='o'){e.preventDefault();loadProject();}
  if(e.key==='f'||e.key==='F') fitView();
  if(e.key==='Escape'){wireStart=null;dragMode=null;
    if(editStack.length>1){
      exitToCircuit(editStack[editStack.length-2]);
    } else {
      // If we're at the root of a block edit, go back to main
      if(_editingDefId&&circuits['main']){
        editStack=['main']; currentCircuitId='main'; _editingDefId=null;
        updateBreadcrumb(); updateTopBarButtons(); simulate('main'); fitView(); updatePropPanel();
      }
    }
    render();
  }
});

// ═══════════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════════

let _tt;
function toast(msg){
  const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');
  clearTimeout(_tt);_tt=setTimeout(()=>el.classList.remove('show'),2500);
}

// ═══════════════════════════════════════════════════════════════
//  BUTTONS
// ═══════════════════════════════════════════════════════════════

document.getElementById('btn-save-block').onclick=openSaveAsBlock;
document.getElementById('btn-update-block').onclick=commitBlockUpdate;

document.getElementById('btn-toggle-blocks').onclick=()=>{
  const lp=document.getElementById('left-panel');
  lp.classList.toggle('collapsed');
  resizeCanvas();
};

document.getElementById('btn-rename-circuit').onclick=()=>{
  const cid=currentCircuitId;
  const cur=circuits[cid]?.name||cid;
  document.getElementById('modal-body').innerHTML=`
    <div class="mf"><label>CIRCUIT NAME</label>
      <input id="rename-circuit-inp" class="prop-input" value="${cur.replace(/"/g,'&quot;')}" maxlength="30" autofocus></div>`;
  openModal('Rename Circuit','',()=>{
    const v=document.getElementById('rename-circuit-inp')?.value?.trim();
    if(v&&circuits[cid]){
      circuits[cid].name=v;
      const def=Object.values(blockDefs).find(d=>d.circuit?.id===cid);
      if(def) def.name=v;
      updateBreadcrumb(); rebuildLibrary(); autosave();
      toast('Renamed to "'+v+'"');
    }
  },'Rename');
  setTimeout(()=>{ const el=document.getElementById('rename-circuit-inp'); if(el){el.select();} },50);
};
document.getElementById('btn-new-circuit').onclick=()=>{
  const existing=topLevelCircuits().map(c=>c.name);
  let n=1; while(existing.includes('circuit_'+n)) n++;
  const defaultName='circuit_'+n;
  document.getElementById('modal-body').innerHTML=`
    <div class="mf"><label>CIRCUIT NAME</label>
      <input id="new-cid-name" class="prop-input" value="${defaultName}" maxlength="30"
        style="margin-top:4px" autofocus></div>`;
  openModal('New Circuit','Name your new blank circuit.',()=>{
    const name=(document.getElementById('new-cid-name')?.value||defaultName).trim();
    if(!name) return;
    const cid='c_'+Date.now();
    makeCircuit(cid,name);
    switchToCircuit(cid);
    autosave();
    toast('New circuit: '+name);
  },'Create');
  setTimeout(()=>document.getElementById('new-cid-name')?.select(),50);
};
document.getElementById('btn-save-project').onclick=saveProject;
document.getElementById('btn-load-project').onclick=loadProject;
document.getElementById('btn-load-demo').onclick=()=>{
  openModal('Load Demo','This will add the demo projects.',()=>{
    loadDemo();
  },'Load Demo');
};

// File menu toggle
(function(){
  const btn=document.getElementById('btn-file-menu');
  const drop=document.getElementById('file-dropdown');
  btn.onclick=e=>{e.stopPropagation();drop.classList.toggle('open');};
  document.addEventListener('click',()=>drop.classList.remove('open'));
  // Close dropdown when any item inside is clicked
  drop.addEventListener('click',()=>drop.classList.remove('open'));
})();
document.getElementById('btn-bus-vals').onclick=()=>{
  showBusValues=!showBusValues;
  const btn=document.getElementById('btn-bus-vals');
  btn.style.opacity=showBusValues?'1':'0.45';
  render();
};

// ── Right panel resize drag ──
(()=>{
  const handle=document.getElementById('right-panel-resize');
  const panel=document.getElementById('right-panel');
  let dragging=false, startX=0, startW=0;

  handle.addEventListener('mousedown',e=>{
    if(e.button!==0) return;
    dragging=true; startX=e.clientX; startW=panel.offsetWidth;
    handle.classList.add('dragging');
    document.body.style.cursor='col-resize';
    document.body.style.userSelect='none';
    e.preventDefault();
  });
  document.addEventListener('mousemove',e=>{
    if(!dragging) return;
    const dx=startX-e.clientX;
    const newW=Math.max(160,Math.min(600,startW+dx));
    panel.dataset.savedWidth=newW;
    if(panel.dataset.visible==='1') panel.style.width=newW+'px';
    resizeCanvas();
  });
  document.addEventListener('mouseup',()=>{
    if(!dragging) return;
    dragging=false;
    handle.classList.remove('dragging');
    document.body.style.cursor='';
    document.body.style.userSelect='';
  });
})();

// ═══════════════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════════════

function loadDemo(){
  runDemos();
  const firstDemo=Object.keys(circuits).find(id=>id!=='main');
  if(firstDemo) switchToCircuit(firstDemo);
  toast('Demo loaded');
}

function init(){
  initBuiltins(); makeCircuit('main','main');
  currentCircuitId='main'; editStack=['main'];
  const stored=localStorage.getItem(LS_KEY);
  if(stored){
    try{
      window.addEventListener('resize',resizeCanvas);
      restoreProject(JSON.parse(stored));
      toast('Project restored');
      return;
    } catch(e){ console.warn('Failed to restore:',e); }
  }
  loadDemo();
  resizeCanvas(); window.addEventListener('resize',resizeCanvas);
}

init();
