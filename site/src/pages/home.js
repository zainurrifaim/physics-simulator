import { lessons } from '../lessons/index.js';
import { solve, sample } from '../physics/models.js';
import { scene } from '../scenes/index.js';
import { icon } from '../components/icons.js';
import { reducedMotion } from '../components/fx.js';
import * as store from '../state/storage.js';

const caseParams = (l, c) => (c === 'a' ? l.preset : { ...l.preset, ...l.compare.B });

function miniCase(l, c) {
  const p = caseParams(l, c);
  const r = solve(l.id, p);
  return `<div class="mini-case mini-${c}"><span class="case-letter">${c.toUpperCase()}</span><div class="mini-scene stage-layers" data-loop="${l.id}" data-case="${c}">${scene(l.id, p, r, sample(l.id, p, r, 0))}</div></div>`;
}

function posterCard(l, done, featured = false) {
  return `<a class="poster-card${featured ? ' featured' : ''}" href="#sim/${l.id}">
    <span class="poster-card-q">${l.compare.question}</span>
    <div class="mini-cases">${miniCase(l, 'a')}${miniCase(l, 'b')}</div>
    <span class="poster-card-foot"><span>${l.number} · ${l.short}</span>${done ? `<span class="done">${icon('check')} Selesai</span>` : `<span>${l.minutes} menit ${icon('arrow')}</span>`}</span>
  </a>`;
}

export function renderHome(main) {
  const progress = store.all();
  const featured = lessons.find((l) => l.id === 'sabuk');
  main.innerHTML = `
    <section class="home-hero">
      <div class="hero-copy">
        <span class="eyebrow">FISIKA, DEKAT DENGAN KITA</span>
        <h1>Tebak dulu.<br><em>Lalu lihat fisikanya.</em></h1>
        <p>Setiap eksperimen adalah satu pertanyaan sederhana tentang kehidupan sehari-hari. Dua situasi, A dan B, bergerak berdampingan. Kamu menebak, menonton, lalu satu persamaan menjelaskan semuanya.</p>
        <div class="hero-actions">
          <a href="#sim/${lessons[0].id}" class="button primary">Mulai eksperimen pertama ${icon('arrow')}</a>
          <a href="#konsep" class="button ghost">Konsep dasar</a>
        </div>
        <div class="hero-meta"><span><b class="a-dot"></b> A = soal asli</span><span><b class="b-dot"></b> B = pembanding</span><span>${icon('clock')} ±90 menit</span></div>
      </div>
      ${posterCard(featured, progress[featured.id]?.done, true)}
    </section>

    <section class="catalog" aria-labelledby="catalog-title">
      <div class="section-heading">
        <div><span class="eyebrow">LIMA PERTANYAAN</span><h2 id="catalog-title">Usaha dan energi di sekitar kita</h2></div>
        <span class="muted section-note">Klik kartu untuk menebak.</span>
      </div>
      <div class="poster-grid">${lessons.map((l) => posterCard(l, progress[l.id]?.done)).join('')}</div>
    </section>

    <div class="learning-strip">
      <span class="strip-icon">${icon('book')}</span>
      <div><h3>Rumus lebih mudah dipahami setelah dicoba.</h3><p>Usaha, energi potensial, energi kinetik, kekekalan energi, dan daya — dalam satu halaman.</p></div>
      <a href="#konsep" class="button secondary">Buka konsep dasar ${icon('arrow')}</a>
    </div>`;

  return startLoops(main);
}

/** Loop each visible A/B preview: hold → move (both on one clock) → hold. */
function startLoops(main) {
  if (reducedMotion()) return () => {};
  const items = [...main.querySelectorAll('[data-loop]')].map((el) => {
    const l = lessons.find((x) => x.id === el.dataset.loop);
    const p = caseParams(l, el.dataset.case);
    const pa = caseParams(l, 'a');
    const pb = caseParams(l, 'b');
    const total = Math.max(solve(l.id, pa).duration, solve(l.id, pb).duration);
    return { el, l, p, r: solve(l.id, p), total, visible: false };
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const it = items.find((i) => i.el === e.target);
      if (it) it.visible = e.isIntersecting;
    }
  });
  items.forEach((i) => io.observe(i.el));
  let raf = 0;
  let lastDraw = 0;
  const CYCLE = 5200;
  const loop = (now) => {
    if (!main.isConnected) return;
    raf = requestAnimationFrame(loop);
    if (now - lastDraw < 50) return;
    lastDraw = now;
    const q = Math.max(0, Math.min(1, ((now % CYCLE) / CYCLE - 0.15) / 0.6));
    for (const it of items) {
      if (!it.visible) continue;
      it.el.innerHTML = scene(it.l.id, it.p, it.r, sample(it.l.id, it.p, it.r, it.total * q));
    }
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
  };
}
