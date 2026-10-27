import { useId, useRef, useState } from 'react'

/** Teto do contrato da API: `question` obrigatoria, nao vazia, ate 2.000 caracteres. */
export const MAX_QUESTION_LENGTH = 2000

/**
 * Campo de pergunta.
 *
 * Teclado: Enter envia, Shift+Enter quebra linha (convencao de chat). O botao continua existindo
 * e focavel por Tab — a tecla de atalho e um atalho, nunca o unico caminho.
 *
 * A validacao de tamanho acontece aqui para nao gastar uma viagem a API num 400 previsivel; a API
 * continua sendo a autoridade.
 */
export function QuestionForm({
  onSubmit,
  disabled,
  busy = false,
}: {
  onSubmit: (question: string) => void
  /** Bloqueia o envio por qualquer motivo (pergunta em curso, conversa carregando…). */
  disabled: boolean
  /**
   * Ha uma pergunta em voo AGORA.
   *
   * Separado de `disabled` de proposito: desde o prompt 13 o formulario tambem fica bloqueado
   * enquanto a conversa e carregada do servidor, e derivar o rotulo de `disabled` fazia o botao
   * dizer "Perguntando…" sem ninguem ter perguntado.
   */
  busy?: boolean
}) {
  const [question, setQuestion] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const counterId = useId()
  const hintId = useId()

  const trimmed = question.trim()
  const tooLong = question.length > MAX_QUESTION_LENGTH
  const canSubmit = trimmed.length > 0 && !tooLong && !disabled

  function submit() {
    if (!canSubmit) return
    onSubmit(trimmed)
    setQuestion('')
    textareaRef.current?.focus()
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="bg-surface border-line flex flex-col gap-3 rounded-lg border p-3 sm:p-4"
    >
      <label htmlFor="pergunta" className="text-muted text-xs">
        Pergunta sobre o codigo indexado
      </label>
      <textarea
        id="pergunta"
        ref={textareaRef}
        value={question}
        onChange={(event) => {
          setQuestion(event.target.value)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            submit()
          }
        }}
        rows={3}
        disabled={disabled}
        aria-describedby={`${hintId} ${counterId}`}
        aria-invalid={tooLong}
        placeholder="Ex.: Quais validacoes sao feitas no telefone do dono?"
        className="text-ink placeholder:text-muted field-sizing-content max-h-60 min-h-20 w-full resize-none bg-transparent text-sm leading-relaxed disabled:opacity-50"
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p id={hintId} className="text-muted text-xs">
          Enter envia · Shift+Enter quebra linha
        </p>
        <div className="flex items-center gap-3">
          <p
            id={counterId}
            className={tooLong ? 'text-danger font-mono text-xs' : 'text-muted font-mono text-xs'}
          >
            {question.length}/{MAX_QUESTION_LENGTH}
          </p>
          <button
            type="submit"
            disabled={!canSubmit}
            className="bg-primary rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? 'Perguntando…' : 'Perguntar'}
          </button>
        </div>
      </div>
      {tooLong && (
        <p role="alert" className="text-danger text-xs">
          A pergunta passou de {MAX_QUESTION_LENGTH} caracteres — a API recusaria com 400.
        </p>
      )}
    </form>
  )
}
