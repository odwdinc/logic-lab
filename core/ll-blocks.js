// Logic Lab

//  CONTEXT MENU
// ═══════════════════════════════════════════════════════════════

function showCtx(cx,cy,node,wire){
  const m=document.getElementById('ctx-menu'); m.innerHTML='';
  const add=(txt,fn,cls='')=>{
    const d=document.createElement('div');d.className='ctx-item'+(cls?' '+cls:'');
    d.textContent=txt;d.onclick=()=>{m.classList.remove('open');fn();};m.appendChild(d);
  };
  const sep=()=>{const d=document.createElement('div');d.className='ctx-sep';m.appendChild(d);};
  if(node){
    const def=blockDefs[node.defId];
    add('Rename',()=>{
      document.getElementById('modal-body').innerHTML=`
        <div class="mf"><label>LABEL</label>
          <input id="rename-inp" class="prop-input" value="${(node.label||'').replace(/"/g,'&quot;')}" maxlength="24" autofocus></div>`;
      openModal('Rename Node','',()=>{
        const v=document.getElementById('rename-inp')?.value?.trim();
        if(v){node.label=v.slice(0,20);render();updatePropPanel();}
      },'Rename');
      setTimeout(()=>{ const el=document.getElementById('rename-inp'); if(el){el.select();} },50);
    });
    if(def?.isIO&&def.ioDir==='in'&&(node._bits||def.ioBits||1)>1){
      sep();
      add('Display: Dec',()=>{node._dispFmt='dec';render();updatePropPanel();});
      add('Display: Hex',()=>{node._dispFmt='hex';render();updatePropPanel();});
      add('Display: Bin',()=>{node._dispFmt='bin';render();updatePropPanel();});
    }
    if(def?.circuit) add('Enter block (dblclick)',()=>enterBlock(def.id, node.id, currentCircuitId));
    sep();
    add('Delete',()=>{removeNode(currentCircuitId,node.id);selNodeId=null;updatePropPanel();},'danger');
  } else if(wire){
    add('Delete wire',()=>removeWire(currentCircuitId,wire.id),'danger');
  } else {
    const {x:wx,y:wy}=c2w(cx,cy);
    add('AND gate',()=>addNode(currentCircuitId,'AND',Math.round(wx/10)*10,Math.round(wy/10)*10));
    add('NOT gate',()=>addNode(currentCircuitId,'NOT',Math.round(wx/10)*10,Math.round(wy/10)*10));
    add('3-State Buffer',()=>addNode(currentCircuitId,'TRIBUF',Math.round(wx/10)*10,Math.round(wy/10)*10));
    add('Input (1-bit)',()=>addNode(currentCircuitId,'INPUT',Math.round(wx/10)*10,Math.round(wy/10)*10));
    add('Output (1-bit)',()=>addNode(currentCircuitId,'OUTPUT',Math.round(wx/10)*10,Math.round(wy/10)*10));
    sep();
    add('Fit view',fitView);
  }
  m.style.left=cx+'px';m.style.top=cy+'px';
  m.classList.add('open');
}
document.addEventListener('click',()=>document.getElementById('ctx-menu').classList.remove('open'));

// ═══════════════════════════════════════════════════════════════
//  LIBRARY DRAG
// ═══════════════════════════════════════════════════════════════

let libDrag=null;
document.getElementById('block-library').addEventListener('dragstart',e=>{
  const it=e.target.closest('.lib-item'); if(!it) return;
  libDrag=it.dataset.defId; e.dataTransfer.effectAllowed='copy';
});
document.getElementById('canvas-wrap').addEventListener('dragover',e=>e.preventDefault());
document.getElementById('canvas-wrap').addEventListener('drop',e=>{
  e.preventDefault(); if(!libDrag) return;
  const r=canvas.getBoundingClientRect();
  const {x,y}=c2w(e.clientX-r.left,e.clientY-r.top);
  addNode(currentCircuitId,libDrag,Math.round(x/10)*10,Math.round(y/10)*10);
  libDrag=null; updatePropPanel();
});

// ═══════════════════════════════════════════════════════════════
//  SAVE AS BLOCK
// ═══════════════════════════════════════════════════════════════

function openSaveAsBlock(){
  const c=circuits[currentCircuitId];
  const inNodes=Object.values(c.nodes).filter(n=>{const d=blockDefs[n.defId];return d?.isIO&&d.ioDir==='in';}).sort((a,b)=>a.y-b.y);
  const outNodes=Object.values(c.nodes).filter(n=>{const d=blockDefs[n.defId];return d?.isIO&&d.ioDir==='out';}).sort((a,b)=>a.y-b.y);
  if(!inNodes.length&&!outNodes.length){toast('Add INPUT/OUTPUT nodes first');return;}

  // HTML-escape helper for use in attribute values
  const esc=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const body=document.getElementById('modal-body');
  body.innerHTML=`
    <div class="mf"><label>BLOCK NAME</label>
      <input id="def-name" class="prop-input" value="MY_GATE" maxlength="20"></div>
    <div class="mf"><label>COLOR</label>
      <input id="def-color" type="color" value="#9b59b6"
        style="width:100%;height:30px;background:#111;border:1px solid var(--border2);border-radius:3px;cursor:pointer"></div>
    <div class="mf"><label>INPUT PORTS</label>
      <div class="port-cfg-box">
        ${inNodes.map((n,i)=>`
          <div style="display:flex;align-items:center;gap:8px;padding:4px 0;
            ${i<inNodes.length-1?'border-bottom:1px solid var(--border)':''}">
            <span style="font-size:11px;color:var(--text);flex:1">${esc(n.label||('IN'+i))}</span>
            <span style="font-size:10px;color:var(--accent);background:var(--surface2);
              padding:1px 6px;border-radius:2px;font-family:var(--font)">${n._bits||1}b</span>
          </div>`).join('')}
      </div></div>
    <div class="mf"><label>OUTPUT PORTS</label>
      <div class="port-cfg-box">
        ${outNodes.map((n,i)=>`
          <div style="display:flex;align-items:center;gap:8px;padding:4px 0;
            ${i<outNodes.length-1?'border-bottom:1px solid var(--border)':''}">
            <span style="font-size:11px;color:var(--text);flex:1">${esc(n.label||('OUT'+i))}</span>
            <span style="font-size:10px;color:var(--accent);background:var(--surface2);
              padding:1px 6px;border-radius:2px;font-family:var(--font)">${n._bits||1}b</span>
          </div>`).join('')}
      </div></div>
    <div style="font-size:9px;color:var(--muted);margin-top:4px;line-height:1.6">
      To change port names or widths, edit the IO nodes inside the circuit first.
    </div>`;

  openModal('Save as Block','Name the block and confirm port names/widths.',()=>{
    const name=(document.getElementById('def-name').value||'BLOCK')
      .toUpperCase().replace(/[^A-Z0-9_]/g,'_').replace(/__+/g,'_').slice(0,20)||'BLOCK';
    const color=document.getElementById('def-color').value;
    const ports=[];

    inNodes.forEach((n,i)=>{
      // Reuse existing stable id if present, otherwise create a new UUID
      const portId=n._ioPortId||('p_'+did());
      ports.push({id:portId, name:n.label||('IN'+i), dir:'in', bits:n._bits||1});
      n._ioPortId=portId;
    });

    outNodes.forEach((n,i)=>{
      const portId=n._ioPortId||('p_'+did());
      ports.push({id:portId, name:n.label||('OUT'+i), dir:'out', bits:n._bits||1});
      n._ioPortId=portId;
      // Give OUTPUT nodes a wireColor if they don't have one — derive from what feeds them,
      // or assign a unique color so wires inside the block have a clear source
      if(!n.wireColor) n.wireColor=portWireColor(currentCircuitId,n.id,'a')||nextIOColor();
    });

    const circClone={
      id:'circ_'+did(), name,
      nodes:JSON.parse(JSON.stringify(c.nodes)),
      wires:JSON.parse(JSON.stringify(c.wires))
    };
    const defId=name+'_'+did();
    addDef({id:defId,name,color,isBuiltin:false,ports,circuit:circClone,
      logic:(inp)=>simulateCompositeInline(defId,inp)});
    circuits[circClone.id]=circClone;
    rebuildLibrary();
    toast(`"${name}" saved — drag from library to use`);
    simulate(currentCircuitId);
    syncTimers();
    autosave();
  },'Save Block');
}

// ═══════════════════════════════════════════════════════════════
