---
slug: n5-m5-04-interpretacao-de-modelos
titulo: 'Interpretação: importâncias, permutação e dependência parcial'
descricao: feature_importances_ e seus vieses, importância por permutação, gráficos de dependência parcial e ICE, e como comunicar o que o modelo aprendeu.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular importância por permutação do zero e comparar com feature_importances_
- Construir gráficos de dependência parcial e interpretá-los com cautela
- Explicar os vieses das importâncias (cardinalidade, correlação) e comunicar resultados sem exagero
---

## Passo 1 · Leitura · O que a importância por impureza mede

Com um modelo treinado, a pergunta seguinte é quase sempre "quais atributos pesam nas decisões?". As florestas do scikit-learn trazem uma resposta pronta, o `feature_importances_`: a **importância por impureza** (MDI, *mean decrease in impurity*). Para cada atributo $j$, ela soma o ganho de todos os nós que perguntam sobre $j$, em todas as árvores, ponderado pela fração de exemplos que passa por cada nó, e normaliza para o total dar 1:

$$
\text{MDI}_j \propto \sum_{\text{árvores}} \; \sum_{t \,:\, t \text{ pergunta sobre } j} \frac{n_t}{n}\, \Delta G_t
$$

com $n_t$ os exemplos que chegam ao nó $t$ e $\Delta G_t$ o ganho da divisão, o mesmo da primeira lição. Ela sai de graça do treino, e o problema está justamente aí.

Os ganhos são medidos **no treino**. Uma floresta de árvores sem limite continua dividindo até isolar cada cliente ruidoso, e cada divisão inútil soma ganho para algum atributo. As preferidas para essas divisões são as colunas que oferecem mais cortes: contínuas ou com muitos valores distintos, como um identificador ou um CEP. Uma coluna binária oferece um corte só; um identificador com 500 valores oferece 499. Por isso a importância por impureza **infla colunas de alta cardinalidade**, mesmo quando elas não ajudam em nada a prever clientes novos. E colunas **correlacionadas** dividem o crédito: com renda e renda familiar quase iguais, a floresta usa ora uma, ora outra, e as duas parecem medianas, embora juntas sejam decisivas.

A alternativa mede o efeito no que interessa, o desempenho em dados que o modelo não viu. A **importância por permutação** embaralha uma coluna da **validação**, o que quebra a relação dela com o alvo e preserva a sua distribuição, e mede quanto a pontuação $s$ cai:

$$
I_j = s(\text{validação}) - s(\text{validação com a coluna } j \text{ embaralhada})
$$

Como o embaralhamento é sorteado, ele se repete algumas vezes, e o resultado é a média com o desvio. Uma coluna inútil fica perto de zero, às vezes um pouco negativa por sorte; uma coluna de que o modelo depende derruba a pontuação.

```python
from sklearn.inspection import permutation_importance

r = permutation_importance(modelo, X_valid, y_valid, n_repeats=5, random_state=0)
r.importances_mean, r.importances_std      # uma média e um desvio por coluna
```

Embaralhar no **treino** mede outra coisa: o quanto o modelo usa a coluna para acertar exemplos que ele decorou, ruído incluído.

## Passo 2 · Previsão · O identificador aleatório "importante"

O programa gera 500 clientes fictícios. O atraso depende do comprometimento e da renda, e quem `possui_reserva` (coluna 0 ou 1) costuma escapar do atraso; o `id_cliente` é uma permutação sorteada de 0 a 499, sem relação nenhuma com o alvo. Leia sem executar e digite o que o programa imprime.

### Código
```python
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

rng = np.random.default_rng(1)
n = 500
renda = rng.normal(4.0, 1.5, n).clip(0.8).round(1)
comprometimento = rng.uniform(5, 70, n).round(0)
possui_reserva = (rng.random(n) < 0.4).astype(int)
risco = (comprometimento > 45) & (renda < 5.0) | (renda < 2.0)
salvo = (possui_reserva == 1) & (rng.random(n) < 0.7)
troca = rng.random(n) < 0.1
X = pd.DataFrame({"renda": renda, "comprometimento": comprometimento,
                  "possui_reserva": possui_reserva, "id_cliente": rng.permutation(n)})
y = np.where((risco & ~salvo) ^ troca, "atrasa", "paga")

floresta = RandomForestClassifier(n_estimators=30, random_state=0).fit(X, y)
imp = pd.Series(floresta.feature_importances_, index=X.columns)
print(imp.sort_values(ascending=False).index.tolist())
print(bool(imp["id_cliente"] > imp["possui_reserva"]))
print(round(float(imp.sum()), 6))
```

### Dicas
1. As importâncias por impureza são normalizadas.
2. As duas colunas contínuas que definem o risco ficam na frente; o comprometimento, com valores de 5 a 70, separa um pouco melhor que a renda.
3. A árvore sem limite cresce até isolar cada cliente de rótulo trocado: conte quantos cortes `possui_reserva` e `id_cliente` oferecem para isso.

### Saída esperada
```text
['comprometimento', 'renda', 'id_cliente', 'possui_reserva']
True
1.0
```

## Passo 3 · Exercício · Importância por permutação
modo: lacunas

Complete as lacunas (`___`) da importância por permutação, que funciona com qualquer modelo que tenha `score`.

### Instruções
1. Para cada coluna `j` e cada uma das `repeticoes`, a função trabalha numa **cópia** de `X`; o `X` recebido não muda.
2. Na cópia, a coluna `j` é trocada por uma permutação dela mesma, sorteada com o gerador `rng` criado com a semente.
3. A queda é a pontuação original (`base`) menos a pontuação com a coluna embaralhada; a função devolve um array com a média das quedas de cada coluna.

### Código inicial
```python
import numpy as np


def importancia_por_permutacao(modelo, X, y, repeticoes, semente):
    rng = np.random.default_rng(semente)
    X = np.asarray(X, dtype=float)
    base = modelo.score(X, y)
    medias = []
    for j in range(X.shape[1]):
        quedas = []
        for _ in range(repeticoes):
            X_perm = ___
            X_perm[:, j] = ___
            quedas.append(___)
        medias.append(float(np.mean(quedas)))
    return np.array(medias)
```
```text path=clientes.py
import numpy as np
import pandas as pd


def gerar_clientes(n, semente):
    rng = np.random.default_rng(semente)
    renda = rng.normal(4.0, 1.5, n).clip(0.8).round(1)
    comprometimento = rng.uniform(5, 70, n).round(0)
    possui_reserva = (rng.random(n) < 0.4).astype(int)
    risco = (comprometimento > 45) & (renda < 5.0) | (renda < 2.0)
    salvo = (possui_reserva == 1) & (rng.random(n) < 0.7)
    troca = rng.random(n) < 0.1
    X = pd.DataFrame({"renda": renda, "comprometimento": comprometimento,
                      "possui_reserva": possui_reserva, "id_cliente": rng.permutation(n)})
    y = np.where((risco & ~salvo) ^ troca, "atrasa", "paga")
    return X, y
```

### Solução
```python
import numpy as np


def importancia_por_permutacao(modelo, X, y, repeticoes, semente):
    rng = np.random.default_rng(semente)
    X = np.asarray(X, dtype=float)
    base = modelo.score(X, y)
    medias = []
    for j in range(X.shape[1]):
        quedas = []
        for _ in range(repeticoes):
            X_perm = X.copy()
            X_perm[:, j] = rng.permutation(X[:, j])
            quedas.append(base - modelo.score(X_perm, y))
        medias.append(float(np.mean(quedas)))
    return np.array(medias)
```
```text path=clientes.py
import numpy as np
import pandas as pd


def gerar_clientes(n, semente):
    rng = np.random.default_rng(semente)
    renda = rng.normal(4.0, 1.5, n).clip(0.8).round(1)
    comprometimento = rng.uniform(5, 70, n).round(0)
    possui_reserva = (rng.random(n) < 0.4).astype(int)
    risco = (comprometimento > 45) & (renda < 5.0) | (renda < 2.0)
    salvo = (possui_reserva == 1) & (rng.random(n) < 0.7)
    troca = rng.random(n) < 0.1
    X = pd.DataFrame({"renda": renda, "comprometimento": comprometimento,
                      "possui_reserva": possui_reserva, "id_cliente": rng.permutation(n)})
    y = np.where((risco & ~salvo) ^ troca, "atrasa", "paga")
    return X, y
```

### Dicas
1. O `np.asarray` de um array que já é `float` devolve o mesmo objeto: alterar o resultado altera o array de quem chamou.
2. O `rng.permutation(v)` devolve uma cópia embaralhada de `v`, com os mesmos valores em outra ordem.
3. Uma coluna útil faz a pontuação cair quando é embaralhada, e a importância dela deve sair positiva.

### Verificação
```json
[
  {"id": "valores", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 3)\nX = X.to_numpy(dtype=float)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\nm = RandomForestClassifier(n_estimators=20, random_state=0).fit(Xtr, ytr)\nr = importancia_por_permutacao(m, Xva, yva, 5, 0)", "expr": "r.tolist()", "expected": [0.13199999999999995, 0.15599999999999997, 0.04799999999999995, 0.05999999999999994], "tolerance": 1e-09, "name": "5 repetições, semente 0: a queda média de acurácia de cada coluna", "hint": "Para cada coluna e repetição: copie X, embaralhe só a coluna j com rng.permutation e anote base - score."},
  {"id": "perto-do-sklearn", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 3)\nX = X.to_numpy(dtype=float)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\nm = RandomForestClassifier(n_estimators=20, random_state=0).fit(Xtr, ytr)\nfrom sklearn.inspection import permutation_importance\nref = permutation_importance(m, Xva, yva, n_repeats=10, random_state=0).importances_mean\nr = importancia_por_permutacao(m, Xva, yva, 10, 0)", "expr": "bool(np.abs(r - ref).max() < 0.05)", "expected": true, "name": "Com 10 repetições, cada média fica a menos de 0.05 da permutation_importance", "hint": "Compara-se com permutation_importance(modelo, X, y, n_repeats=10); os sorteios são outros, então só a ordem de grandeza bate."},
  {"id": "positiva", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 3)\nX = X.to_numpy(dtype=float)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\nm = RandomForestClassifier(n_estimators=20, random_state=0).fit(Xtr, ytr)\nr = importancia_por_permutacao(m, Xva, yva, 5, 0)", "expr": "bool(r[1] > 0.1)", "expected": true, "name": "Embaralhar o comprometimento derruba a acurácia em mais de 0.1", "hint": "A importância é a acurácia original menos a acurácia com a coluna embaralhada: positiva quando a coluna ajuda."},
  {"id": "entrada-intacta", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 3)\nX = X.to_numpy(dtype=float)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\nm = RandomForestClassifier(n_estimators=20, random_state=0).fit(Xtr, ytr)\nantes = Xva.copy()\nr = importancia_por_permutacao(m, Xva, yva, 3, 0)", "expr": "bool((Xva == antes).all())", "expected": true, "name": "O X recebido não muda", "hint": "Embaralhe uma cópia: o np.asarray de um array float devolve o mesmo objeto, não uma cópia."},
  {"id": "reprodutivel", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 3)\nX = X.to_numpy(dtype=float)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\nm = RandomForestClassifier(n_estimators=20, random_state=0).fit(Xtr, ytr)\n", "expr": "importancia_por_permutacao(m, Xva, yva, 3, 7).tolist() == importancia_por_permutacao(m, Xva, yva, 3, 7).tolist()", "expected": true, "name": "A mesma semente dá as mesmas importâncias", "hint": "Use o gerador criado com a semente, não o np.random global."},
  {"id": "uma-repeticao", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(400, 3)\nX = X.to_numpy(dtype=float)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.25, random_state=0)\nm = RandomForestClassifier(n_estimators=20, random_state=0).fit(Xtr, ytr)\nr = importancia_por_permutacao(m, Xva, yva, 1, 0)", "expr": "[len(r), type(r).__name__]", "expected": [4, "ndarray"], "name": "Devolve um array com uma importância por coluna"}
]
```

### Soluções erradas
```python name="embaralha o X recebido"
import numpy as np


def importancia_por_permutacao(modelo, X, y, repeticoes, semente):
    rng = np.random.default_rng(semente)
    X = np.asarray(X, dtype=float)
    base = modelo.score(X, y)
    medias = []
    for j in range(X.shape[1]):
        quedas = []
        for _ in range(repeticoes):
            X_perm = X
            X_perm[:, j] = rng.permutation(X[:, j])
            quedas.append(base - modelo.score(X_perm, y))
        medias.append(float(np.mean(quedas)))
    return np.array(medias)
```
```python name="queda com o sinal trocado"
import numpy as np


def importancia_por_permutacao(modelo, X, y, repeticoes, semente):
    rng = np.random.default_rng(semente)
    X = np.asarray(X, dtype=float)
    base = modelo.score(X, y)
    medias = []
    for j in range(X.shape[1]):
        quedas = []
        for _ in range(repeticoes):
            X_perm = X.copy()
            X_perm[:, j] = rng.permutation(X[:, j])
            quedas.append(modelo.score(X_perm, y) - base)
        medias.append(float(np.mean(quedas)))
    return np.array(medias)
```
```python name="sorteio sem o gerador da semente"
import numpy as np


def importancia_por_permutacao(modelo, X, y, repeticoes, semente):
    rng = np.random.default_rng(semente)
    X = np.asarray(X, dtype=float)
    base = modelo.score(X, y)
    medias = []
    for j in range(X.shape[1]):
        quedas = []
        for _ in range(repeticoes):
            X_perm = X.copy()
            X_perm[:, j] = np.random.permutation(X[:, j])
            quedas.append(base - modelo.score(X_perm, y))
        medias.append(float(np.mean(quedas)))
    return np.array(medias)
```
```python name="coluna trocada pelas posições"
import numpy as np


def importancia_por_permutacao(modelo, X, y, repeticoes, semente):
    rng = np.random.default_rng(semente)
    X = np.asarray(X, dtype=float)
    base = modelo.score(X, y)
    medias = []
    for j in range(X.shape[1]):
        quedas = []
        for _ in range(repeticoes):
            X_perm = X.copy()
            X_perm[:, j] = rng.permutation(len(X))
            quedas.append(base - modelo.score(X_perm, y))
        medias.append(float(np.mean(quedas)))
    return np.array(medias)
```
```python name="embaralha as linhas inteiras"
import numpy as np


def importancia_por_permutacao(modelo, X, y, repeticoes, semente):
    rng = np.random.default_rng(semente)
    X = np.asarray(X, dtype=float)
    base = modelo.score(X, y)
    medias = []
    for j in range(X.shape[1]):
        quedas = []
        for _ in range(repeticoes):
            X_perm = X[rng.permutation(len(X))]
            X_perm[:, j] = rng.permutation(X[:, j])
            quedas.append(base - modelo.score(X_perm, y))
        medias.append(float(np.mean(quedas)))
    return np.array(medias)
```
```python name="mede o X sem embaralhar"
import numpy as np


def importancia_por_permutacao(modelo, X, y, repeticoes, semente):
    rng = np.random.default_rng(semente)
    X = np.asarray(X, dtype=float)
    base = modelo.score(X, y)
    medias = []
    for j in range(X.shape[1]):
        quedas = []
        for _ in range(repeticoes):
            X_perm = X.copy()
            X_perm[:, j] = rng.permutation(X[:, j])
            quedas.append(base - modelo.score(X, y))
        medias.append(float(np.mean(quedas)))
    return np.array(medias)
```

## Passo 4 · Leitura · Dependência parcial e ICE

A importância diz **quanto** um atributo pesa; a dependência parcial mostra **como**. Escolha uma grade de valores $v$ para o atributo $j$. Para cada $v$, troque a coluna $j$ de **todas** as linhas por $v$, peça as previsões e tire a média:

$$
\mathrm{DP}_j(v) = \frac{1}{n} \sum_{i=1}^{n} f\big(x_i \text{ com } x_{ij} = v\big)
$$

É a previsão média do modelo quando o atributo vale $v$ e os outros ficam como estão nos dados. Sem a média, cada linha dá a sua própria curva: são as curvas **ICE** (*individual conditional expectation*), e a dependência parcial é a média delas. As ICE mostram o que a média esconde. No conjunto de consumo fictício da lição anterior, o alvo soma $0{,}5\,x_1$ só quando $x_2 > 5$: num gradient boosting treinado nele, as curvas ICE de $x_1$ sobem em média 3,7 nas linhas com $x_2 > 5$ e ficam quase planas (−0,4) nas outras, enquanto a dependência parcial sobe 2,0, um valor que não descreve linha nenhuma. Curvas ICE que se separam em grupos ou se cruzam indicam **interação** entre atributos.

```python
from sklearn.inspection import partial_dependence

r = partial_dependence(modelo, X, [1], custom_values={1: grade}, method="brute", kind="both")
r["average"][0]        # a dependência parcial: um valor por ponto da grade
r["individual"][0]     # as curvas ICE: forma (linhas de X, pontos da grade)
```

O `PartialDependenceDisplay`, que desenha as curvas, depende do matplotlib e fica fora deste nível. Atenção ao `method`: o padrão `"auto"` escolhe `"recursion"` para árvores e boosting, que usa a distribuição do treino guardada nas próprias árvores e, no gradient boosting, deixa de fora a previsão inicial; os números saem deslocados em relação à conta acima. Para conferir a sua implementação, use `method="brute"`.

Duas leituras erradas são comuns. A dependência parcial descreve o **modelo**, não o mundo: uma curva que desce com o número de acessos ao aplicativo diz que o modelo associa mais acessos a menos atraso, não que forçar acessos reduz o atraso. E, com atributos correlacionados, fixar um deles cria combinações que não existem nos dados, como renda de R\$ 1 000 com patrimônio de R\$ 2 milhões; a média passa a incluir previsões em regiões sem exemplo nenhum. O SHAP, outra técnica popular de explicação (sem biblioteca no executor), pede as mesmas cautelas.

## Passo 5 · Exercício · Comparar importâncias

Compare as duas importâncias nos clientes fictícios do arquivo `clientes.py`: `possui_reserva` (0 ou 1) reduz de fato o atraso, e `id_cliente` é um identificador sorteado.

### Instruções
1. `comparar_importancias(modelo, X_treino, y_treino, X_valid, y_valid, semente)` treina o `modelo` recebido (uma floresta do scikit-learn, sem ajuste) com o treino; `X_treino` e `X_valid` são `DataFrame`s.
2. Em `"impureza"`, devolve os nomes das colunas de `X_treino` em ordem decrescente de `feature_importances_`.
3. Em `"permutacao"`, devolve os nomes em ordem decrescente de `importances_mean` de `permutation_importance(modelo, X_valid, y_valid, n_repeats=5, random_state=semente)`.
4. Nas duas listas, um empate mantém a ordem das colunas de `X_treino`.

### Código inicial
```python
from sklearn.inspection import permutation_importance


def comparar_importancias(modelo, X_treino, y_treino, X_valid, y_valid, semente):
    pass
```
```text path=clientes.py
import numpy as np
import pandas as pd


def gerar_clientes(n, semente):
    rng = np.random.default_rng(semente)
    renda = rng.normal(4.0, 1.5, n).clip(0.8).round(1)
    comprometimento = rng.uniform(5, 70, n).round(0)
    possui_reserva = (rng.random(n) < 0.4).astype(int)
    risco = (comprometimento > 45) & (renda < 5.0) | (renda < 2.0)
    salvo = (possui_reserva == 1) & (rng.random(n) < 0.7)
    troca = rng.random(n) < 0.1
    X = pd.DataFrame({"renda": renda, "comprometimento": comprometimento,
                      "possui_reserva": possui_reserva, "id_cliente": rng.permutation(n)})
    y = np.where((risco & ~salvo) ^ troca, "atrasa", "paga")
    return X, y
```

### Solução
```python
from sklearn.inspection import permutation_importance


def comparar_importancias(modelo, X_treino, y_treino, X_valid, y_valid, semente):
    modelo.fit(X_treino, y_treino)
    colunas = list(X_treino.columns)
    impureza = dict(zip(colunas, modelo.feature_importances_))
    resultado = permutation_importance(modelo, X_valid, y_valid, n_repeats=5, random_state=semente)
    permutacao = dict(zip(colunas, resultado.importances_mean))
    return {
        "impureza": sorted(colunas, key=impureza.get, reverse=True),
        "permutacao": sorted(colunas, key=permutacao.get, reverse=True),
    }
```
```text path=clientes.py
import numpy as np
import pandas as pd


def gerar_clientes(n, semente):
    rng = np.random.default_rng(semente)
    renda = rng.normal(4.0, 1.5, n).clip(0.8).round(1)
    comprometimento = rng.uniform(5, 70, n).round(0)
    possui_reserva = (rng.random(n) < 0.4).astype(int)
    risco = (comprometimento > 45) & (renda < 5.0) | (renda < 2.0)
    salvo = (possui_reserva == 1) & (rng.random(n) < 0.7)
    troca = rng.random(n) < 0.1
    X = pd.DataFrame({"renda": renda, "comprometimento": comprometimento,
                      "possui_reserva": possui_reserva, "id_cliente": rng.permutation(n)})
    y = np.where((risco & ~salvo) ^ troca, "atrasa", "paga")
    return X, y
```

### Dicas
1. O `zip(colunas, valores)` junta cada nome ao seu valor num dicionário.
2. O `sorted(colunas, key=dicionario.get, reverse=True)` ordena os nomes pelo valor, do maior para o menor, e mantém a ordem original nos empates.
3. A permutação precisa de dados que o modelo não viu no `fit`.

### Verificação
```json
[
  {"id": "impureza", "checkpoint": 2, "kind": "expr", "setup": "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(500, 4)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.3, random_state=0)\nr = comparar_importancias(RandomForestClassifier(n_estimators=20, random_state=0), Xtr, ytr, Xva, yva, 0)", "expr": "r['impureza']", "expected": ["comprometimento", "renda", "id_cliente", "possui_reserva"], "name": "Pela impureza, o identificador aparece à frente de possui_reserva", "hint": "Ordene os nomes das colunas pelo feature_importances_ do modelo treinado, do maior para o menor."},
  {"id": "permutacao", "checkpoint": 3, "kind": "expr", "setup": "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(500, 4)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.3, random_state=0)\nr = comparar_importancias(RandomForestClassifier(n_estimators=20, random_state=0), Xtr, ytr, Xva, yva, 0)", "expr": "r['permutacao']", "expected": ["comprometimento", "renda", "possui_reserva", "id_cliente"], "name": "Pela permutação na validação, o identificador vai para o fim", "hint": "A permutação usa a validação, com n_repeats=5 e random_state=semente, e ordena pela média das quedas."},
  {"id": "mede-na-validacao", "checkpoint": 3, "kind": "expr", "setup": "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(500, 4)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.3, random_state=0)\nchamadas = []\nclass Espiao(RandomForestClassifier):\n    def predict(self, X):\n        chamadas.append(len(X))\n        return super().predict(X)\nr = comparar_importancias(Espiao(n_estimators=20, random_state=0), Xtr, ytr, Xva, yva, 0)", "expr": "sorted(set(chamadas))", "expected": [150], "name": "Todas as previsões da permutação são feitas nas 150 linhas da validação", "hint": "A permutação mede quanto o modelo piora em dados que ele não viu: passe X_valid e y_valid."},
  {"id": "modelo-treinado", "checkpoint": 1, "kind": "expr", "setup": "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(500, 4)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.3, random_state=0)\nm = RandomForestClassifier(n_estimators=20, random_state=0)\nr = comparar_importancias(m, Xtr, ytr, Xva, yva, 0)", "expr": "[len(m.estimators_), m.n_features_in_]", "expected": [20, 4], "name": "O modelo recebido sai treinado com o treino", "hint": "Comece pelo fit no treino: o modelo chega sem ajuste."},
  {"id": "outra-semente", "checkpoint": 3, "kind": "expr", "setup": "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(500, 4)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.3, random_state=0)\nr = comparar_importancias(RandomForestClassifier(n_estimators=20, random_state=0), Xtr, ytr, Xva, yva, 1)", "expr": "r['permutacao'][-1]", "expected": "id_cliente", "name": "Com outra semente na permutação, o identificador continua em último"},
  {"id": "tipos", "checkpoint": 2, "kind": "expr", "setup": "from sklearn.ensemble import RandomForestClassifier\nfrom sklearn.model_selection import train_test_split\nfrom clientes import gerar_clientes\nX, y = gerar_clientes(500, 4)\nXtr, Xva, ytr, yva = train_test_split(X, y, test_size=0.3, random_state=0)\nr = comparar_importancias(RandomForestClassifier(n_estimators=10, random_state=1), Xtr, ytr, Xva, yva, 0)", "expr": "[sorted(r), sorted(r['impureza']), type(r['permutacao'][0]).__name__]", "expected": [["impureza", "permutacao"], ["comprometimento", "id_cliente", "possui_reserva", "renda"], "str"], "name": "Devolve as duas listas com os nomes das quatro colunas"}
]
```

### Soluções erradas
```python name="permutação medida no treino"
from sklearn.inspection import permutation_importance


def comparar_importancias(modelo, X_treino, y_treino, X_valid, y_valid, semente):
    modelo.fit(X_treino, y_treino)
    colunas = list(X_treino.columns)
    impureza = dict(zip(colunas, modelo.feature_importances_))
    resultado = permutation_importance(modelo, X_treino, y_treino, n_repeats=5, random_state=semente)
    permutacao = dict(zip(colunas, resultado.importances_mean))
    return {
        "impureza": sorted(colunas, key=impureza.get, reverse=True),
        "permutacao": sorted(colunas, key=permutacao.get, reverse=True),
    }
```
```python name="ordem crescente"
from sklearn.inspection import permutation_importance


def comparar_importancias(modelo, X_treino, y_treino, X_valid, y_valid, semente):
    modelo.fit(X_treino, y_treino)
    colunas = list(X_treino.columns)
    impureza = dict(zip(colunas, modelo.feature_importances_))
    resultado = permutation_importance(modelo, X_valid, y_valid, n_repeats=5, random_state=semente)
    permutacao = dict(zip(colunas, resultado.importances_mean))
    return {
        "impureza": sorted(colunas, key=impureza.get),
        "permutacao": sorted(colunas, key=permutacao.get),
    }
```
```python name="ordena pelo desvio das repetições"
from sklearn.inspection import permutation_importance


def comparar_importancias(modelo, X_treino, y_treino, X_valid, y_valid, semente):
    modelo.fit(X_treino, y_treino)
    colunas = list(X_treino.columns)
    impureza = dict(zip(colunas, modelo.feature_importances_))
    resultado = permutation_importance(modelo, X_valid, y_valid, n_repeats=5, random_state=semente)
    permutacao = dict(zip(colunas, resultado.importances_std))
    return {
        "impureza": sorted(colunas, key=impureza.get, reverse=True),
        "permutacao": sorted(colunas, key=permutacao.get, reverse=True),
    }
```
```python name="usa o modelo sem treinar"
from sklearn.inspection import permutation_importance


def comparar_importancias(modelo, X_treino, y_treino, X_valid, y_valid, semente):
    colunas = list(X_treino.columns)
    impureza = dict(zip(colunas, modelo.feature_importances_))
    resultado = permutation_importance(modelo, X_valid, y_valid, n_repeats=5, random_state=semente)
    permutacao = dict(zip(colunas, resultado.importances_mean))
    return {
        "impureza": sorted(colunas, key=impureza.get, reverse=True),
        "permutacao": sorted(colunas, key=permutacao.get, reverse=True),
    }
```
```python name="devolve as posições das colunas"
from sklearn.inspection import permutation_importance


def comparar_importancias(modelo, X_treino, y_treino, X_valid, y_valid, semente):
    modelo.fit(X_treino, y_treino)
    colunas = list(range(X_treino.shape[1]))
    impureza = dict(zip(colunas, modelo.feature_importances_))
    resultado = permutation_importance(modelo, X_valid, y_valid, n_repeats=5, random_state=semente)
    permutacao = dict(zip(colunas, resultado.importances_mean))
    return {
        "impureza": sorted(colunas, key=impureza.get, reverse=True),
        "permutacao": sorted(colunas, key=permutacao.get, reverse=True),
    }
```

## Passo 6 · Exercício · Dependência parcial

Escreva as curvas ICE e a dependência parcial de um regressor qualquer, sem usar o `partial_dependence`.

### Instruções
1. `curvas_ice(modelo, X, j, grade)` devolve uma matriz do numpy com uma linha por linha de `X` e uma coluna por valor da `grade`: na coluna `k`, as previsões do modelo com a coluna `j` de todas as linhas trocada por `grade[k]`.
2. A troca é feita numa cópia; o `X` recebido não muda.
3. `dependencia_parcial(modelo, X, j, grade)` devolve um array com a média das curvas ICE em cada ponto da grade.

### Código inicial
```python
import numpy as np


def curvas_ice(modelo, X, j, grade):
    pass


def dependencia_parcial(modelo, X, j, grade):
    pass
```

### Solução
```python
import numpy as np


def curvas_ice(modelo, X, j, grade):
    X = np.asarray(X, dtype=float)
    curvas = np.empty((len(X), len(grade)))
    for k, valor in enumerate(grade):
        X_mod = X.copy()
        X_mod[:, j] = valor
        curvas[:, k] = modelo.predict(X_mod)
    return curvas


def dependencia_parcial(modelo, X, j, grade):
    return curvas_ice(modelo, X, j, grade).mean(axis=0)
```

### Dicas
1. Percorra a grade com `enumerate`: a posição diz em que coluna da matriz guardar as previsões.
2. `X_mod[:, j] = valor` põe o mesmo valor em todas as linhas da coluna `j`.
3. A dependência parcial tira a média sobre as linhas, não sobre a grade.

### Verificação
```json
[
  {"id": "pd-coluna-0", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import GradientBoostingRegressor\nfrom sklearn.inspection import partial_dependence\nrng = np.random.default_rng(0)\nX = rng.uniform(0, 10, size=(200, 4)).round(2)\ny = 3 * np.sin(X[:, 0]) + 0.5 * X[:, 1] * (X[:, 2] > 5) + rng.normal(0, 1.0, 200)\nm = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=0).fit(X, y)\nXm = X[:60]\ngrade = np.array([0.0, 2.5, 5.0, 7.5, 10.0])\nref = partial_dependence(m, Xm, [0], custom_values={0: grade}, method='brute', kind='average')['average'][0]", "expr": "bool(np.allclose(dependencia_parcial(m, Xm, 0, grade), ref))", "expected": true, "name": "Coluna 0: a mesma curva do partial_dependence(method='brute')", "hint": "Compara-se com partial_dependence(..., method='brute', kind='average'): para cada valor da grade, a média das previsões com a coluna j fixada nele."},
  {"id": "pd-coluna-2", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import GradientBoostingRegressor\nfrom sklearn.inspection import partial_dependence\nrng = np.random.default_rng(0)\nX = rng.uniform(0, 10, size=(200, 4)).round(2)\ny = 3 * np.sin(X[:, 0]) + 0.5 * X[:, 1] * (X[:, 2] > 5) + rng.normal(0, 1.0, 200)\nm = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=0).fit(X, y)\nXm = X[:60]\ngrade = np.array([0.0, 2.5, 5.0, 7.5, 10.0])\nref = partial_dependence(m, Xm, [2], custom_values={2: grade}, method='brute', kind='average')['average'][0]", "expr": "bool(np.allclose(dependencia_parcial(m, Xm, 2, grade), ref))", "expected": true, "name": "Coluna 2: a mesma curva do partial_dependence(method='brute')"},
  {"id": "ice-igual", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import GradientBoostingRegressor\nfrom sklearn.inspection import partial_dependence\nrng = np.random.default_rng(0)\nX = rng.uniform(0, 10, size=(200, 4)).round(2)\ny = 3 * np.sin(X[:, 0]) + 0.5 * X[:, 1] * (X[:, 2] > 5) + rng.normal(0, 1.0, 200)\nm = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=0).fit(X, y)\nXm = X[:60]\ngrade = np.array([0.0, 2.5, 5.0, 7.5, 10.0])\nref = partial_dependence(m, Xm, [1], custom_values={1: grade}, method='brute', kind='individual')['individual'][0]", "expr": "bool(np.allclose(curvas_ice(m, Xm, 1, grade), ref))", "expected": true, "name": "As curvas ICE da coluna 1 batem com kind='individual'", "hint": "Compara-se com partial_dependence(..., kind='individual'): uma linha por linha de X, uma coluna por valor da grade."},
  {"id": "ice-forma", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import GradientBoostingRegressor\nfrom sklearn.inspection import partial_dependence\nrng = np.random.default_rng(0)\nX = rng.uniform(0, 10, size=(200, 4)).round(2)\ny = 3 * np.sin(X[:, 0]) + 0.5 * X[:, 1] * (X[:, 2] > 5) + rng.normal(0, 1.0, 200)\nm = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=0).fit(X, y)\nXm = X[:60]\ngrade = np.array([0.0, 2.5, 5.0, 7.5, 10.0])\n", "expr": "list(curvas_ice(m, Xm, 1, grade).shape)", "expected": [60, 5], "name": "curvas_ice devolve uma matriz (linhas de X) × (valores da grade)"},
  {"id": "ice-heterogeneo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import GradientBoostingRegressor\nfrom sklearn.inspection import partial_dependence\nrng = np.random.default_rng(0)\nX = rng.uniform(0, 10, size=(200, 4)).round(2)\ny = 3 * np.sin(X[:, 0]) + 0.5 * X[:, 1] * (X[:, 2] > 5) + rng.normal(0, 1.0, 200)\nm = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=0).fit(X, y)\nXm = X[:60]\ngrade = np.array([0.0, 2.5, 5.0, 7.5, 10.0])\nc = curvas_ice(m, Xm, 1, grade)\nalto = Xm[:, 2] > 5\nsobe = c[:, -1] - c[:, 0]", "expr": "[bool(sobe[alto].mean() > 2), bool(abs(sobe[~alto].mean()) < 1)]", "expected": [true, true], "name": "As curvas ICE da coluna 1 sobem só nas linhas com coluna 2 acima de 5 (interação)"},
  {"id": "entrada-intacta", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import GradientBoostingRegressor\nfrom sklearn.inspection import partial_dependence\nrng = np.random.default_rng(0)\nX = rng.uniform(0, 10, size=(200, 4)).round(2)\ny = 3 * np.sin(X[:, 0]) + 0.5 * X[:, 1] * (X[:, 2] > 5) + rng.normal(0, 1.0, 200)\nm = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=0).fit(X, y)\nXm = X[:60]\ngrade = np.array([0.0, 2.5, 5.0, 7.5, 10.0])\nantes = Xm.copy()\np = dependencia_parcial(m, Xm, 0, grade)", "expr": "bool((Xm == antes).all())", "expected": true, "name": "O X recebido não muda", "hint": "Fixe a coluna numa cópia de X a cada valor da grade."},
  {"id": "pd-tipo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom sklearn.ensemble import GradientBoostingRegressor\nfrom sklearn.inspection import partial_dependence\nrng = np.random.default_rng(0)\nX = rng.uniform(0, 10, size=(200, 4)).round(2)\ny = 3 * np.sin(X[:, 0]) + 0.5 * X[:, 1] * (X[:, 2] > 5) + rng.normal(0, 1.0, 200)\nm = GradientBoostingRegressor(n_estimators=50, max_depth=3, random_state=0).fit(X, y)\nXm = X[:60]\ngrade = np.array([0.0, 2.5, 5.0, 7.5, 10.0])\np = dependencia_parcial(m, Xm, 3, grade)", "expr": "[type(p).__name__, len(p)]", "expected": ["ndarray", 5], "name": "dependencia_parcial devolve um array com um valor por ponto da grade"}
]
```

### Soluções erradas
```python name="fixa a coluna no próprio X"
import numpy as np


def curvas_ice(modelo, X, j, grade):
    X = np.asarray(X, dtype=float)
    curvas = np.empty((len(X), len(grade)))
    for k, valor in enumerate(grade):
        X_mod = X
        X_mod[:, j] = valor
        curvas[:, k] = modelo.predict(X_mod)
    return curvas


def dependencia_parcial(modelo, X, j, grade):
    return curvas_ice(modelo, X, j, grade).mean(axis=0)
```
```python name="média ao longo da grade"
import numpy as np


def curvas_ice(modelo, X, j, grade):
    X = np.asarray(X, dtype=float)
    curvas = np.empty((len(X), len(grade)))
    for k, valor in enumerate(grade):
        X_mod = X.copy()
        X_mod[:, j] = valor
        curvas[:, k] = modelo.predict(X_mod)
    return curvas


def dependencia_parcial(modelo, X, j, grade):
    return curvas_ice(modelo, X, j, grade).mean(axis=1)
```
```python name="mediana no lugar da média"
import numpy as np


def curvas_ice(modelo, X, j, grade):
    X = np.asarray(X, dtype=float)
    curvas = np.empty((len(X), len(grade)))
    for k, valor in enumerate(grade):
        X_mod = X.copy()
        X_mod[:, j] = valor
        curvas[:, k] = modelo.predict(X_mod)
    return curvas


def dependencia_parcial(modelo, X, j, grade):
    return np.median(curvas_ice(modelo, X, j, grade), axis=0)
```
```python name="desloca a coluna em vez de fixar"
import numpy as np


def curvas_ice(modelo, X, j, grade):
    X = np.asarray(X, dtype=float)
    curvas = np.empty((len(X), len(grade)))
    for k, valor in enumerate(grade):
        X_mod = X.copy()
        X_mod[:, j] += valor
        curvas[:, k] = modelo.predict(X_mod)
    return curvas


def dependencia_parcial(modelo, X, j, grade):
    return curvas_ice(modelo, X, j, grade).mean(axis=0)
```
```python name="curvas ICE transpostas"
import numpy as np


def curvas_ice(modelo, X, j, grade):
    X = np.asarray(X, dtype=float)
    curvas = np.empty((len(X), len(grade)))
    for k, valor in enumerate(grade):
        X_mod = X.copy()
        X_mod[:, j] = valor
        curvas[:, k] = modelo.predict(X_mod)
    return curvas.T


def dependencia_parcial(modelo, X, j, grade):
    return curvas_ice(modelo, X, j, grade).mean(axis=1)
```

## Passo 7 · Quiz · Correlação e importância

### Pergunta
Um modelo de atraso fictício usa `renda` e `renda_familiar`, com correlação de 0,97 entre elas. Na validação, a importância por permutação de cada uma é 0,01, e a de `comprometimento` é 0,12. Um colega conclui que a renda não importa e propõe retirar as duas colunas. O que dizer?
- [ ] Ele está certo: a permutação mede o efeito em dados novos, e 0,01 é desprezível
- [x] Embaralhar uma das duas deixa a outra carregando quase a mesma informação, então cada uma parece pouco importante sozinha; é preciso embaralhar as duas juntas, ou retirar só uma e medir de novo
- [ ] A permutação é enviesada para colunas binárias, e por isso subestima a renda
- [ ] Basta aumentar `n_repeats` para 100: com mais repetições, a importância verdadeira aparece
> Com duas colunas quase iguais, o modelo perde pouco quando uma é embaralhada, porque a outra continua ali; o grupo pode ser decisivo mesmo com cada coluna perto de zero. Retirar as duas de uma vez pode derrubar o modelo. Mais repetições só reduzem o desvio da média, sem mudar o que ela mede, e o viés por cardinalidade é da importância por impureza, não da permutação.

### Pergunta
A dependência parcial de "acessos ao aplicativo por mês" num modelo fictício de atraso desce de 0,30 para 0,10 de probabilidade prevista. A gerente propõe mandar notificações diárias para aumentar os acessos e, assim, reduzir os atrasos. O que a curva permite afirmar?
- [ ] Que cada acesso a mais reduz o atraso, porque a dependência parcial isola o efeito do atributo
- [x] Que o modelo associa mais acessos a menos atraso; isso pode refletir clientes mais organizados, e só um experimento (enviar notificações a um grupo sorteado) mede o efeito da intervenção
- [ ] Nada: a dependência parcial só vale para regressão
- [ ] Que o efeito é causal, desde que a importância por permutação do atributo seja alta
> A dependência parcial descreve como as previsões do modelo variam com o atributo, mantidos os outros como estão nos dados. Ela não separa causa de associação: clientes que acessam mais o aplicativo podem ser os que já controlam melhor as contas. Uma importância alta também é associação no modelo. Para classificação, a curva usa a probabilidade prevista e vale do mesmo jeito.

### Pergunta
Numa floresta treinada com clientes fictícios, `permutation_importance` calculada no **treino** dá 0,12 para `id_cliente`, um identificador sorteado; na **validação**, dá −0,02. Qual número usar e por quê?
- [ ] O do treino, porque tem mais linhas e, portanto, menos ruído
- [ ] A média dos dois, −0,02 e 0,12, que equilibra os dois conjuntos
- [x] O da validação: no treino, a floresta decorou clientes pelo identificador, e embaralhá-lo atrapalha esse acerto decorado; em clientes novos, o identificador não ajuda, e a importância fica perto de zero
- [ ] Nenhum: importâncias negativas mostram que a permutação não funciona com florestas
> Embaralhar uma coluna no treino mede quanto o modelo a usa para acertar exemplos que já viu, inclusive o ruído decorado. A pergunta útil é quanto ela ajuda em dados novos, e isso só a validação responde. Um valor levemente negativo numa coluna inútil é flutuação do sorteio, esperada e informativa.
