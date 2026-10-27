import type { ChatResponse, NoEvidenceReason } from '../api/types'
import { SearchQueryList } from './SearchQueryList'
import { SourceList } from './SourceList'
import { StatementList } from './StatementList'
import { StatusBadge } from './StatusBadge'
import { UsageFooter } from './UsageFooter'

const NO_EVIDENCE_EXPLANATION: Record<NoEvidenceReason, string> = {
  BELOW_SIMILARITY_THRESHOLD:
    'Nenhum trecho do codigo indexado passou do limiar de similaridade. O modelo de resposta nao foi chamado — preferimos nao responder a inventar.',
  MODEL_FOUND_NO_EVIDENCE:
    'Havia trechos parecidos no codigo, mas nenhum deles responde a pergunta. O modelo foi chamado e disse que nao encontrou evidencia.',
}

/**
 * Uma resposta da Sonda.
 *
 * Diferenca visual ANSWERED x NO_EVIDENCE, em tres sinais somados (nunca so a cor):
 *   - pastilha de status com rotulo e glifo proprios;
 *   - faixa lateral esquerda verde (sucesso) ou ambar (aviso);
 *   - em NO_EVIDENCE, um paragrafo explicando POR QUE nao houve resposta, e nenhuma citacao.
 */
export function AnswerCard({
  response,
  projectName,
}: {
  response: ChatResponse
  /**
   * Projeto dono desta resposta, resolvido a partir de `response.repositoryId` — e nao o projeto
   * selecionado agora. E ele que vai no link de cada citacao, para o explorer abrir no projeto
   * que de fato respondeu, mesmo que a selecao tenha mudado depois.
   */
  projectName: string | null
}) {
  const answered = response.status === 'ANSWERED'
  return (
    <div
      className={
        answered
          ? 'bg-surface border-line border-l-success flex flex-col gap-4 rounded-lg border border-l-4 p-4 sm:p-5'
          : 'bg-surface border-line border-l-warning flex flex-col gap-4 rounded-lg border border-l-4 p-4 sm:p-5'
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={response.status} />
        {answered && response.uncitedStatements > 0 && (
          <span className="text-warning text-xs">
            {response.uncitedStatements === 1
              ? '1 afirmacao sem citacao'
              : `${String(response.uncitedStatements)} afirmacoes sem citacao`}
          </span>
        )}
      </div>

      {!answered && response.noEvidenceReason !== null && (
        <p className="text-muted text-sm leading-relaxed">
          {NO_EVIDENCE_EXPLANATION[response.noEvidenceReason]}
        </p>
      )}

      <StatementList statements={response.statements} projectName={projectName} />

      {answered && <SearchQueryList queries={response.searchQueries} />}

      <SourceList sources={response.sources} />
      <UsageFooter usage={response.usage} durationMs={response.durationMs} />
    </div>
  )
}
