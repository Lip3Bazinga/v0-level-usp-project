/**
 * Testes da mesclagem de CSV, do `ambiente.json` e dos resumos (rodam com `node --test scripts/bench/lib/dados.test.mts`).
 * Usam pastas temporárias fora do repositório.
 */
import assert from "node:assert/strict"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { after, test } from "node:test"
import { mergeCsv, registerRound } from "./dados.mts"
import { parseExecutorConfig, politicaDoPerfil } from "./executor.mts"
import { readCsv } from "./estatistica.mts"
import { resumoLatencia, resumoSaturacao } from "./resumos.mts"

const tmp = mkdtempSync(path.join(os.tmpdir(), "bench-dados-"))
after(() => rmSync(tmp, { recursive: true, force: true }))

const HEADER = ["motor", "usuarios", "p95_ms"] as const
const chave = (linha: Record<string, string>): string => `${linha.motor}|${linha.usuarios}`

test("mergeCsv cria o arquivo e depois troca só as chaves medidas", () => {
  const file = path.join(tmp, "carga.csv")
  mergeCsv(file, HEADER, chave, [["python", 10, 100], ["python", 25, 200], ["ml", 10, 900]])
  const result = mergeCsv(file, HEADER, chave, [["ml", 10, 800], ["ml", 25, 1000]])
  assert.deepEqual(result, { substituidas: 1, preservadas: 2, gravadas: 4 })
  const rows = readCsv(file).map((row) => `${row.motor}|${row.usuarios}|${row.p95_ms}`)
  assert.deepEqual(rows, ["python|10|100", "python|25|200", "ml|10|800", "ml|25|1000"])
})

test("mergeCsv recusa cabeçalho diferente e não altera o arquivo", () => {
  const file = path.join(tmp, "outro.csv")
  writeFileSync(file, "motor,n\npython,1\n", "utf8")
  assert.throws(() => mergeCsv(file, HEADER, chave, [["ml", 10, 1]]), /cabeçalho/)
  assert.equal(readFileSync(file, "utf8"), "motor,n\npython,1\n")
})

test("registerRound acumula rodadas e preserva seção do formato antigo", () => {
  registerRound(tmp, "carga", { motores: ["python"] })
  registerRound(tmp, "carga", { motores: ["ml"] })
  writeFileSync(path.join(tmp, "ambiente.json"), JSON.stringify({ latencia: { node: "v1", parametros: { a: 1 } } }), "utf8")
  registerRound(tmp, "latencia", { motores: ["ml"] })
  registerRound(tmp, "carga", { motores: ["dados"] })
  const json = JSON.parse(readFileSync(path.join(tmp, "ambiente.json"), "utf8")) as { latencia: { rodadas: Record<string, unknown>[] }; carga: { rodadas: Record<string, unknown>[] } }
  assert.equal(json.latencia.rodadas.length, 2)
  assert.equal(json.latencia.rodadas[0]?.formato_anterior, true)
  assert.equal(json.latencia.rodadas[0]?.node, "v1")
  assert.deepEqual(json.carga.rodadas.map((rodada) => rodada.motores), [["dados"]])
  registerRound(tmp, "carga", { motores: ["python"] })
  const depois = JSON.parse(readFileSync(path.join(tmp, "ambiente.json"), "utf8")) as { carga: { rodadas: unknown[] } }
  assert.equal(depois.carga.rodadas.length, 2)
})

test("registerRound não sobrescreve JSON ilegível", () => {
  const dir = mkdtempSync(path.join(tmp, "ruim-"))
  writeFileSync(path.join(dir, "ambiente.json"), "{quebrado", "utf8")
  assert.throws(() => registerRound(dir, "carga", {}), /JSON válido/)
  assert.equal(readFileSync(path.join(dir, "ambiente.json"), "utf8"), "{quebrado")
})

test("resumoSaturacao usa o CSV completo, de várias rodadas", () => {
  const linha = (motor: string, usuarios: string, saturou: string, motivo = ""): Record<string, string> => ({ motor, usuarios, saturou, motivo_saturacao: motivo, limite_p95_ms: "10000", limite_erro: "0.01", regra_saturacao: "regra" })
  const rows = [linha("python", "10", "false"), linha("python", "100", "false"), linha("ml", "50", "false"), linha("ml", "100", "true", "p95 alto"), linha("ml", "25", "false")]
  const resumo = resumoSaturacao(rows)
  assert.deepEqual(resumo[0], ["python", null, "não saturou até N=100", 10000, 0.01, 100, "regra"])
  assert.deepEqual(resumo[1], ["ml", 100, "p95 alto", 10000, 0.01, 50, "regra"])
})

test("resumoLatencia agrupa por cenário, condição e política e ignora status != 200", () => {
  const base = { cenario: "d", via: "api", motor: "ml", politica_pyodide: "reuse", status: "200", runner_exec_ms: "100", sobrecarga_ms: "10" }
  const rows = [
    { ...base, condicao: "quente", total_ms: "120" },
    { ...base, condicao: "quente", total_ms: "140" },
    { ...base, condicao: "quente", total_ms: "999", status: "503" },
    { ...base, condicao: "frio_pool", total_ms: "900" },
  ]
  const resumo = resumoLatencia(rows)
  assert.equal(resumo.length, 2)
  assert.equal(resumo[0]?.[4], 2)
  assert.equal(resumo[0]?.at(-1), "reuse")
})

test("parseExecutorConfig aceita política em texto ou objeto e memória ausente", () => {
  const stats = { now: 0, capacity: 4, maxQueue: 10, active: 0, pending: 0, peakPending: 0, jobs: { completed: 0, rejected: 0, cancelled: 0, failed: 0 }, recent: [], engines: {} }
  const texto = parseExecutorConfig({ pyodide: { policy: "fresh", warm: { dados: 1, ml: 0 } } }, stats)
  assert.equal(texto.memory, null)
  assert.equal(politicaDoPerfil(texto, "ml"), "fresh")
  assert.equal(politicaDoPerfil(texto, null), null)
  const objeto = parseExecutorConfig({ pyodide: { policy: { dados: "fresh", ml: "reuse" } } }, { ...stats, memory: { limitMb: 4096, usedMb: 512, peakUsedMb: 900, blocked: 0 } })
  assert.equal(politicaDoPerfil(objeto, "ml"), "reuse")
  assert.deepEqual(objeto.memory, { limitMb: 4096, usedMb: 512, peakUsedMb: 900, blocked: 0 })
  assert.equal(parseExecutorConfig(null, null).capacity, null)
  assert.deepEqual(texto.pool_ocioso_no_instante, { dados: 1, ml: 0 })
})
