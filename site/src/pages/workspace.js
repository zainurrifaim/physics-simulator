import { lessons } from '../lessons/index.js';
import { solve, sample, advance } from '../physics/models.js';
import { scene } from '../scenes/index.js';
import { chart } from '../components/chart.js';
import { mountStory } from '../components/story.js';
import { mountWorksheet } from '../components/worksheet.js';
import { icon } from '../components/icons.js';
import { fmt, esc, parseNumber } from '../format.js';
import * as store from '../state/storage.js';

const SPEEDS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20, 50];

/** Playback speed that makes the motion last roughly 6 seconds on screen. */
function defaultSpeed(duration) {
  const target = duration / 6;
  return SPEEDS.reduce((best, s) => (Math.abs(Math.log(s / target)) < Math.abs(Math.log(best / target)) ? s : best), 1);
}

export function renderWorkspace(main, lesson) {
  const draft = store.draft(lesson.id);
  const state = {
    params: { ...lesson.preset, ...(draft.params || {}) },
    result: null,
    t: 0,
    playing: false,
    speed: 1,
    layers: { labels: true, forces: true, motion: false, energy: true },
    tab: 'grafik',
    error: '',
  };
  try {
    state.result = solve(lesson.id, state.params);
  } catch {
    state.params = { ...lesson.preset };
    state.result = solve(lesson.id, state.params);
  }
  state.speed = defaultSpeed(state.result.duration);
  const next = lessons[(lessons.indexOf(lesson) + 1) % lessons.length];

  main.innerHTML = `
    <div class="workspace-heading">
      <div>
        <a class="back-link" href="#home">← Semua eksperimen</a>
        <div class="eyebrow">EKSPERIMEN ${lesson.number} <span class="dot-sep">/</span> ${lesson.category.toUpperCase()}</div>
        <h1>${lesson.title}</h1>
        <p class="lead">${lesson.hook}</p>
      </div>
      <span class="workspace-number" aria-hidden="true">${lesson.number}</span>
    </div>

    <ol class="learning-steps" aria-label="Alur belajar">
      <li><button type="button" data-scroll="cerita"><span>01</span> Cerita</button></li>
      <li><button type="button" data-scroll="prediksi"><span>02</span> Prediksi</button></li>
      <li><button type="button" data-scroll="lab"><span>03</span> Eksperimen</button></li>
      <li><button type="button" data-scroll="analisis"><span>04</span> Analisis</button></li>
      <li><button type="button" data-scroll="lembar"><span>05</span> Refleksi</button></li>
    </ol>

    <section id="cerita" class="story-wrap" aria-label="Cerita animasi"></section>

    <section id="prediksi" class="panel prediction-panel">
      <div class="prediction-copy">
        <span class="eyebrow">SEBELUM MENCOBA</span>
        <h2>${lesson.prediction.question}</h2>
      </div>
      <div class="prediction-form">
        <div class="choice-row" role="radiogroup" aria-label="Pilihan prediksi">
          ${lesson.prediction.options
            .map((o, i) => `<label class="choice"><input type="radio" name="prediction" value="${i}" ${draft.prediction === i ? 'checked' : ''}><span>${o}</span></label>`)
            .join('')}
        </div>
        <label class="sr-only" for="prediction-reason">Alasan prediksi</label>
        <input id="prediction-reason" class="text-input" placeholder="Alasanku… (boleh singkat)" value="${esc(draft.predictionReason)}">
        <div class="prediction-actions">
          <button class="button secondary" data-action="predict">${icon('check')} Simpan prediksi</button>
          <p class="feedback" id="prediction-feedback" role="status"></p>
        </div>
      </div>
    </section>

    <div id="lab" class="lab-grid">
      <section class="panel experiment-panel" aria-label="Ruang eksperimen">
        <div class="panel-top"><span class="panel-label"><i></i> RUANG EKSPERIMEN</span><span class="unit-tag">g = 10 m/s²</span></div>
        <div class="stage ${lesson.color}">
          <div class="stage-top"><span id="state-label">SIAP DIJALANKAN</span><span id="stage-time"></span></div>
          <div id="scene" class="stage-layers"></div>
          <div id="energy-bars" class="energy-bars" aria-hidden="true"></div>
        </div>
        <div class="playback">
          <button class="play-button" data-action="play" aria-label="Jalankan simulasi">${icon('play')}</button>
          <button class="icon-button" data-action="rewind" aria-label="Kembali ke awal gerak">${icon('reset')}</button>
          <input type="range" id="timeline" min="0" max="1000" step="1" value="0" aria-label="Waktu simulasi">
          <output id="time-output"></output>
          <label class="speed"><span class="sr-only">Kecepatan pemutaran</span>
            <select id="speed">${SPEEDS.map((s) => `<option value="${s}">${fmt(s, 2)}×</option>`).join('')}</select>
          </label>
        </div>
        <div class="layer-toggles" role="group" aria-label="Tampilan">
          <label><input type="checkbox" data-layer="labels"> Label besaran</label>
          <label><input type="checkbox" data-layer="forces"> <i class="key key-force"></i> Diagram gaya</label>
          <label><input type="checkbox" data-layer="motion"> <i class="key key-velocity"></i><i class="key key-disp"></i> Vektor gerak</label>
          <label><input type="checkbox" data-layer="energy"> Batang energi</label>
        </div>
        <p class="scene-caption">${icon('help')} Jingga = gaya, biru = kecepatan, ungu putus-putus = perpindahan. Panjang panah skematis. Kecepatan putar hanya mengubah tampilan, bukan hasil fisika.</p>
      </section>

      <aside class="panel controls-panel" aria-label="Parameter eksperimen">
        <div class="controls-heading">
          <div><span class="eyebrow">COBA UBAH</span><h2>Parameter</h2></div>
          <button class="icon-button" data-action="preset" aria-label="Kembali ke soal asli" title="Kembali ke soal asli">${icon('reset')}</button>
        </div>
        <div id="parameters">${lesson.fields.map((fd) => field(fd, state.params[fd.key])).join('')}</div>
        <p class="error" id="param-error" role="alert"></p>
        <button class="preset-button" data-action="preset">${icon('reset')} Kembali ke soal asli</button>
        <details class="problem-text"><summary>Soal asli</summary><p>${lesson.problem}</p></details>
        <p class="parameter-tip">Ubah satu besaran saja, lalu jalankan lagi. Apa yang berubah?</p>
      </aside>
    </div>

    <div id="analisis" class="analysis-grid">
      <section class="panel analysis-panel">
        <div class="tabs" role="tablist" aria-label="Analisis">
          <button role="tab" id="tab-grafik" data-tab="grafik" aria-controls="analysis-body">Grafik</button>
          <button role="tab" id="tab-pembahasan" data-tab="pembahasan" aria-controls="analysis-body">Pembahasan</button>
        </div>
        <div id="analysis-body" role="tabpanel"></div>
      </section>
      <aside class="panel insight-panel">
        <span class="eyebrow">DARI SITUASI KE PERSAMAAN</span>
        <div class="formula">${lesson.formula}</div>
        <div id="result-summary"></div>
        <details class="assumptions"><summary>Asumsi model</summary><p>${lesson.assumptions}</p></details>
      </aside>
    </div>

    <section id="lembar" class="panel worksheet-panel"></section>

    <div class="next-module">
      <span>Sudah menemukan sesuatu yang baru?</span>
      <a class="button secondary" href="#sim/${next.id}">Eksperimen ${next.number}: ${next.short} ${icon('arrow')}</a>
    </div>`;

  const $ = (sel) => main.querySelector(sel);
  const sceneEl = $('#scene');
  const timeline = $('#timeline');
  const speedSel = $('#speed');
  speedSel.value = String(state.speed);
  main.querySelectorAll('[data-layer]').forEach((cb) => (cb.checked = state.layers[cb.dataset.layer]));

  // ---- story ----------------------------------------------------------
  const storyRoot = $('#cerita');
  let story = null;
  function showStory() {
    story = mountStory(storyRoot, lesson, {
      onDone: () => {
        draft.storySeen = true;
        store.save();
        collapseStory();
        $('#prediksi').scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    });
  }
  function collapseStory() {
    story?.destroy();
    story = null;
    storyRoot.innerHTML = `<button class="story-replay" data-action="story">${icon('film')}<span><b>Putar cerita animasi</b><small>Ringkasan soal dalam ${lesson.story(lesson.preset, solve(lesson.id, lesson.preset), fmt).length} langkah singkat</small></span>${icon('chevron')}</button>`;
  }
  if (draft.storySeen) collapseStory();
  else showStory();

  // ---- simulation rendering -------------------------------------------
  function layerClasses() {
    return Object.entries(state.layers)
      .filter(([k, v]) => v && k !== 'energy')
      .map(([k]) => `show-${k}`)
      .join(' ');
  }

  function renderFrame() {
    const r = state.result;
    const s = sample(lesson.id, state.params, r, state.t);
    sceneEl.className = `stage-layers ${layerClasses()}`;
    sceneEl.innerHTML = scene(lesson.id, state.params, r, s);
    timeline.value = String(Math.round((state.t / r.duration) * 1000));
    timeline.setAttribute('aria-valuetext', `${fmt(state.t, 3)} detik dari ${fmt(r.duration, 3)} detik`);
    $('#time-output').textContent = `${fmt(state.t, r.duration < 1 ? 3 : 1)} / ${fmt(r.duration, r.duration < 1 ? 3 : 1)} s`;
    $('#stage-time').textContent = `t = ${fmt(state.t, r.duration < 1 ? 3 : 2)} s`;
    $('#state-label').textContent = state.playing ? 'BERJALAN' : state.t >= r.duration ? 'SELESAI' : state.t > 0 ? 'DIJEDA' : 'SIAP DIJALANKAN';
    const play = $('[data-action="play"]');
    play.innerHTML = icon(state.playing ? 'pause' : 'play');
    play.setAttribute('aria-label', state.playing ? 'Jeda simulasi' : 'Jalankan simulasi');
    renderEnergy(s);
    if (state.tab === 'grafik') updateChart();
  }

  function renderEnergy(s) {
    const box = $('#energy-bars');
    box.hidden = !state.layers.energy;
    if (!state.layers.energy) return;
    const cfg = lesson.chart;
    const series = cfg.series(state.params, state.result);
    const end = sample(lesson.id, state.params, state.result, state.result.duration);
    const start = sample(lesson.id, state.params, state.result, 0);
    const max = Math.max(...series.flatMap((se) => [se.fn(start), se.fn(end)]), ...(cfg.lines ? cfg.lines(state.params, state.result).map((l) => l.value) : []), 1e-9);
    box.innerHTML = series
      .map((se) => {
        const v = se.fn(s);
        return `<div class="ebar"><span class="ebar-label">${se.label}</span><span class="ebar-track"><i class="series-${se.kind}" style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%"></i></span><b>${fmt(v)} ${cfg.yUnit}</b></div>`;
      })
      .join('');
  }

  function updateChart() {
    const body = $('#analysis-body');
    body.innerHTML = chart(lesson, state.params, state.result, state.t) + `<p class="chart-note">${lesson.chart.note}</p>`;
  }

  function renderAnalysis() {
    main.querySelectorAll('[data-tab]').forEach((b) => {
      const on = b.dataset.tab === state.tab;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    $('#analysis-body').setAttribute('aria-labelledby', `tab-${state.tab}`);
    if (state.tab === 'grafik') {
      updateChart();
      return;
    }
    if (!draft.revealed) {
      $('#analysis-body').innerHTML = `<div class="locked"><span class="eyebrow">TUNGGU SEBENTAR</span><h3>Buat prediksi dulu, lalu jalankan eksperimen.</h3><p>Pembahasan langkah demi langkah terbuka setelah kamu menyimpan prediksi — atau kapan pun kamu siap.</p><button class="button secondary" data-action="reveal">Buka pembahasan</button></div>`;
      return;
    }
    const lines = lesson.worked(state.params, state.result, fmt);
    $('#analysis-body').innerHTML = `<span class="eyebrow">LANGKAH DEMI LANGKAH · NILAI SAAT INI</span><ol class="worked">${lines.map((l) => `<li>${l}</li>`).join('')}</ol><p class="small muted">Perhitungan memakai nilai penuh; angka tampilan dibulatkan. Ubah parameter dan lihat setiap langkah ikut berubah.</p>`;
  }

  function renderSummary() {
    const box = $('#result-summary');
    if (!draft.revealed) {
      box.innerHTML = `<p class="muted">Simpan prediksimu, jalankan eksperimen, lalu bandingkan dengan hasil perhitungan.</p><button class="text-button" data-action="reveal">Lihat hasil ${icon('arrow')}</button>`;
      return;
    }
    const { message, metrics } = lesson.summary(state.params, state.result, fmt);
    box.innerHTML = `<div class="outcome ${state.result.ok ? 'ok' : 'caution'}">${icon(state.result.ok ? 'check' : 'help')}<span>${message}</span></div>
      <dl class="metrics">${metrics.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
  }

  function renderPredictionFeedback() {
    const fb = $('#prediction-feedback');
    if (draft.prediction === undefined) {
      fb.textContent = '';
      return;
    }
    const chosen = lesson.prediction.options[draft.prediction];
    if (!draft.revealed) {
      fb.textContent = `Prediksi tersimpan: “${chosen}”. Sekarang uji di ruang eksperimen.`;
      fb.className = 'feedback';
      return;
    }
    const right = draft.prediction === lesson.prediction.correct;
    fb.textContent = right
      ? `Prediksimu “${chosen}” sesuai dengan hasil soal asli. Bisakah kamu menjelaskan mengapa?`
      : `Prediksimu “${chosen}”; hasil soal asli: “${lesson.prediction.options[lesson.prediction.correct]}”. Tidak apa-apa — cari tahu penyebabnya di eksperimen.`;
    fb.className = `feedback ${right ? 'good' : 'info'}`;
  }

  function refreshAll() {
    renderFrame();
    renderAnalysis();
    renderSummary();
    renderPredictionFeedback();
  }

  // ---- playback ---------------------------------------------------------
  let raf = 0;
  let lastNow = null;
  function loop(now) {
    if (!main.isConnected) return;
    if (!state.playing) return;
    if (lastNow !== null) {
      state.t = advance(state.t, (now - lastNow) / 1000, state.speed, state.result.duration);
    }
    lastNow = now;
    if (state.t >= state.result.duration) state.playing = false;
    renderFrame();
    if (state.playing) raf = requestAnimationFrame(loop);
  }
  function play() {
    if (state.t >= state.result.duration) state.t = 0;
    state.playing = true;
    lastNow = null;
    story?.pause();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function pause() {
    state.playing = false;
    cancelAnimationFrame(raf);
    renderFrame();
  }

  // ---- parameters -------------------------------------------------------
  function applyParams(changedKey, value) {
    const candidate = { ...state.params, [changedKey]: value };
    try {
      const r = solve(lesson.id, candidate);
      state.params = candidate;
      state.result = r;
      state.error = '';
      state.t = Math.min(state.t, r.duration);
      draft.params = { ...state.params };
      store.save();
    } catch (err) {
      state.error = err.message;
    }
    $('#param-error').textContent = state.error;
    refreshAll();
  }

  function syncInputs() {
    for (const fd of lesson.fields) {
      main.querySelectorAll(`[data-param="${fd.key}"]`).forEach((inp) => (inp.value = String(state.params[fd.key])));
    }
  }

  main.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.param) {
      const fd = lesson.fields.find((f) => f.key === t.dataset.param);
      const v = t.type === 'range' ? Number(t.value) : parseNumber(t.value);
      if (!Number.isFinite(v)) return;
      const clamped = Math.max(fd.min, Math.min(fd.max, v));
      if (t.type === 'range') main.querySelector(`#num-${fd.key}`).value = String(clamped);
      else if (clamped === v) main.querySelector(`#rng-${fd.key}`).value = String(clamped);
      applyParams(fd.key, clamped);
    } else if (t.id === 'timeline') {
      pause();
      state.t = (Number(t.value) / 1000) * state.result.duration;
      renderFrame();
    } else if (t.id === 'prediction-reason') {
      draft.predictionReason = t.value;
      store.save();
    }
  });

  main.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.param && t.type === 'number') syncInputs();
    else if (t.id === 'speed') state.speed = Number(t.value);
    else if (t.dataset.layer) {
      state.layers[t.dataset.layer] = t.checked;
      renderFrame();
    } else if (t.name === 'prediction') {
      draft.prediction = Number(t.value);
    }
  });

  main.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action], [data-tab], [data-scroll]');
    if (!btn) return;
    if (btn.dataset.scroll) {
      main.querySelector(`#${btn.dataset.scroll}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (btn.dataset.tab) {
      state.tab = btn.dataset.tab;
      renderAnalysis();
      return;
    }
    switch (btn.dataset.action) {
      case 'play':
        state.playing ? pause() : play();
        break;
      case 'rewind':
        pause();
        state.t = 0;
        renderFrame();
        break;
      case 'preset':
        pause();
        state.params = { ...lesson.preset };
        state.result = solve(lesson.id, state.params);
        state.t = 0;
        state.error = '';
        state.speed = defaultSpeed(state.result.duration);
        speedSel.value = String(state.speed);
        $('#param-error').textContent = '';
        delete draft.params;
        store.save();
        syncInputs();
        refreshAll();
        break;
      case 'predict': {
        const chosen = main.querySelector('input[name="prediction"]:checked');
        if (!chosen) {
          $('#prediction-feedback').textContent = 'Pilih salah satu prediksi terlebih dahulu.';
          $('#prediction-feedback').className = 'feedback info';
          return;
        }
        draft.prediction = Number(chosen.value);
        draft.predictionReason = $('#prediction-reason').value;
        store.save();
        renderPredictionFeedback();
        $('#lab').scrollIntoView({ behavior: 'smooth', block: 'start' });
        break;
      }
      case 'reveal':
        draft.revealed = true;
        store.save();
        state.tab = 'pembahasan';
        refreshAll();
        break;
      case 'story':
        showStory();
        storyRoot.querySelector('.story')?.focus({ preventScroll: true });
        break;
    }
  });

  // reveal automatically once the learner has predicted and watched the motion to the end
  const revealWatcher = setInterval(() => {
    if (!main.isConnected) return clearInterval(revealWatcher);
    if (!draft.revealed && draft.prediction !== undefined && state.t >= state.result.duration && !state.playing) {
      draft.revealed = true;
      store.save();
      renderAnalysis();
      renderSummary();
      renderPredictionFeedback();
    }
  }, 400);

  // keyboard: arrow keys move between tabs
  main.querySelector('.tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    state.tab = state.tab === 'grafik' ? 'pembahasan' : 'grafik';
    renderAnalysis();
    main.querySelector(`#tab-${state.tab}`).focus();
  });

  mountWorksheet($('#lembar'), lesson, draft);
  refreshAll();

  return () => {
    cancelAnimationFrame(raf);
    story?.destroy();
    clearInterval(revealWatcher);
  };
}

function field(fd, value) {
  return `<div class="parameter">
    <div class="parameter-heading">
      <label for="rng-${fd.key}">${fd.label} <span class="symbol">${fd.symbol}</span></label>
      <span class="number-wrap"><input type="number" id="num-${fd.key}" data-param="${fd.key}" min="${fd.min}" max="${fd.max}" step="${fd.step}" value="${value}" aria-label="${fd.label} dalam ${fd.unit}"><span class="unit">${fd.unit}</span></span>
    </div>
    <input type="range" id="rng-${fd.key}" data-param="${fd.key}" min="${fd.min}" max="${fd.max}" step="${fd.step}" value="${value}">
    <div class="range-labels"><span>${fmt(fd.min)}</span><span>${fmt(fd.max)} ${fd.unit}</span></div>
  </div>`;
}
