import vm from 'node:vm';
import fs from 'node:fs';
import * as game from '../src/game.js';
import assert from 'node:assert/strict';
import test from 'node:test';
test('fatal hit and home clear transient damage feedback',()=>{
const elements=new Map();
function elem(id){if(!elements.has(id))elements.set(id,{hidden:false,textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},addEventListener(){}});return elements.get(id)}
let next;
class View {constructor(){this.car={position:{clone:()=>({project:()=>({x:0,y:0})})}}} reset(){} resize(){} setReduced(){} tick(dt,s){if(this.fatal&&s?.status==='playing'){this.fatal=false;s.health=20;game.damage(s);this.onDamage()}}}
const ctx={...game,load:()=>({best:0,runs:[],settings:{}}),save:()=>true,record:(d)=>d,FlightView:View,AudioFX:class{unlock(){}play(){}},document:{getElementById:elem,body:elem('body'),addEventListener(){}},window:{addEventListener(){}},performance:{now:()=>0},requestAnimationFrame:f=>next=f,console};
vm.createContext(ctx);
let source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
vm.runInContext(source+'\nglobalThis.fixture={start,home,view,frame};',ctx);
ctx.fixture.start();ctx.fixture.view.fatal=true;ctx.fixture.frame(16);
assert.equal(Number(elem('flash').style.opacity),0);
ctx.fixture.start();
ctx.fixture.view.onDamage();
assert.ok(Number(elem("flash").style.opacity)>0);
ctx.fixture.home();ctx.fixture.frame(4000);
assert.equal(Number(elem('flash').style.opacity),0);
});
