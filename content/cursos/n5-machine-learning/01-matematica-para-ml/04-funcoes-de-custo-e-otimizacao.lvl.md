---
slug: n5-m1-04-funcoes-de-custo-e-otimizacao
titulo: Funções de custo e otimização
descricao: Custo como medida de erro, convexidade, mínimos locais e globais, gradiente descendente em 1D e 2D, taxa de aprendizado e critérios de parada.
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
- Definir funções de custo (MSE, MAE, logística) e explicar o que cada uma penaliza
- Implementar gradiente descendente genérico com taxa de aprendizado e critério de parada
- Diagnosticar divergência e lentidão pela curva de custo e ajustar a taxa
---

## Passo 1 · Leitura · Medir o erro

Um modelo de previsão de tempo de entrega erra por 2 minutos num pedido e por 40 minutos em outro. Qual dos dois modelos é melhor: um que erra pouco quase sempre e muito de vez em quando, ou um que erra um pouco sempre? A resposta depende de como o erro é medido, e essa escolha, a **função de custo**, é a primeira decisão de qualquer treino: é ela que o gradiente descendente vai minimizar.

Para valores contínuos, com $y_i$ o valor certo e $p_i$ o previsto, as duas medidas mais comuns são:

$$
\text{MSE} = \frac{1}{n} \sum_{i=1}^{n} (y_i - p_i)^2 \qquad \text{MAE} = \frac{1}{n} \sum_{i=1}^{n} |y_i - p_i|
$$

O **erro quadrático médio** (MSE) eleva cada erro ao quadrado: um erro de 40 pesa 400 vezes um de 2. Ele castiga muito os erros grandes e por isso é sensível a **outliers**, valores fora do padrão. O **erro absoluto médio** (MAE) pesa cada minuto de erro igual, e um outlier pesa só o tamanho dele. Há uma ligação com o Nível 4: entre todas as previsões constantes, a que minimiza o MSE é a **média** dos $y_i$, e a que minimiza o MAE é a **mediana**. O MSE tem derivada simples em todo ponto; o MAE tem um bico em zero, onde a derivada não existe.

Para classificação binária, com $y_i \in \{0, 1\}$ e $p_i$ a probabilidade prevista de $y_i = 1$, o custo é a **entropia cruzada** (a perda logística da lição anterior, em média):

$$
\text{EC} = -\frac{1}{n} \sum_{i=1}^{n} \bigl[\, y_i \ln p_i + (1 - y_i) \ln(1 - p_i) \,\bigr]
$$

Ela não mede só se o modelo acertou o lado: errar com 99 % de confiança custa $-\ln 0{,}01 \approx 4{,}6$, e errar com 60 %, $-\ln 0{,}4 \approx 0{,}92$. Com $p_i$ exatamente 0 ou 1 aparece `np.log(0.0)`, que no numpy é `-inf` sem erro, e $0 \cdot (-\infty)$ é `nan`. Por isso as implementações cortam $p$ para o intervalo $[\varepsilon, 1 - \varepsilon]$ com `np.clip(p, eps, 1 - eps)` antes do logaritmo.

```python
y = np.array([1.0, 0.0])
p = np.array([1.0, 0.0])                 # acertou com certeza total
-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))   # nan: 0 * log(0)
p = np.clip(p, 1e-12, 1 - 1e-12)
-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p))   # perto de 1e-12
```

Os três custos são **médias**, não somas: o valor não cresce com o número de exemplos.

## Passo 2 · Previsão · MSE ou MAE com um outlier

Cinco entregas fictícias levaram 10, 12, 11, 13 e 50 minutos (a última pegou um engarrafamento). O programa compara a previsão constante de 12 minutos com a média, pelos dois custos. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

y = np.array([10.0, 12.0, 11.0, 13.0, 50.0])
p = np.full(5, 12.0)
print(np.mean((y - p) ** 2), np.mean(np.abs(y - p)))
print(np.mean((y[:4] - p[:4]) ** 2), np.mean(np.abs(y[:4] - p[:4])))
print(np.mean(y), np.median(y))
m = np.mean(y)
print(round(float(np.mean((y - m) ** 2)), 2), round(float(np.mean(np.abs(y - m))), 2))
```

### Dicas
1. Os erros da previsão 12 são −2, 0, −1, 1 e 38. O quadrado de 38 é 1 444.
2. A segunda linha repete as contas sem a entrega de 50 minutos.
3. A média é $96 / 5$. Na última linha, os erros em relação a ela são −9,2, −7,2, −8,2, −6,2 e 30,8.

### Saída esperada
```text
290.0 8.4
1.5 1.0
19.2 12.0
238.16 12.32
```

## Passo 3 · Exercício · Três custos vetorizados
modo: lacunas

A Previsão mostrou as duas medidas reagindo ao outlier: o MSE foi de 1,5 para 290 por causa de uma entrega, e o MAE, de 1,0 para 8,4. Ela também mostrou quem vence em cada custo: a média (19,2) tem MSE menor que a previsão 12, e a mediana (12) tem MAE menor que a média. Complete as lacunas (`___`) dos três custos.

### Instruções
1. `mse(y, p)` devolve o erro quadrático médio, como `float`.
2. `mae(y, p)` devolve o erro absoluto médio, como `float`.
3. `perda_logistica(y, p, eps=1e-12)` corta as probabilidades para $[\varepsilon, 1 - \varepsilon]$ e devolve a entropia cruzada binária média, como `float`, sem `nan` nem `inf` quando `p` tem 0 ou 1.

### Código inicial
```python
import numpy as np


def mse(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean(___))


def mae(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean(___))


def perda_logistica(y, p, eps=1e-12):
    y = np.asarray(y, dtype=float)
    p = np.clip(np.asarray(p, dtype=float), ___, ___)
    return float(-np.mean(y * np.log(p) + ___ * np.log(1 - p)))
```

### Solução
```python
import numpy as np


def mse(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean((y - p) ** 2))


def mae(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean(np.abs(y - p)))


def perda_logistica(y, p, eps=1e-12):
    y = np.asarray(y, dtype=float)
    p = np.clip(np.asarray(p, dtype=float), eps, 1 - eps)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
```

### Dicas
1. Sem o quadrado ou o módulo, erros positivos e negativos se cancelam na média.
2. O corte precisa dos dois lados: $p = 0$ quebra o primeiro logaritmo e $p = 1$ quebra o segundo.
3. O segundo termo da entropia cruzada vale para os exemplos com $y = 0$: o peso dele é o complemento de $y$.

### Verificação
```json
[
  { "id": "mse-basico", "checkpoint": 1, "kind": "call", "function": "mse", "args": [[1, 2, 3], [1, 2, 5]],
    "expected": 1.3333333333333333, "type": "float", "tolerance": 1e-12, "name": "mse([1, 2, 3], [1, 2, 5]) é 4/3" },
  { "id": "mse-cancelamento", "checkpoint": 1, "kind": "call", "function": "mse", "args": [[0, 0], [1, -1]],
    "expected": 1.0, "type": "float", "tolerance": 1e-12, "name": "Erros +1 e −1 não se cancelam no MSE",
    "hint": "Eleve cada erro ao quadrado antes da média." },
  { "id": "mse-outlier", "checkpoint": 1, "kind": "call", "function": "mse", "args": [[10, 12, 11, 13, 50], [12, 12, 12, 12, 12]],
    "expected": 290.0, "type": "float", "tolerance": 1e-9, "name": "MSE das entregas com o outlier" },
  { "id": "mae-cancelamento", "checkpoint": 2, "kind": "call", "function": "mae", "args": [[0, 0], [1, -1]],
    "expected": 1.0, "type": "float", "tolerance": 1e-12, "name": "Erros +1 e −1 não se cancelam no MAE",
    "hint": "Tire o módulo de cada erro antes da média." },
  { "id": "mae-outlier", "checkpoint": 2, "kind": "call", "function": "mae", "args": [[10, 12, 11, 13, 50], [12, 12, 12, 12, 12]],
    "expected": 8.4, "type": "float", "tolerance": 1e-9, "name": "MAE das entregas com o outlier" },
  { "id": "log-basico", "checkpoint": 3, "kind": "call", "function": "perda_logistica", "args": [[1, 0], [0.8, 0.3]],
    "expected": 0.2899092476264711, "type": "float", "tolerance": 1e-12, "name": "Perda com p = 0.8 para y = 1 e p = 0.3 para y = 0",
    "hint": "Para y = 0, a perda é −ln(1 − p)." },
  { "id": "log-meio", "checkpoint": 3, "kind": "call", "function": "perda_logistica", "args": [[1, 0, 1], [0.5, 0.5, 0.5]],
    "expected": 0.6931471805599453, "type": "float", "tolerance": 1e-12, "name": "Com p = 0.5 em tudo, a perda é ln 2" },
  { "id": "log-certeiro", "checkpoint": 3, "kind": "call", "function": "perda_logistica", "args": [[1, 0], [1.0, 0.0]],
    "expected": 0.0, "type": "float", "tolerance": 1e-9, "name": "Acertar com p = 1 e p = 0 dá perda perto de zero, sem nan",
    "hint": "0 · log(0) é nan no numpy: corte p antes do logaritmo." },
  { "id": "log-errado-1", "checkpoint": 3, "kind": "call", "function": "perda_logistica", "args": [[0], [1.0]],
    "expected": 27.631, "type": "float", "tolerance": 1e-3, "name": "Errar com p = 1 para y = 0 custa cerca de −ln(1e-12) ≈ 27.63, sem inf",
    "hint": "O corte tem limite de cima também: 1 − eps." },
  { "id": "log-errado-0", "checkpoint": 3, "kind": "call", "function": "perda_logistica", "args": [[1], [0.0]],
    "expected": 27.631, "type": "float", "tolerance": 1e-3, "name": "Errar com p = 0 para y = 1 também custa cerca de 27.63" },
  { "id": "log-eps", "checkpoint": 3, "kind": "call", "function": "perda_logistica", "args": [[1], [0.0]], "kwargs": { "eps": 0.001 },
    "expected": 6.907755278982137, "type": "float", "tolerance": 1e-9, "name": "Com eps = 0.001, o pior caso custa −ln(0.001)",
    "hint": "Use o eps recebido nos dois limites." }
]
```

### Soluções erradas
```python name="MSE sem o quadrado"
import numpy as np


def mse(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean(y - p))


def mae(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean(np.abs(y - p)))


def perda_logistica(y, p, eps=1e-12):
    y = np.asarray(y, dtype=float)
    p = np.clip(np.asarray(p, dtype=float), eps, 1 - eps)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
```
```python name="MAE sem o módulo"
import numpy as np


def mse(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean((y - p) ** 2))


def mae(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean(y - p))


def perda_logistica(y, p, eps=1e-12):
    y = np.asarray(y, dtype=float)
    p = np.clip(np.asarray(p, dtype=float), eps, 1 - eps)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
```
```python name="MAE com o quadrado"
import numpy as np


def mse(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean((y - p) ** 2))


def mae(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean((y - p) ** 2))


def perda_logistica(y, p, eps=1e-12):
    y = np.asarray(y, dtype=float)
    p = np.clip(np.asarray(p, dtype=float), eps, 1 - eps)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
```
```python name="corte de 0 a 1 (sem corte)"
import numpy as np


def mse(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean((y - p) ** 2))


def mae(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean(np.abs(y - p)))


def perda_logistica(y, p, eps=1e-12):
    y = np.asarray(y, dtype=float)
    p = np.clip(np.asarray(p, dtype=float), 0, 1)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
```
```python name="corte só por baixo"
import numpy as np


def mse(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean((y - p) ** 2))


def mae(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean(np.abs(y - p)))


def perda_logistica(y, p, eps=1e-12):
    y = np.asarray(y, dtype=float)
    p = np.clip(np.asarray(p, dtype=float), eps, 1)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))
```
```python name="y no lugar de 1 − y"
import numpy as np


def mse(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean((y - p) ** 2))


def mae(y, p):
    y = np.asarray(y, dtype=float)
    p = np.asarray(p, dtype=float)
    return float(np.mean(np.abs(y - p)))


def perda_logistica(y, p, eps=1e-12):
    y = np.asarray(y, dtype=float)
    p = np.clip(np.asarray(p, dtype=float), eps, 1 - eps)
    return float(-np.mean(y * np.log(p) + y * np.log(1 - p)))
```

## Passo 4 · Leitura · Gradiente descendente genérico

Na lição 2 você deu um passo de descida. Treinar é repetir esse passo até o custo parar de cair:

$$
x_{k+1} = x_k - \eta\, \nabla f(x_k), \qquad k = 0, 1, 2, \dots
$$

Uma função genérica recebe o gradiente como **parâmetro** (uma função), o ponto inicial, a taxa e dois limites. O primeiro é o número máximo de passos, que garante que o laço termina. O segundo é a **tolerância**: quando o deslocamento $\lVert \eta\, \nabla f(x_k) \rVert$ fica menor que ela, o ponto praticamente parou de se mexer, e continuar é gastar tempo. Parar só pelo número de passos desperdiça trabalho quando o mínimo chega cedo e para longe dele quando a taxa é pequena.

O programa abaixo desce $f(x) = (x - 3)^2$, de derivada $2(x - 3)$, a partir de $x = 0$, com taxa 0,25 e tolerância 0,2. Use o botão "Visualizar" e acompanhe o deslocamento encolhendo a cada volta.

```python visualizar
def grad(x):
    return 2 * (x - 3)


x = 0.0
taxa = 0.25
tol = 0.2
historico = [x]
for passo in range(5):
    deslocamento = taxa * grad(x)
    x = x - deslocamento
    historico.append(x)
    if abs(deslocamento) < tol:
        break
print(historico)
```

Os deslocamentos são 1,5, 0,75, 0,375 e 0,1875: a cada passo o ponto anda metade do que falta até 3, e o laço para no quarto passo, em 2,8125, sem usar o quinto. A tolerância é do mesmo tipo de grandeza que o ponto: com $10^{-6}$, ele pararia bem mais perto de 3.

O **histórico** (a lista dos pontos visitados, ou dos custos) é o que permite diagnosticar o treino depois, e um detalhe de numpy pode estragá-lo. Com `x -= deslocamento` num array, o objeto é o mesmo a cada volta, e `historico.append(x)` guarda várias vezes o **mesmo** array: no fim, todas as posições da lista mostram o último ponto. Com `x = x - deslocamento`, cada passo cria um array novo e a lista guarda a trajetória de verdade. Pelo mesmo motivo, a função começa com uma **cópia** do ponto inicial (`np.array(x0, dtype=float)`), para não alterar o array de quem a chamou.

```python
x = np.array([1.0]); historico = [x]
x -= 0.5                         # altera o mesmo objeto
historico                        # [array([0.5])]: o ponto inicial sumiu
```

## Passo 5 · Exercício · Descer até parar

Escreva o gradiente descendente genérico, com limite de passos, parada por tolerância e histórico.

### Instruções
1. `gradiente_descendente(grad, x0, taxa, passos, tol)` começa de uma cópia `float` de `x0` (lista ou array) e repete no máximo `passos` vezes: calcula o deslocamento `taxa * grad(x)`, atualiza $x \leftarrow x - \text{deslocamento}$ e guarda o ponto novo no histórico.
2. Logo depois de guardar o ponto, para se a norma do deslocamento for menor que `tol`.
3. Devolve a tupla `(x, historico)`: o ponto final (array) e a lista dos pontos visitados, começando por `x0` (arrays distintos, um por ponto).
4. Não altera o `x0` recebido.

### Código inicial
```python
import numpy as np


def gradiente_descendente(grad, x0, taxa, passos, tol):
    pass
```

### Solução
```python
import numpy as np


def gradiente_descendente(grad, x0, taxa, passos, tol):
    x = np.array(x0, dtype=float)
    historico = [x]
    for _ in range(passos):
        deslocamento = taxa * np.asarray(grad(x), dtype=float)
        x = x - deslocamento
        historico.append(x)
        if np.linalg.norm(deslocamento) < tol:
            break
    return x, historico
```

### Dicas
1. `np.array(x0, dtype=float)` já é uma cópia; atualize com `x = x - ...` para criar um array novo a cada passo.
2. O deslocamento é `taxa * grad(x)`: é a norma **dele**, e não a do gradiente, que se compara com `tol`.
3. O histórico começa com o ponto inicial; com `k` passos dados, ele tem `k + 1` pontos.

### Verificação
```json
[
  { "id": "para-pela-tolerancia", "checkpoint": 2, "kind": "expr",
    "setup": "def grad(p):\n    return 2 * p\nx, h = gradiente_descendente(grad, [1.0], 0.25, 100, 1e-6)",
    "expr": "[len(h), x.tolist()]", "expected": [21, [9.5367431640625e-07]], "tolerance": 1e-15,
    "name": "Em x², com taxa 0.25, para depois de 20 passos (deslocamento 0.5^20 < 1e-6)",
    "hint": "Compare a norma do deslocamento, não a do gradiente, com tol; e pare logo depois de guardar o ponto." },
  { "id": "trajetoria", "checkpoint": 3, "kind": "expr",
    "setup": "def grad(p):\n    return 2 * p\nx, h = gradiente_descendente(grad, [1.0], 0.25, 3, 1e-6)",
    "expr": "[float(p[0]) for p in h]", "expected": [1.0, 0.5, 0.25, 0.125], "tolerance": 1e-12,
    "name": "Com 3 passos, o histórico tem os 4 pontos da trajetória",
    "hint": "Cada posição do histórico precisa ser um array diferente: x -= ... altera sempre o mesmo." },
  { "id": "tol-zero", "checkpoint": 1, "kind": "expr",
    "setup": "def grad(p):\n    return 2 * p\nx, h = gradiente_descendente(grad, [1.0], 0.25, 10, 0.0)",
    "expr": "len(h)", "expected": 11, "name": "Com tol = 0, dá todos os 10 passos" },
  { "id": "duas-dimensoes", "checkpoint": 1, "kind": "expr",
    "setup": "def grad(p):\n    return np.array([2 * p[0], 6 * p[1]])\nx, h = gradiente_descendente(grad, [1.0, 1.0], 0.1, 500, 1e-10)",
    "expr": "bool(np.abs(x).max() < 1e-6)", "expected": true, "name": "Em x² + 3y², chega a menos de 1e-6 da origem" },
  { "id": "diverge", "checkpoint": 1, "kind": "expr",
    "setup": "def grad(p):\n    return 2 * p\nx, h = gradiente_descendente(grad, [1.0], 1.1, 5, 1e-6)",
    "expr": "[len(h), x.tolist()]", "expected": [6, [-2.48832]], "tolerance": 1e-9,
    "name": "Com taxa 1.1 em x², o ponto oscila e cresce: (−1.2)^5", "hint": "Ande contra o gradiente: x − taxa · grad(x)." },
  { "id": "inteiros", "checkpoint": 1, "kind": "expr",
    "setup": "def grad(p):\n    return 2 * p\nx, h = gradiente_descendente(grad, [2, -1], 0.25, 1, 0.0)",
    "expr": "x.tolist()", "expected": [1.0, -0.5], "tolerance": 1e-12, "name": "Funciona com x0 de inteiros" },
  { "id": "x0-intacto", "checkpoint": 4, "kind": "expr",
    "setup": "def grad(p):\n    return 2 * p\nx0 = np.array([1.0, -2.0])\nx, h = gradiente_descendente(grad, x0, 0.25, 5, 0.0)",
    "expr": "x0.tolist()", "expected": [1.0, -2.0], "name": "O x0 recebido não muda",
    "hint": "np.asarray de um array float devolve o próprio array; faça uma cópia." },
  { "id": "inicio", "checkpoint": 3, "kind": "expr",
    "setup": "def grad(p):\n    return 2 * (p - 3)\nx, h = gradiente_descendente(grad, [0.0], 0.25, 50, 0.2)",
    "expr": "[float(p[0]) for p in h]", "expected": [0.0, 1.5, 2.25, 2.625, 2.8125], "tolerance": 1e-12,
    "name": "O exemplo da leitura: começa em 0 e para em 2.8125" },
  { "id": "tipos", "checkpoint": 3, "kind": "expr",
    "setup": "def grad(p):\n    return 2 * p\nr = gradiente_descendente(grad, [1.0], 0.25, 3, 0.0)",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__, type(r[1][0]).__name__]",
    "expected": ["tuple", "ndarray", "list", "ndarray"], "name": "Devolve (array, lista de arrays)" }
]
```

### Soluções erradas
```python name="atualiza com +"
import numpy as np


def gradiente_descendente(grad, x0, taxa, passos, tol):
    x = np.array(x0, dtype=float)
    historico = [x]
    for _ in range(passos):
        deslocamento = taxa * np.asarray(grad(x), dtype=float)
        x = x + deslocamento
        historico.append(x)
        if np.linalg.norm(deslocamento) < tol:
            break
    return x, historico
```
```python name="só para pelo número de passos"
import numpy as np


def gradiente_descendente(grad, x0, taxa, passos, tol):
    x = np.array(x0, dtype=float)
    historico = [x]
    for _ in range(passos):
        deslocamento = taxa * np.asarray(grad(x), dtype=float)
        x = x - deslocamento
        historico.append(x)
    return x, historico
```
```python name="guarda o mesmo array no histórico"
import numpy as np


def gradiente_descendente(grad, x0, taxa, passos, tol):
    x = np.array(x0, dtype=float)
    historico = [x]
    for _ in range(passos):
        deslocamento = taxa * np.asarray(grad(x), dtype=float)
        x -= deslocamento
        historico.append(x)
        if np.linalg.norm(deslocamento) < tol:
            break
    return x, historico
```
```python name="altera o x0 recebido"
import numpy as np


def gradiente_descendente(grad, x0, taxa, passos, tol):
    x = np.asarray(x0, dtype=float)
    historico = [x.copy()]
    for _ in range(passos):
        deslocamento = taxa * np.asarray(grad(x), dtype=float)
        x -= deslocamento
        historico.append(x.copy())
        if np.linalg.norm(deslocamento) < tol:
            break
    return x, historico
```
```python name="para pela norma do gradiente"
import numpy as np


def gradiente_descendente(grad, x0, taxa, passos, tol):
    x = np.array(x0, dtype=float)
    historico = [x]
    for _ in range(passos):
        g = np.asarray(grad(x), dtype=float)
        x = x - taxa * g
        historico.append(x)
        if np.linalg.norm(g) < tol:
            break
    return x, historico
```
```python name="histórico sem o ponto inicial"
import numpy as np


def gradiente_descendente(grad, x0, taxa, passos, tol):
    x = np.array(x0, dtype=float)
    historico = []
    for _ in range(passos):
        deslocamento = taxa * np.asarray(grad(x), dtype=float)
        x = x - deslocamento
        historico.append(x)
        if np.linalg.norm(deslocamento) < tol:
            break
    return x, historico
```

## Passo 6 · Leitura · Taxa, divergência e convexidade

A taxa $\eta$ decide tudo. Em $f(x) = x^2$, um passo leva $x$ a $x - 2\eta x = (1 - 2\eta)\,x$. Com $\eta = 0{,}01$, o ponto encolhe 2 % por passo: converge, mas leva centenas de passos (**lento**). Com $\eta = 0{,}25$, cai pela metade a cada passo (**bom**). Com $0{,}5 < \eta < 1$, o fator fica negativo: o ponto pula de um lado para o outro do mínimo, mas ainda se aproxima. Com $\eta > 1$, $|1 - 2\eta| > 1$, e cada passo afasta mais: o treino **diverge**, e em poucas dezenas de passos os números viram `inf` e depois `nan`, sem nenhum erro do numpy.

Num modelo real, o diagnóstico é a **curva de custo**, o custo a cada passo. Subindo, ou com `nan`: taxa grande demais. Ainda caindo bastante no último passo: lento, ou parou cedo. Caindo e achatando: bom. Vale a **tendência**: uma subida isolada no meio (comum nos mini-lotes do módulo 2) não é divergência, e um custo que caiu no último passo pode estar acima de onde começou.

Uma função é **convexa** quando o segmento entre dois pontos do gráfico fica sempre acima dele, como numa tigela: todo mínimo local é global, e a descida com taxa adequada chega lá de qualquer ponto. O MSE de um modelo linear e a entropia cruzada da logística são convexos nos pesos; o custo de uma rede neural (Nível 6) não é, e o resultado depende do ponto inicial.

Mesmo convexa, uma função pode ser difícil. A de **Rosenbrock** tem o mínimo em $(1, 1)$ no fundo de um vale estreito e curvo:

$$
f(x, y) = (1 - x)^2 + 100\,(y - x^2)^2 \qquad \nabla f = \begin{pmatrix} -2(1 - x) - 400\,x\,(y - x^2) \\ 200\,(y - x^2) \end{pmatrix}
$$

As paredes são íngremes, o fundo é quase plano, e o gradiente aponta para a parede, não para o mínimo. No executor, de $(0, 0)$ com $\eta = 0{,}002$, o custo cai em todos os passos e chega a $(0{,}994;\ 0{,}989)$ em 5 000 passos. Com $\eta = 0{,}004$, o ponto quica entre as paredes e o custo sobe em alguns passos; com $\eta = 0{,}01$, a partir de $(-1, 1)$, vira `nan` antes do passo 50.

## Passo 7 · Exercício · Diagnóstico e Rosenbrock

Escreva o diagnóstico da curva de custo e a descida na função de Rosenbrock.

### Instruções
1. `diagnosticar_taxa(historico)` recebe a lista dos custos (pelo menos dois) e devolve `"diverge"` se algum custo não é finito (`nan` ou `inf`) ou se o último é maior que o primeiro.
2. Senão, com `queda_total` = primeiro − último e `queda_final` = penúltimo − último, devolve `"lento"` se `queda_final > 0.01 * queda_total` (o último passo ainda tirou mais de 1 % de tudo o que caiu) e `"ok"` caso contrário.
3. `minimizar_rosenbrock(x0, taxa, passos)` dá exatamente `passos` passos de gradiente descendente na função `rosenbrock` do código inicial, a partir de uma cópia `float` de `x0`, com o gradiente da leitura.
4. Devolve `(x, custos)`: o ponto final (array) e a lista dos custos como `float`, começando pelo custo em `x0` (`passos + 1` valores).

### Código inicial
```python
import numpy as np


def rosenbrock(p):
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def diagnosticar_taxa(historico):
    pass


def minimizar_rosenbrock(x0, taxa, passos):
    pass
```

### Solução
```python
import numpy as np


def rosenbrock(p):
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def diagnosticar_taxa(historico):
    h = np.asarray(historico, dtype=float)
    if not np.all(np.isfinite(h)) or h[-1] > h[0]:
        return "diverge"
    queda_total = h[0] - h[-1]
    queda_final = h[-2] - h[-1]
    if queda_final > 0.01 * queda_total:
        return "lento"
    return "ok"


def grad_rosenbrock(p):
    x, y = p
    return np.array([-2 * (1 - x) - 400 * x * (y - x ** 2), 200 * (y - x ** 2)])


def minimizar_rosenbrock(x0, taxa, passos):
    p = np.array(x0, dtype=float)
    custos = [float(rosenbrock(p))]
    for _ in range(passos):
        p = p - taxa * grad_rosenbrock(p)
        custos.append(float(rosenbrock(p)))
    return p, custos
```

### Dicas
1. `np.isfinite` diz, posição a posição, se o valor é um número comum; qualquer comparação com `nan` dá `False`, então `nan > 3` não acusa nada.
2. A divergência olha o primeiro e o último custo, não só o último passo; a lentidão compara a última queda com a queda total, não com um número fixo.
3. Escreva o gradiente de Rosenbrock numa função à parte e confira-o com o `verificar_gradiente` da lição 2 antes de descer.

### Verificação
```json
[
  { "id": "lento", "checkpoint": 2, "kind": "expr", "expr": "diagnosticar_taxa([100.0, 50.0, 25.0, 12.5, 6.25])", "expected": "lento",
    "name": "Caindo pela metade até o fim: lento (o último passo ainda tirou 6,25 de 93,75)" },
  { "id": "ok", "checkpoint": 2, "kind": "expr", "expr": "diagnosticar_taxa([100.0, 10.0, 1.0, 0.1, 0.1, 0.1])", "expected": "ok",
    "name": "Caiu e achatou: ok" },
  { "id": "diverge", "checkpoint": 1, "kind": "expr", "expr": "diagnosticar_taxa([1.0, 2.2, 4.8, 10.6])", "expected": "diverge",
    "name": "Subindo sempre: diverge" },
  { "id": "nan", "checkpoint": 1, "kind": "expr", "expr": "diagnosticar_taxa([5.0, 3.0, float('nan')])", "expected": "diverge",
    "name": "Um nan no histórico: diverge", "hint": "Comparações com nan dão sempre False: teste com np.isfinite." },
  { "id": "subida-no-meio", "checkpoint": 1, "kind": "expr", "expr": "diagnosticar_taxa([10.0, 4.0, 5.0, 2.0, 1.0, 1.0, 1.0])", "expected": "ok",
    "name": "Uma subida no meio, mas a curva cai e achata: ok", "hint": "Olhe a tendência, não cada passo." },
  { "id": "ultimo-passo-caiu", "checkpoint": 1, "kind": "expr", "expr": "diagnosticar_taxa([1.0, 5.0, 30.0, 29.0])", "expected": "diverge",
    "name": "O último passo caiu, mas o custo terminou 29 vezes acima do início: diverge",
    "hint": "Compare o último custo com o primeiro." },
  { "id": "escala-pequena", "checkpoint": 2, "kind": "expr", "expr": "diagnosticar_taxa([0.001, 0.0005, 0.00025])", "expected": "lento",
    "name": "Custos pequenos caindo pela metade: lento", "hint": "O limiar é relativo à queda total, não um número fixo." },
  { "id": "rosen-chega", "checkpoint": 3, "kind": "expr", "setup": "x, c = minimizar_rosenbrock([0.0, 0.0], 0.002, 5000)",
    "expr": "bool(np.abs(x - 1).max() < 0.05)", "expected": true, "name": "De (0, 0), com taxa 0.002 e 5000 passos, chega perto de (1, 1)",
    "hint": "Confira o gradiente com o verificador da lição 2." },
  { "id": "rosen-custos", "checkpoint": 4, "kind": "expr", "setup": "x, c = minimizar_rosenbrock([-1.0, 1.0], 0.002, 5000)",
    "expr": "[len(c), c[0], type(c[1]).__name__]", "expected": [5001, 4.0, "float"], "tolerance": 1e-12,
    "name": "5001 custos, o primeiro é f(−1, 1) = 4, todos float", "hint": "O custo do ponto inicial entra na lista." },
  { "id": "rosen-decrescente", "checkpoint": 3, "kind": "expr", "setup": "x, c = minimizar_rosenbrock([0.0, 0.0], 0.002, 5000)",
    "expr": "bool(np.all(np.diff(c) <= 0))", "expected": true, "name": "Com taxa 0.002, o custo nunca sobe" },
  { "id": "rosen-diverge", "checkpoint": 3, "kind": "expr", "setup": "x, c = minimizar_rosenbrock([-1.0, 1.0], 0.01, 50)",
    "expr": "diagnosticar_taxa(c)", "expected": "diverge", "name": "Com taxa 0.01, o diagnóstico da curva é diverge" },
  { "id": "rosen-intacto", "checkpoint": 3, "kind": "expr", "setup": "x0 = np.array([0.0, 0.0])\nx, c = minimizar_rosenbrock(x0, 0.002, 10)",
    "expr": "x0.tolist()", "expected": [0.0, 0.0], "name": "O x0 recebido não muda" }
]
```

### Soluções erradas
```python name="diverge só pelo último passo"
import numpy as np


def rosenbrock(p):
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def diagnosticar_taxa(historico):
    h = np.asarray(historico, dtype=float)
    if not np.all(np.isfinite(h)) or h[-1] > h[-2]:
        return "diverge"
    queda_total = h[0] - h[-1]
    queda_final = h[-2] - h[-1]
    if queda_final > 0.01 * queda_total:
        return "lento"
    return "ok"


def grad_rosenbrock(p):
    x, y = p
    return np.array([-2 * (1 - x) - 400 * x * (y - x ** 2), 200 * (y - x ** 2)])


def minimizar_rosenbrock(x0, taxa, passos):
    p = np.array(x0, dtype=float)
    custos = [float(rosenbrock(p))]
    for _ in range(passos):
        p = p - taxa * grad_rosenbrock(p)
        custos.append(float(rosenbrock(p)))
    return p, custos
```
```python name="qualquer subida é divergência"
import numpy as np


def rosenbrock(p):
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def diagnosticar_taxa(historico):
    h = np.asarray(historico, dtype=float)
    if not np.all(np.isfinite(h)) or np.any(np.diff(h) > 0):
        return "diverge"
    queda_total = h[0] - h[-1]
    queda_final = h[-2] - h[-1]
    if queda_final > 0.01 * queda_total:
        return "lento"
    return "ok"


def grad_rosenbrock(p):
    x, y = p
    return np.array([-2 * (1 - x) - 400 * x * (y - x ** 2), 200 * (y - x ** 2)])


def minimizar_rosenbrock(x0, taxa, passos):
    p = np.array(x0, dtype=float)
    custos = [float(rosenbrock(p))]
    for _ in range(passos):
        p = p - taxa * grad_rosenbrock(p)
        custos.append(float(rosenbrock(p)))
    return p, custos
```
```python name="limiar absoluto"
import numpy as np


def rosenbrock(p):
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def diagnosticar_taxa(historico):
    h = np.asarray(historico, dtype=float)
    if not np.all(np.isfinite(h)) or h[-1] > h[0]:
        return "diverge"
    queda_final = h[-2] - h[-1]
    if queda_final > 0.01:
        return "lento"
    return "ok"


def grad_rosenbrock(p):
    x, y = p
    return np.array([-2 * (1 - x) - 400 * x * (y - x ** 2), 200 * (y - x ** 2)])


def minimizar_rosenbrock(x0, taxa, passos):
    p = np.array(x0, dtype=float)
    custos = [float(rosenbrock(p))]
    for _ in range(passos):
        p = p - taxa * grad_rosenbrock(p)
        custos.append(float(rosenbrock(p)))
    return p, custos
```
```python name="não confere nan"
import numpy as np


def rosenbrock(p):
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def diagnosticar_taxa(historico):
    h = np.asarray(historico, dtype=float)
    if h[-1] > h[0]:
        return "diverge"
    queda_total = h[0] - h[-1]
    queda_final = h[-2] - h[-1]
    if queda_final > 0.01 * queda_total:
        return "lento"
    return "ok"


def grad_rosenbrock(p):
    x, y = p
    return np.array([-2 * (1 - x) - 400 * x * (y - x ** 2), 200 * (y - x ** 2)])


def minimizar_rosenbrock(x0, taxa, passos):
    p = np.array(x0, dtype=float)
    custos = [float(rosenbrock(p))]
    for _ in range(passos):
        p = p - taxa * grad_rosenbrock(p)
        custos.append(float(rosenbrock(p)))
    return p, custos
```
```python name="sinal trocado no termo cruzado"
import numpy as np


def rosenbrock(p):
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def diagnosticar_taxa(historico):
    h = np.asarray(historico, dtype=float)
    if not np.all(np.isfinite(h)) or h[-1] > h[0]:
        return "diverge"
    queda_total = h[0] - h[-1]
    queda_final = h[-2] - h[-1]
    if queda_final > 0.01 * queda_total:
        return "lento"
    return "ok"


def grad_rosenbrock(p):
    x, y = p
    return np.array([-2 * (1 - x) + 400 * x * (y - x ** 2), 200 * (y - x ** 2)])


def minimizar_rosenbrock(x0, taxa, passos):
    p = np.array(x0, dtype=float)
    custos = [float(rosenbrock(p))]
    for _ in range(passos):
        p = p - taxa * grad_rosenbrock(p)
        custos.append(float(rosenbrock(p)))
    return p, custos
```
```python name="derivada em y sem o x²"
import numpy as np


def rosenbrock(p):
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def diagnosticar_taxa(historico):
    h = np.asarray(historico, dtype=float)
    if not np.all(np.isfinite(h)) or h[-1] > h[0]:
        return "diverge"
    queda_total = h[0] - h[-1]
    queda_final = h[-2] - h[-1]
    if queda_final > 0.01 * queda_total:
        return "lento"
    return "ok"


def grad_rosenbrock(p):
    x, y = p
    return np.array([-2 * (1 - x) - 400 * x * (y - x ** 2), 200 * y])


def minimizar_rosenbrock(x0, taxa, passos):
    p = np.array(x0, dtype=float)
    custos = [float(rosenbrock(p))]
    for _ in range(passos):
        p = p - taxa * grad_rosenbrock(p)
        custos.append(float(rosenbrock(p)))
    return p, custos
```
```python name="custos sem o ponto inicial"
import numpy as np


def rosenbrock(p):
    x, y = p
    return (1 - x) ** 2 + 100 * (y - x ** 2) ** 2


def diagnosticar_taxa(historico):
    h = np.asarray(historico, dtype=float)
    if not np.all(np.isfinite(h)) or h[-1] > h[0]:
        return "diverge"
    queda_total = h[0] - h[-1]
    queda_final = h[-2] - h[-1]
    if queda_final > 0.01 * queda_total:
        return "lento"
    return "ok"


def grad_rosenbrock(p):
    x, y = p
    return np.array([-2 * (1 - x) - 400 * x * (y - x ** 2), 200 * (y - x ** 2)])


def minimizar_rosenbrock(x0, taxa, passos):
    p = np.array(x0, dtype=float)
    custos = []
    for _ in range(passos):
        p = p - taxa * grad_rosenbrock(p)
        custos.append(float(rosenbrock(p)))
    return p, custos
```

## Passo 8 · Quiz · Convexidade e taxa

### Pergunta
Os dez primeiros custos de um treino foram `12.0, 3.1, 9.8, 2.7, 11.5, 2.9, 14.0, 3.3, 17.2, 4.1`. O que fazer?
- [ ] Nada: o custo caiu de 12,0 para 4,1, então o treino está convergindo
- [ ] Aumentar a taxa, porque o custo ainda está alto
- [x] Diminuir a taxa: os valores pulam de um lado para o outro e os picos crescem (11,5, 14,0, 17,2), sinal de passos grandes demais
- [ ] Trocar o MSE pelo MAE, que não oscila
> O ponto está quicando entre as paredes do vale, e os picos sobem a cada volta: com mais passos, o treino diverge. Olhar só o último valor engana (4,1 é menor que 12,0 porque caiu num vale de um pulo). Aumentar a taxa piora; o problema é o tamanho do passo, não o custo escolhido.

### Pergunta
Uma regressão linear é treinada com gradiente descendente a partir de três pesos iniciais diferentes, e as três chegam aos mesmos coeficientes. Uma rede neural pequena, treinada do mesmo jeito, chega a três resultados diferentes. Qual é a explicação?
- [ ] A rede usou uma taxa menor e não teve tempo de convergir
- [x] O MSE de um modelo linear é convexo nos pesos (um único mínimo, alcançável de qualquer ponto); o custo da rede não é convexo e tem vários mínimos locais
- [ ] O gradiente descendente é aleatório e por sorte a regressão deu igual
- [ ] Redes neurais não têm mínimo global
> Na tigela convexa, toda descida leva ao mesmo fundo. O custo de uma rede tem vales e platôs, e o ponto inicial decide em qual vale a descida termina. O gradiente descendente em lote é determinístico (não há sorte), e o custo de uma rede tem, sim, um menor valor; o que falta é a garantia de chegar a ele.

### Pergunta
Um treino com `taxa = 1e-6` e `tol = 1e-4` (parada quando a norma do deslocamento fica menor que `tol`) parou no primeiro passo, com o custo ainda alto e o gradiente de norma 50. O que aconteceu?
- [x] O deslocamento é `taxa` vezes o gradiente, $10^{-6} \cdot 50 = 5 \times 10^{-5}$, já menor que a tolerância: com uma taxa minúscula o critério dispara antes de o ponto andar
- [ ] O ponto inicial já era o mínimo, e o gradiente de 50 é erro de arredondamento
- [ ] A tolerância é grande demais para qualquer taxa, e o certo é sempre usar `tol = 0`
- [ ] O treino divergiu, e o critério de parada evitou o `nan`
> A parada pelo deslocamento mede quanto o ponto andou, e isso depende da taxa. Com um gradiente de norma 50 o ponto está longe do mínimo (no mínimo o gradiente é zero). A saída é usar uma taxa adequada ou combinar critérios (gradiente pequeno, custo parado); `tol = 0` só anularia a parada. Nada diverge com passos tão pequenos.
