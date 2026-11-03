/**
 * Copia o núcleo do Pyodide (pacote npm `pyodide`, versão fixada) para
 * public/pyodide/v<versão>/, de onde o botão "Executar" carrega o runtime na
 * mesma origem do site. Roda antes do `next dev` e do `next build`.
 *
 * Integridade: o pnpm já confere o SHA-512 do tarball contra o pnpm-lock.yaml;
 * aqui cada arquivo copiado ainda precisa bater com o SHA-256 registrado em
 * src/lib/python/pyodide-runtime.json. Qualquer diferença (versão trocada,
 * node_modules adulterado) interrompe o build.
 *
 * Ao atualizar o Pyodide: troque a versão no package.json, rode
 * `pnpm --filter @levelusp/web pyodide:copy --write-manifest`, revise o diff do
 * manifesto e rode o teste de paridade (`test:paridade`).
 */
import { createHash } from "node:crypto"
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import path from "node:path"
import { z } from "zod"

const WEB_ROOT = path.resolve(import.meta.dirname, "..")
const MANIFEST_PATH = path.join(WEB_ROOT, "src/lib/python/pyodide-runtime.json")
const PUBLIC_PYODIDE_DIR = path.join(WEB_ROOT, "public/pyodide")

const manifestSchema = z.object({
  version: z.string(),
  python: z.string(),
  files: z.record(z.string(), z.string().regex(/^[0-9a-f]{64}$/)),
})
type RuntimeManifest = z.infer<typeof manifestSchema>

const packageJsonSchema = z.object({ version: z.string() })
const webPackageJsonSchema = z.object({ dependencies: z.record(z.string(), z.string()) })
const lockFileSchema = z.object({ info: z.object({ python: z.string() }) })

function sha256(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex")
}

async function readJson(filePath: string): Promise<unknown> {
  return JSON.parse(await readFile(filePath, "utf8"))
}

function resolvePackageDir(): string {
  const require = createRequire(path.join(WEB_ROOT, "package.json"))
  return path.dirname(require.resolve("pyodide/package.json"))
}

/** A versão do package.json, do node_modules e do manifesto precisam ser a mesma. */
async function assertPinnedVersion(packageDir: string, manifest: RuntimeManifest): Promise<void> {
  const webPackage = webPackageJsonSchema.parse(await readJson(path.join(WEB_ROOT, "package.json")))
  const declared = webPackage.dependencies.pyodide
  if (declared !== manifest.version) {
    throw new Error(`package.json declara pyodide "${declared}", mas o manifesto é da versão ${manifest.version} (use versão exata).`)
  }
  const installed = packageJsonSchema.parse(await readJson(path.join(packageDir, "package.json"))).version
  if (installed !== manifest.version) {
    throw new Error(`node_modules tem pyodide ${installed}, esperado ${manifest.version}. Rode pnpm install.`)
  }
  const lockFile = lockFileSchema.parse(await readJson(path.join(packageDir, "pyodide-lock.json")))
  if (lockFile.info.python !== manifest.python) {
    throw new Error(`pyodide-lock.json traz Python ${lockFile.info.python}, o manifesto diz ${manifest.python}.`)
  }
}

async function copyVerifiedFiles(packageDir: string, manifest: RuntimeManifest): Promise<string> {
  const targetDir = path.join(PUBLIC_PYODIDE_DIR, `v${manifest.version}`)
  await mkdir(targetDir, { recursive: true })
  for (const [fileName, expectedHash] of Object.entries(manifest.files)) {
    const content = await readFile(path.join(packageDir, fileName))
    const actualHash = sha256(content)
    if (actualHash !== expectedHash) {
      throw new Error(`SHA-256 de ${fileName} não confere: esperado ${expectedHash}, obtido ${actualHash}.`)
    }
    await copyFile(path.join(packageDir, fileName), path.join(targetDir, fileName))
  }
  return targetDir
}

/** Versões antigas em public/pyodide não podem continuar sendo publicadas. */
async function removeStaleVersions(currentVersion: string): Promise<void> {
  const entries = await readdir(PUBLIC_PYODIDE_DIR, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name !== `v${currentVersion}`) await rm(path.join(PUBLIC_PYODIDE_DIR, entry.name), { recursive: true })
  }
}

/** Regrava o manifesto a partir do pacote instalado (só ao atualizar a versão de propósito). */
async function writeManifest(packageDir: string, current: RuntimeManifest): Promise<void> {
  const version = packageJsonSchema.parse(await readJson(path.join(packageDir, "package.json"))).version
  const python = lockFileSchema.parse(await readJson(path.join(packageDir, "pyodide-lock.json"))).info.python
  const files: Record<string, string> = {}
  for (const fileName of Object.keys(current.files)) {
    files[fileName] = sha256(await readFile(path.join(packageDir, fileName)))
  }
  const manifest: RuntimeManifest = { version, python, files }
  await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`Manifesto atualizado para o Pyodide ${version} (Python ${python}).`)
}

async function main(): Promise<void> {
  const packageDir = resolvePackageDir()
  const manifest = manifestSchema.parse(await readJson(MANIFEST_PATH))
  if (process.argv.includes("--write-manifest")) {
    await writeManifest(packageDir, manifest)
    return
  }
  await assertPinnedVersion(packageDir, manifest)
  const targetDir = await copyVerifiedFiles(packageDir, manifest)
  await removeStaleVersions(manifest.version)
  console.log(`Pyodide ${manifest.version} (Python ${manifest.python}) verificado e copiado para ${path.relative(WEB_ROOT, targetDir)}.`)
}

main().catch((error: unknown) => {
  console.error(`Falha ao preparar o Pyodide: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
