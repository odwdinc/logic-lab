// Logic Lab Lesson — The 4-Bit Ripple Adder

registerLesson({
  id: 'Ripple_Adder',
  title: 'Lesson 9 · 4-Bit Ripple Adder',
  requires: ['Full_Adder'],

  steps: [
    {
      title: 'Concept',
      text: `Connect four full adders in a chain. Each adder handles one bit position. The carry-out of each adder feeds into the carry-in of the next one to the left — this is called "ripple carry."

Bit position:   3          2          1          0
             [FA3] ←c  [FA2] ←c  [FA1] ←c  [FA0] ← CIN=0
A inputs:     A3         A2         A1         A0
B inputs:     B3         B2         B1         B0
Sum outputs:  S3         S2         S1         S0
Carry-out from FA3 → OVF (overflow)`,
    },
    {
      title: 'Build the Circuit',
      text: `The input and output nodes have been placed for you. You need to add four FULL ADDER blocks and wire them.

From the library, drag in four FULL ADDER blocks. Place them left to right for bits 0–3.

Wire each stage:
  · A0,B0 → FA0 inputs;  FA0 COUT → FA1 CIN
  · A1,B1 → FA1 inputs;  FA1 COUT → FA2 CIN
  · A2,B2 → FA2 inputs;  FA2 COUT → FA3 CIN
  · A3,B3 → FA3 inputs;  FA3 COUT → OVF
  · Each FA SUM output → its S output node
  · CIN → FA0 carry-in (tie low: leave unconnected or connect to a 0-valued INPUT)`,
      build(cid) {
        // Bit 0 (rightmost)
        const gA0  = addNode(cid, 'INPUT',  60,  60, 'A0');  gA0._value  = 0;
        const gB0  = addNode(cid, 'INPUT',  60, 140, 'B0');  gB0._value  = 0;
        // Bit 1
        const gA1  = addNode(cid, 'INPUT', 280,  60, 'A1');  gA1._value  = 0;
        const gB1  = addNode(cid, 'INPUT', 280, 140, 'B1');  gB1._value  = 0;
        // Bit 2
        const gA2  = addNode(cid, 'INPUT', 500,  60, 'A2');  gA2._value  = 0;
        const gB2  = addNode(cid, 'INPUT', 500, 140, 'B2');  gB2._value  = 0;
        // Bit 3 (leftmost)
        const gA3  = addNode(cid, 'INPUT', 720,  60, 'A3');  gA3._value  = 0;
        const gB3  = addNode(cid, 'INPUT', 720, 140, 'B3');  gB3._value  = 0;
        // Carry-in (tie to 0)
        const gCin = addNode(cid, 'INPUT',  60, 220, 'CIN'); gCin._value = 0;

        // Sum outputs
        addNode(cid, 'OUTPUT',  60, 320, 'S0');
        addNode(cid, 'OUTPUT', 280, 320, 'S1');
        addNode(cid, 'OUTPUT', 500, 320, 'S2');
        addNode(cid, 'OUTPUT', 720, 320, 'S3');
        // Overflow
        addNode(cid, 'OUTPUT', 940, 220, 'OVF');
      },
    },
    {
      title: 'Test: 3 + 4 = 7',
      text: `Set the inputs for 3 + 4:
  A = 0011  →  A3=0, A2=0, A1=1, A0=1
  B = 0100  →  B3=0, B2=1, B1=0, B0=0
  CIN = 0

Expected: S3=0, S2=1, S1=1, S0=1 (binary 0111 = 7), OVF=0`,
      test: {
        inputs:  ['A3', 'A2', 'A1', 'A0', 'B3', 'B2', 'B1', 'B0', 'CIN'],
        outputs: ['S3', 'S2', 'S1', 'S0', 'OVF'],
        rows: [
          // 3 + 4 = 7
          { in: [0, 0, 1, 1,  0, 1, 0, 0,  0], out: [0, 1, 1, 1, 0] },
          // 5 + 5 = 10
          { in: [0, 1, 0, 1,  0, 1, 0, 1,  0], out: [1, 0, 1, 0, 0] },
          // 15 + 1 = overflow
          { in: [1, 1, 1, 1,  0, 0, 0, 1,  0], out: [0, 0, 0, 0, 1] },
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
