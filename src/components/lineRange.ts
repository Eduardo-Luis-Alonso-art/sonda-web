import type { Citation } from '../api/types'

/**
 * `startLine-endLine`, ou so a linha quando a faixa tem uma linha unica.
 *
 * Em arquivo proprio, e nao junto do CitationChip, porque um modulo que exporta componente e
 * funcao ao mesmo tempo quebra o fast refresh do Vite.
 */
export function lineRangeLabel(range: Pick<Citation, 'startLine' | 'endLine'>): string {
  return range.startLine === range.endLine
    ? String(range.startLine)
    : `${String(range.startLine)}-${String(range.endLine)}`
}
