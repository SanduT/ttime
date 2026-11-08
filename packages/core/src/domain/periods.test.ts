import { describe, expect, test } from 'bun:test';

import { monthRange, presetRange, recentMonths, shiftRange } from './periods';

// 2026-11-08 is a Sunday.
const TODAY = '2026-11-08';

describe('periods', () => {
  test('weeks are full weeks from the week start', () => {
    expect(presetRange('this-week', TODAY, 'monday')).toEqual({
      from: '2026-11-02',
      to: '2026-11-08',
    });
    expect(presetRange('last-week', TODAY, 'monday')).toEqual({
      from: '2026-10-26',
      to: '2026-11-01',
    });
    expect(presetRange('this-week', TODAY, 'sunday')).toEqual({
      from: '2026-11-08',
      to: '2026-11-14',
    });
  });

  test('months are full calendar months', () => {
    expect(presetRange('this-month', TODAY, 'monday')).toEqual({
      from: '2026-11-01',
      to: '2026-11-30',
    });
    expect(presetRange('last-month', '2026-03-15', 'monday')).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  test('recentMonths counts back across years', () => {
    expect(recentMonths('2026-02-10', 3)).toEqual(['2026-02', '2026-01', '2025-12']);
  });

  test('today and this year', () => {
    expect(presetRange('today', TODAY, 'monday')).toEqual({ from: TODAY, to: TODAY });
    expect(presetRange('this-year', TODAY, 'monday')).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });

  test('shiftRange steps by the period kind', () => {
    const week = presetRange('this-week', TODAY, 'monday');
    expect(shiftRange(week, 'this-week', -1)).toEqual({ from: '2026-10-26', to: '2026-11-01' });
    expect(shiftRange({ from: '2026-01-01', to: '2026-01-31' }, 'this-month', 1)).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
    });
    expect(shiftRange({ from: '2026-01-01', to: '2026-12-31' }, 'this-year', -1)).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
    });
    expect(shiftRange({ from: TODAY, to: TODAY }, 'today', 1)).toEqual({
      from: '2026-11-09',
      to: '2026-11-09',
    });
    expect(shiftRange({ from: '2026-11-01', to: '2026-11-10' }, 'custom', 1)).toEqual({
      from: '2026-11-11',
      to: '2026-11-20',
    });
  });
});
