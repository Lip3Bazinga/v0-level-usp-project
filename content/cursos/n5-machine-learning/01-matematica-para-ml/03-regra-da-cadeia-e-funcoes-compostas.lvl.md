---
slug: n5-m1-03-regra-da-cadeia-e-funcoes-compostas
titulo: Regra da cadeia e funções compostas
descricao: Derivar funções compostas (sigmoide, log de sigmoide, custo quadrático de um modelo linear), o grafo de computação e a notação que o Nível 6 vai usar.
dificuldade: avancado
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
- Aplicar a regra da cadeia a composições de duas e três funções
- Derivar a sigmoide e a perda logística e simplificar o resultado
- Desenhar o grafo de computação de uma expressão e propagar derivadas de trás para frente
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `d/dx f(g(x)) = f'(g(x)) g'(x)`; sigmoide `σ' = σ(1 − σ)`; derivada de `(y − wx − b)²` em relação a `w` e `b`; perda logística e sua derivada 'bonita' `(σ(z) − y)x`; o grafo de computação com nós e derivadas locais; backprop em um grafo de três nós feito à mão — exatamente o que o micrograd automatiza no Nível 6.

**Exercícios previstos.** `derivada_sigmoide(z)` conferida numericamente (`call` + `tolerance`); `grad_custo_quadratico(w, b, x, y)` (`call`); `grad_perda_logistica(w, b, x, y)` (`call`); `backprop_manual(a, b, c)` para `f = (a·b + c)²` devolvendo as três derivadas (`call`); quiz sobre a ordem de aplicação.

**Erros comuns a cobrir.** Esquecer o fator interno; sinal errado na derivada de `(y − ŷ)²`; somar em vez de multiplicar derivadas locais; derivar `log(σ)` sem simplificar e errar álgebra.
