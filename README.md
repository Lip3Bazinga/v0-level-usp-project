# LevelUSP

Plataforma **gratuita e gamificada de ensino de Python** da Universidade de São
Paulo. O aluno programa numa IDE que roda Python no navegador, recebe correção
automática no servidor, ganha XP e badges e, ao concluir um curso com prova
final, um **certificado com verificação pública**.

## Arquitetura (v2)

| Peça | Tecnologia |
|---|---|
| Front | Next.js 16 · React 19 · Tailwind v4 · Pyodide (WebAssembly) no navegador |
| API | NestJS 12 · TypeScript · Zod · Drizzle ORM · autenticação própria (argon2id + sessão httpOnly) |
| Correção | Executor isolado: **CPython 3.14 WASI no Wasmtime**, sem rede, segredos ou banco |
| Banco | PostgreSQL 17 |
| Infra | Docker Compose · Cloudflare Tunnel · GitHub Actions (CI/CD) · GHCR |

```
apps/web  apps/api  apps/runner  packages/contracts  packages/db  infra/  docs/v2/
```

## Começando

```bash
pnpm install
docker compose -f infra/compose/compose.dev.yml up -d   # PostgreSQL local
pnpm --filter @levelusp/runner setup:python             # Wasmtime + CPython WASI
pnpm build && pnpm db:migrate && SEED_DEMO_USERS=true pnpm db:seed
pnpm dev                                                # http://localhost:3000
```

Usuários de demonstração (seed): `aluna@levelusp.dev` e
`professora@levelusp.dev`, senha `demonstracao123`.

## Testes

`pnpm test` (unitários) · `pnpm --filter @levelusp/api test:e2e` (API + Postgres)
· `pnpm --filter @levelusp/runner test` (sandbox) · `pnpm --filter @levelusp/web test:e2e` (Playwright).
Detalhes em [docs/v2/testes.md](docs/v2/testes.md).

## Documentação

| Para quem | Onde |
|---|---|
| Desenvolvimento | [docs/v2/](docs/v2/) — arquitetura, motor de correção, segurança, ambientes e deploy |
| Professores | [GUIA-DO-PROFESSOR.md](GUIA-DO-PROFESSOR.md) |
| Agentes de IA | [CLAUDE.md](CLAUDE.md) |
| Versão anterior (Supabase/Vercel) | [docs/legado/](docs/legado/) |
