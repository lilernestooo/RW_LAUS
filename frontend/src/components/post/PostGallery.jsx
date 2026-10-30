import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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

// Full-screen photo viewer. Esc closes, arrow keys / buttons / thumbnails change photo
function Lightbox({ photos, index, onClose, onChange }) {
  const [open, setOpen] = useState(false); // drives the pop-in animation
  const [loaded, setLoaded] = useState(false);
  const photo = photos[index];
  const many = photos.length > 1;

  const go = (step) => onChange((index + step + photos.length) % photos.length);

  useEffect(() => {
    const id = requestAnimationFrame(() => setOpen(true));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // stop the page scrolling behind
    return () => {
      cancelAnimationFrame(id);
      document.body.style.overflow = overflow;
    };
  }, []);

  useEffect(() => setLoaded(false), [index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && many) go(-1);
      if (e.key === "ArrowRight" && many) go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!photo) return null;

  // Portal: the page sections use transforms, which would trap a fixed overlay
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Post photo"
      onClick={onClose}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 px-4 py-6 backdrop-blur-md transition-opacity duration-300 ${
        open ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Close */}
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center bg-white/10 text-2xl text-white transition-all duration-300 hover:rotate-90 hover:bg-red-600"
      >
        ✕
      </button>

      {/* Counter */}
      {many && (
        <span className="absolute left-4 top-6 text-sm font-semibold tracking-widest text-white/70">
          {String(index + 1).padStart(2, "0")} <span className="text-red-500">/</span> {String(photos.length).padStart(2, "0")}
        </span>
      )}

      {/* Photo card pops in */}
      <figure
        onClick={(e) => e.stopPropagation()}
        className={`relative max-w-4xl border-t-4 border-red-600 bg-neutral-900 shadow-2xl shadow-black transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          open ? "translate-y-0 scale-100 opacity-100" : "translate-y-6 scale-90 opacity-0"
        }`}
      >
        <div className="flex min-h-[200px] min-w-[200px] items-center justify-center">
          <img
            key={photo.id}
            src={photo.url}
            alt={photo.caption || "Post photo"}
            onLoad={() => setLoaded(true)}
            className={`max-h-[68vh] w-auto max-w-full object-contain transition-all duration-500 ${
              loaded ? "scale-100 opacity-100" : "scale-95 opacity-0"
            }`}
          />
        </div>
        {photo.caption && (
          <figcaption className="border-t border-white/10 px-5 py-3 text-center text-sm font-semibold text-white">
            {photo.caption}
          </figcaption>
        )}
      </figure>

      {/* Previous / next */}
      {many && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); go(-1); }}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-white/10 text-3xl text-white transition-all duration-300 hover:-translate-x-1 hover:bg-red-600"
          >
            ‹
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); go(1); }}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center bg-white/10 text-3xl text-white transition-all duration-300 hover:translate-x-1 hover:bg-red-600"
          >
            ›
          </button>

          {/* Thumbnails */}
          <div onClick={(e) => e.stopPropagation()} className="mt-4 flex max-w-full gap-2 overflow-x-auto p-1">
            {photos.map((p, i) => (
              <button
                key={p.id}
                onClick={() => onChange(i)}
                aria-label={`Show photo ${i + 1}`}
                className={`h-14 w-14 shrink-0 overflow-hidden border-2 transition-all duration-300 ${
                  i === index ? "scale-110 border-red-500" : "border-transparent opacity-50 hover:opacity-100"
                }`}
              >
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>,
    document.body
  );
}

// One tile: fades and zooms in (staggered across the row), then on hover
// the photo zooms, a shine sweeps across and a red bar grows underneath.
// Tapping a real photo opens it in the lightbox.
function Tile({ src, label, col, onOpen }) {
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
        <>
          <img
            src={src}
            alt={label}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <button
            type="button"
            onClick={onOpen}
            aria-label={`View ${label} larger`}
            className="absolute inset-0 cursor-zoom-in"
          />
          <span className="pointer-events-none absolute right-2 top-2 flex h-8 w-8 items-center justify-center bg-black/60 text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16" y2="16" />
              <line x1="11" y1="8" x2="11" y2="14" />
              <line x1="8" y1="11" x2="14" y2="11" />
            </svg>
          </span>
        </>
      ) : (
        <div className="flex h-full w-full items-center justify-center border-2 border-dashed border-white/20 bg-neutral-800 text-xs text-neutral-500">
          {label}
        </div>
      )}

      {/* Shine sweep */}
      <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-[900ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

      {/* Red bar along the bottom edge */}
      <span className="pointer-events-none absolute bottom-0 left-0 h-1 w-0 bg-[#e60000] transition-all duration-500 ease-out group-hover:w-full" />
    </div>
  );
}

export default function PostGallery({ images = [], count = 0, columns = 3 }) {
  const [viewing, setViewing] = useState(null); // index inside `photos`, null = closed

  const total = Math.max(images.length, count);
  if (total <= 0) return null;

  const cols = colClasses[columns] ? columns : 3;

  // Only real photos can be opened (placeholders have no image)
  const photos = images.filter(Boolean).map((url, i) => ({ id: i, url, caption: "" }));

  return (
    <>
      <div className={`mt-3 grid gap-3 ${colClasses[cols]}`}>
        {Array.from({ length: total }, (_, i) => (
          <Tile
            key={i}
            src={images[i]}
            label={`Photo ${i + 2}`}
            col={i % cols}
            onOpen={() => setViewing(images.slice(0, i).filter(Boolean).length)}
          />
        ))}
      </div>

      {viewing !== null && (
        <Lightbox
          photos={photos}
          index={viewing}
          onClose={() => setViewing(null)}
          onChange={setViewing}
        />
      )}
    </>
  );
}