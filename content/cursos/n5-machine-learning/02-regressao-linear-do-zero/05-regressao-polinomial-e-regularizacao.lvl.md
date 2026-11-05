---
slug: n5-m2-05-regressao-polinomial-e-regularizacao
titulo: Regressão polinomial e regularização (ridge e lasso)
descricao: Atributos polinomiais, sobreajuste visível, ridge (L2) do zero, lasso (L1) com scikit-learn e o efeito de λ nos coeficientes.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Gerar atributos polinomiais e observar o sobreajuste com o grau
- Implementar ridge do zero (equação normal regularizada e gradiente) e explicar o efeito de λ
- Usar Lasso do scikit-learn para seleção de atributos e comparar os caminhos dos coeficientes
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Expansão polinomial (e interação); curva de treino vs validação por grau; ridge: custo + λ‖w‖², solução `(XᵀX + λI)⁻¹Xᵀy` (sem regularizar o viés), gradiente com termo `2λw`; lasso e coeficientes exatamente zero; escala importa para regularização; `Ridge`/`Lasso` do scikit-learn para conferir.

**Exercícios previstos.** `atributos_polinomiais(x, grau)` (`call`); `erro_treino_validacao_por_grau(x, y, graus)` (`call` + `tolerance`); `ridge_equacao_normal(X, y, lam)` (`call` + `tolerance`); `caminho_ridge(X, y, lambdas)` devolvendo a norma de `w` decrescente (`call`); `selecionar_com_lasso(X, y, alpha)` devolvendo índices não nulos (`call`); quiz sobre L1 vs L2.

**Erros comuns a cobrir.** Regularizar o intercepto; aplicar ridge sem padronizar; grau escolhido pelo erro de treino; comparar λ entre implementações com convenções diferentes (fator 1/n).
