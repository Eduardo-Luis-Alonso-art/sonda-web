import { useCallback, useEffect, useState } from 'react'
import { listFiles, readFileContent } from '../api/client'
import { ApiError } from '../api/errors'
import type { FileContent, IndexedFileSummary } from '../api/types'

/**
 * Resultado de uma busca, carimbado com a chave que o pediu.
 *
 * O carimbo não é enfeite. Sem ele seria preciso zerar o estado no corpo do efeito ao trocar de
 * arquivo — o que gera render em cascata (`react-hooks/set-state-in-effect`) — e, pior, uma
 * resposta lenta do arquivo anterior chegando depois sobrescreveria a do arquivo atual. Guardando
 * a chave junto, "é meu?" vira uma comparação no render e o resultado atrasado é simplesmente
 * ignorado.
 */
interface Keyed<T> {
  key: string
  data: T | null
  error: ApiError | null
}

function asApiError(caught: unknown, fallback: string): ApiError {
  return caught instanceof ApiError ? caught : new ApiError(fallback, { cause: caught })
}

/** Lista de arquivos do projeto. Uma chamada só; a árvore e o mapa caminho→id saem dela. */
export function useFileList(projectId: number | null) {
  const [result, setResult] = useState<Keyed<IndexedFileSummary[]> | null>(null)
  const key = projectId === null ? null : `projeto-${String(projectId)}`

  useEffect(() => {
    if (projectId === null || key === null) return
    let cancelled = false
    listFiles(projectId)
      .then((loaded) => {
        if (!cancelled) setResult({ key, data: loaded, error: null })
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setResult({
            key,
            data: null,
            error: asApiError(caught, 'Falha inesperada ao listar arquivos.'),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [projectId, key])

  const current = result !== null && result.key === key ? result : null
  return {
    files: current?.data ?? null,
    error: current?.error ?? null,
    loading: key !== null && current === null,
  }
}

/**
 * Conteúdo do arquivo selecionado.
 *
 * `reloadToken` entra na chave para o botão "tentar de novo" funcionar: sem ele, repetir a mesma
 * chamada com o mesmo `fileId` não mudaria dependência nenhuma e o efeito não rodaria de novo.
 */
export function useFileContent(projectId: number | null, fileId: number | null) {
  const [result, setResult] = useState<Keyed<FileContent> | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const retry = useCallback(() => {
    setReloadToken((previous) => previous + 1)
  }, [])

  const key =
    projectId === null || fileId === null
      ? null
      : `${String(projectId)}/${String(fileId)}#${String(reloadToken)}`

  useEffect(() => {
    if (projectId === null || fileId === null || key === null) return
    let cancelled = false
    readFileContent(projectId, fileId)
      .then((loaded) => {
        if (!cancelled) setResult({ key, data: loaded, error: null })
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setResult({
            key,
            data: null,
            error: asApiError(caught, 'Falha inesperada ao abrir o arquivo.'),
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [projectId, fileId, key])

  const current = result !== null && result.key === key ? result : null
  return {
    content: current?.data ?? null,
    error: current?.error ?? null,
    loading: key !== null && current === null,
    retry,
  }
}
