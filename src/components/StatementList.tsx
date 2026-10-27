import type { Statement } from '../api/types'
import { CitationChip } from './CitationChip'

/**
 * A resposta renderizada por afirmacao, cada uma com as suas citacoes logo abaixo.
 *
 * Preferimos isto a imprimir o campo `answer` cru: `answer` traz marcadores `[Sn: caminho:linhas]`
 * embutidos no meio do texto, que atrapalham a leitura. `statements` e exatamente o mesmo
 * conteudo ja separado, com as citacoes estruturadas — o campo que a API criou para o frontend.
 *
 * Afirmacao sem citacao e marcada explicitamente: em ANSWERED isso e um defeito que o usuario
 * tem o direito de ver, nao algo para esconder.
 */
export function StatementList({
  statements,
  projectName,
}: {
  statements: Statement[]
  /** Projeto dono da resposta; vai no link de cada citacao. */
  projectName: string | null
}) {
  return (
    <ol className="flex flex-col gap-4">
      {statements.map((statement, index) => (
        <li key={`${String(index)}-${statement.text.slice(0, 32)}`} className="flex flex-col gap-2">
          <p className="text-ink leading-relaxed">{statement.text}</p>
          {statement.citations.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {statement.citations.map((citation, citationIndex) => (
                <li
                  key={`${citation.sourceId}-${String(citation.startLine)}-${String(citationIndex)}`}
                >
                  <CitationChip citation={citation} projectName={projectName} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted text-xs">Sem citacao de codigo para esta afirmacao.</p>
          )}
        </li>
      ))}
    </ol>
  )
}
