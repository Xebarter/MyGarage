export function formatUgx(amount: number): string {
  return `UGX ${Math.round(Number(amount) || 0).toLocaleString('en-UG')}`;
}
