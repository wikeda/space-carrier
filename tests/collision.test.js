import test from "node:test";
import assert from "node:assert/strict";
import { crossesDepth } from "../src/collision.js";
import { FlightView } from "../src/view.js";
test("fast bullet detects target crossed between frames", () => {
  assert.equal(crossesDepth(-16.98, -21.38, -20, -18.56, 2.2), true);
  assert.equal(crossesDepth(-40, -44, -20, -18, 2.2), false);
});
test("pause freezes renderer animation clock", () => {
  const v = { elapsed: 12, renderer: { render() {} }, scene: {}, camera: {} };
  FlightView.prototype.tick.call(v, 5, { status: "paused" }, false);
  assert.equal(v.elapsed, 12);
});
