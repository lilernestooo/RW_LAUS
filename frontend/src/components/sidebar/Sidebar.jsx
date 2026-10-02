import { Link } from "react-router-dom";
import { posts, categories, archives } from "../../data/posts";
import useStickySidebar from "../../hooks/useStickySidebar";
import SectionTitle from "../ui/SectionTitle";
import OnAirBanner from "./OnAirBanner";
import ArchivesDropdown from "./ArchivesDropdown";

const listItem = "border-b border-white/10 py-3 first:pt-0 last:border-0";

export default function Sidebar({ showBanner = true }) {
  const ref = useStickySidebar();

  return (
    <aside ref={ref} className="relative z-10 lg:sticky">
      {showBanner && <OnAirBanner />}

      <SectionTitle className={showBanner ? "mt-8" : ""}>Recent Comments</SectionTitle>
      <ul className="text-sm text-neutral-300">{/* empty for now */}</ul>

      <SectionTitle className="mt-8">Recent Posts</SectionTitle>
      <ul>
        {posts.slice(0, 5).map((p) => (
          <li key={p.slug} className={listItem}>
            <Link to={`/${p.slug}`} className="block text-justify font-bold text-white hover:text-red-500">
              {p.title}
            </Link>
          </li>
        ))}
      </ul>

      <SectionTitle className="mt-8">Categories</SectionTitle>
      <ul>
        {categories.map((c) => (
          <li key={c} className={listItem}>
            <Link to={`/category/${c.toLowerCase()}`} className="block font-bold text-white hover:text-red-500">
              {c}
            </Link>
          </li>
        ))}
      </ul>

      <SectionTitle className="mt-8">Archives</SectionTitle>
      <ArchivesDropdown />
    </aside>
  );
}