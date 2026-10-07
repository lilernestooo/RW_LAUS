    import { useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchPosts, fetchCategories, fetchArchives } from "../api/api";
import useApi from "../hooks/useApi";
import PostCard from "../components/post/PostCard";
import Pagination from "../components/post/Pagination";
import Sidebar from "../components/sidebar/Sidebar";

const PAGE_SIZE = 10;

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

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
      <section>
        <h1 className="mb-8 text-3xl font-bold text-white">
          {slug ? "Category: " : "Archives: "}
          <span className="text-red-500">{title}</span>
        </h1>

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
            {visible.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={goToPage} />
      </section>

      <Sidebar />
    </div>
  );
}