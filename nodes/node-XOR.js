// Logic Lab Node — XOR
registerNode({
  id: 'XOR', name: 'XOR', color: '#e67e22', flags: {},
  ports: [
    {id:'a',name:'A',dir:'in',bits:1},{id:'b',name:'B',dir:'in',bits:1},
    {id:'out',name:'',dir:'out',bits:1},
  ],
  logic(i){
    if(i.a===null&&i.b===null) return{out:null};
    return{out:((i.a??0)^(i.b??0))};
  },
});
