"""
Harness do executor LevelUSP — roda DENTRO do sandbox WASI (CPython 3.14).

Lê o lote pela entrada padrão (JSON com nonce, arquivo de entrada, modo e
sondas) até o fim, ANTES de qualquer código do aluno rodar: depois disso o
stdin está esgotado e nada do lote fica em disco ou em sys.argv. Executa as
sondas em sequência, cada uma com namespace, módulos, builtins e arquivos do
projeto restaurados, e escreve uma observação por linha na saída padrão,
prefixada pelo nonce. O host só aceita linhas com o nonce; prints do aluno são
capturados. Se o tempo estourar no meio, as sondas já concluídas não se perdem.

Modelo de confiança (este arquivo divide o interpretador com o aluno):
  * Todo o estado do harness vive no fecho de `_run_harness` — nada no módulo
    __main__ (que o aluno recebe como o PRÓPRIO módulo), nada em sys.modules.
    Builtins, os.write, StringIO e o codificador JSON são capturados antes do
    código do aluno: trocar `builtins.len`, `json.dumps` ou `sys.stdout` não
    altera o que o harness emite.
  * Valores são serializados só a partir de tipos embutidos, com checagem de
    tipo real (`type()`, não `isinstance`) e iteração pelos métodos C da classe
    base: `__eq__`, `__iter__` e `__repr__` do aluno não entram na conversão
    (exceto `repr` de objetos que não são embutidos, marcado como `$repr`).
  * Casos declarativos: nenhum valor esperado chega aqui; forjar uma
    observação só aprova quem já sabe a resposta.
  * Modo estrito (lotes com `legacy`/`unittest`, cada um em instância própria):
    um audit hook bloqueia o acesso a frames (sys._getframe, tb_frame,
    gi_frame...), ao gc (get_objects/referrers/referents), a trace/profile/
    monitoring e aos módulos de teste da C-API (_testcapi & cia., inclusive via
    _imp.create_builtin). Sem isso o aluno não alcança o nonce nem as sondas.
    Resíduo conhecido: um caso `legacy` continua fraco (os asserts rodam no
    namespace do aluno e podem ser enganados por `__eq__`, monkeypatch do
    unittest etc.) — por isso a API o marca como correção "legacy".
  * O sandbox não tem rede, variáveis de ambiente nem processos; só enxerga
    /lib (stdlib), /harness (somente leitura) e /work (o projeto).
"""


def _run_harness():
    import ast
    import builtins
    import io
    import json
    import math
    import os
    import re
    import sys
    import types
    import _imp
    import _json

    # Referências capturadas antes de qualquer código do aluno. Os nomes locais
    # sombreiam os builtins de propósito: as funções aninhadas os leem pelo
    # fecho, então `builtins.len = ...` feito pelo aluno não as afeta.
    (
        type, isinstance, issubclass, len, repr, str, int, float, list, tuple, dict, set, frozenset, bool,
        id, sorted, exec, eval, compile, getattr, callable, enumerate, min, max, any, all,
        BaseException, Exception, SystemExit, SyntaxError, AssertionError, ImportError, RuntimeError,
        ValueError, KeyError, AttributeError, OSError,
    ) = (
        builtins.type, builtins.isinstance, builtins.issubclass, builtins.len, builtins.repr, builtins.str,
        builtins.int, builtins.float, builtins.list, builtins.tuple, builtins.dict, builtins.set,
        builtins.frozenset, builtins.bool, builtins.id, builtins.sorted, builtins.exec, builtins.eval,
        builtins.compile, builtins.getattr, builtins.callable, builtins.enumerate, builtins.min, builtins.max,
        builtins.any, builtins.all, builtins.BaseException, builtins.Exception, builtins.SystemExit,
        builtins.SyntaxError, builtins.AssertionError, builtins.ImportError, builtins.RuntimeError,
        builtins.ValueError, builtins.KeyError, builtins.AttributeError, builtins.OSError,
    )
    globals().pop("_run_harness", None)

    project_dir = "/work"
    max_text_chars = 64_000
    max_canon_depth = 20
    max_canon_nodes = 10_000
    # Inteiros acima disso perdem precisão no JSON (double) e viajam como texto.
    max_safe_integer = 2**53
    max_repr_chars = 2_000
    max_message_chars = 2_000
    max_mro_entries = 20
    max_failed_names = 10
    max_test_name_chars = 80
    infinity = math.inf

    os_write, os_read, os_chdir, os_scandir = os.write, os.read, os.chdir, os.scandir
    os_remove, os_rmdir, os_mkdir = os.remove, os.rmdir, os.mkdir
    open_file = io.open
    StringIO = io.StringIO
    string_value = io.StringIO.getvalue
    ModuleType = types.ModuleType
    encode_json_string = _json.encode_basestring_ascii
    str_copy, int_copy, float_copy = str.__str__, int.__index__, float.__float__
    int_repr, float_repr = int.__repr__, float.__repr__
    list_iter, tuple_iter, set_iter, frozenset_iter = list.__iter__, tuple.__iter__, set.__iter__, frozenset.__iter__
    dict_items = dict.items
    get_type_name = type.__dict__["__name__"].__get__
    get_qualname = type.__dict__["__qualname__"].__get__
    get_module_name = type.__dict__["__module__"].__get__
    get_mro = type.__dict__["__mro__"].__get__
    real_stdin, real_stdout, real_stderr = sys.stdin, sys.stdout, sys.stderr
    modules = sys.modules

    chunks = []
    while True:
        chunk = os_read(0, 1 << 16)
        if not chunk:
            break
        chunks.append(chunk)
    job = json.loads(b"".join(chunks).decode("utf-8"))
    del chunks
    nonce = job["nonce"]
    entry = job.get("entry", "main.py")
    is_strict = job.get("strict") is True
    probes = job["probes"]
    del job

    # Nomes "puros" só para os tipos embutidos (por identidade); classes do
    # aluno saem como `modulo.Classe` — nunca colidem com um embutido.
    builtin_type_names = {}
    for name, value in builtins.__dict__.items():
        if isinstance(value, type) and value.__name__ == name and not name.startswith("_"):
            builtin_type_names[id(value)] = name
    for value in types.__dict__.values():
        if isinstance(value, type) and value.__module__ == "builtins" and not value.__name__.startswith("_"):
            builtin_type_names.setdefault(id(value), value.__name__)

    TestCase = TestSuite = TestLoader = TestResult = unittest = None
    if is_strict:
        import traceback
        import unittest

        # Capturadas: o aluno pode trocar os atributos do módulo unittest.
        TestCase, TestSuite, TestLoader, TestResult = unittest.TestCase, unittest.TestSuite, unittest.TestLoader, unittest.TestResult
        # O assertRaises limpa frames do traceback (tb_frame), que o modo
        # estrito bloqueia; é só uma otimização de memória.
        traceback.clear_frames = lambda tb: None

    # ── Saída das observações ────────────────────────────────────────────────

    def append_json(value, parts):
        value_type = type(value)
        if value is None:
            parts.append("null")
        elif value is True:
            parts.append("true")
        elif value is False:
            parts.append("false")
        elif value_type is str:
            parts.append(encode_json_string(value))
        elif value_type is int:
            parts.append(int_repr(value))
        elif value_type is float:
            is_finite = value == value and value != infinity and value != -infinity
            parts.append(float_repr(value) if is_finite else "null")
        elif value_type is list:
            parts.append("[")
            for index, item in enumerate(value):
                if index:
                    parts.append(",")
                append_json(item, parts)
            parts.append("]")
        elif value_type is dict:
            parts.append("{")
            for index, (key, item) in enumerate(dict_items(value)):
                if index:
                    parts.append(",")
                parts.append(encode_json_string(key if type(key) is str else "?"))
                parts.append(":")
                append_json(item, parts)
            parts.append("}")
        else:
            parts.append("null")

    def encode_json(value):
        parts = []
        append_json(value, parts)
        return "".join(parts)

    def emit(probe_id, observation):
        observation["id"] = probe_id
        # A quebra de linha inicial isola a observação de um print sem "\n" do aluno.
        payload = ("\n" + nonce + " " + encode_json(observation) + "\n").encode("ascii")
        while payload:
            written = os_write(1, payload)
            payload = payload[written:]

    # ── Serialização de valores do aluno ─────────────────────────────────────

    def clip(text):
        if text is None:
            return None, False
        if len(text) > max_text_chars:
            return text[:max_text_chars], True
        return text, False

    def safe_text(value):
        return value if type(value) is str else "?"

    def type_label(cls):
        name = builtin_type_names.get(id(cls))
        if name is not None:
            return name
        return safe_text(get_module_name(cls)) + "." + safe_text(get_qualname(cls))

    def safe_repr(value):
        try:
            text = repr(value)
        except BaseException:  # noqa: BLE001 — __repr__ do aluno
            return "<repr falhou>"
        return str_copy(text)[:max_repr_chars] if issubclass(type(text), str) else "<repr inválido>"

    def safe_message(exc):
        try:
            text = str(exc)
        except BaseException:  # noqa: BLE001 — __str__ do aluno
            return "<mensagem ilegível>"
        return str_copy(text)[:max_message_chars] if issubclass(type(text), str) else "<mensagem inválida>"

    def error_text(exc):
        message = safe_message(exc)
        name = safe_text(get_type_name(type(exc)))
        return "%s: %s" % (name, message) if message else name

    def canon(value, depth, budget):
        budget[0] -= 1
        if budget[0] < 0 or depth > max_canon_depth:
            budget[2] = True
            return {"$repr": "<valor grande ou profundo demais>"}
        value_type = type(value)
        if value is None or value_type is bool:
            return value
        if issubclass(value_type, str):
            text = str_copy(value)
            if len(text) > budget[1]:
                text = text[: max(budget[1], 0)]
                budget[2] = True
            budget[1] -= len(text)
            return text
        if issubclass(value_type, int):
            number = int_copy(value)
            if -max_safe_integer < number < max_safe_integer:
                return number
            try:
                return {"$int": int_repr(number)}
            except ValueError:
                return {"$int": "<inteiro grande demais>"}
        if issubclass(value_type, float):
            number = float_copy(value)
            if number != number:
                return {"$float": "nan"}
            if number == infinity or number == -infinity:
                return {"$float": "inf" if number > 0 else "-inf"}
            return number
        if issubclass(value_type, (list, tuple)):
            items = list_iter(value) if issubclass(value_type, list) else tuple_iter(value)
            return canon_items(items, depth, budget)
        if issubclass(value_type, (set, frozenset)):
            items = set_iter(value) if issubclass(value_type, set) else frozenset_iter(value)
            return sorted(canon_items(items, depth, budget), key=encode_json)
        if issubclass(value_type, dict):
            pairs = [(key, item) for key, item in canon_items(dict_items(value), depth, budget, is_pairs=True)]
            if all(type(key) is str and not key.startswith("$") for key, _ in pairs):
                return {key: item for key, item in pairs}
            return {"$dict": [[key, item] for key, item in pairs]}
        return {"$repr": safe_repr(value)}

    def canon_items(items, depth, budget, is_pairs=False):
        """Converte os itens de uma coleção, parando de iterar quando o orçamento acaba."""
        converted = []
        for item in items:
            if budget[0] <= 0:
                budget[2] = True
                break
            if is_pairs:
                converted.append((canon(item[0], depth + 1, budget), canon(item[1], depth + 1, budget)))
            else:
                converted.append(canon(item, depth + 1, budget))
        return converted

    def canonicalize(value):
        budget = [max_canon_nodes, max_text_chars, False]
        return canon(value, 0, budget), budget[2]

    def describe_exception(exc, stage):
        cls = type(exc)
        mro = [type_label(entry) for entry in get_mro(cls)][:max_mro_entries]
        return {"type": type_label(cls), "mro": mro, "message": safe_message(exc), "stage": stage}

    # ── Estado limpo entre sondas ────────────────────────────────────────────

    def read_bytes(path):
        with open_file(path, "rb") as handle:
            return handle.read()

    def read_text(path):
        with open_file(path, encoding="utf-8") as handle:
            return handle.read()

    def list_tree(root):
        file_paths, dir_paths, pending = [], [], [root]
        while pending:
            current = pending.pop()
            with os_scandir(current) as entries:
                for item in entries:
                    path = current + "/" + item.name
                    if item.is_dir(follow_symlinks=False):
                        dir_paths.append(path)
                        pending.append(path)
                    else:
                        file_paths.append(path)
        return file_paths, dir_paths

    baseline_files, baseline_dirs = list_tree(project_dir)
    baseline_contents = {path: read_bytes(path) for path in baseline_files}
    baseline_dir_set = set(baseline_dirs)

    def restore_project_files():
        """Desfaz arquivos criados/alterados pelo aluno ou pela preparação de outra sonda."""
        current_files, current_dirs = list_tree(project_dir)
        for path in current_files:
            if path not in baseline_contents:
                os_remove(path)
        for path in sorted(current_dirs, key=len, reverse=True):
            if path not in baseline_dir_set:
                os_rmdir(path)
        for path in sorted(baseline_dirs, key=len):
            try:
                os_mkdir(path)
            except OSError:
                pass
        for path, content in dict_items(baseline_contents):
            try:
                if read_bytes(path) == content:
                    continue
            except OSError:
                pass
            with open_file(path, "wb") as handle:
                handle.write(content)

    baseline_modules = dict(modules)
    baseline_builtins = dict(builtins.__dict__)
    builtins_dict = builtins.__dict__
    baseline_path = list(sys.path)
    baseline_meta_path = list(sys.meta_path)
    baseline_path_hooks = list(sys.path_hooks)
    baseline_recursion_limit = sys.getrecursionlimit()
    baseline_hooks = (sys.displayhook, sys.excepthook, sys.unraisablehook, sys.breakpointhook)

    def restore_interpreter():
        for name in list(modules):
            if baseline_modules.get(name) is not modules[name]:
                del modules[name]
        for name, module in dict_items(baseline_modules):
            if modules.get(name) is not module:
                modules[name] = module
        for name in list(builtins_dict):
            if name not in baseline_builtins:
                del builtins_dict[name]
        for name, value in dict_items(baseline_builtins):
            if builtins_dict.get(name) is not value:
                builtins_dict[name] = value
        sys.modules = modules
        sys.path = list(baseline_path)
        sys.meta_path = list(baseline_meta_path)
        sys.path_hooks = list(baseline_path_hooks)
        sys.path_importer_cache = {}
        sys.setrecursionlimit(baseline_recursion_limit)
        sys.displayhook, sys.excepthook, sys.unraisablehook, sys.breakpointhook = baseline_hooks
        sys.stdin, sys.stdout, sys.stderr = real_stdin, real_stdout, real_stderr
        sys.argv = [entry]
        if not is_strict:
            sys.settrace(None)
            sys.setprofile(None)
        os_chdir(project_dir)

    # ── Execução do projeto ──────────────────────────────────────────────────

    def load_project(stdin_text, module_name):
        """Executa o arquivo de entrada como módulo e devolve (namespace, stdout, stderr, erro)."""
        source = read_text(project_dir + "/" + entry)
        module = ModuleType(module_name)
        namespace = module.__dict__
        namespace["__file__"] = project_dir + "/" + entry
        namespace["__builtins__"] = builtins
        # O aluno recebe o próprio módulo como __main__: o módulo do harness
        # não fica alcançável por `import __main__`.
        modules["__main__"] = module
        modules[module_name] = module
        sys.path.insert(0, project_dir)
        captured_stdout, captured_stderr = StringIO(), StringIO()
        sys.stdin = StringIO(stdin_text)
        sys.stdout, sys.stderr = captured_stdout, captured_stderr
        error = None
        try:
            exec(compile(source, entry, "exec"), namespace)
        except SystemExit as exc:
            if not is_clean_exit(exc.code):
                error = "SystemExit: %s" % safe_message(exc)
        except BaseException as exc:  # noqa: BLE001 — qualquer erro do aluno vira observação
            error = error_text(exc)
        finally:
            sys.stdout, sys.stderr = real_stdout, real_stderr
        return namespace, captured_text(captured_stdout), captured_text(captured_stderr), error

    def is_clean_exit(code):
        return code is None or ((type(code) is int or type(code) is bool) and code == 0)

    def captured_text(buffer):
        try:
            return string_value(buffer)
        except ValueError:  # o aluno fechou o sys.stdout
            return ""

    def invalid_case(reason):
        return {"ok": False, "error": "Caso de teste inválido (código do professor): %s" % reason}

    def probe_run(probe):
        _, stdout, stderr, error = load_project(probe.get("stdin", ""), "__main__")
        stdout, stdout_truncated = clip(stdout)
        stderr, stderr_truncated = clip(stderr)
        return {"ok": error is None, "stdout": stdout, "stderr": stderr, "error": error,
                "truncated": stdout_truncated or stderr_truncated}

    def resolve(namespace, dotted):
        parts = dotted.split(".")
        target = namespace[parts[0]]
        for attribute in parts[1:]:
            target = getattr(target, attribute)
        return target

    def probe_call(probe):
        namespace, stdout, _, error = load_project("", "__main__")
        if error is not None:
            return {"ok": False, "error": error, "stdout": clip(stdout)[0]}
        try:
            function = resolve(namespace, probe["function"])
        except (KeyError, AttributeError):
            return {"ok": False, "error": "NameError: '%s' não foi definida" % probe["function"]}
        if not callable(function):
            return {"ok": False, "error": "TypeError: '%s' não é uma função" % probe["function"]}
        call_stdout = StringIO()
        sys.stdout, sys.stderr = call_stdout, StringIO()
        try:
            value = function(*probe.get("args", []), **probe.get("kwargs", {}))
            canonical, truncated = canonicalize(value)
        except BaseException as exc:  # noqa: BLE001
            sys.stdout, sys.stderr = real_stdout, real_stderr
            return {"ok": False, "error": error_text(exc), "stdout": clip(captured_text(call_stdout))[0]}
        sys.stdout, sys.stderr = real_stdout, real_stderr
        return {"ok": True, "value": canonical, "type": type_label(type(value)), "truncated": truncated,
                "stdout": clip(captured_text(call_stdout))[0]}

    def probe_globals(probe):
        namespace, stdout, _, error = load_project("", "__main__")
        if error is not None:
            return {"ok": False, "error": error, "stdout": clip(stdout)[0]}
        values, value_types, missing = {}, {}, []
        sys.stdout, sys.stderr = StringIO(), StringIO()
        try:
            for name in probe.get("names", []):
                if name in namespace:
                    values[name] = canonicalize(namespace[name])[0]
                    value_types[name] = type_label(type(namespace[name]))
                else:
                    missing.append(name)
        finally:
            sys.stdout, sys.stderr = real_stdout, real_stderr
        return {"ok": True, "values": values, "types": value_types, "missing": missing, "stdout": clip(stdout)[0]}

    def probe_expr(probe):
        try:
            setup_code = compile(probe.get("setup", ""), "<preparação>", "exec")
            expr_code = compile(probe["expr"], "<expressão>", "eval")
        except SyntaxError as exc:
            return invalid_case("SyntaxError: %s" % safe_message(exc))
        namespace, stdout, _, error = load_project(probe.get("stdin", ""), "__main__")
        if error is not None:
            return {"ok": False, "error": error, "stdout": clip(stdout)[0]}
        expr_stdout = StringIO()
        sys.stdout, sys.stderr = expr_stdout, StringIO()
        stage = "setup"
        try:
            exec(setup_code, namespace)
            stage = "expr"
            value = eval(expr_code, namespace)
            observation = {"ok": True, "type": type_label(type(value))}
            observation["value"], observation["truncated"] = canonicalize(value)
        except BaseException as exc:  # noqa: BLE001 — a exceção É a observação
            observation = {"ok": True, "raised": describe_exception(exc, stage)}
        finally:
            sys.stdout, sys.stderr = real_stdout, real_stderr
        observation["stdout"] = clip(captured_text(expr_stdout))[0]
        return observation

    # ── unittest (modo estrito) ──────────────────────────────────────────────

    def test_name(test):
        name = getattr(test, "_testMethodName", None)
        return str_copy(name)[:max_test_name_chars] if type(name) is str else "?"

    def make_recorder_class():
        base = TestResult

        class OutcomeRecorder(base):
            """Conta resultados sem formatar tracebacks (o modo estrito bloqueia tb_frame)."""

            def __init__(self):
                base.__init__(self)
                self.run_count = 0
                self.failure_count = 0
                self.error_count = 0
                self.skip_count = 0
                self.failed = []

            def remember(self, test, exc):
                if len(self.failed) < max_failed_names:
                    self.failed.append((test_name(test), exc))

            def startTest(self, test):
                self.run_count += 1

            def stopTest(self, test):
                pass

            def addSuccess(self, test):
                pass

            def addFailure(self, test, err):
                self.failure_count += 1
                self.remember(test, err[1])

            def addError(self, test, err):
                self.error_count += 1
                self.remember(test, err[1])

            def addSkip(self, test, reason):
                self.skip_count += 1

            def addExpectedFailure(self, test, err):
                pass

            def addUnexpectedSuccess(self, test):
                self.failure_count += 1
                self.remember(test, None)

            def addSubTest(self, test, subtest, err):
                if err is None:
                    return
                if issubclass(err[0], AssertionError):
                    self.failure_count += 1
                else:
                    self.error_count += 1
                self.remember(test, err[1])

            def addDuration(self, test, elapsed):
                pass

        return OutcomeRecorder

    OutcomeRecorder = make_recorder_class() if is_strict else None

    def run_suite(test_classes):
        suite = TestSuite()
        loader = TestLoader()
        for test_class in test_classes:
            suite.addTests(loader.loadTestsFromTestCase(test_class))
        recorder = OutcomeRecorder()
        suite.run(recorder)
        return recorder

    def is_test_class(value):
        return issubclass(type(value), type) and value is not TestCase and issubclass(value, TestCase)

    def select_test_classes(namespace, wanted, module_name):
        if wanted is not None:
            candidate = namespace.get(wanted)
            return [candidate] if is_test_class(candidate) else None
        selected, seen = [], set()
        for value in list(namespace.values()):
            if is_test_class(value) and get_module_name(value) == module_name and id(value) not in seen:
                seen.add(id(value))
                selected.append(value)
        return selected

    def probe_unittest(probe):
        """Suíte do aluno contra uma implementação. Só contagens saem daqui; a API decide."""
        implementation = probe.get("implementation")
        target = probe.get("target")
        implementation_code = None
        if implementation is not None:
            try:
                implementation_code = compile(implementation, "<implementação>", "exec")
            except SyntaxError as exc:
                return invalid_case("SyntaxError: %s" % safe_message(exc))
        # Carregado como módulo `main` (como `python -m unittest main`): um
        # `if __name__ == "__main__": unittest.main()` do aluno não dispara.
        namespace, _, _, error = load_project("", "main")
        if error is not None:
            return {"ok": False, "error": error}
        sys.stdout, sys.stderr = StringIO(), StringIO()
        try:
            if implementation_code is not None:
                implementation_namespace = {"__builtins__": builtins, "__name__": "implementacao"}
                exec(implementation_code, implementation_namespace)
                if target not in implementation_namespace:
                    return invalid_case("a implementação não define '%s'" % target)
                namespace[target] = implementation_namespace[target]
            test_classes = select_test_classes(namespace, probe.get("test_class"), "main")
            if test_classes is None:
                return {"ok": False, "error": "NameError: a classe de testes '%s' não foi definida" % probe.get("test_class")}
            recorder = run_suite(test_classes)
        except BaseException as exc:  # noqa: BLE001
            return {"ok": False, "error": error_text(exc)}
        finally:
            sys.stdout, sys.stderr = real_stdout, real_stderr
        return {"ok": True, "tests": {
            "run": recorder.run_count, "failures": recorder.failure_count, "errors": recorder.error_count,
            "skipped": recorder.skip_count, "failed": [name for name, _ in recorder.failed],
        }}

    # ── Testes legados (modo estrito, correção fraca) ────────────────────────

    def legacy_result(tests_run, failures, errors, details):
        return {"ok": True, "legacy": {"testsRun": tests_run, "failures": failures, "errors": errors, "details": details}}

    def legacy_detail(name, exc):
        if exc is None:
            return "%s: sucesso inesperado" % name
        if isinstance(exc, AssertionError):
            return "%s: %s" % (name, safe_message(exc))
        return "%s: %s" % (name, error_text(exc))

    def run_legacy_unittest(code, namespace):
        namespace["unittest"] = unittest
        exec(compile(code, "<tests>", "exec"), namespace)
        test_classes = [value for value in list(namespace.values()) if is_test_class(value)]
        recorder = run_suite(test_classes)
        details = [legacy_detail(name, exc) for name, exc in recorder.failed]
        return legacy_result(recorder.run_count, recorder.failure_count, recorder.error_count, details)

    def run_legacy_asserts(code, namespace, total):
        try:
            exec(compile(code, "<tests>", "exec"), namespace)
        except AssertionError as exc:
            return legacy_result(total, 1, 0, [safe_message(exc) or "Resposta incorreta."])
        except BaseException as exc:  # noqa: BLE001
            return legacy_result(total, 0, 1, [error_text(exc)])
        return legacy_result(total, 0, 0, [])

    def probe_legacy(probe):
        code = probe["code"]
        # Analisado antes do código do aluno rodar (ele poderia trocar o módulo ast/re).
        is_unittest = re.search(r"class\s+\w+\s*\(\s*unittest\.TestCase\s*\)", code) is not None
        try:
            # Cada assert conta como um teste, mas o bloco para no primeiro que falhar.
            total = sum(1 for node in ast.walk(ast.parse(code)) if isinstance(node, ast.Assert)) or 1
        except SyntaxError as exc:
            return invalid_case("SyntaxError: %s" % safe_message(exc))
        namespace, stdout, _, error = load_project("", "__main__")
        if error is not None:
            return {"ok": False, "error": error}
        # Nomes que os gabaritos antigos esperam encontrar: não renomear.
        namespace["_source"] = read_text(project_dir + "/" + entry)
        namespace["_stdout"] = stdout
        namespace["__builtins__"] = builtins
        namespace["AssertionError"] = AssertionError
        sys.stdout, sys.stderr = StringIO(), StringIO()
        try:
            if is_unittest:
                return run_legacy_unittest(code, namespace)
            return run_legacy_asserts(code, namespace, total)
        except BaseException as exc:  # noqa: BLE001
            return {"ok": False, "error": error_text(exc)}
        finally:
            sys.stdout, sys.stderr = real_stdout, real_stderr

    # ── Análise estrutural (instância própria; o código do aluno não roda) ───

    constructs_by_node = {
        ast.Lambda: "lambda", ast.For: "for", ast.While: "while", ast.If: "if",
        ast.FunctionDef: "def", ast.ClassDef: "class", ast.ListComp: "list_comprehension",
        ast.DictComp: "dict_comprehension", ast.JoinedStr: "f_string", ast.Try: "try",
        ast.With: "with", ast.Return: "return", ast.Import: "import", ast.ImportFrom: "import",
        ast.Yield: "yield", ast.YieldFrom: "yield",
    }
    feature_keys = ("constructs", "calls", "functions", "classes", "imports", "recursive_functions",
                    "decorators", "handlers")

    def node_name(node):
        if isinstance(node, ast.Call):
            node = node.func
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            return node.attr
        return None

    def project_sources():
        sources = []
        for directory, _, file_names in os.walk(project_dir):
            sources.extend(directory + "/" + name for name in file_names if name.endswith(".py"))
        return sorted(sources)

    def collect_features(tree, features, function_constructs):
        for node in ast.walk(tree):
            construct = constructs_by_node.get(type(node))
            if construct:
                features["constructs"].add(construct)
            if isinstance(node, ast.Call) and node_name(node):
                features["calls"].add(node_name(node))
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                features["functions"].add(node.name)
                scoped = function_constructs.setdefault(node.name, set())
                scoped.update(filter(None, (constructs_by_node.get(type(inner)) for inner in ast.walk(node))))
                if any(isinstance(inner, ast.Call) and node_name(inner) == node.name for inner in ast.walk(node)):
                    features["recursive_functions"].add(node.name)
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                features["decorators"].update(filter(None, (node_name(item) for item in node.decorator_list)))
            if isinstance(node, ast.ClassDef):
                features["classes"].add(node.name)
            if isinstance(node, ast.ExceptHandler) and node.type is not None:
                caught = node.type.elts if isinstance(node.type, ast.Tuple) else [node.type]
                features["handlers"].update(filter(None, (node_name(item) for item in caught)))
            if isinstance(node, ast.Import):
                features["imports"].update(alias.name.split(".")[0] for alias in node.names)
            if isinstance(node, ast.ImportFrom) and node.module:
                features["imports"].add(node.module.split(".")[0])

    def probe_ast(probe):
        """Analisa a estrutura de TODOS os .py do projeto. Não executa nada."""
        features = {key: set() for key in feature_keys}
        function_constructs = {}
        for source_path in project_sources():
            try:
                tree = ast.parse(read_text(source_path))
            except SyntaxError as exc:
                return {"ok": False, "error": "SyntaxError: %s (linha %s)" % (exc.msg, exc.lineno)}
            collect_features(tree, features, function_constructs)
        if features["recursive_functions"]:
            features["constructs"].add("recursion")
        serialized = {key: sorted(values) for key, values in features.items()}
        serialized["function_constructs"] = {name: sorted(values) for name, values in function_constructs.items()}
        return {"ok": True, "features": serialized}

    # ── Modo estrito: fecha os caminhos até o estado do harness ──────────────

    def install_strict_guard():
        blocked_events = frozenset({
            "sys._getframe", "sys._current_frames", "sys._current_exceptions",
            "gc.get_objects", "gc.get_referrers", "gc.get_referents",
            "sys.settrace", "sys.setprofile", "sys._settraceallthreads", "sys._setprofileallthreads",
            "sys.monitoring.register_callback",
        })
        frame_attributes = frozenset({"tb_frame", "gi_frame", "cr_frame", "ag_frame"})
        blocked_modules = frozenset({"_imp", "xxsubtype", "_remote_debugging"})
        blocked_prefixes = ("_test", "_xx")
        create_event = "levelusp.create_builtin"
        original_create_builtin = _imp.create_builtin
        Namespace = types.SimpleNamespace
        refused = "introspecção do interpretador desativada na correção"

        def is_blocked_module(name):
            if type(name) is not str:
                return True
            root = name.split(".")[0]
            return root in blocked_modules or root.startswith(blocked_prefixes)

        # O original de _imp.create_builtin só existe no fecho deste hook, que
        # não é alcançável a partir do Python (não há API para listar hooks).
        def guard(event, args):
            if event in blocked_events:
                raise RuntimeError(refused)
            if event == "object.__getattr__":
                if args[1] in frame_attributes:
                    raise RuntimeError(refused)
                return
            if event == "import":
                if is_blocked_module(args[0]):
                    raise ImportError("módulo indisponível na correção: %s" % safe_text(args[0]))
                return
            if event == create_event:
                box = args[0]
                if type(box) is not list or len(box) != 1:
                    raise RuntimeError(refused)
                name = getattr(box[0], "name", None)
                if is_blocked_module(name):
                    raise ImportError("módulo indisponível na correção: %s" % safe_text(name))
                box.append(original_create_builtin(Namespace(name=name)))

        audit = sys.audit

        def create_builtin(spec):
            box = [spec]
            audit("levelusp.create_builtin", box)
            return box[1]

        sys.addaudithook(guard)
        _imp.create_builtin = create_builtin

    handlers = {
        "run": probe_run, "call": probe_call, "globals": probe_globals, "ast": probe_ast,
        "expr": probe_expr, "unittest": probe_unittest, "legacy": probe_legacy,
    }

    if is_strict:
        install_strict_guard()

    for index, probe in enumerate(probes):
        try:
            restore_interpreter()
            if index:
                restore_project_files()
            emit(probe["id"], handlers[probe["kind"]](probe))
        except BaseException as exc:  # noqa: BLE001
            try:
                emit(probe["id"], {"ok": False, "error": "Erro interno do executor: %s" % safe_text(get_type_name(type(exc)))})
            except BaseException:  # noqa: BLE001
                pass


_run_harness()
