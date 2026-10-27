import { NavLink } from 'react-router'
import type { Project } from '../api/types'

/**
 * Cabecalho fino, de ferramenta: nome do produto, projeto consultado e as rotas.
 *
 * `NavLink` e nao `<a>`: navegacao client-side, sem recarregar. O `aria-current="page"` que ele
 * poe sozinho e o que faz o leitor de tela anunciar qual aba esta aberta — o sublinhado sozinho
 * nao diria nada.
 */
function navClass({ isActive }: { isActive: boolean }) {
  return isActive
    ? 'text-ink border-accent rounded-t border-b-2 px-1 pb-1 text-xs'
    : 'text-muted hover:text-ink rounded-t border-b-2 border-transparent px-1 pb-1 text-xs'
}

export function AppHeader({ project }: { project: Project | null }) {
  return (
    <header className="border-line bg-canvas/95 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex items-baseline gap-3">
          <span className="text-ink text-sm font-semibold tracking-tight">Sonda</span>
          {project && (
            <span className="text-muted font-mono text-xs">
              {project.name}
              {project.primaryLanguage !== null && ` · ${project.primaryLanguage}`}
            </span>
          )}
        </div>
        <nav aria-label="Secoes" className="flex items-center gap-4">
          <NavLink to="/" className={navClass} end>
            chat
          </NavLink>
          <NavLink to="/explorer" className={navClass}>
            arquivos
          </NavLink>
          <NavLink to="/ui" className={navClass}>
            referencia visual
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
