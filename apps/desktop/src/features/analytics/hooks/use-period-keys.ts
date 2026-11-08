import { useEffect } from 'react';

import { useAnalyticsStore } from '../store/analytics-store';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;

/** ← and → move a period, T returns to the current one, unless a field has focus. */
export const usePeriodKeys = (): void => {
  const shift = useAnalyticsStore((state) => state.shift);
  const choose = useAnalyticsStore((state) => state.choose);
  const period = useAnalyticsStore((state) => state.period);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        shift(-1);
      } else if (event.key === 'ArrowRight') {
        shift(1);
      } else if (event.key.toLowerCase() === 't') {
        choose(period);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [shift, choose, period]);
};
