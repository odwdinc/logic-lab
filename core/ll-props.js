// Logic Lab

//  PROPERTIES PANEL
// ═══════════════════════════════════════════════════════════════

// Safe version: skips full rebuild if user is typing in the prop panel.
// Only patches the live read-only elements (port values, clock phase).
function updatePropPanelIfSafe(){
  if(!selNodeId){updatePropPanel();return;}
  const rp=document.getElementById('right-panel');
  const active=document.activeElement;
  const pp=document.getElementById('prop-panel');
  if(rp.dataset.visible==='1'&&pp&&pp.contains(active)&&
    (active.tagName==='INPUT'||active.tagName==='SELECT')){
    patchPropPanelLive();
    return;
  }
  updatePropPanel();
}

// Patch only the live read-only parts of the prop panel in-place
function patchPropPanelLive(){
  if(!selNodeId) return;
  const n=circuits[currentCircuitId]?.nodes[selNodeId]; if(!n) return;
  const def=blockDefs[n.defId]; if(!def) return;

  // Update port value badges
  const allPorts=getNodePorts(n,def);
  allPorts.forEach(pd=>{
    const el=document.getElementById('pv_'+pd.id);
    if(!el) return;
    const val=n.portValues[pd.id]??null;
    const fv=fmtVal(val,pd.bits,n._dispFmt);
    const cls=val===null?'pv-z':pd.bits===1?(val?'pv-1':'pv-0'):'pv-bus';
    el.textContent=fv;
    el.className='port-val-display '+cls;
  });

  // Node-specific live patches (clock phase, analyzer status, ROM highlights)
  patchDescLive(n, def);
}

function showPropPanel(){
  const rp=document.getElementById('right-panel');
  const w=parseInt(rp.dataset.savedWidth)||196;
  rp.style.width=w+'px';
  rp.style.minWidth='160px';
  rp.style.overflow='';
  rp.style.borderLeftWidth='';
  rp.dataset.visible='1';
  resizeCanvas();
}
function hidePropPanel(){
  const rp=document.getElementById('right-panel');
  if(rp.dataset.visible==='1'&&rp.offsetWidth>0)
    rp.dataset.savedWidth=rp.offsetWidth;
  rp.style.width='0';
  rp.style.minWidth='0';
  rp.style.overflow='hidden';
  rp.style.borderLeftWidth='0';
  rp.dataset.visible='0';
  resizeCanvas();
}

function updatePropPanel(){
  const p=document.getElementById('prop-panel');
  const rp=document.getElementById('right-panel');
  const n=selNodeId&&circuits[currentCircuitId]?.nodes[selNodeId];
  if(!n){
    hidePropPanel();
    return;
  }
  showPropPanel();
  const def=blockDefs[n.defId]; if(!def) return;
  const effectiveBits=n._bits||def.ioBits||2;

  let html=`<div class="prop-title">NODE</div>
    <div class="prop-row"><div class="prop-label">TYPE</div>
      <div class="prop-val" style="color:${def.color}">${def.name}</div></div>
    <div class="prop-row"><div class="prop-label">LABEL</div>
      <input class="prop-input" id="pli" value="${(n.label||def.name).replace(/"/g,'&quot;')}" maxlength="24"></div>`;

  // ── Node-specific props — delegated to registry descriptor ──
  html += getDescPropsHTML(n, def, effectiveBits);

  const allPorts=getNodePorts(n,def);
  if(allPorts.length){
    html+=`<div class="prop-sep"></div><div class="prop-title">PORTS</div><div class="port-list">`;
    allPorts.forEach(pd=>{
      const val=n.portValues[pd.id]??null;
      const col=val===null?'#555':(pd.bits===1?(val?'#e74c3c':'#333'):'#4ecb8d');
      const fv=fmtVal(val,pd.bits,n._dispFmt);
      const cls=val===null?'pv-z':pd.bits===1?(val?'pv-1':'pv-0'):'pv-bus';
      html+=`<div class="port-entry">
        <span style="display:inline-block;width:8px;height:8px;border-radius:${pd.bits===1?'50%':'2px'};
          background:${col};flex-shrink:0"></span>
        <span class="port-entry-name">${pd.name||pd.id}</span>
        <span style="font-size:9px;color:var(--muted)">${pd.bits}b</span>
        <span id="pv_${pd.id}" class="port-val-display ${cls}">${fv}</span>
      </div>`;
    });
    html+='</div>';
  }

  if(def.circuit) html+=`<div class="prop-sep"></div>
    <button class="tb-btn" style="width:100%;justify-content:center"
      onclick="enterBlock('${def.id}')">▶ Enter</button>`;
  p.innerHTML=html;

  const _pli=document.getElementById('pli');
  if(_pli){
    _pli.addEventListener('focus',()=>pushUndo());
    _pli.addEventListener('input',e=>{n.label=e.target.value;render();});
  }

  // Node-specific event binding — delegated to registry descriptor
  bindDescProps(n, def, currentCircuitId);
}

// ═══════════════════════════════════════════════════════════════
//  LIBRARY
// ═══════════════════════════════════════════════════════════════

function rebuildLibrary(){
  const lib=document.getElementById('block-library'); lib.innerHTML='';
  const groups=[
    {title:'GATES',filter:d=>d.isBuiltin&&!d.isIO},
    {title:'I/O  (set width 1–8b)',filter:d=>d.isIO},
    {title:'CUSTOM',filter:d=>!d.isBuiltin},
  ];
  groups.forEach(g=>{
    const defs=Object.values(blockDefs).filter(g.filter); if(!defs.length) return;
    const sec=document.createElement('div'); sec.className='lib-section';
    sec.innerHTML=`<div class="lib-section-title">${g.title}</div>`;
    defs.forEach(def=>{
      const it=document.createElement('div');
      it.className='lib-item'; it.draggable=true; it.dataset.defId=def.id;
      const bgCol=def.isIO?'#142a14':def.isBuiltin?'#0e2a3a':'#2a1a3a';
      const tmpN={defId:def.id,_bits:_nodeRegistry[def.id]?.defaultBits||1};
      const allP=getNodePorts(tmpN,def);
      const inC=allP.filter(p=>p.dir==='in').length;
      const outC=allP.filter(p=>p.dir==='out').length;
      it.innerHTML=`<span class="lib-badge" style="background:${bgCol};color:${def.color}">${def.name}</span>
        <span style="font-size:9px;color:var(--muted);margin-left:auto">${inC}→${outC}</span>
        ${!def.isBuiltin?`
          <span title="Edit" style="font-size:11px;color:var(--muted);padding:1px 4px;border-radius:2px;cursor:pointer;flex-shrink:0;line-height:1" onclick="event.stopPropagation();editBlockFromLibrary('${def.id}')">✎</span>
          <span title="Delete" style="font-size:11px;color:#c0392b;padding:1px 4px;border-radius:2px;cursor:pointer;flex-shrink:0;line-height:1" onclick="event.stopPropagation();deleteCustomDef('${def.id}')">✕</span>`:''}`;
      // Double-click on custom block opens for editing
      if(!def.isBuiltin){
        it.addEventListener('dblclick',e=>{
          e.preventDefault();
          editBlockFromLibrary(def.id);
        });
        it.title='Drag to place · double-click to edit';
      }
      sec.appendChild(it);
    });
    lib.appendChild(sec);
  });
}

// ═══════════════════════════════════════════════════════════════
