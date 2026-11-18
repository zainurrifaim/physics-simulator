// Geometry invariants of the sabuk (seat-belt crash test) scene, checked on exactly what is
// drawn: one true scale, a crumple zone that shortens by the model's car displacement, a
// fixed-length dummy that stays in its seat while belted and never passes the dashboard.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DASH_GAP, solve } from '../site/src/physics/models.js';
import { lessons } from '../site/src/lessons/index.js';
import { BODY } from '../site/src/scenes/rig.js';
import {
  render, geometry, handle, seatedPose, seatedLengths, PX_PER_M, WALL_X, CAR, SEAT, CHEST0, DASH, FRONT_WHEEL_MIN,
  READOUT, STATUS, DISTANCE_HANDLE_Y, ROAD, camera,
} from '../site/src/scenes/sabuk.js';
import { fmt } from '../site/src/format.js';
import { parameterSets, frames } from './helpers.mjs';

const lesson = lessons.find((l) => l.id === 'sabuk');
const sets = parameterSets(lesson);
const EPS = 1e-6;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
const LENGTHS = { thigh: BODY.thigh, shin: BODY.shin, upperArm: BODY.upperArm, forearm: BODY.forearm, torso: BODY.torso, neck: BODY.neck };

function* everyFrame(count = 160) {
  for (const [name, p] of sets) {
    const { r, states } = frames('sabuk', p, count);
    for (const s of states) yield { name: `${name} t=${s.t.toFixed(4)} ${s.phase}`, p, r, s };
  }
}

test('sabuk scene: the crumple zone (and nothing else) is long enough for every stopping distance', () => {
  const maxDistance = lesson.fields.find((f) => f.key === 'distance').max;
  // tyre pushed back against the firewall still fits in the crushed hood at the longest distance
  assert.ok(CAR.crumple - maxDistance >= FRONT_WHEEL_MIN - CAR.firewall + CAR.wheelR + CAR.wheelGap - EPS, 'hood too short for s max');
  near(DASH.x - CHEST0.x, DASH_GAP, 1e-12, 'dashboard gap = DASH_GAP');
  assert.ok(DASH.x < CAR.firewall, 'dashboard inside the cabin');
});

test('sabuk scene: limb lengths are constant and every pose is reachable', () => {
  for (let i = 0; i <= 90; i++) {
    const pose = seatedPose((DASH_GAP * i) / 90);
    const L = seatedLengths(pose);
    for (const [k, v] of Object.entries(LENGTHS)) near(L[k], v, 1e-9, `${k} at offset ${pose.offset}`);
    assert.ok(pose.legReached && pose.armReached, `limb out of reach at offset ${pose.offset}`);
    // head stays inside the cabin (under the roof, behind the windscreen)
    assert.ok(pose.head.y + BODY.headR <= CAR.roof, `head through the roof at ${pose.offset}`);
    const wsX = CAR.firewall + 0.02 - ((pose.head.y - CAR.belt) / (CAR.roof - CAR.belt)) * (CAR.firewall + 0.02 - CAR.roofFront);
    assert.ok(pose.head.x + BODY.headR <= wsX, `head through the windscreen at ${pose.offset}`);
  }
});

test('sabuk scene: drawn geometry follows the model on every frame', () => {
  const S = PX_PER_M;
  for (const { name, p, r, s } of everyFrame()) {
    const g = geometry(p, r, s);
    // one scale: the crumple zone shortens by exactly position × scale
    near(g.crumpleFullPx - g.crumplePx, s.position * S, EPS, `${name}: crumple px`);
    near(g.front - g.firewall, g.crumplePx, EPS, `${name}: crumple = front − firewall`);
    near(g.front - g.rear, (CAR.length - s.position) * S, EPS, `${name}: car length`);
    // the car never penetrates the wall; the cabin is never crushed
    assert.ok(g.front <= WALL_X + EPS, `${name}: car in the wall`);
    assert.ok(g.crumplePx > 0, `${name}: cabin crushed`);
    // front wheel inside the (crushed) body, behind the crushed metal and the wall, ahead of the firewall
    const w = g.frontWheel;
    assert.ok(w.x + w.r <= g.front - CAR.wheelGap * S + EPS, `${name}: front wheel through the crushed hood`);
    assert.ok(w.x + w.r <= WALL_X, `${name}: front wheel past the wall`);
    assert.ok(w.x - w.r >= g.firewall - EPS, `${name}: front wheel in the cabin`);
    assert.ok(g.rearWheel.x - g.rearWheel.r >= g.rear - EPS, `${name}: rear wheel outside the car`);
    // wheels roll without slipping: rotation × R = ground travel of the wheel centre
    // (a front wheel pushed back against the crushed hood stops moving over the ground and stops turning)
    const g0 = geometry(p, r, { ...s, position: 0 });
    near(g.rearWheel.angle * CAR.wheelR * S, g.rearWheel.x - g0.rearWheel.x, EPS, `${name}: rear wheel slips`);
    near(g.frontWheel.angle * CAR.wheelR * S, g.frontWheel.x - g0.frontWheel.x, EPS, `${name}: front wheel slips`);
    // limbs never stretch (drawn pose)
    const L = seatedLengths(g.poseM);
    for (const [k, v] of Object.entries(LENGTHS)) near(L[k], v, 1e-9, `${name}: ${k}`);
    // dummy offset drawn = model offset × scale
    near(g.dummyOffsetPx, (s.beltIntact ? 0 : s.dummyOffset) * S, EPS, `${name}: dummy offset px`);
    if (s.beltIntact) {
      // belted ⇒ dummy attached to the seat
      near(g.pose.hip.x, g.seatHip.x, EPS, `${name}: hip off the seat`);
      near(g.pose.hip.y, g.seatHip.y, EPS, `${name}: hip off the seat`);
      near(g.pose.chest.x, g.chest0.x, EPS, `${name}: belted chest moved`);
    } else {
      // torn ⇒ the chest never passes the dashboard; it reaches it at impact
      assert.ok(g.pose.chest.x <= g.dash.x + EPS, `${name}: chest through the dashboard`);
      assert.ok(g.pose.hip.x >= g.seatHip.x - EPS, `${name}: hip moved backwards`);
      if (s.phase === 'impact') near(g.pose.chest.x, g.dash.x, EPS, `${name}: impact without contact`);
    }
    if (s.phase !== 'ready') assert.equal(!s.beltIntact, r.fails, `${name}: belt state vs verdict`);
  }
});

test('sabuk scene: render is pure, has no NaN and shows forces/verdicts only when the model says so', () => {
  for (const { name, p, r, s } of everyFrame(24)) {
    const a = render(p, r, s, fmt);
    assert.equal(a, render(p, r, s, fmt), `${name}: not deterministic`);
    assert.ok(!/NaN|undefined|Infinity/.test(a), `${name}: bad number in SVG`);
    const beltArrow = a.includes('F<tspan class="sub" dy="4">sabuk');
    assert.equal(beltArrow, s.beltIntact && s.beltForce > 0, `${name}: belt-force arrow`);
    assert.equal(a.includes('SABUK ROBEK'), s.phase === 'torn', `${name}: torn tag`);
    assert.equal(a.includes('Membentur dasbor'), s.phase === 'impact', `${name}: impact tag`);
    assert.equal(a.includes('belt broken'), !s.beltIntact, `${name}: torn belt drawing`);
    // no net vertical force on the seated dummy: weight and seat normal force are both drawn
    assert.ok(/>N = [\d.]+ N</.test(a) && a.includes('F<tspan class="sub" dy="4">g'), `${name}: N and F_g`);
    if (s.phase === 'impact') assert.ok(a.includes('kecepatan relatif'), `${name}: impact speed is relative`);
  }
});

test('sabuk scene: drag handles sit on the true-scale guides', () => {
  for (const [, p] of sets) {
    const d = handle('distance', p), v = handle('speed', p);
    // s handle sits on the rear edge of the crumple strip drawn in the ready state (true scale)
    near(WALL_X - d.x, p.distance * PX_PER_M, 1e-9, 'distance handle = wall − s × scale');
    near(d.factor, -1 / PX_PER_M, 1e-12, 'distance drag factor');
    assert.ok(d.y > ROAD - 0.86 * PX_PER_M && d.y < ROAD - 0.26 * PX_PER_M, 'distance handle inside the crumple zone');
    near(d.y, DISTANCE_HANDLE_Y, 1e-12, 'distance handle height');
    const g = geometry(p, solve('sabuk', p), { position: 0, beltIntact: true, dummyOffset: 0 });
    assert.ok(d.x > g.firewall, 'distance handle on the hood, ahead of the cabin');
    near((v.x - 170) * v.factor, p.speed, 1e-9, 'speed handle');
  }
  // speed handle (r = 15) stays left of the readout panel at the maximum speed
  const vmax = handle('speed', { speed: lesson.fields.find((f) => f.key === 'speed').max });
  assert.ok(vmax.x + 15 < READOUT.x, 'speed handle under the readout panel');
});

test('sabuk scene: readout and status tags fit inside both cameras', () => {
  const right = (c) => { const [x, , w] = c.split(' ').map(Number); return x + w; };
  const edge = Math.min(right(camera.desktop), right(camera.portrait));
  assert.ok(READOUT.x + READOUT.w <= edge - 4, 'readout clipped');
  const widest = ['Membentur dasbor!', 'Sabuk menahan · dummy aman', 'SABUK ROBEK!'];
  for (const t of widest) { const w = t.length * 7 + 16; assert.ok(STATUS.x + w / 2 <= edge - 4 && STATUS.x - w / 2 >= 10, `status tag "${t}" clipped`); }
});

test('sabuk: the free-body diagram shows exactly the forces acting on the dummy', async () => {
  const { fbdForces, FBD } = await import('../site/src/scenes/sabuk.js');
  const { lessons } = await import('../site/src/lessons/index.js');
  const { parameterSets, frames } = await import('./helpers.mjs');
  const lesson = lessons.find((l) => l.id === 'sabuk');
  for (const [name, p] of parameterSets(lesson)) {
    const { r, states } = frames('sabuk', p, 160);
    for (const s of states) {
      const F = fbdForces(p, s);
      const h = F.filter((x) => x.dx), N = F.find((x) => x.key === 'N'), g = F.find((x) => x.key === 'g');
      assert.equal(N.value, g.value, `${name}: N balances F_g`);
      assert.equal(g.value, p.mass * 10, `${name}: F_g = m g`);
      if (s.phase === 'braking') assert.deepEqual(h.map((x) => [x.key, x.value]), [['sabuk', r.force]], `${name} t=${s.t}`);
      else if (s.phase === 'torn' || s.phase === 'ready' || s.phase === 'stopped') assert.equal(h.length, 0, `${name} t=${s.t} ${s.phase}: no horizontal force`);
      else if (s.phase === 'impact') assert.ok(h.every((x) => x.key === 'dasbor') && (s.t < r.carStop ? h.length === 1 : h.length === 0), `${name} t=${s.t}: dashboard force while the car still brakes`);
      // one common scale: lengths ∝ force unless clamped
      for (const x of h) if (x.scaled) assert.ok(Math.abs(x.len - Math.max(4, x.value * FBD.k)) < 1e-9, `${name}: scale`);
    }
  }
});
