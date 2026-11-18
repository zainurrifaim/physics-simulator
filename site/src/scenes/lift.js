import { arrow, dimV, tag, plant, person, svg, sub } from './draw.js';

const GROUND = 355;
const PX_PER_M = 7.5;
const CAB_H = 52;

export function render(p, r, s, f) {
  const cabBottom = GROUND - s.position * PX_PER_M;
  const cabTop = cabBottom - CAB_H;
  const topY = GROUND - p.top * PX_PER_M;
  const bottomY = GROUND - p.bottom * PX_PER_M;
  const marks = [];
  for (let h = 0; h <= 40; h += 5) {
    const y = GROUND - h * PX_PER_M;
    marks.push(`<path class="floor-mark" d="M222 ${y}H232"/><text class="floor-text" x="214" y="${y + 4}" text-anchor="end">${h}</text>`);
  }
  const boxes = Math.min(4, Math.ceil(p.payload / 500));
  const crates = Array.from({ length: boxes }, (_, i) => `<rect class="parcel" x="${308 - (i % 2) * 14}" y="${cabBottom - 12 - Math.floor(i / 2) * 11}" width="13" height="11" rx="1.5"/>`).join('');
  const over = !r.ok;

  return svg(
    `
    <rect class="wall" x="0" y="0" width="600" height="${GROUND}"/>
    <rect class="floor" x="0" y="${GROUND}" width="600" height="25"/>
    <rect class="shaft" x="232" y="18" width="136" height="${GROUND - 18}"/>
    <path class="shaft-rail" d="M244 18V${GROUND}M356 18V${GROUND}"/>
    <rect class="beam" x="226" y="12" width="148" height="10" rx="3"/>
    <circle class="pulley" cx="300" cy="22" r="7"/>
    ${marks.join('')}
    <text class="floor-text" x="214" y="${GROUND + 18}" text-anchor="end">m</text>
    <path class="cable" d="M300 29V${cabTop}"/>
    <g class="cabin">
      <rect x="258" y="${cabTop}" width="84" height="${CAB_H}" rx="4"/>
      <rect class="cabin-inner" x="264" y="${cabTop + 6}" width="72" height="${CAB_H - 6}" rx="2"/>
      <g transform="translate(282 ${cabBottom}) scale(0.32) translate(-300 -340)">${person(300, 340)}</g>
      ${crates}
    </g>
    ${plant(470, GROUND - 22, 1)}
    <g class="layer layer-labels">
      <path class="target-line" d="M232 ${topY}H470"/><path class="target-line" d="M232 ${bottomY}H470"/>
      ${dimV(450, topY, bottomY, `s = ${f(r.drop)} m`)}
      ${tag(110, 60, `m${sub('lift')} = ${f(p.cabin)} kg`)}
      ${tag(110, 92, `muatan = ${f(p.payload)} kg`, over ? 'warn' : '')}
      ${tag(110, 124, `P = ${f(p.power)} W`, 'accent')}
      ${tag(110, 156, `t = ${f(p.time)} s`)}
      ${tag(510, topY - 2, `h${sub('1')} = ${f(p.top)} m`)}
      ${tag(510, bottomY - 2, `h${sub('2')} = ${f(p.bottom)} m`)}
    </g>
    <g class="layer layer-forces">
      ${arrow(300, cabTop + 26, 300, cabTop - 34, 'force', 'T', { labelSide: 'left' })}
      ${arrow(372, cabTop + 26, 372, cabTop + 92, 'force', `F${sub('g')} = ${f(r.weight)} N`)}
    </g>
    <g class="layer layer-motion">
      ${arrow(395, cabTop + 10, 395, cabTop + 60, 'velocity', `v = ${f(r.speed, 2)} m/s`)}
      ${arrow(415, topY, 415, cabBottom, 'disp', '', { dashed: true })}
    </g>
  `,
    `Lift turun dari ${f(p.top)} meter ke ${f(p.bottom)} meter`
  );
}
