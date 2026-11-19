# Auditoria de qualidade — Níveis 7 e 3 (P5, passos 3 e 4)

Data: 2026-11-15 e 16. Branch `feat/niveis-2-a-7`. Régua: o Nível 1 (`n1-fundamentos`), medida por
`pnpm content:metrics` (`apps/api/scripts/content-metrics.mts`). Métricas de antes em
[`auditoria-metricas-antes.md`](auditoria-metricas-antes.md).

## Resultado

Todas as lições do N7 (28) e do N3 (39) estão na régua, verificadas no executor e publicadas.
Os módulos 7 e 8 do N3, que eram só esboços, foram escritos do zero nesta etapa.

| Média das lições guiadas | N7 antes | N7 depois | N3 antes | N3 depois | N1 (ref.) |
| --- | ---: | ---: | ---: | ---: | ---: |
| passos | 5,4 | 7,5 | 4,2 | 7,8 | 5,9 |
| leituras | 1,0 | 2,1 | 1,6 | 2,9 | 1,4 |
| exercícios | 2,9 | 3,5 | 1,7 | 3,1 | 2,8 |
| palavras por leitura | 284 | 313 | 249 | 301 | 279 |
| casos por exercício | 2,4 | 8,6 | 2,5 | 9,2 | 5,6 |
| soluções erradas por exercício | 2,0 | 6,0 | 1,5 | 5,2 | 4,0 |
| perguntas no quiz | 3,1 | 3,0 | 1,6 | 3,0 | 2,9 |
| Previsões | 0,5 | 0,9 | 0,2 | 0,8 | 0,8 |

Lições suspeitas (abaixo do mínimo do N1 em alguma métrica central): **67 → 0**.

`content:check` e `content:verify --licao` de cada lição terminam em "TODOS OS PASSOS VERIFICADOS";
cada solução errada foi conferida para reprovar pelo defeito que representa, não só "reprovar".

## O que mudou, em termos gerais

- **Casos por comportamento**, um por asserção, com bordas (vazio, empate, ciclo, entrada inválida),
  em vez de 1–2 `expr` juntando várias asserções numa tupla.
- **Soluções erradas reais** (5–8 por exercício), cada uma com um defeito só, no lugar de espantalhos
  como "devolve `[]`" ou "devolve a identidade".
- **Custo verificado por contagem de operações**, nunca por tempo: objetos com `__eq__`/`__lt__`/`__hash__`
  contadores, `property` que conta leituras de `.proximo`/`filhos`, contagem de chamadas, células e
  `heappush`, `tracemalloc`. Laços que uma errada pode tornar infinitos têm limite.
- **Quizzes de 3 perguntas de cenário**, sem distratores absurdos; dicas que não entregam a resposta.
- **Objetivos do frontmatter praticados** em exercício (vários só apareciam no texto).
- **Erros técnicos corrigidos** (exemplos): invariante da deque monotônica, número de nós das N rainhas,
  Teorema Mestre sem a condição de regularidade, regex de citações que reprovava a citação depois do
  ponto (N7 m4), isolamento em tags apresentado como bloqueio de injeção, CPF sem dígito verificador,
  filtro de escopo por substring (`dor` em `coordenador`).
- **Sem atribuição à USP**: nenhuma lição, PLANO ou prova cita USP, IME, `usp.br` ou código real de
  disciplina; exemplos usam nomes e códigos fictícios.

## Simuladores do N7

Um arquivo por papel, com conteúdo idêntico byte a byte em todas as lições que o trazem
(tabela completa na seção "Verificação e convenções do nível" do `PLANO.md` do N7):
`llm_simulado.py` (cliente com tokens aproximados, custo, latência, temperatura e erros; desde
`4fbf9d1` preserva quebras de linha), `embedder_simulado.py`, `roteiro.py` (dublê roteirizado para
agentes), `modelo_*.py`, `pipeline_rag.py`, `reranker_simulado.py`, `bm25.py`, `modelo_vulneravel.py`,
`modelo_planejador.py`. O executor não tem FastAPI, scikit-learn, scipy nem rede: as lições dizem isso
e usam handlers puros, pipelines em numpy e KS por valor crítico.

## PLANO e provas

- `PLANO.md` do N3 e do N7 reescritos a partir das lições (passos, assinaturas, dosagem), com a régua
  do N1 e uma seção de convenções do nível.
- Prova do N7: 40 questões revistas (20 por tentativa); do N3: de 12 para 40 (10 por tentativa).
  Alternativa correta distribuída nas quatro posições; respostas com conta ou código conferidas
  executando Python.

## Decisões para o Filipe

1. **Assinaturas mudaram em relação ao roteiro original** em quase todas as lições (ex.: `buscar` da
   lista ligada devolve o nó; `heap_sort` ordena no lugar e devolve `None`; `CacheLRU.get` ausente
   devolve `None`; `validar_argumentos` devolve todos os erros; `rag_conversacional` virou a classe
   `Assistente`). Os PLANOs registram as atuais.
2. **Recursão com `lru_cache` no executor**: acima de ~250–330 níveis a instância WASI cai com
   "Recursão profunda demais" em vez de `RecursionError`. As lições ficam abaixo, mas um aluno pode
   chegar lá. Sugestão: aumentar a pilha do Wasmtime (`max-wasm-stack`) no runner.
3. **N7 sem numpy no projeto** (m7-04, `runtime: python`): usa BM25 e embedder em Python puro e fica
   sem re-ranker. Para reaproveitar o `pipeline_rag.py` do m4, o runtime precisaria virar
   `python-dados` (campo fixo; não mudei).
4. **Campos fixos que prometem mais do que a lição entrega**: título "FastAPI" do N7 m7-01 (handlers
   puros), "pipeline do scikit-learn" no objetivo do m7-02, "busca vetorial" na descrição do m5-03
   (similaridade lexical).
5. **Pontos abaixo da régua, conscientes**: N3 m6-02 sem Previsão (caberia trocando a leitura de
   remoção); rubro-negras e B-trees (N3 m6-05) e a pilha de chamadas (N3 m5-01) só em leitura e quiz.
6. **ASR residual 0,2 no N7 m6-02** (o PLANO pedia ≤ 0,05): a desinformação plantada passa por todas
   as camadas, de propósito, e a lição explica o risco residual.
7. **LGPD (N7 m6-03)**: as citações de artigos (5º, 6º, 7º, 11, 12, 15, 16, 18, 20, 33, 37, 41, 46)
   foram escritas sem o texto da lei à mão — conferir no texto oficial antes de publicar.
8. **Tamanho de arquivos**: N7 m4-04 (~4 400 linhas) e m7-04 (~8 100) por causa dos arquivos de apoio
   repetidos no código inicial e na solução.
9. **Projeto do N3** recebe os passos anteriores prontos em `mapa.py`/`rotas.py` (cada passo escreve
   só o `main.py`); dá para converter para um arquivo único que cresce, como no N1.
10. **Questões por tentativa**: N7 com 20 de 40; N3 e N2 com 10 de 40.

## Commits

`6b09d85`, `cc8e1ba`, `1366613` (rodadas anteriores), `0a1340c`, `2c91979`, `444af8e`, `ecce0c4`,
`9092b30`, `fcac30f` (módulos), `4fbf9d1` (tokenizador), `dcbde51`, `f6de3b8` (N3 m7 e m8),
`a716b9c`, `32644e9`, `086d073` (PLANOs e provas), `392adf7` (códigos fictícios no N7 m2, sobras).

Os relatórios detalhados por módulo (Encontrado / Corrigido / Passos / Decisões) ficaram fora do
repositório, em `.claude-transfer/auditoria/`.
