---
slug: n5-m2-03-escala-de-atributos-e-taxa-de-aprendizado
titulo: Escala de atributos e taxa de aprendizado
descricao: Por que atributos em escalas diferentes travam o gradiente (vales alongados), padronização e min-max, e a busca da taxa de aprendizado.
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
- Padronizar atributos usando estatísticas do treino e aplicá-las ao teste
- Mostrar o efeito da escala na convergência com curvas de custo
- Escolher a taxa de aprendizado por busca em grade logarítmica
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Curvas de nível alongadas vs circulares; z-score e min-max; o vazamento ao padronizar com estatísticas do conjunto inteiro (regra: `fit` no treino, `transform` no teste — a mesma regra do `StandardScaler`); taxa de aprendizado por grade (1e-4 … 1); desfazer a padronização para interpretar coeficientes.

**Exercícios previstos.** `padronizar_treino_teste(X_tr, X_te)` (`call` + `tolerance`); `epocas_ate_convergir(X, y, taxa, limiar)` com e sem padronização (`call`: sem padronizar deve exigir mais épocas); `buscar_taxa(X, y, taxas)` devolvendo a melhor (`call`); `coeficientes_na_escala_original(w, b, media, desvio)` (`call`); quiz sobre vazamento.

**Erros comuns a cobrir.** Padronizar o alvo sem desfazer na predição; padronizar com estatísticas do teste; esquecer de padronizar novos dados na predição; taxa escolhida sem olhar divergência.
