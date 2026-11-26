# Motores, bibliotecas e IDE (Fase F)

Levantamento do que existe (itens 0 a 2 da fase) e, depois dele, o que a fase mudou. Cada afirmação do
levantamento aponta `arquivo:linha` do estado em `develop` antes da mudança (commit `314c71e`).

## 0. Levantamento

### 0.1 Módulo `library` da API

- Rotas (`apps/api/src/modules/library/library.controller.ts`): `GET /library` público, só ativas (l. 17-21);
  `POST /library/requests` e `GET /me/library/requests` para `teacher`/`admin` (l. 23-33); `GET /admin/library`,
  `PATCH /admin/library/:id`, `GET /admin/library/requests` e `POST /admin/library/requests/:id/review` só `admin` (l. 35-59).
  Entrada validada com Zod de `@levelusp/contracts` (`ZodPipe`, `UuidPipe`).
- Catálogo = tabela `library_catalog` (`packages/db/src/schema/platform.ts:90-104`): `name` único, `display_name`,
  `category`, `pyodide_native`, `active`. Não há seed: ela só enchia pela importação do Supabase
  (`packages/db/src/scripts/import-supabase.ts:88`) ou pela aprovação de um pedido
  (`library.service.ts:74-114`, `addToCatalog` com `upsertCatalog`, `library.repository.ts:41-50`).
  Num banco novo o catálogo nascia vazio.
- Pedido do professor = tabela `library_requests` (`platform.ts:111-126`): `library_name`, `display_name`, `description`,
  `use_case`, `status` (`pending|approved|rejected`), revisor e notas. `createRequest` limita por usuário
  (`RATE_LIMITS.libraryRequest`, `rate-limit.policies.ts:36`) e recusa um segundo pedido pendente do mesmo professor
  para a mesma biblioteca (`library.service.ts:48-61`, 409 `REQUEST_PENDING`).
- Como o pedido chega aos desenvolvedores: não há papel "desenvolvedor"; o papel `admin`
  (`packages/contracts/src/users.ts:9`) lista os pedidos em `GET /admin/library/requests` (com `requester_name`,
  `library.service.ts:68-71`) e a tela `apps/web/src/components/admin/libraries-page.tsx` aprova (com a categoria e
  `pyodide_native`) ou recusa. Aprovar inseria a biblioteca direto no catálogo de produção, na mesma transação,
  e notificava o professor (`library.service.ts:83-91`). Auditoria: `library.approve|reject|activate|deactivate`.
- Nada validava as bibliotecas de uma lição contra o catálogo: `lessons.libraries` é `text[]` livre
  (`packages/db/src/schema/content.ts:90`; `lessonInputSchema` aceita até 20 strings de 60 caracteres,
  `packages/contracts/src/lessons.ts:94`; `bundleLessonSchema`, `content-bundle.ts:78`).
  `publishBlocker` só olha casos de teste, questões e passos (`catalog.domain.ts:58-90`), chamado por
  `LessonsService.setPublished` (l. 161-165) e `update` de lição já publicada (l. 131-133).
  O `content:check` só exigia coerência com o runtime: `python-dados` pede bibliotecas e `python` não aceita
  (`apps/api/scripts/content/lint.ts:215-216`).
- Como a lição guarda e usa as bibliotecas: coluna `lessons.libraries` (conteúdo `bibliotecas:` do `.lvl.md`,
  `lesson-parser.ts:35`); a correção manda `runtime` e `libraries` ao executor só para `python-dados`
  (`grading.service.ts:53`, `learning.service.ts:77`, `steps.service.ts:75`); no navegador, `lesson.libraries` vira
  `usePython({ packages })` (`apps/web/src/contexts/ide-context.tsx:182-198`) e o worker usa `loadPackage` para o que está
  no `pyodide-lock.json` e `micropip` (PyPI) para o resto (`apps/web/src/lib/python/python-worker.ts:111-122`) — uma
  segunda via, fora de qualquer lista, que só a validação na publicação e no `content:check` fecha.
- Conteúdo atual: 113 lições `python-dados` com `numpy`, 41 com `pandas`, 28 com `scikit-learn`, 5 com `scipy`, 5 com `matplotlib`;
  141 lições `python` com `bibliotecas: []`.

### 0.2 Interface `Engine` do runner

- `apps/runner/src/engine.ts:46-65`: `Engine { name, versions, readiness, accept(request), warmupMs(request), run(batch), stats() }`.
  `EngineName = "wasi" | "pyodide"` (l. 4); pedido = `{ runtime, libraries }` (l. 22-25); lote = `{ files, entry, probes, limits, libraries }`
  (l. 31-37). Erros: `EngineRequestError` → 400 e `RuntimeUnavailableError` → 501 (`server.ts:84-85`).
- Implementações: `WasmtimeSandbox` (`sandbox.ts:103`, runtime `python`) e `PyodideEngine` (`pyodide-engine.ts:66`, runtime
  `python-dados`). O registro é `{ python: sandbox, "python-dados": pyodide }` em `main.ts:58`; `Executor.engineFor`
  (`executor.ts:86-89`) escolhe pelo runtime e `execute` (l. 112-130) chama `accept`, `warmupMs`, planeja os lotes e roda
  cada um sob o semáforo; lotes só de análise sempre vão para o motor `python`.
- Bibliotecas no motor Pyodide: `pyodide-profiles.ts:9-61` — perfis `dados` (numpy, pandas) e `ml` (+ scipy, scikit-learn,
  matplotlib, statsmodels, sympy, networkx), mapa `LIBRARY_PROFILES` (inclui o apelido `sklearn`) e `resolveProfile`, que
  lança `unknown_library` para o que está fora do mapa (l. 77-90). O que a imagem instala vem de
  `apps/runner/scripts/fetch-pyodide.sh:12` (`PACKAGES`, fechamento de dependências pelo lock), chamado em
  `infra/docker/runner.Dockerfile:18-21` e no job `sandbox` do CI.
- Protocolo de sondas: `harness.py` único (`apps/runner/python/harness.py`); o contrato do job está em
  `packages/contracts/src/runner.ts` (`PYTHON_RUNTIMES = ["python", "python-dados"]`, l. 18).

### 0.3 Editor de código do aluno (apps/web/src)

- `components/ide/code-editor.tsx`: `CodeEditor` (l. 72, CodeMirror, abas, botões Executar/Parar/Restaurar/Visualizar),
  `EditorTab` (l. 188), `IconAction` (l. 221), `RunButton` (l. 257, estado a partir de `PyodideStatus`).
  Carregado sob demanda por `next/dynamic` em `app/lesson/[id]/page.tsx:26` e em
  `components/lesson-steps/exercise-step.tsx:31` (uso em l. 289).
- `components/ide/console-panel.tsx:67` `ConsolePanel` (saída + campo de comando via `onRunCommand`), `file-explorer.tsx:227`
  `FileExplorer`, `responsive-workspace.tsx:33` `ResponsiveWorkspace`.
- Estado: `contexts/ide-context.tsx` — `IDEProvider` (l. 157) com arquivos, console, `IDERuntime` (`run`, `stop`, `verify`,
  `stdin`, l. 79-90) e a lição; Executar roda no navegador (`hooks/use-python.ts:68` `usePython` → worker compartilhado em
  `lib/python/pyodide-worker.ts`/`python-worker.ts`) e Verificar vai à API (correção no servidor).
- Lição guiada: `components/lesson-steps/exercise-step.tsx` usa o mesmo `CodeEditor`; `LessonLibrariesProvider`
  (`lesson-libraries-context.tsx:19`) entrega `lesson.libraries` aos passos; `use-execution-trace` pede `packages` ao worker
  (`lib/python/trace-client.ts:20`).
- Editor do professor: `components/teacher/lesson-editor/libraries-tab.tsx:42` lista o catálogo (`GET /library`) por
  categoria, marca "nativo" quando `pyodide_native` e abre `LibraryRequestModal` (`POST /library/requests`).

## 1. Manifesto único de bibliotecas

Fonte única: `packages/contracts/src/library-manifest.ts` (`LIBRARY_MANIFEST`). Cada entrada tem `name` (nome do pacote
como no `pyodide-lock.json`, PEP 503), `version` fixada, `aliases` (ex.: `sklearn`), `display_name`, `description`,
`category`, `browser` (disponível no Pyodide do navegador), `engines` (runtimes do servidor que a oferecem:
`python-dados` e/ou `python-completo`) e `pyodide_profile` (`dados` ou `ml`, o perfil de worker mínimo do motor Pyodide;
`null` quando só o `python-completo` a oferece, como o `torch`).

O que é derivado dele (nada é copiado à mão):

- Catálogo da API: ao subir, a API sincroniza `library_catalog` com o manifesto (insere o que falta e atualiza os dados de
  exibição; não mexe em `active`, que continua sendo o interruptor operacional do admin). `GET /library` só devolve o que
  está no manifesto e ativo. Linhas antigas fora do manifesto ficam na tela do admin, mas não aparecem ao professor.
- `content:check`: recusa a lição cujas bibliotecas não estão no manifesto para o runtime dela (mensagem diz se falta no
  manifesto ou se só não existe naquele runtime). O `content:verify` deriva do manifesto quais lições usam o perfil pesado.
- API: o mesmo teste decide a publicação (ver 2).
- CI (teste do runner, `apps/runner/test/library-manifest.test.ts`, roda no job `qualidade` e no `sandbox`): confere cada
  pacote com `browser` contra o `pyodide-lock.json` da dependência `pyodide` (existe e tem a mesma versão), confere o
  `PACKAGES` do `fetch-pyodide.sh` e os perfis/mapa de bibliotecas do runner (`pyodide-profiles.ts`) contra o manifesto, e
  confere o hash do lock contra `apps/web/src/lib/python/pyodide-runtime.json`. Diferença quebra o CI com a lista do que falta.
- Motor `python-completo` (§6): as bibliotecas que ele aceita são lidas direto do manifesto (`engines` contém
  `python-completo`), e o mesmo teste do runner confere os `requirements*.txt` da imagem contra as versões do manifesto.
  Os perfis do motor Pyodide continuam conferidos por teste, não derivados (ver `divida-tecnica.md`).

## 2. Solicitação de biblioteca pelo professor

- Biblioteca "pendente" = a que a lição usa e ainda não está no manifesto para o runtime dela. Lição com biblioteca
  pendente não publica: `setPublished` e o `update` de lição publicada respondem 422 `LIBRARY_PENDING` (fora do manifesto)
  ou `LIBRARY_RUNTIME` (no manifesto, mas não no runtime da lição), com a lista das bibliotecas na mensagem.
- Pedir uma biblioteca que já está no manifesto responde 409 `ALREADY_AVAILABLE`.
- Aprovar não altera mais o catálogo de produção: marca o pedido `approved`, notifica o professor ("aprovada; entra no
  catálogo na próxima atualização da plataforma") e devolve `manifest_snippet`, a entrada pronta para colar no manifesto.
  Quem fecha o ciclo é um PR no repositório (o teste de CI do item 1 exige a versão certa do lock), que ao ser publicado
  faz a API sincronizar o catálogo no próximo start.
- Para o admin/desenvolvedor enxergar o que falta: `GET /admin/library/manifest-pending` lista os pedidos aprovados cuja
  biblioteca ainda não está no manifesto, uma linha por biblioteca, com `manifest_snippet` (versão como `"?"`: o teste do
  CI recusa o `"?"` até alguém preencher a do lock).
- Sem migração: o estado "aprovado e fora do manifesto" é calculado, não guardado.
- `manifest_snippet` é um literal TypeScript gerado com `JSON.stringify` (o texto do pedido não consegue fechar aspas nem
  injetar código); a categoria e `pyodide_native` (→ `browser`) vêm do `catalog` enviado na revisão, e a listagem de
  pendências usa `general` e `browser: true`. O PR acrescenta o literal em `LIBRARY_MANIFEST` (ordem alfabética), troca
  `"?"` pela versão do `pyodide-lock.json`, acrescenta o pacote ao `PACKAGES` de `fetch-pyodide.sh` e ao mapa e à
  lista de pacotes do perfil em `pyodide-profiles.ts`; o teste de `apps/runner/test/library-manifest.test.ts` aponta o que faltar.
- `GET /admin/library/manifest-pending` lista, para sempre, todo pedido aprovado cuja biblioteca não está no manifesto,
  inclusive os antigos importados do Supabase: elas só saem da lista quando entram no manifesto (por PR). Para
  esvaziá-la, leve ao manifesto as que valem a pena.
- Lição publicada antes do manifesto não é reavaliada: o `update` só checa biblioteca quando o PATCH traz `libraries` ou `runtime`.
- A tela do admin (`libraries-page.tsx`) só mudou o aviso ao aprovar; mostrar a lista de pendências fica na dívida técnica.

## 3. "Testar gabarito" no editor do professor

- **O que faz.** Na aba Passos de uma lição guiada, o botão "Testar gabarito" envia cada passo de exercício do rascunho
  (ainda não salvo) e mostra o resultado por passo: a solução de referência tem que aprovar, o código inicial tem que
  reprovar e cada solução errada tem que reprovar. É a mesma regra do `content:verify`: os dois usam
  `apps/api/src/modules/authoring/step-verification.domain.ts` (`planStepVerification`/`concludeStepVerification`).
  No editor, passo sem solução errada não é falha (no `content:verify` é).
- **Rotas** (`modules/authoring`, só `@Roles("teacher", "admin")`, nada é lido nem gravado no banco):
  `POST /api/teacher/draft-steps/verify` (um passo por pedido; a web chama em sequência) e
  `POST /api/teacher/draft-steps/submit` (corrige uma submissão contra o passo do rascunho e devolve `StepSubmitResult`
  com a gamificação zerada). A segunda é o "Verificar" da prévia: `preview-verify.ts` liga o ponto de extensão `verify`
  de `createPreviewBackend`.
- **Limite.** `RATE_LIMITS.draftStepGrading`: 60 execuções por minuto por usuário, somando as duas rotas (o `verify`
  reserva 1 + inicial + número de erradas antes de rodar; sem saldo, 429 sem executar nada) e um pedido por vez por
  usuário (o segundo recebe 409 `DRAFT_GRADING_IN_PROGRESS`; a trava é por instância da API). Executor ocupado devolve
  à cota só o que não rodou.
- **Soluções erradas.** Não existem no banco (`wrong_solutions` só vive no pacote de conteúdo): o painel aceita até 5
  por passo, guardadas em memória enquanto o editor está aberto; elas acompanham o passo ao mover ou remover.
- **Limitações.** Só lição guiada; lição com mais de ~30 exercícios bate o limite no meio do teste e o reteste recomeça
  do primeiro passo; "Verificar" na prévia durante um teste recebe 409; lição `python-completo` com caso `unittest` é
  recusada na correção (422), não na publicação.

## 4. Executar por nível

- **Regra (só de interface).** Na lição do aluno o botão "Executar" fica bloqueado até o jogador chegar ao nível
  do limite; antes disso ele roda o código pelo terminal do navegador (`python main.py`). O "Executar" roda no
  navegador, então a API não valida nada: não é regra de segurança. "Verificar" e "Visualizar" não mudam.
- **Constante e função pura** (`packages/contracts/src/run-button.ts`): `RUN_BUTTON_MIN_LEVEL = 10`,
  `resolveRunButtonMinLevel(limiteDoCurso)` e `isRunButtonUnlocked(nivelDoJogador, limiteDoCurso)`.
- **Ajuste por curso.** `courses.run_button_min_level` (migração `0007_executar_por_nivel_e_python_completo`; inteiro ≥ 1, nulo = usa a
  constante, 1 = sempre liberado). Entra em `courseInputSchema`/`courseUpdateSchema` (1 a 100 ou `null`) e sai em
  `Course`. Só o admin muda o valor (`PATCH /courses/:id` responde 403 ao professor que tentar; reenviar o valor atual
  é aceito) e a mudança vai para a auditoria (`course.run_button_min_level`, com `from`/`to`). Tela: Admin → Cursos →
  botão "Nível do Executar" de cada curso (`run-level-modal.tsx`). O pacote de conteúdo (`curso.yaml`) não tem o
  campo: reimportar o conteúdo preserva o que o admin gravou.
- **Como chega à web.** `GET /lessons/:id` devolve `run_button_min_level` (o do curso da lição; `null` em lição
  avulsa ou curso sem ajuste). Sem rota nova; as listagens de lições não trazem o campo.
- **Quem nunca fica bloqueado.** Professor e admin (pelo papel do perfil) e a prévia do professor (os passos só
  recebem o bloqueio dentro do `RunButtonGateProvider`, que só o player do aluno monta).
- **Web** (`components/lesson-steps/run-button-gate.tsx`): `useRunButtonGate` compara `profile.level` do
  `AuthContext` com o limite; quando o aluno sobe de nível o perfil é recarregado e o botão libera sem recarregar a
  página. Bloqueado: botão desabilitado com cadeado, faixa "Executar libera no nível N; até lá, use o terminal:
  python main.py", a aba Terminal abre no lugar do Console e o atalho Ctrl+Enter (lição clássica) só escreve o
  motivo no console. Na lição clássica o "Verificar" deixa de exigir uma execução pelo botão enquanto ele está
  bloqueado, e o console ganhou a aba Terminal. O grupo `controle` do experimento segue a mesma regra, mas a faixa
  não cita o nível ("Por enquanto, rode seu código pelo terminal: python main.py").
- **A conta** (`node scripts/nivel-do-executar.mjs [nível] [curso]`, sobre `packages/db/seed/trilha-python-ia.json`).
  Aluno típico: tudo em ordem, sem ver solução. XP contado: o de cada passo mais o da lição; badges, sequência,
  provas e certificados não dão XP e ficam fora. O Nível 1 inteiro soma 8 010 XP (nível 5); o nível 10 pede
  27 000 XP e só chega na lição 25 do N4 (`n4-m6-03-estatistica-descritiva`, 146ª lição da trilha).

  | Nível | XP | Lição em que chega |
  |---|---|---|
  | 2 | 1 000 | N1, lição 8 (`n1-m2-03-numeros-e-operadores`) |
  | 3 | 2 500 | N1, lição 17 (`n1-m4-01-while`) |
  | 4 | 4 500 | N1, lição 28 (`n1-m5-05-dicionarios`) |
  | 5 | 7 000 | N1, lição 43 (`n1-m8-01-tipos-de-erro-e-tracebacks`) |
  | 10 | 27 000 | N4, lição 25 (`n4-m6-03-estatistica-descritiva`) |

  Com o padrão 10 o aluno termina três níveis inteiros sem o botão. **Proposta (não aplicada, decisão do Filipe):**
  limite 4 — libera na 5ª lição do módulo 5 do N1, depois de os módulos 2 a 4 terem sido feitos pelo terminal — ou 3,
  se a ideia for liberar já na entrada do módulo 4. Dá para aplicar só ao N1 pela tela do admin, sem mexer na constante.

## 6. Motor `python-completo` (CPython nativo em gVisor)

Terceiro motor do executor, para o que o WebAssembly não roda: **PyTorch**. Runtime de lição `python-completo`
(`LESSON_RUNTIMES`/`PYTHON_RUNTIMES` em `packages/contracts`; a migração `0007_executar_por_nivel_e_python_completo` amplia o `CHECK` de
`lessons.runtime`). Bibliotecas: `numpy`, `pandas`, `scikit-learn` (mesmas versões do Pyodide) e `torch` 2.15.0 só CPU
(apelido `pytorch`; `browser: false`). **Desligado por padrão** em todo ambiente: sem ele o executor responde 501
(`runtime_unavailable`) e a API mostra "corretor indisponível".

- **Como roda** (`apps/runner/src/native-engine.ts`, `Engine` de nome `nativo`). Cada lote roda num contêiner Docker de
  uso único, criado por `docker run` com `--runtime=runsc` (gVisor), `--network=none`, `--read-only`, tmpfs só em `/work`
  (projeto, `MAX_JOB_DISK_MB`) e `/tmp` (16 MB), ambos `noexec`, usuário `65534`, `--cap-drop=ALL`, `no-new-privileges`,
  `--cpus`, `--memory` (= `--memory-swap`), `--pids-limit`, `--ulimit` de CPU/arquivos, `--pull=never` e `--log-driver=none`.
  Nenhum volume, socket ou variável do executor entra no contêiner. Lista completa e motivo de cada item:
  `buildDockerRunArgs`.
- **Protocolo.** O mesmo `harness.py` e as mesmas sondas dos outros motores. O contêiner sobe com
  `python -I -B -c <native_bootstrap.py>`; o lote entra todo pela entrada padrão: um cabeçalho (`<n>\n` + JSON com os
  arquivos do aluno e o código do harness, que o bootstrap grava em `/work`) e depois o JSON das sondas (nonce + ids
  posicionais), que o harness lê até o fim antes de rodar o aluno. As observações voltam pela saída padrão com o nonce.
  A comparação com o gabarito continua na API: nenhum valor esperado entra no contêiner.
- **Sem modo estrito.** O motor recusa sondas `unittest` e `legacy` (com `ctypes` o aluno lê os frames do harness, onde
  estariam a referência do professor e os asserts): `content:check` reprova a lição, a API responde 422
  `UNSUPPORTED_CASES` sem chamar o executor e o executor responde 400 `strict_unsupported`. Casos aceitos: `io`, `call`,
  `variable`, `source` e `expr`. Detalhes e o que o aluno alcança nas sondas aceitas: `seguranca.md`.
- **Pool aquecido.** `RUNNER_NATIVE_WARM` contêineres ficam prontos (interpretador no ar e `RUNNER_NATIVE_PRELOAD`
  importado) esperando um lote; cada um atende um lote e morre, e o pool é reposto depois. Sem contêiner pronto o lote
  sobe o próprio. Contêiner ocioso que morre não é reposto em laço (5 s de espera; depois de 3 mortes seguidas só volta
  no próximo lote). Na partida o motor remove órfãos pelo rótulo `levelusp.engine=python-completo`: por isso, **um
  executor por daemon do Docker**.
- **Limites.** Tempo de parede do lote (`limits.timeoutMs`; ao vencer, o contêiner é removido à força), saída (8 MB) e
  os do contêiner. `limits.memoryMb` do job não se aplica: o teto é `RUNNER_NATIVE_MEMORY_MB`, fixado na criação do
  contêiner. Contêiner morto pelo teto de memória (código 137) vira "Memória insuficiente". Os contêineres são irmãos
  do executor (fora do cgroup dele): não entram no orçamento `RUNNER_MEMORY`; o teto real é
  (`CONCURRENCY` + pool) × `RUNNER_NATIVE_MEMORY_MB`.
- **Runtime conferido duas vezes.** Além do `docker info`, o autoteste da partida lê com `docker inspect` o runtime
  efetivo do contêiner criado; se divergir do exigido o motor se bloqueia (501 para todo job). O `NODE_ENV` que libera
  o `runc` é o cru do ambiente: ausente não é `development`.
- **Política runsc/runc** (`native-policy.ts`, conferida na partida com `docker info`). Há `runsc` → usa `runsc`. Não
  há → só sobe com `runc` se `RUNNER_ALLOW_INSECURE_NATIVE=1` **e** `NODE_ENV=development` (aviso no log, `INSEGURO` nas
  versões da resposta). Qualquer outro caso: o motor não sobe, o resto do executor segue e o runtime responde 501.
- **Imagem** (`infra/docker/python-completo.Dockerfile`): `python:3.14.10-slim-bookworm` fixada por digest; rodas
  instaladas com `--require-hashes --only-binary=:all: --no-deps` a partir de `infra/docker/python-completo/requirements.txt`
  (numpy 2.4.6, pandas 3.0.2, scikit-learn 1.8.0, scipy 1.18.0) e `requirements-torch.txt` (`torch==2.15.0+cpu`, do
  índice CPU do PyTorch). `--build-arg WITH_TORCH=0` gera a variante enxuta (643 MB) usada no CI. Para trocar versões:
  edite os `.in` e rode `travar.sh` dentro da imagem base. O executor nunca baixa imagem: ela precisa existir no daemon.
- **Variáveis** (`apps/runner/src/config.ts`): `RUNNER_NATIVE_ENGINE` (`off`|`gvisor`), `RUNNER_ALLOW_INSECURE_NATIVE`,
  `RUNNER_NATIVE_IMAGE` (padrão `levelusp/python-completo:local`), `DOCKER_BIN`, `RUNNER_NATIVE_WARM` (1),
  `RUNNER_NATIVE_MEMORY_MB` (1024), `RUNNER_NATIVE_CPUS` (1), `RUNNER_NATIVE_PIDS_LIMIT` (64),
  `RUNNER_NATIVE_BOOT_TIMEOUT_MS` (60000), `RUNNER_NATIVE_PRELOAD` (`numpy,pandas`), `NATIVE_BOOTSTRAP_PATH`.
- **Executar e terminal numa lição `python-completo`.** O navegador (Pyodide) não tem PyTorch. Regra: o Executar, o
  terminal e o Visualizar carregam só as bibliotecas da lição com `browser: true` no manifesto
  (`splitBrowserLibraries`, aplicado em `use-python.ts` e `trace-client.ts`); as demais não são nem tentadas. O aluno
  vê o aviso "torch só existe na correção do servidor… Use Verificar" (no console ao abrir a lição clássica e a cada
  Executar na lição guiada), e um `import torch` no navegador falha com `ModuleNotFoundError`. O Verificar roda tudo
  no servidor. Consequência para quem escreve conteúdo: numa lição `python-completo`, o que depende de `torch` só é
  conferível pelo Verificar; passos de exploração (numpy/pandas) continuam rodando no navegador.
- **Conteúdo.** `content:check` aceita `runtime: python-completo` com as bibliotecas que o manifesto libera para ele
  (exige ao menos uma) e recusa as demais ("biblioteca sem motor para o runtime python-completo"); a publicação pela
  API usa a mesma regra (`LIBRARY_RUNTIME`). `content:verify` trata toda lição `python-completo` como pesada (um lote
  por vez) e só passa com o motor ligado no executor usado.
- **Para experimentar em desenvolvimento (sem gVisor, modo inseguro):** construa a imagem enxuta
  (`docker build -f infra/docker/python-completo.Dockerfile --build-arg WITH_TORCH=0 -t levelusp/python-completo:local .`)
  e rode o executor **fora** de contêiner com `RUNNER_NATIVE_ENGINE=gvisor RUNNER_ALLOW_INSECURE_NATIVE=1 NODE_ENV=development`.
- **Produção.** Não ligado em `compose.yml` (valor fixo `off`) e o serviço `runner` não recebe o socket do Docker.
  O desenho proposto para ligar, os riscos e o que falta estão em
  [seguranca.md](./seguranca.md#motor-python-completo-cpython-nativo-em-gvisor).

## Testes

- Motor `python-completo`: `apps/runner/test/native-engine.test.ts` (Docker simulado: argumentos de isolamento, política
  runsc/runc, liga/desliga, pool, protocolo, tempo, saída, memória, partida que falha) e
  `apps/runner/test/attacks/native.attack.ts` (Docker real, só com `runsc`: rede, disco, `noexec`, segredos, privilégio,
  tempo, memória, fork bomb, saída, uso único). O job `gvisor` do CI instala o runsc (SHA-512 conferido), constrói a
  imagem enxuta e roda os ataques com `NATIVE_ATTACKS_REQUIRED=1` (sem runsc o teste falha em vez de pular).
  `library-manifest.test.ts` do runner confere os `requirements*.txt` (versões do manifesto, hash em toda roda).
- Executar por nível: `packages/contracts/src/run-button.test.ts`, `catalog.domain.spec.ts` (`canSetRunButtonLevel`),
  `run-button-gate.test.tsx`, `exercise-step-run-lock.test.tsx`, `run-toolbar.test.tsx`, `ide-context.test.tsx`,
  `console-terminal-tabs.test.tsx` e `run-level-modal.test.tsx`. Sem e2e novo para o PATCH do curso.
- `packages/contracts/src/library-manifest.test.ts` (consistência do manifesto, normalização, apelidos, `checkLibraries`).
- `apps/runner/test/library-manifest.test.ts` (manifesto × lock × `PACKAGES` × perfis do runner).
- `apps/api/test/unit/content/lint.test.ts` (content:check recusa biblioteca fora do manifesto) e
  `catalog.domain.spec.ts`/`library.domain.spec.ts` (bloqueios de publicação e rascunho do manifesto).
- e2e (`test/e2e/platform.e2e.ts`, `catalog.e2e.ts`): sincronização do catálogo, pedido → aprovação → pendência,
  publicação bloqueada e liberada; `test/security/route-matrix.e2e.ts` inclui a rota nova.
