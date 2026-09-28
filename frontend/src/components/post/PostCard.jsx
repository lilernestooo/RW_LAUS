import { Link } from "react-router-dom";
import PostImage from "./PostImage";

export default function PostCard({ post }) {
  return (
    <article>
      <PostImage post={post} />

      <h2 className="mt-4 text-justify text-xl font-bold leading-snug text-white">
        <Link to={`/${post.slug}`} className="hover:text-red-500">
          {post.title}
        </Link>
      </h2>

      <p className="mt-3 text-justify text-base leading-relaxed text-neutral-200">
        {post.excerpt}
      </p>

      <Link
        to={`/${post.slug}`}
        className="mt-4 inline-block border border-white/60 px-4 py-2 text-sm font-bold text-white hover:bg-white hover:text-black"
      >
        Read More
      </Link>
    </article>
  );
}