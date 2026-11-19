import test from 'node:test';
import assert from 'node:assert/strict';
import { forceDiagram } from '../site/src/components/fbd.js';
import { lessons } from '../site/src/lessons/index.js';
import { solve } from '../site/src/physics/models.js';

const strip = (s) => s.replace(/<tspan class="sub"[^>]*>([^<]*)<\/tspan>/g, (m, t) => '~'.repeat(Math.ceil(t.length * 0.75))).replace(/<[^>]+>/g, '').replace(/​/g, '');

function boxes(svg) {
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/).slice(1).map(Number);
  const out = [];
  const re = /<g transform="translate\(([\d.-]+) ([\d.-]+)\)">([\s\S]*?)(?=<g transform="translate|<\/svg>)/g;
  let g;
  while ((g = re.exec(svg))) {
    const [ox, oy] = [Number(g[1]), Number(g[2])];
    for (const t of g[3].matchAll(/<text([^>]*)>([\s\S]*?)<\/text>/g)) {
      const x = Number(/ x="([\d.-]+)"/.exec(t[1])[1]) + ox, y = Number(/ y="([\d.-]+)"/.exec(t[1])[1]) + oy;
      const fs = /fcase/.test(t[1]) ? 16 : 11;
      const w = strip(t[2]).length * fs * 0.6;
      out.push({ text: strip(t[2]), x0: x, x1: x + w, y0: y - fs, y1: y + 3 });
    }
  }
  return { vb, out };
}

for (const lesson of lessons) {
  for (const stacked of [false, true]) {
    test(`fbd ${lesson.id} ${stacked ? 'stacked' : 'side'}: labels do not overlap`, () => {
      const A = { ...lesson.preset }, B = { ...lesson.preset, ...lesson.compare.B };
      const cases = [{ p: A, r: solve(lesson.id, A), cls: 'a' }, { p: B, r: solve(lesson.id, B), cls: 'b' }];
      const { vb, out } = boxes(forceDiagram(lesson, cases, { stacked }));
      assert.ok(out.length >= 4);
      for (const b of out) assert.ok(b.x0 >= 0 && b.x1 <= vb[0] && b.y0 >= 0 && b.y1 <= vb[1], `${b.text} outside viewBox`);
      for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
        const a = out[i], b = out[j];
        assert.ok(a.x1 <= b.x0 || b.x1 <= a.x0 || a.y1 <= b.y0 || b.y1 <= a.y0, `"${a.text}" overlaps "${b.text}"`);
      }
    });
  }
}
