/**
 * Aviso de que o arquivo em disco mudou depois de indexado.
 *
 * Importa mais do que parece: as citações do chat apontam para linhas do conteúdo **indexado**. Se
 * o arquivo mudou, a linha 62 de hoje pode não ser a linha 62 que sustentou a afirmação. Por isso
 * o aviso fala das citações, e não só "o arquivo mudou".
 *
 * Fundo próprio (`stale-surface`, warning a 10%) em vez de só texto colorido: o texto em `warning`
 * fica 7,08:1 em cima dele, e a faixa se distingue do painel sem depender de o usuário notar a cor
 * de uma palavra.
 */
export function StaleContentBanner({
  indexedHash,
  currentHash,
}: {
  indexedHash: string
  currentHash: string
}) {
  return (
    <div
      role="status"
      className="bg-stale-surface border-warning/40 text-warning flex flex-col gap-1 rounded-md border px-3 py-2 text-xs"
    >
      <p className="flex items-center gap-2 font-medium">
        <span aria-hidden="true">!</span>
        Este arquivo mudou em disco depois de ter sido indexado.
      </p>
      <p className="text-muted">
        O conteudo abaixo e o do disco agora. As linhas citadas pelo chat se referem a versao
        indexada e podem ter se deslocado — rode o sync para reindexar.
      </p>
      <p className="text-muted font-mono">
        indexado {indexedHash.slice(0, 12)} · atual {currentHash.slice(0, 12)}
      </p>
    </div>
  )
}
