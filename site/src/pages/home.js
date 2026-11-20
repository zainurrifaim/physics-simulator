import { lessons } from '../lessons/index.js';
import { solve, sample } from '../physics/models.js';
import { scene } from '../scenes/index.js';
import { icon } from '../components/icons.js';

import * as store from '../state/storage.js';

const caseParams = (l, c) => (c === 'a' ? l.preset : { ...l.preset, ...l.compare.B });

function miniCase(l, c) {
  const p = caseParams(l, c);
  const r = solve(l.id, p);
  return `<div class="mini-case mini-${c}"><span class="case-letter">${c.toUpperCase()}</span><div class="mini-scene stage-layers">${scene(l.id, p, r, sample(l.id, p, r, 0))}</div></div>`;
}

function posterCard(l, done) {
  return `<a class="poster-card" href="#sim/${l.id}">
    <span class="poster-card-q">${l.compare.question}</span>
    <div class="mini-cases">${miniCase(l, 'a')}${miniCase(l, 'b')}</div>
    <span class="poster-card-foot"><span>${l.short}</span>${done ? `<span class="done">${icon('check')} Selesai</span>` : `<span>Buka ${icon('arrow')}</span>`}</span>
  </a>`;
}

export function renderHome(main) {
  const progress = store.all();
  main.innerHTML = `
    <section class="home-hero">
      <div class="hero-copy">
        <h1>Simulator usaha dan energi</h1>
        <p>Ubah beban, tinggi, atau kecepatan. Bandingkan gerak A dan B, lalu pelajari gaya dan energi yang menjelaskan hasilnya.</p>
        <div class="hero-actions">
          <a href="#sim/${lessons[0].id}" class="button primary">Mulai simulasi ${icon('arrow')}</a>
          <a href="#konsep" class="button ghost">Konsep dasar</a>
        </div>
        <div class="hero-meta"><span><b class="a-dot"></b> A · soal awal</span><span><b class="b-dot"></b> B · pembanding</span></div>
      </div>
    </section>

    <section class="catalog" aria-labelledby="catalog-title">
      <div class="section-heading">
        <h2 id="catalog-title">Pilih simulasi</h2>
      </div>
      <div class="poster-grid">${lessons.map((l) => posterCard(l, progress[l.id]?.done)).join('')}</div>
    </section>`;

  return () => {};
}
