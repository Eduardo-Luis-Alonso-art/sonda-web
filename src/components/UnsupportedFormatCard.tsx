/**
 * Troca gravada num formato que esta versao da interface nao sabe ler.
 *
 * Por que nao simplesmente esconder a troca: a conversa ficaria com buracos sem explicacao, e a
 * pergunta em si continua sendo informacao util. Por que nao tentar renderizar assim mesmo: o
 * contrato de `/chat` ja mudou uma vez (prompt 8, `searchQuery` -> `searchQueries`), e desenhar
 * campos que podem ter mudado de lugar daria tela quebrada ou, pior, dado errado com cara de
 * certo.
 *
 * Cinza neutro, nao vermelho: nao e erro de ninguem, e o usuario nao tem o que consertar aqui.
 */
export function UnsupportedFormatCard({ responseFormat }: { responseFormat: number | null }) {
  return (
    <div className="bg-surface border-line border-l-muted flex flex-col gap-2 rounded-lg border border-l-4 p-4 sm:p-5">
      <span className="text-muted border-line bg-line/40 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
        <span aria-hidden="true">?</span>
        Resposta em formato nao suportado
      </span>
      <p className="text-ink text-sm leading-relaxed">
        Esta troca foi gravada num formato de resposta
        {responseFormat === null ? '' : ` (versao ${String(responseFormat)})`} que esta versao da
        interface nao sabe exibir.
      </p>
      <p className="text-muted text-xs">
        A pergunta continua no historico. Atualize o sonda-web para ver a resposta.
      </p>
    </div>
  )
}
