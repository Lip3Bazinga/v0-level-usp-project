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
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Montar o conjunto de dados (contexto → próximo caractere) e o MLP de linguagem com embeddings
- Treinar com mini-batches, buscar a taxa de aprendizado e atingir NLL abaixo da do bigrama
- Amostrar nomes e inspecionar os embeddings aprendidos (vogais próximas, etc.)
---

## Passo 1 · Leitura · Um contexto de k caracteres

O bigrama da lição anterior olha um caractere e parou na NLL de validação de $2{,}1250$. Para melhorar, o modelo precisa ver mais do passado. O caminho da contagem não serve: com 3 caracteres de contexto, a tabela teria $21^3 = 9\,261$ linhas para 5 145 exemplos de treino, e com 8 caracteres, $21^8 \approx 3{,}8 \cdot 10^{10}$. Quase todo contexto apareceria zero vezes, e um contexto nunca visto não ensina nada sobre os parecidos com ele.

Em 2003, Yoshua Bengio e colegas propuseram outra saída, num artigo que virou a base dos modelos de linguagem neurais. Em vez de uma linha de tabela por contexto, cada **token** ganha um vetor de embedding, e o contexto é a concatenação dos vetores dos seus tokens. Uma rede pequena transforma essa concatenação em logits para o próximo token. Se `a` e `e` terminam com vetores parecidos, o que o modelo aprende sobre contextos com `a` vale também para contextos com `e`, mesmo os que nunca apareceram.

```mermaid
flowchart LR
    X["contexto: 3 índices"] --> C["tabela C: (V, d)"]
    C --> K["concatenar: 3·d números"]
    K --> H["tanh(A0·W1 + b1)"]
    H --> Z["logits: V números"]
    Z --> P["softmax: P(próximo)"]
```

O tamanho do contexto se chama `bloco`. Cada nome vira vários exemplos, um por caractere a prever, e os contextos do começo são preenchidos com o `.` (índice 0), que continua marcando o início e o fim:

```python
bloco = 3
nome = "bia"
# contexto -> alvo
# "..."    -> "b"
# "..b"    -> "i"
# ".bi"    -> "a"
# "bia"    -> "."
```

Os parâmetros crescem devagar com o contexto. Com $V = 21$, $d = 2$, `bloco = 3` e 32 unidades escondidas, a rede tem $21 \cdot 2 + (6 \cdot 32 + 32) + (32 \cdot 21 + 21) = 959$ números. Dobrar o contexto para 6 soma só $6 \cdot 32 = 192$ pesos à primeira camada, enquanto a tabela de contagens seria multiplicada por $21^3$.

Nesta lição você monta os exemplos, escreve o forward e o backward dessa rede (o embedding da primeira lição do módulo mais as camadas densas que você já conhece), treina com mini-lotes e amostra nomes. O limite que sobra, o contexto de tamanho fixo, é o assunto da próxima.

## Passo 2 · Previsão · Os exemplos de um nome

O código monta os exemplos de `ana` com `bloco = 3` e imprime cada contexto com o alvo, em caracteres e em índices. O vocabulário é `.`, `a`, `n`, nessa ordem. Escreva a saída antes de rodar.

### Código

```python
itos = [".", "a", "n"]
stoi = {c: i for i, c in enumerate(itos)}
bloco = 3

X, Y = [], []
contexto = [0] * bloco
for c in "ana" + ".":
    X.append(contexto)
    Y.append(stoi[c])
    print("".join(itos[i] for i in contexto), "->", c)
    contexto = contexto[1:] + [stoi[c]]

print(X)
print(Y)
print(len(X), len(X[0]))
```

### Dicas

1. O primeiro contexto é só preenchimento: três vezes o índice 0.
2. A cada passo o contexto perde o índice mais antigo e ganha o alvo que acabou de ser previsto.
3. Um nome de 3 letras rende 4 exemplos, porque o `.` final também é um alvo.

### Saída esperada

```text
... -> a
..a -> n
.an -> a
ana -> .
[[0, 0, 0], [0, 0, 1], [0, 1, 2], [1, 2, 1]]
[1, 2, 1, 0]
4 3
```

## Passo 3 · Exercício · montar_dados(nomes, bloco, stoi)

modo: lacunas

Complete a função que transforma uma lista de nomes nos arrays de treino: `X`, de forma `(n, bloco)`, com os contextos, e `Y`, de forma `(n,)`, com o índice do próximo caractere.

### Instruções

1. Complete o contexto inicial de cada nome: `bloco` vezes o índice 0, o do `.`.
2. Complete o texto percorrido pelo laço: as letras do nome e o `.` final, que é o último alvo.
3. Complete a atualização do contexto: sai o índice mais antigo (o da esquerda) e entra, à direita, o índice do caractere que acabou de ser o alvo.

### Código inicial

```python
import numpy as np


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = ___
        for c in ___:
            X.append(contexto)
            Y.append(stoi[c])
            contexto = ___
    return np.array(X), np.array(Y)
```

### Solução

```python
import numpy as np


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = [0] * bloco
        for c in nome + ".":
            X.append(contexto)
            Y.append(stoi[c])
            contexto = contexto[1:] + [stoi[c]]
    return np.array(X), np.array(Y)
```

### Dicas

1. O contexto é uma lista de inteiros com exatamente `bloco` elementos, do começo ao fim do nome.
2. `lista[1:]` descarta o primeiro elemento; somar uma lista de um elemento acrescenta no fim.
3. O nome precisa terminar: o último exemplo de cada nome tem o `.` como alvo.

### Verificação

```json
[
  {"id": "ana-contextos", "checkpoint": 3, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.an')}", "expr": "montar_dados(['ana'], 3, _stoi)[0].tolist()", "expected": [[0, 0, 0], [0, 0, 1], [0, 1, 2], [1, 2, 1]], "name": "Contextos de 'ana' com bloco 3", "hint": "São os quatro contextos do passo anterior: '...', '..a', '.an', 'ana'."},
  {"id": "ana-alvos", "checkpoint": 2, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.an')}", "expr": "montar_dados(['ana'], 3, _stoi)[1].tolist()", "expected": [1, 2, 1, 0], "name": "Alvos de 'ana': as três letras e o '.' final", "hint": "O último alvo de cada nome é o índice 0."},
  {"id": "formas", "checkpoint": 1, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abil')}\n_X, _Y = montar_dados(['bia', 'lia', 'abil', 'a'], 4, _stoi)", "expr": "[list(_X.shape), list(_Y.shape)]", "expected": [[15, 4], [15]], "name": "Quatro nomes com bloco 4: X é (n, bloco) e Y é (n,), com um exemplo por letra mais um por nome", "hint": "Um nome de k letras rende k + 1 exemplos, e todo contexto tem bloco índices."},
  {"id": "primeiro-contexto", "checkpoint": 1, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abil')}\n_X, _Y = montar_dados(['bia', 'lia'], 3, _stoi)", "expr": "[_X[0].tolist(), _X[4].tolist()]", "expected": [[0, 0, 0], [0, 0, 0]], "name": "O primeiro contexto de cada nome é só preenchimento com o índice 0", "hint": "O contexto recomeça a cada nome: nada do nome anterior entra."},
  {"id": "dois-nomes", "checkpoint": 3, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abil')}\n_X, _Y = montar_dados(['bia', 'li'], 2, _stoi)", "expr": "[_X.tolist(), _Y.tolist()]", "expected": [[[0, 0], [0, 2], [2, 3], [3, 1], [0, 0], [0, 4], [4, 3]], [2, 3, 1, 0, 4, 3, 0]], "name": "Dois nomes com bloco 2: contextos e alvos na ordem"},
  {"id": "bloco-um", "checkpoint": 3, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abn')}\n_X, _Y = montar_dados(['banana'], 1, _stoi)", "expr": "[_X[:, 0].tolist(), _Y.tolist()]", "expected": [[0, 2, 1, 3, 1, 3, 1], [2, 1, 3, 1, 3, 1, 0]], "name": "Com bloco 1, os exemplos são os pares do bigrama", "hint": "O contexto de um elemento é o caractere anterior, começando no '.'."},
  {"id": "bloco-maior-que-o-nome", "checkpoint": 3, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.ab')}\n_X, _Y = montar_dados(['ab'], 5, _stoi)", "expr": "_X.tolist()", "expected": [[0, 0, 0, 0, 0], [0, 0, 0, 0, 1], [0, 0, 0, 1, 2]], "name": "Bloco 5 num nome de 2 letras: o preenchimento fica à esquerda", "hint": "Os índices novos entram pela direita e empurram o preenchimento para fora pela esquerda."},
  {"id": "ultimo-contexto", "checkpoint": 3, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abil')}\n_X, _Y = montar_dados(['abil'], 3, _stoi)", "expr": "[_X[-1].tolist(), int(_Y[-1])]", "expected": [[2, 3, 4], 0], "name": "O último exemplo de 'abil' tem o contexto 'bil' e o alvo '.'", "hint": "A letra mais recente fica na última posição do contexto."},
  {"id": "uma-letra", "checkpoint": 2, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.a')}\n_X, _Y = montar_dados(['a'], 2, _stoi)", "expr": "[_X.tolist(), _Y.tolist()]", "expected": [[[0, 0], [0, 1]], [1, 0]], "name": "Um nome de uma letra rende dois exemplos"},
  {"id": "tipo-inteiro", "checkpoint": 1, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abil')}\n_X, _Y = montar_dados(['bia', 'lia'], 3, _stoi)", "expr": "[_X.dtype.kind, _Y.dtype.kind, _X.ndim, _Y.ndim]", "expected": ["i", "i", 2, 1], "name": "X e Y são arrays de inteiros, com 2 e 1 eixos"}
]
```

### Soluções erradas

```python name="sem o ponto final como alvo"
import numpy as np


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = [0] * bloco
        for c in nome:
            X.append(contexto)
            Y.append(stoi[c])
            contexto = contexto[1:] + [stoi[c]]
    return np.array(X), np.array(Y)
```

```python name="ponto também no começo do nome"
import numpy as np


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = [0] * bloco
        for c in "." + nome + ".":
            X.append(contexto)
            Y.append(stoi[c])
            contexto = contexto[1:] + [stoi[c]]
    return np.array(X), np.array(Y)
```

```python name="contexto inicial sem preenchimento"
import numpy as np


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = []
        for c in nome + ".":
            X.append(contexto)
            Y.append(stoi[c])
            contexto = contexto[1:] + [stoi[c]]
    return np.array(X), np.array(Y)
```

```python name="contexto inicial com a primeira letra"
import numpy as np


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = [stoi[nome[0]]] * bloco
        for c in nome + ".":
            X.append(contexto)
            Y.append(stoi[c])
            contexto = contexto[1:] + [stoi[c]]
    return np.array(X), np.array(Y)
```

```python name="contexto que não desliza"
import numpy as np


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = [0] * bloco
        for c in nome + ".":
            X.append(contexto)
            Y.append(stoi[c])
            contexto = contexto
    return np.array(X), np.array(Y)
```

```python name="janela desliza para o lado errado"
import numpy as np


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = [0] * bloco
        for c in nome + ".":
            X.append(contexto)
            Y.append(stoi[c])
            contexto = [stoi[c]] + contexto[:-1]
    return np.array(X), np.array(Y)
```

```python name="contexto que cresce sem descartar o mais antigo"
import numpy as np


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = [0] * bloco
        for c in nome + ".":
            X.append(contexto)
            Y.append(stoi[c])
            contexto = contexto + [stoi[c]]
    return np.array(X), np.array(Y)
```

## Passo 4 · Leitura · Concatenar embeddings

O forward começa na tabela de embeddings, que nesta lição se chama `C`, de forma $(V, d)$. Indexar com `X`, de forma `(n, bloco)`, devolve um array de três eixos: para cada exemplo, para cada posição do contexto, um vetor de $d$ números.

```python
import numpy as np

C = np.arange(10.0).reshape(5, 2)          # V = 5, d = 2
X = np.array([[0, 0, 3], [0, 3, 1]])       # n = 2, bloco = 3

emb = C[X]
print(emb.shape)                            # (2, 3, 2)
A0 = emb.reshape(2, -1)
print(A0.tolist())
# [[0.0, 1.0, 0.0, 1.0, 6.0, 7.0], [0.0, 1.0, 6.0, 7.0, 2.0, 3.0]]
```

A camada densa espera uma linha por exemplo. O `reshape(n, bloco * d)` achata os dois últimos eixos e põe os vetores do contexto lado a lado, na ordem das posições: é a **concatenação**. O eixo dos exemplos tem de continuar sendo o primeiro. Um `transpose` antes do `reshape` produz a mesma forma com os números de exemplos diferentes misturados na mesma linha, e nenhum erro avisa. Esquecer o `reshape`, pelo menos, é barulhento:

```text
ValueError: matmul: Input operand 1 has a mismatch in its core dimension 0, with gufunc signature (n?,k),(k,m?)->(n?,m?) (size 6 is different from 2)
```

Dali em diante é a rede de duas camadas de sempre, com tanh na escondida:

$$A_1 = \tanh(A_0 W_1 + b_1), \qquad Z = A_1 W_2 + b_2, \qquad P = \text{softmax}(Z)$$

No backward, o gradiente chega a $A_0$ com forma `(n, bloco * d)`, volta para `(n, bloco, d)` com o `reshape` inverso e entra no backward do embedding. O mesmo token aparece em muitos contextos do lote, então os gradientes dele precisam ser somados com `np.add.at`.

A inicialização merece um cuidado que o bigrama não pedia. Antes de aprender, o melhor que a rede pode fazer é não ter preferência: logits perto de zero, probabilidade $1/V$ para cada caractere e perda $\ln 21 = 3{,}0445$. Medido numa rede com $d = 8$ e 64 unidades: com $W_2$ sorteado com desvio $0{,}01$, a perda inicial é $3{,}0472$; com desvio 1, ela é $9{,}46$. A rede começa confiante em respostas erradas, e os primeiros passos do treino são gastos só para encolher os logits. Uma perda inicial longe de $\ln V$ é sinal de inicialização ruim, e vale conferir antes de treinar.

## Passo 5 · Exercício · Forward e backward do MLP de linguagem

Escreva a função que calcula a perda e todos os gradientes do modelo. `params` é um dicionário com as chaves `"C"` (forma `(V, d)`), `"W1"` (`(bloco * d, H)`), `"b1"` (`(H,)`), `"W2"` (`(H, V)`) e `"b2"` (`(V,)`); `X` tem forma `(n, bloco)` e `Y`, `(n,)`.

### Instruções

1. Escreva o forward de `perda_e_gradientes_lm(params, X, Y)`: `C[X]` achatado para `(n, bloco * d)`, camada escondida com tanh, logits, softmax por linha e a NLL média dos alvos, como `float`.
2. Calcule os gradientes das camadas densas: `dZ = (P - onehot(Y)) / n`, depois `W2` e `b2`, a volta pela tanh ($1 - A_1^2$), e `W1` e `b1`. Os vieses somam ao longo do lote.
3. Leve o gradiente até a tabela: volte o gradiente de `A0` para a forma `(n, bloco, d)` e acumule em `dC`, de forma `(V, d)`, somando as posições que usaram o mesmo token. Devolva `(perda, grads)`, com `grads` um dicionário com as mesmas cinco chaves de `params`. Não altere `params`.

### Código inicial

```python
import numpy as np


def perda_e_gradientes_lm(params, X, Y):
    pass
```

### Solução

```python
import numpy as np


def perda_e_gradientes_lm(params, X, Y):
    C, W1, b1, W2, b2 = (params[k] for k in ("C", "W1", "b1", "W2", "b2"))
    n = X.shape[0]
    emb = C[X]
    A0 = emb.reshape(n, -1)
    A1 = np.tanh(A0 @ W1 + b1)
    Z = A1 @ W2 + b2
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).mean())

    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ /= n
    dW2 = A1.T @ dZ
    db2 = dZ.sum(axis=0)
    dZ1 = (dZ @ W2.T) * (1.0 - A1 ** 2)
    dW1 = A0.T @ dZ1
    db1 = dZ1.sum(axis=0)
    dA0 = dZ1 @ W1.T
    dC = np.zeros_like(C)
    np.add.at(dC, X, dA0.reshape(emb.shape))
    return perda, {"C": dC, "W1": dW1, "b1": db1, "W2": dW2, "b2": db2}
```

### Dicas

1. Guarde `emb = C[X]`: a forma dele é a que o gradiente de `A0` precisa ter antes de entrar no embedding.
2. A ordem do backward é a inversa do forward: logits, `W2` e `b2`, tanh, `W1` e `b1`, `A0`, tabela.
3. `np.add.at(dC, X, valores)` aceita `X` de forma `(n, bloco)` e `valores` de forma `(n, bloco, d)`.

### Verificação

```json
[
  {"id": "perda-rede-minima", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (5, 2)), \"W1\": _rng.normal(0, 1, (4, 3)), \"b1\": _rng.normal(0, 1, 3), \"W2\": _rng.normal(0, 1, (3, 5)), \"b2\": _rng.normal(0, 1, 5)}\n_X = np.array([[0, 0], [0, 1], [1, 3], [3, 1], [1, 1], [0, 3]])\n_Y = np.array([1, 3, 1, 1, 0, 4])", "expr": "perda_e_gradientes_lm(_params, _X, _Y)[0]", "expected": 1.741985694446936, "tolerance": 1e-12, "name": "Perda de uma rede com V = 5, bloco 2, d = 2 e 3 unidades, em 6 exemplos", "hint": "C[X] achatado para (n, bloco * d), tanh, logits, softmax por linha e a média de -ln P[i, Y[i]]."},
  {"id": "perda-ln-v", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (5, 2)), \"W1\": _rng.normal(0, 1, (4, 3)), \"b1\": _rng.normal(0, 1, 3), \"W2\": _rng.normal(0, 1, (3, 5)), \"b2\": _rng.normal(0, 1, 5)}\n_X = np.array([[0, 0], [0, 1], [1, 3], [3, 1], [1, 1], [0, 3]])\n_Y = np.array([1, 3, 1, 1, 0, 4])\n_params[\"W2\"] = np.zeros((3, 5))\n_params[\"b2\"] = np.zeros(5)", "expr": "perda_e_gradientes_lm(_params, _X, _Y)[0]", "expected": 1.6094379124341003, "tolerance": 1e-12, "name": "Com W2 e b2 zerados, a perda é ln 5", "hint": "Logits iguais dão probabilidade 1/V para cada caractere."},
  {"id": "perda-float", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (5, 2)), \"W1\": _rng.normal(0, 1, (4, 3)), \"b1\": _rng.normal(0, 1, 3), \"W2\": _rng.normal(0, 1, (3, 5)), \"b2\": _rng.normal(0, 1, 5)}\n_X = np.array([[0, 0], [0, 1], [1, 3], [3, 1], [1, 1], [0, 3]])\n_Y = np.array([1, 3, 1, 1, 0, 4])\n_perda, _g = perda_e_gradientes_lm(_params, _X, _Y)", "expr": "[type(_perda) is float, sorted(_g)]", "expected": [true, ["C", "W1", "W2", "b1", "b2"]], "name": "A perda é float e grads tem as cinco chaves de params"},
  {"id": "formas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (5, 2)), \"W1\": _rng.normal(0, 1, (4, 3)), \"b1\": _rng.normal(0, 1, 3), \"W2\": _rng.normal(0, 1, (3, 5)), \"b2\": _rng.normal(0, 1, 5)}\n_X = np.array([[0, 0], [0, 1], [1, 3], [3, 1], [1, 1], [0, 3]])\n_Y = np.array([1, 3, 1, 1, 0, 4])\n_perda, _g = perda_e_gradientes_lm(_params, _X, _Y)", "expr": "[list(_g[k].shape) for k in _nomes]", "expected": [[5, 2], [4, 3], [3], [3, 5], [5]], "name": "Cada gradiente tem a forma do parâmetro (C, W1, b1, W2, b2)", "hint": "b1 e b2 têm um eixo só: some dZ ao longo do lote."},
  {"id": "numerica-densas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (5, 2)), \"W1\": _rng.normal(0, 1, (4, 3)), \"b1\": _rng.normal(0, 1, 3), \"W2\": _rng.normal(0, 1, (3, 5)), \"b2\": _rng.normal(0, 1, 5)}\n_X = np.array([[0, 0], [0, 1], [1, 3], [3, 1], [1, 1], [0, 3]])\n_Y = np.array([1, 3, 1, 1, 0, 4])\n_perda, _g = perda_e_gradientes_lm(_params, _X, _Y)\ndef _f():\n    return perda_e_gradientes_lm(_params, _X, _Y)[0]\ndef _numerico(A, h=1e-5):\n    N = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        a = _f()\n        A[i] = v - h\n        b = _f()\n        A[i] = v\n        N[i] = (a - b) / (2 * h)\n    return N\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))", "expr": "[bool(_erro(_g[k], _numerico(_params[k])) < 1e-7) for k in ['W1', 'b1', 'W2', 'b2']]", "expected": [true, true, true, true], "name": "W1, b1, W2 e b2 batem com a diferença central (erro relativo abaixo de 1e-7)", "hint": "Cada booleano é um array, na ordem W1, b1, W2, b2. Se só W1 e b1 falham, confira a volta pela tanh."},
  {"id": "numerica-tabela", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (5, 2)), \"W1\": _rng.normal(0, 1, (4, 3)), \"b1\": _rng.normal(0, 1, 3), \"W2\": _rng.normal(0, 1, (3, 5)), \"b2\": _rng.normal(0, 1, 5)}\n_X = np.array([[0, 0], [0, 1], [1, 3], [3, 1], [1, 1], [0, 3]])\n_Y = np.array([1, 3, 1, 1, 0, 4])\n_perda, _g = perda_e_gradientes_lm(_params, _X, _Y)\ndef _f():\n    return perda_e_gradientes_lm(_params, _X, _Y)[0]\ndef _numerico(A, h=1e-5):\n    N = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        a = _f()\n        A[i] = v - h\n        b = _f()\n        A[i] = v\n        N[i] = (a - b) / (2 * h)\n    return N\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))", "expr": "bool(_erro(_g['C'], _numerico(_params['C'])) < 1e-7)", "expected": true, "name": "dC bate com a diferença central, com tokens repetidos no lote", "hint": "O token 0 aparece quatro vezes e o 1, cinco. Indexação direta com += grava uma vez só por token."},
  {"id": "tabela-valores", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (5, 2)), \"W1\": _rng.normal(0, 1, (4, 3)), \"b1\": _rng.normal(0, 1, 3), \"W2\": _rng.normal(0, 1, (3, 5)), \"b2\": _rng.normal(0, 1, 5)}\n_X = np.array([[0, 0], [0, 1], [1, 3], [3, 1], [1, 1], [0, 3]])\n_Y = np.array([1, 3, 1, 1, 0, 4])\n_perda, _g = perda_e_gradientes_lm(_params, _X, _Y)", "expr": "_g['C'].tolist()", "expected": [[-0.10331425850847738, 0.17225623489375902], [0.050947913978505135, -0.4120334090190782], [0.0, 0.0], [0.04780050155357387, -0.01944591461085729], [0.0, 0.0]], "tolerance": 1e-10, "name": "Valores de dC na rede mínima"},
  {"id": "tokens-nao-usados", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (5, 2)), \"W1\": _rng.normal(0, 1, (4, 3)), \"b1\": _rng.normal(0, 1, 3), \"W2\": _rng.normal(0, 1, (3, 5)), \"b2\": _rng.normal(0, 1, 5)}\n_X = np.array([[0, 0], [0, 1], [1, 3], [3, 1], [1, 1], [0, 3]])\n_Y = np.array([1, 3, 1, 1, 0, 4])\n_perda, _g = perda_e_gradientes_lm(_params, _X, _Y)", "expr": "[bool(abs(_g['C'][i]).sum() > 0) for i in range(5)]", "expected": [true, true, false, true, false], "name": "Os tokens 2 e 4 não aparecem em X e ficam com gradiente zero"},
  {"id": "bloco-um", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(4)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (4, 3)), \"W1\": _rng.normal(0, 1, (3, 2)), \"b1\": _rng.normal(0, 1, 2), \"W2\": _rng.normal(0, 1, (2, 4)), \"b2\": _rng.normal(0, 1, 4)}\n_X = np.array([[0], [2], [2], [1], [2]])\n_Y = np.array([2, 2, 1, 0, 3])\n_perda, _g = perda_e_gradientes_lm(_params, _X, _Y)\ndef _f():\n    return perda_e_gradientes_lm(_params, _X, _Y)[0]\ndef _numerico(A, h=1e-5):\n    N = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        a = _f()\n        A[i] = v - h\n        b = _f()\n        A[i] = v\n        N[i] = (a - b) / (2 * h)\n    return N\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))", "expr": "[round(_perda, 10)] + [bool(_erro(_g[k], _numerico(_params[k])) < 1e-7) for k in _nomes]", "expected": [1.9880731823, true, true, true, true, true], "name": "Com bloco 1 e d = 3, a perda e os cinco gradientes continuam certos", "hint": "Não fixe bloco nem d no código: tire as formas de X e de C."},
  {"id": "referencia-21-3-8-64", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(7)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_V, _bloco, _d, _H, _n = 21, 3, 8, 64, 32\n_params = {\"C\": _rng.normal(0, 1, (_V, _d)), \"W1\": _rng.normal(0, 0.3, (_bloco * _d, _H)), \"b1\": _rng.normal(0, 0.1, _H), \"W2\": _rng.normal(0, 0.3, (_H, _V)), \"b2\": _rng.normal(0, 0.1, _V)}\n_X = _rng.integers(0, _V, (_n, _bloco))\n_Y = _rng.integers(0, _V, _n)\ndef _ref(p, X, Y):\n    n, bloco = X.shape\n    V = p[\"C\"].shape[0]\n    U = np.zeros((n, bloco, V))\n    for i in range(n):\n        for j in range(bloco):\n            U[i, j, X[i, j]] = 1.0\n    A0 = np.concatenate([U[:, j] @ p[\"C\"] for j in range(bloco)], axis=1)\n    A1 = np.tanh(A0 @ p[\"W1\"] + p[\"b1\"])\n    Z = A1 @ p[\"W2\"] + p[\"b2\"]\n    E = np.exp(Z - Z.max(axis=1, keepdims=True))\n    P = E / E.sum(axis=1, keepdims=True)\n    T = np.zeros_like(P)\n    T[np.arange(n), Y] = 1.0\n    perda = float(-(T * np.log(P)).sum() / n)\n    D2 = (P - T) / n\n    D1 = (D2 @ p[\"W2\"].T) * (1.0 - A1 * A1)\n    D0 = D1 @ p[\"W1\"].T\n    d = p[\"C\"].shape[1]\n    dC = sum(U[:, j].T @ D0[:, j * d:(j + 1) * d] for j in range(bloco))\n    return perda, {\"C\": dC, \"W1\": A0.T @ D1, \"b1\": D1.sum(axis=0), \"W2\": A1.T @ D2, \"b2\": D2.sum(axis=0)}\n_pr, _gr = _ref(_params, _X, _Y)\n_perda, _g = perda_e_gradientes_lm(_params, _X, _Y)", "expr": "[bool(abs(_perda - _pr) < 1e-12)] + [bool(np.allclose(_g[k], _gr[k], atol=1e-12)) for k in _nomes]", "expected": [true, true, true, true, true, true], "name": "Rede do tamanho da lição (V = 21, bloco 3, d = 8, 64 unidades, 32 exemplos): perda e gradientes iguais aos da referência", "hint": "A referência usa one-hot e concatena as posições do contexto na ordem. O primeiro booleano é a perda; os outros, C, W1, b1, W2, b2."},
  {"id": "params-intactos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (5, 2)), \"W1\": _rng.normal(0, 1, (4, 3)), \"b1\": _rng.normal(0, 1, 3), \"W2\": _rng.normal(0, 1, (3, 5)), \"b2\": _rng.normal(0, 1, 5)}\n_X = np.array([[0, 0], [0, 1], [1, 3], [3, 1], [1, 1], [0, 3]])\n_Y = np.array([1, 3, 1, 1, 0, 4])\n_copias = {k: v.copy() for k, v in _params.items()}\n_Xc, _Yc = _X.copy(), _Y.copy()\n_perda, _g = perda_e_gradientes_lm(_params, _X, _Y)", "expr": "[all(bool(np.array_equal(_params[k], _copias[k])) for k in _nomes), bool(np.array_equal(_X, _Xc)), bool(np.array_equal(_Y, _Yc))]", "expected": [true, true, true], "name": "params, X e Y não são alterados"},
  {"id": "perda-cai", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_nomes = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\n_params = {\"C\": _rng.normal(0, 1, (5, 2)), \"W1\": _rng.normal(0, 1, (4, 3)), \"b1\": _rng.normal(0, 1, 3), \"W2\": _rng.normal(0, 1, (3, 5)), \"b2\": _rng.normal(0, 1, 5)}\n_X = np.array([[0, 0], [0, 1], [1, 3], [3, 1], [1, 1], [0, 3]])\n_Y = np.array([1, 3, 1, 1, 0, 4])\n_h = []\nfor _ in range(40):\n    _perda, _g = perda_e_gradientes_lm(_params, _X, _Y)\n    _h.append(_perda)\n    for _k in _nomes:\n        _params[_k] = _params[_k] - 0.5 * _g[_k]\n_h.append(perda_e_gradientes_lm(_params, _X, _Y)[0])", "expr": "[bool(_h[-1] < _h[0] / 2), all(_h[i + 1] < _h[i] for i in range(40))]", "expected": [true, true], "name": "40 passos de descida com os seus gradientes (taxa 0,5) levam a perda a menos da metade", "hint": "A solução leva a perda de 1,74 a 0,22. Se a sua não cai, confira o sinal e a divisão por n."}
]
```

### Soluções erradas

```python name="backward do embedding com indexação direta"
import numpy as np


def perda_e_gradientes_lm(params, X, Y):
    C, W1, b1, W2, b2 = (params[k] for k in ("C", "W1", "b1", "W2", "b2"))
    n = X.shape[0]
    emb = C[X]
    A0 = emb.reshape(n, -1)
    A1 = np.tanh(A0 @ W1 + b1)
    Z = A1 @ W2 + b2
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).mean())

    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ /= n
    dW2 = A1.T @ dZ
    db2 = dZ.sum(axis=0)
    dZ1 = (dZ @ W2.T) * (1.0 - A1 ** 2)
    dW1 = A0.T @ dZ1
    db1 = dZ1.sum(axis=0)
    dA0 = dZ1 @ W1.T
    dC = np.zeros_like(C)
    dC[X] += dA0.reshape(emb.shape)
    return perda, {"C": dC, "W1": dW1, "b1": db1, "W2": dW2, "b2": db2}
```

```python name="sem a derivada da tanh"
import numpy as np


def perda_e_gradientes_lm(params, X, Y):
    C, W1, b1, W2, b2 = (params[k] for k in ("C", "W1", "b1", "W2", "b2"))
    n = X.shape[0]
    emb = C[X]
    A0 = emb.reshape(n, -1)
    A1 = np.tanh(A0 @ W1 + b1)
    Z = A1 @ W2 + b2
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).mean())

    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ /= n
    dW2 = A1.T @ dZ
    db2 = dZ.sum(axis=0)
    dZ1 = dZ @ W2.T
    dW1 = A0.T @ dZ1
    db1 = dZ1.sum(axis=0)
    dA0 = dZ1 @ W1.T
    dC = np.zeros_like(C)
    np.add.at(dC, X, dA0.reshape(emb.shape))
    return perda, {"C": dC, "W1": dW1, "b1": db1, "W2": dW2, "b2": db2}
```

```python name="concatenação com os eixos trocados"
import numpy as np


def perda_e_gradientes_lm(params, X, Y):
    C, W1, b1, W2, b2 = (params[k] for k in ("C", "W1", "b1", "W2", "b2"))
    n = X.shape[0]
    emb = C[X]
    A0 = emb.transpose(1, 0, 2).reshape(n, -1)
    A1 = np.tanh(A0 @ W1 + b1)
    Z = A1 @ W2 + b2
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).mean())

    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ /= n
    dW2 = A1.T @ dZ
    db2 = dZ.sum(axis=0)
    dZ1 = (dZ @ W2.T) * (1.0 - A1 ** 2)
    dW1 = A0.T @ dZ1
    db1 = dZ1.sum(axis=0)
    dA0 = dZ1 @ W1.T
    dC = np.zeros_like(C)
    np.add.at(dC, X, dA0.reshape(emb.shape[1], n, -1).transpose(1, 0, 2))
    return perda, {"C": dC, "W1": dW1, "b1": db1, "W2": dW2, "b2": db2}
```

```python name="gradiente sem dividir por n"
import numpy as np


def perda_e_gradientes_lm(params, X, Y):
    C, W1, b1, W2, b2 = (params[k] for k in ("C", "W1", "b1", "W2", "b2"))
    n = X.shape[0]
    emb = C[X]
    A0 = emb.reshape(n, -1)
    A1 = np.tanh(A0 @ W1 + b1)
    Z = A1 @ W2 + b2
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).mean())

    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ = dZ * 1.0
    dW2 = A1.T @ dZ
    db2 = dZ.sum(axis=0)
    dZ1 = (dZ @ W2.T) * (1.0 - A1 ** 2)
    dW1 = A0.T @ dZ1
    db1 = dZ1.sum(axis=0)
    dA0 = dZ1 @ W1.T
    dC = np.zeros_like(C)
    np.add.at(dC, X, dA0.reshape(emb.shape))
    return perda, {"C": dC, "W1": dW1, "b1": db1, "W2": dW2, "b2": db2}
```

```python name="vieses com a média no lugar da soma"
import numpy as np


def perda_e_gradientes_lm(params, X, Y):
    C, W1, b1, W2, b2 = (params[k] for k in ("C", "W1", "b1", "W2", "b2"))
    n = X.shape[0]
    emb = C[X]
    A0 = emb.reshape(n, -1)
    A1 = np.tanh(A0 @ W1 + b1)
    Z = A1 @ W2 + b2
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).mean())

    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ /= n
    dW2 = A1.T @ dZ
    db2 = dZ.mean(axis=0)
    dZ1 = (dZ @ W2.T) * (1.0 - A1 ** 2)
    dW1 = A0.T @ dZ1
    db1 = dZ1.mean(axis=0)
    dA0 = dZ1 @ W1.T
    dC = np.zeros_like(C)
    np.add.at(dC, X, dA0.reshape(emb.shape))
    return perda, {"C": dC, "W1": dW1, "b1": db1, "W2": dW2, "b2": db2}
```

```python name="softmax normalizada pelas colunas"
import numpy as np


def perda_e_gradientes_lm(params, X, Y):
    C, W1, b1, W2, b2 = (params[k] for k in ("C", "W1", "b1", "W2", "b2"))
    n = X.shape[0]
    emb = C[X]
    A0 = emb.reshape(n, -1)
    A1 = np.tanh(A0 @ W1 + b1)
    Z = A1 @ W2 + b2
    P = np.exp(Z - Z.max(axis=0, keepdims=True))
    P /= P.sum(axis=0, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).mean())

    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ /= n
    dW2 = A1.T @ dZ
    db2 = dZ.sum(axis=0)
    dZ1 = (dZ @ W2.T) * (1.0 - A1 ** 2)
    dW1 = A0.T @ dZ1
    db1 = dZ1.sum(axis=0)
    dA0 = dZ1 @ W1.T
    dC = np.zeros_like(C)
    np.add.at(dC, X, dA0.reshape(emb.shape))
    return perda, {"C": dC, "W1": dW1, "b1": db1, "W2": dW2, "b2": db2}
```

```python name="gradiente do embedding só da última posição do contexto"
import numpy as np


def perda_e_gradientes_lm(params, X, Y):
    C, W1, b1, W2, b2 = (params[k] for k in ("C", "W1", "b1", "W2", "b2"))
    n = X.shape[0]
    emb = C[X]
    A0 = emb.reshape(n, -1)
    A1 = np.tanh(A0 @ W1 + b1)
    Z = A1 @ W2 + b2
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).mean())

    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ /= n
    dW2 = A1.T @ dZ
    db2 = dZ.sum(axis=0)
    dZ1 = (dZ @ W2.T) * (1.0 - A1 ** 2)
    dW1 = A0.T @ dZ1
    db1 = dZ1.sum(axis=0)
    dA0 = dZ1 @ W1.T
    dC = np.zeros_like(C)
    np.add.at(dC, X[:, -1], dA0.reshape(emb.shape)[:, -1])
    return perda, {"C": dC, "W1": dW1, "b1": db1, "W2": dW2, "b2": db2}
```

```python name="perda somada em vez da média"
import numpy as np


def perda_e_gradientes_lm(params, X, Y):
    C, W1, b1, W2, b2 = (params[k] for k in ("C", "W1", "b1", "W2", "b2"))
    n = X.shape[0]
    emb = C[X]
    A0 = emb.reshape(n, -1)
    A1 = np.tanh(A0 @ W1 + b1)
    Z = A1 @ W2 + b2
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).sum())

    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ /= n
    dW2 = A1.T @ dZ
    db2 = dZ.sum(axis=0)
    dZ1 = (dZ @ W2.T) * (1.0 - A1 ** 2)
    dW1 = A0.T @ dZ1
    db1 = dZ1.sum(axis=0)
    dA0 = dZ1 @ W1.T
    dC = np.zeros_like(C)
    np.add.at(dC, X, dA0.reshape(emb.shape))
    return perda, {"C": dC, "W1": dW1, "b1": db1, "W2": dW2, "b2": db2}
```

## Passo 6 · Leitura · Treino, divisão e a busca da taxa

Com a perda e os gradientes prontos, o treino é o laço de mini-lotes do módulo 3: sortear alguns exemplos, calcular a perda e os gradientes neles, dar um passo.

```python
rng = np.random.default_rng(0)
for _ in range(passos):
    idx = rng.integers(0, X.shape[0], lote)
    perda, grads = perda_e_gradientes_lm(params, X[idx], Y[idx])
    for chave in params:
        params[chave] -= taxa * grads[chave]
```

A **divisão** dos dados é feita por nome, antes de montar os exemplos: 800 nomes para o treino (5 145 exemplos), 100 para a validação (662) e 100 para o teste (637). Dividir os exemplos em vez dos nomes poria pedaços do mesmo nome nos dois lados. A validação escolhe taxa, tamanho e número de passos; o teste é olhado uma vez, no fim.

Para achar a **taxa**, uma varredura exponencial: 200 passos com cada taxa, partindo dos mesmos pesos, e a média das últimas 20 perdas (rede com $d = 8$ e 64 unidades, lotes de 32):

| taxa | 0,001 | 0,01 | 0,1 | 0,32 | 1 | 3,2 | 10 |
|---|---|---|---|---|---|---|---|
| perda | 3,005 | 2,736 | 2,187 | 2,125 | 2,199 | 13,2 | 34,2 |

Taxas pequenas quase não saem de $\ln 21$; a partir de 3,2 a perda explode. A faixa boa fica logo antes da explosão, entre 0,1 e 0,3, e a busca fina só vale a pena dentro dela.

O tamanho da rede se escolhe do mesmo jeito, pela validação. Medido com taxa 0,1 e lotes de 32:

| rede | passos | treino | validação |
|---|---|---|---|
| bigrama por contagem | | 2,1203 | 2,1250 |
| $d = 2$, 32 unidades (959 parâmetros) | 3 000 | 2,0608 | 2,0621 |
| $d = 8$, 64 unidades (3 133 parâmetros) | 3 000 | 2,0059 | 2,1115 |
| $d = 8$, 64 unidades | 10 000 | 1,8882 | 2,2339 |

A rede pequena passa do bigrama na validação. A grande tem o melhor treino e a pior validação: com 800 nomes, ela decora. No teste, a rede pequena fica em $2{,}1177$.

O treino também organiza a tabela. Na rede com $d = 2$, as cinco vogais terminam com a segunda coordenada entre $-1{,}17$ e $-1{,}01$, e todas as consoantes, entre $0{,}25$ e $1{,}87$; o cosseno entre duas vogais quaisquer é pelo menos $0{,}99$. Ninguém disse ao modelo o que é uma vogal: como os nomes alternam consoante e vogal, tratar as vogais do mesmo jeito reduz a perda, e o gradiente as aproximou.

## Passo 7 · Exercício · Treinar e amostrar

O arquivo `modelo.py` traz o que você já escreveu (`montar_dados`, `perda_e_gradientes_lm`) e mais duas funções: `iniciar_params(V, bloco, d, H, semente)`, que sorteia os parâmetros com logits pequenos, e `probabilidades_lm(params, X)`, que devolve as probabilidades do próximo caractere, de forma `(n, V)`. O bloco no fim do código treina nos nomes quando você clica em "Executar". Ele vem com 200 passos, porque esse bloco também roda em cada caso da correção: para ver o treino completo, troque 200 por 3000, execute (leva alguns segundos) e volte a 200 antes de enviar.

### Instruções

1. Escreva `treinar_lm(params, X, Y, passos, lote, taxa, semente)`. Crie `rng = np.random.default_rng(semente)` **uma vez**. Em cada passo, sorteie os índices do lote com `rng.integers(0, n, lote)`, com `n` o número de exemplos, calcule a perda e os gradientes só nesses exemplos e guarde a perda em `historico`.
2. Ainda em cada passo, atualize **no lugar** todos os arrays de `params`: `params[chave] -= taxa * grads[chave]`. Devolva `historico`, uma lista com um `float` por passo.
3. Escreva `amostrar_lm(params, itos, bloco, rng, n)`: devolva uma lista de `n` nomes. Cada nome começa com o contexto de `bloco` índices 0; a cada caractere, calcule as probabilidades do contexto atual com `probabilidades_lm` e faça **um** sorteio `rng.choice(V, p=p)`; se sair 0, o nome acabou (o `.` não entra no nome); senão, acrescente o caractere e deslize o contexto.

### Código inicial

```python
import numpy as np

from modelo import (carregar_nomes, construir_vocabulario, iniciar_params, montar_dados,
                    perda_e_gradientes_lm, probabilidades_lm)


def treinar_lm(params, X, Y, passos, lote, taxa, semente):
    pass


def amostrar_lm(params, itos, bloco, rng, n):
    pass


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    bloco = 3
    X, Y = montar_dados(treino, bloco, stoi)
    Xv, Yv = montar_dados(validacao, bloco, stoi)
    params = iniciar_params(len(itos), bloco, 2, 32, 0)
    historico = treinar_lm(params, X, Y, 200, 32, 0.1, 0)  # 3000 para o treino completo
    print("perda no primeiro lote:", round(historico[0], 4))
    print("NLL de treino:", round(perda_e_gradientes_lm(params, X, Y)[0], 4))
    print("NLL de validação:", round(perda_e_gradientes_lm(params, Xv, Yv)[0], 4))
    print(amostrar_lm(params, itos, bloco, np.random.default_rng(0), 8))
```

```python path=modelo.py
import numpy as np


def carregar_nomes(caminho="nomes.txt"):
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.read().split()


def construir_vocabulario(textos):
    itos = ["."] + sorted(set("".join(textos)) - {"."})
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = [0] * bloco
        for c in nome + ".":
            X.append(contexto)
            Y.append(stoi[c])
            contexto = contexto[1:] + [stoi[c]]
    return np.array(X), np.array(Y)


def iniciar_params(V, bloco, d, H, semente):
    rng = np.random.default_rng(semente)
    return {
        "C": rng.normal(0, 1, (V, d)),
        "W1": rng.normal(0, 1, (bloco * d, H)) / np.sqrt(bloco * d),
        "b1": np.zeros(H),
        "W2": rng.normal(0, 1, (H, V)) * 0.01,
        "b2": np.zeros(V),
    }


def probabilidades_lm(params, X):
    n = X.shape[0]
    A0 = params["C"][X].reshape(n, -1)
    A1 = np.tanh(A0 @ params["W1"] + params["b1"])
    Z = A1 @ params["W2"] + params["b2"]
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    return P / P.sum(axis=1, keepdims=True)


def perda_e_gradientes_lm(params, X, Y):
    n = X.shape[0]
    emb = params["C"][X]
    A0 = emb.reshape(n, -1)
    A1 = np.tanh(A0 @ params["W1"] + params["b1"])
    Z = A1 @ params["W2"] + params["b2"]
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).mean())
    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ /= n
    dZ1 = (dZ @ params["W2"].T) * (1.0 - A1 ** 2)
    dA0 = dZ1 @ params["W1"].T
    dC = np.zeros_like(params["C"])
    np.add.at(dC, X, dA0.reshape(emb.shape))
    grads = {"C": dC, "W1": A0.T @ dZ1, "b1": dZ1.sum(axis=0), "W2": A1.T @ dZ, "b2": dZ.sum(axis=0)}
    return perda, grads
```

```text path=nomes.txt
efedi
nilema
vitupa
ebara
mine
nanuta
itinar
rate
nufo
zasa
salamam
otere
lele
nalo
cipe
areta
falina
nolado
acoteni
jige
rabora
nale
cecene
itata
jitilur
fitage
liviba
saracu
imeradi
pama
sodomer
olifi
geda
juleri
jepome
vonare
tomo
mevala
tosadi
vera
lage
oderer
bise
nisi
rase
tive
repube
nefitam
mibala
lade
mimeci
gabame
sisu
cemagan
nibema
notar
migili
dimo
icora
paca
icate
terelus
gipota
simo
icevede
remogul
gane
doreda
avabe
sepolan
rerore
nipatim
asapi
vajo
evamuve
sive
manada
lisa
elasa
molis
tateba
rigo
namami
igejido
lare
ocaba
devi
madan
divu
toni
lelala
bateda
mare
todire
cevase
todenal
leso
sipaces
merate
evera
negitil
nose
gode
emarare
momisil
vece
neso
biril
seliri
noromi
mazalum
agepoca
lacemu
nilara
duvomi
vesapi
sisado
luti
ejusapa
taril
odapanel
tobi
eramefa
esafesam
papi
nido
nave
idina
lerebum
jenen
beluli
tece
lano
nimeje
penam
maruga
lave
mino
rivi
icasita
loma
dedo
ulemeja
roce
masu
cogava
daje
cise
lale
baca
mazili
meli
etamo
mofer
apusa
teso
vatita
telil
donilo
namofu
boma
ecesan
lifivi
cepa
madire
diba
dana
levita
lora
vetimir
dobe
domi
pesatas
fane
nepo
erigi
sodo
nade
tije
banaso
tasa
roloci
giti
emele
dari
afesota
sunagol
asatara
ajesenor
maneri
sirela
vinebe
tejaca
nojida
sopa
jalasis
nacaca
ilani
nevijem
inemape
mani
besemar
nilu
lirema
zonoti
nivel
damir
fazide
nicen
edeniros
elabava
lava
bara
mena
javelal
sebenan
rete
asefaje
pesi
mezo
amope
taces
lepane
tedebir
atita
alocini
acacetu
mazabe
enile
roze
darara
cesa
abatime
bovore
bicavus
letar
asacipel
vesa
degacur
janasi
rilino
mesife
jane
rudege
nulata
micanam
lozera
romapa
ceci
zitises
emosam
lasoden
igaceza
lilel
jefu
ronave
vaje
muza
ramapa
ilagon
tima
samal
majanes
fore
labi
vuros
laro
pana
pifoga
bibipa
meco
motes
taje
lica
enanica
bavaman
gasolir
jerel
nedi
ajepo
doro
batiri
jenide
lotifu
cote
acolas
bile
rufarom
moma
otelasa
loleco
meve
mosasa
padede
jofo
tirice
marale
vace
dene
vadel
mage
lesi
rasi
volani
lomefin
binani
tenefi
cina
riram
palenun
tamava
citone
minos
magada
atemavin
milici
gamece
nemo
iretimo
vili
serara
gedar
seta
geresi
laramo
fivi
deravas
nager
naro
emupevu
riso
foteras
mufani
asileta
joli
cepal
bajale
bucalam
nena
aruvo
loramem
mero
zamom
loves
corone
degoten
elitaves
terovis
ranama
samipa
rofiro
orisujim
sital
nafem
geneme
line
ranipo
rebem
gosi
naveme
nera
rila
remamu
cedimo
emafam
miral
dolozis
tani
lalamas
nemafa
turovi
lonen
leveta
sanete
tici
deni
nige
runebe
molica
cide
cilane
pemel
sesemo
bura
gana
mojavom
ecagu
geman
tela
mece
resi
tina
jiti
pamom
jiji
pasecas
rapa
neno
codere
mivel
viza
afase
raname
dede
sini
ereli
pabilil
afacemi
tesodis
alerene
roreva
catam
papeges
lela
sarur
jicira
delil
zalo
veto
vomiso
jolegi
saseje
vifeje
agara
jabi
rara
sepevo
mone
mevama
mifolo
adona
bogere
ribo
imenaros
geso
delape
vasa
misa
amage
ariteca
dizina
ocaleba
bojime
cenar
catiga
olaciji
lemiga
osete
acejucal
peta
rigaro
vena
nolili
menoga
mami
zanim
savuga
rabe
alajam
lalima
naru
regera
upase
aromun
muja
bozi
milale
omimive
jina
amale
joname
nozatu
dite
abumebe
atasen
capam
bete
acali
jipan
taconi
teroce
ivaga
rimu
lomimam
averiras
cobe
narudas
abonir
limepa
tatida
suci
odolala
pefo
natel
noceti
rarelan
jeto
gofi
madi
irarima
vilogul
rotar
napoda
sevoto
dibira
nide
dafive
araseri
nofe
mozoram
utimis
ejoligi
belacam
fomo
manitir
dacices
opoda
alaren
gemos
memele
mitin
ogopese
mireco
amefuti
raso
efadera
tuva
asedaco
tidoba
sita
efosa
nelesi
ceja
lurale
ponono
olone
cabafi
para
tedire
emasago
reli
ripin
rajo
nifa
vemo
tetife
mivaco
bere
rale
navogos
faladis
eteci
ragaco
lena
jisube
mopeso
efemafo
doladin
vani
rafigi
sovinal
gani
lisemam
mira
rajera
egupoti
nafamam
redora
ralapo
iseniro
genene
muriti
divama
narel
ecezonan
tasata
riro
epecan
leral
taligo
nana
tanema
mejara
tera
famapo
evetata
semom
sofema
rapasis
fanuta
zodena
lema
rotu
dopa
gafe
leragel
rala
mima
jora
muvi
fefa
mabimi
zanun
emutama
lebeni
adize
zolal
ezepa
jaren
marena
vepa
lifisa
ubamilem
rego
bomafu
ranaba
ditice
masosa
sobima
otelana
loge
leba
nerur
repato
seca
atamuta
dipici
vara
zabasim
dolal
rebis
imagen
meruras
cazelo
tasare
gomil
nisas
momoge
ilicaco
nalon
tovalim
dicore
vovotu
omipil
lari
baverim
tala
polavam
turanol
sodaja
lana
jala
larame
inidor
baga
lusapo
toribe
varonel
afeno
nitar
nite
jamago
jaba
somemo
zaba
ninade
oraco
iletenir
radi
bane
caterer
navi
ucigimum
nela
itele
itefa
ulano
ubara
atisege
asaro
pural
etemeju
pasama
ideme
maponol
fege
tipeder
epajare
jecel
rapaci
rena
volel
pisula
ipitis
samas
mamim
rarace
levo
casiga
jodomi
seli
volom
reri
nilige
gadin
lasiti
biran
etane
nalate
dapa
etena
rutadol
mapa
maro
nala
lata
idadin
jime
dimi
sutesi
nelelo
cevare
gotuba
telusa
efoco
tacedi
riru
aredipa
telesi
omafi
temon
nizo
tilepi
ebelate
seci
nafe
rinere
tesono
sanata
firavu
gima
tami
tomam
dafafe
dalevo
dasasa
lila
itaroren
obimo
cepede
mimile
rava
febelal
resolas
acarano
dolas
niram
icaluse
radan
alinaca
tazalam
tanodi
ibive
mita
tigadal
binama
nedeli
napele
erapes
senora
ralo
titi
lerin
dovilo
ejova
anita
jetames
dane
sinil
balera
razalos
ligedo
emadir
leli
ceziro
adezeta
beve
arorome
nogamol
gezi
erani
sina
cule
dipana
zalarer
midar
lice
atami
eciladi
socesi
bapi
asari
rocuca
ateremi
ricor
odosa
razifi
isodapa
pocem
come
nonace
navater
nidi
narir
pagata
dabato
imamel
neginir
alova
golapa
conamo
mavaci
lemago
onorana
unacila
ludase
casoti
nememi
nutome
metas
sobelu
madabe
meca
evemalo
aloma
elafebo
nisilil
tejiti
label
dose
seri
rirale
satebil
lipese
avocisi
romen
ranorar
ralel
mededor
lalatar
rebe
zepana
nenasa
aparara
selem
mirim
dedipo
rule
fene
nopa
rovan
acame
cila
emevana
larer
coti
dime
mafi
pideso
metem
toril
patedi
badom
niracin
lepa
bopice
agitole
latemi
fomi
misam
sarase
caseja
osamajer
camica
milal
adado
mafara
baleli
lire
afene
ladosi
raja
moraca
tiralo
nuresol
narede
emana
neceva
bidote
alasene
cipa
odiso
ufilu
erone
sate
ereleti
sozasu
neman
meri
pafager
nivi
ajolanom
dirida
fifa
nure
visumu
tatori
vazo
dosi
gami
nupune
tidur
iredace
sajedem
cacavom
segedim
laji
roseril
erogil
tapa
ticire
etinel
gamena
molal
daro
sisi
faner
tase
gara
demera
ragi
talenu
time
linim
gebegel
ileve
ebefaso
neme
oretu
etalame
nema
tegor
dariga
mivil
ananezu
adaram
caci
sivabi
ture
janon
rine
cemas
rupa
sevi
duje
pafide
bisebi
cira
tadota
navoca
niseno
nidoger
repi
gare
locutus
babele
ride
leseva
egamiru
izugan
rofanor
odile
mabeba
veras
nivafi
gavemi
mana
bavinar
ecuba
tatoma
sipate
nobo
noda
libelo
mujano
pitos
icolevo
bicesu
magasa
cedaca
```

### Solução

```python
import numpy as np

from modelo import (carregar_nomes, construir_vocabulario, iniciar_params, montar_dados,
                    perda_e_gradientes_lm, probabilidades_lm)


def treinar_lm(params, X, Y, passos, lote, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for _ in range(passos):
        idx = rng.integers(0, X.shape[0], lote)
        perda, grads = perda_e_gradientes_lm(params, X[idx], Y[idx])
        for chave in params:
            params[chave] -= taxa * grads[chave]
        historico.append(perda)
    return historico


def amostrar_lm(params, itos, bloco, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        contexto, nome = [0] * bloco, ""
        while True:
            p = probabilidades_lm(params, np.array([contexto]))[0]
            i = int(rng.choice(V, p=p))
            if i == 0:
                break
            nome += itos[i]
            contexto = contexto[1:] + [i]
        nomes.append(nome)
    return nomes


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    bloco = 3
    X, Y = montar_dados(treino, bloco, stoi)
    Xv, Yv = montar_dados(validacao, bloco, stoi)
    params = iniciar_params(len(itos), bloco, 2, 32, 0)
    historico = treinar_lm(params, X, Y, 200, 32, 0.1, 0)  # 3000 para o treino completo
    print("perda no primeiro lote:", round(historico[0], 4))
    print("NLL de treino:", round(perda_e_gradientes_lm(params, X, Y)[0], 4))
    print("NLL de validação:", round(perda_e_gradientes_lm(params, Xv, Yv)[0], 4))
    print(amostrar_lm(params, itos, bloco, np.random.default_rng(0), 8))
```

```python path=modelo.py
import numpy as np


def carregar_nomes(caminho="nomes.txt"):
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.read().split()


def construir_vocabulario(textos):
    itos = ["."] + sorted(set("".join(textos)) - {"."})
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def montar_dados(nomes, bloco, stoi):
    X, Y = [], []
    for nome in nomes:
        contexto = [0] * bloco
        for c in nome + ".":
            X.append(contexto)
            Y.append(stoi[c])
            contexto = contexto[1:] + [stoi[c]]
    return np.array(X), np.array(Y)


def iniciar_params(V, bloco, d, H, semente):
    rng = np.random.default_rng(semente)
    return {
        "C": rng.normal(0, 1, (V, d)),
        "W1": rng.normal(0, 1, (bloco * d, H)) / np.sqrt(bloco * d),
        "b1": np.zeros(H),
        "W2": rng.normal(0, 1, (H, V)) * 0.01,
        "b2": np.zeros(V),
    }


def probabilidades_lm(params, X):
    n = X.shape[0]
    A0 = params["C"][X].reshape(n, -1)
    A1 = np.tanh(A0 @ params["W1"] + params["b1"])
    Z = A1 @ params["W2"] + params["b2"]
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    return P / P.sum(axis=1, keepdims=True)


def perda_e_gradientes_lm(params, X, Y):
    n = X.shape[0]
    emb = params["C"][X]
    A0 = emb.reshape(n, -1)
    A1 = np.tanh(A0 @ params["W1"] + params["b1"])
    Z = A1 @ params["W2"] + params["b2"]
    P = np.exp(Z - Z.max(axis=1, keepdims=True))
    P /= P.sum(axis=1, keepdims=True)
    perda = float(-np.log(P[np.arange(n), Y]).mean())
    dZ = P.copy()
    dZ[np.arange(n), Y] -= 1.0
    dZ /= n
    dZ1 = (dZ @ params["W2"].T) * (1.0 - A1 ** 2)
    dA0 = dZ1 @ params["W1"].T
    dC = np.zeros_like(params["C"])
    np.add.at(dC, X, dA0.reshape(emb.shape))
    grads = {"C": dC, "W1": A0.T @ dZ1, "b1": dZ1.sum(axis=0), "W2": A1.T @ dZ, "b2": dZ.sum(axis=0)}
    return perda, grads
```

```text path=nomes.txt
efedi
nilema
vitupa
ebara
mine
nanuta
itinar
rate
nufo
zasa
salamam
otere
lele
nalo
cipe
areta
falina
nolado
acoteni
jige
rabora
nale
cecene
itata
jitilur
fitage
liviba
saracu
imeradi
pama
sodomer
olifi
geda
juleri
jepome
vonare
tomo
mevala
tosadi
vera
lage
oderer
bise
nisi
rase
tive
repube
nefitam
mibala
lade
mimeci
gabame
sisu
cemagan
nibema
notar
migili
dimo
icora
paca
icate
terelus
gipota
simo
icevede
remogul
gane
doreda
avabe
sepolan
rerore
nipatim
asapi
vajo
evamuve
sive
manada
lisa
elasa
molis
tateba
rigo
namami
igejido
lare
ocaba
devi
madan
divu
toni
lelala
bateda
mare
todire
cevase
todenal
leso
sipaces
merate
evera
negitil
nose
gode
emarare
momisil
vece
neso
biril
seliri
noromi
mazalum
agepoca
lacemu
nilara
duvomi
vesapi
sisado
luti
ejusapa
taril
odapanel
tobi
eramefa
esafesam
papi
nido
nave
idina
lerebum
jenen
beluli
tece
lano
nimeje
penam
maruga
lave
mino
rivi
icasita
loma
dedo
ulemeja
roce
masu
cogava
daje
cise
lale
baca
mazili
meli
etamo
mofer
apusa
teso
vatita
telil
donilo
namofu
boma
ecesan
lifivi
cepa
madire
diba
dana
levita
lora
vetimir
dobe
domi
pesatas
fane
nepo
erigi
sodo
nade
tije
banaso
tasa
roloci
giti
emele
dari
afesota
sunagol
asatara
ajesenor
maneri
sirela
vinebe
tejaca
nojida
sopa
jalasis
nacaca
ilani
nevijem
inemape
mani
besemar
nilu
lirema
zonoti
nivel
damir
fazide
nicen
edeniros
elabava
lava
bara
mena
javelal
sebenan
rete
asefaje
pesi
mezo
amope
taces
lepane
tedebir
atita
alocini
acacetu
mazabe
enile
roze
darara
cesa
abatime
bovore
bicavus
letar
asacipel
vesa
degacur
janasi
rilino
mesife
jane
rudege
nulata
micanam
lozera
romapa
ceci
zitises
emosam
lasoden
igaceza
lilel
jefu
ronave
vaje
muza
ramapa
ilagon
tima
samal
majanes
fore
labi
vuros
laro
pana
pifoga
bibipa
meco
motes
taje
lica
enanica
bavaman
gasolir
jerel
nedi
ajepo
doro
batiri
jenide
lotifu
cote
acolas
bile
rufarom
moma
otelasa
loleco
meve
mosasa
padede
jofo
tirice
marale
vace
dene
vadel
mage
lesi
rasi
volani
lomefin
binani
tenefi
cina
riram
palenun
tamava
citone
minos
magada
atemavin
milici
gamece
nemo
iretimo
vili
serara
gedar
seta
geresi
laramo
fivi
deravas
nager
naro
emupevu
riso
foteras
mufani
asileta
joli
cepal
bajale
bucalam
nena
aruvo
loramem
mero
zamom
loves
corone
degoten
elitaves
terovis
ranama
samipa
rofiro
orisujim
sital
nafem
geneme
line
ranipo
rebem
gosi
naveme
nera
rila
remamu
cedimo
emafam
miral
dolozis
tani
lalamas
nemafa
turovi
lonen
leveta
sanete
tici
deni
nige
runebe
molica
cide
cilane
pemel
sesemo
bura
gana
mojavom
ecagu
geman
tela
mece
resi
tina
jiti
pamom
jiji
pasecas
rapa
neno
codere
mivel
viza
afase
raname
dede
sini
ereli
pabilil
afacemi
tesodis
alerene
roreva
catam
papeges
lela
sarur
jicira
delil
zalo
veto
vomiso
jolegi
saseje
vifeje
agara
jabi
rara
sepevo
mone
mevama
mifolo
adona
bogere
ribo
imenaros
geso
delape
vasa
misa
amage
ariteca
dizina
ocaleba
bojime
cenar
catiga
olaciji
lemiga
osete
acejucal
peta
rigaro
vena
nolili
menoga
mami
zanim
savuga
rabe
alajam
lalima
naru
regera
upase
aromun
muja
bozi
milale
omimive
jina
amale
joname
nozatu
dite
abumebe
atasen
capam
bete
acali
jipan
taconi
teroce
ivaga
rimu
lomimam
averiras
cobe
narudas
abonir
limepa
tatida
suci
odolala
pefo
natel
noceti
rarelan
jeto
gofi
madi
irarima
vilogul
rotar
napoda
sevoto
dibira
nide
dafive
araseri
nofe
mozoram
utimis
ejoligi
belacam
fomo
manitir
dacices
opoda
alaren
gemos
memele
mitin
ogopese
mireco
amefuti
raso
efadera
tuva
asedaco
tidoba
sita
efosa
nelesi
ceja
lurale
ponono
olone
cabafi
para
tedire
emasago
reli
ripin
rajo
nifa
vemo
tetife
mivaco
bere
rale
navogos
faladis
eteci
ragaco
lena
jisube
mopeso
efemafo
doladin
vani
rafigi
sovinal
gani
lisemam
mira
rajera
egupoti
nafamam
redora
ralapo
iseniro
genene
muriti
divama
narel
ecezonan
tasata
riro
epecan
leral
taligo
nana
tanema
mejara
tera
famapo
evetata
semom
sofema
rapasis
fanuta
zodena
lema
rotu
dopa
gafe
leragel
rala
mima
jora
muvi
fefa
mabimi
zanun
emutama
lebeni
adize
zolal
ezepa
jaren
marena
vepa
lifisa
ubamilem
rego
bomafu
ranaba
ditice
masosa
sobima
otelana
loge
leba
nerur
repato
seca
atamuta
dipici
vara
zabasim
dolal
rebis
imagen
meruras
cazelo
tasare
gomil
nisas
momoge
ilicaco
nalon
tovalim
dicore
vovotu
omipil
lari
baverim
tala
polavam
turanol
sodaja
lana
jala
larame
inidor
baga
lusapo
toribe
varonel
afeno
nitar
nite
jamago
jaba
somemo
zaba
ninade
oraco
iletenir
radi
bane
caterer
navi
ucigimum
nela
itele
itefa
ulano
ubara
atisege
asaro
pural
etemeju
pasama
ideme
maponol
fege
tipeder
epajare
jecel
rapaci
rena
volel
pisula
ipitis
samas
mamim
rarace
levo
casiga
jodomi
seli
volom
reri
nilige
gadin
lasiti
biran
etane
nalate
dapa
etena
rutadol
mapa
maro
nala
lata
idadin
jime
dimi
sutesi
nelelo
cevare
gotuba
telusa
efoco
tacedi
riru
aredipa
telesi
omafi
temon
nizo
tilepi
ebelate
seci
nafe
rinere
tesono
sanata
firavu
gima
tami
tomam
dafafe
dalevo
dasasa
lila
itaroren
obimo
cepede
mimile
rava
febelal
resolas
acarano
dolas
niram
icaluse
radan
alinaca
tazalam
tanodi
ibive
mita
tigadal
binama
nedeli
napele
erapes
senora
ralo
titi
lerin
dovilo
ejova
anita
jetames
dane
sinil
balera
razalos
ligedo
emadir
leli
ceziro
adezeta
beve
arorome
nogamol
gezi
erani
sina
cule
dipana
zalarer
midar
lice
atami
eciladi
socesi
bapi
asari
rocuca
ateremi
ricor
odosa
razifi
isodapa
pocem
come
nonace
navater
nidi
narir
pagata
dabato
imamel
neginir
alova
golapa
conamo
mavaci
lemago
onorana
unacila
ludase
casoti
nememi
nutome
metas
sobelu
madabe
meca
evemalo
aloma
elafebo
nisilil
tejiti
label
dose
seri
rirale
satebil
lipese
avocisi
romen
ranorar
ralel
mededor
lalatar
rebe
zepana
nenasa
aparara
selem
mirim
dedipo
rule
fene
nopa
rovan
acame
cila
emevana
larer
coti
dime
mafi
pideso
metem
toril
patedi
badom
niracin
lepa
bopice
agitole
latemi
fomi
misam
sarase
caseja
osamajer
camica
milal
adado
mafara
baleli
lire
afene
ladosi
raja
moraca
tiralo
nuresol
narede
emana
neceva
bidote
alasene
cipa
odiso
ufilu
erone
sate
ereleti
sozasu
neman
meri
pafager
nivi
ajolanom
dirida
fifa
nure
visumu
tatori
vazo
dosi
gami
nupune
tidur
iredace
sajedem
cacavom
segedim
laji
roseril
erogil
tapa
ticire
etinel
gamena
molal
daro
sisi
faner
tase
gara
demera
ragi
talenu
time
linim
gebegel
ileve
ebefaso
neme
oretu
etalame
nema
tegor
dariga
mivil
ananezu
adaram
caci
sivabi
ture
janon
rine
cemas
rupa
sevi
duje
pafide
bisebi
cira
tadota
navoca
niseno
nidoger
repi
gare
locutus
babele
ride
leseva
egamiru
izugan
rofanor
odile
mabeba
veras
nivafi
gavemi
mana
bavinar
ecuba
tatoma
sipate
nobo
noda
libelo
mujano
pitos
icolevo
bicesu
magasa
cedaca
```

### Dicas

1. `X[idx]` e `Y[idx]` selecionam o lote; índices repetidos no mesmo lote não são problema.
2. `probabilidades_lm` espera um array de forma `(1, bloco)` para um contexto só: `np.array([contexto])`, e a linha 0 da resposta.
3. O contexto da amostragem desliza como em `montar_dados`: sai o mais antigo, entra o índice sorteado.

### Verificação

```json
[
  {"id": "historico-tres-passos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom modelo import iniciar_params, montar_dados, perda_e_gradientes_lm\n_itos = [\".\", \"a\", \"b\", \"c\", \"d\"]\n_stoi = {c: i for i, c in enumerate(_itos)}\n_X, _Y = montar_dados([\"abca\", \"dab\", \"cada\", \"bd\"], 2, _stoi)\n_chaves = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\ndef _novos(bloco=2, semente=3):\n    return iniciar_params(5, bloco, 2, 4, semente)", "expr": "treinar_lm(_novos(), _X, _Y, 3, 4, 0.5, 0)", "expected": [1.615258164952075, 1.6237701094065526, 1.6531005013173197], "tolerance": 1e-10, "name": "Três passos com lotes de 4, taxa 0,5 e semente 0: as três perdas", "hint": "Um rng.integers(0, n, lote) por passo, com o gerador criado antes do laço; a perda guardada é a do lote, antes da atualização."},
  {"id": "pesos-dois-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom modelo import iniciar_params, montar_dados, perda_e_gradientes_lm\n_itos = [\".\", \"a\", \"b\", \"c\", \"d\"]\n_stoi = {c: i for i, c in enumerate(_itos)}\n_X, _Y = montar_dados([\"abca\", \"dab\", \"cada\", \"bd\"], 2, _stoi)\n_chaves = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\ndef _novos(bloco=2, semente=3):\n    return iniciar_params(5, bloco, 2, 4, semente)\n_p = _novos()\n_h = treinar_lm(_p, _X, _Y, 2, 4, 0.5, 0)", "expr": "[_p['C'].tolist(), _p['b2'].tolist()]", "expected": [[[2.028369502313686, -2.561405844770006], [0.4254548922278538, -0.5666213908294155], [-0.4509527964964609, -0.2143793321582052], [-2.0198203895231783, -0.23389016443177327], [-0.8652130762749417, 3.3229995166448827]], [0.034786189441036924, 0.1721782269682333, 0.0346971832005224, -0.18487767462153137, -0.05678392498826122]], "tolerance": 1e-10, "name": "C e b2 depois de dois passos", "hint": "Todos os cinco arrays andam em cada passo: params[chave] -= taxa * grads[chave]."},
  {"id": "atualiza-no-lugar", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom modelo import iniciar_params, montar_dados, perda_e_gradientes_lm\n_itos = [\".\", \"a\", \"b\", \"c\", \"d\"]\n_stoi = {c: i for i, c in enumerate(_itos)}\n_X, _Y = montar_dados([\"abca\", \"dab\", \"cada\", \"bd\"], 2, _stoi)\n_chaves = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\ndef _novos(bloco=2, semente=3):\n    return iniciar_params(5, bloco, 2, 4, semente)\n_p = _novos()\n_antes = {k: v.copy() for k, v in _p.items()}\n_h = treinar_lm(_p, _X, _Y, 5, 4, 0.5, 1)", "expr": "[bool(not np.array_equal(_p[k], _antes[k])) for k in _chaves]", "expected": [true, true, true, true, true], "name": "Os cinco arrays do dicionário recebido mudam com o treino", "hint": "Quem chama usa o mesmo dicionário depois do treino; não treine uma cópia."},
  {"id": "historico-formato", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom modelo import iniciar_params, montar_dados, perda_e_gradientes_lm\n_itos = [\".\", \"a\", \"b\", \"c\", \"d\"]\n_stoi = {c: i for i, c in enumerate(_itos)}\n_X, _Y = montar_dados([\"abca\", \"dab\", \"cada\", \"bd\"], 2, _stoi)\n_chaves = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\ndef _novos(bloco=2, semente=3):\n    return iniciar_params(5, bloco, 2, 4, semente)\n_p = _novos()\n_ha = treinar_lm(_p, _X, _Y, 7, 3, 0.1, 0)\n_q = _novos()\n_hb = treinar_lm(_q, _X, _Y, 0, 3, 0.1, 0)", "expr": "[len(_ha), all(type(v) is float for v in _ha), _hb, bool(np.array_equal(_q['W1'], _novos()['W1']))]", "expected": [7, true, [], true], "name": "historico tem um float por passo; com 0 passos, lista vazia e pesos intactos"},
  {"id": "sementes", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom modelo import iniciar_params, montar_dados, perda_e_gradientes_lm\n_itos = [\".\", \"a\", \"b\", \"c\", \"d\"]\n_stoi = {c: i for i, c in enumerate(_itos)}\n_X, _Y = montar_dados([\"abca\", \"dab\", \"cada\", \"bd\"], 2, _stoi)\n_chaves = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\ndef _novos(bloco=2, semente=3):\n    return iniciar_params(5, bloco, 2, 4, semente)\n_ha = treinar_lm(_novos(), _X, _Y, 6, 4, 0.5, 5)\n_hb = treinar_lm(_novos(), _X, _Y, 6, 4, 0.5, 5)\n_hc = treinar_lm(_novos(), _X, _Y, 6, 4, 0.5, 6)", "expr": "[_ha == _hb, _ha != _hc]", "expected": [true, true], "name": "A mesma semente repete o histórico; outra semente sorteia outros lotes"},
  {"id": "lotes-diferentes", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom modelo import iniciar_params, montar_dados, perda_e_gradientes_lm\n_itos = [\".\", \"a\", \"b\", \"c\", \"d\"]\n_stoi = {c: i for i, c in enumerate(_itos)}\n_X, _Y = montar_dados([\"abca\", \"dab\", \"cada\", \"bd\"], 2, _stoi)\n_chaves = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\ndef _novos(bloco=2, semente=3):\n    return iniciar_params(5, bloco, 2, 4, semente)\n_h = treinar_lm(_novos(), _X, _Y, 8, 2, 0.0, 0)", "expr": "len(set(round(v, 12) for v in _h)) > 3", "expected": true, "name": "Com taxa 0, as perdas ainda variam de passo para passo, porque cada lote é um sorteio novo", "hint": "Os pesos não mudam com taxa 0; a perda só muda se o lote mudar. Crie o gerador uma vez, fora do laço."},
  {"id": "nomes-cinco-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom modelo import carregar_nomes, construir_vocabulario, iniciar_params, montar_dados, perda_e_gradientes_lm\n_treino = carregar_nomes()[:800]\n_stoi, _itos = construir_vocabulario(_treino)\n_X, _Y = montar_dados(_treino, 3, _stoi)\n_p = iniciar_params(len(_itos), 3, 8, 64, 0)\n_inicial = perda_e_gradientes_lm(_p, _X, _Y)[0]\n_h = treinar_lm(_p, _X, _Y, 5, 16, 0.1, 0)", "expr": "_h", "expected": [3.0445693285757995, 3.0200326723361326, 3.015696279561101, 3.041882375163731, 2.9796359850662], "tolerance": 1e-10, "name": "nomes.txt: cinco passos com lotes de 16, a partir de ln 21"},
  {"id": "nomes-60-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom modelo import carregar_nomes, construir_vocabulario, iniciar_params, montar_dados, perda_e_gradientes_lm\n_treino = carregar_nomes()[:800]\n_stoi, _itos = construir_vocabulario(_treino)\n_X, _Y = montar_dados(_treino, 3, _stoi)\n_p = iniciar_params(len(_itos), 3, 8, 64, 0)\n_inicial = perda_e_gradientes_lm(_p, _X, _Y)[0]\n_h = treinar_lm(_p, _X, _Y, 60, 32, 0.1, 0)\n_final = perda_e_gradientes_lm(_p, _X, _Y)[0]", "expr": "[bool(_final < 2.92), bool(_final < _inicial - 0.1)]", "expected": [true, true], "name": "nomes.txt: 60 passos com lotes de 32 levam a NLL de treino abaixo de 2,92", "hint": "A solução sai de 3,05 e chega a 2,43 nos 5 145 exemplos de treino."},
  {"id": "amostrar-semente-zero", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom modelo import iniciar_params, montar_dados, perda_e_gradientes_lm\n_itos = [\".\", \"a\", \"b\", \"c\", \"d\"]\n_stoi = {c: i for i, c in enumerate(_itos)}\n_X, _Y = montar_dados([\"abca\", \"dab\", \"cada\", \"bd\"], 2, _stoi)\n_chaves = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\ndef _novos(bloco=2, semente=3):\n    return iniciar_params(5, bloco, 2, 4, semente)\n_p = _novos(2, 5)\n_p[\"W2\"] = _p[\"W2\"] * 60", "expr": "amostrar_lm(_p, _itos, 2, np.random.default_rng(0), 6)", "expected": ["ca", "", "ddccbdc", "d", "cadbab", ""], "name": "Seis nomes com default_rng(0) num modelo de bloco 2", "hint": "Um rng.choice(V, p=p) por caractere, com p calculado no contexto atual; o contexto recomeça em [0, 0] a cada nome."},
  {"id": "amostrar-bloco-tres", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom modelo import iniciar_params, montar_dados, perda_e_gradientes_lm\n_itos = [\".\", \"a\", \"b\", \"c\", \"d\"]\n_stoi = {c: i for i, c in enumerate(_itos)}\n_X, _Y = montar_dados([\"abca\", \"dab\", \"cada\", \"bd\"], 2, _stoi)\n_chaves = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\ndef _novos(bloco=2, semente=3):\n    return iniciar_params(5, bloco, 2, 4, semente)\n_p = _novos(3, 4)\n_p[\"W2\"] = _p[\"W2\"] * 60", "expr": "amostrar_lm(_p, _itos, 3, np.random.default_rng(1), 6)", "expected": ["bd", "daccac", "cbadab", "baacabddbba", "db", "bbbd"], "name": "Seis nomes com default_rng(1) num modelo de bloco 3", "hint": "O contexto tem sempre bloco índices: sai o mais antigo, entra o sorteado."},
  {"id": "amostrar-sementes", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom modelo import iniciar_params, montar_dados, perda_e_gradientes_lm\n_itos = [\".\", \"a\", \"b\", \"c\", \"d\"]\n_stoi = {c: i for i, c in enumerate(_itos)}\n_X, _Y = montar_dados([\"abca\", \"dab\", \"cada\", \"bd\"], 2, _stoi)\n_chaves = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\ndef _novos(bloco=2, semente=3):\n    return iniciar_params(5, bloco, 2, 4, semente)\n_p = _novos(2, 5)\n_p[\"W2\"] = _p[\"W2\"] * 60\n_a = amostrar_lm(_p, _itos, 2, np.random.default_rng(5), 12)\n_b = amostrar_lm(_p, _itos, 2, np.random.default_rng(5), 12)\n_c = amostrar_lm(_p, _itos, 2, np.random.default_rng(6), 12)", "expr": "[len(_a), _a == _b, _a != _c, len(set(_a)) > 1, any('.' in s for s in _a)]", "expected": [12, true, true, true, false], "name": "12 nomes: mesma semente repete, outra semente muda, os nomes variam e não têm '.'"},
  {"id": "amostrar-nao-altera", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom modelo import iniciar_params, montar_dados, perda_e_gradientes_lm\n_itos = [\".\", \"a\", \"b\", \"c\", \"d\"]\n_stoi = {c: i for i, c in enumerate(_itos)}\n_X, _Y = montar_dados([\"abca\", \"dab\", \"cada\", \"bd\"], 2, _stoi)\n_chaves = [\"C\", \"W1\", \"b1\", \"W2\", \"b2\"]\ndef _novos(bloco=2, semente=3):\n    return iniciar_params(5, bloco, 2, 4, semente)\n_p = _novos(2, 5)\n_p[\"W2\"] = _p[\"W2\"] * 60\n_antes = {k: v.copy() for k, v in _p.items()}\n_a = amostrar_lm(_p, _itos, 2, np.random.default_rng(2), 5)", "expr": "[all(bool(np.array_equal(_p[k], _antes[k])) for k in _chaves), all(type(s) is str for s in _a)]", "expected": [true, true], "name": "Amostrar não altera os parâmetros e devolve strings"}
]
```

### Soluções erradas

```python name="treina sempre no conjunto inteiro"
import numpy as np

from modelo import (carregar_nomes, construir_vocabulario, iniciar_params, montar_dados,
                    perda_e_gradientes_lm, probabilidades_lm)


def treinar_lm(params, X, Y, passos, lote, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for _ in range(passos):
        idx = rng.integers(0, X.shape[0], lote)
        perda, grads = perda_e_gradientes_lm(params, X, Y)
        for chave in params:
            params[chave] -= taxa * grads[chave]
        historico.append(perda)
    return historico


def amostrar_lm(params, itos, bloco, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        contexto, nome = [0] * bloco, ""
        while True:
            p = probabilidades_lm(params, np.array([contexto]))[0]
            i = int(rng.choice(V, p=p))
            if i == 0:
                break
            nome += itos[i]
            contexto = contexto[1:] + [i]
        nomes.append(nome)
    return nomes


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    bloco = 3
    X, Y = montar_dados(treino, bloco, stoi)
    Xv, Yv = montar_dados(validacao, bloco, stoi)
    params = iniciar_params(len(itos), bloco, 2, 32, 0)
    historico = treinar_lm(params, X, Y, 200, 32, 0.1, 0)  # 3000 para o treino completo
    print("perda no primeiro lote:", round(historico[0], 4))
    print("NLL de treino:", round(perda_e_gradientes_lm(params, X, Y)[0], 4))
    print("NLL de validação:", round(perda_e_gradientes_lm(params, Xv, Yv)[0], 4))
    print(amostrar_lm(params, itos, bloco, np.random.default_rng(0), 8))
```

```python name="gerador recriado a cada passo"
import numpy as np

from modelo import (carregar_nomes, construir_vocabulario, iniciar_params, montar_dados,
                    perda_e_gradientes_lm, probabilidades_lm)


def treinar_lm(params, X, Y, passos, lote, taxa, semente):
    historico = []
    for _ in range(passos):
        rng = np.random.default_rng(semente)
        idx = rng.integers(0, X.shape[0], lote)
        perda, grads = perda_e_gradientes_lm(params, X[idx], Y[idx])
        for chave in params:
            params[chave] -= taxa * grads[chave]
        historico.append(perda)
    return historico


def amostrar_lm(params, itos, bloco, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        contexto, nome = [0] * bloco, ""
        while True:
            p = probabilidades_lm(params, np.array([contexto]))[0]
            i = int(rng.choice(V, p=p))
            if i == 0:
                break
            nome += itos[i]
            contexto = contexto[1:] + [i]
        nomes.append(nome)
    return nomes


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    bloco = 3
    X, Y = montar_dados(treino, bloco, stoi)
    Xv, Yv = montar_dados(validacao, bloco, stoi)
    params = iniciar_params(len(itos), bloco, 2, 32, 0)
    historico = treinar_lm(params, X, Y, 200, 32, 0.1, 0)  # 3000 para o treino completo
    print("perda no primeiro lote:", round(historico[0], 4))
    print("NLL de treino:", round(perda_e_gradientes_lm(params, X, Y)[0], 4))
    print("NLL de validação:", round(perda_e_gradientes_lm(params, Xv, Yv)[0], 4))
    print(amostrar_lm(params, itos, bloco, np.random.default_rng(0), 8))
```

```python name="sinal da atualização trocado"
import numpy as np

from modelo import (carregar_nomes, construir_vocabulario, iniciar_params, montar_dados,
                    perda_e_gradientes_lm, probabilidades_lm)


def treinar_lm(params, X, Y, passos, lote, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for _ in range(passos):
        idx = rng.integers(0, X.shape[0], lote)
        perda, grads = perda_e_gradientes_lm(params, X[idx], Y[idx])
        for chave in params:
            params[chave] += taxa * grads[chave]
        historico.append(perda)
    return historico


def amostrar_lm(params, itos, bloco, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        contexto, nome = [0] * bloco, ""
        while True:
            p = probabilidades_lm(params, np.array([contexto]))[0]
            i = int(rng.choice(V, p=p))
            if i == 0:
                break
            nome += itos[i]
            contexto = contexto[1:] + [i]
        nomes.append(nome)
    return nomes


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    bloco = 3
    X, Y = montar_dados(treino, bloco, stoi)
    Xv, Yv = montar_dados(validacao, bloco, stoi)
    params = iniciar_params(len(itos), bloco, 2, 32, 0)
    historico = treinar_lm(params, X, Y, 200, 32, 0.1, 0)  # 3000 para o treino completo
    print("perda no primeiro lote:", round(historico[0], 4))
    print("NLL de treino:", round(perda_e_gradientes_lm(params, X, Y)[0], 4))
    print("NLL de validação:", round(perda_e_gradientes_lm(params, Xv, Yv)[0], 4))
    print(amostrar_lm(params, itos, bloco, np.random.default_rng(0), 8))
```

```python name="treina uma cópia e deixa params como estava"
import numpy as np

from modelo import (carregar_nomes, construir_vocabulario, iniciar_params, montar_dados,
                    perda_e_gradientes_lm, probabilidades_lm)


def treinar_lm(params, X, Y, passos, lote, taxa, semente):
    rng = np.random.default_rng(semente)
    params = {chave: valor.copy() for chave, valor in params.items()}
    historico = []
    for _ in range(passos):
        idx = rng.integers(0, X.shape[0], lote)
        perda, grads = perda_e_gradientes_lm(params, X[idx], Y[idx])
        for chave in params:
            params[chave] -= taxa * grads[chave]
        historico.append(perda)
    return historico


def amostrar_lm(params, itos, bloco, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        contexto, nome = [0] * bloco, ""
        while True:
            p = probabilidades_lm(params, np.array([contexto]))[0]
            i = int(rng.choice(V, p=p))
            if i == 0:
                break
            nome += itos[i]
            contexto = contexto[1:] + [i]
        nomes.append(nome)
    return nomes


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    bloco = 3
    X, Y = montar_dados(treino, bloco, stoi)
    Xv, Yv = montar_dados(validacao, bloco, stoi)
    params = iniciar_params(len(itos), bloco, 2, 32, 0)
    historico = treinar_lm(params, X, Y, 200, 32, 0.1, 0)  # 3000 para o treino completo
    print("perda no primeiro lote:", round(historico[0], 4))
    print("NLL de treino:", round(perda_e_gradientes_lm(params, X, Y)[0], 4))
    print("NLL de validação:", round(perda_e_gradientes_lm(params, Xv, Yv)[0], 4))
    print(amostrar_lm(params, itos, bloco, np.random.default_rng(0), 8))
```

```python name="lote sorteado sem reposição"
import numpy as np

from modelo import (carregar_nomes, construir_vocabulario, iniciar_params, montar_dados,
                    perda_e_gradientes_lm, probabilidades_lm)


def treinar_lm(params, X, Y, passos, lote, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for _ in range(passos):
        idx = rng.permutation(X.shape[0])[:lote]
        perda, grads = perda_e_gradientes_lm(params, X[idx], Y[idx])
        for chave in params:
            params[chave] -= taxa * grads[chave]
        historico.append(perda)
    return historico


def amostrar_lm(params, itos, bloco, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        contexto, nome = [0] * bloco, ""
        while True:
            p = probabilidades_lm(params, np.array([contexto]))[0]
            i = int(rng.choice(V, p=p))
            if i == 0:
                break
            nome += itos[i]
            contexto = contexto[1:] + [i]
        nomes.append(nome)
    return nomes


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    bloco = 3
    X, Y = montar_dados(treino, bloco, stoi)
    Xv, Yv = montar_dados(validacao, bloco, stoi)
    params = iniciar_params(len(itos), bloco, 2, 32, 0)
    historico = treinar_lm(params, X, Y, 200, 32, 0.1, 0)  # 3000 para o treino completo
    print("perda no primeiro lote:", round(historico[0], 4))
    print("NLL de treino:", round(perda_e_gradientes_lm(params, X, Y)[0], 4))
    print("NLL de validação:", round(perda_e_gradientes_lm(params, Xv, Yv)[0], 4))
    print(amostrar_lm(params, itos, bloco, np.random.default_rng(0), 8))
```

```python name="contexto não avança na amostragem"
import numpy as np

from modelo import (carregar_nomes, construir_vocabulario, iniciar_params, montar_dados,
                    perda_e_gradientes_lm, probabilidades_lm)


def treinar_lm(params, X, Y, passos, lote, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for _ in range(passos):
        idx = rng.integers(0, X.shape[0], lote)
        perda, grads = perda_e_gradientes_lm(params, X[idx], Y[idx])
        for chave in params:
            params[chave] -= taxa * grads[chave]
        historico.append(perda)
    return historico


def amostrar_lm(params, itos, bloco, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        contexto, nome = [0] * bloco, ""
        while True:
            p = probabilidades_lm(params, np.array([contexto]))[0]
            i = int(rng.choice(V, p=p))
            if i == 0:
                break
            nome += itos[i]
        nomes.append(nome)
    return nomes


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    bloco = 3
    X, Y = montar_dados(treino, bloco, stoi)
    Xv, Yv = montar_dados(validacao, bloco, stoi)
    params = iniciar_params(len(itos), bloco, 2, 32, 0)
    historico = treinar_lm(params, X, Y, 200, 32, 0.1, 0)  # 3000 para o treino completo
    print("perda no primeiro lote:", round(historico[0], 4))
    print("NLL de treino:", round(perda_e_gradientes_lm(params, X, Y)[0], 4))
    print("NLL de validação:", round(perda_e_gradientes_lm(params, Xv, Yv)[0], 4))
    print(amostrar_lm(params, itos, bloco, np.random.default_rng(0), 8))
```

```python name="ponto final incluído no nome"
import numpy as np

from modelo import (carregar_nomes, construir_vocabulario, iniciar_params, montar_dados,
                    perda_e_gradientes_lm, probabilidades_lm)


def treinar_lm(params, X, Y, passos, lote, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for _ in range(passos):
        idx = rng.integers(0, X.shape[0], lote)
        perda, grads = perda_e_gradientes_lm(params, X[idx], Y[idx])
        for chave in params:
            params[chave] -= taxa * grads[chave]
        historico.append(perda)
    return historico


def amostrar_lm(params, itos, bloco, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        contexto, nome = [0] * bloco, ""
        while True:
            p = probabilidades_lm(params, np.array([contexto]))[0]
            i = int(rng.choice(V, p=p))
            nome += itos[i]
            if i == 0:
                break
            contexto = contexto[1:] + [i]
        nomes.append(nome)
    return nomes


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    bloco = 3
    X, Y = montar_dados(treino, bloco, stoi)
    Xv, Yv = montar_dados(validacao, bloco, stoi)
    params = iniciar_params(len(itos), bloco, 2, 32, 0)
    historico = treinar_lm(params, X, Y, 200, 32, 0.1, 0)  # 3000 para o treino completo
    print("perda no primeiro lote:", round(historico[0], 4))
    print("NLL de treino:", round(perda_e_gradientes_lm(params, X, Y)[0], 4))
    print("NLL de validação:", round(perda_e_gradientes_lm(params, Xv, Yv)[0], 4))
    print(amostrar_lm(params, itos, bloco, np.random.default_rng(0), 8))
```

```python name="contexto da amostragem desliza para o lado errado"
import numpy as np

from modelo import (carregar_nomes, construir_vocabulario, iniciar_params, montar_dados,
                    perda_e_gradientes_lm, probabilidades_lm)


def treinar_lm(params, X, Y, passos, lote, taxa, semente):
    rng = np.random.default_rng(semente)
    historico = []
    for _ in range(passos):
        idx = rng.integers(0, X.shape[0], lote)
        perda, grads = perda_e_gradientes_lm(params, X[idx], Y[idx])
        for chave in params:
            params[chave] -= taxa * grads[chave]
        historico.append(perda)
    return historico


def amostrar_lm(params, itos, bloco, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        contexto, nome = [0] * bloco, ""
        while True:
            p = probabilidades_lm(params, np.array([contexto]))[0]
            i = int(rng.choice(V, p=p))
            if i == 0:
                break
            nome += itos[i]
            contexto = [i] + contexto[:-1]
        nomes.append(nome)
    return nomes


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    bloco = 3
    X, Y = montar_dados(treino, bloco, stoi)
    Xv, Yv = montar_dados(validacao, bloco, stoi)
    params = iniciar_params(len(itos), bloco, 2, 32, 0)
    historico = treinar_lm(params, X, Y, 200, 32, 0.1, 0)  # 3000 para o treino completo
    print("perda no primeiro lote:", round(historico[0], 4))
    print("NLL de treino:", round(perda_e_gradientes_lm(params, X, Y)[0], 4))
    print("NLL de validação:", round(perda_e_gradientes_lm(params, Xv, Yv)[0], 4))
    print(amostrar_lm(params, itos, bloco, np.random.default_rng(0), 8))
```

## Passo 8 · Quiz · Contexto fixo

### Pergunta

Um modelo com `bloco = 3` foi treinado nos nomes. Durante a amostragem, o nome parcial é `marile` e o modelo vai sortear o próximo caractere. Que parte do nome influencia esse sorteio?

- [ ] O nome inteiro, porque cada caractere passou pela tabela de embeddings.
- [x] Só `ile`: o contexto guarda os 3 últimos índices, e `mar` já saiu da janela.
- [ ] Só o `e`, como no bigrama; os outros dois índices servem só de preenchimento.
- [ ] `mar`, porque o contexto é preenchido a partir do começo do nome.

> A rede recebe exatamente `bloco` índices, os mais recentes; o que saiu da janela não chega a ela por nenhum caminho. As três posições entram na concatenação e influenciam os logits, então não é um bigrama. O preenchimento com `.` só existe no começo do nome, e a janela desliza para a direita, não fica presa nas primeiras letras. Um modelo com `bloco = 3` não tem como aprender, por exemplo, a limitar o comprimento do nome.

### Pergunta

Um colega escreveu a inicialização do modelo e, antes de treinar, mediu a perda nos dados de treino com $V = 21$:

```python
perda, _ = perda_e_gradientes_lm(params, X, Y)
print(round(perda, 2))    # 9.46
```

Qual é o diagnóstico mais provável?

- [ ] Está certo: sem treino, a perda esperada é $\ln(21^3) \approx 9{,}13$, porque o contexto tem 3 caracteres.
- [ ] A taxa de aprendizado está alta demais.
- [x] Os logits já nascem grandes (por exemplo, $W_2$ sorteado com desvio 1): a rede começa confiante em respostas erradas, e a perda esperada sem preferência seria $\ln 21 \approx 3{,}04$.
- [ ] Falta a suavização das contagens, e algum par tem probabilidade zero.

> Sem preferência entre os 21 caracteres, a perda é $\ln 21$, qualquer que seja o tamanho do contexto: a previsão é de um caractere, não de três. Nenhum passo de treino foi dado, então a taxa ainda não entrou na conta. Suavização é coisa do modelo de contagem; a softmax nunca devolve zero exato, e um zero daria `inf`, não $9{,}46$. Medido nesta rede: desvio $0{,}01$ em $W_2$ dá $3{,}0472$, desvio 1 dá $9{,}46$.

### Pergunta

Três treinos do MLP de linguagem nos mesmos 800 nomes, com `bloco = 3`, e o bigrama como referência:

| modelo | passos | NLL de treino | NLL de validação |
|---|---|---|---|
| bigrama por contagem | | 2,1203 | 2,1250 |
| $d = 2$, 32 unidades | 3 000 | 2,0608 | 2,0621 |
| $d = 8$, 64 unidades | 3 000 | 2,0059 | 2,1115 |
| $d = 8$, 64 unidades | 10 000 | 1,8882 | 2,2339 |

Qual modelo você escolhe, e por quê?

- [ ] O de 10 000 passos, porque tem a menor NLL de treino.
- [ ] O bigrama, porque é o único em que treino e validação quase coincidem.
- [ ] O de $d = 8$ com 3 000 passos, porque mais parâmetros sempre generalizam melhor com o mesmo número de passos.
- [x] O de $d = 2$ com 32 unidades: tem a menor NLL de validação, e a distância entre treino e validação é quase nula.

> A escolha é pela validação, que mede nomes que o modelo não viu. A rede maior melhora o treino e piora a validação conforme treina mais: com 800 nomes e 3 133 parâmetros, ela decora, e os 10 000 passos ficam piores que o próprio bigrama ($2{,}2339$ contra $2{,}1250$). O bigrama também tem treino e validação próximos, mas num nível pior que o da rede pequena. Depois da escolha, o teste é medido uma vez: $2{,}1177$ para a rede de $d = 2$.
