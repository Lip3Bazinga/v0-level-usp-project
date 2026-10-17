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

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "../../.."))
SRC = os.path.join(ROOT, "legacy/scripts/verify_lessons.py")
OUT = os.path.join(ROOT, "packages/db/seed/python-completo.json")
PY_TYPES = {"int", "float", "str", "bool", "list", "tuple", "dict", "set"}


def load_lessons():
    src = open(SRC, encoding="utf-8").read()
    src = src.split("\ndef evaluate(")[0]  # só as definições L[...]
    ns = {}
    exec(compile(src, SRC, "exec"), ns)
    return ns["L"]


def literal(node):
    try:
        return True, ast.literal_eval(node)
    except Exception:
        return False, None


def to_json(value):
    if isinstance(value, tuple):
        return [to_json(v) for v in value]
    if isinstance(value, list):
        return [to_json(v) for v in value]
    if isinstance(value, dict):
        if all(isinstance(k, str) for k in value):
            return {k: to_json(v) for k, v in value.items()}
        raise ValueError("dict com chave não-str")
    if isinstance(value, (set, frozenset)):
        raise ValueError("set não é representável de forma estável")
    if isinstance(value, float) and value != value:
        raise ValueError("nan")
    return value


def py_type(value):
    t = type(value).__name__
    return t if t in PY_TYPES else None


class Converter:
    def __init__(self, tests_src):
        self.tree = ast.parse(tests_src)
        self.src = tests_src
        self.cases = []
        self.vars = {}  # var -> {"expected":..., "type":..., "hint":...}
        self.n = 0

    def next_id(self, prefix):
        self.n += 1
        return "%s%d" % (prefix, self.n)

    def run(self):
        """
        Converte asserts independentes. Assim que aparece um comando que não é
        assert (preparação: criar arquivo, instanciar objeto...), os asserts
        seguintes dependem desse estado e NÃO são extraídos. Se sobrar qualquer
        parte não convertida, o caso legado recebe o bloco ORIGINAL inteiro —
        preserva a semântica (ordem e efeitos colaterais) do gabarito antigo.
        """
        setup_seen = False
        unconverted = False
        for stmt in self.tree.body:
            if not isinstance(stmt, ast.Assert):
                setup_seen = True
                unconverted = True
                continue
            if setup_seen or not self.convert_assert(stmt):
                unconverted = True
        for var, spec in self.vars.items():
            if "expected" not in spec:
                unconverted = True  # só checagem de tipo: fica no bloco legado
                continue
            case = {"id": self.next_id("v"), "kind": "variable", "variable": var, "expected": spec["expected"],
                    "name": "Variável %s" % var}
            if spec.get("type"):
                case["type"] = spec["type"]
            if spec.get("hint"):
                case["hint"] = spec["hint"]
            self.cases.append(case)
        if unconverted:
            self.cases.append({"id": self.next_id("legado"), "kind": "legacy", "name": "Testes adicionais",
                               "code": self.src.strip("\n")})
        return self.cases

    def convert_assert(self, a):
        msg = None
        if a.msg is not None:
            ok, msg = literal(a.msg)
            if not ok:
                return False
        test = a.test
        # "x" in _stdout
        if isinstance(test, ast.Compare) and len(test.ops) == 1 and isinstance(test.comparators[0], ast.Name):
            target = test.comparators[0].id
            ok, val = literal(test.left)
            if ok and isinstance(val, str) and target == "_stdout" and isinstance(test.ops[0], ast.In):
                self.cases.append({"id": self.next_id("saida"), "kind": "io", "stdin": "", "expected_stdout": val,
                                   "match": "contains", "name": "Saída contém %r" % val, **({"hint": msg} if msg else {})})
                return True
            if ok and isinstance(val, str) and target == "_source":
                return self.source_rule(val, isinstance(test.ops[0], ast.NotIn), msg)
        # "f\"" in _source or "f'" in _source  -> f-string
        if isinstance(test, ast.BoolOp) and isinstance(test.op, ast.Or):
            parts = [ast.get_source_segment(self.src, v) for v in test.values]
            if all("_source" in p for p in parts) and any("f\\\"" in p or "f'" in p or 'f"' in p for p in parts):
                self.cases.append({"id": self.next_id("fonte"), "kind": "source", "rule": {"type": "uses", "construct": "f_string"},
                                   "name": "Usa f-string", **({"hint": msg} if msg else {})})
                return True
        # isinstance(var, T)
        if isinstance(test, ast.Call) and isinstance(test.func, ast.Name) and test.func.id == "isinstance" \
                and len(test.args) == 2 and isinstance(test.args[0], ast.Name) and isinstance(test.args[1], ast.Name) \
                and test.args[1].id in PY_TYPES:
            spec = self.vars.setdefault(test.args[0].id, {})
            spec["type"] = test.args[1].id
            if msg and not spec.get("hint"):
                spec["hint"] = msg
            return True
        if not (isinstance(test, ast.Compare) and len(test.ops) == 1):
            return False
        op, left, right = test.ops[0], test.left, test.comparators[0]
        if isinstance(op, ast.Is) and isinstance(right, ast.Constant) and right.value in (True, False, None):
            expected = right.value
        elif isinstance(op, ast.Eq):
            ok, expected = literal(right)
            if not ok:
                return False
        else:
            return False
        try:
            expected_json = to_json(expected)
        except ValueError:
            return False
        # var == literal
        if isinstance(left, ast.Name):
            spec = self.vars.setdefault(left.id, {})
            if "expected" in spec:
                return False
            spec["expected"] = expected_json
            if isinstance(op, ast.Is) or isinstance(expected, bool):
                spec.setdefault("type", py_type(expected) or "NoneType")
            if msg:
                spec["hint"] = msg
            return True
        # f(literais) == literal
        if isinstance(left, ast.Call) and isinstance(left.func, ast.Name) and not left.keywords:
            args = []
            for arg in left.args:
                ok, v = literal(arg)
                if not ok:
                    return False
                try:
                    args.append(to_json(v))
                except ValueError:
                    return False
            case = {"id": self.next_id("chamada"), "kind": "call", "function": left.func.id, "args": args, "kwargs": {},
                    "expected": expected_json, "name": ast.get_source_segment(self.src, left)[:150]}
            if isinstance(op, ast.Is) or isinstance(expected, bool):
                case["type"] = py_type(expected) or "NoneType"
            if isinstance(expected, float):
                case["tolerance"] = 1e-6
            if msg:
                case["hint"] = msg
            self.cases.append(case)
            return True
        return False

    def source_rule(self, text, negated, msg):
        name = text[:-1] if text.endswith("(") else None
        if name and name.isidentifier():
            rule = {"type": "not_calls" if negated else "calls", "name": name}
        elif text == "lambda" and not negated:
            rule = {"type": "uses", "construct": "lambda"}
        else:
            return False
        self.cases.append({"id": self.next_id("fonte"), "kind": "source", "rule": rule,
                           "name": ("Não usa %s()" if negated else "Usa %s()") % rule.get("name", "lambda"), **({"hint": msg} if msg else {})})
        return True


def make_stub(source):
    """Esqueleto inicial a partir da solução: imports, assinaturas e `pass`."""
    tree = ast.parse(source)
    lines = []
    for node in tree.body:
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            lines.append(ast.unparse(node))
        elif isinstance(node, ast.FunctionDef):
            lines += ["", "", "def %s(%s):" % (node.name, ast.unparse(node.args)), "    # TODO: implemente", "    pass"]
        elif isinstance(node, ast.ClassDef):
            bases = "(%s)" % ", ".join(ast.unparse(b) for b in node.bases) if node.bases else ""
            lines += ["", "", "class %s%s:" % (node.name, bases)]
            methods = [n for n in node.body if isinstance(n, ast.FunctionDef)]
            if not methods:
                lines.append("    pass")
            for m in methods:
                for d in m.decorator_list:
                    lines.append("    @%s" % ast.unparse(d))
                lines += ["    def %s(%s):" % (m.name, ast.unparse(m.args)), "        # TODO: implemente", "        pass", ""]
    body = "\n".join(lines).strip("\n")
    return ("# Complete o código abaixo.\n\n" + body + "\n") if body else "# Escreva sua solução aqui\n"


def main():
    lessons = []
    stats = {"strong": 0, "legacy": 0}
    legacy = load_lessons()
    for order in sorted(legacy):
        title, sol, tests = legacy[order]
        files = sol if isinstance(sol, list) else [{"path": "main.py", "content": sol.lstrip("\n")}]
        cases = Converter(tests).run()
        kinds = [c["kind"] for c in cases]
        stats["legacy" if "legacy" in kinds else "strong"] += 1
        starter = [{"path": f["path"], "content": make_stub(f["content"]) if f["path"].endswith(".py") and f["content"].strip() else f["content"]} for f in files]
        lessons.append({
            "order": order,
            "title": title,
            "description": "Exercício do curso Python Completo: %s." % title,
            "starter_files": starter,
            "reference_solution": files,
            "test_cases": cases,
        })
        print("%02d %-35s %s" % (order, title, ", ".join("%s:%d" % (k, kinds.count(k)) for k in sorted(set(kinds)))))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as fh:
        json.dump({"course": "Python Completo", "generated_from": "legacy/scripts/verify_lessons.py", "lessons": lessons}, fh, ensure_ascii=False, indent=2)
    print("\n%d lições: %d só com casos fortes, %d com casos legados -> %s" % (len(lessons), stats["strong"], stats["legacy"], os.path.relpath(OUT, ROOT)))


if __name__ == "__main__":
    sys.exit(main())
