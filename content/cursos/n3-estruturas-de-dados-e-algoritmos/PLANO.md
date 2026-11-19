# Plano do Nível 3 — Estruturas de dados e algoritmos

Este é o plano de autoria do Nível 3 da trilha **Python: do zero à IA**. Ele orienta a escrita das lições de `content/cursos/n3-estruturas-de-dados-e-algoritmos`. Cada lição traz: slug, título, objetivos, conceitos e a **sequência de passos, um a um**, com o tipo de cada passo (Leitura, Exercício — código, lacunas ou ordenar —, Previsão, Quiz), os recursos de apresentação (diagrama Mermaid, bloco `visualizar`, fórmula KaTeX) e, nos exercícios, as funções e classes pedidas.

**Estado:** os oito módulos estão escritos, publicados e auditados; as seções de cada lição descrevem o conteúdo atual, e a fonte da verdade são os próprios `.lvl.md`. As regras gerais abaixo valem para o nível inteiro e para qualquer revisão futura.

Formato dos arquivos: `content/README.md` (§3 inteira; recursos de apresentação em §3.5–§3.7) e `docs/v2/curso-e-passos.md` §6. Todas as 39 lições deste nível usam `runtime: python` (CPython 3.14 WASI no Wasmtime), implementando estruturas e algoritmos em Python puro e biblioteca padrão (`collections.deque`, `heapq`, `bisect`, `functools`).

## Como usar este plano

1. Abra o arquivo da lição (`content/cursos/n3-estruturas-de-dados-e-algoritmos/<módulo>/<NN>-<slug>.lvl.md`).
2. Mantenha o frontmatter (`slug`, `xp`, `tempo_min`, `runtime`, `bibliotecas`, `objetivos`) e mude `publicada` para `true`. Não renomeie arquivos nem slugs.
3. Substitua o passo de roteiro pelos passos **na ordem e com os tipos listados** na lição (`## Passo N · Leitura|Exercício|Previsão|Quiz · Título`).
4. Em cada exercício: `### Instruções` (lista numerada = checkpoints), `### Código inicial` (não existe no `modo: ordenar`), `### Solução`, `### Dicas` (até 3), `### Verificação` (JSON de `TestCase[]`) e `### Soluções erradas` (**pelo menos três**, uma por erro comum, cada uma com um defeito só).
5. Rode `pnpm content:check` (lint) e `pnpm content:verify --licao <slug>` com `RUNNER_URL=http://127.0.0.1:8081` e `RUNNER_TOKEN=dev-runner-token-0123456789abcdef`.

## Como usar os recursos de apresentação neste nível

O aluno do Nível 3 já domina Python intermediário (classes, métodos especiais, exceções, iteradores/geradores, decoradores e testes do Nível 2). Neste nível, a visualização e a matemática tornam palpáveis ponteiros, árvores, grafos, invariantes e complexidade assintótica.

### Regras

- **Diagrama (bloco `mermaid`)** — para árvores de decisão/recursão, ponteiros em listas ligadas e duplas (cache LRU), árvores binárias/BST/AVL/heaps/tries, grafos (representações, BFS, DFS, ordenação topológica, Dijkstra, MST) e grades de programação dinâmica. Use `flowchart` com no máximo ~8 nós e rótulos curtos em pt-BR; texto com parênteses, colchetes ou dois-pontos vai entre aspas.
- **Visualizador (bloco `python visualizar`)** — para inspecionar o estado mudando passo a passo: algoritmo de Euclides, redimensionamento amortizado de lista dinâmica, pilha de chamadas na recursão e *backtracking* (`append`/`pop`), busca binária estreitando `[lo, hi)`, particionamento de Lomuto, troca de ponteiros ao inverter lista ligada, subir/descer no heap, BFS num espaço de estados, o Dijkstra clássico errando com peso negativo e preenchimento de tabela DP. Até 60 linhas, autossuficiente e sem `input()`. Não pode ser a solução de um exercício da lição.
- **Fórmula (KaTeX)** — onde há expressão matemática ou recorrência: leis de De Morgan, inclusão-exclusão, combinações $\binom{n}{k}$, congruências $a \equiv b \pmod m$, somas de Gauss e geométrica, definição formal de $O(g(n))$, $\Omega(g(n))$ e $\Theta(g(n))$, recorrências e Teorema Mestre $T(n) = aT(n/b) + f(n)$, fator de carga $\alpha = n/m$ e equações de Bellman na programação dinâmica.
- **`modo: lacunas` e `modo: ordenar`** — andaime nas primeiras lições de cada módulo (exceto no projeto final `n3-m8-05`, que tem apenas exercícios de código livre).
- **Passo `Previsão`** — pelo menos um por módulo, com código determinístico, autossuficiente, sem `input()`, terminando sem erro e imprimindo de 1 a 20 linhas, acompanhado de `### Saída esperada`. As dicas não entregam a saída.
- **Imagem (`assets/`) e Vídeo** — nenhum neste nível.
- **Limites em todo passo:** até 3 dicas, que orientam sem entregar o código; exercício com **pelo menos 3 soluções erradas** (nos módulos 1–6 há de 3 a 9 por exercício, quase sempre 4 a 6; nos módulos 7–8, de 5 a 9), cada uma com um único defeito plausível, tirado dos erros reais de quem aprende — nada de espantalho como `return True`, `return []` ou a outra função do arquivo vazia; quiz com **3 perguntas**, cada uma com exatamente uma alternativa correta, distratores plausíveis e explicação (`> …`); leitura com ≥ 200 caracteres, sem exclamações e mostrando o erro comum com a mensagem real do Python.

### Verificação e convenções do nível

- **Custo verificado por contagem de operações, nunca por tempo.** Nenhum caso depende do relógio do executor (nem "roda $10^5$ elementos rápido"): a versão lenta costuma passar e o teste fica instável. Use, conforme o caso:
  - objetos com `__lt__`/`__eq__`/`__hash__` que contam comparações e hashes;
  - `list`/`str` instrumentadas que contam leituras (`__getitem__`), cópias por fatia e iterações (`__iter__` nas listas de adjacência: cada lista lida uma vez);
  - `property` instalada na classe do nó que conta leituras de `.proximo`, `.filhos` etc.;
  - `sys.setprofile` para contar chamadas recursivas e medir a profundidade; `sys.settrace` para contar linhas executadas; acima do limite, a contagem interrompe a execução com uma exceção derivada de `BaseException`, que o `except Exception` do aluno não engole;
  - `tracemalloc` para cobrar memória (mochila em uma linha, distância de edição em duas linhas);
  - caso `source` só quando o custo não é observável por contagem (ex.: `calls popleft` recusa `list.pop(0)` na BFS);
  - `RecursionError` com o limite padrão para recusar recursão linear ou pivô fixo;
  - relógio injetado (`relogio=`, `timer=`) quando o assunto é a própria medição;
  - entradas de $10^{12}$ a $10^{18}$ com resultado inteiro exato, onde a força bruta é inviável.
- **Casos de teste:** um caso por asserção (nada de `expr` que junta várias numa tupla), com as bordas (vazio, um elemento, repetidos, negativos) e, para fórmulas, conferência contra a força bruta em entradas pequenas. Casos que podem cair num ciclo andam pelos nós com um limite, para a errada reprovar sem travar o executor.
- **Funções que alteram a estrutura no lugar devolvem `None`**, como `list.sort` e `list.reverse` (ex.: `inverter_no_lugar`, `selection_sort`, `quick_sort`, `heap_sort`). A exceção documentada é `bubble_sort`, que devolve o número de passagens. Funções que devolvem lista nova (`merge_sort`, `radix_sort`, `intercalar`) não alteram a entrada, e isso é verificado.
- **Várias respostas ótimas:** quando há empate (caminho mínimo, itens da mochila, trecho de Kadane, LIS, LCS, edições, códigos de Huffman, ordem topológica por DFS), os casos validam a resposta (existe, é viável, tem o valor ótimo) em vez de fixar um desempate. Quando a ordem faz parte do contrato (BFS com o primeiro a descobrir, Kahn com fila ou heap, `kruskal` na ordem da lista, `sugerir_correcao`, `diff_linhas`, `mais_proximos`), o enunciado fixa o critério e ele é verificado.
- **Profundidade de recursão no executor:** a recursão Python pura vai até o limite padrão (cerca de 1 000) e dá `RecursionError` limpo, mas a recursão que passa pelo `functools.lru_cache` (uma camada em C a cada nível) derruba a instância WASI entre 250 e 330 níveis, com "Recursão profunda demais (estouro de pilha)". Casos com `lru_cache` ficam bem abaixo disso (grade de até 40 × 40; troco até 200), e entradas maiores vão para a versão tabular.
- **Exemplos neutros:** sem instituições, disciplinas ou domínios reais; nomes, preços e dados fictícios.

### Dosagem por módulo

| Módulo | Lições | Mermaid | Visualizar | Leituras com fórmula | Exercício (lacunas) | Exercício (ordenar) | Exercício (código) | Previsão | Imagens (assets) |
|---|---|---|---|---|---|---|---|---|---|
| 1 · Matemática discreta essencial | 5 | 3 | 3 | 16 | 5 | 1 | 10 | 3 | 0 |
| 2 · Análise de algoritmos | 4 | 3 | 3 | 10 | 1 | 2 | 10 | 3 | 0 |
| 3 · Recursão, backtracking e divisão e conquista | 4 | 4 | 4 | 9 | 2 | 1 | 9 | 3 | 0 |
| 4 · Busca e ordenação | 6 | 5 | 5 | 13 | 4 | 1 | 13 | 4 | 0 |
| 5 · Estruturas lineares | 4 | 5 | 3 | 9 | 4 | 1 | 9 | 4 | 0 |
| 6 · Árvores, heaps e tabelas hash | 5 | 9 | 2 | 14 | 5 | 1 | 10 | 4 | 0 |
| 7 · Grafos | 6 | 9 | 2 | 16 | 5 | 1 | 12 | 6 | 0 |
| 8 · Programação dinâmica e projeto | 5 | 4 | 1 | 12 | 2 | 1 | 14 | 5 | 0 |
| **Total** | **39** | **42** | **23** | **99** | **28** | **9** | **87** | **32** | **0** |

Contagem do conteúdo atual dos oito módulos (Mermaid e Visualizar = número de blocos; leituras com fórmula = passos de leitura com KaTeX). Nos módulos 7 e 8 toda lição tem 8 passos e exatamente uma Previsão, inclusive o projeto.

## Estrutura do nível

8 módulos · 39 lições (1 projeto de nível) · 33,7 h de lições (2020 min) + prova (1 h) · 4610 XP · prova com banco de 40 questões (10 por tentativa), na proporção das lições de cada módulo (5, 4, 4, 6, 4, 5, 6 e 6), com a alternativa correta 10 vezes em cada posição.

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

Lógica proposicional, quantificadores e indução, conjuntos/funções/relações, contagem e princípio da casa dos pombos, aritmética modular/primos e somatórios/logaritmos/crescimento. Toda fórmula de contagem e de soma é conferida contra a enumeração em casos pequenos.

### n3-m1-01-logica-e-provas · Lógica proposicional e provas
- **Arquivo:** `01-matematica-discreta-essencial/01-logica-e-provas.lvl.md` · 100 XP · 45 min
- **Passos (8):**
  1. **Leitura · Implicação, contrapositiva e De Morgan** (KaTeX: tabela-verdade, recíproca/contrapositiva/negação, prova pela contrapositiva de "$n^2$ par ⇒ $n$ par")
  2. **Exercício (lacunas) · Equivalências por força bruta** (`implicacao(p, q)`, `equivalentes(f, g)`)
  3. **Previsão · all, any e a lista vazia**
  4. **Leitura · Quantificadores e contraexemplos** (KaTeX: De Morgan para quantificadores, $n^2+n+41$, ∀∃ contra ∃∀)
  5. **Exercício (código) · Caçador de contraexemplos** (`primeiro_contraexemplo(predicado, inicio, fim)`, `para_todo_existe(xs, ys, relacao)`)
  6. **Leitura · Indução: base, hipótese e passo** (Mermaid + KaTeX; invariante de laço com `assert`)
  7. **Exercício (código) · Conferindo uma fórmula de soma** (`verificar_formula(formula, termo, ate)`, no máximo `ate` chamadas a `termo`)
  8. **Quiz · Implicação, quantificadores e indução**

### n3-m1-02-conjuntos-funcoes-e-relacoes · Conjuntos, funções e relações
- **Arquivo:** `01-matematica-discreta-essencial/02-conjuntos-funcoes-e-relacoes.lvl.md` · 100 XP · 40 min
- **Passos (7):**
  1. **Leitura · Inclusão-exclusão: contar a união sem contar duas vezes** (KaTeX: $|A \cup B \cup C|$; mmc e não produto)
  2. **Exercício (lacunas) · Múltiplos de a, b ou c** (`contar_multiplos(n, a, b, c)` com `math.lcm`, $n$ até $10^{18}$)
  3. **Leitura · Funções injetoras, sobrejetoras e bijetoras** (KaTeX; o `dict` invertido que perde chaves)
  4. **Exercício (código) · Classificar e inverter uma função finita** (`classificar_funcao(mapa, contradominio)`, `inversa(mapa, contradominio)` com `ValueError`)
  5. **Leitura · Relações de equivalência e de ordem** (Mermaid + KaTeX)
  6. **Exercício (código) · Propriedades de uma relação e classes de equivalência** (`propriedades(pares, elementos)`, `classes_de_equivalencia(pares, elementos)`)
  7. **Quiz · Funções, inversas e relações**

### n3-m1-03-contagem · Contagem: permutações, combinações e o princípio da casa dos pombos
- **Arquivo:** `01-matematica-discreta-essencial/03-contagem.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Regras da soma e do produto** (KaTeX; complemento e o erro "fixar a posição")
  2. **Previsão · Pares ordenados e pares sem ordem**
  3. **Leitura · Permutações, arranjos e combinações** (Visualizar + KaTeX: $\binom{n}{k} = \binom{n-1}{k-1} + \binom{n-1}{k}$; `float` contra `int`)
  4. **Exercício (lacunas) · Arranjos e combinações exatos** (`arranjos(n, k)`, `combinacoes(n, k)` sem `math.comb`/`math.perm`)
  5. **Exercício (código) · Anagramas e rotas do caixeiro-viajante** (`anagramas_distintos(palavra)`, `rotas_distintas(n)`)
  6. **Leitura · Casa dos pombos e explosão combinatória** (KaTeX: $M(k-1)+1$)
  7. **Exercício (código) · Complemento e casa dos pombos** (`senhas_com_digito(letras, digitos, k)`, `minimo_para_garantir(caixas, k)`)
  8. **Quiz · Escolher a fórmula certa**

### n3-m1-04-aritmetica-modular-e-primos · Aritmética modular, divisibilidade e primos
- **Arquivo:** `01-matematica-discreta-essencial/04-aritmetica-modular-e-primos.lvl.md` · 110 XP · 45 min
- **Passos (9):** sem Previsão; os restos negativos ficam na leitura 1, no `dia_da_semana` e no quiz.
  1. **Leitura · Resto, congruência e o % do Python** (KaTeX; `//` e `%` com negativos, dígito verificador do CPF)
  2. **Exercício (código) · CPF e dias da semana** (`digito_verificador_cpf(nove_digitos)`, `dia_da_semana(hoje, deslocamento)`)
  3. **Leitura · Euclides: por que funciona e quanto custa** (Visualizar + KaTeX: $\text{mdc}(a, b) = \text{mdc}(b, a \bmod b)$, prova nos dois sentidos e término)
  4. **Exercício (lacunas) · mdc e mmc** (`mdc(a, b)`, `mmc(a, b)`)
  5. **Leitura · Primos, o limite √n e o crivo de Eratóstenes** (Mermaid + KaTeX: $O(n \log \log n)$)
  6. **Exercício (código) · Crivo de Eratóstenes** (`crivo(n)` até $10^6$; linhas executadas contadas com `sys.settrace`)
  7. **Leitura · Exponenciação modular rápida** (KaTeX: $a^e \bmod m$, $\le 2b$ multiplicações)
  8. **Exercício (código) · pot_mod contando multiplicações** (`pot_mod(base, exp, mod)` sem `pow` de 3 argumentos; inteiro instrumentado, ≤ 20 multiplicações com expoente 1000)
  9. **Quiz · Restos, primos e potências**

### n3-m1-05-somatorios-logaritmos-e-crescimento · Somatórios, logaritmos e crescimento de funções
- **Arquivo:** `01-matematica-discreta-essencial/05-somatorios-logaritmos-e-crescimento.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Laços que viram somatórios** (KaTeX: $\sum_{i=1}^n i = \frac{n(n+1)}{2}$, $\sum_{k=0}^{m-1} r^k = \frac{r^m - 1}{r - 1}$; $n(n-1)/2$ contra $n(n+1)/2$)
  2. **Exercício (lacunas) · Contagens em forma fechada** (`pares_distintos(n)`, `triangulo(n)`, `soma_pg(a, r, k)`, exatos em $10^{12}$)
  3. **Leitura · log₂ n: quantas vezes dá para dividir por 2** (Visualizar + KaTeX; `int(math.log2(2**60 - 1))` erra)
  4. **Exercício (ordenar) · log2_inteiro por divisões** (`log2_inteiro(n)`)
  5. **Leitura · A hierarquia de crescimento** (KaTeX)
  6. **Previsão · Quem é menor?**
  7. **Exercício (código) · A partir de quando um algoritmo vence** (`a_partir_de(custo_a, custo_b, limite)`)
  8. **Quiz · Crescimento e logaritmos**

## Módulo 2 · Análise de algoritmos

Medição honesta de tempo (relógio injetado, `timeit`, dobrar a entrada contando operações), notação $O$/$\Omega$/$\Theta$, análise de laços, custos escondidos e recursões, e melhor/pior/médio caso, amortização e memória.

### n3-m2-01-medindo-tempo-de-execucao · Medindo tempo de execução
- **Arquivo:** `02-analise-de-algoritmos/01-medindo-tempo-de-execucao.lvl.md` · 90 XP · 35 min
- **Passos (8):** os exercícios usam relógio injetado ou contagens, nunca o relógio real.
  1. **Leitura · O relógio certo e o ruído** (Mermaid + KaTeX)
  2. **Previsão · Média, mediana e mínimo**
  3. **Exercício (lacunas) · A mediana de k medidas** (`medir(funcao, entrada, repeticoes=5, relogio=time.perf_counter)`)
  4. **Leitura · O módulo timeit**
  5. **Exercício (código) · Tempo por chamada com timeit** (`tempo_por_chamada(funcao, entrada, number=1000, repeat=5, timer=time.perf_counter)`)
  6. **Leitura · Dobrar a entrada e contar operações** (KaTeX: $k \approx \log_2 \frac{T(2n)}{T(n)}$)
  7. **Exercício (código) · O experimento de dobrar** (`experimento_de_dobra(contar, n0, vezes)`, `expoente_estimado(razao)`)
  8. **Quiz · Medir com honestidade**

### n3-m2-02-notacao-big-o · Notação Big-O
- **Arquivo:** `02-analise-de-algoritmos/02-notacao-big-o.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · A definição de O, com c e n₀** (KaTeX: $0 \le f(n) \le c \cdot g(n) \;\forall n \ge n_0$; $n^2$ não é $O(n)$)
  2. **Exercício (ordenar) · Procurando uma violação** (`primeira_violacao(f, g, c, n0, ate)`)
  3. **Exercício (código) · O menor n₀ para um c** (`menor_n0(f, g, c, limite)`)
  4. **Previsão · Para onde vai a razão f/g**
  5. **Leitura · Ω, Θ, e por que O não é "pior caso"** (Mermaid + KaTeX)
  6. **Exercício (código) · Termo dominante e as três relações** (`termo_dominante(termos)`, `relacoes(f, g)`, termos `[coef, a, b]` = $\text{coef} \cdot n^a (\log n)^b$)
  7. **Quiz · Teto, piso e casos**

### n3-m2-03-analise-de-lacos-e-recursoes · Análise de laços e recursões simples
- **Arquivo:** `02-analise-de-algoritmos/03-analise-de-lacos-e-recursoes.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Conte quantas vezes o corpo mais interno roda** (Visualizar + KaTeX; em sequência some, aninhados multiplique)
  2. **Previsão · Cinco contadores**
  3. **Exercício (código) · Fórmulas fechadas para quatro trechos** (`vezes_a(n)` a `vezes_d(n)`, sem laço; conferidas contra o trecho executado e em $n = 10^{12}$)
  4. **Leitura · O custo escondido numa linha só** (KaTeX; `in` em `list`, `insert(0, x)`, fatias, `s = s + t`)
  5. **Exercício (código) · Elementos em comum, sem custo escondido** (`comuns(a, b)`; `__eq__` contado)
  6. **Leitura · Recorrências: o custo de uma função recursiva** (Mermaid + KaTeX: $T(n) = T(n-1) + n$, $T(n) = 2T(n/2) + 1 = \Theta(n)$)
  7. **Exercício (código) · Recursão sem fatia e contas por expansão** (`soma_rec(lista, i=0)`, `copias_com_fatia(n)`, `chamadas_metades(n)`)
  8. **Quiz · Laços, linhas caras e recorrências**

### n3-m2-04-melhor-pior-e-medio-caso-e-memoria · Melhor, pior e caso médio; custo de memória
- **Arquivo:** `02-analise-de-algoritmos/04-melhor-pior-e-medio-caso-e-memoria.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Mesmo tamanho, custos diferentes** (KaTeX: caso médio com distribuição)
  2. **Exercício (código) · Contando comparações sob uma distribuição** (`comparacoes(lista, alvo)`, `media_de_comparacoes(lista, consultas)`, `esperado(n, p)`)
  3. **Leitura · Custo amortizado: por que append é O(1)** (Visualizar + KaTeX; a política real do CPython cresce cerca de 12,5 %, não dobra)
  4. **Exercício (código) · Simulando o vetor dinâmico** (`simular(n, crescer)`, `custo_amortizado(n, crescer)`)
  5. **Leitura · Espaço auxiliar, fatias e a pilha de recursão** (Visualizar + KaTeX; `RecursionError` real)
  6. **Exercício (ordenar) · Inverter no lugar com dois índices** (`inverter_no_lugar(lista)` → `None`; cópias por fatia contadas)
  7. **Exercício (código) · Recursão de pouca profundidade** (`maior_metades(lista, lo=0, hi=None)`, `profundidade_metades(n)`)
  8. **Quiz · Casos, amortização e memória**

## Módulo 3 · Recursão, backtracking e divisão e conquista

Caso base, progresso e confiança, limite de recursão e conversão para pilha explícita, *backtracking* com poda segura, divisão e conquista (busca binária, inversões, soma máxima) e Teorema Mestre.

### n3-m3-01-recursao-revisitada · Recursão revisitada
- **Arquivo:** `03-recursao-e-divisao-e-conquista/01-recursao-revisitada.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Caso base, progresso e confiança** (Visualizar)
  2. **Previsão · Duas chamadas por vez**
  3. **Exercício (lacunas) · Soma e profundidade de listas aninhadas** (`soma_aninhada(dado)`, `profundidade(dado)`)
  4. **Leitura · O limite de recursão e a recursão de cauda** (KaTeX; o CPython não otimiza cauda)
  5. **Exercício (código) · Índices no lugar de fatias** (`eh_palindromo(texto)`, `para_binario(n)`; fatias contadas por uma `str` instrumentada)
  6. **Leitura · Da recursão à pilha explícita** (Mermaid + Visualizar)
  7. **Exercício (código) · Achatar e medir sem recursão** (`achatar_iterativo(dado)`, `profundidade_iterativa(dado)`, 5 001 níveis com o limite padrão)
  8. **Quiz · Pilha, limite e casos base**

### n3-m3-02-backtracking · Backtracking: explorar e desfazer
- **Arquivo:** `03-recursao-e-divisao-e-conquista/02-backtracking.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Escolher, explorar, desfazer** (Mermaid + Visualizar)
  2. **Previsão · A mesma lista em todo lugar**
  3. **Exercício (lacunas) · Subconjuntos e permutações** (`subconjuntos(lista)`, `permutacoes(lista)`, sem `itertools`)
  4. **Leitura · O tamanho da árvore e a primeira poda** (KaTeX: $2^n$, $n!$, $\binom{n}{k}$)
  5. **Exercício (código) · Combinações com poda** (`combinacoes(lista, k)`; chamadas recursivas contadas com `sys.setprofile`)
  6. **Leitura · Poda segura: N rainhas e soma de subconjuntos** (KaTeX; a poda só é segura com positivos)
  7. **Exercício (código) · N rainhas e soma de subconjuntos** (`n_rainhas(n)`, `soma_subconjuntos(numeros, alvo)` com todas as respostas)
  8. **Quiz · Árvores, desfazer e poda**

### n3-m3-03-divisao-e-conquista · Divisão e conquista
- **Arquivo:** `03-recursao-e-divisao-e-conquista/03-divisao-e-conquista.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Dividir, conquistar e combinar** (Mermaid + KaTeX: $2T(n/2) + \Theta(1) = \Theta(n)$)
  2. **Exercício (código) · Máximo e busca binária recursivos** (`maximo_dc(lista)`, `busca_binaria_rec(lista, alvo, ini=0, fim=None)`)
  3. **Leitura · Intercalar e contar inversões** (Visualizar + KaTeX)
  4. **Exercício (ordenar) · Monte a intercalação** (`intercalar(a, b)`, sem alterar as entradas)
  5. **Exercício (código) · Contar inversões em n log n** (`contar_inversoes(lista)`; comparações contadas)
  6. **Leitura · Soma máxima: o que cruza a fronteira** (KaTeX)
  7. **Exercício (código) · Soma máxima por divisão e conquista** (`soma_maxima(v)`; somas contadas)
  8. **Quiz · Dividir, combinar e o custo**

### n3-m3-04-recorrencias-e-teorema-mestre · Recorrências e o Teorema Mestre
- **Arquivo:** `03-recursao-e-divisao-e-conquista/04-recorrencias-e-teorema-mestre.lvl.md` · 100 XP · 40 min
- **Passos (7):**
  1. **Leitura · Do código à recorrência** (Mermaid + KaTeX: $a^{\log_b n} = n^{\log_b a}$)
  2. **Exercício (código) · Trabalho por nível da árvore** (`trabalho_por_nivel(a, b, f, n)`)
  3. **Previsão · Quem domina a árvore**
  4. **Leitura · O Teorema Mestre e quando ele não se aplica** (KaTeX: $T(n) = aT(n/b) + \Theta(n^k \log^j n)$, regularidade, comparação exata $b^k$ contra $a$)
  5. **Exercício (código) · Classificador do Teorema Mestre** (`teorema_mestre(a, b, k, j=0)` → `(caso, e, p)` ou `None`)
  6. **Leitura · Expansão, árvore e substituição** (KaTeX)
  7. **Quiz · Montar, classificar e desconfiar**

## Módulo 4 · Busca e ordenação

Busca binária com invariantes (limite inferior/superior, primeira e última ocorrência, busca na resposta), ordenações elementares, merge sort (recursivo, *bottom-up* e $k$ listas), quick sort com Lomuto, pivô aleatório e partição em três vias, quickselect, `sorted`/`key`/Timsort e ordenações lineares.

### n3-m4-01-busca-linear-e-binaria · Busca linear e busca binária
- **Arquivo:** `04-busca-e-ordenacao/01-busca-linear-e-binaria.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · O invariante que impede o bug** (Visualizar + KaTeX: $\lfloor\log_2 n\rfloor+1$)
  2. **Previsão · lo, hi e meio quando o alvo não está**
  3. **Exercício (lacunas) · Busca binária iterativa** (`busca_binaria(lista, alvo)`; ≤ 50 leituras em $10^6$ elementos)
  4. **Leitura · Com repetidos: limite inferior e primeira ocorrência** (invariante semiaberto `[lo, hi)`)
  5. **Exercício (código) · Primeira e última ocorrência** (`limite_inferior(lista, x)`, `limite_superior(lista, x)`, `primeira_ocorrencia(lista, alvo)`, `ultima_ocorrencia(lista, alvo)`)
  6. **Leitura · Busca binária na resposta** (Mermaid + KaTeX)
  7. **Exercício (código) · Raiz inteira e capacidade do caminhão** (`raiz_inteira(n)` até $10^{30}$, `menor_capacidade(pesos, dias)`)
  8. **Quiz · Invariantes e escolhas**

### n3-m4-02-ordenacoes-elementares · Ordenações elementares: bolha, seleção e inserção
- **Arquivo:** `04-busca-e-ordenacao/02-ordenacoes-elementares.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · Três ideias, três invariantes** (Visualizar + KaTeX; estabilidade com `>` estrito)
  2. **Previsão · Duas voltas de cada**
  3. **Exercício (lacunas) · Seleção e inserção no lugar** (`selection_sort(lista)`, `insertion_sort(lista)` → `None`)
  4. **Leitura · Contando o trabalho: melhor caso, pior caso e inversões** (KaTeX: $\Theta(n + I)$)
  5. **Exercício (código) · Medindo os três** (`bubble_sort(lista)` → número de passagens, `contar_comparacoes_insertion(lista)`, `contar_trocas_selection(lista)`)
  6. **Exercício (código) · Ranking estável da turma** (`ranking(alunos)`)
  7. **Quiz · Qual algoritmo, e por quê**

### n3-m4-03-merge-sort · Merge sort
- **Arquivo:** `04-busca-e-ordenacao/03-merge-sort.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Intercalar com estabilidade** (`<=` contra `<`, caso base `== 1` e o `RecursionError`)
  2. **Exercício (lacunas) · Merge sort recursivo** (`intercalar(a, b)` estável, `merge_sort(lista)` → lista nova)
  3. **Leitura · De onde vem o n log n** (Mermaid + KaTeX: $n$ por nível × $\lceil\log_2 n\rceil$ níveis)
  4. **Previsão · A ordem das intercalações**
  5. **Leitura · Merge sort sem recursão (bottom-up)** (Visualizar + KaTeX)
  6. **Exercício (código) · merge_sort_bottom_up** (`merge_sort_bottom_up(lista)`; ausência de recursão medida com `sys.setprofile`)
  7. **Exercício (código) · Juntar k listas ordenadas** (`intercalar_k(listas)` em $\Theta(N \log k)$; comparações contadas)
  8. **Quiz · Custo, memória e estabilidade**

### n3-m4-04-quick-sort · Quick sort
- **Arquivo:** `04-busca-e-ordenacao/04-quick-sort.lvl.md` · 120 XP · 50 min
- **Passos (7):** não ensina Hoare; o remédio para muitos iguais é a partição em três vias.
  1. **Leitura · Partição de Lomuto e seu invariante** (Mermaid + Visualizar)
  2. **Exercício (ordenar) · Monte particionar** (`particionar(lista, lo, hi)`)
  3. **Exercício (código) · quick_sort no lugar** (`quick_sort(lista)` → `None`)
  4. **Leitura · O pior caso e o pivô aleatório** (KaTeX: $n(n-1)/2$, $\approx 1{,}39\,n\log_2 n$ esperado; `[7] * 3000` derruba Lomuto mesmo com sorteio)
  5. **Exercício (código) · Quick sort aleatorizado em três vias** (`particionar_3vias(v, lo, hi)`, `quick_sort_aleatorio(lista)` → `None`; `random.seed` no setup)
  6. **Exercício (código) · Quickselect: o k-ésimo menor** (`k_esimo_menor(lista, k)`, `k` a partir de 0, sem alterar a entrada; comparações contadas)
  7. **Quiz · Pivôs e escolhas**

### n3-m4-05-ordenacao-no-python · Ordenação no Python: sorted, key, estabilidade e Timsort
- **Arquivo:** `04-busca-e-ordenacao/05-ordenacao-no-python.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · sorted, .sort() e a chave** (KaTeX; tupla com sinal invertido contra `reverse=True`)
  2. **Previsão · Duas ordenações seguidas**
  3. **Exercício (código) · Vários critérios com key** (`ordenar_alunos(alunos)`, `ordenar_versoes(versoes)`, `ordenar_por_frequencia(palavras)`)
  4. **Leitura · Estabilidade em cadeia e o Timsort** (Mermaid + KaTeX; *runs*, galloping, powersort)
  5. **Exercício (código) · Autor decrescente, título crescente** (`ordenar_estante(livros)`, em duas passagens estáveis)
  6. **Leitura · Quando a ordem depende do par: cmp_to_key** (KaTeX)
  7. **Exercício (código) · O maior número concatenado** (`maior_numero_concatenado(numeros)`)
  8. **Quiz · sorted por dentro**

### n3-m4-06-ordenacoes-lineares · Ordenações em tempo linear: counting, bucket e radix
- **Arquivo:** `04-busca-e-ordenacao/06-ordenacoes-lineares.lvl.md` · 110 XP · 45 min
- **Passos (6):** sem Previsão; o bucket sort fica na leitura e no quiz.
  1. **Leitura · Por que comparar custa pelo menos n log n** (KaTeX: árvore de decisão, $n! \ge (n/2)^{n/2}$)
  2. **Leitura · Counting sort estável** (Visualizar + KaTeX: $\Theta(n + k)$; `cont[-1]` não falha em Python)
  3. **Exercício (lacunas) · counting_sort com chaves negativas** (`counting_sort(registros)`, sem parâmetro `k`: o intervalo vem da menor e da maior chave)
  4. **Leitura · Radix sort LSD e bucket sort** (Mermaid + KaTeX)
  5. **Exercício (código) · Radix sort e CEPs** (`radix_sort(lista)`, `ordenar_ceps(ceps)` com CEPs como texto; os dois devolvem lista nova)
  6. **Quiz · Quando ordenar sem comparar**

## Módulo 5 · Estruturas lineares

Pilhas (delimitadores, posfixa, *shunting-yard*, desfazer/refazer), filas, fila circular, `deque` e deque monotônica, listas ligadas simples (cabeça e cauda, dois ponteiros) e listas duplamente ligadas com sentinelas e cache LRU.

### n3-m5-01-pilhas · Pilhas
- **Arquivo:** `05-estruturas-lineares/01-pilhas.lvl.md` · 110 XP · 45 min
- **Passos (8):** a conversão de recursão em pilha explícita é praticada no m3-01; aqui ela é explicada e cobrada no quiz.
  1. **Leitura · LIFO no fim da list e delimitadores balanceados** (Mermaid + Visualizar + KaTeX)
  2. **Exercício (lacunas) · Classe Pilha e balanceado** (`Pilha` com `empilhar`, `desempilhar`, `topo`, `vazia`, `__len__`; `balanceado(texto)` usando a classe)
  3. **Leitura · Notação posfixa e shunting-yard** (KaTeX; o primeiro `pop()` é o operando direito)
  4. **Exercício (código) · Avaliar posfixa** (`avaliar_rpn(tokens)`, `ValueError` para expressão malformada)
  5. **Exercício (código) · De infixa para posfixa** (`infixa_para_posfixa(tokens)`, `^` associativo à direita)
  6. **Previsão · Duas pilhas: desfazer e refazer**
  7. **Exercício (código) · Editor com desfazer e refazer** (`editor(comandos)` com `ESCREVER`/`APAGAR`/`DESFAZER`/`REFAZER`)
  8. **Quiz · Pilhas no lugar certo**

### n3-m5-02-filas-e-deque · Filas e deque
- **Arquivo:** `05-estruturas-lineares/02-filas-e-deque.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · FIFO e o custo escondido de list.pop(0)** (KaTeX: $n(n-1)/2$)
  2. **Previsão · As duas pontas, maxlen e rotate**
  3. **Leitura · Fila circular: arranjo fixo e índices módulo n** (Mermaid + Visualizar + KaTeX)
  4. **Exercício (lacunas) · FilaCircular** (`FilaCircular(capacidade)` com `enfileirar`, `desenfileirar`, `vazia`, `cheia`, `para_lista`, `__len__`)
  5. **Exercício (código) · Round-robin e Josephus com deque** (`round_robin(processos, quantum)`, `josephus(n, k)`)
  6. **Leitura · Máximo em janela deslizante com deque monotônica** (KaTeX)
  7. **Exercício (código) · maximo_janela em O(n)** (`maximo_janela(lista, k)`, `ValueError` com `k < 1`; comparações contadas)
  8. **Quiz · Fila certa para cada problema**

### n3-m5-03-listas-ligadas · Listas ligadas simples
- **Arquivo:** `05-estruturas-lineares/03-listas-ligadas.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Nós, referências e o custo de cada operação** (Mermaid + KaTeX)
  2. **Previsão · A ordem das atribuições**
  3. **Exercício (lacunas) · ListaLigada com cabeça e cauda** (`No(valor, proximo=None)`, `ListaLigada` com `inserir_inicio`, `inserir_fim` em O(1), `buscar` → nó ou `None`, `__len__`, `__iter__`; leituras de `.proximo` contadas)
  4. **Exercício (código) · Inserir após, remover e inverter** (Visualizar; `inserir_apos(no, valor)`, `remover(valor)`, `inverter()` no lugar)
  5. **Leitura · Dois ponteiros: ciclo de Floyd e k-ésimo do fim** (KaTeX)
  6. **Exercício (ordenar) · Monte o detector de ciclo** (`tem_ciclo(cabeca)`)
  7. **Exercício (código) · k-ésimo do fim e intercalação** (`k_esimo_do_fim(cabeca, k)`, `intercalar(a, b)` reaproveitando os nós)
  8. **Quiz · Ponteiros na prática**

### n3-m5-04-listas-duplamente-ligadas-e-lru · Listas duplamente ligadas e cache LRU
- **Arquivo:** `05-estruturas-lineares/04-listas-duplamente-ligadas-e-lru.lvl.md` · 120 XP · 50 min
- **Passos (7):**
  1. **Leitura · Nó duplo e sentinelas** (Mermaid + KaTeX)
  2. **Exercício (lacunas) · ListaDupla com sentinelas** (`NoDuplo`, `ListaDupla` com `inserir_frente`, `inserir_tras`, `remover_no(no)`, `para_lista`, `para_lista_reversa`, `__len__`)
  3. **Exercício (código) · Mover para a frente e remover o último** (`mover_para_frente(no)`, `remover_ultimo()` com `IndexError` na lista vazia; leituras de `.proximo` contadas)
  4. **Leitura · Cache LRU: dicionário + lista dupla** (Mermaid + KaTeX; `OrderedDict` e `lru_cache`)
  5. **Previsão · lru_cache por dentro**
  6. **Exercício (código) · CacheLRU** (`CacheLRU(capacidade)` com `get(chave)` → valor ou `None`, `put(chave, valor)`, `chaves()`, `__len__`; ≤ 3 `__eq__` de chave por operação, sem `OrderedDict` nem `lru_cache`)
  7. **Quiz · Sentinelas e política de despejo**

## Módulo 6 · Árvores, heaps e tabelas hash

Árvores binárias e percursos (recursivos e iterativos), árvores de busca binária e sua degeneração, heaps em lista e `heapq`, tabelas hash com encadeamento e endereçamento aberto, AVL, rubro-negras/B-trees (descrição) e tries.

### n3-m6-01-arvores-binarias-e-percursos · Árvores binárias e percursos
- **Arquivo:** `06-arvores-e-tabelas-hash/01-arvores-binarias-e-percursos.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Uma estrutura definida por ela mesma** (Mermaid + KaTeX: $\lfloor\log_2 n\rfloor \le h \le n-1$; altura da vazia é $-1$)
  2. **Exercício (lacunas) · Tamanho, altura, folhas e espelho** (`No(valor, esq=None, dir=None)`, `tamanho`, `altura`, `contar_folhas`, `espelhos(a, b)`, `eh_simetrica`)
  3. **Leitura · Percursos: quando a raiz é visitada** (KaTeX)
  4. **Previsão · Três percursos na mesma árvore**
  5. **Exercício (código) · Pós-ordem, em-ordem com pilha e por níveis** (`pos_ordem(raiz)`, `em_ordem_iterativa(raiz)`, `por_niveis(raiz)` → lista de níveis; correntes de 5 000 nós)
  6. **Leitura · Árvores de expressão e reconstrução** (Mermaid)
  7. **Exercício (código) · Avaliar, escrever e reconstruir** (`avaliar(raiz)`, `para_infixa(raiz)`, `reconstruir(pre, em)`)
  8. **Quiz · Percursos e formas**

### n3-m6-02-arvores-de-busca-binaria · Árvores de busca binária
- **Arquivo:** `06-arvores-e-tabelas-hash/02-arvores-de-busca-binaria.lvl.md` · 130 XP · 55 min
- **Passos (8):** sem Previsão (única do módulo).
  1. **Leitura · A propriedade de busca e o caminho de uma consulta** (Mermaid + KaTeX)
  2. **Exercício (lacunas) · Inserir e buscar** (`No`, `inserir(raiz, valor)` → raiz, `buscar(raiz, valor)` → `bool`, sem recursão)
  3. **Leitura · Validar: olhar os filhos não basta** (Mermaid + KaTeX)
  4. **Exercício (ordenar) · Monte eh_bst com intervalos** (`eh_bst(raiz)`)
  5. **Leitura · Remover em três casos** (Mermaid + KaTeX)
  6. **Exercício (código) · Remover com os três casos** (`remover(raiz, valor)` → raiz, com o sucessor em-ordem)
  7. **Exercício (código) · A BST que virou lista** (`nos_visitados(raiz, valor)`, `ordem_balanceada(chaves)`, `custo_total(ordem)`)
  8. **Quiz · Busca, validação e remoção**

### n3-m6-03-heaps-e-filas-de-prioridade · Heaps e filas de prioridade
- **Arquivo:** `06-arvores-e-tabelas-hash/03-heaps-e-filas-de-prioridade.lvl.md` · 120 XP · 50 min
- **Passos (8):** o heap é uma lista comum com funções (sem classe `MinHeap`).
  1. **Leitura · Um heap cabe numa lista** (Mermaid + KaTeX: $\text{pai}(i)=\lfloor(i-1)/2\rfloor$)
  2. **Previsão · Cinco inserções e uma extração**
  3. **Exercício (lacunas) · subir e descer** (`subir(h, i)`, `descer(h, i, n)`, `inserir(h, x)`, `extrair_min(h)`)
  4. **Leitura · Heapify em O(n) e heap sort no lugar** (KaTeX: $\sum k\,n/2^{k+1} = n$)
  5. **Exercício (código) · construir_heap e heap_sort** (`construir_heap(v)` com ≤ $2n$ comparações, `heap_sort(v)` no lugar, crescente, → `None`)
  6. **Leitura · heapq, desempate e top-k** (KaTeX; o `TypeError` de `dict` no empate)
  7. **Exercício (código) · Agenda, top-k e fusão com heapq** (`FilaDePrioridade` com `inserir(prioridade, item)` e `remover()`, `k_maiores(valores, k)`, `fundir(fontes, m)` sob demanda)
  8. **Quiz · Escolhas com heaps**

### n3-m6-04-tabelas-hash · Tabelas hash do zero
- **Arquivo:** `06-arvores-e-tabelas-hash/04-tabelas-hash.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Do hash ao compartimento** (Mermaid + KaTeX; contrato `a == b ⇒ hash(a) == hash(b)`)
  2. **Previsão · Chaves que se confundem e chaves que somem** (`1`/`True`/`1.0`, `__eq__` sem `__hash__`, chave mutável)
  3. **Exercício (lacunas) · TabelaHash com encadeamento** (`TabelaHash(capacidade_inicial=8)` com `put`, `get(chave, padrao=None)`, `delete`, `__len__`)
  4. **Leitura · Fator de carga, redimensionamento e hashes ruins** (KaTeX: $\alpha = n/m$)
  5. **Exercício (código) · Redimensionar e uma chave composta** (`_redimensionar()`, `Ponto(x, y)` imutável com `__eq__`/`__hash__`; hashes e `__eq__` contados)
  6. **Leitura · Endereçamento aberto e a lápide** (Visualizar + KaTeX)
  7. **Exercício (código) · TabelaHashAberta com lápide** (`TabelaHashAberta(capacidade=8)` com `put`/`get`/`delete`; `put` em tabela cheia levanta `RuntimeError`)
  8. **Quiz · Tabelas hash na prática**

### n3-m6-05-arvores-balanceadas-e-tries · Árvores balanceadas e tries
- **Arquivo:** `06-arvores-e-tabelas-hash/05-arvores-balanceadas-e-tries.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Fator de balanceamento e rotações** (Mermaid + KaTeX: $h \le 1{,}44\log_2(n+2)$)
  2. **Exercício (lacunas) · Rotações** (`NoAVL`, `altura_no`, `atualizar_altura`, `fator_balanceamento`, `rotacao_direita(y)`, `rotacao_esquerda(x)`)
  3. **Leitura · Os quatro casos da inserção** (Visualizar + KaTeX)
  4. **Exercício (código) · balancear e a classe AVL** (`balancear(no)`, `AVL` com `inserir`, `altura`, `em_ordem`; altura exata 9 para 1023 chaves crescentes)
  5. **Previsão · Sete inserções numa AVL**
  6. **Leitura · Rubro-negras, B-trees e tries** (Mermaid + KaTeX)
  7. **Exercício (código) · Trie e autocompletar** (`Trie` com `inserir`, `contem`, `com_prefixo`; `autocompletar(trie, prefixo, k)`; leituras de `filhos` contadas)
  8. **Quiz · Balancear, paginar e completar**

## Módulo 7 · Grafos

Lista e matriz de adjacência, grafos implícitos e leitura de grafos em texto; BFS (distâncias, predecessores, grades, espaços de estados e múltiplas fontes); DFS iterativa na ordem da recursiva, componentes, ciclos com três cores e bipartição; ordenação topológica (Kahn, pós-ordem invertida, desempate por heap, mínimo de semestres e o ciclo como resposta); Dijkstra com entradas obsoletas, Bellman-Ford e A*; union-find, Kruskal, Prim e agrupamento. Convenções do módulo: todo vértice é chave do dicionário, inclusive o isolado; no grafo não direcionado cada aresta aparece nas duas listas e o laço `(a, a)` duas vezes na lista de `a`; o grafo ponderado é `vértice → lista de (vizinho, peso)`, o mesmo formato no Dijkstra e no Prim; buscas que podem passar de ~1 000 níveis são iterativas, e os casos têm correntes de 3 000 a 5 000 vértices que estouram a recursão.

### n3-m7-01-representacao-de-grafos · Representação de grafos
- **Arquivo:** `07-grafos/01-representacao-de-grafos.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Vértices, arestas e o que eles modelam** (Mermaid + KaTeX: $\sum \text{grau}(v) = 2|E|$, com o laço somando 2; `KeyError` do isolado e `dict.fromkeys(vertices, [])`)
  2. **Exercício (lacunas) · construir_grafo e graus** (`construir_grafo(vertices, arestas, direcionado=False)`, `graus(grafo)`, `graus_de_entrada(grafo)`, com 0 para quem não recebe arestas)
  3. **Leitura · Lista, matriz e grafo implícito** (KaTeX: tabela de custos, $V(V-1)/2$, esparso × denso; `[[0] * n] * n`, `vertices.index` no laço e o índice $-1$ que dá a volta na grade)
  4. **Previsão · A matriz que mudou sozinha** (`[[0] * n] * n` contra a compreensão; `defaultdict` que cria a chave ao ler)
  5. **Exercício (código) · Converter e consultar** (`lista_para_matriz(grafo, vertices)` com `m[i][j]` contando arestas, `matriz_para_lista(matriz, vertices)` mantendo paralelas e isolados, `vizinhos_na_grade(grade, i, j)` na ordem cima, baixo, esquerda, direita; vértices com `__eq__` contado: ≤ 1 000 comparações para 400 vértices)
  6. **Leitura · Do texto ao grafo** (`split()` contra `split(" ")`, `int` contra `float` e as mensagens reais do 3.14; `setdefault` para o destino da aresta direcionada)
  7. **Exercício (código) · Ler o grafo de um texto** (`ler_grafo(texto, direcionado=False)` → `vértice → lista de (vizinho, peso)` com peso `float`; `mais_conectados(grafo)` → todos os empatados, em ordem alfabética)
  8. **Quiz · Escolhas de representação**

### n3-m7-02-bfs-e-menor-caminho · BFS e menor caminho sem pesos
- **Arquivo:** `07-grafos/02-bfs-e-menor-caminho.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Camadas a partir da origem** (Mermaid + KaTeX; marcar ao enfileirar, `pop()` e `list.pop(0)` como erros, $O(V + E)$)
  2. **Previsão · A ordem da fila** (estado da fila a cada rodada e as saídas da versão que marca ao desenfileirar)
  3. **Exercício (lacunas) · BFS com distâncias e predecessores** (`bfs(grafo, origem)` → `(dist, pred)` só com os alcançáveis; empate: vale o primeiro a descobrir; cada lista de adjacência lida uma vez num grafo completo, por `list` com `__iter__` contado; um caso `source` recusa `list.pop(0)`)
  4. **Leitura · Por que a BFS acha o menor caminho** (KaTeX: $\text{dist}(v) = \text{dist}(\text{pred}(v)) + 1$; reconstrução sem recursão)
  5. **Exercício (código, continuação) · Reconstruir o menor caminho** (`menor_caminho(grafo, origem, destino)` → lista ou `None`; corrente de 3 001 vértices)
  6. **Leitura · Grades, estados e várias fontes** (Visualizar: BFS nos jarros de 3 e 5 litros + KaTeX; BFS de múltiplas fontes)
  7. **Exercício (código) · Labirinto, palavras e várias fontes** (`passos_no_labirinto(grade)` com `S` e `E`, `escada_de_palavras(inicio, fim, palavras)`, `distancia_ao_mais_proximo(grade)` com os postos `P`; ≤ $6 \cdot RC$ leituras de linha numa grade 60 × 60)
  8. **Quiz · Camadas, filas e caminhos**

### n3-m7-03-dfs-componentes-e-ciclos · DFS, componentes conexos e detecção de ciclos
- **Arquivo:** `07-grafos/03-dfs-componentes-e-ciclos.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Descer até não dar mais** (Mermaid + KaTeX; `RecursionError` e as duas regras da iterativa: vizinhos invertidos e marcar ao desempilhar)
  2. **Exercício (lacunas) · DFS iterativa na ordem da recursiva** (`dfs_ordem(grafo, origem)` sem recursão; corrente de 5 001 vértices)
  3. **Leitura · Componentes e ciclos** (Mermaid do losango + KaTeX: $E = V - C$; ignorar o pai no não direcionado, três cores no direcionado)
  4. **Previsão · Branco, cinza e preto**
  5. **Exercício (código) · Componentes e ciclos** (`componentes(grafo)` iterativa, `tem_ciclo_nao_direcionado(grafo)` com laço e paralelas contando como ciclo, `tem_ciclo_direcionado(grafo)` com três cores, que pode ser recursiva)
  6. **Leitura · Duas cores e regiões** (Mermaid pessoas × projetos; ciclo ímpar; ilhas e o `TypeError` de atribuir em `str`)
  7. **Exercício (código) · Bipartição e ilhas** (`eh_bipartido(grafo)` e `contar_ilhas(grade)` com `#` para terra, sem recursão; ilha em serpente de 5 050 casas em 101 × 100)
  8. **Quiz · Profundidade, ciclos e duas cores**

### n3-m7-04-ordenacao-topologica · Ordenação topológica
- **Arquivo:** `07-grafos/04-ordenacao-topologica.lvl.md` · 110 XP · 45 min
- **Passos (8):** sem lacunas (única do módulo); o andaime é o `ordenar` do Kahn, cuja ordem é determinística e conferida exatamente.
  1. **Leitura · Tarefas com dependências** (Mermaid das roupas + KaTeX; Kahn com grau de entrada, ciclo pelo tamanho da ordem e quatro erros)
  2. **Exercício (ordenar) · Monte o algoritmo de Kahn** (`ordem_topologica(grafo)` → lista ou `None`; 2 linhas sobrando)
  3. **Previsão · A pós-ordem ao contrário**
  4. **Leitura · Pós-ordem invertida e desempate pelo menor** (KaTeX: $O((V + E)\log V)$ com heap contra $O(V^2)$ com `min()`)
  5. **Exercício (código) · Pós-ordem invertida e ordem pelo menor** (`ordem_topologica_dfs(grafo)`, qualquer ordem válida, conferida aresta a aresta; `ordem_lexicografica(grafo)` com heap; `str` com `__lt__` contado: ≤ 30 000 comparações em 1 000 vértices)
  6. **Leitura · Semestres, planilhas e o ciclo como resposta** (KaTeX: $\text{sem}(d) = 1 + \max \text{sem}(p)$; a BFS que dá o caminho mais curto)
  7. **Exercício (código) · Mínimo de semestres e o ciclo** (`minimo_de_semestres(prerequisitos)` com `disciplina → pré-requisitos`, `-1` com ciclo; `encontrar_ciclo(grafo)` → ciclo fechado como `["b", "c", "d", "b"]` ou `None`)
  8. **Quiz · Ordens, ciclos e aplicações**

### n3-m7-05-dijkstra · Dijkstra: menor caminho com pesos
- **Arquivo:** `07-grafos/05-dijkstra.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Relaxar arestas** (Mermaid + KaTeX; heap de `(distância, vértice)`, entradas obsoletas e três erros)
  2. **Exercício (lacunas) · Dijkstra com heapq** (`dijkstra(grafo, origem)` → distâncias dos alcançáveis; paralelas com pesos diferentes; cada lista lida uma vez num grafo com 200 entradas obsoletas)
  3. **Previsão · Entradas obsoletas no heap**
  4. **Leitura · Por que funciona e o caminho** (KaTeX: invariante do vértice extraído, $O((V + E)\log V)$; predecessor gravado a cada melhora)
  5. **Exercício (código, continuação) · Caminho mínimo com pesos** (`caminho_minimo(grafo, origem, destino)` → `(custo, caminho)` ou `None`; empate aceito pelo custo; corrente de 3 001 vértices)
  6. **Leitura · Pesos negativos, Bellman-Ford e A\*** (Visualizar: Dijkstra clássico contra a força bruta + KaTeX: $O(V \cdot E)$; o Dijkstra "preguiçoso" do módulo perde a garantia de custo e não termina com ciclo negativo)
  7. **Exercício (código) · Bellman-Ford e um mapa em texto** (`bellman_ford(vertices, arestas, origem)` com triplas, `None` só para ciclo negativo alcançável; `menor_tempo_de_viagem(texto, origem, destino)` com linhas `origem;destino;minutos` e `ValueError` para tempo negativo; `rotas.py` traz o `dijkstra`)
  8. **Quiz · Pesos, heaps e garantias**

### n3-m7-06-arvore-geradora-minima-e-union-find · Árvore geradora mínima e union-find
- **Arquivo:** `07-grafos/06-arvore-geradora-minima-e-union-find.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Conjuntos que se fundem** (Mermaid da floresta + KaTeX: união por tamanho, $\lfloor \log_2 n \rfloor$, compressão, $\alpha(n)$; quatro erros)
  2. **Exercício (lacunas) · UnionFind com compressão e tamanho** (`UnionFind(n)` com `encontrar`, `unir` → `bool`, `conectados`, `conjuntos`, `tamanho`; altura ≤ 10 com 1 024 elementos unidos em corrente nos dois sentidos; ≤ 700 000 leituras de `pai` em 81 920 buscas, contra 1,31 milhão sem compressão)
  3. **Previsão · Compressão e união por tamanho**
  4. **Leitura · Kruskal e a propriedade do corte** (Mermaid, custo 14 + KaTeX; `sorted(arestas)` que ordena por `u`)
  5. **Exercício (código) · Kruskal e arestas redundantes** (`kruskal(n, arestas)` → `(custo, escolhidas)` ou `None` se desconexo, empates na ordem da lista; `arestas_redundantes(n, arestas)`; `uf.py` traz a `UnionFind`)
  6. **Leitura · Prim e agrupamento** (KaTeX: $d^2$; prioridade é o peso da aresta, não a distância acumulada)
  7. **Exercício (código) · Prim e agrupamento** (`prim(grafo, inicio)` → custo do componente; `agrupar(pontos, k)` com pontos `(x, y)` e $d^2$ inteiro, unindo até restarem `k` grupos)
  8. **Quiz · Conectar barato e agrupar**

## Módulo 8 · Programação dinâmica e projeto

Memoização (o estado, a chave completa e `lru_cache`), programação dinâmica tabular (troco, mochila 0/1 em 2D e 1D com reconstrução, Kadane e LIS em $O(n \log n)$), DP em strings (LCS, distância de edição, lista de edições, corretor e diff), guloso × DP (seleção de atividades, mochila fracionária, Huffman, troco canônico) e o **Projeto Final: Planejador de Rotas do Campus**, num campus fictício. A reconstrução da solução (moedas, itens, subsequência, edições, códigos) é sempre cobrada, e não só o valor ótimo.

### n3-m8-01-memoizacao · Memoização: recursão sem repetir trabalho
- **Arquivo:** `08-programacao-dinamica-e-projeto/01-memoizacao.lvl.md` · 110 XP · 45 min
- **Passos (8):** sem `fib_memo` (o Fibonacci memoizado já está no nível 2 e no m3); a escada e o troco fazem o papel dele.
  1. **Leitura · O mesmo subproblema, muitas vezes** (Mermaid da árvore de $f(4)$ + KaTeX: custo = estados × trabalho, recorrência do troco; o guloso que erra com 1, 3 e 4)
  2. **Previsão · O que o dicionário lembra** (`formas` com dicionário global e contador de chamadas)
  3. **Exercício (lacunas) · formas_de_subir com um dicionário** (`formas_de_subir(n, passos)` com a auxiliar `contar(resta)`; ≤ 1 000 chamadas com 200 degraus e passos `[1, 2, 3]`)
  4. **Leitura · Estados com dois parâmetros e lru_cache** (KaTeX; chave incompleta, `caminhos(2, 2)` dá 7; `TypeError: unhashable type: 'list'`; cache na função interna; `cache_info()`)
  5. **Exercício (código) · Caminhos na grade com lru_cache** (`caminhos_na_grade(grade)` com `@lru_cache` numa função interna; grades de até 40 × 40; ≤ 2 000 chamadas em 18 × 18)
  6. **Leitura · Troco mínimo: o valor e as moedas** (KaTeX; `None` para o impossível, reconstrução pela moeda guardada, `RecursionError` com valores grandes)
  7. **Exercício (código) · troco_minimo com as moedas escolhidas** (`troco_minimo(moedas, valor)` → lista em ordem decrescente, `[]` para 0 e `None` se impossível; valores até 200; ≤ 1 500 chamadas com valor 180)
  8. **Quiz · Quando e como memoizar**

### n3-m8-02-dp-tabular · Programação dinâmica tabular
- **Arquivo:** `08-programacao-dinamica-e-projeto/02-dp-tabular.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Da recursão à tabela** (Visualizar: troco bottom-up com 1, 3 e 4 + KaTeX: $dp[i][w] = \max(dp[i-1][w],\ dp[i-1][w - p_i] + v_i)$; por que $w$ decrescente na versão 1D; custo pseudo-polinomial)
  2. **Exercício (ordenar) · mochila_1d com uma linha só** (`mochila_1d(pesos, valores, capacidade)`; 2 linhas sobrando; `tracemalloc` < 1 000 000 bytes com 80 itens e capacidade 2 500)
  3. **Leitura · Quais itens entraram** (KaTeX: tabela 4 × 8 percorrida à mão; guloso pela razão com (6, 30), (5, 20), (5, 20))
  4. **Exercício (código) · mochila com os itens escolhidos** (`mochila(pesos, valores, capacidade)` → `(valor, itens)` com índices crescentes; itens validados; ≤ 250 000 linhas com 60 itens e capacidade 400)
  5. **Leitura · Kadane e a subsequência crescente** (KaTeX: $e_i = \max(x_i, e_{i-1} + x_i)$; caudas com `bisect_left`; caudas não são a LIS)
  6. **Previsão · As caudas da LIS**
  7. **Exercício (código) · Kadane com índices e LIS em O(n log n)** (`soma_maxima_subarranjo(v)` → `(soma, inicio, fim)`, ≤ 60 000 linhas em 5 000 elementos; `lis(v)` → lista estritamente crescente, ≤ 60 000 comparações em 3 000 elementos)
  8. **Quiz · Tabelas na prática**

### n3-m8-03-dp-em-strings · Programação dinâmica em strings
- **Arquivo:** `08-programacao-dinamica-e-projeto/03-dp-em-strings.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · A subsequência comum mais longa** (Mermaid da volta + KaTeX: recorrência da LCS; prefixo vazio e o `IndexError` real; +1 sobre o máximo)
  2. **Exercício (lacunas) · lcs com reconstrução** (`lcs(a, b)` → string; qualquer LCS vale, conferida como subsequência das duas e pelo tamanho)
  3. **Leitura · Distância de edição** (KaTeX: recorrência com as três operações, $D[i][0] = i$ e $D[0][j] = j$, $n + m - 2\,\text{LCS}$ sem troca; duas linhas e o `atual[0]`)
  4. **Previsão · A tabela de sal para asa**
  5. **Exercício (código) · Distância com duas linhas e a lista de edições** (`distancia_edicao(a, b)` com `tracemalloc` < 500 000 bytes em 600 × 600; `edicoes(a, b)` → tuplas `("manter"|"trocar"|"remover"|"inserir", …)`, conferidas aplicando as operações)
  6. **Leitura · Corretor e diff** (KaTeX: LCS de sufixos; `>=` que remove antes de acrescentar; `difflib.ndiff` e `SequenceMatcher`)
  7. **Exercício (código) · sugerir_correcao e diff_linhas** (`sugerir_correcao(palavra, dicionario, limite=2)` com desempate alfabético; `diff_linhas(antes, depois)` com prefixos `"  "`, `"- "`, `"+ "`; `edicao.py` traz a `distancia_edicao`)
  8. **Quiz · Strings e tabelas**

### n3-m8-04-gulosos-vs-dp · Algoritmos gulosos vs programação dinâmica
- **Arquivo:** `08-programacao-dinamica-e-projeto/04-gulosos-vs-dp.lvl.md` · 110 XP · 45 min
- **Passos (8):** sem lacunas nem ordenar (as três lições anteriores do módulo têm o andaime).
  1. **Leitura · Escolher o que termina primeiro** (KaTeX; critérios que falham, argumento de troca, mochila fracionária, `>=` dos pedidos que se encostam)
  2. **Previsão · Começo ou fim**
  3. **Exercício (código) · Atividades e mochila fracionária** (`maximo_de_atividades(pedidos)` em ordem de fim; `mochila_fracionaria(itens, capacidade)` → `(valor_total, fracoes)` na ordem dos itens)
  4. **Leitura · Códigos de Huffman** (Mermaid da árvore + KaTeX; `TypeError` real do empate no heap, ordenar uma vez só, código montado ao contrário)
  5. **Exercício (código) · huffman** (`huffman(frequencias)` → dicionário de códigos; verifica-se custo e ausência de prefixo, não os bits; um símbolo vira `"0"`)
  6. **Leitura · Quando o guloso falha, e como escolher** (KaTeX; sistema canônico, limite de Kozen e Zaks na soma das duas maiores moedas, comparar quantidades e não listas; tabela guloso → DP → backtracking/branch-and-bound → heurísticas)
  7. **Exercício (código) · O guloso do troco e o contraexemplo** (`troco_guloso(moedas, valor)` e `contraexemplo_troco(moedas)` → menor valor em que o guloso perde ou `None`; as moedas sempre incluem 1)
  8. **Quiz · Guloso, DP ou busca**

### n3-m8-05-projeto-planejador-de-rotas · Projeto final: planejador de rotas do campus
- **Arquivo:** `08-programacao-dinamica-e-projeto/05-projeto-planejador-de-rotas.lvl.md` · projeto (`projeto: true`) · 300 XP · 240 min
- **Formato:** cada exercício escreve o `main.py` e recebe prontas, em arquivos à parte, as funções dos passos anteriores: `campus.txt` (12 locais e 14 caminhos, com um local isolado e um alcançável só por caminho não acessível), `mapa.py` (o `carregar_mapa` de referência) e `rotas.py` (`distancias(mapa, origem)`). As erradas trocam só o `main.py`, e um erro de um passo antigo não derruba o novo. O mapa é o dicionário `{"tipos": …, "vizinhos": …}` com tuplas `(vizinho, minutos, acessivel)`; não há classe `Mapa`. Custo cobrado por linhas executadas (`sys.settrace`) numa grade de 3 600 locais, e uma corrente de 20 000 locais confere que nada depende de recursão profunda. 84 casos e 41 erradas no total.
- **Passos (8):**
  1. **Leitura · O que você vai construir** (Mermaid do sistema; formato do arquivo, tabela das funções e critérios)
  2. **Previsão · O heap do Dijkstra** (entradas velhas ignoradas)
  3. **Exercício (código) · carregar_mapa** (`carregar_mapa(texto)`; `ValueError` com `linha N:` para comando, campos, local repetido ou desconhecido, minutos e acessibilidade inválidos)
  4. **Exercício (código) · menor_rota** (`menor_rota(mapa, origem, destino, apenas_acessivel=False)` → `(minutos, caminho)` ou `None`; `ValueError` com `local desconhecido`; ≤ 300 000 linhas na grade)
  5. **Exercício (código) · alcancaveis e mais_proximos** (`alcancaveis(mapa, origem, limite)` e `mais_proximos(mapa, origem, k, tipo)` → tuplas `(minutos, local)` por minutos e nome; param cedo: ≤ 5 000 linhas por consulta)
  6. **Exercício (código) · ordem_de_visitas** (`ordem_de_visitas(tarefas, dependencias)`: Kahn com heap, menor ordem alfabética; `ValueError` com `ciclo` ou `desconhecida`; dependência repetida vale uma vez)
  7. **Exercício (código) · agenda_otima** (`agenda_otima(mapa, origem, tarefas, orcamento)` → `(prioridade_total, nomes)`: mochila 0/1 com custo `2 * distância + duracao`; ≤ 400 000 linhas com 40 tarefas numa grade de 225 locais)
  8. **Quiz · Autoavaliação**
