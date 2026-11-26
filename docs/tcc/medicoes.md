# Medições do TCC (Fases D e D2)

Todas as medições foram feitas em 2026-11-25, sobre o código da `develop` com as Fases B e C já
mescladas, **uma de cada vez e com a máquina parada** (nenhum teste, verify ou navegador usando o
executor; o contêiner do executor foi reconstruído antes, com o código atual). Os números vêm dos
CSVs de `docs/tcc/dados/`; os scripts estão em `scripts/bench/` (ver `scripts/bench/README.md`).
Conteúdo e segurança (itens 4 e 5) estão em `medicoes-conteudo-seguranca.md`; a conta do item 6
está em `custo-100-alunos.md`.

## Ambiente

| Item | Valor |
|---|---|
| CPU / memória | Intel Core i9-14900KF, 32 processadores lógicos, 31,8 GiB |
| SO | Windows 11 (x64), Docker 28.5.1 com 32 CPUs e 15,6 GiB visíveis |
| Node | v26.13.0 |
| Motores | `python`: CPython 3.14.0 WASI em Wasmtime 49; `dados` e `ml`: CPython 3.14.2 em Pyodide 314.0.7 |
| Executor | contêiner `runner`, política `fresh` (um worker Pyodide novo por lote), `RUNNER_PYODIDE_WARM=dados:1,ml:0` |
| Banco | PostgreSQL 17 (`postgres:17-alpine`), descartável nas medições 1 e 2 |
| Pacote | `packages/db/seed/trilha-python-ia.json` (7 cursos, 253 lições, 1878 passos) |
| Percentil | posto mais próximo; com 30 amostras, p99 é o máximo |

**Limites do desenho:** API, banco, executor e gerador de carga dividem a mesma máquina de 32
threads; o gerador de carga consome CPU do sistema medido. Os valores absolutos são de um desktop
potente, não de uma VM de produção; servem para comparar motores e dimensionar, não como garantia.

## 1. Latência por motor (30 repetições)

`docs/tcc/dados/latencia.csv` (cada execução) e `latencia-resumo.csv`. Comando:
`node scripts/bench/latencia.mts --repeticoes 30 --cmd-reinicio "docker compose -f infra/compose/compose.dev.yml --profile runner restart runner"`.
"Frio" = executor reiniciado antes de cada execução (`frio_processo`) ou pool do perfil vazio
(`frio_pool`). "Executor" é o tempo medido no executor; "sobrecarga" = total − executor (HTTP,
autenticação, banco, sondas, comparação na API).

Tempo total na API, ms (p50 / p95 / p99):

| Cenário | Motor | Quente | Frio |
|---|---|---|---|
| a, lote trivial (N1, 3 casos) | python | 227 / 329 / 375 | 224 / 252 / 256 |
| b, exercício típico N1 (6 casos) | python | 231 / 280 / 319 | 248 / 277 / 278 |
| c, pandas N4 (9 casos) | dados | 90 / 164 / 174 | 2435 / 2749 / 2794 |
| d, scikit-learn N5 (8 casos) | ml | (sem quente: `ml:0`) | 9457 / 9650 / 9727 (pool) · 9571 / 9741 / 9814 (processo) |
| e, treino numpy N6 | dados | 158 / 202 / 218 | 2496 / 2571 / 2613 |

Tempo só do executor, p50 em ms: python 188–219; dados quente 60 (c) e 112 (e); dados frio ≈ 2400–2460;
ml frio ≈ 9400–9500. Sobrecarga da API: p50 de 27 a 45 ms, p95 de 40 a 144 ms.
Piso (job mínimo direto no executor, sem API): python 191 ms, dados 44 ms (quente) / 2391 ms (frio),
ml 9407 ms (pool) / 9585 ms (processo). Ou seja, quase todo o tempo é do executor; a API soma ~30 ms.

Leitura: o WASI custa ~0,2 s por lote sempre (não há pool, o processo é novo a cada lote). O Pyodide
`dados` é rápido com worker aquecido (0,05–0,15 s) e custa ~2,4 s a frio; o `ml` custa ~9,5 s a frio
porque carrega scikit-learn, e **nesta configuração (`ml:0`) todo envio `ml` é frio**.

## 2. Teste de carga

Comando: `node scripts/bench/carga.mts --niveis 10,25,50,100 --duracao-s 300` contra a API local
compilada, com PostgreSQL descartável (volume `levelusp-bench-*`, apagado no fim) e alunos virtuais
`bench.*@bench.invalid` criados por script. Cada aluno envia 1 exercício a cada 30–60 s (sorteado),
40 % dos envios com solução errada do pacote, por 300 s. Saturação: p95 das respostas 200 > 10 s
(com ≥ 20 respostas 200) **ou** erro > 1 % com ≥ 3 erros (503, timeout, rede, 5xx; 429 fica fora).
`carga.csv`, `carga-saturacao.csv`, `carga-ml-concorrencia4.csv`.

| Motor | N | Envios | p95 (ms) | Erro | Fila máx. | Em voo máx. (cliente) | Veredito |
|---|---:|---:|---:|---:|---:|---:|---|
| python | 10 | 64 | 278 | 0 % | 0 | 2 | ok |
| python | 25 | 160 | 305 | 0 % | 0 | 3 | ok |
| python | 50 | 325 | 309 | 0 % | 0 | 4 | ok |
| python | 100 | 643 | 311 | 0 % | 0 | 5 | ok |
| dados | 10 | 67 | 3134 | 0 % | 0 | 3 | ok |
| dados | 25 | 156 | 3172 | 0 % | 0 | 6 | ok |
| dados | 50 | 316 | 3491 | 0 % | 0 | 9 | ok |
| dados | 100 | 606 | 4559 | 0 % | 0 | 25 | ok |
| ml (CONCURRENCY=4) | 10 | 53 | 12682 | 0 % | 2 | 6 | satura (p95 > 10 s) |
| ml (CONCURRENCY=4) | 25 | 135 | 19642 | 14,8 % | 4 | 8 | satura |
| ml (CONCURRENCY=4) | 50 | 291 | 20181 | 60,5 % | 3 | 9 | satura |
| ml (CONCURRENCY=4) | 100 | 615 | 21366 | 81,3 % | 3 | 10 | satura |

**Ponto de saturação:** `python` e `dados` **não saturaram até 100 alunos** (o `dados` chegou a
25 lotes em voo no cliente; p95 de 4,6 s). O `ml` **satura já em N=10** (p95 12,7 s): com
`ml:0` cada envio paga ~10 s de aquecimento, o que já passa do limite de 10 s. Com 4 lotes
simultâneos, o executor atende cerca de 115 envios `ml` a cada 300 s (≈ 0,38/s) e responde 503 ao
resto (os 115 são o mesmo teto em N=25, 50 e 100). A fila do executor se mede pelo `pending`
(coluna `fila_max_runner`); como o limite que vale é o de tempo de espera (`MAX_QUEUE_WAIT_MS`
20 s), a fila fica curta e o excesso vira 503.

### Rodada inválida do `ml` (mantida em `carga.csv` como evidência)

A primeira rodada rodou com o padrão do executor (`CONCURRENCY` = 32, uma por CPU) e 6 GiB de
memória. Cada lote `ml` abre um worker de ~1,17 GiB; no N=25 o contêiner foi **morto por falta de
memória** (`OOMKilled`, exit 137) e ficou parado. Por isso as linhas `ml` de N=25, 50 e 100 em
`carga.csv` (93,8 %, 100 % e 100 % de erro) **não medem saturação: medem um executor morto**, e só o
N=10 dessa rodada (p95 11392 ms, 0 % de erro) vale, em concordância com a rodada com
`CONCURRENCY=4`. Achado de dimensionamento: a concorrência do executor deve ser limitada pela
memória (`CONCURRENCY × 1,2 GiB` para o `ml`), não pelo número de CPUs, ou o executor cai em vez de
recusar com 503. `ambiente.json` guarda só a seção da última rodada (`CONCURRENCY=4`).

## 3. Memória e CPU por worker; imagens

`docs/tcc/dados/recursos.csv`. Jobs de ~6 s, k = 1, 2 e 4 simultâneos no contêiner do executor;
CPU em % de um núcleo.

| Motor | k | CPU pico | Memória pico (MiB) | Memória por worker (MiB) | CPU por worker |
|---|---:|---:|---:|---:|---:|
| python | 1 / 2 / 4 | 105 / 201 / 400 % | 652 / 664 / 687 | ≈ 0–7 (ruído; o WASI cabe no executor) | ≈ 100 % |
| dados | 1 / 2 / 4 | 210 / 328 / 556 % | 826 / 1071 / 1550 | 185 / 215 / 227 | 210 / 164 / 139 % |
| ml (6 GiB) | 1 / 2 / 4 | 126 / 235 / 495 % | 1563 / 2748 / 5070 | 1171 / 1178 / 1170 | 126 / 118 / 124 % |

O executor ocioso ocupa 640–870 MiB. As linhas `ml` com limite de 2 GiB (`mem_limite_mib` = 2048)
estão no CSV: com k=2 o pico encosta no limite e com k=4 os jobs falharam (rede), então **o limite
padrão de dev (2 g) só comporta um worker `ml`**. O CSV de recursos foi coletado em duas execuções
(python/dados/ml com 2 GiB; depois só ml com 6 GiB); `ambiente.json` descreve a última.

Imagens Docker (MiB): executor 174,1 (o `levelusp-runner-test` de 319,1 é a imagem de testes);
`postgres:17-alpine` 111,9.

## 4 e 5. Segurança e conteúdo

Ver `medicoes-conteudo-seguranca.md` (`conteudo.csv`, `seguranca-inventario.csv`).

## 6. Custo para 100 alunos

Ver `custo-100-alunos.md`. Saída de `node scripts/bench/custo.mts --alunos 100 --mix python=0.4,dados=0.4,ml=0.2`
(≈ 2,2 envios/s no total, folga de 30 %, pior condição = frio):

| Motor | Workers simultâneos (Lei de Little) | vCPU | Memória (MiB) |
|---|---:|---:|---:|
| python | 1 | 0,23 | 7 |
| dados | 3 | 5,07 | 682 |
| ml | 5 | 5,41 | 5424 |

Total: **16 vCPU e ≈ 10,2 GiB** (inclui API + banco, premissa de 1 vCPU e 1 GiB, não medida).
Custo/hora = 16 × P_vcpu + 10,16 × P_gib, com os preços como parâmetros (nenhum foi assumido).
Ressalva: a validação do script lê `carga.csv`, cujas linhas `ml` de N ≥ 25 são da rodada inválida;
vale a leitura desta página, em que o `ml` não sustenta 100 alunos com `ml:0` e 4 lotes
simultâneos. Para sustentar o `ml` seria preciso aquecer workers (`ml:K`), com custo de ~1,2 GiB
cada, ou mais instâncias do executor.

## 7. Depois da Fase D2: `ml` em `reuse` e admissão por memória

Remedido em 2026-11-25, com a máquina parada e uma medição por vez, sobre a branch
`fix/executor-memoria`. Dados em `docs/tcc/dados/d2/` (todos saídos dos scripts; `ambiente.json`
lista cada rodada). O que mudou no executor entre o "antes" (seções 1 a 6) e o "depois":

| Item | Antes (Fase D) | Depois (Fase D2) |
|---|---|---|
| Política do Pyodide | `fresh` nos dois perfis | `dados:fresh,ml:reuse` |
| Pool aquecido | `dados:1,ml:0` | igual (o worker `ml` fica vivo depois do primeiro lote) |
| Admissão | só semáforo por CPU (`CONCURRENCY`) | CPU **e** orçamento de memória: `RUNNER_MEMORY` − reserva de 512 MiB, peso por worker `python:0,dados:256,ml:1229` MiB |
| Medição | `RUNNER_MEMORY=6g`; `ml` exigiu `CONCURRENCY=4` à mão | `RUNNER_MEMORY=6g` (orçamento de 5632 MiB), `CONCURRENCY` no padrão (32) |

### 7.1 Latência (tempo total na API, ms, 30 repetições)

| Cenário | Condição | Antes p50 / p95 | Depois p50 / p95 / p99 |
|---|---|---|---|
| c — `dados` (pandas, N4) | quente | 90 / 164 | 102 / 168 / 203 |
| c — `dados` | frio (executor reiniciado) | ≈ 2435 (p50) | 3382 / 3534 / 3708 |
| d — `ml` (scikit-learn, N5) | quente | não existia (todo envio era frio) | 114 / 139 / 217 (n = 29) |
| d — `ml` | frio | 9457 / 9650 | 12396 / 12571 / 12592 |
| piso `ml` | quente | não existia | 76 / 81 / 85 (n = 28) |
| a, b — `python` | quente | 227–231 (p50) | 258 / 362 / 420 e 269 / 336 / 367 |

Leitura:

- **`ml` quente:** com `reuse`, 29 de 30 envios do cenário d respondem em ≈ 0,11 s; só o primeiro
  depois de subir o executor paga o aquecimento (≈ 12 s). Antes, todos pagavam ≈ 9,5 s.
- **Frio mais lento que na Fase D nos três motores:** o `python`, cujo caminho não mudou, também
  subiu ≈ 20 %, e uma rodada de controle com o `ml` em `fresh` no código novo deu 11,0–11,4 s.
  A diferença entre dias é da máquina, não da mudança. A `reuse` em si soma ≈ 1,2 s ao aquecimento
  do `ml` (a fotografia do estado usada para restaurar o worker entre lotes).
- A classificação quente/frio na `reuse` vem do contador de workers iniciados do executor
  (coluna `booted_delta` de `latencia.csv`), não de suposição do script.

### 7.2 Carga (300 s por nível, pensar 30–60 s)

| Motor | N | Envios | Erros (503) | p50 (ms) | p95 (ms) | p99 (ms) | Saturou |
|---|---:|---:|---:|---:|---:|---:|---|
| python | 10 / 25 / 50 / 100 | 64 / 159 / 320 / 654 | 0 | 254 / 249 / 245 / 245 | 365 / 305 / 310 / 297 | 408 / 361 / 346 / 381 | não |
| dados | 10 | 63 | 0 | 193 | 3495 | 3768 | não |
| dados | 25 | 155 | 0 | 2603 | 4079 | 4281 | não |
| dados | 50 | 303 | 0 | 3529 | 4516 | 4834 | não |
| dados | 100 | 601 | 0 | 4777 | 5771 | 6557 | não |
| ml | 10 | 67 | 0 | 385 | 563 | 12816 | não |
| ml | 25 | 159 | 0 | 391 | 952 | 12121 | não |
| ml | 50 | 314 | 2 (0,6 %) | 389 | 8198 | 11466 | não |
| ml | 100 | 628 | 15 (2,4 %) | 451 | 10736 | 13272 | **sim** |

Antes × depois no `ml` (cada usuário virtual envia só `ml`):

| N | Antes (`fresh`, `ml:0`, `CONCURRENCY=4`) | Depois (`reuse`, limite por memória, `CONCURRENCY=32`) |
|---:|---|---|
| 10 | p95 12,7 s — saturado | p95 0,56 s |
| 25 | 14,8 % de erro | p95 0,95 s, sem erro |
| 50 | 60,5 % de erro | p95 8,2 s, 0,6 % de erro |
| 100 | 81,3 % de erro | p95 10,7 s, 2,4 % de erro — saturado |
| `CONCURRENCY` padrão | executor morto por OOM | `OOMKilled=false`, nenhum reinício |

- O executor ficou de pé nas doze rodadas com `CONCURRENCY=32`: no `ml` nunca houve mais de 4
  workers vivos (pico reservado de 5172 MiB em 5632), e os lotes sem memória esperaram na fila
  (p95 de fila de 5,6 s em N=50 e 8,8 s em N=100) ou receberam 503 com `Retry-After`.
- O p99 do `ml` em ≈ 12 s é o aquecimento de cada worker novo (o primeiro lote de cada um).
- O `dados` chegou ao teto do orçamento em N=100 (22 workers, 5632 MiB reservados) sem erro; como
  segue em `fresh`, sob carga quase todo lote paga o aquecimento (p50 de 4,8 s em N=100, contra
  4,6 s de p95 na Fase D: mesma ordem, um pouco pior no dia).
- O `ml` passa de "não sustenta 10 alunos" para "sustenta 50 alunos enviando só `ml`"; com 100
  alunos só de `ml` e 6 GiB, satura por fila de memória, não por queda.

### 7.3 Memória por worker (MiB, k = 1 / 2 / 4 lotes simultâneos)

| Motor | Por worker | Pico do contêiner |
|---|---|---:|
| python | 13 / 13 / 12 | 408 |
| dados | 198 / 218 / 229 | 1319 |
| ml | 1166 / 1143 / 1134 | 4886 |

Executor ocioso: ≈ 350–400 MiB. Os pesos padrão da admissão (256 e 1229 MiB) cobrem o medido.

### 7.4 Custo para 100 alunos (mesmo mix: python 0,4; dados 0,4; ml 0,2)

Saída de `custo.mts --dir-dados docs/tcc/dados/d2`, nas duas condições que o script oferece:

| Condição do tempo de serviço | Workers (python / dados / ml) | vCPU | Memória |
|---|---|---:|---:|
| Fase D, pior (frio) | 1 / 3 / 5 | 16 | 10,2 GiB |
| D2, `--condicao quente` | 1 / 1 / 1 | 3 | 3,6 GiB |
| D2, `--condicao pior` (frio) | 1 / 4 / 6 | 19 | 11,9 GiB |

- A condição `pior` deixou de descrever o `ml`: com `reuse` só o primeiro lote de cada worker é
  frio. Ela subiu de 16 para 19 vCPU apenas porque o frio do dia foi mais lento.
- A condição `quente` é o piso: vale para o `python` e o `ml`, mas o `dados` segue em `fresh` e,
  sob carga, trabalha perto do frio. Aplicando a mesma fórmula com `dados` no frio e os outros no
  quente (conta feita aqui, não saída do script): (0,24 + 6,62 + 0,05 + 1) × 1,3 → **11 vCPU** e
  (13 + 917 + 1166 + 402 + 1024) × 1,3 → **≈ 4,5 GiB**. O `ml` deixa de ser o item caro
  (de 5 workers e 5,4 GiB para 1 worker e 1,2 GiB); o custo passa a ser dominado pelo `dados`.
- A validação do script marca "ml não aguenta 100" porque a carga põe 100 alunos só no `ml`; no
  mix, 20 % são ≈ 20 alunos de `ml`, abaixo dos 50 sustentados.

## Reprodução

```bash
pnpm install --frozen-lockfile && pnpm build
docker compose -f infra/compose/compose.dev.yml --profile runner up -d --build runner
export RUNNER_TOKEN=<o do compose de dev>
node scripts/bench/latencia.mts --repeticoes 30 --cmd-reinicio "docker compose -f infra/compose/compose.dev.yml --profile runner restart runner"
node scripts/bench/recursos.mts imagens
RUNNER_MEMORY=6g docker compose -f infra/compose/compose.dev.yml --profile runner up -d runner   # para o ml
node scripts/bench/recursos.mts workers --motores python,dados,ml --k 1,2,4
node scripts/bench/carga.mts --niveis 10,25,50,100 --duracao-s 300
# ml com a concorrência limitada pela memória (variável CONCURRENCY=4 no executor):
node scripts/bench/carga.mts --motores ml --niveis 10,25,50,100 --duracao-s 300 --saida docs/tcc/dados/carga-ml-concorrencia4.csv
node scripts/bench/custo.mts --alunos 100 --mix python=0.4,dados=0.4,ml=0.2
```

Fase D2 (seção 7): as opções `--saida` e `--anexar` deixaram de existir; cada script grava e mescla na
pasta de `--dir-dados`.

```bash
RUNNER_MEMORY=6g RUNNER_PYODIDE_POLICY=dados:fresh,ml:reuse docker compose -f infra/compose/compose.dev.yml --profile runner up -d --build runner
D=docs/tcc/dados/d2
node scripts/bench/latencia.mts --repeticoes 30 --dir-dados $D --cmd-reinicio "docker compose -f infra/compose/compose.dev.yml --profile runner restart runner"
node scripts/bench/recursos.mts workers --motores python,dados,ml --k 1,2,4 --dir-dados $D
node scripts/bench/carga.mts --niveis 10,25,50,100 --duracao-s 300 --dir-dados $D
node scripts/bench/custo.mts --alunos 100 --mix python=0.4,dados=0.4,ml=0.2 --dir-dados $D --condicao quente   # ou pior
```
