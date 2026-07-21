import { useCallback, useEffect, useRef, useState } from "react";

export type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: unknown;
  reload: () => void;
};

/** Small fetch-state helper so every page gets loading/error states for free. */
export function useAsync<T>(load: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);
  const loadRef = useRef(load);
  const resolvedKeyRef = useRef<unknown[] | null>(null);
  loadRef.current = load;
  const requestKey = [tick, ...deps];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    loadRef
      .current()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) {
          resolvedKeyRef.current = requestKey;
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  const reload = useCallback(() => setTick((value) => value + 1), []);
  const isCurrent = resolvedKeyRef.current !== null
    && resolvedKeyRef.current.length === requestKey.length
    && resolvedKeyRef.current.every((value, index) => Object.is(value, requestKey[index]));

  return {
    data: isCurrent ? data : null,
    loading: loading || !isCurrent,
    error: isCurrent ? error : null,
    reload,
  };
}
