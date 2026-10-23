import { useCallback, useEffect, useRef, useState } from "react";
import { AdminTable, Field, ImagePicker, Modal, MONTH, RowActions, report, toDate, toMonth, useToast } from "./UI";
import {
  adminCreatePost,
  adminDeletePost,
  fetchAllPosts,
  fetchCategories,
  get,
  postForm,
  postJson,
  uploadBatches,
} from "../api/api";

// ===== Page 1: Posts (add a post, month, featured image, gallery for one post) =====
const COLUMNS = [
  { title: "Image", data: "image", orderable: false, searchable: false, defaultContent: "" },
  { title: "Title", data: "title" },
  { title: "Month", data: "date", defaultContent: "", render: (d, type) => (type === "display" ? toMonth(d) || "—" : d || "") },
  { title: "", data: null, orderable: false, searchable: false, defaultContent: "" },
];
const OPTIONS = { order: [[2, "desc"]] };

export default function PostsAdmin() {
  const notify = useToast();
  const [posts, setPosts] = useState([]);
  const [slug, setSlug] = useState(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(
    () => fetchAllPosts().then(setPosts).catch((e) => notify(e.message, "err")),
    [notify]
  );
  useEffect(() => { load(); }, [load]);

  const selected = posts.find((p) => p.slug === slug);

  const removePost = async (row) => {
    if (!window.confirm(`Delete "${row.title}"?\n\nIts photos and comments are deleted too. This cannot be undone.`)) return;
    try {
      await adminDeletePost(row.id);
      notify("Post deleted.");
      setSlug(null);
      await load();
    } catch (e) {
      notify(e.message, "err");
    }
  };

  return (
    <>
      <header className="adm-head">
        <h1>Posts</h1>
        <p>Add a new post, or pick an existing one to change its month, featured image or gallery. Use ✕ to delete a post.</p>
        <div className="adm-actions">
          <button className="adm-btn" onClick={() => setAdding(true)}>+ Add new post</button>
        </div>
      </header>
      <AdminTable data={posts} columns={COLUMNS} options={OPTIONS} slots={{
        0: (img) => img ? <img className="adm-thumb" src={img} alt="" /> : <span className="adm-muted">none</span>,
        3: (_, row) => (
          <RowActions editLabel="Manage" onEdit={() => setSlug(row.slug)} onDelete={() => removePost(row)} />
        ),
      }} />
      {selected && (
        <Modal wide title={selected.title} onClose={() => setSlug(null)}>
          <PostManager post={selected} onChanged={load} />
        </Modal>
      )}
      {adding && (
        <Modal wide title="Add new post" onClose={() => setAdding(false)}>
          <NewPost onCreated={load} onClose={() => setAdding(false)} />
        </Modal>
      )}
    </>
  );
}

// ----- Form for a brand new post -----
function NewPost({ onCreated, onClose }) {
  const notify = useToast();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [month, setMonth] = useState("");
  const [byline, setByline] = useState("");
  const [aboutWriter, setAboutWriter] = useState("");
  const [cats, setCats] = useState([]);
  const [picked, setPicked] = useState([]);
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const featRef = useRef(null);
  const galRef = useRef(null);

  useEffect(() => {
    fetchCategories().then((r) => setCats(r.data || [])).catch((e) => notify(e.message, "err"));
  }, [notify]);

  const toggleCat = (id) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const create = async () => {
    if (!title.trim()) return notify("Please enter a title.", "err");
    if (!excerpt.trim()) return notify("Please enter a short excerpt.", "err");
    if (month && !MONTH.test(month)) return notify("Use the format YYYY-MM, for example 2026-10.", "err");

    setBusy(true);
    try {
      const r = await adminCreatePost({
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt.trim(),
        body,
        month,
        byline,
        about_writer: aboutWriter,
        categories: picked,
      });
      const newSlug = r.data.slug;

      // The post exists now. Add its pictures with the same endpoint the Manage window uses.
      const feat = featRef.current?.files[0];
      if (feat) {
        setProgress("Uploading featured image…");
        report(notify, await uploadBatches("upload.php", { slug: newSlug, type: "featured" }, "images[]", [feat]));
      }
      if (files.length) {
        const g = await uploadBatches("upload.php", { slug: newSlug, type: "gallery" }, "images[]", files,
          (b, n) => setProgress(`Uploading gallery batch ${b} of ${n}…`));
        report(notify, g);
      }

      notify(`Post created: /${newSlug}`);
      await onCreated();
      onClose();
    } catch (e) {
      notify(e.message, "err");
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  return (
    <div className="adm-stack">
      <section>
        <Field label="Title *" value={title} maxLength={255} autoFocus
          onChange={(e) => setTitle(e.target.value)} />
        <Field label="Link name (optional)" value={slug} maxLength={120}
          hint="Leave empty to make it from the title, for example my-new-post."
          onChange={(e) => setSlug(e.target.value)} />
        <Field label="Short excerpt *" textarea rows={3} value={excerpt} maxLength={1000}
          hint="Shown on the post cards."
          onChange={(e) => setExcerpt(e.target.value)} />
        <Field label="Post body" textarea rows={10} value={body}
          hint="Separate paragraphs with a blank line. If empty, the excerpt is used."
          onChange={(e) => setBody(e.target.value)} />
      </section>

      <section>
        <h2>Publish month and year</h2>
        <p className="adm-hint">The post appears under this month in Archives. You can change it later.</p>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </section>

      <section>
        <h2>Categories</h2>
        {!cats.length ? <p className="adm-muted">Loading…</p> : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 18px" }}>
            {cats.map((c) => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="checkbox" checked={picked.includes(c.id)} onChange={() => toggleCat(c.id)} />
                {c.name}
              </label>
            ))}
          </div>
        )}
      </section>

      <section>
        <Field label="Byline (optional)" textarea rows={2} value={byline}
          hint="One line per row, for example: By Jasmine Tizon"
          onChange={(e) => setByline(e.target.value)} />
        <Field label="About the writer (optional)" textarea rows={3} value={aboutWriter}
          onChange={(e) => setAboutWriter(e.target.value)} />
      </section>

      <section>
        <h2>Featured image</h2>
        <p className="adm-hint">The main picture on the cards and at the top of the post.</p>
        <input ref={featRef} type="file" accept="image/*" />
      </section>

      <section>
        <h2>Gallery photos (optional)</h2>
        <p className="adm-hint">JPG, PNG, WEBP or GIF, up to 8 MB each. You can choose many at once.</p>
        <ImagePicker files={files} onChange={setFiles} inputRef={galRef} />
      </section>

      <div className="adm-actions">
        <button className="adm-btn" disabled={busy} onClick={create}>
          {busy ? progress || "Creating…" : "Create post"}
        </button>
        <button className="adm-btn plain" disabled={busy} onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}

function PostManager({ post, onChanged }) {
  const notify = useToast();
  const [month, setMonth] = useState(toMonth(post.date));
  const [busy, setBusy] = useState("");
  const [gallery, setGallery] = useState(null);
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState("");
  const featRef = useRef(null);
  const galRef = useRef(null);

  const loadGallery = useCallback(
    () => get("upload.php", { slug: post.slug }).then((r) => setGallery(r.data || [])).catch((e) => notify(e.message, "err")),
    [post.slug, notify]
  );
  useEffect(() => { loadGallery(); }, [loadGallery]);

  const run = async (name, fn) => {
    setBusy(name);
    try { await fn(); } catch (e) { notify(e.message, "err"); } finally { setBusy(""); setProgress(""); }
  };

  const saveMonth = () => run("month", async () => {
    if (month && !MONTH.test(month)) throw new Error("Use the format YYYY-MM, for example 2018-11.");
    if (month === toMonth(post.date)) return notify("No change.");
    const r = await postJson("dates.php", { dates: { [post.slug]: toDate(month) } });
    const errs = r.data.errors || [];
    notify(errs.length ? errs.join("\n") : "Month saved.", errs.length ? "err" : "ok");
    onChanged();
  });

  const saveFeatured = () => run("featured", async () => {
    const f = featRef.current.files[0];
    if (!f) throw new Error("Choose an image first.");
    report(notify, await uploadBatches("upload.php", { slug: post.slug, type: "featured" }, "images[]", [f]));
    featRef.current.value = "";
    onChanged();
  });

  const saveGallery = () => run("gallery", async () => {
    if (!files.length) throw new Error("Choose at least one image.");
    const r = await uploadBatches("upload.php", { slug: post.slug, type: "gallery" }, "images[]", files,
      (b, n) => setProgress(`Uploading batch ${b} of ${n}…`));
    report(notify, r);
    galRef.current.value = "";
    setFiles([]);
    loadGallery();
    onChanged();
  });

  const removeImage = async (id) => {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await postForm("upload.php", { action: "delete", id });
      notify("Deleted.");
      loadGallery();
    } catch (e) { notify(e.message, "err"); }
  };

  return (
    <div className="adm-stack">
      <section>
        <h2>Publish month and year</h2>
        <p className="adm-hint">The post appears under this month in Archives.</p>
        <div className="adm-row">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          <button className="adm-btn" disabled={busy === "month"} onClick={saveMonth}>Save month</button>
        </div>
      </section>

      <section>
        <h2>Featured image</h2>
        <p className="adm-hint">The main picture on the cards and at the top of the post. Replaces the current one.</p>
        {post.image && <img className="adm-preview" src={post.image} alt="" />}
        <input ref={featRef} type="file" accept="image/*" />
        <div className="adm-actions">
          <button className="adm-btn" disabled={busy === "featured"} onClick={saveFeatured}>
            {busy === "featured" ? "Uploading…" : "Upload featured image"}
          </button>
        </div>
      </section>

      <section>
        <h2>Gallery photos</h2>
        <p className="adm-hint">JPG, PNG, WEBP or GIF, up to 8 MB each. You can choose many at once.</p>
        <ImagePicker files={files} onChange={setFiles} inputRef={galRef} />
        <div className="adm-actions">
          <button className="adm-btn" disabled={busy === "gallery"} onClick={saveGallery}>
            {busy === "gallery" ? progress || "Uploading…" : "Upload gallery photos"}
          </button>
        </div>
      </section>

      <section>
        <h2>Current gallery for this post</h2>
        {gallery === null ? <p className="adm-muted">Loading…</p>
          : !gallery.length ? <p className="adm-muted">No uploaded gallery photos yet.</p>
          : (
            <div className="adm-grid">
              {gallery.map((img) => (
                <div className="adm-item" key={img.id}>
                  <img src={img.url} alt="" loading="lazy" />
                  <button className="adm-btn sm" title="Delete" onClick={() => removeImage(img.id)}>✕</button>
                </div>
              ))}
            </div>
          )}
      </section>
    </div>
  );
}

// ===== Page 2: Post dates (all posts in one table) =====
const DATE_COLUMNS = [
  { title: "Post", data: "title" },
  { title: "Month and year", data: "date", defaultContent: "" },
];
const DATE_OPTIONS = { pageLength: 25, order: [[0, "asc"]] };

// Each cell keeps its own value and also reports it to `pending`,
// so typed values survive paging and sorting in the table.
function MonthCell({ row, pending }) {
  const [v, setV] = useState(pending.current[row.slug] ?? toMonth(row.date));
  return (
    <input type="month" className={v ? "" : "empty"} value={v}
      onChange={(e) => { setV(e.target.value); pending.current[row.slug] = e.target.value; }} />
  );
}

export function DatesAdmin() {
  const notify = useToast();
  const [posts, setPosts] = useState([]);
  const [busy, setBusy] = useState(false);
  const pending = useRef({}); // { slug: "YYYY-MM" }

  const load = useCallback(
    () => fetchAllPosts().then(setPosts).catch((e) => notify(e.message, "err")),
    [notify]
  );
  useEffect(() => { load(); }, [load]);

  const missing = posts.filter((p) => !p.date).length;

  const save = async () => {
    const dates = {};
    for (const p of posts) {
      const v = pending.current[p.slug];
      if (v === undefined || v === toMonth(p.date)) continue; // untouched
      if (v && !MONTH.test(v)) return notify(`"${v}" is not valid. Use the format YYYY-MM.`, "err");
      dates[p.slug] = toDate(v);
    }
    if (!Object.keys(dates).length) return notify("Nothing changed.");
    setBusy(true);
    try {
      const r = await postJson("dates.php", { dates });
      const errs = r.data.errors || [];
      notify(`Saved ${r.data.saved} date(s).` + (errs.length ? "\n\nProblems:\n" + errs.join("\n") : ""), errs.length ? "warn" : "ok");
      pending.current = {};
      await load();
    } catch (e) {
      notify(e.message, "err");
    }
    setBusy(false);
  };

  return (
    <>
      <header className="adm-head">
        <h1>Post dates</h1>
        <p>Set the publish month and year of every post.{missing ? ` ${missing} post(s) have none yet (red boxes).` : ""} Only the ones you change are saved.</p>
      </header>
      <AdminTable data={posts} columns={DATE_COLUMNS} options={DATE_OPTIONS}
        slots={{ 1: (_, row) => <MonthCell row={row} pending={pending} /> }} />
      <div className="adm-bar">
        <button className="adm-btn" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save changes"}</button>
      </div>
    </>
  );
}