import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,step,damage,hitBoss,STAGE_DURATION} from '../src/game.js';
import {bossPose,bossAnimationTime} from '../src/encounter.js';
test('boss arrival is a protected three second entrance after the eleven second wave',()=>{
 const s=createGame();s.stageTime=STAGE_DURATION-.01;step(s,.02);
 assert.equal(s.phase,'bossIntro');assert.equal(s.boss,true);
 damage(s);hitBoss(s,999);assert.equal(s.health,100);assert.equal(s.bossHealth,65);
 for(let i=0;i<61;i++)step(s,.05);
 assert.equal(s.phase,'boss');assert.equal(s.bossTime,0);
 step(s,.05);assert.equal(s.bossTime,.05);hitBoss(s,1);assert.equal(s.bossHealth,64);
});
test('five boss trajectories differ, move visibly and stay in hittable bounds',()=>{
 const traces=[];
 for(let stage=1;stage<=5;stage++){
  const poses=Array.from({length:161},(_,i)=>bossPose(stage,i*.1));
  for(const p of poses){assert.ok(Math.abs(p.x)<=7);assert.ok(p.y>=1.5&&p.y<=6.5);assert.ok(p.z<=-24&&p.z>=-60);}
  assert.ok(Math.max(...poses.map(p=>p.x))-Math.min(...poses.map(p=>p.x))>8);
  traces.push(JSON.stringify(poses));
 }
 assert.equal(new Set(traces).size,5);
});

test('boss articulated animation clock is continuous at entrance handover',()=>{
 assert.equal(bossAnimationTime({phase:'bossIntro',introTime:.01}),2.99);
 assert.equal(bossAnimationTime({phase:'boss',bossTime:0}),3);
 assert.equal(bossAnimationTime({phase:'boss',bossTime:.05}),3.05);
});
