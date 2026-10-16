// Each boss follows a readable, bounded path; no teleporting or contact attacks.
export function bossPose(stage, t) {
 const a=t*.78;
 switch(stage){
 case 1: return {x:6.4*Math.sin(a),y:4+1.8*Math.sin(a*2),z:-43+6*Math.cos(a),roll:-.23*Math.cos(a)};
 case 2: return {x:5.6*Math.sin(t*.95),y:3.5+1.5*Math.sin(t*.6),z:-44+13*Math.pow(Math.max(0,Math.sin(t*1.1)),3),roll:.16*Math.sin(t*.95)};
 case 3: return {x:6*Math.cos(t*.8),y:4+2*Math.sin(t*.8),z:-43+8*Math.sin(t*1.6),roll:t*.3};
 case 4: return {x:6.6*Math.sin(t*.75),y:4+1.9*Math.sin(t*1.5+.7),z:-43+9*Math.cos(t*.75),roll:.3*Math.cos(t*.75)};
 default:return {x:6*Math.sin(t*.9),y:4+2.1*Math.sin(t*.57),z:-43+11*Math.sin(t*1.2),roll:.2*Math.cos(t*.9)};
 }
}

export function bossAnimationTime(state, entranceDuration=3) {
 return state.phase==='bossIntro' ? entranceDuration-state.introTime : entranceDuration+(state.bossTime||0);
}
