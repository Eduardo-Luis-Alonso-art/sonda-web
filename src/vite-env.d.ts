/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base da API da Sonda. Default de dev: http://localhost:8080 */
  readonly VITE_SONDA_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
