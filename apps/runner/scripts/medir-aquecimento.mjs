#!/usr/bin/env node
// Decompõe o aquecimento de um worker do motor python-dados (docs/v2/desempenho-executor.md):
// carga do Pyodide, carga dos pacotes do perfil (descompactação no MEMFS) e importações.
// Roda num contêiner PRÓPRIO da imagem do executor (não com `docker exec` no que está de pé:
// as instâncias se acumulam na memória do processo e o limite do contêiner é dividido com ele),
// um Pyodide por vez, sem passar pela fila:
//
//   docker run --rm -i -m 4g -w /app levelusp-dev-runner node --input-type=module - [repeticoes] < scripts/medir-aquecimento.mjs
//
// (no Git Bash do Windows, com MSYS_NO_PATHCONV=1, para o `-w /app` não virar um caminho do Windows)
//
// Os perfis abaixo repetem `src/pyodide-profiles.ts` (o script não depende do build).
// Não rode junto com um verify ou com o medir-piso: disputa as mesmas CPUs.

import { loadPyodide } from "pyodide"

const PYODIDE_DIR = process.env.PYODIDE_DIR ?? "/opt/levelusp-pyodide"
const REPETITIONS = Number(process.argv[2] ?? 5)
const INDEX_URL = PYODIDE_DIR.endsWith("/") ? PYODIDE_DIR : `${PYODIDE_DIR}/`

const PROFILES = [
  { name: "dados", packages: ["numpy", "pandas"], preload: "import numpy, pandas" },
  {
    name: "ml",
    packages: ["numpy", "pandas", "scipy", "scikit-learn", "matplotlib", "statsmodels", "sympy", "networkx"],
    preload: "import numpy, pandas, scipy, sklearn, sklearn.linear_model, sklearn.model_selection, matplotlib\nmatplotlib.use('agg')\nimport matplotlib.pyplot",
  },
]

const median = (values) => Math.round([...values].sort((a, b) => a - b)[Math.floor(values.length / 2)])

for (const profile of PROFILES) {
  const samples = { pyodideMs: [], pacotesMs: [], importacoesMs: [], totalMs: [] }
  for (let index = 0; index < REPETITIONS; index++) {
    const startedAt = performance.now()
    const pyodide = await loadPyodide({ indexURL: INDEX_URL, packageCacheDir: INDEX_URL, env: {}, jsglobals: {}, stdout: () => undefined, stderr: () => undefined })
    const loadedAt = performance.now()
    await pyodide.loadPackage(profile.packages, { messageCallback: () => undefined, errorCallback: () => undefined })
    const unpackedAt = performance.now()
    pyodide.runPython(profile.preload)
    const importedAt = performance.now()
    samples.pyodideMs.push(loadedAt - startedAt)
    samples.pacotesMs.push(unpackedAt - loadedAt)
    samples.importacoesMs.push(importedAt - unpackedAt)
    samples.totalMs.push(importedAt - startedAt)
  }
  const row = { perfil: profile.name, n: REPETITIONS }
  for (const [key, values] of Object.entries(samples)) row[key] = median(values)
  console.log(JSON.stringify(row))
}
