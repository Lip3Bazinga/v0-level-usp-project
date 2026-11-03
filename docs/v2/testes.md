# Testes

| Camada | Ferramenta | Onde | Quantidade (17/10/2026) |
|---|---|---|---|
| Domínio da API (regras puras) | Vitest | `apps/api/src/**/*.spec.ts` | 108 |
| API ponta a ponta (HTTP + PostgreSQL real) | Vitest + Supertest | `apps/api/test/e2e` | 115 |
| Executor (inclui ataques da auditoria) | Vitest + Wasmtime real | `apps/runner/test` | 17 |
| Gabaritos do seed | `verify:seed` | `apps/api/scripts` | 22 lições |
| Paridade Executar × Verificar (Pyodide × WASI) | `test:paridade` | `apps/web/scripts/python-parity.mts` | 44 execuções de lições + 29 casos de borda |
| Contratos | Vitest | `packages/contracts/src` | 9 |
| Front (componentes, contextos, middleware) | Vitest + Testing Library | `apps/web/src/**/*.test.ts(x)` | 162 |
| Navegador real | Playwright | `apps/web/e2e` | 73 |

```bash
pnpm test                                             # unitários de tudo
TEST_DATABASE_URL=... pnpm --filter @levelusp/api test:e2e
pnpm --filter @levelusp/runner test                   # requer setup:python
RUNNER_TOKEN=... pnpm --filter @levelusp/web test:paridade   # requer o executor rodando
E2E_BASE_URL=http://localhost:3000 pnpm --filter @levelusp/web test:e2e
```
