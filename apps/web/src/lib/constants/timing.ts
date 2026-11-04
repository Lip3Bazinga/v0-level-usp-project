export const MS_PER_SECOND = 1_000
export const MS_PER_MINUTE = 60 * MS_PER_SECOND
export const MS_PER_HOUR = 60 * MS_PER_MINUTE
export const MS_PER_DAY = 24 * MS_PER_HOUR

/** Execução no navegador acima disso é tratada como laço infinito e o worker é reiniciado. */
export const PYTHON_EXECUTION_TIMEOUT_MS = 10 * MS_PER_SECOND

/** Espera após a última edição antes de salvar o snapshot do aluno na API. */
export const SNAPSHOT_SAVE_DEBOUNCE_MS = 1_500

/** Espera após a última tecla antes de salvar uma anotação. */
export const NOTE_AUTOSAVE_DEBOUNCE_MS = 800

/** Toasts do SweetAlert (`swalToast`). */
export const TOAST_DURATION_MS = 3_000

/** Avisos próprios do painel do admin (`AdminToast`). */
export const ADMIN_TOAST_DURATION_MS = 3_200

/** Quanto tempo o selo "Salvo!" fica visível depois de salvar (editores, configurações, notas). */
export const SAVED_FEEDBACK_DURATION_MS = 2_500

/** Quanto tempo o botão de copiar mostra "Copiado". */
export const COPIED_FEEDBACK_DURATION_MS = 2_000

/** Depois de redefinir a senha, tempo para ler a confirmação antes de ir ao login. */
export const LOGIN_REDIRECT_DELAY_MS = 2_500

/** Na prova, abaixo disso o cronômetro fica vermelho. */
export const EXAM_LOW_TIME_WARNING_MS = 5 * MS_PER_MINUTE

/** Modais de comemoração fecham sozinhos depois destes tempos. */
export const CELEBRATION_AUTO_CLOSE_MS = {
  levelUp: 5 * MS_PER_SECOND,
  enrollment: 5.5 * MS_PER_SECOND,
  badgeEarned: 6 * MS_PER_SECOND,
  teacherSuccess: 6 * MS_PER_SECOND,
} as const

/** Intervalo entre as rajadas laterais de confete da conclusão de curso. */
export const CONFETTI_SIDE_BURST_INTERVAL_MS = 400

/** Na IDE, após acertar: espera até as partículas de XP e até o modal de nível. */
export const SUCCESS_PARTICLES_DELAY_MS = 500
export const SUCCESS_LEVEL_UP_DELAY_MS = 300

/** Pulso do selo de XP no cabeçalho da IDE quando o XP sobe. */
export const XP_PULSE_DURATION_MS = 900

/** Animação de contagem dos números do painel e da seção de impacto do site. */
export const XP_COUNT_UP_DURATION_MS = 900
export const LESSONS_COUNT_UP_DURATION_MS = 700
export const IMPACT_COUNT_UP_DURATION_MS = 1_600

/** Atraso para abrir as dicas (tooltip) do mapa de atividade e das conquistas do perfil. */
export const ACTIVITY_TOOLTIP_DELAY_MS = 100
export const BADGE_TOOLTIP_DELAY_MS = 200
