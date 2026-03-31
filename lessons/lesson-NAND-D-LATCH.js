// Logic Lab — Lesson 13: NAND-Based D Latch

registerLesson({
  id: 'NAND_D_Latch',
  title: 'Lesson 13 · NAND D Latch',
  requires: ['D_Latch'],

  steps: [
    {
      title: 'Why Build It From NAND?',
      text: `The NOR-based D Latch you built is logically correct, but it mixes NOR gates (custom blocks) with AND and NOT gates. In real hardware — specifically, on a breadboard with 74-series chips — you often only have one type of gate chip available.

NAND is the most common and cheapest gate chip. Since NAND is universal, you can build the entire D Latch from NAND gates alone. This is exactly what the script did on the breadboard.

The structure uses 5 NAND gates:
  1 — NAND(DATA, DATA)         = NOT(DATA)
  2 — NAND(DATA, STORE)        = S̄  (active-low SET)
  3 — NAND(NOT_DATA, STORE)    = R̄  (active-low RESET)
  4,5 — NAND SR latch (active-low SR latch)`,
    },
    {
      title: 'NAND SR Latch',
      text: `The NAND SR latch uses active-low inputs: the output Q goes high when S̄ goes LOW, and resets when R̄ goes LOW.

  NAND1(S̄, Q̄) = Q
  NAND2(R̄, Q)  = Q̄

When S̄=0 (SET active): NAND1 output forced to 1 = Q ✓
When R̄=0 (RESET active): NAND2 output forced to 1 = Q̄, so Q=0 ✓
When S̄=1, R̄=1 (hold): each output locks the other through feedback.

The gate generating S̄ and R̄:
  S̄ = NAND(DATA, STORE)         → low when DATA=1 AND STORE=1 (SET)
  R̄ = NAND(NOT_DATA, STORE)     → low when DATA=0 AND STORE=1 (RESET)`,
    },
    {
      title: 'Build the Circuit',
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
      text: `"NAD chips" from the script — that is exactly what these are: 74HC00 quad NAND gate ICs. By using a chip that contains four NAND gates, and a second chip for the remaining one, you can build a complete D Latch on a breadboard with no other components except resistors for the LEDs.

This is why NAND is called universal: any logic function, including memory, can be built using only NAND gates. That makes it economical — one chip type, bought in bulk, used everywhere.`,
    },
  ],
});
