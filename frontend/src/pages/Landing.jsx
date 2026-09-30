import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { posts } from "../data/posts";
import PostCard from "../components/post/PostCard";
import Pagination from "../components/post/Pagination";
import Sidebar from "../components/sidebar/Sidebar";
import Spinner from "../components/ui/Spinner";
import { useState } from "react";

const PAGE_SIZE = 10;

export default function Landing() {
  const [searchParams, setSearchParams] = useSearchParams();
  const totalPages = Math.ceil(posts.length / PAGE_SIZE);

  const pageFromUrl = Number(searchParams.get("page")) || 1;
  const page = Math.min(Math.max(pageFromUrl, 1), totalPages);

  const [showTop, setShowTop] = useState(false);
  const [loading, setLoading] = useState(false);

  const visible = posts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const goToPage = (n) => {
    setLoading(true);
    window.scrollTo({ top: 0 });
    setTimeout(() => {
      setSearchParams(n === 1 ? {} : { page: n });
      setLoading(false);
    }, 600);
  };

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
      {loading && <Spinner />}

      {/* Main content */}
      <section>
        <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2">
          {visible.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
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