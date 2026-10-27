import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ConversationHistory } from '../chat/ConversationHistory'
import { CodeViewer } from '../explorer/CodeViewer'
import { FileErrorCard } from '../explorer/FileErrorCard'
import { FileTree } from '../explorer/FileTree'
import { StaleContentBanner } from '../explorer/StaleContentBanner'
import { ProjectResolutionMessage } from '../projects/ProjectResolutionMessage'
import { ProjectSelector } from '../projects/ProjectSelector'
import { ClearConversationButton } from '../chat/ClearConversationButton'
import { NotSavedWarning } from '../components/NotSavedWarning'
import { UnsupportedFormatCard } from '../components/UnsupportedFormatCard'
import { AnswerCard } from '../components/AnswerCard'
import { CitationChip } from '../components/CitationChip'
import { ErrorCard } from '../components/ErrorCard'
import { PendingAnswer } from '../components/PendingAnswer'
import { QuestionBubble } from '../components/QuestionBubble'
import { QuestionForm } from '../components/QuestionForm'
import { SourceList } from '../components/SourceList'
import { StatementList } from '../components/StatementList'
import { StatusBadge } from '../components/StatusBadge'
import { SearchQueryList } from '../components/SearchQueryList'
import { UsageFooter } from '../components/UsageFooter'
import {
  ANSWERED_FIXTURE,
  ERROR_404_FIXTURE,
  ERROR_410_FIXTURE,
  ERROR_422_FILE_FIXTURE,
  ERROR_NETWORK_FIXTURE,
  FILES_FIXTURE,
  FILE_CONTENT_FIXTURE,
  FILE_CONTENT_STALE_FIXTURE,
  NO_EVIDENCE_FIXTURE,
  PROJECTS_FIXTURE,
} from './fixtures'
import { TOKEN_ROWS } from './tokens'

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-titulo`} className="text-ink font-mono text-sm">
          {title}
        </h2>
        <p className="text-muted max-w-2xl text-xs leading-relaxed">{description}</p>
      </div>
      <div className="border-line rounded-lg border border-dashed p-4">{children}</div>
    </section>
  )
}

/**
 * Referencia visual de tudo que existe na interface, em todos os estados.
 *
 * Existe porque o resultado e conferido por esta pagina — nao pela tela de chat, que depende da
 * API estar no ar, indexada, e que cobra por pergunta. Aqui os estados vem de fixtures das
 * respostas reais, e os quatro que importam (carregando, erro, ANSWERED, NO_EVIDENCE) ficam na
 * mesma rolagem.
 */
/** Projeto usado nos exemplos: e o dono das respostas das fixtures. */
const PETCLINIC = 'spring-petclinic'

export function UiReferencePage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-ink text-lg font-semibold tracking-tight">Sonda — referencia visual</h1>
        <p className="text-muted text-sm">
          Todos os componentes e estados da tela de chat. Dados de fixtures capturadas da API real.
        </p>
        <Link to="/" className="text-accent w-fit rounded text-sm">
          ← voltar para o chat
        </Link>
      </header>

      <Section
        id="tokens"
        title="Tokens de cor"
        description="Unica fonte de cor do projeto, definidos em @theme no index.css. Nenhum componente escreve hex. A coluna de contraste e contra o fundo da pagina (#0B0F14), pela formula da WCAG 2.x: a partir de 4,5 passa AA para texto normal, a partir de 3 passa para componente de interface."
      >
        <table className="w-full text-left text-xs">
          <thead className="text-muted">
            <tr>
              <th scope="col" className="pb-2 font-normal">
                token
              </th>
              <th scope="col" className="pb-2 font-normal">
                hex
              </th>
              <th scope="col" className="pb-2 font-normal">
                vs fundo
              </th>
              <th scope="col" className="pb-2 font-normal">
                uso
              </th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {TOKEN_ROWS.map((token) => (
              <tr key={token.name} className="border-line border-t align-top">
                <td className="py-2 pr-3">
                  <span className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="border-line size-3 shrink-0 rounded-sm border"
                      style={{ backgroundColor: token.hex }}
                    />
                    <span className="text-ink">{token.name}</span>
                  </span>
                </td>
                <td className="text-muted py-2 pr-3">{token.hex}</td>
                <td className="text-muted py-2 pr-3">
                  {token.onCanvas === 1 ? '—' : `${token.onCanvas.toFixed(2)}:1`}
                </td>
                <td className="text-muted py-2 font-sans">
                  {token.usage}
                  {token.note !== undefined && (
                    <span className="text-warning block">{token.note}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section
        id="project-selector"
        title="ProjectSelector — escolha de projeto"
        description="Barra de abas e nao <select>: com poucos projetos, ver os dois nomes lado a lado vale mais que economizar largura; um <select> esconderia a existencia do segundo atras de um clique. E um tablist ARIA — o ativo sai em aria-selected, nao so na cor. Teclado: setas esquerda/direita andam, Home/End vao aos extremos, e so a aba ativa fica no caminho do Tab. Medido: branco a 90% sobre o primary da 4,69:1 (a 80% daria 4,05:1 e reprovaria AA)."
      >
        <ProjectSelectorDemo />
      </Section>

      <Section
        id="search-queries"
        title="SearchQueryList — as duas buscas"
        description="Substituiu a linha 'busca:' de texto unico quando o contrato mudou no prompt 8. Agora sao duas consultas embeddadas — a pergunta original e a reescrita em ingles — e o que importa e qual delas achou melhor evidencia: e isso que explica uma boa resposta vinda de uma pergunta mal formulada, ou o contrario. A melhor das duas leva estrela, com texto so para leitor de tela."
      >
        <SearchQueryList queries={ANSWERED_FIXTURE.searchQueries} />
      </Section>

      <Section
        id="project-resolution"
        title="ProjectResolutionMessage — ?project= que nao resolve"
        description="A URL enderecca projeto por NOME, nao por id (id some se o banco for recriado, e nao diz nada a quem recebe o link). O preco e que o schema so garante local_path unico: dois repositorios podem se chamar igual. Os dois casos tem tela propria em vez de abrir o primeiro no chute — no ambiguo o que distingue os candidatos e o caminho, entao e o caminho que aparece."
      >
        <div className="flex flex-col gap-4">
          <ProjectResolutionMessage
            resolution={{ kind: 'notFound', requestedName: 'projeto-que-nao-existe' }}
          />
          <ProjectResolutionMessage
            resolution={{
              kind: 'ambiguous',
              requestedName: 'api',
              candidates: [
                {
                  id: 7,
                  name: 'api',
                  localPath: 'C:\\Users\\Edu\\work\\api',
                  primaryLanguage: 'Java',
                },
                {
                  id: 9,
                  name: 'api',
                  localPath: 'C:\\Users\\Edu\\pessoal\\api',
                  primaryLanguage: 'Go',
                },
              ],
            }}
          />
        </div>
      </Section>

      <Section
        id="status-badge"
        title="StatusBadge"
        description="Pastilha de status. Cor + rotulo + glifo: nunca so a cor, para funcionar em monocromatico e para quem nao distingue verde de ambar."
      >
        <div className="flex flex-wrap gap-3">
          <StatusBadge status="ANSWERED" />
          <StatusBadge status="NO_EVIDENCE" />
        </div>
      </Section>

      <Section
        id="citation-chip"
        title="CitationChip"
        description="Uma citacao. Nome do arquivo em destaque, faixa de linha em accent, e o caminho completo visivel abaixo — nao em tooltip, porque dois arquivos de mesmo nome em pacotes diferentes sao comuns em Java e tooltip nao existe para quem navega por teclado."
      >
        <div className="flex flex-wrap gap-2">
          {ANSWERED_FIXTURE.citations.map((citation, index) => (
            <CitationChip key={index} citation={citation} projectName={PETCLINIC} />
          ))}
          <CitationChip
            citation={{
              sourceId: 'S9',
              path: 'src/main/resources/application.yml',
              startLine: 7,
              endLine: 7,
            }}
            projectName={PETCLINIC}
          />
        </div>
        <p className="text-muted mt-3 text-xs">
          O ultimo exemplo tem faixa de uma linha so: o rotulo mostra 7, nao 7-7.
        </p>
      </Section>

      <Section
        id="statement-list"
        title="StatementList"
        description="A resposta por afirmacao, cada uma com as proprias citacoes abaixo. Preferido ao campo answer cru, que traz os marcadores [Sn: caminho:linhas] embutidos no meio do texto. O segundo item mostra uma afirmacao sem citacao — em ANSWERED isso e defeito, e aparece em vez de ser escondido."
      >
        <StatementList
          statements={[
            ...ANSWERED_FIXTURE.statements.slice(0, 1),
            { text: 'Esta afirmacao chegou sem citacao valida.', citations: [] },
          ]}
          projectName={PETCLINIC}
        />
      </Section>

      <Section
        id="source-list"
        title="SourceList"
        description="Todo o contexto enviado ao modelo, com a similaridade medida de cada bloco. Elemento details nativo, fechado por padrao: e auditoria, nao resposta. Abre com Enter ou Espaco."
      >
        <SourceList sources={ANSWERED_FIXTURE.sources} />
      </Section>

      <Section
        id="usage-footer"
        title="UsageFooter"
        description="Custo por pergunta sempre visivel, nunca atras de um toggle: o produto cobra por pergunta. Os dois exemplos sao os extremos medidos — 15,7 s por US$ 0,0025 e 2,5 s por US$ 0,000047."
      >
        <div className="flex flex-col gap-4">
          <UsageFooter usage={ANSWERED_FIXTURE.usage} durationMs={ANSWERED_FIXTURE.durationMs} />
          <UsageFooter
            usage={NO_EVIDENCE_FIXTURE.usage}
            durationMs={NO_EVIDENCE_FIXTURE.durationMs}
          />
        </div>
      </Section>

      <Section
        id="question-bubble"
        title="QuestionBubble"
        description="A pergunta no historico. Alinhada a direita, preenchida com primary e texto branco (5,37:1). Preserva quebras de linha."
      >
        <QuestionBubble question={ANSWERED_FIXTURE.question} />
      </Section>

      <Section
        id="pending"
        title="PendingAnswer — estado CARREGANDO"
        description="A chamada e sincrona e lenta (medido de 2,5 s a 15,7 s), entao mostramos o tempo decorrido: espera longa precisa parecer progresso, nao travamento. Componente puro, recebe o tempo pronto. Aqui aos 4 s e aos 14 s."
      >
        <div className="flex flex-col gap-4">
          <PendingAnswer elapsedMs={4200} />
          <PendingAnswer elapsedMs={14100} />
        </div>
      </Section>

      <Section
        id="error"
        title="ErrorCard — estado ERRO"
        description="Faixa vermelha, mensagem em pt-BR mapeada do status do problem+json, e o detail tecnico abaixo. Primeiro: o 404 real da API, com botao de repetir. Segundo: falha de transporte, que nao tem status nem corpo."
      >
        <div className="flex flex-col gap-4">
          <ErrorCard error={ERROR_404_FIXTURE} onRetry={() => undefined} />
          <ErrorCard error={ERROR_NETWORK_FIXTURE} />
        </div>
      </Section>

      <Section
        id="answered"
        title="AnswerCard — estado ANSWERED"
        description="Faixa lateral verde, pastilha de sucesso, afirmacoes com citacao, a busca reescrita que foi efetivamente embeddada, o contexto recolhido e o custo. Resposta real do spring-petclinic."
      >
        <AnswerCard response={ANSWERED_FIXTURE} projectName={PETCLINIC} />
      </Section>

      <Section
        id="no-evidence"
        title="AnswerCard — estado NO_EVIDENCE"
        description="Faixa ambar, pastilha de aviso, e um paragrafo dizendo POR QUE nao houve resposta (aqui BELOW_SIMILARITY_THRESHOLD: nada passou do limiar e o modelo de resposta nem foi chamado). Sem citacoes e sem lista de contexto."
      >
        <AnswerCard response={NO_EVIDENCE_FIXTURE} projectName={PETCLINIC} />
      </Section>

      <Section
        id="question-form"
        title="QuestionForm"
        description="Campo de pergunta. Enter envia, Shift+Enter quebra linha, e o botao segue focavel por Tab. Contador de 2.000 caracteres (teto do contrato da API). Primeiro normal, depois desabilitado durante a chamada."
      >
        <div className="flex flex-col gap-4">
          <QuestionForm onSubmit={() => undefined} disabled={false} />
          <QuestionForm onSubmit={() => undefined} disabled={true} />
        </div>
      </Section>

      <Section
        id="history-empty"
        title="ConversationHistory — vazio"
        description="Primeiro acesso. Diz o que a ferramenta faz em vez de deixar a tela muda."
      >
        <ConversationHistory
          turns={[]}
          elapsedMs={0}
          onRetry={() => undefined}
          projects={PROJECTS_FIXTURE}
        />
      </Section>

      <Section
        id="history-full"
        title="ConversationHistory — os quatro estados juntos"
        description="role=log com aria-live=polite: a resposta e anunciada quando chega. Cada turno e focavel e as setas cima/baixo saltam de turno em turno, Home/End vao ao primeiro e ao ultimo. Clique num turno e use as setas para conferir."
      >
        <ConversationHistory
          elapsedMs={6800}
          onRetry={() => undefined}
          projects={PROJECTS_FIXTURE}
          turns={[
            {
              id: 'ref-1',
              question: ANSWERED_FIXTURE.question,
              state: 'answered',
              response: ANSWERED_FIXTURE,
              error: null,
              saved: true,
              createdAt: '2026-10-27T03:04:40Z',
              responseFormat: 1,
            },
            {
              id: 'ref-2',
              question: NO_EVIDENCE_FIXTURE.question,
              state: 'answered',
              response: NO_EVIDENCE_FIXTURE,
              error: null,
              saved: true,
              createdAt: '2026-10-27T03:05:15Z',
              responseFormat: 1,
            },
            {
              id: 'ref-3',
              question: 'Como o PetController valida o tipo do pet?',
              state: 'failed',
              response: null,
              error: ERROR_404_FIXTURE,
              saved: false,
              createdAt: null,
              responseFormat: null,
            },
            {
              id: 'ref-4',
              question: 'Onde fica a configuracao do cache?',
              state: 'pending',
              response: null,
              error: null,
              saved: true,
              createdAt: null,
              responseFormat: null,
            },
          ]}
        />
      </Section>

      <Section
        id="conversation-loading"
        title="Conversa carregando"
        description="Desde o prompt 13 a conversa vem do backend (GET /conversation), nao de memoria. Isso aparece ao trocar de projeto e tambem no F5 — antes o F5 zerava tudo. Recarrega a cada troca, sem cache: medido, 12-18 ms para 8,7 KB, e um cache precisaria ser invalidado ao perguntar, ao limpar e quando outra aba mexe no mesmo projeto."
      >
        <p role="status" className="text-muted text-sm">
          Carregando a conversa deste projeto…
        </p>
      </Section>

      <Section
        id="not-saved"
        title="NotSavedWarning — troca nao gravada"
        description="Aparece quando a API responde com Sonda-Conversation-Saved: false. Discreto de proposito: a pergunta foi respondida e nada falhou para quem perguntou; o unico efeito e que esta troca some num reload, e e so isso que o texto diz. Um cartao vermelho aqui faria duvidar de uma resposta que esta perfeita. Fica ABAIXO da resposta, porque e sobre o destino dela, nao sobre o conteudo."
      >
        <div className="bg-surface border-line flex flex-col gap-3 rounded-lg border p-4">
          <p className="text-ink text-sm">…fim da resposta…</p>
          <NotSavedWarning />
        </div>
      </Section>

      <Section
        id="unsupported-format"
        title="UnsupportedFormatCard — responseFormat desconhecido"
        description="Cada troca gravada carrega um responseFormat (hoje so 1). O contrato de /chat ja mudou uma vez (prompt 8), entao uma troca antiga pode estar num formato que esta versao nao le. A pergunta e o horario ficam na linha do tempo — esconder deixaria buracos sem explicacao — e no lugar da resposta entra este aviso. Nao tentamos renderizar: campos podem ter mudado de lugar, e dado errado com cara de certo e pior que aviso. Cinza neutro, nao vermelho: nao e erro de ninguem."
      >
        <UnsupportedFormatCard responseFormat={7} />
      </Section>

      <Section
        id="clear-conversation"
        title="ClearConversationButton — limpar com confirmacao"
        description="Chama DELETE /conversation, que e destrutivo e nao tem desfazer. A confirmacao e inline, nao window.confirm (sem tema, trava a aba) nem modal (exigiria focus trap para duas palavras). Abrir move o foco para Apagar e Escape cancela. O nome do projeto vai no texto porque a acao e por projeto. Medido: o texto do botao e ESCURO sobre o vermelho (5,11:1) — branco daria 3,76:1 e reprovaria AA. Clique para ver os dois estados."
      >
        <ClearConversationButton
          project={
            PROJECTS_FIXTURE[0] ?? { id: 1, name: 'demo', localPath: '/x', primaryLanguage: null }
          }
          disabled={false}
          onConfirm={() => undefined}
        />
      </Section>

      <Section
        id="file-tree"
        title="FileTree — arvore de arquivos"
        description="Montada no cliente a partir da lista plana de GET /files; a API nao devolve arvore de proposito. Pastas antes de arquivos. E uma tree ARIA de verdade: cada linha tem role=treeitem com aria-level e, nas pastas, aria-expanded. Teclado: setas cima/baixo andam pelas linhas visiveis, direita abre a pasta (e de novo desce para o filho), esquerda fecha ou sobe para a mae, Home/End vao aos extremos, Enter abre o arquivo. So a linha ativa fica no caminho do Tab."
      >
        <FileTreeDemo />
      </Section>

      <Section
        id="code-viewer"
        title="CodeViewer — visualizador com faixa citada"
        description="highlight.js (27 KB gzip com as 18 linguagens que a API emite; o Shiki media 314 KB mais 466 KB de WASM). Ele emite classes CSS, nunca cor inline, entao o tema vem dos tokens. A faixa citada ganha fundo E barra lateral em accent: o fundo sozinho da 1,32:1 contra o painel, fraco demais para ser o unico sinal. Ao chegar por link de citacao a faixa e centralizada automaticamente. Aqui as linhas 14 a 16."
      >
        <div className="h-80">
          <CodeViewer file={FILE_CONTENT_FIXTURE} highlightRange={{ startLine: 14, endLine: 16 }} />
        </div>
      </Section>

      <Section
        id="stale-banner"
        title="StaleContentBanner — conteudo desatualizado"
        description="Aparece quando contentMayBeStale vem true, ou seja, o hash do disco difere do gravado na indexacao. O texto fala das citacoes e nao so do arquivo: as linhas citadas pelo chat se referem a versao indexada e podem ter se deslocado."
      >
        <StaleContentBanner
          indexedHash={FILE_CONTENT_STALE_FIXTURE.indexedContentHash}
          currentHash={FILE_CONTENT_STALE_FIXTURE.currentContentHash}
        />
      </Section>

      <Section
        id="file-errors"
        title="FileErrorCard — os erros do explorer"
        description="Tratados por codigo, nao numa mensagem unica. 410: o arquivo existia e sumiu — tem acao clara, rodar o sync, e o botao de repetir faz sentido. 422: esta la mas nao e exibivel (binario, nao-UTF-8 ou acima de 2 MB) — SEM botao de repetir, porque na proxima tentativa continuaria igual. 404/500/rede: generico."
      >
        <div className="flex flex-col gap-4">
          <FileErrorCard error={ERROR_410_FIXTURE} onRetry={() => undefined} />
          <FileErrorCard error={ERROR_422_FILE_FIXTURE} onRetry={() => undefined} />
          <FileErrorCard error={ERROR_404_FIXTURE} onRetry={() => undefined} />
          <FileErrorCard error={ERROR_NETWORK_FIXTURE} onRetry={() => undefined} />
        </div>
      </Section>
    </div>
  )
}

/** Interativo de proposito: a referencia so serve se der para trocar de aba e usar as setas. */
function ProjectSelectorDemo() {
  const [selecionado, setSelecionado] = useState(PROJECTS_FIXTURE[0] ?? null)
  return (
    <ProjectSelector projects={PROJECTS_FIXTURE} selected={selecionado} onSelect={setSelecionado} />
  )
}

/** A arvore e interativa: a referencia visual so serve se der para abrir pasta e usar as setas. */
function FileTreeDemo() {
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set(['src', 'src/main']))
  const [selected, setSelected] = useState(FILES_FIXTURE[3]?.path ?? null)
  const [active, setActive] = useState<string | null>(null)

  return (
    <div className="bg-surface border-line max-h-72 overflow-auto rounded-lg border">
      <FileTree
        files={FILES_FIXTURE}
        selectedPath={selected}
        expanded={expanded}
        onToggleFolder={(path, open) => {
          setExpanded((previous) => {
            const next = new Set(previous)
            if (open) next.add(path)
            else next.delete(path)
            return next
          })
        }}
        onSelectFile={(file) => {
          setSelected(file.path)
        }}
        activePath={active}
        onActivePathChange={setActive}
      />
    </div>
  )
}
