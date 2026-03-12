import { useEffect, useRef, useState } from 'react';

/**
 * Periodically fetches /version.json and returns hasUpdate=true when version changes.
 * @param {number} interval - check interval in ms (default 60000)
 */
export function useVersionCheck(interval = 60000) {
  const [hasUpdate, setHasUpdate] = useState(false);
  const currentRef = useRef(null);
  const timerRef = useRef(null);

  const check = async () => {
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-cache' });
      if (!res.ok) return;
      const data = await res.json();
      if (currentRef.current === null) {
        currentRef.current = data.version;
        return;
      }
      if (data.version !== currentRef.current) {
        setHasUpdate(true);
        clearInterval(timerRef.current);
      }
    } catch {
      // ignore network errors
    }
  };

  useEffect(() => {
    if (!import.meta.env.PROD) return;
    check();
    timerRef.current = setInterval(check, interval);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interval]);

  return { hasUpdate, refresh: () => window.location.reload() };
}
