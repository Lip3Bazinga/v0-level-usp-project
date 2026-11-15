---
slug: n6-m8-02-limitacoes-alucinacao-vies-e-interpretabilidade
titulo: 'Limitações: alucinação, viés e interpretabilidade'
descricao: Por que modelos de próximo token inventam, de onde vem o viés, o que se consegue interpretar (atenção, sondas, neurônios) e o que não, e implicações para uso responsável.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 90
tempo_min: 35
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Explicar a alucinação a partir do objetivo de treino e identificar situações de risco
- Descrever fontes de viés em dados e em ajuste fino e formas de medição
- Descrever técnicas de interpretabilidade (atenção, sondas lineares, ativação de neurônios) e seus limites
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Leitura com quiz e um exercício: a alucinação como consequência de maximizar plausibilidade; calibração; viés de dados (demonstrado com o corpus do curso: contagem por gênero nos nomes gerados); interpretabilidade: mapas de atenção (e por que não são explicação), sondas lineares nos estados, neurônios polissêmicos; o que isso implica para quem usa modelos (Nível 7).

**Exercícios previstos.** `taxa_de_alucinacao_sintetica(modelo, fatos)` em um mini-teste de 'fatos' do corpus (`call`); `vies_nos_nomes_gerados(params, n, semente)` (`call` + `tolerance`); `sonda_linear(estados, rotulos)` com regressão logística (`call`); quiz de 5 perguntas.

**Erros comuns a cobrir.** Tratar alto peso de atenção como 'o modelo olhou para' no sentido causal; medir viés em uma amostra pequena; confundir calibração com acurácia.
