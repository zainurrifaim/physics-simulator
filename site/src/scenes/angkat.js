// Weightlifter, front view, drawn to one true scale (100 px = 1 m).
// The athlete is a fixed-length rig (rig.js): hands stay on the bar while gripping and the
// body squats/leans to reach a low bar. A failed lift (energy spent below the target)
// shows the bar stopping, the athlete releasing it and the bar falling to the floor.
import { arrow, dimV, tag, plant, svg, sub, vlen } from './draw.js';
import { lifterPose, drawFigure, LIFTER, LIFTER_GRIP_HALF as GRIP_HALF } from './rig.js';
import { BAR_REST_HEIGHT, RELEASE_SECONDS, G } from '../physics/models.js';
import { fbdPanel } from './fbd-panel.js';

/**
 * Free-body diagram of the barbell. Desktop: top-left (x < 150, outside the portrait view).
 * Portrait: a strip under the floor (y > 384, outside the desktop view). Same scale in both.
 */
export const FBD_DESKTOP = { x: 6, y: 8, w: 142, h: 142, k: 0.08, maxLen: 44, cx: 34, cy: 66 };
export const FBD_PORTRAIT = { x: 160, y: 388, w: 340, h: 100, k: 0.08, maxLen: 44, cx: 250, cy: 50 };

/** Forces on the barbell in a sampled state (exported for tests). */
export function fbdForces(p, s) {
  const W = p.mass * G;
  const list = [];
  if (s.liftForce > 0) list.push({ key: 'F', dx: 0, dy: -1, value: s.liftForce, label: 'F' });
  if (s.normal > 0) list.push({ key: 'N', dx: 0, dy: -1, value: s.normal, label: 'N' });
  list.push({ key: 'g', dx: 0, dy: 1, value: W, label: 'F<tspan class="sub" dy="4">g</tspan><tspan dy="-4">​</tspan>' });
  return list;
}

function fbdNotes(p, s, f) {
  const ma = p.mass * (s.acceleration ?? 0);
  if (s.phase === 'lift') {
    if (Math.abs(ma) < 0.5) return ['F = F<tspan class="sub" dy="4">g</tspan><tspan dy="-4">​</tspan> → ΣF = 0', 'kecepatan tetap'];
    return [`ΣF = F − F<tspan class="sub" dy="4">g</tspan><tspan dy="-4">​</tspan> = m·a = ${f(Math.abs(ma), 0)} N`, ma > 0 ? 'ke atas → makin cepat' : 'ke bawah → melambat'];
  }
  if (s.phase === 'hold') return ['F = F<tspan class="sub" dy="4">g</tspan><tspan dy="-4">​</tspan> → ΣF = 0', 'barbel diam di atas'];
  if (s.phase === 'struggle') return ['F = F<tspan class="sub" dy="4">g</tspan><tspan dy="-4">​</tspan> → ΣF = 0', 'energi habis, ditahan'];
  if (s.phase === 'drop') return ['Hanya F<tspan class="sub" dy="4">g</tspan><tspan dy="-4">​</tspan>: jatuh bebas', 'a = g = 10 m/s² ke bawah'];
  return ['N = F<tspan class="sub" dy="4">g</tspan><tspan dy="-4">​</tspan> → ΣF = 0', 'diam di lantai'];
}

export const FLOOR = 340;
export const PX_PER_M = 100;
export const CX = 300;
const BAR_HALF = 0.95;        // 1,9 m bar
const PLATE_X = 0.78;         // plate centre from the bar centre
const PLATE_R = 0.225;        // Ø 450 mm bumper plates

/** Bar centre in pixels for a state (exported for tests and the drag handle). */
export const barPixelY = (position) => FLOOR - (BAR_REST_HEIGHT + position) * PX_PER_M;

/**
 * Pose for a sampled state (exported so tests check exactly what is drawn). After a failed
 * lift the hands leave the bar and the body eases from its last posture to standing.
 */
export function poseFor(s, r) {
  if (s.grip !== false) return lifterPose({ barY: BAR_REST_HEIGHT + s.position, body: LIFTER, gripHalf: GRIP_HALF });
  const release = r ? Math.min(1, Math.max(0, (s.t - r.holdEnd) / RELEASE_SECONDS)) : 1;
  return lifterPose({ barY: BAR_REST_HEIGHT + (r ? r.reachable : 0), release, body: LIFTER, gripHalf: GRIP_HALF });
}

export function render(p, r, s, f) {
  const barY = barPixelY(s.position);
  const targetY = barPixelY(p.height);
  const pose = poseFor(s, r);
  // plate thickness grows with the load; diameter stays standard so the rest height is fixed
  const plateW = Math.max(5, Math.min(26, 4 + p.mass * 0.11));
  const pr = PLATE_R * PX_PER_M;
  const shake = s.phase === 'struggle' ? Math.sin(s.t * 70) * 1.2 : 0;
  const by = barY + shake;
  const plate = (side) => {
    const x = CX + side * PLATE_X * PX_PER_M;
    return `<rect class="plate" x="${x - plateW / 2}" y="${by - pr}" width="${plateW}" height="${2 * pr}" rx="3"/><rect class="plate alt" x="${x + side * (plateW / 2) - (side < 0 ? 6 : 0)}" y="${by - 9}" width="6" height="18" rx="2"/>`;
  };
  const barbell = `<g class="barbell"><path class="bar" d="M${CX - BAR_HALF * PX_PER_M} ${by}H${CX + BAR_HALF * PX_PER_M}"/>${plate(-1)}${plate(1)}</g>`;
  const figure = drawFigure(pose, CX, FLOOR, PX_PER_M);
  const handsFront = s.grip !== false
    ? [-1, 1].map((side) => `<rect class="grip-hand skin" x="${CX + side * GRIP_HALF * PX_PER_M - 5}" y="${by - 6}" width="10" height="12" rx="4"/>`).join('')
    : '';

  const vecX = CX + 1.15 * PX_PER_M;
  // one fixed scale for A and B (1 000 N → 110 px), so a heavier bar really gets a longer arrow
  const forceRef = 1000;
  const lift = s.liftForce ?? 0;
  // fixed status slot under the energy tag, above the highest possible plate top (y ≈ 136)
  const STATUS_Y = 124;
  const status = s.phase === 'struggle' ? tag(CX, STATUS_Y, `Energi habis di h = ${f(r.reachable, 2)} m`, 'warn')
    : s.phase === 'drop' || s.phase === 'dropped' ? tag(CX, STATUS_Y, `Gagal · butuh ${f(r.work)} J > ${f(p.energy)} J`, 'warn')
    : s.phase === 'hold' ? tag(CX, STATUS_Y, 'Berhasil sampai target', 'ok') : '';
  const down = Math.min(vlen(r.weight, forceRef, 110, 20), 376 - by);

  return svg(
    `
    <rect class="wall" x="0" y="0" width="600" height="${FLOOR}"/>
    <rect class="floor" x="0" y="${FLOOR}" width="600" height="40"/>
    <path class="window" d="M40 250V110a45 45 0 0 1 90 0V250Z"/><path class="window-bar" d="M85 66V250M40 160H130"/>
    ${plant(150, FLOOR - 22, 1)}
    <rect class="mat" x="170" y="${FLOOR - 4}" width="260" height="8" rx="4"/>
    <g class="layer layer-forces desktop-detail">${fbdPanel({ ...FBD_DESKTOP, title: 'Diagram gaya barbel' }, fbdForces(p, s), fbdNotes(p, s, f), f, s.phase === 'drop' || s.phase === 'dropped' || s.phase === 'struggle' ? 'warn' : '')}</g>
    <g class="layer layer-forces portrait-detail">${fbdPanel({ ...FBD_PORTRAIT, title: `Diagram gaya pada barbel (m = ${f(p.mass)} kg)` }, fbdForces(p, s), fbdNotes(p, s, f), f, s.phase === 'drop' || s.phase === 'dropped' || s.phase === 'struggle' ? 'warn' : '')}</g>
    ${figure}
    ${barbell}
    ${handsFront}
    <g class="layer layer-labels">
      <path class="target-line" d="M190 ${targetY}H500"/>
      ${dimV(520, targetY, barPixelY(0), `${f(p.height)} m`, "left")}
      <g class="scene-status">${status}</g>
    </g>
    <g class="layer layer-forces">
      <circle class="vec-dot" cx="${vecX}" cy="${by}" r="4"/>
      ${lift > 0 ? arrow(vecX, by, vecX, by - vlen(lift, forceRef, 110, 20), 'force', `F = ${f(lift, 0)} N`) : ''}
      ${arrow(vecX, by, vecX, by + down, 'force', `F${sub('g')} = ${f(r.weight)} N`)}
      ${s.normal ? arrow(vecX - 14, by, vecX - 14, by - vlen(s.normal, forceRef, 110, 20), 'force', 'N', { labelSide: 'left' }) : ''}
    </g>
    <g class="layer layer-motion">
      ${arrow(185, barPixelY(0), 185, targetY, 'disp', 's', { dashed: true, labelSide: 'left' })}
    </g>
  `,
    `Atlet mengangkat barbel ${f(p.mass)} kilogram setinggi ${f(p.height)} meter`
  );
}

export const camera = { desktop: '0 0 600 380', portrait: '150 0 400 492', cleanDesktop: '150 76 400 304', cleanPortrait: '150 76 400 304' };

/** ± load panel sits at the top, away from the lifter and the barbell on the floor. */
export const loadOffset = { desktop: [150, -292], portrait: [4, -292] };

/** Drag handle for an interactive parameter, in scene coordinates. */
export function handle(key, p, portrait = false) {
  return { x: portrait ? 492 : 520, y: barPixelY(p.height), axis: 'y', factor: -1 / PX_PER_M };
}
