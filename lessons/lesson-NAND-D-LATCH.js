// Logic Lab — Lesson 13: NAND-Based D Latch

registerLesson({
  id: 'NAND_D_Latch',
  title: 'Lesson 13 · NAND D Latch',
  requires: ['D_Latch'],

  steps: [
    {
      title: 'Why Build It From NAND?',
      text: `The D Latch you built works correctly, but it uses a mix of different gate types (NOR, AND, and NOT). In real hardware like building a circuit on a breadboard this is inconvenient, because you'd need multiple different chip packages.

NAND gates are the most common and cheapest option. Better yet, NAND is a "universal" gate, meaning you can recreate any other logic gate using only NANDs. So instead of mixing gate types, we can build the entire D Latch using nothing but NAND gates.

This NAND-only version uses 5 gates total:
  1 — NAND(DATA, DATA): Inverts DATA (acts like NOT)
  2 — NAND(DATA, STORE): Produces S̄, the "Set" signal
  3 — NAND(NOT_DATA, STORE): Produces the "Reset" signal
  4 & 5 — Form the SR latch core: Stores the output`,
    },
    {
      title: 'NAND SR Latch',
      text: `The SR latch is the "memory" core of the D Latch it's the part that actually holds a 0 or 1. It's built from two NAND gates whose outputs feed back into each other:
  
  4: NAND(S̄, Q̄) → produces Q
  5: NAND(R̄, Q) → produces Q̄

The bar over S̄ and R̄ means they are "active-low" they trigger when the signal goes LOW (0), not high.

Here's what happens in each case:
  Set:
    Gate 4 is forced high → Q becomes 1
    (latch stores a 1)
  Reset:
    Gate 5 is forced high → Q̄ becomes 1
    so Q becomes 0 (latch stores a 0)
  Hold:
    Neither gate is forced the outputs lock 
each other in place, remembering the last value.`,
    },
    {
      title: 'Test the Circuit',
      text: `The full NAND-only D Latch has been assembled for you. It uses 5 NAND blocks wired as:

  Gate 1: NAND(DATA, DATA)    → NOT_DATA
  Gate 2: NAND(DATA, STORE)   → S̄
  Gate 3: NAND(NOT_DATA,STORE)→ R̄
  Gate 4: NAND(S̄, Q̄from5)   → Q
  Gate 5: NAND(R̄, Q_from4)   → Q̄ (internal)

Verify it behaves identically to the NOR-based D Latch. The outputs of Gate 4 = Q, Gate 5 = Q̄.`,
      build(cid) {
        const nandDef = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'NAND');
        if (!nandDef) return;
        const nA   = nandDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const nB   = nandDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const nOut = nandDef.ports.find(p => p.dir==='out')?.id;

        const gData  = addNode(cid, 'INPUT',     60,  80, 'DATA');  gData._value  = 0;
        const gStore = addNode(cid, 'INPUT',     60, 260, 'STORE'); gStore._value = 0;

        // Gate 1: NOT(DATA) = NAND(DATA, DATA)
        const gN1 = addNode(cid, nandDef.id,  240,  40, '');
        addWire(cid, gData.id,  'out', gN1.id, nA);
        addWire(cid, gData.id,  'out', gN1.id, nB);

        // Gate 2: S̄ = NAND(DATA, STORE)
        const gN2 = addNode(cid, nandDef.id,  240, 160, '');
        addWire(cid, gData.id,  'out', gN2.id, nA);
        addWire(cid, gStore.id, 'out', gN2.id, nB);

        // Gate 3: R̄ = NAND(NOT_DATA, STORE)
        const gN3 = addNode(cid, nandDef.id,  240, 300, '');
        addWire(cid, gN1.id,   nOut,  gN3.id, nA);
        addWire(cid, gStore.id,'out', gN3.id, nB);

        // Gate 4: Q = NAND(S̄, Q̄from5)
        const gN4 = addNode(cid, nandDef.id,  460, 120, '');
        addWire(cid, gN2.id,   nOut, gN4.id, nA);
        // Gate 5 → Gate 4 feedback wired after Gate 5 is placed

        // Gate 5: Q̄ = NAND(R̄, Q_from4)
        const gN5 = addNode(cid, nandDef.id,  460, 280, '');
        addWire(cid, gN3.id,   nOut, gN5.id, nA);
        addWire(cid, gN4.id,   nOut, gN5.id, nB); // Q → Gate 5 B

        // Complete feedback: Gate 5 (Q̄) → Gate 4 B
        addWire(cid, gN5.id,   nOut, gN4.id, nB);

        // Output
        const gQ = addNode(cid, 'OUTPUT', 660, 120, 'Q');
        addWire(cid, gN4.id, nOut, gQ.id, 'a');
      },
    },
    {
      title: 'Verify the Latch',
      text: `The behaviour should match the NOR D Latch exactly. Same step-through:`,
      saveBlock: 'NAND_D_LATCH',
      test: {
        inputs:  ['DATA', 'STORE'],
        outputs: ['Q'],
        rows: [
          { in: [1, 1], out: [1] },
          { in: [1, 0], out: [1] },
          { in: [0, 0], out: [1] },
          { in: [0, 1], out: [0] },
          { in: [0, 0], out: [0] },
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `With 2 74HC00 quad NAND gate ICs; a chip that contains four NAND gates. you can build a complete D Latch on a breadboard with no other components except resistors for the LEDs.

This is why NAND is called universal: any logic function, including memory, can be built using only NAND gates. That makes it economical, one chip type, bought in bulk, used everywhere.`,
    },
  ],
});
