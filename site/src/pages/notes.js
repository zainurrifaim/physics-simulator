import { lessons } from '../lessons/index.js';
import { icon } from '../components/icons.js';
import { esc } from '../format.js';
import * as store from '../state/storage.js';

export function renderNotes(main) {
  const data = store.all();
  const done = lessons.filter((l) => data[l.id]?.done).length;

  main.innerHTML = `
    <div class="page-heading notes-heading">
      <div>
        <span class="eyebrow">CATATAN BELAJARKU</span>
        <h1>Jejak eksperimenmu</h1>
        <p class="lead">${done} dari 5 modul selesai. Catatan ini hanya tersimpan di browser perangkat ini.</p>
      </div>
      <div class="notes-actions">
        <button class="button secondary" data-notes="print">${icon('print')} Cetak ringkasan</button>
        <button class="button ghost danger" data-notes="clear">${icon('trash')} Hapus semua catatan</button>
      </div>
    </div>
    <div class="print-only print-header">
      <p>Nama: ____________________ &nbsp; Kelas: __________ &nbsp; Tanggal: __________</p>
    </div>
    <div class="notes-list">
      ${lessons
        .map((l) => {
          const d = data[l.id] || {};
          const rubricDone = Object.values(d.rubric || {}).filter(Boolean).length;
          const row = (k, v) => `<div><dt>${k}</dt><dd>${v ? esc(v) : '<span class="muted">—</span>'}</dd></div>`;
          return `<article class="panel note-card">
            <header>
              <span class="module-number">${l.number}</span>
              <h2><a href="#sim/${l.id}">${l.title}</a></h2>
              <span class="status ${d.done ? 'done' : ''}">${d.done ? `${icon('check')} Selesai` : 'Belum selesai'}</span>
            </header>
            <dl class="note-fields">
              ${row('Prediksi', d.prediction !== undefined ? l.prediction.options[d.prediction] + (d.predictionReason ? ' — ' + d.predictionReason : '') : '')}
              ${row('Sketsa (deskripsi)', d.sketchText)}
              ${row('Jawaban', d.answer ? `${d.answer} ${d.unit || ''}${d.answerCorrect ? ' ✓' : ''}` : '')}
              ${row('Langkah', d.steps)}
              ${row('Vektor', d.vectorsCorrect ? 'Semua tepat ✓' : d.vectors && Object.keys(d.vectors).length ? 'Belum semua tepat' : '')}
              ${row('Daftar periksa', d.rubric ? `${rubricDone} / ${l.worksheet.rubric.length} kriteria` : '')}
              ${row('Refleksi', d.reflection)}
            </dl>
          </article>`;
        })
        .join('')}
    </div>`;

  main.querySelector('[data-notes="print"]').addEventListener('click', () => window.print());
  main.querySelector('[data-notes="clear"]').addEventListener('click', () => {
    if (!confirm('Hapus semua catatan dan progres di browser ini? Tindakan ini tidak dapat dibatalkan.')) return;
    store.clearAll();
    document.dispatchEvent(new CustomEvent('progress-changed'));
    renderNotes(main);
  });
}
