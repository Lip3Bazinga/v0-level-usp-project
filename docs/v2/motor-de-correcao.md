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
  R->>R: 1 instância WASI por lote (AST isolada; legado isolado)
  R-->>API: observações (valores serializados, stdout, erros)
  API->>API: grade(cases, observações) — comparação local
  API->>API: se aprovado: GamificationService.completeLesson (transação)
  API-->>A: SubmissionResult (casos, XP, badges, nível)
```

## Sondas (`packages/contracts/src/runner.ts`)

| Sonda | O que o harness faz | Usada por |
|---|---|---|
| `run` | executa `main.py` com stdin, captura stdout/stderr | casos `io` |
| `call` | executa `main.py`, chama a função com args/kwargs, serializa o retorno + tipo | casos `call` |
| `globals` | executa `main.py` e lê variáveis globais | casos `variable` |
| `ast` | **não executa** o código; extrai construções, chamadas, funções, classes, imports | casos `source` |
| `legacy` | roda asserts/unittest antigos no namespace do aluno | casos `legacy` (correção fraca) |

## Limites por execução

| Recurso | Limite | Mecanismo |
|---|---|---|
| Tempo de parede | 10 s (2–25 s configurável) | `-W timeout` do Wasmtime + kill do processo pelo host |
| CPU | 1,5×10¹⁰ unidades de fuel por segundo de orçamento | `-W fuel` |
| Memória | 128 MB de memória linear | `-W max-memory-size` (→ `MemoryError`) |
| Rede, ambiente, processos | inexistentes | WASI só recebe `/lib`, `/job`, `/out`; `inherit-env=n`; sem sockets |
| Concorrência | `CONCURRENCY` (padrão: CPUs − 1) e fila máx. 200 | semáforo no executor (503 quando cheio) |

## Medições (máquina de 2 vCPUs)

| Cenário | Tempo |
|---|---|
| Lote de 6 sondas numa instância | ~110 ms |
| Lição típica (casos `call` + `source`) | 130–280 ms |
| Lição com caso legado | 200–470 ms |
| Laço infinito | interrompido em 10 s |

## Gabaritos verificados

`pnpm --filter @levelusp/api verify:seed` roda as 22 lições do curso Python
Completo no executor real: a solução de referência precisa ser aprovada e o
esqueleto inicial, reprovado. O CI executa essa verificação a cada mudança.
