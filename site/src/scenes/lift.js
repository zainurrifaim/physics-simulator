// Elevator descending in its shaft, drawn to one true scale (7,5 px = 1 m): the cabin is
// 2,1 m × 2,5 m and its floor sits exactly at the sampled height. A callout ("diperbesar
// 10×") shows the same cabin at 75 px = 1 m with a 1,8 m passenger and the payload as
// 250 kg steel blocks. No counterweight is drawn because the model has none.
// Every moving part comes from the sampled state (`s.phase`, `s.position`, `s.speed`,
// `s.drivePower`); the overload outcome (safety brake or pit buffer) comes from `r`.
import { arrow, tag, svg, sub, vlen } from './draw.js';
import { fbdPanel, fbdLayout } from './fbd-panel.js';
import { lifterPose, drawFigure, BODY } from './rig.js';
import { G, OVERSPEED_TRIP, SAFETY_DECEL } from '../physics/models.js';

export const GROUND = 352;            // y of height 0 m
export const PX_PER_M = 7.5;
export const CABIN_W = 2.1;           // m
export const CABIN_H = 2.5;           // m
export const SHAFT_W = 3.4;           // m
export const SHAFT_X = 423;           // shaft centre line (px)
export const SHAFT_TOP = 10;          // top of the machine beam (px)
export const PULLEY = { x: SHAFT_X, y: 21, r: 5 };
export const PIT_DEPTH = 1.2;         // m below the lowest landing (buffer pit)

export const INSET_SCALE = 75;        // px per m in the callout (10 × the shaft scale)
export const INSET = { x: 186, y: 40, w: 210, h: 266 };
const INSET_NOTE = 14;                // strip at the bottom of the callout for the legend
const INSET_HEADER = 48;              // header band height (px)
const INSET_FLOOR = 288;              // y of the cabin floor inside the callout
const INSET_CAB_X = 212;              // left outer wall of the cabin inside the callout
const WALL = 0.05;                    // m, cabin wall thickness
export const BLOCK_KG = 250;
export const BLOCK = Math.cbrt(BLOCK_KG / 7850); // m, edge of a 250 kg steel cube (≈ 0,317 m)
const BLOCK_GAP = 0.012;              // m
const BLOCK_COLS = 4;
const PASSENGER_X = 0.36;             // m from the cabin's left outer wall

const sb = (t) => `<tspan class="sub" dy="4">${t}</tspan><tspan dy="-4">​</tspan>`;

/** Height (m) → pixel y in the shaft view. */
export const yOf = (h) => GROUND - h * PX_PER_M;
const r1 = (v) => Math.round(v * 10) / 10;
const BRAKED = new Set(['braking', 'stopped']);
const FAILED = new Set(['overspeed', 'braking', 'stopped', 'buffer']);
export const BUFFER_GAP = 0.4;        // m between the lowest landing and the top of the buffers
/** Landings closer than this (m) get staggered handles and one combined label. */
export const CLOSE = 6;
export const HANDLE_X = { top: 585, bottom: 585, staggered: 522 };
/** Gauges: desktop column on the left; compact strip below the scene, seen only in portrait. */
/** Free-body diagram of cabin + payload: one scale for every setup (80 kN ↔ 50 px). */
const FBD_SCALE = { k: 50 / 80000, maxLen: 50, kN: true, cx: 22, cy: 72 };
export const FBD_DESKTOP = { x: 6, y: 104, w: 172, h: 152, ...FBD_SCALE };
export const FBD_PORTRAIT = { x: 184, y: 466, w: 252, h: 152, ...FBD_SCALE };
/** Status box, tag column (desktop) and the ± panel, as rects for layout tests. */
export const TAGS = { x: 4, y: 5, w: 176, h: 96 };
export const STATUS = { x: 186, y: 3, w: 210, h: 34 };
export const LOAD_PANEL = { x: 174, y: 308, w: 252, h: 72 };
export const GAUGES = {
  desktop: { x: 18, y: 276, w: 132, dy: 42, power: 'Daya rem' },
  portrait: { x: 460, y: 408, w: 124, dy: 44, power: 'Daya rem' },
};

/** Everything in the callout that does not move (it shows the cabin, not the shaft). */
export function insetGeometry(p) {
  const S = INSET_SCALE;
  const cabin = { x: INSET_CAB_X, y: INSET_FLOOR - CABIN_H * S, w: CABIN_W * S, h: CABIN_H * S, floorY: INSET_FLOOR };
  const inner = { x: cabin.x + WALL * S, y: cabin.y + WALL * S, w: (CABIN_W - 2 * WALL) * S, h: (CABIN_H - WALL) * S };
  const full = Math.floor(p.payload / BLOCK_KG + 1e-9);
  const frac = p.payload / BLOCK_KG - full;
  const count = full + (frac > 1e-9 ? 1 : 0);
  const right = inner.x + inner.w - 0.01 * S;
  const blocks = Array.from({ length: count }, (_, i) => {
    const col = i % BLOCK_COLS, row = Math.floor(i / BLOCK_COLS);
    const h = (i < full ? 1 : frac) * BLOCK * S;   // a part-block keeps the footprint, its volume ∝ mass
    const x = right - (col + 1) * BLOCK * S - col * BLOCK_GAP * S;
    const yb = INSET_FLOOR - row * (BLOCK + BLOCK_GAP) * S;
    return { x, y: yb - h, w: BLOCK * S, h, kg: i < full ? BLOCK_KG : frac * BLOCK_KG };
  });
  const px = cabin.x + PASSENGER_X * S;
  const halfWidth = (BODY.shoulderHalf + 0.06 + 0.05) * S; // hanging hands are the widest part
  const person = { x: px - halfWidth, y: INSET_FLOOR - BODY.stature * S, w: 2 * halfWidth, h: BODY.stature * S, cx: px };
  const railL = { x: cabin.x - 12, w: 6 }, railR = { x: cabin.x + cabin.w + 6, w: 6 };
  return { cabin, inner, blocks, person, railL, railR, center: { x: cabin.x + cabin.w / 2, y: INSET_FLOOR - (CABIN_H / 2) * S } };
}

/** Shaft-view geometry for a sampled state, in pixels (exported for tests and handles). */
export function geometry(p, r, s) {
  const floorY = yOf(s.position);
  const w = CABIN_W * PX_PER_M, h = CABIN_H * PX_PER_M;
  const cabin = { x: SHAFT_X - w / 2, y: floorY - h, w, h, floorY };
  const pitY = yOf(p.bottom - PIT_DEPTH);   // pit floor under the lowest landing (may dip below 0 m)
  const bottom = Math.max(GROUND, pitY);
  const sw = SHAFT_W * PX_PER_M;
  const shaft = { x: SHAFT_X - sw / 2, y: SHAFT_TOP, w: sw, h: bottom - SHAFT_TOP, bottom, pitY };
  const y1 = PULLEY.y + PULLEY.r;
  const cable = { x: SHAFT_X, y1, y2: cabin.y, length: cabin.y - y1 };
  const floors = { top: yOf(p.top), bottom: yOf(p.bottom), bufferTop: yOf(p.bottom - BUFFER_GAP) };
  return { cabin, shaft, cable, floors, inset: INSET };
}

/** Upward support force on the cabin and what provides it, from the sampled state. */
export function supportForce(r, s) {
  if (s.phase === 'braking') return { value: r.totalMass * (G + SAFETY_DECEL), label: `F${sub('rem')}` };
  if (s.phase === 'stopped') return { value: r.weight, label: `F${sub('rem')}` };
  if (s.phase === 'buffer') return { value: r.weight, label: `F${sub('peredam')}` };
  if (s.phase === 'overspeed') return { value: s.speed > 0 ? s.drivePower / s.speed : 0, label: 'T = P/v' };
  return { value: s.speed > 0 ? s.drivePower / s.speed : r.weight, label: 'T' };
}

/** Forces on cabin + payload (one object) for the free-body diagram, from the sampled state. */
export function fbdForces(p, r, s) {
  const up = supportForce(r, s);
  const name = s.phase === 'braking' || s.phase === 'stopped' ? `F${sb('rem')}` : s.phase === 'buffer' ? `F${sb('peredam')}` : 'T';
  return fbdLayout([
    { key: 'up', dx: 0, dy: -1, value: up.value, label: name },
    { key: 'g', dx: 0, dy: 1, value: r.totalMass * G, label: `F${sb('g')}` },
  ], FBD_DESKTOP);
}

/** Two short notes explaining ΣF for the current phase. */
function fbdNotes(s) {
  const Fg = `F${sb('g')}`, Fr = `F${sb('rem')}`;
  if (s.phase === 'overspeed') return [`T = P/v &lt; ${Fg} → ΣF ke bawah`, 'kabin makin cepat'];
  if (s.phase === 'braking') return [`${Fr} &gt; ${Fg} → ΣF ke atas`, 'kabin melambat (a = 5 m/s²)'];
  if (s.phase === 'stopped') return [`${Fr} = ${Fg} → ΣF = 0`, 'kabin ditahan rem darurat'];
  if (s.phase === 'buffer') return [`F${sb('peredam')} = ${Fg} → ΣF = 0`, 'kabin diam di peredam'];
  if (s.phase === 'arrived') return [`T = ${Fg} → ΣF = 0`, 'diam di lantai tujuan'];
  return [`T = ${Fg} → ΣF = 0`, 'kecepatan tetap'];
}

/** Horizontal gauge: bar filled to `value` on a 0…max scale with labelled marks. */
function gauge(x, y, w, title, value, max, marks, text, cls, ghost = 0) {
  const X = (v) => r1(x + (Math.max(0, Math.min(max, v)) / max) * w);
  return `<g class="lift-gauge ${cls}">
    <text class="gauge-title" x="${x}" y="${y - 6}">${title}</text>
    <rect class="gauge-track" x="${x}" y="${y}" width="${w}" height="10" rx="5"/>
    ${ghost > value ? `<rect class="gauge-ghost" x="${x}" y="${y}" width="${r1(X(ghost) - x)}" height="10" rx="5"/>` : ''}
    <rect class="gauge-fill" x="${x}" y="${y}" width="${r1(Math.max(0, X(value) - x))}" height="10" rx="5"/>
    ${marks.map((m) => `<path class="gauge-mark ${m.cls ?? ''}" d="M${X(m.value)} ${y - 2}V${y + 12 + (m.row ?? 0) * 11}"/><text class="gauge-mark-text ${m.cls ?? ''}" x="${X(m.value)}" y="${y + 22 + (m.row ?? 0) * 11}" text-anchor="${m.anchor ?? 'middle'}">${m.label}</text>`).join('')}
    <text class="gauge-value" x="${x + w}" y="${y - 6}" text-anchor="end">${text}</text>
  </g>`;
}

function spring(x, yTop, yBottom, half = 4) {
  const n = 6, step = (yBottom - yTop) / n;
  let d = `M${x} ${r1(yBottom)}`;
  for (let i = 1; i < n; i++) d += `L${x + (i % 2 ? half : -half)} ${r1(yBottom - i * step)}`;
  return `<path class="buffer-spring" d="${d}L${x} ${r1(yTop)}"/>`;
}

/** Two-line status box above the callout (fits between the left column and the shaft beam). */
function statusBox(cx, lines, cls = '') {
  const len = (t) => t.replace(/<[^>]+>/g, '').length;
  const w = Math.max(...lines.map(len)) * 6.6 + 22;
  return `<g class="lift-status ${cls}"><rect x="${r1(cx - w / 2)}" y="3" width="${r1(w)}" height="34" rx="8"/>
    <text class="status-main" x="${cx}" y="17" text-anchor="middle">${lines[0]}</text>
    <text class="status-sub" x="${cx}" y="31" text-anchor="middle">${lines[1]}</text></g>`;
}

/** Status text for a sampled state. At t = 0 it is neutral so a preview never gives the answer away. */
export function statusLines(p, r, s, f) {
  const vd = r.speed < 0.1 ? 3 : 2;
  if (!(s.t > 0)) return { cls: '', lines: ['Siap turun', `dari h₁ = ${f(p.top)} m ke h₂ = ${f(p.bottom)} m`] };
  if (s.phase === 'arrived') return { cls: 'ok', lines: [`Tiba di h₂ = ${f(p.bottom)} m`, 'berhenti di lantai tujuan'] };
  if (s.phase === 'descend') return { cls: '', lines: ['Turun dengan kecepatan tetap', `v = ${f(s.speed, vd)} m/s`] };
  if (s.phase === 'overspeed') return { cls: 'warn', lines: ['Rem mesin kurang kuat', 'kabin makin cepat'] };
  if (BRAKED.has(s.phase)) return { cls: 'warn', lines: ['Rem darurat aktif', `berhenti di ${f(r.stopHeight, 2)} m`] };
  return { cls: 'warn', lines: ['Menghantam peredam', `v = ${f(r.impactSpeed, vd)} m/s`] };
}

export function render(p, r, s, f) {
  const g = geometry(p, r, s);
  const { cabin, shaft, cable, floors } = g;
  const ins = insetGeometry(p);
  const live = s.t > 0;                         // t = 0 is the neutral prediction preview
  const failed = live && FAILED.has(s.phase);
  const braked = live && BRAKED.has(s.phase);
  const moving = ['descend', 'overspeed', 'braking'].includes(s.phase);
  const vd = r.speed < 0.1 ? 3 : 2;
  const close = p.top - p.bottom < CLOSE;
  const right = shaft.x + shaft.w;

  // ---- shaft view (true scale)
  const ticks = [];
  for (let h = 0; h <= 40; h += 10) {
    const y = yOf(h);
    const near = Math.abs(h - p.top) <= 3 || Math.abs(h - p.bottom) <= 3 || (close && h < p.bottom && h > p.bottom - 5.5);
    ticks.push(`<path class="floor-mark" d="M${r1(right)} ${y}h5"/>${near ? '' : `<text class="floor-text" x="${r1(right + 8)}" y="${y + 4}">${h}</text>`}`);
  }
  // landing: short stub on the left, a line on the right that runs to its drag handle
  const landing = (key) => {
    const y = r1(floors[key]);
    return `<path class="landing" d="M${r1(shaft.x - 6)} ${y}H${r1(shaft.x)}M${r1(right)} ${y}h6"/><path class="landing-line" d="M${r1(right + 6)} ${y}H${handle(key, p).x - 15}"/>`;
  };
  const bufferTop = s.phase === 'buffer' ? cabin.floorY : floors.bufferTop;
  const clamp = braked ? `<rect class="brake-mark" x="${r1(shaft.x + 0.4)}" y="${r1(cabin.floorY - 6)}" width="3" height="6"/><rect class="brake-mark" x="${r1(right - 3.4)}" y="${r1(cabin.floorY - 6)}" width="3" height="6"/>` : '';
  const shaftView = `
    <rect class="shaft" x="${r1(shaft.x)}" y="${shaft.y}" width="${r1(shaft.w)}" height="${r1(shaft.h)}"/>
    <path class="shaft-rail" d="M${r1(shaft.x + 2)} ${shaft.y + 10}V${r1(shaft.bottom)}M${r1(right - 2)} ${shaft.y + 10}V${r1(shaft.bottom)}"/>
    <rect class="pit" x="${r1(shaft.x)}" y="${r1(floors.bottom)}" width="${r1(shaft.w)}" height="${r1(shaft.pitY - floors.bottom)}"/>
    ${shaft.bottom > shaft.pitY + 0.5 ? `<rect class="pit-fill" x="${r1(shaft.x)}" y="${r1(shaft.pitY)}" width="${r1(shaft.w)}" height="${r1(shaft.bottom - shaft.pitY)}"/>` : ''}
    ${spring(SHAFT_X - 5, bufferTop, shaft.pitY, 2.5)}${spring(SHAFT_X + 5, bufferTop, shaft.pitY, 2.5)}
    ${landing('top')}${landing('bottom')}
    <rect class="beam" x="${r1(shaft.x - 8)}" y="${SHAFT_TOP}" width="${r1(shaft.w + 16)}" height="7" rx="2"/>
    <rect class="lift-machine" x="${SHAFT_X - 9}" y="${SHAFT_TOP - 8}" width="18" height="8" rx="2"/>
    <circle class="pulley" cx="${PULLEY.x}" cy="${PULLEY.y}" r="${PULLEY.r}"/>
    ${ticks.join('')}
    <text class="floor-text" x="${r1(right + 8)}" y="${GROUND + 16}">m</text>
    <path class="cable" d="M${cable.x} ${cable.y1}V${r1(cable.y2)}"/>
    <g class="cabin${failed ? ' fail' : ''}">
      <rect x="${r1(cabin.x)}" y="${r1(cabin.y)}" width="${r1(cabin.w)}" height="${r1(cabin.h)}" rx="1"/>
      <rect class="cabin-inner" x="${r1(cabin.x + 2)}" y="${r1(cabin.y + 2)}" width="${r1(cabin.w - 4)}" height="${r1(cabin.h - 4)}"/>
    </g>
    ${clamp}
    ${s.phase === 'buffer' ? `<path class="impact" d="M${r1(cabin.x - 6)} ${r1(cabin.floorY + 2)}l-5 4M${r1(cabin.x + cabin.w + 6)} ${r1(cabin.floorY + 2)}l5 4M${r1(cabin.x - 7)} ${r1(cabin.floorY - 4)}h-6M${r1(cabin.x + cabin.w + 7)} ${r1(cabin.floorY - 4)}h6"/>` : ''}
    <rect class="callout-frame" x="${r1(cabin.x - 3)}" y="${r1(cabin.y - 3)}" width="${r1(cabin.w + 6)}" height="${r1(cabin.h + 6)}" rx="2"/>
    <path class="callout-line" d="M${INSET.x + INSET.w} ${INSET.y}L${r1(cabin.x - 3)} ${r1(cabin.y - 3)}M${INSET.x + INSET.w} ${INSET.y + INSET.h}L${r1(cabin.x - 3)} ${r1(cabin.floorY + 3)}"/>`;

  // ---- callout: the same cabin at 10 × scale
  const S = INSET_SCALE;
  const c = ins.cabin;
  const jawGap = braked ? 0 : 2.5;
  const jaws = (rail) => {
    const y = c.floorY - 22;
    return `<rect class="gear-housing" x="${rail.x - 9}" y="${y - 3}" width="${rail.w + 18}" height="22" rx="2"/>
      <rect class="brake-jaw${braked ? ' on' : ''}" x="${rail.x - 5 - jawGap}" y="${y}" width="5" height="16" rx="1"/>
      <rect class="brake-jaw${braked ? ' on' : ''}" x="${rail.x + rail.w + jawGap}" y="${y}" width="5" height="16" rx="1"/>
      ${s.phase === 'braking' ? `<path class="spark" d="M${rail.x + 3} ${y + 18}l-6 7M${rail.x + 3} ${y + 18}l6 8M${rail.x + 3} ${y + 18}v9"/>` : ''}`;
  };
  const pose = lifterPose({ barY: 0, grip: false });
  const blocks = ins.blocks.map((b) => `<rect class="steel${b.kg < BLOCK_KG ? ' part' : ''}" x="${r1(b.x)}" y="${r1(b.y)}" width="${r1(b.w)}" height="${r1(b.h)}" rx="1.5"/>`).join('');
  const dx = INSET.x + INSET.w - 50;
  const display = `
    <rect class="lift-display" x="${dx - 46}" y="${INSET.y + 6}" width="92" height="36" rx="4"/>
    <text class="display-big" x="${dx}" y="${INSET.y + 22}" text-anchor="middle">${moving ? '▼' : '■'} ${f(s.position, moving ? 1 : 2)} m</text>
    <text class="display-small${failed && s.speed > r.speed * 1.0001 ? ' warn' : ''}" x="${dx}" y="${INSET.y + 36}" text-anchor="middle">v = ${f(s.speed, vd)} m/s</text>`;
  const inset = `
    <g class="lift-inset">
      <rect class="inset-frame" x="${INSET.x}" y="${INSET.y}" width="${INSET.w}" height="${INSET.h}" rx="6"/>
      <rect class="shaft-bg" x="${INSET.x + 1}" y="${INSET.y + INSET_HEADER}" width="${INSET.w - 2}" height="${INSET.h - INSET_HEADER - INSET_NOTE}"/>
      <rect class="inset-rail" x="${ins.railL.x}" y="${INSET.y + INSET_HEADER}" width="${ins.railL.w}" height="${INSET.h - INSET_HEADER - INSET_NOTE}"/>
      <rect class="inset-rail" x="${ins.railR.x}" y="${INSET.y + INSET_HEADER}" width="${ins.railR.w}" height="${INSET.h - INSET_HEADER - INSET_NOTE}"/>
      <path class="cable" d="M${r1(ins.center.x)} ${INSET.y + INSET_HEADER}V${r1(c.y)}"/>
      <g class="cabin${failed ? ' fail' : ''}">
        <rect x="${r1(c.x)}" y="${r1(c.y)}" width="${r1(c.w)}" height="${r1(c.h + 4)}" rx="3"/>
        <rect class="cabin-inner" x="${r1(ins.inner.x)}" y="${r1(ins.inner.y)}" width="${r1(ins.inner.w)}" height="${r1(ins.inner.h)}"/>
      </g>
      ${jaws(ins.railL)}${jaws(ins.railR)}
      ${drawFigure(pose, ins.person.cx, c.floorY, S)}
      ${blocks}
      ${s.phase === 'buffer' ? `<path class="impact" d="M${r1(c.x - 3)} ${c.floorY - 30}l-6 -8M${r1(c.x - 3)} ${c.floorY - 40}h-8M${r1(c.x + c.w + 3)} ${c.floorY - 30}l6 -8M${r1(c.x + c.w + 3)} ${c.floorY - 40}h8"/>` : ''}
      <rect class="inset-header" x="${INSET.x + 1}" y="${INSET.y + 1}" width="${INSET.w - 2}" height="${INSET_HEADER - 1}" rx="5"/>
      <text class="inset-title" x="${INSET.x + 10}" y="${INSET.y + 19}">Kabin</text>
      <text class="inset-sub" x="${INSET.x + 10}" y="${INSET.y + 35}">diperbesar 10×</text>
      <g class="layer layer-motion">${display}</g>
      <text class="inset-note" x="${INSET.x + 8}" y="${INSET.y + INSET.h - 4}">1 balok baja = ${f(BLOCK_KG)} kg</text>
    </g>`;

  // ---- live readouts (from the sampled state only; limits from r)
  const vMax = OVERSPEED_TRIP * r.speed * 1.12;
  const peak = r.outcome === 'safety' ? OVERSPEED_TRIP * r.speed : r.outcome === 'buffer' ? r.impactSpeed : 0;
  const showPeak = failed && peak > 0 && s.speed < peak - 1e-9;
  const showNeed = live && !r.ok && r.absorbed > p.power;
  const pMax = Math.min(Math.max(p.power, showNeed ? r.absorbed : 0) * 1.08, p.power * 1.6);
  const readouts = (G0) => {
    const speedMarks = [
      { value: r.speed, label: 'normal', anchor: 'end' },
      { value: OVERSPEED_TRIP * r.speed, label: '115%', cls: 'limit', anchor: 'start' },
    ];
    const powerMarks = [{ value: p.power, label: 'maks', cls: 'limit', anchor: showNeed ? 'end' : 'middle' }];
    if (showNeed) powerMarks.push({ value: r.absorbed, label: `perlu ${f(r.absorbed)} W${r.absorbed > pMax ? ' ▸' : ''}`, cls: 'need', anchor: 'end', row: 1 });
    return `
      ${gauge(G0.x, G0.y, G0.w, 'Laju turun', s.speed, vMax, speedMarks, `${f(s.speed, vd)} m/s`, failed ? 'warn' : '', showPeak ? peak : 0)}
      ${gauge(G0.x, G0.y + G0.dy, G0.w, G0.power, s.drivePower, pMax, powerMarks, `${f(s.drivePower)} W`, failed ? 'warn' : 'ok')}`;
  };

  // ---- labels
  const st = statusLines(p, r, s, f);
  const hText = (k) => `${k === 'top' ? 'Awal' : 'Tujuan'} ${f(p[k])} m`;
  const missed = failed && s.phase !== 'buffer' ? ' missed' : '';
  const levelLabels = close
    ? `<text class="level-text" x="${r1(right + 8)}" y="${r1(floors.bottom + 30)}">${hText('top')} · <tspan class="${missed}">${hText('bottom')}</tspan></text>`
    : `<text class="level-text" x="${r1(right + 8)}" y="${r1(floors.top + 13)}">${hText('top')}</text><text class="level-text${missed}" x="${r1(right + 8)}" y="${r1(floors.bottom + 13)}">${hText('bottom')}</text>`;

  // ---- velocity arrow in the callout's left margin (forces are in the optional FBD panel)
  const fy = ins.center.y;
  const vx = INSET.x + 7;

  return svg(
    `
    <rect class="wall" x="0" y="0" width="600" height="${GROUND}"/>
    <rect class="floor" x="0" y="${GROUND}" width="600" height="28"/>
    ${shaftView}
    ${inset}
    <g class="layer layer-forces lift-readouts desktop-detail">${readouts(GAUGES.desktop)}</g>
    <g class="layer layer-forces desktop-detail">${fbdPanel({ ...FBD_DESKTOP, title: 'Gaya pada kabin + muatan' }, fbdForces(p, r, s), fbdNotes(s), f, `lift-fbd${failed ? ' warn' : ''}`)}</g>
    <g class="layer layer-forces portrait-detail">${fbdPanel({ ...FBD_PORTRAIT, title: `Diagram gaya kabin + muatan (m = ${f(r.totalMass)} kg)` }, fbdForces(p, r, s), fbdNotes(s), f, `lift-fbd${failed ? ' warn' : ''}`)}</g>
    <g class="layer layer-forces lift-readouts compact portrait-detail">${readouts(GAUGES.portrait)}</g>
    <g class="layer layer-labels">
      ${levelLabels}
      <g class="layer layer-forces desktop-detail">${tag(96, 18, `m${sub('lift')} = ${f(p.cabin)} kg`, failed && r.maxPayload < 0 ? 'warn' : '')}
      ${tag(96, 66, `P maks = ${f(p.power)} W`, 'accent')}
      ${tag(96, 90, `s = ${f(r.drop)} m dalam ${f(p.time)} s`)}</g>
      <g class="scene-status">${statusBox(INSET.x + INSET.w / 2, st.lines, st.cls)}</g>
    </g>
    <g class="layer layer-motion">
      ${s.speed > 1e-9 ? arrow(vx, fy, vx, fy + vlen(s.speed, OVERSPEED_TRIP * r.speed, 60, 10), 'velocity', 'v', { labelSide: 'left' }) : ''}
      ${arrow(INSET.x + INSET.w + 7, floors.top, INSET.x + INSET.w + 7, cabin.floorY, 'disp', '', { dashed: true })}
    </g>
  `,
    `Lift turun dari ${f(p.top)} meter ke ${f(p.bottom)} meter`
  );
}

export const camera = { desktop: '0 0 600 380', portrait: '180 0 420 622', cleanDesktop: '180 0 420 380', cleanPortrait: '180 0 420 380' };

/** The ± payload panel: under the left column on desktop, below the scene in portrait. */
export const loadOffset = { desktop: [-18, 0], portrait: [10, 80] };

/** Drag handle for an interactive parameter, on its landing line; staggered when the landings are close. */
export function handle(key, p) {
  const close = p.top - p.bottom < CLOSE;
  const x = key === 'bottom' && close ? HANDLE_X.staggered : HANDLE_X[key];
  return { x, y: yOf(p[key]), axis: 'y', factor: -1 / PX_PER_M };
}
