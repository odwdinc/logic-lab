// Logic Lab — Lesson 10: SR Latch

registerLesson({
  id: 'SR_Latch',
  title: 'Lesson 10 · SR Latch',
  requires: ['OR_Gate'],

  steps: [
    {
      title: 'Concept',
      text: `So far every circuit you have built is purely combinational — the output depends only on the current inputs. What if you could make a circuit that remembers?

An SR Latch has two inputs: SET and RESET. Pulse SET and the output turns on. Remove SET — the output stays on. Later, pulse RESET to turn it back off. The circuit has memory.

The trick is feedback: the output is fed back as one of the inputs. Once the output is on, it keeps itself on even after SET is removed.`,
    },
    {
      title: 'Build the Circuit',
      text: `The circuit has been built for you. Trace the wires:

  SET ─────────── OR ──── AND ── Q
                  │         │
  RESET ── NOT ──┘    ┌────┘  ← feedback
                       └──────────────┘

Try clicking SET on the canvas. The output turns on. Now release SET (click it back to 0). The output stays on — the AND gate is kept high by its own output through the feedback wire.

Click RESET to clear. Then release RESET — it stays cleared.`,
      build(cid) {
        const orDef = Object.values(blockDefs).find(d => !d.isBuiltin && d.name === 'OR');
        if (!orDef) return;
        const orA   = orDef.ports.find(p => p.dir==='in'  && p.name==='A')?.id;
        const orB   = orDef.ports.find(p => p.dir==='in'  && p.name==='B')?.id;
        const orOut = orDef.ports.find(p => p.dir==='out')?.id;

        const gSet   = addNode(cid, 'INPUT',    60,  60, 'SET');   gSet._value   = 0;
        const gReset = addNode(cid, 'INPUT',    60, 210, 'RESET'); gReset._value = 0;
        const gOr    = addNode(cid, orDef.id,  250,  60, '');
        const gNot   = addNode(cid, 'NOT',      250, 210, '');
        const gAnd   = addNode(cid, 'AND',      430, 130, '');
        const gQ     = addNode(cid, 'OUTPUT',   600, 130, 'Q');

        addWire(cid, gSet.id,   'out',  gOr.id,  orA);
        addWire(cid, gOr.id,    orOut,  gAnd.id, 'a');
        addWire(cid, gReset.id, 'out',  gNot.id, 'a');
        addWire(cid, gNot.id,   'out',  gAnd.id, 'b');
        addWire(cid, gAnd.id,   'out',  gQ.id,   'a');
        // Feedback: AND output → OR second input
        addWire(cid, gAnd.id,   'out',  gOr.id,  orB);
      },
    },
    {
      title: 'Verify the Latch',
      text: `Work through each state in order:
1. SET=1, RESET=0  →  Q should go to 1
2. SET=0, RESET=0  →  Q should stay at 1  (latch holds!)
3. SET=0, RESET=1  →  Q should go to 0
4. SET=0, RESET=0  →  Q should stay at 0  (latch holds!)

Rows 2 and 4 have identical inputs — the output is different because the circuit remembers its previous state.`,
      test: {
        inputs:  ['SET', 'RESET'],
        outputs: ['Q'],
        rows: [
          { in: [1, 0], out: [1] },
          { in: [0, 0], out: [1] },
          { in: [0, 1], out: [0] },
          { in: [0, 0], out: [0] },
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `For the first time, the same input combination (SET=0, RESET=0) can produce two different outputs depending on history. The circuit has state.

The feedback wire is the memory. Once the AND gate turns on, its own output keeps the OR gate high, which keeps the AND gate on — a stable loop. RESET breaks the loop by cutting power to the AND gate.

This is the fundamental mechanism behind all computer memory: stable feedback loops. Everything from flip-flops to RAM to the register files in a CPU is built on this one idea.`,
    },
  ],
});
