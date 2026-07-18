# Contribuindo com o LevelUSP

Guia para desenvolvedores. Leia antes do primeiro commit — os padrões daqui
são verificados no CI e cobrados em revisão.

## Setup

```bash
git clone https://github.com/Lip3Bazinga/v0-level-usp-project.git levelusp
cd levelusp
pnpm install
cp .env.local.example .env   # chaves do projeto Supabase
pnpm dev
```

## Verificações (rode antes de todo push)

| Comando | O quê |
|---------|-------|
| `pnpm exec tsc --noEmit` | Type-check completo (o build NÃO checa tipos — bug de codegen do Next 16 com `ignoreBuildErrors`) |
| `pnpm lint` | ESLint com as regras do Next (flat config em `eslint.config.mjs`) |
| `python3 scripts/verify_lessons.py` | Se tocou em gabaritos/lições — precisa terminar em "TODAS PASSARAM" |
| `pnpm build` | Antes de PRs grandes |

O CI roda tudo isso; o deploy da Vercel valida o build com envs reais.

## Arquitetura em camadas — onde cada coisa mora

Detalhes em [`docs/02-arquitetura.md`](./docs/02-arquitetura.md). Resumo executivo:

| Vou escrever… | Onde | Nunca |
|---------------|------|-------|
| Componente/página | `components/`, `app/*/page.tsx` | Query SQL, segredo, service role |
| Query do browser (RLS) | `lib/supabase/<agregado>.ts` | `select("*")` em lessons; campos sempre explícitos |
| Regra com service role | `lib/server/*.ts` | Importar em componente cliente |
| Endpoint | `app/api/*/route.ts` fino: `requireUser`/`requireAdmin` → validação → serviço → JSON | Lógica de negócio no controller |
| Correção de exercício | `api/evaluate.py` (função Python, raiz `api/`) | Avaliar código de aluno no browser como veredito oficial |
| Mudança de banco | Migração em `supabase/migrations/` + aplicar no projeto + refletir em `supabase/schema.sql` | DROP em tabela com dados; mudança sem migração versionada |

## Invariantes de segurança (quebrar = reprovação imediata do PR)

1. `hidden_tests` e `exam_questions.correct_index` **nunca** chegam ao cliente.
2. Toda rota `/api/*` autentica (Bearer JWT) e responde erro em JSON.
3. Nada de `.env`/segredos no repositório (é público). Gabaritos de prova
   também não são versionados — vivem só no banco.
4. Ações anexas (notificação, auditoria, rate limit) são **fail-open**:
   nunca derrubam a ação principal.

## Estilo

- **pt-BR** em UI, comentários e mensagens de commit.
- TypeScript sem `any` novo; prefira tipos de `lib/supabase/types.ts`.
- Sem ponto e vírgula; aspas duplas; 2 espaços (Python: 4). `.editorconfig` cuida do resto.
- Comentários explicam **porquês**, não o óbvio.
- Componentes acima de ~300 linhas: extraia subcomponentes.

## Commits e PRs

- Mensagem: `tipo: resumo em pt-BR` (`feat:`, `fix:`, `refactor:`, `chore:`,
  `docs:`, `perf:`) + bullets do que/porquê no corpo quando não for trivial.
- PRs pequenos e focados; descreva **como testou**.
- Mudou schema? O PR precisa conter a migração E o `schema.sql` atualizado.
- Mudou `package.json`? O workflow `Lockfile` regenera o `pnpm-lock.yaml`
  automaticamente (ou rode `pnpm install` e commite o lock junto).

## Fluxo de conteúdo (lições/prova)

Criadores de conteúdo não-devs: [`GUIA-DO-PROFESSOR.md`](./GUIA-DO-PROFESSOR.md).
Devs alterando gabaritos: adicione a solução de referência correspondente em
`scripts/verify_lessons.py` — lição sem solução verificada não entra.
