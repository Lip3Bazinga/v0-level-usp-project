#!/usr/bin/env python3
"""
Converte os gabaritos legados (asserts do avaliador antigo, em
legacy/scripts/verify_lessons.py) para o formato declarativo de casos de teste
(packages/contracts/src/grading.ts) e gera packages/db/seed/python-completo.json.

Regras de conversão (o que não se encaixa vira um caso "legacy", que roda no
sandbox junto com o código do aluno — correção mais fraca, sinalizada na UI):
  assert f(<literais>) == <literal>        -> call
  assert f(<literais>) is True|False|None   -> call
  assert var == <literal> / isinstance(var, T) -> variable (+ tipo)
  assert "texto" in _stdout                 -> io (contains)
  assert "f\"" in _source or "f'" in _source -> source uses f_string
  assert "nome(" not in _source...          -> source not_calls nome
Uso: python3 tools/convert_legacy_tests.py  (a partir de packages/db)
"""
import ast
import json
import os
import sys

TOOLS_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(TOOLS_DIR, "../../.."))
LEGACY_SOURCE = os.path.join(ROOT, "legacy/scripts/verify_lessons.py")
OUTPUT_FILE = os.path.join(ROOT, "packages/db/seed/python-completo.json")
PY_TYPES = {"int", "float", "str", "bool", "list", "tuple", "dict", "set"}
FLOAT_TOLERANCE = 1e-6
MAX_CASE_NAME_LENGTH = 150


def load_lessons():
    source = open(LEGACY_SOURCE, encoding="utf-8").read()
    definitions = source.split("\ndef evaluate(")[0]  # só as definições L[...]
    namespace = {}
    exec(compile(definitions, LEGACY_SOURCE, "exec"), namespace)
    return namespace["L"]


def literal(node):
    try:
        return True, ast.literal_eval(node)
    except Exception:
        return False, None


def to_json(value):
    if isinstance(value, (tuple, list)):
        return [to_json(item) for item in value]
    if isinstance(value, dict):
        if all(isinstance(key, str) for key in value):
            return {key: to_json(item) for key, item in value.items()}
        raise ValueError("dict com chave não-str")
    if isinstance(value, (set, frozenset)):
        raise ValueError("set não é representável de forma estável")
    if isinstance(value, float) and value != value:
        raise ValueError("nan")
    return value


def py_type(value):
    type_name = type(value).__name__
    return type_name if type_name in PY_TYPES else None


def with_hint(case, hint):
    if hint:
        case["hint"] = hint
    return case


def is_single_comparison(test):
    return isinstance(test, ast.Compare) and len(test.ops) == 1


class Converter:
    def __init__(self, tests_source):
        self.tree = ast.parse(tests_source)
        self.source = tests_source
        self.cases = []
        self.variables = {}  # variável -> {"expected":..., "type":..., "hint":...}
        self.case_counter = 0

    def next_id(self, prefix):
        self.case_counter += 1
        return "%s%d" % (prefix, self.case_counter)

    def run(self):
        """
        Converte asserts independentes. Assim que aparece um comando que não é
        assert (preparação: criar arquivo, instanciar objeto...), os asserts
        seguintes dependem desse estado e NÃO são extraídos. Se sobrar qualquer
        parte não convertida, o caso legado recebe o bloco ORIGINAL inteiro —
        preserva a semântica (ordem e efeitos colaterais) do gabarito antigo.
        """
        setup_seen = False
        has_unconverted = False
        for statement in self.tree.body:
            if not isinstance(statement, ast.Assert):
                setup_seen = True
                has_unconverted = True
                continue
            if setup_seen or not self.convert_assert(statement):
                has_unconverted = True
        if not self.add_variable_cases():
            has_unconverted = True
        if has_unconverted:
            self.cases.append({"id": self.next_id("legado"), "kind": "legacy", "name": "Testes adicionais",
                               "code": self.source.strip("\n")})
        return self.cases

    def add_variable_cases(self):
        """Devolve False se alguma variável só tinha checagem de tipo (fica no bloco legado)."""
        all_converted = True
        for variable, spec in self.variables.items():
            if "expected" not in spec:
                all_converted = False
                continue
            case = {"id": self.next_id("v"), "kind": "variable", "variable": variable, "expected": spec["expected"],
                    "name": "Variável %s" % variable}
            if spec.get("type"):
                case["type"] = spec["type"]
            self.cases.append(with_hint(case, spec.get("hint")))
        return all_converted

    def convert_assert(self, assert_node):
        hint = None
        if assert_node.msg is not None:
            is_literal, hint = literal(assert_node.msg)
            if not is_literal:
                return False
        test = assert_node.test
        converted = self.convert_text_membership(test, hint)
        if converted is not None:
            return converted
        if self.convert_f_string_check(test, hint) or self.convert_isinstance(test, hint):
            return True
        return self.convert_equality(test, hint)

    def convert_text_membership(self, test, hint):
        """`"x" in _stdout` e `"nome(" (not) in _source`; None quando não é esse formato."""
        if not (is_single_comparison(test) and isinstance(test.comparators[0], ast.Name)):
            return None
        target = test.comparators[0].id
        is_literal, text = literal(test.left)
        if not (is_literal and isinstance(text, str)):
            return None
        if target == "_stdout" and isinstance(test.ops[0], ast.In):
            self.cases.append(with_hint({"id": self.next_id("saida"), "kind": "io", "stdin": "", "expected_stdout": text,
                                         "match": "contains", "name": "Saída contém %r" % text}, hint))
            return True
        if target == "_source":
            return self.source_rule(text, isinstance(test.ops[0], ast.NotIn), hint)
        return None

    def convert_f_string_check(self, test, hint):
        """`"f\\"" in _source or "f'" in _source` -> regra de f-string."""
        if not (isinstance(test, ast.BoolOp) and isinstance(test.op, ast.Or)):
            return False
        segments = [ast.get_source_segment(self.source, value) for value in test.values]
        if not all("_source" in segment for segment in segments):
            return False
        if not any("f\\\"" in segment or "f'" in segment or 'f"' in segment for segment in segments):
            return False
        self.cases.append(with_hint({"id": self.next_id("fonte"), "kind": "source", "rule": {"type": "uses", "construct": "f_string"},
                                     "name": "Usa f-string"}, hint))
        return True

    def convert_isinstance(self, test, hint):
        """`isinstance(var, T)` -> tipo exigido da variável."""
        if not (isinstance(test, ast.Call) and isinstance(test.func, ast.Name) and test.func.id == "isinstance"):
            return False
        if not (len(test.args) == 2 and isinstance(test.args[0], ast.Name) and isinstance(test.args[1], ast.Name)):
            return False
        if test.args[1].id not in PY_TYPES:
            return False
        spec = self.variables.setdefault(test.args[0].id, {})
        spec["type"] = test.args[1].id
        if hint and not spec.get("hint"):
            spec["hint"] = hint
        return True

    def convert_equality(self, test, hint):
        """`var == literal`, `f(literais) == literal` e `... is True|False|None`."""
        if not is_single_comparison(test):
            return False
        operator, left, right = test.ops[0], test.left, test.comparators[0]
        is_identity = isinstance(operator, ast.Is)
        if is_identity and isinstance(right, ast.Constant) and right.value in (True, False, None):
            expected = right.value
        elif isinstance(operator, ast.Eq):
            is_literal, expected = literal(right)
            if not is_literal:
                return False
        else:
            return False
        try:
            expected_json = to_json(expected)
        except ValueError:
            return False
        checks_type = is_identity or isinstance(expected, bool)
        if isinstance(left, ast.Name):
            return self.add_variable_expectation(left.id, expected, expected_json, checks_type, hint)
        if isinstance(left, ast.Call) and isinstance(left.func, ast.Name) and not left.keywords:
            return self.add_call_case(left, expected, expected_json, checks_type, hint)
        return False

    def add_variable_expectation(self, variable, expected, expected_json, checks_type, hint):
        spec = self.variables.setdefault(variable, {})
        if "expected" in spec:
            return False
        spec["expected"] = expected_json
        if checks_type:
            spec.setdefault("type", py_type(expected) or "NoneType")
        if hint:
            spec["hint"] = hint
        return True

    def add_call_case(self, call, expected, expected_json, checks_type, hint):
        args = []
        for arg in call.args:
            is_literal, value = literal(arg)
            if not is_literal:
                return False
            try:
                args.append(to_json(value))
            except ValueError:
                return False
        case = {"id": self.next_id("chamada"), "kind": "call", "function": call.func.id, "args": args, "kwargs": {},
                "expected": expected_json, "name": ast.get_source_segment(self.source, call)[:MAX_CASE_NAME_LENGTH]}
        if checks_type:
            case["type"] = py_type(expected) or "NoneType"
        if isinstance(expected, float):
            case["tolerance"] = FLOAT_TOLERANCE
        self.cases.append(with_hint(case, hint))
        return True

    def source_rule(self, text, negated, hint):
        name = text[:-1] if text.endswith("(") else None
        if name and name.isidentifier():
            rule = {"type": "not_calls" if negated else "calls", "name": name}
        elif text == "lambda" and not negated:
            rule = {"type": "uses", "construct": "lambda"}
        else:
            return False
        label = ("Não usa %s()" if negated else "Usa %s()") % rule.get("name", "lambda")
        self.cases.append(with_hint({"id": self.next_id("fonte"), "kind": "source", "rule": rule, "name": label}, hint))
        return True


def stub_function(function, indent):
    return ["%sdef %s(%s):" % (indent, function.name, ast.unparse(function.args)), indent + "    # TODO: implemente", indent + "    pass"]


def stub_class(class_node):
    bases = "(%s)" % ", ".join(ast.unparse(base) for base in class_node.bases) if class_node.bases else ""
    lines = ["", "", "class %s%s:" % (class_node.name, bases)]
    methods = [node for node in class_node.body if isinstance(node, ast.FunctionDef)]
    if not methods:
        lines.append("    pass")
    for method in methods:
        lines += ["    @%s" % ast.unparse(decorator) for decorator in method.decorator_list]
        lines += stub_function(method, "    ") + [""]
    return lines


def make_stub(source):
    """Esqueleto inicial a partir da solução: imports, assinaturas e `pass`."""
    lines = []
    for node in ast.parse(source).body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            lines.append(ast.unparse(node))
        elif isinstance(node, ast.FunctionDef):
            lines += ["", ""] + stub_function(node, "")
        elif isinstance(node, ast.ClassDef):
            lines += stub_class(node)
    body = "\n".join(lines).strip("\n")
    return ("# Complete o código abaixo.\n\n" + body + "\n") if body else "# Escreva sua solução aqui\n"


def starter_file(file):
    if file["path"].endswith(".py") and file["content"].strip():
        return {"path": file["path"], "content": make_stub(file["content"])}
    return {"path": file["path"], "content": file["content"]}


def main():
    lessons = []
    stats = {"strong": 0, "legacy": 0}
    legacy_lessons = load_lessons()
    for order in sorted(legacy_lessons):
        title, solution, tests = legacy_lessons[order]
        files = solution if isinstance(solution, list) else [{"path": "main.py", "content": solution.lstrip("\n")}]
        cases = Converter(tests).run()
        kinds = [case["kind"] for case in cases]
        stats["legacy" if "legacy" in kinds else "strong"] += 1
        lessons.append({
            "order": order,
            "title": title,
            "description": "Exercício do curso Python Completo: %s." % title,
            "starter_files": [starter_file(file) for file in files],
            "reference_solution": files,
            "test_cases": cases,
        })
        print("%02d %-35s %s" % (order, title, ", ".join("%s:%d" % (kind, kinds.count(kind)) for kind in sorted(set(kinds)))))
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as output:
        json.dump({"course": "Python Completo", "generated_from": "legacy/scripts/verify_lessons.py", "lessons": lessons}, output, ensure_ascii=False, indent=2)
    print("\n%d lições: %d só com casos fortes, %d com casos legados -> %s" % (len(lessons), stats["strong"], stats["legacy"], os.path.relpath(OUTPUT_FILE, ROOT)))


if __name__ == "__main__":
    sys.exit(main())
