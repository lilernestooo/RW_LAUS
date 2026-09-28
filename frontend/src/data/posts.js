export const categories = ["Events", "News", "Uncategorized"];

const realPosts = [
  {
    slug: "31-years-of-rw-95-1-fm-what-comes-next",
    title: "31 Years of RW 95.1 FM: What Comes Next?",
    categories: ["Events", "News"],
    excerpt: "31 Years of RW 95.1 FM: What Comes Next? By Jasmine Leigh Anne “DJ Lorie” S. Tizon…",
    date: "2026-09-01",
    image: null,
  },
  {
    slug: "anibersaya-sa-barangay-part-vii-bringing-joy-to-the-barangays-rain-or-shine",
    title: "AniberSAYA sa Barangay Part VII: Bringing Joy to the Barangays, Rain or Shine",
    categories: ["Events", "News"],
    excerpt: "By Jasmine “DJ Lorie” S. Tizon There are celebrations that happen when everything is perfect–with…",
    date: "2026-09-01",
    image: null,
  },
  {
    slug: "30-years-of-rw-95-1-fm-for-the-love-of-music-public-service-and-you",
    title: "30 Years of RW 95.1 FM: For the Love of Music, Public Service and You",
    categories: ["Uncategorized"],
    excerpt: "By Sophia “DJ Ellie” P. Velasquez “Keni Na Ka!” We’ve said it for so…",
    date: "2025-08-15",
    image: null,
  },
  {
    slug: "29-years-with-rw-95-1-fm-anibersaya-sa-barangay-returns",
    title: "29 Years with RW 95.1 FM: AniberSAYA sa Barangay Returns!",
    categories: ["Events", "News"],
    excerpt: "By Sophia “DJ Ellie” P. Velasquez We are buzzing with excitement as your countryside radio, RW 95.1…",
    date: "2024-09-02",
    image: null,
  },
  {
    slug: "cheers-to-more-fruitful-years-with-rw-95-1-fm",
    title: "Cheers to More Fruitful Years with RW 95.1 FM!",
    categories: ["Events", "News"],
    excerpt: "By Sophia “DJ Ellie” P. Velasquez In life, we often find ourselves faced with challenges…",
    date: null,
    image: null,
  },
  {
    slug: "anibersaya-sa-barangay-v-the-fun-never-stops",
    title: "AniberSAYA sa Barangay V: The fun never stops!",
    categories: ["News"],
    excerpt: "By Sophia “DJ Ellie” P. Velasquez Despite the challenges that our community has faced in the…",
    date: null,
    image: null,
  },
  {
    slug: "rw951fm-anibersaya-brings-fun-to-whole-new-level",
    title: "RW95.1FM ‘AniberSAYA’ brings fun to whole new level",
    categories: ["Events"],
    excerpt: "By Hannah Pamela Escordial With the audience’s wide smiles and laughter visible throughout the program and…",
    date: null,
    image: null,
  },
  {
    slug: "rw-95-1-brings-back-anibersaya-to-shrug-off-pandemic-blues",
    title: "RW 95.1 Brings Back ‘AniberSAYA’ to Shrug-off Pandemic Blues",
    categories: ["Events"],
    excerpt: "By Sophia “DJ Ellie” P. Velasquez Being born in the midst of a great tragedy that is…",
    date: null,
    image: null,
  },
  {
    slug: "rw-95-1-fm-is-paragalas-best-local-radio-station",
    title: "RW 95.1 FM is Paragala’s best local radio station",
    categories: ["Events"],
    excerpt: "RW 95.1 FM was hailed as Best Local Radio Station in Central Luzon in the recently concluded…",
    date: null,
    image: null,
  },
  {
    slug: "jed-madela-madrigal-singers-in-one-musical-extravaganza-for-the-senses",
    title: "Jed Madela, Madrigal Singers in one musical extravaganza for the senses",
    categories: ["Events"],
    excerpt: "By Aubrey “DJ Alex” F. Sembrano I think our senses have their own way of recognizing what…",
    date: null,
    image: null,
  },
];

// Sample posts so pages 2 and 3 have 10 posts each. Replace with real posts later.
const samplePosts = Array.from({ length: 20 }, (_, i) => ({
  slug: `sample-post-${i + 11}`,
  title: `Sample Post ${i + 11}: Replace With Your Real Title`,
  categories: [categories[i % 3]],
  excerpt: "This is a sample excerpt. Replace it with the real post summary…",
  date: null,
  image: null,
}));

export const posts = [...realPosts, ...samplePosts];

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// Unique "Month Year" labels from dated posts, for the Archives dropdown
export const archives = [
  ...new Set(
    posts
      .filter((p) => p.date)
      .map((p) =>
        new Date(p.date).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
      )
  ),
];