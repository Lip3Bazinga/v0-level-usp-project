# Paridade do Python: "Executar" × "Verificar"

O botão **Executar** roda o código no navegador (Pyodide, em Web Worker); o
**Verificar** roda no executor oficial (CPython WASI no Wasmtime, `apps/runner`),
que é quem dá o veredito. Se os dois se comportam diferente, o aluno vê o código
funcionar no Executar e reprovar no Verificar (UX-29). Desde 03/11/2026 os dois
usam **Python 3.14** e a paridade é provada por um teste diferencial.

## Versões

| | Executar (navegador) | Verificar (servidor) |
|---|---|---|
| Runtime | Pyodide **314.0.7** (pacote npm fixado em `apps/web/package.json`) | CPython WASI (`apps/runner/scripts/fetch-python-wasi.sh`) |
| Python | 3.14.2 | 3.14.0 |
| Onde roda o projeto | `/work`, entrada compilada como `main.py`, `__name__ == "__main__"` | idem (`apps/runner/python/harness.py`, sonda `run`) |

No esquema novo de versões do Pyodide, `314.x` significa Python 3.14.

## De onde vem o runtime do navegador

- **Núcleo** (`pyodide.mjs`, `pyodide.asm.mjs`, `pyodide.asm.wasm`,
  `python_stdlib.zip`, `pyodide-lock.json`): servido pelo próprio front em
  `/pyodide/v314.0.7/`. O `apps/web/scripts/copy-pyodide.mts` copia os arquivos
  do pacote npm para `apps/web/public/pyodide/` antes do `next dev`/`next build`,
  conferindo o SHA-256 de cada um contra `src/lib/python/pyodide-runtime.json`
  (o pnpm já confere o SHA-512 do tarball contra o `pnpm-lock.yaml`). A pasta é
  gerada, não versionada (`.gitignore`): são ~13 MB de binários reproduzíveis a
  partir da versão fixada.
- **Por quê**: o "Executar" deixa de depender de um CDN de terceiros (redes de
  escola com filtro, indisponibilidade do jsDelivr) e a CSP deixa de liberar
  scripts de outra origem: `script-src` só tem `'self'`. Cache de 1 ano
  (`immutable`), porque o caminho já carrega a versão.
- **Pacotes extras das lições** (numpy, matplotlib, pandas…): não vêm no pacote
  npm. São baixados do CDN oficial **na mesma versão**
  (`https://cdn.jsdelivr.net/pyodide/v314.0.7/full/`), só via `fetch`
  (`connect-src`). Para um espelho próprio, defina
  `NEXT_PUBLIC_PYODIDE_PACKAGE_BASE_URL` no build; a CSP acompanha. O
  `NEXT_PUBLIC_PYODIDE_INDEX_URL` continua existindo para apontar o núcleo para
  outro lugar (vazio = cópia local).
- Pacotes fora do `pyodide-lock.json` caem no `micropip` (PyPI). A CSP não
  libera `pypi.org`/`files.pythonhosted.org`, então eles não instalam em produção
  (mesma situação da versão anterior); prefira pacotes do lock.

Para atualizar o Pyodide: troque a versão exata no `package.json`, rode
`pnpm --filter @levelusp/web pyodide:copy --write-manifest`, revise o diff do
manifesto e rode o teste de paridade.

## Como o teste funciona

`pnpm --filter @levelusp/web test:paridade` (`apps/web/scripts/python-parity.mts`):

1. Carrega o Pyodide do pacote npm no Node e o **mesmo harness** do Web Worker
   (`src/lib/python/project-execution.ts`).
2. Para cada lição de `packages/db/seed/python-completo.json`, roda a solução de
   referência e o esqueleto inicial: execução simples do `main.py` e uma vez por
   entrada (`stdin`) de caso `io`.
3. Roda os mesmos projetos no executor real (`POST /v1/run`, sonda `run`).
4. Compara stdout, stderr e o erro no formato `Tipo: mensagem`; depois roda
   casos de borda que caracterizam o runtime (módulos, `input()`, `exit()`,
   mensagens de erro do 3.14, versão).
5. Falha se a versão major.minor diferir ou se surgir divergência fora da lista
   `EXPECTED_DIVERGENCES`. Leva ~15 s; roda no CI no job `sandbox`, que publica
   o relatório como artefato.

```bash
RUNNER_URL=http://localhost:8081 RUNNER_TOKEN=... pnpm --filter @levelusp/web test:paridade
PARITY_REPORT=paridade.md ...   # grava o relatório (como o do fim desta página)
```

## O que foi corrigido para chegar à paridade

| Diferença encontrada | Correção (no navegador) |
|---|---|
| Python 3.11 × 3.14 (f-string aninhada da PEP 701 era `SyntaxError` só no Executar) | Pyodide 0.25.1 → 314.0.7 |
| `__name__` não era `"__main__"` no navegador: `if __name__ == "__main__":` não rodava | Namespace igual ao do executor |
| O erro chegava sem o tipo (`name 'x' is not defined`), então a tradução pt-BR quase nunca casava | Resumo `Tipo: mensagem` + traceback só com os quadros do aluno |
| `SystemExit` derrubava a execução; `sys.exit(0)` virava erro | Mesma regra do executor: código 0/`None` é sucesso |
| `exit()`/`quit()` funcionavam no Executar e davam `NameError` no Verificar (o executor roda `python -I -S`, sem o módulo `site`) | Removidos também no navegador, com explicação em pt-BR sugerindo `sys.exit()` |
| Projeto em `/home/pyodide/project` com `__init__.py` criados implicitamente | Projeto em `/work`, como no executor; pastas sem `__init__.py` funcionam nos dois (namespace packages) |
| Qualquer escrita em `stderr` contava como erro no Executar | stderr aparece como aviso; só exceção reprova, como no Verificar |
| Mensagens do 3.14 sem tradução (`expected ':'`, `unterminated string literal`, `'(' was never closed`, `ModuleNotFoundError`, `EOFError` do `input()`, `Classe.__init__() takes…`) | Padrões novos em `parse-python-error.ts`, testados com tracebacks reais do 3.14 |

## Divergências que permanecem

| Caso | Executar | Verificar | Por que fica assim |
|---|---|---|---|
| Versão de patch | 3.14.2 | 3.14.0 | Atualizar o CPython WASI do executor para 3.14.2 resolve; nenhuma lição depende disso. |
| `import sqlite3` | funciona | `ModuleNotFoundError: _sqlite3` | A build WASI não tem SQLite. Nenhuma lição usa; uma lição com banco não passaria no Verificar. |
| `zoneinfo` | erro (sem tzdata) | erro (sem tzdata) | Os dois falham; só o texto difere (o Pyodide sugere `loadPackage('tzdata')`). |
| `subprocess` | `OSError` errno 138 | `OSError` errno 58 | Nenhum dos dois cria processos; só o errno/mensagem difere. |
| Pacotes extras (numpy, matplotlib…) | instaláveis por lição | inexistentes | O executor não tem pacotes de terceiros (ver `arquitetura.md`). Casos de teste não podem importá-los. |
| `input()` interativo | sem teclado: `input()` lê uma entrada vazia (`EOFError`), igual ao Verificar sem `stdin` | `stdin` do caso `io` | Dívida técnica: campo de entrada na IDE. |
| Tempo limite | 10 s de relógio (o worker é morto) | combustível + 10 s | Perto do limite, um laço pode estourar em um e não no outro. |
| Estado entre execuções | o interpretador é reaproveitado (módulos da stdlib já importados, `random` sem semente continua de onde parou) | processo novo por correção | Módulos do próprio projeto são recarregados a cada execução; "Parar" reinicia o worker e zera tudo. |
| Rede | sem sockets; HTTP só via `pyodide.http`, limitado pela CSP (`connect-src`) | sem rede | Fora do teste automático: no Node o Pyodide tem sockets, então o resultado não representaria o navegador. |

## Resultado de 03/11/2026

- Navegador: Pyodide (Python 3.14.2), harness `src/lib/python/project-execution.ts`
- Servidor: executor oficial (Python 3.14.0 (WASI)), sonda `run`
- Comparados: stdout, stderr e erro (`Tipo: mensagem`). Divergências inesperadas: **0**

### Lições do seed (`python-completo`)

| Lição | Variante | stdin | Resultado no navegador | Paridade |
|---|---|---|---|---|
| 02 Variáveis, Tipos e print() | solução | `""` | ok | igual |
| 02 Variáveis, Tipos e print() | esqueleto | `""` | ok | igual |
| 03 Operadores e Expressões | solução | `""` | ok | igual |
| 03 Operadores e Expressões | esqueleto | `""` | ok | igual |
| 04 Condicionais | solução | `""` | ok | igual |
| 04 Condicionais | esqueleto | `""` | ok | igual |
| 05 Laços | solução | `""` | ok | igual |
| 05 Laços | esqueleto | `""` | ok | igual |
| 06 Funções | solução | `""` | ok | igual |
| 06 Funções | esqueleto | `""` | ok | igual |
| 07 Listas e Strings | solução | `""` | ok | igual |
| 07 Listas e Strings | esqueleto | `""` | ok | igual |
| 08 Dicionários, Tuplas e Conjuntos | solução | `""` | ok | igual |
| 08 Dicionários, Tuplas e Conjuntos | esqueleto | `""` | ok | igual |
| 09 Arquivos | solução | `""` | ok | igual |
| 09 Arquivos | esqueleto | `""` | ok | igual |
| 10 Classes e Objetos | solução | `""` | ok | igual |
| 10 Classes e Objetos | esqueleto | `""` | ok | igual |
| 11 Herança e Polimorfismo | solução | `""` | ok | igual |
| 11 Herança e Polimorfismo | esqueleto | `""` | ok | igual |
| 12 Encapsulamento e Properties | solução | `""` | ok | igual |
| 12 Encapsulamento e Properties | esqueleto | `""` | ok | igual |
| 13 Métodos Dunder | solução | `""` | ok | igual |
| 13 Métodos Dunder | esqueleto | `""` | ok | igual |
| 14 Exceções: try/except | solução | `""` | ok | igual |
| 14 Exceções: try/except | esqueleto | `""` | ok | igual |
| 15 Exceções Customizadas | solução | `""` | ok | igual |
| 15 Exceções Customizadas | esqueleto | `""` | ok | igual |
| 16 Context Managers | solução | `""` | ok | igual |
| 16 Context Managers | esqueleto | `""` | ok | igual |
| 17 Comprehensions | solução | `""` | ok | igual |
| 17 Comprehensions | esqueleto | `""` | ok | igual |
| 18 Lambda, map, filter | solução | `""` | ok | igual |
| 18 Lambda, map, filter | esqueleto | `""` | ok | igual |
| 19 Decorators | solução | `""` | ok | igual |
| 19 Decorators | esqueleto | `""` | ok | igual |
| 20 Generators | solução | `""` | ok | igual |
| 20 Generators | esqueleto | `""` | ok | igual |
| 21 Módulos e Pacotes | solução | `""` | ok | igual |
| 21 Módulos e Pacotes | esqueleto | `""` | ok | igual |
| 22 unittest | solução | `""` | ok | igual |
| 22 unittest | esqueleto | `""` | ok | igual |
| 24 Projeto Final | solução | `""` | ok | igual |
| 24 Projeto Final | esqueleto | `""` | ok | igual |

### Casos de borda

| Caso | Navegador | Servidor | Paridade | Motivo |
|---|---|---|---|---|
| f-string aninhada (PEP 701, UX-29) | `a1⏎` | `a1⏎` | igual |  |
| __name__ == '__main__' | `principal⏎` | `principal⏎` | igual |  |
| input() com entrada | `Nome: Olá, Ana!⏎` | `Nome: Olá, Ana!⏎` | igual |  |
| input() sem entrada | `EOFError: EOF when reading a line` | `EOFError: EOF when reading a line` | igual |  |
| exit() (builtin do módulo site) | `NameError: name 'exit' is not defined` | `NameError: name 'exit' is not defined` | igual |  |
| sys.exit(0) | `fim⏎` | `fim⏎` | igual |  |
| sys.exit(3) | `SystemExit: 3` | `SystemExit: 3` | igual |  |
| SyntaxError sem dois-pontos | `SyntaxError: expected ':' (main.py, line 1)` | `SyntaxError: expected ':' (main.py, line 1)` | igual |  |
| SyntaxError string aberta | `SyntaxError: unterminated string literal (detected at line 1) (main...` | `SyntaxError: unterminated string literal (detected at line 1) (main...` | igual |  |
| IndentationError | `IndentationError: expected an indented block after 'if' statement o...` | `IndentationError: expected an indented block after 'if' statement o...` | igual |  |
| NameError com sugestão | `NameError: name 'pritn' is not defined` | `NameError: name 'pritn' is not defined` | igual |  |
| ZeroDivisionError | `ZeroDivisionError: division by zero` | `ZeroDivisionError: division by zero` | igual |  |
| RecursionError | `RecursionError: maximum recursion depth exceeded` | `RecursionError: maximum recursion depth exceeded` | igual |  |
| limite de conversão int→str | `ValueError: Exceeds the limit (4300 digits) for integer string conv...` | `ValueError: Exceeds the limit (4300 digits) for integer string conv...` | igual |  |
| repr de float e round | `0.30000000000000004 2.67 1e+16 1.4142135623730951⏎` | `0.30000000000000004 2.67 1e+16 1.4142135623730951⏎` | igual |  |
| print em sys.stderr | `saída⏎aviso⏎` | `saída⏎aviso⏎` | igual |  |
| versão major.minor | `(3, 14)⏎` | `(3, 14)⏎` | igual |  |
| versão de patch | `3.14.2⏎` | `3.14.0⏎` | diverge (documentado) | patch do CPython: Pyodide 314.0.7 embute 3.14.2; o executor WASI usa 3.14.0 |
| __file__, cwd e arquivo gravado | `/work/main.py /work⏎ok ['dados.txt', 'main.py']⏎` | `/work/main.py /work⏎ok ['dados.txt', 'main.py']⏎` | igual |  |
| módulos da biblioteca padrão usados nas lições | `ok⏎` | `ok⏎` | igual |  |
| random com semente | `82 0.11133106816568039⏎` | `82 0.11133106816568039⏎` | igual |  |
| import sqlite3 | `(1,)⏎` | `ModuleNotFoundError: No module named '_sqlite3'` | diverge (documentado) | o CPython WASI do executor não tem o módulo _sqlite3 |
| zoneinfo (fusos horários) | `ZoneInfoNotFoundError: "No time zone found with key America/Sao_Pau...` | `ZoneInfoNotFoundError: 'No time zone found with key America/Sao_Paulo'` | diverge (documentado) | nenhum dos dois tem a base de fusos (tzdata); só a mensagem difere |
| threading.Thread | `RuntimeError: can't start new thread` | `RuntimeError: can't start new thread` | igual |  |
| subprocess | `OSError: [Errno 138] emscripten does not support processes.` | `OSError: [Errno 58] wasi does not support processes.` | diverge (documentado) | nenhum dos dois cria processos; só o errno e a mensagem diferem |
| import numpy (pacote extra) | `ModuleNotFoundError: No module named 'numpy'` | `ModuleNotFoundError: No module named 'numpy'` | igual |  |
| sys.getrecursionlimit() | `1000⏎` | `1000⏎` | igual |  |
| time.sleep | `acordou⏎` | `acordou⏎` | igual |  |
| import de pacote do projeto (sem __init__.py) | `OI!⏎` | `OI!⏎` | igual |  |
