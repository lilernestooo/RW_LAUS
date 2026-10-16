import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchPosts } from "../api/api";
import useApi from "../hooks/useApi";
import PostCard from "../components/post/PostCard";
import Pagination from "../components/post/Pagination";
import Sidebar from "../components/sidebar/Sidebar";

const PAGE_SIZE = 10;

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
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, shown];
}

// Fade/slide up when scrolled into view
function Reveal({ delay = 0, className = "", children }) {
  const [ref, shown] = useReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const { data, loading, error } = useApi(
    () => fetchPosts({ page, per_page: PAGE_SIZE }),
    [page]
  );
  const visible = data?.data ?? [];
  const totalPages = data?.meta.total_pages ?? 1;

  const [showTop, setShowTop] = useState(false);
  const barRef = useRef(null); // red scroll-progress bar at the top of the screen

  const goToPage = (n) => {
    window.scrollTo({ top: 0 });
    setSearchParams(n === 1 ? {} : { page: n });
  };

  // If the URL asks for a page that doesn't exist (?page=99), jump to the last one
  useEffect(() => {
    if (data && data.meta.total_pages > 0 && page > data.meta.total_pages) {
      const last = data.meta.total_pages;
      setSearchParams(last === 1 ? {} : { page: last }, { replace: true });
    }
  }, [data, page, setSearchParams]);

  useEffect(() => {
    const onScroll = () => {
      setShowTop(window.scrollY > 400);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barRef.current) {
        const progress = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
        barRef.current.style.transform = `scaleX(${progress})`;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <>
      {/* Scroll progress bar */}
      <div
        ref={barRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[60] h-1 w-full origin-left scale-x-0 bg-[#e60000]"
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_345px] w-full min-w-0">
        {/* Main content */}
        <section className="min-w-0 w-full">
          {error && !data ? (
            <p className="text-neutral-300">
              Could not load posts. Make sure Apache and MySQL are running.
            </p>
          ) : loading && !data ? (
            <p className="text-neutral-300">Loading…</p>
          ) : (
            <div className="grid grid-cols-1 gap-x-5 sm:gap-x-6 gap-y-8 sm:gap-y-10 sm:grid-cols-2">
              {visible.map((post, i) => (
                <PostCard key={post.slug} post={post} index={i} />
              ))}
            </div>
          )}

          <Reveal className="mt-8 sm:mt-10">
            <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
          </Reveal>
        </section>

        {/* Sticky sidebar */}
        <Sidebar />

        {/* Back-to-top button */}
        {showTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center bg-red-600 text-white shadow-lg transition-all duration-300 hover:-translate-y-1 hover:bg-red-700 active:scale-95"
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