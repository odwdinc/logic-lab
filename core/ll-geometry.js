// Logic Lab

//  GEOMETRY
// ═══════════════════════════════════════════════════════════════

const PORT_R   = 5;
const PORT_HIT = 11;
const NLH      = 22;   // node label header height
const NPY      = 8;    // node body top padding
const NPS      = 24;   // port spacing
const NMW      = 76;   // min node width
const IONG_SZ  = 12;   // bit grid cell size (slightly larger for 1-bit readability)
const IONG_GAP = 2;

function ioNodeW(bits){
  const cols=Math.min(bits,8);
  return cols*(IONG_SZ+IONG_GAP)+IONG_GAP+8;
}
function ioNodeH(bits){
  const cols=Math.min(bits,8);
  const rows=Math.ceil(bits/cols);
  return rows*(IONG_SZ+IONG_GAP)+IONG_GAP+30; // label + grid + value
}

function nodeGeom(node){
  const def=blockDefs[node.defId]; if(!def) return {x:node.x,y:node.y,w:80,h:40,ports:{}};

  // Ask the registry first — node descriptors define getGeom for special geometry
  const descGeom=getDescGeom(node,def);
  if(descGeom) return descGeom;



  const inP=def.ports.filter(p=>p.dir==='in');
  const outP=def.ports.filter(p=>p.dir==='out');

  const maxP=Math.max(inP.length,outP.length,1);
  const minH=Math.max(NLH+NPY+maxP*NPS+NPY,42);
  const labelW=def.name.length*8+28;
  const minW=Math.max(NMW,labelW);
  const w=Math.max(minW, node._w||0);
  const h=Math.max(minH, node._h||0);

  // Evenly distribute ports vertically across the body area below the header.
  // Body spans from NLH to h. Divide into (count+1) equal slots so ports are
  // centred between header and bottom edge regardless of resize.
  function portYs(count){
    const bodyH=h-NLH;
    const ys=[];
    for(let i=0;i<count;i++) ys.push(NLH + bodyH*(i+1)/(count+1));
    return ys;
  }

  const ports={};
  const inYs=portYs(inP.length);
  inP.forEach((p,i)=>{
    ports[p.id]={x:0,y:inYs[i],bits:p.bits,dir:'in',name:p.name};
  });
  const outYs=portYs(outP.length);
  outP.forEach((p,i)=>{
    ports[p.id]={x:w,y:outYs[i],bits:p.bits,dir:'out',name:p.name};
  });
  return {x:node.x,y:node.y,w,h,ports};
}

const STUB_LEN = 18; // stub length — only for 1-bit gate ports

function portWorldPos(node,portId){
  const g=nodeGeom(node); const p=g.ports[portId]; if(!p) return null;
  const def=blockDefs[node.defId];
  let tx=g.x+p.x, ty=g.y+p.y;
  // Only 1-bit gate ports have a stub; multi-bit ports connect at the node edge
  if(!def?.isIO && p.bits===1){
    if(p.dir==='in')  tx=g.x+p.x-STUB_LEN;
    else              tx=g.x+p.x+STUB_LEN;
  }
  return {x:tx,y:ty,bits:p.bits,dir:p.dir};
}

// ═══════════════════════════════════════════════════════════════
//  CANVAS STATE
// ═══════════════════════════════════════════════════════════════

