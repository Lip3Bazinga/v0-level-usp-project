# Custo de infraestrutura para 100 alunos

Dimensionamento de vCPUs e memória para 100 alunos simultâneos, com folga de 30%, **calculado a
partir das medições** (`docs/tcc/dados/*.csv`). Este documento define a conta; os números saem do
script `scripts/bench/custo.mts`, que lê os CSVs. **O preço por hora é parâmetro**: nenhum valor
monetário é assumido aqui.

## 1. Entradas

| Símbolo | Significado | Origem |
|---|---|---|
| N | alunos simultâneos (100) | parâmetro `--alunos` |
| T | tempo médio entre envios de um aluno (s); 45 = média de 30–60 s | parâmetro `--pensar-medio-s` (o mesmo intervalo da carga) |
| m_e | fração dos envios no motor e ∈ {python, dados, ml}; Σ m_e = 1 | premissa, parâmetro `--mix` |
| S_e | tempo de serviço no executor (s): p95 de `runner_exec_ms` (pior condição medida entre quente e frio) | `latencia.csv` |
| u_e | CPU de um worker ocupado (fração de núcleo): `cpu_pct` ÷ k ÷ 100 | `recursos.csv` (`workers`) |
| M_e | memória adicional de um worker (MiB): (pico com k − ocioso) ÷ k | `recursos.csv` (`workers`) |
| M_0 | memória do executor ocioso (MiB) | `recursos.csv` (k = 0) |
| V_api, M_api | vCPUs e memória da API + PostgreSQL | premissa (não medida em contêiner), `--vcpu-api-bd`, `--mem-api-bd-mib` |
| f | folga (0,30) | parâmetro `--folga` |
| π | fator de pico para rajadas (1 = sem) | parâmetro `--fator-pico` |
| P_cpu, P_mem | preço por vCPU-hora e por GiB-hora | **parâmetros do fornecedor**, `--preco-vcpu-hora`, `--preco-gib-hora` |

## 2. Fórmula

Taxa de envios: λ = N ÷ T, e λ_e = λ × m_e.

Workers ocupados ao mesmo tempo (Lei de Little): c_e = λ_e × S_e × π. Workers provisionados:
w_e = max(1, ⌈c_e⌉).

```
vCPU_total   = ( Σ_e c_e × u_e  +  V_api ) × (1 + f)
Memória_MiB  = ( M_0  +  Σ_e w_e × M_e  +  M_api ) × (1 + f)
vCPUs a contratar = ⌈vCPU_total⌉         Memória_GiB = Memória_MiB ÷ 1024

Custo_hora = ⌈vCPU_total⌉ × P_cpu  +  Memória_GiB × P_mem
Custo_mês  = Custo_hora × 730
```

A folga de 30% multiplica a demanda (vCPU e memória), não a capacidade já arredondada. A conta é
por motor porque os três têm custos muito diferentes (WASI: um processo por lote; Pyodide `dados` e
`ml`: um worker com a biblioteca carregada, o `ml` na casa de gigabyte).

## 3. Validação contra a carga

`custo.mts` imprime ao final, por motor, o maior N que o teste de carga aguentou sem saturar
(`carga.csv`: p95 ≤ limite e erro ≤ 1%) e a capacidade do executor usada. Se a máquina da carga tinha
menos vCPUs que o resultado da fórmula para 100 alunos, é esperado saturar antes de N = 100; se
aguentou 100 com folga, a fórmula é conservadora. Reporte as duas coisas e a divergência.

## 4. Como obter os números

```bash
# depois de gerar latencia.csv, recursos.csv e carga.csv (scripts/bench/README.md)
node scripts/bench/custo.mts --alunos 100 --mix python=<a>,dados=<b>,ml=<c>
node scripts/bench/custo.mts --alunos 100 --mix ... --preco-vcpu-hora <P_cpu> --preco-gib-hora <P_mem>
```

## 5. Resultados

Saída do script em 2026-11-25, mix `python=0.4,dados=0.4,ml=0.2`, 100 alunos (≈ 2,2 envios/s),
folga de 30 %, API + banco como premissa (1 vCPU, 1024 MiB), preços não informados. Antes = Fase D
(`docs/tcc/dados/`, `fresh` e `ml:0`); depois = Fase D2 (`docs/tcc/dados/d2/`, `ml` em `reuse`).

| Rodada | Workers (python / dados / ml) | vCPU | Memória | Custo/hora |
|---|---|---:|---:|---|
| Fase D, pior condição (frio) | 1 / 3 / 5 | 16 | 10,2 GiB | 16 × P_vcpu + 10,16 × P_gib |
| D2, `--condicao quente` | 1 / 1 / 1 | 3 | 3,6 GiB | 3 × P_vcpu + 3,6 × P_gib |
| D2, `--condicao pior` | 1 / 4 / 6 | 19 | 11,9 GiB | 19 × P_vcpu + 11,88 × P_gib |

Detalhe da rodada D2 quente (por motor: λ, S, c, vCPU, MiB): python 0,889 / 270 ms / 0,24 / 0,24 / 13;
dados 0,889 / 135 ms / 0,12 / 0,26 / 229; ml 0,444 / 91 ms / 0,04 / 0,05 / 1166.

Como ler: com o `ml` em `reuse` a condição `pior` só vale para o primeiro lote de cada worker, e a
`quente` é otimista para o `dados`, que segue em `fresh`. A leitura intermediária (dados no frio,
python e ml no quente: ≈ 11 vCPU e 4,5 GiB) e a validação contra a carga estão em `medicoes.md`, seção 7.4.

## 6. Limites da estimativa

- Tempo de serviço e CPU por worker vêm de uma máquina específica (registrada em `ambiente.json`); outra CPU muda `S_e` e `u_e`.
- O mix de motores é premissa: um curso concentrado em ML custa várias vezes mais que um de fundamentos.
- A API e o PostgreSQL não foram medidos em contêiner; em `docs/v2/desempenho-e-carga.md` ficam abaixo de 4% de um núcleo cada numa turma de 40, por isso `V_api` é um parâmetro e não um resultado.
- Rajadas (turma inteira clicando junto) pedem `π > 1`; a carga com tempo de pensar de 30–60 s mede o regime, não a rajada.
- Isolamento extra (gVisor na VM futura) tem custo de CPU não incluído.
