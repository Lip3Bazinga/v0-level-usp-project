# LevelUSP v2 — Contexto para agentes

Plataforma gamificada de ensino de Python (USP). UI, mensagens, commits e
comentários em **pt-BR**. Monorepo pnpm + Turborepo.

## Arquitetura

```
apps/web       Next.js 16 (App Router) — só interface. Fala com a API via /api/* (rewrite).
apps/api       NestJS 12 (Express) — TODA regra de negócio, auth própria, correção, gamificação.
apps/runner    Executor isolado: CPython 3.14 WASI no Wasmtime. Sem segredos, sem banco, sem rede.
packages/contracts  Tipos de domínio + schemas Zod (fonte única do contrato web⇄api⇄runner).
packages/db    Schema Drizzle (PostgreSQL 17), migrações SQL versionadas, seed, importação do Supabase.
infra/         Docker, compose (dev/homolog/prod), Cloudflare Tunnel, scripts de deploy e backup.
legacy/        Código antigo (Supabase, avaliador Python da Vercel). Só referência — não editar.
```

## Invariantes de segurança (NUNCA violar)

1. Gabaritos (`lessons.test_cases`, `*.correct_index`) nunca saem da API para o aluno.
   O executor recebe só entradas (sondas); a comparação é feita na API (`modules/grading`).
2. Progresso, XP, nível, sequência e badges só mudam via `GamificationService`, depois de
   um veredito do servidor. Não existe rota para o cliente gravar progresso.
3. Toda rota exige sessão (guard global, deny-by-default). Rotas públicas: `@Public()`.
   Papéis: `@Roles("teacher", "admin")`. Dono do recurso: checar no service.
4. Toda entrada é validada com schema Zod de `@levelusp/contracts` (`ZodPipe`); ids com `UuidPipe`.
5. Métodos que alteram estado exigem o cabeçalho `x-levelusp-csrf: 1` (o front já envia).
6. Erros: lance `AppError` (`common/errors/app-error.ts`) com mensagem pt-BR segura. Nunca
   devolva stack trace, SQL ou mensagem de exceção interna ao cliente.
7. Nunca commitar `.env`/segredos (repo público). Segredos de homolog/prod ficam em `infra/env/*.env` (ignorado).
8. Schema só muda por migração Drizzle (`pnpm db:generate`) — nunca editar migração já aplicada.

## Convenções da API (apps/api/src)

- Um módulo por agregado em `modules/<nome>/`: `*.controller.ts` (HTTP fino: valida e delega)
  → `*.service.ts` (regras, autorização de dono) → `*.repository.ts` (Drizzle) → `*.mapper.ts`
  (linha → DTO). Regras puras em `*.domain.ts` com testes `*.spec.ts` ao lado.
- Respostas usam os tipos de `@levelusp/contracts` em **snake_case** (compatível com o front).
- Rotas sob o prefixo global `/api`. Recursos do usuário logado em `/me/...`; administração em `/admin/...`.
- Registrar o módulo em `src/modules/index.ts`.
- Auditoria de ações administrativas: `AuditService.log(user, acao, alvo, meta, severidade)`.
- Limite por usuário: `RateLimitService.consume(RATE_LIMITS.<política>, sujeito)` (políticas em `common/rate-limit/rate-limit.policies.ts`).
- Verbos: `list`/`find` (pode faltar)/`get` (precisa existir)/`count`/`create`/`update`/`delete`/`upsert`;
  entidade no nome só se não for a principal da classe; `My` para `/me` (`listMyProgress`). Sem `insert`/`remove`/`save`.
  Handler do controller = nome do método do service. `@Controller()` recebe o maior prefixo comum das rotas.
- Padrões de código (nomes, tipos, SOLID): `docs/v2/padroes-de-codigo.md`.
- Testes: unitários `vitest --project unit` (domínio/serviços); e2e `vitest --project e2e`
  com PostgreSQL real (`test/e2e/harness.ts`: `createTestApp`, `signUp`, `agent`, `FakeRunner`).

## Convenções da web (apps/web/src)

- `lib/api`: `fetchX` (GET), `fetchMyX`, `fetchAdminX`, `createX`/`updateX`/`deleteX`/`setX…`; todas lançam
  `ApiError` (`getErrorMessage`, `isApiError`, `nullOnStatus`, `toApiResult`). O `AuthContext` devolve
  `{ ok, error: string }` com a mensagem pronta (não `ApiResult`).
- `lib/constants` (barrel): `ROUTES`, `STORAGE_KEYS`, tempos em `timing.ts` (`SAVED_FEEDBACK_DURATION_MS`,
  `CELEBRATION_AUTO_CLOSE_MS`…), `MAX_COVER_IMAGE_BYTES`, rótulos (`DIFFICULTY_LABELS`, `LIBRARY_CATEGORY_LABELS`).
- `lib/utils` (barrel): `cn`, `format*`, `localDateKey`/`todayKey`, `indexBy`, `isOneOf`, `diffChangedFields`,
  `moveItem`, `getPasswordPolicyError`, `downloadCsv`/`downloadJson`/`downloadText`, arquivos de projeto.
- Hooks: `useAsyncResource` (toda busca), `useTransientValue`/`useTransientFlag`, `useSubmitLock`,
  `useLessonNavigation`, `useModalA11y`, `useSignOut`, `usePython`.
- Componentes comuns: `design-system/` (`BrandLogo`/`BrandMark`, `Spinner`, `LevelButton` + `levelButtonClasses`
  para `<Link>`), `auth/` (campos e layouts de login), `dashboard/student-shell.tsx` (`StudentShell`,
  `StudentHeaderBar`), `admin/admin-modal.tsx` (`AdminModal`), `gamification/celebration-modal.tsx`.
- Confirmação com `swalConfirm`; avisos com `swalToast` ou o toast do admin (`ToastKind` único). Classes
  condicionais com `cn()`. Modais recebem `isOpen`. ESLint `react-hooks/*` é erro.

## Comandos

```bash
pnpm install
pnpm build                       # contracts → db → api/runner/web
pnpm test                        # unitários de todos os pacotes
pnpm --filter @levelusp/api test:e2e   # requer Postgres (TEST_DATABASE_URL)
pnpm --filter @levelusp/runner setup:python   # baixa Wasmtime + CPython WASI
docker compose -f infra/compose/compose.dev.yml up   # Postgres local
```

## Regras para subagentes

- Não fazem `git commit`/push; editam arquivos e reportam a lista de mudanças.
- Escopos de arquivos disjuntos entre agentes paralelos.
- Antes de reportar: `tsc --noEmit` do pacote tocado e os testes do pacote passando.
