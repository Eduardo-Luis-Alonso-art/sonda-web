import type { Citation } from '../api/types'
import { PROJECT_PARAM } from '../projects/useSelectedProject'
import type { LineRange } from './CodeViewer'

/**
 * URL do explorer: projeto, arquivo e, opcionalmente, faixa de linhas.
 *
 * Nada aqui é id. O arquivo vai por **caminho** porque `fileId` é recriado a cada sync (decisão do
 * prompt 6); o projeto vai por **nome** porque `indexed_repository.id`, ainda que estável entre
 * syncs, some se o banco for recriado — e porque `project=spring-petclinic` diz a quem recebe o
 * link o que ele abre, enquanto `project=1` não diz nada.
 *
 * O projeto é obrigatório desde que passou a haver mais de um: dois repositórios podem ter um
 * `README.md` cada, e sem o projeto na URL o link abriria o arquivo errado.
 */
export function explorerPath(
  projectName: string,
  filePath: string,
  range?: LineRange | null,
): string {
  const params = new URLSearchParams({ [PROJECT_PARAM]: projectName, file: filePath })
  if (range) {
    params.set(
      'lines',
      range.startLine === range.endLine
        ? String(range.startLine)
        : `${String(range.startLine)}-${String(range.endLine)}`,
    )
  }
  return `/explorer?${params.toString()}`
}

/** URL do explorer a partir de uma citação do chat, no projeto que respondeu a pergunta. */
export function explorerPathForCitation(projectName: string, citation: Citation): string {
  return explorerPath(projectName, citation.path, {
    startLine: citation.startLine,
    endLine: citation.endLine,
  })
}

/**
 * Lê `?lines=` de volta. Aceita `62-65` e `62`.
 *
 * Devolve null para qualquer coisa fora disso — a URL é editável à mão e compartilhável, então
 * `lines=abc`, `lines=0` ou `lines=9-2` têm que virar "sem destaque", nunca um estado quebrado.
 */
export function parseLineRange(raw: string | null): LineRange | null {
  if (raw === null) return null
  const match = /^(\d+)(?:-(\d+))?$/.exec(raw.trim())
  if (!match) return null

  const startLine = Number(match[1])
  const endLine = match[2] === undefined ? startLine : Number(match[2])
  if (!Number.isFinite(startLine) || startLine < 1) return null
  if (!Number.isFinite(endLine) || endLine < startLine) return null
  return { startLine, endLine }
}
