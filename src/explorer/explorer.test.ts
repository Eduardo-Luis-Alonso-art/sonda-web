import { describe, expect, it } from 'vitest'
import type { IndexedFileSummary } from '../api/types'
import { explorerPath, explorerPathForCitation, parseLineRange } from './explorerLink'
import { highlightToLines, hljsLanguageFor, splitHighlightedLines } from './highlight'
import { ancestorFolders, buildFileTree, visibleRows } from './tree'

function file(path: string, language: string | null = null): IndexedFileSummary {
  return { id: path.length, path, language, chunkCount: 1, indexedAt: '2026-10-26T17:53:51Z' }
}

describe('buildFileTree', () => {
  it('agrupa a lista plana por segmento de caminho', () => {
    const tree = buildFileTree([
      file('src/main/App.java', 'Java'),
      file('src/main/Owner.java', 'Java'),
      file('README.md', 'Markdown'),
    ])

    expect(tree.map((node) => node.name)).toEqual(['src', 'README.md'])
    const src = tree[0]
    expect(src?.kind).toBe('folder')
    if (src?.kind !== 'folder') throw new Error('esperava pasta')
    const main = src.children[0]
    if (main?.kind !== 'folder') throw new Error('esperava pasta')
    expect(main.path).toBe('src/main')
    expect(main.children.map((node) => node.name)).toEqual(['App.java', 'Owner.java'])
  })

  it('poe pastas antes de arquivos no mesmo nivel', () => {
    const tree = buildFileTree([file('zzz/a.java'), file('aaa.java')])

    expect(tree.map((node) => `${node.kind}:${node.name}`)).toEqual(['folder:zzz', 'file:aaa.java'])
  })

  it('nao duplica pasta compartilhada por varios arquivos', () => {
    const tree = buildFileTree([file('a/b/1.java'), file('a/b/2.java'), file('a/c/3.java')])

    expect(tree).toHaveLength(1)
    const a = tree[0]
    if (a?.kind !== 'folder') throw new Error('esperava pasta')
    expect(a.children.map((node) => node.name)).toEqual(['b', 'c'])
  })

  it('lida com arquivo na raiz e com lista vazia', () => {
    expect(buildFileTree([])).toEqual([])
    expect(buildFileTree([file('pom.xml')]).map((node) => node.kind)).toEqual(['file'])
  })
})

describe('visibleRows', () => {
  const tree = buildFileTree([file('a/b/deep.java'), file('a/top.java'), file('raiz.md')])

  it('esconde o que esta dentro de pasta recolhida', () => {
    const rows = visibleRows(tree, new Set())

    expect(rows.map((row) => row.node.path)).toEqual(['a', 'raiz.md'])
  })

  it('revela um nivel por vez conforme as pastas abrem', () => {
    const umNivel = visibleRows(tree, new Set(['a']))
    expect(umNivel.map((row) => row.node.path)).toEqual(['a', 'a/b', 'a/top.java', 'raiz.md'])

    const doisNiveis = visibleRows(tree, new Set(['a', 'a/b']))
    expect(doisNiveis.map((row) => row.node.path)).toEqual([
      'a',
      'a/b',
      'a/b/deep.java',
      'a/top.java',
      'raiz.md',
    ])
  })

  it('devolve a profundidade de cada linha, para a indentacao e o aria-level', () => {
    const rows = visibleRows(tree, new Set(['a', 'a/b']))

    expect(rows.map((row) => row.depth)).toEqual([0, 1, 2, 1, 0])
  })
})

describe('ancestorFolders', () => {
  it('lista as pastas que precisam abrir para revelar o arquivo', () => {
    expect(ancestorFolders('src/main/java/App.java')).toEqual(['src', 'src/main', 'src/main/java'])
  })

  it('arquivo na raiz nao tem ancestral', () => {
    expect(ancestorFolders('pom.xml')).toEqual([])
  })
})

describe('explorerPath', () => {
  it('monta a URL com projeto, caminho e faixa de linhas', () => {
    expect(explorerPath('spring-petclinic', 'src/A.java', { startLine: 62, endLine: 65 })).toBe(
      '/explorer?project=spring-petclinic&file=src%2FA.java&lines=62-65',
    )
  })

  it('faixa de uma linha so sai sem o hifen', () => {
    expect(explorerPath('demo', 'a.java', { startLine: 7, endLine: 7 })).toBe(
      '/explorer?project=demo&file=a.java&lines=7',
    )
  })

  it('sem faixa, nao poe o parametro', () => {
    expect(explorerPath('demo', 'a.java')).toBe('/explorer?project=demo&file=a.java')
  })

  it('escapa nome de projeto com acento', () => {
    // O nome vem do nome da pasta; "Grimorio" com acento e um caso real registrado na API.
    expect(explorerPath('Grimório', 'src/App.tsx')).toBe(
      '/explorer?project=Grim%C3%B3rio&file=src%2FApp.tsx',
    )
  })

  it('usa CAMINHO e NOME, nunca ids — os dois mudam quando o registro e reconstruido', () => {
    const url = explorerPathForCitation('spring-petclinic', {
      sourceId: 'S1',
      path: 'src/main/java/Owner.java',
      startLine: 62,
      endLine: 65,
    })

    expect(url).toContain('project=spring-petclinic')
    expect(url).toContain('file=src%2Fmain%2Fjava%2FOwner.java')
    expect(url).not.toMatch(/fileId|projectId|id=/)
  })
})

describe('parseLineRange', () => {
  it('le faixa e linha unica', () => {
    expect(parseLineRange('62-65')).toEqual({ startLine: 62, endLine: 65 })
    expect(parseLineRange('7')).toEqual({ startLine: 7, endLine: 7 })
  })

  it.each([null, '', 'abc', '0', '0-5', '9-2', '-5', '1-', '1.5', '1 2', '62-65x'])(
    'recusa %p — a URL e editavel a mao, entao lixo vira "sem destaque"',
    (entrada) => {
      expect(parseLineRange(entrada)).toBeNull()
    },
  )
})

describe('hljsLanguageFor', () => {
  it('traduz os nomes que a API realmente emite', () => {
    expect(hljsLanguageFor('Java')).toBe('java')
    expect(hljsLanguageFor('HTML')).toBe('xml')
    expect(hljsLanguageFor('Gradle')).toBe('groovy')
    expect(hljsLanguageFor('Batch')).toBe('dos')
  })

  it('sem linguagem, ou linguagem sem gramatica, cai em texto puro', () => {
    expect(hljsLanguageFor(null)).toBeNull()
    expect(hljsLanguageFor('Text')).toBeNull()
    expect(hljsLanguageFor('Brainfuck')).toBeNull()
  })
})

describe('splitHighlightedLines', () => {
  it('fecha e reabre o span que atravessa a quebra de linha', () => {
    const lines = splitHighlightedLines('<span class="c">a\nb</span>')

    expect(lines).toEqual(['<span class="c">a</span>', '<span class="c">b</span>'])
  })

  it('mantem os spans balanceados em aninhamento', () => {
    const lines = splitHighlightedLines('<span class="a"><span class="b">x\ny</span>z</span>')

    expect(lines).toEqual([
      '<span class="a"><span class="b">x</span></span>',
      '<span class="a"><span class="b">y</span>z</span>',
    ])
  })

  it('texto sem span passa intacto', () => {
    expect(splitHighlightedLines('um\ndois')).toEqual(['um', 'dois'])
  })
})

describe('highlightToLines', () => {
  it('colore Java e devolve uma linha por linha do arquivo', () => {
    const lines = highlightToLines('class A {\n  int x = 1;\n}\n', 'Java')

    // "\n" final nao cria linha extra de conteudo alem da vazia do fim.
    expect(lines).toHaveLength(4)
    expect(lines[0]).toContain('hljs-keyword')
    expect(lines[0]).toContain('class')
  })

  it('um comentario de bloco nao vaza a cor para as linhas seguintes', () => {
    const lines = highlightToLines('/*\n * nota\n */\nclass A {}', 'Java')

    // Toda linha fecha o que abriu: sem isso, o navegador "consertaria" o HTML e pintaria o
    // resto do arquivo com a cor de comentario.
    for (const line of lines) {
      const abertos = (line.match(/<span/g) ?? []).length
      const fechados = (line.match(/<\/span>/g) ?? []).length
      expect(abertos).toBe(fechados)
    }
  })

  it('sem linguagem, escapa o conteudo em vez de injetar HTML cru', () => {
    const lines = highlightToLines('<script>alert(1)</script>', null)

    expect(lines[0]).toBe('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(lines[0]).not.toContain('<script>')
  })

  it('conteudo vazio devolve uma linha vazia, nao zero linhas', () => {
    expect(highlightToLines('', 'Java')).toEqual([''])
  })
})
