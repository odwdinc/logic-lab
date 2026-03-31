// Logic Lab Lesson — The Half Adder

registerLesson({
  id: 'Half_Adder',
  title: 'Lesson 7 · The Half Adder',
  requires: ['Binary_Numbers'],

  steps: [
    {
      title: 'Concept',
      text: `A half adder takes two single bits and adds them. The result has two parts:

  Sum bit   — the "ones place" of the result  (XOR)
  Carry bit — the "twos place" carry out       (AND)

Work through the four cases:
  0 + 0 = 00  →  carry=0, sum=0
  0 + 1 = 01  →  carry=0, sum=1
  1 + 0 = 01  →  carry=0, sum=1
  1 + 1 = 10  →  carry=1, sum=0

The sum column is XOR. The carry column is AND.`,
    },
    {
      title: 'Build the Circuit',
      text: `The A, B inputs and SUM, CARRY outputs have been placed for you.

From the library, drag in:
  · Your saved XOR block
  · One AND gate (from the built-in gates)

Wire them up:
  A ──┬── XOR ── SUM
      │
  B ──┤
      └── AND ── CARRY`,
      build(cid) {
        const gA = addNode(cid, 'INPUT',   60,  80, 'A');  gA._value = 0;
        const gB = addNode(cid, 'INPUT',   60, 200, 'B');  gB._value = 0;
        addNode(cid, 'OUTPUT', 420,  60, 'SUM');
        addNode(cid, 'OUTPUT', 420, 220, 'CARRY');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `Work through all four input combinations. SUM should match XOR, CARRY should match AND.`,
      test: {
        inputs:  ['A', 'B'],
        outputs: ['SUM', 'CARRY'],
        rows: [
          { in: [0, 0], out: [0, 0] },
          { in: [0, 1], out: [1, 0] },
          { in: [1, 0], out: [1, 0] },
          { in: [1, 1], out: [0, 1] },
        ],
      },
    },
    {
      title: 'Save as Block',
      text: `The Full Adder lesson chains two of these together. Save it as a block:

1. Select all nodes (drag a selection box around everything)
2. Right-click any selected node → "Save as Block"
3. Name it exactly:  HALF_ADDER`,
      blockCheck: 'HALF_ADDER',
    },
    {
      title: 'Key Insight',
      text: `You just built something that does arithmetic out of pure logic. The gates do not "know" they are adding — they are just responding to voltages. The math emerges from the structure.

The limitation of a half adder is that it only handles two bits with no carry-in. Real binary addition needs to handle the carry coming in from the column to the right. That is what the full adder adds.`,
    },
  ],
});
