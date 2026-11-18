import { arrow, dimV, tag, plant, person, svg, sub } from './draw.js';

const FLOOR = 340;
const PX_PER_M = 100;
const START = FLOOR - 22; // barbell centre when resting on the floor

export function render(p, r, s, f) {
  const barY = START - s.position * PX_PER_M;
  const targetY = START - p.height * PX_PER_M;
  const bend = Math.max(0, Math.min(1, (barY - 250) / 68)) * 34;
  const cx = 300;
  const plates = (x) =>
    `<rect class="plate" x="${x - 7}" y="${barY - 24}" width="14" height="48" rx="3"/><rect class="plate alt" x="${x + (x < cx ? 9 : -17)}" y="${barY - 18}" width="8" height="36" rx="2"/>`;
  const vecX = 410;
  const forceLen = 70;
  const failed = !r.ok && s.q >= 1;

  return svg(
    `
    <rect class="wall" x="0" y="0" width="600" height="${FLOOR}"/>
    <rect class="floor" x="0" y="${FLOOR}" width="600" height="40"/>
    <path class="window" d="M70 250V110a45 45 0 0 1 90 0V250Z"/><path class="window-bar" d="M115 66V250M70 160H160"/>
    ${plant(170, FLOOR - 22, 1)}
    <rect class="mat" x="200" y="${FLOOR - 4}" width="200" height="8" rx="4"/>
    ${person(cx, FLOOR, { hands: [cx - 46, barY, cx + 46, barY], bend })}
    <path class="bar" d="M205 ${barY}H395"/>
    ${plates(222)}${plates(378)}
    <g class="layer layer-labels">
      <path class="target-line" d="M200 ${targetY}H500"/>
      ${dimV(520, targetY, START, `h = ${f(p.height)} m`)}
      ${tag(300, FLOOR + 22, `m = ${f(p.mass)} kg`)}
      ${tag(110, 40, `E tersedia = ${f(p.energy)} J`, 'accent')}
      ${failed ? tag(300, Math.min(barY - 40, 300), `Energi habis di ${f(r.reachable, 2)} m`, 'warn') : ''}
    </g>
    <g class="layer layer-forces">
      <circle class="vec-dot" cx="${vecX}" cy="${barY}" r="4"/>
      ${arrow(vecX, barY, vecX, barY - forceLen, 'force', `F = ${f(r.weight)} N`)}
      ${arrow(vecX, barY, vecX, barY + forceLen, 'force', `F${sub('g')} = ${f(r.weight)} N`)}
    </g>
    <g class="layer layer-motion">
      ${arrow(470, START, 470, targetY, 'disp', `s`, { dashed: true, labelSide: 'left' })}
    </g>
  `,
    `Atlet mengangkat barbel ${f(p.mass)} kilogram setinggi ${f(p.height)} meter`
  );
}
