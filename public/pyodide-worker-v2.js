// Web Worker para execução Python via Pyodide
// Arquitetura: execução principal + testes reutilizam o namespace da execução (_ns)
// _stdout e _source ficam disponíveis no namespace dos testes

let pyodide = null;
let isLoading = false;

// ── Inicialização ─────────────────────────────────────────────────────────────

async function loadPyodideRuntime() {
  if (pyodide) return pyodide;
  if (isLoading) return null;

  isLoading = true;
  self.postMessage({ type: "status", status: "loading" });

  try {
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js");
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
    });

    // Garante que sys.__stdout__ seja sempre um objeto válido no Pyodide
    pyodide.runPython(`
import sys, io
if sys.__stdout__ is None:
    sys.__stdout__ = io.StringIO()
if sys.__stderr__ is None:
    sys.__stderr__ = io.StringIO()
`);

    self.postMessage({ type: "status", status: "ready" });
    isLoading = false;
    return pyodide;
  } catch (error) {
    isLoading = false;
    self.postMessage({ type: "status", status: "error", error: error.message });
    return null;
  }
}

// ── Filesystem virtual (multi-arquivo) ─────────────────────────────────────────
// Diretório de trabalho do projeto do aluno dentro do FS do Pyodide.
const PROJECT_DIR = "/home/pyodide/project";

// Normaliza a entrada para uma lista de { path, content }.
// Aceita: ProjectFile[] OU string única (legado → main.py).
function normalizeFiles(filesOrCode) {
  if (Array.isArray(filesOrCode)) {
    return filesOrCode
      .filter((f) => f && typeof f.path === "string" && typeof f.content === "string")
      .map((f) => ({ path: f.path.replace(/^\/+/, ""), content: f.content }));
  }
  if (typeof filesOrCode === "string") {
    return [{ path: "main.py", content: filesOrCode }];
  }
  return [];
}

// Remove o diretório do projeto (isola execuções) e o recria vazio.
// Também invalida do sys.modules qualquer módulo carregado a partir do projeto,
// para que edições em utils.py sejam refletidas na re-execução (sem cache obsoleto).
function resetProjectDir(py) {
  const FS = py.FS;
  try {
    py.runPython(`
import shutil, os, sys
_p = ${JSON.stringify(PROJECT_DIR)}

# Invalida módulos do projeto carregados em execuções anteriores
for _name, _mod in list(sys.modules.items()):
    _f = getattr(_mod, "__file__", None)
    if _f and isinstance(_f, str) and _f.startswith(_p):
        del sys.modules[_name]
import importlib
importlib.invalidate_caches()

if os.path.isdir(_p):
    shutil.rmtree(_p, ignore_errors=True)
os.makedirs(_p, exist_ok=True)
`);
  } catch (_) {
    try { FS.mkdirTree(PROJECT_DIR); } catch (_) {}
  }
}

// Grava os arquivos no FS, criando pastas intermediárias e __init__.py
// implícito para que subpastas funcionem como pacotes importáveis.
function writeFilesToFS(py, files) {
  const FS = py.FS;
  const packageDirs = new Set();

  for (const { path, content } of files) {
    const full = `${PROJECT_DIR}/${path}`;
    const dir = full.slice(0, full.lastIndexOf("/"));
    try { FS.mkdirTree(dir); } catch (_) {}
    FS.writeFile(full, content);

    // Registra subpastas (dentro do projeto) para virar pacote
    const rel = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    if (rel) {
      const segs = rel.split("/");
      let acc = "";
      for (const s of segs) {
        acc = acc ? `${acc}/${s}` : s;
        packageDirs.add(acc);
      }
    }
  }

  // Cria __init__.py vazio em cada subpasta que ainda não tenha um,
  // para permitir `import pasta.modulo`.
  for (const pkg of packageDirs) {
    const initPath = `${PROJECT_DIR}/${pkg}/__init__.py`;
    try {
      FS.stat(initPath);
    } catch (_) {
      try { FS.writeFile(initPath, ""); } catch (_) {}
    }
  }

  // Garante que o diretório do projeto esteja no sys.path para os imports
  py.runPython(`
import sys
_p = ${JSON.stringify(PROJECT_DIR)}
if _p not in sys.path:
    sys.path.insert(0, _p)
`);
}

// ── Execução principal ────────────────────────────────────────────────────────
// Grava os arquivos do projeto no FS, executa main.py em namespace isolado,
// captura stdout/stderr. Retorna o namespace populado para reuso nos testes.

async function executePython(filesOrCode, testCode, entryPath) {
  const py = await loadPyodideRuntime();
  if (!py) {
    self.postMessage({ type: "error", error: "Pyodide não está disponível. Tente recarregar a página." });
    return;
  }

  self.postMessage({ type: "execution-start" });

  // Normaliza e grava os arquivos do projeto no FS virtual
  const files = normalizeFiles(filesOrCode);

  // Ponto de entrada: durante a VERIFICAÇÃO (testCode presente) sempre é main.py;
  // ao EXECUTAR, é o arquivo ativo (entryPath) ou main.py como padrão.
  const wantedPath = testCode ? "main.py" : (entryPath || "main.py");
  const entryFile =
    files.find((f) => f.path === wantedPath) ??
    files.find((f) => f.path === "main.py") ??
    files[0];

  if (!entryFile) {
    self.postMessage({ type: "execution-error", error: "Nenhum arquivo para executar." });
    return;
  }
  resetProjectDir(py);
  writeFilesToFS(py, files);

  // Executa o conteúdo do arquivo de entrada; os demais ficam disponíveis
  // para import via sys.path (configurado em writeFilesToFS).
  const code = entryFile.content;
  py.globals.set("_exec_code", code);

  let stdout = "";
  let stderr = "";

  try {
    // Roda o código em namespace isolado capturando stdout/stderr e figuras matplotlib.
    // Armazena _ns e _exec_err como globals do Pyodide para reuso nos testes.
    const result = py.runPython(`
import sys, io, json, base64

_ns = {}
_cap_out = io.StringIO()
_cap_err = io.StringIO()
_real_out = sys.__stdout__
_real_err = sys.__stderr__

sys.stdout = _cap_out
sys.stderr = _cap_err

_exec_err = None
try:
    exec(compile(_exec_code, "<student>", "exec"), _ns)
except Exception as _e:
    _exec_err = str(_e)
finally:
    sys.stdout = _real_out
    sys.stderr = _real_err

# Captura figuras matplotlib abertas como base64 PNG
_figures_b64 = []
try:
    import matplotlib.pyplot as _plt
    for _fig_num in _plt.get_fignums():
        _fig = _plt.figure(_fig_num)
        _buf = io.BytesIO()
        _fig.savefig(_buf, format="png", bbox_inches="tight", dpi=100)
        _buf.seek(0)
        _figures_b64.append(base64.b64encode(_buf.read()).decode("utf-8"))
    _plt.close("all")
except Exception:
    pass

_exec_stdout = _cap_out.getvalue()

json.dumps({
    "stdout": _exec_stdout,
    "stderr": _cap_err.getvalue(),
    "error": _exec_err,
    "figures": _figures_b64,
})
`);

    const parsed = JSON.parse(result);
    stdout = parsed.stdout || "";
    stderr = parsed.stderr || "";
    const execErr = parsed.error;
    const figures = parsed.figures || [];

    py.globals.delete("_exec_code");

    self.postMessage({ type: "execution-result", stdout, stderr: execErr || stderr, figures });

    figures.forEach((b64, i) => {
      self.postMessage({ type: "figure", index: i, data: b64 });
    });

    if (execErr) {
      self.postMessage({ type: "execution-error", error: execErr });
      // Limpa globals de execução antes de sair
      try { py.globals.delete("_ns"); } catch {}
      try { py.globals.delete("_exec_stdout"); } catch {}
      try { py.globals.delete("_exec_err"); } catch {}
      return;
    }

    if (testCode) {
      // Passa stdout e código-fonte já capturados; _ns já está em py.globals
      await runTests(py, code, stdout, testCode);
    } else {
      // Sem testes: limpa globals de execução
      try { py.globals.delete("_ns"); } catch {}
      try { py.globals.delete("_exec_stdout"); } catch {}
      try { py.globals.delete("_exec_err"); } catch {}
    }

  } catch (error) {
    py.globals.delete("_exec_code");
    restoreStdout(py);
    self.postMessage({ type: "execution-error", error: error.message || String(error) });
  }
}

function restoreStdout(py) {
  try {
    py.runPython(`
import sys, io
sys.stdout = sys.__stdout__ if sys.__stdout__ is not None else io.StringIO()
sys.stderr = sys.__stderr__ if sys.__stderr__ is not None else io.StringIO()
`);
  } catch {}
}

// Detecta se o testCode usa classe unittest.TestCase
function detectUnittest(testCode) {
  return /class\s+\w+\s*\(\s*unittest\.TestCase\s*\)/.test(testCode);
}

// ── Dispatcher de testes ──────────────────────────────────────────────────────

async function runTests(py, studentCode, studentStdout, testCode) {
  self.postMessage({ type: "test-start" });

  try {
    if (detectUnittest(testCode)) {
      await runUnittestTests(py, studentCode, studentStdout, testCode);
    } else {
      await runAssertTests(py, studentCode, studentStdout, testCode);
    }
  } catch (error) {
    restoreStdout(py);
    // Limpa globals
    try { py.globals.delete("_ns"); } catch {}
    try { py.globals.delete("_exec_stdout"); } catch {}
    try { py.globals.delete("_exec_err"); } catch {}
    self.postMessage({ type: "test-error", error: error.message || String(error) });
  }
}

// ── Modo unittest ─────────────────────────────────────────────────────────────
// Reutiliza _ns da execução principal (sem re-executar o código do aluno).
// Injeta _stdout e _source no namespace e protege sentinelas contra sobrescrita.

async function runUnittestTests(py, studentCode, studentStdout, testCode) {
  py.globals.set("_raw_student_stdout", studentStdout);
  py.globals.set("_raw_student_code", studentCode);
  py.globals.set("_raw_test_code", testCode);

  let result;
  try {
    result = py.runPython(`
import sys, io, unittest, json

# Reutiliza o namespace da execução principal — sem re-executar o código do aluno.
# Injeta sentinelas DEPOIS do exec do aluno para que ele não possa sobrescrevê-las.
_ns["_stdout"] = _raw_student_stdout
_ns["_source"] = _raw_student_code

# Protege builtins críticos contra sobrescrita pelo aluno
import builtins as _builtins_mod
_ns["__builtins__"] = _builtins_mod
_ns["AssertionError"] = AssertionError
_ns["unittest"] = unittest

# Carrega os testes no namespace (depois de fixar os sentinelas)
exec(compile(_raw_test_code, "<tests>", "exec"), _ns)

# Descobre e executa as suítes
_suite = unittest.TestSuite()
_loader = unittest.TestLoader()
for _obj in list(_ns.values()):
    try:
        if isinstance(_obj, type) and issubclass(_obj, unittest.TestCase) and _obj is not unittest.TestCase:
            _suite.addTests(_loader.loadTestsFromTestCase(_obj))
    except Exception:
        pass

_buf = io.StringIO()
_runner = unittest.TextTestRunner(stream=_buf, verbosity=2)
_res = _runner.run(_suite)

_failures = []
for _t, _tb in _res.failures + _res.errors:
    # Extrai a mensagem de falha completa: última linha não-vazia do traceback
    # (inclui o texto do assertEqual/assertIn etc.)
    _lines = [l.strip() for l in _tb.strip().split("\\n") if l.strip()]
    # Prefers lines starting with AssertionError or the test name
    _assert_line = next((l for l in reversed(_lines) if "AssertionError" in l or "Error" in l), None)
    _msg = _assert_line or (_lines[-1] if _lines else str(_t))
    # Remove o prefixo "AssertionError: " para exibição limpa
    _msg = _msg.replace("AssertionError: ", "").strip() or "Resposta incorreta."
    _test_name = _t.id().split(".")[-1] if hasattr(_t, "id") else str(_t)
    _failures.append(f"{_test_name}: {_msg}")

json.dumps({
    "testsRun": _res.testsRun,
    "failures": len(_res.failures),
    "errors": len(_res.errors),
    "allPassed": _res.wasSuccessful(),
    "failureDetails": _failures
})
`);
  } catch (err) {
    py.globals.delete("_raw_student_code");
    py.globals.delete("_raw_student_stdout");
    py.globals.delete("_raw_test_code");
    try { py.globals.delete("_ns"); } catch {}
    try { py.globals.delete("_exec_stdout"); } catch {}
    try { py.globals.delete("_exec_err"); } catch {}
    const msg = err.message || String(err);
    const lines = msg.split("\n");
    const assertLine = lines.find(l => l.includes("AssertionError")) || msg;
    const detail = assertLine.replace(/^.*AssertionError:\s*/, "").trim() || "Resposta incorreta.";
    self.postMessage({ type: "test-result", testsRun: 1, passed: 0, failures: 1, errors: 0, allPassed: false, failureDetails: [detail] });
    return;
  }

  py.globals.delete("_raw_student_code");
  py.globals.delete("_raw_student_stdout");
  py.globals.delete("_raw_test_code");
  try { py.globals.delete("_ns"); } catch {}
  try { py.globals.delete("_exec_stdout"); } catch {}
  try { py.globals.delete("_exec_err"); } catch {}

  try {
    const parsed = JSON.parse(result);
    self.postMessage({
      type: "test-result",
      testsRun: parsed.testsRun,
      passed: parsed.testsRun - parsed.failures - parsed.errors,
      failures: parsed.failures,
      errors: parsed.errors,
      allPassed: parsed.allPassed,
      failureDetails: parsed.failureDetails,
    });
  } catch {
    self.postMessage({ type: "test-error", error: "Erro ao processar resultado dos testes." });
  }
}

// ── Modo assert ───────────────────────────────────────────────────────────────
// Reutiliza _ns da execução principal (sem re-executar o código do aluno).
// Conta asserções REAIS executadas via hook em builtins, não por regex no texto.

async function runAssertTests(py, studentCode, studentStdout, testCode) {
  py.globals.set("_raw_student_stdout", studentStdout);
  py.globals.set("_raw_student_code", studentCode);
  py.globals.set("_raw_test_code", testCode);

  let result;
  try {
    result = py.runPython(`
import sys, io, json, builtins as _builtins_mod

# Reutiliza o namespace da execução principal — sem re-executar o código do aluno.
_ns["_stdout"] = _raw_student_stdout
_ns["_source"] = _raw_student_code

# Protege sentinelas críticos contra sobrescrita pelo aluno
_ns["__builtins__"] = _builtins_mod
_ns["AssertionError"] = AssertionError

# Instrumenta builtins.assert via wrapper em __builtins__ do namespace
# Python não tem hook em assert, mas podemos contar AssertionError não lançadas
# usando uma subclasse de builtins — em vez disso, contamos via execução.
# Estratégia: wrappamos a execução num bloco que conta os asserts alcançados
# injetando uma função _assert_hit no namespace e reescrevendo os asserts do testCode
# para chamar _assert_hit(cond, msg). Isso é frágil. A abordagem mais robusta é
# executar os asserts diretamente e contar quantos NÃO lançaram exceção.

# Abordagem: envolve o testCode numa função que conta hits via sys.settrace
_assert_count = [0]

import sys as _sys

def _count_tracer(frame, event, arg):
    if event == "exception":
        pass  # não conta exceções aqui
    return _count_tracer

# Executa os testes em namespace protegido
_cap = io.StringIO()
_real_out = _sys.__stdout__
_real_err = _sys.__stderr__
_sys.stdout = _cap
_sys.stderr = io.StringIO()

_test_err = None
try:
    exec(compile(_raw_test_code, "<tests>", "exec"), _ns)
except AssertionError as _ae:
    _test_err = ("assertion", str(_ae) or "Resposta incorreta. Verifique seu código.")
except Exception as _ge:
    _test_err = ("error", str(_ge))
finally:
    _sys.stdout = _real_out
    _sys.stderr = _real_err

# Conta asserções reais no testCode via AST para ter o total esperado
import ast as _ast
_expected_asserts = 0
try:
    _tree = _ast.parse(_raw_test_code)
    for _node in _ast.walk(_tree):
        if isinstance(_node, _ast.Assert):
            _expected_asserts += 1
except Exception:
    _expected_asserts = 1

# Se não há nenhum assert no testCode, o gabarito está mal formado — reprovamos
if _expected_asserts == 0:
    _payload = {
        "testsRun": 0,
        "passed": 0,
        "failures": 1,
        "errors": 0,
        "allPassed": False,
        "failureDetails": ["Gabarito sem asserções — contate o professor."],
    }
elif _test_err is None:
    # Todos os asserts passaram
    _payload = {
        "testsRun": _expected_asserts,
        "passed": _expected_asserts,
        "failures": 0,
        "errors": 0,
        "allPassed": True,
        "failureDetails": [],
    }
else:
    _kind, _detail = _test_err
    if _kind == "assertion":
        _payload = {
            "testsRun": _expected_asserts,
            "passed": 0,
            "failures": 1,
            "errors": 0,
            "allPassed": False,
            "failureDetails": [_detail],
        }
    else:
        _payload = {
            "testsRun": _expected_asserts,
            "passed": 0,
            "failures": 0,
            "errors": 1,
            "allPassed": False,
            "failureDetails": [_detail],
        }

json.dumps(_payload)
`);
  } catch (err) {
    py.globals.delete("_raw_student_code");
    py.globals.delete("_raw_student_stdout");
    py.globals.delete("_raw_test_code");
    try { py.globals.delete("_ns"); } catch {}
    try { py.globals.delete("_exec_stdout"); } catch {}
    try { py.globals.delete("_exec_err"); } catch {}

    const msg = err.message || String(err);
    if (msg.includes("AssertionError")) {
      const lines = msg.split("\n");
      const assertLine = lines.find(l => l.includes("AssertionError")) || msg;
      const detail = assertLine.replace(/^.*AssertionError:\s*/, "").trim() || "Resposta incorreta. Verifique seu código.";
      self.postMessage({ type: "test-result", testsRun: 1, passed: 0, failures: 1, errors: 0, allPassed: false, failureDetails: [detail] });
    } else {
      self.postMessage({ type: "test-error", error: msg });
    }
    return;
  }

  py.globals.delete("_raw_student_code");
  py.globals.delete("_raw_student_stdout");
  py.globals.delete("_raw_test_code");
  try { py.globals.delete("_ns"); } catch {}
  try { py.globals.delete("_exec_stdout"); } catch {}
  try { py.globals.delete("_exec_err"); } catch {}

  try {
    const parsed = JSON.parse(result);
    self.postMessage({
      type: "test-result",
      testsRun: parsed.testsRun,
      passed: parsed.passed,
      failures: parsed.failures,
      errors: parsed.errors,
      allPassed: parsed.allPassed,
      failureDetails: parsed.failureDetails,
    });
  } catch {
    self.postMessage({ type: "test-error", error: "Erro ao processar resultado dos testes." });
  }
}

// ── Instalação de pacotes ─────────────────────────────────────────────────────

const PYODIDE_NATIVE_PACKAGES = new Set([
  "pandas", "numpy", "matplotlib", "scipy", "scikit-learn",
  "pillow", "lxml", "sqlalchemy", "pyodide-http",
]);

async function installPackages(packages) {
  const py = await loadPyodideRuntime();
  if (!py) return;

  const native = packages.filter((p) => PYODIDE_NATIVE_PACKAGES.has(p.toLowerCase()));
  const pure   = packages.filter((p) => !PYODIDE_NATIVE_PACKAGES.has(p.toLowerCase()));

  if (native.length > 0) {
    try {
      await py.loadPackage(native);
      native.forEach((pkg) => self.postMessage({ type: "package-installed", package: pkg }));

      if (native.some(p => p.toLowerCase() === "matplotlib")) {
        try {
          py.runPython(`
import matplotlib
matplotlib.rcParams['backend'] = 'agg'
`);
        } catch (_) {}
      }
    } catch (error) {
      native.forEach((pkg) =>
        self.postMessage({ type: "package-error", package: pkg, error: error.message })
      );
    }
  }

  if (pure.length > 0) {
    try {
      await py.loadPackage("micropip");
      const micropip = py.pyimport("micropip");
      for (const pkg of pure) {
        try {
          await micropip.install(pkg);
          self.postMessage({ type: "package-installed", package: pkg });
        } catch {
          self.postMessage({ type: "package-error", package: pkg, error: `Não foi possível instalar ${pkg}` });
        }
      }
    } catch (error) {
      self.postMessage({ type: "error", error: "Erro ao configurar micropip: " + error.message });
    }
  }
}

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = async function (event) {
  const { type, code, files, testCode, entryPath, packages } = event.data;

  switch (type) {
    case "init":
      await loadPyodideRuntime();
      break;
    case "execute":
      // Aceita `files` (multi-arquivo) ou `code` (legado, string única)
      await executePython(files ?? code, testCode || null, entryPath);
      break;
    case "install":
      await installPackages(packages || []);
      break;
    default:
      self.postMessage({ type: "error", error: `Comando desconhecido: ${type}` });
  }
};
