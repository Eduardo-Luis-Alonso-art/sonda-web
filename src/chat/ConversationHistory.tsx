import { useRef, type KeyboardEvent } from 'react'
import { AnswerCard } from '../components/AnswerCard'
import { ErrorCard } from '../components/ErrorCard'
import { PendingAnswer } from '../components/PendingAnswer'
import { NotSavedWarning } from '../components/NotSavedWarning'
import { QuestionBubble } from '../components/QuestionBubble'
import { UnsupportedFormatCard } from '../components/UnsupportedFormatCard'
import { projectNameById } from '../projects/projectResolution'
import type { Project } from '../api/types'
import type { ConversationTurn } from './conversation'

const NAVIGATION_KEYS = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End'])

/**
 * O historico da conversa.
 *
 * Acessibilidade e teclado:
 *   - `role="log"` com `aria-live="polite"`: leitor de tela anuncia a resposta quando ela chega,
 *     sem interromper o que o usuario estiver fazendo.
 *   - cada turno e focavel (`tabIndex={0}`) e as setas cima/baixo saltam de turno em turno,
 *     Home/End vao ao primeiro/ultimo. Uma conversa longa fica navegavel sem Tab-ar por dentro
 *     de cada citacao.
 *   - as setas so agem quando o foco esta no proprio turno; dentro de um campo ou de um
 *     `<details>` elas continuam fazendo o que o navegador faz.
 */
export function ConversationHistory({
  turns,
  elapsedMs,
  onRetry,
  projects,
}: {
  turns: ConversationTurn[]
  elapsedMs: number
  onRetry: (turnId: string) => void
  /** Lista viva de projetos, para resolver o `repositoryId` de cada resposta num nome. */
  projects: Project[]
}) {
  const listRef = useRef<HTMLOListElement>(null)

  function handleKeyDown(event: KeyboardEvent<HTMLOListElement>) {
    if (!NAVIGATION_KEYS.has(event.key)) return
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-turn]') ?? [])
    const current = items.indexOf(document.activeElement as HTMLElement)
    if (current === -1 || items.length === 0) return

    event.preventDefault()
    const target =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : event.key === 'ArrowDown'
            ? Math.min(current + 1, items.length - 1)
            : Math.max(current - 1, 0)
    items[target]?.focus()
  }

  if (turns.length === 0) {
    return (
      <div className="border-line text-muted rounded-lg border border-dashed p-8 text-center text-sm">
        <p>Nenhuma pergunta ainda.</p>
        <p className="mt-1 text-xs">
          A Sonda so responde com citacao de arquivo e linha do codigo indexado.
        </p>
      </div>
    )
  }

  return (
    <ol
      ref={listRef}
      onKeyDown={handleKeyDown}
      role="log"
      aria-live="polite"
      aria-label="Historico da conversa"
      className="flex flex-col gap-6"
    >
      {turns.map((turn, index) => (
        <li
          key={turn.id}
          data-turn=""
          tabIndex={0}
          aria-label={`Turno ${String(index + 1)} de ${String(turns.length)}: ${turn.question}`}
          className="flex flex-col gap-3 rounded-lg"
        >
          <QuestionBubble question={turn.question} />
          {turn.state === 'pending' && <PendingAnswer elapsedMs={elapsedMs} />}
          {turn.state === 'answered' && turn.response !== null && (
            <>
              <AnswerCard
                response={turn.response}
                projectName={projectNameById(projects, turn.response.repositoryId)}
              />
              {/* Abaixo da resposta, nao acima: o aviso e sobre o destino dela, nao sobre o
                  conteudo, e nao deve ser a primeira coisa que se le. */}
              {!turn.saved && <NotSavedWarning />}
            </>
          )}
          {turn.state === 'unsupportedFormat' && (
            <UnsupportedFormatCard responseFormat={turn.responseFormat} />
          )}
          {turn.state === 'failed' && turn.error !== null && (
            <ErrorCard
              error={turn.error}
              onRetry={() => {
                onRetry(turn.id)
              }}
            />
          )}
        </li>
      ))}
    </ol>
  )
}
