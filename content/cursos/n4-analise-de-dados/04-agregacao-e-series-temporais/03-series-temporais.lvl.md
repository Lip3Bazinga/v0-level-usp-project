---
slug: n4-m4-03-series-temporais
titulo: 'Séries temporais: resample, rolling e deslocamento'
descricao: Índice de datas, seleção por período, reamostragem (diário → mensal), médias móveis, shift e variação percentual, sazonalidade básica.
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
- Indexar por datas, selecionar períodos e reamostrar com resample
- Calcular médias móveis, variação percentual e acumulados com rolling, pct_change e cumsum
- Comparar períodos (ano contra ano) e identificar sazonalidade simples por mês ou dia da semana
---

## Passo 1 · Leitura · Índice de datas

Uma padaria fictícia registra o faturamento de cada dia numa tabela com as colunas `data` e `valor`. As perguntas são todas sobre tempo: quanto entrou em março, qual foi o total de cada mês, como a semana passada se compara com a anterior. Com as datas no **índice**, o pandas responde a todas com uma linha:

```python
vendas["data"] = pd.to_datetime(vendas["data"], format="%Y-%m-%d")
serie = vendas.set_index("data")["valor"]

serie.loc["2025-03"]                        # todos os dias de março
serie.loc["2025-03-10":"2025-03-16"]        # uma semana, com as duas pontas
mensal = serie.resample("ME").sum()         # um total por mês
```

O índice agora é um `DatetimeIndex`, e um texto parcial como `"2025-03"` seleciona o período inteiro. Isso só funciona se as datas forem datas de verdade. Se a coluna ficou como texto, o índice é de texto, e `serie.loc["2025-03"]` procura um rótulo exatamente igual a `"2025-03"`: `KeyError: '2025-03'`. Confira `serie.index.dtype`: precisa ser `datetime64[us]`.

O `resample` é um `groupby` por período: divide a linha do tempo em blocos (`"D"` dia, `"W"` semana, `"ME"` mês, `"QE"` trimestre, `"YE"` ano), aplica a função e combina. Ele exige o índice de datas; numa tabela com o índice padrão, a mensagem é

```text
TypeError: Only valid with DatetimeIndex, TimedeltaIndex or PeriodIndex, but got an instance of 'RangeIndex'
```

e a saída é `set_index("data")` ou `resample("ME", on="data")`. O código do mês mudou no pandas 3: o antigo `"M"` dá `ValueError: Invalid frequency: M`, com a explicação `'M' is no longer supported for offsets. Please use 'ME' instead.` O `"ME"` rotula cada mês pelo **último** dia (`2025-01-31`); `"MS"` rotula pelo primeiro. Para um rótulo legível, `mensal.index.strftime("%Y-%m")` dá `"2025-01"`; cuidado com `%M`, que é **minuto**, não mês.

Um detalhe que costuma passar despercebido: o `resample` cria todos os períodos entre a primeira e a última data. Um mês sem nenhuma venda aparece com soma 0, contagem 0 e média `NaN`. O `asfreq("D")` faz parecido sem agregar: põe a série na grade diária e deixa `NaN` nos dias que faltam, o que torna as lacunas visíveis.

## Passo 2 · Exercício · Total por mês
modo: lacunas

A tabela tem as colunas `data` (já convertida para datas) e `valor`. Complete as lacunas (`___`) para produzir o total de cada mês num dicionário que um relatório consome.

### Instruções
1. `total_mensal(df)` devolve um dicionário `{"AAAA-MM": total do mês}`, com os meses em ordem crescente.
2. Todo mês entre a primeira e a última venda aparece; mês sem venda vale 0.
3. Valores ausentes não entram na soma, e a tabela recebida não muda.

### Código inicial
```python
import numpy as np
import pandas as pd


def total_mensal(df):
    serie = df.set_index(___)["valor"]
    mensal = serie.resample(___).___()
    return dict(zip(mensal.index.strftime(___), mensal.tolist()))
```

### Solução
```python
import numpy as np
import pandas as pd


def total_mensal(df):
    serie = df.set_index("data")["valor"]
    mensal = serie.resample("ME").sum()
    return dict(zip(mensal.index.strftime("%Y-%m"), mensal.tolist()))
```

### Dicas
1. O código do mês no pandas 3 tem duas letras.
2. No `strftime`, maiúscula e minúscula mudam o significado: uma das letras é minuto.
3. O total do mês é uma soma, não uma média nem uma contagem.

### Verificação
```json
[
  { "id": "basico", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.to_datetime(['2025-01-05', '2025-01-20', '2025-03-02', '2025-03-31']), 'valor': [100.0, 50.0, 30.0, 20.0]})",
    "expr": "total_mensal(d)", "expected": { "2025-01": 150.0, "2025-02": 0.0, "2025-03": 50.0 },
    "name": "Total de cada mês, de janeiro a março", "hint": "As chaves têm ano e mês, como \"2025-01\"." },
  { "id": "mes-vazio", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.to_datetime(['2025-01-05', '2025-04-02']), 'valor': [10.0, 40.0]})",
    "expr": "total_mensal(d)", "expected": { "2025-01": 10.0, "2025-02": 0.0, "2025-03": 0.0, "2025-04": 40.0 },
    "name": "Meses sem venda no meio valem 0" },
  { "id": "virada-de-ano", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.to_datetime(['2024-12-10', '2025-01-15', '2024-12-28']), 'valor': [5.0, 7.0, 3.0]})",
    "expr": "list(total_mensal(d).items())", "expected": [["2024-12", 8.0], ["2025-01", 7.0]],
    "name": "Dezembro de 2024 e janeiro de 2025, nessa ordem", "hint": "A chave precisa distinguir os anos." },
  { "id": "fora-de-ordem", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.to_datetime(['2025-03-15', '2025-01-02', '2025-02-20', '2025-01-30']), 'valor': [3.0, 1.0, 2.0, 4.0]})",
    "expr": "list(total_mensal(d).keys())", "expected": ["2025-01", "2025-02", "2025-03"],
    "name": "Linhas fora de ordem: meses em ordem crescente" },
  { "id": "mesmo-dia", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.to_datetime(['2025-05-31 09:00', '2025-05-31 18:30', '2025-06-01 08:00']), 'valor': [10.0, 15.0, 4.0]})",
    "expr": "total_mensal(d)", "expected": { "2025-05": 25.0, "2025-06": 4.0 },
    "name": "Vendas com horário entram no mês do dia" },
  { "id": "ausente", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.to_datetime(['2025-02-01', '2025-02-10', '2025-02-20']), 'valor': [10.0, np.nan, 5.0]})",
    "expr": "total_mensal(d)", "expected": { "2025-02": 15.0 }, "name": "Valor ausente não entra na soma" },
  { "id": "uma-venda", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.to_datetime(['2025-06-12']), 'valor': [42.0]})",
    "expr": "total_mensal(d)", "expected": { "2025-06": 42.0 }, "name": "Uma venda só" },
  { "id": "entrada", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.to_datetime(['2025-01-05', '2025-02-07']), 'valor': [1.0, 2.0]})\nr = total_mensal(d)",
    "expr": "[list(d.columns), d.index.tolist()]", "expected": [["data", "valor"], [0, 1]], "name": "A tabela recebida não muda" }
]
```

### Soluções erradas
```python name="código antigo do mês"
import numpy as np
import pandas as pd


def total_mensal(df):
    serie = df.set_index("data")["valor"]
    mensal = serie.resample("M").sum()
    return dict(zip(mensal.index.strftime("%Y-%m"), mensal.tolist()))
```
```python name="minuto no lugar do mês"
import numpy as np
import pandas as pd


def total_mensal(df):
    serie = df.set_index("data")["valor"]
    mensal = serie.resample("ME").sum()
    return dict(zip(mensal.index.strftime("%Y-%M"), mensal.tolist()))
```
```python name="chave sem o ano"
import numpy as np
import pandas as pd


def total_mensal(df):
    serie = df.set_index("data")["valor"]
    mensal = serie.resample("ME").sum()
    return dict(zip(mensal.index.strftime("%m"), mensal.tolist()))
```
```python name="média do mês"
import numpy as np
import pandas as pd


def total_mensal(df):
    serie = df.set_index("data")["valor"]
    mensal = serie.resample("ME").mean()
    return dict(zip(mensal.index.strftime("%Y-%m"), mensal.tolist()))
```
```python name="conta as vendas"
import numpy as np
import pandas as pd


def total_mensal(df):
    serie = df.set_index("data")["valor"]
    mensal = serie.resample("ME").count()
    return dict(zip(mensal.index.strftime("%Y-%m"), mensal.tolist()))
```
```python name="reamostra por dia"
import numpy as np
import pandas as pd


def total_mensal(df):
    serie = df.set_index("data")["valor"]
    mensal = serie.resample("D").sum()
    return dict(zip(mensal.index.strftime("%Y-%m"), mensal.tolist()))
```

## Passo 3 · Previsão · rolling e min_periods

Cinco dias de vendas, uma janela de 3 dias e alguns deslocamentos. Leia sem executar e digite exatamente o que o programa imprime.

### Código
```python
import pandas as pd

vendas = pd.Series([4.0, 8.0, 6.0, 10.0, 2.0],
                   index=pd.date_range("2025-03-01", periods=5, freq="D"))
print(vendas.rolling(3).mean().tolist())
print(vendas.rolling(3, min_periods=1).mean().tolist())
print(vendas.rolling(3, min_periods=2).sum().tolist())
print(vendas.rolling(3, center=True).mean().tolist())
print(vendas.shift(1).tolist())
print(vendas.diff().tolist())
print(vendas.cumsum().tolist())
```

### Dicas
1. `rolling(3)` olha a linha atual e as duas anteriores; sem `min_periods`, uma janela incompleta dá `NaN`.
2. Com `center=True`, a janela fica centrada: a linha anterior, a atual e a **seguinte**.
3. `shift(1)` empurra os valores uma posição para baixo; `diff()` é o valor menos o anterior; `cumsum()` acumula.

### Saída esperada
```text
[nan, nan, 6.0, 8.0, 6.0]
[4.0, 6.0, 6.0, 8.0, 6.0]
[nan, 12.0, 18.0, 24.0, 18.0]
[nan, 6.0, 8.0, 6.0, nan]
[nan, 4.0, 8.0, 6.0, 10.0]
[nan, 4.0, -2.0, 4.0, -8.0]
[4.0, 12.0, 18.0, 28.0, 30.0]
```

## Passo 4 · Leitura · Janelas e deslocamentos

O faturamento diário oscila: segunda fraca, sábado forte, um feriado no meio. A **média móvel** suaviza a oscilação: `serie.rolling(7).mean()` dá, em cada dia, a média daquele dia e dos seis anteriores. Como a Previsão mostrou, os primeiros seis dias saem `NaN`, porque a janela ainda não tem sete valores; `min_periods=1` aceita janelas incompletas no começo, à custa de médias de poucos dias. Com lacunas no calendário, a janela por linhas mistura datas distantes; `rolling("7D")` usa sete dias de calendário.

O `center=True` produz uma curva bonita para um gráfico, mas a média do dia 10 passa a usar o dia 11. Se essa média vira uma variável para **prever** o dia seguinte, o modelo enxerga o futuro na hora de treinar e falha na hora de usar: é um **vazamento**, assunto que volta no Nível 5. Para previsão, a janela olha só para trás.

O `shift` desloca a série inteira. `serie.shift(1)` põe, em cada dia, o valor do dia **anterior**; `serie.shift(-1)` põe o do dia seguinte, a direção que vaza o futuro. Com o deslocamento vêm as comparações:

```python
serie.diff()          # valor menos o anterior
serie.pct_change()    # valor / anterior - 1: a variação relativa
serie.cumsum()        # total acumulado até o dia
```

A variação relativa tem duas armadilhas. Depois de um zero, a divisão dá infinito, e o `NaN` não é preenchido (no pandas 3, o `pct_change` não repete o valor anterior):

```python
pd.Series([0.0, 5.0, 10.0, np.nan, 12.0]).pct_change().tolist()
# [nan, inf, 1.0, nan, nan]
```

Uma loja fechada para reforma em março produz um "crescimento infinito" em abril. Troque os infinitos por ausentes, com `replace([np.inf, -np.inf], np.nan)`, e diga no relatório que não há base de comparação.

Numa série mensal com sazonalidade, comparar com o mês anterior engana: dezembro sempre vende mais que novembro. A comparação honesta é **ano contra ano**, com o mesmo mês do ano anterior: `mensal.pct_change(12)`, ou `mensal / mensal.shift(12) - 1`. As duas contam posições, não datas, então a série precisa ter todos os meses, um por linha; o `resample("ME")` do passo 1 garante isso.

## Passo 5 · Exercício · Média móvel e ano contra ano

Escreva a média móvel que olha só para trás e a variação de cada mês contra o mesmo mês do ano anterior.

### Instruções
1. `media_movel(serie, janela, min_periods)` devolve uma Series, com o mesmo índice, em que cada valor é a média da linha atual e das `janela - 1` anteriores. Uma janela com menos de `min_periods` valores dá `NaN`. Nenhum valor pode depender de linhas futuras.
2. `variacao_ano_contra_ano(serie_mensal)` recebe uma série mensal completa (um mês por linha, sem meses faltando) e devolve uma Series, com o mesmo índice, com a variação relativa de cada mês em relação ao mesmo mês do ano anterior, como fração (0.1 para 10 %).
3. Na `variacao_ano_contra_ano`, os 12 primeiros meses e os meses cuja base vale 0 dão `NaN`, nunca infinito. Nenhuma das duas funções altera a série recebida.

### Código inicial
```python
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    pass


def variacao_ano_contra_ano(serie_mensal):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    return serie.rolling(janela, min_periods=min_periods).mean()


def variacao_ano_contra_ano(serie_mensal):
    variacao = serie_mensal.pct_change(12)
    return variacao.replace([np.inf, -np.inf], np.nan)
```

### Dicas
1. A janela padrão do `rolling` termina na linha atual; há um parâmetro que a desloca para o meio.
2. O mesmo mês do ano anterior está 12 linhas acima.
3. Uma base zero produz infinito, não ausente.

### Verificação
```json
[
  { "id": "mm-3-3", "checkpoint": 1, "kind": "expr",
    "setup": "s = pd.Series([4.0, 8.0, 6.0, 10.0, 2.0], index=pd.date_range('2025-03-01', periods=5, freq='D'))",
    "expr": "media_movel(s, 3, 3).tolist()", "expected": [{ "$float": "nan" }, { "$float": "nan" }, 6.0, 8.0, 6.0], "tolerance": 1e-9,
    "name": "Janela 3 com mínimo 3: os dois primeiros dias ficam NaN" },
  { "id": "mm-3-1", "checkpoint": 1, "kind": "expr",
    "setup": "s = pd.Series([4.0, 8.0, 6.0, 10.0, 2.0], index=pd.date_range('2025-03-01', periods=5, freq='D'))",
    "expr": "media_movel(s, 3, 1).tolist()", "expected": [4.0, 6.0, 6.0, 8.0, 6.0], "tolerance": 1e-9,
    "name": "Janela 3 com mínimo 1: o começo usa janelas incompletas", "hint": "No segundo dia, a média é de 4 e 8." },
  { "id": "mm-2-2", "checkpoint": 1, "kind": "expr",
    "setup": "s = pd.Series([4.0, 8.0, 6.0, 10.0, 2.0], index=pd.date_range('2025-03-01', periods=5, freq='D'))",
    "expr": "media_movel(s, 2, 2).tolist()", "expected": [{ "$float": "nan" }, 6.0, 7.0, 8.0, 6.0], "tolerance": 1e-9,
    "name": "Janela 2 com mínimo 2" },
  { "id": "mm-maior", "checkpoint": 1, "kind": "expr",
    "setup": "s = pd.Series([4.0, 8.0, 6.0, 10.0, 2.0], index=pd.date_range('2025-03-01', periods=5, freq='D'))",
    "expr": "media_movel(s, 10, 1).tolist()", "expected": [4.0, 6.0, 6.0, 7.0, 6.0], "tolerance": 1e-9,
    "name": "Janela maior que a série, com mínimo 1: média de tudo até o dia" },
  { "id": "mm-futuro", "checkpoint": 1, "kind": "expr",
    "setup": "s = pd.Series([4.0, 8.0, 6.0, 10.0, 2.0], index=pd.date_range('2025-03-01', periods=5, freq='D'))\nt = s.copy()\nt.iloc[-1] = 1000.0",
    "expr": "media_movel(s, 3, 1).iloc[:-1].tolist() == media_movel(t, 3, 1).iloc[:-1].tolist()", "expected": true,
    "name": "Mudar o último dia não muda a média dos dias anteriores", "hint": "A janela não pode olhar para a frente." },
  { "id": "mm-indice", "checkpoint": 1, "kind": "expr",
    "setup": "s = pd.Series([4.0, 8.0, 6.0], index=pd.to_datetime(['2025-03-01', '2025-03-02', '2025-03-04']))\nr = media_movel(s, 2, 1)",
    "expr": "[type(r).__name__, r.index.strftime('%Y-%m-%d').tolist()]", "expected": ["Series", ["2025-03-01", "2025-03-02", "2025-03-04"]],
    "name": "Devolve uma Series com o mesmo índice de datas" },
  { "id": "yoy-valores", "checkpoint": 2, "kind": "expr",
    "setup": "m = pd.Series([100.0, 80.0, 0.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0, 110.0, 120.0, 130.0, 110.0, 60.0, 40.0], index=pd.date_range('2024-01-31', periods=15, freq='ME'))",
    "expr": "variacao_ano_contra_ano(m).iloc[12:14].tolist()", "expected": [0.1, -0.25], "tolerance": 1e-9,
    "name": "Jan/2025 contra jan/2024 (+10 %) e fev/2025 contra fev/2024 (−25 %)", "hint": "Compare com o mesmo mês do ano anterior, como fração." },
  { "id": "yoy-inicio", "checkpoint": 3, "kind": "expr",
    "setup": "m = pd.Series([100.0, 80.0, 0.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0, 110.0, 120.0, 130.0, 110.0, 60.0, 40.0], index=pd.date_range('2024-01-31', periods=15, freq='ME'))",
    "expr": "variacao_ano_contra_ano(m).isna().tolist()", "expected": [true, true, true, true, true, true, true, true, true, true, true, true, false, false, true],
    "name": "Os 12 primeiros meses e o mês com base zero ficam NaN" },
  { "id": "yoy-base-zero", "checkpoint": 3, "kind": "expr",
    "setup": "m = pd.Series([100.0, 80.0, 0.0, 50.0, 60.0, 70.0, 80.0, 90.0, 100.0, 110.0, 120.0, 130.0, 110.0, 60.0, 40.0], index=pd.date_range('2024-01-31', periods=15, freq='ME'))",
    "expr": "float(variacao_ano_contra_ano(m).iloc[14])", "expected": { "$float": "nan" },
    "name": "Março/2024 vendeu 0: março/2025 não tem base e fica NaN, não infinito" },
  { "id": "yoy-indice", "checkpoint": 2, "kind": "expr",
    "setup": "m = pd.Series(np.arange(1.0, 27.0), index=pd.date_range('2023-01-31', periods=26, freq='ME'))\nr = variacao_ano_contra_ano(m)",
    "expr": "[len(r), r.index.strftime('%Y-%m').tolist()[-1], round(float(r.iloc[-1]), 9)]", "expected": [26, "2025-02", 0.857142857],
    "tolerance": 1e-9, "name": "Mesmo índice e mesmo tamanho; fev/2025 (26) contra fev/2024 (14)" },
  { "id": "entrada", "checkpoint": 3, "kind": "expr",
    "setup": "s = pd.Series([4.0, 8.0, 6.0], index=pd.date_range('2025-03-01', periods=3, freq='D'))\nr = media_movel(s, 2, 1)\nm = pd.Series(np.arange(1.0, 15.0), index=pd.date_range('2024-01-31', periods=14, freq='ME'))\nq = variacao_ano_contra_ano(m)",
    "expr": "[s.tolist(), m.tolist()[:3]]", "expected": [[4.0, 8.0, 6.0], [1.0, 2.0, 3.0]], "name": "As séries recebidas não mudam" }
]
```

### Soluções erradas
```python name="janela centrada"
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    return serie.rolling(janela, min_periods=min_periods, center=True).mean()


def variacao_ano_contra_ano(serie_mensal):
    variacao = serie_mensal.pct_change(12)
    return variacao.replace([np.inf, -np.inf], np.nan)
```
```python name="ignora o min_periods"
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    return serie.rolling(janela).mean()


def variacao_ano_contra_ano(serie_mensal):
    variacao = serie_mensal.pct_change(12)
    return variacao.replace([np.inf, -np.inf], np.nan)
```
```python name="soma dividida pela janela"
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    return serie.rolling(janela, min_periods=min_periods).sum() / janela


def variacao_ano_contra_ano(serie_mensal):
    variacao = serie_mensal.pct_change(12)
    return variacao.replace([np.inf, -np.inf], np.nan)
```
```python name="média de tudo até o dia"
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    return serie.expanding(min_periods=min_periods).mean()


def variacao_ano_contra_ano(serie_mensal):
    variacao = serie_mensal.pct_change(12)
    return variacao.replace([np.inf, -np.inf], np.nan)
```
```python name="compara com o mês anterior"
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    return serie.rolling(janela, min_periods=min_periods).mean()


def variacao_ano_contra_ano(serie_mensal):
    variacao = serie_mensal.pct_change()
    return variacao.replace([np.inf, -np.inf], np.nan)
```
```python name="desloca para o lado do futuro"
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    return serie.rolling(janela, min_periods=min_periods).mean()


def variacao_ano_contra_ano(serie_mensal):
    variacao = serie_mensal / serie_mensal.shift(-12) - 1
    return variacao.replace([np.inf, -np.inf], np.nan)
```
```python name="em porcentagem"
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    return serie.rolling(janela, min_periods=min_periods).mean()


def variacao_ano_contra_ano(serie_mensal):
    variacao = serie_mensal.pct_change(12) * 100
    return variacao.replace([np.inf, -np.inf], np.nan)
```
```python name="deixa o infinito"
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    return serie.rolling(janela, min_periods=min_periods).mean()


def variacao_ano_contra_ano(serie_mensal):
    return serie_mensal.pct_change(12)
```
```python name="diferença absoluta"
import numpy as np
import pandas as pd


def media_movel(serie, janela, min_periods):
    return serie.rolling(janela, min_periods=min_periods).mean()


def variacao_ano_contra_ano(serie_mensal):
    variacao = serie_mensal.diff(12)
    return variacao.replace([np.inf, -np.inf], np.nan)
```

## Passo 6 · Leitura · Sazonalidade e lacunas

Sazonalidade é o padrão que se repete no calendário: a padaria vende mais no sábado, o sorvete vende mais em janeiro. Para enxergá-la, agrupe por uma parte da data:

```python
dia = vendas["data"].dt.dayofweek          # 0 = segunda ... 6 = domingo
perfil = vendas.groupby(dia)["valor"].mean()
```

Os números de 0 a 6 começam na **segunda**, não no domingo. O `dt.day_name()` dá os nomes, mas em inglês (`"Monday"`), e agrupar por eles ordena alfabeticamente: `Friday`, `Monday`, `Saturday`... Agrupe pelo número, que já está na ordem da semana, e só no fim troque pelos nomes em português, com uma lista de sete rótulos. Se a padaria não abre aos domingos, o grupo 6 simplesmente não existe e o resultado tem seis linhas; `reindex(range(7))` recoloca o domingo, com `NaN`, e deixa claro que não há dado, em vez de esconder o dia. Para o mês, `dt.month` faz o mesmo papel, mas junta janeiros de anos diferentes, o que é exatamente o que um perfil sazonal quer e o que um total mensal não quer.

O horário também pode mudar o dia. Um sistema que grava em UTC registra uma venda das 22h30 de domingo, no horário de Brasília, como 01h30 de segunda. Converta antes de extrair o dia: `serie.tz_localize("UTC").tz_convert("-03:00")` leva 01h30 do dia 10 para 22h30 do dia 9.

Lacunas pedem uma decisão que depende do que a série mede. Num sensor fictício de temperatura que deixou de enviar leituras por dois dias, não houve temperatura zero; houve falta de dado.

```python
diaria = leituras.asfreq("D")      # grade diária: os dias que faltam viram NaN
diaria = diaria.ffill()            # repete a última leitura conhecida
```

Já `leituras.resample("D").sum()` encheria esses dias com 0, o que é certo para as vendas de uma loja fechada e absurdo para uma temperatura. O `ffill` também tem um custo: dez dias repetindo o mesmo valor parecem estabilidade. `ffill(limit=2)` preenche no máximo dois dias seguidos e deixa o resto visível como `NaN`. Um `bfill` copiaria uma leitura do futuro para o passado, o mesmo vazamento da janela centrada.

## Passo 7 · Exercício · Semana típica e dias sem leitura

Monte o perfil da semana de uma loja fictícia e coloque a série de um sensor na grade diária.

### Instruções
1. `perfil_semanal(df)` recebe uma tabela com as colunas `data` (datas) e `valor` e devolve uma Series com a média de `valor` em cada dia da semana, com o índice `["seg", "ter", "qua", "qui", "sex", "sab", "dom"]`, nessa ordem. Dia da semana sem nenhuma linha fica `NaN`.
2. `preencher_lacunas_diarias(serie)` recebe uma série indexada por datas, em ordem crescente, e devolve uma Series com um valor para cada dia do primeiro ao último. Os dias que faltavam e os valores ausentes recebem a última leitura anterior; se não houver leitura anterior, ficam `NaN`.
3. Nenhuma das duas funções altera o que recebeu.

### Código inicial
```python
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def perfil_semanal(df):
    pass


def preencher_lacunas_diarias(serie):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def perfil_semanal(df):
    dia = df["data"].dt.dayofweek
    perfil = df.groupby(dia)["valor"].mean().reindex(range(7))
    perfil.index = DIAS
    return perfil


def preencher_lacunas_diarias(serie):
    return serie.asfreq("D").ffill()
```

### Dicas
1. O número do dia da semana já vem na ordem certa, começando na segunda.
2. Um dia sem nenhuma linha não vira grupo; ele precisa ser recolocado antes de receber o nome.
3. Primeiro a série precisa ganhar os dias que faltam; só depois dá para preencher.

### Verificação
```json
[
  { "id": "perfil-indice", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.date_range('2025-03-03', periods=14, freq='D'), 'valor': [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0]})",
    "expr": "perfil_semanal(d).index.tolist()", "expected": ["seg", "ter", "qua", "qui", "sex", "sab", "dom"],
    "name": "Os sete dias, de segunda a domingo" },
  { "id": "perfil-valores", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.date_range('2025-03-03', periods=14, freq='D'), 'valor': [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0]})",
    "expr": "perfil_semanal(d).tolist()", "expected": [15.0, 25.0, 35.0, 45.0, 55.0, 65.0, 75.0], "tolerance": 1e-9,
    "name": "Média de duas semanas para cada dia", "hint": "3 de março de 2025 foi uma segunda-feira." },
  { "id": "perfil-sem-domingo", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.date_range('2025-03-03', periods=14, freq='D'), 'valor': [10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0]})\nd = d[d['data'].dt.dayofweek != 6]",
    "expr": "perfil_semanal(d).isna().tolist()", "expected": [false, false, false, false, false, false, true],
    "name": "Loja fechada aos domingos: o domingo aparece como NaN", "hint": "Sem domingo, o agrupamento tem seis grupos, não sete." },
  { "id": "perfil-fora-de-ordem", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.to_datetime(['2025-03-09', '2025-03-03', '2025-03-16', '2025-03-10']), 'valor': [8.0, 2.0, 6.0, 4.0]})",
    "expr": "perfil_semanal(d).fillna(-1).tolist()", "expected": [3.0, -1, -1, -1, -1, -1, 7.0], "tolerance": 1e-9,
    "name": "Linhas fora de ordem: duas segundas e dois domingos" },
  { "id": "perfil-um-dia", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'data': pd.to_datetime(['2025-03-05 18:00']), 'valor': [12.0]})",
    "expr": "perfil_semanal(d).fillna(-1).tolist()", "expected": [-1, -1, 12.0, -1, -1, -1, -1],
    "name": "Uma venda numa quarta-feira à noite" },
  { "id": "lacunas-datas", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([20.0, 22.0, np.nan, 25.0], index=pd.to_datetime(['2025-03-01', '2025-03-02', '2025-03-05', '2025-03-07']))",
    "expr": "preencher_lacunas_diarias(s).index.strftime('%Y-%m-%d').tolist()",
    "expected": ["2025-03-01", "2025-03-02", "2025-03-03", "2025-03-04", "2025-03-05", "2025-03-06", "2025-03-07"],
    "name": "Um valor para cada dia, do primeiro ao último" },
  { "id": "lacunas-valores", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([20.0, 22.0, np.nan, 25.0], index=pd.to_datetime(['2025-03-01', '2025-03-02', '2025-03-05', '2025-03-07']))",
    "expr": "preencher_lacunas_diarias(s).tolist()", "expected": [20.0, 22.0, 22.0, 22.0, 22.0, 22.0, 25.0],
    "name": "Dias sem leitura e leitura ausente repetem a última conhecida", "hint": "Faltou temperatura, não houve temperatura zero." },
  { "id": "lacunas-ausente", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([1.0, np.nan, 3.0], index=pd.date_range('2025-03-01', periods=3, freq='D'))",
    "expr": "preencher_lacunas_diarias(s).tolist()", "expected": [1.0, 1.0, 3.0], "name": "Sem dias faltando, o ausente também é preenchido" },
  { "id": "lacunas-inicio", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([np.nan, 5.0], index=pd.to_datetime(['2025-03-01', '2025-03-03']))",
    "expr": "preencher_lacunas_diarias(s).tolist()", "expected": [{ "$float": "nan" }, { "$float": "nan" }, 5.0],
    "name": "Sem leitura anterior, o começo continua NaN", "hint": "Nunca copie uma leitura do futuro para o passado." },
  { "id": "lacunas-tipo", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([7.5], index=pd.to_datetime(['2025-03-01']))\nr = preencher_lacunas_diarias(s)",
    "expr": "[type(r).__name__, type(r.index).__name__, r.tolist()]", "expected": ["Series", "DatetimeIndex", [7.5]],
    "name": "Uma leitura só: a mesma série, com índice de datas" },
  { "id": "entrada", "checkpoint": 3, "kind": "expr",
    "setup": "s = pd.Series([20.0, np.nan, 25.0], index=pd.to_datetime(['2025-03-01', '2025-03-03', '2025-03-04']))\nr = preencher_lacunas_diarias(s)\nd = pd.DataFrame({'data': pd.to_datetime(['2025-03-03']), 'valor': [1.0]})\np = perfil_semanal(d)",
    "expr": "[len(s), s.isna().tolist(), list(d.columns)]", "expected": [3, [false, true, false], ["data", "valor"]],
    "name": "A série e a tabela recebidas não mudam" }
]
```

### Soluções erradas
```python name="agrupa pelo nome em inglês"
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]
NOMES = {"Monday": "seg", "Tuesday": "ter", "Wednesday": "qua", "Thursday": "qui", "Friday": "sex", "Saturday": "sab", "Sunday": "dom"}


def perfil_semanal(df):
    perfil = df.groupby(df["data"].dt.day_name())["valor"].mean()
    return perfil.reindex(list(NOMES)).rename(index=NOMES).sort_index()


def preencher_lacunas_diarias(serie):
    return serie.asfreq("D").ffill()
```
```python name="dia do mês no lugar do dia da semana"
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def perfil_semanal(df):
    dia = df["data"].dt.day % 7
    perfil = df.groupby(dia)["valor"].mean().reindex(range(7))
    perfil.index = DIAS
    return perfil


def preencher_lacunas_diarias(serie):
    return serie.asfreq("D").ffill()
```
```python name="semana começando no domingo"
import numpy as np
import pandas as pd

DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"]


def perfil_semanal(df):
    dia = df["data"].dt.dayofweek
    perfil = df.groupby(dia)["valor"].mean().reindex(range(7))
    perfil.index = DIAS
    return perfil


def preencher_lacunas_diarias(serie):
    return serie.asfreq("D").ffill()
```
```python name="soma no lugar da média"
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def perfil_semanal(df):
    dia = df["data"].dt.dayofweek
    perfil = df.groupby(dia)["valor"].sum().reindex(range(7))
    perfil.index = DIAS
    return perfil


def preencher_lacunas_diarias(serie):
    return serie.asfreq("D").ffill()
```
```python name="não recoloca o dia vazio"
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def perfil_semanal(df):
    dia = df["data"].dt.dayofweek
    perfil = df.groupby(dia)["valor"].mean()
    perfil.index = DIAS
    return perfil


def preencher_lacunas_diarias(serie):
    return serie.asfreq("D").ffill()
```
```python name="lacunas continuam NaN"
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def perfil_semanal(df):
    dia = df["data"].dt.dayofweek
    perfil = df.groupby(dia)["valor"].mean().reindex(range(7))
    perfil.index = DIAS
    return perfil


def preencher_lacunas_diarias(serie):
    return serie.asfreq("D")
```
```python name="lacunas viram zero"
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def perfil_semanal(df):
    dia = df["data"].dt.dayofweek
    perfil = df.groupby(dia)["valor"].mean().reindex(range(7))
    perfil.index = DIAS
    return perfil


def preencher_lacunas_diarias(serie):
    return serie.resample("D").sum()
```
```python name="preenche com a leitura seguinte"
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def perfil_semanal(df):
    dia = df["data"].dt.dayofweek
    perfil = df.groupby(dia)["valor"].mean().reindex(range(7))
    perfil.index = DIAS
    return perfil


def preencher_lacunas_diarias(serie):
    return serie.asfreq("D").bfill()
```
```python name="preenche sem criar os dias"
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def perfil_semanal(df):
    dia = df["data"].dt.dayofweek
    perfil = df.groupby(dia)["valor"].mean().reindex(range(7))
    perfil.index = DIAS
    return perfil


def preencher_lacunas_diarias(serie):
    return serie.ffill()
```
```python name="interpola entre as leituras"
import numpy as np
import pandas as pd

DIAS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"]


def perfil_semanal(df):
    dia = df["data"].dt.dayofweek
    perfil = df.groupby(dia)["valor"].mean().reindex(range(7))
    perfil.index = DIAS
    return perfil


def preencher_lacunas_diarias(serie):
    return serie.asfreq("D").interpolate()
```

## Passo 8 · Quiz · resample ou rolling

### Pergunta
A série `vendas` é diária, com índice de datas, e cobre dois anos. O relatório pede o total de cada mês. Qual expressão dá isso?
- [ ] `vendas.rolling(30).sum()`
- [ ] `vendas.groupby(vendas.index.month).sum()`
- [x] `vendas.resample("ME").sum()`
- [ ] `vendas.resample("M").sum()`
> O `resample("ME")` divide a linha do tempo em meses do calendário e devolve um total por mês, 24 linhas. O `rolling(30)` devolve um valor por **dia**, a soma dos últimos 30 dias, que não coincide com o mês. Agrupar por `index.month` junta janeiro dos dois anos num grupo só, 12 linhas. O `"M"` não existe mais no pandas 3 e dá `ValueError`.

### Pergunta
Para prever as vendas de amanhã, um colega criou a variável "média dos últimos 7 dias" com `vendas.rolling(7, center=True).mean()`. O modelo acertou muito nos dados históricos e errou muito na primeira semana de uso. O que explica?
- [ ] A janela de 7 dias é curta demais; com 30 dias o problema some
- [x] Com `center=True`, a média de cada dia usa os três dias seguintes: o modelo aprendeu com o futuro, que não existe na hora de prever
- [ ] Faltou `min_periods=1`, e os `NaN` do começo estragaram o modelo
- [ ] O `rolling` precisa de uma série mensal, não diária
> A janela centrada inclui o dia atual, os três anteriores e os três **seguintes**. Nos dados históricos, essa informação está lá e o modelo a usa; na hora de prever amanhã, ela ainda não aconteceu. É um vazamento. Uma janela maior continuaria centrada, os `NaN` do começo afetam só seis linhas, e o `rolling` funciona em qualquer frequência.

### Pergunta
A variação mensal do faturamento de uma loja fictícia saiu `inf` em abril. Em março, a loja ficou fechada para reforma e vendeu 0. Como apresentar abril no relatório?
- [ ] Manter `inf`: o crescimento foi de fato infinito
- [ ] Trocar o `inf` por 0, porque não houve variação comparável
- [x] Trocar por ausente (`NaN`) e informar que não há base de comparação; se a pergunta é o desempenho, comparar abril com abril do ano anterior
- [ ] Trocar o 0 de março pelo faturamento de fevereiro e recalcular, para que abril tenha uma base
> Uma variação relativa sobre base zero não tem significado. Zero diria "não mudou", o que é falso, e `inf` quebra médias e gráficos. Marcar como ausente e explicar é honesto, e a comparação ano contra ano usa uma base que existe. Usar fevereiro como base de abril mistura dois meses diferentes e esconde que março não teve vendas.
