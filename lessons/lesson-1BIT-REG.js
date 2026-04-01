// Logic Lab — Lesson 16: 1-Bit Synchronous Register

registerLesson({
  id: 'One_Bit_Reg',
  title: 'Lesson 16 · 1-Bit Register',
  requires: ['D_Flip_Flop'],

  steps: [
    {
      title: 'Adding a STORE Signal',
      text: `The D Flip-Flop captures DATA on every rising clock edge. That is too aggressive — we want to be able to say "store this value on the next clock edge" but also "keep the current value, ignore DATA."

Adding a STORE (enable) signal gives that control. The key insight: when STORE=0, instead of feeding DATA into the flip-flop, feed the flip-flop's own output back in. This way the flip-flop always captures something — but when STORE=0 it captures itself, effectively holding.

This is a 2-to-1 multiplexer:
  STORE=1  →  flip-flop input = DATA
  STORE=0  →  flip-flop input = Q (current output)

The mux: AND(DATA, STORE) OR AND(Q, NOT_STORE)`,
    },
    {
      title: 'Test the Circuit',
      text: `When STORE=0: AND1=0, AND2=Q, OR=Q 
  flip-flop sees its own output → holds.
When STORE=1: AND1=DATA, AND2=0, OR=DATA
  flip-flop captures DATA on next rising edge.`,
      build(cid) {
        const ffDef  = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'D_FLIP_FLOP');
        const orDef  = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'OR');
        if (!ffDef || !orDef) return;

        const ffData = ffDef.ports.find(p => p.dir==='in'  && p.name==='DATA')?.id;
        const ffClk  = ffDef.ports.find(p => p.dir==='in'  && p.name==='CLK')?.id;
        const ffQ    = ffDef.ports.find(p => p.dir==='out' && p.name==='Q')?.id;
        const orA    = orDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const orB    = orDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const orOut  = orDef.ports.find(p => p.dir==='out')?.id;

        const gData  = addNode(cid, 'INPUT',   60,  60, 'DATA');  gData._value  = 0;
        const gClk   = addNode(cid, 'INPUT',   60, 180, 'CLK');   gClk._value   = 0;
        const gStore = addNode(cid, 'INPUT',   60, 310, 'STORE'); gStore._value = 0;

        const gNot   = addNode(cid, 'NOT',     240, 310, '');   // NOT(STORE)
        const gAnd1  = addNode(cid, 'AND',     400,  60, 'AND1');   // DATA AND STORE
        const gAnd2  = addNode(cid, 'AND',     400, 240, 'AND2');   // Q AND NOT_STORE
        const gOr    = addNode(cid, orDef.id,  580, 150, '');   // mux output
        const gFF    = addNode(cid, ffDef.id,  760, 120, '');   // D Flip-Flop
        const gQ     = addNode(cid, 'OUTPUT',  980,  80, 'Q');

        // NOT STORE
        addWire(cid, gStore.id, 'out',  gNot.id,  'a');

        // AND1: DATA AND STORE
        addWire(cid, gData.id,  'out',  gAnd1.id, 'a');
        addWire(cid, gStore.id, 'out',  gAnd1.id, 'b');

        // AND2: Q AND NOT_STORE (Q added after FF is placed)
        addWire(cid, gNot.id,   'out',  gAnd2.id, 'b');

        // OR: mux output
        addWire(cid, gAnd1.id,  'out',  gOr.id,   orA);
        addWire(cid, gAnd2.id,  'out',  gOr.id,   orB);

        // OR → FF DATA, CLK → FF CLK
        addWire(cid, gOr.id,    orOut,  gFF.id,   ffData);
        addWire(cid, gClk.id,   'out',  gFF.id,   ffClk);

        // FF Q → OUTPUT and → AND2 feedback
        addWire(cid, gFF.id,    ffQ,    gQ.id,    'a');
        addWire(cid, gFF.id,    ffQ,    gAnd2.id, 'a');
      },
    },
    {
      title: 'Verify the Register',
      text: `Work through this sequence to verify STORE gating:

1. Set DATA=1, STORE=1. 
  Click CLK high → Q=1, Click CLK low.

2. Change DATA=0, STORE=0. 
  Click CLK high → Q should STAY at 1 (STORE is off).
  Click CLK low.

3. Set STORE=1. Click CLK high → Q=0 (now DATA=0 is captured).`,
      saveBlock: 'REG_1BIT',
      test: {
        inputs:  ['DATA', 'CLK', 'STORE'],
        outputs: ['Q'],
        rows: [
          { in: [1, 1, 1], out: [1] },  // STORE=1, rising edge, Q=1
          { in: [0, 0, 0], out: [1] },  // CLK=0, Q holds
          { in: [0, 1, 0], out: [1] },  // rising edge but STORE=0, Q holds
          { in: [0, 0, 1], out: [1] },  // CLK=0 again, setup
          { in: [0, 1, 1], out: [0] },  // STORE=1, rising edge, Q=0
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `This is a 1-bit register. The CPU in your phone has thousands of these, organised into a register file. Together they form the small, ultra-fast scratch space the processor uses while running your code.`,
    },
  ],
});
