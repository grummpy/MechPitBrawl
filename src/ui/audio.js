/** Live Web Audio chiptune. No sample files. */

const THEME = [220, 0, 262, 196, 220, 247, 196, 175];
const BASS = [110, 110, 98, 87];

export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.8;
    this.muted = false;
    this.themeTimer = null;
    this.step = 0;
    this.started = false;
  }

  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
    }
    this.applyGain();
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  applyGain() {
    if (!this.master) return;
    const level = this.muted ? 0 : this.volume;
    this.master.gain.setValueAtTime(level, this.ctx.currentTime);
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyGain();
  }

  setMuted(muted) {
    this.muted = !!muted;
    this.applyGain();
  }

  startTheme() {
    if (this.started) return;
    this.unlock();
    if (!this.ctx) return;
    this.started = true;
    const loop = () => {
      if (!this.started) return;
      const note = THEME[this.step % THEME.length];
      const bass = BASS[Math.floor(this.step / 2) % BASS.length];
      if (note) this.tone(note, 0.16, "square", 0.05);
      this.tone(bass, 0.18, "triangle", 0.04);
      if (this.step % 2 === 0) this.noise(0.04, 0.03);
      this.step += 1;
      this.themeTimer = setTimeout(loop, 176);
    };
    loop();
  }

  tone(freq, dur, type, gain) {
    if (!this.ctx || this.muted || this.volume <= 0 || !freq) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  noise(dur, gain) {
    if (!this.ctx || this.muted || this.volume <= 0) return;
    const rate = this.ctx.sampleRate;
    const length = Math.max(1, Math.floor(rate * dur));
    const buffer = this.ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const amp = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const t = this.ctx.currentTime;
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  sweep(from, to, dur, type, gain) {
    if (!this.ctx || this.muted || this.volume <= 0) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  play(event) {
    if (!event) return;
    if (event.type === "hit") {
      this.tone(180 + Math.min(240, event.damage || 0), 0.08, "square", 0.07);
      this.noise(0.06, 0.05);
    } else if (event.type === "pickup") {
      this.tone(523, 0.07, "square", 0.05);
      this.tone(659, 0.08, "square", 0.05);
      this.tone(784, 0.1, "square", 0.05);
    } else if (event.type === "ko") {
      this.sweep(420, 60, 0.35, "sawtooth", 0.07);
      this.noise(0.2, 0.06);
    } else if (event.type === "countdown") {
      this.tone(event.n === 1 ? 660 : 880, 0.09, "square", 0.06);
    } else if (event.type === "go") {
      this.tone(523, 0.08, "square", 0.06);
      this.tone(784, 0.14, "square", 0.06);
    } else if (event.type === "round" || event.type === "match") {
      this.tone(392, 0.1, "square", 0.06);
      this.tone(523, 0.12, "square", 0.06);
      this.tone(659, 0.16, "square", 0.06);
      this.tone(784, 0.22, "square", 0.05);
    }
  }

  blip() {
    this.tone(660, 0.05, "square", 0.04);
  }
}
