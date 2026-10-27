import { useRef, type KeyboardEvent } from 'react'
import type { Project } from '../api/types'

/**
 * Escolha de projeto, como barra de abas.
 *
 * Abas e não `<select>`: são dois projetos hoje e poucos amanhã, e o valor de ver os dois nomes
 * lado a lado — com o ativo destacado — é maior do que o de economizar a largura. Um `<select>`
 * esconderia a existência do segundo projeto atrás de um clique.
 *
 * Acessibilidade: é um `tablist` ARIA de verdade. O ativo é anunciado por `aria-selected`, não só
 * pela cor. Teclado no padrão APG de tabs: ←/→ andam entre as abas, Home/End vão aos extremos, e
 * o *roving tabindex* faz o Tab entrar e sair da barra num passo só. Trocar com a seta já troca o
 * projeto — é o comportamento de "seleção automática", que é o certo quando a troca é barata e
 * reversível (nada é perdido: o histórico de cada projeto fica guardado).
 */
export function ProjectSelector({
  projects,
  selected,
  onSelect,
}: {
  projects: Project[]
  selected: Project | null
  onSelect: (project: Project) => void
}) {
  const listRef = useRef<HTMLDivElement>(null)

  if (projects.length === 0) return null

  const selectedIndex = Math.max(
    0,
    projects.findIndex((project) => project.id === selected?.id),
  )

  function focusTab(index: number) {
    const project = projects[index]
    if (!project) return
    onSelect(project)
    listRef.current
      ?.querySelector<HTMLElement>(`[data-project-id="${String(project.id)}"]`)
      ?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault()
        focusTab((selectedIndex + 1) % projects.length)
        break
      case 'ArrowLeft':
        event.preventDefault()
        focusTab((selectedIndex - 1 + projects.length) % projects.length)
        break
      case 'Home':
        event.preventDefault()
        focusTab(0)
        break
      case 'End':
        event.preventDefault()
        focusTab(projects.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p id="rotulo-projeto" className="text-muted text-xs">
        Projeto consultado
      </p>
      <div
        ref={listRef}
        role="tablist"
        aria-labelledby="rotulo-projeto"
        onKeyDown={handleKeyDown}
        className="border-line flex flex-wrap gap-1 rounded-lg border p-1"
      >
        {projects.map((project, index) => {
          const active = project.id === selected?.id
          return (
            <button
              key={project.id}
              type="button"
              role="tab"
              data-project-id={project.id}
              aria-selected={active}
              tabIndex={index === selectedIndex ? 0 : -1}
              onClick={() => {
                onSelect(project)
              }}
              className={
                active
                  ? 'bg-primary flex items-baseline gap-2 rounded-md px-3 py-1.5 text-xs font-medium text-white'
                  : 'text-muted hover:text-ink hover:bg-line/60 flex items-baseline gap-2 rounded-md px-3 py-1.5 text-xs'
              }
            >
              <span className="font-mono">{project.name}</span>
              {project.primaryLanguage !== null && (
                // Medido: branco a 90% sobre o primary da 4,69:1 e passa AA; a 80% cairia para
                // 4,05:1 e reprovaria. Na aba inativa, muted sobre o fundo da pagina da 7,57:1.
                <span className={active ? 'text-white/90' : 'text-muted'}>
                  {project.primaryLanguage}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
