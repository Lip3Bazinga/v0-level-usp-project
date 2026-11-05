---
slug: n5-m3-03-roc-auc-e-limiares
titulo: Curva ROC, AUC, precisão-recall e limiares
descricao: Variar o limiar de decisão, construir a curva ROC do zero, AUC como probabilidade de ordenação, curva PR para desbalanceados e escolha do limiar pelo custo.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Construir a curva ROC e calcular AUC do zero e com scikit-learn
- Escolher o limiar de decisão por custo ou por F1 em vez de usar 0,5
- Explicar quando a curva precisão-recall é mais informativa que a ROC
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Limiar como botão separado do modelo; TPR/FPR por limiar; ROC e AUC (interpretação: probabilidade de um positivo ter score maior que um negativo — verificada por contagem de pares); `roc_curve`, `roc_auc_score`; PR e AP em desbalanceados; escolher limiar pelo custo ou F1; calibração citada.

**Exercícios previstos.** `curva_roc(y, scores)` devolvendo FPR, TPR ordenados (`call` + `tolerance`); `auc_por_pares(y, scores)` igual ao `roc_auc_score` (`call`); `melhor_limiar_f1(y, scores)` (`call`); `limiar_por_custo(y, scores, custo_fp, custo_fn)` (`call`); `curva_pr(y, scores)` (`call`); quiz sobre AUC = 0,5 e sobre PR vs ROC.

**Erros comuns a cobrir.** Usar `predict` (já binarizado) em vez de `predict_proba` para ROC; AUC alta com precisão baixa em desbalanceado; limiar escolhido no teste (vazamento); ordenar scores crescente e inverter a curva.
