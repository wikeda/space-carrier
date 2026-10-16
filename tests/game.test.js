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
test("boss starts after third sector and defeating it wins", () => {
  const s = game.createGame();
  for (let i = 0; i < 106 * 60; i++) game.step(s, 1 / 60, {});
  assert.equal(s.boss, true);
  game.hitBoss(s, 999);
  assert.equal(s.status, "won");
});
test("damage can end run", () => {
  const s = game.createGame();
  game.damage(s, 100);
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
  game.damage(s, 100);
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
