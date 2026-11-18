// Shared SVG drawing helpers for the scenes. Every scene uses a 600 × 380 viewBox.
// Layers (`labels`, `forces`, `motion`) are <g> groups shown/hidden by CSS classes on
// the stage, so the lab toggles and the story steps use the same mechanism.

export const W = 600;
export const H = 380;

const n = (v) => Math.round(v * 10) / 10;

/** Subscript inside SVG <text>. The reset tspan holds a zero-width space: browsers ignore dy on an empty tspan. */
export const sub = (t) => `<tspan class="sub" dy="4">${t}</tspan><tspan dy="-4">​</tspan>`;

/** Arrow with a polygon head (no <marker>, so it survives hidden/duplicated SVGs). */
export function arrow(x1, y1, x2, y2, kind, label, { labelSide = 'right', dashed = false } = {}) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return '';
  const ux = dx / len;
  const uy = dy / len;
  const head = Math.min(13, len * 0.45);
  const bx = x2 - ux * head;
  const by = y2 - uy * head;
  const px = -uy * head * 0.5;
  const py = ux * head * 0.5;
  const lx = labelSide === 'left' ? x2 - 10 : labelSide === 'center' ? (x1 + x2) / 2 : x2 + 10;
  const ly = labelSide === 'center' ? (y1 + y2) / 2 - 10 : (y1 + y2) / 2 + 4;
  const anchor = labelSide === 'left' ? 'end' : labelSide === 'center' ? 'middle' : 'start';
  return `<g class="vec vec-${kind}">
    <path class="vec-line${dashed ? ' dashed' : ''}" pathLength="1" d="M${n(x1)} ${n(y1)}L${n(bx)} ${n(by)}"/>
    <path class="vec-head" d="M${n(x2)} ${n(y2)}L${n(bx + px)} ${n(by + py)}L${n(bx - px)} ${n(by - py)}Z"/>
    ${label ? `<text class="vec-label" x="${n(lx)}" y="${n(ly)}" text-anchor="${anchor}">${label}</text>` : ''}
  </g>`;
}

/** Vertical dimension line with end ticks and a label. */
export function dimV(x, yTop, yBottom, label, side = 'right') {
  const tx = side === 'right' ? x + 8 : x - 8;
  const anchor = side === 'right' ? 'start' : 'end';
  return `<g class="dim">
    <path d="M${x} ${n(yTop)}V${n(yBottom)}M${x - 6} ${n(yTop)}H${x + 6}M${x - 6} ${n(yBottom)}H${x + 6}"/>
    <text x="${tx}" y="${n((yTop + yBottom) / 2 + 4)}" text-anchor="${anchor}">${label}</text>
  </g>`;
}

/** Horizontal dimension line. */
export function dimH(x1, x2, y, label) {
  return `<g class="dim">
    <path d="M${n(x1)} ${y}H${n(x2)}M${n(x1)} ${y - 6}V${y + 6}M${n(x2)} ${y - 6}V${y + 6}"/>
    <text x="${n((x1 + x2) / 2)}" y="${y - 8}" text-anchor="middle">${label}</text>
  </g>`;
}

export function tag(x, y, text, cls = '') {
  const w = text.replace(/<[^>]+>/g, '').length * 7 + 16;
  return `<g class="tag ${cls}"><rect x="${n(x - w / 2)}" y="${y - 13}" width="${n(w)}" height="22" rx="11"/><text x="${x}" y="${y + 2}" text-anchor="middle">${text}</text></g>`;
}

export function plant(x, y, s = 1) {
  return `<g class="plant" transform="translate(${x} ${y}) scale(${s})">
    <path class="pot" d="M-12 0h24l-4 22h-16Z"/>
    <path class="leaf" d="M0 0C-4-14-18-18-22-30C-8-30 0-18 0 0Z"/>
    <path class="leaf" d="M0 0C4-18 14-24 22-36C26-20 12-8 0 0Z"/>
    <path class="leaf alt" d="M0 0C-2-16 2-30 0-44C8-30 6-14 0 0Z"/>
  </g>`;
}

/** Simple flat person standing at (x, footY), body ~150px tall. arms: [lx, ly, rx, ry] hand positions. */
export function person(x, footY, { hands, shirt = 'shirt', bend = 0 } = {}) {
  const hip = footY - 72 + bend * 0.6;
  const shoulder = hip - 58 + bend;
  const head = shoulder - 22;
  const [lx, ly, rx, ry] = hands ?? [x - 26, hip, x + 26, hip];
  const kneeOut = bend * 0.35;
  return `<g class="person">
    <path class="limb" d="M${x - 10} ${n(hip)}L${n(x - 16 - kneeOut)} ${n((hip + footY) / 2)}L${x - 18} ${footY}M${x + 10} ${n(hip)}L${n(x + 16 + kneeOut)} ${n((hip + footY) / 2)}L${x + 18} ${footY}"/>
    <path class="${shirt}" d="M${x - 20} ${n(shoulder)}Q${x} ${n(shoulder - 6)} ${x + 20} ${n(shoulder)}L${x + 16} ${n(hip)}H${x - 16}Z"/>
    <path class="limb arm" d="M${x - 17} ${n(shoulder + 4)}L${n(lx)} ${n(ly)}M${x + 17} ${n(shoulder + 4)}L${n(rx)} ${n(ry)}"/>
    <circle class="skin" cx="${x}" cy="${n(head)}" r="15"/>
    <path class="hair" d="M${x - 15} ${n(head - 2)}Q${x - 12} ${n(head - 20)} ${x + 4} ${n(head - 16)}Q${x + 16} ${n(head - 14)} ${x + 15} ${n(head - 4)}Q${x} ${n(head - 10)} ${x - 15} ${n(head - 2)}Z"/>
  </g>`;
}

export const svg = (body, label) =>
  `<svg class="scene-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet">${body}</svg>`;

/** Scale a vector magnitude to a pixel length within [min, max]. */
export const vlen = (value, ref, max = 90, min = 26) => Math.max(min, Math.min(max, (value / ref) * max));
