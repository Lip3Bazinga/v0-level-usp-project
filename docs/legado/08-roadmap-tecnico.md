# 08 — Roadmap Técnico e Dívidas Conhecidas

Consolidação das dívidas técnicas e melhorias planejadas, priorizadas. A legenda de severidade segue o [README](./README.md#convenções).

## Priorização

```mermaid
quadrantChart
    title Esforço x Impacto
    x-axis "Baixo esforço" --> "Alto esforço"
    y-axis "Baixo impacto" --> "Alto impacto"
    quadrant-1 "Planejar"
    quadrant-2 "Fazer primeiro"
    quadrant-3 "Preencher tempo"
    quadrant-4 "Avaliar"
    "Build quebrado": [0.15, 0.95]
    "Segredos no Git": [0.2, 0.9]
    "Integridade do avaliador": [0.55, 0.92]
    "Timeout de execução": [0.4, 0.8]
    "Self-host Pyodide": [0.5, 0.6]
    "Reuso do worker": [0.45, 0.55]
    "Sync schema.sql": [0.3, 0.4]
    "De-mock analytics/badges": [0.6, 0.45]
    "Rotas duplicadas": [0.15, 0.25]
```

## 🔴 Bloqueadores

### <a id="bloqueador-build"></a>Build de produção quebrado
- **Sintoma:** `next build` falha no *type-check* em `.next/dev/types/validator.ts` com erro de "operação aritmética".
- **Causa raiz:** bug de geração de tipos do **Next.js 16.2.0** — o validador gerado emite, para a rota raiz, um comentário sem o prefixo `//` (`/../app/page.tsx`), que o TypeScript interpreta como divisão. O erro está no **arquivo gerado pelo framework**, não em `app/page.tsx` (que é válido). Como o `tsconfig.json` inclui `.next/dev/types/**/*.ts`, o artefato entra no type-check.
- **Mitigação recomendada:** definir `typescript: { ignoreBuildErrors: true }` em `next.config.mjs`. O type-check real continua disponível via `tsc --noEmit` (que não inclui os tipos `dev/`). Alternativa frágil: limpar `.next` e rebuildar.

### Segredos versionados
- **Sintoma:** `.env` com credenciais reais commitado.
- **Ação:** remover do Git (`git rm --cached .env` + `.gitignore`), **rotacionar** chaves no Supabase, mover config para a Vercel. Detalhes em [06 — Segurança](./06-seguranca-rbac.md#gestão-de-segredos--ação-requerida).

## 🔴 Integridade do avaliador Python

Detalhado em [05 — Avaliador](./05-avaliador-python.md#limitações-conhecidas). Resumo dos itens e correção alvo:

| ID | Item | Correção alvo |
|----|------|---------------|
| A1 | Modo `assert` gera falsos positivos | Não contar por regex; padronizar formato verificável |
| A2 | Burla por namespace compartilhado | Isolar gabarito; capturar símbolos do aluno por referência |
| A3 | Código do aluno executa 2× | Executar 1× e reusar o namespace nos testes |
| A4 | Feedback de falha pobre | Extrair mensagem do `AssertionError` + nome do teste |

## 🟡 Performance / recursos (avaliador)

| ID | Item | Correção alvo |
|----|------|---------------|
| P1 | Sem timeout / sem botão Parar | *Watchdog* no main thread + `worker.terminate()` por tempo (usar `lessons.time_limit`) |
| P2 | Pyodide baixado da CDN a cada sessão | *Self-host* com `Cache-Control: immutable` |
| P3 | Worker recriado a cada lição | Worker *singleton* reusado entre navegações |
| P4 | Pacotes sem aguardar instalação | Estado `installing` que bloqueia Executar |
| P5 | Pyodide fixo e dependente da CDN | Fixar versão e *self-host* |

## 🟡 Dados e conteúdo

| Item | Situação | Ação |
|------|----------|------|
| `schema.sql` desatualizado | Só 3 das 7 tabelas reais | Sincronizar DDL versionado com o banco em produção |
| Analytics do admin | Dados *mockados* (funil, erros, coortes) | Derivar de `lesson_progress`/`audit_log`; remover cards sem fonte |
| Badges | `mockBadges` *hardcoded* | Criar tabelas `badges`/`user_badges` + regras de unlock + conectar `badge-earned-modal` |
| Heatmap de atividade | `generateMockActivityData()` | `fetchUserActivity` agregando `lesson_progress.completed_at` |
| Settings do admin | Não persiste | Tabela `platform_settings` + `fetch/update` |

## 🟢 Limpeza

| Item | Ação |
|------|------|
| Rotas duplicadas `/` e `/landing` | Remover/redirecionar `/landing` |
| `/showcase` (demo do design system) | Restringir a dev ou remover do menu |
| Modais de gamificação órfãos (`course-complete`, `enrollment`, `teacher-success`, `streak`) | Conectar aos gatilhos correspondentes |
| `pyodide-worker.js` legado | Remover (worker ativo é o `-v2`) |
| Aviso `middleware` deprecado (Next 16) | Migrar para convenção `proxy` |
| `file-explorer.tsx` | Operações de arquivo (renomear/duplicar/excluir) são apenas UI |

## Evolução futura (além do escopo atual)

```mermaid
timeline
    title Evolução proposta
    Curto prazo : Corrigir build e segredos
                : Integridade do avaliador (A1–A4)
                : Timeout de execução (P1)
    Médio prazo : Self-host + reuso do Pyodide (P2–P5)
                : De-mock de analytics, badges e heatmap
                : Sincronizar schema.sql
    Longo prazo : Execução server-side opcional (antifraude real)
                : Sistema de emblemas completo com unlock automático
                : Certificados de conclusão de curso
                : Testes automatizados (unit + e2e)
```

> **Nota sobre antifraude.** A validação 100% à prova de adversário exigiria executar o Python **no servidor**, em sandbox isolado. Isso reintroduz custo e superfície de ataque que a arquitetura atual evita de propósito. É uma decisão de produto: manter a execução no cliente (barato, escalável, mas burlável por usuário avançado) ou oferecer um caminho server-side para avaliações que exijam integridade forte (ex.: provas).
