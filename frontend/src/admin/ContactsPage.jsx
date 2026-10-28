// Admin: monitor and manage contact form submissions (contacts_tbl) and recipient email
import { useCallback, useEffect, useRef, useState } from "react";
import {
  adminListContacts,
  adminSaveContactRecipient,
  adminToggleContactEmailed,
  adminDeleteContact,
} from "../api/api";
import { AdminTable, Modal, Field, useToast, useLatest } from "./UI";

const COLUMNS = [
  { title: "Sender", data: "name" },
  { title: "Message", data: "message" },
  { title: "Date & Time", data: "created_at", defaultContent: "" },
  { title: "Delivery", data: "emailed" },
  { title: "Actions", data: null, orderable: false, searchable: false, defaultContent: "" },
];

export default function ContactsAdmin() {
  const [filter, setFilter] = useState("all"); // "all" | "emailed" | "not_emailed"
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({ all: 0, emailed: 0, not_emailed: 0 });
  const [settings, setSettings] = useState({
    recipient: "dwrw951fm@yahoo.com",
    from_address: "",
    from_name: "DWRW Contact Form",
  });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Modals
  const [viewing, setViewing] = useState(null); // row object when viewing details
  const [editingRecipient, setEditingRecipient] = useState(false);
  const [newRecipient, setNewRecipient] = useState("");
  const [savingRecip, setSavingRecip] = useState(false);

  const notify = useToast();
  const busy = useRef(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminListContacts(filter);
      setRows(res.data || []);
      setCounts(res.meta?.counts || { all: 0, emailed: 0, not_emailed: 0 });
      if (res.settings) {
        setSettings(res.settings);
        setNewRecipient(res.settings.recipient || "dwrw951fm@yahoo.com");
      }
      setErr("");
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn, successMsg = "") => {
    if (busy.current) return;
    busy.current = true;
    try {
      await fn();
      if (successMsg) notify(successMsg, "ok");
      await load();
    } catch (e) {
      notify(e.message, "err");
      setErr(e.message);
    } finally {
      busy.current = false;
    }
  };

  const actRef = useLatest(act);

  const handleToggleEmailed = (row) => {
    const nextVal = row.emailed ? 0 : 1;
    actRef.current(
      () => adminToggleContactEmailed(row.rec_id, nextVal),
      nextVal ? "Marked as emailed" : "Marked as un-emailed"
    );
    if (viewing?.rec_id === row.rec_id) {
      setViewing((v) => ({ ...v, emailed: nextVal }));
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm("Delete this contact message permanently?")) return;
    actRef.current(() => adminDeleteContact(id), "Message deleted");
    if (viewing?.rec_id === id) setViewing(null);
  };

  const handleSaveRecipient = async (e) => {
    e.preventDefault();
    const clean = newRecipient.trim();
    if (!clean) return;
    setSavingRecip(true);
    try {
      const res = await adminSaveContactRecipient(clean);
      setSettings((s) => ({ ...s, recipient: res.data?.recipient || clean }));
      notify("Contact recipient email updated successfully!", "ok");
      setEditingRecipient(false);
    } catch (err) {
      notify(err.message || "Failed to update recipient email", "err");
    } finally {
      setSavingRecip(false);
    }
  };

  return (
    <>
      <header className="adm-head">
        <h1>Email</h1>
        <p>Inquiries and messages submitted through the website Contact Us form.</p>
      </header>

      {/* Recipient Configuration Banner */}
      <section className="adm-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "1px", color: "var(--muted)", fontWeight: "bold" }}>
              Official Contact Form Recipient
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: "1.15rem", fontWeight: "bold", color: "var(--text)" }}>
                {settings.recipient || "dwrw951fm@yahoo.com"}
              </span>
              <span
                style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "0.75rem",
                  fontWeight: "bold",
                  background: "rgba(34, 197, 94, 0.15)",
                  color: "#16a34a",
                }}
              >
                Active
              </span>
            </div>
            <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: 4 }}>
              Sender: <strong>{settings.from_name}</strong> {settings.from_address ? `(${settings.from_address})` : ""}
            </div>
          </div>

          <div>
            <button
              type="button"
              className="adm-btn sm"
              onClick={() => {
                setNewRecipient(settings.recipient || "dwrw951fm@yahoo.com");
                setEditingRecipient(true);
              }}
            >
              Change Recipient Email
            </button>
          </div>
        </div>
      </section>

      {/* Messages Card */}
      <section className="adm-card">
        {/* Filter Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <button
            type="button"
            className={"adm-btn sm" + (filter === "all" ? "" : " plain")}
            onClick={() => setFilter("all")}
          >
            All Messages ({counts.all})
          </button>
          <button
            type="button"
            className={"adm-btn sm" + (filter === "emailed" ? "" : " plain")}
            onClick={() => setFilter("emailed")}
          >
            Emailed ({counts.emailed})
          </button>
          <button
            type="button"
            className={"adm-btn sm" + (filter === "not_emailed" ? "" : " plain")}
            onClick={() => setFilter("not_emailed")}
          >
            DB Only ({counts.not_emailed})
          </button>
        </div>

        {err && <p className="adm-error">{err}</p>}

        <AdminTable
          data={rows}
          columns={COLUMNS}
          options={{
            pageLength: 10,
            order: [[2, "desc"]], // Default order by Date descending
          }}
          slots={{
            0: (_, c) => (
              <div>
                <strong>{c.name}</strong>
                <div style={{ fontSize: ".85em" }}>
                  <a
                    href={`mailto:${c.email}`}
                    style={{ color: "var(--red)", textDecoration: "none" }}
                    title="Send email reply"
                  >
                    {c.email}
                  </a>
                </div>
                {c.ip_address && (
                  <div className="adm-muted" style={{ fontSize: ".75em", marginTop: 2 }}>
                    IP: {c.ip_address}
                  </div>
                )}
              </div>
            ),
            1: (text, c) => (
              <div
                onClick={() => setViewing(c)}
                style={{
                  maxWidth: 340,
                  whiteSpace: "pre-line",
                  cursor: "pointer",
                  fontSize: ".9em",
                  lineHeight: 1.45,
                }}
                title="Click to read full message"
              >
                {text.length > 110 ? text.slice(0, 110) + "…" : text}
              </div>
            ),
            2: (d) => <span style={{ whiteSpace: "nowrap", fontSize: ".85em" }}>{d}</span>,
            3: (val) =>
              val ? (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    background: "rgba(34, 197, 94, 0.15)",
                    color: "#16a34a",
                    whiteSpace: "nowrap",
                  }}
                >
                  ✓ Emailed
                </span>
              ) : (
                <span
                  style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    background: "rgba(234, 179, 8, 0.15)",
                    color: "#ca8a04",
                    whiteSpace: "nowrap",
                  }}
                >
                  DB Logged
                </span>
              ),
            4: (_, c) => (
              <div className="adm-row-actions" style={{ justifyContent: "flex-start", gap: 6 }}>
                <button
                  type="button"
                  className="adm-btn sm"
                  onClick={() => setViewing(c)}
                  title="View full message details"
                >
                  View
                </button>
                <button
                  type="button"
                  className="adm-btn plain sm"
                  onClick={() => handleToggleEmailed(c)}
                  title={c.emailed ? "Mark as not emailed" : "Mark as emailed"}
                >
                  {c.emailed ? "Unmark" : "Mark Emailed"}
                </button>
                <button
                  type="button"
                  className="adm-btn plain sm"
                  onClick={() => handleDelete(c.rec_id)}
                  title="Delete message"
                  style={{ color: "var(--red)" }}
                >
                  Delete
                </button>
              </div>
            ),
          }}
        />
      </section>

      {/* Modal: View Message Details */}
      {viewing && (
        <Modal title="Contact Message Details" onClose={() => setViewing(null)} wide>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: "bold" }}>Sender Name</span>
                <div style={{ fontWeight: "bold", fontSize: "1rem", marginTop: 2 }}>{viewing.name}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: "bold" }}>Email Address</span>
                <div style={{ marginTop: 2 }}>
                  <a href={`mailto:${viewing.email}`} style={{ color: "var(--red)", fontWeight: "bold" }}>
                    {viewing.email}
                  </a>
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: "bold" }}>Received At</span>
                <div style={{ marginTop: 2, fontSize: "0.9rem" }}>{viewing.created_at}</div>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: "bold" }}>Delivery Status</span>
                <div style={{ marginTop: 2 }}>
                  {viewing.emailed ? (
                    <span style={{ color: "#16a34a", fontWeight: "bold" }}>✓ Emailed to {settings.recipient}</span>
                  ) : (
                    <span style={{ color: "#ca8a04", fontWeight: "bold" }}>Saved in DB only (not emailed)</span>
                  )}
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", fontWeight: "bold" }}>Message</span>
              <div
                style={{
                  background: "var(--card2)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  padding: "16px",
                  marginTop: "6px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                  fontSize: "0.95rem",
                  maxHeight: "360px",
                  overflowY: "auto",
                }}
              >
                {viewing.message}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <a
                  href={`mailto:${viewing.email}?subject=${encodeURIComponent("Re: Your message to RW 95.1 FM")}`}
                  className="adm-btn sm"
                  style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}
                >
                  Reply via Email
                </a>
                <button
                  type="button"
                  className="adm-btn plain sm"
                  onClick={() => handleToggleEmailed(viewing)}
                >
                  {viewing.emailed ? "Mark as Not Emailed" : "Mark as Emailed"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="adm-btn plain sm"
                  onClick={() => handleDelete(viewing.rec_id)}
                  style={{ color: "var(--red)" }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  className="adm-btn plain sm"
                  onClick={() => setViewing(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Edit Recipient Email */}
      {editingRecipient && (
        <Modal title="Change Contact Recipient Email" onClose={() => setEditingRecipient(false)}>
          <form onSubmit={handleSaveRecipient}>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)", marginBottom: 14 }}>
              All new messages sent through the website Contact Us page will be emailed to this address.
            </p>

            <Field
              label="Recipient Email Address"
              type="email"
              required
              autoFocus
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              placeholder="e.g. dwrw951fm@yahoo.com"
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button
                type="button"
                className="adm-btn plain sm"
                disabled={savingRecip}
                onClick={() => setEditingRecipient(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="adm-btn sm"
                disabled={savingRecip || !newRecipient.trim()}
              >
                {savingRecip ? "Saving…" : "Save Recipient"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
