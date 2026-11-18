import { arrow, dimH, tag, svg, sub, vlen } from './draw.js';

const ROAD = 300;
const WALL_X = 500;
const CRUMPLE_PX = 60; // schematic: the full stopping distance is drawn as 60 px

export function render(p, r, s, f) {
  const progress = p.distance > 0 ? s.position / p.distance : 0;
  const shift = progress * CRUMPLE_PX;
  const rear = WALL_X - 240 + shift;
  const hoodEnd = WALL_X;
  const cabinEnd = rear + 160;
  const wheel = (x) => `<g class="wheel"><circle cx="${x}" cy="${ROAD - 14}" r="20"/><circle class="hub" cx="${x}" cy="${ROAD - 14}" r="7"/></g>`;
  const crumple = Math.max(0, hoodEnd - cabinEnd);
  // hood top runs from the windscreen (ROAD-76) to the bumper (ROAD-56); it folds as the car stops
  const zig = Array.from({ length: 5 }, (_, i) => {
    const u = (i + 0.5) / 5;
    const base = ROAD - 76 + 20 * u;
    return `${cabinEnd + crumple * u} ${base + (i % 2 ? -1 : 1) * 10 * progress}`;
  }).join(' L');
  const torso = { x: rear + 104, y: ROAD - 96 };
  const broken = r.fails && s.t > 0;
  const brickRows = Array.from({ length: 9 }, (_, i) => `M${WALL_X} ${120 + i * 20}H${WALL_X + 40}`).join('');
  const speedLen = r.v0 > 0 ? (s.speed / r.v0) * 90 : 0;

  return svg(
    `
    <rect class="sky" x="0" y="0" width="600" height="${ROAD}"/>
    <rect class="road" x="0" y="${ROAD}" width="600" height="80"/>
    <path class="road-line" d="M20 ${ROAD + 40}H90M140 ${ROAD + 40}H210M260 ${ROAD + 40}H330M380 ${ROAD + 40}H450"/>
    <g class="test-wall"><rect x="${WALL_X}" y="110" width="40" height="${ROAD - 110}"/><path d="${brickRows}"/></g>
    <g class="car">
      <path class="car-body" d="M${rear} ${ROAD - 30}V${ROAD - 64}Q${rear} ${ROAD - 72} ${rear + 10} ${ROAD - 74}L${rear + 40} ${ROAD - 76}L${rear + 66} ${ROAD - 124}H${cabinEnd - 26}L${cabinEnd} ${ROAD - 76}V${ROAD - 30}Z"/>
      <path class="car-window" d="M${rear + 74} ${ROAD - 80}L${rear + 90} ${ROAD - 116}H${cabinEnd - 32}L${cabinEnd - 14} ${ROAD - 80}Z"/>
      ${crumple > 2 ? `<path class="car-hood" d="M${cabinEnd} ${ROAD - 76}L${zig}L${hoodEnd} ${ROAD - 56}V${ROAD - 30}H${cabinEnd}Z"/>` : ''}
      ${wheel(rear + 40)}${wheel(Math.min(cabinEnd + crumple * 0.4, hoodEnd - 22))}
      <rect class="seat" x="${rear + 82}" y="${ROAD - 112}" width="12" height="48" rx="4"/>
      <g class="dummy">
        <circle cx="${torso.x + 4}" cy="${torso.y - 14}" r="9"/>
        <rect x="${torso.x - 6}" y="${torso.y - 4}" width="18" height="30" rx="6"/>
        <path d="M${torso.x + 8} ${torso.y + 22}H${torso.x + 34}V${torso.y + 40}"/>
      </g>
      <path class="belt${broken ? ' broken' : ''}" d="${broken ? `M${torso.x - 8} ${torso.y - 2}L${torso.x + 2} ${torso.y + 10}M${torso.x + 8} ${torso.y + 16}L${torso.x + 14} ${torso.y + 26}` : `M${torso.x - 8} ${torso.y - 2}L${torso.x + 14} ${torso.y + 26}`}"/>
    </g>
    <g class="layer layer-labels">
      ${dimH(WALL_X - 240, WALL_X - 240 + CRUMPLE_PX, 160, `s = ${f(p.distance)} m`)}
      ${tag(110, 40, `v${sub('0')} = ${f(p.speed)} km/jam`, 'accent')}
      ${tag(110, 72, `m${sub('dummy')} = ${f(p.mass)} kg`)}
      ${tag(110, 104, `M${sub('mobil')} = ${f(p.carMass)} kg`)}
      ${tag(450, 40, `Sabuk robek ≥ ${f(p.limit)} N`)}
      ${s.t > 0 ? tag(450, 72, broken ? 'SABUK ROBEK!' : 'Sabuk menahan', broken ? 'warn' : 'ok') : ''}
    </g>
    <g class="layer layer-forces">
      ${s.speed > 1e-9 || s.t > 0 ? arrow(torso.x, torso.y + 10, torso.x - vlen(r.force, p.limit, 120, 30), torso.y + 10, 'force', `F = ${f(r.force)} N`, { labelSide: 'left' }) : ''}
      ${arrow(torso.x + 4, torso.y + 10, torso.x + 4, torso.y + 50, 'force', `F${sub('g')}`)}
      <circle class="vec-dot" cx="${torso.x}" cy="${torso.y + 10}" r="3.5"/>
    </g>
    <g class="layer layer-motion">
      ${arrow(rear + 70, ROAD - 140, rear + 70 + speedLen, ROAD - 140, 'velocity', speedLen > 4 ? `v = ${f(s.speed, 1)} m/s` : '', { labelSide: 'center' })}
      ${speedLen <= 4 ? tag(rear + 90, ROAD - 140, 'v = 0') : ''}
    </g>
  `,
    `Uji tabrak mobil pada ${f(p.speed)} kilometer per jam dengan dummy bersabuk pengaman`
  );
}
