// A-versus-B line graph in the minimal style of the reference reels:
// one quantity against time, case A in blue, case B in red, end dots and an
// optional dashed limit line.
import { sample } from '../physics/models.js';
import { fmt } from '../format.js';

const VW = 360;
const PAD = { l: 48, r: 14, t: 26, b: 30 };

function niceMax(v) {
  if (!(v > 0)) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}
const compact = (v) => (Math.abs(v) >= 1e6 ? `${fmt(v / 1e6, 1)} jt` : Math.abs(v) >= 1e4 ? `${fmt(v / 1e3, 1)} rb` : fmt(v, 2));

/**
 * cases: [{ p, r, cls: 'a' | 'b' }]; total: shared time axis length; t: cursor time.
 */
export function compareChart(lesson, cases, total, t, { reveal = true, tall = false } = {}) {
  const VH = tall ? 600 : 230;
  const g = lesson.compare.graph;
  const N = 120;
  // include every precomputed track point (e.g. the lift's 0,07 s overspeed trip) so short events are not smoothed away
  const extra = cases.flatMap((c) => (c.r.track ?? []).map((pt) => pt.t)).filter((tt) => tt > 0 && tt < total);
  const times = [...new Set([...Array.from({ length: N + 1 }, (_, i) => (total * i) / N), ...extra])].sort((a, b) => a - b);
  const value = (c, tt) => g.fn(sample(lesson.id, c.p, c.r, tt), c.p, c.r, tt);
  const data = cases.map((c) => times.map((tt) => value(c, tt)));
  const limits = g.line ? cases.map((c) => ({ ...g.line(c.p), cls: c.cls })) : [];
  const sharedLimit = limits.length === 2 && limits[0].value === limits[1].value;
  const maxY = niceMax(Math.max(...data.flat(), ...limits.map((l) => l.value), 0) * 1.1);
  const iw = VW - PAD.l - PAD.r;
  const ih = VH - PAD.t - PAD.b;
  const x = (tt) => PAD.l + (tt / total) * iw;
  const y = (v) => PAD.t + ih - (v / maxY) * ih;
  const same = data.length === 2 && data[0].every((v, i) => Math.abs(v - data[1][i]) <= maxY * 0.002);

  const cut = reveal ? total : Math.min(t, total);
  const paths = cases
    .map((c, k) => {
      const pts = times.map((tt, i) => [tt, data[k][i]]).filter(([tt]) => tt <= cut + 1e-12);
      if (cut > 0 && pts[pts.length - 1]?.[0] < cut) pts.push([cut, value(c, cut)]);
      if (pts.length < 2) return '';
      const d = pts.map(([tt, v], i) => `${i ? 'L' : 'M'}${x(tt).toFixed(1)} ${y(v).toFixed(1)}`).join('');
      const [lt, lv] = pts[pts.length - 1];
      return `<path class="cl cl-${c.cls}${same && c.cls === 'b' ? ' same' : ''}" d="${d}"/><circle class="cd cd-${c.cls}" cx="${x(lt).toFixed(1)}" cy="${y(lv).toFixed(1)}" r="4"/>`;
    })
    .join('');

  const ticks = [0, maxY / 2, maxY]
    .map((v) => `<text class="ct" x="${PAD.l - 6}" y="${y(v) + 4}" text-anchor="end">${compact(v)}</text>`)
    .join('');
  const ref = (sharedLimit ? limits.slice(0, 1) : limits).map((line) => `<path class="cref" style="stroke:${sharedLimit ? '#888' : `var(--case-${line.cls})`}" d="M${PAD.l} ${y(line.value)}H${VW - PAD.r}"/><text class="cref-t" x="${VW - PAD.r}" y="${y(line.value) - 5}" text-anchor="end">${sharedLimit ? 'A/B' : line.cls.toUpperCase()} · ${line.label} ${compact(line.value)} ${g.unit}</text>`).join('');
  const cursor = reveal ? '' : `<path class="ccur" d="M${x(Math.min(t, total))} ${PAD.t}V${PAD.t + ih}"/>`;

  return `<svg class="cmp-chart" viewBox="0 0 ${VW} ${VH}" role="img" aria-label="Grafik ${g.label} terhadap waktu untuk A dan B">
    <path class="cax" d="M${PAD.l} ${PAD.t + ih}H${VW - PAD.r}M${PAD.l} ${PAD.t + ih}V${PAD.t - 8}"/>
    <path class="cax-head" d="M${PAD.l - 4} ${PAD.t - 4}L${PAD.l} ${PAD.t - 12}L${PAD.l + 4} ${PAD.t - 4}Z"/>
    <text class="clabel" x="${PAD.l + 8}" y="${PAD.t - 6}">${g.label} (${g.unit})</text>
    ${ticks}${ref}${cursor}${paths}
    <text class="ct" x="${PAD.l}" y="${VH - 10}" text-anchor="middle">0</text>
    <text class="ct" x="${VW - PAD.r}" y="${VH - 10}" text-anchor="end">waktu · ${fmt(total, total < 1 ? 3 : 1)} s</text>
  </svg>`;
}
