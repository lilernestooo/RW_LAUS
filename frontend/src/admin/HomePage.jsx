import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminTable, CaptionModal, Field, ImagePicker, ORDERED, RowActions, SingleMedia, report, useToast } from "./UI";
import { get, postForm, uploadBatches } from "../api/api";

const AWARD_COLS = [
  { title: "Photo", data: "url", orderable: false, searchable: false },
  { title: "Caption", data: "caption", defaultContent: "" },
  { title: "", data: null, orderable: false, searchable: false, defaultContent: "" },
];

export default function HomeAdmin() {
  const notify = useToast();
  const [items, setItems] = useState([]);
  const [caption, setCaption] = useState("");
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null);
  const awardRef = useRef(null);

  const load = useCallback(
    () => get("home.php").then((r) => setItems(r.data.items)).catch((e) => notify(e.message, "err")),
    [notify]
  );
  useEffect(() => { load(); }, [load]);

  const hero = items.find((i) => i.kind === "hero");
  const video = items.find((i) => i.kind === "video");
  const awards = useMemo(() => items.filter((i) => i.kind === "award"), [items]);
  const editing = awards.find((a) => a.id === editId);

  // Runs a small action. Returns true on success.
  const act = async (fields, okMsg) => {
    try {
      await postForm("home.php", fields);
      notify(okMsg);
      await load();
      return true;
    } catch (e) {
      notify(e.message, "err");
      return false;
    }
  };

  const sendOne = async (kind, file) => {
    report(notify, await uploadBatches("home.php", { kind }, "files[]", [file]));
    await load();
  };

  const sendAwards = async () => {
    if (!files.length) return notify("Choose at least one photo.", "err");
    setBusy(true);
    try {
      const r = await uploadBatches("home.php", caption.trim() ? { kind: "award", caption: caption.trim() } : { kind: "award" }, "files[]", files);
      report(notify, r);
      awardRef.current.value = "";
      setFiles([]);
      setCaption("");
      await load();
    } finally { setBusy(false); }
  };

  return (
    <>
      <header className="adm-head"><h1>Homepage</h1></header>

      <SingleMedia title="Hero image" hint="The big picture at the top of the homepage. Uploading a new one replaces it."
        url={hero?.url} onUpload={(f) => sendOne("hero", f)}
        onRemove={hero ? () => act({ action: "delete", id: hero.id }, "Removed.") : undefined} />

      <section className="adm-card">
        <h2>Award photos</h2>
        <p className="adm-hint">Shown in the Awards slider. You can choose many at once. The caption is optional and appears over the photo.</p>
        <Field label="Caption for the photos you upload now (optional)" value={caption} maxLength={255}
          onChange={(e) => setCaption(e.target.value)} />
        <ImagePicker files={files} onChange={setFiles} inputRef={awardRef} />
        <div className="adm-actions">
          <button className="adm-btn" disabled={busy} onClick={sendAwards}>{busy ? "Uploading…" : "Upload award photos"}</button>
        </div>
        <AdminTable data={awards} columns={AWARD_COLS} options={ORDERED} slots={{
          0: (url) => <img className="adm-thumb" src={url} alt="" loading="lazy" />,
          2: (_, row) => (
            <RowActions editLabel="Edit caption" onEdit={() => setEditId(row.id)}
              onDelete={() => window.confirm("Delete this photo?") && act({ action: "delete", id: row.id }, "Deleted.")} />
          ),
        }} />
      </section>

      <SingleMedia title="Video" kind="video" accept="video/mp4,video/webm"
        hint="MP4 or WEBM, up to 38 MB. Uploading a new one replaces it. Large files take a while."
        url={video?.url} onUpload={(f) => sendOne("video", f)}
        onRemove={video ? () => act({ action: "delete", id: video.id }, "Removed.") : undefined} />

      {editing && (
        <CaptionModal initial={editing.caption} onClose={() => setEditId(null)}
          onSave={(c) => act({ action: "caption", id: editing.id, caption: c }, "Caption saved.")} />
      )}
    </>
  );
}