// Reel-style animated introduction: a short sequence of captioned steps over the
// module's scene, inspired by short science explainer videos. Uses the original
// problem's numbers. Auto-advances; can be paused, stepped and skipped.
import { solve, sample } from '../physics/models.js';
import { scene } from '../scenes/index.js';
import { chart } from './chart.js';
import { fmt } from '../format.js';
import { icon } from './icons.js';

const LAYERS = ['labels', 'forces', 'motion'];
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function holdFor(step) {
  if (step.equation) return 7000;
  if (step.t === 'play') return 5000;
  if (step.chart) return 6500;
  return 4800;
}

export function mountStory(root, lesson, { onDone } = {}) {
  const p = lesson.preset;
  const r = solve(lesson.id, p);
  const steps = lesson.story(p, r, fmt);
  const reduced = reducedMotion();
  let index = 0;
  let elapsed = 0;
  let playing = !reduced;
  let finished = false;
  let last = null;
  let frame = 0;
  let prevLayers = [];

  root.innerHTML = `
    <section class="story ${lesson.color}" aria-roledescription="cerita animasi" aria-label="Cerita: ${lesson.title}" tabindex="0">
      <div class="story-progress" aria-hidden="true">${steps.map(() => '<span><i></i></span>').join('')}</div>
      <div class="story-top"><span class="story-badge">${icon('spark')} CERITA ${lesson.number}</span><span class="story-count" aria-live="polite"></span></div>
      <div class="story-body">
        <div class="story-visual">
          <div class="story-scene stage-layers"></div>
          <div class="story-chart" hidden></div>
        </div>
        <div class="story-caption" aria-live="polite"></div>
      </div>
      <div class="story-end" hidden>
        <span class="eyebrow">SEKARANG GILIRANMU</span>
        <h3>Ubah angkanya. Lihat apa yang terjadi.</h3>
        <div class="story-end-actions">
          <button class="button primary" data-story="done">Masuk ke lab ${icon('arrow')}</button>
          <button class="button ghost" data-story="replay">${icon('reset')} Putar ulang</button>
        </div>
      </div>
      <div class="story-controls">
        <button class="icon-button" data-story="prev" aria-label="Langkah sebelumnya">${icon('chevronLeft')}</button>
        <button class="icon-button play" data-story="toggle" aria-label="Jeda"></button>
        <button class="icon-button" data-story="next" aria-label="Langkah berikutnya">${icon('chevron')}</button>
        <button class="text-button skip" data-story="done">Lewati ke lab ${icon('arrow')}</button>
      </div>
    </section>`;

  const el = {
    story: root.querySelector('.story'),
    segs: [...root.querySelectorAll('.story-progress i')],
    count: root.querySelector('.story-count'),
    scene: root.querySelector('.story-scene'),
    chart: root.querySelector('.story-chart'),
    caption: root.querySelector('.story-caption'),
    end: root.querySelector('.story-end'),
    toggle: root.querySelector('[data-story="toggle"]'),
  };

  function physicalTime(step) {
    if (step.t === 'start') return 0;
    if (step.t === 'end') return r.duration;
    if (reduced) return r.duration;
    const playWindow = holdFor(step) * 0.7;
    return Math.min(1, elapsed / playWindow) * r.duration;
  }

  function drawScene() {
    const step = steps[index];
    el.scene.innerHTML = scene(lesson.id, p, r, sample(lesson.id, p, r, physicalTime(step)));
  }

  function renderStep() {
    const step = steps[index];
    finished = false;
    el.end.hidden = true;
    el.story.classList.remove('ended');
    const layers = step.layers || [];
    el.scene.className = 'story-scene stage-layers ' + layers.map((l) => `show-${l}`).join(' ') + ' ' + layers.filter((l) => !prevLayers.includes(l)).map((l) => `fresh-${l}`).join(' ');
    prevLayers = layers;
    drawScene();
    if (step.chart) {
      el.chart.hidden = false;
      el.chart.innerHTML = chart(lesson, p, r, r.duration, { draw: !reduced });
    } else {
      el.chart.hidden = true;
      el.chart.innerHTML = '';
    }
    el.story.classList.toggle('with-chart', !!step.chart);
    el.caption.innerHTML = `
      <h2 class="story-title">${step.caption}</h2>
      ${step.sub ? `<p class="story-sub">${step.sub}</p>` : ''}
      ${step.equation ? `<div class="story-equation">${step.equation.map((line, i) => `<div style="--i:${i}">${line}</div>`).join('')}</div>` : ''}`;
    el.caption.classList.remove('enter');
    void el.caption.offsetWidth; // restart the entry animation
    el.caption.classList.add('enter');
    el.count.textContent = `${index + 1} / ${steps.length}`;
    updateBars();
  }

  function updateBars() {
    const hold = holdFor(steps[index]);
    el.segs.forEach((seg, i) => {
      seg.style.width = i < index ? '100%' : i > index ? '0%' : `${Math.min(100, (elapsed / hold) * 100)}%`;
    });
    el.toggle.innerHTML = playing ? icon('pause') : icon('play');
    el.toggle.setAttribute('aria-label', playing ? 'Jeda cerita' : 'Putar cerita');
  }

  function go(i) {
    index = Math.max(0, Math.min(steps.length - 1, i));
    elapsed = 0;
    renderStep();
  }

  function finish() {
    finished = true;
    playing = false;
    el.end.hidden = false;
    el.story.classList.add('ended');
    updateBars();
  }

  function tick(now) {
    if (!root.isConnected) return;
    frame = requestAnimationFrame(tick);
    if (last === null) last = now;
    const dt = Math.min(100, now - last);
    last = now;
    if (!playing || finished) return;
    elapsed += dt;
    const step = steps[index];
    if (step.t === 'play') drawScene();
    if (elapsed >= holdFor(step)) {
      if (index < steps.length - 1) go(index + 1);
      else {
        elapsed = holdFor(step);
        finish();
      }
    }
    updateBars();
  }

  root.addEventListener('click', (e) => {
    const action = e.target.closest('[data-story]')?.dataset.story;
    if (!action) return;
    if (action === 'toggle') {
      if (finished) go(0);
      playing = !playing;
      updateBars();
    } else if (action === 'next') {
      if (index === steps.length - 1) finish();
      else go(index + 1);
    } else if (action === 'prev') go(index - 1);
    else if (action === 'replay') {
      playing = !reduced;
      prevLayers = [];
      go(0);
    } else if (action === 'done') {
      playing = false;
      onDone?.();
    }
  });

  el.story.addEventListener('keydown', (e) => {
    if (e.target !== el.story) return;
    if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === ' ') {
      e.preventDefault();
      playing = !playing;
      updateBars();
    } else return;
  });

  renderStep();
  frame = requestAnimationFrame(tick);
  return {
    pause() {
      playing = false;
      updateBars();
    },
    destroy() {
      cancelAnimationFrame(frame);
    },
  };
}
