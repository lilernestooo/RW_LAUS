// Admin: monitor, approve, mark as spam or delete visitor comments.
import { useCallback, useEffect, useState } from "react";
import { adminListComments, adminSetCommentStatus, adminDeleteComment } from "../api/api";

const TABS = ["pending", "approved", "spam", "all"];

const th = { textAlign: "left", padding: "8px", borderBottom: "1px solid rgba(128,128,128,.35)", whiteSpace: "nowrap" };
const td = { padding: "8px", borderBottom: "1px solid rgba(128,128,128,.2)", verticalAlign: "top" };
const muted = { opacity: 0.65, fontSize: "0.85em" };

export default function CommentsAdmin() {
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ counts: {}, total_pages: 1 });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await adminListComments(status, page);
      setRows(r.data);
      setMeta(r.meta);
      setErr("");
    } catch (e) {
      setErr(e.message);
    }
  }, [status, page]);

  useEffect(() => { load(); }, [load]);

  const act = async (fn) => {
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setRowStatus = (id, s) => act(() => adminSetCommentStatus(id, s));
  const remove = (id) => {
    if (!window.confirm("Delete this comment permanently?")) return;
    act(() => adminDeleteComment(id));
  };

  const totalPages = meta.total_pages || 1;

  return (
    <div className="adm-card" style={{ padding: 16 }}>
      <h1>Comments</h1>
      <p className="adm-hint">New comments stay hidden until you approve them.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        {TABS.map((t) => (
          <button
            key={t}
            className={"adm-btn sm" + (status === t ? "" : " plain")}
            onClick={() => { setStatus(t); setPage(1); }}
            style={{ textTransform: "capitalize" }}
          >
            {t}{t !== "all" ? ` (${meta.counts?.[t] ?? 0})` : ""}
          </button>
        ))}
      </div>

      {err && <p className="adm-error">{err}</p>}

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9em" }}>
          <thead>
            <tr>
              <th style={th}>Author</th>
              <th style={th}>Comment</th>
              <th style={th}>Post</th>
              <th style={th}>Date</th>
              <th style={th}>Status</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td style={td}>
                  <strong>{c.name}</strong>
                  <div style={muted}>{c.email}</div>
                  {c.website && <div style={muted}>{c.website}</div>}
                  <div style={muted}>{c.ip_address}</div>
                </td>
                <td style={{ ...td, maxWidth: 380, whiteSpace: "pre-line" }}>{c.comment}</td>
                <td style={td}>{c.post_title}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>{c.created_at}</td>
                <td style={{ ...td, textTransform: "capitalize" }}>{c.status}</td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    {c.status !== "approved" && (
                      <button className="adm-btn sm" disabled={busy} onClick={() => setRowStatus(c.id, "approved")}>Approve</button>
                    )}
                    {c.status !== "spam" && (
                      <button className="adm-btn plain sm" disabled={busy} onClick={() => setRowStatus(c.id, "spam")}>Spam</button>
                    )}
                    <button className="adm-btn plain sm" disabled={busy} onClick={() => remove(c.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} style={{ ...td, opacity: 0.7 }}>No comments here.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button className="adm-btn plain sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button className="adm-btn plain sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}