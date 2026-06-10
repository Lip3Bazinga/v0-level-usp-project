# Documentação Técnica — LevelUSP

> Plataforma gratuita e gamificada de ensino de Python, iniciativa da Universidade de São Paulo (USP).

Esta pasta reúne a documentação técnica completa do projeto, escrita para desenvolvedores, mantenedores e novos integrantes da equipe. Os diagramas usam **[Mermaid](https://mermaid.js.org/)** (renderizado nativamente pelo GitHub, GitLab e pela extensão *Markdown Preview Mermaid Support* no VS Code) e, onde um diagrama UML mais formal agrega, **[PlantUML](https://plantuml.com/)** (fontes em [`diagrams/`](./diagrams/)).

## Índice

| # | Documento | Conteúdo |
|---|-----------|----------|
| 00 | **Este arquivo** | Índice e convenções da documentação |
| 01 | [Visão geral](./01-visao-geral.md) | Propósito, público-alvo, stack tecnológica, glossário |
| 02 | [Arquitetura](./02-arquitetura.md) | Visão C4 (contexto → contêineres → componentes), estrutura de pastas |
| 03 | [Banco de dados](./03-banco-de-dados.md) | Modelo entidade-relacionamento, dicionário de dados, RLS, funções |
| 04 | [Fluxos principais](./04-fluxos.md) | Diagramas de sequência e estado: autenticação, lição, XP, streak |
| 05 | [Avaliador Python (Pyodide)](./05-avaliador-python.md) | Execução no browser, validação de testes, limitações conhecidas |
| 06 | [Segurança e RBAC](./06-seguranca-rbac.md) | Middleware, controle de acesso por papel, RLS, gestão de segredos |
| 07 | [Setup e deploy](./07-setup-e-deploy.md) | Ambiente local, variáveis, build, deploy na Vercel |
| 08 | [Roadmap técnico](./08-roadmap-tecnico.md) | Dívidas técnicas conhecidas e evolução planejada |

## Como visualizar os diagramas

- **Mermaid:** abra os arquivos `.md` diretamente no GitHub/GitLab, ou no VS Code com a extensão *Markdown Preview Mermaid Support*. Nenhuma ferramenta externa é necessária.
- **PlantUML:** os arquivos `.puml` em [`diagrams/`](./diagrams/) podem ser renderizados com a extensão *PlantUML* do VS Code, pelo [servidor público](https://www.plantuml.com/plantuml/uml/) ou via CLI (`plantuml diagrams/*.puml`).

## Convenções

- **Idioma:** português (pt-BR), alinhado ao código e à interface.
- **Termos de domínio:** ver o [glossário](./01-visao-geral.md#glossário).
- **Status de maturidade** usado ao longo da doc:
  - ✅ **Estável** — implementado e validado.
  - 🟡 **Parcial** — funciona, com ressalvas/dívida técnica documentada.
  - 🔴 **Atenção** — problema conhecido que requer correção (ver [roadmap](./08-roadmap-tecnico.md)).

## Versão

| Item | Valor |
|------|-------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Runtime React | 19 |
| Backend / BaaS | Supabase (PostgreSQL 17 + Auth + Storage) |
| Execução de código | Pyodide (CPython compilado em WebAssembly) |
| Última revisão da doc | 2026-06-09 |
