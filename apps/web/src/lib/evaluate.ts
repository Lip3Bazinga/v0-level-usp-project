import { createClient } from "@/lib/supabase/client"
import type { ProjectFile, TestResult } from "@/lib/types"

// Mesmo shape do resultado de testes (unittest). Alias do tipo único TestResult.
export type EvaluateResult = TestResult

export type EvaluateError =
  | { type: "unauthenticated" }
  | { type: "timeout"; message: string }
  | { type: "not_found" }
  | { type: "server_error"; message: string }
  | { type: "network_error" }

export type EvaluateResponse =
  | { ok: true; result: EvaluateResult }
  | { ok: false; error: EvaluateError }

/**
 * Avaliação server-side: envia o código do aluno para POST /api/evaluate,
 * que executa os hidden_tests no servidor. O gabarito nunca chega ao browser.
 */
export async function evaluateOnServer(
  lessonId: string,
  files: ProjectFile[]
): Promise<EvaluateResponse> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { ok: false, error: { type: "unauthenticated" } }
  }

  try {
    const res = await fetch("/api/evaluate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        lessonId,
        files: files.map((f) => ({ path: f.path, content: f.content })),
      }),
    })

    if (res.status === 401) return { ok: false, error: { type: "unauthenticated" } }
    if (res.status === 404) return { ok: false, error: { type: "not_found" } }
    if (res.status === 408) {
      const body = await res.json().catch(() => ({}))
      return {
        ok: false,
        error: {
          type: "timeout",
          message: (body as { error?: string }).error ?? "Tempo limite excedido.",
        },
      }
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return {
        ok: false,
        error: { type: "server_error", message: (body as { error?: string }).error ?? "Erro interno" },
      }
    }

    const result = await res.json() as EvaluateResult
    return { ok: true, result }
  } catch {
    return { ok: false, error: { type: "network_error" } }
  }
}
