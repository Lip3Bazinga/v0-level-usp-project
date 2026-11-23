/**
 * Docker nas medições: banco descartável (contêiner + volume com prefixo `levelusp-bench-`),
 * amostragem de `docker stats` e tamanho das imagens.
 *
 * Regra de segurança: este módulo só cria e só APAGA recursos cujo nome começa com
 * {@link BENCH_PREFIX}. O volume de desenvolvimento (`pgdata-dev`) e qualquer outro recurso
 * nunca passam por aqui.
 */
import { randomBytes } from "node:crypto"
import { runProgram, sleep } from "./sistema.mts"

/** Prefixo obrigatório de tudo o que as medições criam no Docker. */
export const BENCH_PREFIX = "levelusp-bench-"
const POSTGRES_IMAGE = "postgres:17-alpine"
const DB_NAME = "levelusp_bench"
const DB_USER = "levelusp_bench"

/** @throws Error se `name` não começa com o prefixo das medições (trava contra apagar o que não é nosso). */
export function assertBenchName(name: string): void {
  if (!name.startsWith(BENCH_PREFIX) || !/^[a-z0-9][a-z0-9_.-]*$/.test(name)) {
    throw new Error(`recusado: "${name}" não é um recurso das medições (precisa começar com ${BENCH_PREFIX})`)
  }
}

/** O Docker responde? */
export async function dockerAvailable(): Promise<boolean> {
  return (await runProgram("docker", ["info", "--format", "{{.ServerVersion}}"], { timeoutMs: 20_000 })).ok
}

/** Banco descartável em execução. */
export interface BenchDatabase {
  container: string
  volume: string
  /** URL de conexão (a senha é aleatória e só existe neste processo). */
  url: string
  hostPort: number
  /** Apaga o contêiner e o volume (idempotente). */
  destroy: () => Promise<void>
}

/**
 * Sobe um PostgreSQL 17 num volume próprio, publicado só em 127.0.0.1 numa porta livre sorteada
 * pelo Docker. Espera o banco aceitar conexões TCP.
 *
 * @throws Error (já com a limpeza feita) se o contêiner não subir.
 */
export async function createBenchDatabase(): Promise<BenchDatabase> {
  const id = `${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`
  const container = `${BENCH_PREFIX}${id}-db`
  const volume = `${BENCH_PREFIX}${id}-pgdata`
  assertBenchName(container)
  assertBenchName(volume)
  const password = randomBytes(18).toString("hex")

  const destroy = async (): Promise<void> => {
    await runProgram("docker", ["rm", "-f", "-v", container], { timeoutMs: 60_000 })
    await runProgram("docker", ["volume", "rm", "-f", volume], { timeoutMs: 60_000 })
  }

  const volumeCreated = await runProgram("docker", ["volume", "create", volume])
  if (!volumeCreated.ok) throw new Error(`não consegui criar o volume ${volume}: ${volumeCreated.stderr.trim()}`)
  const started = await runProgram("docker", [
    "run", "-d", "--name", container,
    "-v", `${volume}:/var/lib/postgresql/data`,
    "-e", `POSTGRES_DB=${DB_NAME}`, "-e", `POSTGRES_USER=${DB_USER}`, "-e", `POSTGRES_PASSWORD=${password}`,
    "-p", "127.0.0.1::5432",
    "--label", "levelusp.bench=1",
    POSTGRES_IMAGE,
  ], { timeoutMs: 300_000 })
  if (!started.ok) {
    await destroy()
    throw new Error(`não consegui subir o PostgreSQL de teste: ${started.stderr.trim()}`)
  }

  const deadline = Date.now() + 90_000
  let ready = false
  while (Date.now() < deadline && !ready) {
    // `-h 127.0.0.1` só responde quando o servidor definitivo sobe (o temporário da inicialização não escuta TCP).
    ready = (await runProgram("docker", ["exec", container, "pg_isready", "-h", "127.0.0.1", "-U", DB_USER, "-d", DB_NAME], { timeoutMs: 10_000 })).ok
    if (!ready) await sleep(1_000)
  }
  const port = await runProgram("docker", ["port", container, "5432/tcp"], { timeoutMs: 10_000 })
  const hostPort = Number(/:(\d+)\s*$/m.exec(port.stdout)?.[1])
  if (!ready || !Number.isInteger(hostPort)) {
    await destroy()
    throw new Error("o PostgreSQL de teste não ficou pronto em 90 s")
  }
  return { container, volume, hostPort, url: `postgres://${DB_USER}:${password}@127.0.0.1:${hostPort}/${DB_NAME}`, destroy }
}

/**
 * Apaga TODOS os contêineres e volumes `levelusp-bench-*` (sobras de uma execução interrompida).
 *
 * @returns os nomes apagados.
 */
export async function cleanBenchResidue(): Promise<string[]> {
  const removed: string[] = []
  const containers = await runProgram("docker", ["ps", "-a", "--filter", `name=${BENCH_PREFIX}`, "--format", "{{.Names}}"])
  for (const name of containers.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith(BENCH_PREFIX))) {
    assertBenchName(name)
    if ((await runProgram("docker", ["rm", "-f", "-v", name])).ok) removed.push(`contêiner ${name}`)
  }
  const volumes = await runProgram("docker", ["volume", "ls", "--filter", `name=${BENCH_PREFIX}`, "--format", "{{.Name}}"])
  for (const name of volumes.stdout.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.startsWith(BENCH_PREFIX))) {
    assertBenchName(name)
    if ((await runProgram("docker", ["volume", "rm", "-f", name])).ok) removed.push(`volume ${name}`)
  }
  return removed
}

/** Uma leitura de `docker stats` de um contêiner. */
export interface ContainerSample {
  container: string
  cpuPercent: number
  memMiB: number
  memLimitMiB: number
}

const UNIT_TO_MIB: Readonly<Record<string, number>> = {
  b: 1 / 1024 ** 2,
  kib: 1 / 1024, kb: 1_000 / 1024 ** 2,
  mib: 1, mb: 1_000_000 / 1024 ** 2,
  gib: 1024, gb: 1_000_000_000 / 1024 ** 2,
  tib: 1024 ** 2, tb: 1_000_000_000_000 / 1024 ** 2,
}

/** "123.4MiB" / "1.5GiB" / "12kB" → MiB; texto inválido → `null`. */
export function parseSizeToMiB(text: string): number | null {
  const match = /^\s*([\d.]+)\s*([a-zA-Z]+)\s*$/.exec(text)
  const factor = match ? UNIT_TO_MIB[(match[2] ?? "").toLowerCase()] : undefined
  if (!match || factor === undefined) return null
  return Number(match[1]) * factor
}

/**
 * Uma leitura instantânea (`docker stats --no-stream`) dos contêineres em execução cujo
 * nome casa com `namePattern` (a leitura leva ~1-2 s).
 *
 * `cpuPercent` é relativo a UM núcleo (200% = dois núcleos ocupados), como o Docker informa.
 */
export async function sampleContainers(namePattern: RegExp): Promise<ContainerSample[]> {
  const result = await runProgram("docker", ["stats", "--no-stream", "--format", "{{json .}}"], { timeoutMs: 30_000 })
  if (!result.ok) return []
  const samples: ContainerSample[] = []
  for (const line of result.stdout.split(/\r?\n/)) {
    if (line.trim() === "") continue
    try {
      const row = JSON.parse(line) as { Name?: string; CPUPerc?: string; MemUsage?: string }
      if (!row.Name || !namePattern.test(row.Name)) continue
      const [used = "", limit = ""] = (row.MemUsage ?? "").split("/")
      const mem = parseSizeToMiB(used)
      const memLimit = parseSizeToMiB(limit)
      const cpu = Number((row.CPUPerc ?? "").replace("%", ""))
      if (mem === null || !Number.isFinite(cpu)) continue
      samples.push({ container: row.Name, cpuPercent: cpu, memMiB: mem, memLimitMiB: memLimit ?? 0 })
    } catch {
      // Linha que não é JSON (aviso do Docker): ignora.
    }
  }
  return samples
}

/** Imagem local com o tamanho em disco informado pelo Docker. */
export interface ImageSize {
  image: string
  id: string
  sizeMiB: number
}

/**
 * Tamanho das imagens locais cujo `repositório:tag` casa com `pattern`.
 * Usa o tamanho em bytes de `docker image inspect` (o `docker images` arredonda).
 */
export async function listImageSizes(pattern: RegExp): Promise<ImageSize[]> {
  const listed = await runProgram("docker", ["images", "--format", "{{.Repository}}:{{.Tag}}\t{{.ID}}"])
  if (!listed.ok) return []
  const images: ImageSize[] = []
  for (const line of listed.stdout.split(/\r?\n/)) {
    const [name = "", id = ""] = line.trim().split("\t")
    if (name === "" || id === "" || name.includes("<none>") || !pattern.test(name)) continue
    const inspected = await runProgram("docker", ["image", "inspect", "--format", "{{.Size}}", id], { timeoutMs: 20_000 })
    const bytes = Number(inspected.stdout.trim())
    if (inspected.ok && Number.isFinite(bytes)) images.push({ image: name, id, sizeMiB: bytes / 1024 ** 2 })
  }
  return images
}
