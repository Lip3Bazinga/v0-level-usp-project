"""Partida de um contêiner do motor python-completo (CPython nativo em gVisor).

O executor sobe o contêiner ANTES de existir um lote (pool aquecido) com
`python -I -B -c <este arquivo> <marcador> <módulos a pré-importar...>`.
Este código:

  1. importa os módulos pesados pedidos (numpy, pandas...), para o lote não
     pagar esse tempo;
  2. escreve o marcador na saída padrão: o contêiner está pronto;
  3. espera o cabeçalho do lote na entrada padrão — `<n>\\n` seguido de n bytes
     de JSON com os arquivos do projeto e o código do harness — e grava os
     arquivos em /work (o único lugar gravável, um tmpfs);
  4. executa o MESMO `harness.py` dos outros motores, que lê o resto da entrada
     padrão (nonce + sondas) até o fim e emite as observações.

Nada aqui recebe gabarito: só entram arquivos do aluno, o harness e as sondas.
A leitura usa `os.read` direto no descritor 0, sem buffer, para não consumir
bytes que pertencem ao harness. Entrada fechada antes do cabeçalho (contêiner
do pool descartado) encerra sem erro.
"""


def _boot():
    import json
    import os
    import sys

    read, write = os.read, os.write
    project_dir = "/work"
    max_header_digits = 12
    marker = sys.argv[1]
    for name in sys.argv[2:]:
        try:
            __import__(name)
        except BaseException:  # noqa: BLE001 - imagem enxuta (sem a biblioteca): segue sem pré-importar
            pass
    sys.argv[:] = [""]
    write(1, (marker + "\n").encode("ascii"))

    digits = b""
    while True:
        byte = read(0, 1)
        if not byte:
            raise SystemExit(0)
        if byte == b"\n":
            break
        digits += byte
        if len(digits) > max_header_digits or not byte.isdigit():
            raise SystemExit(2)
    remaining = int(digits)
    chunks = []
    while remaining > 0:
        chunk = read(0, min(remaining, 1 << 16))
        if not chunk:
            raise SystemExit(2)
        chunks.append(chunk)
        remaining -= len(chunk)
    header = json.loads(b"".join(chunks).decode("utf-8"))

    for project_file in header["files"]:
        target = os.path.normpath(os.path.join(project_dir, project_file["path"]))
        if not target.startswith(project_dir + "/"):
            raise SystemExit(2)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        with open(target, "w", encoding="utf-8", newline="") as handle:
            handle.write(project_file["content"])
    os.chdir(project_dir)
    return compile(header["harness"], "/harness/harness.py", "exec")


_harness = _boot()
del _boot
exec(globals().pop("_harness"), {"__name__": "__main__", "__builtins__": __builtins__})  # noqa: S102
