import type { ProjectFile } from "@levelusp/contracts"
import type { PyodideAPI } from "pyodide"
import { z } from "zod"

/*
 * Execução de um projeto do aluno no Pyodide. Este módulo é usado pelo Web
 * Worker do botão "Executar" e pelo teste de paridade (Node), para que o teste
 * exercite exatamente o mesmo código que roda no navegador.
 *
 * A semântica imita a sonda `run` do executor oficial (apps/runner/python/harness.py),
 * que é quem dá o veredito no "Verificar": projeto em /work, arquivo de entrada
 * compilado com o caminho relativo, namespace com __name__ == "__main__",
 * stdin vindo de uma string, SystemExit(0) não é erro e o resumo do erro tem o
 * formato "Tipo: mensagem". Mudou um lado? Rode `pnpm --filter @levelusp/web test:paridade`.
 */

export const PROJECT_DIR = "/work"

/** Mesmo teto de texto do executor: saídas maiores são cortadas. */
export const MAX_OUTPUT_CHARS = 64_000

export interface ProjectRunRequest {
  files: readonly ProjectFile[]
  /** Arquivo executado como __main__; os demais ficam disponíveis para `import`. */
  entryPath: string
  /** Conteúdo lido por `input()`/`sys.stdin`. Vazio: `input()` lança EOFError, como no servidor. */
  stdin?: string
}

const pythonErrorSchema = z.object({
  /** Nome da classe da exceção (`NameError`, `SyntaxError`…). */
  type: z.string(),
  /** "Tipo: mensagem" — o mesmo texto que o executor do servidor devolve. */
  summary: z.string(),
  /** Traceback só com os quadros do projeto do aluno (termina no resumo). */
  traceback: z.string(),
})
export type PythonError = z.infer<typeof pythonErrorSchema>

const projectRunResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  error: pythonErrorSchema.nullable(),
  /** Figuras do matplotlib abertas ao fim da execução, em PNG base64. */
  figures: z.array(z.string()),
  truncated: z.boolean(),
})
export type ProjectRunResult = z.infer<typeof projectRunResultSchema>

export type ProjectRunner = (request: ProjectRunRequest) => ProjectRunResult

const HARNESS_SOURCE = String.raw`
import base64
import builtins
import contextlib
import importlib
import io
import json
import os
import shutil
import sys
import traceback

PROJECT = ${JSON.stringify(PROJECT_DIR)}
MAX_TEXT = ${MAX_OUTPUT_CHARS}

# O executor roda "python -I -S" (sem o módulo site), onde exit(), quit(), help()
# e afins não existem. Sem removê-los aqui, exit() funcionaria no "Executar" e
# daria NameError no "Verificar".
for _site_builtin in ("exit", "quit", "help", "copyright", "credits", "license"):
    builtins.__dict__.pop(_site_builtin, None)


def _clip(text):
    if len(text) > MAX_TEXT:
        return text[:MAX_TEXT], True
    return text, False


def _error_text(exc):
    message = str(exc)
    return "%s: %s" % (type(exc).__name__, message) if message else type(exc).__name__


def _is_project_frame(filename, entry):
    return filename == entry or filename.startswith(PROJECT + "/")


def _student_traceback(exc, entry):
    tb = exc.__traceback__
    while tb is not None and not _is_project_frame(tb.tb_frame.f_code.co_filename, entry):
        tb = tb.tb_next
    return "".join(traceback.format_exception(type(exc), exc, tb))


def _error(exc, entry):
    return {"type": type(exc).__name__, "summary": _error_text(exc), "traceback": _student_traceback(exc, entry)}


def _reset_project(files):
    # Módulos do projeto importados numa execução anterior não podem ficar em cache:
    # o aluno editou utils.py e espera ver a mudança.
    for name, module in list(sys.modules.items()):
        filename = getattr(module, "__file__", None)
        if isinstance(filename, str) and filename.startswith(PROJECT + "/"):
            del sys.modules[name]
    importlib.invalidate_caches()
    os.chdir("/")
    shutil.rmtree(PROJECT, ignore_errors=True)
    os.makedirs(PROJECT)
    for project_file in files:
        target = os.path.join(PROJECT, project_file["path"].lstrip("/"))
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8") as handle:
            handle.write(project_file["content"])
    if PROJECT not in sys.path:
        sys.path.insert(0, PROJECT)


def _collect_figures():
    pyplot = sys.modules.get("matplotlib.pyplot")
    if pyplot is None:
        return []
    figures = []
    try:
        for number in pyplot.get_fignums():
            buffer = io.BytesIO()
            pyplot.figure(number).savefig(buffer, format="png", bbox_inches="tight", dpi=100)
            figures.append(base64.b64encode(buffer.getvalue()).decode("ascii"))
    finally:
        pyplot.close("all")
    return figures


def run_project(files_json, entry, stdin_text):
    _reset_project(json.loads(files_json))
    path = os.path.join(PROJECT, entry)
    namespace = {"__name__": "__main__", "__file__": path, "__builtins__": builtins}
    captured_stdout, captured_stderr = io.StringIO(), io.StringIO()
    original_stdin = sys.stdin
    sys.stdin = io.StringIO(stdin_text)
    error = None
    try:
        with open(path, encoding="utf-8") as handle:
            source = handle.read()
        with contextlib.redirect_stdout(captured_stdout), contextlib.redirect_stderr(captured_stderr):
            os.chdir(PROJECT)
            exec(compile(source, entry, "exec"), namespace)
    except SystemExit as exc:
        if exc.code not in (None, 0):
            error = {"type": "SystemExit", "summary": "SystemExit: %s" % exc.code, "traceback": "SystemExit: %s\n" % exc.code}
    except BaseException as exc:  # noqa: BLE001 — qualquer erro do aluno vira resultado
        error = _error(exc, entry)
    finally:
        sys.stdin = original_stdin
    try:
        figures = _collect_figures()
    except Exception:  # noqa: BLE001 — figura quebrada não derruba a execução
        figures = []
    stdout, stdout_truncated = _clip(captured_stdout.getvalue())
    stderr, stderr_truncated = _clip(captured_stderr.getvalue())
    return json.dumps({
        "stdout": stdout,
        "stderr": stderr,
        "error": error,
        "figures": figures,
        "truncated": stdout_truncated or stderr_truncated,
    })


run_project
`

function isRunProjectFunction(value: unknown): value is (filesJson: string, entryPath: string, stdin: string) => unknown {
  return typeof value === "function"
}

/**
 * Carrega o harness num namespace próprio (fora do `__main__` do Pyodide) e
 * devolve a função que executa um projeto. Chame uma vez por runtime.
 */
export function createProjectRunner(pyodide: PyodideAPI): ProjectRunner {
  const runProject: unknown = pyodide.runPython(HARNESS_SOURCE, { globals: pyodide.toPy({}) })
  if (!isRunProjectFunction(runProject)) throw new Error("Harness de execução do Python inválido.")

  return ({ files, entryPath, stdin = "" }: ProjectRunRequest): ProjectRunResult => {
    const projectFiles = files.map(({ path, content }) => ({ path, content }))
    const rawResult = runProject(JSON.stringify(projectFiles), entryPath, stdin)
    if (typeof rawResult !== "string") throw new Error("Resposta inesperada do harness de execução.")
    return projectRunResultSchema.parse(JSON.parse(rawResult))
  }
}

/** Versão do Python embutida no runtime (ex.: "3.14.2"). */
export function readPythonVersion(pyodide: PyodideAPI): string {
  const version: unknown = pyodide.runPython("import platform; platform.python_version()")
  return typeof version === "string" ? version : "desconhecida"
}
