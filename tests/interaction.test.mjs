import test from 'node:test';
import assert from 'node:assert/strict';
import { lessons, byId } from '../site/src/lessons/index.js';
import { solve } from '../site/src/physics/models.js';
import { editParameter, handleGeometry, dragValue, isOriginalComparison, comparisonValue } from '../site/src/components/interaction.js';
import { compareChart } from '../site/src/components/chart.js';

test('scene editing changes every module outcome and preserves the other case', () => {
  for (const lesson of lessons) {
    const a = { ...lesson.preset }, b = { ...a, ...lesson.compare.B };
    const key = lesson.interaction.load || 'speed';
    const edited = editParameter(lesson, a, key, a[key] + (lesson.interaction.increment || 10));
    const before = solve(lesson.id, a), after = solve(lesson.id, edited);
    assert.deepEqual(a, lesson.preset);
    assert.deepEqual(b, { ...lesson.preset, ...lesson.compare.B });
    // Cycling preserves time while energy changes; elevator payload changes absorbed power.
    const outcome = lesson.id === 'sepeda' ? 'energy' : lesson.id === 'lift' ? 'absorbed' : 'answer';
    assert.notDeepEqual(before[outcome], after[outcome]);
    assert.equal(isOriginalComparison(lesson, edited, b), false);
  }
});

test('edits clamp, round to increments and reject invalid input', () => {
  const lesson = byId('sabuk');
  assert.equal(editParameter(lesson, lesson.preset, 'distance', .53).distance, .55);
  assert.equal(editParameter(lesson, lesson.preset, 'speed', 999).speed, 120);
  assert.equal(editParameter(lesson, lesson.preset, 'speed', -50).speed, 10);
  assert.throws(() => editParameter(lesson, lesson.preset, 'speed', NaN));
  assert.throws(() => editParameter(lesson, lesson.preset, 'unknown', 2));
});

test('slope gestures keep the hill no steeper than sin θ = 0,7', () => {
  const l = byId('sepeda');
  let p = editParameter(l, { ...l.preset, length: 100 }, 'height', 150);
  assert.equal(p.height, 70);
  p = editParameter(l, { ...l.preset, height: 83 }, 'length', 20);
  assert.ok(p.height / p.length <= 0.7 + 1e-9);
  assert.doesNotThrow(() => solve(l.id, p));
});

test('drag mapping follows the geometry and moving upward increases target height', () => {
  for (const l of lessons) for (const key of l.interaction.handles) {
    const g = handleGeometry(l.id, key, l.preset);
    assert.ok([g.x, g.y, g.factor].every(Number.isFinite));
    const point = { x: g.x, y: g.y }, moved = { ...point, [g.axis]: point[g.axis] + 20 };
    const value = dragValue(l.preset[key], point, moved, g);
    const p = editParameter(l, l.preset, key, value);
    assert.doesNotThrow(() => solve(l.id, p));
    if (g.axis === 'y') assert.ok(value < l.preset[key]);
  }
});

test('custom elevator comparisons report braking power rather than the worksheet capacity', () => {
  const l = byId('lift');
  assert.deepEqual(comparisonValue(l.id, solve(l.id, l.preset)), { value: 10000, unit: 'W', label: 'P lift', digits: 2 });
  assert.deepEqual(comparisonValue(l.id, solve(l.id, { ...l.preset, payload: 2500 })), { value: 12500, unit: 'W', label: 'P lift', digits: 2 });
});

test('charts include both independent limits when A/B settings differ', () => {
  const l = byId('angkat');
  const pA = { ...l.preset }, pB = { ...l.preset, energy: 800 };
  const cases = [{ p: pA, r: solve(l.id, pA), cls: 'a' }, { p: pB, r: solve(l.id, pB), cls: 'b' }];
  const chart = compareChart(l, cases, 2, 0);
  assert.match(chart, /A · energi tersedia 500 J/);
  assert.match(chart, /B · energi tersedia 800 J/);
});

test('scene camera does not depend on the force layer (Gaya toggle must not move the drawing)', async () => {
  const { sceneCamera } = await import('../site/src/components/interaction.js');
  const { sceneModules } = await import('../site/src/scenes/index.js');
  for (const id of Object.keys(sceneModules)) {
    const c = sceneModules[id].camera;
    assert.ok(!Object.keys(c).some((k) => k.startsWith('clean')), `${id}: no separate clean cameras`);
    for (const portrait of [false, true]) {
      assert.equal(sceneCamera(id, portrait, true), sceneCamera(id, portrait, false), `${id} ${portrait ? 'portrait' : 'desktop'}`);
    }
  }
});
