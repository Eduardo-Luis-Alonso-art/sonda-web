import { useEffect, useRef, useState } from 'react'
import type { Project } from '../api/types'

/**
 * Apagar a conversa do projeto ativo, com confirmação.
 *
 * A confirmação é inline — o botão vira uma pergunta com "Apagar" e "Cancelar" — em vez de um
 * `window.confirm` ou de um modal. O `confirm` nativo não aceita tema nem teclado customizado e
 * trava a aba inteira; um modal exigiria *focus trap* e `inert` no resto da página para algo que
 * cabe em duas palavras. Inline, o foco já está no lugar certo e Escape cancela.
 *
 * O nome do projeto aparece no texto porque a ação é por projeto: apagar a conversa do petclinic
 * enquanto se olha o Grimório seria exatamente o tipo de engano que a confirmação existe para
 * evitar.
 *
 * O botão destrutivo só ganha `danger` **depois** de confirmar aberto; em repouso ele é neutro,
 * para não gritar perigo o tempo todo numa barra que fica sempre visível.
 */
export function ClearConversationButton({
  project,
  disabled,
  onConfirm,
}: {
  project: Project
  disabled: boolean
  onConfirm: () => void | Promise<void>
}) {
  /**
   * Para QUAL projeto a confirmacao esta aberta, e nao um booleano.
   *
   * Assim "trocar de projeto fecha a confirmacao" vira derivacao em vez de um efeito que chama
   * setState (render em cascata) — e, mais importante, fecha de verdade no mesmo render, sem a
   * janela de um frame em que o botao "Apagar" ja esta na tela apontando para outro projeto.
   */
  const [confirmandoPara, setConfirmandoPara] = useState<number | null>(null)
  const [apagando, setApagando] = useState(false)
  const confirmarRef = useRef<HTMLButtonElement>(null)
  const confirmando = confirmandoPara === project.id

  // Abrir a confirmação move o foco para o botão de confirmar: quem chegou por teclado não deve
  // ter de procurar o controle que acabou de aparecer.
  useEffect(() => {
    if (confirmando) confirmarRef.current?.focus()
  }, [confirmando])

  if (!confirmando) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          setConfirmandoPara(project.id)
        }}
        className="border-line text-muted hover:text-ink hover:border-muted rounded-md border px-2.5 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
      >
        Limpar conversa
      </button>
    )
  }

  return (
    <div
      role="group"
      aria-label="Confirmar limpeza da conversa"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          setConfirmandoPara(null)
        }
      }}
      className="border-danger/40 bg-danger/10 flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-1"
    >
      <span className="text-ink text-xs">
        Apagar a conversa de <span className="font-mono">{project.name}</span>? Nao tem desfazer.
      </span>
      <button
        ref={confirmarRef}
        type="button"
        disabled={apagando}
        onClick={() => {
          setApagando(true)
          void Promise.resolve(onConfirm()).finally(() => {
            setApagando(false)
            setConfirmandoPara(null)
          })
        }}
        // Texto ESCURO sobre o vermelho, nao branco: medido, branco sobre --color-danger da
        // 3,76:1 e reprova AA; o fundo da pagina em cima dele da 5,11:1.
        className="bg-danger text-canvas rounded px-2.5 py-1 text-xs font-medium disabled:opacity-60"
      >
        {apagando ? 'Apagando…' : 'Apagar'}
      </button>
      <button
        type="button"
        onClick={() => {
          setConfirmandoPara(null)
        }}
        className="text-muted hover:text-ink rounded px-2 py-1 text-xs"
      >
        Cancelar
      </button>
    </div>
  )
}
