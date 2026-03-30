// Logic Lab Node — NOT
registerNode({
  id: 'NOT', name: 'NOT', color: '#e74c3c', flags: { passthroughColor:true },
  ports: [
    {id:'a',name:'',dir:'in',bits:1},
    {id:'out',name:'',dir:'out',bits:1},
  ],
  logic(i){ return{out:i.a!==null?(i.a^1):null}; },
});
