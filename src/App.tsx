import { Route, Routes } from 'react-router'
import { ChatPage } from './chat/ChatPage'
import { ExplorerPage } from './explorer/ExplorerPage'
import { UiReferencePage } from './ui/UiReferencePage'

/**
 * Rotas da aplicacao.
 *
 * react-router 8 no lugar do switch em `location.pathname` do prompt 4: agora e preciso ler e
 * escrever query params (`?file=...&lines=62-65`) e navegar por link de citacao sem recarregar a
 * pagina. Medido com esbuild: react-router custa 15,0 KB gzip e o wouter 3,0 KB — o wouter daria
 * conta, mas o react-router e o padrao da comunidade, e native de React 19 (peer >= 19.2.7), e a
 * diferenca de 12 KB nao pesa num app que roda em localhost.
 */
export function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/explorer" element={<ExplorerPage />} />
      <Route path="/ui" element={<UiReferencePage />} />
      {/* Qualquer outra URL cai no chat em vez de numa tela branca. */}
      <Route path="*" element={<ChatPage />} />
    </Routes>
  )
}
