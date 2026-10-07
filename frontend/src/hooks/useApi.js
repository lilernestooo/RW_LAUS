import { useEffect, useRef, useState } from "react";

const REFRESH_AFTER_MS = 5000; // don't refetch more often than this on tab focus

/**
 * const { data, loading, error } = useApi(() => fetchPosts({ page }), [page]);
 *
 * Also refetches quietly when the user comes back to the tab, so photos
 * uploaded from the admin page show up without pressing refresh.
 */
export default function useApi(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0); // bumps when the tab regains focus
  const lastLoad = useRef(Date.now());
  const lastDeps = useRef(null);

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible" && Date.now() - lastLoad.current > REFRESH_AFTER_MS) {
        lastLoad.current = Date.now();
        setTick((t) => t + 1);
      }
    };
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const key = JSON.stringify(deps);
    const silent = lastDeps.current === key; // same inputs = background refresh, no flicker
    lastDeps.current = key;

    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));

    fn()
      .then((data) => {
        if (cancelled) return;
        lastLoad.current = Date.now();
        setState({ data, loading: false, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        lastLoad.current = Date.now();
        setState((s) => (silent ? s : { data: null, loading: false, error }));
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return state;
}