// Logic Lab Node — RAM
// 256 rows × 16 banks, 8-bit ADDR + 4-bit BANK → 16 × 1-bit outputs.
// Each cell holds a 16-bit value. User-assignable output wire color.

registerNode({
  id: 'RAM', name: 'RAM', color: '#e67e22',
  flags: { isRAM: true },

  ports: [
    { id:'addr', name:'ADDR', dir:'in',  bits:8 },
    { id:'bank', name:'BANK', dir:'in',  bits:4 },
    ...Array.from({length:16}, (_,i) => ({ id:'q'+i, name:'q'+i, dir:'out', bits:1 })),
  ],

  getOutputColor(cid, node){ return node.wireColor||'#e67e22'; },

  logic(inp, n) {
    const addr = inp.addr ?? 0, bank = inp.bank ?? 0;
    const val  = (n._ram?.[addr]?.[bank]) ?? 0;
    const out  = {};
    for (let i = 0; i < 16; i++) out['q'+i] = (val >> i) & 1;
    return out;
  },

  initNode(node) {
    if (!node._ram) {
      node._ram    = Array.from({length:256}, () => new Array(16).fill(0));
      node._ramFmt = 'hex';
    }
  },

  getPropsHTML(n) {
    const addr   = n.portValues['addr'] ?? 0;
    const bank   = n.portValues['bank'] ?? 0;
    const fmt    = n._ramFmt || 'hex';
    const ramCol = n.wireColor || '#e67e22';
    return `<div class="prop-sep"></div>
      <div class="prop-row"><div class="prop-label">OUTPUT WIRE COLOR</div>
        <input type="color" id="pramcol" value="${ramCol}"
          style="width:100%;height:26px;background:#111;border:1px solid var(--border2);border-radius:3px;cursor:pointer"></div>
      <div class="prop-title">RAM CONTENTS</div>
      <div class="prop-row" style="display:flex;gap:6px;align-items:center">
        <div class="prop-label" style="margin:0">ADDR:</div>
        <span style="color:var(--accent);font-size:11px">${addr} (0x${addr.toString(16).toUpperCase().padStart(2,'0')})</span>
        <div class="prop-label" style="margin:0 0 0 8px">BANK:</div>
        <span style="color:var(--accent);font-size:11px">${bank}</span>
      </div>
      <div class="prop-row" style="display:flex;gap:4px;align-items:center">
        <div class="prop-label" style="margin:0">FORMAT</div>
        <select class="prop-input" id="pramfmt" style="flex:1">
          <option value="hex"${fmt==='hex'?' selected':''}>Hex</option>
          <option value="dec"${fmt==='dec'?' selected':''}>Decimal</option>
          <option value="bin"${fmt==='bin'?' selected':''}>Binary</option>
        </select>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:6px">
        <button class="tb-btn" id="btn-ram-export" style="flex:1;justify-content:center;font-size:10px">↓ Export CSV</button>
        <button class="tb-btn" id="btn-ram-import" style="flex:1;justify-content:center;font-size:10px">↑ Import CSV</button>
      </div>
      <div id="ram-table-wrap" style="margin-top:4px;overflow:auto;max-height:360px;
        border:1px solid var(--border);border-radius:3px;font-family:var(--font)">
        ${buildRamTableHTML(n, addr, bank, fmt)}
      </div>`;
  },

  bindProps(n, def, cid) {
    document.getElementById('pramfmt')?.addEventListener('change', e => {
      n._ramFmt = e.target.value; refreshRamTable(n);
    });
    document.getElementById('pramcol')?.addEventListener('input', e => {
      n.wireColor = e.target.value; render();
    });

    // Export CSV
    document.getElementById('btn-ram-export')?.addEventListener('click', () => {
      const fmt = n._ramFmt || 'hex';
      let csv = 'ADDR,' + Array.from({length:16}, (_,b) => 'BANK'+b).join(',') + '\n';
      for (let r = 0; r < 256; r++) {
        csv += r.toString(16).toUpperCase().padStart(2,'0') + ',';
        csv += Array.from({length:16}, (_,b) => fmtRamCell(n._ram[r][b]??0, fmt)).join(',') + '\n';
      }
      document.getElementById('modal-body').innerHTML = `
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px">Copy the CSV below.</div>
        <textarea class="prop-input" style="height:160px;font-size:9px;resize:vertical" readonly>${csv}</textarea>`;
      openModal('Export RAM CSV', '', () => {
        try { navigator.clipboard.writeText(csv); } catch(_) {}
        toast('CSV copied to clipboard');
      }, 'Copy CSV');
    });

    // Import CSV
    document.getElementById('btn-ram-import')?.addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = '.csv,text/csv,text/plain';
      inp.onchange = e => {
        const file = e.target.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          const lines = ev.target.result.trim().split('\n');
          let imported = 0;
          const start = lines[0].toUpperCase().startsWith('ADDR') ? 1 : 0;
          for (let i = start; i < lines.length && i-start < 256; i++) {
            const cols = lines[i].split(',');
            const dataStart = cols.length === 17 ? 1 : 0;
            for (let b = 0; b < 16; b++) {
              const raw = (cols[dataStart+b]||'').trim();
              if (!raw) continue;
              const v = raw.startsWith('0b') || (/^[01]+$/.test(raw) && raw.length > 4)
                ? parseInt(raw.replace('0b',''), 2)
                : raw.startsWith('0x') ? parseInt(raw, 16)
                : /^[0-9a-fA-F]+$/.test(raw) && raw.length === 4 ? parseInt(raw, 16)
                : parseInt(raw, 10);
              if (!isNaN(v)) n._ram[i-start][b] = Math.max(0, Math.min(0xFFFF, v));
            }
            imported++;
          }
          refreshRamTable(n); simulate(cid); autosave();
          toast(`Imported ${imported} rows`);
        };
        reader.readAsText(file);
      };
      inp.click();
    });

    // Cell editing
    document.getElementById('ram-table-wrap')?.addEventListener('click', e => {
      const cell = e.target.closest('td[data-row]'); if (!cell) return;
      const row = parseInt(cell.dataset.row), col = parseInt(cell.dataset.col);
      const cur = (n._ram[row][col]) ?? 0;
      const fmt = n._ramFmt || 'hex';
      const curStr = fmt==='hex' ? cur.toString(16).toUpperCase()
        : fmt==='bin' ? cur.toString(2).padStart(16,'0') : cur.toString();
      document.getElementById('modal-body').innerHTML = `
        <div class="mf"><label>ROW ${row} · BANK ${col} — value (${fmt})</label>
          <input id="ram-cell-inp" class="prop-input" value="${curStr}" maxlength="20" autofocus
            style="font-family:var(--font);letter-spacing:0.05em"></div>`;
      openModal(`Edit RAM[${row}][${col}]`, '', () => {
        const raw = document.getElementById('ram-cell-inp')?.value?.trim() || '0';
        let v = fmt==='hex' ? parseInt(raw,16) : fmt==='bin' ? parseInt(raw,2) : parseInt(raw,10);
        if (isNaN(v)) v = 0;
        n._ram[row][col] = Math.max(0, Math.min(0xFFFF, v));
        refreshRamTable(n); simulate(cid); autosave();
      }, 'Set');
    });
  },

  patchLive(n) {
    refreshRamTable(n);
  },

  demo(){
    makeCircuit('ram_demo','RAM');
    const rAddr=addNode('ram_demo','INPUT',  60,  80,'ADDR',{bits:8}); rAddr._value=0;
    const rBank=addNode('ram_demo','INPUT',  60, 190,'BANK',{bits:4}); rBank._value=0;
    const rRAM =addNode('ram_demo','RAM',   260, 130,'RAM');
    rRAM._ram[0][0]=0xAB; rRAM._ram[1][0]=0xCD; rRAM._ram[2][0]=0xEF;
    const rO0=addNode('ram_demo','OUTPUT',520, 80,'q0');
    const rO1=addNode('ram_demo','OUTPUT',520,150,'q1');
    const rO2=addNode('ram_demo','OUTPUT',520,220,'q2');
    const rO3=addNode('ram_demo','OUTPUT',520,290,'q3');
    addWire('ram_demo',rAddr.id,'out',rRAM.id,'addr');
    addWire('ram_demo',rBank.id,'out',rRAM.id,'bank');
    addWire('ram_demo',rRAM.id,'q0',rO0.id,'a');
    addWire('ram_demo',rRAM.id,'q1',rO1.id,'a');
    addWire('ram_demo',rRAM.id,'q2',rO2.id,'a');
    addWire('ram_demo',rRAM.id,'q3',rO3.id,'a');
  },
});

// ── RAM Table Helpers (was in ll-props.js) ──
function fmtRamCell(v, fmt){
  if(fmt==='bin') return v.toString(2).padStart(16,'0');
  if(fmt==='dec') return v.toString(10);
  return v.toString(16).toUpperCase().padStart(4,'0');
}

function buildRamTableHTML(node, activeAddr, activeBank, fmt){
  const ram=node._ram;
  const cellW=fmt==='bin'?96:fmt==='dec'?44:40;
  let h=`<table style="border-collapse:collapse;width:100%;font-size:9px;font-family:var(--font)">`;
  h+=`<tr><th style="padding:2px 4px;background:#111;position:sticky;top:0;z-index:1">ADDR</th>`;
  for(let b=0;b<16;b++) h+=`<th style="padding:2px 3px;background:#111;min-width:${cellW}px;position:sticky;top:0">B${b}</th>`;
  h+='</tr>';
  for(let r=0;r<256;r++){
    const isActiveRow=r===activeAddr;
    const bg=isActiveRow?'rgba(0,229,255,0.08)':'transparent';
    h+=`<tr style="background:${bg}">`;
    h+=`<td style="padding:2px 4px;color:${isActiveRow?'#00e5ff':'#555'};font-weight:${isActiveRow?'700':'400'}">${r.toString(16).toUpperCase().padStart(2,'0')}</td>`;
    for(let b=0;b<16;b++){
      const isActive=isActiveRow&&b===activeBank;
      const v=ram[r][b]??0;
      h+=`<td data-row="${r}" data-col="${b}" style="padding:2px 3px;cursor:pointer;text-align:right;
        color:${isActive?'#00e5ff':v?'#ccc':'#444'};
        background:${isActive?'rgba(0,229,255,0.15)':'transparent'};
        outline:${isActive?'1px solid #00e5ff55':'none'}">${fmtRamCell(v,fmt)}</td>`;
    }
    h+='</tr>';
  }
  return h+'</table>';
}

function refreshRamTable(n){
  const wrap=document.getElementById('ram-table-wrap'); if(!wrap) return;
  const addr=n.portValues['addr']??0;
  const bank=n.portValues['bank']??0;
  wrap.innerHTML=buildRamTableHTML(n,addr,bank,n._ramFmt||'hex');
}
