import { useEffect } from "react";
import { TITLE_CONFIG } from "../config/titles.js";

/**
 * Safely decodes HTML entities (e.g. &amp;, &#8211;, &#8220;, &quot;)
 */
function decodeEntities(str) {
  if (!str || typeof str !== "string") return "";
  if (!str.includes("&")) return str;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, "text/html");
    return doc.body.textContent || str;
  } catch {
    return str;
  }
}

/**
 * Formats a title with separator and site name according to TITLE_CONFIG.
 *
 * @param {string} [title] - The page or post title.
 * @param {object} [options]
 * @param {boolean} [options.exact=false] - If true, displays title without appending siteName.
 * @param {string} [options.siteName] - Custom site name override.
 * @param {string} [options.separator] - Custom separator override.
 * @returns {string} The formatted document title string.
 */
export function formatDocumentTitle(title, options = {}) {
  const {
    exact = false,
    siteName = TITLE_CONFIG.siteName,
    separator = TITLE_CONFIG.separator,
  } = options;

  if (!title || !title.trim()) {
    return TITLE_CONFIG.defaultTitle;
  }

  const cleanTitle = decodeEntities(title.trim());

  // If exact flag is true, or if title is the full default title, return as-is
  if (exact || cleanTitle === TITLE_CONFIG.defaultTitle) {
    return cleanTitle;
  }

  // Avoid duplicating siteName suffix if already present
  if (
    cleanTitle.endsWith(` ${separator} ${siteName}`) ||
    cleanTitle.endsWith(` ${siteName}`) ||
    cleanTitle.endsWith(` - ${siteName}`) ||
    cleanTitle.endsWith(` – ${siteName}`) ||
    cleanTitle.endsWith(` - RW95.1 FM`) ||
    cleanTitle.endsWith(` – RW95.1 FM`) ||
    cleanTitle.endsWith(` – RW95.1FM`)
  ) {
    return cleanTitle;
  }

  return `${cleanTitle} ${separator} ${siteName}`;
}

/**
 * React hook to set document.title dynamically.
 * Updates reactively whenever title or options change.
 *
 * @param {string|null|undefined} title - Page title to set.
 * @param {object} [options] - Options passed to formatDocumentTitle.
 * @param {boolean} [options.exact=false] - If true, set title directly without appending site suffix.
 * @param {string} [options.siteName] - Custom site name override.
 * @param {string} [options.separator] - Custom separator override.
 */
export default function useDocumentTitle(title, options = {}) {
  const { exact = false, siteName, separator } = options;

  useEffect(() => {
    if (title === undefined || title === null) return;
    const formatted = formatDocumentTitle(title, { exact, siteName, separator });
    if (formatted && document.title !== formatted) {
      document.title = formatted;
    }
  }, [title, exact, siteName, separator]);
}
