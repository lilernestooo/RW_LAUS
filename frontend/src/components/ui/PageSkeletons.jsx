import { Skeleton, SkeletonText } from "./Skeleton";

const layout = "grid items-start gap-8 lg:grid-cols-[1fr_345px]";

function SidebarSkeleton() {
  return (
    <aside className="hidden lg:block lg:pb-64">
      {/* OnAirBanner: aspect-square, rounded-2xl */}
      <Skeleton height="auto" className="aspect-square" radius={16} />

      {/* Recent Comments (empty list) */}
      <Skeleton width={170} height={30} className="mt-8" />

      {/* Recent Posts: 5 titles, 2 lines each */}
      <Skeleton width={140} height={30} className="mt-8" />
      <div className="mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2 border-b border-white/10 py-3 first:pt-0 last:border-0">
            <Skeleton height={16} />
            <Skeleton width="65%" height={16} />
          </div>
        ))}
      </div>

      {/* Categories: 3 single-line items */}
      <Skeleton width={120} height={30} className="mt-8" />
      <div className="mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-b border-white/10 py-3 first:pt-0 last:border-0">
            <Skeleton width={90} height={16} />
          </div>
        ))}
      </div>

      {/* Archives: dropdown button */}
      <Skeleton width={110} height={30} className="mt-8" />
      <Skeleton height={50} className="mt-4" />
    </aside>
  );
}

function PostCardSkeleton() {
  return (
    <div>
      {/* PostImage */}
      <Skeleton height="auto" className="aspect-video" />

      {/* Title: text-xl, leading-snug, mt-4 (2 lines) */}
      <div className="mt-4 space-y-2">
        <Skeleton width="92%" height={22} />
        <Skeleton width="60%" height={22} />
      </div>

      {/* Excerpt: text-base, leading-relaxed, mt-3 (3 lines) */}
      <div className="mt-3 space-y-2">
        <Skeleton height={16} />
        <Skeleton height={16} />
        <Skeleton width="70%" height={16} />
      </div>

      {/* Read More button: mt-4, px-4 py-2, text-sm */}
      <Skeleton width={104} height={38} className="mt-4" />
    </div>
  );
}

export function ListPageSkeleton({ count = 10 }) {
  return (
    <div className={layout}>
      <section>
        <div className="grid gap-x-4 gap-y-10 sm:grid-cols-2">
          {Array.from({ length: count }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      </section>
      <SidebarSkeleton />
    </div>
  );
}

export function PostPageSkeleton() {
  return (
    <div className={layout}>
      <article>
        {/* Breadcrumb */}
        <Skeleton width={260} height={14} style={{ marginBottom: 16 }} />
        {/* Category tag */}
        <Skeleton width={80} height={26} style={{ marginBottom: 16 }} />
        {/* Title */}
        <Skeleton width="90%" height={34} />
        <Skeleton width="55%" height={34} style={{ marginTop: 10, marginBottom: 24 }} />
        {/* Featured image */}
        <Skeleton height="auto" className="aspect-[16/9]" />
        {/* Byline + body */}
        <div className="mt-8 space-y-5">
          <Skeleton width={240} height={16} />
          <SkeletonText lines={4} />
          <SkeletonText lines={3} />
          <SkeletonText lines={5} />
          <SkeletonText lines={3} />
        </div>
      </article>
      <SidebarSkeleton />
    </div>
  );
}