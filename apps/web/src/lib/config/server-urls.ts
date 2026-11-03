/*
 * URLs lidas em TEMPO DE EXECUÇÃO no servidor do Next (nunca NEXT_PUBLIC_*, que é
 * congelado no build da imagem): a mesma imagem `web` serve homolog e prod, e o
 * domínio público só é conhecido na VM. A validação (Zod) roda na partida, em
 * `instrumentation.ts`; aqui ficam só as regras de resolução, sem dependências,
 * porque `lib/api/client.ts` também vai para o navegador.
 */

export type RuntimeEnv = Readonly<Record<string, string | undefined>>

const DEFAULT_PORT = "3000"

function nonEmpty(value: string | undefined): string | undefined {
  return value === undefined || value.trim() === "" ? undefined : value.trim()
}

function localOrigin(env: RuntimeEnv): string {
  return `http://localhost:${nonEmpty(env.PORT) ?? DEFAULT_PORT}`
}

/**
 * Base das chamadas do SSR à API. No compose é `http://api:4000` (API_INTERNAL_URL).
 * Sem a variável, o SSR passa pelo próprio Next (o rewrite de `/api/*` foi
 * resolvido no build): `localhost:4000` não existe dentro do contêiner web (UX-02).
 */
export function resolveServerApiBaseUrl(env: RuntimeEnv): string {
  const configured = nonEmpty(env.API_INTERNAL_URL) ?? `http://127.0.0.1:${nonEmpty(env.PORT) ?? DEFAULT_PORT}`
  return configured.replace(/\/+$/, "")
}

/**
 * Origem pública (a mesma PUBLIC_BASE_URL da API): base dos metadados Open Graph
 * e de qualquer link absoluto gerado no servidor. APP_ORIGIN é o nome antigo,
 * ainda usado pelo fluxo do notebook (Quick Tunnel).
 */
export function resolvePublicBaseUrl(env: RuntimeEnv): string {
  const configured = nonEmpty(env.PUBLIC_BASE_URL) ?? nonEmpty(env.APP_ORIGIN)
  if (!configured) return localOrigin(env)
  try {
    return new URL(configured).origin
  } catch {
    return localOrigin(env)
  }
}
