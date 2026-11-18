// Weightlifter scene: what is drawn must be a believable, continuous human motion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../site/src/lessons/index.js';
import { BAR_REST_HEIGHT } from '../site/src/physics/models.js';
import { poseFor, render, barPixelY } from '../site/src/scenes/angkat.js';
import { LIFTER } from '../site/src/scenes/rig.js';
import { fmt } from '../site/src/format.js';
import { parameterSets, frames } from './helpers.mjs';

const lesson = lessons.find((l) => l.id === 'angkat');
const JOINTS = ['hip', 'knee', 'ankle', 'shoulder', 'elbow', 'hand'];

test('angkat: joints move continuously (no elbow flips, no snapping upright)', () => {
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('angkat', p, 600);
    let prev = null;
    for (const s of states) {
      const pose = poseFor(s, r);
      if (prev) {
        const dt = s.t - prev.t;
        for (const k of ['L', 'R']) for (const j of JOINTS) {
          const a = pose[k][j], b = prev.pose[k][j];
          const step = Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
          // ≤ 8 m/s joint speed: fast for a lift, but rules out one-frame jumps
          assert.ok(step <= Math.max(0.02, 8 * dt), `${name} t=${s.t.toFixed(3)} ${k}.${j} jumped ${step.toFixed(3)} m`);
        }
      }
      prev = { t: s.t, pose };
    }
  }
});

test('angkat: knees stay inside a natural width (no frog legs)', () => {
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('angkat', p, 120);
    for (const s of states) {
      const pose = poseFor(s, r);
      assert.ok(Math.abs(pose.L.knee.x - pose.R.knee.x) <= 0.5, `${name} t=${s.t}: knees ${(pose.R.knee.x - pose.L.knee.x).toFixed(2)} m apart`);
    }
  }
});

test('angkat: in the original problem the bar ends above the head ("di atas kepalanya")', () => {
  const p = lesson.preset;
  const { r, states } = frames('angkat', p, 60);
  const end = states.at(-1);
  const pose = poseFor(end, r);
  const headTop = pose.head.y + LIFTER.headR;
  assert.ok(BAR_REST_HEIGHT + end.position >= headTop + 0.1, `bar ${BAR_REST_HEIGHT + end.position} vs head top ${headTop}`);
});

test('angkat: force arrows and status tags stay inside the frame and clear of the plates', () => {
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('angkat', p, 40);
    for (const s of states) {
      const svg = render(p, r, s, fmt);
      for (const m of svg.matchAll(/<path class="vec-head" d="M([\d.-]+) ([\d.-]+)/g)) {
        assert.ok(Number(m[2]) <= 380 && Number(m[2]) >= 0, `${name} t=${s.t}: arrow tip at y=${m[2]}`);
      }
      const plateTop = barPixelY(s.position) - 22.5;
      assert.ok(plateTop >= 124 + 11, `${name}: plates (top ${plateTop}) reach the status slot`);
    }
  }
});
