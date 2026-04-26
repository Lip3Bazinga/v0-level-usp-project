// Web Worker para execução Python via Pyodide

let pyodide = null;
let isLoading = false;

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
    self.postMessage({ type: "status", status: "ready" });
    isLoading = false;
    return pyodide;
  } catch (error) {
    isLoading = false;
    self.postMessage({ type: "status", status: "error", error: error.message });
    return null;
  }
}

async function executePython(code, testCode) {
  const py = await loadPyodideRuntime();
  if (!py) {
    self.postMessage({ type: "error", error: "Pyodide não está disponível. Tente recarregar a página." });
    return;
  }

  self.postMessage({ type: "execution-start" });

  try {
    // Captura stdout/stderr
    py.runPython(`
import sys, io
_stdout_buf = io.StringIO()
_stderr_buf = io.StringIO()
sys.stdout = _stdout_buf
sys.stderr = _stderr_buf
`);

    let execErr = null;
    try {
      py.runPython(code);
    } catch (e) {
      execErr = e.message || String(e);
    }

    const stdout = py.runPython("_stdout_buf.getvalue()") || "";
    const stderr = py.runPython("_stderr_buf.getvalue()") || "";

    py.runPython(`
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`);

    if (execErr) {
      self.postMessage({ type: "execution-result", stdout, stderr: execErr });
      self.postMessage({ type: "execution-error", error: execErr });
      return;
    }

    self.postMessage({ type: "execution-result", stdout, stderr });

    if (testCode) {
      await runTests(py, code, testCode);
    }

  } catch (error) {
    safeRestoreStdout(py);
    self.postMessage({ type: "execution-error", error: error.message || String(error) });
  }
}

function safeRestoreStdout(py) {
  try { py.runPython("import sys; sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__"); } catch {}
}

// Detecta se o testCode declara classes unittest.TestCase
function detectUnittest(testCode) {
  return /class\s+\w+\s*\(\s*unittest\.TestCase\s*\)/.test(testCode);
}

async function runTests(py, studentCode, testCode) {
  self.postMessage({ type: "test-start" });

  try {
    if (detectUnittest(testCode)) {
      await runUnittestTests(py, studentCode, testCode);
    } else {
      await runAssertTests(py, studentCode, testCode);
    }
  } catch (error) {
    safeRestoreStdout(py);
    self.postMessage({ type: "test-error", error: error.message || String(error) });
  }
}

// ── unittest mode ─────────────────────────────────────────────────────────────
// Estratégia: armazena os códigos em variáveis Python, roda com exec em dict
// isolado, coleta resultado via objeto Python — sem interpolação problemática.

async function runUnittestTests(py, studentCode, testCode) {
  // Passa os códigos para o Python via globals do pyodide (seguro para qualquer caractere)
  py.globals.set("_raw_student_code", studentCode);
  py.globals.set("_raw_test_code", testCode);

  let result;
  try {
    result = py.runPython(`
import sys, io, unittest, json

# Namespace compartilhado aluno+testes
_ns = {}

# Captura stdout do aluno (não queremos misturar com resultado dos testes)
_cap = io.StringIO()
_orig_out = sys.stdout
_orig_err = sys.stderr
sys.stdout = _cap
sys.stderr = io.StringIO()

try:
    exec(compile(_raw_student_code, "<student>", "exec"), _ns)
except Exception as _student_err:
    sys.stdout = _orig_out
    sys.stderr = _orig_err
    raise _student_err

sys.stdout = _orig_out
sys.stderr = _orig_err

# Injeta testes no mesmo namespace (eles enxergam variáveis do aluno)
exec(compile(_raw_test_code, "<tests>", "exec"), _ns)

# Descobre e roda as suítes
_suite = unittest.TestSuite()
_loader = unittest.TestLoader()
for _obj in _ns.values():
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
    py.globals.delete("_raw_test_code");
    const msg = err.message || String(err);
    if (msg.includes("AssertionError")) {
      const lines = msg.split("\n");
      const line = lines.find(l => l.includes("AssertionError")) || msg;
      const detail = line.replace(/^.*AssertionError:\s*/, "").trim() || "Resposta incorreta.";
      self.postMessage({ type: "test-result", testsRun: 1, passed: 0, failures: 1, errors: 0, allPassed: false, failureDetails: [detail] });
    } else {
      self.postMessage({ type: "test-error", error: msg });
    }
    return;
  }

  py.globals.delete("_raw_student_code");
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

// ── assert mode ───────────────────────────────────────────────────────────────

async function runAssertTests(py, studentCode, testCode) {
  py.globals.set("_raw_student_code", studentCode);
  py.globals.set("_raw_test_code", testCode);

  try {
    py.runPython(`
import sys, io

_ns = {}

_cap = io.StringIO()
sys.stdout = _cap
sys.stderr = io.StringIO()

try:
    exec(compile(_raw_student_code, "<student>", "exec"), _ns)
except Exception as _e:
    sys.stdout = sys.__stdout__
    sys.stderr = sys.__stderr__
    raise _e

sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__

exec(compile(_raw_test_code, "<tests>", "exec"), _ns)
`);

    py.globals.delete("_raw_student_code");
    py.globals.delete("_raw_test_code");

    const assertCount = (testCode.match(/^\s*assert /gm) || []).length || 1;
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
    py.globals.delete("_raw_test_code");

    const msg = err.message || String(err);
    if (msg.includes("AssertionError")) {
      const lines = msg.split("\n");
      const line = lines.find(l => l.includes("AssertionError")) || msg;
      const detail = line.replace(/^.*AssertionError:\s*/, "").trim() || "Resposta incorreta. Verifique seu código.";
      self.postMessage({ type: "test-result", testsRun: 1, passed: 0, failures: 1, errors: 0, allPassed: false, failureDetails: [detail] });
    } else {
      self.postMessage({ type: "test-error", error: msg });
    }
  }
}

// ── install packages ──────────────────────────────────────────────────────────

async function installPackages(packages) {
  const py = await loadPyodideRuntime();
  if (!py) return;

  try {
    await py.loadPackage("micropip");
    const micropip = py.pyimport("micropip");
    for (const pkg of packages) {
      try {
        await micropip.install(pkg);
        self.postMessage({ type: "package-installed", package: pkg });
      } catch {
        self.postMessage({ type: "package-error", package: pkg, error: `Não foi possível instalar ${pkg}` });
      }
    }
  } catch (error) {
    self.postMessage({ type: "error", error: "Erro ao configurar sistema de pacotes: " + error.message });
  }
}

// ── message handler ───────────────────────────────────────────────────────────

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
