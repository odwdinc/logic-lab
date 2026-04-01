// Logic Lab Lesson — The 4-Bit Ripple Adder

registerLesson({
  id: 'Ripple_Adder',
  title: 'Lesson 9 · 4-Bit Ripple Adder',
  requires: ['Full_Adder'],

  steps: [
    {
      title: 'Concept',
      text: `Connect four full adders in a chain. Each adder handles one bit position. The carry-out of each adder feeds into the carry-in of the next one to the left — this is called "ripple carry."

Bit position:  3          2          1          0
             [FA3] ←c   [FA2] ←c   [FA1] ←c   [FA0] ← CIN=0
A inputs:     A3         A2         A1         A0
B inputs:     B3         B2         B1         B0
Sum outputs:  S3         S2         S1         S0
Carry-out from FA3 → OVF (overflow)`,
    },
    {
      title: 'Test the Circuit',
      text: `Four FULL_ADDER blocks are chained from bit 0 (right) to bit 3 (left). The carry-out of each stage feeds the carry-in of the next.

Try adding 3 + 4:
  A = 0011  (A3=0, A2=0, A1=1, A0=1)
  B = 0100  (B3=0, B2=1, B1=0, B0=0)
  Expected: S=0111 (7), OVF=0

Then try 15 + 1 to see overflow in action.`,
      build(cid) {
        const faDef  = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'FULL_ADDER');
        if (!faDef) return;
        const faA    = faDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const faB    = faDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const faCin  = faDef.ports.find(p => p.dir==='in'  && p.name==='CIN')?.id;
        const faSum  = faDef.ports.find(p => p.dir==='out' && p.name==='SUM')?.id;
        const faCout = faDef.ports.find(p => p.dir==='out' && p.name==='COUT')?.id;

        const gCin = addNode(cid, 'INPUT', -90, 350, 'CIN'); gCin._value = 0;

        const gA  = addNode(cid, 'INPUT',  -90, 100, 'IN-A'); gA._bits  = 4; gA._value  = 0;
        const gB  = addNode(cid, 'INPUT',  -90, 250, 'IN-B'); gB._bits  = 4; gB._value  = 0;
        const bA  = addNode(cid, 'BUS_TO_BITS',  40, 45, 'A-Bits');   bA._bits  = 4;
        const bB  = addNode(cid, 'BUS_TO_BITS',  40, 200, 'B-Bits');   bB._bits  = 4;
        addWire(cid, gA.id, 'out', bA.id, 'bus');
        addWire(cid, gB.id, 'out', bB.id, 'bus');

        const gS  = addNode(cid, 'OUTPUT',  1600, 200, 'OUT-S');   gS._bits  = 4;
        const bS  = addNode(cid, 'BITS_TO_BUS',  1400, 100, 'S-Bits');   bS._bits  = 4;
        addWire(cid, bS.id, 'bus', gS.id, 'a',);


        const faNodes = [];
        for (let i = 0; i < 4; i++) {
          const x = 240 + i * 310;
          const gFA = addNode(cid, faDef.id,   x, 270, '');
          addWire(cid, bA.id,  `b${i}`,  gFA.id, faA);
          addWire(cid, bB.id,  `b${i}`,  gFA.id, faB);
          addWire(cid, gFA.id, faSum,  bS.id,  `b${i}`);
          faNodes.push(gFA);
        }

        // Chain carries: CIN → FA0, FA0.COUT → FA1.CIN, ...
        addWire(cid, gCin.id,       'out',   faNodes[0].id, faCin);
        addWire(cid, faNodes[0].id, faCout,  faNodes[1].id, faCin);
        addWire(cid, faNodes[1].id, faCout,  faNodes[2].id, faCin);
        addWire(cid, faNodes[2].id, faCout,  faNodes[3].id, faCin);

        // Overflow output from FA3
        const gOvf = addNode(cid, 'OUTPUT', 240 + 4 * 310, 270, 'OVF');
        addWire(cid, faNodes[3].id, faCout, gOvf.id, 'a');
      },
    },
    {
      title: 'Test: Sums and Overflow',
      text: `Work through three cases: a normal sum, a larger sum, and an overflow.

  3 + 4 = 7:   A=0011, B=0100, CIN=0 → S=0111, OVF=0
  5 + 5 = 10:  A=0101, B=0101, CIN=0 → S=1010, OVF=0
  15 + 1 = 16: A=1111, B=0001, CIN=0 → S=0000, OVF=1`,
      saveBlock: 'ALU',
      test: {
        inputs:  ['IN-A', 'IN-B', 'CIN'],
        outputs: ['OUT-S', 'OVF'],
        rows: [
          { in: [3,  4,  0], out: [7, 0] },
          { in: [5,  5,  0], out: [10, 0] },
          { in: [15, 1,  0], out: [0, 1] },
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `You just built an Arithmetic Logic Unit (ALU) — the component at the heart of every CPU.

When the result exceeds 15 (the max for 4 bits), the carry-out lights up and the sum "wraps around" to zero. This is integer overflow — the same bug that crashed the Ariane 5 rocket in 1996.

The ALU in your phone does this same operation billions of times per second, for numbers that are 64 bits wide. It is built from the exact same pattern: XOR for sum, AND + OR for carry — just repeated 64 times instead of 4.`,
    },
  ],
});
