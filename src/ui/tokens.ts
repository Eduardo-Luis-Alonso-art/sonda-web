/**
 * Espelho dos tokens de `index.css`, usado SO pela pagina /ui para listar a paleta e o contraste
 * medido. Componente nenhum importa daqui — cor em componente vem sempre da classe do Tailwind
 * gerada pelo `@theme`.
 */
export interface TokenRow {
  name: string
  hex: string
  /** Contraste contra --color-canvas (#0B0F14), calculado pela formula da WCAG 2.x. */
  onCanvas: number
  usage: string
  note?: string
}

export const TOKEN_ROWS: TokenRow[] = [
  { name: 'canvas', hex: '#0B0F14', onCanvas: 1, usage: 'fundo da pagina' },
  { name: 'surface', hex: '#111827', onCanvas: 1.21, usage: 'cartoes, campo de pergunta' },
  { name: 'line', hex: '#1F2937', onCanvas: 1.31, usage: 'bordas e divisorias (decorativas)' },
  { name: 'ink', hex: '#F9FAFB', onCanvas: 18.39, usage: 'texto principal' },
  { name: 'muted', hex: '#9CA3AF', onCanvas: 7.57, usage: 'texto secundario, rotulos' },
  {
    name: 'primary',
    hex: '#5B55E8',
    onCanvas: 3.58,
    usage: 'preenchimento de botao (texto branco)',
    note: 'ajustado do #6366F1 sugerido: com ele o branco dava 4,47:1 e reprovava AA. Agora 5,37:1.',
  },
  {
    name: 'accent',
    hex: '#818CF8',
    onCanvas: 6.44,
    usage: 'primary como texto, link e anel de foco',
    note: 'token novo. O #6366F1 como texto dava 4,30:1, abaixo de AA.',
  },
  { name: 'success', hex: '#22C55E', onCanvas: 8.43, usage: 'status ANSWERED' },
  { name: 'warning', hex: '#F59E0B', onCanvas: 8.95, usage: 'status NO_EVIDENCE' },
  { name: 'danger', hex: '#EF4444', onCanvas: 5.11, usage: 'erro de chamada' },
]
