import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchPosts, fetchCategories, fetchArchives } from "../api/api";
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

// Lists posts for  /category/:slug  or  /archive/:month  (month looks like 2026-09)
export default function PostList() {
  const { slug, month } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);

  const posts = useApi(
    () => fetchPosts({ page, per_page: PAGE_SIZE, category: slug, archive: month }),
    [slug, month, page]
  );

  // Look up the nice name ("Events" / "September 2026") for the heading
  const names = useApi(() => (slug ? fetchCategories() : fetchArchives()), [Boolean(slug)]);
  const list = names.data?.data ?? [];
  const title = names.data
    ? slug
      ? list.find((c) => c.slug === slug)?.name ?? slug
      : list.find((a) => a.value === month)?.label ?? month
    : "";

  const visible = posts.data?.data ?? [];
  const totalPages = posts.data?.meta.total_pages ?? 1;

  const barRef = useRef(null); // red scroll-progress bar at the top of the screen
  const [headRef, headShown] = useReveal();

  const goToPage = (n) => {
    window.scrollTo({ top: 0 });
    setSearchParams(n === 1 ? {} : { page: n });
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug, month]);

  // If the URL asks for a page that doesn't exist, jump to the last one
  useEffect(() => {
    const total = posts.data?.meta.total_pages;
    if (total > 0 && page > total) {
      setSearchParams(total === 1 ? {} : { page: total }, { replace: true });
    }
  }, [posts.data, page, setSearchParams]);

  // Scroll progress bar
  useEffect(() => {
    const onScroll = () => {
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
      <div
        ref={barRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[60] h-1 w-full origin-left scale-x-0 bg-[#e60000]"
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
        <section>
          {/* Heading slides in, red line draws underneath */}
          <div ref={headRef} className="mb-8">
            <h1
              className={`text-3xl font-bold text-white transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                headShown ? "translate-x-0 opacity-100" : "-translate-x-10 opacity-0"
              }`}
            >
              {slug ? "Category: " : "Archives: "}
              <span className="text-red-500">{title}</span>
            </h1>
            <span
              className={`mt-3 block h-1 origin-left bg-[#e60000] transition-all delay-300 duration-700 ease-out ${
                headShown ? "w-24" : "w-0"
              }`}
            />
          </div>

          {posts.error && !posts.data ? (
            <p className="text-neutral-300">
              Could not load posts. Make sure Apache and MySQL are running.
            </p>
          ) : posts.loading && !posts.data ? (
            <p className="text-neutral-300">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="text-neutral-300">No posts found here yet.</p>
          ) : (
            <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2">
              {visible.map((post, i) => (
                <PostCard key={post.slug} post={post} index={i} />
              ))}
            </div>
          )}

          <Reveal className="mt-10">
            <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
          </Reveal>
        </section>

        <Sidebar />
      </div>
    </>
  );
}