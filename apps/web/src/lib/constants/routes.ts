const LESSON_ROUTE_PREFIX = "/lesson"

/**
 * Rotas da aplicação web. Toda navegação (Link, router, redirect) passa por aqui
 * para que renomear uma rota seja uma mudança de um só lugar.
 */
export const ROUTES = {
  home: "/",
  login: "/login",
  /** Login que devolve o usuário para `next` depois de autenticar. */
  loginWithNext: (next: string) => `/login?next=${encodeURIComponent(next)}`,
  signup: "/signup",
  forgotPassword: "/esqueci-senha",
  resetPassword: "/redefinir-senha",

  dashboard: "/dashboard",
  /** Painel filtrado por módulo (o filtro é lido de `?modulo=`). */
  dashboardModule: (moduleTitle: string) => `/dashboard?modulo=${encodeURIComponent(moduleTitle)}`,
  courses: "/cursos",
  course: (courseId: string) => `/cursos/${courseId}`,
  courseExam: (courseId: string) => `/cursos/${courseId}/prova`,
  lesson: (lessonId: string) => `${LESSON_ROUTE_PREFIX}/${lessonId}`,
  ide: "/ide",
  notes: "/notas",
  leaderboard: "/leaderboard",
  settings: "/settings",
  /** Perfil público; sem username cai em `/perfil/me` (a página resolve o usuário logado). */
  profile: (username?: string | null) => `/perfil/${username || "me"}`,
  certificate: (verificationCode: string) => `/certificado/${verificationCode}`,

  teacher: "/teacher",
  teacherNewLesson: "/teacher/edit/new",
  teacherLesson: (lessonId: string) => `/teacher/edit/${lessonId}`,
  teacherNewCourse: "/teacher/curso/new",
  teacherCourse: (courseId: string) => `/teacher/curso/${courseId}`,

  admin: "/admin",
  showcase: "/showcase",
  landing: "/landing",

  site: {
    about: "/sobre",
    methodology: "/metodologia",
    tracks: "/trilhas",
    impact: "/impacto",
    team: "/equipe",
    partners: "/parceiros",
    faq: "/faq",
    contact: "/contato",
  },
} as const

/**
 * Prefixos que exigem sessão. O middleware usa esta lista para mandar quem não
 * tem cookie para o login antes de renderizar a página.
 */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [
  ROUTES.dashboard,
  LESSON_ROUTE_PREFIX,
  ROUTES.ide,
  ROUTES.notes,
  ROUTES.settings,
  ROUTES.teacher,
  ROUTES.admin,
]

/** Telas de autenticação: nunca servem de destino pós-login (evita laço). */
export const AUTH_ROUTES: readonly string[] = [ROUTES.login, ROUTES.signup]
