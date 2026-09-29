import { useState } from "react";

export default function CommentForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const field = "w-full bg-[#2a2a2a] p-3 text-sm text-white outline-none placeholder:text-neutral-500";
  const label = "mb-1 block text-sm font-bold text-white";

  return (
    <section className="mt-10 border-t border-white/10 pt-8">
      <h2 className="text-xl font-bold text-white">Leave a Reply</h2>
      <p className="mt-2 text-sm text-neutral-400">
        Your email address will not be published. Required fields are marked *
      </p>

      {submitted ? (
        <p className="mt-4 font-semibold text-white">
          Thanks for your comment! (Demo form — nothing was sent.)
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="comment" className={label}>
              Comment *
            </label>
            <textarea id="comment" required rows={6} className={field} />
          </div>

          <div>
            <label htmlFor="name" className={label}>
              Name *
            </label>
            <input id="name" type="text" required className={field} />
          </div>

          <div>
            <label htmlFor="email" className={label}>
              Email *
            </label>
            <input id="email" type="email" required className={field} />
          </div>

          <div>
            <label htmlFor="website" className={label}>
              Website
            </label>
            <input id="website" type="text" className={field} />
          </div>

          <button
            type="submit"
            className="bg-red-600 px-6 py-2.5 text-sm font-bold uppercase text-white hover:bg-red-700"
          >
            Post Comment
          </button>
        </form>
      )}
    </section>
  );
}