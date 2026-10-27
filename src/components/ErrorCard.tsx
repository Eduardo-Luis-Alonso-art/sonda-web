import type { ApiError } from '../api/errors'

/**
 * Falha de chamada. Faixa lateral vermelha, mensagem em pt-BR e, abaixo, o `detail` tecnico do
 * problem+json — util para depurar sem obrigar ninguem a abrir o DevTools.
 */
export function ErrorCard({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="bg-surface border-line border-l-danger flex flex-col gap-3 rounded-lg border border-l-4 p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-danger border-danger/40 bg-danger/10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
          <span aria-hidden="true">!</span>
          {error.status === null ? 'Falha de conexao' : `Erro HTTP ${String(error.status)}`}
        </span>
      </div>
      <p className="text-ink text-sm leading-relaxed">{error.message}</p>
      {error.technicalDetail !== null && (
        <p className="text-muted font-mono text-xs break-words">{error.technicalDetail}</p>
      )}
      {onRetry && (
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
