import { Link, useSearchParams } from "react-router-dom";
import { fetchPosts } from "../api/api";
import useApi from "../hooks/useApi";
import PostCard from "../components/post/PostCard";
import Sidebar from "../components/sidebar/Sidebar";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { TITLE_CONFIG } from "../config/titles";

export default function Search() {
  const [params] = useSearchParams();
  const q = (params.get("s") || "").trim();

  useDocumentTitle(q ? `Search Results for “${q}”` : TITLE_CONFIG.pages.search);

  const { data, loading, error } = useApi(
    () => (q ? fetchPosts({ q, per_page: 50 }) : Promise.resolve({ data: [] })),
    [q]
  );
  const results = data?.data ?? [];

  // Match navigation tabs/pages
  const tabs = [
    {
      title: "Home",
      to: "/homepage",
      description: "RW 95.1 FM Official Homepage - Keni na Ka! News, music, programs, and station updates.",
      keywords: ["home", "homepage", "rw 95.1", "keni na ka", "station"],
    },
    {
      title: "About Us",
      to: "/about",
      description: "Learn about RW 95.1 FM's history, legacy, awards, radio jocks, news anchors, and mission.",
      keywords: ["about", "about us", "history", "station", "djs", "radio jocks", "anchors", "legacy", "awards"],
    },
    {
      title: "Programs",
      to: "/programs",
      description: "Explore our regular programming, news & public affairs programs, schedule, and hosts.",
      keywords: ["programs", "program", "shows", "schedule", "lineup", "regular programming", "public affairs"],
    },
    {
      title: "News & Events",
      to: "/news",
      description: "Latest news, updates, announcements, station events, and community activities.",
      keywords: ["news", "events", "news & events", "articles", "updates", "latest"],
    },
    {
      title: "Gallery",
      to: "/gallery",
      description: "Browse photos, events, behind-the-scenes moments, and community highlights.",
      keywords: ["gallery", "photos", "pictures", "images", "albums"],
    },
    {
      title: "Contact Us",
      to: "/contact",
      description: "Get in touch with RW 95.1 FM. Reach out via message, hotlines, email, or visit our station.",
      keywords: ["contact", "contact us", "reach", "email", "phone", "telephone", "address", "location", "message"],
    },
    {
      title: "RW95.1 Stream Player",
      to: "/stream",
      description: "Listen live online to RW 95.1 FM - Pampanga's favorite hit music and news station.",
      keywords: ["stream", "stream player", "listen live", "listen", "player", "radio", "audio", "online"],
    },
  ];

  const matchedTabs = q
    ? tabs.filter((t) => {
        const queryLower = q.toLowerCase();
        return (
          t.title.toLowerCase().includes(queryLower) ||
          t.description.toLowerCase().includes(queryLower) ||
          t.keywords.some((kw) => kw.includes(queryLower) || queryLower.includes(kw))
        );
      })
    : [];

  const hasAnyResults = matchedTabs.length > 0 || results.length > 0;

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_345px] w-full min-w-0">
      <section className="min-w-0 w-full">
        <h1 className="mb-8 text-3xl font-bold text-white">
          Search results for: <span className="text-white">{q}</span>
        </h1>

        {loading ? (
          <p className="text-neutral-300">Searching…</p>
        ) : error && matchedTabs.length === 0 ? (
          <p className="text-neutral-300">
            Could not load results. Make sure Apache and MySQL are running.
          </p>
        ) : hasAnyResults ? (
          <div className="flex flex-col gap-8">
            {/* Navigation Tabs / Pages Section */}
            {matchedTabs.length > 0 && (
              <div className="flex flex-col gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-red-500">
                  Pages & Navigation ({matchedTabs.length})
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {matchedTabs.map((tab) => (
                    <Link
                      key={tab.to}
                      to={tab.to}
                      className="group relative flex flex-col justify-between overflow-hidden rounded border border-white/10 bg-[#1a1a1a] p-4 transition-all duration-300 hover:border-red-600/50 hover:bg-[#222] hover:-translate-y-0.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-white group-hover:text-red-500 transition-colors">
                          {tab.title}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors">
                          Page &rarr;
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-neutral-400 line-clamp-2">
                        {tab.description}
                      </p>
                      <span className="absolute bottom-0 left-0 h-[2px] w-0 bg-red-600 transition-all duration-300 group-hover:w-full" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Posts / Articles Section */}
            {results.length > 0 && (
              <div className="flex flex-col gap-4">
                {matchedTabs.length > 0 && (
                  <h2 className="text-xs font-bold uppercase tracking-wider text-red-500">
                    Articles & Posts ({results.length})
                  </h2>
                )}
                <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2">
                  {results.map((post) => (
                    <PostCard key={post.slug} post={post} />
                  ))}
                </div>
              </div>
            )}
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