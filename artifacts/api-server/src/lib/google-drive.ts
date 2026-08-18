// Authoritative validation of Google Drive / Docs / Sheets / Slides share
// links. This is the source of truth — every route that accepts a
// googleDriveUrl (resources, submissions) must call this before writing to
// the database, regardless of what the client already checked.
//
// Uses the URL API for real parsing rather than a substring or naive regex
// match, so lookalike/spoofed hosts are rejected via an exact hostname
// comparison (not "contains" or "startsWith" on the raw string).
//
// Mirrors the convenience check in artifacts/nexora/src/lib/google-drive.ts
// — keep the two in sync.

const ALLOWED_HOSTS = new Set(["drive.google.com", "docs.google.com"]);
const DOCS_PATH_PREFIXES = ["/document/", "/spreadsheets/", "/presentation/"];

export function isValidGoogleDriveUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false; // empty, malformed, or not a URL at all
  }

  // Rejects javascript:, data:, http:, file:, etc. — Google Drive links are
  // always https.
  if (url.protocol !== "https:") return false;

  if (!ALLOWED_HOSTS.has(url.hostname)) return false;

  if (url.hostname === "docs.google.com") {
    return DOCS_PATH_PREFIXES.some((prefix) => url.pathname.startsWith(prefix));
  }

  // drive.google.com: file/folder links vary (/file/d/…, /drive/folders/…,
  // /open?id=…) — any path under the exact host is a legitimate Drive link.
  return true;
}

export const GOOGLE_DRIVE_URL_ERROR =
  "googleDriveUrl must be a valid https://drive.google.com or https://docs.google.com (document, spreadsheets, or presentation) link.";
