// Logic Lab Lesson — The NOT Gate

registerLesson({
  id: 'NOT_Gate',
  title: 'Lesson 2 · The NOT Gate',
  requires: ['AND_Gates'],

  steps: [
    {
      title: 'Concept',
      text: `A NOT gate has one input and flips it. If the input is 0, the output is 1. If the input is 1, the output is 0. In a physical circuit, a transistor does this — when you send current to it, it opens a bypass path that routes current away from your light, turning it off.`,
    },
    {
      title: 'Key Insight',
      text: `The NOT gate is the simplest possible logic operation. A transistor is essentially a NOT gate — that's the fundamental trick that makes electronics programmable. Electricity controlling electricity.`,
    },
    {
      title: 'Test the Circuit',
      text: `One input A feeds a NOT gate, whose output connects to OUT. Notice the output starts ON before you touch anything — the default input is 0, which gets inverted to 1. Try clicking A to toggle it.`,
      build(cid) {
        const gA   = addNode(cid, 'INPUT',  60,  90, 'A');   gA._value = 0;
        const gNOT = addNode(cid, 'NOT',   220,  90, 'NOT');
        const gOut = addNode(cid, 'OUTPUT', 380,  90, 'OUT');
        addWire(cid, gA.id,   'out', gNOT.id, 'a');
        addWire(cid, gNOT.id, 'out', gOut.id, 'a');
      },
    },
    {
      title: 'Verify the Truth Table',
      text: `Work through both combinations. The NOT gate simply inverts its input.`,
      test: {
        inputs:  ['A'],
        outputs: ['OUT'],
        rows: [
          { in: [0], out: [1] },
          { in: [1], out: [0] },
        ],
      },
    },
  ],
});
