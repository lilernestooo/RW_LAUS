import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";

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

const djs = ["DJ Tyra", "DJ Alex", "DJ Ellie", "DJ Kian", "DJ Gio", "DJ Don Marco"];
const anchors = ["Perry Pangan", "Boy Santiago", "Albert Lacanlale"];

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

function PersonCard({ name, index }) {
  return (
    // Outer wrapper: entrance. Inner card: hover (kept separate so transforms don't fight)
    <Reveal from="zoom" delay={(index % 3) * 130}>
      <div className="group cursor-pointer">
        <div className="relative overflow-hidden transition-all duration-500 group-hover:-translate-y-2">
          {/* Placeholder - swap for <img src={...} className="..."/> when you have the photo */}
          <div className="flex aspect-square w-full items-center justify-center bg-neutral-900 text-xs text-neutral-500 transition-transform duration-700 group-hover:scale-110">
            Image placeholder
          </div>

          {/* Shine sweep */}
          <div className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-[900ms] ease-out group-hover:left-[130%] group-hover:opacity-100" />

          {/* Red bar along the bottom edge */}
          <span className="absolute bottom-0 left-0 h-1 w-0 bg-[#e60000] transition-all duration-500 ease-out group-hover:w-full" />
        </div>

        <h3 className="my-5 text-center text-xl font-bold uppercase text-white transition-all duration-300 group-hover:tracking-wider group-hover:text-red-500">
          {name}
        </h3>
      </div>
    </Reveal>
  );
}

function PersonGrid({ names }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3">
      {names.map((name, i) => (
        <PersonCard key={name} name={name} index={i} />
      ))}
    </div>
  );
}

export default function About() {
  const [showTop, setShowTop] = useState(false);

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

          {/* Golden Dove image placeholder */}
          <Reveal from="zoom" delay={100}>
            <div className="group relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden border-2 border-dashed border-amber-700/60 bg-neutral-900 text-neutral-500">
              <span className="transition-transform duration-700 group-hover:scale-105">
                Golden Dove image (Multi-Award Winning Best Provincial FM Station)
              </span>
            </div>
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

            <Reveal as="h4" from="left" className="border-l-4 border-[#e60000] pl-3 font-bold uppercase">
              Entertainment
            </Reveal>
            {entertainment.map((p) => (
              <Reveal key={p.slice(0, 30)} as="p">
                {p}
              </Reveal>
            ))}
          </div>

          <GrowRule className="mb-12 mt-14" />

          <SectionHeading>OUR DJs</SectionHeading>
          <PersonGrid names={djs} />

          <GrowRule className="my-8" />

          <SectionHeading className="uppercase">News and Public Affairs Anchors</SectionHeading>
          <PersonGrid names={anchors} />
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