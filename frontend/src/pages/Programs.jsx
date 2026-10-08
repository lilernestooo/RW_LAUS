import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import { fetchPrograms } from "../api/api";

// Shown until the database answers (or if it can't be reached)
const fallback = [
  { title: "Regular Programming", to: "/programs/regular-programming", background: null },
  { title: "News & Public Affairs", to: "/programs/news-and-public-affairs", background: null },
];

function ProgramCard({ title, to, background, index }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  // Reveal the card when it scrolls into view
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

  return (
    // Outer wrapper handles the entrance, inner card handles hover
    <div
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        shown ? "translate-y-0 scale-100 opacity-100" : "translate-y-10 scale-95 opacity-0"
      }`}
      style={{ transitionDelay: shown ? `${index * 150}ms` : "0ms" }}
    >
      <div className="group relative flex min-h-[233px] flex-col justify-center overflow-hidden bg-gradient-to-b from-black via-neutral-800 to-neutral-900 px-3 py-8 shadow-lg transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_18px_40px_-10px_rgba(230,0,0,0.55)] sm:px-4">
        {/* Uploaded background (set on the admin page), with a dark layer so the title stays readable */}
        {background && (
          <>
            <img
              src={background}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="pointer-events-none absolute inset-0 bg-black/45" />
          </>
        )}

        {/* Red glow that fades in on hover */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(230,0,0,0.45),transparent_65%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

        {/* Shine sweep */}
        <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-[900ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

        {/* Placeholder text, only until a background is uploaded */}
        {!background && (
          <span className="absolute bottom-3 right-3 text-xs text-neutral-600 transition-opacity duration-300 group-hover:opacity-0">
            Background placeholder
          </span>
        )}

        {/* Red bar that grows along the bottom edge */}
        <span className="absolute bottom-0 left-0 h-1 w-0 bg-[#e60000] transition-all duration-500 ease-out group-hover:w-full" />

        <div className="relative">
          <h2 className="border-y border-white py-3 text-center text-xl font-bold uppercase leading-tight text-white transition-all duration-500 group-hover:border-[#e60000] group-hover:tracking-wider sm:py-4 sm:text-2xl lg:text-[26px]">
            {title}
          </h2>

          <Link
            to={to}
            className="group/btn relative mt-4 block w-full overflow-hidden bg-[#e60000] px-4 py-3 text-center text-sm font-medium uppercase text-white transition-colors duration-300 hover:text-[#e60000] sm:text-base"
          >
            {/* White fill that slides in from the left */}
            <span className="absolute inset-0 origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover/btn:scale-x-100" />
            <span className="relative inline-flex items-center justify-center gap-2">
              View Program
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="-ml-4 opacity-0 transition-all duration-300 group-hover/btn:ml-0 group-hover/btn:translate-x-1 group-hover/btn:opacity-100"
              >
                <line x1="4" y1="12" x2="20" y2="12" />
                <polyline points="14,6 20,12 14,18" />
              </svg>
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Programs() {
  const [showTop, setShowTop] = useState(false);
  const [cards, setCards] = useState(fallback);

  // Card titles and backgrounds come from the database.
  // Re-checked every 10 seconds and when you return to the tab,
  // so changes made on the admin page appear without a reload.
  useEffect(() => {
    let alive = true;
    let last = "";

    const load = () => {
      fetchPrograms()
        .then((json) => {
          const list = json.data?.categories ?? [];
          if (!alive || !list.length) return;
          const next = list.map((c) => ({ title: c.title, to: `/programs/${c.slug}`, background: c.background }));
          const snapshot = JSON.stringify(next);
          if (snapshot === last) return; // nothing changed
          last = snapshot;
          setCards(next);
        })
        .catch(() => {}); // keep what is on screen
    };

    const refresh = () => { if (!document.hidden) load(); };

    load();
    const timer = setInterval(refresh, 10000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

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
        <span>Programs</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
        {/* Main content */}
        <section>
          <h1 className="mb-16 text-3xl font-bold text-white">Programs</h1>

          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((p, i) => (
              <ProgramCard key={p.to} index={i} {...p} />
            ))}
          </div>

          <hr className="mt-6 border-t border-white/80" />
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