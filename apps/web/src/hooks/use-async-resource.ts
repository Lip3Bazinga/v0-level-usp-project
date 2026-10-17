"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DependencyList } from "react"
import { getErrorMessage, isAbortError } from "@/lib/api"

export type AsyncResourceState<T> =
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T }

export type AsyncResource<T> = AsyncResourceState<T> & {
  /**
   * Busca de novo sem voltar para "loading": a tela continua mostrando os dados
   * atuais até a nova resposta chegar, e uma falha nessa nova busca não apaga
   * dados já carregados. A promessa resolve quando a resposta chega.
   */
  reload: () => Promise<void>
  /** Atualização local (ex.: otimista) dos dados já carregados; ignorada fora de "success". */
  setData: (update: (current: T) => T) => void
}

export interface AsyncResourceOptions {
  /**
   * Texto do estado de erro. Uma string é o fallback para erros que não vêm da API
   * (a mensagem da API tem precedência); uma função decide para qualquer erro.
   */
  errorMessage?: string | ((error: unknown) => string)
}

export type AsyncLoader<T> = (signal: AbortSignal) => Promise<T>

interface Snapshot<T> {
  depsVersion: number
  state: AsyncResourceState<T>
}

const LOADING: AsyncResourceState<never> = { status: "loading" }

function describeError(error: unknown, errorMessage: AsyncResourceOptions["errorMessage"]): string {
  return typeof errorMessage === "function" ? errorMessage(error) : getErrorMessage(error, errorMessage)
}

function areDepsEqual(previous: DependencyList, next: DependencyList): boolean {
  return previous.length === next.length && previous.every((value, index) => Object.is(value, next[index]))
}

/**
 * Versão que incrementa quando algum item de `deps` muda (comparação rasa, como no
 * `useEffect`). Ajustar estado durante a renderização é o padrão recomendado pelo
 * React para derivar de props anteriores, sem um efeito extra.
 */
function useDepsVersion(deps: DependencyList): number {
  const [tracked, setTracked] = useState({ deps, version: 0 })
  if (areDepsEqual(tracked.deps, deps)) return tracked.version
  const next = { deps, version: tracked.version + 1 }
  setTracked(next)
  return next.version
}

/**
 * Busca assíncrona com estado em união discriminada. Ao mudar `deps`, volta para
 * "loading" e cancela a busca anterior (o `signal` é abortado e a resposta
 * obsoleta é descartada), então uma resposta lenta nunca sobrescreve uma nova.
 *
 * O `signal` serve para loaders que aceitam cancelamento (ex.: `fetch`); os demais
 * podem ignorá-lo, já que a resposta obsoleta é descartada de qualquer forma.
 *
 * @example
 * const lesson = useAsyncResource(() => fetchLesson(lessonId), [lessonId])
 * if (lesson.status === "loading") return <Spinner />
 */
export function useAsyncResource<T>(
  loader: AsyncLoader<T>,
  deps: DependencyList,
  { errorMessage }: AsyncResourceOptions = {},
): AsyncResource<T> {
  const depsVersion = useDepsVersion(deps)
  const [snapshot, setSnapshot] = useState<Snapshot<T> | null>(null)
  const loaderRef = useRef(loader)
  const errorMessageRef = useRef(errorMessage)
  const requestIdRef = useRef(0)
  const controllerRef = useRef<AbortController | null>(null)

  useLayoutEffect(() => {
    loaderRef.current = loader
    errorMessageRef.current = errorMessage
  })

  const run = useCallback(async (version: number, { isReload }: { isReload: boolean }) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const requestId = ++requestIdRef.current

    let state: AsyncResourceState<T>
    try {
      state = { status: "success", data: await loaderRef.current(controller.signal) }
    } catch (error) {
      if (isAbortError(error)) return
      state = { status: "error", error: describeError(error, errorMessageRef.current) }
    }
    if (requestId !== requestIdRef.current) return
    setSnapshot((current) => {
      const keepsLoadedData =
        isReload && state.status === "error" && current?.depsVersion === version && current.state.status === "success"
      return keepsLoadedData ? current : { depsVersion: version, state }
    })
  }, [])

  useEffect(() => {
    void run(depsVersion, { isReload: false })
    return () => controllerRef.current?.abort()
  }, [depsVersion, run])

  const reload = useCallback(() => run(depsVersion, { isReload: true }), [depsVersion, run])

  const setData = useCallback((update: (current: T) => T) => {
    setSnapshot((current) => {
      if (!current || current.state.status !== "success") return current
      return { ...current, state: { status: "success", data: update(current.state.data) } }
    })
  }, [])

  const state = snapshot?.depsVersion === depsVersion ? snapshot.state : LOADING
  return { ...state, reload, setData }
}
