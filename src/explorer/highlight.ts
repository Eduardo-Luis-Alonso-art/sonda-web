import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import dos from 'highlight.js/lib/languages/dos'
import go from 'highlight.js/lib/languages/go'
import groovy from 'highlight.js/lib/languages/groovy'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import kotlin from 'highlight.js/lib/languages/kotlin'
import markdown from 'highlight.js/lib/languages/markdown'
import properties from 'highlight.js/lib/languages/properties'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'

/*
 * highlight.js em vez de Shiki. Medido com esbuild, mesmo conjunto de linguagens:
 *   highlight.js  98 KB  ->  27 KB gzip
 *   Shiki        991 KB  -> 314 KB gzip  + onig.wasm de 466 KB
 * Dezesseis vezes maior para mostrar um arquivo por vez. E, decisivo aqui: o highlight.js emite
 * CLASSES CSS (`hljs-keyword`), sem nenhum hex embutido — conferido na saida real. Assim as cores
 * continuam vindo dos tokens do tema, como manda a regra do projeto; o Shiki pinta `style="color:#..."`
 * a partir do tema dele.
 */
const LANGUAGES = {
  bash,
  css,
  dos,
  go,
  groovy,
  java,
  javascript,
  json,
  kotlin,
  markdown,
  properties,
  python,
  rust,
  scss,
  sql,
  typescript,
  xml,
  yaml,
}

for (const [name, definition] of Object.entries(LANGUAGES)) {
  hljs.registerLanguage(name, definition)
}

/**
 * Da linguagem que a API devolve para a do highlight.js.
 *
 * As chaves são exatamente os valores que `RepositoryScanner.LANGUAGE_BY_EXTENSION` pode produzir
 * no `sonda-api` — não um palpite. `Text` e qualquer desconhecida caem em texto puro.
 */
const LANGUAGE_BY_API_NAME: Record<string, string> = {
  Java: 'java',
  Kotlin: 'kotlin',
  Groovy: 'groovy',
  // O Gradle do petclinic é Groovy; o highlight.js não tem gramática própria de Gradle.
  Gradle: 'groovy',
  XML: 'xml',
  // No highlight.js o HTML é atendido pela gramática `xml`.
  HTML: 'xml',
  CSS: 'css',
  SCSS: 'scss',
  JavaScript: 'javascript',
  TypeScript: 'typescript',
  JSON: 'json',
  YAML: 'yaml',
  Properties: 'properties',
  SQL: 'sql',
  Markdown: 'markdown',
  Shell: 'bash',
  Batch: 'dos',
  Python: 'python',
  Go: 'go',
  Rust: 'rust',
}

/** A linguagem do highlight.js, ou null quando é para mostrar sem colorir. */
export function hljsLanguageFor(apiLanguage: string | null): string | null {
  if (apiLanguage === null) return null
  return LANGUAGE_BY_API_NAME[apiLanguage] ?? null
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Divide o HTML colorido em uma linha por item, **reabrindo as tags** em cada quebra.
 *
 * Isto não é firula: o highlight.js devolve um HTML único onde um `<span>` atravessa várias linhas
 * — um comentário de bloco Java, uma string com quebra. Cortar esse HTML no `\n` sem tratar as tags
 * produziria linhas com `<span>` aberto e nunca fechado, e o navegador "consertaria" vazando a cor
 * do comentário para o resto do arquivo.
 *
 * O varredor mantém a pilha de spans abertos: ao achar uma quebra, fecha todos, encerra a linha e
 * recomeça a próxima reabrindo os mesmos.
 */
export function splitHighlightedLines(html: string): string[] {
  const lines: string[] = []
  const openTags: string[] = []
  let current = ''
  let i = 0

  const closeAll = () => openTags.map(() => '</span>').join('')
  const reopenAll = () => openTags.join('')

  while (i < html.length) {
    if (html.startsWith('</span>', i)) {
      openTags.pop()
      current += '</span>'
      i += 7
      continue
    }
    if (html.startsWith('<span', i)) {
      const end = html.indexOf('>', i)
      // `<span` sem `>` só aconteceria com HTML truncado; trata como texto e segue.
      if (end === -1) {
        current += html.slice(i)
        break
      }
      const tag = html.slice(i, end + 1)
      openTags.push(tag)
      current += tag
      i = end + 1
      continue
    }
    // `html[i]` e `string | undefined` sob noUncheckedIndexedAccess; i < length garante o valor.
    const ch = html.charAt(i)
    if (ch === '\n') {
      lines.push(current + closeAll())
      current = reopenAll()
      i += 1
      continue
    }
    current += ch
    i += 1
  }
  lines.push(current + closeAll())
  return lines
}

/**
 * Conteúdo em linhas de HTML já colorido e escapado.
 *
 * Sem linguagem conhecida, ou se a gramática falhar, cai em texto escapado — nunca em HTML cru:
 * o conteúdo vem de um arquivo do disco e vai para `dangerouslySetInnerHTML`.
 */
export function highlightToLines(content: string, apiLanguage: string | null): string[] {
  const language = hljsLanguageFor(apiLanguage)
  if (language === null) {
    return content.split('\n').map(escapeHtml)
  }
  try {
    const { value } = hljs.highlight(content, { language, ignoreIllegals: true })
    return splitHighlightedLines(value)
  } catch {
    return content.split('\n').map(escapeHtml)
  }
}
