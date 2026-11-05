---
slug: n5-m6-01-svm-e-kernels
titulo: 'SVM: margem máxima e kernels'
descricao: Margem, vetores de suporte, C como troca margem-erro, o truque do kernel (RBF, polinomial) e a necessidade de escala.
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
- Explicar a margem máxima e o papel de C e identificar os vetores de suporte
- Usar SVC com kernels linear e RBF e ajustar C e gamma por validação
- Implementar a perda hinge com gradiente para um SVM linear simples
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Hiperplano de margem máxima; margem suave e C; `support_vectors_`; perda hinge e GD para SVM linear; kernels como produtos internos em espaços maiores (RBF e `gamma`); fronteiras não lineares nas luas; escala obrigatória; custo em n grande (e `LinearSVC`/SGD).

**Exercícios previstos.** `svm_linear_hinge(X, y, C, taxa, epocas)` (`call` + acurácia); `vetores_de_suporte(modelo)` contagem em dados fixos (`call`); `grade_c_gamma(X, y)` devolvendo o melhor par em escala log (`call`); `efeito_da_escala(X, y)` mostrando a queda sem padronizar (`call`); quiz sobre C e gamma.

**Erros comuns a cobrir.** SVM sem padronizar; `gamma` alto decorando; `probability=True` sem saber o custo; interpretar coeficientes de kernel RBF.
