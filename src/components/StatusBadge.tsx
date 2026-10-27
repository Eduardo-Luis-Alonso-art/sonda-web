import type { ChatStatus } from '../api/types'

/**
 * Pastilha de status da resposta. E o sinal visual primario que diferencia ANSWERED de
 * NO_EVIDENCE — nunca so a cor: cada estado tem rotulo proprio e um glifo diferente, para
 * funcionar em monocromatico e para quem nao distingue verde de ambar.
 */
export function StatusBadge({ status }: { status: ChatStatus }) {
  const answered = status === 'ANSWERED'
  return (
    <span
      className={
        answered
          ? 'text-success border-success/40 bg-success/10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium'
          : 'text-warning border-warning/40 bg-warning/10 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium'
      }
    >
      {/* Glifos sem marca combinante: U+20E0 (circulo cortado) e COMBINING e gruda na letra
          seguinte em vez de ocupar espaco proprio. */}
      <span aria-hidden="true">{answered ? '✓' : '∅'}</span>
      {answered ? 'Respondido com evidencia' : 'Sem evidencia no codigo'}
    </span>
  )
}
