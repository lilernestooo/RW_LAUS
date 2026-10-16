import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import banner from "../assets/banner/cropped-NewBanner.jpg";

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
      <Link to="/" aria-label="RW 95.1 FM home" className="block w-full bg-black overflow-hidden">
        <img
          src={banner}
          alt="RW 95.1 FM - Keni na Ka'"
          className="block w-full h-auto aspect-[15/4] max-h-[148px] sm:max-h-[160px] lg:max-h-[180px] object-cover object-center"
        />
      </Link>

      {/* Nav bar */}
      <nav className="relative bg-[#1a1a1a] w-full">
        <div className="flex h-[50px] items-center justify-between pl-2 sm:pl-4 lg:pl-6">
          {/* Desktop links */}
          <ul className="hidden items-center gap-4 xl:gap-8 lg:flex">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className={({ isActive }) =>
                    `relative text-[14px] xl:text-[15px] font-bold text-white transition-colors hover:text-neutral-200
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
            className="flex h-[50px] w-10 items-center justify-center text-2xl text-white transition-colors hover:text-red-500 lg:hidden"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? "✕" : "☰"}
          </button>

          {/* Search + Listen Live */}
          <div className="flex h-full items-center">
            <div ref={searchRef} className="relative h-full">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="flex h-full w-10 sm:w-12 items-center justify-center text-white hover:text-red-500 transition-colors"
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
                  className="absolute right-0 top-full z-40 flex w-[300px] max-w-[calc(100vw-24px)] gap-0 bg-[#1a1a1a] p-3 shadow-2xl border border-white/10"
                >
                  <input
                    type="search"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search ..."
                    className="h-[38px] min-w-0 flex-1 bg-[#333] px-3 text-sm text-white outline-none placeholder:text-neutral-400 focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="submit"
                    className="h-[38px] bg-[#e60000] px-4 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-700 shrink-0 transition-colors"
                  >
                    Search
                  </button>
                </form>
              )}
            </div>

            <button
              onClick={onListenLive}
              className="flex h-full items-center bg-[#e60000] text-[14px] sm:text-[15px] font-bold text-white transition-colors hover:bg-red-700"
              aria-label="Listen Live"
            >
              <span className="flex h-full w-11 sm:w-10 items-center justify-center bg-[#b30000] sm:bg-transparent">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              </span>
              <span className="hidden pr-4 sm:inline tracking-wider">
                LISTEN LIVE
              </span>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <ul className="border-t border-white/10 bg-[#1a1a1a] lg:hidden">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-5 py-3 text-[15px] font-bold transition-colors ${
                      isActive ? "text-red-500 bg-white/5" : "text-white hover:text-red-500 hover:bg-white/5"
                    }`
                  }
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