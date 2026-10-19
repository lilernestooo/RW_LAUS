import { useEffect, useRef, useState } from "react";

const SPEEDS = [1, 1.25, 1.5, 2, 0.75];
let currentlyPlaying = null; // so only one player plays at a time

const fmt = (s) => {
    if (!Number.isFinite(s) || s <= 0) return "0:00";
    const m = Math.floor(s / 60);
    const sec = String(Math.floor(s % 60)).padStart(2, "0");
    return `${m}:${sec}`;
};

const thumb =
    "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 " +
    "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white " +
    "[&::-webkit-slider-thumb]:shadow-[0_0_0_3px_rgba(230,0,0,0.6)] " +
    "[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full " +
    "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-white";

export default function AudioPlayer({ src }) {
    const audioRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [buffered, setBuffered] = useState(0);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [speed, setSpeed] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    // Stop and release when the component leaves the page
    useEffect(() => {
        const a = audioRef.current;
        return () => {
            if (currentlyPlaying === a) currentlyPlaying = null;
            a?.pause();
        };
    }, []);

    const toggle = async () => {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) {
            if (currentlyPlaying && currentlyPlaying !== a) currentlyPlaying.pause();
            currentlyPlaying = a;
            setError(false);
            try {
                await a.play();
            } catch {
                setError(true);
            }
        } else {
            a.pause();
        }
    };

    const seek = (v) => {
        const a = audioRef.current;
        if (a && duration) {
            a.currentTime = v;
            setTime(v);
        }
    };

    const skip = (sec) => {
        const a = audioRef.current;
        if (!a || !duration) return;
        seek(Math.min(Math.max(a.currentTime + sec, 0), duration));
    };

    const changeVolume = (v) => {
        const a = audioRef.current;
        a.volume = v;
        a.muted = v === 0;
        setVolume(v);
        setMuted(v === 0);
    };

    const toggleMute = () => {
        const a = audioRef.current;
        a.muted = !a.muted;
        setMuted(a.muted);
    };

    const cycleSpeed = () => {
        const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
        audioRef.current.playbackRate = next;
        setSpeed(next);
    };

    const onProgress = () => {
        const a = audioRef.current;
        if (a.buffered.length && a.duration) {
            setBuffered(a.buffered.end(a.buffered.length - 1));
        }
    };

    const played = duration ? (time / duration) * 100 : 0;
    const loaded = duration ? (buffered / duration) * 100 : 0;
    const shownVolume = muted ? 0 : volume;

    return (
        <div className="rounded-lg border border-white/10 bg-gradient-to-r from-[#1c1c1c] to-[#141414] p-3 shadow-lg">
            <style>{`
        @keyframes rw-eq { 0%,100% { transform: scaleY(.25) } 50% { transform: scaleY(1) } }
        .rw-eq span { transform-origin: bottom; transform: scaleY(.25); }
        .rw-eq.on span { animation: rw-eq 0.9s ease-in-out infinite; }
        .rw-eq.on span:nth-child(2) { animation-delay: .15s; animation-duration: .7s }
        .rw-eq.on span:nth-child(3) { animation-delay: .3s; animation-duration: 1.1s }
        .rw-eq.on span:nth-child(4) { animation-delay: .05s; animation-duration: .8s }
        @media (prefers-reduced-motion: reduce) { .rw-eq.on span { animation: none } }
      `}</style>

            <audio
                ref={audioRef}
                src={src}
                preload="none"
                controlsList="nodownload"
                onContextMenu={(e) => e.preventDefault()}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => { setPlaying(false); setTime(0); }}
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                onDurationChange={(e) => setDuration(e.currentTarget.duration)}
                onProgress={onProgress}
                onWaiting={() => setLoading(true)}
                onCanPlay={() => setLoading(false)}
                onPlaying={() => setLoading(false)}
                onError={() => { setError(true); setLoading(false); setPlaying(false); }}
            />

            <div className="flex items-center gap-3">
                {/* Play / pause */}
                <button
                    type="button"
                    onClick={toggle}
                    aria-label={playing ? "Pause" : "Play"}
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e60000] text-white shadow-[0_0_0_0_rgba(230,0,0,0.6)] transition hover:scale-105 hover:bg-red-700 active:scale-95"
                >
                    {loading ? (
                        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    ) : playing ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                    ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </button>

                {/* Equalizer */}
                <div className={`rw-eq ${playing ? "on" : ""} hidden h-6 items-end gap-[3px] sm:flex`} aria-hidden="true">
                    {[0, 1, 2, 3].map((i) => (
                        <span key={i} className="block h-full w-[3px] rounded-sm bg-[#e60000]" />
                    ))}
                </div>

                {/* Progress */}
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <input
                        type="range"
                        min="0"
                        max={duration || 0}
                        step="0.1"
                        value={time}
                        disabled={!duration}
                        onChange={(e) => seek(Number(e.target.value))}
                        aria-label="Seek"
                        className={`h-1.5 w-full cursor-pointer appearance-none rounded-full disabled:cursor-default ${thumb}`}
                        style={{
                            background: `linear-gradient(to right, #e60000 ${played}%, rgba(255,255,255,.35) ${played}%, rgba(255,255,255,.35) ${loaded}%, rgba(255,255,255,.12) ${loaded}%)`,
                        }}
                    />
                    <div className="flex justify-between text-[11px] tabular-nums text-neutral-400">
                        <span>{fmt(time)}</span>
                        <span>{duration ? fmt(duration) : "--:--"}</span>
                    </div>
                </div>
            </div>

            {/* Controls row */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-2">
                <div className="flex items-center gap-1">
                    <button type="button" onClick={() => skip(-10)} aria-label="Back 10 seconds"
                        className="rounded px-2 py-1 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white">
                        ⟲ 10s
                    </button>
                    <button type="button" onClick={() => skip(10)} aria-label="Forward 10 seconds"
                        className="rounded px-2 py-1 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white">
                        10s ⟳
                    </button>
                    <button type="button" onClick={cycleSpeed} aria-label="Playback speed"
                        className="ml-1 min-w-[44px] rounded border border-white/20 px-2 py-1 text-xs font-bold text-white hover:border-[#e60000] hover:text-[#e60000]">
                        {speed}×
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button type="button" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}
                        className="text-neutral-300 hover:text-white">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M3 9v6h4l5 5V4L7 9H3z" />
                            {shownVolume === 0 ? (
                                <path d="M16.5 9.5l5 5m0-5l-5 5" stroke="currentColor" strokeWidth="2" fill="none" />
                            ) : (
                                <path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" stroke="currentColor" strokeWidth="2" fill="none" />
                            )}
                        </svg>
                    </button>
                    <input
                        type="range" min="0" max="1" step="0.05"
                        value={shownVolume}
                        onChange={(e) => changeVolume(Number(e.target.value))}
                        aria-label="Volume"
                        className={`h-1.5 w-24 cursor-pointer appearance-none rounded-full ${thumb}`}
                        style={{
                            background: `linear-gradient(to right, #fff ${shownVolume * 100}%, rgba(255,255,255,.2) ${shownVolume * 100}%)`,
                        }}
                    />
                </div>
            </div>

            {error && (
                <p className="mt-2 text-xs text-red-400">This audio could not be played. Please try again later.</p>
            )}
        </div>
    );
}