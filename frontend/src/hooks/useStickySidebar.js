import { useEffect, useRef } from "react";

const GAP = 20;

export default function useStickySidebar() {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let lastScrollY = window.scrollY;
    let topOffset = GAP;

    const update = () => {
      if (window.innerWidth < 1024) {
        el.style.top = "";
        return;
      }

      const vh = window.innerHeight;
      const elHeight = el.offsetHeight;

      // If sidebar is shorter than the viewport, pin cleanly to the top
      if (elHeight + GAP * 2 <= vh) {
        el.style.top = `${GAP}px`;
        return;
      }

      // If sidebar is taller than viewport, dynamically adjust so:
      // - Scrolling down: pins bottom of sidebar to bottom of viewport (no gap under sidebar)
      // - Scrolling up: pins top of sidebar to top of viewport
      const scrollY = window.scrollY;
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;

      const minTop = vh - elHeight - GAP; // pinned to bottom
      const maxTop = GAP;                 // pinned to top

      topOffset = Math.min(maxTop, Math.max(minTop, topOffset - delta));
      el.style.top = `${Math.round(topOffset)}px`;
    };

    update();

    const onScroll = () => {
      if (window.innerWidth >= 1024) {
        update();
      }
    };

    const onResize = () => {
      topOffset = GAP;
      lastScrollY = window.scrollY;
      update();
    };

    const observer = new ResizeObserver(() => update());
    observer.observe(el);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return ref;
}