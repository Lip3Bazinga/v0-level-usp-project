"""
POST /api/evaluate — Vercel Python Function.
Autentica o aluno via Supabase JWT, busca hidden_tests via service role,
executa código + testes no servidor (env limpo, timeout) e retorna só o resultado.
O gabarito nunca sai do backend.
"""

import json
import os
import re
import sys
import io
import ast
import unittest
import builtins
import threading
import tempfile
import contextlib
import urllib.request
from http.server import BaseHTTPRequestHandler

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANON_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

MAX_BODY_BYTES = 200_000


def _supabase_get(path, token):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        headers={
            "apikey": token,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode())


def _supabase_post(path, token, payload):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/rest/v1/{path}",
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "apikey": token,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        },
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status


RATE_LIMIT_MAX = 12        # avaliações permitidas...
RATE_LIMIT_WINDOW_S = 60   # ...por janela de 60s, por usuário


def check_rate_limit(user_id):
    """Janela deslizante sobre public.rate_limits (service role ignora RLS).
    Retorna True se a avaliação pode prosseguir. Fail-open: qualquer erro
    no rate limit (rede, tabela ausente etc.) NUNCA bloqueia a avaliação —
    o custo de deixar passar é menor que o de travar todos os alunos."""
    try:
        import datetime
        since = (
            datetime.datetime.now(datetime.timezone.utc)
            - datetime.timedelta(seconds=RATE_LIMIT_WINDOW_S)
        ).strftime("%Y-%m-%dT%H:%M:%S.%f+00:00")
        path = (
            f"rate_limits?user_id=eq.{user_id}&action=eq.evaluate"
            f"&created_at=gte.{since}&select=id&limit={RATE_LIMIT_MAX + 1}"
        )
        rows = _supabase_get(path, SERVICE_ROLE_KEY)
        if len(rows) >= RATE_LIMIT_MAX:
            return False
        _supabase_post(
            "rate_limits", SERVICE_ROLE_KEY,
            {"user_id": user_id, "action": "evaluate"},
        )
        return True
    except Exception:
        return True  # fail-open (ver docstring)


def get_user_from_token(jwt):
    req = urllib.request.Request(
        f"{SUPABASE_URL}/auth/v1/user",
        headers={"apikey": ANON_KEY, "Authorization": f"Bearer {jwt}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


def fetch_lesson(lesson_id):
    if not re.fullmatch(r"[0-9a-fA-F-]{36}", lesson_id):
        return None
    path = f"lessons?id=eq.{lesson_id}&select=hidden_tests,time_limit,published&limit=1"
    try:
        rows = _supabase_get(path, SERVICE_ROLE_KEY)
        return rows[0] if rows else None
    except Exception:
        return None


@contextlib.contextmanager
def scrubbed_env():
    """Esvazia os env vars durante a execução do código do aluno para impedir
    exfiltração de segredos (service role key etc.)."""
    saved = dict(os.environ)
    try:
        os.environ.clear()
        yield
    finally:
        os.environ.update(saved)


def _exec_student(files):
    """Escreve os arquivos num tempdir, executa main.py e retorna o namespace."""
    ns = {"__name__": "__main__"}
    tmp = tempfile.mkdtemp(prefix="lvlusp_")
    entry_src = None
    for f in files:
        path = f.get("path", "")
        if not path or ".." in path or path.startswith("/"):
            continue
        full = os.path.join(tmp, path)
        os.makedirs(os.path.dirname(full), exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(f.get("content", ""))
        if path == "main.py" or entry_src is None:
            entry_src = f.get("content", "")
    if entry_src is None:
        return None, "Nenhum arquivo para executar."

    sys.path.insert(0, tmp)
    cap = io.StringIO()
    try:
        with contextlib.redirect_stdout(cap), contextlib.redirect_stderr(io.StringIO()):
            exec(compile(entry_src, "main.py", "exec"), ns)
    except Exception as e:
        return None, f"{type(e).__name__}: {e}"
    finally:
        try:
            sys.path.remove(tmp)
        except ValueError:
            pass
    # Sentinelas disponíveis para os hidden_tests (mesmo contrato do worker Pyodide)
    ns["_stdout"] = cap.getvalue()
    ns["_source"] = entry_src
    return ns, None


def _err_result(msg):
    return {"testsRun": 0, "passed": 0, "failures": 0, "errors": 1,
            "allPassed": False, "failureDetails": [msg]}


def run_unittest(ns, test_code):
    ns["AssertionError"] = builtins.AssertionError
    ns["unittest"] = unittest
    ns["__builtins__"] = builtins

    try:
        exec(compile(test_code, "<tests>", "exec"), ns)
    except Exception as e:
        return _err_result(str(e))

    suite = unittest.TestSuite()
    loader = unittest.TestLoader()
    for obj in list(ns.values()):
        try:
            if isinstance(obj, type) and issubclass(obj, unittest.TestCase) and obj is not unittest.TestCase:
                suite.addTests(loader.loadTestsFromTestCase(obj))
        except Exception:
            pass

    buf = io.StringIO()
    res = unittest.TextTestRunner(stream=buf, verbosity=2).run(suite)

    failures = []
    for t, tb in res.failures + res.errors:
        lines = [l.strip() for l in tb.strip().split("\n") if l.strip()]
        assert_line = next((l for l in reversed(lines) if "Error" in l), None)
        msg = (assert_line or (lines[-1] if lines else str(t)))
        msg = msg.replace("AssertionError: ", "").strip() or "Resposta incorreta."
        test_name = t.id().split(".")[-1] if hasattr(t, "id") else str(t)
        failures.append(f"{test_name}: {msg}")

    return {
        "testsRun": res.testsRun,
        "passed": res.testsRun - len(res.failures) - len(res.errors),
        "failures": len(res.failures),
        "errors": len(res.errors),
        "allPassed": res.wasSuccessful(),
        "failureDetails": failures,
    }


def run_assert(ns, test_code):
    ns["AssertionError"] = builtins.AssertionError
    ns["__builtins__"] = builtins

    try:
        expected = sum(1 for n in ast.walk(ast.parse(test_code)) if isinstance(n, ast.Assert))
    except Exception:
        expected = 1
    if expected == 0:
        return {"testsRun": 0, "passed": 0, "failures": 1, "errors": 0,
                "allPassed": False,
                "failureDetails": ["Gabarito sem asserções — contate o professor."]}

    try:
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            exec(compile(test_code, "<tests>", "exec"), ns)
    except AssertionError as ae:
        return {"testsRun": expected, "passed": 0, "failures": 1, "errors": 0,
                "allPassed": False,
                "failureDetails": [str(ae) or "Resposta incorreta. Verifique seu código."]}
    except Exception as ge:
        return {"testsRun": expected, "passed": 0, "failures": 0, "errors": 1,
                "allPassed": False, "failureDetails": [str(ge)]}

    return {"testsRun": expected, "passed": expected, "failures": 0,
            "errors": 0, "allPassed": True, "failureDetails": []}


def evaluate(files, test_code):
    with scrubbed_env():
        ns, err = _exec_student(files)
        if err is not None:
            return _err_result(err)
        is_unittest = bool(re.search(r"class\s+\w+\s*\(\s*unittest\.TestCase\s*\)", test_code))
        return run_unittest(ns, test_code) if is_unittest else run_assert(ns, test_code)


def evaluate_with_timeout(files, test_code, timeout_s):
    result = []

    def _run():
        try:
            result.append(evaluate(files, test_code))
        except Exception as e:
            result.append(_err_result(f"Erro interno do avaliador: {type(e).__name__}"))

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    t.join(timeout=timeout_s)
    if t.is_alive():
        return None
    return result[0] if result else None


class handler(BaseHTTPRequestHandler):
    def _json(self, status, payload):
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        auth_header = self.headers.get("authorization", "")
        if not auth_header.startswith("Bearer "):
            return self._json(401, {"error": "Não autenticado"})

        user = get_user_from_token(auth_header[len("Bearer "):])
        if not user or not user.get("id"):
            return self._json(401, {"error": "Token inválido"})

        try:
            length = int(self.headers.get("content-length", 0))
            if length <= 0 or length > MAX_BODY_BYTES:
                raise ValueError()
            body = json.loads(self.rfile.read(length))
            lesson_id = body.get("lessonId")
            files = body.get("files")
            if isinstance(body.get("code"), str) and not files:
                files = [{"path": "main.py", "content": body["code"]}]
            valid = (
                isinstance(lesson_id, str)
                and isinstance(files, list) and files
                and all(isinstance(f, dict)
                        and isinstance(f.get("path"), str)
                        and isinstance(f.get("content"), str) for f in files)
            )
            if not valid:
                raise ValueError()
        except Exception:
            return self._json(400, {"error": "Parâmetros obrigatórios: lessonId, files"})

        # Rate limit por usuário ANTES de tocar na lição/execução (parte cara).
        if not check_rate_limit(user["id"]):
            return self._json(429, {"error": "Muitas verificações seguidas. Aguarde um instante."})

        lesson = fetch_lesson(lesson_id)
        if not lesson or not lesson.get("published"):
            return self._json(404, {"error": "Lição não encontrada"})
        hidden_tests = (lesson.get("hidden_tests") or "").strip()
        if not hidden_tests:
            return self._json(404, {"error": "Lição não possui testes"})

        time_limit = lesson.get("time_limit") or 10
        timeout_s = min(max(float(time_limit), 5.0), 25.0)

        result = evaluate_with_timeout(files, hidden_tests, timeout_s)
        if result is None:
            return self._json(408, {
                "error": "Tempo limite excedido. Verifique se há loops infinitos no seu código."
            })

        return self._json(200, result)
