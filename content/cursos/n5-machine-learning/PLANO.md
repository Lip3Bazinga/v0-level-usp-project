# Plano do Nível 5 — Machine Learning

Este é o plano de autoria do Nível 5 da trilha **Python: do zero à IA**. Ele orienta a escrita das lições de `content/cursos/n5-machine-learning`. Cada lição traz: slug, título, a **sequência de passos, um a um**, com o tipo de cada passo (Leitura, Exercício — código, lacunas ou ordenar —, Previsão, Quiz), os recursos de apresentação (diagrama Mermaid, bloco `visualizar`, fórmula KaTeX) e, nos exercícios, as funções pedidas.

**Estado:** a lição piloto `n5-m4-01-api-fit-predict-transform` está escrita, publicada e verificada; as outras 35 são stubs com o frontmatter completo e um passo "Roteiro da lição". As seções de cada lição abaixo partem desse roteiro e o **corrigem** onde ele contraria a régua ou o executor (as correções estão marcadas com "Muda do roteiro"). Depois de escrita, a fonte da verdade passa a ser o `.lvl.md`: se este plano e uma lição divergirem, vale a lição, e o plano é que precisa ser corrigido.

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
- **Ruído no stderr:** o primeiro uso de `threadpoolctl` no worker (KNN, k-means, algumas métricas) escreve `UserWarning: Unable to import LDSO from pyodide_js._module. This should never happen.` no stderr. Vem da montagem do Pyodide, não do código do aluno; não afeta a correção. Avise numa leitura do m3-04 ou do m6-02 se o aluno for ver o stderr ao executar.
- **Queda do executor:** o contêiner do executor saiu **duas vezes** com **código 139** (falha de segmentação do processo Node, `OOMKilled` falso) e precisou de `docker start`: uma numa sonda grande logo depois de dezenas de lotes `ml` seguidos (a mesma sonda, repetida sozinha, rodou em 3,4 s), outra no meio de um `content:verify --licao` da piloto, sem nenhuma sonda ao lado (o verify terminou com `executor: fetch failed` em dois passos e na Previsão). Rodado de novo com o executor recém-reiniciado, o mesmo verify passou inteiro. Se o verify der `fetch failed`, confira `docker ps -a` antes de mexer na lição. Ver "Defeitos conhecidos".
- **Duração do `content:verify --licao`** da piloto: ~10 min, a maior parte gerando as Previsões de **todos** os cursos (várias `ml` do N4, ~10 s cada); os três passos levaram 288 s, 79 s e 99 s somando os lotes.

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
8. **Dados sem `sklearn.datasets`:** substitua `make_blobs`, `make_classification`, `make_moons` e afins por funções da própria lição, num arquivo `dados_<tema>.py` determinístico (`default_rng(semente)`), ou por dados sorteados no `setup`. Exemplos que a piloto usa: três nuvens normais em 2D com `rng.normal(c, 1.0, size=(20, 2))` e rótulos por `np.repeat`. Textos (m3-05) são frases fictícias escritas à mão.
9. **Orçamento do lote:** some o trabalho de todos os casos (cada um roda `main.py` + `setup` + expressão) e mantenha a solução abaixo de **~2 s por lote** (5 vezes de folga sobre os 10 s, porque a solução do aluno pode ser mais lenta e a máquina é compartilhada). Na prática: até ~500 linhas nos casos; buscas (`GridSearchCV`, `RandomizedSearchCV`, `learning_curve`) com no máximo ~12 ajustes por chamada e em no máximo 2 casos; florestas com até 30 árvores; o conjunto grande (30 000 linhas do projeto) só no "Executar" do aluno, nunca nos casos. Meça a solução com o worker quente antes de fechar o passo (piloto: 0,07–0,35 s por lote). Nada de `fit` no nível do módulo do `main.py`: ele roda em todo caso.
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
| `NaN` em `X` | `ValueError: Input X contains NaN.` + `LogisticRegression does not accept missing values encoded as NaN natively…` (sugere `HistGradientBoosting` ou um imputador) |
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

Comportamentos do scikit-learn 1.8 que as lições precisam mostrar:

- `class C(BaseEstimator, ClassifierMixin)` faz `is_classifier(C())` dar `False` (as tags vêm da primeira base); o `score` funciona, mas o `cross_val_score(C(), X, y, cv=3)` usa `KFold` sem estratificar e, com `y` ordenado por classe, dá `[0, 0, 0]`. A ordem certa é `ClassifierMixin, BaseEstimator` (o mesmo para `RegressorMixin`, `TransformerMixin`).
- O `set_params` depois do `fit` só troca o hiperparâmetro: o `coef_` continua o do último `fit` (conferido).
- `float(...)` de um `float` e `int(...)` de um inteiro pequeno devolvem **o mesmo objeto**, então `self.taxa = float(taxa)` passa no `clone`; não use isso como exemplo de erro de clonagem (use `list(colunas)`).
- O `check_is_fitted(self)` procura atributos terminados em `_` e exige que a classe tenha `fit`.
- O `StandardScaler` usa o desvio populacional e `scale_ = 1` numa coluna constante (a coluna sai toda zero, sem `nan`); `StandardScaler(copy=False)` padroniza o array recebido no lugar.
- Sem regularização na logística: `LogisticRegression(C=np.inf)`; o `penalty=None` do roteiro da m3-01 dá `FutureWarning` na 1.8. O `C=np.inf` ajusta os mesmos coeficientes e escreve só `UserWarning: Setting penalty=None will ignore the C and l1_ratio parameters` no stderr (aviso da própria biblioteca; a leitura da m3-01 avisa o aluno).
- Existem e importam: `TargetEncoder` (m7-03), `sklearn.inspection.partial_dependence` (m5-04), `sklearn.manifold.TSNE` (m6-04).
- `n_jobs=-1` roda (com 1 CPU), sem erro.

### Previsão e visualizador

- **Previsão** funciona com scikit-learn (a piloto tem uma); cada Previsão `ml` custa um boot no build. Arredonde coeficientes (`round(float(c), 6)`) e use `.tolist()`; fixe `random_state`. Uma regressão em pontos exatamente sobre a reta dá `2.0 1.0` com `round(..., 6)`.
- **Visualizador:** numpy e pandas sim, scikit-learn não (regra do N4).

### Dosagem por módulo

Planejada (a m4-01 já está escrita e conferida). Mermaid e Visualizar = número de blocos; "Leituras com fórmula" = passos de Leitura com KaTeX.

| Módulo | Lições | Mermaid | Visualizar | Leituras com fórmula | Exercício (lacunas) | Exercício (ordenar) | Exercício (código) | Previsão | Imagens (assets) |
|---|---|---|---|---|---|---|---|---|---|
| 1 · Matemática para ML | 5 | 1 | 2 | 14 | 4 | 1 | 10 | 5 | 0 |
| 2 · Regressão linear do zero | 5 | 1 | 0 | 10 | 4 | 1 | 10 | 5 | 0 |
| 3 · Classificação | 6 | 1 | 1 | 12 | 5 | 1 | 12 | 6 | 0 |
| 4 · scikit-learn na prática | 6 | 3 | 0 | 7 | 4 | 1 | 12 | 6 | 0 |
| 5 · Árvores e ensembles | 4 | 2 | 0 | 6 | 4 | 0 | 8 | 4 | 0 |
| 6 · SVM e não supervisionado | 5 | 1 | 1 | 7 | 5 | 0 | 10 | 5 | 0 |
| 7 · Boas práticas | 4 | 1 | 0 | 3 | 4 | 0 | 8 | 4 | 0 |
| 8 · Projeto do nível | 1 | 1 | 0 | 1 | 0 | 0 | 5 | 1 | 0 |
| **Total** | **36** | **11** | **4** | **60** | **30** | **4** | **75** | **36** | **0** |

## Estrutura do nível

8 módulos · 36 lições (1 projeto de nível) · 31,6 h de lições (1 895 min) + prova (45 min) · 4 340 XP · `horas: 41` no `curso.yaml` (1 895 min + 30 %, a regra do `content/CURRICULO.md`, já confere) · prova com banco de **40 questões (10 por tentativa)**, na proporção das lições de cada módulo: 5, 5, 7, 7, 4, 6, 4 e 2, com a alternativa correta 10 vezes em cada posição (meta; hoje são 12).

| # | Módulo | Lições | Minutos | XP | Perfil |
|---|---|---|---|---|---|
| 1 | Matemática para ML (`matematica-para-ml`) | 5 | 220 | 540 | `dados` |
| 2 | Regressão linear do zero (`regressao-linear-do-zero`) | 5 | 235 | 570 | `dados` (m2-05: ver decisões) |
| 3 | Classificação (`classificacao`) | 6 | 300 | 720 | `ml` |
| 4 | scikit-learn na prática (`scikit-learn-na-pratica`) | 6 | 285 | 690 | `ml` |
| 5 | Árvores e ensembles (`arvores-e-ensembles`) | 4 | 205 | 490 | `ml` |
| 6 | SVM e não supervisionado (`svm-e-aprendizado-nao-supervisionado`) | 5 | 245 | 590 | `ml` |
| 7 | Boas práticas de ML (`boas-praticas-de-ml`) | 4 | 180 | 440 | `ml` |
| 8 | Projeto do nível (`n5-projeto-do-nivel`) | 1 | 240 | 300 | `ml` |

## Módulo 1 · Matemática para machine learning

Vetores e matrizes, derivadas e gradiente, regra da cadeia, custo e otimização, verossimilhança. `bibliotecas: [numpy]`, perfil `dados`. Nenhum exercício usa scikit-learn.

### n5-m1-01-vetores-matrizes-e-geometria · Vetores, matrizes e geometria dos dados
- **Arquivo:** `01-matematica-para-ml/01-vetores-matrizes-e-geometria.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Uma tabela é uma nuvem de pontos** (KaTeX: $X \in \mathbb{R}^{n \times d}$, normas L1 e L2, distância euclidiana; linhas são amostras, colunas são atributos; `np.linalg.norm(..., axis=1)`)
  2. **Previsão · Formas de X @ w** (`shape` de `X @ w` com `w` `(d,)` e `(d, 1)`, `X.T @ X`, `norm` sem e com `axis`)
  3. **Exercício (lacunas) · Distâncias de um ponto a todos** (`distancias_a_todos(X, x, ordem=2)` → array `(n,)`, L1 ou L2; sem laço)
  4. **Leitura · Produto escalar, cosseno e projeção** (KaTeX: $\cos\theta$, $\text{proj}_u v = \frac{v \cdot u}{u \cdot u} u$; base do kNN e do PCA)
  5. **Exercício (código) · Similaridade e projeção** (`cosseno_par_a_par(X)` → matriz $n \times n$, linha nula → 0; `projetar(v, u)` com `ValueError` para `u` nulo)
  6. **Leitura · Matrizes como transformações e posto** (KaTeX: rotação e escala 2D; `X @ M.T` transforma cada linha; posto e colunas colineares em uma frase, com `matrix_rank`)
  7. **Exercício (código) · Transformar e achar colinearidade** (`aplicar_transformacao(pontos, M)`; `atributos_colineares(X)` → `bool` pelo posto)
  8. **Quiz · Geometria dos dados**
- **Muda do roteiro:** `cosseno_par_a_par`, `projetar`, `aplicar_transformacao` e `atributos_colineares` viram `expr` (recebem arrays); "matrizes como transformações visualizadas" vira texto e números (sem matplotlib). O quiz sobre formas de `X @ w` vira a Previsão.
- **Erradas típicas:** `norm` sem `axis` (um número só); linhas e colunas trocadas (`X.T`); divisão por norma zero (`nan`); `M @ pontos` no lugar de `pontos @ M.T`; laço Python (reprova só no `source`); `ord=1` ignorado.

### n5-m1-02-derivadas-e-gradiente · Derivadas e gradiente
- **Arquivo:** `01-matematica-para-ml/02-derivadas-e-gradiente.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · A inclinação num ponto** (KaTeX: definição da derivada, regras de potência, exponencial e logaritmo; diferença central $\frac{f(x+h) - f(x-h)}{2h}$)
  2. **Previsão · O erro de cada h** (erro da diferença para frente e central para `h` de `1e-1` a `1e-12`, arredondado; o erro volta a crescer com `h` minúsculo)
  3. **Exercício (lacunas) · Derivada central** (`derivada_central(f, x, h=1e-5)`; casos `expr` com `f` definida no `setup`)
  4. **Leitura · Derivadas parciais e o vetor gradiente** (KaTeX: $\nabla f$; curvas de nível e o gradiente perpendicular)
  5. **Exercício (código) · Gradiente numérico e verificador** (`gradiente_numerico(f, ponto, h=1e-5)` → array; `verificar_gradiente(f, grad, ponto, tol=1e-6)` → `bool`, a ferramenta usada no nível inteiro e no Nível 6)
  6. **Leitura · O gradiente aponta para cima** (KaTeX: $x \leftarrow x - \eta \nabla f(x)$; Visualizar: três passos de descida em $f(x, y) = x^2 + 3y^2$ em Python puro)
  7. **Exercício (código) · Gradiente de uma quadrática e um passo** (`gradiente_quadratica(A, b, x)` de $\tfrac12 x^\top A x - b^\top x$ com `A` simétrica; `passo_de_descida(grad, x, taxa)` sem alterar `x`)
  8. **Quiz · Direção do gradiente**
- **Muda do roteiro:** `derivada_numerica(f, x, h)` e `gradiente_numerico(f, ponto)` com `call` viram `expr` (o `call` não passa funções). `passo_de_descida(f, grad, x, taxa)` perde o `f`, que não era usado.
- **Erradas típicas:** diferença para frente; `h` não dividido por 2; esquecer um termo do gradiente (`A x` sem simetrizar); `+` no passo; alterar `x` no lugar; gradiente da quadrática como `A @ x + b`.

### n5-m1-03-regra-da-cadeia-e-funcoes-compostas · Regra da cadeia e funções compostas
- **Arquivo:** `01-matematica-para-ml/03-regra-da-cadeia-e-funcoes-compostas.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Funções dentro de funções** (KaTeX: $\frac{d}{dx} f(g(x)) = f'(g(x))\, g'(x)$; Mermaid: grafo de $f = (a \cdot b + c)^2$ com as derivadas locais)
  2. **Previsão · Os números do grafo** (para $a = 2, b = -3, c = 10$: valores para frente e derivadas para trás, impressos)
  3. **Exercício (ordenar) · Retropropagação à mão** (`backprop_manual(a, b, c)` → `(f, df_da, df_db, df_dc)`)
  4. **Leitura · Sigmoide e perda logística** (KaTeX: $\sigma' = \sigma(1 - \sigma)$; $\frac{\partial L}{\partial w} = (\sigma(z) - y)\,x$)
  5. **Exercício (código) · Derivadas da logística** (`derivada_sigmoide(z)` vetorizada; `grad_perda_logistica(w, b, x, y)` → `(dw, db)` para um exemplo, conferida com o `verificar_gradiente` no `setup`)
  6. **Leitura · O custo quadrático de um modelo linear** (KaTeX: derivadas de $(y - wx - b)^2$ em $w$ e $b$, média sobre os dados; o sinal)
  7. **Exercício (código) · Gradiente do custo quadrático** (`grad_custo_quadratico(w, b, x, y)` → `(dw, db)` médios, sem laço)
  8. **Quiz · A ordem das derivadas**
- **Erradas típicas:** esquecer o fator interno; sinal trocado em $(y - \hat y)^2$; somar derivadas locais em vez de multiplicar; soma no lugar da média; `σ'` como `σ(z)(1 + σ(z))`.

### n5-m1-04-funcoes-de-custo-e-otimizacao · Funções de custo e otimização
- **Arquivo:** `01-matematica-para-ml/04-funcoes-de-custo-e-otimizacao.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Medir o erro** (KaTeX: MSE, MAE, entropia cruzada; o que cada uma penaliza; o outlier no MSE)
  2. **Previsão · MSE ou MAE com um outlier**
  3. **Exercício (lacunas) · Três custos vetorizados** (`mse(y, p)`, `mae(y, p)`, `perda_logistica(y, p, eps=1e-12)` com `np.clip`)
  4. **Leitura · Gradiente descendente genérico** (KaTeX da atualização; Visualizar: cinco passos em 1D em Python puro; parada por tolerância)
  5. **Exercício (código) · Descer até parar** (`gradiente_descendente(grad, x0, taxa, passos, tol)` → `(x, historico)`; para quando o passo fica menor que `tol`; `x0` intacto)
  6. **Leitura · Taxa, divergência e convexidade** (pequena demais, boa, grande demais; a curva de custo como diagnóstico; convexa contra não convexa; Rosenbrock e o vale estreito)
  7. **Exercício (código) · Diagnóstico e Rosenbrock** (`diagnosticar_taxa(historico)` → `"diverge"`, `"lento"` ou `"ok"` por regras do enunciado; `minimizar_rosenbrock(x0, taxa, passos)` com o resultado comparado a $(1, 1)$ com tolerância ampla e o histórico decrescente)
  8. **Quiz · Convexidade e taxa**
- **Erradas típicas:** atualizar com `+`; custo somado sem dividir por $n$; parada só por número de passos; `log(0)` sem clip; diagnóstico pelo último valor e não pela tendência.

### n5-m1-05-probabilidade-e-maxima-verossimilhanca · Probabilidade e máxima verossimilhança
- **Arquivo:** `01-matematica-para-ml/05-probabilidade-e-maxima-verossimilhanca.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · A moeda e a verossimilhança** (KaTeX: $L(p) = \prod p^{y_i}(1-p)^{1-y_i}$; verossimilhança não é probabilidade do parâmetro)
  2. **Previsão · O produto que vira zero** (produto de 2 000 probabilidades pequenas dá `0.0`; a soma dos logs não)
  3. **Exercício (lacunas) · Log-verossimilhança da moeda** (`log_verossimilhanca_bernoulli(p, dados)`; `mle_moeda(dados)` por busca numa grade e conferida com a média)
  4. **Leitura · Gaussiana dá MSE, Bernoulli dá entropia cruzada** (KaTeX: as duas derivações curtas; MLE da variância com `ddof=0`; MAP e ridge em uma frase)
  5. **Exercício (código) · MLE gaussiana e entropia cruzada estável** (`mle_gaussiana(dados)` → `(media, variancia)`; `entropia_cruzada(y, p, eps=1e-12)`)
  6. **Leitura · Probabilidade prevista e calibração** (o que "0,8" quer dizer; diagrama de calibração em números)
  7. **Exercício (código) · Curva de calibração** (`curva_de_calibracao(y, p, bins)` → lista de `(media_prevista, frequencia, contagem)` por faixa, faixas vazias omitidas)
  8. **Quiz · Verossimilhança**
- **Erradas típicas:** `log(0)` sem clip; variância com `ddof=1`; maximizar a log-verossimilhança negativa; faixa com limite superior aberto deixando `p = 1.0` de fora; produto sem log.

## Módulo 2 · Regressão linear do zero

`bibliotecas: [numpy]`, perfil `dados` (m2-05: ver decisões). Os dados do módulo vêm de um gerador da lição (`dados_regressao.py`: $y = 3 + 2x_1 - x_2 + \varepsilon$ com `default_rng(semente)`), repetido em cada lição.

### n5-m2-01-modelo-linear-e-mse · O modelo linear e o erro quadrático
- **Arquivo:** `02-regressao-linear-do-zero/01-modelo-linear-e-mse.lvl.md` · 100 XP · 40 min
- **Passos (7):**
  1. **Leitura · Uma reta, muitas colunas** (KaTeX: $\hat y = Xw + b$; o truque da coluna de uns; o gerador do módulo)
  2. **Previsão · Formas e o MSE de uma reta à mão**
  3. **Exercício (lacunas) · Prever e medir** (`prever(X, w, b)`, `mse(y, y_pred)`)
  4. **Leitura · O gradiente do MSE em forma de matriz** (KaTeX: $\nabla_w = \tfrac{2}{n} X^\top(Xw + b - y)$, $\partial_b$; conferir com o verificador da m1-02; o fator $2/n$ só muda a escala)
  5. **Exercício (código) · Gradiente do MSE** (`gradiente_mse(X, y, w, b)` → `(gw, gb)`; conferido com o gradiente numérico no `setup`; sem laço)
  6. **Exercício (código) · A bacia do custo** (`superficie_de_custo(x, y, ws, bs)` → matriz `len(bs) × len(ws)` por broadcasting; o mínimo da grade perto do ajuste exato)
  7. **Quiz · A forma do gradiente**
- **Erradas típicas:** `X @ w` com `w` `(d, 1)` (forma errada); MSE somado; `X @ (...)` no lugar de `X.T @ (...)`; sinal do resíduo trocado; eixos da superfície trocados.

### n5-m2-02-gradiente-descendente-batch-e-estocastico · Gradiente descendente batch, mini-batch e estocástico
- **Arquivo:** `02-regressao-linear-do-zero/02-gradiente-descendente-batch-e-estocastico.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · O laço de treino** (Mermaid: época → embaralhar → lotes → atualizar → registrar o custo; época contra passo)
  2. **Previsão · Quantos passos por época** (`n = 10`, lote 4: `range(0, n, lote)` e o último lote incompleto)
  3. **Exercício (lacunas) · Treino em lote** (`treinar_batch(X, y, taxa, epocas)` → `(w, b, historico)`; comparado com a solução exata com tolerância)
  4. **Leitura · Mini-lotes e SGD** (KaTeX: o gradiente do lote como estimativa; `rng.permutation` a cada época)
  5. **Exercício (código) · Mini-lotes com semente** (`treinar_minibatch(X, y, taxa, epocas, tamanho_lote, semente)`; casos: mesma semente, mesmo resultado; sementes diferentes, resultados diferentes; perto da solução exata com tolerância; `historico` com `epocas` valores, o custo **do conjunto inteiro** no fim de cada época)
  6. **Leitura · O ruído do SGD e o decaimento da taxa**
  7. **Exercício (código) · Ler as curvas** (`epoca_em_que_atinge(historico, limiar)` → `int` ou `None`; `taxa_com_decaimento(taxa0, decaimento, epoca)`)
  8. **Quiz · Época, passo e lote**
- **Muda do roteiro:** `treinar_sgd` com tolerância ampla e `comparar_convergencia` viram `epoca_em_que_atinge` (o "quem converge primeiro" depende da semente; a regra 6 do N4 pede comparação com o valor exato, não com outra trajetória).
- **Erradas típicas:** não embaralhar entre épocas (resultado igual para sementes diferentes); descartar o último lote; registrar o custo do lote; gerador criado fora da função; `np.random.seed`.

### n5-m2-03-escala-de-atributos-e-taxa-de-aprendizado · Escala de atributos e taxa de aprendizado
- **Arquivo:** `02-regressao-linear-do-zero/03-escala-de-atributos-e-taxa-de-aprendizado.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Vales alongados** (KaTeX: escore $z$ e min-max; por que uma coluna em milhares trava o gradiente)
  2. **Previsão · O teste padronizado com o treino** (média e desvio do teste depois de usar as estatísticas do treino: não são 0 e 1)
  3. **Exercício (lacunas) · Padronizar treino e teste** (`padronizar_treino_teste(X_tr, X_te)` → `(Xtr, Xte, media, desvio)`; coluna constante → zeros)
  4. **Leitura · Escala e convergência** (o mesmo problema com e sem padronizar; épocas até o custo parar de cair)
  5. **Exercício (código) · Épocas até convergir** (`epocas_ate_convergir(X, y, taxa, tol, max_epocas)`; o caso sem padronizar exige mais épocas ou não converge)
  6. **Leitura · Busca da taxa e a volta à escala original** (KaTeX: $w_j = w'_j / \sigma_j$, $b = b' - \sum w'_j \mu_j / \sigma_j$; grade logarítmica de `1e-4` a `1`)
  7. **Exercício (código) · Melhor taxa e coeficientes originais** (`buscar_taxa(X, y, taxas, epocas)`; `coeficientes_na_escala_original(w, b, media, desvio)`)
  8. **Quiz · Escala e vazamento**
- **Erradas típicas:** padronizar o teste com as próprias estatísticas; `ddof=1` (diverge do `StandardScaler` que virá na m4-01); esquecer o intercepto na volta; taxa escolhida sem descartar as que divergem (`nan`).

### n5-m2-04-equacao-normal-e-solucao-exata · Equação normal e solução exata
- **Arquivo:** `02-regressao-linear-do-zero/04-equacao-normal-e-solucao-exata.lvl.md` · 100 XP · 40 min
- **Passos (7):**
  1. **Leitura · Gradiente igual a zero** (KaTeX: da derivada à $X^\top X w = X^\top y$; `solve` em vez de `inv`; `lstsq` e SVD em uma frase)
  2. **Previsão · solve, lstsq e a coluna repetida** (com uma coluna duplicada, o `solve` do executor devolve números sem erro e o `lstsq` devolve a solução de norma mínima)
  3. **Exercício (ordenar) · Equação normal** (`equacao_normal(X, y)` → coeficientes com o intercepto primeiro; `not_calls` `inv`)
  4. **Leitura · Quando a equação normal falha** (KaTeX: custo $O(nd^2 + d^3)$ contra $O(nd)$ por época; colinearidade e posto; números medidos de tempo só no texto)
  5. **Exercício (código) · Singular e comparação com o gradiente** (`detectar_singular(X)` → `bool` pelo posto da matriz com a coluna de uns; `distancia_para_gd(X, y, taxa, epocas)` → norma da diferença entre as duas soluções)
  6. **Exercício (código) · Quanto custa cada método** (`operacoes_equacao_normal(n, d)` e `operacoes_gd(n, d, epocas)` → contagens pela fórmula do enunciado; `metodo_mais_barato(n, d, epocas)`)
  7. **Quiz · Exata ou iterativa**
- **Muda do roteiro:** `tempo_relativo(d)` "estimando quando a equação normal fica mais cara" media o relógio: vira contagem de operações (regra 1 do N4); a medição aparece na leitura.
- **Erradas típicas:** `inv`; esquecer a coluna de uns; `X @ X.T`; posto conferido sem a coluna de uns; diferença das soluções sem padronizar.

### n5-m2-05-regressao-polinomial-e-regularizacao · Regressão polinomial e regularização (ridge e lasso)
- **Arquivo:** `02-regressao-linear-do-zero/05-regressao-polinomial-e-regularizacao.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Mais graus, mais curvas** (KaTeX: expansão $[x, x^2, \dots, x^g]$; treino cai sempre, validação faz um U)
  2. **Previsão · Erro de treino e validação por grau** (tabela impressa com graus 1, 3, 9)
  3. **Exercício (lacunas) · Atributos polinomiais** (`atributos_polinomiais(x, grau)` → `(n, grau)`, sem a coluna de uns)
  4. **Leitura · Ridge** (KaTeX: $(X^\top X + \lambda I')\,w = X^\top y$ com $I'$ sem regularizar o intercepto; a escala importa)
  5. **Exercício (código) · Ridge do zero** (`ridge_equacao_normal(X, y, lam)`; conferido com `Ridge(alpha=lam)` treinado no `setup` a `1e-8`; `norma_por_lambda(X, y, lambdas)` decrescente; `not_calls` `sklearn`)
  6. **Leitura · Lasso e os coeficientes zero** (KaTeX: penalidade L1; a convenção $\frac{1}{2n}$ do scikit-learn; `Lasso(alpha)`)
  7. **Exercício (código) · Seleção com lasso e o grau certo** (`selecionar_com_lasso(X, y, alpha)` → índices não nulos; `erro_treino_validacao_por_grau(x, y, graus, semente)`)
  8. **Quiz · L1 ou L2**
- **Muda do roteiro:** o frontmatter tem só `numpy`, mas a lição usa `Ridge`/`Lasso` (objetivo 3): ver "Decisões para o Filipe", 2.
- **Erradas típicas:** regularizar o intercepto; ridge sem padronizar; grau escolhido pelo erro de treino; $\lambda$ comparado sem o fator $1/n$ da convenção; `np.nonzero` com tolerância zero num coeficiente `1e-17`.

## Módulo 3 · Classificação

`bibliotecas: [numpy, scikit-learn]`, perfil `ml`. Dados: nuvens normais em 2D geradas com `default_rng`, mensagens fictícias escritas à mão (m3-05).

### n5-m3-01-regressao-logistica-do-zero · Regressão logística do zero
- **Arquivo:** `03-classificacao/01-regressao-logistica-do-zero.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Por que não uma reta para classes** (KaTeX: sigmoide e log-odds; fronteira $Xw + b = 0$)
  2. **Previsão · A sigmoide nos extremos** (`1 / (1 + np.exp(-z))` com `z = ±1000`: `0.0` e `1.0`, sem aviso no executor; a versão estável com `np.where`)
  3. **Exercício (lacunas) · Sigmoide estável e probabilidades** (`sigmoide(z)`, `prever_proba(X, w, b)`)
  4. **Leitura · Entropia cruzada e o gradiente bonito** (KaTeX: $\tfrac1n X^\top(\sigma(Xw + b) - y)$; `np.logaddexp`)
  5. **Exercício (código) · Custo e gradiente** (`entropia_cruzada_binaria(y, z)` a partir dos logits, estável; `gradiente_logistica(X, y, w, b)` conferido com o numérico)
  6. **Leitura · Treinar e comparar com o scikit-learn** (`LogisticRegression(C=np.inf)`; padronizar antes; coeficientes como log-odds)
  7. **Exercício (código) · Treinar do zero** (`treinar_logistica(X, y, taxa, epocas)` → `(w, b)`; previsões ≥ 98 % iguais às de `LogisticRegression(C=np.inf)` treinada no `setup` e coeficientes a `1e-2`; `not_calls` `sklearn`)
  8. **Quiz · Log-odds**
- **Muda do roteiro:** o conjunto de câncer de mama (`sklearn.datasets`) sai: não importa no executor e são dados de pessoas. `LogisticRegression(penalty=None)` vira `C=np.inf` (o `penalty` dá `FutureWarning` na 1.8). "Diferença de coeficientes < 0,05" vira concordância de previsões + `1e-2` (medido: 0,0027 com 2 000 épocas).
- **Erradas típicas:** `np.log(sigmoide)` sem estabilizar (`-inf`); MSE com sigmoide; gradiente sem dividir por $n$; esquecer o `b`; `predict` por `> 0` no logit trocado por `> 0.5`.

### n5-m3-02-metricas-de-classificacao · Métricas de classificação
- **Arquivo:** `03-classificacao/02-metricas-de-classificacao.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Quatro caixas** (KaTeX: TP, FP, FN, TN; a ordem `[[TN, FP], [FN, TP]]` do `confusion_matrix`)
  2. **Previsão · Acurácia com 99 % de negativos**
  3. **Exercício (lacunas) · Matriz de confusão** (`matriz_de_confusao(y, y_pred)` → lista 2 × 2 na ordem do scikit-learn)
  4. **Leitura · Precisão, recall, F1 e F$\beta$** (KaTeX; divisão por zero → 0, como `zero_division=0`)
  5. **Exercício (código) · Métricas do zero** (`metricas(y, y_pred)` → dicionário; `f_beta(y, y_pred, beta)`; `not_calls` de `accuracy_score`, `precision_score`, `recall_score`, `f1_score`; conferido com o `sklearn.metrics` no `setup`)
  6. **Leitura · Custo dos erros e médias macro e ponderada** (`classification_report` como texto)
  7. **Exercício (código) · Custo e médias** (`custo_esperado(y, y_pred, matriz_custo)`; `recall_macro_e_ponderado(y, y_pred)`)
  8. **Quiz · Qual métrica para este problema**
- **Muda do roteiro:** `metrica_recomendada(cenario)` (texto livre) vira pergunta do quiz.
- **Erradas típicas:** linhas e colunas trocadas; precisão sem tratar zero (`ZeroDivisionError`); macro e ponderada trocadas; F$\beta$ com $\beta$ em vez de $\beta^2$.

### n5-m3-03-roc-auc-e-limiares · Curva ROC, AUC, precisão-recall e limiares
- **Arquivo:** `03-classificacao/03-roc-auc-e-limiares.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · O limiar é um botão separado do modelo** (KaTeX: TPR, FPR; `predict_proba(X)[:, 1]`)
  2. **Previsão · TPR e FPR em três limiares**
  3. **Exercício (ordenar) · Taxas num limiar** (`taxas_no_limiar(y, scores, limiar)` → `(tpr, fpr)` com `>=`)
  4. **Leitura · ROC e AUC como ordenação de pares** (KaTeX: $\text{AUC} = P(s^+ > s^-)$, empate vale meio)
  5. **Exercício (código) · ROC e AUC do zero** (`curva_roc(y, scores)` → `(fpr, tpr)` igual ao `roc_curve(..., drop_intermediate=False)` do `setup`; `auc_por_pares(y, scores)` igual ao `roc_auc_score` a `1e-12`)
  6. **Leitura · Precisão-recall e limiar por custo** (AP em desbalanceados; escolher o limiar na validação)
  7. **Exercício (código) · Escolher o limiar** (`melhor_limiar_f1(y, scores)`; `limiar_por_custo(y, scores, custo_fp, custo_fn)`, empate pelo menor limiar)
  8. **Quiz · AUC 0,5 e PR contra ROC**
- **Erradas típicas:** ROC com `predict` binarizado; scores em ordem crescente (curva invertida); empates contados como 0 ou 1; `>` no lugar de `>=`; limiar escolhido no teste.

### n5-m3-04-knn · k-vizinhos mais próximos
- **Arquivo:** `03-classificacao/04-knn.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Sem treino, só vizinhos** (KaTeX: distância; Visualizar: votação de 3 vizinhos em Python puro; o aviso do `threadpoolctl` no stderr)
  2. **Previsão · k = 1 no próprio treino** (acurácia 1,0 no treino e menor na validação)
  3. **Exercício (lacunas) · Prever por votação** (`knn_prever(X_tr, y_tr, X_novo, k)`; empate de votos → o menor rótulo; `argsort(kind="stable")`)
  4. **Leitura · Escala e a escolha de k** (padronizar; k pequeno decora, k grande suaviza; `KNeighborsClassifier`)
  5. **Exercício (código) · Regressão e acurácia por k** (`knn_regressao(X_tr, y_tr, X_novo, k, pesos)` com `"uniform"`/`"distance"`; `acuracia_por_k(X_tr, y_tr, X_va, y_va, ks)` conferida com `KNeighborsClassifier` no `setup`)
  6. **Leitura · A maldição da dimensionalidade** (KaTeX: razão entre a distância máxima e a mínima; KD-tree e a ponte com o Nível 3)
  7. **Exercício (código) · Distâncias em alta dimensão** (`razao_distancias(d, n, semente)` → `float`; casos: mesma semente igual, razão decrescente em `d` = 2, 10, 100, 1000; sem laço)
  8. **Quiz · k par e escala**
- **Muda do roteiro:** "laço duplo em Python para distâncias (tempo)" vira errada que reprova só no `source` (`not_uses` `for` e `list_comprehension` na função de distâncias).
- **Erradas típicas:** não padronizar; incluir o próprio ponto como vizinho; empate resolvido pelo primeiro que aparece; pesos `1/d` com `d = 0`; laço duplo.

### n5-m3-05-naive-bayes-e-texto · Naive Bayes e classificação de texto
- **Arquivo:** `03-classificacao/05-naive-bayes-e-texto.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Texto vira contagem** (Mermaid: texto → tokens → vocabulário → matriz; `CountVectorizer`; ~30 mensagens fictícias de "promoção" e "pessoal" escritas para a lição)
  2. **Previsão · O vocabulário do CountVectorizer** (ordem alfabética, `lower`, tokens de 1 letra descartados pelo padrão)
  3. **Exercício (lacunas) · Saco de palavras** (`bag_of_words(textos)` → `(vocabulario, matriz)` com o mesmo vocabulário do `CountVectorizer` no `setup`)
  4. **Leitura · Bayes ingênuo com Laplace** (KaTeX: $\log P(c) + \sum_j x_j \log P(w_j \mid c)$; por que somar logs)
  5. **Exercício (código) · Naive Bayes do zero** (`treinar_nb(X, y, alpha)` → dicionário; `prever_nb(modelo, X)`; previsões iguais às do `MultinomialNB(alpha)` no `setup`; `not_calls` `MultinomialNB`)
  6. **Leitura · TF-IDF e avaliação** (KaTeX: idf suavizado do scikit-learn; vocabulário só do treino)
  7. **Exercício (código) · TF-IDF e o filtro** (`tf_idf(matriz)` igual ao `TfidfTransformer()` a `1e-9`; `avaliar_filtro(textos_tr, y_tr, textos_te, y_te)` → precisão e recall)
  8. **Quiz · Suavização e vocabulário**
- **Erradas típicas:** produto sem log; sem Laplace (probabilidade zero); vocabulário com o teste; idf sem o `+1`; normalização L2 esquecida.

### n5-m3-06-classificacao-multiclasse · Classificação multiclasse: softmax, um-contra-todos e métricas
- **Arquivo:** `03-classificacao/06-classificacao-multiclasse.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · De duas para k classes** (KaTeX: softmax e o máximo subtraído; one-hot)
  2. **Previsão · softmax de [1000, 1001]** (`nan` sem estabilizar, `[0.269, 0.731]` estabilizado)
  3. **Exercício (lacunas) · Softmax e one-hot** (`softmax(Z)` por linha; `one_hot(y, k)` com `ValueError` para rótulo fora de `0..k-1`)
  4. **Leitura · Entropia cruzada categórica** (KaTeX: $\nabla_W = \tfrac1n X^\top(P - Y)$; a ponte com o MLP do Nível 6)
  5. **Exercício (código) · Treinar softmax** (`treinar_softmax(X, Y, taxa, epocas)` → `(W, b)`; piso de acurácia e concordância ≥ 0,95 com `LogisticRegression(C=np.inf)` no `setup`)
  6. **Leitura · Um contra todos e a matriz k × k** (OvR, OvO; macro e ponderada)
  7. **Exercício (código) · OvR e confusões** (`um_contra_todos(X, y, X_novo)` com `LogisticRegression` binárias; `pares_mais_confundidos(matriz, n)`)
  8. **Quiz · Softmax e OvR**
- **Muda do roteiro:** os dígitos (`load_digits`) dependem da decisão 1 (o `sklearn.datasets` não importa). Sem a correção do executor, o conjunto vira "padrões 5 × 5" gerados na lição (cinco símbolos desenhados em matrizes com ruído de `default_rng`).
- **Erradas típicas:** softmax sem subtrair o máximo; soma no eixo errado; one-hot com o índice trocado; OvR comparando `predict` binário em vez de `decision_function`.

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

### n5-m4-02-pre-processamento-e-pipeline · Pré-processamento e Pipeline
- **Arquivo:** `04-scikit-learn-na-pratica/02-pre-processamento-e-pipeline.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Cada coluna com o seu tratamento** (Mermaid: colunas numéricas → imputar + escalar, categóricas → imputar + one-hot, `ColumnTransformer` → modelo; `handle_unknown="ignore"`; `sparse_output=False`)
  2. **Previsão · As colunas que saem do preprocessador** (`get_feature_names_out()` de um `ColumnTransformer` numa tabela de 4 linhas)
  3. **Exercício (lacunas) · Montar o preprocessador** (`montar_preprocessador(colunas_num, colunas_cat)` → `ColumnTransformer`; casos pelo `shape` e pelos nomes de saída numa tabela fixa)
  4. **Leitura · Pipeline: um fit para tudo** (`Pipeline([("prep", ...), ("modelo", ...)])`, `make_pipeline`, `named_steps`, `set_output(transform="pandas")`)
  5. **Exercício (código) · O pipeline completo** (`pipeline_completo(colunas_num, colunas_cat, C)` com `LogisticRegression`; casos: `score` literal numa tabela gerada, categoria nova no teste não quebra, `named_steps["modelo"].coef_` com o número de colunas certo)
  6. **Leitura · O que o pipeline protege** (imputar antes de dividir; `remainder`; a mensagem de `handle_unknown`)
  7. **Exercício (código) · Nomes das colunas e avaliação honesta** (`nomes_apos_prep(pipeline)`; `avaliar(df, alvo, colunas_num, colunas_cat, semente)` com o imputador espião da regra 6 injetado)
  8. **Quiz · handle_unknown e remainder**
- **Muda do roteiro:** "detectar vazamento em um código sem pipeline (`call` devolvendo as linhas)" vira o espião do passo 7 e uma pergunta do quiz.
- **Erradas típicas:** `OneHotEncoder` sem `handle_unknown`; `sparse=False` (`TypeError` no 1.8); esquecer `remainder` e perder colunas; coeficientes sem `named_steps`; imputar no conjunto inteiro.

### n5-m4-03-divisao-de-dados-e-validacao-cruzada · Treino, validação, teste e validação cruzada
- **Arquivo:** `04-scikit-learn-na-pratica/03-divisao-de-dados-e-validacao-cruzada.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Três conjuntos, três papéis** (Mermaid: dados → treino/teste → k-fold no treino → teste uma vez; `train_test_split(stratify, random_state)`)
  2. **Previsão · Proporções com e sem stratify** (contagem de positivos num teste de 20 linhas com 10 % de positivos)
  3. **Exercício (lacunas) · Dividir estratificado** (`dividir(X, y, semente, fracao_teste)` → os quatro arrays)
  4. **Leitura · k-fold e o que a média esconde** (KaTeX: média ± desvio das partições; `StratifiedKFold`, `cross_validate`)
  5. **Exercício (código) · Média, desvio e grupos** (`cv_media_desvio(pipeline, X, y, k, semente)`; `validacao_por_grupo(pipeline, X, y, grupos, k)` com `GroupKFold`, conferida por um espião que anota os grupos de cada partição)
  6. **Leitura · Tempo e grupos** (`TimeSeriesSplit`; embaralhar uma série é vazamento; validação aninhada citada)
  7. **Exercício (código) · Validação temporal** (`particoes_temporais(n, k)` → lista de `(inicio_teste, fim_teste)`; `validacao_temporal(pipeline, X, y, k)`)
  8. **Quiz · O papel do teste**
- **Muda do roteiro:** `esquema_recomendado(descricao)` (texto livre) vira pergunta do quiz.
- **Erradas típicas:** `stratify` esquecido; `KFold` sem `shuffle` em dados ordenados; grupo dividido entre treino e validação; série embaralhada; teste avaliado dentro do laço.

### n5-m4-04-busca-de-hiperparametros · Busca de hiperparâmetros
- **Arquivo:** `04-scikit-learn-na-pratica/04-busca-de-hiperparametros.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · Grade sobre um pipeline** (KaTeX: ajustes = combinações × partições + 1; `etapa__parametro`; a mensagem do nome sem prefixo)
  2. **Previsão · Quantos ajustes**
  3. **Exercício (ordenar) · O custo da busca** (`custo_da_busca(grade, k, refit=True)` → `int`, puro Python)
  4. **Leitura · Aleatória, cv_results_ e o vencedor otimista** (`RandomizedSearchCV` com listas e `scipy.stats.loguniform`; `cv_results_` em DataFrame; validação aninhada)
  5. **Exercício (código) · Buscar e resumir** (`buscar_grade(pipeline, X, y, grade, k)` → `(melhores_parametros, melhor_score)`; `resumo_cv_results(busca, n)` → top-n como lista de dicionários nativos)
  6. **Exercício (código) · Busca aleatória com semente** (`buscar_aleatoria(pipeline, X, y, distribuicoes, n_iter, semente)`; mesma semente, mesmo resultado)
  7. **Quiz · Grade ou aleatória**
- **Orçamento:** grades de até 6 combinações × 3 partições, 300 linhas (regra 9).
- **Erradas típicas:** nome sem o prefixo; `refit=False` e depois `predict`; escolher pelo teste; `rank_test_score` lido como pontuação; `np.float64` no retorno.

### n5-m4-05-metricas-de-regressao-e-selecao-de-modelos · Métricas de regressão e seleção de modelos
- **Arquivo:** `04-scikit-learn-na-pratica/05-metricas-de-regressao-e-selecao-de-modelos.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Quatro réguas para o erro** (KaTeX: MAE, RMSE, MAPE, $R^2$; unidades; MAPE com zero)
  2. **Previsão · Um $R^2$ negativo** (`r2_score` de um modelo pior que a média)
  3. **Exercício (lacunas) · As métricas** (`metricas_regressao(y, y_pred)` → dicionário; MAPE ignora `y = 0` e devolve `None` se todos forem zero)
  4. **Leitura · Toda comparação começa pela baseline** (`DummyRegressor`/`DummyClassifier`; preferir o mais simples no empate)
  5. **Exercício (código) · Contra a baseline** (`comparar_com_baseline(modelo, X, y, semente)` → `{"modelo", "baseline", "ganho"}`)
  6. **Leitura · A variação entre partições** (KaTeX: diferença pareada e seu desvio; `RepeatedKFold`; `scipy.stats.ttest_rel` com a ressalva da dependência entre partições)
  7. **Exercício (código) · Tabela de experimentos** (`tabela_de_experimentos(modelos, X, y, k, repeticoes, semente)` → DataFrame com colunas fixas, comparado por `to_dict("list")`; `diferenca_relevante(scores_a, scores_b, minimo)`)
  8. **Quiz · R² negativo e MAPE**
- **Erradas típicas:** RMSE sem a raiz; MAPE dividindo por zero; baseline treinada no teste; escolher por uma divisão só; desvio com `ddof` diferente do enunciado.

### n5-m4-06-vies-variancia-e-curvas-de-aprendizado · Viés, variância e curvas de aprendizado
- **Arquivo:** `04-scikit-learn-na-pratica/06-vies-variancia-e-curvas-de-aprendizado.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Erro = viés² + variância + ruído** (KaTeX; polinômios ajustados a amostras diferentes)
  2. **Previsão · Treino e validação por grau**
  3. **Exercício (lacunas) · Diagnóstico** (`diagnostico(erro_treino, erro_validacao, erro_aceitavel)` → `"vies"`, `"variancia"` ou `"ok"` pelas regras do enunciado)
  4. **Leitura · validation_curve e learning_curve** (as duas leituras do gráfico, descritas em texto; tabela de ações)
  5. **Exercício (código) · Curvas** (`curva_de_validacao(pipeline, X, y, parametro, valores, k)` → `(treino, validacao)` médios; `curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente)`)
  6. **Leitura · Simular viés e variância** (a decomposição medida por simulação; o "double descent" citado)
  7. **Exercício (código) · A simulação** (`simular_vies_variancia(grau, n_amostras, repeticoes, semente)` → `(vies2, variancia)`; casos: mesma semente igual, variância crescente com o grau, viés decrescente; `acao_recomendada(diagnostico)`)
  8. **Quiz · O que fazer com este diagnóstico**
- **Erradas típicas:** mais dados para resolver viés; curvas com 3 pontos; variância do modelo confundida com a dos dados; `learning_curve` sem `shuffle` em dados ordenados.

## Módulo 5 · Árvores e ensembles

`bibliotecas: [numpy, pandas, scikit-learn]`, perfil `ml`. Florestas com até 30 árvores nos casos (regra 9).

### n5-m5-01-arvores-de-decisao · Árvores de decisão
- **Arquivo:** `05-arvores-e-ensembles/01-arvores-de-decisao.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Perguntas binárias** (KaTeX: Gini e entropia; Mermaid: uma árvore de dois níveis num problema fictício de crédito)
  2. **Previsão · Gini de três nós**
  3. **Exercício (lacunas) · Impurezas** (`gini(y)`, `entropia(y)` em bits; conjunto vazio → 0)
  4. **Leitura · A melhor divisão** (KaTeX: ganho ponderado pelos tamanhos; limiares nos pontos médios; empate pelo menor atributo e menor limiar)
  5. **Exercício (código) · Melhor divisão** (`melhor_divisao(X, y)` → `(atributo, limiar, ganho)`, igual à raiz do `DecisionTreeClassifier(max_depth=1)` no `setup`)
  6. **Leitura · Recursão, parada e poda** (`max_depth`, `min_samples_leaf`, `ccp_alpha`; `export_text`; invariância à escala; instabilidade)
  7. **Exercício (código) · Uma árvore do zero** (`ArvoreSimples(max_depth)` com `fit`/`predict`, recursiva; previsões iguais às do `DecisionTreeClassifier` no `setup` em dados sem empates de ganho; `profundidade_por_cv(X, y, profundidades, semente)`)
  8. **Quiz · Gini, entropia e escala**
- **Erradas típicas:** limiares só nos valores exatos; ganho sem ponderar; recursão sem parada; profundidade escolhida pelo treino; folha com a classe de menor índice em vez da majoritária.

### n5-m5-02-florestas-aleatorias · Bagging e florestas aleatórias
- **Arquivo:** `05-arvores-e-ensembles/02-florestas-aleatorias.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · A média de modelos instáveis** (KaTeX: variância da média com correlação $\rho$)
  2. **Previsão · O que fica fora da bolsa** (fração única de um bootstrap ≈ 0,632, com semente)
  3. **Exercício (lacunas) · Bootstrap e fora da bolsa** (`amostra_bootstrap(n, semente)`; `fora_da_bolsa(indices, n)`)
  4. **Leitura · Bagging e max_features**
  5. **Exercício (código) · Bagging de árvores** (`bagging_arvores(X, y, X_novo, n_arvores, semente)` por votação; casos: semente, acurácia ≥ a da árvore única, `n_arvores=1` igual a uma árvore no bootstrap)
  6. **Leitura · OOB, hiperparâmetros e extrapolação** (`oob_score_`; o platô fora da faixa do treino)
  7. **Exercício (código) · OOB e extrapolação** (`oob_manual(X, y, n_arvores, semente)` perto do `oob_score_` com tolerância; `extrapolacao(x_tr, y_tr, x_novo, semente)` → previsões constantes acima do máximo)
  8. **Quiz · max_features**
- **Muda do roteiro:** `variancia_das_predicoes(modelo_factory, ...)` com `call` vira leitura + Previsão (fábrica não passa por `call`).
- **Erradas típicas:** bootstrap sem reposição; OOB e teste como a mesma coisa; votação com empate pelo maior rótulo; esperar extrapolação.

### n5-m5-03-gradient-boosting · Gradient boosting por dentro
- **Arquivo:** `05-arvores-e-ensembles/03-gradient-boosting.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Ajustar aos resíduos** (KaTeX: modelo aditivo, resíduo como gradiente negativo do MSE; Mermaid dos estágios)
  2. **Previsão · Os resíduos depois do primeiro estágio**
  3. **Exercício (lacunas) · Um estágio** (`primeiro_estagio(X, y, profundidade, taxa)` → previsões e resíduos)
  4. **Leitura · Taxa e número de estágios** (KaTeX; parada antecipada; XGBoost e LightGBM citados, sem existir no executor)
  5. **Exercício (código) · Boosting do zero** (`boosting_regressao(X, y, n_estagios, taxa, profundidade)` → `(previsoes, historico)`; igual ao `GradientBoostingRegressor(..., random_state=0)` do `setup` a `1e-6`; `estagios_otimos(historico_validacao)`)
  6. **Leitura · HistGradientBoosting** (binning, `NaN` nativo, `early_stopping` automático acima de 10 000 linhas)
  7. **Exercício (código) · Parada antecipada** (`hgb_com_parada(X, y, semente)` → `n_iter_` ≤ máximo; `comparar_floresta_boosting(X, y, semente)` → dicionário com as duas pontuações de CV)
  8. **Quiz · Taxa contra estágios**
- **Erradas típicas:** nova árvore ajustada ao alvo; taxa 1 sem limite de estágios; previsão inicial zero no lugar da média; parar no primeiro aumento da validação.

### n5-m5-04-interpretacao-de-modelos · Interpretação: importâncias, permutação e dependência parcial
- **Arquivo:** `05-arvores-e-ensembles/04-interpretacao-de-modelos.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · O que a importância por impureza mede** (o viés para colunas contínuas e de alta cardinalidade)
  2. **Previsão · O identificador aleatório "importante"** (`feature_importances_` de uma floresta com uma coluna de ruído com 500 valores distintos)
  3. **Exercício (lacunas) · Importância por permutação** (`importancia_por_permutacao(modelo, X, y, repeticoes, semente)` → médias por coluna, perto de `permutation_importance` com tolerância)
  4. **Leitura · Dependência parcial e ICE** (KaTeX: média das previsões com a coluna fixada; `sklearn.inspection.partial_dependence`, sem gráfico; associação no modelo, não causa)
  5. **Exercício (código) · Comparar importâncias** (`comparar_importancias(modelo, X_va, y_va, semente)` → a coluna de ruído no topo de uma e no fim da outra)
  6. **Exercício (código) · Dependência parcial** (`dependencia_parcial(modelo, X, j, grade)` igual ao `partial_dependence(..., kind="average")` do `setup`)
  7. **Quiz · Correlação e importância**
- **Muda do roteiro:** `PartialDependenceDisplay` depende do matplotlib: a lição usa a função `partial_dependence` e descreve a curva em texto; SHAP fica só citado.
- **Erradas típicas:** permutar no treino; permutar a coluna no array recebido; PDP lido como efeito causal; importância sem a incerteza das repetições.

## Módulo 6 · SVM e aprendizado não supervisionado

`bibliotecas: [numpy, scikit-learn]`, perfil `ml`.

### n5-m6-01-svm-e-kernels · SVM: margem máxima e kernels
- **Arquivo:** `06-svm-e-aprendizado-nao-supervisionado/01-svm-e-kernels.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · A maior margem** (KaTeX: $\min \tfrac12\lVert w \rVert^2 + C \sum \max(0, 1 - y_i(w \cdot x_i + b))$; `support_vectors_`)
  2. **Previsão · Vetores de suporte com C pequeno e grande**
  3. **Exercício (lacunas) · Perda hinge** (`perda_hinge(w, b, X, y, C)` com rótulos ±1)
  4. **Leitura · Subgradiente da hinge** (KaTeX; GD para o SVM linear)
  5. **Exercício (código) · SVM linear do zero** (`svm_linear(X, y, C, taxa, epocas)`; previsões ≥ 0,98 iguais às de `SVC(kernel="linear", C)` no `setup`; `contar_vetores_de_suporte(X, y, C)`)
  6. **Leitura · Kernels e escala** (RBF e `gamma`; escala obrigatória; custo em $n$ grande, `LinearSVC`)
  7. **Exercício (código) · C, gamma e escala** (`grade_c_gamma(X, y, Cs, gammas, k)` → melhor par; `efeito_da_escala(X, y, semente)` → acurácias sem e com padronizar)
  8. **Quiz · C e gamma**
- **Erradas típicas:** rótulos 0/1 na hinge; regularizar o `b`; `gamma` alto decorando; SVM sem padronizar; `probability=True` sem necessidade.

### n5-m6-02-k-means · k-means do zero
- **Arquivo:** `06-svm-e-aprendizado-nao-supervisionado/02-k-means.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Inércia e o algoritmo de Lloyd** (KaTeX; Visualizar: duas iterações em Python puro com 6 pontos)
  2. **Previsão · Rótulos que trocam de nome** (duas execuções com sementes diferentes; ARI 1,0 com rótulos diferentes)
  3. **Exercício (lacunas) · Atribuir e atualizar** (`atribuir(X, C)`, `atualizar(X, rotulos, k)`, cluster vazio mantém o centróide anterior)
  4. **Leitura · k-means++ e n_init** (mínimos locais)
  5. **Exercício (código) · k-means do zero** (`kmeans(X, k, semente, max_iter, tol)` → `(C, rotulos, inercia)`; ARI 1,0 com `KMeans(k, random_state=0)` e inércia a `1e-6` em nuvens bem separadas; para pela mudança dos centróides; `not_calls` `KMeans`)
  6. **Leitura · Escolher k e aplicações** (cotovelo e silhueta; segmentação RFM fictícia; quantização de cores numa imagem sintética)
  7. **Exercício (código) · Silhueta e cores** (`escolher_k_silhueta(X, ks, semente)`; `quantizar_cores(imagem, k, semente)` → imagem com `k` cores distintas e a mesma forma)
  8. **Quiz · Mínimos locais**
- **Erradas típicas:** comparar rótulos diretamente; número fixo de iterações sem checar mudança; cluster vazio vira `nan`; inicialização única; inércia sem o quadrado.

### n5-m6-03-clustering-hierarquico-e-dbscan · Clustering hierárquico e DBSCAN
- **Arquivo:** `06-svm-e-aprendizado-nao-supervisionado/03-clustering-hierarquico-e-dbscan.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Juntar os mais próximos** (Mermaid: a ordem de fusões de 5 pontos; single, complete, average, Ward; `scipy.cluster.hierarchy.linkage` e `fcluster`, sem desenhar o dendrograma)
  2. **Previsão · Cortar por distância**
  3. **Exercício (lacunas) · Aglomerativo** (`aglomerativo(X, k, ligacao)`; ARI 1,0 com `AgglomerativeClustering` no `setup`)
  4. **Leitura · DBSCAN** (núcleo, borda, ruído; `eps` pelo gráfico de k-distâncias descrito em números)
  5. **Exercício (código) · DBSCAN do zero** (`dbscan(X, eps, min_samples)` → rótulos com `-1` para ruído; ARI 1,0 com `DBSCAN` no `setup` e o mesmo conjunto de ruídos; `not_calls` `DBSCAN`)
  6. **Leitura · Qual método para qual forma** (luas, anéis, densidades diferentes, gerados na lição)
  7. **Exercício (código) · eps sugerido e contagem** (`eps_sugerido(X, k)` pelo maior salto das k-distâncias ordenadas; `resumo_clusters(rotulos)` sem contar o ruído como grupo)
  8. **Quiz · Escolher o método**
- **Muda do roteiro:** `metodo_recomendado(descricao)` vira quiz; o dendrograma desenhado sai (sem matplotlib).
- **Erradas típicas:** single linkage encadeando; DBSCAN sem padronizar; ruído contado como cluster; ponto de borda tratado como núcleo.

### n5-m6-04-pca · PCA do zero
- **Arquivo:** `06-svm-e-aprendizado-nao-supervisionado/04-pca.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Direções de maior variância** (KaTeX: covariância, autovetores, variância explicada)
  2. **Previsão · O sinal dos autovetores** (dois métodos, mesmas direções, sinais diferentes)
  3. **Exercício (lacunas) · PCA pela covariância** (`pca_cov(X, k)` → `(componentes, variancia_explicada)` com `eigh` e ordenação decrescente; comparado com `PCA` do `setup` em valor absoluto)
  4. **Leitura · SVD** (KaTeX: $X_c = U S V^\top$; por que é o que o scikit-learn usa)
  5. **Exercício (código) · PCA por SVD e quantos componentes** (`pca_svd(X, k)` com o sinal alinhado pela maior coordenada; `n_componentes_para(X, fracao)`)
  6. **Leitura · Projetar, reconstruir e escalar** (erro de reconstrução; padronizar antes; t-SNE existe em `sklearn.manifold` e é citado, UMAP não existe)
  7. **Exercício (código) · Reconstrução** (`reconstruir(X, k)` → erro decrescente em `k` e zero com todos os componentes; `pca_padronizado(X, k)`)
  8. **Quiz · Centralizar e o sinal**
- **Muda do roteiro:** os dígitos e as "eigenfaces nos dígitos" dependem da decisão 1; sem ela, o exemplo de alta dimensão são os padrões 5 × 5 da m3-06. t-SNE **existe** no executor (o roteiro dizia que não).
- **Erradas típicas:** não centralizar; `eig` sem ordenar; comparar sinais; variância explicada sem dividir pelo total; padronizar com o teste.

### n5-m6-05-deteccao-de-anomalias · Detecção de anomalias
- **Arquivo:** `06-svm-e-aprendizado-nao-supervisionado/05-deteccao-de-anomalias.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Anomalia, outlier, novidade** (KaTeX: distância de Mahalanobis; transações fictícias geradas)
  2. **Previsão · fit_predict e novidade no LOF** (`novelty=True` e o `predict` em pontos novos)
  3. **Exercício (lacunas) · Mahalanobis** (`mahalanobis(X)` → distância de cada linha, com `solve`; covariância singular → `ValueError`)
  4. **Leitura · IsolationForest e LOF** (por que poucas divisões isolam uma anomalia; `contamination`)
  5. **Exercício (código) · Dois detectores** (`anomalias_isolation_forest(X, contaminacao, semente)` → índices; `erro_de_reconstrucao_pca(X, k)`)
  6. **Leitura · Avaliar com poucos rótulos** (KaTeX: precisão em $k$; limiar pela distribuição das pontuações)
  7. **Exercício (código) · Precisão em k** (`precisao_em_k(scores, rotulos, k)`, empate pelo menor índice; `comparar_detectores(X, rotulos, k, semente)`)
  8. **Quiz · Contaminação**
- **Erradas típicas:** covariância singular sem tratar; `fit_predict` do LOF em dados novos; avaliar com acurácia; ordenar as pontuações no sentido errado (no `IsolationForest`, menor é mais anômalo).

## Módulo 7 · Boas práticas de machine learning

`bibliotecas: [numpy, pandas, scikit-learn]`, perfil `ml`. Os espiões da regra 6 são a ferramenta principal do módulo.

### n5-m7-01-vazamento-de-dados · Vazamento de dados e validação honesta
- **Arquivo:** `07-boas-praticas-de-ml/01-vazamento-de-dados.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Quatro vazamentos** (Mermaid: alvo, pré-processamento, duplicatas, tempo; uma coluna "data de cancelamento" num problema fictício de cancelamento)
  2. **Previsão · AUC com e sem a coluna do futuro**
  3. **Exercício (lacunas) · O fluxo honesto** (`fluxo_honesto(X, y, semente)` com `Pipeline` + `cross_val_score`; o espião anota os tamanhos de cada `fit`)
  4. **Leitura · Pré-processamento e seleção antes da divisão** (a seleção de atributos pelo alvo antes da validação: o resultado otimista medido)
  5. **Exercício (código) · Corrigir o fluxo** (`corrigir_fluxo(X, y, k_atributos, semente)` com `SelectKBest` dentro do pipeline; pontuação literal, menor que a do fluxo com vazamento calculado no `setup`; `atributos_suspeitos(df, alvo, limiar)`)
  6. **Leitura · Duplicatas e tempo**
  7. **Exercício (código) · Duplicatas e divisão temporal** (`duplicatas_entre_conjuntos(X_tr, X_te)` → índices do teste; `divisao_temporal(df, coluna_data, fracao)` → treino antes do teste)
  8. **Quiz · Onde está o vazamento** (trechos de código; substitui o `encontrar_vazamento(codigo)` do roteiro)
- **Erradas típicas:** `fit_transform` no conjunto inteiro; `SelectKBest` fora do pipeline; série embaralhada; duplicata comparada por índice e não por valores.

### n5-m7-02-dados-desbalanceados · Dados desbalanceados
- **Arquivo:** `07-boas-praticas-de-ml/02-dados-desbalanceados.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Quando 1 % é positivo** (o que o modelo aprende; `class_weight="balanced"`)
  2. **Previsão · Acurácia e recall do modelo que sempre diz "não"**
  3. **Exercício (lacunas) · class_weight** (`efeito_class_weight(X, y, semente)` → recall da classe rara sem e com)
  4. **Leitura · Reamostrar só o treino** (oversampling, SMOTE simplificado do zero, porque `imblearn` não existe; undersampling)
  5. **Exercício (código) · Oversampling e SMOTE** (`oversampling(X, y, semente)` com reposição; `smote_simplificado(X, y, k, semente)` → pontos sintéticos no segmento entre um minoritário e um vizinho, conferidos por propriedade)
  6. **Leitura · Métricas e limiar para a classe rara** (KaTeX: AP; recall em $k$; ajustar o limiar depois de balancear)
  7. **Exercício (código) · Validação com reamostragem correta** (`cv_com_reamostragem(X, y, k, semente)`: espião prova que a reamostragem vê só os índices de treino de cada partição; `comparar_metricas(y, scores)`)
  8. **Quiz · Reamostrar a validação**
- **Erradas típicas:** reamostrar antes de dividir; `replace=False` no oversampling; acurácia como métrica; limiar 0,5 depois de balancear.

### n5-m7-03-engenharia-de-atributos · Engenharia de atributos
- **Arquivo:** `07-boas-praticas-de-ml/03-engenharia-de-atributos.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Datas, razões e logs** (`dt.dayofweek`, `renda / divida`, `log1p`; `KBinsDiscretizer`; `FunctionTransformer`)
  2. **Previsão · Atributos de uma data** (dia da semana e fim de semana de 4 datas)
  3. **Exercício (lacunas) · Atributos de data** (`atributos_de_data(df, coluna)` → tabela nova; colunas e `dtypes` exatos)
  4. **Leitura · Target encoding sem vazamento** (KaTeX: média suavizada; a versão ingênua usa o alvo da própria linha; `TargetEncoder` do scikit-learn com validação interna)
  5. **Exercício (código) · Target encoding com folds** (`target_encoding_com_folds(categorias, y, k, suavizacao, semente)` → cada linha codificada só com as outras partições)
  6. **Leitura · Seleção de atributos** (filtro, embutido e `RFECV`)
  7. **Exercício (código) · Ganho e seleção** (`ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente)`; `selecionar_rfecv(X, y, semente)` → índices)
  8. **Quiz · Target encoding ingênuo**
- **Erradas típicas:** target encoding com o alvo da linha; binning com bordas do conjunto inteiro; criar atributos sem validar; `log` em zero.

### n5-m7-04-etica-e-vies-em-modelos · Ética, justiça e viés em modelos
- **Arquivo:** `07-boas-praticas-de-ml/04-etica-e-vies-em-modelos.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · De onde vem o viés** (amostra, rótulo histórico, proxy; casos descritos de forma genérica e fictícia: crédito, seleção de currículos)
  2. **Previsão · Taxas por grupo** (taxa de positivos e TPR de dois grupos numa tabela fictícia)
  3. **Exercício (lacunas) · Métricas por grupo** (`metricas_por_grupo(y, y_pred, grupo)` → `{grupo: {"n", "taxa_positivos", "tpr", "fpr"}}`)
  4. **Leitura · Critérios de justiça e o conflito entre eles** (KaTeX: paridade demográfica, igualdade de oportunidade)
  5. **Exercício (código) · Dois critérios** (`paridade_demografica(y_pred, grupo)`; `igualdade_de_oportunidade(y, y_pred, grupo)`, como diferenças máximas)
  6. **Leitura · Proxies, mitigação e LGPD** (remover o atributo sensível não basta; art. 20 da LGPD, finalidade e minimização; model card)
  7. **Exercício (código) · Proxies e limiares por grupo** (`detectar_proxies(X, sensivel, limiar)` pela AUC de prever o atributo sensível; `limiares_por_grupo(y, scores, grupo, tpr_alvo)`)
  8. **Quiz · Trade-offs e LGPD**
- **Muda do roteiro:** "casos reais (crédito, recrutamento, reconhecimento facial)" viram casos descritos sem empresas, órgãos ou episódios reais (régua).
- **Erradas típicas:** remover o atributo sensível e declarar resolvido; comparar grupos sem o $n$; TPR com o denominador errado; limiar por grupo escolhido no teste.

## Módulo 8 · Projeto do nível

### n5-m8-01-projeto-previsao-de-inadimplencia · Projeto final: previsão de inadimplência
- **Arquivo:** `08-projeto-do-nivel/01-projeto-previsao-de-inadimplencia.lvl.md` · projeto do nível (`projeto: true`) · 300 XP · 240 min · `bibliotecas: [numpy, pandas, scikit-learn]` (perfil `ml`)
- **Padrão de projeto (N1/N3/N4):** 8 passos; uma Leitura de especificação, uma Previsão, 5 exercícios de código livre e um Quiz de autoavaliação; a partir do passo 4 as funções dos passos anteriores vêm prontas num arquivo (`credito_base.py`), para o erro antigo não contaminar o passo novo.
- **Dados (fictícios, gerados):** `dados_credito.py` com `gerar_clientes(n, semente)` → DataFrame de clientes **inventados** (renda, idade, meses de relacionamento, tipo de contrato, região fictícia "A"–"E", atrasos anteriores, razão dívida/renda, alvo `inadimplente` com ~8 % de positivos, ausentes e categorias raras de propósito), gerado por uma regra logística documentada na leitura. Não é amostra de dados reais; o texto diz isso. O arquivo entra em cada passo (limite de 100 000 caracteres por arquivo: o gerador tem poucas centenas de linhas; um CSV de 30 000 clientes não caberia).
- **Passos (8):**
  1. **Leitura · O problema, os dados e o custo dos erros** (Mermaid do fluxo carregar → dividir → pipeline → comparar → buscar → limiar → avaliar → model card; KaTeX do custo esperado; critérios de aprovação)
  2. **Previsão · O que o gerador entrega** (`gerar_clientes(200, 7)`: `dtypes`, taxa de inadimplência, contagem de ausentes)
  3. **Exercício (código) · Carregar e dividir** (`preparar(df)` com tipos e categorias; `dividir(df, semente)` estratificado, teste intocado; casos com `n = 2 000`)
  4. **Exercício (código) · Pipeline e baseline** (`montar_pipeline(modelo, colunas_num, colunas_cat)`; `baseline(X, y)`; espião de vazamento da regra 6)
  5. **Exercício (código) · Comparar modelos** (`comparar_modelos(X, y, semente)` → tabela com logística, floresta (30 árvores), HGB e `DummyClassifier`, PR-AUC média e desvio por `RepeatedStratifiedKFold` 3 × 2; comparada por `to_dict("list")` com tolerância)
  6. **Exercício (código) · Limiar pelo custo** (`escolher_limiar(y, scores, custo_fp, custo_fn)`; `avaliar_final(pipeline, X_teste, y_teste, limiar)`)
  7. **Exercício (código) · Justiça e model card** (`justica_por_grupo(y, y_pred, grupo)`; `gerar_model_card(resultados)` → markdown com os números calculados e a seção de limitações, conferido com `match: contains`; os casos geram os dados com outra semente)
  8. **Quiz · Autoavaliação**
- **Orçamento:** os casos usam `gerar_clientes(2000, semente)`; os 30 000 clientes do roteiro ficam para o "Executar" do aluno (medido: logística em 20–40 ms, floresta de 30 árvores em 0,5–0,6 s e HGB em 0,34–0,42 s com 30 000 × 8). A busca de hiperparâmetros do roteiro (`buscar_hiperparametros`) fica fora dos casos ou com grade de até 4 combinações × 3 partições.
- **Erros que o projeto cobra:** tocar no teste mais de uma vez; reamostrar antes de dividir; limiar 0,5 por padrão; comparar sem baseline; model card sem limitações e sem métricas por grupo; números digitados à mão no relatório.

## Prova

Banco de **40 questões, 10 por tentativa** (como N2, N3 e N4), a escrever depois dos módulos: nota mínima 70 %, 45 min, 60 min entre tentativas.

- **Proporção:** 5 (matemática), 5 (regressão), 7 (classificação), 7 (scikit-learn), 4 (árvores), 6 (SVM e não supervisionado), 4 (boas práticas) e 2 (projeto), na ordem dos módulos e das lições; a alternativa correta fica 10 vezes em cada posição.
- **Tipo de questão:** prever a saída de um trecho (formas, `predict`, `score`, métricas), achar o defeito de um fluxo (vazamento, `fit_transform` no teste, `stratify` esquecido, nome sem prefixo na grade), interpretar curvas e métricas descritas em números e escolher o método. Distratores são erros que as lições mostram; a explicação diz por que cada um falha.
- **Texto puro:** a prova não renderiza markdown nem KaTeX; código curto vai em bloco literal do YAML.
- **Conferência:** toda resposta que é saída de código ou conta é conferida no executor (scikit-learn 1.8.0) por uma lição temporária numa cópia mínima do `content/`, como no N4. Nenhuma questão usa `sklearn.datasets`, `penalty=`, `multi_class=` ou `sparse=`.
- Das 12 questões atuais sobram as ideias (gradiente e direção, taxa alta, L1 contra L2, acurácia em desbalanceado, recall, `fit_transform` no treino e `transform` no teste, k-fold, sobreajuste), reescritas como cenário; as definições diretas saem.

## Defeitos conhecidos (fora do conteúdo)

1. **`sklearn.datasets` não importa no executor** (`ImportError: ... ctypes`, via `scipy.io.arff`), e nem o `sklearn.utils.estimator_checks`. Correção possível no executor sem abrir o `ctypes`: registrar um módulo vazio em `sys.modules["scipy.io.arff"]` (ou carregar o `scipy.io` sem o leitor ARFF) antes do código do aluno, para que `sklearn.datasets` importe e os `load_*`/`make_*` funcionem offline. Pré-importar com o `ctypes` liberado **não** serve: o módulo ficaria alcançável por `scipy.io.arff._arffread.ctypes`. Até lá, o "Executar" no navegador (Pyodide sem o guarda do executor) pode aceitar um `load_iris` que a verificação recusa.
2. **Queda do processo do executor (código 139, `OOMKilled` falso)** duas vezes em ~20 min, as duas depois de dezenas de boots `ml` seguidos (política `fresh`, até 4 simultâneos); a segunda durante um `content:verify` sozinho. O log não registra nada antes da queda. É provavelmente a mesma causa do `executor: fetch failed` que o N4 registrou. Hipóteses: memória de WebAssembly reservada por workers reciclados (o executor enxerga 16 GB e 32 CPUs do host, mas o contêiner tem 6 GB), ou falha do V8 ao reservar memória para um boot novo. No `infra/compose/compose.yml` o executor tem `restart: unless-stopped` e volta sozinho, mas as verificações em andamento de todos os alunos se perdem e o boot recomeça; no `compose.dev.yml` não há `restart:`, e ele fica parado até um `docker start`.
3. **Aviso do `threadpoolctl` no stderr** (`Unable to import LDSO from pyodide_js._module`), herdado da montagem do Pyodide; o executor poderia filtrá-lo.
4. **Estado compartilhado entre casos do lote** (herdado do N4): módulos importados persistem; por isso a regra 6 proíbe monkeypatch de classes da biblioteca.

## Decisões para o Filipe

1. **`sklearn.datasets`:** corrigir o executor (defeito 1) e liberar íris, vinhos e dígitos 8 × 8 para a m3-06 e a m6-04, ou manter tudo gerado. O plano funciona sem a correção (padrões 5 × 5 gerados no lugar dos dígitos); com ela, os dígitos voltam ao roteiro original.
2. **`bibliotecas` da m2-05:** o frontmatter tem só `numpy`, mas os objetivos pedem `Lasso` do scikit-learn. Proposta: `bibliotecas: [numpy, scikit-learn]` (a lição passa para o perfil `ml`, ~10 s de espera sem worker quente); alternativa: lasso por descida coordenada do zero, sem scikit-learn, e o objetivo 3 reescrito.
3. **Worker quente `ml` na homologação:** do m3 ao m8, toda verificação usa o perfil `ml`; com `fresh`, a segunda verificação em menos de ~10 s espera um boot. Dimensionar `RUNNER_PYODIDE_WARM` para o número de alunos simultâneos esperado (pendência já registrada em `docs/v2/pendencias-curso-completo.md` pelo N4).
4. **Projeto com dados gerados:** clientes fictícios de `dados_credito.py` (sem dados reais de pessoas), como a régua manda; o `curso.yaml` não precisa mudar ("modelo de previsão de inadimplência").
5. **Prova:** 12 questões hoje; a meta é 40, com 10 por tentativa (a `descricao` do `prova.yaml` precisará mudar quando o banco for escrito).
