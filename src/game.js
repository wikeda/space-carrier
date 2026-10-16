export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const STAGE_DURATION = 11, TRANSITION_DURATION = 2, HIT_DAMAGE = 20;
export const STAGES = [
  {name:'NEON COAST',boss:'PRISM SENTINEL',sky:0x080c22,floor:0x080f23,accent:0x66fff1,sun:0xff6a80,speed:48,hp:65},
  {name:'EMBER CANYON',boss:'INFERNO RAM',sky:0x250c13,floor:0x32140c,accent:0xffa240,sun:0xff4224,speed:55,hp:80},
  {name:'GLACIER CIRCUIT',boss:'FROST ORBITER',sky:0x0b2031,floor:0x193548,accent:0x9defff,sun:0xb1cfff,speed:62,hp:95},
  {name:'TOXIC HYPERSPACE',boss:'VENOM HYDRA',sky:0x170b2e,floor:0x1a1731,accent:0xbcff45,sun:0xd545ff,speed:69,hp:110},
  {name:'SOLAR COLLAPSE',boss:'NOVA EMPEROR',sky:0x26091f,floor:0x271023,accent:0xffd45c,sun:0xff328f,speed:76,hp:140},
];
export const hitsRemaining = s => Math.ceil(s.health / HIT_DAMAGE);
export function createGame() {
 return {status:'playing',x:0,y:3,health:100,score:0,combo:0,maxCombo:0,time:0,sector:1,
 stageTime:0,phase:'wave',transitionTime:0,invincible:0,boostTime:0,boostCharge:1,
 boss:false,bossHealth:STAGES[0].hp,bossMax:STAGES[0].hp,kills:0};
}
export function step(s,dt,input={}) {
 if(s.status!=='playing')return;
 dt=clamp(dt,0,.05); s.time+=dt;
 s.x=clamp(s.x+(input.x||0)*20*dt,-9,9);
 s.y=clamp(s.y+(input.y||0)*15*dt,1,7);
 s.invincible=Math.max(0,s.invincible-dt);
 s.boostTime=Math.max(0,s.boostTime-dt);
 s.boostCharge=Math.min(1,s.boostCharge+dt/6);
 if(s.phase==='transition') {
   s.transitionTime=Math.max(0,s.transitionTime-dt);
   if(s.transitionTime===0) {
     s.sector++;s.phase='wave';s.stageTime=0;
     s.bossHealth=s.bossMax=STAGES[s.sector-1].hp;s.boostCharge=1;
   }
   return;
 }
 if(s.phase==='wave') {
   s.stageTime+=dt;
   if(s.stageTime>=STAGE_DURATION){s.boss=true;s.phase='boss';}
 }
}
export function damage(s) {
 if(s.status!=='playing'||s.phase==='transition'||s.invincible>0||s.boostTime>0)return false;
 s.health=Math.max(0,s.health-HIT_DAMAGE);s.invincible=1.4;s.combo=0;
 if(!s.health)s.status='lost';return true;
}
export function boost(s) {
 if(s.status!=='playing'||s.phase==='transition'||s.boostCharge<1)return false;
 s.boostCharge=0;s.boostTime=1.8;return true;
}
export function hit(s,points=100) {
 if(s.status!=='playing'||s.phase==='transition')return;
 s.combo++;s.kills++;s.maxCombo=Math.max(s.maxCombo,s.combo);
 s.score+=points*Math.min(5,1+Math.floor(s.combo/5));
}
export function hitBoss(s,amount) {
 if(!s.boss||s.status!=='playing')return;
 s.bossHealth=Math.max(0,s.bossHealth-amount);
 if(!s.bossHealth) {
   s.score+=5000*s.sector;s.boss=false;
   if(s.sector===STAGES.length)s.status='won';
   else {s.phase='transition';s.transitionTime=TRANSITION_DURATION;s.stageTime=0;}
 }
}
