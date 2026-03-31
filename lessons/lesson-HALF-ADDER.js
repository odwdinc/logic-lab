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
      text: `The circuit has been built for you. A and B each feed both a XOR block and an AND gate:

  A ──┬── XOR ── SUM
      │
  B ──┤
      │
      └── AND ── CARRY

XOR gives the digit you write down. AND gives the digit you carry. Notice: 1+1=2, which in binary is 10 — CARRY=1, SUM=0.`,
      build(cid) {
        const xorDef = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'XOR');
        if (!xorDef) return;
        const xorA   = xorDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const xorB   = xorDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const xorOut = xorDef.ports.find(p => p.dir==='out')?.id;

        const gA     = addNode(cid, 'INPUT',    60,  80, 'A');  gA._value = 0;
        const gB     = addNode(cid, 'INPUT',    60, 200, 'B');  gB._value = 0;
        const gXOR   = addNode(cid, xorDef.id, 250,  60, '');
        const gAND   = addNode(cid, 'AND',      250, 210, '');
        const gSum   = addNode(cid, 'OUTPUT',   440,  60, 'SUM');
        const gCarry = addNode(cid, 'OUTPUT',   440, 210, 'CARRY');

        addWire(cid, gA.id,   'out',   gXOR.id, xorA);
        addWire(cid, gB.id,   'out',   gXOR.id, xorB);
        addWire(cid, gA.id,   'out',   gAND.id, 'a');
        addWire(cid, gB.id,   'out',   gAND.id, 'b');
        addWire(cid, gXOR.id, xorOut,  gSum.id,   'a');
        addWire(cid, gAND.id, 'out',   gCarry.id, 'a');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `Work through all four input combinations. SUM should match XOR, CARRY should match AND.`,
      saveBlock: 'HALF_ADDER',
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
      title: 'Key Insight',
      text: `You just built something that does arithmetic out of pure logic. The gates do not "know" they are adding — they are just responding to voltages. The math emerges from the structure.

The limitation of a half adder is that it only handles two bits with no carry-in. Real binary addition needs to handle the carry coming in from the column to the right. That is what the full adder adds.`,
    },
  ],
});
