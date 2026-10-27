import type { SearchQuery } from '../api/types'

const ROTULO: Record<SearchQuery['kind'], string> = {
  ORIGINAL: 'sua pergunta',
  REWRITTEN: 'reescrita em ingles',
}

/**
 * As consultas que foram efetivamente embeddadas, com a similaridade que cada uma encontrou.
 *
 * Até o prompt 8 a API mandava um texto só (`searchQuery`) e aqui havia uma linha "busca: …".
 * Agora são duas buscas — a pergunta original e a reescrita — e a informação que importa é
 * *qual delas achou melhor evidência*: é isso que explica uma resposta boa vinda de uma pergunta
 * mal formulada, ou o contrário. Mostrar só o texto, sem a similaridade, esconderia justamente
 * essa comparação.
 *
 * A melhor das duas é marcada. Com uma consulta só (quando a reescrita saiu igual à original) não
 * há o que comparar, e a marca não aparece.
 */
export function SearchQueryList({ queries }: { queries: SearchQuery[] }) {
  if (queries.length === 0) return null

  const melhor = Math.max(...queries.map((query) => query.topSimilarity))
  const haComparacao = queries.length > 1

  return (
    <div className="border-line flex flex-col gap-1.5 border-t pt-3">
      <p className="text-muted text-xs">Buscas feitas no codigo</p>
      <ul className="flex flex-col gap-1">
        {queries.map((query) => {
          const destaque = haComparacao && query.topSimilarity === melhor
          return (
            <li
              key={`${query.kind}-${query.text}`}
              className="flex flex-wrap items-baseline gap-x-2 text-xs"
            >
              <span className="text-muted shrink-0 font-mono">{ROTULO[query.kind]}</span>
              <span className="text-ink min-w-0 flex-1 font-mono break-words">{query.text}</span>
              <span
                className={
                  destaque ? 'text-success shrink-0 font-mono' : 'text-muted shrink-0 font-mono'
                }
              >
                {query.topSimilarity.toFixed(4)}
                {destaque && (
                  <>
                    {' '}
                    <span aria-hidden="true">★</span>
                    <span className="sr-only">melhor similaridade</span>
                  </>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
