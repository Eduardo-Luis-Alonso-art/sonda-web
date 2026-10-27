import type { ApiError } from '../api/errors'
import type { ChatResponse, ConversationExchange } from '../api/types'
import { SUPPORTED_RESPONSE_FORMAT } from '../api/types'

/**
 * Um turno da conversa na tela.
 *
 * Desde o prompt 13 o histórico **não** vive mais só em memória: ele vem de
 * `GET /api/projects/{id}/conversation`, e a API é a fonte de verdade. O que fica em memória é
 * apenas o turno da pergunta em curso, até a resposta chegar — e mesmo esse já nasce gravado do
 * lado do servidor.
 *
 * Estados:
 *   `pending`            — perguntou, resposta não voltou ainda (só existe na sessão atual)
 *   `answered`           — resposta na mão
 *   `failed`             — a chamada falhou; dá para repetir
 *   `unsupportedFormat`  — troca gravada num `responseFormat` que esta versão não sabe ler
 */
export interface ConversationTurn {
  /** Id estável para a key do React e para o foco por teclado. */
  id: string
  question: string
  state: 'pending' | 'answered' | 'failed' | 'unsupportedFormat'
  response: ChatResponse | null
  error: ApiError | null
  /**
   * `false` quando a API respondeu mas avisou que não conseguiu gravar a troca
   * (`Sonda-Conversation-Saved: false`). Turnos vindos do backend são, por definição, salvos.
   */
  saved: boolean
  /** Quando a troca foi gravada; ausente enquanto a resposta não voltou. */
  createdAt: string | null
  /** Só preenchido em `unsupportedFormat`, para a mensagem dizer qual formato veio. */
  responseFormat: number | null
}

export function pendingTurn(id: string, question: string): ConversationTurn {
  return {
    id,
    question,
    state: 'pending',
    response: null,
    error: null,
    saved: true,
    createdAt: null,
    responseFormat: null,
  }
}

/**
 * Converte uma troca vinda da API num turno da tela.
 *
 * Uma troca com `responseFormat` desconhecido **não** é descartada nem renderizada: a pergunta e o
 * horário continuam na linha do tempo — senão a conversa ficaria com buracos inexplicados — e no
 * lugar da resposta entra um aviso. Tentar desenhar `response` seria chutar onde os campos estão,
 * e o contrato já mudou uma vez (prompt 8).
 */
export function turnFromExchange(exchange: ConversationExchange): ConversationTurn {
  const supported = exchange.responseFormat === SUPPORTED_RESPONSE_FORMAT
  return {
    id: `troca-${String(exchange.id)}`,
    question: exchange.question,
    state: supported ? 'answered' : 'unsupportedFormat',
    response: supported ? exchange.response : null,
    error: null,
    saved: true,
    createdAt: exchange.createdAt,
    responseFormat: exchange.responseFormat,
  }
}
