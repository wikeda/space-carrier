import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("mobile accessible shell supplies all essential controls", () => {
  const h = fs.existsSync("index.html")
    ? fs.readFileSync("index.html", "utf8")
    : "";
  for (const id of [
    "start",
    "pause",
    "resume",
    "restart",
    "history",
    "mute",
    "reduced",
    "boost",
    "hud",
    "error",
  ])
    assert.ok(h.includes(`id="${id}"`), id);
  assert.ok(h.includes('lang="ja"'));
  assert.ok(h.includes("viewport"));
});
test("renderer uses pinned local Three.js and relative module loading", () => {
  const v = fs.existsSync("src/view.js")
    ? fs.readFileSync("src/view.js", "utf8")
    : "";
  assert.match(v, /from ['"]\.\.\/vendor\/three\.module\.js['"]/);
  assert.equal(
    JSON.parse(fs.readFileSync("package.json")).dependencies.three,
    "0.180.0",
  );
});
