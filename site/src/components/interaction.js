import { fmt } from '../format.js';
import { sceneModules } from '../scenes/index.js';
import { MAX_SLOPE_SIN } from '../physics/models.js';

/** One validation path for scene gestures, keyboard actions and number fields. */
export function editParameter(lesson, params, key, raw) {
  const field = lesson.fields.find((f) => f.key === key);
  if (!field || !Number.isFinite(raw)) throw new RangeError('Masukkan angka yang valid.');
  let min = field.min, max = field.max;
  if (lesson.id === 'sepeda') {
    if (key === 'height') max = Math.min(max, params.length * MAX_SLOPE_SIN);
    if (key === 'length') min = Math.max(min, params.height / MAX_SLOPE_SIN);
  }
  if (lesson.id === 'lift') {
    if (key === 'top') min = Math.max(min, params.bottom + 1);
    if (key === 'bottom') max = Math.min(max, params.top - 1);
  }
  min = field.min + Math.ceil((min - field.min) / field.step - 1e-9) * field.step;
  max = field.min + Math.floor((max - field.min) / field.step + 1e-9) * field.step;
  const value = Math.max(min, Math.min(max, field.min + Math.round((raw - field.min) / field.step) * field.step));
  return { ...params, [key]: Number(value.toFixed(6)) };
}

export function isOriginalComparison(lesson, a, b) {
  return lesson.fields.every(({ key }) => a[key] === lesson.preset[key] && b[key] === ({ ...lesson.preset, ...lesson.compare.B })[key]);
}

/** Quantities actually compared in the experiment, distinct from worksheet answers. */
export function comparisonValue(id, result) {
  const [key, unit, label] = { angkat: ['work', 'J', 'E butuh'], derek: ['required', 'W', 'P butuh'], lift: ['absorbed', 'W', 'P rem'], sabuk: ['force', 'N', 'F butuh'], sepeda: ['duration', 's', 't'] }[id];
  return { value: result[key], unit, label };
}

/** Viewport of a module scene (600 × 380 coordinates); each scene owns its camera. */
export function sceneCamera(id, portrait) {
  const c = sceneModules[id].camera;
  return portrait ? c.portrait : c.desktop;
}

/** Drag-handle position and drag mapping; each scene owns the geometry it draws. */
export function handleGeometry(id, key, p, portrait = false) {
  return sceneModules[id].handle(key, p, portrait);
}

export function dragValue(startValue, startPoint, point, geometry) {
  return startValue + (point[geometry.axis] - startPoint[geometry.axis]) * geometry.factor;
}

// The overlay and all of its focus/capture targets survive scene animation updates.
export function mountInteraction(host, lesson, caseName, getParams, edit) {
  const config = lesson.interaction;
  host.insertAdjacentHTML('beforeend', `<svg class="interaction-layer" viewBox="0 0 600 380" role="group" aria-label="Ubah situasi ${caseName}">
    ${lesson.id === 'sabuk' ? '<path class="setup-speed"/><path class="setup-distance"/>' : ''}
    ${config.handles.map((key) => {
      const f = lesson.fields.find((x) => x.key === key);
      return `<g data-handle="${key}" role="slider" tabindex="0" aria-label="${f.label} ${caseName}" aria-valuemin="${f.min}" aria-valuemax="${f.max}" aria-orientation="${['speed', 'distance', 'length'].includes(key) ? 'horizontal' : 'vertical'}"><rect class="hit" x="-40" y="-40" width="80" height="80"/><circle r="15"/><path d="M-6 0H6M0 -6V6"/><text class="handle-label" x="-22" y="-18" text-anchor="end"></text></g>`;
    }).join('')}
    ${config.load ? `<g class="scene-load"><rect class="load-background" x="174" y="316" width="252" height="62" rx="4"/><g data-load="-1" tabindex="0" role="button" aria-label="Kurangi beban ${caseName}"><rect x="174" y="308" width="72" height="72" class="hit"/><circle cx="210" cy="348" r="20"/><text x="210" y="355" text-anchor="middle">−</text></g><g data-load="1" tabindex="0" role="button" aria-label="Tambah beban ${caseName}"><rect x="354" y="308" width="72" height="72" class="hit"/><circle cx="390" cy="348" r="20"/><text x="390" y="355" text-anchor="middle">+</text></g><text class="load-value" x="300" y="340" text-anchor="middle"></text><text class="load-step" x="300" y="361" text-anchor="middle">beban ±${config.increment} kg</text></g>` : ''}
  </svg>`);
  const svg = host.querySelector('.interaction-layer');
  let drag = null;
  function point(e) {
    const matrix = svg.getScreenCTM();
    return matrix ? new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse()) : null;
  }
  function finish(e) {
    if (!drag || (e.pointerId !== undefined && e.pointerId !== drag.pointerId)) return;
    if (svg.hasPointerCapture(drag.pointerId)) svg.releasePointerCapture(drag.pointerId);
    drag = null;
    svg.classList.remove('dragging');
  }
  svg.addEventListener('pointerdown', (e) => {
    const handle = e.target.closest('[data-handle]');
    if (!handle || (e.button !== 0 && e.pointerType !== 'touch')) return;
    const startPoint = point(e);
    if (!startPoint) return;
    e.preventDefault();
    const key = handle.dataset.handle, p = getParams();
    drag = { key, last: startPoint, value: p[key], pointerId: e.pointerId };
    handle.focus();
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('dragging');
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const current = point(e);
    if (!current) return;
    // incremental: a scene may rescale while dragging (e.g. the hill), so use the CURRENT
    // geometry for each step; keep an unrounded value so small steps are not lost to rounding
    const geometry = handleGeometry(lesson.id, drag.key, getParams(), window.matchMedia('(max-width: 600px)').matches);
    const field = lesson.fields.find((f) => f.key === drag.key);
    drag.value = Math.max(field.min, Math.min(field.max, dragValue(drag.value, drag.last, current, geometry)));
    drag.last = current;
    edit(drag.key, drag.value);
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) svg.addEventListener(event, finish);
  function load(target) {
    edit(config.load, getParams()[config.load] + Number(target.dataset.load) * config.increment);
  }
  svg.addEventListener('click', (e) => {
    const button = e.target.closest('[data-load]');
    if (button) load(button);
  });
  svg.addEventListener('keydown', (e) => {
    const button = e.target.closest('[data-load]');
    if (button && ['Enter', ' '].includes(e.key)) { e.preventDefault(); load(button); return; }
    const key = e.target.closest('[data-handle]')?.dataset.handle;
    if (!key) return;
    const field = lesson.fields.find((f) => f.key === key);
    if (!['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const value = e.key === 'Home' ? field.min : e.key === 'End' ? field.max : getParams()[key] + (['ArrowUp', 'ArrowRight'].includes(e.key) ? 1 : -1) * field.step * (e.shiftKey ? 10 : 1);
    edit(key, value);
  });
  return {
    update() {
      const p = getParams();
      const portrait = window.matchMedia('(max-width: 600px)').matches;
      const camera = sceneCamera(lesson.id, portrait);
      svg.setAttribute('viewBox', camera);
      const cameraLeft = Number(camera.split(' ')[0]);
      for (const target of svg.querySelectorAll('[data-handle]')) {
        const key = target.dataset.handle, f = lesson.fields.find((x) => x.key === key), g = handleGeometry(lesson.id, key, p, portrait);
        target.setAttribute('transform', `translate(${g.x} ${g.y})`);
        target.setAttribute('aria-valuenow', p[key]);
        target.setAttribute('aria-valuetext', `${fmt(p[key], 2)} ${f.unit}`);
        target.querySelector('text').textContent = `${f.symbol.replace(/<[^>]*>/g, '')} ${fmt(p[key], 2)} ${f.unit}`;
        // Keep labels inside the scene at low heights and short slopes.
        target.querySelector('text').setAttribute('x', g.x < cameraLeft + 150 ? 22 : -22);
        target.querySelector('text').setAttribute('text-anchor', g.x < cameraLeft + 150 ? 'start' : 'end');
      }
      if (lesson.id === 'sabuk') {
        const speed = handleGeometry(lesson.id, 'speed', p), distance = handleGeometry(lesson.id, 'distance', p);
        svg.querySelector('.setup-speed').setAttribute('d', `M170 70H${speed.x}m-10 -6l10 6l-10 6`);
        // true-scale ruler from the wall face (x 545) to the handle: exactly the crumple distance s
        svg.querySelector('.setup-distance').setAttribute('d', `M545 ${distance.y - 9}v18m0 -9H${distance.x}m0 -9v18`);
      }
      if (config.load) {
        svg.querySelector('.load-value').textContent = `${fmt(p[config.load])} kg`;
        // scenes may move the ± panel off the action: export loadOffset = { desktop: [dx, dy], portrait: [dx, dy] }
        // loadOffset may also be a function (p, portrait) → [dx, dy] when the free space depends on the setup
        const lo = sceneModules[lesson.id].loadOffset;
        const [dx, dy] = (typeof lo === 'function' ? lo(p, portrait) : lo?.[portrait ? 'portrait' : 'desktop']) ?? (portrait && lesson.id === 'lift' ? [60, 0] : [0, 0]);
        svg.querySelector('.scene-load').setAttribute('transform', `translate(${dx} ${dy})`);
      }
    },
    cancel() { if (drag) finish({ pointerId: drag.pointerId }); },
  };
}
