---
slug: n4-m2-04-novas-colunas-e-apply
titulo: Novas colunas, apply, map e operações vetorizadas
descricao: Criar colunas derivadas, assign, apply por linha e por coluna, map com dicionário, np.where e pd.cut para faixas.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar colunas derivadas com operações vetorizadas e assign
- Usar map, apply e np.where para transformar valores e explicar o custo de apply por linha
- Discretizar valores em faixas com pd.cut e qcut
---

## Passo 1 · Leitura · Colunas derivadas

Uma loja virtual fictícia tem uma tabela de pedidos com preço unitário e quantidade, e o financeiro quer o total de cada pedido. Aritmética entre colunas vale linha a linha, como entre arrays do numpy:

```python
pedidos = pd.DataFrame({"preco": [10.0, 25.0, 4.0], "qtd": [3, 4, 5]})
pedidos["total"] = pedidos["preco"] * pedidos["qtd"]     # 30.0, 100.0, 20.0
```

A atribuição com colchetes cria a coluna **na própria tabela**. Dentro de uma função, isso altera a tabela de quem chamou. Quando a função deve devolver uma tabela nova, use `assign`, que copia e acrescenta:

```python
com_total = pedidos.assign(total=pedidos["preco"] * pedidos["qtd"])
```

O nome do argumento vira o nome da coluna, e `pedidos` continua como estava. Um `assign` aceita várias colunas de uma vez.

Para uma coluna que depende de uma condição, `np.where(condicao, valor_se_sim, valor_se_nao)` escolhe elemento a elemento, sem laço:

```python
frete_gratis = np.where(pedidos["preco"] * pedidos["qtd"] >= 50, 0.0, 12.0)
```

O resultado é um array do numpy, do tamanho da tabela; atribuído a uma coluna ou passado ao `assign`, ele entra na ordem das linhas.

Quando a nova coluna é uma tradução de valores (sigla do estado para região, código para nome), `Series.map(dicionario)` troca cada valor pelo que o dicionário associa a ele: `pedidos["uf"].map({"SP": "Sudeste", "BA": "Nordeste"})`. Existe também o `replace`, com o mesmo dicionário, e os dois **não** fazem a mesma coisa; a Previsão a seguir mostra a diferença.

`map` também aceita uma função, aplicada a cada valor da coluna, e `apply` faz o mesmo numa Series. Num DataFrame, `apply(f)` chama `f` uma vez por coluna e `apply(f, axis=1)` uma vez por linha, entregando a linha como Series. É flexível: qualquer `if` cabe dentro de `f`. É também a forma mais lenta, e a leitura do passo 6 mede quanto.

## Passo 2 · Previsão · map com chave ausente

Os pedidos vêm de três estados, mas o dicionário só tem dois. Leia sem executar e digite exatamente o que o programa imprime. Uma lista com `NaN` mostra `nan`.

### Código
```python
import pandas as pd

pedidos = pd.DataFrame({"uf": ["SP", "RJ", "AC", "SP"], "qtd": [3, 1, 4, 10]})
regiao = pedidos["uf"].map({"SP": "Sudeste", "RJ": "Sudeste"})
print(regiao.tolist())
print(regiao.isna().sum())
codigo = pedidos["uf"].map({"SP": 1, "RJ": 2})
print(codigo.tolist())
print(codigo.dtype)
print(pedidos["uf"].replace({"SP": "Sudeste"}).tolist())
print(pedidos.assign(dobro=pedidos["qtd"] * 2).columns.tolist())
print(pedidos.columns.tolist())
```

### Dicas
1. O `map` não deixa valor sem tradução como estava.
2. Um `NaN` no meio de números inteiros faz a coluna inteira mudar de tipo.
3. O `replace` só mexe no que está no dicionário; o `assign` devolve uma tabela nova.

### Saída esperada
```text
['Sudeste', 'Sudeste', nan, 'Sudeste']
1
[1.0, 2.0, nan, 1.0]
float64
['Sudeste', 'RJ', 'AC', 'Sudeste']
['uf', 'qtd', 'dobro']
['uf', 'qtd']
```

## Passo 3 · Exercício · Total e desconto
modo: lacunas

Pedidos com total a partir de um limite ganham desconto. Complete as lacunas (`___`) para devolver uma tabela nova com três colunas a mais.

### Instruções
1. `adicionar_total_e_desconto(df, limite, taxa)` devolve um DataFrame novo com as colunas de `df` (`produto`, `preco`, `qtd`) e mais `total`, `desconto` e `a_pagar`, nessa ordem; `df` não muda.
2. `total` é `preco * qtd`.
3. `desconto` é `total * taxa` quando o total é maior ou igual a `limite`, e `0.0` nos outros pedidos.
4. `a_pagar` é `total - desconto`.

### Código inicial
```python
import numpy as np
import pandas as pd


def adicionar_total_e_desconto(df, limite, taxa):
    novo = df.assign(total=___)
    desconto = np.where(___, novo["total"] * taxa, ___)
    return novo.assign(desconto=desconto, a_pagar=___)
```

### Solução
```python
import numpy as np
import pandas as pd


def adicionar_total_e_desconto(df, limite, taxa):
    novo = df.assign(total=df["preco"] * df["qtd"])
    desconto = np.where(novo["total"] >= limite, novo["total"] * taxa, 0.0)
    return novo.assign(desconto=desconto, a_pagar=novo["total"] - desconto)
```

### Dicas
1. O limite vale para o total do pedido, não para o preço unitário.
2. O terceiro argumento do `np.where` é o valor de quem **não** atende à condição.
3. Quem não ganhou desconto paga o total inteiro.

### Verificação
```json
[
  { "id": "colunas", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"produto\": [\"caneca\", \"mochila\", \"caneta\", \"luminária\"], \"preco\": [10.0, 25.0, 4.0, 50.0], \"qtd\": [3, 4, 5, 2]}, index=[5, 6, 7, 8])",
    "expr": "list(adicionar_total_e_desconto(D, 100, 0.1).columns)", "expected": ["produto", "preco", "qtd", "total", "desconto", "a_pagar"],
    "name": "As três colunas novas, depois das originais" },
  { "id": "total", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"produto\": [\"caneca\", \"mochila\", \"caneta\", \"luminária\"], \"preco\": [10.0, 25.0, 4.0, 50.0], \"qtd\": [3, 4, 5, 2]}, index=[5, 6, 7, 8])",
    "expr": "adicionar_total_e_desconto(D, 100, 0.1)[\"total\"].tolist()", "expected": [30.0, 100.0, 20.0, 100.0], "tolerance": 1e-9,
    "name": "Total de cada pedido" },
  { "id": "desconto", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"produto\": [\"caneca\", \"mochila\", \"caneta\", \"luminária\"], \"preco\": [10.0, 25.0, 4.0, 50.0], \"qtd\": [3, 4, 5, 2]}, index=[5, 6, 7, 8])",
    "expr": "adicionar_total_e_desconto(D, 100, 0.1)[\"desconto\"].tolist()", "expected": [0.0, 10.0, 0.0, 10.0], "tolerance": 1e-9,
    "name": "Total exatamente no limite ganha desconto", "hint": "Maior ou igual ao limite." },
  { "id": "desconto-preco", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"produto\": [\"caneca\", \"mochila\", \"caneta\", \"luminária\"], \"preco\": [10.0, 25.0, 4.0, 50.0], \"qtd\": [3, 4, 5, 2]}, index=[5, 6, 7, 8])",
    "expr": "adicionar_total_e_desconto(D, 30, 0.5)[\"desconto\"].tolist()", "expected": [15.0, 50.0, 0.0, 50.0], "tolerance": 1e-9,
    "name": "Limite 30: a caneca entra pelo total, mesmo com preço 10", "hint": "Compare o limite com o total." },
  { "id": "sem-desconto", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"produto\": [\"caneca\", \"mochila\", \"caneta\", \"luminária\"], \"preco\": [10.0, 25.0, 4.0, 50.0], \"qtd\": [3, 4, 5, 2]}, index=[5, 6, 7, 8])",
    "expr": "adicionar_total_e_desconto(D, 1000, 0.1)[\"desconto\"].tolist()", "expected": [0.0, 0.0, 0.0, 0.0], "tolerance": 1e-9,
    "name": "Limite alto: ninguém ganha desconto" },
  { "id": "a-pagar", "checkpoint": 4, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"produto\": [\"caneca\", \"mochila\", \"caneta\", \"luminária\"], \"preco\": [10.0, 25.0, 4.0, 50.0], \"qtd\": [3, 4, 5, 2]}, index=[5, 6, 7, 8])",
    "expr": "adicionar_total_e_desconto(D, 100, 0.1)[\"a_pagar\"].tolist()", "expected": [30.0, 90.0, 20.0, 90.0], "tolerance": 1e-9,
    "name": "Valor a pagar de cada pedido", "hint": "Quem não ganhou desconto paga o total." },
  { "id": "indice", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"produto\": [\"caneca\", \"mochila\", \"caneta\", \"luminária\"], \"preco\": [10.0, 25.0, 4.0, 50.0], \"qtd\": [3, 4, 5, 2]}, index=[5, 6, 7, 8])",
    "expr": "adicionar_total_e_desconto(D, 100, 0.1).index.tolist()", "expected": [5, 6, 7, 8], "name": "O índice continua o mesmo" },
  { "id": "nao-altera", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"produto\": [\"caneca\", \"mochila\", \"caneta\", \"luminária\"], \"preco\": [10.0, 25.0, 4.0, 50.0], \"qtd\": [3, 4, 5, 2]}, index=[5, 6, 7, 8])\nr = adicionar_total_e_desconto(D, 100, 0.1)",
    "expr": "list(D.columns)", "expected": ["produto", "preco", "qtd"], "name": "A tabela recebida não ganha colunas" },
  { "id": "dtype", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nD = pd.DataFrame({\"produto\": [\"caneca\", \"mochila\"], \"preco\": [10.0, 25.0], \"qtd\": [3, 4]})",
    "expr": "str(adicionar_total_e_desconto(D, 1000, 0.1)[\"desconto\"].dtype)", "expected": "float64", "name": "O desconto é float64" }
]
```

### Soluções erradas
```python name="soma preço e quantidade"
import numpy as np
import pandas as pd


def adicionar_total_e_desconto(df, limite, taxa):
    novo = df.assign(total=df["preco"] + df["qtd"])
    desconto = np.where(novo["total"] >= limite, novo["total"] * taxa, 0.0)
    return novo.assign(desconto=desconto, a_pagar=novo["total"] - desconto)
```
```python name="limite estrito"
import numpy as np
import pandas as pd


def adicionar_total_e_desconto(df, limite, taxa):
    novo = df.assign(total=df["preco"] * df["qtd"])
    desconto = np.where(novo["total"] > limite, novo["total"] * taxa, 0.0)
    return novo.assign(desconto=desconto, a_pagar=novo["total"] - desconto)
```
```python name="limite comparado com o preço"
import numpy as np
import pandas as pd


def adicionar_total_e_desconto(df, limite, taxa):
    novo = df.assign(total=df["preco"] * df["qtd"])
    desconto = np.where(novo["preco"] >= limite, novo["total"] * taxa, 0.0)
    return novo.assign(desconto=desconto, a_pagar=novo["total"] - desconto)
```
```python name="senão mantém o total"
import numpy as np
import pandas as pd


def adicionar_total_e_desconto(df, limite, taxa):
    novo = df.assign(total=df["preco"] * df["qtd"])
    desconto = np.where(novo["total"] >= limite, novo["total"] * taxa, novo["total"])
    return novo.assign(desconto=desconto, a_pagar=novo["total"] - desconto)
```
```python name="desconto para todos no valor a pagar"
import numpy as np
import pandas as pd


def adicionar_total_e_desconto(df, limite, taxa):
    novo = df.assign(total=df["preco"] * df["qtd"])
    desconto = np.where(novo["total"] >= limite, novo["total"] * taxa, 0.0)
    return novo.assign(desconto=desconto, a_pagar=novo["total"] * (1 - taxa))
```

## Passo 4 · Leitura · Condições e faixas

A Previsão mostrou o comportamento que mais engana no `map`: um valor sem tradução no dicionário vira `NaN`, **sem aviso**. Com números, a coluna ainda muda de `int64` para `float64`. O `replace` faz o contrário: troca o que está no dicionário e deixa o resto como estava. Quando o `NaN` não é o que você quer, decida o que vale para os que faltam: `map(...).fillna("Outra")`.

Com duas saídas, `np.where` resolve. Com três ou mais, os `np.where` aninhados ficam ilegíveis, e o `np.select` recebe uma lista de condições, uma lista de valores e um padrão:

```python
condicoes = [pedidos["total"] >= 500, pedidos["total"] >= 100]
rotulos = ["ouro", "prata"]
nivel = np.select(condicoes, rotulos, default="bronze")
```

Cada linha recebe o valor da **primeira** condição verdadeira, então a ordem importa: com `>= 100` em primeiro lugar, um pedido de 800 sairia "prata". O `default` é o valor de quem não atende a nenhuma. Sem ele, o padrão é o número 0, que não combina com rótulos de texto, e o numpy recusa: `TypeError: Choicelist and default value do not have a common dtype`.

Para faixas de um número, `pd.cut` recebe as bordas (`bins`) e os rótulos:

```python
idades = pd.Series([0, 12, 13, 17, 18, 60])
pd.cut(idades, bins=[0, 12, 17, 59, np.inf],
       labels=["criança", "adolescente", "adulto", "idoso"], include_lowest=True)
```

Por padrão, cada intervalo é fechado à direita e aberto à esquerda: `(12, 17]` contém 13 e 17, mas não 12. Por isso o primeiro intervalo, `(0, 12]`, deixaria a idade 0 de fora, como `NaN`; `include_lowest=True` fecha a borda de baixo do primeiro intervalo. Com `right=False`, os intervalos viram `[0, 12)`, `[12, 17)`… e as bordas mudam de lado. `np.inf` como última borda garante que nenhuma idade alta fique sem faixa.

O resultado do `cut` tem `dtype` `category`, com as categorias na ordem dos rótulos; `astype(str)` dá os textos. `pd.qcut(valores, 4, labels=[...])` corta pelos **quantis**: cada faixa fica com o mesmo número de valores, e as bordas saem dos dados. `rank()` dá a posição de cada valor na ordem (1 para o menor), útil para classificações.

## Passo 5 · Exercício · Faixas e risco

Um cadastro fictício de clientes precisa de duas colunas novas: a faixa etária, para o marketing, e o risco de crédito, para a cobrança.

### Instruções
1. `faixa_etaria(idades)` recebe uma Series de idades inteiras e devolve uma Series categórica, com o mesmo índice: `"criança"` de 0 a 12, `"adolescente"` de 13 a 17, `"adulto"` de 18 a 59 e `"idoso"` de 60 em diante; as categorias ficam nessa ordem.
2. `classificar_risco(df)` recebe uma tabela com as colunas `atraso` (dias) e `divida` (reais) e devolve uma Series de texto, com o mesmo índice de `df`: `"alto"` se `atraso` passa de 60 **ou** `divida` passa de 5000; senão `"médio"` se `atraso` passa de 15; senão `"baixo"`.
3. Nenhuma das duas usa laço nem `apply`.

### Código inicial
```python
import numpy as np
import pandas as pd


def faixa_etaria(idades):
    pass


def classificar_risco(df):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def faixa_etaria(idades):
    return pd.cut(
        idades,
        bins=[0, 12, 17, 59, np.inf],
        labels=["criança", "adolescente", "adulto", "idoso"],
        include_lowest=True,
    )


def classificar_risco(df):
    condicoes = [(df["atraso"] > 60) | (df["divida"] > 5000), df["atraso"] > 15]
    rotulos = ["alto", "médio"]
    return pd.Series(np.select(condicoes, rotulos, default="baixo"), index=df.index)
```

### Dicas
1. Os intervalos do `cut` são fechados à direita: "de 13 a 17" é o intervalo que termina em 17. E a idade 0 precisa caber no primeiro.
2. No `np.select`, vale a primeira condição verdadeira, e os rótulos de texto precisam de um `default` de texto.
3. `np.select` devolve um array sem índice; a Series que você devolve precisa do índice de `df`.

### Verificação
```json
[
  { "id": "faixa-bordas", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nS = pd.Series([12, 13, 17, 18, 59, 60])",
    "expr": "faixa_etaria(S).astype(str).tolist()", "expected": ["criança", "adolescente", "adolescente", "adulto", "adulto", "idoso"],
    "name": "As bordas 12/13, 17/18 e 59/60", "hint": "\"De 13 a 17\" inclui o 13 e o 17." },
  { "id": "faixa-zero", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nS = pd.Series([0, 1, 5])",
    "expr": "faixa_etaria(S).astype(str).tolist()", "expected": ["criança", "criança", "criança"],
    "name": "Um bebê de 0 ano é criança", "hint": "O primeiro intervalo do cut não inclui a borda de baixo, a menos que você peça." },
  { "id": "faixa-alta", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nS = pd.Series([75, 105])",
    "expr": "faixa_etaria(S).astype(str).tolist()", "expected": ["idoso", "idoso"],
    "name": "Idades altas, inclusive acima de 100, são idoso", "hint": "Qual é a última borda?" },
  { "id": "faixa-categorias", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nS = pd.Series([30, 70])",
    "expr": "[str(faixa_etaria(S).dtype), list(faixa_etaria(S).cat.categories)]",
    "expected": ["category", ["criança", "adolescente", "adulto", "idoso"]], "name": "Série categórica, categorias na ordem das faixas" },
  { "id": "faixa-indice", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nS = pd.Series([8, 40, 66], index=[\"c1\", \"c2\", \"c3\"])",
    "expr": "faixa_etaria(S).index.tolist()", "expected": ["c1", "c2", "c3"], "name": "O índice das idades se mantém" },
  { "id": "risco", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nR = pd.DataFrame({\"atraso\": [0, 60, 61, 15, 16, 0, 0, 90], \"divida\": [6000.0, 100.0, 0.0, 4000.0, 0.0, 5000.0, 5000.01, 0.0]}, index=[101, 102, 103, 104, 105, 106, 107, 108])",
    "expr": "classificar_risco(R).tolist()", "expected": ["alto", "médio", "alto", "baixo", "médio", "baixo", "alto", "alto"],
    "name": "Risco de cada cliente, com as bordas 60, 15 e 5000", "hint": "\"Passa de\" é maior estrito, e a primeira regra que vale ganha." },
  { "id": "risco-divida", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nR = pd.DataFrame({\"atraso\": [20, 0], \"divida\": [9000.0, 9000.0]})",
    "expr": "classificar_risco(R).tolist()", "expected": ["alto", "alto"],
    "name": "Dívida alta basta para risco alto, com ou sem atraso", "hint": "Uma das duas condições já basta." },
  { "id": "risco-baixo", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nR = pd.DataFrame({\"atraso\": [0, 3], \"divida\": [0.0, 120.0]})",
    "expr": "classificar_risco(R).tolist()", "expected": ["baixo", "baixo"], "name": "Sem atraso nem dívida alta: baixo" },
  { "id": "risco-indice", "checkpoint": 2, "kind": "expr",
    "setup": "import pandas as pd\nR = pd.DataFrame({\"atraso\": [0, 90], \"divida\": [0.0, 0.0]}, index=[\"x7\", \"y2\"])",
    "expr": "[type(classificar_risco(R)).__name__, classificar_risco(R).index.tolist()]", "expected": ["Series", ["x7", "y2"]],
    "name": "Uma Series com o índice da tabela" },
  { "id": "sem-for", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "for" }, "name": "Sem laço for" },
  { "id": "sem-compreensao", "checkpoint": 3, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension" },
    "name": "Sem compreensão de lista" },
  { "id": "sem-apply", "checkpoint": 3, "kind": "source", "rule": { "type": "not_calls", "name": "apply" }, "name": "Sem apply" }
]
```

### Soluções erradas
```python name="cut sem incluir a borda de baixo"
import numpy as np
import pandas as pd


def faixa_etaria(idades):
    return pd.cut(
        idades,
        bins=[0, 12, 17, 59, np.inf],
        labels=["criança", "adolescente", "adulto", "idoso"],
    )


def classificar_risco(df):
    condicoes = [(df["atraso"] > 60) | (df["divida"] > 5000), df["atraso"] > 15]
    rotulos = ["alto", "médio"]
    return pd.Series(np.select(condicoes, rotulos, default="baixo"), index=df.index)
```
```python name="última borda em 100"
import numpy as np
import pandas as pd


def faixa_etaria(idades):
    return pd.cut(
        idades,
        bins=[0, 12, 17, 59, 100],
        labels=["criança", "adolescente", "adulto", "idoso"],
        include_lowest=True,
    )


def classificar_risco(df):
    condicoes = [(df["atraso"] > 60) | (df["divida"] > 5000), df["atraso"] > 15]
    rotulos = ["alto", "médio"]
    return pd.Series(np.select(condicoes, rotulos, default="baixo"), index=df.index)
```
```python name="bordas no início de cada faixa"
import numpy as np
import pandas as pd


def faixa_etaria(idades):
    return pd.cut(
        idades,
        bins=[0, 13, 18, 60, np.inf],
        labels=["criança", "adolescente", "adulto", "idoso"],
        include_lowest=True,
    )


def classificar_risco(df):
    condicoes = [(df["atraso"] > 60) | (df["divida"] > 5000), df["atraso"] > 15]
    rotulos = ["alto", "médio"]
    return pd.Series(np.select(condicoes, rotulos, default="baixo"), index=df.index)
```
```python name="select sem default"
import numpy as np
import pandas as pd


def faixa_etaria(idades):
    return pd.cut(
        idades,
        bins=[0, 12, 17, 59, np.inf],
        labels=["criança", "adolescente", "adulto", "idoso"],
        include_lowest=True,
    )


def classificar_risco(df):
    condicoes = [(df["atraso"] > 60) | (df["divida"] > 5000), df["atraso"] > 15]
    rotulos = ["alto", "médio"]
    return pd.Series(np.select(condicoes, rotulos), index=df.index)
```
```python name="condição de médio primeiro"
import numpy as np
import pandas as pd


def faixa_etaria(idades):
    return pd.cut(
        idades,
        bins=[0, 12, 17, 59, np.inf],
        labels=["criança", "adolescente", "adulto", "idoso"],
        include_lowest=True,
    )


def classificar_risco(df):
    condicoes = [df["atraso"] > 15, (df["atraso"] > 60) | (df["divida"] > 5000)]
    rotulos = ["médio", "alto"]
    return pd.Series(np.select(condicoes, rotulos, default="baixo"), index=df.index)
```
```python name="e no lugar de ou"
import numpy as np
import pandas as pd


def faixa_etaria(idades):
    return pd.cut(
        idades,
        bins=[0, 12, 17, 59, np.inf],
        labels=["criança", "adolescente", "adulto", "idoso"],
        include_lowest=True,
    )


def classificar_risco(df):
    condicoes = [(df["atraso"] > 60) & (df["divida"] > 5000), df["atraso"] > 15]
    rotulos = ["alto", "médio"]
    return pd.Series(np.select(condicoes, rotulos, default="baixo"), index=df.index)
```
```python name="devolve o array sem índice"
import numpy as np
import pandas as pd


def faixa_etaria(idades):
    return pd.cut(
        idades,
        bins=[0, 12, 17, 59, np.inf],
        labels=["criança", "adolescente", "adulto", "idoso"],
        include_lowest=True,
    )


def classificar_risco(df):
    condicoes = [(df["atraso"] > 60) | (df["divida"] > 5000), df["atraso"] > 15]
    rotulos = ["alto", "médio"]
    return np.select(condicoes, rotulos, default="baixo")
```

## Passo 6 · Leitura · O custo do apply por linha

A regra de frete da loja cabe numa função com dois `if`, e o caminho mais curto é aplicá-la linha a linha:

```python
def regra(linha):
    if linha["peso"] <= 1:
        return 15.0
    if linha["regiao"] == "Norte":
        return 15.0 + 8.0 * linha["peso"]
    return 15.0 + 5.0 * linha["peso"]

frete = pedidos.apply(regra, axis=1)
```

Funciona, mas `apply(axis=1)` é um laço Python disfarçado: para cada linha, o pandas monta uma Series nova (com índice, `dtype` e os valores daquela linha), chama a sua função e guarda o resultado. Com 100 mil pedidos, são 100 mil Series criadas e descartadas.

Medimos quatro versões da mesma regra no executor desta plataforma, numa tabela de 100 mil linhas, 5 rodadas cada (mínimo e máximo das rodadas):

| Versão | Tempo |
|---|---|
| `iterrows` com laço `for` | 2 670 a 2 770 ms |
| `apply(regra, axis=1)` | 670 a 740 ms |
| `map` com função na coluna `regiao` + `np.where` | 16 a 18 ms |
| `np.where` nas colunas inteiras | 7 a 13 ms |

Todas dão o mesmo resultado. A vetorizada é umas cem vezes mais rápida que o `apply`, e o `iterrows`, que muita gente usa "para ganhar velocidade", é o mais lento: ele também cria uma Series por linha, e ainda roda o laço no seu código. O `map` com função fica no meio, porque chama a função uma vez por valor, mas de uma coluna só, sem montar linhas.

A ordem de preferência, então: operação vetorizada (aritmética, comparações, `np.where`, `np.select`, `pd.cut`) quando existir; `map` com dicionário ou função quando a transformação for de uma coluna só; `apply(axis=1)` só para o que não tem versão vetorizada, numa tabela pequena. Para trocar o `apply` por operações nas colunas, leia cada `if` como uma máscara: `linha["peso"] <= 1` vira `df["peso"] <= 1`, e cada `return` vira um dos valores do `np.where`.

Como no módulo 1, os números dependem da máquina e da carga, e a correção não mede tempo: ela confere o resultado e recusa o `apply` pela estrutura do código. Para medir você mesmo, use a mediana de várias rodadas com `timeit.repeat`, ou `%timeit` no Jupyter.

## Passo 7 · Exercício · Troque o apply

O sistema da loja calcula o frete com a versão da leitura, que leva quase um segundo a cada 100 mil pedidos:

```python
def frete_com_apply(df):
    def regra(linha):
        if linha["peso"] <= 1:
            return 15.0
        if linha["regiao"] == "Norte":
            return 15.0 + 8.0 * linha["peso"]
        return 15.0 + 5.0 * linha["peso"]
    return df.apply(regra, axis=1)
```

Escreva `frete(df)` com o mesmo resultado, só com operações vetorizadas.

### Instruções
1. `frete(df)` recebe uma tabela com as colunas `regiao` e `peso` e devolve uma Series `float64`, com o mesmo índice de `df`, com o mesmo valor que `frete_com_apply` daria em cada linha.
2. Não use `apply`, `iterrows`, laço `for` nem compreensão de lista.
3. Não altere `df`.

### Código inicial
```python
import numpy as np
import pandas as pd


def frete(df):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def frete(df):
    taxa = np.where(df["regiao"] == "Norte", 8.0, 5.0)
    valor = np.where(df["peso"] <= 1, 15.0, 15.0 + taxa * df["peso"])
    return pd.Series(valor, index=df.index)
```

### Dicas
1. Cada `if` da regra vira uma máscara sobre a coluna inteira.
2. A taxa por quilo depende só da região: calcule-a primeiro, para todas as linhas.
3. `np.where` devolve um array; o índice da tabela precisa voltar para a Series.

### Verificação
```json
[
  { "id": "pequena", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nF = pd.DataFrame({\"regiao\": [\"Sul\", \"Norte\", \"Norte\", \"Leste\", \"Sul\"], \"peso\": [0.5, 1.0, 2.0, 3.0, 1.5]}, index=[\"p1\", \"p2\", \"p3\", \"p4\", \"p5\"])",
    "expr": "frete(F).tolist()", "expected": [15.0, 15.0, 31.0, 30.0, 22.5], "tolerance": 1e-9,
    "name": "Frete de cinco pedidos, com peso exatamente 1", "hint": "Até 1 kg, inclusive, o frete é fixo." },
  { "id": "indice", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nF = pd.DataFrame({\"regiao\": [\"Sul\", \"Norte\", \"Norte\", \"Leste\", \"Sul\"], \"peso\": [0.5, 1.0, 2.0, 3.0, 1.5]}, index=[\"p1\", \"p2\", \"p3\", \"p4\", \"p5\"])",
    "expr": "[type(frete(F)).__name__, frete(F).index.tolist()]", "expected": ["Series", ["p1", "p2", "p3", "p4", "p5"]],
    "name": "Uma Series com o índice dos pedidos" },
  { "id": "dtype", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nF = pd.DataFrame({\"regiao\": [\"Norte\"], \"peso\": [4.0]})",
    "expr": "[str(frete(F).dtype), frete(F).tolist()]", "expected": ["float64", [47.0]], "name": "Um pedido do Norte com 4 kg" },
  { "id": "mil-soma", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nimport pandas as pd\nrng = np.random.default_rng(4)\nG = pd.DataFrame({\"regiao\": rng.choice([\"Norte\", \"Sul\", \"Leste\", \"Oeste\"], 1000), \"peso\": np.round(rng.uniform(0.1, 10.0, 1000), 2)})",
    "expr": "float(frete(G).sum())", "expected": 43079.17, "tolerance": 1e-6,
    "name": "1 000 pedidos sorteados: a soma dos fretes bate com a versão com apply", "hint": "Confira a taxa de cada região e o limite de 1 kg." },
  { "id": "mil-fixos", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nimport pandas as pd\nrng = np.random.default_rng(4)\nG = pd.DataFrame({\"regiao\": rng.choice([\"Norte\", \"Sul\", \"Leste\", \"Oeste\"], 1000), \"peso\": np.round(rng.uniform(0.1, 10.0, 1000), 2)})",
    "expr": "int((frete(G) == 15.0).sum())", "expected": 98, "name": "1 000 pedidos sorteados: 98 fretes fixos" },
  { "id": "mil-primeiros", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\nimport pandas as pd\nrng = np.random.default_rng(4)\nG = pd.DataFrame({\"regiao\": rng.choice([\"Norte\", \"Sul\", \"Leste\", \"Oeste\"], 1000), \"peso\": np.round(rng.uniform(0.1, 10.0, 1000), 2)})",
    "expr": "frete(G).head(5).tolist()", "expected": [44.4, 54.0, 34.15, 30.95, 20.95], "tolerance": 1e-9,
    "name": "1 000 pedidos sorteados: os cinco primeiros, um a um" },
  { "id": "nao-altera", "checkpoint": 3, "kind": "expr",
    "setup": "import pandas as pd\nF = pd.DataFrame({\"regiao\": [\"Sul\", \"Norte\"], \"peso\": [0.5, 2.0]})\nr = frete(F)",
    "expr": "[list(F.columns), F[\"peso\"].tolist()]", "expected": [["regiao", "peso"], [0.5, 2.0]], "name": "A tabela recebida não muda" },
  { "id": "sem-apply", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "apply" }, "name": "Sem apply" },
  { "id": "sem-iterrows", "checkpoint": 2, "kind": "source", "rule": { "type": "not_calls", "name": "iterrows" }, "name": "Sem iterrows" },
  { "id": "sem-for", "checkpoint": 2, "kind": "source", "rule": { "type": "not_uses", "construct": "for" }, "name": "Sem laço for" },
  { "id": "sem-compreensao", "checkpoint": 2, "kind": "source", "rule": { "type": "not_uses", "construct": "list_comprehension" },
    "name": "Sem compreensão de lista" }
]
```

### Soluções erradas
```python name="apply por linha"
import numpy as np
import pandas as pd


def frete(df):
    def regra(linha):
        if linha["peso"] <= 1:
            return 15.0
        if linha["regiao"] == "Norte":
            return 15.0 + 8.0 * linha["peso"]
        return 15.0 + 5.0 * linha["peso"]
    return df.apply(regra, axis=1)
```
```python name="laço com iterrows"
import numpy as np
import pandas as pd


def frete(df):
    valores = []
    for _, linha in df.iterrows():
        if linha["peso"] <= 1:
            valores.append(15.0)
        elif linha["regiao"] == "Norte":
            valores.append(15.0 + 8.0 * linha["peso"])
        else:
            valores.append(15.0 + 5.0 * linha["peso"])
    return pd.Series(valores, index=df.index)
```
```python name="compreensão com zip"
import numpy as np
import pandas as pd


def frete(df):
    valores = [
        15.0 if p <= 1 else 15.0 + (8.0 if r == "Norte" else 5.0) * p
        for r, p in zip(df["regiao"], df["peso"])
    ]
    return pd.Series(valores, index=df.index)
```
```python name="peso 1 fora do frete fixo"
import numpy as np
import pandas as pd


def frete(df):
    taxa = np.where(df["regiao"] == "Norte", 8.0, 5.0)
    valor = np.where(df["peso"] < 1, 15.0, 15.0 + taxa * df["peso"])
    return pd.Series(valor, index=df.index)
```
```python name="taxas trocadas"
import numpy as np
import pandas as pd


def frete(df):
    taxa = np.where(df["regiao"] == "Norte", 5.0, 8.0)
    valor = np.where(df["peso"] <= 1, 15.0, 15.0 + taxa * df["peso"])
    return pd.Series(valor, index=df.index)
```
```python name="map sem as outras regiões"
import numpy as np
import pandas as pd


def frete(df):
    taxa = df["regiao"].map({"Norte": 8.0, "Sul": 5.0})
    valor = np.where(df["peso"] <= 1, 15.0, 15.0 + taxa * df["peso"])
    return pd.Series(valor, index=df.index)
```
```python name="devolve o array"
import numpy as np
import pandas as pd


def frete(df):
    taxa = np.where(df["regiao"] == "Norte", 8.0, 5.0)
    return np.where(df["peso"] <= 1, 15.0, 15.0 + taxa * df["peso"])
```

## Passo 8 · Quiz · map, apply e vetorizado

### Pergunta
Uma analista criou `vendas["regiao"] = vendas["uf"].map(regioes)`, com um dicionário que cobre 20 estados. Depois, `vendas["regiao"].value_counts()` somou 9 200 vendas, mas a tabela tem 10 000 linhas. O que aconteceu com as outras 800?
- [ ] O `map` levantou `KeyError` para os estados ausentes, e essas linhas foram descartadas
- [x] Os estados fora do dicionário viraram `NaN`, e o `value_counts` não conta ausentes
- [ ] O `map` manteve a sigla original nos estados ausentes, e elas foram contadas em outra coluna
- [ ] O `value_counts` só mostra as 20 categorias mais frequentes
> O `map` troca pelo valor do dicionário e põe `NaN` onde não há chave, sem erro e sem aviso; o `value_counts` ignora os `NaN` por padrão. Quem mantém o valor original é o `replace`. Para achar as linhas sem região, `vendas["regiao"].isna().sum()`; para dar um valor a elas, `fillna`. O `value_counts` mostra todas as categorias, não só as 20 primeiras.

### Pergunta
`pd.cut(idades, bins=[0, 12, 17, 59, 120], labels=["criança", "adolescente", "adulto", "idoso"])` deixou os bebês de 0 ano com `NaN`, e todas as outras idades estão certas. Qual mudança resolve?
- [ ] Trocar a primeira borda por 1
- [x] Acrescentar `include_lowest=True`
- [ ] Acrescentar `right=False`, sem mudar as bordas
- [ ] Converter as idades para `float` antes do `cut`
> Os intervalos do `cut` são abertos à esquerda: `(0, 12]` não contém o 0. `include_lowest=True` fecha a borda de baixo do primeiro intervalo. Começar em 1 piora: o 0 continua de fora. `right=False` com as mesmas bordas inclui o 0, mas muda as outras faixas: 12 vira adolescente e 17 vira adulto. O tipo das idades não muda os intervalos.

### Pergunta
Um relatório roda `df.apply(regra, axis=1)` numa tabela de 100 mil linhas e leva quase um segundo. Um colega propõe trocar por um `for` com `iterrows`, "que é mais direto". O que esperar?
- [ ] Ficar umas dez vezes mais rápido, porque o `iterrows` não cria Series
- [ ] O mesmo tempo, porque os dois são vetorizados
- [x] Ficar mais lento; o ganho de verdade vem de reescrever a regra com máscaras e `np.where` ou `np.select`
- [ ] Ficar mais rápido só se a função `regra` for definida fora do laço
> `iterrows` também monta uma Series por linha e ainda roda o laço em Python: na medição da lição, levou cerca de 2,7 s contra 0,7 s do `apply`. Nenhum dos dois é vetorizado. Reescrever cada `if` como uma máscara sobre a coluna inteira levou cerca de 7 ms. Onde a função é definida não muda o custo por linha.
