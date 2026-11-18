import { fmt } from '../format.js';

/** One validation path for scene gestures, keyboard actions and number fields. */
export function editParameter(lesson, params, key, raw) {
  const field = lesson.fields.find((f) => f.key === key);
  if (!field || !Number.isFinite(raw)) throw new RangeError('Masukkan angka yang valid.');
  let min = field.min, max = field.max;
  if (lesson.id === 'sepeda') {
    if (key === 'height') max = Math.min(max, params.length);
    if (key === 'length') min = Math.max(min, params.height);
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
  const [key, unit] = { angkat: ['work', 'J'], derek: ['required', 'W'], lift: ['absorbed', 'W'], sabuk: ['force', 'N'], sepeda: ['duration', 's'] }[id];
  return { value: result[key], unit };
}

/** Geometry in the same coordinate system as the illustrations (600 × 380). */
export function sceneCamera(id, portrait) {
  if (!portrait) return '0 0 600 380';
  return { angkat: '165 0 300 380', derek: '165 0 400 380', lift: '220 0 350 380', sabuk: '175 20 380 350', sepeda: '45 0 530 380' }[id];
}

export function handleGeometry(id, key, p, portrait = false) {
  if (id === 'angkat') return { x: portrait ? 440 : 520, y: 318 - p.height * 100, axis: 'y', factor: -0.01 };
  if (id === 'derek') return { x: 500, y: 345 - p.height * 8.5, axis: 'y', factor: -1 / 8.5 };
  if (id === 'lift') return { x: key === 'top' ? 450 : 520, y: 355 - p[key] * 7.5, axis: 'y', factor: -1 / 7.5 };
  if (id === 'sabuk') return key === 'distance'
    ? { x: 200 + p.distance * 140, y: 160, axis: 'x', factor: 1 / 140 }
    : { x: 170 + p.speed * 2.5, y: 70, axis: 'x', factor: 1 / 2.5 };
  const cos = Math.sqrt(Math.max(0, 1 - (p.height / p.length) ** 2));
  const scale = Math.min(cos > 1e-6 ? 470 / (p.length * cos) : Infinity, 250 / p.height);
  const topX = 545 - p.length * cos * scale, topY = 330 - p.height * scale;
  return key === 'height'
    ? { x: Math.max(50, topX), y: topY, axis: 'y', factor: -1 / scale }
    : { x: (topX + 545) / 2, y: (topY + 330) / 2, axis: 'x', factor: -p.length / 300 };
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
    drag = { key, startPoint, startValue: p[key], geometry: handleGeometry(lesson.id, key, p, window.matchMedia('(max-width: 600px)').matches), pointerId: e.pointerId };
    handle.focus();
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('dragging');
  });
  svg.addEventListener('pointermove', (e) => {
    if (!drag || drag.pointerId !== e.pointerId) return;
    const current = point(e);
    if (current) edit(drag.key, dragValue(drag.startValue, drag.startPoint, current, drag.geometry));
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
        svg.querySelector('.setup-distance').setAttribute('d', `M200 151v18m0 -9H${distance.x}m0 -9v18`);
      }
      if (config.load) {
        svg.querySelector('.load-value').textContent = `${fmt(p[config.load])} kg`;
        svg.querySelector('.scene-load').setAttribute('transform', portrait && lesson.id === 'lift' ? 'translate(60 0)' : 'translate(0 0)');
      }
    },
    cancel() { if (drag) finish({ pointerId: drag.pointerId }); },
  };
}
