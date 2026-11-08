import { formatTimestamp, secondsBetween, type Timestamp } from '@ttime/core';
import { useEffect, useState } from 'react';

import { createSystemClock } from '../../../shared/adapters/system';

const clock = createSystemClock();
const TICK_MS = 1000;

const nowStamp = (): Timestamp => formatTimestamp(clock.now());

/** Seconds since `start`, updated every second while `start` is set; 0 when it is null. */
export const useElapsed = (start: Timestamp | null): number => {
  const [now, setNow] = useState(nowStamp);

  useEffect(() => {
    if (start === null) {
      return;
    }
    const timer = setInterval(() => {
      setNow(nowStamp());
    }, TICK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [start]);

  return start === null ? 0 : Math.max(0, secondsBetween(start, now));
};
