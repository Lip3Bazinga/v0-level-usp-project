// Copia o núcleo do Pyodide de node_modules/ para public/, para que os arquivos
// possam ser servidos pela própria aplicação em vez do CDN de terceiros.
//
// O pacote npm `pyodide` é o "pyodide-core": o conjunto mínimo necessário para
// inicializar o runtime (inclui o python_stdlib.zip). Ele NÃO traz os wheels dos
// pacotes (numpy, pandas etc.) — a distribuição completa passa de 200 MB e não
// faz sentido versionar nem subir para a Vercel.
//
// Consequência: ao apontar o worker para o caminho local, o núcleo é servido
// pela aplicação, mas o carregamento de bibliotecas do catálogo continua
// dependendo do CDN. Ver docs/10-auditoria-2026-08-03.md, item 6.

import { mkdir, copyFile, access } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SRC = join(ROOT, "node_modules", "pyodide")
const DEST = join(ROOT, "public", "pyodide", "v0.25.1", "full")

// Conjunto mínimo para o runtime iniciar no browser.
const FILES = [
  "pyodide.js",
  "pyodide.asm.js",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
]

async function exists(p) {
  try {
    await access(p)
    return true
  } catch {
    return false
  }
}

async function main() {
  if (!(await exists(SRC))) {
    console.error(
      "[pyodide] node_modules/pyodide não encontrado. " +
      "Rode `pnpm install` — a dependência precisa estar instalada.",
    )
    process.exit(1)
  }

  await mkdir(DEST, { recursive: true })

  const faltando = []
  for (const file of FILES) {
    const from = join(SRC, file)
    if (!(await exists(from))) {
      faltando.push(file)
      continue
    }
    await copyFile(from, join(DEST, file))
  }

  if (faltando.length) {
    // Falha ruidosa de propósito: um build "verde" com o núcleo incompleto
    // quebraria a IDE para todos os alunos, e só apareceria em runtime.
    console.error(`[pyodide] arquivos ausentes no pacote npm: ${faltando.join(", ")}`)
    process.exit(1)
  }

  console.log(`[pyodide] núcleo copiado para public/pyodide/v0.25.1/full/ (${FILES.length} arquivos)`)
}

main().catch((err) => {
  console.error("[pyodide] falha ao preparar o runtime:", err)
  process.exit(1)
})
