import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ListPageSkeleton, PostPageSkeleton } from "./PageSkeletons";

export default function PageLoader({ children, delay = 600 }) {
  const { pathname, search } = useLocation();
  const key = pathname + search;
  const [readyKey, setReadyKey] = useState(null);

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