/**
 * format.js — Formatting utilities for the dashboard.
 * £19.5m, £30m, 1.63×, percentages.
 */

/** Format money in millions GBP (£Xm / £X.Xm) */
export function formatMoney(m) {
  if (m == null) return '—';
  const n = Number(m);
  if (Number.isNaN(n)) return '—';
  if (Math.abs(n) >= 100) return `£${Math.round(n).toLocaleString('en-GB')}m`;
  if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 1e-9) return `£${Math.round(n)}m`;
  return `£${Number(n.toFixed(1))}m`;
}

/** Format Value Index to 2 decimals with × suffix */
export function formatVI(vi) {
  if (vi == null) return '—';
  return `${vi.toFixed(2)}×`;
}

/** Format percentage */
export function formatPct(val) {
  if (val == null) return '—';
  return `${(val * 100).toFixed(1)}%`;
}

/** Format large number with commas */
export function formatNum(n) {
  if (n == null) return '—';
  return n.toLocaleString('en-GB');
}

/** Get the CSS colour for a quadrant */
export function quadrantColour(q) {
  const map = {
    'Steal': 'var(--steal)',
    'Star': 'var(--star)',
    'Overpaid': 'var(--overpaid)',
    'Passenger': 'var(--passenger)',
    'Too few matches': 'var(--too-few)',
    'Unpriced': 'var(--unpriced)',
  };
  return map[q] || 'var(--faint)';
}

/** Raw hex colour for Recharts (CSS vars don't work there); same values as lib/chart.jsx QUADRANT */
export function quadrantHex(q) {
  const map = {
    'Steal': 'var(--green)',
    'Star': 'var(--blue)',
    'Overpaid': 'var(--pink)',
    'Passenger': 'var(--neutral)',
    'Too few matches': 'var(--neutral-2)',
    'Unpriced': 'var(--neutral-3)',
  };
  return map[q] || 'var(--faint)';
}
