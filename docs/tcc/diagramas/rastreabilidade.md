# Rastreabilidade dos diagramas do TCC

Cada caixa e cada seta dos seis diagramas aponta para `arquivo:linha` do repositório (caminhos a partir
da raiz). As linhas foram conferidas no commit `5add24f` (26/11/2026); se o código mudar, as linhas
andam, mas o nome da função ou da chave citada permanece o mesmo.

Convenções:

- **Planejado** = descrito em documento do repositório, mas sem operação real hoje.
- **Não encontrado** = a ideia do diagrama não existe no código nem nos documentos (e por isso não foi desenhada como fato).
- Os `.mmd` estão em `docs/tcc/diagramas/`. Nada aqui contém segredo ou dado pessoal: os valores citados
  (portas, limites, nomes de variáveis) são os do repositório público.

## Resumo dos itens planejados e não encontrados

| Item | Situação | Onde está |
|---|---|---|
| Produção na VM Linux (compose.vm.yml, levelusp-vm.sh, backups) | **Planejado.** Os arquivos existem, mas a VM ainda não foi provisionada: "o notebook hoje; VM Linux no lançamento" | `docs/v2/ambientes-e-deploy.md:9`, `docs/v2/producao-vm.md:3-6` |
| gVisor | **Não existe no código.** Só aparece em um documento, como parte da opção B (runner-dados com CPython real), que **não foi adotada**; a opção D diz "A agora e B depois, só na VM, quando `torch` for exigido". Desenhado no diagrama 06 como "opção futura, não implementada" | `docs/v2/decisoes-curso-2026-11-04.md:74-76` (opção B) e `:79-80` (opção D); a busca por `gvisor` e `runsc` fora de `legacy/` só encontra esse trecho |
| `content:verify` dentro do CI | **Não encontrado.** Nenhum job de `.github/workflows/ci.yml` roda `content:*` (o subgrafo de autoria do diagrama 04 é só a máquina do autor); o CI roda `verify:seed` (seed legado). O `content:verify` é um portão por **convenção da equipe**, sem trava técnica: `db:seed` e `POST /api/admin/content/import` não checam se o verify passou (diagrama 04) | `.github/workflows/ci.yml:130` (`verify:seed`); busca por `content:` em `.github/workflows/` sem ocorrências; `packages/db/src/scripts/seed.ts:221-224` e `apps/api/src/modules/content/content.service.ts:25-34` (nenhuma referência ao verify) |
| Certificado de trilha e `exams` no fluxo de Verificar | Fora do escopo do diagrama 03 (só aparecem no ER) | `packages/db/src/schema/tracks.ts:47`, `packages/db/src/schema/exams.ts:80` |

---

## 01 - Contexto C4 (`01-contexto-c4.mmd`)

| Elemento | Evidência |
|---|---|
| Pessoa **Aluno** (papel `student`) | `packages/contracts/src/users.ts:9` (`USER_ROLES`) |
| Pessoa **Professor ou administrador** | `packages/contracts/src/users.ts:9`; `apps/api/src/modules/catalog/courses.controller.ts:38` (`@Roles("teacher", "admin")`); `apps/api/src/modules/content/content.controller.ts:13` (`@Roles("admin")`) |
| Sistema **LevelUSP** (web + api + runner + PostgreSQL) | `docs/v2/arquitetura.md:6-24` (diagrama de arquitetura); `infra/compose/compose.yml:13-159` (serviços postgres, migrate, runner, api, web) |
| Fronteira "infraestrutura do LevelUSP (Docker Compose)", custo do servidor | `infra/compose/compose.vm.yml:14-15` ("limites... são tetos, não reservas"); `infra/compose/compose.yml:107-109` (`mem_limit`, `cpus` do runner) |
| Sistema externo **Cloudflare Tunnel** | `infra/compose/compose.yml:3-4` (acesso público pelo Cloudflare Tunnel); `infra/compose/compose.yml:161-168` (serviço `tunnel`); `infra/compose/compose.vm.yml:130-151` (serviço `cloudflared`, "só conexões de saída" em `docs/v2/producao-vm.md:43-44`) |
| Sistema externo **CDN do Pyodide (jsDelivr)** | `apps/web/next.config.mjs:14` (`DEFAULT_PYODIDE_PACKAGE_BASE_URL`); `apps/web/next.config.mjs:6-9` ("só os wheels dos pacotes extras vêm do CDN oficial"); `apps/web/src/lib/python/runtime-config.ts:7-10` |
| Sistema externo **SMTP** | `apps/api/src/infra/mail/mail.transport.ts:1` e `:47` (nodemailer); `apps/api/src/config/env.ts:49` (`SMTP_URL`); `infra/compose/compose.vm.yml:96-97` (`SMTP_URL`, `SMTP_REQUIRE_TLS`) |
| Seta Aluno → Cloudflare "HTTPS, mesma origem /api/*" | `docs/v2/arquitetura.md:18-19`; `apps/web/next.config.mjs:83-85` (comentário: o navegador fala só com a mesma origem) |
| Seta Docente → Cloudflare | mesma entrada pública; rotas administrativas em `apps/api/src/modules/content/content.controller.ts:14` (`admin/content`) |
| Seta Cloudflare → LevelUSP | `infra/compose/compose.yml:166` (`--url http://web:3000`); `infra/compose/compose.vm.yml:128-129` (hostname aponta para `http://web:3000`) |
| Seta Aluno → CDN "connect-src da CSP" | `apps/web/next.config.mjs:27` (`connectOrigins`); `apps/web/next.config.mjs:116` (CSP) |
| Seta LevelUSP → SMTP | `apps/api/src/infra/mail/mail.transport.ts:47`; `infra/compose/compose.yml:123` (`SMTP_URL` no serviço `api`) |

## 02 - Contêineres C4 (`02-conteineres-c4.mmd`)

| Elemento | Evidência |
|---|---|
| **Interface** (Next.js no navegador), envia `x-levelusp-csrf` | `apps/web/src/lib/api/client.ts:28` (`CSRF_HEADER`); `apps/web/src/lib/api/client.ts:94-98` (`buildHeaders`) |
| **Python do navegador** (Pyodide em Web Worker) | `apps/web/src/lib/python/pyodide-worker.ts:35` (`new Worker(... "./python-worker.ts" ...)`); `apps/web/src/lib/python/python-worker.ts:45-47` (`loadPyodide`); `apps/web/src/lib/python/python-worker.ts:86` (`runProject`); `apps/web/src/hooks/use-python.ts:159-162` (`execute` -> `postToWorker`) |
| "Nunca vale XP" no Executar | `apps/web/src/components/lesson-steps/exercise-step.tsx:164` ("Use Verificar para conferir"); progresso só pela API: `apps/api/src/modules/gamification/gamification.service.ts:67 e :77` ("SOMENTE depois de um veredito do servidor") |
| Custo "CPU do aluno" | `docs/v2/arquitetura.md:95` (Pyodide no navegador: "CPU do aluno, resposta imediata") |
| **web** (Next.js standalone, SSR, rewrite) | `infra/compose/compose.yml:137-159`; `apps/web/next.config.mjs:86-89` (`rewrites`, `/api/:path*`); `infra/compose/compose.yml:143` (`API_INTERNAL_URL`) |
| **api** (NestJS) | `infra/compose/compose.yml:111-135`; `apps/api/src/bootstrap.ts:39` (prefixo `api`) |
| Guards e CSRF da API | `apps/api/src/modules/auth/auth.module.ts:14` (`SessionGuard` global); `apps/api/src/modules/auth/session.guard.ts:15-37`; `apps/api/src/common/http/csrf.middleware.ts:13-17`; `apps/api/src/app.module.ts:66` |
| Cookie de sessão httpOnly | `apps/api/src/modules/auth/session.cookie.ts:10-12`; `apps/api/src/common/http/request.ts:18` |
| **PostgreSQL 17** | `infra/compose/compose.yml:14-29` (`postgres:17-alpine`); `packages/db/src/schema/index.ts:1-9` (schema Drizzle) |
| Seta api -> db "SQL (Drizzle, pg)" | `apps/api/src/infra/database/database.module.ts:39` (`createDb`); `infra/compose/compose.yml:119` (`DATABASE_URL`) |
| **runner** (HTTP mínimo, token, fila) | `apps/runner/src/server.ts:34` (`buildServer`); `apps/runner/src/server.ts:37-40` (`isAuthorized`, `timingSafeEqual`); `apps/runner/src/main.ts:39` (`MemoryBudget`), `:41` (`Semaphore`) e `:79` (`Executor`); `apps/runner/src/config.ts:156` e `:161` e `:167` (`CONCURRENCY`, `MAX_QUEUE`, `MAX_QUEUE_WAIT_MS`) |
| **Motor python** (Wasmtime + CPython WASI) | `apps/runner/src/sandbox.ts:110` (`WasmtimeSandbox`); `apps/runner/src/sandbox.ts:11` (`wasmtime 49`); `apps/runner/src/sandbox.ts:289-309` (`buildWasmtimeArgs`) |
| "Um processo novo por lote, sem rede, sem ambiente, só /lib, /harness e /work" | `apps/runner/src/sandbox.ts:96-108` (comentário); `apps/runner/src/sandbox.ts:220` (`env: {}`); `apps/runner/src/sandbox.ts:302` (`inherit-env=n,inherit-network=n,tcp=n,udp=n,...`); `apps/runner/src/sandbox.ts:303-305` (`--dir`) |
| **Motor python-dados** (Pyodide em `worker_threads`) | `apps/runner/src/pyodide-engine.ts:107` (`PyodideEngine`); `apps/runner/src/pyodide-engine.ts:95-96` ("o protocolo é o mesmo"); `apps/runner/src/main.ts:57-77`; `apps/runner/src/pyodide-guard.ts:25` (`PYODIDE_LOCKDOWN_SOURCE`) |
| Duas implementações atrás da mesma interface `Engine` | `apps/runner/src/engine.ts:46` (`interface Engine`); `apps/runner/src/executor.ts:12-15` (`EngineRegistry`); `apps/runner/src/executor.ts:163-167` (`engineFor`) |
| Fronteira 3 "rede runner, internal, sem internet" | `infra/compose/compose.yml:99` (`networks: [runner]`); `infra/compose/compose.yml:172-173` (`data` e `runner` com `internal: true`); `infra/compose/compose.yml:97-98` ("sem rede externa"); `infra/compose/compose.yml:99-109` (`read_only`, `cap_drop`, `no-new-privileges`, `pids_limit`, `mem_limit`, `cpus`) |
| Fronteira 3 "sem segredos, sem banco" | `docs/v2/arquitetura.md:34` ("sem segredos, banco ou rede"); `infra/compose/compose.yml:74-96` (o runner só recebe `RUNNER_TOKEN` e parâmetros de fila/motor, sem `DATABASE_URL`) |
| Fronteira 3, custo: **admissão por memória** (D2). Orçamento = `RUNNER_MEMORY` menos `RUNNER_MEMORY_RESERVE_MB` (512), nunca negativo; peso por worker `python` 0, `dados` 256, `ml` 1229 MiB (`RUNNER_BATCH_MEMORY_MB`); sem orçamento o lote espera na fila ou recebe 503 `busy`; lote cujo peso passa do orçamento inteiro nunca roda (501 `insufficient_memory`) | `apps/runner/src/memory-budget.ts:18` (`DEFAULT_BATCH_MEMORY_MB`) e `:44` (`MemoryBudget`); `apps/runner/src/config.ts:180` (`RUNNER_MEMORY`), `:187` (`RUNNER_MEMORY_RESERVE_MB`), `:195` (`RUNNER_BATCH_MEMORY_MB`), `:262` (`resolveMemoryBudgetMb`); `apps/runner/src/main.ts:39`; `apps/runner/src/executor.ts:203-214` (`admit`) e `:284-292` (reserva e prazo na fila); `apps/runner/src/semaphore.ts:69-71`; `apps/runner/src/server.ts:74-79` (503) e `:87` (501); `infra/compose/compose.yml:89-96` |
| Fronteira 2 "limites no compose" (custo) | `infra/compose/compose.vm.yml:103-104` (`api`: `cpus`, `mem_limit`); `infra/compose/compose.vm.yml:75` e `:83` (`runner`) |
| Seta ui -> web "HTTPS, cookie httpOnly, mesma origem" | `docs/v2/arquitetura.md:91-92` (sessão em cookie httpOnly, mesma origem) |
| Seta web -> api "rewrite /api/*" | `apps/web/next.config.mjs:86-89`; `infra/compose/compose.yml:143` |
| Seta ui -> pyBrowser "postMessage" | `apps/web/src/hooks/use-python.ts:162` (`postToWorker`); `apps/web/src/lib/python/python-worker.ts:160` (`self.onmessage`) |
| Seta pyBrowser -> CDN "só via fetch" | `apps/web/next.config.mjs:6-9` |
| Seta api -> runner "sondas sem gabarito, Bearer" | `apps/api/src/infra/runner/runner.client.ts:59-64`; `infra/compose/compose.yml:120-121` (`RUNNER_URL`, `RUNNER_TOKEN`); `packages/contracts/src/runner.ts:56` (nenhuma sonda leva o valor esperado) |
| Seta runner -> api "observações com versão do motor" | `apps/runner/src/executor.ts:259-263` (`observations`, `engine`, `durationMs`); `apps/api/src/infra/runner/runner.client.ts:39-46` (`isRunnerResult`) |
| Seta runner -> wasi "lote pelo stdin, com nonce" | `apps/runner/src/sandbox.ts:169` e `:223` (`prepareGuestJob`, `child.stdin.end`) |
| Seta runner -> pyServer "lote, com nonce" | `apps/runner/src/pyodide-engine.ts:279-280` |
| Setas wasi/pyServer -> runner "observações com nonce" | `apps/runner/src/sandbox.ts:172`; `apps/runner/src/pyodide-engine.ts:285` (`parseObservations(run.stdout, guestJob.nonce)`) |
| Cloudflare -> web, aluno -> cloudflare | `infra/compose/compose.yml:166-167`; `infra/compose/compose.vm.yml:139-140` (`cloudflared` depende de `web` saudável) |

## 03 - Sequência da submissão (`03-sequencia-submissao.mmd`)

| Passo | Evidência |
|---|---|
| 1. Clique em **Verificar** | `apps/web/src/components/lesson-steps/exercise-step.tsx:180` (`handleVerify`) |
| 2. `submitStep` envia os arquivos | `apps/web/src/components/lesson-steps/exercise-step.tsx:188-189`; `apps/web/src/lib/api/steps.ts:18-19` (`submitStep`) |
| `POST /api/me/lessons/:id/steps/:stepId/submit` com `x-levelusp-csrf` | `apps/api/src/modules/learning/steps.controller.ts:15` (`me/lessons/:id`) e `:24-33` (`@Post("steps/:stepId/submit")`); `apps/web/src/lib/api/client.ts:94-98` e `:142` |
| 3. Rewrite para `http://api:4000` | `apps/web/next.config.mjs:86-89`; `infra/compose/compose.yml:143` |
| 4. `CsrfMiddleware`, `SessionGuard`, `UuidPipe`, `ZodPipe(stepSubmitSchema)` | `apps/api/src/common/http/csrf.middleware.ts:13-17`; `apps/api/src/modules/auth/session.guard.ts:15-37`; `apps/api/src/common/pipes/uuid.pipe.ts:7`; `apps/api/src/common/pipes/zod.pipe.ts:9`; `apps/api/src/modules/learning/steps.controller.ts:30`; `packages/contracts/src/steps.ts:382` |
| 5. `loadContext` (lição visível, passo, ordem, projeto) lê o passo com gabarito | `apps/api/src/modules/learning/steps.service.ts:71` (chamada) e `:211-231` (definição); `apps/api/src/modules/learning/steps.service.ts:213` (`listByLesson`); `packages/db/src/schema/content.ts:171` (`lesson_steps.test_cases`) |
| Nota "o gabarito é lido dentro da API; a resposta nunca o carrega" | `packages/db/src/schema/content.ts:153-156` ("NUNCA saem da API para o aluno", comentário de `lesson_steps`); DTO público sem gabarito: `apps/api/src/modules/catalog/lesson-steps.mapper.ts:11` (`toLessonStep`); versão com gabarito, só dono ou admin: `apps/api/src/modules/catalog/lesson-steps.mapper.ts:30` |
| 6. `SubmissionGrader.grade` | `apps/api/src/modules/learning/steps.service.ts:74-76`; `apps/api/src/modules/learning/submission-grader.ts:53` |
| 7. `RateLimitService.consume` (`codeSubmission`, `codeSubmissionPerLessonDay`) | `apps/api/src/modules/learning/submission-grader.ts:55-56`; `apps/api/src/common/rate-limit/rate-limit.policies.ts:19` e `:25`; `apps/api/src/common/rate-limit/rate-limit.service.ts:17` |
| 8. `GradingService.grade` (valida casos, monta sondas, chama o runner) | `apps/api/src/modules/grading/grading.service.ts:40-55`; `apps/api/src/modules/learning/submission-grader.ts:58` |
| `testCasesSchema.safeParse` | `apps/api/src/modules/grading/grading.service.ts:43-45` |
| `buildProbes(cases)` sem valor esperado | `apps/api/src/modules/grading/grading.domain.ts:102-113` ("Nenhuma sonda leva o valor esperado"); `apps/api/src/modules/grading/grading.domain.ts:9-14` (as três etapas do motor); `apps/api/src/modules/grading/grading.service.ts:28` ("o executor nunca vê os valores esperados", comentário em `:33-35`); `packages/contracts/src/runner.ts:27` e `:56` |
| 9. `RunnerClient.run`: `POST /v1/run` com `Authorization: Bearer` | `apps/api/src/infra/runner/runner.client.ts:55-64`; `apps/api/src/config/env.ts:37-38` (`RUNNER_URL`, `RUNNER_TOKEN`) |
| 10. Runner autentica, valida o job, planeja e admite na fila | `apps/runner/src/server.ts:37-40`, `:49-50`, `:57`; `apps/runner/src/executor.ts:227-232` (`engineFor`, `accept`, `planBatches`, `admit`); `apps/runner/src/plan.ts:19-30` (`planBatches`) |
| `alt` fila cheia: 503 `busy` com `Retry-After` | `apps/runner/src/executor.ts:203-214` (`admit` lança `QueueFullError`); `apps/runner/src/server.ts:74-79` |
| API devolve a cota, grava submissão `error`, 503 ao aluno | `apps/api/src/infra/runner/runner.client.ts:85-89` (`RUNNER_BUSY_CODE`); `apps/api/src/modules/learning/submission-grader.ts:64-71` (`refund` em `:66-69`, `recordInfrastructureError` em `:70`); `apps/api/src/modules/learning/submission-grader.ts:76-82` (`status: "error"`); `apps/api/src/modules/learning/steps.service.ts:79` (a exceção sai antes de `incrementAttempts`: "não conta como tentativa") |
| 11. `prepareGuestJob`: nonce de 16 bytes, ids posicionais `p0`, `p1`... | `apps/runner/src/observations.ts:11` (`NONCE_BYTES`); `apps/runner/src/observations.ts:28-40` (`prepareGuestJob`); `apps/runner/src/observations.ts:70-72` (`positionalId`) |
| 12. Wasmtime sem env, sem rede; ou worker do Pyodide com lockdown | `apps/runner/src/sandbox.ts:220-223` e `:289-309`; `apps/runner/src/pyodide-guard.ts:25`; escolha do motor: `apps/runner/src/executor.ts:227-229` (`batchEngine`) |
| 13. `harness.py` lê o lote pelo stdin antes do código do aluno | `apps/runner/python/harness.py:124-132` (leitura do stdin e `nonce = job["nonce"]`); `apps/runner/src/sandbox.ts:99-103` (comentário) |
| 14. Observações no stdout como `nonce JSON` | `apps/runner/python/harness.py:211-217` (`emit`) |
| 15. `parseObservations` só aceita linhas com o nonce; id duplicado invalida | `apps/runner/src/observations.ts:83-96` |
| 16. `collectObservations`: `p0` volta ao id original; falha explicada | `apps/runner/src/observations.ts:58-68` e `:125-130` (`missingObservation`) |
| 17. Resposta `observations`, `engine`, `durationMs` | `apps/runner/src/executor.ts:259-263`; `apps/api/src/infra/runner/runner.client.ts:94-99` |
| 18. `grade(cases, observations)` compara COM o gabarito, fora do sandbox | `apps/api/src/modules/grading/grading.domain.ts:122-149`; `apps/api/src/modules/grading/grading.service.ts:55` |
| 19. `createSubmission` com `status=graded`, `result`, `engine` | `apps/api/src/modules/learning/submission-grader.ts:59-61`; `apps/api/src/modules/learning/learning.repository.ts:61`; `packages/db/src/schema/learning.ts:86-108` (`submissions`) |
| 20. `completeStep` só se aprovado | `apps/api/src/modules/learning/steps.service.ts:78`; `apps/api/src/modules/gamification/gamification.service.ts:82-121` (transação: `markStepCompleted`, `creditXp`, `touchStreak`, `completeLessonIn`, `grantBadges`) |
| Reprovado: `incrementAttempts` | `apps/api/src/modules/learning/steps.service.ts:79` |
| 21. Evento `step_submitted` | `apps/api/src/modules/learning/steps.service.ts:80`; `apps/api/src/modules/experiment/events.service.ts:37` |
| 22. Resposta `StepSubmitResult` com `cases` por `toStepCases`, `attempts`, `solution_available` | `apps/api/src/modules/learning/steps.service.ts:82-89`; `apps/api/src/modules/learning/steps.domain.ts:24-30` |
| Nota "esperado e obtido só se o caso tem `reveal`" | `apps/api/src/modules/grading/grading.domain.ts:204` (`testCase.reveal ? ... esperado ... : ...não é o esperado`) |
| Nota "a solução só sai pela rota própria, depois das tentativas" | `apps/api/src/modules/learning/steps.service.ts:148-159` (`revealSolution`, `SOLUTION_LOCKED`) |
| Participante **modules/grading** (domínio puro) | `apps/api/src/modules/grading/grading.domain.ts:9-14`; testes de robustez em `apps/api/src/modules/grading/grading.security.spec.ts:1-5` |

Observação: o ramo Pyodide (`runtime: python-dados`) usa o mesmo protocolo (nonce, ids posicionais, stdout):
`apps/runner/src/pyodide-engine.ts:279-285`. Lotes só de análise estrutural (`ast`) sempre vão ao WASI:
`apps/runner/src/executor.ts:92-94` e `:320-322`.

## 04 - Pipeline de conteúdo (`04-pipeline-conteudo.mmd`)

| Elemento | Evidência |
|---|---|
| **content/** (`.lvl.md` + YAML) | `apps/api/scripts/content/compiler.ts:13-19` (estrutura: `trilhas/<trilha>.yaml`, `cursos/<curso>/curso.yaml`, `prova.yaml`, `<modulo>/modulo.yaml`, `<modulo>/NN-<slug>.lvl.md`, `<modulo>/assets/`); `apps/api/scripts/content/compiler.ts:62` (`.lvl.md`); `content/README.md` (guia do formato) |
| **1. content:check** (`compileContent` + `lintContent`, não executa código) | `apps/api/scripts/content-check.mts:1-10` (descrição); `apps/api/scripts/content-check.mts:22-23`; `apps/api/scripts/content/compiler.ts:257-264`; `apps/api/scripts/content/lint.ts:259`; `package.json:25` e `apps/api/package.json:18` (script) |
| Check sai com código 1 se houver problema | `apps/api/scripts/content-check.mts:24-28` |
| **2. content:build** compila e roda o mesmo lint | `apps/api/scripts/content-build.mts:28-35`; `package.json:24` e `apps/api/package.json:17` |
| Build gera a saída dos passos Previsão no runner real (sem runner, falha) | `apps/api/scripts/content-build.mts:8-10` e `:37-60`; `apps/api/scripts/content/predictions.ts:103` (`generatePredictions`) |
| Build valida o pacote com `contentBundleSchema` | `apps/api/scripts/content-build.mts:62-67`; `apps/api/scripts/content/bundle.ts:48-57` (`validateBundle`); `packages/contracts/src/content-bundle.ts:190` |
| Build grava o pacote | `apps/api/scripts/content-build.mts:69-70`; `apps/api/scripts/content/bundle.ts:64-66` (`serializeBundle`) |
| **Pacote formato 2** (entre o build e o portão) `packages/db/seed/trilha-python-ia.json` | `apps/api/scripts/content/cli.ts:15` (`DEFAULT_BUNDLE_PATH`); `apps/api/scripts/content-build.mts:2-4` |
| `wrong_solutions` só no pacote, nunca gravado | `packages/contracts/src/content-bundle.ts:13` e `:29`; `docs/v2/curso-e-passos.md:252` |
| **3. PORTÃO content:verify** (compila de novo em memória) | `apps/api/scripts/content-verify.mts:34-39`; `package.json:26` e `apps/api/package.json:19` |
| Verify: solução aprova, inicial reprova, erradas reprovam | `apps/api/scripts/content-verify.mts:1-13` (descrição); `apps/api/scripts/content-verify.mts:59-62` (`verifyBundle`); `apps/api/scripts/content/verify.ts:299` |
| Verify usa o runner real e o motor de correção da API | `apps/api/scripts/content/verify.ts:5` (importa `buildProbes`, `grade` de `modules/grading`); `apps/api/scripts/content/verify.ts:206-220` (`buildVerifyJob`, `gradeOnRunner`); `apps/api/scripts/content/verify.ts:359` (`createHttpRunner`); `apps/api/scripts/content-verify.mts:41-49` |
| Verify exige `RUNNER_TOKEN` e `/healthz` do runner | `apps/api/scripts/content-verify.mts:27-32` e `:41-47` |
| Verify também checa previsões e blocos `visualizar` | `apps/api/scripts/content-verify.mts:50-51` e `:64-68` |
| Verify é portão **por convenção da equipe**, entre o pacote e a importação (fora do CI e sem trava técnica) | busca por `content:` em `.github/workflows/` sem ocorrências; o `content:verify` compila de novo em memória e não lê o pacote (`apps/api/scripts/content-verify.mts:34-39`); `seed.ts:221-224` (`seedContentBundle`) e `content.service.ts:25-34` (`importBundle`) importam sem consultar o verify; `docs/v2/curso-e-passos.md:263-265` descreve o uso; CI roda só `.github/workflows/ci.yml:130` (`verify:seed`) |
| Ordem recomendada check, build, verify | `docs/v2/arquitetura.md:99-109` (diagrama "Conteúdo do curso") |
| **runner real** (`RUNNER_URL`, `RUNNER_TOKEN`) | `apps/api/scripts/content-build.mts:40-41`; `apps/api/scripts/content-verify.mts:27-28` |
| **4a. Importação por `pnpm db:seed`** | `packages/db/src/scripts/seed.ts:221-224` (`seedContentBundle`, transação + `importContentBundle`); `packages/db/src/scripts/seed.ts:227-235` (varre `packages/db/seed/*.json`); `package.json:23` (`db:seed`) |
| **4b. `POST /api/admin/content/import`** (papel admin, corpo até 20 MB) | `apps/api/src/modules/content/content.controller.ts:10` (`CONTENT_IMPORT_PATH`), `:13-14` (`@Roles("admin")`, `admin/content`), `:19-22`; `apps/api/src/modules/content/content.service.ts:25-34` |
| Importação: upsert por slug, uma transação, ids preservados | `packages/db/src/content-import.ts:1-3` e `:46-51` (`importContentBundle`); `apps/api/src/modules/content/content.service.ts:34` (`transactions.run`); `packages/db/src/scripts/seed.ts:223` |
| Auditoria da importação | `apps/api/src/modules/content/content.service.ts:35` (`audit.log("content.import", ...)`) |
| **PostgreSQL**: cursos, módulos, lições, passos, trilhas, `content_assets` | `packages/db/src/content-import.ts:107` (`upsertCourse`), `:166` (`upsertLesson`), `:197` (`upsertTrack`), `:70` (`replaceCourseAssets`); `packages/db/src/schema/content.ts:204` (`content_assets`) |

## 05 - Modelo de dados ER (`05-modelo-dados-er.mmd`)

Todas as entidades vêm do schema Drizzle em `packages/db/src/schema/`. A linha é a da declaração `pgTable`.

| Entidade | Evidência | Relacionamentos (chave estrangeira) |
|---|---|---|
| `users` | `packages/db/src/schema/auth.ts:9` | `profiles.id -> users.id`: `packages/db/src/schema/profiles.ts:10` |
| `sessions` | `packages/db/src/schema/auth.ts:27` | `user_id`: `auth.ts:31` |
| `profiles` | `packages/db/src/schema/profiles.ts:7` | `role`: `profiles.ts:16`; nível, XP e sequência: `profiles.ts:17-19` |
| `courses` | `packages/db/src/schema/content.ts:13` | autorreferência `prerequisite_course_id`: `content.ts:33` |
| `modules` | `packages/db/src/schema/content.ts:50` | `course_id` (nulável): `content.ts:60` |
| `lessons` | `packages/db/src/schema/content.ts:73` | `module_id`: `content.ts:80`; `course_id`: `content.ts:97`; `test_cases` (gabarito): `content.ts:89`; `solution_files`: `content.ts:105` |
| `lesson_steps` | `packages/db/src/schema/content.ts:157` | `lesson_id`: `content.ts:161`; `test_cases`: `content.ts:171`; `solution_files`: `content.ts:168`; `quiz_questions`: `content.ts:175`; `expected_output`: `content.ts:182` |
| `lesson_quiz_questions` | `packages/db/src/schema/content.ts:130` | `lesson_id`: `content.ts:134`; `correct_index`: `content.ts:137` |
| `enrollments` | `packages/db/src/schema/learning.ts:8` | `user_id`, `course_id`: `learning.ts:12-13` |
| `lesson_progress` | `packages/db/src/schema/learning.ts:22` | `user_id`, `lesson_id`: `learning.ts:26-27` |
| `lesson_step_progress` | `packages/db/src/schema/learning.ts:50` | `user_id`, `step_id`: `learning.ts:54-55` |
| `submissions` | `packages/db/src/schema/learning.ts:86` | `user_id`, `lesson_id`: `learning.ts:90-91`; `step_id` (nulável, `set null`): `learning.ts:93` |
| `course_completions` | `packages/db/src/schema/learning.ts:116` | `user_id`, `course_id`: `learning.ts:120-121` |
| `tracks` | `packages/db/src/schema/tracks.ts:7` | - |
| `track_courses` | `packages/db/src/schema/tracks.ts:28` | `track_id`, `course_id`: `tracks.ts:31-32` |
| `track_certificates` | `packages/db/src/schema/tracks.ts:47` | `user_id`, `track_id`: `tracks.ts:51-52` |
| `exams` | `packages/db/src/schema/exams.ts:11` | `course_id` único: `exams.ts:15` |
| `exam_questions` | `packages/db/src/schema/exams.ts:38` | `exam_id`: `exams.ts:42`; `correct_index`: `exams.ts:45` |
| `exam_attempts` | `packages/db/src/schema/exams.ts:60` | `exam_id`: `exams.ts:64`; `user_id`: `exams.ts:65` |
| `certificates` | `packages/db/src/schema/exams.ts:80` | `user_id`, `course_id`: `exams.ts:84-85`; `project_status`: `exams.ts:88` |
| `events` | `packages/db/src/schema/events.ts:11` | `user_id` nulável (`set null`): `events.ts:15`; "só inserção": `events.ts:6-10` |
| `badges` | `packages/db/src/schema/gamification.ts:6` | - |
| `user_badges` | `packages/db/src/schema/gamification.ts:31` | `user_id`, `badge_id`: `gamification.ts:34-35` |
| Tabelas fora do desenho (existem) | `password_reset_tokens` (`auth.ts:47`), `oauth_accounts` (`auth.ts:56`), `notes` (`learning.ts:130`), `notifications`, `audit_log`, `platform_settings`, `teacher_approvals`, `library_catalog`, `library_requests`, `uploads` (`platform.ts:9-135`), `content_assets` (`content.ts:204`) | - |
| Valores dos enums usados nos comentários | `packages/contracts/src/users.ts:9` (papéis); `packages/contracts/src/steps.ts:14` (tipos de passo), `:22` (modos de exercício); `packages/contracts/src/lessons.ts:20` (`python`, `python-dados`), `:155` (`graded`, `error`) |

## 06 - Implantação (`06-implantacao.mmd`)

| Elemento | Evidência |
|---|---|
| **Desenvolvimento**: `compose.dev.yml` só com o PostgreSQL | `infra/compose/compose.dev.yml:1-4` (descrição); `infra/compose/compose.dev.yml:7-18` (`postgres:17-alpine`, porta `127.0.0.1:5432` em `:13`) |
| `pnpm dev`: web :3000, api :4000, runner :8081 (processos locais) | `docs/v2/ambientes-e-deploy.md:97-106` (seção "Desenvolvimento local"); `docs/v2/ambientes-e-deploy.md:7` |
| Runner em contêiner opcional (perfil `runner`) | `infra/compose/compose.dev.yml:20-44` (perfil em `:21`, porta em `:40`, `read_only` em `:41`, `tmpfs` em `:42`, `mem_limit` em `:44`) |
| **Homologação**: notebook, Docker Desktop, projeto `levelusp-homolog`, branch `develop` | `docs/v2/ambientes-e-deploy.md:5-9`; `infra/scripts/levelusp.ps1:1-4`; `infra/scripts/levelusp.ps1:30` (`$Project = "levelusp-$Env"`); `infra/scripts/levelusp.ps1:33` (`--profile tunnel`) |
| `levelusp.ps1` `up`, `update`, `seed`, `backup`, `install-autoupdate` | `infra/scripts/levelusp.ps1:80-93` (`up`: `pull`, sobe `tunnel`, lê a URL, sobe tudo); `:102-109` (`update`); `:110` (`seed`); `:116` (`backup`); `:137` (`install-autoupdate`); `:20` (comandos válidos) |
| Serviços `postgres`, `migrate`, `runner`, `api`, `web`, `tunnel` | `infra/compose/compose.yml:14`, `:31`, `:71`, `:111`, `:137`, `:161` |
| **Quick Tunnel**, URL `trycloudflare.com` muda a cada reinício | `infra/compose/compose.yml:161-168`; `infra/scripts/levelusp.ps1:57-61`; `docs/v2/ambientes-e-deploy.md:82-88` |
| Redes `app`, `data` (internal), `runner` (internal) | `infra/compose/compose.yml:170-174`; `api` nas três redes: `infra/compose/compose.yml:131` |
| Endurecimento do runner (read_only, cap_drop ALL, no-new-privileges, pids 128, mem 2g, 2 CPUs) | `infra/compose/compose.yml:99-109` (`mem_limit: ${RUNNER_MEMORY:-2g}` em `:108`, `cpus: ${RUNNER_CPUS:-2}` em `:109`) |
| `migrate` roda e sai antes da `api` | `infra/compose/compose.yml:31-39` (`restart: "no"`); `infra/compose/compose.yml:128-130` (`depends_on`) |
| Web em `127.0.0.1:WEB_PORT:3000` | `infra/compose/compose.yml:153-155` |
| **CI** (jobs `qualidade`, `api-e2e`, `seguranca`, `sandbox`, `e2e`, `docker`) | `.github/workflows/ci.yml:31`, `:49`, `:68`, `:95`, `:144`, `:193` |
| **CD** (`publicar`, só em push para `develop` ou `main`, depende dos cinco jobs) | `.github/workflows/ci.yml:210-214`; tags `ambiente` e `sha-<commit>`: `.github/workflows/ci.yml:230`; descrição em `docs/v2/ambientes-e-deploy.md:26-42` |
| **GHCR** (imagens `api`, `runner`, `web`) | `.github/workflows/ci.yml:226-230` (`image=ghcr.io/.../levelusp/<serviço>`); `infra/compose/compose.yml:32`, `:73`, `:113`, `:139` (`${REGISTRY:-ghcr.io/lip3bazinga/levelusp}`) |
| Seta GHCR -> notebook "puxa, nenhuma porta aberta para o GitHub" | `docs/v2/ambientes-e-deploy.md:39-42`; `infra/scripts/levelusp.ps1:82` e `:105` (`pull`) |
| **PLANEJADO - Produção em VM Linux** | `docs/v2/ambientes-e-deploy.md:9` ("VM Linux no lançamento"); `docs/v2/producao-vm.md:1-6` ("leva a produção do notebook para uma VM Linux"; "faltam só os itens que o responsável precisa providenciar"); `docs/v2/producao-vm.md:57` (seção "O que o responsável precisa providenciar") |
| VM: `compose.yml` + `compose.vm.yml`, projeto `levelusp-prod`, perfil `cloudflare` | `infra/compose/compose.vm.yml:1-6`; `infra/scripts/levelusp-vm.sh:69-77` (`INGRESS`: `cloudflare`, `caddy` ou `none`) |
| VM: entrada pública (túnel nomeado ou Caddy 80/443) | `infra/compose/compose.vm.yml:8-12` e `:130-151` (`cloudflared`, perfil `cloudflare`) e `:155-185` (`caddy`, portas em `:164-167`); `infra/caddy/Caddyfile` |
| VM: tetos `api` 1 CPU/768 MB, `runner` 1,5 CPU/**2 GB** (`RUNNER_MEMORY:-2g`), `postgres` 1 CPU/1 GB | `infra/compose/compose.vm.yml:103-104`, `:75` (`cpus`) e `:82-83` (`RUNNER_MEMORY`, `mem_limit`), `:54-55`; comentário do orçamento de 1536 MiB em `:76-80` |
| Memória do runner nos três ambientes: dev (contêiner opcional) 2g sem limite de CPU; homologação 2g e 2 CPUs; VM 2g e 1,5 CPU. Todos com `RUNNER_MEMORY_RESERVE_MB` 512 e pesos `python:0,dados:256,ml:1229` | `infra/compose/compose.dev.yml:37-39` e `:44`; `infra/compose/compose.yml:94-96`, `:108-109`; `infra/compose/compose.vm.yml:82-83` |
| VM: cron do host (health-check, backup cifrado, teste de restauração) | `docs/v2/producao-vm.md:35` (diagrama) e `:317-410` (seção 7, backups); `infra/scripts/backup.sh:1`; `infra/scripts/levelusp-vm.sh:21` (lista de comandos) |
| VM: deploy e rollback pela tag `IMAGE_TAG` | `docs/v2/producao-vm.md:54-55` (imagens e `IMAGE_TAG`); `docs/v2/producao-vm.md:283` (seção "Atualizar e voltar versão") |
| **OPÇÃO FUTURA, NÃO IMPLEMENTADA** - runner-dados com CPython real e **gVisor** | `docs/v2/decisoes-curso-2026-11-04.md:74-76` (D2, opção B, "gVisor na VM") e `:79-80` (opção D, "A agora e B depois, só na VM"). **Não existe no código**: busca por `gvisor` e `runsc` fora de `legacy/` só encontra esse documento |
| "Acrescentaria um terceiro Engine" | `apps/runner/src/engine.ts:46` (interface `Engine`); `apps/runner/src/executor.ts:12-15` (`EngineRegistry`); `docs/v2/decisoes-curso-2026-11-04.md:79-80` ("a interface `Engine` deixa isso pronto") |
