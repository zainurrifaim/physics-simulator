// Scene invariants for the crane (derek): what is drawn must be physically possible and
// must agree with the model state. Checked on every frame of every parameter set.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../site/src/lessons/index.js';
import { fmt } from '../site/src/format.js';
import {
  render, geometry, handle, camera, loadOffset, crateSize, crateBottomY, powerPair, reachedText, fbdForces, FBD, S_ARROW_X,
  GROUND, PX_PER_M, TROLLEY_Y, JIB_BOTTOM, HOOK_X, DIM_X,
} from '../site/src/scenes/derek.js';
import { parameterSets, frames } from './helpers.mjs';

const FRAMES = 120;
const EPS = 1e-9;
const lesson = lessons.find((l) => l.id === 'derek');
// parameterSets rarely produces an overload, so add explicit capacity failures
const sets = [
  ...parameterSets(lesson),
  ['stall heavy', { ...lesson.preset, mass: 10000, capacity: 5000 }],
  ['stall light', { ...lesson.preset, mass: 800, capacity: 500 }],
  ['stall max height', { ...lesson.preset, mass: 10000, capacity: 500, height: 30 }],
  ['container to 30 m', { ...lesson.preset, mass: 10000, height: 30, time: 120, power: 50000 }],
  ['just short', { ...lesson.preset, height: 2, time: 13, power: 1500, mass: 1000 }],
  ['barely moves', { ...lesson.preset, mass: 10000, power: 500, time: 5 }],
];
const PANEL = { x1: 174, x2: 426, y1: 308, y2: 380 };   // ± load panel (interaction.js)
const r1 = (v) => Math.round(v * 10) / 10;

test('derek scene: crate, hook and cable stay physically possible in every frame', () => {
  for (const [name, p] of sets) {
    const { r, states } = frames('derek', p, FRAMES);
    for (const s of states) {
      const g = geometry(p, r, s);
      const at = `${name} t=${s.t}`;
      // one true scale: the drawn crate bottom is the model position
      assert.ok(Math.abs(g.crate.bottom - (GROUND - s.position * PX_PER_M)) < 1e-9, `${at}: crate height ≠ position × scale`);
      assert.ok(g.crate.bottom <= GROUND + EPS, `${at}: crate below the ground`);
      // the hoist hangs below the trolley; nothing passes through the jib
      assert.ok(g.cable.length > 5, `${at}: cable length ${g.cable.length}`);
      assert.ok(g.block.y > TROLLEY_Y && g.crate.y > TROLLEY_Y && g.crate.y > JIB_BOTTOM, `${at}: crate/hook overlaps the jib or trolley`);
      assert.ok(g.block.y + g.block.h < g.hookY && g.hookY < g.crate.y, `${at}: rigging order trolley → block → hook → crate`);
      // what render() draws is this geometry
      const svg = render(p, r, s, fmt);
      assert.match(svg, new RegExp(`class="cable[^"]*" d="M${HOOK_X} ${TROLLEY_Y}V${r1(g.block.y)}"`), `${at}: cable not drawn trolley → block`);
      assert.ok(svg.includes(`y="${r1(g.crate.y)}" width="${r1(g.crate.w)}" height="${r1(g.crate.h)}"`), `${at}: crate not drawn at geometry`);
      // verdict comes from the phase only
      if (r.overload) {
        assert.equal(s.phase, 'stall', at);
        assert.equal(g.crate.bottom, GROUND, `${at}: overloaded crate left the ground`);
        assert.match(svg, /Melebihi kapasitas/, at);
      }
      if (s.phase === 'lift' || s.phase === 'ready') assert.doesNotMatch(svg, /habis|Sampai|Melebihi|dk-strain|dk-gap/, `${at}: verdict shown before the end`);
      // at t = 0 nothing moves: gauge empty, no power-limit colouring (a paused preview gives nothing away)
      if (s.phase === 'ready') assert.doesNotMatch(svg, /dk-fill/, `${at}: gauge not neutral at t = 0`);
      // the displacement arrow s spans exactly ground → current crate bottom (none while unmoved)
      const sArrow = svg.match(/<g class="vec vec-disp">\s*<path class="vec-line[^"]*" pathLength="1" d="M[\d.]+ ([\d.]+)L/);
      if (s.position > 0 && g.crate.bottom < GROUND - 2) assert.ok(sArrow && Number(sArrow[1]) === GROUND, `${at}: s arrow missing`);
      if (s.position === 0) assert.ok(!sArrow, `${at}: s arrow drawn for an unmoved crate`);
      if (sArrow) assert.ok(svg.includes(`<path class="vec-head" d="M${S_ARROW_X} ${r1(g.crate.bottom)}L`), `${at}: s arrow does not end at the crate`);
      if (s.phase === 'arrived') assert.match(svg, /Sampai/, at);
      if (s.phase === 'timeout') {
        assert.match(svg, /habis/, at);
        assert.ok(!svg.includes(`baru ${fmt(p.height)} m`), `${at}: failed run printed as reaching h`);
      }
    }
    const end = states.at(-1);
    const g = geometry(p, r, end);
    if (!r.ok && !r.overload) {
      assert.equal(end.phase, 'timeout', name);
      assert.ok(g.crate.bottom > g.targetY + EPS, `${name}: timeout but the crate is drawn at the target`);
      assert.ok(Math.abs(g.crate.bottom - g.reachedY) < 1e-9, `${name}: crate not at the reached height`);
    }
    if (r.ok) assert.ok(Math.abs(g.crate.bottom - g.targetY) < 1e-9, `${name}: success but crate not at the target`);
  }
});

test('derek scene: crate size grows with mass within plausible bounds', () => {
  for (let m = 50; m <= 10000; m += 50) {
    const size = crateSize(m);
    assert.ok(size.w >= 0.5 && size.w <= 6.1 && size.h >= 0.5 && size.h <= 2.6, `${m} kg: ${size.w} × ${size.h} m`);
    if (m <= 300) assert.ok(size.w <= 1.2, `${m} kg crate too large`);
  }
  // ± visibly changes the crate: 50 kg and 800 kg are drawn at different sizes
  const px = (m) => geometry({ ...lesson.preset, mass: m }, { reached: 0 }, { position: 0 }).crate.w;
  assert.ok(px(800) - px(50) > 5, `50 kg vs 800 kg: ${px(50)} vs ${px(800)} px`);
  for (let m = 100; m <= 10000; m += 50) assert.ok(px(m) >= px(m - 50) - 1e-9, `size shrinks at ${m} kg`);
});

test('derek scene: drag handle sits on the drawn target line; panel never hides the crate', () => {
  for (const [name, p] of sets) {
    const { r, states } = frames('derek', p, 8);
    for (const portrait of [false, true]) {
      const h = handle('height', p, portrait);
      assert.equal(h.y, crateBottomY(p.height), `${name}: handle y`);
      assert.equal(h.x, DIM_X, name);
      assert.ok(Math.abs(h.factor + 1 / PX_PER_M) < 1e-12, `${name}: drag scale`);
      const svg = render(p, r, states[0], fmt);
      const line = svg.match(/class="target-line" d="M([\d.]+) ([\d.]+)H([\d.]+)"/);
      assert.ok(line, name);
      assert.ok(Math.abs(Number(line[2]) - h.y) < 0.06 && h.x >= Number(line[1]) && h.x <= Number(line[3]), `${name}: handle off the target line`);
      // handle clear of the ± panel horizontally (its circle has r = 15)
      const [dx, dy] = loadOffset[portrait ? 'portrait' : 'desktop'];
      assert.ok(h.x + 15 < PANEL.x1 + dx || h.x - 15 > PANEL.x2 + dx, `${name}: handle under the panel`);
      const [cx, , cw] = camera[portrait ? 'portrait' : 'desktop'].split(' ').map(Number);
      for (const s of states) {
        const g = geometry(p, r, s);
        const overlapX = g.crate.x < PANEL.x2 + dx && g.crate.x + g.crate.w > PANEL.x1 + dx;
        const overlapY = g.block.y < PANEL.y2 + dy && g.crate.bottom > PANEL.y1 + dy;
        assert.ok(!(overlapX && overlapY), `${name}: panel covers the crate/hook`);
        assert.ok(g.crate.x >= cx && g.crate.x + g.crate.w <= cx + cw && h.x >= cx, `${name}: crate or handle outside the camera`);
      }
    }
  }
});

test('derek scene: readouts never print a failed run as a success', () => {
  // power: unequal values never print the same text
  for (const [used, rated] of [[1450, 1500], [19999, 20000], [9999.6, 10000], [600, 20000], [49999.99, 50000]]) {
    const [a, b] = powerPair(used, rated, fmt);
    assert.notEqual(a, b, `${used} / ${rated}`);
  }
  const [a, b] = powerPair(20000 * (1 + 1e-15), 20000, fmt);
  assert.equal(a, b);
  // reached height: 3 significant figures, never equal to h when short
  assert.equal(reachedText(1.95, 2, fmt), '1,95');
  assert.equal(reachedText(0.025, 15, fmt), '0,025');
  assert.equal(reachedText(14.9996, 15, fmt), '&lt; 15');
  assert.equal(reachedText(10, 15, fmt), '10');
});

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

test('derek FBD: forces balance in every frame and match the phase', () => {
  for (const [name, p] of sets) {
    const { r, states } = frames('derek', p, FRAMES);
    for (const s of states) {
      const F = fbdForces(p, s);
      const at = `${name} t=${s.t} ${s.phase}`;
      const up = F.filter((x) => x.dy < 0).reduce((a, x) => a + x.value, 0);
      const down = F.filter((x) => x.dy > 0).reduce((a, x) => a + x.value, 0);
      assert.ok(Math.abs(up - down) <= 1e-9 * r.weight, `${at}: ΣF = ${up - down}`);
      const keys = F.map((x) => x.key).sort().join(',');
      const byKey = Object.fromEntries(F.map((x) => [x.key, x.value]));
      assert.equal(byKey.g, r.weight, at);
      if (s.phase === 'ready') assert.equal(keys, 'N,g', at);
      else if (s.phase === 'stall') {
        assert.equal(keys, 'N,Tmaks,g', at);
        assert.equal(byKey.Tmaks, r.maxForce, at);
        const [t, n] = ['Tmaks', 'N'].map((k) => F.find((x) => x.key === k));
        assert.ok(t.ox !== n.ox, `${at}: the two upward arrows overlap`);
      } else {
        assert.equal(keys, 'T,g', at);
        assert.equal(byKey.T, s.tension, `${at}: T differs from the model tension`);
      }
      for (const x of F) {
        assert.ok(x.len <= FBD.maxLen + 1e-9, at);
        if (x.scaled) assert.ok(Math.abs(x.len - Math.max(4, x.value * FBD.k)) < 1e-9, `${at}: ${x.key} not to scale`);
      }
    }
  }
  // problem A is drawn to scale and clearly visible
  const A = lesson.preset;
  const { states } = frames('derek', A, 4);
  for (const x of fbdForces(A, states[2])) assert.ok(x.scaled && x.len >= 10, `A: ${x.key} ${x.len}px`);
});

test('derek FBD: panel stays clear of the gauge, handle, ± panel, crate column and status tags', () => {
  const box = { x: FBD.x, y: FBD.y, w: FBD.w, h: FBD.h };
  const gauge = { x: 232, y: 48, w: 156, h: 58 };
  const crateColumn = { x: S_ARROW_X - 4, y: TROLLEY_Y, w: 600, h: GROUND };
  assert.ok(!overlap(box, gauge), 'gauge');
  assert.ok(!overlap(box, crateColumn), 'crate column / s arrow');
  for (const portrait of [false, true]) {
    const [cx, cy, cw, ch] = camera[portrait ? 'portrait' : 'desktop'].split(' ').map(Number);
    assert.ok(box.x >= cx && box.x + box.w <= cx + cw && box.y >= cy && box.y + box.h <= cy + ch, 'FBD outside the camera');
    const [dx, dy] = loadOffset[portrait ? 'portrait' : 'desktop'];
    assert.ok(!overlap(box, { x: PANEL.x1 + dx, y: PANEL.y1 + dy, w: PANEL.x2 - PANEL.x1, h: PANEL.y2 - PANEL.y1 }), '± panel');
  }
  for (const [name, p] of sets) {
    // handle circle (r 15) and its label "h 30 m" to the right (interaction.js, ≈ 64 px wide)
    const h = handle('height', p);
    assert.ok(!overlap(box, { x: h.x - 15, y: h.y - 33, w: 101, h: 48 }), `${name}: handle`);
    const { r, states } = frames('derek', p, 6);
    for (const s of states) {
      const svg = render(p, r, s, fmt);
      for (const m of svg.matchAll(/<g class="tag[^"]*"><rect x="([\d.-]+)" y="([\d.-]+)" width="([\d.]+)" height="([\d.]+)"/g)) {
        const t = { x: +m[1], y: +m[2], w: +m[3], h: +m[4] };
        assert.ok(!overlap(box, t), `${name} ${s.phase}: status tag under the FBD`);
        assert.ok(!overlap(t, crateColumn) && !overlap(t, { x: 125, y: h.y - 33, w: 101, h: 48 }) && t.y + t.h < PANEL.y1, `${name} ${s.phase}: status tag collides`);
      }
    }
  }
});
