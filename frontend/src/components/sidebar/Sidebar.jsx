import { Link } from "react-router-dom";
import { fetchPosts, fetchCategories } from "../../api/api";
import useApi from "../../hooks/useApi";
import useStickySidebar from "../../hooks/useStickySidebar";
import SectionTitle from "../ui/SectionTitle";
import OnAirBanner from "./OnAirBanner";
import ArchivesDropdown from "./ArchivesDropdown";

const listItem = "border-b border-white/10 py-3 first:pt-0 last:border-0";

export default function Sidebar({ showBanner = true }) {
  const ref = useStickySidebar();

  const recent = useApi(() => fetchPosts({ page: 1, per_page: 5 }), []);
  const cats = useApi(() => fetchCategories(), []);
  const posts = recent.data?.data ?? [];
  const categories = cats.data?.data ?? [];

  return (
    <aside ref={ref} className="relative z-10 lg:sticky">
      {showBanner && <OnAirBanner />}

      <SectionTitle className={showBanner ? "mt-8" : ""}>Recent Comments</SectionTitle>
      <ul className="text-sm text-neutral-300">{/* empty for now */}</ul>

      <SectionTitle className="mt-8">Recent Posts</SectionTitle>
      <ul>
        {posts.map((p) => (
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
          <li key={c.slug} className={listItem}>
            <Link to={`/category/${c.slug}`} className="block font-bold text-white hover:text-red-500">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>

      <SectionTitle className="mt-8">Archives</SectionTitle>
      <ArchivesDropdown />
    </aside>
  );
}