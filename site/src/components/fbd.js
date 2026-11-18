// Side-by-side free-body diagrams for A (blue) and B (red), drawn to one shared
// scale so the arrow lengths can be compared directly.
import { fmt } from '../format.js';

const VW = 360;
const VH = 230;
const MAXLEN = 78;

function arrow(x1, y1, x2, y2, cls, label, value) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const h = Math.min(10, len * 0.45);
  const bx = x2 - ux * h;
  const by = y2 - uy * h;
  const vertical = Math.abs(uy) > 0.5;
  // vertical arrows: label beside the tip; horizontal arrows: label centred above
  const tx = vertical ? x2 + 8 : (x1 + x2) / 2;
  const ty = vertical ? y2 + uy * 6 + 4 : y2 - 10;
  const anchor = vertical ? 'start' : 'middle';
  return `<g class="fa fa-${cls}">
    <path d="M${x1} ${y1}L${bx.toFixed(1)} ${by.toFixed(1)}"/>
    <path class="fh" d="M${x2.toFixed(1)} ${y2.toFixed(1)}L${(bx - uy * 5).toFixed(1)} ${(by + ux * 5).toFixed(1)}L${(bx + uy * 5).toFixed(1)} ${(by - ux * 5).toFixed(1)}Z"/>
    <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}">${label.replace(/dy="4">([^<]*)<\/tspan>(?!<tspan dy="-4">​)/g, 'dy="4">$1</tspan><tspan dy="-4">​</tspan>')} = ${fmt(value, 0)} N</text>
  </g>`;
}

export function forceDiagram(lesson, cases, { stacked = false } = {}) {
  const sets = cases.map((c) => lesson.compare.forces(c.p, c.r));
  const max = Math.max(...sets.flat().map((f) => f.value), 1e-9);
  const cols = cases.map((c, k) => {
    const leftward = sets.flat().some((f) => f.dx < -0.5);
    const cx = leftward ? (stacked || k === 0 ? 118 : 288) : stacked || k === 0 ? 95 : 265;
    const cy = 112;
    const arrows = sets[k]
      .map((f) => {
        // true proportions (no minimum length), so arrows can be compared directly
        const len = Math.max(2, (f.value / max) * MAXLEN);
        // optional ox/oy: start offset in px (e.g. a ground reaction at the bottom face)
        const x0 = cx + (f.ox ?? 0), y0 = cy + (f.oy ?? 0);
        return arrow(x0, y0, x0 + f.dx * len, y0 + f.dy * len, c.cls, f.label, f.value);
      })
      .join('');
    return `<g transform="translate(0 ${stacked ? k * VH : 0})"><rect class="fbody" x="${cx - 9}" y="${cy - 9}" width="18" height="18" rx="3"/>${arrows}
      <text class="fcase fcase-${c.cls}" x="${cx}" y="${VH - 8}" text-anchor="middle">${c.cls.toUpperCase()}</text></g>`;
  });
  return `<svg class="fbd" viewBox="0 0 ${stacked ? 210 : VW} ${stacked ? VH * cases.length : VH}" role="img" aria-label="${lesson.compare.diagram} untuk A dan B">
    <path class="fsep" d="${stacked ? `M10 ${VH + 7}H200` : `M180 20V${VH - 24}`}"/>
    ${cols.join('')}
  </svg>`;
}
