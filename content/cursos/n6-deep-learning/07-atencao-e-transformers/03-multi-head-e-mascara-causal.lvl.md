---
slug: n6-m7-03-multi-head-e-mascara-causal
titulo: Multi-head attention e máscara causal
descricao: Várias cabeças em paralelo com projeções menores, concatenação e projeção de saída, a máscara triangular que impede olhar o futuro, e a atenção em lotes.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 130
tempo_min: 55
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar multi-head attention com reshape/transposição em lotes
- Aplicar a máscara causal com −inf antes do softmax e explicar por que ela é necessária para modelar linguagem
- Contar parâmetros e custo da atenção em função de T, d e número de cabeças
---

## Passo 1 · Leitura · Várias cabeças

Uma cabeça de atenção produz, para cada posição, **uma** distribuição de pesos sobre as outras. Só que uma palavra costuma precisar de várias relações ao mesmo tempo: o verbo quer achar o sujeito, o artigo quer achar o substantivo, o pronome quer achar a quem se refere. Uma softmax só não consegue pôr peso alto em três lugares por motivos diferentes.

A solução é rodar várias atenções em paralelo, as **cabeças**, cada uma com consultas, chaves e valores próprios. Para não multiplicar o custo, o modelo divide a dimensão: com $d = 32$ e $h = 4$ cabeças, cada cabeça trabalha com vetores de tamanho $d/h = 8$. Cada cabeça olha para um subespaço diferente da representação.

Na prática, ninguém cria $h$ matrizes separadas. As projeções $X W_q$, $X W_k$ e $X W_v$ continuam com a largura $d$ inteira, e o resultado é **fatiado** em $h$ pedaços por uma mudança de forma. Com lote, a entrada tem forma $(B, T, d)$ e a conta é:

```python
B, T, d = X.shape
Y = X.reshape(B, T, h, d // h)      # corta o último eixo em h fatias
Z = Y.transpose(0, 2, 1, 3)         # (B, h, T, d/h): a cabeça vira eixo de lote
```

O `reshape` só reorganiza o último eixo: as colunas de 0 a 7 vão para a cabeça 0, as de 8 a 15 para a cabeça 1, e assim por diante. O `transpose` troca os eixos do tempo e da cabeça, para que os dois últimos eixos sejam $(T, d/h)$. A partir daí, o `@` do numpy trata $B$ e $h$ como lote, e a mesma linha de código calcula todas as cabeças de todos os exemplos.

O atalho que parece equivalente, `X.reshape(B, h, T, d // h)`, tem a forma certa e o conteúdo errado: ele não fatia as colunas, e sim redistribui os números na ordem em que estão na memória, misturando posições diferentes numa mesma cabeça.

Na volta, a ordem é a inversa: `transpose(0, 2, 1, 3)` de novo e `reshape(B, T, d)`, que cola as fatias lado a lado. Se $d$ não for múltiplo de $h$, o `reshape` falha:

```text
ValueError: cannot reshape array of size 60 into shape (2,5,4,1)
```

## Passo 2 · Previsão · Formas ao dividir e juntar

O array tem os números de 0 a 79 em ordem, na forma `(2, 5, 8)`: 2 exemplos, 5 posições, dimensão 8. Preveja a forma em cada etapa e o conteúdo da cabeça 1 na posição 0 do primeiro exemplo, pelo caminho certo e pelo atalho.

### Código

```python
import numpy as np

X = np.arange(2 * 5 * 8).reshape(2, 5, 8)
B, T, d = X.shape
h = 4

Y = X.reshape(B, T, h, d // h)
print(Y.shape)
Z = Y.transpose(0, 2, 1, 3)
print(Z.shape)
print(Z[0, 1, 0].tolist())

W = Z.transpose(0, 2, 1, 3).reshape(B, T, d)
print(W.shape, bool((W == X).all()))

atalho = X.reshape(B, h, T, d // h)
print(atalho.shape)
print(atalho[0, 1, 0].tolist())
```

### Dicas

1. A posição 0 do primeiro exemplo é a linha `[0, 1, 2, 3, 4, 5, 6, 7]`, e cada cabeça fica com 2 colunas.
2. O `transpose` muda a ordem dos eixos, não os números.
3. No atalho, os índices `[0, 1, 0]` pulam uma cabeça inteira de `T * (d // h)` números a partir do começo.

### Saída esperada

```text
(2, 5, 4, 2)
(2, 4, 5, 2)
[2, 3]
(2, 5, 8) True
(2, 4, 5, 2)
[10, 11]
```

## Passo 3 · Exercício · Dividir e juntar cabeças
modo: lacunas

Complete as duas funções de forma. `dividir_em_cabecas(X, h)` recebe `X` de forma `(B, T, d)` e devolve um array de forma `(B, h, T, d // h)` em que a cabeça `c` da posição `t` é a fatia `X[b, t, c * dh:(c + 1) * dh]`, com `dh = d // h`. `juntar_cabecas(X)` faz o caminho de volta, de `(B, h, T, dh)` para `(B, T, h * dh)`, e a ida e volta devolve exatamente o array original.

### Instruções

1. Em `dividir_em_cabecas`, corte o último eixo em `h` fatias e leve o eixo das cabeças para antes do eixo do tempo.
2. Em `juntar_cabecas`, desfaça a troca de eixos e cole as fatias de volta no último eixo.

### Código inicial

```python
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(___).transpose(___)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(___).reshape(___)


if __name__ == "__main__":
    X = np.arange(2 * 5 * 8).reshape(2, 5, 8)
    Z = dividir_em_cabecas(X, 4)
    print(Z.shape, juntar_cabecas(Z).shape)
```

### Solução

```python
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


if __name__ == "__main__":
    X = np.arange(2 * 5 * 8).reshape(2, 5, 8)
    Z = dividir_em_cabecas(X, 4)
    print(Z.shape, juntar_cabecas(Z).shape)
```

### Dicas

1. O `reshape` de ida só mexe no último eixo: `(B, T, d)` vira `(B, T, h, d // h)`.
2. A troca dos eixos 1 e 2 é a própria inversa: a mesma permutação serve na ida e na volta.
3. Na volta, a largura do último eixo é o número de cabeças vezes o tamanho de cada uma.

### Verificação

```json
[
  {"id": "forma-dividir", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X = np.random.default_rng(2).normal(size=(2, 5, 12))\ndef _fatias(X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Z = np.zeros((B, h, T, dh))\n    for b in range(B):\n        for c in range(h):\n            for t in range(T):\n                Z[b, c, t] = X[b, t, c * dh:(c + 1) * dh]\n    return Z\n", "expr": "list(dividir_em_cabecas(_X, 3).shape)", "expected": [2, 3, 5, 4], "name": "(2, 5, 12) com 3 cabeças vira (2, 3, 5, 4)"},
  {"id": "fatias", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X = np.random.default_rng(2).normal(size=(2, 5, 12))\ndef _fatias(X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Z = np.zeros((B, h, T, dh))\n    for b in range(B):\n        for c in range(h):\n            for t in range(T):\n                Z[b, c, t] = X[b, t, c * dh:(c + 1) * dh]\n    return Z\n", "expr": "bool(np.array_equal(dividir_em_cabecas(_X, 3), _fatias(_X, 3)))", "expected": true, "name": "A cabeça c da posição t é a fatia c do último eixo", "hint": "Um reshape direto para (B, h, T, dh) tem a forma certa e mistura as posições."},
  {"id": "fatias-quadrado", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X = np.random.default_rng(2).normal(size=(2, 5, 12))\ndef _fatias(X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Z = np.zeros((B, h, T, dh))\n    for b in range(B):\n        for c in range(h):\n            for t in range(T):\n                Z[b, c, t] = X[b, t, c * dh:(c + 1) * dh]\n    return Z\n", "expr": "bool(np.array_equal(dividir_em_cabecas(_X[:, :, :4], 2), _fatias(_X[:, :, :4], 2)))", "expected": true, "name": "Com d = 4 e h = 2 (h igual a d // h), as fatias continuam certas", "hint": "No reshape, o número de cabeças vem antes do tamanho de cada cabeça."},
  {"id": "exemplo-arange", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "dividir_em_cabecas(np.arange(80).reshape(2, 5, 8), 4)[0, 1, 0].tolist()", "expected": [2, 3], "name": "No exemplo da Previsão, a cabeça 1 da posição 0 é [2, 3]"},
  {"id": "uma-cabeca", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X = np.random.default_rng(2).normal(size=(2, 5, 12))\ndef _fatias(X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Z = np.zeros((B, h, T, dh))\n    for b in range(B):\n        for c in range(h):\n            for t in range(T):\n                Z[b, c, t] = X[b, t, c * dh:(c + 1) * dh]\n    return Z\n", "expr": "[list(dividir_em_cabecas(_X, 1).shape), bool(np.array_equal(dividir_em_cabecas(_X, 1)[:, 0], _X))]", "expected": [[2, 1, 5, 12], true], "name": "Com h = 1, a única cabeça é o próprio X"},
  {"id": "forma-juntar", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_X = np.random.default_rng(2).normal(size=(2, 5, 12))\ndef _fatias(X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Z = np.zeros((B, h, T, dh))\n    for b in range(B):\n        for c in range(h):\n            for t in range(T):\n                Z[b, c, t] = X[b, t, c * dh:(c + 1) * dh]\n    return Z\n", "expr": "list(juntar_cabecas(_fatias(_X, 4)).shape)", "expected": [2, 5, 12], "name": "(2, 4, 5, 3) volta para (2, 5, 12)"},
  {"id": "juntar-fatias", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_X = np.random.default_rng(2).normal(size=(2, 5, 12))\ndef _fatias(X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Z = np.zeros((B, h, T, dh))\n    for b in range(B):\n        for c in range(h):\n            for t in range(T):\n                Z[b, c, t] = X[b, t, c * dh:(c + 1) * dh]\n    return Z\n", "expr": "bool(np.array_equal(juntar_cabecas(_fatias(_X, 4)), _X))", "expected": true, "name": "Juntar as fatias montadas à mão devolve X", "hint": "Desfaça a troca de eixos antes do reshape."},
  {"id": "juntar-quadrado", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_X = np.random.default_rng(2).normal(size=(2, 5, 12))\ndef _fatias(X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Z = np.zeros((B, h, T, dh))\n    for b in range(B):\n        for c in range(h):\n            for t in range(T):\n                Z[b, c, t] = X[b, t, c * dh:(c + 1) * dh]\n    return Z\n", "expr": "bool(np.array_equal(juntar_cabecas(_fatias(_X[:, :3, :6], 3)), _X[:, :3, :6]))", "expected": true, "name": "Juntar com h = T = 3 também devolve X"},
  {"id": "ida-e-volta", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_X = np.random.default_rng(2).normal(size=(2, 5, 12))\ndef _fatias(X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Z = np.zeros((B, h, T, dh))\n    for b in range(B):\n        for c in range(h):\n            for t in range(T):\n                Z[b, c, t] = X[b, t, c * dh:(c + 1) * dh]\n    return Z\n", "expr": "[bool(np.array_equal(juntar_cabecas(dividir_em_cabecas(_X, h)), _X)) for h in (1, 2, 3, 4, 6, 12)]", "expected": [true, true, true, true, true, true], "name": "Ida e volta exata para h = 1, 2, 3, 4, 6 e 12"},
  {"id": "nao-divisivel", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X = np.random.default_rng(2).normal(size=(2, 5, 12))\ndef _fatias(X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Z = np.zeros((B, h, T, dh))\n    for b in range(B):\n        for c in range(h):\n            for t in range(T):\n                Z[b, c, t] = X[b, t, c * dh:(c + 1) * dh]\n    return Z\n", "expr": "dividir_em_cabecas(_X, 5)", "raises": "ValueError", "name": "d = 12 com 5 cabeças levanta o ValueError do reshape"}
]
```

### Soluções erradas

```python name="reshape direto, sem transpose"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, h, T, d // h)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


if __name__ == "__main__":
    X = np.arange(2 * 5 * 8).reshape(2, 5, 8)
    Z = dividir_em_cabecas(X, 4)
    print(Z.shape, juntar_cabecas(Z).shape)
```

```python name="juntar sem desfazer a troca de eixos"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.reshape(B, T, h * dh)


if __name__ == "__main__":
    X = np.arange(2 * 5 * 8).reshape(2, 5, 8)
    Z = dividir_em_cabecas(X, 4)
    print(Z.shape, juntar_cabecas(Z).shape)
```

```python name="cabeças e tamanho da cabeça trocados no reshape"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, d // h, h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


if __name__ == "__main__":
    X = np.arange(2 * 5 * 8).reshape(2, 5, 8)
    Z = dividir_em_cabecas(X, 4)
    print(Z.shape, juntar_cabecas(Z).shape)
```

```python name="transposição com os eixos errados"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 3, 1)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


if __name__ == "__main__":
    X = np.arange(2 * 5 * 8).reshape(2, 5, 8)
    Z = dividir_em_cabecas(X, 4)
    print(Z.shape, juntar_cabecas(Z).shape)
```

```python name="juntar com a largura de uma cabeça só"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, dh)


if __name__ == "__main__":
    X = np.arange(2 * 5 * 8).reshape(2, 5, 8)
    Z = dividir_em_cabecas(X, 4)
    print(Z.shape, juntar_cabecas(Z).shape)
```

```python name="juntar trocando os dois últimos eixos"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 3, 2, 1).reshape(B, T, h * dh)


if __name__ == "__main__":
    X = np.arange(2 * 5 * 8).reshape(2, 5, 8)
    Z = dividir_em_cabecas(X, 4)
    print(Z.shape, juntar_cabecas(Z).shape)
```

## Passo 4 · Leitura · A máscara causal

Um modelo de linguagem aprende a prever o próximo token. Para aproveitar bem cada sequência de treino, todas as posições são treinadas **ao mesmo tempo**: a saída da posição 0 prevê o token 1, a da posição 1 prevê o token 2, e assim por diante, num forward só. Sem nenhum cuidado, isso é uma fraude: a atenção deixa a posição 1 olhar para a posição 2, que é exatamente a resposta que ela deveria prever. A perda de treino despenca e o modelo não aprende nada que sirva na hora de gerar, quando o futuro não existe.

A **máscara causal** proíbe cada posição de olhar para a frente. Ela é aplicada às pontuações, antes da softmax: toda entrada $(i, j)$ com $j > i$ recebe $-\infty$, e a exponencial transforma isso em peso 0.

```python
futuro = np.triu(np.ones((T, T), dtype=bool), 1)    # True acima da diagonal
S = np.where(futuro, -np.inf, S)
A = softmax_linhas(S)
```

O segundo argumento do `np.triu` desloca o triângulo uma diagonal para cima: a diagonal fica de fora da máscara, porque cada posição pode olhar para si mesma. Com as pontuações `[1, 2, 3]` em todas as linhas, os pesos ficam assim:

```text
[[1.0, 0.0, 0.0], [0.269, 0.731, 0.0], [0.09, 0.245, 0.665]]
```

Quatro erros comuns, todos silenciosos:

- **Máscara com 0 no lugar de $-\infty$.** Zero é uma pontuação como outra qualquer. A primeira linha do exemplo vira `[0.576, 0.212, 0.212]`: o futuro continua recebendo 42 % do peso.
- **Mascarar depois da softmax.** Zerar os pesos do futuro esconde o vazamento, mas as linhas deixam de somar 1 e a posição 0 fica com uma fração do próprio valor.
- **Multiplicar por uma máscara de $-\infty$.** Uma pontuação igual a 0 vezes $-\infty$ dá `nan`, sem aviso. O `np.where` escolhe entre dois valores e não faz conta nenhuma.
- **Esquecer o deslocamento.** Com `np.triu(..., 0)`, a diagonal entra na máscara, a primeira linha fica inteira em $-\infty$, e a softmax dela calcula $-\infty - (-\infty)$: a linha sai `[nan, nan, nan]`.

Como a máscara só olha para os índices, ela é a mesma para todos os exemplos e todas as cabeças, e o broadcasting cuida do resto.

## Passo 5 · Exercício · Atenção causal e o teste

Duas funções. A primeira é a atenção com máscara; a segunda é o teste que prova que um modelo não olha para o futuro.

`atencao_causal(Q, K, V)` recebe arrays cujos dois últimos eixos são `(T, d)` (para `V`, `(T, dv)`); os eixos anteriores são de lote, e a função precisa funcionar tanto com `(B, T, d)` quanto com `(B, h, T, d)`. Ela calcula as pontuações com a escala $\sqrt{d}$, põe $-\infty$ onde a coluna é maior que a linha, aplica a softmax no último eixo e devolve a média dos valores.

`teste_de_causalidade(f, X, t)` recebe uma função `f` que leva um array `(B, T, d)` a um array `(B, T, ...)`. O teste soma `1.0` a todas as posições **depois** de `t` (de `t + 1` em diante) numa cópia de `X` e devolve `True` se as saídas das posições de `0` a `t` não mudam (com `np.allclose`), e `False` se mudam. `X` não pode ser alterado.

### Instruções

1. `atencao_causal`: pontuações com a transposta de `K` nos dois últimos eixos e a escala; máscara com `np.triu(..., 1)` e `np.where`; softmax no último eixo; `A @ V`.
2. `teste_de_causalidade`: altere só o futuro de `t` numa cópia, rode `f` nas duas entradas e compare as saídas até `t`, devolvendo um `bool`.

### Código inicial

```python
import numpy as np


def atencao_causal(Q, K, V):
    # pontuações com escala, máscara causal com -inf, softmax no último eixo, média dos valores
    pass


def teste_de_causalidade(f, X, t):
    # mude as posições depois de t numa cópia e compare as saídas até t
    pass


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

### Solução

```python
import numpy as np


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def teste_de_causalidade(f, X, t):
    antes = f(X)
    mudado = X.copy()
    mudado[:, t + 1:] += 1.0
    depois = f(mudado)
    return bool(np.allclose(antes[:, :t + 1], depois[:, :t + 1]))


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

### Dicas

1. `np.swapaxes(K, -1, -2)` transpõe os dois últimos eixos e deixa os de lote no lugar.
2. A máscara `(T, T)` se alinha sozinha com `(B, T, T)` e com `(B, h, T, T)`.
3. No teste, as posições de `0` a `t` são a fatia `[:, :t + 1]`, e o futuro é `[:, t + 1:]`.

### Verificação

```json
[
  {"id": "referencia", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n", "expr": "bool(np.allclose(atencao_causal(_Q, _K, _V), _ref(_Q, _K, _V), atol=1e-12))", "expected": true, "name": "Saída igual à da referência (B = 2, T = 5, d = 4, dv = 3)", "hint": "A referência dá a cada posição i a média dos valores de 0 a i, com pesos softmax das pontuações escaladas."},
  {"id": "primeira-posicao", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n", "expr": "bool(np.allclose(atencao_causal(_Q, _K, _V)[:, 0], _V[:, 0], atol=1e-12))", "expected": true, "name": "A posição 0 só enxerga a si mesma: a saída dela é o próprio valor", "hint": "A diagonal fica fora da máscara, e os pesos de cada linha somam 1."},
  {"id": "sem-nan", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n", "expr": "bool(np.isfinite(atencao_causal(_Q, _K, _V)).all())", "expected": true, "name": "Nenhum nan na saída", "hint": "Uma linha inteira de -inf vira nan: confira o deslocamento do np.triu."},
  {"id": "quatro-eixos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n_Q4, _K4, _V4 = _rng.normal(size=(2, 3, 5, 4)), _rng.normal(size=(2, 3, 5, 4)), _rng.normal(size=(2, 3, 5, 4))\n_Y4 = atencao_causal(_Q4, _K4, _V4)", "expr": "[list(_Y4.shape), bool(np.allclose(_Y4[:, 1], _ref(_Q4[:, 1], _K4[:, 1], _V4[:, 1]), atol=1e-12))]", "expected": [[2, 3, 5, 4], true], "name": "Funciona com (B, h, T, d): cada cabeça igual à referência"},
  {"id": "futuro-nao-entra", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n_K2, _V2 = _K.copy(), _V.copy()\n_K2[:, 3:] = 9.0\n_V2[:, 3:] = -7.0", "expr": "bool(np.allclose(atencao_causal(_Q, _K, _V)[:, :3], atencao_causal(_Q, _K2, _V2)[:, :3], atol=1e-12))", "expected": true, "name": "Trocar chaves e valores das posições 3 e 4 não muda as saídas de 0 a 2", "hint": "Zero não esconde uma pontuação: use -inf antes da softmax."},
  {"id": "teste-causal", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n", "expr": "[teste_de_causalidade(_causal, _X, t) for t in range(6)]", "expected": [true, true, true, true, true, true], "name": "Uma função causal (soma acumulada) passa no teste para todo t", "hint": "Só as posições depois de t podem ser alteradas, e só as saídas até t são comparadas."},
  {"id": "teste-vazamento", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n", "expr": "[teste_de_causalidade(_sem_mascara, _X, t) for t in range(5)]", "expected": [false, false, false, false, false], "name": "Uma atenção sem máscara é reprovada para todo t antes do fim", "hint": "As duas saídas precisam vir de entradas diferentes: a original e a cópia alterada."},
  {"id": "teste-vazamento-distante", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n", "expr": "[teste_de_causalidade(_vaza_do_fim, _X, 0), teste_de_causalidade(_vaza_do_fim, _X, 2)]", "expected": [false, false], "name": "Uma função que só olha a última posição também é reprovada", "hint": "Altere todas as posições depois de t, não só a seguinte."},
  {"id": "teste-ultimo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n", "expr": "teste_de_causalidade(_sem_mascara, _X, 5)", "expected": true, "name": "Com t na última posição não há futuro para mudar: o teste devolve True"},
  {"id": "teste-proprio", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n", "expr": "[teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), _X, t) for t in (0, 2, 4)]", "expected": [true, true, true], "name": "A sua atencao_causal passa no seu teste"},
  {"id": "teste-bool-e-intacto", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_Q, _K, _V = _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 4)), _rng.normal(size=(2, 5, 3))\n_X = _rng.normal(size=(2, 6, 4))\ndef _ref(Q, K, V):\n    B, T, d = Q.shape\n    Y = np.zeros((B, T, V.shape[-1]))\n    for b in range(B):\n        for i in range(T):\n            pontos = np.array([float(Q[b, i] @ K[b, j]) / d ** 0.5 for j in range(i + 1)])\n            pesos = np.exp(pontos - pontos.max())\n            pesos = pesos / pesos.sum()\n            Y[b, i] = pesos @ V[b, :i + 1]\n    return Y\ndef _sem_mascara(X):\n    S = X @ np.swapaxes(X, -1, -2) / X.shape[-1] ** 0.5\n    E = np.exp(S - S.max(axis=-1, keepdims=True))\n    return (E / E.sum(axis=-1, keepdims=True)) @ X\ndef _causal(X):\n    return np.cumsum(X, axis=1)\ndef _vaza_do_fim(X):\n    return X + X[:, -1:]\n_c = _X.copy()\n_r = teste_de_causalidade(_causal, _X, 2)", "expr": "[type(_r) is bool, bool(np.array_equal(_X, _c))]", "expected": [true, true], "name": "Devolve bool e não altera X", "hint": "Faça a alteração numa cópia de X."}
]
```

### Soluções erradas

```python name="máscara com 0 no lugar de -inf"
import numpy as np


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, 0.0, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def teste_de_causalidade(f, X, t):
    antes = f(X)
    mudado = X.copy()
    mudado[:, t + 1:] += 1.0
    depois = f(mudado)
    return bool(np.allclose(antes[:, :t + 1], depois[:, :t + 1]))


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

```python name="máscara aplicada depois da softmax"
import numpy as np


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    A = np.where(futuro, 0.0, A)
    return A @ V


def teste_de_causalidade(f, X, t):
    antes = f(X)
    mudado = X.copy()
    mudado[:, t + 1:] += 1.0
    depois = f(mudado)
    return bool(np.allclose(antes[:, :t + 1], depois[:, :t + 1]))


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

```python name="triu sem o deslocamento 1"
import numpy as np


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 0)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def teste_de_causalidade(f, X, t):
    antes = f(X)
    mudado = X.copy()
    mudado[:, t + 1:] += 1.0
    depois = f(mudado)
    return bool(np.allclose(antes[:, :t + 1], depois[:, :t + 1]))


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

```python name="máscara invertida, esconde o passado"
import numpy as np


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.tril(np.ones((T, T), dtype=bool), -1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def teste_de_causalidade(f, X, t):
    antes = f(X)
    mudado = X.copy()
    mudado[:, t + 1:] += 1.0
    depois = f(mudado)
    return bool(np.allclose(antes[:, :t + 1], depois[:, :t + 1]))


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

```python name="teste de causalidade mudando o passado"
import numpy as np


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def teste_de_causalidade(f, X, t):
    antes = f(X)
    mudado = X.copy()
    mudado[:, :t] += 1.0
    depois = f(mudado)
    return bool(np.allclose(antes[:, :t + 1], depois[:, :t + 1]))


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

```python name="teste comparando todas as posições"
import numpy as np


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def teste_de_causalidade(f, X, t):
    antes = f(X)
    mudado = X.copy()
    mudado[:, t + 1:] += 1.0
    depois = f(mudado)
    return bool(np.allclose(antes, depois))


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

```python name="teste mudando só a posição seguinte"
import numpy as np


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def teste_de_causalidade(f, X, t):
    antes = f(X)
    mudado = X.copy()
    mudado[:, t + 1:t + 2] += 1.0
    depois = f(mudado)
    return bool(np.allclose(antes[:, :t + 1], depois[:, :t + 1]))


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

```python name="teste que altera X no lugar"
import numpy as np


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def teste_de_causalidade(f, X, t):
    antes = f(X)
    mudado = X
    mudado[:, t + 1:] += 1.0
    depois = f(mudado)
    return bool(np.allclose(antes[:, :t + 1], depois[:, :t + 1]))


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

```python name="teste que muda também a posição t"
import numpy as np


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def teste_de_causalidade(f, X, t):
    antes = f(X)
    mudado = X.copy()
    mudado[:, t:] += 1.0
    depois = f(mudado)
    return bool(np.allclose(antes[:, :t + 1], depois[:, :t + 1]))


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    X = rng.normal(size=(2, 6, 4))
    Y = atencao_causal(X, X, X)
    print(Y.shape)
    print(teste_de_causalidade(lambda Z: atencao_causal(Z, Z, Z), X, 2))
```

## Passo 6 · Leitura · Projeção de saída e custo

Depois que as cabeças são juntadas de volta em $(B, T, d)$, falta uma peça: a **projeção de saída** $W_o$, de forma $(d, d)$. Sem ela, as colunas de 0 a 7 da saída só conteriam o que a cabeça 0 achou, as de 8 a 15 o que a cabeça 1 achou, e nada misturaria as descobertas. A projeção combina as cabeças e devolve o resultado para o espaço em que o resto da rede trabalha.

```python
Q = dividir_em_cabecas(X @ Wq, h)
K = dividir_em_cabecas(X @ Wk, h)
V = dividir_em_cabecas(X @ Wv, h)
Y = juntar_cabecas(atencao_causal(Q, K, V)) @ Wo
```

Um detalhe da escala: dentro de `atencao_causal`, o último eixo de `Q` mede $d/h$, e é esse o número que entra na raiz. Cada cabeça faz produtos escalares de $d/h$ parcelas.

**Parâmetros.** São quatro matrizes $(d, d)$, sem viés neste curso:

$$
\text{parâmetros} = 4d^2
$$

Com $d = 32$, são 4 096 números, para qualquer número de cabeças: dividir em cabeças não cria nem remove parâmetros, e também não depende de $T$.

**Custo.** Contando multiplicações por sequência:

- as três projeções de entrada e a de saída: cada uma multiplica $(T, d)$ por $(d, d)$, ou seja, $T d^2$; as quatro somam $4 T d^2$;
- as pontuações: cada cabeça calcula $T^2$ produtos escalares de tamanho $d/h$; com $h$ cabeças, $h \cdot T^2 \cdot d/h = T^2 d$;
- a média dos valores, $A V$: outros $T^2 d$.

$$
\text{multiplicações} = 4 T d^2 + 2 T^2 d = O(T^2 d + T d^2)
$$

O número de cabeças some da conta: $h$ cabeças de tamanho $d/h$ custam o mesmo que uma de tamanho $d$. No modelo deste nível ($T = 16$, $d = 32$), são $65\,536 + 16\,384 = 81\,920$ multiplicações por sequência, e as projeções dominam. Num modelo com $T = 1\,024$ e $d = 768$, a parte $2T^2 d$ vale $1{,}6 \cdot 10^9$ e a parte $4Td^2$ vale $2{,}4 \cdot 10^9$: as duas têm o mesmo tamanho. Dobrando o contexto para 2 048, a primeira quadruplica e a segunda só dobra. É o termo $T^2$ que torna caro um contexto longo, e não só no tempo: a matriz $A$ ocupa $h \cdot T^2$ números na memória.

## Passo 7 · Exercício · Multi-head completo

Junte as peças. As funções `dividir_em_cabecas`, `juntar_cabecas` e `atencao_causal` dos passos anteriores já estão no arquivo.

`multi_head(params, X, h)` recebe `params`, um dicionário com as matrizes `"Wq"`, `"Wk"`, `"Wv"` e `"Wo"`, todas `(d, d)`, e `X` de forma `(B, T, d)`. Ela projeta `X` em consultas, chaves e valores, divide cada um em `h` cabeças, aplica a atenção causal, junta as cabeças e multiplica por `Wo`. A saída tem forma `(B, T, d)`.

`custo_atencao(T, d, h)` devolve o número inteiro de multiplicações de um forward para uma sequência, somando as três parcelas da leitura: as quatro projeções ($T d^2$ cada), as pontuações ($T^2 \cdot d/h$ por cabeça) e a média dos valores ($T^2 \cdot d/h$ por cabeça). Se `d` não for múltiplo de `h`, levante `ValueError`.

### Instruções

1. `multi_head`: projeções com `Wq`, `Wk` e `Wv`, divisão em `h` cabeças, `atencao_causal`, junção e projeção de saída com `Wo`.
2. `custo_atencao`: valide que `d` é múltiplo de `h` e some as multiplicações das projeções, das pontuações e da média dos valores.

### Código inicial

```python
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    # projete, divida em cabeças, aplique a atenção causal, junte e projete com params["Wo"]
    pass


def custo_atencao(T, d, h):
    # multiplicações por sequência: projeções, pontuações e média dos valores
    pass


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

### Solução

```python
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    Q = dividir_em_cabecas(X @ params["Wq"], h)
    K = dividir_em_cabecas(X @ params["Wk"], h)
    V = dividir_em_cabecas(X @ params["Wv"], h)
    Y = juntar_cabecas(atencao_causal(Q, K, V))
    return Y @ params["Wo"]


def custo_atencao(T, d, h):
    if d % h != 0:
        raise ValueError("d precisa ser múltiplo de h")
    projecoes = 4 * T * d * d
    pontuacoes = h * T * T * (d // h)
    media = h * T * T * (d // h)
    return projecoes + pontuacoes + media


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

### Dicas

1. A divisão em cabeças vem depois de multiplicar por `Wq`, `Wk` e `Wv`, e a projeção `Wo` vem depois de juntar.
2. Cada cabeça tem `T * T` pares de posições, e cada par custa `d // h` multiplicações.
3. Some as parcelas com `h` explícito e veja o que acontece com ele.

### Verificação

```json
[
  {"id": "forma", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(6)\n_p = {nome: _rng.normal(0, 0.4, (8, 8)) for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\")}\n_X = _rng.normal(size=(2, 5, 8))\ndef _ref(p, X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Q, K, V = X @ p[\"Wq\"], X @ p[\"Wk\"], X @ p[\"Wv\"]\n    Y = np.zeros((B, T, d))\n    for b in range(B):\n        for c in range(h):\n            q, k, v = (M[b, :, c * dh:(c + 1) * dh] for M in (Q, K, V))\n            for i in range(T):\n                pontos = (k[:i + 1] @ q[i]) / dh ** 0.5\n                pesos = np.exp(pontos - pontos.max())\n                pesos = pesos / pesos.sum()\n                Y[b, i, c * dh:(c + 1) * dh] = pesos @ v[:i + 1]\n    return Y @ p[\"Wo\"]\n", "expr": "list(multi_head(_p, _X, 2).shape)", "expected": [2, 5, 8], "name": "A saída tem forma (B, T, d)"},
  {"id": "referencia-2", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(6)\n_p = {nome: _rng.normal(0, 0.4, (8, 8)) for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\")}\n_X = _rng.normal(size=(2, 5, 8))\ndef _ref(p, X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Q, K, V = X @ p[\"Wq\"], X @ p[\"Wk\"], X @ p[\"Wv\"]\n    Y = np.zeros((B, T, d))\n    for b in range(B):\n        for c in range(h):\n            q, k, v = (M[b, :, c * dh:(c + 1) * dh] for M in (Q, K, V))\n            for i in range(T):\n                pontos = (k[:i + 1] @ q[i]) / dh ** 0.5\n                pesos = np.exp(pontos - pontos.max())\n                pesos = pesos / pesos.sum()\n                Y[b, i, c * dh:(c + 1) * dh] = pesos @ v[:i + 1]\n    return Y @ p[\"Wo\"]\n", "expr": "bool(np.allclose(multi_head(_p, _X, 2), _ref(_p, _X, 2), atol=1e-12))", "expected": true, "name": "Igual à referência com 2 cabeças", "hint": "A referência fatia as colunas por cabeça, calcula a atenção causal de cada fatia e multiplica tudo por Wo no fim."},
  {"id": "referencia-4", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(6)\n_p = {nome: _rng.normal(0, 0.4, (8, 8)) for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\")}\n_X = _rng.normal(size=(2, 5, 8))\ndef _ref(p, X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Q, K, V = X @ p[\"Wq\"], X @ p[\"Wk\"], X @ p[\"Wv\"]\n    Y = np.zeros((B, T, d))\n    for b in range(B):\n        for c in range(h):\n            q, k, v = (M[b, :, c * dh:(c + 1) * dh] for M in (Q, K, V))\n            for i in range(T):\n                pontos = (k[:i + 1] @ q[i]) / dh ** 0.5\n                pesos = np.exp(pontos - pontos.max())\n                pesos = pesos / pesos.sum()\n                Y[b, i, c * dh:(c + 1) * dh] = pesos @ v[:i + 1]\n    return Y @ p[\"Wo\"]\n", "expr": "bool(np.allclose(multi_head(_p, _X, 4), _ref(_p, _X, 4), atol=1e-12))", "expected": true, "name": "Igual à referência com 4 cabeças"},
  {"id": "referencia-1", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(6)\n_p = {nome: _rng.normal(0, 0.4, (8, 8)) for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\")}\n_X = _rng.normal(size=(2, 5, 8))\ndef _ref(p, X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Q, K, V = X @ p[\"Wq\"], X @ p[\"Wk\"], X @ p[\"Wv\"]\n    Y = np.zeros((B, T, d))\n    for b in range(B):\n        for c in range(h):\n            q, k, v = (M[b, :, c * dh:(c + 1) * dh] for M in (Q, K, V))\n            for i in range(T):\n                pontos = (k[:i + 1] @ q[i]) / dh ** 0.5\n                pesos = np.exp(pontos - pontos.max())\n                pesos = pesos / pesos.sum()\n                Y[b, i, c * dh:(c + 1) * dh] = pesos @ v[:i + 1]\n    return Y @ p[\"Wo\"]\n", "expr": "bool(np.allclose(multi_head(_p, _X, 1), _ref(_p, _X, 1), atol=1e-12))", "expected": true, "name": "Igual à referência com 1 cabeça"},
  {"id": "cabecas-mudam", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(6)\n_p = {nome: _rng.normal(0, 0.4, (8, 8)) for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\")}\n_X = _rng.normal(size=(2, 5, 8))\ndef _ref(p, X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Q, K, V = X @ p[\"Wq\"], X @ p[\"Wk\"], X @ p[\"Wv\"]\n    Y = np.zeros((B, T, d))\n    for b in range(B):\n        for c in range(h):\n            q, k, v = (M[b, :, c * dh:(c + 1) * dh] for M in (Q, K, V))\n            for i in range(T):\n                pontos = (k[:i + 1] @ q[i]) / dh ** 0.5\n                pesos = np.exp(pontos - pontos.max())\n                pesos = pesos / pesos.sum()\n                Y[b, i, c * dh:(c + 1) * dh] = pesos @ v[:i + 1]\n    return Y @ p[\"Wo\"]\n", "expr": "bool(np.allclose(multi_head(_p, _X, 1), multi_head(_p, _X, 4), atol=1e-6))", "expected": false, "name": "1 cabeça e 4 cabeças dão saídas diferentes", "hint": "O argumento h precisa chegar à divisão em cabeças."},
  {"id": "projecao-de-saida", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(6)\n_p = {nome: _rng.normal(0, 0.4, (8, 8)) for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\")}\n_X = _rng.normal(size=(2, 5, 8))\ndef _ref(p, X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Q, K, V = X @ p[\"Wq\"], X @ p[\"Wk\"], X @ p[\"Wv\"]\n    Y = np.zeros((B, T, d))\n    for b in range(B):\n        for c in range(h):\n            q, k, v = (M[b, :, c * dh:(c + 1) * dh] for M in (Q, K, V))\n            for i in range(T):\n                pontos = (k[:i + 1] @ q[i]) / dh ** 0.5\n                pesos = np.exp(pontos - pontos.max())\n                pesos = pesos / pesos.sum()\n                Y[b, i, c * dh:(c + 1) * dh] = pesos @ v[:i + 1]\n    return Y @ p[\"Wo\"]\n_p2 = dict(_p)\n_p2[\"Wo\"] = np.zeros((8, 8))", "expr": "bool(np.allclose(multi_head(_p2, _X, 2), 0.0, atol=1e-15))", "expected": true, "name": "Com Wo = 0, a saída é zero", "hint": "A projeção de saída é a última multiplicação."},
  {"id": "causal", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(6)\n_p = {nome: _rng.normal(0, 0.4, (8, 8)) for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\")}\n_X = _rng.normal(size=(2, 5, 8))\ndef _ref(p, X, h):\n    B, T, d = X.shape\n    dh = d // h\n    Q, K, V = X @ p[\"Wq\"], X @ p[\"Wk\"], X @ p[\"Wv\"]\n    Y = np.zeros((B, T, d))\n    for b in range(B):\n        for c in range(h):\n            q, k, v = (M[b, :, c * dh:(c + 1) * dh] for M in (Q, K, V))\n            for i in range(T):\n                pontos = (k[:i + 1] @ q[i]) / dh ** 0.5\n                pesos = np.exp(pontos - pontos.max())\n                pesos = pesos / pesos.sum()\n                Y[b, i, c * dh:(c + 1) * dh] = pesos @ v[:i + 1]\n    return Y @ p[\"Wo\"]\n_X2 = _X.copy()\n_X2[:, 3:] += 1.0", "expr": "bool(np.allclose(multi_head(_p, _X, 2)[:, :3], multi_head(_p, _X2, 2)[:, :3], atol=1e-12))", "expected": true, "name": "Mudar as posições 3 e 4 não muda as saídas de 0 a 2"},
  {"id": "custo-do-nivel", "checkpoint": 2, "kind": "call", "function": "custo_atencao", "args": [16, 32, 4], "expected": 81920, "name": "T = 16, d = 32, h = 4: 81 920 multiplicações", "hint": "4 · 16 · 32² + 2 · 16² · 32."},
  {"id": "custo-uma-cabeca", "checkpoint": 2, "kind": "call", "function": "custo_atencao", "args": [16, 32, 1], "expected": 81920, "name": "Com 1 cabeça, o custo é o mesmo", "hint": "h cabeças de tamanho d/h custam o mesmo que uma de tamanho d."},
  {"id": "custo-pequeno", "checkpoint": 2, "kind": "call", "function": "custo_atencao", "args": [3, 4, 2], "expected": 264, "name": "T = 3, d = 4, h = 2: 192 das projeções e 72 das pontuações e da média"},
  {"id": "custo-contexto-dobrado", "checkpoint": 2, "kind": "expr", "expr": "[custo_atencao(1024, 768, 12), custo_atencao(2048, 768, 12)]", "expected": [4026531840, 11274289152], "name": "Dobrar o contexto de 1 024 para 2 048 com d = 768"},
  {"id": "custo-inteiro", "checkpoint": 2, "kind": "expr", "expr": "type(custo_atencao(8, 16, 4)) is int", "expected": true, "name": "O resultado é int"},
  {"id": "custo-invalido", "checkpoint": 2, "kind": "expr", "expr": "custo_atencao(16, 30, 4)", "raises": "ValueError", "name": "d = 30 com 4 cabeças levanta ValueError"}
]
```

### Soluções erradas

```python name="projeção de saída esquecida"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    Q = dividir_em_cabecas(X @ params["Wq"], h)
    K = dividir_em_cabecas(X @ params["Wk"], h)
    V = dividir_em_cabecas(X @ params["Wv"], h)
    Y = juntar_cabecas(atencao_causal(Q, K, V))
    return Y


def custo_atencao(T, d, h):
    if d % h != 0:
        raise ValueError("d precisa ser múltiplo de h")
    projecoes = 4 * T * d * d
    pontuacoes = h * T * T * (d // h)
    media = h * T * T * (d // h)
    return projecoes + pontuacoes + media


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

```python name="uma cabeça só, ignora h"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    Q = dividir_em_cabecas(X @ params["Wq"], 1)
    K = dividir_em_cabecas(X @ params["Wk"], 1)
    V = dividir_em_cabecas(X @ params["Wv"], 1)
    Y = juntar_cabecas(atencao_causal(Q, K, V))
    return Y @ params["Wo"]


def custo_atencao(T, d, h):
    if d % h != 0:
        raise ValueError("d precisa ser múltiplo de h")
    projecoes = 4 * T * d * d
    pontuacoes = h * T * T * (d // h)
    media = h * T * T * (d // h)
    return projecoes + pontuacoes + media


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

```python name="chaves projetadas com Wq"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    Q = dividir_em_cabecas(X @ params["Wq"], h)
    K = dividir_em_cabecas(X @ params["Wq"], h)
    V = dividir_em_cabecas(X @ params["Wv"], h)
    Y = juntar_cabecas(atencao_causal(Q, K, V))
    return Y @ params["Wo"]


def custo_atencao(T, d, h):
    if d % h != 0:
        raise ValueError("d precisa ser múltiplo de h")
    projecoes = 4 * T * d * d
    pontuacoes = h * T * T * (d // h)
    media = h * T * T * (d // h)
    return projecoes + pontuacoes + media


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

```python name="cabeças juntadas por reshape direto"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    Q = dividir_em_cabecas(X @ params["Wq"], h)
    K = dividir_em_cabecas(X @ params["Wk"], h)
    V = dividir_em_cabecas(X @ params["Wv"], h)
    Y = atencao_causal(Q, K, V).reshape(X.shape)
    return Y @ params["Wo"]


def custo_atencao(T, d, h):
    if d % h != 0:
        raise ValueError("d precisa ser múltiplo de h")
    projecoes = 4 * T * d * d
    pontuacoes = h * T * T * (d // h)
    media = h * T * T * (d // h)
    return projecoes + pontuacoes + media


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

```python name="projeção de saída antes da atenção"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    Q = dividir_em_cabecas(X @ params["Wq"], h)
    K = dividir_em_cabecas(X @ params["Wk"], h)
    V = dividir_em_cabecas(X @ params["Wv"], h)
    V = dividir_em_cabecas(X @ params["Wv"] @ params["Wo"], h)
    return juntar_cabecas(atencao_causal(Q, K, V))


def custo_atencao(T, d, h):
    if d % h != 0:
        raise ValueError("d precisa ser múltiplo de h")
    projecoes = 4 * T * d * d
    pontuacoes = h * T * T * (d // h)
    media = h * T * T * (d // h)
    return projecoes + pontuacoes + media


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

```python name="custo sem a projeção de saída"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    Q = dividir_em_cabecas(X @ params["Wq"], h)
    K = dividir_em_cabecas(X @ params["Wk"], h)
    V = dividir_em_cabecas(X @ params["Wv"], h)
    Y = juntar_cabecas(atencao_causal(Q, K, V))
    return Y @ params["Wo"]


def custo_atencao(T, d, h):
    if d % h != 0:
        raise ValueError("d precisa ser múltiplo de h")
    projecoes = 3 * T * d * d
    pontuacoes = h * T * T * (d // h)
    media = h * T * T * (d // h)
    return projecoes + pontuacoes + media


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

```python name="custo multiplicado pelo número de cabeças"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    Q = dividir_em_cabecas(X @ params["Wq"], h)
    K = dividir_em_cabecas(X @ params["Wk"], h)
    V = dividir_em_cabecas(X @ params["Wv"], h)
    Y = juntar_cabecas(atencao_causal(Q, K, V))
    return Y @ params["Wo"]


def custo_atencao(T, d, h):
    if d % h != 0:
        raise ValueError("d precisa ser múltiplo de h")
    projecoes = 4 * T * d * d
    pontuacoes = h * T * T * d
    media = h * T * T * d
    return projecoes + pontuacoes + media


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

```python name="custo sem validar d múltiplo de h"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    Q = dividir_em_cabecas(X @ params["Wq"], h)
    K = dividir_em_cabecas(X @ params["Wk"], h)
    V = dividir_em_cabecas(X @ params["Wv"], h)
    Y = juntar_cabecas(atencao_causal(Q, K, V))
    return Y @ params["Wo"]


def custo_atencao(T, d, h):
    projecoes = 4 * T * d * d
    pontuacoes = h * T * T * (d // h)
    media = h * T * T * (d // h)
    return projecoes + pontuacoes + media


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

```python name="custo sem a média dos valores"
import numpy as np


def dividir_em_cabecas(X, h):
    B, T, d = X.shape
    return X.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def juntar_cabecas(X):
    B, h, T, dh = X.shape
    return X.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def atencao_causal(Q, K, V):
    T, d = Q.shape[-2], Q.shape[-1]
    S = Q @ np.swapaxes(K, -1, -2) / np.sqrt(d)
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    S = np.where(futuro, -np.inf, S)
    E = np.exp(S - S.max(axis=-1, keepdims=True))
    A = E / E.sum(axis=-1, keepdims=True)
    return A @ V


def multi_head(params, X, h):
    Q = dividir_em_cabecas(X @ params["Wq"], h)
    K = dividir_em_cabecas(X @ params["Wk"], h)
    V = dividir_em_cabecas(X @ params["Wv"], h)
    Y = juntar_cabecas(atencao_causal(Q, K, V))
    return Y @ params["Wo"]


def custo_atencao(T, d, h):
    if d % h != 0:
        raise ValueError("d precisa ser múltiplo de h")
    projecoes = 4 * T * d * d
    pontuacoes = h * T * T * (d // h)
    media = h * T * T * (d // h)
    return projecoes + pontuacoes


if __name__ == "__main__":
    rng = np.random.default_rng(0)
    params = {nome: rng.normal(0, 0.2, (8, 8)) for nome in ("Wq", "Wk", "Wv", "Wo")}
    X = rng.normal(size=(2, 5, 8))
    print(multi_head(params, X, 2).shape)
    print(custo_atencao(16, 32, 4))
```

## Passo 8 · Quiz · Máscara e cabeças

### Pergunta

Todas as linhas de pontuações de uma sequência de 3 posições valem `[1, 2, 3]`. Com a máscara causal correta, os pesos são `[[1.0, 0.0, 0.0], [0.269, 0.731, 0.0], [0.09, 0.245, 0.665]]`. Uma implementação devolve, para a primeira linha, `[0.576, 0.212, 0.212]`. Qual é o defeito?

- [ ] O `np.triu` foi chamado sem o deslocamento 1, e a diagonal entrou na máscara
- [x] As posições do futuro receberam pontuação 0 no lugar de $-\infty$, e continuam disputando a softmax
- [ ] A máscara foi aplicada depois da softmax, zerando os pesos do futuro
- [ ] A softmax foi calculada por coluna

> Com 0 no lugar das pontuações 2 e 3, a linha vira `[1, 0, 0]`, e a softmax dá `[0,576, 0,212, 0,212]`: 42 % do peso vai para o futuro. Sem o deslocamento, a primeira linha seria `nan`; mascarar depois da softmax daria `[0,09, 0, 0]`, sem somar 1; e a softmax por coluna não produziria dois pesos iguais nessa linha.

### Pergunta

Um modelo tem $T = 16$, $d = 32$ e 4 cabeças: a atenção custa 81 920 multiplicações por sequência e tem 4 096 parâmetros. A equipe quer trocar para 8 cabeças, mantendo $d = 32$. O que muda?

- [ ] O custo e os parâmetros dobram, porque há o dobro de cabeças
- [ ] O custo dobra e os parâmetros ficam iguais
- [x] Custo e parâmetros ficam iguais; cada cabeça passa a trabalhar com vetores de tamanho 4 no lugar de 8
- [ ] Os parâmetros caem pela metade, porque cada cabeça fica menor

> As matrizes continuam $(d, d)$, então os parâmetros são $4d^2 = 4\,096$, e o custo $4Td^2 + 2T^2d$ não tem $h$: oito cabeças de tamanho 4 custam o mesmo que quatro de tamanho 8. Nada dobra, porque as cabeças dividem a dimensão em vez de repeti-la, e nada cai pela metade, porque as projeções têm sempre a largura $d$ inteira.

### Pergunta

Durante o treino de um modelo de linguagem, a perda de treino cai para perto de zero em poucos passos, mas o texto gerado depois é ruído. O teste de causalidade aplicado ao modelo devolve `False`. Qual é a leitura correta?

- [ ] O modelo decorou o conjunto de treino, e a solução é aumentar a regularização
- [ ] A taxa de aprendizado está alta demais, e a perda baixa é instabilidade numérica
- [ ] O teste está errado, porque um modelo com perda baixa não pode ter defeito
- [x] O modelo enxerga o futuro: no treino ele copia a resposta da posição seguinte, e na geração essa posição não existe

> O teste reprovado mostra que a saída de uma posição depende das posições seguintes; no treino, a resposta está lá, e a perda despenca sem nada ser aprendido. Decorar o treino levaria muito mais passos e não reprovaria o teste; uma taxa alta faz a perda subir ou oscilar, não chegar a zero; e a perda de treino baixa é justamente o sintoma do vazamento, não uma prova de que o modelo está certo.
