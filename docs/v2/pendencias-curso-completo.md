# Pendências do curso completo — branch `feat/curso-completo`

Estado em 2026-11-14 (P1 e P2 concluídos; P2b com a base — contratos, banco, conteúdo e API — pronta; próximo passo: player da web do P2b). Decisões: `decisoes-curso-2026-11-04.md` (escolhidas: 7 níveis + trilha;
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
| `GET /lessons/:id` | traz `steps` públicos (`test_case_count`, `hint_count`, quiz sem `correct_index`/`explanation`; P2b: `exercise_mode` e `parsons_lines`, nunca `expected_output`). `created_by` saiu do DTO público e ficou em `LessonWithTests`, que ganhou `authoring_steps` (passos com gabarito, no formato que `steps` aceita de volta). |
| `POST`/`PATCH /lessons` | `steps` substitui todos os passos (id preservado por posição). Lição `guided` publicada sem passos → 422 `NO_STEPS`. |
| `GET /me/lessons/:id/progress` | `LessonStepsProgress` (`status` da lição + `steps`). |
| `POST /me/lessons/:id/steps/:stepId/submit` | exercício; 409 `STEP_LOCKED` fora de ordem; 400 `WRONG_STEP_KIND`; 403 `PROJECT_LOCKED`; 503 grava `submissions.status = error` e não conta tentativa. P2b: corpo `{files}` (modos `codigo` e `lacunas`) ou `{arrangement: [{line_id, indent}]}` (modo `ordenar`; a API monta o `main.py`); 400 `WRONG_SUBMISSION_FORMAT` / `INVALID_ARRANGEMENT`. |
| `POST /me/lessons/:id/steps/:stepId/predict` | **P2b.** passo `previsao`; corpo `{output}` → `StepPredictResult` (`passed`, `attempts`, `solution_available` + efeito na gamificação; sem a saída esperada). Compara ignorando espaços no fim das linhas e linhas em branco no fim. 12/min por aluno, 60/dia por aluno e passo. Evento `step_submitted` com `kind: "previsao"`. |
| `POST …/hint` e `GET …/hints` | uma dica por chamada (409 `NO_MORE_HINTS`); o `GET` devolve as já reveladas, para a tela reabrir. |
| `POST …/solution` | 403 `SOLUTION_LOCKED` antes de `solution_after_attempts`; ver a solução NÃO conclui o passo: marca `solution_viewed` e a aprovação seguinte vale 50 % do XP. P2b: resposta `{files, expected_output}` — no exercício `expected_output` é `null`; na previsão `files` é `[]` e `expected_output` traz a saída (o aluno ainda a envia por `predict`). |
| `POST …/complete`, `POST …/quiz` | leitura e quiz. No quiz reprovado a explicação só acompanha a questão acertada. |
| `GET /tracks`, `GET /tracks/:slug` | públicos; com sessão, `student_status` por curso. Visitante só vê cursos publicados. |
| `/admin/tracks` (CRUD) | admin. |
| `POST /me/tracks/:id/certificate`, `GET /me/track-certificates` | código `TRL-XXXX-XXXX`; `GET /certificates/:code` e o PDF aceitam os dois tipos (`kind: "course" \| "track"`). |
| `POST /admin/content/import` | admin, corpo até 20 MB, transação única, idempotente. P2b: grava também `assets` do pacote em `content_assets` (resumo ganhou `assets`); pacote com SVG ativo ou caminho de asset fora do formato → 400. |
| `GET /content/assets/:course/:module/:file` | **P2b.** pública; imagem do conteúdo com `Content-Type` correto, `nosniff`, CSP `default-src 'none'; style-src 'unsafe-inline'; sandbox`, `ETag` e cache (1 ano com `?v=<hash>`, 5 min sem). 404 para caminho fora do formato e para conteúdo que não passa na conferência (SVG ativo). |
| `POST /me/events`, `GET /admin/experiment/export.csv`, `PATCH /admin/users/:id/experiment-condition` | 600 eventos/h por usuário; o servidor registra sozinho `login`, `step_submitted`, `step_completed`, `hint_revealed`, `solution_viewed`, `lesson_completed`, `quiz_answered`, `exam_started`, `exam_submitted`, `certificate_issued`. |
| `GET /health/ready` | 503 quando banco ou executor falham. |
| `GET /users/:id/activity` | agora exige sessão: dono, professor ou admin. |

Decisões tomadas na implementação (ajustar aqui se alguma não for a desejada):
- Ver a solução não conclui o passo (confirmado pelo Filipe em 2026-11-14; a D5 foi corrigida em `decisoes-curso-2026-11-04.md`).
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

#### P2b — base concluída em 2026-11-14 (falta o player da web)

Pronto: contratos, migração `0005_p2b_recursos_de_apresentacao`, parser/lint/build/verify do conteúdo,
API (rota `predict`, `submit` com `arrangement`, `solution` da previsão, rota pública de assets),
`content/README.md` §3.5–§3.7, `content/exemplo` com todos os recursos, `curso-e-passos.md` §6.4.
Falta: o player (itens abaixo), `frame-src` do CSP da web para os dois domínios de vídeo, editor do
professor para os campos novos (o botão "Previsão" não aparece no editor; a previsão entra pelo pacote)
e o item 6 (`PLANO.md` do Nível 1).

Decisões tomadas (ajustar aqui se alguma não for a desejada):
- Todo `$` fora de código é fórmula; dinheiro se escreve `R\$ 10`. Uma lição existente foi ajustada
  (`n2-…/07-projetos-do-nivel/01-projeto-biblioteca.lvl.md`: `R$ 1,00/dia` → `R\$ 1,00/dia`).
- Mermaid: validação estrutural no lint (o parser oficial exige DOM e o pacote `mermaid` pesa ~200 MB).
- "Ver solução" na previsão mostra a saída esperada depois das tentativas, não conclui o passo e a
  resposta enviada em seguida vale 50 % do XP.
- No `ordenar` o aluno envia posições, não texto: a API monta o código só com as linhas do passo.
- No `lacunas` a API corrige só pelos casos (não exige que o resto do código fique igual ao inicial).
- `Previsão`, `lacunas` e `ordenar` só existem em lição `guiada` (a lição clássica não guarda o modo).
- O evento do experimento da previsão é `step_submitted` com `kind: "previsao"` (sem tipo novo).

#### Contrato para o player (web)

Tipos em `@levelusp/contracts` (`steps.ts`, `content-assets.ts`). O que mudou no DTO público do passo
(`LessonStep`, em `GET /lessons/:id` → `steps`):

| Campo | Valores | O que a web faz |
|---|---|---|
| `kind` | ganhou `"previsao"` | passo novo: mostra `narrative_markdown` (enunciado), o `main.py` de `starter_files` **somente leitura** (sem botão Executar) e uma área de texto para a saída. Envia `POST …/predict {output}`; trata `StepPredictResult` como o resultado do quiz (`passed`, `attempts`, `solution_available`, XP/badges). Não existe diff: em erro, mostre só "ainda não é isso" e as dicas. |
| `exercise_mode` | `"codigo"` \| `"lacunas"` \| `"ordenar"` (sempre `"codigo"` fora de exercício) | `codigo`: editor atual. `lacunas`: cada `___` (regex `BLANK_PATTERN`, `/_{3,}/g`) do `main.py` de `starter_files` vira um campo de texto de uma linha no meio do código (o resto é somente leitura); ao verificar, troque cada lacuna pelo texto digitado e envie `POST …/submit {files}`. `ordenar`: ver `parsons_lines`. |
| `parsons_lines` | `[{ id, text }]`; vazio fora do modo `ordenar` | já vêm **embaralhadas e sem indentação**, com distratores misturados (a web NÃO embaralha de novo nem tenta adivinhar a ordem). O aluno arrasta as que quer para a área de resposta, na ordem, e ajusta o nível de indentação de cada uma (0 a `MAX_PARSONS_INDENT` = 12; `PARSONS_INDENT_WIDTH` = 4 espaços por nível). Linhas não usadas ficam de fora. Envie `POST …/submit {arrangement: [{ line_id, indent }]}` (sem `files`); a resposta é o `StepSubmitResult` de sempre. `starter_files` vem vazio. Precisa funcionar por teclado (mover para cima/baixo, indentar/desindentar). |

Outras mudanças de contrato:
- `SolutionReveal` ganhou `expected_output: string | null`. Exercício: `files` com a solução (no `ordenar`,
  mostre o código da solução como texto). Previsão: `files` vazio e `expected_output` com a saída — mostre-a
  e deixe o aluno enviá-la por `predict` (ver não conclui; vale 50 % do XP).
- `StepSubmitInput` agora é `{ files? , arrangement? }` (um dos dois). `submitStep` da web continua válido.
- `LessonStepInput` (autoria) ganhou `exercise_mode`, `parsons_lines`, `expected_output`; `createStep` do
  editor já preenche os padrões. `ContentImportSummary` ganhou `assets`.
- Erros novos a tratar: 400 `WRONG_SUBMISSION_FORMAT`, 400 `INVALID_ARRANGEMENT`; 429 na previsão.
- Dicas (`POST …/hint`), ordem dos passos (`STEP_LOCKED`) e projeto valem igual para a previsão.

O que renderizar no markdown (`narrative_markdown`; fórmulas também em `checkpoints[].instruction`,
`checkpoints[].hint`, dicas reveladas, `quiz_questions[].prompt`/`options[]` e `explanation` do quiz):
- **Fórmulas**: `$…$` em linha e `$$…$$` em bloco (`remark-math` + `rehype-katex`, CSS do KaTeX local).
  `\$` é o cifrão literal (o escape padrão do markdown já resolve). O lint garante que toda fórmula do
  pacote passa no parser do KaTeX.
- **Mermaid**: bloco de código com linguagem `mermaid` → diagrama (carregar a biblioteca sob demanda, com
  `securityLevel: "strict"`). Se o parser do Mermaid recusar, mostre o código como bloco comum (o lint só
  valida a estrutura).
- **Imagens**: `![alt](/api/content/assets/<curso>/<modulo>/<arquivo>?v=<hash>)` — `<img>` comum, mesma
  origem (o rewrite `/api/*` já cobre); `alt` sempre vem preenchido. Não é preciso tratar `assets/…` relativo.
- **Visualizador**: bloco de código cuja linha de abertura é `python visualizar` (no `react-markdown`, o
  `meta` do nó `code` é `"visualizar"`). Mostre o código com o botão "Visualizar" e execute no Pyodide do
  navegador com `sys.settrace` (limite de 500 passos; anterior/próximo/slider). O lint garante: não vazio,
  até 60 linhas, sem `input()`; o `content:verify` garante que roda sem erro no CPython do executor.
- **Vídeo**: uma linha `::video[título](url)` sozinha no parágrafo, em que `url` é SEMPRE
  `https://www.youtube-nocookie.com/embed/<id>` ou `https://player.vimeo.com/video/<id>` (o compilador
  normaliza). Renderize um `<iframe>` com `title` = título, `loading="lazy"` e `sandbox="allow-scripts
  allow-same-origin allow-presentation"`, só depois do clique do aluno; inclua esses dois hosts no
  `frame-src` do CSP (`apps/web/next.config.mjs`) e recuse qualquer outro host no componente. Logo depois
  vem sempre uma citação `> Resumo: …` — é markdown comum e deve ficar visível junto do vídeo.
- Narrativas escritas por professores pela API não passam pelo lint: o renderizador precisa tolerar
  fórmula inválida, diagrama inválido e `::video` com outro host (mostrar como texto).

#### P2b — web e plano concluídos em 2026-11-14
- Player: fórmulas (KaTeX local), Mermaid sob demanda em modo estrito, imagens, vídeo só após o clique
  (YouTube nocookie e Vimeo, `frame-src` restrito), visualizador de execução (Pyodide + `sys.settrace`,
  500 passos), exercícios `lacunas` e `ordenar` (arrasto e teclado) e o passo Previsão. Detalhes e
  limitações em `web-ui.md`. Web: 62 arquivos de teste, 340 testes, build verde.
- `content/cursos/n1-fundamentos/PLANO.md` reescrito passo a passo para as 47 lições (281 passos:
  32 diagramas, 28 blocos visualizar, 22 lacunas, 11 ordenar, 37 previsões, nenhuma imagem).
- Limitações conhecidas (não bloqueiam o P3): Mermaid só tem validação estrutural no lint; assets são
  públicos pela URL mesmo com o curso em rascunho; o visualizador só acompanha o arquivo de entrada;
  no editor do professor a saída da Previsão é digitada à mão; o fluxo novo (arranjo, previsão, assets)
  só foi exercitado contra a API real nos e2e da API, não num navegador ponta a ponta.

### P3 — Conteúdo do Nível 1 — CONCLUÍDO em 2026-11-14
As 47 lições estão escritas (281 passos) e verificadas no executor real, com um commit por módulo.
`pnpm content:check`: 253 lições, 487 passos. `pnpm content:verify --curso n1-fundamentos`: 133 passos
de exercício e 65 previsões/blocos visualizar, todos verificados (solução aprova, código inicial e
soluções erradas reprovam). `pnpm content:build` regravou `packages/db/seed/trilha-python-ia.json`.

Pontos de conteúdo para revisão humana (nenhum impede a publicação; todos passam na verificação):
- **Diagramas Mermaid (32):** continuam só com validação estrutural no lint. Em 2026-11-15 foram vistos
  renderizados no navegador os das lições m1-03 e m4-01; os demais ainda não foram vistos um a um.
- **Tracebacks citados:** os dos módulos 5 e 8 foram copiados do CPython 3.14 do executor; os dos módulos
  1 e 2 foram conferidos num CPython 3.13 e podem diferir em detalhe do que o player mostra.
- **Exercícios que aceitavam o valor pronto — RESOLVIDO em 2026-11-15** (m2-03 passos 3, 4 e 6; m2-04
  passos 5 e 7). Os valores continuam fixos nas primeiras linhas do código inicial e a verificação ganhou
  casos `expr` cujo `setup` relê o `main.py`, troca esses valores e executa de novo: só a conta passa, e
  cada passo tem uma solução errada "digitado pronto" que reprova. Não foi usado `input()` porque o botão
  Executar roda sem teclado (`input()` dá `EOFError`) e `input` só é ensinado na lição 05. O aluno não
  pode alterar as linhas dos valores (o enunciado avisa). O m2-04 passo 7 passou a medir o título com
  `len`. Seguem abertos: em m4-04 passo 4, resolver sem `continue` também passa; em m4-07 passo 5, `seed`
  e `randint` dentro do laço passam (a saída é idêntica).
- **Funções antes do módulo 6 — DECIDIDO em 2026-11-15 (Filipe): fica como está.** O módulo 5 usa
  `def`/`return` na forma mínima, como no plano. `range(len(lista))`/`lista[i]` no módulo 4, antes de
  listas, não entrou nessa decisão.
- **Projeto do nível (m9), passo 5 — RESOLVIDO em 2026-11-15:** a regra `source calls sorted` saiu; a
  verificação é só de comportamento (ordem, lista nova, original intacta). Passam `sorted` com `key` e
  `.sort()` numa cópia; `.sort()` na lista recebida reprova. O passo 3 ainda exige "maior id + 1".
- **Mini-projeto de IMC (m3-05) passo 5** exige chamar as três funções; saída certa sem elas reprova.
- **m6-05 passo 2** exige a palavra "devolve" na docstring ("retorna" reprova); o enunciado avisa.
- **Leituras acima de ~400 palavras** em m4 (lições 04 a 07), m5 (05 e 07) e m9: o lint não mede.
- **Instalação do Python no Windows (m1-04):** o roteiro descreve o instalador do python.org; conferir
  contra a página atual antes de divulgar.
- **PLANO.md do módulo 6** ainda cita `uses recursion` com `function`, que o harness não suporta
  (as lições usam a regra sem `function`); ver `divida-tecnica.md`.
- **XP total do nível:** as lições ganharam passos; se o total em "Estrutura do nível" do PLANO.md conta
  o XP dos passos, precisa ser refeito.
- Os passos sem `### Código inicial` dos mini-projetos dependem de o player manter o código do passo
  anterior: visto no navegador com a API real em 2026-11-15, no projeto do nível (passos 3 a 6).

### P4 — Integração e entrega — parte local CONCLUÍDA; PR aberto em 2026-11-15
Rodada do Cowork (2026-11-14): `pnpm build`, `pnpm lint` e `pnpm test` verdes; e2e, segurança e ataques da
API; testes e ataques do runner; `arquitetura.md`, `testes.md`, `divida-tecnica.md` e `CURRICULO.md`.

Rodada local de 2026-11-15 (Windows 11, Postgres e runner do `compose.dev.yml`, migrações 0000–0005):
- `pnpm build`, `pnpm lint`, `pnpm typecheck` e `pnpm test` verdes (contracts 43, db 11, security 15,
  load 22, API 315, web 340; os testes do runner que precisam do Wasmtime são pulados no Windows).
- API: e2e 148, segurança 151, ataques contra o runner real 40.
- Runner, dentro do estágio `build` da imagem (Linux): testes 62/62; ataques 73/73 em duas de três
  execuções. Na outra, falhou `unittest.attack.ts` › "id() e sys.getallocatedblocks() variam entre duas
  execuções da MESMA implementação": o teste depende de ruído do alocador e é instável (passa sozinho).
- `content:check`, `content:verify --curso n1-fundamentos` (133 exercícios e 65 previsões/blocos
  visualizar), `verify:seed` (todas as lições) e `test:paridade` (73 execuções) verdes.
- Playwright da web com a pilha no ar: 85/85. Entrou `e2e/guided-lesson.spec.ts`, que percorre uma lição
  guiada no navegador contra a API e o executor reais (diagrama Mermaid, visualizador, Previsão, lacunas e
  ordenar). Os testes de admin precisam do admin no seed (`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`).
- Visto no navegador como `aluna@levelusp.dev`: m1-03 (diagramas), m4-01 (visualizador, Previsão, lacunas,
  ordenar) e o projeto do nível (passos 1 a 6).

Corrigido nesta rodada:
- Rolagem horizontal no celular (390 px) em `/dashboard` e `/cursos/:id`: grades sem coluna explícita.
- `apps/api/test/unit/content/cli.test.ts` esperava caminho POSIX e falhava no Windows.
- `e2e/admin.spec.ts` pegava a primeira lição da professora, que agora é um rascunho sem gabarito.
- Executor: `-C cache=n` no Wasmtime (o 49 tenta criar `~/.cache/wasmtime` e aborta com a raiz somente
  leitura) e `NODE_ENV=development` no runner do `compose.dev.yml` (a imagem recusa o token de dev).
- Marketing: `/sobre` sem "200 estudantes" e sem anos na linha do tempo; `/equipe` e `/parceiros` só com
  Filipe Pio Magalhães (autor), Prof. Evandro Ruiz (orientador) e DCM/FFCLRP-USP; home sem porcentagens.

Segunda rodada local de 2026-11-15 (mesmo PR):
- **Campo "Entrada (stdin)" — FEITO.** O Executar e o Visualizar leem `input()` de um campo acima do
  console, nos modos `codigo`, `lacunas` e `ordenar` e também na IDE das lições clássicas. O campo abre
  sozinho quando o código chama `input()`; o texto não vai para a API (o Verificar usa as entradas dos
  casos). Testes: Pyodide real (`project-execution.test.ts`), componente (`guided-lesson-modes.test.tsx`)
  e navegador (`e2e/guided-lesson.spec.ts`, passo de ordenar com `int(input())`).
- **Projeto bloqueado — FEITO.** A página do projeto mostra um aviso fixo com quantas lições faltam e um
  link para cada uma; a recusa `PROJECT_LOCKED` deixou de virar aviso passageiro. `LessonSummary` ganhou
  `is_project` (a regra continua sendo da API; a tela só a espelha). Testes de unidade, de componente e
  no navegador (conta nova, 46 lições pendentes).
- **Marketing — FEITO:** `/login` e `/showcase` sem "50K+", "200+" e "15 trilhas"; `/showcase` sem
  "milhares de brasileiros"; `/sobre` com a origem real (TCC no DCM/FFCLRP-USP) no lugar da linha do
  tempo; `/parceiros` sem "Seja um parceiro"; rodapé "DCM/FFCLRP-USP — Ribeirão Preto, SP".
- Resultados: lint 9/9, typecheck 9/9, unitários (web 368, API 315), API e2e 148, Playwright 86/86,
  ataques do runner em Linux 5 vezes seguidas: 73/73 nas cinco (o teste de id() continua instável: cerca de 0,7% por execução).

Observações abertas:
- **TESTE INSTÁVEL A RESOLVER — `id()`/`getallocatedblocks()` (`unittest.attack.ts`): NÃO foi alterado.** As
  cinco execuções seguidas de `test:attacks` passaram com o teste como estava (73/73), o que é o
  esperado com cerca de 0,7% de falha por execução; ele segue instável. Não dá
  para torná-lo determinístico: o ruído vem de `os.urandom` dentro do sandbox e o teste não tem como
  fixar a semente. E as medições mostram que a falha esporádica aponta uma fraqueza real do ruído, que
  uma repetição no teste esconderia. Em 400 execuções da mesma implementação: `sys.getallocatedblocks()`
  devolveu 0 em todas (o build WASI não usa o pymalloc, então essa parte da medida não prova nada);
  `id(validar)` teve só 9 valores distintos (quase constante); `id(object())` teve 330, mas o valor mais
  comum saiu em 5% das execuções. Chance de duas execuções coincidirem: cerca de 0,7% (1 falha em 40
  repetições do teste isolado). Proposta, para decidir: reforçar `scramble_allocator` no `harness.py`
  (por exemplo, um bloco grande de tamanho aleatório, que desloca o topo do heap) e trocar a asserção por
  "N execuções, pelo menos K valores distintos", com `id(validar)` medido à parte.
- **`-C cache=n` em produção:** a correção está no código do executor (`buildWasmtimeArgs`), então vale
  para qualquer compose; o `compose.yml` de homolog/prod também usa `read_only: true` e não precisa de
  mudança. Falta só confirmar em homolog, com a imagem nova, que o autoteste do sandbox passa.
- **Marketing: textos da auditoria — CORRIGIDOS em 2026-11-15 (terceira rodada, mesmo PR).** Regras
  aplicadas (decisão do Filipe):
  - certificado: "Certificado emitido pela plataforma LevelUSP, projeto de TCC desenvolvido no
    DCM/FFCLRP-USP" em `/signup`, em `/certificado/[code]` e no PDF (`certificate-pdf.ts`, que dizia
    "Universidade de São Paulo" sob a marca); o FAQ diz que não é documento emitido nem reconhecido
    pela USP;
  - atribuição: só "projeto desenvolvido no DCM/FFCLRP-USP" ou "trabalho de conclusão de curso"; o
    copyright do rodapé e `authors` dos metadados são Filipe Pio Magalhães;
  - saíram as promessas ("sempre será gratuito", "acesso vitalício", "revisado por pares") e "Conteúdo
    aberto" (o repositório não tem arquivo de licença);
  - saíram as afirmações de alcance e de ciência sem fonte; a seção de pesquisas diz que os estudos são
    sobre as ideias em geral e que a plataforma ainda não foi avaliada;
  - a trilha é descrita como é: 7 níveis, do zero à IA, Nível 1 disponível (home, `/trilhas`, `/signup`,
    FAQ); os cartões da home usam os títulos dos 7 cursos do pacote;
  - contato: sem e-mail, horário e assuntos; o canal é o repositório
    (`github.com/Lip3Bazinga/v0-level-usp-project`, issues). O formulário de `/contato`, que mostrava
    "Mensagem enviada!" sem enviar nada, foi removido;
  - `/showcase` foi removida (404), junto com o link público para o painel admin;
  - "+50 XP por lição" saiu da home; o FAQ explica que o XP varia por passo;
  - "Dificuldade adaptativa" e "Revisão espaçada" deram lugar a recursos que existem (dicas e solução
    comentada; passos de previsão).
  Conferido com grep nas páginas públicas: da lista só restam o nome por extenso do departamento
  ("... da Universidade de São Paulo", em `/equipe` e `/parceiros`) e a ressalva do FAQ.
  Sobras para decidir: `components/design-system/{course-card,level-progress,streak-counter,xp-badge}.tsx`
  só eram usados pela `/showcase` e ficaram sem uso; `ROUTES.landing` também; a imagem
  `public/og-image.png` não foi conferida; os títulos e descrições dos níveis 2 a 7 na home vêm do
  currículo planejado.

- O Playwright precisa de `pnpm --filter @levelusp/web exec playwright install chromium` depois de
  atualizar a dependência; a porta 5432 pode estar ocupada por contêineres de outros projetos no boot.

Falta, e depende do Filipe:
1. Revisar e fazer o merge do PR `feat/curso-completo` → `develop` com merge commit (nunca squash),
   com o CI verde; conferir as imagens GHCR.
2. Homolog (notebook servidor, PowerShell em `C:\dev\v0-level-usp-project`):
   `.\infra\scripts\levelusp.ps1 update -Env homolog` (aplica as migrações 0004 e 0005), importar o
   pacote (`POST /admin/content/import` ou `pnpm db:seed`) e testar como aluno uma lição guiada:
   erro → dica → solução após 3 tentativas → aprovação → XP. Testar também uma lição com diagrama,
   visualizador, lacunas, ordenar e Previsão, e conferir o autoteste do runner.
3. Operações acumuladas (confirmar antes de executar): apagar as 13 submissões falsas e a conta
   `aluno.teste.claude@levelusp.dev`; push do `fix/ps1-utf8-bom`; SMTP; promover professores; rotacionar
   a chave do Supabase e desligar Supabase/Vercel.

### P5 — Níveis 2–7 (em andamento na branch `feat/niveis-2-a-7`)
Estado em 2026-11-15:
- **Nível 2 concluído e publicado:** 35 lições, 263 passos, 113 exercícios e 34 previsões/visualizações
  verificados (`content:verify --curso n2-python-intermediario`), prova com 40 questões, sequência de
  passos no `PLANO.md` do nível.
- `content:verify`: a solução errada agora herda os arquivos de `### Solução` e só troca os que declara
  (`wrongSolutionFiles` em `apps/api/scripts/content/verify.ts`; `content/README.md` §3.3).
- `pnpm content:metrics` (`apps/api/scripts/content-metrics.mts`): métricas de densidade por lição contra
  o Nível 1, para a auditoria de qualidade.
- Próximos: integrar `feat/niveis-7-e-3` (Antigravity: N7 completo, N3 módulos 1–6), auditar N7 e N3
  (`docs/v2/auditoria-niveis-7-e-3.md`), N3 módulos 7–8 (rascunho não commitado do Antigravity em
  `.claude-transfer/antigravity-n3-m7-m8-nao-commitado.patch`), depois N4, N5 e N6.

Um nível por sessão: escrever o `PLANO.md` do nível a partir dos roteiros, escrever as lições, provas com 40 questões, `content:verify` (níveis 4–6 usam `runtime: python-dados`; precisa do Pyodide no runner: `pnpm --filter @levelusp/runner setup:pyodide`), publicar.
