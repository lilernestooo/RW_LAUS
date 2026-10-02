import { Link } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";

// When the form is ready, set this to the iframe URL (e.g. a Google Form embed link)
const CONTACT_FORM_URL = "";

export default function Contact() {
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_345px]">
      <section>
        <nav className="mb-4 text-sm text-neutral-400">
          <Link to="/" className="hover:text-white">
            Home
          </Link>
          {" / "}
          <span className="text-neutral-300">Contact Us</span>
        </nav>

        <h1 className="mb-6 text-3xl font-bold text-white sm:text-4xl">Contact Us</h1>

        {CONTACT_FORM_URL ? (
          <iframe
            src={CONTACT_FORM_URL}
            title="Contact RW 95.1 FM"
            loading="lazy"
            className="h-[800px] w-full border-0 bg-white"
          />
        ) : (
          <div className="flex min-h-[400px] items-center justify-center border border-white/10 bg-[#1a1a1a] p-8 text-center">
            <div>
              <p className="text-2xl font-bold text-white">Contact Us</p>
              <p className="mt-2 text-lg text-neutral-300">Will be added soon.</p>
              <span className="mt-4 inline-block h-1 w-16 bg-red-600" />
            </div>
          </div>
        )}
      </section>

      <Sidebar />
    </div>
  );
}