import { useCallback, useEffect, useRef, useState } from "react";
import { AdminTable, CaptionModal, Field, ImagePicker, RowActions, report, useLatest, useToast } from "./UI";
import { get, postForm, uploadBatches } from "../api/api";

const COLUMNS = [
  { title: "#", data: null, orderable: false, searchable: false, defaultContent: "", render: (d, t, r, meta) => meta.row + 1 },
  { title: "Photo", data: "url", orderable: false, searchable: false },
  { title: "Caption", data: "caption", orderable: false, defaultContent: "" },
  { title: "", data: null, orderable: false, searchable: false, defaultContent: "" },
];
const OPTIONS = { ordering: false, pageLength: 10 };

export default function GalleryAdmin() {
  const notify = useToast();
  const [photos, setPhotos] = useState([]);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState("");
  const [editId, setEditId] = useState(null);
  const inputRef = useRef(null);
  const photosRef = useLatest(photos);

  const load = useCallback(
    () => get("gallery.php").then((r) => setPhotos(r.data.photos)).catch((e) => notify(e.message, "err")),
    [notify]
  );
  useEffect(() => { load(); }, [load]);

  const act = async (fields, okMsg) => {
    try {
      await postForm("gallery.php", fields);
      notify(okMsg);
      await load();
      return true;
    } catch (e) {
      notify(e.message, "err");
      return false;
    }
  };

  // Swap with the neighbour and save the order of the whole gallery
  const move = (id, dir) => {
    const ids = photosRef.current.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    act({ action: "reorder", ids: ids.join(",") }, "Order saved.");
  };

  const upload = async () => {
    if (!files.length) return notify("Choose at least one photo.", "err");
    setBusy("Uploading…");
    try {
      const r = await uploadBatches("gallery.php", caption.trim() ? { caption: caption.trim() } : {}, "files[]", files,
        (b, n) => setBusy(`Uploading batch ${b} of ${n}…`));
      report(notify, r);
      if (r.ok) { inputRef.current.value = ""; setFiles([]); setCaption(""); }
      await load();
    } finally { setBusy(""); }
  };

  const editing = photos.find((p) => p.id === editId);

  return (
    <>
      <header className="adm-head"><h1>Gallery page</h1></header>

      <section className="adm-card">
        <h2>Add photos</h2>
        <p className="adm-hint">JPG, PNG, WEBP or GIF, up to 8 MB each. You can choose many at once. New photos appear first on the site.</p>
        <Field label="Caption for the photos you upload now (optional)" value={caption} maxLength={255}
          onChange={(e) => setCaption(e.target.value)} />
        <ImagePicker files={files} onChange={setFiles} inputRef={inputRef} />
        <div className="adm-actions">
          <button className="adm-btn" disabled={!!busy} onClick={upload}>{busy || "Upload photos"}</button>
        </div>
      </section>

      <section className="adm-card">
        <h2>Photos on the Gallery page</h2>
        <p className="adm-hint">{photos.length ? `${photos.length} photo(s). The first one is shown first on the site.` : "No photos yet. The site shows placeholder tiles until you upload some."}</p>
        <AdminTable data={photos} columns={COLUMNS} options={OPTIONS} slots={{
          1: (url) => <img className="adm-thumb" src={url} alt="" loading="lazy" />,
          3: (_, row) => (
            <RowActions editLabel="Edit caption" onEdit={() => setEditId(row.id)}
              onUp={() => move(row.id, -1)} onDown={() => move(row.id, 1)}
              onDelete={() => window.confirm("Delete this photo?") && act({ action: "delete", id: row.id }, "Deleted.")} />
          ),
        }} />
      </section>

      {editing && (
        <CaptionModal initial={editing.caption} onClose={() => setEditId(null)}
          onSave={(c) => act({ action: "caption", id: editing.id, caption: c }, "Caption saved.")} />
      )}
    </>
  );
}