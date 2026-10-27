import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useProjects } from '../chat/useProjects'
import { AppHeader } from '../components/AppHeader'
import { ErrorCard } from '../components/ErrorCard'
import { ProjectResolutionMessage } from '../projects/ProjectResolutionMessage'
import { useSelectedProject } from '../projects/useSelectedProject'
import type { IndexedFileSummary } from '../api/types'
import { CodeViewer } from './CodeViewer'
import { ancestorFolders } from './tree'
import { FileErrorCard } from './FileErrorCard'
import { FileTree } from './FileTree'
import { parseLineRange } from './explorerLink'
import { StaleContentBanner } from './StaleContentBanner'
import { useFileContent, useFileList } from './useExplorer'

/**
 * Explorer: árvore à esquerda, visualizador à direita.
 *
 * O estado mora na URL (`?file=...&lines=62-65`), não em `useState`. É isso que faz o link de uma
 * citação funcionar, o F5 não perder o lugar e o endereço poder ser colado para outra pessoa.
 *
 * Em telas estreitas as duas colunas viram uma só, empilhada: a árvore encolhe para uma faixa
 * rolável no topo e o código fica embaixo, porque lado a lado em 375px não sobra largura para
 * nenhum dos dois.
 */
export function ExplorerPage() {
  const { projects, error: projectsError, loading: loadingProjects } = useProjects()
  // O projeto sai do mesmo `?project=<nome>` que o chat usa, e nao mais do primeiro da lista.
  // E assim que um link de citacao abre no projeto certo mesmo sendo outro o que estava aberto.
  const { resolution, project } = useSelectedProject(projects)

  const [searchParams, setSearchParams] = useSearchParams()
  const selectedPath = searchParams.get('file')
  const highlightRange = parseLineRange(searchParams.get('lines'))

  const { files, error: filesError, loading: loadingFiles } = useFileList(project?.id ?? null)

  // Caminho -> id: a URL fala em caminho (estável), a API de conteúdo pede id.
  const fileIdByPath = useMemo(() => {
    const map = new Map<string, number>()
    for (const file of files ?? []) map.set(file.path, file.id)
    return map
  }, [files])

  const selectedId = selectedPath === null ? null : (fileIdByPath.get(selectedPath) ?? null)
  const {
    content,
    error: contentError,
    loading: loadingContent,
    retry,
  } = useFileContent(project?.id ?? null, selectedId)

  /**
   * Decisões explícitas do usuário sobre cada pasta. O conjunto de pastas abertas NÃO é estado —
   * é derivado disto mais os ancestrais do arquivo selecionado.
   *
   * Poderia ser um efeito que abre os ancestrais quando a URL muda, mas aí seria setState no corpo
   * do efeito (render em cascata) e, pior, "abrir até o arquivo" viraria uma ação que acontece
   * depois da primeira pintura. Derivando, chegar por link de citação já renderiza com a árvore
   * aberta no lugar certo — e o usuário ainda pode fechar a pasta, porque o override explícito
   * vence o ancestral.
   */
  const [folderOverrides, setFolderOverrides] = useState<ReadonlyMap<string, boolean>>(new Map())
  const expanded = useMemo(() => {
    const open = new Set<string>()
    if (selectedPath !== null) {
      for (const folder of ancestorFolders(selectedPath)) open.add(folder)
    }
    for (const [path, isOpen] of folderOverrides) {
      if (isOpen) open.add(path)
      else open.delete(path)
    }
    return open
  }, [selectedPath, folderOverrides])

  /**
   * Linha ativa da árvore (a que recebe o foco das setas). Guarda junto o `selectedPath` em que a
   * escolha foi feita: quando a URL muda — clique numa citação, por exemplo — a escolha antiga
   * perde a validade e o foco acompanha o arquivo novo, sem precisar de efeito.
   */
  const [activeChoice, setActiveChoice] = useState<{ basedOn: string | null; path: string } | null>(
    null,
  )
  const activePath =
    activeChoice !== null && activeChoice.basedOn === selectedPath
      ? activeChoice.path
      : selectedPath

  function openFile(file: IndexedFileSummary) {
    // Preserva o `?project=`: trocar de arquivo nao pode trocar de projeto. Troca de arquivo zera
    // a faixa, porque a linha 62 do arquivo anterior nao quer dizer nada no novo.
    const next = new URLSearchParams(searchParams)
    next.set('file', file.path)
    next.delete('lines')
    setSearchParams(next, { replace: false })
  }

  function toggleFolder(path: string, open: boolean) {
    setFolderOverrides((previous) => new Map(previous).set(path, open))
  }

  const fileNotInList = selectedPath !== null && files !== null && selectedId === null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <AppHeader project={project} />

      <main className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 lg:flex-row">
        {loadingProjects && (
          <p role="status" className="text-muted text-sm">
            Carregando projetos…
          </p>
        )}
        {projectsError !== null && <ErrorCard error={projectsError} />}

        {resolution !== null && resolution.kind !== 'found' && (
          <div className="w-full">
            <ProjectResolutionMessage resolution={resolution} />
          </div>
        )}

        {project !== null && (
          <>
            <nav
              aria-label="Arquivos do projeto"
              className="bg-surface border-line max-h-64 w-full shrink-0 overflow-auto rounded-lg border lg:max-h-none lg:w-80"
            >
              {loadingFiles && (
                <p role="status" className="text-muted p-4 text-xs">
                  Carregando arquivos…
                </p>
              )}
              {filesError !== null && (
                <div className="p-3">
                  <ErrorCard error={filesError} />
                </div>
              )}
              {files !== null && (
                <FileTree
                  files={files}
                  selectedPath={selectedPath}
                  expanded={expanded}
                  onToggleFolder={toggleFolder}
                  onSelectFile={openFile}
                  activePath={activePath}
                  onActivePathChange={(path) => {
                    setActiveChoice({ basedOn: selectedPath, path })
                  }}
                />
              )}
            </nav>

            <section
              aria-label="Conteudo do arquivo"
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-3"
            >
              {selectedPath === null && (
                <div className="border-line text-muted rounded-lg border border-dashed p-8 text-center text-sm">
                  <p>Nenhum arquivo aberto.</p>
                  <p className="mt-1 text-xs">
                    Escolha um arquivo na arvore, ou clique numa citacao do chat para abrir ja na
                    linha citada.
                  </p>
                </div>
              )}

              {fileNotInList && (
                <div className="border-line text-muted rounded-lg border border-dashed p-8 text-center text-sm">
                  <p className="text-ink">Este arquivo nao esta no indice.</p>
                  <p className="mt-1 font-mono text-xs break-all">{selectedPath}</p>
                  <p className="mt-2 text-xs">
                    Ou o caminho do link esta errado, ou o arquivo foi ignorado na indexacao (por
                    tamanho, por ser binario ou por regra de exclusao).
                  </p>
                </div>
              )}

              {loadingContent && (
                <p role="status" className="text-muted text-sm">
                  Abrindo arquivo…
                </p>
              )}

              {contentError !== null && <FileErrorCard error={contentError} onRetry={retry} />}

              {content !== null && (
                <>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h1 className="text-ink font-mono text-sm break-all">{content.path}</h1>
                    <p className="text-muted font-mono text-xs">
                      {content.lineCount} linhas · {content.sizeBytes} bytes
                      {content.language !== null && ` · ${content.language}`}
                      {highlightRange &&
                        ` · citado ${String(highlightRange.startLine)}-${String(highlightRange.endLine)}`}
                    </p>
                  </div>

                  {content.contentMayBeStale && (
                    <StaleContentBanner
                      indexedHash={content.indexedContentHash}
                      currentHash={content.currentContentHash}
                    />
                  )}

                  <CodeViewer file={content} highlightRange={highlightRange} />
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
