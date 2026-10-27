/**
 * Aviso de que ESTA troca nao foi gravada no servidor.
 *
 * Discreto de proposito: a pergunta foi respondida, nada falhou do ponto de vista de quem
 * perguntou. O unico efeito e que esta troca some se a pagina recarregar — e e so isso que o
 * texto diz. Um cartao de erro vermelho aqui seria desproporcional e faria duvidar da resposta,
 * que esta perfeita.
 *
 * `warning` sobre o fundo do cartao da 8,26:1 (medido no prompt 4), bem acima de AA.
 */
export function NotSavedWarning() {
  return (
    <p className="text-warning flex items-start gap-2 text-xs">
      <span aria-hidden="true">!</span>
      <span>
        Esta troca nao foi gravada no historico — ela some se voce recarregar a pagina. A resposta
        acima continua valida.
      </span>
    </p>
  )
}
