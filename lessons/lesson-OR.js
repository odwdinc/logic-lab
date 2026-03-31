// Logic Lab Lesson — The OR Gate

registerLesson({
  id: 'OR_Gate',
  title: 'Lesson 4 · The OR Gate',
  requires: ['NAND_Gate'],

  steps: [
    {
      title: 'Concept',
      text: `OR means the output is 1 if either or both inputs are 1. It is only 0 when both inputs are 0.

You are going to build it by inverting both inputs with NOT gates, then feeding those inverted signals into your NAND block. This is De Morgan's theorem:

  NOT(NOT A  AND  NOT B)  =  A OR B`,
    },
    {
      title: 'Build the Circuit',
      text: `The A, B inputs and OUT output have been placed for you.

From the library, drag in:
  · Two NOT gates
  · Your saved NAND block

Wire them up:
  A ── NOT ──┐
              NAND ── OUT
  B ── NOT ──┘`,
      build(cid) {
        const gA = addNode(cid, 'INPUT',   60,  80, 'A');  gA._value = 0;
        const gB = addNode(cid, 'INPUT',   60, 200, 'B');  gB._value = 0;
        addNode(cid, 'OUTPUT', 520, 140, 'OUT');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `Only the first row (both inputs 0) produces a 0 output. Every other combination produces 1.`,
      test: {
        inputs:  ['A', 'B'],
        outputs: ['OUT'],
        rows: [
          { in: [0, 0], out: [0] },
          { in: [0, 1], out: [1] },
          { in: [1, 0], out: [1] },
          { in: [1, 1], out: [1] },
        ],
      },
    },
    {
      title: 'Save as Block',
      text: `The next lesson needs an OR gate. Save your circuit as a block:

1. Select all nodes (drag a selection box around everything)
2. Right-click any selected node → "Save as Block"
3. Name it exactly:  OR`,
      blockCheck: 'OR',
    },
    {
      title: 'Key Insight',
      text: `Compare OR and AND side by side:
  AND — output is 1 only when ALL inputs are 1
  OR  — output is 1 when ANY input is 1

These two gates, combined with NOT, can express any logical statement. This is the foundation of Boolean algebra and every piece of digital logic ever designed.`,
    },
  ],
});
