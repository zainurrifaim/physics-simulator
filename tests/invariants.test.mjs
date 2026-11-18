// Physical invariants checked on every sampled frame of every module, for the original
// problem, its B comparison, every slider at its min and max, and seeded random setups.
// These are the rules the animation may never break (no stretching arms, no lifting a
// load the verdict says cannot be lifted, energy that adds up, ...).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { solve, sample, BAR_REST_HEIGHT, DASH_GAP, G } from '../site/src/physics/models.js';
import { lessons } from '../site/src/lessons/index.js';
import { scene } from '../site/src/scenes/index.js';
import { BODY, GRIP_HALF, segmentLengths } from '../site/src/scenes/rig.js';
import { poseFor } from '../site/src/scenes/angkat.js';
import { parameterSets, frames as framesFor } from './helpers.mjs';

const FRAMES = 240;
const EPS = 1e-9;

const frames = (id, p) => framesFor(id, p, FRAMES);

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

for (const lesson of lessons) {
  test(`${lesson.id}: every frame is finite and every scene renders cleanly`, () => {
    for (const [name, p] of parameterSets(lesson)) {
      const { r, states } = frames(lesson.id, p);
      for (const s of states) {
        for (const [k, v] of Object.entries(s)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${name} t=${s.t} ${k}=${v}`);
        assert.equal(typeof s.phase, 'string', `${name}: phase`);
      }
      for (const s of [states[0], states[FRAMES >> 2], states[FRAMES >> 1], states[FRAMES]]) {
        const svg = scene(lesson.id, p, r, s);
        assert.doesNotMatch(svg, /NaN|undefined|Infinity/, `${name} t=${s.t}`);
      }
    }
  });
}

test('angkat: limbs keep their length, hands stay on the bar, feet stay on the floor', () => {
  const lesson = lessons.find((l) => l.id === 'angkat');
  for (const [name, p] of parameterSets(lesson)) {
    const { states } = frames('angkat', p);
    for (const s of states) {
      const pose = poseFor(s);
      for (const [seg, len] of segmentLengths(pose)) near(len, BODY[seg], 1e-6, `${name} t=${s.t} ${seg}`);
      for (const k of ['L', 'R']) {
        near(pose[k].ankle.y, BODY.ankleY, 1e-6, `${name} ankle`);
        assert.ok(pose[k].legReached, `${name} t=${s.t}: leg cannot reach the floor`);
        for (const j of ['hip', 'knee', 'ankle', 'shoulder', 'elbow', 'hand']) assert.ok(pose[k][j].y >= 0, `${name}: ${j} below floor`);
        if (s.grip) {
          assert.ok(pose[k].armReached, `${name} t=${s.t}: bar out of reach (arm would have to stretch)`);
          near(pose[k].hand.y, BAR_REST_HEIGHT + s.position, 1e-6, `${name} hand on bar`);
          near(Math.abs(pose[k].hand.x), GRIP_HALF, 1e-6, `${name} grip width`);
        }
      }
    }
  }
});

test('angkat: never above the energy budget; failure ends with the bar on the floor', () => {
  const lesson = lessons.find((l) => l.id === 'angkat');
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('angkat', p);
    for (const s of states) {
      assert.ok(s.athleteWork <= p.energy * (1 + 1e-9) + EPS, `${name} t=${s.t}: work ${s.athleteWork} > ${p.energy}`);
      assert.ok(s.position <= r.reachable + EPS, `${name}: above reachable height`);
      assert.ok(s.position >= -EPS, `${name}: through the floor`);
      if (!s.grip) assert.equal(s.liftForce, 0, `${name}: force without grip`);
    }
    const end = states[FRAMES];
    if (r.ok) near(end.position, p.height, 1e-9, `${name} reaches target`);
    else { assert.equal(end.phase, 'dropped', name); near(end.position, 0, 1e-9, `${name} bar on floor`); }
    // free fall in the drop phase: mechanical energy of the bar is conserved
    for (const s of states.filter((x) => x.phase === 'drop')) near(s.potential + s.kinetic, r.weight * r.reachable, 1e-6 * r.weight, `${name} drop energy`);
  }
});

test('derek: never higher than the power and time window allow; overload never leaves the ground', () => {
  const lesson = lessons.find((l) => l.id === 'derek');
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('derek', p);
    for (const s of states) {
      assert.ok(s.position <= p.height + EPS, `${name}: above target`);
      assert.ok(s.position <= (p.power / (p.mass * G)) * s.t + 1e-9, `${name} t=${s.t}: faster than P / mg`);
      assert.ok(s.power <= p.power * (1 + 1e-9), `${name}: power above rating`);
      if (r.overload) assert.equal(s.position, 0, `${name}: overloaded crate moved`);
    }
    const end = states[FRAMES];
    if (r.ok) near(end.position, p.height, 1e-9, `${name} arrives`);
    else assert.ok(end.position < p.height - 1e-6, `${name}: verdict "no" but the crate reached the top`);
  }
});

test('lift: energy adds up; an overloaded cabin never completes the normal descent', () => {
  const lesson = lessons.find((l) => l.id === 'lift');
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('lift', p);
    for (const s of states) {
      const total = s.potential + s.kinetic + s.absorbed + s.safetyEnergy;
      near(total, r.energy0, 2e-3 * r.energy0, `${name} t=${s.t} energy`);
      assert.ok(s.drivePower <= p.power * (1 + 1e-9), `${name}: drive above rated power`);
      assert.ok(s.position >= p.bottom - 1e-6 && s.position <= p.top + 1e-9, `${name}: outside the shaft range`);
    }
    const end = states[FRAMES];
    if (r.ok) near(end.position, p.bottom, 1e-6, `${name} arrives`);
    else {
      assert.ok(['stopped', 'buffer'].includes(end.phase), `${name}: overload must end stopped or on the buffer`);
      if (end.phase === 'stopped') assert.ok(end.position > p.bottom, name);
    }
  }
});

test('sabuk: a holding belt keeps the dummy in the seat; a torn belt sends it into the dashboard', () => {
  const lesson = lessons.find((l) => l.id === 'sabuk');
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('sabuk', p);
    let prev = 0;
    for (const s of states) {
      assert.ok(s.position <= p.distance + 1e-9, `${name}: car beyond the crumple distance`);
      if (r.ok) { assert.equal(s.dummyOffset, 0, name); assert.equal(s.beltIntact, true, name); }
      else {
        assert.ok(s.dummyOffset >= prev - 1e-12 && s.dummyOffset <= DASH_GAP + 1e-9, `${name}: dummy offset ${s.dummyOffset}`);
        if (s.t > 0) assert.equal(s.beltIntact, false, `${name}: belt should be torn`);
        prev = s.dummyOffset;
      }
    }
    const end = states[FRAMES];
    near(end.speed, 0, 1e-9, `${name} car stops`);
    if (!r.ok) { near(end.dummyOffset, DASH_GAP, 1e-9, `${name} dummy at dashboard`); assert.equal(end.phase, 'impact', name); }
  }
});

test('sepeda: energy is conserved and the rider ends at the bottom', () => {
  const lesson = lessons.find((l) => l.id === 'sepeda');
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('sepeda', p);
    for (const s of states) near(s.kinetic + s.potential, r.energy, 1e-6 * r.energy, `${name} energy`);
    near(states[FRAMES].position, p.length, 1e-6, `${name} at bottom`);
  }
});

test('live readouts are clean on every frame', async () => {
  const { live } = await import('../site/src/lessons/live.js');
  const { fmt } = await import('../site/src/format.js');
  for (const lesson of lessons) {
    for (const [name, p] of parameterSets(lesson, 5)) {
      const { r, states } = frames(lesson.id, p);
      for (const s of states) assert.doesNotMatch(live[lesson.id](p, r, s, fmt), /NaN|undefined|Infinity|–/, `${lesson.id} ${name} t=${s.t}`);
    }
  }
});
