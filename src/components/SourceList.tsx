import type { Source } from '../api/types'
import { lineRangeLabel } from './lineRange'

/**
 * Todo o contexto que foi enviado ao modelo, com a similaridade de cada bloco. Fechado por
 * padrao: e informacao de auditoria, nao a resposta. `<details>` nativo para ganhar
 * teclado (Enter/Espaco) e estado expandido acessivel de graca.
 */
export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null
  return (
    <details className="border-line border-t pt-3">
      <summary className="text-muted hover:text-ink cursor-pointer rounded text-xs">
        {sources.length === 1
          ? '1 bloco de codigo enviado ao modelo'
          : `${String(sources.length)} blocos de codigo enviados ao modelo`}
      </summary>
      <ul className="mt-3 flex flex-col gap-2">
        {sources.map((source) => (
          <li
            key={source.sourceId}
            className="flex flex-wrap items-baseline gap-x-2 font-mono text-xs"
          >
            <span className="text-accent">{source.sourceId}</span>
            <span className="text-ink break-all">
              {source.path}:{lineRangeLabel(source)}
            </span>
            <span className="text-muted">similaridade {source.similarity.toFixed(4)}</span>
          </li>
        ))}
      </ul>
    </details>
  )
}
