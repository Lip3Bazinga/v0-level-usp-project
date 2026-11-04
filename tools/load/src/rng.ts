/**
 * Gerador pseudoaleatório com semente (mulberry32): a mesma semente reproduz a mesma
 * turma (ordem das lições, códigos enviados, tempos de pensar).
 */
export class Random {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
  }

  /** Número uniforme em [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let mixed = this.state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }

  /** Uniforme em [min, max). */
  between(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  /** Exponencial com a média informada (tempo entre eventos independentes). */
  exponential(mean: number): number {
    return -mean * Math.log(1 - this.next())
  }

  /** Verdadeiro com probabilidade `probability`. */
  chance(probability: number): boolean {
    return this.next() < probability
  }

  /**
   * Escolhe um item com chance proporcional ao peso.
   *
   * @throws Error se a lista estiver vazia ou todos os pesos forem zero.
   */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T {
    const total = items.reduce((sum, item) => sum + Math.max(0, weightOf(item)), 0)
    if (total <= 0) throw new Error("Nenhum item com peso positivo")
    let remaining = this.next() * total
    for (const item of items) {
      remaining -= Math.max(0, weightOf(item))
      if (remaining < 0) return item
    }
    const last = items.at(-1)
    if (last === undefined) throw new Error("Nenhum item com peso positivo")
    return last
  }

  /**
   * Um item qualquer da lista.
   *
   * @throws Error se a lista estiver vazia.
   */
  pick<T>(items: readonly T[]): T {
    return this.weighted(items, () => 1)
  }

  /** Gerador derivado (para cada aluno ter a sua sequência, independente da ordem de execução). */
  fork(salt: number): Random {
    return new Random(Math.imul(this.state ^ salt, 2_654_435_761) ^ salt)
  }
}
