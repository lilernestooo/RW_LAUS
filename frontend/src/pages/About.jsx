import { useEffect, useState } from "react";
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

function PersonGrid({ names }) {
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-6">
      {names.map((name) => (
        <div key={name}>
          {/* Placeholder - swap for <img src={...} /> when you have the photo */}
          <div className="flex aspect-square w-full items-center justify-center bg-neutral-900 text-xs text-neutral-500">
            Image placeholder
          </div>
          <h3 className="my-5 text-center text-xl font-bold uppercase text-white">
            {name}
          </h3>
        </div>
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
        <section>
          <h1 className="mb-6 text-3xl font-bold text-white">About Us</h1>

          {/* Golden Dove image placeholder */}
          <div className="flex aspect-[16/10] w-full items-center justify-center border-2 border-dashed border-amber-700/60 bg-neutral-900 text-neutral-500">
            Golden Dove image (Multi-Award Winning Best Provincial FM Station)
          </div>

          <div className="mt-6 space-y-4 text-justify text-[15px] leading-relaxed text-white">
            {intro.map((p) => (
              <p key={p.slice(0, 30)}>{p}</p>
            ))}

            <p className="pt-10">{joinUs}</p>

            <h4 className="font-bold uppercase">Our news and public affairs program</h4>
            <p>{newsProgram}</p>

            <h4 className="font-bold uppercase">Entertainment</h4>
            {entertainment.map((p) => (
              <p key={p.slice(0, 30)}>{p}</p>
            ))}
          </div>

          <hr className="mb-12 mt-14 border-t border-white/80" />

          <h2 className="mb-10 text-center text-3xl font-bold text-white">OUR DJs</h2>
          <PersonGrid names={djs} />

          <hr className="my-8 border-t border-white/80" />

          <h2 className="mb-10 text-center text-3xl font-bold uppercase text-white">
            News and Public Affairs Anchors
          </h2>
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