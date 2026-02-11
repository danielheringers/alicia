import { useEffect, useState } from "react";

export const useTimer = (enabled: boolean, intervalMs: number): number => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setTick(0);
      return;
    }

    const timer = setInterval(() => {
      setTick((current) => current + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, intervalMs]);

  return tick;
};
