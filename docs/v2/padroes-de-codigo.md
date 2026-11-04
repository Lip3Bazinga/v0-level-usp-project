# Padrões de código do LevelUSP

Guia único seguido na auditoria de clean code (branch `refactor/auditoria-clean-code`).
Vale para `apps/*` e `packages/*`. Em caso de dúvida, prefira o que um colega humano
entenderia de primeira ao ler o arquivo sem contexto.

## 1. Idioma

- Identificadores (variáveis, funções, tipos, arquivos) em **inglês**, como já é o código.
- Comentários, JSDoc, mensagens de erro, textos de UI e commits em **pt-BR**.
- Comentários explicam o **porquê** (regra de negócio, decisão de segurança, armadilha).
  Não narre o que a linha já diz ("// incrementa o contador"), não deixe comentário de
  histórico ("antes era X", "agora usamos Y", "refatorado"), não use emojis nem
  marcadores decorativos (`// ===== SEÇÃO =====`, `// ✅`).

## 2. Nomes

| Elemento | Convenção | Exemplo |
|---|---|---|
| Variáveis, funções, métodos | `camelCase`, verbo para ação | `loadCourse`, `isCompleted` |
| Booleanos | prefixo `is`/`has`/`can`/`should` | `hasHiddenTests`, `canVerify` |
| Tipos, interfaces, classes, componentes | `PascalCase`, substantivo | `LessonSummary`, `CourseCard` |
| Constantes de módulo imutáveis | `UPPER_SNAKE_CASE` | `MAX_ATTEMPTS_PER_MINUTE` |
| Arquivos | `kebab-case` (+ sufixo de papel no Nest) | `lesson-card.tsx`, `exams.service.ts` |
| Handlers de evento React | `handle<Evento>` no componente, `on<Evento>` na prop | `handleSubmit` / `onSubmit` |
| Hooks | `use<Coisa>` | `useCourseProgress` |

- Proibido nome de uma letra ou abreviação opaca fora de índices triviais (`i`, `j`) e de
  callbacks de uma linha muito óbvios. Troque `p`, `res`, `d`, `tmp`, `data2`, `x`, `xs`,
  `cb`, `e` (exceto `catch (error)`), `fn` por nomes do domínio: `profile`, `response`,
  `lessonRow`, `submission`.
- Unidades no nome quando não há tipo que as carregue: `timeoutMs`, `windowSeconds`, `sizeBytes`.
- Um conceito, um nome em todo o monorepo (não alternar `user`/`profile`/`account` para a
  mesma coisa, nem `fetch`/`get`/`load` para o mesmo tipo de operação). Na web:
  `fetchX` = chamada HTTP na camada `lib/api`; `loadX` = efeito que busca e guarda em estado.

### 2.1 Verbos de métodos na API (repositories e services)

| Verbo | Devolve | Exemplos |
|---|---|---|
| `list…` | lista (pode ser vazia) | `list()`, `listByOwner(id)`, `listMyEnrollments(user)` |
| `find…` | um item ou `undefined`/`null`; quem chama decide | `findById`, `findByCode`, `findMyCertificate` |
| `get…` | um item que precisa existir (o service lança `AppError` 404) ou um agregado calculado | `get(user, id)`, `getMetrics()`, `getStatus(user, courseId)` |
| `count…`, `is…`/`has…` | número, booleano | `countAdmins()`, `isUsernameTaken(name)` |
| `create`, `update`, `delete` | escrita | `create(values)`, `update(id, patch)`, `delete(id)` |
| `upsert…`, `replace…`, `set<Campo>` | insere-ou-atualiza, troca a coleção, muda um campo | `upsertSettings`, `replaceQuestions`, `setPublished` |

- Não use `insert`, `remove`, `save`, `listAll` nem método só com substantivo (`metrics()`, `snapshot()`).
- A entidade principal do módulo fica implícita (`CoursesRepository.create`, `NotesService.delete`);
  entidades secundárias vão no nome (`ExamsRepository.createAttempt`, `QuizzesRepository.listQuestions`).
  Classes sem entidade principal (`admin`, `account`, `auth`, `gamification`) sempre nomeiam a entidade.
- Recursos do usuário logado (`/me/...`): `My` logo depois do verbo, com a entidade (`listMyProgress`,
  `getMyDataExport`, `deleteMyAccount`, `updateMyProfile`), o mesmo nome da função da web.
- Operações que não são CRUD usam o verbo do domínio: `enroll`, `submit`, `approve`, `issue`, `verify`,
  `grade`, `lock…` (`SELECT … FOR UPDATE`), `revoke…`, `markRead`, `grantBadges`.
- O handler do controller tem o nome do método do service que ele chama.

### 2.2 Funções HTTP da web (`lib/api`)

- `fetchX` = GET; `fetchMyX` para `/me/...`; `fetchAdminX` quando existe a versão pública e a de
  administração (que traz tudo, inclusive inativos e rascunhos).
- Mutações: `createX`, `updateX`, `deleteX`, `setX<Campo>` ou o verbo do domínio (`submitX`, `enrollInCourse`,
  `markNotificationRead`). Sem `save…` nem `fetchAll…`.

## 3. Tipos

- **Zero `any`** (explícito ou implícito). Use `unknown` + estreitamento (type guards,
  `schema.parse`) na fronteira e tipos precisos dentro. `no-explicit-any` é **erro** no lint.
- Sem `as` para "calar" o compilador. Asserções só quando o tipo é provado por outro meio
  (ex.: após `schema.parse`) e com comentário curto do porquê. Nunca `as unknown as T`.
- Sem `!` (non-null assertion) quando um guard resolve.
- Tipos de domínio e DTOs moram em `@levelusp/contracts` (fonte única). Não redeclare
  na web ou na API um tipo que já existe lá — importe ou derive (`Pick`, `Omit`, `z.infer`).
- Genéricos quando o mesmo algoritmo serve a vários tipos (repositórios, listas paginadas,
  `useAsyncResource<T>`, `Result<T, E>`, mapeadores). Restrinja com `extends` em vez de aceitar tudo.
- Prefira `interface` para formas de objeto públicas e `type` para uniões/derivações.
  Uniões discriminadas para estados (`{ status: "loading" } | { status: "ready"; data: T } | ...`)
  em vez de vários booleanos soltos.
- `readonly` em props e parâmetros que não devem ser mutados quando ajuda a leitura.

## 4. Funções e módulos

- Uma função faz uma coisa; se precisa de "e" para descrever, divida. Alvo: até ~30 linhas,
  no máximo 3 parâmetros posicionais — acima disso, objeto de opções tipado.
- Retorno antecipado (guard clauses) em vez de `if` aninhado.
- Sem números e strings mágicos: constantes nomeadas no módulo ou centralizadas (ver §5).
- Funções puras (regras) separadas de efeitos (HTTP, banco, DOM). Na API: `*.domain.ts`;
  na web: `lib/utils/*` ou hooks.
- Sem código morto, comentado, `console.log` de depuração, imports ou variáveis não usados.

## 5. Centralização e reutilização

- **API**: utilidades transversais em `apps/api/src/common/`; nada de helper duplicado entre módulos.
- **Web**: `src/lib/api` (cliente HTTP e chamadas), `src/lib/utils` (puras, exportadas pelo
  `index.ts`), `src/lib/constants` (rotas, chaves de storage, tempos em `timing.ts`, limites, rótulos),
  `src/hooks` (hooks reutilizáveis), `src/components/design-system` (peças visuais da marca),
  `src/components/ui` (primitivas shadcn — não editar além do necessário).
- Importe pelos barrels (`@/lib/utils`, `@/lib/constants`, `@/lib/api`), não pelo arquivo interno.
- Rotas da web em uma constante única (`ROUTES`), nada de string `"/dashboard"` espalhada.
- Formatação (datas, números, XP, porcentagem) em funções únicas de `lib/utils/format`.
- Se o mesmo trecho aparece 2+ vezes, extraia. Se aparece 1 vez, não abstraia "por precaução".

## 6. SOLID na prática

- **S**: controller só traduz HTTP ↔ service; service orquestra regras; repository só fala com o
  banco; mapper só converte linha → DTO. Componente React de página compõe; lógica vai para hooks.
- **O/L**: estratégias por tipo via mapa/registro tipado (`Record<CaseKind, Comparator>`) em vez de
  `switch` crescendo em vários lugares.
- **I**: interfaces pequenas por consumidor (ex.: `CodeRunner` com `run()` apenas).
- **D**: dependências injetadas (Nest DI; na web, funções de `lib/api` recebidas por hooks),
  nunca instanciadas no meio da regra.

### 6.1 Rotas nos controllers

- `@Controller("<prefixo>")` recebe o maior prefixo (por segmento) comum a todas as rotas do controller;
  cada método declara só o restante (`@Controller("courses/:id/exam")` + `@Post("attempts")`).
- `@Controller()` vazio só quando as rotas não têm prefixo comum (ex.: `CoursesController` atende
  `/courses`, `/teacher/courses` e `/me/enrollments`). O caminho final é o de `docs/v2/api-rotas.md`.

## 7. React

- Componentes funcionais com props tipadas por `interface <Nome>Props`.
- Props booleanas também seguem `is`/`has` (`isOpen` nos modais, `hasLabel`). Modais ficam em
  `*-modal.tsx`; telas do painel do admin em `components/admin/<x>-page.tsx`, exportando `<X>Page`.
- Classes com condição ou composição usam `cn()` (resolve conflitos do Tailwind); template literal
  só para string sem interpolação. Cores da marca pelos tokens (`level-purple`, …), não por hex.
- Confirmação: `swalConfirm` (nunca `window.confirm`). Avisos: `swalToast` e o toast do admin usam o
  mesmo `ToastKind` (`success` | `error` | `warning` | `info`).
- Estado derivado é calculado, não guardado em `useState` + `useEffect`.
- Efeitos com dependências corretas (sem desligar `exhaustive-deps`); busca de dados via hook
  comum com cancelamento.
- Textos de UI em pt-BR; acessibilidade: `label` em campos, `aria-*` em botões só-ícone.

## 8. Testes

- Todo comportamento alterado continua coberto; refatoração não muda comportamento observável.
- Nome de teste descreve o comportamento em pt-BR (`"reprova quando a saída difere"`).
