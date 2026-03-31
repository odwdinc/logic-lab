// Logic Lab — Lesson 12: D Latch

registerLesson({
  id: 'D_Latch',
  title: 'Lesson 12 · The D Latch',
  requires: ['NOR_Gate'],

  steps: [
    {
      title: 'From SR Latch to Data Latch',
      text: `The SR latch has a usability problem: having separate SET and RESET inputs means you must be careful never to activate both at once (that produces a forbidden state). It also forces you to think in terms of "set" and "reset" instead of just "store this value."

The D (Data) Latch replaces SET and RESET with two new signals:
  DATA  — the bit you want to store (0 or 1)
  STORE — when high, the latch is transparent and tracks DATA
           when low, the latch freezes and holds its last value

The circuit adds AND gate control in front of a NOR SR latch:
  SET   = DATA AND STORE
  RESET = NOT(DATA) AND STORE`,
    },
    {
      title: 'Build the Circuit',
      text: `The circuit has been built for you. Trace the signal path:

  DATA ────────── AND1 ─── SET ───┐
      └── NOT ─── AND2 ─── RESET ─┤
  STORE ──────────┘               │
                           NOR SR latch → Q

When STORE=0: both AND gates output 0 → SET=0, RESET=0 → latch holds.
When STORE=1: DATA controls SET; NOT(DATA) controls RESET.`,
      build(cid) {
        const norDef = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'NOR');
        if (!norDef) return;
        const norA   = norDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const norB   = norDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const norOut = norDef.ports.find(p => p.dir==='out')?.id;

        const gData  = addNode(cid, 'INPUT',    60,  80, 'DATA');  gData._value  = 0;
        const gStore = addNode(cid, 'INPUT',    60, 220, 'STORE'); gStore._value = 0;
        const gNot   = addNode(cid, 'NOT',      220,  80, '');
        const gAnd1  = addNode(cid, 'AND',      380,  40, '');    // SET  = DATA AND STORE
        const gAnd2  = addNode(cid, 'AND',      380, 200, '');    // RESET = NOT_DATA AND STORE
        const gNorS  = addNode(cid, norDef.id,  560,  40, '');    // NOR_S (locking side)
        const gNorR  = addNode(cid, norDef.id,  560, 200, '');    // NOR_R (Q output side)
        const gQ     = addNode(cid, 'OUTPUT',   760, 200, 'Q');

        // Control logic
        addWire(cid, gData.id,  'out',  gNot.id,  'a');
        addWire(cid, gData.id,  'out',  gAnd1.id, 'a');
        addWire(cid, gStore.id, 'out',  gAnd1.id, 'b');
        addWire(cid, gNot.id,   'out',  gAnd2.id, 'a');
        addWire(cid, gStore.id, 'out',  gAnd2.id, 'b');

        // NOR SR latch
        // SET → NOR_S.A; NOR_R.out → NOR_S.B (Q feeds back to lock NOR_S)
        addWire(cid, gAnd1.id, 'out',  gNorS.id, norA);
        addWire(cid, gNorR.id, norOut, gNorS.id, norB);
        // RESET → NOR_R.A; NOR_S.out → NOR_R.B
        addWire(cid, gAnd2.id, 'out',  gNorR.id, norA);
        addWire(cid, gNorS.id, norOut, gNorR.id, norB);
        // NOR_R output → Q
        addWire(cid, gNorR.id, norOut, gQ.id,    'a');
      },
    },
    {
      title: 'Verify the Latch',
      text: `Step through each state in order. The key test is row 3 — even after DATA changes to 0, Q holds 1 while STORE remains 0.`,
      saveBlock: 'D_LATCH',
      test: {
        inputs:  ['DATA', 'STORE'],
        outputs: ['Q'],
        rows: [
          { in: [1, 1], out: [1] },  // STORE=1, latch captures DATA=1
          { in: [1, 0], out: [1] },  // STORE=0, Q holds 1
          { in: [0, 0], out: [1] },  // DATA changed, Q still holds 1
          { in: [0, 1], out: [0] },  // STORE=1, latch captures DATA=0
          { in: [0, 0], out: [0] },  // STORE=0, Q holds 0
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `The D Latch has one remaining problem: it is level-triggered. While STORE is high, the output continuously tracks DATA. If DATA changes unpredictably while STORE is high (which happens a lot in real circuits), the output can glitch.

What we really want is edge-triggered behaviour: capture DATA only at the precise moment STORE transitions from low to high, then freeze immediately. That is what the flip-flop in the next lesson accomplishes.`,
    },
  ],
});
