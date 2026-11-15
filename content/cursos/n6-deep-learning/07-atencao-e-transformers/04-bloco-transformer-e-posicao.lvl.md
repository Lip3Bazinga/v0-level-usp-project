---
slug: n6-m7-04-bloco-transformer-e-posicao
titulo: O bloco transformer e a codificação posicional
descricao: LayerNorm, conexões residuais, MLP de duas camadas com GELU, pré-norm vs pós-norm, embeddings posicionais aprendidos e senoidais, e o empilhamento de blocos.
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
- 'Montar o bloco transformer (pré-norm: x + atenção(LN(x)); x + MLP(LN(x)))'
- Implementar embeddings posicionais aprendidos e senoidais e explicar por que a atenção precisa deles
- Empilhar blocos e verificar shapes e gradientes do modelo completo
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Atenção é invariante à permutação → posição explícita; senoidal vs aprendida; o bloco com residual (reaproveita a lição de ResNet) e LayerNorm (reaproveita a lição de normalização); MLP 4×d com GELU; pré-norm (GPT-2) e por que treina melhor; dropout; o modelo completo: embedding de token + posição → blocos → LN final → logits (cabeça compartilhada opcional).

**Exercícios previstos.** `posicional_senoidal(T, d)` (`call` + `tolerance`); `bloco_forward(params, X)` (`call`); `bloco_backward` com grad check nos parâmetros do MLP e da LN (`call`); `montar_gpt(config)` com contagem de parâmetros exata (`call`); `gpt_forward(params, ids)` shapes (`call`); quiz sobre permutação.

**Erros comuns a cobrir.** Residual esquecida (treino degrada); LayerNorm no eixo do lote; posição somada depois do primeiro bloco; GELU implementada como ReLU sem avisar.
