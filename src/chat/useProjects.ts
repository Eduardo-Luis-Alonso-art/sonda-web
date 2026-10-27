import { useEffect, useState } from 'react'
import { listProjects } from '../api/client'
import { ApiError } from '../api/errors'
import type { Project } from '../api/types'

/**
 * Carrega `GET /api/projects` uma vez. Hoje a API registra sozinha um unico repositorio no boot,
 * entao nao ha seletor de projeto: pegamos o primeiro.
 */
export function useProjects() {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [error, setError] = useState<ApiError | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    listProjects()
      .then((loaded) => {
        if (!controller.signal.aborted) setProjects(loaded)
      })
      .catch((caught: unknown) => {
        if (controller.signal.aborted) return
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError('Falha inesperada ao listar projetos.', { cause: caught }),
        )
      })
    return () => {
      controller.abort()
    }
  }, [])

  return { projects, error, loading: projects === null && error === null }
}
