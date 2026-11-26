/** Formato de `recursos.csv` e o amostrador de `docker stats` usado por recursos.mts e carga.mts. */
import path from "node:path"
import { type Celula, mergeCsv, type ResultadoMesclagem } from "./dados.mts"
import { type ContainerSample, sampleContainers } from "./docker.mts"
import { nowIso, sleep } from "./sistema.mts"

/** Caminho de `recursos.csv` dentro da pasta de dados `dir`. */
export function recursosFile(dir: string): string {
  return path.join(dir, "recursos.csv")
}

/**
 * Colunas. `tipo`: `workers` (memória/CPU com k jobs simultâneos; k=0 é o contêiner ocioso),
 * `carga` (amostras durante o teste de carga), `amostra` (amostragem avulsa) e `imagem` (tamanho
 * da imagem Docker, em `tamanho_mib`). `cpu_pct` é relativo a UM núcleo (200 = dois núcleos).
 */
export const RECURSOS_HEADER = ["tipo", "rotulo", "motor", "k_concorrentes", "instante_s", "container", "cpu_pct", "mem_mib", "mem_limite_mib", "imagem", "tamanho_mib", "inicio"] as const

/**
 * Chave de substituição: uma rodada parcial troca só as medidas do mesmo tipo, rótulo, motor, k
 * (ou imagem), e preserva as demais (outros motores, outros k, outros níveis de carga).
 */
export function chaveRecursos(linha: Record<string, string>): string {
  return [linha.tipo, linha.rotulo, linha.motor, linha.k_concorrentes, linha.imagem].join("|")
}

/** Mescla linhas de recursos no CSV da pasta (ver `mergeCsv`). @throws Error se o cabeçalho for de outro formato. */
export function mergeRecursos(file: string, rows: readonly (readonly Celula[])[]): ResultadoMesclagem {
  return mergeCsv(file, RECURSOS_HEADER, chaveRecursos, rows)
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

/** Leituras de um amostrador parado. */
export interface Amostragem {
  samples: ContainerSample[]
  /** Linhas prontas para `mergeRecursos`. */
  rows: (string | number | null)[][]
}

/** Amostrador em segundo plano. */
export interface Sampler {
  /** Para o amostrador, espera a leitura em andamento e devolve as leituras (o chamador as grava). */
  stop: () => Promise<Amostragem>
}

/**
 * Lê `docker stats --no-stream` dos contêineres que casam com `pattern` a cada `intervalMs`
 * (mais o tempo da leitura, ~1-2 s). Não grava nada: quem chama mescla `rows` no CSV com
 * `mergeRecursos`, para não duplicar nem destruir leituras de rodadas anteriores.
 */
export function startSampler(label: SamplerLabel, pattern: RegExp, intervalMs: number): Sampler {
  const controller = new AbortController()
  const startedAt = Date.now()
  const collected: ContainerSample[] = []
  const rows: (string | number | null)[][] = []
  const loop = (async (): Promise<void> => {
    while (!controller.signal.aborted) {
      const samples = await sampleContainers(pattern)
      const elapsed = (Date.now() - startedAt) / 1000
      collected.push(...samples)
      rows.push(...samples.map((sample) => sampleRow(label, sample, elapsed)))
      await sleep(intervalMs, controller.signal)
    }
  })()
  return {
    stop: async () => {
      controller.abort()
      await loop
      return { samples: collected, rows }
    },
  }
}
