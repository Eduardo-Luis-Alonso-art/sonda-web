import type { ChatUsage } from '../api/types'

const integer = new Intl.NumberFormat('pt-BR')

/** Custo em USD com 6 casas: uma pergunta custa na ordem de US$ 0,000047 a US$ 0,0025. */
function formatCost(usd: number): string {
  return `US$ ${usd.toFixed(6)}`
}

function formatDuration(ms: number): string {
  return ms < 1000 ? `${String(ms)} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`
}

/**
 * Rodape de custo: modelo, tokens e quanto a pergunta custou. Fica sempre visivel (nao escondido
 * atras de um toggle) porque o produto cobra por pergunta e o usuario deve ver isso sem procurar.
 */
export function UsageFooter({ usage, durationMs }: { usage: ChatUsage; durationMs: number }) {
  const totalTokens = usage.embeddingTokens + usage.chatPromptTokens + usage.chatCompletionTokens
  return (
    <dl className="text-muted border-line flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 font-mono text-xs">
      <div className="flex gap-1.5">
        <dt>modelo</dt>
        <dd className="text-ink">{usage.chatModel}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt>tokens</dt>
        <dd className="text-ink">{integer.format(totalTokens)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt>custo</dt>
        <dd className="text-ink">{formatCost(usage.estimatedCostUsd)}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt>tempo</dt>
        <dd className="text-ink">{formatDuration(durationMs)}</dd>
      </div>
    </dl>
  )
}
