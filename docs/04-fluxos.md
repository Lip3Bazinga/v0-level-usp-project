# 04 — Fluxos Principais

Diagramas de sequência e estado dos fluxos centrais. Para o detalhe interno da execução Python, ver [05 — Avaliador Python](./05-avaliador-python.md).

## 1. Autenticação (e-mail/senha e OAuth)

```mermaid
sequenceDiagram
    actor U as Usuário
    participant App as Next.js (cliente)
    participant Ctx as auth-context
    participant Auth as Supabase Auth
    participant CB as /auth/callback
    participant DB as PostgreSQL

    rect rgb(243, 232, 255)
    note over U,DB: Cadastro (signup)
    U->>App: preenche e-mail/senha
    App->>Auth: signUp()
    Auth->>DB: cria auth.users
    DB-->>DB: trigger handle_new_user()<br/>cria profiles + username único
    Auth-->>App: sessão (ou "confirme seu e-mail")
    end

    rect rgb(237, 233, 254)
    note over U,DB: Login social (OAuth)
    U->>App: clica "Entrar com Google/GitHub"
    App->>Auth: signInWithOAuth()
    Auth-->>U: redireciona ao provedor
    U-->>CB: retorna com ?code=...
    CB->>Auth: exchangeCodeForSession(code)
    Auth-->>CB: define cookies de sessão
    CB-->>App: redirect (?redirect= ou /dashboard)
    end

    App->>Ctx: onAuthStateChange dispara
    Ctx->>DB: fetchProfile(user.id) (com retry)
    DB-->>Ctx: perfil (role, XP, nível, streak)
    Ctx->>DB: checkAndUpdateDailyStreak()
    Ctx-->>App: estado pronto (useAuth)
```

**Pontos de implementação:**
- `contexts/auth-context.tsx` usa um cliente Supabase *singleton* e ouve `onAuthStateChange`, com *retry* em `fetchProfile` para tolerar latência da trigger/RLS recém-criada.
- `app/auth/callback/route.ts` troca o `code` por sessão e respeita o parâmetro `?redirect=`.
- O cadastro suporta confirmação de e-mail opcional (se ativada no Supabase).

## 2. Ciclo de vida de uma lição (estado da IDE)

```mermaid
stateDiagram-v2
    [*] --> Carregando: abre /lesson/[id]
    Carregando --> PythonIniciando: lição carregada do banco
    PythonIniciando --> InstalandoPacotes: worker pronto e<br/>lesson.libraries ≠ ∅
    PythonIniciando --> Pronto: sem pacotes
    InstalandoPacotes --> Pronto: pacotes instalados
    Pronto --> Executando: aluno clica "Executar"
    Executando --> Pronto: saída no console
    Pronto --> Verificando: aluno clica "Verificar"
    Verificando --> Aprovado: todos os testes passaram
    Verificando --> Reprovado: falhas/erros
    Reprovado --> Pronto: revisa e tenta de novo
    Aprovado --> CreditandoXP: awardXp()
    CreditandoXP --> Concluida: refreshProfile() + modais
    Concluida --> [*]: navega p/ próxima lição
```

## 3. Resolver lição → validar → ganhar XP (fim a fim)

```mermaid
sequenceDiagram
    actor A as Aluno
    participant Page as lesson/[id]/page.tsx
    participant Hook as use-python
    participant W as Web Worker (Pyodide)
    participant DB as Supabase

    A->>Page: escreve código e clica "Verificar"
    Page->>Hook: execute(code, { testCode: hidden_tests })
    Hook->>W: postMessage("execute")
    W->>W: roda código do aluno (namespace isolado)
    W->>W: roda testes ocultos (unittest/assert)
    W-->>Hook: test-result { allPassed, testsRun, failureDetails }
    Hook-->>Page: onTestResult(result)

    alt allPassed = true
        Page->>DB: awardXp(user, lesson, xp)  [RPC]
        DB-->>DB: upsert lesson_progress + soma XP + nível
        Page->>DB: refreshProfile()
        DB-->>Page: perfil atualizado
        Page->>A: SuccessFeedback (confete, +XP, partículas)
        opt subiu de nível
            Page->>A: LevelUpModal
        end
    else allPassed = false
        Page->>A: feedback de falha + dicas (parse-python-error)
    end
```

> **Nota de integridade.** O mecanismo de validação atual tem limitações conhecidas (falsos positivos no modo `assert`, possibilidade de burla por namespace compartilhado, dupla execução do código do aluno). Esses pontos estão detalhados e priorizados em [05 — Avaliador Python](./05-avaliador-python.md#limitações-conhecidas) e no [roadmap](./08-roadmap-tecnico.md).

## 4. Ofensiva diária (streak)

```mermaid
flowchart TD
    Start["Login bem-sucedido"] --> Check{"last_login_date<br/>== hoje?"}
    Check -- "Sim" --> NoOp["Mantém streak<br/>(sem alteração)"]
    Check -- "Não" --> Yesterday{"last_login_date<br/>== ontem?"}
    Yesterday -- "Sim" --> Inc["current_streak += 1"]
    Yesterday -- "Não" --> Reset["current_streak = 1<br/>(quebrou a ofensiva)"]
    Inc --> Save["Atualiza profile:<br/>current_streak, last_login_date,<br/>max_streak = max(antigo, novo)"]
    Reset --> Save
    Save --> Anim["Dispara StreakAnimation"]
    NoOp --> End["Segue para o app"]
    Anim --> End
```

Implementado em `checkAndUpdateDailyStreak` ([`lib/supabase/lessons.ts`](../lib/supabase/lessons.ts)), chamado no login.

## 5. Desbloqueio sequencial de lições

A trilha do aluno libera lições em sequência: uma lição só abre após a anterior estar **concluída**.

```mermaid
flowchart LR
    L1["Lição 1<br/>✅ concluída"] --> L2["Lição 2<br/>🔓 em progresso"]
    L2 --> L3["Lição 3<br/>🔒 bloqueada"]
    L3 --> L4["Lição 4<br/>🔒 bloqueada"]
```

Lógica pura em `computeModuleStatuses` ([`lib/supabase/lessons.ts`](../lib/supabase/lessons.ts)): percorre as lições ordenadas e marca `completed` / `in-progress` / `locked` conforme o progresso. Por ser função pura, é trivialmente testável.

## 6. Criação de conteúdo pelo professor

```mermaid
sequenceDiagram
    actor P as Professor
    participant TPage as teacher/edit/[id] · teacher/curso/[id]
    participant Lib as lib/supabase (lessons/courses)
    participant DB as Supabase
    participant ST as Storage (course-covers)

    P->>TPage: preenche curso/lição<br/>(enunciado, starter, testes, libs)
    opt capa de curso
        TPage->>ST: uploadCourseCover()
        ST-->>TPage: URL pública
    end
    TPage->>Lib: createLesson() / createCourse()
    Lib->>DB: INSERT (RLS: teacher/admin)
    DB-->>Lib: registro criado
    Lib-->>TPage: ok
    TPage->>P: TeacherSuccessModal
    opt reordenar lições
        TPage->>DB: reorder_lessons() [RPC] (drag & drop dnd-kit)
    end
```
