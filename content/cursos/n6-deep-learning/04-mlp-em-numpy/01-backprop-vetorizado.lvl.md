---
slug: n6-m4-01-backprop-vetorizado
titulo: Backprop vetorizado com matrizes
descricao: As equações do backprop para camadas densas (dW = Xᵀ dZ, db = soma, dX = dZ Wᵀ), caches do forward, e a implementação de um MLP de profundidade arbitrária.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 140
tempo_min: 60
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Derivar e implementar o backward de uma camada densa e de uma ativação em forma matricial
- Encadear os backwards de um MLP de L camadas usando os caches do forward
- Validar toda a implementação com verificação numérica de gradientes
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Da regra da cadeia escalar às matrizes: `dW = Xᵀ @ dZ`, `db = dZ.sum(0)`, `dX = dZ @ Wᵀ`; derivação por shapes ('o que precisa ter shape de W'); backward da ReLU (máscara) e da softmax+CE (p − y); estrutura de caches; `forward(params, X) -> (saida, caches)`, `backward(caches, dout) -> grads`; grad check em cada camada; comparação de velocidade com o micrograd escalar.

**Exercícios previstos.** `densa_backward(dZ, cache)` (`call` + verificação numérica); `relu_backward(dA, cache)` (`call`); `mlp_forward`/`mlp_backward` para `[64, 32, 16, 10]` (`call` + `tolerance`); `grad_check_mlp(params, X, y)` com erro < 1e-6 (`call`); `comparar_velocidade()` (`call`); quiz sobre shapes do backward.

**Erros comuns a cobrir.** Transposta no lugar errado (shape mismatch ou, pior, shape certo e valor errado — o grad check pega); `db` sem somar sobre o lote; cache guardando a saída pós-ativação quando o backward precisa da pré-ativação; esquecer de dividir por n.
