import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { FlightView } from '../src/view.js';
function fixture(){const v=Object.assign(Object.create(FlightView.prototype),{scene:new THREE.Scene(),materials:{},car:new THREE.Group(),entities:[],bossMesh:null});v.scene.add(v.car);return v;}
test('screen has no fixed crosshair',()=>{const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');assert.ok(!html.includes('id="reticle"'));});
test('player, enemies and boss have ground anchored shadows following XZ and altitude',()=>{const v=fixture();assert.equal(typeof v.syncGroundShadows,'function');const enemy=new THREE.Group(),boss=new THREE.Group();v.entities=[{mesh:enemy}];v.bossMesh=boss;v.car.position.set(2,2,3);enemy.position.set(-3,4,-35);boss.position.set(4,6,-60);v.syncGroundShadows();assert.equal(v.groundShadows.size,3);for(const model of [v.car,enemy,boss]){const shadow=v.groundShadows.get(model);assert.equal(shadow.position.x,model.position.x);assert.equal(shadow.position.z,model.position.z);assert.equal(shadow.position.y,-.6);assert.equal(shadow.rotation.x,-Math.PI/2);assert.equal(shadow.material.depthWrite,false);}const shadow=v.groundShadows.get(v.car),opacity=shadow.material.opacity,width=shadow.scale.x;v.car.position.set(6,7,5);v.syncGroundShadows();assert.equal(shadow.position.x,6);assert.equal(shadow.position.z,5);assert.equal(shadow.position.y,-.6);assert.ok(shadow.scale.x>width);assert.ok(shadow.material.opacity<opacity);});
test('removed enemies and boss cannot leave orphan shadows; reduced mode keeps shadows',()=>{const v=fixture();assert.equal(typeof v.syncGroundShadows,'function');const enemy=new THREE.Group();v.entities=[{mesh:enemy}];v.bossMesh=new THREE.Group();v.reduced=true;v.syncGroundShadows();const shadow=v.groundShadows.get(enemy);let disposed=false;shadow.geometry.addEventListener('dispose',()=>disposed=true);v.disposeObject(enemy);assert.equal(v.groundShadows.has(enemy),false);assert.equal(shadow.parent,null);assert.ok(disposed);v.entities=[];v.bossMesh=null;v.syncGroundShadows();assert.equal(v.groundShadows.size,1);assert.ok(v.groundShadows.get(v.car).visible);});

// Execute the actual application frame: removing a HUD node must not freeze RAF.
// Only the renderer/DOM platform is replaced; game stepping and frame code are real.
test('real main frame keeps scheduling with reticle absent from the actual HTML',async()=>{
  const {runInNewContext}=await import('node:vm');
  const {createGame,step,clamp,STAGES,hitsRemaining,hitsLabel}=await import('../src/game.js');
  const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const nodes=new Map([...html.matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,{style:{},classList:{toggle(){},remove(){}}}]));
  const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
  const frameSource=source.slice(source.indexOf('function frame(now) {'),source.indexOf('\nrefresh();',source.indexOf('function frame(now) {')));
  const state=createGame();state.status='playing';let scheduled=0;
  const scope={state,step,clamp,STAGES,hitsRemaining,hitsLabel,last:0,lastSector:state.sector,lastPhase:state.phase,keys:new Set(),damageTimer:0,announcementTimer:0,
    view:{tick(){},car:{position:new THREE.Vector3(0,3,3)},camera:new THREE.PerspectiveCamera()},
    $:id=>nodes.get(id)||null,fmt:n=>String(n),announce(){},finish(){},requestAnimationFrame(){scheduled++;}};
  runInNewContext(frameSource+'\nframe(16);frame(32);',scope);
  assert.equal(scheduled,2);assert.ok(state.time>0);assert.equal(nodes.has('reticle'),false);
});
