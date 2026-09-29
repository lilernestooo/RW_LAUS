import { Link } from "react-router-dom";
import { posts, formatDate } from "../../data/posts";
import SectionTitle from "../ui/SectionTitle";
import PostImage from "../post/PostImage";

const socials = [
  {
    label: "Facebook",
    href: "https://facebook.com",
    icon: <path d="M13.5 22v-8.5h2.9l.5-3.5h-3.4V7.9c0-1 .3-1.7 1.7-1.7H17V3.1C16.7 3.1 15.7 3 14.6 3 12.2 3 10.5 4.5 10.5 7.2V10h-3v3.5h3V22h3z" fill="currentColor" />,
  },
  {
    label: "Instagram",
    href: "https://instagram.com",
    icon: (
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" />
      </g>
    ),
  },
  {
    label: "TikTok",
    href: "https://tiktok.com",
    icon: <path d="M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.2v12.6a2.6 2.6 0 1 1-2.6-2.6c.3 0 .5 0 .8.1V9.9a5.9 5.9 0 1 0 5 5.8V9.5a7.4 7.4 0 0 0 4.3 1.4V7.7a4.3 4.3 0 0 1-3.3-1.9z" fill="currentColor" />,
  },
  {
    label: "YouTube",
    href: "https://youtube.com",
    icon: <path fillRule="evenodd" fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2C2 8.8 2 12 2 12s0 3.2.4 4.8a2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8c.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5.2 3L10 15z" />,
  },
];

const li = "border-b border-white/15 py-2 last:border-0";

export default function Footer() {
  const missed = posts.filter((p) => p.date).slice(0, 4);

  return (
    <footer className="mx-auto max-w-[1244px]">
      <div className="bg-[#1c1c1c] p-6">
        {/* You may have missed */}
        <SectionTitle>You may have missed</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {missed.map((p) => (
            <article key={p.slug}>
              <PostImage post={p} ratio="aspect-[8/5]" />
              <h4 className="mt-3 text-justify font-bold leading-snug text-white">
                <Link to={`/${p.slug}`} className="hover:text-red-500">
                  {p.title}
                </Link>
              </h4>
              <p className="mt-1 flex items-center gap-1 text-xs text-neutral-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="9" />
                  <polyline points="12,7 12,12 16,14" />
                </svg>
                {formatDate(p.date)}
              </p>
            </article>
          ))}
        </div>

        {/* Contact info */}
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <ul className="list-disc pl-5 text-sm uppercase text-white marker:text-white">
            <li className={li}>For requests and greetings: text +63 919 264 4439</li>
            <li className={li}>
              For radio ad placement and marketing collaborations:
              <br />
              text or call +63 919 065 0061
            </li>
            <li className={li}>Call us: Tel No: (045) 963 9595</li>
          </ul>

          <div>
            <ul className="list-disc pl-5 text-sm text-white marker:text-white">
              <li className={`${li} text-justify uppercase`}>
                Address: 3rd Flr., CGIC Bldg., Jose Abad Santos Avenue, City of San Fernando, Pampanga
              </li>
              <li className={li}>E-MAIL: rw951fm@yahoo.com</li>
            </ul>

            <SectionTitle className="mt-6">Follow us</SectionTitle>
            <div className="flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={s.label}
                  className="flex h-9 w-9 items-center justify-center bg-neutral-500 text-[#1c1c1c] hover:bg-red-600 hover:text-white"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    {s.icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <p className="px-4 py-5 text-[15px] text-white">
        Copyright © {new Date().getFullYear()} Rw951.fm All Rights Reserved.
      </p>
    </footer>
  );
}