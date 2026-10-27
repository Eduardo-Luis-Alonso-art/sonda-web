import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { FileContent, IndexedFileSummary, Project } from '../api/types'
import { ExplorerPage } from './ExplorerPage'

const PROJECT: Project = {
  id: 1,
  name: 'spring-petclinic',
  localPath: 'C:\\Users\\Edu\\Documents\\ProjetosJava\\spring-petclinic',
  primaryLanguage: 'Java',
}

const FILES: IndexedFileSummary[] = [
  {
    id: 3,
    path: '.editorconfig',
    language: null,
    chunkCount: 1,
    indexedAt: '2026-10-26T17:53:51Z',
  },
  {
    id: 11,
    path: 'build.gradle',
    language: 'Gradle',
    chunkCount: 2,
    indexedAt: '2026-10-26T17:53:52Z',
  },
  {
    id: 30,
    path: 'src/main/java/org/springframework/samples/petclinic/owner/Owner.java',
    language: 'Java',
    chunkCount: 3,
    indexedAt: '2026-10-26T17:53:52Z',
  },
  {
    id: 31,
    path: 'src/main/java/org/springframework/samples/petclinic/owner/Pet.java',
    language: 'Java',
    chunkCount: 2,
    indexedAt: '2026-10-26T17:53:52Z',
  },
]

/** Caminho do Owner.java — nomeado para os testes nao indexarem FILES por numero. */
const OWNER_PATH = 'src/main/java/org/springframework/samples/petclinic/owner/Owner.java'

const OWNER_CONTENT: FileContent = {
  fileId: 30,
  projectId: 1,
  path: OWNER_PATH,
  language: 'Java',
  content: Array.from({ length: 80 }, (_, i) => `// linha ${String(i + 1)}`).join('\n'),
  lineCount: 80,
  sizeBytes: 900,
  contentMayBeStale: false,
  indexedContentHash: 'a5273cbccaf4993c92cc204c4481d52ebc611b731862f078b203b2a7eefa5f8a',
  currentContentHash: 'a5273cbccaf4993c92cc204c4481d52ebc611b731862f078b203b2a7eefa5f8a',
  indexedAt: '2026-10-26T17:53:52Z',
}

const GRIMORIO: Project = {
  id: 2,
  name: 'Grimório',
  localPath: 'C:\\Users\\Edu\\Desktop\\Grimório',
  primaryLanguage: 'TypeScript',
}

/** O Grimorio tem um README.md e o petclinic tambem: mesmo caminho, projetos diferentes. */
const FILES_GRIMORIO: IndexedFileSummary[] = [
  {
    id: 500,
    path: 'README.md',
    language: 'Markdown',
    chunkCount: 1,
    indexedAt: '2026-10-27T10:00:00Z',
  },
]

function json(body: unknown, status = 200) {
  return { ok: status < 400, status, json: () => Promise.resolve(body) } as Response
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  return input instanceof URL ? input.href : input.url
}

/** Responde /projects e /files; o conteúdo vem de `contentReply`. */
function stubApi(
  contentReply: () => Promise<Response> = () => Promise.resolve(json(OWNER_CONTENT)),
) {
  const fetchMock = vi.fn<typeof fetch>().mockImplementation((input) => {
    const url = urlOf(input)
    if (url.endsWith('/api/projects')) return Promise.resolve(json([PROJECT, GRIMORIO]))
    if (url.endsWith('/projects/2/files')) return Promise.resolve(json(FILES_GRIMORIO))
    if (url.endsWith('/files')) return Promise.resolve(json(FILES))
    if (url.endsWith('/content')) return contentReply()
    throw new Error(`url nao esperada: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/explorer" element={<ExplorerPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('arvore de arquivos', () => {
  it('monta a arvore a partir da lista plana, com as pastas recolhidas', async () => {
    stubApi()
    renderAt('/explorer?project=spring-petclinic')

    expect(await screen.findByRole('tree', { name: 'Arquivos indexados' })).toBeInTheDocument()
    // Nivel de cima apenas, e pastas antes de arquivos (convencao de explorer de IDE; a API
    // devolve tudo plano em ordem de code point, o agrupamento e a ordem da arvore sao daqui).
    const nomes = screen.getAllByRole('treeitem').map((item) => item.getAttribute('data-node-path'))
    expect(nomes).toEqual(['src', '.editorconfig', 'build.gradle'])
  })

  it('pasta anuncia estado de expansao e nivel para o leitor de tela', async () => {
    stubApi()
    renderAt('/explorer?project=spring-petclinic')

    const pasta = await screen.findByRole('treeitem', { name: /src/ })
    expect(pasta).toHaveAttribute('aria-expanded', 'false')
    expect(pasta).toHaveAttribute('aria-level', '1')
  })

  it('abre pasta no clique e revela os filhos', async () => {
    stubApi()
    const user = userEvent.setup()
    renderAt('/explorer?project=spring-petclinic')

    await user.click(await screen.findByRole('treeitem', { name: /src/ }))

    expect(await screen.findByRole('treeitem', { name: /main/ })).toBeInTheDocument()
    expect(screen.getByRole('treeitem', { name: /src/ })).toHaveAttribute('aria-expanded', 'true')
  })

  it('navega por setas, abre e fecha pasta e sobe para a mae', async () => {
    stubApi()
    const user = userEvent.setup()
    renderAt('/explorer?project=spring-petclinic')

    const primeiro = await screen.findByRole('treeitem', { name: 'src' })
    primeiro.focus()
    expect(primeiro).toHaveFocus()

    await user.keyboard('{End}')
    expect(screen.getByRole('treeitem', { name: /build\.gradle/ })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('treeitem', { name: 'src' })).toHaveFocus()

    // Direita abre a pasta; de novo, desce para o primeiro filho.
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('treeitem', { name: 'src' })).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('treeitem', { name: 'main' })).toHaveFocus()

    // Esquerda numa pasta fechada sobe para a mae.
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('treeitem', { name: 'src' })).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('treeitem', { name: 'main' })).toHaveFocus()
  })

  it('so a linha ativa fica no caminho do Tab (roving tabindex)', async () => {
    stubApi()
    renderAt('/explorer?project=spring-petclinic')
    await screen.findByRole('tree')

    const tabbaveis = screen
      .getAllByRole('treeitem')
      .filter((i) => i.getAttribute('tabindex') === '0')
    expect(tabbaveis).toHaveLength(1)
  })
})

describe('abrir arquivo por URL (link de citacao)', () => {
  it('abre o arquivo, destaca a faixa citada e expande a arvore ate ele', async () => {
    stubApi()
    renderAt(
      `/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}&lines=12-14`,
    )

    // Conteudo carregado.
    expect(await screen.findByText('// linha 12')).toBeInTheDocument()

    // Faixa destacada: exatamente as linhas 12, 13 e 14.
    const destacadas = document.querySelectorAll('tr.bg-line-highlight')
    expect([...destacadas].map((tr) => tr.getAttribute('data-line'))).toEqual(['12', '13', '14'])

    // A arvore abriu ate o arquivo, senao ele ficaria escondido.
    expect(screen.getByRole('treeitem', { name: /Owner\.java/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('treeitem', { name: 'src' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('faixa de linha invalida na URL vira "sem destaque", nao tela quebrada', async () => {
    stubApi()
    renderAt(`/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}&lines=abc`)

    expect(await screen.findByText('// linha 1')).toBeInTheDocument()
    expect(document.querySelectorAll('tr.bg-line-highlight')).toHaveLength(0)
  })

  it('pede o conteudo pelo ID que corresponde ao caminho da URL', async () => {
    const fetchMock = stubApi()
    renderAt(`/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}`)
    await screen.findByText('// linha 1')

    const chamada = fetchMock.mock.calls.map(([u]) => urlOf(u)).find((u) => u.endsWith('/content'))
    expect(chamada).toBe('http://localhost:8080/api/projects/1/files/30/content')
  })

  it('caminho que nao esta no indice avisa em vez de ficar carregando', async () => {
    stubApi()
    renderAt('/explorer?project=spring-petclinic&file=src/nao/existe/Fantasma.java')

    expect(await screen.findByText('Este arquivo nao esta no indice.')).toBeInTheDocument()
  })

  it('sem arquivo na URL, mostra o estado vazio', async () => {
    stubApi()
    renderAt('/explorer?project=spring-petclinic')

    expect(await screen.findByText('Nenhum arquivo aberto.')).toBeInTheDocument()
  })
})

describe('visualizador', () => {
  it('numera as linhas e colore a sintaxe', async () => {
    stubApi(() =>
      Promise.resolve(
        json({ ...OWNER_CONTENT, content: 'class Owner {\n  int id;\n}', lineCount: 3 }),
      ),
    )
    renderAt(`/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}`)

    await screen.findByText('Owner')
    const linhas = document.querySelectorAll('tr[data-line]')
    expect(linhas).toHaveLength(3)
    // highlight.js aplica classe, nunca cor inline — e o que mantem a cor nos tokens do tema.
    expect(document.querySelector('.hljs-keyword')?.textContent).toBe('class')
    expect(document.querySelector('[style*="color"]')).toBeNull()
  })

  it('o painel de codigo e focavel por teclado', async () => {
    stubApi()
    renderAt(`/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}`)

    const painel = await screen.findByRole('group', { name: /Conteudo de/ })
    expect(painel).toHaveAttribute('tabindex', '0')
  })
})

describe('conteudo defasado', () => {
  it('avisa quando o hash do disco difere do indexado', async () => {
    stubApi(() =>
      Promise.resolve(
        json({
          ...OWNER_CONTENT,
          contentMayBeStale: true,
          currentContentHash: '51c10a6f38aa3dcc0000000000000000000000000000000000000000000000ff',
        }),
      ),
    )
    renderAt(`/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}`)

    // Pelo texto e nao por role: enquanto carrega existem outros role="status" na tela
    // ("Carregando projetos…"), e findByRole devolveria o primeiro.
    const texto = await screen.findByText(/mudou em disco depois de ter sido indexado/)
    const aviso = texto.closest('[role="status"]')
    expect(aviso).not.toBeNull()
    expect(aviso).toHaveTextContent('linhas citadas pelo chat')
    expect(aviso).toHaveTextContent('a5273cbccaf4')
    expect(aviso).toHaveTextContent('51c10a6f38aa')
  })

  it('nao avisa quando os hashes batem', async () => {
    stubApi()
    renderAt(`/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}`)
    await screen.findByText('// linha 1')

    expect(screen.queryByText(/mudou em disco/)).not.toBeInTheDocument()
  })
})

describe('erros do explorer', () => {
  function problem(status: number, title: string, detail: string) {
    return json({ type: 'about:blank', title, status, detail, instance: '/x' }, status)
  }

  it('410 explica que o arquivo sumiu e sugere o sync', async () => {
    stubApi(() =>
      Promise.resolve(
        problem(
          410,
          'Arquivo removido do disco',
          `O arquivo '${OWNER_PATH}' nao existe mais em disco.`,
        ),
      ),
    )
    renderAt(`/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}`)

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Arquivo removido do disco')
    expect(alerta).toHaveTextContent('nao existe mais em disco')
    expect(alerta).toHaveTextContent('rode o sync')
    expect(within(alerta).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('422 diz que o arquivo nao e exibivel e NAO oferece repetir', async () => {
    stubApi(() =>
      Promise.resolve(
        problem(422, 'Arquivo nao exibivel', 'O arquivo esta binario em disco agora.'),
      ),
    )
    renderAt(`/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}`)

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('Arquivo nao exibivel')
    expect(alerta).toHaveTextContent('binario')
    // Repetir seria mentira: na proxima tentativa ele continua binario.
    expect(within(alerta).queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })

  it.each([
    [404, 'Erro HTTP 404', /Arquivo nao encontrado/],
    [500, 'Erro HTTP 500', /erro interno/],
  ])('%i cai na mensagem generica', async (status, rotulo, mensagem) => {
    stubApi(() => Promise.resolve(problem(status, 'titulo da api', 'detalhe')))
    renderAt(`/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}`)

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(rotulo)
    expect(alerta).toHaveTextContent(mensagem)
  })

  it('o botao repetir refaz a chamada', async () => {
    let tentativas = 0
    stubApi(() => {
      tentativas += 1
      return Promise.resolve(
        tentativas === 1 ? problem(410, 'Arquivo removido do disco', 'sumiu') : json(OWNER_CONTENT),
      )
    })
    const user = userEvent.setup()
    renderAt(`/explorer?project=spring-petclinic&file=${encodeURIComponent(OWNER_PATH)}`)

    await user.click(await screen.findByRole('button', { name: 'Tentar de novo' }))

    await waitFor(() => {
      expect(screen.getByText('// linha 1')).toBeInTheDocument()
    })
    expect(tentativas).toBe(2)
  })
})

describe('projeto na URL', () => {
  it('abre o projeto pedido no ?project=, nao o primeiro da lista', async () => {
    const fetchMock = stubApi(() =>
      Promise.resolve(
        json({
          ...OWNER_CONTENT,
          fileId: 500,
          projectId: 2,
          path: 'README.md',
          language: 'Markdown',
        }),
      ),
    )
    renderAt('/explorer?project=Grim%C3%B3rio&file=README.md')

    await screen.findByRole('tree')
    const chamadas = fetchMock.mock.calls.map(([u]) => urlOf(u))
    expect(chamadas).toContain('http://localhost:8080/api/projects/2/files')
    // O conteudo vem do id do arquivo DAQUELE projeto, nao de um homonimo do outro.
    expect(chamadas).toContain('http://localhost:8080/api/projects/2/files/500/content')
  })

  it('o mesmo caminho em projetos diferentes abre arquivos diferentes', async () => {
    const fetchMock = stubApi()
    renderAt('/explorer?project=spring-petclinic&file=README.md')
    await screen.findByRole('tree')

    // No petclinic nao ha README.md nas fixtures, entao ele avisa em vez de abrir o do Grimorio.
    expect(await screen.findByText('Este arquivo nao esta no indice.')).toBeInTheDocument()
    expect(fetchMock.mock.calls.map(([u]) => urlOf(u))).not.toContain(
      'http://localhost:8080/api/projects/2/files/500/content',
    )
  })

  it('projeto desconhecido na URL avisa em vez de abrir outro', async () => {
    stubApi()
    renderAt('/explorer?project=sumido&file=README.md')

    expect(await screen.findByRole('alert')).toHaveTextContent('Nao existe projeto chamado')
  })

  it('escolher arquivo na arvore preserva o projeto na URL', async () => {
    const fetchMock = stubApi()
    const user = userEvent.setup()
    renderAt('/explorer?project=Grim%C3%B3rio')

    await user.click(await screen.findByRole('treeitem', { name: /README\.md/ }))

    const chamadas = fetchMock.mock.calls
      .map(([u]) => urlOf(u))
      .filter((u) => u.endsWith('/content'))
    expect(chamadas[0]).toContain('/projects/2/files/500/content')
  })
})
