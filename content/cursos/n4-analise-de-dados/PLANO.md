# Plano do Nível 4 — Análise de dados

Este é o plano de autoria do Nível 4 da trilha **Python: do zero à IA**. Ele orienta a escrita das lições de `content/cursos/n4-analise-de-dados`. Cada lição traz: slug, título, a **sequência de passos, um a um**, com o tipo de cada passo (Leitura, Exercício — código, lacunas ou ordenar —, Previsão, Quiz), os recursos de apresentação (diagrama Mermaid, bloco `visualizar`, fórmula KaTeX) e, nos exercícios, as funções pedidas.

**Estado:** a lição piloto `n4-m1-01-arrays-e-vetorizacao` está escrita, publicada e verificada; as outras 30 são stubs com o frontmatter completo e um passo "Roteiro da lição". As seções de cada lição abaixo partem desse roteiro e o **corrigem** onde ele contraria a régua (as correções estão marcadas com "Muda do roteiro"). Depois de escrita, a fonte da verdade passa a ser o `.lvl.md`: se este plano e uma lição divergirem, vale a lição, e o plano é que precisa ser corrigido.

Formato dos arquivos: `content/README.md` (§3 inteira; recursos de apresentação em §3.5–§3.7; `python-dados` em §6) e `docs/v2/curso-e-passos.md` §6. Todas as 31 lições usam `runtime: python-dados` (Pyodide no executor), com as bibliotecas do frontmatter.

## Como usar este plano

1. Abra o arquivo da lição (`content/cursos/n4-analise-de-dados/<módulo>/<NN>-<slug>.lvl.md`).
2. Mantenha o frontmatter (`slug`, `titulo`, `descricao`, `xp`, `tempo_min`, `dificuldade`, `tipo`, `runtime`, `bibliotecas`, `objetivos`) e troque `publicada: false` por `publicada: true` quando a lição estiver verificada. Não renomeie arquivos nem slugs.
3. Substitua o passo de roteiro pelos passos **na ordem e com os tipos listados** na lição (`## Passo N · Leitura|Exercício|Previsão|Quiz · Título`).
4. Em cada exercício: `### Instruções` (lista numerada = checkpoints), `### Código inicial` (não existe no `modo: ordenar`), `### Solução`, `### Dicas` (até 3), `### Verificação` (JSON de `TestCase[]`) e `### Soluções erradas` (**pelo menos cinco**, uma por erro comum, cada uma com um defeito só).
5. Rode, em `apps/api`, com `RUNNER_URL=http://127.0.0.1:8081` e `RUNNER_TOKEN=dev-runner-token-0123456789abcdef`:
   - `pnpm -s content:check`;
   - `pnpm -s content:verify --licao <slug>` (uma lição por vez; ver os tempos em "O executor");
   - `pnpm -s content:metrics --curso n4-analise-de-dados` (a lição escrita não pode sair "suspeita").
6. Confira que cada solução errada reprova **pelo motivo pretendido**, e não por um efeito colateral (o `content:verify` só diz que reprovou; para ver quais casos falharam, rode `verifyStep` de `apps/api/scripts/content/verify.ts` num script de rascunho fora do repositório e imprima `result.cases` de cada errada).

## Quem é o aluno

Concluiu os Níveis 1 a 3. Do Nível 1: tipos, laços, coleções, compreensões, funções, strings, `try/except` e leitura de traceback. Do Nível 2: classes e `dataclasses`, módulos, exceções próprias, arquivos (`csv`, `json`, `pathlib`), geradores, decoradores, `unittest`, type hints. Do Nível 3: matemática discreta (contagem, somatórios, logaritmos), análise de algoritmos e **medição honesta de tempo** (relógio injetado, mediana de repetições, dobrar a entrada), recursão, busca e ordenação (`sorted` estável, `key`), pilhas, filas, heaps, tabelas hash, grafos e programação dinâmica.

Nunca usou numpy, pandas, matplotlib nem scipy, e não viu estatística além de média. Cada lição usa só o que os níveis anteriores e as lições anteriores deste nível ensinaram, na ordem dos módulos 1 a 7.

### O que o nível usa e o que não usa

- **Usa:** numpy (m1 em diante), pandas (m2 em diante), matplotlib (m5 e projeto), scipy.stats (m6 e projeto), scikit-learn só como primeira aparição de `fit`/`predict` na m6-08 (gancho para o Nível 5). Biblioteca padrão quando ajuda (`io.StringIO`, `unicodedata`, `math`).
- **Não usa:** rede (nada de `read_csv("https://…")`), Excel (`openpyxl` não existe no executor; o nível não ensina Excel), `pyarrow`, seaborn, plotly, statsmodels (existe no executor, mas fica para o Nível 5), Jupyter (o `%timeit` aparece como texto), `np.random.seed`/`np.random.rand` (o gerador legado), `apply(axis=1)` como solução, laço Python como solução onde o assunto é vetorizar.
- **Ponte com o Nível 3:** custo de laço contra operação vetorizada (m1-01), quickselect e `argpartition` (citados na m1-02), ordenação estável e desempate (m1-02, m2-03), tabelas hash e junções (m3-05), medição honesta (m1-01, m2-04).
- **Ponte com o Nível 5:** padronização (m1-01, m1-03), equação normal (m1-04), vazamento de imputação entre treino e teste (m3-01), `get_dummies` e `LinearRegression` (m6-08).

## Como usar os recursos de apresentação neste nível

### Régua (a mesma do Nível 1 e dos PLANOs auditados)

- **Passos por lição:** 7 ou 8 (o projeto tem 8). Abre com uma Leitura que motiva o assunto com um problema concreto e fecha com um Quiz de **3 perguntas de cenário** (uma situação com dados, código ou decisão; nada de definição decorada), cada uma com exatamente uma alternativa correta, distratores tirados de erros reais e explicação (`> …`) que diz por que cada distrator falha.
- **Leituras:** 250 a 350 palavras de prosa (sem contar blocos de código), com pelo menos um bloco de código ilustrativo e, quando há um erro comum, a mensagem **real** do executor (lista em "Mensagens reais"). Sem exclamações.
- **Previsão:** pelo menos uma por lição, antes de a leitura explicar o comportamento (alinhamento por índice, `axis`, vista contra cópia, `NaN` nas contas, `ddof`). Código determinístico, até 20 linhas de saída.
- **Andaime:** o primeiro exercício de cada lição que estreia uma construção nova é `modo: lacunas` ou `modo: ordenar`; os seguintes são de código livre. O projeto (m7) só tem código livre. Em `lacunas`, a solução é idêntica ao código inicial fora dos `___`, e as soluções erradas são **erros que cabem nas lacunas** (o aluno não reescreve o resto).
- **Exercícios:** 6 a 12 casos por exercício, verificando **comportamento** (`expr`/`call`), um comportamento por caso, com as bordas (vazio, um elemento, valores iguais, `NaN`, empate, limite exato); `source` só para cobrar o "como" que é o assunto do passo. Pelo menos **5 soluções erradas** reais, cada uma com um único defeito (nada de espantalho como `return None`, `return df` sem mudar nada ou a outra função vazia). O código inicial reprova. `name` em todo caso; `hint` que orienta sem entregar; `reveal` falso.
- **Dicas:** até 3 por passo; apontam o caminho (qual eixo some, o que o `dtype` faz), nunca o código.
- **Exemplos neutros:** nada de USP, IME, códigos reais de disciplina, instituições, empresas, sistemas ou pesquisas reais, e **nenhum dado real de pessoas** (nada de PNAD, censo ou cadastros). **Única exceção: o projeto do nível (m7)** usa uma amostra pequena dos microdados públicos e anonimizados do ENEM (INEP), com a fonte citada na lição (decisão do Filipe, 2026-11-16). Lojas, estações meteorológicas, sensores, cidades e alunos são fictícios; números são gerados ou inventados de forma plausível. Conjuntos clássicos sem pessoas (quarteto de Anscombe) podem aparecer.
- **Imagem (`assets/`) e Vídeo:** nenhum neste nível. As figuras do matplotlib são descritas em texto e verificadas por propriedades.

### Recursos

- **Diagrama (bloco `mermaid`):** para processos e estruturas: regras de broadcasting (m1-03), largo → longo (m3-04), as quatro junções (m3-05), dividir-aplicar-combinar (m4-01), Figure → Axes → artistas (m5-01), a árvore do teste diagnóstico (m6-01), a lógica do teste de hipótese (m6-06) e o fluxo do projeto. `flowchart` com no máximo ~8 nós, rótulos curtos; texto com parênteses, colchetes ou dois-pontos entre aspas.
- **Visualizador (bloco `python visualizar`):** pode usar numpy e pandas desde o `8ec2a1b` (o player instala as `bibliotecas` da lição antes de rastrear, como o Executar). Use-o para estado que muda passo a passo: o laço que a vetorização substitui (m1-01), a recorrência da fila (m1-05), uma máscara sendo montada, um `groupby` à mão. Evite bibliotecas do perfil `ml` (scipy, matplotlib) no bloco: o navegador baixa os pacotes na primeira vez. Até 60 linhas, sem `input()`, não pode ser a solução de um exercício.
- **Fórmula (KaTeX):** escore $z$, distância euclidiana, produto escalar, cosseno, equação normal $X^\top X \beta = X^\top y$, erro padrão $\sigma/\sqrt{n}$, regras de probabilidade e Bayes, esperança e variância, intervalos $t$ e de Wilson, estatística $t$ de Welch, $d$ de Cohen, qui-quadrado, correlação, $R^2$ e $R^2$ ajustado, VIF. Dinheiro no texto é `R\$`.

## Verificação e convenções do nível

Tudo nesta seção foi conferido no executor do compose (`RUNNER_URL=http://127.0.0.1:8081`) durante o piloto, em 2026-11-16.

### O executor

- **Versões:** Python 3.14.2 (Pyodide 314.0.7), numpy 2.4.6, pandas 3.0.2, scipy 1.18.0, matplotlib 3.10.8 (backend `agg`), scikit-learn 1.8.0; statsmodels presente. Sem `pyarrow`, sem `openpyxl`, sem rede.
- **Perfis e tempo de espera:** `bibliotecas` só com numpy e pandas usa o perfil `dados`, que tem um worker quente: um lote (a verificação de um aluno) leva de 0,05 a 0,5 s. Qualquer uma de scipy, matplotlib ou scikit-learn usa o perfil `ml`, que no compose de dev **não tem worker quente** (`RUNNER_PYODIDE_WARM=dados:1,ml:0`): cada lote sobe um worker novo e leva **~9,5 s** mesmo com `x = 1` (boot medido em `/v1/stats`: ~11 s; a execução em si leva milissegundos). O boot não conta no limite de 10 s do lote. Por isso: `scipy` só entra no frontmatter das lições que usam `scipy` de fato (no m6, as lições que só usam numpy podem continuar com `scipy` no frontmatter, mas o aluno vai esperar ~10 s por verificação — decisão do Filipe, abaixo).
- **Tempos do `content:verify`:** cada solução errada é um lote. No piloto (3 exercícios, 20 lotes, perfil `dados`), 30 a 106 s por passo, dominados pela fila de boot de workers (política `fresh`: cada lote consome um worker). Em lições `ml` de rascunho (1 exercício, 1 errada), ~32 s (matplotlib) e ~33 s (scipy) por passo. Duas lições `ml` verificadas juntas falharam uma vez com `executor: fetch failed` depois de ~5 min (vários boots de ~1,3 GB disputando os 4 GB do contêiner); a mesma lição, sozinha, passou. Verifique **uma lição por vez** (`--licao`) e, nas lições `ml`, rode o comando em segundo plano: com 5 a 7 erradas por exercício, uma lição passa facilmente de 2 minutos.
- **Um caso, um `main.py` novo:** cada caso roda o `main.py` do aluno de novo, num namespace novo (variáveis não vazam entre casos), **mas os módulos importados são compartilhados dentro do lote**. Verificado: o estado global do `np.random` legado continua de um caso para o outro (o segundo `np.random.rand()` depois de `np.random.seed(1)` num caso anterior sai `0.7203…`), e as figuras abertas do pyplot se acumulam (5 figuras abertas depois de 3 casos). Consequências na seção "Regras".
- **Inteiro padrão de 32 bits:** no executor, `np.array([1, 2]).dtype`, `np.arange(3).dtype` e `np.zeros(2, dtype=int).dtype` são `int32` (WebAssembly de 32 bits); no computador do aluno costumam ser `int64`. As colunas inteiras do pandas são `int64`. A m1-01 explica isso uma vez.
- **Sem avisos de ponto flutuante:** `np.log(0.0)` dá `-inf`, `np.sqrt(-1.0)` dá `nan` e `np.array([1.0]) / 0` dá `inf` **sem** `RuntimeWarning` no executor; o estouro de inteiro também é silencioso (`int8`: 100 + 100 = -56). O texto pode citar o aviso "no seu computador", mas nenhum caso depende dele.
- **Serialização do retorno:** `call` e `expr` só comparam tipos nativos (`int`, `float`, `str`, `bool`, `list`, `tuple`, `dict`, `None`). Um `ndarray`, `DataFrame`, `Series`, `Timestamp`, `np.int32`/`np.int64` ou `np.bool_` chega como `{"$repr": "…"}` e **nunca** bate com o esperado. `np.float64` chega como número, mas com o tipo `numpy.float64`: falha num caso com `"type": "float"`. `NaN` chega como `{"$float": "nan"}`.
- **Vetorização no executor (medida no piloto, 5 rodadas):** converter 1 milhão de temperaturas leva 39–54 ms com compreensão de lista e 2,5–9,6 ms com numpy; a razão variou de 6 a 16, com a primeira rodada sempre a mais baixa. Com 10 elementos a ordem se inverte (~1 µs contra ~5 µs). Um teste "razão > 5" teria passado por pouco na primeira rodada: é a prova de que tempo não serve de critério.

### Regras de verificação

1. **Nunca por tempo.** Nenhum caso mede o relógio do executor nem impõe "roda $10^6$ linhas rápido". O roteiro de várias lições pedia isso e muda: m1-01 (`comparar_tempo(n)` com razão > 5 vira leitura com números medidos + pergunta de quiz), m1-03 (`matriz_de_distancias` com limite de tempo), m1-05 (laço de $10^6$ simulações) e m2-04 (`apply(axis=1)` com $10^6$ linhas). A **medição** é ensinada na leitura (com `perf_counter`, mediana de repetições, `timeit.repeat`, `%timeit` em texto) e na Previsão ou no quiz; quando um exercício precisa medir, o relógio é injetado como no Nível 3 (`relogio=time.perf_counter`).
2. **Vetorização cobrada pela estrutura, resultado cobrado pelo comportamento.** Use `source` com `not_uses` `for` **e** `not_uses` `list_comprehension` (e `while` quando couber): a regra `for` **não** pega compreensões (verificado: a errada com compreensão passou no caso `sem-for` e só reprovou no `sem-compreensao`). No pandas, `not_calls` `apply` (ou `iterrows`, `itertuples`) quando o assunto é trocar o `apply` por operação vetorizada; na m1-04, `not_calls` `polyfit`, `lstsq` e `inv` conforme o passo. Lembre que `getattr`, `eval` e afins fazem qualquer `not_uses` falhar. Uma errada "laço" deve ter o resultado certo e reprovar **só** no `source`.
3. **Arrays:** a função devolve `ndarray` (a API natural) e os casos usam `expr`:
   - valores: `f(...).tolist()` com `expected` e `tolerance` (a tolerância é absoluta e vale elemento a elemento em listas aninhadas; use `1e-9` para contas exatas e `1e-12` para `linspace`);
   - forma: `list(f(...).shape)`;
   - tipo: `"type": "ndarray"` (no `expr`, casa pelo sufixo `numpy.ndarray`; no `call` o tipo é comparado por igualdade e precisaria de `numpy.ndarray`, então prefira `expr`);
   - `dtype`: `str(r.dtype)` só para `float64`, `bool` ou um inteiro pedido pelo nome no enunciado (`np.int64`); para "algum inteiro", `r.dtype.kind` (`"i"`). Nunca compare o inteiro padrão pelo nome (`int32` aqui, `int64` no aluno).
   - Escalares: quando a função devolve um número, o enunciado pede `float(...)`/`int(...)`/`bool(...)` e o caso usa `"type"`; `np.allclose` e `np.all` devolvem `np.bool_`, que precisa de `bool(...)`.
4. **DataFrames e Series:** nunca `pd.testing.assert_frame_equal` nem `np.allclose` contra o gabarito **dentro** do executor. Verificado: a mensagem do `AssertionError` traz os valores `[left]` e `[right]`, que o aluno veria na falha, e o esperado passaria pelo executor (invariante 1 do projeto: o executor só recebe entradas). Quebre em casos que devolvem tipos nativos e compare na API:
   - `list(df.columns)`, `len(df)`, `df.index.tolist()`;
   - `df.dtypes.astype(str).to_dict()` (no pandas 3 o texto é `str`, as datas são `datetime64[us]`, as dummies são `bool`);
   - `df.to_dict("list")` ou `df.to_dict("records")` com `tolerance`;
   - datas por `df["d"].dt.strftime("%Y-%m-%d").tolist()` (um `Timestamp` chega como `$repr`);
   - ausentes por `df["c"].isna().tolist()` (ou `{"$float": "nan"}` no esperado);
   - categorias por `df["c"].astype(str).tolist()` e `list(df["c"].cat.categories)`.
   **Propriedades** calculadas no executor podem ser `expr` booleano, porque não carregam gabarito: média padronizada ≈ 0, matriz simétrica com diagonal zero, soma das proporções de cada linha = 1, entrada intacta.
5. **Não alterar a entrada:** todo exercício que recebe um array ou um DataFrame tem um caso que passa um objeto `float` e lê esse objeto depois da chamada. `np.asarray(x, dtype=float)` **não copia** um array que já é `float64` (`x -= …` altera o do chamador); `a[mascara] = v` altera no lugar. No pandas 3 (Copy-on-Write), mexer numa seleção não altera o original, mas `df["c"] = …` dentro da função altera o DataFrame recebido: o enunciado diz se a função devolve uma tabela nova (o padrão) ou altera a recebida.
6. **Aleatoriedade e simulação:**
   - sempre `rng = np.random.default_rng(semente)` dentro da função (ou um `rng` recebido); o PCG64 dá a mesma sequência em qualquer máquina (`default_rng(42).random()` vale `0.7739560485559633` no executor e no computador do aluno);
   - **nunca** `np.random.seed`: além de legado, o estado global vaza entre os casos do lote;
   - casos: (a) mesma semente, mesmo resultado; (b) sementes diferentes, resultados diferentes; (c) o valor comparado com o **valor teórico** e tolerância de pelo menos 5 erros padrão da simulação (para uma proporção, $5\sqrt{p(1-p)/n}$), nunca com a saída exata da referência, porque duas soluções corretas consomem o gerador em ordens diferentes; (d) o estado global intacto (`setup` com `np.random.seed(0); a = np.random.random(); np.random.seed(0); f(...)` e `expr` `np.random.random() == a`), que recusa quem chama `np.random.seed` dentro da função;
   - no máximo $10^6$ sorteios por caso;
   - **separe o sorteio da regra:** quando o resultado depende de uma recorrência (fila, passeio), uma função sorteia (`gerar_chegadas(lam, minutos, semente)`) e outra aplica a regra a uma entrada fixa (`simular_fila(chegadas, capacidade)`), verificada com valores exatos. Laço é aceito na função da regra, quando cada passo depende do anterior; a leitura explica por quê.
7. **Gráficos (m5, m7) — propriedades, não pixels:**
   - a função cria a figura com `fig, ax = plt.subplots(...)` e devolve `(fig, ax)` (ou `fig` nos painéis); todo `setup` começa com `plt.close("all")`, porque as figuras persistem entre casos do lote;
   - título e rótulos: `ax.get_title()`, `ax.get_xlabel()`, `ax.get_ylabel()`, `fig.get_suptitle()`;
   - linhas: `len(ax.lines)`, `ax.lines[i].get_ydata().tolist()` (num `serie.plot()` com índice de datas o eixo x vira `Period`: confira só o y);
   - barras: `[float(p.get_height()) for p in ax.patches]` (as alturas chegam como `np.int32` quando os dados são inteiros) e `[t.get_text() for t in ax.get_xticklabels()]` para a ordem;
   - histograma: `len(ax.patches)` = número de `bins`; dispersão: `len(ax.collections)` e `ax.collections[0].get_offsets().tolist()`; boxplot: `[t.get_text() for t in ax.get_xticklabels()]` (o parâmetro é `tick_labels`; `labels` está obsoleto no matplotlib 3.10) e 7 linhas por caixa em `ax.lines`;
   - escala e limites: `ax.get_yscale()`, `float(ax.get_ylim()[0])`;
   - legenda: `[t.get_text() for t in ax.get_legend().get_texts()]` (sem legenda, `get_legend()` é `None` e o caso levanta `AttributeError`: escreva um `hint`); anotações e textos: `[t.get_text() for t in ax.texts]`;
   - painéis: `len(fig.axes)`, `[a.get_title() for a in fig.axes]`;
   - arquivo salvo: `open(caminho, "rb").read(8) == b"\x89PNG\r\n\x1a\n"`.
   `plt.show()` não quebra nada (só escreve `UserWarning: FigureCanvasAgg is non-interactive, and thus cannot be shown` no stderr); a m5-01 explica.
8. **Dados sem rede:** arquivos pequenos (até ~200 linhas) entram como `text path=vendas.csv`; tabelas maiores são geradas por um arquivo `.py` determinístico da lição (`dados_<tema>.py`, com `default_rng` e semente fixa) ou no `setup`. Um CSV em `latin-1` é escrito em bytes pelo `setup` (`open("v.csv", "wb").write(texto.encode("latin-1"))`), porque os arquivos da lição são texto UTF-8. CSV embutido no próprio código usa `io.StringIO`.
9. **`call` ou `expr`:** `call` para funções com argumentos JSON e retorno nativo (probabilidades, quantis, `prever_shape`); `expr` com `setup` para tudo que recebe ou devolve array, DataFrame ou figura.
10. **Um comportamento por caso**, com as bordas: vazio, um elemento, valores todos iguais (desvio zero), `NaN`, empate (regra do menor índice, como no Nível 3), limite exato (`>=` contra `>`, `include_lowest`), matriz não quadrada (para o `axis` trocado reprovar).

### Mensagens reais (conferidas no executor)

Use exatamente estas, sem o traceback:

| Situação | Mensagem |
|---|---|
| `a[a > 0 and a < 5]`, `if array:` | `ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()` |
| `np.ones((3, 2)) + np.ones(3)` | `ValueError: operands could not be broadcast together with shapes (3,2) (3,) ` |
| `np.arange(6).reshape(4, 2)` | `ValueError: cannot reshape array of size 6 into shape (4,2)` |
| `np.ones((2, 3)).sum(axis=2)` | `AxisError: axis 2 is out of bounds for array of dimension 2` |
| `np.zeros(3, 4)` | `TypeError: Cannot interpret '4' as a data type` |
| `math.sqrt(array)`, `float(array)` | `TypeError: only 0-dimensional arrays can be converted to Python scalars` |
| `[1, 2, 3].mean()` | `AttributeError: 'list' object has no attribute 'mean'` |
| `pd.DataFrame({"a": [1, 2], "b": [1]})` | `ValueError: All arrays must be of the same length` |
| `df.iloc["x"]` | `TypeError: Cannot index by location index with a non-integer key` |
| `df["x", "y"]` | `KeyError: ('x', 'y')` |
| `df[df.x > 0]["y"] = 1`, `df["a"].fillna(0, inplace=True)` | aviso `ChainedAssignmentError: A value is being set on a copy of a DataFrame or Series through chained assignment.` e **nada muda** (Copy-on-Write; `SettingWithCopyWarning` não existe mais no pandas 3) |
| `pd.Series(["1,5"]).astype(float)` | `ValueError: could not convert string to float: '1,5'` |
| `pd.to_datetime(["01/02/2025", "13/02/2025"])` sem `format` | `ValueError: time data "13/02/2025" doesn't match format "%m/%d/%Y"…` (o pandas adivinha mês/dia pela primeira data) |
| `s.resample("M")` | `ValueError: Invalid frequency: M…'M' is no longer supported for offsets. Please use 'ME' instead.` |
| `pivot` com chave repetida | `ValueError: Index contains duplicate entries, cannot reshape` |
| `merge(..., validate="one_to_many")` com chave repetida à esquerda | `MergeError: Merge keys are not unique in left dataset; not a one-to-many merge` |
| `merge` de chave `int64` com `str` | `ValueError: You are trying to merge on int64 and str columns for key 'k'. If you wish to proceed you should use pd.concat` |
| `pd.read_excel(...)` num arquivo que não é xlsx / `df.to_excel(...)` | `BadZipFile` / `ModuleNotFoundError: No module named 'openpyxl'` (o nível não ensina Excel) |
| `(a > 0 & a < 5)` sem parênteses num array `float` | `TypeError: ufunc 'bitwise_and' not supported for the input types…` (num array de inteiros, o `ValueError` do valor-verdade ambíguo) |
| `np.linalg.solve`/`inv` com matriz singular | **nenhum erro**: devolvem `nan`/valores sem sentido (no CPython nativo seria `LinAlgError: Singular matrix`); detecte com `np.linalg.matrix_rank(A) < A.shape[0]` |
| `rng.choice(a, size>len(a), replace=False)` | `ValueError: Cannot take a larger sample than population when replace is False` |
| `s.mean()` numa coluna de texto | `TypeError: Cannot perform reduction 'mean' with string dtype` |
| `df.idade > 18 & df.cidade == "X"` | `TypeError: unsupported operand type(s) for &: 'int' and 'StringArray'` |
| `s.str.contains("(")` | `PatternError: missing ), unterminated subpattern…` |
| `np.select(conds, escolhas)` com texto, sem `default` | `TypeError: Choicelist and default value do not have a common dtype…` |
| CSV com `;` lido sem `sep` | `ParserError: Error tokenizing data. C error: Expected 1 fields in line 3, saw 3` |
| arquivo latin-1 lido como UTF-8 | `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe3…` |
| `pd.read_json('[{"a": 1}]')` (texto, não arquivo) | `FileNotFoundError: File [{"a": 1}] does not exist` — use `io.StringIO` |
| `read_csv(..., parse_dates=["data"])` sem a coluna | `ValueError: Missing column provided to 'parse_dates': 'data'` |
| `s.astype(int)` com ausente | `IntCastingNaNError: Cannot convert non-finite values (NA or inf) to integer` |
| `fillna(method="ffill")` | `TypeError` (o parâmetro saiu no pandas 3; use `ffill()`) |
| `df["a"].fillna(0, inplace=True)` | aviso `ChainedAssignmentError: … chained assignment using an inplace method.` e nada muda |
| `pd.to_numeric(s)` com texto | `ValueError: Unable to parse string "…" at position N`; `errors="ignore"` → `ValueError: invalid error value specified` |
| `s.quantile(25)` | `ValueError: percentiles should all be in the interval [0, 1]` |
| `df.append(...)` / `pd.concat([])` | `AttributeError: 'DataFrame' object has no attribute 'append'` / `ValueError: No objects to concatenate` |
| `merge(..., validate=...)` violado | `MergeError` (subclasse de `ValueError`) com linhas extras "Duplicates in right: …"; cite só a primeira |

Comportamentos do pandas 3 que as lições precisam mostrar: texto tem `dtype` `str` (não `object`); `pd.Series(["a", None]).tolist()` dá `['a', nan]`; `str.contains(".")` usa regex por padrão (casa qualquer caractere); `pd.cut` sem `include_lowest=True` deixa o limite inferior como `NaN`; `groupby` em coluna categórica usa `observed=True` por padrão; `get_dummies` devolve colunas `bool`; `day_name()` devolve nomes em inglês (traduza com um dicionário); datas lidas viram `datetime64[us]`; `pd.Series.std` usa `ddof=1` e `np.std` usa `ddof=0`.

### Comportamentos do executor que pegam desprevenido (conferidos nos módulos 1–3)

- **Tipos devolvidos:** `np.allclose` devolve `bool` do Python; `np.all`, `np.isclose` e `arr.max() <= tol`
  devolvem `numpy.bool` (peça `bool(...)` no enunciado ou compare com `== True` no caso). `np.count_nonzero` e a
  soma de booleanos dão `numpy.int32`; `rng.integers` e `rng.poisson` dão `int64`; `astype(int)` dá `int32`
  (use `pd.to_numeric`, que dá `int64`, ou confira por `dtype.kind`). `to_dict("records")` já devolve
  `int`/`float` do Python no pandas 3.
- **`argsort` padrão não é estável** em arrays grandes (com menos de ~16 elementos coincide com o estável): um
  caso com ~100 empates separa quem esqueceu `kind="stable"`.
- **Datas:** `to_datetime`/`parse_dates` sem `format` e com todas as datas até o dia 12 trocam dia e mês **sem
  erro**; com `errors="coerce"`, as datas acima de 12 viram `NaT` em silêncio. `pivot` ordena as colunas em ordem
  alfabética.
- **`-mascara` funciona como `~mascara`** em máscaras booleanas.
- **Sem fusos por nome:** o executor não tem `tzdata`; `tz_convert("America/Sao_Paulo")` dá `ZoneInfoNotFoundError`.
  Use deslocamento fixo (`tz_localize("UTC").tz_convert("-03:00")`), como na m4-03.
- **Agrupamentos (m4):** atribuir `df.groupby(g)["v"].mean()` a uma coluna dá tudo `NaN` sem aviso (use `transform`);
  a margem do `pivot_table` com `aggfunc` padrão é a média de todas as observações, não a soma; `rank` devolve
  `float64`; `pct_change` não preenche ausentes e `fill_method="ffill"` dá `ValueError`; `.loc` de uma célula
  devolve `numpy.int64`. `groupby().mean()` com coluna de texto: `TypeError: dtype 'str' does not support
  operation 'mean'`.
- **Lotes perto do limite:** um laço duplo em Python sobre 500 pontos pode levar o lote de casos perto dos 10 s;
  use ~200 pontos quando o caso existir só para provar que a versão em laço reprova por regra de fonte.

### Previsão e visualizador em `python-dados`

- **Previsão** funciona: o `content:build` e o `content:verify` rodam o código no executor com o `runtime` e as `bibliotecas` da lição. Numa lição `ml`, cada Previsão custa um boot (~10 s) no build. Evite imprimir arrays cuja formatação tem **espaços de alinhamento** (`[0.5 1.  1.5]`, `[ 6. 15.]`, `[0.   0.25 0.5  0.75 1.  ]`), a não ser que o alinhamento seja o assunto: escolha valores da mesma largura (`[3. 5. 7.]`), use `.tolist()` ou arredonde. Simulação na Previsão só com `default_rng(semente)`.
- **Visualizador:** o `content:verify` roda o bloco no executor com as bibliotecas da lição, e o player (desde o `8ec2a1b`) instala as mesmas bibliotecas no Pyodide do navegador antes de rastrear; numpy e pandas funcionam nos dois lados.

### Dosagem por módulo

Planejada (o m1-01 já está escrito e conferido). Mermaid e Visualizar = número de blocos; "Leituras com fórmula" = passos de Leitura com KaTeX.

| Módulo | Lições | Mermaid | Visualizar | Leituras com fórmula | Exercício (lacunas) | Exercício (ordenar) | Exercício (código) | Previsão | Imagens (assets) |
|---|---|---|---|---|---|---|---|---|---|
| 1 · numpy | 5 | 1 | 2 | 7 | 4 | 1 | 10 | 5 | 0 |
| 2 · pandas: fundamentos | 5 | 1 | 0 | 0 | 4 | 1 | 10 | 5 | 0 |
| 3 · Limpeza e transformação | 5 | 2 | 0 | 1 | 4 | 1 | 10 | 5 | 0 |
| 4 · Agregação e séries temporais | 3 | 1 | 0 | 1 | 3 | 0 | 6 | 3 | 0 |
| 5 · Visualização com matplotlib | 4 | 1 | 0 | 0 | 4 | 0 | 8 | 4 | 0 |
| 6 · Probabilidade e estatística | 8 | 2 | 0 | 17 | 7 | 1 | 16 | 8 | 0 |
| 7 · Projeto do nível | 1 | 1 | 0 | 1 | 0 | 0 | 5 | 1 | 0 |
| **Total** | **31** | **9** | **2** | **27** | **26** | **4** | **65** | **31** | **0** |

## Estrutura do nível

7 módulos · 31 lições (1 projeto de nível) · 26,8 h de lições (1610 min) + prova (45 min) · 3640 XP · prova com banco de **40 questões (10 por tentativa)**, na proporção das lições de cada módulo: 6, 6, 6, 4, 5, 11 e 2, com a alternativa correta 10 vezes em cada posição. O `prova.yaml` tem hoje 12 questões; o banco de 40 é a meta, escrito depois dos módulos.

| # | Módulo | Lições | Minutos | XP |
|---|---|---|---|---|
| 1 | numpy: computação vetorizada (`numpy`) | 5 | 225 | 550 |
| 2 | pandas: fundamentos (`pandas-fundamentos`) | 5 | 220 | 540 |
| 3 | Limpeza e transformação (`limpeza-e-transformacao`) | 5 | 235 | 570 |
| 4 | Agregação e séries temporais (`agregacao-e-series-temporais`) | 3 | 140 | 340 |
| 5 | Visualização com matplotlib (`visualizacao`) | 4 | 170 | 420 |
| 6 | Probabilidade e estatística (`probabilidade-e-estatistica`) | 8 | 380 | 920 |
| 7 | Projeto do nível (`n4-projeto-do-nivel`) | 1 | 240 | 300 |

## Módulo 1 · numpy: computação vetorizada

Arrays, `dtype` e `shape`, vetorização e `axis`, indexação e máscaras, broadcasting, álgebra linear e simulação reproduzível. `bibliotecas: [numpy]`, perfil `dados`.

### n4-m1-01-arrays-e-vetorizacao · Arrays e vetorização (escrita e verificada)
- **Arquivo:** `01-numpy/01-arrays-e-vetorizacao.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Um milhão de temperaturas** (Visualizar do laço em Python puro; medição com `perf_counter` e os números reais do executor; por que a correção não mede tempo)
  2. **Previsão · Lista ou array?** (`*` em lista e array, `/`, promoção para `float64`, `shape`/`ndim`/`size`, `sum` com `axis`, soma de booleanos)
  3. **Leitura · dtype, shape e as fábricas de arrays** (inteiro `int32` no executor, truncamento ao gravar, `reshape`, `zeros`/`ones`/`full`/`eye`/`arange`/`linspace`, `arange` com passo fracionário, `astype` corta)
  4. **Exercício (lacunas) · Fabricar arrays** (`notas_zeradas(alunos, provas)`, `pontos(inicio, fim, n)`, `centavos(precos)` → `int64`)
  5. **Leitura · ufuncs, reduções e o parâmetro axis** (KaTeX: escore $z$; `math` contra `np`; `inf`/`nan` sem exceção; lista + array; "o eixo que você passa é o que some")
  6. **Exercício (código) · Padronizar sem laço** (`padronizar(x)`; desvio zero → zeros; sem laço; entrada intacta)
  7. **Exercício (código) · Uma semana de temperaturas** (`media_por_dia`, `maxima_por_hora`, `amplitude_por_dia`, `horas_de_calor(temps, limite)`; matriz 3 × 4 e semana `(7, 24)` sorteada)
  8. **Quiz · Arrays no dia a dia** (`axis` numa tabela meses × lojas; gravar `9.99` num array inteiro; a medida com 10 elementos)
- **Muda do roteiro:** `comparar_tempo(n)` com razão > 5 saiu (ver "Regras", 1); `distancias_euclidianas` foi para a m1-03, onde o broadcasting é o assunto. `normalizar(x)` virou `padronizar(x)` (o nome do escore $z$; "normalizar" fica para a norma L2 da m1-04).
- **Resultado:** 11, 11 e 12 casos; 6, 7 e 7 soluções erradas, cada uma reprovando pelo motivo pretendido.

### n4-m1-02-indexacao-e-mascaras · Indexação, fatias e máscaras booleanas
- **Arquivo:** `01-numpy/02-indexacao-e-mascaras.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · Fatias em duas dimensões** (`a[1:3, ::2]`, `a[:, 0]` com forma `(n,)` contra `a[:, [0]]` com `(n, 1)`; indexação por lista; fatia é **vista**, lista de índices é **cópia**)
  2. **Previsão · Vista ou cópia** (altera uma fatia, uma seleção por lista e um `.copy()` e imprime o original)
  3. **Exercício (lacunas) · Recortes de uma planilha** (`bloco(m, linhas, colunas)` com fatias, `coluna(m, j)` 1D, `linhas(m, indices)` como cópia)
  4. **Leitura · Máscaras, &, | e ~** (parênteses obrigatórios; a mensagem do `and`; `np.where(cond, x, y)`; `np.count_nonzero`; `any`/`all`; `a[a < 0] = 0` altera no lugar; `argsort` estável e o desempate pelo menor índice, como no Nível 3)
  5. **Exercício (código) · Leituras de sensor** (`substituir_negativos(a, valor)` devolvendo array novo; `contar_no_intervalo(a, minimo, maximo)` → `int`, limites inclusivos; sem laço)
  6. **Exercício (código) · Clientes e os k maiores** (`clientes_elegiveis(idades, rendas, idade_min, renda_min)` → índices com `np.flatnonzero`; `situacao(notas)` com `np.where` aninhado → `"aprovado"`/`"recuperação"`/`"reprovado"`; `top_k_indices(a, k)` do maior para o menor, empate pelo menor índice)
  7. **Quiz · Máscaras e cópias**
- **Muda do roteiro:** o exercício `vista_altera`/`copia_altera` (caso `variable`) virou a Previsão do passo 2. `top_k_indices` fixa a regra de desempate (`argsort(-a, kind="stable")`), senão duas soluções corretas divergem.
- **Erradas típicas:** `and` no lugar de `&`; condição sem parênteses (`a > 0 & a < 5`); `a[a < 0] = valor` no array recebido; `np.where(cond)` com um argumento só; `argsort(a)[::-1]` (inverte empates); `>` onde o limite é inclusivo.

### n4-m1-03-broadcasting-e-operacoes · Broadcasting e operações entre arrays
- **Arquivo:** `01-numpy/03-broadcasting-e-operacoes.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · As regras do broadcasting** (Mermaid: alinhar pela direita → dimensões iguais ou 1 → estica ou erro; a mensagem real do erro)
  2. **Previsão · Que forma sai daqui** (imprime `shape` de quatro operações, uma com `[:, np.newaxis]`)
  3. **Exercício (ordenar) · prever_shape** (`prever_shape(forma_a, forma_b)` → `tuple` ou `None`, puro Python; `call` com `"type": "tuple"`)
  4. **Leitura · Por coluna e por linha** (`m - m.mean(axis=0)`; `m / m.sum(axis=1, keepdims=True)`; o erro de `(n, m) - (n,)`)
  5. **Exercício (código) · Padronizar colunas e proporções por linha** (`padronizar_colunas(m)` com coluna constante → zeros; `proporcao_por_linha(m)` com linha toda zero → zeros; sem laço)
  6. **Leitura · Distâncias entre todos os pares e empilhamento** (KaTeX: $d_{ij} = \lVert p_i - p_j \rVert$; `p[:, None, :] - p[None, :, :]` com forma `(n, n, d)` e a memória $n^2 d$; `concatenate`, `vstack`, `hstack`, `stack`, `split`)
  7. **Exercício (código) · Distâncias e tabelas juntas** (`matriz_de_distancias(pontos)` n × n; `juntar_tabelas(a, b)` empilhando linhas e levantando `ValueError` se o número de colunas diferir)
  8. **Quiz · Formas compatíveis**
- **Muda do roteiro:** `matriz_de_distancias` "com 500 pontos e limite de tempo" vira: correção em 3 pontos conhecidos + propriedades com 500 pontos sorteados (simétrica, diagonal zero, `shape`) + `source` sem laço. O laço duplo (250 000 voltas, ~0,2 s no executor) é uma errada que reprova só no `source`.
- **Erradas típicas:** `m - m.mean(axis=1)`; dividir sem `keepdims`; `hstack` no lugar de `vstack`; distância sem a raiz; `np.dot` de pontos (produto escalar no lugar da diferença); laço duplo.

### n4-m1-04-algebra-linear-basica · Álgebra linear básica com numpy
- **Arquivo:** `01-numpy/04-algebra-linear-basica.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Produto escalar, `@` e `*`** (KaTeX: $a \cdot b = \sum a_i b_i$, $\lVert a \rVert$, $\cos\theta$; `*` é elemento a elemento, `@` é produto matricial; formas `(n,)` contra `(n, 1)`)
  2. **Previsão · `*`, `@` e formas** (resultados e `shape` de `A * B`, `A @ B`, `v @ v`, `A @ v`)
  3. **Exercício (lacunas) · Produto, norma e cosseno** (`produto_escalar(a, b)` → `float`, `norma(a)` → `float`, `cosseno(a, b)` → `float`, com `ValueError` para vetor nulo)
  4. **Leitura · Sistemas lineares: resolva, não inverta** (KaTeX: $Ax = b$; mistura de ingredientes fictícia; `np.linalg.solve`; por que não `inv`; a matriz singular que no executor não levanta `LinAlgError` — detectada pelo posto)
  5. **Exercício (código) · Resolver sistemas** (`resolver_sistema(A, b)` → array; matriz singular → `ValueError("sistema sem solução única")`; `source` `not_calls` `inv`)
  6. **Leitura · Mínimos quadrados e a equação normal** (KaTeX: $X^\top X \beta = X^\top y$ e a coluna de uns; `lstsq` citado; autovalores citados como gancho para o PCA do Nível 5)
  7. **Exercício (código) · Ajustar uma reta e testar ortogonalidade** (`ajustar_reta(x, y)` → `(a, b)` com `y ≈ a + b·x` pela equação normal e `solve`, `not_calls` `polyfit` e `lstsq`; `eh_ortogonal(Q, tol=1e-9)` → `bool`)
  8. **Quiz · Dimensões e sistemas**
- **Erradas típicas:** `*` no lugar de `@`; esquecer a coluna de uns; `inv(X.T @ X) @ X.T @ y` (aceito só se o passo não proibir `inv`: o passo 7 proíbe, para fixar o `solve`); `np.allclose` sem `bool(...)` (devolve `np.bool_`); ortogonalidade testada com `Q @ Q` em vez de `Q.T @ Q`; cosseno sem tratar o vetor nulo (`nan`).

### n4-m1-05-numeros-aleatorios-e-simulacao · Números aleatórios e simulação
- **Arquivo:** `01-numpy/05-numeros-aleatorios-e-simulacao.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Sementes e geradores** (`default_rng(semente)`; `integers` com fim exclusivo, `random`, `normal`, `binomial`, `choice` com `p`, `permutation`; por que o `np.random.seed` legado é um estado global compartilhado)
  2. **Previsão · Mesma semente, mesma sequência** (dois geradores com a mesma semente e um com outra)
  3. **Exercício (lacunas) · Lançar dados** (`lancar_dados(n, semente)` → array `(n, 2)` de 1 a 6; `prob_soma(alvo, n, semente)` → `float`)
  4. **Leitura · Monte Carlo e o erro da estimativa** (KaTeX: $\hat p$, erro padrão $\sqrt{\hat p(1-\hat p)/n}$; lei dos grandes números; vetorizar com forma `(simulacoes, n)`)
  5. **Exercício (código) · Estimar π** (`estimar_pi(n, semente)` → `float`; `erro_padrao_proporcao(p, n)` → `float`; sem laço)
  6. **Leitura · Separe o sorteio da regra** (Visualizar em Python puro da recorrência `fila = max(0, fila + chegadas - capacidade)`; bootstrap: reamostrar com reposição e os percentis 2,5 e 97,5)
  7. **Exercício (código) · Fila e bootstrap** (`gerar_chegadas(lam, minutos, semente)` com `rng.poisson`; `simular_fila(chegadas, capacidade)` → lista do tamanho da fila a cada minuto, com valores exatos; `bootstrap_media(amostra, n_reamostras, semente)` → `(inferior, superior)`)
  8. **Quiz · Sementes e erro de simulação**
- **Muda do roteiro:** `simular_fila(chegadas_por_min, atendimentos_por_min, minutos, semente)` vira duas funções (sorteio + regra), porque com a semente embutida o resultado dependeria da ordem em que cada solução consome o gerador. As tolerâncias seguem a regra 6 (5 erros padrão), e não o `0.02` fixo do roteiro. O laço de $10^6$ simulações é cobrado por `source`, não por tempo.
- **Erradas típicas:** `np.random.seed(semente)` + `np.random.randint` (reprova no caso do estado global); `integers(1, 6)` (nunca sai 6); `choice` sem `replace=True` no bootstrap (intervalo de largura zero); gerador criado fora da função (dois chamados seguidos dão resultados diferentes); laço Python no `estimar_pi`; fila que fica negativa.

## Módulo 2 · pandas: fundamentos

Series e DataFrame, seleção, filtros e ordenação, colunas derivadas e leitura/escrita. `bibliotecas: [numpy, pandas]`, perfil `dados`. Os conjuntos de dados são pequenos e fictícios (lojas, alunos, vendas), embutidos como `text path=…` ou montados no `setup`.

### n4-m2-01-series-e-dataframe · Series e DataFrame
- **Arquivo:** `02-pandas-fundamentos/01-series-e-dataframe.lvl.md` · 100 XP · 40 min
- **Passos (7):**
  1. **Leitura · Uma coluna com rótulos** (Mermaid: duas Series alinhadas pelo índice; `NaN` onde falta; `fill_value`)
  2. **Previsão · Soma alinhada pelo índice**
  3. **Exercício (lacunas) · Montar a tabela** (`criar_tabela(registros, colunas)` a partir de lista de dicionários, com as colunas na ordem pedida)
  4. **Leitura · Colunas, dtypes e describe** (`shape`, `dtypes` com `str` no pandas 3, `head`, `info`, `describe`; `df["c"]` é Series e `df[["c"]]` é DataFrame; a mensagem de colunas com tamanhos diferentes; `category` citado)
  5. **Exercício (código) · Resumo numérico** (`resumo(df)` → `{coluna: {"media": float, "maximo": float}}` só das colunas numéricas, com `select_dtypes`)
  6. **Exercício (código) · Alinhar e exportar** (`somar_alinhado(s1, s2, preenchimento=None)` → Series; `para_registros(df)` → lista de dicionários com tipos nativos)
  7. **Quiz · Índice e alinhamento**
- **Erradas típicas:** somar com `+` quando o enunciado pede preenchimento (sobra `NaN`); `resumo` incluindo a coluna de texto; `df.mean()` sem `numeric_only` (erro com texto); `to_dict()` sem `"records"`; valores `np.int64` no retorno (chegam como `$repr`).

### n4-m2-02-selecao-com-loc-e-iloc · Seleção com loc e iloc
- **Arquivo:** `02-pandas-fundamentos/02-selecao-com-loc-e-iloc.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · Rótulo ou posição** (`loc` com fatia inclusiva, `iloc` exclusiva; `at`/`iat`; as mensagens de `iloc` com rótulo e de `df["a", "b"]`)
  2. **Previsão · O que cada seleção devolve** (imprime `type(...).__name__` e `shape` de cinco seleções)
  3. **Exercício (lacunas) · Três recortes** (`notas_de(df, nome)` → Series, `bloco(df, inicio, fim)` por rótulo, `ultimas_colunas(df, k)` por posição)
  4. **Leitura · Atribuir com Copy-on-Write** (no pandas 3 a atribuição encadeada **nunca** funciona: o aviso `ChainedAssignmentError` e o valor que não muda; `df.loc[mascara, "coluna"] = valor`; função que devolve tabela nova)
  5. **Exercício (código) · Bônus sem atribuição encadeada** (`aplicar_bonus(df, minimo, bonus)` → DataFrame novo com `loc`; o recebido intacto)
  6. **Exercício (código) · Índice por nome** (`nota_do_aluno(df, nome, disciplina)` com `set_index` → `float` ou `None` se faltar)
  7. **Quiz · loc, iloc e cópias**
- **Muda do roteiro:** o `SettingWithCopyWarning` não existe no pandas 3; a lição ensina o Copy-on-Write e o `ChainedAssignmentError`. A verificação não olha avisos (a captura de `warnings` no `setup` sai): olha o **valor**, que na atribuição encadeada não muda.
- **Erradas típicas:** `df[df.x > 0]["y"] = 1`; `loc[0:2]` esperando 2 linhas; `iloc` com rótulo; alterar o DataFrame recebido; `KeyError` vazando no lugar de `None`.

### n4-m2-03-filtros-e-ordenacao · Filtros, ordenação e consultas
- **Arquivo:** `02-pandas-fundamentos/03-filtros-e-ordenacao.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · Máscaras em tabelas** (`&`, `|`, `~` com parênteses; `isin`; `between` inclusivo; a mensagem `The truth value of a Series is ambiguous`)
  2. **Previsão · Quem passa no filtro**
  3. **Exercício (ordenar) · Clientes de uma cidade** (`clientes_de(df, cidade, idade_min)` → lista de ids em ordem crescente)
  4. **Leitura · Texto, query e ordenação** (`str.contains(case=False, regex=False)` e o `.` que casa tudo; `query`; `sort_values` com `ascending` em lista e `kind="stable"`; `nlargest`; `value_counts`)
  5. **Exercício (código) · Produtos e faixas de preço** (`produtos_com(df, termo)` literal e sem diferenciar maiúsculas; `faixa_de_preco(df, minimo, maximo)` → nomes)
  6. **Exercício (código) · Ranking de vendedores** (`top_vendedores(df, n)` por total decrescente e, no empate, nome crescente)
  7. **Quiz · Filtros que enganam**
- **Erradas típicas:** `and` em máscara; `str.contains("1.5")` com regex; `ascending=False` só (desempate também decrescente); `head(n)` antes de ordenar; `between` trocado por `>`/`<`.

### n4-m2-04-novas-colunas-e-apply · Novas colunas, apply, map e operações vetorizadas
- **Arquivo:** `02-pandas-fundamentos/04-novas-colunas-e-apply.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Colunas derivadas** (aritmética entre colunas; `assign` devolve tabela nova)
  2. **Previsão · map com chave ausente** (o `NaN` silencioso)
  3. **Exercício (lacunas) · Total e desconto** (`adicionar_total_e_desconto(df, limite, taxa)` → DataFrame novo)
  4. **Leitura · Condições e faixas** (`np.where`, `np.select` com `default`; `pd.cut` com `right` e `include_lowest`; `qcut`)
  5. **Exercício (código) · Faixas e risco** (`faixa_etaria(df)` com rótulos exatos e o 0 incluído; `classificar_risco(df)` com `np.select`)
  6. **Leitura · O custo do apply por linha** (o `apply(axis=1)` é um laço Python; números medidos no executor, só na leitura; vetorizado > `map` > `apply`)
  7. **Exercício (código) · Troque o apply** (`frete(df)` com o mesmo resultado da versão com `apply` dada no enunciado; `not_calls` `apply`, `not_uses` `for` e `list_comprehension`)
  8. **Quiz · map, apply e vetorizado**
- **Muda do roteiro:** "limite de tempo com 10^6 linhas" sai; o `apply` é recusado pelo `source` e o resultado é conferido linha a linha numa tabela pequena e numa de 1 000 linhas gerada no `setup`.
- **Erradas típicas:** `pd.cut` sem `include_lowest` (idade 0 vira `NaN`); `map` sem tratar chave ausente; `np.select` sem `default`; alterar a coluna original; `apply(axis=1)`.

### n4-m2-05-leitura-e-escrita-de-dados · Leitura e escrita: CSV e JSON
- **Arquivo:** `02-pandas-fundamentos/05-leitura-e-escrita-de-dados.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · O CSV brasileiro** (`sep=";"`, `decimal=","`, `thousands="."`, `encoding="latin-1"`, `parse_dates` com `dayfirst` ou `format`; as mensagens reais; `io.StringIO`)
  2. **Previsão · O que o read_csv entendeu** (imprime `dtypes` de um CSV lido sem e com `decimal`)
  3. **Exercício (lacunas) · Carregar as vendas** (`carregar_vendas(caminho)` com `text path=vendas.csv`; `dtypes` exatos)
  4. **Leitura · Cabeçalho, rodapé e ausentes** (`skiprows`, `skipfooter` com `engine="python"`, `na_values`, `usecols`, `dtype`)
  5. **Exercício (código) · Arquivos difíceis** (`ler_relatorio(caminho)` pulando linhas de título e de rodapé; `ler_latin1(caminho)` com o arquivo escrito em bytes `latin-1` pelo `setup`)
  6. **Leitura · Escrever de volta** (`to_csv(index=False)` e a coluna `Unnamed: 0`; JSON `orient="records"`)
  7. **Exercício (código) · Exportar e ler JSON** (`exportar(df)` → texto CSV com `;` e vírgula decimal, sem índice; `ler_json_registros(texto)`)
  8. **Quiz · Leitura sem surpresas**
- **Muda do roteiro:** sai o Excel (decisão do Filipe, 2026-11-16): o executor não tem `openpyxl`, e a lição fica com CSV e JSON, inclusive no título e na descrição.

## Módulo 3 · Limpeza e transformação

Ausentes, tipos, datas e textos, duplicatas e outliers, formato tidy e junções. `bibliotecas: [numpy, pandas]`, perfil `dados`.

### n4-m3-01-valores-ausentes · Valores ausentes
- **Arquivo:** `03-limpeza-e-transformacao/01-valores-ausentes.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · O que é ausente** (`np.nan`, `None`, `pd.NA`; `isna`; `NaN != NaN`; `mean` ignora, a aritmética propaga)
  2. **Previsão · NaN nas contas**
  3. **Exercício (lacunas) · Relatório de ausentes** (`relatorio_ausentes(df)` → `{coluna: proporção}` com `float`)
  4. **Leitura · Remover ou imputar** (`dropna` com `how`/`thresh`/`subset`; `fillna`; `inplace` encadeado não faz nada no pandas 3; coluna indicadora antes de imputar; o viés da média; gancho do vazamento treino/teste no Nível 5)
  5. **Exercício (código) · Imputar com marca** (`imputar(df, coluna, estrategia)` → tabela nova com `<coluna>_ausente`; `ValueError` para estratégia desconhecida)
  6. **Exercício (código) · Linhas vazias e leituras repetidas** (`remover_linhas_quase_vazias(df, minimo)` com `thresh`; `preencher_leituras(serie, limite)` com `ffill(limit=...)`)
  7. **Quiz · Ausentes**
- **Muda do roteiro:** `preencher_por_grupo` (mediana do grupo) vai para a m4-01, onde o `groupby().transform` é ensinado.

### n4-m3-02-tipos-datas-e-strings · Tipos, datas e strings
- **Arquivo:** `03-limpeza-e-transformacao/02-tipos-datas-e-strings.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Texto que parece número** (`"R$ 1.234,56"`; a mensagem do `astype(float)`; `str.replace(..., regex=False)` na ordem certa; `to_numeric(errors="coerce")`)
  2. **Exercício (lacunas) · Limpar preços** (`limpar_precos(serie)` → Series `float64`, inválidos como `NaN`)
  3. **Leitura · Datas** (`to_datetime` com `format`; a mensagem da data ambígua; `.dt.year`/`.month`/`.dayofweek`; `Timedelta.days`; `day_name()` em inglês e a tradução por dicionário)
  4. **Previsão · O que o to_datetime entendeu**
  5. **Exercício (código) · Datas de cadastro** (`converter_datas(df, coluna)`; `idade_em_dias(df, coluna, referencia)`)
  6. **Leitura · Padronizar texto** (`strip`, `lower`, `unicodedata.normalize("NFKD", ...)` para tirar acentos, `str.extract`, `split(expand=True)`, `category`)
  7. **Exercício (código) · Cidades e telefones** (`padronizar_cidades(serie)`; `extrair_ddd(telefones)` → lista de `str` ou `None`)
  8. **Quiz · Tipos e conversões**
- **Muda do roteiro:** "`unidecode` não disponível: tabela própria de acentos" vira `unicodedata` (biblioteca padrão, verificado: `"São Paulo"` → `"Sao Paulo"`).

### n4-m3-03-duplicatas-e-outliers · Duplicatas e outliers
- **Arquivo:** `03-limpeza-e-transformacao/03-duplicatas-e-outliers.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Duplicatas exatas e por chave** (`duplicated(subset, keep)`; ordenar antes para manter o mais recente)
  2. **Exercício (lacunas) · Manter o cadastro mais recente** (`remover_duplicatas_mais_recente(df, chave, data)`)
  3. **Leitura · IQR e escore z** (KaTeX: $[Q_1 - 1{,}5\,\text{IQR},\ Q_3 + 1{,}5\,\text{IQR}]$ e $|z| > k$; o desvio inflado pelo próprio outlier; mediana e MAD citados)
  4. **Previsão · O outlier que se esconde**
  5. **Exercício (código) · Dois detectores** (`outliers_iqr(serie)` → rótulos do índice; `outliers_zscore(serie, limiar)` com desvio zero → lista vazia)
  6. **Leitura · Remover, limitar ou marcar** (`clip` nos percentis; quando o outlier é a resposta; registrar a decisão)
  7. **Exercício (código) · Limitar sem perder linhas** (`limitar(df, coluna, inferior=0.01, superior=0.99)` → tabela nova)
  8. **Quiz · IQR, z e decisões**

### n4-m3-04-dados-tidy-melt-e-pivot · Dados tidy: melt, pivot e stack
- **Arquivo:** `03-limpeza-e-transformacao/04-dados-tidy-melt-e-pivot.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Três regras e uma planilha larga** (Mermaid: largo → longo; meses como colunas numa planilha fictícia)
  2. **Exercício (lacunas) · Para o formato longo** (`para_longo(df_largo, id_col)` com `melt`)
  3. **Previsão · O que o melt fez** (`shape` e as três primeiras linhas)
  4. **Leitura · pivot e pivot_table** (a mensagem de chave repetida; `aggfunc`)
  5. **Exercício (código) · De volta ao largo** (`para_largo(df_longo)`; `para_largo_somando(df_longo)` com chaves repetidas)
  6. **Leitura · Separar e juntar colunas** (`str.split(expand=True)`, `str.cat`; `stack`/`unstack` em uma frase; `MultiIndex` mínimo)
  7. **Exercício (código) · Ano e semestre** (`separar_ano_semestre(df)`; `tidy_notas(df)` com `melt` + `to_numeric`)
  8. **Quiz · Largo ou longo**

### n4-m3-05-combinando-tabelas · Combinando tabelas: merge, join e concat
- **Arquivo:** `03-limpeza-e-transformacao/05-combinando-tabelas.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · merge e os quatro how** (Mermaid das junções; muitos-para-muitos multiplica linhas)
  2. **Previsão · Quantas linhas sai do merge**
  3. **Exercício (ordenar) · Prever o número de linhas** (`prever_linhas(chaves_a, chaves_b, how)` em Python puro com `Counter`)
  4. **Leitura · Chaves que não casam** (`indicator=True`; `validate` e o `MergeError`; a mensagem de `int64` com `str`)
  5. **Exercício (código) · Pedidos e clientes** (`pedidos_com_clientes(pedidos, clientes)` → `(tabela, ids_orfaos)`; `juntar_validado(a, b, chave)` → `ValueError` com a explicação quando a chave da direita repete)
  6. **Leitura · Empilhar com concat** (`axis`, `ignore_index`, `keys`; colunas desalinhadas viram `NaN`)
  7. **Exercício (código) · Empilhar meses** (`empilhar_meses(tabelas, meses)` com a coluna `mes`)
  8. **Quiz · Junções**

## Módulo 4 · Agregação e séries temporais

`bibliotecas: [numpy, pandas]`, perfil `dados`.

### n4-m4-01-groupby · groupby: dividir, aplicar e combinar
- **Arquivo:** `04-agregacao-e-series-temporais/01-groupby.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Dividir, aplicar, combinar** (Mermaid; `groupby("c")["x"].mean()`; `agg` nomeado)
  2. **Previsão · size, count e o NaN**
  3. **Exercício (lacunas) · Vendas por vendedor** (`vendas_por_vendedor(df)` com `agg(total=…, media=…, n=…)` e `reset_index`)
  4. **Leitura · transform e filter** (comparar cada linha com o seu grupo; imputar pela mediana do grupo)
  5. **Exercício (código) · Cada linha contra o seu grupo** (`desvio_da_media_do_grupo(df)`; `preencher_por_grupo(df, coluna, grupo)`, vinda da m3-01)
  6. **Leitura · MultiIndex, reset_index e categorias** (`observed=True` padrão no pandas 3; `nunique`; ordenar o resultado)
  7. **Exercício (código) · Grupos e rankings** (`grupos_frequentes(df, minimo)` com `filter`; `ranking_por_categoria(df)` com `rank(method="min", ascending=False)`)
  8. **Quiz · size, count, agg e transform**

### n4-m4-02-tabelas-dinamicas-e-crosstab · Tabelas dinâmicas e tabelas de contingência
- **Arquivo:** `04-agregacao-e-series-temporais/02-tabelas-dinamicas-e-crosstab.lvl.md` · 100 XP · 40 min
- **Passos (7):**
  1. **Leitura · Tabela dinâmica** (`pivot_table` com `aggfunc` padrão média, `margins`, `fill_value`)
  2. **Exercício (lacunas) · Vendas por mês e região** (`vendas_mes_por_regiao(df)` com soma e totais)
  3. **Previsão · normalize por linha ou por coluna**
  4. **Leitura · Proporções e o paradoxo de Simpson** (KaTeX: a taxa agregada como média ponderada; um exemplo fictício de dois cursos ou duas clínicas com números inventados)
  5. **Exercício (código) · Proporções por linha** (`proporcao_por_linha(df, a, b)` → `{linha: {coluna: proporção}}`)
  6. **Exercício (código) · Simpson** (`simpson(df, grupo, tratamento, sucesso)` → taxas agregadas, taxas por grupo e `inverte: bool`)
  7. **Quiz · Ler uma tabela de dupla entrada**
- **Muda do roteiro:** "exemplo real (admissões, tratamentos)" vira exemplo fictício com a mesma estrutura.

### n4-m4-03-series-temporais · Séries temporais: resample, rolling e deslocamento
- **Arquivo:** `04-agregacao-e-series-temporais/03-series-temporais.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Índice de datas** (`DatetimeIndex`; `s.loc["2025-03"]`; `resample("ME")` e a mensagem do `"M"`; `asfreq` e as lacunas)
  2. **Exercício (lacunas) · Total por mês** (`total_mensal(df)` → `{"AAAA-MM": total}`)
  3. **Previsão · rolling e min_periods**
  4. **Leitura · Janelas e deslocamentos** (`rolling`, `shift`, `diff`, `pct_change` e o zero que vira `inf`, `cumsum`)
  5. **Exercício (código) · Média móvel e ano contra ano** (`media_movel(serie, janela, min_periods)`; `variacao_ano_contra_ano(serie_mensal)`)
  6. **Leitura · Sazonalidade e lacunas** (`dayofweek` e `groupby`; fins de semana sem dado; `asfreq("D")` + `ffill`)
  7. **Exercício (código) · Semana típica e dias sem leitura** (`perfil_semanal(df)` de segunda a domingo; `preencher_lacunas_diarias(serie)`)
  8. **Quiz · resample ou rolling**

## Módulo 5 · Visualização com matplotlib

`bibliotecas: [numpy, pandas, matplotlib]`, **perfil `ml`** (~10 s por verificação sem worker quente). Toda função devolve `(fig, ax)` ou `fig`; verificação pela regra 7.

### n4-m5-01-anatomia-de-uma-figura · Anatomia de uma figura
- **Arquivo:** `05-visualizacao/01-anatomia-de-uma-figura.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Figure, Axes e artistas** (Mermaid; `fig, ax = plt.subplots()`; o backend `agg`; por que a plataforma confere propriedades e não pixels)
  2. **Previsão · O que o Axes guarda** (imprime título, rótulos e `len(ax.lines)`)
  3. **Exercício (lacunas) · Gráfico de linha** (`grafico_de_linha(x, y, titulo, rotulo_x, rotulo_y)` → `(fig, ax)`)
  4. **Leitura · Legenda, limites, ticks e grade** (`legend()` sem `label` e o `UserWarning: No artists with labels found to put in legend`; `plt.title` indo para o Axes errado)
  5. **Exercício (código) · Duas séries com legenda** (`duas_series(x, y1, y2, rotulos)`)
  6. **Leitura · Salvar e o plt.show** (`savefig` antes de `close`; `dpi`; o aviso do `plt.show` no executor)
  7. **Exercício (código) · Salvar a figura** (`salvar(fig, caminho)` → caminho; o arquivo começa com a assinatura PNG)
  8. **Quiz · Figure e Axes**

### n4-m5-02-tipos-de-grafico · Tipos de gráfico e quando usar cada um
- **Arquivo:** `05-visualizacao/02-tipos-de-grafico.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Pergunta → gráfico** (tabela: comparar, distribuição, relação, evolução; por que a pizza engana)
  2. **Exercício (lacunas) · Barras ordenadas** (`barras_ordenadas(categorias, valores)`)
  3. **Leitura · Distribuições: hist e boxplot** (`bins`, `density`; `tick_labels`)
  4. **Previsão · Quantos retângulos o hist desenha**
  5. **Exercício (código) · Histograma e boxplot** (`histograma(dados, bins)`; `boxplot_por_grupo(df, coluna, grupo)` com grupos em ordem alfabética)
  6. **Leitura · Relações e escalas** (`scatter` com tamanho e cor; escala log para dados assimétricos; uma cor de destaque)
  7. **Exercício (código) · Dispersão e escala log** (`dispersao(x, y, rotulo_x, rotulo_y)`; `barras_log(categorias, valores)`)
  8. **Quiz · Qual gráfico para esta pergunta**

### n4-m5-03-boas-praticas-e-graficos-enganosos · Boas práticas e gráficos enganosos
- **Arquivo:** `05-visualizacao/03-boas-praticas-e-graficos-enganosos.lvl.md` · 90 XP · 35 min
- **Passos (7):**
  1. **Leitura · Uma galeria de erros** (eixo truncado em barras, escala dupla, área no lugar de comprimento, 3D, cores sem contraste; exemplos descritos e fictícios)
  2. **Previsão · O ylim que o matplotlib escolhe** (barras começam em 0; linhas, não)
  3. **Exercício (lacunas) · Barras a partir do zero** (`corrigir_eixo(ax)`)
  4. **Leitura · Título que afirma, unidade, fonte e cor** (paleta segura para daltonismo; `ax.annotate`)
  5. **Exercício (código) · Um gráfico com mensagem** (`grafico_com_mensagem(meses, valores, destaque)` com título que afirma, unidade no eixo, anotação e fonte)
  6. **Exercício (código) · Da pizza às barras** (`reescrever_pizza(categorias, valores)` → barras horizontais ordenadas com porcentagens)
  7. **Quiz · O que está errado neste gráfico**
- **Muda do roteiro:** "exemplos reais da imprensa brasileira" vira galeria fictícia descrita em texto (sem reproduzir veículos nem dados reais).

### n4-m5-04-pandas-plot-e-multiplos-paineis · pandas.plot e figuras com vários painéis
- **Arquivo:** `05-visualizacao/04-pandas-plot-e-multiplos-paineis.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · df.plot e o ax=** (o pandas devolve um Axes; datas no eixo; sem `ax=`, uma figura nova)
  2. **Previsão · ax[0] numa grade 2 × 2** (`axs.shape` e a indexação `axs[0, 1]`)
  3. **Exercício (lacunas) · Barras empilhadas** (`barras_empilhadas(tabela)`)
  4. **Leitura · subplots, sharex, tight_layout e suptitle**
  5. **Exercício (código) · Pequenos múltiplos** (`pequenos_multiplos(df, grupo, coluna)` com um painel por grupo e eixo y compartilhado)
  6. **Exercício (código) · O painel de vendas** (`painel_de_vendas(df)` com 4 painéis: linha mensal, barras por região, histograma do ticket, boxplot por categoria)
  7. **Quiz · Painéis**

## Módulo 6 · Probabilidade e estatística

`bibliotecas: [numpy, pandas, scipy]`, **perfil `ml`**. Toda simulação segue a regra 6; todo número de `scipy.stats` volta como `float(...)`.

### n4-m6-01-probabilidade-e-simulacao · Probabilidade: regras e simulação
- **Arquivo:** `06-probabilidade-e-estatistica/01-probabilidade-e-simulacao.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Regras e independência** (KaTeX: soma, produto, complemento; contagem do Nível 3)
  2. **Exercício (lacunas) · Pelo menos um seis e aniversários** (`prob_pelo_menos_um_seis(n_dados)`, `prob_aniversario_igual(n)`)
  3. **Leitura · Condicional e Bayes** (Mermaid da árvore; KaTeX; teste fictício de doença rara; a falácia do promotor)
  4. **Previsão · O valor preditivo positivo**
  5. **Exercício (código) · Bayes** (`bayes(prevalencia, sensibilidade, especificidade)` → `float`)
  6. **Leitura · Conferir por simulação** (Monty Hall; o erro da simulação)
  7. **Exercício (código) · Monty Hall** (`simular_monty_hall(n, semente)` → `(taxa_trocar, taxa_manter)`; sem laço)
  8. **Quiz · Condicional e independência**

### n4-m6-02-distribuicoes · Distribuições: binomial, Poisson, uniforme, normal e exponencial
- **Arquivo:** `06-probabilidade-e-estatistica/02-distribuicoes.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Variável aleatória, esperança e variância** (KaTeX)
  2. **Exercício (lacunas) · Esperança e variância** (`esperanca_variancia(valores, probabilidades)`, com `ValueError` se as probabilidades não somam 1)
  3. **Leitura · Binomial e Poisson** (KaTeX; `pmf`/`cdf`; `pmf` não existe na contínua)
  4. **Exercício (código) · Contagens** (`prob_binomial(n, p, k)`; `prob_ate_k_poisson(lam, k)`)
  5. **Leitura · Uniforme, normal e exponencial** (KaTeX; `cdf`/`ppf`; 68-95-99,7; quando a normal não serve)
  6. **Previsão · cdf e ppf**
  7. **Exercício (código) · Probabilidades e quantis da normal** (`prob_normal_entre(mu, sigma, a, b)` com `a > b` → `ValueError`; `quantil_normal(mu, sigma, p)`)
  8. **Quiz · Qual distribuição**

### n4-m6-03-estatistica-descritiva · Estatística descritiva
- **Arquivo:** `06-probabilidade-e-estatistica/03-estatistica-descritiva.lvl.md` · 100 XP · 40 min
- **Passos (7):**
  1. **Leitura · Centro e dispersão** (KaTeX; média, mediana, quantis, IQR, CV; `ddof`; renda fictícia assimétrica gerada com `lognormal`)
  2. **Previsão · ddof=0 e ddof=1**
  3. **Exercício (lacunas) · Resumo descritivo** (`resumo_descritivo(valores)` → dicionário com chaves fixas)
  4. **Leitura · Assimetria e a escolha da medida** (`skew`; resumo de cinco números; o boxplot)
  5. **Exercício (código) · Qual medida usar** (`medida_central_recomendada(valores, limiar=1.0)`; `media_ponderada(valores, pesos)`)
  6. **Exercício (código) · Comparar grupos** (`comparar_grupos(df, valor, grupo)` → mediana e IQR por grupo)
  7. **Quiz · Média ou mediana**
- **Muda do roteiro:** "renda média vs mediana no Brasil (PNAD)" sai: a lição usa uma renda fictícia gerada, e a leitura diz só que rendas reais costumam ser assimétricas.

### n4-m6-04-amostragem-e-teorema-central-do-limite · Amostragem e o Teorema Central do Limite
- **Arquivo:** `06-probabilidade-e-estatistica/04-amostragem-e-teorema-central-do-limite.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · População, amostra e vieses** (sobrevivência, resposta voluntária; amostra grande com viés continua com viés)
  2. **Previsão · O erro padrão quando n quadruplica**
  3. **Exercício (ordenar) · Erro padrão e tamanho de amostra** (`erro_padrao(amostra)` com `ddof=1`; `tamanho_para_erro(sigma, erro)` com `math.ceil`)
  4. **Leitura · Distribuição amostral e TCL** (KaTeX: $\sigma/\sqrt{n}$; simulação com forma `(repeticoes, n)` para população exponencial e uniforme)
  5. **Exercício (código) · A distribuição das médias** (`distribuicao_amostral(populacao, n, repeticoes, semente)` → `(media, desvio)`, comparado com $\mu$ e $\sigma/\sqrt{n}$)
  6. **Leitura · Amostra estratificada**
  7. **Exercício (código) · Estratos** (`amostra_estratificada(df, estrato, n_por_estrato, semente)` com `groupby(...).sample(random_state=...)`)
  8. **Quiz · Vieses e TCL**

### n4-m6-05-intervalos-de-confianca · Intervalos de confiança
- **Arquivo:** `06-probabilidade-e-estatistica/05-intervalos-de-confianca.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · O que 95 % quer dizer** (KaTeX: $\bar x \pm t_{n-1}\, s/\sqrt n$; a interpretação errada)
  2. **Exercício (lacunas) · IC da média** (`ic_media(amostra, confianca)` com `stats.t.ppf`)
  3. **Previsão · Quantos intervalos cobrem** (simulação com semente; contagem)
  4. **Leitura · IC de proporção: Wald e Wilson** (KaTeX; Wald perto de 0 ou 1)
  5. **Exercício (código) · Proporções** (`ic_proporcao(sucessos, n, confianca, metodo="wilson")`)
  6. **Leitura · Bootstrap percentílico**
  7. **Exercício (código) · Cobertura e bootstrap** (`cobertura_simulada(mu, sigma, n, repeticoes, semente)` perto de 0,95 com tolerância de 5 erros padrão; `ic_bootstrap(amostra, estatistica, n_reamostras, semente)`)
  8. **Quiz · Certo ou errado sobre um IC**

### n4-m6-06-testes-de-hipotese · Testes de hipótese: t, qui-quadrado e p-valor
- **Arquivo:** `06-probabilidade-e-estatistica/06-testes-de-hipotese.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · A lógica do teste** (Mermaid; H0, H1, p-valor, $\alpha$, erros tipo I e II)
  2. **Exercício (lacunas) · Teste t de Welch com efeito** (`teste_t_duas_amostras(a, b)` → `{"t", "p", "d"}`)
  3. **Leitura · Pareado, qui-quadrado e o teste A/B** (KaTeX; `ttest_rel`; `chi2_contingency` e a correção de continuidade)
  4. **Exercício (código) · Antes e depois, A e B** (`teste_pareado(antes, depois)`; `teste_ab(conversoes_a, n_a, conversoes_b, n_b)`)
  5. **Previsão · Vinte testes sem efeito** (simulação com semente; quantos p < 0,05)
  6. **Leitura · Poder, múltiplas comparações e tamanho de efeito** (KaTeX: Bonferroni; poder por simulação)
  7. **Exercício (código) · Bonferroni e poder** (`corrigir_bonferroni(p_valores, alpha)`; `poder_simulado(diferenca, sigma, n, alpha, repeticoes, semente)`)
  8. **Quiz · O que o p-valor diz**

### n4-m6-07-correlacao-e-regressao-linear-simples · Correlação e regressão linear simples
- **Arquivo:** `06-probabilidade-e-estatistica/07-correlacao-e-regressao-linear-simples.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Covariância e correlação** (KaTeX; Pearson e Spearman; o quarteto de Anscombe)
  2. **Exercício (lacunas) · Duas correlações** (`correlacoes(x, y)` → `(pearson, spearman)`)
  3. **Previsão · Quatro conjuntos, mesmas estatísticas** (Anscombe arredondado)
  4. **Leitura · Mínimos quadrados e R²** (KaTeX; `linregress`; unidades da inclinação; extrapolação)
  5. **Exercício (código) · Ajustar e prever** (`regressao_simples(x, y)` → `{"a", "b", "r2"}`; `prever(modelo, x_novo, x_min, x_max)` → `(valor, extrapolou)`)
  6. **Leitura · Resíduos e causalidade** (padrões nos resíduos; confusão e causalidade reversa, com exemplos fictícios)
  7. **Exercício (código) · Curvatura nos resíduos** (`residuos(x, y)`; `curvatura(x, y)` → correlação dos resíduos com $(x - \bar x)^2$)
  8. **Quiz · Correlação não é causa**

### n4-m6-08-regressao-multipla-e-interpretacao · Regressão múltipla e interpretação
- **Arquivo:** `06-probabilidade-e-estatistica/08-regressao-multipla-e-interpretacao.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Vários preditores, uma coisa de cada vez** (KaTeX; *ceteris paribus*; aluguel fictício por área, quartos e bairro)
  2. **Exercício (lacunas) · Equação normal com várias colunas** (`regressao_multipla(X, y)` → coeficientes com o intercepto primeiro)
  3. **Leitura · Dummies e a armadilha** (`get_dummies(drop_first=True)` com colunas `bool` no pandas 3 e o `astype(float)`; todas as dummies dão matriz singular)
  4. **Previsão · As colunas que o get_dummies cria**
  5. **Exercício (código) · Dummies e scikit-learn** (`preparar_dummies(df, colunas)`; `ajustar_sklearn(df, alvo)` → `{"intercepto", "coeficientes"}` com `LinearRegression`)
  6. **Leitura · R² ajustado e multicolinearidade** (KaTeX: $R^2_{aj}$ e VIF)
  7. **Exercício (código) · R² ajustado e VIF** (`r2_ajustado(r2, n, p)`; `vif(X)` → lista)
  8. **Quiz · Interpretar coeficientes**

## Módulo 7 · Projeto do nível

### n4-m7-01-projeto-analise-de-dados-reais · Projeto final: análise de dados reais
- **Arquivo:** `07-projeto-do-nivel/01-projeto-analise-de-dados-reais.lvl.md` · projeto do nível (`projeto: true`) · 300 XP · 240 min · `bibliotecas: [numpy, pandas, scipy, matplotlib]` (perfil `ml`)
- **Padrão de projeto (N1/N3):** 8 passos; uma Leitura de especificação, uma Previsão, 5 exercícios de código livre e um Quiz de autoavaliação; a partir do passo 4 as funções dos passos anteriores vêm prontas num arquivo (`analise_base.py`), para o erro antigo não contaminar o passo novo.
- **Passos (8):**
  1. **Leitura · A pergunta e o dicionário de variáveis** (Mermaid do fluxo carregar → limpar → resumir → painel → teste → regressão → relatório; critérios de aprovação; KaTeX do $d$ de Cohen e do IC da diferença)
  2. **Previsão · O que o gerador entrega** (`gerar_csv` com `n` pequeno; `dtypes` e contagens)
  3. **Exercício (código) · Carregar e limpar** (`carregar(caminho)` com tipos e categorias ordenadas; `limpar(df)`: nota zero por ausência vira `NaN`, duplicatas por inscrição, faixas de renda)
  4. **Exercício (código) · Resumo por grupo** (`resumo_por_grupo(df, grupo)` com n, média, mediana, desvio e IQR)
  5. **Exercício (código) · O painel** (`painel(df)` → `Figure` com 4 eixos definidos: histograma das notas, boxplot por tipo de escola, barras da média por faixa de renda com o eixo a partir de zero, dispersão renda × nota)
  6. **Exercício (código) · Teste e tamanho de efeito** (`testar_diferenca(df, coluna, grupo_a, grupo_b)` → Welch, $d$ de Cohen e IC de 95 % da diferença)
  7. **Exercício (código) · Controlar pela renda e escrever o relatório** (`regressao_renda_nota(df)` → coeficiente de escola sem e com controle da renda; `gerar_relatorio(df)` → texto markdown com os números calculados, conferido com `match: contains` por número)
  8. **Quiz · Autoavaliação das conclusões**
- **Dados (decisão do Filipe, 2026-11-16):** amostra pequena e **real** dos microdados públicos do ENEM (INEP), com a fonte citada na leitura do passo 1 (edição, URL de download do INEP, data de acesso e o que foi recortado). Recorte: poucos milhares de inscrições sorteadas com semente fixa e só as colunas necessárias (UF da prova, presença, tipo de escola, faixa de renda do questionário, notas), gravadas como `enem_amostra.csv` dentro da lição. **Limite do formato:** cada arquivo de um passo aceita até **100 000 caracteres** (`projectFileSchema` em `packages/contracts/src/files.ts`) e o projeto inteiro até 300 000; com ~6 colunas compactas (~30 caracteres por linha) cabem ~3 000 linhas. O script que gera a amostra a partir do arquivo oficial fica registrado (fonte, semente, filtros) para quem quiser refazer. Os defeitos que a limpeza precisa achar são os reais do arquivo (ausentes, faltosos com nota em branco, códigos de questionário). A pergunta "a diferença entre escola pública e privada se mantém ao controlar pela renda?" é respondida pelos dados da amostra, conferidos no executor antes de escrever o texto. Contra números digitados à mão, os casos sorteiam uma sub-amostra da própria amostra no `setup` e conferem o relatório nela.
- **Erros que o projeto cobra:** nota 0 tratada como válida; comparar grupos sem n e dispersão; concluir causalidade; barras com eixo truncado; números digitados à mão no relatório (o caso gera os dados com outra semente e confere os números do texto).

## Prova

Meta: banco de **40 questões, 10 por tentativa** (como N2 e N3), escrito depois dos módulos, nas proporções 6 (numpy), 6 (pandas), 6 (limpeza), 4 (agregação), 5 (visualização), 11 (probabilidade e estatística) e 2 (projeto), com a alternativa correta 10 vezes em cada posição, distratores tirados das soluções erradas das lições e explicação que diz por que cada distrator falha. As 12 questões atuais são revistas contra as lições (por exemplo, "operações com `and`" já está coberta pela m1-02; a questão do `read_csv` precisa citar `encoding`; nenhuma pode depender do inteiro padrão `int64`).

## Defeitos conhecidos (fora do conteúdo)

- **Estado compartilhado entre casos do lote (Pyodide):** `np.random` legado e o pyplot guardam estado de um caso para o outro. As regras 6 e 7 contornam; o executor poderia reiniciar esses módulos entre sondas.

## Decisões do Filipe (2026-11-16)

1. **Worker quente do perfil `ml`:** no ambiente local o runner roda com `RUNNER_MEMORY=6g` e
   `RUNNER_PYODIDE_WARM=dados:1,ml:1` (cada verificação `ml` deixa de esperar ~10 s de boot). A memória da
   homologação está registrada em `docs/v2/pendencias-curso-completo.md`.
2. **`scipy` no frontmatter do m6:** fica a critério de quem escrever o módulo — tirar só das lições que
   comprovadamente não o usam (m6-01, m6-03, m6-04 são candidatas), para que voltem ao perfil `dados`.
3. **Projeto com dados reais:** amostra pequena dos microdados do ENEM (INEP), como descrito na seção do m7.
4. **Excel:** sai da m2-05 (só CSV e JSON).
5. **Horas:** em todos os níveis, `horas` = soma dos `tempo_min` das lições + 30 %, arredondada; o N4 tem 35 h
   (regra em `content/CURRICULO.md`).
