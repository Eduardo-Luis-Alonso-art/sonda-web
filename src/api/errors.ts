import type { ProblemJson } from './types'

/**
 * Erro de chamada a API, ja com mensagem em pt-BR pronta para a tela.
 *
 * A API nunca devolve a mensagem crua da OpenAI (em 401 ela ecoa parte da chave), e aqui tambem
 * nao mostramos `detail` cru para o usuario: `detail` vira detalhe secundario, opcional.
 */
export class ApiError extends Error {
  readonly status: number | null
  readonly problem: ProblemJson | null
  /** Linha tecnica auxiliar (o `detail` do problem+json), para exibir discreta abaixo da mensagem. */
  readonly technicalDetail: string | null

  constructor(
    message: string,
    options: {
      status?: number | null
      problem?: ProblemJson | null
      technicalDetail?: string | null
      cause?: unknown
    } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause })
    this.name = 'ApiError'
    this.status = options.status ?? null
    this.problem = options.problem ?? null
    this.technicalDetail = options.technicalDetail ?? null
  }
}

/**
 * Traduz o status HTTP do problem+json para uma frase que diz ao usuario o que fazer.
 *
 * Os codigos vem do contrato conferido no sonda-api rodando:
 *   400 pergunta vazia/ausente/>2000 chars, corpo nao-JSON, ou id nao numerico
 *   404 projeto inexistente
 *   409 ja existe um sync rodando para esse projeto
 *   422 projeto sem nenhum chunk com embedding (falta rodar o sync)
 *   502 falha no provedor (OpenAI): 401, 429 apos retries, 5xx, rede, recusa do modelo
 *   405 metodo diferente de POST
 */
export function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Pergunta invalida. Escreva algo entre 1 e 2.000 caracteres.'
    case 404:
      return 'Projeto nao encontrado. A lista de projetos pode estar desatualizada — recarregue a pagina.'
    case 405:
      return 'Chamada feita com o metodo HTTP errado. Isso e um defeito no cliente, nao na sua pergunta.'
    case 410:
      // So o explorer devolve 410: o arquivo esta no indice mas sumiu do disco.
      return 'Este arquivo nao existe mais em disco. Ele foi removido ou renomeado desde a ultima indexacao — rode o sync para atualizar o indice.'
    case 409:
      return 'Ja existe uma indexacao em andamento para este projeto. Espere ela terminar e tente de novo.'
    case 422:
      // 422 serve a duas situacoes diferentes, e a mensagem generica atenderia mal as duas; quem
      // chama o explorer usa `messageForFileStatus`, que sabe que ali o 422 e sobre o arquivo.
      return 'Este projeto ainda nao foi indexado. Rode o sync antes de perguntar.'
    case 502:
      return 'O provedor de IA falhou nesta pergunta. Nada foi perdido — tente de novo em alguns segundos.'
    default:
      if (status >= 500) {
        return 'A API da Sonda respondeu com erro interno. Tente de novo em alguns segundos.'
      }
      return `A API recusou a chamada (HTTP ${String(status)}).`
  }
}

/** Mensagem para falha de transporte: API no ar? CORS liberado? */
export const NETWORK_ERROR_MESSAGE =
  'Nao foi possivel falar com a API da Sonda. Confira se ela esta rodando na porta 8080.'

/** Mensagem para resposta 2xx que nao e o JSON esperado. */
export const MALFORMED_RESPONSE_MESSAGE =
  'A API respondeu num formato inesperado. Confira a versao do sonda-api.'

/**
 * Mesmo mapeamento, na linguagem do explorer de arquivos.
 *
 * Existe separado porque dois codigos querem dizer coisas diferentes aqui: o `422` do chat e
 * "projeto nao indexado", e o do explorer e "este arquivo nao pode ser exibido"; o `404` do chat
 * fala de projeto, o do explorer fala de arquivo.
 */
export function messageForFileStatus(status: number | null): string {
  if (status === null) return NETWORK_ERROR_MESSAGE
  switch (status) {
    case 404:
      return 'Arquivo nao encontrado. A lista de arquivos pode estar desatualizada — recarregue a pagina.'
    case 410:
      return messageForStatus(410)
    case 422:
      return 'Este arquivo nao pode ser exibido: ele esta binario, nao esta em UTF-8, ou passa do teto de 2 MB.'
    default:
      return messageForStatus(status)
  }
}
