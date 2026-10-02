import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";

// Paste your stream URL here (e.g. the Caster.fm direct stream link).
// Leave empty to show the "coming soon" state.
const STREAM_URL = "";

// Optional: if you'd rather use the Caster.fm embed, paste its iframe URL here.
// When set, it replaces the custom player below.
const EMBED_URL = "";

// SAMPLE lineup (hours in 24h, Philippine time). Replace with the current schedule.
const lineup = [
  { start: 9, end: 10, title: "Talakayan Ngayon", blurb: "News and public affairs" },
  { start: 10, end: 12, title: "Music Babad", blurb: "Non-stop feel-good music" },
  { start: 12, end: 15, title: "R.U.N. Request Up Next", blurb: "Your requests and favorites" },
  { start: 15, end: 18, title: "Afternoon Ratsada", blurb: "Afternoon drive companions" },
  { start: 18, end: 20, title: "Ingat sa Road", blurb: "Your ride home soundtrack" },
];

const fmt = (h) => {
  const suffix = h >= 12 && h < 24 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:00 ${suffix}`;
};

function manilaHour() {
  const h = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Asia/Manila",
    }).format(new Date())
  );
  return h % 24;
}

function Equalizer({ playing }) {
  return (
    <div className="flex h-10 items-end gap-1" aria-hidden="true">
      {Array.from({ length: 7 }).map((_, i) => (
        <span
          key={i}
          className="eq-bar w-1.5 bg-red-600"
          style={{
            animationDelay: `${i * 110}ms`,
            animationPlayState: playing ? "running" : "paused",
            height: playing ? undefined : "20%",
          }}
        />
      ))}
    </div>
  );
}

export default function Stream() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [error, setError] = useState("");
  const [hour, setHour] = useState(manilaHour());

  // Keep "on air now" fresh
  useEffect(() => {
    const t = setInterval(() => setHour(manilaHour()), 60000);
    return () => clearInterval(t);
  }, []);

  // Stop the stream when leaving the page
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  const current = lineup.find((s) => hour >= s.start && hour < s.end);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !STREAM_URL) return;
    setError("");
    if (playing) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      setPlaying(false);
      return;
    }
    try {
      audio.src = STREAM_URL;
      await audio.play();
      setPlaying(true);
    } catch {
      setError("Couldn't start the stream. Please try again.");
      setPlaying(false);
    }
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
      <section>
        <nav className="mb-4 text-sm text-neutral-400">
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          {" / "}
          <span className="text-neutral-300">RW95.1 Stream Player</span>
        </nav>

        <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl">RW95.1 Stream Player</h1>

        {EMBED_URL ? (
          <iframe
            src={EMBED_URL}
            title="RW 95.1 FM stream player"
            className="h-[200px] w-full border-0"
            allow="autoplay"
          />
        ) : (
          <div className="overflow-hidden border border-white/10 bg-[#1a1a1a]">
            {/* Top: now playing */}
            <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
              {/* Artwork with spinning ring */}
              <div className="relative mx-auto h-32 w-32 shrink-0 sm:mx-0">
                <div
                  className={`absolute inset-0 rounded-full border-4 border-dashed border-red-600/70 ${
                    playing ? "animate-[spin_8s_linear_infinite]" : ""
                  }`}
                />
                <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-gradient-to-br from-[#2a2a2a] to-black text-center">
                  <span className="text-2xl font-extrabold italic text-amber-400">RW</span>
                  <span className="text-lg font-extrabold leading-none text-white">95.1</span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 bg-red-600 px-2 py-0.5 text-xs font-bold uppercase text-white">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                    </span>
                    On Air
                  </span>
                  {current && (
                    <span className="bg-white/10 px-2 py-0.5 text-xs font-bold text-neutral-200">
                      {fmt(current.start)} – {fmt(current.end)}
                    </span>
                  )}
                </div>

                <h2 className="text-xl font-bold text-white sm:text-2xl">
                  {current ? current.title : "RW 95.1 FM Music Mix"}
                </h2>
                <p className="mt-1 text-sm text-neutral-400">
                  {current ? current.blurb : "Your countryside radio, Keni Na Ka!"}
                </p>
              </div>

              <Equalizer playing={playing} />
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-4 border-t border-white/10 bg-black/40 px-5 py-4">
              <button
                type="button"
                onClick={toggle}
                disabled={!STREAM_URL}
                aria-label={playing ? "Stop stream" : "Play stream"}
                className="flex h-12 min-w-[140px] items-center justify-center gap-3 bg-[#e60000] px-6 font-bold uppercase text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
              >
                {playing ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="5" y="5" width="14" height="14" />
                    </svg>
                    Stop
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5,3 19,12 5,21" />
                    </svg>
                    Play
                  </>
                )}
              </button>

              <div className="flex min-w-[180px] flex-1 items-center gap-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-300">
                  <path d="M3 9v6h4l5 4V5L7 9H3z" />
                </svg>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  aria-label="Volume"
                  className="h-1 w-full cursor-pointer accent-red-600"
                />
              </div>

              {!STREAM_URL && (
                <span className="text-sm text-neutral-400">Live stream will be available soon.</span>
              )}
              {error && <span className="text-sm text-red-400">{error}</span>}
            </div>
          </div>
        )}

        <audio ref={audioRef} preload="none" />

        {/* Today's lineup */}
        <div className="mt-10">
          <h2 className="inline-block bg-red-600 px-3 py-1 text-sm font-bold uppercase text-white">
            Today’s Lineup
          </h2>
          <ul className="mt-4 border-t border-white/10">
            {lineup.map((s) => {
              const live = current === s;
              return (
                <li
                  key={s.title}
                  className={`flex items-center justify-between gap-4 border-b border-white/10 px-3 py-3 ${
                    live ? "bg-red-600/15" : ""
                  }`}
                >
                  <div>
                    <p className={`font-bold ${live ? "text-red-400" : "text-white"}`}>{s.title}</p>
                    <p className="text-sm text-neutral-400">{s.blurb}</p>
                  </div>
                  <div className="shrink-0 text-right text-sm text-neutral-300">
                    {live && <span className="mb-1 block text-xs font-bold uppercase text-red-400">Live now</span>}
                    {fmt(s.start)} – {fmt(s.end)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <Sidebar />
    </div>
  );
}