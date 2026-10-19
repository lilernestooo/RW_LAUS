/**
 * Document Title Configuration
 * =============================================================================
 * Customize how browser tab titles are displayed across the entire website.
 *
 * You can edit the values below to customize:
 * - siteName: Suffix attached to page titles (e.g., "About Us – RW95.1FM")
 * - separator: Symbol placed between page title and site name (e.g., "–", "-", "|")
 * - defaultTitle: Full document title used on the Home / Landing page
 * - pages: Default titles for each main page (About, News, Contact, etc.)
 * =============================================================================
 */

export const TITLE_CONFIG = {
  // Suffix appended to each page title (e.g. "Page Name - RW95.1 FM")
  siteName: "RW95.1 FM",

  // Separator symbol between the page title and siteName
  separator: "-",

  // Full default document title (used as fallback)
  defaultTitle: "RW 95.1 FM – Keni na Ka'",

  // Document titles for individual static pages
  pages: {
    landing: "RW 95.1 FM – Keni na Ka'",
    home: "Homepage",
    about: "About Us",
    programs: "Programs",
    news: "Events",
    gallery: "Gallery",
    contact: "Contact Us",
    stream: "RW95.1 Stream Player",
    search: "Search",
  },

  // Titles for Admin panel pages
  admin: {
    base: "RW 95.1 Admin",
    posts: "Posts",
    dates: "Post Dates",
    home: "Homepage Settings",
    about: "About Page Settings",
    programs: "Programs Settings",
    gallery: "Gallery Settings",
  },
};
