import { ApiError, messageForFileStatus } from '../api/errors'
import type { ChatResponse, FileContent, IndexedFileSummary, Project } from '../api/types'

/*
 * Respostas REAIS capturadas do sonda-api rodando contra o spring-petclinic indexado
 * (26/10/2026). Nao sao inventadas: sao o corpo que a API devolveu, so com o campo `answer`
 * preservado como veio, marcadores inclusive.
 */

const OWNER_TESTS =
  'src/test/java/org/springframework/samples/petclinic/owner/OwnerControllerTests.java'

export const ANSWERED_FIXTURE: ChatResponse = {
  repositoryId: 1,
  question: 'Quais validacoes sao feitas no telefone do dono?',
  status: 'ANSWERED',
  noEvidenceReason: null,
  answer:
    'No teste processCreationFormSuccess, o telefone é aceito quando contém uma sequência numérica válida. ' +
    `[S1: ${OWNER_TESTS}:117-121] ` +
    'No teste processCreationFormHasErrors, a ausência do telefone gera erro de validação no campo telephone. ' +
    `[S1: ${OWNER_TESTS}:127-132] ` +
    'No teste processUpdateOwnerFormHasErrors, o telefone vazio gera erro de validação no campo telephone. ' +
    `[S1: ${OWNER_TESTS}:272-279]`,
  statements: [
    {
      text: 'No teste processCreationFormSuccess, o telefone é aceito quando contém uma sequência numérica válida.',
      citations: [{ sourceId: 'S1', path: OWNER_TESTS, startLine: 117, endLine: 121 }],
    },
    {
      text: 'No teste processCreationFormHasErrors, a ausência do telefone gera erro de validação no campo telephone.',
      citations: [{ sourceId: 'S1', path: OWNER_TESTS, startLine: 127, endLine: 132 }],
    },
    {
      text: 'No teste processUpdateOwnerFormHasErrors, o telefone vazio gera erro de validação no campo telephone.',
      citations: [{ sourceId: 'S1', path: OWNER_TESTS, startLine: 272, endLine: 279 }],
    },
  ],
  citations: [
    { sourceId: 'S1', path: OWNER_TESTS, startLine: 117, endLine: 121 },
    { sourceId: 'S1', path: OWNER_TESTS, startLine: 127, endLine: 132 },
    { sourceId: 'S1', path: OWNER_TESTS, startLine: 272, endLine: 279 },
  ],
  uncitedStatements: 0,
  sources: [
    { sourceId: 'S1', path: OWNER_TESTS, startLine: 101, endLine: 318, similarity: 0.4533 },
    {
      sourceId: 'S2',
      path: 'src/main/java/org/springframework/samples/petclinic/owner/PetValidator.java',
      startLine: 1,
      endLine: 60,
      similarity: 0.4411,
    },
    {
      sourceId: 'S3',
      path: 'src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java',
      startLine: 101,
      endLine: 160,
      similarity: 0.4397,
    },
    { sourceId: 'S4', path: OWNER_TESTS, startLine: 1, endLine: 60, similarity: 0.4309 },
  ],
  // Contrato do prompt 8: a ORIGINAL sempre primeiro, a REWRITTEN quando difere dela, cada uma
  // com a melhor similaridade que ELA encontrou.
  searchQueries: [
    {
      kind: 'ORIGINAL',
      text: 'Quais validacoes sao feitas no telefone do dono?',
      topSimilarity: 0.4108,
    },
    {
      kind: 'REWRITTEN',
      text: 'phone number validation owner validatePhone isValidPhoneNumber Owner class OwnerController phone validation logic',
      topSimilarity: 0.4533,
    },
  ],
  usage: {
    chatModel: 'gpt-4.1-mini',
    embeddingTokens: 26,
    chatPromptTokens: 5419,
    chatCachedPromptTokens: 0,
    chatCompletionTokens: 190,
    estimatedCostUsd: 0.00247212,
  },
  durationMs: 15677,
}

export const NO_EVIDENCE_FIXTURE: ChatResponse = {
  repositoryId: 1,
  question: 'Qual e a receita de bolo de chocolate alemao com morangos?',
  status: 'NO_EVIDENCE',
  noEvidenceReason: 'BELOW_SIMILARITY_THRESHOLD',
  answer:
    'Não encontrei no código indexado nenhum trecho relevante para essa pergunta (maior similaridade 0.18, abaixo do limiar 0.42). Nenhuma resposta foi gerada, para não inventar sem evidência.',
  statements: [
    {
      text: 'Não encontrei no código indexado nenhum trecho relevante para essa pergunta (maior similaridade 0.18, abaixo do limiar 0.42). Nenhuma resposta foi gerada, para não inventar sem evidência.',
      citations: [],
    },
  ],
  citations: [],
  uncitedStatements: 0,
  sources: [],
  searchQueries: [
    {
      kind: 'ORIGINAL',
      text: 'Qual e a receita de bolo de chocolate alemao com morangos?',
      topSimilarity: 0.1802,
    },
    {
      kind: 'REWRITTEN',
      text: 'recipe chocolate cake German strawberries ingredients instructions cooking steps',
      topSimilarity: 0.1533,
    },
  ],
  usage: {
    chatModel: 'gpt-4.1-mini',
    embeddingTokens: 9,
    chatPromptTokens: 82,
    chatCachedPromptTokens: 0,
    chatCompletionTokens: 9,
    estimatedCostUsd: 0.00004738,
  },
  durationMs: 2474,
}

/** Erro 404 real da API, conferido por curl. */
export const ERROR_404_FIXTURE = new ApiError(
  'Projeto nao encontrado. A lista de projetos pode estar desatualizada — recarregue a pagina.',
  {
    status: 404,
    technicalDetail: 'Projeto 999 nao encontrado',
    problem: {
      type: 'about:blank',
      title: 'Projeto nao encontrado',
      status: 404,
      detail: 'Projeto 999 nao encontrado',
      instance: '/api/projects/999/chat',
    },
  },
)

/** Falha de transporte: API fora do ar, ou CORS nao liberado. Nao tem corpo nem status. */
export const ERROR_NETWORK_FIXTURE = new ApiError(
  'Nao foi possivel falar com a API da Sonda. Confira se ela esta rodando na porta 8080.',
)

/* ---------------------------------------------------------------- explorer de arquivos */

/** Recorte REAL da listagem do petclinic (116 arquivos), conferido por curl na 8080. */
export const FILES_FIXTURE: IndexedFileSummary[] = [
  {
    id: 3,
    path: '.editorconfig',
    language: null,
    chunkCount: 1,
    indexedAt: '2026-10-26T17:53:51Z',
  },
  {
    id: 1,
    path: '.devcontainer/devcontainer.json',
    language: 'JSON',
    chunkCount: 1,
    indexedAt: '2026-10-26T17:53:51Z',
  },
  {
    id: 11,
    path: 'build.gradle',
    language: 'Gradle',
    chunkCount: 2,
    indexedAt: '2026-10-26T17:53:52Z',
  },
  {
    id: 30,
    path: 'src/main/java/org/springframework/samples/petclinic/owner/Owner.java',
    language: 'Java',
    chunkCount: 3,
    indexedAt: '2026-10-26T17:53:52Z',
  },
  {
    id: 31,
    path: 'src/main/java/org/springframework/samples/petclinic/owner/PetValidator.java',
    language: 'Java',
    chunkCount: 1,
    indexedAt: '2026-10-26T17:53:52Z',
  },
  {
    id: 60,
    path: 'src/main/resources/application.properties',
    language: 'Properties',
    chunkCount: 1,
    indexedAt: '2026-10-26T17:53:53Z',
  },
]

const OWNER_SOURCE = `package org.springframework.samples.petclinic.owner;

/**
 * Simple JavaBean domain object representing an owner.
 */
@Entity
@Table(name = "owners")
public class Owner extends Person {

	@Column(name = "address")
	@NotBlank
	private String address;

	@Column(name = "telephone")
	@NotBlank
	@Pattern(regexp = "\\d{10}", message = "{telephone.invalid}")
	private String telephone;

	public String getTelephone() {
		return this.telephone;
	}
}
`

/** Conteudo de arquivo com os hashes batendo — o caso normal. */
export const FILE_CONTENT_FIXTURE: FileContent = {
  fileId: 30,
  projectId: 1,
  path: 'src/main/java/org/springframework/samples/petclinic/owner/Owner.java',
  language: 'Java',
  content: OWNER_SOURCE,
  lineCount: OWNER_SOURCE.split('\n').length - 1,
  sizeBytes: OWNER_SOURCE.length,
  contentMayBeStale: false,
  indexedContentHash: 'a5273cbccaf4993c92cc204c4481d52ebc611b731862f078b203b2a7eefa5f8a',
  currentContentHash: 'a5273cbccaf4993c92cc204c4481d52ebc611b731862f078b203b2a7eefa5f8a',
  indexedAt: '2026-10-26T17:53:52Z',
}

/** O mesmo arquivo depois de mudar em disco: hashes divergem. */
export const FILE_CONTENT_STALE_FIXTURE: FileContent = {
  ...FILE_CONTENT_FIXTURE,
  contentMayBeStale: true,
  currentContentHash: '51c10a6f38aa3dcc1d4b2f0e9a7c3b5d8e2f1a0c9b8d7e6f5a4b3c2d1e0f9a8b',
}

/** 410 real da API: o arquivo sumiu do disco depois de indexado. */
export const ERROR_410_FIXTURE = new ApiError(messageForFileStatus(410), {
  status: 410,
  technicalDetail:
    "O arquivo 'src/main/java/.../Owner.java' nao existe mais em disco. Ele foi removido ou renomeado desde a ultima indexacao — rode o sync para atualizar o indice.",
  problem: {
    type: 'about:blank',
    title: 'Arquivo removido do disco',
    status: 410,
    detail: 'O arquivo nao existe mais em disco.',
    instance: '/api/projects/1/files/30/content',
  },
})

/** 422 real: o conteudo em disco agora nao e exibivel como texto. */
export const ERROR_422_FILE_FIXTURE = new ApiError(messageForFileStatus(422), {
  status: 422,
  technicalDetail:
    "O arquivo 'petclinic.css' tem 3145728 bytes e passa do teto de 2097152 bytes para exibicao.",
  problem: {
    type: 'about:blank',
    title: 'Arquivo nao exibivel',
    status: 422,
    detail: 'Acima do teto de exibicao.',
    instance: '/api/projects/1/files/99/content',
  },
})

/** Os dois projetos realmente registrados na API, conferidos por curl na 8080. */
export const PROJECTS_FIXTURE: Project[] = [
  {
    id: 1,
    name: 'spring-petclinic',
    localPath: 'C:\\Users\\Edu\\Documents\\ProjetosJava\\spring-petclinic',
    primaryLanguage: 'Java',
  },
  {
    id: 2,
    name: 'Grimorio',
    localPath: 'C:\\Users\\Edu\\Desktop\\Grimorio',
    primaryLanguage: 'TypeScript',
  },
]
