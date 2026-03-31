// Logic Lab — Lesson System
// registerLesson(desc) is called from files under lessons/.
// No other core file needs to change when lessons are added or removed.

const _lessonRegistry = [];
const _LS_DONE_KEY = 'll_lessons_done';
const _lessonDone = new Set(JSON.parse(localStorage.getItem(_LS_DONE_KEY) || '[]'));

// Active lesson state
const _ls = {
  lesson:     null,
  cid:        null,
  step:       0,
  builtSteps: new Set(),
  rowsDone:   new Set(),   // indices of test rows the user has reproduced
  pollTimer:  null,
  collapsed:  false,
};

function registerLesson(desc) {
  _lessonRegistry.push(desc);
}

function _saveDone() {
  localStorage.setItem(_LS_DONE_KEY, JSON.stringify([..._lessonDone]));
}

// ── Live row polling ─────────────────────────────────────────────
// Runs while a test step is visible. Compares the circuit's current
// INPUT._value and OUTPUT.portValues.a against the truth table rows.
// When a matching row is found it is checked off. When all rows are
// done the lesson is marked complete, and if the step has saveBlock
// the circuit is automatically saved as a block.

function _startPoll() {
  if (_ls.pollTimer) return;
  _ls.pollTimer = setInterval(_pollStep, 150);
}

function _stopPoll() {
  clearInterval(_ls.pollTimer);
  _ls.pollTimer = null;
}

function _pollStep() {
  const step = _ls.lesson?.steps[_ls.step];
  if (!step?.test) { _stopPoll(); return; }

  const c = circuits[_ls.cid];
  if (!c) return;

  const { inputs, outputs, rows } = step.test;

  const inNodes  = inputs.map(lbl =>
    Object.values(c.nodes).find(n =>
      blockDefs[n.defId]?.isIO && blockDefs[n.defId].ioDir === 'in' && n.label === lbl));
  const outNodes = outputs.map(lbl =>
    Object.values(c.nodes).find(n =>
      blockDefs[n.defId]?.isIO && blockDefs[n.defId].ioDir === 'out' && n.label === lbl));

  const curIn  = inNodes.map(n  => n?._value ?? 0);
  const curOut = outNodes.map(n => n?.portValues?.['a'] ?? 0);

  let changed = false;
  rows.forEach((row, i) => {
    if (_ls.rowsDone.has(i)) return;
    if (row.in.every((v, j)  => curIn[j]  === v) &&
        row.out.every((v, j) => curOut[j] === v)) {
      _ls.rowsDone.add(i);
      changed = true;
    }
  });

  if (changed) {
    const allDone = _ls.rowsDone.size === rows.length;
    if (allDone) {
      // Auto-save as a block if the step requests it
      if (step.saveBlock) {
        saveAsBlock(_ls.cid, step.saveBlock, step.blockColor || '#9b59b6');
        toast(`"${step.saveBlock}" saved to library`);
      }
      _lessonDone.add(_ls.lesson.id);
      _saveDone();
      _stopPoll();
    }
    _renderLessonPanel();
  }
}

// ── Lesson Picker ────────────────────────────────────────────────

function openLessonPicker() {
  const list = document.getElementById('lesson-picker-list');
  list.innerHTML = _lessonRegistry.map(l => {
    const done   = _lessonDone.has(l.id);
    const locked = (l.requires || []).some(r => !_lessonDone.has(r));
    const icon   = done ? '✓' : locked ? '🔒' : '○';
    const dimmed = locked ? 'opacity:.45;pointer-events:none' : '';
    const color  = done ? '#4ecb8d' : locked ? 'var(--muted)' : 'var(--text)';
    return `<div class="lesson-pick-row" data-id="${l.id}"
      style="display:flex;align-items:center;gap:10px;padding:8px 10px;
      border-radius:4px;border:1px solid var(--border);background:var(--surface);
      margin-bottom:6px;cursor:pointer;${dimmed}">
      <span style="font-size:13px;color:${color};flex-shrink:0">${icon}</span>
      <span style="font-size:11px;flex:1;color:${color}">${l.title}</span>
      ${done ? '<span style="font-size:9px;color:#4ecb8d;letter-spacing:.06em">DONE</span>' : ''}
    </div>`;
  }).join('');

  list.querySelectorAll('.lesson-pick-row').forEach(row => {
    row.addEventListener('click', () => {
      document.getElementById('lesson-picker').style.display = 'none';
      openLesson(row.dataset.id);
    });
  });

  document.getElementById('lesson-picker').style.display = 'flex';
}

document.getElementById('lesson-picker-close').addEventListener('click', () => {
  document.getElementById('lesson-picker').style.display = 'none';
});
document.getElementById('lesson-picker').addEventListener('click', e => {
  if (e.target === document.getElementById('lesson-picker'))
    document.getElementById('lesson-picker').style.display = 'none';
});

// ── Open a Lesson ────────────────────────────────────────────────

function openLesson(lessonId) {
  const lesson = _lessonRegistry.find(l => l.id === lessonId);
  if (!lesson) return;
  if ((lesson.requires || []).some(r => !_lessonDone.has(r))) {
    toast('Complete earlier lessons first'); return;
  }

  _stopPoll();
  const cid = 'lesson_' + lessonId;
  if (circuits[cid]) delete circuits[cid];
  makeCircuit(cid, lesson.title);

  _ls.lesson     = lesson;
  _ls.cid        = cid;
  _ls.step       = 0;
  _ls.builtSteps = new Set();
  _ls.rowsDone   = new Set();

  switchToCircuit(cid);
  _runStepAction();
  _renderLessonPanel();
}

// ── Step Navigation ──────────────────────────────────────────────

function _runStepAction() {
  const step = _ls.lesson?.steps[_ls.step];
  if (step?.test) _startPoll();
  if (!step?.build || _ls.builtSteps.has(_ls.step)) return;
  _ls.builtSteps.add(_ls.step);
  step.build(_ls.cid);
  simulate(_ls.cid);
  setTimeout(fitView, 50);
}

function _lessonNext() {
  if (!_ls.lesson) return;
  if (_ls.step < _ls.lesson.steps.length - 1) {
    _stopPoll();
    _ls.step++;
    _ls.rowsDone = new Set();
    _renderLessonPanel();
    _runStepAction();
  }
}

function _lessonPrev() {
  if (!_ls.lesson || _ls.step <= 0) return;
  _stopPoll();
  _ls.step--;
  _ls.rowsDone = new Set();
  _renderLessonPanel();
  // Don't re-run build on going back; do restart poll if returning to a test step
  const step = _ls.lesson.steps[_ls.step];
  if (step?.test) _startPoll();
}

function _closeLessonPanel() {
  _stopPoll();
  _ls.lesson    = null;
  _ls.collapsed = false;
  document.getElementById('lesson-panel').style.display = 'none';
}

function _finishLesson() {
  _stopPoll();
  const lesson  = _ls.lesson;
  const oldCid  = _ls.cid;
  _ls.lesson    = null;
  _ls.collapsed = false;
  document.getElementById('lesson-panel').style.display = 'none';
  if (lesson && _lessonDone.has(lesson.id)) {
    const idx  = _lessonRegistry.findIndex(l => l.id === lesson.id);
    const next = _lessonRegistry[idx + 1];
    if (next && !(next.requires || []).some(r => !_lessonDone.has(r))) {
      openLesson(next.id);
      if (oldCid && oldCid !== 'main') _origCloseCircuit(oldCid);
      return;
    }
  }
}

// Show panel when on the lesson circuit; hide (without clearing state) on other tabs
function _syncLessonPanelVisibility(cid) {
  if (!_ls.lesson) return;
  if (cid === _ls.cid) {
    _renderLessonPanel();
  } else {
    document.getElementById('lesson-panel').style.display = 'none';
  }
}

// ── Panel Render ─────────────────────────────────────────────────

function _renderLessonPanel() {
  if (!_ls.lesson) return;
  const panel  = document.getElementById('lesson-panel');
  const lesson = _ls.lesson;

  // ── Collapsed: header strip only ─────────────────────────────
  if (_ls.collapsed) {
    panel.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:10px;font-weight:700;color:var(--accent);flex:1;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lesson.title}</span>
        <button id="lp-expand" style="background:none;border:none;color:var(--muted);
          cursor:pointer;font-size:13px;line-height:1;padding:0 2px" title="Expand">▲</button>
      </div>`;
    panel.style.display = 'flex';
    document.getElementById('lp-expand').addEventListener('click', () => {
      _ls.collapsed = false;
      _renderLessonPanel();
    });
    return;
  }

  const step   = lesson.steps[_ls.step];
  const total  = lesson.steps.length;
  const isFirst = _ls.step === 0;
  const isLast  = _ls.step === total - 1;
  const done    = _lessonDone.has(lesson.id);
  const canAdvance = !step.test || done || _ls.rowsDone.size === step.test?.rows.length;

  // Progress dots
  const dots = Array.from({ length: total }, (_, i) =>
    `<span style="width:6px;height:6px;border-radius:50%;display:inline-block;
    background:${i < _ls.step ? '#4ecb8d' : i === _ls.step ? 'var(--accent)' : 'var(--border2)'}"></span>`
  ).join('');

  // Truth table — rows tick off as the user produces each combination
  let testHtml = '';
  if (step.test) {
    const { inputs, outputs, rows } = step.test;
    const allDone = _ls.rowsDone.size === rows.length;

    const thIn  = inputs.map(l =>
      `<th style="padding:3px 8px;color:var(--muted);border-bottom:1px solid var(--border);font-weight:700;letter-spacing:.06em">${l}</th>`).join('');
    const thOut = outputs.map(l =>
      `<th style="padding:3px 8px;color:var(--accent);border-bottom:1px solid var(--border);font-weight:700;letter-spacing:.06em">${l}</th>`).join('');
    const thChk = `<th style="padding:3px 8px;border-bottom:1px solid var(--border);width:20px"></th>`;

    const trs = rows.map((row, i) => {
      const checked = _ls.rowsDone.has(i);
      const bg = checked ? 'rgba(78,203,141,.08)' : '';
      const tdIn  = row.in.map(v =>
        `<td style="padding:4px 8px;text-align:center;font-weight:700;color:${v ? '#4ecb8d' : 'var(--muted)'}">${v}</td>`).join('');
      const tdOut = row.out.map(v =>
        `<td style="padding:4px 8px;text-align:center;font-weight:700;color:${v ? '#4ecb8d' : 'var(--muted)'}">${v}</td>`).join('');
      const tdChk = `<td style="padding:4px 8px;text-align:center;color:#4ecb8d">${checked ? '✓' : ''}</td>`;
      return `<tr style="background:${bg}">${tdIn}${tdOut}${tdChk}</tr>`;
    }).join('');

    const saveNote = step.saveBlock && !allDone
      ? `<span style="color:var(--accent)"> · saves as <b>${step.saveBlock}</b> when complete</span>` : '';
    const progress = `<div style="margin-top:7px;font-size:10px;color:var(--muted)">
      ${allDone
        ? `<span style="color:#4ecb8d;font-weight:700">✓ All combinations verified${step.saveBlock ? ` — "${step.saveBlock}" saved to library!` : ' — lesson complete!'}</span>`
        : `Try each combination on the canvas &nbsp;·&nbsp; <span style="color:var(--text)">${_ls.rowsDone.size}/${rows.length}</span> done${saveNote}`
      }</div>`;

    testHtml = `
      <table style="width:100%;border-collapse:collapse;font-size:10px;margin-top:6px">
        <thead><tr>${thIn}${thOut}${thChk}</tr></thead>
        <tbody>${trs}</tbody>
      </table>
      ${progress}`;
  }

  panel.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-bottom:10px">
      <span style="font-size:10px;font-weight:700;color:var(--accent);flex:1;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lesson.title}</span>
      <span style="display:flex;gap:3px;align-items:center">${dots}</span>
      <button id="lp-collapse" style="background:none;border:none;color:var(--muted);
        cursor:pointer;font-size:13px;line-height:1;padding:0 2px" title="Collapse">▼</button>
    </div>
    <div style="font-size:9px;font-weight:700;letter-spacing:.1em;color:var(--muted);
      flex-shrink:0;margin-bottom:5px">${(step.title || '').toUpperCase()}</div>
    <div style="font-size:11px;line-height:1.65;color:var(--text);flex:1;
      overflow-y:auto;white-space:pre-wrap;min-height:0">${step.text || ''}</div>
    <div style="flex-shrink:0">${testHtml}</div>
    <div style="display:flex;align-items:center;gap:6px;margin-top:10px;flex-shrink:0">
      <button id="lp-prev" class="tb-btn" ${isFirst ? 'disabled' : ''}
        style="opacity:${isFirst ? .4 : 1}">← Prev</button>
      <span style="flex:1;text-align:center;font-size:9px;color:var(--muted)">${_ls.step + 1} / ${total}</span>
      <button id="lp-next" class="tb-btn primary" ${canAdvance ? '' : 'disabled'}
        style="opacity:${canAdvance ? 1 : .4}">
        ${isLast ? (done ? '✓ Done' : 'Finish') : 'Next →'}
      </button>
    </div>`;

  panel.style.display = 'flex';

  document.getElementById('lp-collapse').addEventListener('click', () => {
    _ls.collapsed = true;
    _renderLessonPanel();
  });
  document.getElementById('lp-prev').addEventListener('click', () => { if (!isFirst) _lessonPrev(); });
  document.getElementById('lp-next').addEventListener('click', () => {
    if (!canAdvance) return;
    if (isLast) _finishLesson(); else _lessonNext();
  });
}

// ── Nav hooks ────────────────────────────────────────────────────
// Wrap switchToCircuit: hide/show lesson panel when the user changes tabs
const _origSwitchToCircuit = switchToCircuit;
switchToCircuit = function(cid) {
  _origSwitchToCircuit(cid);
  _syncLessonPanelVisibility(cid);
};

// Wrap closeCircuit: closing the lesson tab truly closes the lesson (with auto-advance)
const _origCloseCircuit = closeCircuit;
closeCircuit = function(cid) {
  if (_ls.lesson && _ls.cid === cid) _closeLessonPanel();
  _origCloseCircuit(cid);
};

// ── Restore on page refresh ──────────────────────────────────────
// Lesson files register after this file runs, so defer until all scripts are loaded.
setTimeout(() => {
  if (!currentCircuitId?.startsWith('lesson_')) return;
  const lessonId = currentCircuitId.replace('lesson_', '');
  const lesson   = _lessonRegistry.find(l => l.id === lessonId);
  if (!lesson) return;
  const done = _lessonDone.has(lesson.id);
  _ls.lesson     = lesson;
  _ls.cid        = currentCircuitId;
  _ls.step       = done ? lesson.steps.length - 1 : 0;
  _ls.builtSteps = new Set(lesson.steps.map((_, i) => i)); // all steps already built
  _ls.rowsDone   = new Set();
  _renderLessonPanel();
  if (lesson.steps[_ls.step]?.test) _startPoll();
}, 0);
