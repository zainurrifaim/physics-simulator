import { lessons } from '../src/lessons/index.js';
import { solve, sample } from '../src/physics/models.js';
import { scene } from '../src/scenes/index.js';
import { fmt } from '../src/format.js';

const q = new URLSearchParams(location.search);
const cols = Number(q.get('cols')) || 8;
const layers = (q.get('layers') ?? 'labels,forces,motion').split(',').filter(Boolean);
const ids = q.get('id') ? q.get('id').split(',') : lessons.map((l) => l.id);
const out = document.getElementById('out');
document.body.style.setProperty('--cols', cols);

function setsFor(lesson) {
  const A = { ...lesson.preset }, B = { ...lesson.preset, ...lesson.compare.B };
  const all = { A, B };
  for (const f of lesson.fields) { all[`${f.key}=min`] = { ...A, [f.key]: f.min }; all[`${f.key}=max`] = { ...A, [f.key]: f.max }; }
  // also accepts custom sets such as "B.capacity=5000" or "A.mass=40;height=1.8"
  const custom = (k) => {
    const m = /^(A|B)\.(.+)$/.exec(k);
    if (!m) return null;
    const p = { ...all[m[1]] };
    for (const kv of m[2].split(';')) { const [key, v] = kv.split('='); if (key in p) p[key] = Number(v); else return null; }
    return p;
  };
  const wanted = q.get('sets') ? q.get('sets').split(',') : ['A', 'B'];
  return wanted.map((k) => [k, all[k] ?? custom(k)]).filter(([, p]) => p);
}

for (const id of ids) {
  const lesson = lessons.find((l) => l.id === id);
  for (const [name, p] of setsFor(lesson)) {
    let r;
    try { r = solve(id, p); } catch (e) { out.insertAdjacentHTML('beforeend', `<h2>${id} · ${name}: ${e.message}</h2>`); continue; }
    const cells = Array.from({ length: cols }, (_, i) => {
      const t = (r.duration * i) / (cols - 1);
      const s = sample(id, p, r, t);
      return `<figure><figcaption>t=${fmt(t, 3)} s · ${s.phase}</figcaption><div class="stage-layers ${layers.map((l) => `show-${l}`).join(' ')}">${scene(id, p, r, s)}</div></figure>`;
    }).join('');
    out.insertAdjacentHTML('beforeend', `<h2>${id} · ${name} · ok=${r.ok} · ${JSON.stringify(p)}</h2><div class="row">${cells}</div>`);
  }
}
document.body.dataset.ready = '1';
