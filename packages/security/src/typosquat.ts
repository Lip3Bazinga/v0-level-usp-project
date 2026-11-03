/**
 * Detecção de nomes suspeitos (typosquatting e "slopsquatting": nomes que um
 * assistente de IA inventa e alguém registra com código malicioso). Compara
 * cada dependência com pacotes populares pela distância de Damerau-Levenshtein
 * e por variações comuns (hífen, escopo trocado, sufixo `-js`).
 */

/** Pacotes muito baixados, alvos clássicos de nomes parecidos. */
export const POPULAR_PACKAGES = [
  "react", "react-dom", "next", "express", "lodash", "zod", "axios", "typescript", "eslint", "prettier", "vitest", "jest",
  "webpack", "vite", "rollup", "esbuild", "babel", "chalk", "commander", "debug", "dotenv", "moment", "dayjs", "date-fns",
  "uuid", "nanoid", "cookie", "cookie-parser", "body-parser", "multer", "helmet", "cors", "jsonwebtoken", "bcrypt", "bcryptjs",
  "argon2", "pg", "mysql", "mysql2", "mongoose", "mongodb", "redis", "ioredis", "drizzle-orm", "prisma", "sequelize", "knex",
  "nodemailer", "pdfkit", "pdf-lib", "sanitize-html", "dompurify", "marked", "markdown-it", "react-markdown", "remark-gfm",
  "tailwindcss", "postcss", "autoprefixer", "clsx", "classnames", "tailwind-merge", "framer-motion", "recharts", "d3",
  "rxjs", "reflect-metadata", "pino", "winston", "supertest", "playwright", "puppeteer", "jsdom", "cheerio", "ws",
  "socket.io", "yaml", "js-yaml", "semver", "glob", "minimatch", "rimraf", "fs-extra", "tsx", "ts-node", "nodemon",
  "zustand", "swr", "sweetalert2", "sonner", "lucide-react", "cmdk", "vaul", "input-otp", "embla-carousel-react",
  "react-hook-form", "react-day-picker", "next-themes", "pyodide", "turbo", "pnpm", "npm", "yarn", "node-fetch",
  "cross-env", "concurrently", "colors", "faker", "request", "event-stream", "ua-parser-js", "coa", "rc",
] as const

/** Distância de Damerau-Levenshtein (inserção, remoção, troca e transposição adjacente). */
export function editDistance(first: string, second: string): number {
  const rows = first.length + 1
  const columns = second.length + 1
  const table: number[][] = Array.from({ length: rows }, (_, row) => Array.from({ length: columns }, (_, column) => (row === 0 ? column : column === 0 ? row : 0)))
  const at = (row: number, column: number): number => table[row]?.[column] ?? Number.POSITIVE_INFINITY
  for (let row = 1; row < rows; row++) {
    for (let column = 1; column < columns; column++) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1
      let best = Math.min(at(row - 1, column) + 1, at(row, column - 1) + 1, at(row - 1, column - 1) + cost)
      if (row > 1 && column > 1 && first[row - 1] === second[column - 2] && first[row - 2] === second[column - 1]) {
        best = Math.min(best, at(row - 2, column - 2) + 1)
      }
      const tableRow = table[row]
      if (tableRow) tableRow[column] = best
    }
  }
  return at(rows - 1, columns - 1)
}

/** Nome sem escopo, minúsculo e sem separadores: `@Foo/react_dom` → `reactdom`. */
export function canonicalName(name: string): string {
  const unscoped = name.startsWith("@") ? (name.split("/")[1] ?? name) : name
  return unscoped.toLowerCase().replace(/[-_.]/g, "").replace(/js$/, "")
}

/** Escopos populares: `@nestj/core` ou `@type/node` imitam um destes. */
export const POPULAR_SCOPES = [
  "@types", "@babel", "@nestjs", "@radix-ui", "@tiptap", "@next", "@swc", "@playwright", "@testing-library", "@vitejs",
  "@tailwindcss", "@eslint", "@typescript-eslint", "@codemirror", "@uiw", "@dnd-kit", "@hookform", "@node-rs", "@axe-core",
  "@angular", "@vue", "@aws-sdk", "@google-cloud", "@prisma", "@trpc", "@tanstack", "@emotion", "@mui", "@sentry",
] as const

/** Um nome da lista parecido demais com um pacote ou escopo popular (e diferente dele). */
export interface TyposquatSuspect {
  name: string
  resembles: string
  reason: string
}

const MIN_NAME_LENGTH_FOR_DISTANCE_2 = 8

function scopeOf(name: string): string | null {
  return name.startsWith("@") ? (name.split("/")[0] ?? null) : null
}

function unscopedSuspects(name: string, popular: readonly string[], allowed: ReadonlySet<string>): TyposquatSuspect[] {
  const suspects: TyposquatSuspect[] = []
  for (const target of popular) {
    if (name === target || allowed.has(`${name}→${target}`)) continue
    const distance = editDistance(name.toLowerCase(), target)
    const limit = target.length >= MIN_NAME_LENGTH_FOR_DISTANCE_2 ? 2 : 1
    if (distance <= limit) suspects.push({ name, resembles: target, reason: `distância de edição ${distance}` })
    else if (canonicalName(name) === canonicalName(target)) suspects.push({ name, resembles: target, reason: "mesmo nome com outra grafia (hífen/ponto/sufixo js)" })
  }
  return suspects
}

/**
 * Nomes que imitam um pacote popular: sem escopo, distância 1 (ou 2 em nomes longos) ou a
 * mesma grafia canônica; com escopo, um escopo a 1 letra de um escopo popular. Escopos são
 * de organizações no npm, então `@tiptap/react` não é suspeito por repetir "react".
 * `allowed` lista pares conhecidos e legítimos (`nome→popular`).
 */
export function findTyposquats(
  names: readonly string[],
  allowed: ReadonlySet<string> = new Set(),
  popular: readonly string[] = POPULAR_PACKAGES,
  popularScopes: readonly string[] = POPULAR_SCOPES,
): TyposquatSuspect[] {
  const suspects: TyposquatSuspect[] = []
  const popularNames = new Set(popular)
  for (const name of names) {
    // Um pacote da própria lista de populares (bcrypt e bcryptjs) não é imitação do vizinho.
    if (popularNames.has(name)) continue
    const scope = scopeOf(name)
    if (!scope) {
      suspects.push(...unscopedSuspects(name, popular, allowed))
      continue
    }
    for (const target of popularScopes) {
      if (scope === target || allowed.has(`${name}→${target}`)) continue
      const distance = editDistance(scope.toLowerCase(), target)
      if (distance <= 1) suspects.push({ name, resembles: target, reason: `escopo a ${distance} letra de um escopo popular` })
    }
  }
  return suspects
}
