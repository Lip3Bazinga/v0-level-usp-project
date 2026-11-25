import { describe, expect, it } from "vitest"
import { detectMemoryLimitMb, loadConfig, parseBatchMemory, parseMemorySize, parsePyodidePolicy, resolveMemoryBudgetMb } from "../src/config"

const BASE_ENV = { PYTHON_WASI_DIR: "/opt/levelusp-python", WASMTIME_BIN: "/usr/bin/true" }
const DEV_ENV = { ...BASE_ENV, NODE_ENV: "development", RUNNER_TOKEN: "levelusp-dev-runner-token-0123456789" }

describe("loadConfig", () => {
  it("recusa em produção o token de dev/CI publicado no repositório", () => {
    const env = { ...BASE_ENV, NODE_ENV: "production", RUNNER_TOKEN: "levelusp-dev-runner-token-0123456789" }
    expect(() => loadConfig(env)).toThrow(/RUNNER_TOKEN/)
  })

  it("aceita em produção um token gerado", () => {
    const env = { ...BASE_ENV, NODE_ENV: "production", RUNNER_TOKEN: "9f2c4e7a1b3d5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6" }
    expect(loadConfig(env).RUNNER_TOKEN).toBe(env.RUNNER_TOKEN)
  })

  it("aceita o token de dev fora de produção", () => {
    const env = { ...BASE_ENV, NODE_ENV: "development", RUNNER_TOKEN: "levelusp-dev-runner-token-0123456789" }
    expect(() => loadConfig(env)).not.toThrow()
  })
})

describe("configuração do orçamento de memória", () => {
  it("lê tamanhos no formato do Docker, em MB", () => {
    expect(parseMemorySize("6g")).toBe(6144)
    expect(parseMemorySize("1536m")).toBe(1536)
    expect(parseMemorySize(" 1.5G ")).toBe(1536)
    expect(parseMemorySize("2097152k")).toBe(2048)
    expect(parseMemorySize("1073741824")).toBe(1024)
    expect(parseMemorySize("4gb")).toBe(4096)
    expect(parseMemorySize("unlimited")).toBe(Number.POSITIVE_INFINITY)
    for (const invalid of ["", "seis", "6t", "-1g", "0", "g"]) expect(() => parseMemorySize(invalid)).toThrow(/RUNNER_MEMORY/)
  })

  it("lê os pesos por perfil e completa com os padrões", () => {
    expect(parseBatchMemory("")).toEqual({ python: 0, dados: 256, ml: 1229 })
    expect(parseBatchMemory("ml:1500")).toEqual({ python: 0, dados: 256, ml: 1500 })
    expect(parseBatchMemory("python:64, dados:300,ml:1400")).toEqual({ python: 64, dados: 300, ml: 1400 })
    expect(() => parseBatchMemory("gpu:1")).toThrow(/RUNNER_BATCH_MEMORY_MB/)
    expect(() => parseBatchMemory("ml:muito")).toThrow(/RUNNER_BATCH_MEMORY_MB/)
  })

  it("lê a política única ou por perfil", () => {
    expect(parsePyodidePolicy("fresh")).toEqual({ dados: "fresh", ml: "fresh" })
    expect(parsePyodidePolicy("reuse")).toEqual({ dados: "reuse", ml: "reuse" })
    expect(parsePyodidePolicy("dados:fresh, ml:reuse")).toEqual({ dados: "fresh", ml: "reuse" })
    expect(parsePyodidePolicy("ml:reuse")).toEqual({ dados: "fresh", ml: "reuse" })
    expect(() => parsePyodidePolicy("ml:sempre")).toThrow(/RUNNER_PYODIDE_POLICY/)
    expect(() => parsePyodidePolicy("gpu:reuse")).toThrow(/RUNNER_PYODIDE_POLICY/)
    expect(() => parsePyodidePolicy("")).toThrow(/RUNNER_PYODIDE_POLICY/)
  })

  it("padrões: política fresh nos dois perfis, reserva de 512 MB e pesos medidos", () => {
    const config = loadConfig(DEV_ENV)
    expect(config.RUNNER_PYODIDE_POLICY).toEqual({ dados: "fresh", ml: "fresh" })
    expect(config.RUNNER_MEMORY).toBeUndefined()
    expect(config.RUNNER_MEMORY_RESERVE_MB).toBe(512)
    expect(config.RUNNER_BATCH_MEMORY_MB).toEqual({ python: 0, dados: 256, ml: 1229 })
  })

  it("orçamento = limite − reserva; sem RUNNER_MEMORY usa o limite detectado", () => {
    const config = loadConfig({ ...DEV_ENV, RUNNER_MEMORY: "6g", RUNNER_PYODIDE_POLICY: "dados:fresh,ml:reuse" })
    expect(config.RUNNER_MEMORY).toBe(6144)
    expect(config.RUNNER_PYODIDE_POLICY).toEqual({ dados: "fresh", ml: "reuse" })
    expect(resolveMemoryBudgetMb(config, 99_999)).toBe(5632)
    expect(resolveMemoryBudgetMb(loadConfig({ ...DEV_ENV, RUNNER_MEMORY: "" }), 4096)).toBe(3584)
    expect(resolveMemoryBudgetMb(loadConfig({ ...DEV_ENV, RUNNER_MEMORY_RESERVE_MB: "1024" }), 4096)).toBe(3072)
    expect(resolveMemoryBudgetMb(loadConfig({ ...DEV_ENV, RUNNER_MEMORY: "256m" }), 4096)).toBe(0)
    expect(resolveMemoryBudgetMb(loadConfig({ ...DEV_ENV, RUNNER_MEMORY: "unlimited" }), 4096)).toBe(Number.POSITIVE_INFINITY)
  })

  it("recusa valores inválidos com o nome da variável", () => {
    expect(() => loadConfig({ ...DEV_ENV, RUNNER_MEMORY: "muito" })).toThrow(/RUNNER_MEMORY/)
    expect(() => loadConfig({ ...DEV_ENV, RUNNER_BATCH_MEMORY_MB: "ml:x" })).toThrow(/RUNNER_BATCH_MEMORY_MB/)
    expect(() => loadConfig({ ...DEV_ENV, RUNNER_PYODIDE_POLICY: "sempre" })).toThrow(/RUNNER_PYODIDE_POLICY/)
  })

  it("detecta um limite positivo que não passa da memória da máquina", () => {
    const detected = detectMemoryLimitMb()
    expect(detected).toBeGreaterThan(0)
    expect(Number.isFinite(detected)).toBe(true)
  })
})
