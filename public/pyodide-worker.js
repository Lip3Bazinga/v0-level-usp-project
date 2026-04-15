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

// Executa testes ocultos baseados em assert statements
// Estratégia: executa studentCode + testCode (asserts); qualquer exceção = falha
async function runTests(py, studentCode, testCode) {
  self.postMessage({ type: "test-start" });

  try {
    // Ambiente isolado para os testes (não polui o namespace do aluno)
    const combinedCode = `
import sys as _sys
import io as _io
_test_stdout = _io.StringIO()
_sys.stdout = _test_stdout
_sys.stderr = _io.StringIO()

${studentCode}

${testCode}

_sys.stdout = _sys.__stdout__
_sys.stderr = _sys.__stderr__
`;

    await py.runPythonAsync(combinedCode);

    // Todos os asserts passaram
    self.postMessage({
      type: "test-result",
      testsRun: 1,
      passed: 1,
      failures: 0,
      errors: 0,
      allPassed: true,
      failureDetails: [],
    });
  } catch (error) {
    const errorMessage = error.message || String(error);

    // Restaura stdout/stderr antes de reportar
    try { await py.runPythonAsync("import sys; sys.stdout = sys.__stdout__; sys.stderr = sys.__stderr__"); } catch {}

    // AssertionError = resposta errada do aluno
    if (errorMessage.includes("AssertionError")) {
      // Extrai só a mensagem do assert (remove o traceback)
      const lines = errorMessage.split("\n");
      const assertLine = lines.find((l) => l.includes("AssertionError")) || errorMessage;
      const msg = assertLine.replace(/^.*AssertionError:\s*/, "").trim() || "Resposta incorreta. Verifique seu código.";

      self.postMessage({
        type: "test-result",
        testsRun: 1,
        passed: 0,
        failures: 1,
        errors: 0,
        allPassed: false,
        failureDetails: [msg],
      });
    } else {
      // Erro no código do aluno (SyntaxError, NameError, etc.)
      self.postMessage({
        type: "test-error",
        error: errorMessage,
      });
    }
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
