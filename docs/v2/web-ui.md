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
| `exercise-step.tsx` | narrativa, instruções com ✓/✗, editor, console, Verificar, Dica n/total, Ver solução |
| `quiz-step.tsx` | quiz do passo, revisão por questão, "Tentar de novo" |
| `step-markdown.tsx` | Markdown do conteúdo (sem HTML bruto); o P2b estende este componente |

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
pelo schema do contrato) e quiz. A aba Configurações ganhou motor da correção, "Projeto do nível",
objetivos e tentativas antes da solução. Salvar envia `steps` inteiro.

## Limpeza da auditoria

- "Configurações" virou `/perfil/me/conta` (dados da conta e senha); `/settings` redireciona.
- Saíram: botões de login com Google/GitHub, textos "Em breve"/"Não disponível", a UI dos campos
  `final_project_*` (o projeto é uma lição) e a página `/impacto` e os contadores da home, que
  traziam números sem fonte (`/impacto` redireciona para `/sobre`).
- HSTS em produção e redirects no `next.config.mjs`.

## Testes

`pnpm --filter @levelusp/web typecheck lint test build`. Testes novos: player (`guided-lesson-layout.test.tsx`),
regras do player, fila de eventos, trilhas (utilitários e página), condição controle (`student-shell.test.tsx`),
esboço do curso e formulário/abas de passos do professor.
