---
slug: n4-m1-01-arrays-e-vetorizacao
titulo: Arrays e vetorização
descricao: ndarray, dtype, shape, criação (arange, linspace, zeros, ones), operações elemento a elemento e por que são mais rápidas que laços.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar arrays com dtype e shape controlados e inspecioná-los
- Substituir laços por operações vetorizadas e funções universais (ufuncs)
- Medir a diferença de desempenho entre laço Python e numpy
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `np.array`, `dtype` (int64, float64, bool), `shape`, `ndim`; criação (`arange`, `linspace`, `zeros`, `ones`, `full`, `eye`); operações elemento a elemento, ufuncs (`np.sqrt`, `np.exp`, `np.log`), `sum/mean/std/min/max` com `axis`; vetorização vs laço (`%timeit` mostrado em texto e medido com `perf_counter` no exercício); `reshape`; `astype`.

**Exercícios previstos.** `normalizar(x)` (z-score) sem laços (`call` + `source not_uses for` + `tolerance`); `temperatura_media_por_dia(matriz)` com `axis` (`call`); `comparar_tempo(n)` devolvendo a razão laço/numpy > 5 (`call`); `distancias_euclidianas(pontos, centro)` (`call`); quiz sobre `axis=0` vs `axis=1` e sobre dtype.

**Erros comuns a cobrir.** `np.array([1, 2.5])` promovendo para float sem perceber; `axis` trocado; operar array com lista Python e confiar na conversão; divisão inteira esperada em array float.
