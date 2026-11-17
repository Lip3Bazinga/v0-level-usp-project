# Plano do Nível 6 — Deep Learning: a IA por dentro

Este é o plano de autoria do Nível 6 da trilha **Python: do zero à IA**. Ele orienta a escrita das lições de `content/cursos/n6-deep-learning`. Cada lição traz: slug, título, a **sequência de passos, um a um**, com o tipo de cada passo (Leitura, Exercício — código, lacunas ou ordenar —, Previsão, Quiz), os recursos de apresentação (diagrama Mermaid, bloco `visualizar`, fórmula KaTeX), as funções pedidas nos exercícios e as erradas típicas.

**Estado:** plano escrito e lição piloto `n6-m4-01-backprop-vetorizado` escrita, verificada e publicada (relatório em `.claude-transfer/auditoria/n6-plano-e-piloto.md`). As outras 35 lições continuam stubs (`publicada: false`). A fonte da verdade é o `.lvl.md`: se este plano e uma lição escrita divergirem, vale a lição, e o plano é que precisa ser corrigido.

Formato dos arquivos: `content/README.md` (§3 inteira; recursos de apresentação em §3.5–§3.7; `python-dados` em §6) e `docs/v2/curso-e-passos.md` §6. Todas as 36 lições usam `runtime: python-dados` (Pyodide no executor). O N6 herda **tudo** o que os `PLANO.md` do N4 e do N5 registraram em "Verificação e convenções do nível" (int32 no WebAssembly, `np.repeat` com contagens `int64`, retornos numpy comparados por `.tolist()` com tolerância ou por `expr` booleana com `hint`, vetorização cobrada por regra de fonte e nunca por tempo, `default_rng(semente)`, `visualizar` com numpy, um lote por vez no executor). Esta seção só acrescenta o que é específico de deep learning e foi conferido no executor durante o piloto.

## Como usar este plano

1. Abra o arquivo da lição (`content/cursos/n6-deep-learning/<módulo>/<NN>-<slug>.lvl.md`).
2. Mantenha o frontmatter (`slug`, `titulo`, `descricao`, `xp`, `tempo_min`, `dificuldade`, `tipo`, `runtime`, `bibliotecas`, `objetivos`) e troque `publicada: false` por `publicada: true` quando a lição estiver verificada. Não renomeie arquivos nem slugs. As únicas mudanças de frontmatter previstas estão em "Decisões para o Filipe" (em especial a 1: tirar `scikit-learn` dos módulos 4 e 5).
3. Substitua o passo de roteiro pelos passos **na ordem e com os tipos listados** na lição (`## Passo N · Leitura|Exercício|Previsão|Quiz · Título`).
4. Em cada exercício: `### Instruções` (lista numerada = checkpoints), `### Código inicial` (não existe no `modo: ordenar`), `### Solução`, `### Dicas` (até 3), `### Verificação` (JSON de `TestCase[]`) e `### Soluções erradas` (**pelo menos cinco**, uma por erro comum, cada uma com um defeito só).
5. Verifique numa **cópia mínima** do `content/` num diretório de rascunho, com só o curso N6, `trilhas/` (a trilha listando só `n6-deep-learning`), `README.md` e `CURRICULO.md`, e o `curso.yaml` da cópia com `prerequisito: null`: o `content:verify` gera as Previsões de todos os cursos do diretório antes de filtrar pelo `--licao`. Em `apps/api`, com `RUNNER_URL=http://127.0.0.1:8081` e `RUNNER_TOKEN=dev-runner-token-0123456789abcdef`:
   - `pnpm -s content:check` (no repositório);
   - `pnpm -s content:verify --content <cópia>/content --licao <slug>` (uma lição por vez, em segundo plano);
   - `pnpm -s content:metrics --curso n6-deep-learning` (a lição escrita não pode sair "suspeita").
6. Confira que cada solução errada reprova **pelo motivo pretendido**: o `content:verify` só diz que reprovou. Rode `verifyStep` de `apps/api/scripts/content/verify.ts` num script de rascunho fora do repositório (com `createPool(1)`, um lote por vez) e imprima os casos que falharam de cada errada.

## Quem é o aluno

Concluiu os Níveis 1 a 5. Do Nível 1: tipos, laços, coleções, funções, strings, `try/except`. Do Nível 2: classes, métodos especiais (`__add__`, `__radd__`, `__repr__`), `dataclasses`, closures, módulos, exceções próprias, geradores, `unittest`. Do Nível 3: busca em profundidade e ordenação topológica (base do `backward`), recursão e seus limites, análise de custo por contagem de operações. Do Nível 4: numpy (vetorização, `axis`, máscaras, broadcasting, indexação avançada, `default_rng`), matplotlib descrito por propriedades. Do Nível 5: derivada, gradiente, regra da cadeia, `verificar_gradiente` (m1-02), gradiente descendente batch e por mini-lotes, regressão logística e **softmax com entropia cruzada do zero** ($\nabla_W = \tfrac1n X^\top(P - Y)$, m3-06), métricas de classificação, validação, sobreajuste, regularização L2, boas práticas e vazamento.

Nunca escreveu uma rede de mais de uma camada, um motor de autograd, um otimizador com estado, uma convolução, uma RNN nem uma atenção. Cada lição usa só o que os níveis anteriores e as lições anteriores deste nível ensinaram, na ordem dos módulos 1 a 8 (a ordem foi corrigida em dois pontos do roteiro: ver m3-02 e m3-05).

### O que o nível usa e o que não usa

- **Usa:** numpy em todo o nível, Python puro no módulo 2 (a classe `Valor`), biblioteca padrão (`math`, `random` só para o `Valor`, `collections.Counter`, `base64`, `json`). Tudo "do zero".
- **Não usa (não existe no executor):** PyTorch, TensorFlow, Keras, JAX, `autograd`, `numba`, `tiktoken`, `regex`. Conferido: `import torch` dá `ModuleNotFoundError: No module named 'torch'` (o mesmo para os outros). No perfil `dados` também não existem scipy, scikit-learn e matplotlib (`ModuleNotFoundError: No module named 'scipy'`). Os passos opcionais "repita em PyTorch no seu computador" ficam em texto, sem verificação, e não podem ser exercício.
- **Não usa por regra:** `sklearn.datasets` (não importa no executor, ver N5), `load_digits` (substituído pelos dígitos gerados de `digitos.py`), textos com direito autoral (contos "de domínio público" do roteiro incluídos: ver "Dados"), nomes reais de pessoas tirados de cadastros, produtos e empresas reais.
- **Ponte com o Nível 5:** `verificar_gradiente` e o erro relativo (m1-02) viram a checagem numérica de todo o nível; softmax + entropia cruzada e o gradiente $P - Y$ (m3-06) são a última camada de toda rede; o laço de mini-lotes (m2-02) e a regularização L2 (m2-05) são reaproveitados no m3 e no m4; o vazamento (m7-01) volta no tokenizador treinado com a validação (m7-01 e projeto).
- **Ponte com o Nível 7:** a geração com temperatura e a alucinação (m7-06, m8-02) e a regra $6ND$ de custo (m8-01).

## Como usar os recursos de apresentação neste nível

### Régua (a mesma do Nível 1 e dos PLANOs auditados)

- **Passos por lição:** 7 ou 8 (o projeto tem 8). Abre com uma Leitura que motiva o assunto com um problema concreto e fecha com um Quiz de **3 perguntas de cenário** (uma situação com código, números de um treino ou uma decisão; nada de definição decorada), cada uma com exatamente uma alternativa correta, distratores tirados de erros reais e explicação (`> …`) que diz por que cada distrator falha. As duas lições de leitura do roteiro com "quiz de 5 perguntas" (m5-04, m8-01, m8-02) também ficam com 3.
- **Leituras:** 250 a 350 palavras de prosa (sem contar blocos de código), com pelo menos um bloco de código ilustrativo e, quando há um erro comum, a mensagem **real** do executor (tabela em "Mensagens reais"). Sem exclamações.
- **Previsão:** pelo menos uma por lição, antes de a leitura explicar o comportamento. Código determinístico (`default_rng(semente)`), até 20 linhas de saída, números arredondados, `.tolist()` ou formas (`.shape`); nada de arrays impressos com espaços de alinhamento.
- **Andaime:** o primeiro exercício de cada lição que estreia uma construção nova é `modo: lacunas` ou `modo: ordenar`; os seguintes são de código livre. O projeto (m8-03) só tem código livre. Em `lacunas`, a solução é idêntica ao código inicial fora dos `___`, e as soluções erradas são **erros que cabem nas lacunas**.
- **Exercícios:** 6 a 12 casos por exercício (projeto: ≥ 16, ver "Projeto"), verificando **comportamento** (`expr`/`call`), um comportamento por caso, com as bordas; `source` só para cobrar o "como" que é o assunto do passo (do zero, sem laço sobre as posições). Pelo menos **5 soluções erradas** reais, cada uma com um único defeito (nada de espantalho). O código inicial reprova. `name` em todo caso; `hint` que orienta sem entregar; `reveal` falso.
- **Dicas:** até 3 por passo; apontam o caminho, nunca o código.
- **Custo por contagem, nunca por tempo:** "a versão vetorizada é mais rápida" é ensinado com números medidos na leitura e em pergunta de quiz; o exercício cobra a estrutura (`source`) e o resultado. O custo de uma rede é ensinado contando operações (multiplicações-e-somas de uma camada densa, $6ND$ para treinar um modelo de linguagem), e o executor confirmou a regra: ~4–6 GFLOP/s em qualquer `@` (ver "O executor").
- **Exemplos neutros:** nada de USP, IME, códigos de disciplina, instituições, empresas, produtos, modelos comerciais ou pesquisas reais, e **nenhum dado real de pessoas**. Imagens (dígitos 8 × 8), nomes e textos são **gerados** por arquivos da lição ou **escritos para o curso** (ver "Dados"). Nomes de arquiteturas e artigos clássicos (perceptron, LeNet, ResNet, Bengio 2003, "Attention is all you need", GPT-2 como arquitetura) aparecem como história da área, sem números de desempenho que o aluno não pode conferir.
- **Imagem (`assets/`) e Vídeo:** nenhum neste nível (os filtros, mapas de ativação e matrizes de atenção são descritos por números ou desenhados em texto com caracteres).

### Recursos

- **Diagrama (bloco `mermaid`):** para processos e grafos: neurônio (m1-01), grafo computacional (m2-01, m2-03), forward e backward com caches (m4-01, escrito), laço de treino (m3-02), arquitetura da CNN (m5-03), RNN desenrolada no tempo (m6-04), bloco transformer pré-norm (m7-04), pipeline do projeto. `flowchart` com no máximo ~8 nós e rótulos curtos; texto com parênteses, colchetes, dois-pontos, `@` ou sublinhado entre aspas.
- **Visualizador (bloco `python visualizar`):** numpy ou Python puro, até 60 linhas, sem `input()`, nunca a solução de um exercício. Para estado que muda passo a passo: a atualização do perceptron (m1-01), a pilha da ordenação topológica (m2-03), o momentum numa função 1D (m3-04), a janela da convolução deslizando (m5-01), o estado escondido da RNN (m6-04), a geração token a token (m7-06).
- **Fórmula (KaTeX):** derivadas locais, $\frac{\partial L}{\partial W} = X^\top \frac{\partial L}{\partial Z}$, softmax e entropia cruzada, erro relativo do grad check, momentum, RMSProp e Adam com correção de viés, variância de Xavier/He, BatchNorm e LayerNorm, $(n + 2p - k)/s + 1$, $h_t = \tanh(\dots)$, as portas da LSTM, $\text{softmax}(QK^\top/\sqrt{d})V$, codificação senoidal, perplexidade $e^{\text{NLL}}$, $6ND$.

## Verificação e convenções do nível

Tudo nesta seção foi conferido no executor do compose (`RUNNER_URL=http://127.0.0.1:8081`, contêiner com 6 GB, `RUNNER_PYODIDE_WARM=dados:1,ml:1`) durante o piloto, em 2026-11-16, com sondas pelo `/v1/run` (perfil `dados`, worker quente, mediana de 3 a 5 repetições quando há tempo) e com a lição piloto pelo `content:verify` e pelo `verifyStep`.

### O executor

- **Versões:** Python 3.14.2 (Pyodide 314.0.7), numpy 2.4.6. Sem PyTorch, TensorFlow, Keras, JAX, `autograd`, `numba`, `tiktoken` e `regex` (todos `ModuleNotFoundError: No module named '…'`). O perfil `dados` (só `numpy` em `bibliotecas`) não tem scipy, scikit-learn nem matplotlib.
- **Perfil:** as 28 lições que só listam `numpy` usam o perfil `dados`: o worker quente responde em 50–80 ms por lote, e o substituto da política `fresh` sobe em ~1 s (duas verificações com menos de ~1 s de intervalo: a segunda leva ~1 s). As 8 lições dos módulos 4 e 5 listam `scikit-learn` no frontmatter e caem no perfil `ml` (~10 s de boot quando não há worker quente), **sem precisar dele**: nenhuma lição do N6 importa o scikit-learn. A piloto manteve o frontmatter (o pedido era não mexer) e foi verificada no `ml`; a proposta é tirar o `scikit-learn` dessas 8 (ver "Decisões para o Filipe", 1).
- **Sem BLAS otimizado:** o numpy do Pyodide é compilado para `emscripten`, sem OpenBLAS, num processo de 1 CPU. Qualquer `@` roda a **4–6 GFLOP/s** (medido em matrizes de 128 a 1 024 linhas, inclusive o `@` em lote de 4 dimensões da atenção). Isso torna o custo de uma rede previsível por contagem: um passo de treino de um modelo com $N$ parâmetros num lote de $D$ posições custa ~$6ND$ operações, e o mini-GPT do roteiro da m7-05 confirmou a regra (tabela abaixo). A m8-01 usa esse número.
- **Limites:** 10 s por lote na verificação **e também no "Executar"** do navegador (`PYTHON_EXECUTION_TIMEOUT_MS = 10 s` em `apps/web/src/lib/constants/timing.ts`): **nada na plataforma treina por minutos**. Arquivos: até 100 000 caracteres cada, 300 000 no projeto inteiro e 30 arquivos (`packages/contracts/src/files.ts`), com extensões `.py`, `.txt`, `.csv`, `.json` e `.md`. O `setup` de um caso aceita até 20 000 caracteres e a `expr`, 2 000 (`packages/contracts/src/runner.ts`).
- **Recursão:** `sys.getrecursionlimit()` é 1 000. Uma ordenação topológica recursiva (a DFS do Nível 3) num grafo `Valor` em cadeia passa com 900 nós e levanta `RecursionError: maximum recursion depth exceeded` com 2 000. Um `setrecursionlimit` maior não foi testado no executor (risco de derrubar o worker): a m2-03 mostra a versão iterativa como alternativa e mantém os grafos dos casos com menos de ~500 nós de profundidade.
- **Módulos do aluno são reimportados em cada caso** (conferido: um contador global num `estado.py` do aluno voltou a zero em três casos seguidos), enquanto os módulos da biblioteca (numpy) são compartilhados no lote, como no N4. Estado em atributo de classe ou variável global do aluno não vaza entre casos; vaza entre chamadas **dentro** do mesmo caso, que é o que os casos de "estado compartilhado" exploram.
- **Ponto flutuante sem aviso:** como no N4 e no N5, nenhum `RuntimeWarning`. Novidade: `np.seterr(all="raise")` **não** faz nada no executor (`np.exp(np.array([1000.0]))` continua dando `inf`, sem `FloatingPointError`). Nenhuma lição pode ensinar a pegar estouro com `seterr`; o jeito é conferir com `np.isfinite`.

### Custos medidos (worker `dados` quente, 1 CPU)

| Operação | Tamanho | Tempo |
|---|---|---|
| `@` de matrizes | (256 × 32) @ (32 × 128) / (1 024 × 64) @ (64 × 256) / (256 × 256)² | 0,34 ms / 7,5 ms / 8,3 ms (4–6 GFLOP/s) |
| `Valor` (micrograd) forward + backward | MLP 64 → 32 → 16 → 10, 8 exemplos (~47 mil nós) | 68 ms |
| o mesmo com matrizes (piloto) | idem | 0,06 ms (~1 100 vezes menos) |
| `Valor`, 100 passos de treino | MLP 3 → 4 → 4 → 1, 4 exemplos (41 parâmetros) | 78 ms (perda 0,007) |
| checagem numérica (diferença central) | MLP 5 → 4 → 3, 6 exemplos (39 parâmetros) | 3 ms |
| checagem numérica | MLP 64 → 32 → 16 → 10, 8 / 32 exemplos (2 778 parâmetros) | 0,46 s / 0,88 s |
| MLP numpy com Adam, lote 32 | 64 → 32 → 10, 1 000 dígitos 8 × 8, 1 / 10 / 20 épocas | 7 ms / 55 ms / 0,10 s (validação 0,46 / 0,91 / 0,96) |
| idem | 64 → 32 → 16 → 10, 20 épocas / 64 → 64 → 10 com lote 64, 20 épocas | 0,13 s (0,94) / 0,12 s (0,98) |
| convolução 3 × 3 com padding 1, uma imagem 8 × 8 | laço sobre as janelas com `np.sum` / laço Python puro sem numpy (6 × 6) | 0,27 ms / 0,04 ms |
| convolução em lote | 100 imagens × 8 filtros 3 × 3: laço / `sliding_window_view` / im2col por fatias | 206 ms / 0,55 ms / 0,48 ms |
| CNN conv(8 filtros 3 × 3) → ReLU → max pool 2 × 2 → densa 128 → 10, Adam, lote 32 | 1 000 dígitos, 1 / 5 / 10 épocas | 27 ms / 0,11 s / 0,22 s (validação 0,54 / 0,93 / 0,96) |
| RNN forward + BPTT | $T = 16$, lote 16, $H = 32$, $V = 30$ | 1,2 ms |
| mini-GPT forward + backward + Adam, por passo (lote 16, $V = 20$) | $T = 8$, $d = 16$, 2 cabeças, 1 bloco (4 016 parâmetros) | 1,4 ms |
| idem | $T = 16$, $d = 32$, 4 cabeças, 1 bloco (14 432 parâmetros; 15 008 com $V = 29$) | 6,5 ms |
| idem | $T = 16$, $d = 32$, 2 blocos (27 008; 27 584 com $V = 29$) | 12 ms |
| idem, lote 32 | $T = 32$, $d = 64$, 4 cabeças, 2 blocos (104 192): o modelo do roteiro da m7-05 | 220 ms |
| treino do mini-GPT, corpus gerado de 52 mil caracteres ($V = 29$) | $T = 16$, $d = 32$, 1 bloco, 300 / 600 passos | 2,0 s / 3,9 s (NLL de validação 0,70 / 0,54; bigrama: 1,65; $\ln V$: 3,37) |
| idem | $T = 16$, $d = 16$, 1 bloco, 600 passos / $T = 8$, $d = 16$, 600 passos | 1,5 s (0,67) / 0,9 s (0,95) |
| ler pesos `float16` em base64 | 15 008 parâmetros (40 024 caracteres) | 0,33 ms (erro máximo 3e-5 contra o `float64`) |

### Regras de verificação (específicas de deep learning; as do N4 e do N5 continuam valendo)

1. **Checagem numérica de gradientes** (validada na piloto):
   - **diferença central** $\frac{L(\theta + h) - L(\theta - h)}{2h}$, um número por vez, **no próprio array**, restaurando o valor depois; `f` é uma função sem argumentos que lê os mesmos arrays (`lambda: perda(params, X, y)`);
   - **`float64` e $h = 10^{-5}$**; **erro relativo** $\frac{\lVert a - n \rVert}{\max(\lVert a \rVert + \lVert n \rVert,\ 10^{-8})}$ por array (o piso evita `nan` com dois gradientes zero); **limiar $10^{-7}$**;
   - medido numa rede 5 → 4 → 3 com 6 exemplos: correto, $10^{-11}$ a $2 \cdot 10^{-10}$ com $h = 10^{-5}$; $2{,}5 \cdot 10^{-7}$ com $h = 10^{-3}$ (reprova no limiar: $h = 10^{-3}$ só serve para funções suaves de uma variável); $3 \cdot 10^{-9}$ com $h = 10^{-7}$; $4 \cdot 10^{-4}$ com $h = 10^{-12}$; em `float32`, $10^{-2}$ com $h = 10^{-5}$ e $10^{-4}$ com $h = 10^{-3}$ (um backward correto parece defeituoso: toda checagem é em `float64`);
   - assinaturas de defeito (úteis para quiz e para conferir erradas): gradiente dividido por $n$ duas vezes → $\frac{n-1}{n+1}$ em **todas** as camadas ($0{,}714$ com $n = 6$); `db` com a média → $0{,}714$ só nos vieses; ReLU não desfeita → $\approx 0{,}5$ na primeira camada e $0$ na última; máscara da ReLU tirada da camada errada → $0{,}31$ e $0{,}13$;
   - mini-GPT (embeddings, LayerNorm, atenção multi-cabeça com máscara causal, MLP com ReLU): pior erro relativo **por entrada** $3{,}5 \cdot 10^{-8}$ em 176 entradas checadas (12 por array). Em modelos com LayerNorm e softmax, o limiar por entrada é $10^{-6}$; por array, $10^{-7}$ continua valendo;
   - **dobras da ReLU:** se a perturbação cruza $Z = 0$, a diferença central erra naquele número. Nos dados das sondas, o menor $|Z|$ foi 0,008, muito acima de $h$; os casos usam pesos e entradas sorteados de uma normal (nada de inteiros pequenos que zerem pré-ativações);
   - **onde fica:** a diferença central vai no `setup` (funções com prefixo `_`, como `_numerico` e `_erro`), e a `expr` devolve **booleanos por array**, na ordem dos parâmetros (`[[_erro(dW, _numerico(W)) < 1e-7, ...] for ...]` → `[[true, true], [true, true]]`), para o aluno ver qual camada falhou. Nunca `assert_allclose`, que mostraria os arrays;
   - **custo:** 2 forwards por número. Nos casos, redes de até ~100 parâmetros e até 8 exemplos (3 ms); redes maiores são comparadas com a referência (regra 2), não checadas numericamente.
2. **Referência no `setup`:** para redes de verdade (64 → 32 → 16 → 10 na piloto), uma implementação de referência curta no `setup` (`_ref(params, X, d)`), e a `expr` compara com `np.allclose(..., atol=1e-12)`, devolvendo `bool` (validado na piloto, casos `referencia-64-32-16-10` e `quatro-camadas`). A referência é escrita de outro jeito (listas de ativações em vez de caches) para não repetir um defeito. O `hint` diz o que foi comparado. Para entradas minúsculas (até ~30 números), o esperado é literal, calculado no executor com a solução.
3. **Propriedades** (uma por caso, `expr` com tipo nativo): formas dos gradientes iguais às dos parâmetros (`[[list(dW.shape), list(db.shape)] for dW, db in grads]`); parâmetros intactos depois do forward, do backward e da checagem (`np.array_equal` contra cópias); perda inicial perto de $\ln k$; **a perda cai** com os gradientes do aluno (piloto: 40 passos de descida com taxa 0,5 levam a perda a menos da metade; com o gradiente dividido por $n$ duas vezes, não); linhas da softmax somando 1; causalidade (mudar o token $t+1$ não muda as saídas até $t$); amostragem reprodutível com a mesma semente e diferente com outra.
4. **Classes escritas pelo aluno** (`Valor`, camadas com `forward`/`backward`, otimizadores com estado): os casos só usam os nomes que o enunciado define (`dado`, `grad`, `backward()`, `parametros()`, `passo(params, grads)`; o `_backward` da m2-02 é pedido pelo nome no enunciado, então é contrato). Nada de atributo interno não pedido. O `setup` constrói os objetos e a `expr` devolve tipos nativos: um `Valor` devolvido chega como `{"$repr": …}` e nunca bate; devolva `v.dado`, `[p.grad for p in ...]`. Estado: duas instâncias independentes (pega `grad` ou `m` como atributo de classe), dois parâmetros com gradientes diferentes no mesmo otimizador (pega um `m` só para todos), três `passo` seguidos com valores literais (pega `t` começando em 0 no Adam), e `zero_grad` entre dois `backward` (pega o acúmulo).
5. **Injeção de dependência** (validada na piloto): a função que testa ou treina **recebe** o que usa (`checar_gradientes(perda_e_grads, params, X, y)`, `treinar(modelo, otimizador, ...)`, `gerar(params, ids, n, amostrar)`), e o caso passa uma versão com defeito plantado definida no `setup` (piloto: um backward que divide por $n$ duas vezes → `[[0.714, 0.714], [0.714, 0.714]]`; um sem a máscara da ReLU → primeira camada > 0,1 e última < $10^{-7}$). Não substitua funções do aluno por atribuição no namespace (`perda_e_gradientes = ...` no `setup`): quem importou de outro jeito não é atingido.
6. **Treino determinístico:**
   - a inicialização entra **por parâmetro** (`params` já sorteado no `setup`) sempre que o assunto não é a inicialização; quando é (m1-04, m3-05), o enunciado diz a ordem dos sorteios (`rng = default_rng(semente)`, depois `W1`, `b1`, `W2`…, com `rng.normal(0, σ, forma)`), e os casos comparam **estatísticas** (média e desvio por camada, com tolerância de 5 erros padrão) além da forma, porque duas soluções corretas podem consumir o gerador em outra ordem;
   - **compare exatamente só o que é totalmente especificado:** 1 a 5 passos de descida em lote cheio, com a ordem de atualização dada, batem a `1e-10`. Duas implementações algebricamente iguais (`A1.T @ d / n` contra `(d.T @ A1).T / n`, `sum` contra `mean`) se afastaram só $2 \cdot 10^{-15}$ nos pesos e $10^{-14}$ nos logits depois de 3 000 passos (com $n$ potência de 2, saíram idênticas): o problema não é o arredondamento, é a **ordem do sorteio** (embaralhamento por época, lote, dropout, inicialização);
   - **com sorteio, compare propriedades:** perda final abaixo de um limiar com folga (≥ 20 % acima do que a solução atinge), acurácia de validação com piso 5 pontos abaixo do medido, perda que cai na média de janelas. Não compare pesos depois de muitas épocas com mini-lotes, nem amostras geradas por um modelo que o aluno treinou;
   - **poucos passos nos casos:** um treino de verdade fica no "Executar" do aluno (até ~4 s) e na narrativa, com os números medidos; os casos usam de 20 a 60 passos (regra 7).
7. **Orçamento do lote: ~2 s** (a regra 9 do N5), somando todos os casos. Tamanhos fixados para os casos, a partir da tabela de custos:
   - MLP: até 64 → 32 → 10 com 300 dígitos e 5 épocas (~40 ms por caso); a acurácia de validação (piso 0,85, medido 0,91) fica para um caso só, com 1 000 dígitos e 10 épocas (~60 ms);
   - convolução em laço: no máximo 2 imagens 8 × 8 e 2 filtros por caso (~2 ms); a vetorizada, até 500 imagens;
   - CNN: 300 dígitos e 3 épocas por caso de treino (~70 ms), no máximo 2 casos;
   - RNN: $T \le 12$, $H \le 32$, até 60 passos de treino num caso;
   - mini-GPT: $T = 16$, $d = 32$, 4 cabeças, 1 bloco, lote 16 (~6,5 ms por passo), **no máximo 60 passos por caso e 2 casos de treino por passo** (~0,8 s); treinos mais longos só no "Executar" (600 passos, ~4 s), nunca num caso;
   - checagem numérica: até ~100 parâmetros, até 8 exemplos.
   Meça a solução com o worker quente antes de fechar o passo (piloto: 50, 65–76 e 80 ms por lote).
8. **Dados gerados ou escritos para o curso** (nada de `load_digits`, nem de texto com direito autoral, nem de cadastro de nomes reais):
   - **dígitos 8 × 8:** `digitos.py` (~1,7 KB) com dez desenhos 8 × 8 escritos à mão em texto (`"..####.. .##..##. ..."`) e `gerar_digitos(n_por_classe, semente, ruido=0.3, deslocar=True)`: rótulos por `np.repeat(np.arange(10), n)` (saem `int32` e servem para indexar), deslocamento de −1 a 1 pixel em cada eixo (`np.roll`), ruído normal e corte em [0, 1], devolvendo `X` de forma `(n, 64)`. Com 100 por classe: 1 000 imagens, média 0,39. Um MLP 64 → 32 → 10 chega a 0,96 de validação em 20 épocas. Usado no m4 e no m5 (e no aumento de dados da m4-03);
   - **nomes inventados** (m6, m8-02): `nomes.txt` com ~1 000 nomes gerados por um gerador de sílabas escrito para o curso (`gerar_nomes.py`, com o arquivo pronto na lição para não gastar tempo no caso), em dois estilos com proporção fixa (por exemplo, 75 % terminados em vogal e 25 % em consoante), que a m8-02 usa para medir se o modelo reproduz o desequilíbrio dos dados. Sem nomes de pessoas reais e sem rótulo de gênero;
   - **textos** (m7, projeto): `corpus.py` com uma gramática pequena de frases em português sobre uma vila fictícia (sujeitos, verbos, objetos, lugares e tempos sorteados com `default_rng(semente)`): 1 500 frases dão 52 mil caracteres e $V = 29$ em 14 ms. A estrutura é aprendível em segundos (o mini-GPT vai de 3,37 a 0,54 de NLL em 600 passos), o que permite ver o modelo aprender de verdade. O BPE (m7-01) usa, além dele, um texto curto escrito para o curso (fábulas de ~3 KB num `.txt`). O roteiro previa "contos de domínio público, ~200–300 KB": sai (direito autoral difícil de auditar, e 300 KB não cabem num arquivo de 100 000 caracteres);
   - **limites:** cada arquivo de dados até ~60 000 caracteres, para sobrar espaço no projeto de 300 000.
9. **Pesos pré-treinados embutidos** (m7-05, m7-06, m8-02 e projeto): o modelo é treinado pelo autor no executor (com a solução da lição) e salvo em `float16` codificado em base64 num arquivo `pesos_gpt.txt` da lição, com as chaves e as formas numa primeira linha JSON e o base64 na segunda. 15 008 parâmetros ocupam 40 024 caracteres e são lidos em 0,33 ms com `np.frombuffer(base64.b64decode(texto), dtype=np.float16).astype(np.float64)`; o erro máximo contra o `float64` é $3 \cdot 10^{-5}$, irrelevante para gerar e para medir perplexidade (compare com tolerância `1e-3`). Um arquivo de pesos por lição que precisa dele; o projeto inteiro (código + corpus + pesos) cabe em ~150 000 caracteres.
10. **Vetorização por regra de fonte:** "sem laço sobre as posições" é cobrado com `not_uses for` e `not_uses list_comprehension` restritos à função (`"function": "conv2d_rapida"`). Medido: `np.lib.stride_tricks.sliding_window_view(Xp, (k, k), axis=(2, 3))` existe e dá o mesmo resultado do laço (e de um im2col que só faz $k^2$ fatias). Como o im2col por fatias usa um `for` sobre as $k^2$ posições do filtro, o enunciado da m5-01 pede `sliding_window_view` (sem `for`) e mostra o im2col por fatias na leitura. A comparação de velocidade (~400 vezes) é leitura e quiz, nunca caso.
11. **`call` ou `expr`:** como no N5. `call` só para funções puras com argumentos JSON (contagens de parâmetros, `shape_de_saida`, `estimar_flops`, agendamento de taxa, BPE em textos curtos). Tudo que recebe arrays, parâmetros, funções ou objetos usa `expr` com `setup`. Os `call` do roteiro com `params`, `modelo` ou `config` mudam para `expr`.

### Mensagens reais (numpy 2.4.6 e Python 3.14.2, conferidas no executor)

Use exatamente estas, sem o traceback:

| Situação | Mensagem |
|---|---|
| `X @ W` com formas incompatíveis (`(4, 3) @ (5, 2)`) | `ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 5 is different from 3)` |
| `dW = X @ dZ` no lugar de `X.T @ dZ` (`X` `(4, 3)`, `dZ` `(4, 2)`) | a mesma, com `(size 4 is different from 3)` (piloto, leitura 1) |
| `np.dot(X, W)` incompatível | `ValueError: shapes (4,3) and (5,2) not aligned: 3 (dim 1) != 5 (dim 0)` |
| viés com forma `(d_out, 1)` somado a `Z` de forma `(n, d_out)` | `ValueError: operands could not be broadcast together with shapes (4,2) (3,1) ` (se `n == d_out`, **não** dá erro e soma errado: o viés vira uma coluna por exemplo) |
| `W -= taxa * dW` com `dW` transposto | `ValueError: operands could not be broadcast together with shapes (3,2) (2,3) (3,2) ` |
| reshape impossível (juntar cabeças com `d` errado) | `ValueError: cannot reshape array of size 60 into shape (2,5,4,newaxis)` |
| rótulos `float` como índice (`P[np.arange(n), y]`) | `IndexError: arrays used as indices must be of integer (or boolean) type` |
| rótulo fora do vocabulário / das classes | `IndexError: index 4 is out of bounds for axis 1 with size 4` |
| `float(perda)` com `perda` de forma `(1,)` | `TypeError: only 0-dimensional arrays can be converted to Python scalars` (no numpy 2.4 é erro; em versões antigas era só aviso: use `.item()` ou reduza com `.mean()`) |
| `2 * v` sem `__rmul__` / `1 + v` ou `sum(valores)` sem `__radd__` (m2-02) | `TypeError: unsupported operand type(s) for *: 'int' and 'Valor'` / `... for +: 'int' and 'Valor'` |
| grafo `Valor` profundo demais (m2-03) | `RecursionError: maximum recursion depth exceeded` (cadeia de 2 000 nós; 900 passa) |
| `math.log(0.0)` / `math.log(-1.0)` num `Valor.log` (m2-04) | `ValueError: expected a positive input, got 0.0` (a mensagem antiga, `math domain error`, mudou no Python 3.14) |
| `math.sqrt(-1.0)` / `math.exp(1000.0)` | `ValueError: expected a nonnegative input, got -1.0` / `OverflowError: math range error` |
| `2.0 ** 1024` | `OverflowError: (68, 'Result not representable')` |
| `rng.choice(V, p=probs)` com `probs` que não somam 1 (m6-02, m7-06) | `ValueError: Probabilities do not sum to 1. See Notes section of docstring for more information.` |
| idem com probabilidade negativa / com `nan` / com tamanho diferente | `ValueError: Probabilities are not non-negative` / `ValueError: Probabilities contain NaN` / `ValueError: a and p must have same size` |
| decodificar bytes cortados no meio de um caractere (m7-01) | `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xc8 in position 0: unexpected end of data` (com `errors="replace"`, vira `�`) |
| `json.dumps` de pesos (checkpoint) | `TypeError: Object of type ndarray is not JSON serializable` (também `float32`, `int64`) |
| `np.load("pesos")` sem a extensão | `FileNotFoundError: [Errno 44] No such file or directory: 'pesos'` (`[Errno 2]` no computador do aluno) |
| `import torch` | `ModuleNotFoundError: No module named 'torch'` |

### Comportamentos do executor que pegam desprevenido

- **Estouros silenciosos:** `np.exp(709.0)` dá `8.2e307` e `np.exp(710.0)` dá `inf`; `np.log(0)` dá `-inf`; `0 * np.log(0)` e `inf - inf` dão `nan`; `np.tanh(1000.0)` é `1.0`; a sigmoide ingênua `1 / (1 + np.exp(1000.0))` dá `0.0` (certo, sem aviso). Tudo sem `RuntimeWarning` e sem efeito de `np.seterr`. O `math` do Python, ao contrário, levanta erro (`OverflowError`, `ValueError`): é o que o `Valor` do m2 usa.
- **`nan` na perda:** `np.mean` com um `nan` dá `nan`, `np.max` também, e `np.argmax([1.0, nan, 3.0])` devolve 1 (a posição do `nan`). Um treino que diverge vira `inf` e depois `nan` em silêncio; os casos de "perda cai" usam `bool(...)` sobre a comparação, e `nan < x` é `False` (o caso reprova, que é o certo).
- **Máscara causal:** `np.where(np.triu(np.ones((T, T), dtype=bool), 1), -np.inf, S)` funciona; uma linha **inteira** de `-inf` dá `nan` na softmax (`exp(-inf - (-inf))`), e multiplicar a máscara de zeros por `-inf` dá `nan` (`0 * -inf`): a máscara se aplica com `np.where` ou somando, nunca multiplicando.
- **Acumular em índices repetidos:** `d[idx] += 1.0` com `idx = [0, 0, 1]` dá `[1, 1, 0]` (o repetido conta uma vez); `np.add.at(d, idx, 1.0)` dá `[2, 1, 0]`. É o backward do embedding (m6-01) e do `col2im` (m5-02); a errada "indexação direta" é real e reprova.
- **Inteiros de 32 bits:** `np.repeat(np.arange(10), n)`, `np.bincount` e as contagens de `np.unique(..., return_counts=True)` saem `int32`; `rng.integers` sai `int64` e, como no N5, precisa de `.astype(np.intp)` antes de `np.repeat`. Índices `int32` e `int64` funcionam na indexação.
- **`rng.choice` aceita `p` em `float32`** que soma 1 em `float32` (não reclamou). Amostragem determinística: `rng = np.random.default_rng(semente)` criado **uma vez** e consumido na ordem do enunciado (um `rng.choice` por token).
- **Arquivos:** `np.savez("pesos.npz", W=..., b=...)` e `np.load` funcionam no executor (538 bytes para 6 números); `np.savez` com argumentos posicionais nomeia `arr_0`, `arr_1`. Os arquivos escritos num caso não sobrevivem para o próximo caso (cada caso roda num diretório novo, como no N4).
- **`einsum` e `swapaxes`** funcionam (`np.einsum("bhtd,bhsd->bhts", Q, K)` dá `(1, 2, 3, 3)`); a m7-03 ensina `reshape` + `transpose` e aceita `einsum` em qualquer solução.
- **Bytes:** `list("ção".encode("utf-8"))` é `[195, 167, 195, 163, 111]`: cada letra acentuada vale 2 bytes, o que o BPE da m7-01 explora (o vocabulário começa com 256 bytes).

### Previsão e visualizador

- **Previsão:** nada de imprimir arrays com espaços de alinhamento; formas (`.shape`), `.tolist()` de valores exatos, `round(float(x), 4)`. Sorteio não se prevê lendo o código (lição do N5): a Previsão usa dados escritos à mão ou só propriedades do sorteio (tamanhos dos lotes, união ordenada dos índices). Exceções e mensagens entram por `except ValueError: print("ValueError")`, não pela mensagem inteira (a mensagem do `matmul` é longa demais para digitar). A piloto tem uma (`n6-m4-01`, passo 2: formas e valores de `X.T @ dZ` com `dZ = I`).
- **Visualizador:** numpy ou Python puro, até 60 linhas; nunca um treino com centenas de passos (o rastreio no navegador fica lento). Nenhum na piloto (a leitura usa o Mermaid do forward/backward).

### Dosagem por módulo

Planejada (só a piloto está escrita). Mermaid e Visualizar = número de blocos; "Leituras com fórmula" = passos de Leitura com KaTeX.

| Módulo | Lições | Mermaid | Visualizar | Leituras com fórmula | Exercício (lacunas) | Exercício (ordenar) | Exercício (código) | Previsão | Imagens (assets) |
|---|---|---|---|---|---|---|---|---|---|
| 1 · Neurônios e perceptron | 4 | 2 | 1 | 8 | 4 | 0 | 8 | 4 | 0 |
| 2 · Autograd do zero | 5 | 3 | 1 | 7 | 4 | 1 | 10 | 5 | 0 |
| 3 · Treinando redes | 5 | 1 | 1 | 11 | 4 | 1 | 10 | 5 | 0 |
| 4 · MLP em numpy | 4 | 1 (piloto: 1) | 0 | 7 (piloto: 2) | 4 (piloto: 1) | 0 | 8 (piloto: 2) | 4 (piloto: 1) | 0 |
| 5 · Redes convolucionais | 4 | 1 | 1 | 7 | 4 | 0 | 8 | 4 | 0 |
| 6 · Sequências, embeddings e RNN | 5 | 2 | 1 | 10 | 5 | 0 | 10 | 5 | 0 |
| 7 · Atenção e transformers | 6 | 2 | 1 | 12 | 6 | 0 | 12 | 6 | 0 |
| 8 · Limites e projeto | 3 | 1 | 0 | 4 | 2 | 0 | 8 | 3 | 0 |
| **Total** | **36** | **13** | **6** | **66** | **33** | **2** | **74** | **36** | **0** |

## Estrutura do nível

8 módulos · 36 lições (1 projeto de nível) · 33,6 h de lições (2 015 min) + prova (45 min) · 4 560 XP · `horas: 44` no `curso.yaml` (2 015 min + 30 % = 43,7 h, a regra do `content/CURRICULO.md`, já confere) · prova com banco de **40 questões (10 por tentativa)**, distribuídas 4, 6, 6, 5, 4, 5, 7 e 3 pelos módulos, com a alternativa correta 10 vezes em cada posição (meta; hoje são 12).

| # | Módulo | Lições | Minutos | XP | Perfil |
|---|---|---|---|---|---|
| 1 | Neurônios e perceptron (`neuronios-e-perceptron`) | 4 | 175 | 430 | `dados` |
| 2 | Autograd do zero (`autograd-do-zero`) | 5 | 265 | 630 | `dados` |
| 3 | Treinando redes (`treinando-redes`) | 5 | 255 | 610 | `dados` |
| 4 | MLP vetorizado em numpy (`mlp-em-numpy`) | 4 | 220 | 520 | `ml` hoje (`scikit-learn` no frontmatter); `dados` com a decisão 1 |
| 5 | Redes convolucionais (`redes-convolucionais`) | 4 | 205 | 490 | idem |
| 6 | Sequências, embeddings e RNN (`sequencias-embeddings-e-rnn`) | 5 | 260 | 620 | `dados` |
| 7 | Atenção e transformers (`atencao-e-transformers`) | 6 | 325 | 780 | `dados` |
| 8 | Limites e projeto (`limites-e-projeto`) | 3 | 310 | 480 | `dados` |

Arquivos de apoio que se repetem entre lições (cada lição traz a sua cópia; o conteúdo é o mesmo e o autor copia da primeira lição que o criou):

- `digitos.py` (m4-02, m4-03, m4-04, m5-01, m5-03): o gerador da regra 8;
- `camadas.py` e `mlp.py` (m4-01, escritos na piloto; m4-02 a m4-04 e m5-03 os reaproveitam);
- `rede.py` (m3-02 a m3-05): um MLP de duas camadas com `forward`/`backward` prontos, apresentado como "caixa fechada que o m4 abre" (ver m3-02);
- `nomes.txt` (m6, m8-02), `corpus.py` e `fabulas.txt` (m7, projeto), `gpt.py` (m7-05 em diante: o mini-GPT de referência, forward e backward), `pesos_gpt.txt` (m7-06, m8-02, projeto).

## Módulo 1 · Neurônios e perceptron

Do neurônio artificial ao forward de um MLP em numpy. `bibliotecas: [numpy]`, perfil `dados`. Nenhum treino por gradiente ainda (o perceptron aprende pela regra dele).

### n6-m1-01-do-neuronio-ao-perceptron · Do neurônio biológico ao perceptron
- **Arquivo:** `01-neuronios-e-perceptron/01-do-neuronio-ao-perceptron.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Um neurônio que decide** (a inspiração biológica em um parágrafo, sem exagero; McCulloch-Pitts e Rosenblatt como história; $z = w \cdot x + b$ e o degrau em KaTeX; Mermaid: entradas → soma ponderada → degrau → saída)
  2. **Previsão · As saídas de um perceptron** (pesos e viés escritos à mão nas 4 entradas do AND; imprime `z.tolist()` e as previsões)
  3. **Exercício (lacunas) · Prever com o perceptron** (`perceptron_prever(X, w, b)` → array de 0 e 1, com `z > 0` → 1 e `z = 0` → 0, convenção dita no enunciado)
  4. **Leitura · A regra de aprendizado** (KaTeX: $w \leftarrow w + \eta\,(y - \hat y)\,x$, $b \leftarrow b + \eta\,(y - \hat y)$; interpretação geométrica; Visualizar: as atualizações de uma época no AND, em Python puro; convergência garantida se os dados forem separáveis, sem prova)
  5. **Exercício (código) · Treinar o perceptron** (`treinar_perceptron(X, y, epocas, taxa=1.0)` → `(w, b, erros_por_epoca)`: pesos começam em zero, exemplos na ordem dada, para quando uma época termina sem erro; AND e OR convergem com zero erros; no XOR, `erros_por_epoca` nunca chega a zero e tem `epocas` elementos)
  6. **Leitura · Perceptron, logística e a fronteira** (o degrau não tem gradiente útil; a logística do Nível 5 é o perceptron "suave"; a fronteira $w_1 x_1 + w_2 x_2 + b = 0$ como reta)
  7. **Exercício (código) · A fronteira de decisão** (`fronteira(w, b, x_min, x_max)` → dois pontos `(x, y)` da reta em `x_min` e `x_max`, `ValueError` se `w[1] == 0`; `separa(w, b, X, y)` → `bool`)
  8. **Quiz · A regra do perceptron**
- **Muda do roteiro:** `erros_por_epoca(X, y)` vira o terceiro retorno de `treinar_perceptron` (uma função só, sem treinar duas vezes); os `call` com arrays viram `expr`; "não embaralhar e ficar preso" sai (com a ordem fixa e dados separáveis o perceptron converge; o embaralhamento entra no m3-03).
- **Erradas típicas:** regra com rótulos ±1 (`w += taxa * y * x`) em dados 0/1 (nunca corrige os negativos); viés esquecido; degrau com `z >= 0`; atualizar mesmo quando acerta (`w += taxa * x`); parar na primeira época; `erros_por_epoca` contando depois da época seguinte; `fronteira` com o sinal do viés trocado.

### n6-m1-02-xor-e-a-necessidade-de-camadas · O problema do XOR e a necessidade de camadas
- **Arquivo:** `01-neuronios-e-perceptron/02-xor-e-a-necessidade-de-camadas.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Quatro pontos que nenhuma reta separa** (separabilidade linear; as quatro desigualdades do XOR em KaTeX e a contradição ao somá-las)
  2. **Previsão · O melhor perceptron no XOR** (busca exaustiva numa grade pequena de pesos inteiros; imprime o menor número de erros, 1, e quantos pesos o atingem)
  3. **Exercício (lacunas) · Uma rede que resolve o XOR** (`rede_xor(X)` com os pesos dados no enunciado: camada escondida com dois degraus e saída com um; as lacunas são as operações)
  4. **Leitura · A camada escondida muda as coordenadas** (tabela dos 4 pontos nas coordenadas $(h_1, h_2)$; Mermaid da rede 2 → 2 → 1; agora uma reta separa)
  5. **Exercício (código) · Duas camadas lineares são uma** (`composicao_linear(W1, b1, W2, b2)` → `(W, b)` com `X @ W + b` igual a `(X @ W1 + b1) @ W2 + b2`; `com_relu_difere(W1, b1, W2, b2, X)` → `bool`)
  6. **Leitura · Aproximação universal, em uma página** (soma de ReLUs deslocadas faz uma função linear por partes; mais "degraus", menos erro; "pode aproximar" não é "vai aprender"; profundidade)
  7. **Exercício (código) · Aproximar com ReLUs** (`interpolar_relu(x, nos_x, nos_y)` → valores da interpolação linear por partes escrita como $\sum_i a_i \max(0, x - c_i) + \text{constante}$; casos: exata nos nós, linear entre eles, erro máximo em $\sin$ com 4, 8 e 16 nós caindo, com os números medidos)
  8. **Quiz · Camadas e não linearidade**
- **Muda do roteiro:** `tentar_perceptron_xor()` (um `call` sem argumentos que devolve sempre 1) vira a Previsão; `aproximar_degraus(f, n)` recebe uma função e vira `interpolar_relu` com `expr`.
- **Erradas típicas:** esquecer a não linearidade (rede linear não resolve); pesos do XOR com sinal trocado; `composicao_linear` com `W2 @ W1` (forma errada) ou sem propagar `b1` por `W2`; coeficientes da interpolação como diferença de valores e não de inclinações; ReLU no lugar errado (`max(0, c - x)`).

### n6-m1-03-funcoes-de-ativacao · Funções de ativação
- **Arquivo:** `01-neuronios-e-perceptron/03-funcoes-de-ativacao.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Por que não linear, e qual** (KaTeX: sigmoide, tanh, ReLU, Leaky ReLU, GELU pela aproximação com tanh; faixa de saída e centralização em zero)
  2. **Previsão · Ativações nas pontas** (`σ(40)`, `σ(-40)`, `np.tanh(1000.0)`, a derivada da sigmoide em 10 com `.0e`, a ReLU em 0)
  3. **Exercício (lacunas) · Ativações e derivadas vetorizadas** (`sigmoide(z)` estável, `d_sigmoide`, `d_tanh`, `relu`, `d_relu` com 0 em 0, `leaky_relu(z, a=0.01)` e `d_leaky_relu`)
  4. **Leitura · Saturação e neurônios mortos** (KaTeX: $\sigma' \le 1/4$, o produto em 10 camadas; ReLU morta quando a pré-ativação é sempre negativa; a sigmoide pela fórmula de `exp` com `z = -1000` dá `inf` no denominador e 0, sem aviso)
  5. **Exercício (código) · Medir saturação e mortos** (`conferir_derivada(f, df, z, h=1e-5)` → erro relativo, por `expr` com `f` e `df` do aluno; `fracao_saturada(A, limiar=0.99)` para saídas de tanh; `neuronios_mortos(A)` → índices das colunas sempre zero num lote)
  6. **Leitura · Qual ativação em cada camada** (escondidas: ReLU ou GELU; saída: sigmoide para binária, softmax para multiclasse, identidade para regressão; softmax com um neurônio dá sempre 1)
  7. **Exercício (código) · GELU e a saída da rede** (`gelu(z)` pela aproximação com tanh; `saida_da_rede(logits, tarefa)` aplicando a função certa para `"binaria"`, `"multiclasse"` e `"regressao"`, `ValueError` para outra)
  8. **Quiz · Derivadas e escolhas**
- **Muda do roteiro:** `tanh_` própria com overflow vira a errada "tanh pela fórmula de `exp`" (dá `nan` em 1000) na m1-03, usando `np.tanh` na solução; `ativacao_recomendada(camada, tarefa)` (tabela decorada) vira `saida_da_rede`, que aplica a função; a verificação numérica usa o erro relativo da piloto.
- **Erradas típicas:** derivada da ReLU 1 em 0; sigmoide como `exp(z) / (1 + exp(z))` (`nan` em 1000); `d_sigmoide` recebendo a saída e aplicando a sigmoide de novo; tanh pela fórmula de `exp`; `neuronios_mortos` olhando um exemplo só; softmax na saída binária de um neurônio; GELU com o 0,044715 trocado.

### n6-m1-04-forward-pass-em-numpy · Forward pass de uma camada em numpy
- **Arquivo:** `01-neuronios-e-perceptron/04-forward-pass-em-numpy.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Uma camada é um produto de matrizes** (convenção `(n, d_in) @ (d_in, d_out) + (d_out,)`; KaTeX $Z = XW + b$; a mensagem real do viés `(d_out, 1)` e o caso silencioso `n == d_out`)
  2. **Previsão · As formas de cada tensor** (formas num forward de 3 camadas e a armadilha `(4,) + (4, 1)` → `(4, 4)`)
  3. **Exercício (lacunas) · Camada densa e forward** (`camada_densa(X, W, b)`; `forward_mlp(params, X)` → `(saida, ativacoes)` com ReLU entre as camadas e a última sem ativação)
  4. **Leitura · Inicialização** (zeros deixam todos os neurônios iguais; KaTeX $\text{Var}(z) = d_\text{in}\,\sigma^2\,\text{Var}(x)$; escala $1/\sqrt{d_\text{in}}$; Xavier e He citados, aprofundados na m3-05)
  5. **Exercício (código) · Inicializar uma rede** (`inicializar(dims, semente, escala)` → lista de `(W, b)`, com `rng = default_rng(semente)` e `W` sorteada em ordem, `b` zero; casos: formas, viés zero, desvio de cada `W` perto de `escala / sqrt(d_in)` com 5 erros padrão, mesma semente igual, outra semente diferente, `escala=0` deixa as colunas da camada escondida iguais)
  6. **Leitura · Ativações camada a camada** (tabela medida: com escala 0,01 as ativações colapsam para 0 em poucas camadas, com 1,0 explodem, com $\sqrt{2/d_\text{in}}$ ficam estáveis)
  7. **Exercício (código) · Estatísticas e perda** (`estatisticas_de_ativacao(params, X)` → lista de `(media, desvio, fracao_zeros)` por camada escondida, `float`s; `entropia_cruzada(logits, y)` com a softmax estável da m3-06 do Nível 5)
  8. **Quiz · Formas e escala**
- **Muda do roteiro:** os `call` com `params` viram `expr`; `inicializar` compara estatísticas e não valores (duas soluções podem sortear em outra ordem; regra 6).
- **Erradas típicas:** `W` com forma transposta; viés `(d_out, 1)`; ReLU na última camada; ativação esquecida entre camadas; inicialização com zeros; desvio `1/d_in` em vez de `1/sqrt(d_in)`; `fracao_zeros` contando a camada de saída.

## Módulo 2 · Autograd do zero (micrograd)

A classe `Valor` em Python puro, no espírito do micrograd, com os métodos especiais do Nível 2 e a DFS do Nível 3. `bibliotecas: [numpy]` (o numpy só aparece na comparação numérica), perfil `dados`. Classes verificadas pela regra 4.

### n6-m2-01-grafo-computacional-e-derivadas-locais · Grafo computacional e derivadas locais
- **Arquivo:** `02-autograd-do-zero/01-grafo-computacional-e-derivadas-locais.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Toda conta é um grafo** (Mermaid do grafo de $L = (a b + c) f$; derivadas locais de `+`, `*` e `tanh` em KaTeX; forward, backward e `grad`)
  2. **Previsão · Os números do grafo** (com $a = 2, b = -3, c = 10, f = -2$: valores para frente e gradientes para trás, impressos)
  3. **Exercício (ordenar, 3 distratores) · Retropropagação à mão** (`backprop_manual(a, b, c, f)` → `(L, dL_da, dL_db, dL_dc, dL_df)`; distratores: somar no lugar de multiplicar pelo gradiente de cima, operando trocado)
  4. **Leitura · Uma variável em dois lugares** (KaTeX da regra da cadeia com dois caminhos; $y = x \cdot x + 3x$; as contribuições se somam)
  5. **Exercício (código) · Derivadas locais e caminhos** (`derivadas_locais(op, a, b)` → `(d_da, d_db)` para `"+"`, `"*"`, `"-"`, `"/"`, `ValueError` para outra; `gradiente_dois_caminhos(x)` para $y = x^2 + 3x$)
  6. **Leitura · Conferir com diferenças finitas** (a derivada central do Nível 5 aplicada a um grafo; erro relativo)
  7. **Exercício (código) · Verificador numérico** (`verificar_numericamente(f, ponto, grad, h=1e-6, tol=1e-6)` → `bool`, com `f` recebendo uma lista de números; `expr`)
  8. **Quiz · Acumulação**
- **Erradas típicas:** sobrescrever o gradiente em vez de somar (dois caminhos); esquecer de multiplicar pelo gradiente de cima; derivada do produto com o operando errado; `"/"` com o sinal de `d_db` trocado; verificador com erro absoluto.

### n6-m2-02-a-classe-valor · A classe Valor: dados, gradiente e operações
- **Arquivo:** `02-autograd-do-zero/02-a-classe-valor.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Um número que lembra de onde veio** (`Valor(dado)` com `dado`, `grad = 0.0`, `_anteriores` (conjunto), `_op` e `_backward`; o nó de saída criado por `__add__`; o `_backward` como closure que soma nos filhos)
  2. **Previsão · O que o grafo guarda** (`v = a * b + 1`: `v.dado`, `v._op`, os `dado` dos anteriores ordenados, `a.grad` ainda 0.0)
  3. **Exercício (lacunas) · `__add__` e `__mul__`** (com conversão de números para `Valor` e `_backward` com `+=`)
  4. **Leitura · Números dos dois lados** (`__radd__`, `__rmul__`, `__neg__`, `__sub__`, `__repr__`; a mensagem real de `2 * v` sem `__rmul__`; `v + v` com `_anteriores = {v}` e o `_backward` somando duas vezes)
  5. **Exercício (código) · Completar a aritmética** (`__radd__`, `__rmul__`, `__neg__`, `__sub__`, `__rsub__` e `__repr__` no formato `Valor(dado=3.0, grad=0.0)`; casos com expressões mistas e `sum([...])`)
  6. **Leitura · Visitando o grafo** (`rastrear(raiz)` → nós e arestas com um conjunto de visitados, a DFS do Nível 3)
  7. **Exercício (código) · Rastrear o grafo** (`rastrear(raiz)` → `(nos, arestas)`; casos contam nós e arestas e listam os `_op` ordenados; `v * v` conta um nó só)
  8. **Quiz · Métodos especiais**
- **Verificação:** os casos chamam `_backward()` depois de pôr `saida.grad = 1.0` (o enunciado define os dois nomes, regra 4) e devolvem `[a.grad, b.grad]`.
- **Muda do roteiro:** "`grad` compartilhado entre instâncias (atributo de classe)" não é defeito com `float` (o `+=` cria o atributo na instância); a errada real é `_anteriores = []` **lista** como atributo de classe, compartilhada por todos os nós.
- **Erradas típicas:** `_backward` com `=` em vez de `+=` (falha em `v * v`); `__rmul__` esquecido; `_anteriores` lista de classe; derivada do produto com o próprio operando; número não convertido em `Valor` (`AttributeError: 'int' object has no attribute 'dado'`); `__sub__` como `self + other`.

### n6-m2-03-backward-e-ordenacao-topologica · backward e ordenação topológica
- **Arquivo:** `02-autograd-do-zero/03-backward-e-ordenacao-topologica.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · A ordem importa** (um nó só propaga depois de receber tudo; Mermaid de um grafo com dois caminhos de tamanhos diferentes; DFS pós-ordem)
  2. **Previsão · Uma ordem topológica** (grafo de 5 nós com `dado`s distintos; imprime os `dado`s na ordem da DFS)
  3. **Exercício (lacunas) · `ordem_topologica(raiz)`** (DFS recursiva com visitados)
  4. **Leitura · O backward completo** (`grad = 1.0` na saída e `_backward` na ordem inversa; Visualizar: a pilha da DFS num grafo de 4 nós)
  5. **Exercício (código) · `Valor.backward()`** (um caso por expressão, cada um comparando os `grad` com a diferença central calculada no `setup`; variável repetida; cadeia de 300 nós)
  6. **Leitura · Acúmulo e limites** (dois `backward` seguidos somam; `zero_grad`; a mensagem real do `RecursionError` com 2 000 nós; a versão iterativa)
  7. **Exercício (código) · Zerar e iterar** (`zerar_gradientes(raiz)`; `ordem_topologica_iterativa(raiz)` com pilha explícita, que funciona numa cadeia de 2 000 nós)
  8. **Quiz · A ordem do backward**
- **Erradas típicas:** `_backward` na ordem direta; BFS a partir da saída (erra quando um nó é alcançado por caminhos de tamanhos diferentes); `grad` da saída em 0; sem conjunto de visitados (nó compartilhado propagado duas vezes); `zerar_gradientes` só nas folhas.

### n6-m2-04-mais-operacoes-e-gradientes · Mais operações: tanh, exp, pow, divisão e relu
- **Arquivo:** `02-autograd-do-zero/04-mais-operacoes-e-gradientes.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Mais derivadas locais** (KaTeX: $\tanh' = 1 - t^2$, $\exp' = \exp$, $(x^k)' = k x^{k-1}$, ReLU, $\log' = 1/x$; reaproveitar a saída no `_backward`)
  2. **Previsão · tanh atômica e tanh composta** (os dois `grad` impressos com `round(..., 6)`, iguais)
  3. **Exercício (lacunas) · `tanh`, `exp`, `__pow__` e `relu`** (expoente só número, `TypeError` com `Valor`, dito no enunciado)
  4. **Leitura · Divisão, log e a perda logística** (`a / b` como `a * b**-1`; `math.log(0.0)` dá `ValueError: expected a positive input, got 0.0`; perda logística em escalares)
  5. **Exercício (código) · Divisão e log** (`__truediv__`, `__rtruediv__`, `log`; `perda_logistica_valor(z, y)`; gradientes conferidos numericamente no `setup`)
  6. **Leitura · Grafo mais longo, mesma matemática** (tanh composta de `exp` dá o mesmo gradiente com mais nós; custo em nós)
  7. **Exercício (código) · Funções compostas** (`tanh_composta(x)` e `sigmoide_composta(x)` só com `exp`, `+`, `*`, `/`; casos: mesmo `dado` e `grad` das atômicas, número de nós)
  8. **Quiz · Derivadas locais**
- **Muda do roteiro:** "derivada de `exp` recalculada em vez de reaproveitar a saída" dá o mesmo número e não é errada (nenhum caso separa as duas); vira observação na leitura 1.
- **Erradas típicas:** `pow` com $k x^k$; `relu` propagando onde a saída é 0; `log` sem conferir o domínio; `__rtruediv__` com a ordem trocada; tanh composta com sinal trocado em $e^{-2x}$.

### n6-m2-05-neuronio-camada-e-mlp-com-valor · Neurônio, camada e MLP com Valor
- **Arquivo:** `02-autograd-do-zero/05-neuronio-camada-e-mlp-com-valor.lvl.md` · 140 XP · 60 min
- **Passos (8):**
  1. **Leitura · Do neurônio ao MLP** (`Neuronio(n_entradas, rng)` com pesos de `rng.uniform(-1, 1)` e viés 0, tanh; `Camada`; `MLP(3, [4, 4, 1], semente)`; `parametros()` achatado; ordem de sorteio dita no enunciado: neurônio por neurônio, pesos em ordem, com `random.Random(semente)`)
  2. **Previsão · Quantos parâmetros** (contagens para três arquiteturas, inclusive `[3, 4, 4, 1]` = 41)
  3. **Exercício (lacunas) · As três classes** (`Neuronio`, `Camada`, `MLP` com `__call__` e `parametros()`)
  4. **Leitura · O laço de treino** (Mermaid: forward → perda → zerar → backward → atualizar; os 4 exemplos escritos à mão; números medidos: 100 passos em 78 ms, perda 0,007)
  5. **Exercício (código) · Treinar com Valor** (`treinar(mlp, X, y, taxa, passos)` → histórico de `float`s; com `random.Random(0)` tudo é determinístico em Python puro, então a perda depois de 20 passos é literal, a `1e-9`; perda final < 0,05 em 100 passos)
  6. **Leitura · Diagnóstico** (taxa alta oscila; gradientes acumulados divergem; `parametros()` que devolve cópias não treina; o custo em objetos que motiva o m4)
  7. **Exercício (código) · Diagnosticar e prever** (`diagnosticar(historico)` → `"diverge"`, `"oscila"`, `"lento"` ou `"ok"`, com as regras do enunciado; `prever(mlp, X)` → lista de `float`s)
  8. **Quiz · Zerar e taxa**
- **Muda do roteiro:** a inicialização usa `random.Random(semente)` passado ao construtor (e não `random.uniform` global), para a perda ser literal; `len(mlp.parametros()) == 41` é caso, como o roteiro pedia.
- **Erradas típicas:** sem zerar os gradientes (a perda sobe depois de alguns passos); atualizar com `+`; `parametros()` com `Valor(p.dado)` (cópias); viés esquecido em `parametros()` (40 no lugar de 41); `diagnosticar` olhando só o último valor. (A tanh também na saída é o que o enunciado pede, como no micrograd, com alvos ±1: não é errada.)

## Módulo 3 · Treinando redes

Perdas, laço de treino, mini-lotes, otimizadores, inicialização e normalização. `bibliotecas: [numpy]`, perfil `dados`. O backward vetorizado só chega no m4-01: por isso os exercícios deste módulo treinam a **regressão softmax** (cujo gradiente o aluno conhece do Nível 5) ou usam `rede.py`, um MLP de duas camadas com `forward`/`backward` prontos que a m3-02 apresenta como "caixa fechada" e a m4-01 abre.

### n6-m3-01-perdas-e-softmax · Funções de perda, softmax e entropia cruzada
- **Arquivo:** `03-treinando-redes/01-perdas-e-softmax.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Uma perda para cada tarefa** (KaTeX: MSE, entropia cruzada binária e categórica; o que cada uma mede)
  2. **Previsão · O log da softmax** (`np.log(softmax(...))` com logits 1000 dá `-inf`; `log_softmax` estável dá o número certo)
  3. **Exercício (lacunas) · `softmax` e `log_softmax` estáveis** (por linha; `log_softmax` por $z - \max - \log\sum e^{z - \max}$)
  4. **Leitura · Rótulos inteiros e o gradiente $P - Y$** (indexação `P[np.arange(n), y]`; divisão por $n$; perda de chute $\ln k$, a sanidade do CS231n)
  5. **Exercício (código) · Entropia cruzada e gradiente** (`entropia_cruzada(Z, y)` → `float`; `grad_entropia_cruzada(Z, y)` conferido pela regra 1 no `setup`; `perda_de_chute(k)` por `call`)
  6. **Leitura · Pesos por classe** (normalização pela soma dos pesos dos exemplos; quando usar)
  7. **Exercício (código) · Entropia cruzada ponderada** (`entropia_ponderada(Z, y, pesos)` e o gradiente; caso com pesos iguais = a comum)
  8. **Quiz · Perda inicial e escolha**
- **Erradas típicas:** `log(softmax)` (`-inf` com logits grandes); sem dividir por $n$; gradiente sem subtrair 1 na classe certa; one-hot com `k` errado; rótulo `float` (o `IndexError` real); ponderada dividindo por $n$ e não pela soma dos pesos.

### n6-m3-02-loop-de-treino-e-gradiente-descendente · O loop de treino
- **Arquivo:** `03-treinando-redes/02-loop-de-treino-e-gradiente-descendente.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · O laço como contrato** (Mermaid do laço; funções puras `perda_e_grads(params, X, y)` e `passo(params, grads, taxa)`; `rede.py` apresentado: a interface, não o interior)
  2. **Previsão · Três épocas à mão** (descida em lote cheio num modelo de um parâmetro escrito à mão; imprime as perdas arredondadas)
  3. **Exercício (ordenar, 2 distratores) · Uma época** (as linhas forward, perda, backward, atualização e registro; distratores: atualizar com `+`, registrar antes de calcular)
  4. **Leitura · Testes de sanidade** (perda inicial perto de $\ln k$; decorar 10 exemplos até perda ~0; a checagem de gradiente fica para a m4-01)
  5. **Exercício (código) · O laço com histórico** (`loop_de_treino(perda_e_grads, params, treino, validacao, epocas, taxa)` → `{"treino": [...], "validacao": [...]}`, com a função injetada pela regra 5; `sobreajustar(perda_e_grads, params, X, y, passos, taxa)` → perda final; casos com a regressão softmax e com `rede.py`)
  6. **Leitura · Guardar o melhor estado** (cópia por referência contra cópia de verdade; `[(W.copy(), b.copy()) for W, b in params]`)
  7. **Exercício (código) · Melhor estado** (`copiar_params(params)` independente do original; `melhor_estado(historico_val, estados)` → índice e cópia, desempate pela época mais cedo)
  8. **Quiz · Sanidade antes de treinar**
- **Muda do roteiro:** `checar_gradiente(forward, params, X, y)` sai daqui e vira o passo 7 da piloto (m4-01), onde o backward é do aluno; o laço recebe uma função `perda_e_grads` (regra 5), não `forward` e `backward` separados; "dropout/batchnorm em modo de treino" vira pergunta de quiz da m4-03.
- **Erradas típicas:** perda de validação calculada com os dados de treino; registrar a perda do último lote como a da época; `copiar_params` com `list(params)` (cópia rasa: os arrays são os mesmos); `melhor_estado` pelo maior valor; atualizar a validação com gradiente.

### n6-m3-03-mini-batches-e-sgd · Mini-batches e SGD
- **Arquivo:** `03-treinando-redes/03-mini-batches-e-sgd.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Lote cheio, um exemplo, mini-lote** (época e passo; o laço do Nível 5, m2-02, revisitado)
  2. **Previsão · Os lotes de uma época** (com `n = 10` e lote 4: tamanhos `[4, 4, 2]` e a união ordenada dos índices; a ordem sorteada não é impressa)
  3. **Exercício (lacunas) · Gerador de lotes** (`gerar_lotes(n, tamanho, rng, descartar_ultimo=False)` com `rng.permutation(n)` uma vez por chamada e `yield` de cada fatia)
  4. **Leitura · Ruído e tamanho do lote** (KaTeX: variância do gradiente médio $\propto 1/B$; regra prática de escalar a taxa com o lote; custo por época igual)
  5. **Exercício (código) · Treinar com lotes** (`treinar_com_lotes(perda_e_grads, params, X, y, tamanho_lote, epocas, taxa, semente)` → histórico por passo; `X` e `y` embaralhados juntos; número de passos por época)
  6. **Leitura · Curvas ruidosas** (média móvel; média por época)
  7. **Exercício (código) · Suavizar e resumir** (`suavizar(historico, janela)` → média móvel só das janelas completas; `media_por_epoca(historico, passos_por_epoca)`)
  8. **Quiz · Época e passo**
- **Muda do roteiro:** `comparar_tamanhos_de_lote` com "tolerância ampla" sai (resultado de sorteio, regra 6): a comparação vai para a leitura com números medidos.
- **Erradas típicas:** não embaralhar; embaralhar `X` e `y` com permutações diferentes; perder o último lote menor; `descartar_ultimo` invertido; soma no lugar da média do lote; `suavizar` com janelas incompletas no começo.

### n6-m3-04-otimizadores · Otimizadores: momentum, RMSProp e Adam
- **Arquivo:** `03-treinando-redes/04-otimizadores.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Por que o SGD oscila** (vale alongado $f(x, y) = x^2/2 + 10 y^2$; KaTeX do momentum; Visualizar: momentum em 1D em Python puro)
  2. **Previsão · Dois passos de momentum** (números à mão)
  3. **Exercício (lacunas) · `SGD` e `Momentum`** (classes com `passo(params, grads)` que atualiza os arrays no lugar; o estado do momentum por posição da lista)
  4. **Leitura · RMSProp e Adam** (KaTeX com correção de viés; $t$ começa em 1; tabela dos primeiros passos; $\beta_1 = 0{,}9$, $\beta_2 = 0{,}999$, $\varepsilon = 10^{-8}$)
  5. **Exercício (código) · `Adam`** (casos da regra 4: três passos literais, dois parâmetros com gradientes diferentes, duas instâncias independentes, `t` correto)
  6. **Leitura · L2 contra weight decay desacoplado** (AdamW; por que são diferentes no Adam e iguais no SGD)
  7. **Exercício (código) · `AdamW` e comparação** (`AdamW(taxa, decaimento)`; `comparar_otimizadores(grad, x0, otimizadores, passos)` → distância final de cada um ao mínimo, com os otimizadores injetados)
  8. **Quiz · β e ε**
- **Muda do roteiro:** `correcao_de_vies(m, v, t, b1, b2)` vira caso do `Adam` (três passos literais); `treinar_mlp_com(otimizador)` "em menos épocas" sai (comparação de sorteio): o vale alongado fica como comparação determinística.
- **Erradas típicas:** um `m` só para todos os parâmetros; `ε` esquecido (divisão por zero com gradiente nulo); correção de viés com `t` começando em 0; momentum somando o gradiente sem o fator $(1 - \beta)$ quando o enunciado pede a média móvel; weight decay dentro do momento quando se pede AdamW; atualizar uma cópia (`W = W - ...` dentro do `passo` não muda o array de fora).

### n6-m3-05-inicializacao-taxa-e-normalizacao · Inicialização, taxa de aprendizado e normalização
- **Arquivo:** `03-treinando-redes/05-inicializacao-taxa-e-normalizacao.lvl.md` · 140 XP · 60 min
- **Passos (8):**
  1. **Leitura · A variância atravessando 10 camadas** (KaTeX: Xavier $\sqrt{1/d_\text{in}}$ para tanh e He $\sqrt{2/d_\text{in}}$ para ReLU)
  2. **Previsão · Desvio das ativações em 10 camadas** (três escalas; desvios da última camada arredondados)
  3. **Exercício (lacunas) · Xavier e He** (`inicializar(dims, semente, tipo)`; casos por estatística, regra 6)
  4. **Leitura · Agendar a taxa** (KaTeX: degraus, cosseno e aquecimento linear)
  5. **Exercício (código) · `agendar_taxa(tipo, passo, total, base, aquecimento=0)`** (`call` com números)
  6. **Leitura · BatchNorm e LayerNorm** (KaTeX das duas; médias móveis e o modo de avaliação; eixo do lote contra eixo dos atributos; o backward da BatchNorm em fórmula, sem exercício)
  7. **Exercício (código) · Normalizar** (`batchnorm_forward(X, gamma, beta, estado, treino, momento=0.9, eps=1e-5)` atualizando `estado["media"]`/`estado["var"]` no treino e usando-os na avaliação; `layernorm_forward(X, gamma, beta, eps=1e-5)`)
  8. **Quiz · Treino contra avaliação**
- **Muda do roteiro:** `batchnorm_backward` e `layernorm_backward` saem: o aluno ainda não fez um backward vetorizado (só no m4-01), e a lição já tinha cinco assuntos em 60 min. O backward da LayerNorm vai para a m7-04, onde ela é usada; o da BatchNorm fica como fórmula na leitura 6.
- **Erradas típicas:** He com `1/d_in`; BatchNorm de avaliação usando o lote; média móvel atualizada na avaliação; variância com `ddof=1`; LayerNorm no eixo do lote; `eps` fora da raiz; cosseno sem chegar a 0 no último passo; aquecimento começando em `base`.

## Módulo 4 · MLP vetorizado em numpy

Backprop com matrizes, um classificador de dígitos gerados, regularização e diagnóstico. `bibliotecas: [numpy, scikit-learn]` no frontmatter de hoje (perfil `ml`, sem uso do scikit-learn; ver "Decisões para o Filipe", 1). `camadas.py` e `mlp.py` nascem na piloto e são reaproveitados no módulo.

### n6-m4-01-backprop-vetorizado · Backprop vetorizado com matrizes (piloto: escrita e verificada)
- **Arquivo:** `04-mlp-em-numpy/01-backprop-vetorizado.lvl.md` · 140 XP · 60 min · `publicada: true`
- **Passos (8):**
  1. **Leitura · Da regra da cadeia às matrizes** (o custo do `Valor` medido: ~47 mil objetos e 68 ms contra 0,06 ms; KaTeX de $\partial L/\partial W$, $\partial L/\partial b$, $\partial L/\partial X$; a regra das formas; a mensagem real de `X @ dZ`; o perigo da $W$ quadrada; o backward da ReLU e a convenção em 0)
  2. **Previsão · As formas do backward** (`X.T @ dZ` com `dZ = np.eye(3)`, `dZ.sum(axis=0)`, `(dZ @ W.T).shape` e o `ValueError` de `X @ dZ`)
  3. **Exercício (lacunas) · O backward da camada densa e da ReLU** (`densa_backward(dZ, cache)` → `(dX, dW, db)` com o cache `(X, W)`; `relu_backward(dA, cache)` com o cache `Z`)
  4. **Leitura · O MLP inteiro: o forward guarda, o backward volta** (Mermaid do forward e do backward com caches; a última camada sem ReLU; `softmax_entropia` já divide por $n$ e o erro de dividir de novo; o backward de duas camadas escrito por extenso; a ReLU desfeita antes da densa; a lista invertida; caches como contrato)
  5. **Exercício (código) · Forward e backward de um MLP de L camadas** (`mlp_forward(params, X)` → `(saida, caches)`; `mlp_backward(dsaida, caches)` → `[(dW, db), ...]`; `perda_e_gradientes(params, X, y)`; `camadas.py` pronto)
  6. **Leitura · Conferir o gradiente com diferenças finitas** (KaTeX da diferença central e do erro relativo com piso; a técnica de perturbar no próprio array com `f` sem argumentos; tabela medida de erros por $h$, `float32` e defeitos; o custo de 5 556 forwards)
  7. **Exercício (código) · A checagem numérica do MLP** (`gradiente_numerico(f, params, h=1e-5)`, `erro_relativo(a, n)`, `checar_gradientes(perda_e_grads, params, X, y, h=1e-5)` com a função injetada; `camadas.py` e `mlp.py` prontos)
  8. **Quiz · Backward na prática** (a correção de `X @ dZ` pela mensagem real; `[(0.714, 0.714), ...]` com 6 exemplos; erro só na primeira camada)
- **Muda do roteiro:**
  - `comparar_velocidade()` (caso por tempo) sai: os números medidos (68 ms contra 0,06 ms) estão na leitura 1;
  - `grad_check_mlp(params, X, y)` vira `checar_gradientes(perda_e_grads, params, X, y)` com a função **injetada** (regra 5), para os casos plantarem defeitos;
  - "cache guardando a saída pós-ativação" não é defeito com ReLU (`A > 0` é o mesmo que `Z > 0`) e não virou errada; o defeito de cache que existe é desfazer a ReLU depois da densa;
  - `mlp_forward`/`mlp_backward` "para `[64, 32, 16, 10]`" valem para qualquer profundidade (casos com 1, 2, 3 e 4 camadas);
  - o frontmatter manteve `scikit-learn` (pedido), sem uso.
- **Resultado:** 10, 10 e 12 casos (todos `expr`); 7, 7 e 7 soluções erradas, cada uma reprovando pelo motivo pretendido (lista no relatório `.claude-transfer/auditoria/n6-plano-e-piloto.md`). Lote da solução com o worker `dados` quente: 50 ms, 65–76 ms e 80 ms; no perfil `ml`, ~9,7 s por lote (boot). `content:verify --licao`: os 3 passos OK (21/21 erradas reprovadas, todos `strong`) e a Previsão OK, em 3 min 26 s. Leituras de 344, 288 e 345 palavras.

### n6-m4-02-classificador-de-digitos · Um classificador de dígitos em numpy
- **Arquivo:** `04-mlp-em-numpy/02-classificador-de-digitos.lvl.md` · 140 XP · 60 min
- **Dados:** `digitos.py` (regra 8). Treino com `gerar_digitos(100, 1)`, validação com `gerar_digitos(30, 2)`.
- **Passos (8):**
  1. **Leitura · Dígitos 8 × 8 gerados** (o gerador: desenhos em texto, deslocamento, ruído; por que não `load_digits`; normalização com as estatísticas do treino)
  2. **Previsão · Um dígito em texto** (imprime as 8 linhas de `desenhos()[3]` como `#` e `.`)
  3. **Exercício (lacunas) · Preparar os dados** (`preparar(X_treino, X_val)` → padronização com média e desvio do treino, desvio zero vira 1; `para_one_hot` não é preciso: rótulos inteiros)
  4. **Leitura · Treinar com Adam e mini-lotes** (`mlp.py` da piloto e um `adam.py` pronto; números medidos: 64 → 32 → 10, lote 32, taxa 0,01: 10 épocas em 55 ms com 0,91 de validação, 20 épocas em 0,10 s com 0,96)
  5. **Exercício (código) · Treinar nos dígitos** (`treinar_digitos(params, X, y, epocas, lote, taxa, semente)` → `(params, historico)`; casos: perda por época cai; 1 000 imagens e 10 épocas dão validação ≥ 0,85 (piso 5 pontos abaixo do medido); `params` recebido intacto)
  6. **Leitura · Matriz de confusão, erros e salvar** (reaproveita o Nível 5; `np.savez`/`np.load` funcionam no executor)
  7. **Exercício (código) · Avaliar e salvar** (`matriz_de_confusao(prever, X, y, k)` com `prever` injetado; `exemplos_errados(prever, X, y, n)` → índices; `salvar(params, caminho)` e `carregar(caminho)` com ida e volta exata)
  8. **Quiz · Normalização e taxa**
- **Muda do roteiro:** `load_digits` sai (não importa no executor, e o roteiro do N5 já trocou os dígitos por padrões gerados); a meta "acima de 95 %" fica para o "Executar" (20 épocas, 0,96), e o caso usa 10 épocas com piso 0,85; "visualizar pesos da primeira camada como imagens" vira texto (os 64 pesos de um neurônio impressos como grade de sinais).
- **Erradas típicas:** não normalizar (a perda estagna); normalizar a validação com as estatísticas dela; rótulos `float` (o `IndexError` real); matriz de confusão com eixos trocados; `carregar` devolvendo os arrays fora de ordem (`np.savez(*params)` sem nomes estáveis); treinar alterando o `params` recebido.

### n6-m4-03-regularizacao-l2-dropout-e-parada-antecipada · Regularização: L2, dropout e parada antecipada
- **Arquivo:** `04-mlp-em-numpy/03-regularizacao-l2-dropout-e-parada-antecipada.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Uma rede grande em poucos dados** (64 → 128 → 10 em 100 dígitos: treino 1,0 e validação bem abaixo; números medidos na escrita)
  2. **Previsão · A escala do dropout invertido** (máscara fixa escrita à mão, `p = 0,5`: a saída e a média)
  3. **Exercício (lacunas) · Dropout invertido** (`dropout_forward(X, p, treino, rng)` → `(saida, mascara)`, escala $1/(1-p)$, identidade na avaliação; `dropout_backward(dout, mascara)`)
  4. **Leitura · L2 nos pesos, não nos vieses** (KaTeX: $L + \frac{\lambda}{2} \sum \lVert W \rVert^2$ e o termo $\lambda W$ no gradiente)
  5. **Exercício (código) · Penalidade L2** (`perda_com_l2(perda, params, lam)` e `grads_com_l2(grads, params, lam)`, sem mexer nos vieses; conferido pela regra 1)
  6. **Leitura · Parada antecipada e aumento de dados** (paciência; restaurar o melhor estado; deslocar dígitos 1 pixel)
  7. **Exercício (código) · Parar e aumentar** (`parada_antecipada(historico_val, paciencia)` → `(epoca_de_parada, melhor_epoca)`; `deslocar(X, dx, dy)` com preenchimento por zeros, nas imagens achatadas)
  8. **Quiz · Dropout na avaliação**
- **Muda do roteiro:** `experimento_regularizacao(config)` "reduzindo o gap" (resultado de sorteio) sai dos casos: o efeito vai para a leitura 1 com números medidos; `deslocar_imagens` preenche com zeros (o `np.roll` do gerador "dá a volta", o que o enunciado aponta).
- **Erradas típicas:** dropout ativo na avaliação; sem escalar; escalar na avaliação; máscara nova no backward; regularizar vieses; L2 sem o fator $\lambda$ no gradiente; parada sem restaurar o melhor estado; `deslocar` com `np.roll` (borda volta do outro lado); aumento aplicado à validação.

### n6-m4-04-diagnostico-de-treino · Diagnóstico de treino
- **Arquivo:** `04-mlp-em-numpy/04-diagnostico-de-treino.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Uma galeria de curvas** (taxa alta, taxa baixa, sobreajuste, defeito: descritas por números de históricos)
  2. **Previsão · A razão atualização/peso** (`norm(Δw) / norm(w)` para três taxas, com `.0e`)
  3. **Exercício (lacunas) · `diagnosticar_curva(treino, validacao)`** (regras do enunciado: `"diverge"`, `"taxa_baixa"`, `"sobreajuste"`, `"estagnada"`, `"ok"`)
  4. **Leitura · Normas de gradiente e clipping** (KaTeX da norma global; clipping por norma contra por valor; razão ~$10^{-3}$ como alvo do CS231n)
  5. **Exercício (código) · Medir e cortar** (`normas_de_gradiente(grads)` → lista por camada; `razao_atualizacao(params, atualizacoes)`; `clip_por_norma(grads, max_norma)` pela norma global, sem alterar a entrada)
  6. **Leitura · O checklist** (semente, perda inicial, decorar um lote, taxa, inicialização, embaralhamento, rótulos alinhados)
  7. **Exercício (código) · Auditar um treino** (`auditar(X, y, k, perda_inicial, historico)` → lista de problemas, na ordem do enunciado: rótulos fora de `0..k-1`, dados sem normalizar, perda inicial longe de $\ln k$, perda não finita; um caso por problema plantado)
  8. **Quiz · Um hiperparâmetro por vez**
- **Muda do roteiro:** `encontrar_bug(config_id)` com quatro treinos com defeito vira `auditar`, que examina os sinais de um treino sem rodá-lo (os defeitos do roteiro, "sem embaralhar" e "taxa 10", aparecem como históricos no `diagnosticar_curva`).
- **Erradas típicas:** clipping por valor; norma por camada no lugar da global; `clip_por_norma` alterando os gradientes recebidos; razão com a norma do gradiente em vez da atualização; diagnóstico pelo último valor; `auditar` com $\log_{10} k$.

## Módulo 5 · Redes convolucionais

Convolução, pooling, uma CNN pequena e as arquiteturas clássicas. Mesmo frontmatter do m4 (`numpy, scikit-learn`, sem uso). Dígitos de `digitos.py` com forma `(n, 1, 8, 8)`.

### n6-m5-01-convolucao-2d-do-zero · Convolução 2D do zero
- **Arquivo:** `05-redes-convolucionais/01-convolucao-2d-do-zero.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Um filtro que desliza** (correlação cruzada, que todo mundo chama de convolução; KaTeX da forma $\lfloor (n + 2p - k)/s \rfloor + 1$; Visualizar: a janela 3 × 3 deslizando numa imagem 4 × 4, em Python puro)
  2. **Previsão · Formas de saída** (quatro combinações de `n`, `k`, `p`, `s`)
  3. **Exercício (lacunas) · Convolução com laço** (`conv2d_laco(imagem, filtro, padding=0, stride=1)`)
  4. **Leitura · Filtros clássicos** (Sobel e média num dígito; a saída descrita por números)
  5. **Exercício (código) · Forma e Sobel** (`forma_de_saida(n, k, p, s)` por `call`; `aplicar_sobel(imagem)` → magnitude $\sqrt{g_x^2 + g_y^2}$ com padding 1)
  6. **Leitura · Do laço às matrizes** (im2col por fatias e `sliding_window_view`; vários canais e filtros; números medidos: 100 imagens × 8 filtros em 206 ms com laço e 0,5 ms vetorizada)
  7. **Exercício (código) · Convolução vetorizada** (`conv2d_rapida(X, F, b, padding)` para `(N, C, H, W)` e `(F, C, k, k)`, igual à referência de laço no `setup`, com `not_uses for` e `not_uses list_comprehension` restritos à função, regra 10)
  8. **Quiz · Padding e custo**
- **Muda do roteiro:** "`conv2d_rapida` igual à de laço (`call` + limite de tempo)" perde o limite de tempo (regra de fonte no lugar); im2col por fatias fica na leitura.
- **Erradas típicas:** inverter o filtro (convolução verdadeira); forma com arredondamento para cima; padding só de um lado; stride ignorado no índice; Sobel sem padding; colunas do im2col na ordem errada (`transpose` diferente do `reshape` dos filtros); laço escondido numa compreensão.

### n6-m5-02-camadas-conv-e-pooling-com-backward · Camadas conv e pooling com backward
- **Arquivo:** `05-redes-convolucionais/02-camadas-conv-e-pooling-com-backward.lvl.md` · 140 XP · 60 min
- **Passos (8):**
  1. **Leitura · A convolução vira uma densa** (com as colunas do im2col, `dW = colsᵀ @ dout` e `dcols = dout @ Wᵀ`, a piloto aplicada)
  2. **Previsão · Quantas janelas cobrem cada pixel** (matriz de contagens de um filtro 3 × 3 numa imagem 4 × 4)
  3. **Exercício (lacunas) · `dW` e `db` da convolução** (`conv_backward_pesos(dout, cache)`)
  4. **Leitura · `col2im` soma as sobreposições** (`np.add.at` contra a atribuição: os números da tabela de comportamentos)
  5. **Exercício (código) · `col2im` e `dX`** (`col2im(dcols, forma, k, p)`; o `dX` da convolução conferido pela regra 1 numa imagem 5 × 5 com 2 filtros)
  6. **Leitura · Max pooling, campo receptivo e parâmetros** (o gradiente vai só para o máximo; KaTeX do campo receptivo com stride; $k \cdot k \cdot c_\text{in} \cdot c_\text{out} + c_\text{out}$)
  7. **Exercício (código) · Pooling e contas** (`maxpool_forward(X)` 2 × 2 → `(saida, cache)`, `maxpool_backward(dout, cache)`; `campo_receptivo(camadas)` e `contar_parametros(camadas)` por `call` com listas de dicionários)
  8. **Quiz · Roteamento do gradiente**
- **Muda do roteiro:** o `conv_backward` completo foi dividido em pesos (lacunas) e entrada (`col2im`), para cada passo ter um defeito por errada.
- **Erradas típicas:** `col2im` sobrescrevendo; pooling distribuindo o gradiente para os quatro; empate no máximo mandando para todos os empatados (o enunciado manda o primeiro); viés por filtro esquecido; campo receptivo sem o stride; parâmetros sem o viés.

### n6-m5-03-cnn-para-digitos-em-numpy · Uma CNN pequena para dígitos em numpy
- **Arquivo:** `05-redes-convolucionais/03-cnn-para-digitos-em-numpy.lvl.md` · 140 XP · 60 min
- **Passos (8):**
  1. **Leitura · A arquitetura mínima** (Mermaid: conv 8 filtros 3 × 3 → ReLU → pool 2 × 2 → achatar → densa 128 → 10; parâmetros: 80 + 1 290 = 1 370, contra 2 410 do MLP 64 → 32 → 10)
  2. **Previsão · Contar parâmetros** (três variações da arquitetura)
  3. **Exercício (lacunas) · Montar a CNN** (`montar_cnn(semente)` → dicionário de parâmetros com formas fixadas e He)
  4. **Leitura · Encadear forward e backward** (`camadas_cnn.py` pronto com as camadas da m5-02; achatar na ordem `(N, F, H, W)` e voltar com a mesma forma)
  5. **Exercício (código) · Forward e backward da CNN** (`cnn_perda_e_gradientes(params, X, y)`: referência no `setup` e checagem numérica numa CNN de 2 filtros em imagens 4 × 4, regra 1)
  6. **Leitura · Treinar e comparar com o MLP** (números medidos: 10 épocas em 0,22 s, validação 0,96; robustez a deslocamento medida para os dois)
  7. **Exercício (código) · Treinar e testar deslocamentos** (`treinar_cnn(params, X, y, epocas, lote, taxa, semente)` com 300 dígitos e 3 épocas, acurácia de treino ≥ piso medido − 5 pontos; `robustez(prever, X, y, deslocamentos)` com `prever` injetado)
  8. **Quiz · Parâmetros e invariância**
- **Muda do roteiro:** "≥ 0,96 com limite de tempo" vira piso nos casos (300 dígitos, 3 épocas, ~70 ms) e meta no "Executar" (10 épocas); o PyTorch opcional fica em texto.
- **Erradas típicas:** achatar numa ordem e desachatar em outra; esquecer a ReLU antes do pool; comparar CNN e MLP com divisões diferentes; gradiente do pool pelo valor e não pela posição.

### n6-m5-04-arquiteturas-classicas · Arquiteturas clássicas: de LeNet a ResNet
- **Arquivo:** `05-redes-convolucionais/04-arquiteturas-classicas.lvl.md` · 90 XP · 35 min
- **Passos (8):**
  1. **Leitura · De LeNet a VGG** (linha do tempo como história, sem números de competições; dois 3 × 3 enxergam 5 × 5 com menos parâmetros, em KaTeX)
  2. **Previsão · 3 × 3 + 3 × 3 contra 5 × 5** (parâmetros e campo receptivo)
  3. **Exercício (lacunas) · Contar uma pilha VGG** (`parametros_vgg(canais, k=3)` por `call`)
  4. **Leitura · ResNet: $y = F(x) + x$** (o gradiente da identidade é 1; KaTeX; Inception em um parágrafo)
  5. **Exercício (código) · O caminho da identidade** (`bloco_residual(x, F)` com `F` injetada; `norma_atraves(L, ganho, residual)` → norma do gradiente depois de `L` blocos lineares com e sem residual)
  6. **Leitura · Transfer learning e transformers de visão** (congelar, ajustar a cabeça, ajustar tudo; normalização da rede base; ViT em um parágrafo; por que o curso treina em 8 × 8)
  7. **Exercício (código) · Estratégia de transfer** (`estrategia(n_exemplos, similaridade)` por `call`, com a tabela do enunciado)
  8. **Quiz · Profundidade e residual** (3 perguntas, não 5)
- **Muda do roteiro:** "quiz de 5 perguntas" vira 3 (régua).
- **Erradas típicas:** residual somando `F(x)` duas vezes; norma sem o residual multiplicando o ganho; parâmetros sem viés; estratégia com as faixas invertidas.

## Módulo 6 · Sequências, embeddings e RNN

Texto como sequência de caracteres, no espírito do makemore. `bibliotecas: [numpy]`, perfil `dados`. Dados: `nomes.txt` (regra 8), ~1 000 nomes inventados; o token `.` marca início e fim.

### n6-m6-01-representando-texto-one-hot-e-embeddings · Representando texto: one-hot e embeddings
- **Arquivo:** `06-sequencias-embeddings-e-rnn/01-representando-texto-one-hot-e-embeddings.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Texto vira número** (`stoi`/`itos`; o `.` como token especial; por que o vocabulário vem só do treino)
  2. **Previsão · One-hot vezes W é indexar** (`one_hot @ W` e `W[idx]` dão o mesmo, impressos)
  3. **Exercício (lacunas) · Vocabulário e codificação** (`construir_vocabulario(textos)` → `(stoi, itos)` com `.` no índice 0 e os caracteres ordenados; `codificar`, `decodificar`)
  4. **Leitura · A tabela de embeddings** (forward por indexação; backward com `np.add.at`; os números `[2, 1, 0]` contra `[1, 1, 0]`)
  5. **Exercício (código) · Forward e backward do embedding** (`embedding_forward(E, indices)` para índices de qualquer forma; `embedding_backward(dout, indices, V)` → `dE`; conferido pela regra 1)
  6. **Leitura · Similaridade** (cosseno; vizinhos; o que muda depois do treino)
  7. **Exercício (código) · Vizinhos mais próximos** (`vizinhos(E, idx, k)` pelo cosseno, sem o próprio índice, desempate pelo menor índice; linha nula tratada)
  8. **Quiz · Esparsidade e índices repetidos**
- **Muda do roteiro:** "corpus de nomes brasileiros (fornecido)" vira nomes inventados por um gerador (regra 8).
- **Erradas típicas:** `dE[idx] += dout` (repetidos não acumulam); vocabulário sem o `.`; vocabulário construído com o teste; `itos` desalinhado; vizinhos pela distância euclidiana sem normalizar; incluir o próprio índice.

### n6-m6-02-modelo-de-bigramas · Modelo de linguagem por bigramas (makemore)
- **Arquivo:** `06-sequencias-embeddings-e-rnn/02-modelo-de-bigramas.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Contar pares** (matriz $V \times V$; `.` no começo e no fim de cada nome; KaTeX de $P(b \mid a)$)
  2. **Previsão · Os bigramas de dois nomes** (contagens de `["ana", "ada"]` impressas como pares)
  3. **Exercício (lacunas) · `contar_bigramas(nomes, stoi)`** (com `np.add.at`)
  4. **Leitura · Probabilidades, NLL e perplexidade** (KaTeX; suavização; log de zero sem suavização)
  5. **Exercício (código) · Normalizar, avaliar e amostrar** (`probabilidades(C, suavizacao)`; `nll_media(P, nomes, stoi)`; `amostrar(P, itos, rng, n)` com um `rng.choice(V, p=P[i])` por caractere, na ordem do enunciado, até o `.`)
  6. **Leitura · O bigrama como rede** (one-hot → `W` → softmax; o mínimo da NLL são as contagens; regularização de `W` como suavização)
  7. **Exercício (código) · Bigrama por gradiente** (`treinar_bigrama(X, Y, V, passos, taxa, W0)` → `(W, historico)` com `W0` recebido; NLL depois de 100 passos perto da NLL das contagens, tolerância medida)
  8. **Quiz · Perplexidade**
- **Erradas típicas:** esquecer o `.` final (nomes sem fim); normalizar pelas colunas; NLL com `log(0)` (`inf`); amostrar com `argmax` (sempre o mesmo nome); um `rng.choice` para o nome todo; perplexidade com `10 **` no lugar de `exp`.

### n6-m6-03-mlp-de-linguagem-com-embeddings · MLP de linguagem com embeddings (Bengio 2003)
- **Arquivo:** `06-sequencias-embeddings-e-rnn/03-mlp-de-linguagem-com-embeddings.lvl.md` · 140 XP · 60 min
- **Passos (8):**
  1. **Leitura · Um contexto de k caracteres** (a ideia de Bengio et al., 2003, como história; Mermaid: contexto → embeddings → concatenar → tanh → logits)
  2. **Previsão · Os exemplos de um nome** (`montar_dados(["ana"], 3, stoi)` impresso como contextos e alvos)
  3. **Exercício (lacunas) · `montar_dados(nomes, bloco, stoi)`** (`X` `(n, bloco)`, `Y` `(n,)`, preenchimento com `.`)
  4. **Leitura · Concatenar embeddings** (`C[X]` tem forma `(n, bloco, d)`; `reshape(n, bloco * d)`; logits pequenos na inicialização para começar em $\ln V$)
  5. **Exercício (código) · Forward e backward do MLP de linguagem** (`perda_e_gradientes_lm(params, X, Y)`, com o backward do embedding da m6-01 e as camadas da piloto; regra 1 numa rede minúscula)
  6. **Leitura · Treino, divisão e a busca da taxa** (treino/validação/teste por nome; varredura exponencial da taxa descrita com números medidos)
  7. **Exercício (código) · Treinar e amostrar** (`treinar_lm(params, X, Y, passos, lote, taxa, semente)` com ≤ 60 passos por caso e NLL de treino abaixo de $\ln V$ − margem medida; `amostrar_lm(params, itos, bloco, rng, n)`)
  8. **Quiz · Contexto fixo**
- **Muda do roteiro:** "NLL de validação < 2,3 com limite de tempo" vira margem medida em poucos passos (regra 6) e meta no "Executar"; `varrer_taxa` sai dos casos (sorteio) e vai para a leitura.
- **Erradas típicas:** reshape na ordem errada (`C[X].transpose(...)`); logits grandes na inicialização (perda inicial muito acima de $\ln V$); avaliar no treino; contexto sem o `.` inicial; backward do embedding com indexação direta.

### n6-m6-04-rnn-do-zero · RNN do zero e backprop no tempo
- **Arquivo:** `06-sequencias-embeddings-e-rnn/04-rnn-do-zero.lvl.md` · 140 XP · 60 min
- **Passos (8):**
  1. **Leitura · Um estado que carrega o passado** (KaTeX: $h_t = \tanh(x_t W_{xh} + h_{t-1} W_{hh} + b)$; Mermaid da rede desenrolada em 3 passos)
  2. **Previsão · Três passos escalares** (`h` de uma RNN de uma unidade com pesos escritos à mão, arredondado)
  3. **Exercício (lacunas) · `rnn_forward(params, X_seq, h0)`** (→ `(hs, cache)`)
  4. **Leitura · Backprop no tempo** (`dW_hh` acumulado em todos os passos; o `dh` que vem do passo seguinte; Visualizar: o estado escondido passo a passo)
  5. **Exercício (código) · `rnn_backward(dhs, cache)`** (regra 1 com $T = 4$, $H = 3$)
  6. **Leitura · Gradientes que somem e explodem** (potências de $W_{hh}$; norma contra comprimento com números medidos; clipping e truncamento)
  7. **Exercício (código) · Norma no tempo e geração** (`norma_vs_comprimento(Whh, T)` → lista de normas de $\partial h_T / \partial h_0$; `amostrar_rnn(params, itos, rng, n)` determinístico)
  8. **Quiz · BPTT**
- **Muda do roteiro:** `treinar_rnn(config)` "com limite de tempo" sai dos casos (o treino de nomes vai para o "Executar", ~1,2 ms por passo de $T = 16$, lote 16): os casos cobram o backward, a norma e a amostragem.
- **Erradas típicas:** não acumular `dW_hh`; perder o `dh` do passo seguinte; esquecer o $1 - h^2$; clipping antes de somar todos os passos; `h0` alterado no lugar.

### n6-m6-05-lstm-e-gru · LSTM e GRU
- **Arquivo:** `06-sequencias-embeddings-e-rnn/05-lstm-e-gru.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Portas** (KaTeX das portas de esquecimento, entrada e saída e do candidato; $c_t = f \odot c_{t-1} + i \odot g$)
  2. **Previsão · Uma célula LSTM escalar** (pesos escritos à mão)
  3. **Exercício (lacunas) · `lstm_passo(x, h, c, params)`** (os quatro blocos de uma matriz só, na ordem `i, f, g, o` do enunciado)
  4. **Leitura · O caminho aditivo** (o gradiente por $c$ é o produto das portas de esquecimento; o backward completo fica em fórmula)
  5. **Exercício (código) · Sequência e gradiente pela célula** (`lstm_forward(params, X_seq)`; `gradiente_pela_celula(f_seq)` → produtos acumulados)
  6. **Leitura · GRU e por que a atenção venceu** (GRU; o gargalo do vetor único no seq2seq; a motivação da atenção)
  7. **Exercício (código) · GRU e contagem** (`gru_passo(x, h, params)`; `contar_parametros(tipo, d_in, d_h)` por `call`)
  8. **Quiz · Portas e custo** (3 perguntas, não 4)
- **Erradas típicas:** portas com tanh; esquecer o tanh em $h = o \odot \tanh(c)$; blocos da matriz na ordem errada; contagem sem os 4 (ou 3) blocos; GRU com $1 - z$ trocado.

## Módulo 7 · Atenção e transformers

Tokenização, atenção, o bloco transformer e um mini-GPT treinado em numpy. `bibliotecas: [numpy]`, perfil `dados`. Dados: `corpus.py` e `fabulas.txt` (regra 8). A partir da m7-05, `gpt.py` traz o mini-GPT de referência (forward e backward, ~100 linhas, conferido pela regra 1 com pior erro por entrada $3{,}5 \cdot 10^{-8}$) e `pesos_gpt.txt` traz pesos pré-treinados (regra 9).

**Tamanho do mini-GPT do nível** (medido; regra 7): vocabulário de caracteres do corpus ($V = 29$), contexto $T = 16$, $d = 32$, 4 cabeças, MLP $4d$ com ReLU (GELU na leitura da m7-04 e opcional), pré-norm, LayerNorm final, cabeça de saída própria. Com 1 bloco: 15 008 parâmetros, 6,5 ms por passo com lote 16, 600 passos em 3,9 s levam a NLL de validação de 3,37 para 0,54 (o bigrama do mesmo corpus fica em 1,65). Com 2 blocos (o objetivo da m7-05): 27 584 parâmetros, 12 ms por passo (medido com $V = 20$, 27 008 parâmetros). O roteiro previa $d = 64$, $T = 32$, 2 blocos e "~2 minutos": no executor são 220 ms por passo, e nem a verificação nem o "Executar" (10 s cada) cabem; **o que não cabe é treinar "de verdade" dentro de um caso**, e as lições contornam com poucos passos verificados (≤ 60 por caso) mais os pesos pré-treinados para gerar e avaliar.

### n6-m7-01-tokenizacao-e-bpe · Tokenização e BPE do zero
- **Arquivo:** `07-atencao-e-transformers/01-tokenizacao-e-bpe.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Nem caracteres, nem palavras** (sequências longas contra vocabulário infinito; bytes UTF-8: `"ção"` vale `[195, 167, 195, 163, 111]`; o vocabulário começa com 256 bytes)
  2. **Previsão · Uma mesclagem** (contagem dos pares de `"banana bandana"` em bytes e o par mais frequente)
  3. **Exercício (lacunas) · Contar e mesclar** (`contar_pares(ids)` → dicionário; `mesclar(ids, par, novo_id)` da esquerda para a direita, sem sobreposição em `aaa`)
  4. **Leitura · Treinar o vocabulário** (o par mais frequente; desempate pelo par menor em ordem lexicográfica, dito no enunciado para o resultado ser determinístico; `merges` em ordem)
  5. **Exercício (código) · `treinar_bpe(texto, n_mesclas)`** (→ lista de `((a, b), novo_id)` com ids a partir de 256; casos por `call` com textos curtos; `fabulas.txt` num caso de compressão)
  6. **Leitura · Codificar, decodificar e as esquisitices** (aplicar as mesclas na ordem do treino; `errors="replace"`; contar letras dentro de tokens; números quebrados em pedaços; línguas com mais acentos gastam mais tokens; sem citar tokenizadores de produtos)
  7. **Exercício (código) · Ida e volta** (`codificar(texto, merges)`, `decodificar(ids, merges)` com volta exata, `taxa_de_compressao(texto, merges)` → bytes por token)
  8. **Quiz · Tokens e letras**
- **Muda do roteiro:** "tiktoken" e "quantos r em morango" citados genericamente (sem produto); o tokenizador é sobre bytes, como o roteiro pedia; o desempate entra no enunciado (sem ele, duas soluções corretas divergem).
- **Erradas típicas:** mesclas aplicadas fora da ordem do treino; contar pares sobrepostos em `aaa` como 2 na mesclagem; desempate pela primeira ocorrência; decodificar sem `errors="replace"` (`UnicodeDecodeError` real); vocabulário treinado com o texto de validação; `novo_id` começando em 255.

### n6-m7-02-self-attention · Self-attention
- **Arquivo:** `07-atencao-e-transformers/02-self-attention.lvl.md` · 140 XP · 60 min
- **Passos (8):**
  1. **Leitura · Perguntar, responder, oferecer** (Q, K, V; KaTeX: $\text{softmax}(QK^\top / \sqrt{d})\,V$; média ponderada que depende dos dados)
  2. **Previsão · Os pesos de duas posições** (pontuações escritas à mão, softmax por linha arredondada)
  3. **Exercício (lacunas) · `atencao_forward(X, Wq, Wk, Wv)`** (→ `(saida, cache)`, uma cabeça, sem máscara)
  4. **Leitura · Por que $\sqrt{d}$** (variância das pontuações cresce com $d$; números medidos)
  5. **Exercício (código) · Escala e pesos** (`variancias(d, n, semente)` → `(sem_escala, com_escala)`; `pesos_de_atencao(X, Wq, Wk)` com linhas somando 1)
  6. **Leitura · O backward da atenção** (KaTeX do backward da softmax por linha, com o termo de acoplamento; custo $O(T^2 d)$)
  7. **Exercício (código) · `atencao_backward(dsaida, cache)`** (→ `(dX, dWq, dWk, dWv)`, regra 1 com $T = 4$, $d = 3$)
  8. **Quiz · Q, K e V**
- **Erradas típicas:** softmax no eixo errado; sem a escala; `K` sem transpor (ou transposto duas vezes); backward da softmax sem o termo de acoplamento ($A \odot dA$ só); `dX` somando só o caminho de `Q`.

### n6-m7-03-multi-head-e-mascara-causal · Multi-head attention e máscara causal
- **Arquivo:** `07-atencao-e-transformers/03-multi-head-e-mascara-causal.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Várias cabeças** (`(B, T, d)` → `(B, h, T, d/h)` com `reshape` + `transpose`; cada cabeça num subespaço)
  2. **Previsão · Formas ao dividir e juntar** (`.shape` em cada etapa)
  3. **Exercício (lacunas) · Dividir e juntar cabeças** (`dividir_em_cabecas(X, h)`, `juntar_cabecas(X)`, com ida e volta exata)
  4. **Leitura · A máscara causal** (`np.triu(..., 1)` com `-inf` via `np.where`; máscara com 0 vaza; multiplicar por `-inf` dá `nan`; uma linha toda `-inf` dá `nan`; por que o treino paralelo precisa dela)
  5. **Exercício (código) · Atenção causal e o teste** (`atencao_causal(Q, K, V)` em lote; `teste_de_causalidade(f, X, t)` → `bool`, mudando as posições depois de `t` e conferindo que as saídas até `t` não mudam, com `f` injetada; caso com uma `f` que vaza)
  6. **Leitura · Projeção de saída e custo** (KaTeX: parâmetros $4d^2$ e custo $O(T^2 d + T d^2)$)
  7. **Exercício (código) · Multi-head completo** (`multi_head(params, X, h)` contra a referência no `setup`; `custo_atencao(T, d, h)` por `call`)
  8. **Quiz · Máscara e cabeças**
- **Erradas típicas:** máscara com 0 no lugar de `-inf`; mascarar depois da softmax; `triu` sem o deslocamento 1 (a posição não vê a si mesma); `reshape` direto para `(B, h, T, dh)` sem `transpose`; esquecer a projeção de saída; teste de causalidade mudando o passado.

### n6-m7-04-bloco-transformer-e-posicao · O bloco transformer e a codificação posicional
- **Arquivo:** `07-atencao-e-transformers/04-bloco-transformer-e-posicao.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · A atenção não vê a ordem** (permutar a entrada permuta a saída; por isso a posição entra explícita)
  2. **Previsão · Permutar a entrada** (sem máscara: a saída permutada é igual, imprime `True`; com a codificação posicional, `False`)
  3. **Exercício (lacunas) · `posicional_senoidal(T, d)`** (KaTeX da fórmula senoidal no enunciado)
  4. **Leitura · LayerNorm e residual, pré-norm** (Mermaid do bloco: `x + atenção(LN(x))`, `x + MLP(LN(x))`; GELU; o backward da LayerNorm em KaTeX)
  5. **Exercício (código) · LayerNorm com backward** (`layernorm_forward(X, gamma, beta, eps=1e-5)` e `layernorm_backward(dY, cache)` → `(dX, dgamma, dbeta)`, regra 1; o backward que saiu da m3-05)
  6. **Leitura · O GPT inteiro** (embedding de token + posição → blocos → LN final → logits; contagem de parâmetros)
  7. **Exercício (código) · Bloco e contagem** (`bloco_forward(params, X, h)` contra a referência no `setup`; `contar_parametros_gpt(V, T, d, n_blocos)` por `call`, conferido com os 15 008 e 27 584 da tabela)
  8. **Quiz · Posição e residual**
- **Muda do roteiro:** `bloco_backward` com checagem de gradiente sai (o backward do bloco inteiro vem pronto em `gpt.py` na m7-05; aqui o aluno escreve o da LayerNorm, a peça nova); a LayerNorm com backward veio da m3-05.
- **Erradas típicas:** residual esquecido; LayerNorm no eixo do lote; posição somada depois do primeiro bloco; GELU trocada por ReLU sem avisar; `dgamma` sem somar sobre lote e tempo; backward da LayerNorm ignorando a dependência da média e da variância.

### n6-m7-05-treinar-um-mini-gpt · Treinar um mini-GPT em numpy
- **Arquivo:** `07-atencao-e-transformers/05-treinar-um-mini-gpt.lvl.md` · 150 XP · 60 min
- **Passos (8):**
  1. **Leitura · Do texto aos lotes** (Mermaid: corpus → vocabulário → ids → lotes `(B, T)` → alvos deslocados; `corpus.py`)
  2. **Previsão · O alvo deslocado** (contexto e alvo de posições fixas escritas no código, sem sorteio)
  3. **Exercício (lacunas) · `gerar_lote(ids, T, B, rng)`** (inícios com `rng.integers(0, len(ids) - T, B)`, alvo deslocado de 1)
  4. **Leitura · Perda de próximo token e o orçamento** (perda média sobre lote e tempo; Adam com clipping; a conta $6ND$ e o custo medido: 6,5 ms por passo com 1 bloco, 12 ms com 2, 220 ms no tamanho do roteiro)
  5. **Exercício (código) · Perda e treino curto** (`perda_proximo_token(logits, alvos)` → `(perda, dlogits)`; `treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads)` com o modelo de `gpt.py` injetado: 40 passos com 2 blocos baixam a perda de ~$\ln V$ = 3,37 para menos de um limiar medido com folga)
  6. **Leitura · Curvas, validação e os limites** (números medidos de 300 e 600 passos; comparação com bigrama e MLP de linguagem; o que muda num modelo grande: a m8-01)
  7. **Exercício (código) · Avaliar e guardar** (`avaliar(params, ids_val, T, n_lotes, semente, forward)` → NLL média; `salvar_checkpoint`/`carregar_checkpoint` com `np.savez`; caso com os pesos pré-treinados: NLL perto do valor medido, tolerância `1e-3`)
  8. **Quiz · Contexto e custo**
- **Muda do roteiro:** "contos em domínio público, ~200 KB" vira o corpus gerado (regra 8); "d = 64, 2 blocos, T = 32, ~2 minutos" vira $d = 32$, $T = 16$, 2 blocos e treino curto (o objetivo de frontmatter "2 blocos" é mantido); "perda de validação < limiar em tempo limitado" vira perda de treino depois de 40 passos e NLL de validação dos pesos pré-treinados; `comparar_modelos(resultados)` vira leitura.
- **Erradas típicas:** alvo não deslocado (o modelo aprende a copiar: a perda despenca e a validação não); lotes só do início do texto; início sorteado até `len(ids)` (o último lote fica curto); perda somada no lugar da média; avaliar com os dados de treino; checkpoint com `json.dumps` (o `TypeError` real).

### n6-m7-06-geracao-de-texto-e-amostragem · Geração de texto e amostragem
- **Arquivo:** `07-atencao-e-transformers/06-geracao-de-texto-e-amostragem.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Um token por vez** (o laço: últimos $T$ tokens → logits → amostrar → anexar; Visualizar: três passos da geração com um modelo de tabela escrita à mão)
  2. **Previsão · Temperatura** (softmax de `[2, 1, 0]` com temperatura 1, 0,5 e 2, arredondada)
  3. **Exercício (lacunas) · Temperatura e top-k** (`aplicar_temperatura(logits, t)`; `top_k(logits, k)` com `-inf` fora dos `k` maiores, empate pelo menor índice)
  4. **Leitura · Top-p** (ordenar, acumular, cortar no primeiro que passa de `p`)
  5. **Exercício (código) · `top_p(probs, p)`** (renormalizado; casos de empate e `p = 1`)
  6. **Leitura · Guloso, repetição e invenção** (o guloso repete; a temperatura troca coerência por diversidade; o modelo maximiza plausibilidade local e não consulta fatos: a ponte para a m8-02 e o Nível 7)
  7. **Exercício (código) · `gerar(params, ids, n, temperatura, top_k, semente, forward)`** (com os pesos pré-treinados e o `forward` de `gpt.py` injetado; mesma semente, mesmo texto; contexto cortado em $T$; `diversidade(textos)` → fração de trigramas distintos)
  8. **Quiz · Temperatura**
- **Erradas típicas:** temperatura aplicada depois da softmax; top-p sem ordenar; contexto não cortado em $T$ (forma errada no forward); `np.random` global no lugar do `rng` da semente; `argmax` com temperatura (ignora a amostragem).

## Módulo 8 · Limites e projeto

### n6-m8-01-escala-dados-e-custo · Escala, dados e custo
- **Arquivo:** `08-limites-e-projeto/01-escala-dados-e-custo.lvl.md` · 90 XP · 35 min
- **Passos (7):**
  1. **Leitura · Do mini-GPT a um modelo grande** (ordens de grandeza em potências de 10, sem números de produtos; KaTeX $C \approx 6ND$; o executor confirmou: 15 008 parâmetros × 256 posições × 6 ≈ 23 MFLOP por passo, 6,5 ms, ~3,5 GFLOP/s)
  2. **Previsão · 6ND do mini-GPT** (FLOPs de 600 passos e o tempo com 4 GFLOP/s)
  3. **Exercício (lacunas) · Estimar o custo** (`estimar_flops(n_params, n_tokens)` e `tempo_de_treino(flops, flops_por_segundo, eficiencia)` por `call`)
  4. **Leitura · Leis de escala e as etapas** (perda que cai como potência de $N$ e $D$, sem constantes de artigos; pré-treino, ajuste fino supervisionado e ajuste por preferências em um parágrafo cada)
  5. **Exercício (código) · Comparar escalas** (`comparar_escalas(modelos)` → razões de parâmetros, tokens e FLOPs contra o primeiro; `tokens_por_parametro`; `call` com listas de dicionários)
  6. **Leitura · Dados, energia e concentração** (qualidade, deduplicação, direitos de uso; energia como FLOPs vezes joules por FLOP, em ordem de grandeza; quem consegue treinar)
  7. **Quiz · Custo e escala** (3 perguntas, não 5)
- **Muda do roteiro:** quiz de 5 vira 3; nenhum número de modelo, empresa ou produto real; as escalas são hipotéticas (10⁸, 10⁹, 10¹¹ parâmetros).
- **Erradas típicas:** confundir parâmetros com tokens; esquecer o 6 (ou usar 2, que é só o forward); eficiência multiplicando o tempo; razões contra o maior e não contra o primeiro.

### n6-m8-02-limitacoes-alucinacao-vies-e-interpretabilidade · Limitações: alucinação, viés e interpretabilidade
- **Arquivo:** `08-limites-e-projeto/02-limitacoes-alucinacao-vies-e-interpretabilidade.lvl.md` · 90 XP · 35 min
- **Conteúdo (sóbrio, sem produtos nem empresas):** um modelo de próximo token é treinado para dar alta probabilidade a continuações **plausíveis** do texto de treino; ele não consulta uma base de fatos, então completa com confiança perguntas sobre o que nunca viu ("invenção" ou "alucinação"). Calibração: a probabilidade que o modelo dá não é a chance de estar certo. Viés: o modelo reproduz (e com temperatura baixa, amplia) as proporções dos dados; o ajuste fino pode deslocar o viés sem eliminá-lo; medir viés exige amostra grande e intervalo. Interpretabilidade: pesos de atenção mostram para onde a média ponderada olhou, não por que a saída saiu (não são explicação causal); sondas lineares medem se uma informação é recuperável dos estados, não se o modelo a usa; neurônios respondem a várias coisas ao mesmo tempo. Implicação para quem usa: conferir fatos, desconfiar da confiança, medir antes de afirmar (ponte com o Nível 7).
- **Passos (8):**
  1. **Leitura · Por que o modelo inventa** (o objetivo de treino; plausibilidade não é verdade; calibração)
  2. **Previsão · Completar com o mais provável** (um modelo de contagem escrito à mão completa "o padeiro vende" e "o astronauta vende"; o segundo nunca foi visto e mesmo assim recebe uma resposta confiante)
  3. **Exercício (lacunas) · Medir acertos de fatos** (`taxa_de_acerto(completar, fatos)` com `completar` injetado; `fatos` é um dicionário prompt → resposta tirado das regras de `corpus.py`; o `setup` traz um completador falso)
  4. **Leitura · De onde vem o viés** (os dois estilos de `nomes.txt` em 75/25; a amostra gerada reproduz a proporção; temperatura baixa a exagera; intervalo de confiança do Nível 4)
  5. **Exercício (código) · Viés nos dados e na geração** (`proporcao_por_estilo(nomes)`; `proporcao_com_temperatura(probs, temperatura)` → a fração que a temperatura dá ao estilo majoritário)
  6. **Leitura · O que dá para interpretar** (atenção, sondas, neurônios polissêmicos e os limites de cada um)
  7. **Exercício (código) · Uma sonda linear** (`sonda_linear(estados, rotulos, passos, taxa)` → acurácia de uma logística em numpy, a do Nível 5, sobre estados escondidos fornecidos num arquivo da lição; caso com rótulos embaralhados: acurácia perto do acaso)
  8. **Quiz · Atenção não é explicação**
- **Muda do roteiro:** "contagem por gênero nos nomes gerados" vira estilos de nomes inventados (sem rótulo de gênero nem dado de pessoas); quiz de 5 vira 3; `taxa_de_alucinacao_sintetica(modelo, fatos)` vira `taxa_de_acerto(completar, fatos)` com o completador injetado (regra 5).
- **Erradas típicas:** acerto comparando sem normalizar espaços; proporção sobre os nomes únicos e não sobre as amostras; temperatura aplicada às probabilidades sem renormalizar; sonda avaliada nos mesmos estados do treino quando o enunciado pede a divisão.

### n6-m8-03-projeto-seu-modelo-de-linguagem · Projeto final: seu próprio modelo de linguagem
- **Arquivo:** `08-limites-e-projeto/03-projeto-seu-modelo-de-linguagem.lvl.md` · projeto do nível (`projeto: true`) · 300 XP · 240 min · `bibliotecas: [numpy]` (perfil `dados`)
- **Padrão de projeto (N1/N3/N4/N5, relatório `n5-08-projeto.md`):** 8 passos: uma Leitura de especificação, uma Previsão, 5 exercícios de código livre e um Quiz de autoavaliação; a partir do passo 4, as funções dos passos anteriores vêm prontas num arquivo (`tokenizador.py`, `modelo.py`…), para o erro antigo não contaminar o passo novo. **≥ 16 casos por exercício** (o `content:metrics` usa o mínimo de projeto 15,2; o N5 fez 16–17), todos de comportamento.
- **Dados (gerados e escritos para o curso):** `corpus.py` (a gramática da vila fictícia, com sementes diferentes para treino e validação) e `fabulas.txt`; `pesos_gpt.txt` com a configuração, as mesclas do BPE de referência e os pesos pré-treinados em `float16` (regra 9). Tamanho previsto por passo: código do aluno + arquivos prontos + corpus + pesos ≈ 70 000 caracteres (limite 300 000).
- **Configuração:** BPE com 40 mesclas sobre os **caracteres** do texto de treino (base de ~29 caracteres + 40 mesclas ≈ 69 tokens), $T = 16$, $d = 32$, 4 cabeças, 1 bloco, ~17 600 parâmetros (pesos com ~47 000 caracteres). Com a base de 256 bytes da m7-01, as matrizes de entrada e de saída teriam 296 linhas, o modelo 32 096 parâmetros e os pesos passariam de 85 000 caracteres; a leitura 1 explica a troca de base.
- **Passos (8):**
  1. **Leitura · O que você vai construir** (especificação; Mermaid das 6 peças: tokenizador → lotes → modelo → treino → geração → relatório; tabela de funções por passo; critérios de aprovação; orçamento: nada de treino longo no `main.py`, porque ele roda em todo caso)
  2. **Previsão · Ida e volta de um tokenizador minúsculo** (três mesclas escritas à mão aplicadas a uma frase curta: ids e texto de volta)
  3. **Exercício (código) · Tokenizador** (`treinar_bpe`, `codificar`, `decodificar`, `taxa_de_compressao`, e `preparar(texto_treino, texto_val, n_mesclas)` → `(merges, ids_treino, ids_val)`, com as mesclas aprendidas **só** do treino)
  4. **Exercício (código) · Modelo** (`montar(config, semente)`, `forward(params, ids)` → logits `(B, T, V)`, `perda_e_gradientes(params, ids, alvos)`, `contar_parametros(config)`; casos: formas, contagem exata, perda inicial perto de $\ln V$, referência no `setup`, checagem numérica numa configuração minúscula (regra 1), causalidade)
  5. **Exercício (código) · Treino** (`gerar_lote`, `treinar(params, ids, config, passos, semente, perda_e_grads)` → histórico, com Adam e clipping por norma; `salvar`/`carregar`; dois casos de treino de até 60 passos)
  6. **Exercício (código) · Geração e avaliação** (`gerar(params, prompt, n, temperatura, top_k, semente)`, `perplexidade(params, ids, T)` e `teste_de_causalidade(params)`, com os pesos pré-treinados carregados no **forward do aluno**: perplexidade de validação ≈ $e^{0{,}54}$ e abaixo da do bigrama por margem fixada, amostras iguais com a mesma semente)
  7. **Exercício (código) · Relatório** (`gerar_relatorio(resultados)` → texto no formato exato do enunciado: perplexidade de validação, bigrama de referência, parâmetros, passos e tempo do treino, três amostras, e as limitações e vieses observados em frases fixas)
  8. **Quiz · Autoavaliação do projeto** (tokenizador treinado com a validação; alvo não deslocado; perplexidade com `10 **`)
- **Muda do roteiro:** "~300 KB de textos de domínio público" vira corpus gerado + fábulas escritas; "orçamento de treino de 3 minutos" vira ~4 s no "Executar" (600 passos) e pesos pré-treinados para avaliar e gerar; "grad check < 1e-5" vira o limiar da regra 1 ($10^{-7}$ por array); os 6 módulos do roteiro viram arquivos dos passos 3 a 7 (a avaliação fica junto da geração).
- **Erros que o projeto cobra:** modelo grande demais para o orçamento (o caso de treino estoura o tempo); tokenizador treinado com a validação; alvo não deslocado; perplexidade em base errada; máscara causal vazando; LayerNorm no eixo errado; Adam sem correção de viés; clipping por valor; geração sem cortar o contexto; relatório sem a perplexidade de validação ou sem as limitações.

## Prova

Banco de **40 questões, 10 por tentativa** (como N2 a N5), a escrever depois dos módulos: nota mínima 70 %, 45 min, 60 min entre tentativas.

- **Proporção:** 4 (neurônios), 6 (autograd), 6 (treino), 5 (MLP), 4 (CNN), 5 (sequências), 7 (atenção) e 3 (limites e projeto), na ordem dos módulos e das lições; a alternativa correta fica 10 vezes em cada posição.
- **Tipo de questão:** prever a forma ou o valor de um trecho (formas de `dW`, saída de uma softmax com temperatura, número de parâmetros), ler uma checagem de gradiente (`[(0.714, 0.714), ...]`), achar o defeito de um laço de treino (sem zerar, alvo não deslocado, máscara com 0), interpretar números de curvas e escolher a técnica. Distratores são erros que as lições mostram; a explicação diz por que cada um falha.
- **Texto puro:** a prova não renderiza markdown nem KaTeX; código curto vai em bloco literal do YAML.
- **Conferência:** toda resposta que é saída de código ou conta é conferida no executor por uma lição temporária numa cópia mínima do `content/`, como no N4 e no N5. Nenhuma questão cita produto ou empresa.
- Das 12 questões atuais sobram as ideias (XOR, composição linear, `+=` no autograd, ordem do backward, perda inicial $\ln 10$, Adam e as outras), reescritas como cenário; as definições diretas saem.

## Defeitos conhecidos (fora do conteúdo)

1. **`np.seterr` sem efeito no executor:** `np.seterr(all="raise")` não faz `np.exp(1000.0)` levantar `FloatingPointError` (devolve `inf`), ao contrário do CPython com numpy nativo. Herdado da compilação do Pyodide (o mesmo motivo de não haver `RuntimeWarning`). Nenhuma lição depende disso; registrado para quem testar o código no computador e estranhar.
2. **Perfil `ml` sem necessidade nos módulos 4 e 5:** cada verificação dessas 8 lições paga o boot do `ml` (~9,7 s por lote medido no `verifyStep` da piloto, contra ~50–80 ms no `dados`), e o `content:verify --licao` da piloto levou 3 min 26 s, com o passo 3 somando 437 s de lotes. Não é defeito de código, mas é custo real para o aluno; ver "Decisões", 1.
3. **"Executar" com o mesmo limite de 10 s da verificação** (`PYTHON_EXECUTION_TIMEOUT_MS`): o treino "de verdade" do mini-GPT do roteiro (minutos) não roda em lugar nenhum da plataforma. O nível foi planejado dentro disso (~4 s); um limite maior só no "Executar" de lições `python-dados` permitiria treinos mais longos no navegador. Ver "Decisões", 9.
4. **Recursão profunda não testada:** `sys.setrecursionlimit` maior que 1 000 não foi testado no executor (uma recursão de WebAssembly profunda pode derrubar o worker). A m2-03 ensina a versão iterativa.
5. **Herdados do N5** (`content:verify` sem limite de simultaneidade na CLI; fila cheia do executor com verifies de agentes diferentes dando `fetch failed`/"Tempo limite excedido"; quedas com código 139 sob carga `ml`): no piloto, com o coordenador rodando verifies `ml` ao lado, **nenhum** desses aconteceu (`verifyStep` com um lote por vez e o `content:verify` oficial passaram na primeira tentativa).

## Decisões para o Filipe

1. **Tirar `scikit-learn` do frontmatter das 8 lições dos módulos 4 e 5** (`bibliotecas: [numpy]`): nenhuma importa o scikit-learn, e cada verificação pagaria ~10 s de boot do perfil `ml` (medido: 9,7 s por lote) em vez de ~0,1 s no `dados`. A piloto foi escrita mantendo o frontmatter, como pedido; a troca é uma linha por lição e não muda nenhum caso. O N5 já registrou a regra "não ponha `scikit-learn` numa lição que não o importa".
2. **Ordem do roteiro no módulo 3:** o backward vetorizado só é ensinado na m4-01 (a piloto). Por isso: a m3 usa a regressão softmax e um `rede.py` pronto; `checar_gradiente` saiu da m3-02 e virou o passo 7 da piloto; `batchnorm_backward` e `layernorm_backward` saíram da m3-05 (a BatchNorm fica em fórmula na leitura; a LayerNorm com backward vai para a m7-04, onde é usada). Alternativa: mover a m4-01 para antes da m3 (mudaria a ordem dos módulos).
3. **Tamanho do mini-GPT:** $V$ de caracteres (~29), $T = 16$, $d = 32$, 4 cabeças, 1 bloco (2 blocos na m7-05, para cumprir o objetivo do frontmatter), no lugar de $d = 64$, $T = 32$, 2 blocos e "~2 minutos" (220 ms por passo no executor). O treino de verdade fica no "Executar" (~4 s, 600 passos) e na narrativa; os casos treinam ≤ 60 passos e usam pesos pré-treinados.
4. **Pesos pré-treinados embutidos** em `pesos_gpt.txt` (`float16` em base64, ~40 000 caracteres para 1 bloco). Cada passo que usa os pesos repete o arquivo no código inicial e na solução, então as lições m7-06, m8-02 e o projeto ficam grandes (~100–200 KB, como o projeto do N5 com 231 KB). Alternativa: um modelo de 1 bloco com $d = 16$ (4 432 parâmetros, ~12 000 caracteres, NLL de validação 0,67 em 600 passos).
5. **Dados do nível:** dígitos 8 × 8 gerados (`digitos.py`) no lugar de `load_digits`; ~1 000 nomes inventados por um gerador de sílabas no lugar do "corpus de nomes brasileiros"; corpus de frases geradas por gramática e fábulas escritas para o curso no lugar dos "contos de domínio público, ~200–300 KB" (direito autoral difícil de auditar e acima de 100 000 caracteres por arquivo). O `curso.yaml` não cita a fonte e não precisa mudar.
6. **Frontmatter que cita o que não existe mais:** a `descricao` da m4-02 cita `load_digits`; precisa virar "dígitos 8×8 gerados". O objetivo "acurácia de validação acima de 95 %" da m4-02 é atingido no "Executar" (0,96 em 20 épocas, 0,10 s) e pode virar um caso com piso 0,90; decidir se fica.
7. **Viés na m8-02 sem gênero:** a medida de viés usa dois estilos de nomes inventados (75/25), e não "contagem por gênero" como o roteiro previa: evita rotular nomes por gênero e continua ensinando que o modelo reproduz e amplia as proporções dos dados.
8. **Quizzes de 5 e de 4 perguntas** do roteiro (m5-04, m6-05, m8-01, m8-02) ficam com 3, pela régua.
9. **Limite do "Executar":** manter 10 s (o nível cabe) ou aumentar só para `python-dados` no navegador, para treinos mais longos sem afetar a verificação.
10. **Régua de casos do projeto:** ≥ 16 casos por exercício, como o N5 (o `content:metrics` usa 15,2 de referência).
11. **Prova:** 12 questões hoje; a meta é 40, com 10 por tentativa (a `descricao` do `prova.yaml` muda quando o banco for escrito).
