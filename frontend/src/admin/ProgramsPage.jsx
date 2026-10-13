import { useCallback, useEffect, useState } from "react";
import { AdminTable, Field, Modal, ORDERED, RowActions, SingleMedia, useLatest, useToast } from "./UI";
import { get, postForm } from "../api/api";

const COLUMNS = [
  { title: "Image", data: "image", orderable: false, searchable: false, defaultContent: "" },
  { title: "Program", data: "title" },
  { title: "Host", data: "host", defaultContent: "" },
  { title: "Schedule", data: "schedule", defaultContent: "" },
  { title: "Audio", data: "audio", orderable: false, searchable: false, defaultContent: "" },
  { title: "", data: null, orderable: false, searchable: false, defaultContent: "" },
];

function ProgramTable({ programs, onMove, onEdit, onDelete }) {
  return (
    <AdminTable data={programs} columns={COLUMNS} options={ORDERED} slots={{
      0: (url) => url ? <img className="adm-thumb" src={url} alt="" loading="lazy" /> : <span className="adm-muted">none</span>,
      4: (a) => (a ? "🔊" : "—"),
      5: (_, p) => (
        <RowActions onEdit={() => onEdit(p.id)} onUp={() => onMove(p.id, -1)} onDown={() => onMove(p.id, 1)}
          onDelete={() => onDelete(p)} />
      ),
    }} />
  );
}

// Used for both "Add" and "Edit". onSubmit(fields) returns true on success.
function ProgramForm({ categories, initial, onSubmit }) {
  const notify = useToast();
  const isEdit = !!initial;
  const [f, setF] = useState({
    category: categories[0]?.slug || "",
    title: initial?.title || "", host: initial?.host || "",
    schedule: initial?.schedule || "", description: initial?.description || "",
  });
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);
  const [rmImage, setRmImage] = useState(false);
  const [rmAudio, setRmAudio] = useState(false);
  const [busy, setBusy] = useState(false);
  const [key, setKey] = useState(0);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async () => {
    if (!f.title.trim()) return notify("Enter the program name.", "err");
    setBusy(true);
    const ok = await onSubmit({
      ...f, image, audio,
      remove_image: rmImage ? "1" : null,
      remove_audio: rmAudio ? "1" : null,
    });
    setBusy(false);
    if (ok && !isEdit) {
      setF({ ...f, title: "", host: "", schedule: "", description: "" });
      setImage(null); setAudio(null); setKey((k) => k + 1);
    }
  };

  return (
    <div className="adm-stack">
      {!isEdit && (
        <label className="adm-field"><span>Category</span>
          <select value={f.category} onChange={set("category")}>
            {categories.map((c) => <option key={c.slug} value={c.slug}>{c.title}</option>)}
          </select>
        </label>
      )}
      <Field label="Program name (e.g. Sunny Side Up)" value={f.title} maxLength={160} onChange={set("title")} />
      <Field label="Host (e.g. DJ Don Marco)" hint={'The site shows "Program name hosted by Host".'} value={f.host} maxLength={160} onChange={set("host")} />
      <Field label="Schedule (e.g. Mondays, Tuesdays and Fridays, 5:00 AM – 9:00 AM)" value={f.schedule} maxLength={255} onChange={set("schedule")} />
      <Field textarea label="Description" value={f.description} maxLength={2000} rows={4} onChange={set("description")} />

      <label className="adm-field">
        <span>{isEdit ? "Image (leave empty to keep the current one)" : "Image (optional, JPG, PNG or WEBP, up to 8 MB)"}</span>
        <input key={"i" + key} type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0] || null)} />
      </label>
      {isEdit && initial.image && (
        <label className="adm-check"><input type="checkbox" checked={rmImage} onChange={(e) => setRmImage(e.target.checked)} /> Remove the current image</label>
      )}

      <label className="adm-field">
        <span>{isEdit ? "Audio (leave empty to keep the current one)" : "Audio (optional, MP3, M4A, OGG or WAV, up to 25 MB)"}</span>
        <input key={"a" + key} type="file" accept="audio/*" onChange={(e) => setAudio(e.target.files[0] || null)} />
      </label>
      {isEdit && initial.audio && (
        <>
          <audio controls preload="none" src={initial.audio} style={{ width: "100%" }} />
          <label className="adm-check"><input type="checkbox" checked={rmAudio} onChange={(e) => setRmAudio(e.target.checked)} /> Remove the current audio</label>
        </>
      )}

      <div className="adm-actions">
        <button className="adm-btn" disabled={busy} onClick={submit}>
          {busy ? "Saving… audio files take a while" : isEdit ? "Save changes" : "Add program"}
        </button>
      </div>
    </div>
  );
}

export default function ProgramsAdmin() {
  const notify = useToast();
  const [cats, setCats] = useState([]);
  const [modal, setModal] = useState(null); // "add" | program id
  const catsRef = useLatest(cats);

  const load = useCallback(
    () => get("programs.php").then((r) => setCats(r.data.categories)).catch((e) => notify(e.message, "err")),
    [notify]
  );
  useEffect(() => { load(); }, [load]);

  const act = async (fields, okMsg) => {
    try {
      await postForm("programs.php", fields);
      notify(okMsg);
      await load();
      return true;
    } catch (e) {
      notify(e.message, "err");
      return false;
    }
  };

  const move = (id, dir) => {
    const cat = catsRef.current.find((c) => c.programs.some((p) => p.id === id));
    if (!cat) return;
    const ids = cat.programs.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    act({ action: "reorder", ids: ids.join(",") }, "Order saved.");
  };
  const del = (p) => window.confirm(`Delete ${p.title}?`) && act({ action: "delete_program", id: p.id }, "Deleted.");

  const editing = modal && modal !== "add"
    ? cats.flatMap((c) => c.programs).find((p) => p.id === modal) : null;

  return (
    <>
      <header className="adm-head">
        <h1>Programs page</h1>
        <p>Card backgrounds and the programs listed under each category.</p>
      </header>

      <div className="adm-two">
        {cats.map((c) => (
          <SingleMedia key={c.slug} title={`${c.title} card`} url={c.background}
            hint="The picture behind this card on the Programs page. Uploading a new one replaces it."
            onUpload={async (photo) => { await postForm("programs.php", { action: "set_background", category: c.slug, photo }); notify("Background updated."); await load(); }}
            onRemove={c.background ? async () => { await postForm("programs.php", { action: "delete_background", category: c.slug }); notify("Removed."); await load(); } : undefined} />
        ))}
      </div>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>Programs</h2>
          <button className="adm-btn" onClick={() => setModal("add")}>Add program</button>
        </div>
        <p className="adm-hint">Top of each list is shown first on the site. Use ▲ ▼ to reorder.</p>
        {cats.map((c) => (
          <div key={c.slug}>
            <h3>{c.title}</h3>
            <ProgramTable programs={c.programs} onMove={move} onEdit={setModal} onDelete={del} />
          </div>
        ))}
      </section>

      {modal === "add" && (
        <Modal wide title="Add a program" onClose={() => setModal(null)}>
          <ProgramForm categories={cats} onSubmit={(f) => act({ action: "add_program", ...f }, "Added.")} />
        </Modal>
      )}
      {editing && (
        <Modal wide title={`Edit ${editing.title}`} onClose={() => setModal(null)}>
          <ProgramForm categories={cats} initial={editing} onSubmit={async (f) => {
            const { category, ...rest } = f; // eslint-disable-line no-unused-vars
            const ok = await act({ action: "update_program", id: editing.id, ...rest }, "Saved.");
            if (ok) setModal(null);
            return ok;
          }} />
        </Modal>
      )}
    </>
  );
}