// Logic Lab Lesson — The Full Adder

registerLesson({
  id: 'Full_Adder',
  title: 'Lesson 8 · The Full Adder',
  requires: ['Half_Adder'],

  steps: [
    {
      title: 'Concept',
      text: `A half adder only handles two bits. Real binary addition has a third input: the carry-in from the previous column.

A full adder takes three bits (A, B, CIN) and produces two outputs (SUM, COUT).

Build it by chaining two half-adder stages:
  Stage 1:  add A and B          → partial sum + carry1
  Stage 2:  add partial sum + CIN → SUM + carry2
  COUT = OR(carry1, carry2)

From the library you have: HALF ADDER block, OR block, and built-in gates.`,
    },
    {
      title: 'Build the Circuit',
      text: `The A, B, CIN inputs and SUM, COUT outputs have been placed for you.

From the library, drag in:
  · Two HALF ADDER blocks  (or two sets of XOR + AND)
  · Your saved OR block  (for combining the two carry signals)

Wire them up:
  A ─┐
     [HA1]─ partial_sum ─┐
  B ─┘   └─ carry1 ─┐    [HA2]─ SUM
                    │CIN ┘   └─ carry2 ──┐
                    └─────────────────── OR ── COUT`,
      build(cid) {
        const gA   = addNode(cid, 'INPUT',   60,  60, 'A');    gA._value   = 0;
        const gB   = addNode(cid, 'INPUT',   60, 160, 'B');    gB._value   = 0;
        const gCin = addNode(cid, 'INPUT',   60, 280, 'CIN');  gCin._value = 0;
        addNode(cid, 'OUTPUT', 620,  80, 'SUM');
        addNode(cid, 'OUTPUT', 620, 240, 'COUT');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `Work through all 8 combinations of A, B, and CIN.
SUM = A XOR B XOR CIN.  COUT = 1 when two or more inputs are 1.`,
      test: {
        inputs:  ['A', 'B', 'CIN'],
        outputs: ['SUM', 'COUT'],
        rows: [
          { in: [0, 0, 0], out: [0, 0] },
          { in: [0, 0, 1], out: [1, 0] },
          { in: [0, 1, 0], out: [1, 0] },
          { in: [0, 1, 1], out: [0, 1] },
          { in: [1, 0, 0], out: [1, 0] },
          { in: [1, 0, 1], out: [0, 1] },
          { in: [1, 1, 0], out: [0, 1] },
          { in: [1, 1, 1], out: [1, 1] },
        ],
      },
    },
    {
      title: 'Save as Block',
      text: `The Ripple Adder lesson chains four of these together. Save it as a block:

1. Select all nodes (drag a selection box around everything)
2. Right-click any selected node → "Save as Block"
3. Name it exactly:  FULL_ADDER`,
      blockCheck: 'FULL_ADDER',
    },
    {
      title: 'Key Insight',
      text: `The full adder is a complete column of binary arithmetic. It handles any combination of three 1-bit inputs and produces a correct 2-bit result.

Chain enough full adders together and you can add numbers of any size. The 4-bit ripple adder in the next lesson does exactly that — four full adders wired in a chain, carry rippling from right to left.`,
    },
  ],
});
