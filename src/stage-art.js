import * as THREE from "../vendor/three.module.js";

// All coordinates are local: the flight view owns movement, lighting and lifetime.
const THEMES = ["spore-canopy", "ember-monoliths", "prismatic-glacier", "hanging-gardens", "solar-citadel"];
const COLORS = [
  [0x28c7bb, 0xff619f, 0xa2fff1],
  [0x9e3427, 0xffa43a, 0xffe48c],
  [0x418bc7, 0xc9a6ff, 0x94ffff],
  [0x6942a0, 0xbaff50, 0xff79df],
  [0x78375f, 0xffca52, 0xff669c],
];
function stageIndex(stage) {
  const value = typeof stage === "number" ? stage : (stage?.sector ?? (stage?.index == null ? 1 : stage.index + 1));
  return Math.max(0, Math.min(4, Math.floor(Number(value) || 1) - 1));
}
function palette(index) {
  const [body, accent, light] = COLORS[index];
  return {
    body: new THREE.MeshStandardMaterial({ color: body, roughness: .55, metalness: .45, emissive: body, emissiveIntensity: .2, flatShading: true }),
    dark: new THREE.MeshStandardMaterial({ color: 0x19223c, roughness: .55, metalness: .65, emissive: body, emissiveIntensity: .18, flatShading: true }),
    accent: new THREE.MeshStandardMaterial({ color: accent, emissive: accent, emissiveIntensity: .65, roughness: .3, metalness: .4, flatShading: true }),
    light: new THREE.MeshBasicMaterial({ color: light }),
  };
}
function mesh(group, geometry, material, x = 0, y = 0, z = 0, scale) {
  const result = new THREE.Mesh(geometry, material);
  result.position.set(x, y, z);
  if (scale) result.scale.set(...scale);
  group.add(result);
  return result;
}
const box = (g, m, x, y, z, w, h, d) => mesh(g, new THREE.BoxGeometry(w, h, d), m, x, y, z);
const orb = (g, m, x, y, z, w, h = w, d = w) => mesh(g, new THREE.IcosahedronGeometry(1, 0), m, x, y, z, [w, h, d]);
const spike = (g, m, x, y, z, radius, height, sides = 5) => mesh(g, new THREE.ConeGeometry(radius, height, sides), m, x, y, z);
const ring = (g, m, x, y, z, radius, thickness, arc = Math.PI * 2) => mesh(g, new THREE.TorusGeometry(radius, thickness, 5, 24, arc), m, x, y, z);
function wing(g, m, side, span, depth = 1) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(side * span, -.65); shape.lineTo(side * span * .78, .52); shape.lineTo(side * .42, 1.18); shape.closePath();
  return mesh(g, new THREE.ExtrudeGeometry(shape, { depth: .22 * depth, bevelEnabled: false }), m, 0, 0, -.4);
}
function joint(group, kind, phase = 0) {
  group.userData.motion = { kind, phase, position: group.position.clone(), rotation: group.rotation.clone() };
  return group;
}

export function buildStageScenery(stage) {
  const index = stageIndex(stage), p = palette(index), root = new THREE.Group();
  root.name = `${THEMES[index]} scenery`; root.userData.theme = THEMES[index];
  for (let i = 0; i < 30; i++) {
    const g = new THREE.Group(), side = i % 2 ? 1 : -1;
    g.name = `${THEMES[index]} landmark ${i + 1}`;
    g.position.set(side * (30 + ((i * 17) % 26)), 0, -8 - Math.floor(i / 2) * 19);
    g.userData.scroll = true;
    const size = .85 + (i % 5) * .16;
    if (index === 0) {
      if (i % 3) {
        mesh(g, new THREE.CylinderGeometry(.8, 1.6, 10, 6), p.body, 0, 5, 0);
        mesh(g, new THREE.SphereGeometry(1, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), p.accent, 0, 10, 0, [6, 2.8, 6]);
        const r = ring(g, p.light, 0, 10, 0, 5.4, .12); r.rotation.x = Math.PI / 2;
        orb(g, p.light, 0, 10.8, 0, 1.1, 1.5, 1.1);
      } else {
        mesh(g, new THREE.CylinderGeometry(.4, 1.4, 16, 5), p.dark, 0, 8, 0);
        for (let j = 0; j < 3; j++) {
          const branch = box(g, p.body, (j - 1) * 2, 10 + j * 2, 0, 1, 7, 1); branch.rotation.z = (j - 1) * -.55;
          orb(g, p.accent, (j - 1) * 3.2, 13 + j * 2, 0, 3, 2, 2.8);
        }
      }
    } else if (index === 1) {
      for (let j = 0; j < 3; j++) {
        const rock = mesh(g, new THREE.CylinderGeometry(1.1 + j * .5, 3.1, 12 + j * 5, 5), j === 1 ? p.accent : p.body, (j - 1) * 3.3, 6 + j * 2.5, j * 2);
        rock.rotation.z = (j - 1) * .16;
      }
      box(g, p.light, 0, 4, 2.5, .25, 7, .3);
    } else if (index === 2) {
      for (let j = 0; j < 3; j++) {
        const crystal = orb(g, j === 1 ? p.light : p.body, (j - 1) * 3.4, 7 + j * 2, j, 2.1, 10 + j * 2, 2.1);
        crystal.rotation.z = (j - 1) * -.22;
      }
      if (i % 3 === 0) {
        const arch = ring(g, p.accent, 0, 11, 0, 6, .65, Math.PI); arch.rotation.z = 0;
      }
    } else if (index === 3) {
      orb(g, p.dark, 0, 12, 0, 6, 2.5, 5);
      box(g, p.body, -3, 16, 0, 1.3, 7, 1.3); box(g, p.body, 3, 16, 0, 1.3, 7, 1.3);
      box(g, p.accent, 0, 19.3, 0, 8, 1.1, 1.6);
      for (let j = 0; j < 3; j++) {
        const vine = mesh(g, new THREE.CylinderGeometry(.12, .35, 8 + j * 2, 5), p.accent, (j - 1) * 2.2, 7 - j, 0);
        vine.rotation.z = (j - 1) * .18;
      }
    } else {
      box(g, p.dark, 0, 10, 0, 8, 20, 6);
      box(g, p.body, 0, 17, 0, 11, 3, 8);
      box(g, p.light, 0, 10, 3.1, .45, 17, .2);
      const r = ring(g, p.accent, 0, 25, 0, 6.5, .42); r.rotation.y = side * .35;
      orb(g, p.light, 0, 25, 0, 1.2);
    }
    g.scale.setScalar(size); root.add(g);
  }
  return root;
}

export function buildStageEnemy(stage, obstacle = false) {
  const index = stageIndex(stage), p = palette(index), g = new THREE.Group();
  const names = ["mechanical-manta", "armored-beetle", "shard-drone", "segmented-serpent", "blade-interceptor"];
  g.name = `${obstacle ? "hazard" : "enemy"} ${names[index]}`;
  g.userData.modelType = `${names[index]}${obstacle ? "-hazard" : ""}`;
  if (obstacle) {
    if (index === 0) { spike(g, p.accent, 0, .2, 0, 1.1, 1.6, 8); box(g, p.body, 0, -.6, 0, .45, .8, .45); }
    else if (index === 1) { orb(g, p.body, 0, 0, 0, 1, .85, .85); spike(g, p.accent, 0, .6, 0, .4, .8); }
    else if (index === 2) { orb(g, p.light, 0, 0, 0, .5, 1.1, .6); orb(g, p.accent, .5, -.1, 0, .4, .7, .4); }
    else if (index === 3) { ring(g, p.accent, 0, 0, 0, .8, .22); orb(g, p.light, 0, 0, 0, .35); }
    else { box(g, p.body, 0, 0, 0, 1.4, 1.2, 1); box(g, p.light, 0, 0, .55, 1.3, .16, .1); }
  } else if (index === 0) {
    orb(g, p.body, 0, 0, 0, .45, .3, .7);
    wing(g, p.accent, -1, 1.4); wing(g, p.accent, 1, 1.4);
    orb(g, p.light, 0, .12, .55, .22);
  } else if (index === 1) {
    orb(g, p.body, 0, 0, 0, .8, .45, .75);
    for (const s of [-1, 1]) {
      const horn = spike(g, p.accent, s * .42, .1, .8, .2, .85); horn.rotation.x = Math.PI / 2;
      for (let j = 0; j < 2; j++) { const leg = box(g, p.dark, s * .8, -.2, j * .6 - .3, .65, .15, .2); leg.rotation.z = s * -.4; }
      orb(g, p.light, s * .3, .2, .55, .1);
    }
  } else if (index === 2) {
    orb(g, p.light, 0, 0, 0, .35); ring(g, p.accent, 0, 0, 0, .7, .1);
    for (let j = 0; j < 4; j++) {
      const a = j * Math.PI / 2, shard = orb(g, p.body, Math.cos(a) * .85, Math.sin(a) * .85, 0, .18, .48, .25); shard.rotation.z = a - Math.PI / 2;
    }
  } else if (index === 3) {
    for (let j = 0; j < 5; j++) orb(g, j === 0 ? p.accent : p.body, Math.sin(j) * .3, Math.cos(j) * .16, .7 - j * .35, .4 - j * .035, .33, .35);
    for (const s of [-1, 1]) orb(g, p.light, s * .18, .18, .96, .09);
  } else {
    orb(g, p.dark, 0, 0, 0, .35, .3, .9);
    for (const s of [-1, 1]) { const blade = box(g, p.accent, s * .7, 0, -.2, .2, .25, 1.6); blade.rotation.y = s * -.6; }
    orb(g, p.light, 0, 0, .8, .18);
  }
  // Keep every variation within the gameplay collision envelope.
  const bounds = new THREE.Box3().setFromObject(g), size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  for (const child of g.children) child.position.sub(center);
  const factor = Math.min(1, 2.35 / size.length(), 1.8 / size.y);
  g.scale.setScalar(factor);
  return g;
}

export function buildStageBoss(stage) {
  const index = stageIndex(stage), p = palette(index), g = new THREE.Group();
  g.name = ["AURORA MANTA", "INFERNO RAM", "FROST ORBITER", "VENOM HYDRA", "NOVA EMPEROR"][index];
  g.userData.modelType = ["colossal-manta", "horned-ram", "orbital-crystal", "segmented-hydra", "solar-crown"][index];
  if (index === 0) {
    orb(g, p.body, 0, 0, 0, 1.45, .8, 1.8);
    for (const s of [-1, 1]) {
      const fin = new THREE.Group(); g.add(fin); wing(fin, p.body, s, 5); const inlay = wing(fin, p.accent, s, 3.7); inlay.position.z += .03;
      orb(fin, p.light, s * 3.4, .1, -.12, .6, .12, .15); joint(fin, "flap", s);
      orb(g, p.light, s * .65, .25, 1.45, .3, .16, .22);
    }
    const tail = spike(g, p.accent, 0, -.3, -2.2, .4, 3); tail.rotation.x = -Math.PI / 2;
    ring(g, p.light, 0, -.1, 1.6, .45, .08);
  } else if (index === 1) {
    orb(g, p.body, 0, -.15, 0, 2.6, 1.6, 1.3); orb(g, p.dark, 0, .1, 1, 1.3, 1.15, .9);
    for (const s of [-1, 1]) {
      const horn = ring(g, p.accent, s * 2.3, .65, .3, 1.35, .4, Math.PI * 1.55); horn.rotation.z = s > 0 ? -.65 : 2.1;
      orb(g, p.light, s * .65, .5, 1.75, .35, .15, .2);
      orb(g, p.body, s * 2.9, -.8, 0, .85, .75, 1.1);
      const tusk = spike(g, p.light, s * .95, -.6, 1.7, .22, 1.3); tusk.rotation.x = Math.PI / 2;
    }
    box(g, p.accent, 0, -.7, 1.85, 1.3, .3, .25);
  } else if (index === 2) {
    const core = new THREE.Group(); g.add(core); orb(core, p.light, 0, 0, 0, 1, 1.8, 1); joint(core, "spin", 0);
    for (let j = 0; j < 2; j++) { const r = ring(g, p.accent, 0, 0, 0, 2.2 + j * .6, .14); r.rotation.y = .65 + j * 1.2; joint(r, "orbit", j); }
    const halo = new THREE.Group(); g.add(halo);
    for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; const shard = orb(halo, j % 2 ? p.body : p.accent, Math.cos(a) * 4, Math.sin(a) * 2, 0, .45, .8, .45); shard.rotation.z = a - Math.PI / 2; }
    joint(halo, "sway", .8);
  } else if (index === 3) {
    orb(g, p.dark, 0, -.8, -.8, 2.6, 1.2, 1.2);
    for (let j = 0; j < 3; j++) {
      const neck = new THREE.Group(); neck.position.set((j - 1) * 2.6, j === 1 ? .7 : 0, 0); g.add(neck);
      for (let k = 0; k < 4; k++) orb(neck, k === 3 ? p.accent : p.body, Math.sin(k * .7 + j) * .35, -.8 + k * .42, -.8 + k * .48, .7 - k * .05, .55, .6);
      for (const s of [-1, 1]) {
        orb(neck, p.light, .2 + s * .25, .65, 1.05, .14);
        const tooth = spike(neck, p.light, .2 + s * .3, .25, .9, .1, .5); tooth.rotation.z = Math.PI;
      }
      joint(neck, "neck", j * 2);
    }
  } else {
    orb(g, p.body, 0, 0, 0, 1.5, 1.4, 1.2); orb(g, p.light, 0, 0, 1.15, .75);
    ring(g, p.accent, 0, 0, .1, 2, .2);
    const crown = new THREE.Group(); g.add(crown);
    for (let j = 0; j < 10; j++) {
      const a = j * Math.PI / 5;
      const blade = spike(crown, j % 2 ? p.accent : p.body, Math.cos(a) * 3.3, Math.sin(a) * 2.0, 0, .5, 1.8, 4); blade.rotation.z = a - Math.PI / 2;
      orb(crown, p.light, Math.cos(a) * 2.5, Math.sin(a) * 1.5, .3, .15);
    }
    joint(crown, "sway", 1.4);
  }
  return g;
}

export function animateStageBoss(group, stage, time) {
  const t = Number.isFinite(time) ? time : 0;
  group.traverse(part => {
    const m = part.userData.motion; if (!m) return;
    part.position.copy(m.position); part.rotation.copy(m.rotation);
    if (m.kind === "flap") part.rotation.z += Math.sin(t * 2.4) * .12 * m.phase;
    else if (m.kind === "spin") part.rotation.y += t * .7;
    else if (m.kind === "orbit") { part.rotation.z += t * (.4 + m.phase * .2); part.rotation.x += Math.sin(t * .6 + m.phase) * .25; }
    else if (m.kind === "neck") { part.position.y += Math.sin(t * 2 + m.phase) * .25; part.rotation.y += Math.sin(t * 1.5 + m.phase) * .18; }
    else if (m.kind === "sway") { part.rotation.z += Math.sin(t * .8 + m.phase) * .14; part.rotation.y += Math.sin(t * .6) * .18; }
  });
}
