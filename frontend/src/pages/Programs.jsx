import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";

const programs = [
  { title: "Regular Programming", to: "/programs/regular-programming" },
  { title: "News & Public Affairs", to: "/programs/news-and-public-affairs" },
];

function ProgramCard({ title, to }) {
  return (
    <div className="relative flex min-h-[233px] flex-col justify-center overflow-hidden bg-gradient-to-b from-black via-neutral-800 to-neutral-900 px-3 py-8 sm:px-4">
      {/* Placeholder background - swap for a bg image when you have the asset */}
      <span className="absolute bottom-2 right-3 text-xs text-neutral-600">
        Background placeholder
      </span>

      <div className="relative">
        <h2 className="border-y border-white py-3 text-center text-xl font-bold uppercase leading-tight text-white sm:py-4 sm:text-2xl lg:text-[26px]">
          {title}
        </h2>

        <Link
          to={to}
          className="mt-4 block w-full bg-[#e60000] px-4 py-3 text-center text-sm font-medium uppercase text-white transition-colors hover:bg-white hover:text-[#e60000] sm:text-base"
        >
          View Program
        </Link>
      </div>
    </div>
  );
}

export default function Programs() {
  const [showTop, setShowTop] = useState(false);

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
            {programs.map((p) => (
              <ProgramCard key={p.to} {...p} />
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