---
slug: n5-m5-01-arvores-de-decisao
titulo: Árvores de decisão
descricao: Impureza de Gini e entropia, ganho de informação, construção recursiva do zero, profundidade e poda, árvores de regressão e a visualização da árvore.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular impureza e ganho de informação e escolher a melhor divisão
- Implementar uma árvore de classificação do zero com critério de parada e comparar com DecisionTreeClassifier
- Controlar o sobreajuste com max_depth, min_samples_leaf e poda por custo-complexidade
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Perguntas binárias sobre atributos; Gini e entropia; busca da melhor divisão (atributo × limiar); recursão até pureza/profundidade; predição por folha; árvores de regressão (variância); sobreajuste natural e os freios; `ccp_alpha`; `export_text` para ler a árvore; invariância à escala; instabilidade (gancho para florestas).

**Exercícios previstos.** `gini(y)` e `entropia(y)` (`call` + `tolerance`); `melhor_divisao(X, y)` devolvendo atributo, limiar e ganho (`call`); classe `ArvoreSimples(max_depth)` com `fit/predict` (`expr` com acurácia ≥ limiar e igual à do scikit-learn em dados simples); `profundidade_otima_por_cv(X, y, profundidades)` (`call`); quiz sobre Gini vs entropia e escala.

**Erros comuns a cobrir.** Testar limiares só nos valores exatos sem o ponto médio; critério de parada ausente (recursão em dados ruidosos); ganho calculado sem ponderar pelos tamanhos; profundidade escolhida no treino.
