import { useSearchParams } from "react-router-dom";
import { fetchPosts } from "../api/api";
import useApi from "../hooks/useApi";
import PostCard from "../components/post/PostCard";
import Sidebar from "../components/sidebar/Sidebar";

export default function Search() {
  const [params] = useSearchParams();
  const q = (params.get("s") || "").trim();

  const { data, loading, error } = useApi(
    () => (q ? fetchPosts({ q, per_page: 50 }) : Promise.resolve({ data: [] })),
    [q]
  );
  const results = data?.data ?? [];

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
      <section>
        <h1 className="mb-8 text-3xl font-bold text-white">
          Search results for: <span className="text-red-500">{q}</span>
        </h1>

        {loading ? (
          <p className="text-neutral-300">Searching…</p>
        ) : error ? (
          <p className="text-neutral-300">
            Could not load results. Make sure Apache and MySQL are running.
          </p>
        ) : results.length > 0 ? (
          <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2">
            {results.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-neutral-300">
            Nothing found. Try a different keyword.
          </p>
        )}
      </section>

      <Sidebar />
    </div>
  );
}