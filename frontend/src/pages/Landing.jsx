import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchPosts } from "../api/api";
import useApi from "../hooks/useApi";
import PostCard from "../components/post/PostCard";
import Pagination from "../components/post/Pagination";
import Sidebar from "../components/sidebar/Sidebar";

const PAGE_SIZE = 10;

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
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
      {/* Main content */}
      <section>
        {error && !data ? (
          <p className="text-neutral-300">
            Could not load posts. Make sure Apache and MySQL are running.
          </p>
        ) : loading && !data ? (
          <p className="text-neutral-300">Loading…</p>
        ) : (
          <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2">
            {visible.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
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
  );
}