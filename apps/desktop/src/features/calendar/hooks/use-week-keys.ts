import { useEffect } from 'react';

import { useCalendarStore } from '../store/calendar-store';

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLInputElement ||
  target instanceof HTMLTextAreaElement ||
  target instanceof HTMLSelectElement;

/** ← and → move a week, T jumps to this week, unless a field has focus or a dialog is open. */
export const useWeekKeys = (): void => {
  const step = useCalendarStore((state) => state.step);
  const goToday = useCalendarStore((state) => state.goToday);
  const dialogOpen = useCalendarStore((state) => state.editor !== null);
  useEffect(() => {
    if (dialogOpen) {
      return;
    }
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
  }, [step, goToday, dialogOpen]);
};
