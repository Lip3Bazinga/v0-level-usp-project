---
slug: n5-m1-02-derivadas-e-gradiente
titulo: Derivadas e gradiente
descricao: Derivada como taxa de variação, derivada numérica, derivadas parciais, o vetor gradiente e por que ele aponta para a subida mais íngreme.
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
- Calcular derivadas de funções simples analiticamente e conferir com diferenças finitas
- Calcular derivadas parciais e o gradiente de funções de várias variáveis
- Interpretar o gradiente geometricamente e usar o gradiente negativo para descer uma função
---

## Passo 1 · Leitura · A inclinação num ponto

Treinar um modelo é ajustar números (pesos) para que um erro fique pequeno. Para saber para que lado mexer em cada peso, é preciso responder a uma pergunta local: se o peso aumentar um pouquinho, o erro sobe ou desce, e quanto? Essa resposta é a **derivada**.

A derivada de $f$ no ponto $x$ é a inclinação da reta que toca o gráfico ali, o limite da razão entre a variação de $f$ e a variação de $x$:

$$
f'(x) = \lim_{h \to 0} \frac{f(x + h) - f(x)}{h}
$$

Algumas regras cobrem quase tudo deste módulo: $(x^n)' = n x^{n-1}$, $(e^x)' = e^x$, $(\ln x)' = 1/x$, a derivada de uma soma é a soma das derivadas e uma constante multiplicando sai da derivada. Assim, $f(x) = 3x^2 - 2x + 1$ tem $f'(x) = 6x - 2$, e em $x = 2$ a inclinação é 10.

Com o computador dá para estimar a derivada sem fazer a conta, trocando o limite por um $h$ pequeno. É a **diferença finita**. A versão "para frente" usa a própria fórmula da definição; a **diferença central** olha para os dois lados do ponto:

$$
f'(x) \approx \frac{f(x + h) - f(x - h)}{2h}
$$

A diferença importa. Pela série de Taylor, o erro da diferença para frente é proporcional a $h$ (cerca de $\tfrac{h}{2} |f''(x)|$), enquanto na central os termos de $f''$ se cancelam e o erro fica proporcional a $h^2$ (cerca de $\tfrac{h^2}{6} |f'''(x)|$). Dividir $h$ por 10 divide o erro da primeira por 10 e o da segunda por 100. Numa parábola, $f'''$ é zero, e a diferença central acerta a derivada exatamente, qualquer que seja o $h$.

```python
import math
f = math.exp
h = 1e-3
(f(1 + h) - f(1)) / h              # para frente: erro perto de 1e-3
(f(1 + h) - f(1 - h)) / (2 * h)    # central: erro perto de 5e-7
```

Essa estimativa não substitui a derivada exata: o treino usa a fórmula analítica, que é rápida. Ela serve para **conferir** a fórmula, e é a ferramenta que você vai construir nesta lição e usar até o Nível 6. Resta uma pergunta: se $h$ menor é melhor, por que não usar $h = 10^{-13}$? O próximo passo responde.

## Passo 2 · Previsão · O erro de cada h

O programa mede o erro das duas diferenças finitas para $f(x) = e^x$ em $x = 1$, onde a derivada exata é $e$. Leia sem executar e digite o que ele imprime.

### Código
```python
import math


def frente(f, x, h):
    return (f(x + h) - f(x)) / h


def central(f, x, h):
    return (f(x + h) - f(x - h)) / (2 * h)


exato = math.exp(1.0)
for h in [1e-1, 1e-2, 1e-3]:
    print(h, f"{abs(frente(math.exp, 1.0, h) - exato):.0e}", f"{abs(central(math.exp, 1.0, h) - exato):.0e}")
print(abs(central(math.exp, 1.0, 1e-5) - exato) < 1e-8)
print(abs(central(math.exp, 1.0, 1e-13) - exato) < 1e-8)
print(central(lambda x: x ** 2, 3.0, 1e-20))
```

### Dicas
1. O formato `.0e` mostra só a ordem de grandeza com um algarismo: `0.1406` vira `1e-01`. O erro da diferença para frente é perto de $\tfrac{h}{2} e \approx 1{,}36\,h$; o da central, perto de $\tfrac{h^2}{6} e \approx 0{,}45\,h^2$.
2. Um `float` tem cerca de 16 algarismos significativos. Com $h = 10^{-13}$, $f(x+h)$ e $f(x-h)$ só diferem nos últimos algarismos, que são justamente os arredondados.
3. Somar $10^{-20}$ a 3.0 não muda o número: `3.0 + 1e-20 == 3.0`.

### Saída esperada
```text
0.1 1e-01 5e-03
0.01 1e-02 5e-05
0.001 1e-03 5e-07
True
False
0.0
```

## Passo 3 · Exercício · Derivada central
modo: lacunas

O passo anterior mostrou os dois limites do $h$. Grande demais, o erro de truncamento (o termo $h^2$) domina. Pequeno demais, $f(x+h)$ e $f(x-h)$ ficam quase iguais, e a subtração joga fora os algarismos certos e deixa os arredondados: é o **cancelamento catastrófico**, com um erro que cresce como $\varepsilon / h$, sendo $\varepsilon \approx 2{,}2 \times 10^{-16}$ a precisão do `float`. Na diferença central, o meio-termo fica perto de $h = 10^{-5}$, onde os dois erros têm a mesma ordem; no limite, com $h = 10^{-20}$, $x + h$ é igual a $x$ e a estimativa dá zero.

Complete as lacunas (`___`) da derivada central.

### Instruções
1. `derivada_central(f, x, h=1e-5)` recebe uma função `f` de um número, um ponto `x` e o passo `h`.
2. Devolve a estimativa $\dfrac{f(x + h) - f(x - h)}{2h}$, usando o `h` recebido.

### Código inicial
```python
def derivada_central(f, x, h=1e-5):
    return (f(x + ___) - f(x - ___)) / ___
```

### Solução
```python
def derivada_central(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / (2 * h)
```

### Dicas
1. Os dois pontos ficam à mesma distância de `x`, um de cada lado.
2. A distância entre $x - h$ e $x + h$ é $2h$.
3. Sem parênteses, `a / 2 * h` divide por 2 e depois **multiplica** por `h`.

### Verificação
```json
[
  { "id": "cubo", "checkpoint": 2, "kind": "expr", "setup": "def f(x):\n    return x ** 3",
    "expr": "derivada_central(f, 2.0)", "expected": 12.0, "tolerance": 1e-6, "name": "x³ em x = 2: a derivada é 12",
    "hint": "A diferença para frente erra por volta de 6e-5 aqui; a central, por volta de 1e-10." },
  { "id": "exp", "checkpoint": 2, "kind": "expr", "setup": "import math",
    "expr": "derivada_central(math.exp, 0.0)", "expected": 1.0, "tolerance": 1e-8, "name": "e^x em x = 0: a derivada é 1" },
  { "id": "seno", "checkpoint": 2, "kind": "expr", "setup": "import math",
    "expr": "derivada_central(math.sin, math.pi / 3)", "expected": 0.5, "tolerance": 1e-8, "name": "sen(x) em π/3: a derivada é cos(π/3) = 0,5" },
  { "id": "log", "checkpoint": 2, "kind": "expr", "setup": "import math",
    "expr": "derivada_central(math.log, 4.0)", "expected": 0.25, "tolerance": 1e-8, "name": "ln(x) em x = 4: a derivada é 1/4" },
  { "id": "parabola-exata", "checkpoint": 2, "kind": "expr", "setup": "def f(x):\n    return 3 * x ** 2 - 2 * x + 1",
    "expr": "derivada_central(f, 2.0, h=0.1)", "expected": 10.0, "tolerance": 1e-9,
    "name": "Numa parábola, a diferença central é exata mesmo com h = 0.1",
    "hint": "Com dois pontos simétricos, os termos de segunda ordem se cancelam." },
  { "id": "usa-h", "checkpoint": 1, "kind": "expr", "setup": "def f(x):\n    return x ** 3",
    "expr": "derivada_central(f, 1.0, h=0.5)", "expected": 3.25, "tolerance": 1e-12,
    "name": "Com h = 0.5, x³ em x = 1 dá 3.25 (o erro h² aparece)",
    "hint": "Use o h recebido, não um número fixo." },
  { "id": "tipo", "checkpoint": 2, "kind": "expr", "setup": "def f(x):\n    return 5 * x",
    "expr": "derivada_central(f, 1.0)", "type": "float", "name": "Devolve um float" }
]
```

### Soluções erradas
```python name="diferença para frente"
def derivada_central(f, x, h=1e-5):
    return (f(x + h) - f(x - 0)) / h
```
```python name="não divide por 2"
def derivada_central(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / h
```
```python name="2 * h sem parênteses"
def derivada_central(f, x, h=1e-5):
    return (f(x + h) - f(x - h)) / 2 * h
```
```python name="h fixo"
def derivada_central(f, x, h=1e-5):
    return (f(x + 1e-5) - f(x - 1e-5)) / (2 * 1e-5)
```
```python name="meio passo de cada lado"
def derivada_central(f, x, h=1e-5):
    return (f(x + h / 2) - f(x - h / 2)) / (2 * h)
```

## Passo 4 · Leitura · Derivadas parciais e o vetor gradiente

Um modelo tem muitos pesos, e o erro é uma função de todos eles. A **derivada parcial** $\partial f / \partial x_i$ é a derivada em relação a uma variável com as outras paradas. Para $f(x, y) = x^2 + 3y^2$:

$$
\frac{\partial f}{\partial x} = 2x \qquad \frac{\partial f}{\partial y} = 6y \qquad \nabla f(x, y) = \begin{pmatrix} 2x \\ 6y \end{pmatrix}
$$

O **gradiente** $\nabla f$ junta as parciais num vetor, uma posição por variável. Em $(1, 2)$, $\nabla f = (2, 12)$: $f$ é seis vezes mais sensível a $y$ que a $x$.

As **curvas de nível** ajudam a ver. Elas ligam os pontos com o mesmo valor de $f$, como as linhas de altitude de um mapa; para essa $f$ são elipses em volta da origem, achatadas na direção de $y$. O gradiente num ponto é sempre **perpendicular** à curva de nível que passa por ali e aponta para onde $f$ cresce. Andando ao longo da curva, $f$ não muda; atravessando-a, muda o mais depressa possível.

Cada parcial também pode ser estimada com a diferença central, mexendo uma coordenada por vez:

$$
\frac{\partial f}{\partial x_i} \approx \frac{f(x + h\,e_i) - f(x - h\,e_i)}{2h}
$$

em que $e_i$ é o vetor com 1 na posição $i$ e 0 no resto. São $2d$ chamadas de $f$: caro demais para treinar, ótimo para conferir uma fórmula.

Para comparar o gradiente analítico $a$ com o numérico $n$, use um **erro relativo**: $\lVert a - n \rVert / \max(1, \lVert a \rVert, \lVert n \rVert)$. Uma diferença absoluta de $10^{-4}$ é grande num gradiente de tamanho 1 e desprezível num de tamanho $10^{6}$, onde o próprio arredondamento já produz diferenças assim. O $\max$ com 1 evita dividir por quase zero perto de um mínimo. Comparar com `==` não serve nunca: a estimativa numérica tem sempre um erro pequeno.

Dois detalhes de numpy pegam desprevenido. Se o ponto chega como lista de inteiros, `np.zeros_like` cria um array de inteiros, e `e[i] = 1e-5` grava 0. E somar `h` na coordenada do próprio array recebido altera o ponto de quem chamou a função; trabalhe sempre numa cópia.

## Passo 5 · Exercício · Gradiente numérico e verificador

Escreva o gradiente numérico e o verificador que compara um gradiente analítico com ele. É a ferramenta que você vai usar no resto do nível e no Nível 6.

### Instruções
1. `gradiente_numerico(f, ponto, h=1e-5)` recebe uma função `f` que aceita um array e devolve um número, e um `ponto` (lista ou array). Devolve um array `float64` da forma de `ponto`, com a diferença central de cada coordenada.
2. `gradiente_numerico` não altera o `ponto` recebido e funciona com um ponto de inteiros.
3. `verificar_gradiente(f, grad, ponto, tol=1e-6)` calcula `a = grad(ponto)` (o gradiente analítico) e `n = gradiente_numerico(f, ponto)` e devolve `True` quando o erro relativo $\lVert a - n \rVert / \max(1, \lVert a \rVert, \lVert n \rVert)$ é no máximo `tol`.
4. `verificar_gradiente` devolve um `bool` do Python.

### Código inicial
```python
import numpy as np


def gradiente_numerico(f, ponto, h=1e-5):
    pass


def verificar_gradiente(f, grad, ponto, tol=1e-6):
    pass
```

### Solução
```python
import numpy as np


def gradiente_numerico(f, ponto, h=1e-5):
    ponto = np.array(ponto, dtype=float)
    g = np.zeros_like(ponto)
    for i in range(ponto.size):
        e = np.zeros_like(ponto)
        e[i] = h
        g[i] = (f(ponto + e) - f(ponto - e)) / (2 * h)
    return g


def verificar_gradiente(f, grad, ponto, tol=1e-6):
    ponto = np.array(ponto, dtype=float)
    a = np.asarray(grad(ponto), dtype=float)
    n = gradiente_numerico(f, ponto)
    erro = np.linalg.norm(a - n) / max(1.0, np.linalg.norm(a), np.linalg.norm(n))
    return bool(erro <= tol)
```

### Dicas
1. Para cada coordenada `i`, monte um vetor com `h` só na posição `i` e aplique a diferença central com ele.
2. `np.array(ponto, dtype=float)` cria uma cópia em ponto flutuante: o original fica intacto e o `h` não vira 0.
3. No verificador, a diferença entre os gradientes entra pela norma, que não deixa erros de sinais opostos se cancelarem.

### Verificação
```json
[
  { "id": "num-elipse", "checkpoint": 1, "kind": "expr", "setup": "def f(p):\n    return p[0] ** 2 + 3 * p[1] ** 2",
    "expr": "gradiente_numerico(f, np.array([1.0, 2.0])).tolist()", "expected": [2.0, 12.0], "tolerance": 1e-6,
    "name": "x² + 3y² em (1, 2): gradiente (2, 12)", "hint": "A diferença central erra bem menos que 1e-6 aqui; a para frente, não." },
  { "id": "num-cinco", "checkpoint": 1, "kind": "expr", "setup": "def f(p):\n    return float(np.sum(p ** 2))",
    "expr": "gradiente_numerico(f, np.array([1.0, -2.0, 0.5, 3.0, 0.0])).tolist()", "expected": [2.0, -4.0, 1.0, 6.0, 0.0], "tolerance": 1e-6,
    "name": "Soma dos quadrados em 5 dimensões: gradiente 2p" },
  { "id": "num-inteiros", "checkpoint": 2, "kind": "expr", "setup": "def f(p):\n    return p[0] ** 2 + 3 * p[1] ** 2",
    "expr": "gradiente_numerico(f, [1, 2]).tolist()", "expected": [2.0, 12.0], "tolerance": 1e-6,
    "name": "Ponto dado como lista de inteiros", "hint": "Num array de inteiros, gravar 1e-5 numa posição grava 0." },
  { "id": "num-usa-h", "checkpoint": 1, "kind": "expr", "setup": "def f(p):\n    return p[0] ** 3",
    "expr": "gradiente_numerico(f, np.array([1.0]), h=0.5).tolist()", "expected": [3.25], "tolerance": 1e-12,
    "name": "Com h = 0.5, x³ em x = 1 dá 3.25", "hint": "Use o h recebido." },
  { "id": "num-intacto", "checkpoint": 2, "kind": "expr",
    "setup": "def f(p):\n    return p[0] ** 2 + 3 * p[1] ** 2\np = np.array([1.0, 2.0])\ng = gradiente_numerico(f, p)",
    "expr": "p.tolist()", "expected": [1.0, 2.0], "name": "O ponto recebido não muda",
    "hint": "Some e subtraia h numa cópia, não no array recebido." },
  { "id": "num-tipo", "checkpoint": 1, "kind": "expr", "setup": "def f(p):\n    return p[0] * p[1]",
    "expr": "gradiente_numerico(f, [2.0, 3.0])", "type": "ndarray", "name": "Devolve um array do numpy" },
  { "id": "verif-correto", "checkpoint": 3, "kind": "expr",
    "setup": "def f(p):\n    return p[0] ** 2 * p[1] + np.exp(p[1])\ndef grad(p):\n    return np.array([2 * p[0] * p[1], p[0] ** 2 + np.exp(p[1])])",
    "expr": "verificar_gradiente(f, grad, [1.5, -0.5])", "expected": true, "type": "bool",
    "name": "O gradiente certo de x²y + e^y passa", "hint": "Compare as duas normas com o erro relativo e devolva um bool do Python." },
  { "id": "verif-sinal", "checkpoint": 3, "kind": "expr",
    "setup": "def f(p):\n    return p[0] ** 2 * p[1] + np.exp(p[1])\ndef grad(p):\n    return -np.array([2 * p[0] * p[1], p[0] ** 2 + np.exp(p[1])])",
    "expr": "verificar_gradiente(f, grad, [1.5, -0.5])", "expected": false,
    "name": "Um gradiente com o sinal trocado é recusado", "hint": "Uma diferença negativa também é erro: use a norma." },
  { "id": "verif-termo", "checkpoint": 3, "kind": "expr",
    "setup": "def f(p):\n    return p[0] ** 2 * p[1] + np.exp(p[1])\ndef grad(p):\n    return np.array([2 * p[0] * p[1], p[0] ** 2])",
    "expr": "verificar_gradiente(f, grad, [1.5, -0.5])", "expected": false,
    "name": "Um gradiente sem o termo e^y é recusado" },
  { "id": "verif-escala", "checkpoint": 3, "kind": "expr",
    "setup": "def f(p):\n    return 1e6 * p[0] ** 2\ndef grad(p):\n    return np.array([2e6 * p[0]])",
    "expr": "verificar_gradiente(f, grad, [3.0])", "expected": true,
    "name": "Um gradiente certo de tamanho 6 milhões passa",
    "hint": "Aqui o arredondamento já dá uma diferença absoluta perto de 1e-4: o erro precisa ser relativo." },
  { "id": "verif-tol-folgada", "checkpoint": 3, "kind": "expr",
    "setup": "def f(p):\n    return p[0] ** 2 * p[1] + np.exp(p[1])\ndef grad(p):\n    return np.array([2 * p[0] * p[1], p[0] ** 2 + np.exp(p[1])]) * (1 + 1e-4)",
    "expr": "verificar_gradiente(f, grad, [1.5, -0.5], tol=1e-3)", "expected": true,
    "name": "Um erro relativo de 1e-4 passa com tol=1e-3", "hint": "Use a tolerância recebida." },
  { "id": "verif-tol-padrao", "checkpoint": 3, "kind": "expr",
    "setup": "def f(p):\n    return p[0] ** 2 * p[1] + np.exp(p[1])\ndef grad(p):\n    return np.array([2 * p[0] * p[1], p[0] ** 2 + np.exp(p[1])]) * (1 + 1e-4)",
    "expr": "verificar_gradiente(f, grad, [1.5, -0.5])", "expected": false,
    "name": "O mesmo erro de 1e-4 é recusado com a tolerância padrão" }
]
```

### Soluções erradas
```python name="diferença para frente"
import numpy as np


def gradiente_numerico(f, ponto, h=1e-5):
    ponto = np.array(ponto, dtype=float)
    g = np.zeros_like(ponto)
    for i in range(ponto.size):
        e = np.zeros_like(ponto)
        e[i] = h
        g[i] = (f(ponto + e) - f(ponto)) / h
    return g


def verificar_gradiente(f, grad, ponto, tol=1e-6):
    ponto = np.array(ponto, dtype=float)
    a = np.asarray(grad(ponto), dtype=float)
    n = gradiente_numerico(f, ponto)
    erro = np.linalg.norm(a - n) / max(1.0, np.linalg.norm(a), np.linalg.norm(n))
    return bool(erro <= tol)
```
```python name="sem dtype=float"
import numpy as np


def gradiente_numerico(f, ponto, h=1e-5):
    ponto = np.array(ponto)
    g = np.zeros_like(ponto)
    for i in range(ponto.size):
        e = np.zeros_like(ponto)
        e[i] = h
        g[i] = (f(ponto + e) - f(ponto - e)) / (2 * h)
    return g


def verificar_gradiente(f, grad, ponto, tol=1e-6):
    ponto = np.array(ponto, dtype=float)
    a = np.asarray(grad(ponto), dtype=float)
    n = gradiente_numerico(f, ponto)
    erro = np.linalg.norm(a - n) / max(1.0, np.linalg.norm(a), np.linalg.norm(n))
    return bool(erro <= tol)
```
```python name="mexe no ponto recebido"
import numpy as np


def gradiente_numerico(f, ponto, h=1e-5):
    ponto = np.asarray(ponto, dtype=float)
    g = np.zeros_like(ponto)
    for i in range(ponto.size):
        ponto[i] += h
        mais = f(ponto)
        ponto[i] -= 2 * h
        menos = f(ponto)
        g[i] = (mais - menos) / (2 * h)
    return g


def verificar_gradiente(f, grad, ponto, tol=1e-6):
    ponto = np.array(ponto, dtype=float)
    a = np.asarray(grad(ponto), dtype=float)
    n = gradiente_numerico(f, ponto)
    erro = np.linalg.norm(a - n) / max(1.0, np.linalg.norm(a), np.linalg.norm(n))
    return bool(erro <= tol)
```
```python name="compara com =="
import numpy as np


def gradiente_numerico(f, ponto, h=1e-5):
    ponto = np.array(ponto, dtype=float)
    g = np.zeros_like(ponto)
    for i in range(ponto.size):
        e = np.zeros_like(ponto)
        e[i] = h
        g[i] = (f(ponto + e) - f(ponto - e)) / (2 * h)
    return g


def verificar_gradiente(f, grad, ponto, tol=1e-6):
    ponto = np.array(ponto, dtype=float)
    a = np.asarray(grad(ponto), dtype=float)
    n = gradiente_numerico(f, ponto)
    return bool(np.array_equal(a, n))
```
```python name="erro absoluto"
import numpy as np


def gradiente_numerico(f, ponto, h=1e-5):
    ponto = np.array(ponto, dtype=float)
    g = np.zeros_like(ponto)
    for i in range(ponto.size):
        e = np.zeros_like(ponto)
        e[i] = h
        g[i] = (f(ponto + e) - f(ponto - e)) / (2 * h)
    return g


def verificar_gradiente(f, grad, ponto, tol=1e-6):
    ponto = np.array(ponto, dtype=float)
    a = np.asarray(grad(ponto), dtype=float)
    n = gradiente_numerico(f, ponto)
    return bool(np.linalg.norm(a - n) <= tol)
```
```python name="soma das diferenças, sem norma"
import numpy as np


def gradiente_numerico(f, ponto, h=1e-5):
    ponto = np.array(ponto, dtype=float)
    g = np.zeros_like(ponto)
    for i in range(ponto.size):
        e = np.zeros_like(ponto)
        e[i] = h
        g[i] = (f(ponto + e) - f(ponto - e)) / (2 * h)
    return g


def verificar_gradiente(f, grad, ponto, tol=1e-6):
    ponto = np.array(ponto, dtype=float)
    a = np.asarray(grad(ponto), dtype=float)
    n = gradiente_numerico(f, ponto)
    erro = np.sum(a - n) / max(1.0, np.linalg.norm(a), np.linalg.norm(n))
    return bool(erro <= tol)
```
```python name="ignora a tolerância recebida"
import numpy as np


def gradiente_numerico(f, ponto, h=1e-5):
    ponto = np.array(ponto, dtype=float)
    g = np.zeros_like(ponto)
    for i in range(ponto.size):
        e = np.zeros_like(ponto)
        e[i] = h
        g[i] = (f(ponto + e) - f(ponto - e)) / (2 * h)
    return g


def verificar_gradiente(f, grad, ponto, tol=1e-6):
    ponto = np.array(ponto, dtype=float)
    a = np.asarray(grad(ponto), dtype=float)
    n = gradiente_numerico(f, ponto)
    erro = np.linalg.norm(a - n) / max(1.0, np.linalg.norm(a), np.linalg.norm(n))
    return bool(erro <= 1e-6)
```
```python name="devolve numpy.bool"
import numpy as np


def gradiente_numerico(f, ponto, h=1e-5):
    ponto = np.array(ponto, dtype=float)
    g = np.zeros_like(ponto)
    for i in range(ponto.size):
        e = np.zeros_like(ponto)
        e[i] = h
        g[i] = (f(ponto + e) - f(ponto - e)) / (2 * h)
    return g


def verificar_gradiente(f, grad, ponto, tol=1e-6):
    ponto = np.array(ponto, dtype=float)
    a = np.asarray(grad(ponto), dtype=float)
    n = gradiente_numerico(f, ponto)
    return np.linalg.norm(a - n) / max(1.0, np.linalg.norm(a), np.linalg.norm(n)) <= tol
```

## Passo 6 · Leitura · O gradiente aponta para cima

Entre todas as direções de tamanho 1 que saem de um ponto, a que faz $f$ crescer mais depressa é a do gradiente. A razão está no produto escalar da lição anterior: andando um pouquinho na direção $u$ (com $\lVert u \rVert = 1$), $f$ muda cerca de $\nabla f \cdot u = \lVert \nabla f \rVert \cos\theta$, que é máximo quando $u$ aponta como $\nabla f$ ($\cos\theta = 1$), zero quando $u$ é perpendicular (ao longo da curva de nível) e mínimo, $-\lVert \nabla f \rVert$, no sentido oposto.

Para **descer**, então, anda-se contra o gradiente. É a regra do **gradiente descendente**:

$$
x \leftarrow x - \eta\, \nabla f(x)
$$

O número $\eta > 0$ é a **taxa de aprendizado**: o tamanho do passo, medido em unidades do gradiente. Perto do mínimo o gradiente encolhe, e os passos encolhem junto, sem que ninguém mude $\eta$. O programa abaixo dá três passos em $f(x, y) = x^2 + 3y^2$ a partir de $(2, 1)$, com $\eta = 0{,}1$. Use o botão "Visualizar" e acompanhe `x`, `y` e o valor de `f` a cada volta.

```python visualizar
def f(x, y):
    return x ** 2 + 3 * y ** 2


def gradiente(x, y):
    return 2 * x, 6 * y


x, y = 2.0, 1.0
taxa = 0.1
print(0, x, y, f(x, y))
for passo in range(3):
    gx, gy = gradiente(x, y)
    x = x - taxa * gx
    y = y - taxa * gy
    print(passo + 1, round(x, 4), round(y, 4), round(f(x, y), 4))
```

O valor cai de 7 para 3,04, 1,7152 e 1,0609. Repare que $y$ encolhe mais depressa que $x$: a parcial em $y$ é três vezes maior, e o passo naquela direção também. A trajetória não segue a reta até a origem; ela corta as curvas de nível em ângulo reto, como o gradiente manda.

Dois erros aparecem logo: `x + taxa * g` sobe a função em vez de descer, e `x -= taxa * g` altera o array de quem chamou. Por isso o exercício pede uma função que devolve um ponto **novo**.

O exercício usa uma família importante: a quadrática $f(x) = \tfrac{1}{2} x^\top A x - b^\top x$. Para $A$ qualquer, o gradiente é

$$
\nabla f(x) = \tfrac{1}{2}\left(A + A^\top\right) x - b
$$

que vira $Ax - b$ quando $A$ é simétrica. O mínimo, quando existe, é onde o gradiente zera: $Ax = b$, o sistema do `solve` do Nível 4. O erro quadrático médio da regressão linear, no módulo 2, é uma quadrática dessas.

## Passo 7 · Exercício · Gradiente de uma quadrática e um passo

Escreva o gradiente da quadrática e um passo de descida que não estraga o ponto recebido.

### Instruções
1. `gradiente_quadratica(A, b, x)` devolve, como array, o gradiente de $f(x) = \tfrac{1}{2} x^\top A x - b^\top x$ em `x`, para uma matriz quadrada `A` que **pode não ser simétrica**.
2. `passo_de_descida(grad, x, taxa)` recebe uma função `grad` (que devolve o gradiente num ponto), o ponto `x` e a taxa, e devolve o ponto novo $x - \eta\,\nabla f(x)$ como array.
3. `passo_de_descida` não altera o `x` recebido.

### Código inicial
```python
import numpy as np


def gradiente_quadratica(A, b, x):
    pass


def passo_de_descida(grad, x, taxa):
    pass
```

### Solução
```python
import numpy as np


def gradiente_quadratica(A, b, x):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    x = np.asarray(x, dtype=float)
    return 0.5 * (A + A.T) @ x - b


def passo_de_descida(grad, x, taxa):
    x = np.asarray(x, dtype=float)
    return x - taxa * np.asarray(grad(x), dtype=float)
```

### Dicas
1. A parte $x^\top A x$ tem derivada $(A + A^\top)x$; com o $\tfrac{1}{2}$ na frente, sobra a média de $A$ com a transposta.
2. O termo $-b^\top x$ tem gradiente $-b$.
3. `x - ...` cria um array novo; `x -= ...` escreve no array recebido.

### Verificação
```json
[
  { "id": "quad-simetrica", "checkpoint": 1, "kind": "expr", "expr": "gradiente_quadratica([[2, 0], [0, 6]], [0, 0], [1, 2]).tolist()",
    "expected": [2.0, 12.0], "tolerance": 1e-9, "name": "A = diag(2, 6), b = 0, em (1, 2): é x² + 3y², gradiente (2, 12)",
    "hint": "Com A simétrica, o gradiente é A x − b." },
  { "id": "quad-nao-simetrica", "checkpoint": 1, "kind": "expr", "expr": "gradiente_quadratica([[1, 2], [0, 3]], [1, 1], [1, 1]).tolist()",
    "expected": [1.0, 3.0], "tolerance": 1e-9, "name": "A não simétrica: o gradiente usa a média de A e A transposta",
    "hint": "x^T A x só enxerga a parte simétrica de A." },
  { "id": "quad-b", "checkpoint": 1, "kind": "expr", "expr": "gradiente_quadratica([[1, 0], [0, 1]], [3, -1], [0, 0]).tolist()",
    "expected": [-3.0, 1.0], "tolerance": 1e-9, "name": "Na origem, sobra só −b" },
  { "id": "quad-numerico", "checkpoint": 1, "kind": "expr",
    "setup": "rng = np.random.default_rng(11)\nA = rng.normal(size=(4, 4))\nb = rng.normal(size=4)\nx = rng.normal(size=4)\ndef f(z):\n    return 0.5 * z @ A @ z - b @ z\nnum = np.array([(f(x + h) - f(x - h)) / 2e-5 for h in np.eye(4) * 1e-5])",
    "expr": "bool(np.allclose(gradiente_quadratica(A, b, x), num, atol=1e-6))", "expected": true,
    "name": "Com A 4 × 4 sorteada (não simétrica), bate com o gradiente numérico" },
  { "id": "quad-minimo", "checkpoint": 1, "kind": "expr",
    "setup": "A = np.array([[4.0, 1.0], [1.0, 3.0]])\nb = np.array([1.0, 2.0])\nx_min = np.linalg.solve(A, b)",
    "expr": "bool(np.allclose(gradiente_quadratica(A, b, x_min), 0.0))", "expected": true,
    "name": "No mínimo (solução de A x = b), o gradiente é zero", "hint": "Confira o sinal de b." },
  { "id": "passo-valor", "checkpoint": 2, "kind": "expr", "setup": "def grad(p):\n    return 2 * p",
    "expr": "passo_de_descida(grad, np.array([1.0, -2.0]), 0.1).tolist()", "expected": [0.8, -1.6], "tolerance": 1e-9,
    "name": "Um passo com gradiente 2x e taxa 0.1", "hint": "Ande contra o gradiente: x − taxa · grad(x)." },
  { "id": "passo-elipse", "checkpoint": 2, "kind": "expr", "setup": "def grad(p):\n    return np.array([2 * p[0], 6 * p[1]])",
    "expr": "passo_de_descida(grad, [1.0, 1.0], 0.1).tolist()", "expected": [0.8, 0.4], "tolerance": 1e-9,
    "name": "Um passo em x² + 3y² a partir de (1, 1)" },
  { "id": "passo-desce", "checkpoint": 2, "kind": "expr",
    "setup": "def f(p):\n    return (p[0] - 3) ** 2 + 2 * (p[1] + 1) ** 2\ndef grad(p):\n    return np.array([2 * (p[0] - 3), 4 * (p[1] + 1)])\nx = np.array([0.0, 0.0])",
    "expr": "bool(f(passo_de_descida(grad, x, 0.05)) < f(x))", "expected": true, "name": "O passo diminui o valor da função" },
  { "id": "passo-intacto", "checkpoint": 3, "kind": "expr",
    "setup": "def grad(p):\n    return 2 * p\nx = np.array([1.0, -2.0])\nnovo = passo_de_descida(grad, x, 0.1)",
    "expr": "x.tolist()", "expected": [1.0, -2.0], "name": "O ponto recebido não muda", "hint": "Crie o ponto novo numa expressão, sem -=." },
  { "id": "passo-tipo", "checkpoint": 2, "kind": "expr", "setup": "def grad(p):\n    return [2 * p[0]]",
    "expr": "passo_de_descida(grad, [1.0], 0.25)", "type": "ndarray", "name": "Devolve um array mesmo com listas" }
]
```

### Soluções erradas
```python name="A x − b sem simetrizar"
import numpy as np


def gradiente_quadratica(A, b, x):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    x = np.asarray(x, dtype=float)
    return A @ x - b


def passo_de_descida(grad, x, taxa):
    x = np.asarray(x, dtype=float)
    return x - taxa * np.asarray(grad(x), dtype=float)
```
```python name="A x + b"
import numpy as np


def gradiente_quadratica(A, b, x):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    x = np.asarray(x, dtype=float)
    return 0.5 * (A + A.T) @ x + b


def passo_de_descida(grad, x, taxa):
    x = np.asarray(x, dtype=float)
    return x - taxa * np.asarray(grad(x), dtype=float)
```
```python name="mantém o 1/2"
import numpy as np


def gradiente_quadratica(A, b, x):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    x = np.asarray(x, dtype=float)
    return 0.5 * A @ x - b


def passo_de_descida(grad, x, taxa):
    x = np.asarray(x, dtype=float)
    return x - taxa * np.asarray(grad(x), dtype=float)
```
```python name="passo com +"
import numpy as np


def gradiente_quadratica(A, b, x):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    x = np.asarray(x, dtype=float)
    return 0.5 * (A + A.T) @ x - b


def passo_de_descida(grad, x, taxa):
    x = np.asarray(x, dtype=float)
    return x + taxa * np.asarray(grad(x), dtype=float)
```
```python name="altera x no lugar"
import numpy as np


def gradiente_quadratica(A, b, x):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    x = np.asarray(x, dtype=float)
    return 0.5 * (A + A.T) @ x - b


def passo_de_descida(grad, x, taxa):
    x = np.asarray(x, dtype=float)
    x -= taxa * np.asarray(grad(x), dtype=float)
    return x
```
```python name="devolve o deslocamento"
import numpy as np


def gradiente_quadratica(A, b, x):
    A = np.asarray(A, dtype=float)
    b = np.asarray(b, dtype=float)
    x = np.asarray(x, dtype=float)
    return 0.5 * (A + A.T) @ x - b


def passo_de_descida(grad, x, taxa):
    x = np.asarray(x, dtype=float)
    return -taxa * np.asarray(grad(x), dtype=float)
```

## Passo 8 · Quiz · Direção do gradiente

### Pergunta
Num ponto, o gradiente de uma função de custo vale $(3, -4)$. Entre os deslocamentos abaixo, todos de tamanho $0{,}05$, qual diminui mais o custo?
- [x] $(-0{,}03,\ 0{,}04)$
- [ ] $(0{,}03,\ -0{,}04)$
- [ ] $(-0{,}04,\ 0{,}03)$
- [ ] $(0{,}03,\ 0{,}04)$
> A variação do custo é aproximadamente $\nabla f \cdot \Delta$. Para $(-0{,}03, 0{,}04)$, $3(-0{,}03) + (-4)(0{,}04) = -0{,}25$, o mínimo possível com esse tamanho, porque o deslocamento é o oposto do gradiente. $(0{,}03, -0{,}04)$ dá $+0{,}25$: é a subida mais íngreme. $(-0{,}04, 0{,}03)$ dá $-0{,}24$, quase, mas não exatamente oposto. $(0{,}03, 0{,}04)$ é perpendicular e dá zero: anda ao longo da curva de nível.

### Pergunta
O custo $f(w) = \sum_i (w_i - 1)^2$ tem o gradiente escrito como `2 * (w + 1)`. Em `w = [0, 0]`, o `verificar_gradiente` devolve `False`; o gradiente numérico dá `[-2, -2]` e o analítico, `[2, 2]`. O que está errado?
- [ ] O `h` padrão de `1e-5` é pequeno demais para essa função
- [x] O sinal dentro do parêntese: a derivada de $(w_i - 1)^2$ é $2(w_i - 1)$, e o código usou $w_i + 1$
- [ ] Faltou dividir por $n$, e o verificador acusa a diferença de escala
- [ ] O verificador está errado: gradientes com o mesmo tamanho deveriam passar
> O numérico, `[-2, -2]`, é exatamente $2(0 - 1)$; o analítico calculou $2(0 + 1)$. Num custo quadrático a diferença central é exata, então o `h` não tem culpa. Não há $n$ nessa função. E o verificador compara os vetores, não só os tamanhos: um gradiente com o sinal trocado aponta para o lado errado e faria a descida subir.

### Pergunta
Para conferir a derivada de $e^x$ em $x = 1$, um colega usa a diferença central com `h = 1e-13`, "para ficar bem perto do limite", e obtém um número que já erra na quarta casa decimal. Com `h = 1e-5`, o erro fica perto de $10^{-10}$. Qual é a explicação?
- [ ] Com `h` menor o erro sempre cai; deve ter sido um erro de digitação
- [ ] A diferença central só funciona com `h` entre 0,1 e 0,001
- [x] Com `h` minúsculo, $f(x+h)$ e $f(x-h)$ são quase iguais e a subtração só deixa os algarismos arredondados: o erro de arredondamento cresce como $\varepsilon/h$
- [ ] O `math.exp` perde precisão perto de $x = 1$
> O erro total tem duas partes: a de truncamento, que cai como $h^2$, e a de arredondamento, que cresce como $\varepsilon/h$ com $\varepsilon \approx 2{,}2 \times 10^{-16}$. Com $h = 10^{-13}$ a segunda domina (cancelamento catastrófico). A diferença central funciona bem com $h$ pequeno, até perto de $10^{-5}$ a $10^{-6}$, e o `math.exp` é preciso em todo esse intervalo.
