# Testes

| Camada | Ferramenta | Onde | Quantidade (03/11/2026) |
|---|---|---|---|
| Domínio e serviços da API (inclui config/env e SMTP real contra servidor falso) | Vitest | `apps/api/src/**/*.spec.ts` | 133 |
| API ponta a ponta (HTTP + PostgreSQL real; links públicos em `public-links.e2e.ts`) | Vitest + Supertest | `apps/api/test/e2e` | 119 |
| Executor (inclui ataques da auditoria) | Vitest + Wasmtime real | `apps/runner/test` | 17 |
| Gabaritos do seed | `verify:seed` | `apps/api/scripts` | 22 lições: referência aprovada, esqueleto e 72 soluções erradas reprovadas, correção forte |
| Paridade Executar × Verificar (Pyodide × WASI) | `test:paridade` | `apps/web/scripts/python-parity.mts` | 44 execuções de lições + 29 casos de borda |
| Contratos | Vitest | `packages/contracts/src` | 11 |
| Front (componentes, contextos, middleware, config de execução) | Vitest + Testing Library | `apps/web/src/**/*.test.ts(x)` | 173 |
| Navegador real | Playwright | `apps/web/e2e` | 73 |

```bash
pnpm test                                             # unitários de tudo
TEST_DATABASE_URL=... pnpm --filter @levelusp/api test:e2e
pnpm --filter @levelusp/runner test                   # requer setup:python
RUNNER_TOKEN=... pnpm --filter @levelusp/web test:paridade   # requer o executor rodando
E2E_BASE_URL=http://localhost:3000 pnpm --filter @levelusp/web test:e2e
shellcheck -x infra/scripts/levelusp-vm.sh infra/scripts/backup.sh infra/scripts/lib/vm-common.sh
```

Scripts de backup/restauração: além do `verify` semanal na VM, eles rodam contra um PostgreSQL
local com `BACKUP_MODE=direct` (`PGHOST`/`PGUSER`/`PGPASSWORD`, `DB_NAME`, `UPLOADS_DIR`,
`BACKUP_DIR` num arquivo apontado por `LEVELUSP_ENV_FILE`) — útil para testar mudanças neles.
