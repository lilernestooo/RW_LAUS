// Days-to-Christmas banner (placeholder art until you have the real image)
function daysToChristmas() {
  const now = new Date();
  let xmas = new Date(now.getFullYear(), 11, 25);
  if (now > xmas) xmas = new Date(now.getFullYear() + 1, 11, 25);
  return Math.ceil((xmas - now) / 86400000);
}

export default function OnAirBanner() {
  return (
    <div className="relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-amber-900 via-neutral-900 to-black p-6 text-center">
      <span className="absolute left-4 top-6 border-2 border-red-600 bg-black px-3 py-1 text-lg font-extrabold tracking-wider text-red-500">
        ON AIR
      </span>

      <div className="ml-auto w-3/5">
        <p className="text-6xl font-extrabold text-white">{daysToChristmas()}</p>
        <p className="text-xs italic text-white">Days before</p>
        <p className="mt-1 border-b-2 border-red-500 pb-1 text-lg font-bold italic text-red-400">
          Christmas
        </p>
        <p className="mt-2 text-[11px] leading-snug text-white">
          More good music, more warm moments, more reasons to be grateful. Let’s count down together. ❤
        </p>
      </div>
    </div>
  );
}