import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Project } from '../api/types'
import { projectNameById, resolveProject } from './projectResolution'
import { ProjectResolutionMessage } from './ProjectResolutionMessage'
import { ProjectSelector } from './ProjectSelector'

const PETCLINIC: Project = {
  id: 1,
  name: 'spring-petclinic',
  localPath: 'C:\\Users\\Edu\\Documents\\ProjetosJava\\spring-petclinic',
  primaryLanguage: 'Java',
}
/** Nome com acento: é o nome real do segundo projeto registrado, e vai parar na URL. */
const GRIMORIO: Project = {
  id: 2,
  name: 'Grimório',
  localPath: 'C:\\Users\\Edu\\Desktop\\Grimório',
  primaryLanguage: 'TypeScript',
}
const PROJETOS = [PETCLINIC, GRIMORIO]

describe('resolveProject', () => {
  it('sem ?project= na URL, cai no primeiro da lista', () => {
    expect(resolveProject(PROJETOS, null)).toEqual({ kind: 'found', project: PETCLINIC })
    expect(resolveProject(PROJETOS, '')).toEqual({ kind: 'found', project: PETCLINIC })
  })

  it('resolve pelo nome, inclusive com acento', () => {
    expect(resolveProject(PROJETOS, 'Grimório')).toEqual({ kind: 'found', project: GRIMORIO })
  })

  it('nome desconhecido vira notFound, nao o primeiro no chute', () => {
    expect(resolveProject(PROJETOS, 'outro')).toEqual({
      kind: 'notFound',
      requestedName: 'outro',
    })
  })

  it('nome repetido vira ambiguous — o schema so garante local_path unico', () => {
    const a: Project = { id: 7, name: 'api', localPath: '/work/api', primaryLanguage: 'Java' }
    const b: Project = { id: 9, name: 'api', localPath: '/pessoal/api', primaryLanguage: 'Go' }

    expect(resolveProject([a, b], 'api')).toEqual({
      kind: 'ambiguous',
      requestedName: 'api',
      candidates: [a, b],
    })
  })

  it('lista vazia devolve null', () => {
    expect(resolveProject([], null)).toBeNull()
  })

  it('e sensivel a maiusculas: nome e identidade, nao busca', () => {
    expect(resolveProject(PROJETOS, 'SPRING-PETCLINIC')?.kind).toBe('notFound')
  })
})

describe('projectNameById', () => {
  it('resolve o repositoryId de uma resposta no nome do projeto', () => {
    expect(projectNameById(PROJETOS, 2)).toBe('Grimório')
  })

  it('id desconhecido devolve null em vez de chutar', () => {
    expect(projectNameById(PROJETOS, 99)).toBeNull()
  })
})

function SelectorHarness({ onSelect }: { onSelect?: (p: Project) => void } = {}) {
  const [selected, setSelected] = useState<Project | null>(PETCLINIC)
  return (
    <ProjectSelector
      projects={PROJETOS}
      selected={selected}
      onSelect={(project) => {
        setSelected(project)
        onSelect?.(project)
      }}
    />
  )
}

describe('ProjectSelector', () => {
  it('mostra um tab por projeto e marca o ativo', () => {
    render(<SelectorHarness />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(2)
    expect(screen.getByRole('tab', { name: /spring-petclinic/ })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tab', { name: /Grimório/ })).toHaveAttribute('aria-selected', 'false')
  })

  it('o ativo nao e sinalizado so pela cor', () => {
    render(<SelectorHarness />)

    // aria-selected e o que um leitor de tela anuncia; a cor nao chega nele.
    const ativo = screen.getByRole('tab', { selected: true })
    expect(ativo).toHaveTextContent('spring-petclinic')
  })

  it('clicar troca o projeto', async () => {
    const onSelect = vi.fn()
    const user = userEvent.setup()
    render(<SelectorHarness onSelect={onSelect} />)

    await user.click(screen.getByRole('tab', { name: /Grimório/ }))

    expect(onSelect).toHaveBeenCalledWith(GRIMORIO)
    expect(screen.getByRole('tab', { name: /Grimório/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('navega por setas, Home e End, e volta ao inicio circularmente', async () => {
    const user = userEvent.setup()
    render(<SelectorHarness />)

    const petclinic = screen.getByRole('tab', { name: /spring-petclinic/ })
    petclinic.focus()

    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /Grimório/ })).toHaveFocus()
    expect(screen.getByRole('tab', { name: /Grimório/ })).toHaveAttribute('aria-selected', 'true')

    // Circular: da ultima para a primeira.
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /spring-petclinic/ })).toHaveFocus()

    await user.keyboard('{End}')
    expect(screen.getByRole('tab', { name: /Grimório/ })).toHaveFocus()

    await user.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: /spring-petclinic/ })).toHaveFocus()
  })

  it('so a aba ativa fica no caminho do Tab (roving tabindex)', () => {
    render(<SelectorHarness />)

    const tabbaveis = screen.getAllByRole('tab').filter((t) => t.getAttribute('tabindex') === '0')
    expect(tabbaveis).toHaveLength(1)
  })
})

describe('ProjectResolutionMessage', () => {
  it('nao mostra nada quando resolveu', () => {
    const { container } = render(
      <ProjectResolutionMessage resolution={{ kind: 'found', project: PETCLINIC }} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('notFound diz o nome pedido e o que fazer', () => {
    render(<ProjectResolutionMessage resolution={{ kind: 'notFound', requestedName: 'sumido' }} />)

    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('Nao existe projeto chamado')
    expect(alerta).toHaveTextContent('sumido')
  })

  it('ambiguous lista os caminhos, que e o unico dado que distingue os candidatos', () => {
    const a: Project = { id: 7, name: 'api', localPath: '/work/api', primaryLanguage: 'Java' }
    const b: Project = { id: 9, name: 'api', localPath: '/pessoal/api', primaryLanguage: 'Go' }
    render(
      <ProjectResolutionMessage
        resolution={{ kind: 'ambiguous', requestedName: 'api', candidates: [a, b] }}
      />,
    )

    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent('/work/api')
    expect(alerta).toHaveTextContent('/pessoal/api')
  })
})
