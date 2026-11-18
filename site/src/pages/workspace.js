// Module page: one "poster" in the style of short physics reels — a question,
// two cases A (original problem, blue) and B (contrast, red) animated on one
// clock, a colour-coded equation, a force diagram and an A/B graph.
import { lessons } from '../lessons/index.js';
import { solve, sample, advance } from '../physics/models.js';
import { scene } from '../scenes/index.js';
import { compareChart } from '../components/chart.js';
import { forceDiagram } from '../components/fbd.js';
import { mountWorksheet } from '../components/worksheet.js';
import { icon } from '../components/icons.js';
import { blip, confetti, soundOn, setSound, reducedMotion } from '../components/fx.js';
import { fmt, parseNumber } from '../format.js';
import * as store from '../state/storage.js';

const SPEEDS = [0.01, 0.02, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 20];
const autoSpeed = (total) =>
  SPEEDS.reduce((best, s) => (Math.abs(Math.log(s / (total / 5))) < Math.abs(Math.log(best / (total / 5))) ? s : best), 1);

export function renderWorkspace(main, lesson) {
  const cmp = lesson.compare;
  const draft = store.draft(lesson.id);
  const st = {
    A: { ...lesson.preset, ...(draft.params || {}) },
    B: { ...lesson.preset, ...cmp.B, ...(draft.paramsB || {}) },
    rA: null,
    rB: null,
    t: 0,
    playing: false,
    speed: 1,
  };
  const recompute = () => {
    st.rA = solve(lesson.id, st.A);
    st.rB = solve(lesson.id, st.B);
  };
  try {
    recompute();
  } catch {
    st.A = { ...lesson.preset };
    st.B = { ...lesson.preset, ...cmp.B };
    recompute();
  }
  const total = () => Math.max(st.rA.duration, st.rB.duration);
  st.speed = autoSpeed(total());
  const revealed = () => draft.revealed || draft.prediction !== undefined;
  const next = lessons[(lessons.indexOf(lesson) + 1) % lessons.length];
  const keyField = lesson.fields.find((fd) => fd.key === cmp.key);
  const otherFields = lesson.fields.filter((fd) => fd.key !== cmp.key);

  main.innerHTML = `
    <div class="module-head">
      <a class="back-link" href="#home">← Semua eksperimen</a>
      <span class="eyebrow">EKSPERIMEN ${lesson.number} · ${lesson.category.toUpperCase()}</span>
    </div>

    <article class="poster" aria-labelledby="poster-q">
      <header class="poster-head">
        <h1 id="poster-q" class="poster-q">${cmp.question}</h1>
        <p class="poster-sub">${cmp.sub}</p>
        <div class="poster-poll" role="radiogroup" aria-label="Tebakanmu">
          ${cmp.options.map((o, i) => `<button role="radio" aria-checked="false" data-poll="${i}">${o}</button>`).join('')}
        </div>
        <p class="poster-note" role="status"></p>
      </header>

      <div class="poster-cases">
        ${['a', 'b']
          .map(
            (c) => `<figure class="case case-${c}">
              <figcaption><span class="case-letter">${c.toUpperCase()}</span><span class="case-tag" id="tag-${c}"></span>${c === 'a' ? '<span class="case-orig">soal asli</span>' : ''}</figcaption>
              <div class="case-scene stage-layers" id="scene-${c}"></div>
              <p class="case-detail" id="detail-${c}"></p>
            </figure>`
          )
          .join('')}
      </div>

      <div class="poster-play">
        <button class="play-btn" data-act="play" aria-label="Putar">${icon('play')}</button>
        <input type="range" id="timeline" min="0" max="1000" value="0" aria-label="Waktu">
        <output id="clock"></output>
        <button class="mini-btn" data-act="sound" aria-label="Suara"></button>
      </div>

      <div class="poster-reveal" id="reveal">
        <div class="poster-eq" id="equation"></div>
        <p class="poster-eq-cap" id="eq-caption"></p>
        <div class="poster-bottom">
          <figure><figcaption>${cmp.diagram}</figcaption><div id="fbd"></div></figure>
          <figure><figcaption>Grafik ${cmp.graph.label}</figcaption><div id="graph"></div></figure>
        </div>
        <p class="poster-verdict" id="verdict"></p>
        <div class="lock" id="lock">
          <span class="lock-arrow" aria-hidden="true">↑</span>
          <b>Tebak dulu, lalu tonton.</b>
          <button class="text-button" data-act="reveal">Lewati, tunjukkan jawabannya</button>
        </div>
      </div>

      <footer class="poster-foot"><span class="poster-brand">${icon('atom')} ruangfisika</span><span>Model ideal · g = 10 m/s²</span></footer>
    </article>

    <section class="panel tweak" aria-labelledby="tweak-title">
      <div class="tweak-head">
        <div><span class="eyebrow">COBA SENDIRI</span><h2 id="tweak-title">Ubah A dan B, lalu putar lagi</h2></div>
        <button class="button ghost" data-act="preset">${icon('reset')} Kembali ke awal</button>
      </div>
      <div class="tweak-cases">
        ${['a', 'b'].map((c) => `<div class="tweak-case tweak-${c}"><span class="case-letter">${c.toUpperCase()}</span>${field(keyField, c, (c === 'a' ? st.A : st.B)[keyField.key])}</div>`).join('')}
      </div>
      <details class="tweak-more">
        <summary>Besaran lain (berlaku untuk A dan B)</summary>
        ${otherFields.map((fd) => field(fd, 'ab', st.A[fd.key])).join('')}
      </details>
      <p class="error" id="param-error" role="alert"></p>
    </section>

    <section class="panel solution" id="solution"></section>

    <section id="lembar" class="panel worksheet-panel"></section>

    <div class="next-module">
      <span>Sudah menemukan sesuatu yang baru?</span>
      <a class="button secondary" href="#sim/${next.id}">Eksperimen ${next.number}: ${next.short} ${icon('arrow')}</a>
    </div>`;

  const $ = (s) => main.querySelector(s);
  const cases = () => [
    { p: st.A, r: st.rA, cls: 'a' },
    { p: st.B, r: st.rB, cls: 'b' },
  ];

  // ---------- rendering ----------
  function renderScenes() {
    for (const c of cases()) {
      const s = sample(lesson.id, c.p, c.r, st.t);
      $(`#scene-${c.cls}`).innerHTML = scene(lesson.id, c.p, c.r, s);
    }
    const T = total();
    $('#timeline').value = String(Math.round((st.t / T) * 1000));
    $('#clock').textContent = `t = ${fmt(st.t, T < 1 ? 3 : 1)} s`;
    const play = $('[data-act="play"]');
    play.innerHTML = icon(st.playing ? 'pause' : st.t >= T ? 'reset' : 'play');
    play.setAttribute('aria-label', st.playing ? 'Jeda' : st.t >= T ? 'Putar ulang' : 'Putar');
    if (revealed()) $('#graph').innerHTML = compareChart(lesson, cases(), T, st.t, { reveal: !st.playing && (st.t >= T || st.t === 0) });
  }

  function renderStatic() {
    $('#tag-a').textContent = cmp.tag(st.A, fmt);
    $('#tag-b').textContent = cmp.tag(st.B, fmt);
    $('#detail-a').textContent = cmp.detail(st.A, st.rA, fmt);
    $('#detail-b').textContent = cmp.detail(st.B, st.rB, fmt);
    $('#equation').innerHTML = cmp.equation(st.A, st.rA, st.B, st.rB, fmt);
    $('#eq-caption').innerHTML = cmp.caption(st.A, st.rA, st.B, st.rB, fmt);
    $('#fbd').innerHTML = forceDiagram(lesson, cases());
    $('#graph').innerHTML = compareChart(lesson, cases(), total(), st.t, { reveal: true });
    renderPoll();
    renderSolution();
  }

  function renderPoll() {
    const chosen = draft.prediction;
    main.querySelectorAll('[data-poll]').forEach((b) => {
      const i = Number(b.dataset.poll);
      b.setAttribute('aria-checked', String(i === chosen));
      b.classList.toggle('chosen', i === chosen);
      b.classList.toggle('right', revealed() && !revealAtEnd && i === cmp.correct);
    });
    const unlocked = revealed() && !revealAtEnd;
    $('#reveal').classList.toggle('locked', !unlocked);
    // the per-case results would give the answer away before the guess
    $('#detail-a').textContent = unlocked ? cmp.detail(st.A, st.rA, fmt) : '?';
    $('#detail-b').textContent = unlocked ? cmp.detail(st.B, st.rB, fmt) : '?';
    const note = $('.poster-note');
    const isDefault =
      JSON.stringify(st.A) === JSON.stringify(lesson.preset) && JSON.stringify(st.B) === JSON.stringify({ ...lesson.preset, ...cmp.B });
    if (chosen === undefined) {
      note.textContent = unlocked ? '' : 'Pilih jawabanmu — animasinya diputar setelah itu.';
      note.className = 'poster-note';
    } else if (!unlocked) {
      note.textContent = `Tebakanmu: “${cmp.options[chosen]}”. Perhatikan A dan B…`;
      note.className = 'poster-note';
    } else {
      const right = chosen === cmp.correct;
      note.textContent = right ? 'Tebakanmu benar! ✓' : `Tebakanmu: “${cmp.options[chosen]}”. Jawabannya: “${cmp.options[cmp.correct]}”.`;
      note.className = `poster-note ${right ? 'good' : 'try'}`;
    }
    $('#verdict').innerHTML = isDefault
      ? cmp.verdict(st.A, st.rA, st.B, st.rB, fmt)
      : `Dengan angka pilihanmu — A: ${cmp.detail(st.A, st.rA, fmt)}; B: ${cmp.detail(st.B, st.rB, fmt)}.`;
  }

  function renderSolution() {
    const box = $('#solution');
    if (!revealed() || revealAtEnd) {
      box.innerHTML = `<span class="eyebrow">PEMBAHASAN</span><h2>Langkah demi langkah</h2><p class="muted">Terbuka setelah kamu menebak dan menonton animasinya.</p><details class="problem-text"><summary>Baca soal asli</summary><p>${lesson.problem}</p></details>`;
      return;
    }
    box.innerHTML = `<span class="eyebrow">PEMBAHASAN · KASUS A</span><h2>Langkah demi langkah</h2>
      <div class="formula">${lesson.formula}</div>
      <ol class="worked">${lesson.worked(st.A, st.rA, fmt).map((l) => `<li>${l}</li>`).join('')}</ol>
      <details class="problem-text"><summary>Soal asli</summary><p>${lesson.problem}</p></details>
      <details class="problem-text"><summary>Asumsi model</summary><p>${lesson.assumptions}</p></details>`;
  }

  function renderSound() {
    const b = $('[data-act="sound"]');
    b.textContent = soundOn() ? '🔊' : '🔇';
    b.setAttribute('aria-label', soundOn() ? 'Matikan suara' : 'Nyalakan suara');
  }

  // ---------- playback ----------
  let raf = 0;
  let last = null;
  let revealAtEnd = false;
  function loop(now) {
    if (!main.isConnected || !st.playing) return;
    if (last !== null) st.t = advance(st.t, (now - last) / 1000, st.speed, total());
    last = now;
    if (st.t >= total()) {
      st.playing = false;
      if (revealAtEnd) {
        revealAtEnd = false;
        unlock();
      }
    }
    renderScenes();
    if (st.playing) raf = requestAnimationFrame(loop);
  }
  function play() {
    if (st.t >= total()) st.t = 0;
    st.playing = true;
    last = null;
    blip(lesson.id === 'sabuk' ? 'thud' : 'whoosh');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }
  function pause() {
    st.playing = false;
    cancelAnimationFrame(raf);
    renderScenes();
  }

  function unlock() {
    revealAtEnd = false;
    draft.revealed = true;
    store.save();
    renderPoll();
    renderSolution();
    renderScenes();
    const reveal = $('#reveal');
    reveal.classList.remove('just-revealed');
    void reveal.offsetWidth;
    reveal.classList.add('just-revealed');
    if (draft.prediction === cmp.correct) {
      confetti(reveal);
      blip('ding');
    } else blip('pop');
  }

  // ---------- events ----------
  main.addEventListener('click', (e) => {
    const poll = e.target.closest('[data-poll]');
    if (poll) {
      const first = !revealed();
      draft.prediction = Number(poll.dataset.poll);
      store.save();
      blip('pop');
      if (first) {
        // keep the answer hidden until the animation has played once
        revealAtEnd = true;
        renderPoll();
        renderSolution();
        st.t = 0;
        if (reducedMotion()) {
          st.t = total();
          unlock();
        } else play();
      } else renderPoll();
      return;
    }
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'play') st.playing ? pause() : play();
    else if (act === 'reveal') {
      unlock();
      if (st.t === 0) play();
    } else if (act === 'sound') {
      setSound(!soundOn());
      renderSound();
    } else if (act === 'preset') {
      pause();
      st.A = { ...lesson.preset };
      st.B = { ...lesson.preset, ...cmp.B };
      delete draft.params;
      delete draft.paramsB;
      store.save();
      recompute();
      st.t = 0;
      st.speed = autoSpeed(total());
      main.querySelectorAll('[data-param]').forEach((inp) => {
        const src = inp.dataset.case === 'b' ? st.B : st.A;
        inp.value = String(src[inp.dataset.param]);
      });
      $('#param-error').textContent = '';
      renderStatic();
      renderScenes();
    }
  });

  main.addEventListener('input', (e) => {
    const t = e.target;
    if (t.id === 'timeline') {
      pause();
      st.t = (Number(t.value) / 1000) * total();
      renderScenes();
      return;
    }
    if (!t.dataset.param) return;
    const fd = lesson.fields.find((f) => f.key === t.dataset.param);
    const v = t.type === 'range' ? Number(t.value) : parseNumber(t.value);
    if (!Number.isFinite(v)) return;
    const val = Math.max(fd.min, Math.min(fd.max, v));
    main.querySelectorAll(`[data-param="${fd.key}"][data-case="${t.dataset.case}"]`).forEach((other) => {
      if (other !== t) other.value = String(val);
    });
    const nextA = t.dataset.case === 'b' ? st.A : { ...st.A, [fd.key]: val };
    const nextB = t.dataset.case === 'a' ? st.B : { ...st.B, [fd.key]: val };
    try {
      const rA = solve(lesson.id, nextA);
      const rB = solve(lesson.id, nextB);
      Object.assign(st, { A: nextA, B: nextB, rA, rB });
      st.t = Math.min(st.t, total());
      st.speed = autoSpeed(total());
      draft.params = { ...st.A };
      draft.paramsB = { ...st.B };
      store.save();
      $('#param-error').textContent = '';
      renderStatic();
      renderScenes();
    } catch (err) {
      $('#param-error').textContent = err.message;
    }
  });

  // initial state: if already answered, show the end of the motion
  if (revealed()) st.t = total();
  renderStatic();
  renderSound();
  renderScenes();
  mountWorksheet($('#lembar'), lesson, draft);

  return () => cancelAnimationFrame(raf);
}

function field(fd, c, value) {
  return `<div class="parameter">
    <div class="parameter-heading">
      <label for="rng-${c}-${fd.key}">${fd.label} <span class="symbol">${fd.symbol}</span></label>
      <span class="number-wrap"><input type="number" id="num-${c}-${fd.key}" data-param="${fd.key}" data-case="${c}" min="${fd.min}" max="${fd.max}" step="${fd.step}" value="${value}" aria-label="${fd.label}${c === 'ab' ? '' : ' ' + c.toUpperCase()} dalam ${fd.unit}"><span class="unit">${fd.unit}</span></span>
    </div>
    <input type="range" id="rng-${c}-${fd.key}" data-param="${fd.key}" data-case="${c}" min="${fd.min}" max="${fd.max}" step="${fd.step}" value="${value}">
  </div>`;
}
