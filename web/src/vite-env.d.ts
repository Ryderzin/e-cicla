/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Address of the API. Defaults to http://localhost:8080. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
