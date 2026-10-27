# sonda-web

Frontend da Sonda. Tela de chat sobre um repositório indexado: pergunta em linguagem natural,
resposta com citação de arquivo e linha, ou um "não encontrei" explícito.

Fala com o [`sonda-api`](../../../Documents/ProjetosJava/sonda-api) — que precisa estar rodando na
porta **8080**.

## Stack

| Peça         | Versão  | Observação                                                         |
| ------------ | ------- | ------------------------------------------------------------------ |
| Vite         | 8.3.5   | `create-vite@9.3.1`, template `react-ts`                           |
| React        | 19.3.1  |                                                                    |
| TypeScript   | 6.0.3   | `strict` ligado à mão — o template **não** declara `strict` nenhum |
| Tailwind     | 4.3.3   | plugin `@tailwindcss/vite`, sem `tailwind.config.js` nem PostCSS   |
| Vitest       | 5.0.5   | + Testing Library, ambiente jsdom                                  |
| react-router | 8.5.0   | rotas e query params; peer exige React >= 19.2.7                   |
| highlight.js | 11.12.0 | syntax highlighting, so as 18 linguagens que a API emite           |
| ESLint       | 10.13.0 | flat config, `strictTypeChecked` com tipos                         |
| Prettier     | 3.9.10  | + `prettier-plugin-tailwindcss`                                    |

Duas armadilhas do scaffold atual, confirmadas rodando e não lidas de documentação:

- **`create-vite@9` não gera mais ESLint — gera `oxlint`.** O pedido era ESLint + Prettier, então o
  `oxlint` e o `.oxlintrc.json` foram removidos e o ESLint configurado do zero.
- **`create-vite@9` não liga `strict`.** `tsconfig.app.json` sai sem nenhuma flag de strict mode.
  Aqui estão ligadas `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` e
  `noImplicitOverride`.

Tailwind v4 não usa mais `tailwind.config.js` nem `postcss.config.js`: o tema vive em `@theme`
dentro do próprio CSS, e o plugin entra no `vite.config.ts`.

## Como rodar

```bash
# 1. sonda-api no ar na 8080 (ver README de lá)
# 2. aqui:
npm install
npm run dev     # http://localhost:5173
```

| Script           | O que faz                                                             |
| ---------------- | --------------------------------------------------------------------- |
| `npm run dev`    | dev server na 5173, `strictPort` (é a origem liberada no CORS da API) |
| `npm run build`  | `tsc -b && vite build`                                                |
| `npm test`       | Vitest, uma vez                                                       |
| `npm run lint`   | ESLint                                                                |
| `npm run format` | Prettier, escrevendo                                                  |

Base da API sobrescrevível por `VITE_SONDA_API_BASE_URL` (default `http://localhost:8080`).

### Por que 8080, e não mais 8081

Era 8081 desde o prompt 3, contorno para um conflito local na 8080 que não existe mais. O
`application.yml` do `sonda-api` sempre teve `${SONDA_SERVER_PORT:8080}` — **8080 é o default dele**.
Apontar o front para esse default faz os dois lados conversarem sem variável de ambiente nenhuma;
fixar a API de volta em 8081 significaria gravar o contorno de uma máquina no default de todos.
Nenhuma linha do `sonda-api` mudou.

## Rotas

- `/?project=<nome>` — a tela de chat, no projeto indicado (sem o parâmetro, o primeiro da lista).
- `/explorer?project=<nome>&file=<caminho>&lines=<ini>-<fim>` — árvore de arquivos e visualizador.
- `/ui` — **referência visual**: todos os componentes em todos os estados, com fixtures das
  respostas reais da API. É por ela que o resultado se confere sem gastar chamada paga.

Roteamento por **react-router 8**. Medido com esbuild: react-router 15,0 KB gzip, wouter 3,0 KB —
o wouter daria conta das três rotas, mas o react-router é o padrão, é nativo de React 19 e evita
uma migração quando o app crescer; 12 KB não pesam num app de localhost.

### Vários projetos: o seletor e a URL

Desde o prompt 7 a API tem dois repositórios registrados. O front assumia um só — pegava
`projects[0]` no chat e no explorer. Agora o projeto ativo mora na **URL**, nas duas telas, e o
seletor na tela de chat é quem o troca.

Na URL, e não em `useState`, porque isso resolve quatro coisas de uma vez: o F5 não volta para o
projeto errado, o endereço é compartilhável, o link de uma citação consegue apontar para um projeto
diferente do que está aberto, e chat e explorer concordam sobre qual é o ativo sem estado global.

**O projeto vai por nome, não por id.** O `indexed_repository.id` é mais estável que o `fileId` (um
sync não recria a linha do repositório, que é idempotente por `local_path`), mas some se o banco for
recriado — e `project=1` não diz nada a quem recebe o link, enquanto `project=spring-petclinic` diz.

O preço é que o schema só garante `local_path` único, não `name`: dois repositórios em pastas
diferentes podem se chamar `api`. Em vez de abrir o primeiro no chute, a resolução tem três
resultados e os dois casos ruins têm tela própria:

| Caso       | O que acontece                                                               |
| ---------- | ---------------------------------------------------------------------------- |
| um match   | abre                                                                         |
| nenhum     | "Não existe projeto chamado X", com o seletor logo acima para escolher outro |
| mais de um | lista os **caminhos** dos candidatos — é o único dado que os distingue       |

A comparação é sensível a maiúsculas de propósito: o nome aqui é identidade, não busca.

### A URL do explorer usa caminho, não `fileId`

A API endereça conteúdo por `fileId`, mas a URL do front não. `fileId` é a chave primária da linha
em `indexed_file`: reconstruído o índice, o mesmo arquivo ganha outro id e um link salvo apontaria
para o arquivo errado — ou para um 404 — sem avisar. O caminho relativo é estável entre
reindexações e é exatamente o que a citação do chat carrega. A conversão caminho → id sai da
listagem, que o explorer já carrega para montar a árvore.

`?lines=` aceita `62-65` e `62`. Qualquer outra coisa (`abc`, `0`, `9-2`) vira "sem destaque" — a
URL é editável à mão e compartilhável, então lixo não pode quebrar a tela.

## A conversa é gravada no servidor

Até o prompt 9 o histórico vivia num `Map<projectId, turns>` dentro do `ChatPage`. Desde o prompt
13 ele vem de `GET /api/projects/{id}/conversation`, e **a API é a fonte de verdade** — os dois
mecanismos não coexistem; o mapa em memória foi removido junto com o `useChat`.

### O bug que motivou a troca não era o que parecia

A suspeita era "trocar de aba de projeto apaga a conversa". Medindo no navegador, **isso não
reproduz**: a troca de aba sobrevivia. O gatilho real era **sair da rota do chat**:

| Caminho                           | Antes            | Agora     |
| --------------------------------- | ---------------- | --------- |
| trocar de aba de projeto e voltar | sobrevivia       | sobrevive |
| `chat → arquivos → chat`          | **apagava tudo** | sobrevive |
| F5                                | apagava tudo     | sobrevive |

`ChatPage` desmonta ao sair para `/explorer`, e o `useState` vai junto. Como ir ao explorer é
exatamente o que um clique em citação faz, a perda caía no laço principal do produto — o que
explica por que parecia acontecer "ao trocar de coisa" de modo geral.

### Sem cache: recarrega a cada troca de projeto

Medido contra a API real: **12–18 ms para 8,7 KB**. Um cache precisaria ser invalidado ao
perguntar, ao limpar e quando outra aba do navegador mexe no mesmo projeto — complexidade que 15 ms
não pagam, e cujo modo de falha seria mostrar conversa velha como se fosse verdade.

Enviar continua otimista: a pergunta aparece assim que sai. O que muda é que ela já nasce gravada
do outro lado.

### `Sonda-Conversation-Saved`

O `POST /chat` grava a troca e diz no header se conseguiu. A API o expõe por
`Access-Control-Expose-Headers` — sem isso o navegador nem entregaria o header ao JavaScript, e foi
a primeira coisa conferida. Header ausente conta como **não salvo**: avisar à toa é melhor do que
prometer persistência que não houve.

Quando vem `false`, a troca específica ganha um aviso discreto abaixo da resposta, não um cartão de
erro: a pergunta foi respondida e nada falhou para quem perguntou; o único efeito é que aquela
troca some num reload.

### `responseFormat` desconhecido

Cada troca gravada carrega um `responseFormat` (hoje só `1`). O contrato de `/chat` já mudou uma vez
(prompt 8), então uma troca antiga pode estar num formato que esta versão não lê. Nesse caso a
pergunta e o horário **continuam** na linha do tempo — escondê-la deixaria um buraco inexplicado —
e no lugar da resposta entra um aviso neutro. Não tentamos renderizar: os campos podem ter mudado
de lugar, e dado errado com cara de certo é pior que um aviso.

### Limpar conversa

`DELETE /conversation`, por projeto, com confirmação inline. Inline e não `window.confirm` (não
aceita tema e trava a aba) nem modal (exigiria _focus trap_ e `inert` para duas palavras). Abrir
move o foco para "Apagar"; Escape cancela; o nome do projeto vai no texto porque a ação é por
projeto. Medido: o texto do botão é **escuro** sobre o vermelho (5,11:1) — branco daria 3,76:1 e
reprovaria AA.

## As duas buscas no `AnswerCard`

No prompt 8 a API trocou `searchQuery` (texto único) por `searchQueries`: uma lista de
`{kind, text, topSimilarity}`, com a `ORIGINAL` sempre primeiro e a `REWRITTEN` quando difere dela.
O front ainda lia o campo antigo, então a linha "busca:" aparecia vazia.

O substituto não é a mesma linha com uma lista: o que passou a importar é **qual das duas achou
melhor evidência**, porque é isso que explica uma resposta boa vinda de uma pergunta mal formulada —
ou o contrário. Então cada consulta aparece com a sua similaridade e a melhor leva uma marca (com
texto só para leitor de tela, nunca só o símbolo). Medido contra o petclinic: a pergunta em
português deu 0,4108 e a reescrita em inglês 0,4533.

## Syntax highlighting: highlight.js, não Shiki

Medido com esbuild, bundle minificado, mesmo conjunto de linguagens:

| Lib          | Bundle | Gzip      | Extra                   |
| ------------ | ------ | --------- | ----------------------- |
| highlight.js | 98 KB  | **27 KB** | —                       |
| Shiki        | 991 KB | 314 KB    | + `onig.wasm` de 466 KB |

Dezesseis vezes maior para mostrar um arquivo por vez com uma faixa destacada. E o argumento
decisivo não foi o tamanho: o highlight.js emite **classes CSS** (`hljs-keyword`), sem nenhum hex
embutido — conferido na saída real. O tema mora em `index.css` em cima dos tokens, e a regra "cor
só por token" continua valendo. O Shiki pinta `style="color:#..."` a partir do tema dele.

Spans do highlight.js atravessam linhas (um comentário de bloco, uma string multilinha). Cortar o
HTML na quebra de linha deixaria `<span>` aberto e o navegador "consertaria" vazando a cor do
comentário para o resto do arquivo. `splitHighlightedLines` mantém a pilha de tags e reabre a cada
quebra; tem teste conferindo que toda linha fecha o que abriu.

## Cor: só por token

Todas as cores vivem em `@theme`, em [`src/index.css`](src/index.css). Nenhum componente escreve
hex — só classes do Tailwind geradas a partir dos tokens.

A paleta de partida foi medida contra WCAG AA antes de ser usada, e **duas coisas mudaram**:

| Token     | Valor     | Contraste vs fundo | Mudança                  |
| --------- | --------- | ------------------ | ------------------------ |
| `canvas`  | `#0B0F14` | —                  | —                        |
| `surface` | `#111827` | 1,21:1             | —                        |
| `line`    | `#1F2937` | 1,31:1             | — (divisória decorativa) |
| `ink`     | `#F9FAFB` | 18,39:1            | —                        |
| `muted`   | `#9CA3AF` | 7,57:1             | —                        |
| `primary` | `#5B55E8` | 3,58:1             | **mudou** de `#6366F1`   |
| `accent`  | `#818CF8` | 6,44:1             | **token novo**           |
| `success` | `#22C55E` | 8,43:1             | —                        |
| `warning` | `#F59E0B` | 8,95:1             | —                        |
| `danger`  | `#EF4444` | 5,11:1             | —                        |

Cores do visualizador de código, medidas contra o painel (`surface`) **e** contra o fundo da linha
destacada, porque a citação pinta uma faixa por baixo do código:

| token          | cor       | vs painel | vs linha destacada |
| -------------- | --------- | --------- | ------------------ |
| `code-keyword` | `#C4B5FD` | 9,61:1    | 7,29:1             |
| `code-string`  | `#7EE2A8` | 11,26:1   | 8,54:1             |
| `code-comment` | `#9CA3AF` | 6,99:1    | 5,30:1             |
| `code-number`  | `#FBBF24` | 10,63:1   | 8,06:1             |
| `code-type`    | `#67E8F9` | 12,24:1   | 9,28:1             |
| `code-title`   | `#93C5FD` | 9,84:1    | 7,46:1             |
| `code-attr`    | `#F0ABFC` | 10,08:1   | 7,65:1             |
| `code-literal` | `#FCA5A5` | 9,35:1    | 7,09:1             |

Todas passam AA nos dois fundos. Dois achados da medição: os **números de linha** usam `muted`
porque o cinza mais escuro que se cogitou (`#6B7280`) dava 3,67:1 e reprovava; e o fundo de
destaque (`line-highlight`, accent a 18%) dá só 1,32:1 contra o painel, então a faixa citada também
ganha **barra lateral em `accent`** — o destaque nunca depende só do fundo.

**O que falhou não foi o que se esperava.** `muted` e `warning` passam com folga neste fundo. Quem
reprovou foi o `primary` sugerido, nos dois usos:

- como **preenchimento de botão**, texto branco sobre `#6366F1` dá **4,47:1** — reprova AA (4,5) por
  três centésimos. `#5B55E8` leva o branco a **5,37:1** e o próprio botão mantém 3,58:1 contra o
  fundo, acima dos 3:1 que a WCAG pede para componente de interface.
- como **texto**, `#6366F1` dá **4,30:1**, abaixo de AA. Daí o `accent` `#818CF8` (6,44:1), usado em
  link, faixa de linha da citação e **anel de foco**.

Cor nunca é o único sinal: `ANSWERED` e `NO_EVIDENCE` se distinguem por rótulo, glifo e faixa
lateral, não só por verde x âmbar.

## Acessibilidade

- Foco visível em todo elemento focável, via `:focus-visible` com anel `accent` de 2px e offset.
- Campo de pergunta: Enter envia, Shift+Enter quebra linha; o botão continua focável por Tab.
- Histórico: `role="log"` com `aria-live="polite"` (a resposta é anunciada quando chega). Cada turno
  é focável; ↑/↓ saltam de turno em turno, Home/End vão ao primeiro/último. As setas só agem com o
  foco no turno — dentro de um campo ou `<details>` o navegador segue mandando.
- Erro em `role="alert"`, carregando em `role="status"`.
- Seletor de projeto: `tablist` ARIA. O ativo sai em `aria-selected`, não só na cor. ←/→ andam
  circularmente, Home/End vão aos extremos, e o _roving tabindex_ deixa só a aba ativa no Tab.
  Medido: branco a 90% sobre o `primary` dá 4,69:1 e passa AA — a 80% daria 4,05:1 e reprovaria.
- Árvore de arquivos: `tree` ARIA de verdade, com `treeitem`, `aria-level` e `aria-expanded`.
  Teclado no padrão APG — ↑/↓ pelas linhas visíveis, → abre a pasta (e de novo desce para o filho),
  ← fecha ou sobe para a mãe, Home/End nos extremos, Enter abre. _Roving tabindex_: só a linha ativa
  entra no Tab, em vez de 116 paradas.
- Visualizador de código: painel focável, então ↑/↓/PgUp/PgDn rolam o código sem mouse.
- Citação do chat é um `Link` de verdade, não `div` com `onClick`: ganha abrir-em-nova-aba, menu de
  contexto e teclado de graça, e o `aria-label` descreve o destino por extenso.

## Limitações conhecidas

- **A conversa não é mais efêmera** (mudou no prompt 13): ela é gravada no servidor, por projeto,
  e sobrevive a troca de aba, ida ao explorer e F5. O que ainda não existe é paginação — a
  conversa inteira vem numa resposta só, o que é adequado ao volume atual e não seria para uma
  conversa de centenas de trocas.
- **Sem sincronização entre abas do navegador**: duas abas abertas no mesmo projeto só convergem
  quando a outra recarrega, porque não há cache mas também não há _polling_ nem websocket.
- **Uma pergunta por vez** — o formulário trava durante a chamada. A API é síncrona e cobra por
  pergunta; paralelismo convidaria a gastar sem perceber e embaralharia a ordem do histórico.
- **Citação não é clicável** — não há explorer de arquivos ainda; o caminho e a faixa de linha
  aparecem como texto.
- **A resposta pode demorar.** Medido de 2,5 s (`NO_EVIDENCE`, sem chamar o modelo de resposta) a
  15,7 s (`ANSWERED`) contra o spring-petclinic.
- **Pacote Java profundo come a largura da árvore.** `org/springframework/samples/petclinic/owner`
  são seis níveis de indentação, e nomes longos truncam na barra lateral. O caminho completo está
  no cabeçalho do visualizador, mas a correção natural é o "compact folders" do VS Code: colapsar
  cadeias de pasta com um único filho numa linha só.
- **Sem busca de arquivo** na árvore: com 116 arquivos dá para rolar, com milhares não daria.
- **O arquivo vem inteiro** (teto de 2 MB na API). Não há virtualização: um arquivo de 10 mil linhas
  monta 10 mil `<tr>`.

## O que foi conferido rodando

Chrome **headless** com GPU real (ANGLE / AMD Radeon / Direct3D11), em 1440×900 e em 375×812.

**Por que headless agora, sem perder a garantia.** A janela visível roubava o foco a cada execução.
Foram medidas cinco configurações com o mesmo probe `WEBGL_debug_renderer_info` do prompt 4: _todas_
reportam a mesma GPU real, inclusive `headless: true` — nenhuma cai em SwiftShader. Então não havia
trade-off a resolver. A alternativa "headed com janela fora da tela" renderiza pixel a pixel
idêntico ao headed normal (0 de 8,2 milhões de pixels diferentes), mas a janela **continua virando
foreground** — o teclado iria para uma janela invisível, pior que o problema original. O headless
não tem janela nenhuma.

Diferença medida do headless: ele não reserva os 15 px da barra de rolagem, e o arredondamento de
métrica de texto desloca cada seção em ±1 a 3 px (10 px numa página de 6 500 px). Por isso a
checagem de overflow roda também na largura reduzida, simulando a barra.

O que foi conferido:

- pergunta real contra o `sonda-api`, respondida com citações e custo na tela;
- `ANSWERED`, `NO_EVIDENCE`, carregando e erro, cada um na `/ui`;
- sem rolagem horizontal nos dois tamanhos, inclusive com caminho de arquivo Java longo;
- sem erro de console;
- anel de foco presente e na cor do token;
- **fluxo completo**: pergunta no chat → clique na citação → `Owner.java` aberto, linhas 53-55
  destacadas, rolagem automática até elas e árvore expandida até o arquivo;
- **410 real**: `Owner.java` apagado do petclinic, aviso correto na tela, restaurado por
  `git checkout --` com `git status` limpo no fim;
- **conteúdo defasado real**: arquivo alterado em disco, aviso exibido, restaurado do mesmo jeito;
- **persistência real**: perguntar → **F5 de verdade** → a conversa continua lá; `chat → arquivos
→ chat` idem; limpar o petclinic deixa o Grimório intacto, e ambos sobrevivem ao reload seguinte;
- **os dois projetos, de ponta a ponta**: trocar para o Grimório → perguntar → clicar na citação →
  explorer abre em `Grimório`/`src/components/ui/index.ts` com as linhas 1-23 destacadas; e o mesmo
  de volta no petclinic, abrindo `Owner.java` nas linhas 50-60;
- **citação de projeto diferente do selecionado**: estando o explorer no petclinic, o link de uma
  citação do Grimório troca o projeto, não só o arquivo.

`npm run build`, `npm run lint`, `npm run format:check` e 21 testes do Vitest passando.
