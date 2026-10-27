import '@testing-library/jest-dom/vitest'

/*
 * O jsdom nao implementa rolagem: `Element.scrollIntoView` e `Element.scrollTo` nao existem, e
 * chama-las lanca TypeError que derruba a renderizacao inteira no teste. Nao e defeito do
 * componente — todo navegador real tem as duas — entao aqui elas viram no-op.
 *
 * Funcao seta de proposito: nenhuma das duas usa `this`, e um `function` dispararia
 * `@typescript-eslint/unbound-method`.
 */
Element.prototype.scrollIntoView = () => undefined
Element.prototype.scrollTo = () => undefined
