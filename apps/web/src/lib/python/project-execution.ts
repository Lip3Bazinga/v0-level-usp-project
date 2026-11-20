import type { ProjectFile } from "@levelusp/contracts"
import type { PyodideAPI } from "pyodide"
import type { PyProxy } from "pyodide/ffi"
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

/** Pedido de execução de um projeto (equivale à sonda `run` do executor). */
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
/** Exceção que encerrou a execução, já sem quadros internos. */
export type PythonError = z.infer<typeof pythonErrorSchema>

const projectRunResultSchema = z.object({
  stdout: z.string(),
  stderr: z.string(),
  error: pythonErrorSchema.nullable(),
  /** Figuras do matplotlib abertas ao fim da execução, em PNG base64. */
  figures: z.array(z.string()),
  truncated: z.boolean(),
})
/** Saída de uma execução no navegador. */
export type ProjectRunResult = z.infer<typeof projectRunResultSchema>

/** Função que executa um projeto no runtime já carregado. */
export type ProjectRunner = (request: ProjectRunRequest) => ProjectRunResult

/** Limite de passos registrados pelo visualizador de execução; ao estourar, a execução é interrompida. */
export const MAX_TRACE_STEPS = 500
/** Tamanho máximo, em caracteres, do valor de uma variável mostrado no visualizador. */
export const MAX_TRACE_VALUE_CHARS = 80
/** Variáveis registradas por escopo em cada passo do visualizador. */
export const MAX_TRACE_VARIABLES = 40

const traceVariableSchema = z.object({
  name: z.string(),
  /** `repr()` do valor, cortado em {@link MAX_TRACE_VALUE_CHARS}. */
  value: z.string(),
})
/** Variável de um escopo num passo da execução. */
export type TraceVariable = z.infer<typeof traceVariableSchema>

const traceStepSchema = z.object({
  /** Linha (1 = primeira) do arquivo executado que está prestes a rodar; no evento `return`, a linha que devolveu. */
  line: z.number().int(),
  /** `line`: antes de executar a linha; `return`: uma função acabou de devolver; `end`: o programa terminou. */
  event: z.enum(["line", "return", "end"]),
  /** Função em execução; null no nível do módulo. */
  function_name: z.string().nullable(),
  globals: z.array(traceVariableSchema),
  /** Variáveis locais da função em execução; null no nível do módulo. */
  locals: z.array(traceVariableSchema).nullable(),
  /** Quantos caracteres de `stdout` já tinham sido impressos neste passo. */
  stdout_length: z.number().int().min(0),
})
/** Um passo registrado pelo visualizador de execução. */
export type TraceStep = z.infer<typeof traceStepSchema>

const projectTraceSchema = z.object({
  steps: z.array(traceStepSchema),
  stdout: z.string(),
  error: pythonErrorSchema.nullable(),
  /** true quando a execução foi interrompida por passar de {@link MAX_TRACE_STEPS} passos. */
  truncated: z.boolean(),
})
/** Execução registrada passo a passo (linha, variáveis e saída) para o visualizador. */
export type ProjectTrace = z.infer<typeof projectTraceSchema>

/** Função que executa um projeto registrando cada passo do arquivo de entrada. */
export type ProjectTracer = (request: ProjectRunRequest) => ProjectTrace

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
import types

PROJECT = ${JSON.stringify(PROJECT_DIR)}
MAX_TEXT = ${MAX_OUTPUT_CHARS}
MAX_TRACE_STEPS = ${MAX_TRACE_STEPS}
MAX_TRACE_VALUE = ${MAX_TRACE_VALUE_CHARS}
MAX_TRACE_VARIABLES = ${MAX_TRACE_VARIABLES}

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


class _TraceLimit(BaseException):
    """Interrompe o programa do aluno quando o visualizador passa do limite de passos."""


def _describe(value):
    if isinstance(value, types.FunctionType):
        return "função %s" % value.__name__
    if isinstance(value, type):
        return "classe %s" % value.__name__
    try:
        text = repr(value)
    except BaseException:  # noqa: BLE001 — __repr__ do aluno pode falhar
        text = "<%s sem representação>" % type(value).__name__
    if len(text) > MAX_TRACE_VALUE:
        text = text[:MAX_TRACE_VALUE] + "…"
    return text


def _snapshot(scope):
    # Módulos, funções embutidas e nomes internos (__name__, __builtins__…) só poluiriam o painel.
    variables = []
    for name, value in list(scope.items()):
        if name.startswith("__") or isinstance(value, (types.ModuleType, types.BuiltinFunctionType)):
            continue
        if len(variables) >= MAX_TRACE_VARIABLES:
            break
        variables.append({"name": name, "value": _describe(value)})
    return variables


def trace_project(files_json, entry, stdin_text):
    _reset_project(json.loads(files_json))
    path = os.path.join(PROJECT, entry)
    namespace = {"__name__": "__main__", "__file__": path, "__builtins__": builtins}
    captured_stdout, captured_stderr = io.StringIO(), io.StringIO()
    original_stdin = sys.stdin
    sys.stdin = io.StringIO(stdin_text)
    steps = []
    error = None
    truncated = False
    last_line = 0

    def record(frame, event):
        nonlocal last_line
        if len(steps) >= MAX_TRACE_STEPS:
            raise _TraceLimit()
        is_module = frame.f_code.co_name == "<module>"
        last_line = frame.f_lineno
        steps.append({
            "line": frame.f_lineno,
            "event": event,
            "function_name": None if is_module else frame.f_code.co_name,
            "globals": _snapshot(frame.f_globals),
            "locals": None if is_module else _snapshot(frame.f_locals),
            "stdout_length": min(captured_stdout.tell(), MAX_TEXT),
        })

    def tracer(frame, event, _arg):
        # Só o arquivo de entrada é acompanhado: bibliotecas e outros arquivos rodam sem registro.
        if frame.f_code.co_filename != entry:
            return None
        if event == "line":
            record(frame, "line")
        elif event == "return" and frame.f_code.co_name != "<module>":
            record(frame, "return")
        return tracer

    try:
        with open(path, encoding="utf-8") as handle:
            source = handle.read()
        compiled = compile(source, entry, "exec")
        with contextlib.redirect_stdout(captured_stdout), contextlib.redirect_stderr(captured_stderr):
            os.chdir(PROJECT)
            sys.settrace(tracer)
            try:
                exec(compiled, namespace)
            finally:
                sys.settrace(None)
    except _TraceLimit:
        truncated = True
    except SystemExit as exc:
        if exc.code not in (None, 0):
            error = {"type": "SystemExit", "summary": "SystemExit: %s" % exc.code, "traceback": "SystemExit: %s\n" % exc.code}
    except BaseException as exc:  # noqa: BLE001 — qualquer erro do aluno vira resultado
        error = _error(exc, entry)
    finally:
        sys.settrace(None)
        sys.stdin = original_stdin
    stdout, _ = _clip(captured_stdout.getvalue())
    if not truncated and error is None:
        steps.append({
            "line": last_line,
            "event": "end",
            "function_name": None,
            "globals": _snapshot(namespace),
            "locals": None,
            "stdout_length": len(stdout),
        })
    try:
        _collect_figures()
    except Exception:  # noqa: BLE001 — as figuras não aparecem no visualizador; só não podem vazar para a próxima execução
        pass
    return json.dumps({"steps": steps, "stdout": stdout, "error": error, "truncated": truncated})


run_project
`

function isPyProxy(value: unknown): value is PyProxy {
  return typeof value === "object" && value !== null && "toJs" in value
}

function isHarnessFunction(value: unknown): value is (filesJson: string, entryPath: string, stdin: string) => unknown {
  return typeof value === "function"
}

// Um harness por runtime: "Executar" e "Visualizar" compartilham o mesmo escopo Python.
const harnessScopes = new WeakMap<PyodideAPI, PyProxy>()

/**
 * Escopo Python do harness (um por runtime, criado na primeira chamada). O terminal do navegador
 * carrega o seu código neste mesmo escopo para reaproveitar `PROJECT`, `MAX_TEXT`,
 * `_student_traceback` e `_collect_figures` em vez de copiá-los.
 *
 * @throws Error se o escopo não puder ser criado.
 */
export function harnessScope(pyodide: PyodideAPI): PyProxy {
  const existing = harnessScopes.get(pyodide)
  if (existing) return existing
  // `toPy` é tipado como `any` no pacote; aqui ele sempre devolve um dict Python vazio.
  const globals: unknown = pyodide.toPy({})
  if (!isPyProxy(globals)) throw new Error("Não foi possível criar o escopo do harness do Python.")
  pyodide.runPython(HARNESS_SOURCE, { globals })
  harnessScopes.set(pyodide, globals)
  return globals
}

function harnessFunction(pyodide: PyodideAPI, name: "run_project" | "trace_project"): (filesJson: string, entryPath: string, stdin: string) => unknown {
  const harnessEntry: unknown = pyodide.runPython(name, { globals: harnessScope(pyodide) })
  if (!isHarnessFunction(harnessEntry)) throw new Error("Harness de execução do Python inválido.")
  return harnessEntry
}

function serializeFiles(files: readonly ProjectFile[]): string {
  return JSON.stringify(files.map(({ path, content }) => ({ path, content })))
}

/**
 * Carrega o harness num namespace próprio (fora do `__main__` do Pyodide) e
 * devolve a função que executa um projeto. Chame uma vez por runtime.
 */
export function createProjectRunner(pyodide: PyodideAPI): ProjectRunner {
  const runProject = harnessFunction(pyodide, "run_project")
  return ({ files, entryPath, stdin = "" }: ProjectRunRequest): ProjectRunResult => {
    const rawResult = runProject(serializeFiles(files), entryPath, stdin)
    if (typeof rawResult !== "string") throw new Error("Resposta inesperada do harness de execução.")
    return projectRunResultSchema.parse(JSON.parse(rawResult))
  }
}

/**
 * Devolve a função do visualizador: executa o projeto com `sys.settrace` e registra, a cada
 * linha do arquivo de entrada, a linha, as variáveis e a saída. Para em {@link MAX_TRACE_STEPS}
 * passos (`truncated`). Usa o mesmo harness do {@link createProjectRunner}.
 */
export function createProjectTracer(pyodide: PyodideAPI): ProjectTracer {
  const traceProject = harnessFunction(pyodide, "trace_project")
  return ({ files, entryPath, stdin = "" }: ProjectRunRequest): ProjectTrace => {
    const rawResult = traceProject(serializeFiles(files), entryPath, stdin)
    if (typeof rawResult !== "string") throw new Error("Resposta inesperada do visualizador de execução.")
    return projectTraceSchema.parse(JSON.parse(rawResult))
  }
}

/** Versão do Python embutida no runtime (ex.: "3.14.2"). */
export function readPythonVersion(pyodide: PyodideAPI): string {
  const version: unknown = pyodide.runPython("import platform; platform.python_version()")
  return typeof version === "string" ? version : "desconhecida"
}
