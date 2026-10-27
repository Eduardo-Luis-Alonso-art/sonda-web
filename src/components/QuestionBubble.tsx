/** A pergunta do usuario no historico. Alinhada a direita e sem fundo de superficie, para
 *  nao competir com os cartoes de resposta. */
export function QuestionBubble({ question }: { question: string }) {
  return (
    <div className="flex justify-end">
      <p className="bg-primary max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white">
        {question}
      </p>
    </div>
  )
}
