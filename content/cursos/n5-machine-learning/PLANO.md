# Plano do Nível 5 — Machine Learning

Este é o plano de autoria do Nível 5 da trilha **Python: do zero à IA**. Ele orienta a escrita das lições de `content/cursos/n5-machine-learning`. Cada lição traz: slug, título, a **sequência de passos, um a um**, com o tipo de cada passo (Leitura, Exercício — código, lacunas ou ordenar —, Previsão, Quiz), os recursos de apresentação (diagrama Mermaid, bloco `visualizar`, fórmula KaTeX) e, nos exercícios, as funções pedidas.

**Estado:** as 36 lições estão escritas e publicadas (`publicada: true`), começando pela piloto `n5-m4-01-api-fit-predict-transform`; cada módulo tem um relatório em `.claude-transfer/auditoria/n5-0{1..8}-*.md` (e `n5-plano-e-piloto.md`) com o motivo de reprovação de cada errada. As seções de cada lição abaixo foram corrigidas para o que foi escrito: as mudanças em relação ao roteiro estão em "Muda do roteiro", e as em relação à primeira versão deste plano, em "Mudou na escrita". Três verificações oficiais ainda pedem uma rodada limpa com o executor livre (ver "Decisões para o Filipe", 11). A fonte da verdade é o `.lvl.md`: se este plano e uma lição divergirem, vale a lição, e o plano é que precisa ser corrigido.

Formato dos arquivos: `content/README.md` (§3 inteira; recursos de apresentação em §3.5–§3.7; `python-dados` em §6) e `docs/v2/curso-e-passos.md` §6. Todas as 36 lições usam `runtime: python-dados` (Pyodide no executor). O N5 herda **tudo** o que o `PLANO.md` do N4 registrou em "Verificação e convenções do nível" (int32 no WebAssembly, retornos comparados por `.tolist()`/`to_dict` com tolerância, vetorização cobrada por regra de fonte e nunca por tempo, `default_rng(semente)`, pandas 3, mensagens reais); esta seção só acrescenta o que é específico de machine learning.

## Como usar este plano

1. Abra o arquivo da lição (`content/cursos/n5-machine-learning/<módulo>/<NN>-<slug>.lvl.md`).
2. Mantenha o frontmatter (`slug`, `titulo`, `descricao`, `xp`, `tempo_min`, `dificuldade`, `tipo`, `runtime`, `bibliotecas`, `objetivos`) e troque `publicada: false` por `publicada: true` quando a lição estiver verificada. Não renomeie arquivos nem slugs. As únicas mudanças de frontmatter previstas estão em "Decisões para o Filipe".
3. Substitua o passo de roteiro pelos passos **na ordem e com os tipos listados** na lição (`## Passo N · Leitura|Exercício|Previsão|Quiz · Título`).
4. Em cada exercício: `### Instruções` (lista numerada = checkpoints), `### Código inicial` (não existe no `modo: ordenar`), `### Solução`, `### Dicas` (até 3), `### Verificação` (JSON de `TestCase[]`) e `### Soluções erradas` (**pelo menos cinco**, uma por erro comum, cada uma com um defeito só).
5. Rode, em `apps/api`, com `RUNNER_URL=http://127.0.0.1:8081` e `RUNNER_TOKEN=dev-runner-token-0123456789abcdef`:
   - `pnpm -s content:check`;
   - `pnpm -s content:verify --licao <slug>` (uma lição por vez, em segundo plano: ver os tempos em "O executor");
   - `pnpm -s content:metrics --curso n5-machine-learning` (a lição escrita não pode sair "suspeita").
6. Confira que cada solução errada reprova **pelo motivo pretendido**, e não por um efeito colateral: o `content:verify` só diz que reprovou; rode `verifyStep` de `apps/api/scripts/content/verify.ts` num script de rascunho fora do repositório e imprima `result.cases` de cada errada. Para rascunhos e sondas, use `--content` com uma cópia **mínima** (só o `curso.yaml` do N5, sem a linha `prerequisito`, e o módulo da lição) num diretório de rascunho: o `content:verify` gera as Previsões de todos os cursos do diretório antes de filtrar pelo `--licao`.

## Quem é o aluno

Concluiu os Níveis 1 a 4. Do Nível 1: tipos, laços, coleções, compreensões, funções, strings, `try/except`. Do Nível 2: classes, herança e `dataclasses`, módulos, exceções próprias, arquivos, geradores, decoradores, `unittest`, type hints. Do Nível 3: contagem, somatórios, logaritmos, análise de algoritmos, **medição honesta de tempo**, recursão, ordenação estável, heaps, tabelas hash, grafos, programação dinâmica. Do Nível 4: numpy (vetorização, `axis`, máscaras, broadcasting, `solve`, `default_rng`), pandas 3 (seleção, limpeza, `groupby`, junções, datas), matplotlib (descrito por propriedades), probabilidade e estatística (distribuições, TCL, intervalos, testes, correlação), regressão linear simples e múltipla pela equação normal e um primeiro `LinearRegression().fit(...)` com `get_dummies` (m6-08).

Nunca escreveu um gradiente, nunca treinou um classificador, não conhece `Pipeline`, validação cruzada, métricas de classificação, árvores, ensembles, SVM, clustering nem PCA. Cada lição usa só o que os níveis anteriores e as lições anteriores deste nível ensinaram, na ordem dos módulos 1 a 8.

### O que o nível usa e o que não usa

- **Usa:** numpy (todo o nível), pandas (m4 em diante e projeto), scikit-learn 1.8 (m2-05 e m3 em diante), `scipy.cluster.hierarchy` e `scipy.spatial.distance` (m6-03; o scipy carrega junto com o scikit-learn, sem precisar estar em `bibliotecas`). Biblioteca padrão quando ajuda (`math`, `collections.Counter`, `re`).
- **Não usa:** `sklearn.datasets` (`load_iris`, `load_digits`, `make_classification`, `make_blobs`, `fetch_*`): **o módulo não importa no executor** (ver "O executor"); matplotlib (as curvas são devolvidas como números e descritas em texto; `PartialDependenceDisplay`, `plot_tree` e `ConfusionMatrixDisplay` ficam fora); `sklearn.utils.estimator_checks` (`check_estimator`: também não importa); XGBoost, LightGBM, CatBoost, `imblearn`, `shap`, UMAP (não existem no executor; citados em texto quando o roteiro pede); rede; Jupyter; `np.random.seed`.
- **Ponte com o Nível 4:** escore $z$ (m2-03, m4-01), equação normal e `solve` (m2-04), `default_rng` e o erro padrão da simulação (m2-02, m5-02), regressão múltipla e dummies (m4-02), testes pareados (m4-05), vazamento na imputação (m4-02, m7-01).
- **Ponte com o Nível 6:** a regra da cadeia e o grafo de computação (m1-03, base do micrograd), o laço de treino com mini-lotes (m2-02), softmax e entropia cruzada categórica (m3-06, base do MLP), `verificar_gradiente` (m1-02).

## Como usar os recursos de apresentação neste nível

### Régua (a mesma do Nível 1 e dos PLANOs auditados)

- **Passos por lição:** 7 ou 8 (o projeto tem 8). Abre com uma Leitura que motiva o assunto com um problema concreto e fecha com um Quiz de **3 perguntas de cenário** (uma situação com dados, código ou decisão; nada de definição decorada), cada uma com exatamente uma alternativa correta, distratores tirados de erros reais e explicação (`> …`) que diz por que cada distrator falha.
- **Leituras:** 250 a 350 palavras de prosa (sem contar blocos de código), com pelo menos um bloco de código ilustrativo e, quando há um erro comum, a mensagem **real** do executor (tabela em "Mensagens reais"). Sem exclamações.
- **Previsão:** pelo menos uma por lição, antes de a leitura explicar o comportamento. Código determinístico (`random_state` fixo, `default_rng(semente)`), até 20 linhas de saída, números arredondados ou `.tolist()` (nada de arrays com espaços de alinhamento).
- **Andaime:** o primeiro exercício de cada lição que estreia uma construção nova é `modo: lacunas` ou `modo: ordenar`; os seguintes são de código livre. O projeto (m8) só tem código livre. Em `lacunas`, a solução é idêntica ao código inicial fora dos `___`, e as soluções erradas são **erros que cabem nas lacunas**.
- **Exercícios:** 6 a 12 casos por exercício, verificando **comportamento** (`expr`/`call`), um comportamento por caso, com as bordas; `source` só para cobrar o "como" que é o assunto do passo (do zero, sem laço). Pelo menos **5 soluções erradas** reais, cada uma com um único defeito (nada de espantalho). O código inicial reprova. `name` em todo caso; `hint` que orienta sem entregar; `reveal` falso.
- **Dicas:** até 3 por passo; apontam o caminho, nunca o código.
- **Exemplos neutros:** nada de USP, IME, códigos de disciplina, instituições, empresas, bancos, sistemas, produtos ou pesquisas reais, e **nenhum dado real de pessoas**. Os dados são **gerados com `np.random.default_rng(semente)`** (clientes, transações, sensores, mensagens e lojas fictícios) ou escritos à mão. O projeto (m8) usa clientes **fictícios gerados** por um arquivo da lição. Conjuntos clássicos sem pessoas embutidos no scikit-learn (íris, vinhos, dígitos 8 × 8) ficam **fora enquanto o `sklearn.datasets` não importar no executor** (ver "Decisões para o Filipe"); o de câncer de mama e o de diabetes são dados de pessoas e ficam fora de qualquer jeito.
- **Imagem (`assets/`) e Vídeo:** nenhum neste nível.

### Recursos

- **Diagrama (bloco `mermaid`):** para processos: a API `fit`/`predict`/`transform` (m4-01, escrito), o grafo de computação (m1-03), o laço de treino por épocas e lotes (m2-02), `ColumnTransformer` → `Pipeline` (m4-02), treino/validação/teste e k-fold (m4-03), a árvore de decisão pequena (m5-01), os estágios do boosting (m5-03), as fusões do aglomerativo (m6-03), os quatro vazamentos (m7-01), texto → vocabulário → matriz (m3-05) e o fluxo do projeto. `flowchart` com no máximo ~8 nós, rótulos curtos; texto com parênteses, colchetes, dois-pontos ou sublinhado entre aspas.
- **Visualizador (bloco `python visualizar`):** pode usar numpy e pandas; **nunca** scikit-learn (o navegador baixaria o perfil `ml` só para rastrear). Use-o para estado que muda passo a passo: três passos de descida do gradiente (m1-02, m1-04), a votação dos vizinhos (m3-04), duas iterações do k-means (m6-02). Até 60 linhas, sem `input()`, não pode ser a solução de um exercício.
- **Fórmula (KaTeX):** normas e cosseno, derivada e gradiente, regra da cadeia, MSE/MAE/entropia cruzada, verossimilhança, $\nabla_w \text{MSE} = \tfrac{2}{n} X^\top (Xw + b - y)$, equação normal e ridge $(X^\top X + \lambda I)\,w = X^\top y$, sigmoide e softmax, precisão/recall/F1/F$\beta$, TPR/FPR e AUC, Gini, entropia e ganho, perda hinge, inércia, Mahalanobis, variância explicada, viés² + variância + ruído. Dinheiro no texto é `R\$`.

## Verificação e convenções do nível

Tudo nesta seção foi conferido no executor do compose (`RUNNER_URL=http://127.0.0.1:8081`, contêiner com 6 GB, `RUNNER_PYODIDE_WARM=dados:1,ml:1`) durante o piloto, em 2026-11-16, com sondas pelo `/v1/run` e com a lição piloto pelo `content:verify` e pelo `verifyStep`.

### O executor

- **Versões:** Python 3.14.2 (Pyodide 314.0.7), numpy 2.4.6, pandas 3.0.2, scipy 1.18.0, scikit-learn 1.8.0. `os.cpu_count()` é 1; `n_jobs=-1` e `n_jobs=2` funcionam (sem paralelismo de verdade) e não precisam ser proibidos.
- **`sklearn.datasets` não importa.** `from sklearn.datasets import ...` (qualquer função, inclusive `make_blobs`) levanta `ImportError: módulo indisponível no motor python-dados: ctypes`: o pacote importa `scipy.io`, cujo leitor de ARFF importa `ctypes`, que o guarda do executor bloqueia por segurança (`apps/runner/src/pyodide-guard.ts`). O mesmo vale para `sklearn.utils.estimator_checks` (sem `check_estimator`). Os outros submódulos importam: `linear_model`, `ensemble`, `tree`, `cluster`, `svm`, `neighbors`, `decomposition`, `model_selection`, `pipeline`, `preprocessing`, `compose`, `impute`, `metrics`, `inspection`, `feature_extraction.text`, `feature_selection`, `naive_bayes`, `dummy`, `calibration`, `manifold`, `mixture`, `covariance`, `multiclass`, `neural_network`, `kernel_approximation`, `discriminant_analysis`, `base`, `utils.validation`, `exceptions`, além de `scipy.cluster.hierarchy`, `scipy.spatial.distance`, `scipy.stats` e `scipy.optimize`. Consequência: **todo conjunto de dados é gerado com `default_rng` ou escrito à mão** (regra 8 abaixo). Os CSVs do pacote existem no disco do executor (`sklearn/datasets/data/iris.csv`, `wine_data.csv`, `digits.csv.gz`…), mas lê-los pelo caminho do pacote é truque de plataforma e não entra nas lições.
- **Perfil e espera:** toda lição com `scikit-learn` usa o perfil `ml`. Com o worker quente livre, um lote (a verificação de um aluno) da piloto levou **0,07 a 0,35 s**. A política é `fresh`: cada lote consome o worker, e o substituto leva **~9,5 s** para subir (boot `ml` medido: 9,2–12,2 s). Duas verificações seguidas com menos de ~10 s de intervalo: a segunda espera ~9,5 s. Com o `content:verify` (4 lotes simultâneos disputando boots), cada lote da piloto levou 10 a 75 s de parede, sem estourar o limite (o boot não conta nos 10 s do lote).
- **Lições só com numpy** (m1, m2-01 a m2-04) usam o perfil `dados` e não pagam o boot do `ml`. Não ponha `scikit-learn` no frontmatter de uma lição que não o importa.
- **Tempos de `fit` medidos no executor** (mediana de 3, dados gerados com `default_rng`, 1 CPU):

  | Operação | Dados | Tempo |
  |---|---|---|
  | `LogisticRegression().fit` | 1 000 × 10 / 5 000 × 20 / 30 000 × 8 | 2 ms / 5 ms / 20–40 ms |
  | `LinearRegression().fit` | 5 000 × 20 | 3 ms |
  | `DecisionTreeClassifier` | 1 000 × 10 | 6 ms |
  | `RandomForestClassifier` 20 / 100 árvores | 1 000 × 10 | 42 ms / 200 ms |
  | `RandomForestClassifier` 30 árvores | 30 000 × 8 | 0,5–0,6 s |
  | `GradientBoostingClassifier` 50 / 100 estágios | 1 000 × 10 | 0,13 s / 0,26 s |
  | `HistGradientBoostingClassifier` | 1 000 × 10 / 10 000 × 8 / 30 000 × 8 | 0,15 s / 0,20 s / 0,34–0,42 s |
  | `SVC()` (RBF) | 1 000 × 10 | 19 ms |
  | `KNeighborsClassifier` fit + predict | 1 000 × 10 | 16 ms |
  | `KMeans(4, n_init=10)` / `KMeans(4)` | 1 000 × 2 | 7 ms / 1 ms |
  | `DBSCAN` / `AgglomerativeClustering(4)` | 1 000 × 2 | 3 ms / 50 ms |
  | `PCA(5)` / `IsolationForest` | 1 000 × 10 | 0,5 ms / 107 ms |
  | `cross_val_score(Pipeline(scaler, logística), cv=5)` | 1 000 × 10 | 15 ms |
  | `GridSearchCV` 4 valores de `C` × 5 partições (logística) | 1 000 × 10 | 60 ms |
  | `GridSearchCV` 3 × 3 × 3 partições (floresta de 20) | 1 000 × 10 | 0,85 s |
  | `RandomizedSearchCV` 10 sorteios × 3 partições (floresta de 20) | 1 000 × 10 | 1,0 s |
  | `learning_curve` / `validation_curve` (logística, cv=5) | 1 000 × 10 | 55–72 ms / 63 ms |
  | `permutation_importance` (floresta de 50, 5 repetições) | 1 000 × 10 | 0,3 s |
  | Gradiente descendente da logística do zero, 2 000 / 20 000 épocas | 200 × 2 | 31–39 ms / 0,31 s |
  | k-means do zero (Lloyd vetorizado, até convergir) | 1 000 × 2 | 3–4 ms |

- **Um caso, um `main.py` novo:** como no N4, cada caso roda o `main.py` do aluno de novo, e o `setup` também; módulos são compartilhados no lote. O custo de um lote é a **soma** dos casos: um `GridSearchCV` de 0,85 s em 10 casos estoura os 10 s. Regra 9.
- **Ruído no stderr:** o primeiro uso de `threadpoolctl` no worker (KNN, k-means, algumas métricas) escreve `UserWarning: Unable to import LDSO from pyodide_js._module. This should never happen.` no stderr. Vem da montagem do Pyodide, não do código do aluno; não afeta a correção. As leituras 1 da m3-04 e da m6-02 avisam o aluno.
- **Queda do executor:** o contêiner do executor saiu **duas vezes** com **código 139** (falha de segmentação do processo Node, `OOMKilled` falso) e precisou de `docker start`: uma numa sonda grande logo depois de dezenas de lotes `ml` seguidos (a mesma sonda, repetida sozinha, rodou em 3,4 s), outra no meio de um `content:verify --licao` da piloto, sem nenhuma sonda ao lado (o verify terminou com `executor: fetch failed` em dois passos e na Previsão). Rodado de novo com o executor recém-reiniciado, o mesmo verify passou inteiro. Se o verify der `fetch failed`, confira `docker ps -a` antes de mexer na lição. Ver "Defeitos conhecidos".
- **Duração do `content:verify --licao`** da piloto: ~10 min, a maior parte gerando as Previsões de **todos** os cursos (várias `ml` do N4, ~10 s cada); os três passos levaram 288 s, 79 s e 99 s somando os lotes. Nos módulos, os verifies rodaram numa cópia do `content/` só com o N5 (trilha só com `n5-machine-learning`, `prerequisito: null`).
- **Fila cheia:** com vários verifies `ml` ao mesmo tempo (agentes diferentes), passos terminaram com `executor: fetch failed` ou "Tempo limite excedido" **sem** o contêiner reiniciar, e passaram quando repetidos sozinhos. Rode **um verify `ml` por vez** (ver "Defeitos conhecidos", 2).
- **Lotes medidos nas lições escritas** (trabalho de todos os casos de um lote, worker quente; a parede de ~10–14 s por lote no verify é o boot `ml` da política `fresh`):

  | Módulo | Lote da solução |
  |---|---|
  | m1 (perfil `dados`) | Rosenbrock com 5 000 passos: ~25 ms |
  | m2 | perfil `dados`: 0,3–0,4 s (~3 s com a `fresh` esperando o substituto); m2-05 (`ml`): ~10 s por lote, quase todo boot (um lote levou 103 s com o executor disputado, sem estourar) |
  | m3 | trabalho pequeno; o maior é o treino softmax da m3-06 (~0,12 s por caso, 2 casos) e o logístico da m3-01 (~55 ms por caso, 2 casos) |
  | m4 | m4-02: 0,242 s, 0,560 s e 0,281 s; sondas com o trabalho das outras: 0,09 s (m4-03), 0,74 s (m4-04), 0,12 s (m4-05), 0,34 s (m4-06) |
  | m5 | `HistGradientBoostingRegressor` de 300 iterações em 600 × 4: 0,27 s (só nas erradas); com parada (56 iterações): 0,05 s; `comparar_floresta_boosting`: 0,21 s; `oob_manual` com 30 árvores: 0,08 s; árvore do zero: 0,01–0,05 s por ajuste; `permutation_importance` (floresta de 30, 4 colunas, 5 repetições, 150 linhas): 0,065 s |
  | m6 | 0,05 a 0,3 s na maioria dos passos; o maior é o m6-05 p5 (9 casos com `IsolationForest` de 50 árvores em 300 linhas): 0,8 s |
  | m7 | 0,1 a 0,4 s |
  | m8 | passos 3 a 7: 0,21 s, 1,13 s, 2,17 s, 0,84 s e 0,21 s (o passo 5 passa um pouco dos ~2 s da regra 9; ver "Decisões para o Filipe", 9) |

### Regras de verificação (específicas de ML; as do N4 continuam valendo)

1. **Determinismo primeiro.** Todo estimador com sorteio recebe `random_state=semente` (o enunciado diz qual, normalmente um parâmetro `semente` da função), todo dado vem de `default_rng(semente)`, toda divisão com `shuffle=True` leva `random_state`. Com isso o mesmo código dá o mesmo modelo em todo lote, e o esperado pode ser um **número literal** calculado no executor pelo autor (com uma sonda ou a própria solução), comparado com `tolerance` (`1e-9` para contas fechadas, `1e-6` para coeficientes de solvers iterativos do scikit-learn).
2. **Modelo de referência no `setup`.** Quando o esperado é longo (previsões de 30 pontos) ou depende de dados sorteados no `setup`, o `setup` treina a referência do scikit-learn e a `expr` compara e devolve um tipo nativo: `MediaPorClasse().fit(X, y).predict(Xt).tolist() == ref.predict(Xt).tolist()` → `true` (validado na piloto contra o `NearestCentroid`). O `setup` não vai para o aluno nem para a análise de fonte, e a referência é calculada a partir das entradas, sem gabarito literal no executor (invariante 1). Cuidado: a falha só mostra `False`; escreva um `hint` que diga o que comparar. **Nunca** `assert_allclose`/`assert_array_equal` contra a referência: a mensagem do `AssertionError` traz os dois arrays.
3. **Propriedades do contrato** (`expr` com tipo nativo), uma por caso:
   - `fit` devolve o próprio objeto: `r is m` (com `r = m.fit(...)` no `setup`);
   - forma das previsões: `list(m.predict(X).shape)`; tipo: `"type": "ndarray"`;
   - rótulos e não posições: `m.predict(X).tolist()` com rótulos `str`;
   - coeficientes com o sinal certo: `[bool(c > 0) for c in m.coef_.ravel()]`;
   - piso de desempenho (só onde o valor exato depende de escolhas legítimas do aluno, como épocas de um gradiente do zero): `bool(m.score(Xt, yt) >= 0.85)`, com o piso pelo menos 5 pontos abaixo do que a solução atinge;
   - `is_classifier(m)` / `is_regressor(m)` (de `sklearn.base`);
   - `NotFittedError` antes do `fit`: `"raises": "NotFittedError"` (casa pelo sufixo do nome no MRO; um `AttributeError` comum não passa);
   - `get_params()` e `clone(...)` (hiperparâmetro copiado, atributos aprendidos ausentes);
   - funciona nas ferramentas: `cross_val_score(Est(), X, y, cv=3).tolist()` com esperado literal.
4. **Retornos do scikit-learn no executor** (complementa a regra 3 do N4): `predict`, `predict_proba`, `transform`, `coef_`, `cross_val_score` e `classes_` são `ndarray` (compare por `.tolist()`); `score`, `accuracy_score` e as outras métricas de `sklearn.metrics` devolvem `float` do Python; o `intercept_` da `LinearRegression` é `numpy.float64` (peça `float(...)`) e o da `LogisticRegression` é `ndarray`; `predict` de um `y` feito com `astype(int)` sai `int32`. `cv_results_` é um `dict` de arrays: converta antes de devolver.
5. **"Do zero" contra o scikit-learn.**
   - **Proibir a biblioteca no exercício:** `{ "kind": "source", "rule": { "type": "not_calls", "name": "sklearn" } }` com `name` "Implementa sem o scikit-learn". Validado: o nome do módulo de primeiro nível entra nos nomes citados da AST em `from sklearn.x import Y`, `import sklearn.x as z` e em importações dentro de funções; `import numpy` não dispara. Não existe regra `not_imports`, e `not_uses import` proibiria o numpy. Quando o exercício permite o scikit-learn mas não o estimador pronto, use `not_calls` com o nome da classe (`NearestCentroid`, `KMeans`, `PCA`), como na piloto.
   - **Comparar com o scikit-learn:** a referência fica no `setup` (regra 2), nunca na solução.
   - **Tolerâncias medidas:** gradiente descendente da logística do zero (200 × 2 padronizado, taxa 0,1, 2 000 épocas) contra `LogisticRegression(C=np.inf)`: diferença máxima de 0,0027 nos coeficientes e 100 % de concordância nas previsões; com 20 000 épocas, 0,0004. Para soluções iterativas do zero, compare **previsões** (concordância ≥ 0,98) ou coeficientes com `tolerance` de `1e-2`, nunca `1e-6`. Contas fechadas (equação normal, ridge, PCA por SVD) batem com o scikit-learn a `1e-8`.
   - **Rótulos de clustering são permutáveis:** compare partições com `adjusted_rand_score(rotulos, ref.labels_) == 1.0` (o k-means do zero da sonda deu ARI 1,0 contra `KMeans(4, random_state=0)`) ou centróides ordenados (`sorted(map(tuple, C.round(6).tolist()))`). Componentes do PCA têm sinal arbitrário: compare `np.abs(...)` ou alinhe o sinal pela maior coordenada.
6. **Vazamento: espiões e valores.** Validado na piloto (`escalar_treino_teste`):
   - **objeto instrumentado injetado:** a função recebe o transformador como parâmetro (como o relógio injetado do Nível 3) e o caso passa um espião definido no `setup`, que anota numa lista do `setup` o número de linhas de cada `fit`:
     ```python
     chamadas = []
     class Espiao(StandardScaler):
         def fit(self, X, y=None, sample_weight=None):
             chamadas.append(len(X))
             return super().fit(X, y, sample_weight)
     ```
     Esperado `[4]` (um ajuste, com as 4 linhas do treino). As erradas deram `[6]` (ajuste no conjunto inteiro), `[4, 2]` (`fit_transform` também no teste), `[2]` (ajuste no teste) e `[]` (ignora o objeto recebido). O `fit_transform` herdado chama o `fit` sobrescrito; a lista fica fora da instância para pegar também um `clone`. Para validação cruzada, o espião anota `len(X)` de cada partição e o esperado é a lista dos tamanhos de treino;
   - **valores:** o teste transformado com as estatísticas do treino é literal; "ajusta no conjunto inteiro" muda os números (no piloto, de `0.5345…` para `0.6761…`) e "`fit_transform` no teste" leva um teste de uma linha a zero;
   - **atributos aprendidos:** depois da chamada, o objeto recebido guarda a média do treino (`e.mean_.tolist()`);
   - **não usar monkeypatch** de classe da biblioteca no `setup` (`StandardScaler.fit = ...`): os módulos são compartilhados no lote, e o remendo vazaria para os casos seguintes.
7. **Avisos não são verificados.** A correção olha valores; `ConvergenceWarning`, `FutureWarning` e `UserWarning` vão para o stderr e não reprovam ninguém. Quando um aviso é o assunto (convergência), o caso olha o efeito: `m.n_iter_` igual ao `max_iter`, ou o valor dos coeficientes.
8. **Dados sem `sklearn.datasets`:** substitua `make_blobs`, `make_classification`, `make_moons` e afins por funções da própria lição, num arquivo `dados_<tema>.py` determinístico (`default_rng(semente)`), ou por dados sorteados no `setup`. Exemplos que a piloto usa: três nuvens normais em 2D com `rng.normal(c, 1.0, size=(20, 2))` e rótulos por `np.repeat` (contagens sorteadas com `rng.integers` precisam de `.astype(np.intp)`: ver "Comportamentos do executor que pegam desprevenido"). Textos (m3-05) são frases fictícias escritas à mão; os símbolos 5 × 5 da m3-06 (`padroes.py`) substituem os dígitos. Cada lição traz o seu gerador (`dados_regressao.py`, `mensagens.py`, `padroes.py`, `dados_clientes.py`, `dados_busca.py`, `clientes.py`, `consumo.py`, `pecas.py`, `sensores.py`, `nuvens.py`, `formas.py`, `medidas.py`, `transacoes.py`, `assinantes.py`, `dados_credito.py`).
9. **Orçamento do lote:** some o trabalho de todos os casos (cada um roda `main.py` + `setup` + expressão) e mantenha a solução abaixo de **~2 s por lote** (5 vezes de folga sobre os 10 s, porque a solução do aluno pode ser mais lenta e a máquina é compartilhada). Na prática: até ~500 linhas nos casos; buscas (`GridSearchCV`, `RandomizedSearchCV`, `learning_curve`) com no máximo ~12 ajustes por chamada e em no máximo 2 casos; florestas com até 30 árvores; o conjunto grande (30 000 linhas do projeto) só no "Executar" do aluno, nunca nos casos. Meça a solução com o worker quente antes de fechar o passo (piloto: 0,07–0,35 s por lote; os outros módulos em "O executor"). Nada de `fit` no nível do módulo do `main.py`: ele roda em todo caso, e **com `__name__ == "__main__"`** (conferido no m8), então um bloco `if __name__ == "__main__":` que ajusta modelos também roda em todo caso.
10. **`call` ou `expr`:** como no N4. `call` só para funções puras com argumentos JSON (métricas, contagens, `custo_da_busca`). Tudo que recebe um estimador, uma função ou um array usa `expr` com `setup` (o `call` não passa funções nem objetos: o roteiro de várias lições pedia `call` com `f`, `modelo` ou `modelo_factory` e muda para `expr`).

### Mensagens reais (scikit-learn 1.8.0, conferidas no executor)

Use exatamente estas, sem o traceback:

| Situação | Mensagem |
|---|---|
| `predict`/`transform` antes do `fit` | `NotFittedError: This LogisticRegression instance is not fitted yet. Call 'fit' with appropriate arguments before using this estimator.` (o nome da classe muda) |
| `modelo.coef_` antes do `fit` | `AttributeError: 'LogisticRegression' object has no attribute 'coef_'` (**não** é `NotFittedError`; o roteiro da m4-01 dizia o contrário) |
| `X` com uma dimensão no `fit` ou no `predict` | `ValueError: Expected 2D array, got 1D array instead:` + o array + `Reshape your data either using array.reshape(-1, 1) if your data has a single feature or array.reshape(1, -1) if it contains a single sample.` |
| `predict` com outro número de colunas | `ValueError: X has 2 features, but LinearRegression is expecting 3 features as input.` |
| `X` e `y` de tamanhos diferentes (também no `train_test_split`) | `ValueError: Found input variables with inconsistent numbers of samples: [50, 40]` |
| classificador com `y` contínuo | `ValueError: Unknown label type: continuous. Maybe you are trying to fit a classifier, which expects discrete classes on a regression target with continuous values.` |
| `LogisticRegression` com uma classe só | `ValueError: This solver needs samples of at least 2 classes in the data, but the data contains only one class: np.float64(0.0)` |
| `NaN` em `X` | `ValueError: Input X contains NaN.` + `LogisticRegression does not accept missing values encoded as NaN natively…` (sugere `HistGradientBoosting` ou um imputador; o nome da classe muda: o `GradientBoostingRegressor` dá a mesma mensagem, e o `HistGradientBoostingRegressor` aceita `NaN`) |
| texto em `X` | `ValueError: could not convert string to float: np.str_('a')` |
| `max_iter` pequeno / dados sem escala | aviso `ConvergenceWarning: lbfgs failed to converge after 2 iteration(s) (status=1): STOP: TOTAL NO. OF ITERATIONS REACHED LIMIT` + `Increase the number of iterations…` e `You might also want to scale the data…` |
| `LogisticRegression(penalty=...)` (qualquer valor) | aviso `FutureWarning: 'penalty' was deprecated in version 1.8 and will be removed in 1.10. … Use l1_ratio=0 instead of penalty='l2', l1_ratio=1 instead of penalty='l1', and C=np.inf instead of penalty=None.` |
| `LogisticRegression(C=np.inf)` | aviso `UserWarning: Setting penalty=None will ignore the C and l1_ratio parameters` (e ajusta sem regularização) |
| `LogisticRegression(penalty="l1")` com o solver padrão | `ValueError: Solver lbfgs supports only 'l2' or None penalties, got l1 penalty.` (além do `FutureWarning`) |
| `LogisticRegression(multi_class="ovr")` | `TypeError: LogisticRegression.__init__() got an unexpected keyword argument 'multi_class'` (saiu na 1.8) |
| `OneHotEncoder(sparse=False)` | `TypeError: OneHotEncoder.__init__() got an unexpected keyword argument 'sparse'` (use `sparse_output=False`) |
| categoria nova no `transform` sem `handle_unknown` | `ValueError: Found unknown categories ['c'] in column 0 during transform` |
| `KNeighborsClassifier(n_neighbors=60)` com 50 amostras | `ValueError: Expected n_neighbors <= n_samples_fit, but n_neighbors = 60, n_samples_fit = 50, n_samples = 50` |
| `set_params`/grade com nome inválido | `ValueError: Invalid parameter 'alpha' for estimator LogisticRegression(). Valid parameters are: ['C', 'class_weight', …].` |
| grade de `Pipeline` sem o prefixo da etapa (`{"C": [...]}`) | `ValueError: Invalid parameter 'C' for estimator Pipeline(steps=[…]). Valid parameters are: ['memory', 'steps', 'transform_input', 'verbose'].` |
| `cv=5` com uma classe de 2 exemplos | aviso `UserWarning: The least populated class in y has only 2 members, which is less than n_splits=5.` (e roda) |
| `roc_auc_score` com uma classe só | aviso `UndefinedMetricWarning: Only one class is present in y_true. ROC AUC score is not defined in that case.` e devolve `nan` |
| estimador próprio que guarda o parâmetro com outro nome | `AttributeError: 'MeuClassificador' object has no attribute 'k'` (no `get_params`, no `repr`, no `clone` e no `cross_val_score`) |
| estimador próprio que altera o parâmetro no `__init__` (`list(colunas)`, `k * 2`) | `RuntimeError: Cannot clone object Selecao(colunas=[0, 1]), as the constructor either does not set or modifies parameter colunas` |
| `__init__(self, *args)` | `RuntimeError: scikit-learn estimators should always specify their parameters in the signature of their __init__ (no varargs). …` |
| `fit` sem `return self`, encadeado | `AttributeError: 'NoneType' object has no attribute 'predict'` (o `cross_val_score` não encadeia e **não** acusa) |
| `from sklearn.datasets import ...` | `ImportError: módulo indisponível no motor python-dados: ctypes` |
| `M @ P` com formas incompatíveis (m1-01) | `ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 5 is different from 2)` |
| `np.linalg.solve(Xb @ Xb.T, Xb.T @ y)` (m2-04) | `ValueError: solve1: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (m,m),(m)->(m) (size 3 is different from 100)` |
| `np.linalg.solve(Xb, y)` com `Xb` não quadrada (m2-04) | `LinAlgError: Last 2 dimensions of the array must be square` |
| `GroupKFold` sem `groups=` (m4-03) | `ValueError: The 'groups' parameter should not be None.` |
| `KFold` sem embaralhar em dados ordenados por classe (m4-03) | aviso `FitFailedWarning` com `ValueError: This solver needs samples of at least 2 classes in the data, but the data contains only one class: np.int32(0)` e `nan` na partição |
| distribuição do `scipy.stats` num `GridSearchCV` (m4-04) | `TypeError: Parameter grid for parameter 'modelo__C' needs to be a list or a numpy array, but got <scipy.stats._distn_infrastructure.rv_continuous_frozen object at 0x...> (of type rv_continuous_frozen) instead. Single values need to be wrapped in a list with one element.` |
| `score` de uma busca com `refit=False` (m4-04) | `AttributeError: This GridSearchCV instance was initialized with refit=False. score is available only after refitting on the best parameters. You can refit an estimator manually using the best_params_ attribute` |
| `pipeline.coef_` (m4-02) | `AttributeError: 'Pipeline' object has no attribute 'coef_'` (use `named_steps`) |
| listas de colunas trocadas no `SimpleImputer(strategy="median")` (m4-02) | `ValueError: Cannot use median strategy with non-numeric data: could not convert string to float: 'basico'` |
| `DecisionTreeClassifier(max_depth=0).fit` (m5-01) | `InvalidParameterError: The 'max_depth' parameter of DecisionTreeClassifier must be an int in the range [1, inf) or None. Got 0 instead.` |
| `oob_score_` sem `oob_score=True` (m5-02) | `AttributeError: 'RandomForestClassifier' object has no attribute 'oob_score_'` |
| floresta com poucas árvores e `oob_score=True` (m5-02) | aviso `UserWarning: Some inputs do not have OOB scores. This probably means too few trees were used to compute any reliable OOB estimates.` |
| `coef_` de um `SVC` com kernel não linear (m6-01) | `AttributeError: coef_ is only available when using a linear kernel` |
| silhueta com um grupo só (m6-02) | `ValueError: Number of labels is 1. Valid values are 2 to n_samples - 1 (inclusive)` |
| matriz de distâncias quadrada no `linkage` (m6-03) | aviso `ClusterWarning: The symmetric non-negative hollow observation matrix looks suspiciously like an uncondensed distance matrix` |
| `PCA(2)` ajustado num teste de uma linha (m6-04) | `ValueError: n_components=2 must be between 0 and min(n_samples, n_features)=1 with svd_solver='full'` |
| `predict` do LOF sem `novelty=True` / `fit_predict` com `novelty=True` (m6-05) | `AttributeError: This 'LocalOutlierFactor' has no attribute 'predict'` / `... 'fit_predict'` |
| `fit` com `-inf` em `X` (m7-03) | `ValueError: Input X contains infinity or a value too large for dtype('float64').` |
| `KBinsDiscretizer(strategy="quantile")` sem `quantile_method` (m7-03) | aviso `FutureWarning: The current default behavior, quantile_method='linear', will be changed to quantile_method='averaged_inverted_cdf' in scikit-learn version 1.9 …` |
| `import imblearn` (m7-02) | `ModuleNotFoundError: No module named 'imblearn'` |
| `rng.choice(..., replace=False)` com `size` maior que a população (m7-02) | `ValueError: Cannot take a larger sample than population when replace is False` |
| coluna de texto no `ColumnTransformer` com `remainder="passthrough"` dentro do `cross_val_score` (m8) | `could not convert string to float: 'A'`, e o `cross_val_score` levanta `All the 5 fits failed` |

Comportamentos do scikit-learn 1.8 que as lições precisam mostrar:

- `class C(BaseEstimator, ClassifierMixin)` faz `is_classifier(C())` dar `False` (as tags vêm da primeira base); o `score` funciona, mas o `cross_val_score(C(), X, y, cv=3)` usa `KFold` sem estratificar e, com `y` ordenado por classe, dá `[0, 0, 0]`. A ordem certa é `ClassifierMixin, BaseEstimator` (o mesmo para `RegressorMixin`, `TransformerMixin`).
- O `set_params` depois do `fit` só troca o hiperparâmetro: o `coef_` continua o do último `fit` (conferido).
- `float(...)` de um `float` e `int(...)` de um inteiro pequeno devolvem **o mesmo objeto**, então `self.taxa = float(taxa)` passa no `clone`; não use isso como exemplo de erro de clonagem (use `list(colunas)`).
- O `check_is_fitted(self)` procura atributos terminados em `_` e exige que a classe tenha `fit`.
- O `StandardScaler` usa o desvio populacional e `scale_ = 1` numa coluna constante (a coluna sai toda zero, sem `nan`); `StandardScaler(copy=False)` padroniza o array recebido no lugar.
- Sem regularização na logística: `LogisticRegression(C=np.inf)`; o `penalty=None` do roteiro da m3-01 dá `FutureWarning` na 1.8. O `C=np.inf` ajusta os mesmos coeficientes e escreve só `UserWarning: Setting penalty=None will ignore the C and l1_ratio parameters` no stderr (aviso da própria biblioteca; a leitura da m3-01 avisa o aluno).
- Existem e importam: `TargetEncoder` (m7-03), `sklearn.inspection.partial_dependence` (m5-04), `sklearn.manifold.TSNE` (m6-04).
- `n_jobs=-1` roda (com 1 CPU), sem erro.

### Comportamentos do executor que pegam desprevenido (conferidos nos módulos 1–8)

- **Ponto flutuante sem aviso:** o numpy do Pyodide não sinaliza exceções de ponto flutuante. `np.log(0)` dá `-inf` **sem** `RuntimeWarning: divide by zero`; `np.exp(1000.0)` é `inf` e `inf / inf` é `nan`; `np.mean` de array vazio e `np.var(ddof=1)` de um valor dão `nan`; um gradiente que diverge vira `inf` e depois `nan` (na m2-03, só depois de ~46 épocas, por isso os casos usam 100), tudo sem aviso. As leituras não citam o aviso. `σ(40)` já é exatamente `1.0`.
- **Contas no limite (m1):** `np.prod(np.full(2000, 0.6))` dá `5e-324`, e não `0.0` (o produto para no menor subnormal); com 0,3 ou 0,5 zera (a Previsão da m1-05 usa 0,3). `1 - 1e-12` não é exato: `-log(1 - (1 - 1e-12))` dá 27,63104… e `-log(1e-12)` dá 27,63102… (tolerância 1e-3 nesses casos). Erro da diferença central para $e^x$ em $x = 1$: 5,9e-11 com `h = 1e-5`, 6,6e-9 com `1e-8`, 2,1e-4 com `1e-12`, 4,6e-4 com `1e-13`; `3.0 + 1e-20 == 3.0`.
- **Matriz singular sem erro:** `np.linalg.solve` e `inv` com matriz **exatamente** singular (coluna repetida) devolvem `nan` em todas as posições no executor; no computador do aluno, o mesmo código levanta `LinAlgError: Singular matrix` (a Previsão da m2-04 depende disso; ver "Decisões para o Filipe", 4). Com uma coluna combinação linear das outras, o determinante sai −3,5e-10 a −3,6e-13 (não zero) e o `solve` devolve números sem sentido, sem aviso: confira o posto (`matrix_rank`), não o `det == 0` (m2-04, m6-05). `lstsq` devolve a solução de norma mínima. `LinAlgError` herda de `ValueError`.
- **`nan` em mínimos:** `np.argmin` de um array com `nan` devolve a posição do `nan`; `min([3.0, nan, 1.0])` dá `1.0` e `min([nan, 3.0, 1.0])` dá `nan` (m2-03).
- **Inteiros do WebAssembly:** `np.repeat` com contagens `int64` (as de `rng.integers`) falha com `TypeError: Cannot cast array data from dtype('int64') to dtype('int32') according to the rule 'safe'` (o `intp` é `int32`): use `.astype(np.intp)` antes (m4-03). `np.flatnonzero` devolve `int32` (o `.tolist()` dá `int`); `rank_test_score` é `numpy.int32`; um `np.int32` num retorno não serializa e reprova todos os casos (m1-05).
- **`bool` do numpy:** em numpy 2, `type(np.True_).__name__` é `'bool'`, igual ao do Python; um caso `type(x).__name__ == "bool"` não separa os dois. Use `type(x) is bool`. Num caso `call`, um `np.True_` devolvido não é igual a `true` (m4-05).
- **Tuplas** devolvidas num caso `call` são comparadas como listas JSON (`[(4, 6), ...]` casa com `[[4, 6], ...]`).
- **pandas 3:** colunas de texto com `np.nan` viram `StringDtype(storage='python', na_value=nan)`; `SimpleImputer(strategy="most_frequent")` e `OneHotEncoder` funcionam com elas, e sem imputador o `OneHotEncoder` cria a categoria `nan` (`cat__plano_nan`). `dt.dayofweek`, `dt.month` e `dt.hour` saem `int32`.
- **Pré-processamento:** um `OneHotEncoder` sem `sparse_output=False` dentro de um `ColumnTransformer` saiu denso (o `sparse_threshold=0.3` decide pela densidade total), então "esquecer o `sparse_output`" não é errada confiável. `CountVectorizer.fit` chama o `fit_transform`: o espião sobrescreve só o `fit_transform`, senão conta duas vezes. A assinatura é `SelectKBest.fit(self, X, y=None)`. `TargetEncoder.fit_transform(X, y)` ≠ `fit(X, y).transform(X)` (*cross fitting*); com `target_type="continuous"` ele usa `KFold`, e com alvo binário (ou `"auto"`), `StratifiedKFold` (m7-03).
- **Métricas:** `confusion_matrix` com uma classe só devolve 1 × 1 (`labels=[0, 1]` força 2 × 2); `mean_absolute_percentage_error` com `y = 0` devolve 1,5e15 sem aviso; `r2_score` com `y` constante dá 0,0. `KNeighborsRegressor(weights="distance")` com vizinho a distância zero dá peso 1 aos zeros e 0 ao resto, sem aviso.
- **Buscas:** o `best_params_` de uma busca aleatória com distribuição do `scipy.stats` traz `numpy.float64` (converta para `float`).
- **Árvores e ensembles (m5):** o limiar do scikit-learn sai do `X` em `float32` (`0.8149999976158142` no lugar de `0.815`): compare limiares a `1e-6`. Sem limite de profundidade, há empates de ganho nos nós fundos e o scikit-learn percorre os atributos numa ordem sorteada: compare uma árvore do zero só em profundidades rasas. O `train_score_` do `GradientBoostingRegressor` é o MSE (não a metade). No 1.8, `HistGradientBoostingRegressor.fit` aceita `X_val`, `y_val` e `sample_weight_val`; `early_stopping="auto"` só liga acima de 10 000 linhas (com 600, `n_iter_` = `max_iter`). `partial_dependence(..., custom_values={j: grade})` existe; com `method="auto"` num gradient boosting ele usa `recursion`, e os valores saem deslocados em relação ao `brute` (sem a previsão inicial): compare com `method="brute"`.
- **Não supervisionado (m6):** `KMeans(n_init="auto")` é 1 execução com k-means++ no 1.8. O `PCA` do 1.8 deixa positiva a coordenada de maior valor absoluto de cada componente, e o `svd_solver="auto"` escolheu `"covariance_eigh"` com 40 a 2 000 linhas e 4 colunas; o `eigh` devolve os autovalores em ordem crescente e os autovetores nas colunas. `PCA(n_components=fração)` escolhe o menor $k$ cuja variância acumulada **passa** da fração (com duas direções de variância igual, `PCA(0.5)` dá 2). No `IsolationForest`, `score_samples` tem o sinal trocado (menor é mais anômalo); `contamination="auto"` marcou 30 de 300 contra 9 com 0,03.
- **Vazamento sem efeito visível:** na m3-05, ajustar o vetorizador com treino + teste não mudou nenhuma previsão do `MultinomialNB`; só o espião e o tamanho do vocabulário pegam o vazamento (com mais dados de teste pode mudar).

### Previsão e visualizador

- **Previsão** funciona com scikit-learn (a piloto tem uma); cada Previsão `ml` custa um boot no build. Arredonde coeficientes (`round(float(c), 6)`) e use `.tolist()`; fixe `random_state`. Uma regressão em pontos exatamente sobre a reta dá `2.0 1.0` com `round(..., 6)`.
- **Sorteio não se prevê lendo o código:** quatro Previsões do roteiro pediam um número sorteado (positivos sem `stratify` na m4-03, fração única de um bootstrap na m5-02, AUC de validação cruzada na m7-01, `gerar_clientes(200, 7)` no m8). Viraram dados escritos à mão ou comparações que dão para prever (`True`, contagens); os números sorteados foram para a leitura ou a narrativa do exercício. O mesmo vale para métricas que o aluno não calcula de cabeça (RMSE por grau na m4-06).
- **Visualizador:** numpy e pandas sim, scikit-learn não (regra do N4).

### Dosagem por módulo

Como foi escrita (contagens dos relatórios de cada módulo). Mermaid e Visualizar = número de blocos; "Leituras com fórmula" = passos de Leitura com KaTeX (a meta da primeira versão deste plano entre parênteses quando o escrito difere).

| Módulo | Lições | Mermaid | Visualizar | Leituras com fórmula | Exercício (lacunas) | Exercício (ordenar) | Exercício (código) | Previsão | Imagens (assets) |
|---|---|---|---|---|---|---|---|---|---|
| 1 · Matemática para ML | 5 | 1 | 2 | 15 (14) | 4 | 1 | 10 | 5 | 0 |
| 2 · Regressão linear do zero | 5 | 1 | 0 | 13 (10) | 4 | 1 | 10 | 5 | 0 |
| 3 · Classificação | 6 | 1 | 1 | 17 (12) | 5 | 1 | 12 | 6 | 0 |
| 4 · scikit-learn na prática | 6 | 3 | 0 | 7 | 5 (4) | 1 | 12 | 6 | 0 |
| 5 · Árvores e ensembles | 4 | 2 | 0 | 11 (6) | 4 | 0 | 8 | 4 | 0 |
| 6 · SVM e não supervisionado | 5 | 1 | 1 | 14 (7) | 5 | 0 | 10 | 5 | 0 |
| 7 · Boas práticas | 4 | 1 | 0 | 9 (3) | 4 | 0 | 8 | 4 | 0 |
| 8 · Projeto do nível | 1 | 1 | 0 | 1 | 0 | 0 | 5 | 1 | 0 |
| **Total** | **36** | **11** | **4** | **87 (60)** | **31 (30)** | **4** | **75** | **36** | **0** |

No m4, as lacunas são 5 (piloto, 02, 03, 05 e 06): as seções por lição já pediam 5, e a tabela original dizia 4. O relatório do m4 conta as leituras com fórmula "em bloco". Ver "Decisões para o Filipe", 7.

## Estrutura do nível

8 módulos · 36 lições (1 projeto de nível) · 31,6 h de lições (1 895 min) + prova (45 min) · 4 340 XP · `horas: 41` no `curso.yaml` (1 895 min + 30 %, a regra do `content/CURRICULO.md`, já confere) · prova com banco de **40 questões (10 por tentativa)**, na proporção das lições de cada módulo: 5, 5, 7, 7, 4, 6, 4 e 2, com a alternativa correta 10 vezes em cada posição (meta; hoje são 12).

| # | Módulo | Lições | Minutos | XP | Perfil |
|---|---|---|---|---|---|
| 1 | Matemática para ML (`matematica-para-ml`) | 5 | 220 | 540 | `dados` |
| 2 | Regressão linear do zero (`regressao-linear-do-zero`) | 5 | 235 | 570 | `dados` (m2-05: `ml`) |
| 3 | Classificação (`classificacao`) | 6 | 300 | 720 | `ml` |
| 4 | scikit-learn na prática (`scikit-learn-na-pratica`) | 6 | 285 | 690 | `ml` |
| 5 | Árvores e ensembles (`arvores-e-ensembles`) | 4 | 205 | 490 | `ml` |
| 6 | SVM e não supervisionado (`svm-e-aprendizado-nao-supervisionado`) | 5 | 245 | 590 | `ml` |
| 7 | Boas práticas de ML (`boas-praticas-de-ml`) | 4 | 180 | 440 | `ml` |
| 8 | Projeto do nível (`n5-projeto-do-nivel`) | 1 | 240 | 300 | `ml` |

## Módulo 1 · Matemática para machine learning

Vetores e matrizes, derivadas e gradiente, regra da cadeia, custo e otimização, verossimilhança. `bibliotecas: [numpy]`, perfil `dados`. Nenhum exercício usa scikit-learn.

### n5-m1-01-vetores-matrizes-e-geometria · Vetores, matrizes e geometria dos dados (escrita e verificada)
- **Arquivo:** `01-matematica-para-ml/01-vetores-matrizes-e-geometria.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Uma tabela é uma nuvem de pontos** (KaTeX: $X \in \mathbb{R}^{n \times d}$, normas L1 e L2, distância euclidiana; linhas são amostras, colunas são atributos; `np.linalg.norm(..., axis=1)`)
  2. **Previsão · Formas de X @ w** (`shape` de `X @ w` com `w` `(d,)` e `(d, 1)`, `X.T @ X`, `norm` sem e com `axis`; inclui `(3,) - (3, 1)` → `(3, 3)`)
  3. **Exercício (lacunas) · Distâncias de um ponto a todos** (`distancias_a_todos(X, x, ordem=2)` → array `(n,)`, L1 ou L2; sem laço)
  4. **Leitura · Produto escalar, cosseno e projeção** (KaTeX: $\cos\theta$, $\text{proj}_u v = \frac{v \cdot u}{u \cdot u} u$; base do kNN e do PCA)
  5. **Exercício (código) · Similaridade e projeção** (`cosseno_par_a_par(X)` → matriz $n \times n$, linha nula → 0; `projetar(v, u)` com `ValueError` para `u` nulo)
  6. **Leitura · Matrizes como transformações e posto** (KaTeX: rotação e escala 2D; `X @ M.T` transforma cada linha; posto e colunas colineares em uma frase, com `matrix_rank`)
  7. **Exercício (código) · Transformar e achar colinearidade** (`aplicar_transformacao(pontos, M)`; `atributos_colineares(X)` → `bool` pelo posto)
  8. **Quiz · Geometria dos dados**
- **Muda do roteiro:** `cosseno_par_a_par`, `projetar`, `aplicar_transformacao` e `atributos_colineares` viram `expr` (recebem arrays); "matrizes como transformações visualizadas" vira texto e números (sem matplotlib). O quiz sobre formas de `X @ w` vira a Previsão.
- **Mudou na escrita:** o "laço Python (reprova só no `source`)" não está aqui: o exercício sem laço é de lacunas, e um laço não cabe nas lacunas (o caso de laço ficou na m1-03).
- **Erradas típicas:** `norm` sem `axis` (um número só); linhas e colunas trocadas (`X.T`); divisão por norma zero (`nan`); `M @ pontos` no lugar de `pontos @ M.T`; `ord=1` ignorado; determinante de `XᵀX` igual a zero no lugar do posto (−3,6e-13 numa combinação linear).
- **Resultado:** 9, 11 e 11 casos; 6, 8 e 6 soluções erradas.

### n5-m1-02-derivadas-e-gradiente · Derivadas e gradiente (escrita e verificada)
- **Arquivo:** `01-matematica-para-ml/02-derivadas-e-gradiente.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · A inclinação num ponto** (KaTeX: definição da derivada, regras de potência, exponencial e logaritmo; diferença para frente e central $\frac{f(x+h) - f(x-h)}{2h}$, ordens $h$ e $h^2$)
  2. **Previsão · O erro de cada h** (ordens de grandeza do erro com `.0e`, inclusive `h = 1e-13` e `h = 1e-20`; o erro volta a crescer com `h` minúsculo)
  3. **Exercício (lacunas) · Derivada central** (`derivada_central(f, x, h=1e-5)`; casos `expr` com `f` definida no `setup`; a narrativa explica o cancelamento)
  4. **Leitura · Derivadas parciais e o vetor gradiente** (KaTeX: $\nabla f$; erro relativo, ponto de inteiros, cópia do ponto)
  5. **Exercício (código) · Gradiente numérico e verificador** (`gradiente_numerico(f, ponto, h=1e-5)` → array, com o ponto intacto e funcionando com ponto de inteiros; `verificar_gradiente(f, grad, ponto, tol=1e-6)` → `bool` pelo erro relativo $\lVert a - n \rVert / \max(1, \lVert a \rVert, \lVert n \rVert) \le$ `tol`, a ferramenta usada no nível inteiro e no Nível 6)
  6. **Leitura · O gradiente aponta para cima** (KaTeX: $x \leftarrow x - \eta \nabla f(x)$; Visualizar: três passos de descida em $f(x, y) = x^2 + 3y^2$ em Python puro; gradiente da quadrática)
  7. **Exercício (código) · Gradiente de uma quadrática e um passo** (`gradiente_quadratica(A, b, x)` de $\tfrac12 x^\top A x - b^\top x$ com `A` **não necessariamente simétrica** → $\tfrac12(A + A^\top)x - b$; `passo_de_descida(grad, x, taxa)` sem alterar `x`)
  8. **Quiz · Direção do gradiente**
- **Muda do roteiro:** `derivada_numerica(f, x, h)` e `gradiente_numerico(f, ponto)` com `call` viram `expr` (o `call` não passa funções). `passo_de_descida(f, grad, x, taxa)` perde o `f`, que não era usado.
- **Mudou na escrita:** com `A` simétrica, como a primeira versão dizia, a errada "`A x` sem simetrizar" seria indistinguível da solução; por isso `A` pode não ser simétrica.
- **Erradas típicas:** diferença para frente; `h` não dividido por 2; `/ 2 * h` sem parênteses; esquecer um termo do gradiente (`A x` sem simetrizar); `+` no passo; alterar `x` no lugar; gradiente da quadrática como `A @ x + b`; erro absoluto no verificador; `numpy.bool` devolvido.
- **Resultado:** 7, 12 e 10 casos; 5, 8 e 6 soluções erradas.

### n5-m1-03-regra-da-cadeia-e-funcoes-compostas · Regra da cadeia e funções compostas (escrita e verificada)
- **Arquivo:** `01-matematica-para-ml/03-regra-da-cadeia-e-funcoes-compostas.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Funções dentro de funções** (KaTeX: $\frac{d}{dx} f(g(x)) = f'(g(x))\, g'(x)$; Mermaid: grafo de $f = (a \cdot b + c)^2$ com as derivadas locais)
  2. **Previsão · Os números do grafo** (para $a = 2, b = -3, c = 10$: valores para frente, derivadas para trás e a diferença central, impressos)
  3. **Exercício (ordenar, 3 distratores) · Retropropagação à mão** (`backprop_manual(a, b, c)` → `(f, df_da, df_db, df_dc)`)
  4. **Leitura · Sigmoide e perda logística** (KaTeX: $\sigma' = \sigma(1 - \sigma)$; $\frac{\partial L}{\partial w} = (\sigma(z) - y)\,x$)
  5. **Exercício (código) · Derivadas da logística** (`derivada_sigmoide(z)` vetorizada; `grad_perda_logistica(w, b, x, y)` → `(dw, db)` para um exemplo, conferida com o `verificar_gradiente` no `setup`)
  6. **Leitura · O custo quadrático de um modelo linear** (KaTeX: derivadas de $(y - wx - b)^2$ em $w$ e $b$, média sobre os dados; o sinal)
  7. **Exercício (código) · Gradiente do custo quadrático** (`grad_custo_quadratico(w, b, x, y)` → `(dw, db)` médios, sem laço)
  8. **Quiz · A ordem das derivadas**
- **Erradas típicas:** esquecer o fator interno; sinal trocado em $(y - \hat y)^2$; somar derivadas locais em vez de multiplicar; soma no lugar da média (o "custo somado sem dividir por $n$" que a primeira versão punha na m1-04); `σ'` como `σ(z)(1 + σ(z))`; sigmoide como `exp(z) / (1 + exp(z))` (`nan` em z = 1000); laço Python em `grad_custo_quadratico` (reprova só no `source`); `numpy.float64` no lugar de `float`.
- **Resultado:** 7, 10 e 9 casos; 6, 7 e 6 soluções erradas.

### n5-m1-04-funcoes-de-custo-e-otimizacao · Funções de custo e otimização (escrita e verificada)
- **Arquivo:** `01-matematica-para-ml/04-funcoes-de-custo-e-otimizacao.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Medir o erro** (KaTeX: MSE, MAE, entropia cruzada; o que cada uma penaliza; o outlier no MSE; `0 · log 0 = nan`)
  2. **Previsão · MSE ou MAE com um outlier** (a média minimiza o MSE, a mediana o MAE)
  3. **Exercício (lacunas) · Três custos vetorizados** (`mse(y, p)`, `mae(y, p)`, `perda_logistica(y, p, eps=1e-12)` com `np.clip`; tolerância 1e-3 nos casos de `1 - 1e-12`)
  4. **Leitura · Gradiente descendente genérico** (KaTeX da atualização; Visualizar: descida 1D com parada por tolerância em Python puro; o histórico com o mesmo array)
  5. **Exercício (código) · Descer até parar** (`gradiente_descendente(grad, x0, taxa, passos, tol)` → `(x, historico)`: para quando a norma do **deslocamento** (`taxa * grad(x)`) fica menor que `tol`, logo depois de guardar o ponto; o histórico é a lista de arrays, começando por `x0`; `x0` intacto)
  6. **Leitura · Taxa, divergência e convexidade** (pequena demais, boa, grande demais; a curva de custo como diagnóstico; convexa contra não convexa; Rosenbrock com os números do executor)
  7. **Exercício (código) · Diagnóstico e Rosenbrock** (`diagnosticar_taxa(historico)`: `"diverge"` com custo não finito ou último > primeiro; `"lento"` se penúltimo − último > 0,01 · (primeiro − último); senão `"ok"`. `minimizar_rosenbrock(x0, taxa, passos)` → `(x, custos)` sem parada antecipada, `passos + 1` custos `float`; a função `rosenbrock` vem no código inicial e o aluno escreve o gradiente. Taxa 0,002 e 5 000 passos de (0, 0) chegam a menos de 0,05 de (1, 1) (0,994; 0,989) com custo monótono; 0,004 já oscila; 0,01 vira `nan` antes de 50 passos)
  8. **Quiz · Convexidade e taxa**
- **Erradas típicas:** atualizar com `+`; parada só por número de passos; parada pela norma do gradiente; histórico com o mesmo array; `log(0)` sem clip (ou corte só por baixo); diagnóstico pelo último valor e não pela tendência; `nan` não conferido; sinal trocado no termo cruzado do gradiente de Rosenbrock. O "custo somado sem dividir por $n$" foi para a m1-03.
- **Resultado:** 11, 9 e 12 casos; 6, 6 e 7 soluções erradas.

### n5-m1-05-probabilidade-e-maxima-verossimilhanca · Probabilidade e máxima verossimilhança (escrita e verificada)
- **Arquivo:** `01-matematica-para-ml/05-probabilidade-e-maxima-verossimilhanca.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · A moeda e a verossimilhança** (KaTeX: $L(p) = \prod p^{y_i}(1-p)^{1-y_i}$; MLE = média; verossimilhança não é probabilidade do parâmetro)
  2. **Previsão · O produto que vira zero** (produto de 2 000 probabilidades iguais a 0,3 dá `0.0`; a soma dos logs não. Com 0,6 o produto para em `5e-324`, por isso a lição usa 0,3)
  3. **Exercício (lacunas) · Log-verossimilhança da moeda** (`log_verossimilhanca_bernoulli(p, dados)`; `mle_moeda(dados)` por busca numa grade e conferida com a média)
  4. **Leitura · Gaussiana dá MSE, Bernoulli dá entropia cruzada** (KaTeX: as duas derivações curtas; MLE da variância com `ddof=0`; a forma pelos logitos com `logaddexp`; MAP e ridge em uma frase)
  5. **Exercício (código) · MLE gaussiana e entropia cruzada estável** (`mle_gaussiana(dados)` → `(media, variancia)`, recusando dados vazios; `entropia_cruzada_logitos(y, z)` = média de $\ln(1 + e^{z}) - y z$ com `np.logaddexp`)
  6. **Leitura · Probabilidade prevista e calibração** (o que "0,8" quer dizer; tabela de 5 faixas medida no executor)
  7. **Exercício (código) · Curva de calibração** (`curva_de_calibracao(y, p, bins)` → lista de `(media_prevista, frequencia, contagem)` por faixa, faixas vazias omitidas)
  8. **Quiz · Verossimilhança**
- **Mudou na escrita:** `entropia_cruzada(y, p, eps=1e-12)` virou `entropia_cruzada_logitos(y, z)`: a versão com `p` e `np.clip` já é o `perda_logistica` da m1-04, e a forma pelos logitos é a estável que o Nível 6 usa (ver "Decisões para o Filipe", 5).
- **Erradas típicas:** `argmin` no lugar de `argmax` (o "maximizar a log-verossimilhança negativa"); variância com `ddof=1`; passar pela probabilidade sem corte (`nan` em z = ±40); `log(1 + exp(z))` direto (`inf` em z = 1000); faixa com limite superior aberto deixando `p = 1.0` de fora; produto sem log; contagem como inteiro do numpy (`np.int32` não serializa).
- **Resultado:** 7, 11 e 8 casos; 6, 7 e 7 soluções erradas.

## Módulo 2 · Regressão linear do zero

`bibliotecas: [numpy]`, perfil `dados`; a m2-05 tem `[numpy, scikit-learn]` (perfil `ml`). Os dados do módulo vêm de um gerador da lição (`dados_regressao.py`: `gerar_dados`, com $y = 3 + 2x_1 - x_2 + \varepsilon$, o parâmetro `escala` e `default_rng(semente)`), que entra como `python path=dados_regressao.py` no código inicial e na solução dos exercícios cujos casos o usam (m2-01 p5, m2-02 p3 e p5, m2-03 p5 e p7, m2-04 p5); a m2-05 usa uma senoide com ruído.

### n5-m2-01-modelo-linear-e-mse · O modelo linear e o erro quadrático (escrita e verificada)
- **Arquivo:** `02-regressao-linear-do-zero/01-modelo-linear-e-mse.lvl.md` · 100 XP · 40 min
- **Passos (7):**
  1. **Leitura · Uma reta, muitas colunas** (KaTeX: $\hat y = Xw + b$ e o MSE; o truque da coluna de uns; o gerador do módulo)
  2. **Previsão · Formas e o MSE de uma reta à mão** (inclui o `w` coluna que vira `(3, 3)`)
  3. **Exercício (lacunas) · Prever e medir** (`prever(X, w, b)`, `mse(y, y_pred)`)
  4. **Leitura · O gradiente do MSE em forma de matriz** (KaTeX: $\nabla_w = \tfrac{2}{n} X^\top(Xw + b - y)$, $\partial_b$; conferir com o verificador da m1-02; o fator $2/n$ só muda a escala)
  5. **Exercício (código) · Gradiente do MSE** (`gradiente_mse(X, y, w, b)` → `(gw, gb)` com `gb` `float`; conferido com o gradiente numérico central no `setup` e com o zero no ótimo do `lstsq`; sem laço)
  6. **Exercício (código) · A bacia do custo** (`superficie_de_custo(x, y, ws, bs)` → matriz `len(bs) × len(ws)` por broadcasting; `minimo_da_grade(custos, ws, bs)` → `(w, b)`)
  7. **Quiz · A forma do gradiente**
- **Erradas típicas:** `X @ w` com `w` `(d, 1)` (forma errada); `X * w + b`; MSE somado; raiz do MSE; `X @ (...)` no lugar de `X.T @ (...)`; sinal do resíduo trocado; derivada em `b` sem o 2; eixos da superfície trocados; índices de linha e coluna trocados no mínimo; laço (reprova só no `source`).
- **Resultado:** 8, 9 e 8 casos; 7, 7 e 6 soluções erradas.

### n5-m2-02-gradiente-descendente-batch-e-estocastico · Gradiente descendente batch, mini-batch e estocástico (escrita e verificada)
- **Arquivo:** `02-regressao-linear-do-zero/02-gradiente-descendente-batch-e-estocastico.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · O laço de treino** (Mermaid: época → embaralhar → lote → gradiente → atualizar → custo do conjunto; época contra passo)
  2. **Previsão · Quantos passos por época** (`range(0, 10, 4)`, o último lote de 2 e a versão que descarta)
  3. **Exercício (lacunas) · Treino em lote** (`treinar_batch(X, y, taxa, epocas)` → `(w, float(b), historico)`; comparado com o `lstsq` do `setup` com tolerância e com 3 épocas à mão)
  4. **Leitura · Mini-lotes e SGD** (KaTeX: o gradiente do lote como estimativa; o gerador criado uma vez só; `np.random.seed` e gerador fora da função)
  5. **Exercício (código) · Mini-lotes com semente** (`treinar_minibatch(X, y, taxa, epocas, tamanho_lote, semente)` → `(w, float(b), historico)`. O enunciado **fixa o consumo do gerador**: um `default_rng(semente)` antes das épocas e um `rng.permutation(n)` por época, o que permite resultados literais (casos `uma-epoca` e `tres-epocas`). Casos: mesma semente, mesmo resultado; sementes diferentes, resultados diferentes; perto da solução exata; `historico` com `epocas` valores, o custo **do conjunto inteiro** no fim de cada época)
  6. **Leitura · O ruído do SGD e o decaimento da taxa** (tabela medida: distância à solução exata para lotes 1, 16 e 200, com e sem decaimento; KaTeX de $\eta_t$)
  7. **Exercício (código) · Ler as curvas** (`epoca_em_que_atinge(historico, limiar)` → `int` ou `None`; `taxa_com_decaimento(taxa0, decaimento, epoca)`; casos `call`)
  8. **Quiz · Época, passo e lote**
- **Muda do roteiro:** `treinar_sgd` com tolerância ampla e `comparar_convergencia` viram `epoca_em_que_atinge` (o "quem converge primeiro" depende da semente; a regra 6 do N4 pede comparação com o valor exato, não com outra trajetória).
- **Mudou na escrita:** fixar o consumo do gerador separa o "gerador recriado a cada época" (a primeira época bate) do "não embaralhar", que a primeira versão não distinguia.
- **Erradas típicas:** não embaralhar entre épocas (resultado igual para sementes diferentes); gerador recriado a cada época; descartar o último lote; registrar o custo do lote; gerador criado fora da função; `np.random.seed`; gradiente somado (diverge); `b` sem a taxa; `<` no lugar de `<=` em `epoca_em_que_atinge`; precedência `taxa0 / 1 + k * t`.
- **Resultado:** 7, 9 e 9 casos; 5, 7 e 7 soluções erradas.

### n5-m2-03-escala-de-atributos-e-taxa-de-aprendizado · Escala de atributos e taxa de aprendizado (escrita e verificada)
- **Arquivo:** `02-regressao-linear-do-zero/03-escala-de-atributos-e-taxa-de-aprendizado.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Vales alongados** (KaTeX: escore $z$ e min-max; por que uma coluna em milhares trava o gradiente; coluna constante; vazamento e teste com as próprias estatísticas)
  2. **Previsão · O teste padronizado com o treino** (média 2.0 e desvio 0.8165 do teste depois de usar as estatísticas do treino: não são 0 e 1)
  3. **Exercício (lacunas) · Padronizar treino e teste** (`padronizar_treino_teste(X_tr, X_te)` → `(Xtr, Xte, media, desvio)`; coluna constante → zeros)
  4. **Leitura · Escala e convergência** (tabela medida: padronizado converge na época 50; coluna × 1 000 diverge com taxa 0,1 e não converge em 5 000 épocas com $10^{-6}$; `inf` e `nan` silenciosos no executor)
  5. **Exercício (código) · Épocas até convergir** (`epocas_ate_convergir(X, y, taxa, tol, max_epocas)`: converge quando $|J_{t-1} - J_t| <$ `tol`, com $J_0$ antes do primeiro passo e épocas a partir de 1; devolve `None` sem convergência)
  6. **Leitura · Busca da taxa e a volta à escala original** (`argmin` e `min` com `nan`; KaTeX: $w_j = w'_j / \sigma_j$, $b = b' - \sum w'_j \mu_j / \sigma_j$)
  7. **Exercício (código) · Melhor taxa e coeficientes originais** (`buscar_taxa(X, y, taxas, epocas)` → `(taxa, custo)`, `ValueError` quando todas divergem; `coeficientes_na_escala_original(w, b, media, desvio)`, com a ida e volta conferida contra o `lstsq` dos dados brutos a `1e-8`; o código inicial traz o `treinar_batch`)
  8. **Quiz · Escala e vazamento**
- **Mudou na escrita:** a taxa que diverge só vira `nan` depois de ~46 épocas (antes é `inf`), por isso os casos de `buscar_taxa` usam 100 épocas.
- **Erradas típicas:** padronizar o teste com as próprias estatísticas; estatísticas do conjunto inteiro; `ddof=1` (diverge do `StandardScaler` que virá na m4-01); desvio zero sem tratar (`nan`/`inf`); esquecer o intercepto na volta; multiplicar pelo desvio; taxa escolhida sem descartar as que divergem (`argmin` com `nan`); devolver `max_epocas` no lugar de `None`.
- **Resultado:** 8, 6 e 8 casos; 6, 5 e 6 soluções erradas.

### n5-m2-04-equacao-normal-e-solucao-exata · Equação normal e solução exata (escrita e verificada)
- **Arquivo:** `02-regressao-linear-do-zero/04-equacao-normal-e-solucao-exata.lvl.md` · 100 XP · 40 min
- **Passos (7):**
  1. **Leitura · Gradiente igual a zero** (KaTeX: da derivada à $X^\top X w = X^\top y$; `solve` em vez de `inv`; `lstsq` e SVD em uma frase; as mensagens de `Xb @ Xb.T` e de `solve(Xb, y)`)
  2. **Previsão · solve, lstsq e a coluna repetida** (com uma coluna duplicada, o `solve` do executor devolve `nan` sem erro, e a última linha imprime `True` por isso; o `lstsq` devolve a solução de norma mínima, `[1.0, 2.0, 2.0]`. No computador do aluno, o mesmo `solve` levanta `LinAlgError: Singular matrix`; a dica 3 avisa)
  3. **Exercício (ordenar, 3 distratores) · Equação normal** (`equacao_normal(X, y)` → coeficientes com o intercepto primeiro; `not_calls` `inv`)
  4. **Leitura · Quando a equação normal falha** (KaTeX: custos com $p = d + 1$; colinearidade e posto; `det` de uma combinação linear = $-3{,}5 \cdot 10^{-10}$; tempos medidos só no texto: 0,6 ms com $n = 10\,000$, $d = 10$; 46 ms com $n = 2\,000$, $d = 200$; 0,26 s com $n = 1\,000$, $d = 600$; uma época do gradiente, 0,9 ms)
  5. **Exercício (código) · Singular e comparação com o gradiente** (`detectar_singular(X)` → `bool` pelo posto da matriz com a coluna de uns; `distancia_para_gd(X, y, taxa, epocas)` → norma da diferença entre as duas soluções; o código inicial traz `treinar_batch` e `equacao_normal`)
  6. **Exercício (código) · Quanto custa cada método** (`operacoes_equacao_normal(n, d)` = $n p^2 + p^3$ e `operacoes_gd(n, d, epocas)` = $2 n p \cdot \text{épocas}$, com $p = d + 1$; `metodo_mais_barato(n, d, epocas)`, empate → `"equacao_normal"`; casos `call`)
  7. **Quiz · Exata ou iterativa**
- **Muda do roteiro:** `tempo_relativo(d)` "estimando quando a equação normal fica mais cara" media o relógio: vira contagem de operações (regra 1 do N4); a medição aparece na leitura (uma sonda com $d = 1\,500$ estourou os 10 s do lote).
- **Erradas típicas:** `inv`; esquecer a coluna de uns (ou pô-la no fim); `Xb @ Xb.T` (`ValueError: solve1 ...`); `solve(Xb, y)` (`LinAlgError`); posto conferido sem a coluna de uns; `det == 0` (o determinante da combinação não é zero); `np.bool_`; soma das diferenças no lugar da norma; `d` no lugar de $p$; empate para o gradiente.
- **Resultado:** 6, 8 e 8 casos; 5, 6 e 5 soluções erradas.

### n5-m2-05-regressao-polinomial-e-regularizacao · Regressão polinomial e regularização (ridge e lasso) (escrita e verificada)
- **Arquivo:** `02-regressao-linear-do-zero/05-regressao-polinomial-e-regularizacao.lvl.md` · 130 XP · 55 min · `bibliotecas: [numpy, scikit-learn]` (perfil `ml`)
- **Passos (8):**
  1. **Leitura · Mais graus, mais curvas** (KaTeX: expansão $[x, x^2, \dots, x^g]$; treino nunca sobe, validação faz um U; divisão sorteada; escala das potências)
  2. **Previsão · Erro de treino e validação por grau** (impressões booleanas e o treino do grau 9 = 0.0, previsíveis pelo raciocínio)
  3. **Exercício (lacunas) · Atributos polinomiais** (`atributos_polinomiais(x, grau)` → `(n, grau)`, sem a coluna de uns)
  4. **Leitura · Ridge** (KaTeX do custo e de $(X'^\top X' + \lambda I')\,w' = X'^\top y$ com $I'$ sem regularizar o intercepto; colinear resolvido; o termo $2\lambda w$ do gradiente)
  5. **Exercício (código) · Ridge do zero** (`ridge_equacao_normal(X, y, lam)` → `(w, b)`; conferido com `Ridge(alpha=lam)` treinado no `setup` a `1e-8`; `norma_por_lambda(X, y, lambdas)` decrescente; `not_calls` `sklearn`)
  6. **Leitura · Lasso e os coeficientes zero** (KaTeX com o $\frac{1}{2n}$ do scikit-learn; `alpha` do `Lasso` contra o do `Ridge`; `np.nonzero` contra `np.flatnonzero`)
  7. **Exercício (código) · Seleção com lasso e o grau certo** (`selecionar_com_lasso(X, y, alpha)` padroniza `X` dentro (escore $z$ do próprio `X`) e devolve `list[int]` ordenada; `erro_treino_validacao_por_grau(x, y, graus, semente)` divide por `default_rng(semente).permutation(n)` com corte `7 * n // 10` e devolve `{grau: (mse_treino, mse_validacao)}`; `melhor_grau(erros)`, menor validação com empate no menor grau; o código inicial traz `atributos_polinomiais`)
  8. **Quiz · L1 ou L2**
- **Muda do roteiro:** o frontmatter passou de `[numpy]` para `[numpy, scikit-learn]` (perfil `ml`), a proposta da decisão 2; o `Ridge` só existe no `setup`, e o `Lasso` na solução do passo 7.
- **Mudou na escrita:** "`np.nonzero` com tolerância zero num coeficiente `1e-17`" não se aplica (o `Lasso`, por descida coordenada, devolve zeros exatos); a armadilha cobrada é a tupla de arrays do `np.nonzero`. "Ridge sem padronizar" ficou na leitura e no quiz; o equivalente cobrado é o "lasso sem padronizar". O objetivo 2 ("ridge do zero pela equação normal e gradiente") tem o gradiente só na leitura; o objetivo 3 ("comparar os caminhos dos coeficientes") é coberto por `norma_por_lambda` e pela leitura, sem exercício de caminho do lasso.
- **Erradas típicas:** regularizar o intercepto; λ multiplicado por `n`; usar o `Ridge` pronto (só o `not_calls`); norma com o intercepto; lasso sem padronizar (`[0, 3, 4]` no lugar de `[0, 1]`); `list(np.nonzero(...))`; divisão sem sortear; grau escolhido pelo erro de treino; empate pela ordem do dicionário.
- **Resultado:** 6, 9 e 11 casos; 5, 6 e 7 soluções erradas.

## Módulo 3 · Classificação

`bibliotecas: [numpy, scikit-learn]`, perfil `ml`. Dados: nuvens normais em 2D geradas com `default_rng`, uma loja virtual e um sistema de pagamentos inventados, 34 mensagens fictícias escritas à mão (`mensagens.py`, m3-05) e símbolos 5 × 5 gerados (`padroes.py`, m3-06).

### n5-m3-01-regressao-logistica-do-zero · Regressão logística do zero (escrita e verificada)
- **Arquivo:** `03-classificacao/01-regressao-logistica-do-zero.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Por que não uma reta para classes** (KaTeX: sigmoide e log-odds; fronteira $Xw + b = 0$; a forma $e^z/(1+e^z)$ que dá `nan`)
  2. **Previsão · A sigmoide nos extremos** (`0.0`/`1.0` com `z = ±1000`, `-inf` e `nan` sem aviso no executor; `logaddexp`)
  3. **Exercício (lacunas) · Sigmoide estável e probabilidades** (`sigmoide(z)`, `prever_proba(X, w, b)`)
  4. **Leitura · Entropia cruzada e o gradiente bonito** (KaTeX: $\tfrac1n X^\top(\sigma(Xw + b) - y)$; clip contra logits; `np.logaddexp`)
  5. **Exercício (código) · Custo e gradiente** (`entropia_cruzada_binaria(y, z)` a partir dos logits, estável; `gradiente_logistica(X, y, w, b)` conferido com o numérico)
  6. **Leitura · Treinar e comparar com o scikit-learn** (`LogisticRegression(C=np.inf)` e o `UserWarning`; o `FutureWarning` do `penalty`; padronizar antes; coeficientes como log-odds)
  7. **Exercício (código) · Treinar do zero** (`treinar_logistica(X, y, taxa=0.1, epocas=2000)` → `(w, b float)`, começando em zeros; `prever_classe(X, w, b)`; previsões ≥ 98 % iguais às de `LogisticRegression(C=np.inf)` treinada no `setup` e coeficientes a `1e-2`; `not_calls` `sklearn`)
  8. **Quiz · Log-odds**
- **Muda do roteiro:** o conjunto de câncer de mama (`sklearn.datasets`) sai: não importa no executor e são dados de pessoas. `LogisticRegression(penalty=None)` vira `C=np.inf` (o `penalty` dá `FutureWarning` na 1.8). "Diferença de coeficientes < 0,05" vira concordância de previsões + `1e-2` (medido nos dados da lição: diferença máxima de 5e-5 e 100 % de concordância).
- **Mudou na escrita:** `prever_classe` entrou ao lado de `treinar_logistica` para cobrar o "logit comparado com 0,5".
- **Erradas típicas:** `np.log(sigmoide)` sem estabilizar (`-inf`); `clip` (27,63 no lugar de 1000); exponencial sem `abs` na sigmoide; MSE com sigmoide (concordância 0,977 < 0,98); gradiente sem dividir por $n$; esquecer o `b`; logit comparado com `0.5`; pesos iniciais sorteados; booleanos no lugar de 0/1.
- **Resultado:** 8, 8 e 10 casos; 6, 8 e 8 soluções erradas.

### n5-m3-02-metricas-de-classificacao · Métricas de classificação (escrita e verificada)
- **Arquivo:** `03-classificacao/02-metricas-de-classificacao.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Quatro caixas** (KaTeX: VP, FP, FN, VN; a ordem `[[VN, FP], [FN, VP]]` do `confusion_matrix`; a matriz 1 × 1 com uma classe só)
  2. **Previsão · Acurácia com 99 % de negativos**
  3. **Exercício (lacunas) · Matriz de confusão** (`matriz_de_confusao(y, y_pred)` → lista 2 × 2 na ordem do scikit-learn)
  4. **Leitura · Precisão, recall, F1 e Fβ** (KaTeX; divisão por zero → 0, como `zero_division=0`; `UndefinedMetricWarning` e `ZeroDivisionError`)
  5. **Exercício (código) · Métricas do zero** (`metricas(y, y_pred)` → `{"acuracia", "precisao", "recall", "f1", "especificidade"}`; `f_beta(y, y_pred, beta)`; `not_calls` `sklearn`; conferido com o `sklearn.metrics` no `setup`)
  6. **Leitura · Custo dos erros e médias macro e ponderada** (`classification_report` real do executor; recall ponderado = acurácia)
  7. **Exercício (código) · Custo e médias** (`custo_esperado(y, y_pred, matriz_custo)` para $k$ classes (rótulos 0..k-1), contando a diagonal; `recall_macro_e_ponderado(y, y_pred)` só com as classes de `y`)
  8. **Quiz · Qual métrica para este problema**
- **Muda do roteiro:** `metrica_recomendada(cenario)` (texto livre) vira pergunta do quiz.
- **Erradas típicas:** linhas e colunas trocadas (transposta); positivo primeiro; precisão sem tratar zero (`ZeroDivisionError`); precisão e recall trocados; F1 aritmético; macro e ponderada trocadas; Fβ com $\beta$ em vez de $\beta^2$; matriz de custo transposta; classes de `y` e `y_pred` juntas.
- **Resultado:** 7, 10 e 9 casos; 6, 6 e 7 soluções erradas.

### n5-m3-03-roc-auc-e-limiares · Curva ROC, AUC, precisão-recall e limiares (escrita e verificada)
- **Arquivo:** `03-classificacao/03-roc-auc-e-limiares.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · O limiar é um botão separado do modelo** (KaTeX: TPR, FPR; `predict_proba(X)[:, 1]`)
  2. **Previsão · TPR e FPR em três limiares**
  3. **Exercício (ordenar, 3 distratores) · Taxas num limiar** (`taxas_no_limiar(y, scores, limiar)` → `(tpr, fpr)` com `>=`)
  4. **Leitura · ROC e AUC como ordenação de pares** (KaTeX: $\text{AUC} = P(s^+ > s^-)$, empate vale meio; `drop_intermediate`; `UndefinedMetricWarning` com uma classe)
  5. **Exercício (código) · ROC e AUC do zero** (`curva_roc(y, scores)` → `(fpr, tpr)` igual ao `roc_curve(..., drop_intermediate=False)` do `setup`; `auc_por_pares(y, scores)` igual ao `roc_auc_score` a `1e-12`; 60 scores com empates)
  6. **Leitura · Precisão-recall e limiar por custo** (AP em desbalanceados; escolher o limiar na validação)
  7. **Exercício (código) · Escolher o limiar** (`melhor_limiar_f1(y, scores)` e `limiar_por_custo(y, scores, custo_fp, custo_fn)` com candidatos = scores distintos e empate pelo menor limiar; `avaliar_com_limiar(y_val, s_val, y_teste, s_teste, custo_fp, custo_fn)` → `{"limiar", "custo_teste"}`; `custo_total` vem pronto)
  8. **Quiz · AUC 0,5 e PR contra ROC**
- **Mudou na escrita:** `avaliar_com_limiar` entrou para cobrar o "limiar escolhido no teste" (custo 16 contra 21) e o "teste medido com 0,5" (17).
- **Erradas típicas:** ROC com scores binarizados em 0,5; limiares em ordem crescente (curva invertida); sem o ponto `(0, 0)`; empates contados como 0 ou 1; `>` no lugar de `>=`; tupla trocada; FPR dividida pelos marcados; custos trocados; maximizar a acurácia; limiar escolhido no teste.
- **Resultado:** 7, 10 e 8 casos; 5, 7 e 6 soluções erradas.

### n5-m3-04-knn · k-vizinhos mais próximos (escrita e verificada)
- **Arquivo:** `03-classificacao/04-knn.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Sem treino, só vizinhos** (KaTeX: distância; Visualizar: votação de 3 vizinhos com numpy; o aviso do `threadpoolctl` no stderr; o `ValueError` de `n_neighbors`)
  2. **Previsão · k = 1 no próprio treino** (acurácia 1,0 no treino e 0,8 na validação; com k = 15, 0,914 e 0,8)
  3. **Exercício (lacunas) · Prever por votação** (`knn_prever(X_tr, y_tr, X_novo, k)`; empate de votos → o menor rótulo; `argsort(kind="stable")`; referência `KNeighborsClassifier(5)`)
  4. **Leitura · Escala e a escolha de k** (padronizar; k pequeno decora, k grande suaviza; regressão com `weights="distance"` e $d = 0$)
  5. **Exercício (código) · Regressão e acurácia por k** (`knn_regressao(X_tr, y_tr, X_novo, k, pesos="uniform")` com `"uniform"`/`"distance"`, tratando $d = 0$ como o scikit-learn; `acuracia_por_k(X_tr, y_tr, X_va, y_va, ks)` padroniza com `StandardScaler` do treino e devolve lista de `float`; referências `KNeighborsRegressor` e `KNeighborsClassifier` no `setup`)
  6. **Leitura · A maldição da dimensionalidade** (KaTeX: razão entre a distância máxima e a mínima; KD-tree, ball tree e a ponte com o Nível 3)
  7. **Exercício (código) · Distâncias em alta dimensão** (`razao_distancias(d, n, semente)` → `float`, com o sorteio fixado `rng.random((n + 1, d))` e a linha 0 como consulta, o que permite esperado literal; casos: mesma semente igual, razão decrescente em `d`; sem laço, `not_uses` `for` e `list_comprehension`)
  8. **Quiz · k par e escala**
- **Muda do roteiro:** "laço duplo em Python para distâncias (tempo)" vira errada que reprova só no `source` (`not_uses` `for` e `list_comprehension`).
- **Erradas típicas:** não padronizar (ou padronizar a validação com as próprias estatísticas); incluir o próprio ponto como vizinho (ou pular o mais próximo); empate resolvido pelo primeiro que aparece; votar com as posições; pesos `1/d` com `d = 0` (`nan`); `1/d²`; acurácia no treino; comparar a consulta com ela mesma (`inf`); laço; `default_rng()` sem semente.
- **Resultado:** 7, 7 e 8 casos; 6, 7 e 6 soluções erradas.

### n5-m3-05-naive-bayes-e-texto · Naive Bayes e classificação de texto (escrita e verificada)
- **Arquivo:** `03-classificacao/05-naive-bayes-e-texto.lvl.md` · 120 XP · 50 min
- **Dados:** `mensagens.py` (24 mensagens de treino e 10 de teste, metade "promocao", metade "pessoal"; 1,9 KB), repetido no código inicial e na solução dos passos 5 e 7.
- **Passos (8):**
  1. **Leitura · Texto vira contagem** (Mermaid: texto → tokens → vocabulário → matriz; `CountVectorizer` e o `token_pattern`)
  2. **Previsão · O vocabulário do CountVectorizer** (ordem alfabética, `lower`, tokens de 1 letra descartados pelo padrão)
  3. **Exercício (lacunas) · Saco de palavras** (`tokenizar` auxiliar e `bag_of_words(textos)` → `(vocabulario, matriz)` com o mesmo vocabulário do `CountVectorizer` no `setup`)
  4. **Leitura · Bayes ingênuo com Laplace** (KaTeX: $\log P(c) + \sum_j x_j \log P(w_j \mid c)$; por que somar logs)
  5. **Exercício (código) · Naive Bayes do zero** (`treinar_nb(X, y, alpha)` → `{"classes", "log_prior", "log_prob"}`; `prever_nb(modelo, X)`; previsões iguais às do `MultinomialNB(alpha)` no `setup`; `not_calls` `MultinomialNB`)
  6. **Leitura · TF-IDF e avaliação** (KaTeX: idf suavizado do scikit-learn; vocabulário só do treino; a mensagem real do `fit_transform` no teste)
  7. **Exercício (código) · TF-IDF e o filtro** (`tf_idf(matriz)` igual ao `TfidfTransformer()` a `1e-9`; `avaliar_filtro(textos_tr, y_tr, textos_te, y_te, vetorizador=None)` → precisão e recall, com o vetorizador recebido para o espião da regra 6: subclasse do `CountVectorizer` que anota o `len` de cada `fit_transform`, esperado `[24]`)
  8. **Quiz · Suavização e vocabulário**
- **Mudou na escrita:** nestes dados, ajustar o vetorizador com treino + teste **não muda as métricas**; só o espião (`[34]`) e o tamanho do vocabulário (132 palavras) pegam o vazamento.
- **Erradas típicas:** `\w+` ou `[a-z0-9]{2,}` no lugar do padrão; sem `lower`; vocabulário na ordem de aparição; presença no lugar de contagem; produto sem log; sem Laplace (`-inf`); denominador sem $\alpha V$; priori ignorada ou contada pelas palavras; vocabulário com o teste; `fit_transform` no teste (`ValueError: X has 51 features, but MultinomialNB is expecting 119 features as input.`); idf sem o `+1` ou sem suavizar; normalização L2 esquecida.
- **Resultado:** 7, 9 e 7 casos; 6, 7 e 6 soluções erradas.

### n5-m3-06-classificacao-multiclasse · Classificação multiclasse: softmax, um-contra-todos e métricas (escrita e verificada)
- **Arquivo:** `03-classificacao/06-classificacao-multiclasse.lvl.md` · 120 XP · 50 min
- **Dados:** `padroes.py` com `gerar_padroes(n_por_classe, semente, ruido=1.2)`: cinco símbolos 5 × 5 (mais, xis, quadrado, barra, traço) com ruído normal, rótulos 0–4.
- **Passos (8):**
  1. **Leitura · De duas para k classes** (KaTeX: softmax com o máximo da linha subtraído; one-hot; índice -1)
  2. **Previsão · softmax de [1000, 1001]** (`nan` sem estabilizar, `[0.269, 0.731]` estabilizado)
  3. **Exercício (lacunas) · Softmax e one-hot** (`softmax(Z)` por linha; `one_hot(y, k)` com `ValueError` para rótulo fora de `0..k-1`)
  4. **Leitura · Entropia cruzada categórica** (KaTeX: $\nabla_W = \tfrac1n X^\top(P - Y)$; `multi_class` → `TypeError`; a ponte com o MLP do Nível 6)
  5. **Exercício (código) · Treinar softmax** (`treinar_softmax(X, Y, taxa=0.5, epocas=1000)` → `(W, b)`; 500 imagens de treino e 200 de teste; acurácia medida 0,72, piso 0,65; concordância medida 0,98 com `LogisticRegression(C=np.inf)` no `setup`, piso 0,95; `not_calls` `sklearn`)
  6. **Leitura · Um contra todos e a matriz k × k** (OvR, OvO; macro e ponderada)
  7. **Exercício (código) · OvR e confusões** (`um_contra_todos(X, y, X_novo)` com `LogisticRegression` binárias e `decision_function`, conferido com `OneVsRestClassifier(LogisticRegression())`; `pares_mais_confundidos(matriz, n)` → tuplas `(verdadeira, prevista, contagem)` só fora da diagonal e com contagem > 0)
  8. **Quiz · Softmax e OvR**
- **Muda do roteiro:** os dígitos (`load_digits`) dependem da decisão 1 (o `sklearn.datasets` não importa); a lição usa os símbolos 5 × 5 gerados. O frontmatter (mantido) ainda cita "dígitos do scikit-learn" na `descricao` e `load_digits` no objetivo 3 (ver "Decisões para o Filipe", 1).
- **Erradas típicas:** softmax sem subtrair o máximo (ou subtraindo o máximo da matriz inteira ou de cada coluna); normalizar as colunas; one-hot sem conferir negativos ou com `> k`; rótulos como 1..k; gradiente somado; não atualizar `b`; média do intercepto no eixo 1; OvR comparando `predict` binário em vez de `decision_function` (concordância 0,85); `predict_proba[:, 0]`; incluir a diagonal; verdadeira e prevista trocadas; contagens `numpy.int`.
- **Resultado:** 9, 7 e 7 casos; 7, 6 e 8 soluções erradas.

## Módulo 4 · scikit-learn na prática

`bibliotecas: [numpy, pandas, scikit-learn]`, perfil `ml`.

### n5-m4-01-api-fit-predict-transform · A API do scikit-learn: estimadores, transformadores e preditores (escrita e verificada)
- **Arquivo:** `04-scikit-learn-na-pratica/01-api-fit-predict-transform.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Uma interface para todos os modelos** (Mermaid da API; hiperparâmetros no construtor, atributos aprendidos com `_`, `fit` devolve `self`; as mensagens de `NotFittedError`, `coef_` antes do `fit` e `X` 1D)
  2. **Previsão · O que o fit guarda** (`LinearRegression` em $y = 2x + 1$: `hasattr` antes, `r is modelo`, coeficientes, `predict`, `get_params`, atributos com `_`)
  3. **Exercício (lacunas) · Ajustar, prever e avaliar** (`ajustar_e_avaliar(modelo, X_treino, y_treino, X_teste, y_teste)` → `{"previsoes", "score", "aprendidos"}`, com `LinearRegression` e `KNeighborsClassifier`)
  4. **Leitura · Transformadores: fit aprende, transform aplica** (KaTeX do escore $z$ com as estatísticas do treino; `fit_transform` só no treino; vazamento; `MinMaxScaler`)
  5. **Exercício (código) · Escalar sem espiar o teste** (`escalar_treino_teste(X_treino, X_teste, escalador=None)`; o espião da regra 6)
  6. **Leitura · O seu próprio estimador** (`ClassifierMixin, BaseEstimator`; `__init__` só guarda; `clone`; `check_is_fitted`; a ordem das bases e o `is_classifier`)
  7. **Exercício (código) · Um classificador pela média de cada classe** (`MediaPorClasse(p=2)` com `classes_`, `centroides_`, `predict` por distância de ordem `p`, comparado com o `NearestCentroid` no `setup`)
  8. **Quiz · O contrato na prática** (`fit_transform` no teste; `set_params` depois do `fit`; parâmetro guardado com outro nome)
- **Muda do roteiro:** "acessar `coef_` antes do `fit` (`NotFittedError`)" é um `AttributeError` comum no 1.8 (a leitura mostra os dois); `KNNProprio` com `check_estimator` vira `MediaPorClasse` comparado com `NearestCentroid` (o `check_estimator` não importa no executor); `clonar_e_reajustar` virou os casos `clone` e `get-params`; "fit_transform no teste" virou o exercício 5 e a primeira pergunta do quiz.
- **Resultado:** 9, 8 e 12 casos; 6, 6 e 8 soluções erradas, cada uma reprovando pelo motivo pretendido (lista no relatório `.claude-transfer/auditoria/n5-plano-e-piloto.md`). Lote da solução com o worker quente: 0,35 s, 0,07 s e 0,23 s.

### n5-m4-02-pre-processamento-e-pipeline · Pré-processamento e Pipeline (escrita e verificada)
- **Arquivo:** `04-scikit-learn-na-pratica/02-pre-processamento-e-pipeline.lvl.md` · 130 XP · 55 min
- **Dados:** tabela de 6 + 2 linhas escrita à mão (passo 3) e `dados_clientes.py` (`gerar_clientes(n, semente)`: idade, renda, plano, região, dependentes e o alvo `cancelou`, com vazios) nos passos 5 e 7.
- **Passos (8):**
  1. **Leitura · Cada coluna com o seu tratamento** (Mermaid: colunas numéricas → imputar + escalar, categóricas → imputar + one-hot, `ColumnTransformer` → modelo; `SimpleImputer`, `OneHotEncoder`, `OrdinalEncoder`; `handle_unknown` e `sparse_output` com as mensagens reais; colunas descartadas)
  2. **Previsão · As colunas que saem do preprocessador** (`get_feature_names_out()` com o padrão e com `remainder="passthrough"`)
  3. **Exercício (lacunas) · Montar o preprocessador** (`montar_preprocessador(colunas_num, colunas_cat)` → `ColumnTransformer`; casos pelo `shape`, pelos valores e pelos nomes de saída numa tabela fixa)
  4. **Leitura · Pipeline: um fit para tudo** (`named_steps`, `make_pipeline`, `'Pipeline' object has no attribute 'coef_'`, `feature_names_in_`, `etapa__parametro`, `set_output`)
  5. **Exercício (código) · O pipeline completo** (`pipeline_completo(colunas_num, colunas_cat, C)` com `LogisticRegression`; `coeficientes(pipeline)` → `{nome de saída: float}`; casos: `score` **literal** numa tabela gerada, categoria nova no teste não quebra, `named_steps["modelo"].coef_` com o número de colunas certo; o código inicial traz o `montar_preprocessador` pronto)
  6. **Leitura · O que o pipeline protege** (imputar antes de dividir; `remainder` nos dois sentidos, inclusive o alvo vazado pelo `passthrough`; `handle_unknown` em produção; `plano_nan`)
  7. **Exercício (código) · Avaliação honesta de ponta a ponta** (`avaliar(df, alvo, colunas_num, colunas_cat, semente, imputador=None)` → `{"score", "colunas", "n_treino"}`, com o imputador espião da regra 6 injetado; `ColumnTransformer` com `remainder="passthrough"`)
  8. **Quiz · handle_unknown, remainder e vazamento**
- **Muda do roteiro:** "detectar vazamento em um código sem pipeline (`call` devolvendo as linhas)" vira o espião do passo 7 e uma pergunta do quiz.
- **Mudou na escrita:** o score do passo 5 é literal (os dados são determinísticos), e não "≥ limiar". `nomes_apos_prep(pipeline)` virou a chave `"colunas"` do retorno de `avaliar`. O `remainder="passthrough"` permite cobrar as duas faces do `remainder`: a coluna que some com o padrão e o alvo que vaza quando fica em `X` (score 1,0). "Esquecer o `sparse_output`" não virou errada (o `ColumnTransformer` saiu denso: ver "Comportamentos do executor").
- **Erradas típicas:** imputar pela média ou com `"constant"`; `"passthrough"` no lugar do escalador; `OneHotEncoder` sem `handle_unknown`; `sparse=False` (`TypeError` no 1.8); listas de colunas trocadas; ignorar o `C`; `make_pipeline` (`KeyError: 'modelo'`); `pipeline.coef_`; nomes de `feature_names_in_`; imputar a tabela antes de dividir (espião `[120]`); sem `stratify`; esquecer `remainder` e perder colunas; alvo em `X`; score no treino.
- **Resultado:** 10, 11 e 8 casos; 6, 6 e 7 soluções erradas. Lote da solução: 0,242 s, 0,560 s e 0,281 s.

### n5-m4-03-divisao-de-dados-e-validacao-cruzada · Treino, validação, teste e validação cruzada (escrita e verificada)
- **Arquivo:** `04-scikit-learn-na-pratica/03-divisao-de-dados-e-validacao-cruzada.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Três conjuntos, três papéis** (Mermaid: dados → treino/teste → k-fold no treino → teste uma vez; `train_test_split(stratify, random_state)`; dados ordenados; divisão em três)
  2. **Previsão · Proporções com e sem embaralhar** (estratificado em três sementes, sempre 2 positivos; `shuffle=False`, os 10 positivos no teste)
  3. **Exercício (lacunas) · Dividir estratificado** (`dividir(X, y, semente, fracao_teste)` → os quatro arrays; `dividir_em_tres(X, y, semente, fracao_validacao, fracao_teste)` com a correção `fracao_validacao / (1 - fracao_teste)`; a narrativa traz os positivos do sorteio simples: 5, 6, 3, 5, 9 e 3 em 50 com as sementes 0 a 5)
  4. **Leitura · k-fold e o que a média esconde** (KaTeX: média ± desvio das partições; `KFold` em dados ordenados com a mensagem real e o `nan`; `StratifiedKFold`; o que `cv=5` faz num classificador e num regressor; `cross_validate`)
  5. **Exercício (código) · Média, desvio e grupos** (`cv_media_desvio(pipeline, X, y, k, semente)` → tupla, com o desvio populacional (o `std` padrão do numpy); `validacao_por_grupo(pipeline, X, y, grupos, k)` com `GroupKFold` → lista das notas, conferida por um espião `DummyClassifier` que recebe o grupo como coluna 0 de `X` e anota os grupos vistos no `fit` e no `predict`; o exemplo de grupos usa KNN)
  6. **Leitura · Tempo e grupos** (`GroupKFold`, `TimeSeriesSplit` com a saída real; números medidos dos dois vazamentos; validação aninhada citada)
  7. **Exercício (código) · Validação temporal** (`particoes_temporais(n, k)` → lista de `(inicio, fim)` com `fim` exclusivo, pela regra do `TimeSeriesSplit` (blocos de `n // (k + 1)`, sobras no primeiro treino); `validacao_temporal(pipeline, X, y, k)` com um regressor espião que anota o fim do treino e o começo da validação)
  8. **Quiz · O papel do teste**
- **Muda do roteiro:** `esquema_recomendado(descricao)` (texto livre) vira pergunta do quiz.
- **Mudou na escrita:** a Previsão do roteiro (positivos num teste sem `stratify`) pediria um número sorteado; ficou com o estratificado e o `shuffle=False`. Com regressão logística, o `GroupKFold` deu nota **maior** que o `KFold` nos dados sondados, e o vazamento não aparecia: por isso o KNN. Não há regra `source` proibindo o `TimeSeriesSplit`, porque `validacao_temporal`, no mesmo arquivo, precisa dele. Nos `setup`s, as contagens de `np.repeat` levam `.astype(np.intp)`.
- **Erradas típicas:** `stratify` esquecido; semente fixa; fração da validação sem corrigir (ou multiplicada); `KFold` sem `shuffle` em dados ordenados (`nan`); `ddof=1`; `float64` no retorno; `KFold` embaralhado no lugar dos grupos; `GroupKFold` sem `groups=`; blocos de `n // k`; fim incluído; `cv=k` na série; série embaralhada.
- **Resultado:** 9, 8 e 7 casos; 6, 7 e 6 soluções erradas. O passo 3 deu `executor: fetch failed` nas rodadas do agente com a fila cheia; na rodada final do coordenador, com o executor livre, a lição passou inteira.

### n5-m4-04-busca-de-hiperparametros · Busca de hiperparâmetros (escrita e verificada)
- **Arquivo:** `04-scikit-learn-na-pratica/04-busca-de-hiperparametros.lvl.md` · 110 XP · 45 min
- **Dados:** `dados_busca.py` (`gerar(semente)`: 240 linhas × 6 atributos, divididas 180/60 estratificado), arquivo dos passos 5 e 6.
- **Passos (7):**
  1. **Leitura · Grade sobre um pipeline** (KaTeX: ajustes = combinações × partições + 1; `etapa__parametro` com a mensagem real do nome sem prefixo; refit e `refit=False`; lista de grades; escala logarítmica)
  2. **Previsão · Quantos ajustes** (subclasse `Contador` que anota cada `fit`: 6 combinações, 25 ajustes, 30 e 40 linhas)
  3. **Exercício (ordenar, 3 distratores) · O custo da busca** (`custo_da_busca(grade, k, refit=True)` → `int`, puro Python, aceitando dicionário ou lista de grades)
  4. **Leitura · Aleatória, cv_results_ e o vencedor otimista** (`RandomizedSearchCV` com `scipy.stats.loguniform`; a mensagem da distribuição no `GridSearchCV`; `rank_test_score` como posição; `best_score_` 0,822 contra 0,700 no teste; validação aninhada)
  5. **Exercício (código) · Buscar e resumir** (`buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k)` → `{"melhor_C", "score_cv", "score_teste"}`, com a grade montada pelo aluno; `resumo_cv_results(busca, n)` → lista de `{"posicao", "params", "media", "desvio"}` nativos, empates na ordem da grade com `sorted` estável)
  6. **Exercício (código) · Busca aleatória com semente** (`buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente)` com `cv=3` fixo → `(melhores_parametros, melhor_score)` com os valores convertidos em `float`; mesma semente, mesmo resultado; um espião da logística anota o `C` de cada ajuste)
  7. **Quiz · Grade ou aleatória**
- **Orçamento:** grades de até 6 valores × 3 partições (19 ajustes de logística por busca), regra 9.
- **Mudou na escrita:** `buscar_grade(pipeline, X, y, grade, k)` ganhou o treino e o teste e os valores de `C`: com a grade montada pelo aluno, o erro "nome sem o prefixo" é dele (na primeira versão a grade vinha pronta), e com o teste na assinatura dá para cobrar "escolher pelo teste" e "apresentar o `best_score_` como desempenho final" (ver "Decisões para o Filipe", 6).
- **Erradas típicas:** soma dos tamanhos no custo; esquecer o refit; só aceitar dicionário; nome sem o prefixo; escolher o `C` pelo teste; `best_score_` como desempenho final; `refit=False` e depois `score`; `rank_test_score` em ordem decrescente; números do numpy no resumo; sem `random_state`; ignorar `n_iter`; `cv` padrão; `GridSearchCV` com distribuições; `best_params_` sem converter (`float64`).
- **Resultado:** 7, 11 e 7 casos; 6, 7 e 6 soluções erradas.

### n5-m4-05-metricas-de-regressao-e-selecao-de-modelos · Métricas de regressão e seleção de modelos (escrita e verificada)
- **Arquivo:** `04-scikit-learn-na-pratica/05-metricas-de-regressao-e-selecao-de-modelos.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Quatro réguas para o erro** (KaTeX: MAE, RMSE, MAPE, $R^2$; unidades; o MAPE do scikit-learn com zero)
  2. **Previsão · Um R² negativo** (0,0, −3,0, 0,875 e `4.8 5.657`)
  3. **Exercício (lacunas) · As métricas** (`metricas_regressao(y, y_pred)` → dicionário; MAPE ignora `y = 0` e devolve `None` se todos forem zero; o R² também sai `None` com `y` constante, onde o `r2_score` do scikit-learn dá 0,0)
  4. **Leitura · Toda comparação começa pela baseline** (`DummyRegressor`/`DummyClassifier`; KaTeX do ganho; números medidos; preferir o mais simples no empate)
  5. **Exercício (código) · Contra a baseline** (`comparar_com_baseline(modelo, X, y, semente)` → `{"modelo", "baseline", "ganho"}`)
  6. **Leitura · A variação entre partições** (KaTeX: diferença pareada e seu erro padrão; `RepeatedKFold`; `scipy.stats.ttest_rel` com a ressalva da dependência entre partições; mínimo relevante)
  7. **Exercício (código) · Tabela de experimentos** (`tabela_de_experimentos(modelos, X, y, k, repeticoes, semente)` → DataFrame com as colunas `modelo`, `rmse_medio` e `desvio` (amostral), ordenada pelo RMSE médio e comparada por `to_dict("list")`; `diferenca_relevante(erros_a, erros_b, minimo)`: $d_i = b_i - a_i$, relevante se $\bar d \ge$ mínimo e $\bar d > 2\,s_d/\sqrt{n}$ com `ddof=1`)
  8. **Quiz · R² negativo e MAPE**
- **Mudou na escrita:** o roteiro falava em "teste pareado"; a leitura apresenta o `ttest_rel` com a ressalva, mas `diferenca_relevante` usa a regra do erro padrão, determinística e sem o p-valor que a leitura diz ser otimista.
- **Erradas típicas:** MAE sem `abs`; RMSE sem a raiz; soma no lugar da média; máscara `y > 0` ou pelo previsto no MAPE; R² sem tirar a média ou com `np.var`; baseline ajustada no teste (ou pela mediana); modelo avaliado no treino; ganho como diferença; ignorar o modelo recebido; desvio populacional; nota negativa usada como RMSE; `cv=k` sem repetir; sem parear; sinal trocado; ignorar o mínimo ou o erro padrão; `bool` do numpy.
- **Resultado:** 11, 7 e 12 casos; 7, 7 e 10 soluções erradas.

### n5-m4-06-vies-variancia-e-curvas-de-aprendizado · Viés, variância e curvas de aprendizado (escrita e verificada)
- **Arquivo:** `04-scikit-learn-na-pratica/06-vies-variancia-e-curvas-de-aprendizado.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Erro = viés² + variância + ruído** (KaTeX; polinômios de grau 1, 3 e 11; diagnóstico e ações)
  2. **Previsão · Treino e validação por grau** (comparações que dão para prever: `True`, `True`, `3`, `True True`)
  3. **Exercício (lacunas) · Diagnóstico** (`diagnostico(erro_treino, erro_validacao, erro_aceitavel)` → `"vies"`, `"variancia"` ou `"ok"` pelas regras do enunciado; `acao_recomendada(diagnostico)`; casos `call`)
  4. **Leitura · validation_curve e learning_curve** (números medidos com KNN; a curva lida ao contrário; `shuffle=True` em dados ordenados; tabela de ações; curvas de 3 pontos)
  5. **Exercício (código) · Curvas** (`curva_de_validacao(pipeline, X, y, parametro, valores, k)` → `(treino, validacao)` médios; `curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente)`)
  6. **Leitura · Simular viés e variância** (tabela medida dos graus 1, 3, 5 e 9; variância do modelo contra a dos dados; o "double descent" citado)
  7. **Exercício (código) · A simulação** (`simular_vies_variancia(grau, n_amostras, repeticoes, semente)` → `(vies2, variancia)`, com o sorteio fixado no enunciado: $f(x) = \sin 2\pi x$, ruído 0,3, 50 pontos de grade, `x` antes do ruído, `np.polyfit`; casos: mesma semente igual, variância do grau 7 maior que a do 3, viés do grau 3 menor que o do 1)
  8. **Quiz · O que fazer com este diagnóstico**
- **Mudou na escrita:** `acao_recomendada` foi para o passo 3, com `diagnostico` (as duas formam o "diagnóstico → ação" e cabem em lacunas). Na simulação, a variância do grau 1 (0,035) sai **maior** que a do grau 3 (0,033), então "variância crescente com o grau" não vale entre 1 e 3: os casos comparam os graus 3 e 7. A Previsão imprime comparações em vez de RMSE por grau, que o aluno não calcula de cabeça.
- **Erradas típicas:** viés olhando a validação; variância pela distância; `>=` no limite; ações trocadas (mais dados para resolver viés); média no `axis=0`; treino e validação trocados; arrays no retorno; `learning_curve` sem `shuffle` em dados ordenados; ignorar os tamanhos; frações no lugar dos tamanhos; variância do modelo confundida com a dos dados; viés sem o quadrado; mesmos `x` em todas as repetições.
- **Resultado:** 9, 9 e 7 casos; 5, 7 e 6 soluções erradas.

## Módulo 5 · Árvores e ensembles

`bibliotecas: [numpy, pandas, scikit-learn]`, perfil `ml`. Florestas com até 30 árvores nos casos (regra 9). Dados: clientes de uma financeira inventada (renda em milhares, comprometimento em %, idade; 15 % dos rótulos trocados para imitar ruído), em `clientes.py` na m5-02 e, com `possui_reserva` e `id_cliente`, na m5-04; consumo de energia fictício (`consumo.py`, m5-03).

### n5-m5-01-arvores-de-decisao · Árvores de decisão (escrita e verificada)
- **Arquivo:** `05-arvores-e-ensembles/01-arvores-de-decisao.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Perguntas binárias** (KaTeX: Gini e entropia; Mermaid: a árvore de profundidade 2 aprendida dos clientes fictícios)
  2. **Previsão · Gini de três nós** (Gini e entropia de nós puros, 50/50 e 25/75; entropia como $\sum p \log_2(1/p)$ para não imprimir `-0.0`)
  3. **Exercício (lacunas) · Impurezas** (`gini(y)`, `entropia(y)` em bits; conjunto vazio → 0; casos `call`)
  4. **Leitura · A melhor divisão** (KaTeX: ganho ponderado pelos tamanhos; limiares nos pontos médios; empate pelo menor atributo e menor limiar; `float32` no limiar do scikit-learn)
  5. **Exercício (código) · Melhor divisão** (`melhor_divisao(X, y)` → `(atributo, limiar, ganho)` ou `(None, None, 0.0)` sem ganho positivo, igual à raiz do `DecisionTreeClassifier(max_depth=1, random_state=0)` no `setup` em 40 linhas, limiar a `1e-6`)
  6. **Leitura · Recursão, parada e poda** (tabela treino/validação por profundidade; `InvalidParameterError` de `max_depth=0`; KaTeX de $R_\alpha(T)$; `export_text` real; invariância à escala; instabilidade medida em 5 reamostragens)
  7. **Exercício (código) · Uma árvore do zero** (`ArvoreSimples(max_depth)` com `fit`/`predict`, recursiva, guardando a árvore em dicionários aninhados (`raiz_`); previsões iguais às do `DecisionTreeClassifier(max_depth=1, 2, 3)` em 50 pontos novos; `profundidade_por_cv(X, y, profundidades, semente)` → a profundidade, não a posição)
  8. **Quiz · Gini, entropia e escala**
- **Mudou na escrita:** a comparação com o scikit-learn ficou só em profundidades 1 a 3: sem limite, as previsões em pontos novos divergiram em 3 de 4 sementes (empates de ganho nos nós fundos, e o scikit-learn percorre os atributos numa ordem sorteada). O caso sem limite cobra só a memorização do treino.
- **Erradas típicas:** `if not y` com array; `len(y) == 1` como vazio; erro de classificação no lugar do Gini; entropia em nats; limiares nos valores observados; ganho sem ponderar; pontos médios sem ordenar; empate com `>=`; dividir sem ganho; folha com o menor rótulo em vez do majoritário; ignorar `max_depth`; ramos trocados; profundidade escolhida pelo treino.
- **Resultado:** 11, 11 e 9 casos; 6 soluções erradas em cada exercício.

### n5-m5-02-florestas-aleatorias · Bagging e florestas aleatórias (escrita e verificada)
- **Arquivo:** `05-arvores-e-ensembles/02-florestas-aleatorias.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · A média de modelos instáveis** (KaTeX: $\rho\sigma^2 + (1-\rho)\sigma^2/B$; bootstrap; $(1-1/n)^n \to e^{-1}$)
  2. **Previsão · O que fica fora da bolsa** (um bootstrap de 8 índices escrito à mão com `unique`, `setdiff1d` e `bincount`, e $(1 - 1/m)^m$ para $m = 2, 10, 1000$)
  3. **Exercício (lacunas) · Bootstrap e fora da bolsa** (`amostra_bootstrap(n, semente)`; `fora_da_bolsa(indices, n)`)
  4. **Leitura · Bagging e max_features** (tabela árvore 0,76 / bagging 0,81 / floresta `sqrt` 0,84 e concordância média entre árvores 0,804 contra 0,749; padrões do classificador e do regressor; três ajustes sem `random_state`: 0,83, 0,84, 0,81)
  5. **Exercício (código) · Bagging de árvores** (`bagging_arvores(X, y, X_novo, n_arvores, semente)` por votação → `ndarray` de rótulos, empate pelo menor; referência: um bagging escrito no `setup`; `n_arvores=1` contra a árvore da amostra da semente)
  6. **Leitura · OOB, hiperparâmetros e extrapolação** (`oob_score_` 0,823; o `AttributeError` sem `oob_score=True`; o `UserWarning` com poucas árvores; OOB como validação; tabela do platô)
  7. **Exercício (código) · OOB e extrapolação** (`oob_manual(X, y, n_arvores, semente)` por contagem de votos, a menos de 0,03 do `oob_score_` de `RandomForestClassifier(30, max_features=None)` e literal; `extrapolacao(x_tr, y_tr, x_novo, semente)` com `RandomForestRegressor(n_estimators=20)` → previsões constantes acima do máximo)
  8. **Quiz · max_features**
- **Muda do roteiro:** `variancia_das_predicoes(modelo_factory, ...)` com `call` vira leitura + Previsão (fábrica não passa por `call`).
- **Mudou na escrita:** a Previsão da primeira versão (fração única de um bootstrap sorteado com semente) não é previsível lendo o código; ficou o bootstrap escrito à mão. O `oob_manual` conta votos, e o scikit-learn faz a média de probabilidades: por isso a comparação com o `oob_score_` é por tolerância, e o valor exato vem da própria definição.
- **Erradas típicas:** bootstrap sem reposição (`permutation`); `integers(0, n - 1)`; gerador sem semente ou recriado a cada árvore; `setdiff1d` com argumentos trocados; universo sem o último índice; amostra do tamanho de `X_novo`; posições no lugar dos rótulos; `Counter.most_common` no empate; OOB medido no treino (1,0); linhas sem voto contadas como erro; atributo como vetor (`Expected 2D array`); `reshape(1, -1)`.
- **Resultado:** 8, 6 e 9 casos; 6 soluções erradas em cada exercício.

### n5-m5-03-gradient-boosting · Gradient boosting por dentro (escrita e verificada)
- **Arquivo:** `05-arvores-e-ensembles/03-gradient-boosting.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Ajustar aos resíduos** (KaTeX: modelo aditivo, resíduo como gradiente negativo do MSE; Mermaid dos estágios)
  2. **Previsão · Os resíduos depois do primeiro estágio** (seis pontos, toco, taxa 0,5)
  3. **Exercício (lacunas) · Um estágio** (`primeiro_estagio(X, y, profundidade, taxa)` → previsões e resíduos; referência `GradientBoostingRegressor(n_estimators=1)`)
  4. **Leitura · Taxa e número de estágios** (KaTeX de $F_M$; tabela taxa 1,0/0,3/0,1 com melhor estágio 5/37/69; curva que sobe no estágio 5 e tem o mínimo no 7; XGBoost, LightGBM e CatBoost só citados, sem existir no executor)
  5. **Exercício (código) · Boosting do zero** (`boosting_regressao(X, y, n_estagios, taxa, profundidade)` → `(previsoes, historico)` com `DecisionTreeRegressor(random_state=0)` e o histórico = MSE do treino depois de cada estágio; igual ao `GradientBoostingRegressor` e ao `staged_predict` do `setup` (diferença medida: 2e-15); `estagios_otimos(historico_validacao)`)
  6. **Leitura · HistGradientBoosting** (`max_bins=255`; `NaN` nativo e a mensagem do `GradientBoostingRegressor`; `early_stopping="auto"` só acima de 10 000 linhas; 56 iterações com parada contra 300; sem `random_state`: 38, 67, 36; `fit(X, y, X_val=..., y_val=...)`; `validation_score_`; floresta 0,774 contra HGB 0,802)
  7. **Exercício (código) · Parada antecipada** (`hgb_com_parada(X_treino, y_treino, X_teste, y_teste, semente)` → `{"n_iter", "r2_teste"}`; `comparar_floresta_boosting(X, y, semente)` com `KFold(3, shuffle=True)` e floresta de 30 árvores → dicionário com as duas pontuações de CV)
  8. **Quiz · Taxa contra estágios**
- **Mudou na escrita:** `hgb_com_parada` ganhou `X_teste, y_teste` para cobrar a "parada antecipada usando o teste" (via `X_val`: 41 iterações, e embaralhar `y_teste` muda a parada para 10).
- **Erradas típicas:** previsão inicial zero ou pela mediana no lugar da média; resíduo com sinal trocado; nova árvore ajustada ao alvo; sem a taxa; resíduos calculados uma vez só; histórico anotado antes de atualizar; estágio contado a partir de zero; parar no primeiro aumento da validação; parada no automático (300 iterações com 600 linhas); parada com o teste; R² no treino; `KFold` sem embaralhar; nota só da primeira partição.
- **Resultado:** 7, 9 e 8 casos; 5, 7 e 6 soluções erradas.

### n5-m5-04-interpretacao-de-modelos · Interpretação: importâncias, permutação e dependência parcial (escrita e verificada)
- **Arquivo:** `05-arvores-e-ensembles/04-interpretacao-de-modelos.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · O que a importância por impureza mede** (KaTeX do MDI e da importância por permutação; o viés para colunas contínuas e de alta cardinalidade; correlação; `permutation_importance` na validação)
  2. **Previsão · O identificador aleatório "importante"** (`id_cliente` à frente de `possui_reserva` no `feature_importances_`)
  3. **Exercício (lacunas) · Importância por permutação** (`importancia_por_permutacao(modelo, X, y, repeticoes, semente)` → médias por coluna, literal e a menos de 0,05 da `permutation_importance` com 10 repetições; diferença medida até 0,029)
  4. **Leitura · Dependência parcial e ICE** (KaTeX: média das previsões com a coluna fixada; ICE de $x_1$ subindo 3,7 com $x_2 > 5$ e −0,4 nas outras linhas, contra 2,0 da média; `method="auto"`/`recursion` desloca os números no boosting; associação no modelo, não causa; combinações impossíveis com atributos correlacionados; SHAP só citado)
  5. **Exercício (código) · Comparar importâncias** (`comparar_importancias(modelo, X_treino, y_treino, X_valid, y_valid, semente)` → `{"impureza", "permutacao"}`, listas de nomes ordenadas; um espião (subclasse da floresta que sobrescreve **só** o `predict`) cobra a permutação na validação)
  6. **Exercício (código) · Dependência parcial** (`curvas_ice(modelo, X, j, grade)` e `dependencia_parcial(modelo, X, j, grade)`, iguais a `partial_dependence(..., custom_values={j: grade}, method="brute", kind=...)` do `setup`, diferença 0,0)
  7. **Quiz · Correlação e importância**
- **Muda do roteiro:** `PartialDependenceDisplay` depende do matplotlib: a lição usa a função `partial_dependence` e descreve a curva em texto; SHAP fica só citado.
- **Mudou na escrita:** com clientes fictícios, o `id_cliente` fica em 3.º pela impureza (à frente de `possui_reserva`, binária e útil) e em último pela permutação; no topo ele não chega, porque comprometimento e renda decidem o alvo (a primeira versão dizia "no topo de uma e no fim da outra"). `comparar_importancias` ganhou o treino para cobrar "permutar no treino"; `curvas_ice` entrou no passo 6.
- **Erradas típicas:** embaralhar o `X` recebido (`np.asarray` devolve o mesmo objeto); sinal trocado; `np.random.permutation` global; embaralhar as linhas inteiras; permutar no treino (o espião anota `[350]` no lugar de `[150]`); ordem crescente; ordenar pelo `importances_std`; modelo sem `fit`; fixar a coluna no próprio `X`; média ao longo da grade; mediana; deslocar a coluna em vez de fixar; ICE transposta.
- **Resultado:** 6, 6 e 7 casos; 6, 5 e 5 soluções erradas.

## Módulo 6 · SVM e aprendizado não supervisionado

`bibliotecas: [numpy, scikit-learn]`, perfil `ml`. Dados em arquivos da própria lição: `pecas.py` e `sensores.py` (m6-01), `nuvens.py` (m6-02), `formas.py` (m6-03: luas, anéis, nuvens com ruído), `medidas.py` (m6-04), `transacoes.py` (m6-05). Partições comparadas por ARI, nunca rótulo a rótulo; `not_calls` em `KMeans` e `DBSCAN` nos exercícios "do zero".

### n5-m6-01-svm-e-kernels · SVM: margem máxima e kernels (escrita e verificada)
- **Arquivo:** `06-svm-e-aprendizado-nao-supervisionado/01-svm-e-kernels.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · A maior margem** (KaTeX: $\min \tfrac12\lVert w \rVert^2 + C \sum \max(0, 1 - y_i(w \cdot x_i + b))$; $C$ como inverso da regularização; `support_`, `n_support_`, `coef_`)
  2. **Previsão · Vetores de suporte com C pequeno e grande** (seis pontos à mão: com $C = 100$, `support_` = `[1, 2, 3]`, $w = (0{,}4; 0{,}4)$, $b = -1{,}4$, largura 3,536; com $C = 0{,}01$, os seis)
  3. **Exercício (lacunas) · Perda hinge** (`perda_hinge(w, b, X, y, C)` com rótulos ±1)
  4. **Leitura · Subgradiente da hinge** (KaTeX das derivadas com o conjunto ativo; perceptron preso em $w = 0$; `SGDClassifier(loss="hinge")`)
  5. **Exercício (código) · SVM linear do zero** (`svm_linear(X, y, C, taxa, epocas)` → `(w, b)`: concordância ≥ 0,98 com `SVC(kernel="linear", C=1)` do `setup` no treino e em 40 pontos novos, objetivo a menos de 2 % do mínimo, duas épocas à mão com resultado literal; `contar_vetores_de_suporte(X, y, Cs)` → uma contagem por valor de `C`)
  6. **Leitura · Kernels e escala** (KaTeX do RBF; tabela de `gamma` nos sensores; `AttributeError: coef_ is only available when using a linear kernel`; sem padronizar, o `SVC()` prevê "sem falha" para todo o teste; tempos do `SVC` com 1 000/2 000/4 000 linhas contra o `LinearSVC`; `probability=True`)
  7. **Exercício (código) · C, gamma e escala** (`grade_c_gamma(X, y, Cs, gammas, k)` → melhor par; `efeito_da_escala(X, y, semente)` → acurácias sem e com padronizar, dividindo com `stratify=y` e `test_size=0.25`; dados `sensores.py`)
  8. **Quiz · C e gamma**
- **Mudou na escrita:** `contar_vetores_de_suporte` recebe uma lista `Cs` (mostra a queda com $C$). "`probability=True` sem necessidade" virou só texto: não muda as previsões, e não há o que cobrar sem medir tempo.
- **Erradas típicas:** rótulos 0/1 na hinge; multa sem o `max`; norma sem o quadrado; regularizar o `b`; média no lugar da soma; margem sem o rótulo; só os pontos com margem < 0 (fica em $w = 0$); passo no sentido do gradiente; kernel padrão no lugar do linear; grade sem padronizar; `C` e `gamma` trocados; empate com `>=`; nota no treino; divisão sem estratificar ou sem semente.
- **Resultado:** 9, 11 e 8 casos; 6, 8 e 8 soluções erradas.

### n5-m6-02-k-means · k-means do zero (escrita e verificada)
- **Arquivo:** `06-svm-e-aprendizado-nao-supervisionado/02-k-means.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Inércia e o algoritmo de Lloyd** (KaTeX da inércia; Visualizar: duas iterações em Python puro com 6 pontos, inércia 24,75 → 10,67, com o empate do ponto (3, 4); o aviso do LDSO no stderr)
  2. **Previsão · Rótulos que trocam de nome** (seis pontos, sementes 0 e 5: `[2, 2, 0, 0, 1, 1]` e `[0, 0, 2, 2, 1, 1]`, concordância 0,333, ARI 1,0, mesma inércia e mesmos centróides)
  3. **Exercício (lacunas) · Atribuir e atualizar** (`atribuir(X, C)`, `atualizar(X, rotulos, C)`: cluster vazio mantém o centróide anterior; referência `KMeans(4, n_init=10, random_state=0)` no `setup`)
  4. **Leitura · k-means++ e n_init** (tabela com 6 nuvens e 20 sementes: `random`/`n_init=1` chega ao mínimo em 8 de 20, k-means++/`n_init=1` em 10 de 20, `random`/`n_init=10` em 20 de 20; KaTeX do sorteio $D^2$; `n_init="auto"` = 1 execução com k-means++ no 1.8)
  5. **Exercício (código) · k-means do zero** (`inicializar_mais_mais(X, k, semente)` com o sorteio especificado (`rng.integers` e `rng.choice(n, p=D²/ΣD²)`) para ter resultado literal; `kmeans(X, k, semente, max_iter=100, tol=1e-6)` → `(C, rotulos, inercia)`; ARI 1,0, inércia a `1e-6` e centróides contra `KMeans(4, random_state=0)`; para pela mudança dos centróides; `not_calls` `KMeans`)
  6. **Leitura · Escolher k e aplicações** (tabela inércia × silhueta de k = 1 a 8; KaTeX da silhueta; o `ValueError` da silhueta com um grupo; RFM fictício: ARI 0,008 sem padronizar e 1,0 com; anéis: ARI 0,012)
  7. **Exercício (código) · Silhueta e cores** (`escolher_k_silhueta(X, ks, semente)`; `quantizar_cores(imagem, k, semente)` → imagem com `k` cores distintas e a mesma forma, numa imagem sintética 12 × 10 com 4 cores e ruído)
  8. **Quiz · Mínimos locais**
- **Mudou na escrita:** `atualizar` recebe os centróides anteriores no lugar de `k` (sem eles não há como manter o centróide de um grupo vazio). `inicializar_mais_mais` entrou no passo 5 (objetivo 1 da lição: k-means++). A errada "inicialização única" virou leitura + quiz: com `n_init`, o resultado de nuvens separadas não muda. Medido: o k-means++ sozinho (`n_init=1`) não evita mínimos locais em 6 nuvens em grade (10 de 20 sementes); só as reinicializações resolvem.
- **Erradas típicas:** `argmax`; soma no eixo errado; cluster vazio vira `nan`; soma no lugar da média; alterar o `C` recebido; sorteio proporcional à distância sem o quadrado; distância só ao último centróide; gerador sem semente; número fixo de iterações sem checar mudança; inércia sem o quadrado; rótulos de antes da última atualização; k pela menor inércia; `reshape(-1, 1)` nas cores; rótulos no lugar das cores.
- **Resultado:** 8, 12 e 8 casos; 6, 6 e 5 soluções erradas.

### n5-m6-03-clustering-hierarquico-e-dbscan · Clustering hierárquico e DBSCAN (escrita e verificada)
- **Arquivo:** `06-svm-e-aprendizado-nao-supervisionado/03-clustering-hierarquico-e-dbscan.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Juntar os mais próximos** (Mermaid: a ordem de fusões de 5 pontos; KaTeX das ligações simples, completa e média; Ward em texto; `scipy.cluster.hierarchy.linkage` e `fcluster`, sem desenhar o dendrograma; o `ClusterWarning` ao passar a matriz quadrada)
  2. **Previsão · Cortar por distância** (alturas `[1.0, 1.5, 3.5, 4.0]`, tamanhos `[2, 2, 3, 5]`, número de grupos nos cortes 1,2/3,0/3,8/5,0 e as alturas da ligação completa `[1.0, 1.5, 5.0, 10.0]`)
  3. **Exercício (lacunas) · Aglomerativo** (`aglomerativo(X, k, ligacao)`, ARI 1,0 com `AgglomerativeClustering(n_clusters=k, linkage=...)` nas quatro ligações; `alturas_das_fusoes(X, ligacao)`)
  4. **Leitura · DBSCAN** (KaTeX da vizinhança; núcleo, borda, ruído; borda não espalha; `eps=0.6` acha 3 grupos e 18 ruídos em 140 pontos, e com uma coluna × 1 000 os 140 viram ruído; k-distâncias: 80 % abaixo de 0,58, máximo 4,32; `eps` no **joelho** da curva)
  5. **Exercício (código) · DBSCAN do zero** (`dbscan(X, eps, min_samples)` → rótulos com `-1` para ruído; ARI 1,0 com `DBSCAN` no `setup` e o mesmo conjunto de ruídos, em nuvens com ruído e em luas; `not_calls` `DBSCAN`)
  6. **Leitura · Qual método para qual forma** (tabela de ARI de k-means/Ward/simples/DBSCAN em nuvens com ruído, luas, anéis e densidades diferentes, gerados na lição e medidos no executor)
  7. **Exercício (código) · eps sugerido e contagem** (`eps_sugerido(X, k)` pelo **joelho** das k-distâncias ordenadas (k-distância sem contar o próprio ponto; posição e valor normalizados para [0, 1]; o ponto de maior distância até a corda); `resumo_clusters(rotulos)` → `{"grupos", "ruido", "maior"}`, sem contar o ruído como grupo)
  8. **Quiz · Escolher o método**
- **Muda do roteiro:** `metodo_recomendado(descricao)` vira quiz; o dendrograma desenhado sai (sem matplotlib).
- **Mudou na escrita:** a primeira versão pedia `eps_sugerido` "pelo maior salto das k-distâncias ordenadas". Medido no executor, o maior salto cai entre dois pontos de **ruído** sempre que há ruído (nas nuvens com 20 pontos soltos, eps 1,62, e o DBSCAN junta tudo num grupo, ARI 0). A lição usa o joelho (como no roteiro do stub), que acerta as nuvens com ruído (ARI 0,94) mas fica curto em luas e anéis (0,23); a leitura diz isso, e "eps pelo maior salto" virou uma das erradas (ver "Decisões para o Filipe", 12).
- **Erradas típicas:** ligação fixa em `ward`; `criterion="distance"` com `t=k`; rótulos começando em 1; coluna errada do `Z` no lugar da altura; ponto de borda tratado como núcleo; vizinhança com `<`; `min_samples` sem contar o próprio ponto; ruído contado como grupo; sem expansão pelos vizinhos núcleo; k-distância contando o próprio ponto; `eps` pelo maior salto; k-distâncias sem ordenar; maior grupo contando o ruído. Single linkage encadeando e DBSCAN sem padronizar ficaram na leitura e no quiz.
- **Resultado:** 9, 10 e 11 casos; 5, 6 e 6 soluções erradas.

### n5-m6-04-pca · PCA do zero (escrita e verificada)
- **Arquivo:** `06-svm-e-aprendizado-nao-supervisionado/04-pca.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Direções de maior variância** (KaTeX da covariância e da variância explicada; `eigh` em ordem crescente e nas colunas contra `components_` nas linhas; o que acontece sem centralizar)
  2. **Previsão · O sinal dos autovetores** (cinco pontos: covariância `[[7.5, 5.75], [5.75, 7.5]]`, autovalores 1,75 e 13,25; o `eigh` devolve `(-0.7071, 0.7071)` e o `PCA` `(0.7071, -0.7071)` para o mesmo componente)
  3. **Exercício (lacunas) · PCA pela covariância** (`pca_cov(X, k)` → `(componentes, variancia_explicada)` com `eigh` e ordenação decrescente; comparado com `PCA(k).components_` e `explained_variance_ratio_` do `setup` em valor absoluto)
  4. **Leitura · SVD** (KaTeX de $X_c = USV^\top$ e $\lambda_j = s_j^2/(n-1)$; `svd_solver="auto"` escolhe `"covariance_eigh"` com $n \gg d$; a regra de sinal do scikit-learn; `PCA(0.95)` e o empate)
  5. **Exercício (código) · PCA por SVD e quantos componentes** (`pca_svd(X, k)` com o sinal alinhado pela regra do scikit-learn (positiva a coordenada de maior valor absoluto), comparado **com sinal** contra o `PCA`; `n_componentes_para(X, fracao)` → o menor $k$ cuja variância acumulada **passa** da fração, contra `PCA(fracao).n_components_`)
  6. **Leitura · Projetar, reconstruir e escalar** (erro de reconstrução 0,134 / 0,015 / 0,003 / 0 com 1 a 4 componentes; padrões 5 × 5 fictícios (cruz, moldura, diagonal): 81 % em 2 componentes e três famílias separadas no plano; uma coluna em milésimos domina o PC1; vazamento; t-SNE existe, UMAP não)
  7. **Exercício (código) · Reconstrução** (`reconstruir(X, k)` → `(X_rec, erro)`, conferido com `inverse_transform`; `pca_padronizado(X_treino, X_teste, k)`, conferido com `make_pipeline(StandardScaler(), PCA(k)).fit(X_treino)`)
  8. **Quiz · Centralizar e o sinal**
- **Muda do roteiro:** os dígitos e as "eigenfaces nos dígitos" dependem da decisão 1; sem ela, o exemplo de alta dimensão são padrões 5 × 5 gerados na leitura, sem exercício sobre eles. t-SNE **existe** no executor (o roteiro dizia que não).
- **Mudou na escrita:** `n_componentes_para` segue o critério **estrito** do scikit-learn 1.8, conferido no executor (com duas direções de variância igual, `PCA(0.5)` dá 2), e não a leitura ingênua "chega à fração" (ver "Decisões para o Filipe", 13). `pca_padronizado` recebe `X_treino, X_teste` (a primeira versão dizia `(X, k)`) para cobrar o "PCA ajustado em treino + teste".
- **Erradas típicas:** não centralizar; média das linhas; autovalores em ordem crescente; componentes em colunas; variância explicada sem dividir pelo total (ou dividida pela soma dos k escolhidos); sinal sem alinhar; valores singulares sem o quadrado; colunas de `U` no lugar das linhas de `Vt`; soma acumulada com `>=`; contagem a partir de zero; esquecer a média de volta; erro sem o quadrado; PCA ajustado em treino + teste; `fit_transform` no teste; sem padronizar.
- **Resultado:** 8, 9 e 8 casos; 6 soluções erradas em cada exercício.

### n5-m6-05-deteccao-de-anomalias · Detecção de anomalias (escrita e verificada)
- **Arquivo:** `06-svm-e-aprendizado-nao-supervisionado/05-deteccao-de-anomalias.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Anomalia, outlier, novidade** (transações fictícias: valor, hora, distância; KaTeX de Mahalanobis; `solve` em vez de inversa; com uma coluna combinação das outras o `solve` devolve números sem erro, então o posto precisa ser conferido)
  2. **Previsão · fit_predict e novidade no LOF** (`[1, 1, 1, 1, 1, -1]`, fatores `[0.97, 0.97, 0.97, 0.97, 1.11, 8.1]`, `predict` de novidade `[1, -1]`, `hasattr` dos dois modos `False False`)
  3. **Exercício (lacunas) · Mahalanobis** (`mahalanobis(X)` → distância de cada linha, com `solve`; covariância singular, detectada pelo posto, → `ValueError`; referência `scipy.spatial.distance.mahalanobis` no `setup`)
  4. **Leitura · IsolationForest e LOF** (KaTeX de $s(x) = 2^{-E[h]/c(n)}$; `score_samples` com sinal trocado: −0,71 nas anomalias e −0,41 nas normais; `offset_` e contaminação: 9 de 300 com 0,03, 30 com `"auto"`; os `AttributeError` de `predict` e `fit_predict` do LOF)
  5. **Exercício (código) · Dois detectores** (`anomalias_isolation_forest(X, contaminacao, semente)` com `n_estimators=50` → lista de índices; `erro_de_reconstrucao_pca(X, k)`, padronizando antes)
  6. **Leitura · Avaliar com poucos rótulos** (acurácia de 97 % chamando tudo de normal; KaTeX de $P@k$; tabela Mahalanobis/IsolationForest/LOF com $P@9$ 0,89/1,00/0,78, $P@20$ 0,45 e AP 0,98/1,00/0,94; limiar por quantil; contaminação escolhida no teste é vazamento)
  7. **Exercício (código) · Precisão em k** (`precisao_em_k(scores, rotulos, k)`, empate pelo menor índice; `comparar_detectores(X, rotulos, k, semente)` → `{"isolation_forest", "lof"}` com a precisão em `k` de cada um)
  8. **Quiz · Contaminação**
- **Mudou na escrita:** "covariância singular → `ValueError`" não vem do numpy: o `solve` não levanta nada com uma coluna combinação linear das outras (nem com uma coluna duplicada, no executor), e o `LinAlgError` herda de `ValueError`. Por isso o caso usa uma combinação linear e a checagem do posto é explícita. Sem padronizar, o valor em reais domina o erro de reconstrução. Mahalanobis fica fora de `comparar_detectores` (já é o passo 3) e aparece só na tabela da leitura. `n_estimators=50` pelo orçamento do lote.
- **Erradas típicas:** covariância das linhas (`rowvar=True`); posto comparado com `d - 1`; sem centralizar; euclidiana; sem a raiz; índices das normais; floresta sem semente; contaminação ignorada; erro sem padronizar; erro médio de todas as linhas; PCA com todos os componentes; ordenar as pontuações no sentido errado (no `IsolationForest`, menor é mais anômalo); dividir pelo total de anomalias (recall em k); `argsort(scores)[::-1]` no empate; `negative_outlier_factor_` sem trocar o sinal. "Avaliar com acurácia" e o `fit_predict` do LOF em dados novos ficaram na leitura, na Previsão e no quiz.
- **Resultado:** 7, 9 e 8 casos; 5, 6 e 6 soluções erradas.

## Módulo 7 · Boas práticas de machine learning

`bibliotecas: [numpy, pandas, scikit-learn]`, perfil `ml`. Os espiões da regra 6 são a ferramenta principal do módulo, sobrescrevendo **só** o método certo: `StandardScaler.fit` (m7-01 p3), `SelectKBest.fit` (m7-01 p5), uma função de reamostragem injetada e `LogisticRegression.fit` (m7-02 p7). Dados: assinantes de um serviço inventado (`assinantes.py`, m7-01), transações de uma carteira digital inventada (`transacoes.py`, m7-02), clientes de uma financeira inventada (`clientes.py`, m7-03), pessoas de dois grupos neutros e regiões de uma cidade inventada (m7-04).

### n5-m7-01-vazamento-de-dados · Vazamento de dados e validação honesta (escrita e verificada)
- **Arquivo:** `07-boas-praticas-de-ml/01-vazamento-de-dados.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Quatro vazamentos** (Mermaid: alvo, pré-processamento, duplicatas, tempo; assinantes fictícios com `dias_desde_cancelamento`)
  2. **Previsão · AUC com e sem a coluna do futuro** (`roc_auc_score` da própria coluna do futuro como score = 1.0, de um score constante = 0.5, e o sinal da AUC dos meses de casa)
  3. **Exercício (lacunas) · O fluxo honesto** (`fluxo_honesto(X, y, semente, escalador=None)` → `{"media", "notas"}` com `Pipeline` + `cross_val_score` (AUC, `StratifiedKFold(5, shuffle=True)`); o espião anota os tamanhos de cada `fit`)
  4. **Leitura · Pré-processamento e seleção antes da divisão** (KaTeX $\sqrt{2\ln d / n}$; 1 000 colunas de ruído: 0,961 com seleção antes contra 0,522 dentro do pipeline, medidos; a AUC de validação cruzada com e sem a coluna do futuro, 0,76 e 0,99)
  5. **Exercício (código) · Corrigir o fluxo** (`corrigir_fluxo(X, y, k_atributos, semente, seletor=None)` → `float`, com `SelectKBest` dentro do pipeline e o seletor espião injetado; `atributos_suspeitos(df, alvo, limiar)` → nomes ordenados por correlação absoluta, ignorando colunas de texto)
  6. **Leitura · Duplicatas e tempo**
  7. **Exercício (código) · Duplicatas e divisão temporal** (`duplicatas_entre_conjuntos(X_tr, X_te)` → rótulos do índice do teste; `divisao_temporal(df, coluna_data, fracao_teste)` com `round(len(df) * fracao_teste)` linhas de teste, treino antes do teste)
  8. **Quiz · Onde está o vazamento** (trechos de código; substitui o `encontrar_vazamento(codigo)` do roteiro)
- **Mudou na escrita:** a AUC de validação cruzada com e sem a coluna do futuro não é previsível lendo o código; a Previsão usa a AUC da própria coluna, e os números da validação cruzada foram para a leitura.
- **Erradas típicas:** escalar antes da validação cruzada (espião `[200]`); ignorar o escalador recebido; modelo sem a escala; `KFold` sem estratificar; semente fixa; acurácia no lugar da AUC; selecionar antes de dividir (AUC 0,93 em ruído puro; espião `[60]`); `SelectKBest` com o k padrão; correlação sem valor absoluto; incluir o próprio alvo; correlação com colunas de texto; duplicata comparada por índice e não por valores; só a primeira coluna; `train_test_split` embaralhado; não ordenar pela data; `sort_values(inplace=True)` no df recebido.
- **Resultado:** 8, 10 e 9 casos; 6, 7 e 8 soluções erradas.

### n5-m7-02-dados-desbalanceados · Dados desbalanceados (escrita e verificada)
- **Arquivo:** `07-boas-praticas-de-ml/02-dados-desbalanceados.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Quando 1 % é positivo** (KaTeX $w_c = n / (k\,n_c)$; quando o desbalanceamento é e não é problema; pesos deslocam o intercepto)
  2. **Previsão · Os pesos e o modelo que sempre diz "não"** (`compute_class_weight` = `[0.5051, 50.0]`, soma 1000.0; `DummyClassifier`: 0.99, 0.0 e 0.5 de `balanced_accuracy`)
  3. **Exercício (lacunas) · O efeito do class_weight** (`efeito_class_weight(X, y, semente)` → recall **e** precisão da classe rara sem e com pesos; recall das fraudes 0,083 sem pesos e 0,917 com)
  4. **Leitura · Reamostrar só o treino** (KaTeX do SMOTE; `ModuleNotFoundError: No module named 'imblearn'`, conferido; oversampling e undersampling)
  5. **Exercício (código) · Oversampling e SMOTE** (`oversampling(X, y, semente)` com reposição; `smote_simplificado(X, y, k, semente)` → pontos sintéticos conferidos por propriedade: cada um num segmento entre um raro e um dos seus k vizinhos raros, nenhum igual a um original, contagens e reprodutibilidade)
  6. **Leitura · Métricas e limiar para a classe rara** (KaTeX de precisão@k e recall@k; com pesos, 52 transações marcadas contra 3 no mesmo limiar e AUC 0,968 contra 0,966, medidos)
  7. **Exercício (código) · Validação com reamostragem correta** (`cv_com_reamostragem(modelo, X, y, k, semente, reamostrar)` → AP de cada partição; a reamostragem injetada é um espião que anota `len(X)`, esperado `[240] * 5`, e um espião da logística anota a proporção de positivos de cada ajuste, `[0.5] * 5`; `comparar_metricas(y, scores, k)` com o `k` da precisão@k)
  8. **Quiz · Reamostrar a validação**
- **Mudou na escrita:** a m3-02 já tem a Previsão "acurácia com 99 % de negativos"; esta mostra os pesos do `class_weight="balanced"`, a soma dos pesos e a `balanced_accuracy_score` do `DummyClassifier`.
- **Erradas típicas:** divisão sem estratificar; treinar com o conjunto inteiro; recall da classe normal; acurácia como métrica; precisão e recall trocados; pesos iguais nos dois modelos; `replace=False` no oversampling; sortear entre todas as linhas; supor que a rara é a 1; vizinhos de qualquer classe ou incluindo o próprio ponto; $\lambda$ sem limite; reamostrar antes de dividir (`[300]`); reamostrar também a validação; AP com o `predict`; treinar sem reamostrar; precisão@k com os menores scores; limiar estrito (`> 0.5`); precisão@k dividida pelos positivos.
- **Resultado:** 8, 9 e 8 casos; 6, 8 e 8 soluções erradas.

### n5-m7-03-engenharia-de-atributos · Engenharia de atributos (escrita e verificada)
- **Arquivo:** `07-boas-praticas-de-ml/03-engenharia-de-atributos.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Datas, razões e logs** (`dt.dayofweek`, `renda / divida`, $\log(1 + x)$ e `log1p`; `KBinsDiscretizer` com `quantile_method` explícito; `FunctionTransformer`; `PolynomialFeatures(interaction_only=True)`)
  2. **Previsão · Atributos de uma data** (`dayofweek`, fim de semana, hora, `day_name()` e o `dtype` `int32` do pandas 3)
  3. **Exercício (lacunas) · Atributos de data** (`atributos_de_data(df, coluna)` → tabela nova com `dia_semana`, `fim_de_semana`, `mes`, `hora` (int64/bool); colunas e `dtypes` exatos)
  4. **Leitura · Target encoding sem vazamento** (KaTeX: média suavizada; a versão ingênua usa o alvo da própria linha; `TargetEncoder` com *cross fitting* no `fit_transform`)
  5. **Exercício (código) · Target encoding com folds** (`target_encoding_com_folds(categorias, y, k, suavizacao, semente)` com `KFold(k, shuffle=True)` → cada linha codificada só com as outras partições; referência `TargetEncoder(smooth=5.0, cv=5, shuffle=True, random_state=0, target_type="continuous").fit_transform` no `setup`, diferença < 1e-9; propriedade: trocar o alvo de uma linha não muda o código dela)
  6. **Leitura · Seleção de atributos** (filtro, embutido, `RFE`/`RFECV`; custo e otimismo do `RFECV`)
  7. **Exercício (código) · Ganho e seleção** (`ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente)` com a coluna nova como `Series` com nome, medindo AUC; `selecionar_rfecv(X, y, semente)` → índices, com `RFECV(LogisticRegression(), step=1, cv=StratifiedKFold(3, shuffle=True), scoring="roc_auc")`, que mantém exatamente as 3 colunas informativas, `[0, 3, 5]`)
  8. **Quiz · Target encoding ingênuo**
- **Mudou na escrita:** o `TargetEncoder` de referência usa `target_type="continuous"`: com alvo binário e `"auto"`, ele usa `StratifiedKFold`, e as partições não batem. A razão dívida/renda numa regressão logística ganhou só 0,006 a 0,021 (o limiar de uma razão é uma reta pela origem, que a logística já representa); os casos medem o ganho numa árvore de profundidade 3 (0,722 → 0,776; ruído: −0,0004), e a leitura explica a razão pela fronteira diagonal.
- **Erradas típicas:** `dt.day` no lugar de `dt.dayofweek`; `> 5`; domingo como dia 0; mês em `int32`; fim de semana como 0 e 1; target encoding com o alvo da linha (a versão ingênua); ignorar a suavização (ou só no numerador); média geral no lugar da das outras partições; `KFold` sem embaralhar; categoria ausente vira zero; ganho com o sinal trocado; acrescentar a coluna no `X` recebido; partições diferentes nas duas medidas; ajustar o pipeline recebido; acurácia no lugar da AUC; devolver a máscara ou o `ranking_`.
- **Resultado:** 8 casos em cada exercício; 5, 7 e 7 soluções erradas.

### n5-m7-04-etica-e-vies-em-modelos · Ética, justiça e viés em modelos (escrita e verificada)
- **Arquivo:** `07-boas-praticas-de-ml/04-etica-e-vies-em-modelos.lvl.md` · 100 XP · 40 min
- **Dados:** grupos fictícios e neutros ("grupo A"/"grupo B", regiões norte/sul/centro de uma cidade inventada); nenhum caso, empresa, órgão ou população real, e nenhuma afirmação sobre grupos reais.
- **Passos (8):**
  1. **Leitura · De onde vem o viés** (amostra, rótulo histórico, proxy; taxas de decisão contra taxas de erro; KaTeX do erro padrão da TPR com $n_+$)
  2. **Previsão · Taxas por grupo** (12 pessoas: taxa de positivos, TPR, taxa-base e número de positivos por grupo; a TPR de 1,0 do grupo B vem de 1 positivo)
  3. **Exercício (lacunas) · Métricas por grupo** (`metricas_por_grupo(y, y_pred, grupo)` → `{grupo: {"n", "taxa_positivos", "tpr", "fpr"}}`; TPR `None` em grupo sem positivos)
  4. **Leitura · Critérios de justiça e o conflito entre eles** (KaTeX: paridade demográfica, igualdade de oportunidade; *equalized odds*; modelo perfeito com taxas-base diferentes; a impossibilidade de calibração em cada grupo com TPR e FPR iguais quando as taxas-base diferem)
  5. **Exercício (código) · Dois critérios** (`paridade_demografica(y_pred, grupo)`; `igualdade_de_oportunidade(y, y_pred, grupo)`, como diferenças máximas)
  6. **Leitura · Proxies, mitigação e LGPD** ($\max(\text{AUC}, 1 - \text{AUC})$; remover o atributo sensível não basta; reponderar, restrições, limiares por grupo escolhidos na validação; a LGPD pelos princípios (finalidade, necessidade, não discriminação) e pelo direito de revisão de decisões automatizadas, sem número de artigo; model card)
  7. **Exercício (código) · Proxies e limiares por grupo** (`detectar_proxies(X, sensivel, limiar)` pela AUC de prever o atributo sensível, com $\max(\text{AUC}, 1 - \text{AUC})$ e `>=`: na cidade fictícia, `regiao_norte` e `renda` são proxies e `idade`/`tempo_no_endereco` não; `limiares_por_grupo(y, scores, grupo, tpr_alvo)` → o **maior** limiar que atinge a TPR alvo, conferido por propriedade em 400 scores fictícios)
  8. **Quiz · Trade-offs e LGPD**
- **Muda do roteiro:** "casos reais (crédito, recrutamento, reconhecimento facial)" viram casos descritos sem empresas, órgãos ou episódios reais (régua). O número do artigo da LGPD saiu do texto (por instrução); o frontmatter (descrição e objetivos com "LGPD") não mudou.
- **Erradas típicas:** positivos ou negativos de todos os grupos; taxa com os rótulos; TPR de grupo sem positivos como `nan` ou zero; razão no lugar da diferença; primeiro grupo menos o segundo; taxa dividida pelo total de pessoas; TPR com o denominador errado; AUC sem o sentido contrário; limiar estrito; um limiar para todos os grupos; o menor limiar; arredondar para baixo os positivos necessários. Remover o atributo sensível, comparar grupos sem o $n$ e escolher o limiar por grupo no teste ficaram na leitura e no quiz.
- **Resultado:** 8, 9 e 8 casos; 5, 6 e 6 soluções erradas.

## Módulo 8 · Projeto do nível

### n5-m8-01-projeto-previsao-de-inadimplencia · Projeto final: previsão de inadimplência (escrita e verificada)
- **Arquivo:** `08-projeto-do-nivel/01-projeto-previsao-de-inadimplencia.lvl.md` · projeto do nível (`projeto: true`) · 300 XP · 240 min · `bibliotecas: [numpy, pandas, scikit-learn]` (perfil `ml`)
- **Padrão de projeto (N1/N3/N4):** 8 passos; uma Leitura de especificação, uma Previsão, 5 exercícios de código livre e um Quiz de autoavaliação; a partir do passo 4 as funções dos passos anteriores vêm prontas num arquivo (`credito_base.py`), para o erro antigo não contaminar o passo novo.
- **Dados (fictícios, gerados):** `dados_credito.py` (entra como `python path=dados_credito.py` no código inicial e na solução dos 5 exercícios) com `gerar_clientes(n=2000, semente=2026)` e `escrever_csv(caminho, n, semente)`, que grava o CSV que o aluno lê com `pd.read_csv`. Colunas: `id_cliente` (identificador sorteado, sem valor), `renda_mensal` (lognormal, 5 % em branco; a média do log muda por região), `comprometimento` (beta × 1,2, 4 % em branco), `atrasos_12m` (Poisson), `meses_relacionamento`, `parcelas_em_aberto`, `tipo_contrato` (4 categorias; 3 % em branco, 4 % em maiúsculas e 3 % com espaço no fim: 12 grafias), `regiao` (A–E, fora do modelo e usada só na análise por grupo), `dias_em_cobranca` (a coluna que vaza: AUC 1,0 e correlação 0,915 com o alvo) e `inadimplente` (regra logística documentada na leitura). Sem idade, por ser atributo sensível em crédito. Com a semente 2026: 235 inadimplentes em 2 000 (11,75 %), 105/84/57 ausentes, divisão 1 500/500. Não é amostra de dados reais; o texto diz isso.
- **Passos (8):**
  1. **Leitura · O problema, os dados e o custo dos erros** (financeira fictícia, falso negativo custa 5 e falso positivo 1, KaTeX do custo por cliente; a regra logística do gerador em KaTeX; dicionário; Mermaid das 8 etapas; tabela de funções por passo; critérios de aprovação; AP como métrica; aviso de não deixar chamadas com 2 000 linhas no `main.py`)
  2. **Previsão · O que o cadastro esconde** (5 linhas escritas à mão lidas com `io.StringIO`: renda e contrato em branco, grafias diferentes, identificador e a coluna do futuro)
  3. **Exercício (código) · Explorar, limpar e dividir** (`carregar(caminho)`; `explorar(df)` → `{"linhas", "taxa_inadimplencia", "ausentes", "identificadores", "suspeitas"}`; `limpar(df)`; `dividir(df, semente)` estratificado, teste intocado)
  4. **Exercício (código) · Baseline e pipeline** (`montar_pipeline(modelo, imputador=None)`, com as constantes `COLUNAS_NUM`/`COLUNAS_CAT` e o `imputador` como ponto do espião da regra 6; `avaliar_cv(pipeline, X, y, semente)`; `baseline(X, y, semente)`)
  5. **Exercício (código) · Comparar modelos por validação cruzada** (`modelos_candidatos(semente)`; `comparar_modelos(X, y, semente, candidatos=None)` com `RepeatedStratifiedKFold` 3 × 2 e `cross_validate` → AP média, desvio e AUC de logística, floresta (30 árvores), HGB e `DummyClassifier`, com o `candidatos` recebendo o espião; `escolher_modelo(tabela)`; `buscar_hiperparametros(pipeline, grade, X, y, semente)` com grade de até 4 valores × 3 partições)
  6. **Exercício (código) · Limiar pelo custo e o teste, uma vez** (`custo_total` pronta; `scores_fora_da_dobra(pipeline, X, y, semente)` com `cross_val_predict`; `escolher_limiar(y, scores, custo_fp, custo_fn)`, menor limiar no empate; `avaliar_final(...)`, que recebe também o treino e os custos, ajusta um `clone` uma vez e devolve `{"ap", "auc", "precisao", "recall", "custo_por_cliente", "marcados", "previstos"}`)
  7. **Exercício (código) · Por região e o model card** (`resumo_por_regiao(y, previstos, regiao)`; `gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao)` no formato exato do enunciado; o relatório real dos 2 000 clientes aparece na narrativa)
  8. **Quiz · Autoavaliação do projeto** (custo com o limiar escolhido no teste, 0,384, contra o honesto, 0,412; acurácia 0,888 contra 0,883 com AP e custo; recall das regiões D e E com 3 inadimplentes cada)
- **Mudou na escrita:**
  - **Casos por exercício:** 16 a 17 (17, 17, 16, 16 e 16), todos de comportamento, e não 6–12: com 10,6 a lição saía "suspeita" no `content:metrics` (o mínimo dos projetos é 15,2, o do N1); o N4 fez o mesmo (15,4). Ver "Decisões para o Filipe", 8.
  - **Assinaturas:** `carregar`/`explorar`/`limpar`/`dividir` no lugar de `preparar(df)`/`dividir(df, semente)`; `avaliar_cv` e `baseline(X, y, semente)` no lugar de `baseline(X, y)`; `escolher_modelo` e `buscar_hiperparametros` entraram no passo 5; `scores_fora_da_dobra` e `escolher_limiar` no passo 6; `justica_por_grupo`/`gerar_model_card` viraram `resumo_por_regiao`/`gerar_relatorio`.
  - **Limiar pelos scores fora da dobra do treino** (`cross_val_predict`), e não numa validação separada: com 176 positivos no treino, separar mais uma fatia deixaria pouco para treinar.
  - **Previsão:** `gerar_clientes(200, 7)` não é previsível lendo o código (sorteio); ficaram 5 linhas escritas à mão, como no N4.
  - **Resultado do problema:** a logística vence as árvores (o gerador é logístico e há 1 500 linhas de treino); a lição diz isso e por que a comparação é feita mesmo assim. Números conferidos no executor: baseline 0,117 ± 0,001 de AP (AUC 0,500), logística 0,348 ± 0,046 (0,758), floresta 0,297 ± 0,033 (0,715), boosting 0,279 ± 0,044 (0,717); busca de `C`: 0,1, AP 0,352; limiar 0,193 e, no teste, AP 0,344, AUC 0,762, precisão 0,330, recall 0,508, custo 0,412, 91 marcados; com 0,5: 5 marcados, recall 0,051, custo 0,564.
- **Orçamento:** os casos usam de 300 a 600 clientes gerados com outras sementes, e o CSV de 2 000 só nos casos baratos do passo 3; os 30 000 clientes do roteiro ficam fora (medido no piloto: logística em 20–40 ms, floresta de 30 árvores em 0,5–0,6 s e HGB em 0,34–0,42 s com 30 000 × 8). Lote da solução: 0,21 s, 1,13 s, 2,17 s, 0,84 s e 0,21 s nos passos 3 a 7. Tamanho da lição: ~231 KB, quase tudo as erradas (cada uma repete o `main.py`); por passo, os arquivos do aluno somam ≈ 11 000 caracteres.
- **Erros que o projeto cobra:** manter a coluna do futuro ou o identificador; preencher os ausentes antes de dividir; só `lower` sem `strip`; dividir sem estratificar; pré-processar antes da CV (espião `[600]` no lugar de `[480] * 5`); `OneHotEncoder` sem `handle_unknown`; acurácia como métrica; comparar sem baseline; `RepeatedKFold`; avaliar no treino; escolher pela AUC ou pelo menor desvio; scores no próprio treino; limiar 0,5 por padrão; escolher o limiar de novo no teste; ajustar com treino e teste; região sem inadimplentes com recall 0,0; modelo escolhido digitado; relatório sem o aviso de poucos inadimplentes ou sem as limitações fixas.
- **Resultado:** 17, 17, 16, 16 e 16 casos; 9, 8, 11, 9 e 9 soluções erradas. Os passos 4 a 7 e a Previsão passam no `content:verify`; o passo 3 só passa pelo `verifyStep` com um lote por vez (ver "Decisões para o Filipe", 11).

## Prova

Banco de **40 questões, 10 por tentativa** (como N2, N3 e N4), a escrever depois dos módulos: nota mínima 70 %, 45 min, 60 min entre tentativas.

- **Proporção:** 5 (matemática), 5 (regressão), 7 (classificação), 7 (scikit-learn), 4 (árvores), 6 (SVM e não supervisionado), 4 (boas práticas) e 2 (projeto), na ordem dos módulos e das lições; a alternativa correta fica 10 vezes em cada posição.
- **Tipo de questão:** prever a saída de um trecho (formas, `predict`, `score`, métricas), achar o defeito de um fluxo (vazamento, `fit_transform` no teste, `stratify` esquecido, nome sem prefixo na grade), interpretar curvas e métricas descritas em números e escolher o método. Distratores são erros que as lições mostram; a explicação diz por que cada um falha.
- **Texto puro:** a prova não renderiza markdown nem KaTeX; código curto vai em bloco literal do YAML.
- **Conferência:** toda resposta que é saída de código ou conta é conferida no executor (scikit-learn 1.8.0) por uma lição temporária numa cópia mínima do `content/`, como no N4. Nenhuma questão usa `sklearn.datasets`, `penalty=`, `multi_class=` ou `sparse=`.
- Das 12 questões atuais sobram as ideias (gradiente e direção, taxa alta, L1 contra L2, acurácia em desbalanceado, recall, `fit_transform` no treino e `transform` no teste, k-fold, sobreajuste), reescritas como cenário; as definições diretas saem.

## Defeitos conhecidos (fora do conteúdo)

1. **`sklearn.datasets` não importa no executor** (`ImportError: ... ctypes`, via `scipy.io.arff`), e nem o `sklearn.utils.estimator_checks`. Correção possível no executor sem abrir o `ctypes`: registrar um módulo vazio em `sys.modules["scipy.io.arff"]` (ou carregar o `scipy.io` sem o leitor ARFF) antes do código do aluno, para que `sklearn.datasets` importe e os `load_*`/`make_*` funcionem offline. Pré-importar com o `ctypes` liberado **não** serve: o módulo ficaria alcançável por `scipy.io.arff._arffread.ctypes`. Até lá, o "Executar" no navegador (Pyodide sem o guarda do executor) pode aceitar um `load_iris` que a verificação recusa.
2. **Executor sob carga `ml`: duas falhas diferentes.**
   - **Queda do processo (código 139, `OOMKilled` falso):** duas vezes em ~20 min no piloto, as duas depois de dezenas de boots `ml` seguidos (política `fresh`, até 4 simultâneos); a segunda durante um `content:verify` sozinho. O log não registra nada antes da queda. Hipóteses: memória de WebAssembly reservada por workers reciclados (o executor enxerga 16 GB e 32 CPUs do host, mas o contêiner tem 6 GB), ou falha do V8 ao reservar memória para um boot novo. No `infra/compose/compose.yml` o executor tem `restart: unless-stopped` e volta sozinho, mas as verificações em andamento de todos os alunos se perdem e o boot recomeça; no `compose.dev.yml` não há `restart:`, e ele fica parado até um `docker start`. Nos módulos, o contêiner voltou a reiniciar: numa sonda do m1 com mais de 10 s de CPU num só lote (Rosenbrock, 20 000 passos × 6 configurações); num `verifyStep` do m3 com todos os lotes de uma vez (sem `createPool`; com concorrência 2, nenhuma queda); no passo 3 da m3-05 sob o `content:verify` oficial (4 lotes); e no m4, com dois agentes usando o perfil `ml` (`RestartCount` 2, o pedido seguinte terminou em `SocketError: other side closed`).
   - **Fila cheia, sem queda:** com vários verifies `ml` ao mesmo tempo (agentes diferentes e o coordenador; CPU do contêiner em 350–550 % e memória em 5,7 de 6 GB no m8), passos terminaram com `executor: fetch failed` ou "Tempo limite excedido" **sem o contêiner reiniciar** (seguiu `healthy`, `RestartCount` 0, nada no log): m4-03 (passo 3 nas três rodadas oficiais), m5 (duas rodadas), m6-02 e m6-04 (passo 3), m6-03 (a solução estourou o tempo em casos triviais, como `resumo_clusters([-1, -1])`), m7-04 (passo 3 em três tentativas; e a Previsão de **outra** lição, a m4-01, numa rodada), m8 (passo 3 em duas rodadas; no passo 4, "tempo limite excedido" nos 3 últimos casos de um lote de 1,1 s; numa rodada de motivos, uma errada estourou o tempo até nos casos de 1 ms). Repetidos sozinhos, todos passaram. O limite de 10 s conta tempo de parede dentro do worker, então CPU disputada faz um lote de 0,5 s parecer laço infinito (m4-02: 0,242 s e 0,560 s viraram estouro, e 0,281 s virou 7,159 s); com a fila cheia, o worker pré-aquecido é consumido por outro cliente e cada lote paga ~10 s de boot (um chegou a 50 s; uma sonda deu `timed out` no cliente depois de 120 s na fila). Parece o tempo limite do `fetch` do Node ou do lote, e não a queda.
   - **Recomendação:** um verify `ml` por vez no executor local (e nada de verifies de agentes diferentes em paralelo); antes de mexer numa lição por causa de `fetch failed`, confira `docker ps -a` e repita o passo sozinho. O `content:verify` não tem limite de simultaneidade na CLI (são 4 lotes fixos): um `--concorrencia 1` ou `2` ajudaria.
3. **Aviso do `threadpoolctl` no stderr** (`Unable to import LDSO from pyodide_js._module`), herdado da montagem do Pyodide; o executor poderia filtrá-lo.
4. **Estado compartilhado entre casos do lote** (herdado do N4): módulos importados persistem; por isso a regra 6 proíbe monkeypatch de classes da biblioteca.

## Decisões para o Filipe

Consolidadas do plano original e dos relatórios dos módulos 1 a 8 (`.claude-transfer/auditoria/n5-*.md`). Nenhuma foi decidida ainda; onde a escrita já seguiu uma proposta, o item diz qual.

1. **`sklearn.datasets`:** corrigir o executor (defeito 1) e liberar íris, vinhos e dígitos 8 × 8 para a m3-06 e a m6-04, ou manter tudo gerado. As lições foram escritas sem a correção (símbolos 5 × 5 gerados no lugar dos dígitos); com ela, os dígitos poderiam voltar ao roteiro original. Ligado a isso: o frontmatter da m3-06 (mantido) ainda cita "dígitos do scikit-learn" na `descricao` e `load_digits` no objetivo 3. Se ficar "manter gerado", a descrição e o objetivo 3 precisam ser reescritos para os símbolos 5 × 5.
2. **`bibliotecas` da m2-05:** a lição foi escrita com a proposta, `bibliotecas: [numpy, scikit-learn]` (perfil `ml`): cada verificação espera ~10 s sem worker quente (medido: ~10 s por lote; um lote levou 103 s com o executor disputado, sem estourar o limite). Alternativa: lasso por descida coordenada do zero, e a lição volta ao perfil `dados`.
3. **Worker quente `ml` na homologação:** de m2-05 e do m3 ao m8, toda verificação usa o perfil `ml`; com `fresh`, a segunda verificação em menos de ~10 s espera um boot. Dimensionar `RUNNER_PYODIDE_WARM` para o número de alunos simultâneos esperado (pendência já registrada em `docs/v2/pendencias-curso-completo.md` pelo N4).
4. **Previsão da m2-04 com comportamento só do executor:** a linha `np.isnan(np.linalg.solve(...)).all()` imprime `True` porque o `solve` do executor devolve `nan` numa matriz singular; no computador do aluno, o mesmo código levanta `LinAlgError: Singular matrix` (a dica 3 avisa). Manter (ensina a diferença executor × CPython nativo) ou tirar essa linha, para uma Previsão que vale nos dois ambientes (a saída fica com 4 linhas), mantendo o assunto na leitura 4.
5. **`entropia_cruzada_logitos(y, z)` na m1-05** no lugar do `entropia_cruzada(y, p, eps)` da primeira versão (ver a seção da lição).
6. **Assinaturas que mudaram no m4:** em especial `buscar_grade(pipeline, X_treino, y_treino, X_teste, y_teste, valores_C, k)` com treino e teste (m4-04) e `acao_recomendada` no passo 3 da m4-06; também `coeficientes(pipeline)` e `avaliar(..., imputador=None)` (m4-02), `buscar_aleatoria` com `cv=3` e valores em `float` (m4-04), a regra de `diferenca_relevante` (m4-05) e a simulação com o sorteio fixado (m4-06). Detalhes nas seções das lições.
7. **Leituras com fórmula acima da meta:** 87 contra 60 no nível (m1 15/14, m2 13/10, m3 17/12, m5 11/6, m6 14/7, m7 9/3; m4 e m8 na meta). Quase toda leitura tem uma conta central (custos, sigmoide, métricas, idf, softmax, inércia). A tabela "Dosagem por módulo" já mostra o escrito, com a meta original entre parênteses.
8. **Régua de casos do projeto contra o `content:metrics`:** a régua pedia 6–12 casos por exercício, e o `content:metrics` exige ≥ 15,2 em projeto (o mínimo de referência é o do N1); a m8 seguiu a métrica (16–17). Se a régua do projeto for mesmo 6–12, o mínimo de referência de projeto no `content:metrics` precisa mudar.
9. **Lote do passo 5 do projeto (~2,2 s):** um pouco acima dos ~2 s da regra 9 (três `comparar_modelos` com os quatro candidatos ou dois deles e três buscas pequenas; o `HistGradientBoostingClassifier(max_iter=50)` sozinho leva ~0,4 s nas 6 partições, mesmo com 300 linhas). Se o executor de homologação for mais lento, dá para trocar o caso `tabela-valores` pelos candidatos sem o boosting.
10. **Dados gerados e geradores por lição:** o projeto usa clientes fictícios de `dados_credito.py` (sem dados reais de pessoas), como a régua manda; o `curso.yaml` não precisa mudar ("modelo de previsão de inadimplência"). Cada lição tem os seus geradores, sem conflito: `clientes.py` tem dois conteúdos no m5 (a m5-02 usa a versão de 3 colunas; a m5-04, uma com `possui_reserva` e `id_cliente`), a m7-03 tem outro `clientes.py` (renda, dívida, idade, atraso pela razão dívida/renda) e a m7-02 um `transacoes.py`. Unificar depois, se for desejado, ou manter.
11. **Verificações oficiais repetidas pelo coordenador com o executor livre** (2026-11-16, uma lição por vez, cópia com o N5 inteiro):
    - **m4-03 e m7-04:** o `content:verify --licao` passou inteiro ("TODOS OS PASSOS VERIFICADOS").
    - **m8:** os passos 4 a 7 e a Previsão passam no `content:verify`; o **passo 3** deu `executor: fetch failed` em todas as rodadas oficiais, mesmo com o executor só para ele, sem o contêiner reiniciar e sem nada nos logs. Rodado sozinho pelo `verifyStep` com **um lote por vez** (`createPool(1)`), passa: solução aprovada (0,3 s com o worker quente), código inicial reprovado nos 17 casos e 9/9 erradas reprovadas (cada lote de errada leva ~9,6 s, quase tudo boot do perfil `ml`). A falha é do `content:verify` com 4 lotes `ml` simultâneos (`DEFAULT_VERIFY_CONCURRENCY = 4`, defeito 2), não da lição. Fica para decidir: baixar a concorrência do verify para lições do perfil `ml` ou investigar por que o executor fecha a conexão.
12. **`eps_sugerido` pelo joelho, e não pelo maior salto (m6-03):** se o plano preferir manter o "maior salto", o exercício fica ensinando uma regra que, medida no executor, falha sempre que há ruído.
13. **`n_componentes_para` estrito (m6-04):** segue o scikit-learn 1.8 (passa da fração), o que contraria a leitura ingênua "chega à fração"; a leitura e um caso explicam o empate. Se preferir `>=`, basta trocar a solução e a errada.
14. **Simultaneidade do `content:verify`:** limitar a simultaneidade (hoje 4 lotes fixos) e não rodar verifies de agentes diferentes em paralelo no mesmo executor (ver "Defeitos conhecidos", 2).
15. **Prova:** 12 questões hoje; a meta é 40, com 10 por tentativa (a `descricao` do `prova.yaml` precisará mudar quando o banco for escrito).
