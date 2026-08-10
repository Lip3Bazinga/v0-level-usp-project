"""
POST /api/evaluate — Vercel Python Function.
Autentica o aluno via Supabase JWT, busca hidden_tests via service role,
executa código + testes num SUBPROCESSO ISOLADO e retorna só o resultado.

Modelo de isolamento (importante):
  O código do aluno NUNCA roda no processo do handler. Ele roda num
  interpretador novo, iniciado com um env mínimo que não contém nenhuma
  chave do Supabase. Assim, mesmo que o aluno execute código arbitrário,
  não há service role key alcançável na memória daquele processo — nem via
  os.environ, nem via globais de módulo, nem via sys.modules.

  Antes desta versão o exec() acontecia no mesmo processo do handler, e as
  chaves — lidas para globais de módulo no import — continuavam alcançáveis
  mesmo com os.environ limpo. Ver docs/10-auditoria-2026-08-03.md, item 1.

Defesa em profundidade:
  1. Subprocesso com env sem segredos (barreira principal).
  2. Timeout com kill real do processo (o modelo antigo com thread daemon
     devolvia 408 mas deixava o loop infinito queimando CPU).
  3. Redação de segredos em tudo que volta ao cliente, por valor e por
     formato (JWT), caso algum caminho inesperado inclua um segredo.
"""

import json
import os
import re
import sys
import subprocess
import tempfile
import shutil
import urllib.request
from http.server import BaseHTTPRequestHandler

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SECRET_KEY") or os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANON_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")

MAX_BODY_BYTES = 200_000

RATE_LIMIT_MAX = 12        # avaliações permitidas...
RATE_LIMIT_WINDOW_S = 60   # ...por janela de 60s, por usuário


# ── Redação de segredos ───────────────────────────────────────────────────────

_JWT_RE = re.compile(r"eyJ[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}\.[A-Za-z0-9_\-]{8,}")
_SBKEY_RE = re.compile(r"sb_(secret|publishable)_[A-Za-z0-9_\-]{8,}")


def redact(text):
    """Remove segredos conhecidos (por valor) e credenciais por formato.
    Última linha de defesa: nada que volte ao cliente deve conter chave."""
    if not text:
        return text
    out = str(text)
    for secret in (SERVICE_ROLE_KEY, ANON_KEY):
        if secret and len(secret) > 8:
            out = out.replace(secret, "[REDACTED]")
    if SUPABASE_URL:
        out = out.replace(SUPABASE_URL, "[REDACTED]")
    out = _JWT_RE.sub("[REDACTED]", out)
    out = _SBKEY_RE.sub("[REDACTED]", out)
    return out


def redact_result(result):
    result["failureDetails"] = [
        redact(d)[:2000] for d in (result.get("failureDetails") or [])
    ]
    return result


# ── Supabase (só no processo pai — nunca no subprocesso do aluno) ─────────────

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


def check_rate_limit(user_id):
    """Janela deslizante sobre public.rate_limits (service role ignora RLS).
    Fail-open: qualquer erro no rate limit NUNCA bloqueia a avaliação — o custo
    de deixar passar é menor que o de travar todos os alunos."""
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


def _err_result(msg):
    return {"testsRun": 0, "passed": 0, "failures": 0, "errors": 1,
            "allPassed": False, "failureDetails": [msg]}


# ── Runner executado no subprocesso ───────────────────────────────────────────
# Mantido como string e escrito em disco na hora: evita que a Vercel trate o
# arquivo como uma function adicional em api/, e garante que ele acompanhe o
# bundle sem configuração extra.

RUNNER_SOURCE = r'''
import sys, os, io, ast, json, unittest, builtins, contextlib

payload = json.loads(sys.stdin.read())
files = payload["files"]
test_code = payload["test_code"]
result_path = payload["result_path"]
work_dir = payload["work_dir"]


def err_result(msg):
    return {"testsRun": 0, "passed": 0, "failures": 0, "errors": 1,
            "allPassed": False, "failureDetails": [str(msg)]}


def exec_student():
    ns = {"__name__": "__main__"}
    entry_src = None
    for f in files:
        path = f.get("path", "")
        if not path or ".." in path or path.startswith("/"):
            continue
        full = os.path.join(work_dir, path)
        parent = os.path.dirname(full)
        if parent:
            os.makedirs(parent, exist_ok=True)
        with open(full, "w", encoding="utf-8") as fh:
            fh.write(f.get("content", ""))
        if path == "main.py" or entry_src is None:
            entry_src = f.get("content", "")
    if entry_src is None:
        return None, "Nenhum arquivo para executar."

    sys.path.insert(0, work_dir)
    cap = io.StringIO()
    try:
        with contextlib.redirect_stdout(cap), contextlib.redirect_stderr(io.StringIO()):
            exec(compile(entry_src, "main.py", "exec"), ns)
    except Exception as e:
        return None, "%s: %s" % (type(e).__name__, e)
    # Sentinelas disponíveis para os hidden_tests (mesmo contrato do worker Pyodide)
    ns["_stdout"] = cap.getvalue()
    ns["_source"] = entry_src
    return ns, None


def run_unittest(ns):
    ns["AssertionError"] = builtins.AssertionError
    ns["unittest"] = unittest
    ns["__builtins__"] = builtins
    try:
        exec(compile(test_code, "<tests>", "exec"), ns)
    except Exception as e:
        return err_result(e)

    suite = unittest.TestSuite()
    loader = unittest.TestLoader()
    for obj in list(ns.values()):
        try:
            if isinstance(obj, type) and issubclass(obj, unittest.TestCase) and obj is not unittest.TestCase:
                suite.addTests(loader.loadTestsFromTestCase(obj))
        except Exception:
            pass

    buf = io.StringIO()
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        res = unittest.TextTestRunner(stream=buf, verbosity=2).run(suite)

    failures = []
    for t, tb in res.failures + res.errors:
        lines = [l.strip() for l in tb.strip().split("\n") if l.strip()]
        assert_line = next((l for l in reversed(lines) if "Error" in l), None)
        msg = (assert_line or (lines[-1] if lines else str(t)))
        msg = msg.replace("AssertionError: ", "").strip() or "Resposta incorreta."
        test_name = t.id().split(".")[-1] if hasattr(t, "id") else str(t)
        failures.append("%s: %s" % (test_name, msg))

    return {
        "testsRun": res.testsRun,
        "passed": res.testsRun - len(res.failures) - len(res.errors),
        "failures": len(res.failures),
        "errors": len(res.errors),
        "allPassed": res.wasSuccessful(),
        "failureDetails": failures,
    }


def run_assert(ns):
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


try:
    import re as _re
    ns, err = exec_student()
    if err is not None:
        out = err_result(err)
    elif _re.search(r"class\s+\w+\s*\(\s*unittest\.TestCase\s*\)", test_code):
        out = run_unittest(ns)
    else:
        out = run_assert(ns)
except Exception as e:
    out = err_result("Erro interno do avaliador: %s" % type(e).__name__)

# Escrito por último: mesmo que o código do aluno tenha mexido em stdout/stderr
# ou escrito neste caminho, o valor final é sempre o do avaliador.
with open(result_path, "w", encoding="utf-8") as fh:
    json.dump(out, fh)
'''


def evaluate_isolated(files, test_code, timeout_s):
    """Executa num interpretador novo, sem segredos no ambiente.
    Retorna None em caso de timeout (processo é morto de fato)."""
    tmp = tempfile.mkdtemp(prefix="lvlusp_")
    try:
        work_dir = os.path.join(tmp, "project")
        os.makedirs(work_dir, exist_ok=True)
        runner_path = os.path.join(tmp, "runner.py")
        result_path = os.path.join(tmp, "result.json")
        with open(runner_path, "w", encoding="utf-8") as fh:
            fh.write(RUNNER_SOURCE)

        payload = json.dumps({
            "files": files,
            "test_code": test_code,
            "result_path": result_path,
            "work_dir": work_dir,
        })

        # Env mínimo e explícito: nenhuma variável do Supabase é herdada.
        child_env = {
            "PATH": os.environ.get("PATH", "/usr/local/bin:/usr/bin:/bin"),
            "HOME": tmp,
            "TMPDIR": tmp,
            "LANG": "C.UTF-8",
            "PYTHONIOENCODING": "utf-8",
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONNOUSERSITE": "1",
        }

        # -I (isolated): ignora PYTHON*, user site-packages e o cwd em sys.path.
        # Não usamos -S: removeria site-packages e quebraria lições que usam
        # bibliotecas instaladas via requirements.txt.
        proc = subprocess.Popen(
            [sys.executable, "-I", runner_path],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=child_env,
            cwd=work_dir,
        )
        try:
            proc.communicate(input=payload.encode(), timeout=timeout_s)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.communicate()
            return None

        try:
            with open(result_path, "r", encoding="utf-8") as fh:
                data = json.load(fh)
        except Exception:
            return _err_result("Não foi possível avaliar seu código. Tente novamente.")

        if not isinstance(data, dict) or "allPassed" not in data:
            return _err_result("Resposta inválida do avaliador.")
        return data
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


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

        result = evaluate_isolated(files, hidden_tests, timeout_s)
        if result is None:
            return self._json(408, {
                "error": "Tempo limite excedido. Verifique se há loops infinitos no seu código."
            })

        return self._json(200, redact_result(result))
