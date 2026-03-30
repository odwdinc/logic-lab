// Logic Lab Node — NOR
registerNode({
  id: 'NOR', name: 'NOR', color: '#16a085', flags: {},
  ports: [
    {id:'a',name:'A',dir:'in',bits:1},{id:'b',name:'B',dir:'in',bits:1},
    {id:'out',name:'',dir:'out',bits:1},
  ],
  logic(i){
    if(i.a===null&&i.b===null) return{out:null};
    return{out:((i.a??0)|(i.b??0))^1};
  },

  demo(){
    makeCircuit('srlatch','SR Latch');
    const sS   = addNode('srlatch','INPUT',   60,  80,'SET');   sS._value=0;
    const sR   = addNode('srlatch','INPUT',   60, 220,'RESET'); sR._value=0;
    const sNOR1= addNode('srlatch','NOR',    260, 100,'NOR');
    const sNOR2= addNode('srlatch','NOR',    260, 200,'NOR');
    const sQ   = addNode('srlatch','OUTPUT', 460,  80,'Q');
    const sQn  = addNode('srlatch','OUTPUT', 460, 220,'Q̄');
    addWire('srlatch',sS.id,'out',sNOR1.id,'a');
    addWire('srlatch',sR.id,'out',sNOR2.id,'b');
    addWire('srlatch',sNOR1.id,'out',sNOR2.id,'a');
    addWire('srlatch',sNOR2.id,'out',sNOR1.id,'b');
    addWire('srlatch',sNOR1.id,'out',sQ.id,'a');
    addWire('srlatch',sNOR2.id,'out',sQn.id,'a');
  },
});
