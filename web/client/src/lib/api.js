export const API = '/api';

export async function getJson(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`API ${path} failed`);
  return res.json();
}

export const money = n =>
  n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export const pct = n => (n == null ? '—' : `${(n * 100).toFixed(1)}%`);
