# Plano do Nível 3 — Estruturas de dados e algoritmos

Este é o plano de autoria do Nível 3 da trilha **Python: do zero à IA**. Ele orienta a escrita das lições de `content/cursos/n3-estruturas-de-dados-e-algoritmos`. Cada lição traz: slug, título, objetivos, conceitos e a **sequência de passos, um a um**, com o tipo de cada passo (Leitura, Exercício — código, lacunas ou ordenar —, Previsão, Quiz), os recursos de apresentação (diagrama Mermaid, bloco `visualizar`, fórmula KaTeX) e, nos exercícios, as funções e classes pedidas.

**Estado:** os módulos 1 a 6 já foram escritos e auditados; as seções deles descrevem o conteúdo atual, e a fonte da verdade são os próprios `.lvl.md`. Os módulos 7 e 8 ainda seguem o roteiro original deste plano e precisam obedecer às regras gerais abaixo, que valem para o nível inteiro.

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
- **Visualizador (bloco `python visualizar`)** — para inspecionar o estado mudando passo a passo: algoritmo de Euclides, redimensionamento amortizado de lista dinâmica, pilha de chamadas na recursão e *backtracking* (`append`/`pop`), busca binária estreitando `[lo, hi)`, particionamento de Lomuto, troca de ponteiros ao inverter lista ligada, subir/descer no heap, relaxamento no Dijkstra e preenchimento de tabela DP. Até 60 linhas, autossuficiente e sem `input()`. Não pode ser a solução de um exercício da lição.
- **Fórmula (KaTeX)** — onde há expressão matemática ou recorrência: leis de De Morgan, inclusão-exclusão, combinações $\binom{n}{k}$, congruências $a \equiv b \pmod m$, somas de Gauss e geométrica, definição formal de $O(g(n))$, $\Omega(g(n))$ e $\Theta(g(n))$, recorrências e Teorema Mestre $T(n) = aT(n/b) + f(n)$, fator de carga $\alpha = n/m$ e equações de Bellman na programação dinâmica.
- **`modo: lacunas` e `modo: ordenar`** — andaime nas primeiras lições de cada módulo (exceto no projeto final `n3-m8-05`, que tem apenas exercícios de código livre).
- **Passo `Previsão`** — pelo menos um por módulo, com código determinístico, autossuficiente, sem `input()`, terminando sem erro e imprimindo de 1 a 20 linhas, acompanhado de `### Saída esperada`. As dicas não entregam a saída.
- **Imagem (`assets/`) e Vídeo** — nenhum neste nível.
- **Limites em todo passo:** até 3 dicas, que orientam sem entregar o código; exercício com **pelo menos 3 soluções erradas** (nos módulos 1–6 há de 3 a 9 por exercício, quase sempre 4 a 6), cada uma com um único defeito plausível, tirado dos erros reais de quem aprende — nada de espantalho como `return True`, `return []` ou a outra função do arquivo vazia; quiz com **3 perguntas**, cada uma com exatamente uma alternativa correta, distratores plausíveis e explicação (`> …`); leitura com ≥ 200 caracteres, sem exclamações e mostrando o erro comum com a mensagem real do Python.

### Verificação e convenções do nível

- **Custo verificado por contagem de operações, nunca por tempo.** Nenhum caso depende do relógio do executor (nem "roda $10^5$ elementos rápido"): a versão lenta costuma passar e o teste fica instável. Use, conforme o caso:
  - objetos com `__lt__`/`__eq__`/`__hash__` que contam comparações e hashes;
  - `list`/`str` instrumentadas que contam leituras (`__getitem__`) e cópias por fatia;
  - `property` instalada na classe do nó que conta leituras de `.proximo`, `.filhos` etc.;
  - `sys.setprofile` para contar chamadas recursivas e medir a profundidade; `sys.settrace` para contar linhas executadas;
  - `RecursionError` com o limite padrão para recusar recursão linear ou pivô fixo;
  - relógio injetado (`relogio=`, `timer=`) quando o assunto é a própria medição;
  - entradas de $10^{12}$ a $10^{18}$ com resultado inteiro exato, onde a força bruta é inviável.
- **Casos de teste:** um caso por asserção (nada de `expr` que junta várias numa tupla), com as bordas (vazio, um elemento, repetidos, negativos) e, para fórmulas, conferência contra a força bruta em entradas pequenas. Casos que podem cair num ciclo andam pelos nós com um limite, para a errada reprovar sem travar o executor.
- **Funções que alteram a estrutura no lugar devolvem `None`**, como `list.sort` e `list.reverse` (ex.: `inverter_no_lugar`, `selection_sort`, `quick_sort`, `heap_sort`). A exceção documentada é `bubble_sort`, que devolve o número de passagens. Funções que devolvem lista nova (`merge_sort`, `radix_sort`, `intercalar`) não alteram a entrada, e isso é verificado.
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
| 7 · Grafos | 6 | 6 | 2 | 2 | 1 | 1 | 16 | 2 | 0 |
| 8 · Programação dinâmica e projeto | 5 | 4 | 2 | 3 | 1 | 1 | 16 | 2 | 0 |
| **Total** | **39** | **39** | **24** | **76** | **23** | **9** | **93** | **25** | **0** |

Módulos 1–6: contagem do conteúdo atual (Mermaid e Visualizar = número de blocos). Módulos 7–8: previsão do roteiro original, a revisar quando forem escritos.

## Estrutura do nível

8 módulos · 39 lições (1 projeto de nível) · 33,7 h de lições (2020 min) + prova (1 h) · 4610 XP · prova com banco de 12 questões (10 por tentativa).

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
  1. **Leitura · Especificação completa do Planejador de Rotas do Campus** (Mermaid + tabela de requisitos funcionais e de desempenho)
  2. **Exercício (código) · Leitura e representação do mapa do campus** (`carregar_mapa(texto)`)
  3. **Exercício (código) · Menor rota com Dijkstra, reconstrução de caminho e filtro de acessibilidade ($2 \times 10^4$ nós)** (`menor_rota(mapa, origem, destino, apenas_acessivel=False)`)
  4. **Exercício (código) · Locais alcançáveis até $M$ minutos e top-$k$ locais mais próximos com heap** (`locais_a_ate(mapa, origem, minutos)`, `top_k_mais_proximos(mapa, origem, k)`)
  5. **Exercício (código) · Ordem de visitas com dependências (Kahn lexicográfico e erro em ciclo)** (`ordem_de_visitas(tarefas, dependencias)`)
  6. **Exercício (código) · Agenda ótima com orçamento de tempo (Mochila 0/1 com custo de deslocamento + duração)** (`agenda_otima(mapa, origem, tarefas, orcamento_min)`)
  7. **Exercício (código) · Componentes conexos e locais isolados no campus** (`componentes_isolados(mapa)`)
  8. **Quiz · Revisão arquitetural e escolhas de complexidade do projeto**
