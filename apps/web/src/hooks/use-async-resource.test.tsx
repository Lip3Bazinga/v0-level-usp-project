import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { ApiError } from "@/lib/api"
import { useAsyncResource, type AsyncLoader, type AsyncResource } from "./use-async-resource"

const deferred = <T,>() => Promise.withResolvers<T>()

describe("useAsyncResource", () => {
  it("começa em loading e passa para success com os dados", async () => {
    const { result } = renderHook(() => useAsyncResource(async () => "dados", []))
    expect(result.current.status).toBe("loading")
    await waitFor(() => expect(result.current).toMatchObject({ status: "success", data: "dados" }))
  })

  it("usa a mensagem da API no estado de erro", async () => {
    const loader = () => Promise.reject(new ApiError(500, "INTERNAL", "Falha no servidor."))
    const { result } = renderHook(() => useAsyncResource(loader, []))
    await waitFor(() => expect(result.current).toMatchObject({ status: "error", error: "Falha no servidor." }))
  })

  it("usa a mensagem padrão para erros que não vêm da API", async () => {
    const loader = () => Promise.reject(new Error("bug"))
    const { result } = renderHook(() => useAsyncResource(loader, [], { errorMessage: "Não deu." }))
    await waitFor(() => expect(result.current).toMatchObject({ status: "error", error: "Não deu." }))
  })

  it("descarta a resposta obsoleta quando as dependências mudam e aborta o sinal anterior", async () => {
    const pending = { a: deferred<string>(), b: deferred<string>() }
    const signals: AbortSignal[] = []
    const { result, rerender } = renderHook<AsyncResource<string>, { id: keyof typeof pending }>(
      ({ id }) =>
        useAsyncResource<string>((signal) => {
          signals.push(signal)
          return pending[id].promise
        }, [id]),
      { initialProps: { id: "a" } },
    )

    rerender({ id: "b" })
    expect(result.current.status).toBe("loading")
    expect(signals[0]?.aborted).toBe(true)

    await act(async () => pending.b.resolve("B"))
    await act(async () => pending.a.resolve("A"))
    expect(result.current).toMatchObject({ status: "success", data: "B" })
  })

  it("reload busca de novo mantendo os dados atuais até a resposta chegar", async () => {
    let call = 0
    const second = deferred<number>()
    const loader: AsyncLoader<number> = () => (++call === 1 ? Promise.resolve(1) : second.promise)
    const { result } = renderHook(() => useAsyncResource(loader, []))
    await waitFor(() => expect(result.current).toMatchObject({ status: "success", data: 1 }))

    let reloaded: Promise<void> | undefined
    act(() => {
      reloaded = result.current.reload()
    })
    expect(result.current).toMatchObject({ status: "success", data: 1 })

    await act(async () => {
      second.resolve(2)
      await reloaded
    })
    expect(result.current).toMatchObject({ status: "success", data: 2 })
  })

  it("falha no reload não apaga dados já carregados", async () => {
    let call = 0
    const loader: AsyncLoader<string> = () => (++call === 1 ? Promise.resolve("ok") : Promise.reject(new Error("x")))
    const { result } = renderHook(() => useAsyncResource(loader, []))
    await waitFor(() => expect(result.current.status).toBe("success"))
    await act(() => result.current.reload())
    expect(result.current).toMatchObject({ status: "success", data: "ok" })
  })

  it("errorMessage como função decide o texto mesmo para erros da API", async () => {
    const loader = () => Promise.reject(new ApiError(500, "INTERNAL", "Detalhe do servidor."))
    const { result } = renderHook(() => useAsyncResource(loader, [], { errorMessage: () => "Texto fixo." }))
    await waitFor(() => expect(result.current).toMatchObject({ status: "error", error: "Texto fixo." }))
  })

  it("setData altera localmente os dados carregados", async () => {
    const { result } = renderHook(() => useAsyncResource(async () => [1, 2], []))
    await waitFor(() => expect(result.current.status).toBe("success"))
    act(() => result.current.setData((numbers) => [...numbers, 3]))
    expect(result.current).toMatchObject({ status: "success", data: [1, 2, 3] })
  })

  it("não chama o loader de novo se as dependências não mudam", async () => {
    const loader = vi.fn(async () => "x")
    const { result, rerender } = renderHook(() => useAsyncResource(loader, ["fixo"]))
    await waitFor(() => expect(result.current.status).toBe("success"))
    rerender()
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
