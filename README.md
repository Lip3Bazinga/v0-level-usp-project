# LevelUSP 🚀

Plataforma **gratuita e gamificada de ensino de Python**, iniciativa da
Universidade de São Paulo (USP). Os alunos aprendem programando numa IDE que
roda Python de verdade no navegador, ganham XP, badges e — ao concluir um
curso com prova final e projeto — um **certificado com verificação pública**.

**Produção:** https://level-usp.vercel.app

## Stack

- **Frontend:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4
- **Backend:** Supabase (Postgres 17, Auth, Storage, RLS) + Route Handlers
- **Execução de Python no browser:** Pyodide (WebAssembly) em Web Worker
- **Correção oficial de exercícios:** Vercel Python Function (`api/evaluate.py`)
  — os testes ocultos nunca chegam ao cliente
- **Deploy:** Vercel (auto-deploy na `main`)

## Como rodar localmente

```bash
pnpm install
cp .env.local.example .env   # preencha com as chaves do seu projeto Supabase
pnpm dev
```

O schema completo do banco está em [`supabase/schema.sql`](./supabase/schema.sql);
as mudanças incrementais em [`supabase/migrations/`](./supabase/migrations/).

## Documentação

| Para quem | Onde |
|-----------|------|
| Desenvolvedores | [`docs/`](./docs/) — arquitetura, banco, avaliador, segurança, prova/certificação |
| Professores e criadores de conteúdo | [`GUIA-DO-PROFESSOR.md`](./GUIA-DO-PROFESSOR.md) |
| Roadmap até o lançamento | [`PLANO-DE-DESENVOLVIMENTO.md`](./PLANO-DE-DESENVOLVIMENTO.md) |
| Contexto para agentes de IA | [`CLAUDE.md`](./CLAUDE.md) |

## Validação

- `python3 scripts/verify_lessons.py` — corrige os gabaritos das lições contra
  soluções de referência (mesma semântica do avaliador de produção)
- CI no GitHub Actions: gabaritos + typecheck + build informativo
