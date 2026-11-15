# Testes

| Camada | Ferramenta | Onde | Quantidade (03/11/2026) |
|---|---|---|---|
| Domínio e serviços da API (inclui config/env e SMTP real contra servidor falso) | Vitest | `apps/api/src/**/*.spec.ts` | 167 |
| API ponta a ponta (HTTP + PostgreSQL real; links públicos em `public-links.e2e.ts`) | Vitest + Supertest | `apps/api/test/e2e` | 124 |
| Suíte de ataques à API (autorização gerada das rotas, BOLA, mass assignment, injeção, sessão, lógica de negócio, uploads, padrões inseguros) | Vitest + Supertest | `apps/api/test/security` | 99 |
| Falsificação de veredito contra o executor real (3 falsificadores universais × 22 lições, truques de unittest, burla de regras de código) — também em `test:attacks` | Vitest + Wasmtime real | `apps/api/test/security/grading-forgery.e2e.ts` | 40 |
| Ataques ao executor (fuga do sandbox, recursos, modo estrito, falsificação, unittest) | Vitest + Wasmtime real | `apps/runner/test/attacks` | 57 |
| Ataques à web (cabeçalhos, CVEs do Next/React, open redirect, CSRF, XSS renderizado) | Playwright | `apps/web/e2e/security` | 12 |
| Cadeia de suprimentos e bundle da web (regras) | Vitest | `packages/security/src` | 15 |
| Executor (inclui ataques da auditoria, fila e admissão) | Vitest + Wasmtime real | `apps/runner/test` | 43 |
| Gabaritos do seed | `verify:seed` | `apps/api/scripts` | 22 lições: referência aprovada, esqueleto e 72 soluções erradas reprovadas, correção forte |
| Paridade Executar × Verificar (Pyodide × WASI) | `test:paridade` | `apps/web/scripts/python-parity.mts` | 44 execuções de lições + 29 casos de borda |
| Contratos | Vitest | `packages/contracts/src` | 16 |
| Front (componentes, contextos, middleware, config de execução) | Vitest + Testing Library | `apps/web/src/**/*.test.ts(x)` | 210 |
| Navegador real (fluxos, UX, acessibilidade) | Playwright | `apps/web/e2e` | 73 (+12 de segurança = 85) |
| Ferramenta de carga (opções, segurança do alvo, percentis, monitor, cenários contra servidor falso) | Vitest | `tools/load/src` | 22 |
| Carga de turma e capacidade (não roda no CI) | `pnpm load:turma` | `tools/load` | cenários `turma` e `rajada`; resultados em [desempenho-e-carga.md](./desempenho-e-carga.md) |

```bash
pnpm test                                             # unitários de tudo
TEST_DATABASE_URL=... pnpm --filter @levelusp/api test:e2e
TEST_DATABASE_URL=... pnpm --filter @levelusp/api test:security   # suíte de ataques (seguranca.md)
pnpm security:deps && pnpm security:web-bundle                     # cadeia de suprimentos e bundle
pnpm --filter @levelusp/runner test                   # requer setup:python
pnpm --filter @levelusp/runner test:attacks           # ataques ao sandbox (~30 s)
RUNNER_TOKEN=... pnpm --filter @levelusp/web test:paridade   # requer o executor rodando
E2E_BASE_URL=http://localhost:3000 pnpm --filter @levelusp/web test:e2e
shellcheck -x infra/scripts/levelusp-vm.sh infra/scripts/backup.sh infra/scripts/lib/vm-common.sh
# Carga de turma (pilha de produção no ar; só contra localhost sem --alvo-autorizado)
RUNNER_TOKEN=... pnpm load:turma --alvo http://localhost:3000 --alunos 40 --duracao 20 --compressao 4
pnpm load:turma --cenario rajada --alunos 20,40,80,120 --janela 10 --ip-por-aluno
```

Scripts de backup/restauração: além do `verify` semanal na VM, eles rodam contra um PostgreSQL
local com `BACKUP_MODE=direct` (`PGHOST`/`PGUSER`/`PGPASSWORD`, `DB_NAME`, `UPLOADS_DIR`,
`BACKUP_DIR` num arquivo apontado por `LEVELUSP_ENV_FILE`) — útil para testar mudanças neles.

## Curso completo (medido em 14/11/2026, branch `feat/curso-completo`)

A tabela acima é o retrato de 03/11. Com a API de passos e trilhas, o player e o conteúdo do Nível 1:

| Camada | Comando | Resultado |
|---|---|---|
| Contratos | `pnpm --filter @levelusp/contracts test` | 43 |
| Banco (seed e importação do pacote) | `pnpm --filter @levelusp/db test` | 11 |
| API — domínio, serviços e ferramentas de conteúdo | `pnpm --filter @levelusp/api test` | 315 |
| API ponta a ponta (lição guiada até o certificado de trilha, importação idempotente do pacote real, recursos de apresentação) | `test:e2e` | 148 |
| Ataques à API (inclui forja nas rotas de passo, previsão e assets) | `test:security` | 111 |
| Falsificação de veredito contra o executor real | `test:attacks` (API) | 40 |
| Executor (WASI + Pyodide) | `pnpm --filter @levelusp/runner test` com `PYODIDE_DIR` | 62 |
| Ataques ao executor (WASI + Pyodide) | `test:attacks` (runner) com `PYODIDE_DIR` | 73 |
| Front | `pnpm --filter @levelusp/web test` | 340 |
| Conteúdo — lint | `pnpm content:check` | 253 lições, 487 passos |
| Conteúdo — Nível 1 no executor real | `pnpm content:verify --curso n1-fundamentos` | 47 lições: 133 exercícios e 65 previsões/blocos visualizar verificados |

Não rodados nesta rodada: Playwright (`apps/web/e2e`, precisa da pilha inteira no ar), `verify:seed`
e `test:paridade`. Os e2e da API rodaram em PostgreSQL 16 local; a produção usa 17.

Para repetir a verificação de conteúdo: suba o executor (`pnpm --filter @levelusp/runner setup:python`,
`build`, e `RUNNER_TOKEN=… PORT=8091 node apps/runner/dist/main.js`) e rode
`RUNNER_URL=http://127.0.0.1:8091 RUNNER_TOKEN=… pnpm content:verify --curso n1-fundamentos`.