# Medições estáticas: conteúdo e segurança

Itens 4 e 5 da Fase D. As duas tabelas vêm de scripts que só LEEM o código-fonte (não executam
Python, o executor, o banco nem o navegador). Valem para o commit em que foram geradas; os CSVs em
`docs/tcc/dados/` são a fonte e esta página os resume.

## Como reproduzir

Da raiz do repositório, depois de `pnpm install --frozen-lockfile` e
`pnpm --filter @levelusp/contracts build`:

```bash
pnpm --filter @levelusp/api exec tsx ../../scripts/bench/conteudo.mts              # docs/tcc/dados/conteudo.csv
pnpm --filter @levelusp/api exec tsx ../../scripts/bench/seguranca-inventario.mts  # docs/tcc/dados/seguranca-inventario.csv
```

Os dois são determinísticos (sem data, sem aleatoriedade): rodar de novo no mesmo commit gera o mesmo CSV.
A regra de contagem de cada um está no comentário do topo do script.

## 1. Conteúdo por curso (`conteudo.csv`)

Fonte: `content/` compilado por `apps/api/scripts/content/compiler.ts` (o mesmo compilador de
`content:check` e `content:build`). Entram os 7 níveis do pacote; o curso legado sem slug não faz parte dele.

| Curso | Módulos | Lições | Passos | Leitura | Exercício | Quiz | Previsão | Casos de teste | Soluções erradas declaradas | Perguntas de quiz | Prova |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| n1-fundamentos | 9 | 47 | 281 | 64 | 133 | 47 | 37 | 818 | 540 | 136 | 40 |
| n2-python-intermediario | 7 | 35 | 263 | 85 | 113 | 36 | 29 | 930 | 537 | 108 | 40 |
| n3-estruturas-de-dados-e-algoritmos | 8 | 39 | 305 | 110 | 124 | 39 | 32 | 1173 | 657 | 117 | 40 |
| n4-analise-de-dados | 7 | 31 | 239 | 82 | 95 | 31 | 31 | 962 | 635 | 93 | 40 |
| n5-machine-learning | 8 | 36 | 284 | 102 | 110 | 36 | 36 | 986 | 710 | 108 | 40 |
| n6-deep-learning | 8 | 36 | 287 | 106 | 109 | 36 | 36 | 1247 | 812 | 108 | 40 |
| n7-engenharia-de-ia | 7 | 29 | 219 | 61 | 104 | 29 | 25 | 940 | 644 | 87 | 40 |
| **Total** | **54** | **253** | **1878** | **610** | **788** | **254** | **226** | **7056** | **4535** | **757** | **280** |

Casos de teste por tipo (`kind` do contrato), só dos passos de exercício:

| Curso | io | call | variable | source | expr | unittest | legacy |
|---|---:|---:|---:|---:|---:|---:|---:|
| n1-fundamentos | 162 | 402 | 45 | 89 | 120 | 0 | 0 |
| n2-python-intermediario | 9 | 170 | 2 | 29 | 704 | 16 | 0 |
| n3-estruturas-de-dados-e-algoritmos | 0 | 334 | 0 | 61 | 778 | 0 | 0 |
| n4-analise-de-dados | 0 | 116 | 0 | 36 | 810 | 0 | 0 |
| n5-machine-learning | 0 | 171 | 0 | 19 | 796 | 0 | 0 |
| n6-deep-learning | 0 | 143 | 0 | 3 | 1101 | 0 | 0 |
| n7-engenharia-de-ia | 0 | 219 | 0 | 0 | 715 | 6 | 0 |
| **Total** | **171** | **1555** | **47** | **237** | **5024** | **22** | **0** |

Notas:

- "Exercícios" é igual a "Passos de exercício" (um exercício = um passo do tipo `exercicio`); "Prova" é o
  banco de questões da prova final do curso, e "Perguntas de quiz" soma as perguntas dos passos `quiz`.
- Todas as colunas de soluções erradas trazem `verificadas_em_execucao=nao` no CSV: o script só CONTA as
  declaradas em `wrong_solutions`. Que cada uma REPROVA só é provado por `pnpm content:verify`, que usa o executor.
  Depois dessa execução, o número de "soluções erradas verificadas" é o de soluções declaradas dos passos que
  `content:verify` reporta como aprovados (a aprovação do passo exige que todas as erradas reprovem).
- O curso inteiro foi compilado sem problemas (`compiled.problems` vazio); com problemas o script aborta.
  Os passos `previsao` são contados como declarados; a saída esperada deles é gerada por execução no `content:verify`.

## 2. Inventário de ataques (`seguranca-inventario.csv`)

Fonte: o código dos testes de `pnpm test:attacks` (executor real) e `pnpm test:security`.
Uma linha do CSV é um arquivo ou, nos arquivos de vários `describe`, um grupo `describe` de primeiro nível;
as colunas são `arquivo, categoria, motor, casos, suite, forja_veredito, limites_documentados`.

Regra: cada `it`/`test` vale 1; `it.each` vale o número real de linhas da tabela (em
`grading-forgery.e2e.ts`, uma por lição do seed: 22); laços `for` dentro de um caso NÃO multiplicam (por isso o
total é um piso do número de tentativas, não o número exato de cargas enviadas).

Totais por motor:

| Motor | Casos | Onde |
|---|---:|---|
| python/WASI | 97 | runner (57) + veredito na API contra o executor real (40) |
| python-dados/Pyodide | 16 | `pyodide.attack.ts` |
| API | 111 | `apps/api/test/security` (9 arquivos e2e com PostgreSQL) |
| web | 12 | `apps/web/e2e/security` (Playwright) |
| cadeia de suprimentos | 15 | `packages/security/src` (lockfile, registry, typosquatting, audit, bundle) |
| **Total** | **251** | `test:attacks` 113 + `test:security` 138 |

Por categoria:

| Categoria | Motor | Casos |
|---|---|---:|
| Fuga do sandbox (arquivos, rede, processos, threads, nativo) | python/WASI | 8 |
| Forja de observações (valores hostis, exceções, saída padrão, estado, AST, builtins) | python/WASI | 13 |
| Modo estrito: rotas até o nonce | python/WASI | 5 |
| unittest: referência × mutante | python/WASI | 5 |
| Abuso de recursos (memória, CPU, saída, disco, Wasmtime, concorrência) | python/WASI | 26 |
| Forja de veredito (API + executor real) | python/WASI | 40 |
| Pyodide: fuga ao JavaScript e ao host | python-dados/Pyodide | 5 |
| Pyodide: sistema de arquivos e nonce | python-dados/Pyodide | 4 |
| Pyodide: recursos | python-dados/Pyodide | 4 |
| Pyodide: contaminação entre lotes (política `reuse`) | python-dados/Pyodide | 3 |
| Autenticação, sessão e CSRF | API | 19 |
| Autorização de objeto (BOLA/IDOR) | API | 14 |
| Lógica de negócio (XP, quiz, prova) | API | 15 |
| Injeção e entradas hostis | API | 15 |
| Configuração insegura | API | 10 |
| Mass assignment | API | 10 |
| Matriz de autorização das rotas | API | 8 |
| Forja de progresso e vazamento de gabarito (passos) | API | 12 |
| Uploads | API | 8 |
| Cabeçalhos e enquadramento | web | 3 |
| Vulnerabilidades conhecidas do Next/React | web | 4 |
| Sessão, redirecionamento e CSRF | web | 3 |
| XSS armazenado | web | 2 |
| Cadeia de suprimentos | cadeia de suprimentos | 15 |

Tentativas de forjar veredito, progresso ou observações (`forja_veredito=sim`): **79 casos** =
runner python/WASI 23 (forja de observações 13, modo estrito 5, unittest 5) + Pyodide (nonce) 4 +
veredito na API contra o executor 40 + forja de progresso e gabarito nos passos 12. Entre os 40 da API há
um forjador universal por lição (22), a suíte da lição de `unittest`, as regras de estrutura e as
tentativas sobre o nonce.

Limites documentados (2): o inventário marca à parte os casos com título `LIMITE` ou `FRONTEIRA`, que
mostram o que o sistema NÃO impede de propósito (nonce descoberto numa instância compartilhada; comparar o
alvo com uma implementação própria correta). Eles passam como testes, mas documentam um resíduo, não um bloqueio.

## 3. Ressalva: "bloqueado" só existe depois da execução

O inventário mostra o que está CODIFICADO. Um ataque só vira "bloqueado" quando a suíte roda e a
asserção correspondente passa. Dependências para isso:

- `test:attacks`: executor no ar (`RUNNER_URL`, `RUNNER_TOKEN`) e, para o Pyodide, `PYODIDE_DIR`. Sem eles, as
  suítes são PULADAS (`describe.skipIf`), e um arquivo pulado não é um arquivo bloqueado.
- `test:security` da API: PostgreSQL real (`TEST_DATABASE_URL`); da web: Playwright com a aplicação de pé.
- `grading-forgery.e2e.ts` também casa com o glob do projeto `security` da API, mas só roda com o executor
  no ar; aqui ele conta uma vez, em `test:attacks`.
- Casos que caem em laço (várias cargas num só `it`) são "bloqueados" se TODAS as cargas forem recusadas.
- O número de bloqueados será preenchido depois da execução das suítes (relatório de passou/pulou/falhou por
  arquivo); até lá, esta página não afirma bloqueio nenhum.
