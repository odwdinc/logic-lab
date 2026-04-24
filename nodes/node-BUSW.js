// Logic Lab Node — BUS WIRE
// A flexible routable bus line. Drag any output onto the line to add a writer tap;
// drag from the line to any input to add a reader tap.
// Double-click the line to add a waypoint; double-click a waypoint to remove it.
// Drag waypoint handles (when selected) to reshape the route.
// Path math and ribbon drawing live in core/ll-reroute.js (rr* helpers).

registerNode({
  id:    'BUS_WIRE',
  name:  'BUS',
  color: '#16a085',
  flags: {},
  defaultBits: 1,

  initNode(node) {
    node._taps    = node._taps    ?? [];
    node._tapNext = node._tapNext ?? 0;
    node._pts     = node._pts     ?? [
      { x: node.x,       y: node.y },
      { x: node.x + 200, y: node.y },
    ];
  },

  getPorts(node) {
    const bits = node._bits || 1;
    return (node._taps || []).map(t => ({
      id: t.id, name: '', dir: t.dir, bits, noStub: true,
    }));
  },

  getGeom(node) {
    if (!node._pts?.length) node._pts = [{ x: node.x, y: node.y }, { x: node.x + 200, y: node.y }];
    if (!node._taps)    node._taps    = [];
    if (!node._tapNext) node._tapNext = 0;
    rrSyncPts(node);
    const pts  = node._pts;
    const info = rrPathInfo(pts);
    const bits = node._bits || 1;
    const LANE = 3, GAP = 1;
    const PAD  = (bits*(LANE+GAP) + 10) / 2 + 14;

    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const bx = Math.min(...xs) - PAD, by = Math.min(...ys) - PAD;
    const bw = Math.max(...xs) - Math.min(...xs) + PAD*2;
    const bh = Math.max(...ys) - Math.min(...ys) + PAD*2;

    const ports = {};
    for (const tap of (node._taps || [])) {
      const pos = rrPtAtT(pts, info, tap.t);
      ports[tap.id] = { x: pos.x - bx, y: pos.y - by, bits, dir: tap.dir, name: '', noStub: true };
    }
    return { x: bx, y: by, w: bw, h: bh, ports };
  },

  logic(inp, node) {
    const taps = node._taps || [];
    let driven = null, conflict = false;
    for (const t of taps) {
      if (t.dir !== 'in') continue;
      const v = inp[t.id];
      if (v !== null && v !== undefined) {
        if (driven === null) driven = v;
        else if (driven !== v) { conflict = true; break; }
      }
    }
    node._conflict = conflict;
    const out = {};
    for (const t of taps) {
      if (t.dir === 'out') out[t.id] = conflict ? null : driven;
    }
    return out;
  },

  getOutputColor(cid, node, outPortId, wireSourceColorsFn) {
    for (const t of (node._taps || [])) {
      if (t.dir !== 'in') continue;
      const v = node.portValues?.[t.id];
      if (v !== null && v !== undefined) {
        const cols = wireSourceColorsFn(cid, node.id, t.id);
        if (cols[0]) return cols[0];
      }
    }
    return null;
  },

  // ── Custom hit-test: only hit if near a path segment ───────
  hitTest(wx, wy, node) {
    if (!node._pts?.length) return false;
    rrSyncPts(node);
    const pts  = node._pts;
    const bits = node._bits || 1;
    const LANE = 3, GAP = 1;
    const hitR = (bits*(LANE+GAP) - GAP + 4) / 2 + 6;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i+1];
      const dx = p1.x - p0.x, dy = p1.y - p0.y;
      const len2 = dx*dx + dy*dy;
      const frac = len2 > 0
        ? Math.max(0, Math.min(1, ((wx-p0.x)*dx + (wy-p0.y)*dy) / len2))
        : 0;
      const px = p0.x + dx*frac, py = p0.y + dy*frac;
      if ((wx-px)**2 + (wy-py)**2 <= hitR*hitR) return true;
    }
    return false;
  },

  // ── Wire-drop tap creation ──────────────────────────────────
  resolveWireDrop(wx, wy, node, cid, forDrop) {
    if (!wireStart) return null;
    if (!node._pts?.length) node._pts = [{ x: node.x, y: node.y }, { x: node.x + 200, y: node.y }];
    rrSyncPts(node);
    const pts  = node._pts;
    const info = rrPathInfo(pts);
    const hitR = PORT_HIT / vpScale;
    const { t, dist } = rrNearestT(pts, info, wx, wy);
    if (dist > hitR) return null;

    const bits = node._bits || 1;
    let neededDir = 'in';
    if (wireStart) {
      const sn = circuits[cid]?.nodes[wireStart.nodeId];
      const sp = getNodePorts(sn, blockDefs[sn?.defId])?.find(p => p.id === wireStart.portId);
      if (sp?.dir === 'in') neededDir = 'out';
    }

    if (!node._taps) node._taps = [];

    // Reuse nearby existing tap with matching direction
    for (const tap of node._taps) {
      if (tap.dir !== neededDir) continue;
      const tapPos = rrPtAtT(pts, info, tap.t);
      if ((wx-tapPos.x)**2 + (wy-tapPos.y)**2 <= hitR*hitR) {
        const g = nodeGeom(node);
        return { node, portId: tap.id, pp: g.ports[tap.id] };
      }
    }

    const pos = rrPtAtT(pts, info, t);
    const g   = nodeGeom(node);
    const pp  = { x: pos.x - g.x, y: pos.y - g.y, bits, dir: neededDir, name: '', noStub: true };

    if (!forDrop) return { node, portId: 'tap_preview', pp };

    const tapId = 'tap_' + (++node._tapNext);
    node._taps.push({ id: tapId, t, dir: neededDir });
    return { node, portId: tapId, pp };
  },

  // ── Waypoint / tap handle hit-test ─────────────────────────
  hitWaypoint(wx, wy, node) { return rrHitWaypoint(wx, wy, node); },

  // ── Waypoint drag ──────────────────────────────────────────
  applyResize(node, handleId, snap, dx, dy) { return rrApplyResize(node, handleId, snap, dx, dy); },

  // ── Double-click: add / remove waypoints ───────────────────
  onDblClick(wx, wy, node, cid) { return rrOnDblClick(wx, wy, node, cid); },

  // ── Draw ──────────────────────────────────────────────────
  draw(g, node, def, isSel) {
    if (!node._pts?.length) node._pts = [{ x: node.x, y: node.y }, { x: node.x + 200, y: node.y }];
    rrSyncPts(node);
    const pts      = node._pts;
    const bits     = node._bits || 1;
    const taps     = node._taps || [];
    const conflict = node._conflict;

    // Resolve driven value and color
    let driven = null, srcColor = def.color, laneColors = null;
    for (const t of taps) {
      if (t.dir !== 'in') continue;
      const v = node.portValues?.[t.id];
      if (v !== null && v !== undefined) {
        driven = v;
        const lanes = portLaneColors(currentCircuitId, node.id, t.id);
        srcColor = lanes.find(c => c) || def.color;
        if (lanes.length > 1 && lanes.some((c, i) => c !== lanes[0])) laneColors = lanes;
        break;
      }
    }
    const color    = conflict ? '#e74c3c' : srcColor;
    const drawVal  = conflict ? null : driven;
    const drawCol  = conflict ? '#e74c3c' : srcColor;

    ctx.save();

    // Selection glow along the path
    if (isSel && pts.length >= 2) {
      ctx.strokeStyle = color + '44';
      ctx.lineWidth   = 22 / vpScale;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    // Draw ribbon: full-path jacket+body, then continuous offset lane polylines
    if (pts.length >= 2) {
      rrDrawRibbonBackground(pts, bits);
      rrDrawLanes(pts, bits, drawVal, drawCol, laneColors);
    }

    // Conflict label
    if (conflict && pts.length >= 2 && vpScale > 0.3) {
      const mid = rrPtAtT(pts, rrPathInfo(pts), 0.5);
      ctx.font         = `700 ${8/vpScale}px JetBrains Mono`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle    = '#e74c3c';
      ctx.fillText('CONFLICT', mid.x, mid.y - 6/vpScale);
    }

    // Node label
    if (node.label && vpScale > 0.4) {
      ctx.font         = `700 ${8/vpScale}px JetBrains Mono`;
      ctx.textAlign    = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle    = color + '88';
      ctx.fillText(node.label, pts[0].x + 3/vpScale, pts[0].y - 6/vpScale);
    }

    // Tap dots
    const info = rrPathInfo(pts);
    for (const tap of taps) {
      const pos = rrPtAtT(pts, info, tap.t);
      const hov = hovPortKey === node.id + '_' + tap.id;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, (PORT_R + 1.5) / vpScale, 0, Math.PI*2);
      ctx.fillStyle   = hov ? '#fff' : color;
      ctx.shadowBlur  = 0;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth   = 1.5 / vpScale;
      ctx.stroke();
    }

    // Wire-drag preview dot
    if (dragMode === 'wire' && hovPortKey === node.id + '_tap_preview') {
      const { t } = rrNearestT(pts, info, mouseWX, mouseWY);
      const pos = rrPtAtT(pts, info, t);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, (PORT_R + 1.5) / vpScale, 0, Math.PI*2);
      ctx.fillStyle   = '#fff';
      ctx.shadowBlur  = 0;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      ctx.lineWidth   = 1.5 / vpScale;
      ctx.stroke();
    }

    // Waypoint handles (only when selected)
    rrDrawWaypoints(pts, isSel, color);

    ctx.restore();
  },

  // ── Props panel ────────────────────────────────────────────
  getPropsHTML(n, def, effectiveBits) {
    const taps    = n._taps || [];
    const writers = taps.filter(t => t.dir === 'in').length;
    const readers = taps.filter(t => t.dir === 'out').length;
    const pts     = n._pts || [];
    let driven = null;
    for (const t of taps) {
      if (t.dir !== 'out') continue;
      const v = n.portValues?.[t.id];
      if (v !== null && v !== undefined) { driven = v; break; }
    }
    const fv  = n._conflict
      ? `<span style="color:#e74c3c">CONFLICT</span>`
      : fmtVal(driven, effectiveBits, n._dispFmt);
    const cls = driven === null ? 'pv-z' : effectiveBits === 1 ? (driven ? 'pv-1' : 'pv-0') : 'pv-bus';
    const bitsOpts = [1,2,3,4,5,6,7,8].map(b =>
      `<option value="${b}"${effectiveBits===b?' selected':''}>${b} bit${b>1?'s':''}</option>`).join('');
    return `
      <div class="prop-row"><div class="prop-label">BUS WIDTH</div>
        <select class="prop-input" id="pbw">${bitsOpts}</select></div>
      <div class="prop-row"><div class="prop-label">WAYPOINTS</div>
        <span style="font-size:11px;color:var(--muted)">${pts.length} &nbsp;·&nbsp; dbl-click to add/remove</span></div>
      <div class="prop-row"><div class="prop-label">TAPS</div>
        <span style="font-size:11px;color:var(--muted)">${writers} writer${writers!==1?'s':''}, ${readers} reader${readers!==1?'s':''}</span></div>
      <div class="prop-row"><div class="prop-label">BUS VALUE</div>
        <span class="port-val-display ${cls}" id="busw-val" style="font-size:12px">${fv}</span></div>
      <div class="prop-row"><div class="prop-label">DISPLAY FORMAT</div>
        <select class="prop-input" id="pfi">
          <option value="dec"${n._dispFmt==='dec'?' selected':''}>Decimal</option>
          <option value="hex"${n._dispFmt==='hex'?' selected':''}>Hex</option>
          <option value="bin"${n._dispFmt==='bin'?' selected':''}>Binary</option>
        </select></div>
      <div class="prop-row">
        <button class="tb-btn" id="busw-clear" style="width:100%">Clear all taps</button></div>`;
  },

  bindProps(n, def, cid) {
    document.getElementById('pbw')?.addEventListener('change', e => {
      const b = parseInt(e.target.value);
      const c = circuits[cid];
      Object.keys(c.wires).forEach(wi => {
        const w = c.wires[wi];
        if (w.fromNode === n.id || w.toNode === n.id) delete c.wires[wi];
      });
      n._bits = b; n._taps = []; n.portValues = {};
      simulate(cid); updatePropPanel();
    });
    document.getElementById('pfi')?.addEventListener('change', e => {
      n._dispFmt = e.target.value; render(); updatePropPanel();
    });
    document.getElementById('busw-clear')?.addEventListener('click', () => {
      const c = circuits[cid];
      Object.keys(c.wires).forEach(wi => {
        const w = c.wires[wi];
        if (w.fromNode === n.id || w.toNode === n.id) delete c.wires[wi];
      });
      n._taps = []; n.portValues = {};
      simulate(cid); updatePropPanel();
    });
  },

  patchLive(node) {
    const el = document.getElementById('busw-val');
    if (!el) return;
    let driven = null;
    for (const t of (node._taps || [])) {
      if (t.dir !== 'out') continue;
      const v = node.portValues?.[t.id];
      if (v !== null && v !== undefined) { driven = v; break; }
    }
    const bits = node._bits || 1;
    if (node._conflict) {
      el.innerHTML = '<span style="color:#e74c3c">CONFLICT</span>';
      el.className = 'port-val-display pv-z';
    } else {
      el.textContent = fmtVal(driven, bits, node._dispFmt);
      el.className   = 'port-val-display ' + (driven===null?'pv-z':bits===1?(driven?'pv-1':'pv-0'):'pv-bus');
    }
  },
});
