import { useProgress } from './store';

// ---------------------------------------------------------------- TTS
let voices: SpeechSynthesisVoice[] = [];
let lastText = '';
let lastPitch = 1;
const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

function loadVoices() {
  if (!synth) return;
  voices = synth.getVoices();
}
if (synth) {
  loadVoices();
  synth.onvoiceschanged = loadVoices;
}

export function spanishVoices() {
  return voices.filter((v) => v.lang.toLowerCase().startsWith('es'));
}

function bestVoice(variant = 0): SpeechSynthesisVoice | undefined {
  const es = spanishVoices();
  if (!es.length) return undefined;
  const esES = es.filter((v) => /es[-_]ES/i.test(v.lang));
  const pool = esES.length ? esES : es;
  // prefer natural / google / premium voices first
  const ranked = pool.slice().sort((a, b) => score(b) - score(a));
  return ranked[variant % Math.min(ranked.length, 3)] ?? ranked[0];
}
function score(v: SpeechSynthesisVoice) {
  const n = v.name.toLowerCase();
  let s = 0;
  if (n.includes('natural') || n.includes('neural') || n.includes('premium') || n.includes('enhanced')) s += 5;
  if (n.includes('google')) s += 3;
  if (n.includes('mónica') || n.includes('monica') || n.includes('jorge') || n.includes('elvira') || n.includes('alvaro')) s += 2;
  if (v.localService) s += 1;
  return s;
}

export const ttsAvailable = () => !!synth;

export function speak(text: string, opts: { slow?: boolean; pitch?: number; voice?: number; onEnd?: () => void } = {}) {
  if (!synth) {
    opts.onEnd?.();
    return;
  }
  const st = useProgress.getState().settings;
  if (st.voice <= 0) {
    opts.onEnd?.();
    return;
  }
  lastText = text;
  lastPitch = opts.pitch ?? 1;
  synth.cancel();
  const clean = text.replace(/[«»"“”]/g, '').replace(/_+/g, ' ');
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = 'es-ES';
  const v = bestVoice(opts.voice ?? 0);
  if (v) u.voice = v;
  u.rate = opts.slow ? 0.6 : st.voiceRate;
  u.pitch = opts.pitch ?? 1;
  u.volume = st.voice;
  if (opts.onEnd) {
    let done = false;
    const fin = () => {
      if (!done) {
        done = true;
        opts.onEnd?.();
      }
    };
    u.onend = fin;
    u.onerror = fin;
    setTimeout(fin, 1500 + clean.length * 120);
  }
  // iOS sometimes needs a tick after cancel
  setTimeout(() => synth.speak(u), 30);
}
export function repeatLast(slow = false) {
  if (lastText) speak(lastText, { slow, pitch: lastPitch });
}
export function stopSpeech() {
  synth?.cancel();
}

// ---------------------------------------------------------------- WebAudio
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let sfxGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

export function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.connect(master);
    sfxGain = ctx.createGain();
    sfxGain.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    applyVolumes();
    if (pendingTheme) setTimeout(() => playMusic(pendingTheme), 0);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function applyVolumes() {
  const s = useProgress.getState().settings;
  if (musicGain) musicGain.gain.value = s.music * 0.5;
  if (sfxGain) sfxGain.gain.value = s.sfx;
}
useProgress.subscribe(applyVolumes);

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0, slideTo?: number, dest?: AudioNode) {
  const c = audioCtx();
  if (!c || !sfxGain) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(dest ?? sfxGain);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
function noise(dur: number, vol = 0.3, filterFreq = 1200, type: BiquadFilterType = 'lowpass', delay = 0) {
  const c = audioCtx();
  if (!c || !sfxGain || !noiseBuf) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(sfxGain);
  src.start(t0, Math.random());
  src.stop(t0 + dur + 0.05);
}

export type Sfx =
  | 'click' | 'ok' | 'wrong' | 'coin' | 'kick' | 'whistle' | 'jump' | 'land' | 'step' | 'goal' | 'spin' | 'tick'
  | 'horn' | 'win' | 'lose' | 'door' | 'pickup' | 'phone' | 'flip' | 'bus' | 'unlock' | 'star';

let lastStep = 0;
export function sfx(name: Sfx) {
  if (!ctx || useProgress.getState().settings.sfx <= 0) return;
  switch (name) {
    case 'click': tone(900, 0.05, 'square', 0.08); break;
    case 'ok': tone(660, 0.12, 'triangle', 0.25); tone(990, 0.2, 'triangle', 0.25, 0.1); break;
    case 'wrong': tone(220, 0.25, 'sawtooth', 0.12, 0, 150); break;
    case 'coin': tone(988, 0.08, 'square', 0.12); tone(1319, 0.25, 'square', 0.12, 0.07); break;
    case 'star': tone(1200, 0.1, 'triangle', 0.2); tone(1600, 0.1, 'triangle', 0.2, 0.06); tone(2000, 0.25, 'triangle', 0.2, 0.12); break;
    case 'kick': noise(0.08, 0.6, 600); tone(120, 0.12, 'sine', 0.5, 0, 60); break;
    case 'whistle': tone(2800, 0.35, 'sine', 0.18); tone(2850, 0.35, 'sine', 0.1); break;
    case 'jump': tone(300, 0.18, 'triangle', 0.15, 0, 600); break;
    case 'land': noise(0.08, 0.25, 300); break;
    case 'step': {
      const now = performance.now();
      if (now - lastStep < 120) return;
      lastStep = now;
      noise(0.05, 0.07, 700 + Math.random() * 400);
      break;
    }
    case 'goal':
      noise(1.6, 0.25, 900, 'bandpass');
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.3, 'triangle', 0.2, i * 0.1));
      break;
    case 'spin': tone(700, 0.03, 'square', 0.06); break;
    case 'tick': tone(1500, 0.03, 'square', 0.05); break;
    case 'horn': tone(330, 0.35, 'sawtooth', 0.08); tone(415, 0.35, 'sawtooth', 0.06); break;
    case 'win': [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, 'triangle', 0.22, i * 0.12)); break;
    case 'lose': [392, 330, 262].forEach((f, i) => tone(f, 0.35, 'triangle', 0.18, i * 0.18)); break;
    case 'door': noise(0.25, 0.2, 400); tone(160, 0.2, 'sine', 0.2); break;
    case 'pickup': tone(520, 0.08, 'triangle', 0.2); tone(780, 0.15, 'triangle', 0.2, 0.06); break;
    case 'phone': [0, 0.25, 0.9, 1.15].forEach((d) => tone(1100, 0.18, 'square', 0.07, d)); break;
    case 'flip': noise(0.07, 0.15, 3000, 'highpass'); break;
    case 'bus': noise(0.6, 0.2, 200); tone(90, 0.6, 'sawtooth', 0.05); break;
    case 'unlock': [400, 600, 800].forEach((f, i) => tone(f, 0.15, 'square', 0.1, i * 0.08)); break;
  }
}

// ---------------------------------------------------------------- Music (procedural)
type Theme = 'menu' | 'city' | 'action' | 'quiz' | 'calm' | 'night';
let musicTimer: number | null = null;
let currentTheme: Theme | null = null;
let ambience: AudioBufferSourceNode | null = null;
let ambGain: GainNode | null = null;

const THEMES: Record<Theme, { bpm: number; chords: number[][]; bass: boolean; hat: boolean; lead: boolean }> = {
  menu: { bpm: 104, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bass: true, hat: true, lead: true },
  city: { bpm: 92, chords: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], bass: true, hat: true, lead: false },
  action: { bpm: 128, chords: [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 50, 54]], bass: true, hat: true, lead: true },
  quiz: { bpm: 116, chords: [[60, 64, 67], [62, 65, 69], [64, 67, 71], [62, 65, 69]], bass: true, hat: true, lead: false },
  calm: { bpm: 76, chords: [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]], bass: false, hat: false, lead: false },
  night: { bpm: 84, chords: [[45, 52, 55, 60], [41, 48, 53, 57], [43, 50, 55, 59], [40, 47, 52, 55]], bass: true, hat: false, lead: false },
};
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

let pendingTheme: Theme | null = null;
export function playMusic(theme: Theme | null) {
  if (!ctx) {
    pendingTheme = theme;
    return;
  }
  if (theme === currentTheme) return;
  currentTheme = theme;
  if (musicTimer) {
    clearInterval(musicTimer);
    musicTimer = null;
  }
  if (!theme) return;
  const c = audioCtx();
  if (!c || !musicGain) return;
  const th = THEMES[theme];
  const beat = 60 / th.bpm;
  let step = 0;
  const leadScale = [0, 2, 4, 7, 9, 12];
  const play = () => {
    if (!ctx || !musicGain) return;
    const t0 = ctx.currentTime + 0.05;
    const bar = Math.floor(step / 8) % th.chords.length;
    const chord = th.chords[bar];
    const s8 = step % 8;
    if (s8 === 0) {
      chord.forEach((n) => pad(mtof(n), beat * 8, t0));
    }
    if (th.bass && (s8 === 0 || s8 === 3 || s8 === 4 || s8 === 6)) pluck(mtof(chord[0] - 12), beat * 0.45, t0, 0.18, 'triangle');
    if (th.hat && s8 % 2 === 1) hat(t0);
    if (th.hat && (s8 === 0 || s8 === 4)) kick(t0);
    if (th.lead && Math.random() < 0.32) pluck(mtof(chord[0] + 12 + leadScale[Math.floor(Math.random() * leadScale.length)]), beat * 0.4, t0, 0.06, 'sine');
    step++;
  };
  musicTimer = window.setInterval(play, (beat / 2) * 1000);
}
function pad(freq: number, dur: number, t0: number) {
  if (!ctx || !musicGain) return;
  const o = ctx.createOscillator();
  const o2 = ctx.createOscillator();
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 1400;
  o.type = 'sawtooth';
  o2.type = 'sawtooth';
  o.frequency.value = freq;
  o2.frequency.value = freq * 1.005;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(0.03, t0 + 0.4);
  g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  o.connect(f);
  o2.connect(f);
  f.connect(g).connect(musicGain);
  o.start(t0);
  o2.start(t0);
  o.stop(t0 + dur + 0.1);
  o2.stop(t0 + dur + 0.1);
}
function pluck(freq: number, dur: number, t0: number, vol: number, type: OscillatorType) {
  if (!ctx || !musicGain) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(musicGain);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
function hat(t0: number) {
  if (!ctx || !musicGain || !noiseBuf) return;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = 7000;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.05, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  s.connect(f).connect(g).connect(musicGain);
  s.start(t0, Math.random());
  s.stop(t0 + 0.06);
}
function kick(t0: number) {
  if (!ctx || !musicGain) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.setValueAtTime(140, t0);
  o.frequency.exponentialRampToValueAtTime(45, t0 + 0.15);
  g.gain.setValueAtTime(0.25, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
  o.connect(g).connect(musicGain);
  o.start(t0);
  o.stop(t0 + 0.25);
}

/** Soft background ambience (city hum, crowd, waves) */
export function playAmbience(kind: 'city' | 'crowd' | 'waves' | null) {
  if (!ctx) return;
  if (ambience) {
    try { ambience.stop(); } catch { /* noop */ }
    ambience = null;
  }
  if (!kind) return;
  const c = audioCtx();
  if (!c || !noiseBuf || !sfxGain) return;
  ambience = c.createBufferSource();
  ambience.buffer = noiseBuf;
  ambience.loop = true;
  const f = c.createBiquadFilter();
  f.type = kind === 'crowd' ? 'bandpass' : 'lowpass';
  f.frequency.value = kind === 'city' ? 380 : kind === 'crowd' ? 900 : 600;
  ambGain = c.createGain();
  ambGain.gain.value = kind === 'crowd' ? 0.05 : 0.07;
  if (kind === 'waves') {
    const lfo = c.createOscillator();
    const lg = c.createGain();
    lfo.frequency.value = 0.12;
    lg.gain.value = 0.05;
    lfo.connect(lg).connect(ambGain.gain);
    lfo.start();
  }
  ambience.connect(f).connect(ambGain).connect(sfxGain);
  ambience.start();
}
