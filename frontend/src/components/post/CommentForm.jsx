import { useEffect, useState } from "react";
import { fetchComments, sendComment } from "../../api/api";

export default function CommentForm({ postId }) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [comments, setComments] = useState([]);
  const [form, setForm] = useState({ comment: "", name: "", email: "", website: "", hp: "" });

  // Only load comments once we know which post this is
  useEffect(() => {
    if (!postId) return;
    fetchComments(postId).then((r) => setComments(r.data)).catch(() => {});
  }, [postId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!postId) {
      setError("Could not tell which post this comment is for. Please reload the page.");
      return;
    }
    setSending(true);
    setError("");
    try {
      await sendComment({ post_id: postId, ...form });
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const field = "w-full bg-[#2a2a2a] p-3 text-sm text-white outline-none placeholder:text-neutral-500";
  const label = "mb-1 block text-sm font-bold text-white";

  return (
    <section className="mt-10 border-t border-white/10 pt-8">
      {comments.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-white">
            {comments.length} {comments.length === 1 ? "Comment" : "Comments"}
          </h2>
          <ul className="mt-4 space-y-5">
            {comments.map((c) => (
              <li key={c.id} className="border-b border-white/10 pb-4">
                <p className="text-sm font-bold text-white">
                  {c.website && /^https?:\/\//i.test(c.website) ? (
                    <a href={c.website} target="_blank" rel="nofollow noopener noreferrer" className="hover:underline">
                      {c.name}
                    </a>
                  ) : (
                    c.name
                  )}
                  <span className="ml-2 font-normal text-neutral-500">
                    {new Date(c.created_at.replace(" ", "T")).toLocaleDateString()}
                  </span>
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-neutral-300">{c.comment}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <h2 className="text-xl font-bold text-white">Leave a Reply</h2>
      <p className="mt-2 text-sm text-neutral-400">
        Your email address will not be published. Required fields are marked *
      </p>

      {submitted ? (
        <p className="mt-4 font-semibold text-white">
          Thanks for your comment! It will appear after it has been approved.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="comment" className={label}>Comment *</label>
            <textarea id="comment" required rows={6} maxLength={3000} className={field}
              value={form.comment} onChange={set("comment")} />
          </div>
          <div>
            <label htmlFor="name" className={label}>Name *</label>
            <input id="name" type="text" required maxLength={100} className={field}
              value={form.name} onChange={set("name")} />
          </div>
          <div>
            <label htmlFor="email" className={label}>Email *</label>
            <input id="email" type="email" required maxLength={190} className={field}
              value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label htmlFor="website" className={label}>Website</label>
            <input id="website" type="text" className={field}
              value={form.website} onChange={set("website")} />
          </div>

          {/* Honeypot: hidden from people, bots fill it in */}
          <input type="text" name="hp" tabIndex={-1} autoComplete="off" aria-hidden="true"
            className="absolute left-[-9999px]" value={form.hp} onChange={set("hp")} />

          {error && <p className="text-sm font-semibold text-red-500">{error}</p>}

          <button type="submit" disabled={sending}
            className="bg-red-600 px-6 py-2.5 text-sm font-bold uppercase text-white hover:bg-red-700 disabled:opacity-50">
            {sending ? "Posting..." : "Post Comment"}
          </button>
        </form>
      )}
    </section>
  );
}