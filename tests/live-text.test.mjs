// Live numbers must not jitter: values that change every frame keep one number of decimals
// (and, for the crane gauge, one text length) through a whole run.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lessons } from '../site/src/lessons/index.js';
import { fmt } from '../site/src/format.js';
import * as lift from '../site/src/scenes/lift.js';
import * as derek from '../site/src/scenes/derek.js';
import * as sabuk from '../site/src/scenes/sabuk.js';
import { parameterSets, frames } from './helpers.mjs';

const scenes = { lift, derek, sabuk };
const SLOTS = {
  lift: ['display-big', 'display-small', 'gauge-value'],
  derek: ['dk-g-value'],
  sabuk: ['ro-value'],
};
const textOf = (svgText, cls) => [...svgText.matchAll(new RegExp(`<text class="${cls}[^"]*"[^>]*>([^<]*)</text>`, 'g'))].map((m) => m[1]);
const decimals = (t) => (t.match(/,(\d+)/g) ?? []).map((d) => d.length - 1).join('/');

for (const id of ['lift', 'derek', 'sabuk']) {
  test(`${id} scene: live numbers keep a constant number of decimals during a run`, () => {
    const lesson = lessons.find((l) => l.id === id);
    for (const [name, p] of parameterSets(lesson)) {
      const { r, states } = frames(id, p, 90);
      const seen = new Map();
      for (const s of states) {
        const out = scenes[id].render(p, r, s, fmt);
        const html = typeof out === 'string' ? out : out.svg ?? String(out);
        for (const cls of SLOTS[id]) {
          textOf(html, cls).forEach((t, i) => {
            const key = `${cls}#${i}`;
            const shape = id === 'derek' ? t.length : decimals(t);
            if (!seen.has(key)) seen.set(key, shape);
            assert.equal(shape, seen.get(key), `${id} ${name} t=${s.t}: "${t}" changes shape in ${key}`);
          });
        }
      }
      assert.ok(seen.size > 0, `${id}: no live slots found`);
    }
  });
}
