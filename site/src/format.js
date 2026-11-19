// Indonesian number formatting (decimal comma, dot thousands separator).
const formatters = new Map();

/** Round to n significant figures (for small results such as 0,025 m or 0,005 m/s). */
export const sig = (value, n = 3) => (Number.isFinite(value) && value !== 0 ? Number(value.toPrecision(n)) : value);

export function fmt(value, maxDigits = 2) {
  if (!Number.isFinite(value)) return '–';
  let f = formatters.get(maxDigits);
  if (!f) {
    f = new Intl.NumberFormat('id-ID', { maximumFractionDigits: maxDigits });
    formatters.set(maxDigits, f);
  }
  // avoid "-0"
  return f.format(Math.abs(value) < 1e-12 ? 0 : value);
}

const fixedFormatters = new Map();

/**
 * Fixed number of decimals ("29,0", "28,9"), for values that change while the simulation
 * plays: the text keeps its width, so centred or end-anchored labels don't jitter.
 */
export function fmtFixed(value, digits = 1) {
  if (!Number.isFinite(value)) return '–';
  let f = fixedFormatters.get(digits);
  if (!f) {
    f = new Intl.NumberFormat('id-ID', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    fixedFormatters.set(digits, f);
  }
  return f.format(Math.abs(value) < 0.5 * 10 ** -digits ? 0 : value);
}

/** Parse a number typed by an Indonesian learner: "1.500,5", "1500.5", "1500,5", "1,5". */
export function parseNumber(text) {
  let s = String(text ?? '').trim().replace(/\s/g, '');
  if (!s) return NaN;
  const hasComma = s.includes(',');
  const dots = (s.match(/\./g) || []).length;
  if (hasComma) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (dots > 1 || /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ''); // dots used as thousands separators
  }
  return Number(s);
}

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
