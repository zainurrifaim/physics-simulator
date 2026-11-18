// Weightlifter, front view, drawn to one true scale (100 px = 1 m).
// The athlete is a fixed-length rig (rig.js): hands stay on the bar while gripping and the
// body squats/leans to reach a low bar. A failed lift (energy spent below the target)
// shows the bar stopping, the athlete releasing it and the bar falling to the floor.
import { arrow, dimV, tag, plant, svg, sub, vlen } from './draw.js';
import { lifterPose, drawFigure, GRIP_HALF } from './rig.js';
import { BAR_REST_HEIGHT } from '../physics/models.js';

export const FLOOR = 340;
export const PX_PER_M = 100;
export const CX = 300;
const BAR_HALF = 0.95;        // 1,9 m bar
const PLATE_X = 0.78;         // plate centre from the bar centre
const PLATE_R = 0.225;        // Ø 450 mm bumper plates

/** Bar centre in pixels for a state (exported for tests and the drag handle). */
export const barPixelY = (position) => FLOOR - (BAR_REST_HEIGHT + position) * PX_PER_M;

/** Pose for a sampled state (exported so tests check exactly what is drawn). */
export function poseFor(s) {
  return lifterPose({ barY: BAR_REST_HEIGHT + s.position, grip: s.grip !== false });
}

export function render(p, r, s, f) {
  const barY = barPixelY(s.position);
  const targetY = barPixelY(p.height);
  const pose = poseFor(s);
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

  const vecX = CX + 1.1 * PX_PER_M;
  // one fixed scale for A and B (1 000 N → 110 px), so a heavier bar really gets a longer arrow
  const forceRef = 1000;
  const lift = s.liftForce ?? 0;
  const status = s.phase === 'struggle' ? tag(CX, Math.max(110, by - 46), `Energi habis di h = ${f(r.reachable, 2)} m`, 'warn')
    : s.phase === 'drop' || s.phase === 'dropped' ? tag(CX, 112, `Gagal · energi ${f(p.energy)} J < ${f(r.work)} J`, 'warn')
    : s.phase === 'hold' ? tag(CX, 112, 'Berhasil sampai target', 'ok') : '';

  return svg(
    `
    <rect class="wall" x="0" y="0" width="600" height="${FLOOR}"/>
    <rect class="floor" x="0" y="${FLOOR}" width="600" height="40"/>
    <path class="window" d="M40 250V110a45 45 0 0 1 90 0V250Z"/><path class="window-bar" d="M85 66V250M40 160H130"/>
    ${plant(150, FLOOR - 22, 1)}
    <rect class="mat" x="170" y="${FLOOR - 4}" width="260" height="8" rx="4"/>
    ${figure}
    ${barbell}
    ${handsFront}
    <g class="layer layer-labels">
      <path class="target-line" d="M190 ${targetY}H500"/>
      ${dimV(520, targetY, barPixelY(0), `h = ${f(p.height)} m`)}
      ${tag(CX, FLOOR + 22, `m = ${f(p.mass)} kg`)}
      ${tag(110, 40, `E tersedia = ${f(p.energy)} J`, 'accent')}
      ${status}
    </g>
    <g class="layer layer-forces">
      <circle class="vec-dot" cx="${vecX}" cy="${by}" r="4"/>
      ${lift > 0 ? arrow(vecX, by, vecX, by - vlen(lift, forceRef, 110, 20), 'force', `F = ${f(lift, 0)} N`) : ''}
      ${arrow(vecX, by, vecX, by + vlen(r.weight, forceRef, 110, 20), 'force', `F${sub('g')} = ${f(r.weight)} N`)}
    </g>
    <g class="layer layer-motion">
      ${arrow(470, barPixelY(0), 470, targetY, 'disp', 's', { dashed: true, labelSide: 'left' })}
    </g>
  `,
    `Atlet mengangkat barbel ${f(p.mass)} kilogram setinggi ${f(p.height)} meter`
  );
}

export const camera = { desktop: '0 0 600 380', portrait: '165 0 300 380' };

/** ± load panel sits top-right, away from the lifter and the barbell on the floor. */
export const loadOffset = { desktop: [150, -292], portrait: [-10, -292] };

/** Drag handle for an interactive parameter, in scene coordinates. */
export function handle(key, p, portrait = false) {
  return { x: portrait ? 440 : 520, y: barPixelY(p.height), axis: 'y', factor: -1 / PX_PER_M };
}
