// Shared helpers for invariant tests (not a test file itself).
import { solve, sample } from '../site/src/physics/models.js';

function rng(seed) {
  let x = seed >>> 0;
  return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** Parameter sets to test for a lesson: A, B, each field at its extremes, random combinations. */
export function parameterSets(lesson, randomCount = 25) {
  const A = { ...lesson.preset }, B = { ...lesson.preset, ...lesson.compare.B };
  const sets = [['A', A], ['B', B]];
  for (const f of lesson.fields) {
    sets.push([`${f.key}=min`, { ...A, [f.key]: f.min }], [`${f.key}=max`, { ...A, [f.key]: f.max }]);
    sets.push([`B ${f.key}=max`, { ...B, [f.key]: f.max }]);
  }
  const rand = rng(lesson.id.length * 7919 + 13);
  for (let i = 0; i < randomCount; i++) {
    const p = {};
    for (const f of lesson.fields) {
      const steps = Math.round((f.max - f.min) / f.step);
      p[f.key] = Number((f.min + Math.round(rand() * steps) * f.step).toFixed(6));
    }
    sets.push([`random ${i}`, p]);
  }
  return sets.filter(([, p]) => { try { solve(lesson.id, p); return true; } catch { return false; } });
}

/** Solve once and sample `count + 1` evenly spaced frames over the whole timeline. */
export function frames(id, p, count = 240) {
  const r = solve(id, p);
  return { r, states: Array.from({ length: count + 1 }, (_, i) => sample(id, p, r, (r.duration * i) / count)) };
}
