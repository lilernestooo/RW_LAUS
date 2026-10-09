import { useEffect, useRef, useState } from "react";

const colClasses = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

// Returns [ref, shown]: shown flips to true once the element scrolls into view
function useReveal(threshold = 0.1) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, shown];
}

// One tile: fades and zooms in (staggered across the row), then on hover
// the photo zooms, a shine sweeps across and a red bar grows underneath.
function Tile({ src, label, col }) {
  const [ref, shown] = useReveal();

  return (
    <div
      ref={ref}
      className={`group relative aspect-[4/3] overflow-hidden bg-neutral-900 transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-8 scale-90 opacity-0"
      }`}
      style={{ transitionDelay: shown ? `${col * 90}ms` : "0ms" }}
    >
      {src ? (
        <img
          src={src}
          alt={label}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-white/20 bg-neutral-800 text-xs text-neutral-500">
          {label}
        </div>
      )}

      {/* Shine sweep */}
      <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-[900ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

      {/* Red bar along the bottom edge */}
      <span className="absolute bottom-0 left-0 h-1 w-0 bg-[#e60000] transition-all duration-500 ease-out group-hover:w-full" />
    </div>
  );
}

export default function PostGallery({ images = [], count = 0, columns = 3 }) {
  const total = Math.max(images.length, count);
  if (total <= 0) return null;

  const cols = colClasses[columns] ? columns : 3;

  return (
    <div className={`mt-3 grid gap-3 ${colClasses[cols]}`}>
      {Array.from({ length: total }, (_, i) => (
        <Tile key={i} src={images[i]} label={`Photo ${i + 2}`} col={i % cols} />
      ))}
    </div>
  );
}