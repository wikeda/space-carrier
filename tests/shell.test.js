import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('damage and stage HUD exposes explicit labels',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const id of ['hits-remaining','damage-alert','boss-name']) assert.ok(html.includes(`id="${id}"`));
 assert.ok(html.includes('5 STAGES'));
});
