/**
 * Aplica as migrações SQL versionadas em packages/db/migrations.
 * Uso: DATABASE_URL=... pnpm db:migrate  (também roda no container `migrate`).
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { createDb } from "../index"

const url = process.env.DATABASE_URL
if (!url) {
  console.error("DATABASE_URL não definida")
  process.exit(1)
}
const here = path.dirname(fileURLToPath(import.meta.url))
const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.resolve(here, "../../migrations")

const { db, close } = createDb(url, { max: 1, applicationName: "levelusp-migrate" })
try {
  await migrate(db, { migrationsFolder })
  console.log(`Migrações aplicadas (${migrationsFolder}).`)
} finally {
  await close()
}
