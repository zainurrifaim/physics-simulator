// Side-by-side free-body diagrams for A (blue) and B (red), drawn to one shared
// scale so the arrow lengths can be compared directly.
import { fmt } from '../format.js';

const VW = 440;
const VH = 236;
const MAXLEN = 70;
const MINLEN = 12; // shorter arrows are drawn at this length and flagged "tidak berskala"
const CY = 100;
const CX = 100;

// zero-width tspan resets the baseline shift after a subscript
const tidy = (label) => label.replace(/dy="4">([^<]*)<\/tspan>(?!<tspan dy="-4">​)/g, 'dy="4">$1</tspan><tspan dy="-4">​</tspan>');

// Arrow only; its label lives in the legend below the body so labels can never collide.
function arrow(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const h = Math.min(10, len * 0.45);
  const bx = x2 - ux * h;
  const by = y2 - uy * h;
  return `<path d="M${x1} ${y1}L${bx.toFixed(1)} ${by.toFixed(1)}"/>
    <path class="fh" d="M${x2.toFixed(1)} ${y2.toFixed(1)}L${(bx - uy * 5).toFixed(1)} ${(by + ux * 5).toFixed(1)}L${(bx + uy * 5).toFixed(1)} ${(by - ux * 5).toFixed(1)}Z"/>`;
}

export function forceDiagram(lesson, cases, { stacked = false } = {}) {
  const sets = cases.map((c) => lesson.compare.forces(c.p, c.r));
  const max = Math.max(...sets.flat().map((f) => f.value), 1e-9);
  const colW = stacked ? 250 : VW / 2;
  const cols = cases.map((c, k) => {
    const items = sets[k].map((f, i) => {
      const exact = (f.value / max) * MAXLEN;
      const none = f.value <= 0;
      const small = !none && exact < MINLEN;
      const len = small ? MINLEN : exact;
      const x0 = CX + (f.ox ?? 0), y0 = CY + (f.oy ?? 0);
      const ly = 188 + i * 14;
      const mark = none ? '' : arrow(x0, y0, x0 + f.dx * len, y0 + f.dy * len);
      const note = small ? ' (tak berskala)' : '';
      return `<g class="fa fa-${c.cls}">${mark}
        <path d="M10 ${ly - 4}h14"${none ? ' stroke-dasharray="2 3"' : ''}/>
        <text x="30" y="${ly}">${tidy(f.label)} = ${fmt(f.value, 0)} N${note}</text></g>`;
    });
    return `<g transform="translate(${stacked ? 0 : k * colW} ${stacked ? k * VH : 0})"><rect class="fbody" x="${CX - 9}" y="${CY - 9}" width="18" height="18" rx="3"/>${items.join('')}
      <text class="fcase fcase-${c.cls}" x="10" y="24">${c.cls.toUpperCase()}</text></g>`;
  });
  return `<svg class="fbd" viewBox="0 0 ${stacked ? colW : VW} ${stacked ? VH * cases.length : VH}" role="img" aria-label="${lesson.compare.diagram} untuk A dan B">
    <path class="fsep" d="${stacked ? `M10 ${VH + 7}H${colW - 10}` : `M${colW} 20V${VH - 10}`}"/>
    ${cols.join('')}
  </svg>`;
}
