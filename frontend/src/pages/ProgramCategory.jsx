import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import { fetchPrograms } from "../api/api";

// One program: image on the left, details and audio player on the right
function ProgramItem({ program }) {
  const { title, host, schedule, description, image, audio } = program;

  return (
    <article className="grid gap-5 border-b border-white/80 py-8 first:pt-0 sm:grid-cols-[250px_1fr]">
      {image ? (
        <img
          src={image}
          alt={title}
          loading="lazy"
          className="aspect-square w-full max-w-[250px] object-cover"
        />
      ) : (
        <div className="flex aspect-square w-full max-w-[250px] items-center justify-center bg-neutral-800 text-sm text-neutral-500">
          Image placeholder
        </div>
      )}

      <div className="min-w-0">
        <h2 className="text-xl font-bold uppercase leading-tight text-white sm:text-2xl">
          {title}
          {host ? ` hosted by ${host}` : ""}
        </h2>

        {schedule && <p className="mt-2 uppercase text-white">{schedule}</p>}

        {description && (
          <p className="mt-1 whitespace-pre-line text-neutral-200">{description}</p>
        )}

        {audio && <audio controls preload="none" src={audio} className="mt-5 w-full" />}
      </div>
    </article>
  );
}

export default function ProgramCategory() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | missing | error
  const [showTop, setShowTop] = useState(false);

  // Load this category and its programs from the database.
  // Re-checked every 10 seconds and when you return to the tab,
  // so changes made on the admin page appear without a reload.
  useEffect(() => {
    let alive = true;
    let last = "";
    setState("loading");
    setCategory(null);

    const load = (first) => {
      fetchPrograms(slug)
        .then((json) => {
          if (!alive) return;
          const found = json.data?.categories?.[0];
          if (!found) {
            last = "";
            setCategory(null);
            setState("missing");
            return;
          }
          const snapshot = JSON.stringify(found);
          if (snapshot !== last) { // only redraw when something changed
            last = snapshot;
            setCategory(found);
          }
          setState("ready");
        })
        .catch((err) => {
          if (!alive) return;
          if (err.status === 404) {
            last = "";
            setCategory(null);
            setState("missing");
          } else if (first) {
            setState("error"); // later failures keep what is on screen
          }
        });
    };

    const refresh = () => { if (!document.hidden) load(false); };

    load(true);
    const timer = setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [slug]);

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
        <Link to="/programs" className="hover:text-white">Programs</Link>
        <span className="mx-2">/</span>
        <span>{category?.title ?? "…"}</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
        {/* Main content */}
        <section>
          <h1 className="mb-10 text-3xl font-bold text-white">
            {category?.title ?? "Programs"}
          </h1>

          {state === "loading" && <p className="text-neutral-400">Loading…</p>}

          {state === "missing" && (
            <p className="text-neutral-300">
              This program category was not found.{" "}
              <Link to="/programs" className="text-[#e60000] hover:underline">
                Back to Programs
              </Link>
            </p>
          )}

          {state === "error" && (
            <p className="text-neutral-300">Could not load the programs. Please try again later.</p>
          )}

          {state === "ready" &&
            (category.programs.length ? (
              category.programs.map((p) => <ProgramItem key={p.id} program={p} />)
            ) : (
              <p className="text-neutral-300">No programs have been added yet.</p>
            ))}
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