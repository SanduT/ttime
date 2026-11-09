import { useEffect, useState } from 'react';

/** Counts how often the window gained focus, so a panel can replay its entrance on each show. */
export const useShownCount = (): number => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const onFocus = (): void => {
      setCount((value) => value + 1);
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);
  return count;
};
