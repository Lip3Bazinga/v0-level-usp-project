/** Formato de `docs/tcc/dados/recursos.csv` e o amostrador de `docker stats` usado por recursos.mts e carga.mts. */
import path from "node:path"
import { appendCsv, ensureCsv } from "./estatistica.mts"
import { type ContainerSample, sampleContainers } from "./docker.mts"
import { DATA_DIR, nowIso, sleep } from "./sistema.mts"

/** Arquivo padrão dos recursos. */
export const RECURSOS_CSV = path.join(DATA_DIR, "recursos.csv")

/**
 * Colunas. `tipo`: `workers` (memória/CPU com k jobs simultâneos; k=0 é o contêiner ocioso),
 * `carga` (amostras durante o teste de carga), `amostra` (amostragem avulsa) e `imagem` (tamanho
 * da imagem Docker, em `tamanho_mib`). `cpu_pct` é relativo a UM núcleo (200 = dois núcleos).
 */
export const RECURSOS_HEADER = ["tipo", "rotulo", "motor", "k_concorrentes", "instante_s", "container", "cpu_pct", "mem_mib", "mem_limite_mib", "imagem", "tamanho_mib", "inicio"] as const

/** Prepara o arquivo (cabeçalho) se ele ainda não existe. */
export function ensureRecursosCsv(file: string): void {
  ensureCsv(file, RECURSOS_HEADER)
}

/** Descrição do que está sendo amostrado. */
export interface SamplerLabel {
  tipo: "workers" | "carga" | "amostra"
  rotulo: string
  motor: string
  k: number | null
}

/** Uma linha de CSV de uma leitura do `docker stats`. */
export function sampleRow(label: SamplerLabel, sample: ContainerSample, elapsedSeconds: number): (string | number | null)[] {
  return [label.tipo, label.rotulo, label.motor, label.k, Math.round(elapsedSeconds * 10) / 10, sample.container, sample.cpuPercent, Math.round(sample.memMiB * 10) / 10, Math.round(sample.memLimitMiB), null, null, nowIso()]
}

/** Amostrador em segundo plano. */
export interface Sampler {
  /** Para o amostrador, espera a leitura em andamento e devolve as leituras (todas já gravadas no CSV). */
  stop: () => Promise<ContainerSample[]>
}

/**
 * Lê `docker stats --no-stream` dos contêineres que casam com `pattern` a cada `intervalMs`
 * (mais o tempo da leitura, ~1-2 s) e grava cada leitura no CSV.
 */
export function startSampler(file: string, label: SamplerLabel, pattern: RegExp, intervalMs: number): Sampler {
  ensureRecursosCsv(file)
  const controller = new AbortController()
  const startedAt = Date.now()
  const collected: ContainerSample[] = []
  const loop = (async (): Promise<void> => {
    while (!controller.signal.aborted) {
      const samples = await sampleContainers(pattern)
      const elapsed = (Date.now() - startedAt) / 1000
      collected.push(...samples)
      appendCsv(file, samples.map((sample) => sampleRow(label, sample, elapsed)))
      await sleep(intervalMs, controller.signal)
    }
  })()
  return {
    stop: async () => {
      controller.abort()
      await loop
      return collected
    },
  }
}
