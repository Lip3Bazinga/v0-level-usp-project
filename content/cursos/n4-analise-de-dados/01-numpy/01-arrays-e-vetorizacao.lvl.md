---
slug: n4-m1-01-arrays-e-vetorizacao
titulo: Arrays e vetorização
descricao: ndarray, dtype, shape, criação (arange, linspace, zeros, ones), operações elemento a elemento e por que são mais rápidas que laços.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar arrays com dtype e shape controlados e inspecioná-los
- Substituir laços por operações vetorizadas e funções universais (ufuncs)
- Medir a diferença de desempenho entre laço Python e numpy
---

## Passo 1 · Leitura · Um milhão de temperaturas

Uma estação meteorológica fictícia mandou um milhão de leituras em graus Fahrenheit, e você precisa delas em Celsius. Com o que você já sabe, sai uma compreensão de lista. Com o numpy, sai uma conta sobre o array inteiro:

```python
import time
import numpy as np

fahrenheit = [70 + (i % 30) for i in range(1_000_000)]

inicio = time.perf_counter()
celsius = [(f - 32) * 5 / 9 for f in fahrenheit]
laco = time.perf_counter() - inicio

f_array = np.array(fahrenheit, dtype=float)
inicio = time.perf_counter()
c_array = (f_array - 32) * 5 / 9
vetorizado = time.perf_counter() - inicio

print(f"laço: {laco * 1000:.1f} ms, numpy: {vetorizado * 1000:.1f} ms")
```

A segunda conta não tem laço visível: `f_array - 32` subtrai 32 de **cada** elemento. Isso é **vetorização**: a operação vale para o array inteiro, e o laço acontece dentro do numpy, em código compilado.

Por que é mais rápido? Uma lista guarda referências para objetos `float` espalhados na memória, e cada volta do laço passa pelo interpretador: lê o objeto, confere o tipo, calcula e cria outro objeto para o resultado. Um `ndarray` guarda os números lado a lado, todos do mesmo tipo, e a conta percorre esse bloco sem consultar tipo nenhum. O visualizador mostra o trabalho de cada volta do laço, com três leituras:

```python visualizar
fahrenheit = [68.0, 77.0, 86.0]
celsius = []
for f in fahrenheit:
    c = (f - 32) * 5 / 9
    celsius.append(c)
print(celsius)
```

Quanto mais rápido depende da máquina, e uma medida só não basta. No Nível 3 você mediu com honestidade: repita, fique com a mediana, cresça a entrada. Rodando o programa acima 5 vezes no executor desta plataforma (Python em WebAssembly), o laço levou de 39 a 54 ms e o numpy de 2,5 a 9,6 ms: a razão variou de 6 a 16, e a primeira rodada foi a mais lenta. Com 10 elementos a ordem se inverte, cerca de 1 µs no laço contra 5 µs no numpy, porque cada chamada ao numpy tem um custo fixo. No Jupyter, `%timeit expressão` faz as repetições por você; num script, use `timeit.repeat`.

Por isso a correção dos exercícios deste nível nunca mede tempo: um teste "o numpy é 5 vezes mais rápido" passaria ou falharia conforme a carga da máquina. Ela confere o resultado e **como** você chegou a ele, por exemplo, sem `for` quando o assunto é vetorizar.

## Passo 2 · Previsão · Lista ou array?

O programa compara uma lista com um array e faz duas somas numa matriz. Leia sem executar e digite exatamente o que ele imprime. O numpy imprime arrays sem vírgulas entre os elementos.

### Código
```python
import numpy as np

lista = [1, 2, 4]
vetor = np.array([1, 2, 4])
print(lista * 2)
print(vetor * 2)
print(vetor * 2 / 2)
print(np.array([1, 2.5]).dtype)

m = np.array([[1, 2, 3], [2, 3, 4]], dtype=float)
print(m.shape, m.ndim, m.size)
print(m.sum(axis=0))
print(m.sum(axis=1))
print((vetor > 1).sum())
```

### Dicas
1. Numa lista, `* 2` repete a lista; num array, multiplica cada elemento.
2. A divisão `/` sempre produz `float`, e o numpy escreve o `float` 2.0 como `2.`.
3. `axis=0` faz sumir o eixo das linhas: sobra um valor por coluna. Uma comparação produz um array de `True` e `False`, e na soma `True` vale 1.

### Saída esperada
```text
[1, 2, 4, 1, 2, 4]
[2 4 8]
[1. 2. 4.]
float64
(2, 3) 2 6
[3. 5. 7.]
[6. 9.]
2
```

## Passo 3 · Leitura · dtype, shape e as fábricas de arrays

Um array guarda números de **um tipo só**, o `dtype`. O `np.array` escolhe o tipo olhando todos os elementos: basta um `float` para todos virarem `float64` (`np.array([1, 2.5])` guarda `1.0`), e só `True`/`False` dão `bool`. Para escolher você mesmo, passe `dtype=`: `np.array([1, 2], dtype=float)`.

O inteiro padrão depende da máquina: no seu computador costuma ser `int64`; no executor da plataforma, que roda Python em WebAssembly de 32 bits, é `int32`. Quando o tamanho importa, peça o tipo pelo nome (`np.int64`). E um array inteiro **trunca em silêncio** o que você grava nele:

```python
precos = np.array([10, 20, 30])
precos[0] = 9.99
print(precos)        # [ 9 20 30]
```

`shape` é a forma: `(3,)` para um vetor de 3 elementos, `(2, 3)` para 2 linhas e 3 colunas. `ndim` é o número de eixos e `size`, o total de elementos. `reshape` muda a forma sem mudar os dados: `np.arange(6).reshape(2, 3)`. Se a conta não fecha, `ValueError: cannot reshape array of size 6 into shape (4,2)`.

Para fabricar arrays sem digitar os elementos:

```python
np.zeros((2, 3))          # 2 x 3 de 0.0: a forma vai numa tupla
np.ones(4)                # [1. 1. 1. 1.]
np.full((2, 2), 7.5)      # tudo 7.5
np.eye(3)                 # identidade 3 x 3
np.arange(0, 10, 2)       # [0 2 4 6 8]: o fim fica de fora
np.linspace(0, 1, 5)      # [0.   0.25 0.5  0.75 1.  ]: 5 pontos, com as duas pontas
```

`np.zeros(3, 4)` dá `TypeError: Cannot interpret '4' as a data type`, porque o segundo argumento é o `dtype`. Com passo fracionário, o `arange` engana: `np.arange(1, 1.3, 0.1)` devolve **quatro** valores, `[1.  1.1 1.2 1.3]`, porque `0.1` não é exato em binário. Se você sabe quantos pontos quer, use `linspace`.

`astype` converte e devolve uma cópia. De `float` para inteiro, ele **corta** a parte fracionária em vez de arredondar: `np.array([2.9, -2.9]).astype(int)` dá `[ 2 -2]`. E `0.29 * 100` vale `28.999999999999996`: o numpy mostra `[29.]`, mas o `astype` entrega 28. Arredonde antes de converter.

## Passo 4 · Exercício · Fabricar arrays
modo: lacunas

Uma planilha de notas começa zerada, a escala de um gráfico precisa das duas pontas e um preço em centavos tem de ser inteiro. Complete as lacunas (`___`) das três funções.

### Instruções
1. `notas_zeradas(alunos, provas)` devolve uma matriz `float64` de zeros com `alunos` linhas e `provas` colunas.
2. `pontos(inicio, fim, n)` devolve `n` valores igualmente espaçados de `inicio` até `fim`, incluindo as duas pontas.
3. `centavos(precos)` converte preços em reais para centavos `int64`, arredondando para o centavo mais próximo.

### Código inicial
```python
import numpy as np


def notas_zeradas(alunos, provas):
    return np.zeros(___)


def pontos(inicio, fim, n):
    return np.linspace(___)


def centavos(precos):
    reais = np.asarray(precos, dtype=float)
    return np.___(reais * 100).astype(___)
```

### Solução
```python
import numpy as np


def notas_zeradas(alunos, provas):
    return np.zeros((alunos, provas))


def pontos(inicio, fim, n):
    return np.linspace(inicio, fim, n)


def centavos(precos):
    reais = np.asarray(precos, dtype=float)
    return np.round(reais * 100).astype(np.int64)
```

### Dicas
1. A forma de uma matriz vai numa tupla só; um segundo argumento solto é lido como o `dtype`.
2. O terceiro argumento do `linspace` é quantos pontos você quer, não o tamanho do passo.
3. `astype` para inteiro corta a parte fracionária: o valor precisa chegar ao centavo mais próximo antes da conversão.

### Verificação
```json
[
  { "id": "zeros-forma", "checkpoint": 1, "kind": "expr", "expr": "list(notas_zeradas(3, 4).shape)", "expected": [3, 4],
    "name": "notas_zeradas(3, 4) tem 3 linhas e 4 colunas", "hint": "A forma (linhas, colunas) vai numa tupla só." },
  { "id": "zeros-dtype", "checkpoint": 1, "kind": "expr", "expr": "str(notas_zeradas(2, 5).dtype)", "expected": "float64",
    "name": "As notas são float64", "hint": "Uma nota 7.5 gravada num array inteiro vira 7." },
  { "id": "zeros-valores", "checkpoint": 1, "kind": "expr", "expr": "notas_zeradas(2, 3).tolist()", "expected": [[0, 0, 0], [0, 0, 0]],
    "name": "Todas as notas começam em zero" },
  { "id": "pontos-5", "checkpoint": 2, "kind": "expr", "expr": "pontos(0, 1, 5).tolist()", "expected": [0, 0.25, 0.5, 0.75, 1],
    "tolerance": 1e-12, "name": "pontos(0, 1, 5) inclui o 0 e o 1", "hint": "O fim também é um dos pontos." },
  { "id": "pontos-3", "checkpoint": 2, "kind": "expr", "expr": "pontos(10, 20, 3).tolist()", "expected": [10, 15, 20],
    "tolerance": 1e-12, "name": "pontos(10, 20, 3)" },
  { "id": "pontos-n", "checkpoint": 2, "kind": "expr", "expr": "len(pontos(0, 100, 101))", "expected": 101,
    "name": "pontos(0, 100, 101) tem 101 valores", "hint": "n é a quantidade de pontos, não de intervalos." },
  { "id": "pontos-decrescente", "checkpoint": 2, "kind": "expr", "expr": "pontos(1, -1, 3).tolist()", "expected": [1, 0, -1],
    "tolerance": 1e-12, "name": "pontos(1, -1, 3) desce de 1 a -1" },
  { "id": "centavos-basico", "checkpoint": 3, "kind": "expr", "expr": "centavos([0.29, 1.10, 2.5]).tolist()", "expected": [29, 110, 250],
    "name": "centavos([0.29, 1.10, 2.5])", "hint": "0.29 * 100 não é exatamente 29." },
  { "id": "centavos-proximo", "checkpoint": 3, "kind": "expr", "expr": "centavos([9.999, 0.004]).tolist()", "expected": [1000, 0],
    "name": "centavos([9.999, 0.004]) vai ao centavo mais próximo" },
  { "id": "centavos-dtype", "checkpoint": 3, "kind": "expr", "expr": "str(centavos([1.0, 2.0]).dtype)", "expected": "int64",
    "name": "Os centavos são int64", "hint": "Depois de arredondar, o array ainda é float; e o inteiro padrão do executor tem 32 bits." },
  { "id": "centavos-array", "checkpoint": 3, "kind": "expr", "expr": "centavos([1.0])", "type": "ndarray",
    "name": "centavos devolve um array numpy" }
]
```

### Soluções erradas
```python name="forma em dois argumentos"
import numpy as np


def notas_zeradas(alunos, provas):
    return np.zeros(alunos, provas)


def pontos(inicio, fim, n):
    return np.linspace(inicio, fim, n)


def centavos(precos):
    reais = np.asarray(precos, dtype=float)
    return np.round(reais * 100).astype(np.int64)
```
```python name="matriz de zeros inteiros"
import numpy as np


def notas_zeradas(alunos, provas):
    return np.zeros((alunos, provas), dtype=int)


def pontos(inicio, fim, n):
    return np.linspace(inicio, fim, n)


def centavos(precos):
    reais = np.asarray(precos, dtype=float)
    return np.round(reais * 100).astype(np.int64)
```
```python name="linspace sem a quantidade"
import numpy as np


def notas_zeradas(alunos, provas):
    return np.zeros((alunos, provas))


def pontos(inicio, fim, n):
    return np.linspace(inicio, fim)


def centavos(precos):
    reais = np.asarray(precos, dtype=float)
    return np.round(reais * 100).astype(np.int64)
```
```python name="conta intervalos em vez de pontos"
import numpy as np


def notas_zeradas(alunos, provas):
    return np.zeros((alunos, provas))


def pontos(inicio, fim, n):
    return np.linspace(inicio, fim, n - 1)


def centavos(precos):
    reais = np.asarray(precos, dtype=float)
    return np.round(reais * 100).astype(np.int64)
```
```python name="arredonda para baixo"
import numpy as np


def notas_zeradas(alunos, provas):
    return np.zeros((alunos, provas))


def pontos(inicio, fim, n):
    return np.linspace(inicio, fim, n)


def centavos(precos):
    reais = np.asarray(precos, dtype=float)
    return np.floor(reais * 100).astype(np.int64)
```
```python name="centavos continuam float"
import numpy as np


def notas_zeradas(alunos, provas):
    return np.zeros((alunos, provas))


def pontos(inicio, fim, n):
    return np.linspace(inicio, fim, n)


def centavos(precos):
    reais = np.asarray(precos, dtype=float)
    return np.round(reais * 100).astype(float)
```

## Passo 5 · Leitura · ufuncs, reduções e o parâmetro axis

Aritmética entre um array e um número, ou entre dois arrays da mesma forma, vale **elemento a elemento**:

```python
x = np.array([1.0, 4.0, 9.0])
x + 1            # [ 2.  5. 10.]
x * x            # [ 1. 16. 81.]
x >= 4           # [False  True  True]: comparar dá um array de bool
np.sqrt(x)       # [1. 2. 3.]
```

`np.sqrt`, `np.exp`, `np.log`, `np.abs` e `np.round` são **funções universais** (*ufuncs*): recebem um array e aplicam a conta a cada elemento. Use as do numpy, não as do módulo `math`: `math.sqrt(x)` dá `TypeError: only 0-dimensional arrays can be converted to Python scalars`. Fora do domínio, o numpy não levanta exceção: `np.log(0.0)` vale `-inf` e `np.sqrt(-1.0)` vale `nan` (no seu computador vem junto um `RuntimeWarning`; no executor, não).

Lista misturada com array vira array (`[1, 2] + np.array([10, 20])` dá `[11 22]`), mas entre duas listas o `+` concatena, e uma lista não tem `.mean()`: `AttributeError: 'list' object has no attribute 'mean'`. Converta a entrada no começo da função, com `np.asarray(x, dtype=float)`, e o resto do código trabalha só com arrays.

**Reduções** resumem o array: `sum`, `mean`, `std`, `min`, `max`. Numa matriz, `axis` diz qual eixo **some**:

```python
m = np.array([[1, 2, 3],
              [2, 3, 4]])   # 2 linhas, 3 colunas
m.sum()          # 15: tudo
m.sum(axis=0)    # [3 5 7]: somem as linhas, sobra um valor por coluna
m.sum(axis=1)    # [6 9]: somem as colunas, sobra um valor por linha
```

As reduções também existem como funções do módulo (`np.sum(m, axis=0)` é o mesmo que `m.sum(axis=0)`), e todas aceitam `axis`. Numa matriz quadrada, trocar o eixo não dá erro, só o resultado errado: antes de seguir, confira se o `shape` do que voltou tem um valor por linha ou um por coluna.

O `np.std` calcula o desvio **populacional** ($\text{ddof} = 0$); o pandas, no módulo 2, usa o amostral ($\text{ddof} = 1$). Com média e desvio, o **escore padronizado** diz a quantos desvios cada valor está da média:

$$
z_i = \frac{x_i - \bar{x}}{\sigma}, \qquad \bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i, \qquad \sigma = \sqrt{\frac{1}{n}\sum_{i=1}^{n}(x_i - \bar{x})^2}
$$

Depois de padronizar, a média vira 0 e o desvio vira 1, e dá para comparar notas de provas com escalas diferentes. Nenhuma dessas contas precisa de laço.

## Passo 6 · Exercício · Padronizar sem laço

Escreva a padronização (escore $z$) só com operações vetorizadas.

### Instruções
1. `padronizar(x)` aceita uma lista ou um array e devolve um array `float64` com $z_i = (x_i - \bar{x}) / \sigma$, usando o desvio populacional (o padrão do `np.std`).
2. Se o desvio for zero (todos os valores iguais), devolva um array de zeros do mesmo tamanho.
3. Não use laço (`for`, `while` ou compreensão) e não altere o array recebido.

### Código inicial
```python
import numpy as np


def padronizar(x):
    pass
```

### Solução
```python
import numpy as np


def padronizar(x):
    x = np.asarray(x, dtype=float)
    desvio = x.std()
    if desvio == 0:
        return np.zeros_like(x)
    return (x - x.mean()) / desvio
```

### Dicas
1. Converta a entrada para um array `float` logo na primeira linha; depois, média e desvio são métodos do array.
2. Com todos os valores iguais, a divisão por zero no numpy não levanta exceção: ela devolve `nan`.
3. `x -= ...` escreve no próprio array que você recebeu, e quem chamou a função vê a mudança.

### Verificação
```json
[
  { "id": "tipo", "checkpoint": 1, "kind": "expr", "expr": "padronizar([1, 2, 3])", "type": "ndarray",
    "name": "padronizar([1, 2, 3]) devolve um array numpy", "hint": "A entrada pode ser uma lista; a saída é sempre um array." },
  { "id": "classico", "checkpoint": 1, "kind": "expr", "expr": "padronizar([2, 4, 4, 4, 5, 5, 7, 9]).tolist()",
    "expected": [-1.5, -0.5, -0.5, -0.5, 0.0, 0.0, 1.0, 2.0], "tolerance": 1e-9,
    "name": "padronizar([2, 4, 4, 4, 5, 5, 7, 9]): média 5, desvio 2", "hint": "O desvio é o populacional, o padrão do np.std." },
  { "id": "negativos", "checkpoint": 1, "kind": "expr", "expr": "padronizar([-3.0, 0.0, 3.0]).tolist()",
    "expected": [-1.224744871391589, 0.0, 1.224744871391589], "tolerance": 1e-9, "name": "padronizar([-3.0, 0.0, 3.0])" },
  { "id": "media-zero", "checkpoint": 1, "kind": "expr", "setup": "r = padronizar(np.arange(1000) ** 1.5)",
    "expr": "abs(float(r.mean())) < 1e-9", "expected": true, "name": "Com 1000 valores, a média padronizada é 0" },
  { "id": "desvio-um", "checkpoint": 1, "kind": "expr", "setup": "r = padronizar(np.arange(1000) ** 1.5)",
    "expr": "abs(float(r.std()) - 1) < 1e-9", "expected": true, "name": "Com 1000 valores, o desvio padronizado é 1",
    "hint": "Divida pelo desvio, não pela variância." },
  { "id": "constante", "checkpoint": 2, "kind": "expr", "expr": "padronizar([4, 4, 4]).tolist()", "expected": [0.0, 0.0, 0.0],
    "name": "Valores todos iguais dão zeros", "hint": "Teste o desvio antes de dividir." },
  { "id": "um-valor", "checkpoint": 2, "kind": "expr", "expr": "padronizar([7.5]).tolist()", "expected": [0.0],
    "name": "Um único valor dá [0.0]" },
  { "id": "nao-altera", "checkpoint": 3, "kind": "expr", "setup": "a = np.array([1.0, 2.0, 3.0])\nr = padronizar(a)",
    "expr": "a.tolist()", "expected": [1.0, 2.0, 3.0], "name": "O array recebido não muda",
    "hint": "np.asarray não copia um array que já é float." },
  { "id": "sem-for", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "for" },
    "name": "Sem laço for" },
  { "id": "sem-while", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "while" },
    "name": "Sem laço while" },
  { "id": "sem-compreensao", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension" },
    "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="desvio amostral"
import numpy as np


def padronizar(x):
    x = np.asarray(x, dtype=float)
    desvio = x.std(ddof=1)
    if desvio == 0:
        return np.zeros_like(x)
    return (x - x.mean()) / desvio
```
```python name="divide pela variância"
import numpy as np


def padronizar(x):
    x = np.asarray(x, dtype=float)
    desvio = x.var()
    if desvio == 0:
        return np.zeros_like(x)
    return (x - x.mean()) / desvio
```
```python name="não trata desvio zero"
import numpy as np


def padronizar(x):
    x = np.asarray(x, dtype=float)
    return (x - x.mean()) / x.std()
```
```python name="altera o array recebido"
import numpy as np


def padronizar(x):
    x = np.asarray(x, dtype=float)
    desvio = x.std()
    if desvio == 0:
        return np.zeros_like(x)
    x -= x.mean()
    x /= desvio
    return x
```
```python name="não converte a lista"
import numpy as np


def padronizar(x):
    desvio = np.std(x)
    if desvio == 0:
        return np.zeros(len(x))
    return (x - x.mean()) / desvio
```
```python name="compreensão de lista"
import numpy as np


def padronizar(x):
    x = np.asarray(x, dtype=float)
    media = x.mean()
    desvio = x.std()
    if desvio == 0:
        return np.zeros_like(x)
    return np.array([(v - media) / desvio for v in x])
```
```python name="devolve lista"
import numpy as np


def padronizar(x):
    x = np.asarray(x, dtype=float)
    desvio = x.std()
    if desvio == 0:
        return np.zeros_like(x).tolist()
    return ((x - x.mean()) / desvio).tolist()
```

## Passo 7 · Exercício · Uma semana de temperaturas

`temps` é um array 2D de `float`: uma linha por dia e uma coluna por hora em que o termômetro foi lido. A semana completa tem forma `(7, 24)`; os testes também usam matrizes menores.

### Instruções
1. `media_por_dia(temps)` devolve um array com a temperatura média de cada dia.
2. `maxima_por_hora(temps)` devolve um array com a maior temperatura de cada hora, olhando todos os dias.
3. `amplitude_por_dia(temps)` devolve um array com a diferença entre a máxima e a mínima de cada dia.
4. `horas_de_calor(temps, limite)` devolve um array com quantas leituras de cada dia ficaram **maiores ou iguais** a `limite`.
5. Nenhuma das quatro funções usa laço (`for`, `while` ou compreensão).

### Código inicial
```python
import numpy as np


def media_por_dia(temps):
    pass


def maxima_por_hora(temps):
    pass


def amplitude_por_dia(temps):
    pass


def horas_de_calor(temps, limite):
    pass
```

### Solução
```python
import numpy as np


def media_por_dia(temps):
    return temps.mean(axis=1)


def maxima_por_hora(temps):
    return temps.max(axis=0)


def amplitude_por_dia(temps):
    return temps.max(axis=1) - temps.min(axis=1)


def horas_de_calor(temps, limite):
    return (temps >= limite).sum(axis=1)
```

### Dicas
1. Um valor por dia quer dizer que o eixo das horas (as colunas) é o que some.
2. Depois de cada função, confira o `shape`: com a semana inteira, um valor por dia dá `(7,)` e um por hora dá `(24,)`.
3. Uma comparação com o array inteiro produz `True` e `False`, e somar booleanos conta os `True`.

### Verificação
```json
[
  { "id": "media", "checkpoint": 1, "kind": "expr",
    "setup": "T = np.array([[18, 20, 25, 22], [15, 17, 21, 19], [20, 24, 30, 26]], dtype=float)",
    "expr": "media_por_dia(T).tolist()", "expected": [21.25, 18.0, 25.0], "tolerance": 1e-9,
    "name": "Média de cada um dos 3 dias", "hint": "Um valor por dia: qual eixo some?" },
  { "id": "media-semana", "checkpoint": 1, "kind": "expr",
    "setup": "S = np.random.default_rng(7).normal(22, 4, size=(7, 24))",
    "expr": "list(media_por_dia(S).shape)", "expected": [7], "name": "Na semana (7, 24), uma média por dia" },
  { "id": "media-tipo", "checkpoint": 1, "kind": "expr",
    "setup": "T = np.array([[18, 20, 25, 22], [15, 17, 21, 19], [20, 24, 30, 26]], dtype=float)",
    "expr": "media_por_dia(T)", "type": "ndarray", "name": "media_por_dia devolve um array numpy" },
  { "id": "maxima", "checkpoint": 2, "kind": "expr",
    "setup": "T = np.array([[18, 20, 25, 22], [15, 17, 21, 19], [20, 24, 30, 26]], dtype=float)",
    "expr": "maxima_por_hora(T).tolist()", "expected": [20, 24, 30, 26], "tolerance": 1e-9,
    "name": "Máxima de cada uma das 4 horas" },
  { "id": "maxima-semana", "checkpoint": 2, "kind": "expr",
    "setup": "S = np.random.default_rng(7).normal(22, 4, size=(7, 24))",
    "expr": "list(maxima_por_hora(S).shape)", "expected": [24], "name": "Na semana (7, 24), uma máxima por hora" },
  { "id": "amplitude", "checkpoint": 3, "kind": "expr",
    "setup": "T = np.array([[18, 20, 25, 22], [15, 17, 21, 19], [20, 24, 30, 26]], dtype=float)",
    "expr": "amplitude_por_dia(T).tolist()", "expected": [7, 6, 10], "tolerance": 1e-9,
    "name": "Amplitude de cada dia", "hint": "Máxima e mínima precisam ser do mesmo dia." },
  { "id": "amplitude-semana", "checkpoint": 3, "kind": "expr",
    "setup": "S = np.random.default_rng(7).normal(22, 4, size=(7, 24))",
    "expr": "list(amplitude_por_dia(S).shape)", "expected": [7], "name": "Na semana (7, 24), uma amplitude por dia" },
  { "id": "calor", "checkpoint": 4, "kind": "expr",
    "setup": "T = np.array([[18, 20, 25, 22], [15, 17, 21, 19], [20, 24, 30, 26]], dtype=float)",
    "expr": "horas_de_calor(T, 22).tolist()", "expected": [2, 0, 3], "name": "horas_de_calor(T, 22)",
    "hint": "Uma leitura igual ao limite também conta." },
  { "id": "calor-limite", "checkpoint": 4, "kind": "expr",
    "setup": "T = np.array([[18, 20, 25, 22], [15, 17, 21, 19], [20, 24, 30, 26]], dtype=float)",
    "expr": "horas_de_calor(T, 30).tolist()", "expected": [0, 0, 1], "name": "horas_de_calor(T, 30): só o 30 conta" },
  { "id": "calor-semana", "checkpoint": 4, "kind": "expr",
    "setup": "S = np.random.default_rng(7).normal(22, 4, size=(7, 24))",
    "expr": "list(horas_de_calor(S, 25).shape)", "expected": [7], "name": "Na semana (7, 24), uma contagem por dia" },
  { "id": "sem-for", "checkpoint": 5, "kind": "source", "rule": { "type": "not_uses", "construct": "for" },
    "name": "Sem laço for" },
  { "id": "sem-compreensao", "checkpoint": 5, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension" },
    "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="média com o eixo trocado"
import numpy as np


def media_por_dia(temps):
    return temps.mean(axis=0)


def maxima_por_hora(temps):
    return temps.max(axis=0)


def amplitude_por_dia(temps):
    return temps.max(axis=1) - temps.min(axis=1)


def horas_de_calor(temps, limite):
    return (temps >= limite).sum(axis=1)
```
```python name="máxima com o eixo trocado"
import numpy as np


def media_por_dia(temps):
    return temps.mean(axis=1)


def maxima_por_hora(temps):
    return temps.max(axis=1)


def amplitude_por_dia(temps):
    return temps.max(axis=1) - temps.min(axis=1)


def horas_de_calor(temps, limite):
    return (temps >= limite).sum(axis=1)
```
```python name="amplitude da semana inteira"
import numpy as np


def media_por_dia(temps):
    return temps.mean(axis=1)


def maxima_por_hora(temps):
    return temps.max(axis=0)


def amplitude_por_dia(temps):
    return temps.max() - temps.min()


def horas_de_calor(temps, limite):
    return (temps >= limite).sum(axis=1)
```
```python name="amplitude com eixos misturados"
import numpy as np


def media_por_dia(temps):
    return temps.mean(axis=1)


def maxima_por_hora(temps):
    return temps.max(axis=0)


def amplitude_por_dia(temps):
    return temps.max(axis=1) - temps.min(axis=0)


def horas_de_calor(temps, limite):
    return (temps >= limite).sum(axis=1)
```
```python name="calor com comparação estrita"
import numpy as np


def media_por_dia(temps):
    return temps.mean(axis=1)


def maxima_por_hora(temps):
    return temps.max(axis=0)


def amplitude_por_dia(temps):
    return temps.max(axis=1) - temps.min(axis=1)


def horas_de_calor(temps, limite):
    return (temps > limite).sum(axis=1)
```
```python name="calor somado na semana"
import numpy as np


def media_por_dia(temps):
    return temps.mean(axis=1)


def maxima_por_hora(temps):
    return temps.max(axis=0)


def amplitude_por_dia(temps):
    return temps.max(axis=1) - temps.min(axis=1)


def horas_de_calor(temps, limite):
    return (temps >= limite).sum()
```
```python name="laço pelos dias"
import numpy as np


def media_por_dia(temps):
    return np.array([dia.mean() for dia in temps])


def maxima_por_hora(temps):
    return temps.max(axis=0)


def amplitude_por_dia(temps):
    return temps.max(axis=1) - temps.min(axis=1)


def horas_de_calor(temps, limite):
    return (temps >= limite).sum(axis=1)
```

## Passo 8 · Quiz · Arrays no dia a dia

### Pergunta
`vendas` tem forma `(12, 5)`: uma linha por mês e uma coluna por loja. Você quer o total do ano de cada loja. Qual expressão dá isso?
- [ ] `vendas.sum(axis=1)`
- [x] `vendas.sum(axis=0)`
- [ ] `vendas.sum()`
- [ ] `vendas.mean(axis=0) * 5`
> Um total por loja é um valor por coluna, então o eixo das linhas (meses) é o que some: `axis=0`, com resultado de forma `(5,)`. `axis=1` dá 12 totais mensais, `sum()` sem eixo junta tudo num número só, e a média de cada loja teria de ser multiplicada pelos 12 meses, não pelas 5 lojas.

### Pergunta
O que este trecho imprime?
```python
precos = np.array([10, 20, 30])
precos[0] = 9.99
print(precos[0] + 0.5)
```
- [ ] `10.49`
- [ ] `10.5`
- [x] `9.5`
- [ ] `TypeError`, porque o array é de inteiros
> `np.array([10, 20, 30])` é um array de inteiros, e gravar `9.99` nele corta a parte fracionária sem aviso: `precos[0]` vale 9, e 9 + 0.5 dá 9.5. Para guardar preços com centavos, crie o array com `dtype=float` ou trabalhe com centavos inteiros.

### Pergunta
Uma colega converteu uma lista de **10** temperaturas e mediu uma vez com `perf_counter`: 1 µs no laço, 5 µs no numpy. Ela concluiu que o numpy é mais lento e que não vale a pena. O que você responde?
- [ ] O `perf_counter` não mede abaixo de 1 ms, então a medida dela está invertida
- [ ] O numpy só é mais rápido quando há uma placa de vídeo
- [x] Com 10 elementos domina o custo fixo de cada chamada ao numpy; repita a medida, use a mediana e aumente o tamanho da entrada até a tendência aparecer
- [ ] A lista ficou mais rápida porque o Python guarda o resultado de uma conta repetida
> Cada operação do numpy paga um custo fixo (conferir tipos e formas, alocar o resultado) antes de percorrer os dados. Com poucos elementos, esse custo domina; com um milhão, o laço Python fica bem mais lento. Uma medida isolada é ruído: repetir, ficar com a mediana e crescer a entrada é o mesmo método do Nível 3.
