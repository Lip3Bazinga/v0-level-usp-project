---
slug: n6-m2-04-mais-operacoes-e-gradientes
titulo: 'Mais operações: tanh, exp, pow, divisão e relu'
descricao: Estender Valor com funções não lineares e suas derivadas, implementar divisão via pow, comparar tanh 'atômica' com tanh composta de exp.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Adicionar tanh, exp, pow, relu e divisão à classe Valor com _backward corretos
- Mostrar que uma operação composta e uma atômica dão o mesmo gradiente
- Implementar log e a perda logística com Valor
---

## Passo 1 · Leitura · Mais derivadas locais

Com soma, produto e `backward`, o `Valor` já deriva qualquer polinômio. Uma rede precisa de mais: uma ativação não linear (sem ela, a rede inteira seria uma conta linear, como o módulo 1 mostrou), a exponencial da softmax e o logaritmo da entropia cruzada. Cada operação nova segue a mesma receita: calcular a saída, criar o `Valor` com o anterior e escrever o `_backward` com a derivada local.

$$
\frac{d}{dx}\tanh x = 1 - \tanh^2 x, \qquad
\frac{d}{dx} e^x = e^x, \qquad
\frac{d}{dx} x^k = k\,x^{k-1}, \qquad
\frac{d}{dx}\max(0, x) = \begin{cases} 1 & x > 0 \\ 0 & x \le 0 \end{cases}, \qquad
\frac{d}{dx}\ln x = \frac{1}{x}
$$

Duas dessas derivadas se escrevem com a **saída** da própria operação: a da tanh é $1 - t^2$, com $t$ a saída, e a da exponencial é a própria saída. Por isso o `_backward` delas pode reaproveitar o número calculado no forward (`t` ou `saida.dado`) em vez de chamar `math.tanh` ou `math.exp` de novo. Recalcular dá exatamente o mesmo número; reaproveitar só economiza uma conta, e é o que as bibliotecas fazem quando guardam a saída para o backward.

```python
def exp(self):
    saida = Valor(math.exp(self.dado), (self,), "exp")
    def _backward():
        self.grad += saida.dado * saida.grad    # e^x é a própria saída
    ...
```

A ReLU deixa o gradiente passar onde a saída é positiva e o bloqueia onde ela é zero. Em $x = 0$ a derivada não existe, e a convenção, a mesma do resto do nível, é usar 0.

A potência $x^k$ fica restrita a expoentes que são **números**, não `Valor`. Com o expoente fixo, a derivada em relação a $x$ é $k x^{k-1}$; um expoente que também fosse um `Valor` exigiria a derivada em relação a $k$, $x^k \ln x$, que só existe para $x > 0$. O `__pow__` desta lição recusa esse caso com `TypeError`, para que o erro apareça na hora em vez de virar um gradiente errado.

O `math` do Python, diferente do numpy, avisa quando uma conta sai do domínio: `math.exp(1000.0)` levanta `OverflowError: math range error`, e `math.log(0.0)` levanta `ValueError: expected a positive input, got 0.0`. Num `Valor`, o erro aparece no forward, no ponto exato em que o número saiu do lugar.

## Passo 2 · Previsão · tanh atômica e tanh composta

A tanh pode ser calculada direto (`math.tanh`) ou montada com a exponencial, $\tanh x = \frac{e^{2x} - 1}{e^{2x} + 1}$, com a derivada obtida pela regra da cadeia através de $e = e^{2x}$. O programa compara as duas. Leia sem executar e digite o que ele imprime.

### Código
```python
import math


def tanh_atomica(x):
    t = math.tanh(x)
    return t, 1 - t * t


def tanh_composta(x):
    e = math.exp(2 * x)
    t = (e - 1) / (e + 1)
    dt_de = 2 / (e + 1) ** 2
    de_dx = 2 * e
    return t, dt_de * de_dx


for x in [0.0, 30.0, -30.0]:
    t1, g1 = tanh_atomica(x)
    t2, g2 = tanh_composta(x)
    print(x, round(t1, 6), round(g1, 6), round(t2, 6), round(g2, 6))
print(tanh_atomica(400.0))
try:
    tanh_composta(400.0)
except OverflowError:
    print("OverflowError")
```

### Dicas
1. Em $x = 0$, $e = 1$: calcule `dt_de` e `de_dx` com esse valor.
2. Em $x = 30$, a tanh já é 1 em `float`, e a derivada é tão pequena que o arredondamento em 6 casas a zera.
3. `math.exp(800.0)` não cabe num `float`.

### Saída esperada
```text
0.0 0.0 1.0 0.0 1.0
30.0 1.0 0.0 1.0 0.0
-30.0 -1.0 0.0 -1.0 0.0
(1.0, 0.0)
OverflowError
```

## Passo 3 · Exercício · `tanh`, `exp`, `__pow__` e `relu`
modo: lacunas

O código inicial traz o `Valor` da lição anterior, com `backward`, e as quatro operações novas com lacunas (`___`).

### Instruções
1. `tanh()`: a derivada local é $1 - t^2$, com `t` a saída já calculada.
2. `exp()`: a derivada local é a própria saída.
3. `__pow__(k)`: a derivada local é $k x^{k-1}$. O expoente precisa ser um número (`int` ou `float`); com um `Valor`, levanta `TypeError` (já está no código).
4. `relu()`: a saída é o `dado` se ele for positivo e `0.0` senão; o gradiente passa só onde a saída é positiva (em 0, não passa).

### Código inicial
```python
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += ___ * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += ___ * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += ___ * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(___, (self,), "relu")

        def _backward():
            self.grad += ___ * saida.grad

        saida._backward = _backward
        return saida
```

### Solução
```python
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida
```

### Dicas
1. Na tanh, use a saída `t`, não a entrada.
2. Na potência, o expoente da derivada é `k - 1`.
3. Na ReLU, o teste do `_backward` olha a saída e é estrito.

### Verificação
```json
[
  {"id": "tanh", "checkpoint": 1, "kind": "expr", "setup": "x = Valor(0.5)\ny = x.tanh()\ny.backward()", "expr": "[y.dado, x.grad]", "expected": [0.46211715726000974, 0.7864477329659274], "tolerance": 1e-12, "name": "tanh em 0.5: dado tanh(0.5) e grad 1 - tanh²(0.5)", "hint": "A derivada local da tanh usa a própria saída t."},
  {"id": "tanh-saturada", "checkpoint": 1, "kind": "expr", "setup": "x = Valor(10.0)\ny = x.tanh()\ny.backward()", "expr": "x.grad", "expected": 8.244614546626394e-09, "tolerance": 1e-15, "name": "tanh em 10: gradiente quase zero (saturação)"},
  {"id": "tanh-composta", "checkpoint": 1, "kind": "expr", "setup": "def _num(f, xs, h=1e-6):\n    out = []\n    for i in range(len(xs)):\n        mais, menos = list(xs), list(xs)\n        mais[i] += h\n        menos[i] -= h\n        out.append((f(*[Valor(x) for x in mais]).dado - f(*[Valor(x) for x in menos]).dado) / (2 * h))\n    return out\ndef _confere(f, xs):\n    vs = [Valor(x) for x in xs]\n    f(*vs).backward()\n    return [abs(v.grad - n) < 1e-6 * max(1.0, abs(n)) for v, n in zip(vs, _num(f, xs))]\ndef f(x):\n    return (x * 2 + 1).tanh() * 3\n", "expr": "_confere(f, [0.3])", "expected": [true], "name": "3 · tanh(2x + 1) bate com a diferença central"},
  {"id": "exp", "checkpoint": 2, "kind": "expr", "setup": "x = Valor(1.5)\ny = x.exp()\ny.backward()", "expr": "[y.dado, x.grad]", "expected": [4.4816890703380645, 4.4816890703380645], "tolerance": 1e-12, "name": "exp em 1.5: dado e grad iguais a e^1.5", "hint": "A derivada de exp é ela mesma: o dado da saída."},
  {"id": "exp-composta", "checkpoint": 2, "kind": "expr", "setup": "def _num(f, xs, h=1e-6):\n    out = []\n    for i in range(len(xs)):\n        mais, menos = list(xs), list(xs)\n        mais[i] += h\n        menos[i] -= h\n        out.append((f(*[Valor(x) for x in mais]).dado - f(*[Valor(x) for x in menos]).dado) / (2 * h))\n    return out\ndef _confere(f, xs):\n    vs = [Valor(x) for x in xs]\n    f(*vs).backward()\n    return [abs(v.grad - n) < 1e-6 * max(1.0, abs(n)) for v, n in zip(vs, _num(f, xs))]\ndef f(x):\n    return x.exp() * x\n", "expr": "_confere(f, [0.7])", "expected": [true], "name": "x · e^x bate com a diferença central"},
  {"id": "pow-2", "checkpoint": 3, "kind": "expr", "setup": "x = Valor(3.0)\ny = x ** 2\ny.backward()", "expr": "[y.dado, x.grad]", "expected": [9.0, 6.0], "tolerance": 1e-12, "name": "x ** 2 em 3: dado 9 e grad 6", "hint": "A derivada de x^k é k · x^(k-1)."},
  {"id": "pow-3", "checkpoint": 3, "kind": "expr", "setup": "x = Valor(-2.0)\ny = x ** 3\ny.backward()", "expr": "[y.dado, x.grad]", "expected": [-8.0, 12.0], "tolerance": 1e-12, "name": "x ** 3 em -2: dado -8 e grad 12"},
  {"id": "pow-fracionario", "checkpoint": 3, "kind": "expr", "setup": "a = Valor(4.0)\nb = Valor(2.0)\n(a ** 0.5 + b ** -1).backward()", "expr": "[a.grad, b.grad]", "expected": [0.25, -0.25], "tolerance": 1e-12, "name": "Expoentes 0.5 e -1: gradientes 0.25 (raiz de 4) e -0.25 (1/2)"},
  {"id": "pow-valor", "checkpoint": 3, "kind": "expr", "expr": "Valor(2.0) ** Valor(3.0)", "raises": "TypeError", "name": "Expoente Valor levanta TypeError (o enunciado só aceita números)"},
  {"id": "relu-positivo", "checkpoint": 4, "kind": "expr", "setup": "x = Valor(2.0)\ny = x.relu()\ny.backward()", "expr": "[y.dado, x.grad]", "expected": [2.0, 1.0], "tolerance": 1e-12, "name": "relu em 2: dado 2 e grad 1"},
  {"id": "relu-negativo", "checkpoint": 4, "kind": "expr", "setup": "x = Valor(-1.5)\ny = x.relu() * 5\ny.backward()", "expr": "[y.dado, x.grad]", "expected": [0.0, 0.0], "tolerance": 1e-12, "name": "relu em -1.5: dado 0 e nenhum gradiente passa", "hint": "Onde a saída da relu é 0, o gradiente não passa."},
  {"id": "relu-zero", "checkpoint": 4, "kind": "expr", "setup": "x = Valor(0.0)\ny = x.relu()\ny.backward()", "expr": "[y.dado, x.grad]", "expected": [0.0, 0.0], "tolerance": 1e-12, "name": "relu em 0: dado 0 e gradiente 0 (convenção)", "hint": "A comparação com zero é estrita."}
]
```

### Soluções erradas
```python name="tanh com 1 - t"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida
```
```python name="tanh com a entrada no lugar da saída"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - self.dado ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida
```
```python name="derivada da exp igual à entrada"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida
```
```python name="pow com k · x^k"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** k * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida
```
```python name="relu propaga sempre"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += 1.0 * saida.grad

        saida._backward = _backward
        return saida
```
```python name="relu propaga em zero"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (self.dado >= 0) * saida.grad

        saida._backward = _backward
        return saida
```

## Passo 4 · Leitura · Divisão, log e a perda logística

A divisão não precisa de um `_backward` próprio. Como $a / b = a \cdot b^{-1}$, ela sai do produto e da potência:

```python
def __truediv__(self, outro):     # self / outro
    return self * outro ** -1
```

A regra da cadeia faz o resto: o gradiente de $a$ é $b^{-1}$ e o de $b$ é $a \cdot (-1) b^{-2} = -a/b^2$, as derivadas da tabela da m2-01. O `__rtruediv__` cobre `2 / v`, com o número no numerador: é `outro * self ** -1`, e trocar a ordem dá `v / 2`, um número completamente diferente.

O logaritmo ganha um `_backward` próprio, com derivada $1/x$, em que $x$ é a **entrada**. Usar a saída, $1/\ln x$, é um erro fácil de cometer porque na tanh e na exponencial a saída era o que servia. Para entradas fora do domínio, o `math.log` já levanta `ValueError: expected a positive input, got 0.0` (ou `got -1.0`). Esconder o erro com `math.log(abs(x))` troca uma exceção clara por um número sem sentido.

Com isso, a perda logística do Nível 5 cabe num `Valor`. Para um logit $z$ e um rótulo $y \in \{0, 1\}$:

$$
p = \sigma(z) = \frac{1}{1 + e^{-z}}, \qquad
L = -\left[\,y \ln p + (1 - y) \ln(1 - p)\,\right], \qquad
\frac{\partial L}{\partial z} = p - y
$$

O autograd não sabe nada dessa fórmula $p - y$: ele só aplica as derivadas locais da divisão, da exponencial, do log e das somas. Mas o gradiente que sai é exatamente $\sigma(z) - y$, o que você derivou à mão no Nível 5. É a melhor conferência de que as peças estão certas.

A versão em escalares tem um limite numérico. Com $z = 40$, $e^{-40} \approx 4 \cdot 10^{-18}$ é menor que a precisão do `float` perto de 1, e $p$ sai **exatamente** 1.0. Mesmo com $y = 1$, a expressão calcula $\ln(1 - p) = \ln 0$, e o forward para com `ValueError: expected a positive input, got 0.0`. As bibliotecas evitam isso calculando a perda direto do logit, com $\ln(1 + e^{-z})$ e uma versão estável da softmax, como a m3-01 vai mostrar. Aqui, os logits ficam em valores moderados.

## Passo 5 · Exercício · Divisão e log

O código inicial traz o `Valor` com as operações do passo 3. Complete a divisão, o logaritmo e a perda logística.

### Instruções
1. `__truediv__` (`a / b`) e `__rtruediv__` (`2 / a`) funcionam com `Valor` e com números, montados com produto e potência $-1$.
2. `log()` devolve o logaritmo natural com a derivada local $1/x$; para `dado` zero ou negativo, levanta `ValueError` (o `math.log` já faz isso; não o esconda).
3. `perda_logistica_valor(z, y)` recebe um `Valor` `z` e um rótulo `y` (0 ou 1) e devolve o `Valor` $-[y \ln \sigma(z) + (1 - y) \ln(1 - \sigma(z))]$, com $\sigma(z) = 1 / (1 + e^{-z})$ montada com as operações do `Valor`.

### Código inicial
```python
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        pass

    def __rtruediv__(self, outro):
        pass

    def log(self):
        pass


def perda_logistica_valor(z, y):
    pass
```

### Solução
```python
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return self * outro ** -1

    def __rtruediv__(self, outro):
        return outro * self ** -1

    def log(self):
        saida = Valor(math.log(self.dado), (self,), "log")

        def _backward():
            self.grad += (1 / self.dado) * saida.grad

        saida._backward = _backward
        return saida


def perda_logistica_valor(z, y):
    p = 1 / (1 + (-z).exp())
    return -(y * p.log() + (1 - y) * (1 - p).log())
```

### Dicas
1. `a / b` é `a * b ** -1`; em `2 / a`, quem vai para o denominador é o `Valor`.
2. A derivada do log usa a entrada, `self.dado`.
3. $e^{-z}$ é `(-z).exp()`; o sinal de menos da perda vale para a soma inteira.

### Verificação
```json
[
  {"id": "div", "checkpoint": 1, "kind": "expr", "setup": "a, b = Valor(6.0), Valor(3.0)\nq = a / b\nq.backward()", "expr": "[q.dado, a.grad, b.grad]", "expected": [2.0, 0.3333333333333333, -0.6666666666666666], "tolerance": 1e-12, "name": "6 / 3: dado 2, gradientes 1/3 e -6/9", "hint": "a / b é a * b ** -1; a regra da cadeia faz o resto."},
  {"id": "div-numero", "checkpoint": 1, "kind": "expr", "setup": "a = Valor(6.0)\nq = a / 4\nq.backward()", "expr": "[q.dado, a.grad]", "expected": [1.5, 0.25], "tolerance": 1e-12, "name": "Valor(6.0) / 4: dado 1.5 e grad 0.25"},
  {"id": "rdiv", "checkpoint": 1, "kind": "expr", "setup": "a = Valor(4.0)\nr = 2 / a\nr.backward()", "expr": "[r.dado, a.grad]", "expected": [0.5, -0.125], "tolerance": 1e-12, "name": "2 / Valor(4.0): dado 0.5 e grad -2/16", "hint": "Em 2 / a, o Valor é o denominador."},
  {"id": "div-numerico", "checkpoint": 1, "kind": "expr", "setup": "def _num(f, xs, h=1e-6):\n    out = []\n    for i in range(len(xs)):\n        mais, menos = list(xs), list(xs)\n        mais[i] += h\n        menos[i] -= h\n        out.append((f(*[Valor(x) for x in mais]).dado - f(*[Valor(x) for x in menos]).dado) / (2 * h))\n    return out\ndef _confere(f, xs):\n    vs = [Valor(x) for x in xs]\n    f(*vs).backward()\n    return [abs(v.grad - n) < 1e-6 * max(1.0, abs(n)) for v, n in zip(vs, _num(f, xs))]\ndef f(a, b):\n    return (a * a + b) / (b - a)\n", "expr": "_confere(f, [1.5, 4.0])", "expected": [true, true], "name": "(a² + b) / (b - a) bate com a diferença central"},
  {"id": "log", "checkpoint": 2, "kind": "expr", "setup": "x = Valor(2.0)\ny = x.log()\ny.backward()", "expr": "[y.dado, x.grad]", "expected": [0.6931471805599453, 0.5], "tolerance": 1e-12, "name": "log em 2: dado ln 2 e grad 1/2", "hint": "A derivada de ln x é 1/x, com x a entrada."},
  {"id": "log-composta", "checkpoint": 2, "kind": "expr", "setup": "def _num(f, xs, h=1e-6):\n    out = []\n    for i in range(len(xs)):\n        mais, menos = list(xs), list(xs)\n        mais[i] += h\n        menos[i] -= h\n        out.append((f(*[Valor(x) for x in mais]).dado - f(*[Valor(x) for x in menos]).dado) / (2 * h))\n    return out\ndef _confere(f, xs):\n    vs = [Valor(x) for x in xs]\n    f(*vs).backward()\n    return [abs(v.grad - n) < 1e-6 * max(1.0, abs(n)) for v, n in zip(vs, _num(f, xs))]\ndef f(x):\n    return (x * x + 1).log() * x\n", "expr": "_confere(f, [0.7])", "expected": [true], "name": "x · ln(x² + 1) bate com a diferença central"},
  {"id": "log-zero", "checkpoint": 2, "kind": "expr", "expr": "Valor(0.0).log()", "raises": "ValueError", "name": "log de 0 levanta ValueError"},
  {"id": "log-negativo", "checkpoint": 2, "kind": "expr", "expr": "Valor(-1.0).log()", "raises": "ValueError", "name": "log de -1 levanta ValueError", "hint": "O logaritmo só existe para números positivos: não esconda o erro."},
  {"id": "perda-y1", "checkpoint": 3, "kind": "expr", "setup": "z = Valor(2.0)\nL = perda_logistica_valor(z, 1)\nL.backward()", "expr": "[L.dado, z.grad]", "expected": [0.12692801104297263, -0.11920292202211769], "tolerance": 1e-12, "name": "z = 2, y = 1: perda ln(1 + e⁻²) e grad σ(2) - 1", "hint": "Com y = 1, a perda é -ln σ(z)."},
  {"id": "perda-y0", "checkpoint": 3, "kind": "expr", "setup": "z = Valor(0.5)\nL = perda_logistica_valor(z, 0)\nL.backward()", "expr": "[L.dado, z.grad]", "expected": [0.9740769841801068, 0.6224593312018546], "tolerance": 1e-12, "name": "z = 0.5, y = 0: perda -ln(1 - σ(0.5)) e grad σ(0.5)", "hint": "Com y = 0, a perda é -ln(1 - σ(z))."},
  {"id": "perda-grad", "checkpoint": 3, "kind": "expr", "setup": "z = Valor(-1.3)\nL = perda_logistica_valor(z, 1)\nL.backward()", "expr": "z.grad", "expected": -0.7858349830425586, "tolerance": 1e-12, "name": "z = -1.3, y = 1: o grad de z é σ(z) - y, como no Nível 5"},
  {"id": "perda-tipo", "checkpoint": 3, "kind": "expr", "expr": "type(perda_logistica_valor(Valor(0.0), 1)).__name__", "expected": "Valor", "name": "Devolve um Valor (para poder chamar backward)"}
]
```

### Soluções erradas
```python name="__truediv__ com a ordem trocada"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return outro * self ** -1

    def __rtruediv__(self, outro):
        return outro * self ** -1

    def log(self):
        saida = Valor(math.log(self.dado), (self,), "log")

        def _backward():
            self.grad += (1 / self.dado) * saida.grad

        saida._backward = _backward
        return saida


def perda_logistica_valor(z, y):
    p = 1 / (1 + (-z).exp())
    return -(y * p.log() + (1 - y) * (1 - p).log())
```
```python name="__rtruediv__ com a ordem trocada"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return self * outro ** -1

    def __rtruediv__(self, outro):
        return self * outro ** -1

    def log(self):
        saida = Valor(math.log(self.dado), (self,), "log")

        def _backward():
            self.grad += (1 / self.dado) * saida.grad

        saida._backward = _backward
        return saida


def perda_logistica_valor(z, y):
    p = 1 / (1 + (-z).exp())
    return -(y * p.log() + (1 - y) * (1 - p).log())
```
```python name="log com a derivada pela saída"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return self * outro ** -1

    def __rtruediv__(self, outro):
        return outro * self ** -1

    def log(self):
        saida = Valor(math.log(self.dado), (self,), "log")

        def _backward():
            self.grad += (1 / saida.dado) * saida.grad

        saida._backward = _backward
        return saida


def perda_logistica_valor(z, y):
    p = 1 / (1 + (-z).exp())
    return -(y * p.log() + (1 - y) * (1 - p).log())
```
```python name="log sem o gradiente de cima"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return self * outro ** -1

    def __rtruediv__(self, outro):
        return outro * self ** -1

    def log(self):
        saida = Valor(math.log(self.dado), (self,), "log")

        def _backward():
            self.grad += 1 / self.dado

        saida._backward = _backward
        return saida


def perda_logistica_valor(z, y):
    p = 1 / (1 + (-z).exp())
    return -(y * p.log() + (1 - y) * (1 - p).log())
```
```python name="log que esconde o domínio com abs"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return self * outro ** -1

    def __rtruediv__(self, outro):
        return outro * self ** -1

    def log(self):
        saida = Valor(math.log(abs(self.dado)), (self,), "log")

        def _backward():
            self.grad += (1 / self.dado) * saida.grad

        saida._backward = _backward
        return saida


def perda_logistica_valor(z, y):
    p = 1 / (1 + (-z).exp())
    return -(y * p.log() + (1 - y) * (1 - p).log())
```
```python name="perda sem o sinal de menos"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return self * outro ** -1

    def __rtruediv__(self, outro):
        return outro * self ** -1

    def log(self):
        saida = Valor(math.log(self.dado), (self,), "log")

        def _backward():
            self.grad += (1 / self.dado) * saida.grad

        saida._backward = _backward
        return saida


def perda_logistica_valor(z, y):
    p = 1 / (1 + (-z).exp())
    return y * p.log() + (1 - y) * (1 - p).log()
```
```python name="sigmoide com exp(z)"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return self * outro ** -1

    def __rtruediv__(self, outro):
        return outro * self ** -1

    def log(self):
        saida = Valor(math.log(self.dado), (self,), "log")

        def _backward():
            self.grad += (1 / self.dado) * saida.grad

        saida._backward = _backward
        return saida


def perda_logistica_valor(z, y):
    p = 1 / (1 + z.exp())
    return -(y * p.log() + (1 - y) * (1 - p).log())
```
```python name="y e 1 - y trocados"
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return self * outro ** -1

    def __rtruediv__(self, outro):
        return outro * self ** -1

    def log(self):
        saida = Valor(math.log(self.dado), (self,), "log")

        def _backward():
            self.grad += (1 / self.dado) * saida.grad

        saida._backward = _backward
        return saida


def perda_logistica_valor(z, y):
    p = 1 / (1 + (-z).exp())
    return -((1 - y) * p.log() + y * (1 - p).log())
```

## Passo 6 · Leitura · Grafo mais longo, mesma matemática

A tanh pode entrar no `Valor` de dois jeitos: como uma operação **atômica**, com o `_backward` de derivada $1 - t^2$, ou **composta** das operações que já existem:

```python
e = (2 * x).exp()
t = (e - 1) / (e + 1)
```

O `backward` da composta não sabe que aquilo é uma tanh. Ele aplica as derivadas locais da multiplicação, da exponencial, das somas e da potência $-1$, uma por uma, e o gradiente que chega em `x` é o mesmo $1 - t^2$, a menos do último dígito do `float`. A regra da cadeia garante isso: derivar uma composição é multiplicar as derivadas das partes, e o resultado não depende de como a função foi dividida.

A diferença está no **tamanho do grafo**. A tanh atômica tem 2 nós, `x` e a saída. A composta tem 10: `x`, as constantes 2, $-1$ e 1, o produto `2 * x`, a exponencial, as duas somas, a potência $-1$ da divisão e o produto final. A sigmoide composta, `1 / (1 + (-x).exp())`, tem 9. Cada nó é um objeto Python com cinco atributos (um deles, uma closure), criado no forward e percorrido no backward. Numa rede, multiplicado por cada neurônio de cada camada e por cada exemplo, isso pesa: é o custo que o módulo 4 elimina trocando os escalares por matrizes.

Há também uma diferença **numérica**. A tanh atômica de 400 dá 1.0; a composta calcula $e^{800}$, que não cabe num `float`, e o forward para com `OverflowError: math range error`. A mesma matemática, escrita de outro jeito, pode quebrar nos extremos. É por isso que as bibliotecas oferecem as ativações como operações atômicas, com derivadas e implementações estáveis, mesmo quando elas poderiam ser compostas.

A comparação continua útil como teste: se a versão composta e a atômica dão o mesmo `grad` em vários pontos, a derivada escrita à mão na atômica está certa. É uma conferência que não precisa de diferenças finitas.

## Passo 7 · Exercício · Funções compostas

O arquivo `valor.py` traz o `Valor` com todas as operações desta lição. Escreva as duas funções no `main.py`, sem usar a `tanh` do `Valor` nem o `math`.

### Instruções
1. `tanh_composta(x)` recebe um `Valor` e devolve o `Valor` $\frac{e^{2x} - 1}{e^{2x} + 1}$, com o mesmo `dado` e o mesmo gradiente da tanh atômica.
2. `sigmoide_composta(x)` recebe um `Valor` e devolve o `Valor` $\frac{1}{1 + e^{-x}}$.
3. As duas só usam as operações do `Valor` (`exp`, `+`, `-`, `*`, `/`): o resultado fica ligado a `x` no grafo, sem nenhum nó `tanh`.

### Código inicial
```python
from valor import Valor


def tanh_composta(x):
    pass


def sigmoide_composta(x):
    pass
```
```text path=valor.py
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return self * outro ** -1

    def __rtruediv__(self, outro):
        return outro * self ** -1

    def log(self):
        saida = Valor(math.log(self.dado), (self,), "log")

        def _backward():
            self.grad += (1 / self.dado) * saida.grad

        saida._backward = _backward
        return saida
```

### Solução
```python
from valor import Valor


def tanh_composta(x):
    e = (2 * x).exp()
    return (e - 1) / (e + 1)


def sigmoide_composta(x):
    return 1 / (1 + (-x).exp())
```
```text path=valor.py
import math


class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op
        self._backward = lambda: None

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida

    def __radd__(self, outro):
        return self + outro

    def __rmul__(self, outro):
        return self * outro

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"

    def backward(self):
        ordem = []
        visitados = set()

        def visitar(v):
            if v not in visitados:
                visitados.add(v)
                for anterior in v._anteriores:
                    visitar(anterior)
                ordem.append(v)

        visitar(self)
        self.grad = 1.0
        for v in reversed(ordem):
            v._backward()

    def tanh(self):
        t = math.tanh(self.dado)
        saida = Valor(t, (self,), "tanh")

        def _backward():
            self.grad += (1 - t ** 2) * saida.grad

        saida._backward = _backward
        return saida

    def exp(self):
        saida = Valor(math.exp(self.dado), (self,), "exp")

        def _backward():
            self.grad += saida.dado * saida.grad

        saida._backward = _backward
        return saida

    def __pow__(self, k):
        if not isinstance(k, (int, float)):
            raise TypeError("o expoente precisa ser um número (int ou float)")
        saida = Valor(self.dado ** k, (self,), f"**{k}")

        def _backward():
            self.grad += k * self.dado ** (k - 1) * saida.grad

        saida._backward = _backward
        return saida

    def relu(self):
        saida = Valor(self.dado if self.dado > 0 else 0.0, (self,), "relu")

        def _backward():
            self.grad += (saida.dado > 0) * saida.grad

        saida._backward = _backward
        return saida

    def __truediv__(self, outro):
        return self * outro ** -1

    def __rtruediv__(self, outro):
        return outro * self ** -1

    def log(self):
        saida = Valor(math.log(self.dado), (self,), "log")

        def _backward():
            self.grad += (1 / self.dado) * saida.grad

        saida._backward = _backward
        return saida
```

### Dicas
1. Calcule $e^{2x}$ uma vez e use o mesmo `Valor` no numerador e no denominador.
2. $e^{-x}$ é a exponencial de `-x`.
3. Um número calculado com `math` vira um `Valor` solto, sem anteriores: o gradiente não chega a `x`.

### Verificação
```json
[
  {"id": "tanh-05", "checkpoint": 1, "kind": "expr", "setup": "x = Valor(0.5)\nt = tanh_composta(x)\nt.backward()", "expr": "[t.dado, x.grad]", "expected": [0.46211715726000974, 0.7864477329659274], "tolerance": 1e-12, "name": "tanh_composta em 0.5: o mesmo dado e o mesmo grad da tanh atômica", "hint": "tanh(x) = (e^(2x) - 1) / (e^(2x) + 1)."},
  {"id": "tanh-negativo", "checkpoint": 1, "kind": "expr", "setup": "x = Valor(-2.0)\nt = tanh_composta(x)\nt.backward()", "expr": "[t.dado, x.grad]", "expected": [-0.9640275800758169, 0.07065082485316443], "tolerance": 1e-12, "name": "tanh_composta em -2"},
  {"id": "tanh-zero", "checkpoint": 1, "kind": "expr", "setup": "x = Valor(0.0)\nt = tanh_composta(x)\nt.backward()", "expr": "[t.dado, x.grad]", "expected": [0.0, 1.0], "tolerance": 1e-12, "name": "tanh_composta em 0: dado 0 e grad 1"},
  {"id": "tanh-como-atomica", "checkpoint": 1, "kind": "expr", "setup": "def _par(x):\n    a, b = Valor(x), Valor(x)\n    tanh_composta(a).backward()\n    b.tanh().backward()\n    return abs(a.grad - b.grad) < 1e-12\n", "expr": "[_par(x) for x in [-3.0, -0.7, 0.2, 1.1, 4.0]]", "expected": [true, true, true, true, true], "name": "Em cinco pontos, o grad da composta é igual ao da tanh atômica"},
  {"id": "tanh-sem-atomica", "checkpoint": 3, "kind": "expr", "setup": "def _todos(raiz):\n    vistos, pilha = {}, [raiz]\n    while pilha:\n        v = pilha.pop()\n        if id(v) not in vistos:\n            vistos[id(v)] = v\n            pilha.extend(v._anteriores)\n    return list(vistos.values())\nx = Valor(0.5)\nt = tanh_composta(x)\nt.backward()", "expr": "['tanh' not in {v._op for v in _todos(t)}, 'exp' in {v._op for v in _todos(t)}, len(_todos(t)) > 2]", "expected": [true, true, true], "name": "O grafo da composta passa por exp, sem nenhum nó tanh", "hint": "Monte a tanh com exp, +, - e / sobre Valor; a tanh atômica e o math ficam de fora."},
  {"id": "sig-zero", "checkpoint": 2, "kind": "expr", "setup": "x = Valor(0.0)\ns = sigmoide_composta(x)\ns.backward()", "expr": "[s.dado, x.grad]", "expected": [0.5, 0.25], "tolerance": 1e-12, "name": "sigmoide_composta em 0: dado 0.5 e grad 0.25", "hint": "σ(x) = 1 / (1 + e^(-x)); a derivada é σ(1 - σ)."},
  {"id": "sig-2", "checkpoint": 2, "kind": "expr", "setup": "x = Valor(2.0)\ns = sigmoide_composta(x)\ns.backward()", "expr": "[s.dado, x.grad]", "expected": [0.8807970779778823, 0.10499358540350662], "tolerance": 1e-12, "name": "sigmoide_composta em 2"},
  {"id": "sig-negativo", "checkpoint": 2, "kind": "expr", "setup": "x = Valor(-3.0)\ns = sigmoide_composta(x)\ns.backward()", "expr": "[s.dado, x.grad]", "expected": [0.04742587317756678, 0.04517665973091214], "tolerance": 1e-12, "name": "sigmoide_composta em -3"},
  {"id": "sig-grafo", "checkpoint": 3, "kind": "expr", "setup": "def _todos(raiz):\n    vistos, pilha = {}, [raiz]\n    while pilha:\n        v = pilha.pop()\n        if id(v) not in vistos:\n            vistos[id(v)] = v\n            pilha.extend(v._anteriores)\n    return list(vistos.values())\nx = Valor(1.0)\ns = sigmoide_composta(x)\ns.backward()", "expr": "['exp' in {v._op for v in _todos(s)}, any(v is x for v in _todos(s))]", "expected": [true, true], "name": "A sigmoide composta passa por exp e continua ligada a x no grafo"},
  {"id": "tipos", "checkpoint": 3, "kind": "expr", "expr": "[type(tanh_composta(Valor(0.3))).__name__, type(sigmoide_composta(Valor(0.3))).__name__]", "expected": ["Valor", "Valor"], "name": "As duas devolvem Valor"}
]
```

### Soluções erradas
```python name="tanh com e^(-2x)"
from valor import Valor


def tanh_composta(x):
    e = (-2 * x).exp()
    return (e - 1) / (e + 1)


def sigmoide_composta(x):
    return 1 / (1 + (-x).exp())
```
```python name="tanh com e^x, sem o 2"
from valor import Valor


def tanh_composta(x):
    e = x.exp()
    return (e - 1) / (e + 1)


def sigmoide_composta(x):
    return 1 / (1 + (-x).exp())
```
```python name="tanh com a fração invertida"
from valor import Valor


def tanh_composta(x):
    e = (2 * x).exp()
    return (e + 1) / (e - 1)


def sigmoide_composta(x):
    return 1 / (1 + (-x).exp())
```
```python name="usa a tanh atômica"
from valor import Valor


def tanh_composta(x):
    return x.tanh()


def sigmoide_composta(x):
    return 1 / (1 + (-x).exp())
```
```python name="sigmoide com e^x"
from valor import Valor


def tanh_composta(x):
    e = (2 * x).exp()
    return (e - 1) / (e + 1)


def sigmoide_composta(x):
    return 1 / (1 + x.exp())
```
```python name="sigmoide calculada com math, fora do grafo"
import math
from valor import Valor


def tanh_composta(x):
    e = (2 * x).exp()
    return (e - 1) / (e + 1)


def sigmoide_composta(x):
    return Valor(1 / (1 + math.exp(-x.dado)))
```

## Passo 8 · Quiz · Derivadas locais

### Pergunta
Uma ReLU foi escrita com este `_backward`:

```python
def _backward():
    self.grad += saida.grad
```

Num neurônio cuja pré-ativação é $-2$ em todos os exemplos, o que acontece no treino?
- [ ] Nada de diferente: em $-2$ a saída é 0, então o gradiente que passa também é 0
- [x] O peso recebe gradiente como se a ReLU fosse a identidade, embora a saída não dependa dele ali
- [ ] O `backward` levanta um erro, porque a derivada da ReLU não existe em $-2$
- [ ] O gradiente dobra, porque a ReLU repassa duas vezes
> A saída da ReLU é 0 para qualquer entrada negativa, então mexer na pré-ativação não muda nada, e o gradiente certo é 0. Esse `_backward` repassa `saida.grad` mesmo assim, e os pesos são empurrados por uma conta que não influencia a perda. A derivada não existe só em 0, e lá a convenção é 0; não há erro nem repasse duplo.

### Pergunta
Com `x = Valor(3.0)`, o `backward` de `x ** 2` deixa `x.grad = 18.0`. Qual linha do `__pow__` está errada?
- [ ] `saida = Valor(self.dado ** k, (self,), ...)`, porque o forward deveria dar 6
- [x] `self.grad += k * self.dado ** k * saida.grad`, que deveria ter `k - 1` no expoente
- [ ] `self.grad += k * self.dado ** (k - 1) * saida.grad`, que deveria somar `saida.dado`
- [ ] Nenhuma: $x^2$ em 3 tem derivada 18
> A derivada de $x^2$ é $2x = 6$. $18 = 2 \cdot 3^2$ é $k x^k$, a fórmula com o expoente errado. O forward de $3^2$ é 9, certo. A terceira alternativa é a linha certa, que dá 6.

### Pergunta
`tanh_composta(Valor(400.0))`, montada com `(2 * x).exp()`, para com `OverflowError: math range error`, enquanto `Valor(400.0).tanh()` dá 1.0. Por quê?
- [ ] A composta tem um erro de sinal que só aparece para $x$ grande
- [ ] O `backward` da composta estoura, porque o grafo tem 10 nós
- [x] A composta calcula $e^{800}$ no forward, que não cabe num `float`; a atômica usa `math.tanh`, que trata os extremos
- [ ] `math.exp` não aceita argumentos maiores que 100
> O maior `float` é perto de $1{,}8 \cdot 10^{308}$, e $e^{800} \approx 10^{347}$: o `math.exp` levanta `OverflowError` já no forward, antes de qualquer backward. A matemática das duas é a mesma, e com $x$ moderado os `grad` coincidem. `math.exp` aceita até cerca de 709,78; o limite não é 100.
