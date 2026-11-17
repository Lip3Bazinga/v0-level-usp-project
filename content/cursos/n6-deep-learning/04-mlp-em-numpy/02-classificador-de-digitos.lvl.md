---
slug: n6-m4-02-classificador-de-digitos
titulo: Um classificador de dígitos em numpy
descricao: 'Treinar o MLP nos dígitos 8×8 (load_digits): preparação, normalização, treino com Adam e mini-batches, acurácia de validação acima de 95 % e análise de erros.'
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 140
tempo_min: 60
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Preparar o conjunto de dígitos (divisão, normalização, rótulos) e treinar o MLP com Adam
- Atingir acurácia de validação acima de 95 % e analisar a matriz de confusão
- Visualizar pesos da primeira camada e exemplos mal classificados
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `load_digits` (1797 imagens 8×8, offline) como mini-MNIST; achatar, normalizar [0, 1] ou z-score; divisão estratificada; treino com o MLP e o Adam do módulo anterior; curva de perda e acurácia; matriz de confusão (reaproveita o Nível 5); pesos da primeira camada como imagens 8×8; erros mais comuns; salvar/carregar parâmetros com `np.savez`.

**Exercícios previstos.** `preparar_digitos(semente)` (`call` com shapes e faixa); `treinar_digitos(config)` atingindo acurácia ≥ 0,95 em validação com semente fixa (`call`); `matriz_de_confusao_digitos(params, X, y)` (`call`); `exemplos_errados(params, X, y, n)` (`call`); `salvar_e_carregar(params, caminho)` (`expr`); quiz sobre normalização e taxa.

**Erros comuns a cobrir.** Não normalizar (perda estagna); rótulos float; usar o conjunto de validação para parar e também para reportar; matriz de confusão com eixos trocados.
