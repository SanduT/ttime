import { describe, expect, test } from 'bun:test';

import { errorCodeOf } from '../testing/errors';
import { amountFor, decimalHours, formatMoney, parseAmount, sumMoney } from './money';

describe('money', () => {
  test('parseAmount normalizes to two decimals', () => {
    expect(parseAmount('50')).toBe('50.00');
    expect(parseAmount(' 50,5 ')).toBe('50.50');
  });

  test('parseAmount rejects other text', async () => {
    expect(await errorCodeOf(Promise.resolve().then(() => parseAmount('-3')))).toBe(
      'input.invalid',
    );
  });

  test('amountFor prices seconds at an hourly rate, rounding half up', () => {
    expect(amountFor(5400, { amount: '50.00', currency: 'EUR' })).toEqual({
      amount: '75.00',
      currency: 'EUR',
    });
    expect(amountFor(1, { amount: '18.00', currency: 'EUR' }).amount).toBe('0.01');
  });

  test('formatMoney groups thousands', () => {
    expect(formatMoney({ amount: '1234567.5', currency: 'EUR' })).toBe('1,234,567.50 EUR');
  });

  test('decimalHours has two places', () => {
    expect(decimalHours(5400)).toBe('1.50');
    expect(decimalHours(1)).toBe('0.00');
    expect(decimalHours(18)).toBe('0.01');
  });

  test('sumMoney adds per currency', () => {
    expect(
      sumMoney([
        { amount: '10.50', currency: 'USD' },
        { amount: '1.25', currency: 'EUR' },
        { amount: '2.25', currency: 'EUR' },
      ]),
    ).toEqual([
      { amount: '3.50', currency: 'EUR' },
      { amount: '10.50', currency: 'USD' },
    ]);
  });
});
