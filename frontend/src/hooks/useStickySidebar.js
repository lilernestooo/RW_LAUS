import { useLayoutEffect, useRef } from "react";

const GAP = 16;

export default function useStickySidebar() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      el.style.top = `${Math.min(GAP, window.innerHeight - el.offsetHeight - GAP)}px`;
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return ref;
}