import {
  ApiError,
  MALFORMED_RESPONSE_MESSAGE,
  NETWORK_ERROR_MESSAGE,
  messageForStatus,
} from './errors'
import type {
  ChatRequest,
  ChatResponse,
  ChatResult,
  Conversation,
  FileContent,
  IndexedFileSummary,
  ProblemJson,
  Project,
} from './types'

/**
 * Header em que a API diz se conseguiu gravar a troca. Ela o expoe por
 * `Access-Control-Expose-Headers`; sem isso o navegador nao o entregaria ao JavaScript.
 */
const CONVERSATION_SAVED_HEADER = 'Sonda-Conversation-Saved'

/**
 * Base da API: porta 8080.
 *
 * Era 8081 ate o prompt 8, contorno para um conflito local na 8080 que nao existe mais. O
 * `application.yml` do sonda-api sempre teve `${SONDA_SERVER_PORT:8080}` — 8080 e o default dele.
 * Apontar para o default faz os dois lados conversarem sem variavel de ambiente nenhuma; fixar a
 * API de volta na 8081 significaria gravar um contorno de uma maquina no default de todos.
 *
 * Quem precisar de outra porta usa VITE_SONDA_API_BASE_URL.
 */
const BASE_URL = (import.meta.env.VITE_SONDA_API_BASE_URL ?? 'http://localhost:8080').replace(
  /\/+$/,
  '',
)

function isProblemJson(value: unknown): value is ProblemJson {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.status === 'number' && typeof candidate.title === 'string'
}

/** Le o corpo de erro e monta um ApiError com mensagem pt-BR. Nunca lanca por falha de parse. */
async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemJson | null = null
  try {
    const body: unknown = await response.json()
    if (isProblemJson(body)) problem = body
  } catch {
    // Corpo vazio ou nao-JSON: cai no mapeamento so pelo status.
  }
  return new ApiError(messageForStatus(problem?.status ?? response.status), {
    status: problem?.status ?? response.status,
    problem,
    technicalDetail: problem?.detail ?? null,
  })
}

/** Faz a chamada e devolve a `Response` crua, ja com os erros traduzidos. */
async function send(path: string, init?: RequestInit): Promise<Response> {
  // Headers via `new Headers`, nao por spread de objeto: `HeadersInit` tambem pode ser array de
  // pares ou um Headers, e espalhar isso num objeto literal produziria chaves numericas.
  const headers = new Headers(init?.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  } catch (cause) {
    // fetch so rejeita por rede/CORS/abort — nunca por status HTTP.
    throw new ApiError(NETWORK_ERROR_MESSAGE, { cause })
  }

  if (!response.ok) throw await toApiError(response)
  return response
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await send(path, init)
  try {
    return (await response.json()) as T
  } catch (cause) {
    throw new ApiError(MALFORMED_RESPONSE_MESSAGE, { status: response.status, cause })
  }
}

/**
 * Para respostas sem corpo. O `DELETE /conversation` responde `204` com zero bytes — passar isso
 * por `response.json()` lancaria, e o erro viraria "formato inesperado" para o usuario.
 */
async function requestNoContent(path: string, init?: RequestInit): Promise<void> {
  await send(path, init)
}

/** `GET /api/projects` — o repositorio configurado se registra sozinho no boot da API. */
export function listProjects(): Promise<Project[]> {
  return request<Project[]>('/api/projects')
}

/**
 * `POST /api/projects/{id}/chat`. Sincrono e lento: medido 2,5 s (NO_EVIDENCE, sem chamar o
 * modelo de resposta) a 15,7 s (ANSWERED) contra o spring-petclinic.
 */
export async function askQuestion(
  projectId: number,
  question: string,
  signal?: AbortSignal,
): Promise<ChatResult> {
  const body: ChatRequest = { question }
  const response = await send(`/api/projects/${String(projectId)}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    ...(signal ? { signal } : {}),
  })

  // Ausente = false. A API so manda `true` quando gravou mesmo; na duvida avisamos, porque
  // prometer persistencia que nao houve e pior do que um aviso a mais.
  const saved = response.headers.get(CONVERSATION_SAVED_HEADER) === 'true'

  try {
    return { response: (await response.json()) as ChatResponse, saved }
  } catch (cause) {
    throw new ApiError(MALFORMED_RESPONSE_MESSAGE, { status: response.status, cause })
  }
}

/** `GET /api/projects/{id}/conversation` — historico completo, mais antigo primeiro. */
export function getConversation(projectId: number): Promise<Conversation> {
  return request<Conversation>(`/api/projects/${String(projectId)}/conversation`)
}

/** `DELETE /api/projects/{id}/conversation` — apaga so a conversa deste projeto. `204`. */
export function deleteConversation(projectId: number): Promise<void> {
  return requestNoContent(`/api/projects/${String(projectId)}/conversation`, { method: 'DELETE' })
}

/** `GET /api/projects/{id}/files` — lista plana, ja ordenada por code point pela API. */
export function listFiles(projectId: number): Promise<IndexedFileSummary[]> {
  return request<IndexedFileSummary[]>(`/api/projects/${String(projectId)}/files`)
}

/**
 * `GET /api/projects/{id}/files/{fileId}/content` — le o disco a cada chamada.
 *
 * Pode responder 410 (arquivo sumiu desde a indexacao) e 422 (binario, nao-UTF-8 ou acima de 2MB),
 * alem dos 404/500 usuais. O mapeamento para pt-BR esta em `errors.ts`.
 */
export function readFileContent(projectId: number, fileId: number): Promise<FileContent> {
  return request<FileContent>(`/api/projects/${String(projectId)}/files/${String(fileId)}/content`)
}
