// Small "juice" helpers: optional sound effects, count-up numbers and confetti.
import { fmt } from '../format.js';
import * as store from '../state/storage.js';

const settings = () => store.draft('_settings');
export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---- sound (WebAudio, synthesised; off by default for classrooms) ----------
let ctx = null;
export const soundOn = () => !!settings().sound;
export function setSound(on) {
  settings().sound = !!on;
  store.save();
  if (on) blip('tick');
}

function tone(freq, start, dur, { type = 'sine', gain = 0.08, slide = 0 } = {}) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slide) osc.frequency.exponentialRampToValueAtTime(freq * slide, start + dur);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** kinds: tick (step change), pop (label/word), whoosh (motion), ding (correct), soft (wrong), thud (impact) */
export function blip(kind) {
  if (!soundOn()) return;
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    switch (kind) {
      case 'tick': tone(880, t, 0.06, { type: 'triangle', gain: 0.05 }); break;
      case 'pop': tone(520, t, 0.08, { type: 'sine', gain: 0.06, slide: 1.8 }); break;
      case 'whoosh': tone(180, t, 0.5, { type: 'sawtooth', gain: 0.025, slide: 3 }); break;
      case 'ding': tone(988, t, 0.25, { gain: 0.07 }); tone(1319, t + 0.12, 0.4, { gain: 0.07 }); break;
      case 'soft': tone(330, t, 0.18, { type: 'triangle', gain: 0.05 }); tone(262, t + 0.14, 0.28, { type: 'triangle', gain: 0.05 }); break;
      case 'thud': tone(110, t, 0.3, { type: 'square', gain: 0.05, slide: 0.4 }); break;
    }
  } catch {
    /* audio unavailable */
  }
}

// ---- count-up --------------------------------------------------------------
export function countUp(el, to, { digits = 0, suffix = '', duration = 1200 } = {}) {
  if (reducedMotion() || !Number.isFinite(to)) {
    el.textContent = fmt(to, digits) + suffix;
    return;
  }
  const start = performance.now();
  const step = (now) => {
    if (!el.isConnected) return;
    const k = Math.min(1, (now - start) / duration);
    const eased = 1 - (1 - k) ** 3;
    el.textContent = fmt(to * eased, k < 1 ? Math.min(digits, 1) : digits) + suffix;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ---- confetti ----------------------------------------------------------------
const COLORS = ['#ff9a5a', '#6fb7ff', '#c79bff', '#5ed3a8', '#ffd166'];
export function confetti(host, count = 60) {
  if (reducedMotion() || !host) return;
  const layer = document.createElement('div');
  layer.className = 'confetti';
  layer.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('i');
    const angle = (Math.random() - 0.5) * Math.PI * 0.9;
    const dist = 140 + Math.random() * 220;
    piece.style.setProperty('--dx', `${Math.sin(angle) * dist}px`);
    piece.style.setProperty('--dy', `${-Math.cos(angle) * dist * 0.9}px`);
    piece.style.setProperty('--r', `${(Math.random() - 0.5) * 900}deg`);
    piece.style.setProperty('--d', `${0.9 + Math.random() * 0.7}s`);
    piece.style.background = COLORS[i % COLORS.length];
    piece.style.left = `${45 + Math.random() * 10}%`;
    layer.append(piece);
  }
  host.append(layer);
  setTimeout(() => layer.remove(), 2000);
}
