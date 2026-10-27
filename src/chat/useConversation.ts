import { useCallback, useEffect, useRef, useState } from 'react'
import { askQuestion, deleteConversation, getConversation } from '../api/client'
import { ApiError } from '../api/errors'
import type { ConversationTurn } from './conversation'
import { pendingTurn, turnFromExchange } from './conversation'

const SEM_TURNOS: ConversationTurn[] = []

/** Turnos carimbados com o projeto a que pertencem. Ver o porquê no comentário do hook. */
interface Carregado {
  projectId: number
  turns: ConversationTurn[]
  error: ApiError | null
}

function asApiError(caught: unknown, fallback: string): ApiError {
  return caught instanceof ApiError ? caught : new ApiError(fallback, { cause: caught })
}

/**
 * A conversa do projeto ativo, com o **backend como fonte de verdade**.
 *
 * Isto substitui por completo o `Map<projectId, turns>` em memória do prompt 9 — os dois não
 * coexistem. O mecanismo antigo perdia a conversa sempre que `ChatPage` desmontava, e medindo no
 * navegador o gatilho real não era trocar de aba de projeto (isso sobrevivia), e sim **sair da
 * rota do chat**: `chat → arquivos → chat` zerava tudo. Como sair para o explorer é justamente o
 * que um clique em citação faz, a perda caía no laço principal do produto. Trazendo do servidor,
 * os três caminhos (troca de aba, troca de rota e F5) passam a devolver a conversa.
 *
 * **Sem cache local, recarrega a cada troca de projeto.** Medido contra a API real: 12–18 ms para
 * 8,7 KB. Um cache precisaria ser invalidado ao perguntar, ao limpar e quando outra aba do
 * navegador mexe no mesmo projeto — complexidade que 15 ms não pagam, e cujo erro seria mostrar
 * conversa velha como se fosse verdade.
 *
 * O resultado é carimbado com o `projectId` que o pediu: assim a resposta lenta de um projeto não
 * sobrescreve a de outro quando a troca é rápida, e o "está carregando?" vira derivação em vez de
 * `setState` dentro do efeito.
 */
export function useConversation(projectId: number | null) {
  const [carregado, setCarregado] = useState<Carregado | null>(null)
  /** Turnos criados nesta sessão, ainda não refletidos num recarregamento. */
  const [locais, setLocais] = useState<ConversationTurn[]>([])
  const [pendingSince, setPendingSince] = useState<number | null>(null)
  const [recarregarToken, setRecarregarToken] = useState(0)
  const nextId = useRef(0)
  const pending = pendingSince !== null

  useEffect(() => {
    if (projectId === null) return
    let cancelado = false
    getConversation(projectId)
      .then((conversa) => {
        if (cancelado) return
        setCarregado({
          projectId,
          turns: conversa.exchanges.map(turnFromExchange),
          error: null,
        })
        // O que veio do servidor já contém tudo que foi gravado; o que era local virou histórico.
        setLocais([])
      })
      .catch((caught: unknown) => {
        if (cancelado) return
        setCarregado({
          projectId,
          turns: SEM_TURNOS,
          error: asApiError(caught, 'Falha inesperada ao carregar a conversa.'),
        })
      })
    return () => {
      cancelado = true
    }
  }, [projectId, recarregarToken])

  const doProjeto = carregado !== null && carregado.projectId === projectId ? carregado : null
  const carregandoConversa = projectId !== null && doProjeto === null

  const turns = carregandoConversa ? SEM_TURNOS : [...(doProjeto?.turns ?? SEM_TURNOS), ...locais]

  const ask = useCallback(
    async (question: string) => {
      if (projectId === null || pending) return

      // O id é capturado aqui: trocar de projeto durante a chamada não pode fazer a resposta cair
      // no histórico de outro projeto.
      const perguntadoEm = projectId
      nextId.current += 1
      const turnId = `local-${String(nextId.current)}`
      setPendingSince(Date.now())
      setLocais((previous) => [...previous, pendingTurn(turnId, question)])

      const concluir = (patch: Partial<ConversationTurn>) => {
        setLocais((previous) =>
          previous.map((turn) => (turn.id === turnId ? { ...turn, ...patch } : turn)),
        )
        setPendingSince(null)
      }

      try {
        const { response, saved } = await askQuestion(perguntadoEm, question)
        concluir({
          state: 'answered',
          response,
          saved,
          createdAt: new Date().toISOString(),
        })
      } catch (caught) {
        concluir({
          state: 'failed',
          error: asApiError(caught, 'Falha inesperada no cliente.'),
        })
      }
    },
    [projectId, pending],
  )

  /** Reenvia a pergunta de um turno que falhou, sem duplicar o turno anterior na tela. */
  const retry = useCallback(
    (turnId: string) => {
      const turn = locais.find((candidate) => candidate.id === turnId)
      if (!turn) return
      setLocais((previous) => previous.filter((candidate) => candidate.id !== turnId))
      void ask(turn.question)
    },
    [locais, ask],
  )

  /** Apaga a conversa **deste** projeto no servidor e recarrega do zero. */
  const clear = useCallback(async () => {
    if (projectId === null) return
    await deleteConversation(projectId)
    setLocais([])
    setRecarregarToken((previous) => previous + 1)
  }, [projectId])

  return {
    turns,
    pending,
    pendingSince,
    carregandoConversa,
    loadError: doProjeto?.error ?? null,
    ask,
    retry,
    clear,
  }
}
