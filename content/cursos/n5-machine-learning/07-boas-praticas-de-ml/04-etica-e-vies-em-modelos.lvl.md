---
slug: n5-m7-04-etica-e-vies-em-modelos
titulo: Ética, justiça e viés em modelos
descricao: Vieses nos dados e no rótulo, métricas de justiça por grupo (paridade demográfica, igualdade de oportunidade), atributos proxy, explicabilidade e LGPD aplicada a modelos.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Medir disparidades de desempenho e de decisão entre grupos
- Identificar atributos proxy e discutir trade-offs entre critérios de justiça
- Relacionar decisões automatizadas com a LGPD (direito à revisão, finalidade, minimização)
---

## Passo 1 · Leitura · De onde vem o viés

Um modelo de crédito que erra mais para um grupo de pessoas do que para outro não precisa de nenhuma linha de código preconceituosa. Ele aprende o que os dados mostram, e os dados carregam a história de como foram coletados. Nesta lição, os grupos são fictícios e neutros (grupo A e grupo B, as regiões de uma cidade inventada), sem referência a nenhum caso ou população real.

Três origens aparecem com frequência:

- **Amostra.** Um grupo aparece pouco no treino. Um modelo de triagem de currículos fictício treinado com 9 000 candidatos do grupo A e 300 do grupo B tem poucos exemplos para aprender o que um bom candidato do grupo B tem em comum, e o erro nesse grupo tende a ser maior, mesmo com a mesma regra para todos.
- **Rótulo histórico.** O alvo registra decisões passadas, não a verdade. Se no passado o crédito foi negado com mais frequência a quem morava na região sul, o histórico tem poucos "bons pagadores" de lá: quem não recebeu crédito nunca teve a chance de pagar. O modelo reproduz a decisão antiga com aparência de neutralidade.
- **Proxy.** Tirar a coluna do grupo não tira a informação. Um bairro, uma escola ou um padrão de compra podem estar tão associados ao grupo que o modelo reconstrói o grupo a partir deles.

A primeira ferramenta é **medir por grupo**: as métricas da m3-02 calculadas separadamente para cada grupo. Duas famílias de números importam. As **taxas de decisão** dizem quantas pessoas de cada grupo recebem a decisão positiva (crédito aprovado, entrevista marcada), independentemente do rótulo. As **taxas de erro** dizem quantas pessoas que mereciam a decisão positiva a receberam (TPR) e quantas que não mereciam a receberam (FPR), em cada grupo.

```python
df["acertou"] = df["y"] == df["pred"]
df.groupby("grupo").agg(n=("y", "size"), taxa_positivos=("pred", "mean"))
df[df["y"] == 1].groupby("grupo")["pred"].mean()       # TPR de cada grupo
```

Sempre olhe o $n$ ao lado de cada taxa. Uma TPR de 1,0 calculada com um único positivo diz muito pouco, e uma diferença entre grupos pequenos pode ser só acaso. Com $n_+$ positivos num grupo, o erro padrão da TPR é aproximadamente $\sqrt{\text{TPR}\,(1 - \text{TPR}) / n_+}$, a mesma conta da proporção do Nível 4.

## Passo 2 · Previsão · Taxas por grupo

O programa tem os rótulos verdadeiros e as decisões de um modelo para 12 pessoas fictícias de dois grupos. Leia sem executar e digite o que ele imprime.

### Código
```python
import pandas as pd

df = pd.DataFrame({
    "grupo": ["A"] * 6 + ["B"] * 6,
    "y":     [1, 1, 1, 0, 0, 0,   1, 0, 0, 0, 0, 0],
    "pred":  [1, 1, 0, 1, 0, 0,   1, 0, 0, 0, 0, 1],
})
print(df.groupby("grupo")["pred"].mean().round(3).to_dict())
print(df[df["y"] == 1].groupby("grupo")["pred"].mean().round(3).to_dict())
print(df.groupby("grupo")["y"].mean().round(3).to_dict())
print(df[df["y"] == 1].groupby("grupo").size().to_dict())
```

### Dicas
1. A média de uma coluna de zeros e uns é a fração de uns.
2. A segunda linha só olha quem tem `y == 1`: é a TPR de cada grupo.
3. A última linha conta quantos positivos verdadeiros cada grupo tem.

### Saída esperada
```text
{'A': 0.5, 'B': 0.333}
{'A': 0.667, 'B': 1.0}
{'A': 0.5, 'B': 0.167}
{'A': 3, 'B': 1}
```

## Passo 3 · Exercício · Métricas por grupo
modo: lacunas

Complete as lacunas (`___`) da função que calcula, para cada grupo, o tamanho, a taxa de decisões positivas e as duas taxas de erro.

### Instruções
1. `metricas_por_grupo(y, y_pred, grupo)` devolve um dicionário com uma chave por grupo (o nome do grupo como texto). A `"tpr"` de um grupo é a fração de `y_pred == 1` entre as linhas **do grupo** com `y == 1`; sem nenhuma dessas linhas, é `None`.
2. A `"fpr"` é a fração de `y_pred == 1` entre as linhas do grupo com `y == 0` (ou `None`, se não houver).
3. Cada grupo tem também `"n"`, o número de linhas do grupo (`int`), e `"taxa_positivos"`, a fração de decisões positivas do modelo no grupo.

### Código inicial
```python
import numpy as np


def metricas_por_grupo(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    resultado = {}
    for g in np.unique(grupo):
        m = grupo == g
        positivos = ___
        negativos = ___
        resultado[str(g)] = {
            "n": int(m.sum()),
            "taxa_positivos": float(___[m].mean()),
            "tpr": float(y_pred[positivos].mean()) if ___ else None,
            "fpr": float(y_pred[negativos].mean()) if negativos.any() else None,
        }
    return resultado
```

### Solução
```python
import numpy as np


def metricas_por_grupo(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    resultado = {}
    for g in np.unique(grupo):
        m = grupo == g
        positivos = m & (y == 1)
        negativos = m & (y == 0)
        resultado[str(g)] = {
            "n": int(m.sum()),
            "taxa_positivos": float(y_pred[m].mean()),
            "tpr": float(y_pred[positivos].mean()) if positivos.any() else None,
            "fpr": float(y_pred[negativos].mean()) if negativos.any() else None,
        }
    return resultado
```

### Dicas
1. Combine duas máscaras booleanas com `&`: a do grupo e a da condição sobre o rótulo.
2. A taxa de decisão olha só o que o modelo decidiu.
3. A média de um array vazio dá `nan` com um aviso; teste antes se a máscara tem algum `True`.

### Verificação
```json
[
  {"id": "completo", "checkpoint": 3, "kind": "call", "function": "metricas_por_grupo", "args": [[1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], [1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1], ["A", "A", "A", "A", "A", "A", "B", "B", "B", "B", "B", "B"]], "expected": {"A": {"n": 6, "taxa_positivos": 0.5, "tpr": 0.6666666666666666, "fpr": 0.3333333333333333}, "B": {"n": 6, "taxa_positivos": 0.3333333333333333, "tpr": 1.0, "fpr": 0.2}}, "tolerance": 1e-09, "name": "As 12 pessoas da Previsão: todas as métricas de A e de B", "hint": "Cada métrica é uma média de y_pred num subconjunto das linhas do grupo."},
  {"id": "n", "checkpoint": 3, "kind": "expr", "setup": "r = metricas_por_grupo([1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], [1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1], ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B'])", "expr": "[r['A']['n'], r['B']['n']]", "expected": [6, 6], "name": "n é o número de linhas de cada grupo"},
  {"id": "taxa", "checkpoint": 3, "kind": "expr", "setup": "r = metricas_por_grupo([1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], [1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1], ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B'])", "expr": "[r['A']['taxa_positivos'], r['B']['taxa_positivos']]", "expected": [0.5, 0.3333333333333333], "tolerance": 1e-09, "name": "A taxa de positivos usa as decisões do modelo, não os rótulos", "hint": "A taxa de decisão positiva é a fração de y_pred == 1 no grupo."},
  {"id": "tpr", "checkpoint": 1, "kind": "expr", "setup": "r = metricas_por_grupo([1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], [1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1], ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B'])", "expr": "[r['A']['tpr'], r['B']['tpr']]", "expected": [0.6666666666666666, 1.0], "tolerance": 1e-09, "name": "A TPR de cada grupo divide pelos positivos verdadeiros daquele grupo", "hint": "Os positivos de um grupo são as linhas do grupo com y == 1."},
  {"id": "fpr", "checkpoint": 2, "kind": "expr", "setup": "r = metricas_por_grupo([1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], [1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1], ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B'])", "expr": "[r['A']['fpr'], r['B']['fpr']]", "expected": [0.3333333333333333, 0.2], "tolerance": 1e-09, "name": "A FPR de cada grupo divide pelos negativos verdadeiros daquele grupo", "hint": "Os negativos de um grupo são as linhas do grupo com y == 0."},
  {"id": "sem-positivos", "checkpoint": 1, "kind": "expr", "setup": "r = metricas_por_grupo([1, 0, 1, 0, 0, 0], [1, 0, 0, 0, 1, 0], ['A', 'A', 'A', 'B', 'B', 'B'])", "expr": "[r['B']['tpr'], r['B']['fpr']]", "expected": [null, 0.3333333333333333], "tolerance": 1e-09, "name": "Um grupo sem nenhum positivo verdadeiro tem TPR None", "hint": "Sem positivos no grupo, a TPR não está definida: devolva None em vez de calcular a média de nada."},
  {"id": "tres-grupos", "checkpoint": 3, "kind": "call", "function": "metricas_por_grupo", "args": [[1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0], [1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0], ["norte", "norte", "norte", "norte", "norte", "sul", "sul", "sul", "sul", "sul", "centro", "centro", "centro", "centro", "centro"]], "expected": {"centro": {"n": 5, "taxa_positivos": 0.2, "tpr": 0.0, "fpr": 0.25}, "norte": {"n": 5, "taxa_positivos": 0.4, "tpr": 0.5, "fpr": 0.3333333333333333}, "sul": {"n": 5, "taxa_positivos": 0.6, "tpr": 1.0, "fpr": 0.3333333333333333}}, "tolerance": 1e-09, "name": "Três regiões de uma cidade fictícia"},
  {"id": "tipos", "checkpoint": 3, "kind": "expr", "setup": "r = metricas_por_grupo([1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], [1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1], ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B'])", "expr": "[sorted(r), sorted(r['A']), type(r['A']['n']).__name__, type(r['A']['tpr']).__name__]", "expected": [["A", "B"], ["fpr", "n", "taxa_positivos", "tpr"], "int", "float"], "name": "Chaves de texto, n inteiro e taxas float"}
]
```

### Soluções erradas
```python name="positivos de todos os grupos"
import numpy as np


def metricas_por_grupo(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    resultado = {}
    for g in np.unique(grupo):
        m = grupo == g
        positivos = y == 1
        negativos = m & (y == 0)
        resultado[str(g)] = {
            "n": int(m.sum()),
            "taxa_positivos": float(y_pred[m].mean()),
            "tpr": float(y_pred[positivos].mean()) if positivos.any() else None,
            "fpr": float(y_pred[negativos].mean()) if negativos.any() else None,
        }
    return resultado
```
```python name="negativos de todos os grupos"
import numpy as np


def metricas_por_grupo(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    resultado = {}
    for g in np.unique(grupo):
        m = grupo == g
        positivos = m & (y == 1)
        negativos = y == 0
        resultado[str(g)] = {
            "n": int(m.sum()),
            "taxa_positivos": float(y_pred[m].mean()),
            "tpr": float(y_pred[positivos].mean()) if positivos.any() else None,
            "fpr": float(y_pred[negativos].mean()) if negativos.any() else None,
        }
    return resultado
```
```python name="taxa calculada com os rótulos"
import numpy as np


def metricas_por_grupo(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    resultado = {}
    for g in np.unique(grupo):
        m = grupo == g
        positivos = m & (y == 1)
        negativos = m & (y == 0)
        resultado[str(g)] = {
            "n": int(m.sum()),
            "taxa_positivos": float(y[m].mean()),
            "tpr": float(y_pred[positivos].mean()) if positivos.any() else None,
            "fpr": float(y_pred[negativos].mean()) if negativos.any() else None,
        }
    return resultado
```
```python name="positivos pelas decisões do modelo"
import numpy as np


def metricas_por_grupo(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    resultado = {}
    for g in np.unique(grupo):
        m = grupo == g
        positivos = m & (y_pred == 1)
        negativos = m & (y == 0)
        resultado[str(g)] = {
            "n": int(m.sum()),
            "taxa_positivos": float(y_pred[m].mean()),
            "tpr": float(y_pred[positivos].mean()) if positivos.any() else None,
            "fpr": float(y_pred[negativos].mean()) if negativos.any() else None,
        }
    return resultado
```
```python name="TPR de grupo sem positivos"
import numpy as np


def metricas_por_grupo(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    resultado = {}
    for g in np.unique(grupo):
        m = grupo == g
        positivos = m & (y == 1)
        negativos = m & (y == 0)
        resultado[str(g)] = {
            "n": int(m.sum()),
            "taxa_positivos": float(y_pred[m].mean()),
            "tpr": float(y_pred[positivos].mean()) if m.any() else None,
            "fpr": float(y_pred[negativos].mean()) if negativos.any() else None,
        }
    return resultado
```

## Passo 4 · Leitura · Critérios de justiça e o conflito entre eles

Com as métricas por grupo na mão, falta decidir o que "justo" quer dizer. Há vários critérios formais; dois são os mais usados. Com $\hat Y$ a decisão do modelo, $Y$ o rótulo e $A$ o grupo:

**Paridade demográfica:** a taxa de decisões positivas é a mesma em todos os grupos,

$$
P(\hat Y = 1 \mid A = a) = P(\hat Y = 1 \mid A = b)
$$

**Igualdade de oportunidade:** entre as pessoas que mereciam a decisão positiva ($Y = 1$), a chance de recebê-la é a mesma em todos os grupos, ou seja, as TPRs são iguais,

$$
P(\hat Y = 1 \mid Y = 1, A = a) = P(\hat Y = 1 \mid Y = 1, A = b)
$$

Exigir também FPRs iguais dá as **chances iguais** (*equalized odds*). Na prática, mede-se a distância até o critério: a maior diferença entre as taxas dos grupos, que é zero quando o critério é atendido.

Os critérios entram em conflito quando as **taxas-base** diferem, isto é, quando a fração de $Y = 1$ não é a mesma nos grupos. Na Previsão, 50 % do grupo A e 17 % do grupo B eram positivos. Um modelo perfeito ($\hat Y = Y$) tem TPR 1 e FPR 0 nos dois grupos, e atende à igualdade de oportunidade; mas aprova 50 % de A e 17 % de B, e viola a paridade demográfica. Para igualar as taxas de aprovação, ele teria de aprovar pessoas de B com $Y = 0$ (a FPR de B sobe) ou recusar pessoas de A com $Y = 1$ (a TPR de A cai). Há um resultado mais forte, conhecido da literatura de justiça em aprendizado de máquina: com taxas-base diferentes e um classificador imperfeito, não é possível ter ao mesmo tempo scores **calibrados** em cada grupo (um score 0,7 significar 70 % nos dois) e TPR e FPR iguais entre os grupos.

Não existe, portanto, o modelo "justo em todos os sentidos". Escolher o critério é uma decisão sobre valores e consequências, não um detalhe técnico: numa triagem que encaminha para um segundo exame, perder um caso verdadeiro pesa mais, e a igualdade de oportunidade faz sentido. O papel de quem constrói o modelo é medir os dois lados, mostrar o custo de cada escolha e documentar o critério adotado.

## Passo 5 · Exercício · Dois critérios

Escreva as duas medidas de distância até os critérios, para qualquer número de grupos.

### Instruções
1. `paridade_demografica(y_pred, grupo)` devolve a maior taxa de decisões positivas entre os grupos menos a menor, como `float` (0.0 quando todas são iguais).
2. `igualdade_de_oportunidade(y, y_pred, grupo)` devolve a maior TPR entre os grupos menos a menor, como `float`. Grupos sem nenhum positivo verdadeiro ficam fora; com menos de dois grupos comparáveis, devolve 0.0.

### Código inicial
```python
import numpy as np


def paridade_demografica(y_pred, grupo):
    pass


def igualdade_de_oportunidade(y, y_pred, grupo):
    pass
```

### Solução
```python
import numpy as np


def paridade_demografica(y_pred, grupo):
    y_pred, grupo = np.asarray(y_pred), np.asarray(grupo)
    taxas = [y_pred[grupo == g].mean() for g in np.unique(grupo)]
    return float(max(taxas) - min(taxas))


def igualdade_de_oportunidade(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    tprs = []
    for g in np.unique(grupo):
        positivos = (grupo == g) & (y == 1)
        if positivos.any():
            tprs.append(y_pred[positivos].mean())
    if len(tprs) < 2:
        return 0.0
    return float(max(tprs) - min(tprs))
```

### Dicas
1. Calcule uma taxa por grupo numa lista e use `max` e `min`.
2. A TPR de um grupo é a média de `y_pred` nas linhas do grupo com `y == 1`.
3. Um grupo sem positivos não tem TPR: zero seria afirmar que o modelo errou com todos eles.

### Verificação
```json
[
  {"id": "pd-previsao", "checkpoint": 1, "kind": "call", "function": "paridade_demografica", "args": [[1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1], ["A", "A", "A", "A", "A", "A", "B", "B", "B", "B", "B", "B"]], "expected": 0.16666666666666669, "tolerance": 1e-09, "name": "Na Previsão: 0.5 - 0.333 de diferença na taxa de aprovação", "hint": "A diferença é a maior taxa de decisão positiva menos a menor."},
  {"id": "pd-ordem", "checkpoint": 1, "kind": "call", "function": "paridade_demografica", "args": [[0, 1, 0, 0, 1, 1, 1, 0], ["A", "A", "A", "A", "B", "B", "B", "B"]], "expected": 0.5, "tolerance": 1e-09, "name": "A diferença é positiva qualquer que seja o grupo de taxa maior", "hint": "Use a maior taxa menos a menor, não a do primeiro grupo menos a do segundo."},
  {"id": "pd-tres", "checkpoint": 1, "kind": "call", "function": "paridade_demografica", "args": [[1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0], ["norte", "norte", "norte", "norte", "norte", "sul", "sul", "sul", "sul", "sul", "centro", "centro", "centro", "centro", "centro"]], "expected": 0.39999999999999997, "tolerance": 1e-09, "name": "Com três grupos, a maior diferença entre quaisquer dois", "hint": "Compare todos os grupos, não só os dois primeiros."},
  {"id": "pd-zero", "checkpoint": 1, "kind": "call", "function": "paridade_demografica", "args": [[1, 0, 1, 0], ["A", "A", "B", "B"]], "expected": 0.0, "tolerance": 1e-09, "type": "float", "name": "Taxas iguais: diferença 0.0"},
  {"id": "io-previsao", "checkpoint": 2, "kind": "call", "function": "igualdade_de_oportunidade", "args": [[1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0], [1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1], ["A", "A", "A", "A", "A", "A", "B", "B", "B", "B", "B", "B"]], "expected": 0.33333333333333337, "tolerance": 1e-09, "name": "Na Previsão: TPR de 0.667 contra 1.0", "hint": "A TPR de cada grupo divide pelos positivos verdadeiros daquele grupo."},
  {"id": "io-tres", "checkpoint": 2, "kind": "call", "function": "igualdade_de_oportunidade", "args": [[1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0], [1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0], ["norte", "norte", "norte", "norte", "norte", "sul", "sul", "sul", "sul", "sul", "centro", "centro", "centro", "centro", "centro"]], "expected": 1.0, "tolerance": 1e-09, "name": "Três regiões fictícias"},
  {"id": "io-sem-positivos", "checkpoint": 2, "kind": "call", "function": "igualdade_de_oportunidade", "args": [[1, 1, 0, 1, 0, 0, 0, 0, 0], [1, 0, 0, 1, 1, 0, 1, 0, 0], ["A", "A", "A", "B", "B", "B", "C", "C", "C"]], "expected": 0.5, "tolerance": 1e-09, "name": "Um grupo sem positivos verdadeiros fica fora da comparação", "hint": "Sem positivos, a TPR do grupo não existe; compare só os grupos que têm."},
  {"id": "io-um-grupo", "checkpoint": 2, "kind": "call", "function": "igualdade_de_oportunidade", "args": [[1, 0, 0, 0], [1, 1, 0, 0], ["A", "A", "B", "B"]], "expected": 0.0, "tolerance": 1e-09, "type": "float", "name": "Com um só grupo comparável, a diferença é 0.0"},
  {"id": "perfeito", "checkpoint": 2, "kind": "expr", "setup": "y = [1, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0]\ng = ['A', 'A', 'A', 'A', 'A', 'A', 'B', 'B', 'B', 'B', 'B', 'B']", "expr": "[round(paridade_demografica(y, g), 6), round(igualdade_de_oportunidade(y, y, g), 6)]", "expected": [0.333333, 0.0], "name": "O modelo perfeito tem TPR igual nos grupos, mas taxas de aprovação diferentes"}
]
```

### Soluções erradas
```python name="razão no lugar da diferença"
import numpy as np


def paridade_demografica(y_pred, grupo):
    y_pred, grupo = np.asarray(y_pred), np.asarray(grupo)
    taxas = [y_pred[grupo == g].mean() for g in np.unique(grupo)]
    return float(min(taxas) / max(taxas))


def igualdade_de_oportunidade(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    tprs = []
    for g in np.unique(grupo):
        positivos = (grupo == g) & (y == 1)
        if positivos.any():
            tprs.append(y_pred[positivos].mean())
    if len(tprs) < 2:
        return 0.0
    return float(max(tprs) - min(tprs))
```
```python name="primeiro grupo menos o segundo"
import numpy as np


def paridade_demografica(y_pred, grupo):
    y_pred, grupo = np.asarray(y_pred), np.asarray(grupo)
    taxas = [y_pred[grupo == g].mean() for g in np.unique(grupo)]
    return float(taxas[0] - taxas[1])


def igualdade_de_oportunidade(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    tprs = []
    for g in np.unique(grupo):
        positivos = (grupo == g) & (y == 1)
        if positivos.any():
            tprs.append(y_pred[positivos].mean())
    if len(tprs) < 2:
        return 0.0
    return float(max(tprs) - min(tprs))
```
```python name="taxa dividida pelo total de pessoas"
import numpy as np


def paridade_demografica(y_pred, grupo):
    y_pred, grupo = np.asarray(y_pred), np.asarray(grupo)
    taxas = [(y_pred[grupo == g] == 1).sum() / len(y_pred) for g in np.unique(grupo)]
    return float(max(taxas) - min(taxas))


def igualdade_de_oportunidade(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    tprs = []
    for g in np.unique(grupo):
        positivos = (grupo == g) & (y == 1)
        if positivos.any():
            tprs.append(y_pred[positivos].mean())
    if len(tprs) < 2:
        return 0.0
    return float(max(tprs) - min(tprs))
```
```python name="TPR dividida por todos os positivos"
import numpy as np


def paridade_demografica(y_pred, grupo):
    y_pred, grupo = np.asarray(y_pred), np.asarray(grupo)
    taxas = [y_pred[grupo == g].mean() for g in np.unique(grupo)]
    return float(max(taxas) - min(taxas))


def igualdade_de_oportunidade(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    tprs = []
    for g in np.unique(grupo):
        positivos = (grupo == g) & (y == 1)
        if positivos.any():
            tprs.append(y_pred[positivos].sum() / (y == 1).sum())
    if len(tprs) < 2:
        return 0.0
    return float(max(tprs) - min(tprs))
```
```python name="TPR dividida pelo tamanho do grupo"
import numpy as np


def paridade_demografica(y_pred, grupo):
    y_pred, grupo = np.asarray(y_pred), np.asarray(grupo)
    taxas = [y_pred[grupo == g].mean() for g in np.unique(grupo)]
    return float(max(taxas) - min(taxas))


def igualdade_de_oportunidade(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    tprs = []
    for g in np.unique(grupo):
        positivos = (grupo == g) & (y == 1)
        if positivos.any():
            tprs.append(y_pred[positivos].sum() / (grupo == g).sum())
    if len(tprs) < 2:
        return 0.0
    return float(max(tprs) - min(tprs))
```
```python name="grupo sem positivos com TPR zero"
import numpy as np


def paridade_demografica(y_pred, grupo):
    y_pred, grupo = np.asarray(y_pred), np.asarray(grupo)
    taxas = [y_pred[grupo == g].mean() for g in np.unique(grupo)]
    return float(max(taxas) - min(taxas))


def igualdade_de_oportunidade(y, y_pred, grupo):
    y, y_pred, grupo = np.asarray(y), np.asarray(y_pred), np.asarray(grupo)
    tprs = []
    for g in np.unique(grupo):
        positivos = (grupo == g) & (y == 1)
        tprs.append(y_pred[positivos].sum() / max(positivos.sum(), 1))
    if len(tprs) < 2:
        return 0.0
    return float(max(tprs) - min(tprs))
```

## Passo 6 · Leitura · Proxies, mitigação e LGPD

**Remover o atributo sensível não basta.** Imagine um modelo de crédito fictício treinado sem a coluna `grupo`, mas com `regiao_norte`, numa cidade inventada em que 85 % das pessoas do grupo B moram na região norte. O modelo não vê o grupo, mas vê quase a mesma informação. Para encontrar esses **proxies**, inverta a pergunta: quão bem cada coluna, sozinha, prevê o atributo sensível? A AUC dessa previsão responde. Uma AUC de 0,5 quer dizer que a coluna não separa os grupos; perto de 1, ou perto de 0 (a associação ao contrário), a coluna é um proxy. Por isso a medida usada é $\max(\text{AUC}, 1 - \text{AUC})$.

```python
from sklearn.metrics import roc_auc_score

auc = roc_auc_score(sensivel, X["regiao_norte"])
forca = max(auc, 1 - auc)          # 0.5: não separa; 1.0: separa perfeitamente
```

Para medir as disparidades, o atributo sensível precisa estar disponível na avaliação, mesmo que o modelo não o use.

**Mitigação.** Antes do treino: coletar mais dados do grupo sub-representado, rever rótulos históricos, **reponderar** as linhas (a ideia do `class_weight`). No treino: restrições de justiça na otimização. Depois do treino: **limiares por grupo**, escolhidos para igualar a TPR. Cada uma tem custo: um limiar por grupo usa o grupo na decisão, o que pode ser inaceitável em alguns contextos, e quase sempre muda a precisão de algum grupo. Como qualquer hiperparâmetro, ele é escolhido na validação e conferido uma vez no teste.

**LGPD.** A Lei Geral de Proteção de Dados Pessoais tem princípios que se aplicam direto a modelos. **Finalidade:** dados coletados para um propósito (entregar uma compra) não devem ser reaproveitados para outro incompatível (pontuar crédito). **Necessidade**, ou minimização: usar só os dados necessários, o que também reduz proxies. **Não discriminação:** o tratamento não pode ter fins discriminatórios ilícitos ou abusivos. A lei também dá ao titular o direito de pedir a **revisão** de decisões tomadas unicamente por tratamento automatizado que afetem seus interesses, e de receber informações claras sobre os critérios usados.

**Documentação.** Um *model card* registra para que o modelo serve, com que dados foi treinado, as métricas gerais **e por grupo** (com o $n$), o critério de justiça adotado e as limitações conhecidas. É ele que permite revisar uma decisão.

## Passo 7 · Exercício · Proxies e limiares por grupo

Escreva o detector de proxies e a escolha de um limiar por grupo que iguala a TPR. Os dados dos casos são de uma cidade fictícia, com um atributo sensível binário sorteado.

### Instruções
1. `detectar_proxies(X, sensivel, limiar)` calcula, para cada coluna do `DataFrame` `X`, a AUC (`roc_auc_score(sensivel, X[coluna])`) e a força $\max(\text{AUC}, 1 - \text{AUC})$, e devolve a lista dos nomes com força maior ou igual ao `limiar`, da mais forte para a mais fraca.
2. `limiares_por_grupo(y, scores, grupo, tpr_alvo)` devolve `{nome do grupo: limiar}`: para cada grupo, o **maior** limiar $t$ (entre os scores dos positivos verdadeiros do grupo) com o qual a TPR do grupo, contando como positivo `score >= t`, fica maior ou igual a `tpr_alvo`.

### Código inicial
```python
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score


def detectar_proxies(X, sensivel, limiar):
    pass


def limiares_por_grupo(y, scores, grupo, tpr_alvo):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score


def detectar_proxies(X, sensivel, limiar):
    forcas = {}
    for coluna in X.columns:
        auc = roc_auc_score(sensivel, X[coluna])
        forcas[coluna] = max(auc, 1 - auc)
    suspeitas = [c for c in X.columns if forcas[c] >= limiar]
    return sorted(suspeitas, key=lambda c: -forcas[c])


def limiares_por_grupo(y, scores, grupo, tpr_alvo):
    y, scores, grupo = np.asarray(y), np.asarray(scores, dtype=float), np.asarray(grupo)
    limiares = {}
    for g in np.unique(grupo):
        positivos = np.sort(scores[(grupo == g) & (y == 1)])[::-1]
        necessarios = int(np.ceil(tpr_alvo * len(positivos)))
        limiares[str(g)] = float(positivos[necessarios - 1])
    return limiares
```

### Dicas
1. O `sorted(lista, key=...)` com a força negativa ordena da maior para a menor.
2. Com os scores dos positivos do grupo em ordem decrescente, o limiar no $j$-ésimo deles deixa $j$ positivos acima: a TPR é $j / n_+$.
3. O menor $j$ com $j / n_+ \ge$ `tpr_alvo` é o teto de `tpr_alvo * n_+`.

### Verificação
```json
[
  {"id": "proxies", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimport pandas as pd\nrng = np.random.default_rng(21)\nn = 300\nsensivel = (rng.random(n) < 0.4).astype(int)\nX = pd.DataFrame({\n    'regiao_norte': np.where(rng.random(n) < 0.85, sensivel, 1 - sensivel),\n    'renda': (rng.normal(5, 1.5, n) - 1.2 * sensivel).round(2),\n    'idade': rng.integers(20, 70, n),\n    'tempo_no_endereco': rng.integers(0, 30, n),\n})\n", "expr": "detectar_proxies(X, sensivel, 0.65)", "expected": ["regiao_norte", "renda"], "name": "Cidade fictícia: as colunas que separam os grupos, da mais forte para a mais fraca", "hint": "A renda é menor, em média, no grupo 1: a AUC dela fica abaixo de 0.5, e a força é max(AUC, 1 - AUC)."},
  {"id": "forca-simetrica", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimport pandas as pd\nrng = np.random.default_rng(21)\nn = 300\nsensivel = (rng.random(n) < 0.4).astype(int)\nX = pd.DataFrame({\n    'regiao_norte': np.where(rng.random(n) < 0.85, sensivel, 1 - sensivel),\n    'renda': (rng.normal(5, 1.5, n) - 1.2 * sensivel).round(2),\n    'idade': rng.integers(20, 70, n),\n    'tempo_no_endereco': rng.integers(0, 30, n),\n})\n", "expr": "'renda' in detectar_proxies(X, sensivel, 0.65)", "expected": true, "name": "Uma coluna associada ao grupo no sentido contrário também é proxy", "hint": "Uma AUC de 0.25 separa tanto quanto uma de 0.75."},
  {"id": "nenhum", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimport pandas as pd\nrng = np.random.default_rng(21)\nn = 300\nsensivel = (rng.random(n) < 0.4).astype(int)\nX = pd.DataFrame({\n    'regiao_norte': np.where(rng.random(n) < 0.85, sensivel, 1 - sensivel),\n    'renda': (rng.normal(5, 1.5, n) - 1.2 * sensivel).round(2),\n    'idade': rng.integers(20, 70, n),\n    'tempo_no_endereco': rng.integers(0, 30, n),\n})\n", "expr": "detectar_proxies(X[['idade', 'tempo_no_endereco']], sensivel, 0.65)", "expected": [], "name": "Colunas sorteadas sem relação com o grupo não são proxies"},
  {"id": "limiar-inclusivo", "checkpoint": 1, "kind": "expr", "setup": "import pandas as pd\nX = pd.DataFrame({'a': [1.0, 2.0, 3.0, 1.5], 'b': [4.0, 3.0, 2.0, 1.0]})", "expr": "detectar_proxies(X, [0, 0, 1, 1], 0.75)", "expected": ["b", "a"], "name": "Força exatamente igual ao limiar entra na lista", "hint": "A comparação com o limiar é maior ou igual."},
  {"id": "limiares", "checkpoint": 2, "kind": "call", "function": "limiares_por_grupo", "args": [[1, 1, 1, 1, 0, 1, 1, 0], [0.9, 0.7, 0.6, 0.4, 0.8, 0.5, 0.3, 0.45], ["A", "A", "A", "A", "A", "B", "B", "B"], 0.75], "expected": {"A": 0.6, "B": 0.3}, "tolerance": 1e-09, "name": "TPR alvo 0.75: em A, 3 dos 4 positivos; em B, 2 dos 2", "hint": "Ordene os scores dos positivos de cada grupo do maior para o menor; o limiar é o score do último positivo necessário para atingir a TPR alvo."},
  {"id": "atinge-alvo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(5)\nn = 400\ngrupo = np.where(rng.random(n) < 0.5, 'A', 'B')\ny = (rng.random(n) < 0.3).astype(int)\nscores = np.clip(0.25 + 0.35 * y + np.where(grupo == 'B', -0.12, 0.0) + rng.normal(0, 0.15, n), 0, 1).round(4)\nr = limiares_por_grupo(y, scores, grupo, 0.8)\ntpr = {g: float((scores[(grupo == g) & (y == 1)] >= r[g]).mean()) for g in ['A', 'B']}", "expr": "[tpr['A'] >= 0.8, tpr['B'] >= 0.8]", "expected": [true, true], "name": "400 scores fictícios: com o limiar de cada grupo, a TPR de cada grupo chega a 0.8", "hint": "Positivo é score >= limiar; a TPR do grupo é a fração dos positivos verdadeiros do grupo acima do limiar."},
  {"id": "maior-limiar", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(5)\nn = 400\ngrupo = np.where(rng.random(n) < 0.5, 'A', 'B')\ny = (rng.random(n) < 0.3).astype(int)\nscores = np.clip(0.25 + 0.35 * y + np.where(grupo == 'B', -0.12, 0.0) + rng.normal(0, 0.15, n), 0, 1).round(4)\nr = limiares_por_grupo(y, scores, grupo, 0.8)\nacima = {g: np.sort(np.unique(scores[(grupo == g) & (y == 1)])) for g in ['A', 'B']}\nprox = {g: acima[g][acima[g] > r[g]][0] for g in ['A', 'B']}\ntpr2 = {g: float((scores[(grupo == g) & (y == 1)] >= prox[g]).mean()) for g in ['A', 'B']}", "expr": "[tpr2['A'] < 0.8, tpr2['B'] < 0.8]", "expected": [true, true], "name": "É o maior limiar possível: o próximo score acima já deixa a TPR abaixo de 0.8", "hint": "Entre os limiares que atingem a TPR alvo, escolha o maior (o que marca menos negativos)."},
  {"id": "valores", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(5)\nn = 400\ngrupo = np.where(rng.random(n) < 0.5, 'A', 'B')\ny = (rng.random(n) < 0.3).astype(int)\nscores = np.clip(0.25 + 0.35 * y + np.where(grupo == 'B', -0.12, 0.0) + rng.normal(0, 0.15, n), 0, 1).round(4)\nr = limiares_por_grupo(y, scores, grupo, 0.8)", "expr": "r", "expected": {"A": 0.508, "B": 0.4029}, "tolerance": 1e-09, "name": "Os limiares dos grupos A e B, diferentes porque os scores de B são mais baixos"}
]
```

### Soluções erradas
```python name="AUC sem considerar o sentido contrário"
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score


def detectar_proxies(X, sensivel, limiar):
    forcas = {}
    for coluna in X.columns:
        auc = roc_auc_score(sensivel, X[coluna])
        forcas[coluna] = auc
    suspeitas = [c for c in X.columns if forcas[c] >= limiar]
    return sorted(suspeitas, key=lambda c: -forcas[c])


def limiares_por_grupo(y, scores, grupo, tpr_alvo):
    y, scores, grupo = np.asarray(y), np.asarray(scores, dtype=float), np.asarray(grupo)
    limiares = {}
    for g in np.unique(grupo):
        positivos = np.sort(scores[(grupo == g) & (y == 1)])[::-1]
        necessarios = int(np.ceil(tpr_alvo * len(positivos)))
        limiares[str(g)] = float(positivos[necessarios - 1])
    return limiares
```
```python name="limiar estrito na lista de proxies"
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score


def detectar_proxies(X, sensivel, limiar):
    forcas = {}
    for coluna in X.columns:
        auc = roc_auc_score(sensivel, X[coluna])
        forcas[coluna] = max(auc, 1 - auc)
    suspeitas = [c for c in X.columns if forcas[c] > limiar]
    return sorted(suspeitas, key=lambda c: -forcas[c])


def limiares_por_grupo(y, scores, grupo, tpr_alvo):
    y, scores, grupo = np.asarray(y), np.asarray(scores, dtype=float), np.asarray(grupo)
    limiares = {}
    for g in np.unique(grupo):
        positivos = np.sort(scores[(grupo == g) & (y == 1)])[::-1]
        necessarios = int(np.ceil(tpr_alvo * len(positivos)))
        limiares[str(g)] = float(positivos[necessarios - 1])
    return limiares
```
```python name="um limiar para todos os grupos"
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score


def detectar_proxies(X, sensivel, limiar):
    forcas = {}
    for coluna in X.columns:
        auc = roc_auc_score(sensivel, X[coluna])
        forcas[coluna] = max(auc, 1 - auc)
    suspeitas = [c for c in X.columns if forcas[c] >= limiar]
    return sorted(suspeitas, key=lambda c: -forcas[c])


def limiares_por_grupo(y, scores, grupo, tpr_alvo):
    y, scores, grupo = np.asarray(y), np.asarray(scores, dtype=float), np.asarray(grupo)
    limiares = {}
    for g in np.unique(grupo):
        positivos = np.sort(scores[y == 1])[::-1]
        necessarios = int(np.ceil(tpr_alvo * len(positivos)))
        limiares[str(g)] = float(positivos[necessarios - 1])
    return limiares
```
```python name="o menor limiar"
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score


def detectar_proxies(X, sensivel, limiar):
    forcas = {}
    for coluna in X.columns:
        auc = roc_auc_score(sensivel, X[coluna])
        forcas[coluna] = max(auc, 1 - auc)
    suspeitas = [c for c in X.columns if forcas[c] >= limiar]
    return sorted(suspeitas, key=lambda c: -forcas[c])


def limiares_por_grupo(y, scores, grupo, tpr_alvo):
    y, scores, grupo = np.asarray(y), np.asarray(scores, dtype=float), np.asarray(grupo)
    limiares = {}
    for g in np.unique(grupo):
        positivos = np.sort(scores[(grupo == g) & (y == 1)])[::-1]
        necessarios = int(np.ceil(tpr_alvo * len(positivos)))
        limiares[str(g)] = float(positivos[-1])
    return limiares
```
```python name="arredonda para baixo os positivos necessários"
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score


def detectar_proxies(X, sensivel, limiar):
    forcas = {}
    for coluna in X.columns:
        auc = roc_auc_score(sensivel, X[coluna])
        forcas[coluna] = max(auc, 1 - auc)
    suspeitas = [c for c in X.columns if forcas[c] >= limiar]
    return sorted(suspeitas, key=lambda c: -forcas[c])


def limiares_por_grupo(y, scores, grupo, tpr_alvo):
    y, scores, grupo = np.asarray(y), np.asarray(scores, dtype=float), np.asarray(grupo)
    limiares = {}
    for g in np.unique(grupo):
        positivos = np.sort(scores[(grupo == g) & (y == 1)])[::-1]
        necessarios = max(int(tpr_alvo * len(positivos)), 1)
        limiares[str(g)] = float(positivos[necessarios - 1])
    return limiares
```
```python name="ordem crescente dos scores"
import numpy as np
import pandas as pd
from sklearn.metrics import roc_auc_score


def detectar_proxies(X, sensivel, limiar):
    forcas = {}
    for coluna in X.columns:
        auc = roc_auc_score(sensivel, X[coluna])
        forcas[coluna] = max(auc, 1 - auc)
    suspeitas = [c for c in X.columns if forcas[c] >= limiar]
    return sorted(suspeitas, key=lambda c: -forcas[c])


def limiares_por_grupo(y, scores, grupo, tpr_alvo):
    y, scores, grupo = np.asarray(y), np.asarray(scores, dtype=float), np.asarray(grupo)
    limiares = {}
    for g in np.unique(grupo):
        positivos = np.sort(scores[(grupo == g) & (y == 1)])
        necessarios = int(np.ceil(tpr_alvo * len(positivos)))
        limiares[str(g)] = float(positivos[necessarios - 1])
    return limiares
```

## Passo 8 · Quiz · Trade-offs e LGPD

### Pergunta
Um modelo de crédito fictício aprova 41 % do grupo A e 22 % do grupo B. A equipe tira a coluna `grupo` do treino, mantém `bairro` e `escola_de_formacao`, retreina, e as taxas passam a 40 % e 23 %. Qual é a leitura correta?
- [ ] O problema foi resolvido: o modelo não usa mais o grupo
- [x] As colunas restantes provavelmente funcionam como proxies do grupo; é preciso medir quão bem cada uma prevê o grupo e avaliar as métricas por grupo, em vez de assumir que a remoção resolveu
- [ ] A diferença que sobrou prova que os grupos têm comportamento de pagamento diferente
- [ ] Basta remover também o `bairro`, e qualquer disparidade restante será zero
> Tirar a coluna não tira a informação: se `bairro` e `escola_de_formacao` separam os grupos, o modelo reconstrói o grupo a partir delas, e as taxas quase não mudaram. A disparidade restante pode vir de proxies, de rótulos históricos ou de diferenças reais, e o número sozinho não distingue essas causas. Remover um proxy pode ajudar, mas não garante disparidade zero.

### Pergunta
Num grupo A, 30 % das pessoas são bons pagadores; no grupo B, 10 %. Um modelo tem TPR de 0,80 nos dois grupos e FPR de 0,05 nos dois. O que se pode afirmar?
- [x] O modelo atende à igualdade de oportunidade (e às chances iguais), mas aprova taxas diferentes nos grupos: cerca de 27,5 % em A e 12,5 % em B, e não atende à paridade demográfica
- [ ] O modelo atende a todos os critérios de justiça, porque os erros são iguais
- [ ] O modelo atende à paridade demográfica, porque a TPR é a mesma
- [ ] É impossível ter TPR e FPR iguais com taxas-base diferentes
> A taxa de aprovação é TPR × taxa-base + FPR × (1 − taxa-base): 0,8 × 0,3 + 0,05 × 0,7 = 0,275 em A e 0,8 × 0,1 + 0,05 × 0,9 = 0,125 em B. Com taxas-base diferentes, erros iguais implicam aprovações diferentes; o que o resultado de impossibilidade proíbe é ter, além disso, scores calibrados em cada grupo, não TPR e FPR iguais sozinhas.

### Pergunta
Uma loja online fictícia tem endereços, histórico de compras e horários de acesso coletados para entregar pedidos e quer usá-los num modelo que decide, sem intervenção humana, o limite de crédito de cada cliente. Pela LGPD, qual é o ponto de atenção central?
- [ ] Nenhum: os dados já estão com a empresa, então podem ser usados em qualquer modelo
- [ ] Basta anonimizar o nome dos clientes, porque a LGPD trata só de nomes e documentos
- [x] O uso precisa ser compatível com a finalidade da coleta e limitado ao necessário, e o cliente pode pedir a revisão de uma decisão tomada unicamente por tratamento automatizado e informações claras sobre os critérios; o projeto precisa de base para o novo uso e de um processo de revisão documentado
- [ ] A LGPD proíbe qualquer modelo de crédito automatizado
> Os princípios de finalidade e necessidade limitam o reaproveitamento dos dados para outro propósito e pedem só o necessário. Endereço e horários são dados pessoais mesmo sem o nome. A lei não proíbe decisões automatizadas, mas garante ao titular o direito de pedir a revisão delas e de receber informações sobre os critérios, o que exige documentação (como um *model card*) e um processo para atender o pedido.
