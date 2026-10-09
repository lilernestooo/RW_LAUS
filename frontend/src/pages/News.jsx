import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPosts } from "../api/api";
import useApi from "../hooks/useApi";
import { formatDate } from "../utils/formatDate";
import Sidebar from "../components/sidebar/Sidebar";
import OnAirBanner from "../components/sidebar/OnAirBanner";

const PAGE_SIZE = 10;
const AUTHOR = "l@usrw951";
const AUTOPLAY_MS = 4000;
const SWIPE_PX = 50;

const tagColor = {
  Events: "bg-[#00b894]",
  News: "bg-[#0090d6]",
  Uncategorized: "bg-red-600",
};

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

// 1 card on phones, 2 on tablets, 3 on desktop
function usePerView() {
  const get = () =>
    window.innerWidth < 640 ? 1 : window.innerWidth < 1200 ? 2 : 3;
  const [perView, setPerView] = useState(get);

  useEffect(() => {
    const onResize = () => setPerView(get());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return perView;
}

function NewsCard({ post }) {
  return (
    <article className="group h-full transition-all duration-300 ease-out hover:-translate-y-2">
      {/* Image with zoom + tint */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        {post.image ? (
          <img
            src={post.image}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-neutral-800 text-xs text-neutral-500 transition-transform duration-500 ease-out group-hover:scale-110">
            Image placeholder
          </div>
        )}

        {/* Shine sweep */}
        <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-[900ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

      </div>

      <div className="mt-4 flex flex-wrap gap-1">
        {post.categories.map((c) => (
          <span
            key={c}
            className={`px-2 py-0.5 text-[11px] font-bold uppercase text-white transition-transform duration-300 group-hover:-translate-y-0.5 ${
              tagColor[c] || "bg-red-600"
            }`}
          >
            {c}
          </span>
        ))}
      </div>

      <h3 className="mt-3 text-justify text-xl font-bold leading-snug">
        <Link
          to={`/${post.slug}`}
          className="text-red-600 underline decoration-red-600 decoration-1 underline-offset-4 transition-all duration-300 group-hover:text-white group-hover:decoration-2"
        >
          {post.title}
        </Link>
      </h3>

      <p className="mt-2 text-xs text-white">
        By {AUTHOR}
        {post.date ? ` / ${formatDate(post.date)}` : ""}
      </p>

      <p className="mt-3 text-justify text-[15px] leading-relaxed text-white">
        {post.excerpt}
      </p>

      <Link
        to={`/${post.slug}`}
        className="mt-4 inline-block border border-white px-3 py-1.5 text-xs font-bold text-white transition-all duration-300 hover:bg-white hover:text-black group-hover:border-red-600 group-hover:bg-red-600"
      >
        Read More
      </Link>
    </article>
  );
}

function PostCarousel({ slides, perView }) {
  const n = slides.length;
  const [index, setIndex] = useState(0);
  const [animate, setAnimate] = useState(true);
  const [paused, setPaused] = useState(false);
  const startX = useRef(null);
  const swiped = useRef(false);

  // Clone the first cards at the end so the loop looks seamless
  const items = [...slides, ...slides.slice(0, perView)];

  const next = () => {
    setAnimate(true);
    setIndex((i) => (i >= n ? i : i + 1));
  };

  const prev = () => {
    if (index === 0) {
      // Jump to the cloned end without animation, then slide back one
      setAnimate(false);
      setIndex(n);
      setTimeout(() => {
        setAnimate(true);
        setIndex(n - 1);
      }, 30);
    } else {
      setAnimate(true);
      setIndex((i) => i - 1);
    }
  };

  const goTo = (i) => {
    setAnimate(true);
    setIndex(i);
  };

  // Autoplay (restarts after every slide change)
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(next, AUTOPLAY_MS);
    return () => clearTimeout(t);
  }, [index, paused]);

  // When the slide reaches the clones, snap back to the real first slide
  const onTransitionEnd = (e) => {
    if (e.target !== e.currentTarget || index < n) return;
    setAnimate(false);
    setIndex(0);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimate(true)));
  };

  // Swipe / drag
  const onPointerDown = (e) => {
    startX.current = e.clientX;
    swiped.current = false;
    setPaused(true);
  };
  const onPointerUp = (e) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    setPaused(false);
    if (Math.abs(dx) > SWIPE_PX) {
      swiped.current = true;
      dx < 0 ? next() : prev();
    }
  };

  return (
    <div>
      <div
        className="relative"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="touch-pan-y select-none overflow-hidden px-1 pb-8 pt-3"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            startX.current = null;
            setPaused(false);
          }}
          onDragStart={(e) => e.preventDefault()}
          onClickCapture={(e) => {
            // Don't open a post when the gesture was a swipe
            if (swiped.current) {
              e.preventDefault();
              e.stopPropagation();
              swiped.current = false;
            }
          }}
        >
          <div
            className={`flex ${
              animate ? "transition-transform duration-500 ease-in-out" : ""
            }`}
            style={{ transform: `translateX(-${(index * 100) / perView}%)` }}
            onTransitionEnd={onTransitionEnd}
          >
            {items.map((post, i) => (
              <div
                key={`${post.slug}-${i}`}
                className="shrink-0 px-3"
                style={{ width: `${100 / perView}%` }}
              >
                <NewsCard post={post} />
              </div>
            ))}
          </div>
        </div>

        {/* Autoplay progress bar: refills on every slide, frozen while paused */}
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-white/10">
          <div
            key={`${index}-${paused}`}
            className="h-full bg-[#e60000]"
            style={
              paused
                ? { width: 0 }
                : { animation: `news-progress ${AUTOPLAY_MS}ms linear forwards` }
            }
          />
        </div>

        <button
          onClick={prev}
          aria-label="Previous posts"
          className="absolute left-0 top-1/2 z-10 flex h-10 w-8 -translate-y-1/2 items-center justify-center bg-black/80 text-white transition-all duration-300 hover:-translate-x-1 hover:scale-110 hover:bg-red-600"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="15,5 8,12 15,19" />
          </svg>
        </button>
        <button
          onClick={next}
          aria-label="Next posts"
          className="absolute right-0 top-1/2 z-10 flex h-10 w-8 -translate-y-1/2 items-center justify-center bg-black/80 text-white transition-all duration-300 hover:translate-x-1 hover:scale-110 hover:bg-red-600"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="9,5 16,12 9,19" />
          </svg>
        </button>
      </div>

      {/* Dots: the active one stretches into a red pill */}
      <div className="mt-8 flex justify-center gap-2">
        {slides.map((s, i) => (
          <button
            key={s.slug}
            onClick={() => goTo(i)}
            aria-label={`Go to post ${i + 1}`}
            className={`h-3 rounded-full transition-all duration-500 ${
              i === index % n ? "w-8 bg-red-500" : "w-3 bg-white/80 hover:bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Wraps the On Air banner: entrance, gentle float, hover scale and shine
function AnimatedBanner() {
  return (
    <Reveal from="zoom" delay={100}>
      <div className="float-slow">
        <div className="group relative cursor-pointer rounded-2xl transition-all duration-500 hover:scale-[1.03]">
          <OnAirBanner />

          {/* Shine sweep */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            <div className="absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-[1200ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />
          </div>
        </div>
      </div>
    </Reveal>
  );
}

export default function News() {
  const perView = usePerView();
  const [showTop, setShowTop] = useState(false);
  const { data } = useApi(() => fetchPosts({ page: 1, per_page: PAGE_SIZE }), []);
  const slides = data?.data ?? [];

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-neutral-300">
        <Link to="/homepage" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <span>Events</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
        {/* Main content */}
        <section className="min-w-0 overflow-x-clip">
          <Reveal from="left">
            <h1 className="mb-6 text-3xl font-bold text-white">Events</h1>
          </Reveal>

          {/* On Air banner (placeholder art until you have the real image) */}
          <div className="mx-auto max-w-[585px] p-2">
            <AnimatedBanner />
          </div>

          <Reveal className="mt-10" delay={150}>
            {slides.length > 0 ? (
              <PostCarousel key={`${perView}-${slides.length}`} slides={slides} perView={perView} />
            ) : (
              <p className="text-neutral-300">Loading…</p>
            )}
          </Reveal>
        </section>

        {/* Sticky sidebar (banner is shown in the main column on this page) */}
        <Sidebar showBanner={false} />

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