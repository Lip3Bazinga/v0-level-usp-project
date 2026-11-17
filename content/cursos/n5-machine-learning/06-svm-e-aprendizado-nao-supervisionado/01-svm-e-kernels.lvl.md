---
slug: n5-m6-01-svm-e-kernels
titulo: 'SVM: margem máxima e kernels'
descricao: Margem, vetores de suporte, C como troca margem-erro, o truque do kernel (RBF, polinomial) e a necessidade de escala.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Explicar a margem máxima e o papel de C e identificar os vetores de suporte
- Usar SVC com kernels linear e RBF e ajustar C e gamma por validação
- Implementar a perda hinge com gradiente para um SVM linear simples
---

## Passo 1 · Leitura · A maior margem

Uma fábrica fictícia mede duas grandezas de cada peça e quer separar as aprovadas das rejeitadas com uma reta. Quando as duas nuvens não se tocam, existem infinitas retas que acertam o treino inteiro, e a regressão logística do módulo 3 escolhe uma delas pela verossimilhança. A **máquina de vetores de suporte** (SVM, *support vector machine*) escolhe a reta que fica o mais longe possível dos pontos mais próximos de cada lado: a de **margem máxima**. Uma peça nova que caia perto da fronteira tem mais chance de cair do lado certo quando a faixa vazia em volta da reta é larga.

Com rótulos $y_i \in \{-1, +1\}$ e $f(x) = w \cdot x + b$, a SVM pede $y_i f(x_i) \ge 1$ para todo ponto: as retas $f = -1$ e $f = +1$ delimitam uma faixa de largura $2 / \lVert w \rVert$, e alargar a faixa é diminuir $\lVert w \rVert$. Quando as nuvens se sobrepõem, o pedido não tem solução, e a **margem suave** troca a exigência por uma multa, a **perda hinge**:

$$
\min_{w,\,b}\ \frac{1}{2}\lVert w \rVert^2 + C \sum_{i=1}^{n} \max\bigl(0,\ 1 - y_i\,(w \cdot x_i + b)\bigr)
$$

Um ponto do lado certo e fora da faixa não paga nada; um ponto dentro da faixa paga o que falta para chegar à borda; um ponto do lado errado paga mais de 1. O hiperparâmetro $C$ é o preço da multa. Com $C$ grande, cada violação custa caro e a faixa estreita até quase não sobrar erro no treino; com $C$ pequeno, a faixa alarga e aceita violações. Por isso $C$ age como o **inverso** da regularização, igual ao `C` da `LogisticRegression` e ao contrário do $\lambda$ do ridge. Ler ao contrário ("C grande regulariza mais") é o erro mais comum com SVM.

Os pontos na borda, dentro da faixa ou do lado errado são os **vetores de suporte**: a reta só depende deles, e tirar do treino qualquer outro ponto não muda nada. O `SVC` do scikit-learn aceita rótulos quaisquer (0/1, textos); a convenção $\pm 1$ é só das contas.

```python
from sklearn.svm import SVC

modelo = SVC(kernel="linear", C=1.0).fit(X, y)
modelo.support_                     # índices dos vetores de suporte no treino
modelo.n_support_                   # quantos de cada classe
modelo.coef_, modelo.intercept_     # w e b (só no kernel linear)
```

## Passo 2 · Previsão · Vetores de suporte com C pequeno e grande

O programa treina dois SVMs lineares em seis pontos escritos à mão, três de cada classe, e mostra quais pontos viraram vetores de suporte. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np
from sklearn.svm import SVC

X = np.array([[0, 0], [1, 0], [0, 1], [3, 3], [4, 3], [3, 4]])
y = np.array([-1, -1, -1, 1, 1, 1])
for C in [100, 0.01]:
    m = SVC(kernel="linear", C=C).fit(X, y)
    print(C, m.support_.tolist(), m.n_support_.tolist())
m = SVC(kernel="linear", C=100).fit(X, y)
print(np.round(m.coef_, 3).tolist(), round(float(m.intercept_[0]), 3), round(float(2 / np.linalg.norm(m.coef_)), 3))
print(m.predict([[2, 2], [1.5, 1.5]]).tolist())
```

### Dicas
1. Com $C = 100$, a multa é tão cara que a faixa fica vazia: os vetores de suporte são o ponto mais próximo de cada nuvem na direção $(1, 1)$, e `support_` lista primeiro os da classe $-1$.
2. As bordas passam por $x_1 + x_2 = 1$ e $x_1 + x_2 = 6$, então a fronteira é $x_1 + x_2 = 3{,}5$; com $w = (a, a)$, as condições $f = -1$ na primeira borda e $f = +1$ na segunda dão $a = 0{,}4$ e $b = -1{,}4$. A largura é a distância entre as bordas.
3. Com $C = 0{,}01$, violar a faixa quase não custa nada: $w$ encolhe, a faixa engole todos os pontos, e todos viram vetores de suporte.

### Saída esperada
```text
100 [1, 2, 3] [2, 1]
0.01 [0, 1, 2, 3, 4, 5] [3, 3]
[[0.4, 0.4]] -1.4 3.536
[1, -1]
```

## Passo 3 · Exercício · Perda hinge
modo: lacunas

Complete as lacunas (`___`) da função que calcula o objetivo do SVM linear para uns `w` e `b` dados.

### Instruções
1. `y` pode vir com rótulos 0/1 ou −1/+1: converta para sinais, com +1 para os rótulos positivos e −1 para os outros.
2. A margem de cada ponto é o sinal dele vezes $w \cdot x + b$.
3. A multa de cada ponto é $\max(0, 1 - \text{margem})$.
4. `perda_hinge(w, b, X, y, C)` devolve, como `float`, metade do quadrado da norma de `w` mais `C` vezes a **soma** das multas; o `b` não é regularizado.

### Código inicial
```python
import numpy as np


def perda_hinge(w, b, X, y, C):
    w = np.asarray(w, dtype=float)
    X = np.asarray(X, dtype=float)
    sinais = ___
    margens = ___
    multas = ___
    return float(0.5 * ___ + C * ___)
```

### Solução
```python
import numpy as np


def perda_hinge(w, b, X, y, C):
    w = np.asarray(w, dtype=float)
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    margens = sinais * (X @ w + b)
    multas = np.maximum(0.0, 1.0 - margens)
    return float(0.5 * (w @ w) + C * multas.sum())
```

### Dicas
1. O `np.where` troca cada rótulo pelo sinal certo de uma vez.
2. O `np.maximum` compara elemento a elemento com zero; o `max` do Python não serve para arrays.
3. O quadrado da norma de `w` é o produto escalar de `w` com ele mesmo.

### Verificação
```json
[
  {"id": "tres-pontos", "checkpoint": 4, "kind": "call", "function": "perda_hinge", "args": [[1.0, 0.0], 0.0, [[2.0, 0.0], [0.5, 0.0], [-1.0, 0.0]], [1, 1, -1], 1.0], "expected": 1.0, "tolerance": 1e-09, "name": "w = (1, 0), b = 0: só o ponto dentro da faixa paga multa (0.5), mais 0.5 de regularização", "hint": "Margem de cada ponto: y vezes (w·x + b). A multa é max(0, 1 - margem); some as multas e acrescente metade da norma de w ao quadrado."},
  {"id": "rotulos-zero-um", "checkpoint": 1, "kind": "call", "function": "perda_hinge", "args": [[1.0, 0.0], 0.0, [[2.0, 0.0], [0.5, 0.0], [-1.0, 0.0]], [1, 1, 0], 1.0], "expected": 1.0, "tolerance": 1e-09, "name": "Os mesmos pontos com rótulos 0/1 dão a mesma perda", "hint": "Converta y antes da conta: positivo vira +1, o resto vira -1. Com o rótulo 0, a margem do ponto seria 0 e ele pagaria multa 1."},
  {"id": "lado-errado", "checkpoint": 3, "kind": "call", "function": "perda_hinge", "args": [[1.0, 0.0], 0.0, [[-1.0, 0.0]], [1], 1.0], "expected": 2.5, "tolerance": 1e-09, "name": "Um ponto do lado errado paga mais de 1 (margem -1, multa 2)", "hint": "1 - (-1) = 2: a multa cresce com a distância do lado errado."},
  {"id": "fora-da-faixa", "checkpoint": 3, "kind": "call", "function": "perda_hinge", "args": [[0.5, 0.5], -1.0, [[3.0, 3.0], [-2.0, 0.0], [5.0, 1.0]], [1, -1, 1], 10.0], "expected": 0.25, "tolerance": 1e-09, "name": "Pontos fora da faixa, do lado certo, não pagam nada: sobra 0.5 * ||w||²", "hint": "Com margem acima de 1, a multa é zero e não pode virar negativa."},
  {"id": "c-zero", "checkpoint": 4, "kind": "call", "function": "perda_hinge", "args": [[3.0, 4.0], 0.0, [[1.0, 0.0]], [-1], 0.0], "expected": 12.5, "tolerance": 1e-09, "name": "Com C = 0, a perda é só a regularização: 0.5 * (3² + 4²)", "hint": "O termo de regularização é metade do quadrado da norma de w."},
  {"id": "b-nao-regulariza", "checkpoint": 4, "kind": "call", "function": "perda_hinge", "args": [[0.0, 0.0], 5.0, [[1.0, 1.0]], [1], 1.0], "expected": 0.0, "tolerance": 1e-09, "name": "O intercepto b não entra na regularização", "hint": "Só w é penalizado; b desloca a reta sem custo."},
  {"id": "soma-nao-media", "checkpoint": 4, "kind": "call", "function": "perda_hinge", "args": [[0.0, 0.0], 0.0, [[1.0, 0.0], [2.0, 0.0], [3.0, 0.0], [4.0, 0.0]], [1, 1, -1, -1], 2.0], "expected": 8.0, "tolerance": 1e-09, "name": "Com w = 0, cada um dos 4 pontos paga 1, e C = 2 multiplica a soma", "hint": "As multas são somadas, não tiradas a média."},
  {"id": "otimo-do-svc", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.svm import SVC\nrng = np.random.default_rng(1)\nX = np.vstack([rng.normal([0, 0], 1.0, size=(30, 2)), rng.normal([2, 2], 1.0, size=(30, 2))])\ny = np.repeat([-1, 1], 30)\nref = SVC(kernel='linear', C=1.0).fit(X, y)\nw0, b0 = ref.coef_[0], float(ref.intercept_[0])\nbase = perda_hinge(w0, b0, X, y, 1.0)\nrng = np.random.default_rng(0)\noutras = [perda_hinge(w0 + d, b0 + e, X, y, 1.0) for d, e in zip(rng.normal(0, 0.05, size=(20, 2)), rng.normal(0, 0.05, 20))]", "expr": "bool(min(outras) >= base - 1e-6)", "expected": true, "name": "Na reta do SVC(kernel='linear', C=1) a sua perda é menor que em 20 retas vizinhas", "hint": "O SVC minimiza 0.5 * ||w||² + C * soma das multas: com a fórmula certa, mexer em w ou b só aumenta a perda."},
  {"id": "tipo", "checkpoint": 4, "kind": "call", "function": "perda_hinge", "args": [[1.0], 0.0, [[1.0]], [1], 1.0], "expected": 0.5, "tolerance": 1e-09, "name": "Um ponto exatamente na borda (margem 1) não paga multa"}
]
```

### Soluções erradas
```python name="rótulos 0/1 usados sem converter"
import numpy as np


def perda_hinge(w, b, X, y, C):
    w = np.asarray(w, dtype=float)
    X = np.asarray(X, dtype=float)
    sinais = np.asarray(y, dtype=float)
    margens = sinais * (X @ w + b)
    multas = np.maximum(0.0, 1.0 - margens)
    return float(0.5 * (w @ w) + C * multas.sum())
```
```python name="multa sem o max"
import numpy as np


def perda_hinge(w, b, X, y, C):
    w = np.asarray(w, dtype=float)
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    margens = sinais * (X @ w + b)
    multas = 1.0 - margens
    return float(0.5 * (w @ w) + C * multas.sum())
```
```python name="norma sem o quadrado"
import numpy as np


def perda_hinge(w, b, X, y, C):
    w = np.asarray(w, dtype=float)
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    margens = sinais * (X @ w + b)
    multas = np.maximum(0.0, 1.0 - margens)
    return float(0.5 * np.linalg.norm(w) + C * multas.sum())
```
```python name="regulariza o intercepto"
import numpy as np


def perda_hinge(w, b, X, y, C):
    w = np.asarray(w, dtype=float)
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    margens = sinais * (X @ w + b)
    multas = np.maximum(0.0, 1.0 - margens)
    return float(0.5 * (w @ w + b * b) + C * multas.sum())
```
```python name="média das multas no lugar da soma"
import numpy as np


def perda_hinge(w, b, X, y, C):
    w = np.asarray(w, dtype=float)
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    margens = sinais * (X @ w + b)
    multas = np.maximum(0.0, 1.0 - margens)
    return float(0.5 * (w @ w) + C * multas.mean())
```
```python name="margem sem o rótulo"
import numpy as np


def perda_hinge(w, b, X, y, C):
    w = np.asarray(w, dtype=float)
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    margens = X @ w + b
    multas = np.maximum(0.0, 1.0 - margens)
    return float(0.5 * (w @ w) + C * multas.sum())
```

## Passo 4 · Leitura · Subgradiente da hinge

O `SVC` resolve o problema do passo 1 por um método próprio de otimização com restrições, mas o mesmo objetivo pode ser minimizado com o gradiente descendente do módulo 2. Há um detalhe: a multa $\max(0, 1 - m)$ tem um bico em $m = 1$, onde a derivada não existe. Nesses casos se usa um **subgradiente**, qualquer inclinação entre as duas laterais do bico; aqui, a convenção é tratar o ponto com margem exatamente 1 como fora da faixa (inclinação zero). Chamando de $A$ o conjunto dos pontos **ativos**, os que têm margem menor que 1, as derivadas do objetivo $J$ são:

$$
\nabla_w J = w - C \sum_{i \in A} y_i\, x_i
\qquad
\frac{\partial J}{\partial b} = -C \sum_{i \in A} y_i
$$

O termo $w$ vem da regularização $\tfrac12 \lVert w \rVert^2$ e puxa os pesos para zero; a soma vem das multas e empurra a reta para longe dos pontos ativos. Um ponto fora da faixa, do lado certo, não entra na soma, e por isso a solução final só depende dos vetores de suporte. O $b$ só aparece nas multas: somar $b$ ao gradiente dele é regularizar o intercepto, o que puxa a fronteira para a origem sem motivo.

Cada época faz o passo $w \leftarrow w - \eta\, \nabla_w J$ e $b \leftarrow b - \eta\, \partial J / \partial b$, com todos os pontos de uma vez:

```python
margens = sinais * (X @ w + b)
ativos = margens < 1
grad_w = w - C * (sinais[ativos] @ X[ativos])
grad_b = -C * sinais[ativos].sum()
w, b = w - taxa * grad_w, b - taxa * grad_b
```

Como o objetivo usa a **soma** das multas, o tamanho do gradiente cresce com $n$ e com $C$: com 80 pontos e $C = 1$, uma taxa de 0,001 por 3 000 épocas chega a menos de 1 % do mínimo do `SVC`. Usar só os pontos do lado errado ($m < 0$, a regra do perceptron) parece parecido e não é: partindo de $w = 0$, nenhum ponto tem margem negativa, e o modelo nunca sai do lugar. Em conjuntos grandes, o `SGDClassifier(loss="hinge")` faz a mesma conta com mini-lotes.

## Passo 5 · Exercício · SVM linear do zero

Escreva o SVM linear por subgradiente e conte os vetores de suporte do `SVC` para vários valores de `C`. O arquivo `pecas.py` gera as peças fictícias que os casos usam.

### Instruções
1. `svm_linear(X, y, C, taxa, epocas)` converte `y` para −1/+1 (positivo vira +1) e começa com `w` zero (um peso por coluna) e `b = 0.0`.
2. Em cada época, com todos os pontos, calcula as margens, separa os pontos com margem menor que 1 e dá um passo de tamanho `taxa` contra o subgradiente do passo 4: `w - C * soma(y_i x_i)` para `w` e `-C * soma(y_i)` para `b`, os dois somados só sobre os pontos ativos.
3. Devolve a tupla `(w, b)`, com `w` como array e `b` como `float`; com taxa e épocas suficientes, as previsões pelo sinal de `X @ w + b` concordam com as do `SVC(kernel="linear", C=C)`.
4. `contar_vetores_de_suporte(X, y, Cs)` devolve uma lista de `int` com o número total de vetores de suporte (das duas classes) de um `SVC(kernel="linear", C=C)` para cada `C` da lista.

### Código inicial
```python
import numpy as np
from sklearn.svm import SVC


def svm_linear(X, y, C, taxa, epocas):
    pass


def contar_vetores_de_suporte(X, y, Cs):
    pass
```
```text path=pecas.py
import numpy as np


def gerar_pecas(n, semente, separacao=2.5):
    rng = np.random.default_rng(semente)
    metade = n // 2
    X = np.vstack([rng.normal([0, 0], 1.0, size=(metade, 2)),
                   rng.normal([separacao, separacao], 1.0, size=(n - metade, 2))])
    y = np.repeat([-1, 1], [metade, n - metade])
    return X.round(3), y
```

### Solução
```python
import numpy as np
from sklearn.svm import SVC


def svm_linear(X, y, C, taxa, epocas):
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        margens = sinais * (X @ w + b)
        ativos = margens < 1
        grad_w = w - C * (sinais[ativos] @ X[ativos])
        grad_b = -C * sinais[ativos].sum()
        w = w - taxa * grad_w
        b = b - taxa * grad_b
    return w, float(b)


def contar_vetores_de_suporte(X, y, Cs):
    return [int(SVC(kernel="linear", C=C).fit(X, y).n_support_.sum()) for C in Cs]
```
```text path=pecas.py
import numpy as np


def gerar_pecas(n, semente, separacao=2.5):
    rng = np.random.default_rng(semente)
    metade = n // 2
    X = np.vstack([rng.normal([0, 0], 1.0, size=(metade, 2)),
                   rng.normal([separacao, separacao], 1.0, size=(n - metade, 2))])
    y = np.repeat([-1, 1], [metade, n - metade])
    return X.round(3), y
```

### Dicas
1. Uma máscara booleana `ativos` seleciona as linhas de `X` e os sinais que entram na soma; `sinais[ativos] @ X[ativos]` faz a soma de $y_i x_i$ de uma vez.
2. O gradiente de `b` não tem o termo de regularização.
3. `n_support_` tem um número por classe; o total é a soma.

### Verificação
```json
[
  {"id": "duas-epocas", "checkpoint": 2, "kind": "expr", "setup": "w, b = svm_linear([[1, 2], [3, 1], [-1, -1]], [1, 1, -1], 1.0, 0.1, 2)", "expr": "[[round(float(v), 9) for v in w], round(b, 9)]", "expected": [[0.55, 0.46], 0.0], "tolerance": 1e-09, "name": "Três pontos, taxa 0.1, duas épocas: w = (0.55, 0.46) e b = 0", "hint": "Na 1.ª época todos têm margem 0 (< 1) e entram no gradiente; na 2.ª só o terceiro ponto. grad_w = w - C * soma(y_i x_i) dos ativos; grad_b = -C * soma(y_i), sem termo de regularização."},
  {"id": "uma-epoca", "checkpoint": 2, "kind": "expr", "setup": "w, b = svm_linear([[1, 2], [3, 1], [-1, -1]], [1, 1, -1], 1.0, 0.1, 1)", "expr": "[[round(float(v), 9) for v in w], round(b, 9)]", "expected": [[0.5, 0.4], 0.1], "tolerance": 1e-09, "name": "Depois de uma época, partindo de w = 0 e b = 0: w = (0.5, 0.4) e b = 0.1", "hint": "Com w = 0, toda margem vale 0 e todo ponto está ativo; o passo é w - taxa * grad."},
  {"id": "zero-epocas", "checkpoint": 1, "kind": "expr", "setup": "w, b = svm_linear([[1, 2], [3, 1]], [1, -1], 1.0, 0.1, 0)", "expr": "[w.tolist(), b]", "expected": [[0.0, 0.0], 0.0], "name": "Sem épocas, w e b continuam zero"},
  {"id": "rotulos-zero-um", "checkpoint": 1, "kind": "expr", "setup": "w1, b1 = svm_linear([[1, 2], [3, 1], [-1, -1]], [1, 1, 0], 1.0, 0.1, 2)", "expr": "[[round(float(v), 9) for v in w1], round(b1, 9)]", "expected": [[0.55, 0.46], 0.0], "tolerance": 1e-09, "name": "Rótulos 0/1 dão o mesmo resultado que -1/+1", "hint": "Converta y para -1/+1 antes do laço."},
  {"id": "concorda-treino", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.svm import SVC\nfrom pecas import gerar_pecas\nX, y = gerar_pecas(80, 0)\nXn, yn = gerar_pecas(40, 7)\nref = SVC(kernel='linear', C=1.0).fit(X, y)\nw, b = svm_linear(X, y, 1.0, 0.001, 3000)\n", "expr": "bool(np.mean(np.where(X @ w + b >= 0, 1, -1) == ref.predict(X)) >= 0.98)", "expected": true, "name": "80 peças, C = 1, taxa 0.001, 3000 épocas: pelo menos 98% das previsões iguais às do SVC(kernel='linear', C=1)", "hint": "Compara-se o sinal de X @ w + b com o predict do SVC linear. Confira o subgradiente: só os pontos com margem menor que 1 entram, e o termo w vem da regularização."},
  {"id": "concorda-novos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.svm import SVC\nfrom pecas import gerar_pecas\nX, y = gerar_pecas(80, 0)\nXn, yn = gerar_pecas(40, 7)\nref = SVC(kernel='linear', C=1.0).fit(X, y)\nw, b = svm_linear(X, y, 1.0, 0.001, 3000)\n", "expr": "bool(np.mean(np.where(Xn @ w + b >= 0, 1, -1) == ref.predict(Xn)) >= 0.98)", "expected": true, "name": "Em 40 peças novas, pelo menos 98% das previsões iguais às do SVC"},
  {"id": "objetivo", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.svm import SVC\nfrom pecas import gerar_pecas\nX, y = gerar_pecas(80, 0)\nXn, yn = gerar_pecas(40, 7)\nref = SVC(kernel='linear', C=1.0).fit(X, y)\nw, b = svm_linear(X, y, 1.0, 0.001, 3000)\ndef objetivo(w, b):\n    return 0.5 * w @ w + 1.0 * np.maximum(0, 1 - y * (X @ w + b)).sum()\n", "expr": "bool(objetivo(w, b) <= 1.02 * objetivo(ref.coef_[0], float(ref.intercept_[0])))", "expected": true, "name": "O objetivo 0.5 * ||w||² + C * soma das multas fica a menos de 2% do mínimo do SVC", "hint": "Compara-se o valor da perda hinge regularizada nos seus w e b com o valor no coef_ e intercept_ do SVC. Regularizar o b ou trocar a soma pela média leva a outro mínimo."},
  {"id": "tipos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.svm import SVC\nfrom pecas import gerar_pecas\nX, y = gerar_pecas(80, 0)\nXn, yn = gerar_pecas(40, 7)\nref = SVC(kernel='linear', C=1.0).fit(X, y)\nw, b = svm_linear(X, y, 1.0, 0.001, 3000)\n", "expr": "[type(w).__name__, list(w.shape), type(b).__name__]", "expected": ["ndarray", [2], "float"], "name": "Devolve w como array de forma (d,) e b como float"},
  {"id": "conta-por-c", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nX = np.array([[0, 0], [1, 0], [0, 1], [3, 3], [4, 3], [3, 4]])\ny = np.array([-1, -1, -1, 1, 1, 1])", "expr": "contar_vetores_de_suporte(X, y, [0.01, 100])", "expected": [6, 3], "name": "Os seis pontos da Previsão: 6 vetores de suporte com C = 0.01 e 3 com C = 100", "hint": "Some os vetores de suporte das duas classes (n_support_ tem um número por classe) de um SVC com kernel linear."},
  {"id": "conta-decresce", "checkpoint": 4, "kind": "expr", "setup": "from pecas import gerar_pecas\nX, y = gerar_pecas(80, 0)\nr = contar_vetores_de_suporte(X, y, [0.01, 0.1, 1.0, 10.0])", "expr": "r", "expected": [52, 25, 15, 12], "name": "80 peças: o número de vetores de suporte cai conforme C cresce", "hint": "SVC(kernel='linear', C=C) para cada C, somando n_support_."},
  {"id": "conta-tipo", "checkpoint": 4, "kind": "expr", "setup": "from pecas import gerar_pecas\nX, y = gerar_pecas(40, 3)\nr = contar_vetores_de_suporte(X, y, [1.0])", "expr": "[type(r).__name__, type(r[0]).__name__]", "expected": ["list", "int"], "name": "Devolve uma lista de int, um por valor de C"}
]
```

### Soluções erradas
```python name="regulariza o intercepto"
import numpy as np
from sklearn.svm import SVC


def svm_linear(X, y, C, taxa, epocas):
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        margens = sinais * (X @ w + b)
        ativos = margens < 1
        grad_w = w - C * (sinais[ativos] @ X[ativos])
        grad_b = b - C * sinais[ativos].sum()
        w = w - taxa * grad_w
        b = b - taxa * grad_b
    return w, float(b)


def contar_vetores_de_suporte(X, y, Cs):
    return [int(SVC(kernel="linear", C=C).fit(X, y).n_support_.sum()) for C in Cs]
```
```python name="rótulos 0/1 usados sem converter"
import numpy as np
from sklearn.svm import SVC


def svm_linear(X, y, C, taxa, epocas):
    X = np.asarray(X, dtype=float)
    sinais = np.asarray(y, dtype=float)
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        margens = sinais * (X @ w + b)
        ativos = margens < 1
        grad_w = w - C * (sinais[ativos] @ X[ativos])
        grad_b = -C * sinais[ativos].sum()
        w = w - taxa * grad_w
        b = b - taxa * grad_b
    return w, float(b)


def contar_vetores_de_suporte(X, y, Cs):
    return [int(SVC(kernel="linear", C=C).fit(X, y).n_support_.sum()) for C in Cs]
```
```python name="só os pontos do lado errado entram"
import numpy as np
from sklearn.svm import SVC


def svm_linear(X, y, C, taxa, epocas):
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        margens = sinais * (X @ w + b)
        ativos = margens < 0
        grad_w = w - C * (sinais[ativos] @ X[ativos])
        grad_b = -C * sinais[ativos].sum()
        w = w - taxa * grad_w
        b = b - taxa * grad_b
    return w, float(b)


def contar_vetores_de_suporte(X, y, Cs):
    return [int(SVC(kernel="linear", C=C).fit(X, y).n_support_.sum()) for C in Cs]
```
```python name="sem o termo da regularização"
import numpy as np
from sklearn.svm import SVC


def svm_linear(X, y, C, taxa, epocas):
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        margens = sinais * (X @ w + b)
        ativos = margens < 1
        grad_w = -C * (sinais[ativos] @ X[ativos])
        grad_b = -C * sinais[ativos].sum()
        w = w - taxa * grad_w
        b = b - taxa * grad_b
    return w, float(b)


def contar_vetores_de_suporte(X, y, Cs):
    return [int(SVC(kernel="linear", C=C).fit(X, y).n_support_.sum()) for C in Cs]
```
```python name="passo no sentido do gradiente"
import numpy as np
from sklearn.svm import SVC


def svm_linear(X, y, C, taxa, epocas):
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        margens = sinais * (X @ w + b)
        ativos = margens < 1
        grad_w = w - C * (sinais[ativos] @ X[ativos])
        grad_b = -C * sinais[ativos].sum()
        w = w + taxa * grad_w
        b = b + taxa * grad_b
    return w, float(b)


def contar_vetores_de_suporte(X, y, Cs):
    return [int(SVC(kernel="linear", C=C).fit(X, y).n_support_.sum()) for C in Cs]
```
```python name="média no lugar da soma"
import numpy as np
from sklearn.svm import SVC


def svm_linear(X, y, C, taxa, epocas):
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        margens = sinais * (X @ w + b)
        ativos = margens < 1
        grad_w = w - C * (sinais[ativos] @ X[ativos]) / len(X)
        grad_b = -C * sinais[ativos].sum() / len(X)
        w = w - taxa * grad_w
        b = b - taxa * grad_b
    return w, float(b)


def contar_vetores_de_suporte(X, y, Cs):
    return [int(SVC(kernel="linear", C=C).fit(X, y).n_support_.sum()) for C in Cs]
```
```python name="conta só a primeira classe"
import numpy as np
from sklearn.svm import SVC


def svm_linear(X, y, C, taxa, epocas):
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        margens = sinais * (X @ w + b)
        ativos = margens < 1
        grad_w = w - C * (sinais[ativos] @ X[ativos])
        grad_b = -C * sinais[ativos].sum()
        w = w - taxa * grad_w
        b = b - taxa * grad_b
    return w, float(b)


def contar_vetores_de_suporte(X, y, Cs):
    return [int(SVC(kernel="linear", C=C).fit(X, y).n_support_[0]) for C in Cs]
```
```python name="kernel padrão no lugar do linear"
import numpy as np
from sklearn.svm import SVC


def svm_linear(X, y, C, taxa, epocas):
    X = np.asarray(X, dtype=float)
    sinais = np.where(np.asarray(y) > 0, 1.0, -1.0)
    w = np.zeros(X.shape[1])
    b = 0.0
    for _ in range(epocas):
        margens = sinais * (X @ w + b)
        ativos = margens < 1
        grad_w = w - C * (sinais[ativos] @ X[ativos])
        grad_b = -C * sinais[ativos].sum()
        w = w - taxa * grad_w
        b = b - taxa * grad_b
    return w, float(b)


def contar_vetores_de_suporte(X, y, Cs):
    return [int(SVC(C=C).fit(X, y).n_support_.sum()) for C in Cs]
```

## Passo 6 · Leitura · Kernels e escala

Nos sensores fictícios de uma máquina, a falha acontece quando temperatura **ou** vibração se afastam do normal: as falhas cercam as leituras normais, e nenhuma reta separa as classes. Com 400 leituras, um `SVC(kernel="linear")` padronizado acerta 0,63 do teste, exatamente a fração de leituras sem falha: ele desiste e prevê sempre a classe majoritária.

O **truque do kernel** resolve isso sem criar colunas novas. A função de decisão do SVM pode ser escrita só com produtos escalares entre pontos, $f(x) = \sum_i \alpha_i y_i \,(x_i \cdot x) + b$, com $\alpha_i \neq 0$ só nos vetores de suporte. Trocar o produto escalar por outra semelhança $K(x_i, x)$ equivale a separar com uma reta num espaço de atributos maior, sem calcular esse espaço. O kernel padrão do `SVC` é o RBF (gaussiano):

$$
K(x, x') = \exp\bigl(-\gamma\, \lVert x - x' \rVert^2\bigr)
$$

Cada vetor de suporte vira um "morro" em volta de si, e `gamma` controla a largura: com `gamma` pequeno, cada ponto influencia uma região grande e a fronteira é suave; com `gamma` grande, a influência fica restrita à vizinhança imediata, e o modelo decora o treino. Nos sensores, padronizados e com $C = 1$:

| `gamma` | acurácia no treino | acurácia no teste | vetores de suporte (de 300) |
|---|---|---|---|
| 0,01 | 0,630 | 0,63 | 226 |
| 0,1 | 0,863 | 0,86 | 171 |
| 1 | 0,920 | 0,84 | 161 |
| 100 | 0,997 | 0,64 | 300 |

`C` e `gamma` interagem e se escolhem juntos, por validação cruzada numa grade logarítmica. Com kernel RBF, o modelo não tem `coef_`: pedir dá `AttributeError: coef_ is only available when using a linear kernel`.

A **escala** é obrigatória. O RBF usa distâncias, e a pressão, medida em pascal (perto de 101 000, com desvio de 1 500), engole a temperatura e a vibração: sem padronizar, o mesmo `SVC()` prevê "sem falha" para todas as 100 leituras do teste. A padronização vai dentro de um `Pipeline`, ajustada só no treino.

Dois custos. O treino do `SVC` cresce mais que linearmente com $n$: 0,014 s com 1 000 linhas, 0,045 s com 2 000 e 0,169 s com 4 000; o `LinearSVC` levou 0,002 s nos três e é o caminho para conjuntos enormes. E `SVC(probability=True)` treina uma calibração extra, com validação cruzada interna, só para oferecer `predict_proba`: ligue apenas se for usar as probabilidades.

## Passo 7 · Exercício · C, gamma e escala

Escolha `C` e `gamma` por validação cruzada e meça o efeito da padronização nos sensores fictícios. O arquivo `sensores.py` gera os dados (temperatura em °C, vibração em mm/s, pressão em Pa; rótulo 1 para falha).

### Instruções
1. `grade_c_gamma(X, y, Cs, gammas, k)` testa todas as combinações de `C` (laço de fora) e `gamma` (laço de dentro) e devolve a tupla `(C, gamma)` de maior nota.
2. A nota de um par é a média do `cross_val_score` com `cv=k` de `make_pipeline(StandardScaler(), SVC(C=C, gamma=gamma))`; num empate, fica o primeiro par testado.
3. `efeito_da_escala(X, y, semente)` divide com `train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)` e devolve `{"sem": ..., "com": ...}`: a acurácia no teste de um `SVC()` treinado sem padronizar e de `make_pipeline(StandardScaler(), SVC())`, como `float`.

### Código inicial
```python
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


def grade_c_gamma(X, y, Cs, gammas, k):
    pass


def efeito_da_escala(X, y, semente):
    pass
```
```text path=sensores.py
import numpy as np


def gerar_sensores(n, semente):
    rng = np.random.default_rng(semente)
    temperatura = rng.normal(60, 4, n)
    vibracao = rng.normal(3, 0.6, n)
    pressao = rng.normal(101000, 1500, n)
    desvio = ((temperatura - 60) / 4) ** 2 + ((vibracao - 3) / 0.6) ** 2
    falha = (desvio > 2.0) ^ (rng.random(n) < 0.05)
    X = np.column_stack([temperatura, vibracao, pressao]).round(2)
    return X, falha.astype(int)
```

### Solução
```python
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


def grade_c_gamma(X, y, Cs, gammas, k):
    melhor, melhor_nota = None, -1.0
    for C in Cs:
        for gamma in gammas:
            modelo = make_pipeline(StandardScaler(), SVC(C=C, gamma=gamma))
            nota = cross_val_score(modelo, X, y, cv=k).mean()
            if nota > melhor_nota:
                melhor, melhor_nota = (C, gamma), nota
    return melhor


def efeito_da_escala(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
    sem = SVC().fit(X_tr, y_tr).score(X_te, y_te)
    com = make_pipeline(StandardScaler(), SVC()).fit(X_tr, y_tr).score(X_te, y_te)
    return {"sem": float(sem), "com": float(com)}
```
```text path=sensores.py
import numpy as np


def gerar_sensores(n, semente):
    rng = np.random.default_rng(semente)
    temperatura = rng.normal(60, 4, n)
    vibracao = rng.normal(3, 0.6, n)
    pressao = rng.normal(101000, 1500, n)
    desvio = ((temperatura - 60) / 4) ** 2 + ((vibracao - 3) / 0.6) ** 2
    falha = (desvio > 2.0) ^ (rng.random(n) < 0.05)
    X = np.column_stack([temperatura, vibracao, pressao]).round(2)
    return X, falha.astype(int)
```

### Dicas
1. Guarde a melhor nota até agora e troque o par só quando a nota nova for estritamente maior.
2. O `cross_val_score` devolve um array com uma nota por partição; a nota do par é a média.
3. O `Pipeline` ajusta o `StandardScaler` só com o treino de cada partição e de cada divisão.

### Verificação
```json
[
  {"id": "grade", "checkpoint": 2, "kind": "expr", "setup": "from sensores import gerar_sensores\nX, y = gerar_sensores(150, 0)\n", "expr": "list(grade_c_gamma(X, y, [0.1, 1.0, 10.0], [0.01, 0.1, 1.0], 3))", "expected": [10.0, 0.1], "name": "150 leituras, grade 3 × 3, 3 partições: o melhor par (C, gamma)", "hint": "Para cada par, a nota é a média do cross_val_score de make_pipeline(StandardScaler(), SVC(C=C, gamma=gamma)) com cv=k."},
  {"id": "grade-outra", "checkpoint": 2, "kind": "expr", "setup": "from sensores import gerar_sensores\nX, y = gerar_sensores(120, 4)\n", "expr": "list(grade_c_gamma(X, y, [1.0, 100.0], [0.1, 10.0], 3))", "expected": [100.0, 0.1], "name": "120 leituras, grade 2 × 2: o melhor par (C, gamma)", "hint": "A nota de cada par é a média das k partições, com o modelo padronizado dentro do Pipeline."},
  {"id": "grade-empate", "checkpoint": 2, "kind": "expr", "setup": "from sensores import gerar_sensores\nX, y = gerar_sensores(150, 0)\n", "expr": "list(grade_c_gamma(X, y, [0.001], [0.0001, 0.001], 3))", "expected": [0.001, 0.0001], "name": "Empate (os dois pares preveem só a classe majoritária): fica o primeiro par da grade", "hint": "Troque o melhor só quando a nota for estritamente maior."},
  {"id": "grade-tipo", "checkpoint": 1, "kind": "expr", "setup": "from sensores import gerar_sensores\nX, y = gerar_sensores(60, 5)\nr = grade_c_gamma(X, y, [1.0], [0.1], 3)", "expr": "[type(r).__name__, list(r)]", "expected": ["tuple", [1.0, 0.1]], "name": "Devolve a tupla (C, gamma)"},
  {"id": "escala", "checkpoint": 3, "kind": "expr", "setup": "from sensores import gerar_sensores\nX, y = gerar_sensores(300, 1)\n", "expr": "efeito_da_escala(X, y, 0)", "expected": {"sem": 0.6666666666666666, "com": 0.92}, "tolerance": 1e-09, "name": "300 leituras, semente 0: acurácia no teste sem e com padronizar", "hint": "Divida com train_test_split(test_size=0.25, stratify=y, random_state=semente); compare SVC() com make_pipeline(StandardScaler(), SVC()), os dois medidos no teste."},
  {"id": "escala-outra", "checkpoint": 3, "kind": "expr", "setup": "from sensores import gerar_sensores\nX, y = gerar_sensores(200, 2)\n", "expr": "efeito_da_escala(X, y, 3)", "expected": {"sem": 0.64, "com": 0.9}, "tolerance": 1e-09, "name": "200 leituras, semente 3: acurácia no teste sem e com padronizar"},
  {"id": "escala-reprodutivel", "checkpoint": 3, "kind": "expr", "setup": "from sensores import gerar_sensores\nX, y = gerar_sensores(200, 6)\n", "expr": "[efeito_da_escala(X, y, s) == efeito_da_escala(X, y, s) for s in range(4)]", "expected": [true, true, true, true], "name": "A mesma semente dá a mesma divisão e as mesmas acurácias", "hint": "Passe a semente no random_state do train_test_split."},
  {"id": "escala-tipos", "checkpoint": 3, "kind": "expr", "setup": "from sensores import gerar_sensores\nX, y = gerar_sensores(100, 3)\nr = efeito_da_escala(X, y, 0)", "expr": "[sorted(r), type(r['sem']).__name__, type(r['com']).__name__]", "expected": [["com", "sem"], "float", "float"], "name": "Devolve o dicionário {'sem': ..., 'com': ...} com floats"}
]
```

### Soluções erradas
```python name="grade sem padronizar"
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


def grade_c_gamma(X, y, Cs, gammas, k):
    melhor, melhor_nota = None, -1.0
    for C in Cs:
        for gamma in gammas:
            modelo = SVC(C=C, gamma=gamma)
            nota = cross_val_score(modelo, X, y, cv=k).mean()
            if nota > melhor_nota:
                melhor, melhor_nota = (C, gamma), nota
    return melhor


def efeito_da_escala(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
    sem = SVC().fit(X_tr, y_tr).score(X_te, y_te)
    com = make_pipeline(StandardScaler(), SVC()).fit(X_tr, y_tr).score(X_te, y_te)
    return {"sem": float(sem), "com": float(com)}
```
```python name="C e gamma trocados"
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


def grade_c_gamma(X, y, Cs, gammas, k):
    melhor, melhor_nota = None, -1.0
    for C in Cs:
        for gamma in gammas:
            modelo = make_pipeline(StandardScaler(), SVC(C=gamma, gamma=C))
            nota = cross_val_score(modelo, X, y, cv=k).mean()
            if nota > melhor_nota:
                melhor, melhor_nota = (C, gamma), nota
    return melhor


def efeito_da_escala(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
    sem = SVC().fit(X_tr, y_tr).score(X_te, y_te)
    com = make_pipeline(StandardScaler(), SVC()).fit(X_tr, y_tr).score(X_te, y_te)
    return {"sem": float(sem), "com": float(com)}
```
```python name="empate fica com o último"
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


def grade_c_gamma(X, y, Cs, gammas, k):
    melhor, melhor_nota = None, -1.0
    for C in Cs:
        for gamma in gammas:
            modelo = make_pipeline(StandardScaler(), SVC(C=C, gamma=gamma))
            nota = cross_val_score(modelo, X, y, cv=k).mean()
            if nota >= melhor_nota:
                melhor, melhor_nota = (C, gamma), nota
    return melhor


def efeito_da_escala(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
    sem = SVC().fit(X_tr, y_tr).score(X_te, y_te)
    com = make_pipeline(StandardScaler(), SVC()).fit(X_tr, y_tr).score(X_te, y_te)
    return {"sem": float(sem), "com": float(com)}
```
```python name="nota medida no treino"
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


def grade_c_gamma(X, y, Cs, gammas, k):
    melhor, melhor_nota = None, -1.0
    for C in Cs:
        for gamma in gammas:
            modelo = make_pipeline(StandardScaler(), SVC(C=C, gamma=gamma))
            nota = modelo.fit(X, y).score(X, y)
            if nota > melhor_nota:
                melhor, melhor_nota = (C, gamma), nota
    return melhor


def efeito_da_escala(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
    sem = SVC().fit(X_tr, y_tr).score(X_te, y_te)
    com = make_pipeline(StandardScaler(), SVC()).fit(X_tr, y_tr).score(X_te, y_te)
    return {"sem": float(sem), "com": float(com)}
```
```python name="nota só da primeira partição"
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


def grade_c_gamma(X, y, Cs, gammas, k):
    melhor, melhor_nota = None, -1.0
    for C in Cs:
        for gamma in gammas:
            modelo = make_pipeline(StandardScaler(), SVC(C=C, gamma=gamma))
            nota = cross_val_score(modelo, X, y, cv=k)[0]
            if nota > melhor_nota:
                melhor, melhor_nota = (C, gamma), nota
    return melhor


def efeito_da_escala(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
    sem = SVC().fit(X_tr, y_tr).score(X_te, y_te)
    com = make_pipeline(StandardScaler(), SVC()).fit(X_tr, y_tr).score(X_te, y_te)
    return {"sem": float(sem), "com": float(com)}
```
```python name="divisão sem estratificar"
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


def grade_c_gamma(X, y, Cs, gammas, k):
    melhor, melhor_nota = None, -1.0
    for C in Cs:
        for gamma in gammas:
            modelo = make_pipeline(StandardScaler(), SVC(C=C, gamma=gamma))
            nota = cross_val_score(modelo, X, y, cv=k).mean()
            if nota > melhor_nota:
                melhor, melhor_nota = (C, gamma), nota
    return melhor


def efeito_da_escala(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=semente)
    sem = SVC().fit(X_tr, y_tr).score(X_te, y_te)
    com = make_pipeline(StandardScaler(), SVC()).fit(X_tr, y_tr).score(X_te, y_te)
    return {"sem": float(sem), "com": float(com)}
```
```python name="divisão sem semente"
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


def grade_c_gamma(X, y, Cs, gammas, k):
    melhor, melhor_nota = None, -1.0
    for C in Cs:
        for gamma in gammas:
            modelo = make_pipeline(StandardScaler(), SVC(C=C, gamma=gamma))
            nota = cross_val_score(modelo, X, y, cv=k).mean()
            if nota > melhor_nota:
                melhor, melhor_nota = (C, gamma), nota
    return melhor


def efeito_da_escala(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y)
    sem = SVC().fit(X_tr, y_tr).score(X_te, y_te)
    com = make_pipeline(StandardScaler(), SVC()).fit(X_tr, y_tr).score(X_te, y_te)
    return {"sem": float(sem), "com": float(com)}
```
```python name="acurácia medida no treino"
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC


def grade_c_gamma(X, y, Cs, gammas, k):
    melhor, melhor_nota = None, -1.0
    for C in Cs:
        for gamma in gammas:
            modelo = make_pipeline(StandardScaler(), SVC(C=C, gamma=gamma))
            nota = cross_val_score(modelo, X, y, cv=k).mean()
            if nota > melhor_nota:
                melhor, melhor_nota = (C, gamma), nota
    return melhor


def efeito_da_escala(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
    sem = SVC().fit(X_tr, y_tr).score(X_te, y_te)
    com = make_pipeline(StandardScaler(), SVC()).fit(X_tr, y_tr).score(X_tr, y_tr)
    return {"sem": float(sem), "com": float(com)}
```

## Passo 8 · Quiz · C e gamma

### Pergunta
Nos sensores padronizados, um `SVC(C=1, gamma=100)` acerta 0,997 do treino e 0,64 do teste, e todos os 300 pontos do treino são vetores de suporte. O que fazer?
- [ ] Aumentar `C`, para que o modelo erre ainda menos no treino
- [x] Diminuir `gamma` (e escolher o valor por validação cruzada junto com `C`): cada ponto está influenciando só a própria vizinhança, e o modelo decorou o treino
- [ ] Aumentar `gamma`, para a fronteira ficar mais detalhada
- [ ] Ligar `probability=True`, para o modelo calibrar as previsões
> Com `gamma` grande, o "morro" de cada vetor de suporte fica estreito, e a fronteira contorna ponto a ponto: treino quase perfeito e teste perto do chute. Aumentar `gamma` ou `C` aperta ainda mais o ajuste ao treino. `probability=True` só acrescenta uma calibração das probabilidades e não muda a fronteira.

### Pergunta
Uma colega treina `SVC(kernel="linear", C=0.01)` nas peças fictícias e escreve no relatório: "usei C pequeno para o modelo se ajustar com força aos dados". O modelo deixou 52 dos 80 pontos como vetores de suporte. O que está certo?
- [ ] Ela tem razão: C pequeno quer dizer pouca regularização, como o $\lambda$ do ridge
- [ ] O número de vetores de suporte não depende de C, só dos dados
- [x] É o contrário: C pequeno barateia a multa da perda hinge, a faixa alarga e engole muitos pontos; o modelo está mais regularizado, e com C maior ele se ajusta mais ao treino
- [ ] C pequeno faz o SVM ignorar os pontos do lado errado, que deixam de ser vetores de suporte
> $C$ multiplica as multas, não a regularização: é o inverso do $\lambda$. Com $C$ pequeno, violar a faixa custa pouco, $\lVert w \rVert$ encolhe e a faixa fica larga, com muitos pontos dentro dela, que são vetores de suporte (nas peças, 52 com $C = 0{,}01$ e 15 com $C = 1$). Pontos do lado errado sempre pagam multa e sempre são vetores de suporte.

### Pergunta
Um analista treina `SVC()` com `X` cujas colunas são temperatura em °C, vibração em mm/s e pressão em Pa. O modelo prevê "sem falha" para todas as leituras do teste. Para corrigir, ele escreve `X = StandardScaler().fit_transform(X)` e só depois divide em treino e teste. O que dizer?
- [ ] Está certo: padronizar resolve, e a ordem não importa
- [ ] Padronizar não muda nada para o SVC, que já é invariante à escala como as árvores
- [ ] Melhor aumentar `gamma` em vez de padronizar
- [x] O diagnóstico está certo (a pressão domina as distâncias do RBF), mas o escalador precisa ser ajustado só no treino: `make_pipeline(StandardScaler(), SVC())` treinado com o treino, inclusive dentro da validação cruzada
> O kernel RBF compara distâncias, e uma coluna na casa dos 100 000 engole as outras: daí a previsão constante. Padronizar resolve, mas ajustar o `StandardScaler` no conjunto inteiro antes da divisão usa a média e o desvio do teste, um vazamento. Mexer em `gamma` não desfaz a diferença de escala entre as colunas, e o SVM, ao contrário das árvores, depende da escala.
