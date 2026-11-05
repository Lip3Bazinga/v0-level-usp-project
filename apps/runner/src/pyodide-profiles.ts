import { EngineRequestError } from "./engine.js"

/**
 * Perfis de worker do motor Pyodide. Um worker é aquecido com os pacotes do perfil
 * (descompactados no MEMFS e, os mais usados, já importados), então um lote só paga o
 * tempo do próprio código. `ml` contém `dados`: um pedido que mistura bibliotecas dos
 * dois perfis usa `ml`.
 */
export const PYODIDE_PROFILE_NAMES = ["dados", "ml"] as const
/** Nome de um perfil de worker. */
export type PyodideProfileName = (typeof PYODIDE_PROFILE_NAMES)[number]

/** O que um perfil carrega no aquecimento. */
export interface PyodideProfile {
  readonly name: PyodideProfileName
  /** Pacotes do `pyodide-lock.json` descompactados no worker (`loadPackage`). */
  readonly packages: readonly string[]
  /** Importações feitas no aquecimento (as mais caras: numpy, pandas, scikit-learn...). */
  readonly preload: string
  /** Expressão (só expressão: vai para `eval`) com resultado conhecido, conferida depois de cada lote na política `reuse`. */
  readonly canary: string
  /** Duração assumida do aquecimento antes da primeira medição (entra na estimativa de espera). */
  readonly initialBootMs: number
}

export const PYODIDE_PROFILES: Readonly<Record<PyodideProfileName, PyodideProfile>> = {
  dados: {
    name: "dados",
    packages: ["numpy", "pandas"],
    preload: "import numpy, pandas",
    canary: 'float(__import__("numpy").mean([1, 2, 3])) == 2.0 and int(__import__("pandas").Series([1, 2, 3]).sum()) == 6',
    initialBootMs: 6_000,
  },
  ml: {
    name: "ml",
    packages: ["numpy", "pandas", "scipy", "scikit-learn", "matplotlib", "statsmodels", "sympy", "networkx"],
    preload: [
      "import numpy, pandas, scipy, sklearn, sklearn.linear_model, sklearn.model_selection, matplotlib",
      "matplotlib.use('agg')",
      "import matplotlib.pyplot",
    ].join("\n"),
    canary: [
      'float(__import__("numpy").mean([1, 2, 3])) == 2.0 and int(__import__("pandas").Series([1, 2, 3]).sum()) == 6',
      ' and round(float(__import__("sklearn.linear_model", fromlist=["LinearRegression"]).LinearRegression().fit([[1], [2], [3]], [2, 4, 6]).coef_[0]), 6) == 2.0',
    ].join(""),
    initialBootMs: 18_000,
  },
}

/** Biblioteca que um lote pode pedir → perfil mínimo que a oferece (nomes normalizados como no lock). */
const LIBRARY_PROFILES: Readonly<Record<string, PyodideProfileName>> = {
  numpy: "dados",
  pandas: "dados",
  scipy: "ml",
  "scikit-learn": "ml",
  sklearn: "ml",
  matplotlib: "ml",
  statsmodels: "ml",
  sympy: "ml",
  networkx: "ml",
}

/** Bibliotecas aceitas pelo motor, para a mensagem de erro e para a documentação. */
export const PYODIDE_KNOWN_LIBRARIES: readonly string[] = Object.keys(LIBRARY_PROFILES)

/** Nome normalizado como no `pyodide-lock.json` (PEP 503): minúsculas, `_`/`.` viram `-`. */
export function normalizeLibraryName(name: string): string {
  return name.trim().toLowerCase().replace(/[-_.]+/g, "-")
}

/**
 * Escolhe o perfil de worker pelas bibliotecas pedidas: só numpy/pandas (ou nada) →
 * `dados`; qualquer uma de scipy/scikit-learn/matplotlib/statsmodels/sympy/networkx → `ml`.
 *
 * @throws EngineRequestError (`unknown_library`) para uma biblioteca fora do catálogo.
 */
export function resolveProfile(libraries: readonly string[]): PyodideProfileName {
  let profile: PyodideProfileName = "dados"
  for (const library of libraries) {
    const required = LIBRARY_PROFILES[normalizeLibraryName(library)]
    if (required === undefined) {
      throw new EngineRequestError(
        `Biblioteca não disponível no motor python-dados: "${library}" (disponíveis: ${PYODIDE_KNOWN_LIBRARIES.join(", ")})`,
        "unknown_library",
      )
    }
    if (required === "ml") profile = "ml"
  }
  return profile
}
