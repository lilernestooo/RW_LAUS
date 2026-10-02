import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import SectionTitle from "../components/ui/SectionTitle";

const awards = [
  "The Paragala goes to… RW 95.1 FM – Best Local Radio Station",
  "Award slide 2",
  "Award slide 3",
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

function AwardsCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const prev = () => setIndex((i) => (i - 1 + awards.length) % awards.length);
  const next = () => setIndex((i) => (i + 1) % awards.length);

  // Auto-advance every 4s, paused on hover and when "reduce motion" is on
  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % awards.length), 4000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div
      className="group relative aspect-square w-full overflow-hidden border-4 border-dashed border-yellow-700/60 bg-neutral-800 transition-all duration-500 hover:border-yellow-500 hover:shadow-[0_0_40px_-5px_rgba(234,179,8,0.45)]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Sliding track */}
      <div
        className="flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ transform: `translateX(-${index * 100}%)` }}
      >
        {awards.map((text, i) => (
          <div
            key={i}
            className="flex h-full w-full shrink-0 items-center justify-center p-6 text-center text-sm text-neutral-400"
          >
            <span
              className={`transition-all duration-700 ${
                i === index ? "translate-y-0 opacity-100 delay-300" : "translate-y-3 opacity-0"
              }`}
            >
              {text}
            </span>
          </div>
        ))}
      </div>

      {/* Gold shine sweep on hover */}
      <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-yellow-300/20 to-transparent opacity-0 transition-all duration-[1200ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

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
        {awards.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-3 rounded-full transition-all duration-500 ${
              i === index ? "w-8 bg-red-500" : "w-3 bg-white/40 hover:bg-white/70"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [showTop, setShowTop] = useState(false);

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
            <div className="group relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden border-2 border-dashed border-neutral-600 bg-neutral-900 text-neutral-500 transition-all duration-500 hover:border-red-600 hover:shadow-[0_0_45px_-8px_rgba(230,0,0,0.55)]">
              <span className="transition-transform duration-700 group-hover:scale-105">
                Hero image (RW 95.1 FM – Keni na Ka')
              </span>

              {/* Red glow from the bottom */}
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(230,0,0,0.4),transparent_65%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

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
              <AwardsCarousel />
            </Reveal>

            <Reveal from="right" delay={250}>
              <SectionTitle>Video</SectionTitle>
              {/* Add src when you have the video file */}
              <video
                controls
                className="aspect-video w-full bg-black shadow-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_18px_40px_-10px_rgba(230,0,0,0.55)]"
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