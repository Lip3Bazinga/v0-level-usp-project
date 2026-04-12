// Web Worker para execução Python via Pyodide
// Roda em thread separada para não travar a UI

let pyodide = null;
let isLoading = false;

// Carrega o Pyodide runtime
async function loadPyodideRuntime() {
  if (pyodide) return pyodide;
  if (isLoading) return null;

  isLoading = true;
  self.postMessage({ type: "status", status: "loading" });

  try {
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.js");
    pyodide = await loadPyodide({
      indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
      stdout: (text) => {
        self.postMessage({ type: "stdout", text });
      },
      stderr: (text) => {
        self.postMessage({ type: "stderr", text });
      },
    });

    // Redireciona stdout/stderr do Python
    await pyodide.runPythonAsync(`
import sys
import io

class OutputCapture:
    def __init__(self, stream_type):
        self.stream_type = stream_type
        self.buffer = io.StringIO()

    def write(self, text):
        if text and text.strip():
            self.buffer.write(text)
            from js import postMessage
            postMessage(type=self.stream_type, text=text)

    def flush(self):
        pass

    def getvalue(self):
        return self.buffer.getvalue()
`);

    self.postMessage({ type: "status", status: "ready" });
    isLoading = false;
    return pyodide;
  } catch (error) {
    isLoading = false;
    self.postMessage({
      type: "status",
      status: "error",
      error: error.message,
    });
    return null;
  }
}

// Executa código Python
async function executePython(code, testCode) {
  const py = await loadPyodideRuntime();
  if (!py) {
    self.postMessage({
      type: "error",
      error: "Pyodide não está disponível. Tente recarregar a página.",
    });
    return;
  }

  self.postMessage({ type: "execution-start" });

  try {
    // Captura stdout
    await py.runPythonAsync(`
import sys
import io
__stdout_capture = io.StringIO()
__stderr_capture = io.StringIO()
sys.stdout = __stdout_capture
sys.stderr = __stderr_capture
`);

    // Executa o código do aluno
    await py.runPythonAsync(code);

    // Captura o output
    const stdout = py.runPython("__stdout_capture.getvalue()");
    const stderr = py.runPython("__stderr_capture.getvalue()");

    self.postMessage({
      type: "execution-result",
      stdout: stdout || "",
      stderr: stderr || "",
    });

    // Se há testes, executa a validação
    if (testCode) {
      await runTests(py, code, testCode);
    }
  } catch (error) {
    const errorMessage = error.message || String(error);
    self.postMessage({
      type: "execution-error",
      error: errorMessage,
    });
  } finally {
    // Restaura stdout/stderr
    await py.runPythonAsync(`
import sys
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`);
  }
}

// Executa testes unitários ocultos
async function runTests(py, studentCode, testCode) {
  self.postMessage({ type: "test-start" });

  try {
    // Reseta captura
    await py.runPythonAsync(`
import sys
import io
__test_stdout = io.StringIO()
__test_stderr = io.StringIO()
sys.stdout = __test_stdout
sys.stderr = __test_stderr
`);

    // Combina código do aluno + testes (sem executar unittest.main())
    const combinedCode = `
${studentCode}

import unittest
import io

# Parse test code, removendo o if __name__ block
_test_source = ${JSON.stringify(testCode)}
_test_lines = []
_skip = False
for _line in _test_source.split('\\n'):
    if _line.strip().startswith("if __name__"):
        _skip = True
        continue
    if _skip and (_line.startswith('    ') or _line.startswith('\\t')):
        continue
    _skip = False
    _test_lines.append(_line)

exec('\\n'.join(_test_lines))

# Roda os testes programaticamente
_loader = unittest.TestLoader()
_suite = unittest.TestSuite()

# Encontra todas as classes de teste
for _name, _obj in list(locals().items()):
    if isinstance(_obj, type) and issubclass(_obj, unittest.TestCase) and _obj is not unittest.TestCase:
        _suite.addTests(_loader.loadTestsFromTestCase(_obj))

_runner = unittest.TextTestRunner(stream=io.StringIO(), verbosity=2)
_result = _runner.run(_suite)

_tests_run = _result.testsRun
_failures = len(_result.failures)
_errors = len(_result.errors)
_passed = _tests_run - _failures - _errors
_all_passed = _failures == 0 and _errors == 0

# Coleta detalhes das falhas
_failure_details = []
for _fail in _result.failures + _result.errors:
    _failure_details.append(str(_fail[1]))
`;

    await py.runPythonAsync(combinedCode);

    const testsRun = py.runPython("_tests_run");
    const passed = py.runPython("_passed");
    const failures = py.runPython("_failures");
    const errors = py.runPython("_errors");
    const allPassed = py.runPython("_all_passed");
    const failureDetails = py.runPython("'|||'.join(_failure_details)");

    self.postMessage({
      type: "test-result",
      testsRun,
      passed,
      failures,
      errors,
      allPassed,
      failureDetails: failureDetails ? failureDetails.split("|||") : [],
    });
  } catch (error) {
    self.postMessage({
      type: "test-error",
      error: error.message || String(error),
    });
  } finally {
    await py.runPythonAsync(`
import sys
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__
`);
  }
}

// Instala pacotes Python (micropip)
async function installPackages(packages) {
  const py = await loadPyodideRuntime();
  if (!py) return;

  try {
    await py.loadPackage("micropip");
    const micropip = py.pyimport("micropip");
    for (const pkg of packages) {
      try {
        await micropip.install(pkg);
        self.postMessage({
          type: "package-installed",
          package: pkg,
        });
      } catch {
        self.postMessage({
          type: "package-error",
          package: pkg,
          error: `Não foi possível instalar ${pkg}`,
        });
      }
    }
  } catch (error) {
    self.postMessage({
      type: "error",
      error: "Erro ao configurar sistema de pacotes: " + error.message,
    });
  }
}

// Listener de mensagens
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
