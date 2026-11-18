import { arrow, dimV, tag, svg, sub, vlen } from './draw.js';

const BOTTOM_X = 545;
const BOTTOM_Y = 330;

export function render(p, r, s, f) {
  const sin = p.height / p.length;
  const cos = Math.sqrt(Math.max(0, 1 - sin * sin));
  const scale = Math.min(cos > 1e-6 ? 470 / (p.length * cos) : Infinity, 250 / p.height);
  const topX = BOTTOM_X - p.length * cos * scale;
  const topY = BOTTOM_Y - p.height * scale;
  const d = s.position * scale;
  const cx = topX + d * cos;
  const cy = topY + d * sin;
  const deg = (Math.atan2(sin, cos) * 180) / Math.PI;
  // outward normal of the slope (pointing away from the hill)
  const nx = sin;
  const ny = -cos;
  const bx = cx + nx * 30; // centre of the bike, lifted off the slope
  const by = cy + ny * 30;
  const vLen = r.speed > 0 ? (s.speed / r.speed) * 100 : 0;

  return svg(
    `
    <rect class="sky" x="0" y="0" width="600" height="380"/>
    <circle class="sun" cx="390" cy="58" r="24"/>
    <path class="cloud" d="M250 60a18 18 0 0 1 34-6a14 14 0 0 1 24 10H250Z"/>
    <path class="hill" d="M${topX - 30} ${topY}H${topX}L${BOTTOM_X} ${BOTTOM_Y}H600V380H0V${topY}Z"/>
    <path class="ground" d="M0 ${BOTTOM_Y}H600V380H0Z" opacity="0.6"/>
    <path class="slope-line" d="M${topX} ${topY}L${BOTTOM_X} ${BOTTOM_Y}"/>
    <g class="bike" transform="translate(${cx} ${cy}) rotate(${deg})">
      <circle class="tyre" cx="-20" cy="-15" r="14"/><circle class="tyre" cx="22" cy="-15" r="14"/>
      <path class="frame" d="M-20 -15L-4 -15L10 -34L-12 -34Z M10 -34L22 -15 M-4 -15L-12 -38 M10 -34L12 -42"/>
      <path class="rider-leg" d="M-10 -40L0 -26L-4 -15"/>
      <path class="shirt" d="M-14 -40L-2 -66L8 -62L-2 -38Z"/>
      <path class="rider-arm" d="M2 -60L12 -44"/>
      <circle class="skin" cx="3" cy="-74" r="8"/>
      <path class="helmet" d="M-6 -76a9 9 0 0 1 18 0Z"/>
    </g>
    <g class="layer layer-labels">
      ${dimV(Math.max(30, topX - 24), topY, BOTTOM_Y, `h = ${f(p.height)} m`, 'left')}
      <text class="slope-label" transform="translate(${(topX + BOTTOM_X) / 2 + nx * 18} ${(topY + BOTTOM_Y) / 2 + ny * 18}) rotate(${deg})" text-anchor="middle">L = ${f(p.length)} m</text>
      ${tag(510, 40, `m = ${f(p.mass)} kg`, 'accent')}
      ${tag(510, 72, 'tanpa gesekan')}
    </g>
    <g class="layer layer-forces">
      <circle class="vec-dot" cx="${bx}" cy="${by}" r="3.5"/>
      ${arrow(bx, by, bx, by + 70, 'force', `F${sub('g')} = ${f(r.weight)} N`)}
      ${arrow(bx, by, bx + nx * vlen(r.normal, r.weight, 70), by + ny * vlen(r.normal, r.weight, 70), 'force', 'N', { labelSide: 'left' })}
    </g>
    <g class="layer layer-motion">
      ${arrow(topX + nx * 60, topY + ny * 60, cx + nx * 60, cy + ny * 60, 'disp', '', { dashed: true })}
      ${arrow(bx + cos * 30, by + sin * 30, bx + cos * (30 + vLen), by + sin * (30 + vLen), 'velocity', vLen > 6 ? `v = ${f(s.speed, 1)} m/s` : '')}
    </g>
  `,
    `Pesepeda meluncur menuruni bukit setinggi ${f(p.height)} meter`
  );
}
