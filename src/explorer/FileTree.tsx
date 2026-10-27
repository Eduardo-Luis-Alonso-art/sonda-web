import { useMemo, useRef, type KeyboardEvent } from 'react'
import type { IndexedFileSummary } from '../api/types'
import { buildFileTree, visibleRows, type TreeNode } from './tree'

/**
 * Árvore de arquivos, montada no cliente a partir da lista plana da API.
 *
 * Acessibilidade: é uma `tree` de verdade (ARIA), não uma lista com indentação. Cada linha tem
 * `treeitem`, as pastas expõem `aria-expanded` e todas expõem `aria-level`, então o leitor de tela
 * anuncia "pasta x, recolhida, nível 2" em vez de só o nome.
 *
 * Teclado, seguindo o padrão APG de treeview:
 *   ↑/↓        anda pelas linhas visíveis (pasta fechada não entra)
 *   →          abre a pasta; se já aberta, desce para o primeiro filho
 *   ←          fecha a pasta; se já fechada, sobe para a pasta mãe
 *   Home/End   primeira e última linha visível
 *   Enter      abre o arquivo
 *
 * Foco por *roving tabindex*: só a linha ativa tem `tabIndex=0`, o resto `-1`. Assim o Tab entra e
 * sai da árvore num passo só, em vez de percorrer 116 arquivos.
 */
export function FileTree({
  files,
  selectedPath,
  expanded,
  onToggleFolder,
  onSelectFile,
  activePath,
  onActivePathChange,
}: {
  files: IndexedFileSummary[]
  selectedPath: string | null
  expanded: ReadonlySet<string>
  onToggleFolder: (path: string, open: boolean) => void
  onSelectFile: (file: IndexedFileSummary) => void
  activePath: string | null
  onActivePathChange: (path: string) => void
}) {
  const tree = useMemo(() => buildFileTree(files), [files])
  const rows = useMemo(() => visibleRows(tree, expanded), [tree, expanded])
  const treeRef = useRef<HTMLUListElement>(null)

  const activeIndex = Math.max(
    0,
    rows.findIndex((row) => row.node.path === activePath),
  )

  function focusRow(index: number) {
    const row = rows[index]
    if (!row) return
    onActivePathChange(row.node.path)
    treeRef.current
      ?.querySelector<HTMLElement>(`[data-node-path="${CSS.escape(row.node.path)}"]`)
      ?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const row = rows[activeIndex]
    if (!row) return
    const { node } = row

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        focusRow(Math.min(activeIndex + 1, rows.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        focusRow(Math.max(activeIndex - 1, 0))
        break
      case 'Home':
        event.preventDefault()
        focusRow(0)
        break
      case 'End':
        event.preventDefault()
        focusRow(rows.length - 1)
        break
      case 'ArrowRight':
        event.preventDefault()
        if (node.kind === 'folder') {
          if (expanded.has(node.path)) focusRow(activeIndex + 1)
          else onToggleFolder(node.path, true)
        }
        break
      case 'ArrowLeft': {
        event.preventDefault()
        if (node.kind === 'folder' && expanded.has(node.path)) {
          onToggleFolder(node.path, false)
          break
        }
        // Sobe para a pasta mãe: a linha anterior com profundidade menor.
        const parentIndex = rows
          .slice(0, activeIndex)
          .map((candidate, index) => ({ candidate, index }))
          .reverse()
          .find(({ candidate }) => candidate.depth < row.depth)?.index
        if (parentIndex !== undefined) focusRow(parentIndex)
        break
      }
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (node.kind === 'folder') onToggleFolder(node.path, !expanded.has(node.path))
        else onSelectFile(node.file)
        break
      default:
        break
    }
  }

  if (files.length === 0) {
    return (
      <p className="text-muted p-4 text-xs">
        Nenhum arquivo indexado. Rode o sync no projeto para popular o indice.
      </p>
    )
  }

  return (
    <ul
      ref={treeRef}
      role="tree"
      aria-label="Arquivos indexados"
      onKeyDown={handleKeyDown}
      className="flex flex-col py-1"
    >
      {rows.map(({ node, depth }, index) => (
        <TreeRow
          key={node.path}
          node={node}
          depth={depth}
          selected={node.kind === 'file' && node.path === selectedPath}
          expanded={node.kind === 'folder' && expanded.has(node.path)}
          tabbable={index === activeIndex}
          onActivate={() => {
            onActivePathChange(node.path)
            if (node.kind === 'folder') onToggleFolder(node.path, !expanded.has(node.path))
            else onSelectFile(node.file)
          }}
        />
      ))}
    </ul>
  )
}

function TreeRow({
  node,
  depth,
  selected,
  expanded,
  tabbable,
  onActivate,
}: {
  node: TreeNode
  depth: number
  selected: boolean
  expanded: boolean
  tabbable: boolean
  onActivate: () => void
}) {
  const isFolder = node.kind === 'folder'
  return (
    <li role="none">
      <div
        role="treeitem"
        data-node-path={node.path}
        tabIndex={tabbable ? 0 : -1}
        aria-level={depth + 1}
        aria-selected={selected}
        {...(isFolder ? { 'aria-expanded': expanded } : {})}
        onClick={onActivate}
        // Indentação por padding e não por margem: assim o realce da linha selecionada ocupa a
        // largura toda da barra, como num explorer de IDE.
        style={{ paddingLeft: `${String(depth * 0.875 + 0.5)}rem` }}
        className={
          selected
            ? 'bg-line text-ink flex cursor-pointer items-center gap-1.5 py-1 pr-2 text-xs'
            : 'text-muted hover:text-ink hover:bg-line/50 flex cursor-pointer items-center gap-1.5 py-1 pr-2 text-xs'
        }
      >
        <span aria-hidden="true" className="text-muted w-3 shrink-0 text-center">
          {isFolder ? (expanded ? '▾' : '▸') : ''}
        </span>
        <span className="truncate font-mono">{node.name}</span>
        {node.kind === 'file' && node.file.language !== null && (
          <span className="text-muted ml-auto shrink-0 pl-2 text-[10px]">{node.file.language}</span>
        )}
      </div>
    </li>
  )
}
