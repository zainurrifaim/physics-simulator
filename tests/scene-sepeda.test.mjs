// Geometry invariants of the sepeda scene, checked on exactly what is drawn (geometry()),
// for the original problem, B, every slider at its extremes and seeded random setups,
// plus the extreme slopes (vertical h = L and nearly flat).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../site/src/lessons/index.js';
import { solve, sample } from '../site/src/physics/models.js';
import { BODY } from '../site/src/scenes/rig.js';
import { geometry, layout, handle, strobe, camera, render, BIKE_K, GROUND_Y, ANKLE_OFFSET, STROBE } from '../site/src/scenes/sepeda.js';
import { fmt } from '../site/src/format.js';
import { parameterSets, frames } from './helpers.mjs';

const lesson = lessons.find((l) => l.id === 'sepeda');
const sets = [...parameterSets(lesson), ['vertical h = L', { mass: 80, height: 150, length: 150 }], ['h = L = 20', { mass: 80, height: 20, length: 20 }],
  ['nearly flat', { mass: 80, height: 5, length: 300 }], ['h = 5, L = 20', { mass: 30, height: 5, length: 20 }]];
const FRAMES = 120;
const PX = 0.5;     // drawing tolerance in px
const PANEL_BOTTOM = 116; // info panel (tags, energy bar, strobe legend): x > 412, y < 116
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
/** Signed distance of a point from the slope line (positive = outside, away from the hill). */
const fromLine = (L, pt) => (pt.x - L.top.x) * L.n.x + (pt.y - L.top.y) * L.n.y;
/** Distance along the slope from the start mark. */
const alongLine = (L, pt) => (pt.x - L.top.x) * L.u.x + (pt.y - L.top.y) * L.u.y;
const trackEnds = (L) => [alongLine(L, L.crest), alongLine(L, L.foot)];

function each(fn) {
  for (const [name, p] of sets) {
    const { r, states } = frames('sepeda', p, FRAMES);
    for (const s of states) fn(name, p, r, s, geometry(p, r, s));
  }
}

test('sepeda scene: slope is drawn to one true scale between the start and finish marks', () => {
  for (const [name, p] of sets) {
    const L = layout(p);
    near(d(L.top, L.finish), p.length * L.scale, 1e-6, `${name} L`);
    near(L.finish.y - L.top.y, p.height * L.scale, 1e-6, `${name} h`);
    near(L.foot.y, GROUND_Y, 1e-6, `${name} slope meets the ground`);
    for (const pt of [L.crest, L.top, L.finish, L.foot]) assert.ok(pt.x >= 0 && pt.x <= 600 && pt.y >= 0 && pt.y <= 380, `${name}: slope outside the scene`);
    near(L.u.x * L.n.x + L.u.y * L.n.y, 0, 1e-12, `${name} normal ⟂ slope`);
  }
});

test('sepeda scene: both tyres touch the slope; bike centre at position × scale; wheels roll without slipping', () => {
  each((name, p, r, s, g) => {
    const L = g.layout, at = `${name} t=${s.t}`;
    for (const [c, w] of [[g.contactRear, g.wheelRear], [g.contactFront, g.wheelFront]]) {
      near(fromLine(L, c), 0, PX, `${at} contact on the slope line`);
      const a = alongLine(L, c), [lo, hi] = trackEnds(L);
      assert.ok(a >= lo - PX && a <= hi + PX, `${at}: tyre off the drawn track (${a} not in ${lo}…${hi})`);
      near(d(c, w), g.wheelR, 1e-9, `${at} wheel centre above contact`);
      near(fromLine(L, w), g.wheelR, PX, `${at} wheel tangent to slope`);
      // the wheel never sinks into the flat ground or the hilltop plateau
      assert.ok(w.y + g.wheelR <= GROUND_Y + PX, `${at}: wheel below ground`);
      if (w.x < L.crest.x) assert.ok(w.y + g.wheelR <= L.crest.y + PX, `${at}: wheel inside the plateau`);
    }
    near(fromLine(L, g.centre), 0, 1e-9, `${at} centre on line`);
    near(alongLine(L, g.centre), s.position * L.scale, 1e-9, `${at} centre = position × scale`);
    near(g.wheelAngle, alongLine(L, g.centre) / g.wheelR, 1e-12, `${at} wheel angle = arc / radius`);
    assert.equal(g.crankAngle, 0, `${at}: cranks must not turn while coasting`);
  });
});

test('sepeda scene: rider has fixed-length limbs, hands on the handlebar, feet on the still pedals, seat on the saddle', () => {
  let pedal0 = null;
  each((name, p, r, s, g) => {
    const R = g.rider, at = `${name} t=${s.t}`;
    for (const leg of [R.legNear, R.legFar]) {
      assert.ok(leg.reached, `${at}: leg cannot reach the pedal`);
      near(d(leg.hip, leg.knee), BODY.thigh * BIKE_K, 1e-6, `${at} thigh`);
      near(d(leg.knee, leg.ankle), BODY.shin * BIKE_K, 1e-6, `${at} shin`);
      near(d(leg.ankle, leg.ball), Math.hypot(ANKLE_OFFSET.x, ANKLE_OFFSET.y) * BIKE_K, 1e-6, `${at} foot`);
    }
    near(d(R.legNear.ball, g.frame.pedalNear), 0, 1e-6, `${at} near foot on pedal`);
    near(d(R.legFar.ball, g.frame.pedalFar), 0, 1e-6, `${at} far foot on pedal`);
    for (const arm of [R.armNear, R.armFar]) {
      assert.ok(arm.reached, `${at}: arm would have to stretch`);
      near(d(arm.shoulder, arm.elbow), BODY.upperArm * BIKE_K, 1e-6, `${at} upper arm`);
      near(d(arm.elbow, arm.hand), BODY.forearm * BIKE_K, 1e-6, `${at} forearm`);
      near(d(arm.hand, g.frame.handlebar), 0, 1e-6, `${at} hand on handlebar`);
    }
    near(d(R.hip, R.shoulder), BODY.torso * BIKE_K, 1e-6, `${at} torso`);
    assert.ok(d(R.hip, g.frame.saddle) < 0.1 * BIKE_K, `${at}: rider not on the saddle`);
    // pedals keep the same place relative to the bike (no pedalling)
    const rel = { x: alongLine(g.layout, g.frame.pedalNear) - alongLine(g.layout, g.centre), y: fromLine(g.layout, g.frame.pedalNear) };
    if (!pedal0) pedal0 = rel;
    near(rel.x, pedal0.x, 1e-6, `${at} pedal along`); near(rel.y, pedal0.y, 1e-6, `${at} pedal height`);
  });
});

test('sepeda scene: weight straight down, normal force ⟂ slope, both from the same point; velocity ∝ speed along the slope', () => {
  each((name, p, r, s, g) => {
    const L = g.layout, at = `${name} t=${s.t}`;
    assert.deepEqual(g.weight.from, g.normal.from, `${at}: forces from different points`);
    near(g.weight.to.x - g.weight.from.x, 0, 1e-9, `${at} weight vertical`);
    assert.ok(g.weight.to.y > g.weight.from.y, `${at}: weight not downward`);
    const nv = { x: g.normal.to.x - g.normal.from.x, y: g.normal.to.y - g.normal.from.y };
    near(nv.x * L.u.x + nv.y * L.u.y, 0, 1e-9, `${at} N ⟂ slope`);
    assert.ok(nv.x * L.n.x + nv.y * L.n.y >= -1e-9, `${at}: N points into the hill`);
    const wLen = d(g.weight.from, g.weight.to);
    near(Math.hypot(nv.x, nv.y) / wLen, r.normal / r.weight, 1e-9, `${at} |N| / |W|`);
    const v = { x: g.velocity.to.x - g.velocity.from.x, y: g.velocity.to.y - g.velocity.from.y };
    near(v.x * L.n.x + v.y * L.n.y, 0, 1e-9, `${at} v along slope`);
    near(Math.hypot(v.x, v.y), (s.speed / r.speed) * 90, 1e-9, `${at} |v| ∝ speed`);
  });
});

test('sepeda scene: stroboscope ghosts sit at equal time steps (spacing grows like s = ½at²)', () => {
  for (const [name, p] of sets) {
    const r = solve('sepeda', p);
    const end = sample('sepeda', p, r, r.duration);
    const { dt, states } = strobe(p, r, end);
    near(dt, r.duration / STROBE, 1e-12, name);
    assert.equal(states.length, STROBE, name);
    const gaps = states.slice(1).map((s, i) => s.position - states[i].position);
    // gap_i = ½a dt² (2i + 1): equal second differences a dt²
    for (let i = 1; i < gaps.length; i++) near(gaps[i] - gaps[i - 1], r.acceleration * dt * dt, 1e-9 * p.length, `${name} gap ${i}`);
  }
});

test('sepeda scene: bike and N label stay in the scene and clear of the info panel', () => {
  each((name, p, r, s, g) => {
    const R = g.rider;
    const pts = [g.wheelRear, g.wheelFront, R.head, R.shoulder, R.armNear.hand, R.legNear.knee, R.legFar.knee, g.frame.saddle];
    for (const q of pts) {
      assert.ok(q.x >= -1 && q.x <= 600 && q.y >= 0 && q.y <= 380, `${name} t=${s.t}: bike outside the scene`);
      assert.ok(!(q.x > 412 && q.y < PANEL_BOTTOM), `${name} t=${s.t}: bike under the info panel at ${q.x},${q.y}`);
    }
    // the N label (≈ 65 px wide, 13 px tall) stays out of the info panel too
    const nl = g.normalLabel, left = nl.anchor === 'start' ? nl.x : nl.x - 33;
    assert.ok(!(left + 65 > 412 && nl.y - 12 < PANEL_BOTTOM), `${name} t=${s.t}: N label inside the info panel`);
    assert.ok(left >= 0 && left + 65 <= 600 && nl.y - 12 >= 0, `${name} t=${s.t}: N label outside the scene`);
  });
});

test('sepeda scene: drag handles sit on the drawn hilltop and slope; camera shows everything', () => {
  for (const [name, p] of sets) {
    const L = layout(p);
    for (const portrait of [false, true]) {
      const h = handle('height', p, portrait), l = handle('length', p, portrait);
      near(h.y, L.crest.y, 1e-9, `${name} height handle on the drawn hilltop surface`);
      assert.ok(h.x < L.crest.x - 15 && h.x > 15, `${name}: height handle not on the hilltop plateau`);
      near(h.factor, -1 / L.scale, 1e-12, `${name} dragging up by 1 px raises h by 1 px of the slope scale`);
      near(fromLine(L, l), 0, PX, `${name} length handle on the slope`);
      const a = alongLine(L, l);
      assert.ok(a > 0 && a < p.length * L.scale, `${name}: length handle off the slope`);
      const [cx, cy, cw, ch] = (portrait ? camera.portrait : camera.desktop).split(' ').map(Number);
      for (const q of [h, l, L.crest, L.foot]) assert.ok(q.x >= cx && q.x <= cx + cw && q.y >= cy && q.y <= cy + ch, `${name}: out of camera`);
    }
  }
});

test('sepeda scene: renders cleanly and is a pure function of the state', () => {
  for (const [name, p] of sets) {
    const r = solve('sepeda', p);
    for (const t of [0, r.duration / 3, r.duration]) {
      const s = sample('sepeda', p, r, t);
      const a = render(p, r, s, fmt);
      assert.doesNotMatch(a, /NaN|undefined|Infinity|-0 J/, `${name} t=${t}`);
      assert.equal(a, render(p, r, s, fmt), `${name}: render not deterministic`);
    }
  }
});
