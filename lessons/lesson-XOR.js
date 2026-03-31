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
      text: `The A, B inputs and OUT output have been placed for you.

From the library, drag in:
  · Your saved OR block
  · Your saved NAND block
  · One AND gate (from the built-in gates)

Wire them up:
  A ──┬── OR ───┐
      │          AND ── OUT
  B ──┤── NAND ─┘

Both OR and NAND receive A and B. Their outputs feed the AND gate.`,
      build(cid) {
        const gA = addNode(cid, 'INPUT',   60,  80, 'A');  gA._value = 0;
        const gB = addNode(cid, 'INPUT',   60, 200, 'B');  gB._value = 0;
        addNode(cid, 'OUTPUT', 560, 140, 'OUT');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `XOR outputs 1 only when the inputs differ. When both are 0 or both are 1, the output is 0.`,
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
      title: 'Save as Block',
      text: `The Half Adder lesson needs this XOR gate. Save it as a block:

1. Select all nodes (drag a selection box around everything)
2. Right-click any selected node → "Save as Block"
3. Name it exactly:  XOR`,
      blockCheck: 'XOR',
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
