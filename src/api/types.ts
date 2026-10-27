/*
 * Tipos conferidos contra a resposta REAL do sonda-api rodando na 8080 (nao contra documentacao).
 * Chamadas de referencia:
 *   GET  /api/projects
 *   POST /api/projects/1/chat  {"question":"Quais validacoes sao feitas no telefone do dono?"}  -> ANSWERED
 *   POST /api/projects/1/chat  {"question":"Qual e a receita de bolo ...?"}                     -> NO_EVIDENCE
 */

/** Item de `GET /api/projects`. `primaryLanguage` pode vir null para repo sem linguagem dominante. */
export interface Project {
  id: number
  name: string
  localPath: string
  primaryLanguage: string | null
}

/** `NO_EVIDENCE` e 200: "nao encontrei" e resposta valida do produto, nao erro. */
export type ChatStatus = 'ANSWERED' | 'NO_EVIDENCE'

/**
 * - `BELOW_SIMILARITY_THRESHOLD`: nada passou do limiar e o modelo de resposta NAO foi chamado.
 * - `MODEL_FOUND_NO_EVIDENCE`: havia contexto parecido, mas nao respondia a pergunta.
 */
export type NoEvidenceReason = 'BELOW_SIMILARITY_THRESHOLD' | 'MODEL_FOUND_NO_EVIDENCE'

/** Uma citacao: arquivo e faixa de linhas, validados pela API contra o contexto enviado. */
export interface Citation {
  sourceId: string
  path: string
  startLine: number
  endLine: number
}

/** Uma afirmacao da resposta com as proprias citacoes. Em NO_EVIDENCE vem com `citations: []`. */
export interface Statement {
  text: string
  citations: Citation[]
}

/** Um bloco de contexto enviado ao modelo, com a similaridade de cosseno medida. */
export interface Source {
  sourceId: string
  path: string
  startLine: number
  endLine: number
  similarity: number
}

/** A pergunta como o usuario escreveu, ou a reescrita em ingles pelo modelo. */
export type QueryKind = 'ORIGINAL' | 'REWRITTEN'

/** Uma das consultas embeddadas, com a melhor similaridade que ELA encontrou. */
export interface SearchQuery {
  kind: QueryKind
  text: string
  /** Similaridade do melhor chunk que esta consulta achou; 0 quando nao achou nenhum. */
  topSimilarity: number
}

export interface ChatUsage {
  chatModel: string
  embeddingTokens: number
  chatPromptTokens: number
  chatCachedPromptTokens: number
  chatCompletionTokens: number
  estimatedCostUsd: number
}

export interface ChatResponse {
  repositoryId: number
  question: string
  status: ChatStatus
  noEvidenceReason: NoEvidenceReason | null
  /** Texto pronto para exibir: cada afirmacao seguida do marcador `[Sn: caminho:linhas]`. */
  answer: string
  statements: Statement[]
  /** Uniao das citacoes de todas as afirmacoes (pode repetir o mesmo sourceId). */
  citations: Citation[]
  uncitedStatements: number
  sources: Source[]
  /** A pergunta reescrita que foi efetivamente embeddada. */
  /**
   * As consultas efetivamente embeddadas. A `ORIGINAL` vem sempre e e a primeira; a `REWRITTEN`
   * so aparece quando difere dela.
   *
   * Substituiu o campo `searchQuery` (texto unico) no prompt 8 — o record `ChatResponse` do
   * sonda-api nao tem mais o campo antigo, entao nao ha o que manter por compatibilidade.
   */
  searchQueries: SearchQuery[]
  usage: ChatUsage
  durationMs: number
}

export interface ChatRequest {
  question: string
}

/** Corpo de erro da API, `application/problem+json` (RFC 9457). */
export interface ProblemJson {
  type: string
  title: string
  status: number
  detail: string
  instance: string
}

/*
 * Explorer de arquivos. Conferido contra a resposta REAL do sonda-api na 8080:
 *   GET /api/projects/1/files                -> 116 itens
 *   GET /api/projects/1/files/30/content     -> Owner.java, 188 linhas
 */

/** Item de `GET /api/projects/{id}/files`. Lista plana; a arvore e montada no cliente. */
export interface IndexedFileSummary {
  id: number
  /** Caminho relativo a raiz, sempre com '/'. Nunca caminho absoluto do servidor. */
  path: string
  /** Medido: vem null de verdade (ex.: .editorconfig, .devcontainer/Dockerfile). */
  language: string | null
  chunkCount: number
  indexedAt: string
}

/** Resposta de `GET /api/projects/{id}/files/{fileId}/content`. */
export interface FileContent {
  fileId: number
  projectId: number
  path: string
  language: string | null
  /** Conteudo lido do disco AGORA — pode nao ser o que foi indexado e citado. */
  content: string
  lineCount: number
  sizeBytes: number
  /** true quando o hash do disco difere do gravado na indexacao. */
  contentMayBeStale: boolean
  indexedContentHash: string
  currentContentHash: string
  indexedAt: string
}

/*
 * Conversa persistida (prompt 11). Conferido contra a resposta REAL na 8080:
 *   GET    /api/projects/1/conversation -> {repositoryId, exchanges[]}, mais antiga primeiro
 *   DELETE /api/projects/1/conversation -> 204 sem corpo
 *   POST   /api/projects/1/chat         -> header Sonda-Conversation-Saved: true|false
 */

/**
 * Versao do formato de `response` dentro de uma troca gravada.
 *
 * Hoje so existe `1`. O campo existe porque o contrato de `/chat` ja mudou uma vez (prompt 8,
 * `searchQuery` -> `searchQueries`): uma troca gravada antes de uma mudanca dessas continua no
 * banco com o formato velho, e o front precisa reconhecer isso em vez de tentar renderizar
 * campos que mudaram de lugar.
 */
export const SUPPORTED_RESPONSE_FORMAT = 1

/** Uma troca (pergunta + resposta) gravada pela API. */
export interface ConversationExchange {
  id: number
  createdAt: string
  question: string
  responseFormat: number
  /** Mesmo corpo do `POST /chat`. So e confiavel quando `responseFormat` e conhecido. */
  response: ChatResponse
}

export interface Conversation {
  repositoryId: number
  /** Em ordem cronologica, mais antiga primeiro — conferido na resposta real. */
  exchanges: ConversationExchange[]
}

/**
 * Resultado de uma pergunta: a resposta mais se a API conseguiu gravar a troca.
 *
 * `saved` vem do header `Sonda-Conversation-Saved`, que o CORS da API expoe explicitamente
 * (`Access-Control-Expose-Headers`) — sem isso o navegador nao conseguiria le-lo. Quando o header
 * nao vem, assumimos `false`: e mais honesto avisar a toa do que prometer persistencia que nao
 * houve.
 */
export interface ChatResult {
  response: ChatResponse
  saved: boolean
}
