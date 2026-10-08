import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import SectionTitle from "../components/ui/SectionTitle";
import { fetchHome } from "../api/api";
import useApi from "../hooks/useApi";

// Shown until you upload real award photos in the admin page
const placeholderAwards = [
  { id: "p1", url: null, caption: "The Paragala goes to… RW 95.1 FM – Best Local Radio Station" },
  { id: "p2", url: null, caption: "Award slide 2" },
  { id: "p3", url: null, caption: "Award slide 3" },
];

// Returns [ref, shown]: shown flips to true once the element scrolls into view
function useReveal(threshold = 0.15) {
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
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, shown];
}

const hidden = {
  up: "translate-y-8 opacity-0",
  left: "-translate-x-10 opacity-0",
  right: "translate-x-10 opacity-0",
  zoom: "scale-90 opacity-0",
};

// Fade/slide in when scrolled into view
function Reveal({ from = "up", delay = 0, className = "", children }) {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        shown ? "translate-x-0 translate-y-0 scale-100 opacity-100" : hidden[from]
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

// Horizontal rule that grows from the left
function GrowRule({ className = "" }) {
  const [ref, shown] = useReveal(0.5);
  return (
    <hr
      ref={ref}
      className={`origin-left border-t border-white/80 transition-transform duration-1000 ease-out ${
        shown ? "scale-x-100" : "scale-x-0"
      } ${className}`}
    />
  );
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

  // Portal: the page sections use transforms, which would trap a fixed overlay
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Award photo"
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
            alt={photo.caption || "Award"}
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

function AwardsCarousel({ awards }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [viewing, setViewing] = useState(null); // index inside `photos`, null = closed

  // Only real uploaded photos can be opened (placeholders have no image)
  const photos = awards.filter((a) => a.url);

  const prev = () => setIndex((i) => (i - 1 + awards.length) % awards.length);
  const next = () => setIndex((i) => (i + 1) % awards.length);

  // Start again from the first slide when the list changes
  useEffect(() => setIndex(0), [awards.length]);

  // Auto-advance every 4s, paused on hover. Off with one slide or "reduce motion"
  useEffect(() => {
    if (paused || viewing !== null || awards.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % awards.length), 4000);
    return () => clearInterval(t);
  }, [paused, viewing, awards.length]);

  return (
    <div
      className="group relative aspect-square w-full overflow-hidden border-4 border-dashed border-yellow-700/60 bg-neutral-800"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Sliding track */}
      <div
        className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {awards.map((a, i) => (
          <div
            key={a.id}
            className="relative flex h-full w-full shrink-0 items-center justify-center text-center text-sm text-neutral-400"
          >
            {a.url ? (
              <>
                <img
                  src={a.url}
                  alt={a.caption || "Award"}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {/* Click anywhere on the photo to open it big */}
                <button
                  onClick={() => setViewing(photos.indexOf(a))}
                  aria-label="View photo larger"
                  className="absolute inset-0 cursor-zoom-in"
                />
                <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-black/60 text-white opacity-0 transition-all duration-300 group-hover:opacity-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16" y2="16" />
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </svg>
                </span>
                {a.caption && (
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-10 pt-8 text-sm font-semibold text-white">
                    {a.caption}
                  </span>
                )}
              </>
            ) : (
              <span
                className={`p-6 transition-all duration-700 ${
                  i === index ? "translate-y-0 opacity-100 delay-300" : "translate-y-3 opacity-0"
                }`}
              >
                {a.caption}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Arrows and dots only make sense with more than one slide */}
      {awards.length > 1 && (
        <>
          <button
            onClick={prev}
            aria-label="Previous award"
            className="absolute left-2 top-1/2 -translate-y-1/2 text-3xl text-white/60 transition-all duration-300 hover:-translate-x-1 hover:text-white"
          >
            ‹
          </button>
          <button
            onClick={next}
            aria-label="Next award"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-3xl text-white/60 transition-all duration-300 hover:translate-x-1 hover:text-white"
          >
            ›
          </button>

          {/* Dots: the active one stretches into a pill */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {awards.map((a, i) => (
              <button
                key={a.id}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-3 rounded-full transition-all duration-500 ${
                  i === index ? "w-8 bg-red-500" : "w-3 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {viewing !== null && (
        <Lightbox photos={photos} index={viewing} onClose={() => setViewing(null)} onChange={setViewing} />
      )}
    </div>
  );
}

export default function Home() {
  const [showTop, setShowTop] = useState(false);

  // Hero image, award photos and video uploaded in the admin page
  const { data } = useApi(() => fetchHome(), []);
  const home = data?.data;

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-neutral-300">
        <Link to="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <span>Homepage</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
        {/* Main content */}
        <section className="overflow-x-clip">
          <Reveal from="left">
            <h1 className="mb-6 text-3xl font-bold text-white">Homepage</h1>
          </Reveal>

          {/* Hero image placeholder */}
          <Reveal from="zoom" delay={100}>
            <div
              className={`group relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden text-neutral-500 ${
                home?.hero ? "bg-black" : "border-2 border-dashed border-neutral-600 bg-neutral-900"
              }`}
            >
              {home?.hero ? (
                <img src={home.hero} alt="RW 95.1 FM" className="h-full w-full object-cover" />
              ) : (
                <span className="transition-transform duration-700 group-hover:scale-105">
                  Hero image (RW 95.1 FM – Keni na Ka')
                </span>
              )}

              {/* Shine sweep */}
              <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-[1200ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

              {/* Red bar along the bottom edge */}
              <span className="absolute bottom-0 left-0 h-1 w-0 bg-[#e60000] transition-all duration-500 ease-out group-hover:w-full" />
            </div>
          </Reveal>

          <GrowRule className="my-10" />

          <div className="grid gap-10 md:grid-cols-2">
            <Reveal from="left" delay={100}>
              <SectionTitle>Awards</SectionTitle>
              <AwardsCarousel awards={home?.awards?.length ? home.awards : placeholderAwards} />
            </Reveal>

            <Reveal from="right" delay={250}>
              <SectionTitle>Video</SectionTitle>
              <video
                key={home?.video || "none"}
                controls
                preload="metadata"
                src={home?.video || undefined}
                className="aspect-video w-full bg-black shadow-lg transition-all duration-500 hover:-translate-y-1"
              />
            </Reveal>
          </div>
        </section>

        {/* Sticky sidebar */}
        <Sidebar />

        {/* Back-to-top button */}
        {showTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center bg-red-600 text-white hover:bg-red-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="6,15 12,9 18,15" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}