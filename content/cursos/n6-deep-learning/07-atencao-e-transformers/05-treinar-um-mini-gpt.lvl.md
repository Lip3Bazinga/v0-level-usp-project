---
slug: n6-m7-05-treinar-um-mini-gpt
titulo: Treinar um mini-GPT em numpy
descricao: 'Juntar tudo: dados (texto em português fornecido), lotes de contexto, perda de próximo token, treino com Adam e clipping, curvas de treino/validação e os limites de tempo do sandbox.'
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 150
tempo_min: 60
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Montar o pipeline de treino de um modelo de linguagem (lotes de contexto e alvo deslocado)
- Treinar um mini-GPT de 2 blocos em numpy até a perda de validação cair abaixo do limiar
- Interpretar as curvas e ajustar contexto, dimensão e taxa dentro de um orçamento de tempo
---

## Passo 1 · Leitura · Do texto aos lotes

As quatro lições anteriores montaram o modelo. Falta o que vem antes dele: transformar um texto em exemplos de treino. O caminho tem quatro etapas.

```mermaid
flowchart LR
  C["corpus (texto)"] --> V["vocabulário"]
  V --> I["ids (um inteiro por caractere)"]
  I --> L["lote X: (B, T)"]
  I --> A["alvo Y: X deslocado de 1"]
  L --> M["mini-GPT"]
  A --> P["perda"]
  M --> P
```

**Corpus.** O arquivo `corpus.py` gera o texto do módulo: 1 500 frases sobre uma vila fictícia, montadas por uma gramática pequena (sujeito, verbo, objeto, lugar e, em metade das frases, um tempo), como `a oleira procura o queijo no moinho de manhã.`. São 62 879 caracteres. O texto é simples de propósito: a estrutura dele pode ser aprendida em segundos, e dá para ver o modelo aprendendo de verdade dentro do limite de tempo do executor.

**Vocabulário e ids.** Neste módulo, o token é o caractere (o BPE da primeira lição fica para o projeto). O corpus tem $V = 29$ caracteres distintos, e cada um vira um inteiro de 0 a 28. Os primeiros 90 % dos ids (56 591) são o treino, e os 10 % finais (6 288) ficam para a validação.

```python
import corpus
vocab, ids_treino, ids_val = corpus.carregar()
print(len(vocab), len(ids_treino), len(ids_val))   # 29 56591 6288
```

**Lotes.** O modelo enxerga janelas de $T = 16$ tokens. Um lote é feito de $B$ janelas que começam em pontos sorteados do texto, empilhadas num array `X` de forma $(B, T)$.

**Alvos deslocados.** O alvo `Y` é a mesma janela um passo adiante: se `X` cobre os ids de `i` a `i + T - 1`, `Y` cobre os de `i + 1` a `i + T`. Na posição $t$, o modelo vê `X[:, :t + 1]` (a máscara causal garante isso) e precisa prever `Y[:, t]`. Uma única janela de 16 tokens rende 16 exemplos de treino, com contextos de 1 a 16 tokens.

Por causa do `+ 1`, o último início válido é `len(ids) - T - 1`. Um início sorteado além dele produz uma janela ou um alvo mais curto, e o `np.stack` do lote falha.

## Passo 2 · Previsão · O alvo deslocado

O código monta uma janela e o alvo dela a partir de uma posição fixa do texto, e depois mostra os exemplos de treino que saem dessa janela. Preveja cada linha.

### Código

```python
texto = "a rede no porto."
vocab = sorted(set(texto))
ids = [vocab.index(c) for c in texto]
print(len(vocab))

T = 4
inicio = 2
x = ids[inicio:inicio + T]
y = ids[inicio + 1:inicio + T + 1]
print(repr("".join(vocab[i] for i in x)), repr("".join(vocab[i] for i in y)))

for t in range(T):
    contexto = "".join(vocab[i] for i in x[:t + 1])
    print(repr(contexto), "->", repr(vocab[y[t]]))
```

### Dicas

1. O vocabulário conta caracteres distintos, incluindo o espaço e o ponto.
2. A posição 2 do texto é o `r` de `rede`.
3. Na posição `t`, o alvo é o caractere que vem logo depois do contexto.

### Saída esperada

```text
10
'rede' 'ede '
'r' -> 'e'
're' -> 'd'
'red' -> 'e'
'rede' -> ' '
```

## Passo 3 · Exercício · `gerar_lote(ids, T, B, rng)`
modo: lacunas

Complete a função que sorteia um lote de treino. `ids` é um array de inteiros (o texto inteiro), `T` é o tamanho da janela, `B` é o número de janelas e `rng` é um gerador do numpy já criado. A função devolve `(X, Y)`, os dois de forma `(B, T)`: `X[b]` é uma janela de `T` ids seguidos e `Y[b]` é a mesma janela deslocada um passo adiante.

Os inícios são sorteados com uma chamada só, `rng.integers(0, limite, B)`, em que `limite` é o primeiro início que **não** cabe (o `rng.integers` exclui o limite superior).

### Instruções

1. Sorteie os `B` inícios de modo que a janela e o alvo caibam inteiros no texto.
2. Monte `X` com as janelas de `T` ids a partir de cada início.
3. Monte `Y` com as mesmas janelas deslocadas de 1.

### Código inicial

```python
import numpy as np


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, ___, B)
    X = np.stack([ids[___] for i in inicios])
    Y = np.stack([ids[___] for i in inicios])
    return X, Y


if __name__ == "__main__":
    ids = np.arange(100)
    X, Y = gerar_lote(ids, 8, 4, np.random.default_rng(0))
    print(X.shape, Y.shape)
    print(X[0].tolist(), Y[0].tolist())
```

### Solução

```python
import numpy as np


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


if __name__ == "__main__":
    ids = np.arange(100)
    X, Y = gerar_lote(ids, 8, 4, np.random.default_rng(0))
    print(X.shape, Y.shape)
    print(X[0].tolist(), Y[0].tolist())
```

### Dicas

1. O alvo da última posição da janela é o id `i + T`: ele precisa existir.
2. A janela que começa em `i` vai de `i` até `i + T - 1`.
3. `Y[b, t]` é sempre o id que vem depois de `X[b, t]` no texto.

### Verificação

```json
[
  {"id": "formas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_ids = np.arange(1000, 1100)\n_X, _Y = gerar_lote(_ids, 8, 5, np.random.default_rng(0))", "expr": "[list(_X.shape), list(_Y.shape)]", "expected": [[5, 8], [5, 8]], "name": "X e Y têm forma (B, T)"},
  {"id": "janelas-seguidas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_ids = np.arange(1000, 1100)\n_X, _Y = gerar_lote(_ids, 8, 5, np.random.default_rng(0))", "expr": "bool((np.diff(_X, axis=1) == 1).all())", "expected": true, "name": "Cada linha de X são T ids seguidos do texto"},
  {"id": "alvo-deslocado", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_ids = np.arange(1000, 1100)\n_X, _Y = gerar_lote(_ids, 8, 5, np.random.default_rng(0))", "expr": "bool(np.array_equal(_Y, _X + 1))", "expected": true, "name": "Com ids em sequência, Y é X + 1", "hint": "O alvo começa uma posição depois da janela e tem o mesmo tamanho."},
  {"id": "inicios-do-gerador", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_ids = np.arange(1000, 1100)\n_X, _Y = gerar_lote(_ids, 8, 6, np.random.default_rng(3))", "expr": "bool(np.array_equal(_X[:, 0] - 1000, np.random.default_rng(3).integers(0, 92, 6)))", "expected": true, "name": "Os inícios vêm de uma chamada rng.integers(0, len(ids) - T, B)", "hint": "Com 100 ids e T = 8, os inícios válidos vão de 0 a 91."},
  {"id": "texto-minimo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X, _Y = gerar_lote(np.array([5, 6, 7, 8, 9]), 4, 3, np.random.default_rng(0))", "expr": "[_X.tolist(), _Y.tolist()]", "expected": [[[5, 6, 7, 8], [5, 6, 7, 8], [5, 6, 7, 8]], [[6, 7, 8, 9], [6, 7, 8, 9], [6, 7, 8, 9]]], "name": "Com T + 1 ids, o único início possível é 0", "hint": "O limite do sorteio é len(ids) - T: aqui, 1."},
  {"id": "nunca-curto", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X, _Y = gerar_lote(np.arange(12), 8, 300, np.random.default_rng(1))", "expr": "[list(_X.shape), list(_Y.shape), int(_Y.max())]", "expected": [[300, 8], [300, 8], 11], "name": "300 janelas num texto de 12 ids: nenhuma sai curta, e o último id é alcançado", "hint": "Um início grande demais deixa o alvo sem o último id, e o np.stack falha."},
  {"id": "espalhados", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_ids = np.arange(1000, 1100)\n_X, _Y = gerar_lote(_ids, 8, 200, np.random.default_rng(2))", "expr": "[bool(_X[:, 0].min() < 1010), bool(_X[:, 0].max() > 1080)]", "expected": [true, true], "name": "Os inícios se espalham pelo texto inteiro", "hint": "Os inícios são sorteados, não os primeiros B do texto."},
  {"id": "dois-lotes", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_ids = np.arange(1000, 1100)\n_r = np.random.default_rng(4)\n_X1, _ = gerar_lote(_ids, 8, 6, _r)\n_X2, _ = gerar_lote(_ids, 8, 6, _r)", "expr": "bool(np.array_equal(_X1, _X2))", "expected": false, "name": "Duas chamadas com o mesmo gerador dão lotes diferentes"},
  {"id": "texto-de-verdade", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_ids = np.array([3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8, 9, 7, 9, 3])\n_X, _Y = gerar_lote(_ids, 5, 4, np.random.default_rng(0))", "expr": "bool(np.array_equal(_X[:, 1:], _Y[:, :-1]))", "expected": true, "name": "Num texto qualquer, Y[:, :-1] coincide com X[:, 1:]"}
]
```

### Soluções erradas

```python name="alvo não deslocado"
import numpy as np


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i:i + T] for i in inicios])
    return X, Y


if __name__ == "__main__":
    ids = np.arange(100)
    X, Y = gerar_lote(ids, 8, 4, np.random.default_rng(0))
    print(X.shape, Y.shape)
    print(X[0].tolist(), Y[0].tolist())
```

```python name="início sorteado até len(ids)"
import numpy as np


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids), B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


if __name__ == "__main__":
    ids = np.arange(100)
    X, Y = gerar_lote(ids, 8, 4, np.random.default_rng(0))
    print(X.shape, Y.shape)
    print(X[0].tolist(), Y[0].tolist())
```

```python name="lotes só do início do texto"
import numpy as np


def gerar_lote(ids, T, B, rng):
    inicios = np.arange(B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


if __name__ == "__main__":
    ids = np.arange(100)
    X, Y = gerar_lote(ids, 8, 4, np.random.default_rng(0))
    print(X.shape, Y.shape)
    print(X[0].tolist(), Y[0].tolist())
```

```python name="alvo com um token a menos"
import numpy as np


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T] for i in inicios])
    return X, Y


if __name__ == "__main__":
    ids = np.arange(100)
    X, Y = gerar_lote(ids, 8, 4, np.random.default_rng(0))
    print(X.shape, Y.shape)
    print(X[0].tolist(), Y[0].tolist())
```

```python name="limite do sorteio um a mais"
import numpy as np


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T + 1, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


if __name__ == "__main__":
    ids = np.arange(100)
    X, Y = gerar_lote(ids, 8, 4, np.random.default_rng(0))
    print(X.shape, Y.shape)
    print(X[0].tolist(), Y[0].tolist())
```

```python name="alvo deslocado para trás"
import numpy as np


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i - 1:i + T - 1] for i in inicios])
    return X, Y


if __name__ == "__main__":
    ids = np.arange(100)
    X, Y = gerar_lote(ids, 8, 4, np.random.default_rng(0))
    print(X.shape, Y.shape)
    print(X[0].tolist(), Y[0].tolist())
```

## Passo 4 · Leitura · Perda de próximo token e o orçamento

O forward do mini-GPT devolve logits de forma $(B, T, V)$: para cada janela e cada posição, uma pontuação por caractere do vocabulário. A perda é a entropia cruzada de sempre, com uma diferença só de contabilidade: cada posição de cada janela conta como um exemplo, e a média é tirada sobre os $B \cdot T$ exemplos.

$$
L = -\frac{1}{B\,T} \sum_{b=1}^{B} \sum_{t=1}^{T} \ln p_{b,t}[y_{b,t}], \qquad \frac{\partial L}{\partial \text{logits}} = \frac{p - \text{onehot}(y)}{B\,T}
$$

Antes do treino, as probabilidades são quase iguais e a perda fica perto de $\ln V = \ln 29 = 3{,}37$. Esse número é o primeiro teste de qualquer treino: uma perda inicial muito diferente de $\ln V$ indica defeito na inicialização ou na perda.

O passo de treino usa o Adam, com um cuidado a mais: o **clipping** da norma do gradiente. Se a norma de todos os gradientes juntos passar de 1, eles são divididos por ela, o que impede um lote ruim de dar um passo enorme.

```python
norma = np.sqrt(sum((g ** 2).sum() for g in grads.values()))
if norma > 1.0:
    grads = {k: g / norma for k, g in grads.items()}
```

**O orçamento.** Uma estimativa útil do custo de treinar um modelo com $N$ parâmetros em $D$ tokens é $6ND$ operações: cada parâmetro participa de cerca de 2 operações por token no forward e 4 no backward. Com $N = 15\,008$ e $16 \cdot 16 = 256$ tokens por passo, são 23 milhões de operações por passo. No executor do curso, cada passo desse modelo leva 6,9 ms, o que dá 3,3 bilhões de operações por segundo.

| Modelo | Parâmetros | Tempo por passo |
|---|---|---|
| $T = 16$, $d = 32$, 1 bloco, lote 16 | 15 008 | 6,9 ms |
| $T = 16$, $d = 32$, 2 blocos, lote 16 | 27 584 | 13 ms |
| $T = 32$, $d = 64$, 2 blocos, lote 32 | 105 344 | 220 ms |

Cada execução no curso tem um limite de 10 segundos. O terceiro modelo faria 45 passos nesse tempo, o que não treina nada. Com o primeiro, cabem 600 passos em 4,2 s, e o texto da vila é aprendido. Por isso os exercícios treinam por poucas dezenas de passos, e o modelo treinado por mais tempo chega pronto num arquivo de pesos.

## Passo 5 · Exercício · Perda e treino curto

Escreva a perda e o laço de treino. O arquivo já traz `gerar_lote` (do passo 3), e os arquivos de apoio são `gpt.py` (o mini-GPT de referência: `criar_params`, `forward` e `backward`), `adam.py` (o `Adam` da lição de otimizadores, com `passo(params, grads)` recebendo listas de arrays) e `corpus.py`.

`perda_proximo_token(logits, alvos)` recebe logits `(B, T, V)` e alvos inteiros `(B, T)` e devolve `(perda, dlogits)`: a entropia cruzada média sobre as `B * T` posições, como `float`, e o gradiente dela em relação aos logits, com a forma dos logits. Use a softmax estável.

`treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads)` treina no lugar o dicionário `params` e devolve a lista com a perda de cada passo. A função `perda_e_grads(params, X, Y)` é recebida pronta e devolve `(perda, grads)`, com `grads` um dicionário com as mesmas chaves de `params`. O procedimento é fixo:

- crie `rng = np.random.default_rng(semente)` e um `Adam(taxa)`, uma vez cada;
- a cada passo, sorteie `gerar_lote(ids, T, B, rng)`, chame `perda_e_grads` e guarde a perda;
- clipping: calcule a norma de todos os gradientes juntos (raiz da soma dos quadrados de todos os arrays) e, se ela passar de `1.0`, divida todos os gradientes por ela;
- atualize com `otimizador.passo`, passando as listas de parâmetros e de gradientes na ordem das chaves de `params`.

Nos casos, 40 passos num mini-GPT de 2 blocos levam a perda de perto de $\ln 29 = 3{,}37$ para menos de 2,6 (a solução chega a cerca de 2,1).

### Instruções

1. `perda_proximo_token`: softmax estável no último eixo, média de $-\ln p$ do alvo sobre as `B * T` posições, e `dlogits = (p - onehot) / (B * T)`.
2. `treinar`: gerador e otimizador criados uma vez; a cada passo, lote, perda e gradientes, clipping pela norma global em `1.0`, atualização com o Adam; devolva a lista das perdas.

### Código inicial

```python
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    # logits (B, T, V), alvos (B, T) -> (perda média, dlogits)
    pass


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    # gerador, Adam, e a cada passo: lote, perda e gradientes, clipping, atualização
    pass


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```
```python path=gpt.py
"""Mini-GPT de referência do curso: forward e backward em numpy.

params é um dicionário de arrays. Chaves: "tok" (V, d), "pos" (T, d), por bloco i
"b{i}.ln1_g", "b{i}.ln1_b", "b{i}.Wq", "b{i}.Wk", "b{i}.Wv", "b{i}.Wo", "b{i}.ln2_g",
"b{i}.ln2_b", "b{i}.W1", "b{i}.c1", "b{i}.W2", "b{i}.c2", e no fim "lnf_g", "lnf_b", "Ws" (d, V).
"""
import base64
import json

import numpy as np


def criar_params(V, T, d, n_blocos, semente=0):
    """Sorteia os parâmetros de um mini-GPT (pré-norm, MLP 4d com ReLU)."""
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(n_blocos):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def contar_parametros(params):
    """Total de números em todos os arrays de params."""
    return int(sum(a.size for a in params.values()))


def _ln(x, g, b, eps=1e-5):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + eps)
    return g * (xc / s) + b, (xc / s, s, g)


def _ln_back(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x, h):
    B, T, d = x.shape
    return x.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def forward(params, ids, h=4):
    """ids (B, T) de inteiros -> (logits (B, T, V), cache). T pode ser menor que o contexto."""
    B, T = ids.shape
    n_blocos = sum(1 for k in params if k.endswith(".Wq"))
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // h
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(n_blocos):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1 = _ln(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"], h), _dividir(a @ P["Wk"], h), _dividir(a @ P["Wv"], h)
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _ln(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _ln(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf, h)


def backward(params, dlogits, cache):
    """Gradientes de todos os parâmetros (dicionário com as mesmas chaves), dado dL/dlogits."""
    ids, blocos, f, lnf, h = cache
    B, T = ids.shape
    dh = f.shape[-1] // h
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _ln_back(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _ln_back(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T, h)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _ln_back(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def carregar_pesos(caminho="pesos_gpt.txt"):
    """Lê os pesos pré-treinados: linha 1 com [chave, forma] em JSON, linha 2 com float16 em base64."""
    with open(caminho, encoding="utf-8") as arq:
        formas = json.loads(arq.readline())
        plano = np.frombuffer(base64.b64decode(arq.readline().strip()), dtype=np.float16).astype(np.float64)
    params, i = {}, 0
    for chave, forma in formas:
        n = int(np.prod(forma))
        params[chave] = plano[i:i + n].reshape(forma).copy()
        i += n
    return params
```
```python path=adam.py
import numpy as np


class Adam:
    """O Adam da lição de otimizadores: params e grads são listas planas de arrays, atualizados no lugar."""

    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)
```
```python path=corpus.py
"""Corpus do curso: frases geradas por uma gramática pequena sobre uma vila fictícia."""
import numpy as np

SUJEITOS = ["a padeira", "o ferreiro", "a tecelã", "o pescador", "a moleira", "o pastor", "a oleira", "o barqueiro"]
VERBOS = ["leva", "guarda", "vende", "procura", "conserta", "divide"]
OBJETOS = ["o pão", "a rede", "o barco", "a lenha", "o queijo", "a farinha", "o cesto", "o azeite"]
LUGARES = ["na praça", "no moinho", "na ponte", "no porto", "na feira", "no celeiro"]
TEMPOS = ["de manhã", "à tarde", "à noite", "até o almoço", "antes da chuva", "depois da festa"]


def gerar_corpus(n_frases=1500, semente=0):
    """Devolve n_frases frases, uma por linha; metade delas termina com um tempo."""
    rng = np.random.default_rng(semente)
    frases = []
    for _ in range(n_frases):
        partes = [str(rng.choice(SUJEITOS)), str(rng.choice(VERBOS)), str(rng.choice(OBJETOS)), str(rng.choice(LUGARES))]
        if rng.random() < 0.5:
            partes.append(str(rng.choice(TEMPOS)))
        frases.append(" ".join(partes) + ".")
    return "\n".join(frases) + "\n"


def vocabulario(texto):
    """Caracteres distintos do texto, em ordem."""
    return sorted(set(texto))


def codificar(texto, vocab):
    """Texto -> array de ids (posição de cada caractere em vocab)."""
    para_id = {c: i for i, c in enumerate(vocab)}
    return np.array([para_id[c] for c in texto], dtype=np.intp)


def decodificar(ids, vocab):
    """Ids -> texto."""
    return "".join(vocab[int(i)] for i in ids)


def carregar(n_frases=1500, semente=0, fracao_treino=0.9):
    """Devolve (vocab, ids_treino, ids_val): os últimos 10 % do texto ficam para validação."""
    texto = gerar_corpus(n_frases, semente)
    vocab = vocabulario(texto)
    ids = codificar(texto, vocab)
    corte = int(len(ids) * fracao_treino)
    return vocab, ids[:corte], ids[corte:]
```

### Solução

```python
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        norma = float(np.sqrt(sum((grads[k] ** 2).sum() for k in chaves)))
        if norma > 1.0:
            grads = {k: grads[k] / norma for k in chaves}
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```
```python path=gpt.py
"""Mini-GPT de referência do curso: forward e backward em numpy.

params é um dicionário de arrays. Chaves: "tok" (V, d), "pos" (T, d), por bloco i
"b{i}.ln1_g", "b{i}.ln1_b", "b{i}.Wq", "b{i}.Wk", "b{i}.Wv", "b{i}.Wo", "b{i}.ln2_g",
"b{i}.ln2_b", "b{i}.W1", "b{i}.c1", "b{i}.W2", "b{i}.c2", e no fim "lnf_g", "lnf_b", "Ws" (d, V).
"""
import base64
import json

import numpy as np


def criar_params(V, T, d, n_blocos, semente=0):
    """Sorteia os parâmetros de um mini-GPT (pré-norm, MLP 4d com ReLU)."""
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(n_blocos):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def contar_parametros(params):
    """Total de números em todos os arrays de params."""
    return int(sum(a.size for a in params.values()))


def _ln(x, g, b, eps=1e-5):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + eps)
    return g * (xc / s) + b, (xc / s, s, g)


def _ln_back(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x, h):
    B, T, d = x.shape
    return x.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def forward(params, ids, h=4):
    """ids (B, T) de inteiros -> (logits (B, T, V), cache). T pode ser menor que o contexto."""
    B, T = ids.shape
    n_blocos = sum(1 for k in params if k.endswith(".Wq"))
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // h
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(n_blocos):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1 = _ln(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"], h), _dividir(a @ P["Wk"], h), _dividir(a @ P["Wv"], h)
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _ln(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _ln(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf, h)


def backward(params, dlogits, cache):
    """Gradientes de todos os parâmetros (dicionário com as mesmas chaves), dado dL/dlogits."""
    ids, blocos, f, lnf, h = cache
    B, T = ids.shape
    dh = f.shape[-1] // h
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _ln_back(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _ln_back(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T, h)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _ln_back(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def carregar_pesos(caminho="pesos_gpt.txt"):
    """Lê os pesos pré-treinados: linha 1 com [chave, forma] em JSON, linha 2 com float16 em base64."""
    with open(caminho, encoding="utf-8") as arq:
        formas = json.loads(arq.readline())
        plano = np.frombuffer(base64.b64decode(arq.readline().strip()), dtype=np.float16).astype(np.float64)
    params, i = {}, 0
    for chave, forma in formas:
        n = int(np.prod(forma))
        params[chave] = plano[i:i + n].reshape(forma).copy()
        i += n
    return params
```
```python path=adam.py
import numpy as np


class Adam:
    """O Adam da lição de otimizadores: params e grads são listas planas de arrays, atualizados no lugar."""

    def __init__(self, taxa=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa = taxa
        self.beta1 = beta1
        self.beta2 = beta2
        self.eps = eps
        self.t = 0
        self.m = None
        self.v = None

    def passo(self, params, grads):
        if self.m is None:
            self.m = [np.zeros_like(p) for p in params]
            self.v = [np.zeros_like(p) for p in params]
        self.t += 1
        for i, (p, g) in enumerate(zip(params, grads)):
            self.m[i] = self.beta1 * self.m[i] + (1 - self.beta1) * g
            self.v[i] = self.beta2 * self.v[i] + (1 - self.beta2) * g * g
            m_c = self.m[i] / (1 - self.beta1 ** self.t)
            v_c = self.v[i] / (1 - self.beta2 ** self.t)
            p -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)
```
```python path=corpus.py
"""Corpus do curso: frases geradas por uma gramática pequena sobre uma vila fictícia."""
import numpy as np

SUJEITOS = ["a padeira", "o ferreiro", "a tecelã", "o pescador", "a moleira", "o pastor", "a oleira", "o barqueiro"]
VERBOS = ["leva", "guarda", "vende", "procura", "conserta", "divide"]
OBJETOS = ["o pão", "a rede", "o barco", "a lenha", "o queijo", "a farinha", "o cesto", "o azeite"]
LUGARES = ["na praça", "no moinho", "na ponte", "no porto", "na feira", "no celeiro"]
TEMPOS = ["de manhã", "à tarde", "à noite", "até o almoço", "antes da chuva", "depois da festa"]


def gerar_corpus(n_frases=1500, semente=0):
    """Devolve n_frases frases, uma por linha; metade delas termina com um tempo."""
    rng = np.random.default_rng(semente)
    frases = []
    for _ in range(n_frases):
        partes = [str(rng.choice(SUJEITOS)), str(rng.choice(VERBOS)), str(rng.choice(OBJETOS)), str(rng.choice(LUGARES))]
        if rng.random() < 0.5:
            partes.append(str(rng.choice(TEMPOS)))
        frases.append(" ".join(partes) + ".")
    return "\n".join(frases) + "\n"


def vocabulario(texto):
    """Caracteres distintos do texto, em ordem."""
    return sorted(set(texto))


def codificar(texto, vocab):
    """Texto -> array de ids (posição de cada caractere em vocab)."""
    para_id = {c: i for i, c in enumerate(vocab)}
    return np.array([para_id[c] for c in texto], dtype=np.intp)


def decodificar(ids, vocab):
    """Ids -> texto."""
    return "".join(vocab[int(i)] for i in ids)


def carregar(n_frases=1500, semente=0, fracao_treino=0.9):
    """Devolve (vocab, ids_treino, ids_val): os últimos 10 % do texto ficam para validação."""
    texto = gerar_corpus(n_frases, semente)
    vocab = vocabulario(texto)
    ids = codificar(texto, vocab)
    corte = int(len(ids) * fracao_treino)
    return vocab, ids[:corte], ids[corte:]
```

### Dicas

1. Para indexar a probabilidade do alvo em três eixos, use `P[linhas, colunas, alvos]` com `linhas = np.arange(B)[:, None]` e `colunas = np.arange(T)`.
2. A norma global é uma só para o modelo inteiro: some os quadrados de todos os arrays antes de tirar a raiz.
3. `list(params)` dá as chaves na ordem do dicionário; use a mesma ordem para as duas listas do `passo`.

### Verificação

```json
[
  {"id": "logits-iguais", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "perda_proximo_token(np.zeros((2, 3, 29)), np.array([[0, 5, 28], [7, 7, 1]]))[0]", "expected": 3.367295829986474, "tolerance": 1e-12, "name": "Logits iguais com V = 29: a perda é ln 29", "hint": "Com logits iguais, cada caractere tem probabilidade 1/29."},
  {"id": "perda-referencia", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(13)\n_lg = _rng.normal(size=(2, 3, 4))\n_y = np.array([[0, 3, 1], [2, 2, 0]])\ndef _ref(lg, y):\n    total = 0.0\n    for b in range(lg.shape[0]):\n        for t in range(lg.shape[1]):\n            e = np.exp(lg[b, t] - lg[b, t].max())\n            total -= float(np.log(e[y[b, t]] / e.sum()))\n    return total / (lg.shape[0] * lg.shape[1])\ndef _numerico(h=1e-5):\n    n = np.zeros_like(_lg)\n    it = np.nditer(_lg, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = _lg[i]\n        _lg[i] = v + h\n        mais = _ref(_lg, _y)\n        _lg[i] = v - h\n        menos = _ref(_lg, _y)\n        _lg[i] = v\n        n[i] = (mais - menos) / (2 * h)\n    return n\n", "expr": "bool(abs(perda_proximo_token(_lg, _y)[0] - _ref(_lg, _y)) < 1e-12)", "expected": true, "name": "Perda igual à da referência (B = 2, T = 3, V = 4)", "hint": "É a média sobre as B · T posições, não a soma."},
  {"id": "perda-float", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(13)\n_lg = _rng.normal(size=(2, 3, 4))\n_y = np.array([[0, 3, 1], [2, 2, 0]])\ndef _ref(lg, y):\n    total = 0.0\n    for b in range(lg.shape[0]):\n        for t in range(lg.shape[1]):\n            e = np.exp(lg[b, t] - lg[b, t].max())\n            total -= float(np.log(e[y[b, t]] / e.sum()))\n    return total / (lg.shape[0] * lg.shape[1])\ndef _numerico(h=1e-5):\n    n = np.zeros_like(_lg)\n    it = np.nditer(_lg, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = _lg[i]\n        _lg[i] = v + h\n        mais = _ref(_lg, _y)\n        _lg[i] = v - h\n        menos = _ref(_lg, _y)\n        _lg[i] = v\n        n[i] = (mais - menos) / (2 * h)\n    return n\n", "expr": "[type(perda_proximo_token(_lg, _y)[0]) is float, list(perda_proximo_token(_lg, _y)[1].shape)]", "expected": [true, [2, 3, 4]], "name": "A perda é float e dlogits tem a forma dos logits"},
  {"id": "dlogits-numerico", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(13)\n_lg = _rng.normal(size=(2, 3, 4))\n_y = np.array([[0, 3, 1], [2, 2, 0]])\ndef _ref(lg, y):\n    total = 0.0\n    for b in range(lg.shape[0]):\n        for t in range(lg.shape[1]):\n            e = np.exp(lg[b, t] - lg[b, t].max())\n            total -= float(np.log(e[y[b, t]] / e.sum()))\n    return total / (lg.shape[0] * lg.shape[1])\ndef _numerico(h=1e-5):\n    n = np.zeros_like(_lg)\n    it = np.nditer(_lg, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = _lg[i]\n        _lg[i] = v + h\n        mais = _ref(_lg, _y)\n        _lg[i] = v - h\n        menos = _ref(_lg, _y)\n        _lg[i] = v\n        n[i] = (mais - menos) / (2 * h)\n    return n\n_d = perda_proximo_token(_lg, _y)[1]\n_n = _numerico()", "expr": "bool(np.linalg.norm(_d - _n) / (np.linalg.norm(_d) + np.linalg.norm(_n)) < 1e-7)", "expected": true, "name": "dlogits confere com a diferença central", "hint": "dlogits = (p − onehot do alvo) / (B · T)."},
  {"id": "dlogits-soma-zero", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(13)\n_lg = _rng.normal(size=(2, 3, 4))\n_y = np.array([[0, 3, 1], [2, 2, 0]])\ndef _ref(lg, y):\n    total = 0.0\n    for b in range(lg.shape[0]):\n        for t in range(lg.shape[1]):\n            e = np.exp(lg[b, t] - lg[b, t].max())\n            total -= float(np.log(e[y[b, t]] / e.sum()))\n    return total / (lg.shape[0] * lg.shape[1])\ndef _numerico(h=1e-5):\n    n = np.zeros_like(_lg)\n    it = np.nditer(_lg, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = _lg[i]\n        _lg[i] = v + h\n        mais = _ref(_lg, _y)\n        _lg[i] = v - h\n        menos = _ref(_lg, _y)\n        _lg[i] = v\n        n[i] = (mais - menos) / (2 * h)\n    return n\n", "expr": "bool(np.allclose(perda_proximo_token(_lg, _y)[1].sum(axis=-1), 0.0, atol=1e-12))", "expected": true, "name": "Em cada posição, dlogits soma zero"},
  {"id": "logits-grandes", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(13)\n_lg = _rng.normal(size=(2, 3, 4))\n_y = np.array([[0, 3, 1], [2, 2, 0]])\ndef _ref(lg, y):\n    total = 0.0\n    for b in range(lg.shape[0]):\n        for t in range(lg.shape[1]):\n            e = np.exp(lg[b, t] - lg[b, t].max())\n            total -= float(np.log(e[y[b, t]] / e.sum()))\n    return total / (lg.shape[0] * lg.shape[1])\ndef _numerico(h=1e-5):\n    n = np.zeros_like(_lg)\n    it = np.nditer(_lg, flags=[\"multi_index\"])\n    for _ in it:\n        i = it.multi_index\n        v = _lg[i]\n        _lg[i] = v + h\n        mais = _ref(_lg, _y)\n        _lg[i] = v - h\n        menos = _ref(_lg, _y)\n        _lg[i] = v\n        n[i] = (mais - menos) / (2 * h)\n    return n\n", "expr": "bool(abs(perda_proximo_token(_lg + 1000.0, _y)[0] - _ref(_lg, _y)) < 1e-9)", "expected": true, "name": "Somar 1 000 a todos os logits não muda a perda nem produz nan", "hint": "Subtraia o máximo de cada posição antes da exponencial."},
  {"id": "tres-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(400) * 7 + np.arange(400) // 3) % 5\n_xs = []\n_fatores = [8.0, 0.5, 20.0]\ndef _tabela(p, X, Y):\n    Z = p[\"W\"][X] + p[\"b\"]\n    Pm = np.exp(Z - Z.max(axis=-1, keepdims=True))\n    Pm = Pm / Pm.sum(axis=-1, keepdims=True)\n    l, c = np.arange(X.shape[0])[:, None], np.arange(X.shape[1])\n    perda = float(-np.log(Pm[l, c, Y]).mean())\n    d = Pm.copy()\n    d[l, c, Y] -= 1.0\n    d = d / X.size\n    gW = np.zeros_like(p[\"W\"])\n    np.add.at(gW, X, d)\n    f = _fatores[len(_xs) % 3]\n    _xs.append(X.copy())\n    return perda, {\"W\": f * gW, \"b\": f * d.sum(axis=(0, 1))}\ndef _novo():\n    r = np.random.default_rng(21)\n    return {\"W\": r.normal(0.0, 0.5, (5, 5)), \"b\": np.zeros(5)}\n_p = _novo()\n_per = treinar(_p, _ids, 6, 8, 3, 0.05, 4, _tabela)", "expr": "_per", "expected": [1.566302303242279, 1.539121497034128, 1.5951600559518775], "tolerance": 1e-09, "name": "Três passos num modelo de tabela: as três perdas", "hint": "Confira a ordem: lote, perda e gradientes, clipping pela norma global, passo do Adam."},
  {"id": "tres-passos-pesos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(400) * 7 + np.arange(400) // 3) % 5\n_xs = []\n_fatores = [8.0, 0.5, 20.0]\ndef _tabela(p, X, Y):\n    Z = p[\"W\"][X] + p[\"b\"]\n    Pm = np.exp(Z - Z.max(axis=-1, keepdims=True))\n    Pm = Pm / Pm.sum(axis=-1, keepdims=True)\n    l, c = np.arange(X.shape[0])[:, None], np.arange(X.shape[1])\n    perda = float(-np.log(Pm[l, c, Y]).mean())\n    d = Pm.copy()\n    d[l, c, Y] -= 1.0\n    d = d / X.size\n    gW = np.zeros_like(p[\"W\"])\n    np.add.at(gW, X, d)\n    f = _fatores[len(_xs) % 3]\n    _xs.append(X.copy())\n    return perda, {\"W\": f * gW, \"b\": f * d.sum(axis=(0, 1))}\ndef _novo():\n    r = np.random.default_rng(21)\n    return {\"W\": r.normal(0.0, 0.5, (5, 5)), \"b\": np.zeros(5)}\n_p = _novo()\ntreinar(_p, _ids, 6, 8, 3, 0.05, 4, _tabela)", "expr": "_p[\"W\"].ravel().tolist() + _p[\"b\"].tolist()", "expected": [0.04734643884200472, 0.6238769514803036, -0.7594832020246597, 0.92974321349527, -0.15512126659119843, -0.5290986979853328, -0.5289206971081222, -0.6706394016902603, 0.018961588382009335, 0.279001017408199, 0.41555185942809714, 0.18606804588596979, -0.9817001412078001, -0.9197661405893939, 0.9117532851641533, 0.6117643552647728, 0.986286415831074, 0.47343367873094816, -0.6436504162266157, 0.5123191690406494, 0.18864089809568246, 0.22778071312636405, -0.27520387610678215, -0.12423211174707509, -0.19742356639345687, 0.1096194182148919, -0.12961973335518762, 0.13607556574383406, 0.10760767300263183, -0.12621079565211754], "tolerance": 1e-09, "name": "Os pesos depois dos três passos (com gradientes de norma acima e abaixo de 1)", "hint": "O clipping divide todos os gradientes pela mesma norma, só quando ela passa de 1; o Adam é um só para o treino inteiro."},
  {"id": "lista-de-perdas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(400) * 7 + np.arange(400) // 3) % 5\n_xs = []\n_fatores = [8.0, 0.5, 20.0]\ndef _tabela(p, X, Y):\n    Z = p[\"W\"][X] + p[\"b\"]\n    Pm = np.exp(Z - Z.max(axis=-1, keepdims=True))\n    Pm = Pm / Pm.sum(axis=-1, keepdims=True)\n    l, c = np.arange(X.shape[0])[:, None], np.arange(X.shape[1])\n    perda = float(-np.log(Pm[l, c, Y]).mean())\n    d = Pm.copy()\n    d[l, c, Y] -= 1.0\n    d = d / X.size\n    gW = np.zeros_like(p[\"W\"])\n    np.add.at(gW, X, d)\n    f = _fatores[len(_xs) % 3]\n    _xs.append(X.copy())\n    return perda, {\"W\": f * gW, \"b\": f * d.sum(axis=(0, 1))}\ndef _novo():\n    r = np.random.default_rng(21)\n    return {\"W\": r.normal(0.0, 0.5, (5, 5)), \"b\": np.zeros(5)}\n_p = _novo()\n_per = treinar(_p, _ids, 6, 8, 7, 0.05, 4, _tabela)", "expr": "[type(_per) is list, len(_per), len(_xs), list(_xs[0].shape)]", "expected": [true, 7, 7, [8, 6]], "name": "Uma perda por passo, uma chamada de perda_e_grads por passo, lotes (B, T)"},
  {"id": "lotes-variam", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(400) * 7 + np.arange(400) // 3) % 5\n_xs = []\n_fatores = [8.0, 0.5, 20.0]\ndef _tabela(p, X, Y):\n    Z = p[\"W\"][X] + p[\"b\"]\n    Pm = np.exp(Z - Z.max(axis=-1, keepdims=True))\n    Pm = Pm / Pm.sum(axis=-1, keepdims=True)\n    l, c = np.arange(X.shape[0])[:, None], np.arange(X.shape[1])\n    perda = float(-np.log(Pm[l, c, Y]).mean())\n    d = Pm.copy()\n    d[l, c, Y] -= 1.0\n    d = d / X.size\n    gW = np.zeros_like(p[\"W\"])\n    np.add.at(gW, X, d)\n    f = _fatores[len(_xs) % 3]\n    _xs.append(X.copy())\n    return perda, {\"W\": f * gW, \"b\": f * d.sum(axis=(0, 1))}\ndef _novo():\n    r = np.random.default_rng(21)\n    return {\"W\": r.normal(0.0, 0.5, (5, 5)), \"b\": np.zeros(5)}\n_p = _novo()\ntreinar(_p, _ids, 6, 8, 3, 0.05, 4, _tabela)", "expr": "[bool(np.array_equal(_xs[0], _xs[1])), bool(np.array_equal(_xs[0][:, 0], _ids[np.random.default_rng(4).integers(0, 394, 8)]))]", "expected": [false, true], "name": "Os lotes mudam a cada passo, e o primeiro vem do gerador com a semente pedida", "hint": "O gerador é criado uma vez, antes do laço, com default_rng(semente)."},
  {"id": "semente", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(400) * 7 + np.arange(400) // 3) % 5\n_xs = []\n_fatores = [8.0, 0.5, 20.0]\ndef _tabela(p, X, Y):\n    Z = p[\"W\"][X] + p[\"b\"]\n    Pm = np.exp(Z - Z.max(axis=-1, keepdims=True))\n    Pm = Pm / Pm.sum(axis=-1, keepdims=True)\n    l, c = np.arange(X.shape[0])[:, None], np.arange(X.shape[1])\n    perda = float(-np.log(Pm[l, c, Y]).mean())\n    d = Pm.copy()\n    d[l, c, Y] -= 1.0\n    d = d / X.size\n    gW = np.zeros_like(p[\"W\"])\n    np.add.at(gW, X, d)\n    f = _fatores[len(_xs) % 3]\n    _xs.append(X.copy())\n    return perda, {\"W\": f * gW, \"b\": f * d.sum(axis=(0, 1))}\ndef _novo():\n    r = np.random.default_rng(21)\n    return {\"W\": r.normal(0.0, 0.5, (5, 5)), \"b\": np.zeros(5)}\n_p = _novo()\n_a = treinar(_novo(), _ids, 6, 8, 4, 0.05, 1, _tabela)\n_xs.clear()\n_b = treinar(_novo(), _ids, 6, 8, 4, 0.05, 1, _tabela)\n_xs.clear()\n_c = treinar(_novo(), _ids, 6, 8, 4, 0.05, 2, _tabela)", "expr": "[_a == _b, _a != _c]", "expected": [true, true], "name": "Mesma semente, mesmas perdas; outra semente, outras perdas"},
  {"id": "gpt-2-blocos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nimport corpus\nimport gpt\n_vocab, _tr, _va = corpus.carregar()\ndef _peg(p, X, Y):\n    logits, cache = gpt.forward(p, X)\n    perda, dlogits = perda_proximo_token(logits, Y)\n    return perda, gpt.backward(p, dlogits, cache)\n_p = gpt.criar_params(29, 16, 32, 2, 0)\n_per = treinar(_p, _tr, 16, 16, 40, 0.01, 0, _peg)", "expr": "[bool(abs(_per[0] - 3.37) < 0.15), bool(float(np.mean(_per[-5:])) < 2.6)]", "expected": [true, true], "name": "Mini-GPT de 2 blocos, 40 passos: começa perto de ln 29 e termina abaixo de 2,6", "hint": "A solução chega a cerca de 2,1 na média dos 5 últimos passos."},
  {"id": "gpt-1-bloco", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nimport corpus\nimport gpt\n_vocab, _tr, _va = corpus.carregar()\ndef _peg(p, X, Y):\n    logits, cache = gpt.forward(p, X)\n    perda, dlogits = perda_proximo_token(logits, Y)\n    return perda, gpt.backward(p, dlogits, cache)\n_p = gpt.criar_params(29, 16, 32, 1, 0)\n_per = treinar(_p, _tr, 16, 16, 60, 0.01, 0, _peg)", "expr": "bool(float(np.mean(_per[-5:])) < 2.1)", "expected": true, "name": "Mini-GPT de 1 bloco, 60 passos: perda abaixo de 2,1", "hint": "A solução chega a cerca de 1,7."}
]
```

### Soluções erradas

```python name="perda somada no lugar da média"
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).sum())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        norma = float(np.sqrt(sum((grads[k] ** 2).sum() for k in chaves)))
        if norma > 1.0:
            grads = {k: grads[k] / norma for k in chaves}
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```

```python name="dlogits sem dividir por B vezes T"
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        norma = float(np.sqrt(sum((grads[k] ** 2).sum() for k in chaves)))
        if norma > 1.0:
            grads = {k: grads[k] / norma for k in chaves}
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```

```python name="softmax no eixo do tempo"
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        norma = float(np.sqrt(sum((grads[k] ** 2).sum() for k in chaves)))
        if norma > 1.0:
            grads = {k: grads[k] / norma for k in chaves}
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```

```python name="dlogits sem subtrair 1 do alvo"
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    return perda, dlogits / (B * T)


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        norma = float(np.sqrt(sum((grads[k] ** 2).sum() for k in chaves)))
        if norma > 1.0:
            grads = {k: grads[k] / norma for k in chaves}
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```

```python name="treino sem clipping"
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        norma = float(np.sqrt(sum((grads[k] ** 2).sum() for k in chaves)))
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```

```python name="clipping por array, não pela norma global"
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        grads = {k: grads[k] / max(1.0, float(np.sqrt((grads[k] ** 2).sum()))) for k in chaves}
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```

```python name="otimizador recriado a cada passo"
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        norma = float(np.sqrt(sum((grads[k] ** 2).sum() for k in chaves)))
        if norma > 1.0:
            grads = {k: grads[k] / norma for k in chaves}
        otimizador = Adam(taxa)
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```

```python name="gerador recriado a cada passo"
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    otimizador = Adam(taxa)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        rng = np.random.default_rng(semente)
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        norma = float(np.sqrt(sum((grads[k] ** 2).sum() for k in chaves)))
        if norma > 1.0:
            grads = {k: grads[k] / norma for k in chaves}
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```

```python name="clipping sempre, mesmo com norma pequena"
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        norma = float(np.sqrt(sum((grads[k] ** 2).sum() for k in chaves)))
        grads = {k: grads[k] / norma for k in chaves}
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```

```python name="devolve só a última perda"
import numpy as np

import gpt
from adam import Adam


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def treinar(params, ids, T, B, passos, taxa, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(taxa)
    chaves = list(params)
    perdas = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, T, B, rng)
        perda, grads = perda_e_grads(params, X, Y)
        norma = float(np.sqrt(sum((grads[k] ** 2).sum() for k in chaves)))
        if norma > 1.0:
            grads = {k: grads[k] / norma for k in chaves}
        otimizador.passo([params[k] for k in chaves], [grads[k] for k in chaves])
        perdas.append(perda)
    return perdas[-1]


def perda_e_grads_gpt(params, X, Y):
    logits, cache = gpt.forward(params, X)
    perda, dlogits = perda_proximo_token(logits, Y)
    return perda, gpt.backward(params, dlogits, cache)


if __name__ == "__main__":
    ids = np.arange(300) % 7
    params = gpt.criar_params(7, 8, 16, 2, 0)
    perdas = treinar(params, ids, 8, 16, 20, 0.01, 0, perda_e_grads_gpt)
    print(round(perdas[0], 3), round(perdas[-1], 3))
```

## Passo 6 · Leitura · Curvas, validação e os limites

Os números abaixo vêm do treino do mini-GPT de 1 bloco no corpus da vila, com lote 16, taxa 0,01 e semente 0, medidos no executor do curso. A perda de validação (NLL média por caractere) é calculada em 20 lotes dos 10 % finais do texto, que o treino nunca viu.

| Passos | Tempo | NLL de validação |
|---|---|---|
| 0 | | 3,36 |
| 300 | 2,1 s | 0,70 |
| 600 | 4,2 s | 0,56 |
| 1 200 | 7,7 s | 0,52 |

```python
vocab, ids_treino, ids_val = corpus.carregar()
params = gpt.criar_params(len(vocab), 16, 32, 1, 0)
perdas = treinar(params, ids_treino, 16, 16, 600, 0.01, 0, perda_e_grads_gpt)
print(avaliar(params, ids_val, 16, 20, 1, gpt.forward))
```

**Como ler esses números.** A perda é um logaritmo: $e^{0{,}56} = 1{,}75$ quer dizer que o modelo hesita, em média, entre menos de dois caracteres. O piso é conhecido, porque o texto vem de uma gramática sorteada e a incerteza está só na escolha de cada palavra: o melhor modelo possível ficaria perto de 0,22.

**Treino e validação.** Nos pesos de 600 passos, a NLL em lotes do treino é 0,553 e a de validação é 0,559. Não há sobreajuste: a validação vem da mesma gramática, e 600 lotes de 256 tokens mal dão três voltas no corpus.

**Comparações honestas.** O bigrama do mesmo corpus fica em 1,60: ele só sabe qual letra costuma seguir qual. Um MLP de linguagem com 3 caracteres de contexto chega a 0,57 em 600 passos, e leva 0,35 s. Neste texto, três letras quase sempre bastam para adivinhar a próxima, e o transformer, que custa dez vezes mais, só empata. A vantagem dele aparece quando a resposta depende de algo distante, e contextos longos são o que o MLP não alcança.

**Mais blocos não é sempre melhor.** Com 2 blocos e os mesmos 300 passos, a validação fica em 0,76, pior que os 0,70 de 1 bloco, e cada passo custa o dobro. Num orçamento fixo de tempo, o modelo menor dá mais passos. O que muda quando o modelo, os dados e o orçamento crescem juntos é assunto do próximo módulo.

## Passo 7 · Exercício · Avaliar e guardar

Um treino só vale se você souber medir o resultado e guardar o modelo. Os arquivos de apoio são `gpt.py`, `corpus.py` e `pesos_gpt.txt`, com os pesos do mini-GPT de 1 bloco treinado por 600 passos (lidos por `gpt.carregar_pesos`). `gerar_lote` e `perda_proximo_token` já estão no arquivo.

`avaliar(params, ids_val, T, n_lotes, semente, forward)` devolve a NLL média do modelo em `ids_val`. Crie `rng = np.random.default_rng(semente)` uma vez; sorteie `n_lotes` lotes com `gerar_lote(ids_val, T, 16, rng)` (o lote de avaliação tem sempre 16 janelas); para cada um, chame `forward(params, X)`, que devolve `(logits, cache)`, e calcule a perda; devolva a média das `n_lotes` perdas. A função não altera `params`.

`salvar_checkpoint(params, caminho)` grava o dicionário de arrays num arquivo `.npz` com `np.savez`, um array por chave. `carregar_checkpoint(caminho)` lê o arquivo e devolve um dicionário comum (`dict`) de chave para `ndarray`, com os mesmos valores em `float64`.

Com os pesos pré-treinados, 20 lotes e semente 1, a NLL de validação fica perto de 0,563.

### Instruções

1. `avaliar`: um gerador só, `n_lotes` lotes de 16 janelas de `ids_val`, e a média das perdas.
2. `salvar_checkpoint`: `np.savez` com um array por chave do dicionário.
3. `carregar_checkpoint`: abra com `np.load` e copie cada array para um `dict`.

### Código inicial

```python
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    # média da perda em n_lotes lotes de 16 janelas sorteadas de ids_val
    pass


def salvar_checkpoint(params, caminho):
    # um arquivo .npz com um array por chave
    pass


def carregar_checkpoint(caminho):
    # devolve um dicionário comum, chave -> array
    pass


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```
```python path=gpt.py
"""Mini-GPT de referência do curso: forward e backward em numpy.

params é um dicionário de arrays. Chaves: "tok" (V, d), "pos" (T, d), por bloco i
"b{i}.ln1_g", "b{i}.ln1_b", "b{i}.Wq", "b{i}.Wk", "b{i}.Wv", "b{i}.Wo", "b{i}.ln2_g",
"b{i}.ln2_b", "b{i}.W1", "b{i}.c1", "b{i}.W2", "b{i}.c2", e no fim "lnf_g", "lnf_b", "Ws" (d, V).
"""
import base64
import json

import numpy as np


def criar_params(V, T, d, n_blocos, semente=0):
    """Sorteia os parâmetros de um mini-GPT (pré-norm, MLP 4d com ReLU)."""
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(n_blocos):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def contar_parametros(params):
    """Total de números em todos os arrays de params."""
    return int(sum(a.size for a in params.values()))


def _ln(x, g, b, eps=1e-5):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + eps)
    return g * (xc / s) + b, (xc / s, s, g)


def _ln_back(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x, h):
    B, T, d = x.shape
    return x.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def forward(params, ids, h=4):
    """ids (B, T) de inteiros -> (logits (B, T, V), cache). T pode ser menor que o contexto."""
    B, T = ids.shape
    n_blocos = sum(1 for k in params if k.endswith(".Wq"))
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // h
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(n_blocos):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1 = _ln(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"], h), _dividir(a @ P["Wk"], h), _dividir(a @ P["Wv"], h)
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _ln(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _ln(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf, h)


def backward(params, dlogits, cache):
    """Gradientes de todos os parâmetros (dicionário com as mesmas chaves), dado dL/dlogits."""
    ids, blocos, f, lnf, h = cache
    B, T = ids.shape
    dh = f.shape[-1] // h
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _ln_back(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _ln_back(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T, h)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _ln_back(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def carregar_pesos(caminho="pesos_gpt.txt"):
    """Lê os pesos pré-treinados: linha 1 com [chave, forma] em JSON, linha 2 com float16 em base64."""
    with open(caminho, encoding="utf-8") as arq:
        formas = json.loads(arq.readline())
        plano = np.frombuffer(base64.b64decode(arq.readline().strip()), dtype=np.float16).astype(np.float64)
    params, i = {}, 0
    for chave, forma in formas:
        n = int(np.prod(forma))
        params[chave] = plano[i:i + n].reshape(forma).copy()
        i += n
    return params
```
```python path=corpus.py
"""Corpus do curso: frases geradas por uma gramática pequena sobre uma vila fictícia."""
import numpy as np

SUJEITOS = ["a padeira", "o ferreiro", "a tecelã", "o pescador", "a moleira", "o pastor", "a oleira", "o barqueiro"]
VERBOS = ["leva", "guarda", "vende", "procura", "conserta", "divide"]
OBJETOS = ["o pão", "a rede", "o barco", "a lenha", "o queijo", "a farinha", "o cesto", "o azeite"]
LUGARES = ["na praça", "no moinho", "na ponte", "no porto", "na feira", "no celeiro"]
TEMPOS = ["de manhã", "à tarde", "à noite", "até o almoço", "antes da chuva", "depois da festa"]


def gerar_corpus(n_frases=1500, semente=0):
    """Devolve n_frases frases, uma por linha; metade delas termina com um tempo."""
    rng = np.random.default_rng(semente)
    frases = []
    for _ in range(n_frases):
        partes = [str(rng.choice(SUJEITOS)), str(rng.choice(VERBOS)), str(rng.choice(OBJETOS)), str(rng.choice(LUGARES))]
        if rng.random() < 0.5:
            partes.append(str(rng.choice(TEMPOS)))
        frases.append(" ".join(partes) + ".")
    return "\n".join(frases) + "\n"


def vocabulario(texto):
    """Caracteres distintos do texto, em ordem."""
    return sorted(set(texto))


def codificar(texto, vocab):
    """Texto -> array de ids (posição de cada caractere em vocab)."""
    para_id = {c: i for i, c in enumerate(vocab)}
    return np.array([para_id[c] for c in texto], dtype=np.intp)


def decodificar(ids, vocab):
    """Ids -> texto."""
    return "".join(vocab[int(i)] for i in ids)


def carregar(n_frases=1500, semente=0, fracao_treino=0.9):
    """Devolve (vocab, ids_treino, ids_val): os últimos 10 % do texto ficam para validação."""
    texto = gerar_corpus(n_frases, semente)
    vocab = vocabulario(texto)
    ids = codificar(texto, vocab)
    corte = int(len(ids) * fracao_treino)
    return vocab, ids[:corte], ids[corte:]
```
```text path=pesos_gpt.txt
[["tok", [29, 32]], ["pos", [16, 32]], ["b0.ln1_g", [32]], ["b0.ln1_b", [32]], ["b0.Wq", [32, 32]], ["b0.Wk", [32, 32]], ["b0.Wv", [32, 32]], ["b0.Wo", [32, 32]], ["b0.ln2_g", [32]], ["b0.ln2_b", [32]], ["b0.W1", [32, 128]], ["b0.c1", [128]], ["b0.W2", [128, 32]], ["b0.c2", [32]], ["lnf_g", [32]], ["lnf_b", [32]], ["Ws", [32, 29]]]
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
```

### Solução

```python
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    rng = np.random.default_rng(semente)
    total = 0.0
    for _ in range(n_lotes):
        X, Y = gerar_lote(ids_val, T, 16, rng)
        logits, _cache = forward(params, X)
        total += perda_proximo_token(logits, Y)[0]
    return total / n_lotes


def salvar_checkpoint(params, caminho):
    np.savez(caminho, **params)


def carregar_checkpoint(caminho):
    with np.load(caminho) as arquivo:
        return {chave: arquivo[chave] for chave in arquivo.files}


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```
```python path=gpt.py
"""Mini-GPT de referência do curso: forward e backward em numpy.

params é um dicionário de arrays. Chaves: "tok" (V, d), "pos" (T, d), por bloco i
"b{i}.ln1_g", "b{i}.ln1_b", "b{i}.Wq", "b{i}.Wk", "b{i}.Wv", "b{i}.Wo", "b{i}.ln2_g",
"b{i}.ln2_b", "b{i}.W1", "b{i}.c1", "b{i}.W2", "b{i}.c2", e no fim "lnf_g", "lnf_b", "Ws" (d, V).
"""
import base64
import json

import numpy as np


def criar_params(V, T, d, n_blocos, semente=0):
    """Sorteia os parâmetros de um mini-GPT (pré-norm, MLP 4d com ReLU)."""
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(n_blocos):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def contar_parametros(params):
    """Total de números em todos os arrays de params."""
    return int(sum(a.size for a in params.values()))


def _ln(x, g, b, eps=1e-5):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + eps)
    return g * (xc / s) + b, (xc / s, s, g)


def _ln_back(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x, h):
    B, T, d = x.shape
    return x.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def forward(params, ids, h=4):
    """ids (B, T) de inteiros -> (logits (B, T, V), cache). T pode ser menor que o contexto."""
    B, T = ids.shape
    n_blocos = sum(1 for k in params if k.endswith(".Wq"))
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // h
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(n_blocos):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1 = _ln(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"], h), _dividir(a @ P["Wk"], h), _dividir(a @ P["Wv"], h)
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _ln(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _ln(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf, h)


def backward(params, dlogits, cache):
    """Gradientes de todos os parâmetros (dicionário com as mesmas chaves), dado dL/dlogits."""
    ids, blocos, f, lnf, h = cache
    B, T = ids.shape
    dh = f.shape[-1] // h
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _ln_back(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _ln_back(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T, h)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _ln_back(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def carregar_pesos(caminho="pesos_gpt.txt"):
    """Lê os pesos pré-treinados: linha 1 com [chave, forma] em JSON, linha 2 com float16 em base64."""
    with open(caminho, encoding="utf-8") as arq:
        formas = json.loads(arq.readline())
        plano = np.frombuffer(base64.b64decode(arq.readline().strip()), dtype=np.float16).astype(np.float64)
    params, i = {}, 0
    for chave, forma in formas:
        n = int(np.prod(forma))
        params[chave] = plano[i:i + n].reshape(forma).copy()
        i += n
    return params
```
```python path=corpus.py
"""Corpus do curso: frases geradas por uma gramática pequena sobre uma vila fictícia."""
import numpy as np

SUJEITOS = ["a padeira", "o ferreiro", "a tecelã", "o pescador", "a moleira", "o pastor", "a oleira", "o barqueiro"]
VERBOS = ["leva", "guarda", "vende", "procura", "conserta", "divide"]
OBJETOS = ["o pão", "a rede", "o barco", "a lenha", "o queijo", "a farinha", "o cesto", "o azeite"]
LUGARES = ["na praça", "no moinho", "na ponte", "no porto", "na feira", "no celeiro"]
TEMPOS = ["de manhã", "à tarde", "à noite", "até o almoço", "antes da chuva", "depois da festa"]


def gerar_corpus(n_frases=1500, semente=0):
    """Devolve n_frases frases, uma por linha; metade delas termina com um tempo."""
    rng = np.random.default_rng(semente)
    frases = []
    for _ in range(n_frases):
        partes = [str(rng.choice(SUJEITOS)), str(rng.choice(VERBOS)), str(rng.choice(OBJETOS)), str(rng.choice(LUGARES))]
        if rng.random() < 0.5:
            partes.append(str(rng.choice(TEMPOS)))
        frases.append(" ".join(partes) + ".")
    return "\n".join(frases) + "\n"


def vocabulario(texto):
    """Caracteres distintos do texto, em ordem."""
    return sorted(set(texto))


def codificar(texto, vocab):
    """Texto -> array de ids (posição de cada caractere em vocab)."""
    para_id = {c: i for i, c in enumerate(vocab)}
    return np.array([para_id[c] for c in texto], dtype=np.intp)


def decodificar(ids, vocab):
    """Ids -> texto."""
    return "".join(vocab[int(i)] for i in ids)


def carregar(n_frases=1500, semente=0, fracao_treino=0.9):
    """Devolve (vocab, ids_treino, ids_val): os últimos 10 % do texto ficam para validação."""
    texto = gerar_corpus(n_frases, semente)
    vocab = vocabulario(texto)
    ids = codificar(texto, vocab)
    corte = int(len(ids) * fracao_treino)
    return vocab, ids[:corte], ids[corte:]
```
```text path=pesos_gpt.txt
[["tok", [29, 32]], ["pos", [16, 32]], ["b0.ln1_g", [32]], ["b0.ln1_b", [32]], ["b0.Wq", [32, 32]], ["b0.Wk", [32, 32]], ["b0.Wv", [32, 32]], ["b0.Wo", [32, 32]], ["b0.ln2_g", [32]], ["b0.ln2_b", [32]], ["b0.W1", [32, 128]], ["b0.c1", [128]], ["b0.W2", [128, 32]], ["b0.c2", [32]], ["lnf_g", [32]], ["lnf_b", [32]], ["Ws", [32, 29]]]
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
```

### Dicas

1. `np.savez(caminho, **params)` usa as chaves do dicionário como nomes dos arrays.
2. O objeto devolvido por `np.load` tem o atributo `files`, com os nomes dos arrays guardados.
3. A avaliação usa só o forward: nada de gradiente nem de otimizador.

### Verificação

```json
[
  {"id": "pesos-pre-treinados", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimport corpus\nimport gpt\n_vocab, _tr, _va = corpus.carregar()\n_p = gpt.carregar_pesos(\"pesos_gpt.txt\")\n", "expr": "avaliar(_p, _va, 16, 20, 1, gpt.forward)", "expected": 0.5631396572525083, "tolerance": 0.001, "name": "NLL de validação dos pesos pré-treinados (20 lotes, semente 1): perto de 0,563", "hint": "São 20 lotes de 16 janelas sorteados de ids_val com default_rng(1), e a média das 20 perdas."},
  {"id": "modelo-uniforme", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(500) * 3 + np.arange(500) // 7) % 6\n_xs = []\ndef _uniforme(p, X):\n    _xs.append(X.copy())\n    return np.zeros(X.shape + (29,)), None\ndef _tabela(p, X):\n    _xs.append(X.copy())\n    return p[\"W\"][X], None\n_p = {\"W\": np.random.default_rng(31).normal(0.0, 1.0, (6, 6))}\n", "expr": "avaliar(_p, _ids, 8, 3, 0, _uniforme)", "expected": 3.367295829986474, "tolerance": 1e-12, "name": "Um forward de logits iguais dá ln 29, com qualquer número de lotes", "hint": "É a média das perdas dos lotes, não a soma."},
  {"id": "chamadas", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(500) * 3 + np.arange(500) // 7) % 6\n_xs = []\ndef _uniforme(p, X):\n    _xs.append(X.copy())\n    return np.zeros(X.shape + (29,)), None\ndef _tabela(p, X):\n    _xs.append(X.copy())\n    return p[\"W\"][X], None\n_p = {\"W\": np.random.default_rng(31).normal(0.0, 1.0, (6, 6))}\navaliar(_p, _ids, 8, 5, 0, _uniforme)", "expr": "[len(_xs), list(_xs[0].shape)]", "expected": [5, [16, 8]], "name": "O forward é chamado n_lotes vezes, com lotes (16, T)"},
  {"id": "lotes-variam", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(500) * 3 + np.arange(500) // 7) % 6\n_xs = []\ndef _uniforme(p, X):\n    _xs.append(X.copy())\n    return np.zeros(X.shape + (29,)), None\ndef _tabela(p, X):\n    _xs.append(X.copy())\n    return p[\"W\"][X], None\n_p = {\"W\": np.random.default_rng(31).normal(0.0, 1.0, (6, 6))}\navaliar(_p, _ids, 8, 4, 0, _uniforme)", "expr": "[bool(np.array_equal(_xs[0], _xs[1])), bool(np.array_equal(_xs[0][:, 0], _ids[np.random.default_rng(0).integers(0, 492, 16)]))]", "expected": [false, true], "name": "Os lotes são diferentes entre si, e o primeiro vem de default_rng(semente)", "hint": "Crie o gerador uma vez, antes do laço."},
  {"id": "usa-ids-recebidos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(500) * 3 + np.arange(500) // 7) % 6\n_xs = []\ndef _uniforme(p, X):\n    _xs.append(X.copy())\n    return np.zeros(X.shape + (29,)), None\ndef _tabela(p, X):\n    _xs.append(X.copy())\n    return p[\"W\"][X], None\n_p = {\"W\": np.random.default_rng(31).normal(0.0, 1.0, (6, 6))}\n", "expr": "avaliar(_p, _ids, 8, 6, 2, _tabela)", "expected": 2.2973608220724047, "tolerance": 1e-09, "name": "NLL de um modelo de tabela nos ids passados por argumento", "hint": "Os lotes saem de ids_val, o segundo argumento."},
  {"id": "semente", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(500) * 3 + np.arange(500) // 7) % 6\n_xs = []\ndef _uniforme(p, X):\n    _xs.append(X.copy())\n    return np.zeros(X.shape + (29,)), None\ndef _tabela(p, X):\n    _xs.append(X.copy())\n    return p[\"W\"][X], None\n_p = {\"W\": np.random.default_rng(31).normal(0.0, 1.0, (6, 6))}\n", "expr": "[avaliar(_p, _ids, 8, 4, 5, _tabela) == avaliar(_p, _ids, 8, 4, 5, _tabela), avaliar(_p, _ids, 8, 4, 5, _tabela) != avaliar(_p, _ids, 8, 4, 6, _tabela)]", "expected": [true, true], "name": "Mesma semente, mesma NLL; outra semente, outra NLL"},
  {"id": "float-e-intacto", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_ids = (np.arange(500) * 3 + np.arange(500) // 7) % 6\n_xs = []\ndef _uniforme(p, X):\n    _xs.append(X.copy())\n    return np.zeros(X.shape + (29,)), None\ndef _tabela(p, X):\n    _xs.append(X.copy())\n    return p[\"W\"][X], None\n_p = {\"W\": np.random.default_rng(31).normal(0.0, 1.0, (6, 6))}\n_w = _p[\"W\"].copy()\n_r = avaliar(_p, _ids, 8, 2, 0, _tabela)", "expr": "[type(_r) is float, bool(np.array_equal(_p[\"W\"], _w))]", "expected": [true, true], "name": "Devolve float e não altera os parâmetros"},
  {"id": "ida-e-volta", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(41)\n_p = {\"tok\": _rng.normal(size=(5, 4)), \"b0.Wq\": _rng.normal(size=(4, 4)), \"b0.c1\": _rng.normal(size=16), \"lnf_g\": np.ones(4)}\nsalvar_checkpoint(_p, \"ck.npz\")\n_c = carregar_checkpoint(\"ck.npz\")\n", "expr": "[sorted(_c) == sorted(_p), all(bool(np.array_equal(_c[k], _p[k])) for k in _p)]", "expected": [true, true], "name": "Salvar e carregar devolve as mesmas chaves e os mesmos valores", "hint": "Cada chave do dicionário vira um array do arquivo."},
  {"id": "tipos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(41)\n_p = {\"tok\": _rng.normal(size=(5, 4)), \"b0.Wq\": _rng.normal(size=(4, 4)), \"b0.c1\": _rng.normal(size=16), \"lnf_g\": np.ones(4)}\nsalvar_checkpoint(_p, \"ck.npz\")\n_c = carregar_checkpoint(\"ck.npz\")\n", "expr": "[type(_c) is dict, all(type(v) is np.ndarray for v in _c.values()), all(str(v.dtype) == \"float64\" for v in _c.values())]", "expected": [true, true, true], "name": "O resultado é um dict de ndarray em float64", "hint": "O objeto do np.load não é um dicionário: copie os arrays para um."},
  {"id": "arquivo-npz", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(41)\n_p = {\"tok\": _rng.normal(size=(5, 4)), \"b0.Wq\": _rng.normal(size=(4, 4)), \"b0.c1\": _rng.normal(size=16), \"lnf_g\": np.ones(4)}\nsalvar_checkpoint(_p, \"ck.npz\")\n_c = carregar_checkpoint(\"ck.npz\")\n", "expr": "sorted(np.load(\"ck.npz\").files)", "expected": ["b0.Wq", "b0.c1", "lnf_g", "tok"], "name": "O arquivo é um .npz com um array por chave", "hint": "np.savez(caminho, **params)."},
  {"id": "formas", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(41)\n_p = {\"tok\": _rng.normal(size=(5, 4)), \"b0.Wq\": _rng.normal(size=(4, 4)), \"b0.c1\": _rng.normal(size=16), \"lnf_g\": np.ones(4)}\nsalvar_checkpoint(_p, \"ck.npz\")\n_c = carregar_checkpoint(\"ck.npz\")\n", "expr": "[list(_c[k].shape) for k in sorted(_c)]", "expected": [[4, 4], [16], [4], [5, 4]], "name": "As formas dos arrays são preservadas"},
  {"id": "independente", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(41)\n_p = {\"tok\": _rng.normal(size=(5, 4)), \"b0.Wq\": _rng.normal(size=(4, 4)), \"b0.c1\": _rng.normal(size=16), \"lnf_g\": np.ones(4)}\nsalvar_checkpoint(_p, \"ck.npz\")\n_c = carregar_checkpoint(\"ck.npz\")\n_c[\"tok\"][0, 0] = 99.0\n_d = carregar_checkpoint(\"ck.npz\")", "expr": "[bool(_p[\"tok\"][0, 0] != 99.0), bool(_d[\"tok\"][0, 0] != 99.0)]", "expected": [true, true], "name": "Alterar o dicionário carregado não muda o original nem o arquivo"}
]
```

### Soluções erradas

```python name="avaliar com os dados de treino"
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    rng = np.random.default_rng(semente)
    total = 0.0
    for _ in range(n_lotes):
        X, Y = gerar_lote(corpus.carregar()[1], T, 16, rng)
        logits, _cache = forward(params, X)
        total += perda_proximo_token(logits, Y)[0]
    return total / n_lotes


def salvar_checkpoint(params, caminho):
    np.savez(caminho, **params)


def carregar_checkpoint(caminho):
    with np.load(caminho) as arquivo:
        return {chave: arquivo[chave] for chave in arquivo.files}


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```

```python name="soma das perdas sem dividir por n_lotes"
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    rng = np.random.default_rng(semente)
    total = 0.0
    for _ in range(n_lotes):
        X, Y = gerar_lote(ids_val, T, 16, rng)
        logits, _cache = forward(params, X)
        total += perda_proximo_token(logits, Y)[0]
    return total


def salvar_checkpoint(params, caminho):
    np.savez(caminho, **params)


def carregar_checkpoint(caminho):
    with np.load(caminho) as arquivo:
        return {chave: arquivo[chave] for chave in arquivo.files}


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```

```python name="gerador recriado a cada lote"
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    total = 0.0
    for _ in range(n_lotes):
        rng = np.random.default_rng(semente)
        X, Y = gerar_lote(ids_val, T, 16, rng)
        logits, _cache = forward(params, X)
        total += perda_proximo_token(logits, Y)[0]
    return total / n_lotes


def salvar_checkpoint(params, caminho):
    np.savez(caminho, **params)


def carregar_checkpoint(caminho):
    with np.load(caminho) as arquivo:
        return {chave: arquivo[chave] for chave in arquivo.files}


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```

```python name="avaliar com um lote só"
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    rng = np.random.default_rng(semente)
    total = 0.0
    for _ in range(1):
        X, Y = gerar_lote(ids_val, T, 16, rng)
        logits, _cache = forward(params, X)
        total += perda_proximo_token(logits, Y)[0]
    return total


def salvar_checkpoint(params, caminho):
    np.savez(caminho, **params)


def carregar_checkpoint(caminho):
    with np.load(caminho) as arquivo:
        return {chave: arquivo[chave] for chave in arquivo.files}


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```

```python name="checkpoint com json.dumps"
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    rng = np.random.default_rng(semente)
    total = 0.0
    for _ in range(n_lotes):
        X, Y = gerar_lote(ids_val, T, 16, rng)
        logits, _cache = forward(params, X)
        total += perda_proximo_token(logits, Y)[0]
    return total / n_lotes


def salvar_checkpoint(params, caminho):
    import json
    with open(caminho, "w") as arquivo:
        arquivo.write(json.dumps(params))


def carregar_checkpoint(caminho):
    with np.load(caminho) as arquivo:
        return {chave: arquivo[chave] for chave in arquivo.files}


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```

```python name="carregar devolve o objeto do np.load"
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    rng = np.random.default_rng(semente)
    total = 0.0
    for _ in range(n_lotes):
        X, Y = gerar_lote(ids_val, T, 16, rng)
        logits, _cache = forward(params, X)
        total += perda_proximo_token(logits, Y)[0]
    return total / n_lotes


def salvar_checkpoint(params, caminho):
    np.savez(caminho, **params)


def carregar_checkpoint(caminho):
    return np.load(caminho)


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```

```python name="checkpoint em float32"
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    rng = np.random.default_rng(semente)
    total = 0.0
    for _ in range(n_lotes):
        X, Y = gerar_lote(ids_val, T, 16, rng)
        logits, _cache = forward(params, X)
        total += perda_proximo_token(logits, Y)[0]
    return total / n_lotes


def salvar_checkpoint(params, caminho):
    np.savez(caminho, **{k: v.astype(np.float32) for k, v in params.items()})


def carregar_checkpoint(caminho):
    with np.load(caminho) as arquivo:
        return {chave: arquivo[chave] for chave in arquivo.files}


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```

```python name="savez com o dicionário num argumento só"
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    rng = np.random.default_rng(semente)
    total = 0.0
    for _ in range(n_lotes):
        X, Y = gerar_lote(ids_val, T, 16, rng)
        logits, _cache = forward(params, X)
        total += perda_proximo_token(logits, Y)[0]
    return total / n_lotes


def salvar_checkpoint(params, caminho):
    np.savez(caminho, params)


def carregar_checkpoint(caminho):
    with np.load(caminho) as arquivo:
        return {chave: arquivo[chave] for chave in arquivo.files}


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```

```python name="lote de avaliação com 1 janela"
import numpy as np

import corpus
import gpt


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def perda_proximo_token(logits, alvos):
    B, T, V = logits.shape
    Z = logits - logits.max(axis=-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(axis=-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, dlogits / (B * T)


def avaliar(params, ids_val, T, n_lotes, semente, forward):
    rng = np.random.default_rng(semente)
    total = 0.0
    for _ in range(n_lotes):
        X, Y = gerar_lote(ids_val, T, 1, rng)
        logits, _cache = forward(params, X)
        total += perda_proximo_token(logits, Y)[0]
    return total / n_lotes


def salvar_checkpoint(params, caminho):
    np.savez(caminho, **params)


def carregar_checkpoint(caminho):
    with np.load(caminho) as arquivo:
        return {chave: arquivo[chave] for chave in arquivo.files}


if __name__ == "__main__":
    vocab, ids_treino, ids_val = corpus.carregar(300)
    params = gpt.carregar_pesos("pesos_gpt.txt")
    print(round(avaliar(params, ids_val, 16, 5, 1, gpt.forward), 3))
    salvar_checkpoint(params, "modelo.npz")
    print(sorted(carregar_checkpoint("modelo.npz"))[:3])
```

## Passo 8 · Quiz · Contexto e custo

### Pergunta

Um treino do mini-GPT de 1 bloco mostra, depois de 100 passos, perda de treino 0,004. A validação, medida com o alvo correto, dá 10,3 (pior que os 3,37 de um modelo sem treino). Os lotes foram montados com `Y = np.stack([ids[i:i + T] for i in inicios])`. O que aconteceu?

- [ ] O modelo sobreajustou: 100 passos foram suficientes para decorar o corpus
- [x] O alvo não foi deslocado: o modelo aprendeu a copiar o token da própria posição, o que zera a perda de treino e não ensina nada sobre o próximo token
- [ ] A taxa de aprendizado estava alta, e a perda de validação divergiu
- [ ] Os inícios foram sorteados além do fim do texto, e os lotes saíram curtos

> Com `Y` igual a `X`, a resposta de cada posição está na própria entrada, e copiar é fácil: a perda de treino vai a 0,004. Na validação com o alvo certo, o modelo aposta com confiança no caractere errado, e a NLL passa de $\ln 29$. Decorar 56 mil caracteres em 100 passos não é possível; uma taxa alta apareceria também na perda de treino; e lotes curtos fariam o `np.stack` falhar.

### Pergunta

No executor do curso, um passo do mini-GPT de 1 bloco ($T = 16$, $d = 32$, lote 16) leva 6,9 ms, e um passo do modelo com $T = 32$, $d = 64$, 2 blocos e lote 32 leva 220 ms. O limite de uma execução é 10 s. Qual é a leitura correta para quem quer o melhor modelo dentro do limite?

- [ ] O modelo maior, porque mais parâmetros sempre dão perda menor
- [ ] Tanto faz, porque os dois veem o mesmo corpus
- [ ] O modelo maior, treinado com taxa de aprendizado 32 vezes maior para compensar os passos
- [x] O modelo menor: ele dá mais de 1 400 passos em 10 s, contra 45 do maior, que nem sai do começo da curva

> Em 10 s cabem $10 / 0{,}0069 \approx 1\,450$ passos do modelo pequeno e $10 / 0{,}22 \approx 45$ do grande; com 1 200 passos o pequeno chega a 0,52 de validação, e 45 passos deixam qualquer modelo no começo da curva (o de 2 blocos da lição ainda está em 2,1 depois de 40). Mais parâmetros só ajudam com passos suficientes; os dois veem o mesmo corpus, mas quantidades muito diferentes dele; e multiplicar a taxa por 32 faz o treino divergir, não andar 32 vezes mais.

### Pergunta

No corpus da vila, o bigrama tem NLL de validação 1,60, um MLP de linguagem com 3 caracteres de contexto chega a 0,57 em 0,35 s, e o mini-GPT de 1 bloco chega a 0,56 em 4,2 s. Qual conclusão os números sustentam?

- [ ] O transformer é sempre a melhor escolha, porque teve a menor perda
- [ ] O MLP está com defeito, porque um modelo mais simples não pode empatar com um transformer
- [x] Neste texto, quase toda a informação para prever o próximo caractere está nos 3 anteriores; o transformer custa cerca de dez vezes mais e só empata, e a vantagem dele depende de haver dependências longas
- [ ] O bigrama é o melhor dos três, porque é o mais rápido

> A diferença de 0,57 para 0,56 é pequena perto do custo de 0,35 s contra 4,2 s: o corpus foi gerado por uma gramática em que o contexto curto quase basta. A menor perda por uma margem dessas não justifica dez vezes o tempo; não há defeito em um modelo simples ir bem numa tarefa simples; e o bigrama, com 1,60, está muito atrás dos outros dois.
