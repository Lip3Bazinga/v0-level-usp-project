import { z } from "zod"
import { libraryCategorySchema } from "./library"
import { pythonRuntimeSchema, type PythonRuntime } from "./runner"

/**
 * Manifesto único de bibliotecas Python (Fase F, `docs/v2/motores-e-ide.md`). É a fonte de tudo o que
 * o aluno pode usar além da biblioteca padrão: o catálogo da API, a publicação de lições, o `content:check`
 * e o CI do executor derivam dele. Quem libera uma biblioteca nova é um PR que acrescenta uma entrada aqui
 * (o pedido do professor, aprovado pelo admin, só gera o rascunho da entrada).
 */

/** Perfis de worker do motor Pyodide do executor (`apps/runner/src/pyodide-profiles.ts`): `ml` contém `dados`. */
export const PYODIDE_PROFILE_IDS = ["dados", "ml"] as const
/** Nome de um perfil de worker do Pyodide. */
export type PyodideProfileId = (typeof PYODIDE_PROFILE_IDS)[number]

/** Nome de pacote normalizado (PEP 503): minúsculas, dígitos e hífens. */
const NORMALIZED_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
/** Versão fixada igual à do `pyodide-lock.json` (ex.: `2.4.6`). */
const PINNED_VERSION = /^\d+(?:\.\d+){1,3}$/

export const libraryManifestEntrySchema = z.strictObject({
  /** Nome do pacote como no `pyodide-lock.json`; é o que a lição escreve em `bibliotecas`. */
  name: z.string().regex(NORMALIZED_NAME),
  /** Versão do pacote no Pyodide do navegador e do executor (conferida contra o lock no CI). */
  version: z.string().regex(PINNED_VERSION),
  /** Outros nomes aceitos para a mesma biblioteca (ex.: `sklearn`). */
  aliases: z.array(z.string().regex(NORMALIZED_NAME)),
  display_name: z.string().min(1).max(120),
  description: z.string().min(1).max(300),
  category: libraryCategorySchema,
  /** Disponível no Pyodide do navegador (botão Executar e terminal). */
  browser: z.boolean(),
  /** Motores do servidor que a oferecem (o `runtime` da lição precisa estar aqui). */
  engines: z.array(pythonRuntimeSchema),
  /** Perfil mínimo de worker do Pyodide que a carrega; `null` quando nenhum motor Pyodide a oferece. */
  pyodide_profile: z.enum(PYODIDE_PROFILE_IDS).nullable(),
})
/** Uma biblioteca liberada. */
export type LibraryManifestEntry = z.infer<typeof libraryManifestEntrySchema>

/**
 * Bibliotecas liberadas, em ordem alfabética. Acrescentar uma entrada exige que o pacote exista no
 * `pyodide-lock.json` da versão usada (teste do runner) e esteja no `PACKAGES` de `fetch-pyodide.sh`.
 */
export const LIBRARY_MANIFEST: readonly LibraryManifestEntry[] = [
  {
    name: "matplotlib",
    version: "3.10.8",
    aliases: [],
    display_name: "Matplotlib",
    description: "Gráficos de linhas, barras, dispersão e histogramas.",
    category: "visualization",
    browser: true,
    engines: ["python-dados"],
    pyodide_profile: "ml",
  },
  {
    name: "networkx",
    version: "3.6.1",
    aliases: [],
    display_name: "NetworkX",
    description: "Grafos e redes: nós, arestas, caminhos e centralidade.",
    category: "math",
    browser: true,
    engines: ["python-dados"],
    pyodide_profile: "ml",
  },
  {
    name: "numpy",
    version: "2.4.6",
    aliases: [],
    display_name: "NumPy",
    description: "Arrays numéricos, álgebra linear e operações vetorizadas.",
    category: "data-science",
    browser: true,
    engines: ["python-dados"],
    pyodide_profile: "dados",
  },
  {
    name: "pandas",
    version: "3.0.2",
    aliases: [],
    display_name: "Pandas",
    description: "Tabelas (DataFrame), limpeza, agrupamento e análise de dados.",
    category: "data-science",
    browser: true,
    engines: ["python-dados"],
    pyodide_profile: "dados",
  },
  {
    name: "scikit-learn",
    version: "1.8.0",
    aliases: ["sklearn"],
    display_name: "scikit-learn",
    description: "Aprendizado de máquina clássico: regressão, classificação, validação e métricas.",
    category: "ml",
    browser: true,
    engines: ["python-dados"],
    pyodide_profile: "ml",
  },
  {
    name: "scipy",
    version: "1.18.0",
    aliases: [],
    display_name: "SciPy",
    description: "Computação científica: estatística, otimização e álgebra esparsa.",
    category: "math",
    browser: true,
    engines: ["python-dados"],
    pyodide_profile: "ml",
  },
  {
    name: "statsmodels",
    version: "0.14.6",
    aliases: [],
    display_name: "statsmodels",
    description: "Modelos estatísticos, testes de hipótese e séries temporais.",
    category: "data-science",
    browser: true,
    engines: ["python-dados"],
    pyodide_profile: "ml",
  },
  {
    name: "sympy",
    version: "1.14.0",
    aliases: [],
    display_name: "SymPy",
    description: "Matemática simbólica: álgebra, derivadas e integrais.",
    category: "math",
    browser: true,
    engines: ["python-dados"],
    pyodide_profile: "ml",
  },
]

/** Nome normalizado como no `pyodide-lock.json` (PEP 503): minúsculas, `_`/`.` viram `-`. */
export function normalizeLibraryName(name: string): string {
  return name.trim().toLowerCase().replace(/[-_.]+/g, "-")
}

/**
 * Procura a biblioteca pelo nome ou apelido (sem diferenciar maiúsculas nem `_`/`.`/`-`).
 *
 * @param manifest manifesto a consultar (padrão: {@link LIBRARY_MANIFEST}; os testes passam um próprio).
 */
export function findManifestLibrary(name: string, manifest: readonly LibraryManifestEntry[] = LIBRARY_MANIFEST): LibraryManifestEntry | undefined {
  const wanted = normalizeLibraryName(name)
  return manifest.find((entry) => entry.name === wanted || entry.aliases.includes(wanted))
}

/** Bibliotecas que o motor `runtime` do servidor oferece. */
export function listManifestLibrariesFor(runtime: PythonRuntime, manifest: readonly LibraryManifestEntry[] = LIBRARY_MANIFEST): LibraryManifestEntry[] {
  return manifest.filter((entry) => entry.engines.includes(runtime))
}

/** Resultado de {@link checkLibraries}: nomes (como digitados) que não podem ser usados, por motivo. */
export interface LibraryCheck {
  /** Fora do manifesto: ainda não liberadas (pendentes de pedido e PR) ou com o nome errado. */
  pending: string[]
  /** No manifesto, mas nenhum motor do servidor para o `runtime` da lição as oferece. */
  unavailable: string[]
}

/** Confere as bibliotecas de uma lição contra o manifesto para o `runtime` dela. */
export function checkLibraries(runtime: PythonRuntime, libraries: readonly string[], manifest: readonly LibraryManifestEntry[] = LIBRARY_MANIFEST): LibraryCheck {
  const result: LibraryCheck = { pending: [], unavailable: [] }
  for (const library of libraries) {
    const entry = findManifestLibrary(library, manifest)
    if (!entry) result.pending.push(library)
    else if (!entry.engines.includes(runtime)) result.unavailable.push(library)
  }
  return result
}

/**
 * Problemas de consistência do manifesto (lista vazia = válido): formato de cada entrada, nomes e
 * apelidos únicos e perfil do Pyodide coerente com os motores. O CI do contracts exige lista vazia.
 */
export function validateLibraryManifest(manifest: readonly unknown[]): string[] {
  const problems: string[] = []
  const owners = new Map<string, string>()
  manifest.forEach((raw, index) => {
    const parsed = libraryManifestEntrySchema.safeParse(raw)
    if (!parsed.success) {
      problems.push(`entrada ${index + 1}: ${parsed.error.issues.map((issue) => `${issue.path.join(".") || "(raiz)"}: ${issue.message}`).join("; ")}`)
      return
    }
    const entry = parsed.data
    for (const name of [entry.name, ...entry.aliases]) {
      const owner = owners.get(name)
      if (owner !== undefined) problems.push(`${entry.name}: o nome "${name}" já pertence a ${owner}`)
      else owners.set(name, entry.name)
    }
    if (entry.aliases.includes(entry.name)) problems.push(`${entry.name}: apelido igual ao nome`)
    const usesPyodideEngine = entry.engines.includes("python-dados")
    if (usesPyodideEngine && entry.pyodide_profile === null) problems.push(`${entry.name}: motor python-dados exige pyodide_profile`)
    if (!usesPyodideEngine && entry.pyodide_profile !== null) problems.push(`${entry.name}: pyodide_profile sem o motor python-dados`)
    if (usesPyodideEngine && !entry.browser) problems.push(`${entry.name}: o motor python-dados só oferece o que o Pyodide do navegador também tem (browser: true)`)
  })
  return problems
}
