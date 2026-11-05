import path from "node:path"
import { parseArgs } from "node:util"
import { z } from "zod"

/**
 * Argumentos e caminhos dos comandos `content:*`. Os caminhos relativos
 * passados na linha de comando são resolvidos a partir de onde o `pnpm` foi
 * chamado (`INIT_CWD`), para `pnpm content:build --content content/exemplo`
 * funcionar da raiz do monorepo; os padrões ficam relativos à raiz do repositório.
 */

/** Pasta de conteúdo padrão, relativa à raiz do repositório. */
export const DEFAULT_CONTENT_DIR = "content"
/** Pacote compilado padrão, relativo à raiz do repositório. */
export const DEFAULT_BUNDLE_PATH = "packages/db/seed/trilha-python-ia.json"

/** Opções comuns aos comandos, já resolvidas em caminhos absolutos. */
export interface ContentCliOptions {
  contentDir: string
  /** Base para exibir os caminhos nos relatórios (onde o comando foi chamado). */
  displayRoot: string
  out: string
  course: string | undefined
  lesson: string | undefined
}

/** Diretório de onde o usuário chamou o comando (`pnpm` guarda em INIT_CWD). */
export function invocationDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.INIT_CWD ?? process.cwd()
}

/** Resolve um caminho digitado pelo usuário a partir de onde ele chamou o comando. */
export function resolveUserPath(value: string, env: NodeJS.ProcessEnv = process.env): string {
  return path.resolve(invocationDir(env), value)
}

/**
 * Lê `--content`, `--out`, `--curso` e `--licao`.
 *
 * @param repoRoot raiz do monorepo (base dos caminhos padrão).
 * @throws Error em opção desconhecida ou sem valor.
 */
export function parseContentArgs(argv: readonly string[], repoRoot: string, env: NodeJS.ProcessEnv = process.env): ContentCliOptions {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      content: { type: "string" },
      out: { type: "string" },
      curso: { type: "string" },
      licao: { type: "string" },
    },
    strict: true,
  })
  return {
    contentDir: values.content === undefined ? path.resolve(repoRoot, DEFAULT_CONTENT_DIR) : resolveUserPath(values.content, env),
    displayRoot: invocationDir(env),
    out: values.out === undefined ? path.resolve(repoRoot, DEFAULT_BUNDLE_PATH) : resolveUserPath(values.out, env),
    course: values.curso,
    lesson: values.licao,
  }
}

/** Mensagens do Zod em pt-BR nos relatórios (os schemas do pacote vêm do `@levelusp/contracts`). */
export function usePortugueseMessages(): void {
  z.config(z.locales.ptBR())
}
