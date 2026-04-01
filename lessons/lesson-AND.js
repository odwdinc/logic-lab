// Logic Lab Lesson — The AND Gate

registerLesson({
  id: 'AND_Gates',
  title: 'Lesson 1 · The AND Gate',
  requires: [],

  steps: [
    {
      title: 'Concept',
      text: `Imagine two switches wired in series with a light bulb. The light only turns on when both switches are closed. That's AND logic — both conditions must be true for the output to be true.`,
    },
    {
      title: 'Key Insight',
      text:`AND is the logical equivalent of "both must be true." It shows up everywhere — checking that a user is logged in AND has permission, for example. With two inputs there are 4 possible combinations (2²). With three inputs there would be 8 (2³).`,
    },

    {
      title: 'Test the Circuit',
      text: `Two inputs A and B feed an AND gate, whose output connects to the OUT node. Try clicking A or B on the canvas to toggle them and observe the output.`,
      build(cid) {
        const gA   = addNode(cid, 'INPUT',   60,  60, 'A');   gA._value = 0;
        const gB   = addNode(cid, 'INPUT',   60, 150, 'B');   gB._value = 0;
        const gAND = addNode(cid, 'AND',    230, 105, 'AND');
        const gOut = addNode(cid, 'OUTPUT', 390, 105, 'OUT');
        addWire(cid, gA.id,   'out', gAND.id, 'a');
        addWire(cid, gB.id,   'out', gAND.id, 'b');
        addWire(cid, gAND.id, 'out', gOut.id, 'a');
      },
    },

    {
      title: 'Verify the Truth Table',
      text: `Try each of the four input combinations by clicking A and B on the canvas. The AND gate outputs 1 only when BOTH A and B are 1. Each row checks off automatically when you produce it.`,
      test: {
        inputs:  ['A', 'B'],
        outputs: ['OUT'],
        rows: [
          { in: [0, 0], out: [0] },
          { in: [0, 1], out: [0] },
          { in: [1, 0], out: [0] },
          { in: [1, 1], out: [1] },
        ],
      },
    },
  ],
});
