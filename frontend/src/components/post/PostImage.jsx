import { Link } from "react-router-dom";

// Image with category tags. Shows a placeholder when post.image is null.
export default function PostImage({ post, ratio = "aspect-[4/3]" }) {
  return (
    <Link
      to={`/${post.slug}`}
      className={`relative block ${ratio} overflow-hidden bg-gradient-to-br from-neutral-700 to-neutral-900`}
    >
      {post.image ? (
        <img src={post.image} alt={post.title} className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center text-sm text-neutral-400">
          Image placeholder
        </span>
      )}

      <div className="absolute bottom-2 left-2 flex gap-1">
        {post.categories.map((c) => (
          <span key={c} className="bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white">
            {c}
          </span>
        ))}
      </div>
    </Link>
  );
}