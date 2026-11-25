# Medições do TCC (Fase D)

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
