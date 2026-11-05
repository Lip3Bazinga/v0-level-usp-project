---
slug: n3-m2-01-medindo-tempo-de-execucao
titulo: Medindo tempo de execução
descricao: time.perf_counter, timeit, repetição e mediana, e por que medir não substitui analisar.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 35
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Medir o tempo de uma função com perf_counter e timeit de forma confiável (repetições, mediana)
- Dobrar a entrada e inferir a ordem de crescimento pela razão dos tempos
- Explicar as limitações da medição (ruído, cache, constantes) e quando analisar em vez de medir
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `perf_counter` ao redor da chamada; `timeit` com `number`/`repeat`; mediana em vez de média; experimento: `sum` vs laço vs `x in lista` vs `x in set` para n crescente; a razão t(2n)/t(n) como diagnóstico (≈2 linear, ≈4 quadrático); ruído na plataforma (a verificação usa tolerâncias largas e compara ordens, não milissegundos).

**Exercícios previstos.** `medir(funcao, entrada, repeticoes)` devolvendo a mediana (`expr` com `type float`); `razao_de_crescimento(funcao, gerador_de_entrada, n)` (`call` com funções conhecidas, esperado na faixa 1.5–2.5 ou 3–5 via `tolerance` ampla); classificar três funções-caixa-preta fornecidas como `"linear"`, `"quadratica"` ou `"constante"` pela medição (`call`); quiz sobre mediana vs média e sobre `timeit`.

**Erros comuns a cobrir.** Medir uma única execução; incluir a geração da entrada na medição; usar `time.time`; concluir ordem de crescimento com n pequeno demais.
