"""
Harness do executor LevelUSP — roda DENTRO do sandbox WASI (CPython 3.14).

Lê /harness/probes.json (somente leitura), executa as sondas em sequência
(cada uma com namespace novo) e escreve uma observação por linha na saída
padrão, prefixada por um nonce aleatório recebido em argv. O host só aceita
linhas com o nonce; prints do aluno são capturados ou descartados. Se o tempo
estourar no meio, as sondas já concluídas não se perdem.

Modelo de confiança: este arquivo divide o interpretador com o código do aluno.
  * Casos declarativos: nenhum valor esperado chega ao sandbox (a comparação é
    feita na API); forjar uma observação não ajuda a passar sem saber a resposta.
  * Casos legados (asserts antigos): o resultado nasce aqui dentro. O nonce
    impede a forja trivial, mas um aluno determinado que inspecione a memória
    do interpretador ainda pode forjá-lo — por isso essa correção é marcada como
    "fraca" e os gabaritos devem ser convertidos.
  * O sandbox não tem rede, variáveis de ambiente nem processos; só enxerga
    /lib (stdlib), /harness (somente leitura) e /work (o projeto).
"""
import ast
import builtins
import contextlib
import io
import json
import math
import os
import sys

PROJECT = "/work"
MAX_TEXT = 64_000
MAX_CANON_DEPTH = 20
# Inteiros acima disso perdem precisão no JSON (double) e viajam como texto.
MAX_SAFE_INTEGER = 2**53
MAX_REPR_CHARS = 2000

# O nonce sai de sys.argv antes de qualquer código do aluno rodar.
_NONCE = sys.argv.pop(1) if len(sys.argv) > 1 else ""
with open("/harness/probes.json", encoding="utf-8") as _job_file:
    _job = json.load(_job_file)
_probes = _job["probes"]
_entry = _job.get("entry", "main.py")
del _job
_probe = None  # sonda corrente


def _clip(text):
    if text is None:
        return None, False
    if len(text) > MAX_TEXT:
        return text[:MAX_TEXT], True
    return text, False


def _canon(value, depth=0):
    """Converte valores Python em JSON canônico + preserva o tipo raiz."""
    if depth > MAX_CANON_DEPTH:
        return {"$repr": "<profundidade excedida>"}
    if value is None or isinstance(value, (bool, str)):
        return value
    if isinstance(value, int):
        return value if abs(value) < MAX_SAFE_INTEGER else {"$int": str(value)}
    if isinstance(value, float):
        if math.isnan(value):
            return {"$float": "nan"}
        if math.isinf(value):
            return {"$float": "inf" if value > 0 else "-inf"}
        return value
    if isinstance(value, (list, tuple)):
        return [_canon(item, depth + 1) for item in value]
    if isinstance(value, (set, frozenset)):
        items = [_canon(item, depth + 1) for item in value]
        try:
            items.sort(key=lambda item: json.dumps(item, sort_keys=True))
        except Exception:
            pass
        return items
    if isinstance(value, dict):
        if all(isinstance(key, str) for key in value):
            return {key: _canon(item, depth + 1) for key, item in value.items()}
        return {"$dict": [[_canon(key, depth + 1), _canon(item, depth + 1)] for key, item in value.items()]}
    try:
        return {"$repr": repr(value)[:MAX_REPR_CHARS]}
    except Exception:
        return {"$repr": "<repr falhou>"}


def _type_name(value):
    return type(value).__name__


def _error_text(exc):
    message = str(exc)
    return "%s: %s" % (type(exc).__name__, message) if message else type(exc).__name__


# Referência própria à saída real (o aluno pode trocar sys.stdout).
_host_stdout = sys.__stdout__.buffer


def _write(observation):
    observation["id"] = _probe["id"]
    line = (_NONCE + " " + json.dumps(observation, ensure_ascii=False) + "\n").encode("utf-8")
    _host_stdout.write(line)
    _host_stdout.flush()


def _read_entry_source():
    with open(os.path.join(PROJECT, _entry), encoding="utf-8") as entry_file:
        return entry_file.read()


def _load_project_ns(stdin_text=""):
    """Executa o arquivo de entrada como __main__ e devolve (namespace, stdout, stderr, erro)."""
    sys.path.insert(0, PROJECT)
    source = _read_entry_source()
    namespace = {"__name__": "__main__", "__file__": os.path.join(PROJECT, _entry), "__builtins__": builtins}
    captured_stdout, captured_stderr = io.StringIO(), io.StringIO()
    original_stdin = sys.stdin
    sys.stdin = io.StringIO(stdin_text)
    error = None
    try:
        with contextlib.redirect_stdout(captured_stdout), contextlib.redirect_stderr(captured_stderr):
            os.chdir(PROJECT)
            exec(compile(source, _entry, "exec"), namespace)
    except SystemExit as exc:
        if exc.code not in (None, 0):
            error = "SystemExit: %s" % exc.code
    except BaseException as exc:  # noqa: BLE001 — qualquer erro do aluno vira observação
        error = _error_text(exc)
    finally:
        sys.stdin = original_stdin
    return namespace, captured_stdout.getvalue(), captured_stderr.getvalue(), error


def probe_run():
    _, stdout, stderr, error = _load_project_ns(_probe.get("stdin", ""))
    stdout, stdout_truncated = _clip(stdout)
    stderr, stderr_truncated = _clip(stderr)
    _write({"ok": error is None, "stdout": stdout, "stderr": stderr, "error": error, "truncated": stdout_truncated or stderr_truncated})


def _resolve(namespace, dotted):
    parts = dotted.split(".")
    target = namespace[parts[0]]
    for attribute in parts[1:]:
        target = getattr(target, attribute)
    return target


def probe_call():
    namespace, stdout, _, error = _load_project_ns("")
    if error is not None:
        _write({"ok": False, "error": error, "stdout": _clip(stdout)[0]})
        return
    try:
        function = _resolve(namespace, _probe["function"])
    except (KeyError, AttributeError):
        _write({"ok": False, "error": "NameError: '%s' não foi definida" % _probe["function"]})
        return
    if not callable(function):
        _write({"ok": False, "error": "TypeError: '%s' não é uma função" % _probe["function"]})
        return
    call_stdout = io.StringIO()
    try:
        with contextlib.redirect_stdout(call_stdout), contextlib.redirect_stderr(io.StringIO()):
            value = function(*_probe.get("args", []), **_probe.get("kwargs", {}))
    except BaseException as exc:  # noqa: BLE001
        _write({"ok": False, "error": _error_text(exc), "stdout": _clip(call_stdout.getvalue())[0]})
        return
    _write({"ok": True, "value": _canon(value), "type": _type_name(value), "stdout": _clip(call_stdout.getvalue())[0]})


def probe_globals():
    namespace, stdout, _, error = _load_project_ns("")
    if error is not None:
        _write({"ok": False, "error": error, "stdout": _clip(stdout)[0]})
        return
    values, types, missing = {}, {}, []
    for name in _probe.get("names", []):
        if name in namespace:
            values[name] = _canon(namespace[name])
            types[name] = _type_name(namespace[name])
        else:
            missing.append(name)
    _write({"ok": True, "values": values, "types": types, "missing": missing, "stdout": _clip(stdout)[0]})


_CONSTRUCTS = {
    ast.Lambda: "lambda", ast.For: "for", ast.While: "while", ast.If: "if",
    ast.FunctionDef: "def", ast.ClassDef: "class", ast.ListComp: "list_comprehension",
    ast.DictComp: "dict_comprehension", ast.JoinedStr: "f_string", ast.Try: "try",
    ast.With: "with", ast.Return: "return", ast.Import: "import", ast.ImportFrom: "import",
}


def _call_name(node):
    callee = node.func
    if isinstance(callee, ast.Name):
        return callee.id
    if isinstance(callee, ast.Attribute):
        return callee.attr
    return None


def _project_sources():
    for directory, _, file_names in os.walk(PROJECT):
        for file_name in file_names:
            if file_name.endswith(".py"):
                yield os.path.join(directory, file_name)


def _collect_features(tree, features):
    for node in ast.walk(tree):
        construct = _CONSTRUCTS.get(type(node))
        if construct:
            features["constructs"].add(construct)
        if isinstance(node, ast.Call):
            called = _call_name(node)
            if called:
                features["calls"].add(called)
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            features["functions"].add(node.name)
            if any(isinstance(inner, ast.Call) and _call_name(inner) == node.name for inner in ast.walk(node)):
                features["recursive_functions"].add(node.name)
        if isinstance(node, ast.ClassDef):
            features["classes"].add(node.name)
        if isinstance(node, ast.Import):
            features["imports"].update(alias.name.split(".")[0] for alias in node.names)
        if isinstance(node, ast.ImportFrom) and node.module:
            features["imports"].add(node.module.split(".")[0])


def probe_ast():
    """Analisa a estrutura de TODOS os .py do projeto. Não executa nada."""
    features = {key: set() for key in ("constructs", "calls", "functions", "classes", "imports", "recursive_functions")}
    for source_path in _project_sources():
        with open(source_path, encoding="utf-8") as source_file:
            try:
                tree = ast.parse(source_file.read())
            except SyntaxError as exc:
                _write({"ok": False, "error": "SyntaxError: %s (linha %s)" % (exc.msg, exc.lineno)})
                return
        _collect_features(tree, features)
    if features["recursive_functions"]:
        features["constructs"].add("recursion")
    _write({"ok": True, "features": {key: sorted(values) for key, values in features.items()}})


def _legacy_result(tests_run, failures, errors, details):
    return {"ok": True, "legacy": {"testsRun": tests_run, "failures": failures, "errors": errors, "details": details}}


def _failure_summary(test, traceback_text):
    """Última linha de erro do traceback do unittest, sem o prefixo AssertionError."""
    lines = [line.strip() for line in traceback_text.strip().splitlines() if line.strip()]
    last_error = next((line for line in reversed(lines) if "Error" in line), lines[-1] if lines else "")
    return "%s: %s" % (test.id().split(".")[-1], last_error.replace("AssertionError: ", ""))


def _run_unittest_cases(code, namespace, unittest):
    namespace["unittest"] = unittest
    try:
        exec(compile(code, "<tests>", "exec"), namespace)
    except BaseException as exc:  # noqa: BLE001
        _write({"ok": False, "error": _error_text(exc)})
        return
    suite = unittest.TestSuite()
    for candidate in list(namespace.values()):
        if isinstance(candidate, type) and issubclass(candidate, unittest.TestCase) and candidate is not unittest.TestCase:
            suite.addTests(unittest.TestLoader().loadTestsFromTestCase(candidate))
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        outcome = unittest.TextTestRunner(stream=io.StringIO(), verbosity=0).run(suite)
    details = [_failure_summary(test, traceback_text) for test, traceback_text in outcome.failures + outcome.errors]
    _write(_legacy_result(outcome.testsRun, len(outcome.failures), len(outcome.errors), details))


def _run_assert_block(code, namespace):
    # Cada assert conta como um teste, mas o bloco para no primeiro que falhar.
    total = sum(1 for node in ast.walk(ast.parse(code)) if isinstance(node, ast.Assert)) or 1
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            exec(compile(code, "<tests>", "exec"), namespace)
    except AssertionError as exc:
        _write(_legacy_result(total, 1, 0, [str(exc) or "Resposta incorreta."]))
        return
    except BaseException as exc:  # noqa: BLE001
        _write(_legacy_result(total, 0, 1, [_error_text(exc)]))
        return
    _write(_legacy_result(total, 0, 0, []))


def probe_legacy():
    """Testes legados (assert/unittest) no namespace do aluno. Correção fraca."""
    # Importados ANTES de o projeto entrar no sys.path: um unittest.py do aluno
    # não pode substituir o da stdlib.
    import re
    import unittest

    code = _probe["code"]
    namespace, stdout, _, error = _load_project_ns("")
    if error is not None:
        _write({"ok": False, "error": error})
        return
    # Nomes que os gabaritos antigos esperam encontrar: não renomear.
    namespace["_source"] = _read_entry_source()
    namespace["_stdout"] = stdout
    namespace["__builtins__"] = builtins
    namespace["AssertionError"] = builtins.AssertionError
    if re.search(r"class\s+\w+\s*\(\s*unittest\.TestCase\s*\)", code):
        _run_unittest_cases(code, namespace, unittest)
    else:
        _run_assert_block(code, namespace)


_HANDLERS = {"run": probe_run, "call": probe_call, "globals": probe_globals, "ast": probe_ast, "legacy": probe_legacy}

_real_stdout, _real_stderr = sys.stdout, sys.stderr
_base_modules = set(sys.modules)
for _probe in _probes:
    # Estado limpo entre sondas: módulos do projeto, cwd e streams.
    for _module_name in list(sys.modules):
        if _module_name not in _base_modules:
            del sys.modules[_module_name]
    if PROJECT in sys.path:
        sys.path.remove(PROJECT)
    sys.stdout, sys.stderr = _real_stdout, _real_stderr
    try:
        _HANDLERS[_probe["kind"]]()
    except BaseException as _exc:  # noqa: BLE001
        try:
            _write({"ok": False, "error": "Erro interno do executor: %s" % type(_exc).__name__})
        except Exception:
            pass

