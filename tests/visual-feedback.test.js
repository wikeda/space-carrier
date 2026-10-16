import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three.module.js';
import {FlightView} from '../src/view.js';
import fs from 'node:fs';
function fixture(reduced=false){return Object.assign(Object.create(FlightView.prototype),{scene:new THREE.Scene(),glowTexture:null,materials:{pink:new THREE.MeshBasicMaterial({color:0xff397c}),cyan:new THREE.MeshBasicMaterial({color:0x66fff1}),dark:new THREE.MeshStandardMaterial()},bullets:[],particles:[],entities:[],shake:0,reduced});}
test('player beams have thick white cores and larger cyan sleeves',()=>{const v=fixture();v.projectile(0,3,0);const m=v.bullets[0].mesh;const box=new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());assert.ok(box.x>=.3);assert.ok(box.z>=3);assert.ok(m.children.length>=1);});
test('damage labels use short English',()=>{const source=fs.readFileSync(new URL('../src/main.js',import.meta.url),'utf8');assert.ok(source.includes('hitsLabel(state)'));assert.ok(source.includes('HIT!'));assert.ok(!source.includes('被弾！'));});
test('enemy fighters have named armored hull wings and engines',()=>{const v=fixture();const old=Math.random;Math.random=()=>.5;try{v.enemy({sector:3});}finally{Math.random=old;}const model=v.entities[0].mesh;const size=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());assert.ok(size.x<=2.61);for(const name of ['armored-hull','wing-left','wing-right','engine-left','engine-right'])assert.ok(model.getObjectByName(name),name);});
test('kill explosions add a shockwave and bounded extra sparks; reduced mode stays subtle',()=>{for(const reduced of [false,true]){const v=fixture(reduced);v.explosion(new THREE.Vector3(),0xff397c);assert.ok(v.particles.length>0);assert.ok(v.particles.length<70);if(reduced){assert.equal(v.shake,0);assert.ok(v.particles.length<=8);}else{assert.ok(v.particles.some(p=>p.mesh.name==='kill-shockwave'));assert.ok(v.shake>=.35);}}});
