import { useEffect, useState } from 'react'

/**
 * Milissegundos decorridos desde `startedAt`. Com `null`, devolve 0.
 *
 * Recebe o instante de inicio em vez de um booleano de proposito: assim o zerar e DERIVADO, e o
 * unico setState acontece dentro do callback do intervalo — que e a forma legitima de um efeito
 * se inscrever numa fonte externa (o relogio). Com `active: boolean` seria preciso chamar
 * setState(0) no corpo do efeito, o que gera render em cascata (react-hooks/set-state-in-effect).
 *
 * Tick de 250 ms e nao de 1000: com 1 s o contador aparentava pular numeros quando o primeiro
 * tick caia fora de fase com o inicio da chamada.
 */
export function useElapsedMs(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (startedAt === null) return
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 250)
    return () => {
      clearInterval(timer)
    }
  }, [startedAt])

  // Math.max porque `now` pode estar ate 250 ms atrasado em relacao a `startedAt` antes do
  // primeiro tick — nunca mostramos tempo negativo.
  return startedAt === null ? 0 : Math.max(0, now - startedAt)
}
