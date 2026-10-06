import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import logo from "../../assets/logo/Logo-with-outline.png";

export default function PageLoader({ children, delay = 1200 }) {
  const { pathname, search } = useLocation();
  const key = pathname + search;
  const [readyKey, setReadyKey] = useState(null);

  // Stop the browser from restoring the old scroll position on back/forward
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Jump to top before the loader paints, so it is fully visible
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [key]);

  useEffect(() => {
    const t = setTimeout(() => setReadyKey(key), delay);
    return () => clearTimeout(t);
  }, [key, delay]);

  if (readyKey === key) return children;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="flex min-h-[70vh] flex-col items-center justify-center"
    >
      <div className="logo-enter flex flex-col items-center">
        {/* Spinning logo with a shimmer sweep */}
        <div className="logo-stage">
          <div className="logo-spin logo-shimmer" style={{ "--logo-mask": `url(${logo})` }}>
            <img
              src={logo}
              alt="RW 95.1 FM"
              className="h-28 w-28 object-contain sm:h-36 sm:w-36"
              draggable="false"
            />
          </div>
        </div>

        {/* Floor shadow that breathes with the spin */}
        <div className="logo-floor mt-6 h-3 w-32 rounded-[50%] bg-black/70 blur-md" />
      </div>
    </div>
  );
}