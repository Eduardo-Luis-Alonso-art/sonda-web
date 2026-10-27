import { afterEach, describe, expect, it, vi } from 'vitest'
import { askQuestion, deleteConversation, getConversation, listProjects } from './client'
import { ApiError } from './errors'
import type { Project } from './types'

/**
 * O client contra respostas montadas a partir dos corpos REAIS da API (conferidos por curl na
 * 8080). O que importa aqui e o que acontece em cada forma de falha — nenhum teste chama a API.
 */

function mockFetch(reply: Partial<Response> & { jsonBody?: unknown; savedHeader?: string }) {
  const headers = new Headers()
  if (reply.savedHeader !== undefined) headers.set('Sonda-Conversation-Saved', reply.savedHeader)
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
    ok: reply.ok ?? true,
    status: reply.status ?? 200,
    headers,
    json: () =>
      'jsonBody' in reply
        ? Promise.resolve(reply.jsonBody)
        : Promise.reject(new Error('sem corpo')),
  } as Response)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('listProjects', () => {
  it('devolve a lista tal como a API manda, com primaryLanguage possivelmente null', async () => {
    const body: Project[] = [
      {
        id: 1,
        name: 'spring-petclinic',
        localPath: 'C:\\Users\\Edu\\Documents\\ProjetosJava\\spring-petclinic',
        primaryLanguage: 'Java',
      },
      { id: 2, name: 'sem-linguagem', localPath: '/tmp/x', primaryLanguage: null },
    ]
    mockFetch({ jsonBody: body })

    await expect(listProjects()).resolves.toEqual(body)
  })

  it('chama a porta 8080 por padrao (default do application.yml do sonda-api)', async () => {
    const fetchMock = mockFetch({ jsonBody: [] })
    await listProjects()

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8080/api/projects')
  })
})

describe('askQuestion', () => {
  it('manda POST com a pergunta em JSON', async () => {
    const fetchMock = mockFetch({ jsonBody: { status: 'ANSWERED' } })
    await askQuestion(1, 'Como uma visita e criada?')

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('http://localhost:8080/api/projects/1/chat')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe(JSON.stringify({ question: 'Como uma visita e criada?' }))
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
  })

  it('trata NO_EVIDENCE como sucesso, nao como erro', async () => {
    mockFetch({
      jsonBody: { status: 'NO_EVIDENCE', noEvidenceReason: 'BELOW_SIMILARITY_THRESHOLD' },
    })

    const { response } = await askQuestion(1, 'receita de bolo')
    expect(response.status).toBe('NO_EVIDENCE')
  })

  it('le o Sonda-Conversation-Saved da resposta', async () => {
    mockFetch({ jsonBody: { status: 'ANSWERED' }, savedHeader: 'true' })
    await expect(askQuestion(1, 'x').then((r) => r.saved)).resolves.toBe(true)
  })

  it('header ausente conta como NAO salvo', async () => {
    // Mais honesto avisar a toa do que prometer persistencia que pode nao ter havido.
    mockFetch({ jsonBody: { status: 'ANSWERED' } })
    await expect(askQuestion(1, 'x').then((r) => r.saved)).resolves.toBe(false)
  })

  it('qualquer valor diferente de "true" conta como nao salvo', async () => {
    mockFetch({ jsonBody: { status: 'ANSWERED' }, savedHeader: 'false' })
    await expect(askQuestion(1, 'x').then((r) => r.saved)).resolves.toBe(false)
  })
})

describe('conversa', () => {
  it('GET /conversation devolve as trocas na ordem da API', async () => {
    const corpo = { repositoryId: 1, exchanges: [{ id: 5 }, { id: 6 }] }
    const fetchMock = mockFetch({ jsonBody: corpo })

    await expect(getConversation(1)).resolves.toEqual(corpo)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:8080/api/projects/1/conversation')
  })

  it('DELETE aceita 204 sem corpo em vez de reclamar de JSON invalido', async () => {
    // O 204 nao tem corpo nenhum: passar por response.json() lancaria, e o usuario veria
    // "formato inesperado" numa operacao que deu certo.
    const fetchMock = mockFetch({ ok: true, status: 204 })

    await expect(deleteConversation(2)).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe('DELETE')
  })

  it('propaga o 404 de projeto inexistente', async () => {
    mockFetch({
      ok: false,
      status: 404,
      jsonBody: { type: 'about:blank', title: 'x', status: 404, detail: 'd', instance: '/i' },
    })

    const erro = (await getConversation(999).catch((c: unknown) => c)) as ApiError
    expect(erro.status).toBe(404)
  })
})

describe('mapeamento de erro', () => {
  it('traduz o 404 do problem+json e guarda o detail tecnico', async () => {
    mockFetch({
      ok: false,
      status: 404,
      jsonBody: {
        type: 'about:blank',
        title: 'Projeto nao encontrado',
        status: 404,
        detail: 'Projeto 999 nao encontrado',
        instance: '/api/projects/999/chat',
      },
    })

    const error = await askQuestion(999, 'oi').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ApiError)
    const apiError = error as ApiError
    expect(apiError.status).toBe(404)
    expect(apiError.message).toContain('Projeto nao encontrado')
    expect(apiError.technicalDetail).toBe('Projeto 999 nao encontrado')
  })

  it.each([
    [400, 'Pergunta invalida'],
    [405, 'metodo HTTP errado'],
    [409, 'indexacao em andamento'],
    [422, 'ainda nao foi indexado'],
    [502, 'provedor de IA falhou'],
  ])('traduz o %i para pt-BR', async (status, fragment) => {
    mockFetch({
      ok: false,
      status,
      jsonBody: { type: 'about:blank', title: 't', status, detail: 'd', instance: '/i' },
    })

    const error = (await askQuestion(1, 'oi').catch((caught: unknown) => caught)) as ApiError
    expect(error.message).toContain(fragment)
  })

  it('cai no status HTTP quando o corpo de erro nao e problem+json', async () => {
    mockFetch({ ok: false, status: 503 })

    const error = (await listProjects().catch((caught: unknown) => caught)) as ApiError
    expect(error.status).toBe(503)
    expect(error.message).toContain('erro interno')
    expect(error.technicalDetail).toBeNull()
  })

  it('vira falha de conexao quando o fetch rejeita (API fora do ar ou CORS)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    )

    const error = (await listProjects().catch((caught: unknown) => caught)) as ApiError
    expect(error.status).toBeNull()
    expect(error.message).toContain('porta 8080')
  })

  it('avisa quando a resposta 200 nao e o JSON esperado', async () => {
    mockFetch({ ok: true, status: 200 })

    const error = (await listProjects().catch((caught: unknown) => caught)) as ApiError
    expect(error.message).toContain('formato inesperado')
  })
})
