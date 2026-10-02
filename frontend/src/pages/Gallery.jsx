import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const modules = import.meta.glob("../assets/images/gallery/*.{jpg,jpeg,png,webp}", {
  eager: true,
  import: "default",
});

const realPhotos = Object.entries(modules)
  .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
  .map(([, src]) => ({ id: src, src }));

// Placeholder tiles (grey and red only), used while the gallery folder is empty
const backgrounds = [
  "linear-gradient(135deg, #1f1f1f, #b30000)",
  "linear-gradient(135deg, #2a2a2a, #3a3a3a)",
  "linear-gradient(135deg, #b30000, #e60000)",
  "linear-gradient(135deg, #3a3a3a, #1a1a1a)",
  "linear-gradient(135deg, #1a1a1a, #e60000)",
  "linear-gradient(135deg, #333333, #8c0000)",
];

const placeholders = Array.from({ length: 18 }, (_, i) => ({
  id: `placeholder-${i}`,
  src: null,
  background: backgrounds[i % backgrounds.length],
}));

const items = realPhotos.length > 0 ? realPhotos : placeholders;

// Deterministic "random" (-1 to 1) so each photo scatters the same way every time
const rand = (seed) => {
  const x = Math.sin(seed * 9999.91) * 10000;
  return (x - Math.floor(x)) * 2 - 1;
};

function PhotoFace({ item, index, className = "" }) {
  if (item.src) {
    return (
      <img
        src={item.src}
        alt={`RW 95.1 FM gallery photo ${index + 1}`}
        loading="lazy"
        className={`block aspect-[4/3] w-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex aspect-[4/3] w-full items-center justify-center text-sm font-bold text-white/70 ${className}`}
      style={{ background: item.background }}
      aria-label={`Placeholder photo ${index + 1}`}
    >
      Photo {index + 1}
    </div>
  );
}

function ScatterPhoto({ item, index, onOpen }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
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
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Scattered starting position
  const x = Math.round(rand(index + 1) * 220);
  const y = Math.round(rand(index + 50) * 160 + 120);
  const rotate = rand(index + 100) * 18;
  const scale = 0.6 + Math.abs(rand(index + 150)) * 0.2;

  const style = shown
    ? {
        opacity: 1,
        transform: "translate(0, 0) rotate(0deg) scale(1)",
        transitionDelay: `${(index % 3) * 120}ms`,
      }
    : {
        opacity: 0,
        transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
      };

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onOpen(index)}
      aria-label={`Open photo ${index + 1}`}
      className="block w-full overflow-hidden transition-[opacity,transform] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
      style={style}
    >
      <PhotoFace item={item} index={index} className="transition-opacity hover:opacity-80" />
    </button>
  );
}

export default function Gallery() {
  const [active, setActive] = useState(null);

  useEffect(() => {
    if (active === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % items.length);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + items.length) % items.length);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  const activeItem = active !== null ? items[active] : null;

  return (
    <div className="overflow-x-clip">
      <nav className="mb-4 text-sm text-neutral-400">
        <Link to="/" className="hover:text-white">
          Home
        </Link>
        {" / "}
        <span className="text-neutral-300">Gallery</span>
      </nav>

      <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl">Gallery</h1>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <ScatterPhoto key={item.id} item={item} index={i} onOpen={setActive} />
        ))}
      </div>

      {activeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
        >
          {activeItem.src ? (
            <img
              src={activeItem.src}
              alt=""
              className="max-h-full max-w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div
              className="flex aspect-[4/3] w-full max-w-3xl items-center justify-center text-2xl font-bold text-white/70"
              style={{ background: activeItem.background }}
              onClick={(e) => e.stopPropagation()}
            >
              Photo {active + 1}
            </div>
          )}
          <button
            type="button"
            onClick={() => setActive(null)}
            aria-label="Close"
            className="absolute right-4 top-4 text-3xl text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}