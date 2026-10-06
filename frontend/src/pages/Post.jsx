import { useEffect } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { posts } from "../data/posts";
import PostImage from "../components/post/PostImage";
import PostGallery from "../components/post/PostGallery";
import RelatedPostCard from "../components/post/RelatedPostCard";
import CommentForm from "../components/post/CommentForm";
import Sidebar from "../components/sidebar/Sidebar";

export default function Post() {
  const { slug } = useParams();
  const index = posts.findIndex((p) => p.slug === slug);
  const post = posts[index];

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [slug]);

  if (!post) return <Navigate to="/" replace />;

  const previous = posts[index + 1]; // older post
  const next = posts[index - 1]; // newer post
  const primaryCategory = post.categories[post.categories.length - 1];

  const related = posts
    .filter(
      (p) => p.slug !== post.slug && p.categories.some((c) => post.categories.includes(c))
    )
    .slice(0, 3);

  const body = post.body ?? [post.excerpt];
  const bylineLines = post.bylineLines ?? (post.byline ? [post.byline] : []);

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
      <article>
        {/* Breadcrumb */}
        <nav className="mb-4 text-sm text-neutral-400">
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          {" / "}
          <Link to={`/category/${primaryCategory.toLowerCase()}`} className="hover:text-white">
            {primaryCategory}
          </Link>
          {" / "}
          <span className="text-neutral-300">{post.title}</span>
        </nav>

        {/* Category tags */}
        <div className="mb-4 flex gap-2">
          {post.categories.map((c) => (
            <Link
              key={c}
              to={`/category/${c.toLowerCase()}`}
              className="bg-red-600 px-3 py-1 text-xs font-bold uppercase text-white hover:bg-red-700"
            >
              {c}
            </Link>
          ))}
        </div>

        {/* Title */}
        <h1 className="mb-6 text-3xl font-bold leading-tight text-white sm:text-4xl">
          {post.title}
        </h1>

        {/* Featured image + gallery */}
        <PostImage post={post} natural />
        <PostGallery count={post.galleryCount} columns={post.galleryColumns} />

        {/* Byline + body */}
        <div className="mt-8 space-y-5 text-base leading-relaxed text-neutral-200">
          <div>
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
          </div>
          {body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        {/* About the Writer */}
        {post.aboutWriter && (
          <div className="mt-8 border-t border-white/10 pt-6">
            <h2 className="mb-2 text-lg font-bold text-white">About the Writer</h2>
            <p className="text-base leading-relaxed text-neutral-200">{post.aboutWriter}</p>
          </div>
        )}

        {/* Previous / Next */}
        {(previous || next) && (
          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-6">
            <div>
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
            </div>
            <div className="text-right">
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
            </div>
          </div>
        )}

        <CommentForm />

        {/* Related Stories */}
        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="inline-block bg-red-600 px-3 py-1 text-sm font-bold uppercase text-white">
              Related Stories
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {related.map((p) => (
                <RelatedPostCard key={p.slug} post={p} />
              ))}
            </div>
          </section>
        )}
      </article>

      <Sidebar />
    </div>
  );
}