import { useEffect } from 'react';

import { useDayStore } from '../store/day-store';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;

/** ← and → move a day, T jumps to today (PRD 6.3), unless a field has focus. */
export const useDayKeys = (): void => {
  const step = useDayStore((state) => state.step);
  const goToday = useDayStore((state) => state.goToday);
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) {
        return;
      }
      if (event.key === 'ArrowLeft') {
        step(-1);
      } else if (event.key === 'ArrowRight') {
        step(1);
      } else if (event.key.toLowerCase() === 't') {
        goToday();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [step, goToday]);
};
