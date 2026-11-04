# Desempenho e carga

Medições de capacidade do LevelUSP para o estudo com turmas (20–40 alunos, às vezes uma turma
inteira clicando em **Verificar** ao mesmo tempo num laboratório), feitas em 03/11/2026 com a
pilha de produção (web standalone + API + executor + PostgreSQL) numa máquina de 2 vCPU.
Ferramenta: `pnpm load:turma` (`tools/load`).

## 1. Resumo

> **Uma VM de 2 vCPU atende uma turma de 40 alunos clicando em Verificar dentro de 10 s com
> p95 ≤ 0,7 s do clique ao veredito, sem erros** (com os tetos de CPU do `compose.vm.yml`), e
> 80 alunos na mesma janela com p95 ≤ 3 s. Em regime (turma estudando: cadastro, navegação,
> autosave, notas, ranking e Verificar), o joelho fica **entre 640 e 1 280 alunos-equivalentes**
> (p95 do Verificar de 0,5–0,6 s com 640; 4,5 s com 1 280). O gargalo é o executor nas
> **rajadas**; numa turma de 40 em regime, a API, a web e o banco usaram até 4% de um núcleo
> cada. Lições com `unittest` (14 instâncias por Verificar) são a exceção: 20 alunos
> em rajada levam p95 de 20 s.

| Recomendação | Valor | Por quê (seção) |
|---|---|---|
| `RUNNER_CONCURRENCY` | **1 por vCPU** (2 numa VM de 2 vCPU; o padrão do código passou de CPUs − 1 para CPUs) | rajada de 40: p95 2,8 s com 1, 0,7 s com 2; 3 não ganha nada (§4.1) |
| `RUNNER_MAX_QUEUE_WAIT_MS` | **20 000** (novo) | a fila aceita a turma inteira e só responde "ocupado" quando a espera estimada passa de 20 s, abaixo do prazo de 40 s da API (§4.1, §4.2) |
| `MAX_QUEUE` (executor) | **200 lotes** (era 20) | 20 lotes ≈ 7 alunos na fila (< 3 s de espera): com 80 alunos, 46% das requisições recebiam 503 e 32 alunos desistiam (§4.1) |
| `RUNNER_CPUS` | **1.5** em 2 vCPU (como está) | o teto deixa CPU para a API e a web: a navegação não sente a rajada; sem teto, só a rajada de 120 melhora (§4.4, §4.5) |
| `WEB_KEEP_ALIVE_TIMEOUT_MS` | **125 000** (novo) | o proxy da frente (cloudflared 90 s, Caddy 120 s) precisa fechar o socket antes da web (§5.6) |
| VM | **2 vCPU / 4 GB** para turmas de até 40; **4 vCPU / 8 GB** para 80+ verificando juntos ou lições com `unittest` em rajada | §4 |
| Cloudflare | regra de cache para `/pyodide/*` (arquivos versionados e imutáveis) | a web gasta ~0,45 s de CPU por aluno comprimindo o Pyodide (§4.6) |

## 2. Ambiente e metodologia

| Item | Valor |
|---|---|
| Máquina | 2 vCPU Intel Xeon @ 2,10 GHz, 8 GB de RAM, Linux 6.18, sem swap |
| Pilha | `pnpm build` de produção: web `next build` standalone (`node apps/web/server.js`, porta 3095, `/api/*` pelo rewrite do Next), API NestJS (`NODE_ENV=production`, 4095, pool de 10 conexões, log `info`), executor (8095, Wasmtime 49.0.5 + CPython 3.14 WASI), PostgreSQL **16.15** local com `shared_buffers=256MB` e `work_mem=8MB` (os valores do `compose.vm.yml`; a produção usa a versão 17) |
| Banco | `levelusp_perf`, migrado e com o seed (`python-completo.json`: 22 lições, 72 soluções erradas); `pg_stat_statements` ligado |
| Executor | `NODE_ENV=development` só porque a stdlib do Python é do root nesta máquina (em produção o contêiner roda como `node` e recusa partir com a stdlib gravável) |
| Gerador | o próprio `pnpm load:turma`, **na mesma máquina** — ele divide a CPU com o sistema medido. A CPU do gerador é medida e publicada em toda etapa: 1,5–7,4% de um núcleo (a máquina tem 200%) |
| Navegador | Chromium 1243 (Playwright) e Lighthouse 12.8.2 |

Os tetos de CPU dos contêineres (`compose.vm.yml`: executor 1,5, API/web/PostgreSQL 1,0) foram
emulados com cgroups (`cpu.cfs_quota_us`) na §4.4; nas demais seções os processos usam a
máquina inteira, como numa VM sem limites por contêiner.

### 2.1 O aluno virtual

Cada aluno virtual tem cookie de sessão próprio, manda `x-levelusp-csrf` e
`accept-encoding: gzip, br` e repete **as chamadas que o front faz** (medidas com o Playwright
na web de produção; tabela em `tools/load/src/pages.ts`): a primeira tela é um carregamento
completo (HTML, JS/CSS da página e os contextos globais: `auth/me`, lições, progresso,
notificações); as seguintes são navegação no cliente (payload RSC + chamadas da tela).

Cenário **turma** (tempos de aula):

1. abre `/signup` e cria a conta; painel (10–30 s); catálogo (5–15 s); curso + matrícula;
2. sorteia a lição de partida com peso que cai à metade a cada 4 posições (a turma está quase
   toda nas primeiras lições) e segue em ordem;
3. por lição: abre a IDE, lê o enunciado (60–180 s), programa (90–300 s na 1ª tentativa, 30–120 s
   nas seguintes) com autosave (`PUT /snapshot` a cada ~20 s, exponencial) e clica em
   **Verificar**: na 1ª tentativa 60% erram (45% com uma das `wrong_solutions` do seed, 15%
   mandando o esqueleto), na 2ª 40%, na 3ª 25%, depois 10%; o resto manda a referência;
   aprovado → o front recarrega perfil, progresso e notificações;
4. depois de cada lição: 15% escrevem uma anotação, 20% olham o ranking, 25% voltam ao painel.

**"Executar" não aparece na carga**: ele roda no navegador (Pyodide) e não custa nada ao
servidor. A fração das execuções que o navegador absorve **não é mensurável hoje** (não há
telemetria do botão Executar); ver §8.

**Compressão de tempo.** Os tempos de pensar são divididos por `--compressao C`. Como cada aluno
faz a mesma sequência C vezes mais rápido, a taxa de requisições de N alunos comprimidos
equivale à de **N × C alunos em tempo real** ("alunos-equivalentes" nas tabelas). O limite
pessoal (12 Verificar/min) não é atingido com C = 4 (no máximo ~6/min por aluno virtual).

Cenário **rajada**: cada aluno se cadastra, matricula-se e abre a mesma lição (preparação, fora
da medição); então todos clicam em Verificar num instante sorteado dentro de `--janela` (10 s),
com a mistura de códigos de uma 1ª tentativa. Quem recebe 503 ou 429 **insiste** como um
aluno: espera o `Retry-After` (mais 0–3 s) ou 3–6 s sem ele, até 2 vezes, e então desiste. "Do
clique ao veredito" inclui essas esperas.

Salvo indicação, os alunos de uma etapa vêm de IPs diferentes (`--ip-por-aluno`); a turma de
laboratório (todos atrás do mesmo NAT) é o padrão da ferramenta e aparece na §4.3.

### 2.2 O que é medido

- No cliente: p50/p95/p99/máximo por endpoint, status (com o `code` do erro da API), bytes,
  vazão, taxas de erro/429/503, Verificar do clique ao veredito e o tempo no executor que a API
  informa (`durationMs`).
- No servidor, a cada 1 s: CPU e RSS de cada processo **com os filhos** (`/proc`; os Wasmtime
  entram na conta do executor), CPU da máquina e do gerador; ocupação do executor em
  `GET /v1/stats` (rota nova, com o mesmo token da API: lotes rodando e na fila, jobs
  concluídos/recusados/cancelados e, por job, **espera na fila até o 1º lote × execução**);
  e as consultas mais caras do `pg_stat_statements` (zerado no início de cada etapa).

## 3. A ferramenta: `pnpm load:turma`

```bash
# Turma de 40 alunos, 20 minutos de aula comprimidos 4× (5 min reais), chegando em 30 s
RUNNER_TOKEN=... pnpm load:turma --alvo http://localhost:3000 --alunos 40 --duracao 20 --compressao 4 --rampa 30 \
  --runner-url http://localhost:8081 --pg-url postgres://... --monitorar api=PID,web=PID,runner=PID,postgres=PID

# Joelho da rajada: 20, 40, 80 e 120 alunos clicando em Verificar dentro de 10 s
pnpm load:turma --cenario rajada --alunos 20,40,80,120 --janela 10 --ip-por-aluno

# Lição pesada (unittest), três ondas com 60 s entre elas
pnpm load:turma --cenario rajada --licao 21 --alunos 40 --ondas 3 --pausa 60
```

- **Segurança**: recusa qualquer alvo (web, API, executor ou banco) fora desta máquina sem
  `--alvo-autorizado`. Teste de carga contra servidor alheio é ataque de negação de serviço;
  contra a produção, só com a equipe avisada e fora do horário de aula.
- **Saída**: `load-results/<data>-<cenário>/relatorio.json` (tudo, por etapa) e
  `relatorio.md` (visão geral, processos, executor, endpoints e consultas). `--saida` muda a pasta.
- `--ajuda` lista as opções (alunos, duração, compressão, rampa, recorte de lições, janela,
  ondas, reenvios, IP por aluno, Pyodide, monitoramento, semente). A mesma `--semente` reproduz
  a mesma turma.
- Contas criadas: `<prefixo>-e<etapa>-<n>@carga.levelusp.dev`. Rode contra um banco descartável.

## 4. Resultados

### 4.1 Rajada: a turma inteira clica em Verificar em 10 s (lição "Funções")

Lição de posição 5 (8 casos `call` + 2 regras de estrutura). "Desistiu" = recebeu 503 três vezes.

| Configuração | 20 alunos | 40 alunos | 80 alunos | 120 alunos |
|---|---|---|---|---|
| Antes, `CONCURRENCY=1` (padrão do código em 2 vCPU), fila 20 | p95 1,04 s | p95 2,79 s | p95 12,3 s; 46% de 503; **32 desistiram** | p95 11,9 s; 78% de 503; **91 desistiram** |
| Antes, `CONCURRENCY=2` (padrão do compose), fila 20 | p95 0,38 s | p95 0,72 s | p95 5,97 s; 6% de 503 | p95 10,4 s; 26% de 503; **9 desistiram** |
| Antes, `CONCURRENCY=3`, fila 20 | — | p95 0,69 s | p95 5,53 s; 4% de 503 | p95 10,4 s; 24% de 503; 9 desistiram |
| **Depois** (2, fila por tempo, AST agrupada) | **p95 0,32 s** | **p95 0,53 s** | **p95 2,39 s; 0 erro** | **p95 7,02 s; 0 erro; 120/120 corrigidos** |

Detalhes (depois): a última correção da onda sai 9,6 / 9,7 / 12,3 / 17,3 s depois do início
(a janela é de 10 s); espera na fila p95 0,13 / 0,37 / 2,2 / 6,8 s; execução por job p50
140–165 ms. CPU da máquina na onda: 74% / 118% / 169% / 180% (de 200%); a API ficou em 3–5% e
a web em ~1,5%, o PostgreSQL em 1–2%: **a rajada é toda do executor**.

**O que limitava** (antes): a fila contava **lotes** (instâncias WASI), não jobs. A lição
"Funções" tinha 3 lotes por job (execução + 1 por regra de estrutura), então "fila 20" eram ~7
alunos, menos de 2 s de espera — e o executor respondia 503 com a CPU sobrando. Pior: um job
recusado no meio já tinha parte dos lotes na fila, que rodavam para ninguém.

### 4.2 Rajada na lição pesada (`unittest`, 14 instâncias por Verificar)

Lição "unittest" (posição 21 entre as lições de código do curso; `--licao 21`).

| | 20 alunos | 40 alunos |
|---|---|---|
| Antes (`CONCURRENCY=2`, fila 20) | **4 de 20 corrigidos**; 16 desistiram | **1 de 40 corrigido**; 39 desistiram |
| Depois | **20 de 20 corrigidos**; p50 11 s, p95 20,5 s | **27 de 40 corrigidos** (p95 29 s); 13 receberam "fila cheia, tente em N s" |

Cada Verificar dessa lição sobe 14 instâncias (a do aluno + 6 implementações do professor ×
2, para detectar suíte não determinística) ≈ 1,6 s de CPU. Com 2 vCPU, ~0,7 job/s: 40 alunos
em 10 s são ~55 s de trabalho, acima do teto de 20 s de espera, e a fila responde
"ocupado" com `Retry-After` em vez de deixar a API estourar o prazo de 40 s. **Para usar
lições com `unittest` em turma, escalone o Verificar (grupos de 20) ou use 4 vCPU.**

### 4.3 Turma em regime e joelho

Compressão 4 (20 min de aula em 5 min reais), rampa de 30 s.

| Alunos virtuais | Alunos-equivalentes | req/s | Verificar p50 / p95 / p99 | Erros | CPU máquina (média / pico) | API | web | executor | PostgreSQL |
|---:|---:|---:|---|---:|---|---:|---:|---:|---:|
| 40 (laboratório, mesmo IP) | 160 | 13,7 | 0,16 / 0,24 / 0,30 s | 0 | 22% / 86% | 3,8% | 3,5% | 10,9% | 1,3% |
| 80 | 320 | 27,6 | 0,17 / 0,32 / 0,47 s | 0 | 39% / 135% | 6,8% | 5,9% | 20,9% | 2,3% |
| 160 | 640 | 55,0 | 0,19 / 0,49 / 1,56 s | 1 em 32 mil (§5.6) | 73% / 187% | 11,8% | 10,6% | 42,2% | 4,1% |
| 160 (repetição, com o keep-alive corrigido) | 640 | 54,9 | 0,20 / 0,62 / 1,71 s | 0 | 76% / 185% | 11,9% | 10,7% | 43,4% | 4,3% |
| **320** | **1 280** | 108 | 0,57 / **4,48** / 4,81 s | 0 | 139% / 190% | 20,3% | 18,6% | 82,9% | 7,7% |

**Joelho em regime: entre 640 e 1 280 alunos-equivalentes.** Com 1 280, a CPU fica acima de
70% do tempo, a fila do executor chega a 56 lotes (espera p95 4,2 s) e o resto também sente:
p95 de 250 ms nas chamadas da API, 760 ms nas páginas RSC e 520 ms nos JS estáticos. Nenhum
erro em nenhuma etapa. Uma turma real de 40 (160 equivalentes) usa ~1/8 dessa capacidade.

CPU em % de um núcleo. Memória de pico: API ~210–250 MB, web ~290–300 MB, executor ~150–170 MB
(com os Wasmtime), PostgreSQL ~500–660 MB (com `shared_buffers` de 256 MB) — a pilha inteira
cabe com folga em 4 GB. A soma da CPU dos processos fica abaixo da CPU da máquina nas etapas
mais pesadas (trabalho do kernel com a rede local não é atribuído a nenhum processo); conferido
à parte, com jobs só no executor, a conta do executor bate com a da máquina (4,62 × 4,70 s de CPU).

Na turma de 40 (laboratório), todo endpoint ficou com p95 ≤ 70 ms (autosave 12 ms; páginas
RSC 17–68 ms; `/api/lessons/summaries` 25 ms) e o Verificar com p95 0,24 s. A turma de
laboratório não esbarrou no limite por IP (1 200 req/min; o pico foi ~830 req/min) nem no de
credenciais (60/min, o cadastro de 40 alunos em 30 s ficou abaixo). **Atenção**: uma turma de
**60+ alunos atrás do mesmo NAT cadastrando-se no mesmo minuto** recebe 429 no cadastro
(`IP_THROTTLE.credentialLimit = 60`, reproduzido aqui com 64 tentativas); para turmas grandes,
peça que entrem em levas ou use convites do admin.

### 4.4 Tetos de CPU da VM (`compose.vm.yml`)

A mesma rajada da §4.1 com os tetos do `compose.vm.yml` emulados por cgroups
(`cpu.cfs_quota_us`: executor 1,5 núcleo; API, web e PostgreSQL 1,0 cada):

| Configuração | 40 alunos | 80 alunos | 120 alunos |
|---|---|---|---|
| `RUNNER_CPUS=1.5`, `CONCURRENCY=1` | p95 2,68 s | p95 11,8 s (fila de pico 89 lotes) | — |
| **`RUNNER_CPUS=1.5`, `CONCURRENCY=2`** (padrão do `vm.env`) | **p95 0,72 s** | **p95 2,97 s** | p95 9,58 s |
| `RUNNER_CPUS=2.0`, `CONCURRENCY=2` | p95 0,57 s | p95 3,47 s | p95 6,98 s |
| Sem tetos (§4.1) | p95 0,53 s | p95 2,39 s | p95 7,02 s |

Nenhum 503 nem desistência em nenhuma linha (a fila nova aceitou todos). Com o teto de 1,5, a
rajada de 120 fica ~35% mais lenta; até 80 alunos a diferença está dentro do ruído. Como o
teto protege a navegação durante a rajada (§4.5), **mantenha `RUNNER_CPUS=1.5` em 2 vCPU**.

### 4.5 Turma mista: navegação durante a rajada

Com os tetos da VM (executor 1,5), 40 alunos estudando (cenário turma, compressão 4) enquanto
outros 40 clicam em Verificar em três ondas de 10 s (60 s entre elas):

| | Turma sozinha | Turma durante as ondas |
|---|---|---|
| Verificar da turma, p95 | 0,24 s | 0,41 s |
| Autosave, p95 / p99 | 12 / 23 ms | 17 / 50 ms |
| Abrir lição (RSC / `GET /lessons/:id`), p95 | 24 / 26 ms | 32 / 32 ms |
| Painel e catálogo (RSC), p95 | 17–68 ms | 26–38 ms |
| Verificar das ondas, p95 (última correção da onda) | — | 0,98 s (10,0–10,5 s) |

A navegação praticamente não sente a rajada: o executor tem teto próprio e a API e a web
gastam pouca CPU.

### 4.6 Primeira aula: 40 alunos baixando o Pyodide

Com `--pyodide`, cada aluno baixa o núcleo do Pyodide (13,3 MB; 6,4 MB comprimidos) ao abrir a
primeira lição. Turma de 40 chegando em 30 s:

| | Sem Pyodide | Com Pyodide |
|---|---|---|
| CPU média da web | 3,5% | **22,3%** (pico 149%) |
| `pyodide.asm.wasm` (3,6 MB gzip) | — | p50 0,61 s, p95 0,90 s (rede local) |
| Demais endpoints (p95) | ≤ 70 ms | ≤ 78 ms |

O servidor do Next comprime o `pyodide.asm.wasm` (9,6 MB) **a cada download**: ~0,45 s de CPU
por aluno (18 s de CPU para a turma), sem cache da versão comprimida. Os arquivos já são
servidos com `Cache-Control: public, max-age=31536000, immutable`, então cada aluno paga isso
uma vez por navegador. Na produção com o túnel da Cloudflare, uma **regra de cache para
`/pyodide/*`** (Caching → Cache Rules: "Eligible for cache", respeitar o `Cache-Control` da
origem) faz a borda servir os arquivos comprimidos e tira esse custo da VM; com o Caddy, o
custo continua na web. Não mexemos no servidor de arquivos do Next.

### 4.7 Banco de dados

Nenhuma consulta passou de 1 ms em média em nenhuma etapa. Na turma de 40 (5 min), o banco
inteiro somou ~0,5 s de execução; as maiores foram o upsert do autosave
(`lesson_progress`, 0,13 ms × 1 488), a sessão por requisição (0,03 ms × 2 546) e a lição para
correção (0,04 ms × 1 701).

A única consulta que não escala é o **ranking** (`GET /leaderboard`, rota pública): varredura
de `profiles` + ordenação. Com 50 mil perfis sintéticos (`EXPLAIN ANALYZE`):

| | Plano | Tempo |
|---|---|---|
| Antes | `Seq Scan` + `top-N heapsort` | **13,2 ms** |
| Depois (migração `0003_indice_ranking`: índice parcial `(total_xp DESC NULLS FIRST, created_at) WHERE suspended = false AND role = 'student'`) | `Index Scan` + `Limit` | **0,16 ms** |

O `NULLS FIRST` casa com o `ORDER BY total_xp DESC` da consulta (o padrão do Drizzle,
`NULLS LAST`, não seria usado pelo planejador). Com os ~400 perfis do teste a diferença é
irrelevante; com a importação do Supabase, não.

### 4.8 Front-end

**Lighthouse 12.8** (desempenho; celular = Moto G Power simulado em 4G lento, CPU 4×; desktop
= preset desktop), web de produção local. Uma execução por página "antes" e "depois":

| Tela | Celular antes → depois (nota; LCP simulado; TBT) | Desktop antes → depois (nota) |
|---|---|---|
| `/` | 65 → **76**; 4,50 → 3,58 s; 799 → 567 ms | 99 → 100 |
| `/login` | 92 → 92; 2,68 → 2,53 s; 236 → 248 ms | 100 → 100 |
| `/dashboard` | 79 → 77; 1,91 → 3,10 s; 901 → 659 ms | 99 → 99 |
| `/lesson/:id` | 52 → 56; 5,89 → 5,36 s; 1 567 → 1 226 ms | 94 → 96 |

O Lighthouse **simula** o celular a partir de uma carga sem limitação nesta mesma máquina de 2
vCPU, e o LCP simulado varia ±1 s entre execuções (o do painel subiu sem nenhuma mudança que
o afete). O FCP ficou em ~0,92 s em todas as telas. O que pesa no celular é o JavaScript: TBT
de 0,6–1,2 s com CPU 4× (React + Next + framer-motion; na lição, também o CodeMirror). Por
isso a tabela abaixo, com o Chromium de verdade, é a referência para o LCP.

**Chromium real com 4G lento + CPU 4× (CDP), mediana de 3 execuções alternadas** entre a web
do commit base e a otimizada (viewport de celular):

| Tela | LCP antes | LCP depois | FCP (ambas) |
|---|---|---|---|
| `/` (home) | 3,82 s (3,58–3,89) | **1,15 s** (1,13–1,20) | ~1,1 s |
| `/login` | 0,95 s | 0,91 s | ~0,9 s |
| `/dashboard` | 0,90 s | 0,96 s | ~0,9 s |
| `/lesson/:id` | 4,65 s | 4,47 s | ~0,85 s |

**Peso por rota** (carregamento completo, transferido):

| Rota | JS (gzip) | Chamadas à API antes → depois | API antes → depois (gzip) |
|---|---:|---|---|
| `/` | 306 KB | 2 → 2 | 5,8 → 3,5 KB |
| `/login` | 294 KB | 2 → 2 | 5,8 → 3,5 KB |
| `/dashboard` | 329 KB | 8 → 7 | 17,0 → 10,1 KB |
| `/cursos` | 325 KB | 7 → 6 | 15,4 → 8,6 KB |
| `/lesson/:id` | 572 KB (+ 6,4 MB do Pyodide, uma vez) | 8 → 7 | 17,6 → 10,7 KB |
| `/leaderboard` | 324 KB | 6 → 5 | 16,1 → 9,4 KB |

O JS por rota não mudou. ~32 KB gzip (113 KB descomprimidos) de cada rota são o Zod, que vem
para o cliente porque utilitários usados em toda parte (`nonEmpty`, `XP_PER_LEVEL`) moram em
módulos de `@levelusp/contracts` que criam schemas no topo — pendência do UX-26.

**Pyodide pronto** (do clique na lição ao status "Pronto"):

| Rede | Cache frio | Cache quente |
|---|---|---|
| Local, sem limitação | 4,6 s | 3,7 s |
| 4G lento + CPU 4× | **39,8 s** | 4,9 s |

Em 4G lento o download de 6,4 MB leva ~30 s e a partida do CPython ~5–9 s com a CPU
limitada; com cache (o `immutable` de 1 ano) só sobra a partida. Adiar o download do Pyodide
para depois da pintura da lição foi testado e **não mudou o LCP da lição** (4,65 → 4,47 s
dentro do ruído: o LCP é o enunciado, que espera o JS da página e as chamadas da API) nem o
tempo até "Pronto"; a mudança foi descartada.

## 5. Otimizações (antes × depois)

### 5.1 Executor: fila limitada pelo tempo estimado, admissão atômica e 1 instância por CPU

- **Admissão por tempo**: o executor estima, pela média móvel da duração real dos lotes, quanto
  um job novo esperaria; acima de `MAX_QUEUE_WAIT_MS` (20 s) responde 503 com `Retry-After`. O
  teto rígido virou 200 lotes (memória). Uma fila de lotes rápidos aceita a turma inteira; uma
  fila de laços infinitos (10 s cada) recusa cedo.
- **Admissão atômica**: ou todos os lotes do job entram, ou nenhum (antes, um job recusado no
  meio deixava lotes rodando para ninguém: na lição `unittest`, 117 recusas para 1 correção).
- **`CONCURRENCY` padrão = CPUs** (era CPUs − 1, ou seja 1 em 2 vCPU).
- Números: §4.1 e §4.2 (80 alunos: 46% de 503 → 0, p95 12,3 s → 2,4 s; `unittest` com 20
  alunos: 4 → 20 corrigidos). Testes: `apps/runner/test/executor.test.ts`, `semaphore.test.ts`.

### 5.2 Executor: regras de estrutura numa instância só

Cada partida do CPython WASI custa ~120–130 ms (medido: job de 1 sonda `call` 128 ms, de 1 sonda
`ast` 131 ms). As sondas `ast` (análise sintática, que **não executa** o código do aluno) agora
dividem uma instância por job, ainda separada da execução — a garantia de segurança não muda.
Job com 1 `call` + 5 regras: **6 → 2 instâncias, ~780 → 258 ms**. No curso Python Completo, 5
das 22 lições mudam (Comprehensions 6 → 2, Exceções 4 → 2, Lambda 4 → 2, Funções e Context
Managers 3 → 2); somando o curso, 57 → 47 instâncias por rodada completa de Verificar (−18%).
`verify:seed` continua aprovando as 22 referências e reprovando os 72 erros.

### 5.3 API: "corretor ocupado" claro e sem gastar cota

O 503 do executor chega ao aluno como "Muitos envios ao mesmo tempo: a fila do corretor está
cheia. Tente de novo em N s — esta tentativa não contou no seu limite.", com `Retry-After` (a
espera estimada pelo executor), e a API **devolve as cotas** de 12/min e 150/dia/lição (o
código não rodou). Antes, cada 503 consumia uma tentativa: numa rajada com 2 reenvios, um aluno
perdia 3 das 12 do minuto sem ter sido corrigido. No IDE a mensagem aparece como aviso, não
como erro. O filtro de erros registra esses 503 como `warn` sem stack (eram `error` com stack,
um por clique na rajada). Retentar no servidor foi descartado: com a fila limitada pelo tempo,
um 503 já significa "mais de 20 s de espera", e retentar só empurraria a fila para dentro da
API. Testes: `runner.client.spec.ts`, `rate-limit.service.spec.ts`, `learning.e2e.ts`.

### 5.4 Banco: índice do ranking

13,2 ms → 0,16 ms com 50 mil perfis (§4.7). Migração nova `0003_indice_ranking` (nenhuma
migração aplicada foi alterada).

### 5.5 Front

| Mudança | Antes | Depois |
|---|---|---|
| Entrada da home (UX-26): animação CSS na primeira pintura, só deslocamento, em vez de `opacity: 0` do framer-motion até hidratar | LCP 3,82 s (4G lento, CPU 4×) | **1,15 s** |
| Contexto de progresso: lista de lições buscada uma vez, em resumo (`/lessons/summaries`), sem refazer quando a sessão chega | `/api/lessons` (32 KB; 3,6 KB gzip) **2×** por página carregada | `/api/lessons/summaries` (7 KB; 1,3 KB gzip) 1× |

O peso de `/api/lessons` cresce com o conteúdo (leva o enunciado em Markdown de todas as
lições): com o conteúdo real importado do Supabase, a diferença por página carregada cresce na
mesma proporção.

### 5.6 Keep-alive entre os proxies

Na etapa de 640 alunos-equivalentes, 1 Verificar em 656 voltou 500: o rewrite do Next reusou
um socket que a API tinha acabado de fechar (`Failed to proxy … ECONNRESET`; a API nem chegou a
ver a requisição). Os dois lados usavam o ocioso padrão do Node (5 s). Agora a API mantém
conexões ociosas por 65 s (`keepAliveTimeout`, com `headersTimeout` 66 s), mais que o agente
do proxy, e o compose passa `KEEP_ALIVE_TIMEOUT=125000` à web, acima do cloudflared (90 s) e do
Caddy (120 s) — o mesmo problema entre a borda e a web aparece como 502 esporádico, e num POST
(Verificar) o proxy não pode repetir a requisição. O evento é raro e não se reproduziu em
bancada (o agente HTTP do Node respeita o `Keep-Alive: timeout` do servidor; sob carga, o atraso
do laço de eventos come essa margem): **antes, 1 erro em 32 mil requisições** na etapa de 640
alunos-equivalentes; **depois, 0** na repetição da mesma etapa (mesma semente) e na de 1 280.
Teste: `apps/api/src/bootstrap.spec.ts`.

## 6. Configuração recomendada para a produção

- **2 vCPU / 4 GB** (o mínimo do guia) para turmas de até 40 alunos: `RUNNER_CONCURRENCY=2`,
  `RUNNER_MAX_QUEUE_WAIT_MS=20000`, `RUNNER_CPUS=1.5`; o resto como está no `vm.env.example`.
- **4 vCPU / 8 GB** para 80+ alunos verificando juntos ou lições com `unittest` em rajada:
  `RUNNER_CONCURRENCY=4`, `RUNNER_CPUS=3.0`. A capacidade da rajada escala com os núcleos do
  executor (a API e a web quase não usam CPU na rajada).
- Cache da Cloudflare para `/pyodide/*`; `WEB_KEEP_ALIVE_TIMEOUT_MS=125000`.
- Monitoração: `GET /v1/stats` no executor (rede interna, com o `RUNNER_TOKEN`) mostra fila,
  recusas e espera × execução; `peakPending` alto ou `jobs.rejected` subindo = hora de mais vCPU.

## 7. Custo por aluno ativo

Hipóteses: a VM é a única despesa (a VM institucional da USP pode ter custo zero para o
projeto; túnel da Cloudflare gratuito; o "Executar" roda no navegador do aluno); preço de
referência de uma VM equivalente em nuvem: **US$ 24/mês para 2 vCPU / 4 GB** e **US$ 48/mês
para 4 vCPU / 8 GB** (faixa de provedores comuns em 11/2026, sem impostos); tráfego desprezível
(~7 MB por aluno na primeira visita, com o Pyodide em cache por 1 ano; ~20 KB por lição depois).

| Cenário | Alunos ativos no mês | Custo por aluno ativo/mês |
|---|---:|---:|
| Estudo piloto, 1 turma | 40 | US$ 0,60 (2 vCPU) |
| 3 turmas de 40 (horários diferentes) | 120 | US$ 0,20 (2 vCPU) |
| 5 turmas, rajadas de 80 | 200 | US$ 0,24 (4 vCPU) |

Como a capacidade em regime passou de 640 alunos-equivalentes, o custo por aluno é definido
pela **maior turma que verifica ao mesmo tempo**, não pelo total de alunos.

## 8. Limitações e instrumentação pendente

- **Executar no navegador não tem telemetria**: não dá para medir quanto da carga de execução o
  Pyodide tira do servidor (nem a taxa de falha do Pyodide em celulares). Sugestão: um contador
  anônimo por lição (`execucoes_navegador`, `falhas_pyodide`, tempo até "Pronto"), enviado em
  lote, sem código do aluno.
- Gerador e sistema na mesma máquina (2 vCPU): o gerador gastou até 7,4% de um núcleo; numa VM
  só com a pilha, as rajadas teriam um pouco mais de folga.
- Sem rede real: tudo em loopback (sem TLS, túnel ou latência da Cloudflare). A latência
  percebida em produção soma o túnel (dezenas de ms no Brasil, roteiro R2 do relatório de UX).
- PostgreSQL 16 aqui, 17 na produção; ~400 perfis e ~2 mil submissões no banco de teste (o
  ranking foi medido à parte com 50 mil perfis).
- Tetos de CPU emulados com cgroups v1 (§4.4), não com o Docker.

## 9. Como reproduzir

1. `pnpm install && API_INTERNAL_URL=http://localhost:4095 pnpm build`; criar o banco, migrar e
   rodar o seed (`DATABASE_URL=... pnpm db:migrate && pnpm db:seed`); ligar o
   `pg_stat_statements` (`shared_preload_libraries`).
2. Subir executor (`PORT=8095 CONCURRENCY=2 node apps/runner/dist/main.js`), API
   (`NODE_ENV=production APP_ENV=test PORT=4095 RUNNER_URL=http://127.0.0.1:8095 node apps/api/dist/main.js`)
   e web standalone (copiar `.next/static` e `public/` para `.next/standalone/apps/web` e
   `PORT=3095 API_INTERNAL_URL=http://localhost:4095 node apps/web/server.js`).
3. `pnpm load:turma …` como na §3, com `--monitorar` apontando os PIDs.
