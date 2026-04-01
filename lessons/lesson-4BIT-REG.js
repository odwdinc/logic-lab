// Logic Lab — Lesson 17: 4-Bit Synchronous Register

registerLesson({
  id: 'Four_Bit_Reg',
  title: 'Lesson 17 · 4-Bit Register',
  requires: ['One_Bit_Reg'],

  steps: [
    {
      title: 'Scaling Up',
      text: `Four 1-bit registers in parallel, sharing CLK and STORE, give a 4-bit synchronous register.

Unlike the asynchronous version from Lesson 14, this register only updates on the rising clock edge when STORE=1. Between clock edges the outputs are rock-solid — no race conditions, no glitches.

This is why clocks exist: they create a fixed, predictable rhythm. Every rising edge is a controlled moment when state can change. Everything between edges is guaranteed stable.`,
    },
    {
      title: 'Test the Circuit',
      text: `Four REG_1BIT blocks are wired in parallel. Each bit has its own DATA and Q line, but CLK and STORE are shared across all four.

Try the timing:
1. Set D3–D0 to any value, enable STORE=1
2. Click CLK high → Q captures the data
3. Disable STORE=0
4. Change D3–D0 freely
5. Click CLK high/low → Q never changes (STORE is off)`,
      build(cid) {
        const rDef = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'REG_1BIT');
        if (!rDef) return;
        const rData  = rDef.ports.find(p => p.dir==='in'  && p.name==='DATA')?.id;
        const rClk   = rDef.ports.find(p => p.dir==='in'  && p.name==='CLK')?.id;
        const rStore = rDef.ports.find(p => p.dir==='in'  && p.name==='STORE')?.id;
        const rQ     = rDef.ports.find(p => p.dir==='out' && p.name==='Q')?.id;

        const gClk   = addNode(cid, 'INPUT', 60, 150, 'CLK');   gClk._value   = 0;
        const gStore = addNode(cid, 'INPUT', 60, 260, 'STORE'); gStore._value = 0;

        const gD = addNode(cid, 'INPUT',   60,  60, `D`); gD._value = 0; gD._bits = 4;
        const bD  = addNode(cid, 'BUS_TO_BITS',  240, 0, 'D-Bits'); bD._bits  = 4;
        addWire(cid, gD.id, 'out', bD.id, 'bus');

        const gQ = addNode(cid, 'OUTPUT',  1000, 130, `Q`); gQ._bits = 4;
        const bQ  = addNode(cid, 'BITS_TO_BUS',  1000, 240, 'Q-Bits');bQ._bits  = 4;
        addWire(cid, bQ.id, 'bus', gQ.id, 'a',);


        for (let i = 0; i < 4; i++) {
          const x = 240 + i * 200;
          const gR = addNode(cid, rDef.id,   x, 160, '');
          addWire(cid, bD.id,    `b${i}`,  gR.id, rData);
          addWire(cid, gClk.id,  'out',  gR.id, rClk);
          addWire(cid, gStore.id,'out',  gR.id, rStore);
          addWire(cid, gR.id,    rQ,     bQ.id, `b${i}`);
        }
      },
    },
    {
      title: 'Verify: Store and Hold',
      text: `Store binary 5 (0101), then change inputs and verify Q holds with STORE=0.`,
      saveBlock: 'REG_4BIT',
      test: {
        inputs:  ['D', 'CLK', 'STORE'],
        outputs: ['Q'],
        rows: [
          // Store 0101 (5): STORE=1, CLK=1 → Q=0101
          { in: [5,  1, 1], out: [5] },
          // Change data to 1010, STORE=0, CLK=1 → Q still 0101
          { in: [10,  1, 0], out: [5] },
          // CLK=0 → Q still holds
          { in: [10,  0, 0], out: [5] },
          // STORE=1, CLK=1 → Q captures 1010
          { in: [10,  1, 1], out: [10] },
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `You have now built the same controlled register, When STORE is enabled and the clock ticks, exactly one value is captured no racing, no glitching.

Chaining this with the ripple adder from Lesson 9: put the adder output into Register A's DATA input, keep STORE=1 for one clock cycle, then turn STORE off. The result is stored and the adder is free to run with the new value on the next cycle.

This is the core loop of every CPU: read operands → compute → store result → repeat. The clock is what keeps it all synchronized.

From here, the next step is Random Access Memory an array of thousands of these registers that can be read from or written to by address.`,
    },
  ],
});
