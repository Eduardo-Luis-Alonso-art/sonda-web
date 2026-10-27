import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '../api/types'
import { ANSWERED_FIXTURE, NO_EVIDENCE_FIXTURE } from '../ui/fixtures'
import { ChatPage } from './ChatPage'

const PROJECT: Project = {
  id: 1,
  name: 'spring-petclinic',
  localPath: 'C:\\Users\\Edu\\Documents\\ProjetosJava\\spring-petclinic',
  primaryLanguage: 'Java',
}

function jsonResponse(body: unknown, status = 200, savedHeader = 'true') {
  const headers = new Headers({ 'Sonda-Conversation-Saved': savedHeader })
  return { ok: status < 400, status, headers, json: () => Promise.resolve(body) } as Response
}

/** O primeiro argumento do fetch e `string | URL | Request` — cada um guarda a url num lugar. */
function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

/**
 * Responde /api/projects, /conversation (vazia) e qualquer /chat com `chatReply`.
 *
 * O `/conversation` entrou no prompt 13: a ChatPage busca o historico no backend ao montar, entao
 * um stub sem essa rota deixaria a tela presa em "carregando a conversa".
 */
function stubApi(chatReply: () => Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = urlOf(input)
    if (url.endsWith('/api/projects')) return Promise.resolve(jsonResponse([PROJECT]))
    if (url.endsWith('/conversation')) {
      return Promise.resolve(jsonResponse({ repositoryId: 1, exchanges: [] }))
    }
    if (url.endsWith('/chat')) return chatReply()
    throw new Error(`url nao esperada no teste: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/**
 * A tela de chat agora vive dentro do roteador: o cabecalho usa `NavLink` e cada citacao virou um
 * `Link` para o explorer. Sem contexto de rota, os dois lancam na renderizacao.
 */
function renderChat() {
  return render(
    <MemoryRouter>
      <ChatPage />
    </MemoryRouter>,
  )
}

/**
 * O campo de pergunta so libera depois do GET /conversation (prompt 13). Digitar antes disso
 * nao faz nada, porque o textarea esta `disabled`.
 */
async function campoLiberado() {
  const field = await screen.findByLabelText(/Pergunta sobre o codigo/)
  await waitFor(() => {
    expect(field).toBeEnabled()
  })
  return field
}

beforeEach(() => {
  vi.useRealTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ChatPage', () => {
  it('mostra o projeto carregado e o historico vazio', async () => {
    stubApi(() => Promise.resolve(jsonResponse(ANSWERED_FIXTURE)))
    renderChat()

    // O nome aparece em dois lugares de proposito: na aba do seletor e no cabecalho fixo, que
    // continua dizendo qual projeto esta ativo depois de rolar uma conversa longa.
    expect(await screen.findByRole('tab', { name: /spring-petclinic/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    // `find` e nao `get`: a conversa vem do backend agora, entao o vazio so aparece depois que
    // o GET /conversation resolve.
    expect(await screen.findByText('Nenhuma pergunta ainda.')).toBeInTheDocument()
  })

  it('pergunta, mostra o carregando e depois a resposta ANSWERED com as citacoes', async () => {
    let release: (value: Response) => void = () => undefined
    stubApi(
      () =>
        new Promise<Response>((resolve) => {
          release = resolve
        }),
    )
    const user = userEvent.setup()
    renderChat()

    const field = await campoLiberado()
    await user.type(field, 'Quais validacoes sao feitas no telefone do dono?')
    await user.click(screen.getByRole('button', { name: 'Perguntar' }))

    // Estado de carregamento: a chamada ainda nao resolveu.
    expect(screen.getByRole('status')).toHaveTextContent(/Procurando evidencia/)
    expect(screen.getByRole('button', { name: 'Perguntando…' })).toBeDisabled()

    release(jsonResponse(ANSWERED_FIXTURE))

    expect(await screen.findByText('Respondido com evidencia')).toBeInTheDocument()
    // Caminho do arquivo e faixa de linha visiveis por citacao.
    expect(screen.getAllByText(/OwnerControllerTests\.java/).length).toBeGreaterThan(0)
    expect(screen.getByText(':117-121')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('distingue NO_EVIDENCE: diz o motivo e nao mostra citacao', async () => {
    stubApi(() => Promise.resolve(jsonResponse(NO_EVIDENCE_FIXTURE)))
    const user = userEvent.setup()
    renderChat()

    const field = await campoLiberado()
    await user.type(field, 'receita de bolo')
    await user.keyboard('{Enter}')

    expect(await screen.findByText('Sem evidencia no codigo')).toBeInTheDocument()
    expect(screen.getByText(/nao foi chamado/)).toBeInTheDocument()
    expect(screen.queryByText('Respondido com evidencia')).not.toBeInTheDocument()
  })

  it('mapeia o 422 da API para mensagem em pt-BR e oferece repetir', async () => {
    stubApi(() =>
      Promise.resolve(
        jsonResponse(
          {
            type: 'about:blank',
            title: 'Projeto nao indexado',
            status: 422,
            detail: 'Projeto 1 nao tem nenhum chunk com embedding',
            instance: '/api/projects/1/chat',
          },
          422,
        ),
      ),
    )
    const user = userEvent.setup()
    renderChat()

    const field = await campoLiberado()
    await user.type(field, 'qualquer coisa')
    await user.keyboard('{Enter}')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Erro HTTP 422')
    expect(alert).toHaveTextContent('Este projeto ainda nao foi indexado')
    expect(within(alert).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('Enter envia e Shift+Enter apenas quebra linha', async () => {
    const fetchMock = stubApi(() => Promise.resolve(jsonResponse(ANSWERED_FIXTURE)))
    const user = userEvent.setup()
    renderChat()

    const field = await campoLiberado()
    await user.type(field, 'primeira linha')
    await user.keyboard('{Shift>}{Enter}{/Shift}')
    await user.type(field, 'segunda linha')

    const chatCalls = () => fetchMock.mock.calls.filter(([url]) => urlOf(url).endsWith('/chat'))
    expect(chatCalls()).toHaveLength(0)
    expect(field).toHaveValue('primeira linha\nsegunda linha')

    await user.keyboard('{Enter}')
    await waitFor(() => {
      expect(chatCalls()).toHaveLength(1)
    })
    expect(field).toHaveValue('')
  })

  it('o historico e navegavel por setas, Home e End', async () => {
    stubApi(() => Promise.resolve(jsonResponse(NO_EVIDENCE_FIXTURE)))
    const user = userEvent.setup()
    renderChat()

    const field = await campoLiberado()
    for (const question of ['pergunta um', 'pergunta dois', 'pergunta tres']) {
      await user.type(field, question)
      await user.keyboard('{Enter}')
      // Enquanto a chamada esta em curso o botao se chama "Perguntando…"; voltar a "Perguntar"
      // e o sinal de que o turno terminou. (Enabled nao serve: o campo ficou vazio.)
      await screen.findByRole('button', { name: 'Perguntar' })
    }

    // Pelo rotulo do turno, e nao por listitem: as afirmacoes e citacoes dentro de cada resposta
    // tambem sao <li>.
    const turns = screen.getAllByLabelText(/^Turno \d+ de/)
    expect(turns).toHaveLength(3)

    turns[0]?.focus()
    expect(turns[0]).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(turns[1]).toHaveFocus()

    await user.keyboard('{End}')
    expect(turns[2]).toHaveFocus()

    await user.keyboard('{ArrowUp}')
    expect(turns[1]).toHaveFocus()

    await user.keyboard('{Home}')
    expect(turns[0]).toHaveFocus()
  })

  it('nao deixa enviar pergunta vazia nem acima de 2.000 caracteres', async () => {
    const fetchMock = stubApi(() => Promise.resolve(jsonResponse(ANSWERED_FIXTURE)))
    const user = userEvent.setup()
    renderChat()

    const field = await campoLiberado()
    expect(screen.getByRole('button', { name: 'Perguntar' })).toBeDisabled()

    await user.type(field, '   ')
    expect(screen.getByRole('button', { name: 'Perguntar' })).toBeDisabled()

    await user.clear(field)
    await user.paste('a'.repeat(2001))
    expect(screen.getByRole('button', { name: 'Perguntar' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('passou de 2000 caracteres')

    expect(fetchMock.mock.calls.filter(([url]) => urlOf(url).endsWith('/chat'))).toHaveLength(0)
  })

  it('mostra erro de conexao quando a API esta fora do ar', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new TypeError('Failed to fetch')),
    )
    renderChat()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Falha de conexao')
    expect(alert).toHaveTextContent('porta 8080')
  })
})
