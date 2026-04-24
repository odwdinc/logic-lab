// Logic Lab — Shared Reroute / Waypoint Helpers
// Provides the path-math, ribbon-drawing, and descriptor hook helpers used by
// BUS_WIRE (node-BUSW.js) and REROUTE (node-IO-BUS.js).
// All rr* functions are global and resolved at call-time, not load-time.

// ── Path math ─────────────────────────────────────────────────

function rrSyncPts(node) {
  if (!node._pts?.length) return;
  const dx = node.x - node._pts[0].x;
  const dy = node.y - node._pts[0].y;
  if (dx === 0 && dy === 0) return;
  for (const p of node._pts) { p.x += dx; p.y += dy; }
}

function rrPathInfo(pts) {
  const segs = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const dx = pts[i+1].x - pts[i].x, dy = pts[i+1].y - pts[i].y;
    const len = Math.sqrt(dx*dx + dy*dy);
    segs.push({ i, len, start: total });
    total += len;
  }
  return { segs, total };
}

function rrPtAtT(pts, info, t) {
  if (info.total === 0 || pts.length < 2) return pts[0] || { x: 0, y: 0 };
  const target = Math.max(0, Math.min(info.total, t * info.total));
  for (let s = info.segs.length - 1; s >= 0; s--) {
    const seg = info.segs[s];
    if (target >= seg.start || s === 0) {
      const frac = seg.len > 0 ? (target - seg.start) / seg.len : 0;
      const p0 = pts[seg.i], p1 = pts[seg.i + 1];
      return { x: p0.x + (p1.x - p0.x) * frac, y: p0.y + (p1.y - p0.y) * frac };
    }
  }
  return pts[0];
}

function rrNearestT(pts, info, wx, wy) {
  let bestT = 0, bestDist2 = Infinity;
  for (const seg of info.segs) {
    const p0 = pts[seg.i], p1 = pts[seg.i + 1];
    const dx = p1.x - p0.x, dy = p1.y - p0.y;
    const len2 = dx*dx + dy*dy;
    const frac = len2 > 0 ? Math.max(0, Math.min(1, ((wx-p0.x)*dx+(wy-p0.y)*dy)/len2)) : 0;
    const px = p0.x + dx*frac, py = p0.y + dy*frac;
    const d2 = (wx-px)**2 + (wy-py)**2;
    if (d2 < bestDist2) {
      bestDist2 = d2;
      bestT = info.total > 0 ? (seg.start + frac * seg.len) / info.total : 0;
    }
  }
  return { t: bestT, dist: Math.sqrt(bestDist2) };
}

// ── Ribbon drawing ─────────────────────────────────────────────

// Offset polyline: each point shifted perpendicular by `off` px, miter at corners.
function rrOffsetPolyline(pts, off) {
  const result = [];
  for (let i = 0; i < pts.length; i++) {
    if (i === 0) {
      const dx = pts[1].x - pts[0].x, dy = pts[1].y - pts[0].y;
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len < 0.001) { result.push({ x: pts[0].x, y: pts[0].y }); continue; }
      result.push({ x: pts[0].x - dy/len*off, y: pts[0].y + dx/len*off });
    } else if (i === pts.length - 1) {
      const dx = pts[i].x - pts[i-1].x, dy = pts[i].y - pts[i-1].y;
      const len = Math.sqrt(dx*dx + dy*dy);
      if (len < 0.001) { result.push({ x: pts[i].x, y: pts[i].y }); continue; }
      result.push({ x: pts[i].x - dy/len*off, y: pts[i].y + dx/len*off });
    } else {
      const dx1 = pts[i].x - pts[i-1].x, dy1 = pts[i].y - pts[i-1].y;
      const len1 = Math.sqrt(dx1*dx1 + dy1*dy1);
      const dx2 = pts[i+1].x - pts[i].x, dy2 = pts[i+1].y - pts[i].y;
      const len2 = Math.sqrt(dx2*dx2 + dy2*dy2);
      if (len1 < 0.001 || len2 < 0.001) { result.push({ x: pts[i].x, y: pts[i].y }); continue; }
      const n1x = -dy1/len1, n1y = dx1/len1;
      const n2x = -dy2/len2, n2y = dx2/len2;
      let bx = n1x + n2x, by = n1y + n2y;
      const blen = Math.sqrt(bx*bx + by*by);
      if (blen < 0.001) {
        result.push({ x: pts[i].x + n1x*off, y: pts[i].y + n1y*off });
      } else {
        bx /= blen; by /= blen;
        const dot = bx*n1x + by*n1y;
        const miter = Math.abs(dot) > 0.1 ? off/dot : off*8;
        const clamped = Math.sign(miter) * Math.min(Math.abs(miter), Math.abs(off)*8);
        result.push({ x: pts[i].x + bx*clamped, y: pts[i].y + by*clamped });
      }
    }
  }
  return result;
}

function rrDrawLanes(pts, bits, val, srcColor, laneColors) {
  const isFloat = val === null;
  const LANE = 3, GAP = 1;
  const totalW = bits*(LANE+GAP) - GAP;
  const base = -(totalW/2);
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = LANE;
  for (let b = 0; b < bits; b++) {
    const bitVal = isFloat ? null : ((val >> (bits-1-b)) & 1);
    const off = base + b*(LANE+GAP) + LANE/2;
    const laneCol = laneColors ? laneColors[b]||srcColor : srcColor;
    const op = rrOffsetPolyline(pts, off);
    ctx.beginPath();
    ctx.moveTo(op[0].x, op[0].y);
    for (let i = 1; i < op.length; i++) ctx.lineTo(op[i].x, op[i].y);
    ctx.strokeStyle = isFloat ? '#3a3040' : bitVal===1 ? (laneCol||'#e74c3c') : '#2a2a38';
    ctx.stroke();
  }
}

function rrDrawRibbonBackground(pts, bits) {
  if (pts.length < 2) return;
  const LANE = 3, GAP = 1;
  const totalW = bits*(LANE+GAP) - GAP;
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = totalW + 4; ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.strokeStyle = '#1a1a24'; ctx.lineWidth = totalW + 1; ctx.stroke();
}

// ── Shared descriptor hook helpers ────────────────────────────

function rrHitWaypoint(wx, wy, node) {
  if (!node._pts?.length) return null;
  rrSyncPts(node);
  const hitR = (RH_HIT + 2) / vpScale;
  for (let i = 0; i < node._pts.length; i++) {
    const p = node._pts[i];
    if ((wx-p.x)**2 + (wy-p.y)**2 <= hitR*hitR)
      return { id: 'wp_' + i, cur: 'move', _wpIdx: i };
  }
  return null;
}

function rrApplyResize(node, handleId, snap, dx, dy) {
  if (!handleId.startsWith('wp_')) return false;
  const i = parseInt(handleId.slice(3));
  if (!node._pts?.[i]) return true;
  node._pts[i] = {
    x: Math.round((snap._wpX + dx) / 10) * 10,
    y: Math.round((snap._wpY + dy) / 10) * 10,
  };
  if (i === 0) { node.x = node._pts[0].x; node.y = node._pts[0].y; }
  return true;
}

function rrOnDblClick(wx, wy, node, cid) {
  if (!node._pts?.length) node._pts = [{ x: node.x, y: node.y }, { x: node.x + 120, y: node.y }];
  rrSyncPts(node);
  const pts  = node._pts;
  const hitR = (RH_HIT + 4) / vpScale;

  // Near existing waypoint → remove it (keep at least 2)
  for (let i = 0; i < pts.length; i++) {
    if ((wx-pts[i].x)**2 + (wy-pts[i].y)**2 <= hitR*hitR) {
      if (pts.length <= 2) return true;
      pts.splice(i, 1);
      if (i === 0) { node.x = pts[0].x; node.y = pts[0].y; }
      simulate(cid); render(); return true;
    }
  }

  // Near path → insert waypoint
  const info = rrPathInfo(pts);
  const { t, dist } = rrNearestT(pts, info, wx, wy);
  if (dist > hitR * 3) return false;
  const target = t * info.total;
  for (let s = 0; s < info.segs.length; s++) {
    const seg = info.segs[s];
    if (target <= seg.start + seg.len || s === info.segs.length - 1) {
      const frac = seg.len > 0 ? (target - seg.start) / seg.len : 0;
      const p0 = pts[seg.i], p1 = pts[seg.i + 1];
      pts.splice(seg.i + 1, 0, {
        x: Math.round((p0.x + (p1.x-p0.x)*frac) / 10) * 10,
        y: Math.round((p0.y + (p1.y-p0.y)*frac) / 10) * 10,
      });
      simulate(cid); render(); return true;
    }
  }
  return false;
}

// Draw waypoint handles along a path (only when node is selected).
function rrDrawWaypoints(pts, isSel, color) {
  if (!isSel) return;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const isActive = dragMode === 'resize' && resizeHandle?._wpIdx === i;
    ctx.beginPath(); ctx.arc(p.x, p.y, RH_R + 2, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(10,12,16,0.85)'; ctx.fill();
    ctx.beginPath(); ctx.arc(p.x, p.y, RH_R, 0, Math.PI*2);
    ctx.fillStyle   = isActive ? '#fff' : color;
    ctx.strokeStyle = isActive ? color : 'rgba(255,255,255,0.7)';
    ctx.lineWidth   = 1.2 / vpScale;
    ctx.fill(); ctx.stroke();
  }
}
