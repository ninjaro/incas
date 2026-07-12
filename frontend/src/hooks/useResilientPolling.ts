import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "../api/client";

type PollingOptions<T> = {
  load: () => Promise<T>;
  deps: unknown[];
  intervalMs?: number;
  maxBackoffMs?: number;
  isFinal?: (value: T) => boolean;
};

export function useResilientPolling<T>({
  load,
  deps,
  intervalMs = 90_000,
  maxBackoffMs = 15 * 60_000,
  isFinal,
}: PollingOptions<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const runRef = useRef<((manual?: boolean) => Promise<void>) | null>(null);
  const loadRef = useRef(load);
  const finalRef = useRef(isFinal);
  loadRef.current = load;
  finalRef.current = isFinal;

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let failures = 0;
    let current: T | null = null;

    setData(null);
    setError(null);
    setLoading(true);

    const clearTimer = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = null;
    };
    const schedule = (delay: number) => {
      clearTimer();
      if (cancelled || document.visibilityState === "hidden") return;
      timer = window.setTimeout(() => void run(false), delay);
    };
    const run = async (manual = false) => {
      clearTimer();
      if (cancelled || (!manual && document.visibilityState === "hidden")) return;
      if (!current) setLoading(true);
      try {
        const next = await loadRef.current();
        if (cancelled) return;
        current = next;
        failures = 0;
        setData(next);
        setError(null);
        if (!finalRef.current?.(next)) schedule(intervalMs);
      } catch (nextError) {
        if (cancelled) return;
        failures += 1;
        setError(nextError);
        const retryAfter = nextError instanceof ApiError && nextError.retryAfter
          ? nextError.retryAfter * 1000
          : 0;
        const backoff = Math.min(intervalMs * (2 ** Math.min(failures, 4)), maxBackoffMs);
        schedule(Math.max(retryAfter, backoff));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    runRef.current = run;

    const onVisibility = () => {
      if (document.visibilityState === "hidden") clearTimer();
      else if (!current || !finalRef.current?.(current)) void run(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    void run(false);
    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener("visibilitychange", onVisibility);
      if (runRef.current === run) runRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(async () => {
    await runRef.current?.(true);
  }, []);

  return { data, error, loading, stale: Boolean(data && error), reload };
}
