# Plano do Nível 7 — Engenharia de IA

Este é o plano de autoria do Nível 7 da trilha **Python: do zero à IA**. Ele orienta a escrita das lições de `content/cursos/n7-engenharia-de-ia`. Cada lição traz: slug, título, a **sequência de passos, um a um**, com o tipo de cada passo (Leitura, Exercício — código, lacunas ou ordenar —, Previsão, Quiz), os recursos de apresentação (diagrama Mermaid, bloco `visualizar`, fórmula KaTeX) e, nos exercícios, as funções e classes pedidas.

**Estado:** os 7 módulos estão escritos e auditados. As seções abaixo descrevem o conteúdo atual, e a fonte da verdade são os próprios `.lvl.md`: se este plano e uma lição divergirem, vale a lição, e o plano é que precisa ser corrigido. As regras gerais valem para qualquer passo novo.

Formato dos arquivos: `content/README.md` (§3 inteira; recursos de apresentação em §3.5–§3.7) e `docs/v2/curso-e-passos.md` §6. O executor roda em sandbox isolado **sem rede e sem chaves externas**: todo modelo de linguagem, modelo de embedding, juiz, re-ranker e servidor HTTP é simulado de forma determinística em Python, por arquivos auxiliares abertos ao aluno (seção "Verificação e convenções do nível").

## Como usar este plano

1. Abra o arquivo da lição (`content/cursos/n7-engenharia-de-ia/<módulo>/<NN>-<slug>.lvl.md`).
2. Mantenha o frontmatter (`slug`, `xp`, `tempo_min`, `runtime`, `bibliotecas`, `objetivos`) e `publicada: true`. Não renomeie arquivos nem slugs.
3. Os passos seguem a ordem e os tipos listados na lição (`## Passo N · Leitura|Exercício|Previsão|Quiz · Título`).
4. Em cada exercício: `### Instruções` (lista numerada = checkpoints), `### Código inicial` (não existe no `modo: ordenar`), `### Solução`, `### Dicas` (até 3), `### Verificação` (JSON de `TestCase[]`) e `### Soluções erradas` (**pelo menos três**, uma por erro comum, cada uma com um defeito só).
5. Rode `pnpm content:check` (lint) e `pnpm content:verify --licao <slug>` com `RUNNER_URL=http://127.0.0.1:8081` e `RUNNER_TOKEN=dev-runner-token-0123456789abcdef`.

## Como usar os recursos de apresentação neste nível

O aluno do Nível 7 já domina Python intermediário (classes, decoradores, geradores, exceções, `unittest`), estruturas de dados e algoritmos (Nível 3), análise de dados (Nível 4), aprendizado de máquina com `numpy` (Nível 5) e redes neurais e Transformers por dentro (Nível 6). Os recursos visuais destacam a **arquitetura de sistemas com IA**, o fluxo de dados entre componentes e as métricas de engenharia.

### Regras

- **Diagrama (bloco `mermaid`)** — para arquitetura e fluxo: prefill e decodificação, retries, ciclo de ferramentas, anatomia do prompt, pipelines de etapas, lote com cache, indexação e IVF, chunking, pipeline RAG, diagnóstico por etapa, busca híbrida, conversa com roteador, loop ReAct, catálogo de ferramentas, memórias, guardrails, avaliação contínua, camadas contra injeção, fluxo LGPD, teste contrafactual, serviço de inferência, registro de modelos, monitoramento e a arquitetura do projeto. Use `flowchart` ou `sequenceDiagram`, com no máximo ~8 nós e rótulos curtos em pt-BR; texto com parênteses, colchetes ou dois-pontos vai entre aspas (`A["ClienteLLM.completar()"]`).
- **Visualizador (bloco `python visualizar`)** — para inspecionar o estado mudando passo a passo: temperatura e semente, histórico crescendo, stream e backoff, few-shot, chave de cache, normas e linha nula, agrupamento de sentenças, orçamento de contexto, fusão RRF, rastro ReAct, janela com resumo, viés de posição do juiz, pseudonimização, registro com rollback e PSI por faixa. Até 60 linhas, **autossuficiente** (sem importar arquivos da lição e sem `input()`), terminando sem erro. Não pode ser a solução de um exercício da lição.
- **Fórmula (KaTeX)** — onde há cálculo ou métrica: custo e latência, backoff com jitter, memória de pesos e KV cache, nota ponderada, custo e acerto de pipeline, vazão do lote, cosseno e normalização L2, custo da busca exata e do IVF, recall@k, LSH, PQ, precisão@k e MRR, BM25, min-max e RRF, cobertura de citações, Jaccard, custo por sucesso, erro padrão, $\kappa$ de Cohen, ASR, disparidade contrafactual, p95, PSI e KS. Todo `$` fora de código é delimitador de fórmula: valores monetários no texto usam `R\$` ou "reais".
- **`modo: lacunas` e `modo: ordenar`** — andaime nas primeiras lições de cada módulo (o projeto `n7-m7-04` tem só código livre). Em `lacunas`, a solução é idêntica ao código inicial fora dos `___`. Em `ordenar`, a solução fica num único bloco `main.py` sem `### Código inicial`, com pelo menos 3 linhas e indentação múltipla de 4 espaços.
- **Passo `Previsão`** — pelo menos um por módulo, com código determinístico, autossuficiente, sem `input()`, terminando sem erro e imprimindo de 1 a 20 linhas, acompanhado de `### Saída esperada`. As dicas não entregam a saída.
- **Imagem (`assets/`) e Vídeo** — nenhum neste nível.
- **Limites em todo passo:** até 3 dicas, que orientam sem entregar o código; exercício com **pelo menos 3 soluções erradas** (no nível há de 4 a 9 por exercício, quase sempre 5 a 7), cada uma com um único defeito plausível, tirado dos erros reais de quem aprende — nada de espantalho como `return obj`, `return []`, nota fixa ou a outra função do arquivo vazia; quiz com **3 perguntas**, cada uma com exatamente uma alternativa correta, distratores plausíveis e explicação (`> …`); leitura com ≥ 200 caracteres, sem exclamações e mostrando o erro comum com a mensagem real do Python quando houver.

### Verificação e convenções do nível

#### Os simuladores do curso

Cada simulador existe **uma vez** no curso. Quando uma lição precisa dele, o arquivo entra com `path=<nome>.py` no código inicial e na solução de cada exercício que o usa, e **todas as cópias são idênticas byte a byte**: corrigir um simulador é corrigir todas as cópias no mesmo passe e rodar `content:verify --curso n7-engenharia-de-ia`. Comportamento novo de "modelo" não muda o simulador: vai num arquivo `modelo_<papel>.py` com a função `responder(mensagens)`, usada como `ClienteLLM(responder)`, com as regras escritas no docstring.

| Arquivo | O que simula | Onde aparece |
|---|---|---|
| `llm_simulado.py` | `ClienteLLM(respostas, seed=None, falhas=(), relogio=None, ttft_ms=300, ms_por_token=20)`; `completar(mensagens, max_tokens=..., temperature=...)` → `Resposta(conteudo, finish_reason, usage)` com `usage = {prompt_tokens, completion_tokens, total_tokens}`, `latencia_ms` e `tool_calls`; `completar_stream(..., cair_apos=n)`; fila de falhas `429`, `503`, `"timeout"`, `400` (`ErroDeTaxa` com `retry_after`, `ErroDeServidor`, `ErroDeTimeout`, `ErroDeRequisicao`); `Relogio` falso; preços fictícios em reais (`PRECO_ENTRADA = 2.0`, `PRECO_SAIDA = 8.0`) e `SOBRECARGA_POR_MENSAGEM = 4` | m1-02, m1-03, m1-04; m2-01 a m2-04; m4-01, m4-02, m4-04; m5-01, m5-03, m5-04; m6-02; m7-04 |
| `embedder_simulado.py` | `EmbedderSimulado(dim=64, nome="emb-simulado-v1").embutir(textos)` → matriz **sem normalizar**; saco de palavras sem acento, sem palavras vazias, com mapa fixo `SINONIMOS`; vetor de cada palavra tirado de `shake_256(nome:palavra)` (outro `nome` gera espaço incompatível); `tokenizar` exportado; contador `chamadas` | m3-01, m3-04; m4-01, m4-03, m4-04 |
| `reranker_simulado.py` | re-ranker em lote `pontuar(pergunta, textos)`, que conta `pares` (o custo) e usa o `tokenizar` do embedder | m4-03 |
| `pipeline_rag.py` | o `PipelineRAG` da solução do m4-01, o `CORPUS` com os índices `regimento`, `calendario` e `faq` e `montar_pipelines(cliente)` | m4-04 |
| `bm25.py` | o `IndiceBM25` da solução do m4-03, sem o bloco `__main__` | m7-04 |
| `busca.py` | `EmbedderPuro` (a mesma conta do `EmbedderSimulado`, em listas, para o runtime sem numpy), `cosseno` e o `rrf` do m4-03 | m7-04 |
| `roteiro.py` | dublê de teste declarado sobre o `ClienteLLM`: `cliente_roteirizado(saidas, limite_de_seguranca=50)` devolve a saída *n* na chamada *n*, repete a última quando o roteiro acaba, guarda `cliente.vistas` e levanta `RoteiroEsgotado` depois de 50 chamadas | m5-01, m7-04 |
| `modelo_triagem.py` | classificador de pedidos por palavras, que lê o formato pedido no `system` e o dado entre `<entrada>` | m2-01 |
| `modelo_triagem_glossario.py` | classificador que lê no `system` um glossário de linhas `CATEGORIA: palavra, palavra` e o dado entre `<entrada>` | m2-03 |
| `modelo_secretaria.py` | elegibilidade com e sem cadeia de pensamento e as etapas do pipeline de atendimento | m2-02 |
| `modelo_extracao.py` | extração de ação e sigla em JSON, com saídas cortadas e inválidas programadas | m2-04 |
| `modelo_rag.py` | gerador que copia o trecho com mais palavras em comum e cita `[n]`, devolve a recusa exata e inventa sem a instrução de aterramento | m4-01, m4-04, m7-04 |
| `modelo_juiz.py` | juiz com viés de verbosidade e JSON quebrado por aspas | m4-02 |
| `modelo_consulta.py` | reescrita da pergunta, divisão em JSON e classificação de rota | m4-04 |
| `modelo_vulneravel.py` | dublê que obedece a qualquer linha fora do `system` dirigida a "Assistente," ou "Assistente:"; tags e avisos não o detêm (pior caso declarado) | m6-02 |
| `modelo_planejador.py` | planejador de ferramentas que devolve `{"ferramenta", "argumentos"}` lendo só a última mensagem `user` e sem julgar intenção | m7-04 |

**Tokenizador do `llm_simulado.py`.** É uma aproximação declarada: cada palavra vira pedaços de até 4 caracteres, e o espaço em branco (quebras de linha inclusive) não conta à parte — vai colado no pedaço seguinte, ou no último quando fecha o texto. Assim `"".join(tokenizar(t)) == t`: a resposta volta com as quebras de linha, como num modelo real, e a contagem continua a de "pedaços de até 4 caracteres por palavra" (`re.findall(r"\s*\S{1,4}(?:\s+\Z)?|\s+\Z", texto)`). A única contagem confiável em produção é o `usage` da API.

Arquivos de apoio de uma lição só (soluções de passos anteriores ou cenários de teste, entregues prontos para o erro antigo não contaminar o passo novo): `prompts_util.py` (m2-03), `etapas.py` (m4-04), `protocolo.py` (m5-01), `contrato.py` (m5-02), `estado.py` (m5-03), `agente.py` (m5-04), `defesas.py` e `cenario.py` (m6-02), `servico_base.py` (m7-01) e, no projeto, `dados_secretaria.py`, `ferramentas.py`, `indice.py`, `protecoes.py`, `executor.py`, `componentes.py`, `assistente.py`, `sistema.py` e `api_base.py`.

#### O que o executor não tem

- **`runtime: python`** (m1, m2, m5, m6, m7-01 e o projeto m7-04): CPython 3.14 WASI só com a biblioteca padrão. Sem `numpy`, FastAPI, uvicorn, pydantic, scikit-learn, joblib, scipy e sem rede.
- **`runtime: python-dados` com `bibliotecas: [numpy]`** (m3, m4, m7-02, m7-03): só `numpy`. Sem scikit-learn, joblib e scipy.

As lições dizem isso na leitura e trabalham assim:
- **FastAPI** (m7-01, projeto): o código real aparece como ilustração; o aluno escreve os handlers como funções puras `(status, corpo)` e o roteador `MiniAPI`, o mesmo comportamento que um teste com `TestClient` exercita.
- **scikit-learn e joblib** (m7-02): o `Pipeline` aparece como ilustração; o exercício é um `PipelinePadronizado` em numpy com `fit`/`predict`, salvo com `pickle` (o formato que o `joblib` usa por baixo).
- **scipy** (m7-03): a estatística $D$ do KS é calculada em numpy e decidida pelo valor crítico assintótico; a leitura cita `scipy.stats.ks_2samp` como o caminho de produção.
- **numpy no projeto** (m7-04): `pipeline_rag.py`, `embedder_simulado.py` e `reranker_simulado.py` não entram; no lugar, `bm25.py` e `busca.py` (`EmbedderPuro`) com o mesmo `CORPUS`, mais 5 trechos extras. O re-ranker fica de fora.
- **Rede e chaves**: toda chamada a modelo passa pelos simuladores; a leitura mostra a troca de um objeto (cliente ou `modelo`) para usar um provedor real fora daqui. A chave de API vem de `os.environ`, nunca do código.

#### Regras de verificação

- **Nunca por tempo de relógio.** Nenhum caso mede o relógio do executor. Tempo é sempre injetado: o `Relogio` do `llm_simulado.py`, `dormir` injetável (`com_retries`, `LimitadorDeTaxa`), `relogio` no `Orcamento`, em `medir_predicao` e em `criar_api`, `agora` no `RegistroDeModelos`. Custo é contado: `cliente.chamadas`, `embedder.chamadas`, `reranker.pares`, `cliente.vistas`, ferramentas espiãs.
- **Sorteio com semente injetada:** `random.Random` vem de quem chama (`calcular_espera(tentativa, rng, ...)`, `ClienteLLM(seed=...)`).
- **Laços que podem não terminar** são testados contra dublês com limite (`RoteiroEsgotado` depois de 50 chamadas), para a errada com `while True` reprovar sem travar o executor.
- **`call` e `expr`:** funções puras com `call`; classes, clientes, estados, arquivos temporários e exceções (`raises` + `message_contains`) com `expr` e `setup`. Suítes escritas pelo aluno usam `unittest` (`expect: "pass"` na referência e `expect: "fail"` nos mutantes; m5-04).
- **Um comportamento por caso**, com as bordas (vazio, empate, igualdade no limite, `bool` contra `int`, `int` em campo `float`, `null` em opcional, `nan`).
- **Tolerância em ponto flutuante:** todo caso que compara `float` define `tolerance`; em `python-dados`, os retornos viram tipos nativos (`float(...)`, `int(...)`, `.tolist()`).
- **Regra de empate do top-k** (m3-02): no empate vence o menor índice, inclusive na fronteira do corte. O `top_k` e o `normalizar_linhas` reaparecem prontos e idênticos nos passos seguintes.

#### Exemplos neutros

Nada de instituições, disciplinas, sistemas ou domínios reais. O cenário é a **secretaria acadêmica** de uma universidade fictícia; códigos de disciplina fictícios (`PRG101`, `PRG102`, `EST202`, `MAT301`); identificação por RA; domínios reservados (`universidade.example`, `aluno.example`, `atacante.test`, `fora.test`); preços e números de modelos fictícios. CPF só os de exemplo com dígito verificador válido. A LGPD (Lei 13.709/2018) é citada por artigo; o mapa da lição m6-03 avisa que não é parecer jurídico.

### Dosagem por módulo

| Módulo | Lições | Mermaid | Visualizar | Leituras com fórmula | Exercício (lacunas) | Exercício (ordenar) | Exercício (código) | Previsão | Imagens (assets) |
|---|---|---|---|---|---|---|---|---|---|
| 1 · LLMs e APIs | 5 | 4 | 4 | 4 | 2 | 1 | 12 | 3 | 0 |
| 2 · Prompting | 4 | 4 | 2 | 2 | 2 | 1 | 11 | 4 | 0 |
| 3 · Embeddings e busca vetorial | 4 | 3 | 2 | 7 | 2 | 1 | 10 | 4 | 0 |
| 4 · RAG: geração aumentada por recuperação | 4 | 4 | 2 | 5 | 2 | 1 | 12 | 4 | 0 |
| 5 · Agentes e ferramentas | 4 | 4 | 2 | 3 | 2 | 1 | 11 | 3 | 0 |
| 6 · Avaliação, segurança e ética | 4 | 4 | 2 | 4 | 2 | 1 | 12 | 4 | 0 |
| 7 · MLOps básico e projeto | 4 | 4 | 2 | 3 | 1 | 1 | 16 | 3 | 0 |
| **Total** | **29** | **27** | **16** | **28** | **13** | **7** | **84** | **25** | **0** |

Contagem do conteúdo atual: Mermaid e Visualizar são números de blocos; "Leituras com fórmula" conta os passos de Leitura com KaTeX (contando qualquer passo com KaTeX, os módulos dão 9, 5, 19, 9, 3, 8 e 6).

## Voz e estilo

- **Você**, direto, técnico e claro. Frases enxutas, sem promessas vazias nem marcadores de rascunho.
- **Sem exagero sobre modelos.** Nada de "o modelo sempre", "garante" ou "perda mínima": ganhos dependem do modelo e da tarefa, e se medem num conjunto próprio. Temperatura 0 não garante saída idêntica em servidor real; o texto do raciocínio não prova como o modelo decidiu; delimitador e instrução no prompt não impedem injeção.
- **Ponte com os níveis anteriores:** Nível 2 (decoradores, geradores, exceções, `unittest`), Nível 3 (quickselect, `heapq`, idempotência de estruturas), Nível 5 (k-means, métricas de classificação, pipelines) e Nível 6 (tokenização, embeddings, atenção, KV cache e o mini-GPT).
- **Contexto:** a secretaria acadêmica fictícia (regimento, calendário, trancamento, matrícula, histórico, protocolos), dados de alunos por RA, LGPD.
- **Simuladores transparentes:** cada lição diz o que o simulador faz, o que ele não faz (tabela "modelo real × simulador" no m1-02 e no m3-01) e qual objeto trocar para usar um provedor real.

## Estrutura do nível

7 módulos · 29 lições (1 projeto de nível) · 25,1 h de lições (1505 min) + prova (1 h) · 3390 XP · prova com banco de 40 questões (20 por tentativa).

| # | Módulo | Lições | Minutos | XP |
|---|---|---|---|---|
| 1 | LLMs e APIs (`llms-e-apis`) | 5 | 205 | 510 |
| 2 | Prompting (`prompting`) | 4 | 170 | 420 |
| 3 | Embeddings e busca vetorial (`embeddings-e-busca-vetorial`) | 4 | 180 | 440 |
| 4 | RAG: geração aumentada por recuperação (`rag`) | 4 | 205 | 490 |
| 5 | Agentes e ferramentas (`agentes-e-ferramentas`) | 4 | 190 | 460 |
| 6 | Avaliação, segurança e ética (`avaliacao-seguranca-e-etica`) | 4 | 180 | 440 |
| 7 | MLOps básico e projeto (`mlops-e-projeto`) | 4 | 375 | 630 |

A prova distribui as 40 questões por módulo assim: 6, 6, 5, 7, 6, 5 e 5, com a alternativa correta 10 vezes em cada posição.

## Módulo 1 · LLMs e APIs

Como um LLM é servido (tokens, janela, custo, latência e os parâmetros de geração), anatomia de uma chamada com o cliente simulado, streaming, erros e retries, saída estruturada e ferramentas, e escolha de modelos. Todas as lições usam `runtime: python`.

### n7-m1-01-como-um-llm-e-servido · Como um LLM é servido: tokens, contexto, custo e latência
- **Arquivo:** `01-llms-e-apis/01-como-um-llm-e-servido.lvl.md` · 90 XP · 35 min
- **Passos (7):**
  1. **Leitura · Tokens não são palavras** (tokenizador de brinquedo declarado; janela compartilhada entre entrada e saída; sobrecarga por mensagem)
  2. **Previsão · Cabe na janela?**
  3. **Exercício (lacunas) · Estimando tokens e custo** (KaTeX do custo; `estimar_tokens(texto)` com `ceil(len(palavra) / 4)` por palavra, `estimar_custo(tokens_entrada, tokens_saida, preco)` com preço de saída diferente)
  4. **Exercício (ordenar) · Cabe na janela de contexto?** (`cabe_no_contexto(tokens_mensagens, limite, max_tokens)` com sobrecarga de 4 por mensagem e `<=`)
  5. **Leitura · Prefill, decodificação e os botões da geração** (Mermaid + Visualizar + KaTeX: $L \approx \text{TTFT} + T_{\text{saída}} \cdot t_{\text{token}}$; `max_tokens`, `stop`, `temperature`, `top_p`, `seed`; temperatura 0 não garante saída idêntica)
  6. **Exercício (código) · Escolhendo o modelo pelo caso de uso** (`escolher_modelo(requisitos, catalogo)`: filtra qualidade, latência e janela, devolve o mais barato; empate fica o primeiro do catálogo)
  7. **Quiz · Tokens, latência e parâmetros**

### n7-m1-02-anatomia-de-uma-chamada · Anatomia de uma chamada de API (com cliente simulado)
- **Arquivo:** `01-llms-e-apis/02-anatomia-de-uma-chamada.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · Mensagens, papéis e o objeto Resposta** (Mermaid `sequenceDiagram`; servidor sem estado; `finish_reason` `"stop"`/`"length"`/`"tool_calls"`; `usage`; chave em `os.environ`)
  2. **Leitura · O cliente simulado do curso** (Visualizar do histórico crescendo; tabela "comportamento real × simulador"; troca de provedor = troca de objeto)
  3. **Previsão · O que o modelo lembra**
  4. **Exercício (lacunas) · Montando a lista de mensagens** (`montar_mensagens(sistema, historico, pergunta)` sem mutar `historico`)
  5. **Exercício (código) · Conversar e truncar o histórico** (`conversar(cliente, mensagens, max_tokens=200)` com `RuntimeError("Resposta truncada")`; `truncar_historico(mensagens, limite_tokens)` por orçamento de tokens, preservando a `system`, mantendo o trecho final contíguo e descartando a resposta órfã)
  6. **Exercício (código) · A classe Assistente** (`Assistente(cliente, sistema, precos, max_tokens=256)` com `perguntar` e `custo_acumulado`; a chamada cortada é cobrada e fica fora do histórico)
  7. **Quiz · Papéis e estado da conversa**

### n7-m1-03-streaming-erros-e-retries · Streaming, erros, timeouts e retries
- **Arquivo:** `01-llms-e-apis/03-streaming-erros-e-retries.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Streaming: a resposta em pedaços** (Visualizar; evento final como atestado; gerador percorrido uma vez)
  2. **Previsão · Um gerador, duas leituras**
  3. **Exercício (código) · Consumir o stream** (`consumir_stream(eventos, ao_receber=None)` → `(texto, finish_reason)`; `ConnectionError` sem o evento final; entrega na hora conferida com o relógio do simulador)
  4. **Leitura · Quais erros repetir, e como esperar** (Mermaid + Visualizar + KaTeX: $c_k = \min(T_{\text{teto}}, b \cdot 2^{k-1})$, $t_k = c_k/2 + u_k \cdot c_k/2$; transitórios 429, 5xx e timeout; `Retry-After`; idempotência)
  5. **Exercício (código) · Calcular a espera** (`calcular_espera(tentativa, rng, base=1.0, teto=8.0)`, metade fixa e metade sorteada, uma chamada `rng.random()` por espera)
  6. **Exercício (código) · O decorador com_retries** (`com_retries(max_tentativas=4, base=1.0, teto=8.0, rng=None, dormir=time.sleep)`: só transitórios, espera o maior entre o backoff e `retry_after`, não dorme depois da última, relança, `functools.wraps`)
  7. **Exercício (código) · Orçamento de espera e registro das falhas** (continuação: `orcamento_s=None` com `TimeoutError(...) from erro` e `logging.getLogger("llm").warning("tentativa k/n falhou: Classe")`)
  8. **Quiz · Retries, idempotência e streaming**
- Nota: a fórmula antiga de jitter aditivo ($u_k \in [0, 1)$ somado à espera, com `Random(semente + tentativa)`) foi trocada por metade fixa mais metade sorteada, que espalha também as esperas longas.

### n7-m1-04-saida-estruturada-e-ferramentas · Saída estruturada e chamadas de ferramentas
- **Arquivo:** `01-llms-e-apis/04-saida-estruturada-e-ferramentas.lvl.md` · 120 XP · 50 min
- **Passos (6):** sem Previsão nem visualizar.
  1. **Leitura · O modelo como fonte de dados não confiável** (tabela de falhas típicas; `json.loads`, nunca `eval`; `bool` não é `int`, `int` vale em campo `float`; ciclo de reparo; `"length"` não se repara)
  2. **Exercício (código) · Validar contra o schema** (`validar(obj, schema)` com `ErroDeSchema` citando o campo; `tipo_confere(valor, tipo)`)
  3. **Exercício (código) · Extrair com ciclo de reparo** (`extrair_com_reparo(cliente, prompt, schema, max_tentativas=3)`: devolve a resposta inválida e o erro exato ao modelo; `"length"` levanta na hora)
  4. **Leitura · Chamadas de ferramentas** (Mermaid `sequenceDiagram`; `arguments` em texto JSON; mensagem `assistant` com os `tool_calls` antes das mensagens `tool`; lista de permitidas; erro vira resultado)
  5. **Exercício (código) · O ciclo de uma ferramenta** (`executar_ferramenta(chamada, ferramentas)` com `ErroDeFerramenta`; `ciclo_de_ferramenta(cliente, mensagens, ferramentas)` de uma rodada, vários pedidos, `tool_call_id`, sem mutar a lista)
  6. **Quiz · JSON, reparo e ferramentas**
- Nota: o laço com limite de passos fica para o módulo 5.

### n7-m1-05-escolha-de-modelos-e-multimodalidade · Escolha de modelos, multimodalidade e modelos abertos
- **Arquivo:** `01-llms-e-apis/05-escolha-de-modelos-e-multimodalidade.lvl.md` · 80 XP · 30 min
- **Passos (6):** sem Previsão.
  1. **Leitura · API comercial ou modelo próprio?** (tabela de critérios; pesos abertos ≠ código aberto; privacidade como requisito eliminatório)
  2. **Leitura · Quanta memória um modelo precisa** (KaTeX: $M_{\text{pesos}} = N \cdot \text{bits}/8$ GB, $M_{\text{KV}} = 2 \cdot L \cdot d \cdot T \cdot \text{bits}_{\text{KV}} / (8 \cdot 10^9)$ GB, $M_{\text{total}} = (M_{\text{pesos}} + M_{\text{KV}})(1 + \text{margem})$ com margem de 10 %; GQA citada)
  3. **Exercício (código) · Cabe na GPU?** (`memoria_pesos_gb(params_bi, bits)`, `memoria_kv_gb(camadas, d_modelo, tokens, bits_kv=16)`, `roda_local(modelo, bits, tokens, memoria_gb, margem=0.1)`)
  4. **Leitura · Imagens também são tokens, e o ranking não é o seu problema** (KaTeX da nota ponderada normalizada pela soma dos pesos; eliminatórios antes da nota)
  5. **Exercício (código) · Ranquear candidatos com a sua avaliação** (`ranquear(candidatos, pesos, minimos)` com qualidade = fração de acertos no conjunto próprio; `metricas_de(candidato)`)
  6. **Quiz · Escolha de modelos, quantização e multimodalidade** (4 perguntas; ver "Decisões pendentes")
- Nota: o fator fixo de 1,2 sobre os pesos saiu; a memória é pesos + KV cache explícito + margem de 10 %, porque o KV cache cresce com os tokens em contexto e com os usuários simultâneos.

## Módulo 2 · Prompting

Princípios de prompting, cadeia de pensamento e decomposição medidas em acurácia e custo, templates e versões imutáveis com teste de regressão, e saída estruturada em lote com retentativa, cache e limite de taxa. Todas as lições usam `runtime: python` e o `llm_simulado.py` com um arquivo `modelo_*.py` por lição.

### n7-m2-01-principios-de-prompting · Princípios: instruções claras, contexto, formato e exemplos
- **Arquivo:** `02-prompting/01-principios-de-prompting.lvl.md` · 100 XP · 40 min
- **Passos (7):**
  1. **Leitura · Prompt vago, saída imprevisível** (Mermaid dos blocos do prompt; papel sozinho não ensina regra; delimitador reduz confusão mas não impede injeção)
  2. **Previsão · O mesmo pedido, quatro prompts**
  3. **Exercício (lacunas) · Monte as mensagens do classificador** (`montar_mensagens(papel, tarefa, categorias, entrada)` com `", ".join`, `entrada.strip()` e o dado só na mensagem `user`)
  4. **Leitura · Exemplos (few-shot): mostrar em vez de descrever** (Visualizar; viés de maioria, de recência e cópia de superfície; exemplos fora do conjunto de avaliação; custo em tokens)
  5. **Exercício (código) · Few-shot balanceado e alternado** (`montar_few_shot(sistema, exemplos, entrada, por_classe=1)` em rodadas `A1, B1, C1, A2…`)
  6. **Exercício (código) · Medir variantes de prompt em casos rotulados** (`comparar_variantes(cliente, variantes, casos)` com erros por id, igualdade exata, empate mantém a versão atual e `ValueError("sem casos")`)
  7. **Quiz · Prompts no cenário**

### n7-m2-02-decomposicao-e-cadeia-de-pensamento · Decomposição de tarefas e cadeia de pensamento
- **Arquivo:** `02-prompting/02-decomposicao-e-cadeia-de-pensamento.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · O que a cadeia de pensamento faz (e o que não faz)** (KaTeX de custo e latência; quando ajuda e quando não; o raciocínio não é prova; marcador `RESPOSTA_FINAL:`)
  2. **Exercício (ordenar) · Separe o veredito do rascunho** (`extrair_resposta_final(texto, marcador="RESPOSTA_FINAL:")`: última ocorrência, primeira linha não vazia, `None` se cortado)
  3. **Previsão · Acerto contra custo**
  4. **Exercício (código) · Meça o efeito da cadeia de pensamento** (`avaliar_modo(cliente, problemas, modo, max_tokens=200)` com acurácia, tokens de saída e truncamentos)
  5. **Leitura · Uma chamada grande ou várias pequenas** (Mermaid + KaTeX: $P_{\text{cadeia}} = \prod p_i$ e custo por etapa)
  6. **Exercício (código) · Pipeline com validação entre etapas** (`executar_pipeline(cliente, mensagem)` com `ErroDeEtapa(etapa, motivo)` e soma de tokens; `custo_de_pipeline(etapas, precos)` com modelo por etapa)
  7. **Quiz · Quando pensar em voz alta e quando dividir**
- Nota: a "autoverificação" é feita pelo código (validar cada etapa, refazer a conta determinística), não pelo modelo conferindo a si mesmo.

### n7-m2-03-templates-e-versionamento-de-prompts · Templates, variáveis e versionamento de prompts
- **Arquivo:** `02-prompting/03-templates-e-versionamento-de-prompts.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · O prompt de produção é um template** (`str.format` com JSON → `KeyError`; variável faltando em silêncio; dado re-renderizado; `re.sub` numa passada)
  2. **Previsão · Três jeitos de preencher o mesmo template**
  3. **Exercício (lacunas) · Renderize numa passada só** (`renderizar(template, variaveis)` com `VariavelFaltante`)
  4. **Exercício (código) · Escape o dado antes de delimitar** (`escapar(texto)` com `&` primeiro, `delimitar(texto, tag="entrada")`; escapar não impede o modelo de obedecer)
  5. **Leitura · Versões imutáveis e testes de regressão** (Mermaid; versão + hash SHA-256 de 8 dígitos no log; versão publicada não se edita; teste exato para o determinístico, medição com tolerância para o modelo)
  6. **Exercício (código) · Biblioteca de prompts com registro de versão** (`BibliotecaDePrompts` com `registrar`, `obter`, `listar_versoes`; `chamar_versionado(cliente, biblioteca, nome, variaveis, pedido, registro, versao=None)`)
  7. **Exercício (código) · Teste de regressão entre duas versões** (`comparar_versoes(cliente, biblioteca, nome, antiga, nova, casos, variaveis)` com regressões, melhorias e aprovação só sem regressão)
  8. **Quiz · Templates, versões e regressão**

### n7-m2-04-saida-estruturada-em-escala · Saída estruturada em escala: lotes, validação e custo
- **Arquivo:** `02-prompting/04-saida-estruturada-em-escala.lvl.md` · 110 XP · 45 min
- **Passos (7):**
  1. **Leitura · Um lote não é um laço de chamadas** (Mermaid do remédio por tipo de falha; truncada → `max_tokens` maior; inválida → reparo; toda tentativa custa)
  2. **Previsão · Onde o JSON quebra** (mensagens reais do `json`)
  3. **Exercício (código) · Leia a saída sem adivinhar** (`ler_saida(texto, campos)` com `ErroDeSaida`, cerca de Markdown, objeto, presença e tipo)
  4. **Exercício (código) · Lote com retentativa por tipo de falha** (`processar_item(...)`, `processar_lote(cliente, itens, campos, max_tentativas=3, max_tokens=40)` com tokens de todas as tentativas e limite dobrado só para o item cortado)
  5. **Exercício (código) · Cache com a chave completa** (Visualizar `str(dict)` × JSON ordenado; `CacheDeRespostas` com `chave`, `obter`, `guardar` e `estatisticas`; SHA-256 de modelo + mensagens + parâmetros; não guarda truncada nem temperatura > 0)
  6. **Exercício (código) · Limitador de taxa e o tempo do lote** (KaTeX; `LimitadorDeTaxa(limite_por_minuto, relogio, dormir)` com `aguardar_vez`; `inicio_da_ultima_chamada(n_chamadas, rpm)`)
  7. **Quiz · Lotes no cenário**

## Módulo 3 · Embeddings e busca vetorial

Embeddings de texto com o modelo trocável, busca exata vetorizada e o seu custo, índices aproximados (IVF, HNSW, LSH e PQ) e chunking avaliado na recuperação. Todas as lições usam `runtime: python-dados` com `bibliotecas: [numpy]`.

### n7-m3-01-embeddings-de-texto · Embeddings de texto
- **Arquivo:** `03-embeddings-e-busca-vetorial/01-embeddings-de-texto.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Um vetor para o texto inteiro** (Mermaid + KaTeX; só compare vetores do mesmo modelo; `modelo.embutir(textos)` em lote)
  2. **Leitura · O modelo de embedding simulado do curso** (o `EmbedderSimulado` e a tabela "modelo real × simulador")
  3. **Previsão · Comprimento não é significado**
  4. **Leitura · Cosseno, normalização L2 e o vetor nulo** (Visualizar + KaTeX; `axis=1, keepdims=True`; norma zero → `nan`)
  5. **Exercício (lacunas) · Normalizar em lote e comparar** (`normalizar_linhas(matriz)` preservando a linha nula, `matriz_cosseno(a, b)`)
  6. **Exercício (código) · Busca semântica com um modelo trocável** (`mais_similares(modelo, consulta, documentos, k)`; a verificação injeta também um `ModeloFixo`)
  7. **Exercício (código) · Encontrar quase duplicatas** (`pares_duplicados(modelo, textos, limiar)` com $i < j$)
  8. **Quiz · Embeddings na prática**

### n7-m3-02-busca-knn-em-numpy · Busca por vizinhos mais próximos em numpy
- **Arquivo:** `03-embeddings-e-busca-vetorial/02-busca-knn-em-numpy.lvl.md` · 110 XP · 45 min
- **Passos (7):** sem Mermaid nem visualizar; o recurso visual é a Previsão.
  1. **Leitura · Força bruta vetorizada e o seu custo** (KaTeX: $\text{FLOPs} = 2Nd$ e tempo por consulta; memória em `float32`)
  2. **Previsão · argsort, argpartition e empates**
  3. **Leitura · Top-k em tempo linear, com empates resolvidos** (KaTeX: $O(N) + O(k \log k)$; regra do menor índice, inclusive na fronteira)
  4. **Exercício (ordenar) · top_k com desempate** (`top_k(scores, k)`)
  5. **Exercício (código) · Busca em lote e quanto ela custa** (`buscar_em_lote(E, Q, k)`, `estimar_busca_exata(n_docs, dim, gflops, consultas_por_segundo, bytes_por_valor=4)`)
  6. **Exercício (código) · Índice exato com filtro de metadados** (`IndiceExato` com `adicionar` e `buscar` com pré-filtro)
  7. **Quiz · Busca exata, top-k e filtros**

### n7-m3-03-indices-vetoriais-aproximados · Índices vetoriais aproximados: IVF, HNSW e quantização
- **Arquivo:** `03-embeddings-e-busca-vetorial/03-indices-vetoriais-aproximados.lvl.md` · 120 XP · 50 min
- **Passos (8):** sem lacunas, ordenar nem visualizar.
  1. **Leitura · Trocar exatidão por velocidade, e medir quanto se perdeu** (KaTeX do recall@k contra a busca exata)
  2. **Leitura · IVF: dividir o espaço e sondar poucas listas** (Mermaid + KaTeX do custo; k-means esférico; grupo vazio mantém o centróide; `nprobe = nlist` é mais lento que a força bruta)
  3. **Previsão · O vizinho do outro lado da fronteira**
  4. **Exercício (código) · Implementando o IndiceIVF** (`IndiceIVF(nlist, nprobe=1)` com `treinar`, `adicionar`, `buscar` devolvendo ids globais)
  5. **Exercício (código) · Curva recall × custo e escolha de nprobe** (`recall_em_k(aproximados, exatos)`, `curva_recall_custo(indice, E, consultas, nprobes, k=3)` restaurando o `nprobe`, `escolher_nprobe(curva, recall_minimo)`)
  6. **Leitura · HNSW, LSH e quantização de produto** (KaTeX: $P(\text{mesmo bit}) = 1 - \theta/\pi$; IVF-PQ com re-pontuação)
  7. **Exercício (código) · Quantização de produto: codificar e reconstruir** (`codificar_pq(E, codebooks)`, `reconstruir_pq(codigos, codebooks)`, `compressao(dim, m, bytes_por_valor=4)`)
  8. **Quiz · IVF, HNSW e quantização**

### n7-m3-04-chunking-de-documentos · Chunking de documentos
- **Arquivo:** `03-embeddings-e-busca-vetorial/04-chunking-de-documentos.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · Por que fatiar antes de indexar** (Mermaid das três estratégias; metadados `fonte`, `titulo`, `posicao`; tamanho em caracteres aqui, em tokens em produção)
  2. **Exercício (lacunas) · Janela fixa com sobreposição** (`chunk_fixo(texto, tamanho, sobreposicao=0)` devolvendo dicionários com offsets e `ValueError` quando `sobreposicao >= tamanho`)
  3. **Leitura · Respeitar as fronteiras do texto** (Visualizar do agrupamento guloso; abreviações como "Art." e "Prof."; título só com `#` seguido de espaço)
  4. **Previsão · Onde o ponto engana**
  5. **Exercício (código) · Sentenças inteiras até max_chars** (`dividir_sentencas(texto)`, `chunk_por_sentencas(texto, max_chars)`)
  6. **Exercício (código) · Seções do Markdown com caminho de títulos** (`chunk_por_markdown(texto, fonte)` com "Regimento > Trancamento: …" dentro do texto embutido)
  7. **Exercício (código) · Medindo o efeito do chunking na recuperação** (`avaliar_chunking(modelo, estrategia, documentos, perguntas, k=3)` com `trecho_esperado` e tamanho médio dos trechos)
  8. **Quiz · Tamanho, sobreposição e avaliação**

## Módulo 4 · RAG: geração aumentada por recuperação

Pipeline RAG com recusa e fontes, avaliação separada de recuperação e geração com juiz calibrado, BM25, fusão por min-max e RRF com re-ranking, e RAG conversacional com reformulação, decomposição, roteamento e auditoria de citações. Todas as lições usam `runtime: python-dados` com `bibliotecas: [numpy]`.

### n7-m4-01-pipeline-rag-completo · Pipeline RAG completo
- **Arquivo:** `04-rag/01-pipeline-rag-completo.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Recuperar antes de gerar** (Mermaid; indexação × consulta; saída com `resposta`, `recusou`, `enviados`, `fontes`)
  2. **Leitura · O prompt aterrado** (instrução no `system`, trechos no `user` como `[n] (fonte) texto`, um por linha; recusa exata; limiar e instrução como duas camadas)
  3. **Exercício (lacunas) · Montar o prompt com trechos numerados** (`montar_prompt(pergunta, trechos)` → `[system, user]`)
  4. **Leitura · Quanto contexto cabe** (Visualizar + KaTeX do orçamento da janela; medir com o contador do modelo, nunca com `len(texto.split())`; parar no primeiro que não cabe)
  5. **Previsão · Parar ou pular**
  6. **Exercício (código) · Caber na janela sem cortar trechos** (`tokens_do_prompt(mensagens)`, `caber_na_janela(pergunta, trechos, janela, max_tokens)`)
  7. **Exercício (código) · O pipeline inteiro, com recusa e fontes** (`PipelineRAG(modelo, cliente, limiar=0.3, janela=400, max_tokens=80)` com `indexar` e `responder`; `[n]` traduzido pela lista enviada)
  8. **Quiz · Decisões do pipeline**

### n7-m4-02-avaliacao-de-rag · Avaliação de RAG: recuperação e resposta
- **Arquivo:** `04-rag/02-avaliacao-de-rag.lvl.md` · 120 XP · 50 min
- **Passos (8):** sem visualizar.
  1. **Leitura · Duas etapas, duas avaliações** (Mermaid do diagnóstico; KaTeX de recall@k, precisão@k e MRR; pergunta sem relevante fora das médias da busca; gabarito ligado à versão do índice)
  2. **Previsão · Mais recall, menos MRR**
  3. **Exercício (lacunas) · Métricas de uma consulta** (`metricas_consulta(recuperados, relevantes, k)`)
  4. **Exercício (código) · Avaliar a busca num conjunto** (`avaliar_recuperacao(buscar, conjunto, ids_validos, k=3)` conferindo os ids do gabarito)
  5. **Leitura · Avaliar a resposta, e o juiz que também erra** (fidelidade × correção; vieses do juiz; JSON inválido = sem veredito; calibração com falsos aprovados)
  6. **Exercício (código) · Juiz em JSON e calibração contra rótulos humanos** (`julgar(cliente, pergunta, resposta, trechos)`, `calibrar(julgamentos, humanos)`)
  7. **Exercício (código) · Diagnóstico por etapa** (`classificar(caso)`, `diagnosticar(casos)`)
  8. **Quiz · Ler os números da avaliação**

### n7-m4-03-re-ranking-e-busca-hibrida · Re-ranking e busca híbrida com BM25
- **Arquivo:** `04-rag/03-re-ranking-e-busca-hibrida.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · O que a busca vetorial não vê** (KaTeX do BM25 com IDF $\ln(1 + \frac{N - n_t + 0{,}5}{n_t + 0{,}5})$; saturação $k_1$, tamanho $b$; consulta com a mesma tokenização dos documentos)
  2. **Previsão · Saturação e tamanho**
  3. **Exercício (código) · BM25 do zero** (`tokenizar(texto)`, `IndiceBM25(textos, k1=1.2, b=0.75)` com `idf` e `pontuar`)
  4. **Leitura · Juntar duas listas: escalas, min-max e RRF** (Mermaid + Visualizar + KaTeX de min-max e de $\text{RRF}(d) = \sum 1/(k + \text{pos})$ com $k = 60$)
  5. **Exercício (ordenar) · Reciprocal Rank Fusion** (`rrf(rankings, k=60)`)
  6. **Exercício (código) · Fusão ponderada com min-max** (`normalizar_min_max(escores)`, `fundir_ponderado(lexicos, vetoriais, alfa=0.5)`)
  7. **Exercício (código) · Busca híbrida com re-ranking, escolhida pelos dados** (`BuscaHibrida(modelo, trechos, reranker, n_candidatos=6)` com `vetorial`, `lexica`, `hibrida`, `reranqueada`; `escolher_estrategia(busca, conjunto, k)`)
  8. **Quiz · Escalas, parâmetros e custo**

### n7-m4-04-rag-avancado · RAG avançado: reformulação, roteamento, citações verificáveis e conversa
- **Arquivo:** `04-rag/04-rag-avancado.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · A pergunta que só faz sentido na conversa** (Mermaid da conversa com roteador e auditoria; quando chamar, quantos turnos, guardar a pergunta reformulada, voltar à original se a reescrita falhar; `historico[-n:]` com `n = 0` devolve a lista inteira)
  2. **Exercício (código) · Reescrever a pergunta com o histórico** (`reformular(cliente, historico, pergunta, max_turnos=2)`, `uma_linha(texto)`)
  3. **Previsão · O " e " que não separa perguntas**
  4. **Exercício (código) · Decompor e buscar cada parte** (`decompor(cliente, pergunta, max_partes=3)` em JSON; acima de `max_partes`, busca a pergunta inteira; `buscar_subconsultas(buscar, subperguntas, k)`)
  5. **Leitura · Citações que se conferem e o roteador** (KaTeX da cobertura; status órfã, número divergente, sem apoio e sem citação; `[0]` engana; negação escapa; roteador com `nenhum`, rótulo normalizado e validado)
  6. **Exercício (código) · Auditar as citações da resposta** (`auditar_citacoes(resposta, enviados, minimo=0.6)` com status `"orfa"`, `"numero_divergente"`, `"sem_apoio"`, `"sem_citacao"`, `"ok"`)
  7. **Exercício (código) · Roteamento e a conversa inteira** (`rotear(cliente, pergunta, disponiveis)` → rota ou `"nenhum"`; `Assistente(cliente, pipelines, max_turnos=2).perguntar(pergunta)`; auditoria reprovada vira `RECUSA`)
  8. **Quiz · Conversa, rotas e citações**
- Nota: o `Assistente` não decompõe; a decomposição fica no passo 4.

## Módulo 5 · Agentes e ferramentas

O loop ReAct com rastro e detecção de loop, contratos de ferramentas com validação e permissões, memória curta, longa e estado da tarefa, e guardrails (orçamento, confirmação humana, testes com dublês). Todas as lições usam `runtime: python`. Nenhum caso depende da contagem de tokens do simulador.

### n7-m5-01-loop-de-agente-react · O loop de agente (ReAct)
- **Arquivo:** `05-agentes-e-ferramentas/01-loop-de-agente-react.lvl.md` · 130 XP · 55 min
- **Passos (7):**
  1. **Leitura · Do ciclo de uma ferramenta ao agente** (Mermaid + Visualizar do rastro; protocolo `Pensamento:`/`Acao: nome({json})`/`Observacao:`/`Resposta Final:`; a observação é escrita pelo código; `max_passos` contado em chamadas)
  2. **Previsão · Resposta no passo 2 ou parada por limite**
  3. **Exercício (lacunas) · Interpretar a saída do modelo** (`interpretar_acao(texto)`: vale o que aparece primeiro; observação inventada é cortada; JSON malformado → `None`)
  4. **Leitura · Onde o loop quebra, e o que o rastro mostra** (KaTeX; formato inválido, observação inventada, resposta prematura, ferramenta alucinada, exceção da ferramenta, loop; o `roteiro.py`)
  5. **Exercício (código) · A classe Agente com rastro** (`Agente(cliente, ferramentas, max_passos=5).executar(pergunta)` com mensagens `assistant` + `user` por passo e exceção da ferramenta virando observação)
  6. **Exercício (código) · Ler o rastro: resumo e detecção de loop** (`resumir_rastro(rastro)`; `detectar_loop(rastro, repeticoes=3)` devolve o passo em que a mesma chamada atinge as repetições, contando ocorrências **não consecutivas** e eventos de erro, ou `None`)
  7. **Quiz · O loop ReAct e suas falhas**

### n7-m5-02-ferramentas-e-roteamento · Definir ferramentas e rotear chamadas
- **Arquivo:** `05-agentes-e-ferramentas/02-ferramentas-e-roteamento.lvl.md` · 110 XP · 45 min
- **Passos (7):** sem visualizar.
  1. **Leitura · O modelo só vê o contrato** (Mermaid da ordem existência → permissão → validação → execução; nenhum caminho levanta exceção para o laço)
  2. **Exercício (lacunas) · O decorador @ferramenta** (`ferramenta(nome, descricao, parametros, permissao="leitura")` conferindo os nomes com a assinatura)
  3. **Previsão · O que o JSON entrega ao Python**
  4. **Leitura · Validar antes de executar, e errar de um jeito útil** (todos os erros numa resposta; tipo antes do resto; `null` em opcional é ausência; identidade vem da sessão)
  5. **Exercício (código) · Validar os argumentos** (`validar_argumentos(esquema, args)` devolve a lista de erros; tipos em texto `"int"`, `"float"`, `"str"`, `"bool"` e `opcoes`)
  6. **Exercício (código) · O catálogo com descrição automática e permissões** (`Catalogo(max_chars=300)` com `registrar`, `permitidas`, `descrever` e `executar(nome, argumentos_json, permissoes)` devolvendo texto de erro em vez de levantar)
  7. **Quiz · Contratos, permissões e efeitos colaterais**

### n7-m5-03-memoria-e-estado · Memória e estado do agente
- **Arquivo:** `05-agentes-e-ferramentas/03-memoria-e-estado.lvl.md` · 110 XP · 45 min
- **Passos (8):** sem Previsão.
  1. **Leitura · Três memórias, três problemas** (Mermaid; o modelo propõe, o código decide; memória é dado pessoal)
  2. **Exercício (ordenar) · O estado da tarefa** (`EstadoDaTarefa(campos)` com validadores, `atualizar`, `faltantes`, `completo`)
  3. **Leitura · A janela e o resumo** (Visualizar; compactação em lote; o resumidor recebe o resumo anterior; preservar RA, códigos, protocolos e datas)
  4. **Exercício (código) · Memória curta com compactação** (`MemoriaCurta(limite, manter, resumidor)` com `adicionar` e `contexto`; `resumidor_com_llm(cliente)`)
  5. **Leitura · Memória longa e o estado salvo em disco** (KaTeX de Jaccard; mais recente no empate; isolamento por usuário; JSON com versão, revalidação e gravação atômica com `os.replace`)
  6. **Exercício (código) · Memória longa por similaridade** (`termos(texto)`, `jaccard(a, b)`, `MemoriaLonga` com `lembrar(usuario, texto)`, `recordar(usuario, consulta, k)`, `esquecer(usuario)`)
  7. **Exercício (código) · Salvar e retomar o estado da tarefa** (`salvar_estado(estado, caminho)`, `carregar_estado(caminho, campos)`)
  8. **Quiz · Memória, estado e privacidade**
- Nota: a similaridade é lexical (Jaccard) porque a lição não tem numpy; a leitura diz que em produção seria a busca do módulo 3.

### n7-m5-04-falhas-de-agentes-e-guardrails · Falhas de agentes e guardrails
- **Arquivo:** `05-agentes-e-ferramentas/04-falhas-de-agentes-e-guardrails.lvl.md` · 110 XP · 45 min
- **Passos (8):** sem lacunas, ordenar nem visualizar.
  1. **Leitura · O que dá errado com agentes, e onde cercar** (tabela falha × rastro × guardrail; injeção indireta pelas ferramentas; Mermaid das camadas; KaTeX do custo médio por sucesso)
  2. **Previsão · Qual limite para o agente**
  3. **Exercício (código) · O orçamento de execução** (`OrcamentoEstourado(motivo)`; `Orcamento(max_passos, max_tokens, max_ms, relogio)` com `liberar()` antes de cada chamada e `registrar(resposta)`)
  4. **Exercício (código) · Classificar rastros e medir o custo por sucesso** (`detectar_loop`, `classificar_rastro(rastro, exige_evidencia=True)` com `"resposta_sem_evidencia"`, `metricas(execucoes)`)
  5. **Leitura · Confirmação humana e testes com dublês** (só `True` aprova; executar o que foi mostrado; auditoria; leituras sem confirmação; modelo roteirizado e ferramentas espiãs)
  6. **Exercício (código) · O guardrail de confirmação** (`executar_com_confirmacao(catalogo, nome, args, confirmar=None, auditoria=None)`)
  7. **Exercício (código) · Uma suíte de testes para o agente** (`unittest` sobre `rodar_agente(roteiro, ferramentas, confirmar=None, max_passos=4)` de `agente.py`, com `ferramentas_espias()` e mutantes)
  8. **Quiz · Guardrails, confirmação e testes**

## Módulo 6 · Avaliação, segurança e ética

Conjuntos de avaliação por fatia, juiz calibrado com $\kappa$ e portão de regressão, injeção de prompt e defesa em camadas medida por ASR, privacidade e LGPD, e uso responsável com teste contrafactual, transparência e system card. Todas as lições usam `runtime: python`; só a m6-02 usa modelo (o `modelo_vulneravel.py`), e as demais trabalham com juízes e sistemas de brinquedo declarados no texto.

### n7-m6-01-avaliacao-de-sistemas-com-llm · Avaliação de sistemas com LLM
- **Arquivo:** `06-avaliacao-seguranca-e-etica/01-avaliacao-de-sistemas-com-llm.lvl.md` · 120 XP · 50 min
- **Passos (8):**
  1. **Leitura · Cinco perguntas não são uma avaliação** (Mermaid; fatias `"facil"`, `"dificil"`, `"adversarial"`, `"fora_de_escopo"`; contaminação; KaTeX do erro padrão $\sqrt{p(1-p)/n}$)
  2. **Exercício (código) · Auditar o conjunto antes de medir** (`normalizar(texto)`, `auditar_conjunto(casos, exemplos_do_prompt, minimo_por_fatia=10)`)
  3. **Previsão · Concordância de 90 % com quem?**
  4. **Leitura · O juiz também precisa ser avaliado** (Visualizar do viés de posição; KaTeX do $\kappa$; rubrica analítica; gabarito vazado; calibrar e medir em amostras separadas)
  5. **Exercício (lacunas) · O kappa de Cohen para qualquer número de categorias** (`kappa_de_cohen(rotulos_a, rotulos_b)`)
  6. **Exercício (código) · Juiz por rubrica e comparação sem viés de posição** (`julgar_com_rubrica(caso, resposta)` com 4 critérios e nota de 0 a 4; `comparar_sem_vies(juiz, pergunta, a, b)`)
  7. **Exercício (código) · Painel por versão e portão de regressão** (`painel_por_versao(casos, resultados, tolerancia=0.0)` por fatia, com casos faltando e regressões críticas)
  8. **Quiz · Juízes, conjuntos e versões**

### n7-m6-02-prompt-injection-e-defesas · Prompt injection e defesas
- **Arquivo:** `06-avaliacao-seguranca-e-etica/02-prompt-injection-e-defesas.lvl.md` · 130 XP · 55 min
- **Passos (8):**
  1. **Leitura · Instrução e dado no mesmo canal** (Mermaid; direta × indireta; jailbreak; objetivos do ataque; o dublê vulnerável)
  2. **Previsão · O modelo obedece a quem?**
  3. **Exercício (ordenar) · Isolar o conteúdo externo** (`isolar_dados(trechos)` com `<documento id="n">`, escape e quebras colapsadas)
  4. **Leitura · Defesa em camadas, medida por uma suíte** (tabela das camadas e de onde cada uma falha; detector como sinal, não bloqueio; privilégio pela origem; URL pelo host com `urllib.parse`; KaTeX da ASR)
  5. **Exercício (código) · Um detector que não cai no primeiro disfarce** (`normalizar_para_deteccao(texto)` com NFKD e invisíveis, `detectar_injecao(texto)`, `varrer_entradas(pergunta, trechos)`)
  6. **Exercício (código) · Privilégio mínimo e validação da saída** (`ferramentas_permitidas(catalogo, nao_confiavel)`, `validar_saida(resposta, segredos, dominios)` → `(False, "segredo" | "url_nao_permitida")`)
  7. **Exercício (código) · O pipeline defendido e a suíte adversarial** (`responder_com_defesa(cliente, pergunta, trechos, catalogo, segredos, dominios)` contra `responder_ingenuo`; `suite_adversarial(sistema, ataques)` com `sucessos`, `por_tipo` e `erros`)
  8. **Quiz · Ataques e defesas em cenários**
- Nota: a suíte tem 5 ataques e termina com ASR 0,2 de propósito (risco residual de desinformação); não há meta de 0,05.

### n7-m6-03-privacidade-e-lgpd · Privacidade e LGPD em sistemas com IA
- **Arquivo:** `06-avaliacao-seguranca-e-etica/03-privacidade-e-lgpd.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · Onde o dado pessoal entra, e onde ele fica** (Mermaid + Visualizar; art. 5º I–III; pseudonimização continua dado pessoal; quase-identificadores)
  2. **Previsão · Sem nome, mas não anônimo**
  3. **Exercício (lacunas) · Detectar CPF de verdade, e-mail e telefone** (`cpf_valido(digitos)` com dígito verificador, `detectar_dados_pessoais(texto)`)
  4. **Exercício (código) · Pseudonimizar a conversa inteira** (`mascarar(texto, mapa=None)` numa passada com `[CPF_n]`, `[EMAIL_n]`, `[TEL_n]`; `desmascarar(texto, mapa)`)
  5. **Leitura · Da lei às decisões de projeto** (tabela requisito × decisão: arts. 6º, 7º, 11, 15, 16, 18, 20, 33, 37, 41 e 46; log por lista de permitidos; HMAC com chave; retenção por finalidade)
  6. **Exercício (código) · Log minimizado e retenção** (`pseudonimo(ra, chave)`, `log_minimizado(evento, chave)`, `aplicar_retencao(registros, hoje, prazos, pedidos_de_eliminacao, chave)` → `{"mantidos", "eliminados"}`)
  7. **Exercício (código) · Auditar um fluxo de tratamento** (`auditar_tratamento(fluxo)` com pendências `base_legal_invalida`, `transferencia_sem_mecanismo`, `sem_canal_de_revisao`, `sem_prazo_de_retencao`, `log_com_dado_pessoal`)
  8. **Quiz · Privacidade em decisões reais**

### n7-m6-04-uso-responsavel · Uso responsável: viés, alucinação, transparência e limites de uso
- **Arquivo:** `06-avaliacao-seguranca-e-etica/04-uso-responsavel.lvl.md` · 90 XP · 35 min
- **Passos (7):** sem lacunas, ordenar nem visualizar.
  1. **Leitura · Mesmo caso, outro nome: medir disparidade** (Mermaid + KaTeX de $\Delta_{\text{contrafactual}}$; comparar a decisão, não o texto; vários nomes por grupo)
  2. **Previsão · O texto mudou, a decisão também?**
  3. **Exercício (código) · O teste contrafactual** (`extrair_decisao(resposta)`, `medir_disparidade(sistema, cenarios, grupos, positiva="deferido")`)
  4. **Leitura · Dizer o que sabe, de onde veio e até onde vai** (fontes só de citações válidas; confiança medida; declarar IA; escopo com encaminhamento; o system card)
  5. **Exercício (código) · Fontes, incerteza e limites na resposta** (`montar_resposta(texto, trechos, score, limiar, canal)`, `verificar_escopo(pergunta, temas)` → mensagem ou `None`)
  6. **Exercício (código) · O system card** (`gerar_system_card(info)` com 9 chaves: `nome`, `versao`, `finalidade`, `usuarios`, `dados`, `fora_de_escopo`, `limitacoes`, `avaliacao`, `riscos` com mitigação)
  7. **Quiz · Uso responsável em cenários**

## Módulo 7 · MLOps básico e projeto

Serviço de inferência com handlers puros e o roteador `MiniAPI`, empacotamento com hash e registro de modelos, monitoramento com PSI, KS, histerese e rótulos atrasados, e o projeto integrador. A m7-01 e o projeto usam `runtime: python`; a m7-02 e a m7-03 usam `python-dados` com `[numpy]` (ver "O que o executor não tem").

### n7-m7-01-servindo-um-modelo-com-fastapi · Servindo um modelo com FastAPI
- **Arquivo:** `07-mlops-e-projeto/01-servindo-um-modelo-com-fastapi.lvl.md` · 120 XP · 50 min
- **Passos (7):** sem visualizar.
  1. **Leitura · Da função ao serviço HTTP** (rotas `POST /prever`, `GET /saude`, `GET /versao`; FastAPI com `lifespan` como ilustração; o que muda no curso; Mermaid do fluxo com 422 e 500)
  2. **Previsão · Carregar uma vez ou a cada requisição**
  3. **Exercício (lacunas) · Validar o corpo da requisição** (`validar_entrada(corpo, esquema)` devolve a lista de erros; recusa `bool`, `NaN`, infinito e campos desconhecidos)
  4. **Leitura · Erros padronizados e o ciclo de vida do serviço** (404, 405, 422 e 500 com `id`; `ErroHTTP` antes de `Exception`; carregar uma vez por serviço; workers; `pickle` vindo da rede; Dockerfile)
  5. **Exercício (código) · O roteador MiniAPI** (`ErroHTTP(status, detalhe)`, `MiniAPI(gerar_id)` com `rota` e `chamar`)
  6. **Exercício (código) · O serviço de predição** (`criar_servico(carregar_modelo, versao, gerar_id)` com `servico_base.py`)
  7. **Quiz · Subida, workers e erros**

### n7-m7-02-empacotamento-e-versionamento-de-modelos · Empacotamento, versionamento e reprodutibilidade
- **Arquivo:** `07-mlops-e-projeto/02-empacotamento-e-versionamento-de-modelos.lvl.md` · 100 XP · 40 min
- **Passos (8):**
  1. **Leitura · O artefato é o pipeline inteiro** (training-serving skew; `Pipeline` + `joblib` como ilustração; tabela de metadados; Mermaid da promoção)
  2. **Previsão · Padronizar com as estatísticas de quem?**
  3. **Exercício (ordenar) · O hash dos dados de treino** (`hash_dos_dados(X, y)` com forma, `float64` contíguo e `y`)
  4. **Exercício (código) · Um pipeline que aprende uma vez e só aplica depois** (`PipelinePadronizado` com `fit` e `predict`)
  5. **Leitura · Salvar com segurança e registrar versões** (Visualizar do registro com rollback; hash antes de desserializar; versões de bibliotecas; imutabilidade; pilha persistida)
  6. **Exercício (código) · Salvar e carregar o artefato com verificação** (`sha256_arquivo(caminho)`, `salvar_modelo(objeto, caminho, metadados, bibliotecas)`, `carregar_modelo(caminho, bibliotecas)`)
  7. **Exercício (código) · O registro de modelos** (`RegistroDeModelos(agora)` com `registrar`, `promover(versao, metrica="f1", minimo=0.75)`, `rollback`, `para_json`, `de_json`)
  8. **Quiz · Artefatos, versões e registro**
- Nota: não há ambiente `staging`; a promoção é do registro para produção.

### n7-m7-03-monitoramento-e-drift · Monitoramento e detecção de drift
- **Arquivo:** `07-mlops-e-projeto/03-monitoramento-e-drift.lvl.md` · 110 XP · 45 min
- **Passos (8):**
  1. **Leitura · O modelo em produção envelhece** (saúde, drift de dados e drift de conceito; p95 pelo posto mais próximo; log estruturado com versão; Mermaid com alerta por histerese e campeão × desafiante)
  2. **Exercício (código) · Log estruturado e resumo operacional** (`medir_predicao(log, id_req, versao, entrada, prever, relogio)`, `resumo_operacional(log)` por versão)
  3. **Leitura · PSI e KS: medir o afastamento sem rótulo** (Visualizar + KaTeX do PSI e de $D_{\text{crit}}$; faixas pelos quantis da referência, pontas no infinito, piso $10^{-4}$; limites 0,10 e 0,25 como convenção)
  4. **Previsão · Bordas próprias, bordas da referência e a faixa vazia**
  5. **Exercício (código) · PSI, KS e o relatório por atributo** (`bordas_da_referencia`, `calcular_psi(referencia, producao, n_bins=5, piso=0.0001)`, `estatistica_ks(a, b)`, `drift_por_atributo(X_ref, X_prod, nomes, limiar_psi=0.25, alpha=0.05, n_bins=5)`)
  6. **Exercício (código) · Um alerta que não fica piscando** (`MonitorDeDrift(disparo=0.25, rearme=0.1, consecutivas=2, minimo_amostras=200)` com `observar`)
  7. **Exercício (código) · Rótulos atrasados e a decisão de retreino** (`desempenho_atrasado(log, rotulos, versao, minimo=30)`, `decidir_retreino(psi_max, acuracia_ref, acuracia_atual, campeao, desafiante, limiar_psi=0.25, queda_max=0.05, margem=0.01)` com campeão e desafiante no mesmo conjunto)
  8. **Quiz · Ler os sinais e decidir**

### n7-m7-04-projeto-assistente-da-secretaria · Projeto final: assistente de atendimento da secretaria
- **Arquivo:** `07-mlops-e-projeto/04-projeto-assistente-da-secretaria.lvl.md` · projeto do nível (`projeto: true`, `runtime: python`) · 300 XP · 240 min
- **Passos (9):** só exercícios de código livre; a partir do passo 5, as soluções dos passos anteriores vêm prontas em arquivos.
  1. **Leitura · O que você vai construir** (tabela passo × peça × módulo de origem; Mermaid da arquitetura; o que é simulado; KaTeX das metas; regras de segurança)
  2. **Exercício (código) · O índice híbrido** (`IndiceHibrido(trechos, embedder, k_rrf=60, profundidade=10)`)
  3. **Exercício (código) · Proteções: mascarar, isolar, auditar** (`mascarar(texto)`, `montar_prompt_isolado(pergunta, trechos)`, `auditar_resposta(resposta, n_enviados, dominios)`)
  4. **Exercício (código) · O modelo escolhe, o código executa** (`executar_plano(saida_modelo, catalogo, sessao, confirmar=None, auditoria=None)`)
  5. **Exercício (código) · O assistente inteiro** (`AssistenteSecretaria(indice, gerador, planejador, catalogo, confirmar=None, max_turnos=2, dominios=DOMINIOS).responder(pergunta, sessao)`)
  6. **Exercício (código) · Avaliar contra as metas** (`avaliar_sistema(assistente, conjunto, ataques, trechos_por_id, metas, minimo_cobertura=0.6)`)
  7. **Exercício (código) · A API do assistente** (`validar_pergunta(corpo, max_caracteres=500)`, `criar_api(fabrica, versao, gerar_id, relogio)`)
  8. **Exercício (código) · O system card sai do relatório** (`gerar_system_card(relatorio, versao, data)`)
  9. **Quiz · Decisões de arquitetura do assistente**

## Projeto final — Assistente de atendimento da secretaria (especificação)

**Arquivo:** `07-mlops-e-projeto/04-projeto-assistente-da-secretaria.lvl.md` · slug `n7-m7-04-projeto-assistente-da-secretaria` · `projeto: true` · 300 XP · 240 min. Exigido para o certificado do Nível 7 e a conclusão da trilha.

### Objetivo

Construir e verificar, em Python puro e sem rede, o **assistente de atendimento da secretaria acadêmica**: responde dúvidas sobre regimento, calendário e serviços citando a fonte; consulta datas e calcula prazos; abre protocolos só com a identidade da sessão e a confirmação do aluno; recusa o que está fora do escopo; não deixa dado pessoal chegar ao modelo nem ao log; e chega à produção com números de avaliação e um *system card*.

### Reaproveitamento

Os modelos são os simuladores do curso, byte a byte: `llm_simulado.py` (m1), `modelo_rag.py` (m4), `roteiro.py` (m5) e o novo `modelo_planejador.py`. A busca usa `bm25.py` (o `IndiceBM25` do m4-03) e `busca.py` (`EmbedderPuro`, `cosseno` e `rrf`), porque o runtime não tem numpy. `dados_secretaria.py` traz o mesmo `CORPUS` do `pipeline_rag.py` mais 5 trechos extras: `disc-101` e `disc-202` (códigos para o BM25), `faq-09` (recado com instrução injetada), `faq-10` (link para domínio de fora) e `faq-11` (link legítimo). A API usa o `MiniAPI` da m7-01 (`api_base.py`).

### Componentes e funções exigidas

| Componente / Função | Comportamento exigido | Verificação |
|---|---|---|
| `IndiceHibrido(trechos, embedder, k_rrf=60, profundidade=10)` com `ranking_lexico`, `ranking_vetorial` e `buscar(consulta, k=3)` | Guarda cópias dos trechos; embute todos os textos numa única chamada; o ranking léxico só tem escore > 0; empates por id crescente; funde as duas listas inteiras por RRF e devolve cópias dos `k` primeiros | `expr` (recall@3 no `CONJUNTO`, consulta só com um código raro, uma chamada ao embedder para o corpus) |
| `mascarar(texto)`, `montar_prompt_isolado(pergunta, trechos)`, `auditar_resposta(resposta, n_enviados, dominios)` | E-mail e CPF (com ou sem pontuação) viram `[EMAIL_n]` e `[CPF_n]` antes de qualquer modelo, a mesma pessoa com a mesma etiqueta; trechos como dado, `[n] (fonte) texto` numa linha só; a auditoria aponta `"sem_citacao"` ou `"citacao_invalida"`, `"url_externa"` (domínio fora da lista e dos subdomínios) e `"dado_pessoal"` | `call` + `expr` |
| `executar_plano(saida_modelo, catalogo, sessao, confirmar=None, auditoria=None)` | O modelo escolhe a ferramenta e preenche só os seus parâmetros; a identidade vem da sessão; escrita só com `confirmar(...) is True`; o resultado vira status, sem exceção para o laço | `expr` com `Protocolos` espião |
| `AssistenteSecretaria(...).responder(pergunta, sessao)` | Mascara, filtra ataques diretos óbvios, deixa o planejador decidir só pela pergunta, executa ferramentas com identidade e confirmação ou responde por RAG isolado e auditado, recusa fora de escopo e guarda os últimos `max_turnos` turnos | `expr` |
| `avaliar_sistema(assistente, conjunto, ataques, trechos_por_id, metas, minimo_cobertura=0.6)` | `recall_em_3` (média sobre as perguntas com relevantes), `recusa_fora_do_escopo`, `fidelidade` (respostas `"rag"` não recusadas com citação válida e cobertura ≥ `minimo_cobertura`), `sucesso_adversarial` (ação executada ou marcador na resposta); metas `recall_em_3 >= 0.8`, `fidelidade >= 0.9`, `sucesso_adversarial <= 0.1`; métrica `None` não atinge meta | `expr` + `tolerance` |
| `validar_pergunta(corpo, max_caracteres=500)` e `criar_api(fabrica, versao, gerar_id, relogio)` | `GET /saude`, `GET /versao`, `POST /perguntar`; `422` sem logar o corpo inválido; log com a pergunta mascarada pela própria API, status, latência e fontes; atendimento anônimo (`"aluno": None`) | `expr` |
| `gerar_system_card(relatorio, versao, data)` | O card sai do relatório do passo 6: status (aprovado ou as metas não atingidas), seções Finalidade, Fora do escopo, Avaliação (tabela métrica × valor × meta × situação, com `sem dados` para `None`), Riscos e mitigações e Dados pessoais; meta sem métrica levanta `ValueError` | `call` + `expr` |

### Notas

- As metas valem no conjunto fornecido (12 perguntas com gabarito, 3 fora do escopo, 6 ataques), onde a referência tira 1,0 / 1,0 / 0,0; a leitura e o quiz dizem que isso não é prova de robustez. A meta de recall é 0,80 em todo o projeto.
- A suíte `unittest` não faz parte do projeto: testes com dublês e mutantes são o exercício da m5-04.

## Decisões pendentes

- As citações da LGPD na m6-03 foram conferidas de memória e precisam de revisão contra o texto da lei.
