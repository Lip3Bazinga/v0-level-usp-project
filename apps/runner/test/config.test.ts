import { describe, expect, it } from "vitest"
import { loadConfig } from "../src/config"

const BASE_ENV = { PYTHON_WASI_DIR: "/opt/levelusp-python", WASMTIME_BIN: "/usr/bin/true" }

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
