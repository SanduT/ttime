import Big from 'big.js';

import { TTimeError } from './errors';

/** A decimal amount with its currency, as stored in the vault. */
type MoneyValue = { readonly amount: string; readonly currency: string };

const AMOUNT = /^\d+(\.\d+)?$/;
const SECONDS_PER_HOUR = 3600;

/**
 * Normalizes typed money (`50`, `50.5`, `50,50`) to a vault decimal string with two places.
 * Throws `input.invalid` for anything else.
 */
export const parseAmount = (text: string): string => {
  const clean = text.trim().replace(',', '.');
  if (!AMOUNT.test(clean)) {
    throw new TTimeError('input.invalid', `"${text}" is not an amount like 50.00`);
  }
  return new Big(clean).toFixed(2);
};

/** What `seconds` of work cost at `rate` per hour, rounded half up to cents. */
export const amountFor = (seconds: number, rate: MoneyValue): MoneyValue => ({
  amount: new Big(rate.amount).times(seconds).div(SECONDS_PER_HOUR).toFixed(2, Big.roundHalfUp),
  currency: rate.currency,
});

/** `1,234.50 EUR`-style text for display. */
export const formatMoney = (money: MoneyValue): string => {
  const [whole = '0', cents = '00'] = new Big(money.amount).toFixed(2).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${cents} ${money.currency}`;
};
