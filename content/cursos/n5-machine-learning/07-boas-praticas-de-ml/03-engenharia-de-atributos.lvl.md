---
slug: n5-m7-03-engenharia-de-atributos
titulo: Engenharia de atributos
descricao: Transformações (log, binning, interações, datas, texto simples), codificação de categorias com alta cardinalidade (target encoding com validação), seleção de atributos e o que automatizar.
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
- Criar atributos a partir de datas, textos curtos, razões e interações e medir o ganho
- Codificar categorias de alta cardinalidade sem vazamento (target encoding com folds)
- Selecionar atributos com métodos de filtro, embutidos e por eliminação recursiva
---

## Passo 1 · Leitura · Datas, razões e logs

Uma data guardada como texto, uma dívida sem a renda ao lado, uma renda com cauda longa: a informação está na tabela, mas numa forma que o modelo aproveita mal. **Engenharia de atributos** é reescrever as colunas para deixar visível o que importa.

**Datas.** Um carimbo como `2024-03-02 22:10` vira vários atributos: o dia da semana (`dt.dayofweek`, com segunda = 0 e domingo = 6), um indicador de fim de semana, o mês, a hora. No pandas 3 esses atributos saem como `int32`; converta com `astype("int64")` quando o tipo importar.

**Razões e interações.** Uma dívida de R\$ 3 mil pesa diferente para quem ganha R\$ 2 mil e para quem ganha R\$ 20 mil. A coluna `divida / renda` transforma uma fronteira diagonal (dívida acima de 60 % da renda) num corte só, que uma árvore rasa encontra com uma pergunta; sem ela, a árvore imita a diagonal com vários degraus. Interações (produtos de pares de colunas) fazem algo parecido de forma automática, com o `PolynomialFeatures(interaction_only=True)`, ao custo de muitas colunas.

**Logaritmos.** Rendas, valores de compra e contagens têm cauda longa: poucos valores enormes dominam médias e coeficientes. O $\log(1 + x)$, `np.log1p`, comprime a cauda e aceita o zero. O `np.log(0)` dá `-inf`, e uma coluna com `-inf` quebra o `fit` com `ValueError: Input X contains infinity or a value too large for dtype('float64').`

```python
from sklearn.preprocessing import FunctionTransformer, KBinsDiscretizer

log = FunctionTransformer(np.log1p)                        # não aprende nada
faixas = KBinsDiscretizer(n_bins=4, encode="ordinal", strategy="quantile", quantile_method="averaged_inverted_cdf")
```

**Faixas.** O `KBinsDiscretizer` corta uma coluna em faixas. As bordas são **aprendidas** no `fit` (os quantis do treino), então ele é um transformador como o `StandardScaler`: calcular as bordas com a tabela inteira é o vazamento de pré-processamento da lição 1. No scikit-learn 1.8, o `strategy="quantile"` sem `quantile_method` escreve um `FutureWarning` avisando que o padrão vai mudar; passe o método explicitamente.

**Registrar como código.** Uma transformação feita à mão num notebook precisa ser repetida, igual, nos dados de produção. O `FunctionTransformer` põe uma função sem estado dentro do `Pipeline`, e a transformação passa a viajar com o modelo.

## Passo 2 · Previsão · Atributos de uma data

O programa extrai atributos de quatro carimbos de data e hora. O dia 1º de março de 2024 foi uma sexta-feira. Leia sem executar e digite o que o programa imprime.

### Código
```python
import pandas as pd

datas = pd.to_datetime(pd.Series(["2024-03-01 08:30", "2024-03-02 22:10", "2024-03-03 12:00", "2024-03-04 07:45"]))
print(datas.dt.dayofweek.tolist())
print((datas.dt.dayofweek >= 5).tolist())
print(datas.dt.hour.tolist())
print(datas.dt.day_name().tolist())
print(datas.dt.dayofweek.dtype)
```

### Dicas
1. No `dayofweek`, segunda-feira é 0 e domingo é 6.
2. O `day_name()` devolve o nome do dia em inglês.
3. A leitura do passo 1 diz o tipo dos atributos de data no pandas 3.

### Saída esperada
```text
[4, 5, 6, 0]
[False, True, True, False]
[8, 22, 12, 7]
['Friday', 'Saturday', 'Sunday', 'Monday']
int32
```

## Passo 3 · Exercício · Atributos de data
modo: lacunas

Complete as lacunas (`___`) da função que transforma uma coluna de data e hora em quatro atributos numéricos.

### Instruções
1. `atributos_de_data(df, coluna)` converte `df[coluna]` com `pd.to_datetime` (a coluna pode ser texto ou já ser datetime) e não altera o `df`.
2. Devolve um `DataFrame` novo, com o mesmo índice do `df`, e as colunas `dia_semana` (segunda = 0, domingo = 6), `fim_de_semana` (`True` no sábado e no domingo), `mes` e `hora`, nessa ordem.
3. As colunas `dia_semana`, `mes` e `hora` são `int64`, e `fim_de_semana` é `bool`.

### Código inicial
```python
import pandas as pd


def atributos_de_data(df, coluna):
    datas = pd.to_datetime(___)
    return pd.DataFrame({
        "dia_semana": datas.dt.___.astype("int64"),
        "fim_de_semana": ___,
        "mes": datas.dt.month.astype(___),
        "hora": datas.dt.hour.astype("int64"),
    }, index=df.index)
```

### Solução
```python
import pandas as pd


def atributos_de_data(df, coluna):
    datas = pd.to_datetime(df[coluna])
    return pd.DataFrame({
        "dia_semana": datas.dt.dayofweek.astype("int64"),
        "fim_de_semana": datas.dt.dayofweek >= 5,
        "mes": datas.dt.month.astype("int64"),
        "hora": datas.dt.hour.astype("int64"),
    }, index=df.index)
```

### Dicas
1. O acessor `dt` tem um atributo para cada parte da data; o do dia da semana não é o `day`.
2. Uma comparação de uma série com um número já devolve uma série `bool`.
3. O texto `"int64"` dentro do `astype` escolhe o tipo.

### Verificação
```json
[
  {"id": "colunas", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\ndf = pd.DataFrame({'quando': ['2024-03-01 08:30', '2024-03-02 22:10', '2024-03-03 12:00', '2024-03-04 07:45', '2024-12-31 23:59'], 'valor': [120.0, 35.5, 80.0, 12.9, 300.0]}, index=[10, 11, 12, 13, 14])\nr = atributos_de_data(df, 'quando')", "expr": "r.columns.tolist()", "expected": ["dia_semana", "fim_de_semana", "mes", "hora"], "name": "As quatro colunas, nessa ordem"},
  {"id": "dia-semana", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\ndf = pd.DataFrame({'quando': ['2024-03-01 08:30', '2024-03-02 22:10', '2024-03-03 12:00', '2024-03-04 07:45', '2024-12-31 23:59'], 'valor': [120.0, 35.5, 80.0, 12.9, 300.0]}, index=[10, 11, 12, 13, 14])\nr = atributos_de_data(df, 'quando')", "expr": "r['dia_semana'].tolist()", "expected": [4, 5, 6, 0, 1], "name": "O dia da semana, com segunda = 0", "hint": "O dia da semana não é o dia do mês."},
  {"id": "fim-de-semana", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\ndf = pd.DataFrame({'quando': ['2024-03-01 08:30', '2024-03-02 22:10', '2024-03-03 12:00', '2024-03-04 07:45', '2024-12-31 23:59'], 'valor': [120.0, 35.5, 80.0, 12.9, 300.0]}, index=[10, 11, 12, 13, 14])\nr = atributos_de_data(df, 'quando')", "expr": "r['fim_de_semana'].tolist()", "expected": [false, true, true, false, false], "name": "Sábado e domingo são fim de semana", "hint": "No dayofweek, sábado é 5 e domingo é 6."},
  {"id": "mes-hora", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\ndf = pd.DataFrame({'quando': ['2024-03-01 08:30', '2024-03-02 22:10', '2024-03-03 12:00', '2024-03-04 07:45', '2024-12-31 23:59'], 'valor': [120.0, 35.5, 80.0, 12.9, 300.0]}, index=[10, 11, 12, 13, 14])\nr = atributos_de_data(df, 'quando')", "expr": "[r['mes'].tolist(), r['hora'].tolist()]", "expected": [[3, 3, 3, 3, 12], [8, 22, 12, 7, 23]], "name": "O mês e a hora"},
  {"id": "tipos", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\ndf = pd.DataFrame({'quando': ['2024-03-01 08:30', '2024-03-02 22:10', '2024-03-03 12:00', '2024-03-04 07:45', '2024-12-31 23:59'], 'valor': [120.0, 35.5, 80.0, 12.9, 300.0]}, index=[10, 11, 12, 13, 14])\nr = atributos_de_data(df, 'quando')", "expr": "r.dtypes.astype(str).to_dict()", "expected": {"dia_semana": "int64", "fim_de_semana": "bool", "mes": "int64", "hora": "int64"}, "name": "Tipos: três colunas int64 e uma bool", "hint": "Os atributos de data do pandas 3 saem como int32; converta os três números."},
  {"id": "indice", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\ndf = pd.DataFrame({'quando': ['2024-03-01 08:30', '2024-03-02 22:10', '2024-03-03 12:00', '2024-03-04 07:45', '2024-12-31 23:59'], 'valor': [120.0, 35.5, 80.0, 12.9, 300.0]}, index=[10, 11, 12, 13, 14])\nr = atributos_de_data(df, 'quando')", "expr": "r.index.tolist()", "expected": [10, 11, 12, 13, 14], "name": "O índice é o mesmo do df recebido"},
  {"id": "ja-datetime", "checkpoint": 1, "kind": "expr", "setup": "import pandas as pd\ndf = pd.DataFrame({'quando': ['2024-03-01 08:30', '2024-03-02 22:10', '2024-03-03 12:00', '2024-03-04 07:45', '2024-12-31 23:59'], 'valor': [120.0, 35.5, 80.0, 12.9, 300.0]}, index=[10, 11, 12, 13, 14])\ndf['quando'] = pd.to_datetime(df['quando'])\nr = atributos_de_data(df, 'quando')", "expr": "r['dia_semana'].tolist()", "expected": [4, 5, 6, 0, 1], "name": "Funciona também com uma coluna que já é datetime"},
  {"id": "df-intacto", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\ndf = pd.DataFrame({'quando': ['2024-03-01 08:30', '2024-03-02 22:10', '2024-03-03 12:00', '2024-03-04 07:45', '2024-12-31 23:59'], 'valor': [120.0, 35.5, 80.0, 12.9, 300.0]}, index=[10, 11, 12, 13, 14])\nr = atributos_de_data(df, 'quando')", "expr": "[df.columns.tolist(), str(df['quando'].dtype)]", "expected": [["quando", "valor"], "str"], "name": "O df recebido não muda"}
]
```

### Soluções erradas
```python name="dia do mês no lugar do dia da semana"
import pandas as pd


def atributos_de_data(df, coluna):
    datas = pd.to_datetime(df[coluna])
    return pd.DataFrame({
        "dia_semana": datas.dt.day.astype("int64"),
        "fim_de_semana": datas.dt.dayofweek >= 5,
        "mes": datas.dt.month.astype("int64"),
        "hora": datas.dt.hour.astype("int64"),
    }, index=df.index)
```
```python name="só o domingo é fim de semana"
import pandas as pd


def atributos_de_data(df, coluna):
    datas = pd.to_datetime(df[coluna])
    return pd.DataFrame({
        "dia_semana": datas.dt.dayofweek.astype("int64"),
        "fim_de_semana": datas.dt.dayofweek > 5,
        "mes": datas.dt.month.astype("int64"),
        "hora": datas.dt.hour.astype("int64"),
    }, index=df.index)
```
```python name="domingo como dia 0"
import pandas as pd


def atributos_de_data(df, coluna):
    datas = pd.to_datetime(df[coluna])
    return pd.DataFrame({
        "dia_semana": datas.dt.dayofweek.astype("int64"),
        "fim_de_semana": datas.dt.dayofweek.isin([0, 6]),
        "mes": datas.dt.month.astype("int64"),
        "hora": datas.dt.hour.astype("int64"),
    }, index=df.index)
```
```python name="mês em int32"
import pandas as pd


def atributos_de_data(df, coluna):
    datas = pd.to_datetime(df[coluna])
    return pd.DataFrame({
        "dia_semana": datas.dt.dayofweek.astype("int64"),
        "fim_de_semana": datas.dt.dayofweek >= 5,
        "mes": datas.dt.month.astype("int32"),
        "hora": datas.dt.hour.astype("int64"),
    }, index=df.index)
```
```python name="fim de semana como 0 e 1"
import pandas as pd


def atributos_de_data(df, coluna):
    datas = pd.to_datetime(df[coluna])
    return pd.DataFrame({
        "dia_semana": datas.dt.dayofweek.astype("int64"),
        "fim_de_semana": (datas.dt.dayofweek >= 5).astype("int64"),
        "mes": datas.dt.month.astype("int64"),
        "hora": datas.dt.hour.astype("int64"),
    }, index=df.index)
```

## Passo 4 · Leitura · Target encoding sem vazamento

Uma coluna categórica com poucos valores vira colunas com o one-hot do módulo 4. Com **alta cardinalidade** (a loja entre 300, o bairro entre 900, o modelo do aparelho entre milhares) o one-hot cria centenas de colunas quase vazias, e as categorias raras quase não têm exemplos. O **target encoding** troca cada categoria por um número só: a média do alvo nas linhas daquela categoria. Para categorias com poucas linhas, a média é puxada para a média geral $\bar y$ com uma **suavização** $m$:

$$
\text{enc}(c) = \frac{n_c\, \bar y_c + m\, \bar y}{n_c + m}
$$

com $n_c$ linhas da categoria e $\bar y_c$ a média do alvo nelas. Uma categoria com 2 linhas e $m = 10$ fica quase na média geral; uma com 2 000 linhas fica com a própria média.

A versão ingênua calcula essa média com **todas** as linhas e depois codifica as mesmas linhas. Cada linha ajudou a calcular o próprio código: o alvo dela está dentro do atributo. Numa categoria com uma linha só e $m = 0$, o código **é** o alvo. O modelo aprende a confiar no atributo, a validação feita depois concorda (o vazamento já aconteceu), e em dados novos o atributo vale muito menos.

A correção é a mesma ideia da validação cruzada: dividir as linhas em $k$ partições e codificar cada linha só com as estatísticas das **outras** partições (*out-of-fold*). Uma categoria que não aparece nas outras partições recebe a média geral delas.

```python
from sklearn.preprocessing import TargetEncoder

te = TargetEncoder(smooth=10.0, cv=5, shuffle=True, random_state=0, target_type="continuous")
X_treino_cod = te.fit_transform(X_treino[["loja"]], y_treino)   # out-of-fold, partição a partição
X_teste_cod = te.transform(X_teste[["loja"]])                   # médias de todo o treino
```

O `TargetEncoder` do scikit-learn faz isso **dentro do `fit_transform`**, e por isso `fit_transform(X, y)` **não** é igual a `fit(X, y).transform(X)`: o segundo codifica o treino com as médias do treino inteiro, a versão ingênua. Num `Pipeline` isso acontece sozinho, porque o pipeline chama `fit_transform` no treino e `transform` no resto. Com `target_type="continuous"` as partições são de um `KFold`; com um alvo binário e o padrão `"auto"`, de um `StratifiedKFold`. O `smooth="auto"` estima $m$ a partir da variância dos dados.

## Passo 5 · Exercício · Target encoding com folds

Escreva o target encoding *out-of-fold* do zero, com suavização.

### Instruções
1. `target_encoding_com_folds(categorias, y, k, suavizacao, semente)` divide as linhas com `KFold(n_splits=k, shuffle=True, random_state=semente)`. Cada linha de uma partição é codificada **só com as linhas das outras partições**: com $n_c$ e $\bar y_c$ calculados nessas linhas e $\bar y$ a média do alvo nelas, o código é $(n_c \bar y_c + m \bar y) / (n_c + m)$, com $m$ = `suavizacao`.
2. Uma categoria que não aparece nas outras partições recebe $\bar y$, a média geral das outras partições.
3. Devolve um array `float` com um código por linha, na ordem das linhas recebidas.

### Código inicial
```python
import numpy as np
from sklearn.model_selection import KFold


def target_encoding_com_folds(categorias, y, k, suavizacao, semente):
    pass
```

### Solução
```python
import numpy as np
from sklearn.model_selection import KFold


def target_encoding_com_folds(categorias, y, k, suavizacao, semente):
    categorias = np.asarray(categorias)
    y = np.asarray(y, dtype=float)
    codigos = np.zeros(len(y))
    for treino, outra in KFold(n_splits=k, shuffle=True, random_state=semente).split(categorias):
        media_geral = y[treino].mean()
        for c in np.unique(categorias[outra]):
            linhas = y[treino][categorias[treino] == c]
            n = len(linhas)
            soma = linhas.sum()
            codigos[outra[categorias[outra] == c]] = (soma + suavizacao * media_geral) / (n + suavizacao)
    return codigos
```

### Dicas
1. O `split` do `KFold` devolve, em cada volta, as posições "de fora" (que fornecem as médias) e as posições a codificar.
2. O $n_c \bar y_c$ é a soma do alvo da categoria nas outras partições; com zero linhas, a soma e a contagem são zero.
3. Uma máscara `categorias[outra] == c` aplicada às posições `outra` dá as posições do array de saída que recebem o mesmo código.

### Verificação
```json
[
  {"id": "pequeno", "checkpoint": 1, "kind": "expr", "expr": "target_encoding_com_folds(['a', 'a', 'b', 'b', 'b', 'c'], [1, 0, 1, 1, 0, 1], 3, 1.0, 0).tolist()", "expected": [0.375, 0.875, 0.5, 0.5833333333333334, 0.9166666666666666, 0.5], "tolerance": 1e-09, "name": "Seis linhas, 3 partições, m = 1, semente 0", "hint": "Cada linha recebe (soma do alvo da categoria nas outras partições + m · média geral das outras partições) / (contagem + m)."},
  {"id": "igual-ao-sklearn", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(3)\ncats = rng.choice(np.array(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']), 60)\ntaxa = {'a': 0.1, 'b': 0.2, 'c': 0.5, 'd': 0.5, 'e': 0.7, 'f': 0.9, 'g': 0.3, 'h': 0.6}\ny = (rng.random(60) < np.array([taxa[c] for c in cats])).astype(int)\nfrom sklearn.preprocessing import TargetEncoder\nref = TargetEncoder(smooth=5.0, cv=5, shuffle=True, random_state=0, target_type='continuous').fit_transform(cats.reshape(-1, 1), y.astype(float)).ravel()\nr = target_encoding_com_folds(cats, y, 5, 5.0, 0)", "expr": "bool(np.abs(np.asarray(r) - ref).max() < 1e-9)", "expected": true, "name": "60 linhas, 8 categorias: os mesmos códigos do TargetEncoder(smooth=5, cv=5, shuffle=True, random_state=0)", "hint": "Compara-se com o fit_transform do TargetEncoder com target_type=\"continuous\", que usa KFold(5, shuffle=True, random_state=semente)."},
  {"id": "sem-o-proprio-alvo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(3)\ncats = rng.choice(np.array(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']), 60)\ntaxa = {'a': 0.1, 'b': 0.2, 'c': 0.5, 'd': 0.5, 'e': 0.7, 'f': 0.9, 'g': 0.3, 'h': 0.6}\ny = (rng.random(60) < np.array([taxa[c] for c in cats])).astype(int)\ny2 = y.copy()\ny2[7] = 1 - y2[7]\na = np.asarray(target_encoding_com_folds(cats, y, 5, 2.0, 1))\nb = np.asarray(target_encoding_com_folds(cats, y2, 5, 2.0, 1))", "expr": "bool(a[7] == b[7])", "expected": true, "name": "Trocar o alvo de uma linha não muda o código dessa mesma linha", "hint": "O código de uma linha só pode usar as linhas das outras partições."},
  {"id": "categoria-rara", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\ncats = np.array(['x', 'x', 'y', 'y', 'y', 'z'])\ny = np.array([1, 0, 1, 1, 0, 1])\nr = target_encoding_com_folds(cats, y, 6, 3.0, 0)", "expr": "float(r[5])", "expected": 0.6, "tolerance": 1e-09, "name": "Uma categoria ausente das outras partições recebe a média geral delas", "hint": "Sem nenhuma linha da categoria, a fórmula fica (0 + m · média) / (0 + m)."},
  {"id": "suavizacao-grande", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(3)\ncats = rng.choice(np.array(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']), 60)\ntaxa = {'a': 0.1, 'b': 0.2, 'c': 0.5, 'd': 0.5, 'e': 0.7, 'f': 0.9, 'g': 0.3, 'h': 0.6}\ny = (rng.random(60) < np.array([taxa[c] for c in cats])).astype(int)\nr = np.asarray(target_encoding_com_folds(cats, y, 5, 1e9, 0))", "expr": "len(np.unique(r.round(6))) <= 5", "expected": true, "name": "Com m enorme, a categoria deixa de importar: cada partição recebe um só código, a média das outras", "hint": "Com m muito maior que a contagem, a fórmula fica dominada por m · média geral das outras partições."},
  {"id": "sem-suavizacao", "checkpoint": 2, "kind": "expr", "expr": "target_encoding_com_folds(['a', 'a', 'a', 'b', 'b', 'b'], [1, 1, 0, 0, 0, 1], 3, 0.0, 2).tolist()", "expected": [0.5, 0.5, 1.0, 0.5, 0.5, 0.0], "tolerance": 1e-09, "name": "Com m = 0, cada código é a média do alvo da categoria nas outras partições"},
  {"id": "semente", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(3)\ncats = rng.choice(np.array(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']), 60)\ntaxa = {'a': 0.1, 'b': 0.2, 'c': 0.5, 'd': 0.5, 'e': 0.7, 'f': 0.9, 'g': 0.3, 'h': 0.6}\ny = (rng.random(60) < np.array([taxa[c] for c in cats])).astype(int)\n", "expr": "[target_encoding_com_folds(cats, y, 5, 2.0, 4).tolist() == target_encoding_com_folds(cats, y, 5, 2.0, 4).tolist(), target_encoding_com_folds(cats, y, 5, 2.0, 4).tolist() == target_encoding_com_folds(cats, y, 5, 2.0, 5).tolist()]", "expected": [true, false], "name": "A mesma semente repete as partições; outra semente muda os códigos", "hint": "As partições vêm de um KFold embaralhado com random_state=semente."},
  {"id": "formato", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(3)\ncats = rng.choice(np.array(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']), 60)\ntaxa = {'a': 0.1, 'b': 0.2, 'c': 0.5, 'd': 0.5, 'e': 0.7, 'f': 0.9, 'g': 0.3, 'h': 0.6}\ny = (rng.random(60) < np.array([taxa[c] for c in cats])).astype(int)\nr = target_encoding_com_folds(cats, y, 5, 2.0, 0)", "expr": "[type(r).__name__, str(r.dtype), list(r.shape)]", "expected": ["ndarray", "float64", [60]], "name": "Devolve um array float com um código por linha"}
]
```

### Soluções erradas
```python name="média com todas as linhas"
import numpy as np
from sklearn.model_selection import KFold


def target_encoding_com_folds(categorias, y, k, suavizacao, semente):
    categorias = np.asarray(categorias)
    y = np.asarray(y, dtype=float)
    codigos = np.zeros(len(y))
    media_geral = y.mean()
    for c in np.unique(categorias):
        linhas = y[categorias == c]
        codigos[categorias == c] = (linhas.sum() + suavizacao * media_geral) / (len(linhas) + suavizacao)
    return codigos
```
```python name="ignora a suavização"
import numpy as np
from sklearn.model_selection import KFold


def target_encoding_com_folds(categorias, y, k, suavizacao, semente):
    categorias = np.asarray(categorias)
    y = np.asarray(y, dtype=float)
    codigos = np.zeros(len(y))
    for treino, outra in KFold(n_splits=k, shuffle=True, random_state=semente).split(categorias):
        media_geral = y[treino].mean()
        for c in np.unique(categorias[outra]):
            linhas = y[treino][categorias[treino] == c]
            n = len(linhas)
            soma = linhas.sum()
            codigos[outra[categorias[outra] == c]] = soma / n if n > 0 else media_geral
    return codigos
```
```python name="média geral de todas as linhas"
import numpy as np
from sklearn.model_selection import KFold


def target_encoding_com_folds(categorias, y, k, suavizacao, semente):
    categorias = np.asarray(categorias)
    y = np.asarray(y, dtype=float)
    codigos = np.zeros(len(y))
    for treino, outra in KFold(n_splits=k, shuffle=True, random_state=semente).split(categorias):
        media_geral = y.mean()
        for c in np.unique(categorias[outra]):
            linhas = y[treino][categorias[treino] == c]
            n = len(linhas)
            soma = linhas.sum()
            codigos[outra[categorias[outra] == c]] = (soma + suavizacao * media_geral) / (n + suavizacao)
    return codigos
```
```python name="partições sem embaralhar"
import numpy as np
from sklearn.model_selection import KFold


def target_encoding_com_folds(categorias, y, k, suavizacao, semente):
    categorias = np.asarray(categorias)
    y = np.asarray(y, dtype=float)
    codigos = np.zeros(len(y))
    for treino, outra in KFold(n_splits=k).split(categorias):
        media_geral = y[treino].mean()
        for c in np.unique(categorias[outra]):
            linhas = y[treino][categorias[treino] == c]
            n = len(linhas)
            soma = linhas.sum()
            codigos[outra[categorias[outra] == c]] = (soma + suavizacao * media_geral) / (n + suavizacao)
    return codigos
```
```python name="categoria ausente vira zero"
import numpy as np
from sklearn.model_selection import KFold


def target_encoding_com_folds(categorias, y, k, suavizacao, semente):
    categorias = np.asarray(categorias)
    y = np.asarray(y, dtype=float)
    codigos = np.zeros(len(y))
    for treino, outra in KFold(n_splits=k, shuffle=True, random_state=semente).split(categorias):
        media_geral = y[treino].mean()
        for c in np.unique(categorias[outra]):
            linhas = y[treino][categorias[treino] == c]
            n = len(linhas)
            soma = linhas.sum()
            codigos[outra[categorias[outra] == c]] = (soma + suavizacao * media_geral) / (n + suavizacao) if n > 0 else 0.0
    return codigos
```
```python name="semente fixa"
import numpy as np
from sklearn.model_selection import KFold


def target_encoding_com_folds(categorias, y, k, suavizacao, semente):
    categorias = np.asarray(categorias)
    y = np.asarray(y, dtype=float)
    codigos = np.zeros(len(y))
    for treino, outra in KFold(n_splits=k, shuffle=True, random_state=0).split(categorias):
        media_geral = y[treino].mean()
        for c in np.unique(categorias[outra]):
            linhas = y[treino][categorias[treino] == c]
            n = len(linhas)
            soma = linhas.sum()
            codigos[outra[categorias[outra] == c]] = (soma + suavizacao * media_geral) / (n + suavizacao)
    return codigos
```
```python name="suavização só no numerador"
import numpy as np
from sklearn.model_selection import KFold


def target_encoding_com_folds(categorias, y, k, suavizacao, semente):
    categorias = np.asarray(categorias)
    y = np.asarray(y, dtype=float)
    codigos = np.zeros(len(y))
    for treino, outra in KFold(n_splits=k, shuffle=True, random_state=semente).split(categorias):
        media_geral = y[treino].mean()
        for c in np.unique(categorias[outra]):
            linhas = y[treino][categorias[treino] == c]
            n = len(linhas)
            soma = linhas.sum()
            codigos[outra[categorias[outra] == c]] = (soma + suavizacao * media_geral) / max(n, 1)
    return codigos
```

## Passo 6 · Leitura · Seleção de atributos

Criar atributos é fácil; o difícil é não se enganar com eles. Cada coluna nova pode melhorar o modelo, piorar (mais ruído para ajustar) ou parecer melhorar por acaso. Duas regras evitam a maior parte dos enganos. A primeira: medir o **ganho** com validação cruzada, comparando o modelo com e sem a coluna **nas mesmas partições**, para a diferença não misturar o efeito da coluna com o acaso da divisão. A segunda: toda escolha de colunas que olha o alvo acontece **dentro** de cada partição, como a seleção da lição 1.

Os métodos de seleção caem em três famílias:

- **Filtro:** pontua cada coluna sozinha, sem modelo (`SelectKBest` com `f_classif` ou `mutual_info_classif`). É rápido e não vê interações: uma coluna que só ajuda combinada com outra sai com nota baixa.
- **Embutido:** usa o que o próprio modelo aprendeu. O lasso da m2-05 zera coeficientes; uma floresta dá importâncias. O `SelectFromModel(estimador, threshold=...)` guarda as colunas acima de um limiar.
- **Por eliminação recursiva:** o `RFE` ajusta o modelo, descarta a coluna menos importante (menor $|w_j|$ numa logística com colunas padronizadas) e repete. O `RFECV` escolhe **quantas** colunas manter pela validação cruzada: ajusta o modelo para cada número de colunas em cada partição e guarda o número com a melhor nota média.

```python
from sklearn.feature_selection import RFECV

rfecv = RFECV(LogisticRegression(), step=1, cv=StratifiedKFold(3, shuffle=True, random_state=0), scoring="roc_auc")
rfecv.fit(X_padronizado, y)
rfecv.n_features_         # quantas colunas ficaram
rfecv.support_            # máscara booleana: True nas colunas mantidas
rfecv.ranking_            # 1 nas mantidas; 2, 3... na ordem inversa de eliminação
```

O custo cresce rápido: com $d$ colunas, `step=1` e $k$ partições, o `RFECV` faz da ordem de $d \cdot k$ ajustes. E ele próprio é uma escolha que olha o alvo: a nota do `RFECV.cv_results_` é otimista para o modelo final, como o melhor resultado de uma busca de hiperparâmetros. Para relatar o desempenho, ponha a seleção dentro do pipeline e avalie com outra validação por fora.

Engenharia de atributos merece ser automatizada no que é mecânico (as mesmas transformações para treino e produção, num pipeline) e manual no que exige conhecer o problema: decidir que a razão dívida/renda faz sentido, ou que uma coluna só existe depois do desfecho.

## Passo 7 · Exercício · Ganho e seleção

Escreva a medida de ganho de um atributo novo e a seleção de colunas pelo `RFECV`. O arquivo `clientes.py` gera clientes fictícios de uma financeira inventada, cujo atraso depende da razão entre dívida e renda. Os casos medem o ganho da razão numa árvore de profundidade 3, que sem ela precisa imitar a fronteira diagonal com degraus.

### Instruções
1. `ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente)` recebe um `DataFrame` `X` e uma `Series` `coluna_nova` (com `name`), monta uma **cópia** de `X` com a coluna nova acrescentada e mede a AUC média (`cross_val_score` com `scoring="roc_auc"`) de um `clone(pipeline)` sem e com a coluna, **nas mesmas partições** de um `StratifiedKFold(n_splits=k, shuffle=True, random_state=semente)`.
2. Devolve `{"sem": float, "com": float, "ganho": com - sem}`, sem alterar o `X` nem ajustar o `pipeline` recebidos.
3. `selecionar_rfecv(X, y, semente)` ajusta um `RFECV(LogisticRegression(), step=1, cv=StratifiedKFold(n_splits=3, shuffle=True, random_state=semente), scoring="roc_auc")` e devolve a lista das posições das colunas mantidas, em ordem crescente.

### Código inicial
```python
import numpy as np
from sklearn.base import clone
from sklearn.feature_selection import RFECV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from clientes import gerar_clientes


def ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente):
    pass


def selecionar_rfecv(X, y, semente):
    pass
```
```python path=clientes.py
import numpy as np
import pandas as pd


def gerar_clientes(n, semente):
    rng = np.random.default_rng(semente)
    renda = (rng.gamma(4.0, 1.2, n) + 0.5).round(2)
    divida = (renda * rng.uniform(0.05, 1.2, n)).round(2)
    idade = rng.integers(20, 70, n)
    z = -1.0 + 5.0 * (divida / renda - 0.6) - 0.01 * (idade - 45)
    atrasou = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
    return pd.DataFrame({"renda": renda, "divida": divida, "idade": idade}), atrasou
```

### Solução
```python
import numpy as np
from sklearn.base import clone
from sklearn.feature_selection import RFECV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from clientes import gerar_clientes


def ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente):
    X_com = X.copy()
    X_com[coluna_nova.name] = coluna_nova
    cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=semente)
    sem = float(cross_val_score(clone(pipeline), X, y, cv=cv, scoring="roc_auc").mean())
    com = float(cross_val_score(clone(pipeline), X_com, y, cv=cv, scoring="roc_auc").mean())
    return {"sem": sem, "com": com, "ganho": com - sem}


def selecionar_rfecv(X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    rfecv = RFECV(LogisticRegression(), step=1, cv=cv, scoring="roc_auc").fit(X, y)
    return np.flatnonzero(rfecv.support_).tolist()
```
```python path=clientes.py
import numpy as np
import pandas as pd


def gerar_clientes(n, semente):
    rng = np.random.default_rng(semente)
    renda = (rng.gamma(4.0, 1.2, n) + 0.5).round(2)
    divida = (renda * rng.uniform(0.05, 1.2, n)).round(2)
    idade = rng.integers(20, 70, n)
    z = -1.0 + 5.0 * (divida / renda - 0.6) - 0.01 * (idade - 45)
    atrasou = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(int)
    return pd.DataFrame({"renda": renda, "divida": divida, "idade": idade}), atrasou
```

### Dicas
1. O `X.copy()` cria a tabela nova; atribuir `X_com[nome] = serie` acrescenta a coluna só nela.
2. Um mesmo objeto `StratifiedKFold` com `random_state` produz as mesmas partições nas duas chamadas do `cross_val_score`.
3. O `support_` do `RFECV` é uma máscara booleana; o `np.flatnonzero` devolve as posições dos `True`.

### Verificação
```json
[
  {"id": "ganho-razao", "checkpoint": 1, "kind": "expr", "setup": "from clientes import gerar_clientes\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.tree import DecisionTreeClassifier\nX, y = gerar_clientes(400, 6)\nrazao = (X['divida'] / X['renda']).rename('razao')\npipe = make_pipeline(DecisionTreeClassifier(max_depth=3, random_state=0))\nr = ganho_de_atributo(pipe, X, y, razao, 5, 0)", "expr": "[round(r['sem'], 9), round(r['com'], 9)]", "expected": [0.721684483, 0.775926646], "tolerance": 1e-09, "name": "400 clientes, árvore de profundidade 3, 5 partições, semente 0: a AUC sem e com a razão dívida/renda", "hint": "As duas avaliações usam o mesmo StratifiedKFold embaralhado com a semente e scoring=\"roc_auc\"."},
  {"id": "ganho-positivo", "checkpoint": 2, "kind": "expr", "setup": "from clientes import gerar_clientes\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.tree import DecisionTreeClassifier\nX, y = gerar_clientes(400, 6)\nrazao = (X['divida'] / X['renda']).rename('razao')\npipe = make_pipeline(DecisionTreeClassifier(max_depth=3, random_state=0))\nr = ganho_de_atributo(pipe, X, y, razao, 5, 0)", "expr": "[bool(r['ganho'] > 0.02), abs(r['ganho'] - (r['com'] - r['sem'])) < 1e-12]", "expected": [true, true], "name": "O ganho é com menos sem, e a razão ajuda", "hint": "Ganho positivo quer dizer que o modelo melhorou com a coluna nova."},
  {"id": "ruido", "checkpoint": 2, "kind": "expr", "setup": "from clientes import gerar_clientes\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.tree import DecisionTreeClassifier\nX, y = gerar_clientes(400, 6)\nrazao = (X['divida'] / X['renda']).rename('razao')\npipe = make_pipeline(DecisionTreeClassifier(max_depth=3, random_state=0))\nimport numpy as np\nimport pandas as pd\nruido = pd.Series(np.random.default_rng(0).normal(size=len(X)), index=X.index, name='ruido')\nr = ganho_de_atributo(pipe, X, y, ruido, 5, 0)", "expr": "round(r['ganho'], 9)", "expected": -0.000419287, "tolerance": 1e-09, "name": "Uma coluna de ruído quase não muda a AUC"},
  {"id": "x-intacto", "checkpoint": 1, "kind": "expr", "setup": "from clientes import gerar_clientes\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.tree import DecisionTreeClassifier\nX, y = gerar_clientes(400, 6)\nrazao = (X['divida'] / X['renda']).rename('razao')\npipe = make_pipeline(DecisionTreeClassifier(max_depth=3, random_state=0))\nr = ganho_de_atributo(pipe, X, y, razao, 5, 0)", "expr": "X.columns.tolist()", "expected": ["renda", "divida", "idade"], "name": "O X recebido não ganha a coluna nova", "hint": "Acrescente a coluna numa cópia de X."},
  {"id": "pipeline-intacto", "checkpoint": 1, "kind": "expr", "setup": "from clientes import gerar_clientes\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.tree import DecisionTreeClassifier\nX, y = gerar_clientes(400, 6)\nrazao = (X['divida'] / X['renda']).rename('razao')\npipe = make_pipeline(DecisionTreeClassifier(max_depth=3, random_state=0))\nr = ganho_de_atributo(pipe, X, y, razao, 3, 1)", "expr": "hasattr(pipe[-1], 'tree_')", "expected": false, "name": "O pipeline recebido não é ajustado: cada avaliação usa um clone"},
  {"id": "rfecv", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(12)\nX = rng.normal(size=(150, 8))\nz = 1.5 * X[:, 0] - 1.2 * X[:, 3] + 1.0 * X[:, 5]\ny = (z + rng.normal(0, 1, 150) > 0).astype(int)\nr = selecionar_rfecv(X, y, 0)", "expr": "r", "expected": [0, 3, 5], "name": "8 colunas, 3 informativas: as colunas que o RFECV mantém", "hint": "Devolva as posições das colunas mantidas (support_), em ordem crescente."},
  {"id": "rfecv-referencia", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(12)\nX = rng.normal(size=(150, 8))\nz = 1.5 * X[:, 0] - 1.2 * X[:, 3] + 1.0 * X[:, 5]\ny = (z + rng.normal(0, 1, 150) > 0).astype(int)\nfrom sklearn.feature_selection import RFECV\nfrom sklearn.linear_model import LogisticRegression\nfrom sklearn.model_selection import StratifiedKFold\nref = RFECV(LogisticRegression(), step=1, cv=StratifiedKFold(3, shuffle=True, random_state=2), scoring='roc_auc').fit(X[:90], y[:90])\nr = selecionar_rfecv(X[:90], y[:90], 2)", "expr": "r == np.flatnonzero(ref.support_).tolist()", "expected": true, "name": "90 linhas, semente 2: a mesma seleção do RFECV de referência", "hint": "O RFECV usa uma LogisticRegression(), step=1, scoring=\"roc_auc\" e StratifiedKFold(3, shuffle=True, random_state=semente)."},
  {"id": "rfecv-tipo", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(12)\nX = rng.normal(size=(150, 8))\nz = 1.5 * X[:, 0] - 1.2 * X[:, 3] + 1.0 * X[:, 5]\ny = (z + rng.normal(0, 1, 150) > 0).astype(int)\nr = selecionar_rfecv(X, y, 0)", "expr": "[type(r).__name__, all(type(i) is int for i in r)]", "expected": ["list", true], "name": "Devolve uma lista de inteiros"}
]
```

### Soluções erradas
```python name="ganho com o sinal trocado"
import numpy as np
from sklearn.base import clone
from sklearn.feature_selection import RFECV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from clientes import gerar_clientes


def ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente):
    X_com = X.copy()
    X_com[coluna_nova.name] = coluna_nova
    cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=semente)
    sem = float(cross_val_score(clone(pipeline), X, y, cv=cv, scoring="roc_auc").mean())
    com = float(cross_val_score(clone(pipeline), X_com, y, cv=cv, scoring="roc_auc").mean())
    return {"sem": sem, "com": com, "ganho": sem - com}


def selecionar_rfecv(X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    rfecv = RFECV(LogisticRegression(), step=1, cv=cv, scoring="roc_auc").fit(X, y)
    return np.flatnonzero(rfecv.support_).tolist()
```
```python name="acrescenta a coluna no X recebido"
import numpy as np
from sklearn.base import clone
from sklearn.feature_selection import RFECV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from clientes import gerar_clientes


def ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente):
    X_com = X
    X_com[coluna_nova.name] = coluna_nova
    cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=semente)
    sem = float(cross_val_score(clone(pipeline), X.drop(columns=coluna_nova.name), y, cv=cv, scoring="roc_auc").mean())
    com = float(cross_val_score(clone(pipeline), X_com, y, cv=cv, scoring="roc_auc").mean())
    return {"sem": sem, "com": com, "ganho": com - sem}


def selecionar_rfecv(X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    rfecv = RFECV(LogisticRegression(), step=1, cv=cv, scoring="roc_auc").fit(X, y)
    return np.flatnonzero(rfecv.support_).tolist()
```
```python name="partições diferentes nas duas medidas"
import numpy as np
from sklearn.base import clone
from sklearn.feature_selection import RFECV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from clientes import gerar_clientes


def ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente):
    X_com = X.copy()
    X_com[coluna_nova.name] = coluna_nova
    cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=semente)
    sem = float(cross_val_score(clone(pipeline), X, y, cv=cv, scoring="roc_auc").mean())
    com = float(cross_val_score(clone(pipeline), X_com, y, cv=k, scoring="roc_auc").mean())
    return {"sem": sem, "com": com, "ganho": com - sem}


def selecionar_rfecv(X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    rfecv = RFECV(LogisticRegression(), step=1, cv=cv, scoring="roc_auc").fit(X, y)
    return np.flatnonzero(rfecv.support_).tolist()
```
```python name="ajusta o pipeline recebido"
import numpy as np
from sklearn.base import clone
from sklearn.feature_selection import RFECV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from clientes import gerar_clientes


def ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente):
    X_com = X.copy()
    X_com[coluna_nova.name] = coluna_nova
    cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=semente)
    sem = float(cross_val_score(pipeline.fit(X, y), X, y, cv=cv, scoring="roc_auc").mean())
    com = float(cross_val_score(clone(pipeline), X_com, y, cv=cv, scoring="roc_auc").mean())
    return {"sem": sem, "com": com, "ganho": com - sem}


def selecionar_rfecv(X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    rfecv = RFECV(LogisticRegression(), step=1, cv=cv, scoring="roc_auc").fit(X, y)
    return np.flatnonzero(rfecv.support_).tolist()
```
```python name="acurácia no lugar da AUC"
import numpy as np
from sklearn.base import clone
from sklearn.feature_selection import RFECV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from clientes import gerar_clientes


def ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente):
    X_com = X.copy()
    X_com[coluna_nova.name] = coluna_nova
    cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=semente)
    sem = float(cross_val_score(clone(pipeline), X, y, cv=cv, scoring="accuracy").mean())
    com = float(cross_val_score(clone(pipeline), X_com, y, cv=cv, scoring="accuracy").mean())
    return {"sem": sem, "com": com, "ganho": com - sem}


def selecionar_rfecv(X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    rfecv = RFECV(LogisticRegression(), step=1, cv=cv, scoring="roc_auc").fit(X, y)
    return np.flatnonzero(rfecv.support_).tolist()
```
```python name="devolve a máscara do RFECV"
import numpy as np
from sklearn.base import clone
from sklearn.feature_selection import RFECV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from clientes import gerar_clientes


def ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente):
    X_com = X.copy()
    X_com[coluna_nova.name] = coluna_nova
    cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=semente)
    sem = float(cross_val_score(clone(pipeline), X, y, cv=cv, scoring="roc_auc").mean())
    com = float(cross_val_score(clone(pipeline), X_com, y, cv=cv, scoring="roc_auc").mean())
    return {"sem": sem, "com": com, "ganho": com - sem}


def selecionar_rfecv(X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    rfecv = RFECV(LogisticRegression(), step=1, cv=cv, scoring="roc_auc").fit(X, y)
    return rfecv.support_.tolist()
```
```python name="devolve o ranking"
import numpy as np
from sklearn.base import clone
from sklearn.feature_selection import RFECV
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold, cross_val_score

from clientes import gerar_clientes


def ganho_de_atributo(pipeline, X, y, coluna_nova, k, semente):
    X_com = X.copy()
    X_com[coluna_nova.name] = coluna_nova
    cv = StratifiedKFold(n_splits=k, shuffle=True, random_state=semente)
    sem = float(cross_val_score(clone(pipeline), X, y, cv=cv, scoring="roc_auc").mean())
    com = float(cross_val_score(clone(pipeline), X_com, y, cv=cv, scoring="roc_auc").mean())
    return {"sem": sem, "com": com, "ganho": com - sem}


def selecionar_rfecv(X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    rfecv = RFECV(LogisticRegression(), step=1, cv=cv, scoring="roc_auc").fit(X, y)
    return rfecv.ranking_.tolist()
```

## Passo 8 · Quiz · Target encoding ingênuo

### Pergunta
Uma equipe codifica a coluna `loja` (380 lojas fictícias, muitas com menos de 5 vendas) assim, antes da validação cruzada:

```python
medias = df.groupby("loja")["devolveu"].mean()
df["loja_cod"] = df["loja"].map(medias)
cross_val_score(modelo, df[["loja_cod", "valor"]], df["devolveu"], cv=5, scoring="roc_auc")
```

A AUC sai 0,91; em produção, 0,64. Por quê?
- [ ] O `groupby` ordena as lojas, e a ordem embaralha os códigos
- [x] Cada linha ajudou a calcular o próprio código; nas lojas com poucas vendas, o código praticamente é o alvo da linha, e a validação cruzada feita depois herda o vazamento
- [ ] Faltou padronizar `loja_cod` antes do modelo
- [ ] A AUC é instável com 380 categorias; com a acurácia o resultado de produção seria igual
> Numa loja com uma venda, o código é exatamente o `devolveu` daquela venda. O `map` usa as médias pelo nome da loja, sem depender de ordem; padronizar não remove a informação do alvo; e trocar de métrica não corrige o vazamento. A correção é codificar cada linha só com as outras partições (o `TargetEncoder` dentro de um pipeline faz isso).

### Pergunta
Com o `TargetEncoder` do scikit-learn, o que acontece aqui?

```python
te = TargetEncoder(target_type="continuous", random_state=0)
a = te.fit_transform(X_treino[["loja"]], y_treino)
b = te.transform(X_treino[["loja"]])
```

- [ ] `a` e `b` são iguais: o `fit_transform` é só um atalho para `fit` seguido de `transform`
- [x] `a` é codificado partição a partição, cada linha sem o próprio alvo; `b` usa as médias do treino inteiro, a versão ingênua, e não deve alimentar o treino do modelo
- [ ] A segunda linha levanta erro, porque o `TargetEncoder` não tem `transform`
- [ ] `b` é a versão sem vazamento, porque o `transform` não recebe `y`
> O `TargetEncoder` é uma exceção à regra do módulo 4: o `fit_transform` faz o *cross fitting* internamente e devolve códigos *out-of-fold*. O `transform` existe e é o que se usa em dados novos (validação, teste, produção); aplicado às próprias linhas de treino, cada uma volta a influenciar o próprio código. Não receber `y` no `transform` não importa: as médias guardadas já contêm o alvo.

### Pergunta
Um colega testa 40 atributos novos, um de cada vez, com uma única divisão treino/teste, guarda os 12 que melhoraram a AUC de teste e relata a AUC final no mesmo teste. O que está errado?
- [ ] Nada: cada atributo foi avaliado em dados que o modelo não viu
- [ ] O certo seria guardar os atributos que pioraram, porque eles reduzem a variância
- [ ] O problema é só o número de atributos: com 10 testes o processo seria honesto
- [x] O teste virou critério de escolha: com 40 tentativas, alguns atributos melhoram por acaso naquela divisão, e a AUC relatada no mesmo teste fica otimista; a escolha deve usar validação cruzada no treino, e o teste só mede o resultado final
> Escolher pelo teste é ajustar ao acaso daquele conjunto, como escolher hiperparâmetros pelo teste. Menos tentativas reduzem o otimismo, mas não o eliminam; e guardar os atributos que pioraram não faz sentido. O ganho de cada atributo se mede na validação cruzada, nas mesmas partições, e o teste fica para o fim.
