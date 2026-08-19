import type { Currency, ExchangeRate } from './types';

export function toDkk(amount: number, currency: Currency, rates: ExchangeRate[]): number {
  if (currency === 'DKK') return amount;
  const rate = rates.find((r) => r.currency === currency)?.rate_to_dkk;
  return rate ? amount * rate : amount;
}

export function formatDkk(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}
