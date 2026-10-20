import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchGallery } from "../api/api";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { TITLE_CONFIG } from "../config/titles";

// Placeholder tiles (grey and red only), shown when no photos have been uploaded yet
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
  caption: null,
  background: backgrounds[i % backgrounds.length],
}));

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
        alt={item.caption || `RW 95.1 FM gallery photo ${index + 1}`}
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
      className="group relative block w-full overflow-hidden transition-[opacity,transform] duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform"
      style={style}
    >
      <PhotoFace
        item={item}
        index={index}
        className="transition-transform duration-500 group-hover:scale-105"
      />

      {/* Caption slides up on hover */}
      {item.caption && (
        <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/85 to-transparent px-3 pb-2 pt-8 text-left text-sm text-white transition-transform duration-300 group-hover:translate-y-0">
          {item.caption}
        </span>
      )}

      {/* Red bar that grows along the bottom edge */}
      <span className="pointer-events-none absolute bottom-0 left-0 h-1 w-0 bg-[#e60000] transition-all duration-500 ease-out group-hover:w-full" />
    </button>
  );
}

export default function Gallery() {
  useDocumentTitle(TITLE_CONFIG.pages.gallery);
  const [photos, setPhotos] = useState(null); // null until the first answer arrives
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(null);
  const lastSnapshot = useRef("");
  const touchX = useRef(null);

  // Photos come from the database. Re-checked every 10 seconds and when you return
  // to the tab, so photos uploaded on the admin page appear without a reload.
  useEffect(() => {
    let alive = true;

    const load = () => {
      fetchGallery()
        .then((json) => {
          if (!alive) return;
          const list = (json.data?.photos ?? []).map((p) => ({
            id: p.id,
            src: p.url,
            caption: p.caption,
          }));
          const snapshot = JSON.stringify(list);
          if (snapshot !== lastSnapshot.current) { // only redraw when something changed
            lastSnapshot.current = snapshot;
            setPhotos(list);
          }
          setFailed(false);
        })
        .catch(() => {
          // Keep what is on screen; only report an error if nothing has loaded yet
          if (alive && lastSnapshot.current === "") setFailed(true);
        });
    };

    const refresh = () => { if (!document.hidden) load(); };

    load();
    const timer = setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const hasPhotos = !!photos && photos.length > 0;
  const items = hasPhotos ? photos : photos ? placeholders : [];
  const count = items.length;

  const step = useCallback(
    (d) => setActive((i) => (i === null || !count ? i : (i + d + count) % count)),
    [count]
  );

  // Keyboard controls and page-scroll lock while the viewer is open
  const open = active !== null;
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = before;
    };
  }, [open, step]);

  // Close the viewer if its photo was removed while it was open
  useEffect(() => {
    if (active !== null && !items[active]) setActive(null);
  }, [active, items]);

  const activeItem = active !== null ? items[active] : null;

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    touchX.current = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); // swipe left = next
  };

  return (
    <div className="overflow-x-clip">
      <nav className="mb-4 text-sm text-neutral-400">
        <Link to="/" className="hover:text-white">
          Home
        </Link>
        {" / "}
        <span className="text-neutral-300">Gallery</span>
      </nav>

      <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl">GALLERY</h1>

      {photos === null && !failed && <p className="text-neutral-400">Loading…</p>}

      {photos === null && failed && (
        <p className="text-neutral-300">Could not load the gallery. Please try again later.</p>
      )}

      {photos !== null && !hasPhotos && (
        <p className="mb-4 text-sm text-neutral-400">Photos will appear here once they are uploaded.</p>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <ScatterPhoto key={item.id} item={item} index={i} onOpen={setActive} />
        ))}
      </div>

      {activeItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setActive(null)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="dialog"
          aria-modal="true"
        >
          <figure
            className="flex max-h-full max-w-full flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {activeItem.src ? (
              <img
                key={activeItem.id}
                src={activeItem.src}
                alt={activeItem.caption || ""}
                className="max-h-[80vh] max-w-full object-contain"
              />
            ) : (
              <div
                className="flex aspect-[4/3] w-[min(48rem,90vw)] items-center justify-center text-2xl font-bold text-white/70"
                style={{ background: activeItem.background }}
              >
                Photo {active + 1}
              </div>
            )}
            <figcaption className="mt-3 max-w-2xl text-center text-sm text-neutral-300">
              {activeItem.caption && <span className="block text-base text-white">{activeItem.caption}</span>}
              <span className="text-neutral-400">
                {active + 1} / {count}
              </span>
            </figcaption>
          </figure>

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); step(-1); }}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 px-3 py-4 text-3xl text-white hover:bg-[#e60000] sm:left-4"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); step(1); }}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 px-3 py-4 text-3xl text-white hover:bg-[#e60000] sm:right-4"
              >
                ›
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setActive(null)}
            aria-label="Close"
            className="absolute right-4 top-4 text-3xl text-white hover:text-[#e60000]"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}