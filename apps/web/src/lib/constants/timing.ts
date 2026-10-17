export const MS_PER_SECOND = 1_000
export const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MS_PER_HOUR = 60 * MS_PER_MINUTE
export const MS_PER_DAY = 24 * MS_PER_HOUR

/** Execução no navegador acima disso é tratada como laço infinito e o worker é reiniciado. */
export const PYTHON_EXECUTION_TIMEOUT_MS = 10 * MS_PER_SECOND

/** Espera após a última edição antes de salvar o snapshot do aluno na API. */
export const SNAPSHOT_SAVE_DEBOUNCE_MS = 1_500

export const TOAST_DURATION_MS = 3_000
