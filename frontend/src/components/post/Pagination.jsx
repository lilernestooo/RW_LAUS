export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  const box = "flex h-8 min-w-8 items-center justify-center border px-2 sm:px-3 text-xs sm:text-sm font-bold transition-colors";
  const idle = "border-white/30 text-neutral-400 hover:text-white hover:border-white/60";

  // Calculate sliding page window so it never overflows small screens
  let pages = [];
  if (totalPages <= 5) {
    pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  } else {
    const start = Math.max(1, Math.min(page - 2, totalPages - 4));
    pages = Array.from({ length: 5 }, (_, i) => start + i);
  }

  return (
    <nav aria-label="Pagination" className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
      {page > 1 && (
        <button onClick={() => onChange(page - 1)} className={`${box} ${idle}`}>
          Previous
        </button>
      )}

      {pages[0] > 1 && (
        <>
          <button onClick={() => onChange(1)} className={`${box} ${idle}`}>
            1
          </button>
          {pages[0] > 2 && <span className="px-1 text-xs text-neutral-500">…</span>}
        </>
      )}

      {pages.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          aria-current={n === page ? "page" : undefined}
          className={`${box} ${n === page ? "border-red-600 bg-red-600 text-white" : idle}`}
        >
          {n}
        </button>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-xs text-neutral-500">…</span>}
          <button onClick={() => onChange(totalPages)} className={`${box} ${idle}`}>
            {totalPages}
          </button>
        </>
      )}

      {page < totalPages && (
        <button onClick={() => onChange(page + 1)} className={`${box} ${idle}`}>
          Next
        </button>
      )}
    </nav>
  );
}