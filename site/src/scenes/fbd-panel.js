// Free-body diagram panel shared by every scene: the object as a dot, every force acting on
// it as an arrow from that dot, drawn to ONE scale (px per newton) chosen by the module so
// A and B are comparable. A force too long for the panel is drawn dashed and marked
// "tidak berskala". Two notes under the diagram explain ΣF for the current phase.
import { arrow } from './draw.js';

const r1 = (v) => Math.round(v * 10) / 10;

/**
 * Arrow lengths for a force list (exported for tests).
 * forces: [{ key, value (N, ≥ 0), dx, dy (unit direction, SVG y down), ox?, oy? }]
 */
export function fbdLayout(forces, { k, maxLen = 90, minLen = 4 }) {
  return forces.filter((F) => F.value > 0).map((F) => {
    const raw = F.value * k;
    return { ...F, len: Math.max(minLen, Math.min(raw, maxLen)), scaled: raw <= maxLen };
  });
}

/**
 * panel: { x, y, w, h, title, k, maxLen, cx?, cy?, kN? } (cx/cy: dot position relative to the panel; kN: print values in kN)
 * forces: as in fbdLayout plus `label` (HTML/SVG text) and optional labelPos 'right'|'left'|'above'|'below'|'tip'
 * notes: up to two short lines
 */
export function fbdPanel(panel, forces, notes, f, cls = '') {
  const { x, y, w, h, title } = panel;
  const cx = x + (panel.cx ?? w / 2), cy = y + (panel.cy ?? 38);
  const laid = fbdLayout(forces, panel);
  const arrows = laid.map((F) => {
    const x0 = cx + (F.ox ?? 0), y0 = cy + (F.oy ?? 0);
    const ex = x0 + F.dx * F.len, ey = y0 + F.dy * F.len;
    const amount = panel.kN ? `${f(F.value / 1000, F.value < 10000 ? 2 : 1)} kN` : `${f(F.value, 0)} N`;
    const text = `${F.label} = ${amount}${F.scaled ? '' : ' (tidak berskala)'}`;
    const pos = F.labelPos ?? (Math.abs(F.dy) > 0.7 ? 'right' : 'above');
    const [tx, ty, anchor] = pos === 'right' ? [x0 + 9, F.dy < 0 ? y0 - 6 : y0 + 14, 'start']
      : pos === 'left' ? [x0 - 9, F.dy < 0 ? y0 - 6 : y0 + 14, 'end']
      : pos === 'below' ? [(x0 + ex) / 2, Math.max(y0, ey) + 12, 'middle']
      : pos === 'tip' ? [ex + F.dx * 6, ey + F.dy * 6 + 4, F.dx > 0.3 ? 'start' : F.dx < -0.3 ? 'end' : 'middle']
      : [F.dx < 0 ? x0 - 10 : x0 + 10, Math.min(y0, ey) - 8, F.dx < 0 ? 'end' : 'start'];
    return `<g class="fbd-f${F.scaled ? '' : ' clamped'}">${arrow(x0, y0, ex, ey, 'force', '')}<text class="fbd-label" x="${r1(tx)}" y="${r1(ty)}" text-anchor="${anchor}">${text}</text></g>`;
  }).join('');
  const [n1 = '', n2 = ''] = notes;
  return `<g class="fbd-panel${cls ? ` ${cls}` : ''}">
    <rect class="fbd-bg" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>
    <text class="fbd-title" x="${x + 8}" y="${y + 14}">${title}</text>
    ${panel.extra ?? ''}
    ${arrows}
    <circle class="fbd-dot" cx="${r1(cx)}" cy="${r1(cy)}" r="4"/>
    <text class="fbd-note" x="${x + 8}" y="${y + h - 21}">${n1}</text>
    <text class="fbd-note" x="${x + 8}" y="${y + h - 6}">${n2}</text>
  </g>`;
}
