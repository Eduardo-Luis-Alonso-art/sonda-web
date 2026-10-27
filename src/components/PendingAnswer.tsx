/**
 * Espera da resposta. A chamada e sincrona e lenta — medido 2,5 s a 15,7 s contra o
 * spring-petclinic — entao um spinner mudo nao basta: mostramos o tempo decorrido para que uma
 * espera longa seja visivelmente progresso e nao travamento.
 *
 * Componente puro: quem conta o tempo e o `useElapsedMs`. Assim ele e testavel e a pagina /ui
 * consegue mostrar o estado num instante fixo.
 */
export function PendingAnswer({ elapsedMs }: { elapsedMs: number }) {
  const seconds = Math.floor(elapsedMs / 1000)
  return (
    <div
      role="status"
      className="bg-surface border-line border-l-accent flex flex-col gap-3 rounded-lg border border-l-4 p-4 sm:p-5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="border-line border-t-accent size-4 animate-spin rounded-full border-2"
        />
        <p className="text-ink text-sm">
          Procurando evidencia no codigo indexado…{' '}
          <span className="text-muted font-mono">{seconds}s</span>
        </p>
      </div>
      <p className="text-muted text-xs">
        Sao duas chamadas ao modelo (reescrita da busca e resposta). Normalmente leva de 3 a 16
        segundos.
      </p>
    </div>
  )
}
