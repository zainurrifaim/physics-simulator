import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, sample, advance, kmhToMs } from '../site/src/physics/models.js';
import { lessons } from '../site/src/lessons/index.js';

const close = (actual, expected, tol = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tol * Math.max(1, Math.abs(expected)), `${actual} ≉ ${expected}`);

const preset = (id) => lessons.find((l) => l.id === id).preset;

test('Soal 1 – atlet angkat besi: 300 J dibutuhkan, 500 J cukup', () => {
  const r = solve('angkat', preset('angkat'));
  close(r.work, 300);
  close(r.weight, 200);
  assert.equal(r.ok, true);
});

test('angkat: below, at and above the energy threshold', () => {
  const base = { mass: 20, height: 1.5 };
  assert.equal(solve('angkat', { ...base, energy: 299.99 }).ok, false);
  assert.equal(solve('angkat', { ...base, energy: 300 }).ok, true);
  assert.equal(solve('angkat', { ...base, energy: 300.01 }).ok, true);
  close(solve('angkat', { ...base, energy: 150 }).reachable, 0.75);
});

test('Soal 2 – derek: 30.000 J, 600 W ≤ 20.000 W', () => {
  const r = solve('derek', preset('derek'));
  close(r.work, 30000);
  close(r.required, 600);
  assert.equal(r.ok, true);
  close(r.duration, 50);
});

test('derek: insufficient power runs out of time below the target', () => {
  const r = solve('derek', { mass: 200, height: 15, time: 50, power: 300 });
  assert.equal(r.ok, false);
  close(r.minTime, 100);
  close(r.duration, 50);               // the requested window is a hard limit
  close(r.reached, 7.5);               // v = P / mg = 0,15 m/s for 50 s
  close(sample('derek', { mass: 200, height: 15, time: 50, power: 300 }, r, 50).position, 7.5);
  assert.equal(solve('derek', { mass: 200, height: 15, time: 50, power: 600 }).ok, true);
});

test('Soal 3 – lift: muatan maksimum 1.500 kg = 15.000 N', () => {
  const p = preset('lift');
  const r = solve('lift', p);
  close(r.speed, 0.25);
  close(r.maxTotalMass, 4000);
  close(r.maxPayload, 1500);
  close(r.maxPayloadWeight, 15000);
  // answer-key route: W = P t, F = W / s
  close((p.power * p.time) / (p.top - p.bottom) / 10 - p.cabin, r.maxPayload);
});

test('lift: thresholds and invalid heights', () => {
  const base = { cabin: 2500, top: 30, bottom: 5, time: 100, power: 10000 };
  assert.equal(solve('lift', { ...base, payload: 1500 }).ok, true);
  assert.equal(solve('lift', { ...base, payload: 1501 }).ok, false);
  assert.ok(solve('lift', { ...base, payload: 0 }).tensionWork < 0);
  assert.throws(() => solve('lift', { ...base, payload: 0, top: 5, bottom: 5 }), RangeError);
  assert.throws(() => solve('lift', { ...base, payload: -1 }), RangeError);
});

test('Soal 4 – sabuk: 10 m/s, a = −100 m/s², F = 6.000 N, tidak robek', () => {
  const r = solve('sabuk', preset('sabuk'));
  close(kmhToMs(36), 10);
  close(r.v0, 10);
  close(r.acceleration, -100);
  close(r.force, 6000);
  assert.equal(r.fails, false);
});

test('sabuk: belt fails at and above the limit; force scales with v²', () => {
  const base = { speed: 36, distance: 0.5, mass: 60, carMass: 1500 };
  assert.equal(solve('sabuk', { ...base, limit: 6001 }).fails, false);
  assert.equal(solve('sabuk', { ...base, limit: 6000 }).fails, true);
  assert.equal(solve('sabuk', { ...base, limit: 5999 }).fails, true);
  const doubled = solve('sabuk', { ...base, speed: 72, limit: 7000 });
  close(doubled.force, 24000);
});

test('Soal 5 – sepeda: v = 40 m/s, a = 5 m/s², t = 8 s', () => {
  const r = solve('sepeda', preset('sepeda'));
  close(r.speed, 40);
  close(r.acceleration, 5);
  close(r.duration, 8);
  close(r.energy, 64000);
});

test('sepeda: mass changes energy but not time; energy is conserved', () => {
  const light = solve('sepeda', { mass: 50, height: 80, length: 160 });
  const heavy = solve('sepeda', { mass: 120, height: 80, length: 160 });
  close(light.duration, heavy.duration);
  assert.notEqual(light.energy, heavy.energy);
  const p = { mass: 80, height: 80, length: 160 };
  const r = solve('sepeda', p);
  for (const t of [0, 1, 3.3, 8]) {
    const s = sample('sepeda', p, r, t);
    close(s.kinetic + s.potential, r.energy, 1e-9);
  }
  close(sample('sepeda', p, r, 8).position, 160);
  assert.throws(() => solve('sepeda', { mass: 80, height: 200, length: 160 }), RangeError);
});

test('sample() reaches the end state exactly', () => {
  for (const l of lessons) {
    const r = solve(l.id, l.preset);
    const end = sample(l.id, l.preset, r, r.duration * 2);
    assert.equal(end.q, 1, l.id);
  }
  const p = preset('sabuk');
  const r = solve('sabuk', p);
  const end = sample('sabuk', p, r, r.duration);
  close(end.position, p.distance);
  close(end.speed, 0, 1e-9);
});

test('invalid inputs throw', () => {
  assert.throws(() => solve('angkat', { mass: 0, height: 1, energy: 1 }), RangeError);
  assert.throws(() => solve('derek', { mass: 1, height: NaN, time: 1, power: 1 }), RangeError);
  assert.throws(() => solve('unknown', {}), RangeError);
});

test('advance(): playback speed changes only how fast time passes', () => {
  close(advance(0, 0.5, 1, 10), 0.5);
  close(advance(0, 0.5, 4, 10), 2);
  close(advance(9, 5, 1, 10), 10);
  close(advance(2, -1, 1, 10), 2);
});

test('every preset lies inside its slider ranges', () => {
  for (const l of lessons) {
    for (const f of l.fields) {
      const v = l.preset[f.key];
      assert.ok(v >= f.min && v <= f.max, `${l.id}.${f.key}=${v} outside [${f.min}, ${f.max}]`);
    }
  }
});

test('A/B comparisons support each hook question', () => {
  const pair = (id) => {
    const l = lessons.find((x) => x.id === id);
    const A = l.preset;
    const B = { ...l.preset, ...l.compare.B };
    return { l, A, B, rA: solve(id, A), rB: solve(id, B) };
  };
  for (const id of ['angkat', 'derek', 'lift']) {
    const { l, rA, rB } = pair(id);
    assert.equal(rA.ok, true, id);
    assert.equal(rB.ok, false, id);
    assert.equal(l.compare.options[l.compare.correct], 'Hanya A', id);
  }
  const s = pair('sabuk');
  close(s.rB.force / s.rA.force, 4);
  assert.equal(s.l.compare.options[s.l.compare.correct], 'Empat kali lipat');
  const c = pair('sepeda');
  close(c.rA.duration, c.rB.duration);
  assert.equal(c.l.compare.options[c.l.compare.correct], 'Bersamaan');
  for (const l of lessons) {
    for (const [k, v] of Object.entries(l.compare.B)) {
      const f = l.fields.find((x) => x.key === k);
      assert.ok(f && v >= f.min && v <= f.max, `${l.id}.B.${k}`);
    }
  }
});

test('setups exactly at a limit are never flipped by floating-point rounding', () => {
  // 2500 + 1250 kg at 8/75 m/s needs exactly 4000 W (computes as 4000.0000000000005)
  const r = solve('lift', { cabin: 2500, payload: 1250, top: 10, bottom: 2, time: 75, power: 4000 });
  assert.equal(r.ok, true);
  assert.equal(r.outcome, 'arrived');
  let flips = 0;
  for (let cabin = 500; cabin <= 5000; cabin += 100) for (let time = 20; time <= 200; time += 5) for (const drop of [5, 8, 13, 25, 33]) {
    const power = Math.round((cabin + 1000) * 10 * drop / time);
    const r2 = solve('lift', { cabin, payload: 1000, top: drop + 2, bottom: 2, time, power });
    if (!r2.ok && r2.absorbed <= power * (1 + 1e-12)) flips++;
  }
  assert.equal(flips, 0);
  assert.equal(solve('angkat', { mass: 20, height: 1.5, energy: 300 }).ok, true);
  assert.equal(solve('derek', { mass: 200, height: 15, time: 50, power: 600 }).ok, true);
});
