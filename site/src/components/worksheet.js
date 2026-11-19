// "Lembar belajar": the paper worksheet from the materials, made interactive.
// Numeric answers and vector directions are checked automatically; sketches and
// written reasoning use a self/teacher checklist taken from the answer key.
import { solve } from '../physics/models.js';
import { fmt, esc, parseNumber } from '../format.js';
import { icon } from './icons.js';
import { mountSketch } from './sketch.js';
import { blip } from './fx.js';
import * as store from '../state/storage.js';

const UNITS = {
  J: { dim: 'energi', factor: 1 },
  kJ: { dim: 'energi', factor: 1e3 },
  W: { dim: 'daya', factor: 1 },
  kW: { dim: 'daya', factor: 1e3 },
  N: { dim: 'gaya', factor: 1 },
  kN: { dim: 'gaya', factor: 1e3 },
  kg: { dim: 'massa', factor: 1 },
  s: { dim: 'waktu', factor: 1 },
  'm/s': { dim: 'kecepatan', factor: 1 },
};

const DIRECTIONS = {
  up: { label: 'Ke atas', glyph: '↑', vec: [0, -1] },
  down: { label: 'Ke bawah', glyph: '↓', vec: [0, 1] },
  left: { label: 'Ke kiri', glyph: '←', vec: [-1, 0] },
  right: { label: 'Ke kanan', glyph: '→', vec: [1, 0] },
  slope: { label: 'Sejajar lereng, ke bawah', glyph: '↘', vec: [0.8, 0.6] },
};

const kindOf = (key) => (key === 'v' ? 'velocity' : key === 's' ? 'disp' : 'force');

const plainLabel = (html) => String(html).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();

/** Problems with one vector entry; an empty list means the vector is correct. */
export function vectorProblems(v, entry = {}) {
  const problems = [];
  if (!entry.dir) problems.push('pilih arah');
  else if (entry.dir !== v.correct) problems.push('arah belum tepat');
  if (v.magnitude) {
    const m = parseNumber(entry.mag);
    if (!Number.isFinite(m)) problems.push('isi besar gaya');
    else if (v.magnitudeMin) {
      // The answer key says "F ≥ weight": any force at least that large is fine.
      if (m < v.magnitude * 0.99) problems.push(v.minHint || 'gaya terlalu kecil, harus sama atau lebih besar dari gaya berat');
    } else if (Math.abs(m - v.magnitude) > v.magnitude * 0.01) problems.push('besar belum tepat');
  }
  return problems;
}

/** Summary sentence listing the failing vectors, e.g. "Perlu diperbaiki: Gaya berat Fg (arah belum tepat)". */
export function failingSummary(vectors, results) {
  return vectors
    .filter((v) => results[v.key]?.length)
    .map((v) => `${plainLabel(v.label)} (${results[v.key].join(', ')})`)
    .join('; ');
}

/** Check a numeric answer against the expected value (1 % tolerance). */
export function checkAnswer(text, unit, expected) {
  const value = parseNumber(text);
  if (!Number.isFinite(value)) return { status: 'empty', message: 'Tulis jawabanmu dalam bentuk angka, misalnya 300 atau 1,5.' };
  const u = UNITS[unit];
  const target = UNITS[expected.unit];
  if (!unit) return { status: 'unit', message: 'Jangan lupa memilih satuannya.' };
  if (!u || u.dim !== target.dim) {
    return { status: 'unit', message: `Satuannya belum tepat. Besaran yang ditanyakan adalah ${target.dim}.` };
  }
  const si = value * u.factor;
  const ok = Math.abs(si - expected.value) <= Math.max(1e-9, Math.abs(expected.value) * 0.01);
  return ok
    ? { status: 'ok', message: `Tepat! ${fmt(expected.value)} ${expected.unit}.` }
    : { status: 'wrong', message: 'Belum tepat. Periksa lagi rumus, substitusi angka, dan satuannya.' };
}

export function mountWorksheet(root, lesson, draft) {
  const expected = solve(lesson.id, lesson.preset).answer;
  const ws = lesson.worksheet;
  draft.vectors ??= {};
  draft.rubric ??= {};
  const save = () => {
    store.save();
    const warn = root.querySelector('.storage-warning');
    if (warn) warn.hidden = store.storageAvailable;
  };

  root.innerHTML = `
    <p class="storage-warning" role="status" ${store.storageAvailable ? 'hidden' : ''}>Penyimpanan browser tidak tersedia. Jawabanmu tidak akan tersimpan jika halaman ditutup.</p>
    <div class="worksheet-heading">
      <div><span class="eyebrow">DARI MENGAMATI KE MEMAHAMI · SOAL ASLI</span><h2>Lembar belajarmu</h2></div>
      <span class="saved-label">${store.storageAvailable ? 'Tersimpan otomatis di browser ini' : 'Penyimpanan browser tidak tersedia'}</span>
    </div>
    <details class="problem-text open-able"><summary>Baca soal asli</summary><p>${lesson.problem}</p></details>
    <p class="original-values">Soal asli: ${lesson.fields.filter((f) => f.key !== 'carMass').map((f) => `${f.symbol} = ${fmt(lesson.preset[f.key])} ${f.unit}`).join(' · ')}</p>

    <div class="ws-block">
      <h3 class="ws-title"><span>a</span> Sketsa situasi</h3>
      <p class="small muted">Gambarkan posisi awal dan akhir, lalu beri label besaran yang diketahui. Bisa memakai mouse, jari, atau stylus.</p>
      <div class="sketch-host"></div>
      <label class="small" for="sketch-text">Atau deskripsikan sketsamu dengan kata-kata:</label>
      <textarea id="sketch-text" class="text-area" data-field="sketchText" rows="2" placeholder="Posisi awal…, posisi akhir…, besaran yang diketahui…">${esc(draft.sketchText)}</textarea>
    </div>

    <div class="ws-block">
      <h3 class="ws-title"><span>b</span> Diagram vektor</h3>
      <p class="small muted">Pilih arah vektor. Jika diminta, tulis besar gaya dalam newton.</p>
      <div class="vector-navigation"><button class="button ghost" data-ws="previous-vector" aria-label="Vektor sebelumnya">←</button><span id="vector-count"></span><button class="button ghost" data-ws="next-vector" aria-label="Vektor berikutnya">→</button></div>
      <div class="vector-task">
        <div class="vector-list">
          ${ws.vectors
            .map(
              (v) => `<fieldset class="vector-item" data-vector="${v.key}">
                <legend><i class="key key-${kindOf(v.key)}"></i> <span class="vector-label">${v.label}</span></legend>
                <div class="dir-row">${ws.directions
                  .map(
                    (d) => `<label class="dir"><input type="radio" name="dir-${v.key}" value="${d}" ${draft.vectors[v.key]?.dir === d ? 'checked' : ''}><span title="${DIRECTIONS[d].label}"><b aria-hidden="true">${DIRECTIONS[d].glyph}</b><span class="sr-only">${DIRECTIONS[d].label}</span></span></label>`
                  )
                  .join('')}</div>
                ${v.magnitude ? `<label class="mag"><span>Besar</span><input class="text-input" inputmode="decimal" data-mag="${v.key}" value="${esc(draft.vectors[v.key]?.mag)}" placeholder="…"><span>N</span></label>` : ''}
                <span class="vec-feedback" aria-live="polite"></span>
              </fieldset>`
            )
            .join('')}
          <button class="button secondary" data-ws="check-vectors">${icon('check')} Periksa semua vektor</button>
          <p class="feedback" id="vector-feedback" role="status"></p>
        </div>
        <div class="vector-preview" aria-hidden="true"><svg viewBox="0 0 220 220"></svg><span>Pratinjau diagram</span></div>
      </div>
    </div>

    <div class="ws-block">
      <h3 class="ws-title"><span>c</span> Perhitungan</h3>
      <label class="field-title" for="ws-answer">${ws.question}</label>
      <div class="answer-row">
        <input id="ws-answer" class="text-input" inputmode="decimal" data-field="answer" value="${esc(draft.answer)}" placeholder="Jawabanmu">
        <select id="ws-unit" class="select" data-field="unit" aria-label="Satuan jawaban"><option value="">satuan…</option>${Object.keys(UNITS)
          .map((u) => `<option ${(draft.unit || '') === u ? 'selected' : ''}>${u}</option>`)
          .join('')}</select>
        <button class="button secondary" data-ws="check-answer">Periksa</button>
      </div>
      <p class="feedback" id="answer-feedback" role="status"></p>
      <label class="small" for="ws-steps">Tuliskan langkah-langkahmu (diketahui, rumus, substitusi, hasil + satuan):</label>
      <textarea id="ws-steps" class="text-area" data-field="steps" rows="4" placeholder="Diketahui: …&#10;Ditanya: …&#10;Jawab: …">${esc(draft.steps)}</textarea>
    </div>

    <div class="ws-block rubric-block"><details>
      <summary>Daftar periksa (mandiri / bersama guru)</summary>
      <p class="small muted">Diambil dari kunci jawaban dan rubrik. Sketsa dan penalaran tidak dinilai otomatis.</p>
      <div class="rubric">${ws.rubric.map((item, i) => `<label class="check"><input type="checkbox" data-rubric="${i}" ${draft.rubric[i] ? 'checked' : ''}><span>${item}</span></label>`).join('')}</div>
    </details></div>

    <div class="ws-block">
      <h3 class="ws-title"><span>?</span> Refleksi</h3>
      <label class="field-title" for="ws-reflection">${ws.reflection}</label>
      <textarea id="ws-reflection" class="text-area" data-field="reflection" rows="3" placeholder="Aku menemukan bahwa…">${esc(draft.reflection)}</textarea>
    </div>

    <div class="worksheet-actions">
      <button class="button primary" data-ws="complete">${icon('check')} Tandai selesai</button>
      <a class="button ghost" href="#catatan">${icon('note')} Lihat semua catatan</a>
      <button class="button ghost" data-ws="print">${icon('print')} Cetak</button>
    </div>
    <p class="feedback" id="complete-feedback" role="status">${draft.done ? 'Modul ini sudah kamu tandai selesai. Kamu tetap bisa bereksperimen lagi.' : ''}</p>`;

  const $ = (s) => root.querySelector(s);
  mountSketch($('.sketch-host'), draft, save);
  let vectorIndex = 0;
  function showVector() {
    root.querySelectorAll('.vector-item').forEach((item, i) => { item.hidden = i !== vectorIndex; });
    $('#vector-count').textContent = `Vektor ${vectorIndex + 1} / ${ws.vectors.length}`;
    $('[data-ws="previous-vector"]').disabled = vectorIndex === 0;
    $('[data-ws="next-vector"]').disabled = vectorIndex === ws.vectors.length - 1;
  }
  showVector();
  if (draft.answerCorrect && draft.answer) {
    const restored = checkAnswer(draft.answer, draft.unit, expected);
    if (restored.status === 'ok') {
      $('#answer-feedback').textContent = restored.message;
      $('#answer-feedback').className = 'feedback good';
    }
  }

  if (draft.vectorResults) {
    const failing = showVectorResults(draft.vectorResults, { jump: true });
    const fb = $('#vector-feedback');
    fb.textContent = failing
      ? `Perlu diperbaiki: ${failing}.`
      : 'Semua vektor tepat. Ingat: gaya, kecepatan, dan perpindahan adalah besaran yang berbeda walau arahnya bisa sama.';
    fb.className = `feedback ${failing ? 'info' : 'good'}`;
  }

  function drawPreview() {
    const svg = $('.vector-preview svg');
    const arrows = ws.vectors
      .map((v, i) => {
        const dir = draft.vectors[v.key]?.dir;
        if (!dir) return '';
        const [dx, dy] = DIRECTIONS[dir].vec;
        const len = 70;
        const ox = 110 + (i - (ws.vectors.length - 1) / 2) * 10 * Math.abs(dy);
        const oy = 110 + (i - (ws.vectors.length - 1) / 2) * 10 * Math.abs(dx);
        const x2 = ox + dx * len;
        const y2 = oy + dy * len;
        const hx = x2 - dx * 11;
        const hy = y2 - dy * 11;
        const kind = kindOf(v.key);
        return `<g class="vec vec-${kind}"><path class="vec-line${kind === 'disp' ? ' dashed' : ''}" d="M${ox} ${oy}L${hx} ${hy}"/><path class="vec-head" d="M${x2} ${y2}L${hx - dy * 6} ${hy + dx * 6}L${hx + dy * 6} ${hy - dx * 6}Z"/><text class="vec-label" x="${x2 + dx * 14 + (dy ? 10 : 0)}" y="${y2 + dy * 14 + 4 - (dx ? 8 : 0)}" text-anchor="middle">${v.key}</text></g>`;
      })
      .join('');
    svg.innerHTML = `<rect x="96" y="96" width="28" height="28" rx="5" class="preview-body"/>${arrows}`;
  }

  function showVectorResults(results, { jump = false } = {}) {
    for (const v of ws.vectors) {
      const problems = results[v.key];
      const fb = root.querySelector(`[data-vector="${v.key}"] .vec-feedback`);
      if (!problems) { fb.textContent = ''; fb.className = 'vec-feedback'; continue; }
      fb.textContent = problems.length ? `✗ ${problems.join(', ')}` : '✓ tepat';
      fb.className = `vec-feedback ${problems.length ? 'bad' : 'good'}`;
    }
    const failing = failingSummary(ws.vectors, results);
    if (jump && failing) {
      vectorIndex = Math.max(0, ws.vectors.findIndex((v) => results[v.key]?.length));
      showVector();
    }
    return failing;
  }

  function checkVectors() {
    const results = {};
    for (const v of ws.vectors) results[v.key] = vectorProblems(v, draft.vectors[v.key]);
    const anyEmpty = ws.vectors.some((v) => !draft.vectors[v.key]?.dir);
    const allOk = ws.vectors.every((v) => !results[v.key].length);
    draft.vectorsCorrect = allOk;
    draft.vectorResults = results;
    save();
    blip(allOk ? 'ding' : 'soft');
    const failing = showVectorResults(results, { jump: true });
    const fb = $('#vector-feedback');
    fb.textContent = allOk
      ? 'Semua vektor tepat. Ingat: gaya, kecepatan, dan perpindahan adalah besaran yang berbeda walau arahnya bisa sama.'
      : `${anyEmpty ? 'Lengkapi semua vektor terlebih dahulu. ' : ''}Perlu diperbaiki: ${failing}. Bandingkan dengan diagram gaya dan vektor gerak di ruang eksperimen.`;
    fb.className = `feedback ${allOk ? 'good' : 'info'}`;
  }

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.field) draft[t.dataset.field] = t.value;
    else if (t.dataset.mag) (draft.vectors[t.dataset.mag] ??= {}).mag = t.value;
    else return;
    save();
  });

  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.name?.startsWith('dir-')) {
      (draft.vectors[t.name.slice(4)] ??= {}).dir = t.value;
      drawPreview();
    } else if (t.dataset.rubric !== undefined) draft.rubric[t.dataset.rubric] = t.checked;
    else if (t.dataset.field) draft[t.dataset.field] = t.value;
    else return;
    save();
  });

  root.addEventListener('click', (e) => {
    const action = e.target.closest('[data-ws]')?.dataset.ws;
    if (!action) return;
    if (action === 'previous-vector' || action === 'next-vector') {
      vectorIndex = Math.max(0, Math.min(ws.vectors.length - 1, vectorIndex + (action === 'next-vector' ? 1 : -1)));
      showVector();
    } else if (action === 'check-answer') {
      draft.answer = $('#ws-answer').value;
      draft.unit = $('#ws-unit').value;
      draft.attempts = (draft.attempts || 0) + 1;
      const res = checkAnswer(draft.answer, draft.unit, expected);
      draft.answerCorrect = res.status === 'ok';
      save();
      const hint = res.status === 'wrong' && draft.attempts >= 2 ? ` Petunjuk: ${lesson.formula.replace(/&nbsp;/g, ' ')}` : '';
      $('#answer-feedback').innerHTML = res.message + hint;
      $('#answer-feedback').className = `feedback ${res.status === 'ok' ? 'good' : 'info'}`;
      if (res.status === 'ok') {
        blip('ding');
      } else blip('soft');
    } else if (action === 'check-vectors') checkVectors();
    else if (action === 'complete') {
      draft.done = true;
      save();
      $('#complete-feedback').textContent = 'Hebat! Modul ditandai selesai. Progresmu tersimpan di browser ini.';
      blip('ding');
      document.dispatchEvent(new CustomEvent('progress-changed'));
    } else if (action === 'print') window.print();
  });

  drawPreview();
}
