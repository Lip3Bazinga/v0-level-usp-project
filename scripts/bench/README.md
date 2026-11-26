# Medições do TCC (Fase D)

Scripts reproduzíveis que geram os CSVs de `docs/tcc/dados/`. Node puro (fetch nativo), **sem
dependências novas**: não há k6 nem autocannon; os usuários virtuais com tempo de pensar estão em
`carga.mts`.

| Script | O que mede | Saída |
|---|---|---|
| `latencia.mts` | latência por motor, a frio e a quente (30 repetições), tempo do executor separado do tempo total da API | `latencia.csv`, `latencia-resumo.csv` |
| `carga.mts` | N alunos simultâneos (10/25/50/100) por motor, com banco descartável: p95, taxa de erro, fila, saturação | `carga.csv`, `carga-saturacao.csv` |
| `recursos.mts` | memória e CPU por worker (`docker stats`) e tamanho das imagens Docker | `recursos.csv` |
| `custo.mts` | vCPUs e memória para 100 alunos com folga de 30%, a partir dos CSVs | terminal |

Todos gravam os arquivos na pasta de `--dir-dados` (padrão `docs/tcc/dados`; veja "Pasta de dados,
mesclagem e antes/depois") e registram uma **rodada** (hardware, versões, parâmetros, configuração do
executor) na seção correspondente de `ambiente.json`. Nenhum guarda nome de máquina, usuário, e-mail real ou segredo: os
alunos virtuais são `bench.*@bench.invalid` com senha aleatória que só existe na memória.

## Pré-requisitos

- Node 22.18+ (os `.mts` rodam direto, com remoção de tipos). Em Node mais antigo, use
  `pnpm --filter @levelusp/api exec tsx ../../scripts/bench/<script>.mts`.
- `pnpm install --frozen-lockfile` e `pnpm build` (a carga inicia `apps/api/dist/main.js`).
- Docker em execução.
- **Máquina ociosa**: nenhum outro Claude Code, `verify`, teste ou navegador usando o executor.
  Confira `docker stats` e os processos `node`/`pnpm` antes. O gerador de carga roda na mesma
  máquina e divide a CPU com o sistema medido (registre isso na metodologia).
- Executor (runner) rodando **em contêiner** para `recursos.mts` e para as amostras da carga:

  ```bash
  docker compose -f infra/compose/compose.dev.yml --profile runner up -d --build
  ```

- `RUNNER_TOKEN` no ambiente, igual ao do executor em execução (em dev: ver
  `infra/compose/compose.dev.yml`). Nunca vai para o código nem para o CSV.
  `RUNNER_URL` (padrão `http://localhost:8081`) idem.
- `latencia.mts` e `carga.mts` sobem por conta própria uma **pilha descartável**: PostgreSQL 17 em
  volume Docker `levelusp-bench-*`, migrações, importação do pacote atual e a API compilada numa
  porta livre. Nada toca o banco de desenvolvimento nem a API de dev. Antes de medir, o script cria
  um aluno de prova e confere por `psql` dentro do contêiner descartável que a conta foi gravada lá;
  se a API que respondeu não grava nesse banco, aborta. Se `--api-porta` for dada e estiver ocupada,
  aborta (nunca reaproveita uma API alheia). O script confere também que lição e casos do banco são
  os do pacote.
- Só para `latencia.mts --api URL` (API já em execução, ex.: dev): deixa contas
  `bench.*@bench.invalid` e progresso no banco dessa API. Não é o padrão; evite.

## Pasta de dados, mesclagem e antes/depois

Todos os scripts aceitam `--dir-dados <pasta>` (padrão `docs/tcc/dados`): CSVs e `ambiente.json` da
medição vão para essa pasta e `custo.mts` lê tudo dela. Fluxo "antes/depois": os dados da Fase D ficam em
`docs/tcc/dados` ("antes", intocados) e a remedição com o executor novo vai para `docs/tcc/dados/d2`
("depois"), com os mesmos comandos mais `--dir-dados docs/tcc/dados/d2`.

- **Rodada parcial não destrói a anterior.** Ao regravar um CSV existente, só as linhas das chaves
  medidas agora são trocadas; as demais são preservadas. Chaves: `latencia.csv` = cenário;
  `carga.csv` = motor × N; `recursos.csv` = tipo + rótulo + motor + k (ou imagem). Rodar
  `carga.mts --motores ml` troca só as linhas do ml.
- **Resumos recalculados do CSV completo**: `latencia-resumo.csv` e `carga-saturacao.csv` nunca saem só
  da última rodada.
- **Cabeçalho diferente do esperado = erro** (formatos não se misturam); o arquivo não é alterado. Use
  outra pasta ou mova o arquivo. `ambiente.json` ilegível também aborta, sem sobrescrever.
- **`ambiente.json`**: cada seção (`latencia`, `carga`, `recursos`) guarda `rodadas`, uma lista com data ISO,
  parâmetros, motores/níveis medidos e a configuração do executor (`inicio` e `fim`). Rodadas antigas
  nunca são apagadas; seção no formato anterior vira a primeira rodada (`formato_anterior: true`).
- **Configuração do executor** (de `GET /healthz` e `GET /v1/stats`): `politica_pyodide` (texto único ou
  objeto `{dados, ml}`), `pool_ocioso_no_instante` (workers Pyodide OCIOSOS na hora da leitura; o alvo configurado não é exposto), `capacity`, `fila_maxima` e `memory: { limitMb, usedMb,
  peakUsedMb, blocked }` (campo opcional do `/v1/stats`; executor sem ele = `null`).
- Para refazer um arquivo do zero use `recursos.mts --zerar` ou apague-o; dos outros, use outra pasta.

Teste da mesclagem (sem Docker nem executor): `node --test scripts/bench/lib/dados.test.mts`.

## Comandos

```bash
# 1. Latência (≈ 10–30 min; com --cmd-reinicio, mais: cada frio reinicia o executor)
node scripts/bench/latencia.mts --repeticoes 30 \
  --cmd-reinicio "docker compose -f infra/compose/compose.dev.yml --profile runner restart runner"
# só alguns motores, na pasta da remedição (troca só os cenários desses motores):
node scripts/bench/latencia.mts --motores ml --dir-dados docs/tcc/dados/d2

# 2. Recursos por worker e imagens (executor em contêiner)
node scripts/bench/recursos.mts imagens --dir-dados docs/tcc/dados/d2
node scripts/bench/recursos.mts workers --motores python,dados,ml --k 1,2,4 --dir-dados docs/tcc/dados/d2

# 3. Carga (≈ 1 h para 3 motores × 4 níveis × 300 s); apaga o banco ao final
node scripts/bench/carga.mts --niveis 10,25,50,100 --duracao-s 300 --dir-dados docs/tcc/dados/d2
node scripts/bench/carga.mts --motores ml --dir-dados docs/tcc/dados/d2   # rodada parcial: preserva python e dados

# 4. Conta de custo (preço opcional, em qualquer moeda)
node scripts/bench/custo.mts --alunos 100 --mix python=0.4,dados=0.4,ml=0.2 --dir-dados docs/tcc/dados/d2
node scripts/bench/custo.mts --preco-vcpu-hora <P1> --preco-gib-hora <P2>

# Sobras de uma carga interrompida (só nomes levelusp-bench-*)
node scripts/bench/carga.mts --limpar
```

Cada script aceita `--ajuda`. Opção desconhecida é erro (evita medir com padrão errado). Os mesmos
comandos existem como `pnpm bench:latencia`, `bench:carga`, `bench:recursos` e `bench:custo`.

## Como cada medição funciona

### latencia.mts

Cenários, com lições e passos reais de `packages/db/seed/trilha-python-ia.json`
(`scripts/bench/lib/conteudo.mts`, `ALVOS_LATENCIA`):

| Cenário | Exercício | Motor |
|---|---|---|
| a, lote trivial | `n1-m1-01-hardware-bits-e-bytes`, passo 4 (3 casos) | WASI |
| b, típico do N1 | `n1-m4-02-for-e-range`, passo 4 (6 casos) | WASI |
| c, pandas do N4 | `n4-m2-01-series-e-dataframe`, passo 5 (9 casos) | Pyodide, perfil dados |
| d, scikit-learn do N5 | `n5-m4-01-api-fit-predict-transform`, passo 5 (8 casos) | Pyodide, perfil ml |
| e, treino numpy do N6 | `n6-m3-02-loop-de-treino-e-gradiente-descendente`, passo 5 | Pyodide, perfil dados |
| piso-python/dados/ml | `print`/`import` mínimo direto em `POST /v1/run` (sem API) | os três |

Cada aluno virtual cria conta, conclui os passos anteriores (leitura, previsão, quiz, exercícios) e
envia a **solução correta do pacote** em `POST /api/me/lessons/:id/steps/:stepId/submit`. Alunos em
rodízio respeitam o limite de 12 verificações/min.

- **Tempo total** (`total_ms`): do envio ao último byte da resposta, no cliente.
- **Tempo do executor** (`runner_exec_ms`, `runner_fila_ms`): a API não devolve a duração nesse
  endpoint; vem do `GET /v1/stats` do executor (o job mais novo depois de cada envio). Precisa do
  `RUNNER_TOKEN` certo e do executor ocioso (`ruido=1` marca mais de um job novo na janela).
- `sobrecarga_ms = total − executor − fila` (HTTP, autenticação, banco, montagem das sondas, comparação).
- **Condição**: `quente` (worker Pyodide aquecido no pool; WASI não tem pool), `frio_pool` (o pool do
  perfil estava vazio: o worker é criado no envio) e `frio_processo` (executor reiniciado por
  `--cmd-reinicio` antes de cada execução). A condição é classificada pelo estado observado do pool
  (`pool_quente_antes`). Sem `--cmd-reinicio` o frio do WASI não é medido. Não se assume `ml:0`: a
  condição vem do que o executor informa (pool aquecido observado antes de cada envio). Com a política
  `reuse` o worker volta ao pool depois do lote, então o ml tem cenário quente e o script mede as
  execuções em sequência (sem o par quente + frio). **Na `reuse` a condição é classificada DEPOIS do
  envio**, porque o worker pode estar em restauração (ocioso = 0) e atender em dezenas de ms: lê-se
  `/v1/stats` antes e depois, e o delta de `engines.pyodide.booted` decide (houve worker criado durante
  o envio = `frio_pool`; senão `quente`). Antes de cada envio o script espera o pool estabilizar (duas
  leituras seguidas com `booted`, `warm` e `live` iguais), para o aquecimento especulativo do outro
  perfil não contaminar o delta; `frio_processo` (primeiro envio após `--cmd-reinicio`) não espera nada
  e não é reclassificado. O delta usado fica na coluna `booted_delta` (auditoria; vazia fora da `reuse`).
  Sem `/v1/stats` o script aborta com erro claro. Em `fresh` vale a regra do pool observado. A política que valia (lida de `/healthz`) fica na
  coluna `politica_pyodide` de cada linha (vazia no WASI).
- `--motores python,dados,ml` (padrão: todos) mede só os cenários desses motores; combina com
  `--cenarios` (interseção). Os cenários não medidos mantêm as linhas anteriores do CSV.
- Percentis pelo posto mais próximo; com 30 amostras, p99 é o máximo.
- Uma execução de aquecimento (`--descarte`) por cenário é descartada.

### carga.mts

1. Cria o contêiner `levelusp-bench-<id>-db` (PostgreSQL 17) e o volume `levelusp-bench-<id>-pgdata`,
   publicados só em 127.0.0.1 numa porta livre. O script só cria e apaga nomes com esse prefixo; o
   volume de dev (`pgdata-dev`) nunca é tocado.
2. `pnpm --filter @levelusp/db migrate` e `seed` nesse banco (importa o pacote atual).
3. Sobe `apps/api/dist/main.js` (`NODE_ENV=production`, `APP_ENV=dev`, log `warn`) na porta
   `--api-porta` (padrão: porta livre sorteada), com `AUTH_THROTTLE_LIMIT` alto (todos os alunos saem do mesmo IP).
4. Para cada motor (`python`, `dados` = pandas/Pyodide dados, `ml` = scikit-learn/Pyodide ml) e cada
   N: N alunos virtuais enviam um exercício a cada 30–60 s (sorteado; 40% dos envios errados com
   soluções erradas do pacote) por `--duracao-s`. Exercício por motor: o primeiro exercício da lição
   (`ALVOS_CARGA`), cuja preparação não roda código no executor.
5. Entre níveis espera o executor esvaziar. Ao final (ou Ctrl+C) para a API e apaga contêiner e volume.

Colunas de `carga.csv`: `envios`, `ok_200`, `aprovados`, `rejeitados_503` (fila cheia),
`limitados_429`, `outros_erros`, `taxa_erro` (erros ÷ envios sem os 429), `p50/p95/p99/max_ms` (**só
respostas 200**, do envio à resposta: 503, timeout e falha de rede não entram nos percentis, só na
taxa de erro), `runner_exec_p95_ms`, `runner_fila_p95_ms`, `fila_max_runner` (maior `pending` lido a
cada 1 s em `/v1/stats`), `ativos_max_runner`, `pico_fila_runner`, `capacidade_runner`,
`emvoo_max_cliente` (maior número de envios simultâneos no cliente: aproximação da fila quando o
executor não expõe `/v1/stats`), `vazao_envios_s` (envios ÷ `duracao_real_s`, do início ao último envio concluído), `saturou`,
`motivo_saturacao` e `regra_saturacao` (o texto da regra aplicada, gravado em toda linha). No fim, colunas
da Fase D2: `memoria_reservada_pico_mib` (maior `memory.usedMb` visto em `/v1/stats`, lido a cada 1 s
durante o nível: pode perder um pico mais curto; vazio se o executor não informa), `politica_pyodide`
(vazia no WASI) e `limite_p95_ms`/`limite_erro` (para recalcular a saturação do CSV completo). O número de 503
por nível é `rejeitados_503`.

**Saturação**: o nível satura quando (a) o p95 das respostas 200 passa de `--limite-p95-ms` (10 000),
**com ao menos `--min-amostras-p95` respostas 200 (20)**; ou (b) a taxa de erro passa de
`--limite-erro` (1%) **e há ao menos `--min-erros` erros (3)**. O mínimo absoluto existe porque com
N=10 e 300 s há ~65 envios: um único erro já daria 1,5% e declararia saturação por acaso.
**Respostas 429** (limite por usuário: 12 envios/min e 150 por aluno/lição/dia) são contadas à parte
(`limitados_429`), ficam fora da taxa de erro e **não** significam saturação do executor; o script
avisa se o plano pode bater no teto diário (cada aluno reaparece em vários níveis).
`carga-saturacao.csv` traz o menor N saturado por motor, recalculado de todo o `carga.csv`. Os limites são parâmetros: registre-os na
metodologia. A capacidade do executor (`CONCURRENCY`, `MAX_QUEUE`) é a
do executor que estiver rodando e vai para `ambiente.json`.

### recursos.mts

- `imagens`: tamanho em disco (bytes de `docker image inspect`) das imagens que casam com `--imagens`.
- `workers`: contêiner do executor ocioso (k=0) e com k jobs simultâneos de CPU; memória por worker
  = (pico com k − ocioso) ÷ k; CPU por worker = pico ÷ k (`cpu_pct` relativo a um núcleo). No Pyodide o
  pico inclui o worker de reposição aquecido em segundo plano (estimativa conservadora).
- `amostrar`: amostra o contêiner por `--duracao-s` enquanto você roda outra carga.
- A carga também grava amostras (`tipo=carga`) do executor e do banco descartável a cada ~4 s.

### custo.mts

Ver `docs/tcc/custo-100-alunos.md` (fórmula). Lê `latencia.csv`, `recursos.csv` e `carga.csv` de `--dir-dados`.
O ml pode ter linha quente: `--condicao quente` usa a quente, `--condicao pior` (padrão) mantém o pior caso
(frio). A saída lista, por motor, a latência usada (estatística, condição, cenário, n e política do Pyodide). Premissas não medidas (`--mix`, `--vcpu-api-bd`,
`--mem-api-bd-mib`) são parâmetros declarados na saída; preço é sempre parâmetro.

## Limitações

- Gerador e sistema na mesma máquina (a carga do gerador não é isolada).
- Docker Desktop: `docker stats` e a CPU/memória do contêiner são os da VM do Docker, não do host.
  `ambiente.json` registra os recursos que o Docker enxerga (`docker_cpus`, `docker_memoria_gib`).
- A API de teste da carga roda no host (não em contêiner): sua CPU/memória não entram em `recursos.csv`.
- O tempo do executor depende de `/v1/stats` (últimos 2 000 jobs). Executor antigo sem a rota: colunas em branco.
