// Geometry invariants of the sepeda scene, checked on exactly what is drawn (layout()/geometry()),
// for the original problem, B, every slider at its extremes and seeded random setups,
// plus the extreme slopes (vertical h = L and nearly flat).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../site/src/lessons/index.js';
import { solve, sample, G } from '../site/src/physics/models.js';
import { fbdLayout } from '../site/src/scenes/fbd-panel.js';
import { BODY } from '../site/src/scenes/rig.js';
import {
  geometry, layout, handle, strobe, camera, render, loadOffset, loadPanelRect, sceneMarks, labels,
  BIKE_K, GROUND_Y, ANKLE_OFFSET, STROBE, FORCE_K, V_K, PANEL, VIEW, HANDLE_X, FBD, fbdForces, fbdResultant,
} from '../site/src/scenes/sepeda.js';
import { fmt } from '../site/src/format.js';
import { dragValue, editParameter } from '../site/src/components/interaction.js';
import { parameterSets, frames } from './helpers.mjs';

const lesson = lessons.find((l) => l.id === 'sepeda');
const sets = [...parameterSets(lesson), ['vertical h = L', { mass: 80, height: 150, length: 150 }], ['h = L = 20', { mass: 200, height: 20, length: 20 }],
  ['nearly flat', { mass: 80, height: 5, length: 300 }], ['h = 5, L = 20', { mass: 30, height: 5, length: 20 }]];
const FRAMES = 120;
const PX = 0.5;     // drawing tolerance in px
const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);
/** Signed distance from the slope line (positive = outside, away from the hill) and distance along it. */
const fromLine = (L, pt) => (pt.x - L.top.x) * L.n.x + (pt.y - L.top.y) * L.n.y;
const alongLine = (L, pt) => (pt.x - L.top.x) * L.u.x + (pt.y - L.top.y) * L.u.y;
/** Distance from a point to the drawn track: plateau (y = top) → slope → ground (y = GROUND_Y). */
function fromTrack(L, pt) {
  const seg = (a, b) => {
    const vx = b.x - a.x, vy = b.y - a.y, t = Math.max(0, Math.min(1, ((pt.x - a.x) * vx + (pt.y - a.y) * vy) / (vx * vx + vy * vy)));
    return Math.hypot(pt.x - a.x - vx * t, pt.y - a.y - vy * t);
  };
  return Math.min(seg({ x: -1000, y: L.top.y }, L.top), seg(L.top, L.finish), seg(L.finish, { x: 2000, y: GROUND_Y }));
}

function each(fn) {
  for (const [name, p] of sets) {
    const { r, states } = frames('sepeda', p, FRAMES);
    let prev = null;
    for (const s of states) { const g = geometry(p, r, s); fn(name, p, r, s, g, prev); prev = g; }
  }
}

test('sepeda scene: one true scale; the plateau is at the start height and the foot on the ground', () => {
  for (const [name, p] of sets) {
    const L = layout(p);
    near(d(L.top, L.finish), p.length * L.scale, 1e-6, `${name} L`);
    near(GROUND_Y - L.top.y, p.height * L.scale, 1e-6, `${name} h from the plateau (= start) to the ground`);
    near(L.finish.y, GROUND_Y, 1e-9, `${name} finish on the ground`);
    near(L.u.x * L.n.x + L.u.y * L.n.y, 0, 1e-12, `${name} normal ⟂ slope`);
    for (const pt of [L.top, L.finish]) assert.ok(pt.x >= VIEW.x && pt.x <= VIEW.x + VIEW.w && pt.y >= 0 && pt.y <= 380, `${name}: slope outside the view`);
    const svg = render(p, solve('sepeda', p), sample('sepeda', p, solve('sepeda', p), 0), fmt);
    assert.match(svg, new RegExp(`class="hill" d="M0 ${Math.round(L.top.y * 10) / 10}H`), `${name}: plateau not drawn at the start height`);
  }
});

test('sepeda scene: both tyres roll on the drawn track; the bike centre is at position × scale', () => {
  each((name, p, r, s, g, prev) => {
    const L = g.layout, at = `${name} t=${s.t}`;
    for (const [c, w, sig, ang] of [[g.contactRear, g.wheelRear, g.bike.sigmaRear, g.wheelAngleRear], [g.contactFront, g.wheelFront, g.bike.sigmaFront, g.wheelAngleFront]]) {
      near(fromTrack(L, c), 0, PX, `${at} tyre contact on the track`);
      near(d(c, w), g.wheelR, 1e-6, `${at} wheel centre one radius from its contact`);
      assert.ok(fromTrack(L, w) >= g.wheelR - PX, `${at}: wheel sinks into the track`);
      near(ang, sig / g.wheelR, 1e-12, `${at} wheel angle = centre path length / radius`);
    }
    near(d(g.wheelRear, g.wheelFront), 2 * 0.52 * BIKE_K, 1e-6, `${at} rigid wheelbase`);
    near(alongLine(L, g.centre), s.position * L.scale, 1e-6, `${at} bike centre = position × scale`);
    // on the straight slope the bike lies exactly on the line and the wheels turn by Δs / r
    if (g.bike.rear.on === 'slope' && g.bike.front.on === 'slope') {
      near(fromLine(L, g.contactRear), 0, PX, `${at} rear on line`); near(fromLine(L, g.contactFront), 0, PX, `${at} front on line`);
      if (prev && prev.bike.rear.on === 'slope' && prev.bike.front.on === 'slope') {
        near((g.wheelAngleRear - prev.wheelAngleRear) * g.wheelR, g.along - prev.along, 1e-6, `${at} rolling without slipping`);
      }
    }
    assert.equal(g.crankAngle, 0, `${at}: cranks must not turn while coasting`);
  });
});

test('sepeda scene: rider has fixed-length limbs, hands on the handlebar, feet on the still pedals, seat on the saddle', () => {
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
    // pedals keep the same place in the bike frame (no pedalling)
    const rel = (q) => ({ x: (q.x - g.origin.x) * g.bikeDir.x + (q.y - g.origin.y) * g.bikeDir.y, y: (q.x - g.origin.x) * g.bikeUp.x + (q.y - g.origin.y) * g.bikeUp.y });
    near(rel(g.frame.pedalNear).x, 0.09 * BIKE_K, 1e-6, `${at} pedal along`); near(rel(g.frame.pedalNear).y, 0.28 * BIKE_K, 1e-6, `${at} pedal height`);
  });
});

test('sepeda scene: arrows use fixed scales shared by every setup (A and B compare honestly)', () => {
  each((name, p, r, s, g) => {
    const L = g.layout, at = `${name} t=${s.t}`;
    assert.deepEqual(g.weight.from, g.normal.from, `${at}: forces from different points`);
    near(g.weight.to.x - g.weight.from.x, 0, 1e-9, `${at} weight vertical`);
    near(g.weight.to.y - g.weight.from.y, r.weight * FORCE_K, 1e-9, `${at} |Fg| = Fg × ${FORCE_K} px/N`);
    const nv = { x: g.normal.to.x - g.normal.from.x, y: g.normal.to.y - g.normal.from.y };
    near(nv.x * L.u.x + nv.y * L.u.y, 0, 1e-9, `${at} N ⟂ slope`);
    assert.ok(nv.x * L.n.x + nv.y * L.n.y >= -1e-9, `${at}: N points into the hill`);
    near(Math.hypot(nv.x, nv.y), r.normal * FORCE_K, 1e-9, `${at} |N| = N × ${FORCE_K} px/N`);
    const v = { x: g.velocity.to.x - g.velocity.from.x, y: g.velocity.to.y - g.velocity.from.y };
    near(v.x * L.n.x + v.y * L.n.y, 0, 1e-9, `${at} v along slope`);
    near(Math.hypot(v.x, v.y), s.speed * V_K, 1e-9, `${at} |v| = v × V_K`);
  });
  // A and B: same weight → same arrow; B twice the mass → twice the arrow
  const A = lesson.preset, B = { ...A, ...lesson.compare.B };
  const gA = geometry(A, solve('sepeda', A), sample('sepeda', A, solve('sepeda', A), 0));
  const gB = geometry(B, solve('sepeda', B), sample('sepeda', B, solve('sepeda', B), 0));
  near((gB.weight.to.y - gB.weight.from.y) / (gA.weight.to.y - gA.weight.from.y), B.mass / A.mass, 1e-9, 'Fg arrows scale with the weight');
});

test('sepeda scene: stroboscope ghosts sit at equal time steps (spacing grows like s = ½at²)', () => {
  for (const [name, p] of sets) {
    const r = solve('sepeda', p);
    const end = sample('sepeda', p, r, r.duration);
    const { dt, states } = strobe(p, r, end);
    near(dt, r.duration / STROBE, 1e-12, name);
    assert.equal(states.length, STROBE, name);
    const gaps = states.slice(1).map((s, i) => s.position - states[i].position);
    for (let i = 1; i < gaps.length; i++) near(gaps[i] - gaps[i - 1], r.acceleration * dt * dt, 1e-9 * p.length, `${name} gap ${i}`);
  }
});

test('sepeda scene: bike and N label stay in view and clear of the info panel', () => {
  each((name, p, r, s, g) => {
    const R = g.rider;
    for (const q of [g.wheelRear, g.wheelFront, R.head, R.shoulder, R.armNear.hand, R.legNear.knee, R.legFar.knee, g.frame.saddle, g.normal.to, g.weight.to]) {
      assert.ok(q.x >= VIEW.x && q.x <= VIEW.x + VIEW.w && q.y >= 0 && q.y <= 380, `${name} t=${s.t}: outside the view at ${q.x},${q.y}`);
      assert.ok(!(q.x > PANEL.x0 && q.y < PANEL.y1), `${name} t=${s.t}: under the info panel at ${q.x},${q.y}`);
    }
    const nl = g.normalLabel, w = nl.w, left = nl.anchor === 'start' ? nl.x : nl.anchor === 'middle' ? nl.x - w / 2 : nl.x - w;
    assert.ok(w >= 7.5 * `N = ${fmt(r.normal, 0)} N`.length - 1e-9, `${name}: N label width underestimated`);
    assert.ok(!(left + w > PANEL.x0 && nl.y - 12 < PANEL.y1), `${name} t=${s.t}: N label inside the info panel`);
    assert.ok(left >= VIEW.x && left + w <= VIEW.x + VIEW.w && nl.y - 12 >= 0, `${name} t=${s.t}: N label outside the view`);
    const fg = labels(p, r, s, g).fg;
    if (!fg.rotate) assert.ok(!((fg.anchor === 'middle' ? fg.at.x + 40 : fg.at.x + 80) > PANEL.x0 && fg.at.y - 12 < PANEL.y1), `${name} t=${s.t}: Fg label inside the info panel`);
  });
});

test('sepeda scene: drag handles sit on the drawn hilltop and under the foot of the slope, never on the bike path', () => {
  for (const [name, p] of sets) {
    const L = layout(p), { r, states } = frames('sepeda', p, 60);
    for (const portrait of [false, true]) {
      const h = handle('height', p, portrait), l = handle('length', p, portrait);
      near(h.y, L.top.y, 1e-9, `${name} height handle on the plateau (= start height)`);
      assert.ok(h.x === HANDLE_X && h.x < L.top.x - 40, `${name}: height handle not on the plateau`);
      near(h.factor, -1 / L.scale, 1e-12, `${name} height drag follows the slope scale`);
      // the L handle sits in the ground band under the foot of the slope: fixed y, x follows the foot
      assert.ok(l.y - 16 > GROUND_Y && Math.abs(l.x - L.finish.x) < 30, `${name}: length handle not under the foot of the slope`);
      near(l.y, GROUND_Y + 34, 1e-9, `${name} length handle y does not depend on the hill`);
      const [cx, cy, cw, ch] = (portrait ? camera.portrait : camera.desktop).split(' ').map(Number);
      for (const q of [h, l, L.top, L.finish]) assert.ok(q.x - 15 >= cx && q.x + 15 <= cx + cw && q.y >= cy && q.y <= cy + ch, `${name}: out of camera`);
      // the bike (and its velocity arrow) never passes under the L handle or the h handle
      for (const s of states) {
        const g = geometry(p, r, s);
        for (const q of [g.wheelRear, g.wheelFront, g.rider.head, g.com, g.velocity.from, g.velocity.to]) {
          assert.ok(d(q, l) > 16 + (q === g.wheelRear || q === g.wheelFront ? g.wheelR : 0), `${name} t=${s.t}: bike passes under the L handle`);
          assert.ok(d(q, h) > 16 + (q === g.wheelRear || q === g.wheelFront ? g.wheelR : 0), `${name} t=${s.t}: bike passes under the h handle`);
        }
      }
    }
  }
});

test('sepeda scene: the ± mass panel never covers the bike, an arrow tip, a label or a handle', () => {
  const inside = (q, rect) => q.x > rect.x0 && q.x < rect.x1 && q.y > rect.y0 && q.y < rect.y1;
  const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  for (const [name, p] of sets) {
    const r = solve('sepeda', p);
    for (const portrait of [false, true]) {
      const off = loadOffset(p, portrait), rect = loadPanelRect(off);
      const [cx, cy, cw, ch] = (portrait ? camera.portrait : camera.desktop).split(' ').map(Number);
      assert.ok(rect.x0 >= cx && rect.x1 <= cx + cw && rect.y0 >= cy && rect.y1 <= cy + ch + 2, `${name}: panel outside the camera`);
      for (const k of ['height', 'length']) { const h = handle(k, p, portrait); assert.ok(!inside(h, { x0: rect.x0 - 16, y0: rect.y0 - 16, x1: rect.x1 + 16, y1: rect.y1 + 16 }), `${name}: panel covers the ${k} handle`); }
      const { states } = frames('sepeda', p, 60);
      for (const s of states) {
        const g = geometry(p, r, s), R = g.rider;
        const pts = [g.wheelRear, g.wheelFront, g.contactRear, g.contactFront, R.head, R.shoulder, R.hip, R.armNear.hand, R.legNear.knee, R.legFar.knee, g.frame.saddle, g.com, g.weight.to, g.normal.to, g.velocity.from, g.velocity.to];
        for (const q of pts) assert.ok(!inside(q, rect), `${name} t=${s.t}: panel at ${off} covers the bike or an arrow (${q.x},${q.y})`);
      }
      // slopes steeper than sin θ = 0,7 cannot be reached with the sliders or the handles (editParameter)
      const hits = p.height / p.length > 0.7 ? [] : sceneMarks(p, r).filter((m) => overlaps(m, rect));
      assert.equal(hits.length, 0, `${name}: panel at ${off} covers ${JSON.stringify(hits[0])}`);
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

test('sepeda free-body diagram: N ⟂ slope = m g cos θ, F_g vertical, ΣF = m g sin θ = m·a along the slope', () => {
  for (const [name, p] of sets) {
    const r = solve('sepeda', p), L = layout(p), forces = fbdForces(p, r);
    const N = forces.find((F) => F.key === 'N'), W = forces.find((F) => F.key === 'g');
    near(Math.hypot(N.dx, N.dy), 1, 1e-12, `${name} N unit`); near(Math.hypot(W.dx, W.dy), 1, 1e-12, `${name} Fg unit`);
    near(N.dx * L.u.x + N.dy * L.u.y, 0, 1e-12, `${name} N ⟂ slope`);
    assert.ok(N.dx * L.n.x + N.dy * L.n.y > 0.999, `${name}: N not outward`);
    near(N.value, p.mass * G * Math.cos(Math.asin(p.height / p.length)), 1e-6 * p.mass * G, `${name} |N| = m g cos θ`);
    assert.equal(W.dx, 0, `${name} Fg vertical`); assert.equal(W.dy, 1, `${name} Fg down`);
    near(W.value, p.mass * G, 1e-9, `${name} |Fg| = m g`);
    const sum = fbdResultant(p, r), along = sum.x * L.u.x + sum.y * L.u.y, across = sum.x * L.n.x + sum.y * L.n.y;
    near(along, p.mass * G * p.height / p.length, 1e-6 * p.mass * G, `${name} ΣF along = m g sin θ`);
    near(along, p.mass * r.acceleration, 1e-6 * p.mass * G, `${name} ΣF = m·a`);
    near(across, 0, 1e-6 * p.mass * G, `${name} no net force across the slope`);
    // one scale for every setup, true to scale over the whole slider range
    for (const F of fbdLayout(forces, FBD)) { assert.ok(F.scaled, `${name}: ${F.key} not to scale`); near(F.len, Math.max(4, F.value * FBD.k), 1e-9, `${name} ${F.key} length`); }
  }
  const A = lesson.preset, B = { ...A, ...lesson.compare.B };
  const lenW = (p) => fbdLayout(fbdForces(p, solve('sepeda', p)), FBD).find((F) => F.key === 'g').len;
  near(lenW(B) / lenW(A), 2, 1e-9, 'B (2× mass) has a 2× longer F_g arrow');
  assert.ok(lenW(B) - lenW(A) >= 12, 'A and B weight arrows differ visibly');
});

test('sepeda free-body diagram: available in the force layer, inside both detail cameras, clear of everything else', () => {
  const overlaps = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const rect = { x0: FBD.x, y0: FBD.y, x1: FBD.x + FBD.w, y1: FBD.y + FBD.h };
  for (const cam of [camera.desktop, camera.portrait]) {
    const [cx, cy, cw, ch] = cam.split(' ').map(Number);
    assert.ok(rect.x0 >= cx && rect.x1 <= cx + cw && rect.y0 >= cy && rect.y1 <= cy + ch, `diagram outside camera ${cam}`);
  }
  // the diagram lives in the sky band on top of the scene (y < 0), above even the tallest hilltop
  assert.ok(rect.y1 <= 56, 'diagram must stay in the sky band above the scene');
  for (const cam of [camera.desktop, camera.portrait]) assert.equal(cam, camera.desktop, 'one camera for every orientation of the sepeda scene');
  assert.equal(Number(camera.desktop.split(' ')[1]) + Number(camera.desktop.split(' ')[3]), 380, 'camera ends at the ground band (no empty strip below the scene)');
  for (const [name, p] of sets) {
    const r = solve('sepeda', p);
    const svg = render(p, r, sample('sepeda', p, r, r.duration / 2), fmt);
    assert.match(svg, /class="layer layer-forces"><g class="fbd-panel/, `${name}: diagram must follow the force visibility control`);
    const others = sceneMarks(p, r).filter((m) => !(m.x0 === rect.x0 && m.y0 === rect.y0 && m.x1 === rect.x1 && m.y1 === rect.y1));
    const hit = others.find((m) => overlaps(m, rect));
    assert.equal(hit, undefined, `${name}: diagram overlaps ${JSON.stringify(hit)}`);
    assert.ok(!overlaps(loadPanelRect(loadOffset(p)), rect), `${name}: ± panel covers the diagram`);
    // the diagram's arrows and labels stay inside its box
    for (const F of fbdLayout(fbdForces(p, r), FBD)) {
      const tip = { x: FBD.x + FBD.cx + F.dx * F.len, y: FBD.y + FBD.cy + F.dy * F.len };
      assert.ok(tip.x > rect.x0 && tip.x < rect.x1 && tip.y > rect.y0 + 16 && tip.y <= rect.y1 - 4, `${name}: ${F.key} arrow leaves the diagram`);
    }
  }
});

// ---------------------------------------------------------------- drag handles follow the pointer

/** Drag a handle like interaction.js does: pointer moves `px` per move event, value += Δpointer × factor (current geometry), clamped, then snapped by editParameter. */
function simulateDrag(key, start, px, moves) {
  const field = lesson.fields.find((f) => f.key === key);
  let p = { ...start }, g = handle(key, p);
  const pointer = { x: g.x, y: g.y }, home = { ...pointer };
  const drag = { value: p[key], last: { ...pointer } };
  const rows = [];
  for (let i = 0; i < moves; i++) {
    pointer[g.axis] += px;
    const geo = handle(key, p);
    const raw = dragValue(drag.value, drag.last, pointer, geo);
    drag.value = Math.max(field.min, Math.min(field.max, raw));
    drag.last = { ...pointer };
    const next = editParameter(lesson, p, key, drag.value);
    // once the value sits on a limit the pointer may overshoot it: stop checking there
    const clamped = [-1e9, 1e9].some((x) => editParameter(lesson, p, key, x)[key] === next[key]);
    const before = p[key];
    p = next;
    g = handle(key, p);
    const other = g.axis === 'x' ? 'y' : 'x';
    // half a field step in px: the drawn value is snapped, the pointer is not
    const quant = (field.step * Math.abs(1 / g.factor)) / 2;
    rows.push({ i, value: p[key], before, clamped, err: Math.abs(g[g.axis] - pointer[g.axis]), quant, ortho: Math.abs(g[other] - home[other]) });
  }
  return rows;
}

test('sepeda scene: a dragged handle stays under the pointer (no lag, no accumulating drift) until the value clamps', () => {
  const starts = [lesson.preset, { mass: 80, height: 20, length: 100 }, { mass: 80, height: 100, length: 250 }, { mass: 80, height: 10, length: 40 }, { mass: 80, height: 40, length: 120 }];
  for (const start of starts) for (const key of ['height', 'length']) for (const px of [8, -8, 3, -3]) {
    const rows = simulateDrag(key, start, px, 60);
    let moved = 0;
    for (const r of rows) {
      const at = `${key} from ${JSON.stringify(start)} ${px > 0 ? '+' : ''}${px} px, move ${r.i}`;
      if (r.clamped) break;
      assert.ok(r.err <= 2.5 + r.quant, `${at}: handle is ${r.err.toFixed(2)} px from the pointer`);
      near(r.ortho, 0, 1e-9, `${at}: handle left its axis`);
      if (r.value !== r.before) moved++;
    }
    assert.ok(moved >= 1, `${key} from ${JSON.stringify(start)} ${px} px: the drag barely changed the value`);
  }
});

test('sepeda scene: the drawing scale does not depend on the height, so the h handle is exactly h × scale above the ground', () => {
  for (const L of [20, 60, 160, 300]) {
    const base = layout({ mass: 80, height: 5, length: L }).scale;
    for (let h = 5; h <= Math.min(150, 0.7 * L); h += 9) near(layout({ mass: 80, height: h, length: L }).scale, base, 1e-12, `L = ${L}, h = ${h}`);
    near(handle('height', { mass: 80, height: 5, length: L }).factor, -1 / base, 1e-12, `L = ${L}`);
  }
});

test('sepeda scene: the hill stays inside the room at every reachable height and length', () => {
  for (let L = 20; L <= 300; L += 20) for (let h = 5; h <= Math.min(150, 0.7 * L); h += 5) {
    const Ly = layout({ mass: 80, height: h, length: L });
    assert.ok(Ly.top.y >= 124 - 1e-9, `h=${h}, L=${L}: hilltop too high (${Ly.top.y}), under the diagram`);
    assert.ok(Ly.top.x >= 175 - 1e-9 && Ly.finish.x <= 540 + 1e-9, `h=${h}, L=${L}: hill outside 175…540`);
  }
});

test('sepeda scene: the foot of the slope is linear in L (and independent of h), so the L handle follows the pointer exactly', () => {
  for (const h of [5, 40, 100]) {
    const xs = [150, 200, 250, 300].map((L) => layout({ mass: 80, height: h, length: L }).finish.x); // all reachable (h ≤ 0,7 L)
    const steps = xs.slice(1).map((x, i) => x - xs[i]);
    for (const st of steps) near(st, steps[0], 1e-6, `h = ${h}: foot x not linear in L`);
  }
  const f1 = handle('length', lesson.preset).factor, f2 = handle('length', { mass: 80, height: 20, length: 250 }).factor;
  near(f1, f2, 1e-6, 'constant drag factor');
});

test('sepeda scene: the preset hill and bike fill the panel (large scale, bike clearly visible)', () => {
  const L = layout(lesson.preset);
  assert.ok(L.scale >= 1.45, `preset hill only ${L.scale.toFixed(2)} px/m`);
  assert.ok(GROUND_Y - L.top.y >= 120, 'preset hill too low');
});

test('sepeda scene: numbers that change while playing keep a constant number of decimals', () => {
  const decimals = (txt) => { const m = txt.match(/\d(?:,(\d+))?$/); return m && (m[1] ?? '').length; };
  for (const [name, p] of sets) {
    const r = solve('sepeda', p);
    const seen = { s: new Set(), v: new Set(), ep: new Set(), ek: new Set() };
    for (let i = 0; i <= 40; i++) {
      const s = sample('sepeda', p, r, (r.duration * i) / 40);
      const svg = render(p, r, s, fmt);
      const pick = (re) => svg.match(re)?.[1];
      const sT = pick(/s = ([\d.,]+) m/), vT = pick(/v = ([\d.,]+) m\/s/), epT = pick(/energy-text ep[^>]*>E.*?<\/tspan>\s*([\d.,]+) J/), ekT = pick(/energy-text ek[^>]*>E.*?<\/tspan>\s*([\d.,]+) J/);
      if (sT) seen.s.add(decimals(sT)); if (vT) seen.v.add(decimals(vT));
      assert.ok(epT !== undefined && ekT !== undefined, `${name}: energy labels missing`);
      seen.ep.add(decimals(epT)); seen.ek.add(decimals(ekT));
    }
    for (const k of Object.keys(seen)) assert.ok(seen[k].size <= 1, `${name}: ${k} changes its number of decimals ${[...seen[k]]}`);
    assert.deepEqual([...seen.v], [1], `${name}: v keeps one decimal`);
    assert.deepEqual([...seen.ep], [0], `${name}: Ep keeps no decimals`);
  }
});
