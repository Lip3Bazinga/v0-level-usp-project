/**
 * Prepara um banco PostgreSQL limpo para os testes e2e e aplica as migrações.
 * Usa TEST_DATABASE_URL (no CI vem do serviço postgres do GitHub Actions).
 */
import path from "node:path"
import pg from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://levelusp:levelusp@127.0.0.1:5432/levelusp_test"

export default async function setup() {
  const pool = new pg.Pool({ connectionString: TEST_DATABASE_URL, max: 1 })
  try {
    await pool.query("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;")
    await migrate(drizzle(pool), { migrationsFolder: path.resolve(process.cwd(), "../../packages/db/migrations") })
  } finally {
    await pool.end()
  }
}
