/**
 * Format UGX amounts and public service price ranges for buyers (mobile).
 */

export function formatUgxAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) return 'UGX 0';
  return `UGX ${Math.round(amount).toLocaleString('en-UG')}`;
}

export type ServicePriceRange = {
  serviceName: string;
  minPriceUgx: number;
  maxPriceUgx: number;
  providerCount: number;
};

export function formatServicePriceRangeLabel(
  range: Pick<ServicePriceRange, 'minPriceUgx' | 'maxPriceUgx' | 'providerCount'> | null | undefined,
): string {
  if (!range) return 'Price on request';
  const min = Math.round(range.minPriceUgx);
  const max = Math.round(range.maxPriceUgx);
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 'Price on request';
  if (min === max || range.providerCount <= 1) return formatUgxAmount(min);
  return `${formatUgxAmount(min)} – ${formatUgxAmount(max).replace(/^UGX\s*/, '')}`;
}
