import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import { sendContact } from "../api/api";

/* ---------- Reveal-on-scroll helper ----------
   direction: "up" | "left" | "right" | "none"
   delay: milliseconds (use it to stagger items)
   as: the tag to render ("div" by default, "li", "nav", "h1", ...)
   Plays once, and is skipped for people who prefer reduced motion. */
function Reveal({ as: Tag = "div", direction = "up", delay = 0, className = "", children, ...rest }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const hiddenShift = {
    up: "translate-y-8",
    left: "-translate-x-8",
    right: "translate-x-8",
    none: "",
  }[direction];

  return (
    <Tag
      ref={ref}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
      className={`transition-all duration-700 ease-out motion-reduce:transition-none ${
        shown ? "translate-x-0 translate-y-0 opacity-100" : `opacity-0 ${hiddenShift}`
      } ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// Google Maps embed (Jose Abad Santos Avenue, San Fernando, Pampanga)
const MAP_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2920.4594726076484!2d120.68885363262974!3d15.046545979288304!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3396f76ad728ac35%3A0x7b9182aedd0cf8a1!2sJose%20Abad%20Santos%20Ave%2C%20San%20Fernando%2C%20Pampanga!5e1!3m2!1sen!2sph!4v1639641097568!5m2!1sen!2sph";

// Google's own ID for this place (copied from the map embed above), so both links
// go to exactly the same spot as the original map card
const PLACE_NAME = "Jose+Abad+Santos+Ave,+San+Fernando,+Pampanga";
const PLACE_ID = "0x3396f76ad728ac35:0x7b9182aedd0cf8a1";
const PLACE_LAT = 15.046546;
const PLACE_LNG = 120.688854;

// Directions: Victory Liner Bus Terminal (San Fernando) -> Jose Abad Santos Ave.
// This is the full Google Maps route link, so the start, the end and the route all match.
const DIRECTIONS_URL =
  "https://www.google.com/maps/dir/Victory+Liner+Bus+Terminal+-+San+Fernando,+Jose+Abad+Santos+Avenue,+San+Isidro+,+2001+Bacolor+,+Pampanga/Jose+Abad+Santos+Ave,+San+Fernando,+Pampanga/@15.0427355,120.6813893,1380m/data=!3m2!1e3!4b1!4m14!4m13!1m5!1m1!1s0x3396f711ec0e4977:0x79a1bc0962942144!2m2!1d120.6830925!2d15.0392772!1m5!1m1!1s0x3396f76ad728ac35:0x7b9182aedd0cf8a1!2m2!1d120.6895894!2d15.0459079!3e0";

// Opens the place itself in Google Maps
const OPEN_URL = `https://www.google.com/maps/place/${PLACE_NAME}/data=!4m2!3m1!1s${PLACE_ID}`;

const details = [
  { label: "Address", value: "3rd Floor, Corporate Guarantee, Jose Abad Santos Avenue, City of San Fernando, Pampanga 2000" },
  { label: "Tel No", value: "(045) 963 9595", href: "tel:+63459639595" },
  { label: "E-mail", value: "rw951fm@yahoo.com", href: "mailto:rw951fm@yahoo.com" },
  { label: "Requests and Greetings", value: "Text +63 919 264 4439", href: "sms:+639192644439" },
  { label: "Radio ad placement and marketing collaborations", value: "Text or Call: +63 919 065 0061", href: "tel:+639190650061" },
];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field =
  "w-full border border-white/10 bg-[#222] px-3 py-2.5 text-white outline-none transition focus:border-red-600 focus:bg-[#2a2a2a] text-base";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "", website: "" }); // website = hidden spam trap
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState({ type: "", text: "" }); // type: "", "sending", "ok", "error"

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: "" }));
  };

  const validate = () => {
    const er = {};
    if (!form.name.trim()) er.name = "Please enter your name.";
    if (!form.email.trim()) er.email = "Please enter your e-mail.";
    else if (!EMAIL.test(form.email.trim())) er.email = "That e-mail doesn't look right.";
    return er;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;

    setStatus({ type: "sending", text: "Sending…" });
    try {
      await sendContact({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        website: form.website,
      });
      setForm({ name: "", email: "", message: "", website: "" });
      setStatus({ type: "ok", text: "Thank you! Your message has been sent." });
    } catch (err) {
      // 422 = a field was rejected, 429 = too many messages: the server's own wording is clearer for the visitor
      const friendly = err.status === 422 || err.status === 429;
      setStatus({
        type: "error",
        text: friendly ? err.message : "Sorry, we couldn't send your message. Please try again.",
      });
    }
  };

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
      <section className="min-w-0">
        <Reveal as="nav" direction="none" className="mb-4 text-sm text-neutral-400">
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          {" / "}
          <span className="text-neutral-300">Contact Us</span>
        </Reveal>

        <Reveal as="h1" delay={100} className="mb-6 text-3xl font-bold text-white sm:text-4xl">
          Contact Us
        </Reveal>

        <div className="grid gap-8 md:grid-cols-[1.3fr_1fr]">
          {/* Left: map + details */}
          <div className="min-w-0">
            <Reveal direction="left" delay={150} className="relative border-4 border-white bg-white">
              <iframe
                src={MAP_URL}
                title="RW 95.1 FM location map"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                className="block aspect-square w-full border-0"
              />

              {/* Same look as Google's place card, sitting on top of it */}
              <div className="absolute left-2 top-2 w-[220px] max-w-[calc(100%-1rem)] rounded-sm bg-white p-3 sm:w-[250px] sm:p-4 font-[Arial,Helvetica,sans-serif] shadow-[0_2px_6px_rgba(0,0,0,0.3)]">
                <p className="text-[15px] font-medium leading-tight text-[#202124]">Jose Abad Santos Avenue</p>
                <p className="mt-1 text-[12.5px] leading-[1.45] text-[#70757a]">
                  Jose Abad Santos Ave, San Fernando, Pampanga
                </p>

                <div className="mt-3 flex items-center gap-2.5">
                  <a
                    href={OPEN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-10 items-center gap-2 rounded-full bg-[#1a73e8] px-3 text-[13px] sm:h-[34px] sm:px-4 font-medium text-white shadow-sm transition hover:bg-[#1765cc] hover:shadow-md"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    Open in Maps
                  </a>

                  <a
                    href={DIRECTIONS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Directions"
                    title="Directions"
                    className="flex h-10 w-10 items-center justify-center sm:h-[34px] sm:w-[34px] rounded-full bg-[#f1f3f4] text-[#1a73e8] transition hover:bg-[#e3e6e8]"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M21.71 11.29l-9-9a.996.996 0 0 0-1.41 0l-9 9a.996.996 0 0 0 0 1.41l9 9c.39.39 1.02.39 1.41 0l9-9a.996.996 0 0 0 0-1.41zM14 14.5V12h-4v3H8v-4c0-.55.45-1 1-1h5V7.5l3.5 3.5-3.5 3.5z" />
                    </svg>
                  </a>
                </div>
              </div>
            </Reveal>

            <ul className="mt-6 space-y-4 text-[15px] leading-relaxed text-white">
              {details.map((d, i) => (
                <Reveal
                  as="li"
                  key={d.label}
                  delay={i * 100}
                  className="break-words border-l-4 border-[#e60000] pl-3"
                >
                  <span className="block text-xs font-bold uppercase tracking-wide text-neutral-400">{d.label}</span>
                  {d.href ? (
                    <a href={d.href} className="inline-block py-1 transition hover:text-red-500">
                      {d.value}
                    </a>
                  ) : (
                    d.value
                  )}
                </Reveal>
              ))}
            </ul>
          </div>

          {/* Right: form */}
          <form onSubmit={onSubmit} noValidate className="min-w-0 space-y-5">
            <Reveal direction="right" delay={150}>
              <label htmlFor="c-name" className="mb-1.5 block font-bold text-white">
                Name
              </label>
              <input
                id="c-name"
                type="text"
                autoComplete="name"
                maxLength={100}
                value={form.name}
                onChange={set("name")}
                aria-invalid={!!errors.name}
                className={field}
              />
              {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
            </Reveal>

            <Reveal direction="right" delay={250}>
              <label htmlFor="c-email" className="mb-1.5 block font-bold text-white">
                E-mail
              </label>
              <input
                id="c-email"
                type="email"
                autoComplete="email"
                maxLength={150}
                value={form.email}
                onChange={set("email")}
                aria-invalid={!!errors.email}
                className={field}
              />
              {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
            </Reveal>

            <Reveal direction="right" delay={350}>
              <label htmlFor="c-message" className="mb-1.5 block font-bold text-white">
                Your message <span className="font-normal text-neutral-400">(optional)</span>
              </label>
              <textarea
                id="c-message"
                rows={8}
                maxLength={2000}
                value={form.message}
                onChange={set("message")}
                className={`${field} resize-y`}
              />
              <p className="mt-1 text-right text-xs text-neutral-500">{form.message.length} / 2000</p>
            </Reveal>

            {/* Spam trap: people never see this, bots fill it in */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor="c-website">Website</label>
              <input
                id="c-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={form.website}
                onChange={set("website")}
              />
            </div>

            <Reveal direction="up" delay={450} className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={status.type === "sending"}
                className="w-full bg-[#e60000] px-6 py-3 text-sm font-bold uppercase text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              >
                {status.type === "sending" ? "Sending…" : "Submit"}
              </button>
              {status.text && status.type !== "sending" && (
                <p role="status" className={`text-sm ${status.type === "ok" ? "text-green-400" : "text-red-400"}`}>
                  {status.text}
                </p>
              )}
            </Reveal>
          </form>
        </div>
      </section>

      <Sidebar />
    </div>
  );
}