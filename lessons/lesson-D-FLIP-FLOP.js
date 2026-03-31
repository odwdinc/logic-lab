// Logic Lab — Lesson 15: D Flip-Flop (Edge-Triggered)

registerLesson({
  id: 'D_Flip_Flop',
  title: 'Lesson 15 · D Flip-Flop',
  requires: ['Async_Register'],

  steps: [
    {
      title: 'Edge-Triggered Memory',
      text: `The D Latch is level-triggered: while STORE is high, the output continuously tracks DATA. This causes the race condition problem.

The solution is edge-triggered memory — capture DATA only at the instant the clock transitions from LOW to HIGH (the rising edge), then freeze immediately.

To build this, chain two D Latches:
  Latch 1 — transparent when CLK=LOW  (captures DATA while clock is low)
  Latch 2 — transparent when CLK=HIGH (copies Latch 1 when clock goes high)

On the rising edge (CLK 0→1): Latch 1 freezes with the current DATA. Latch 2 opens and copies Latch 1's frozen value. The result: Q updates exactly once per rising edge.`,
    },
    {
      title: 'Build the Circuit',
      text: `The circuit chains two D_LATCH blocks with complementary clock signals:

  DATA ──── Latch1.DATA      Q of Latch1 ──── Latch2.DATA
  NOT(CLK) → Latch1.STORE   CLK ──────────── Latch2.STORE
                              Latch2.Q ──────── OUTPUT Q

Latch1 is transparent when NOT(CLK)=1 (i.e. CLK=0), so it tracks DATA while the clock is low.
When CLK goes high: Latch1 freezes → Latch2 opens and copies Latch1's frozen value → Q updates.`,
      build(cid) {
        const lDef   = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'D_LATCH');
        if (!lDef) return;
        const lData  = lDef.ports.find(p => p.dir==='in'  && p.name==='DATA')?.id;
        const lStore = lDef.ports.find(p => p.dir==='in'  && p.name==='STORE')?.id;
        const lQ     = lDef.ports.find(p => p.dir==='out' && p.name==='Q')?.id;

        const gData = addNode(cid, 'INPUT',   60,  80, 'DATA'); gData._value = 0;
        const gClk  = addNode(cid, 'INPUT',   60, 210, 'CLK');  gClk._value  = 0;
        const gNot  = addNode(cid, 'NOT',     220, 210, '');
        const gL1   = addNode(cid, lDef.id,   380,  80, '');   // master latch
        const gL2   = addNode(cid, lDef.id,   620,  80, '');   // slave latch
        const gQ    = addNode(cid, 'OUTPUT',   860,  80, 'Q');

        addWire(cid, gData.id, 'out', gL1.id, lData);
        addWire(cid, gClk.id,  'out', gNot.id,'a');
        addWire(cid, gNot.id,  'out', gL1.id, lStore);  // NOT(CLK) → L1 STORE
        addWire(cid, gL1.id,   lQ,   gL2.id,  lData);   // L1 Q → L2 DATA
        addWire(cid, gClk.id,  'out', gL2.id, lStore);  // CLK → L2 STORE
        addWire(cid, gL2.id,   lQ,   gQ.id,   'a');
      },
    },
    {
      title: 'Verify Edge-Triggered Behaviour',
      text: `Follow this sequence exactly:
1. Start with DATA=0, CLK=0
2. Click CLK → 1  (rising edge, Q captures DATA=0)
3. Keep CLK=1, change DATA=1  (Q should NOT change — latch1 is frozen)
4. Click CLK → 0  (falling edge, Q holds; Latch1 becomes transparent again, now tracks DATA=1)
5. Click CLK → 1  (next rising edge, Q captures DATA=1)`,
      saveBlock: 'D_FLIP_FLOP',
      test: {
        inputs:  ['DATA', 'CLK'],
        outputs: ['Q'],
        rows: [
          { in: [0, 1], out: [0] },  // rising edge captured DATA=0 → Q=0
          { in: [1, 1], out: [0] },  // CLK still high, DATA changed, Q holds
          { in: [1, 0], out: [0] },  // CLK fell, Q still holds
          { in: [1, 1], out: [1] },  // next rising edge, Q captures DATA=1
          { in: [0, 1], out: [1] },  // DATA=0, CLK still high, Q holds
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `The master-slave arrangement is the fundamental trick behind all edge-triggered storage. The rising edge is the only moment where information can flow from the master to the slave — everything else is held rigid.

This is the "rising edge" the clock diagram describes. All the data transfers in a CPU happen at these brief moments. The rest of the clock cycle is for signals to settle through logic gates before the next edge arrives. This is why clock speed has a ceiling: make the clock too fast and the gates don't have time to finish before the next capture.`,
    },
  ],
});
