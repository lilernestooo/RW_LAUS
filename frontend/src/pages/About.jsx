import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";
import { fetchAbout } from "../api/api";

const intro = [
  "Since 1995, RW 95.1 FM, a flagship station of Radioworld Broadcasting Corporation under the LausGroup of Companies, is broadcasting from Dau, Mabalacat, Pampanga. Our legacy of three decades is built on delivering cutting-edge news and timeless music, seamlessly blending the classic hits of the 60s, 70s, and 80s with today’s chart-toppers.",
  "RW 95.1 FM is a multi-award-winning station, proudly recognized as the 2019 Best Provincial FM Station at the 27th Golden Dove Awards by the Kapisanan ng mga Brodkaster ng Pilipinas (KBP). This prestigious accolade marks our third victory, having also won in 2011 and 2016. In 2007, we achieved national acclaim, being named the Best FM Station in the Philippines, surpassing even the most prominent national stations.",
  "Our commitment goes beyond music. At RW 95.1 FM, our news and public affairs programs are designed to empower our community, providing essential discussions on rights, benefits, and vital information that impact everyday lives. We are more than a radio station; we are a catalyst for change and a voice for the people.",
  "Our radio jocks don’t just play music; they create connections. With a deep understanding of our audience’s varied musical tastes, we offer a dynamic mix of programs that cater to every preference. From timeless classics to the latest hits, we ensure that our content resonates with all listeners.",
  "RW 95.1 FM is at the forefront of adapting to modern technology and listener habits. We are proud to extend our reach through Facebook Live, ensuring our community can stay connected and engaged with us in real-time, no matter where they are.",
  "RW 95.1 FM is relentless in its pursuit of excellence. Our vision is to be the most listened-to FM radio station in the region, and we strive to achieve this by continuously innovating and elevating our programming. Our listeners are at the core of everything we do, and their loyalty drives us to be better every day.",
];

const joinUs =
  "Join us on RW 95.1 FM, where every broadcast is a promise of quality, engagement, and entertainment. We are the pulse of Pampanga, dedicated to serving community and enriching lives with every broadcast.";

const newsProgram =
  "Our news and public affairs programs aim to develop the lives of every Filipino people in the region through practical discussions that tackles the rights, benefits and information they need in programs such as Usapang Pinoy, Fernandino First, Agri Pinoy, For Your Eyes Only, Ang Mamimiling Pinoy and Talakayan Ngayon which is hosted by seasoned broadcaster Mr. Perry Pangan.";

const entertainment = [
  "Here in RW 95.1 FM, we don’t just dish out all the great songs from all genres, our Radio Jocks interact and establish emotional bond with our listeners through programs such as Music Babad, Request Up Next (R.U.N) Love Corner and Afternoon Ratsada. We aim to touch and influence lives everyday.",
  "With our listeners’ different preferences in music, we continuously produce programs that will cater to their specific taste in Music such as Reggae Fever, JazzyRythmic Sunday, Acoustic on Sabado Nights, The Best of Folk Rock and Country music, RW Hot Spots, OPM and many more!",
  "RW 95.1 FM continuously strives to be the most listed to FM radio station in the entire region.",
];

// Offline fallback, used only if the API can't be reached
const djs = ["DJ Tyra", "DJ Alex", "DJ Ellie", "DJ Kian", "DJ Gio", "DJ Don Marco"].map((name) => ({ name }));
const anchors = ["Perry Pangan", "Boy Santiago", "Albert Lacanlale"].map((name) => ({ name }));

// about.php now returns full photo URLs (built by image_url() in config.php)
const photoSrc = (url) => url || null;

// Loads DJs, anchors, programs, milestones and the banner from db_rw (about_tbl).
// Re-checks every 30 seconds and when you come back to the tab, and only
// updates the page when something actually changed.
function useAbout(intervalMs = 30000) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let alive = true;
    let last = "";

    const load = () =>
      fetchAbout()
        .then((j) => {
          if (!alive || !j.data) return;
          const sig = JSON.stringify(j.data);
          if (sig !== last) {
            last = sig;
            setData(j.data);
          }
        })
        .catch(() => {}); // keep what is already on screen

    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);

    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, [intervalMs]);

  return data;
}

// Returns [ref, shown]: shown flips to true once the element scrolls into view
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, shown];
}

const hidden = {
  up: "translate-y-8 opacity-0",
  left: "-translate-x-10 opacity-0",
  right: "translate-x-10 opacity-0",
  zoom: "scale-90 opacity-0",
};

// Fade/slide in when scrolled into view
function Reveal({ as: Tag = "div", from = "up", delay = 0, className = "", children }) {
  const [ref, shown] = useReveal();
  return (
    <Tag
      ref={ref}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        shown ? "translate-x-0 translate-y-0 scale-100 opacity-100" : hidden[from]
      } ${className}`}
      style={{ transitionDelay: shown ? `${delay}ms` : "0ms" }}
    >
      {children}
    </Tag>
  );
}

// Section heading with a red underline that draws in
function SectionHeading({ children, className = "" }) {
  const [ref, shown] = useReveal();
  return (
    <div ref={ref} className="mb-10 text-center">
      <h2
        className={`inline-block text-3xl font-bold text-white transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        } ${className}`}
      >
        {children}
      </h2>
      <span
        className={`mx-auto mt-3 block h-1 bg-[#e60000] transition-all delay-300 duration-700 ease-out ${
          shown ? "w-20" : "w-0"
        }`}
      />
    </div>
  );
}

// Horizontal rule that grows from the left
function GrowRule({ className = "" }) {
  const [ref, shown] = useReveal(0.5);
  return (
    <hr
      ref={ref}
      className={`origin-left border-t border-white/80 transition-transform duration-1000 ease-out ${
        shown ? "scale-x-100" : "scale-x-0"
      } ${className}`}
    />
  );
}

function PersonCard({ person, index }) {
  const initials = person.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  const src = photoSrc(person.photo_url);

  return (
    // Outer wrapper: entrance. Inner card: hover (kept separate so transforms don't fight)
    <Reveal from="zoom" delay={(index % 3) * 130}>
      <div className="group cursor-pointer">
        <div className="relative overflow-hidden transition-all duration-500 group-hover:-translate-y-2">
          {src ? (
            <img
              src={src}
              alt={person.name}
              loading="lazy"
              className="aspect-square w-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center bg-neutral-900 text-5xl font-bold text-neutral-600 transition-transform duration-700 group-hover:scale-110">
              {initials}
            </div>
          )}

          {/* Shine sweep */}
          <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-[900ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

          {/* Red bar along the bottom edge */}
          <span className="absolute bottom-0 left-0 h-1 w-0 bg-[#e60000] transition-all duration-500 ease-out group-hover:w-full" />

          {/* Show / schedule slides up on hover */}
          {(person.show_name || person.schedule) && (
            <div className="absolute inset-x-0 bottom-0 translate-y-full bg-black/80 p-3 text-center text-sm text-white transition-transform duration-500 group-hover:translate-y-0">
              {person.show_name && <p className="font-semibold">{person.show_name}</p>}
              {person.schedule && <p className="text-neutral-300">{person.schedule}</p>}
            </div>
          )}
        </div>

        <h3 className="mt-5 text-center text-xl font-bold uppercase text-white transition-all duration-300 group-hover:tracking-wider group-hover:text-red-500">
          {person.name}
        </h3>
        {person.role ? (
          <p className="mb-5 text-center text-sm text-neutral-400">{person.role}</p>
        ) : (
          <div className="mb-5" />
        )}
      </div>
    </Reveal>
  );
}

function PersonGrid({ people }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
      {people.map((p, i) => (
        <PersonCard key={p.id ?? p.name} person={p} index={i} />
      ))}
    </div>
  );
}

// Vertical awards / milestones timeline
function Timeline({ items }) {
  return (
    <ol className="relative ml-3 border-l-2 border-[#e60000]/70">
      {items.map((m, i) => (
        <Reveal as="li" from="left" delay={i * 80} key={m.id} className="mb-8 ml-6">
          <span className="absolute -left-[9px] mt-1.5 h-4 w-4 rounded-full border-2 border-[#e60000] bg-black" />
          <p className="text-2xl font-bold text-[#e60000]">{m.year}</p>
          <h3 className="font-bold text-white">{m.title}</h3>
          {m.description && <p className="text-sm text-neutral-300">{m.description}</p>}
        </Reveal>
      ))}
    </ol>
  );
}

function ProgramChips({ items }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((p) => (
        <span
          key={p.id}
          className="border border-white/30 px-3 py-1 text-sm text-white transition-colors duration-300 hover:border-[#e60000] hover:bg-[#e60000]"
        >
          {p.name}
        </span>
      ))}
    </div>
  );
}

export default function About() {
  const [showTop, setShowTop] = useState(false);

  const about = useAbout();
  const djList = about ? about.people.filter((p) => p.kind === "dj") : djs;
  const anchorList = about ? about.people.filter((p) => p.kind === "anchor") : anchors;
  const newsPrograms = about ? about.programs.filter((p) => p.category === "news") : [];
  const musicPrograms = about ? about.programs.filter((p) => p.category === "entertainment") : [];
  const milestones = about ? about.milestones : [];
  const banner = about?.banner;

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-neutral-300">
        <Link to="/homepage" className="hover:text-white">Home</Link>
        <span className="mx-2">/</span>
        <span>About Us</span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
        {/* Main content */}
        <section className="overflow-x-clip">
          <Reveal from="left">
            <h1 className="mb-6 text-3xl font-bold text-white">About Us</h1>
          </Reveal>

          {/* Golden Dove banner (from the admin, falls back to a placeholder) */}
          <Reveal from="zoom" delay={100}>
            {banner ? (
              <img
                src={photoSrc(banner.photo_url)}
                alt={banner.caption || "RW 95.1 FM"}
                className="aspect-[16/10] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[16/10] w-full items-center justify-center border-2 border-dashed border-amber-700/60 bg-neutral-900 text-neutral-500">
                Golden Dove image
              </div>
            )}
          </Reveal>

          <div className="mt-6 space-y-4 text-justify text-[15px] leading-relaxed text-white">
            {intro.map((p, i) => (
              <Reveal key={p.slice(0, 30)} as="p" delay={Math.min(i, 2) * 80}>
                {p}
              </Reveal>
            ))}

            <Reveal as="p" className="pt-10">
              {joinUs}
            </Reveal>

            <Reveal as="h4" from="left" className="border-l-4 border-[#e60000] pl-3 font-bold uppercase">
              Our news and public affairs program
            </Reveal>
            <Reveal as="p">{newsProgram}</Reveal>
            {newsPrograms.length > 0 && (
              <Reveal>
                <ProgramChips items={newsPrograms} />
              </Reveal>
            )}

            <Reveal as="h4" from="left" className="border-l-4 border-[#e60000] pl-3 font-bold uppercase">
              Entertainment
            </Reveal>
            {entertainment.map((p) => (
              <Reveal key={p.slice(0, 30)} as="p">
                {p}
              </Reveal>
            ))}
            {musicPrograms.length > 0 && (
              <Reveal>
                <ProgramChips items={musicPrograms} />
              </Reveal>
            )}
          </div>

          <GrowRule className="mb-12 mt-14" />

          <SectionHeading>OUR DJs</SectionHeading>
          <PersonGrid people={djList} />

          <GrowRule className="my-8" />

          <SectionHeading className="uppercase">News and Public Affairs Anchors</SectionHeading>
          <PersonGrid people={anchorList} />
        </section>

        {/* Sticky sidebar */}
        <Sidebar />

        {/* Back-to-top button */}
        {showTop && (
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Back to top"
            className="fixed bottom-6 right-6 flex h-12 w-12 items-center justify-center bg-red-600 text-white hover:bg-red-700"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="6,15 12,9 18,15" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}