---
slug: n6-m2-02-a-classe-valor
titulo: 'A classe Valor: dados, gradiente e operações'
descricao: Implementar Valor com __add__, __mul__, __radd__, __rmul__, __neg__, __sub__, registrando os filhos e a função _backward de cada operação.
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
- Implementar a classe Valor com dado, grad, filhos e operação, usando os métodos especiais do Nível 2
- Registrar em cada operação a closure _backward que distribui o gradiente aos filhos
- Construir expressões com Valor e inspecionar o grafo resultante
---

## Passo 1 · Leitura · Um número que lembra de onde veio

Na lição anterior, o backward de $L = (a b + c) f$ foi escrito linha por linha, e cada expressão nova exigiria um código novo. A saída é fazer cada número **registrar a conta que o criou** enquanto o forward acontece. Depois, o backward só precisa percorrer esse registro de trás para frente.

É o que faz a classe `Valor`, no espírito do micrograd, um motor de autograd de uma centena de linhas. Cada objeto guarda cinco coisas:

```python
class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado                       # o número
        self.grad = 0.0                        # dL/d(este número), começa em zero
        self._anteriores = set(_anteriores)    # os Valor que entraram na conta
        self._op = _op                         # o nome da conta: "+", "*"
        self._backward = lambda: None          # como repassar o grad aos anteriores
```

Os métodos especiais do Nível 2 fazem o resto. Quando o Python encontra `a + b` com `a` sendo um `Valor`, ele chama `a.__add__(b)`, que cria o nó de saída e, junto com ele, a função que sabe fazer o backward daquela conta:

```python
    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        saida = Valor(self.dado + outro.dado, (self, outro), "+")

        def _backward():
            self.grad += saida.grad
            outro.grad += saida.grad

        saida._backward = _backward
        return saida
```

A função `_backward` é uma **closure**: ela foi definida dentro de `__add__` e continua enxergando `self`, `outro` e `saida` depois que `__add__` terminou. Chamar `saida._backward()` aplica a regra da cadeia daquele nó: cada anterior recebe o gradiente da saída vezes a derivada local, que na soma vale 1. O `+=` é a acumulação da lição anterior: se o mesmo `Valor` entrou em várias contas, cada uma soma a sua parte.

A primeira linha converte números comuns, para que `a + 1` funcione: o `1` vira um `Valor(1)` sem anteriores, uma folha do grafo. Os anteriores ficam num **conjunto**: em `v * v`, o conjunto tem `v` uma vez só, mas o `_backward` soma nas duas linhas, porque `self` e `outro` são o mesmo objeto. O nome `_anteriores`, com sublinhado, avisa que é um detalhe interno da classe, mas os casos desta lição o usam, porque o enunciado o define.

Repare que nenhum gradiente é calculado no forward: criar `a + b` não mexe em nenhum `grad`. Eles só mudam quando os `_backward` forem chamados.

## Passo 2 · Previsão · O que o grafo guarda

Esta versão do `Valor` só monta o grafo, sem os `_backward`. Leia sem executar e digite o que o programa imprime.

### Código
```python
class Valor:
    def __init__(self, dado, _anteriores=(), _op=""):
        self.dado = dado
        self.grad = 0.0
        self._anteriores = set(_anteriores)
        self._op = _op

    def __add__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        return Valor(self.dado + outro.dado, (self, outro), "+")

    def __mul__(self, outro):
        outro = outro if isinstance(outro, Valor) else Valor(outro)
        return Valor(self.dado * outro.dado, (self, outro), "*")


a = Valor(2.0)
b = Valor(-3.0)
v = a * b + 1.0
print(v.dado, v._op)
print(sorted(x.dado for x in v._anteriores))
m = next(x for x in v._anteriores if x._op == "*")
print(m._op, sorted(x.dado for x in m._anteriores))
print(a.grad, v.grad)
q = a * a
print(len(q._anteriores), q.dado)
```

### Dicas
1. `a * b + 1.0` é `(a * b) + 1.0`: o produto é calculado primeiro e vira um anterior da soma.
2. O `1.0` vira um `Valor` sem anteriores.
3. Um conjunto não guarda o mesmo objeto duas vezes.

### Saída esperada
```text
-5.0 +
[-6.0, 1.0]
* [-3.0, 2.0]
0.0 0.0
1 4.0
```

## Passo 3 · Exercício · `__add__` e `__mul__`
modo: lacunas

Complete as lacunas (`___`) do `Valor`. O `__add__` está quase pronto; o `__mul__` é seu.

### Instruções
1. No `_backward` de `__add__`, cada operando soma ao seu `grad` o gradiente da saída (a derivada local da soma é 1).
2. `__mul__` converte um número comum em `Valor` e cria a saída com o produto dos dois `dado`, os dois operandos como anteriores e `_op` igual a `"*"`. Criar a saída não muda nenhum `grad`.
3. No `_backward` de `__mul__`, cada operando soma ao seu `grad` o `dado` do **outro** operando vezes o `grad` da saída, sempre com `+=`.

### Código inicial
```python
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
            self.grad += ___
            outro.grad += ___

        saida._backward = _backward
        return saida

    def __mul__(self, outro):
        outro = ___
        saida = Valor(___, (self, outro), "*")

        def _backward():
            ___
            ___

        saida._backward = _backward
        return saida
```

### Solução
```python
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
```

### Dicas
1. A derivada local da soma é 1, e a regra da cadeia a multiplica pelo gradiente da saída.
2. No produto, cada fator recebe o valor do outro fator; o gradiente da saída multiplica tudo.
3. Em `v * v`, `self` e `outro` são o mesmo objeto: as duas linhas precisam somar.

### Verificação
```json
[
  {"id": "soma-backward", "checkpoint": 1, "kind": "expr", "setup": "a, b = Valor(2.0), Valor(5.0)\ns = a + b\ns.grad = 3.0\ns._backward()", "expr": "[a.grad, b.grad]", "expected": [3.0, 3.0], "tolerance": 1e-12, "name": "O _backward da soma repassa o gradiente da saída (3) aos dois operandos", "hint": "A derivada local da soma é 1: cada operando recebe saida.grad."},
  {"id": "soma-acumula", "checkpoint": 1, "kind": "expr", "setup": "a, b = Valor(2.0), Valor(5.0)\ns = a + b\ns.grad = 1.0\ns._backward()\ns._backward()", "expr": "[a.grad, b.grad]", "expected": [2.0, 2.0], "tolerance": 1e-12, "name": "Chamar o _backward da soma duas vezes acumula nos operandos"},
  {"id": "mul-dado", "checkpoint": 2, "kind": "expr", "setup": "m = Valor(2.0) * Valor(-3.0)", "expr": "[m.dado, m._op]", "expected": [-6.0, "*"], "name": "Valor(2.0) * Valor(-3.0) tem dado -6.0 e _op '*'"},
  {"id": "mul-numero", "checkpoint": 2, "kind": "expr", "expr": "(Valor(2.0) * 3).dado", "expected": 6.0, "tolerance": 1e-12, "name": "Valor(2.0) * 3: o número vira um Valor", "hint": "Antes de usar outro.dado, transforme um número comum em Valor."},
  {"id": "mul-anteriores", "checkpoint": 2, "kind": "expr", "setup": "m = Valor(2.0) * Valor(-3.0)", "expr": "sorted(x.dado for x in m._anteriores)", "expected": [-3.0, 2.0], "name": "Os anteriores do produto são os dois operandos"},
  {"id": "grad-zero", "checkpoint": 2, "kind": "expr", "setup": "a = Valor(2.0)\nm = a * 4.0", "expr": "[a.grad, m.grad]", "expected": [0.0, 0.0], "name": "Criar o produto não mexe em nenhum grad"},
  {"id": "mul-backward", "checkpoint": 3, "kind": "expr", "setup": "a, b = Valor(2.0), Valor(-3.0)\nm = a * b\nm.grad = 1.0\nm._backward()", "expr": "[a.grad, b.grad]", "expected": [-3.0, 2.0], "tolerance": 1e-12, "name": "a = 2, b = -3, saída com grad 1: a recebe -3 e b recebe 2", "hint": "Cada operando recebe o dado do outro vezes saida.grad."},
  {"id": "mul-gradiente-de-cima", "checkpoint": 3, "kind": "expr", "setup": "a, b = Valor(2.0), Valor(-3.0)\nm = a * b\nm.grad = 2.5\nm._backward()", "expr": "[a.grad, b.grad]", "expected": [-7.5, 5.0], "tolerance": 1e-12, "name": "Com saída de grad 2.5, a derivada local é multiplicada por 2.5", "hint": "O gradiente da saída multiplica a derivada local."},
  {"id": "mul-mesmo-valor", "checkpoint": 3, "kind": "expr", "setup": "v = Valor(3.0)\nq = v * v\nq.grad = 1.0\nq._backward()", "expr": "v.grad", "expected": 6.0, "tolerance": 1e-12, "name": "v * v com v = 3: as duas contribuições somam 6", "hint": "Os dois operandos são o mesmo objeto: cada linha do _backward precisa somar, sem apagar a outra."},
  {"id": "cadeia-manual", "checkpoint": 3, "kind": "expr", "setup": "a, b, c, f = Valor(2.0), Valor(-3.0), Valor(10.0), Valor(-2.0)\ne = a * b\nd = e + c\nL = d * f\nL.grad = 1.0\nL._backward()\nd._backward()\ne._backward()", "expr": "[L.dado, a.grad, b.grad, c.grad, f.grad]", "expected": [-8.0, 6.0, -4.0, -2.0, 4.0], "tolerance": 1e-12, "name": "L = (a * b + c) * f, com os _backward chamados de L para trás"}
]
```

### Soluções erradas
```python name="_backward do produto com = em vez de +="
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
            self.grad = outro.dado * saida.grad
            outro.grad = self.dado * saida.grad

        saida._backward = _backward
        return saida
```
```python name="derivada do produto com o próprio operando"
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
            self.grad += self.dado * saida.grad
            outro.grad += outro.dado * saida.grad

        saida._backward = _backward
        return saida
```
```python name="produto sem o gradiente de cima"
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
            self.grad += outro.dado
            outro.grad += self.dado

        saida._backward = _backward
        return saida
```
```python name="número não convertido em Valor"
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
        outro = outro
        saida = Valor(self.dado * outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida
```
```python name="produto que soma os dados"
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
        saida = Valor(self.dado + outro.dado, (self, outro), "*")

        def _backward():
            self.grad += outro.dado * saida.grad
            outro.grad += self.dado * saida.grad

        saida._backward = _backward
        return saida
```
```python name="soma repassa o dado da saída"
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
            self.grad += saida.dado
            outro.grad += saida.dado

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
```
```python name="soma só com a derivada local"
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
            self.grad += 1.0
            outro.grad += 1.0

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
```

## Passo 4 · Leitura · Números dos dois lados

Com `__add__` e `__mul__`, `a * 2` funciona, porque o Python chama `a.__mul__(2)`. Mas `2 * a` dá:

```text
TypeError: unsupported operand type(s) for *: 'int' and 'Valor'
```

O Python tenta primeiro `int.__mul__(2, a)`, que não sabe o que é um `Valor` e devolve `NotImplemented`. Aí ele tenta o método **refletido** do operando da direita, `a.__rmul__(2)`; como ele não existe, vem o erro. O mesmo vale para `1 + a` e `__radd__`. E `sum(valores)` também precisa de `__radd__`, porque a soma começa em `0`, um `int`: a primeira conta é `0 + valores[0]`.

Na soma e no produto a ordem não importa, então os métodos refletidos só repetem a conta:

```python
    def __rmul__(self, outro):    # outro * self
        return self * outro
```

O resto da aritmética sai do que já existe, sem escrever nenhum `_backward` novo:

| Expressão | Método | Montado como |
|---|---|---|
| `-a` | `__neg__` | `a * -1` |
| `a - b` | `__sub__` | `a + (-b)` |
| `5 - a` | `__rsub__` | `(-a) + 5` |

Como cada conta é feita com `+` e `*`, o grafo ganha os nós intermediários e a regra da cadeia continua valendo sozinha: em `a - b`, o $-1$ que `b` precisa receber aparece porque `-b` é `b * -1`. Se o `__neg__` devolvesse um `Valor(-a.dado)` novo, o resultado estaria certo, mas o nó não estaria ligado a `a`, e o gradiente de `a` ficaria em zero. No `__rsub__`, a ordem importa: `5 - a` é `5 + (-a)`, e não `a - 5`.

Um `__repr__` ajuda a depurar. Sem ele, `print(a)` mostra algo como `<__main__.Valor object at 0x...>`; com ele, mostra `Valor(dado=3.0, grad=0.0)`.

Por fim, `v + v`. O conjunto `_anteriores` fica com `v` uma vez só, e o `_backward` da soma executa `self.grad += saida.grad` e `outro.grad += saida.grad` no **mesmo** objeto: `v.grad` recebe duas vezes, e o gradiente sai 2, como manda a derivada de $2v$. É o `+=` que garante isso; com `=`, a segunda linha apagaria a primeira.

## Passo 5 · Exercício · Completar a aritmética

O `Valor` do passo 3 já está pronto no código inicial. Complete os métodos que faltam, sem escrever nenhum `_backward` novo.

### Instruções
1. `__radd__` faz `1 + v` e `sum([...])` funcionarem.
2. `__rmul__` faz `2 * v` funcionar.
3. `__neg__`, `__sub__` e `__rsub__` funcionam com `Valor` e com números, montados com `+` e `*`, de modo que os gradientes cheguem a todos os operandos.
4. `__repr__` devolve o texto no formato `Valor(dado=3.0, grad=0.0)`.

### Código inicial
```python
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
        pass

    def __rmul__(self, outro):
        pass

    def __neg__(self):
        pass

    def __sub__(self, outro):
        pass

    def __rsub__(self, outro):
        pass

    def __repr__(self):
        pass
```

### Solução
```python
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
```

### Dicas
1. Os métodos refletidos recebem o número em `outro` e o `Valor` em `self`.
2. Negar é multiplicar por -1; subtrair é somar o negativo.
3. Em `10 - v`, quem é negado é o `v`.

### Verificação
```json
[
  {"id": "radd", "checkpoint": 1, "kind": "expr", "expr": "(1 + Valor(3.0)).dado", "expected": 4.0, "tolerance": 1e-12, "name": "1 + Valor(3.0) dá 4.0", "hint": "Com o número à esquerda, o Python chama o __radd__ do Valor."},
  {"id": "sum", "checkpoint": 1, "kind": "expr", "setup": "def _propagar(raiz):\n    ordem, vistos, pilha = [], set(), [(raiz, False)]\n    while pilha:\n        v, pronto = pilha.pop()\n        if pronto:\n            ordem.append(v)\n        elif v not in vistos:\n            vistos.add(v)\n            pilha.append((v, True))\n            pilha.extend((f, False) for f in v._anteriores)\n    raiz.grad = 1.0\n    for v in reversed(ordem):\n        v._backward()\nvs = [Valor(1.0), Valor(2.0), Valor(3.5)]\ns = sum(vs)\n_propagar(s)", "expr": "[s.dado, [v.grad for v in vs]]", "expected": [6.5, [1.0, 1.0, 1.0]], "tolerance": 1e-12, "name": "sum de três Valor: dado 6.5 e gradiente 1 em cada parcela", "hint": "sum começa em 0, um int: a primeira conta é 0 + Valor."},
  {"id": "rmul", "checkpoint": 2, "kind": "expr", "setup": "def _propagar(raiz):\n    ordem, vistos, pilha = [], set(), [(raiz, False)]\n    while pilha:\n        v, pronto = pilha.pop()\n        if pronto:\n            ordem.append(v)\n        elif v not in vistos:\n            vistos.add(v)\n            pilha.append((v, True))\n            pilha.extend((f, False) for f in v._anteriores)\n    raiz.grad = 1.0\n    for v in reversed(ordem):\n        v._backward()\na = Valor(3.0)\ny = 2 * a\n_propagar(y)", "expr": "[y.dado, a.grad]", "expected": [6.0, 2.0], "tolerance": 1e-12, "name": "2 * Valor(3.0): dado 6.0 e gradiente 2", "hint": "Com o número à esquerda, o Python chama o __rmul__ do Valor."},
  {"id": "neg", "checkpoint": 3, "kind": "expr", "setup": "def _propagar(raiz):\n    ordem, vistos, pilha = [], set(), [(raiz, False)]\n    while pilha:\n        v, pronto = pilha.pop()\n        if pronto:\n            ordem.append(v)\n        elif v not in vistos:\n            vistos.add(v)\n            pilha.append((v, True))\n            pilha.extend((f, False) for f in v._anteriores)\n    raiz.grad = 1.0\n    for v in reversed(ordem):\n        v._backward()\na = Valor(3.0)\nn = -a\n_propagar(n)", "expr": "[n.dado, a.grad]", "expected": [-3.0, -1.0], "tolerance": 1e-12, "name": "-a com a = 3: dado -3 e gradiente -1 em a", "hint": "A negação precisa entrar no grafo, como uma multiplicação por -1."},
  {"id": "sub", "checkpoint": 3, "kind": "expr", "setup": "def _propagar(raiz):\n    ordem, vistos, pilha = [], set(), [(raiz, False)]\n    while pilha:\n        v, pronto = pilha.pop()\n        if pronto:\n            ordem.append(v)\n        elif v not in vistos:\n            vistos.add(v)\n            pilha.append((v, True))\n            pilha.extend((f, False) for f in v._anteriores)\n    raiz.grad = 1.0\n    for v in reversed(ordem):\n        v._backward()\na, b = Valor(5.0), Valor(2.0)\ns = a - b\n_propagar(s)", "expr": "[s.dado, a.grad, b.grad]", "expected": [3.0, 1.0, -1.0], "tolerance": 1e-12, "name": "a - b com a = 5 e b = 2: dado 3, gradientes 1 e -1"},
  {"id": "sub-numero", "checkpoint": 3, "kind": "expr", "expr": "(Valor(5.0) - 2).dado", "expected": 3.0, "tolerance": 1e-12, "name": "Valor(5.0) - 2 dá 3.0"},
  {"id": "rsub", "checkpoint": 3, "kind": "expr", "setup": "def _propagar(raiz):\n    ordem, vistos, pilha = [], set(), [(raiz, False)]\n    while pilha:\n        v, pronto = pilha.pop()\n        if pronto:\n            ordem.append(v)\n        elif v not in vistos:\n            vistos.add(v)\n            pilha.append((v, True))\n            pilha.extend((f, False) for f in v._anteriores)\n    raiz.grad = 1.0\n    for v in reversed(ordem):\n        v._backward()\na = Valor(2.0)\nr = 10 - a\n_propagar(r)", "expr": "[r.dado, a.grad]", "expected": [8.0, -1.0], "tolerance": 1e-12, "name": "10 - Valor(2.0): dado 8 e gradiente -1", "hint": "Em 10 - a, o Valor é o segundo operando: a ordem da subtração importa."},
  {"id": "mista", "checkpoint": 3, "kind": "expr", "setup": "def _propagar(raiz):\n    ordem, vistos, pilha = [], set(), [(raiz, False)]\n    while pilha:\n        v, pronto = pilha.pop()\n        if pronto:\n            ordem.append(v)\n        elif v not in vistos:\n            vistos.add(v)\n            pilha.append((v, True))\n            pilha.extend((f, False) for f in v._anteriores)\n    raiz.grad = 1.0\n    for v in reversed(ordem):\n        v._backward()\na, b = Valor(2.0), Valor(-3.0)\ny = 3 * a - b * 2 + 1 - a * a\n_propagar(y)", "expr": "[y.dado, a.grad, b.grad]", "expected": [9.0, -1.0, -2.0], "tolerance": 1e-12, "name": "y = 3a - 2b + 1 - a² com a = 2 e b = -3"},
  {"id": "v-mais-v", "checkpoint": 3, "kind": "expr", "setup": "def _propagar(raiz):\n    ordem, vistos, pilha = [], set(), [(raiz, False)]\n    while pilha:\n        v, pronto = pilha.pop()\n        if pronto:\n            ordem.append(v)\n        elif v not in vistos:\n            vistos.add(v)\n            pilha.append((v, True))\n            pilha.extend((f, False) for f in v._anteriores)\n    raiz.grad = 1.0\n    for v in reversed(ordem):\n        v._backward()\nv = Valor(1.5)\ny = v + v - 1\n_propagar(y)", "expr": "[y.dado, v.grad]", "expected": [2.0, 2.0], "tolerance": 1e-12, "name": "v + v - 1 com v = 1.5: o gradiente de v soma os dois lados"},
  {"id": "repr", "checkpoint": 4, "kind": "expr", "expr": "repr(Valor(3.0))", "expected": "Valor(dado=3.0, grad=0.0)", "name": "repr(Valor(3.0)) é 'Valor(dado=3.0, grad=0.0)'"},
  {"id": "repr-grad", "checkpoint": 4, "kind": "expr", "setup": "def _propagar(raiz):\n    ordem, vistos, pilha = [], set(), [(raiz, False)]\n    while pilha:\n        v, pronto = pilha.pop()\n        if pronto:\n            ordem.append(v)\n        elif v not in vistos:\n            vistos.add(v)\n            pilha.append((v, True))\n            pilha.extend((f, False) for f in v._anteriores)\n    raiz.grad = 1.0\n    for v in reversed(ordem):\n        v._backward()\na = Valor(2.0)\n_propagar(a * a)", "expr": "repr(a)", "expected": "Valor(dado=2.0, grad=4.0)", "name": "O repr mostra o grad depois do backward"}
]
```

### Soluções erradas
```python name="sem __rmul__"
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

    def __neg__(self):
        return self * -1

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"
```
```python name="sem __radd__"
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
```
```python name="__sub__ como self + outro"
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
        return self + outro

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"
```
```python name="__rsub__ com a ordem trocada"
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
        return self - outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"
```
```python name="__neg__ fora do grafo"
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
        return Valor(-self.dado)

    def __sub__(self, outro):
        return self + (-outro)

    def __rsub__(self, outro):
        return (-self) + outro

    def __repr__(self):
        return f"Valor(dado={self.dado}, grad={self.grad})"
```
```python name="__repr__ sem o grad"
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
        return f"Valor(dado={self.dado})"
```

## Passo 6 · Leitura · Visitando o grafo

Uma expressão com `Valor` é um grafo dirigido e acíclico: cada nó aponta para os anteriores dele, e nenhum caminho volta ao ponto de partida, porque um valor só pode usar valores criados antes dele. Para inspecionar o grafo, contar nós ou desenhá-lo, é preciso visitar todos os nós a partir da saída, a **raiz**. É a busca em profundidade (DFS) do Nível 3:

```python
def visitar(v):
    if v in visitados:
        return
    visitados.add(v)
    for anterior in v._anteriores:
        visitar(anterior)
```

O conjunto de visitados é indispensável quando um nó é usado mais de uma vez. Em `e = a * 3` seguido de `y = e + e * a`, o nó `e` é alcançado por dois caminhos, direto pela soma e através do produto `e * a`; `a` também. Sem o conjunto, `e` e tudo abaixo dele seriam visitados duas vezes. Num grafo com muitos nós compartilhados, como uma rede em que cada ativação alimenta vários neurônios, o número de caminhos cresce exponencialmente com a profundidade, e a busca sem visitados não termina.

O conjunto guarda os **objetos**, não os números. Um `Valor` sem `__eq__` próprio é comparado por identidade: `Valor(1.0)` e outro `Valor(1.0)` são dois nós diferentes, com o mesmo dado. Guardar `v.dado` nos visitados confundiria os dois, e um deles sumiria do grafo.

Além dos nós, um desenho do grafo precisa das **arestas**. Aqui, uma aresta é o par `(anterior, no)`: o primeiro entra na conta que gera o segundo, a direção do forward. Cada nó é visitado uma vez e, nessa visita, registra as arestas que chegam nele, uma por anterior. Por isso uma aresta que chega a um nó já visitado por outro caminho continua precisando ser registrada: no exemplo, `e` entra na soma e no produto, e as duas arestas existem.

Em `v * v`, o conjunto `_anteriores` tem `v` uma vez, e o grafo tem 2 nós e 1 aresta. A recursão tem um limite (1 000 chamadas aninhadas no executor), que uma cadeia de 300 produtos não alcança; a lição 3 mostra o que acontece com cadeias mais longas.

## Passo 7 · Exercício · Rastrear o grafo

O arquivo `valor.py` traz o `Valor` dos passos anteriores. Escreva `rastrear` no `main.py`.

### Instruções
1. `rastrear(raiz)` devolve a tupla `(nos, arestas)`, em que `nos` é uma lista com todos os `Valor` alcançáveis a partir de `raiz`, inclusive ela, em qualquer ordem.
2. `arestas` é uma lista de tuplas `(anterior, no)`, uma para cada `anterior` em `no._anteriores`, para todos os nós do grafo.
3. Nenhum nó e nenhuma aresta aparecem duas vezes, mesmo quando um nó é alcançado por mais de um caminho. Dois objetos diferentes com o mesmo `dado` são nós diferentes.

### Código inicial
```python
from valor import Valor


def rastrear(raiz):
    pass
```
```text path=valor.py
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
```

### Solução
```python
from valor import Valor


def rastrear(raiz):
    nos, arestas = [], []
    visitados = set()

    def visitar(v):
        if v in visitados:
            return
        visitados.add(v)
        nos.append(v)
        for anterior in v._anteriores:
            arestas.append((anterior, v))
            visitar(anterior)

    visitar(raiz)
    return nos, arestas
```
```text path=valor.py
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
```

### Dicas
1. Uma função interna recursiva, como a `visitar` da leitura, pode usar as listas e o conjunto da função de fora.
2. Registre as arestas de um nó na única vez em que ele é visitado.
3. Compare objetos, não números: o conjunto de visitados guarda os próprios `Valor`.

### Verificação
```json
[
  {"id": "expressao", "checkpoint": 1, "kind": "expr", "setup": "a, b, c, f = Valor(2.0), Valor(-3.0), Valor(10.0), Valor(-2.0)\nL = (a * b + c) * f\nnos, arestas = rastrear(L)\n", "expr": "[len(nos), len(arestas)]", "expected": [7, 6], "name": "L = (a * b + c) * f: 7 nós e 6 arestas"},
  {"id": "contem-todos", "checkpoint": 1, "kind": "expr", "setup": "a, b, c, f = Valor(2.0), Valor(-3.0), Valor(10.0), Valor(-2.0)\nL = (a * b + c) * f\nnos, arestas = rastrear(L)\n", "expr": "all(any(n is x for n in nos) for x in [a, b, c, f, L])", "expected": true, "name": "nos inclui as quatro entradas e a própria raiz", "hint": "A raiz também é um nó."},
  {"id": "ops", "checkpoint": 1, "kind": "expr", "setup": "a, b, c, f = Valor(2.0), Valor(-3.0), Valor(10.0), Valor(-2.0)\nL = (a * b + c) * f\nnos, arestas = rastrear(L)\n", "expr": "sorted(n._op for n in nos)", "expected": ["", "", "", "", "*", "*", "+"], "name": "As operações dos nós: quatro folhas, dois produtos e uma soma"},
  {"id": "direcao", "checkpoint": 2, "kind": "expr", "setup": "a, b, c, f = Valor(2.0), Valor(-3.0), Valor(10.0), Valor(-2.0)\nL = (a * b + c) * f\nnos, arestas = rastrear(L)\n", "expr": "all(x in y._anteriores for x, y in arestas)", "expected": true, "name": "Cada aresta é (anterior, nó): o primeiro entra na conta que gera o segundo", "hint": "A aresta vai de quem entra na conta para o resultado dela."},
  {"id": "tipos", "checkpoint": 2, "kind": "expr", "setup": "nos, arestas = rastrear(Valor(2.0) * Valor(3.0))", "expr": "[type(nos).__name__, type(arestas).__name__, type(arestas[0]).__name__, len(arestas[0])]", "expected": ["list", "list", "tuple", 2], "name": "Devolve duas listas; cada aresta é uma tupla de dois nós"},
  {"id": "v-vezes-v", "checkpoint": 2, "kind": "expr", "setup": "v = Valor(3.0)\nnos, arestas = rastrear(v * v)", "expr": "[len(nos), len(arestas)]", "expected": [2, 1], "name": "v * v: 2 nós e 1 aresta (o conjunto de anteriores tem v uma vez)"},
  {"id": "compartilhado", "checkpoint": 3, "kind": "expr", "setup": "a = Valor(2.0)\ne = a * 3.0\ny = e + e * a\nnos, arestas = rastrear(y)\n", "expr": "[len(nos), len(arestas)]", "expected": [5, 6], "name": "e = a * 3 usado duas vezes em y = e + e * a: 5 nós e 6 arestas", "hint": "Um nó alcançado por dois caminhos entra uma vez só em nos; cada aresta também aparece uma vez."},
  {"id": "sem-repeticao", "checkpoint": 3, "kind": "expr", "setup": "a = Valor(2.0)\ne = a * 3.0\ny = e + e * a\nnos, arestas = rastrear(y)\n", "expr": "[len(nos) == len({id(n) for n in nos}), len(arestas) == len({(id(x), id(y)) for x, y in arestas})]", "expected": [true, true], "name": "Nenhum nó e nenhuma aresta repetidos no grafo com nó compartilhado", "hint": "Guarde os nós já visitados num conjunto e não visite de novo."},
  {"id": "iguais-distintos", "checkpoint": 3, "kind": "expr", "setup": "nos, arestas = rastrear(Valor(1.0) + Valor(1.0))", "expr": "[len(nos), len(arestas)]", "expected": [3, 2], "name": "Valor(1.0) + Valor(1.0): dois nós diferentes com o mesmo dado", "hint": "Dois objetos com o mesmo número são nós diferentes: os visitados são os objetos, não os dados."},
  {"id": "folha", "checkpoint": 1, "kind": "expr", "setup": "nos, arestas = rastrear(Valor(4.0))", "expr": "[len(nos), len(arestas)]", "expected": [1, 0], "name": "Um Valor sozinho: 1 nó e nenhuma aresta"},
  {"id": "cadeia", "checkpoint": 1, "kind": "expr", "setup": "x = Valor(1.0)\ns = x\nfor _ in range(300):\n    s = s * 1.01\nnos, arestas = rastrear(s)", "expr": "[len(nos), len(arestas)]", "expected": [601, 600], "name": "Cadeia de 300 produtos: 601 nós e 600 arestas"}
]
```

### Soluções erradas
```python name="sem conjunto de visitados"
from valor import Valor


def rastrear(raiz):
    nos, arestas = [], []
    visitados = set()

    def visitar(v):
        nos.append(v)
        for anterior in v._anteriores:
            arestas.append((anterior, v))
            visitar(anterior)

    visitar(raiz)
    return nos, arestas
```
```python name="visitados pelo dado"
from valor import Valor


def rastrear(raiz):
    nos, arestas = [], []
    visitados = set()

    def visitar(v):
        if v.dado in visitados:
            return
        visitados.add(v.dado)
        nos.append(v)
        for anterior in v._anteriores:
            arestas.append((anterior, v))
            visitar(anterior)

    visitar(raiz)
    return nos, arestas
```
```python name="só a raiz e os anteriores diretos"
from valor import Valor


def rastrear(raiz):
    nos, arestas = [], []
    visitados = set()

    def visitar(v):
        if v in visitados:
            return
        visitados.add(v)
        nos.append(v)
        for anterior in v._anteriores:
            arestas.append((anterior, v))
            if anterior not in visitados:
                visitados.add(anterior)
                nos.append(anterior)

    visitar(raiz)
    return nos, arestas
```
```python name="arestas na direção trocada"
from valor import Valor


def rastrear(raiz):
    nos, arestas = [], []
    visitados = set()

    def visitar(v):
        if v in visitados:
            return
        visitados.add(v)
        nos.append(v)
        for anterior in v._anteriores:
            arestas.append((v, anterior))
            visitar(anterior)

    visitar(raiz)
    return nos, arestas
```
```python name="aresta só na primeira visita do anterior"
from valor import Valor


def rastrear(raiz):
    nos, arestas = [], []
    visitados = set()

    def visitar(v):
        if v in visitados:
            return
        visitados.add(v)
        nos.append(v)
        for anterior in v._anteriores:
            if anterior not in visitados:
                arestas.append((anterior, v))
            visitar(anterior)

    visitar(raiz)
    return nos, arestas
```

## Passo 8 · Quiz · Métodos especiais

### Pergunta
Com o `Valor` do passo 3 (só `__add__` e `__mul__`), o programa abaixo para na última linha:

```python
pesos = [Valor(0.5), Valor(-1.0)]
x = [2.0, 3.0]
z = sum(w * xi for w, xi in zip(pesos, x))
```

```text
TypeError: unsupported operand type(s) for +: 'int' and 'Valor'
```

O que falta?
- [ ] `__mul__` para números, porque `w * xi` multiplica um `Valor` por um `float`
- [x] `__radd__`, porque `sum` começa em `0` e a primeira conta é `0 + Valor`
- [ ] `__add__`, porque o erro fala de `+`
- [ ] Converter `x` em `Valor`, porque `sum` só aceita objetos do mesmo tipo
> `w * xi` funciona: o `Valor` está à esquerda e `__mul__` converte o número. O erro vem do `sum`, que começa em `0`: `int.__add__(0, Valor)` devolve `NotImplemented`, e o Python procura `Valor.__radd__`. O `__add__` existe, mas só é usado com o `Valor` à esquerda. Converter `x` não muda o `0` inicial do `sum`.

### Pergunta
Alguém guardou os anteriores num atributo **de classe**:

```python
class Valor:
    _anteriores = []

    def __init__(self, dado, anteriores=()):
        self.dado = dado
        self._anteriores.extend(anteriores)
```

Com `__add__` criando `Valor(self.dado + outro.dado, (self, outro))`, o que imprime o código abaixo?

```python
a = Valor(1.0)
b = Valor(2.0)
c = a + b
d = c + a
print(len(a._anteriores), a._anteriores is d._anteriores)
```
- [ ] `0 True`
- [ ] `0 False`
- [ ] `2 False`
- [x] `4 True`
> Atribuído na classe, `_anteriores` é **uma** lista compartilhada por todos os objetos, e `self._anteriores.extend(...)` altera essa lista (não cria uma na instância). Cada soma acrescenta dois itens: depois de `c` e de `d`, todos os `Valor`, inclusive a folha `a`, "têm" 4 anteriores, e a mesma lista. Com `self._anteriores = set(anteriores)` no `__init__`, cada objeto teria o seu.

### Pergunta
O `_backward` do `__add__` foi escrito com `=`:

```python
        def _backward():
            self.grad = saida.grad
            outro.grad = saida.grad
```

Para `y = v + v` com `v = Valor(3.0)`, depois de `y.grad = 1.0` e `y._backward()`, quanto vale `v.grad`, e quanto deveria valer?
- [ ] 2.0, o certo, porque as duas linhas rodam
- [x] 1.0, mas deveria ser 2.0: as duas linhas atribuem ao mesmo objeto, e a segunda apaga a primeira
- [ ] 0.0, porque o conjunto de anteriores tem `v` uma vez só e o `_backward` não chega a ele
- [ ] 6.0, porque o gradiente de `v + v` é `2 * v`
> `self` e `outro` são o mesmo `v`; com `=`, `v.grad` termina em 1.0, e a derivada de $2v$ é 2. Com `+=`, as duas linhas somam 1 cada uma. O conjunto `_anteriores` não interfere: o `_backward` usa `self` e `outro` da closure. O gradiente de $2v$ em relação a $v$ é a constante 2, não $2v$.
