---
slug: n4-m1-05-numeros-aleatorios-e-simulacao
titulo: Números aleatórios e simulação
descricao: np.random.default_rng, sementes, distribuições (uniform, normal, binomial, choice), simulação de Monte Carlo e bootstrap simples.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Gerar amostras reproduzíveis com default_rng e seed
- Simular experimentos (dados, moedas, filas) e estimar probabilidades por Monte Carlo
- Estimar π e a média de uma população por simulação e medir o erro
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `rng = np.random.default_rng(42)`; `integers`, `random`, `normal`, `binomial`, `choice` (com `p`), `shuffle`, `permutation`; estimar probabilidade por frequência; π por Monte Carlo; lei dos grandes números observada; bootstrap da média (reamostrar com reposição) como aperitivo de inferência; vetorizar a simulação (shape `(n_simulacoes, n)`).

**Exercícios previstos.** `prob_soma_dois_dados(alvo, n, semente)` (`call` + `tolerance 0.02`); `estimar_pi(n, semente)` (`call` + `tolerance`); `simular_fila(chegadas_por_min, atendimentos_por_min, minutos, semente)` (`call`); `bootstrap_media(amostra, n_reamostras, semente)` devolvendo intervalo 2,5–97,5 % (`call` + `tolerance`); quiz sobre semente e sobre `choice` com `p`.

**Erros comuns a cobrir.** `np.random.seed` legado misturado com `default_rng`; laço Python para 10^6 simulações (tempo); `choice` sem `replace=True` no bootstrap; esquecer que a estimativa tem erro (comparar com tolerância).
