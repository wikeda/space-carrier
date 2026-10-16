import test from "node:test";
import assert from "node:assert/strict";
import * as game from "../src/game.js";
import * as store from "../src/storage.js";
test("fresh game starts healthy in sector 1", () => {
  const s = game.createGame();
  assert.equal(s.health, 100);
  assert.equal(s.sector, 1);
  assert.equal(s.status, "playing");
});
test("movement is bounded at all frame rates", () => {
  const s = game.createGame();
  for (let i = 0; i < 600; i++) game.step(s, 1 / 60, { x: 1, y: 1 });
  assert.ok(s.x <= 9 && s.y <= 7 && s.y >= 1);
});
test("damage gives immunity and breaks combo", () => {
  const s = game.createGame();
  s.combo = 8;
  game.damage(s, 20);
  game.damage(s, 20);
  assert.equal(s.health, 80);
  assert.equal(s.combo, 0);
});
test("boost protects car and consumes charge", () => {
  const s = game.createGame();
  assert.equal(game.boost(s), true);
  game.damage(s, 20);
  assert.equal(s.health, 100);
  assert.equal(game.boost(s), false);
});
test("kills build combo and scores", () => {
  const s = game.createGame();
  for (let i = 0; i < 10; i++) game.hit(s, 100);
  assert.equal(s.combo, 10);
  assert.ok(s.score > 1000);
});
test("pause freezes time and restart has no carried state", () => {
  const s = game.createGame();
  s.status = "paused";
  game.step(s, 1, { x: 1 });
  assert.equal(s.time, 0);
  assert.equal(game.createGame().score, 0);
});
test("every stage has a boss and only fifth boss wins", () => {
  const s = game.createGame();
  for (let stage=1; stage<=5; stage++) {
    assert.equal(s.sector, stage);
    for(let i=0;i<23*60;i++) game.step(s,1/60);
    assert.equal(s.boss,true);
    game.hitBoss(s,999);
    if(stage<5) {
      assert.equal(s.status,"playing");
      assert.equal(s.phase,"transition");
      for(let i=0;i<121;i++) game.step(s,1/60);
    }
  }
  assert.equal(s.status,"won");
});
test("damage can end run", () => {
  const s = game.createGame();
  s.health = 20;
  game.damage(s);
  assert.equal(s.status, "lost");
});
test("storage survives corruption and blocked reads", () => {
  assert.equal(store.load({ getItem: () => "{oops" }).best, 0);
  assert.equal(
    store.load({
      getItem: () => {
        throw Error();
      },
    }).best,
    0,
  );
});
test("history capped at 20, best preserved and settings survive", () => {
  let raw;
  const db = {
    getItem: () => raw,
    setItem: (_, v) => {
      raw = v;
    },
  };
  let data = store.load(db);
  data.settings.muted = true;
  for (let i = 0; i < 25; i++)
    data = store.record(
      data,
      { score: i, sector: 1, time: 2, status: "lost" },
      db,
    );
  assert.equal(data.runs.length, 20);
  assert.equal(store.load(db).best, 24);
  assert.equal(store.load(db).settings.muted, true);
});
test("blocked writes do not crash the game", () => {
  assert.equal(
    store.save(store.load(), {
      setItem: () => {
        throw Error();
      },
    }),
    false,
  );
});

test("late projectile cannot alter score or combo after fatal damage", () => {
  const s = game.createGame();
  game.hit(s, 100);
  s.health = 20;
  game.damage(s);
  const frozen = { ...s };
  game.hit(s, 100);
  assert.deepEqual(s, frozen);
});
test("late projectile cannot alter a won or paused run", () => {
  for (const status of ["won", "paused"]) {
    const s = game.createGame();
    s.status = status;
    game.hit(s, 100);
    assert.equal(s.score, 0);
    assert.equal(s.combo, 0);
  }
});
test("loading discards implausible or malformed history while preserving valid runs", () => {
  const valid = {
    score: 1200,
    sector: 3,
    time: 117,
    status: "won",
    date: "2026-10-16T22:00:00.000Z",
    combo: 10,
  };
  const invalid = [
    { sector: 0 },
    { sector: 999 },
    { sector: 1.5 },
    { date: "bad-date" },
    { date: "2026-02-31T22:00:00.000Z" },
    { status: "playing" },
    { score: 1e100 },
    { time: -5 },
  ].map((change) => ({ ...valid, ...change }));
  const result = store.load({
    getItem: () =>
      JSON.stringify({ version: 1, best: 1e100, runs: [...invalid, valid] }),
  });
  assert.deepEqual(result.runs, [valid]);
  assert.equal(result.best, 0);
});


test("all collision types cost one of five hits", () => {
  const s=game.createGame();
  for(let i=4;i>=0;i--) {
    s.invincible=0;
    game.damage(s,12);
    assert.equal(s.health,i*20);
    assert.equal(game.hitsRemaining(s),i);
  }
  assert.equal(s.status,"lost");
});
test("stage transitions protect player and freeze wave timer",()=>{
 const s=game.createGame();
 for(let i=0;i<1400;i++) game.step(s,1/60);
 game.hitBoss(s,999);
 const health=s.health;
 game.damage(s);
 assert.equal(s.health,health);
 game.step(s,.05);
 assert.equal(s.stageTime,0);
});
test("five distinct worlds and bosses",()=>{
 assert.equal(game.STAGES.length,5);
 assert.equal(new Set(game.STAGES.map(s=>s.name)).size,5);
 assert.equal(new Set(game.STAGES.map(s=>s.boss)).size,5);
});
test("movement and boost recharge are faster",()=>{
 const s=game.createGame();game.step(s,.05,{x:1,y:1});
 assert.ok(s.x>=.9);assert.ok(s.y>=3.7);
 game.boost(s);for(let i=0;i<361;i++)game.step(s,1/60);
 assert.equal(s.boostCharge,1);
});
test("stage five history survives reload",()=>{
 let raw;const db={setItem:(_,v)=>raw=v,getItem:()=>raw};
 store.record(store.load(db),{score:100,sector:5,time:200,status:"won"},db);
 assert.equal(store.load(db).runs[0]?.sector,5);
});

test("all five bosses arrive after roughly 11 seconds without changing their health", () => {
  const s = game.createGame();
  const bossHealth = [65, 80, 95, 110, 140];
  for (let stage = 1; stage <= 5; stage++) {
    assert.equal(s.sector, stage);
    for (let frame = 0; frame < 10 * 60; frame++) game.step(s, 1 / 60);
    assert.equal(s.phase, "wave");
    for (let frame = 0; frame < 61; frame++) game.step(s, 1 / 60);
    assert.equal(s.phase, "bossIntro");
    for(let frame=0;frame<181;frame++)game.step(s,1/60);
    assert.equal(s.phase,"boss");
    assert.equal(s.bossHealth, bossHealth[stage - 1]);
    assert.equal(s.bossMax, bossHealth[stage - 1]);
    game.hitBoss(s, bossHealth[stage - 1]);
    if (stage < 5) for (let frame = 0; frame < 121; frame++) game.step(s, 1 / 60);
  }
  assert.equal(s.status, "won");
});

test('remaining-hit labels use singular for the final hit',()=>{
  assert.equal(game.hitsLabel({health:20}),'1 HIT LEFT');
  assert.equal(game.hitsLabel({health:40}),'2 HITS LEFT');
});
