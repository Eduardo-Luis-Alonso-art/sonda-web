import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatResponse, ConversationExchange, Project } from '../api/types'
import { ANSWERED_FIXTURE } from '../ui/fixtures'
import { ChatPage } from './ChatPage'

const PETCLINIC: Project = {
  id: 1,
  name: 'spring-petclinic',
  localPath: 'C:\\x\\petclinic',
  primaryLanguage: 'Java',
}
const GRIMORIO: Project = {
  id: 2,
  name: 'Grimório',
  localPath: 'C:\\x\\Grimório',
  primaryLanguage: 'TypeScript',
}

function respostaDe(repositoryId: number, texto: string): ChatResponse {
  return {
    ...ANSWERED_FIXTURE,
    repositoryId,
    statements: [{ text: texto, citations: [] }],
    citations: [],
    sources: [],
  }
}

function troca(
  id: number,
  question: string,
  texto: string,
  responseFormat = 1,
): ConversationExchange {
  return {
    id,
    createdAt: '2026-10-27T03:00:00Z',
    question,
    responseFormat,
    response: respostaDe(1, texto),
  }
}

function json(body: unknown, status = 200, saved = 'true') {
  return {
    ok: status < 400,
    status,
    headers: new Headers({ 'Sonda-Conversation-Saved': saved }),
    json: () => Promise.resolve(body),
  } as Response
}
function semConteudo() {
  return {
    ok: true,
    status: 204,
    headers: new Headers(),
    json: () => Promise.reject(new Error('204 nao tem corpo')),
  } as Response
}

/** O corpo que mandamos e sempre string JSON; `BodyInit` em geral nao e seguro de stringificar. */
function perguntaDoCorpo(body: BodyInit | null | undefined): string {
  if (typeof body !== 'string') return ''
  return (JSON.parse(body) as { question?: string }).question ?? ''
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

/** Backend de mentira que grava de verdade, para testar a persistencia pela via real. */
function stubBackend({
  inicial = new Map<number, ConversationExchange[]>(),
  saved = 'true',
}: { inicial?: Map<number, ConversationExchange[]>; saved?: string } = {}) {
  const gravadas = new Map(inicial)
  let proximo = 500
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
    const url = urlOf(input)
    const id = Number(/\/projects\/(\d+)\//.exec(url)?.[1] ?? 0)

    if (url.endsWith('/api/projects')) return Promise.resolve(json([PETCLINIC, GRIMORIO]))
    if (url.endsWith('/conversation')) {
      if (init?.method === 'DELETE') {
        gravadas.set(id, [])
        return Promise.resolve(semConteudo())
      }
      return Promise.resolve(json({ repositoryId: id, exchanges: gravadas.get(id) ?? [] }))
    }
    if (url.endsWith('/chat')) {
      const resposta = respostaDe(id, `Resposta do projeto ${String(id)}.`)
      if (saved === 'true') {
        proximo += 1
        gravadas.set(id, [
          ...(gravadas.get(id) ?? []),
          {
            id: proximo,
            createdAt: '2026-10-27T03:10:00Z',
            question: perguntaDoCorpo(init?.body),
            responseFormat: 1,
            response: resposta,
          },
        ])
      }
      return Promise.resolve(json(resposta, 200, saved))
    }
    throw new Error(`url nao esperada: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, gravadas }
}

function renderAt(url = '/') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<ChatPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function perguntar(user: ReturnType<typeof userEvent.setup>, texto: string) {
  const campo = await screen.findByLabelText(/Pergunta sobre o codigo/)
  await waitFor(() => {
    expect(campo).toBeEnabled()
  })
  await user.type(campo, texto)
  await user.keyboard('{Enter}')
  await screen.findByRole('button', { name: 'Perguntar' })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('conversa vem do backend', () => {
  it('carrega o historico ja existente ao abrir, sem ter perguntado nada', async () => {
    stubBackend({
      inicial: new Map([[1, [troca(10, 'pergunta antiga', 'Resposta gravada antes.')]]]),
    })
    renderAt('/')

    // Isto e o que o mecanismo em memoria do prompt 9 nunca conseguia: historico no primeiro render.
    expect(await screen.findByText('Resposta gravada antes.')).toBeInTheDocument()
    expect(screen.getByText('pergunta antiga')).toBeInTheDocument()
  })

  it('mostra o estado de carregamento enquanto busca', async () => {
    let liberar: (r: Response) => void = () => undefined
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = urlOf(input)
      if (url.endsWith('/api/projects')) return Promise.resolve(json([PETCLINIC, GRIMORIO]))
      if (url.endsWith('/conversation')) {
        return new Promise<Response>((resolve) => {
          liberar = resolve
        })
      }
      throw new Error(url)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/')

    expect(await screen.findByText(/Carregando a conversa deste projeto/)).toBeInTheDocument()
    liberar(json({ repositoryId: 1, exchanges: [] }))
    expect(await screen.findByText('Nenhuma pergunta ainda.')).toBeInTheDocument()
  })

  it('busca de novo ao trocar de projeto, e cada um traz o seu', async () => {
    const { fetchMock } = stubBackend({
      inicial: new Map([
        [1, [troca(10, 'q1', 'So do petclinic.')]],
        [2, [troca(20, 'q2', 'So do Grimorio.')]],
      ]),
    })
    const user = userEvent.setup()
    renderAt('/')

    expect(await screen.findByText('So do petclinic.')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /Grimório/ }))
    expect(await screen.findByText('So do Grimorio.')).toBeInTheDocument()
    expect(screen.queryByText('So do petclinic.')).not.toBeInTheDocument()

    // Sem cache: cada troca de projeto refaz o GET. Medido, custa 12-18 ms.
    const buscas = fetchMock.mock.calls
      .map(([u]) => urlOf(u))
      .filter((u) => u.endsWith('/conversation'))
    expect(buscas).toEqual([
      'http://localhost:8080/api/projects/1/conversation',
      'http://localhost:8080/api/projects/2/conversation',
    ])
  })

  it('a pergunta aparece na hora (otimista) e persiste depois', async () => {
    const { gravadas } = stubBackend()
    const user = userEvent.setup()
    renderAt('/')

    await perguntar(user, 'minha pergunta')

    expect(await screen.findByText('Resposta do projeto 1.')).toBeInTheDocument()
    expect(gravadas.get(1)).toHaveLength(1)
  })

  it('erro ao carregar a conversa mostra o erro em vez de fingir conversa vazia', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = urlOf(input)
      if (url.endsWith('/api/projects')) return Promise.resolve(json([PETCLINIC, GRIMORIO]))
      if (url.endsWith('/conversation')) {
        return Promise.resolve(
          json({ type: 'about:blank', title: 'x', status: 500, detail: 'd', instance: '/i' }, 500),
        )
      }
      throw new Error(url)
    })
    vi.stubGlobal('fetch', fetchMock)
    renderAt('/')

    expect(await screen.findByRole('alert')).toHaveTextContent('erro interno')
    expect(screen.queryByText('Nenhuma pergunta ainda.')).not.toBeInTheDocument()
  })
})

describe('Sonda-Conversation-Saved: false', () => {
  it('avisa na troca especifica, sem travar a tela nem virar erro', async () => {
    stubBackend({ saved: 'false' })
    const user = userEvent.setup()
    renderAt('/')

    await perguntar(user, 'pergunta nao gravada')

    // A resposta aparece normalmente...
    expect(await screen.findByText('Resposta do projeto 1.')).toBeInTheDocument()
    expect(screen.getByText('Respondido com evidencia')).toBeInTheDocument()
    // ...e o aviso e discreto, nao um role=alert.
    expect(screen.getByText(/nao foi gravada no historico/)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('nao avisa quando a troca foi gravada', async () => {
    stubBackend()
    const user = userEvent.setup()
    renderAt('/')

    await perguntar(user, 'pergunta normal')
    await screen.findByText('Resposta do projeto 1.')

    expect(screen.queryByText(/nao foi gravada no historico/)).not.toBeInTheDocument()
  })
})

describe('responseFormat desconhecido', () => {
  it('mantem a pergunta na linha do tempo e avisa no lugar da resposta', async () => {
    stubBackend({
      inicial: new Map([[1, [troca(30, 'pergunta de formato velho', 'nao deve aparecer', 7)]]]),
    })
    renderAt('/')

    expect(await screen.findByText(/formato nao suportado/)).toBeInTheDocument()
    // A pergunta continua: esconder a troca deixaria um buraco inexplicado na conversa.
    expect(screen.getByText('pergunta de formato velho')).toBeInTheDocument()
    // E a resposta NAO e renderizada: os campos podem ter mudado de lugar.
    expect(screen.queryByText('nao deve aparecer')).not.toBeInTheDocument()
    expect(screen.getByText(/versao 7/)).toBeInTheDocument()
  })

  it('uma troca em formato velho nao impede as outras de aparecerem', async () => {
    stubBackend({
      inicial: new Map([[1, [troca(30, 'velha', 'x', 7), troca(31, 'nova', 'Esta aparece.', 1)]]]),
    })
    renderAt('/')

    expect(await screen.findByText('Esta aparece.')).toBeInTheDocument()
    expect(screen.getByText(/formato nao suportado/)).toBeInTheDocument()
  })
})

describe('limpar conversa', () => {
  it('pede confirmacao antes de apagar', async () => {
    const { fetchMock } = stubBackend({
      inicial: new Map([[1, [troca(10, 'q', 'Vai sumir.')]]]),
    })
    const user = userEvent.setup()
    renderAt('/')
    await screen.findByText('Vai sumir.')

    await user.click(screen.getByRole('button', { name: 'Limpar conversa' }))

    // Nada foi apagado ainda.
    expect(fetchMock.mock.calls.filter(([, i]) => i?.method === 'DELETE')).toHaveLength(0)
    const confirmacao = screen.getByRole('group', { name: /Confirmar limpeza/ })
    expect(confirmacao).toHaveTextContent('Nao tem desfazer')
    expect(confirmacao).toHaveTextContent('spring-petclinic')
  })

  it('cancelar nao apaga nada', async () => {
    const { fetchMock } = stubBackend({ inicial: new Map([[1, [troca(10, 'q', 'Fica.')]]]) })
    const user = userEvent.setup()
    renderAt('/')
    await screen.findByText('Fica.')

    await user.click(screen.getByRole('button', { name: 'Limpar conversa' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(fetchMock.mock.calls.filter(([, i]) => i?.method === 'DELETE')).toHaveLength(0)
    expect(screen.getByText('Fica.')).toBeInTheDocument()
  })

  it('Escape fecha a confirmacao', async () => {
    stubBackend({ inicial: new Map([[1, [troca(10, 'q', 'Fica.')]]]) })
    const user = userEvent.setup()
    renderAt('/')
    await screen.findByText('Fica.')

    await user.click(screen.getByRole('button', { name: 'Limpar conversa' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('group', { name: /Confirmar limpeza/ })).not.toBeInTheDocument()
  })

  it('confirmar apaga SO o projeto ativo; o outro fica intacto', async () => {
    const { gravadas } = stubBackend({
      inicial: new Map([
        [1, [troca(10, 'q1', 'Do petclinic.')]],
        [2, [troca(20, 'q2', 'Do Grimorio.')]],
      ]),
    })
    const user = userEvent.setup()
    renderAt('/')
    await screen.findByText('Do petclinic.')

    await user.click(screen.getByRole('button', { name: 'Limpar conversa' }))
    await user.click(
      within(screen.getByRole('group', { name: /Confirmar limpeza/ })).getByRole('button', {
        name: 'Apagar',
      }),
    )

    expect(await screen.findByText('Nenhuma pergunta ainda.')).toBeInTheDocument()
    expect(gravadas.get(1)).toHaveLength(0)
    expect(gravadas.get(2)).toHaveLength(1)

    // E o outro projeto continua mostrando a conversa dele.
    await user.click(screen.getByRole('tab', { name: /Grimório/ }))
    expect(await screen.findByText('Do Grimorio.')).toBeInTheDocument()
  })

  it('o foco vai para o botao de confirmar ao abrir', async () => {
    stubBackend()
    const user = userEvent.setup()
    renderAt('/')
    await screen.findByText('Nenhuma pergunta ainda.')

    await user.click(screen.getByRole('button', { name: 'Limpar conversa' }))

    expect(screen.getByRole('button', { name: 'Apagar' })).toHaveFocus()
  })
})
