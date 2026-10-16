import { createGame, step, boost, clamp } from "./game.js";
import { load, save, record } from "./storage.js";
import { FlightView } from "./view.js";
import { AudioFX } from "./audio.js";
const $ = (id) => document.getElementById(id),
  fmt = (n) => String(Math.floor(n)).padStart(6, "0");
let data = load(),
  state = null,
  view,
  audio = new AudioFX(),
  keys = new Set(),
  pointer = null,
  last = performance.now(),
  lastSector = 0,
  announcementTimer = 0,
  saved = false;
try {
  view = new FlightView($("scene"), audio);
} catch (err) {
  $("error").hidden = false;
  console.error("WebGL initialization failed", err);
}
function persist() {
  if (!save(data)) $("storage-warning").hidden = false;
}
function refresh() {
  $("best").textContent = fmt(data.best);
  $("runs").textContent = String(data.runs.length).padStart(2, "0");
  audio.muted = data.settings.muted;
  $("mute").textContent = audio.muted ? "♫̸" : "♪";
  $("mute").setAttribute("aria-pressed", String(audio.muted));
  $("reduced").checked = data.settings.reduced;
  document.body.classList.toggle("reduced", data.settings.reduced);
  view?.setReduced(data.settings.reduced);
}
function hideScreens() {
  for (const id of ["menu", "pause-screen", "result-screen", "history-screen"])
    $(id).hidden = true;
}
function announce(text) {
  $("announcement").textContent = text;
  $("announcement").style.opacity = "1";
  announcementTimer = 2.5;
}
function start() {
  if (!view) return;
  audio.unlock();
  audio.play("start");
  view.reset();
  view.resize();
  state = createGame();
  keys.clear();
  pointer = null;
  saved = false;
  lastSector = 1;
  hideScreens();
  $("hud").hidden = false;
  document.body.classList.add("playing");
  last = performance.now();
  announce("SECTOR 01 // NEON COAST");
}
function home() {
  state = null;
  keys.clear();
  pointer = null;
  view?.reset();
  hideScreens();
  $("menu").hidden = false;
  $("hud").hidden = true;
  document.body.classList.remove("playing");
  refresh();
}
function pause() {
  if (state?.status !== "playing") return;
  state.status = "paused";
  keys.clear();
  pointer = null;
  $("pause-screen").hidden = false;
}
function resume() {
  if (state?.status !== "paused") return;
  state.status = "playing";
  $("pause-screen").hidden = true;
  last = performance.now();
  audio.unlock();
}
function activateBoost() {
  if (state && boost(state)) {
    audio.play("boost");
    announce("OVERDRIVE");
  }
}
function finish() {
  if (saved) return;
  saved = true;
  const isBest = state.score > data.best;
  data = record(data, state);
  persist();
  $("hud").hidden = true;
  $("result-screen").hidden = false;
  $("result-title").textContent =
    state.status === "won" ? "LIMIT BROKEN." : "NICE RUN.";
  $("result-kicker").textContent =
    state.status === "won" ? "MISSION COMPLETE" : "FLIGHT COMPLETE";
  $("result-subtitle").textContent =
    state.status === "won"
      ? "全セクター制覇。空は、君のものだ。"
      : "もう一度、限界の向こうへ。";
  $("final-score").textContent = fmt(state.score);
  $("new-best").textContent = isBest ? "NEW PERSONAL BEST ↗" : "";
  $("final-sector").textContent = String(state.sector).padStart(2, "0");
  $("final-combo").textContent = state.maxCombo + "×";
  $("final-time").textContent = Math.floor(state.time) + "s";
  if (state.status === "won") audio.play("win");
}
$("start").onclick = start;
$("restart").onclick = start;
$("pause").onclick = pause;
$("resume").onclick = resume;
$("quit").onclick = home;
$("home").onclick = home;
$("boost").onclick = activateBoost;
$("mute").onclick = () => {
  data.settings.muted = !data.settings.muted;
  audio.unlock();
  refresh();
  persist();
};
$("reduced").onchange = () => {
  data.settings.reduced = $("reduced").checked;
  refresh();
  persist();
};
$("history").onclick = () => {
  hideScreens();
  $("history-screen").hidden = false;
  const list = $("history-list");
  list.replaceChildren();
  if (!data.runs.length) {
    const p = document.createElement("p");
    p.textContent = "まだ記録がありません。最初のフライトへ！";
    list.append(p);
  }
  for (const r of data.runs) {
    const row = document.createElement("div");
    row.className = "history-row";
    const left = document.createElement("div"),
      score = document.createElement("b"),
      detail = document.createElement("small"),
      date = document.createElement("span");
    score.textContent = fmt(r.score);
    detail.textContent = `SECTOR ${r.sector} · ${r.time}s · ${r.status === "won" ? "CLEAR" : "FLIGHT"}`;
    date.textContent = Number.isNaN(Date.parse(r.date))
      ? "—"
      : new Date(r.date).toLocaleDateString("ja-JP");
    left.append(score, detail);
    row.append(left, date);
    list.append(row);
  }
};
$("close-history").onclick = home;
window.addEventListener("keydown", (e) => {
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
      e.code,
    )
  )
    e.preventDefault();
  keys.add(e.code);
  if (e.repeat) return;
  if (e.code === "Space") activateBoost();
  if (e.code === "Escape" || e.code === "KeyP") {
    if (state?.status === "playing") pause();
    else resume();
  }
  if (e.code === "Enter" && !state && $("menu").hidden === false) start();
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
window.addEventListener("blur", pause);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) pause();
});
window.addEventListener("resize", () => view?.resize());
const canvas = $("scene");
canvas.addEventListener("pointerdown", (e) => {
  if (state?.status !== "playing") return;
  pointer = { id: e.pointerId, x: e.clientX, y: e.clientY };
  canvas.setPointerCapture(e.pointerId);
  audio.unlock();
});
canvas.addEventListener("pointermove", (e) => {
  if (!pointer || pointer.id !== e.pointerId || state?.status !== "playing")
    return;
  state.x = clamp(state.x + ((e.clientX - pointer.x) / innerWidth) * 24, -9, 9);
  state.y = clamp(state.y - ((e.clientY - pointer.y) / innerHeight) * 13, 1, 7);
  pointer.x = e.clientX;
  pointer.y = e.clientY;
});
for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
  canvas.addEventListener(event, () => (pointer = null));
if (view)
  view.onDamage = () => {
    $("flash").style.opacity = ".55";
    setTimeout(() => ($("flash").style.opacity = "0"), 140);
  };
function frame(now) {
  const dt = Math.min(0.04, Math.max(0, (now - last) / 1000));
  last = now;
  const playing = state?.status === "playing";
  if (playing) {
    step(state, dt, {
      x:
        (keys.has("ArrowRight") || keys.has("KeyD") ? 1 : 0) -
        (keys.has("ArrowLeft") || keys.has("KeyA") ? 1 : 0),
      y:
        (keys.has("ArrowUp") || keys.has("KeyW") ? 1 : 0) -
        (keys.has("ArrowDown") || keys.has("KeyS") ? 1 : 0),
    });
    if (state.sector !== lastSector) {
      lastSector = state.sector;
      announce(
        `SECTOR 0${state.sector} // ${["", "NEON COAST", "CHROME CANYON", "MIDNIGHT RUSH"][state.sector]}`,
      );
    }
    if (state.boss && !view.bossMesh) announce("WARNING // SENTINEL");
  }
  view?.tick(dt, state, playing);
  if (state) {
    $("score").textContent = fmt(state.score);
    $("sector").textContent = `SECTOR 0${state.sector}`;
    $("sector-name").textContent = [
      "",
      "NEON COAST",
      "CHROME CANYON",
      "MIDNIGHT RUSH",
    ][state.sector];
    $("health").style.width = state.health + "%";
    $("health").style.background = state.health < 35 ? "#ff4e8e" : "#76fff5";
    $("health-number").textContent = state.health;
    $("combo").textContent =
      state.combo >= 3
        ? `${state.combo} COMBO ×${Math.min(5, 1 + Math.floor(state.combo / 5))}`
        : "";
    $("boss-bar").hidden = !state.boss;
    $("boss-health").style.width =
      (state.bossHealth / state.bossMax) * 100 + "%";
    $("boost-meter").style.width = state.boostCharge * 100 + "%";
    $("boost-label").textContent =
      state.boostCharge >= 1
        ? "BOOST ↗"
        : `${Math.ceil((1 - state.boostCharge) * 9)}s RECHARGE`;
    $("boost").disabled = state.boostCharge < 1;
    const carScreen = view?.car.position.clone().project(view.camera);
    if (carScreen) {
      $("reticle").style.left = (carScreen.x * 0.5 + 0.5) * 100 + "%";
      $("reticle").style.top =
        clamp((-carScreen.y * 0.5 + 0.5) * 100 - 16, 20, 75) + "%";
    }
    if (state.status === "won" || state.status === "lost") finish();
  }
  if (playing && announcementTimer > 0) {
    announcementTimer -= dt;
    if (announcementTimer <= 0) $("announcement").style.opacity = "0";
  }
  requestAnimationFrame(frame);
}
refresh();
if (!save(data)) $("storage-warning").hidden = false;
if (view) requestAnimationFrame(frame);
