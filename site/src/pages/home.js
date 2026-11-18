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
    <span class="poster-card-foot"><span>${l.number} · ${l.short}</span>${done ? `<span class="done">${icon('check')} Selesai</span>` : `<span>${l.minutes} menit ${icon('arrow')}</span>`}</span>
  </a>`;
}

export function renderHome(main) {
  const progress = store.all();
  main.innerHTML = `
    <section class="home-hero">
      <div class="hero-copy">
        <span class="eyebrow">USAHA &amp; ENERGI</span>
        <h1>Belajar fisika dengan mencoba.</h1>
        <p>Tambahkan beban, ubah tinggi, atau atur jarak pengereman langsung di dalam simulasi. Bandingkan A dan B, lalu jelaskan hasilnya.</p>
        <div class="hero-actions">
          <a href="#sim/${lessons[0].id}" class="button primary">Mulai eksperimen pertama ${icon('arrow')}</a>
          <a href="#konsep" class="button ghost">Konsep dasar</a>
        </div>
        <div class="hero-meta"><span><b class="a-dot"></b> A = soal asli</span><span><b class="b-dot"></b> B = pembanding</span><span>${icon('clock')} ±90 menit</span></div>
      </div>
    </section>

    <section class="catalog" aria-labelledby="catalog-title">
      <div class="section-heading">
        <div><span class="eyebrow">LIMA PERTANYAAN</span><h2 id="catalog-title">Usaha dan energi di sekitar kita</h2></div>
        <span class="muted section-note">Pilih satu untuk mulai mencoba.</span>
      </div>
      <div class="poster-grid">${lessons.map((l) => posterCard(l, progress[l.id]?.done)).join('')}</div>
    </section>`;

  return () => {};
}
