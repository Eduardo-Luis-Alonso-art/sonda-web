import { AppHeader } from '../components/AppHeader'
import { ErrorCard } from '../components/ErrorCard'
import { QuestionForm } from '../components/QuestionForm'
import { useElapsedMs } from '../hooks/useElapsedMs'
import { ProjectResolutionMessage } from '../projects/ProjectResolutionMessage'
import { ProjectSelector } from '../projects/ProjectSelector'
import { useSelectedProject } from '../projects/useSelectedProject'
import { ClearConversationButton } from './ClearConversationButton'
import { ConversationHistory } from './ConversationHistory'
import { useConversation } from './useConversation'
import { useProjects } from './useProjects'

/**
 * A tela de chat.
 *
 * Layout de coluna unica centralizada, maximo 3xl: a resposta e texto com citacoes, e texto
 * longo em linha larga e dificil de ler. Historico rola; o campo de pergunta fica fixo no pe,
 * para nao ter que rolar ate o fim depois de ler uma resposta comprida.
 *
 * O projeto ativo vem da URL (`?project=<nome>`), e a conversa vem do backend
 * (`GET /conversation`) — nao mais de um mapa em memoria. Com isso a conversa sobrevive a troca
 * de aba, a ida ao explorer e ao F5.
 */
export function ChatPage() {
  const { projects, error: projectsError, loading } = useProjects()
  const { resolution, project, select } = useSelectedProject(projects)
  const { turns, pending, pendingSince, carregandoConversa, loadError, ask, retry, clear } =
    useConversation(project?.id ?? null)
  const elapsedMs = useElapsedMs(pendingSince)

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader project={project} />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-6">
        {loading && (
          <p role="status" className="text-muted text-sm">
            Carregando projetos…
          </p>
        )}

        {projectsError !== null && <ErrorCard error={projectsError} />}

        {projects !== null && projects.length === 0 && (
          <div className="border-line text-muted rounded-lg border border-dashed p-8 text-center text-sm">
            Nenhum projeto registrado na API. Confira a configuracao de repositorios do sonda-api.
          </div>
        )}

        {projects !== null && projects.length > 0 && (
          <div className="flex flex-wrap items-end justify-between gap-3">
            <ProjectSelector projects={projects} selected={project} onSelect={select} />
            {project !== null && (
              <ClearConversationButton
                project={project}
                // Apagar no meio de uma pergunta deixaria o turno pendente orfao do historico
                // que ele vai integrar.
                disabled={pending || carregandoConversa}
                onConfirm={clear}
              />
            )}
          </div>
        )}

        <ProjectResolutionMessage resolution={resolution} />

        {project !== null && carregandoConversa && (
          <p role="status" className="text-muted text-sm">
            Carregando a conversa deste projeto…
          </p>
        )}

        {loadError !== null && <ErrorCard error={loadError} />}

        {project !== null && !carregandoConversa && loadError === null && (
          <ConversationHistory
            turns={turns}
            elapsedMs={elapsedMs}
            onRetry={retry}
            projects={projects ?? []}
          />
        )}
      </main>

      {project !== null && (
        <div className="border-line bg-canvas sticky bottom-0 border-t">
          <div className="mx-auto w-full max-w-3xl px-4 py-4">
            <QuestionForm
              onSubmit={(question) => {
                void ask(question)
              }}
              disabled={pending || carregandoConversa}
              busy={pending}
            />
            <p className="text-muted mt-2 text-center text-xs">
              A conversa fica gravada por projeto no servidor — recarregar a pagina nao apaga.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
