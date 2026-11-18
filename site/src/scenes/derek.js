// Tower crane lifting a crate, drawn to one true scale (7,5 px = 1 m).
// Everything that moves comes from the sampled state: the crate height is s.position, the
// gauge shows s.power / s.speed / s.t, and the outcome tags come from s.phase only:
//   'ready'   t = 0, hoist switched on but not moving: neutral, no verdict
//   'lift'    crate rises at the model speed (P / mg when power is the limit)
//   'arrived' crate at the target when the requested time ends
//   'timeout' time window over; crate stays at r.reached below the target (red gap band)
//   'stall'   load above the rated capacity; crate stays on the ground, cable taut
// Geometry helpers are exported so tests check exactly what is drawn.
import { arrow, tag, plant, svg } from './draw.js';
import { sig } from '../format.js';
import { fbdLayout } from './fbd-panel.js';
import { G } from '../physics/models.js';

export const GROUND = 345;
export const PX_PER_M = 7.5;
export const HOOK_X = 470;
export const JIB_TOP = 24;
export const JIB_BOTTOM = 36;
/** Underside of the trolley, where the hoist cable leaves it. */
export const TROLLEY_Y = 45;
export const DIM_X = 140;           // height dimension line and drag handle (left, clear of the ± panel)
export const MIN_CRATE_PX = 5;      // only the very smallest boxes (< 0,67 m) are drawn a little larger
const BLOCK_W = 9;
const BLOCK_H = 9;
const HOOK_H = 6;
const FORCE_X = HOOK_X + 38;        // force vectors right of the widest crate
const GAUGE = { x: 232, y: 48, w: 156, h: 58 };   // clear of the handle label at h = 30 m (x ≤ ~225)
const STATUS_RIGHT = HOOK_X - 50;  // right edge of status tags, clear of the s arrow
const STATUS_Y = 274;              // status tags sit below the free-body panel, above the ± panel (y 308)
export const S_ARROW_X = HOOK_X - 30;
/**
 * Free-body diagram of the crate, always visible, same rect in both cameras: right of the
 * handle label (x ≤ ~225), below the gauge (y ≤ 106), left of the crate column (x ≥ 440),
 * above the status tags. One scale for every setup: 2 000 N (problem A) = 12 px; anything
 * above 6 kN is drawn at maxLen, dashed, "tidak berskala".
 */
export const FBD = { x: 230, y: 112, w: 204, h: 132, k: 0.006, maxLen: 36, cx: 26, cy: 64 };

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r1 = (v) => Math.round(v * 10) / 10;

/** Crate height in pixels for a model position (crate bottom above the ground, m). */
export const crateBottomY = (position) => GROUND - position * PX_PER_M;

/**
 * Plausible load size in metres: a wooden crate (~200 kg/m³ of goods, cube) for light
 * loads, a steel container whose length grows with the load from 2 t up.
 */
export function crateSize(mass) {
  if (mass < 2000) {
    const side = clamp(Math.cbrt(mass / 200), 0.5, 2);
    return { kind: 'crate', w: side, h: side };
  }
  const length = 3 + (clamp(mass, 2000, 10000) - 2000) / 8000 * 3.1;   // up to a 20-ft box
  return { kind: 'container', w: length, h: 2.6 };
}

/** Everything drawn for the hoist, in SVG pixels. */
export function geometry(p, r, s) {
  const size = crateSize(p.mass);
  const w = Math.max(MIN_CRATE_PX, size.w * PX_PER_M);
  const h = Math.max(MIN_CRATE_PX, size.h * PX_PER_M);
  const bottom = crateBottomY(s.position);
  const crate = { kind: size.kind, x: HOOK_X - w / 2, y: bottom - h, w, h, bottom };
  const sling = clamp(w * 0.35, 6, 14);
  const hookY = crate.y - sling;                      // where the slings meet the hook
  const block = { x: HOOK_X - BLOCK_W / 2, y: hookY - HOOK_H - BLOCK_H, w: BLOCK_W, h: BLOCK_H };
  return {
    scale: PX_PER_M,
    ground: GROUND,
    jibBottom: JIB_BOTTOM,
    trolleyY: TROLLEY_Y,
    crate,
    hookY,
    block,
    cable: { x: HOOK_X, top: TROLLEY_Y, bottom: block.y, length: block.y - TROLLEY_Y },
    targetY: crateBottomY(p.height),
    reachedY: crateBottomY(r.reached),
  };
}

/** Compact force text: N below 1 kN, kN above (keeps labels inside the frame). */
const forceText = (v, f) => (v >= 1000 ? `${f(v / 1000, 1)} kN` : `${f(v)} N`);
/** "used / rated" power: W below 10 kW, kW above; adds digits until unequal values print differently. */
export function powerPair(used, rated, f) {
  const same = Math.abs(used - rated) <= 1e-9 * rated;
  const text = (v, d) => (v >= 10000 ? `${f(v / 1000, d)} kW` : `${f(v, d - 1)} W`);
  for (let d = 1; d <= 6; d++) {
    const a = text(same ? rated : used, d), b = text(rated, d);
    if (same || a !== b) return [a, b];
  }
  return [text(used, 6), text(rated, 6)];
}
/** Height reached in a failed run: 3 significant figures, never printed as the full target. */
export const reachedText = (reached, height, f) => (sig(reached) >= height ? `&lt; ${f(height)}` : f(sig(reached), 6));
const tagWidth = (text) => text.replace(/<[^>]+>/g, '').length * 7 + 16;
/** Tag whose right edge sits at x (status messages stay left of the crate column). */
const tagRight = (xRight, y, text, cls) => tag(xRight - tagWidth(text) / 2, y, text, cls);

/** Vertical dimension line only: the drag handle's label already prints h. */
function dim(x, yTop, yBottom) {
  return `<g class="dim"><path d="M${x} ${r1(yTop)}V${r1(yBottom)}M${x - 6} ${r1(yTop)}H${x + 6}M${x - 6} ${r1(yBottom)}H${x + 6}"/></g>`;
}

function crane() {
  const mast = [];
  for (let y = JIB_BOTTOM; y + 26 <= GROUND; y += 26) mast.push(`M100 ${y}L124 ${y + 26}M124 ${y}L100 ${y + 26}`);
  const jib = Array.from({ length: 21 }, (_, i) => `M${40 + i * 25} ${JIB_BOTTOM}L${52 + i * 25} ${JIB_TOP}`).join('');
  return `<g class="crane">
    <path class="crane-steel" d="M100 ${JIB_BOTTOM}V${GROUND}M124 ${JIB_BOTTOM}V${GROUND}"/>
    <path class="crane-steel thin" d="${mast.join('')}"/>
    <path class="crane-steel" d="M40 ${JIB_TOP}H560M40 ${JIB_BOTTOM}H560M100 ${JIB_TOP}L112 4L124 ${JIB_TOP}"/>
    <path class="crane-steel thin" d="${jib}M112 4L40 ${JIB_TOP}M112 4L560 ${JIB_TOP}"/>
    <rect class="counterweight" x="44" y="${JIB_BOTTOM}" width="40" height="24" rx="3"/>
    <rect class="cab" x="124" y="${JIB_BOTTOM}" width="32" height="26" rx="4"/>
    <rect class="dk-cab-window" x="140" y="${JIB_BOTTOM + 5}" width="12" height="9" rx="2"/>
    <rect class="crane-steel fill" x="${HOOK_X - 13}" y="${JIB_BOTTOM + 1}" width="26" height="${TROLLEY_Y - JIB_BOTTOM - 1}" rx="2"/>
  </g>`;
}

function load(g, phase) {
  const { crate, block, hookY } = g;
  const x2 = crate.x + crate.w;
  const strain = phase === 'stall' ? ' dk-strain' : '';
  const hook = `<path class="hook" d="M${HOOK_X} ${r1(block.y + block.h)}V${r1(hookY - 2)}a2.5 2.5 0 1 0 -2.5 -2.5"/>`;
  const slings = `<path class="dk-sling${strain}" d="M${r1(crate.x + 1)} ${r1(crate.y)}L${HOOK_X} ${r1(hookY)}L${r1(x2 - 1)} ${r1(crate.y)}"/>`;
  const body = crate.kind === 'crate'
    ? `<g class="crate"><rect x="${r1(crate.x)}" y="${r1(crate.y)}" width="${r1(crate.w)}" height="${r1(crate.h)}" rx="1"/><path d="M${r1(crate.x)} ${r1(crate.y)}L${r1(x2)} ${r1(crate.bottom)}M${r1(x2)} ${r1(crate.y)}L${r1(crate.x)} ${r1(crate.bottom)}"/></g>`
    : `<g class="dk-container"><rect x="${r1(crate.x)}" y="${r1(crate.y)}" width="${r1(crate.w)}" height="${r1(crate.h)}" rx="1"/><path d="${Array.from({ length: Math.floor(crate.w / 4) - 1 }, (_, i) => `M${r1(crate.x + 4 + i * 4)} ${r1(crate.y + 2)}V${r1(crate.bottom - 2)}`).join('')}"/></g>`;
  return `<g class="dk-load">
    <path class="cable${strain}" d="M${HOOK_X} ${TROLLEY_Y}V${r1(block.y)}"/>
    <rect class="dk-block" x="${r1(block.x)}" y="${r1(block.y)}" width="${block.w}" height="${block.h}" rx="2"/>
    ${hook}${slings}${body}
  </g>`;
}

/**
 * Forces on the crate for a sampled state (laid out on the FBD scale). The crate never
 * accelerates in this model (constant speed or at rest), so Σ up = Σ down in every phase.
 *   ready   on the ground, hoist not pulling yet: N = F_g
 *   lift / arrived / timeout   hanging on the cable: T = F_g
 *   stall   T_maks (rated pull) + N = F_g, crate stays on the ground
 */
export function fbdForces(p, s) {
  const W = p.mass * G;
  const down = { key: 'g', label: 'F_{g}', value: W, dx: 0, dy: 1 };
  let list;
  if (s.phase === 'stall') {
    const T = p.capacity * G;
    list = [{ key: 'Tmaks', label: 'T_{maks}', value: T, dx: 0, dy: -1, ox: -6 }, { key: 'N', label: 'N', value: W - T, dx: 0, dy: -1, ox: 6 }, down];
  } else if (s.phase === 'ready') {
    list = [{ key: 'N', label: 'N', value: W, dx: 0, dy: -1 }, down];
  } else {
    list = [{ key: 'T', label: 'T', value: W, dx: 0, dy: -1 }, down];
  }
  return fbdLayout(list, FBD);
}

/**
 * Subscripts written as X_{sub}: the text after a subscript goes in a tspan that shifts back
 * up (an empty tspan's dy is ignored by browsers, which made the rest of the line drift down).
 */
const subs = (text) => text.replace(/_{([^}]+)}([^_]*)/g, (m, a, rest) => `<tspan class="sub" dy="4">${a}</tspan><tspan dy="-4">${rest}</tspan>`);

function fbdNotes(p, r, s, f) {
  const Fg = 'F_{g}';
  switch (s.phase) {
    case 'ready': return [`Diam di tanah: N = ${Fg}`, 'tali belum menarik → ΣF = 0'];
    case 'lift': return ['Naik, kecepatan tetap → ΣF = 0', `T = ${Fg} (tegangan tali = berat)`];
    case 'arrived': return [`Berhenti di ${f(p.height)} m, ditahan rem`, `T = ${Fg} → ΣF = 0`];
    case 'timeout': return [`Waktu habis: ditahan rem di ${reachedText(r.reached, p.height, f)} m`, `T = ${Fg} → ΣF = 0`];
    case 'stall': return [`T_{maks} &lt; ${Fg}: peti tidak terangkat`, `T_{maks} + N = ${Fg} → ΣF = 0, tetap diam`];
    default: return ['', ''];
  }
}

/**
 * Same look as the shared fbdPanel (fbd-* classes), but labels sit in one column right of the
 * arrows so the two upward forces of a stall never overlap, and values print in kN.
 */
function fbd(p, r, s, f) {
  const { x, y, w, h, cx: dx0, cy: dy0 } = FBD;
  const cx = x + dx0, cy = y + dy0;
  const laid = fbdForces(p, s);
  const kN = (v) => `${f(v / 1000, v < 10000 ? 2 : 1)} kN`;
  let upRow = 0;
  const arrows = laid.map((F) => {
    const x0 = cx + (F.ox ?? 0);
    const ty = F.dy < 0 ? cy - 4 - 13 * upRow++ : cy + 16;
    const text = subs(`${F.label} = ${kN(F.value)}${F.scaled ? '' : ' (tidak berskala)'}`);
    return `<g class="fbd-f${F.scaled ? '' : ' clamped'}">${arrow(x0, cy, x0, cy + F.dy * F.len, 'force', '')}<text class="fbd-label" x="${cx + 16}" y="${r1(ty)}">${text}</text></g>`;
  }).join('');
  const [n1, n2] = fbdNotes(p, r, s, f).map(subs);
  const warn = s.phase === 'stall' || s.phase === 'timeout';
  return `<g class="fbd-panel dk-fbd${warn ? ' warn' : ''}">
    <rect class="fbd-bg" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>
    <text class="fbd-title" x="${x + 8}" y="${y + 14}">Diagram gaya peti (m = ${f(p.mass)} kg)</text>
    ${arrows}
    <circle class="fbd-dot" cx="${cx}" cy="${cy}" r="4"/>
    <text class="fbd-note" x="${x + 8}" y="${y + h - 21}">${n1}</text>
    <text class="fbd-note" x="${x + 8}" y="${y + h - 6}">${n2}</text>
  </g>`;
}

/** Live readout: power used vs rated, speed and the requested time window. */
function gauge(p, r, s, f) {
  const { x, y, w, h } = GAUGE;
  const inner = w - 16;
  const pf = clamp(s.power / p.power, 0, 1);
  const tf = clamp(s.t / p.time, 0, 1);
  const limited = s.phase === 'lift' && !r.powerOk;
  const tDigits = p.time < 20 ? 1 : 0;
  const [used, rated] = powerPair(s.power, p.power, f);
  return `<g class="dk-gauge">
    <rect class="dk-panel" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>
    <text class="dk-g-title" x="${x + 8}" y="${y + 14}">Daya</text>
    <text class="dk-g-value" x="${x + w - 8}" y="${y + 14}" text-anchor="end">${used} / ${rated}</text>
    <rect class="dk-track" x="${x + 8}" y="${y + 19}" width="${inner}" height="7" rx="3.5"/>
    ${pf > 0 ? `<rect class="dk-fill${limited ? ' maxed' : ''}" x="${x + 8}" y="${y + 19}" width="${r1(Math.max(3, inner * pf))}" height="7" rx="3.5"/>` : ''}
    <text class="dk-g-value" x="${x + 8}" y="${y + 40}">v = ${f(sig(s.speed), 6)} m/s</text>
    <text class="dk-g-value" x="${x + w - 8}" y="${y + 40}" text-anchor="end">t = ${f(s.t, tDigits)} / ${f(p.time)} s</text>
    <rect class="dk-track thin" x="${x + 8}" y="${y + 46}" width="${inner}" height="4" rx="2"/>
    ${tf > 0 ? `<rect class="dk-fill time" x="${x + 8}" y="${y + 46}" width="${r1(Math.max(2, inner * tf))}" height="4" rx="2"/>` : ''}
  </g>`;
}

export function render(p, r, s, f) {
  const g = geometry(p, r, s);
  const { crate, targetY } = g;
  const cy = crate.y + crate.h / 2;
  const right = STATUS_RIGHT;
  const statusY = STATUS_Y;

  let status = '';
  let gap = '';
  if (s.phase === 'timeout') {
    gap = `<rect class="dk-gap" x="${HOOK_X - 30}" y="${r1(targetY)}" width="60" height="${r1(g.reachedY - targetY)}"/>
      <path class="dk-reached" d="M${HOOK_X - 34} ${r1(g.reachedY)}H${HOOK_X + 34}"/>`;
    status = tagRight(right, statusY, `${f(p.time)} s habis · baru ${reachedText(r.reached, p.height, f)} m`, 'warn');
  } else if (s.phase === 'stall') {
    status = tagRight(right, STATUS_Y - 10, 'Melebihi kapasitas', 'warn') + tagRight(right, STATUS_Y + 16, `${f(p.mass)} kg &gt; ${f(p.capacity)} kg`);
  } else if (s.phase === 'arrived') {
    status = tagRight(right, statusY, `Sampai ${f(p.height)} m dalam ${f(p.time)} s`, 'ok');
  }

  // Free-body vectors on the crate. Lengths share one reference (the weight) so T + N = Fg is visible.
  // Labels are placed separately so a tiny T (e.g. 5 kN of 100 kN) still has a readable label.
  // The same forces as the FBD, on the crate itself: upward forces stacked tip to tail
  // (lengths relative to the weight) so T + N = F_g is visible; labels kept ≥ 15 px apart.
  const len = Math.max(22, Math.min(56, 376 - cy));
  const ups = fbdForces(p, s).filter((F) => F.dy < 0);
  const label = (y, text) => `<g class="vec vec-force"><text class="vec-label" x="${FORCE_X + 10}" y="${r1(y)}">${text}</text></g>`;
  let base = cy, lastY = Infinity;
  const upSvg = ups.map((F) => {
    const l = Math.max(4, len * (F.value / r.weight));
    const ly = Math.min(base - l / 2 + 4, lastY - 15);
    const out = arrow(FORCE_X, base, FORCE_X, base - l, 'force', '') + label(ly, subs(`${F.key === 'Tmaks' ? 'T' : F.label} = ${forceText(F.value, f)}`));
    base -= l; lastY = ly;
    return out;
  }).join('');
  const forces = `
      <circle class="vec-dot" cx="${FORCE_X}" cy="${r1(cy)}" r="4"/>
      ${upSvg}
      ${arrow(FORCE_X, cy, FORCE_X, cy + len, 'force', '')}${label(cy + len / 2 + 4, subs(`F_{g} = ${forceText(r.weight, f)}`))}`;

  return svg(
    `
    <rect class="sky" x="0" y="0" width="600" height="${GROUND}"/>
    <g class="city"><rect x="170" y="190" width="46" height="155"/><rect x="226" y="150" width="34" height="195"/><rect x="530" y="250" width="60" height="95"/><rect x="290" y="250" width="40" height="95"/></g>
    <rect class="ground" x="0" y="${GROUND}" width="600" height="35"/>
    ${crane()}
    <g class="dk-worker" transform="translate(160 ${GROUND})"><path d="M-2 0L0 -6L2 0M0 -6V-10.5M-2.5 -9L2.5 -9"/><circle cx="0" cy="-11.6" r="1.4"/></g>
    ${plant(30, GROUND - 22, 0.9)}
    ${gap}
    <path class="target-line" d="M${DIM_X - 8} ${r1(targetY)}H${HOOK_X + 46}"/>
    ${load(g, s.phase)}
    ${gauge(p, r, s, f)}
    ${status}
    ${fbd(p, r, s, f)}
    <g class="layer layer-labels">
      ${dim(DIM_X, targetY, GROUND)}
    </g>
    <g class="layer layer-forces">${forces}
    </g>
    <g class="layer layer-motion">
      ${s.position > 0 ? arrow(S_ARROW_X, GROUND, S_ARROW_X, crateBottomY(s.position), 'disp', 's', { labelSide: 'center' }) : ''}
    </g>
  `,
    `Derek mengangkat kotak ${f(p.mass)} kilogram setinggi ${f(p.height)} meter`
  );
}

export const camera = { desktop: '0 0 600 380', portrait: '96 0 504 380' };

/** The ± load panel stays at the bottom centre: the crate column (x ≥ 446) and the height handle (x = 140) are outside it. */
export const loadOffset = { desktop: [0, 0], portrait: [0, 0] };

/** Drag handle for an interactive parameter, in scene coordinates (on the drawn target line). */
export function handle(key, p) {
  return { x: DIM_X, y: crateBottomY(p.height), axis: 'y', factor: -1 / PX_PER_M };
}
