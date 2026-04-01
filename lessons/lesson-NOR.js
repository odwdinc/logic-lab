// Logic Lab — Lesson 11: NOR Gate

registerLesson({
  id: 'NOR_Gate',
  title: 'Lesson 11 · The NOR Gate',
  requires: ['SR_Latch'],

  steps: [
    {
      title: 'Concept',
      text: `NOR means "NOT OR." The output is 1 only when both inputs are 0. The moment either input goes high, the output goes low.

Truth table:
  0 NOR 0 = 1
  0 NOR 1 = 0
  1 NOR 0 = 0
  1 NOR 1 = 0

NOR (like NAND) is a universal gate — you can build any logic function from NOR gates alone. It also happens to make a beautifully simple SR latch — two NOR gates, each feeding back into the other.`,
    },
    {
      title: 'Test the Circuit',
      text: `The circuit wires your OR block through a NOT gate.`,
      build(cid) {
        const orDef = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'OR');
        if (!orDef) return;
        const orA   = orDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const orB   = orDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const orOut = orDef.ports.find(p => p.dir==='out')?.id;

        const gA   = addNode(cid, 'INPUT',    60,  60, 'A');  gA._value = 0;
        const gB   = addNode(cid, 'INPUT',    60, 180, 'B');  gB._value = 0;
        const gOr  = addNode(cid, orDef.id,  240, 120, '');
        const gNot = addNode(cid, 'NOT',      410, 120, '');
        const gOut = addNode(cid, 'OUTPUT',   560, 120, 'OUT');

        addWire(cid, gA.id,  'out',  gOr.id,  orA);
        addWire(cid, gB.id,  'out',  gOr.id,  orB);
        addWire(cid, gOr.id, orOut,  gNot.id, 'a');
        addWire(cid, gNot.id,'out',  gOut.id, 'a');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `The output is 1 only when both inputs are 0. Try all four combinations.`,
      saveBlock: 'NOR',
      test: {
        inputs:  ['A', 'B'],
        outputs: ['OUT'],
        rows: [
          { in: [0, 0], out: [1] },
          { in: [0, 1], out: [0] },
          { in: [1, 0], out: [0] },
          { in: [1, 1], out: [0] },
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `NOR and NAND are both universal gates. The reason they appear so often in hardware is that they map directly to efficient transistor arrangements in silicon — a CMOS NOR gate is particularly compact because it matches the natural way PMOS and NMOS transistors can be connected.

The NOR-based SR latch (two NOR gates in a loop) is the simplest memory circuit possible, and it is the core of most flip-flop designs.`,
    },
  ],
});
