# Desempenho do executor — piso de tempo por lote

Diagnóstico da Fase C (2026-11-20): de onde vêm os "~4 s por lote" que o `content:verify`
paga no motor `python-dados` mesmo com código trivial, o que foi corrigido e o que sobra.
Complementa [desempenho-e-carga.md](./desempenho-e-carga.md) (carga de turma) e
[motor-de-correcao.md](./motor-de-correcao.md) (motores e políticas).

## Como foi medido

- Máquina de desenvolvimento, executor em contêiner (32 CPUs visíveis, limite de 6 GiB),
  `RUNNER_PYODIDE_WARM=dados:1,ml:1`, política `fresh` (padrão), fila vazia, **um pedido por vez**.
- `apps/runner/scripts/medir-piso.mjs`: 20 pedidos `POST /v1/run` por motor e por cenário, com um
  lote trivial (uma sonda `globals`; `1 + 1` no WASI, `import numpy` no `dados`, `import sklearn`
  no `ml`). Depois de cada pedido lê o último job de `GET /v1/stats`.
  - **sequência**: um pedido logo depois do outro, como o `content:verify` faz;
  - **espaçado**: espera o pool do perfil ter um worker ocioso antes de cada pedido.
- `apps/runner/scripts/medir-aquecimento.mjs`: 5 aquecimentos por perfil num contêiner próprio,
  separando carga do Pyodide, carga dos pacotes e importações.
- "Antes" = imagem do commit `d641ab3`; "depois" = imagem desta branch, noutro contêiner da
  mesma máquina, com a mesma configuração. Tempos em ms.

## Decomposição do tempo (antes)

| Motor | Cenário | Pedido HTTP (mediana / p90) | Espera na fila | Obtenção do worker | Execução do harness | Ida e volta HTTP |
|---|---|---|---|---|---|---|
| WASI | sequência | 196 / 205 | 0 | — (processo novo por lote) | 194 | 2 |
| WASI | espaçado | 196 / 205 | 0 | — | 194 | 2 |
| Pyodide `dados` | sequência | **3 033** / 3 085 | 0 | **~2 990** | ~40 | 1 |
| Pyodide `dados` | espaçado | 42 / 45 | 0 | ~0 | 39 | 2 |
| Pyodide `ml` | sequência | **9 543** / 9 661 | 0 | **~9 490** | ~53 | 1 |
| Pyodide `ml` | espaçado | 56 / 61 | 0 | ~0 | 53 | 2 |

- **Espera na fila** (`queueMs`): 0 em todos os pedidos; o semáforo tinha 32 vagas e um pedido.
- **Obtenção do worker**: `execMs` da sequência menos o `execMs` do espaçado. É a espera pelo
  aquecimento de um worker novo — o piso inteiro está aqui.
- **Execução do harness**: `execMs` com worker pronto (gravar o projeto no MEMFS, rodar o
  harness, uma sonda, devolver a observação).
- **Ida e volta HTTP**: pedido visto pelo cliente menos o `durationMs` do executor (1–2 ms).
- O primeiro pedido de cada sequência usa o worker que já estava pronto (mínimos de 45 e 65 ms).

### Carga de pacotes: o que há dentro do aquecimento

| Perfil | Carregar o Pyodide | Carregar os pacotes (descompactar no MEMFS) | Importações do perfil | Soma | Aquecimento no worker (`bootMs`) |
|---|---|---|---|---|---|
| `dados` (numpy, pandas) | 880 | 506 | 1 547 | 2 909 | ~3 100 |
| `ml` (+ scipy, scikit-learn, matplotlib, statsmodels, sympy, networkx) | 879 | 3 447 | 4 774 | 9 106 | ~9 500 |

A diferença entre a soma e o `bootMs` (~200–400 ms) é a criação da thread, o bloqueio das
pontes para o JavaScript e a proteção do sistema de arquivos. Nada é recarregado **dentro** de
um pedido: os pacotes são carregados uma vez por worker.

### WASI: o que há nos ~190 ms

Medido à parte, 20 partidas do Wasmtime com o `python.cwasm` da imagem, sem o harness:

| O que roda | Mediana |
|---|---|
| Só o interpretador (`-c pass`) | 42 |
| Interpretador + as importações do harness (`ast`, `json`, `re`, `io`, `types`...) | 166 |
| Idem + as do modo estrito (`unittest`, `traceback`, `functools`, `gc`) | 444 |

A biblioteca padrão da imagem tem 527 arquivos `.py` e **nenhum `.pyc`**: cada lote recompila
os módulos que o harness importa (~125 ms; ~400 ms num lote estrito). O harness em si e o
processo do Wasmtime custam ~65 ms do total.

## Causa

Na política `fresh` cada lote consome um worker e o descarta; o pool repõe o worker assim que
ele é retirado (não depois do uso), mas com um worker por perfil a reposição leva um
aquecimento inteiro. Pedidos em sequência chegam ~50 ms depois do anterior e esperam os
~3 s (`dados`) ou ~9,5 s (`ml`) restantes. Os "~4 s" registrados na dívida técnica são esse
aquecimento com a máquina ocupada: na partida deste mesmo contêiner, com os dois perfis
aquecendo juntos, o `bootMs` foi de 4 876 ms (`dados`) e 16 154 ms (`ml`). Não é fila, nem HTTP, nem o harness.

Olhando o pool de perto apareceram dois defeitos de contabilidade (`pyodide-engine.ts`):

1. **Lote à espera de um worker que já tinha dono.** O contador de aquecimentos misturava os
   workers do pool com os que um lote aquecia só para si. Um segundo lote simultâneo via "há um
   aquecimento em curso" e ficava esperando por ele — mas aquele worker era do primeiro lote.
   Com um worker no pool o lote só era atendido um ou mais aquecimentos depois; com **`ml:0` (o
   padrão) ficava esperando para sempre**, segurando uma vaga do semáforo depois de a API
   desistir aos 120 s. É a explicação mais provável dos "estouros de 120 s" com dois verifies ao
   mesmo tempo ou no arranque da fila (não foi reproduzida com o `content:verify` em si).
   Reproduzido em teste no código antigo: três lotes simultâneos com o pool em 0 não terminavam
   em 90 s.
2. **`reuse`: lote que chega durante a restauração.** O worker só voltava a contar depois de
   restaurado (~30 ms); um lote que chegasse nessa janela aquecia outro worker (segundos).

## Correção (pequena e local)

`PyodideEngine` (`acquire`/`refill`/`release`), sem mudar isolamento nem protocolo:

- todo lote sem worker ocioso entra na fila do perfil e recebe o **próximo** worker que ficar
  pronto (aquecido ou, na `reuse`, restaurado);
- o pool mantém a caminho `RUNNER_PYODIDE_WARM` workers **além** de um por lote na fila; só
  contam os aquecimentos que vão para o pool e as restaurações em curso;
- `infra/compose/compose.dev.yml` passa a repassar `RUNNER_PYODIDE_POLICY` (padrão `fresh`).

Efeito colateral bom na `fresh`: quando um lote entra na fila, o pool já começa a aquecer o
worker do lote seguinte, então pedidos em sequência passam a alternar entre "espera um
aquecimento" e "não espera".

## Antes e depois

Pedido HTTP em **sequência** (20 pedidos; média / mediana / p90):

| Motor | Antes (`fresh`) | Depois (`fresh`) | Depois (`reuse`) |
|---|---|---|---|
| WASI | — / 196 / 205 | — / 189 / 197 | 190 / 190 / 195 |
| Pyodide `dados` | **2 908** / 3 056 / 3 088 | **1 550** / 3 016 / 3 083 | **48** / 46 / 58 |
| Pyodide `ml` | **9 081** / 9 559 / 9 631 | **4 879** / 9 592 / 9 771 | **212** / 223 / 243 |

Nos motores Pyodide, "antes" e "depois (`fresh`)" são de uma segunda rodada de 20 pedidos, feita
para ter a média (a primeira rodada do "antes" é a da tabela de decomposição: medianas de 3 033
e 9 543). No WASI a média não foi registrada nas rodadas `fresh`.

Pedido **espaçado** (worker pronto), mediana: WASI 196 → 187 (`fresh`) e 189 (`reuse`); `dados` 42 → 42 e 41;
`ml` 56 → 55 e 63. Sem mudança, como esperado: a correção não toca na execução. Na `reuse` não
foi medido o "antes" (só o teste "fila do pool" compara o código antigo com o novo).

Lotes simultâneos com o pool do perfil em 0 (`ml` no padrão): antes, o segundo lote não
terminava (120 s na API); depois, três lotes simultâneos terminam em ~3,4 s no `dados`, um
worker para cada (`pyodide-engine.test.ts`, "fila do pool").

Como ler:

- **`fresh`, depois**: a mediana e o p90 não mudam (metade dos pedidos ainda espera um
  aquecimento inteiro); a média cai pela metade porque a outra metade encontra o worker que o
  pool adiantou. Os 20 pedidos `dados` somaram 58 s antes e 31 s depois. Pela mesma conta
  (estimativa, não medida no `content:verify`), um passo com 8 lotes `dados` em sequência cai de
  ~21 s (7 aquecimentos) para ~12 s (4 aquecimentos).
- **`reuse`, depois**: o piso some. No `dados` o lote seguinte pega o segundo worker do pool
  (~46 ms); no `ml`, com um worker só, espera a restauração do anterior (~170 ms) em vez de um
  aquecimento de ~9,5 s. A cada `RUNNER_PYODIDE_RECYCLE_AFTER` lotes (25) o worker é reciclado e
  um pedido paga um aquecimento.
- As linhas do WASI servem de controle: o motor não foi alterado.

## O que sobra e propostas (não implementadas)

O piso da `fresh` em sequência continua sendo o aquecimento; a correção só o divide por dois
na média.
Tirar o resto é decisão de configuração ou trabalho maior:

1. **`content:verify` com `RUNNER_PYODIDE_POLICY=reuse` no executor de desenvolvimento.** É o que
   elimina o piso (tabela acima). O código verificado é do próprio autor, então o risco residual
   da `reuse` (estado de instâncias que a fotografia não cobre, [seguranca.md](./seguranca.md))
   não se aplica à autoria. Fica como escolha de quem sobe o contêiner; o padrão continua `fresh`.
   Lotes estritos (`unittest`/`legacy`) continuam pagando um aquecimento na `reuse`: usam worker
   dedicado.
2. **Pool maior na `fresh`** (`RUNNER_PYODIDE_WARM=dados:2` ou mais): cada worker a mais absorve
   um lote da rajada e aumenta os aquecimentos em paralelo. Custa memória (um worker `dados`
   ocupa ~500–600 MB de RSS; um `ml`, ~1,3 GB — [desempenho-e-carga.md](./desempenho-e-carga.md)).
3. **`reuse` em produção**: troca ~3 s por ~30 ms por lote, mas é decisão de segurança (janela
   de estado entre alunos); não é desta fase.
4. **Aquecimento mais barato** (grande): 53 % do aquecimento do `dados` e 52 % do `ml` são as
   importações, e 17 %/38 % a descompactação dos pacotes. Um snapshot de memória resolveria os
   dois, mas o `makeMemorySnapshot()` do Pyodide falha com pacotes carregados (já testado, ver
   desempenho-e-carga.md). Alternativa a investigar: um perfil `ml` enxuto (sem `statsmodels`,
   `sympy` e `networkx`, que só algumas lições usam) carregado sob demanda.
5. **WASI: biblioteca padrão pré-compilada.** Gerar os `.pyc` na construção da imagem
   (`fetch-python-wasi.sh`, com o próprio `python.cwasm` rodando `compileall`) deve tirar a maior
   parte dos ~125 ms por lote (e dos ~400 ms de um lote estrito). Não foi feito aqui: mexe na
   imagem do sandbox (a pasta é montada somente leitura e a validação dos `.pyc` depende das datas
   dos fontes) e pede a bateria de ataques de novo. O processo por lote é o isolamento do motor e
   continua.
6. **`reuse`: reciclagem adiantada.** Aquecer o substituto um lote antes de o worker atingir
   `RUNNER_PYODIDE_RECYCLE_AFTER` evitaria o aquecimento que um pedido paga a cada 25 lotes.

## Como repetir

```bash
# piso por motor (o token é o do executor; não é impresso)
RUNNER_URL=http://127.0.0.1:8081 RUNNER_TOKEN=... node apps/runner/scripts/medir-piso.mjs 20
# só um motor
RUNNER_URL=... RUNNER_TOKEN=... node apps/runner/scripts/medir-piso.mjs 20 pyodide-dados
# decomposição do aquecimento, num contêiner próprio da imagem
docker run --rm -i -m 4g -w /app levelusp-dev-runner node --input-type=module - 5 < apps/runner/scripts/medir-aquecimento.mjs
```

Uma medição por vez, com a fila vazia: os motores dividem as mesmas CPUs e o mesmo semáforo.
