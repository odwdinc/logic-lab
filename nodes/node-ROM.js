// Logic Lab Node — ROM
// 256 rows × 16 banks, 8-bit ADDR + 4-bit BANK → 16 × 1-bit outputs.
// Each cell holds a 16-bit value. User-assignable output wire color.

registerNode({
  id: 'ROM', name: 'ROM', color: '#e67e22',
  flags: { isROM: true },

  ports: [
    { id:'addr', name:'ADDR', dir:'in',  bits:8 },
    { id:'bank', name:'BANK', dir:'in',  bits:4 },
    ...Array.from({length:16}, (_,i) => ({ id:'q'+i, name:'q'+i, dir:'out', bits:1 })),
  ],

  getOutputColor(cid, node){ return node.wireColor||'#e67e22'; },

  logic(inp, n) {
    const addr = inp.addr ?? 0, bank = inp.bank ?? 0;
    const val  = (n._rom?.[addr]?.[bank]) ?? 0;
    const out  = {};
    for (let i = 0; i < 16; i++) out['q'+i] = (val >> i) & 1;
    return out;
  },

  initNode(node) {
    if (!node._rom) {
      node._rom    = Array.from({length:256}, () => new Array(16).fill(0));
      node._romFmt = 'hex';
    }
  },

  getPropsHTML(n) {
    const addr   = n.portValues['addr'] ?? 0;
    const bank   = n.portValues['bank'] ?? 0;
    const fmt    = n._romFmt || 'hex';
    const romCol = n.wireColor || '#e67e22';
    return `<div class="prop-sep"></div>
      <div class="prop-row"><div class="prop-label">OUTPUT WIRE COLOR</div>
        <input type="color" id="promcol" value="${romCol}"
          style="width:100%;height:26px;background:#111;border:1px solid var(--border2);border-radius:3px;cursor:pointer"></div>
      <div class="prop-title">ROM CONTENTS</div>
      <div class="prop-row" style="display:flex;gap:6px;align-items:center">
        <div class="prop-label" style="margin:0">ADDR:</div>
        <span style="color:var(--accent);font-size:11px">${addr} (0x${addr.toString(16).toUpperCase().padStart(2,'0')})</span>
        <div class="prop-label" style="margin:0 0 0 8px">BANK:</div>
        <span style="color:var(--accent);font-size:11px">${bank}</span>
      </div>
      <div class="prop-row" style="display:flex;gap:4px;align-items:center">
        <div class="prop-label" style="margin:0">FORMAT</div>
        <select class="prop-input" id="promfmt" style="flex:1">
          <option value="hex"${fmt==='hex'?' selected':''}>Hex</option>
          <option value="dec"${fmt==='dec'?' selected':''}>Decimal</option>
          <option value="bin"${fmt==='bin'?' selected':''}>Binary</option>
        </select>
      </div>
      <div style="display:flex;gap:4px;margin-bottom:6px">
        <button class="tb-btn" id="btn-rom-export" style="flex:1;justify-content:center;font-size:10px">↓ Export CSV</button>
        <button class="tb-btn" id="btn-rom-import" style="flex:1;justify-content:center;font-size:10px">↑ Import CSV</button>
      </div>
      <div id="rom-table-wrap" style="margin-top:4px;overflow:auto;max-height:360px;
        border:1px solid var(--border);border-radius:3px;font-family:var(--font)">
        ${buildRomTableHTML(n, addr, bank, fmt)}
      </div>`;
  },

  bindProps(n, def, cid) {
    document.getElementById('promfmt')?.addEventListener('change', e => {
      n._romFmt = e.target.value; refreshRomTable(n);
    });
    document.getElementById('promcol')?.addEventListener('input', e => {
      n.wireColor = e.target.value; render();
    });

    // Export CSV
    document.getElementById('btn-rom-export')?.addEventListener('click', () => {
      const fmt = n._romFmt || 'hex';
      let csv = 'ADDR,' + Array.from({length:16}, (_,b) => 'BANK'+b).join(',') + '\n';
      for (let r = 0; r < 256; r++) {
        csv += r.toString(16).toUpperCase().padStart(2,'0') + ',';
        csv += Array.from({length:16}, (_,b) => fmtRomCell(n._rom[r][b]??0, fmt)).join(',') + '\n';
      }
      document.getElementById('modal-body').innerHTML = `
        <div style="font-size:10px;color:var(--muted);margin-bottom:6px">Copy the CSV below.</div>
        <textarea class="prop-input" style="height:160px;font-size:9px;resize:vertical" readonly>${csv}</textarea>`;
      openModal('Export ROM CSV', '', () => {
        try { navigator.clipboard.writeText(csv); } catch(_) {}
        toast('CSV copied to clipboard');
      }, 'Copy CSV');
    });

    // Import CSV
    document.getElementById('btn-rom-import')?.addEventListener('click', () => {
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
              if (!isNaN(v)) n._rom[i-start][b] = Math.max(0, Math.min(0xFFFF, v));
            }
            imported++;
          }
          refreshRomTable(n); simulate(cid); autosave();
          toast(`Imported ${imported} rows`);
        };
        reader.readAsText(file);
      };
      inp.click();
    });

    // Cell editing
    document.getElementById('rom-table-wrap')?.addEventListener('click', e => {
      const cell = e.target.closest('td[data-row]'); if (!cell) return;
      const row = parseInt(cell.dataset.row), col = parseInt(cell.dataset.col);
      const cur = (n._rom[row][col]) ?? 0;
      const fmt = n._romFmt || 'hex';
      const curStr = fmt==='hex' ? cur.toString(16).toUpperCase()
        : fmt==='bin' ? cur.toString(2).padStart(16,'0') : cur.toString();
      document.getElementById('modal-body').innerHTML = `
        <div class="mf"><label>ROW ${row} · BANK ${col} — value (${fmt})</label>
          <input id="rom-cell-inp" class="prop-input" value="${curStr}" maxlength="20" autofocus
            style="font-family:var(--font);letter-spacing:0.05em"></div>`;
      openModal(`Edit ROM[${row}][${col}]`, '', () => {
        const raw = document.getElementById('rom-cell-inp')?.value?.trim() || '0';
        let v = fmt==='hex' ? parseInt(raw,16) : fmt==='bin' ? parseInt(raw,2) : parseInt(raw,10);
        if (isNaN(v)) v = 0;
        n._rom[row][col] = Math.max(0, Math.min(0xFFFF, v));
        refreshRomTable(n); simulate(cid); autosave();
      }, 'Set');
    });
  },

  patchLive(n) {
    refreshRomTable(n);
  },

  demo(){
    makeCircuit('rom_demo','ROM');
    const rAddr=addNode('rom_demo','INPUT',  60,  80,'ADDR',{bits:8}); rAddr._value=0;
    const rBank=addNode('rom_demo','INPUT',  60, 190,'BANK',{bits:4}); rBank._value=0;
    const rROM =addNode('rom_demo','ROM',   260, 130,'ROM');
    rROM._rom[0][0]=0xAB; rROM._rom[1][0]=0xCD; rROM._rom[2][0]=0xEF;
    const rO0=addNode('rom_demo','OUTPUT',520, 80,'q0');
    const rO1=addNode('rom_demo','OUTPUT',520,150,'q1');
    const rO2=addNode('rom_demo','OUTPUT',520,220,'q2');
    const rO3=addNode('rom_demo','OUTPUT',520,290,'q3');
    addWire('rom_demo',rAddr.id,'out',rROM.id,'addr');
    addWire('rom_demo',rBank.id,'out',rROM.id,'bank');
    addWire('rom_demo',rROM.id,'q0',rO0.id,'a');
    addWire('rom_demo',rROM.id,'q1',rO1.id,'a');
    addWire('rom_demo',rROM.id,'q2',rO2.id,'a');
    addWire('rom_demo',rROM.id,'q3',rO3.id,'a');
  },
});

// ── ROM Table Helpers (was in ll-props.js) ──
function fmtRomCell(v, fmt){
  if(fmt==='bin') return v.toString(2).padStart(16,'0');
  if(fmt==='dec') return v.toString(10);
  return v.toString(16).toUpperCase().padStart(4,'0');
}

function buildRomTableHTML(node, activeAddr, activeBank, fmt){
  const rom=node._rom;
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
      const v=rom[r][b]??0;
      h+=`<td data-row="${r}" data-col="${b}" style="padding:2px 3px;cursor:pointer;text-align:right;
        color:${isActive?'#00e5ff':v?'#ccc':'#444'};
        background:${isActive?'rgba(0,229,255,0.15)':'transparent'};
        outline:${isActive?'1px solid #00e5ff55':'none'}">${fmtRomCell(v,fmt)}</td>`;
    }
    h+='</tr>';
  }
  return h+'</table>';
}

function refreshRomTable(n){
  const wrap=document.getElementById('rom-table-wrap'); if(!wrap) return;
  const addr=n.portValues['addr']??0;
  const bank=n.portValues['bank']??0;
  wrap.innerHTML=buildRomTableHTML(n,addr,bank,n._romFmt||'hex');
}
