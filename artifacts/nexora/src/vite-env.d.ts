/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the Nexora API server (e.g. https://nexora-api.example.com).
   * The API server is deployed as a separate artifact with its own URL, so
   * requests need an explicit origin rather than assuming same-origin.
   * Leave unset to use relative "/api/..." paths (same-origin deployments).
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
