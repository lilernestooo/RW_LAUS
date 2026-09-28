export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const box = "flex h-8 min-w-8 items-center justify-center border px-2 text-sm font-bold";
  const idle = "border-white/30 text-neutral-400 hover:text-white";

  return (
    <nav aria-label="Pagination" className="mt-10 flex justify-center gap-1">
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          aria-current={n === page ? "page" : undefined}
          className={`${box} ${n === page ? "border-red-600 bg-red-600 text-white" : idle}`}
        >
          {n}
        </button>
      ))}
      {page < totalPages && (
        <button onClick={() => onChange(page + 1)} className={`${box} ${idle}`}>
          Next
        </button>
      )}
    </nav>
  );
}