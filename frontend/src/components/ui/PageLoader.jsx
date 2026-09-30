import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ListPageSkeleton, PostPageSkeleton } from "./PageSkeletons";

export default function PageLoader({ children, delay = 600 }) {
  const { pathname, search } = useLocation();
  const key = pathname + search;
  const [readyKey, setReadyKey] = useState(null);

  // Stop the browser from restoring the old scroll position on back/forward
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Jump to top before the skeleton paints, so it is fully visible
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [key]);

  useEffect(() => {
    const t = setTimeout(() => setReadyKey(key), delay);
    return () => clearTimeout(t);
  }, [key, delay]);

  if (readyKey === key) return children;

  return (
    <div role="status" aria-busy="true" aria-label="Loading">
      {pathname === "/" ? <ListPageSkeleton /> : <PostPageSkeleton />}
    </div>
  );
}