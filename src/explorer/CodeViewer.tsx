import { useEffect, useMemo, useRef } from 'react'
import type { FileContent } from '../api/types'
import { highlightToLines } from './highlight'

/** Faixa de linhas destacada, 1-based e inclusiva nas duas pontas, como vem da citação. */
export interface LineRange {
  startLine: number
  endLine: number
}

/**
 * Visualizador de código: numeração, coloração e destaque da faixa citada.
 *
 * O destaque não é só um fundo: a faixa citada recebe fundo `line-highlight` **e** uma barra
 * lateral em `accent`. O fundo sozinho dá 1,32:1 contra o painel — perceptível, mas fraco demais
 * para ser o único sinal.
 *
 * Teclado: o painel inteiro é focável (`tabIndex={0}`), então ↑/↓/PgUp/PgDn/Home/End rolam o
 * código sem exigir mouse — é o comportamento nativo de um contêiner rolável focado. O `role` fica
 * em `group` com rótulo: `region` faria o leitor de tela anunciar um marco a cada arquivo aberto.
 */
export function CodeViewer({
  file,
  highlightRange,
}: {
  file: FileContent
  highlightRange: LineRange | null
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const firstHighlightedRef = useRef<HTMLTableRowElement>(null)

  // Colorir é caro e não depende do destaque: refazer a cada mudança de faixa seria desperdício.
  const lines = useMemo(
    () => highlightToLines(file.content, file.language),
    [file.content, file.language],
  )

  useEffect(() => {
    if (highlightRange === null) {
      containerRef.current?.scrollTo({ top: 0 })
      return
    }
    // 'center' para a faixa não encostar no topo do painel e ficar sem contexto em volta.
    firstHighlightedRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' })
  }, [highlightRange, file.fileId])

  const gutterWidth = `${String(Math.max(2, String(lines.length).length))}ch`

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-label={`Conteudo de ${file.path}`}
      className="bg-surface border-line min-h-0 flex-1 overflow-auto rounded-lg border"
    >
      <table className="w-full border-separate border-spacing-0 font-mono text-xs leading-relaxed">
        <caption className="sr-only">
          {file.path}, {file.lineCount} linhas
          {highlightRange &&
            `, linhas ${String(highlightRange.startLine)} a ${String(highlightRange.endLine)} destacadas`}
        </caption>
        <tbody>
          {lines.map((html, index) => {
            const lineNumber = index + 1
            const highlighted =
              highlightRange !== null &&
              lineNumber >= highlightRange.startLine &&
              lineNumber <= highlightRange.endLine
            const isFirstHighlighted = highlighted && lineNumber === highlightRange.startLine
            return (
              <tr
                key={lineNumber}
                ref={isFirstHighlighted ? firstHighlightedRef : undefined}
                data-line={lineNumber}
                className={highlighted ? 'bg-line-highlight' : undefined}
              >
                <td
                  style={{ width: gutterWidth }}
                  className={
                    highlighted
                      ? 'text-muted border-accent sticky left-0 border-l-2 bg-inherit px-3 text-right align-top select-none'
                      : 'text-muted border-line/0 sticky left-0 border-l-2 bg-inherit px-3 text-right align-top select-none'
                  }
                >
                  {lineNumber}
                </td>
                <td className="text-ink w-full pr-4 align-top whitespace-pre">
                  {/* O HTML vem do highlight.js, que escapa o conteudo; sem linguagem conhecida o
                      texto e escapado a mao. Nunca HTML cru do arquivo. */}
                  <span dangerouslySetInnerHTML={{ __html: html === '' ? '&nbsp;' : html }} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
