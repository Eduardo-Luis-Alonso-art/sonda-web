import type { ProjectResolution } from './projectResolution'

/**
 * O que mostrar quando o `?project=` da URL não resolve num projeto só.
 *
 * Os dois casos pedem textos diferentes: "não existe" é link velho ou nome errado; "ambíguo" é
 * uma coincidência real de nomes, e aí o que o usuário precisa ver é o caminho de cada candidato,
 * que é o único dado que os distingue. Devolver `null` nos casos resolvidos deixa o chamador
 * renderizar isto sem `if` em volta.
 */
export function ProjectResolutionMessage({ resolution }: { resolution: ProjectResolution | null }) {
  if (resolution === null || resolution.kind === 'found') return null

  if (resolution.kind === 'notFound') {
    return (
      <div
        role="alert"
        className="bg-surface border-line border-l-danger flex flex-col gap-2 rounded-lg border border-l-4 p-4 text-sm"
      >
        <p className="text-ink">
          Nao existe projeto chamado <span className="font-mono">{resolution.requestedName}</span>.
        </p>
        <p className="text-muted text-xs">
          O link pode ser de outra maquina, ou o projeto pode ter deixado de ser registrado na API.
          Escolha um projeto na lista acima.
        </p>
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="bg-surface border-line border-l-warning flex flex-col gap-2 rounded-lg border border-l-4 p-4 text-sm"
    >
      <p className="text-ink">
        Ha {resolution.candidates.length} projetos chamados{' '}
        <span className="font-mono">{resolution.requestedName}</span>.
      </p>
      <p className="text-muted text-xs">
        O nome nao basta para saber qual voce quer, e abrir um deles no chute poderia mostrar o
        codigo errado. Escolha pelo caminho:
      </p>
      <ul className="text-muted flex flex-col gap-1 font-mono text-xs">
        {resolution.candidates.map((candidate) => (
          <li key={candidate.id} className="break-all">
            {candidate.localPath}
          </li>
        ))}
      </ul>
    </div>
  )
}
