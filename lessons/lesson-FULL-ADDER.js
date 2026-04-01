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
  COUT = OR(carry1, carry2)`,
    },
    {
      title: 'Test the Circuit',
      text: `Two HALF_ADDER blocks are chained, with an OR block combining their carry outputs.

Trace the carry path: 
  carry1 OR carry2 goes high whenever two or more inputs (A, B, CIN) are 1.`,
      build(cid) {
        const haDef  = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'HALF_ADDER');
        const orDef  = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'OR');
        if (!haDef || !orDef) return;
        const haA    = haDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const haB    = haDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const haSum  = haDef.ports.find(p => p.dir==='out' && p.name==='SUM')?.id;
        const haCar  = haDef.ports.find(p => p.dir==='out' && p.name==='CARRY')?.id;
        const orA    = orDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const orB    = orDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const orOut  = orDef.ports.find(p => p.dir==='out')?.id;

        const gA    = addNode(cid, 'INPUT',    60,  60, 'A');   gA._value   = 0;
        const gB    = addNode(cid, 'INPUT',    60, 160, 'B');   gB._value   = 0;
        const gCin  = addNode(cid, 'INPUT',    60, 290, 'CIN'); gCin._value = 0;
        const gHA1  = addNode(cid, haDef.id,  250, 100, '');
        const gHA2  = addNode(cid, haDef.id,  460,  60, '');
        const gOR   = addNode(cid, orDef.id,  560, 240, '');
        const gSum  = addNode(cid, 'OUTPUT',   680,  60, 'SUM');
        const gCout = addNode(cid, 'OUTPUT',   720, 240, 'COUT');

        addWire(cid, gA.id,   'out',  gHA1.id, haA);
        addWire(cid, gB.id,   'out',  gHA1.id, haB);
        addWire(cid, gHA1.id, haSum,  gHA2.id, haA);
        addWire(cid, gCin.id, 'out',  gHA2.id, haB);
        addWire(cid, gHA1.id, haCar,  gOR.id,  orA);
        addWire(cid, gHA2.id, haCar,  gOR.id,  orB);
        addWire(cid, gHA2.id, haSum,  gSum.id,  'a');
        addWire(cid, gOR.id,  orOut,  gCout.id, 'a');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `Work through all 8 combinations of A, B, and CIN.
SUM = A XOR B XOR CIN.  COUT = 1 when two or more inputs are 1.`,
      saveBlock: 'FULL_ADDER',
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
      title: 'Key Insight',
      text: `The full adder is a complete column of binary arithmetic. It handles any combination of three 1-bit inputs and produces a correct 2-bit result.

Chain enough full adders together and you can add numbers of any size. The 4-bit ripple adder in the next lesson does exactly that — four full adders wired in a chain, carry rippling from right to left.`,
    },
  ],
});
