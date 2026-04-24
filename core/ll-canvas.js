// Logic Lab

const canvas=document.getElementById('canvas');
const ctx=canvas.getContext('2d');
let dpr=window.devicePixelRatio||1;
let canvasW=0,canvasH=0;
let vpX=0,vpY=0,vpScale=1;
let selNodeId=null;
let dragMode=null; // 'node'|'wire'|'pan'|'resize'
let dragNodeId=null,dragOffX=0,dragOffY=0;
let wireStart=null,wireMouseX=0,wireMouseY=0;
let hovNodeId=null,hovPortKey=null;
let mouseWX=0,mouseWY=0;

// Resize state
const RH_R   = 5;   // handle draw radius (world px)
const RH_HIT = 9;   // handle hit radius  (world px)
const NODE_MIN_W = 70;
const NODE_MIN_H = 36;
// 8 handles: id, xFrac (0=left,0.5=mid,1=right), yFrac
const RESIZE_HANDLES=[
  {id:'nw',xf:0,  yf:0,  cur:'nw-resize'},
  {id:'n', xf:.5, yf:0,  cur:'n-resize' },
  {id:'ne',xf:1,  yf:0,  cur:'ne-resize'},
  {id:'e', xf:1,  yf:.5, cur:'e-resize' },
  {id:'se',xf:1,  yf:1,  cur:'se-resize'},
  {id:'s', xf:.5, yf:1,  cur:'s-resize' },
  {id:'sw',xf:0,  yf:1,  cur:'sw-resize'},
  {id:'w', xf:0,  yf:.5, cur:'w-resize' },
];
let resizeHandle=null;
let resizeSnap=null;

let selNodeIds=new Set();   // all currently selected node IDs
let selBoxStart=null;        // {x,y} rubber-band anchor (world coords)
let selBoxEnd=null;          // {x,y} rubber-band current corner (world coords)
let dragNodesSnap=null;      // {nodeId:{x,y}} positions at multi-drag start

// Wire waypoint drag state
let dragWireId=null;   // wire id being waypoint-dragged
let dragWpIdx=-1;      // index into w._pts being dragged
let dragWpSnap=null;   // {mx,my,wpX,wpY} captured at drag start

// ── Global display settings ──
let showBusValues=true;

function w2c(wx,wy){return{x:(wx-vpX)*vpScale,y:(wy-vpY)*vpScale};}
function c2w(cx,cy){return{x:cx/vpScale+vpX,y:cy/vpScale+vpY};}

function resizeCanvas(){
  const wrap=document.getElementById('canvas-wrap');
  canvasW=wrap.clientWidth; canvasH=wrap.clientHeight;
  canvas.width=canvasW*dpr; canvas.height=canvasH*dpr;
  canvas.style.width=canvasW+'px'; canvas.style.height=canvasH+'px';
  ctx.setTransform(dpr,0,0,dpr,0,0);
  render();
}

// ── Signal visual helpers ──
function signalActiveColor(val,bits){
  if(val===null) return '#3a3040'; // floating/high-Z
  if(bits===1) return val?'#e74c3c':'#3a2020';
  return '#27ae60';
}
function signalBrightColor(val,bits){
  if(val===null) return '#555';
  if(bits===1) return val?'#ff6b6b':'#555';
  return '#4ecb8d';
}
function fmtVal(val,bits,fmt){
  if(val===null) return 'Z';
  if(bits===1) return val?'1':'0';
  fmt=fmt||'dec';
  if(fmt==='hex') return '0x'+val.toString(16).toUpperCase().padStart(Math.ceil(bits/4),'0');
  if(fmt==='bin') return val.toString(2).padStart(bits,'0');
  return val.toString();
}

// ═══════════════════════════════════════════════════════════════
//  RENDER
// ═══════════════════════════════════════════════════════════════

function rr(x,y,w,h,r=4){
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
  ctx.closePath();
}

