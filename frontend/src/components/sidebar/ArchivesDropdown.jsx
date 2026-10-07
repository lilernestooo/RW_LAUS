import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchArchives } from "../../api/api";
import useApi from "../../hooks/useApi";

export default function ArchivesDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { month } = useParams(); // set on /archive/:month pages

  const { data } = useApi(() => fetchArchives(), []);
  const archives = data?.data ?? []; // [{ value: "2026-09", label: "September 2026" }]
  const selected = archives.find((a) => a.value === month)?.label ?? "";

  // Close when clicking outside
  useEffect(() => {
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const pick = (a) => {
    setOpen(false);
    navigate(a.value ? `/archive/${a.value}` : "/");
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between border border-white/30 bg-[#222] px-3 py-3 font-medium text-white"
      >
        {selected || "Select Month"}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 right-0 top-full z-20 max-h-64 overflow-y-auto border border-white/30 bg-[#808080] text-white">
          {[{ value: "", label: "Select Month" }, ...archives].map((a) => (
            <li key={a.value || "none"}>
              <button
                type="button"
                onClick={() => pick(a)}
                className="block w-full px-4 py-1.5 text-left hover:bg-[#0a64d8]"
              >
                {a.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}