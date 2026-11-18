import { lessons } from '../lessons/index.js';
import { live } from '../lessons/live.js';
import { solve, sample, advance, SLOW_PHASES } from '../physics/models.js';
import { scene } from '../scenes/index.js';
import { compareChart } from '../components/chart.js';
import { forceDiagram } from '../components/fbd.js';
import { mountWorksheet } from '../components/worksheet.js';
import { mountInteraction, editParameter, isOriginalComparison, comparisonValue, sceneCamera } from '../components/interaction.js';
import { reducedMotion } from '../components/fx.js';
import { fmt } from '../format.js';
import * as store from '../state/storage.js';

const STEPS = ['Prediksi', 'Eksperimen', 'Penjelasan', 'Latihan'];
const TASKS = ['Sketsa', 'Vektor', 'Perhitungan', 'Refleksi'];

/** Saved drafts may predate a range change (e.g. a lower maximum lift height); keep them valid. */
function fitFields(lesson, params) {
  let out = { ...params };
  for (const f of lesson.fields) if (!Number.isFinite(out[f.key])) out[f.key] = lesson.preset[f.key];
  // the same validation as an edit: ranges, steps and cross-field limits (e.g. the slope cap)
  for (const f of lesson.fields) out = editParameter(lesson, out, f.key, out[f.key]);
  return out;
}

export function renderWorkspace(main, lesson) {
  const cmp = lesson.compare, draft = store.draft(lesson.id);
  const st = {
    A: fitFields(lesson, { ...lesson.preset, ...draft.params }), B: fitFields(lesson, { ...lesson.preset, ...cmp.B, ...draft.paramsB }),
    step: 1, task: Math.max(0, Math.min(3, Math.floor(Number(draft.task)) || 0)),
    activeCase: draft.activeCase === 'B' ? 'B' : 'A', t: Number(draft.time) || 0, playing: false,
    analysis: 'graph', view: 'single',
  };
  let raf = 0, last = null;
  function recompute() { st.rA = solve(lesson.id, st.A); st.rB = solve(lesson.id, st.B); }
  try { recompute(); } catch { st.A = { ...lesson.preset }; st.B = { ...lesson.preset, ...cmp.B }; recompute(); }
  const total = () => Math.max(st.rA.duration, st.rB.duration);
  st.t = Math.max(0, Math.min(total(), st.t));
  const unlocked = () => draft.revealed || draft.prediction !== undefined;
  const original = () => isOriginalComparison(lesson, st.A, st.B);
  const cases = () => ['A', 'B'].map((c) => ({ p: st[c], r: st[`r${c}`], cls: c.toLowerCase() }));
  const next = lessons[(lessons.indexOf(lesson) + 1) % lessons.length];
  main.classList.add('simulation-page');
  main.innerHTML = `
    <header class="experiment-heading">
      <button class="icon-button" data-action="menu" aria-label="Buka menu" aria-expanded="false" aria-controls="sidebar">☰</button>
      <label class="module-select"><span class="sr-only">Pilih eksperimen</span><select aria-label="Pilih eksperimen">${lessons.map((l) => `<option value="${l.id}" ${l.id === lesson.id ? 'selected' : ''}>${l.number} · ${l.short}</option>`).join('')}</select></label>
      <select class="step-select" aria-label="Langkah belajar">${STEPS.map((s, i) => `<option value="${i}">${s}</option>`).join('')}</select>
      <button class="button ghost settings-button" data-act="settings" aria-label="Atur eksperimen">Atur</button>
      <div class="compact-navigation"><button class="icon-button" data-act="previous" aria-label="Langkah sebelumnya">←</button><span id="step-count" class="sr-only"></span><button class="icon-button" data-act="next" aria-label="Langkah berikutnya">→</button><a class="button primary" id="next-module" href="#sim/${next.id}" hidden aria-label="Eksperimen berikutnya">→</a></div>
    </header>
    <div class="step-content">
      <section class="learning-page prediction-page" data-page="0" aria-labelledby="prediction-title">
        <div class="prediction-copy"><h2 id="prediction-title" tabindex="-1">${cmp.question}</h2><p>${cmp.sub}</p></div>
        <div class="prediction-scenes">${['A', 'B'].map((c) => { const p = c === 'A' ? lesson.preset : { ...lesson.preset, ...cmp.B }; const r = solve(lesson.id, p); return `<figure class="case case-${c.toLowerCase()}"><figcaption><b class="case-letter">${c}</b> ${cmp.tag(p, fmt)}</figcaption><div class="preview-scene stage-layers show-labels show-motion">${scene(lesson.id, p, r, sample(lesson.id, p, r, 0))}</div></figure>`; }).join('')}</div>
        <div class="prediction-answer"><div class="poll-options" role="group" aria-label="Prediksi">${cmp.options.map((o, i) => `<button class="button ghost" data-poll="${i}" aria-pressed="false">${o}</button>`).join('')}</div><p id="prediction-feedback" role="status"></p></div>
      </section>
      <section class="learning-page experiment-page" data-page="1" aria-labelledby="experiment-title" hidden>
        <h2 id="experiment-title" class="sr-only" tabindex="-1">${lesson.title}</h2>
        <div class="scene-view-switch" role="group" aria-label="Tampilan simulasi">${['A', 'B'].map((c) => `<button data-case-select="${c}" data-view="single" aria-pressed="false">${c}</button>`).join('')}<button data-view="compare" aria-pressed="false">A/B</button></div>
        <div class="experiment-body"><div class="experiment-visuals">
          <div class="experiment-scenes">${['A', 'B'].map((c) => `<figure class="case case-${c.toLowerCase()}" data-case-figure="${c}"><figcaption><b class="case-letter">${c}</b><span id="tag-${c}"></span></figcaption><div class="interactive-scene stage-layers show-labels" id="scene-${c}"><div class="scene-art"></div></div><p class="case-result" id="detail-${c}"></p></figure>`).join('')}</div>
          <div class="play-controls"><button class="button primary" data-act="play">Jalankan</button><input type="range" id="timeline" min="0" max="1000" value="0" aria-label="Waktu simulasi"><output id="clock"></output><button class="button ghost" data-act="restart" aria-label="Ulangi gerakan">↺</button></div>
        </div></div>
      </section>
      <section class="learning-page explanation-page" data-page="2" aria-labelledby="explanation-title" hidden>
        <h2 id="explanation-title" class="sr-only" tabindex="-1">Penjelasan</h2>
        <div id="explanation-lock"><p>Prediksi dulu, atau buka penjelasannya sekarang.</p><button class="button primary" data-act="reveal">Tampilkan penjelasan</button></div>
        <div id="explanation-content" hidden><div class="explanation-toolbar"><div class="comparison-equation" id="equation"></div>
          <select class="analysis-select" aria-label="Tampilan penjelasan">${[['graph', 'Grafik'], ['forces', 'Diagram gaya'], ['worked', 'Perhitungan']].map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select><button class="button ghost" data-act="notes">Detail</button></div>
          <div class="analysis-view" id="analysis-view"></div>
        </div>
      </section>
      <section class="learning-page practice-page" data-page="3" aria-labelledby="practice-title" hidden>
        <h2 id="practice-title" tabindex="-1">Lembar belajar · soal asli</h2>
        <nav class="task-nav" aria-label="Bagian latihan">${TASKS.map((s, i) => `<button data-task="${i}" aria-pressed="false">${s}</button>`).join('')}</nav>
        <div class="worksheet-scroll"><div id="lembar"></div></div>
      </section>
    </div>
    <dialog class="workspace-dialog" id="experiment-settings" aria-labelledby="controls-title"><header><h2 id="controls-title"></h2><button class="icon-button" data-close-dialog aria-label="Tutup pengaturan">×</button></header>
      <div class="case-switch" role="group" aria-label="Situasi yang diedit">${['A', 'B'].map((c) => `<button data-case-select="${c}" aria-pressed="false">${c} <span id="summary-${c}"></span></button>`).join('')}</div>
      <p class="interaction-hint">${lesson.interaction.hint}</p><div id="primary-fields"></div>
      <details class="other-parameters"><summary>Besaran lain</summary><div id="secondary-fields"></div></details>
      <div class="overlay-controls"><label><input type="checkbox" data-layer="labels" checked> Label</label><label><input type="checkbox" data-layer="forces"> Gaya</label><label><input type="checkbox" data-layer="motion"> Gerak</label></div>
      <p class="constraint-note">${lesson.id === 'sepeda' ? 'Tinggi bukit ≤ 0,7 × panjang lintasan (sin θ ≤ 0,7, θ ≤ 44,4°).' : lesson.id === 'lift' ? 'Lantai awal harus di atas lantai akhir.' : 'Model ideal · g = 10 m/s²'}</p>
      <button class="button ghost" data-act="preset">Reset A &amp; B</button><p class="error" id="param-error" role="alert"></p>
    </dialog>
    <dialog class="workspace-dialog" id="explanation-notes" aria-labelledby="notes-title"><header><h2 id="notes-title">Penjelasan</h2><button class="icon-button" data-close-dialog aria-label="Tutup penjelasan">×</button></header><p id="eq-caption"></p><p id="verdict"></p><h3>Asumsi model</h3><p>${lesson.assumptions}</p></dialog>`;
  const $ = (selector) => main.querySelector(selector);
  const interactions = {};
  for (const c of ['A', 'B']) interactions[c] = mountInteraction($(`#scene-${c}`), lesson, c, () => st[c], (key, value) => update(c, key, value));
  mountWorksheet($('#lembar'), lesson, draft);

  function persist() {
    Object.assign(draft, { params: { ...st.A }, paramsB: { ...st.B }, activeCase: st.activeCase, time: st.t, task: st.task });
    store.save();
  }
  function renderScenes() {
    for (const c of ['A', 'B']) {
      const state = sample(lesson.id, st[c], st[`r${c}`], st.t);
      $(`#scene-${c} .scene-art`).innerHTML = scene(lesson.id, st[c], st[`r${c}`], state);
      $(`#scene-${c} .scene-art svg`).setAttribute('viewBox', sceneCamera(lesson.id, window.matchMedia('(max-width: 600px)').matches));
      interactions[c].update();
      $(`#tag-${c}`).textContent = cmp.tag(st[c], fmt);
      $(`#summary-${c}`).textContent = cmp.tag(st[c], fmt);
      // while the motion runs: live numbers from the drawn state; at the end: the verdict
      const finished = st.t >= st[`r${c}`].duration - 1e-9 && st.t > 0;
      $(`#detail-${c}`).textContent = finished ? cmp.detail(st[c], st[`r${c}`], fmt) : live[lesson.id](st[c], st[`r${c}`], state, fmt);
      $(`#detail-${c}`).classList.toggle('live', !finished);
    }
    $('#timeline').value = String(Math.round(st.t / total() * 1000));
    // playback always lasts ~5 s of wall time; say how much slower/faster than real time that is
    const rate = total() / 5;
    const pace = Math.abs(rate - 1) < 0.05 ? '' : rate < 1 ? ` · gerak lambat ×${fmt(1 / rate, 0)}` : ` · dipercepat ×${fmt(rate, 0)}`;
    $('#clock').textContent = `${fmt(st.t, total() < 1 ? 3 : 1)} s${pace}`;
    $('[data-act="play"]').textContent = st.playing ? 'Jeda' : st.t >= total() ? 'Putar ulang' : 'Jalankan';
  }
  function field(f) {
    return `<label class="experiment-field"><span>${f.label}</span><span><input type="number" inputmode="decimal" data-param="${f.key}" min="${f.min}" max="${f.max}" step="${f.step}" value="${st[st.activeCase][f.key]}" aria-label="${f.label} ${st.activeCase} dalam ${f.unit}"><small>${f.unit}</small></span></label>`;
  }
  function renderControls() {
    const primary = new Set([cmp.key, ...lesson.interaction.handles]);
    $('#controls-title').textContent = `Edit situasi ${st.activeCase}`;
    $('#primary-fields').innerHTML = lesson.fields.filter((f) => primary.has(f.key)).map(field).join('');
    $('#secondary-fields').innerHTML = lesson.fields.filter((f) => !primary.has(f.key)).map(field).join('');
    $('.other-parameters').hidden = !lesson.fields.some((f) => !primary.has(f.key));
    for (const b of main.querySelectorAll('[data-case-select]')) b.setAttribute('aria-pressed', String(b.dataset.caseSelect === st.activeCase && (!b.dataset.view || st.view === 'single')));
    $('[data-view="compare"]').setAttribute('aria-pressed', String(st.view === 'compare'));
    main.classList.toggle('compare-view', st.view === 'compare');
    for (const figure of main.querySelectorAll('[data-case-figure]')) figure.classList.toggle('selected-case', figure.dataset.caseFigure === st.activeCase);
  }
  function pause() { st.playing = false; cancelAnimationFrame(raf); last = null; }
  function update(c, key, value) {
    try {
      const p = editParameter(lesson, st[c], key, value), result = solve(lesson.id, p);
      pause(); st[c] = p; st[`r${c}`] = result; st.t = 0;
      if (st.activeCase !== c) { st.activeCase = c; renderControls(); }
      for (const input of main.querySelectorAll('[data-param]')) if (input !== document.activeElement) input.value = st[c][input.dataset.param];
      $('#param-error').textContent = '';
      renderScenes(); persist();
    } catch (err) { $('#param-error').textContent = err.message; }
  }
  function renderPrediction() {
    for (const b of main.querySelectorAll('[data-poll]')) b.setAttribute('aria-pressed', String(Number(b.dataset.poll) === draft.prediction));
    $('#prediction-feedback').textContent = draft.prediction === undefined ? 'Tidak harus benar. Coba dan bandingkan hasilnya.' : `Prediksimu: ${cmp.options[draft.prediction]}. Lanjutkan ke eksperimen untuk mengujinya.`;
  }
  function renderExplanation() {
    $('#explanation-lock').hidden = unlocked(); $('#explanation-content').hidden = !unlocked();
    if (!unlocked()) return;
    // Preset prose contains fixed ratios. Custom setups use independent, exact results.
    const a = comparisonValue(lesson.id, st.rA), b = comparisonValue(lesson.id, st.rB);
    $('#equation').innerHTML = original() ? cmp.equation(st.A, st.rA, st.B, st.rB, fmt) : `<span class="a">A: ${fmt(a.value)} ${a.unit}</span><span class="b">B: ${fmt(b.value)} ${b.unit}</span>`;
    $('#eq-caption').innerHTML = original() ? cmp.caption(st.A, st.rA, st.B, st.rB, fmt) : `Setup pilihanmu · ${lesson.formula}`;
    $('#verdict').textContent = original() ? `${draft.prediction === undefined ? '' : draft.prediction === cmp.correct ? 'Prediksimu tepat. ' : 'Bandingkan dengan prediksimu. '}${cmp.verdict(st.A, st.rA, st.B, st.rB, fmt)}` : `A: ${cmp.detail(st.A, st.rA, fmt)}. B: ${cmp.detail(st.B, st.rB, fmt)}. Prediksi di awal berlaku untuk soal awal.`;
    $('.analysis-select').value = st.analysis;
    const portrait = window.matchMedia('(max-width: 600px)').matches;
    $('#analysis-view').innerHTML = st.analysis === 'graph' ? compareChart(lesson, cases(), total(), st.t, { reveal: true, tall: portrait }) : st.analysis === 'forces' ? forceDiagram(lesson, cases(), { stacked: portrait }) : `<h3>Perhitungan situasi A</h3><ol class="worked">${lesson.worked(st.A, st.rA, fmt).map((line) => `<li>${line}</li>`).join('')}</ol>`;
  }
  function renderTask() {
    const blocks = [...$('#lembar').querySelectorAll('.ws-block')];
    blocks.forEach((block, i) => { block.hidden = (i < 3 ? i : 3) !== st.task; });
    $('#lembar .worksheet-actions').hidden = st.task !== 3;
    $('#complete-feedback').hidden = st.task !== 3;
    for (const b of main.querySelectorAll('[data-task]')) b.setAttribute('aria-pressed', String(Number(b.dataset.task) === st.task));
    $('.worksheet-scroll').scrollTop = 0;
  }
  function renderNavigation() {
    for (const page of main.querySelectorAll('[data-page]')) page.hidden = Number(page.dataset.page) !== st.step;
    $('.step-select').value = String(st.step);
    $('.settings-button').hidden = st.step !== 1;
    const end = st.step === 3 && st.task === 3;
    $('[data-act="previous"]').disabled = st.step === 0;
    $('[data-act="next"]').hidden = end; $('#next-module').hidden = !end;
    $('#step-count').textContent = st.step === 3 ? `Latihan ${st.task + 1} / 4` : `${st.step + 1} / 4`;
  }
  function go(step, focus = true) {
    pause(); Object.values(interactions).forEach((i) => i.cancel());
    st.step = Math.max(0, Math.min(3, step));
    renderNavigation(); renderTask(); renderScenes();
    if (st.step === 2) renderExplanation();
    persist();
    if (focus) $(`[data-page="${st.step}"] h2`).focus({ preventScroll: true });
  }
  function loop(now) {
    if (!main.isConnected || !st.playing) return;
    // ~5 s of wall time for the whole run, but very short events (an overspeed trip lasting
    // 0,07 s of a 100 s descent) play at 1/50 of real time so they can actually be seen
    const brief = ['A', 'B'].some((c) => SLOW_PHASES.has(sample(lesson.id, st[c], st[`r${c}`], st.t).phase));
    const rate = brief ? Math.min(total() / 5, 0.02) : total() / 5;
    if (last !== null) st.t = advance(st.t, (now - last) / 1000, rate, total());
    last = now;
    if (st.t >= total()) { pause(); persist(); }
    renderScenes();
    if (st.playing) raf = requestAnimationFrame(loop);
  }
  main.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.task !== undefined) { st.task = Number(b.dataset.task); renderTask(); renderNavigation(); persist(); }
    else if (b.dataset.poll !== undefined) { draft.prediction = Number(b.dataset.poll); draft.revealed = true; store.save(); renderPrediction(); }
    else if (b.dataset.caseSelect) { st.activeCase = b.dataset.caseSelect; if (b.dataset.view) st.view = b.dataset.view; renderControls(); persist(); }
    else if (b.dataset.view) { st.view = b.dataset.view; renderControls(); }
    else if (b.dataset.closeDialog !== undefined) b.closest('dialog').close();
    else if (b.dataset.act === 'settings') { pause(); renderScenes(); $('#experiment-settings').showModal(); }
    else if (b.dataset.act === 'notes') $('#explanation-notes').showModal();
    else if (b.dataset.act === 'reveal') { draft.revealed = true; store.save(); renderExplanation(); }
    else if (b.dataset.act === 'previous') { if (st.step === 3 && st.task > 0) { st.task--; renderTask(); renderNavigation(); persist(); } else go(st.step - 1); }
    else if (b.dataset.act === 'next') { if (st.step === 3 && st.task < 3) { st.task++; renderTask(); renderNavigation(); persist(); } else go(st.step + 1); }
    else if (b.dataset.act === 'play') {
      if (st.playing) { pause(); renderScenes(); persist(); } else if (reducedMotion()) { st.t = total(); renderScenes(); persist(); } else { if (st.t >= total()) st.t = 0; st.playing = true; last = null; raf = requestAnimationFrame(loop); }
    } else if (b.dataset.act === 'restart') { pause(); st.t = 0; renderScenes(); persist(); }
    else if (b.dataset.act === 'preset') {
      pause(); Object.values(interactions).forEach((i) => i.cancel()); st.A = { ...lesson.preset }; st.B = { ...lesson.preset, ...cmp.B }; st.t = 0;
      recompute(); renderControls(); renderScenes(); persist(); $('#param-error').textContent = '';
    }
  });
  main.addEventListener('change', (e) => {
    const t = e.target;
    if (t.matches('.module-select select')) location.hash = `sim/${t.value}`;
    if (t.matches('.step-select')) go(Number(t.value));
    if (t.matches('.analysis-select')) { st.analysis = t.value; renderExplanation(); }
    if (t.dataset.param) { update(st.activeCase, t.dataset.param, t.value === '' ? NaN : Number(t.value)); t.value = st[st.activeCase][t.dataset.param]; }
    if (t.dataset.layer) for (const host of main.querySelectorAll('.interactive-scene')) host.classList.toggle(`show-${t.dataset.layer}`, t.checked);
  });
  main.addEventListener('input', (e) => {
    const input = e.target;
    if (input.dataset.param && input.value !== '' && Number.isFinite(input.valueAsNumber)) update(st.activeCase, input.dataset.param, input.valueAsNumber);
  });
  const cameraMedia = window.matchMedia('(max-width: 600px)');
  function resizeViews() { renderScenes(); if (st.step === 2) renderExplanation(); }
  cameraMedia.addEventListener('change', resizeViews);
  $('#timeline').addEventListener('input', (e) => { pause(); st.t = Number(e.target.value) / 1000 * total(); renderScenes(); persist(); });
  renderControls(); renderPrediction(); go(1, false);
  return () => { pause(); cameraMedia.removeEventListener('change', resizeViews); Object.values(interactions).forEach((i) => i.cancel()); persist(); };
}
