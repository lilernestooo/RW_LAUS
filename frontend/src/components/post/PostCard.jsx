import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PostImage from "./PostImage";

// Returns [ref, shown]: shown flips to true once the element scrolls into view
function useReveal(threshold = 0.15) {
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
      { threshold, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, shown];
}

// Each part of the card enters one after another:
// image zooms up, title slides in, red line draws, text rises, button pops in.
export default function PostCard({ post, index = 0 }) {
  const [ref, shown] = useReveal();
  const lead = (index % 2) * 100; // the two cards in a row start slightly apart

  const appear = (hidden, delay, extra = "") => ({
    className: `transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${extra} ${
      shown ? "translate-x-0 translate-y-0 scale-100 opacity-100" : hidden
    }`,
    style: { transitionDelay: shown ? `${lead + delay}ms` : "0ms" },
  });

  return (
    <article ref={ref} className="group/card flex flex-col w-full min-w-0 overflow-hidden">
      {/* Image: zooms up into place, lifts with a red glow on hover */}
      <div {...appear("translate-y-6 scale-95 opacity-0", 0)}>
        <div className="group relative overflow-hidden transition-shadow duration-500 hover:shadow-[0_18px_40px_-12px_rgba(230,0,0,0.5)] [&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-out hover:[&_img]:scale-105">
          <PostImage post={post} />

          {/* Shine sweep */}
          <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-[900ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

          {/* Red bar along the bottom edge */}
          <span className="pointer-events-none absolute bottom-0 left-0 h-1 w-0 bg-[#e60000] transition-all duration-500 ease-out group-hover:w-full" />
        </div>
      </div>

      {/* Title: clean readable font, slides in smoothly, red underline */}
      <h2
        {...appear(
          "translate-y-4 opacity-0",
          150,
          "group mt-3.5 sm:mt-4 text-left text-lg sm:text-xl font-bold leading-snug text-white break-words"
        )}
      >
        <Link to={`/${post.slug}`} className="transition-colors hover:text-red-500">
          {post.title}
        </Link>
        <span
          className={`mt-2 block h-0.5 origin-left bg-[#e60000] transition-all duration-700 ease-out group-hover:w-24 ${
            shown ? "w-12" : "w-0"
          }`}
          style={{ transitionDelay: shown ? `${lead + 450}ms` : "0ms" }}
        />
      </h2>

      {/* Excerpt: rises in, clean line-clamp */}
      <p
        {...appear(
          "translate-y-4 opacity-0",
          300,
          "mt-2.5 sm:mt-3 text-left text-sm sm:text-base leading-relaxed text-neutral-300 break-words line-clamp-3 sm:line-clamp-4"
        )}
      >
        {post.excerpt}
      </p>

      {/* Button: pops in, fills white from the left on hover */}
      <div {...appear("translate-y-4 scale-95 opacity-0", 450, "mt-4")}>
        <Link
          to={`/${post.slug}`}
          className="group/btn relative inline-flex items-center justify-center overflow-hidden border border-white/60 px-4 py-2 text-xs sm:text-sm font-bold tracking-wider uppercase text-white transition-colors duration-300 hover:text-black"
        >
          <span className="absolute inset-0 origin-left scale-x-0 bg-white transition-transform duration-300 ease-out group-hover/btn:scale-x-100" />
          <span className="relative">Read More</span>
        </Link>
      </div>
    </article>
  );
}