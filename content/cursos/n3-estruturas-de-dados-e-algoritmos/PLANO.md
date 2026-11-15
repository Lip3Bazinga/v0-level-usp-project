# Plano do Nível 3 — Estruturas de dados e algoritmos

Este é o plano de autoria do Nível 3 da trilha **Python: do zero à IA**. Ele orienta a escrita das lições de `content/cursos/n3-estruturas-de-dados-e-algoritmos` (os arquivos `*.lvl.md` já existem com o frontmatter e o passo de roteiro, que deve ser **substituído** pelos passos detalhados aqui). Cada lição traz: slug, título, objetivos, conceitos e a **sequência de passos, um a um**, com o tipo de cada passo (Leitura, Exercício — código, lacunas ou ordenar —, Previsão, Quiz), os recursos de apresentação (diagrama Mermaid, bloco `visualizar`, fórmula KaTeX) e, nos exercícios, as instruções (*checkpoints*), a verificação, as soluções erradas e as dicas.

Formato dos arquivos: `content/README.md` (§3 inteira; recursos de apresentação em §3.5–§3.7) e `docs/v2/curso-e-passos.md` §6. Todas as 39 lições deste nível usam `runtime: python` (CPython 3.14 WASI no Wasmtime), implementando estruturas e algoritmos em Python puro e biblioteca padrão (`collections.deque`, `heapq`, `bisect`, `functools`).

## Como usar este plano

1. Abra o arquivo da lição (`content/cursos/n3-estruturas-de-dados-e-algoritmos/<módulo>/<NN>-<slug>.lvl.md`).
2. Mantenha o frontmatter (`slug`, `xp`, `tempo_min`, `runtime`, `bibliotecas`, `objetivos`) e mude `publicada` para `true`. Não renomeie arquivos nem slugs.
3. Substitua o passo de roteiro pelos passos **na ordem e com os tipos listados** na lição (`## Passo N · Leitura|Exercício|Previsão|Quiz · Título`).
4. Em cada exercício: `### Instruções` (lista numerada = checkpoints), `### Código inicial` (não existe no `modo: ordenar`), `### Solução`, `### Dicas` (até 3), `### Verificação` (JSON de `TestCase[]`) e `### Soluções erradas` (**pelo menos duas**, cobrindo os erros comuns listados).
5. Rode `pnpm content:check` (lint) e `pnpm content:verify --licao <slug>` com `RUNNER_URL=http://127.0.0.1:8081` e `RUNNER_TOKEN=dev-runner-token-0123456789abcdef`.

## Como usar os recursos de apresentação neste nível

O aluno do Nível 3 já domina Python intermediário (classes, métodos especiais, exceções, iteradores/geradores, decoradores e testes do Nível 2). Neste nível, inspirado no **MAC0121 da USP**, a visualização e a matemática tornam palpáveis ponteiros, árvores, grafos, invariantes e complexidade assintótica.

### Regras

- **Diagrama (bloco `mermaid`)** — para árvores de decisão/recursão, ponteiros em listas ligadas e duplas (cache LRU), árvores binárias/BST/AVL/heaps/tries, grafos (representações, BFS, DFS, ordenação topológica, Dijkstra, MST) e grades de programação dinâmica. Use `flowchart` com no máximo ~8 nós e rótulos curtos em pt-BR; texto com parênteses, colchetes ou dois-pontos vai entre aspas.
- **Visualizador (bloco `python visualizar`)** — para inspecionar o estado mudando passo a passo: algoritmo de Euclides, redimensionamento amortizado de lista dinâmica, pilha de chamadas na recursão e *backtracking* (`append`/`pop`), busca binária estreitando `[lo, hi)`, particionamento de Lomuto, troca de ponteiros ao inverter lista ligada, subir/descer no heap, relaxamento no Dijkstra e preenchimento de tabela DP. Até 60 linhas, autossuficiente e sem `input()`.
- **Fórmula (KaTeX)** — onde há expressão matemática ou recorrência: leis de De Morgan, inclusão-exclusão, combinações $\binom{n}{k}$, congruências $a \equiv b \pmod m$, somas de Gauss e geométrica, definição formal de $O(g(n))$, $\Omega(g(n))$ e $\Theta(g(n))$, recorrências e Teorema Mestre $T(n) = aT(n/b) + f(n)$, fator de carga $\alpha = n/m$ e equações de Bellman na programação dinâmica.
- **`modo: lacunas` e `modo: ordenar`** — andaime nas primeiras lições de cada módulo (exceto no projeto final `n3-m8-05`, que tem apenas exercícios de código livre).
- **Passo `Previsão`** — pelo menos um por módulo, com código determinístico, autossuficiente, sem `input()`, terminando sem erro e imprimindo de 1 a 20 linhas, acompanhado de `### Saída esperada`.
- **Imagem (`assets/`) e Vídeo** — nenhum neste nível.
- **Limites em todo passo:** até 3 dicas; exercício com pelo menos 2 soluções erradas; quiz com 2 a 5 perguntas, cada uma com exatamente uma alternativa correta e explicação (`> …`); leitura com ≥ 200 caracteres.

### Dosagem por módulo

| Módulo | Lições | Mermaid | Visualizar | Passos com fórmula | Exercício (lacunas) | Exercício (ordenar) | Exercício (código) | Previsão | Imagens (assets) |
|---|---|---|---|---|---|---|---|---|---|
| 1 · Matemática discreta essencial | 5 | 3 | 2 | 5 | 2 | 1 | 12 | 2 | 0 |
| 2 · Análise de algoritmos | 4 | 3 | 2 | 3 | 1 | 1 | 10 | 2 | 0 |
| 3 · Recursão, backtracking e divisão e conquista | 4 | 4 | 2 | 3 | 1 | 1 | 10 | 2 | 0 |
| 4 · Busca e ordenação | 6 | 4 | 3 | 3 | 2 | 1 | 15 | 2 | 0 |
| 5 · Estruturas lineares | 4 | 4 | 2 | 1 | 1 | 1 | 10 | 2 | 0 |
| 6 · Árvores, heaps e tabelas hash | 5 | 5 | 2 | 3 | 1 | 1 | 13 | 2 | 0 |
| 7 · Grafos | 6 | 6 | 2 | 2 | 1 | 1 | 16 | 2 | 0 |
| 8 · Programação dinâmica e projeto | 5 | 4 | 2 | 3 | 1 | 1 | 16 | 2 | 0 |
| **Total** | **39** | **33** | **17** | **23** | **10** | **8** | **102** | **16** | **0** |

## Estrutura do nível

8 módulos · 39 lições (1 projeto de nível) · 33,7 h de lições (2020 min) + prova (1 h) · 4610 XP · prova com 40 questões (20 por tentativa).

| # | Módulo | Lições | Minutos | XP |
|---|---|---|---|---|
| 1 | Matemática discreta essencial (`matematica-discreta-essencial`) | 5 | 215 | 520 |
| 2 | Análise de algoritmos (`analise-de-algoritmos`) | 4 | 170 | 420 |
| 3 | Recursão, backtracking e divisão e conquista (`recursao-e-divisao-e-conquista`) | 4 | 185 | 450 |
| 4 | Busca e ordenação (`busca-e-ordenacao`) | 6 | 275 | 670 |
| 5 | Estruturas lineares (`estruturas-lineares`) | 4 | 195 | 470 |
| 6 | Árvores, heaps e tabelas hash (`arvores-e-tabelas-hash`) | 5 | 255 | 610 |
| 7 | Grafos (`grafos`) | 6 | 290 | 700 |
| 8 | Programação dinâmica e projeto (`programacao-dinamica-e-projeto`) | 5 | 435 | 770 |

## Módulo 1 · Matemática discreta essencial

Lógica proposicional e provas, conjuntos/funções/relações, contagem e princípio da casa dos pombos, aritmética modular/primos e somatórios/logaritmos.

### n3-m1-01-logica-e-provas · Lógica proposicional e provas
- **Arquivo:** `01-matematica-discreta-essencial/01-logica-e-provas.lvl.md` · 100 XP · 45 min
- **Passos (6):**
  1. **Leitura · Implicação, De Morgan, quantificadores e indução como invariante de laço** (Mermaid + KaTeX: $\neg(p \land q) \equiv \neg p \lor \neg q$, $p \to q \equiv \neg q \to \neg p$, $\sum_{i=1}^n (2i-1) = n^2$)
  2. **Previsão · Quantificadores `all` e `any` e negação de condições**
  3. **Exercício (lacunas) · Tabela-verdade da implicação e equivalência de De Morgan** (`implicacao`, `tabela_implicacao`, `verificar_de_morgan`)
  4. **Exercício (ordenar) · Soma dos $n$ primeiros ímpares e verificação da hipótese indutiva** (`soma_impares`, `verificar_inducao_impares`)
  5. **Exercício (código) · Busca linear com rastro do invariante de laço** (`invariante_busca(lista, alvo)`)
  6. **Quiz · Implicação, contrapositiva e negação de quantificadores**

### n3-m1-02-conjuntos-funcoes-e-relacoes · Conjuntos, funções e relações
- **Arquivo:** `01-matematica-discreta-essencial/02-conjuntos-funcoes-e-relacoes.lvl.md` · 100 XP · 40 min
- **Passos (5):**
  1. **Leitura · Inclusão-exclusão, funções bijetoras e relações de equivalência** (Mermaid + KaTeX: $|A \cup B \cup C|$)
  2. **Exercício (lacunas) · Princípio da inclusão-exclusão para 3 conjuntos** (`inclusao_exclusao(a, b, c)`)
  3. **Exercício (código) · Classificando funções como injetora, sobrejetora ou bijetora** (`classificar_funcao(mapa, contradominio)`)
  4. **Exercício (código) · Relação de equivalência e partição em classes** (`eh_equivalencia(pares, elementos)`, `classes_de_equivalencia(pares, elementos)`)
  5. **Quiz · Bijeções, inversas e propriedades de relações**

### n3-m1-03-contagem · Contagem: permutações, combinações e o princípio da casa dos pombos
- **Arquivo:** `01-matematica-discreta-essencial/03-contagem.lvl.md` · 110 XP · 45 min
- **Passos (5):**
  1. **Leitura · Regras da soma e do produto, triângulo de Pascal e explosão combinatória** (Visualizar + KaTeX: $\binom{n}{k} = \binom{n-1}{k-1} + \binom{n-1}{k}$)
  2. **Exercício (código) · Combinações via Pascal com memoização e contagem de senhas** (`combinacoes(n, k)`, `contar_senhas(tamanho_alfabeto, k, sem_repetir)`)
  3. **Exercício (código) · Anagramas distintos com letras repetidas e tempo de força bruta** (`anagramas_distintos(palavra)`, `tempo_forca_bruta_anos(total_possibilidades, tentativas_por_seg)`)
  4. **Quiz · Arranjo vs combinação e princípio da casa dos pombos**

### n3-m1-04-aritmetica-modular-e-primos · Aritmética modular, divisibilidade e primos
- **Arquivo:** `01-matematica-discreta-essencial/04-aritmetica-modular-e-primos.lvl.md` · 110 XP · 45 min
- **Passos (6):**
  1. **Leitura · Congruências, algoritmo de Euclides, crivo de Eratóstenes e exponenciação modular** (Visualizar + KaTeX: $\text{mdc}(a, b) = \text{mdc}(b, a \bmod b)$, $a^e \bmod m$)
  2. **Previsão · Restos negativos em Python e quadrados sucessivos**
  3. **Exercício (código) · MDC de Euclides, MMC e primeiro dígito verificador do CPF** (`mdc(a, b)`, `mmc(a, b)`, `digito_verificador_cpf(nove_digitos)`)
  4. **Exercício (código) · Crivo de Eratóstenes em $O(n \log \log n)$** (`crivo(n)` testado até $n = 200\,000$)
  5. **Exercício (código) · Exponenciação modular rápida sem `pow` de 3 argumentos** (`pot_mod(base, exp, mod)` para $e \approx 10^{18}$)
  6. **Quiz · Congruências, primalidade até $\sqrt{n}$ e custo de Euclides**

### n3-m1-05-somatorios-logaritmos-e-crescimento · Somatórios, logaritmos e crescimento de funções
- **Arquivo:** `01-matematica-discreta-essencial/05-somatorios-logaritmos-e-crescimento.lvl.md` · 100 XP · 40 min
- **Passos (5):**
  1. **Leitura · Soma de Gauss, progressão geométrica, $\log_2 n$ e hierarquia de crescimento** (Mermaid + KaTeX: $\sum_{i=1}^n i = \frac{n(n+1)}{2}$, $\sum_{k=0}^{m-1} r^k = \frac{r^m - 1}{r - 1}$)
  2. **Exercício (código) · Somas aritmética e geométrica em forma fechada e $\lfloor \log_2 n \rfloor$** (`soma_aritmetica`, `soma_geometrica`, `log2_inteiro`)
  3. **Exercício (código) · Ordenar classes de crescimento e estimar o que cabe em 1 segundo** (`ordenar_por_crescimento(rotulos)`, `cabe_em_um_segundo(classe, n)`)
  4. **Quiz · Comparação de taxas de crescimento e significado de $\log_2 n$**

## Módulo 2 · Análise de algoritmos

Medição empírica de tempo, notação Big-O/$\Omega$/$\Theta$, análise de laços e recursões, e melhor/pior/médio caso, amortização e memória.

### n3-m2-01-medindo-tempo-de-execucao · Medindo tempo de execução
- **Arquivo:** `02-analise-de-algoritmos/01-medindo-tempo-de-execucao.lvl.md` · 90 XP · 35 min
- **Passos (5):**
  1. **Leitura · `perf_counter`, mediana de repetições e experimento de dobrar a entrada** (Mermaid + KaTeX: $R(n) = \frac{T(2n)}{T(n)}$)
  2. **Previsão · Razão $T(2n)/T(n)$ para algoritmos lineares e quadráticos**
  3. **Exercício (lacunas) · Mediana de tempos e cálculo da razão de crescimento** (`mediana_tempos(tempos)`, `estimar_ordem_por_razao(t_n, t_2n)`)
  4. **Exercício (código) · Medindo e classificando funções pelo número de operações** (`medir_mediana(funcao, entrada, repeticoes)`, `classificar_crescimento_empirico(contagens_n, contagens_2n)`)
  5. **Quiz · Mediana vs média, `perf_counter` e limites da medição**

### n3-m2-02-notacao-big-o · Notação Big-O
- **Arquivo:** `02-analise-de-algoritmos/02-notacao-big-o.lvl.md` · 110 XP · 45 min
- **Passos (5):**
  1. **Leitura · Definição formal de $O$, $\Omega$ e $\Theta$ e complexidade das operações em Python** (Mermaid + KaTeX: $0 \le f(n) \le c \cdot g(n) \;\forall n \ge n_0$)
  2. **Exercício (ordenar) · Verificação numérica da desigualdade $f(n) \le c \cdot g(n)$** (`verificar_big_o(f, g, c, n0, ate)`)
  3. **Exercício (código) · Simplificação de polinômios/termos para a classe dominante e custo de operações Python** (`simplificar_custo(termos)`, `classe_de_operacao(operacao)`)
  4. **Quiz · $O$, $\Omega$, $\Theta$ e armadilhas de complexidade em listas e conjuntos**

### n3-m2-03-analise-de-lacos-e-recursoes · Análise de laços e recursões simples
- **Arquivo:** `02-analise-de-algoritmos/03-analise-de-lacos-e-recursoes.lvl.md` · 120 XP · 50 min
- **Passos (6):**
  1. **Leitura · Laços triangulares, logarítmicos, custos escondidos e recorrências básicas** (Visualizar + KaTeX: $T(n) = T(n-1) + n$, $T(n) = 2T(n/2) + n$)
  2. **Previsão · Quantas vezes executa um laço com passo multiplicativo dentro de um laço linear?**
  3. **Exercício (código) · Contagem exata de iterações e classificação de trechos** (`contar_iteracoes(n)`, `classificar_trecho(codigo_id)`)
  4. **Exercício (código) · Avaliando recorrências numericamente** (`resolver_recorrencia(tipo, n)`)
  5. **Exercício (código) · Eliminando o custo quadrático escondido (`in` em `list` $\to$ `set`)** (`intersecao_rapida(a, b)` em $O(n)$ para $n = 50\,000$)
  6. **Quiz · Laços triangulares, operações embutidas e recorrências**

### n3-m2-04-melhor-pior-e-medio-caso-e-memoria · Melhor, pior e caso médio; custo de memória
- **Arquivo:** `02-analise-de-algoritmos/04-melhor-pior-e-medio-caso-e-memoria.lvl.md` · 100 XP · 40 min
- **Passos (5):**
  1. **Leitura · Melhor/pior/médio caso, custo amortizado de `list.append` e espaço auxiliar vs *in-place*** (Mermaid + Visualizar)
  2. **Exercício (código) · Busca linear contando comparações e simulação de vetor dinâmico** (`busca_linear_com_contagem(lista, alvo)`, `simular_lista_dinamica(n)`)
  3. **Exercício (código) · Inversão *in-place* em $O(1)$ de espaço auxiliar e classificação de memória** (`inverter_in_place(lista)`, `espaco_auxiliar(algoritmo)`)
  4. **Quiz · Custo amortizado, pilha de recursão e *in-place***

## Módulo 3 · Recursão, backtracking e divisão e conquista

Pilha de chamadas, conversão para pilha explícita, *backtracking* com poda, divisão e conquista e Teorema Mestre.

### n3-m3-01-recursao-revisitada · Recursão revisitada
- **Arquivo:** `03-recursao-e-divisao-e-conquista/01-recursao-revisitada.lvl.md` · 100 XP · 40 min
- **Passos (6):**
  1. **Leitura · Quadros de pilha, recursão em estruturas aninhadas e conversão para pilha explícita** (Mermaid + Visualizar)
  2. **Previsão · Ordem de execução antes e depois da chamada recursiva**
  3. **Exercício (lacunas) · Achatamento recursivo e contagem de chamadas no Fibonacci ingênuo** (`achatar(lista_aninhada)`, `contar_chamadas_fib(n)`)
  4. **Exercício (código) · Potência rápida recursiva e achatamento iterativo com pilha explícita** (`potencia_rapida(b, e)`, `achatar_iterativo(lista)` para profundidade $5\,000$)
  5. **Quiz · Pilha de chamadas, `RecursionError` e recursão múltipla**

### n3-m3-02-backtracking · Backtracking: explorar e desfazer
- **Arquivo:** `03-recursao-e-divisao-e-conquista/02-backtracking.lvl.md` · 130 XP · 55 min
- **Passos (5):**
  1. **Leitura · Escolher, recursar e desfazer (`append`/`pop`), árvore de estados e poda** (Mermaid + Visualizar)
  2. **Exercício (código) · Geração de subconjuntos e permutações sem `itertools`** (`subconjuntos(lista)`, `permutacoes(lista)`)
  3. **Exercício (código) · Problema das $N$-rainhas com poda por conjuntos e soma de subconjuntos** (`n_rainhas(n)` com $n=8 \to 92$, `soma_subconjuntos(numeros, alvo)`)
  4. **Exercício (código) · Resolvedor de Sudoku $4 \times 4$** (`resolver_sudoku4(grade)`)
  5. **Quiz · Desfazer escolhas, cópia de caminho parcial e poda**

### n3-m3-03-divisao-e-conquista · Divisão e conquista
- **Arquivo:** `03-recursao-e-divisao-e-conquista/03-divisao-e-conquista.lvl.md` · 120 XP · 50 min
- **Passos (5):**
  1. **Leitura · Dividir, conquistar e combinar: busca binária recursiva, intercalação e contagem de inversões** (Mermaid + KaTeX: $T(n) = 2T(n/2) + \Theta(n)$)
  2. **Exercício (ordenar) · Busca binária recursiva e máximo por divisão e conquista** (`maximo_dc(lista)`, `busca_binaria_rec(lista, alvo, ini, fim)`)
  3. **Exercício (código) · Intercalação linear e contagem de inversões em $O(n \log n)$** (`intercalar(a, b)`, `contar_inversoes(lista)` para $20\,000$ elementos)
  4. **Quiz · Paradigma de divisão e conquista e contagem de inversões**

### n3-m3-04-recorrencias-e-teorema-mestre · Recorrências e o Teorema Mestre
- **Arquivo:** `03-recursao-e-divisao-e-conquista/04-recorrencias-e-teorema-mestre.lvl.md` · 100 XP · 40 min
- **Passos (5):**
  1. **Leitura · Árvores de recursão e os três casos do Teorema Mestre** (Mermaid + KaTeX: $T(n) = aT(n/b) + \Theta(n^k)$, comparação entre $k$ e $\log_b a$)
  2. **Previsão · Trabalho por nível na árvore de recursão**
  3. **Exercício (código) · Simulação de recorrência com memoização e classificador do Teorema Mestre** (`simular_recorrencia(a, b, k, n)`, `teorema_mestre(a, b, k)`, `identificar_parametros(codigo_id)`)
  4. **Quiz · Os três casos do Teorema Mestre e quando ele não se aplica**

## Módulo 4 · Busca e ordenação

Busca linear e binária (e busca binária na resposta), ordenações $O(n^2)$, merge sort, quick sort/quickselect, Timsort/`key` no Python e ordenações lineares.

### n3-m4-01-busca-linear-e-binaria · Busca linear e busca binária
- **Arquivo:** `04-busca-e-ordenacao/01-busca-linear-e-binaria.lvl.md` · 110 XP · 45 min
- **Passos (6):**
  1. **Leitura · Invariante da busca binária, variantes (`lower_bound`/primeira ocorrência) e busca binária na resposta** (Visualizar + KaTeX)
  2. **Previsão · Rastreando `lo`, `hi` e `meio` quando o elemento não está na lista**
  3. **Exercício (lacunas) · Busca binária exata, primeira ocorrência e limite inferior** (`busca_binaria`, `primeira_ocorrencia`, `limite_inferior`)
  4. **Exercício (código) · Raiz quadrada inteira para $10^{18}$ e menor capacidade de caminhão** (`raiz_inteira(n)`, `menor_capacidade(pesos, dias)`)
  5. **Quiz · Invariantes, `hi = meio - 1` vs `hi = meio` e pré-condição de ordenação**

### n3-m4-02-ordenacoes-elementares · Ordenações elementares: bolha, seleção e inserção
- **Arquivo:** `04-busca-e-ordenacao/02-ordenacoes-elementares.lvl.md` · 110 XP · 45 min
- **Passos (5):**
  1. **Leitura · Invariantes de Bubble, Selection e Insertion Sort, estabilidade e dados quase ordenados** (Mermaid + Visualizar)
  2. **Exercício (lacunas) · Bubble Sort com parada antecipada, Selection Sort e Insertion Sort *in-place*** (`bubble_sort`, `selection_sort`, `insertion_sort`)
  3. **Exercício (código) · Contagem de trocas/comparações e teste de estabilidade** (`contar_trocas_selection(lista)`, `insertion_sort_com_contagem(lista)`, `eh_estavel(funcao_ord)`)
  4. **Quiz · Invariantes, melhor caso $O(n)$ do Insertion Sort e estabilidade**

### n3-m4-03-merge-sort · Merge sort
- **Arquivo:** `04-busca-e-ordenacao/03-merge-sort.lvl.md` · 120 XP · 50 min
- **Passos (5):**
  1. **Leitura · Intercalação estável, Merge Sort recursivo e versão iterativa (*bottom-up*)** (Mermaid + KaTeX)
  2. **Exercício (código) · Intercalação estável e Merge Sort recursivo para $10^5$ elementos** (`intercalar(a, b)`, `merge_sort(lista)`)
  3. **Exercício (código) · Merge Sort *bottom-up* (sem recursão) e ordenação estável por chave** (`merge_sort_bottom_up(lista)`, `ordenar_por_chave(registros, chave)`)
  4. **Quiz · Estabilidade (`<=`), espaço auxiliar $O(n)$ e custo garantido $O(n \log n)$**

### n3-m4-04-quick-sort · Quick sort
- **Arquivo:** `04-busca-e-ordenacao/04-quick-sort.lvl.md` · 120 XP · 50 min
- **Passos (5):**
  1. **Leitura · Particionamento de Lomuto, escolha aleatória de pivô e Quickselect em $O(n)$ esperado** (Mermaid + Visualizar)
  2. **Exercício (ordenar) · Particionamento de Lomuto *in-place*** (`particionar(lista, lo, hi)`)
  3. **Exercício (código) · Quick Sort aleatorizado *in-place* e Quickselect (`k_esimo_menor`)** (`quick_sort(lista)`, `quick_sort_aleatorio(lista)`, `k_esimo_menor(lista, k)`)
  4. **Quiz · Pior caso $O(n^2)$, pivô aleatório, estabilidade e Quickselect**

### n3-m4-05-ordenacao-no-python · Ordenação no Python: sorted, key, estabilidade e Timsort
- **Arquivo:** `04-busca-e-ordenacao/05-ordenacao-no-python.lvl.md` · 100 XP · 40 min
- **Passos (5):**
  1. **Leitura · Tuplas em `key`, critérios mistos, estabilidade encadeada, `cmp_to_key` e Timsort** (Mermaid)
  2. **Previsão · Ordenação em duas passagens aproveitando a estabilidade do Timsort**
  3. **Exercício (código) · Ordenando alunos, versões semânticas, frequências e comparador customizado** (`ordenar_alunos`, `ordenar_versoes`, `ordenar_por_frequencia`, `maior_numero_concatenado`)
  4. **Quiz · `sorted` vs `.sort()`, transformada de Schwartz (`key`) e *runs* do Timsort**

### n3-m4-06-ordenacoes-lineares · Ordenações em tempo linear: counting, bucket e radix
- **Arquivo:** `04-busca-e-ordenacao/06-ordenacoes-lineares.lvl.md` · 110 XP · 45 min
- **Passos (5):**
  1. **Leitura · Limite inferior $\Omega(n \log n)$ por comparações, Counting Sort estável e Radix Sort LSD** (KaTeX: $\log_2(n!) = \Theta(n \log n)$, $O(n + k)$)
  2. **Exercício (código) · Counting Sort estável de registros `(chave, valor)` e histograma de notas** (`counting_sort(registros, k)`, `histograma_de_notas(notas)`)
  3. **Exercício (código) · Radix Sort LSD para inteiros até $10^9$ e ordenação de CEPs** (`radix_sort(lista)`, `ordenar_ceps(lista)`)
  4. **Quiz · Limite inferior de comparação, estabilidade no Radix LSD e papel de $k$**

## Módulo 5 · Estruturas lineares

Pilhas, filas/deques (e deque monotônica), listas ligadas simples e listas duplamente ligadas com cache LRU.

### n3-m5-01-pilhas · Pilhas
- **Arquivo:** `05-estruturas-lineares/01-pilhas.lvl.md` · 110 XP · 45 min
- **Passos (6):**
  1. **Leitura · LIFO em $O(1)$, delimitadores balanceados, RPN, *Shunting-Yard* e desfazer/refazer** (Mermaid + Visualizar)
  2. **Previsão · Duas pilhas em ação: histórico de desfazer e refazer**
  3. **Exercício (lacunas) · Classe `Pilha` e verificação de delimitadores `()[]{}`** (`Pilha`, `balanceado(texto)`)
  4. **Exercício (código) · Avaliação de RPN, conversão infixa $\to$ posfixa e editor com desfazer/refazer** (`avaliar_rpn`, `infixa_para_posfixa`, `editor_com_desfazer`)
  5. **Quiz · LIFO, ordem dos operandos no RPN e `append`/`pop` vs `pop(0)`**

### n3-m5-02-filas-e-deque · Filas e deque
- **Arquivo:** `05-estruturas-lineares/02-filas-e-deque.lvl.md` · 110 XP · 45 min
- **Passos (5):**
  1. **Leitura · FIFO, fila circular com aritmética modular, `collections.deque` e deque monotônica** (Mermaid + KaTeX)
  2. **Exercício (código) · Classe `FilaCircular` e simulação de fila de atendimento** (`FilaCircular`, `simular_atendimento(chegadas, duracao)`, `ultimos_k(eventos, k)`)
  3. **Exercício (código) · Máximo em janela deslizante em $O(n)$ com deque monotônica** (`maximo_janela(lista, k)` para $10^5$ elementos)
  4. **Quiz · `deque.popleft()` vs `list.pop(0)`, fila circular e invariante da deque monotônica**

### n3-m5-03-listas-ligadas · Listas ligadas simples
- **Arquivo:** `05-estruturas-lineares/03-listas-ligadas.lvl.md` · 130 XP · 55 min
- **Passos (6):**
  1. **Leitura · Nós e referências, cabeça/cauda, inversão com 3 ponteiros e tartaruga/lebre de Floyd** (Mermaid + Visualizar)
  2. **Previsão · O que acontece quando trocamos `atual.proximo` na ordem errada?**
  3. **Exercício (ordenar) · Detectando ciclo com tartaruga e lebre (Floyd)** (`No`, `tem_ciclo(cabeca)`)
  4. **Exercício (código) · Classe `ListaLigada` com cabeça e cauda ($O(1)$ no início e no fim) e inversão *in-place*** (`No`, `ListaLigada`)
  5. **Exercício (código) · $k$-ésimo a partir do fim e intercalação de listas ligadas ordenadas** (`k_esimo_do_fim(cabeca, k)`, `intercalar_ordenadas(a, b)`)
  6. **Quiz · Custos de `ListaLigada` vs `list` e técnica dos dois ponteiros**

### n3-m5-04-listas-duplamente-ligadas-e-lru · Listas duplamente ligadas e cache LRU
- **Arquivo:** `05-estruturas-lineares/04-listas-duplamente-ligadas-e-lru.lvl.md` · 120 XP · 50 min
- **Passos (5):**
  1. **Leitura · Sentinelas `inicio`/`fim`, remoção $O(1)$ dado o nó e arquitetura do Cache LRU (`dict` + lista dupla)** (Mermaid)
  2. **Exercício (código) · `ListaDupla` com nós sentinelas e histórico de navegação** (`NoDuplo`, `ListaDupla`, `HistoricoNavegacao`)
  3. **Exercício (código) · `CacheLRU` com `get` e `put` em $O(1)$ verificado para $10^5$ operações** (`CacheLRU`)
  4. **Quiz · Papel das sentinelas, combinação hash + lista dupla e política de descarte LRU**

## Módulo 6 · Árvores, heaps e tabelas hash

Árvores binárias e percursos, árvores de busca binária (BST), heaps e filas de prioridade, tabelas hash do zero e árvores balanceadas (AVL) e tries.

### n3-m6-01-arvores-binarias-e-percursos · Árvores binárias e percursos
- **Arquivo:** `06-arvores-e-tabelas-hash/01-arvores-binarias-e-percursos.lvl.md` · 110 XP · 45 min
- **Passos (6):**
  1. **Leitura · Altura, folhas, os 4 percursos (pré, em, pós e por níveis) e árvores de expressão** (Mermaid)
  2. **Previsão · Pré-ordem, em-ordem e pós-ordem na mesma árvore**
  3. **Exercício (lacunas) · Altura, tamanho, contagem de folhas e simetria** (`No`, `altura`, `tamanho`, `contar_folhas`, `eh_simetrica`)
  4. **Exercício (código) · Os quatro percursos, árvore de expressão e reconstrução a partir de pré + em-ordem** (`pre_ordem`, `em_ordem`, `pos_ordem`, `por_niveis`, `avaliar_expressao`, `para_infixa`, `reconstruir`)
  5. **Quiz · Percursos, altura de árvore e reconstrução única**

### n3-m6-02-arvores-de-busca-binaria · Árvores de busca binária
- **Arquivo:** `06-arvores-e-tabelas-hash/02-arvores-de-busca-binaria.lvl.md` · 130 XP · 55 min
- **Passos (5):**
  1. **Leitura · Propriedade global da BST, remoção nos 3 casos e degeneração com entrada ordenada** (Mermaid + KaTeX)
  2. **Exercício (ordenar) · Validação de BST com intervalo `(minimo, maximo)`** (`No`, `eh_bst(raiz)`)
  3. **Exercício (código) · Classe `BST` com `inserir`, `buscar`, `em_ordem`, `remover` (3 casos) e `k_esimo_menor`** (`BST`, `k_esimo_menor`, `comparar_alturas_bst`)
  4. **Quiz · Remoção com dois filhos (sucessor), armadilha da validação local e altura $O(n)$ no pior caso**

### n3-m6-03-heaps-e-filas-de-prioridade · Heaps e filas de prioridade
- **Arquivo:** `06-arvores-e-tabelas-hash/03-heaps-e-filas-de-prioridade.lvl.md` · 120 XP · 50 min
- **Passos (5):**
  1. **Leitura · Heap binário em array, `subir`/`descer`, `heapify` em $O(n)$ e aplicações com `heapq`** (Mermaid + Visualizar + KaTeX: $\text{pai}(i)=\lfloor(i-1)/2\rfloor$)
  2. **Exercício (código) · Classe `MinHeap` do zero (`inserir`, `extrair_min`, `construir` $O(n)$) e `heap_sort`** (`MinHeap`, `heap_sort`)
  3. **Exercício (código) · `k_maiores` em $O(n \log k)$, `fundir_k_listas` e `mediana_em_fluxo` com dois heaps** (`k_maiores`, `fundir_k_listas`, `mediana_em_fluxo`)
  4. **Quiz · Índices no vetor, custo $O(n)$ do `heapify` e técnica dos dois heaps**

### n3-m6-04-tabelas-hash · Tabelas hash do zero
- **Arquivo:** `06-arvores-e-tabelas-hash/04-tabelas-hash.lvl.md` · 130 XP · 55 min
- **Passos (6):**
  1. **Leitura · Hash polinomial, encadeamento separado, fator de carga $\alpha$, sondagem linear com lápide (*tombstone*) e `__hash__`/`__eq__`** (Mermaid + Visualizar + KaTeX: $\alpha = n/m$)
  2. **Previsão · Por que objetos mutáveis ou com `__eq__` sem `__hash__` falham como chaves de `dict`?**
  3. **Exercício (código) · Hash polinomial, contagem de colisões e classe `Ponto` imutável hasheável** (`hash_polinomial`, `contar_colisoes`, `Ponto`)
  4. **Exercício (código) · `TabelaHash` com encadeamento e redimensionamento automático ($10^5$ inserções) e `TabelaHashAberta` com lápide** (`TabelaHash`, `TabelaHashAberta`)
  5. **Quiz · Colisões de anagramas, necessidade da lápide na sondagem linear e redimensionamento**

### n3-m6-05-arvores-balanceadas-e-tries · Árvores balanceadas e tries
- **Arquivo:** `06-arvores-e-tabelas-hash/05-arvores-balanceadas-e-tries.lvl.md` · 120 XP · 50 min
- **Passos (5):**
  1. **Leitura · Fator de balanceamento e rotações AVL, ideia de B-trees e estrutura da Trie (árvore de prefixos)** (Mermaid)
  2. **Exercício (código) · Rotações à esquerda/direita e inserção em `AVL` mantendo altura $O(\log n)$ para $10^4$ chaves ordenadas** (`NoAVL`, `rotacao_direita`, `rotacao_esquerda`, `AVL`)
  3. **Exercício (código) · `Trie` com `inserir`, `contem`, `com_prefixo` e `autocompletar(trie, prefixo, k)`** (`Trie`, `autocompletar`)
  4. **Quiz · Rotações simples vs duplas na AVL, marcação de `fim_de_palavra` na Trie e B-trees**

## Módulo 7 · Grafos

Representações (lista/matriz/grade), BFS e menor caminho sem pesos, DFS/componentes/ciclos/bipartição, ordenação topológica, Dijkstra/Bellman-Ford e MST (Kruskal/Prim) com Union-Find.

### n3-m7-01-representacao-de-grafos · Representação de grafos
- **Arquivo:** `07-grafos/01-representacao-de-grafos.lvl.md` · 100 XP · 40 min
- **Passos (5):**
  1. **Leitura · Vértices, arestas direcionadas e ponderadas, lista vs matriz de adjacência e grafos implícitos em grade** (Mermaid + KaTeX: $O(V + E)$ vs $O(V^2)$)
  2. **Exercício (lacunas) · Construção de grafo, graus e vizinhos em grade** (`construir_grafo`, `grau`, `graus_de_entrada`, `vizinhos_na_grade`)
  3. **Exercício (código) · Conversão entre lista e matriz de adjacência e consulta `tem_aresta`** (`lista_para_matriz`, `matriz_para_lista`, `tem_aresta_lista`, `tem_aresta_matriz`)
  4. **Quiz · Grafos esparsos vs densos, soma dos graus e simetria na matriz de adjacência**

### n3-m7-02-bfs-e-menor-caminho · BFS e menor caminho sem pesos
- **Arquivo:** `07-grafos/02-bfs-e-menor-caminho.lvl.md` · 120 XP · 50 min
- **Passos (5):**
  1. **Leitura · Busca em largura por camadas, marcar visitado ao enfileirar, reconstrução de caminho e BFS multi-fonte** (Mermaid + Visualizar)
  2. **Exercício (código) · `bfs` de distâncias e reconstrução de `menor_caminho`** (`bfs(grafo, origem)`, `menor_caminho(grafo, origem, destino)`)
  3. **Exercício (código) · Labirinto em grade, escada de palavras e BFS multi-fonte** (`resolver_labirinto`, `menor_numero_de_trocas`, `distancia_ate_mais_proximo`)
  4. **Quiz · Por que marcar visitado ao enfileirar e por que BFS garante o menor número de arestas**

### n3-m7-03-dfs-componentes-e-ciclos · DFS, componentes conexos e detecção de ciclos
- **Arquivo:** `07-grafos/03-dfs-componentes-e-ciclos.lvl.md` · 120 XP · 50 min
- **Passos (6):**
  1. **Leitura · DFS recursiva e iterativa, componentes conexos, ciclos com 3 cores (branco/cinza/preto) e bipartição** (Mermaid)
  2. **Previsão · Estados branco, cinza e preto na detecção de ciclo direcionado**
  3. **Exercício (código) · `dfs_ordem`, `componentes` e ciclos em grafos direcionados e não direcionados** (`dfs_ordem`, `componentes`, `tem_ciclo_direcionado`, `tem_ciclo_nao_direcionado`)
  4. **Exercício (código) · Teste de grafo bipartido (2-coloração) e contagem de ilhas iterativa em grade grande** (`eh_bipartido`, `contar_ilhas`)
  5. **Quiz · Aresta de retorno para vértice cinza, pai no grafo não direcionado e grafos bipartidos**

### n3-m7-04-ordenacao-topologica · Ordenação topológica
- **Arquivo:** `07-grafos/04-ordenacao-topologica.lvl.md` · 110 XP · 45 min
- **Passos (5):**
  1. **Leitura · DAGs, algoritmo de Kahn com fila de grau zero, pós-ordem invertida na DFS e caminho crítico (mínimo de semestres)** (Mermaid)
  2. **Exercício (ordenar) · Ordenação topológica por DFS (pós-ordem invertida)** (`ordem_topologica_dfs(grafo)`)
  3. **Exercício (código) · Kahn com desempate lexicográfico, detecção de ciclo e mínimo de semestres** (`ordem_topologica_kahn`, `detectar_ciclo`, `minimo_de_semestres`)
  4. **Quiz · Condição de existência (DAG), detecção de ciclo no algoritmo de Kahn e aplicações**

### n3-m7-05-dijkstra · Dijkstra: menor caminho com pesos
- **Arquivo:** `07-grafos/05-dijkstra.lvl.md` · 130 XP · 55 min
- **Passos (6):**
  1. **Leitura · Relaxamento de arestas, fila de prioridade (`heapq`), entradas obsoletas e limite de pesos não negativos** (Mermaid + Visualizar + KaTeX: $O((V + E)\log V)$)
  2. **Previsão · Por que entradas obsoletas aparecem no heap durante o Dijkstra?**
  3. **Exercício (código) · `dijkstra` em $O((V+E)\log V)$ para $10^4$ vértices e reconstrução de `caminho_minimo`** (`dijkstra`, `caminho_minimo`)
  4. **Exercício (código) · Leitura de mapa de ruas em texto e Bellman-Ford com detecção de ciclo negativo** (`menor_tempo_de_viagem`, `bellman_ford`)
  5. **Quiz · Invariante do Dijkstra, tratamento de entradas obsoletas e falha com pesos negativos**

### n3-m7-06-arvore-geradora-minima-e-union-find · Árvore geradora mínima e union-find
- **Arquivo:** `07-grafos/06-arvore-geradora-minima-e-union-find.lvl.md` · 120 XP · 50 min
- **Passos (5):**
  1. **Leitura · Union-Find (compressão de caminho + união por tamanho), Kruskal, Prim e propriedade do corte** (Mermaid)
  2. **Exercício (código) · Classe `UnionFind` rápida ($10^5$ operações) e `conectividade_online`** (`UnionFind`, `conectividade_online`)
  3. **Exercício (código) · Algoritmos de `kruskal` e `prim` e agrupamento por corte das $k-1$ maiores arestas da MST** (`kruskal`, `prim`, `agrupar`)
  4. **Quiz · Propriedade do corte, compressão de caminho e diferença entre MST e menor caminho (Dijkstra)**

## Módulo 8 · Programação dinâmica e projeto

Memoização (*top-down*), programação dinâmica tabular (*bottom-up*), DP em strings (LCS, Levenshtein, `diff`), algoritmos gulosos vs DP e o **Projeto Final: Planejador de Rotas do Campus**.

### n3-m8-01-memoizacao · Memoização: recursão sem repetir trabalho
- **Arquivo:** `08-programacao-dinamica-e-projeto/01-memoizacao.lvl.md` · 110 XP · 45 min
- **Passos (6):**
  1. **Leitura · Subproblemas sobrepostos, subestrutura ótima, dicionário de memoização e falha do guloso no troco `[1, 3, 4]`** (Mermaid + KaTeX)
  2. **Previsão · Quantas chamadas `fib_memo(10)` faz em comparação com `fib_ingenuo(10)`?**
  3. **Exercício (lacunas) · Fibonacci memoizado com contagem de chamadas e degraus de escada** (`fib_memo`, `formas_de_subir`)
  4. **Exercício (código) · Caminhos em grade com obstáculos e troco mínimo para moedas arbitrárias** (`caminhos_na_grade`, `troco_minimo`)
  5. **Quiz · Subproblemas sobrepostos, chaves imutáveis no cache e limite de recursão**

### n3-m8-02-dp-tabular · Programação dinâmica tabular
- **Arquivo:** `08-programacao-dinamica-e-projeto/02-dp-tabular.lvl.md` · 130 XP · 55 min
- **Passos (5):**
  1. **Leitura · Ordem topológica de preenchimento, Mochila 0/1 (2D e 1D percorrendo capacidades ao contrário), Kadane e LIS** (Visualizar + KaTeX: $dp[i][w] = \max(dp[i-1][w], dp[i-1][w-p_i] + v_i)$)
  2. **Exercício (ordenar) · Mochila 0/1 em 1D ($O(W)$ de memória) percorrendo a capacidade de trás para frente** (`mochila_1d(pesos, valores, capacidade)`)
  3. **Exercício (código) · Mochila 0/1 com reconstrução dos itens, Kadane com índices e LIS em $O(n \log n)$ com `bisect`** (`mochila`, `soma_maxima_subarranjo`, `lis`)
  4. **Quiz · Por que percorrer $w$ decrescente na mochila 1D e como reconstruir escolhas**

### n3-m8-03-dp-em-strings · Programação dinâmica em strings
- **Arquivo:** `08-programacao-dinamica-e-projeto/03-dp-em-strings.lvl.md` · 120 XP · 50 min
- **Passos (5):**
  1. **Leitura · Subsequência Comum Mais Longa (LCS), Distância de Edição (Levenshtein), corretor ortográfico e `diff`** (Mermaid + Visualizar + KaTeX)
  2. **Exercício (código) · `lcs(a, b)` com reconstrução da string e `diff_linhas(antes, depois)`** (`lcs`, `diff_linhas`)
  3. **Exercício (código) · `distancia_edicao(a, b)` otimizada em memória (strings de $2\,000$ caracteres) e `sugerir_correcao`** (`distancia_edicao`, `sugerir_correcao`)
  4. **Quiz · Recorrência da LCS vs Levenshtein, linha/coluna 0 (string vazia) e complexidade $O(nm)$**

### n3-m8-04-gulosos-vs-dp · Algoritmos gulosos vs programação dinâmica
- **Arquivo:** `08-programacao-dinamica-e-projeto/04-gulosos-vs-dp.lvl.md` · 110 XP · 45 min
- **Passos (6):**
  1. **Leitura · Seleção de atividades (ordenar pelo término), mochila fracionária, codificação de Huffman e contraexemplos ao guloso** (Mermaid)
  2. **Previsão · Ordenar atividades pelo início vs pelo fim: onde o guloso ingênuo falha?**
  3. **Exercício (código) · Escalonamento máximo de intervalos e mochila fracionária** (`maximo_de_atividades`, `mochila_fracionaria`)
  4. **Exercício (código) · Codificação de Huffman determinística com heap e detector de contraexemplo no troco** (`huffman`, `troco_guloso_falha`)
  5. **Quiz · Classificando problemas entre Guloso, Programação Dinâmica e Backtracking**

### n3-m8-05-projeto-planejador-de-rotas · Projeto final: planejador de rotas do campus
- **Arquivo:** `08-programacao-dinamica-e-projeto/05-projeto-planejador-de-rotas.lvl.md` · projeto (`projeto: true`) · 300 XP · 240 min
- **Passos (8):**
  1. **Leitura · Especificação completa do Planejador de Rotas do Campus da USP** (Mermaid + tabela de requisitos funcionais e de desempenho)
  2. **Exercício (código) · Leitura e representação do mapa do campus** (`carregar_mapa(texto)`)
  3. **Exercício (código) · Menor rota com Dijkstra, reconstrução de caminho e filtro de acessibilidade ($2 \times 10^4$ nós)** (`menor_rota(mapa, origem, destino, apenas_acessivel=False)`)
  4. **Exercício (código) · Locais alcançáveis até $M$ minutos e top-$k$ locais mais próximos com heap** (`locais_a_ate(mapa, origem, minutos)`, `top_k_mais_proximos(mapa, origem, k)`)
  5. **Exercício (código) · Ordem de visitas com dependências (Kahn lexicográfico e erro em ciclo)** (`ordem_de_visitas(tarefas, dependencias)`)
  6. **Exercício (código) · Agenda ótima com orçamento de tempo (Mochila 0/1 com custo de deslocamento + duração)** (`agenda_otima(mapa, origem, tarefas, orcamento_min)`)
  7. **Exercício (código) · Componentes conexos e locais isolados no campus** (`componentes_isolados(mapa)`)
  8. **Quiz · Revisão arquitetural e escolhas de complexidade do projeto**
