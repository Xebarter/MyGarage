export function formatUgx(amount: number): string {
  return `UGX ${Math.round(Number(amount) || 0).toLocaleString('en-UG')}`;
}

/** Short label for tight stats (profile tiles, cards). */
export function formatUgxCompact(amount: number): string {
  const n = Math.round(Number(amount) || 0);
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    const label = m >= 10 || Number.isInteger(m) ? String(Math.round(m)) : m.toFixed(1).replace(/\.0$/, '');
    return `UGX ${label}M`;
  }
  if (n >= 10_000) return `UGX ${Math.round(n / 1_000)}K`;
  return formatUgx(n);
}
