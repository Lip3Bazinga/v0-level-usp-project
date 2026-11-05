---
slug: n5-m5-04-interpretacao-de-modelos
titulo: 'Interpretação: importâncias, permutação e dependência parcial'
descricao: feature_importances_ e seus vieses, importância por permutação, gráficos de dependência parcial e ICE, e como comunicar o que o modelo aprendeu.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular importância por permutação do zero e comparar com feature_importances_
- Construir gráficos de dependência parcial e interpretá-los com cautela
- Explicar os vieses das importâncias (cardinalidade, correlação) e comunicar resultados sem exagero
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Importância por impureza e seu viés para atributos contínuos/alta cardinalidade; permutação (`permutation_importance`) no conjunto de validação; atributos correlacionados dividindo importância; PDP e ICE (`PartialDependenceDisplay`); SHAP citado como leitura; linguagem honesta ('associação no modelo', não 'causa').

**Exercícios previstos.** `importancia_por_permutacao(modelo, X, y, repeticoes, semente)` (`call` + `tolerance`); `comparar_importancias(modelo, X, y)` identificando o atributo aleatório de alta cardinalidade como falso importante (`call`); `dependencia_parcial(modelo, X, j, grade)` (`call`); quiz sobre correlação e importância.

**Erros comuns a cobrir.** Permutar no treino; interpretar PDP como efeito causal; ignorar correlação entre atributos; reportar importâncias sem incerteza.
