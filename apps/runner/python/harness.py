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

# O nonce sai de sys.argv antes de qualquer código do aluno rodar.
_NONCE = sys.argv.pop(1) if len(sys.argv) > 1 else ""
with open("/harness/probes.json", encoding="utf-8") as fh:
    _job = json.load(fh)
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
    if depth > 20:
        return {"$repr": "<profundidade excedida>"}
    if value is None or isinstance(value, (bool, str)):
        return value
    if isinstance(value, int):
        return value if abs(value) < 2**53 else {"$int": str(value)}
    if isinstance(value, float):
        if math.isnan(value):
            return {"$float": "nan"}
        if math.isinf(value):
            return {"$float": "inf" if value > 0 else "-inf"}
        return value
    if isinstance(value, (list, tuple)):
        return [_canon(v, depth + 1) for v in value]
    if isinstance(value, (set, frozenset)):
        items = [_canon(v, depth + 1) for v in value]
        try:
            items.sort(key=lambda x: json.dumps(x, sort_keys=True))
        except Exception:
            pass
        return items
    if isinstance(value, dict):
        if all(isinstance(k, str) for k in value):
            return {k: _canon(v, depth + 1) for k, v in value.items()}
        return {"$dict": [[_canon(k, depth + 1), _canon(v, depth + 1)] for k, v in value.items()]}
    try:
        return {"$repr": repr(value)[:2000]}
    except Exception:
        return {"$repr": "<repr falhou>"}


def _type_name(value):
    return type(value).__name__


def _error_text(exc):
    msg = str(exc)
    return "%s: %s" % (type(exc).__name__, msg) if msg else type(exc).__name__


# Referência própria à saída real (o aluno pode trocar sys.stdout).
_out = sys.__stdout__.buffer


def _write(obs):
    obs["id"] = _probe["id"]
    data = (_NONCE + " " + json.dumps(obs, ensure_ascii=False) + "\n").encode("utf-8")
    _out.write(data)
    _out.flush()


def _load_project_ns(stdin_text=""):
    """Executa o arquivo de entrada como __main__ e devolve (ns, stdout, stderr, erro)."""
    sys.path.insert(0, PROJECT)
    path = os.path.join(PROJECT, _entry)
    with open(path, encoding="utf-8") as fh:
        source = fh.read()
    ns = {"__name__": "__main__", "__file__": path, "__builtins__": builtins}
    out, err = io.StringIO(), io.StringIO()
    old_stdin = sys.stdin
    sys.stdin = io.StringIO(stdin_text)
    error = None
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            os.chdir(PROJECT)
            exec(compile(source, _entry, "exec"), ns)
    except SystemExit as exc:
        if exc.code not in (None, 0):
            error = "SystemExit: %s" % exc.code
    except BaseException as exc:  # noqa: BLE001 — qualquer erro do aluno vira observação
        error = _error_text(exc)
    finally:
        sys.stdin = old_stdin
    return ns, out.getvalue(), err.getvalue(), error


def probe_run():
    _, stdout, stderr, error = _load_project_ns(_probe.get("stdin", ""))
    stdout, t1 = _clip(stdout)
    stderr, t2 = _clip(stderr)
    _write({"ok": error is None, "stdout": stdout, "stderr": stderr, "error": error, "truncated": t1 or t2})


def _resolve(ns, dotted):
    parts = dotted.split(".")
    obj = ns[parts[0]]
    for p in parts[1:]:
        obj = getattr(obj, p)
    return obj


def probe_call():
    ns, stdout, _, error = _load_project_ns("")
    if error is not None:
        _write({"ok": False, "error": error, "stdout": _clip(stdout)[0]})
        return
    try:
        fn = _resolve(ns, _probe["function"])
    except (KeyError, AttributeError):
        _write({"ok": False, "error": "NameError: '%s' não foi definida" % _probe["function"]})
        return
    if not callable(fn):
        _write({"ok": False, "error": "TypeError: '%s' não é uma função" % _probe["function"]})
        return
    out = io.StringIO()
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(io.StringIO()):
            value = fn(*_probe.get("args", []), **_probe.get("kwargs", {}))
    except BaseException as exc:  # noqa: BLE001
        _write({"ok": False, "error": _error_text(exc), "stdout": _clip(out.getvalue())[0]})
        return
    _write({"ok": True, "value": _canon(value), "type": _type_name(value), "stdout": _clip(out.getvalue())[0]})


def probe_globals():
    ns, stdout, _, error = _load_project_ns("")
    if error is not None:
        _write({"ok": False, "error": error, "stdout": _clip(stdout)[0]})
        return
    values, types, missing = {}, {}, []
    for name in _probe.get("names", []):
        if name in ns:
            values[name] = _canon(ns[name])
            types[name] = _type_name(ns[name])
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
    f = node.func
    if isinstance(f, ast.Name):
        return f.id
    if isinstance(f, ast.Attribute):
        return f.attr
    return None


def probe_ast():
    """Analisa a estrutura de TODOS os .py do projeto. Não executa nada."""
    constructs, calls, functions, classes, imports, recursive = set(), set(), set(), set(), set(), set()
    for root, _, names in os.walk(PROJECT):
        for name in names:
            if not name.endswith(".py"):
                continue
            with open(os.path.join(root, name), encoding="utf-8") as fh:
                try:
                    tree = ast.parse(fh.read())
                except SyntaxError as exc:
                    _write({"ok": False, "error": "SyntaxError: %s (linha %s)" % (exc.msg, exc.lineno)})
                    return
            for node in ast.walk(tree):
                kind = _CONSTRUCTS.get(type(node))
                if kind:
                    constructs.add(kind)
                if isinstance(node, ast.Call):
                    n = _call_name(node)
                    if n:
                        calls.add(n)
                if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                    functions.add(node.name)
                    for sub in ast.walk(node):
                        if isinstance(sub, ast.Call) and _call_name(sub) == node.name:
                            recursive.add(node.name)
                if isinstance(node, ast.ClassDef):
                    classes.add(node.name)
                if isinstance(node, ast.Import):
                    imports.update(a.name.split(".")[0] for a in node.names)
                if isinstance(node, ast.ImportFrom) and node.module:
                    imports.add(node.module.split(".")[0])
    if recursive:
        constructs.add("recursion")
    _write({"ok": True, "features": {
        "constructs": sorted(constructs), "calls": sorted(calls), "functions": sorted(functions),
        "classes": sorted(classes), "imports": sorted(imports), "recursive_functions": sorted(recursive),
    }})


def probe_legacy():
    """Testes legados (assert/unittest) no namespace do aluno. Correção fraca."""
    import re
    import unittest

    code = _probe["code"]
    ns, stdout, _, error = _load_project_ns("")
    if error is not None:
        _write({"ok": False, "error": error})
        return
    with open(os.path.join(PROJECT, _entry), encoding="utf-8") as fh:
        ns["_source"] = fh.read()
    ns["_stdout"] = stdout
    ns["__builtins__"] = builtins
    ns["AssertionError"] = builtins.AssertionError
    if re.search(r"class\s+\w+\s*\(\s*unittest\.TestCase\s*\)", code):
        ns["unittest"] = unittest
        try:
            exec(compile(code, "<tests>", "exec"), ns)
        except BaseException as exc:  # noqa: BLE001
            _write({"ok": False, "error": _error_text(exc)})
            return
        suite = unittest.TestSuite()
        for obj in list(ns.values()):
            if isinstance(obj, type) and issubclass(obj, unittest.TestCase) and obj is not unittest.TestCase:
                suite.addTests(unittest.TestLoader().loadTestsFromTestCase(obj))
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            res = unittest.TextTestRunner(stream=io.StringIO(), verbosity=0).run(suite)
        details = []
        for t, tb in res.failures + res.errors:
            lines = [l.strip() for l in tb.strip().splitlines() if l.strip()]
            last = next((l for l in reversed(lines) if "Error" in l), lines[-1] if lines else "")
            details.append("%s: %s" % (t.id().split(".")[-1], last.replace("AssertionError: ", "")))
        _write({"ok": True, "legacy": {"testsRun": res.testsRun, "failures": len(res.failures),
                                       "errors": len(res.errors), "details": details}})
        return
    total = sum(1 for n in ast.walk(ast.parse(code)) if isinstance(n, ast.Assert)) or 1
    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            exec(compile(code, "<tests>", "exec"), ns)
    except AssertionError as exc:
        _write({"ok": True, "legacy": {"testsRun": total, "failures": 1, "errors": 0,
                                       "details": [str(exc) or "Resposta incorreta."]}})
        return
    except BaseException as exc:  # noqa: BLE001
        _write({"ok": True, "legacy": {"testsRun": total, "failures": 0, "errors": 1, "details": [_error_text(exc)]}})
        return
    _write({"ok": True, "legacy": {"testsRun": total, "failures": 0, "errors": 0, "details": []}})


_HANDLERS = {"run": probe_run, "call": probe_call, "globals": probe_globals, "ast": probe_ast, "legacy": probe_legacy}

_real_stdout, _real_stderr = sys.stdout, sys.stderr
_base_modules = set(sys.modules)
for _probe in _probes:
    # Estado limpo entre sondas: módulos do projeto, cwd e streams.
    for _name in list(sys.modules):
        if _name not in _base_modules:
            del sys.modules[_name]
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

