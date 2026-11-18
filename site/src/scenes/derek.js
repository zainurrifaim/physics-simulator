import { arrow, dimV, tag, plant, svg, sub } from './draw.js';

const GROUND = 345;
const PX_PER_M = 8.5;
const HOOK_X = 400;

export function render(p, r, s, f) {
  const boxBottom = GROUND - s.position * PX_PER_M;
  const boxTop = boxBottom - 40;
  const targetY = GROUND - p.height * PX_PER_M;
  const lattice = Array.from({ length: 11 }, (_, i) => {
    const y = 60 + i * 26;
    return `M100 ${y}L124 ${y + 26}M124 ${y}L100 ${y + 26}`;
  }).join('');
  const slow = !r.ok;

  return svg(
    `
    <rect class="sky" x="0" y="0" width="600" height="${GROUND}"/>
    <g class="city"><rect x="170" y="190" width="46" height="155"/><rect x="226" y="150" width="34" height="195"/><rect x="510" y="230" width="60" height="115"/><rect x="270" y="250" width="40" height="95"/></g>
    <rect class="ground" x="0" y="${GROUND}" width="600" height="35"/>
    <g class="crane">
      <path class="crane-steel" d="M100 60V${GROUND}M124 60V${GROUND}"/>
      <path class="crane-steel thin" d="${lattice}"/>
      <path class="crane-steel" d="M40 50H540M40 64H540"/>
      <path class="crane-steel thin" d="${Array.from({ length: 20 }, (_, i) => `M${40 + i * 25} 64L${52 + i * 25} 50`).join('')}"/>
      <path class="crane-steel thin" d="M112 20L40 50M112 20L540 50"/>
      <rect class="counterweight" x="44" y="64" width="40" height="26" rx="3"/>
      <rect class="cab" x="124" y="64" width="34" height="30" rx="4"/>
      <rect class="crane-steel fill" x="${HOOK_X - 14}" y="62" width="28" height="9" rx="2"/>
      <path class="cable" d="M${HOOK_X} 71V${boxTop - 8}"/>
      <path class="hook" d="M${HOOK_X - 16} ${boxTop}L${HOOK_X} ${boxTop - 10}L${HOOK_X + 16} ${boxTop}"/>
    </g>
    <g class="crate"><rect x="${HOOK_X - 30}" y="${boxTop}" width="60" height="40" rx="3"/><path d="M${HOOK_X - 30} ${boxTop}L${HOOK_X + 30} ${boxBottom}M${HOOK_X + 30} ${boxTop}L${HOOK_X - 30} ${boxBottom}"/></g>
    ${plant(560, GROUND - 22, 0.9)}
    <g class="layer layer-labels">
      <path class="target-line" d="M340 ${targetY}H520"/>
      ${dimV(500, targetY, GROUND, `h = ${f(p.height)} m`)}
      ${tag(HOOK_X - 92, boxBottom - 20, `m = ${f(p.mass)} kg`)}
      ${tag(200, 110, `P = ${f(p.power / 1000, 1)} kW`, 'accent')}
      ${tag(200, 140, `t = ${f(p.time)} s`)}
      ${slow && s.q >= 1 ? tag(HOOK_X, targetY - 30, `Butuh ${f(r.minTime, 1)} s`, 'warn') : ''}
    </g>
    <g class="layer layer-forces">
      ${arrow(HOOK_X + 40, boxTop + 20, HOOK_X + 40, boxTop - 50, 'force', `T = ${f(r.weight)} N`)}
      ${arrow(HOOK_X + 40, boxTop + 20, HOOK_X + 40, boxBottom + 50, 'force', `F${sub('g')} = ${f(r.weight)} N`)}
      <circle class="vec-dot" cx="${HOOK_X + 40}" cy="${boxTop + 20}" r="4"/>
    </g>
    <g class="layer layer-motion">
      ${arrow(550, GROUND, 550, targetY, 'disp', 's', { dashed: true, labelSide: 'left' })}
    </g>
  `,
    `Derek mengangkat kotak ${f(p.mass)} kilogram setinggi ${f(p.height)} meter`
  );
}
