let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicOn = false;
let sfxOn = true;
let nextNote = 0;
let step = 0;

const MELODY = [523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 440, 523.25];

function ensure() {
  if (ctx) return;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  ctx = new Ctx();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.045;
  musicGain.connect(master);
}

export function unlockAudio() {
  ensure();
  if (ctx && ctx.state === "suspended") void ctx.resume();
}

export function setMusicEnabled(on: boolean) {
  musicOn = on;
  if (on) unlockAudio();
}

export function setSfxEnabled(on: boolean) {
  sfxOn = on;
}

export function syncAudio(music: boolean, effects: boolean) {
  musicOn = music;
  sfxOn = effects;
}

export function pumpAudio() {
  if (!ctx || !musicGain || !musicOn || ctx.state !== "running") return;
  const ahead = ctx.currentTime + 0.35;
  while (nextNote < ahead) {
    const when = Math.max(nextNote, ctx.currentTime);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = step % 4 === 0 ? "triangle" : "sine";
    osc.frequency.value = MELODY[step % MELODY.length] ?? 523;
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(1, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.24);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(when);
    osc.stop(when + 0.26);
    nextNote = when + 0.3;
    step += 1;
  }
}

function blip(freq: number, dur: number, type: OscillatorType, gain: number) {
  if (!ctx || !master || !sfxOn) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export const sfx = {
  jump: () => blip(540, 0.12, "square", 0.05),
  coin: () => {
    blip(880, 0.07, "square", 0.05);
    blip(1320, 0.09, "square", 0.04);
  },
  boom: () => {
    blip(110, 0.28, "sawtooth", 0.08);
    blip(70, 0.34, "triangle", 0.07);
  },
  bonk: () => blip(160, 0.16, "sawtooth", 0.06),
  boing: () => blip(320, 0.16, "triangle", 0.06),
  yay: () => {
    blip(520, 0.1, "triangle", 0.05);
    blip(780, 0.14, "triangle", 0.04);
  },
};
