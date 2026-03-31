// Logic Lab Lesson — Binary Numbers

registerLesson({
  id: 'Binary_Numbers',
  title: 'Lesson 6 · Binary Numbers',
  requires: ['XOR_Gate'],

  steps: [
    {
      title: 'Concept',
      text: `Computers use binary (base 2) because electronics naturally have two states: high voltage and low voltage, which map to 1 and 0. Binary works exactly like decimal, just with only two digits. In decimal, each place is worth 10× the place to its right. In binary, each place is worth 2× the place to its right.
Place values:   8   4   2   1
Binary digit:   1   1   0   1  =  8+4+0+1  =  13`,
    },
    {
      title: 'Place Values',
      text: `Work through these by hand using the place value table:
  0001 = 1           (just the 1s place)
  0010 = 2           (just the 2s place)
  0101 = 4+1 = 5
  1000 = 8           (just the 8s place)
  1101 = 8+4+1 = 13
  1111 = 8+4+2+1 = 15
4 bits gives 16 possible values (0–15). Every extra bit doubles the range. 8 bits → 256. 16 bits → 65,536. This is why storage sizes are all powers of 2.`,
    },
    {
      title: 'Build the Circuit',
      text: `A 4-bit INPUT node is connected to a 4-bit OUTPUT node. The INPUT shows bits b3 b2 b1 b0 from left to right (MSB to LSB). Click individual bit cells to toggle them and read the binary value.
Try setting:  5 = 0101,  10 = 1010,  13 = 1101`,
      build(cid) {
        const gIn  = addNode(cid, 'INPUT',  80, 90, 'IN');   gIn._bits  = 4; gIn._value  = 0;
        const gOut = addNode(cid, 'OUTPUT', 300, 90, 'OUT'); gOut._bits = 4;
        addWire(cid, gIn.id, 'out', gOut.id, 'a');
      },
    },
    {
      title: 'Verify: Decimal 5',
      text: `Set the INPUT to binary 5 (0101). Bit pattern: b3=0, b2=1, b1=0, b0=1.
Value = 0×8 + 1×4 + 0×2 + 1×1 = 5.`,
      test: {
        inputs:  ['IN'],
        outputs: ['OUT'],
        rows: [
          { in: [5],  out: [5]  },
          { in: [10], out: [10] },
          { in: [13], out: [13] },
        ],
      },
    },
    {
      title: 'Key Insight',
      text: `Binary is just a counting system — the same concept as decimal, but with base 2 instead of base 10. The reason computers use binary isn't because it's more elegant. It's because transistors are two-state switches. High or low voltage. On or off. 1 or 0. The arithmetic you've been doing by hand is exactly what the logic gates in the next lessons will do automatically.`,
    },
  ],
});
