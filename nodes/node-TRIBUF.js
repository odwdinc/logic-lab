// Logic Lab Node — 3-STATE Buffer
// Output = IN when EN=1, floating (null/high-Z) when EN=0.
registerNode({
  id: 'TRIBUF', name: '3-STATE', color: '#8e44ad', flags: {},
  ports: [
    {id:'a',  name:'IN',  dir:'in',  bits:1},
    {id:'en', name:'EN',  dir:'in',  bits:1},
    {id:'out',name:'OUT', dir:'out', bits:1},
  ],
  logic(i){ return{out:(i.en===1)?i.a:null}; },
});
