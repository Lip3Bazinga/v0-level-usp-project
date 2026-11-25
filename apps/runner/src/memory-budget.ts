/** Perfis de custo de memória de um lote: o motor WASI (`python`) e os perfis do Pyodide. */
export const BATCH_MEMORY_KEYS = ["python", "dados", "ml"] as const
/** Nome de um perfil de custo de memória. */
export type BatchMemoryKey = (typeof BATCH_MEMORY_KEYS)[number]
/** Peso (MB) que uma instância viva de cada perfil segura no orçamento. */
export type BatchMemoryMb = Record<BatchMemoryKey, number>

/**
 * Pesos padrão: o WASI é um processo curto de poucas dezenas de MB (coberto pela reserva);
 * um worker `dados` mede ~250 MB e um `ml` ~1,2 GiB de RSS (docs/tcc/medicoes.md).
 *
 * O peso é o RSS MEDIDO do worker, não o pior caso: durante um lote o heap wasm pode crescer
 * até `RUNNER_PYODIDE_MAX_HEAP_MB` (512) a partir do heap pós-aquecimento (75 MB no `dados`,
 * 187 MB no `ml`), e esse crescimento é absorvido pela reserva (`RUNNER_MEMORY_RESERVE_MB`).
 * Para uma garantia rígida, use pesos de pior caso (RSS + teto do heap − heap pós-aquecimento):
 * cerca de `dados:700,ml:1560`.
 */
export const DEFAULT_BATCH_MEMORY_MB: Readonly<BatchMemoryMb> = { python: 0, dados: 256, ml: 1229 }

/** Fotografia do orçamento servida em `GET /v1/stats` (`memory`). */
export interface MemoryBudgetSnapshot {
  /** Orçamento em MB; `null` quando ilimitado. */
  limitMb: number | null
  usedMb: number
  /** Maior `usedMb` desde a partida. */
  peakUsedMb: number
  /** Lotes com custo de memória esperando na fila agora (por memória ou por vaga de CPU). */
  blocked: number
}

/**
 * Orçamento de memória do executor, em MB: quem vai criar uma instância cara (um worker do
 * Pyodide) reserva o peso dela antes e libera depois que ela morreu de fato. A soma das
 * reservas nunca passa de `limitMb`: sem orçamento, o lote espera na fila (ou recebe 503) em
 * vez de criar mais uma instância.
 *
 * A proteção contra a morte do contêiner por falta de memória é tão boa quanto os pesos: o
 * orçamento limita a soma dos PESOS, não a memória real. Com os pesos padrão (RSS medido), o
 * crescimento de cada instância durante o lote fica por conta da reserva fora do orçamento
 * (ver `DEFAULT_BATCH_MEMORY_MB`).
 *
 * `Infinity` desliga o limite (toda reserva é aceita): é o comportamento anterior.
 */
export class MemoryBudget {
  private used = 0
  private peak = 0
  private blockedCount = 0
  private readonly listeners: (() => void)[] = []
  private isNotifying = false
  private hasPendingNotification = false

  /**
   * Cria o orçamento vazio (nada reservado).
   *
   * @param limitMb teto das reservas simultâneas em MB (`Infinity` = sem limite).
   * @throws RangeError para um limite negativo ou que não é número.
   */
  constructor(readonly limitMb: number = Number.POSITIVE_INFINITY) {
    if (Number.isNaN(limitMb) || limitMb < 0) throw new RangeError(`Orçamento de memória inválido: ${limitMb}`)
  }

  /** Há um teto de fato (falso = ilimitado). */
  get isLimited(): boolean {
    return Number.isFinite(this.limitMb)
  }

  /** MB reservados agora. */
  get usedMb(): number {
    return this.used
  }

  /** Maior total reservado desde a criação. */
  get peakUsedMb(): number {
    return this.peak
  }

  /** MB ainda livres (`Infinity` quando ilimitado). */
  get freeMb(): number {
    return this.limitMb - this.used
  }

  /**
   * Lotes com custo de memória esperando agora: na fila do semáforo (por memória ou só por
   * vaga de CPU) ou dentro de um motor. Enquanto for maior que zero, ninguém deve reservar
   * para trabalho especulativo (pool aquecido): a instância teria de ser despejada em seguida.
   */
  get blocked(): number {
    return this.blockedCount
  }

  /** Quantas instâncias de `mb` cabem no orçamento inteiro (`Infinity` quando ilimitado ou peso zero). */
  slotsFor(mb: number): number {
    if (mb <= 0 || !this.isLimited) return Number.POSITIVE_INFINITY
    return Math.floor(this.limitMb / mb)
  }

  /**
   * Reserva `mb` se couber. Peso zero (ou negativo) sempre cabe e não ocupa nada.
   *
   * @returns `false` quando a reserva passaria do limite (nada é reservado).
   */
  tryReserve(mb: number): boolean {
    if (mb <= 0) return true
    if (this.used + mb > this.limitMb) return false
    this.used += mb
    this.peak = Math.max(this.peak, this.used)
    return true
  }

  /** Devolve `mb` reservados e avisa quem espera por memória. */
  release(mb: number): void {
    if (mb <= 0) return
    this.used = Math.max(0, this.used - mb)
    this.notify()
  }

  /**
   * Registra (`+1`) ou retira (`-1`) um lote com custo que espera. Não avisa os ouvintes:
   * a contagem só muda o que os próximos `notify()` vão decidir.
   */
  addBlocked(delta: number): void {
    this.blockedCount = Math.max(0, this.blockedCount + delta)
  }

  /**
   * Registra um ouvinte chamado quando pode haver memória (ou instância pronta) para quem
   * espera. Os ouvintes rodam na ordem de registro: a fila (semáforo) deve se registrar
   * antes dos motores, para um lote à espera ter prioridade sobre o reabastecimento do pool.
   *
   * @returns função que cancela o registro.
   */
  onChange(listener: () => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index >= 0) this.listeners.splice(index, 1)
    }
  }

  /**
   * Chama os ouvintes. Pode ser chamado por um motor quando uma instância fica ociosa (um
   * lote à espera passa a ter o que usar sem a reserva mudar). Reentrante: um aviso disparado
   * por um ouvinte vira mais uma rodada depois da atual, sem recursão.
   */
  notify(): void {
    if (this.isNotifying) {
      this.hasPendingNotification = true
      return
    }
    this.isNotifying = true
    try {
      do {
        for (const listener of [...this.listeners]) listener()
      } while (this.takePendingNotification())
    } finally {
      this.isNotifying = false
    }
  }

  /** Houve um `notify()` durante a rodada atual? Lê e zera a marca. */
  private takePendingNotification(): boolean {
    const hadPending = this.hasPendingNotification
    this.hasPendingNotification = false
    return hadPending
  }

  /** Fotografia para `/v1/stats`. */
  snapshot(): MemoryBudgetSnapshot {
    return { limitMb: this.isLimited ? this.limitMb : null, usedMb: this.used, peakUsedMb: this.peak, blocked: this.blockedCount }
  }
}
