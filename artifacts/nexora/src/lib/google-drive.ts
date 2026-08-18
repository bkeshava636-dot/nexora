// Validates that a string is a legitimate Google Drive / Docs / Sheets /
// Slides share link. Uses the URL API (not a substring or naive regex check)
// so lookalike/spoofed hosts (e.g. "drive.google.com.evil.com" or
// "evil.com/?x=drive.google.com") are correctly rejected — the hostname
// comparison below is an exact match, not a "contains" or "startsWith".
//
// This is a client-side convenience check only, for immediate form feedback.
// It intentionally mirrors the authoritative check in the API server
// (artifacts/api-server/src/lib/google-drive.ts) — keep the two in sync.
// The backend is the source of truth; this never replaces it.

const ALLOWED_HOSTS = new Set(["drive.google.com", "docs.google.com"]);
const DOCS_PATH_PREFIXES = ["/document/", "/spreadsheets/", "/presentation/"];

export function isValidGoogleDriveUrl(value: string): boolean {
  if (!value || typeof value !== "string") return false;

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false; // empty, malformed, or not a URL at all
  }

  // Rejects javascript:, data:, http:, file:, etc. Google Drive links are
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

export const googleDriveUrlHint =
  "Paste a Google Drive, Docs, Sheets, or Slides share link (e.g. https://drive.google.com/file/d/... or https://docs.google.com/document/...).";
