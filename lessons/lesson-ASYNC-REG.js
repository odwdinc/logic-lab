// Logic Lab — Lesson 14: Asynchronous Register

registerLesson({
  id: 'Async_Register',
  title: 'Lesson 14 · Asynchronous Register',
  requires: ['NAND_D_Latch'],

  steps: [
    {
      title: 'Storing Multiple Bits',
      text: `One D Latch stores one bit. To store a 4-bit number, use four latches in parallel — all sharing the same STORE signal.

This is called a 4-bit register. Set DATA on all four inputs, pulse STORE, and all four bits are captured simultaneously.

It is called asynchronous because there is no clock — STORE is a raw level signal. This turns out to be a problem.`,
    },
    {
      title: 'Build the Circuit',
      text: `Four D Latch blocks share a single STORE line. Each latch independently remembers its own bit.

Try it:
1. Set some pattern on D3–D0
2. Enable STORE — the Q outputs immediately track the D inputs
3. Disable STORE — Q holds the values even as D changes`,
      build(cid) {
        const lDef = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'D_LATCH');
        if (!lDef) return;
        const lData  = lDef.ports.find(p => p.dir==='in'  && p.name==='DATA')?.id;
        const lStore = lDef.ports.find(p => p.dir==='in'  && p.name==='STORE')?.id;
        const lQ     = lDef.ports.find(p => p.dir==='out' && p.name==='Q')?.id;

        const gStore = addNode(cid, 'INPUT', 60, 200, 'STORE'); gStore._value = 0;

        for (let i = 0; i < 4; i++) {
          const x = 240 + i * 270;
          const gD = addNode(cid, 'INPUT',    x,  60, `D${3-i}`); gD._value = 0;
          const gL = addNode(cid, lDef.id,    x, 160, '');
          const gQ = addNode(cid, 'OUTPUT',   x, 310, `Q${3-i}`);
          addWire(cid, gD.id,    'out',  gL.id, lData);
          addWire(cid, gStore.id,'out',  gL.id, lStore);
          addWire(cid, gL.id,    lQ,     gQ.id, 'a');
        }
      },
    },
    {
      title: 'Verify Storage and Hold',
      text: `Store the pattern 1001 (decimal 9), then change the inputs and confirm Q holds.`,
      test: {
        inputs:  ['D3', 'D2', 'D1', 'D0', 'STORE'],
        outputs: ['Q3', 'Q2', 'Q1', 'Q0'],
        rows: [
          { in: [1, 0, 0, 1, 1], out: [1, 0, 0, 1] },  // Store 1001
          { in: [1, 0, 0, 1, 0], out: [1, 0, 0, 1] },  // STORE=0, Q holds
          { in: [0, 1, 1, 0, 0], out: [1, 0, 0, 1] },  // Data changed, Q still holds
        ],
      },
    },
    {
      title: 'The Race Condition Problem',
      text: `The problem with this asynchronous register becomes clear when you try to chain it with an ALU.

Imagine: ALU output → Register A inputs. With STORE=1, the register instantly captures the ALU result. But the ALU is computing A+B... and A is fed from the register output. So the moment STORE=1:
  1. Register stores result 1 → A changes → ALU output changes → register stores result 2 → ...

It races uncontrollably. The only way to capture a single value is to pulse STORE with perfect timing — impossible to do reliably in a real system.

The solution is to tie the STORE signal to a clock, and only update memory on a specific clock edge. That requires the D Flip-Flop.`,
    },
  ],
});
