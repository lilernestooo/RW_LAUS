const colClasses = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export default function PostGallery({ count = 0, columns = 3 }) {
  if (count <= 0) return null;

  return (
    <div className={`mt-3 grid gap-3 ${colClasses[columns] || colClasses[3]}`}>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="flex aspect-[4/3] items-center justify-center border-2 border-dashed border-white/20 bg-neutral-800 text-xs text-neutral-500"
        >
          Photo {i + 2}
        </div>
      ))}
    </div>
  );
}