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
      await expect(page.locator('#hits-remaining')).toContainText(String(remaining));
      await expect(page.locator('#damage-alert')).toHaveClass(/visible/);
      await expect(page.locator('#damage-alert')).toContainText('被弾');
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
  for(let stage=1;stage<=5;stage++){
    await expect(page.locator('#sector')).toHaveText(`STAGE 0${stage} / 05`);
    names.push(await page.locator('#sector-name').textContent());
    // Fast-forward wave clock through the actual production state machine, not a simulated result.
    await page.evaluate(async()=>{
      const g=await import('/src/game.js'),s=window.__fixture.state();
      s.invincible=1000;
      while(s.phase==='wave')g.step(s,.05);
    });
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
  await expect(page.locator('#damage-alert')).toContainText('被弾');
  expect(await page.evaluate(()=>window.__fixture.view().shake)).toBe(0);
  expect(await page.locator('#flash').evaluate(e=>Number(getComputedStyle(e).opacity))).toBeLessThanOrEqual(.2);
  await page.locator('#pause').click();await page.locator('#quit').click();
  await expect(page.locator('#flash')).toHaveCSS('opacity','0');
  await expect(page.locator('#damage-alert')).not.toHaveClass(/visible/);
  expect(errors).toEqual([]);
});
