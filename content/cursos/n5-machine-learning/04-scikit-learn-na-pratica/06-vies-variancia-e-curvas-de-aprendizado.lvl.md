---
slug: n5-m4-06-vies-variancia-e-curvas-de-aprendizado
titulo: Viés, variância e curvas de aprendizado
descricao: A decomposição do erro, sub e sobreajuste, curvas de validação por hiperparâmetro e curvas de aprendizado por tamanho do treino, e o que fazer em cada diagnóstico.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Explicar a decomposição viés-variância e reconhecê-la em curvas de treino/validação
- Gerar curvas de validação e de aprendizado com scikit-learn e diagnosticar o modelo
- Escolher a ação adequada (mais dados, regularizar, simplificar, mais atributos) a partir do diagnóstico
---

## Passo 1 · Leitura · Erro = viés² + variância + ruído

Imagine ajustar o mesmo tipo de modelo muitas vezes, cada vez com uma amostra de treino diferente tirada do mesmo processo. Num ponto $x$, as previsões $\hat{f}(x)$ variam de amostra para amostra. Com o alvo $y = f(x) + \varepsilon$, em que o ruído $\varepsilon$ tem variância $\sigma^2$, o erro quadrático esperado se divide em três partes:

$$
\mathbb{E}\big[(y - \hat{f}(x))^2\big] = \underbrace{\big(\mathbb{E}[\hat{f}(x)] - f(x)\big)^2}_{\text{viés}^2} + \underbrace{\operatorname{Var}\big[\hat{f}(x)\big]}_{\text{variância}} + \underbrace{\sigma^2}_{\text{ruído}}
$$

- O **viés** é o quanto a previsão **média** erra: um modelo rígido demais para o padrão dos dados erra do mesmo jeito em qualquer amostra. Uma reta ajustada a uma curva em forma de onda passa longe dos picos, tenha a amostra o tamanho que tiver.
- A **variância** é o quanto a previsão muda de uma amostra para outra: um modelo flexível demais acompanha o ruído da amostra que recebeu. Um polinômio de grau 11 em 12 pontos passa exatamente por todos eles e muda de forma por completo com outra amostra.
- O **ruído** vem dos dados e nenhum modelo o remove.

Aumentar a flexibilidade (grau do polinômio, profundidade da árvore, `C` alto, poucos vizinhos no KNN) costuma baixar o viés e subir a variância; restringir faz o contrário. O melhor modelo fica no meio, onde a soma é menor.

```python
for grau in [1, 3, 11]:
    coef = np.polyfit(x_treino, y_treino, grau)
    erro_treino = rmse(y_treino, np.polyval(coef, x_treino))
    erro_val = rmse(y_val, np.polyval(coef, x_val))
```

Sem simular, o diagnóstico vem dos erros de treino e de validação. **Viés alto** (subajuste): o erro de treino já é alto, e o de validação fica perto dele. **Variância alta** (sobreajuste): o treino vai bem, e a validação, bem pior. Um erro de treino baixo, sozinho, não diz nada de bom: o polinômio de grau 11 tem erro de treino zero e é o pior dos três na validação.

O diagnóstico decide a ação. Contra viés: um modelo mais flexível, mais atributos, menos regularização. Contra variância: mais dados, mais regularização, um modelo mais simples, menos atributos. Mais dados quase não ajudam um modelo com viés alto: a reta continua reta.

## Passo 2 · Previsão · Treino e validação por grau

O programa ajusta polinômios de graus 1, 3 e 11 a 12 pontos ruidosos de uma onda e mede o RMSE no treino e em 12 pontos de validação. Em vez dos números, ele imprime comparações. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

rng = np.random.default_rng(0)
x = np.linspace(0, 1, 12)
y = np.sin(2 * np.pi * x) + rng.normal(0, 0.2, 12)
x_val = np.linspace(0.04, 0.96, 12)
y_val = np.sin(2 * np.pi * x_val) + rng.normal(0, 0.2, 12)


def rmse(a, b):
    return float(np.sqrt(np.mean((a - b) ** 2)))


graus = [1, 3, 11]
treino, val = [], []
for grau in graus:
    coef = np.polyfit(x, y, grau)
    treino.append(rmse(np.polyval(coef, x), y))
    val.append(rmse(np.polyval(coef, x_val), y_val))
print(treino[0] > treino[1] > treino[2])
print(treino[2] < 1e-6)
print(graus[val.index(min(val))])
print(val[2] > val[1], val[2] > treino[2])
```

### Dicas
1. Um polinômio de grau 11 tem 12 coeficientes: com 12 pontos, ele passa exatamente por todos.
2. Mais flexibilidade nunca piora o ajuste aos pontos de treino.
3. Uma reta não acompanha uma onda; o polinômio que passa por todos os pontos acompanha também o ruído.

### Saída esperada
```text
True
True
3
True True
```

## Passo 3 · Exercício · Diagnóstico
modo: lacunas

Complete as lacunas (`___`) do diagnóstico pelos erros de treino e de validação e da tabela de ações.

### Instruções
1. `diagnostico(erro_treino, erro_validacao, erro_aceitavel)` devolve `"vies"` quando o erro de **treino** passa do `erro_aceitavel`: o modelo não consegue nem nos dados que viu. Essa regra vem primeiro.
2. Senão, devolve `"variancia"` quando o erro de **validação** passa do `erro_aceitavel`.
3. Senão, devolve `"ok"`. Um erro exatamente igual ao aceitável é aceitável.
4. `acao_recomendada(diag)` devolve a ação da tabela `ACOES`: `"aumentar a capacidade do modelo"` para `"vies"`, `"mais dados ou mais regularização"` para `"variancia"` e `"avaliar uma vez no teste"` para `"ok"`.

### Código inicial
```python
ACOES = {
    "vies": ___,
    "variancia": ___,
    "ok": "avaliar uma vez no teste",
}


def diagnostico(erro_treino, erro_validacao, erro_aceitavel):
    if ___:
        return "vies"
    if ___:
        return "variancia"
    return "ok"


def acao_recomendada(diag):
    return ___
```

### Solução
```python
ACOES = {
    "vies": "aumentar a capacidade do modelo",
    "variancia": "mais dados ou mais regularização",
    "ok": "avaliar uma vez no teste",
}


def diagnostico(erro_treino, erro_validacao, erro_aceitavel):
    if erro_treino > erro_aceitavel:
        return "vies"
    if erro_validacao > erro_aceitavel:
        return "variancia"
    return "ok"


def acao_recomendada(diag):
    return ACOES[diag]
```

### Dicas
1. Cada regra compara um dos erros com o aceitável; a ordem das regras já está no código.
2. A distância entre validação e treino não entra nas regras: com o treino aceitável, basta olhar a validação.
3. Mais dados ajudam quem acerta o treino e erra fora dele; quem erra o próprio treino precisa de um modelo mais capaz.

### Verificação
```json
[
  { "id": "vies", "checkpoint": 1, "kind": "call",
    "function": "diagnostico",
    "args": [0.3, 0.32, 0.1],
    "expected": "vies",
    "name": "Treino e validação altos e próximos: viés",
    "hint": "Olhe primeiro o erro de treino." },
  { "id": "vies-com-validacao-pior", "checkpoint": 1, "kind": "call",
    "function": "diagnostico",
    "args": [0.12, 0.5, 0.1],
    "expected": "vies",
    "name": "Treino acima do aceitável vem antes de qualquer outra regra" },
  { "id": "variancia", "checkpoint": 2, "kind": "call",
    "function": "diagnostico",
    "args": [0.05, 0.4, 0.1],
    "expected": "variancia",
    "name": "Treino bom e validação ruim: variância",
    "hint": "O viés é decidido pelo erro de treino." },
  { "id": "variancia-distancia-pequena", "checkpoint": 2, "kind": "call",
    "function": "diagnostico",
    "args": [0.08, 0.15, 0.1],
    "expected": "variancia",
    "name": "Validação acima do aceitável, mesmo perto do treino: variância",
    "hint": "Com o treino aceitável, a regra olha a validação contra o aceitável, e não a distância entre os dois." },
  { "id": "ok", "checkpoint": 3, "kind": "call",
    "function": "diagnostico",
    "args": [0.05, 0.08, 0.1],
    "expected": "ok",
    "name": "Os dois abaixo do aceitável: ok",
    "hint": "Uma validação um pouco pior que o treino é normal." },
  { "id": "ok-no-limite", "checkpoint": 3, "kind": "call",
    "function": "diagnostico",
    "args": [0.1, 0.1, 0.1],
    "expected": "ok",
    "name": "Erros iguais ao aceitável são aceitáveis",
    "hint": "A regra é passar do aceitável, não alcançá-lo." },
  { "id": "acao-vies", "checkpoint": 4, "kind": "call",
    "function": "acao_recomendada",
    "args": ["vies"],
    "expected": "aumentar a capacidade do modelo",
    "name": "Ação para viés",
    "hint": "Mais dados não resolvem um modelo que erra o próprio treino." },
  { "id": "acao-variancia", "checkpoint": 4, "kind": "call",
    "function": "acao_recomendada",
    "args": ["variancia"],
    "expected": "mais dados ou mais regularização",
    "name": "Ação para variância" },
  { "id": "acao-ok", "checkpoint": 4, "kind": "call",
    "function": "acao_recomendada",
    "args": ["ok"],
    "expected": "avaliar uma vez no teste",
    "name": "Ação quando está tudo bem" }
]
```

### Soluções erradas
```python name="viés olhando a validação"
ACOES = {
    "vies": "aumentar a capacidade do modelo",
    "variancia": "mais dados ou mais regularização",
    "ok": "avaliar uma vez no teste",
}


def diagnostico(erro_treino, erro_validacao, erro_aceitavel):
    if erro_validacao > erro_aceitavel:
        return "vies"
    if erro_validacao > erro_aceitavel:
        return "variancia"
    return "ok"


def acao_recomendada(diag):
    return ACOES[diag]
```
```python name="variância pela distância maior que o aceitável"
ACOES = {
    "vies": "aumentar a capacidade do modelo",
    "variancia": "mais dados ou mais regularização",
    "ok": "avaliar uma vez no teste",
}


def diagnostico(erro_treino, erro_validacao, erro_aceitavel):
    if erro_treino > erro_aceitavel:
        return "vies"
    if erro_validacao - erro_treino > erro_aceitavel:
        return "variancia"
    return "ok"


def acao_recomendada(diag):
    return ACOES[diag]
```
```python name="qualquer validação acima do treino é variância"
ACOES = {
    "vies": "aumentar a capacidade do modelo",
    "variancia": "mais dados ou mais regularização",
    "ok": "avaliar uma vez no teste",
}


def diagnostico(erro_treino, erro_validacao, erro_aceitavel):
    if erro_treino > erro_aceitavel:
        return "vies"
    if erro_validacao > erro_treino:
        return "variancia"
    return "ok"


def acao_recomendada(diag):
    return ACOES[diag]
```
```python name="o limite conta como viés"
ACOES = {
    "vies": "aumentar a capacidade do modelo",
    "variancia": "mais dados ou mais regularização",
    "ok": "avaliar uma vez no teste",
}


def diagnostico(erro_treino, erro_validacao, erro_aceitavel):
    if erro_treino >= erro_aceitavel:
        return "vies"
    if erro_validacao > erro_aceitavel:
        return "variancia"
    return "ok"


def acao_recomendada(diag):
    return ACOES[diag]
```
```python name="mais dados para resolver viés"
ACOES = {
    "vies": "mais dados ou mais regularização",
    "variancia": "aumentar a capacidade do modelo",
    "ok": "avaliar uma vez no teste",
}


def diagnostico(erro_treino, erro_validacao, erro_aceitavel):
    if erro_treino > erro_aceitavel:
        return "vies"
    if erro_validacao > erro_aceitavel:
        return "variancia"
    return "ok"


def acao_recomendada(diag):
    return ACOES[diag]
```

## Passo 4 · Leitura · validation_curve e learning_curve

Dois tipos de curva tornam o diagnóstico visível. As duas devolvem notas de treino e de validação cruzada com uma linha por ponto da curva e uma coluna por partição.

A **curva de validação** varia um hiperparâmetro:

```python
treino, val = validation_curve(modelo, X, y, param_name="modelo__n_neighbors",
                               param_range=[1, 3, 9, 27, 81], cv=5)
treino.mean(axis=1), val.mean(axis=1)
```

Num conjunto fictício de 300 linhas, com um KNN, as acurácias médias foram 1,000, 0,867, 0,824, 0,818 e 0,809 no treino e 0,737, 0,783, 0,810, 0,800 e 0,790 na validação. Com 1 vizinho, o treino é perfeito e a validação é a pior: variância. Com 81 vizinhos, as duas notas caem juntas: o viés começa a crescer. O melhor valor é o de maior validação, 9, e não o de maior treino. Ler a curva do treino como se fosse a de validação leva justamente ao 1, o pior.

A **curva de aprendizado** varia o tamanho do treino:

```python
n, treino, val = learning_curve(modelo, X, y, train_sizes=[0.1, 0.3, 0.6, 1.0],
                                cv=5, shuffle=True, random_state=0)
```

O `n` traz os tamanhos absolutos: 24, 72, 144 e 240 linhas. No mesmo conjunto, com 5 vizinhos, a validação foi de 0,72 a 0,78, e o treino ficou perto de 0,83: a distância diminui com mais dados, e as curvas quase se encontram. Com curvas próximas e ainda subindo, mais dados ajudam; com as duas juntas e paradas num nível ruim, o modelo tem viés, e mais dados não mudam nada.

O `shuffle=True` importa quando os dados chegam ordenados. Sem ele, as 24 primeiras linhas de cada treino são todas da mesma classe neste conjunto, e a validação dos dois primeiros pontos sai 0,50: a curva mostra a ordem do arquivo, e não o efeito do tamanho.

| Sintoma | Diagnóstico | Ação |
|---|---|---|
| treino ruim, validação perto dele | viés | modelo mais flexível, mais atributos, menos regularização |
| treino bom, validação bem pior | variância | mais dados, mais regularização, modelo mais simples |
| os dois bons e próximos | ok | avaliar uma vez no teste |

Uma curva de 3 pontos esconde a forma do gráfico; use pelo menos 5 valores, em escala logarítmica quando o hiperparâmetro for multiplicativo.

## Passo 5 · Exercício · Curvas

Escreva as duas funções que transformam as notas por partição em pontos de curva.

### Instruções
1. `curva_de_validacao(pipeline, X, y, parametro, valores, k)` chama o `validation_curve` com o hiperparâmetro `parametro` (já com o prefixo da etapa), os `valores` e `cv=k`.
2. Devolve a tupla `(treino, validacao)`: duas listas de `float`, com a nota média das `k` partições para cada valor, na ordem de `valores`.
3. `curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente)` chama o `learning_curve` com `train_sizes=tamanhos`, `cv=k`, `shuffle=True` e `random_state=semente`.
4. Devolve a tupla `(n_treino, treino, validacao)`: a lista dos tamanhos absolutos de treino (`int`) e as duas listas de notas médias (`float`).

### Código inicial
```python
from sklearn.model_selection import learning_curve, validation_curve


def curva_de_validacao(pipeline, X, y, parametro, valores, k):
    pass


def curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente):
    pass
```

### Solução
```python
from sklearn.model_selection import learning_curve, validation_curve


def curva_de_validacao(pipeline, X, y, parametro, valores, k):
    treino, validacao = validation_curve(pipeline, X, y, param_name=parametro, param_range=valores, cv=k)
    return treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()


def curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente):
    n_treino, treino, validacao = learning_curve(
        pipeline, X, y, train_sizes=tamanhos, cv=k, shuffle=True, random_state=semente)
    return n_treino.tolist(), treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()
```

### Dicas
1. As notas chegam com forma `(pontos da curva, k)`: a média de cada ponto é sobre o eixo das partições.
2. O `validation_curve` devolve primeiro as notas de treino e depois as de validação; o `learning_curve` devolve antes os tamanhos.
3. Os dados da verificação chegam ordenados por classe.

### Verificação
```json
[
  { "id": "validacao-treino", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nrng = np.random.default_rng(2)\nX = np.vstack([rng.normal(0, 1, (150, 2)), rng.normal(1.2, 1, (150, 2))]).round(3)\ny = np.array([0] * 150 + [1] * 150)\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', KNeighborsClassifier())])\nr = curva_de_validacao(pipe, X, y, 'modelo__n_neighbors', [1, 3, 9, 27, 81], 5)",
    "expr": "r[0]",
    "expected": [1.0, 0.8666666666666666, 0.8241666666666667, 0.8183333333333334, 0.8091666666666667],
    "tolerance": 1e-09,
    "name": "Curva de validação do KNN: acurácia média de treino para 1, 3, 9, 27 e 81 vizinhos",
    "hint": "Uma média por valor do hiperparâmetro, sobre as k partições." },
  { "id": "validacao-validacao", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nrng = np.random.default_rng(2)\nX = np.vstack([rng.normal(0, 1, (150, 2)), rng.normal(1.2, 1, (150, 2))]).round(3)\ny = np.array([0] * 150 + [1] * 150)\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', KNeighborsClassifier())])\nr = curva_de_validacao(pipe, X, y, 'modelo__n_neighbors', [1, 3, 9, 27, 81], 5)",
    "expr": "r[1]",
    "expected": [0.7366666666666667, 0.7833333333333332, 0.8100000000000002, 0.8, 0.79],
    "tolerance": 1e-09,
    "name": "A mesma curva na validação",
    "hint": "O validation_curve devolve primeiro as notas de treino." },
  { "id": "validacao-tamanho", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nrng = np.random.default_rng(2)\nX = np.vstack([rng.normal(0, 1, (150, 2)), rng.normal(1.2, 1, (150, 2))]).round(3)\ny = np.array([0] * 150 + [1] * 150)\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', KNeighborsClassifier())])",
    "expr": "[len(v) for v in curva_de_validacao(pipe, X, y, 'modelo__n_neighbors', [1, 5, 25], 4)]",
    "expected": [3, 3],
    "name": "Três valores e 4 partições: três pontos em cada curva" },
  { "id": "validacao-tipos", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nrng = np.random.default_rng(2)\nX = np.vstack([rng.normal(0, 1, (150, 2)), rng.normal(1.2, 1, (150, 2))]).round(3)\ny = np.array([0] * 150 + [1] * 150)\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', KNeighborsClassifier())])\nr = curva_de_validacao(pipe, X, y, 'modelo__n_neighbors', [1, 3, 9, 27, 81], 5)",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1][0]).__name__]",
    "expected": ["tuple", "list", "float"],
    "name": "Devolve uma tupla de duas listas de float" },
  { "id": "aprendizado-tamanhos", "checkpoint": 4, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nrng = np.random.default_rng(2)\nX = np.vstack([rng.normal(0, 1, (150, 2)), rng.normal(1.2, 1, (150, 2))]).round(3)\ny = np.array([0] * 150 + [1] * 150)\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', KNeighborsClassifier())])\nr = curva_de_aprendizado(pipe, X, y, [0.1, 0.3, 0.6, 1.0], 5, 0)",
    "expr": "r[0]",
    "expected": [24, 72, 144, 240],
    "name": "Tamanhos absolutos de treino para 10 %, 30 %, 60 % e 100 % de 240 linhas",
    "hint": "O learning_curve devolve os tamanhos efetivamente usados." },
  { "id": "aprendizado-treino", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nrng = np.random.default_rng(2)\nX = np.vstack([rng.normal(0, 1, (150, 2)), rng.normal(1.2, 1, (150, 2))]).round(3)\ny = np.array([0] * 150 + [1] * 150)\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', KNeighborsClassifier())])\nr = curva_de_aprendizado(pipe, X, y, [0.1, 0.3, 0.6, 1.0], 5, 0)",
    "expr": "r[1]",
    "expected": [0.8416666666666666, 0.8416666666666666, 0.8375, 0.8291666666666666],
    "tolerance": 1e-09,
    "name": "Curva de aprendizado: acurácia média de treino" },
  { "id": "aprendizado-validacao", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nrng = np.random.default_rng(2)\nX = np.vstack([rng.normal(0, 1, (150, 2)), rng.normal(1.2, 1, (150, 2))]).round(3)\ny = np.array([0] * 150 + [1] * 150)\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', KNeighborsClassifier())])\nr = curva_de_aprendizado(pipe, X, y, [0.1, 0.3, 0.6, 1.0], 5, 0)",
    "expr": "r[2]",
    "expected": [0.7200000000000001, 0.8, 0.7933333333333333, 0.7766666666666666],
    "tolerance": 1e-09,
    "name": "Curva de aprendizado: acurácia média de validação, com os dados ordenados por classe",
    "hint": "Sem embaralhar, os primeiros tamanhos de treino têm uma classe só." },
  { "id": "aprendizado-semente", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nrng = np.random.default_rng(2)\nX = np.vstack([rng.normal(0, 1, (150, 2)), rng.normal(1.2, 1, (150, 2))]).round(3)\ny = np.array([0] * 150 + [1] * 150)\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', KNeighborsClassifier())])",
    "expr": "curva_de_aprendizado(pipe, X, y, [0.1, 0.3, 0.6, 1.0], 5, 1)[2]",
    "expected": [0.7866666666666667, 0.7833333333333332, 0.7733333333333332, 0.7766666666666666],
    "tolerance": 1e-09,
    "name": "Com a semente 1, outros subconjuntos de treino",
    "hint": "O random_state é a semente recebida." },
  { "id": "aprendizado-tipos", "checkpoint": 4, "kind": "expr",
    "setup": "import numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom sklearn.pipeline import Pipeline\nfrom sklearn.preprocessing import StandardScaler\nrng = np.random.default_rng(2)\nX = np.vstack([rng.normal(0, 1, (150, 2)), rng.normal(1.2, 1, (150, 2))]).round(3)\ny = np.array([0] * 150 + [1] * 150)\npipe = Pipeline([('escalar', StandardScaler()), ('modelo', KNeighborsClassifier())])\nr = curva_de_aprendizado(pipe, X, y, [0.1, 0.3, 0.6, 1.0], 5, 0)",
    "expr": "[type(v).__name__ for v in r] + [type(r[0][0]).__name__, type(r[2][0]).__name__]",
    "expected": ["list", "list", "list", "int", "float"],
    "name": "Três listas: tamanhos int e notas float" }
]
```

### Soluções erradas
```python name="média no eixo das partições trocado"
from sklearn.model_selection import learning_curve, validation_curve


def curva_de_validacao(pipeline, X, y, parametro, valores, k):
    treino, validacao = validation_curve(pipeline, X, y, param_name=parametro, param_range=valores, cv=k)
    return treino.mean(axis=0).tolist(), validacao.mean(axis=0).tolist()


def curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente):
    n_treino, treino, validacao = learning_curve(
        pipeline, X, y, train_sizes=tamanhos, cv=k, shuffle=True, random_state=semente)
    return n_treino.tolist(), treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()
```
```python name="treino e validação trocados"
from sklearn.model_selection import learning_curve, validation_curve


def curva_de_validacao(pipeline, X, y, parametro, valores, k):
    validacao, treino = validation_curve(pipeline, X, y, param_name=parametro, param_range=valores, cv=k)
    return treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()


def curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente):
    n_treino, treino, validacao = learning_curve(
        pipeline, X, y, train_sizes=tamanhos, cv=k, shuffle=True, random_state=semente)
    return n_treino.tolist(), treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()
```
```python name="devolve arrays do numpy"
from sklearn.model_selection import learning_curve, validation_curve


def curva_de_validacao(pipeline, X, y, parametro, valores, k):
    treino, validacao = validation_curve(pipeline, X, y, param_name=parametro, param_range=valores, cv=k)
    return treino.mean(axis=1), validacao.mean(axis=1)


def curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente):
    n_treino, treino, validacao = learning_curve(
        pipeline, X, y, train_sizes=tamanhos, cv=k, shuffle=True, random_state=semente)
    return n_treino.tolist(), treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()
```
```python name="learning_curve sem embaralhar dados ordenados"
from sklearn.model_selection import learning_curve, validation_curve


def curva_de_validacao(pipeline, X, y, parametro, valores, k):
    treino, validacao = validation_curve(pipeline, X, y, param_name=parametro, param_range=valores, cv=k)
    return treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()


def curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente):
    n_treino, treino, validacao = learning_curve(pipeline, X, y, train_sizes=tamanhos, cv=k)
    return n_treino.tolist(), treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()
```
```python name="semente fixa"
from sklearn.model_selection import learning_curve, validation_curve


def curva_de_validacao(pipeline, X, y, parametro, valores, k):
    treino, validacao = validation_curve(pipeline, X, y, param_name=parametro, param_range=valores, cv=k)
    return treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()


def curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente):
    n_treino, treino, validacao = learning_curve(
        pipeline, X, y, train_sizes=tamanhos, cv=k, shuffle=True, random_state=0)
    return n_treino.tolist(), treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()
```
```python name="ignora os tamanhos pedidos"
from sklearn.model_selection import learning_curve, validation_curve


def curva_de_validacao(pipeline, X, y, parametro, valores, k):
    treino, validacao = validation_curve(pipeline, X, y, param_name=parametro, param_range=valores, cv=k)
    return treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()


def curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente):
    n_treino, treino, validacao = learning_curve(
        pipeline, X, y, cv=k, shuffle=True, random_state=semente)
    return n_treino.tolist(), treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()
```
```python name="devolve as frações no lugar dos tamanhos"
from sklearn.model_selection import learning_curve, validation_curve


def curva_de_validacao(pipeline, X, y, parametro, valores, k):
    treino, validacao = validation_curve(pipeline, X, y, param_name=parametro, param_range=valores, cv=k)
    return treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()


def curva_de_aprendizado(pipeline, X, y, tamanhos, k, semente):
    n_treino, treino, validacao = learning_curve(
        pipeline, X, y, train_sizes=tamanhos, cv=k, shuffle=True, random_state=semente)
    return list(tamanhos), treino.mean(axis=1).tolist(), validacao.mean(axis=1).tolist()
```

## Passo 6 · Leitura · Simular viés e variância

As curvas mostram os sintomas. Para ver a decomposição em si, é preciso fazer o que a definição descreve: sortear muitas amostras do mesmo processo, ajustar um modelo a cada uma e olhar as previsões num conjunto fixo de pontos. Com dados gerados, conhecemos a função verdadeira $f(x) = \sin(2\pi x)$ e o ruído, e as duas parcelas viram contas com numpy:

```python
P = np.array(previsoes)          # forma (repeticoes, pontos da grade)
media = P.mean(axis=0)           # a previsão média em cada ponto
vies2 = np.mean((media - f(grade)) ** 2)
variancia = np.mean(P.var(axis=0))
```

Cada linha de `P` é um modelo, ajustado a uma amostra; cada coluna, um ponto da grade. O viés² compara a **média das previsões** com a função verdadeira, e não com os $y$ ruidosos. A variância mede quanto as previsões **dos modelos** oscilam entre as amostras, coluna a coluna; ela não tem nada a ver com a variância dos dados $y$, que inclui a oscilação da própria onda e o ruído.

Com 200 amostras de 20 pontos e ruído de desvio 0,3, a simulação deu:

| Grau | viés² | variância |
|---|---|---|
| 1 | 0,214 | 0,035 |
| 3 | 0,006 | 0,033 |
| 5 | 0,001 | 0,351 |
| 9 | 32,7 | 7554 |

O grau 1 tem o viés do tamanho do problema: a reta não acompanha a onda. Do grau 3 em diante o viés quase some, e a variância passa a mandar. No grau 9, com 20 pontos sorteados, alguns modelos disparam perto das bordas do intervalo, onde há poucos pontos, e a média das previsões vai junto: até o viés explode. A soma das parcelas é o erro médio contra $f$; somando o ruído $0{,}3^2 = 0{,}09$, é o erro esperado contra dados novos.

Essa forma de U (viés caindo, variância subindo, mínimo no meio) é o quadro clássico. Em redes neurais muito grandes, treinadas além do ponto em que acertam todo o treino, o erro de validação às vezes volta a cair, um fenômeno chamado *double descent*; ele fica para o Nível 6. Nos modelos deste nível, vale o U.

## Passo 7 · Exercício · A simulação

Escreva a simulação do passo anterior com uma regra exata de sorteio, para que a mesma semente sempre dê o mesmo resultado.

### Instruções
1. `simular_vies_variancia(grau, n_amostras, repeticoes, semente)` cria `rng = np.random.default_rng(semente)` e, em cada uma das `repeticoes`, sorteia primeiro `x = rng.uniform(0, 1, n_amostras)` e depois o ruído `rng.normal(0, RUIDO, n_amostras)`, com `y = f(x) + ruído`.
2. Em cada repetição, ajusta `np.polyfit(x, y, grau)` e guarda as previsões de `np.polyval` nos pontos de `GRADE`.
3. Calcula `vies2`: a média, nos pontos da grade, de (média das previsões menos `f(GRADE)`) ao quadrado.
4. Calcula `variancia`: a média, nos pontos da grade, da variância populacional (`np.var`, `ddof=0`) das previsões entre as repetições. Devolve a tupla `(vies2, variancia)`, como `float`.

### Código inicial
```python
import numpy as np

RUIDO = 0.3
GRADE = np.linspace(0, 1, 50)


def f(x):
    return np.sin(2 * np.pi * x)


def simular_vies_variancia(grau, n_amostras, repeticoes, semente):
    pass
```

### Solução
```python
import numpy as np

RUIDO = 0.3
GRADE = np.linspace(0, 1, 50)


def f(x):
    return np.sin(2 * np.pi * x)


def simular_vies_variancia(grau, n_amostras, repeticoes, semente):
    rng = np.random.default_rng(semente)
    previsoes = []
    for _ in range(repeticoes):
        x = rng.uniform(0, 1, n_amostras)
        y = f(x) + rng.normal(0, RUIDO, n_amostras)
        coef = np.polyfit(x, y, grau)
        previsoes.append(np.polyval(coef, GRADE))
    P = np.array(previsoes)
    vies2 = np.mean((P.mean(axis=0) - f(GRADE)) ** 2)
    variancia = np.mean(P.var(axis=0))
    return float(vies2), float(variancia)
```

### Dicas
1. Empilhe as previsões numa matriz com uma linha por repetição: as médias e variâncias "entre as repetições" são no `axis=0`.
2. O viés compara a previsão média com a função verdadeira, sem ruído.
3. Uma amostra nova de `x` em cada repetição faz parte do que muda de um modelo para outro.

### Verificação
```json
[
  { "id": "grau-1", "checkpoint": 3, "kind": "expr",
    "expr": "simular_vies_variancia(1, 20, 200, 0)",
    "expected": [0.21417432198556707, 0.03539891308691697],
    "tolerance": 1e-09,
    "name": "Grau 1, 20 pontos, 200 repetições, semente 0: viés² e variância",
    "hint": "Siga a ordem dos sorteios do enunciado: x primeiro, depois o ruído." },
  { "id": "grau-3", "checkpoint": 4, "kind": "expr",
    "expr": "simular_vies_variancia(3, 20, 200, 0)",
    "expected": [0.006422389742777015, 0.03318372744488556],
    "tolerance": 1e-09,
    "name": "Grau 3 com os mesmos sorteios",
    "hint": "A variância é a das previsões dos modelos, ponto a ponto da grade, e não a dos dados." },
  { "id": "outra-configuracao", "checkpoint": 2, "kind": "expr",
    "expr": "simular_vies_variancia(3, 30, 100, 1)",
    "expected": [0.005749404773983486, 0.01829949460619174],
    "tolerance": 1e-09,
    "name": "Grau 3, 30 pontos, 100 repetições, semente 1" },
  { "id": "mesma-semente", "checkpoint": 1, "kind": "expr",
    "expr": "simular_vies_variancia(2, 15, 50, 7) == simular_vies_variancia(2, 15, 50, 7)",
    "expected": true,
    "name": "A mesma semente dá o mesmo resultado",
    "hint": "Crie o gerador com a semente dentro da função." },
  { "id": "vies-cai", "checkpoint": 3, "kind": "expr",
    "expr": "simular_vies_variancia(1, 20, 200, 0)[0] > 10 * simular_vies_variancia(3, 20, 200, 0)[0]",
    "expected": true,
    "name": "O viés² da reta é mais de 10 vezes o do grau 3",
    "hint": "O viés compara a previsão média com f, sem ruído." },
  { "id": "variancia-sobe", "checkpoint": 4, "kind": "expr",
    "expr": "simular_vies_variancia(7, 20, 200, 0)[1] > simular_vies_variancia(3, 20, 200, 0)[1]",
    "expected": true,
    "name": "O grau 7 tem mais variância que o grau 3" },
  { "id": "tipos", "checkpoint": 4, "kind": "expr",
    "setup": "r = simular_vies_variancia(3, 20, 50, 0)",
    "expr": "[type(r).__name__, type(r[0]).__name__, type(r[1]).__name__]",
    "expected": ["tuple", "float", "float"],
    "name": "Devolve uma tupla de dois float do Python" }
]
```

### Soluções erradas
```python name="variância dos dados no lugar da do modelo"
import numpy as np

RUIDO = 0.3
GRADE = np.linspace(0, 1, 50)


def f(x):
    return np.sin(2 * np.pi * x)


def simular_vies_variancia(grau, n_amostras, repeticoes, semente):
    rng = np.random.default_rng(semente)
    previsoes = []
    variancias_y = []
    for _ in range(repeticoes):
        x = rng.uniform(0, 1, n_amostras)
        y = f(x) + rng.normal(0, RUIDO, n_amostras)
        coef = np.polyfit(x, y, grau)
        previsoes.append(np.polyval(coef, GRADE))
        variancias_y.append(np.var(y))
    P = np.array(previsoes)
    vies2 = np.mean((P.mean(axis=0) - f(GRADE)) ** 2)
    variancia = np.mean(variancias_y)
    return float(vies2), float(variancia)
```
```python name="viés sem o quadrado"
import numpy as np

RUIDO = 0.3
GRADE = np.linspace(0, 1, 50)


def f(x):
    return np.sin(2 * np.pi * x)


def simular_vies_variancia(grau, n_amostras, repeticoes, semente):
    rng = np.random.default_rng(semente)
    previsoes = []
    for _ in range(repeticoes):
        x = rng.uniform(0, 1, n_amostras)
        y = f(x) + rng.normal(0, RUIDO, n_amostras)
        coef = np.polyfit(x, y, grau)
        previsoes.append(np.polyval(coef, GRADE))
    P = np.array(previsoes)
    vies2 = np.mean(P.mean(axis=0) - f(GRADE))
    variancia = np.mean(P.var(axis=0))
    return float(vies2), float(variancia)
```
```python name="erro total no lugar do viés"
import numpy as np

RUIDO = 0.3
GRADE = np.linspace(0, 1, 50)


def f(x):
    return np.sin(2 * np.pi * x)


def simular_vies_variancia(grau, n_amostras, repeticoes, semente):
    rng = np.random.default_rng(semente)
    previsoes = []
    for _ in range(repeticoes):
        x = rng.uniform(0, 1, n_amostras)
        y = f(x) + rng.normal(0, RUIDO, n_amostras)
        coef = np.polyfit(x, y, grau)
        previsoes.append(np.polyval(coef, GRADE))
    P = np.array(previsoes)
    vies2 = np.mean((P - f(GRADE)) ** 2)
    variancia = np.mean(P.var(axis=0))
    return float(vies2), float(variancia)
```
```python name="ruído sorteado antes do x"
import numpy as np

RUIDO = 0.3
GRADE = np.linspace(0, 1, 50)


def f(x):
    return np.sin(2 * np.pi * x)


def simular_vies_variancia(grau, n_amostras, repeticoes, semente):
    rng = np.random.default_rng(semente)
    previsoes = []
    for _ in range(repeticoes):
        ruido = rng.normal(0, RUIDO, n_amostras)
        x = rng.uniform(0, 1, n_amostras)
        y = f(x) + ruido
        coef = np.polyfit(x, y, grau)
        previsoes.append(np.polyval(coef, GRADE))
    P = np.array(previsoes)
    vies2 = np.mean((P.mean(axis=0) - f(GRADE)) ** 2)
    variancia = np.mean(P.var(axis=0))
    return float(vies2), float(variancia)
```
```python name="mesmos x em todas as repetições"
import numpy as np

RUIDO = 0.3
GRADE = np.linspace(0, 1, 50)


def f(x):
    return np.sin(2 * np.pi * x)


def simular_vies_variancia(grau, n_amostras, repeticoes, semente):
    rng = np.random.default_rng(semente)
    x = rng.uniform(0, 1, n_amostras)
    previsoes = []
    for _ in range(repeticoes):
        y = f(x) + rng.normal(0, RUIDO, n_amostras)
        coef = np.polyfit(x, y, grau)
        previsoes.append(np.polyval(coef, GRADE))
    P = np.array(previsoes)
    vies2 = np.mean((P.mean(axis=0) - f(GRADE)) ** 2)
    variancia = np.mean(P.var(axis=0))
    return float(vies2), float(variancia)
```
```python name="variância amostral (ddof=1)"
import numpy as np

RUIDO = 0.3
GRADE = np.linspace(0, 1, 50)


def f(x):
    return np.sin(2 * np.pi * x)


def simular_vies_variancia(grau, n_amostras, repeticoes, semente):
    rng = np.random.default_rng(semente)
    previsoes = []
    for _ in range(repeticoes):
        x = rng.uniform(0, 1, n_amostras)
        y = f(x) + rng.normal(0, RUIDO, n_amostras)
        coef = np.polyfit(x, y, grau)
        previsoes.append(np.polyval(coef, GRADE))
    P = np.array(previsoes)
    vies2 = np.mean((P.mean(axis=0) - f(GRADE)) ** 2)
    variancia = np.mean(P.var(axis=0, ddof=1))
    return float(vies2), float(variancia)
```

## Passo 8 · Quiz · O que fazer com este diagnóstico

### Pergunta
A curva de aprendizado de um classificador de mensagens fictícias mostra, de 500 a 5 000 linhas de treino, acurácia de treino entre 0,99 e 0,97 e de validação subindo de 0,70 para 0,81, ainda sem estabilizar. O que fazer primeiro?
- [ ] Trocar por um modelo mais flexível, porque a validação está baixa
- [x] Conseguir mais dados ou regularizar mais: há variância, e a distância entre as curvas ainda está diminuindo com mais linhas
- [ ] Nada: um treino de 0,97 mostra que o modelo já aprendeu o problema
- [ ] Remover a validação cruzada, que está puxando a nota para baixo
> Treino quase perfeito e validação bem abaixo é o quadro da variância, e a validação subindo com o tamanho diz que mais linhas ainda ajudam. Um modelo mais flexível aumentaria a variância. Uma nota de treino alta, sozinha, não diz nada sobre dados novos. E a validação cruzada só mede o problema; tirá-la esconde o diagnóstico, sem resolvê-lo.

### Pergunta
Um regressor do tempo de entrega tem RMSE de 11,8 minutos no treino e de 12,1 na validação, praticamente estáveis de 2 000 a 20 000 linhas. O aceitável é 6 minutos. Qual ação tem mais chance de ajudar?
- [ ] Juntar mais 20 000 linhas, porque mais dados sempre ajudam
- [ ] Aumentar a regularização, porque o modelo está sobreajustando
- [x] Dar mais capacidade ao modelo: atributos novos (distância, horário, trânsito) ou um modelo mais flexível
- [ ] Reduzir o número de atributos, para o modelo ficar mais simples
> Treino e validação próximos e ruins, sem melhorar com mais linhas, é viés: o modelo não consegue representar o padrão nem nos dados que viu. Mais dados não mudam uma curva que já está parada, e regularizar ou simplificar aumenta o viés. O caminho é dar ao modelo informação ou flexibilidade que ele não tem.

### Pergunta
Uma curva de validação da profundidade máxima de uma árvore (1 a 12) dá acurácia de treino subindo de 0,71 para 1,00 e de validação subindo de 0,70 até 0,84 na profundidade 5 e caindo para 0,76 na profundidade 12. Qual profundidade escolher, e por quê?
- [ ] 12, porque tem a maior acurácia de treino
- [x] 5, a de maior validação: abaixo dela há viés, acima, variância
- [ ] 1, porque treino e validação estão mais próximos e por isso o modelo é mais confiável
- [ ] Qualquer uma entre 5 e 12, porque a acurácia de treino passa de 0,84 em todas
> O critério é a validação, e o máximo dela está em 5. A 12 tem treino perfeito e validação pior, o sinal da variância; escolher pelo treino é ler a curva errada. A 1 tem as curvas próximas, mas as duas baixas, o sinal do viés. A nota de treino não entra na escolha.
