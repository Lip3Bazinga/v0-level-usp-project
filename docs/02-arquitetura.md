# 02 — Arquitetura

Esta seção descreve a arquitetura do LevelUSP do mais alto nível (contexto) ao mais detalhado (componentes e pastas), seguindo a inspiração do **modelo C4**.

## Nível 1 — Contexto do sistema

```mermaid
graph TB
    Aluno["👤 Aluno<br/>(student)"]
    Prof["👨‍🏫 Professor<br/>(teacher)"]
    Admin["🛠️ Administrador<br/>(admin)"]

    Sistema["📦 LevelUSP<br/>Plataforma gamificada<br/>de ensino de Python"]

    Supabase["🗄️ Supabase<br/>PostgreSQL · Auth · Storage"]
    OAuth["🔐 Google / GitHub<br/>Provedores OAuth"]
    Pyodide["🐍 CDN jsDelivr<br/>Runtime Pyodide (WASM)"]

    Aluno -->|"resolve lições, ganha XP"| Sistema
    Prof -->|"cria cursos e lições"| Sistema
    Admin -->|"gere usuários e conteúdo"| Sistema

    Sistema -->|"persiste dados / autentica"| Supabase
    Sistema -->|"baixa runtime Python"| Pyodide
    Supabase -->|"login social"| OAuth
```

## Nível 2 — Contêineres

```mermaid
graph TB
    subgraph Browser["🖥️ Navegador do usuário"]
        App["Next.js App (React 19)<br/>Server + Client Components"]
        Worker["Web Worker<br/>pyodide-worker-v2.js"]
        App <-->|"postMessage"| Worker
    end

    subgraph Vercel["☁️ Vercel"]
        Edge["Middleware (Edge)<br/>sessão + RBAC de rota"]
        SSR["Server Components / Route Handlers<br/>ex.: /auth/callback"]
    end

    subgraph SupabaseC["🗄️ Supabase"]
        Auth["Auth (GoTrue)"]
        DB["PostgreSQL 17 + RLS"]
        RPC["Funções RPC<br/>award_xp, reorder_lessons"]
        Storage["Storage<br/>bucket course-covers"]
    end

    CDN["🌐 jsDelivr<br/>pyodide.js + .wasm + .data"]

    App -->|"@supabase/ssr"| Auth
    App -->|"queries SELECT/INSERT/UPDATE"| DB
    App -->|"rpc()"| RPC
    App -->|"upload de capas"| Storage
    App -.->|"navegação"| Edge
    Edge --> Auth
    Edge --> DB
    SSR --> Auth
    Worker -->|"importScripts"| CDN
```

**Observação importante sobre o caminho quente:** a execução de código Python ocorre **inteiramente no Web Worker do navegador**. O servidor (Vercel) e o banco (Supabase) **não participam** da execução nem da avaliação — só servem o app, a sessão e os dados. O maior custo de rede é o **download único do runtime Pyodide** (~10–30 MB) a partir da CDN.

## Nível 3 — Componentes do cliente

```mermaid
graph TB
    subgraph Pages["Páginas (app/)"]
        LessonPage["app/lesson/[id]/page.tsx<br/>IDE de uma lição"]
        Dashboard["app/dashboard/page.tsx"]
        Admin["app/admin/*"]
        Teacher["app/teacher/*"]
    end

    subgraph IDE["Componentes da IDE (components/ide/)"]
        Editor["code-editor.tsx<br/>(CodeMirror)"]
        Console["console-panel.tsx"]
        LessonPanel["lesson-panel.tsx<br/>(enunciado + checkpoints)"]
        Footer["lesson-footer.tsx"]
        HeaderC["header.tsx<br/>(XP, nível, streak)"]
        Success["success-feedback.tsx"]
    end

    subgraph Hooks["Hooks"]
        usePython["use-python.ts<br/>orquestra o Web Worker"]
    end

    subgraph Data["Camada de dados (lib/supabase/)"]
        Lessons["lessons.ts"]
        Courses["courses.ts"]
        AdminLib["admin.ts"]
        Client["client.ts / server.ts"]
    end

    subgraph Auth["Estado de auth"]
        AuthCtx["contexts/auth-context.tsx<br/>useAuth()"]
    end

    LessonPage --> Editor
    LessonPage --> Console
    LessonPage --> LessonPanel
    LessonPage --> Footer
    LessonPage --> HeaderC
    LessonPage --> Success
    LessonPage --> usePython
    LessonPage --> Lessons
    LessonPage --> AuthCtx

    Dashboard --> Lessons
    Admin --> AdminLib
    Teacher --> Courses
    Teacher --> Lessons

    Lessons --> Client
    Courses --> Client
    AdminLib --> Client
    AuthCtx --> Client
```

## Estrutura de pastas

```
v0-level-usp-project/
├── app/                      # App Router (rotas)
│   ├── page.tsx              # Landing page (/)
│   ├── login/ · signup/      # Autenticação
│   ├── auth/callback/        # Route handler do OAuth (exchangeCodeForSession)
│   ├── dashboard/            # Painel do aluno (trilha de lições)
│   ├── lesson/[id]/          # IDE de uma lição (núcleo do produto)
│   ├── ide/                  # IDE com lição de fallback
│   ├── cursos/ · cursos/[id] # Catálogo e detalhe de curso
│   ├── leaderboard/          # Ranking global
│   ├── perfil/[username]/    # Perfil público (heatmap, badges, stats)
│   ├── settings/             # Configurações do usuário
│   ├── admin/                # Painel administrativo (RBAC: admin)
│   ├── teacher/              # Painel do professor (RBAC: teacher/admin)
│   ├── error.tsx · not-found.tsx
│   └── layout.tsx            # Layout raiz + metadados + Providers
├── components/
│   ├── ide/                  # Editor, console, painel de lição, header
│   ├── gamification/         # Modais de XP, nível, streak, badge, etc.
│   ├── design-system/        # Botões, badges de XP, progress (tema da marca)
│   ├── profile/              # Heatmap de atividade, badges, stat cards
│   └── ui/                   # shadcn/ui (Radix) — primitivos
├── contexts/
│   └── auth-context.tsx      # Provider de sessão + perfil (useAuth)
├── hooks/
│   └── use-python.ts         # Orquestra o Web Worker do Pyodide
├── lib/
│   ├── supabase/             # client, server, middleware, lessons, courses, admin
│   ├── parse-python-error.ts # Traduz erros de Python para pt-BR
│   └── utils.ts
├── public/
│   ├── pyodide-worker-v2.js  # Web Worker ATIVO (execução + testes)
│   └── pyodide-worker.js     # Versão legada (não usada)
├── supabase/
│   ├── schema.sql            # DDL versionado (ver nota em 03)
│   ├── seed-lessons.sql      # Lições de exemplo
│   └── migrations/           # Migrações incrementais
├── middleware.ts             # Sessão + RBAC de rota (Edge)
└── next.config.mjs           # Headers de segurança, imagens, cache
```

## Decisões arquiteturais e seus *trade-offs*

| Decisão | Benefício | Custo / Risco |
|---------|-----------|---------------|
| Execução Python **no cliente** (Pyodide) | Sem servidor de execução; escala trivial; custo de infra baixo | Validação não é à prova de adversário; download pesado do runtime |
| **Supabase** como BaaS | Auth + DB + Storage integrados; RLS forte | Acoplamento ao fornecedor; lógica de negócio dividida entre app e SQL |
| **Web Worker** dedicado | UI não congela durante execução | Comunicação assíncrona por mensagens; sem isolamento entre aluno e gabarito (ver 05) |
| **Middleware + RLS** (dupla proteção) | Defesa em profundidade | Lógica de papel duplicada (servidor e banco) |
| Componentes de gamificação **desacoplados** | Reúso e testabilidade visual | Vários modais ainda não conectados a gatilhos (ver roadmap) |

> Para o modelo de dados detalhado, ver [03 — Banco de dados](./03-banco-de-dados.md). Para os fluxos de execução, ver [04 — Fluxos](./04-fluxos.md) e [05 — Avaliador Python](./05-avaliador-python.md).
