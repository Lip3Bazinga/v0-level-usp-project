---
slug: n4-m3-02-tipos-datas-e-strings
titulo: Tipos, datas e strings
descricao: astype, to_numeric(errors='coerce'), to_datetime com formatos brasileiros, acessor .dt e .str, categorias e normalização de texto.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Converter colunas para numérico e para datetime tratando valores inválidos
- Extrair componentes de datas (ano, mês, dia da semana) e calcular diferenças
- Normalizar textos (strip, lower, remoção de acentos simples, padronização de categorias)
---

## Passo 1 · Leitura · Texto que parece número

Uma loja virtual fictícia exportou o catálogo, e a coluna de preço veio como texto, do jeito que aparece na tela: `"R$ 1.234,56"`. Para o pandas, isso é `str`, e nenhuma conta funciona. A conversão direta falha logo no primeiro valor:

```python
precos = pd.Series(["R$ 1.234,56", "R$ 89,90", "consultar"])
precos.astype(float)
# ValueError: could not convert string to float: 'R$ 1.234,56'
```

O `float` do Python só entende o formato americano: ponto decimal e nenhum separador de milhar. A limpeza tem três passos, **nesta ordem**: tirar o símbolo e os espaços, apagar o ponto de milhar e só então trocar a vírgula por ponto. Inverter os dois últimos estraga tudo: trocar a vírgula primeiro deixa `"1.234.56"`, e o passo seguinte apaga também o ponto decimal, dando 123456.

```python
texto = precos.str.replace("R$", "", regex=False).str.strip()
texto = texto.str.replace(".", "", regex=False).str.replace(",", ".", regex=False)
valores = pd.to_numeric(texto, errors="coerce")    # [1234.56, 89.9, nan]
```

O `regex=False` não é enfeite. O `str.replace` do pandas trata o padrão como texto literal por padrão, mas o `str.contains` trata como expressão regular, e numa expressão regular o `.` casa **qualquer** caractere e o `$` marca o fim do texto. Escrever `regex=False` deixa a intenção explícita e evita a surpresa quando você troca de método ou de versão: `texto.str.replace(".", "", regex=True)` apaga a string inteira.

Sobra o `"consultar"`, que não é preço. `pd.to_numeric` com `errors="raise"`, o padrão, para no primeiro valor estranho: `ValueError: Unable to parse string "consultar" at position 2`. Com `errors="coerce"`, tudo que não vira número vira `NaN`, e a coluna sai `float64`. O `errors="ignore"` de versões antigas não existe mais (`ValueError: invalid error value specified`).

O `coerce` é cômodo e perigoso: um defeito na limpeza, como esquecer o ponto de milhar, também vira `NaN`, em silêncio, e os preços acima de mil reais somem da média. Por isso, conte os ausentes antes e depois da conversão. Se o número cresceu mais do que os textos que você sabe que não são preço, a limpeza tem um defeito, e é hora de olhar as linhas que viraram `NaN`.

## Passo 2 · Exercício · Limpar preços
modo: lacunas

Complete as lacunas (`___`) para transformar os preços do catálogo em números.

### Instruções
1. `limpar_precos(serie)` recebe uma Series de textos como `"R$ 1.234,56"` (com ou sem `R$`, com espaços nas pontas) e devolve uma Series `float64` com os valores, mantendo o índice.
2. O ponto é separador de milhar e a vírgula é a decimal.
3. Textos que não são preço e ausentes viram `NaN`, sem exceção.

### Código inicial
```python
import numpy as np
import pandas as pd


def limpar_precos(serie):
    texto = serie.str.replace("R$", "", regex=False).str.strip()
    texto = texto.str.replace(___, "", regex=___)
    texto = texto.str.replace(___, ___, regex=False)
    return pd.to_numeric(texto, errors=___)
```

### Solução
```python
import numpy as np
import pandas as pd


def limpar_precos(serie):
    texto = serie.str.replace("R$", "", regex=False).str.strip()
    texto = texto.str.replace(".", "", regex=False)
    texto = texto.str.replace(",", ".", regex=False)
    return pd.to_numeric(texto, errors="coerce")
```

### Dicas
1. Primeiro some o separador de milhar; depois a vírgula vira o ponto decimal.
2. Numa expressão regular, o ponto casa qualquer caractere.
3. Um dos valores de `errors` transforma em `NaN` o que não é número.

### Verificação
```json
[
  { "id": "milhar", "checkpoint": 2, "kind": "expr", "expr": "limpar_precos(pd.Series(['R$ 1.234,56'])).tolist()",
    "expected": [1234.56], "tolerance": 1e-9, "name": "R$ 1.234,56 vira 1234.56", "hint": "O ponto separa milhares; ele precisa sumir." },
  { "id": "centavos", "checkpoint": 2, "kind": "expr", "expr": "limpar_precos(pd.Series(['R$ 89,90', 'R$ 0,99'])).tolist()",
    "expected": [89.9, 0.99], "tolerance": 1e-9, "name": "A vírgula é a decimal", "hint": "89,90 reais não são 8990 reais." },
  { "id": "milhao", "checkpoint": 2, "kind": "expr", "expr": "limpar_precos(pd.Series(['R$ 1.000.000,00'])).tolist()",
    "expected": [1000000.0], "tolerance": 1e-9, "name": "Mais de um ponto de milhar" },
  { "id": "espacos", "checkpoint": 1, "kind": "expr", "expr": "limpar_precos(pd.Series([' R$ 12,00 ', '45,00'])).tolist()",
    "expected": [12.0, 45.0], "tolerance": 1e-9, "name": "Espaços nas pontas e preço sem R$" },
  { "id": "tipo", "checkpoint": 1, "kind": "expr", "expr": "str(limpar_precos(pd.Series(['R$ 10,00', 'R$ 2,50'])).dtype)",
    "expected": "float64", "name": "O resultado é float64" },
  { "id": "indice", "checkpoint": 1, "kind": "expr",
    "expr": "limpar_precos(pd.Series(['R$ 10,00', 'R$ 2,50'], index=['p7', 'p9'])).index.tolist()",
    "expected": ["p7", "p9"], "name": "O índice é mantido" },
  { "id": "invalido", "checkpoint": 3, "kind": "expr", "expr": "limpar_precos(pd.Series(['consultar', 'R$ 10,00'])).isna().tolist()",
    "expected": [true, false], "name": "Texto que não é preço vira NaN", "hint": "Escolha o modo de erro que não levanta exceção." },
  { "id": "ausente", "checkpoint": 3, "kind": "expr", "expr": "limpar_precos(pd.Series([None, 'R$ 5,50'])).isna().tolist()",
    "expected": [true, false], "name": "Ausente continua ausente" },
  { "id": "misto", "checkpoint": 3, "kind": "expr",
    "expr": "limpar_precos(pd.Series(['R$ 1.234,56', 'sob consulta', 'R$ 89,90', None])).fillna(-1).tolist()",
    "expected": [1234.56, -1, 89.9, -1], "tolerance": 1e-9, "name": "Catálogo com preços, texto e ausente" }
]
```

### Soluções erradas
```python name="ponto como expressão regular"
import numpy as np
import pandas as pd


def limpar_precos(serie):
    texto = serie.str.replace("R$", "", regex=False).str.strip()
    texto = texto.str.replace(".", "", regex=True)
    texto = texto.str.replace(",", ".", regex=False)
    return pd.to_numeric(texto, errors="coerce")
```
```python name="não tira o ponto de milhar"
import numpy as np
import pandas as pd


def limpar_precos(serie):
    texto = serie.str.replace("R$", "", regex=False).str.strip()
    texto = texto.str.replace(" ", "", regex=False)
    texto = texto.str.replace(",", ".", regex=False)
    return pd.to_numeric(texto, errors="coerce")
```
```python name="apaga a vírgula decimal"
import numpy as np
import pandas as pd


def limpar_precos(serie):
    texto = serie.str.replace("R$", "", regex=False).str.strip()
    texto = texto.str.replace(".", "", regex=False)
    texto = texto.str.replace(",", "", regex=False)
    return pd.to_numeric(texto, errors="coerce")
```
```python name="para no primeiro texto inválido"
import numpy as np
import pandas as pd


def limpar_precos(serie):
    texto = serie.str.replace("R$", "", regex=False).str.strip()
    texto = texto.str.replace(".", "", regex=False)
    texto = texto.str.replace(",", ".", regex=False)
    return pd.to_numeric(texto, errors="raise")
```
```python name="errors ignore"
import numpy as np
import pandas as pd


def limpar_precos(serie):
    texto = serie.str.replace("R$", "", regex=False).str.strip()
    texto = texto.str.replace(".", "", regex=False)
    texto = texto.str.replace(",", ".", regex=False)
    return pd.to_numeric(texto, errors="ignore")
```

## Passo 3 · Leitura · Datas

Datas em texto têm o problema dos preços e mais uma armadilha: `"03/04/2025"` é 3 de abril aqui e 4 de março em muitos sistemas de origem americana. Sem `format`, o `pd.to_datetime` adivinha o formato **pela primeira data** e o aplica a todas. Se a primeira é ambígua, ele escolhe mês/dia; quando aparece uma data que não cabe, vem o erro:

```text
ValueError: time data "13/02/2025" doesn't match format "%m/%d/%Y".
```

Pior é quando nenhuma data passa do dia 12: aí não há erro, e todos os dias e meses saem trocados. Diga sempre o formato:

```python
datas = pd.to_datetime(df["cadastro"], format="%d/%m/%Y", errors="coerce")
```

`%d` é o dia, `%m` o mês e `%Y` o ano com quatro dígitos (`%y`, minúsculo, é o ano com dois). `errors="coerce"` transforma o que não é data válida, como `"31/02/2025"` ou uma célula vazia, em `NaT` (*not a time*), o ausente das datas. `dayfirst=True` também resolve a ambiguidade, mas o `format` é mais claro e acusa qualquer linha fora do padrão. O resultado tem `dtype` `datetime64[us]`.

Uma coluna de datas ganha o acessor `.dt`: `.dt.year`, `.dt.month`, `.dt.day`, `.dt.dayofweek` (0 é segunda e 6 é domingo) e `.dt.day_name()`, que devolve o nome em inglês, como `"Monday"`; para português, traduza com um dicionário e `map`. Subtrair duas datas dá um intervalo (`Timedelta`), e `.dt.days` diz quantos dias inteiros ele tem:

```python
referencia = pd.Timestamp("2025-03-10")
(referencia - datas).dt.days      # dias desde o cadastro; NaT vira NaN
```

A referência precisa ser uma data: `"2025-03-10" - datas` dá `TypeError: unsupported operand type(s) for -: 'DatetimeArray' and 'str'`. Repare também na diferença entre `.dt.day`, o dia do mês de uma data, e `.dt.days`, o tamanho de um intervalo: num intervalo, `.dt.day` dá `AttributeError: 'TimedeltaProperties' object has no attribute 'day'`.

Para mostrar ou comparar datas como texto, `dt.strftime("%Y-%m-%d")` faz o caminho de volta. O formato ano-mês-dia tem uma vantagem: em ordem alfabética, as datas ficam também em ordem cronológica, o que não acontece com dia/mês/ano.

## Passo 4 · Previsão · O que o to_datetime entendeu

As mesmas três datas, escritas como dia/mês/ano, são convertidas sem e com `format`. Leia sem executar e digite exatamente o que o programa imprime.

### Código
```python
import pandas as pd

textos = pd.Series(["01/02/2025", "02/03/2025", "10/03/2025"])
sem_formato = pd.to_datetime(textos)
com_formato = pd.to_datetime(textos, format="%d/%m/%Y")
print(sem_formato.dt.strftime("%Y-%m-%d").tolist())
print(com_formato.dt.strftime("%Y-%m-%d").tolist())
print(com_formato.dt.month.tolist())
print(com_formato.dt.dayofweek.tolist())
print(com_formato.dt.day_name().tolist())
print((com_formato.iloc[2] - com_formato.iloc[0]).days)
invalidas = pd.to_datetime(pd.Series(["31/02/2025", "15/03/2025"]), format="%d/%m/%Y", errors="coerce")
print(invalidas.isna().tolist())
print(com_formato.dtype)
```

### Dicas
1. Sem `format`, nenhuma das três datas passa do dia 12, então o pandas lê a primeira como mês/dia e segue assim, sem erro.
2. 1º de fevereiro de 2025 foi um sábado; `dayofweek` começa em 0 na segunda-feira.
3. De 1º de fevereiro a 10 de março há os 28 dias de fevereiro e mais 9.

### Saída esperada
```text
['2025-01-02', '2025-02-03', '2025-10-03']
['2025-02-01', '2025-03-02', '2025-03-10']
[2, 3, 3]
[5, 6, 0]
['Saturday', 'Sunday', 'Monday']
37
[True, False]
datetime64[us]
```

## Passo 5 · Exercício · Datas de cadastro

Um cadastro fictício de clientes guarda a data como texto `dd/mm/aaaa`. Converta a coluna e calcule há quantos dias cada cliente se cadastrou.

### Instruções
1. `converter_datas(df, coluna)` devolve uma tabela **nova**, com as mesmas colunas, em que `coluna` passa de texto `dd/mm/aaaa` para data.
2. Textos fora desse padrão, datas impossíveis (como 31/02) e ausentes viram `NaT`, sem exceção.
3. `idade_em_dias(df, coluna, referencia)` recebe a tabela com `coluna` já em data e `referencia` como texto `"aaaa-mm-dd"`, e devolve uma Series com o número de dias de cada data até a referência (positivo para datas anteriores à referência; `NaT` dá ausente).
4. A tabela recebida não muda.

### Código inicial
```python
import numpy as np
import pandas as pd


def converter_datas(df, coluna):
    pass


def idade_em_dias(df, coluna, referencia):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def converter_datas(df, coluna):
    nova = df.copy()
    nova[coluna] = pd.to_datetime(nova[coluna], format="%d/%m/%Y", errors="coerce")
    return nova


def idade_em_dias(df, coluna, referencia):
    return (pd.Timestamp(referencia) - df[coluna]).dt.days
```

### Dicas
1. Informe o formato com as letras do `strftime`: dia, mês e ano com quatro dígitos.
2. A referência chega como texto; transforme-a numa data antes de subtrair.
3. A diferença entre duas datas é um intervalo, e o número de dias de um intervalo está em `.dt.days`.

### Verificação
```json
[
  { "id": "converte", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'cliente': ['C1', 'C2', 'C3', 'C4'], 'cadastro': ['01/02/2025', '13/02/2025', '05/12/2024', '28/02/2025']})\nr = converter_datas(d, 'cadastro')",
    "expr": "r['cadastro'].dt.strftime('%Y-%m-%d').tolist()", "expected": ["2025-02-01", "2025-02-13", "2024-12-05", "2025-02-28"],
    "name": "Datas dd/mm/aaaa convertidas", "hint": "O primeiro número é o dia." },
  { "id": "ambiguas", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'cadastro': ['01/02/2025', '02/03/2025', '10/03/2025']})\nr = converter_datas(d, 'cadastro')",
    "expr": "r['cadastro'].dt.strftime('%Y-%m-%d').tolist()", "expected": ["2025-02-01", "2025-03-02", "2025-03-10"],
    "name": "Datas com dia até 12 não trocam dia e mês", "hint": "Sem formato, o pandas adivinha pela primeira data." },
  { "id": "tipo-data", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'cadastro': ['01/02/2025', '13/02/2025']})\nr = converter_datas(d, 'cadastro')",
    "expr": "r['cadastro'].dtype.kind", "expected": "M", "name": "A coluna convertida é de datas (datetime64)" },
  { "id": "outras-colunas", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'cliente': ['C1', 'C2'], 'cadastro': ['01/02/2025', '13/02/2025'], 'cidade': ['Vale Azul', 'Lagoa Seca']})\nr = converter_datas(d, 'cadastro')",
    "expr": "[list(r.columns), r['cliente'].tolist()]", "expected": [["cliente", "cadastro", "cidade"], ["C1", "C2"]],
    "name": "As outras colunas continuam iguais e na mesma ordem" },
  { "id": "invalidas", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'cadastro': ['31/02/2025', '', None, '2025-03-01', '15/03/2025']})\nr = converter_datas(d, 'cadastro')",
    "expr": "r['cadastro'].isna().tolist()", "expected": [true, true, true, true, false],
    "name": "Data impossível, vazia, ausente ou fora do padrão vira NaT", "hint": "Um dos valores de errors troca a exceção por NaT." },
  { "id": "dias", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'cadastro': pd.to_datetime(['2025-03-03', '2024-08-15', '2025-03-10'])})",
    "expr": "idade_em_dias(d, 'cadastro', '2025-03-10').tolist()", "expected": [7, 207, 0], "name": "Dias até 2025-03-10",
    "hint": "Referência menos data de cadastro." },
  { "id": "dias-futura", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'cadastro': pd.to_datetime(['2025-03-15'])})",
    "expr": "idade_em_dias(d, 'cadastro', '2025-03-10').tolist()", "expected": [-5], "name": "Data depois da referência dá número negativo" },
  { "id": "dias-nat", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'cadastro': pd.to_datetime(['2025-02-01', None])})",
    "expr": "idade_em_dias(d, 'cadastro', '2025-03-10').isna().tolist()", "expected": [false, true], "name": "NaT dá ausente" },
  { "id": "dias-tipo", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'cadastro': pd.to_datetime(['2025-02-01'])})",
    "expr": "type(idade_em_dias(d, 'cadastro', '2025-03-10')).__name__", "expected": "Series", "name": "idade_em_dias devolve uma Series" },
  { "id": "entrada", "checkpoint": 4, "kind": "expr",
    "setup": "d = pd.DataFrame({'cadastro': ['01/02/2025', '13/02/2025']})\nr = converter_datas(d, 'cadastro')",
    "expr": "str(d['cadastro'].dtype)", "expected": "str", "name": "A tabela recebida continua com texto", "hint": "Converta numa cópia." }
]
```

### Soluções erradas
```python name="sem format"
import numpy as np
import pandas as pd


def converter_datas(df, coluna):
    nova = df.copy()
    nova[coluna] = pd.to_datetime(nova[coluna], errors="coerce")
    return nova


def idade_em_dias(df, coluna, referencia):
    return (pd.Timestamp(referencia) - df[coluna]).dt.days
```
```python name="mês antes do dia"
import numpy as np
import pandas as pd


def converter_datas(df, coluna):
    nova = df.copy()
    nova[coluna] = pd.to_datetime(nova[coluna], format="%m/%d/%Y", errors="coerce")
    return nova


def idade_em_dias(df, coluna, referencia):
    return (pd.Timestamp(referencia) - df[coluna]).dt.days
```
```python name="ano com dois dígitos"
import numpy as np
import pandas as pd


def converter_datas(df, coluna):
    nova = df.copy()
    nova[coluna] = pd.to_datetime(nova[coluna], format="%d/%m/%y", errors="coerce")
    return nova


def idade_em_dias(df, coluna, referencia):
    return (pd.Timestamp(referencia) - df[coluna]).dt.days
```
```python name="sem coerce"
import numpy as np
import pandas as pd


def converter_datas(df, coluna):
    nova = df.copy()
    nova[coluna] = pd.to_datetime(nova[coluna], format="%d/%m/%Y")
    return nova


def idade_em_dias(df, coluna, referencia):
    return (pd.Timestamp(referencia) - df[coluna]).dt.days
```
```python name="altera a tabela recebida"
import numpy as np
import pandas as pd


def converter_datas(df, coluna):
    df[coluna] = pd.to_datetime(df[coluna], format="%d/%m/%Y", errors="coerce")
    return df


def idade_em_dias(df, coluna, referencia):
    return (pd.Timestamp(referencia) - df[coluna]).dt.days
```
```python name="subtração invertida"
import numpy as np
import pandas as pd


def converter_datas(df, coluna):
    nova = df.copy()
    nova[coluna] = pd.to_datetime(nova[coluna], format="%d/%m/%Y", errors="coerce")
    return nova


def idade_em_dias(df, coluna, referencia):
    return (df[coluna] - pd.Timestamp(referencia)).dt.days
```
```python name="referência como texto"
import numpy as np
import pandas as pd


def converter_datas(df, coluna):
    nova = df.copy()
    nova[coluna] = pd.to_datetime(nova[coluna], format="%d/%m/%Y", errors="coerce")
    return nova


def idade_em_dias(df, coluna, referencia):
    return (referencia - df[coluna]).dt.days
```
```python name="dia do mês no lugar de dias"
import numpy as np
import pandas as pd


def converter_datas(df, coluna):
    nova = df.copy()
    nova[coluna] = pd.to_datetime(nova[coluna], format="%d/%m/%Y", errors="coerce")
    return nova


def idade_em_dias(df, coluna, referencia):
    return (pd.Timestamp(referencia) - df[coluna]).dt.day
```

## Passo 6 · Leitura · Padronizar texto

Num formulário fictício de cadastro, a cidade é texto livre, e a contagem por cidade mostra `"Vale Azul"`, `"vale azul"`, `"Vale Azul "` e `"Vale  Azul"` como quatro cidades. Para o computador são quatro textos diferentes: maiúsculas, espaços nas pontas e espaços dobrados contam. `"sim " == "sim"` é `False`, e um espaço invisível no fim de uma célula divide um grupo em dois.

O acessor `.str` aplica os métodos de string a cada elemento, sem laço, e deixa os ausentes como estão:

```python
cidades = df["cidade"].str.strip().str.lower()
cidades = cidades.str.replace(r"\s+", " ", regex=True)    # um espaço só entre palavras
```

Aqui a expressão regular é a intenção: `\s+` quer dizer "um ou mais espaços". Usar `.str` numa coluna que não é de texto dá `AttributeError: Can only use .str accessor with string values, not integer`.

Acentos são o caso mais sutil. `"São"` e `"Sao"` diferem no `ã`, e a forma de tirar o acento sem perder a letra é decompor primeiro: a normalização Unicode NFKD separa o `ã` em `a` mais um til combinante, e só então a conversão para ASCII descarta o til.

```python
import unicodedata
unicodedata.normalize("NFKD", "Conceição").encode("ascii", "ignore").decode("ascii")    # 'Conceicao'
sem_acento = cidades.str.normalize("NFKD").str.encode("ascii", errors="ignore").str.decode("ascii")
```

Sem o NFKD, o `encode("ascii", "ignore")` joga fora a letra inteira, e `"São Jorge"` vira `"So Jorge"`.

Para tirar um pedaço de dentro do texto, `str.extract` recebe uma expressão regular com um **grupo** entre parênteses e devolve o que o grupo casou, ou ausente quando nada casa. `str.extract(r"\((\d{2})\)", expand=False)` pega os dois dígitos entre parênteses de `"(11) 98765-4321"`: os parênteses de fora, escapados, são os do texto; os de dentro formam o grupo. Sem `expand=False`, o resultado é uma tabela com uma coluna por grupo. `str.split("-", expand=True)` quebra um texto em colunas.

Depois de limpa, uma coluna com poucos valores repetidos pode virar `astype("category")`, que guarda cada texto uma vez só e aceita uma ordem própria. Por fim, no pandas 3 uma coluna de texto com ausentes devolve `nan`, e não `None`, no `tolist()`: se quem recebe a lista espera `None`, converta.

## Passo 7 · Exercício · Cidades e telefones

O cadastro fictício tem cidades digitadas de vários jeitos e telefones com e sem DDD. Padronize os dois.

### Instruções
1. `padronizar_cidades(serie)` devolve uma Series nova, com o mesmo índice, em que cada cidade está sem espaços nas pontas, com um espaço só entre as palavras, em minúsculas e sem acentos (`"São Jorge"` vira `"sao jorge"`); ausentes continuam ausentes.
2. `extrair_ddd(telefones)` recebe uma Series de telefones e devolve uma **lista** com o DDD de cada um, como texto de dois dígitos, quando ele aparece entre parênteses (`"(11) 98765-4321"` dá `"11"`), e `None` quando não aparece ou o telefone está ausente.

### Código inicial
```python
import numpy as np
import pandas as pd


def padronizar_cidades(serie):
    pass


def extrair_ddd(telefones):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def padronizar_cidades(serie):
    texto = serie.str.strip().str.lower().str.replace(r"\s+", " ", regex=True)
    return texto.str.normalize("NFKD").str.encode("ascii", errors="ignore").str.decode("ascii")


def extrair_ddd(telefones):
    ddd = telefones.str.extract(r"\((\d{2})\)", expand=False)
    return [None if pd.isna(valor) else valor for valor in ddd]
```

### Dicas
1. Encadeie os métodos de `.str`; o espaço dobrado no meio do texto pede uma expressão regular.
2. Tirar o acento sem perder a letra exige decompor o caractere antes de passar para ASCII.
3. O ausente do `extract` chega como `nan`; a lista pedida usa `None`.

### Verificação
```json
[
  { "id": "maiusculas-acento", "checkpoint": 1, "kind": "expr", "expr": "padronizar_cidades(pd.Series(['SÃO JORGE DA SERRA'])).tolist()",
    "expected": ["sao jorge da serra"], "name": "Maiúsculas e acento", "hint": "O ã precisa virar a, não sumir." },
  { "id": "pontas", "checkpoint": 1, "kind": "expr", "expr": "padronizar_cidades(pd.Series([' Vale Azul ', 'Vale Azul'])).tolist()",
    "expected": ["vale azul", "vale azul"], "name": "Espaços nas pontas" },
  { "id": "dobrados", "checkpoint": 1, "kind": "expr", "expr": "padronizar_cidades(pd.Series(['Vale   Azul', 'lagoa  seca'])).tolist()",
    "expected": ["vale azul", "lagoa seca"], "name": "Espaços dobrados no meio viram um só" },
  { "id": "cedilha", "checkpoint": 1, "kind": "expr", "expr": "padronizar_cidades(pd.Series(['Conceição do Vale', 'Ribeirão das Pedras'])).tolist()",
    "expected": ["conceicao do vale", "ribeirao das pedras"], "name": "Cedilha e til" },
  { "id": "grupos", "checkpoint": 1, "kind": "expr",
    "setup": "c = pd.Series([' São Jorge da Serra', 'sao  jorge da serra ', 'SÃO JORGE DA SERRA', 'Ribeirão das Pedras', 'ribeirao das pedras', 'Lagoa Seca'])",
    "expr": "int(padronizar_cidades(c).nunique())", "expected": 3, "name": "Seis grafias, três cidades" },
  { "id": "cidade-ausente", "checkpoint": 1, "kind": "expr", "expr": "padronizar_cidades(pd.Series(['Vale Azul', None])).isna().tolist()",
    "expected": [false, true], "name": "Cidade ausente continua ausente" },
  { "id": "cidade-indice", "checkpoint": 1, "kind": "expr",
    "expr": "padronizar_cidades(pd.Series(['Vale Azul', 'Lagoa Seca'], index=['c3', 'c8'])).index.tolist()",
    "expected": ["c3", "c8"], "name": "O índice é mantido" },
  { "id": "ddd", "checkpoint": 2, "kind": "expr", "expr": "extrair_ddd(pd.Series(['(11) 98765-4321', '(21)3456-7890', ' (31) 4002-8922']))",
    "expected": ["11", "21", "31"], "name": "DDD entre parênteses, com e sem espaço", "hint": "O DDD é o que está entre os parênteses." },
  { "id": "sem-ddd", "checkpoint": 2, "kind": "expr", "expr": "extrair_ddd(pd.Series(['98765-4321', '4002-8922']))",
    "expected": [null, null], "name": "Sem parênteses, o DDD é None", "hint": "Sem parênteses não há DDD, e na lista o ausente é None." },
  { "id": "telefone-ausente", "checkpoint": 2, "kind": "expr", "expr": "extrair_ddd(pd.Series(['(47) 3333-1111', None]))",
    "expected": ["47", null], "name": "Telefone ausente dá None", "hint": "Na lista, o ausente é None, não nan." },
  { "id": "ddd-lista", "checkpoint": 2, "kind": "expr", "expr": "type(extrair_ddd(pd.Series(['(11) 98765-4321']))).__name__",
    "expected": "list", "name": "extrair_ddd devolve uma lista" }
]
```

### Soluções erradas
```python name="não tira acentos"
import numpy as np
import pandas as pd


def padronizar_cidades(serie):
    return serie.str.strip().str.lower().str.replace(r"\s+", " ", regex=True)


def extrair_ddd(telefones):
    ddd = telefones.str.extract(r"\((\d{2})\)", expand=False)
    return [None if pd.isna(valor) else valor for valor in ddd]
```
```python name="ASCII sem decompor"
import numpy as np
import pandas as pd


def padronizar_cidades(serie):
    texto = serie.str.strip().str.lower().str.replace(r"\s+", " ", regex=True)
    return texto.str.encode("ascii", errors="ignore").str.decode("ascii")


def extrair_ddd(telefones):
    ddd = telefones.str.extract(r"\((\d{2})\)", expand=False)
    return [None if pd.isna(valor) else valor for valor in ddd]
```
```python name="só tira as pontas"
import numpy as np
import pandas as pd


def padronizar_cidades(serie):
    texto = serie.str.strip().str.lower()
    return texto.str.normalize("NFKD").str.encode("ascii", errors="ignore").str.decode("ascii")


def extrair_ddd(telefones):
    ddd = telefones.str.extract(r"\((\d{2})\)", expand=False)
    return [None if pd.isna(valor) else valor for valor in ddd]
```
```python name="primeira letra maiúscula"
import numpy as np
import pandas as pd


def padronizar_cidades(serie):
    texto = serie.str.strip().str.title().str.replace(r"\s+", " ", regex=True)
    return texto.str.normalize("NFKD").str.encode("ascii", errors="ignore").str.decode("ascii")


def extrair_ddd(telefones):
    ddd = telefones.str.extract(r"\((\d{2})\)", expand=False)
    return [None if pd.isna(valor) else valor for valor in ddd]
```
```python name="lista com nan"
import numpy as np
import pandas as pd


def padronizar_cidades(serie):
    texto = serie.str.strip().str.lower().str.replace(r"\s+", " ", regex=True)
    return texto.str.normalize("NFKD").str.encode("ascii", errors="ignore").str.decode("ascii")


def extrair_ddd(telefones):
    return telefones.str.extract(r"\((\d{2})\)", expand=False).tolist()
```
```python name="dois primeiros dígitos"
import numpy as np
import pandas as pd


def padronizar_cidades(serie):
    texto = serie.str.strip().str.lower().str.replace(r"\s+", " ", regex=True)
    return texto.str.normalize("NFKD").str.encode("ascii", errors="ignore").str.decode("ascii")


def extrair_ddd(telefones):
    ddd = telefones.str.extract(r"(\d{2})", expand=False)
    return [None if pd.isna(valor) else valor for valor in ddd]
```
```python name="fatia por posição"
import numpy as np
import pandas as pd


def padronizar_cidades(serie):
    texto = serie.str.strip().str.lower().str.replace(r"\s+", " ", regex=True)
    return texto.str.normalize("NFKD").str.encode("ascii", errors="ignore").str.decode("ascii")


def extrair_ddd(telefones):
    ddd = telefones.str[1:3]
    return [None if pd.isna(valor) else valor for valor in ddd]
```
```python name="extract sem expand"
import numpy as np
import pandas as pd


def padronizar_cidades(serie):
    texto = serie.str.strip().str.lower().str.replace(r"\s+", " ", regex=True)
    return texto.str.normalize("NFKD").str.encode("ascii", errors="ignore").str.decode("ascii")


def extrair_ddd(telefones):
    return telefones.str.extract(r"\((\d{2})\)").values.tolist()
```

## Passo 8 · Quiz · Tipos e conversões

### Pergunta
Uma coluna fictícia de preços tinha 2 000 linhas e 15 textos como `"sob consulta"`. Depois de `pd.to_numeric(texto.str.replace(",", ".", regex=False), errors="coerce")`, a coluna ficou com 640 ausentes, e a média de preço caiu muito. O que provavelmente aconteceu?
- [ ] O `errors="coerce"` arredonda os preços para baixo
- [ ] O `to_numeric` não aceita ponto decimal, só vírgula
- [x] Os preços com ponto de milhar, como `"1.234,56"`, viraram `"1.234.56"`, que não é número; o `coerce` os transformou em `NaN` em silêncio, e só sobraram os preços baixos
- [ ] Os 15 textos inválidos contaminaram a coluna, e por isso tudo virou `NaN` perto deles
> O ponto de milhar precisa sair antes de a vírgula virar ponto. Com o `coerce`, cada preço acima de mil reais virou `NaN` sem erro, e a média passou a ser só dos preços menores. A pista é a contagem: 15 textos inválidos não explicam 640 ausentes. O `coerce` não arredonda nada, o `to_numeric` usa ponto decimal, e um valor inválido não afeta as linhas vizinhas.

### Pergunta
Um relatório fictício mostra vendas altas em janeiro, outubro e dezembro e quase nada nos outros meses, mas a loja vende o ano todo. As datas vinham como `dd/mm/aaaa` e foram convertidas com `pd.to_datetime(df["data"], errors="coerce")`. Qual é a explicação mais provável?
- [ ] O `errors="coerce"` descarta as datas de meses com 31 dias
- [x] Sem `format`, o pandas leu as datas como mês/dia pela primeira linha; os dias até 12 viraram meses trocados e os dias acima de 12 viraram `NaT`, sumindo do relatório
- [ ] O `dtype` `datetime64[us]` só guarda datas a partir de outubro
- [ ] O `.dt.month` devolve o mês em inglês, e a tradução falhou
> Com a primeira data ambígua, o pandas adivinha `%m/%d/%Y`; datas como `13/05/2025` não cabem nesse formato e, com `coerce`, viram `NaT` sem erro. As que cabem têm dia e mês trocados, e os "meses" que sobram são os dias de 1 a 12 que mais aparecem. A correção é `format="%d/%m/%Y"`. O `coerce` não olha para o número de dias do mês, o `dtype` guarda qualquer data, e `.dt.month` devolve número, não nome.

### Pergunta
Um cadastro fictício foi agrupado por cidade e mostrou `"Lagoa Seca"`, `"lagoa seca"`, `"Lagoa Seca "` e `"Lagôa Seca"` como quatro grupos. Qual sequência junta os quatro num só?
- [ ] `astype("category")`, que agrupa textos parecidos
- [ ] `str.title()`, que põe todos com a mesma capitalização
- [ ] `drop_duplicates()` na coluna de cidade
- [x] `str.strip()`, `str.lower()` e a remoção de acentos com `str.normalize("NFKD")` seguida de `encode("ascii", errors="ignore")` e `decode("ascii")`
> Os quatro diferem em maiúsculas, espaço no fim e acento; cada passo da sequência resolve um desses. `category` guarda os textos como estão, então continuam quatro categorias. `title()` resolve só as maiúsculas, e o espaço e o acento seguem separando. `drop_duplicates` remove linhas repetidas, não junta grafias diferentes.
