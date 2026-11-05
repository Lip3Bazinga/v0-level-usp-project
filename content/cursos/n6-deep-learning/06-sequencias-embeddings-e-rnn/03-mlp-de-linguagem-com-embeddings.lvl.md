---
slug: n6-m6-03-mlp-de-linguagem-com-embeddings
titulo: MLP de linguagem com embeddings (Bengio 2003)
descricao: Contexto de k caracteres, embeddings concatenados, camada escondida tanh, saída softmax sobre o vocabulário, treino com mini-batches e busca da taxa, e os embeddings aprendidos visualizados.
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
- Montar o conjunto de dados (contexto → próximo caractere) e o MLP de linguagem com embeddings
- Treinar com mini-batches, buscar a taxa de aprendizado e atingir NLL abaixo da do bigrama
- Amostrar nomes e inspecionar os embeddings aprendidos (vogais próximas, etc.)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Janela de contexto (`bloco = 3`), tabela `C` (27 × 2 ou 10), concatenar (`view` como reshape), camada escondida, logits; treino em lotes com Adam; busca da taxa por varredura exponencial (makemore parte 2); divisão treino/validação/teste; sobreajuste por tamanho da rede; inicialização para perda inicial correta (logits pequenos); embeddings 2D plotados mentalmente (coordenadas devolvidas).

**Exercícios previstos.** `montar_dados(nomes, bloco, stoi)` (`call` shapes); `forward_mlp_linguagem(params, X)` (`call` + `tolerance`); `treinar_mlp_linguagem(config)` com NLL de validação < 2,3 em semente fixa (`call` + limite de tempo); `varrer_taxa(config)` devolvendo a melhor faixa (`call`); `amostrar_mlp(params, itos, semente, n)` (`call`); quiz sobre contexto fixo.

**Erros comuns a cobrir.** Reshape na ordem errada ao concatenar embeddings; perda inicial alta por logits grandes (inicialização); avaliar no treino; `bloco` com padding sem token inicial.
