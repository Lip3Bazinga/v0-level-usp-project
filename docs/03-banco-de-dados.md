# 03 — Banco de Dados

O LevelUSP usa **PostgreSQL 17** gerenciado pelo Supabase, com **Row-Level Security (RLS)** habilitado em todas as tabelas de domínio. Esta seção documenta o modelo de dados **conforme o banco em produção** (verificado via inspeção do schema ao vivo).

> ✅ **Sincronização (2026-07-14).** O arquivo versionado [`supabase/schema.sql`](../supabase/schema.sql) foi regenerado a partir do banco ao vivo e é a **fonte de verdade** do DDL: 19 tabelas (as 7 originais + `platform_settings`, `notifications`, `badges`, `user_badges`, `modules`, `library_catalog`, `library_requests`, `notes`, `exams`, `exam_questions`, `exam_attempts`, `certificates`), funções, triggers, policies, grants por coluna e policies de storage. O ERD abaixo cobre o núcleo original; para as tabelas de prova/certificação ver [09-prova-certificacao.md](./09-prova-certificacao.md).

## Modelo entidade-relacionamento (ERD)

```mermaid
erDiagram
    profiles ||--o{ lessons : "cria (created_by)"
    profiles ||--o{ courses : "cria (created_by)"
    profiles ||--o{ lesson_progress : "tem"
    profiles ||--o{ enrollments : "matricula-se"
    profiles ||--o{ teacher_approvals : "solicita (user_id)"
    profiles ||--o{ audit_log : "atua (actor_id)"
    courses  ||--o{ lessons : "agrupa (course_id)"
    courses  ||--o{ enrollments : "recebe"
    lessons  ||--o{ lesson_progress : "registra"

    profiles {
        uuid id PK "= auth.users.id"
        text email
        text full_name
        text username UK
        text avatar_url
        text bio
        text role "student|teacher|admin"
        int  level "régua: 1000 XP/nível"
        int  total_xp
        int  current_streak
        int  max_streak
        int  courses_completed
        int  lessons_completed
        date last_login_date "streak diário"
        timestamptz created_at
        timestamptz updated_at
    }

    lessons {
        uuid id PK
        text title
        text slug UK
        text module
        int  order
        text difficulty "iniciante|intermediario|avancado"
        text description
        text content_markdown
        text starter_code
        text hidden_tests "unittest ou assert"
        text_array libraries
        int  xp_reward
        int  time_limit "segundos"
        uuid course_id FK "nullable"
        uuid created_by FK
        bool published
        timestamptz created_at
        timestamptz updated_at
    }

    courses {
        uuid id PK
        text title
        text description
        text long_description
        text level
        text_array tags
        int  total_xp
        int  estimated_hours
        text cover_image_url
        text thumbnail_url
        text final_project_title
        text final_project_description
        text final_project_starter_code
        text final_project_tests
        bool published
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }

    lesson_progress {
        uuid id PK
        uuid user_id FK
        uuid lesson_id FK
        text status "not_started|in_progress|completed"
        text code_snapshot
        int  score
        int  xp_earned
        timestamptz completed_at
        timestamptz created_at
    }

    enrollments {
        uuid id PK
        uuid user_id FK
        uuid course_id FK
        timestamptz enrolled_at
    }

    teacher_approvals {
        uuid id PK
        uuid user_id FK
        text name
        text email
        text institution
        text motivation
        text status "pending|approved|rejected"
        uuid reviewed_by FK
        text review_note
        timestamptz submitted_at
        timestamptz reviewed_at
    }

    audit_log {
        uuid id PK
        uuid actor_id FK
        text actor_name
        text action
        text target
        jsonb meta
        text severity
        timestamptz created_at
    }
```

## Dicionário de dados (resumo por tabela)

### `profiles`
Estende `auth.users` (chave primária compartilhada). Criada automaticamente no cadastro pela trigger `handle_new_user`, que deriva `full_name` e um `username` único a partir dos metadados de OAuth ou do e-mail. Concentra o estado de gamificação (XP, nível, streak).

| Restrição/Regra | Detalhe |
|---|---|
| `id` | FK para `auth.users(id)` com `ON DELETE CASCADE` |
| `role` | `CHECK IN ('student','teacher','admin')`, padrão `student` |
| `level` | recalculado por `award_xp`: `GREATEST(1, FLOOR(total_xp/1000)+1)` |
| `username` | `UNIQUE` |

### `lessons`
Unidade central de aprendizado. `hidden_tests` guarda o código de validação (ver [avaliador](./05-avaliador-python.md)). `libraries` lista pacotes Python a instalar no Pyodide. `course_id` é opcional (lições podem existir soltas).

### `courses`
Agrupa lições e define metadados de trilha (nível, tags, horas estimadas, projeto final). Capa armazenada no bucket `course-covers`.

### `lesson_progress`
Progresso por par (usuário, lição) — `UNIQUE(user_id, lesson_id)`. Atualizado idempotentemente por `award_xp` via `ON CONFLICT`.

### `enrollments`
Matrícula de um usuário em um curso. Relação N:N entre `profiles` e `courses`.

### `teacher_approvals`
Fila de solicitações para virar professor; aprovada/rejeitada por um admin no painel.

### `audit_log`
Trilha de auditoria de ações administrativas (ator, ação, alvo, severidade, metadados em `jsonb`).

## Funções (RPC) e triggers

```mermaid
graph LR
    subgraph Triggers
        T1["on_auth_user_created<br/>AFTER INSERT auth.users"] --> F1["handle_new_user()<br/>cria profile + username único"]
        T2["set_profiles_updated_at"] --> F2["handle_updated_at()"]
        T3["set_lessons_updated_at"] --> F2
    end

    subgraph RPC["Funções chamadas pela app"]
        F3["award_xp(user, lesson, xp)<br/>marca lição concluída +<br/>credita XP + recalcula nível"]
        F4["reorder_lessons(...)<br/>reordena lições de um curso"]
    end
```

### `award_xp(p_user_id, p_lesson_id, p_xp)`
Coração da gamificação no banco. Em uma transação:
1. *Upsert* em `lesson_progress` marcando a lição como `completed` (idempotente).
2. Soma `p_xp` a `profiles.total_xp`, incrementa `lessons_completed` e recalcula `level` pela régua de 1000 XP/nível.

`SECURITY DEFINER` — executa com privilégios do dono, contornando RLS de escrita de forma controlada.

## Row-Level Security (RLS)

Todas as tabelas de domínio têm RLS habilitado. Padrões principais:

| Tabela | Leitura | Escrita |
|--------|---------|---------|
| `profiles` | pública (`USING true`) | própria linha; admin pode qualquer uma |
| `lessons` | publicadas para todos; professores/admin veem todas | professores/admin criam; autor ou admin editam |
| `lesson_progress` | própria linha; professores/admin veem todas | própria linha (insert/update) |
| `courses` / `enrollments` | publicadas / próprias | regras por papel |

> A combinação **middleware (rota) + RLS (linha)** forma a defesa em profundidade descrita em [06 — Segurança e RBAC](./06-seguranca-rbac.md).

## Storage

| Bucket | Acesso | Uso |
|--------|--------|-----|
| `course-covers` | público | Imagens de capa de curso (upload pelo editor de curso). Servido via `next/image` com `remotePatterns` para `*.supabase.co`. |
