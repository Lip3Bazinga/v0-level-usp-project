# Pendências do curso completo — branch `feat/curso-completo`

Estado em 2026-11-06. Decisões: `decisoes-curso-2026-11-04.md` (escolhidas: 7 níveis + trilha;
Pyodide no runner; certificado = lições 100 % + prova ≥ 70 % + projeto; escopo = estrutura dos 7
níveis + Nível 1 completo). Especificação técnica: `curso-e-passos.md`.

## O que já está pronto (commits na branch)

| Frente | Resultado |
|---|---|
| Banco + contratos | migração `0004_curso_completo` (trilhas, passos, progresso por passo, `course_completions`, eventos, `submissions.status=error`, `experiment_condition`), contratos `steps/tracks/experiment/content-bundle`, curva de XP `xpForLevel`/`levelForXp`, `importContentBundle` em `packages/db/src/content-import.ts`, seed lê pacotes `format: 2`. |
| Runner | motor `python-dados` (Pyodide 314.0.7) atrás da interface `Engine`, pool por perfil (`dados`, `ml`), `setup:pyodide`, 16 ataques novos bloqueados. |
| Ferramentas de conteúdo | `pnpm content:build`, `content:check`, `content:verify` (`apps/api/scripts/content/`), guia `content/README.md`, exemplo `content/exemplo/`. |
| Currículo | `content/`: trilha `python-do-zero-a-ia`, 7 cursos, 54 módulos, 253 lições com roteiro, provas (N1 com 40 questões), `PLANO.md` do N1, `CURRICULO.md`. Pacote compilado `packages/db/seed/trilha-python-ia.json`. |
| Conteúdo N1 | 1 de 47 lições escrita e verificada: `06-funcoes/01-definir-e-chamar`. |

## O que falta (em ordem)

### P1 — API (`apps/api`)
Implementar a §4 e §8 de `curso-e-passos.md`:
1. `GET /lessons/:id` com `steps` (DTO público, sem `solution_files`/`test_cases`/`correct_index`), `runtime`, `is_project`, `objectives`, `solution_after_attempts`; tirar `solutionFiles` de `publicLessonColumns`; gravar `steps` na criação/edição de lição (`LESSON_PATCH.steps` hoje é placeholder).
2. `GET /me/lessons/:id/progress` com `steps: LessonStepProgress[]`.
3. Módulo `steps`: `POST /me/lessons/:id/steps/:stepId/{submit|hint|solution|complete|quiz}` — passos sequenciais; matrícula automática; `submissions.step_id`; `attempts++`; XP do passo via `GamificationService` (50 % se viu a solução); última etapa conclui a lição e avalia `course_completions`; solução só após `solution_after_attempts`; dica `hints_revealed++` (409 quando acabar); falha do runner → `status:"error"`, 503, tentativa não conta (também no `POST /me/lessons/:id/submit` atual).
4. Projeto (`is_project`) e prova só com as demais lições publicadas concluídas.
5. Certificado de curso = `course_completions` + prova aprovada; `POST /me/tracks/:id/certificate`; verificação pública do código de trilha; badge `certificates_issued`.
6. `modules/tracks`: `GET /tracks`, `GET /tracks/:slug` (status `locked|available|in_progress|completed|certified`), CRUD `/admin/tracks`.
7. `POST /admin/content/import` (admin, corpo até 20 MB, usa `importContentBundle`, auditoria).
8. Experimento: `POST /me/events` (append-only, 600/h), `GET /admin/experiment/export.csv`, `PATCH /admin/users/:id/experiment-condition`, eventos registrados no servidor, `experiment_condition` em `GET /me`.
9. Nível pela curva nova; streak por conclusão (não login); `GET /users/:id/activity` só dono/professor/admin; `created_by` fora do DTO público; `GET /health/ready` (banco + runner, 503 sem detalhes).
10. Testes: specs de domínio + e2e ponta a ponta da lição guiada até certificado de trilha; gabarito nunca vaza; importação do pacote real idempotente; suíte de segurança com forja nas rotas novas.
Pronto quando: `pnpm --filter @levelusp/api typecheck lint test test:e2e test:security test:attacks` verde.

### P2 — Web (`apps/web`)
§5 e §8 de `curso-e-passos.md`:
1. Player de passos na lição (lista de passos, narrativa, checkpoints ✓/✗, editor, Executar/Verificar, Dica n/3, Ver solução após N tentativas, leitura, quiz com revisão, Continuar, comemoração). Lições sem passos seguem na tela atual. Rascunho por passo em `localStorage` com try/catch.
2. `/trilhas`, `/trilhas/[slug]`, `/cursos/[id]` com módulos → lições, projeto, prova e certificado; bloco "Sua trilha" no painel; "Trilhas" no menu.
3. Curva de XP (`lib/utils/gamification.ts` sem `XP_PER_LEVEL`), `certificates_issued` no painel, textos de streak.
4. Condição `controle` (`useGamificationVisible()` esconde XP/nível/streak/badges/ranking); `lib/events.ts` (fila, lote a cada 5 s/20 eventos, `sendBeacon` no `pagehide`, sem código do aluno).
5. Limpeza da auditoria: `/settings` → `/perfil`; marketing sem números inventados; sem "Em breve"/"Não disponível"; sem OAuth; sem UI `final_project_*`; editor de lição do professor com `is_project`, `runtime`, `objectives` e editor de passos (envia `steps`).
6. HSTS em produção no `next.config.mjs`; `next/dynamic` para CodeMirror e Pyodide.
7. Testes vitest do player, trilhas, condição controle, eventos; `docs/v2/web-ui.md`.
Pronto quando: `pnpm --filter @levelusp/web typecheck lint test build` verde.

### P3 — Conteúdo do Nível 1 (46 lições restantes)
Para cada lição de `content/cursos/n1-fundamentos/<módulo>/` (exceto `06-funcoes/01-definir-e-chamar`, já pronta): manter o frontmatter e substituir o passo "Roteiro da lição" pelos passos reais descritos no `PLANO.md` (seção do módulo), no formato de `content/README.md`. Cada exercício: instruções numeradas (checkpoints), código inicial, solução, 1–3 dicas, verificação JSON com `checkpoint` em cada caso, ≥ 2 soluções erradas (sem laço infinito). Quiz com 2–3 perguntas.
Módulos: 01 (5 lições), 02 (6), 03 (5), 04 (7), 05 (7), 06 (6 restantes), 07 (5), 08 (4), 09 projeto (1).
Pronto quando: `pnpm content:check` OK e `pnpm content:verify --curso n1-fundamentos` com todos os passos `OK` contra o runner real; depois `pnpm content:build`.

### P4 — Integração e entrega
1. Merge de P1–P3 na branch; `pnpm build && pnpm lint && pnpm test`; e2e da API; `test:attacks` do runner (com `PYODIDE_DIR`).
2. Docs: `arquitetura.md`, `testes.md`, `divida-tecnica.md` (notebook/células, migrar módulos globais, remover `final_project_*` e `legacy/`, SMTP), atualizar `CURRICULO.md` com o estado.
3. Push da branch, PR para `develop` (merge commit, nunca squash), CI verde, imagens GHCR.
4. Homolog: `levelusp.ps1 update -Env homolog` (aplica migração 0004), importar o pacote (`POST /admin/content/import` ou `pnpm db:seed`), testar como aluno uma lição guiada ponta a ponta.
5. Operações pendentes de antes: apagar as 13 submissões falsas e a conta `aluno.teste.claude@levelusp.dev`; push do `fix/ps1-utf8-bom`; SMTP; promover professores; rotacionar a chave do Supabase e desligar Supabase/Vercel.

### P5 — Níveis 2–7 (sessões futuras)
Um nível por sessão: escrever o `PLANO.md` do nível a partir dos roteiros, escrever as lições, provas com 40 questões, `content:verify` (níveis 4–6 usam `runtime: python-dados`; precisa do Pyodide no runner: `pnpm --filter @levelusp/runner setup:pyodide`), publicar.
