import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import { fetchPrograms } from "../api/api";

// Gives an element a one-time "reveal" the first time it scrolls into view
function useReveal() {
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
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return [ref, shown];
}

// One program: the image slides in from the left, the details rise one after
// another, and the divider line draws itself
function ProgramItem({ program }) {
  const { title, host, schedule, description, image, audio } = program;
  const [ref, shown] = useReveal();

  // Props for an element that fades in from a direction after a delay
  const appear = (hidden, delay, extra = "") => ({
    className: `transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${extra} ${
      shown ? "translate-x-0 translate-y-0 scale-100 opacity-100" : `${hidden} opacity-0`
    }`,
    style: { transitionDelay: shown ? `${delay}ms` : "0ms" },
  });

  return (
    <article ref={ref} className="grid gap-5 pt-8 first:pt-0 sm:grid-cols-[250px_1fr]">
      {/* Image: slides in, then zooms with a shine and red bar on hover */}
      <div {...appear("-translate-x-12 scale-95", 0)}>
        <div className="group relative aspect-square w-full max-w-[250px] overflow-hidden bg-neutral-900 transition-shadow duration-500 hover:shadow-[0_18px_40px_-10px_rgba(230,0,0,0.55)]">
          {image ? (
            <img
              src={image}
              alt={title}
              loading="lazy"
              className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
              Image placeholder
            </div>
          )}

          {/* Shine sweep */}
          <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-[900ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

          {/* Red bar that grows along the bottom edge */}
          <span className="absolute bottom-0 left-0 h-1 w-0 bg-[#e60000] transition-all duration-500 ease-out group-hover:w-full" />
        </div>
      </div>

      {/* Details rise in one after another */}
      <div className="min-w-0">
        <h2
          {...appear(
            "translate-y-6",
            150,
            "text-xl font-bold uppercase leading-tight text-white sm:text-2xl"
          )}
        >
          {title}
          {host ? ` hosted by ${host}` : ""}
        </h2>

        {schedule && (
          <p {...appear("translate-y-6", 250, "mt-2 uppercase text-white")}>{schedule}</p>
        )}

        {description && (
          <p {...appear("translate-y-6", 350, "mt-1 whitespace-pre-line text-neutral-200")}>
            {description}
          </p>
        )}

        {audio && (
          <div {...appear("translate-y-6", 450, "mt-5")}>
            <audio controls preload="none" src={audio} className="w-full" />
          </div>
        )}
      </div>

      {/* Divider line that draws itself */}
      <span
        aria-hidden="true"
        className={`col-span-full mt-3 block h-px origin-left bg-white/80 transition-transform duration-1000 ease-out ${
          shown ? "scale-x-100" : "scale-x-0"
        }`}
        style={{ transitionDelay: shown ? "500ms" : "0ms" }}
      />
    </article>
  );
}

export default function ProgramCategory() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | missing | error
  const [showTop, setShowTop] = useState(false);
  const barRef = useRef(null); // red progress bar at the top of the screen
  const [titleRef, titleShown] = useReveal();

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
      {/* Reading progress bar: grows along the top of the screen as you scroll */}
      <div
        ref={barRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[60] h-1 w-full origin-left scale-x-0 bg-[#e60000]"
      />

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
          <h1
            ref={titleRef}
            className={`text-3xl font-bold text-white transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              titleShown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
          >
            {category?.title ?? "Programs"}
          </h1>

          {/* Red accent line that draws itself under the title */}
          <span
            className={`mb-10 mt-3 block h-1 w-24 origin-left bg-[#e60000] transition-transform delay-300 duration-700 ease-out ${
              titleShown ? "scale-x-100" : "scale-x-0"
            }`}
          />

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