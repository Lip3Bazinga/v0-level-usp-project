// Web Worker para execução Python via Pyodide
// Arquitetura: execução principal + testes sempre rodam em namespace isolado (_ns)
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

// ── Execução principal ────────────────────────────────────────────────────────
// Roda o código do aluno em namespace isolado, captura stdout/stderr.
// Se testCode existir, roda os testes logo após.

async function executePython(code, testCode) {
  const py = await loadPyodideRuntime();
  if (!py) {
    self.postMessage({ type: "error", error: "Pyodide não está disponível. Tente recarregar a página." });
    return;
  }

  self.postMessage({ type: "execution-start" });

  // Passa o código-fonte para o Python de forma segura (evita problemas de escaping)
  py.globals.set("_exec_code", code);

  let stdout = "";
  let stderr = "";

  try {
    // Roda o código em namespace isolado capturando stdout/stderr e figuras matplotlib
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

json.dumps({
    "stdout": _cap_out.getvalue(),
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

    // Envia cada figura como mensagem separada
    figures.forEach((b64, i) => {
      self.postMessage({ type: "figure", index: i, data: b64 });
    });

    if (execErr) {
      self.postMessage({ type: "execution-error", error: execErr });
      return;
    }

    if (testCode) {
      await runTests(py, code, stdout, testCode);
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
    self.postMessage({ type: "test-error", error: error.message || String(error) });
  }
}

// ── Modo unittest ─────────────────────────────────────────────────────────────
// O namespace dos testes recebe:
//   _stdout  → string com tudo que o aluno imprimiu
//   _source  → string com o código-fonte do aluno
//   + todas as variáveis/funções definidas pelo código do aluno

async function runUnittestTests(py, studentCode, studentStdout, testCode) {
  py.globals.set("_raw_student_code", studentCode);
  py.globals.set("_raw_student_stdout", studentStdout);
  py.globals.set("_raw_test_code", testCode);

  let result;
  try {
    result = py.runPython(`
import sys, io, unittest, json

_ns = {}

# Injeta helpers no namespace antes de rodar o código do aluno
_ns["_stdout"] = _raw_student_stdout
_ns["_source"] = _raw_student_code

# Roda o código do aluno no namespace (silenciosamente)
_cap = io.StringIO()
_real_out = sys.__stdout__
_real_err = sys.__stderr__
sys.stdout = _cap
sys.stderr = io.StringIO()

try:
    exec(compile(_raw_student_code, "<student>", "exec"), _ns)
except Exception as _err:
    sys.stdout = _real_out
    sys.stderr = _real_err
    raise _err

sys.stdout = _real_out
sys.stderr = _real_err

# Garante que _stdout e _source continuam disponíveis mesmo após o exec do aluno
_ns["_stdout"] = _raw_student_stdout
_ns["_source"] = _raw_student_code

# Carrega os testes no mesmo namespace
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
_runner = unittest.TextTestRunner(stream=_buf, verbosity=0)
_res = _runner.run(_suite)

_failures = []
for _t, _tb in _res.failures + _res.errors:
    _lines = _tb.strip().split("\\n")
    _msg = next((l for l in reversed(_lines) if l.strip()), str(_t))
    _failures.append(_msg)

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
// O namespace dos asserts recebe:
//   _stdout  → string com tudo que o aluno imprimiu
//   _source  → string com o código-fonte do aluno
//   + todas as variáveis/funções definidas pelo código do aluno

async function runAssertTests(py, studentCode, studentStdout, testCode) {
  py.globals.set("_raw_student_code", studentCode);
  py.globals.set("_raw_student_stdout", studentStdout);
  py.globals.set("_raw_test_code", testCode);

  try {
    py.runPython(`
import sys, io

_ns = {}

# Injeta helpers no namespace
_ns["_stdout"] = _raw_student_stdout
_ns["_source"] = _raw_student_code

# Roda o código do aluno no namespace (silenciosamente)
_cap = io.StringIO()
_real_out = sys.__stdout__
_real_err = sys.__stderr__
sys.stdout = _cap
sys.stderr = io.StringIO()

try:
    exec(compile(_raw_student_code, "<student>", "exec"), _ns)
except Exception as _e:
    sys.stdout = _real_out
    sys.stderr = _real_err
    raise _e

sys.stdout = _real_out
sys.stderr = _real_err

# Garante que os helpers continuam disponíveis após exec do aluno
_ns["_stdout"] = _raw_student_stdout
_ns["_source"] = _raw_student_code

# Roda os asserts no mesmo namespace
exec(compile(_raw_test_code, "<tests>", "exec"), _ns)
`);

    py.globals.delete("_raw_student_code");
    py.globals.delete("_raw_student_stdout");
    py.globals.delete("_raw_test_code");

    const assertCount = (testCode.match(/^\s*assert\s/gm) || []).length || 1;
    self.postMessage({
      type: "test-result",
      testsRun: assertCount,
      passed: assertCount,
      failures: 0,
      errors: 0,
      allPassed: true,
      failureDetails: [],
    });

  } catch (err) {
    py.globals.delete("_raw_student_code");
    py.globals.delete("_raw_student_stdout");
    py.globals.delete("_raw_test_code");

    const msg = err.message || String(err);
    if (msg.includes("AssertionError")) {
      const lines = msg.split("\n");
      const assertLine = lines.find(l => l.includes("AssertionError")) || msg;
      const detail = assertLine.replace(/^.*AssertionError:\s*/, "").trim() || "Resposta incorreta. Verifique seu código.";
      self.postMessage({ type: "test-result", testsRun: 1, passed: 0, failures: 1, errors: 0, allPassed: false, failureDetails: [detail] });
    } else {
      self.postMessage({ type: "test-error", error: msg });
    }
  }
}

// ── Instalação de pacotes ─────────────────────────────────────────────────────

// Pacotes que já vêm compilados no Pyodide — usar loadPackage() é mais rápido e confiável
const PYODIDE_NATIVE_PACKAGES = new Set([
  "pandas", "numpy", "matplotlib", "scipy", "scikit-learn",
  "pillow", "lxml", "sqlalchemy", "pyodide-http",
]);

async function installPackages(packages) {
  const py = await loadPyodideRuntime();
  if (!py) return;

  const native = packages.filter((p) => PYODIDE_NATIVE_PACKAGES.has(p.toLowerCase()));
  const pure   = packages.filter((p) => !PYODIDE_NATIVE_PACKAGES.has(p.toLowerCase()));

  // Instala pacotes nativos do Pyodide via loadPackage (mais rápido)
  if (native.length > 0) {
    try {
      await py.loadPackage(native);
      native.forEach((pkg) => self.postMessage({ type: "package-installed", package: pkg }));

      // Após carregar matplotlib, configura backend agg automaticamente
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

  // Instala pacotes Python puro via micropip
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
  const { type, code, testCode, packages } = event.data;

  switch (type) {
    case "init":
      await loadPyodideRuntime();
      break;
    case "execute":
      await executePython(code, testCode || null);
      break;
    case "install":
      await installPackages(packages || []);
      break;
    default:
      self.postMessage({ type: "error", error: `Comando desconhecido: ${type}` });
  }
};
