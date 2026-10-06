import { Link } from "react-router-dom";

// Image with category tags. Shows a placeholder when post.image is null.
// natural = show the whole photo at its own proportions (no cropping)
export default function PostImage({ post, ratio = "aspect-[4/3]", natural = false }) {
  const Wrapper = natural ? "div" : Link;
  const wrapperProps = natural ? {} : { to: `/${post.slug}` };

  return (
    <Wrapper
      {...wrapperProps}
      className={`relative block overflow-hidden bg-gradient-to-br from-neutral-700 to-neutral-900 ${
        natural && post.image ? "" : ratio
      }`}
    >
      {post.image ? (
        <img
          src={post.image}
          alt={post.title}
          className={natural ? "block h-auto w-full" : "h-full w-full object-cover"}
        />
      ) : (
        <span
          className={`flex items-center justify-center text-sm text-neutral-400 ${
            natural ? "aspect-[16/9]" : "h-full"
          }`}
        >
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
    </Wrapper>
  );
}