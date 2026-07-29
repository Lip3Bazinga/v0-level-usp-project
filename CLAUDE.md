# LevelUSP — Contexto para Claude (sessões e subagentes)

Plataforma educacional gamificada de Python da USP. Next.js 16 App Router +
Supabase (projeto `pzmxaoxtljmqajyyrkhw`, sa-east-1) + Pyodide no browser +
avaliador server-side em Vercel Python Function. UI, commits e comentários em
**pt-BR**. Produção: https://level-usp.vercel.app (auto-deploy no push da main).

## Invariantes de segurança (NUNCA violar)

1. `lessons.hidden_tests`, `exam_questions.correct_index` e
   `lesson_quiz_questions.correct_index` **nunca** chegam ao cliente. Grants por
   coluna + RLS deny-all garantem isso no banco.
2. Correção oficial só no servidor: código em `api/evaluate.py` (Python
   Function na raiz `api/`, NÃO em `app/api/`); prova em `app/api/exam/*`;
   questionário de lição em `app/api/lesson-quiz/[lessonId]/submit`.
3. `select("*")` em `lessons` FALHA por design — use `PUBLIC_LESSON_FIELDS`
   (`lib/supabase/lessons.ts`).
4. Schema: apenas DDL aditivo (nunca DROP com dados); aplicar via MCP Supabase
   `apply_migration` E versionar em `supabase/migrations/`.
5. Nunca commitar `.env`/segredos (o repo é PÚBLICO; gabaritos de prova também
   não são versionados — vivem só no banco).
6. `awardXp()` permanece no cliente (animações); RPCs do banco já validam.
7. Rotas `/api/*` autenticam via Bearer JWT e respondem 401 em JSON (o
   middleware não redireciona APIs).

## Mapa do código

- Avaliador: `api/evaluate.py` · worker browser: `public/pyodide-worker-v2.js`
  + `lib/pyodide-worker-singleton.ts` + `hooks/use-python.ts`
- IDE da lição: `contexts/ide-context.tsx` (estado `canVerify`: Verificar só
  após execução sem erros) + `app/lesson/[id]/`
- Prova/certificado: `lib/server/exam.ts`, `app/api/exam/*`,
  `app/api/certificate/*`, `app/cursos/[id]/prova/`, `app/certificado/[code]/`
- Auth admin de rotas: `lib/admin-auth.ts` (`requireAdmin`, `serviceClient`,
  `logAudit`) · rate limit: `lib/server/rate-limit.ts`
- Docs técnicos: `docs/` (05 = avaliador, 09 = prova/certificação) · guia
  não-técnico: `GUIA-DO-PROFESSOR.md` · roadmap: `PLANO-DE-DESENVOLVIMENTO.md`

## Ambiente de trabalho (Cowork/sandbox) — leia antes de rodar comandos

- Trabalhe SEMPRE no clone `levelusp` (fora do OneDrive). A cópia antiga em
  OneDrive corrompia arquivos (NULs/truncamento) — se algum arquivo parecer
  truncado, valide: sem byte NUL, termina em `\n`, chaves balanceadas.
- Cada chamada bash é independente e morre em ~45s. **Não** rode
  `pnpm install`/builds longos no sandbox; processos em background morrem com
  a chamada.
- Rede do sandbox: registry.npmjs.org e github.com funcionam;
  `*.supabase.co` e `*.vercel.app` são BLOQUEADOS (use os MCPs Supabase e
  Vercel para banco e deploys).
- Validação de build = push → acompanhar deploy pelo MCP da Vercel
  (`get_deployment` / `get_deployment_build_logs`). `typescript.ignoreBuildErrors`
  está ativo (bug de codegen do Next 16): erros de TIPO não quebram build —
  rode `tsc --noEmit` no CI/local quando possível.
- Gabaritos das lições: valide com `python3 scripts/verify_lessons.py`
  (autocontido; deve terminar em "TODAS PASSARAM").

## Protocolo de entrega (loop padrão)

1. Editar → validar integridade dos arquivos tocados.
2. `git add` (arquivos explícitos) → conferir `git show :arquivo` == disco →
   commit com mensagem pt-BR descritiva → push.
3. Acompanhar o deploy na Vercel até `READY`; se `ERROR`, ler build logs e
   corrigir antes de qualquer outra coisa.
4. Mudança de banco: `apply_migration` (MCP) + arquivo em
   `supabase/migrations/` + refletir em `supabase/schema.sql`.

## Regras para subagentes

- Subagentes **não** fazem git nem tocam no banco: editam arquivos, validam
  integridade e reportam a lista de mudanças; o orquestrador integra.
- Escopos de arquivos disjuntos entre agentes paralelos.
- Definições prontas em `.claude/agents/` (dev-levelusp, revisor-levelusp).
