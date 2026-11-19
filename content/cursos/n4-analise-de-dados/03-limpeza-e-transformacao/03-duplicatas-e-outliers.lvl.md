---
slug: n4-m3-03-duplicatas-e-outliers
titulo: Duplicatas e outliers
descricao: duplicated/drop_duplicates com subset e keep, detecção de outliers por IQR e z-score, winsorização e a decisão de manter, remover ou marcar.
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
- Identificar duplicatas exatas e por chave e escolher qual registro manter
- Detectar outliers por IQR e z-score e explicar a diferença entre erro de dado e valor extremo legítimo
- Tratar outliers por remoção, limitação (clip) ou marcação
---

## Passo 1 · Leitura · Duplicatas exatas e por chave

Uma loja fictícia juntou os cadastros de dois sistemas antigos, e a mesma cliente aparece três vezes: uma com o e-mail antigo, outra com o novo e uma terceira, importada duas vezes, idêntica à segunda. Contar clientes, somar compras por cliente ou juntar com outra tabela vai dar errado enquanto essas repetições estiverem lá.

```python
cadastro = pd.DataFrame({
    "cliente": ["A", "B", "A", "C", "B", "A"],
    "atualizado": pd.to_datetime(["2025-01-05", "2025-02-01", "2025-03-10",
                                  "2025-01-20", "2025-01-15", "2025-03-10"]),
    "email": ["a@antigo", "b@x", "a@novo", "c@x", "b@velho", "a@novo"],
})
cadastro.duplicated().tolist()
# [False, False, False, False, False, True]
cadastro.duplicated(subset=["cliente"]).tolist()
# [False, False, True, False, True, True]
```

Sem argumentos, `duplicated` marca as **duplicatas exatas**: linhas iguais em todas as colunas a uma linha anterior. Aqui só a última é exata; as outras repetições da cliente A diferem no e-mail ou na data, e passam. Com `subset`, a comparação olha só a **chave**, as colunas que dizem quem é quem. É a pergunta que importa quase sempre: um `drop_duplicates()` sem `subset` deixa a cliente A duas vezes, e uma coluna como "data da importação" basta para que nenhuma linha seja duplicata exata.

O parâmetro `keep` escolhe quem fica: `"first"` (o padrão) mantém a primeira ocorrência, `"last"` a última, e `False` marca todas as repetidas, útil para **olhar** os casos antes de decidir: `cadastro[cadastro.duplicated(subset=["cliente"], keep=False)]`.

"Primeira" e "última" são posições na tabela, não no tempo. Para ficar com o registro mais recente de cada cliente, ordene pela data e mantenha o último:

```python
recentes = (cadastro.sort_values("atualizado", kind="stable")
                    .drop_duplicates(subset="cliente", keep="last")
                    .sort_index())
```

O `kind="stable"` garante que, em duas datas iguais, a ordem original se mantenha, e assim o empate fica com a linha que aparece depois na tabela, como no Nível 3. O `sort_index()` devolve as linhas à ordem original. Antes de tudo, padronize a chave com o que você viu na lição anterior: `"Ana@X.com "` e `"ana@x.com"` são a mesma pessoa, mas não para o `duplicated`.

## Passo 2 · Exercício · Manter o cadastro mais recente
modo: lacunas

Complete as lacunas (`___`) para ficar com o registro mais recente de cada chave.

### Instruções
1. `remover_duplicatas_mais_recente(df, chave, data)` devolve uma tabela nova com uma linha por valor de `chave`: a de `data` mais recente.
2. Se duas linhas da mesma chave têm a mesma data, fica a que aparece depois na tabela.
3. As linhas que ficam mantêm os rótulos do índice e voltam na ordem original da tabela.

### Código inicial
```python
import numpy as np
import pandas as pd


def remover_duplicatas_mais_recente(df, chave, data):
    ordenada = df.sort_values(___, kind="stable")
    unicas = ordenada.drop_duplicates(subset=___, keep=___)
    return unicas.___()
```

### Solução
```python
import numpy as np
import pandas as pd


def remover_duplicatas_mais_recente(df, chave, data):
    ordenada = df.sort_values(data, kind="stable")
    unicas = ordenada.drop_duplicates(subset=chave, keep="last")
    return unicas.sort_index()
```

### Dicas
1. Depois de ordenar da data mais antiga para a mais recente, a última ocorrência de cada chave é a mais recente.
2. `subset` diz quais colunas definem uma repetição.
3. Um método devolve as linhas à ordem dos rótulos do índice.

### Verificação
```json
[
  { "id": "indices", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'cliente': ['A', 'B', 'A', 'C', 'B', 'A'], 'atualizado': pd.to_datetime(['2025-01-05', '2025-02-01', '2025-03-10', '2025-01-20', '2025-01-15', '2025-03-10']), 'email': ['a1', 'b1', 'a2', 'c1', 'b2', 'a3']})\nr = remover_duplicatas_mais_recente(d, 'cliente', 'atualizado')",
    "expr": "r['email'].tolist()", "expected": ["b1", "c1", "a3"], "name": "Fica o registro mais recente de cada cliente",
    "hint": "Mais recente é a data maior, não a posição na tabela." },
  { "id": "uma-por-chave", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'cliente': ['A', 'B', 'A', 'C', 'B', 'A'], 'atualizado': pd.to_datetime(['2025-01-05', '2025-02-01', '2025-03-10', '2025-01-20', '2025-01-15', '2025-03-10']), 'email': ['a1', 'b1', 'a2', 'c1', 'b2', 'a3']})\nr = remover_duplicatas_mais_recente(d, 'cliente', 'atualizado')",
    "expr": "sorted(r['cliente'].tolist())", "expected": ["A", "B", "C"], "name": "Uma linha por cliente, sem perder nenhum",
    "hint": "Quem tem repetições continua com uma linha." },
  { "id": "recente-primeiro", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'cliente': ['X', 'X', 'Y'], 'atualizado': pd.to_datetime(['2025-05-01', '2025-01-01', '2025-02-02']), 'email': ['x-novo', 'x-velho', 'y1']})\nr = remover_duplicatas_mais_recente(d, 'cliente', 'atualizado')",
    "expr": "r['email'].tolist()", "expected": ["x-novo", "y1"], "name": "O mais recente vem antes na tabela",
    "hint": "A última linha da tabela não é necessariamente a mais recente." },
  { "id": "sem-repeticao", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'cliente': ['A', 'B', 'C'], 'atualizado': pd.to_datetime(['2025-03-01', '2025-01-01', '2025-02-01']), 'email': ['a', 'b', 'c']})\nr = remover_duplicatas_mais_recente(d, 'cliente', 'atualizado')",
    "expr": "r['email'].tolist()", "expected": ["a", "b", "c"], "name": "Sem repetições, a tabela fica igual" },
  { "id": "colunas", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'cliente': ['A', 'A'], 'atualizado': pd.to_datetime(['2025-03-01', '2025-01-01']), 'email': ['a2', 'a1']})\nr = remover_duplicatas_mais_recente(d, 'cliente', 'atualizado')",
    "expr": "list(r.columns)", "expected": ["cliente", "atualizado", "email"], "name": "As colunas não mudam" },
  { "id": "empate", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'cliente': ['A', 'B', 'A'], 'atualizado': pd.to_datetime(['2025-03-10', '2025-01-01', '2025-03-10']), 'email': ['a-primeiro', 'b', 'a-depois']})\nr = remover_duplicatas_mais_recente(d, 'cliente', 'atualizado')",
    "expr": "r['email'].tolist()", "expected": ["b", "a-depois"], "name": "Na mesma data, fica a linha que aparece depois" },
  { "id": "ordem-original", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'cliente': ['A', 'B', 'A', 'C', 'B', 'A'], 'atualizado': pd.to_datetime(['2025-01-05', '2025-02-01', '2025-03-10', '2025-01-20', '2025-01-15', '2025-03-10']), 'email': ['a1', 'b1', 'a2', 'c1', 'b2', 'a3']})\nr = remover_duplicatas_mais_recente(d, 'cliente', 'atualizado')",
    "expr": "r.index.tolist()", "expected": [1, 3, 5], "name": "As linhas voltam na ordem original, com os rótulos originais",
    "hint": "Depois de ordenar por data, a tabela ficou em outra ordem." },
  { "id": "rotulos", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'cliente': ['A', 'A', 'B'], 'atualizado': pd.to_datetime(['2025-02-01', '2025-01-01', '2025-01-01']), 'email': ['a2', 'a1', 'b']}, index=['r1', 'r2', 'r3'])\nr = remover_duplicatas_mais_recente(d, 'cliente', 'atualizado')",
    "expr": "r.index.tolist()", "expected": ["r1", "r3"], "name": "Rótulos de texto também são mantidos" }
]
```

### Soluções erradas
```python name="mantém o mais antigo"
import numpy as np
import pandas as pd


def remover_duplicatas_mais_recente(df, chave, data):
    ordenada = df.sort_values(data, kind="stable")
    unicas = ordenada.drop_duplicates(subset=chave, keep="first")
    return unicas.sort_index()
```
```python name="duplicatas exatas"
import numpy as np
import pandas as pd


def remover_duplicatas_mais_recente(df, chave, data):
    ordenada = df.sort_values(data, kind="stable")
    unicas = ordenada.drop_duplicates(subset=None, keep="last")
    return unicas.sort_index()
```
```python name="remove todos os repetidos"
import numpy as np
import pandas as pd


def remover_duplicatas_mais_recente(df, chave, data):
    ordenada = df.sort_values(data, kind="stable")
    unicas = ordenada.drop_duplicates(subset=chave, keep=False)
    return unicas.sort_index()
```
```python name="ordena pela chave"
import numpy as np
import pandas as pd


def remover_duplicatas_mais_recente(df, chave, data):
    ordenada = df.sort_values(chave, kind="stable")
    unicas = ordenada.drop_duplicates(subset=chave, keep="last")
    return unicas.sort_index()
```
```python name="fica na ordem das datas"
import numpy as np
import pandas as pd


def remover_duplicatas_mais_recente(df, chave, data):
    ordenada = df.sort_values(data, kind="stable")
    unicas = ordenada.drop_duplicates(subset=chave, keep="last")
    return unicas.copy()
```
```python name="perde os rótulos"
import numpy as np
import pandas as pd


def remover_duplicatas_mais_recente(df, chave, data):
    ordenada = df.sort_values(data, kind="stable")
    unicas = ordenada.drop_duplicates(subset=chave, keep="last")
    return unicas.sort_index().reset_index(drop=True)
```

## Passo 3 · Leitura · IQR e escore z

Um **outlier** é um valor muito longe dos outros. Pode ser um erro, como um tempo de entrega de 400 minutos que era 40, ou um caso real e raro, como a compra de um atacadista numa loja de bairro. Antes de decidir o que fazer, é preciso achá-los, e há duas regras clássicas.

A primeira usa os **quartis**. $Q_1$ deixa um quarto dos valores abaixo dele, $Q_3$ deixa três quartos, e o intervalo interquartil $\text{IQR} = Q_3 - Q_1$ mede a largura do miolo dos dados. É outlier o que cai fora de

$$
\left[\, Q_1 - 1{,}5\,\text{IQR},\ \ Q_3 + 1{,}5\,\text{IQR} \,\right]
$$

```python
q1, q3 = s.quantile(0.25), s.quantile(0.75)
iqr = q3 - q1
fora = (s < q1 - 1.5 * iqr) | (s > q3 + 1.5 * iqr)
```

O `quantile` do pandas recebe a fração, de 0 a 1, e interpola entre vizinhos; `s.quantile(25)` dá `ValueError: percentiles should all be in the interval [0, 1]`. Já o `np.percentile` usa a escala de 0 a 100 e, numa série com `NaN`, devolve `nan`, enquanto o `quantile` do pandas ignora os ausentes.

A segunda usa o **escore z** da lição de numpy: a quantos desvios cada valor está da média. É outlier o que passa de um limiar $k$, em geral 2 ou 3:

$$
z_i = \frac{x_i - \bar{x}}{s}, \qquad |z_i| > k
$$

O pandas calcula $s$ com $\text{ddof} = 1$ (desvio amostral). Se todos os valores são iguais, $s = 0$ e cada $z$ vira `nan`; como `nan > k` é falso, nenhum valor é marcado, que é o certo.

As duas regras não são equivalentes. Os quartis quase não se movem quando um valor extremo aparece, porque dependem só da ordem dos valores. A média e o desvio, ao contrário, são puxados pelo próprio outlier: quanto maior ele é, maior fica $s$, e o $z$ dele cresce menos do que você esperaria. Em amostras pequenas, o outlier pode **se esconder** atrás do desvio que ele mesmo inflou. A versão robusta do escore troca a média pela mediana e o desvio pelo **MAD**, a mediana dos desvios absolutos em relação à mediana. O exercício a seguir fica com as duas regras clássicas.

## Passo 4 · Previsão · O outlier que se esconde

Nove tempos de entrega fictícios, em minutos, e um deles é bem maior. O programa aplica as duas regras. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import pandas as pd

tempos = pd.Series([14, 8, 16, 10, 40, 8, 15, 16, 8], dtype=float)
media, desvio = tempos.mean(), tempos.std()
z = (tempos - media) / desvio
print(media, desvio)
print(z.round(2).tolist())
print(int((z.abs() > 3).sum()), int((z.abs() > 2).sum()))

q1, q3 = tempos.quantile(0.25), tempos.quantile(0.75)
iqr = q3 - q1
print(q1, q3, iqr)
print(q1 - 1.5 * iqr, q3 + 1.5 * iqr)
fora = (tempos < q1 - 1.5 * iqr) | (tempos > q3 + 1.5 * iqr)
print(tempos[fora].tolist())
```

### Dicas
1. Os nove tempos somam 135. A soma dos quadrados das distâncias até a média dá 800, e o desvio amostral divide por $n - 1 = 8$ antes da raiz.
2. Com nove valores em ordem, a interpolação do `quantile` cai exatamente no 3º menor (para $Q_1$) e no 7º menor (para $Q_3$).
3. Os valores são `float`, então as contas imprimem com `.0`.

### Saída esperada
```text
15.0 10.0
[-0.1, -0.7, 0.1, -0.5, 2.5, -0.7, 0.0, 0.1, -0.7]
0 1
8.0 16.0 8.0
-4.0 28.0
[40.0]
```

## Passo 5 · Exercício · Dois detectores

Escreva as duas regras. As funções devolvem os **rótulos** do índice dos valores marcados, para que você possa achar as linhas depois.

### Instruções
1. `outliers_iqr(serie)` devolve a lista dos rótulos dos valores **estritamente** fora de $[Q_1 - 1{,}5\,\text{IQR},\ Q_3 + 1{,}5\,\text{IQR}]$, com os quartis do `quantile` do pandas, na ordem da série.
2. `outliers_zscore(serie, limiar)` devolve a lista dos rótulos dos valores com $|z| > \text{limiar}$, usando a média e o desvio amostral da série (o padrão de `Series.std`), na ordem da série.
3. As duas ignoram os ausentes; uma série com todos os valores iguais, ou com um valor só, não tem outliers.

### Código inicial
```python
import numpy as np
import pandas as pd


def outliers_iqr(serie):
    pass


def outliers_zscore(serie, limiar):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def outliers_iqr(serie):
    q1 = serie.quantile(0.25)
    q3 = serie.quantile(0.75)
    iqr = q3 - q1
    fora = (serie < q1 - 1.5 * iqr) | (serie > q3 + 1.5 * iqr)
    return serie.index[fora].tolist()


def outliers_zscore(serie, limiar):
    z = (serie - serie.mean()) / serie.std()
    return serie.index[z.abs() > limiar].tolist()
```

### Dicas
1. Uma máscara booleana seleciona rótulos do índice tão bem quanto seleciona valores.
2. Um valor exatamente no limite não é outlier.
3. Um outlier pode estar abaixo da média; e repare em qual desvio o pandas calcula por padrão.

### Verificação
```json
[
  { "id": "iqr", "checkpoint": 1, "kind": "expr",
    "setup": "s = pd.Series([14, 8, 16, 10, 40, 8, 15, 16, 8], dtype=float, index=['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9'])",
    "expr": "outliers_iqr(s)", "expected": ["e5"], "name": "IQR acha o tempo de 40 minutos", "hint": "Devolva rótulos do índice, não valores nem posições." },
  { "id": "iqr-baixo", "checkpoint": 1, "kind": "expr",
    "setup": "s = pd.Series([50, 52, 51, 49, 5, 50, 53], dtype=float, index=[10, 20, 30, 40, 50, 60, 70])",
    "expr": "outliers_iqr(s)", "expected": [50], "name": "IQR acha um outlier abaixo", "hint": "Olhe os dois lados do intervalo." },
  { "id": "iqr-limite", "checkpoint": 1, "kind": "expr",
    "setup": "s = pd.Series([14, 8, 16, 10, 28, 8, 15, 16, 8], dtype=float)",
    "expr": "outliers_iqr(s)", "expected": [], "name": "Valor exatamente no limite superior (28) não é outlier",
    "hint": "Estritamente fora quer dizer comparação estrita." },
  { "id": "iqr-ausente", "checkpoint": 3, "kind": "expr",
    "setup": "s = pd.Series([1, 2, np.nan, 3, 2, 100], dtype=float, index=list('abcdef'))",
    "expr": "outliers_iqr(s)", "expected": ["f"], "name": "IQR com um ausente na série", "hint": "Os quartis precisam ignorar o ausente." },
  { "id": "iqr-constante", "checkpoint": 3, "kind": "expr", "expr": "outliers_iqr(pd.Series([7.0, 7.0, 7.0, 7.0]))",
    "expected": [], "name": "IQR em série constante: nenhum outlier" },
  { "id": "z", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([14, 8, 16, 10, 40, 8, 15, 16, 8], dtype=float, index=['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9'])",
    "expr": "outliers_zscore(s, 2)", "expected": ["e5"], "name": "z com limiar 2 acha o tempo de 40 minutos" },
  { "id": "z-esconde", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([14, 8, 16, 10, 40, 8, 15, 16, 8], dtype=float, index=['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9'])",
    "expr": "outliers_zscore(s, 3)", "expected": [], "name": "Com limiar 3, o outlier se esconde (z = 2,5)" },
  { "id": "z-amostral", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([14, 8, 16, 10, 40, 8, 15, 16, 8], dtype=float, index=['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9'])",
    "expr": "outliers_zscore(s, 2.6)", "expected": [], "name": "Limiar 2,6: com o desvio amostral, z = 2,5 não passa",
    "hint": "O desvio populacional é menor e aumenta o z." },
  { "id": "z-baixo", "checkpoint": 2, "kind": "expr",
    "setup": "s = pd.Series([50, 52, 51, 49, 5, 50, 53], dtype=float, index=[10, 20, 30, 40, 50, 60, 70])",
    "expr": "outliers_zscore(s, 2)", "expected": [50], "name": "z acha um outlier abaixo da média", "hint": "O z de um valor baixo é negativo." },
  { "id": "z-constante", "checkpoint": 3, "kind": "expr", "expr": "outliers_zscore(pd.Series([5.0, 5.0, 5.0]), 2)",
    "expected": [], "name": "z em série constante: nenhum outlier" },
  { "id": "z-um-valor", "checkpoint": 3, "kind": "expr", "expr": "outliers_zscore(pd.Series([12.0]), 1)",
    "expected": [], "name": "z com um valor só: nenhum outlier" },
  { "id": "z-ausente", "checkpoint": 3, "kind": "expr",
    "setup": "s = pd.Series([50, 52, np.nan, 51, 49, 5, 50, 53], dtype=float, index=list('abcdefgh'))",
    "expr": "outliers_zscore(s, 2)", "expected": ["f"], "name": "z com um ausente na série" }
]
```

### Soluções erradas
```python name="limite inclusivo"
import numpy as np
import pandas as pd


def outliers_iqr(serie):
    q1 = serie.quantile(0.25)
    q3 = serie.quantile(0.75)
    iqr = q3 - q1
    fora = (serie <= q1 - 1.5 * iqr) | (serie >= q3 + 1.5 * iqr)
    return serie.index[fora].tolist()


def outliers_zscore(serie, limiar):
    z = (serie - serie.mean()) / serie.std()
    return serie.index[z.abs() > limiar].tolist()
```
```python name="só o lado de cima"
import numpy as np
import pandas as pd


def outliers_iqr(serie):
    q1 = serie.quantile(0.25)
    q3 = serie.quantile(0.75)
    iqr = q3 - q1
    fora = serie > q3 + 1.5 * iqr
    return serie.index[fora].tolist()


def outliers_zscore(serie, limiar):
    z = (serie - serie.mean()) / serie.std()
    return serie.index[z.abs() > limiar].tolist()
```
```python name="quartil em porcentagem"
import numpy as np
import pandas as pd


def outliers_iqr(serie):
    q1 = serie.quantile(25)
    q3 = serie.quantile(75)
    iqr = q3 - q1
    fora = (serie < q1 - 1.5 * iqr) | (serie > q3 + 1.5 * iqr)
    return serie.index[fora].tolist()


def outliers_zscore(serie, limiar):
    z = (serie - serie.mean()) / serie.std()
    return serie.index[z.abs() > limiar].tolist()
```
```python name="np.percentile com ausente"
import numpy as np
import pandas as pd


def outliers_iqr(serie):
    q1 = np.percentile(serie, 25)
    q3 = np.percentile(serie, 75)
    iqr = q3 - q1
    fora = (serie < q1 - 1.5 * iqr) | (serie > q3 + 1.5 * iqr)
    return serie.index[fora].tolist()


def outliers_zscore(serie, limiar):
    z = (serie - serie.mean()) / serie.std()
    return serie.index[z.abs() > limiar].tolist()
```
```python name="posições no lugar de rótulos"
import numpy as np
import pandas as pd


def outliers_iqr(serie):
    q1 = serie.quantile(0.25)
    q3 = serie.quantile(0.75)
    iqr = q3 - q1
    fora = (serie < q1 - 1.5 * iqr) | (serie > q3 + 1.5 * iqr)
    return np.flatnonzero(fora).tolist()


def outliers_zscore(serie, limiar):
    z = (serie - serie.mean()) / serie.std()
    return serie.index[z.abs() > limiar].tolist()
```
```python name="z sem valor absoluto"
import numpy as np
import pandas as pd


def outliers_iqr(serie):
    q1 = serie.quantile(0.25)
    q3 = serie.quantile(0.75)
    iqr = q3 - q1
    fora = (serie < q1 - 1.5 * iqr) | (serie > q3 + 1.5 * iqr)
    return serie.index[fora].tolist()


def outliers_zscore(serie, limiar):
    z = (serie - serie.mean()) / serie.std()
    return serie.index[z > limiar].tolist()
```
```python name="desvio populacional"
import numpy as np
import pandas as pd


def outliers_iqr(serie):
    q1 = serie.quantile(0.25)
    q3 = serie.quantile(0.75)
    iqr = q3 - q1
    fora = (serie < q1 - 1.5 * iqr) | (serie > q3 + 1.5 * iqr)
    return serie.index[fora].tolist()


def outliers_zscore(serie, limiar):
    z = (serie - serie.mean()) / np.std(serie)
    return serie.index[z.abs() > limiar].tolist()
```
```python name="devolve os valores"
import numpy as np
import pandas as pd


def outliers_iqr(serie):
    q1 = serie.quantile(0.25)
    q3 = serie.quantile(0.75)
    iqr = q3 - q1
    fora = (serie < q1 - 1.5 * iqr) | (serie > q3 + 1.5 * iqr)
    return serie.index[fora].tolist()


def outliers_zscore(serie, limiar):
    z = (serie - serie.mean()) / serie.std()
    return serie[z.abs() > limiar].tolist()
```

## Passo 6 · Leitura · Remover, limitar ou marcar

Achar um outlier é a parte mecânica. Decidir o que fazer com ele exige olhar o dado e perguntar de onde ele veio.

Se é **erro**, como um tempo de entrega negativo, uma idade de 230 anos ou um sensor de sala marcando 85 °C, o valor não diz nada sobre o mundo: troque por ausente (e trate como na primeira lição) ou corrija, se a origem do erro for conhecida. Se é **legítimo**, ele faz parte do fenômeno, e apagá-lo muda a resposta. Numa base fictícia de transações de cartão, as compras extremas podem ser justamente as fraudes que você procura: ali o outlier **é** a resposta.

Entre apagar e manter, há três caminhos:

- **Remover** a linha: simples, mas muda o $n$ e, se os extremos não são raros por acaso, enviesa a média para o lado que sobrou.
- **Limitar** (*winsorizar*): trocar o que passa de um quantil pelo próprio quantil. Nenhuma linha some, e um valor absurdo deixa de dominar a média e o desvio.
- **Marcar**: acrescentar uma coluna booleana, como em `df["valor_extremo"] = fora`, e deixar a decisão para a análise, que pode rodar com e sem os marcados.

```python
inferior, superior = df["valor"].quantile(0.01), df["valor"].quantile(0.99)
limitada = df.assign(valor=df["valor"].clip(lower=inferior, upper=superior))
```

O `clip` recebe os **valores** dos limites, não as frações; os quantis vêm do `quantile`. Ausentes continuam ausentes, e o `assign` devolve uma tabela nova, sem mexer na original.

Um erro comum é remover os outliers e recalcular os limites, de novo e de novo, "até não sobrar nenhum". A cada rodada os quartis encolhem, e numa distribuição assimétrica, como renda ou tempo de espera, a cauda inteira vai embora aos poucos, porque sempre haverá um valor acima do novo limite. Aplique a regra uma vez, com limites calculados nos dados originais.

Por fim, registre a decisão: a regra usada, os limites, quantas linhas foram afetadas e por quê. Quem ler a análise depois, inclusive você, precisa saber que a média de entrega foi calculada com os tempos limitados no percentil 99.

## Passo 7 · Exercício · Limitar sem perder linhas

Escreva a winsorização de uma coluna: os extremos viram os quantis, e nenhuma linha some.

### Instruções
1. `limitar(df, coluna, inferior=0.01, superior=0.99)` devolve uma tabela **nova** em que os valores de `coluna` abaixo do quantil `inferior` passam a valer esse quantil, e os acima do quantil `superior` passam a valer esse quantil. Os quantis são os da própria coluna, pelo `quantile` do pandas, ignorando ausentes.
2. A tabela devolvida tem as mesmas linhas, na mesma ordem; ausentes continuam ausentes e as outras colunas não mudam.
3. A tabela recebida não muda.

### Código inicial
```python
import numpy as np
import pandas as pd


def limitar(df, coluna, inferior=0.01, superior=0.99):
    pass
```

### Solução
```python
import numpy as np
import pandas as pd


def limitar(df, coluna, inferior=0.01, superior=0.99):
    baixo = df[coluna].quantile(inferior)
    alto = df[coluna].quantile(superior)
    nova = df.copy()
    nova[coluna] = nova[coluna].clip(lower=baixo, upper=alto)
    return nova
```

### Dicas
1. Calcule os dois quantis antes de mexer na coluna; o `quantile` recebe frações entre 0 e 1.
2. `clip` recebe valores, não frações.
3. Trabalhe numa cópia, ou use `assign`, para não escrever na tabela de quem chamou.

### Verificação
```json
[
  { "id": "padrao", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'id': range(100), 'valor': np.arange(1, 101, dtype=float)})\nr = limitar(d, 'valor')",
    "expr": "r['valor'].iloc[[0, 1, 50, 98, 99]].tolist()", "expected": [1.99, 2.0, 51.0, 99.0, 99.01], "tolerance": 1e-9,
    "name": "Com 1 a 100, os extremos viram os percentis 1 e 99", "hint": "O limite é o quantil calculado, não a fração." },
  { "id": "quartis", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'valor': [1.0, 2.0, 3.0, 4.0, 100.0]})\nr = limitar(d, 'valor', inferior=0.25, superior=0.75)",
    "expr": "r['valor'].tolist()", "expected": [2.0, 2.0, 3.0, 4.0, 4.0], "tolerance": 1e-9, "name": "Limites nos quartis" },
  { "id": "sem-limite", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'valor': [3.0, -1.0, 250.0, 7.0]})\nr = limitar(d, 'valor', inferior=0.0, superior=1.0)",
    "expr": "r['valor'].tolist()", "expected": [3.0, -1.0, 250.0, 7.0], "tolerance": 1e-9,
    "name": "Quantis 0 e 1 não mudam nada" },
  { "id": "ausente-quantil", "checkpoint": 1, "kind": "expr",
    "setup": "d = pd.DataFrame({'valor': [1.0, np.nan, 2.0, 3.0, 4.0, 100.0]})\nr = limitar(d, 'valor', inferior=0.25, superior=0.75)",
    "expr": "r['valor'].fillna(-1).tolist()", "expected": [2.0, -1, 2.0, 3.0, 4.0, 4.0], "tolerance": 1e-9,
    "name": "Os quantis ignoram o ausente", "hint": "O ausente não pode virar o limite de ninguém." },
  { "id": "linhas", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'id': range(100), 'valor': np.arange(1, 101, dtype=float)})\nr = limitar(d, 'valor', inferior=0.05, superior=0.95)",
    "expr": "[len(r), r.index.tolist() == d.index.tolist()]", "expected": [100, true], "name": "Nenhuma linha some e a ordem se mantém",
    "hint": "Limitar não é filtrar." },
  { "id": "ausente-fica", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'valor': [1.0, np.nan, 2.0, 3.0, 4.0, 100.0]})\nr = limitar(d, 'valor', inferior=0.25, superior=0.75)",
    "expr": "r['valor'].isna().tolist()", "expected": [false, true, false, false, false, false], "name": "Ausente continua ausente" },
  { "id": "outras-colunas", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'id': [1, 2, 3, 4, 5], 'loja': ['L1', 'L2', 'L3', 'L4', 'L5'], 'valor': [1.0, 2.0, 3.0, 4.0, 100.0]})\nr = limitar(d, 'valor', inferior=0.25, superior=0.75)",
    "expr": "[list(r.columns), r['id'].tolist(), r['loja'].tolist()]", "expected": [["id", "loja", "valor"], [1, 2, 3, 4, 5], ["L1", "L2", "L3", "L4", "L5"]],
    "name": "As outras colunas não mudam", "hint": "Limite só a coluna pedida." },
  { "id": "id-numerico", "checkpoint": 2, "kind": "expr",
    "setup": "d = pd.DataFrame({'id': range(100), 'valor': np.arange(1, 101, dtype=float)})\nr = limitar(d, 'valor')",
    "expr": "r['id'].iloc[[0, 1, 99]].tolist()", "expected": [0, 1, 99], "name": "Uma coluna numérica que não é a pedida continua igual",
    "hint": "Os quantis de valor não valem para as outras colunas." },
  { "id": "entrada", "checkpoint": 3, "kind": "expr",
    "setup": "d = pd.DataFrame({'valor': [1.0, 2.0, 3.0, 4.0, 100.0]})\nr = limitar(d, 'valor', inferior=0.25, superior=0.75)",
    "expr": "d['valor'].tolist()", "expected": [1.0, 2.0, 3.0, 4.0, 100.0], "name": "A tabela recebida não muda",
    "hint": "df[coluna] = ... escreve na tabela de quem chamou." }
]
```

### Soluções erradas
```python name="remove em vez de limitar"
import numpy as np
import pandas as pd


def limitar(df, coluna, inferior=0.01, superior=0.99):
    baixo = df[coluna].quantile(inferior)
    alto = df[coluna].quantile(superior)
    return df[(df[coluna] >= baixo) & (df[coluna] <= alto)]
```
```python name="clip com as frações"
import numpy as np
import pandas as pd


def limitar(df, coluna, inferior=0.01, superior=0.99):
    nova = df.copy()
    nova[coluna] = nova[coluna].clip(lower=inferior, upper=superior)
    return nova
```
```python name="np.percentile com frações"
import numpy as np
import pandas as pd


def limitar(df, coluna, inferior=0.01, superior=0.99):
    baixo = np.percentile(df[coluna], inferior)
    alto = np.percentile(df[coluna], superior)
    nova = df.copy()
    nova[coluna] = nova[coluna].clip(lower=baixo, upper=alto)
    return nova
```
```python name="quantil em porcentagem"
import numpy as np
import pandas as pd


def limitar(df, coluna, inferior=0.01, superior=0.99):
    baixo = df[coluna].quantile(inferior * 100)
    alto = df[coluna].quantile(superior * 100)
    nova = df.copy()
    nova[coluna] = nova[coluna].clip(lower=baixo, upper=alto)
    return nova
```
```python name="limita a tabela inteira"
import numpy as np
import pandas as pd


def limitar(df, coluna, inferior=0.01, superior=0.99):
    baixo = df[coluna].quantile(inferior)
    alto = df[coluna].quantile(superior)
    return df.clip(lower=baixo, upper=alto)
```
```python name="altera a tabela recebida"
import numpy as np
import pandas as pd


def limitar(df, coluna, inferior=0.01, superior=0.99):
    baixo = df[coluna].quantile(inferior)
    alto = df[coluna].quantile(superior)
    df[coluna] = df[coluna].clip(lower=baixo, upper=alto)
    return df
```

## Passo 8 · Quiz · IQR, z e decisões

### Pergunta
Seis tempos de entrega fictícios: 10, 11, 12, 10, 11 e 100 minutos. A regra $|z| > 3$, com o desvio amostral, não marcou nenhum. Por quê?
- [ ] O tempo de 100 minutos não é outlier: está dentro do esperado para entregas
- [ ] O pandas ignora valores acima de 99 no cálculo do desvio
- [x] O próprio 100 inflou a média e o desvio; com seis valores, o maior $|z|$ possível é $5/\sqrt{6} \approx 2{,}04$, então nenhum valor passa de 3
- [ ] O limiar 3 só funciona com o desvio populacional, e o pandas usa o amostral
> O desvio de 36,4 minutos vem quase todo do próprio 100, e o $z$ dele fica em 2,04. Com $n$ valores e desvio amostral, nenhum $|z|$ passa de $(n-1)/\sqrt{n}$, então em amostras pequenas o limiar 3 nunca marca nada. A regra do IQR, que depende só da ordem dos valores, marca o 100. O desvio populacional deixaria o $z$ um pouco maior, mas ainda abaixo de 3, e o pandas não descarta valores ao calcular o desvio.

### Pergunta
Numa coluna fictícia de renda, muito assimétrica, um analista aplicou o IQR, removeu os outliers, recalculou os quartis e repetiu até nenhum valor ficar fora dos limites. Sobraram 61 % das linhas. O que está errado?
- [ ] Nada: o processo para quando os dados ficam limpos
- [x] A cada rodada os quartis encolhem e criam novos "outliers"; numa distribuição assimétrica, a cauda inteira vai embora aos poucos. A regra deve ser aplicada uma vez, com limites dos dados originais, e a decisão precisa olhar se os valores são erros
- [ ] O IQR deveria ser trocado pelo escore z, que pode ser repetido sem problema
- [ ] O certo seria repetir até sobrarem exatamente 99 % das linhas
> Remover e recalcular redefine o que é "normal" a cada passo; com renda, sempre haverá alguém acima do novo $Q_3 + 1{,}5\,\text{IQR}$, e a análise perde justamente as pessoas de renda alta, que existem. O escore z repetido tem o mesmo problema. Fixar uma porcentagem de linhas a manter não diz nada sobre quais valores são erros.

### Pergunta
Uma equipe fictícia vai estudar transações de cartão para achar fraudes. Na limpeza, alguém propõe apagar as 0,5 % de transações com valores mais extremos, "para não distorcer as médias". Qual é a melhor resposta?
- [ ] Apagar: valores extremos sempre são erros de digitação
- [ ] Limitar no percentil 99,5, porque assim nenhuma linha some e o problema está resolvido
- [ ] Trocar os extremos pela mediana, que é robusta
- [x] Não apagar nem alterar: marcar os extremos numa coluna e investigá-los, porque neste problema eles podem ser exatamente as fraudes
> Quando o objetivo é achar o raro, o outlier é o sinal, não o ruído. Apagar ou limitar destrói a informação que o estudo procura, e trocar pela mediana também. Marcar mantém os valores e permite comparar as análises com e sem eles. Valores extremos só devem ser tratados como erro quando há evidência de erro.
