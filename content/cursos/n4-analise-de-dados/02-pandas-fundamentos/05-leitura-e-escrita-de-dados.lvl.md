---
slug: n4-m2-05-leitura-e-escrita-de-dados
titulo: 'Leitura e escrita: CSV e JSON'
descricao: read_csv com separador, decimal, encoding, parse_dates, dtype e usecols; read_json; to_csv; o que fazer quando o arquivo 'não abre'.
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
- Ler CSVs brasileiros (sep=';', decimal=',', encoding latin-1) e datas com parse_dates
- Controlar dtypes e colunas na leitura e escrever CSV/JSON de volta
- Diagnosticar problemas comuns de leitura (cabeçalho, linhas de rodapé, milhares)
---

## Passo 1 · Leitura · O CSV brasileiro

Uma rede fictícia de lojas exporta as vendas de uma planilha configurada em português. O arquivo começa assim:

```text
data;loja;valor;qtd
03/02/2025;Centro;1.234,50;3
15/02/2025;Norte;89,90;1
```

`pd.read_csv("vendas.csv")` não dá erro, e esse é o problema. O separador padrão é a vírgula, e não há vírgula fora dos números, então o pandas lê **uma coluna só**, chamada `data;loja;valor;qtd`. Os CSVs gerados no Brasil costumam usar `;` entre os campos, porque a vírgula já é o separador decimal. Os parâmetros que resolvem:

```python
vendas = pd.read_csv(
    "vendas.csv",
    sep=";",               # separador de campos
    decimal=",",           # 89,90 vira 89.9
    thousands=".",         # 1.234,50 vira 1234.5
    parse_dates=["data"],  # a coluna vira data
    dayfirst=True,         # 03/02 é 3 de fevereiro
)
```

Sem `decimal`, a coluna `valor` fica com o `dtype` `str`, e a conversão posterior falha: `pd.Series(["1,5"]).astype(float)` dá `ValueError: could not convert string to float: '1,5'`. Sem `thousands`, `1.234,50` também fica como texto.

As datas são o caso mais traiçoeiro. Sem `dayfirst=True`, o pandas lê `dd/mm` como `mm/dd`, à moda americana. Se alguma data tem dia maior que 12, como `15/02/2025`, a leitura desiste e deixa a coluna como texto, sem erro. Se todas têm dia até 12, ele lê 03/02 como 2 de março, **em silêncio**. Em vez de `dayfirst`, você pode dar o formato exato: `date_format="%d/%m/%Y"`. As datas lidas têm `dtype` `datetime64[us]`.

Por isso, a primeira coisa depois de ler é conferir: `vendas.dtypes`, `vendas.head()` e `vendas.shape`. Um número com `dtype` `str` ou uma tabela de uma coluna só são sinais de que faltou um parâmetro.

Os exercícios desta lição leem arquivos que vêm com o passo, porque o executor não tem acesso à internet. Quando o CSV está num texto do programa, `io.StringIO(texto)` faz o texto se passar por um arquivo aberto:

```python
import io
pd.read_csv(io.StringIO("a;b\n1;2\n"), sep=";")
```

## Passo 2 · Previsão · O que o read_csv entendeu

O programa lê o mesmo texto cinco vezes, com parâmetros diferentes. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import io
import pandas as pd

texto = "data;loja;valor\n03/02/2025;Centro;1.234,50\n04/02/2025;Norte;89,90\n"
a = pd.read_csv(io.StringIO(texto))
print(a.shape, a.columns.tolist())
b = pd.read_csv(io.StringIO(texto), sep=";")
print(b.dtypes.astype(str).to_dict())
c = pd.read_csv(io.StringIO(texto), sep=";", decimal=",", thousands=".")
print(c["valor"].tolist())
d = pd.read_csv(io.StringIO(texto), sep=";", parse_dates=["data"])
print(d["data"].dt.strftime("%Y-%m-%d").tolist())
e = pd.read_csv(io.StringIO(texto), sep=";", parse_dates=["data"], dayfirst=True)
print(e["data"].dt.strftime("%Y-%m-%d").tolist())
```

### Dicas
1. Sem `sep`, o separador é a vírgula; a vírgula de `1.234,50` está dentro de um campo que o pandas nem chega a separar.
2. Texto no pandas 3 tem o `dtype` `str`, e um número com vírgula decimal é texto até você dizer o contrário.
3. As duas datas têm dia até 12.

### Saída esperada
```text
(2, 1) ['data;loja;valor']
{'data': 'str', 'loja': 'str', 'valor': 'str'}
[1234.5, 89.9]
['2025-03-02', '2025-04-02']
['2025-02-03', '2025-02-04']
```

## Passo 3 · Exercício · Carregar as vendas
modo: lacunas

O arquivo `vendas.csv` veio com o passo, no formato da leitura. Complete as lacunas (`___`) para que a tabela saia com os tipos certos.

### Instruções
1. `carregar_vendas(caminho)` lê o CSV do caminho recebido, com campos separados por `;`.
2. `valor` sai como `float64`, com a vírgula decimal e o ponto de milhar entendidos.
3. `data` sai como data (`datetime64[us]`), lida como dia/mês/ano.

### Código inicial
```python
import pandas as pd


def carregar_vendas(caminho):
    return pd.read_csv(
        caminho,
        sep=___,
        decimal=___,
        thousands=___,
        parse_dates=___,
        dayfirst=___,
    )
```

```text path=vendas.csv
data;loja;valor;qtd
03/02/2025;Centro;1.234,50;3
15/02/2025;Norte;89,90;1
28/02/2025;Centro;2.010,00;5
07/03/2025;Sul;45,00;2
```

### Solução
```python
import pandas as pd


def carregar_vendas(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=",",
        thousands=".",
        parse_dates=["data"],
        dayfirst=True,
    )
```

```text path=vendas.csv
data;loja;valor;qtd
03/02/2025;Centro;1.234,50;3
15/02/2025;Norte;89,90;1
28/02/2025;Centro;2.010,00;5
07/03/2025;Sul;45,00;2
```

### Dicas
1. Os três primeiros parâmetros são textos de um caractere; abra o arquivo e veja quais caracteres ele usa.
2. `parse_dates` recebe a lista das colunas que são datas.
3. Num arquivo em que todas as datas têm dia até 12, ler mês/dia não dá erro nenhum: só datas erradas.

### Verificação
```json
[
  { "id": "colunas", "checkpoint": 1, "kind": "expr", "expr": "list(carregar_vendas(\"vendas.csv\").columns)",
    "expected": ["data", "loja", "valor", "qtd"], "name": "Quatro colunas separadas", "hint": "Uma coluna só quer dizer que o separador está errado." },
  { "id": "linhas", "checkpoint": 1, "kind": "expr", "expr": "len(carregar_vendas(\"vendas.csv\"))", "expected": 4, "name": "Quatro vendas" },
  { "id": "dtypes", "checkpoint": 2, "kind": "expr", "expr": "carregar_vendas(\"vendas.csv\").dtypes.astype(str).to_dict()",
    "expected": { "data": "datetime64[us]", "loja": "str", "valor": "float64", "qtd": "int64" },
    "name": "Os tipos das quatro colunas", "hint": "Confira cada coluna que saiu como str sem ser texto." },
  { "id": "valores", "checkpoint": 2, "kind": "expr", "expr": "carregar_vendas(\"vendas.csv\")[\"valor\"].tolist()",
    "expected": [1234.5, 89.9, 2010.0, 45.0], "tolerance": 1e-9, "name": "Os valores, com milhar e decimal" },
  { "id": "datas", "checkpoint": 3, "kind": "expr", "expr": "carregar_vendas(\"vendas.csv\")[\"data\"].dt.strftime(\"%Y-%m-%d\").tolist()",
    "expected": ["2025-02-03", "2025-02-15", "2025-02-28", "2025-03-07"], "name": "As datas do arquivo como dia/mês/ano" },
  { "id": "outro-arquivo", "checkpoint": 3, "kind": "expr",
    "setup": "open(\"abril.csv\", \"w\", encoding=\"utf-8\").write(\"data;loja;valor;qtd\\n01/04/2025;Sul;1.000,00;1\\n02/04/2025;Norte;9,99;2\\n\")",
    "expr": "carregar_vendas(\"abril.csv\")[\"data\"].dt.strftime(\"%Y-%m-%d\").tolist()", "expected": ["2025-04-01", "2025-04-02"],
    "name": "Outro arquivo, só com dias até 12: 1º e 2 de abril", "hint": "Aqui, ler mês/dia não dá erro: dá janeiro e fevereiro." },
  { "id": "outro-valores", "checkpoint": 1, "kind": "expr",
    "setup": "open(\"abril.csv\", \"w\", encoding=\"utf-8\").write(\"data;loja;valor;qtd\\n01/04/2025;Sul;1.000,00;1\\n02/04/2025;Norte;9,99;2\\n\")",
    "expr": "carregar_vendas(\"abril.csv\")[\"valor\"].tolist()", "expected": [1000.0, 9.99], "tolerance": 1e-9,
    "name": "A função lê o arquivo do caminho recebido" }
]
```

### Soluções erradas
```python name="separador vírgula"
import pandas as pd


def carregar_vendas(caminho):
    return pd.read_csv(
        caminho,
        sep=",",
        decimal=",",
        thousands=".",
        parse_dates=["data"],
        dayfirst=True,
    )
```
```python name="decimal ponto"
import pandas as pd


def carregar_vendas(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=".",
        thousands=".",
        parse_dates=["data"],
        dayfirst=True,
    )
```
```python name="milhar com vírgula"
import pandas as pd


def carregar_vendas(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=",",
        thousands=",",
        parse_dates=["data"],
        dayfirst=True,
    )
```
```python name="parse_dates sem a lista de colunas"
import pandas as pd


def carregar_vendas(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=",",
        thousands=".",
        parse_dates=True,
        dayfirst=True,
    )
```
```python name="mês antes do dia"
import pandas as pd


def carregar_vendas(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=",",
        thousands=".",
        parse_dates=["data"],
        dayfirst=False,
    )
```

## Passo 4 · Leitura · Cabeçalho, rodapé e ausentes

Muitos arquivos não começam pela tabela. Um relatório exportado por um sistema fictício de lojas tem duas linhas de título antes do cabeçalho e uma linha de total no fim:

```text
Relatório de vendas por loja
Gerado em 01/03/2025
loja;valor;devolucoes
Centro;10,50;2
Norte;3,00;-
Sul;7,25;0
Total;20,75;2
```

Lido com `sep=";"` e nada mais, o pandas toma a primeira linha como cabeçalho, com um campo só, e para na terceira: `ParserError: Error tokenizing data. C error: Expected 1 fields in line 3, saw 3`. A mensagem diz o que procurar: a linha em que o número de campos mudou.

`skiprows=2` pula as duas linhas de título. `skipfooter=1` descarta a última linha, mas só funciona com o leitor escrito em Python: sem `engine="python"`, o pandas troca de leitor sozinho e avisa com `ParserWarning: Falling back to the 'python' engine because the 'c' engine does not support skipfooter; you can avoid this warning by specifying engine='python'.` Esquecer o rodapé é pior que o aviso: a linha "Total" entra na tabela e dobra qualquer soma.

O traço de "Norte" quer dizer "sem informação". Para o pandas, é só um texto, e a coluna inteira vira `str`. `na_values=["-"]` diz quais textos valem como ausentes; células vazias e `NA` já são ausentes por padrão. Com um `NaN` na coluna, `devolucoes` sai `float64`, porque o `int64` não tem como guardar ausentes.

Dois parâmetros controlam o que entra. `usecols=["loja", "valor"]` lê só essas colunas, o que economiza memória em arquivos largos. `dtype={"cep": str}` fixa o tipo de uma coluna: sem ele, o CEP `01234` vira o inteiro `1234` e perde o zero; o mesmo acontece com códigos de produto e telefones.

O último obstáculo é a codificação. Arquivos de sistemas antigos costumam vir em `latin-1`, em que `ã` ocupa um byte, e o padrão do pandas é `utf-8`, em que `ã` ocupa dois. O erro aparece no primeiro acento:

```text
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe3 in position 28: invalid continuation byte
```

`0xe3` é o `ã` em `latin-1`. A solução é `encoding="latin-1"` (ou `"cp1252"`, a variante do Windows). Trocar a codificação até o erro sumir não basta: uma codificação errada que não dá erro troca os acentos por outros caracteres. Confira os nomes depois de ler.

## Passo 5 · Exercício · Arquivos difíceis

Dois arquivos que "não abrem": o relatório da leitura, que veio com o passo, e um cadastro de cidades fictícias exportado em `latin-1`, com as colunas `cep`, `cidade` e `populacao`.

### Instruções
1. `ler_relatorio(caminho)` lê um relatório no formato da leitura (duas linhas de título, separador `;`, vírgula decimal, uma linha de total no fim) e devolve só as lojas, com as colunas `loja`, `valor` e `devolucoes`.
2. Em `ler_relatorio`, um `-` na tabela é valor ausente, e `valor` e `devolucoes` saem numéricos.
3. `ler_latin1(caminho)` lê o cadastro (separador `;`, codificação `latin-1`) e mantém o `cep` como texto, com os zeros à esquerda.

### Código inicial
```python
import pandas as pd


def ler_relatorio(caminho):
    pass


def ler_latin1(caminho):
    pass
```

```text path=relatorio.csv
Relatório de vendas por loja
Gerado em 01/03/2025
loja;valor;devolucoes
Centro;10,50;2
Norte;3,00;-
Sul;7,25;0
Total;20,75;2
```

### Solução
```python
import pandas as pd


def ler_relatorio(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=",",
        skiprows=2,
        skipfooter=1,
        engine="python",
        na_values=["-"],
    )


def ler_latin1(caminho):
    return pd.read_csv(caminho, sep=";", encoding="latin-1", dtype={"cep": str})
```

```text path=relatorio.csv
Relatório de vendas por loja
Gerado em 01/03/2025
loja;valor;devolucoes
Centro;10,50;2
Norte;3,00;-
Sul;7,25;0
Total;20,75;2
```

### Dicas
1. Conte as linhas antes do cabeçalho e depois da última loja.
2. Uma coluna de números com um texto no meio vira texto inteira.
3. O erro de codificação aponta o byte do primeiro acento; e um número lido sem `dtype` perde os zeros à esquerda.

### Verificação
```json
[
  { "id": "relatorio-lojas", "checkpoint": 1, "kind": "expr", "expr": "ler_relatorio(\"relatorio.csv\")[\"loja\"].tolist()",
    "expected": ["Centro", "Norte", "Sul"], "name": "Só as três lojas, sem o título nem o total", "hint": "A linha Total não é uma loja." },
  { "id": "relatorio-colunas", "checkpoint": 1, "kind": "expr", "expr": "list(ler_relatorio(\"relatorio.csv\").columns)",
    "expected": ["loja", "valor", "devolucoes"], "name": "O cabeçalho certo", "hint": "Quantas linhas vêm antes do cabeçalho?" },
  { "id": "relatorio-valor", "checkpoint": 2, "kind": "expr", "expr": "ler_relatorio(\"relatorio.csv\")[\"valor\"].tolist()",
    "expected": [10.5, 3.0, 7.25], "tolerance": 1e-9, "name": "Os valores com vírgula decimal" },
  { "id": "relatorio-ausente", "checkpoint": 2, "kind": "expr", "expr": "ler_relatorio(\"relatorio.csv\")[\"devolucoes\"].isna().tolist()",
    "expected": [false, true, false], "name": "O traço de Norte é ausente", "hint": "Diga ao read_csv quais textos valem como ausentes." },
  { "id": "relatorio-dtypes", "checkpoint": 2, "kind": "expr", "expr": "ler_relatorio(\"relatorio.csv\").dtypes.astype(str).to_dict()",
    "expected": { "loja": "str", "valor": "float64", "devolucoes": "float64" }, "name": "Os tipos das três colunas" },
  { "id": "relatorio-outro", "checkpoint": 1, "kind": "expr",
    "setup": "open(\"r2.csv\", \"w\", encoding=\"utf-8\").write(\"Relatório de vendas por loja\\nGerado em 01/04/2025\\nloja;valor;devolucoes\\nLeste;1,25;-\\nTotal;1,25;0\\n\")",
    "expr": "ler_relatorio(\"r2.csv\")[\"valor\"].tolist()", "expected": [1.25], "tolerance": 1e-9,
    "name": "Outro relatório, com uma loja só" },
  { "id": "latin1-cidades", "checkpoint": 3, "kind": "expr",
    "setup": "open(\"cadastro.csv\", \"wb\").write(\"cep;cidade;populacao\\n01234;São Bento do Leste;12000\\n09870;Lagoa Açu;8500\\n\".encode(\"latin-1\"))",
    "expr": "ler_latin1(\"cadastro.csv\")[\"cidade\"].tolist()", "expected": ["São Bento do Leste", "Lagoa Açu"],
    "name": "Os nomes com acento", "hint": "O arquivo não está em utf-8." },
  { "id": "latin1-cep", "checkpoint": 3, "kind": "expr",
    "setup": "open(\"cadastro.csv\", \"wb\").write(\"cep;cidade;populacao\\n01234;São Bento do Leste;12000\\n09870;Lagoa Açu;8500\\n\".encode(\"latin-1\"))",
    "expr": "ler_latin1(\"cadastro.csv\")[\"cep\"].tolist()", "expected": ["01234", "09870"],
    "name": "O CEP mantém o zero à esquerda", "hint": "Sem dizer o tipo, o pandas lê 01234 como número." },
  { "id": "latin1-dtypes", "checkpoint": 3, "kind": "expr",
    "setup": "open(\"cadastro.csv\", \"wb\").write(\"cep;cidade;populacao\\n01234;São Bento do Leste;12000\\n09870;Lagoa Açu;8500\\n\".encode(\"latin-1\"))",
    "expr": "ler_latin1(\"cadastro.csv\").dtypes.astype(str).to_dict()",
    "expected": { "cep": "str", "cidade": "str", "populacao": "int64" }, "name": "Os tipos do cadastro" }
]
```

### Soluções erradas
```python name="pula só uma linha de título"
import pandas as pd


def ler_relatorio(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=",",
        skiprows=1,
        skipfooter=1,
        engine="python",
        na_values=["-"],
    )


def ler_latin1(caminho):
    return pd.read_csv(caminho, sep=";", encoding="latin-1", dtype={"cep": str})
```
```python name="esquece o rodapé"
import pandas as pd


def ler_relatorio(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=",",
        skiprows=2,
        na_values=["-"],
    )


def ler_latin1(caminho):
    return pd.read_csv(caminho, sep=";", encoding="latin-1", dtype={"cep": str})
```
```python name="traço como texto"
import pandas as pd


def ler_relatorio(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=",",
        skiprows=2,
        skipfooter=1,
        engine="python",
    )


def ler_latin1(caminho):
    return pd.read_csv(caminho, sep=";", encoding="latin-1", dtype={"cep": str})
```
```python name="sem a vírgula decimal"
import pandas as pd


def ler_relatorio(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        skiprows=2,
        skipfooter=1,
        engine="python",
        na_values=["-"],
    )


def ler_latin1(caminho):
    return pd.read_csv(caminho, sep=";", encoding="latin-1", dtype={"cep": str})
```
```python name="codificação padrão"
import pandas as pd


def ler_relatorio(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=",",
        skiprows=2,
        skipfooter=1,
        engine="python",
        na_values=["-"],
    )


def ler_latin1(caminho):
    return pd.read_csv(caminho, sep=";", dtype={"cep": str})
```
```python name="CEP lido como número"
import pandas as pd


def ler_relatorio(caminho):
    return pd.read_csv(
        caminho,
        sep=";",
        decimal=",",
        skiprows=2,
        skipfooter=1,
        engine="python",
        na_values=["-"],
    )


def ler_latin1(caminho):
    return pd.read_csv(caminho, sep=";", encoding="latin-1")
```

## Passo 6 · Leitura · Escrever de volta

Depois de limpar uma tabela, você costuma devolvê-la para alguém: um CSV para a planilha do financeiro, um JSON para um sistema. `to_csv` escreve num arquivo, se receber um caminho, ou devolve o texto, se não receber:

```python
tabela.to_csv("limpo.csv", index=False)
texto = tabela.to_csv(sep=";", decimal=",", index=False)   # 'produto;preco\nCafé;12,5\n...'
```

O `index=False` importa. Por padrão, o `to_csv` grava o índice como primeira coluna, sem nome. Quem lê de volta recebe uma coluna a mais chamada `Unnamed: 0`, com 0, 1, 2…, e ela se acumula a cada ida e volta. Grave o índice só quando ele tem significado (uma data, um código), e então dê um nome a ele com `rename_axis`.

`sep=";"` e `decimal=","` produzem o formato que uma planilha configurada em português abre direto. O texto sai em UTF-8; para um sistema antigo que só entende `latin-1`, passe `encoding="latin-1"` ao gravar o arquivo.

Para JSON, o formato mais comum entre sistemas é a lista de registros, um objeto por linha:

```python
tabela.to_json("limpo.json", orient="records", force_ascii=False)
# [{"produto":"Café","preco":12.5},{"produto":"Chá","preco":8.0}]
```

Sem `force_ascii=False`, os acentos saem como `é`, o que é válido, mas ilegível. Para ler, `pd.read_json` aceita um caminho ou um objeto de arquivo. No pandas 3, um **texto** JSON passado direto é tratado como nome de arquivo: `pd.read_json('[{"a": 1}]')` dá `FileNotFoundError: File [{"a": 1}] does not exist`. Com o texto numa variável, envolva-o em `io.StringIO`, como no `read_csv`.

O `read_json` também adivinha tipos, e erra como o `read_csv`: um código `"00123"`, entre aspas no JSON, vira o inteiro 123. `dtype={"codigo": str}` mantém o texto. Uma chave que falta num registro vira `NaN`, como na lista de dicionários do `DataFrame`.

Ler o que você mesmo gravou é o melhor teste: `pd.read_csv(io.StringIO(texto), sep=";", decimal=",")` tem de devolver a mesma tabela, com os mesmos tipos e sem colunas a mais.

## Passo 7 · Exercício · Exportar e ler JSON

A loja manda as vendas para a planilha do financeiro e recebe o catálogo de um fornecedor fictício em JSON.

### Instruções
1. `exportar(df)` devolve o CSV de `df` como texto, com `;` entre os campos, vírgula decimal e sem o índice.
2. `ler_json_registros(texto)` recebe um texto JSON com uma lista de registros e devolve o DataFrame correspondente; chave ausente num registro vira `NaN`.
3. Em `ler_json_registros`, a coluna `codigo` continua texto, com os zeros à esquerda.

### Código inicial
```python
import io
import pandas as pd


def exportar(df):
    pass


def ler_json_registros(texto):
    pass
```

### Solução
```python
import io
import pandas as pd


def exportar(df):
    return df.to_csv(sep=";", decimal=",", index=False)


def ler_json_registros(texto):
    return pd.read_json(io.StringIO(texto), dtype={"codigo": str})
```

### Dicas
1. Sem caminho, o `to_csv` devolve o texto em vez de gravar.
2. Por padrão, o índice também é gravado.
3. No pandas 3, um texto JSON passado direto ao `read_json` é tratado como nome de arquivo.

### Verificação
```json
[
  { "id": "csv-texto", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nE = pd.DataFrame({\"produto\": [\"Café\", \"Chá\"], \"preco\": [12.5, 8.0], \"qtd\": [3, 10]}, index=[7, 9])",
    "expr": "exportar(E)", "expected": "produto;preco;qtd\nCafé;12,5;3\nChá;8,0;10\n",
    "name": "O CSV exato de duas vendas", "hint": "Confira o separador, a vírgula decimal e a primeira coluna." },
  { "id": "csv-cabecalho", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nE = pd.DataFrame({\"produto\": [\"Café\", \"Chá\"], \"preco\": [12.5, 8.0], \"qtd\": [3, 10]}, index=[7, 9])",
    "expr": "exportar(E).splitlines()[0]", "expected": "produto;preco;qtd", "name": "O cabeçalho tem só as colunas", "hint": "O índice não é uma coluna." },
  { "id": "csv-ida-e-volta", "checkpoint": 1, "kind": "expr",
    "setup": "import io\nimport pandas as pd\nE = pd.DataFrame({\"produto\": [\"Café\", \"Chá\", \"Mate\"], \"preco\": [12.5, 8.0, 1234.75], \"qtd\": [3, 10, 1]})",
    "expr": "pd.read_csv(io.StringIO(exportar(E)), sep=\";\", decimal=\",\").to_dict(\"list\")",
    "expected": { "produto": ["Café", "Chá", "Mate"], "preco": [12.5, 8.0, 1234.75], "qtd": [3, 10, 1] }, "tolerance": 1e-9,
    "name": "Lido de volta, o CSV dá a mesma tabela" },
  { "id": "csv-vazio", "checkpoint": 1, "kind": "expr",
    "setup": "import pandas as pd\nE = pd.DataFrame(columns=[\"produto\", \"preco\"])",
    "expr": "exportar(E)", "expected": "produto;preco\n", "name": "Tabela vazia: só o cabeçalho" },
  { "id": "json-colunas", "checkpoint": 2, "kind": "expr",
    "setup": "T = '[{\"codigo\": \"00123\", \"produto\": \"Café\", \"preco\": 12.5}, {\"codigo\": \"04560\", \"produto\": \"Chá\"}]'",
    "expr": "[list(ler_json_registros(T).columns), len(ler_json_registros(T))]", "expected": [["codigo", "produto", "preco"], 2],
    "name": "Três colunas e duas linhas", "hint": "O texto é o conteúdo, não o nome de um arquivo." },
  { "id": "json-ausente", "checkpoint": 2, "kind": "expr",
    "setup": "T = '[{\"codigo\": \"00123\", \"produto\": \"Café\", \"preco\": 12.5}, {\"codigo\": \"04560\", \"produto\": \"Chá\"}]'",
    "expr": "ler_json_registros(T)[\"preco\"].isna().tolist()", "expected": [false, true], "name": "O preço que falta é NaN" },
  { "id": "json-codigo", "checkpoint": 3, "kind": "expr",
    "setup": "T = '[{\"codigo\": \"00123\", \"produto\": \"Café\", \"preco\": 12.5}, {\"codigo\": \"04560\", \"produto\": \"Chá\"}]'",
    "expr": "ler_json_registros(T)[\"codigo\"].tolist()", "expected": ["00123", "04560"],
    "name": "Os códigos mantêm os zeros", "hint": "O read_json converte o que parece número." },
  { "id": "json-dtypes", "checkpoint": 3, "kind": "expr",
    "setup": "T = '[{\"codigo\": \"00123\", \"produto\": \"Café\", \"preco\": 12.5}, {\"codigo\": \"04560\", \"produto\": \"Chá\"}]'",
    "expr": "ler_json_registros(T).dtypes.astype(str).to_dict()", "expected": { "codigo": "str", "produto": "str", "preco": "float64" },
    "name": "Os tipos das três colunas" },
  { "id": "json-um", "checkpoint": 2, "kind": "expr",
    "setup": "T = '[{\"codigo\": \"7\", \"produto\": \"Mate\", \"preco\": 3.0}]'",
    "expr": "ler_json_registros(T).to_dict(\"records\")", "expected": [{ "codigo": "7", "produto": "Mate", "preco": 3.0 }],
    "name": "Um registro só" }
]
```

### Soluções erradas
```python name="grava o índice"
import io
import pandas as pd


def exportar(df):
    return df.to_csv(sep=";", decimal=",")


def ler_json_registros(texto):
    return pd.read_json(io.StringIO(texto), dtype={"codigo": str})
```
```python name="separador padrão"
import io
import pandas as pd


def exportar(df):
    return df.to_csv(decimal=",", index=False)


def ler_json_registros(texto):
    return pd.read_json(io.StringIO(texto), dtype={"codigo": str})
```
```python name="decimal com ponto"
import io
import pandas as pd


def exportar(df):
    return df.to_csv(sep=";", index=False)


def ler_json_registros(texto):
    return pd.read_json(io.StringIO(texto), dtype={"codigo": str})
```
```python name="texto JSON direto no read_json"
import io
import pandas as pd


def exportar(df):
    return df.to_csv(sep=";", decimal=",", index=False)


def ler_json_registros(texto):
    return pd.read_json(texto, dtype={"codigo": str})
```
```python name="códigos convertidos em número"
import io
import pandas as pd


def exportar(df):
    return df.to_csv(sep=";", decimal=",", index=False)


def ler_json_registros(texto):
    return pd.read_json(io.StringIO(texto))
```

## Passo 8 · Quiz · Leitura sem surpresas

### Pergunta
Um arquivo de março tem datas como `05/03/2025` e `10/03/2025`, todas com dia até 12. Ele foi lido com `pd.read_csv(caminho, sep=";", parse_dates=["data"])`, sem erro, mas o gráfico mostra vendas em maio e outubro. O que aconteceu?
- [ ] O `parse_dates` falhou e as datas ficaram como texto, ordenadas alfabeticamente
- [x] Sem `dayfirst=True` (ou `date_format="%d/%m/%Y"`), o pandas leu mês/dia, e como nenhum dia passa de 12 nenhuma data deu erro
- [ ] O arquivo está em `latin-1`, e as barras foram trocadas na leitura
- [ ] O separador `;` faz o pandas inverter os campos de data
> Sem indicação, o pandas lê `05/03/2025` como 3 de maio. Se alguma data tivesse dia maior que 12, a coluna ficaria como texto, o que pelo menos chamaria atenção; com todos os dias até 12, a troca é silenciosa. Se as datas tivessem ficado como texto, não haveria meses no gráfico. A codificação só afeta caracteres fora do ASCII, e o separador não mexe no conteúdo dos campos.

### Pergunta
`pd.read_csv("clientes.csv", sep=";")` dá `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xe3 in position 41: invalid continuation byte`. Qual é o melhor próximo passo?
- [ ] Passar `encoding_errors="ignore"` para o pandas pular os bytes problemáticos
- [x] Ler com `encoding="latin-1"` e conferir se os nomes com acento saíram certos
- [ ] Trocar o separador para `,`, porque o erro está na posição de um campo
- [ ] Passar `dtype=str`, para que todas as colunas sejam lidas como texto
> `0xe3` é o `ã` em `latin-1`: o arquivo não está em UTF-8. `encoding="latin-1"` lê os acentos, e conferir os nomes confirma a escolha. Ignorar os erros apaga letras dos nomes em silêncio. O separador não tem nada a ver com a decodificação, e `dtype` só age depois que os bytes já viraram texto: o erro acontece antes.

### Pergunta
Uma rotina lê `base.csv`, corrige alguns valores e grava de volta com `tabela.to_csv("base.csv")`. Depois de três dias, o arquivo tem as colunas `Unnamed: 0`, `Unnamed: 0.1` e `Unnamed: 0.2` antes dos dados. Qual é a causa?
- [ ] O `read_csv` cria uma coluna nova para o índice a cada leitura
- [x] O `to_csv` grava o índice por padrão; cada leitura transforma esse índice numa coluna sem nome, e a próxima gravação acrescenta outro
- [ ] O arquivo foi gravado em `latin-1` e lido em `utf-8`
- [ ] Faltou `sep=";"` na gravação
> Sem `index=False`, o `to_csv` grava o índice 0, 1, 2… como primeira coluna, sem nome no cabeçalho. O `read_csv` lê essa coluna como dados e a chama `Unnamed: 0`, e a nova gravação acrescenta mais um índice. Com `index=False` na gravação, ou `index_col=0` na leitura, a coluna para de se acumular. Codificação e separador não criam colunas a mais.
