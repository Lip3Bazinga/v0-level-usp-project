/**
 * Chamadas que cada tela do front faz à API, medidas com o Playwright na web de produção
 * (`next build` + `node server.js`, 03/11/2026). Atualize quando o front mudar o que busca.
 *
 * - `providers`: contextos globais (auth, progresso, notificações), montados só no
 *   carregamento completo da página (F5, primeiro acesso, link aberto em nova aba);
 * - cada tela: o que ela busca ao abrir, inclusive por navegação no cliente (`<Link>`).
 *
 * `{user}`, `{course}` e `{lesson}` são trocados pelos ids do aluno, do curso e da lição.
 */
export const PROVIDER_CALLS: readonly string[] = ["/api/auth/me", "/api/lessons/summaries", "/api/me/progress", "/api/me/notifications?limit=30"]

/** Telas do aluno simuladas. */
export type PageName = "dashboard" | "cursos" | "curso" | "licao" | "ranking" | "notas" | "perfil"

/** Rota da tela e as chamadas que ela faz ao abrir. */
export interface PageSpec {
  path: string
  calls: readonly string[]
}

export const PAGES: Readonly<Record<PageName, PageSpec>> = {
  dashboard: { path: "/dashboard", calls: ["/api/courses", "/api/badges", "/api/users/{user}/badges"] },
  cursos: { path: "/cursos", calls: ["/api/courses", "/api/me/enrollments"] },
  curso: { path: "/cursos/{course}", calls: ["/api/courses/{course}", "/api/courses/{course}/lessons", "/api/me/progress"] },
  licao: { path: "/lesson/{lesson}", calls: ["/api/lessons/summaries", "/api/lessons/{lesson}", "/api/lessons/{lesson}/snapshot"] },
  ranking: { path: "/leaderboard", calls: ["/api/leaderboard?limit=50"] },
  notas: { path: "/notas", calls: ["/api/me/notes"] },
  perfil: { path: "/perfil/me", calls: ["/api/users/{user}/activity", "/api/badges", "/api/users/{user}/badges", "/api/me/certificates"] },
}

/** Depois de um Verificar aprovado o front atualiza perfil, progresso e notificações. */
export const AFTER_COMPLETION_CALLS: readonly string[] = ["/api/auth/me", "/api/me/progress", "/api/me/notifications?limit=30"]

/** Ids que entram nos modelos de rota. */
export interface RouteIds {
  user?: string
  course?: string
  lesson?: string
}

/**
 * Troca `{user}`, `{course}` e `{lesson}` pelos ids.
 *
 * @throws Error se a rota pedir um id que não foi informado.
 */
export function fillRoute(template: string, ids: RouteIds): string {
  return template.replace(/\{(user|course|lesson)\}/g, (_match, key: keyof RouteIds) => {
    const value = ids[key]
    if (!value) throw new Error(`Rota ${template} precisa de ${key}`)
    return value
  })
}
