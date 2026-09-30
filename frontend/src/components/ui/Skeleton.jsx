export function Skeleton({ width = "100%", height = 16, radius, style, className = "" }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function SkeletonText({ lines = 3, lastLineWidth = "60%", gap = 10 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={14} width={i === lines - 1 ? lastLineWidth : "100%"} />
      ))}
    </div>
  );
}