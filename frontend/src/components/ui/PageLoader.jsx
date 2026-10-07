import { useEffect, useLayoutEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import logo from "../../assets/logo/Logo-with-outline.png";

export default function PageLoader({ children, delay = 1200 }) {
  const { pathname, search } = useLocation();
  const key = pathname + search;
  const [readyKey, setReadyKey] = useState(null);
  const loading = readyKey !== key;

  // Stop the browser from restoring the old scroll position on back/forward
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Jump to top before the loader paints
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [key]);

  // Lock page scrolling while the loader is showing
  useEffect(() => {
    if (!loading) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [loading]);

  useEffect(() => {
    const t = setTimeout(() => setReadyKey(key), delay);
    return () => clearTimeout(t);
  }, [key, delay]);

  if (!loading) return children;

  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Loading"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black"
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