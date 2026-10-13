import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminTable, Field, Modal, ORDERED, RowActions, SingleMedia, useLatest, useToast } from "./UI";
import { get, postForm } from "../api/api";

const PEOPLE_COLS = [
  { title: "Photo", data: "photo_url", orderable: false, searchable: false, defaultContent: "" },
  { title: "Name", data: "name" },
  { title: "Title", data: "role", defaultContent: "" },
  { title: "Show", data: "show_name", defaultContent: "" },
  { title: "Schedule", data: "schedule", defaultContent: "" },
  { title: "", data: null, orderable: false, searchable: false, defaultContent: "" },
];
const MILESTONE_COLS = [
  { title: "Year", data: "year" },
  { title: "Title", data: "title" },
  { title: "Description", data: "description", defaultContent: "" },
  { title: "", data: null, orderable: false, searchable: false, defaultContent: "" },
];
const PROGRAM_COLS = [
  { title: "Category", data: "category" },
  { title: "Name", data: "name" },
  { title: "", data: null, orderable: false, searchable: false, defaultContent: "" },
];
const MILESTONE_OPTS = { order: [[0, "desc"]] };

function PeopleTable({ people, onMove, onEdit, onDelete }) {
  return (
    <AdminTable data={people} columns={PEOPLE_COLS} options={ORDERED} slots={{
      0: (url) => url ? <img className="adm-thumb round" src={url} alt="" /> : <span className="adm-muted">no photo</span>,
      5: (_, r) => (
        <RowActions onEdit={() => onEdit(r.id)} onUp={() => onMove(r.kind, r.id, -1)}
          onDown={() => onMove(r.kind, r.id, 1)} onDelete={() => onDelete(r)} />
      ),
    }} />
  );
}

// Used for both "Add" and "Edit". onSubmit(fields) returns true on success.
function PersonForm({ initial, submitLabel, onSubmit }) {
  const notify = useToast();
  const isEdit = !!initial;
  const blank = { kind: "dj", name: "", role: "", show_name: "", schedule: "" };
  const [f, setF] = useState({ ...blank, ...(initial || {}) });
  const [photo, setPhoto] = useState(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async () => {
    if (!f.name.trim()) return notify("Name is required.", "err");
    setBusy(true);
    const ok = await onSubmit({ ...f, photo });
    setBusy(false);
    if (ok && !isEdit) { setF(blank); setPhoto(null); setFileKey((k) => k + 1); }
  };

  return (
    <div className="adm-stack">
      {!isEdit && (
        <label className="adm-field"><span>Type</span>
          <select value={f.kind} onChange={set("kind")}>
            <option value="dj">DJ</option>
            <option value="anchor">News anchor</option>
          </select>
        </label>
      )}
      <Field label="Name" value={f.name} maxLength={120} onChange={set("name")} />
      <Field label="Title (e.g. Morning Host)" value={f.role || ""} maxLength={160} onChange={set("role")} />
      <Field label="Show" value={f.show_name || ""} maxLength={160} onChange={set("show_name")} />
      <Field label="Schedule (e.g. Mon–Fri, 2–6 PM)" value={f.schedule || ""} maxLength={160} onChange={set("schedule")} />
      <label className="adm-field"><span>{isEdit ? "Photo (leave empty to keep the current one)" : "Photo (optional, JPG, PNG or WEBP, up to 8 MB)"}</span>
        <input key={fileKey} type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0] || null)} />
      </label>
      <div className="adm-actions">
        <button className="adm-btn" disabled={busy} onClick={submit}>{busy ? "Saving…" : submitLabel}</button>
      </div>
    </div>
  );
}

export default function AboutAdmin() {
  const notify = useToast();
  const [data, setData] = useState({ banner: null, people: [], milestones: [], programs: [] });
  const [bannerAlt, setBannerAlt] = useState("");
  const [modal, setModal] = useState(null); // "add" | person id
  const [ms, setMs] = useState({ year: "", title: "", description: "" });
  const [pr, setPr] = useState({ category: "news", name: "" });
  const dataRef = useLatest(data);

  const load = useCallback(
    () => get("about.php").then((r) => r.data && setData(r.data)).catch((e) => notify(e.message, "err")),
    [notify]
  );
  useEffect(() => { load(); }, [load]);

  const act = async (fields, okMsg) => {
    try {
      await postForm("about.php", fields);
      notify(okMsg);
      await load();
      return true;
    } catch (e) {
      notify(e.message, "err");
      return false;
    }
  };

  const djs = useMemo(() => data.people.filter((p) => p.kind === "dj"), [data.people]);
  const anchors = useMemo(() => data.people.filter((p) => p.kind === "anchor"), [data.people]);
  const editing = typeof modal === "number" || (typeof modal === "string" && modal !== "add")
    ? data.people.find((p) => String(p.id) === String(modal)) : null;

  const movePerson = (kind, id, dir) => {
    const ids = dataRef.current.people.filter((p) => p.kind === kind).map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    act({ action: "reorder_people", kind, ids: ids.join(",") }, "Order saved.");
  };
  const deletePerson = (p) => window.confirm(`Delete ${p.name}?`) && act({ action: "delete_person", id: p.id }, "Deleted.");
  const peopleProps = { onMove: movePerson, onEdit: setModal, onDelete: deletePerson };

  return (
    <>
      <header className="adm-head"><h1>About page</h1></header>

      <SingleMedia title="Banner image" url={data.banner?.photo_url}
        hint="The big picture at the top of About Us (the Golden Dove photo). Uploading a new one replaces it."
        onUpload={async (photo) => {
          await postForm("about.php", { action: "set_banner", caption: bannerAlt, photo });
          notify("Banner updated.");
          setBannerAlt("");
          await load();
        }}
        onRemove={data.banner ? async () => { await postForm("about.php", { action: "delete_banner" }); notify("Removed."); await load(); } : undefined}>
        <Field label="Alt text (optional)" value={bannerAlt} maxLength={160}
          placeholder="Golden Dove Best Provincial FM Station" onChange={(e) => setBannerAlt(e.target.value)} />
      </SingleMedia>

      <section className="adm-card">
        <div className="adm-card-head">
          <h2>DJs and news anchors</h2>
          <button className="adm-btn" onClick={() => setModal("add")}>Add person</button>
        </div>
        <p className="adm-hint">Top of each list is shown first on the site. Use ▲ ▼ to reorder.</p>
        <h3>DJs</h3>
        <PeopleTable people={djs} {...peopleProps} />
        <h3>News anchors</h3>
        <PeopleTable people={anchors} {...peopleProps} />
      </section>

      <section className="adm-card">
        <h2>Our Journey (awards and milestones)</h2>
        <div className="adm-row">
          <input style={{ width: "6rem" }} placeholder="Year" maxLength={4} value={ms.year}
            onChange={(e) => setMs({ ...ms, year: e.target.value })} />
          <input placeholder="Title" maxLength={160} value={ms.title} onChange={(e) => setMs({ ...ms, title: e.target.value })} />
        </div>
        <Field label="Description (optional)" maxLength={500} value={ms.description}
          onChange={(e) => setMs({ ...ms, description: e.target.value })} />
        <div className="adm-actions">
          <button className="adm-btn" onClick={async () => {
            if (await act({ action: "add_milestone", ...ms }, "Added.")) setMs({ year: "", title: "", description: "" });
          }}>Add milestone</button>
        </div>
        <AdminTable data={data.milestones} columns={MILESTONE_COLS} options={MILESTONE_OPTS} slots={{
          3: (_, m) => <RowActions onDelete={() => window.confirm("Delete this milestone?") && act({ action: "delete_milestone", id: m.id }, "Deleted.")} />,
        }} />
      </section>

      <section className="adm-card">
        <h2>Programs listed on About</h2>
        <div className="adm-row">
          <select value={pr.category} onChange={(e) => setPr({ ...pr, category: e.target.value })} style={{ width: "auto" }}>
            <option value="news">News and public affairs</option>
            <option value="entertainment">Entertainment</option>
          </select>
          <input placeholder="Program name" maxLength={120} value={pr.name} onChange={(e) => setPr({ ...pr, name: e.target.value })} />
          <button className="adm-btn" onClick={async () => {
            if (await act({ action: "add_program", ...pr }, "Added.")) setPr({ ...pr, name: "" });
          }}>Add</button>
        </div>
        <AdminTable data={data.programs} columns={PROGRAM_COLS} slots={{
          2: (_, g) => <RowActions onDelete={() => window.confirm("Delete this program?") && act({ action: "delete_program", id: g.id }, "Deleted.")} />,
        }} />
      </section>

      {modal === "add" && (
        <Modal title="Add a DJ or anchor" onClose={() => setModal(null)}>
          <PersonForm submitLabel="Add person" onSubmit={(f) => act({ action: "add_person", ...f }, "Added.")} />
        </Modal>
      )}
      {editing && (
        <Modal title={`Edit ${editing.name}`} onClose={() => setModal(null)}>
          <PersonForm initial={editing} submitLabel="Save changes" onSubmit={async (f) => {
            const ok = await act({ action: "update_person", id: editing.id, name: f.name, role: f.role, show_name: f.show_name, schedule: f.schedule, photo: f.photo }, "Saved.");
            if (ok) setModal(null);
            return ok;
          }} />
        </Modal>
      )}
    </>
  );
}