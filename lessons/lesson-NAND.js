// Logic Lab Lesson — The NAND Gate

registerLesson({
  id: 'NAND_Gate',
  title: 'Lesson 3 · The NAND Gate',
  requires: ['NOT_Gate'],

  steps: [
    {
      title: 'Concept',
      text: `NAND means "NOT AND." Take the output of an AND gate and feed it through a NOT gate. The result is the opposite of AND — the output is 1 in every case except when both inputs are 1.

The NAND gate is famously "universal" — every other logic gate can be built from NANDs alone. Entire CPUs have been designed using only NAND gates.`,
    },
    {
      title: 'Build the Circuit',
      text: `A and B feed an AND gate. The AND output feeds a NOT gate, whose output connects to OUT. This is your first composed gate — built from two simpler ones.`,
      build(cid) {
        const gA   = addNode(cid, 'INPUT',   60,  60, 'A');   gA._value = 0;
        const gB   = addNode(cid, 'INPUT',   60, 150, 'B');   gB._value = 0;
        const gAND = addNode(cid, 'AND',    220, 105, 'AND');
        const gNOT = addNode(cid, 'NOT',    370, 105, 'NOT');
        const gOut = addNode(cid, 'OUTPUT', 520, 105, 'OUT');
        addWire(cid, gA.id,   'out', gAND.id, 'a');
        addWire(cid, gB.id,   'out', gAND.id, 'b');
        addWire(cid, gAND.id, 'out', gNOT.id, 'a');
        addWire(cid, gNOT.id, 'out', gOut.id, 'a');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `The only time the output goes low (0) is when both inputs are high. Every other combination outputs 1.`,
      saveBlock: 'NAND',
      test: {
        inputs:  ['A', 'B'],
        outputs: ['OUT'],
        rows: [
          { in: [0, 0], out: [1] },
          { in: [0, 1], out: [1] },
          { in: [1, 0], out: [1] },
          { in: [1, 1], out: [0] },
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `Because NAND is universal, you could theoretically build an entire computer using only NAND gates. Real chip designers often target NAND-heavy implementations because NAND cells are efficient to manufacture in silicon.

Everything from here on is the same idea scaled up: combine simple parts into something more capable, then treat that as a new building block.`,
    },
  ],
});
