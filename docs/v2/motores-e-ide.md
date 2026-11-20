# Motores, bibliotecas e IDE (Fase F)

Levantamento do que existe (itens 0 a 2 da fase) e, depois dele, o que a fase mudou. Cada afirmação do
levantamento aponta `arquivo:linha` do estado em `develop` antes da mudança (commit `314c71e`).

## 0. Levantamento

### 0.1 Módulo `library` da API

- Rotas (`apps/api/src/modules/library/library.controller.ts`): `GET /library` público, só ativas (l. 132-136);
  `POST /library/requests` e `GET /me/library/requests` para `teacher`/`admin` (l. 138-148); `GET /admin/library`,
  `PATCH /admin/library/:id`, `GET /admin/library/requests` e `POST /admin/library/requests/:id/review` só `admin` (l. 150-174).
  Entrada validada com Zod de `@levelusp/contracts` (`ZodPipe`, `UuidPipe`).
- Catálogo = tabela `library_catalog` (`packages/db/src/schema/platform.ts:90-104`): `name` único, `display_name`,
  `category`, `pyodide_native`, `active`. Não há seed: ela só enchia pela importação do Supabase
  (`packages/db/src/scripts/import-supabase.ts:88`) ou pela aprovação de um pedido
  (`library.service.ts:73-114`, `addToCatalog` com `upsertCatalog`, `library.repository.ts:216-225`).
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
  no `pyodide-lock.json` e `micropip` (PyPI) para o resto (`apps/web/src/lib/python/python-worker.ts:117-123`) — uma
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
`category`, `browser` (disponível no Pyodide do navegador), `engines` (runtimes do servidor que a oferecem, hoje só
`python-dados`) e `pyodide_profile` (`dados` ou `ml`, o perfil de worker mínimo do executor).

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
- Fora do escopo (item 6): quando o motor `python-completo` entrar, ele ganha um valor em `engines` e o runner passa a
  derivar `LIBRARY_PROFILES` do manifesto em vez de só ser conferido contra ele.

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
