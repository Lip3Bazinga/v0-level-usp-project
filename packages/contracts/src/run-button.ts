/**
 * Nível do jogador a partir do qual o botão "Executar" da lição fica liberado quando o curso não
 * define o próprio limite (`courses.run_button_min_level` nulo). Antes disso o aluno roda o código
 * pelo terminal do navegador (`python main.py`). É regra de interface, não de segurança: o
 * "Executar" roda no navegador e a API não valida nada disto.
 */
export const RUN_BUTTON_MIN_LEVEL = 10

/** Menor limite aceito por curso: 1 deixa o "Executar" sempre liberado (todo jogador começa no nível 1). */
export const MIN_RUN_BUTTON_LEVEL = 1
/** Maior limite aceito por curso (teto de sanidade do formulário do admin). */
export const MAX_RUN_BUTTON_LEVEL = 100

/**
 * Limite em vigor para um curso: o do curso, ou {@link RUN_BUTTON_MIN_LEVEL} quando ele é nulo,
 * ausente (lição avulsa) ou inválido (não inteiro ou menor que 1).
 */
export function resolveRunButtonMinLevel(courseMinLevel: number | null | undefined): number {
  if (courseMinLevel === null || courseMinLevel === undefined) return RUN_BUTTON_MIN_LEVEL
  if (!Number.isInteger(courseMinLevel) || courseMinLevel < MIN_RUN_BUTTON_LEVEL) return RUN_BUTTON_MIN_LEVEL
  return courseMinLevel
}

/**
 * Se o "Executar" está liberado para um jogador: o nível dele alcançou o limite em vigor
 * ({@link resolveRunButtonMinLevel}). Nível inválido (NaN, negativo) conta como nível 1.
 * Professor, admin e a prévia do professor não passam por esta regra (a web libera sempre).
 */
export function isRunButtonUnlocked(playerLevel: number, courseMinLevel: number | null | undefined): boolean {
  const level = Number.isFinite(playerLevel) ? Math.max(1, Math.floor(playerLevel)) : 1
  return level >= resolveRunButtonMinLevel(courseMinLevel)
}
