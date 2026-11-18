import { sample } from '../physics/models.js';
import { fmt } from '../format.js';

const VW = 560;
const VH = 260;
const PAD = { l: 64, r: 16, t: 16, b: 42 };

function niceStep(range, count) {
  const raw = range / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  return (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
}

function ticks(max, count = 4) {
  if (!(max > 0)) return [0, 1];
  const step = niceStep(max, count);
  const out = [];
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(v);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

const compact = (v) => (Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 1)} jt` : Math.abs(v) >= 1e4 ? `${fmt(v / 1e3, 1)} rb` : fmt(v, 2));

/**
 * Line chart of the lesson's series over the motion. `t` places the cursor.
 * Labels in the legend may contain <sub>; they are rendered as HTML outside the SVG.
 */
export function chart(lesson, p, r, t, { draw = false } = {}) {
  const cfg = lesson.chart;
  const series = cfg.series(p, r);
  const lines = cfg.lines ? cfg.lines(p, r) : [];
  const N = 80;
  const times = Array.from({ length: N + 1 }, (_, i) => (r.duration * i) / N);
  const samples = times.map((tt) => sample(lesson.id, p, r, tt));
  let maxY = 0;
  for (const se of series) for (const s of samples) maxY = Math.max(maxY, se.fn(s));
  for (const l of lines) maxY = Math.max(maxY, l.value);
  const yTicks = ticks(maxY * 1.05);
  const yMax = yTicks[yTicks.length - 1];
  const xTicks = ticks(r.duration, 5).filter((v) => v <= r.duration * 1.0001);
  const iw = VW - PAD.l - PAD.r;
  const ih = VH - PAD.t - PAD.b;
  const x = (tt) => PAD.l + (tt / r.duration) * iw;
  const y = (v) => PAD.t + ih - (v / yMax) * ih;

  const grid = yTicks
    .map((v) => `<path class="grid" d="M${PAD.l} ${y(v)}H${VW - PAD.r}"/><text class="tick" x="${PAD.l - 8}" y="${y(v) + 4}" text-anchor="end">${compact(v)}</text>`)
    .join('');
  const xt = xTicks
    .map((v) => `<path class="grid-x" d="M${x(v)} ${PAD.t + ih}v5"/><text class="tick" x="${x(v)}" y="${PAD.t + ih + 18}" text-anchor="middle">${fmt(v, 3)}</text>`)
    .join('');
  const paths = series
    .map((se) => {
      const d = samples.map((s, i) => `${i ? 'L' : 'M'}${x(times[i]).toFixed(1)} ${y(se.fn(s)).toFixed(1)}`).join('');
      return `<path class="series series-${se.kind}${draw ? ' draw' : ''}" pathLength="1" d="${d}"/>`;
    })
    .join('');
  const refs = lines
    .map((l) => `<path class="ref-line" d="M${PAD.l} ${y(l.value)}H${VW - PAD.r}"/><text class="ref-text" x="${VW - PAD.r - 4}" y="${y(l.value) - 6}" text-anchor="end">${l.label}: ${fmt(l.value)} ${cfg.yUnit}</text>`)
    .join('');
  const cur = sample(lesson.id, p, r, t);
  const cursor = draw
    ? ''
    : `<path class="cursor" d="M${x(cur.t)} ${PAD.t}V${PAD.t + ih}"/>` +
      series.map((se) => `<circle class="dot series-${se.kind}" cx="${x(cur.t)}" cy="${y(se.fn(cur))}" r="4.5"/>`).join('');

  const legend = series
    .map((se) => {
      const value = draw ? '' : ` <b>${fmt(se.fn(cur))} ${cfg.yUnit}</b>`;
      return `<span class="legend-item"><i class="swatch series-${se.kind}"></i>${se.label}${value}</span>`;
    })
    .join('');

  return `<figure class="chart">
    <svg viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Grafik ${cfg.yLabel.toLowerCase()} terhadap waktu">
      ${grid}${xt}
      <path class="axis" d="M${PAD.l} ${PAD.t}V${PAD.t + ih}H${VW - PAD.r}"/>
      ${refs}${paths}${cursor}
      <text class="axis-title" x="${PAD.l + iw / 2}" y="${VH - 4}" text-anchor="middle">waktu t (s)</text>
      <text class="axis-title" transform="translate(14 ${PAD.t + ih / 2}) rotate(-90)" text-anchor="middle">${cfg.yLabel} (${cfg.yUnit})</text>
    </svg>
    <figcaption class="legend">${legend}</figcaption>
  </figure>`;
}
