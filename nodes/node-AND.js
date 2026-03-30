// Logic Lab Node — AND
// Two-input bitwise AND gate.

registerNode({
  id:    'AND',
  name:  'AND',
  color: '#4fc3f7',
  flags: {},

  ports: [
    { id:'a', name:'A', dir:'in',  bits:1 },
    { id:'b', name:'B', dir:'in',  bits:1 },
    { id:'out', name:'', dir:'out', bits:1 },
  ],

  logic(i) {
    if (i.a === null && i.b === null) return { out: null };
    return { out: ((i.a ?? 0) & (i.b ?? 0)) };
  },

  demo() {
    makeCircuit('gates','Gates');
    const gA   = addNode('gates','INPUT',   60,  60,'A');   gA._value=1;
    const gB   = addNode('gates','INPUT',   60, 150,'B');   gB._value=0;
    const gAND = addNode('gates','AND',    220, 105,'AND');
    const gOR  = addNode('gates','OR',     220, 210,'OR');
    const gNAND= addNode('gates','NAND',   220, 310,'NAND');
    const gNOR = addNode('gates','NOR',    220, 410,'NOR');
    const gXOR = addNode('gates','XOR',    220, 510,'XOR');
    const gNOT = addNode('gates','NOT',    390, 105,'NOT');
    const gTB  = addNode('gates','TRIBUF', 390, 410,'3-ST');
    const gOut1= addNode('gates','OUTPUT', 530, 105,'AND→NOT');
    const gOut2= addNode('gates','OUTPUT', 530, 210,'OR-OUT');
    const gOut3= addNode('gates','OUTPUT', 530, 310,'NAND-OUT');
    const gOut4= addNode('gates','OUTPUT', 530, 410,'NOR→3ST');
    const gOut5= addNode('gates','OUTPUT', 530, 510,'XOR-OUT');
    addWire('gates',gA.id,'out',gAND.id,'a');
    addWire('gates',gB.id,'out',gAND.id,'b');
    addWire('gates',gA.id,'out',gOR.id,'a');
    addWire('gates',gB.id,'out',gOR.id,'b');
    addWire('gates',gA.id,'out',gNAND.id,'a');
    addWire('gates',gB.id,'out',gNAND.id,'b');
    addWire('gates',gA.id,'out',gNOR.id,'a');
    addWire('gates',gB.id,'out',gNOR.id,'b');
    addWire('gates',gA.id,'out',gXOR.id,'a');
    addWire('gates',gB.id,'out',gXOR.id,'b');
    addWire('gates',gAND.id,'out',gNOT.id,'a');
    addWire('gates',gNOT.id,'out',gOut1.id,'a');
    addWire('gates',gOR.id,'out',gOut2.id,'a');
    addWire('gates',gNAND.id,'out',gOut3.id,'a');
    addWire('gates',gNOR.id,'out',gTB.id,'a');
    addWire('gates',gA.id,'out',gTB.id,'en');
    addWire('gates',gTB.id,'out',gOut4.id,'a');
    addWire('gates',gXOR.id,'out',gOut5.id,'a');
  },
});
