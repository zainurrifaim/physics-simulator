import test from 'node:test';
import assert from 'node:assert/strict';
import { vectorProblems, failingSummary } from '../site/src/components/worksheet.js';
import angkat from '../site/src/lessons/angkat.js';
import derek from '../site/src/lessons/derek.js';
import sabuk from '../site/src/lessons/sabuk.js';

const vs = angkat.worksheet.vectors;
test('vectorProblems flags wrong direction and magnitude', () => {
  assert.deepEqual(vectorProblems(vs[0], { dir: 'down', mag: '200' }), []);
  assert.deepEqual(vectorProblems(vs[1], { dir: 'up', mag: '250' }), []);
  assert.deepEqual(vectorProblems(sabuk.worksheet.vectors[1], { dir: 'left', mag: '7000' }), ['besar belum tepat']);
  assert.deepEqual(vectorProblems(vs[0], { dir: 'up' }), ['arah belum tepat', 'isi besar gaya']);
  assert.deepEqual(vectorProblems(vs[2], {}), ['pilih arah']);
});
test('failingSummary strips HTML and lists only failures', () => {
  const s = failingSummary(vs, { Fg: ['arah belum tepat'], F: [], s: ['pilih arah'] });
  assert.equal(s, 'Gaya berat Fg (arah belum tepat); Perpindahan s (pilih arah)');
});
test('lifting force accepts any magnitude at or above the weight', () => {
  const F = vs[1];
  const T = derek.worksheet.vectors[1];
  assert.deepEqual(vectorProblems(F, { dir: 'up', mag: '200' }), []);
  assert.deepEqual(vectorProblems(F, { dir: 'up', mag: '250' }), []);
  assert.deepEqual(vectorProblems(T, { dir: 'up', mag: '2.000' }), []);
  assert.deepEqual(vectorProblems(T, { dir: 'up', mag: '2500' }), []);
  assert.equal(vectorProblems(F, { dir: 'up', mag: '150' }).length, 1);
  assert.match(vectorProblems(F, { dir: 'up', mag: '150' })[0], /berat/);
  assert.equal(vectorProblems(T, { dir: 'up', mag: '1500' }).length, 1);
  assert.deepEqual(vectorProblems(F, { dir: 'down', mag: '250' }), ['arah belum tepat']);
});
test('exact-magnitude vectors still need the exact value', () => {
  assert.deepEqual(vectorProblems(vs[0], { dir: 'down', mag: '200' }), []);
  assert.deepEqual(vectorProblems(vs[0], { dir: 'down', mag: '250' }), ['besar belum tepat']);
  assert.deepEqual(vectorProblems(derek.worksheet.vectors[0], { dir: 'down', mag: '2000' }), []);
  assert.deepEqual(vectorProblems(derek.worksheet.vectors[0], { dir: 'down', mag: '2500' }), ['besar belum tepat']);
});
test('rubric states the key as at least the weight; sabuk marks the extra normal force', () => {
  assert.ok(angkat.worksheet.rubric.some((r) => r.includes('≥ 200 N')));
  assert.ok(derek.worksheet.rubric.some((r) => r.includes('≥ 2.000 N')));
  assert.ok(sabuk.worksheet.vectors.find((v) => v.key === 'N').label.includes('(tambahan)'));
});
