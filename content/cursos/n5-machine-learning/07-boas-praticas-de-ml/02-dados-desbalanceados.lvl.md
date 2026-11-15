---
slug: n5-m7-02-dados-desbalanceados
titulo: Dados desbalanceados
descricao: class_weight, reamostragem (oversampling/undersampling), limiar e métricas adequadas, e por que não reamostrar o conjunto de validação.
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
- Aplicar class_weight e reamostragem corretamente (só no treino) e medir o efeito
- Escolher métricas e limiares para classes raras
- Explicar quando o desbalanceamento é um problema e quando não é
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O que o modelo aprende quando 1 % é positivo; `class_weight="balanced"`; oversampling simples e SMOTE (ideia; implementado do zero em versão simplificada, pois `imblearn` não está disponível); undersampling; reamostrar só o treino (dentro do fold); métricas (PR-AUC, recall em k); limiar; custo.

**Exercícios previstos.** `efeito_class_weight(X, y)` em recall da classe rara (`call`); `smote_simplificado(X, y, k, semente)` (`call` com shape e rótulos); `cv_com_reamostragem_correta(modelo, X, y)` (`call` + `tolerance`); `comparar_metricas_desbalanceado(y, scores)` (`call`); quiz sobre reamostrar validação.

**Erros comuns a cobrir.** Reamostrar antes de dividir (duplicatas no teste); acurácia como métrica; oversampling com `replace=False`; esquecer de ajustar o limiar depois de balancear.
