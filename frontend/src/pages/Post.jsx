import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { fetchPost } from "../api/api";
import useApi from "../hooks/useApi";
import PostImage from "../components/post/PostImage";
import PostGallery from "../components/post/PostGallery";
import RelatedPostCard from "../components/post/RelatedPostCard";
import CommentForm from "../components/post/CommentForm";
import Sidebar from "../components/sidebar/Sidebar";

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

const hidden = {
  up: "translate-y-8 opacity-0",
  left: "-translate-x-10 opacity-0",
  right: "translate-x-10 opacity-0",
  zoom: "scale-90 opacity-0",
};

// Fade/slide in when scrolled into view
function Reveal({ as: Tag = "div", from = "up", delay = 0, className = "", children }) {
  const [ref, shown] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        shown ? "translate-x-0 translate-y-0 scale-100 opacity-100" : hidden[from]
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}

export default function Post() {
  const { slug } = useParams();
  const { data, loading, error } = useApi(() => fetchPost(slug), [slug]);
  const barRef = useRef(null); // red reading-progress bar at the top of the screen

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  // Reading progress bar grows as you scroll down the post
  useEffect(() => {
    const onScroll = () => {
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

  if (error?.status === 404) return <Navigate to="/" replace />;
  if (loading) return <p className="text-neutral-300">Loading…</p>;
  if (error || !data) {
    return (
      <p className="text-neutral-300">
        Could not load this post. Make sure Apache and MySQL are running.
      </p>
    );
  }

  const post = data.data;
  const { previous, next, related = [] } = post;
  const primaryCategory = post.categories[post.categories.length - 1] ?? "Uncategorized";

  const body = post.body?.length ? post.body : [post.excerpt];
  const bylineLines = post.bylineLines ?? (post.byline ? [post.byline] : []);

  return (
    <>
      <div
        ref={barRef}
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[60] h-1 w-full origin-left scale-x-0 bg-[#e60000]"
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
        {/* key={slug} makes the animations replay when you open another post */}
        <article key={slug} className="overflow-x-clip">
          {/* Breadcrumb */}
          <Reveal as="nav" from="left" className="mb-4 text-sm text-neutral-400">
            <Link to="/" className="hover:text-white">
              Home
            </Link>
            {" / "}
            <Link to={`/category/${primaryCategory.toLowerCase()}`} className="hover:text-white">
              {primaryCategory}
            </Link>
            {" / "}
            <span className="text-neutral-300">{post.title}</span>
          </Reveal>

          {/* Category tags: pop in one after another */}
          <div className="mb-4 flex gap-2">
            {post.categories.map((c, i) => (
              <Reveal as="span" from="zoom" delay={i * 90} key={c} className="inline-block">
                <Link
                  to={`/category/${c.toLowerCase()}`}
                  className="block bg-red-600 px-3 py-1 text-xs font-bold uppercase text-white transition-colors duration-300 hover:bg-red-700"
                >
                  {c}
                </Link>
              </Reveal>
            ))}
          </div>

          {/* Title */}
          <Reveal
            as="h1"
            from="left"
            delay={100}
            className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl"
          >
            {post.title}
          </Reveal>

          {/* Featured image + gallery */}
          <Reveal from="zoom" delay={150}>
            <div className="group relative overflow-hidden [&_img]:transition-transform [&_img]:duration-1000 [&_img]:ease-out hover:[&_img]:scale-105">
              <PostImage post={post} natural />

              {/* Shine sweep */}
              <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-[1200ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

              {/* Red bar along the bottom edge */}
              <span className="pointer-events-none absolute bottom-0 left-0 h-1 w-0 bg-[#e60000] transition-all duration-500 ease-out group-hover:w-full" />
            </div>
          </Reveal>
          <PostGallery
            images={post.gallery}
            count={post.galleryCount}
            columns={post.galleryColumns}
          />

          {/* Byline + body: each paragraph rises in as you read */}
          <div className="mt-8 space-y-5 text-base leading-relaxed text-neutral-200">
            <Reveal>
              {post.showTitleAboveByline && (
                <p className="font-semibold text-white">{post.title}</p>
              )}
              {bylineLines.map((line, i) => (
                <p
                  key={i}
                  className={`font-semibold text-white ${post.bylineItalic ? "italic" : ""}`}
                >
                  {line}
                </p>
              ))}
            </Reveal>
            {body.map((paragraph, i) => (
              <Reveal as="p" key={i} delay={Math.min(i, 2) * 80}>
                {paragraph}
              </Reveal>
            ))}
          </div>

          {/* About the Writer */}
          {post.aboutWriter && (
            <Reveal className="mt-8 border-t border-white/10 pt-6">
              <h2 className="mb-2 text-lg font-bold text-white">About the Writer</h2>
              <p className="text-base leading-relaxed text-neutral-200">{post.aboutWriter}</p>
            </Reveal>
          )}

          {/* Previous / Next: slide in from their own sides */}
          {(previous || next) && (
            <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
              <Reveal from="left">
                {previous && (
                  <>
                    <span className="block text-xs font-bold uppercase text-neutral-500">
                      Previous
                    </span>
                    <Link to={`/${previous.slug}`} className="font-bold text-white hover:text-red-500">
                      {previous.title}
                    </Link>
                  </>
                )}
              </Reveal>
              <Reveal from="right" className="text-right">
                {next && (
                  <>
                    <span className="block text-xs font-bold uppercase text-neutral-500">
                      Next
                    </span>
                    <Link to={`/${next.slug}`} className="font-bold text-white hover:text-red-500">
                      {next.title}
                    </Link>
                  </>
                )}
              </Reveal>
            </div>
          )}

          <Reveal>
            <CommentForm />
          </Reveal>

          {/* Related Stories: zoom in one after another */}
          {related.length > 0 && (
            <section className="mt-10">
              <Reveal as="h2" from="left" className="inline-block bg-red-600 px-3 py-1 text-sm font-bold uppercase text-white">
                Related Stories
              </Reveal>
              <div className="mt-6 grid gap-6 sm:grid-cols-3">
                {related.map((p, i) => (
                  <Reveal from="zoom" delay={i * 120} key={p.slug}>
                    <RelatedPostCard post={p} />
                  </Reveal>
                ))}
              </div>
            </section>
          )}
        </article>

        <Sidebar />
      </div>
    </>
  );
}