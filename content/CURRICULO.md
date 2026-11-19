# Currículo da trilha "Python: do zero à IA"

Visão geral da trilha de ensino do LevelUSP — plataforma gamificada de ensino de Python
desenvolvida como TCC de Filipe Pio Magalhães (orientador: Prof. Evandro Ruiz, DCM/FFCLRP-USP).
A trilha encadeia **7 níveis certificáveis** (D1 das decisões de 2026-11-04) que levam a pessoa
do primeiro `print` até construir um modelo de linguagem em numpy e um assistente com RAG servido
por API. Cada nível é um curso com módulos, lições guiadas em passos, uma prova e um projeto
obrigatório; concluir os 7 dá o certificado da trilha.

Os arquivos de conteúdo vivem em `content/` (formato em `docs/v2/curso-e-passos.md` §6):
`content/trilhas/python-do-zero-a-ia.yaml` → `content/cursos/<nível>/curso.yaml` + `prova.yaml`
→ `<NN>-<módulo>/modulo.yaml` → `<NN>-<lição>.lvl.md`. O Nível 1 está publicado e **completo**
(estado em 2026-11-14): as 47 lições escritas a partir do plano de autoria
(`content/cursos/n1-fundamentos/PLANO.md`), com 281 passos — 133 exercícios e 65 previsões e blocos de
visualização verificados no executor real (`pnpm content:verify --curso n1-fundamentos`). O Nível 2
está publicado e completo (estado em 2026-11-15): 35 lições (2 projetos de nível) com 263 passos — 113
exercícios e 34 previsões e blocos de visualização verificados — e prova com 40 questões
(`content/cursos/n2-python-intermediario/PLANO.md`). Os Níveis 3 a 7 também estão
escritos, verificados no executor real (`content:verify` do curso inteiro) e publicados (estado em
2026-11-19): a trilha tem os 7 níveis publicados, 253 lições e 1878 passos, com prova de 40 questões por nível.

## Tabela de níveis

| Nível | Curso (slug) | Horas (D1) | Soma das lições | Módulos | Lições | Projeto(s) de nível | Prova | Certificado |
|---|---|---|---|---|---|---|---|---|
| 1 | Fundamentos de programação e de computação (`n1-fundamentos`) | 50 h | 38,6 h | 9 | 47 | gerenciador de tarefas em modo texto | 40 questões no banco | Certificado do Nível 1 |
| 2 | Python intermediário e engenharia de software (`n2-python-intermediario`) | 40 h | 30,9 h | 7 | 35 | biblioteca com empréstimos; analisador de logs | 40 questões no banco | Certificado do Nível 2 |
| 3 | Estruturas de dados e algoritmos (`n3-estruturas-de-dados-e-algoritmos`) | 44 h | 33,7 h | 8 | 39 | planejador de rotas do campus | 40 questões no banco | Certificado do Nível 3 |
| 4 | Análise de dados (`n4-analise-de-dados`) | 35 h | 26,8 h | 7 | 31 | análise de dados reais (amostra do ENEM 2023, INEP) | 40 questões no banco | Certificado do Nível 4 |
| 5 | Machine Learning (`n5-machine-learning`) | 41 h | 31,8 h | 8 | 36 | previsão de inadimplência | 40 questões no banco | Certificado do Nível 5 |
| 6 | Deep Learning: a IA por dentro (`n6-deep-learning`) | 44 h | 33,6 h | 8 | 36 | seu próprio modelo de linguagem | 40 questões no banco | Certificado do Nível 6 |
| 7 | Engenharia de IA (`n7-engenharia-de-ia`) | 33 h | 25,1 h | 7 | 29 | assistente de atendimento da secretaria | 40 questões no banco | Certificado do Nível 7 |
| **Total** | 7 cursos | **287 h** | 220,5 h | 54 | 253 | 8 | 224 | + certificado da trilha |

A coluna **Horas (D1)** é a carga de dedicação estimada do nível (o `horas` do `curso.yaml`, exibido no catálogo); a coluna **Soma das lições** é a soma de `tempo_min` dos arquivos `.lvl.md` — o tempo guiado mínimo (lições de 20–60 min, mini-projetos de módulo de 90 min e projetos de nível de 3–4 h). Regra (decisão de 2026-11-16): **horas = soma das lições + 30 %, arredondada para a hora inteira mais próxima**; os 30 % cobrem a prática além do mínimo, o projeto, a prova e as tentativas reprovadas. Ao mudar o `tempo_min` de uma lição, recalcule o `horas` do curso.

## Mapa de competências por nível

### Nível 1 — Fundamentos de programação e de computação

Ao concluir, você é capaz de:

- Explicar como um computador executa um programa (hardware, binário, compilação/interpretação, sistema operacional, terminal)
- Escrever algoritmos em pseudocódigo e executar testes de mesa
- Programar em Python com tipos básicos, operadores, entrada/saída, condicionais, laços, listas, tuplas, dicionários, conjuntos e compreensões
- Decompor problemas em funções com parâmetros, retorno, escopo correto, docstrings e `assert`
- Processar texto (métodos de string, formatação, split/join) e tratar erros com `try/except`
- Ler tracebacks, depurar sistematicamente e escrever testes simples

Módulos: Como o computador funciona (5) · Primeiros passos em Python (6) · Decisões: condicionais (5) · Repetição: laços (7) · Coleções (7) · Funções (7) · Strings e texto (5) · Erros, testes e depuração (4) · Projeto do nível (1).

### Nível 2 — Python intermediário e engenharia de software

Ao concluir, você é capaz de:

- Modelar domínios com classes, herança, polimorfismo, dataclasses e métodos especiais
- Organizar código em módulos e pacotes e usar a biblioteca padrão com fluência
- Projetar tratamento de erros com exceções próprias, context managers e logging
- Persistir dados em texto, CSV e JSON com pathlib
- Usar iteradores, geradores, closures, decoradores e assinaturas flexíveis
- Tipar, testar (unittest/pytest, TDD) e versionar (git) código com estilo PEP 8

Módulos: Programação orientada a objetos (7) · Módulos, pacotes e biblioteca padrão (5) · Exceções e robustez (4) · Arquivos e dados (5) · Iteradores, geradores e decoradores (6) · Tipagem, testes, git e estilo (6) · Projetos do nível (2).

### Nível 3 — Estruturas de dados e algoritmos

Ao concluir, você é capaz de:

- Aplicar lógica, provas, contagem, aritmética modular e logaritmos à análise de programas
- Analisar complexidade (Big-O, recorrências, amortização, memória) e medir tempo corretamente
- Implementar busca binária, ordenações O(n²), O(n log n) e lineares e escolher a adequada
- Implementar pilhas, filas, listas ligadas, árvores, heaps, tabelas hash e tries
- Resolver problemas em grafos (BFS, DFS, topológica, Dijkstra, MST, union-find)
- Projetar soluções com backtracking, divisão e conquista, programação dinâmica e algoritmos gulosos

Módulos: Matemática discreta essencial (5) · Análise de algoritmos (4) · Recursão, backtracking e divisão e conquista (4) · Busca e ordenação (6) · Estruturas lineares (4) · Árvores, heaps e tabelas hash (5) · Grafos (6) · Programação dinâmica e projeto (5).

### Nível 4 — Análise de dados

Ao concluir, você é capaz de:

- Computar com arrays numpy (vetorização, máscaras, broadcasting, álgebra linear, simulação)
- Manipular tabelas com pandas (seleção, filtros, colunas derivadas, leitura de arquivos reais)
- Limpar dados (ausentes, tipos, datas, duplicatas, outliers, tidy, junções)
- Agregar com groupby, tabelas dinâmicas e séries temporais
- Construir gráficos corretos e honestos com matplotlib
- Aplicar probabilidade, estatística descritiva e inferencial, testes de hipótese e regressão linear com interpretação

Módulos: numpy: computação vetorizada (5) · pandas: fundamentos (5) · Limpeza e transformação (5) · Agregação e séries temporais (3) · Visualização com matplotlib (4) · Probabilidade e estatística (8) · Projeto do nível (1).

### Nível 5 — Machine Learning

Ao concluir, você é capaz de:

- Usar álgebra linear, cálculo (gradiente, regra da cadeia) e verossimilhança para formular modelos
- Implementar regressão linear e logística com gradiente descendente do zero e com regularização
- Avaliar classificadores (matriz de confusão, precisão/recall/F1, ROC/PR, limiares) e regressores
- Construir pipelines scikit-learn com validação cruzada, busca de hiperparâmetros e diagnóstico viés-variância
- Treinar e interpretar árvores, florestas, gradient boosting, SVM, k-means, DBSCAN, PCA e detectores de anomalias
- Evitar vazamento, tratar desbalanceamento, criar atributos e avaliar justiça e viés

Módulos: Matemática para machine learning (5) · Regressão linear do zero (5) · Classificação (6) · scikit-learn na prática (6) · Árvores e ensembles (4) · SVM e aprendizado não supervisionado (5) · Boas práticas de machine learning (4) · Projeto do nível (1).

### Nível 6 — Deep Learning: a IA por dentro

Ao concluir, você é capaz de:

- Explicar e implementar neurônios, ativações e o forward pass vetorizado
- Construir um motor de autograd (grafo, backward topológico) e treinar um MLP com ele
- Implementar perdas, otimizadores (momentum, Adam), inicialização, normalização e regularização
- Implementar backprop vetorizado, CNNs (convolução, pooling) e diagnosticar o treino
- Construir embeddings, modelos de linguagem por bigramas, MLP de linguagem e RNN com BPTT
- Implementar tokenização BPE, self-attention, multi-head, o bloco transformer e treinar e amostrar um mini-GPT

Módulos: Neurônios e perceptron (4) · Autograd do zero (micrograd) (5) · Treinando redes (5) · MLP vetorizado em numpy (4) · Redes convolucionais (4) · Sequências, embeddings e RNN (5) · Atenção e transformers (6) · Limites e projeto (3).

### Nível 7 — Engenharia de IA

Ao concluir, você é capaz de:

- Integrar APIs de LLM com robustez (streaming, retries, saída estruturada, ferramentas) e controlar custo
- Projetar, versionar e avaliar prompts e pipelines de prompts
- Implementar busca vetorial (exata e aproximada), chunking e RAG híbrido com avaliação
- Construir agentes com ferramentas, memória, orçamento e guardrails
- Avaliar sistemas com LLM, defender contra prompt injection e aplicar LGPD e uso responsável
- Servir, versionar e monitorar modelos (FastAPI, registro, drift) e documentar com system card

Módulos: LLMs e APIs (5) · Prompting (4) · Embeddings e busca vetorial (4) · RAG: geração aumentada por recuperação (4) · Agentes e ferramentas (4) · Avaliação, segurança e ética (4) · MLOps básico e projeto (4).

## Justificativa pedagógica por nível

**Nível 1.** Segue a ordem do **MAC0110 (USP)** e do **CS50P (Harvard)**: variáveis, condicionais, laços, coleções e funções, com um problema por conceito e projetos curtos no fim de cada bloco. Os dois primeiros módulos ("como o computador funciona") vêm do CS50 e da tradição de introdução à computação, mas são curtos e conceituais, para não adiar a primeira linha de código. O formato de lição em passos (leitura → exercícios verificados → quiz) e as dicas progressivas são o modelo da **Codecademy *Learn Python 3***, que a análise de requisitos apontou como referência de usabilidade. O módulo de erros, testes e depuração antes do projeto final reflete a ênfase do CS50P em `assert`/testes desde o início.

**Nível 2.** Cobre o que o MAC0110/MAC0121 deixam para disciplinas posteriores e que a **Codecademy *Learn Python 3*** trata nos módulos finais (classes, módulos, arquivos, geradores, decoradores), somando a prática de engenharia de software que o mercado exige e o CS50P ensina no fim (testes com `unittest`/`pytest`, tipagem, estilo, git). Dois projetos (biblioteca com POO + JSON; analisador de logs com geradores + testes) garantem que o certificado ateste programas de porte médio, organizados e testados.

**Nível 3.** É a disciplina de estruturas de dados no espírito do **MAC0121 (USP)**: tudo implementado do zero em Python puro, com análise de complexidade e verificação de desempenho (um algoritmo quadrático reprova onde se exige n log n). A matemática discreta essencial abre o nível porque indução, contagem e logaritmos são o vocabulário da análise de algoritmos. O projeto (planejador de rotas) integra grafos, heaps, topológica e programação dinâmica num problema concreto do campus.

**Nível 4.** Segue o roteiro de **McKinney, *Python para Análise de Dados*** (numpy → pandas → limpeza → agregação → visualização) e adiciona o bloco de probabilidade e estatística que um curso introdutório de estatística aplicada exige (distribuições, TCL, intervalos, testes, regressão), sempre com simulação e interpretação em português. O projeto em dados públicos brasileiros (amostra do ENEM) exige o ciclo completo: pergunta, limpeza, gráficos, teste de hipótese e relatório reprodutível.

**Nível 5.** Combina a trilha **Codecademy *Data Scientist: Machine Learning*** (prática com scikit-learn), o **ISLP** (fundamentos estatísticos: viés-variância, validação, regularização, árvores, SVM, não supervisionado) e **Géron, *Mãos à Obra*** (pipelines, busca de hiperparâmetros, projeto de ponta a ponta). Regressão linear e logística são implementadas do zero antes do `fit`, porque o Nível 6 depende de o aluno dominar gradiente descendente. O módulo de boas práticas (vazamento, desbalanceamento, justiça, LGPD) e o projeto com model card refletem o que distingue um profissional de um usuário de biblioteca.

**Nível 6.** É construído inteiramente **do zero em numpy**, porque o objetivo é "a IA por dentro": o motor de autograd segue o **micrograd**, os modelos de linguagem seguem o **makemore** (bigramas, MLP de Bengio, RNN, transformer) de Karpathy, e backprop vetorizado, CNNs, inicialização, normalização e diagnóstico seguem o **CS231n**. Não há PyTorch nem GPU no ambiente de verificação (D2); passos opcionais indicam como repetir em PyTorch no Colab. O projeto final (um modelo de linguagem do tokenizador à geração) é a prova de que o aluno entende cada peça de um LLM em miniatura.

**Nível 7.** Trata o que o mercado chama de engenharia de IA: APIs, prompting, embeddings, RAG, agentes, avaliação, segurança, MLOps e responsabilidade. Como o ambiente de verificação não tem rede, os exercícios usam um **cliente de LLM simulado** determinístico (e um `miniapi` no lugar do FastAPI), o que torna a correção automática possível e os testes reprodutíveis — a mesma prática recomendada para testar sistemas com LLM. A LGPD e o prompt injection têm lições próprias porque são as duas falhas mais comuns em sistemas reais. O projeto final (assistente da secretaria) integra tudo e exige metas de avaliação e um system card.

## Como a certificação funciona (D4)

- **Certificado de nível**: exige **100 % das lições publicadas do curso concluídas** (cada lição guiada
  só conclui quando todos os passos estão concluídos; um exercício conclui quando todos os casos de
  verificação passam no servidor), **prova aprovada** (questões sorteadas do banco do curso; nota
  mínima 70 %; nova tentativa após o intervalo configurado) e **projeto(s) do nível aprovado(s)**
  pela correção automática (lições com `projeto: true`). O certificado tem código de verificação
  público.
- **Certificado da trilha** "Python: do zero à IA": emitido quando os 7 certificados de nível existem.
- **Pré-requisito**: o Nível N só abre com o certificado do Nível N−1 (`prerequisito` no `curso.yaml`;
  configurável pelo admin). Dentro de um nível os módulos não são sequenciais (`sequencial: false`).
- **Dicas e solução (D5)**: até 3 dicas por passo, reveladas uma a uma; a solução de referência pode ser
  vista após 3 verificações reprovadas e conclui o passo com 50 % do XP. A prova e o projeto garantem a
  competência mesmo quando o aluno viu soluções.
- **XP**: 80–150 por lição guiada, 150 nos mini-projetos de módulo e 300 nos projetos de nível; a curva
  de nível do jogador segue `xpForLevel` (1000, 2500, 4500, 7000…).

## Verificação automática e ambientes

- Níveis 1–3: `runtime: python` (CPython 3.14 WASI no Wasmtime), sem bibliotecas externas.
- Níveis 4–6: `runtime: python-dados` (Pyodide no servidor) com numpy, pandas, scipy, scikit-learn e matplotlib conforme a lição.
- Nível 7: `runtime: python` com cliente de LLM simulado e `miniapi` fornecidos no exercício; `python-dados` (numpy, scipy, scikit-learn) nas lições de busca vetorial, RAG, versionamento de modelos e drift.
- Não há PyTorch, GPU nem acesso à rede na verificação (D2): o Nível 6 é construído do zero em numpy e o Nível 7 simula APIs; passos opcionais indicam como repetir em PyTorch/Colab e com um provedor real.

## Referências de nível emuladas

- MAC0110 — Introdução à Computação e MAC0121 — Algoritmos e Estruturas de Dados I (IME-USP).
- CS50P — Introduction to Programming with Python (Harvard).
- Codecademy — *Learn Python 3* e *Data Scientist: Machine Learning* (career path).
- CS231n — Deep Learning for Computer Vision (Stanford).
- Karpathy — *micrograd* e *makemore* (Neural Networks: Zero to Hero).
- James, Witten, Hastie, Tibshirani, Taylor — *An Introduction to Statistical Learning with Applications in Python* (ISLP).
- McKinney — *Python para Análise de Dados*.
- Géron — *Mãos à Obra: Aprendizado de Máquina com Scikit-Learn, Keras e TensorFlow*.
