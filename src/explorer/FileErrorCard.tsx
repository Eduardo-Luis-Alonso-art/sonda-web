import type { ApiError } from '../api/errors'
import { messageForFileStatus } from '../api/errors'

/**
 * Falha ao abrir um arquivo, tratada por código em vez de uma mensagem única.
 *
 * Os três casos pedem reações diferentes do usuário, e juntá-los num "erro ao carregar" genérico
 * jogaria esse trabalho de volta para ele:
 *   410 — o arquivo existia e sumiu: tem ação clara, rodar o sync.
 *   422 — o arquivo está lá mas não é exibível (binário, não-UTF-8, acima de 2 MB): não há o que
 *         fazer na interface, e dizer "tente de novo" seria mentira.
 *   404/500/rede — genérico, com repetir.
 */
export function FileErrorCard({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  const gone = error.status === 410
  const notDisplayable = error.status === 422

  const stripe = gone ? 'border-l-warning' : notDisplayable ? 'border-l-muted' : 'border-l-danger'
  const badge = gone
    ? 'text-warning border-warning/40 bg-warning/10'
    : notDisplayable
      ? 'text-muted border-line bg-line/40'
      : 'text-danger border-danger/40 bg-danger/10'
  const label = gone
    ? 'Arquivo removido do disco'
    : notDisplayable
      ? 'Arquivo nao exibivel'
      : error.status === null
        ? 'Falha de conexao'
        : `Erro HTTP ${String(error.status)}`

  return (
    <div
      role="alert"
      className={`bg-surface border-line flex flex-col gap-3 rounded-lg border border-l-4 p-4 ${stripe}`}
    >
      <span
        className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${badge}`}
      >
        <span aria-hidden="true">{gone ? '!' : notDisplayable ? '∅' : '!'}</span>
        {label}
      </span>

      <p className="text-ink text-sm leading-relaxed">{messageForFileStatus(error.status)}</p>

      {gone && (
        <p className="text-muted text-xs">
          Ate o indice ser atualizado, este arquivo continua listado e as citacoes do chat ainda
          apontam para ele.
        </p>
      )}

      {error.technicalDetail !== null && (
        <p className="text-muted font-mono text-xs break-words">{error.technicalDetail}</p>
      )}

      {/* Repetir so faz sentido quando a causa pode ter passado. Num 422 o arquivo seguira
          binario/grande demais na proxima tentativa. */}
      {onRetry && !notDisplayable && (
        <div>
          <button
            type="button"
            onClick={onRetry}
            className="border-line text-ink hover:border-accent hover:text-accent rounded-md border px-3 py-1.5 text-sm"
          >
            Tentar de novo
          </button>
        </div>
      )}
    </div>
  )
}
