import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import type { Project } from '../api/types'
import { resolveProject, type ProjectResolution } from './projectResolution'

/** Nome do parâmetro de projeto na URL, usado pelas duas telas e pelos links de citação. */
export const PROJECT_PARAM = 'project'

/**
 * O projeto ativo, guardado na URL (`?project=<nome>`) e não em `useState`.
 *
 * Na URL porque isso resolve quatro coisas de uma vez: o F5 não volta para o projeto errado, o
 * endereço pode ser colado para outra pessoa, o link de citação consegue apontar para um projeto
 * diferente do que está aberto, e chat e explorer concordam sobre qual projeto é o ativo sem
 * precisar de estado global entre eles.
 *
 * Sem `?project=`, cai no primeiro da lista — que é o comportamento que o app tinha quando só
 * havia um projeto, então links antigos continuam abrindo algo coerente.
 */
export function useSelectedProject(projects: Project[] | null) {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedName = searchParams.get(PROJECT_PARAM)

  const resolution: ProjectResolution | null =
    projects === null ? null : resolveProject(projects, requestedName)

  const select = useCallback(
    (project: Project) => {
      const next = new URLSearchParams(searchParams)
      next.set(PROJECT_PARAM, project.name)
      // Trocar de projeto apaga o arquivo aberto: um caminho do projeto anterior não quer dizer
      // nada no novo, e manter o parâmetro abriria "arquivo não está no índice" sem motivo.
      next.delete('file')
      next.delete('lines')
      setSearchParams(next, { replace: false })
    },
    [searchParams, setSearchParams],
  )

  return {
    resolution,
    /** O projeto ativo, ou null enquanto carrega / quando o nome da URL não resolve. */
    project: resolution?.kind === 'found' ? resolution.project : null,
    select,
  }
}
