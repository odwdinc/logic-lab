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
      title: 'Test the Circuit',
      text: `Both inputs are inverted before reaching the NAND gate. De Morgan's theorem guarantees this is equivalent to OR. Try each input combination and verify the output matches what you expect from OR.`,
      build(cid) {
        const nandDef = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'NAND');
        if (!nandDef) return;
        const nandA   = nandDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const nandB   = nandDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const nandOut = nandDef.ports.find(p => p.dir==='out')?.id;

        const gA    = addNode(cid, 'INPUT',     60,  60, 'A');   gA._value = 0;
        const gB    = addNode(cid, 'INPUT',     60, 180, 'B');   gB._value = 0;
        const gNA   = addNode(cid, 'NOT',       220,  60, '');
        const gNB   = addNode(cid, 'NOT',       220, 180, '');
        const gNAND = addNode(cid, nandDef.id,  390, 120, '');
        const gOut  = addNode(cid, 'OUTPUT',    560, 120, 'OUT');

        addWire(cid, gA.id,    'out',    gNA.id,   'a');
        addWire(cid, gB.id,    'out',    gNB.id,   'a');
        addWire(cid, gNA.id,   'out',    gNAND.id, nandA);
        addWire(cid, gNB.id,   'out',    gNAND.id, nandB);
        addWire(cid, gNAND.id, nandOut,  gOut.id,  'a');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `Only the first row (both inputs 0) produces a 0 output. Every other combination produces 1.`,
      saveBlock: 'OR',
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
      title: 'Key Insight',
      text: `Compare OR and AND side by side:
  AND — output is 1 only when ALL inputs are 1
  OR  — output is 1 when ANY input is 1

These two gates, combined with NOT, can express any logical statement. This is the foundation of Boolean algebra and every piece of digital logic ever designed.`,
    },
  ],
});
