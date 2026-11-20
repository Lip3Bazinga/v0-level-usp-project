import type { ProjectFile } from "@levelusp/contracts"
import type { PyodideAPI } from "pyodide"
import type { PyCallable } from "pyodide/ffi"
import { z } from "zod"
import { harnessScope } from "./project-execution"
import type { TerminalFsOperation, TerminalStatus } from "./worker-protocol"

/*
 * Lado Python do terminal do navegador (`python arquivo.py`, REPL, `ls`, `cat`). Roda no MESMO
 * runtime do "Executar" e no MESMO escopo do harness (project-execution.ts): reaproveita a pasta
 * do projeto (/work), o corte de saída, o traceback sem quadros internos e a coleta de figuras.
 *
 * `input()` precisa esperar o usuário digitar enquanto o Python está no meio da execução. Duas
 * estratégias, sem SharedArrayBuffer (logo, sem COOP/COEP — ver docs/v2/terminal-no-navegador.md):
 * - Suspensão de pilha (JSPI, `run_sync`): o Python espera a Promise da página. Chrome/Edge atuais.
 * - Reexecução (navegadores sem JSPI): `input()` interrompe o programa, a página pede a linha e o
 *   programa roda de novo com as respostas já dadas; o que ele já imprimiu não é repetido.
 */

/** Ponte entre o Python e a página (módulo `levelusp_terminal` visto pelo Python). */
export interface TerminalBridge {
  /** Texto escrito pelo programa, já agrupado em blocos. */
  write: (stream: "stdout" | "stderr", text: string) => void
  /** Pede uma linha ao usuário; resolve com `eof: true` no fim de entrada (Ctrl+D). */
  requestInput: () => Promise<{ eof: boolean; line: string }>
}

/** Resultado de um comando do terminal. */
export interface TerminalCommandResult {
  status: TerminalStatus
  /** Gráficos do matplotlib (PNG em base64) gerados pelo comando. */
  figures: string[]
}

/** Opções do runtime do terminal. */
export interface TerminalRuntimeOptions {
  /** `false` força a estratégia de reexecução (testes e navegadores sem JSPI). */
  allowStackSwitching?: boolean
}

/** Comandos do terminal no runtime Python já carregado. */
export interface TerminalRuntime {
  /** `true` quando `input()` espera por suspensão de pilha; `false` quando usa reexecução. */
  readonly canSuspendForInput: boolean
  /** `python arquivo.py`: roda o arquivo com os arquivos da lição em /work. */
  runScript: (files: readonly ProjectFile[], entryPath: string) => Promise<TerminalCommandResult>
  /** `ls` e `cat` sobre o sistema de arquivos do Pyodide (/work). */
  runFs: (op: TerminalFsOperation, args: readonly string[], files: readonly ProjectFile[]) => Promise<TerminalCommandResult>
  /** Abre um REPL novo (descarta o anterior). */
  startRepl: (files: readonly ProjectFile[]) => Promise<TerminalCommandResult>
  /** Envia uma linha ao REPL; `null` descarta o bloco incompleto. */
  pushRepl: (line: string | null) => Promise<TerminalCommandResult>
}

/** Nome do módulo Python que expõe a {@link TerminalBridge}. */
const BRIDGE_MODULE = "levelusp_terminal"

const TERMINAL_SOURCE = String.raw`
import code as _code
import posixpath
import random
import time
import warnings

import levelusp_terminal as _bridge
from pyodide.ffi import can_run_sync, run_sync

_FLUSH_CHARS = 8192
_FLUSH_SECONDS = 0.05
_synced = set()
_repl = None


class _NeedInput(BaseException):
    """input() sem como esperar (navegador sem JSPI): a página pede a linha e roda o programa de novo."""


class _TerminalIO:
    """Saída agrupada em blocos e entrada linha a linha de um comando do terminal."""

    def __init__(self):
        self.reset(0, [], False)

    def reset(self, skip, inputs, replay):
        self.skip = skip
        self.total = 0
        self.inputs = inputs
        self.next_input = 0
        self.replay = replay
        self.eof = False
        self.pending = []
        self.pending_size = 0
        self.pending_stream = "stdout"
        self.last_flush = time.monotonic()

    def flush(self):
        if self.pending:
            text = "".join(self.pending)
            self.pending = []
            self.pending_size = 0
            _bridge.write(self.pending_stream, text)
        self.last_flush = time.monotonic()

    def _queue(self, stream, text):
        if stream != self.pending_stream:
            self.flush()
            self.pending_stream = stream
        self.pending.append(text)
        self.pending_size += len(text)

    def write(self, stream, text):
        # Os primeiros "skip" caracteres já foram mostrados numa execução anterior (reexecução).
        start = self.total
        self.total += len(text)
        low = max(start, self.skip)
        high = min(self.total, MAX_TEXT)
        if high > low:
            self._queue(stream, text[low - start:high - start])
        if start < MAX_TEXT <= self.total and MAX_TEXT > self.skip:
            self._queue("stderr", "\n[saída cortada em %d caracteres]\n" % MAX_TEXT)
        if self.pending_size >= _FLUSH_CHARS or time.monotonic() - self.last_flush >= _FLUSH_SECONDS:
            self.flush()

    def read_line(self):
        """Próxima linha (com "\n") ou None no fim da entrada."""
        if self.eof:
            return None
        if self.next_input < len(self.inputs):
            value = self.inputs[self.next_input]
            self.next_input += 1
            if value is None:
                self.eof = True
                return None
            return value + "\n"
        self.flush()
        if can_run_sync():
            answer = run_sync(_bridge.request_input())
            if answer.eof:
                self.eof = True
                return None
            return str(answer.line) + "\n"
        if self.replay:
            raise _NeedInput()
        raise RuntimeError("input() no REPL exige um navegador com suspensão de pilha (Chrome ou Edge atuais). Use python arquivo.py.")


_term = _TerminalIO()


class _OutStream(io.TextIOBase):
    encoding = "utf-8"

    def __init__(self, stream):
        super().__init__()
        self._stream = stream

    def writable(self):
        return True

    def isatty(self):
        return False

    def write(self, text):
        if not isinstance(text, str):
            raise TypeError("write() argument must be str, not %s" % type(text).__name__)
        _term.write(self._stream, text)
        return len(text)

    def flush(self):
        _term.flush()


class _InStream(io.TextIOBase):
    encoding = "utf-8"

    def readable(self):
        return True

    def isatty(self):
        return False

    def readline(self, size=-1):
        line = _term.read_line()
        return "" if line is None else line

    def read(self, size=-1):
        chunks = []
        while True:
            line = _term.read_line()
            if line is None:
                return "".join(chunks)
            chunks.append(line)


def _input(prompt=""):
    if prompt:
        sys.stdout.write(str(prompt))
    line = _term.read_line()
    if line is None:
        raise EOFError("EOF when reading a line")
    return line[:-1]


@contextlib.contextmanager
def _terminal_streams():
    saved = (sys.stdout, sys.stderr, sys.stdin, builtins.input)
    sys.stdout, sys.stderr, sys.stdin = _OutStream("stdout"), _OutStream("stderr"), _InStream()
    builtins.input = _input
    os.chdir(PROJECT)
    try:
        yield
    finally:
        _term.flush()
        sys.stdout, sys.stderr, sys.stdin, builtins.input = saved
        os.chdir("/")


def _safe_path(relative):
    full = posixpath.normpath(posixpath.join(PROJECT, str(relative).lstrip("/")))
    return full if full == PROJECT or full.startswith(PROJECT + "/") else None


def _sync_files(files_json):
    # Os arquivos da lição são sempre os do editor; o que o programa criou (dados.txt) continua.
    os.makedirs(PROJECT, exist_ok=True)
    keep = set()
    for item in json.loads(files_json):
        target = _safe_path(item["path"])
        if target is None or target == PROJECT:
            continue
        try:
            os.makedirs(posixpath.dirname(target), exist_ok=True)
            with open(target, "w", encoding="utf-8") as handle:
                handle.write(item["content"])
        except OSError:
            continue
        keep.add(target)
    for old in _synced - keep:
        try:
            os.remove(old)
            folder = posixpath.dirname(old)
            while folder != PROJECT:
                os.rmdir(folder)  # só pastas vazias: falha (OSError) se ainda houver arquivos
                folder = posixpath.dirname(folder)
        except OSError:
            pass
    _synced.clear()
    _synced.update(keep)
    if PROJECT not in sys.path:
        sys.path.insert(0, PROJECT)
    importlib.invalidate_caches()


def _drop_project_modules():
    for name, module in list(sys.modules.items()):
        filename = getattr(module, "__file__", None)
        if isinstance(filename, str) and filename.startswith(PROJECT + "/"):
            del sys.modules[name]


def _take_figures():
    try:
        return _collect_figures()
    except Exception:  # noqa: BLE001 — figura quebrada não derruba o comando
        return []


def _exit_status(exc):
    if exc.code in (None, 0):
        return "ok"
    if isinstance(exc.code, str):
        sys.stderr.write(exc.code + "\n")
    return "error"


def _exec_script(path, entry):
    namespace = {"__name__": "__main__", "__file__": path, "__builtins__": builtins}
    sys.argv = [entry]
    try:
        with open(path, encoding="utf-8") as handle:
            source = handle.read()
        exec(compile(source, entry, "exec"), namespace)
    except _NeedInput:
        return "need_input"
    except SystemExit as exc:
        return _exit_status(exc)
    except BaseException as exc:  # noqa: BLE001 — qualquer erro do aluno vira saída do terminal
        sys.stderr.write(_student_traceback(exc, entry))
        return "error"
    return "ok"


def _result(status, figures):
    return json.dumps({"status": status, "emitted": _term.total, "figures": figures})


def terminal_run(files_json, entry, inputs_json, skip, seed):
    _sync_files(files_json)
    _drop_project_modules()
    _term.reset(skip, json.loads(inputs_json), True)
    random.seed(seed)
    path = _safe_path(entry)
    with _terminal_streams(), warnings.catch_warnings():
        warnings.filterwarnings("ignore", message=".*non-interactive.*", category=UserWarning)
        if path is None or not os.path.isfile(path):
            sys.stderr.write("python: não foi possível abrir o arquivo '%s': arquivo inexistente\n" % entry)
            status = "error"
        else:
            status = _exec_script(path, entry)
    figures = _take_figures()
    return _result(status, [] if status == "need_input" else figures)


def terminal_repl_start(files_json):
    global _repl
    _sync_files(files_json)
    _repl = _code.InteractiveConsole({"__name__": "__main__", "__doc__": None}, "<stdin>")
    return _result("ok", [])


def terminal_repl_push(line, discard):
    if _repl is None:
        return _result("exit", [])
    if discard:
        _repl.resetbuffer()
        return _result("ok", [])
    _term.reset(0, [], False)
    status = "ok"
    with _terminal_streams(), warnings.catch_warnings():
        warnings.filterwarnings("ignore", message=".*non-interactive.*", category=UserWarning)
        try:
            status = "more" if _repl.push(line) else "ok"
        except SystemExit:
            status = "exit"
    # Gráficos só aparecem no plt.show(): antes disso o aluno ainda está montando a figura.
    figures = _take_figures() if "show(" in line else []
    return _result(status, figures)


def terminal_fs(op, args_json, files_json):
    _sync_files(files_json)
    args = json.loads(args_json)
    out, err = [], []
    if op == "ls":
        for arg in [a for a in args if not a.startswith("-")] or ["."]:
            target = _safe_path(arg)
            if target is None or not os.path.exists(target):
                err.append("ls: não foi possível acessar '%s': arquivo ou diretório inexistente" % arg)
            elif os.path.isdir(target):
                names = sorted(
                    name + ("/" if os.path.isdir(os.path.join(target, name)) else "")
                    for name in os.listdir(target)
                    if not name.startswith(".")
                )
                out.extend(names)
            else:
                out.append(arg)
        text = "".join(line + "\n" for line in out)
    else:
        text = ""
        if not args:
            err.append("cat: informe o arquivo. Exemplo: cat main.py")
        for arg in args:
            target = _safe_path(arg)
            if target is None or not os.path.exists(target):
                err.append("cat: %s: arquivo ou diretório inexistente" % arg)
            elif os.path.isdir(target):
                err.append("cat: %s: é um diretório" % arg)
            else:
                with open(target, encoding="utf-8", errors="replace") as handle:
                    content = handle.read(MAX_TEXT + 1)
                if len(content) > MAX_TEXT:
                    content = content[:MAX_TEXT] + "\n[arquivo cortado em %d caracteres]\n" % MAX_TEXT
                text += content
    return json.dumps({"stdout": text, "stderr": "".join(line + "\n" for line in err)})


terminal_run
`

const commandResultSchema = z.object({
  status: z.enum(["ok", "error", "exit", "more", "need_input"]),
  /** Caracteres já contados na saída (para a reexecução não repetir o que foi mostrado). */
  emitted: z.number().int().min(0),
  figures: z.array(z.string()),
})

const fsResultSchema = z.object({ stdout: z.string(), stderr: z.string() })

const TERMINAL_FUNCTIONS = ["terminal_run", "terminal_repl_start", "terminal_repl_push", "terminal_fs"] as const
type TerminalFunctionName = (typeof TERMINAL_FUNCTIONS)[number]

const MAX_SEED = 2 ** 31

function serializeFiles(files: readonly ProjectFile[]): string {
  return JSON.stringify(files.map(({ path, content }) => ({ path, content })))
}

function parseJsonResult(raw: unknown): unknown {
  if (typeof raw !== "string") throw new Error("Resposta inesperada do terminal Python.")
  return JSON.parse(raw)
}

async function supportsStackSwitching(pyodide: PyodideAPI): Promise<boolean> {
  // `can_run_sync` só é verdadeiro dentro de uma chamada assíncrona (runPythonAsync / callPromising).
  const supported: unknown = await pyodide.runPythonAsync("from pyodide.ffi import can_run_sync\ncan_run_sync()")
  return supported === true
}

/**
 * Carrega o código do terminal no escopo do harness e devolve os comandos. Chame uma vez por runtime.
 *
 * @throws Error se o Python do terminal não carregar (o worker avisa a página).
 */
export async function createTerminalRuntime(pyodide: PyodideAPI, bridge: TerminalBridge, options: TerminalRuntimeOptions = {}): Promise<TerminalRuntime> {
  pyodide.registerJsModule(BRIDGE_MODULE, { write: bridge.write, request_input: bridge.requestInput })
  const scope = harnessScope(pyodide)
  pyodide.runPython(TERMINAL_SOURCE, { globals: scope })
  const canSuspendForInput = options.allowStackSwitching !== false && (await supportsStackSwitching(pyodide))

  const functions = Object.fromEntries(
    TERMINAL_FUNCTIONS.map((name) => {
      const entry: unknown = pyodide.runPython(name, { globals: scope })
      return [name, entry]
    }),
  ) as Record<TerminalFunctionName, PyCallable>

  const call = async (name: TerminalFunctionName, ...args: unknown[]): Promise<unknown> => {
    const target = functions[name]
    // Só a entrada assíncrona (callPromising) deixa o Python esperar a Promise de `input()`.
    if (canSuspendForInput) return target.callPromising(...args)
    return target(...args)
  }

  const runScript = async (files: readonly ProjectFile[], entryPath: string): Promise<TerminalCommandResult> => {
    const filesJson = serializeFiles(files)
    const seed = Math.floor(Math.random() * MAX_SEED)
    const inputs: Array<string | null> = []
    let skip = 0
    for (;;) {
      const outcome = commandResultSchema.parse(parseJsonResult(await call("terminal_run", filesJson, entryPath, JSON.stringify(inputs), skip, seed)))
      if (outcome.status !== "need_input") return { status: outcome.status, figures: outcome.figures }
      // Reexecução: o programa parou em input(); pede a linha e roda de novo sem repetir a saída.
      skip = outcome.emitted
      const answer = await bridge.requestInput()
      inputs.push(answer.eof ? null : answer.line)
    }
  }

  const asReplResult = (raw: unknown): TerminalCommandResult => {
    const outcome = commandResultSchema.parse(parseJsonResult(raw))
    return { status: outcome.status === "need_input" ? "error" : outcome.status, figures: outcome.figures }
  }

  return {
    canSuspendForInput,
    runScript,
    runFs: async (op, args, files) => {
      const output = fsResultSchema.parse(parseJsonResult(await call("terminal_fs", op, JSON.stringify(args), serializeFiles(files))))
      if (output.stdout) bridge.write("stdout", output.stdout)
      if (output.stderr) bridge.write("stderr", output.stderr)
      return { status: output.stderr ? "error" : "ok", figures: [] }
    },
    startRepl: async (files) => asReplResult(await call("terminal_repl_start", serializeFiles(files))),
    pushRepl: async (line) => asReplResult(await call("terminal_repl_push", line ?? "", line === null)),
  }
}
