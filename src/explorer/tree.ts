import type { IndexedFileSummary } from '../api/types'

/** Uma pasta da árvore. Só existe no cliente — a API devolve lista plana. */
export interface TreeFolder {
  kind: 'folder'
  /** Nome do segmento, sem o caminho. */
  name: string
  /** Caminho completo até esta pasta, com '/'. Serve de chave e de id de expansão. */
  path: string
  children: TreeNode[]
}

export interface TreeFile {
  kind: 'file'
  name: string
  path: string
  file: IndexedFileSummary
}

export type TreeNode = TreeFolder | TreeFile

/**
 * Monta a árvore agrupando por segmento de caminho.
 *
 * A API devolve lista plana de propósito (montar árvore é decisão de apresentação), então o
 * agrupamento é aqui. Pastas vêm antes de arquivos e os dois grupos saem em ordem de code point —
 * a mesma ordem que a API já usa, para a árvore não discordar da lista.
 */
export function buildFileTree(files: IndexedFileSummary[]): TreeNode[] {
  const root: TreeFolder = { kind: 'folder', name: '', path: '', children: [] }

  for (const file of files) {
    const segments = file.path.split('/').filter((segment) => segment.length > 0)
    // `pop` separa o nome do arquivo das pastas e deixa o resto iterável por valor — sem indexar
    // por número, que sob `noUncheckedIndexedAccess` exigiria uma asserção que o lint proíbe.
    const fileName = segments.pop()
    if (fileName === undefined) continue

    let folder = root
    for (const name of segments) {
      const path = folder.path === '' ? name : `${folder.path}/${name}`
      let next = folder.children.find(
        (child): child is TreeFolder => child.kind === 'folder' && child.name === name,
      )
      if (!next) {
        next = { kind: 'folder', name, path, children: [] }
        folder.children.push(next)
      }
      folder = next
    }
    folder.children.push({ kind: 'file', name: fileName, path: file.path, file })
  }

  sortRecursively(root)
  return root.children
}

function sortRecursively(folder: TreeFolder): void {
  folder.children.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    return a.name < b.name ? -1 : a.name > b.name ? 1 : 0
  })
  for (const child of folder.children) {
    if (child.kind === 'folder') sortRecursively(child)
  }
}

/**
 * Todas as pastas que contêm `filePath`, para abrir a árvore até um arquivo vindo de um link de
 * citação. Para `a/b/c.java` devolve `['a', 'a/b']`.
 */
export function ancestorFolders(filePath: string): string[] {
  const segments = filePath.split('/').filter((segment) => segment.length > 0)
  const folders: string[] = []
  for (let i = 0; i < segments.length - 1; i++) {
    folders.push(segments.slice(0, i + 1).join('/'))
  }
  return folders
}

/**
 * Achata a árvore na ordem em que ela aparece na tela, respeitando o que está recolhido.
 *
 * É esta lista que a navegação por setas percorre: o que o olho vê de cima para baixo é o que
 * ↑/↓ percorrem, e o que está dentro de pasta fechada não entra.
 */
export function visibleRows(
  nodes: TreeNode[],
  expanded: ReadonlySet<string>,
  depth = 0,
): { node: TreeNode; depth: number }[] {
  const rows: { node: TreeNode; depth: number }[] = []
  for (const node of nodes) {
    rows.push({ node, depth })
    if (node.kind === 'folder' && expanded.has(node.path)) {
      rows.push(...visibleRows(node.children, expanded, depth + 1))
    }
  }
  return rows
}
