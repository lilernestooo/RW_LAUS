// Admin entry: sign-in, sidebar layout and routes. Mounted at /admin/* in App.jsx.
import { createContext, useContext, useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, Route, Routes } from "react-router-dom";
import "./admin.css";
import { ToastProvider } from "./UI";
import { auth, clearToken, getToken, setToken } from "../api/api";
import PostsAdmin, { DatesAdmin } from "./PostsPage";
import HomeAdmin from "./HomePage";
import AboutAdmin from "./AboutPage";
import ProgramsAdmin from "./ProgramsPage";
import GalleryAdmin from "./GalleryPage";
import CommentsAdmin from "./CommentsPage";
import logo from "../assets/banner/cropped-Banner.jpg";
import { TITLE_CONFIG } from "../config/titles";

// ===== Auth =====
const Ctx = createContext(null);
const useAuth = () => useContext(Ctx);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => !!getToken());

  // Re-check a saved token when the page opens
  useEffect(() => {
    if (!getToken()) return;
    auth.me()
      .then((r) => setUser(r.data.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  // adminApi fires this when the server says the token is no longer valid
  useEffect(() => {
    const h = () => setUser(null);
    window.addEventListener("admin:unauthorized", h);
    return () => window.removeEventListener("admin:unauthorized", h);
  }, []);

  const login = async (username, password) => {
    const r = await auth.login(username, password);
    setToken(r.data.token);
    setUser(r.data.user);
  };
  const logout = () => {
    clearToken();
    setUser(null);
  };

  return <Ctx.Provider value={{ user, loading, login, logout }}>{children}</Ctx.Provider>;
}

// ===== Sign-in form =====
function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div className="adm-login">
      <form className="adm-card adm-login-card" onSubmit={submit}>
        <h1>RW 95.1 admin</h1>
        <p className="adm-hint">Sign in to update site content.</p>
        <label className="adm-field">
          <span>Username</span>
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus required />
        </label>
        <label className="adm-field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <p className="adm-error">{error}</p>}
        <button className="adm-btn" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </div>
  );
}

// ===== Sidebar layout =====
const Icon = ({ d }) => (
  <svg className="adm-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONS = {
  posts: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h6",
  dates: "M3 5h18v16H3z M3 10h18 M8 3v4 M16 3v4",
  comments: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M8 9h8 M8 13h5",
  home: "M3 11l9-8 9 8 M5 10v10h14V10",
  about: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 8h.01",
  programs: "M3 9h18v11H3z M7 9l10-5 M8 14.5a2.5 2.5 0 1 0 5 0 2.5 2.5 0 1 0-5 0 M16 13h2 M16 16h2",
  gallery: "M3 4h18v16H3z M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z M21 16l-5-5-9 9",
  menu: "M4 6h16 M4 12h16 M4 18h16",
  close: "M6 6l12 12 M18 6L6 18",
  external: "M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6",
  logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
};

const NAV = [
  { group: "Content", items: [
    { to: "/admin/posts", label: "Posts", icon: "posts" },
    { to: "/admin/dates", label: "Post dates", icon: "dates" },
    { to: "/admin/comments", label: "Comments", icon: "comments" },
  ]},
  { group: "Pages", items: [
    { to: "/admin/home", label: "Homepage", icon: "home" },
    { to: "/admin/about", label: "About page", icon: "about" },
    { to: "/admin/programs", label: "Programs page", icon: "programs" },
    { to: "/admin/gallery", label: "Gallery page", icon: "gallery" },
  ]},
];

function AdminLayout() {
  const { user, logout } = useAuth();
  const isMobile = () => window.matchMedia("(max-width: 800px)").matches;
  // full sidebar on desktop, slim icon rail on phones
  const [open, setOpen] = useState(() => !isMobile());

  // Esc collapses the sidebar
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={"adm adm-shell" + (open ? " side-open" : "")}>
      {/* dark backdrop: only visible on phones while the full sidebar is open */}
      {open && <div className="adm-side-backdrop" onClick={() => setOpen(false)} />}

      <aside className={"adm-side" + (open ? " open" : "")}>
        <div className="adm-brand">
          <div className="adm-brand-main">
            <div className="adm-logo">
              <img src={logo} alt="RW 95.1 logo" />
            </div>
            <div className="adm-brand-text">
              <strong>RW 95.1</strong>
              <small>Admin panel</small>
            </div>
          </div>
          <button className="adm-close" onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Collapse menu" : "Expand menu"} title={open ? "Collapse menu" : "Expand menu"}>
            <Icon d={open ? ICONS.close : ICONS.menu} />
          </button>
        </div>

        <nav>
          {NAV.map((g) => (
            <div key={g.group} style={{ display: "contents" }}>
              <div className="adm-nav-label">{g.group}</div>
              {g.items.map((n) => (
                <NavLink key={n.to} to={n.to} title={n.label}
                  onClick={() => isMobile() && setOpen(false)}
                  className={({ isActive }) => "adm-link" + (isActive ? " on" : "")}>
                  <Icon d={ICONS[n.icon]} />
                  <span className="adm-label">{n.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          <div className="adm-nav-label">Site</div>
          <a className="adm-link" href="/" target="_blank" rel="noreferrer" title="View site">
            <Icon d={ICONS.external} />
            <span className="adm-label">View site</span>
          </a>
        </nav>

        <div className="adm-user">
          <div className="adm-user-card" title={user.username}>
            <div className="adm-avatar">{user.username.charAt(0)}</div>
            <div className="adm-user-info">
              <strong>{user.username}</strong>
              <small>Administrator</small>
            </div>
          </div>
          <button className="adm-btn plain sm adm-signout" onClick={logout} title="Sign out">
            <Icon d={ICONS.logout} /> <span className="adm-label">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="adm-main"><Outlet /></main>
    </div>
  );
}

// ===== Routes =====
function Gate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="adm adm-center">Loading…</div>;
  if (!user) return <div className="adm"><Login /></div>;
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/posts" replace />} />
        <Route path="posts" element={<PostsAdmin />} />
        <Route path="dates" element={<DatesAdmin />} />
        <Route path="comments" element={<CommentsAdmin />} />
        <Route path="home" element={<HomeAdmin />} />
        <Route path="about" element={<AboutAdmin />} />
        <Route path="programs" element={<ProgramsAdmin />} />
        <Route path="gallery" element={<GalleryAdmin />} />
        <Route path="*" element={<Navigate to="/admin/posts" replace />} />
      </Route>
    </Routes>
  );
}

export default function AdminApp() {
  // Keep the admin out of search engines
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    const prev = document.title;
    document.title = TITLE_CONFIG.admin?.base || "RW 95.1 Admin";
    return () => { meta.remove(); document.title = prev; };
  }, []);

  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  );
}