import type { Temporal } from '@ttime/core';
import { useEffect, useState } from 'react';

import { createSystemClock } from '../adapters/system';

const clock = createSystemClock();

/** The current time, refreshed every `intervalMs` (default a minute). */
export const useNow = (intervalMs = 60_000): Temporal.ZonedDateTime => {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(clock.now());
    }, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
};
