import { test, expect } from '@playwright/test';
// Capture the real application state only in the test response. No test API is shipped.
async function boot(page) {
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/src/main.js',async route=>{
    const response=await route.fetch();
    await route.fulfill({response,body:(await response.text())+'\nwindow.__fixture = {state:()=>state,view:()=>view};'});
  });
  await page.goto('/');
  await expect(page.locator('#error')).toBeHidden();
  await page.locator('#start').click();
  await expect(page.locator('#hud')).toBeVisible();
  return errors;
}
async function collide(page) {
  await page.evaluate(()=>{
    const s=window.__fixture.state(),v=window.__fixture.view();
    s.invincible=0;s.boostTime=0;
    v.projectile(s.x,s.y,2,true);
  });
}
test('real input moves car, boost works, pause freezes and restart resets',async({page,isMobile})=>{
  const errors=await boot(page);
  const before=await page.evaluate(()=>window.__fixture.state().x);
  if(isMobile){
    const client=await page.context().newCDPSession(page);
    await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:130,y:400}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:230,y:400}]});
    await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  }else{
    await page.keyboard.down('ArrowRight');await page.waitForTimeout(250);await page.keyboard.up('ArrowRight');
  }
  await expect.poll(()=>page.evaluate(()=>window.__fixture.state().x)).toBeGreaterThan(before);
  await page.locator('#boost').click();
  await expect.poll(()=>page.evaluate(()=>window.__fixture.state().boostTime)).toBeGreaterThan(0);
  await page.locator('#pause').click();
  const t=await page.evaluate(()=>window.__fixture.state().time);
  await page.waitForTimeout(250);expect(await page.evaluate(()=>window.__fixture.state().time)).toBe(t);
  await page.locator('#resume').click();
  await expect.poll(()=>page.evaluate(()=>window.__fixture.state().time)).toBeGreaterThan(t);
  await page.locator('#pause').click();await page.locator('#quit').click();await page.locator('#start').click();
  expect(await page.evaluate(()=>window.__fixture.state().health)).toBe(100);
  expect(errors).toEqual([]);
});
test('five real projectile collisions show damage and game over, save history',async({page},info)=>{
  const errors=await boot(page);
  await expect(page.locator('#hits-remaining')).toContainText('5');
  for(let remaining=4;remaining>=0;remaining--){
    await collide(page);
    await expect.poll(()=>page.evaluate(()=>window.__fixture.state().health)).toBe(remaining*20);
    if(remaining){
      await expect(page.locator('#hits-remaining')).toHaveText(`${remaining} HIT${remaining===1?'':'S'} LEFT`);
      await expect(page.locator('#damage-alert')).toHaveClass(/visible/);
      await expect(page.locator('#damage-alert')).toContainText('HIT!');
      await expect(page.locator('#announcement')).toHaveCSS('visibility','hidden');
      if(remaining===4)await page.screenshot({path:info.outputPath('damage-visible.png')});
    }
  }
  await expect(page.locator('#result-screen')).toBeVisible();
  await expect(page.locator('#result-title')).toContainText('GAME OVER');
  await expect(page.locator('#flash')).toHaveCSS('opacity','0');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon-overdrive-v1')));
  expect(stored.runs).toHaveLength(1);expect(stored.runs[0].status).toBe('lost');
  await page.locator('#restart').click();await expect(page.locator('#hits-remaining')).toContainText('5');
  await page.reload();await page.locator('#history').click();await expect(page.locator('.history-row')).toHaveCount(1);
  expect(errors).toEqual([]);
});
test('five distinct stages each render a boss and campaign win persists',async({page},info)=>{
  const errors=await boot(page);const names=[];const bosses=[];
  expect(await page.evaluate(async()=>(await import('/src/game.js')).STAGE_DURATION)).toBe(11);
  for(let stage=1;stage<=5;stage++){
    await expect(page.locator('#sector')).toHaveText(`STAGE 0${stage} / 05`);
    names.push(await page.locator('#sector-name').textContent());
    // Fast-forward wave clock through the actual production state machine, not a simulated result.
    await page.evaluate(async()=>{
      const g=await import('/src/game.js'),s=window.__fixture.state();
      s.invincible=1000;
      while(s.phase==='wave')g.step(s,.05);
    });
    await expect.poll(()=>page.evaluate(()=>window.__fixture.state().phase)).toBe('bossIntro');
    await expect(page.locator('body')).toHaveClass(/boss-intro/);
    await page.waitForTimeout(850);
    await page.screenshot({path:info.outputPath(`stage-${stage}-entrance.png`)});
    await page.evaluate(async()=>{const g=await import('/src/game.js'),s=window.__fixture.state();while(s.phase==='bossIntro')g.step(s,.05);});
    await expect(page.locator('#boss-bar')).toBeVisible();
    bosses.push(await page.locator('#boss-name').textContent());
    await expect.poll(()=>page.evaluate(()=>!!window.__fixture.view().bossMesh)).toBe(true);
    await page.screenshot({path:info.outputPath(`stage-${stage}-boss.png`)});
    await page.evaluate(async()=>{
      const g=await import('/src/game.js'),s=window.__fixture.state();g.hitBoss(s,s.bossHealth);
      while(s.phase==='transition')g.step(s,.05);
    });
  }
  expect(new Set(names).size).toBe(5);expect(new Set(bosses).size).toBe(5);
  await expect(page.locator('#result-screen')).toBeVisible();
  expect(await page.evaluate(()=>window.__fixture.state().status)).toBe('won');
  await page.reload();
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('neon-overdrive-v1')));
  expect(stored.runs[0].status).toBe('won');expect(stored.runs[0].sector).toBe(5);
  expect(errors).toEqual([]);
});
test('reduced effects retain damage clarity without screen shake',async({page})=>{
  const errors=await boot(page);
  await page.locator('#pause').click();await page.locator('#quit').click();
  await page.locator('#reduced').check();await page.locator('#start').click();
  await collide(page);
  await expect.poll(()=>page.evaluate(()=>window.__fixture.state().health)).toBe(80);
  await expect(page.locator('#damage-alert')).toContainText('HIT!');
      await expect(page.locator('#announcement')).toHaveCSS('visibility','hidden');
  expect(await page.evaluate(()=>window.__fixture.view().shake)).toBe(0);
  expect(await page.locator('#flash').evaluate(e=>Number(getComputedStyle(e).opacity))).toBeLessThanOrEqual(.25);
  await page.locator('#pause').click();await page.locator('#quit').click();
  await expect(page.locator('#flash')).toHaveCSS('opacity','0');
  await expect(page.locator('#damage-alert')).not.toHaveClass(/visible/);
  expect(errors).toEqual([]);
});
test('armored enemy, thick lasers and real kill shockwave render',async({page},info)=>{
  const errors=await boot(page);
  const geometry=await page.evaluate(()=>{
    const v=window.__fixture.view(),s=window.__fixture.state();
    const original=Math.random;Math.random=()=>.8;
    try{v.enemy(s);}finally{Math.random=original;}
    const enemy=v.entities.at(-1);enemy.mesh.position.set(0,3,-12);enemy.baseX=0;enemy.baseY=3;enemy.phase=-v.elapsed;enemy.speed=0;enemy.hp=1;
    v.projectile(0,3,-5,false);const laser=v.bullets.at(-1);
    s.status='paused';
    v.renderer.render(v.scene,v.camera);
    return {model:enemy.mesh.userData.modelType,parts:enemy.mesh.children.map(c=>c.name),width:laser.mesh.geometry.parameters.width,sleeve:laser.mesh.children[0].geometry.parameters.width};
  });
  expect(geometry.model).toBeTruthy();expect(geometry.parts.length).toBeGreaterThan(2);
  expect(geometry.width).toBeGreaterThanOrEqual(.2);expect(geometry.sleeve).toBeGreaterThanOrEqual(.4);
  await page.screenshot({path:info.outputPath('fighter-thick-laser.png')});
  const effect=await page.evaluate(()=>{
    const v=window.__fixture.view(),s=window.__fixture.state();
    s.status='playing';v.tick(.04,s,true);s.status='paused';
    return {kills:s.kills,particles:v.particles.length,ring:v.particles.some(p=>p.mesh.name==='kill-shockwave')};
  });
  expect(effect.kills).toBeGreaterThan(0);expect(effect.particles).toBeGreaterThanOrEqual(44);expect(effect.ring).toBe(true);
  await page.screenshot({path:info.outputPath('kill-shockwave.png')});
  await page.evaluate(()=>{const v=window.__fixture.view(),s=window.__fixture.state();s.status='playing';v.tick(.12,s,true);s.status='paused';});
  await page.screenshot({path:info.outputPath('kill-shockwave-expanded.png')});
  expect(errors).toEqual([]);
});
test('five worlds and five enemy silhouettes have distinct geometry',async({page},info)=>{
  const errors=await boot(page),worlds=[],models=[],shapes=[];
  for(let stage=1;stage<=5;stage++){
    const result=await page.evaluate(stage=>{
      const v=window.__fixture.view(),s=window.__fixture.state();
      s.sector=stage;s.phase='wave';s.boss=false;s.stageTime=0;s.status='paused';
      v.setStage(stage);
      for(const e of v.entities)v.disposeObject(e.mesh);v.entities=[];
      const random=Math.random;Math.random=()=>.8;try{v.enemy(s);}finally{Math.random=random;}const e=v.entities.at(-1);
      e.mesh.position.set(-3,4,-9);e.baseX=-3;e.baseY=4;e.speed=0;v.shot=100;
      for(const b of v.bullets)v.disposeObject(b.mesh);v.bullets=[];
      v.renderer.render(v.scene,v.camera);
      const geometry=[];v.stageScenery.traverse(o=>{if(o.geometry)geometry.push(o.geometry.type);});
      return {world:v.stageScenery.userData.theme,model:e.mesh.userData.modelType,geometry:geometry.sort().join(',')};
    },stage);
    worlds.push(result.world);models.push(result.model);shapes.push(result.geometry);
    await page.evaluate(()=>{window.__fixture.state().status='playing';});
    await expect(page.locator('#sector')).toHaveText(`STAGE 0${stage} / 05`);
    await expect(page.locator('#announcement')).toContainText(`STAGE 0${stage} / 05`);
    await page.evaluate(()=>{window.__fixture.state().status='paused';});
    expect(result.geometry.length).toBeGreaterThan(0);
    await page.screenshot({path:info.outputPath(`stage-${stage}-world-enemy.png`)});
  }
  expect(worlds.every(Boolean)).toBe(true);expect(models.every(Boolean)).toBe(true);
  expect(new Set(worlds).size).toBe(5);expect(new Set(models).size).toBe(5);
  expect(new Set(shapes).size).toBe(5);
  expect(errors).toEqual([]);
});
test('boss entrance clears fodder and is safe; active boss moves without fodder',async({page},info)=>{
  const errors=await boot(page);
  const entrance=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),s=window.__fixture.state(),v=window.__fixture.view();
    v.enemy(s);v.projectile(s.x,s.y,2,true);
    const oldEnemies=v.entities.length;
    while(s.phase==='wave')g.step(s,.05);
    s.invincible=0;s.boostTime=0;const health=s.health,bossHealth=s.bossHealth;
    g.damage(s);g.hitBoss(s,99999);
    v.tick(.01,s,true);s.status='paused';
    return {oldEnemies,phase:s.phase,health:s.health,bossHealth:s.bossHealth,originalHealth:health,originalBossHealth:bossHealth,entities:v.entities.length,hostile:v.bullets.filter(b=>b.hostile).length};
  });
  expect(entrance.oldEnemies).toBeGreaterThan(0);expect(entrance.phase).toBe('bossIntro');
  expect(entrance.health).toBe(entrance.originalHealth);expect(entrance.bossHealth).toBe(entrance.originalBossHealth);
  expect(entrance.entities).toBe(0);expect(entrance.hostile).toBe(0);
  await page.screenshot({path:info.outputPath('safe-boss-entrance.png')});
  const fight=await page.evaluate(async()=>{
    const g=await import('/src/game.js'),s=window.__fixture.state(),v=window.__fixture.view();
    s.status='playing';while(s.phase==='bossIntro')g.step(s,.05);s.invincible=1000;
    const poses=[],counts=[];
    for(let i=0;i<100;i++){g.step(s,.05);v.tick(.05,s,true);counts.push(v.entities.length);if(i%10===0)poses.push(v.bossMesh.position.toArray());}
    s.status='paused';return{phase:s.phase,counts,poses};
  });
  expect(fight.phase).toBe('boss');expect(fight.counts.every(n=>n===0)).toBe(true);
  expect(new Set(fight.poses.map(p=>p.map(n=>n.toFixed(2)).join(','))).size).toBeGreaterThan(5);
  const xs=fight.poses.map(p=>p[0]);expect(Math.max(...xs)-Math.min(...xs)).toBeGreaterThan(2);
  await page.screenshot({path:info.outputPath('boss-active-no-fodder.png')});
  expect(errors).toEqual([]);
});
