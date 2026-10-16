export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function createGame() {
  return {
    status: "playing",
    x: 0,
    y: 3,
    health: 100,
    score: 0,
    combo: 0,
    maxCombo: 0,
    time: 0,
    sector: 1,
    invincible: 0,
    boostTime: 0,
    boostCharge: 1,
    boss: false,
    bossHealth: 120,
    bossMax: 120,
    kills: 0,
  };
}
export function step(s, dt, input = {}) {
  if (s.status !== "playing") return;
  dt = clamp(dt, 0, 0.05);
  s.time += dt;
  s.x = clamp(s.x + (input.x || 0) * 13 * dt, -9, 9);
  s.y = clamp(s.y + (input.y || 0) * 10 * dt, 1, 7);
  s.invincible = Math.max(0, s.invincible - dt);
  s.boostTime = Math.max(0, s.boostTime - dt);
  s.boostCharge = Math.min(1, s.boostCharge + dt / 9);
  s.sector = Math.min(3, Math.floor(s.time / 35) + 1);
  if (s.time >= 105) s.boss = true;
}
export function damage(s, amount) {
  if (s.status !== "playing" || s.invincible > 0 || s.boostTime > 0)
    return false;
  s.health = Math.max(0, s.health - amount);
  s.invincible = 1.4;
  s.combo = 0;
  if (s.health <= 0) s.status = "lost";
  return true;
}
export function boost(s) {
  if (s.status !== "playing" || s.boostCharge < 1) return false;
  s.boostCharge = 0;
  s.boostTime = 1.8;
  return true;
}
export function hit(s, points = 100) {
  if (s.status !== "playing") return;
  s.combo++;
  s.kills++;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  s.score += points * Math.min(5, 1 + Math.floor(s.combo / 5));
}
export function hitBoss(s, amount) {
  if (!s.boss || s.status !== "playing") return;
  s.bossHealth = Math.max(0, s.bossHealth - amount);
  if (s.bossHealth === 0) {
    s.score += 5000;
    s.status = "won";
  }
}
