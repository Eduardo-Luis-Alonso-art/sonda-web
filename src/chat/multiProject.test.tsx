import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ChatResponse, Project } from '../api/types'
import { ANSWERED_FIXTURE } from '../ui/fixtures'
import { ChatPage } from './ChatPage'

const PETCLINIC: Project = {
  id: 1,
  name: 'spring-petclinic',
  localPath: 'C:\\x\\spring-petclinic',
  primaryLanguage: 'Java',
}
const GRIMORIO: Project = {
  id: 2,
  name: 'Grimório',
  localPath: 'C:\\x\\Grimório',
  primaryLanguage: 'TypeScript',
}

/** Resposta do projeto indicado, com uma citação de um arquivo daquele projeto. */
function respostaDe(repositoryId: number, path: string, texto: string): ChatResponse {
  return {
    ...ANSWERED_FIXTURE,
    repositoryId,
    statements: [
      { text: texto, citations: [{ sourceId: 'S1', path, startLine: 10, endLine: 12 }] },
    ],
    citations: [{ sourceId: 'S1', path, startLine: 10, endLine: 12 }],
    sources: [],
  }
}

function json(body: unknown, status = 200, savedHeader = 'true') {
  const headers = new Headers({ 'Sonda-Conversation-Saved': savedHeader })
  return { ok: status < 400, status, headers, json: () => Promise.resolve(body) } as Response
}

function vazio(status = 204) {
  return {
    ok: true,
    status,
    headers: new Headers(),
    json: () => Promise.reject(new Error('204')),
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

/**
 * Cada projeto responde uma coisa diferente, para dar para saber quem respondeu.
 *
 * O historico vive no stub como um mapa por projeto, imitando o backend do prompt 13: um POST
 * /chat grava a troca, o GET /conversation devolve o que foi gravado e o DELETE limpa. E isso
 * que permite testar que a conversa sobrevive a troca de aba **pela via nova** — vindo do
 * servidor — e nao por um mapa em memoria no front.
 */
function stubApi({ savedHeader = 'true' }: { savedHeader?: string } = {}) {
  const gravadas = new Map<number, unknown[]>()
  let proximoId = 100

  const fetchMock = vi.fn<typeof fetch>().mockImplementation((input, init) => {
    const url = urlOf(input)
    const projeto = /\/projects\/(\d+)\//.exec(url)?.[1]
    const id = projeto === undefined ? 0 : Number(projeto)

    if (url.endsWith('/api/projects')) return Promise.resolve(json([PETCLINIC, GRIMORIO]))

    if (url.endsWith('/conversation')) {
      if (init?.method === 'DELETE') {
        gravadas.set(id, [])
        return Promise.resolve(vazio())
      }
      return Promise.resolve(json({ repositoryId: id, exchanges: gravadas.get(id) ?? [] }))
    }
    if (url.endsWith('/chat')) {
      const resposta =
        id === 1
          ? respostaDe(1, 'src/main/java/Owner.java', 'Resposta do petclinic.')
          : respostaDe(2, 'src/App.tsx', 'Resposta do Grimorio.')
      if (savedHeader === 'true') {
        proximoId += 1
        gravadas.set(id, [
          ...(gravadas.get(id) ?? []),
          {
            id: proximoId,
            createdAt: '2026-10-27T03:00:00Z',
            question: perguntaDoCorpo(init?.body),
            responseFormat: 1,
            response: resposta,
          },
        ])
      }
      return Promise.resolve(json(resposta, 200, savedHeader))
    }
    throw new Error(`url nao esperada: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
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
  // Espera o GET /conversation: o campo fica bloqueado enquanto a conversa carrega.
  await waitFor(() => {
    expect(screen.getByLabelText(/Pergunta sobre o codigo/)).toBeEnabled()
  })
  await user.type(await screen.findByLabelText(/Pergunta sobre o codigo/), texto)
  await user.keyboard('{Enter}')
  await screen.findByRole('button', { name: 'Perguntar' })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('selecao de projeto', () => {
  it('sem ?project= na URL, abre no primeiro projeto', async () => {
    stubApi()
    renderAt('/')

    expect(await screen.findByRole('tab', { name: /spring-petclinic/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('?project= na URL decide qual abre', async () => {
    stubApi()
    renderAt('/?project=Grim%C3%B3rio')

    expect(await screen.findByRole('tab', { name: /Grimório/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })

  it('a pergunta vai para o projeto selecionado, nao para o primeiro', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    renderAt('/')

    await user.click(await screen.findByRole('tab', { name: /Grimório/ }))
    await perguntar(user, 'como funciona?')

    const chamadas = fetchMock.mock.calls.map(([u]) => urlOf(u)).filter((u) => u.includes('/chat'))
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0]).toContain('/projects/2/chat')
  })

  it('nome desconhecido na URL avisa em vez de abrir o primeiro', async () => {
    stubApi()
    renderAt('/?project=inexistente')

    expect(await screen.findByRole('alert')).toHaveTextContent('Nao existe projeto chamado')
  })
})

describe('historico por projeto', () => {
  it('guarda uma conversa por projeto e devolve ao voltar', async () => {
    stubApi()
    const user = userEvent.setup()
    renderAt('/')

    await perguntar(user, 'pergunta do petclinic')
    expect(await screen.findByText('Resposta do petclinic.')).toBeInTheDocument()

    // Troca para o Grimorio: a conversa do petclinic sai da tela...
    await user.click(screen.getByRole('tab', { name: /Grimório/ }))
    expect(screen.queryByText('Resposta do petclinic.')).not.toBeInTheDocument()
    expect(screen.getByText('Nenhuma pergunta ainda.')).toBeInTheDocument()

    await perguntar(user, 'pergunta do grimorio')
    expect(await screen.findByText('Resposta do Grimorio.')).toBeInTheDocument()

    // ...e volta inteira ao retornar. Cada resposta custou dinheiro: perder no clique seria caro.
    await user.click(screen.getByRole('tab', { name: /spring-petclinic/ }))
    expect(await screen.findByText('Resposta do petclinic.')).toBeInTheDocument()
    expect(screen.queryByText('Resposta do Grimorio.')).not.toBeInTheDocument()
  })

  it('nunca mostra respostas de dois projetos ao mesmo tempo', async () => {
    stubApi()
    const user = userEvent.setup()
    renderAt('/')

    await perguntar(user, 'um')
    await user.click(screen.getByRole('tab', { name: /Grimório/ }))
    await perguntar(user, 'dois')

    const turnos = screen.getAllByLabelText(/^Turno \d+ de/)
    expect(turnos).toHaveLength(1)
  })
})

describe('citacao leva ao projeto certo', () => {
  it('a citacao do petclinic aponta para o projeto petclinic', async () => {
    stubApi()
    const user = userEvent.setup()
    renderAt('/')

    await perguntar(user, 'pergunta')

    const link = await screen.findByRole('link', { name: /Owner\.java/ })
    expect(link).toHaveAttribute(
      'href',
      '/explorer?project=spring-petclinic&file=src%2Fmain%2Fjava%2FOwner.java&lines=10-12',
    )
  })

  it('a citacao do Grimorio aponta para o Grimorio, com o nome escapado', async () => {
    stubApi()
    const user = userEvent.setup()
    renderAt('/?project=Grim%C3%B3rio')

    await perguntar(user, 'pergunta')

    const link = await screen.findByRole('link', { name: /App\.tsx/ })
    expect(link).toHaveAttribute(
      'href',
      '/explorer?project=Grim%C3%B3rio&file=src%2FApp.tsx&lines=10-12',
    )
  })

  /**
   * O caso que o prompt pede explicitamente: a citação tem que levar ao projeto que RESPONDEU,
   * mesmo que outro esteja selecionado. Como o link é montado a partir do `repositoryId` da
   * resposta, e não da seleção atual, ele continua certo.
   */
  it('o link sai do repositoryId da resposta, nao do projeto selecionado agora', async () => {
    stubApi()
    const user = userEvent.setup()
    renderAt('/')

    await perguntar(user, 'pergunta do petclinic')
    const antes = await screen.findByRole('link', { name: /Owner\.java/ })
    expect(antes).toHaveAttribute('href', expect.stringContaining('project=spring-petclinic'))

    // Vai ao outro projeto e volta: o link do turno antigo continua apontando para o petclinic.
    await user.click(screen.getByRole('tab', { name: /Grimório/ }))
    await user.click(screen.getByRole('tab', { name: /spring-petclinic/ }))

    const depois = await screen.findByRole('link', { name: /Owner\.java/ })
    expect(depois).toHaveAttribute(
      'href',
      '/explorer?project=spring-petclinic&file=src%2Fmain%2Fjava%2FOwner.java&lines=10-12',
    )
  })
})

describe('AnswerCard com o contrato novo', () => {
  it('mostra as duas buscas com a similaridade de cada uma', async () => {
    stubApi()
    const user = userEvent.setup()
    renderAt('/')

    await perguntar(user, 'pergunta')
    await screen.findByText('Resposta do petclinic.')

    const lista = screen.getByText('Buscas feitas no codigo').closest('div')
    expect(lista).not.toBeNull()
    const escopo = within(lista as HTMLElement)
    expect(escopo.getByText('sua pergunta')).toBeInTheDocument()
    expect(escopo.getByText('reescrita em ingles')).toBeInTheDocument()
    expect(escopo.getByText('0.4108')).toBeInTheDocument()
    expect(escopo.getByText(/0\.4533/)).toBeInTheDocument()
    // A melhor das duas e marcada, e a marca tem texto para leitor de tela.
    expect(escopo.getByText('melhor similaridade')).toBeInTheDocument()
  })
})
