/* eslint-disable react-refresh/only-export-components */
// Shared building blocks for every admin page: helpers, toasts, DataTables wrapper, modal, form bits.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import DataTable from "datatables.net-react";
import DT from "datatables.net-dt";
import "datatables.net-dt/css/dataTables.dataTables.min.css";

// ---------- Helpers ----------
// The database keeps YYYY-MM-DD. The admin only shows month and year and saves the 1st.
export const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
export const toMonth = (d) => (d ? String(d).slice(0, 7) : "");
export const toDate = (m) => (m ? `${m}-01` : "");

export function report(notify, r) {
  const msg = `Uploaded ${r.ok} of ${r.total}.` + (r.problems.length ? "\n" + r.problems.join("\n") : "");
  notify(msg, r.problems.length ? (r.ok ? "warn" : "err") : "ok");
}

// Always holds the newest value. Table button handlers read from this
// so they never act on stale data.
export function useLatest(value) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; });
  return ref;
}

export function usePreviews(files) {
  const [urls, setUrls] = useState([]);
  useEffect(() => {
    const made = files.map((f) => URL.createObjectURL(f));
    setUrls(made);
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  return urls;
}

// ---------- Toast ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const notify = useCallback((message, type = "ok") => {
    const id = Date.now() + Math.random();
    setItems((l) => [...l, { id, message, type }]);
    setTimeout(() => setItems((l) => l.filter((i) => i.id !== id)), type === "ok" ? 3000 : 8000);
  }, []);
  return (
    <ToastCtx.Provider value={notify}>
      {children}
      <div className="adm adm-toasts" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`adm-toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- Table ----------
DataTable.use(DT);

const DEFAULTS = {
  pageLength: 10,
  lengthMenu: [10, 25, 50, 100],
  autoWidth: false,
  language: { emptyTable: "Nothing here yet.", zeroRecords: "No matches found." },
};

// Use for lists where the order is set by the ▲ ▼ buttons
export const ORDERED = { ordering: false };

// Thin wrapper around DataTables.
// Keep `columns` and `options` as constants outside your component so the table is not rebuilt on every render.
// `slots` is { columnIndex: (cellData, rowData) => <jsx /> }
export function AdminTable({ data, columns, slots, options }) {
  const opts = useMemo(() => ({ ...DEFAULTS, ...options }), [options]);
  return (
    <div className="adm-table">
      <DataTable data={data} columns={columns} slots={slots} options={opts} className="display" />
    </div>
  );
}

// ---------- Modal ----------
export function Modal({ title, onClose, wide, children }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="adm adm-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={"adm-modal" + (wide ? " wide" : "")} role="dialog" aria-modal="true" aria-label={title}>
        <div className="adm-modal-head">
          <h3>{title}</h3>
          <button className="adm-btn plain sm" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="adm-modal-body">{children}</div>
      </div>
    </div>
  );
}

// ---------- Field ----------
export function Field({ label, hint, textarea, ...props }) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <label className="adm-field">
      <span>{label}</span>
      <Tag {...props} />
      {hint && <small>{hint}</small>}
    </label>
  );
}

// ---------- RowActions ----------
export function RowActions({ onUp, onDown, onEdit, onDelete, editLabel = "Edit" }) {
  return (
    <div className="adm-row-actions">
      {onEdit && <button className="adm-btn plain sm" onClick={onEdit}>{editLabel}</button>}
      {onUp && <button className="adm-btn plain sm" title="Move up" aria-label="Move up" onClick={onUp}>▲</button>}
      {onDown && <button className="adm-btn plain sm" title="Move down" aria-label="Move down" onClick={onDown}>▼</button>}
      {onDelete && <button className="adm-btn sm" title="Delete" aria-label="Delete" onClick={onDelete}>✕</button>}
    </div>
  );
}

// ---------- ImagePicker ----------
// File input with thumbnails of what you picked.
// The parent owns `files` (array) and clears it with inputRef.current.value = "" and onChange([]).
export function ImagePicker({ files, onChange, inputRef, multiple = true }) {
  const previews = usePreviews(files);
  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" multiple={multiple}
        onChange={(e) => onChange([...e.target.files])} />
      {previews.length > 0 && (
        <div className="adm-grid">
          {previews.map((u) => <img key={u} src={u} alt="" />)}
        </div>
      )}
    </>
  );
}

// ---------- SingleMedia ----------
// One picture or video that gets replaced when you upload a new one
// (hero, video, about banner, program card backgrounds).
// onUpload(file) and onRemove() should throw on failure.
export function SingleMedia({ title, hint, url, kind = "image", accept = "image/*", onUpload, onRemove, children }) {
  const notify = useToast();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async () => {
    const file = ref.current?.files[0];
    if (!file) return notify("Choose a file first.", "err");
    setBusy(true);
    try {
      await onUpload(file);
      if (ref.current) ref.current.value = "";
    } catch (e) {
      notify(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Remove this ${kind}?`)) return;
    try { await onRemove(); } catch (e) { notify(e.message, "err"); }
  };

  return (
    <section className="adm-card">
      <h2>{title}</h2>
      {hint && <p className="adm-hint">{hint}</p>}
      {url && (kind === "video"
        ? <video className="adm-preview" src={url} controls preload="metadata" />
        : <img className="adm-preview" src={url} alt="" />)}
      {children}
      <input ref={ref} type="file" accept={accept} />
      <div className="adm-actions">
        <button className="adm-btn" disabled={busy} onClick={upload}>{busy ? "Uploading…" : "Upload"}</button>
        {url && onRemove && <button className="adm-btn plain" onClick={remove}>Remove</button>}
      </div>
    </section>
  );
}

// ---------- CaptionModal ----------
// onSave(caption) must return true on success
export function CaptionModal({ title = "Edit caption", initial, onSave, onClose }) {
  const [value, setValue] = useState(initial || "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const ok = await onSave(value);
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal title={title} onClose={onClose}>
      <Field label="Caption (optional)" value={value} maxLength={255} autoFocus
        onChange={(e) => setValue(e.target.value)} />
      <div className="adm-actions">
        <button className="adm-btn" disabled={busy} onClick={save}>Save caption</button>
      </div>
    </Modal>
  );
}