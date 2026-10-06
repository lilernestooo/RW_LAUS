import bg from "../../assets/images/CRMDM-WEB-17261-scaled.png";

// Whole days from today until Christmas (rolls over to next year after Dec 25)
function daysToChristmas() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let xmas = new Date(today.getFullYear(), 11, 25);
  if (today > xmas) xmas = new Date(today.getFullYear() + 1, 11, 25);
  return Math.round((xmas - today) / 86400000);
}

const goldShadow = "0 0 18px rgba(255,205,90,0.55), 0 3px 0 rgba(140,0,0,0.85)";

export default function OnAirBanner() {
  const days = daysToChristmas();

  return (
    // [container-type:inline-size] lets the text scale with the banner width (cqw units)
    <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-black [container-type:inline-size]">
      <img src={bg} alt="" className="absolute inset-0 h-full w-full object-cover" />

      {/* Dark glow behind the text so it stays readable */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_60%_50%,rgba(0,0,0,0.6),transparent_62%)]" />

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[58%] translate-x-[8%] text-center">
          {/* Twinkling sparkles */}
          <span
            className="absolute -left-[2%] top-0 animate-pulse text-yellow-300"
            style={{ fontSize: "5cqw" }}
          >
            ✦
          </span>
          <span
            className="absolute -right-[2%] top-[18%] animate-pulse text-white [animation-delay:700ms]"
            style={{ fontSize: "4cqw" }}
          >
            ❄
          </span>
          <span
            className="absolute -left-[4%] top-[48%] animate-pulse text-white/80 [animation-delay:1200ms]"
            style={{ fontSize: "3.5cqw" }}
          >
            ❄
          </span>

          {days === 0 ? (
            <p
              className="font-black leading-tight text-white"
              style={{ fontSize: "12cqw", textShadow: goldShadow }}
            >
              Merry
            </p>
          ) : (
            <>
              <p
                className="font-black leading-none text-white"
                style={{ fontSize: "21cqw", textShadow: goldShadow }}
              >
                {days}
              </p>
              <p className="italic text-white" style={{ fontSize: "3.6cqw" }}>
                {days === 1 ? "Day" : "Days"} before
              </p>
            </>
          )}

          <p
            className="mt-[1.5cqw] font-bold italic text-[#ff4d5a]"
            style={{ fontSize: "7.5cqw", textShadow: "0 2px 6px rgba(0,0,0,0.7)" }}
          >
            Christmas{days === 0 ? "!" : ""}
          </p>

          {/* Red-gold-red divider with a star */}
          <div className="my-[2cqw] flex items-center gap-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-red-500" />
            <span className="text-yellow-300" style={{ fontSize: "3.5cqw" }}>
              ✦
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-red-500" />
          </div>

          <p
            className="leading-snug text-white"
            style={{ fontSize: "3.3cqw", textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
          >
            More good music,
            <br />
            more warm moments,
            <br />
            more reasons to be grateful.
            <br />
            Let’s count down together. <span className="text-red-500">♥</span>
          </p>
        </div>
      </div>
    </div>
  );
}