import { Link } from 'react-router'
import type { Citation } from '../api/types'
import { explorerPathForCitation } from '../explorer/explorerLink'
import { lineRangeLabel } from './lineRange'

/** Ultimo segmento do caminho — o nome do arquivo e o que identifica a citacao de relance. */
function fileName(path: string): string {
  const parts = path.split('/')
  return parts[parts.length - 1] ?? path
}

/**
 * Uma citacao clicavel: leva ao explorer no projeto, arquivo e faixa de linha citados.
 *
 * O projeto vem de quem respondeu a pergunta, nao do que esta selecionado agora — e por isso que
 * ele e passado de cima, desde o `AnswerCard`, resolvido a partir do `repositoryId` da resposta.
 * Com dois repositorios registrados, dois arquivos podem ter o mesmo caminho relativo, e um link
 * sem projeto abriria o errado.
 *
 * E um `Link` de verdade, nao um `div` com `onClick`: ganha de graca o "abrir em nova aba" do
 * botao do meio, o menu de contexto, o copiar endereco e a navegacao por teclado — e o leitor de
 * tela o anuncia como link. O `aria-label` descreve o destino por extenso, porque o texto visivel
 * ("Owner.java:62-65") nao diz o que acontece ao ativar.
 *
 * Sem projeto resolvido (lista ainda carregando, ou id desconhecido) a pastilha continua
 * aparecendo, so que sem link: perder a citacao seria pior do que perder o clique.
 */
export function CitationChip({
  citation,
  projectName,
}: {
  citation: Citation
  projectName: string | null
}) {
  const lines = lineRangeLabel(citation)
  const conteudo = (
    <>
      <span className="text-ink">
        {fileName(citation.path)}
        <span className="text-accent">:{lines}</span>
      </span>
      <span className="text-muted break-all">{citation.path}</span>
    </>
  )
  const classeBase =
    'border-line bg-canvas inline-flex max-w-full flex-col gap-0.5 rounded-md border px-2 py-1 font-mono text-xs'

  if (projectName === null) {
    return <span className={classeBase}>{conteudo}</span>
  }

  return (
    <Link
      to={explorerPathForCitation(projectName, citation)}
      aria-label={`Abrir ${citation.path}, linhas ${lines}, do projeto ${projectName}, no explorer de arquivos`}
      className={`${classeBase} hover:border-accent`}
    >
      {conteudo}
    </Link>
  )
}
