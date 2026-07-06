/**
 * Tiny WebAudio synth for all game SFX — no audio assets, fully offline.
 * The AudioContext is created/resumed on the first user gesture
 * (mobile autoplay policy); mute state persists in localStorage.
 */
export type SfxName =
  | 'tap'
  | 'place'
  | 'upgrade'
  | 'sell'
  | 'worker'
  | 'send'
  | 'waveStart'
  | 'buildStart'
  | 'hit'
  | 'death'
  | 'leak'
  | 'kingSpell'
  | 'heal'
  | 'victory'
  | 'defeat';

const STORAGE_KEY = 'laneLegion.muted';

let muted = false;
try {
  muted = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
} catch {
  /* ignore */
}

let ctx: AudioContext | null = null;

const ensureCtx = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

// Unlock audio on the first pointer interaction anywhere.
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => ensureCtx(), { once: true, capture: true });
}

interface ToneSpec {
  type: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  vol: number;
  delay?: number;
}

const tone = (c: AudioContext, s: ToneSpec): void => {
  const t0 = c.currentTime + (s.delay ?? 0);
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = s.type;
  osc.frequency.setValueAtTime(s.from, t0);
  if (s.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, s.to), t0 + s.dur);
  gain.gain.setValueAtTime(s.vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + s.dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + s.dur + 0.02);
};

interface NoiseSpec {
  dur: number;
  vol: number;
  /** Bandpass center frequency. */
  freq: number;
  delay?: number;
}

const noise = (c: AudioContext, s: NoiseSpec): void => {
  const t0 = c.currentTime + (s.delay ?? 0);
  const len = Math.max(1, Math.floor(c.sampleRate * s.dur));
  const buffer = c.createBuffer(1, len, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = s.freq;
  filter.Q.value = 0.9;
  const gain = c.createGain();
  gain.gain.setValueAtTime(s.vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + s.dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
};

/** Minimum seconds between repeats of spammy sounds. */
const MIN_GAP: Partial<Record<SfxName, number>> = { hit: 0.07, death: 0.09, heal: 0.3, tap: 0.05 };
const lastPlayed: Partial<Record<SfxName, number>> = {};

const vary = (base: number, pct: number): number => base * (1 + (Math.random() * 2 - 1) * pct);

const play = (name: SfxName): void => {
  if (muted) return;
  const c = ensureCtx();
  if (!c || c.state !== 'running') return;
  const nowSec = performance.now() / 1000;
  const gap = MIN_GAP[name];
  const last = lastPlayed[name];
  if (gap !== undefined && last !== undefined && nowSec - last < gap) return;
  lastPlayed[name] = nowSec;

  switch (name) {
    case 'tap':
      tone(c, { type: 'square', from: 700, to: 520, dur: 0.05, vol: 0.05 });
      break;
    case 'place':
      tone(c, { type: 'triangle', from: 220, to: 110, dur: 0.14, vol: 0.2 });
      noise(c, { dur: 0.08, vol: 0.1, freq: 500 });
      break;
    case 'upgrade':
      tone(c, { type: 'triangle', from: 440, to: 660, dur: 0.1, vol: 0.14 });
      tone(c, { type: 'triangle', from: 660, to: 990, dur: 0.12, vol: 0.14, delay: 0.09 });
      break;
    case 'sell':
      tone(c, { type: 'triangle', from: 520, to: 240, dur: 0.16, vol: 0.14 });
      break;
    case 'worker':
      tone(c, { type: 'sine', from: 1100, dur: 0.06, vol: 0.12 });
      tone(c, { type: 'sine', from: 1500, dur: 0.09, vol: 0.12, delay: 0.07 });
      break;
    case 'send':
      noise(c, { dur: 0.22, vol: 0.14, freq: 1400 });
      tone(c, { type: 'sine', from: 300, to: 620, dur: 0.2, vol: 0.1 });
      break;
    case 'waveStart':
      tone(c, { type: 'sawtooth', from: 196, dur: 0.3, vol: 0.12 });
      tone(c, { type: 'sawtooth', from: 294, dur: 0.32, vol: 0.1, delay: 0.12 });
      break;
    case 'buildStart':
      tone(c, { type: 'sine', from: 660, dur: 0.1, vol: 0.09 });
      tone(c, { type: 'sine', from: 880, dur: 0.16, vol: 0.09, delay: 0.1 });
      break;
    case 'hit':
      noise(c, { dur: 0.035, vol: 0.045, freq: vary(2200, 0.35) });
      break;
    case 'death':
      noise(c, { dur: 0.12, vol: 0.08, freq: vary(700, 0.25) });
      tone(c, { type: 'triangle', from: vary(210, 0.2), to: 70, dur: 0.13, vol: 0.06 });
      break;
    case 'leak':
      tone(c, { type: 'square', from: 440, to: 220, dur: 0.16, vol: 0.18 });
      tone(c, { type: 'square', from: 440, to: 220, dur: 0.18, vol: 0.18, delay: 0.16 });
      break;
    case 'kingSpell':
      tone(c, { type: 'sine', from: 130, to: 40, dur: 0.4, vol: 0.25 });
      noise(c, { dur: 0.28, vol: 0.14, freq: 300 });
      break;
    case 'heal':
      tone(c, { type: 'sine', from: 700, to: 950, dur: 0.14, vol: 0.05 });
      break;
    case 'victory':
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(c, { type: 'triangle', from: f, dur: 0.22, vol: 0.14, delay: i * 0.14 })
      );
      break;
    case 'defeat':
      [392, 330, 262, 196].forEach((f, i) =>
        tone(c, { type: 'triangle', from: f, dur: 0.28, vol: 0.14, delay: i * 0.17 })
      );
      break;
  }
};

export const sfx = {
  play,
  isMuted: (): boolean => muted,
  setMuted(m: boolean): void {
    muted = m;
    try {
      localStorage.setItem(STORAGE_KEY, m ? '1' : '0');
    } catch {
      /* ignore */
    }
  },
  toggleMuted(): boolean {
    sfx.setMuted(!muted);
    return muted;
  }
};
