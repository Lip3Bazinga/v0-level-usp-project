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

### `expr` — classes, exceções, arquivos, generators, decorators, pacotes

O harness executa o `main.py` (como `__main__`), depois a preparação e, por fim,
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
aluno chegam como `modulo.Classe` (`__main__.Tarefa`). `type`/`raises` com nome
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

- `expect: "pass"`: nenhuma falha/erro, ao menos 1 teste e `run >= min_tests`;
- `expect: "fail"`: ao menos uma falha ou erro (a suíte "matou" o mutante).

A lição 22 usa: a referência deve passar (mínimo 4 testes), a própria
implementação do aluno deve passar, e cinco mutantes devem ser reprovados
(aceita tudo, recusa tudo, ignora o dígito, ignora o tamanho, não levanta
`TypeError`). Cada sonda `unittest` roda numa instância própria, então a suíte
não consegue carregar estado de uma implementação para a outra.

### Regras de estrutura (`source`)

`uses`/`not_uses` (construções, inclusive `yield`; com `function` opcional a
regra vale só no corpo daquela função), `calls`/`not_calls`, `defines_function`,
`defines_class`, `imports`, `decorator` (`@property`, `@functools.wraps(f)` →
`wraps`) e `catches` (`except ValueError`, `except (A, B)`). A análise roda numa
instância em que o código do aluno não executa.

## Sondas (`packages/contracts/src/runner.ts`)

| Sonda | O que o harness faz | Instância |
|---|---|---|
| `run` | executa `main.py` com stdin, captura stdout/stderr | compartilhada |
| `call` | executa `main.py`, chama a função, serializa retorno + tipo | compartilhada |
| `globals` | executa `main.py` e lê variáveis globais | compartilhada |
| `expr` | executa `main.py`, a preparação e a expressão; serializa valor/tipo ou exceção | compartilhada |
| `ast` | **não executa** o código; extrai construções, chamadas, decorators, `except`, construções por função | própria |
| `unittest` | substitui `target`, roda a suíte do aluno, conta resultados | própria, **modo estrito** |
| `legacy` | roda asserts/unittest antigos no namespace do aluno | própria (lote), **modo estrito** |

Entre sondas da mesma instância o harness restaura `sys.modules`, `sys.path`,
os builtins, os ganchos de `sys`, o diretório atual e os arquivos do projeto
(arquivos criados são apagados, alterados são regravados).

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
monkeypatch de `json`/`os.write`/builtins).

### Garantia residual (precisa)

O código do aluno divide o interpretador com a preparação do professor e com o
harness. Ele pode, portanto, alterar o que é **observado**: devolver objetos
hostis, trocar builtins ou módulos da stdlib usados pela preparação, e até — por
introspecção profunda do interpretador — descobrir o nonce e emitir
observações. O que ele **não** consegue é ver o valor esperado ou mudar a
comparação, que acontece na API. Então:

- **`call`/`io`/`variable`/`expr`**: forjar a aprovação exige produzir
  exatamente a observação esperada, ou seja, **conhecer a resposta**. Para
  valores que o enunciado já entrega (ex.: "deve ser subclasse de Exception" →
  `True`), saber a resposta é saber o que o código deve fazer — o mesmo que um
  aluno faria escrevendo `return True`. Prefira expectativas ricas (listas,
  textos) a booleanos quando possível.
- **`unittest`**: forjar exige saber em qual implementação a suíte está rodando
  (referência ou mutante). Isso não entra no sandbox (ids posicionais, uma
  instância por implementação, frames e gc bloqueados); distinguir pelo
  comportamento é exatamente escrever um bom teste. Atenção: a implementação
  de referência fica disponível ao código do aluno naquela sonda — não use a
  mesma função em casos `call` com valores secretos.
- **`source`**: roda sem executar o código do aluno; não é forjável.
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
| Rede, ambiente, processos | inexistentes | WASI só recebe `/lib`, `/harness`, `/work`; `inherit-env=n`; sem sockets |
| Concorrência | `CONCURRENCY` (padrão: CPUs − 1) e fila máx. 20 | semáforo no executor (503 quando cheio; job abandonado pela API é cancelado) |
| Saída | 8 MB por execução | o host mata o processo ao exceder |
| Arquivos | harness somente leitura; projeto em `/work`, restaurado entre sondas | permissões do sistema de arquivos (executor sem root) |

## Medições (máquina de 2 vCPUs, `CONCURRENCY=1`)

| Cenário | Tempo |
|---|---|
| Lição típica (`call` + `source`) | 130–280 ms |
| Lição com 6–17 casos `expr` | 140–400 ms |
| Lição 22 (7 casos `unittest` = 7 instâncias) | ~1,6 s |
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
