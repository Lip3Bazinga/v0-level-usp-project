# Decisões do curso e do produto — 2026-11-04

Cada decisão abaixo traz a resposta inicial, a tentativa de refutá-la (com as fontes que
consegui consultar: Codecademy *Learn Python 3* e *Data Scientist: ML*, MAC0110 da USP,
CS50P de Harvard, documentação do Pyodide/Wasmtime) e as opções que sobraram, com a
recomendação. As decisões marcadas **[escolha]** precisam da escolha do Filipe; as
demais seguem a recomendação, salvo contraordem.

## D1 — Níveis certificáveis **[escolha]**

**Resposta inicial.** 7 níveis, cada um é um *curso* certificável; a trilha
"Python do zero à IA" encadeia os 7 e dá um certificado de trilha ao final.

| Nível | Curso | Horas | O que entrega |
|---|---|---|---|
| 1 | Fundamentos de programação e de computação | ~50 | como o computador funciona, binário, Python básico (tipos, strings, condicionais, laços, listas, dicionários, funções), depuração, testes com `assert`, 2 projetos |
| 2 | Python intermediário e engenharia de software | ~45 | POO, módulos, exceções, arquivos, iteradores/geradores, decoradores, tipagem, `unittest`/`pytest`, git, estilo, 2 projetos |
| 3 | Estruturas de dados e algoritmos | ~60 | complexidade, recursão, busca/ordenação, pilhas/filas/listas ligadas, árvores, hash, grafos (BFS/DFS/Dijkstra), programação dinâmica, matemática discreta essencial |
| 4 | Análise de dados | ~50 | numpy, pandas, limpeza, agregação, matplotlib, probabilidade, estatística descritiva e inferencial, testes de hipótese, regressão linear, projeto com dados reais |
| 5 | Machine Learning | ~60 | álgebra linear e cálculo para ML, gradiente descendente do zero, regressão/classificação, scikit-learn, validação cruzada, métricas, árvores/ensembles, clustering/PCA, viés-variância, projeto |
| 6 | Deep Learning: a IA por dentro | ~60 | perceptron, autograd do zero (estilo micrograd), backprop, MLP, otimizadores, CNN, embeddings/RNN, atenção e transformer, tokenização, treinar um mini modelo de linguagem, limitações |
| 7 | Engenharia de IA | ~40 | APIs de LLM, prompting, embeddings e busca vetorial, RAG, agentes com ferramentas, avaliação, segurança (prompt injection), MLOps básico (servir modelo com FastAPI), ética/LGPD, projeto final |

Total ≈ 365 h (≈ 6 disciplinas semestrais de 60 h).

**Tentativas de refutação.**
- *"Sete certificados desvalorizam o certificado."* O mercado faz exatamente isso: a Codecademy
  emite certificado por curso (10–30 h) e outro pelo *path*; o Coursera emite por curso dentro de
  especializações. O que desvaloriza é certificado sem avaliação — resolvido em D4, não em D1.
- *"Níveis de 50–60 h voltam a adiar o retorno."* O primeiro certificado sai em ~50 h (≈ 5
  semanas a 10 h/semana), o mesmo tamanho do MAC0110 (60 h). Abaixo disso o certificado vira
  "participação".
- *"Fundamentos de computação inflam o Nível 1."* Entram como os 2 primeiros módulos do Nível 1
  (curtos, conceituais com quiz); estruturas de dados e algoritmos ficam inteiros no Nível 3,
  como o MAC0121.
- *"Onde entra 'como a IA funciona por debaixo dos panos'?"* Nível 6 inteiro é construído do
  zero em numpy (autograd, backprop, atenção, mini-GPT), porque é assim que o CS231n e o
  micrograd ensinam o mecanismo; usar `torch` sem entender fica para o Nível 7 e para passos
  opcionais em Colab.

**Opções.**
- **A (recomendada)** 7 níveis com certificado cada + certificado da trilha ao concluir os 7.
- **B** 4 macroníveis (Fundamentos / Programador / Cientista de dados / Engenheiro de IA),
  ~90 h cada: menos certificados, retorno mais lento.
- **C** 7 níveis sem certificado de trilha (só os 7).

## D2 — Motor de verificação para lições de dados/ML **[escolha]**

**Resposta inicial.** Um segundo motor no `runner`: **Pyodide rodando no Node** (worker
dedicado) com numpy/pandas/scikit-learn/matplotlib/scipy pré-carregados. CPython WASI no
Wasmtime continua sendo o motor das lições de Python puro. A lição declara `runtime:
"python" | "python-dados"`.

**Tentativas de refutação.**
- *"Pyodide no Node não é sandbox."* Verdade: o módulo `js` dá acesso ao `globalThis` do Node.
  Mitigação em camadas: worker_thread com `resourceLimits` e `terminate()` no timeout;
  `sys.modules["js"] = sys.modules["pyodide_js"] = None` antes do código do aluno; o
  contêiner do runner já está em rede `internal: true` (sem internet), sem segredos e sem
  banco; `fetch`/`WebSocket`/`process` removidos do global do worker. Fica mais fraco que
  Wasmtime, mas o pior caso é derrubar o worker (reiniciado) — e as suítes de ataque do
  runner passam a cobrir esse motor.
- *"Memória."* numpy+pandas+sklearn carregados ≈ 300–400 MB por worker → pool de 2 workers
  aquecidos no notebook (VM: CPUs). Carga fria de ~5 s acontece só no boot.
- *"Não tem PyTorch."* Correto; o Pyodide não tem `torch`. Por isso o Nível 6 é do zero em
  numpy (pedagogicamente melhor para "por dentro"), e passos com `torch` são opcionais em
  Colab, não verificados.
- *"E a paridade?"* É o ponto mais forte: o **mesmo Pyodide 3.14** roda no navegador do
  aluno e no servidor → a saída é idêntica. CPython real + numpy de versão diferente daria
  divergências de formatação numérica entre o "Executar" e o "Verificar".

**Opções.**
- **A (recomendada)** Pyodide no runner agora, atrás de uma interface `Engine` (o WASI é o
  outro `Engine`).
- **B** CPython real + numpy/pandas/sklearn/torch num contêiner `runner-dados` (fork-server,
  gVisor na VM): fidelidade total e `torch`, mas imagem de 2–3 GB, nova sandbox a auditar,
  não roda bem no notebook Windows (sem gVisor) e paridade pior com o navegador.
- **C** Verificar lições de dados só no navegador: **rejeitada** — viola a invariante 1 e
  permite XP forjado.
- **D** A agora e B depois, só na VM, quando `torch` for exigido (a interface `Engine` deixa
  isso pronto).

## D3 — Modelo de dados (migração 0004, aditiva)

**Resposta inicial.** Uma migração que só adiciona:
- `tracks` (trilhas) = sequência ordenada de cursos (`track_courses`), com
  `certificate_title`; os "módulos globais" atuais (ícone/cor, sem curso) viram trilhas;
- `modules.course_id` (módulo passa a pertencer a um curso) + `modules.order`;
- `courses.prerequisite_course_id` (Nível N exige certificado do N−1, configurável);
- `lesson_steps` (passos de uma lição, estilo Codecademy): `kind` leitura/exercício/quiz,
  narrativa, código inicial, *checkpoints* (instrução + dica + ids de casos de teste),
  `solution_code`, XP por passo; `lesson_progress.completed_steps`;
- `lesson_hints` (dicas progressivas) e política de solução (D5);
- `course_completions` e `submissions.status = "error"` (falha de infra não conta);
- `experiment_conditions` por participante + `events` append-only (pedido da auditoria).

**Tentativas de refutação.** *"É mudança demais; as 22 lições atuais quebram."* A migração é
aditiva; cada lição atual vira 1 passo automaticamente. *"Codificar passos no markdown com
separadores evita migração."* Evita, mas não dá progresso por passo nem verificação por passo
— é o formato que a análise de requisitos já apontou como o que falta frente à Codecademy.
**Mantida.**

## D4 — Regras do certificado de nível **[escolha]**

**Resposta inicial.** Certificado do nível exige: 100 % das lições do curso concluídas +
prova (banco de questões já existente; nota ≥ 70 %) + projeto do nível aprovado pela
correção automática. Certificado de trilha = os 7 certificados. Página pública de
verificação por código (já existe o `verification_code`).

**Tentativas de refutação.** *"Codecademy só exige passar nas provas."* Verdade para o
*path*, mas lá o conteúdo é o próprio produto pago; aqui o certificado "nível USP" precisa
de evidência de prática, e a prova de múltipla escolha sozinha é forjável por decoreba. *"100 %
das lições é rígido demais."* Aceitável porque o aluno pode ver a solução após N tentativas
(D5) e nunca fica travado; alternativa é 90 %.

**Opções.**
- **A (recomendada)** lições 100 % + prova ≥ 70 % + projeto aprovado.
- **B** prova ≥ 70 % + projeto (lições livres).
- **C** lições ≥ 90 % + prova ≥ 70 % (sem projeto obrigatório).

## D5 — Dicas e solução

**Resposta inicial.** Dicas progressivas por passo (até 3, reveladas uma a uma); a solução
pode ser vista após 3 verificações com falha; ver a solução conclui o passo com 50 % do XP.
**Refutação:** *"USP não mostra solução."* Numa prova não; num curso autoinstrucional o aluno
sem solução abandona (o motivo nº 1 de evasão em MOOCs). O desconto de XP preserva o
incentivo e a prova/projeto garantem a competência. **Mantida.**

## D6 — Produção do conteúdo

**Resposta inicial.** Cada lição é um arquivo `.lvl.md` (frontmatter + passos separados por
`---`), em `content/cursos/<nível>/<módulo>/<lição>.lvl.md`; `pnpm content:build` compila
para o seed JSON e `pnpm content:verify` executa a solução de referência e as soluções
erradas de cada passo (a referência tem que passar e cada errada tem que falhar) com o
mesmo motor do runner. O admin importa o pacote. **Refutação:** *"Autorar só na UI do
admin."* A UI continua existindo para edição pontual, mas 300 h de conteúdo revisável por
agentes e por git precisam de texto versionado. **Mantida.**

## D7 — Escopo deste ciclo **[escolha]**

Produzir e verificar as ~365 h de conteúdo numa sessão só não é realista com qualidade
"nível USP". **Opções:**
- **A (recomendada)** Agora: estrutura completa dos 7 níveis (módulos, lições, objetivos,
  projetos e provas descritos) + **Nível 1 completo e verificado** + produto corrigido
  (D2–D6 e a lista da auditoria). Próximas sessões: um nível por sessão com o mesmo
  pipeline.
- **B** Agora: estrutura dos 7 + Níveis 1 e 2 completos (menos revisão por lição).
- **C** Agora: só estrutura + produto; conteúdo depois.

## D8 — Gamificação (segue a auditoria)

Curva de XP crescente por nível de jogador (1000, 2500, 4500, 7000…), streak por conclusão
(não por login), badge "Formado(a)" só com certificado, badges por módulo concluído. Notebook
/células só depois do modelo de passos.
