// Logic Lab Node — WEB_INPUT
// Polls a URL on a configurable interval and drives its output from the response.
//
// Expected server response (any of these work):
//   • JSON object with a "value" key  →  { "value": 42 }
//   • Plain numeric string            →  "1"
//   • Raw number in JSON              →  0
//
// The parsed number is masked to the node's bit width before driving the output.

const _webTimers = {};

function _startWebTimer(nodeId, ms) {
  _stopWebTimer(nodeId);
  if (!ms || ms <= 0) return;
  _webTimers[nodeId] = setInterval(() => _webFetch(nodeId), ms);
}

function _stopWebTimer(nodeId) {
  if (_webTimers[nodeId]) { clearInterval(_webTimers[nodeId]); delete _webTimers[nodeId]; }
}

function _webFetch(nodeId) {
  let found = null, foundCid = null;
  for (const [cid, c] of Object.entries(allCircuits())) {
    if (c.nodes[nodeId]) { found = c.nodes[nodeId]; foundCid = cid; break; }
  }
  if (!found) { _stopWebTimer(nodeId); return; }

  const url = found._url;
  if (!url) return;

  fetch(url)
    .then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.text();
    })
    .then(text => {
      let val;
      try {
        const j = JSON.parse(text);
        val = typeof j === 'object' && j !== null ? j.value : j;
      } catch (_) {
        val = parseFloat(text);
      }
      val = Number(val);
      if (!Number.isFinite(val)) throw new Error('non-numeric response');

      const bits = found._bits || 1;
      const mask = (1 << bits) - 1;
      found._value  = val & mask;
      found._status = 'ok';
      found._lastOk = Date.now();
    })
    .catch(err => {
      found._status = err.message;
    })
    .finally(() => {
      // Re-simulate quietly (like CLOCK ticks)
      const owningDef = Object.values(blockDefs).find(d => d.circuit?.id === foundCid);
      if (!owningDef) {
        simulate(foundCid, true);
      } else {
        Object.keys(circuits).forEach(cid => { try { simulate(cid, true); } catch (_) {} });
      }
      if (typeof patchPropPanelLive === 'function') patchPropPanelLive();
    });
}

function syncWebTimers() {
  const active = new Set();
  Object.values(allCircuits()).forEach(c => {
    Object.values(c.nodes).forEach(n => {
      if (blockDefs[n.defId]?.isWebInput) {
        active.add(n.id);
        if (!_webTimers[n.id]) _startWebTimer(n.id, n._pollMs ?? 1000);
      }
    });
  });
  Object.keys(_webTimers).forEach(id => { if (!active.has(id)) _stopWebTimer(id); });
}

// ── Node descriptor ──
registerNode({
  id: 'WEB_INPUT', name: 'WEB IN', color: '#e74c3c',
  flags: { isIO: true, ioDir: 'in', ioBits: 1, excludeFromSnapshot: true, isWebInput: true },

  getPorts(node) {
    const bits = node._bits || 1;
    return [{ id: 'out', name: '', dir: 'out', bits }];
  },

  getGeom(node, def) {
    const bits = node._bits || 1;
    const w = ioNodeW(bits) + 4, h = ioNodeH(bits) + 4;
    return {
      x: node.x, y: node.y, w, h,
      ports: { out: { x: w, y: h / 2, bits, dir: 'out', name: '' } },
      isIO: true, ioDir: 'in', ioBits: bits,
    };
  },

  logic(i, node) {
    const bits = node._bits ?? 1;
    const mask = (1 << bits) - 1;
    return { out: (node._value ?? 0) & mask };
  },

  initNode(node, opts) {
    node._value  = 0;
    node._bits   = opts.bits ?? 1;
    node._url    = opts.url  ?? '';
    node._pollMs = opts.pollMs ?? 1000;
    node._status = 'idle';
    node._lastOk = null;
  },

  onAdded(node, cid)   { syncWebTimers(); },
  onRemoved(node, cid) { _stopWebTimer(node.id); },
  syncTimers()         { syncWebTimers(); },

  draw(g, node, def, isSel, isHov) {
    // Guard against undefined after restore-from-storage (initNode not called on restore)
    if (node._value == null) node._value = 0;
    if (node._bits  == null) node._bits  = 1;
    // Reuse the standard IO cell grid, then overlay the status dot
    drawIONode(null, node, def, g, isSel, isHov);

    // Status dot: green = ok recently, red = error/idle
    const ok = node._status === 'ok' && node._lastOk && (Date.now() - node._lastOk < node._pollMs * 3);
    ctx.beginPath();
    ctx.arc(g.x + 6, g.y + g.h - 6, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = ok ? '#2ecc71' : '#e74c3c';
    ctx.fill();
  },

  getPropsHTML(n, def) {
    const bits   = n._bits   ?? 1;
    const pollMs = n._pollMs ?? 1000;
    const url    = n._url    ?? '';
    const ago    = n._lastOk ? ((Date.now() - n._lastOk) / 1000).toFixed(1) + 's ago' : 'never';
    const status = n._status ?? 'idle';
    return `
      <div class="prop-row">
        <div class="prop-label">URL</div>
        <input class="prop-input" id="pwi-url" type="text"
          style="width:100%;box-sizing:border-box;font-size:9px"
          placeholder="http://localhost:8080/value"
          value="${url.replace(/"/g, '&quot;')}">
      </div>
      <div class="prop-row">
        <div class="prop-label">POLL (ms)</div>
        <input class="prop-input" id="pwi-poll" type="number" min="100" max="60000" step="100"
          value="${pollMs}">
      </div>
      <div class="prop-row">
        <div class="prop-label">BITS</div>
        <input class="prop-input" id="pwi-bits" type="number" min="1" max="8" step="1"
          value="${bits}">
      </div>
      <div class="prop-row">
        <div class="prop-label">STATUS</div>
        <div id="pwi-status" class="prop-val" style="font-size:9px;color:${status==='ok'?'#2ecc71':'#e74c3c'}">${status}</div>
      </div>
      <div style="font-size:9px;color:var(--muted);margin-top:2px">Last ok: <span id="pwi-ago">${ago}</span></div>
      <div style="font-size:9px;color:var(--muted);margin-top:4px;line-height:1.5">
        Server must return JSON <code>{"value":N}</code>, a plain number, or a numeric string.
      </div>`;
  },

  bindProps(node, def, cid) {
    document.getElementById('pwi-url')?.addEventListener('change', e => {
      node._url = e.target.value.trim();
      // Restart timer so next fetch uses new URL immediately
      _startWebTimer(node.id, node._pollMs ?? 1000);
      _webFetch(node.id);
    });
    document.getElementById('pwi-poll')?.addEventListener('change', e => {
      const ms = Math.max(100, Math.min(60000, parseInt(e.target.value) || 1000));
      node._pollMs = ms;
      _startWebTimer(node.id, ms);
    });
    document.getElementById('pwi-bits')?.addEventListener('change', e => {
      const b = Math.max(1, Math.min(8, parseInt(e.target.value) || 1));
      node._bits = b;
      simulate(cid, false);
    });
  },

  patchLive(node, def) {
    const statusEl = document.getElementById('pwi-status');
    const agoEl    = document.getElementById('pwi-ago');
    if (statusEl) {
      statusEl.textContent = node._status ?? 'idle';
      statusEl.style.color = node._status === 'ok' ? '#2ecc71' : '#e74c3c';
    }
    if (agoEl) {
      agoEl.textContent = node._lastOk
        ? ((Date.now() - node._lastOk) / 1000).toFixed(1) + 's ago'
        : 'never';
    }
  },
});
