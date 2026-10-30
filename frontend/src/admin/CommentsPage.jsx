// Admin: monitor, approve, mark as spam or delete visitor comments.
import { useCallback, useEffect, useRef, useState } from "react";
import { adminListComments, adminSetCommentStatus, adminDeleteComment } from "../api/api";
import { AdminTable, ORDERED, useConfirm, useLatest } from "./UI";

const TABS = ["pending", "approved", "spam", "all"];

// Keep columns outside the component so the table is not rebuilt on every render
const COLUMNS = [
  { title: "Author", data: "name" },
  { title: "Comment", data: "comment" },
  { title: "Post", data: "post_title", defaultContent: "" },
  { title: "Date", data: "created_at", defaultContent: "" },
  { title: "Status", data: "status" },
  { title: "Actions", data: null, orderable: false, searchable: false, defaultContent: "" },
];

// The table now does its own paging and search, so load every page of comments for a tab
async function fetchAll(status) {
  const first = await adminListComments(status, 1);
  let rows = first.data;
  const pages = first.meta?.total_pages || 1;
  if (pages > 1) {
    const rest = await Promise.all(
      Array.from({ length: pages - 1 }, (_, i) => adminListComments(status, i + 2))
    );
    rows = rows.concat(...rest.map((r) => r.data));
  }
  return { rows, meta: first.meta };
}

export default function CommentsAdmin() {
  const confirm = useConfirm();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [err, setErr] = useState("");
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      const { rows, meta } = await fetchAll(status);
      setRows(rows);
      setCounts(meta?.counts || {});
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn) => {
    if (busy.current) return;
    busy.current = true;
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      busy.current = false;
    }
  };

  // Table buttons read the newest handler so they never act on stale data
  const actRef = useLatest(act);
  const setRowStatus = (id, s) => actRef.current(() => adminSetCommentStatus(id, s));
  const remove = async (id) => {
    const ok = await confirm({
      title: "Delete this comment?",
      message: "The comment will be permanently deleted. This cannot be undone.",
    });
    if (!ok) return;
    actRef.current(() => adminDeleteComment(id));
  };

  return (
    <>
      <header className="adm-head">
        <h1>Comments</h1>
        <p>New comments stay hidden until you approve them.</p>
      </header>

      <section className="adm-card">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {TABS.map((t) => (
            <button
              key={t}
              className={"adm-btn sm" + (status === t ? "" : " plain")}
              onClick={() => setStatus(t)}
              style={{ textTransform: "capitalize" }}
            >
              {t}{t !== "all" ? ` (${counts?.[t] ?? 0})` : ""}
            </button>
          ))}
        </div>

        {err && <p className="adm-error">{err}</p>}

        <AdminTable data={rows} columns={COLUMNS} options={ORDERED} slots={{
          0: (_, c) => (
            <div>
              <strong>{c.name}</strong>
              <div className="adm-muted" style={{ fontSize: ".85em" }}>{c.email}</div>
              {c.website && <div className="adm-muted" style={{ fontSize: ".85em" }}>{c.website}</div>}
              <div className="adm-muted" style={{ fontSize: ".85em" }}>{c.ip_address}</div>
            </div>
          ),
          1: (text) => <div style={{ maxWidth: 380, whiteSpace: "pre-line" }}>{text}</div>,
          3: (d) => <span style={{ whiteSpace: "nowrap" }}>{d}</span>,
          4: (s) => <span style={{ textTransform: "capitalize" }}>{s}</span>,
          5: (_, c) => (
            <div className="adm-row-actions" style={{ justifyContent: "flex-start" }}>
              {c.status !== "approved" && (
                <button className="adm-btn sm" onClick={() => setRowStatus(c.id, "approved")}>Approve</button>
              )}
              {c.status !== "spam" && (
                <button className="adm-btn plain sm" onClick={() => setRowStatus(c.id, "spam")}>Spam</button>
              )}
              <button className="adm-btn plain sm" onClick={() => remove(c.id)}>Delete</button>
            </div>
          ),
        }} />
      </section>
    </>
  );
}