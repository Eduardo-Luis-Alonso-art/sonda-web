import type { Project } from '../api/types'

/**
 * O que saiu de resolver um `?project=<nome>` da URL contra a lista viva da API.
 *
 * É um resultado com três casos, e não `Project | null`, porque "não existe" e "existe mais de um
 * com esse nome" pedem telas diferentes: a primeira é um link velho ou errado, a segunda é uma
 * ambiguidade real que o usuário precisa desempatar. Devolver o primeiro match nos dois casos
 * abriria o projeto errado em silêncio — exatamente o que a escolha de endereçar por nome, e não
 * por id, tenta evitar.
 */
export type ProjectResolution =
  | { kind: 'found'; project: Project }
  | { kind: 'notFound'; requestedName: string }
  | { kind: 'ambiguous'; requestedName: string; candidates: Project[] }

/**
 * Resolve o nome pedido na URL, caindo no `fallback` quando a URL não pede nada.
 *
 * Por que nome e não id: o `id` vem de `indexed_repository.id`, uma chave gerada. Ele é mais
 * estável que o `fileId` (um sync não recria a linha do repositório, que é idempotente por
 * `local_path`), mas some se o banco for recriado — e `?project=1` não diz nada a quem recebe o
 * link. O nome é legível e sobrevive a recriação do registro.
 *
 * O preço é que o schema só garante unicidade de `local_path`, não de `name`: dois repositórios em
 * pastas diferentes podem se chamar `api`. Daí o caso `ambiguous`.
 */
export function resolveProject(
  projects: Project[],
  requestedName: string | null,
  fallback: Project | null = projects[0] ?? null,
): ProjectResolution | null {
  if (requestedName === null || requestedName === '') {
    return fallback === null ? null : { kind: 'found', project: fallback }
  }
  const matches = projects.filter((project) => project.name === requestedName)
  // Desestruturado em vez de `matches[0]`: sob noUncheckedIndexedAccess o indice devolveria
  // `Project | undefined` e exigiria uma assercao que o lint proibe.
  const [primeiro, ...resto] = matches
  if (primeiro === undefined) return { kind: 'notFound', requestedName }
  if (resto.length > 0) return { kind: 'ambiguous', requestedName, candidates: matches }
  return { kind: 'found', project: primeiro }
}

/** Nome do projeto dono de uma resposta de chat, a partir do `repositoryId` que ela carrega. */
export function projectNameById(projects: Project[], id: number): string | null {
  return projects.find((project) => project.id === id)?.name ?? null
}
