export class AudioFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.lastShot = 0;
  }
  unlock() {
    try {
      this.ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      this.ctx.resume();
    } catch {}
  }
  tone(freq, duration, type = "sine", volume = 0.06, slide = 0) {
    if (this.muted || !this.ctx) return;
    const t = this.ctx.currentTime,
      o = this.ctx.createOscillator(),
      g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide)
      o.frequency.exponentialRampToValueAtTime(
        Math.max(30, freq + slide),
        t + duration,
      );
    g.gain.setValueAtTime(volume, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g);
    g.connect(this.ctx.destination);
    o.start(t);
    o.stop(t + duration);
  }
  play(name) {
    if (name === "shot") {
      if (performance.now() - this.lastShot < 160) return;
      this.lastShot = performance.now();
      this.tone(700, 0.07, "triangle", 0.025, -450);
    }
    if (name === "hit") this.tone(110, 0.22, "sawtooth", 0.05, -75);
    if (name === "kill") {
      this.tone(280, 0.12, "square", 0.035, -200);
      this.tone(100, 0.25, "triangle", 0.06, -65);
    }
    if (name === "boost") {
      this.tone(180, 0.7, "sawtooth", 0.035, 900);
      this.tone(540, 0.5, "sine", 0.07, 500);
    }
    if (name === "start") {
      [0, 100, 200, 350].forEach((d, i) =>
        setTimeout(
          () => this.tone([330, 440, 660, 880][i], 0.3, "triangle", 0.07),
          d,
        ),
      );
    }
    if (name === "win") this.play("start");
  }
}
