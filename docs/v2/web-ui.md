# Web — telas do curso completo

O que a web (`apps/web`) ganhou com o curso em passos, as trilhas e o experimento. Regras de
negócio continuam todas na API; aqui só interface. Contrato das rotas: `pendencias-curso-completo.md` (P1).

## Lição guiada (player de passos)

`/lesson/[id]` abre o player quando `lesson.steps.length > 0`; lições sem passos seguem nas telas
clássicas (IDE, teoria, quiz). Código em `src/components/lesson-steps/`:

| Arquivo | Papel |
|---|---|
| `guided-lesson-layout.tsx` | estado da lição: progresso por passo (API + ajustes locais), passo na tela, comemoração |
| `step-sidebar.tsx` | lista de passos com estado (`completed`, `current`, `available`, `locked`) |
| `reading-step.tsx` | leitura; "Continuar" conclui pela API e avança |
| `exercise-step.tsx` | narrativa, instruções com ✓/✗, área de resposta conforme o modo (editor, lacunas ou ordenar), console, Verificar, Dica n/total, Ver solução |
| `prediction-step.tsx` | passo `Previsão`: código somente leitura, saída digitada, Enviar |
| `quiz-step.tsx` | quiz do passo, revisão por questão, "Tentar de novo" |
| `step-markdown.tsx` | Markdown do conteúdo (sem HTML bruto), com os recursos de apresentação (seção abaixo) |
| `use-step-help.ts`, `step-help.tsx` | dicas e solução, comuns ao exercício e à previsão |

Regras da tela (puras e testadas em `lib/utils/step-player.ts`):

- Abre no primeiro passo pendente; passos depois dele ficam travados (a API também recusa: 409 `STEP_LOCKED`).
- Concluir um passo não troca de tela sozinho: o aluno lê o resultado e clica em "Continuar".
- ✓/✗ por instrução vem do `checkpoint` de cada caso devolvido pelo "Verificar".
- "Ver solução" aparece depois de `solution_after_attempts` reprovações (0 = nunca) ou com o passo
  concluído; ver a solução antes de concluir reduz o XP do passo à metade (decisão da API).
- Rascunho por passo em `localStorage` (`lvl:passo:<id>`), sempre com `try/catch`. Passo sem código
  inicial começa do que o aluno escreveu no exercício anterior.
- Falha do corretor (503) mostra a mensagem da API e não conta tentativa.
- Sem sessão: a lição é exibida e a primeira ação leva ao login com `next`.

CodeMirror e o player são carregados com `next/dynamic` (lições teóricas e de quiz não baixam o editor).

## Recursos de apresentação das aulas (P2b)

Contrato: `pendencias-curso-completo.md` ("Contrato para o player"). Formato do autor: `content/README.md` §3.5–§3.7.

**Markdown rico** (`step-markdown.tsx`, usado em narrativa, instruções, dicas e quiz):

| Recurso | Como é renderizado | Se o conteúdo for inválido |
|---|---|---|
| Fórmulas `$…$` e `$$…$$` | `remark-math` + `rehype-katex`; CSS e fontes do KaTeX vêm do pacote npm (sem CDN) | o texto da fórmula aparece no lugar |
| ` ```mermaid ` | `mermaid-diagram.tsx`; a biblioteca entra por `import()` dinâmico (`lib/mermaid.ts`), com `securityLevel: "strict"` | o código aparece como bloco comum |
| Imagens | `<img>` com `alt`, `loading="lazy"` e largura máxima de 100 % | — |
| ` ```python visualizar ` | `trace-block.tsx`: o código e o botão "Visualizar" | o erro aparece como aviso |
| `::video[título](url)` | `video-embed.tsx`: o iframe só é criado depois do clique, com `sandbox` e `referrerPolicy` | a linha aparece como texto, sem link |

- Vídeo: só `https://www.youtube-nocookie.com/embed/<id>` e `https://player.vimeo.com/video/<id>`
  (`parseVideoEmbedUrl` em `lib/utils/rich-markdown.ts`). As mesmas duas origens estão no `frame-src`
  da CSP (`next.config.mjs`): mudou um lado, mude o outro. O resumo (`> Resumo: …`) é Markdown comum.
- Os componentes interativos dentro do texto usam a classe `lesson-widget` (`globals.css`) para não
  herdar a tipografia de `.prose-lesson`.

**Visualizador de execução** (`execution-visualizer.tsx`): roda no MESMO worker do "Executar". O
protocolo ganhou o comando `trace` (`lib/python/worker-protocol.ts`) e o harness, a função
`trace_project` (`lib/python/project-execution.ts`), que usa `sys.settrace` e registra, a cada linha do
arquivo de entrada, a linha, as variáveis globais e locais (`repr` cortado em 80 caracteres; sem
módulos, funções embutidas nem nomes `__x__`) e quanto já foi impresso. Para em 500 passos
(`MAX_TRACE_STEPS`) e avisa. A página pede o registro por `requestTrace` (`lib/python/trace-client.ts`),
com o mesmo tempo limite do "Executar". A tela mostra o código com a linha atual, as variáveis (as que
mudaram em destaque), a saída até o passo, anterior/próximo, controle deslizante e os atalhos ←, →,
Home e End; o passo atual é anunciado por `aria-live`. Aparece nos blocos `python visualizar` e no
botão "Visualizar" do exercício (usa o código da resposta). Não fala com a API nem conta tentativa.
Regras puras em `lib/utils/execution-trace.ts`.

**Modos do exercício** (`step.exercise_mode`; regras puras em `lib/utils/exercise-modes.ts`):

- `lacunas` (`blanks-editor.tsx`): o `main.py` inicial somente leitura, com um campo de uma linha em
  cada `___`. "Verificar" envia `{files}` com as lacunas trocadas; lacuna vazia continua `___`.
  Rascunho em `lvl:passo:<id>:lacunas`.
- `ordenar` (`parsons-board.tsx`): as linhas vêm embaralhadas da API e a web não as reordena. O aluno
  arrasta (`@dnd-kit`; soltar mais à direita ou à esquerda muda a indentação) ou usa os botões de cada
  linha: adicionar, remover, subir, descer, indentar e desindentar (o foco acompanha a linha).
  "Verificar" envia `{arrangement: [{line_id, indent}]}`; "Executar" monta o código só no navegador.
  Rascunho (a resposta do aluno) em `lvl:passo:<id>:ordem`.
- Nos dois, "Ver solução" mostra o código como texto, sem "Copiar para o editor".

**Passo `Previsão`** (`prediction-step.tsx`): não tem "Executar" nem "Visualizar" (rodar entregaria a
resposta). "Enviar" chama `POST …/predict`; em erro a tela mostra só "Ainda não é isso" e as
tentativas. "Ver solução" traz `expected_output` depois das tentativas, e o aluno ainda precisa enviá-la.
A web nunca calcula nem guarda a resposta certa de uma previsão ou de um `ordenar`.

## Trilhas e curso

- `/trilhas` e `/trilhas/[slug]` (públicas, no layout do site) leem `GET /tracks` e `GET /tracks/:slug`.
  Com sessão, cada curso mostra a situação do aluno (`Bloqueado`, `Disponível`, `Em andamento`,
  `Lições concluídas`, `Certificado`) e o painel lateral emite o certificado da trilha quando todos
  os cursos estão certificados.
- `/cursos/[id]`: lições agrupadas por módulo (`lib/utils/course-outline.ts`), seção "Projeto do nível"
  (lições `is_project`, liberadas com as demais concluídas), prova e certificado.
- Painel: bloco "Sua trilha" (`components/dashboard/track-progress-card.tsx`); "Trilhas" no menu.

## Gamificação e condição experimental

- Nível pela curva do contrato (`xpForLevel`: 0, 1000, 2500, 4500…) em `lib/utils/gamification.ts`.
- A sequência conta dias com conclusão; não há mais animação de sequência no login.
- `useGamificationVisible()` devolve `false` para `experiment_condition === "controle"`. Nesse grupo
  somem XP, nível, sequência, badges e ranking (menu, painel, perfil, ranking, cabeçalho da IDE e
  comemoração); o progresso em lições, cursos e trilha continua visível.
- `lib/events.ts`: fila de eventos de uso para `POST /me/events` — lote a cada 5 s ou 20 eventos e
  envio no `pagehide` com `fetch` + `keepalive` (o `sendBeacon` não leva o cabeçalho anti-CSRF que a
  API exige). O payload nunca leva código do aluno (chaves como `code`, `files`, `stdout` são removidas).

## Editor do professor

`/teacher/edit/[id]`: tipo "Guiada" habilita a aba **Passos** (`lesson-editor/steps-tab.tsx`): leitura,
exercício (instruções por linha → checkpoints, código inicial, solução, dicas, casos em JSON validados
pelo schema do contrato), previsão (código, saída esperada digitada pelo professor e dicas) e quiz.
No exercício, "Como o aluno responde" escolhe o modo: `lacunas` conta os `___` do código inicial;
`ordenar` troca o código inicial pelos distratores e gera `parsons_lines` a partir da solução
(`buildParsonsLines` em `steps-form.ts`: embaralhamento estável, ids dados depois de embaralhar). A aba Configurações ganhou motor da correção, "Projeto do nível",
objetivos e tentativas antes da solução. Salvar envia `steps` inteiro.

## Prévia da aula no editor do professor (Fase B)

Enquanto edita, o professor vê a aula como o aluno verá, ao lado do editor (`/teacher/edit/[id]`).

- **Layout** (`lesson-editor/preview/preview-split-layout.tsx`): a partir de 1280 px, editor à esquerda e
  prévia à direita, com divisor arrastável (`role="separator"`; setas, Home e End; largura de 30 % a 70 %)
  e botão "Esconder prévia". A largura e a escolha de esconder ficam em `localStorage`
  (`STORAGE_KEYS.lessonPreviewWidth`/`lessonPreviewHidden`, sempre com `try/catch`). Abaixo de 1280 px o
  botão "Pré-visualizar" abre a prévia em tela cheia (diálogo modal, "Voltar ao editor", Esc). A prévia é
  renderizada uma vez só e desmonta ao esconder ou fechar; por isso o passo aberto fica no estado da tela
  (`activeStepIndex`), não na prévia.
- **Dados:** a prévia lê o estado NÃO salvo do formulário, com atraso de 300 ms (`useDebouncedValue`,
  `PREVIEW_DEBOUNCE_MS`). Lição guiada com passos usa o player; sem passos (ou de outro tipo) mostra o
  conteúdo da lição (`LessonContentPreview`). A aba Conteúdo não tem mais prévia própria. O passo aberto
  na aba Passos fica selecionado na prévia (`StepsTab` aceita `openIndex`/`onOpenIndexChange`).
- **Reuso do player, sem cópia:** `ReadingStep`, `ExerciseStep`, `PredictionStep`, `QuizStep` e `StepSidebar`
  são os mesmos. O que fala com a API passou a vir de um **backend de passo** injetado por contexto
  (`lesson-steps/step-backend.tsx`): o padrão é a API real (o aluno não muda) e a prévia troca por
  `preview/preview-backend.ts`. `isPreview` libera dicas e solução sem limite e desliga os rascunhos em
  `localStorage`. A prévia não usa `useAuth`, `useProgress`, `trackEvent` nem rota de progresso,
  submissão, XP ou eventos (os testes afirmam `not.toHaveBeenCalled`).
- **Comportamento:** navegação livre entre passos; quiz corrige no navegador mostrando a correta e a
  explicação (`correctIndexes` só é passada pela prévia; o DTO `LessonStep` continua sem `correct_index`);
  "Executar" roda no Pyodide do navegador; a previsão roda o código do passo no Pyodide e compara com o que
  o professor digitar; lacunas e ordenar funcionam. "Verificar" mostra "A correção roda no servidor"
  (`PreviewVerifyUnavailable`); `createPreviewBackend(..., { verify })` é o ponto de extensão do
  "Testar gabarito" (Fase F).
- **Avisos de conteúdo** (`preview-model.ts`, `contentWarnings`, mais Mermaid assíncrono): fórmula KaTeX
  inválida, diagrama Mermaid inválido, imagem sem texto alternativo e passo sem campos obrigatórios aparecem
  num bloco `role="status"` no topo da prévia; erro de renderização cai no `PreviewErrorBoundary`.
- **Larguras por container query:** o player passou a usar `@container` e `@5xl:` no lugar de `lg:`
  (`step-sidebar`, `exercise-step`, `guided-lesson-layout`, prévia). Para o aluno é o mesmo ponto de corte
  (64rem = 1024 px, a largura da janela); na prévia em meia largura o exercício empilha em vez de espremer
  as três colunas.
- Screenshots (Playwright, fora do git): `.claude-transfer/screenshots-previa/`.

## Limpeza da auditoria

- "Configurações" virou `/perfil/me/conta` (dados da conta e senha); `/settings` redireciona.
- Saíram: botões de login com Google/GitHub, textos "Em breve"/"Não disponível", a UI dos campos
  `final_project_*` (o projeto é uma lição) e a página `/impacto` e os contadores da home, que
  traziam números sem fonte (`/impacto` redireciona para `/sobre`).
- HSTS em produção e redirects no `next.config.mjs`.

## Terminal no navegador (Fase F)

Aba "Terminal" ao lado do Console nos exercícios do player (`ConsoleTerminalTabs`): xterm.js sobre o
Pyodide do worker compartilhado, carregado só quando a aba é aberta. **Decisão de cabeçalhos: o site
não usa COOP/COEP e o terminal não usa SharedArrayBuffer** (`input()` por suspensão de pilha com
fallback de reexecução; Ctrl+C reinicia o worker). Motivos, protocolo, limites e pendências em
`terminal-no-navegador.md`.

**Executar por nível.** Abaixo do nível que libera o "Executar" (`RUN_BUTTON_MIN_LEVEL` ou o limite do curso), o
botão fica desabilitado com a faixa "Executar libera no nível N; até lá, use o terminal: python main.py" e a aba
Terminal abre no lugar do Console (`run-button-gate.tsx`, `run-lock-notice.tsx`, `isTerminalPreferred` do
`ConsoleTerminalTabs`). Vale no player de passos e na lição clássica (que ganhou a aba Terminal e o atalho
Ctrl+Enter bloqueado). Professor, admin e a prévia do professor sempre veem o botão. O admin ajusta o limite em
Admin → Cursos → "Nível do Executar". Regra, conta e proposta de limite em `motores-e-ide.md` §4.

## Testes

`pnpm --filter @levelusp/web typecheck lint test build`. Testes novos: player (`guided-lesson-layout.test.tsx`),
regras do player, fila de eventos, trilhas (utilitários e página), condição controle (`student-shell.test.tsx`),
esboço do curso e formulário/abas de passos do professor. Do P2b: Markdown rico (`step-markdown.test.tsx`),
visualizador (`execution-visualizer.test.tsx`, `execution-trace.test.ts`), lacunas e ordenar
(`exercise-modes.test.ts`), o player nos modos novos e na previsão (`guided-lesson-modes.test.tsx`) e a
aba Passos (`steps-tab.test.tsx`). Da Fase B: backend de passo e prévia (`step-backend.test.tsx`, `preview-*.test.ts(x)`), layout dividido (`preview-split-layout.test.tsx`), `use-debounced-value`, `use-media-query` e `preview-layout`. Pyodide, Mermaid e CodeMirror são simulados nesses testes.
