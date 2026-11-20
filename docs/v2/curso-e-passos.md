# Curso completo, passos e trilhas — especificação de implementação

Contrato entre as frentes de trabalho (banco, contratos, API, web, runner, conteúdo).
Decisões de produto: `decisoes-curso-2026-11-04.md`. Tudo aqui é **aditivo**: nada que
existe é removido nesta rodada; o que fica obsoleto é marcado em `divida-tecnica.md`.

## 1. Modelo de domínio

```
Trilha (track)  ──1:N──▶ Curso (course, = nível certificável) ──1:N──▶ Módulo (module)
                                   │                                        │
                                   ├── Prova (exam, já existe)              └──1:N──▶ Lição (lesson)
                                   └── Certificado (certificate, já existe)             │
                                                                                       └──1:N──▶ Passo (lesson_step)
```

- **Trilha**: sequência ordenada de cursos; ao certificar todos, o aluno recebe o
  certificado da trilha. Primeira trilha: "Python: do zero à IA" (7 cursos).
- **Curso = nível**: `order` dentro da trilha, `prerequisite_course_id` (o Nível N exige o
  certificado do N−1; `null` libera), horas estimadas, prova, projeto (lição com
  `is_project`).
- **Módulo**: pertence a um curso (`modules.course_id`). Os módulos "globais" de hoje
  (sem curso) continuam válidos até a migração dos dados; a UI nova sempre cria com curso.
- **Lição**: `lesson_type` ganha o valor `guided` (lição guiada em passos, formato
  Codecademy). Lições `coding`/`theory`/`quiz` atuais continuam funcionando sem passos.
  Campos novos: `runtime` (`python` | `python-dados`), `is_project`, `objectives` (text[]),
  `solution_files` (jsonb, NUNCA sai para o aluno antes da regra de liberação).
- **Passo** (`lesson_steps`): `kind` ∈ {`leitura`, `exercicio`, `quiz`, `previsao`} (P2b: `exercise_mode`,
  `parsons_lines` e `expected_output`, ver §6.4), `order`, `title`,
  `narrative_markdown`, `starter_files`, `solution_files` (privado), `checkpoints`
  (`[{id, instruction, hint?}]`), `test_cases` (privado; cada caso pode ter
  `checkpoint: <id>`), `hints` (text[], até 3, reveladas uma a uma), `quiz_questions`
  (jsonb `[{prompt, options, correct_index, explanation}]`, `correct_index` privado),
  `xp` (padrão 10).
- **Progresso por passo** (`lesson_step_progress`): `status` (`in_progress` | `completed`),
  `attempts`, `hints_revealed`, `solution_viewed`, `xp_awarded`, `completed_at`.
  Um passo `exercicio` é concluído quando TODOS os seus casos passam; a lição é concluída
  quando todos os passos estão `completed` (aí vale a regra atual de XP da lição).
- **Conclusão de curso** (`course_completions`): criada quando 100 % das lições publicadas
  do curso estão concluídas. **Certificado** (já existe) agora exige: `course_completions`
  + prova aprovada (`exams.passing_score`) + lições `is_project` concluídas (já está em
  100 %). **Certificado de trilha** (`track_certificates`): todos os cursos certificados.
- **Experimento** (pedido da auditoria): `profiles.experiment_condition` (`gamificada` |
  `controle` | null) e `events` (append-only: `user_id`, `type`, `payload`, `created_at`;
  sem rota de update/delete; exportação CSV para admin).
- **Submissões**: `submissions.status` ganha `error` (falha de infraestrutura: runner
  indisponível, timeout do host). Não conta como tentativa nem como reprovação.

## 2. Migração `0004_curso_completo` (packages/db)

Colunas e tabelas novas (todas com `IF NOT EXISTS`, defaults seguros):

- `tracks(id, slug unique, title, description, icon, color, sort_order, published, certificate_title, created_at, updated_at)`
- `track_courses(track_id, course_id, position, PK(track_id, course_id), UNIQUE(track_id, position))`
- `track_certificates(id, user_id, track_id, verification_code unique, issued_at, UNIQUE(user_id, track_id))`
- `courses`: `slug text unique`, `prerequisite_course_id uuid null → courses`, `sequential boolean default false`
- `modules`: `course_id uuid null → courses(on delete cascade)`, `slug text` (unique por curso)
- `lessons`: `lesson_type` CHECK inclui `guided`; `runtime text default 'python'` CHECK in (`python`,`python-dados`);
  `is_project boolean default false`; `objectives text[] default '{}'`; `solution_files jsonb default '[]'`;
  `solution_after_attempts integer default 3` (0 = nunca)
- `lesson_steps(id, lesson_id → lessons cascade, "order", kind, title, narrative_markdown, starter_files jsonb,
  solution_files jsonb, checkpoints jsonb, test_cases jsonb, hints text[], quiz_questions jsonb, xp integer default 10,
  created_at, updated_at, UNIQUE(lesson_id, "order"))`
- `lesson_step_progress(id, user_id, step_id → lesson_steps cascade, status, attempts, hints_revealed, solution_viewed,
  xp_awarded, completed_at, created_at, updated_at, UNIQUE(user_id, step_id))`
- `submissions`: `step_id uuid null → lesson_steps`; `status` CHECK inclui `error`
- `course_completions(id, user_id, course_id, completed_at, UNIQUE(user_id, course_id))`
- `profiles.experiment_condition text null` CHECK in (`gamificada`,`controle`)
- `events(id bigserial, user_id uuid null, type text, payload jsonb, created_at)` + índice `(user_id, created_at)` e `(type, created_at)`
- `badges.criteria_type` ganha `certificates_issued`; o seed troca a badge "Formado(a)" para esse critério.

Tipos Drizzle em `packages/db/src/schema/*.ts` seguindo os existentes (`*Row`, `*Insert`, TSDoc pt-BR).

## 3. Contratos (packages/contracts)

- `LESSON_TYPES` += `"guided"`; `LESSON_RUNTIMES = ["python", "python-dados"]`.
- `STEP_KINDS = ["leitura", "exercicio", "quiz"]`; `lessonStepSchema` (entrada do admin) e
  DTOs públicos: `LessonStep` (sem `solution_files`, sem `test_cases`, quiz sem
  `correct_index`), `LessonStepProgress`, `StepSubmitResult` (`passed`, `cases` com
  nome/dica/checkpoint, `solution_available`, `xp_awarded`, `lesson_completed`,
  `granted_badges`), `HintReveal` (`index`, `text`), `SolutionReveal` (`files`).
- `TestCase` ganha `checkpoint?: number` (id do checkpoint; opcional, informativo para a UI).
- `Track`, `TrackCourse` (curso + situação do aluno: `locked` | `available` | `in_progress` |
  `completed` | `certified`), `TrackCertificate`, `CourseCompletion`, `ExperimentCondition`,
  `EventInput` (`type` ∈ lista fechada: `lesson_viewed`, `step_submitted`, `step_completed`,
  `hint_revealed`, `solution_viewed`, `lesson_completed`, `quiz_answered`, `exam_started`,
  `exam_submitted`, `certificate_issued`, `login`).
- `SUBMISSION_STATUSES` += `"error"`.
- Curva de XP: `xpForLevel(level) = 250 * (level - 1) * (level + 2)` (1000, 2500, 4500, 7000…);
  `levelForXp(xp)`; exportadas de `gamification.ts` e usadas por API e web (substitui
  `1 + floor(xp/1000)`).

## 4. API (apps/api)

Módulos novos: `tracks` (`GET /tracks`, `GET /tracks/:slug` com situação do aluno,
`/admin/tracks` CRUD), `steps` dentro de `learning`/`catalog`:

- `GET /lessons/:id` passa a incluir `steps` (DTO público) e `runtime`.
- `GET /me/lessons/:id/progress` inclui `steps: LessonStepProgress[]`.
- `POST /me/lessons/:id/steps/:stepId/submit` `{ files }` → corrige só os `test_cases` do
  passo (mesmo `GradingService`, runtime da lição); exige o passo anterior concluído
  (passos são sequenciais dentro da lição); matrícula automática no curso; registra
  `submissions` (com `step_id`); se passou, `lesson_step_progress.completed` + XP do passo
  (50 % se `solution_viewed`) via `GamificationService`; se todos os passos concluídos →
  conclui a lição (fluxo atual de XP/badges) e avalia `course_completions`.
- `POST /me/lessons/:id/steps/:stepId/hint` → revela a próxima dica (`hints_revealed++`).
- `POST /me/lessons/:id/steps/:stepId/solution` → só se `attempts >= lessons.solution_after_attempts`
  (e `> 0`); marca `solution_viewed`; devolve `solution_files`.
- `POST /me/lessons/:id/steps/:stepId/complete` → passos `leitura` (marca concluído, XP do passo).
- `POST /me/lessons/:id/steps/:stepId/quiz` `{ answers }` → passos `quiz` (≥ `quiz_passing_score` da lição).
- Lições sem passos: `POST /me/lessons/:id/submit` atual continua; quando o runner falha,
  `status: "error"` e resposta 503 com mensagem pt-BR (sem contar tentativa).
- Certificados: `POST /me/courses/:id/certificate` aplica a regra da §1; `GET /certificates/:code`
  (público) continua; `POST /me/tracks/:id/certificate`.
- Experimento: `POST /me/events` (lote, só tipos da lista; limite por usuário);
  `GET /admin/experiment/export.csv`; `PATCH /admin/users/:id/experiment-condition`.
- `GET /lessons/:id` público remove `created_by`; `GET /users/:id/activity` só dono/professor/admin.
- `GET /health/ready` (público): banco + runner (`/healthz` do runner) → 503 quando algum falha.
- `AdminContentService.importBundle(seed v2)`: `POST /admin/content/import` recebe o JSON da §6 e faz upsert por `slug`.

## 5. Web (apps/web)

- Página da lição: quando `steps.length > 0`, renderiza o **player de passos** (lista de passos
  à esquerda com estado, narrativa + instruções/checkpoints com ✓ por caso, editor à direita
  (código do passo anterior é carregado como ponto de partida quando o passo não tem
  `starter_files`), botões Executar / Verificar / Dica (n/3) / Ver solução (aparece após
  as tentativas), quiz inline, "Continuar" para o próximo passo. Lições sem passos usam a
  tela atual.
- Catálogo: `/trilhas` (trilhas → cursos com estado locked/available/…), `/cursos/[id]`
  mostra módulos → lições, projeto e prova, progresso e botão de certificado.
- Perfil/painel: nível pela curva nova; streak por conclusão; certificados de curso e de trilha.
- Condição `controle`: esconde XP, nível, streak, badges e ranking (mantém progresso).
- Remover/retirar: página "Ajustes" inerte, páginas de marketing com números inventados,
  "Em breve"/"Não disponível", botões OAuth, `final_project_*` na UI (projeto = lição).
- Segurança: HSTS (`Strict-Transport-Security` nos headers do `next.config.mjs`).
- Desempenho: `next/dynamic` para CodeMirror e para o worker do Pyodide na página da lição.
- `libraries` da lição continuam vindo do CDN do Pyodide no navegador (já existe).

## 6. Conteúdo: arquivos `.lvl.md` e pacote compilado (seed v2)

Árvore: `content/trilhas/<trilha>.yaml`, `content/cursos/<nivel>/curso.yaml`,
`content/cursos/<nivel>/prova.yaml`, `content/cursos/<nivel>/<modulo>/modulo.yaml`,
`content/cursos/<nivel>/<modulo>/<NN>-<slug>.lvl.md`, `content/cursos/<nivel>/<modulo>/assets/<imagem>` (P2b).

`curso.yaml`: `slug, titulo, descricao, descricao_longa, nivel (iniciante|intermediario|avancado),
tags, horas, ordem, publicado, prerequisito (slug|null), sequencial`.
`modulo.yaml`: `slug, titulo, descricao, icone, cor, ordem`.
`prova.yaml`: `titulo, descricao, nota_minima, tempo_min, intervalo_min, questoes_por_tentativa,
questoes: [{enunciado, opcoes, correta (índice), explicacao, topico}]`.
`<trilha>.yaml`: `slug, titulo, descricao, icone, cor, ordem, publicada, titulo_certificado, cursos: [slug…]`.

### 6.1 Lição (`.lvl.md`)

```markdown
---
slug: n1-m2-01-ola-python          # único na plataforma
titulo: Olá, Python
descricao: Seu primeiro programa e como o Python o executa.
dificuldade: iniciante
tipo: guiada                       # guiada | pratica | leitura | quiz
runtime: python                    # python | python-dados
bibliotecas: []                    # só para python-dados (numpy, pandas, scikit-learn…)
xp: 100
tempo_min: 25
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
  - Executar um programa Python e ler a saída
  - Explicar o que `print` faz
---

## Passo 1 · Leitura · O que é um programa
Narrativa em markdown (pode ter blocos ```python ilustrativos, não executados).

## Passo 2 · Exercício · Seu primeiro print
Narrativa curta explicando o conceito do exercício.

### Instruções
1. Use `print()` para exibir exatamente `Olá, mundo!`.
2. Na linha seguinte, exiba seu nome entre aspas.

### Código inicial
```python
# Escreva seu código abaixo
```

### Solução
```python
print("Olá, mundo!")
print("Ana")
```

### Dicas
1. `print` recebe o texto entre aspas.
2. Cada `print` escreve em uma linha nova.

### Verificação
```json
[
  { "id": "saida", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "Olá, mundo!", "match": "contains",
    "name": "Exibe Olá, mundo!", "hint": "A saída precisa ter exatamente o texto Olá, mundo!" },
  { "id": "duas-linhas", "checkpoint": 2, "kind": "source", "rule": { "type": "calls", "name": "print" } }
]
```

### Soluções erradas
```python name="sem aspas"
print(Olá, mundo!)
```
```python name="texto diferente"
print("Ola mundo")
```

## Passo 3 · Quiz · Fixando
### Pergunta
Qual função exibe texto na tela?
- [ ] `show()`
- [x] `print()`
- [ ] `echo()`
> `print()` escreve na saída padrão.
```

Regras do formato:
- Cabeçalho de passo: `## Passo N · <Leitura|Exercício|Quiz|Previsão> · <Título>`; N sequencial a partir de 1.
- Recursos de apresentação, `modo: lacunas`/`modo: ordenar` e o passo `Previsão` (P2b): §6.4.
- Passo `Exercício` exige `### Instruções` (lista numerada = checkpoints, ids 1..n), `### Código inicial`,
  `### Solução`, `### Verificação` (JSON = `TestCase[]`, validado com `testCasesSchema`) e
  pelo menos **uma** solução errada em `### Soluções erradas`. `### Dicas` tem até 3 itens.
- Blocos de código: ```python → `main.py`; ```python path=utils.py → outro arquivo;
  ```text path=dados.csv → arquivo de dados. Em `Soluções erradas`, `name="…"` nomeia o caso.
- Passo `Quiz`: um ou mais `### Pergunta`; opções `- [ ]`/`- [x]` (exatamente uma correta);
  `> explicação` opcional.
- Lições `pratica`/`leitura`/`quiz` (sem passos) usam o mesmo arquivo com UM passo do tipo
  correspondente; o compilador preenche os campos planos da lição (`starter_files`,
  `test_cases`, `content_markdown`, quiz) a partir dele.

### 6.2 Pacote compilado (`packages/db/seed/trilha-python-ia.json`)

```json
{ "format": 2, "generated_at": "…",
  "tracks": [{ "slug", "title", "description", "icon", "color", "sort_order", "published", "certificate_title", "courses": ["n1-fundamentos", …] }],
  "courses": [{ "slug", "title", "description", "long_description", "level", "tags", "estimated_hours", "order", "published", "prerequisite": null, "sequential": false,
     "exam": { "title", "description", "passing_score", "time_limit_minutes", "cooldown_minutes", "questions_per_attempt", "questions": [{ "prompt", "options", "correct_index", "explanation", "topic" }] } | null,
     "modules": [{ "slug", "title", "description", "icon", "color", "sort_order",
        "lessons": [{ "slug", "title", "description", "difficulty", "lesson_type", "runtime", "libraries", "xp_reward", "time_limit", "published", "is_project", "solution_after_attempts", "objectives",
           "steps": [{ "order", "kind", "title", "narrative_markdown", "starter_files", "solution_files", "checkpoints", "test_cases", "hints", "quiz_questions", "wrong_solutions", "xp",
                       "exercise_mode", "parsons_lines": [{ "id", "text" }], "expected_output" }] }] }] }],
  "assets": { "<curso>/<modulo>/<arquivo>": { "content_type": "image/svg+xml", "base64": "…" } } }
```

`wrong_solutions` existe só no pacote (para a verificação); o seed/importação não grava.
`exercise_mode` (`codigo` | `lacunas` | `ordenar`), `parsons_lines`, `expected_output` e `assets`
são do P2b (§6.4); todos têm padrão (`codigo`, `[]`, `""`, `{}`), então um pacote anterior continua válido.

### 6.3 Ferramentas (`apps/api/scripts`, scripts na raiz)

- `pnpm content:build` → compila `content/` para o pacote; falha com mensagem clara (arquivo:linha).
  Conteúdo com passo `Previsão` exige o executor (`RUNNER_URL`, `RUNNER_TOKEN`) para gerar a saída esperada.
- `pnpm content:check` → lint do conteúdo sem executar: slugs únicos, passos numerados, exercício com
  solução + verificação + ≥1 solução errada, dicas ≤ 3, quiz com exatamente uma correta, `checkpoint`
  referenciando instrução existente, `runtime`/`bibliotecas` coerentes (toda biblioteca precisa estar no
  manifesto `packages/contracts/src/library-manifest.ts`, com motor para o `runtime` da lição; ver
  `docs/v2/motores-e-ide.md`), texto sem "TODO".
- `pnpm content:verify [--curso n1-fundamentos] [--licao slug]` → com o runner real
  (`RUNNER_URL`, `RUNNER_TOKEN`): a solução de cada passo APROVA, o código inicial REPROVA,
  cada solução errada REPROVA. Relatório por lição; código de saída ≠ 0 em falha.
- O seed (`pnpm db:seed`) lê o pacote v2 (e o v1 atual, para compatibilidade) e faz upsert por slug.

### 6.4 P2b — recursos de apresentação e novos formatos de exercício

Guia do autor com exemplos: `content/README.md` §3.5–§3.7. Modelo completo:
`content/exemplo/cursos/curso-exemplo/m1-primeiros-passos/03-recursos-de-apresentacao.lvl.md`.
Código: `apps/api/scripts/content/{rich-content,python-syntax,predictions}.ts`.

| Recurso | No `.lvl.md` | No pacote / banco | Validação |
|---|---|---|---|
| Fórmula | `$…$`, `$$…$$`; cifrão literal = `\$`; código nunca é fórmula | texto igual na narrativa, instruções, dicas e quiz | `content:check` passa cada fórmula no parser do KaTeX (`arquivo:linha`) |
| Diagrama | bloco ```` ```mermaid ```` | bloco igual na narrativa | estrutural (tipo na 1ª linha, corpo, colchetes de fluxograma); o parser do Mermaid não roda sem DOM |
| Imagem | `![alt](assets/x.svg)` em `<modulo>/assets/` | referência reescrita para `/api/content/assets/<curso>/<modulo>/<arquivo>?v=<hash>`; arquivo em `assets` do pacote → tabela `content_assets` | alt não vazio, arquivo existente, svg/png/jpg/webp/gif ≤ 512 KB, assinatura do formato, SVG sem conteúdo ativo |
| Visualizador | bloco ```` ```python visualizar ```` | bloco igual (a palavra `visualizar` fica na linha de abertura) | check: não vazio, plausível, sem `input()`, ≤ 60 linhas; verify: executa sem erro |
| Vídeo | `::video[título](url)` + `> Resumo: …` | `::video[título](https://www.youtube-nocookie.com/embed/<id>)` ou `(https://player.vimeo.com/video/<id>)`; o resumo segue como citação | só YouTube/Vimeo https; título e resumo (≥ 60 caracteres) obrigatórios |
| `modo: lacunas` | 1ª linha da narrativa do Exercício; `___` no código inicial | `exercise_mode: "lacunas"` | ≥ 1 lacuna; solução = código inicial com as lacunas preenchidas; só lição guiada |
| `modo: ordenar` | idem; sem `### Código inicial`; `### Distratores` opcional | `exercise_mode: "ordenar"`, `parsons_lines` embaralhadas (semente `slug:passo`), sem indentação, ids `l1…ln` | solução em um `main.py`, ≥ 3 linhas, indentação múltipla de 4; verify: solução montada aprova, ordem embaralhada reprova |
| `Previsão` | `## Passo N · Previsão · Título` + `### Código` (+ `### Dicas`, `### Saída esperada`) | `kind: "previsao"`, código em `starter_files`, `expected_output` gerado no build pelo executor | check: código plausível, sem `input()`; build: roda sem erro, 1–20 linhas de saída; verify: nova execução reproduz a saída |

Migração `0005_p2b_recursos_de_apresentacao`: `lesson_steps` ganha `exercise_mode text default 'codigo'`
(CHECK), `parsons_lines jsonb default '[]'`, `expected_output text default ''`; o CHECK de `kind` passa a
aceitar `previsao`; tabela nova `content_assets(id, path unique, content_type CHECK, data_base64, size_bytes,
sha256, created_at, updated_at)`.

Regras de servidor:
- **Previsão**: `POST /me/lessons/:id/steps/:stepId/predict {output}` → `StepPredictResult`. A comparação
  (`matchesPrediction` em `steps.domain.ts`) ignora espaços/tabulações no fim das linhas, linhas em branco no
  fim e `\r\n`; o resto conta. Acerto conclui pelo `GamificationService.completeStep`; erro soma tentativa.
  A resposta não traz a saída esperada nem a diferença. Limites: 12/min por aluno e 60/dia por aluno e passo.
  Evento do experimento: `step_submitted` com `kind: "previsao"`. Não grava `submissions` (não há código do aluno).
- **Ver solução** (`POST …/solution`) vale para exercício e previsão: na previsão devolve
  `{ files: [], expected_output }` depois de `solution_after_attempts` erros, marca `solution_viewed` e **não
  conclui** — o aluno envia a saída por `predict` e recebe 50 % do XP (mesma regra do exercício).
- **Ordenar**: `POST …/submit {arrangement: [{line_id, indent}]}`; a API monta o `main.py` só com as linhas do
  passo (`assembleParsonsCode`, 4 espaços por nível, 0–12 níveis) e corrige pelos casos. `files` num passo
  `ordenar` → 400 `WRONG_SUBMISSION_FORMAT`; linha inexistente ou repetida → 400 `INVALID_ARRANGEMENT`.
- **Lacunas**: `POST …/submit {files}` como o exercício comum (a correção é só pelos casos; o servidor não
  exige que o resto do código fique igual ao código inicial).
- **Assets**: `GET /content/assets/:course/:module/:file` (pública). Cada parte do caminho é validada por
  formato e a busca é por chave exata no banco (não há sistema de arquivos); antes de responder, o conteúdo é
  conferido de novo (tipo pela extensão, assinatura, SVG sem `<script>`/`on…=`/`javascript:`/`foreignObject`).
  Cabeçalhos: `Content-Type` do tipo, `X-Content-Type-Options: nosniff`,
  `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`, `ETag` (SHA-256) e
  `Cache-Control: public, max-age=31536000, immutable` quando `?v=` é o hash atual (senão 5 min com revalidação).
  A importação faz upsert por caminho e apaga os assets dos cursos do pacote que não vieram nele.

## 7. Runner: motor `python-dados` (apps/runner)

- Interface `Engine { readonly name: "wasi" | "pyodide"; run(job): Promise<RunnerResult>; readiness }`.
  O executor escolhe pelo `runtime` da requisição (`POST /run` ganha `runtime?: "python" | "python-dados"`,
  padrão `python`). O harness (`python/harness.py`) é o MESMO nos dois motores: no Pyodide, o
  lote entra por `setStdin` (`os.read(0)`), as observações saem por `setStdout({ raw })` com o
  nonce, `/work` e `/harness` vivem no MEMFS.
- Pyodide roda em `worker_threads` dedicados, um lote por worker (`RUNNER_PYODIDE_POLICY=fresh`,
  padrão) com pool aquecido por perfil (`RUNNER_PYODIDE_WARM`, padrão 1): perfis `dados`
  (numpy, pandas) e `ml` (+ scipy, scikit-learn, matplotlib); a lição escolhe pelo
  `libraries`. Política `reuse` (opcional, documentada com os riscos): mesmo worker para vários
  lotes, com restauração de `sys.modules`/builtins/MEMFS, canário após cada lote e reciclagem
  após `RUNNER_PYODIDE_RECYCLE_AFTER` lotes.
- Limites: timeout por lote (`worker.terminate()` no estouro, `setInterruptBuffer` para o aviso
  suave), `resourceLimits` do worker, teto de heap wasm verificado após o lote, saída limitada.
  Bloqueios antes do código do aluno: `sys.modules["js"] = sys.modules["pyodide_js"] = None`,
  `fetch`/`XMLHttpRequest`/`WebSocket`/`process`/`require` removidos do global do worker.
- Pacotes vêm do tarball oficial do GitHub (`pyodide-314.0.7.tar.bz2`, SHA-256
  `192b5864e6e6d30ab074861af800cb8b4acb0998ef0f9342c3367448aeb86645`), extraídos por
  `apps/runner/scripts/fetch-pyodide.sh` para `PYODIDE_DIR` (padrão `/opt/levelusp-pyodide`):
  núcleo + fechamento de dependências de numpy, pandas, scipy, scikit-learn, matplotlib,
  statsmodels, sympy, networkx (62 MB). O Dockerfile do runner roda o script.
- Medições de referência (nuvem, 1 vCPU): boot 1,8 s; numpy +0,9 s; pandas +3 s; scikit-learn
  +11 s; RSS 250 MB (numpy) / 590 MB (dados) / 1,3 GB (ml). Snapshot de memória do Pyodide
  não funciona com pacotes carregados (erro `Unexpected hiwire entry`), por isso o pool.
- Testes: unitários do motor, `test/attacks` com os mesmos ataques do WASI mais os do
  Pyodide (acesso a `js`, `process`, rede, estouro de memória, loop infinito, tentativa de
  ler o nonce), readiness por motor.

## 8. Gamificação (apps/api + web)

- Nível do jogador pela curva da §3. Streak conta dias com conclusão (passo, lição ou quiz),
  não login. Badge "Formado(a)" = `certificates_issued ≥ 1`. XP do passo com solução vista = 50 %.
- Condição `controle` não recebe XP/badges na UI (a API continua registrando).

## 9. Fora desta rodada (fica em dívida técnica)

Notebook/células, migração de dados dos módulos globais para cursos (só quando o conteúdo
antigo for aposentado), remoção física de `final_project_*` e de `legacy/`, SMTP.
