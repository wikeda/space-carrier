import { test, expect } from '@playwright/test';
test('actual WebGL rendering, start and pause work',async({page},testInfo)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('/');
  await expect(page.locator('#error')).toBeHidden();
  await expect(page.locator('#scene canvas')).toBeVisible();
  const context=await page.locator('#scene canvas').evaluate(c=>{
    const gl=c.getContext('webgl2');if(!gl)return null;
    const ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),width:gl.drawingBufferWidth,height:gl.drawingBufferHeight,lost:gl.isContextLost()};
  });
  expect(context).toBeTruthy();expect(context.lost).toBe(false);expect(context.width).toBeGreaterThan(0);
  await testInfo.attach('webgl-context',{body:JSON.stringify(context),contentType:'application/json'});
  await page.locator('#start').click();await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#menu')).toBeHidden();
  await page.waitForTimeout(700);
  await page.screenshot({path:testInfo.outputPath('gameplay.png')});
  await page.locator('#pause').click();await expect(page.locator('#pause-screen')).toBeVisible();
  await page.locator('#resume').click();await expect(page.locator('#pause-screen')).toBeHidden();
  expect(errors).toEqual([]);
});
