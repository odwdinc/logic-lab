// Logic Lab Lesson — The XOR Gate

registerLesson({
  id: 'XOR_Gate',
  title: 'Lesson 5 · The XOR Gate',
  requires: ['OR_Gate'],

  steps: [
    {
      title: 'Concept',
      text: `XOR (Exclusive OR) is like OR, but with one exception: when both inputs are 1, the output is 0. It is true when inputs differ, false when they match.

The formula using gates you already have:

  A XOR B  =  OR(A,B)  AND  NAND(A,B)

Think about it: OR is true when at least one is 1. NAND is false only when both are 1. AND-ing them together excludes the both-1 case.`,
    },
    {
      title: 'Build the Circuit',
      text: `The circuit has been built for you. Trace the wires:

  A ──┬── OR ───┐
      │          AND ── OUT
  B ──┴── NAND ─┘

Both OR and NAND receive A and B. Their outputs feed the AND gate. Notice how OR and NAND together "vote" — OR passes (0,1) (1,0) AND (1,1), but NAND vetoes (1,1), leaving only the cases where the inputs differ.`,
      build(cid) {
        const orDef   = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'OR');
        const nandDef = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'NAND');
        if (!orDef || !nandDef) return;
        const orA    = orDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const orB    = orDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const orOut  = orDef.ports.find(p => p.dir==='out')?.id;
        const nandA  = nandDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const nandB  = nandDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const nandOut = nandDef.ports.find(p => p.dir==='out')?.id;

        const gA    = addNode(cid, 'INPUT',     60,  60, 'A');  gA._value = 0;
        const gB    = addNode(cid, 'INPUT',     60, 200, 'B');  gB._value = 0;
        const gOR   = addNode(cid, orDef.id,   240,  60, '');
        const gNAND = addNode(cid, nandDef.id, 240, 200, '');
        const gAND  = addNode(cid, 'AND',       420, 130, '');
        const gOut  = addNode(cid, 'OUTPUT',    580, 130, 'OUT');

        addWire(cid, gA.id,    'out',    gOR.id,   orA);
        addWire(cid, gB.id,    'out',    gOR.id,   orB);
        addWire(cid, gA.id,    'out',    gNAND.id, nandA);
        addWire(cid, gB.id,    'out',    gNAND.id, nandB);
        addWire(cid, gOR.id,   orOut,    gAND.id,  'a');
        addWire(cid, gNAND.id, nandOut,  gAND.id,  'b');
        addWire(cid, gAND.id,  'out',    gOut.id,  'a');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `XOR outputs 1 only when the inputs differ. When both are 0 or both are 1, the output is 0.`,
      saveBlock: 'XOR',
      test: {
        inputs:  ['A', 'B'],
        outputs: ['OUT'],
        rows: [
          { in: [0, 0], out: [0] },
          { in: [0, 1], out: [1] },
          { in: [1, 0], out: [1] },
          { in: [1, 1], out: [0] },
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `XOR detects difference. Two inputs that are the same → 0. Two inputs that differ → 1.

Compare XOR to OR:
  OR  outputs 1 for (0,1), (1,0), and (1,1)
  XOR outputs 1 for (0,1), (1,0) but NOT (1,1)

You will use XOR as the core of binary addition in the next lessons. The "sum" bit when adding two 1s is 0 — exactly what XOR produces.`,
    },
  ],
});
