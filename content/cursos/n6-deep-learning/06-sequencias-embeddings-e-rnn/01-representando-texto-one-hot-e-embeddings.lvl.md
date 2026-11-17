---
slug: n6-m6-01-representando-texto-one-hot-e-embeddings
titulo: 'Representando texto: one-hot e embeddings'
descricao: Vocabulário de caracteres e de palavras, one-hot e sua esparsidade, tabela de embeddings como camada treinável, similaridade entre vetores e o gradiente de uma consulta à tabela.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Construir vocabulários e codificar/decodificar sequências de caracteres
- Implementar uma camada de embedding com forward (indexação) e backward (acumulação)
- Calcular similaridades entre embeddings e explicar o que elas capturam após o treino
---

## Passo 1 · Leitura · Texto vira número

Uma rede só faz contas com números, e um nome é uma sequência de letras. O primeiro passo de qualquer modelo de linguagem é combinar uma tabela fixa: cada símbolo que o modelo conhece (um **token**) recebe um índice inteiro. Neste módulo o token é o caractere, e os dados são 1 000 nomes inventados por um gerador de sílabas escrito para o curso (`nomes.txt`: 750 terminam em vogal, 250 em consoante, 20 letras diferentes). Nenhum é nome de pessoa real de propósito.

A tabela tem dois lados. `stoi` (*string to index*) é um dicionário que leva o caractere ao índice. `itos` (*index to string*) é uma lista que faz o caminho de volta. Os dois precisam estar alinhados: `itos[stoi[c]] == c` para todo caractere.

```python
itos = [".", "a", "b", "i", "n"]
stoi = {c: i for i, c in enumerate(itos)}

print([stoi[c] for c in ".ana."])          # [0, 1, 4, 1, 0]
print("".join(itos[i] for i in [2, 3, 1])) # bia
```

O `.` é um **token especial**: ele não é letra de nome nenhum, e marca o início e o fim. O nome `ana` vira `.ana.`, e o modelo aprende duas coisas a mais: quais letras costumam abrir um nome (o que vem depois do `.`) e quando parar (quando o próximo token é o `.`). Por convenção do módulo, ele fica no índice 0, e as letras vêm depois, em ordem alfabética. Com os 20 caracteres do `nomes.txt`, o vocabulário tem $V = 21$ tokens.

O vocabulário é construído **só com os dados de treino**. Se a validação entrasse na conta, o modelo ganharia uma linha para um caractere que nunca viu em treino, com pesos que ninguém ajustou, e a medida de validação deixaria de imitar o uso real. Um caractere fora do vocabulário aparece como erro na hora de codificar:

```text
KeyError: 'k'
```

Esse erro é informação útil: ele avisa que o texto novo tem um símbolo que o modelo não conhece. Trocar o símbolo em silêncio pelo índice 0 esconderia o problema e ainda ensinaria ao modelo que o nome acabou ali.

## Passo 2 · Previsão · One-hot vezes W é indexar

O vetor **one-hot** de um índice tem 1 naquela posição e 0 nas outras. Multiplicar uma matriz de linhas one-hot por `W` escolhe linhas de `W`. Antes de rodar, escreva o que cada `print` mostra.

### Código

```python
import numpy as np

W = np.arange(12.0).reshape(4, 3)
idx = np.array([2, 0, 2])

one_hot = np.zeros((3, 4))
one_hot[np.arange(3), idx] = 1.0

print(one_hot.tolist())
print((one_hot @ W).tolist())
print(W[idx].tolist())
print(bool(np.array_equal(one_hot @ W, W[idx])))
```

### Dicas

1. `W` tem as linhas `[0, 1, 2]`, `[3, 4, 5]`, `[6, 7, 8]` e `[9, 10, 11]`.
2. Cada linha de `one_hot @ W` soma as linhas de `W` com pesos 0 e 1: sobra uma linha só.
3. O índice 2 aparece duas vezes em `idx`.

### Saída esperada

```text
[[0.0, 0.0, 1.0, 0.0], [1.0, 0.0, 0.0, 0.0], [0.0, 0.0, 1.0, 0.0]]
[[6.0, 7.0, 8.0], [0.0, 1.0, 2.0], [6.0, 7.0, 8.0]]
[[6.0, 7.0, 8.0], [0.0, 1.0, 2.0], [6.0, 7.0, 8.0]]
True
```

## Passo 3 · Exercício · Vocabulário e codificação

modo: lacunas

Complete as três funções que o módulo inteiro vai usar. O `.` fica sempre no índice 0, mesmo que não apareça nos textos (e sem repetir, se aparecer); os outros caracteres vêm depois, em ordem crescente.

### Instruções

1. Complete `construir_vocabulario(textos)`: recebe uma lista de strings e devolve `(stoi, itos)`, com `itos` uma lista que começa por `"."` e segue com os caracteres ordenados, e `stoi` o dicionário inverso.
2. Complete `codificar(texto, stoi)`: devolve a lista de índices dos caracteres de `texto`. Caractere fora do vocabulário levanta `KeyError`.
3. Complete `decodificar(indices, itos)`: devolve a string formada pelos caracteres dos índices.

### Código inicial

```python
def construir_vocabulario(textos):
    caracteres = ___(set("".join(textos)) - {"."})
    itos = ___
    stoi = {c: ___ for i, c in enumerate(itos)}
    return stoi, itos


def codificar(texto, stoi):
    return [___ for c in texto]


def decodificar(indices, itos):
    return "".join(___ for i in indices)
```

### Solução

```python
def construir_vocabulario(textos):
    caracteres = sorted(set("".join(textos)) - {"."})
    itos = ["."] + caracteres
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def codificar(texto, stoi):
    return [stoi[c] for c in texto]


def decodificar(indices, itos):
    return "".join(itos[i] for i in indices)
```

### Dicas

1. Um `set` não tem ordem: quem garante a ordem alfabética é a função que transforma o conjunto em lista.
2. `enumerate(itos)` já entrega o par (posição, caractere) na ordem certa para o dicionário.
3. Indexar o dicionário com colchetes levanta `KeyError` sozinho quando a chave não existe.

### Verificação

```json
[
  {"id": "itos-dois-nomes", "checkpoint": 1, "kind": "expr", "setup": "", "expr": "construir_vocabulario(['ana', 'bia'])[1]", "expected": [".", "a", "b", "i", "n"], "name": "itos de ['ana', 'bia'] começa por '.' e segue em ordem alfabética", "hint": "O '.' entra uma vez, na frente dos caracteres ordenados."},
  {"id": "stoi-dois-nomes", "checkpoint": 1, "kind": "expr", "setup": "_stoi, _itos = construir_vocabulario(['ana', 'bia'])", "expr": "[_stoi[c] for c in '.abin']", "expected": [0, 1, 2, 3, 4], "name": "stoi leva cada caractere à posição dele em itos", "hint": "O índice de um caractere é a posição em que ele aparece em itos."},
  {"id": "ordem-com-muitas-letras", "checkpoint": 1, "kind": "expr", "setup": "", "expr": "construir_vocabulario(['zebra', 'quilo', 'fjord', 'tempo', 'vidas'])[1]", "expected": [".", "a", "b", "d", "e", "f", "i", "j", "l", "m", "o", "p", "q", "r", "s", "t", "u", "v", "z"], "name": "Com 18 letras diferentes, itos sai em ordem alfabética", "hint": "A ordem de um set muda de uma execução para outra."},
  {"id": "ponto-ja-presente", "checkpoint": 1, "kind": "expr", "setup": "", "expr": "construir_vocabulario(['.b.a.', 'c'])[1]", "expected": [".", "a", "b", "c"], "name": "Textos que já têm '.' não duplicam o token", "hint": "Tire o '.' do conjunto antes de ordenar e ponha-o na frente."},
  {"id": "alinhados", "checkpoint": 1, "kind": "expr", "setup": "_stoi, _itos = construir_vocabulario(['murilo', 'tavena', 'godin'])", "expr": "[len(_stoi), len(_itos), all(_itos[_stoi[c]] == c for c in _itos)]", "expected": [14, 14, true], "name": "stoi e itos têm o mesmo tamanho e são inversos um do outro"},
  {"id": "codificar-com-pontos", "checkpoint": 2, "kind": "expr", "setup": "_stoi, _itos = construir_vocabulario(['ana', 'bia'])", "expr": "codificar('.ana.', _stoi)", "expected": [0, 1, 4, 1, 0], "name": "codificar('.ana.') usa o índice 0 nas duas pontas", "hint": "Cada caractere vira stoi[c], inclusive o '.'."},
  {"id": "codificar-vazio", "checkpoint": 2, "kind": "expr", "setup": "_stoi, _itos = construir_vocabulario(['ana'])", "expr": "codificar('', _stoi)", "expected": [], "name": "Texto vazio vira lista vazia"},
  {"id": "fora-do-vocabulario", "checkpoint": 2, "kind": "expr", "setup": "_stoi, _itos = construir_vocabulario(['ana', 'bia'])", "expr": "codificar('kiana', _stoi)", "raises": "KeyError", "name": "Caractere fora do vocabulário levanta KeyError", "hint": "Não troque o caractere desconhecido por outro índice."},
  {"id": "decodificar-indices", "checkpoint": 3, "kind": "expr", "setup": "_stoi, _itos = construir_vocabulario(['ana', 'bia'])", "expr": "decodificar([0, 2, 3, 1, 0], _itos)", "expected": ".bia.", "name": "decodificar([0, 2, 3, 1, 0]) devolve '.bia.'", "hint": "O índice i vira itos[i]."},
  {"id": "ida-e-volta", "checkpoint": 3, "kind": "expr", "setup": "_stoi, _itos = construir_vocabulario(['tavena', 'murilo'])", "expr": "decodificar(codificar('.matula.', _stoi), _itos)", "expected": ".matula.", "name": "Codificar e decodificar devolve o texto original"}
]
```

### Soluções erradas

```python name="conjunto virado lista sem ordenar"
def construir_vocabulario(textos):
    caracteres = list(set("".join(textos)) - {"."})
    itos = ["."] + caracteres
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def codificar(texto, stoi):
    return [stoi[c] for c in texto]


def decodificar(indices, itos):
    return "".join(itos[i] for i in indices)
```

```python name="vocabulário sem o ponto"
def construir_vocabulario(textos):
    caracteres = sorted(set("".join(textos)) - {"."})
    itos = caracteres
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def codificar(texto, stoi):
    return [stoi[c] for c in texto]


def decodificar(indices, itos):
    return "".join(itos[i] for i in indices)
```

```python name="ponto no fim do vocabulário"
def construir_vocabulario(textos):
    caracteres = sorted(set("".join(textos)) - {"."})
    itos = caracteres + ["."]
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def codificar(texto, stoi):
    return [stoi[c] for c in texto]


def decodificar(indices, itos):
    return "".join(itos[i] for i in indices)
```

```python name="stoi deslocado de itos"
def construir_vocabulario(textos):
    caracteres = sorted(set("".join(textos)) - {"."})
    itos = ["."] + caracteres
    stoi = {c: i + 1 for i, c in enumerate(itos)}
    return stoi, itos


def codificar(texto, stoi):
    return [stoi[c] for c in texto]


def decodificar(indices, itos):
    return "".join(itos[i] for i in indices)
```

```python name="caractere desconhecido vira índice 0"
def construir_vocabulario(textos):
    caracteres = sorted(set("".join(textos)) - {"."})
    itos = ["."] + caracteres
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def codificar(texto, stoi):
    return [stoi.get(c, 0) for c in texto]


def decodificar(indices, itos):
    return "".join(itos[i] for i in indices)
```

```python name="decodificar junta os números"
def construir_vocabulario(textos):
    caracteres = sorted(set("".join(textos)) - {"."})
    itos = ["."] + caracteres
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def codificar(texto, stoi):
    return [stoi[c] for c in texto]


def decodificar(indices, itos):
    return "".join(str(i) for i in indices)
```

## Passo 4 · Leitura · A tabela de embeddings

O one-hot serve para a conta, mas desperdiça memória e não diz nada sobre os tokens: todo par de vetores one-hot diferentes é ortogonal, então `a` fica tão longe de `e` quanto de `m`. A saída é dar a cada token um vetor denso de $d$ números, guardado numa linha de uma matriz $E$ de forma $(V, d)$: a **tabela de embeddings**. Ela é um parâmetro como qualquer peso, sorteada no começo e ajustada pelo gradiente.

O forward não multiplica nada. Como o passo anterior mostrou, `one_hot @ E` é o mesmo que indexar:

```python
import numpy as np

E = np.arange(8.0).reshape(4, 2)       # V = 4, d = 2
X = np.array([[1, 3, 1], [0, 1, 2]])   # 2 exemplos, 3 tokens cada

saida = E[X]
print(saida.shape)                      # (2, 3, 2)
```

A saída tem a forma dos índices mais um eixo de tamanho $d$ no fim, qualquer que seja a forma de `X`.

O backward recebe `dout`, com a mesma forma da saída, e devolve `dE`, com a forma de $E$. Cada posição da saída é uma cópia de uma linha da tabela, então o gradiente de uma linha é a soma dos gradientes de todas as posições que a usaram:

$$\frac{\partial L}{\partial E_v} = \sum_{i \,:\, x_i = v} \text{dout}_i$$

As linhas que não apareceram ficam com gradiente zero. A armadilha está na soma quando um índice se repete, o que em texto acontece o tempo todo:

```python
idx = np.array([0, 0, 1])

d = np.zeros(3)
d[idx] += 1.0
print(d.tolist())       # [1.0, 1.0, 0.0]

d = np.zeros(3)
np.add.at(d, idx, 1.0)
print(d.tolist())       # [2.0, 1.0, 0.0]
```

`d[idx] += 1.0` lê `d[idx]`, soma e grava de volta: as duas gravações na posição 0 escrevem o mesmo valor, e uma das contribuições se perde, sem erro nem aviso. `np.add.at` acumula uma a uma. Com a indexação direta, o token que mais aparece no lote recebe um gradiente menor do que devia, e a checagem numérica acusa a diferença na hora.

## Passo 5 · Exercício · Forward e backward do embedding

Escreva as duas metades da camada de embedding. Elas voltam na lição do MLP de linguagem, com índices de forma `(n, bloco)`.

### Instruções

1. Escreva `embedding_forward(E, indices)`: `E` tem forma `(V, d)` e `indices` é um array de inteiros de qualquer forma; devolva o array de forma `indices.shape + (d,)` com as linhas de `E`.
2. Escreva `embedding_backward(dout, indices, V)`: `dout` tem a forma da saída do forward; devolva `dE`, de forma `(V, d)`, somando em cada linha os gradientes de todas as posições que a usaram (índices repetidos acumulam; linhas não usadas ficam em zero). Não altere `dout`.

### Código inicial

```python
import numpy as np


def embedding_forward(E, indices):
    pass


def embedding_backward(dout, indices, V):
    pass
```

### Solução

```python
import numpy as np


def embedding_forward(E, indices):
    return E[indices]


def embedding_backward(dout, indices, V):
    dE = np.zeros((V, dout.shape[-1]))
    np.add.at(dE, indices, dout)
    return dE
```

### Dicas

1. Indexar `E` com um array de inteiros já devolve a forma pedida, para índices de qualquer forma.
2. O número de colunas de `dE` é o tamanho do último eixo de `dout`.
3. `np.add.at(alvo, indices, valores)` soma uma contribuição por posição, mesmo com índices repetidos.

### Verificação

```json
[
  {"id": "forward-valores", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_E = np.arange(8.0).reshape(4, 2)", "expr": "embedding_forward(_E, np.array([3, 0, 3])).tolist()", "expected": [[6.0, 7.0], [0.0, 1.0], [6.0, 7.0]], "tolerance": 1e-12, "name": "Índices [3, 0, 3] devolvem as linhas 3, 0 e 3 da tabela", "hint": "A saída é E indexada pelos índices."},
  {"id": "forward-forma-2d", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_E = np.random.default_rng(0).normal(0, 1, (7, 5))\n_X = np.array([[1, 6, 1], [0, 2, 2]])", "expr": "list(embedding_forward(_E, _X).shape)", "expected": [2, 3, 5], "name": "Índices de forma (2, 3) com d = 5 dão saída (2, 3, 5)", "hint": "A forma da saída é a dos índices mais um eixo de tamanho d."},
  {"id": "forward-2d-valores", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_E = np.random.default_rng(0).normal(0, 1, (7, 5))\n_X = np.array([[1, 6, 1], [0, 2, 2]])\n_S = embedding_forward(_E, _X)", "expr": "[bool(np.array_equal(_S[i, j], _E[_X[i, j]])) for i in range(2) for j in range(3)]", "expected": [true, true, true, true, true, true], "name": "Cada posição (i, j) da saída é a linha X[i, j] da tabela"},
  {"id": "forward-escalar", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_E = np.arange(8.0).reshape(4, 2)", "expr": "embedding_forward(_E, np.array(2)).tolist()", "expected": [4.0, 5.0], "tolerance": 1e-12, "name": "Um índice só (forma ()) devolve uma linha de forma (d,)"},
  {"id": "backward-repetidos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "embedding_backward(np.ones((3, 2)), np.array([0, 0, 1]), 3).tolist()", "expected": [[2.0, 2.0], [1.0, 1.0], [0.0, 0.0]], "tolerance": 1e-12, "name": "Índices [0, 0, 1] com dout de uns: a linha 0 acumula 2", "hint": "dE[indices] += dout grava uma vez só em cada linha repetida."},
  {"id": "backward-forma", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "list(embedding_backward(np.ones((2, 4)), np.array([1, 2]), 6).shape)", "expected": [6, 4], "name": "dE tem a forma (V, d), mesmo quando os últimos índices não aparecem", "hint": "O número de linhas é V, não o maior índice usado."},
  {"id": "backward-linhas-nao-usadas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_d = embedding_backward(np.full((2, 3), 0.5), np.array([4, 1]), 6)", "expr": "[float(abs(_d[i]).sum()) for i in range(6)]", "expected": [0.0, 1.5, 0.0, 0.0, 1.5, 0.0], "tolerance": 1e-12, "name": "Linhas que não foram consultadas ficam com gradiente zero"},
  {"id": "backward-valores-diferentes", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_dout = np.array([[1.0, 2.0], [10.0, 20.0], [100.0, 200.0], [1000.0, 2000.0]])", "expr": "embedding_backward(_dout, np.array([2, 0, 2, 2]), 3).tolist()", "expected": [[10.0, 20.0], [0.0, 0.0], [1101.0, 2202.0]], "tolerance": 1e-12, "name": "A linha 2 soma os gradientes das três posições que a usaram", "hint": "Some os valores de dout, não o número de usos."},
  {"id": "backward-2d", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(1)\n_X = np.array([[1, 4, 1], [0, 1, 4]])\n_dout = _rng.normal(0, 1, (2, 3, 3))\n_ref = np.zeros((5, 3))\nfor _i in range(2):\n    for _j in range(3):\n        _ref[_X[_i, _j]] = _ref[_X[_i, _j]] + _dout[_i, _j]", "expr": "bool(np.allclose(embedding_backward(_dout, _X, 5), _ref, atol=1e-12))", "expected": true, "name": "Índices de forma (2, 3): dE bate com a soma posição a posição", "hint": "Comparado com um laço que soma dout[i, j] na linha X[i, j]."},
  {"id": "checagem-numerica", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_rng = np.random.default_rng(0)\n_E = _rng.normal(0, 1, (5, 3))\n_X = np.array([[1, 4, 1], [0, 1, 4]])\n_G = _rng.normal(0, 1, (2, 3, 3))\ndef _perda():\n    return float((embedding_forward(_E, _X) * _G).sum())\ndef _numerico(A, h=1e-5):\n    N = np.zeros_like(A)\n    for i in np.ndindex(A.shape):\n        v = A[i]\n        A[i] = v + h\n        a = _perda()\n        A[i] = v - h\n        b = _perda()\n        A[i] = v\n        N[i] = (a - b) / (2 * h)\n    return N\ndef _erro(a, n):\n    return float(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8))", "expr": "bool(_erro(embedding_backward(_G, _X, 5), _numerico(_E)) < 1e-7)", "expected": true, "name": "dE bate com a diferença central (erro relativo abaixo de 1e-7)", "hint": "A perda da checagem é a soma de forward(E, X) * G; o gradiente da saída é G."},
  {"id": "dout-intacto", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_dout = np.arange(6.0).reshape(3, 2)\n_copia = _dout.copy()\n_d = embedding_backward(_dout, np.array([1, 1, 0]), 2)", "expr": "[bool(np.array_equal(_dout, _copia)), bool(_d is not _dout)]", "expected": [true, true], "name": "dout não é alterado e dE é um array novo"}
]
```

### Soluções erradas

```python name="indexação direta não acumula repetidos"
import numpy as np


def embedding_forward(E, indices):
    return E[indices]


def embedding_backward(dout, indices, V):
    dE = np.zeros((V, dout.shape[-1]))
    dE[indices] += dout
    return dE
```

```python name="atribui em vez de somar"
import numpy as np


def embedding_forward(E, indices):
    return E[indices]


def embedding_backward(dout, indices, V):
    dE = np.zeros((V, dout.shape[-1]))
    dE[indices] = dout
    return dE
```

```python name="dE só até o maior índice usado"
import numpy as np


def embedding_forward(E, indices):
    return E[indices]


def embedding_backward(dout, indices, V):
    dE = np.zeros((int(indices.max()) + 1, dout.shape[-1]))
    np.add.at(dE, indices, dout)
    return dE
```

```python name="conta os usos e ignora dout"
import numpy as np


def embedding_forward(E, indices):
    return E[indices]


def embedding_backward(dout, indices, V):
    dE = np.zeros((V, dout.shape[-1]))
    np.add.at(dE, indices, 1.0)
    return dE
```

```python name="forward indexa as colunas"
import numpy as np


def embedding_forward(E, indices):
    return E[:, indices]


def embedding_backward(dout, indices, V):
    dE = np.zeros((V, dout.shape[-1]))
    np.add.at(dE, indices, dout)
    return dE
```

```python name="forward achata os índices"
import numpy as np


def embedding_forward(E, indices):
    return E[indices.ravel()]


def embedding_backward(dout, indices, V):
    dE = np.zeros((V, dout.shape[-1]))
    np.add.at(dE, indices, dout)
    return dE
```

## Passo 6 · Leitura · Similaridade

Depois que cada token tem um vetor, dá para perguntar quais tokens o modelo trata como parecidos. A medida usual é a **similaridade de cosseno**, o cosseno do ângulo entre dois vetores:

$$\cos(u, v) = \frac{u \cdot v}{\lVert u \rVert \, \lVert v \rVert}$$

Ela vale 1 para vetores na mesma direção, 0 para ortogonais e $-1$ para opostos, e ignora o tamanho. Isso importa porque a norma de um embedding costuma crescer com a frequência do token: comparar pela distância euclidiana ou pelo produto interno puro mistura "aponta para o mesmo lado" com "é comprido".

```python
import numpy as np

E = np.array([[1.0, 0.0], [10.0, 0.0], [1.0, 0.5]])
U = E / np.linalg.norm(E, axis=1, keepdims=True)

print((U @ U[0]).round(3).tolist())                    # [1.0, 1.0, 0.894]
print(np.linalg.norm(E - E[0], axis=1).tolist())       # [0.0, 9.0, 0.5]
```

Pelo cosseno, o vizinho mais próximo da linha 0 é a linha 1 (mesma direção, dez vezes mais longa); pela distância euclidiana, seria a linha 2. Uma linha toda nula não tem direção: a divisão dá `nan` em silêncio, e é preciso decidir o que fazer (aqui, similaridade 0 com todo mundo).

Numa tabela recém-sorteada, os vizinhos são acaso. O que dá significado à geometria é o treino: tokens que aparecem nos mesmos contextos recebem gradientes parecidos e acabam próximos. Medido no executor com o MLP de linguagem da lição 3, treinado nos 800 primeiros nomes do `nomes.txt` ($d = 2$, 32 unidades escondidas, 3 000 passos): antes do treino, os quatro vizinhos de `a` eram `n`, `c`, `t` e `v`, e o cosseno entre `a` e `e` era $-0{,}974$; depois, os vizinhos passaram a ser `e`, `u`, `o` e `i`, com cosseno de $0{,}9997$ entre `a` e `e`. Ninguém disse ao modelo o que é uma vogal. Nos nomes gerados, depois de uma consoante quase sempre vem uma vogal, e prever bem a próxima letra exige tratar as vogais do mesmo jeito.

O mesmo vale para embeddings de palavras: a tabela aprende o que ajuda a prever o contexto, inclusive os vícios dos dados de treino.

## Passo 7 · Exercício · Vizinhos mais próximos

Escreva a busca de vizinhos pelo cosseno, a ferramenta para inspecionar uma tabela de embeddings.

### Instruções

1. Escreva `vizinhos(E, idx, k)` calculando a similaridade de cosseno entre a linha `idx` de `E` e todas as linhas. Uma linha nula tem similaridade 0 com qualquer outra (nada de `nan`).
2. Ordene da maior similaridade para a menor, sem incluir o próprio `idx`; em caso de empate, vem primeiro o menor índice.
3. Devolva uma lista de `int` com os `k` primeiros (ou todos os outros índices, se `k` for maior que `V - 1`). Não altere `E`.

### Código inicial

```python
import numpy as np


def vizinhos(E, idx, k):
    pass
```

### Solução

```python
import numpy as np


def vizinhos(E, idx, k):
    normas = np.linalg.norm(E, axis=1)
    normas = np.where(normas == 0.0, 1.0, normas)
    U = E / normas[:, None]
    sims = U @ U[idx]
    ordem = np.argsort(-sims, kind="stable")
    return [int(j) for j in ordem if j != idx][:k]
```

### Dicas

1. Divida cada linha pela norma dela e o cosseno vira um produto interno; troque a norma zero por 1 antes de dividir.
2. `np.argsort(-sims, kind="stable")` ordena do maior para o menor e mantém a ordem dos índices nos empates.
3. Tire o `idx` da lista antes de cortar em `k`.

### Verificação

```json
[
  {"id": "ordem-completa", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_E = np.array([[1.0, 0.0], [2.0, 0.0], [0.0, 3.0], [1.0, 1.0], [-1.0, 0.0]])", "expr": "vizinhos(_E, 0, 4)", "expected": [1, 3, 2, 4], "name": "Vizinhos da linha 0: mesma direção, 45 graus, ortogonal, oposta", "hint": "Ordene pelo cosseno, do maior para o menor."},
  {"id": "sem-o-proprio", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_E = np.array([[1.0, 0.0], [2.0, 0.0], [0.0, 3.0], [1.0, 1.0], [-1.0, 0.0]])", "expr": "[i in vizinhos(_E, i, 4) for i in range(5)]", "expected": [false, false, false, false, false], "name": "O próprio índice nunca aparece entre os vizinhos", "hint": "A linha idx tem cosseno 1 com ela mesma: tire-a da lista."},
  {"id": "cosseno-ignora-tamanho", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_E = np.array([[1.0, 0.0], [10.0, 0.0], [1.0, 0.5], [5.0, 5.0]])", "expr": "vizinhos(_E, 0, 3)", "expected": [1, 2, 3], "name": "Linha dez vezes mais longa na mesma direção é a vizinha mais próxima", "hint": "Distância euclidiana e produto interno puro dependem do tamanho dos vetores; o cosseno, não."},
  {"id": "desempate-menor-indice", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_E = np.array([[3.0, 4.0], [6.0, 8.0], [4.0, 3.0], [8.0, 6.0], [12.0, 16.0]])", "expr": "vizinhos(_E, 2, 4)", "expected": [3, 0, 1, 4], "name": "Linhas 0, 1 e 4 empatam: saem na ordem dos índices", "hint": "Use uma ordenação estável sobre as similaridades negadas."},
  {"id": "linha-nula-no-meio", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_E = np.array([[1.0, 0.0], [0.0, 0.0], [-1.0, 0.0], [0.0, 1.0]])", "expr": "vizinhos(_E, 0, 3)", "expected": [1, 3, 2], "name": "Linha nula vale similaridade 0: fica na frente da linha oposta", "hint": "Dividir por norma zero dá nan, e nan vai para o fim da ordenação."},
  {"id": "consulta-e-a-linha-nula", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_E = np.array([[1.0, 0.0], [0.0, 0.0], [-1.0, 0.0], [0.0, 1.0]])", "expr": "vizinhos(_E, 1, 3)", "expected": [0, 2, 3], "name": "Consulta numa linha nula: tudo empata em 0 e vale a ordem dos índices"},
  {"id": "k-um", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_E = np.array([[0.0, 1.0], [1.0, 0.0], [0.1, 1.0], [1.0, 0.2]])", "expr": "[vizinhos(_E, 0, 1), vizinhos(_E, 1, 1), vizinhos(_E, 3, 1)]", "expected": [[2], [3], [1]], "name": "Com k = 1 sai só o vizinho mais próximo", "hint": "Corte a lista ordenada em k elementos."},
  {"id": "k-maior-que-a-tabela", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_E = np.array([[0.0, 1.0], [1.0, 0.0], [0.1, 1.0]])", "expr": "[vizinhos(_E, 2, 10), vizinhos(_E, 2, 0)]", "expected": [[0, 1], []], "name": "k maior que V - 1 devolve todos os outros; k = 0 devolve lista vazia"},
  {"id": "tabela-sorteada", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_E = np.random.default_rng(3).normal(0, 1, (12, 5)) * np.arange(1, 13)[:, None]", "expr": "[vizinhos(_E, 0, 4), vizinhos(_E, 7, 4)]", "expected": [[7, 2, 10, 1], [0, 2, 10, 6]], "name": "Tabela 12 × 5 sorteada, com normas bem diferentes: quatro vizinhos de dois tokens", "hint": "Normalize as linhas antes do produto interno."},
  {"id": "tabela-intacta", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_E = np.array([[3.0, 4.0], [0.0, 0.0], [1.0, 1.0]])\n_copia = _E.copy()\n_v = vizinhos(_E, 0, 2)", "expr": "bool(np.array_equal(_E, _copia))", "expected": true, "name": "A tabela E não é alterada", "hint": "Normalize numa cópia, não com /= em E."}
]
```

### Soluções erradas

```python name="inclui o próprio índice"
import numpy as np


def vizinhos(E, idx, k):
    normas = np.linalg.norm(E, axis=1)
    normas = np.where(normas == 0.0, 1.0, normas)
    U = E / normas[:, None]
    sims = U @ U[idx]
    ordem = np.argsort(-sims, kind="stable")
    return [int(j) for j in ordem][:k]
```

```python name="distância euclidiana sem normalizar"
import numpy as np


def vizinhos(E, idx, k):
    dist = np.linalg.norm(E - E[idx], axis=1)
    ordem = np.argsort(dist, kind="stable")
    return [int(j) for j in ordem if j != idx][:k]
```

```python name="produto interno sem normalizar"
import numpy as np


def vizinhos(E, idx, k):
    sims = E @ E[idx]
    ordem = np.argsort(-sims, kind="stable")
    return [int(j) for j in ordem if j != idx][:k]
```

```python name="linha nula vira nan"
import numpy as np


def vizinhos(E, idx, k):
    normas = np.linalg.norm(E, axis=1)
    U = E / normas[:, None]
    sims = U @ U[idx]
    ordem = np.argsort(-sims, kind="stable")
    return [int(j) for j in ordem if j != idx][:k]
```

```python name="ordem crescente de similaridade"
import numpy as np


def vizinhos(E, idx, k):
    normas = np.linalg.norm(E, axis=1)
    normas = np.where(normas == 0.0, 1.0, normas)
    U = E / normas[:, None]
    sims = U @ U[idx]
    ordem = np.argsort(sims, kind="stable")
    return [int(j) for j in ordem if j != idx][:k]
```

```python name="empate sai pelo maior índice"
import numpy as np


def vizinhos(E, idx, k):
    normas = np.linalg.norm(E, axis=1)
    normas = np.where(normas == 0.0, 1.0, normas)
    U = E / normas[:, None]
    sims = U @ U[idx]
    ordem = np.argsort(sims, kind="stable")[::-1]
    return [int(j) for j in ordem if j != idx][:k]
```

```python name="normaliza a tabela no lugar"
import numpy as np


def vizinhos(E, idx, k):
    normas = np.linalg.norm(E, axis=1)
    normas = np.where(normas == 0.0, 1.0, normas)
    E /= normas[:, None]
    sims = E @ E[idx]
    ordem = np.argsort(-sims, kind="stable")
    return [int(j) for j in ordem if j != idx][:k]
```

## Passo 8 · Quiz · Esparsidade e índices repetidos

### Pergunta

Os 800 nomes de treino do módulo viram 5 145 exemplos com contexto de 3 caracteres, e o vocabulário tem $V = 21$. Guardar os contextos como one-hot em `float64` ocupa um array de forma `(5145, 3, 21)`; guardar como índices `int64` ocupa um de forma `(5145, 3)`. Quantas vezes mais memória o one-hot gasta, e o que acontece com essa razão num vocabulário de 50 000 palavras?

- [ ] 3 vezes mais; a razão não muda, porque depende só do tamanho do contexto.
- [x] 21 vezes mais; a razão passa a ser 50 000, porque cresce junto com $V$.
- [ ] 21 vezes mais; a razão continua 21, porque depende só do número de exemplos.
- [ ] 63 vezes mais; a razão cai, porque palavras são mais raras que caracteres.

> Cada índice (8 bytes) vira $V$ números de 8 bytes, quase todos zero: a razão é o próprio $V$ (2 593 080 bytes contra 123 480). O 3 é o tamanho do contexto e aparece nos dois arrays; o número de exemplos também multiplica os dois lados; 63 conta o contexto duas vezes, e a razão cresce com o vocabulário, não cai.

### Pergunta

Um colega escreveu o backward do embedding assim e testou com o lote abaixo.

```python
import numpy as np

indices = np.array([4, 2, 4, 4])
dout = np.ones((4, 3))
dE = np.zeros((6, 3))
dE[indices] += dout
print(dE[4].tolist(), dE[2].tolist())
```

O que é impresso, e o que isso faz com o treino?

- [ ] `[3.0, 3.0, 3.0] [1.0, 1.0, 1.0]`; o backward está certo.
- [ ] `[0.0, 0.0, 0.0] [1.0, 1.0, 1.0]`; índices repetidos se anulam e o token 4 nunca é atualizado.
- [x] `[1.0, 1.0, 1.0] [1.0, 1.0, 1.0]`; o token 4 recebe um terço do gradiente que devia, sem nenhum erro.
- [ ] O código levanta `IndexError`, porque o índice 4 aparece mais de uma vez.

> Com índices repetidos, `dE[indices] += dout` grava uma vez só em cada linha: a linha 4 fica com 1 em vez de 3. O resultado `[3.0, 3.0, 3.0]` é o de `np.add.at`. As contribuições não se anulam (a última gravação vale), e indexar com repetidos não é erro, o que torna o defeito silencioso.

### Pergunta

Você dividiu os nomes em treino e validação e construiu o vocabulário com `construir_vocabulario(treino)`. Ao codificar a validação, aparece `KeyError: 'k'`. Qual é a decisão correta?

- [ ] Reconstruir o vocabulário com treino e validação juntos, para o erro sumir.
- [ ] Trocar `stoi[c]` por `stoi.get(c, 0)`, para o `k` virar o token `.`.
- [ ] Apagar o `k` de `itos` para manter `stoi` e `itos` alinhados.
- [x] Manter o vocabulário do treino e tratar o caso às claras: descartar ou marcar os nomes com caractere desconhecido e registrar quantos são.

> O vocabulário vem só do treino: juntar a validação cria uma linha de embedding que nenhum gradiente ajustou e faz a validação parecer melhor do que o uso real. Mapear o `k` para o índice 0 ensina ao modelo que o nome acabou ali e esconde o problema. O `k` nem está em `itos`, então não há o que apagar.
