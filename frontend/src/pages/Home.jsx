import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import SectionTitle from "../components/ui/SectionTitle";

const awards = [
  "The Paragala goes to… RW 95.1 FM – Best Local Radio Station",
  "Award slide 2",
  "Award slide 3",
];

function AwardsCarousel() {
  const [index, setIndex] = useState(0);
  const prev = () => setIndex((i) => (i - 1 + awards.length) % awards.length);
  const next = () => setIndex((i) => (i + 1) % awards.length);

  return (
    <div className="relative flex aspect-square w-full items-center justify-center border-4 border-dashed border-yellow-700/60 bg-neutral-800 p-6 text-center text-sm text-neutral-400">
      {awards[index]}

      <button
        onClick={prev}
        aria-label="Previous award"
        className="absolute left-2 top-1/2 -translate-y-1/2 text-2xl text-white/60 hover:text-white"
      >
        ‹
      </button>
      <button
        onClick={next}
        aria-label="Next award"
        className="absolute right-2 top-1/2 -translate-y-1/2 text-2xl text-white/60 hover:text-white"
      >
        ›
      </button>

      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
        {awards.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-3 w-3 rounded-full ${
              i === index ? "bg-white" : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
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
        <Link to="/" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <span>Homepage</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
        {/* Main content */}
        <section>
          <h1 className="mb-6 text-3xl font-bold text-white">Homepage</h1>

          {/* Hero image placeholder */}
          <div className="flex aspect-[16/9] w-full items-center justify-center border-2 border-dashed border-neutral-600 bg-neutral-900 text-neutral-500">
            Hero image (RW 95.1 FM – Keni na Ka')
          </div>

          <hr className="my-10 border-t-1 border-white-600" />

          <div className="grid gap-10 md:grid-cols-2">
            <div>

                <SectionTitle>Awards</SectionTitle>

              <AwardsCarousel />
            </div>

            <div>

                <SectionTitle>Video</SectionTitle>

              {/* Add src when you have the video file */}
              <video controls className="aspect-video w-full bg-black" />
            </div>
          </div>
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