# Como contribuir

## Fluxo de branches

- `main` → **produção** (deploy com aprovação no environment `production`).
- `develop` → **homologação** (deploy automático após o CI).
- Trabalhe em `feature/<assunto>` ou `fix/<assunto>` a partir de `develop` e abra PR para `develop`.
- Para publicar em produção: PR de `develop` para `main`.

## Antes de abrir o PR

```bash
pnpm build && pnpm typecheck && pnpm lint && pnpm test
pnpm --filter @levelusp/api test:e2e          # se mexeu na API
```

- Mudou o schema? `pnpm db:generate` gera a migração em `packages/db/migrations` — nunca edite uma migração já aplicada.
- Rota nova? Atualize `docs/v2/api-rotas.md` e o schema em `packages/contracts`.
- Regra de negócio nova? Teste unitário (`*.domain.spec.ts`) e e2e.

## Convenções

- Interface, mensagens, commits e comentários em **pt-BR**.
- Commits no estilo Conventional Commits: `feat(api): ...`, `fix(web): ...`, `docs: ...`.
- Invariantes de segurança e camadas da API: veja [CLAUDE.md](CLAUDE.md).
- Nunca versionar `.env` ou segredos — o repositório é público.
