import { lessons } from '../lessons/index.js';
import { solve, sample } from '../physics/models.js';
import { scene } from '../scenes/index.js';
import { icon } from '../components/icons.js';
import * as store from '../state/storage.js';

function preview(lesson, at = 0.55) {
  const r = solve(lesson.id, lesson.preset);
  return scene(lesson.id, lesson.preset, r, sample(lesson.id, lesson.preset, r, r.duration * at));
}

export function renderHome(main) {
  const progress = store.all();
  const hero = lessons[0];
  main.innerHTML = `
    <section class="home-hero">
      <div class="hero-copy">
        <span class="eyebrow"><span class="little-line"></span> FISIKA, DEKAT DENGAN KITA</span>
        <h1>Pahami dunia,<br>satu <em>eksperimen.</em></h1>
        <p>Dari mengangkat barbel hingga meluncur menuruni bukit. Tonton ceritanya, ubah angkanya, amati geraknya, lalu temukan sendiri jawabannya.</p>
        <a href="#sim/${hero.id}" class="button primary">Mulai bereksperimen ${icon('arrow')}</a>
        <div class="hero-meta"><span>${icon('grid')} 5 simulasi interaktif</span><span>${icon('film')} Cerita animasi singkat</span><span>${icon('clock')} ±90 menit</span></div>
      </div>
      <div class="hero-art mint">
        <div class="hero-art-top"><span><i></i> SEBUAH EKSPERIMEN KECIL</span><span>01 / 05</span></div>
        <div class="stage-layers show-labels">${preview(hero, 1)}</div>
        <div class="floating-formula"><span>Energi berubah.<br>Rasa ingin tahu bertambah.</span><b>E<sub>p</sub> = mgh</b></div>
      </div>
    </section>

    <section class="catalog" aria-labelledby="catalog-title">
      <div class="section-heading">
        <div><span class="eyebrow">PILIH RASA INGIN TAHUMU</span><h2 id="catalog-title">Laboratorium sehari-hari <span class="count-pill">05</span></h2></div>
        <span class="muted section-note">Situasi nyata. Pemahaman baru.</span>
      </div>
      <div class="lesson-grid">
        ${lessons
          .map(
            (l) => `<a class="lesson-card" href="#sim/${l.id}">
              <div class="card-illustration ${l.color}">
                <span class="card-number">EKSPERIMEN ${l.number}</span>
                ${progress[l.id]?.done ? `<span class="done-badge">${icon('check')} Selesai</span>` : ''}
                <div class="stage-layers show-labels">${preview(l)}</div>
                <span class="card-open">${icon('arrow')}</span>
              </div>
              <div class="card-copy">
                <div class="card-category">${l.category}<span>${icon('clock')} ${l.minutes} menit</span></div>
                <h3>${l.title}</h3>
                <p>${l.hook}</p>
                <div class="tag-row">${l.tags.map((t) => `<span>${t}</span>`).join('')}</div>
              </div>
            </a>`
          )
          .join('')}
        <div class="curiosity-card">
          <span class="curiosity-symbol" aria-hidden="true">?</span>
          <span class="eyebrow">TIDAK ADA PERTANYAAN KECIL</span>
          <h3>“Kenapa bisa begitu?”<br>Awal dari setiap penemuan.</h3>
          <p>Setiap modul: cerita → prediksi → eksperimen → analisis → refleksi.</p>
          <button class="text-button" data-action="guide">Cara menggunakan lab ${icon('arrow')}</button>
        </div>
      </div>
    </section>

    <div class="learning-strip">
      <span class="strip-icon">${icon('book')}</span>
      <div><h3>Rumus lebih mudah dipahami setelah dicoba.</h3><p>Kenali konsep usaha, energi, dan daya yang menghubungkan semua eksperimen.</p></div>
      <a href="#konsep" class="button secondary">Buka konsep dasar ${icon('arrow')}</a>
    </div>`;
}
