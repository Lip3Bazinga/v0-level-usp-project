/**
 * Pasta de dados de uma medição (`--dir-dados`) e gravação que NÃO destrói rodadas anteriores:
 * CSVs são mesclados por chave e `ambiente.json` acumula uma lista de rodadas por seção.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import path from "node:path"
import { type Args, stringOption } from "./args.mts"
import { csvLine, readCsvTable } from "./estatistica.mts"
import { DATA_DIR, nowIso } from "./sistema.mts"

/** Valor de uma célula ao montar linhas de CSV. */
export type Celula = string | number | boolean | null | undefined

/** Resultado de uma mesclagem de CSV. */
export interface ResultadoMesclagem {
  /** Linhas antigas trocadas por linhas novas da mesma chave. */
  substituidas: number
  /** Linhas antigas de outras chaves, mantidas como estavam. */
  preservadas: number
  /** Linhas gravadas agora (total). */
  gravadas: number
}

/** Pasta de dados pedida em `--dir-dados` (padrão `docs/tcc/dados`), como caminho absoluto. */
export function dirDados(args: Args): string {
  return path.resolve(stringOption(args, "dir-dados", DATA_DIR))
}

/** Texto de uma célula como ela fica no arquivo (vazio para `null`/`undefined`). */
function cellText(value: Celula): string {
  return value === null || value === undefined ? "" : String(value)
}

/** Grava o arquivo inteiro de uma vez (arquivo temporário + renomear), sem deixar CSV pela metade. */
function writeWhole(file: string, text: string): void {
  mkdirSync(path.dirname(file), { recursive: true })
  const temp = `${file}.tmp`
  writeFileSync(temp, text, "utf8")
  renameSync(temp, file)
}

/**
 * Regrava `file` trocando só as linhas das chaves medidas agora: as linhas antigas cuja chave
 * aparece em `novas` saem, as demais ficam (na ordem original) e as novas entram no fim.
 * Arquivo inexistente ou vazio é criado com o cabeçalho.
 *
 * @param header colunas esperadas, na ordem.
 * @param chave chave da linha a partir de um registro (coluna → texto).
 * @param novas linhas novas, alinhadas a `header`.
 * @throws Error se o arquivo existe com cabeçalho diferente de `header` (não mistura formatos).
 */
export function mergeCsv(file: string, header: readonly string[], chave: (linha: Record<string, string>) => string, novas: readonly (readonly Celula[])[]): ResultadoMesclagem {
  const novasComoRegistro = novas.map((linha) => Object.fromEntries(header.map((nome, indice) => [nome, cellText(linha[indice])])))
  let antigas: Record<string, string>[] = []
  if (existsSync(file)) {
    const tabela = readCsvTable(file)
    if (tabela.header.length > 0) {
      if (tabela.header.join(",") !== header.join(",")) {
        throw new Error(`${file}: o cabeçalho do arquivo é diferente do que este script grava (formato de outra versão). Esperado: ${header.join(",")}. Encontrado: ${tabela.header.join(",")}. Use outra pasta (--dir-dados) ou mova o arquivo; os formatos não são misturados.`)
      }
      antigas = tabela.rows
    }
  }
  const chavesNovas = new Set(novasComoRegistro.map(chave))
  const mantidas = antigas.filter((linha) => !chavesNovas.has(chave(linha)))
  const todas = [...mantidas, ...novasComoRegistro]
  writeWhole(file, `${[csvLine(header), ...todas.map((linha) => csvLine(header.map((nome) => linha[nome])))].join("\n")}\n`)
  return { substituidas: antigas.length - mantidas.length, preservadas: mantidas.length, gravadas: todas.length }
}

/** Regrava um CSV derivado (resumo) por inteiro, ignorando o que havia (ele é recalculado do CSV completo). */
export function writeDerivedCsv(file: string, header: readonly string[], linhas: readonly (readonly Celula[])[]): void {
  writeWhole(file, `${[csvLine(header), ...linhas.map(csvLine)].join("\n")}\n`)
}

/** Estrutura de uma seção de `ambiente.json`. */
interface SecaoAmbiente {
  rodadas: Record<string, unknown>[]
  [outro: string]: unknown
}

/**
 * Mescla uma rodada em `<dir>/ambiente.json`: a seção guarda `rodadas` (lista) e cada chamada
 * acrescenta uma, com `data` ISO. Seção antiga sem `rodadas` (formato da Fase D) vira a primeira
 * rodada, com `formato_anterior: true`, sem perder campo algum.
 *
 * @throws Error se o arquivo existe mas não é um JSON de objeto (não sobrescreve dado ilegível).
 */
export function registerRound(dir: string, section: string, rodada: Record<string, unknown>): void {
  const file = path.join(dir, "ambiente.json")
  let atual: Record<string, unknown> = {}
  if (existsSync(file)) {
    let parsed: unknown
    try {
      parsed = JSON.parse(readFileSync(file, "utf8"))
    } catch {
      throw new Error(`${file} não é um JSON válido: corrija ou mova o arquivo antes de medir (ele não é sobrescrito).`)
    }
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw new Error(`${file} deveria conter um objeto JSON.`)
    atual = parsed as Record<string, unknown>
  }
  const existente = atual[section]
  let secao: SecaoAmbiente
  if (existente === undefined) secao = { rodadas: [] }
  else if (typeof existente === "object" && existente !== null && Array.isArray((existente as SecaoAmbiente).rodadas)) secao = existente as SecaoAmbiente
  else secao = { rodadas: [{ formato_anterior: true, ...(existente as Record<string, unknown>) }] }
  secao.rodadas.push({ data: nowIso(), ...rodada })
  atual[section] = secao
  writeWhole(file, `${JSON.stringify(atual, null, 2)}\n`)
}
