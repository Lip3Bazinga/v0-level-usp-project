# Motor de correção

## Fluxo

```mermaid
sequenceDiagram
  participant A as Aluno (navegador)
  participant API as API (GradingService)
  participant R as Executor (WASI)
  A->>API: POST /lessons/:id/submissions {files}
  API->>API: carrega test_cases (só no servidor)
  API->>API: buildProbes(cases) — sondas SEM valores esperados
  API->>R: POST /v1/run {files, probes, limites}
  R->>R: 1 instância WASI por lote; lote entra pelo stdin com nonce e ids posicionais
  R-->>API: observações (linhas com nonce aleatório na saída padrão)
  API->>API: grade(cases, observações) — comparação local
  API->>API: se aprovado: GamificationService.completeLesson (transação)
  API-->>A: SubmissionResult (casos, XP, badges, nível)
```

## Casos de teste (`packages/contracts/src/grading.ts`)

| Caso | O professor informa | O sandbox recebe (sonda) | A API compara |
|---|---|---|---|
| `call` | função, args/kwargs, retorno esperado, tipo, tolerância | função + args | valor serializado e tipo |
| `io` | stdin, saída esperada, modo (`trimmed`, `exact`, `contains`, `regex`) | stdin | stdout capturado |
| `variable` | variável, valor esperado, tipo | nomes das variáveis | valores e tipos |
| `source` | regra de estrutura (abaixo) | nada (só a análise de AST) | construções encontradas |
| `expr` | `setup` (comandos), `expr` (expressão), `stdin`; e **um** de: `expected`/`type`/`tolerance`, `raises`/`message_contains`; e opcionalmente `expected_stdout` + `match` | `setup`, `expr`, `stdin` | valor e tipo **ou** exceção (tipo, hierarquia, mensagem) **e** saída impressa |
| `unittest` | `expect` (`pass`/`fail`), `target` + `implementation` (opcionais), `test_class`, `min_tests` | `target`, `implementation`, `test_class` | contagens: rodados, falhas, erros |
| `legacy` | código assert/unittest antigo | o código inteiro (com os valores esperados) | resultado pronto do sandbox — correção **fraca** |

### `__name__` do código do aluno

| Sonda (caso) | `__name__` | Bloco `if __name__ == "__main__":` |
|---|---|---|
| `run` (`io`), `legacy` | `"__main__"` (programa, como o Executar do navegador) | roda |
| `call`, `globals` (`variable`), `expr`, `unittest` | `"main"` (biblioteca, como `import main`) | não roda |
| `ast` (`source`) | — (o código não é executado) | — |

Nos casos de biblioteca a demonstração ou o treino do bloco `__main__` não é pago a cada
caso, e o que só existe dentro dele não é visível (verifique com `io`). Nos dois modos
`sys.modules["__main__"]` é o módulo do aluno (nunca o do harness); no modo biblioteca
`sys.modules["main"]` também, então `import main` não reexecuta o arquivo. Vale para os dois
motores (o harness é o mesmo). Testes: `sandbox.test.ts` ("__name__ do aluno por tipo de
sonda") e `pyodide-engine.test.ts`.

### `expr` — classes, exceções, arquivos, generators, decorators, pacotes

O harness executa o `main.py` (como o módulo `main`), depois a preparação e, por fim,
avalia a expressão no mesmo namespace. A observação é o valor serializado e o
tipo, **ou** a exceção levantada pela preparação/expressão (`type`, `mro`,
`message`, `stage`), mais o que foi impresso nessa etapa. Exemplos do seed:

| Lição | Preparação | Expressão | Esperado |
|---|---|---|---|
| Encapsulamento | `c = ContaBancaria("Ana", 100)` | `c.sacar(999)` | `raises: ValueError`, `message_contains: insuficiente` |
| Encapsulamento | `c = ContaBancaria("Ana", 100)` | `setattr(c, "saldo", 99999)` | `raises: AttributeError` (property sem setter) |
| Context managers | `with Sessao("db") as s: ...` | `s.eventos` | `["abriu: db", "consulta executada", "fechou: db"]` |
| Generators | — | `pares_ate(4)` | `type: generator` |
| Arquivos | `salvar_lista("teste_d.txt", ["x", "y"])` | `open("teste_d.txt").read().splitlines()` | `["x", "y"]` (o arquivo gravado) |
| Módulos | `from utils.texto import gritar` | `gritar("oi")` | `"OI!"` |

Tipos: o executor só escreve um nome puro (`int`, `generator`, `ValueError`)
quando o tipo **é** o objeto embutido (checagem por identidade); classes do
aluno chegam como `modulo.Classe` (`main.Tarefa`). `type`/`raises` com nome
embutido exigem o embutido; com outro nome, casam pela classe do aluno
(`raises: "NomeCurtoError"`). `raises` aceita subclasses (como `except`).

Valores: só tipos embutidos são convertidos para JSON (`int`, `float`, `str`,
`bool`, `None`, listas, tuplas, conjuntos ordenados, dicionários; subclasses
pelos métodos C da classe base, sem chamar `__iter__`/`__eq__` do aluno). Os
demais objetos viram `{"$repr": ...}`. Limites: 10 000 nós, profundidade 20,
64 000 caracteres (ciclos e listas enormes são truncados, `truncated: true`).
Tuplas viram listas: para exigir tupla, use `type: "tuple"`.

### `unittest` — corrigir os testes que o aluno escreveu

O main.py é carregado como módulo `main` (um `if __name__ == "__main__":
unittest.main()` não dispara). Se o caso traz `implementation`, ela é executada
num namespace próprio e o nome `target` do aluno é **substituído** por ela; as
classes `TestCase` do aluno (ou só `test_class`) rodam e o executor devolve só
`{run, failures, errors, skipped, failed[]}`. A API decide:

- `expect: "pass"`: nenhuma falha/erro e ao menos 1 teste **não pulado**
  (`run - skipped >= min_tests`);
- `expect: "fail"`: ao menos uma falha ou erro (a suíte "matou" o mutante).

A lição 22 usa: a referência deve passar (mínimo 4 testes), a própria
implementação do aluno deve passar, e cinco mutantes devem ser reprovados
(aceita tudo, recusa tudo, ignora o dígito, ignora o tamanho, não levanta
`TypeError`). Cada sonda `unittest` roda numa instância própria, então a suíte
não consegue carregar estado de uma implementação para a outra.

Contra a implementação do professor (`implementation` presente):

- ela é executada **antes** do código do aluno (um audit hook do aluno não vê o
  `compile`/`exec` dela) e os módulos que ela importou saem de `sys.modules`;
- uma **função** chega à suíte dentro de um invólucro em C
  (`functools._lru_cache_wrapper` sem cache e sem `__wrapped__`): a suíte chama
  a implementação, mas não lê `__code__`, docstring, `__globals__`, fecho,
  defaults nem as linhas do traceback (as exceções saem sem os frames da
  implementação). Há ruído aleatório no alocador, então `id()` e
  `sys.getallocatedblocks()` não identificam a implementação;
- a suíte roda **duas vezes**, em instâncias separadas (`unittest:<id>` e
  `unittest:<id>:repeticao`); resultados diferentes reprovam o caso ("testes não
  determinísticos"). Uma suíte que "chuta" passa com chance 2^-2k por envio
  (k = casos com implementação; lição 22: 2^-12), e não 2^-k.

### Regras de estrutura (`source`)

`uses`/`not_uses` (construções, inclusive `yield`; com `function` opcional a
regra vale só no corpo daquela função), `calls`/`not_calls`, `defines_function`,
`defines_class`, `imports`, `decorator` (`@property`, `@functools.wraps(f)` →
`wraps`) e `catches` (`except ValueError`, `except (A, B)`). A análise roda numa
instância em que o código do aluno não executa.

As regras são **sintáticas**. Para que as negativas não se contornem:

- `not_calls X` falha se `X` for **citado** em qualquer lugar (`maior = max`,
  `junta = lista.append`), não só chamado;
- `not_calls`/`not_uses` falham se o código usar busca ou execução dinâmica
  (`eval`, `exec`, `compile`, `__import__`, `importlib`, `getattr`, `setattr`,
  `vars`, `globals`, `locals`, `__builtins__`, `builtins`, `__dict__`,
  `operator.attrgetter/methodcaller`...): a AST não vê o que
  `getattr(builtins, "m" + "ax")` ou `exec("for ...")` executam.

As positivas (`uses`, `calls`, `decorator`...) aceitam código morto
(`if False: for ...`): use-as junto com casos de comportamento.

## Sondas (`packages/contracts/src/runner.ts`)

| Sonda | O que o harness faz | Instância |
|---|---|---|
| `run` | executa `main.py` com stdin, captura stdout/stderr | compartilhada |
| `call` | executa `main.py`, chama a função, serializa retorno + tipo | compartilhada |
| `globals` | executa `main.py` e lê variáveis globais | compartilhada |
| `expr` | executa `main.py`, a preparação e a expressão; serializa valor/tipo ou exceção | compartilhada |
| `ast` | **não executa** o código; extrai construções, chamadas, decorators, `except`, construções por função | própria (uma para todas as `ast` do job) |
| `unittest` | substitui `target`, roda a suíte do aluno, conta resultados | própria, **modo estrito** |
| `legacy` | roda asserts/unittest antigos no namespace do aluno | própria (lote), **modo estrito** |

Entre sondas da mesma instância o harness restaura `sys.modules`, `sys.path`,
os builtins, os ganchos de `sys`, o limite de recursão, o diretório atual e os
arquivos do projeto (arquivos criados são apagados, alterados são regravados).
O **conteúdo** de módulos já importados não é restaurado (um `json.marca = 1`
persiste); como o `main.py` roda de novo antes de cada sonda, isso não dá ao
aluno nada além do que ele já faz em cada sonda.

## Segurança da correção

**Princípio:** os valores esperados nunca entram no sandbox. O executor recebe
entradas (args, stdin, preparação e expressão do professor, implementações de
referência/mutantes) e devolve observações; quem compara é a API.

**Entrega do lote:** o JSON com nonce e sondas entra pelo **stdin**, que o
harness lê até o fim antes de rodar o código do aluno — não há `probes.json`
em disco nem nonce em `sys.argv`/`sys.orig_argv`. As sondas viajam com ids
posicionais (`p0`, `p1`...), sem o id do caso. Uma segunda observação com o
mesmo id invalida a sonda (só quem descobriu o nonce conseguiria emiti-la).

**Isolamento do harness:** todo o estado (nonce, sondas, escritor) vive no
fecho de `_run_harness`; o aluno recebe o próprio módulo como `__main__`.
Builtins, `os.write`, `StringIO` e o codificador JSON (`_json`) são capturados
antes do código do aluno, então trocar `builtins.len`, `json.dumps`,
`sys.stdout` ou `os.write` não altera o que o harness emite.

**Modo estrito** (instâncias com `legacy`/`unittest`): um audit hook bloqueia
`sys._getframe`, `tb_frame`/`gi_frame`/`cr_frame`/`ag_frame`,
`gc.get_objects/get_referrers/get_referents`, `sys.settrace/setprofile`,
`sys.monitoring.register_callback`, `sys._current_frames/_current_exceptions` e
os módulos de teste da C-API (`_testcapi`, `_testinternalcapi`,
`_testlimitedcapi`... inclusive via `_imp.create_builtin`, cujo original só
existe no fecho do hook). Efeito colateral: nessas lições `logging`,
`inspect.stack()` e `traceback` com frames não funcionam no código do aluno; as
falhas do unittest são formatadas como `Tipo: mensagem`, sem traceback.
`apps/runner/test/sandbox.test.ts` prova que um aluno não forja uma observação
`legacy` pelos caminhos óbvios (arquivo de sondas, argv, stdin, `__main__`,
`sys.modules`, frames, traceback, gc, trace, `_testcapi`, `create_builtin`,
monkeypatch de `json`/`os.write`/builtins). Também ficam fechados, sem evento
de auditoria próprio, os dois caminhos até um frame achados na revisão de
03/11/2026: `gc.DEBUG_SAVEALL` (ciclos com frames iam para `gc.garbage`) e
handlers de sinal (recebem o frame corrente) — `gc.set_debug` e
`_signal.signal` são trocados por versões que recusam e não guardam a
original, e recriar `gc`/`_signal` por `create_builtin` é recusado. `__code__`,
`gi_code`, `cr_code` e `ag_code` também são bloqueados.
O catálogo completo de rotas tentadas está em
`apps/runner/test/attacks/strict-mode.attack.ts` (inclui uma varredura de tudo
o que é alcançável por atributos a partir de `sys.modules`, builtins e de todas
as classes vivas, sem achar o nonce).

**Comparação na API:** a saída do aluno (até 64 000 caracteres por campo) é
normalizada em tempo linear; a regex do professor (`match: "regex"`) roda num
contexto `vm` com teto de 50 ms por comparação e 250 ms por correção (estourou =
não casou), e no cadastro precisa compilar, ter até 1 000 caracteres e não ter
quantificador aninhado (`(a+)+`). `jsonEquals` só lê chaves próprias
(`__proto__`/`constructor` não vêm do protótipo), limita a profundidade a 128 e
aplica tolerância a floats acima de 2^53. `\u0000` vindo do aluno é trocado por
`U+FFFD` nas mensagens (o `jsonb` recusaria a submissão inteira).

### Garantias por tipo de caso (precisas)

O código do aluno divide o interpretador com a preparação do professor e com o
harness. Ele pode alterar o que é **observado**; não vê o valor esperado nem a
comparação, que acontece na API. Em cada tipo de caso:

- **`call`, `io`, `variable`, `expr`** (instância compartilhada, **sem** modo
  estrito): o aluno controla a observação por completo — objetos hostis,
  builtins e módulos da stdlib trocados (inclusive os que a preparação/expressão
  do professor usa) e, por introspecção, até o nonce (frames são livres aqui;
  `forgery.attack.ts` mostra isso). **Garantia:** a aprovação de um caso exige
  que a observação seja **igual ao valor esperado**, que nunca entra no
  sandbox; o valor é serializado só a partir de tipos embutidos (`type()` e
  métodos C da classe base, nunca `__eq__`/`__iter__`/`__repr__` do aluno, salvo
  em `{"$repr"}`), e tipos embutidos são identificados por identidade
  (`ValueError` do aluno é `main.ValueError`). Portanto: forjar = conhecer a
  resposta. Consequências que o professor precisa conhecer:
  - comparações feitas **dentro** da expressão (`f(5) == 120`, `isinstance(x, C)`,
    `issubclass(E, Exception)`, `bool(a == b)` com `expected: true`) são
    decididas pelo aluno (`__eq__`, builtins trocados): a resposta `True` está no
    próprio enunciado. Prefira `expected` rico (`f(5)` → `120`);
  - expectativas booleanas ou pequenas são "chutáveis" caso a caso; o teste
    `grading-forgery.e2e.ts` garante que **nenhuma lição do seed** é aprovada por
    três forjadores universais (objeto igual a tudo + builtins trocados; exceção
    de todos os tipos; `None`);
  - `io` com `contains`/`regex`: imprimir todas as respostas possíveis passa
    (`print(*range(101))` contém "42"); use `trimmed`/`exact` quando o espaço de
    respostas for pequeno;
  - texto é comparado sem normalização Unicode (NFC ≠ NFD) e `trimmed` só tira
    espaço à direita de cada linha e linhas vazias nas pontas; `int` × `float`
    só se distingue com `type`; inteiros acima de 2^53 chegam como `{"$int"}`.
- **`source`**: a análise roda numa instância em que o código do aluno não
  executa — não é forjável por execução. **Garantia:** reflete a sintaxe do
  projeto; regras negativas falham com apelidos e com código dinâmico; regras
  positivas aceitam código morto.
- **`unittest`** (instância própria, modo estrito, duas execuções por
  implementação do professor): **garantia:** o aluno não alcança o nonce nem as
  sondas (catálogo de rotas fechado e varredura de alcançabilidade), não lê a
  implementação **função** do professor (invólucro opaco) nem a identifica pelo
  alocador. Logo a suíte só separa referência de mutante pelo **comportamento**.
  Limites: (a) comparar o alvo com uma implementação própria correta (teste
  diferencial) é comportamento e passa; (b) `target` que é **classe** não é
  embrulhado (métodos e `vars()` ficam visíveis — prefira funções); (c)
  importações feitas pela implementação durante a chamada e o tempo de execução
  são observáveis; (d) `min_tests` conta testes não pulados, inclusive vazios —
  quem garante qualidade são os mutantes; (e) uma suíte aleatória passa com
  chance 2^-2k por envio; (f) o modo estrito depende de uma lista de bloqueio
  do CPython 3.14: um novo caminho de introspecção numa versão futura precisa
  entrar no catálogo.
- **`legacy`**: continua **fraco**. Os asserts rodam no namespace do aluno com
  os valores esperados; `__eq__` trapaceiro ou monkeypatch do `unittest`
  aprovam. A API marca a correção como `strength: "legacy"` e o editor avisa.
  O curso Python Completo não tem mais casos legados.

## Limites por execução

| Recurso | Limite | Mecanismo |
|---|---|---|
| Tempo de parede | 10 s (2–25 s configurável) | `-W timeout` do Wasmtime + kill do processo pelo host |
| CPU | 1,5×10¹⁰ unidades de fuel por segundo de orçamento | `-W fuel` |
| Memória | 128 MB de memória linear | `-W max-memory-size` (→ `MemoryError`) |
| Rede, ambiente, processos | inexistentes | WASI só recebe `/lib`, `/harness`, `/work`; `inherit-env=n`; sem sockets nem DNS (`allow-ip-name-lookup=n`) |
| Concorrência | `CONCURRENCY` (padrão: 1 por CPU); fila limitada pela espera estimada (`MAX_QUEUE_WAIT_MS`, padrão 20 s) e por 200 lotes (`MAX_QUEUE`) | semáforo no executor; admissão atômica por job (todos os lotes ou nenhum); 503 com `Retry-After` quando a espera estimada passa do teto; job abandonado pela API é cancelado. Medições em [desempenho-e-carga.md](./desempenho-e-carga.md) |
| Saída | 8 MB por execução; linha de observação até 4 MB e profundidade 256 | o host mata o processo ao exceder; linhas maiores são descartadas |
| Disco | 32 MB e 2 000 arquivos/pastas no projeto por lote (`MAX_JOB_DISK_MB`) | o host mede `/work` a cada 100 ms e mata o processo ("Disco excedido") |
| Arquivos | harness somente leitura; projeto em `/work`, restaurado entre sondas; stdlib em `/lib` | permissões do sistema de arquivos: o executor **recusa partir** em produção se puder gravar na stdlib (o convidado herdaria a permissão) |

## Medições (máquina de 2 vCPUs, `CONCURRENCY=1`)

Cada instância WASI (partida do CPython + harness) custa ~120–130 ms; por isso as regras
de estrutura (`ast`) de um job dividem uma instância só (antes, uma por regra: a lição
"Comprehensions", com 5 regras, subia 6 instâncias; agora 2). Carga de turma, fila e
dimensionamento: [desempenho-e-carga.md](./desempenho-e-carga.md).

| Cenário | Tempo |
|---|---|
| Lição típica (`call` + `source`) | 130–280 ms |
| Lição com 6–17 casos `expr` | 140–400 ms |
| Lição 22 (7 casos `unittest` = 13 instâncias: 6 implementações × 2 + a do aluno) | ~2,8 s |
| Laço infinito | interrompido em 10 s |

## Gabaritos verificados

`pnpm --filter @levelusp/api verify:seed` roda as 22 lições do curso Python
Completo no executor real. Para cada lição: a solução de referência precisa ser
aprovada, o esqueleto inicial reprovado, **todas as soluções erradas
plausíveis** (`wrong_solutions` no seed, 72 no total) reprovadas, e a correção
precisa ser `strong`. As conversões dos antigos blocos legados e as soluções
erradas ficam em `packages/db/tools/manual_conversions.py`; o seed é gerado por
`python3 packages/db/tools/convert_legacy_tests.py`. O CI executa essa
verificação a cada mudança.

## Portabilidade do `.cwasm` e autoteste

O `python.cwasm` é o CPython pré-compilado pelo Wasmtime no build da imagem. Sem
`--target`, o `wasmtime compile` usa as instruções da CPU da máquina que compila (no
GitHub Actions, AVX-512) e o Wasmtime **recusa carregar** o módulo em qualquer CPU que
não as tenha — foi o que aconteceu na homologação no notebook (04/11/2026): toda
verificação voltava em ~10 ms com "O programa terminou de forma inesperada" em todos
os casos, inclusive os de AST. Desde então:

- `fetch-python-wasi.sh` compila com `--target <arch>-unknown-linux-gnu` (só o conjunto
  base da arquitetura; mesma imagem roda em qualquer máquina);
- o executor roda um **autoteste** na partida (um `print` por uma sonda `run`): se falhar,
  `GET /healthz` responde 503 com o motivo, o `docker compose` não marca o serviço como
  saudável e a API fica com `runner: false` no `/api/health/ready`;
- um lote que termina **sem nenhuma observação** vai para o log em nível `error` com o
  `stderr` do Wasmtime, que é onde a causa real aparece.

## Motor python-dados (Pyodide)

Lições de dados/IA precisam de numpy, pandas, scikit-learn e companhia, que não
existem no CPython WASI. Elas são corrigidas por um segundo motor, o **Pyodide**
(CPython 3.14 compilado para WebAssembly, com os wheels científicos oficiais),
rodando em `worker_threads` do Node. O **harness é o mesmo arquivo**
(`apps/runner/python/harness.py`) nos dois motores; muda só a camada que entrega
o lote e lê as observações.

### Interface `Engine` e escolha do motor

O executor fala com os dois motores por uma interface única
(`apps/runner/src/engine.ts`):

```ts
interface Engine {
  readonly name: "wasi" | "pyodide"
  readonly versions: { python: string; runtime: string }
  readonly readiness: { ready: boolean; reason: string }
  accept(request): void          // recusa pedido impossível (ex.: biblioteca desconhecida) → 400
  warmupMs(request): number      // custo de aquecer uma instância quando não há pronta
  run(batch): Promise<ProbeObservation[]>
  stats(): Record<string, …>
}
```

O `WasmtimeSandbox` (motor `wasi`) foi refatorado para implementá-la **sem mudar
o comportamento** (os testes de `apps/runner/test` e `test/attacks` continuam
passando). A requisição do executor (`POST /v1/run`) ganhou dois campos opcionais
em `@levelusp/contracts` (`runner.ts`):

- `runtime?: "python" | "python-dados"` (padrão `python`): escolhe o motor;
- `libraries?: string[]` (padrão `[]`): os pacotes do Pyodide que o lote precisa.

Os lotes **só de análise estrutural** (`ast`) de um job `python-dados` rodam no
WASI (não executam o código do aluno e custam ~130 ms, em vez de um worker do
Pyodide). Os dois motores dividem o **mesmo semáforo** de concorrência
(`CONCURRENCY`); a estimativa de espera da fila soma o custo de aquecer um worker
quando o pool do perfil está vazio.

### Protocolo (idêntico ao WASI)

O lote entra pela **entrada padrão** do convidado (`pyodide.setStdin` com um
`read` que entrega o JSON do lote até o EOF; o harness lê `os.read(0, …)`). As
observações saem pela **saída padrão** (`pyodide.setStdout`), uma por linha,
prefixadas pelo nonce desta execução; prints do aluno são capturados. `/work`
(arquivos do projeto) e `/harness` (o harness, somente leitura) vivem no MEMFS,
`os.chdir("/work")` funciona, e as sondas viajam com ids posicionais. Como no
WASI: o nonce nunca entra em disco, argv ou ambiente; uma segunda linha com o
mesmo id invalida a sonda.

### Perfis e políticas

Um worker é **aquecido** com os pacotes de um perfil (descompactados no MEMFS e
os mais caros já importados), para que um lote pague só o tempo do próprio
código. O perfil vem do `libraries` do lote:

| Perfil | Pacotes | Quando |
|---|---|---|
| `dados` | numpy, pandas | o lote pede só numpy/pandas (ou nada) |
| `ml` | dados + scipy, scikit-learn, matplotlib, statsmodels, sympy, networkx | o lote pede qualquer uma dessas |

Uma biblioteca fora do catálogo é **erro 400** claro (`unknown_library`), antes
de admitir o job.

- **Política `fresh`** (padrão, `RUNNER_PYODIDE_POLICY=fresh`): **um lote por
  worker**. O worker é descartado depois do lote; um pool aquecido por perfil
  (`RUNNER_PYODIDE_WARM`, padrão `dados:1,ml:0`) mantém instâncias prontas. É o
  isolamento mais forte: nenhum estado atravessa lotes.
- **Política `reuse`** (`RUNNER_PYODIDE_POLICY=reuse`): o worker atende **vários
  lotes**, com uma **restauração** entre eles (dicionário de cada módulo, classes,
  código/`__defaults__`/`__dict__` das funções, `sys.modules`/`sys.path`/builtins,
  `os.environ`, limite de recursão, handlers de sinal, `atexit`, `sys.monitoring`,
  opções de numpy/pandas/matplotlib/logging) a partir de uma **fotografia** tirada
  logo após o aquecimento. Depois de cada lote roda um **canário** (uma expressão
  numpy/pandas com resultado conhecido); o worker é **reciclado** após
  `RUNNER_PYODIDE_RECYCLE_AFTER` lotes (padrão 25), quando o heap wasm passa de
  `RUNNER_PYODIDE_RECYCLE_HEAP_MB` (padrão 256 MB), ou se a restauração/canário
  falham. Lotes **estritos** (`unittest`/`legacy`, que instalam um audit hook)
  usam sempre um worker dedicado e descartado. A `reuse` troca ~5–6 s de
  aquecimento por lote por ~50–80 ms de restauração, mas o estado de **instâncias**
  (não coberto pela fotografia) pode sobreviver — é por isso que ela é opcional e
  tem canário + reciclagem (riscos em [seguranca.md](./seguranca.md)).

**Fila do pool.** Um lote sem worker ocioso entra na fila do perfil e recebe o próximo
worker que ficar pronto: um que termina de aquecer ou, na `reuse`, um que acabou de ser
restaurado. O pool mantém a caminho `RUNNER_PYODIDE_WARM` workers **além** de um por lote
na fila, então nenhum lote espera por um worker que já tem dono (com `ml:0` isso prendia o
segundo lote simultâneo até os 120 s do pedido). Lotes estritos na `reuse` não passam pela
fila: aquecem um worker próprio. Medições e o que sobra do piso em
[desempenho-executor.md](./desempenho-executor.md).

### Isolamento (antes do código do aluno)

O código do aluno roda **dentro** do worker, então tudo que ele poderia alcançar
fora do interpretador é fechado no aquecimento (`src/pyodide-guard.ts`):

- `sys.modules["js"] = sys.modules["pyodide_js"] = None`, o finder de módulos JS
  é removido e **toda referência a objeto JS** (`JsProxy`) guardada em módulos é
  apagada (um `JsProxy` daria `.constructor` → `Function` do host); as fábricas
  de `JsProxy` (`to_js`, `create_proxy`, `run_js`, `run_sync`) somem;
- `_ctypes`/`ctypes` ficam inacessíveis (eles chamariam `emscripten_run_script`,
  que é `eval` no host, e leriam a memória do interpretador);
- no `globalThis` do worker, `process`, `fetch`, `WebSocket`, `XMLHttpRequest`,
  `require` e afins são removidos, e `eval`/`Function` (e as variantes
  async/generator, inclusive via `.constructor`) passam a lançar;
- o ambiente fica vazio e o SIGINT volta ao handler padrão (o que transforma o
  buffer de interrupção em `KeyboardInterrupt`).

### Limites por lote

| Recurso | Limite | Mecanismo |
|---|---|---|
| Tempo de parede | os mesmos `RunnerLimits` do WASI | `setInterruptBuffer` (interrupção suave, rearmada a cada 20 ms porque o harness reexecuta o `main.py` por sonda) + `worker.terminate()` no estouro duro |
| Memória do wasm | `RUNNER_PYODIDE_MAX_HEAP_MB` (padrão 512) | o `emscripten_resize_heap` recusa crescer além do teto → `MemoryError` |
| Heap de JS do worker | `RUNNER_PYODIDE_JS_HEAP_MB` (padrão 1536) | `resourceLimits.maxOldGenerationSizeMb` do worker |
| Disco | `MAX_JOB_DISK_MB` e 2 000 entradas por lote | as tabelas de operações do MEMFS contam bytes e entradas gravados em `/work`, `/tmp`, `/home` |
| Saída | 8 MB por lote; linha de observação ≤ 4 MB e profundidade ≤ 256 | a thread principal corta e marca `overflowed` (o worker é descartado) |
| Arquivos | stdlib, site-packages e harness **somente leitura** no MEMFS | as mesmas tabelas de operações recusam escrita/rename/unlink fora dos três diretórios graváveis |
| Rede, processos, threads | inexistentes | Emscripten não tem subprocess/fork/thread e não há egresso de rede |

### Readiness

O motor Pyodide é **opcional**: ligado por `RUNNER_PYODIDE_ENABLED` ou, por
padrão, quando `PYODIDE_DIR` tem a distribuição. Seu autoteste da partida (um lote
trivial com numpy) **não derruba** `/healthz` — as lições `python` seguem
funcionando sem ele. O `/healthz` informa `pyodide: { ready, reason, policy,
profiles, warm }`; o WASI continua decidindo o 503. O `GET /v1/stats` traz os
contadores por motor (lotes, falhas, workers aquecidos/reciclados).

### Medições de referência (nuvem, 1 vCPU)

Processo novo, com a distribuição de `PYODIDE_DIR`:

| Cenário | Tempo / memória |
|---|---|
| Boot do Pyodide (sem pacotes) | ~1,8 s |
| + numpy | +0,9 s; RSS ~250 MB; heap wasm ~80 MB |
| Perfil `dados` (numpy + pandas), aquecido | ~6 s no total; RSS ~590 MB |
| Perfil `ml` (+ scipy + scikit-learn + matplotlib + statsmodels + sympy + networkx) | ~15–18 s no total; RSS ~1,3 GB |
| Lote `dados` depois do worker aquecido | dezenas de ms + o código do aluno |
| Restauração entre lotes (`reuse`, perfil `dados`) | ~20–50 ms (fotografia ~50 ms no aquecimento) |

`makeMemorySnapshot()` do Pyodide **não funciona** com pacotes carregados (erro
`Unexpected hiwire entry`), e carregar uma segunda instância no mesmo processo
não é mais rápido — por isso o pool de workers aquecidos em vez de snapshots.
Carga e dimensionamento em [desempenho-e-carga.md](./desempenho-e-carga.md).
