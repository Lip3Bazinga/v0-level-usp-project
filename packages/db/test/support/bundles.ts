import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { contentBundleSchema, type ContentBundle } from "@levelusp/contracts"

const FIXTURES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures")

/** Pacote mínimo do formato 2 (uma trilha, dois cursos; lições guiada, prática, quiz e leitura). */
export function loadFixtureBundle(name = "trilha-minima.json"): ContentBundle {
  const json: unknown = JSON.parse(readFileSync(path.join(FIXTURES_DIR, name), "utf8"))
  return contentBundleSchema.parse(json)
}
