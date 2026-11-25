/* TLC Gridiron '86 - headless physics regression
   Run: node scripts/gridiron-physics-qa.cjs */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const source=fs.readFileSync(path.join(__dirname,'../public/gridiron86/index.html'),'utf8');
const raw=source.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(raw,'inline runtime exists');
const anchor='refresh();requestAnimationFrame(loop);\n})();';
const hook='window.__qa={formation:p4BuildFormation,draw:field,game:()=>g,play:()=>play,save:()=>save,step:p4Step,start:startGame,snap:beginPlay,pass:startPass};';
const boot=raw[1].replace(anchor,()=>hook+anchor);
assert.ok(boot.includes(hook),'QA hooks injected');
class Element{
  constructor(){
    this.children=[];this.style={};this.value='';this.textContent='';this.listeners={};this.dataset={};this.tagName='DIV';
    this.classList={add(){},remove(){},toggle(){},contains(){return false}};
  }
  set innerHTML(x){this.children=[];this._html=x}
  get innerHTML(){return this._html||''}
  appendChild(x){this.children.push(x);return x}
  append(...xs){xs.forEach(x=>this.appendChild(x))}
  addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)}
  setAttribute(){}
  setPointerCapture(){}
  getBoundingClientRect(){return {left:0,top:0,width:960,height:520}}
  getContext(){
    const c={};for(const k of ['clearRect','fillRect','beginPath','ellipse','fill','arc','stroke','moveTo','lineTo','setLineDash','fillText'])c[k]=()=>{};
    return c;
  }
}
const elements=new Map(),get=id=>{
  if(!elements.has(id))elements.set(id,new Element());
  return elements.get(id);
};
const tabs=['dashboard','match','roster','office','scouting','league','settings'].map(name=>{
  const e=new Element();e.dataset.tab=name;return e;
});
const document={
  getElementById:get,querySelectorAll:s=>s==='.nav button'?tabs:[],
  createElement:name=>{const e=new Element();e.tagName=name.toUpperCase();return e;},
  addEventListener(){},fullscreenElement:null
};
const window={addEventListener(){},screen:{orientation:{lock:async()=>{}}}};
const localData=new Map(),localStorage={getItem:k=>localData.get(k)||null,setItem:(k,v)=>localData.set(k,v)};
new Function('document','window','performance','requestAnimationFrame','localStorage',boot)(
  document,window,{now:()=>1000},()=>{},localStorage
);
const q=window.__qa;
assert.equal(q.save().roster.length,22,'starter depth chart has 22 athletes');
const f=q.formation(25);
assert.equal(f.off.all.length,11,'full 11-player offense');
assert.equal(f.def.all.length,11,'full 11-player defense');
assert.deepEqual([f.off.ol.length,f.off.wr.length,f.def.dl.length,f.def.lb.length,f.def.db.length],[5,3,4,3,4]);
q.start();q.draw();
const e=(x,y)=>({clientX:x,clientY:y,preventDefault(){},stopImmediatePropagation(){}});
const canvas=get('field'),down=canvas.listeners.pointerdown.at(-1),up=canvas.listeners.pointerup.at(-1);
down(e(140,314));up(e(140,314));
assert.equal(q.play().carrier.role,'RB','tap running back to hand off');
let start=q.play().carrier.x;
for(let i=0;i<200&&q.play();i++)q.step(1/60);
assert.ok(q.game().ball!==25||q.play()?.carrier.x>start,'rushing movement resolved');
q.start();q.snap('PASS');
assert.equal(q.play().wr.length,4,'three WR plus TE route available');
q.pass(q.play().wr[1].x+4,q.play().wr[1].y);
assert.equal(q.play().phase,'pass','pass has a flight phase');
for(let i=0;i<200&&q.play()?.phase==='pass';i++)q.step(1/60);
assert.notEqual(q.play()?.phase,'pass','pass arrives and resolves');
q.start();q.snap('PASS');
const dl=q.play().defs.find(x=>x.role==='DL');
dl.x=q.play().qb.x+.5;dl.y=q.play().qb.y;
q.step(1/60);
assert.equal(q.game().down,2,'sack advances down');
assert.ok(q.game().ball<25,'sack loses yards');
assert.ok(q.game().toGo>10,'sack increases line to gain');
assert.ok(localData.has('tlc-gridiron-86-v1'),'career state auto-saves');
console.log('TLC Gridiron physics QA: PASS. 22-player formation, rush, pass, sack and save.');
