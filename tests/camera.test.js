import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.js";
import { cameraPose } from "../src/camera.js";
for (const aspect of [
  320 / 568,
  390 / 844,
  360 / 800,
  768 / 1024,
  1440 / 1000,
  2.1,
])
  test(`entire car stays visible at steering limits, aspect ${aspect}`, () => {
    for (const boosted of [false, true]) {
      const pose = cameraPose(aspect, boosted);
      for (const x of [-9, 0, 9])
        for (const y of [1, 3, 7]) {
          const c = new THREE.PerspectiveCamera(pose.fov, aspect, 0.1, 400);
          c.position.set(x * 0.16, 6.2 + y * 0.12, pose.z);
          c.lookAt(x * 0.28, 3.4, -35);
          c.updateMatrixWorld();
          for (const dx of [-1.5, 1.5])
            for (const dy of [-0.5, 0.9])
              for (const z of [0.8, 5.2]) {
                const p = new THREE.Vector3(x + dx, y + dy, z).project(c);
                assert.ok(
                  Math.abs(p.x) < 0.97 && Math.abs(p.y) < 0.97,
                  `car clipped at x=${x}, y=${y}, projected=${p.x},${p.y}`,
                );
              }
        }
    }
  });
