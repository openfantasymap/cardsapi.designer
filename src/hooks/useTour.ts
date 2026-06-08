import { useCallback, useState } from 'react';

/** First-run gating for a coach-mark tour, keyed in localStorage. */
export const useTour = (id: string) => {
  const key = `cardforge.tour.${id}`;
  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(key) !== 'done';
    } catch {
      return false;
    }
  });
  const close = useCallback(() => {
    try {
      localStorage.setItem(key, 'done');
    } catch {
      /* ignore */
    }
    setOpen(false);
  }, [key]);
  const start = useCallback(() => setOpen(true), []);
  return { open, start, close };
};
