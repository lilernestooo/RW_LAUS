// Talks to the PHP backend (Apache + MySQL80).
const API = import.meta.env.VITE_API_URL ?? "http://localhost/RW_LAUS/backend/api";

// Public reads (the website and the admin tables both use this)
export async function get(endpoint, params = {}) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  ).toString();
  const res = await fetch(`${API}/${endpoint}${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    // show the server's own message when it sent one
    const body = await res.json().catch(() => null);
    const err = new Error(body?.error || `API ${res.status}`);
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

// -> { data: { photos: [{ id, url, caption }] } }   (in the order shown on the Gallery page)
export const fetchGallery = () => get("gallery.php");

// Contact Us form (public, no login needed) -> { data: { saved, emailed } }
export async function sendContact(payload) {
  const res = await fetch(`${API}/contact.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(body?.error || `API ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return body;
}

// Comments (public) -> { data: [{ id, name, website, comment, created_at }] }
export const fetchComments = (postId) => get("comments.php", { post_id: postId });

// New comment (saved as "pending" until the admin approves it)
export async function sendComment(payload) {
  const res = await fetch(`${API}/comments.php`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "submit", ...payload }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error || `API ${res.status}`);
  return body;
}

/* =====================================================================
   ADMIN: login, upload, edit, delete. Used only by src/admin/*
   ===================================================================== */
const TOKEN_KEY = "rw_admin_token";
export const BATCH = 10; // PHP allows 20 files per request by default

export const getToken = () => localStorage.getItem(TOKEN_KEY) || "";
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// Every admin request carries the login token in the header the PHP already reads.
async function request(endpoint, { method = "POST", body, json } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers["X-Upload-Token"] = token;
  let payload = body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(json);
  }

  let res;
  try {
    res = await fetch(`${API}/${endpoint}`, { method, headers, body: payload });
  } catch (e) {
    throw new Error("Network error: " + e.message);
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Server sent an error:\n" + text.replace(/<[^>]*>/g, "").trim().slice(0, 300));
  }

  if (res.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event("admin:unauthorized")); // sends the admin back to the login form
  }
  if (!res.ok) throw new Error(data.error || data.data?.errors?.join("\n") || `Request failed (${res.status})`);
  return data;
}

const toForm = (fields) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) if (v !== null && v !== undefined) fd.append(k, v);
  return fd;
};

export const postJson = (endpoint, json) => request(endpoint, { json });
export const postForm = (endpoint, fields) => request(endpoint, { body: toForm(fields) });

// Sends files in batches of BATCH. Returns { ok, total, problems }.
export async function uploadBatches(endpoint, fields, fieldName, files, onProgress) {
  const batches = [];
  for (let i = 0; i < files.length; i += BATCH) batches.push(files.slice(i, i + BATCH));
  let ok = 0;
  const problems = [];
  for (let b = 0; b < batches.length; b++) {
    onProgress?.(b + 1, batches.length);
    const fd = toForm(fields);
    batches[b].forEach((f) => fd.append(fieldName, f));
    try {
      const json = await request(endpoint, { body: fd });
      ok += json.data.uploaded.length;
      problems.push(...(json.data.errors || []));
    } catch (e) {
      problems.push(e.message);
    }
  }
  return { ok, total: files.length, problems };
}

// Every post, across all pages (the admin tables want the full list)
export async function fetchAllPosts() {
  const all = [];
  let page = 1, totalPages = 1;
  do {
    const json = await get("posts.php", { per_page: 50, page });
    all.push(...json.data);
    totalPages = json.meta.total_pages;
    page++;
  } while (page <= totalPages);
  return all;
}

export const auth = {
  login: (username, password) => postJson("auth.php", { action: "login", username, password }),
  me: () => request("auth.php", { method: "GET" }),
};

// Comments (admin: these send the login token through request())
export const adminListComments = (status = "all", page = 1) =>
  postJson("comments.php", { action: "admin_list", status, page });
export const adminSetCommentStatus = (id, status) =>
  postJson("comments.php", { action: "set_status", id, status });
export const adminDeleteComment = (id) =>
  postJson("comments.php", { action: "delete", id });

// Posts (admin): create a new post, then upload its images with upload.php
export const adminCreatePost = (fields) => postJson("posts_admin.php", { action: "create", ...fields });
export const adminDeletePost = (id) => postJson("posts_admin.php", { action: "delete", id });

// Contact Messages (admin)
export const adminListContacts = (filter = "all") =>
  postJson("contacts_admin.php", { action: "admin_list", filter });
export const adminSaveContactRecipient = (recipient) =>
  postJson("contacts_admin.php", { action: "save_recipient", recipient });
export const adminToggleContactEmailed = (id, emailed) =>
  postJson("contacts_admin.php", { action: "toggle_emailed", id, emailed });
export const adminDeleteContact = (id) =>
  postJson("contacts_admin.php", { action: "delete", id });
export const adminBulkDeleteContacts = (ids) =>
  postJson("contacts_admin.php", { action: "bulk_delete", ids });