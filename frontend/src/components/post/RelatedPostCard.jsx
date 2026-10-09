import { Link } from "react-router-dom";
import { formatDate } from "../../utils/formatDate";
import PostImage from "./PostImage";

function ClockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12,7 12,12 16,14" />
    </svg>
  );
}

export default function RelatedPostCard({ post }) {
  return (
    <article>
      <Link to={`/${post.slug}`} className="group relative block overflow-hidden [&_img]:transition-transform [&_img]:duration-700 [&_img]:ease-out hover:[&_img]:scale-110">
        <PostImage post={post} />
        <div className="absolute bottom-2 left-2 flex gap-2">
          {post.categories.map((c) => (
            <span
              key={c}
              className="bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white"
            >
              {c}
            </span>
          ))}
        </div>
      </Link>

      <h3 className="mt-3 text-[15px] font-bold leading-snug text-white">
        <Link to={`/${post.slug}`} className="hover:text-red-500">
          {post.title}
        </Link>
      </h3>

      {post.date && (
        <p className="mt-2 flex items-center gap-1 text-xs text-neutral-400">
          <ClockIcon /> {formatDate(post.date)}
        </p>
      )}
    </article>
  );
}