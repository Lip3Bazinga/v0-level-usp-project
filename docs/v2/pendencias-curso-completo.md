# Pendências do curso completo — branch `feat/curso-completo`

Estado em 2026-11-13 (P1 e P2 concluídos; próximo passo: P2b — recursos de apresentação das aulas). Decisões: `decisoes-curso-2026-11-04.md` (escolhidas: 7 níveis + trilha;
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
| API (P1) | Concluído em 2026-11-13 (commits `31e7fa6` e `a857607`): passos da lição guiada, trilhas, certificado de trilha, importação de conteúdo, experimento, saúde. `pnpm --filter @levelusp/api typecheck lint test test:e2e test:security test:attacks` verde (275 unitários, 138 e2e, 108 de segurança, 40 ataques contra o runner real). Detalhes na seção P1. |

## O que falta (em ordem)

### P1 — API (`apps/api`) — CONCLUÍDO em 2026-11-13
O que existe agora (é o contrato que a web do P2 consome):

| Rota | Observação |
|---|---|
| `GET /lessons/:id` | traz `steps` públicos (`test_case_count`, `hint_count`, quiz sem `correct_index`/`explanation`). `created_by` saiu do DTO público e ficou em `LessonWithTests`, que ganhou `authoring_steps` (passos com gabarito, no formato que `steps` aceita de volta). |
| `POST`/`PATCH /lessons` | `steps` substitui todos os passos (id preservado por posição). Lição `guided` publicada sem passos → 422 `NO_STEPS`. |
| `GET /me/lessons/:id/progress` | `LessonStepsProgress` (`status` da lição + `steps`). |
| `POST /me/lessons/:id/steps/:stepId/submit` | exercício; 409 `STEP_LOCKED` fora de ordem; 400 `WRONG_STEP_KIND`; 403 `PROJECT_LOCKED`; 503 grava `submissions.status = error` e não conta tentativa. |
| `POST …/hint` e `GET …/hints` | uma dica por chamada (409 `NO_MORE_HINTS`); o `GET` devolve as já reveladas, para a tela reabrir. |
| `POST …/solution` | 403 `SOLUTION_LOCKED` antes de `solution_after_attempts`; ver a solução NÃO conclui o passo: marca `solution_viewed` e a aprovação seguinte vale 50 % do XP. |
| `POST …/complete`, `POST …/quiz` | leitura e quiz. No quiz reprovado a explicação só acompanha a questão acertada. |
| `GET /tracks`, `GET /tracks/:slug` | públicos; com sessão, `student_status` por curso. Visitante só vê cursos publicados. |
| `/admin/tracks` (CRUD) | admin. |
| `POST /me/tracks/:id/certificate`, `GET /me/track-certificates` | código `TRL-XXXX-XXXX`; `GET /certificates/:code` e o PDF aceitam os dois tipos (`kind: "course" \| "track"`). |
| `POST /admin/content/import` | admin, corpo até 20 MB, transação única, idempotente. |
| `POST /me/events`, `GET /admin/experiment/export.csv`, `PATCH /admin/users/:id/experiment-condition` | 600 eventos/h por usuário; o servidor registra sozinho `login`, `step_submitted`, `step_completed`, `hint_revealed`, `solution_viewed`, `lesson_completed`, `quiz_answered`, `exam_started`, `exam_submitted`, `certificate_issued`. |
| `GET /health/ready` | 503 quando banco ou executor falham. |
| `GET /users/:id/activity` | agora exige sessão: dono, professor ou admin. |

Decisões tomadas na implementação (ajustar aqui se alguma não for a desejada):
- As rotas clássicas mantiveram os caminhos que já existiam (`POST /lessons/:id/submissions`, `POST /courses/:id/certificate`); só as de passo e de trilha ficam sob `/me`.
- XP da lição guiada = soma do XP dos passos + `xp_reward` da lição ao fechar o último passo.
- Sequência (streak) conta dias com conclusão; o login não mexe mais nela e a resposta de login não traz mais `streak`. `current_streak` é calculado na leitura (zera quando a última conclusão não foi hoje nem ontem).
- A prova libera com as lições que não são projeto; o certificado exige `course_completions` (100 %, com o projeto) + prova.
- Prévia do professor em lição não publicada conclui o passo sem XP.
- `express` virou dependência direta da API (parser de 20 MB só na rota de importação).

O que o P2 precisa acompanhar na web: `Lesson.created_by` não existe mais; `CertificateVerification.kind`; `SessionResponse.streak` deixou de vir (tirar a animação de sequência do login e mostrá-la na conclusão).

### P2 — Web (`apps/web`) — CONCLUÍDO em 2026-11-13
Descrição das telas em `web-ui.md`. `pnpm --filter @levelusp/web typecheck lint test build` verde (55 arquivos de teste, 256 testes).

Feito: player de passos; `/trilhas` e `/trilhas/[slug]` com dados reais; `/cursos/[id]` por módulos com
projeto do nível, prova e certificado; bloco "Sua trilha" e "Trilhas" no menu; curva de XP; badge de
certificados no painel; condição `controle`; `lib/events.ts`; limpeza da auditoria; editor do professor
com passos, `is_project`, `runtime` e objetivos; HSTS; `next/dynamic` para o editor e o player.

Decisões tomadas na implementação (ajustar aqui se alguma não for a desejada):
- O último lote de eventos sai por `fetch` com `keepalive`, não por `sendBeacon`: o beacon não envia o
  cabeçalho anti-CSRF e a API devolveria 403.
- "Configurações" não era inerte (edita perfil e troca senha): em vez de removida, foi para `/perfil/me/conta`.
- Números inventados: saíram a página `/impacto` e os contadores da home. **Ficaram para revisão do
  Filipe** a linha do tempo de `/sobre` (anos e "200 estudantes"), as páginas Equipe e Parceiros e as
  porcentagens com citação da home (+76 %, +50 %): não há como conferi-las pelo repositório.
- O grupo `controle` continua recebendo XP na API; só a interface esconde.

Não verificado nesta sessão: os testes Playwright (`pnpm --filter @levelusp/web test:e2e`), que
precisam da pilha inteira no ar; dois deles (`e2e/ux/*.spec.ts`) tiveram só as rotas atualizadas.

### P2b — Recursos de apresentação das aulas (antes do P3)
Decidido em 2026-11-13: as lições só são escritas depois que o formato e o player suportarem estes
recursos, para não reescrever conteúdo depois. Escopo: `content/README.md` + compilador/lint
(`apps/api/scripts/content/`), contratos (`packages/contracts`), web (player) e, onde houver
correção nova, API.
1. **Fórmulas (KaTeX):** `$…$` e `$$…$$` em narrativas, instruções, dicas e quizzes
   (`remark-math` + `rehype-katex`, CSS do KaTeX local); o lint valida cada fórmula com o parser
   do KaTeX. Essencial nos Níveis 5–6.
2. **Diagramas e imagens:** blocos ```mermaid renderizados no player (carregados sob demanda);
   imagens em `content/cursos/<nível>/<módulo>/assets/` referenciadas como `![texto alternativo](assets/x.svg)`;
   o compilador inclui os arquivos no pacote (campo `assets`, caminho → conteúdo + tipo, limite por
   arquivo) e a API os serve; o lint exige texto alternativo, arquivo existente e Mermaid válido.
3. **Visualizador de execução (estilo Python Tutor):** bloco ```python visualizar na narrativa e botão
   "Visualizar" no editor: roda no Pyodide do navegador com `sys.settrace`, registra linha, variáveis
   locais/globais e saída a cada passo (limite de 500 passos) e mostra com anterior/próximo/slider,
   destacando a linha e as variáveis que mudaram. Não envolve correção.
4. **Novos formatos de exercício:**
   - `modo: lacunas` — código com `___` para completar; correção pelos mesmos casos de teste.
   - `modo: ordenar` (problema de Parsons) — linhas embaralhadas (com distratores opcionais) que o
     aluno arrasta e indenta; o código montado é corrigido pelos mesmos casos de teste no servidor.
   - passo `Previsão` — o aluno lê um código e digita a saída que espera; a saída esperada fica só
     na API (gerada pelo `content:build` executando o código no runner) e é comparada sem espaços
     extras; dá XP e tem dicas como os demais.
   Contratos, formato `.lvl.md`, lint, `content:verify` (lacunas/ordenar: a solução montada aprova e
   a ordem embaralhada reprova), API (correção de `Previsão`) e player.
5. **Vídeo opcional:** `::video[título](url)` só para YouTube (`youtube-nocookie.com`) e Vimeo,
   com `frame-src` restrito no CSP; sempre com resumo em texto ao lado (acessibilidade).
6. **Atualizar `PLANO.md` do Nível 1** para usar os recursos: diagramas no módulo 1 (hardware,
   compilação, sistema operacional), visualizador nos módulos 3–6 (laços, listas, funções, recursão),
   `ordenar`/`lacunas` nas primeiras lições de cada módulo, `Previsão` em todo módulo, fórmulas
   onde houver conta (binário, IMC, juros).
7. Células estilo notebook ficam para o Nível 4 (P5), em cima do motor `python-dados`.
Pronto quando: `content/exemplo` usa todos os recursos, `content:check`/`content:verify` passam, o
player renderiza tudo (testes vitest) e `pnpm build && pnpm lint && pnpm test` estão verdes.

### P3 — Conteúdo do Nível 1 (46 lições restantes)
Para cada lição de `content/cursos/n1-fundamentos/<módulo>/` (exceto `06-funcoes/01-definir-e-chamar`, já pronta): manter o frontmatter e substituir o passo "Roteiro da lição" pelos passos reais descritos no `PLANO.md` (seção do módulo), no formato de `content/README.md`. Cada exercício: instruções numeradas (checkpoints), código inicial, solução, 1–3 dicas, verificação JSON com `checkpoint` em cada caso, ≥ 2 soluções erradas (sem laço infinito). Quiz com 2–3 perguntas.
Use os recursos do P2b (diagramas, visualizador, fórmulas, lacunas, ordenar, Previsão) como o `PLANO.md` atualizado indicar; a lição `06-funcoes/01-definir-e-chamar` também deve ser revista para usá-los.
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
