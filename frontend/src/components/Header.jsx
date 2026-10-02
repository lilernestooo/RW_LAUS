import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";

const links = [
  { label: "Home", to: "/homepage" },
  { label: "About Us", to: "/about" },
  { label: "Programs", to: "/programs" },
  { label: "News & Events", to: "/news" },
  { label: "Gallery", to: "/gallery" },
  { label: "Contact Us", to: "/contact" },
  { label: "RW95.1 Stream Player", to: "/stream" },
];

export default function Header({ onListenLive }) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Close the search panel on outside click or Escape
  useEffect(() => {
    if (!searchOpen) return;
    const onClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setSearchOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [searchOpen]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(`/search?s=${encodeURIComponent(q)}`);
    setSearchOpen(false);
    setOpen(false);
  };

  return (
    <header className="mx-auto w-full max-w-[1244px]">
      {/* Logo banner */}
      <div className="flex h-[148px] items-end justify-center bg-gradient-to-b from-black via-black to-amber-600/70">
        {/* Placeholder logo - swap for <img src={logo} /> once you have the asset */}
        <div className="mb-3 flex h-24 w-72 items-center justify-center rounded border-2 border-dashed border-amber-400/60 text-lg font-bold text-amber-400">
          RW 95.1 FM LOGO
        </div>
      </div>

      {/* Nav bar */}
      <nav className="relative bg-[#1a1a1a]">
        <div className="flex h-[50px] items-center justify-between pl-6">
          {/* Desktop links */}
          <ul className="hidden items-center gap-8 lg:flex">
            {links.map((l) => (
              <li key={l.to}>
                  <NavLink
                    to={l.to}
                      className={({ isActive }) =>
                        `relative text-[15px] font-bold text-white
                        after:absolute after:-bottom-1 after:left-0 after:h-[3px] after:bg-red-600
                        after:transition-all after:duration-200
                        hover:after:w-1/2 ${isActive ? "after:w-1/2" : "after:w-0"}`
                      }
                  >
                    {l.label}
                  </NavLink>
              </li>
            ))}
          </ul>

          {/* Mobile hamburger */}
          <button
            className="text-2xl text-white lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? "✕" : "☰"}
          </button>

          {/* Search + Listen Live */}
          <div className="flex h-full items-center">
            <div ref={searchRef} className="relative h-full">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="h-full px-5 text-white"
                aria-label="Search"
                aria-expanded={searchOpen}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>

              {searchOpen && (
                <form
                  onSubmit={submitSearch}
                  role="search"
                  className="absolute right-0 top-full z-30 flex w-[325px] max-w-[90vw] gap-0 bg-[#1a1a1a] p-3.5 shadow-lg"
                >
                  <input
                    type="search"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search ..."
                    className="h-[38px] min-w-0 flex-1 bg-[#333] px-3 text-sm text-white outline-none placeholder:text-neutral-400"
                  />
                  <button
                    type="submit"
                    className="h-[38px] bg-[#e60000] px-4 text-sm font-bold uppercase text-white hover:bg-red-700"
                  >
                    Search
                  </button>
                </form>
              )}
            </div>

            <button
              onClick={onListenLive}
              className="flex h-full items-center text-[15px] font-bold text-white"
            >
              <span className="flex h-full w-12 items-center justify-center bg-[#b30000]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </span>
              <span className="flex h-full items-center bg-[#e60000] px-4">
                LISTEN LIVE
              </span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <ul className="border-t border-white/10 lg:hidden">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="block px-6 py-3 text-[15px] font-bold text-white hover:text-red-500"
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </header>
  );
}