// Talks to the PHP backend in XAMPP.
const API = import.meta.env.VITE_API_URL ?? "http://localhost/RW_LAUS/backend/api";

async function get(endpoint, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  const res = await fetch(`${API}/${endpoint}${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    const err = new Error(`API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// -> { data: Post[], meta: { page, per_page, total, total_pages } }
export const fetchPosts = (params) => get("posts.php", params);

// -> { data: Post & { gallery, previous, next, related } }
export const fetchPost = (slug) => get("posts.php", { slug });

// -> { data: [{ id, name, slug, count }] }
export const fetchCategories = () => get("categories.php");

// -> { data: [{ value: "2026-09", label: "September 2026" }] }
export const fetchArchives = () => get("categories.php", { archives: 1 });

// -> { data: { hero: url|null, video: url|null, awards: [{ id, url, caption }] } }
export const fetchHome = () => get("home.php");

// -> { data: { people: [...], milestones: [...], programs: [...], banner: {...}|null } }
export const fetchAbout = () => get("about.php");

// -> { data: { categories: [{ id, slug, title, background, programs: [...] }] } }
// Pass a slug to get only that category.
export const fetchPrograms = (category) => get("programs.php", { category });