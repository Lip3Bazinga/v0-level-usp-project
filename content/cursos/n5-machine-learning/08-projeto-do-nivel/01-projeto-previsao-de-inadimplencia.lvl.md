---
slug: n5-m8-01-projeto-previsao-de-inadimplencia
titulo: 'Projeto final: previsão de inadimplência'
descricao: Construa, valide e documente um modelo que prevê inadimplência em um conjunto de dados de crédito, com pipeline, validação honesta, escolha de limiar por custo e análise de justiça.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 300
tempo_min: 240
publicada: true
projeto: true
solucao_apos_tentativas: 3
objetivos:
- Montar um pipeline completo (pré-processamento, modelo, busca de hiperparâmetros) reprodutível e sem vazamento
- Comparar ao menos três famílias de modelos com validação cruzada e uma baseline, reportando incerteza
- Escolher o limiar de decisão pelo custo do negócio e avaliar métricas por grupo
- Entregar funções com assinaturas fixas e um relatório (model card) gerado pelo código
---

## Passo 1 · Leitura · O problema, os dados e o custo dos erros

Uma financeira fictícia quer estimar, no momento de liberar um crédito, a chance de o cliente atrasar um pagamento por mais de 30 dias no ano seguinte. Quem o modelo marca vai para uma análise manual antes da liberação. Os dois erros custam coisas diferentes: liberar sem análise para quem vai atrasar (falso negativo) custa, nas unidades do projeto, **5**; mandar para análise quem pagaria em dia (falso positivo) custa **1**, o trabalho do analista e o cliente que desiste. Com o limiar $t$ e $n$ clientes,

$$
\text{custo por cliente}(t) = \frac{c_{FP} \cdot FP(t) + c_{FN} \cdot FN(t)}{n}, \qquad c_{FP} = 1,\; c_{FN} = 5
$$

**Os dados são fictícios.** O arquivo `dados_credito.py` inventa clientes com `default_rng(semente)`: não há pessoa real, empresa ou instituição por trás deles. A inadimplência sai de uma regra logística, $P(\text{inadimplente}) = \sigma(z)$, com

$$
z = -2{,}9 + 4{,}0\,(\text{comp} - 0{,}34) + 0{,}7\,\text{atrasos} - 0{,}8\,(\ln \text{renda} - 8) - 0{,}006\,(\text{meses} - 120) + 0{,}15\,(\text{parcelas} - 3) + e_{\text{contrato}}
$$

em que $e_{\text{contrato}}$ vale $+0{,}6$ no cartão, $-0{,}8$ no consignado e 0 nos outros. A região não entra em $z$, mas a renda típica muda de uma região para outra. Depois do sorteio, o gerador estraga a tabela como um cadastro de verdade: renda e comprometimento em branco, contrato em branco ou digitado com maiúsculas e espaços. A chamada `escrever_csv("clientes.csv", 2000, 2026)` grava 2 000 clientes num CSV, que você lê como qualquer arquivo: 235 inadimplentes, 11,75 %.

| coluna | significado |
|---|---|
| `id_cliente` | número do cadastro, sorteado |
| `renda_mensal` | renda declarada, em reais (em branco quando não informada) |
| `comprometimento` | fração da renda já presa a parcelas: 0,25 é 25 % (em branco quando não calculada) |
| `atrasos_12m` | pagamentos atrasados nos 12 meses anteriores ao pedido |
| `meses_relacionamento` | meses desde o primeiro contrato |
| `parcelas_em_aberto` | parcelas de outros contratos ainda abertas |
| `tipo_contrato` | `pessoal`, `consignado`, `cartao` ou `veiculo`, digitado no cadastro |
| `regiao` | região de uma cidade fictícia, de A a E |
| `dias_em_cobranca` | dias que a conta passou no setor de cobrança, registrados **depois** do atraso |
| `inadimplente` | 1 se atrasou mais de 30 dias nos 12 meses seguintes; 0 se não |

```mermaid
flowchart LR
    A["explorar e limpar"] --> B["dividir"]
    B --> C["baseline"]
    C --> D["pipeline"]
    D --> E["comparar por CV"]
    E --> F["limiar pelo custo"]
    F --> G["teste, uma vez"]
    G --> H["model card"]
```

| Passo | Funções | Etapas |
|---|---|---|
| 3 | `carregar`, `explorar`, `limpar`, `dividir` | explorar, limpar e dividir sem vazamento |
| 4 | `montar_pipeline`, `avaliar_cv`, `baseline` | baseline e pipeline |
| 5 | `modelos_candidatos`, `comparar_modelos`, `escolher_modelo`, `buscar_hiperparametros` | comparar por validação cruzada |
| 6 | `scores_fora_da_dobra`, `escolher_limiar`, `avaliar_final` | limiar pelo custo e teste usado uma vez |
| 7 | `resumo_por_regiao`, `gerar_relatorio` | relatório (model card) |

**Critérios.** As assinaturas e os formatos são fixos. Todo sorteio recebe a semente pedida (`random_state=semente`), e nenhum caso mede tempo. Os casos usam de 300 a 600 clientes gerados com outras sementes, para caber no tempo da verificação; os 2 000 clientes ficam para o seu "Executar". Um número digitado à mão no lugar de calculado reprova. A partir do passo 4, as funções dos passos anteriores vêm prontas em `credito_base.py`, para que um erro antigo não derrube o passo novo. A métrica de comparação é a **precisão média** (AP) do módulo 3: com 12 % de positivos, um modelo que nunca marca ninguém acerta 88 % e tem AP igual à própria taxa.

Para experimentar com o arquivo inteiro, acrescente as chamadas no fim do `main.py`, use o "Executar" e apague-as antes de verificar: o `main.py` roda de novo em cada caso da verificação, e ajustes com 2 000 linhas em cada um estouram o tempo.

## Passo 2 · Previsão · O que o cadastro esconde

O programa lê cinco linhas escritas à mão no formato de `clientes.csv`, com algumas colunas a menos. Repare na renda em branco, no contrato em branco, nas formas diferentes de escrever o mesmo contrato e na coluna `dias_em_cobranca`. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import io
import pandas as pd

TEXTO = """id_cliente,renda_mensal,tipo_contrato,dias_em_cobranca,inadimplente
100231,2850.5,cartao,0,0
100007,,PESSOAL,95,1
100542,4120.0,"pessoal ",0,0
100118,1930.75,,0,0
100390,2200.0,Cartao,12,0
"""
df = pd.read_csv(io.StringIO(TEXTO))
print(df["renda_mensal"].dtype, df["id_cliente"].dtype)
print(int(df["renda_mensal"].isna().sum()), int(df["tipo_contrato"].isna().sum()))
print(df["tipo_contrato"].nunique())
print(df["tipo_contrato"].str.strip().str.lower().nunique())
print(df["inadimplente"].mean())
print(df["id_cliente"].nunique() == len(df))
print(df.groupby("inadimplente")["dias_em_cobranca"].max().tolist())
```

### Dicas
1. Uma célula em branco vira `NaN`, e uma coluna numérica com `NaN` não pode ser inteira. O `nunique` não conta o `NaN`.
2. Para o texto, `"cartao"`, `"Cartao"` e `"pessoal "` (com o espaço guardado pelas aspas) são valores diferentes.
3. A média de uma coluna de 0 e 1 é a fração de 1.

### Saída esperada
```text
float64 int64
1 1
4
2
0.2
True
[12, 95]
```

## Passo 3 · Exercício · Explorar, limpar e dividir

A Previsão mostrou o que um cadastro real esconde. No arquivo inteiro, `tipo_contrato` tem 12 grafias para 4 contratos, e duas colunas não podem entrar no modelo. `id_cliente` tem um valor diferente por linha e não diz nada sobre o cliente; um modelo flexível pode decorá-lo. `dias_em_cobranca` tem correlação 0,915 com o alvo porque só é preenchida **depois** do atraso: com ela, a logística chega a AP 1,000 na validação cruzada, um número que nenhum pedido de crédito novo vai reproduzir.

O que a limpeza **não** faz também importa. Preencher a renda em branco com a mediana usa as linhas que depois serão de teste; essa conta vai para o pipeline do próximo passo, que aprende só com o treino. Apagar as linhas com algum ausente jogaria fora clientes de verdade e mudaria a amostra. E a divisão separa o teste agora, antes de qualquer modelo, estratificada: com 11,75 % de positivos, um sorteio sem estratificar pode deixar o teste com bem menos inadimplentes que o treino.

Escreva as quatro funções. Para testar no "Executar", grave o arquivo com `escrever_csv("clientes.csv", 2000, 2026)` (de `dados_credito`) e leia com `carregar("clientes.csv")`; apague essas linhas antes de verificar.

### Instruções
1. `carregar(caminho)` lê o CSV e devolve a tabela como está no arquivo.
2. `explorar(df)` devolve o dicionário `{"linhas", "taxa_inadimplencia", "ausentes", "identificadores", "suspeitas"}`: o número de linhas (`int`); a fração de `inadimplente == 1` (`float`); `{coluna: quantidade}` só das colunas com algum ausente, na ordem das colunas, com `int`; a lista das colunas com tantos valores distintos (`nunique`) quanto linhas; a lista das colunas **numéricas**, menos o alvo, cuja correlação de Pearson com o alvo é 0,5 ou mais em valor absoluto, da mais forte para a mais fraca.
3. `limpar(df)` devolve uma tabela **nova**, sem `id_cliente` e `dias_em_cobranca`, com `tipo_contrato` sem espaços nas pontas e em minúsculas. As linhas, o índice e os ausentes ficam como estão, e o `df` recebido não muda.
4. `dividir(df, semente)` separa `X` (todas as colunas menos `inadimplente`) e `y` (a coluna `inadimplente`) e devolve `train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)`: `X_treino, X_teste, y_treino, y_teste`.

### Código inicial
```python
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"


def carregar(caminho):
    pass


def explorar(df):
    pass


def limpar(df):
    pass


def dividir(df, semente):
    pass
```
```python path=dados_credito.py
import numpy as np
import pandas as pd

CONTRATOS = ["pessoal", "consignado", "cartao", "veiculo"]
REGIOES = ["A", "B", "C", "D", "E"]


def gerar_clientes(n=2000, semente=2026):
    rng = np.random.default_rng(semente)
    regiao = rng.choice(REGIOES, n, p=[0.3, 0.25, 0.2, 0.15, 0.1])
    deslocamento = np.select([regiao == "A", regiao == "E"], [0.25, -0.3], 0.0)
    renda = np.round(np.exp(rng.normal(8.0 + deslocamento, 0.5, n)), 2)
    comprometimento = np.round(rng.beta(2.0, 5.0, n) * 1.2, 3)
    atrasos = rng.poisson(0.6, n)
    meses = rng.integers(0, 241, n)
    parcelas = rng.integers(0, 7, n)
    contrato = rng.choice(CONTRATOS, n, p=[0.35, 0.25, 0.3, 0.1]).astype(object)
    efeito = np.select([contrato == "cartao", contrato == "consignado"], [0.6, -0.8], 0.0)
    z = (-2.9 + 4.0 * (comprometimento - 0.34) + 0.7 * atrasos - 0.8 * (np.log(renda) - 8.0)
         - 0.006 * (meses - 120) + 0.15 * (parcelas - 3) + efeito)
    inadimplente = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(np.int64)
    dias = np.where(inadimplente == 1, rng.integers(31, 181, n), 0)
    regularizado = (inadimplente == 0) & (rng.random(n) < 0.03)
    dias = np.where(regularizado, rng.integers(1, 16, n), dias)
    sujo = rng.random(n)
    contrato = np.where(sujo < 0.04, np.char.upper(contrato.astype(str)), contrato).astype(object)
    contrato = np.where((sujo >= 0.04) & (sujo < 0.07), np.char.add(contrato.astype(str), " "), contrato).astype(object)
    renda = np.where(rng.random(n) < 0.05, np.nan, renda)
    comprometimento = np.where(rng.random(n) < 0.04, np.nan, comprometimento)
    contrato[rng.random(n) < 0.03] = None
    return pd.DataFrame({
        "id_cliente": rng.permutation(n) + 100001,
        "renda_mensal": renda,
        "comprometimento": comprometimento,
        "atrasos_12m": atrasos,
        "meses_relacionamento": meses,
        "parcelas_em_aberto": parcelas,
        "tipo_contrato": contrato,
        "regiao": regiao,
        "dias_em_cobranca": dias,
        "inadimplente": inadimplente,
    })


def escrever_csv(caminho, n=2000, semente=2026):
    gerar_clientes(n, semente).to_csv(caminho, index=False)
```

### Solução
```python
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```
```python path=dados_credito.py
import numpy as np
import pandas as pd

CONTRATOS = ["pessoal", "consignado", "cartao", "veiculo"]
REGIOES = ["A", "B", "C", "D", "E"]


def gerar_clientes(n=2000, semente=2026):
    rng = np.random.default_rng(semente)
    regiao = rng.choice(REGIOES, n, p=[0.3, 0.25, 0.2, 0.15, 0.1])
    deslocamento = np.select([regiao == "A", regiao == "E"], [0.25, -0.3], 0.0)
    renda = np.round(np.exp(rng.normal(8.0 + deslocamento, 0.5, n)), 2)
    comprometimento = np.round(rng.beta(2.0, 5.0, n) * 1.2, 3)
    atrasos = rng.poisson(0.6, n)
    meses = rng.integers(0, 241, n)
    parcelas = rng.integers(0, 7, n)
    contrato = rng.choice(CONTRATOS, n, p=[0.35, 0.25, 0.3, 0.1]).astype(object)
    efeito = np.select([contrato == "cartao", contrato == "consignado"], [0.6, -0.8], 0.0)
    z = (-2.9 + 4.0 * (comprometimento - 0.34) + 0.7 * atrasos - 0.8 * (np.log(renda) - 8.0)
         - 0.006 * (meses - 120) + 0.15 * (parcelas - 3) + efeito)
    inadimplente = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(np.int64)
    dias = np.where(inadimplente == 1, rng.integers(31, 181, n), 0)
    regularizado = (inadimplente == 0) & (rng.random(n) < 0.03)
    dias = np.where(regularizado, rng.integers(1, 16, n), dias)
    sujo = rng.random(n)
    contrato = np.where(sujo < 0.04, np.char.upper(contrato.astype(str)), contrato).astype(object)
    contrato = np.where((sujo >= 0.04) & (sujo < 0.07), np.char.add(contrato.astype(str), " "), contrato).astype(object)
    renda = np.where(rng.random(n) < 0.05, np.nan, renda)
    comprometimento = np.where(rng.random(n) < 0.04, np.nan, comprometimento)
    contrato[rng.random(n) < 0.03] = None
    return pd.DataFrame({
        "id_cliente": rng.permutation(n) + 100001,
        "renda_mensal": renda,
        "comprometimento": comprometimento,
        "atrasos_12m": atrasos,
        "meses_relacionamento": meses,
        "parcelas_em_aberto": parcelas,
        "tipo_contrato": contrato,
        "regiao": regiao,
        "dias_em_cobranca": dias,
        "inadimplente": inadimplente,
    })


def escrever_csv(caminho, n=2000, semente=2026):
    gerar_clientes(n, semente).to_csv(caminho, index=False)
```

### Dicas
1. `df.isna().sum()` conta os ausentes por coluna; `df.select_dtypes("number")` separa as numéricas, e `corrwith(df["inadimplente"])` calcula a correlação de cada uma com o alvo.
2. `df.drop(columns=[...])` devolve uma tabela nova; o acessor `.str` aplica `strip` e `lower` a cada texto e deixa o `NaN` como está.
3. O `stratify=y` mantém a proporção de inadimplentes nos dois lados da divisão.

### Verificação
```json
[
  {"id": "carregar", "checkpoint": 1, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\n", "expr": "[len(df), list(df.columns), df.dtypes.astype(str).tolist()]", "expected": [2000, ["id_cliente", "renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto", "tipo_contrato", "regiao", "dias_em_cobranca", "inadimplente"], ["int64", "float64", "float64", "int64", "int64", "int64", "str", "str", "int64", "int64"]], "name": "carregar lê as 2 000 linhas e as 10 colunas de clientes.csv, com os tipos que o arquivo sugere", "hint": "O arquivo é um CSV comum, separado por vírgulas; não converta nem apague nada ao ler."},
  {"id": "explorar-taxa", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\ne = explorar(df)", "expr": "[e['linhas'], round(e['taxa_inadimplencia'], 6), type(e['taxa_inadimplencia']).__name__]", "expected": [2000, 0.1175, "float"], "name": "explorar conta as linhas e a taxa de inadimplência (fração, float)", "hint": "A taxa é a fração de clientes com inadimplente == 1, não a contagem."},
  {"id": "explorar-ausentes", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\ne = explorar(df)", "expr": "e['ausentes']", "expected": {"renda_mensal": 105, "comprometimento": 84, "tipo_contrato": 57}, "name": "explorar lista os ausentes de cada coluna que tem algum, na ordem das colunas", "hint": "Colunas sem nenhum ausente ficam fora do dicionário; os valores são int."},
  {"id": "explorar-id", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\ne = explorar(df)", "expr": "[e['identificadores'], e['suspeitas']]", "expected": [["id_cliente"], ["dias_em_cobranca"]], "name": "No arquivo, id_cliente é identificador e dias_em_cobranca é suspeita", "hint": "Identificador: tantos valores distintos quanto linhas. Suspeita: correlação com o alvo de 0,5 ou mais em valor absoluto."},
  {"id": "explorar-pequeno", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\nP = pd.DataFrame({'codigo': ['a1', 'b2', 'c3', 'd4', 'e5', 'f6'], 'renda': [3.0, 2.0, 2.5, None, 4.0, 1.0], 'dias': [0, 0, 40, 0, 90, 0], 'garantia': [1, 1, 0, 1, 0, 1], 'plano': ['x', 'y', 'x', 'x', 'y', 'y'], 'inadimplente': [0, 0, 1, 0, 1, 0]})\ne = explorar(P)", "expr": "[e['identificadores'], e['suspeitas'], e['ausentes']]", "expected": [["codigo"], ["garantia", "dias", "renda"], {"renda": 1}], "name": "Tabela de 6 linhas: identificador de texto, suspeitas da mais forte para a mais fraca (a negativa inclusive)", "hint": "Uma correlação de -1 é tão suspeita quanto uma de +1; o texto entra na conta dos identificadores, mas não na das correlações."},
  {"id": "limpar-colunas", "checkpoint": 3, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\nL = limpar(df)", "expr": "list(L.columns)", "expected": ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto", "tipo_contrato", "regiao", "inadimplente"], "name": "limpar tira o identificador e a coluna registrada depois do atraso, e mantém o resto na ordem", "hint": "Saem id_cliente (não diz nada sobre o cliente) e dias_em_cobranca (só existe depois do atraso)."},
  {"id": "limpar-categorias", "checkpoint": 3, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\nL = limpar(df)", "expr": "sorted(L['tipo_contrato'].dropna().unique().tolist())", "expected": ["cartao", "consignado", "pessoal", "veiculo"], "name": "Depois de limpar, tipo_contrato tem só os 4 contratos, sem variações de caixa e de espaço", "hint": "Compare os valores distintos antes e depois: há maiúsculas e espaços sobrando no arquivo."},
  {"id": "limpar-ausentes", "checkpoint": 3, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\nL = limpar(df)", "expr": "[len(L), L.isna().sum()[lambda s: s > 0].to_dict(), L.index.equals(df.index)]", "expected": [2000, {"renda_mensal": 105, "comprometimento": 84, "tipo_contrato": 57}, true], "name": "limpar mantém as 2 000 linhas, o índice e os ausentes como estão", "hint": "Preencher ausentes aprende com os dados (mediana, moda) e por isso vai para o pipeline, depois da divisão. Apagar linhas também muda a amostra."},
  {"id": "limpar-intacta", "checkpoint": 3, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\nantes = df.copy()\nL = limpar(df)", "expr": "bool(df.equals(antes) and list(df.columns) == list(antes.columns))", "expected": true, "name": "limpar não altera a tabela recebida", "hint": "Trabalhe numa tabela nova, sem inplace."},
  {"id": "dividir-tamanhos", "checkpoint": 4, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\nXtr, Xte, ytr, yte = dividir(limpar(df), 2026)", "expr": "[len(Xtr), len(Xte), round(float(ytr.mean()), 4), round(float(yte.mean()), 4), 'inadimplente' in Xtr.columns, 'regiao' in Xtr.columns]", "expected": [1500, 500, 0.1173, 0.118, false, true], "name": "dividir separa 1 500 para treino e 500 para teste, com a mesma taxa de inadimplência dos dois lados", "hint": "Com uma classe rara, a divisão precisa ser estratificada pelo alvo; o alvo sai de X."},
  {"id": "dividir-referencia", "checkpoint": 4, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.model_selection import train_test_split\nD = gerar_clientes(500, 3).drop(columns=['id_cliente', 'dias_em_cobranca'])\nXtr, Xte, ytr, yte = dividir(D, 7)\nrtr, rte, _, _ = train_test_split(D.drop(columns='inadimplente'), D['inadimplente'], test_size=0.25, stratify=D['inadimplente'], random_state=7)", "expr": "bool(Xte.index.tolist() == rte.index.tolist() and Xtr.index.tolist() == rtr.index.tolist())", "expected": true, "name": "Outros 500 clientes, semente 7: as mesmas linhas de uma divisão estratificada de 25 % com essa semente", "hint": "Compara-se com train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)."},
  {"id": "carregar-outro", "checkpoint": 1, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('outro.csv', 300, 9)\nB = carregar('outro.csv')", "expr": "[len(B), int(B['renda_mensal'].isna().sum())]", "expected": [300, 21], "name": "carregar lê o arquivo do caminho recebido (300 clientes de outra semente)", "hint": "Use o caminho recebido, não um nome fixo."},
  {"id": "explorar-outro", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('outro.csv', 300, 9)\ne = explorar(carregar('outro.csv'))", "expr": "[e['linhas'], round(e['taxa_inadimplencia'], 6), e['ausentes']]", "expected": [300, 0.11, {"renda_mensal": 21, "comprometimento": 9, "tipo_contrato": 4}], "name": "Em 300 clientes de outra semente, os números do explorar mudam junto", "hint": "Todo número sai da tabela recebida; nada é digitado."},
  {"id": "explorar-tipos", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\ne = explorar(df)", "expr": "[list(e), type(e['linhas']).__name__, sorted({type(v).__name__ for v in e['ausentes'].values()}), type(e['identificadores']).__name__, type(e['suspeitas']).__name__]", "expected": [["linhas", "taxa_inadimplencia", "ausentes", "identificadores", "suspeitas"], "int", ["int"], "list", "list"], "name": "explorar devolve as 5 chaves, nesta ordem, com int nas contagens e listas de nomes"},
  {"id": "limpar-pequeno", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\nP = pd.DataFrame({'id_cliente': [1, 2, 3, 4], 'renda_mensal': [1000.0, None, 2500.0, 1800.0], 'tipo_contrato': [' Cartao ', 'PESSOAL', None, 'veiculo'], 'dias_em_cobranca': [0, 40, 0, 0], 'inadimplente': [0, 1, 0, 0]}, index=[10, 11, 12, 13])\nL = limpar(P)", "expr": "[list(L.columns), L.index.tolist(), L['tipo_contrato'].fillna('-').tolist(), int(L['renda_mensal'].isna().sum())]", "expected": [["renda_mensal", "tipo_contrato", "inadimplente"], [10, 11, 12, 13], ["cartao", "pessoal", "-", "veiculo"], 1], "name": "Numa tabela de 4 linhas: espaços e maiúsculas saem, o contrato em branco continua em branco e o índice fica", "hint": "strip e lower pelo acessor .str deixam o ausente como ausente; nada é preenchido."},
  {"id": "limpar-valores", "checkpoint": 3, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\nL = limpar(df)", "expr": "bool(L['renda_mensal'].equals(df['renda_mensal']) and L['comprometimento'].equals(df['comprometimento']))", "expected": true, "name": "As colunas numéricas saem da limpeza sem nenhum valor trocado", "hint": "A mediana para preencher a renda é aprendida no pipeline, com o treino de cada partição."},
  {"id": "dividir-disjuntos", "checkpoint": 4, "kind": "expr", "setup": "from dados_credito import escrever_csv\nescrever_csv('clientes.csv', 2000, 2026)\ndf = carregar('clientes.csv')\nXtr, Xte, ytr, yte = dividir(limpar(df), 2026)", "expr": "[len(set(Xtr.index) & set(Xte.index)), len(set(Xtr.index) | set(Xte.index)), bool(Xtr.index.equals(ytr.index) and Xte.index.equals(yte.index))]", "expected": [0, 2000, true], "name": "Treino e teste não têm cliente em comum, juntos cobrem os 2 000, e cada y está alinhado com o seu X"}
]
```

### Soluções erradas
```python name="mantém a coluna do futuro"
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```
```python name="mantém o identificador"
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```
```python name="preenche os ausentes antes de dividir"
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    numericas = limpo.select_dtypes("number").columns
    limpo[numericas] = limpo[numericas].fillna(limpo[numericas].median())
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```
```python name="apaga as linhas com ausentes"
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR).dropna()
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```
```python name="só passa para minúsculas"
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```
```python name="altera a tabela recebida"
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df
    limpo.drop(columns=DESCARTAR, inplace=True)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```
```python name="divide sem estratificar"
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, random_state=semente)
```
```python name="taxa como contagem"
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].sum()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```
```python name="correlação sem valor absoluto"
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO])
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```

## Passo 4 · Exercício · Baseline e pipeline

Antes de qualquer modelo, a régua: uma **baseline** que ignora os atributos e dá a todo cliente a mesma probabilidade, a taxa de inadimplência do treino (`DummyClassifier(strategy="prior")`). Nos 1 500 clientes de treino, ela tem acurácia de 0,883 na validação cruzada, e a logística, 0,888: pela acurácia, os dois parecem iguais. Pela AP, a baseline fica em 0,117 (a própria taxa) e a logística em 0,350. É a AP que separa um modelo que ordena os clientes pelo risco de um que não ordena nada.

O pipeline junta o que o passo anterior deixou de fora: a mediana que preenche a renda, a padronização e a codificação do contrato são aprendidas em cada partição só com as linhas de treino daquela partição. Contratos raros podem aparecer só na validação de uma partição; o codificador precisa aceitá-los sem erro. `regiao` fica fora do modelo: a financeira não decide crédito por região, e a coluna só serve para conferir o resultado por grupo no passo 7.

As funções do passo 3 estão em `credito_base.py`.

### Instruções
1. `montar_pipeline(modelo, imputador=None)` devolve, **sem ajustar**, um `Pipeline` com as etapas `"prep"` e `"modelo"` (o objeto recebido). `"prep"` é um `ColumnTransformer` com dois itens: `"num"`, nas `COLUNAS_NUM`, o `imputador` recebido (ou, se ele for `None`, um `SimpleImputer(strategy="median")`) seguido de um `StandardScaler`; e `"cat"`, nas `COLUNAS_CAT`, um `SimpleImputer(strategy="most_frequent")` seguido de um `OneHotEncoder(handle_unknown="ignore", sparse_output=False)`. As outras colunas são descartadas.
2. `avaliar_cv(pipeline, X, y, semente)` roda o `cross_val_score` do pipeline com `StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)` e `scoring="average_precision"` e devolve `{"ap_media": float, "ap_desvio": float, "notas": lista}`, com o desvio do `np.std` das 5 notas.
3. `baseline(X, y, semente)` devolve o `avaliar_cv` de `montar_pipeline(DummyClassifier(strategy="prior"))`.

### Código inicial
```python
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from credito_base import ALVO, carregar, dividir, explorar, limpar

COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    pass


def avaliar_cv(pipeline, X, y, semente):
    pass


def baseline(X, y, semente):
    pass
```
```python path=credito_base.py
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```
```python path=dados_credito.py
import numpy as np
import pandas as pd

CONTRATOS = ["pessoal", "consignado", "cartao", "veiculo"]
REGIOES = ["A", "B", "C", "D", "E"]


def gerar_clientes(n=2000, semente=2026):
    rng = np.random.default_rng(semente)
    regiao = rng.choice(REGIOES, n, p=[0.3, 0.25, 0.2, 0.15, 0.1])
    deslocamento = np.select([regiao == "A", regiao == "E"], [0.25, -0.3], 0.0)
    renda = np.round(np.exp(rng.normal(8.0 + deslocamento, 0.5, n)), 2)
    comprometimento = np.round(rng.beta(2.0, 5.0, n) * 1.2, 3)
    atrasos = rng.poisson(0.6, n)
    meses = rng.integers(0, 241, n)
    parcelas = rng.integers(0, 7, n)
    contrato = rng.choice(CONTRATOS, n, p=[0.35, 0.25, 0.3, 0.1]).astype(object)
    efeito = np.select([contrato == "cartao", contrato == "consignado"], [0.6, -0.8], 0.0)
    z = (-2.9 + 4.0 * (comprometimento - 0.34) + 0.7 * atrasos - 0.8 * (np.log(renda) - 8.0)
         - 0.006 * (meses - 120) + 0.15 * (parcelas - 3) + efeito)
    inadimplente = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(np.int64)
    dias = np.where(inadimplente == 1, rng.integers(31, 181, n), 0)
    regularizado = (inadimplente == 0) & (rng.random(n) < 0.03)
    dias = np.where(regularizado, rng.integers(1, 16, n), dias)
    sujo = rng.random(n)
    contrato = np.where(sujo < 0.04, np.char.upper(contrato.astype(str)), contrato).astype(object)
    contrato = np.where((sujo >= 0.04) & (sujo < 0.07), np.char.add(contrato.astype(str), " "), contrato).astype(object)
    renda = np.where(rng.random(n) < 0.05, np.nan, renda)
    comprometimento = np.where(rng.random(n) < 0.04, np.nan, comprometimento)
    contrato[rng.random(n) < 0.03] = None
    return pd.DataFrame({
        "id_cliente": rng.permutation(n) + 100001,
        "renda_mensal": renda,
        "comprometimento": comprometimento,
        "atrasos_12m": atrasos,
        "meses_relacionamento": meses,
        "parcelas_em_aberto": parcelas,
        "tipo_contrato": contrato,
        "regiao": regiao,
        "dias_em_cobranca": dias,
        "inadimplente": inadimplente,
    })


def escrever_csv(caminho, n=2000, semente=2026):
    gerar_clientes(n, semente).to_csv(caminho, index=False)
```

### Solução
```python
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from credito_base import ALVO, carregar, dividir, explorar, limpar

COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```
```python path=credito_base.py
import pandas as pd
from sklearn.model_selection import train_test_split

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)
```
```python path=dados_credito.py
import numpy as np
import pandas as pd

CONTRATOS = ["pessoal", "consignado", "cartao", "veiculo"]
REGIOES = ["A", "B", "C", "D", "E"]


def gerar_clientes(n=2000, semente=2026):
    rng = np.random.default_rng(semente)
    regiao = rng.choice(REGIOES, n, p=[0.3, 0.25, 0.2, 0.15, 0.1])
    deslocamento = np.select([regiao == "A", regiao == "E"], [0.25, -0.3], 0.0)
    renda = np.round(np.exp(rng.normal(8.0 + deslocamento, 0.5, n)), 2)
    comprometimento = np.round(rng.beta(2.0, 5.0, n) * 1.2, 3)
    atrasos = rng.poisson(0.6, n)
    meses = rng.integers(0, 241, n)
    parcelas = rng.integers(0, 7, n)
    contrato = rng.choice(CONTRATOS, n, p=[0.35, 0.25, 0.3, 0.1]).astype(object)
    efeito = np.select([contrato == "cartao", contrato == "consignado"], [0.6, -0.8], 0.0)
    z = (-2.9 + 4.0 * (comprometimento - 0.34) + 0.7 * atrasos - 0.8 * (np.log(renda) - 8.0)
         - 0.006 * (meses - 120) + 0.15 * (parcelas - 3) + efeito)
    inadimplente = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(np.int64)
    dias = np.where(inadimplente == 1, rng.integers(31, 181, n), 0)
    regularizado = (inadimplente == 0) & (rng.random(n) < 0.03)
    dias = np.where(regularizado, rng.integers(1, 16, n), dias)
    sujo = rng.random(n)
    contrato = np.where(sujo < 0.04, np.char.upper(contrato.astype(str)), contrato).astype(object)
    contrato = np.where((sujo >= 0.04) & (sujo < 0.07), np.char.add(contrato.astype(str), " "), contrato).astype(object)
    renda = np.where(rng.random(n) < 0.05, np.nan, renda)
    comprometimento = np.where(rng.random(n) < 0.04, np.nan, comprometimento)
    contrato[rng.random(n) < 0.03] = None
    return pd.DataFrame({
        "id_cliente": rng.permutation(n) + 100001,
        "renda_mensal": renda,
        "comprometimento": comprometimento,
        "atrasos_12m": atrasos,
        "meses_relacionamento": meses,
        "parcelas_em_aberto": parcelas,
        "tipo_contrato": contrato,
        "regiao": regiao,
        "dias_em_cobranca": dias,
        "inadimplente": inadimplente,
    })


def escrever_csv(caminho, n=2000, semente=2026):
    gerar_clientes(n, semente).to_csv(caminho, index=False)
```

### Dicas
1. Um `Pipeline` pequeno dentro de cada item do `ColumnTransformer` encadeia o imputador e o transformador daquele grupo de colunas.
2. O `cross_val_score` recebe o pipeline inteiro e o `X` original: nada passa por `fit` ou `fit_transform` antes dele.
3. A métrica vai como texto no `scoring`; com a acurácia, a baseline parece um bom modelo.

### Verificação
```json
[
  {"id": "estrutura", "checkpoint": 1, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nm = LogisticRegression()\np = montar_pipeline(m)", "expr": "[type(p).__name__, list(p.named_steps), p.named_steps['modelo'] is m, hasattr(p, 'classes_')]", "expected": ["Pipeline", ["prep", "modelo"], true, false], "name": "montar_pipeline devolve, sem ajustar, um Pipeline com as etapas prep e modelo, e o modelo é o objeto recebido", "hint": "Não chame fit dentro de montar_pipeline; a etapa modelo é o próprio objeto recebido."},
  {"id": "colunas-saida", "checkpoint": 1, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\np = montar_pipeline(LogisticRegression(max_iter=1000)).fit(X, y)", "expr": "p.named_steps['prep'].get_feature_names_out().tolist()", "expected": ["num__renda_mensal", "num__comprometimento", "num__atrasos_12m", "num__meses_relacionamento", "num__parcelas_em_aberto", "cat__tipo_contrato_cartao", "cat__tipo_contrato_consignado", "cat__tipo_contrato_pessoal", "cat__tipo_contrato_veiculo"], "name": "O preprocessador entrega as 5 numéricas e uma coluna por contrato; regiao e o resto ficam de fora", "hint": "Itens num e cat do ColumnTransformer, com as listas COLUNAS_NUM e COLUNAS_CAT; as demais colunas são descartadas."},
  {"id": "transforma", "checkpoint": 1, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nimport numpy as np\nfrom sklearn.compose import ColumnTransformer\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import OneHotEncoder, StandardScaler\nref = ColumnTransformer([('num', make_pipeline(SimpleImputer(strategy='median'), StandardScaler()), COLUNAS_NUM), ('cat', make_pipeline(SimpleImputer(strategy='most_frequent'), OneHotEncoder(handle_unknown='ignore', sparse_output=False)), COLUNAS_CAT)])\nref.fit(X.iloc[:450], y.iloc[:450])\np = montar_pipeline(LogisticRegression(max_iter=1000)).fit(X.iloc[:450], y.iloc[:450])\n", "expr": "bool(np.allclose(p.named_steps['prep'].transform(X.iloc[450:]), ref.transform(X.iloc[450:])))", "expected": true, "name": "Ajustado em 450 clientes, o preprocessador transforma os outros 150 como a referência", "hint": "Compara-se com: mediana e StandardScaler nas numéricas; categoria mais frequente e OneHotEncoder nas categóricas."},
  {"id": "categoria-nova", "checkpoint": 1, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nimport numpy as np\nfrom sklearn.compose import ColumnTransformer\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import OneHotEncoder, StandardScaler\nref = ColumnTransformer([('num', make_pipeline(SimpleImputer(strategy='median'), StandardScaler()), COLUNAS_NUM), ('cat', make_pipeline(SimpleImputer(strategy='most_frequent'), OneHotEncoder(handle_unknown='ignore', sparse_output=False)), COLUNAS_CAT)])\nref.fit(X.iloc[:450], y.iloc[:450])\np = montar_pipeline(LogisticRegression(max_iter=1000)).fit(X.iloc[:450], y.iloc[:450])\nnova = X.iloc[[0]].copy()\nnova['tipo_contrato'] = 'imobiliario'", "expr": "p.named_steps['prep'].transform(nova)[0, 5:].tolist()", "expected": [0.0, 0.0, 0.0, 0.0], "name": "Um contrato que não apareceu no treino vira uma linha de zeros, sem erro", "hint": "Contratos raros podem cair só na validação de uma partição; o codificador precisa ignorar categorias desconhecidas."},
  {"id": "espiao", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nfrom sklearn.impute import SimpleImputer\nchamadas = []\nclass Espiao(SimpleImputer):\n    def fit(self, X, y=None):\n        chamadas.append(len(X))\n        return super().fit(X, y)\nr = avaliar_cv(montar_pipeline(LogisticRegression(max_iter=1000), Espiao(strategy='median')), X, y, 0)", "expr": "chamadas", "expected": [480, 480, 480, 480, 480], "name": "O imputador recebido é ajustado 5 vezes, cada uma com as 480 linhas de treino da partição", "hint": "O imputador recebido vai dentro do pipeline, e o pipeline inteiro passa pelo cross_val_score: nada é ajustado com as 600 linhas."},
  {"id": "ap-media", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nr = avaliar_cv(montar_pipeline(LogisticRegression(max_iter=1000)), X, y, 0)\n", "expr": "r['ap_media']", "expected": 0.4571437720878369, "tolerance": 1e-09, "name": "600 clientes, logística, semente 0: a precisão média (AP) média das 5 partições", "hint": "scoring=\"average_precision\" com StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)."},
  {"id": "notas", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nr = avaliar_cv(montar_pipeline(LogisticRegression(max_iter=1000)), X, y, 0)\n", "expr": "r['notas']", "expected": [0.43460167332389965, 0.384471169420149, 0.5211250682831212, 0.404638347521424, 0.5408826018905906], "tolerance": 1e-09, "name": "As 5 notas, uma por partição estratificada", "hint": "Com uma classe rara, partições sem estratificar ficam com proporções diferentes de inadimplentes."},
  {"id": "desvio", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nr = avaliar_cv(montar_pipeline(LogisticRegression(max_iter=1000)), X, y, 0)\n", "expr": "[round(r['ap_desvio'], 9), type(r['ap_desvio']).__name__, type(r['notas']).__name__]", "expected": [0.062693015, "float", "list"], "name": "ap_desvio é o desvio (np.std) das 5 notas, como float; notas é uma lista"},
  {"id": "outra-semente", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nr = avaliar_cv(montar_pipeline(LogisticRegression(max_iter=1000)), X, y, 5)", "expr": "r['notas']", "expected": [0.22522718232695565, 0.5034687567446681, 0.3984772651823343, 0.5481546547345579, 0.5470442810384446], "tolerance": 1e-09, "name": "Com a semente 5, as partições (e as notas) são outras", "hint": "O embaralhamento das partições usa a semente recebida."},
  {"id": "baseline", "checkpoint": 3, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nb = baseline(X, y, 0)", "expr": "[round(b['ap_media'], 9), round(b['ap_desvio'], 9)]", "expected": [0.115, 0.003333333], "name": "A baseline (DummyClassifier com a estratégia prior) tem AP igual à proporção de inadimplentes de cada partição", "hint": "A baseline passa pelo mesmo pipeline e pela mesma validação, com a mesma métrica."},
  {"id": "baseline-abaixo", "checkpoint": 3, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nr = avaliar_cv(montar_pipeline(LogisticRegression(max_iter=1000)), X, y, 0)\nb = baseline(X, y, 0)", "expr": "bool(b['ap_media'] < 0.2 < r['ap_media'])", "expected": true, "name": "A baseline fica perto da taxa de inadimplência (abaixo de 0,2) e a logística, acima", "hint": "Com a acurácia, a baseline teria nota perto de 0,9 e pareceria um bom modelo."},
  {"id": "itens", "checkpoint": 1, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nprep = montar_pipeline(LogisticRegression()).named_steps['prep']", "expr": "[type(prep).__name__, [nome for nome, _, _ in prep.transformers], [list(c) for _, _, c in prep.transformers], hasattr(prep, 'transformers_')]", "expected": ["ColumnTransformer", ["num", "cat"], [["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"], ["tipo_contrato"]], false], "name": "prep é um ColumnTransformer ainda não ajustado, com os itens num e cat nas colunas pedidas"},
  {"id": "imputador-recebido", "checkpoint": 1, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nimport numpy as np\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.preprocessing import StandardScaler\np = montar_pipeline(LogisticRegression(max_iter=1000), SimpleImputer(strategy='constant', fill_value=0.0)).fit(X, y)\nnum = StandardScaler().fit(X[COLUNAS_NUM].fillna(0.0))", "expr": "bool(np.allclose(p.named_steps['prep'].transform(X)[:, :5], num.transform(X[COLUNAS_NUM].fillna(0.0))))", "expected": true, "name": "Com um imputador de constante zero recebido, as numéricas são preenchidas com zero e depois padronizadas", "hint": "O imputador recebido substitui o da mediana na etapa das numéricas."},
  {"id": "baseline-notas", "checkpoint": 3, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nfrom sklearn.model_selection import StratifiedKFold\nb = baseline(X, y, 0)\ntaxas = [float(y.iloc[v].mean()) for _, v in StratifiedKFold(n_splits=5, shuffle=True, random_state=0).split(X, y)]", "expr": "[round(a - t, 9) for a, t in zip(b['notas'], taxas)]", "expected": [0.0, 0.0, 0.0, 0.0, 0.0], "name": "A AP de cada partição da baseline é a taxa de inadimplência da validação daquela partição", "hint": "Um score constante não ordena ninguém: a AP fica igual à proporção de positivos."},
  {"id": "baseline-semente", "checkpoint": 3, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nb = baseline(X, y, 5)", "expr": "b['notas']", "expected": [0.10833333333333334, 0.11666666666666667, 0.11666666666666667, 0.11666666666666667, 0.11666666666666667], "tolerance": 1e-09, "name": "A baseline usa as partições da semente recebida"},
  {"id": "outros-dados", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nD2 = limpar(gerar_clientes(400, 2))\nr = avaliar_cv(montar_pipeline(LogisticRegression(max_iter=1000)), D2.drop(columns='inadimplente'), D2['inadimplente'], 1)", "expr": "r['ap_media']", "expected": 0.4090521733629811, "tolerance": 1e-09, "name": "Outros 400 clientes, semente 1: a AP média da logística"},
  {"id": "x-intacto", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 11))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nantes = X.copy()\nr = avaliar_cv(montar_pipeline(LogisticRegression(max_iter=1000)), X, y, 0)", "expr": "bool(X.equals(antes))", "expected": true, "name": "avaliar_cv não altera a tabela recebida", "hint": "Nada é preenchido nem transformado no X original."}
]
```

### Soluções erradas
```python name="pré-processa antes da validação cruzada"
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from credito_base import ALVO, carregar, dividir, explorar, limpar

COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    X_prep = pipeline.named_steps["prep"].fit_transform(X)
    notas = cross_val_score(pipeline.named_steps["modelo"], X_prep, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```
```python name="ignora o imputador recebido"
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from credito_base import ALVO, carregar, dividir, explorar, limpar

COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```
```python name="imputa pela média"
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from credito_base import ALVO, carregar, dividir, explorar, limpar

COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="mean")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```
```python name="esquece a escala"
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from credito_base import ALVO, carregar, dividir, explorar, limpar

COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador)])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```
```python name="categoria nova dá erro"
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from credito_base import ALVO, carregar, dividir, explorar, limpar

COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```
```python name="mantém as outras colunas"
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from credito_base import ALVO, carregar, dividir, explorar, limpar

COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)], remainder="passthrough")
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```
```python name="acurácia como métrica"
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from credito_base import ALVO, carregar, dividir, explorar, limpar

COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="accuracy")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```
```python name="partições sem estratificar"
import numpy as np
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import KFold, StratifiedKFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

from credito_base import ALVO, carregar, dividir, explorar, limpar

COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = KFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```

## Passo 5 · Exercício · Comparar modelos por validação cruzada

Com a régua no lugar, entram três famílias: a regressão logística, uma floresta aleatória e um gradient boosting. Todas passam pelo mesmo pipeline e pelas mesmas partições, e a tabela traz a incerteza junto da média: com 1 500 clientes e 176 inadimplentes, cada partição tem poucas dezenas de positivos, e a AP oscila vários pontos de uma para outra. Repetir a validação cruzada com outro embaralhamento (`RepeatedStratifiedKFold`) estabiliza a média.

Nos 1 500 clientes de treino, o resultado:

| modelo | AP média | desvio | AUC média |
|---|---|---|---|
| baseline | 0,117 | 0,001 | 0,500 |
| logística | 0,348 | 0,046 | 0,758 |
| floresta | 0,297 | 0,033 | 0,715 |
| boosting | 0,279 | 0,044 | 0,717 |

A logística vence, e não por acaso: o gerador é uma regra logística, quase linear nos atributos, e 1 500 linhas são pouco para as árvores aprenderem a mesma coisa por degraus. Em dados reais, o vencedor pode ser outro; por isso a comparação é feita, e não presumida. Uma busca de hiperparâmetros vem depois da escolha da família, também só com o treino: numa grade de 4 valores de `C` para a logística, o melhor ($C = 0{,}1$) tem AP 0,352 na validação da busca, perto dos 0,348 da comparação e dentro do desvio entre partições. A melhor nota de uma busca é otimista, porque foi escolhida entre várias; ela não substitui a avaliação no teste.

As funções dos passos 3 e 4 estão em `credito_base.py`.

### Instruções
1. `modelos_candidatos(semente)` devolve o dicionário, nesta ordem: `"baseline"`, um `DummyClassifier(strategy="prior")`; `"logistica"`, uma `LogisticRegression(max_iter=1000)`; `"floresta"`, um `RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente)`; `"boosting"`, um `HistGradientBoostingClassifier(max_iter=50, random_state=semente)`.
2. `comparar_modelos(X, y, semente, candidatos=None)` usa os `candidatos` recebidos (ou, se forem `None`, os de `modelos_candidatos(semente)`). Cada um passa por `montar_pipeline` e pelo `cross_validate` com `RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)` e `scoring=["average_precision", "roc_auc"]`. Devolve um `DataFrame` com uma linha por candidato (o nome no índice, na ordem do dicionário) e as colunas `ap_media`, `ap_desvio` (o `np.std` das 6 notas) e `auc_media`.
3. `escolher_modelo(tabela)` devolve o nome (`str`) da linha de maior `ap_media`.
4. `buscar_hiperparametros(pipeline, grade, X, y, semente)` roda um `GridSearchCV` com a `grade` recebida, `cv=StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)` e `scoring="average_precision"`, ajusta com `X` e `y` e devolve `{"melhores": best_params_, "ap": best_score_ como float}`.

### Código inicial
```python
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    pass


def comparar_modelos(X, y, semente, candidatos=None):
    pass


def escolher_modelo(tabela):
    pass


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    pass
```
```python path=credito_base.py
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)


COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```
```python path=dados_credito.py
import numpy as np
import pandas as pd

CONTRATOS = ["pessoal", "consignado", "cartao", "veiculo"]
REGIOES = ["A", "B", "C", "D", "E"]


def gerar_clientes(n=2000, semente=2026):
    rng = np.random.default_rng(semente)
    regiao = rng.choice(REGIOES, n, p=[0.3, 0.25, 0.2, 0.15, 0.1])
    deslocamento = np.select([regiao == "A", regiao == "E"], [0.25, -0.3], 0.0)
    renda = np.round(np.exp(rng.normal(8.0 + deslocamento, 0.5, n)), 2)
    comprometimento = np.round(rng.beta(2.0, 5.0, n) * 1.2, 3)
    atrasos = rng.poisson(0.6, n)
    meses = rng.integers(0, 241, n)
    parcelas = rng.integers(0, 7, n)
    contrato = rng.choice(CONTRATOS, n, p=[0.35, 0.25, 0.3, 0.1]).astype(object)
    efeito = np.select([contrato == "cartao", contrato == "consignado"], [0.6, -0.8], 0.0)
    z = (-2.9 + 4.0 * (comprometimento - 0.34) + 0.7 * atrasos - 0.8 * (np.log(renda) - 8.0)
         - 0.006 * (meses - 120) + 0.15 * (parcelas - 3) + efeito)
    inadimplente = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(np.int64)
    dias = np.where(inadimplente == 1, rng.integers(31, 181, n), 0)
    regularizado = (inadimplente == 0) & (rng.random(n) < 0.03)
    dias = np.where(regularizado, rng.integers(1, 16, n), dias)
    sujo = rng.random(n)
    contrato = np.where(sujo < 0.04, np.char.upper(contrato.astype(str)), contrato).astype(object)
    contrato = np.where((sujo >= 0.04) & (sujo < 0.07), np.char.add(contrato.astype(str), " "), contrato).astype(object)
    renda = np.where(rng.random(n) < 0.05, np.nan, renda)
    comprometimento = np.where(rng.random(n) < 0.04, np.nan, comprometimento)
    contrato[rng.random(n) < 0.03] = None
    return pd.DataFrame({
        "id_cliente": rng.permutation(n) + 100001,
        "renda_mensal": renda,
        "comprometimento": comprometimento,
        "atrasos_12m": atrasos,
        "meses_relacionamento": meses,
        "parcelas_em_aberto": parcelas,
        "tipo_contrato": contrato,
        "regiao": regiao,
        "dias_em_cobranca": dias,
        "inadimplente": inadimplente,
    })


def escrever_csv(caminho, n=2000, semente=2026):
    gerar_clientes(n, semente).to_csv(caminho, index=False)
```

### Solução
```python
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python path=credito_base.py
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.impute import SimpleImputer
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)


COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)
```
```python path=dados_credito.py
import numpy as np
import pandas as pd

CONTRATOS = ["pessoal", "consignado", "cartao", "veiculo"]
REGIOES = ["A", "B", "C", "D", "E"]


def gerar_clientes(n=2000, semente=2026):
    rng = np.random.default_rng(semente)
    regiao = rng.choice(REGIOES, n, p=[0.3, 0.25, 0.2, 0.15, 0.1])
    deslocamento = np.select([regiao == "A", regiao == "E"], [0.25, -0.3], 0.0)
    renda = np.round(np.exp(rng.normal(8.0 + deslocamento, 0.5, n)), 2)
    comprometimento = np.round(rng.beta(2.0, 5.0, n) * 1.2, 3)
    atrasos = rng.poisson(0.6, n)
    meses = rng.integers(0, 241, n)
    parcelas = rng.integers(0, 7, n)
    contrato = rng.choice(CONTRATOS, n, p=[0.35, 0.25, 0.3, 0.1]).astype(object)
    efeito = np.select([contrato == "cartao", contrato == "consignado"], [0.6, -0.8], 0.0)
    z = (-2.9 + 4.0 * (comprometimento - 0.34) + 0.7 * atrasos - 0.8 * (np.log(renda) - 8.0)
         - 0.006 * (meses - 120) + 0.15 * (parcelas - 3) + efeito)
    inadimplente = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(np.int64)
    dias = np.where(inadimplente == 1, rng.integers(31, 181, n), 0)
    regularizado = (inadimplente == 0) & (rng.random(n) < 0.03)
    dias = np.where(regularizado, rng.integers(1, 16, n), dias)
    sujo = rng.random(n)
    contrato = np.where(sujo < 0.04, np.char.upper(contrato.astype(str)), contrato).astype(object)
    contrato = np.where((sujo >= 0.04) & (sujo < 0.07), np.char.add(contrato.astype(str), " "), contrato).astype(object)
    renda = np.where(rng.random(n) < 0.05, np.nan, renda)
    comprometimento = np.where(rng.random(n) < 0.04, np.nan, comprometimento)
    contrato[rng.random(n) < 0.03] = None
    return pd.DataFrame({
        "id_cliente": rng.permutation(n) + 100001,
        "renda_mensal": renda,
        "comprometimento": comprometimento,
        "atrasos_12m": atrasos,
        "meses_relacionamento": meses,
        "parcelas_em_aberto": parcelas,
        "tipo_contrato": contrato,
        "regiao": regiao,
        "dias_em_cobranca": dias,
        "inadimplente": inadimplente,
    })


def escrever_csv(caminho, n=2000, semente=2026):
    gerar_clientes(n, semente).to_csv(caminho, index=False)
```

### Dicas
1. Com uma lista em `scoring`, o `cross_validate` devolve as notas em `r["test_average_precision"]` e `r["test_roc_auc"]`.
2. `pd.DataFrame.from_dict(linhas, orient="index")` monta a tabela a partir de um dicionário `{nome: {coluna: valor}}`.
3. O `idxmax` de uma coluna devolve o rótulo do índice da linha de maior valor.

### Verificação
```json
[
  {"id": "candidatos", "checkpoint": 1, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nc = modelos_candidatos(3)", "expr": "[list(c), [type(m).__name__ for m in c.values()]]", "expected": [["baseline", "logistica", "floresta", "boosting"], ["DummyClassifier", "LogisticRegression", "RandomForestClassifier", "HistGradientBoostingClassifier"]], "name": "modelos_candidatos traz a baseline e as três famílias, nesta ordem", "hint": "Chaves baseline, logistica, floresta e boosting; a baseline também é um candidato."},
  {"id": "candidatos-params", "checkpoint": 1, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nc = modelos_candidatos(3)", "expr": "[c['baseline'].strategy, c['logistica'].max_iter, c['floresta'].n_estimators, c['floresta'].min_samples_leaf, c['floresta'].random_state, c['boosting'].max_iter, c['boosting'].random_state]", "expected": ["prior", 1000, 30, 5, 3, 50, 3], "name": "Os hiperparâmetros pedidos, com a semente recebida na floresta e no boosting", "hint": "Todo modelo com sorteio recebe random_state=semente; sem isso, duas execuções dão tabelas diferentes."},
  {"id": "espiao-ajustes", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nchamadas = []\nclass Espiao(LogisticRegression):\n    def fit(self, X, y, sample_weight=None):\n        chamadas.append((len(X), round(float(y.mean()), 3)))\n        return super().fit(X, y, sample_weight)\nt = comparar_modelos(X, y, 0, {'espiao': Espiao(max_iter=1000)})", "expr": "[len(chamadas), sorted({n for n, _ in chamadas})]", "expected": [6, [266, 267]], "name": "Com 3 partições e 2 repetições, cada candidato é ajustado 6 vezes, com 2/3 das linhas", "hint": "RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)."},
  {"id": "espiao-proporcao", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nchamadas = []\nclass Espiao(LogisticRegression):\n    def fit(self, X, y, sample_weight=None):\n        chamadas.append((len(X), round(float(y.mean()), 3)))\n        return super().fit(X, y, sample_weight)\nt = comparar_modelos(X, y, 0, {'espiao': Espiao(max_iter=1000)})", "expr": "sorted({p for _, p in chamadas})", "expected": [0.128, 0.131], "name": "Todo treino de partição tem a mesma proporção de inadimplentes (partições estratificadas)", "hint": "Com uma classe rara, a partição precisa ser estratificada pelo alvo."},
  {"id": "tabela-forma", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nt = comparar_modelos(X, y, 0, {'a': LogisticRegression(max_iter=1000), 'b': DummyClassifier(strategy='prior')})", "expr": "[type(t).__name__, t.index.tolist(), t.columns.tolist()]", "expected": ["DataFrame", ["a", "b"], ["ap_media", "ap_desvio", "auc_media"]], "name": "Uma linha por candidato recebido, na ordem do dicionário, e as colunas ap_media, ap_desvio, auc_media", "hint": "Use os candidatos recebidos quando eles não forem None."},
  {"id": "tabela-valores", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nD3 = limpar(gerar_clientes(300, 21))\nt = comparar_modelos(D3.drop(columns='inadimplente'), D3['inadimplente'], 0)", "expr": "t.to_dict('list')", "expected": {"ap_media": [0.12666666666666668, 0.3875631441812053, 0.3673771147121443, 0.3367208800065396], "ap_desvio": [0.004714045207910321, 0.09294119500873245, 0.10551301217946008, 0.054653763743931875], "auc_media": [0.5, 0.7329587318811456, 0.6562533491412802, 0.6385803492484526]}, "tolerance": 1e-06, "name": "300 clientes, semente 0: AP média, desvio da AP e AUC média dos quatro candidatos", "hint": "Cada candidato passa por montar_pipeline e pelo cross_validate com as métricas average_precision e roc_auc; o desvio é o np.std das 6 notas."},
  {"id": "tabela-outra", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nD2 = limpar(gerar_clientes(300, 8))\nt = comparar_modelos(D2.drop(columns='inadimplente'), D2['inadimplente'], 4, {'logistica': LogisticRegression(max_iter=1000), 'baseline': DummyClassifier(strategy='prior')})", "expr": "t.to_dict('list')", "expected": {"ap_media": [0.3936744809954659, 0.13], "ap_desvio": [0.09646911921631018, 0.0], "auc_media": [0.780430297671677, 0.5]}, "tolerance": 1e-06, "name": "Outros 300 clientes, semente 4, só logística e baseline: as partições (e a tabela) seguem a semente", "hint": "A semente recebida embaralha as partições repetidas."},
  {"id": "escolher", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.11, 0.30, 0.34, 0.33], 'ap_desvio': [0.01, 0.02, 0.06, 0.03], 'auc_media': [0.50, 0.80, 0.78, 0.79]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\n", "expr": "escolher_modelo(T)", "expected": "floresta", "type": "str", "name": "Numa tabela feita à mão, escolhe o candidato de maior AP média", "hint": "O critério é a AP média; a AUC e o desvio aparecem no relatório, mas não decidem."},
  {"id": "escolher-baseline", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.11, 0.30, 0.34, 0.33], 'ap_desvio': [0.01, 0.02, 0.06, 0.03], 'auc_media': [0.50, 0.80, 0.78, 0.79]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nT2 = T.assign(ap_media=[0.40, 0.30, 0.34, 0.33])", "expr": "escolher_modelo(T2)", "expected": "baseline", "name": "Se a baseline tem a maior AP média, a escolha honesta é a baseline"},
  {"id": "busca", "checkpoint": 4, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nb = buscar_hiperparametros(montar_pipeline(LogisticRegression(max_iter=1000)), {'modelo__C': [0.01, 0.1, 1.0, 10.0]}, X, y, 0)", "expr": "[b['melhores'], round(b['ap'], 9)]", "expected": [{"modelo__C": 0.01}, 0.414392619], "name": "Busca do C da logística em 400 clientes: os melhores parâmetros e a AP média deles", "hint": "GridSearchCV com StratifiedKFold(n_splits=3, shuffle=True, random_state=semente) e scoring=\"average_precision\"."},
  {"id": "busca-espiao", "checkpoint": 4, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nchamadas = []\nclass Espiao(LogisticRegression):\n    def fit(self, X, y, sample_weight=None):\n        chamadas.append((len(X), round(float(y.mean()), 3)))\n        return super().fit(X, y, sample_weight)\nb = buscar_hiperparametros(montar_pipeline(Espiao(max_iter=1000)), {'modelo__C': [0.1, 1.0]}, X, y, 0)", "expr": "[n for n, _ in chamadas]", "expected": [266, 267, 267, 266, 267, 267, 400], "name": "Grade de 2 valores: 2 × 3 ajustes nas partições e um último com as 400 linhas", "hint": "Três partições estratificadas e embaralhadas; o refit final usa todas as linhas recebidas."},
  {"id": "tabela-baseline", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nt = comparar_modelos(X, y, 0, {'a': LogisticRegression(max_iter=1000), 'b': DummyClassifier(strategy='prior')})", "expr": "[round(float(t.loc['b', 'auc_media']), 9), bool(t.loc['b', 'ap_media'] < t.loc['a', 'ap_media'])]", "expected": [0.5, true], "name": "Na tabela, a baseline tem AUC 0,5 e AP abaixo da logística"},
  {"id": "tabela-desvio", "checkpoint": 2, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nimport numpy as np\nfrom sklearn.model_selection import RepeatedStratifiedKFold, cross_validate\nt = comparar_modelos(X, y, 0, {'a': LogisticRegression(max_iter=1000)})\nref = cross_validate(montar_pipeline(LogisticRegression(max_iter=1000)), X, y, cv=RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=0), scoring='average_precision')['test_score']", "expr": "[round(float(t.loc['a', 'ap_media'] - ref.mean()), 9), round(float(t.loc['a', 'ap_desvio'] - np.std(ref)), 9)]", "expected": [0.0, 0.0], "name": "ap_media e ap_desvio são a média e o np.std das 6 notas de AP das partições repetidas", "hint": "O desvio é o np.std (populacional) das 6 notas, não o erro padrão nem o desvio amostral."},
  {"id": "escolher-empate", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.11, 0.30, 0.34, 0.33], 'ap_desvio': [0.01, 0.02, 0.06, 0.03], 'auc_media': [0.50, 0.80, 0.78, 0.79]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nT3 = T.assign(ap_media=[0.11, 0.34, 0.34, 0.33])", "expr": "escolher_modelo(T3)", "expected": "logistica", "name": "Empate na AP média: vence o primeiro na ordem da tabela"},
  {"id": "escolher-nomes", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\nT4 = pd.DataFrame({'ap_media': [0.21, 0.25], 'ap_desvio': [0.01, 0.09], 'auc_media': [0.71, 0.70]}, index=['modelo_a', 'modelo_b'])", "expr": "escolher_modelo(T4)", "expected": "modelo_b", "name": "Com outros nomes no índice, devolve o nome da linha vencedora"},
  {"id": "busca-outra", "checkpoint": 4, "kind": "expr", "setup": "from dados_credito import gerar_clientes\nfrom sklearn.dummy import DummyClassifier\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(400, 21))\nX = D.drop(columns='inadimplente')\ny = D['inadimplente']\nb = buscar_hiperparametros(montar_pipeline(LogisticRegression(max_iter=1000)), {'modelo__C': [0.5, 5.0]}, X, y, 2)", "expr": "[b['melhores'], round(b['ap'], 9), type(b['ap']).__name__]", "expected": [{"modelo__C": 0.5}, 0.451335819, "float"], "name": "Outra grade e outra semente: os melhores parâmetros e a AP, como float"}
]
```

### Soluções erradas
```python name="sem a baseline"
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python name="floresta sem semente"
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python name="ignora os candidatos recebidos"
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python name="partições sem estratificar"
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedKFold, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python name="uma repetição só"
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=1, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python name="acurácia como métrica"
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["accuracy", "roc_auc"])
        ap = r["test_accuracy"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python name="avalia no treino"
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        ajustado = montar_pipeline(modelo).fit(X, y)
        s = ajustado.predict_proba(X)[:, 1]
        from sklearn.metrics import average_precision_score, roc_auc_score
        r = {"test_average_precision": np.array([average_precision_score(y, s)]), "test_roc_auc": np.array([roc_auc_score(y, s)])}
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python name="escolhe pela AUC"
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["auc_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python name="escolhe o menor desvio"
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_desvio"].idxmin())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python name="busca pela acurácia"
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv)
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python name="busca sem embaralhar"
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_validate

from credito_base import ALVO, avaliar_cv, baseline, carregar, dividir, limpar, montar_pipeline


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=3, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```

## Passo 6 · Exercício · Limiar pelo custo e o teste, uma vez

O modelo devolve probabilidades; a financeira precisa de uma decisão. Com o limiar padrão de 0,5, a logística marca só 5 dos 500 clientes de teste, encontra 5 % dos inadimplentes e custa 0,564 por cliente. Como o falso negativo custa 5 vezes o falso positivo, o limiar de menor custo fica bem abaixo de 0,5.

O limiar é um hiperparâmetro, então é escolhido **sem o teste**. Os scores para escolhê-lo saem da validação cruzada no treino: cada cliente recebe o score de um modelo que não o viu (`cross_val_predict`). Scores do próprio treino seriam otimistas, mais extremos do que os de clientes novos, e puxariam o limiar para o lugar errado. Nos 1 500 clientes de treino, o limiar de menor custo é 0,193.

Só então o teste entra, **uma vez**: o pipeline é ajustado com o treino inteiro, pontua os 500 clientes de teste, e o limiar já escolhido decide. O custo medido foi 0,412 por cliente, contra 0,564 com o limiar 0,5 e 0,590 da baseline, que não marca ninguém. Escolher o limiar de novo olhando o teste daria 0,183 e um custo de 0,384, mais bonito e falso: esse limiar foi ajustado ao acaso daqueles 500 clientes.

`custo_total` já está pronta no código. As funções dos passos 3 a 5 estão em `credito_base.py`.

### Instruções
1. `scores_fora_da_dobra(pipeline, X, y, semente)` devolve o array dos scores da classe 1 (`predict_proba[:, 1]`) de cada linha, obtidos pelo `cross_val_predict` com `StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)`.
2. `escolher_limiar(y, scores, custo_fp, custo_fn)` testa como limiar cada score distinto (marca quem tem `score >= limiar`) e devolve, como `float`, o de menor `custo_total`; em empate, o menor limiar.
3. `avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn)` ajusta um `clone` do pipeline com o treino, calcula os scores do teste uma vez e devolve `{"ap", "auc", "precisao", "recall", "custo_por_cliente", "marcados", "previstos"}`: AP e AUC dos scores; precisão e recall das marcações `score >= limiar` (com `zero_division=0`); `custo_total` dividido pelo número de clientes do teste; quantos foram marcados (`int`); e as marcações, como lista de 0 e 1 na ordem do teste.

### Código inicial
```python
import numpy as np
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    pass


def escolher_limiar(y, scores, custo_fp, custo_fn):
    pass


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    pass
```
```python path=credito_base.py
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_val_score, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)


COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python path=dados_credito.py
import numpy as np
import pandas as pd

CONTRATOS = ["pessoal", "consignado", "cartao", "veiculo"]
REGIOES = ["A", "B", "C", "D", "E"]


def gerar_clientes(n=2000, semente=2026):
    rng = np.random.default_rng(semente)
    regiao = rng.choice(REGIOES, n, p=[0.3, 0.25, 0.2, 0.15, 0.1])
    deslocamento = np.select([regiao == "A", regiao == "E"], [0.25, -0.3], 0.0)
    renda = np.round(np.exp(rng.normal(8.0 + deslocamento, 0.5, n)), 2)
    comprometimento = np.round(rng.beta(2.0, 5.0, n) * 1.2, 3)
    atrasos = rng.poisson(0.6, n)
    meses = rng.integers(0, 241, n)
    parcelas = rng.integers(0, 7, n)
    contrato = rng.choice(CONTRATOS, n, p=[0.35, 0.25, 0.3, 0.1]).astype(object)
    efeito = np.select([contrato == "cartao", contrato == "consignado"], [0.6, -0.8], 0.0)
    z = (-2.9 + 4.0 * (comprometimento - 0.34) + 0.7 * atrasos - 0.8 * (np.log(renda) - 8.0)
         - 0.006 * (meses - 120) + 0.15 * (parcelas - 3) + efeito)
    inadimplente = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(np.int64)
    dias = np.where(inadimplente == 1, rng.integers(31, 181, n), 0)
    regularizado = (inadimplente == 0) & (rng.random(n) < 0.03)
    dias = np.where(regularizado, rng.integers(1, 16, n), dias)
    sujo = rng.random(n)
    contrato = np.where(sujo < 0.04, np.char.upper(contrato.astype(str)), contrato).astype(object)
    contrato = np.where((sujo >= 0.04) & (sujo < 0.07), np.char.add(contrato.astype(str), " "), contrato).astype(object)
    renda = np.where(rng.random(n) < 0.05, np.nan, renda)
    comprometimento = np.where(rng.random(n) < 0.04, np.nan, comprometimento)
    contrato[rng.random(n) < 0.03] = None
    return pd.DataFrame({
        "id_cliente": rng.permutation(n) + 100001,
        "renda_mensal": renda,
        "comprometimento": comprometimento,
        "atrasos_12m": atrasos,
        "meses_relacionamento": meses,
        "parcelas_em_aberto": parcelas,
        "tipo_contrato": contrato,
        "regiao": regiao,
        "dias_em_cobranca": dias,
        "inadimplente": inadimplente,
    })


def escrever_csv(caminho, n=2000, semente=2026):
    gerar_clientes(n, semente).to_csv(caminho, index=False)
```

### Solução
```python
import numpy as np
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return float(candidatos[int(np.argmin(custos))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python path=credito_base.py
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_val_score, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)


COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}
```
```python path=dados_credito.py
import numpy as np
import pandas as pd

CONTRATOS = ["pessoal", "consignado", "cartao", "veiculo"]
REGIOES = ["A", "B", "C", "D", "E"]


def gerar_clientes(n=2000, semente=2026):
    rng = np.random.default_rng(semente)
    regiao = rng.choice(REGIOES, n, p=[0.3, 0.25, 0.2, 0.15, 0.1])
    deslocamento = np.select([regiao == "A", regiao == "E"], [0.25, -0.3], 0.0)
    renda = np.round(np.exp(rng.normal(8.0 + deslocamento, 0.5, n)), 2)
    comprometimento = np.round(rng.beta(2.0, 5.0, n) * 1.2, 3)
    atrasos = rng.poisson(0.6, n)
    meses = rng.integers(0, 241, n)
    parcelas = rng.integers(0, 7, n)
    contrato = rng.choice(CONTRATOS, n, p=[0.35, 0.25, 0.3, 0.1]).astype(object)
    efeito = np.select([contrato == "cartao", contrato == "consignado"], [0.6, -0.8], 0.0)
    z = (-2.9 + 4.0 * (comprometimento - 0.34) + 0.7 * atrasos - 0.8 * (np.log(renda) - 8.0)
         - 0.006 * (meses - 120) + 0.15 * (parcelas - 3) + efeito)
    inadimplente = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(np.int64)
    dias = np.where(inadimplente == 1, rng.integers(31, 181, n), 0)
    regularizado = (inadimplente == 0) & (rng.random(n) < 0.03)
    dias = np.where(regularizado, rng.integers(1, 16, n), dias)
    sujo = rng.random(n)
    contrato = np.where(sujo < 0.04, np.char.upper(contrato.astype(str)), contrato).astype(object)
    contrato = np.where((sujo >= 0.04) & (sujo < 0.07), np.char.add(contrato.astype(str), " "), contrato).astype(object)
    renda = np.where(rng.random(n) < 0.05, np.nan, renda)
    comprometimento = np.where(rng.random(n) < 0.04, np.nan, comprometimento)
    contrato[rng.random(n) < 0.03] = None
    return pd.DataFrame({
        "id_cliente": rng.permutation(n) + 100001,
        "renda_mensal": renda,
        "comprometimento": comprometimento,
        "atrasos_12m": atrasos,
        "meses_relacionamento": meses,
        "parcelas_em_aberto": parcelas,
        "tipo_contrato": contrato,
        "regiao": regiao,
        "dias_em_cobranca": dias,
        "inadimplente": inadimplente,
    })


def escrever_csv(caminho, n=2000, semente=2026):
    gerar_clientes(n, semente).to_csv(caminho, index=False)
```

### Dicas
1. `cross_val_predict(..., method="predict_proba")` devolve uma linha de probabilidades por cliente, cada uma calculada pelo modelo da partição em que o cliente ficou de fora.
2. `np.unique` devolve os scores distintos já em ordem crescente, e `np.argmin` devolve a primeira posição do menor custo.
3. O `predict` do pipeline usa o limiar 0,5; para usar o seu, compare os scores com ele.

### Verificação
```json
[
  {"id": "oof-espiao", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\nchamadas = []\nclass Espiao(LogisticRegression):\n    def fit(self, X, y, sample_weight=None):\n        chamadas.append(['fit', len(X)])\n        return super().fit(X, y, sample_weight)\n    def predict_proba(self, X):\n        chamadas.append(['proba', len(X)])\n        return super().predict_proba(X)\ns = scores_fora_da_dobra(montar_pipeline(Espiao(max_iter=1000)), Xtr, ytr, 0)", "expr": "chamadas", "expected": [["fit", 360], ["proba", 90], ["fit", 360], ["proba", 90], ["fit", 360], ["proba", 90], ["fit", 360], ["proba", 90], ["fit", 360], ["proba", 90]], "name": "Cada score vem de um modelo que não viu a linha: 5 ajustes com 360 linhas, cada um pontuando as 90 restantes", "hint": "Os scores para escolher o limiar saem da validação cruzada (cross_val_predict), nunca de um modelo ajustado nas mesmas linhas."},
  {"id": "oof-valores", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\nfrom sklearn.model_selection import StratifiedKFold, cross_val_predict\nref = cross_val_predict(montar_pipeline(LogisticRegression(max_iter=1000)), Xtr, ytr, cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=0), method='predict_proba')[:, 1]\ns = scores_fora_da_dobra(montar_pipeline(LogisticRegression(max_iter=1000)), Xtr, ytr, 0)", "expr": "[type(s).__name__, len(s), bool(np.allclose(s, ref))]", "expected": ["ndarray", 450, true], "name": "Os 450 scores batem com os de uma validação cruzada estratificada de 5 partições, embaralhada pela semente", "hint": "Compara-se com cross_val_predict(..., cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=semente), method=\"predict_proba\")[:, 1]."},
  {"id": "limiar-pequeno", "checkpoint": 2, "kind": "expr", "setup": "yp = [0, 0, 1, 0, 1, 1, 0, 0]\nsp = [0.1, 0.4, 0.35, 0.2, 0.8, 0.6, 0.55, 0.05]\n", "expr": "escolher_limiar(yp, sp, 1, 5)", "expected": 0.35, "type": "float", "tolerance": 1e-12, "name": "8 clientes, falso negativo 5 vezes mais caro: o limiar de menor custo é 0.35", "hint": "Teste cada score distinto como limiar (score >= limiar marca) e fique com o de menor custo_total."},
  {"id": "limiar-custos", "checkpoint": 2, "kind": "expr", "setup": "yp = [0, 0, 1, 0, 1, 1, 0, 0]\nsp = [0.1, 0.4, 0.35, 0.2, 0.8, 0.6, 0.55, 0.05]\n", "expr": "escolher_limiar(yp, sp, 5, 1)", "expected": 0.6, "tolerance": 1e-12, "name": "Os mesmos 8 clientes com o falso positivo mais caro: o limiar sobe para 0.6", "hint": "custo_fp multiplica os falsos positivos e custo_fn, os falsos negativos."},
  {"id": "limiar-empate", "checkpoint": 2, "kind": "expr", "setup": "", "expr": "escolher_limiar([0, 1, 0, 1], [0.2, 0.4, 0.6, 0.8], 1, 1)", "expected": 0.4, "tolerance": 1e-12, "name": "Empate de custo entre 0.4 e 0.8: vence o menor limiar", "hint": "Em empate, o menor limiar; np.argmin devolve a primeira posição do mínimo."},
  {"id": "limiar-real", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\nfrom sklearn.model_selection import StratifiedKFold, cross_val_predict\nref = cross_val_predict(montar_pipeline(LogisticRegression(max_iter=1000)), Xtr, ytr, cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=0), method='predict_proba')[:, 1]\n", "expr": "escolher_limiar(ytr, ref, 1, 5)", "expected": 0.24434308360551618, "tolerance": 1e-09, "name": "Com os scores fora da dobra de 450 clientes e custos 1 e 5, o limiar de menor custo"},
  {"id": "final-espiao", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\nchamadas = []\nclass Espiao(LogisticRegression):\n    def fit(self, X, y, sample_weight=None):\n        chamadas.append(['fit', len(X)])\n        return super().fit(X, y, sample_weight)\n    def predict_proba(self, X):\n        chamadas.append(['proba', len(X)])\n        return super().predict_proba(X)\nr = avaliar_final(montar_pipeline(Espiao(max_iter=1000)), Xtr, ytr, Xte, yte, 0.2, 1, 5)", "expr": "chamadas", "expected": [["fit", 450], ["proba", 150]], "name": "avaliar_final ajusta uma vez com as 450 linhas de treino e pontua uma vez as 150 de teste", "hint": "O teste não entra no ajuste e é pontuado uma única vez, com o limiar recebido."},
  {"id": "final-valores", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\nf = lambda limiar: avaliar_final(montar_pipeline(LogisticRegression(max_iter=1000)), Xtr, ytr, Xte, yte, limiar, 1, 5)\nr = f(0.2)", "expr": "{k: v for k, v in r.items() if k != 'previstos'}", "expected": {"ap": 0.2320082593230156, "auc": 0.6874246685415829, "precisao": 0.23529411764705882, "recall": 0.42105263157894735, "custo_por_cliente": 0.54, "marcados": 34}, "tolerance": 1e-09, "name": "Limiar 0.2 e custos 1 e 5: AP, AUC, precisão, recall, custo por cliente e marcados no teste", "hint": "AP e AUC usam os scores; precisão, recall, custo e marcados usam score >= limiar."},
  {"id": "final-limiar", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\nf = lambda limiar: avaliar_final(montar_pipeline(LogisticRegression(max_iter=1000)), Xtr, ytr, Xte, yte, limiar, 1, 5)\n", "expr": "[f(0.05)['marcados'], f(0.5)['marcados'], sum(f(0.05)['previstos'])]", "expected": [87, 3, 87], "name": "O limiar recebido decide quem é marcado: 0.05 marca muito mais que 0.5", "hint": "Use o limiar recebido; não o escolha de novo com os dados de teste e não use predict (limiar 0,5)."},
  {"id": "final-tipos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\nf = lambda limiar: avaliar_final(montar_pipeline(LogisticRegression(max_iter=1000)), Xtr, ytr, Xte, yte, limiar, 1, 5)\nr = f(0.2)", "expr": "[[k, type(v).__name__] for k, v in r.items()] + [len(r['previstos'])]", "expected": [["ap", "float"], ["auc", "float"], ["precisao", "float"], ["recall", "float"], ["custo_por_cliente", "float"], ["marcados", "int"], ["previstos", "list"], 150], "name": "As chaves pedidas, com float, int e a lista de 150 marcações"},
  {"id": "oof-semente", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\nfrom sklearn.model_selection import StratifiedKFold, cross_val_predict\nref3 = cross_val_predict(montar_pipeline(LogisticRegression(max_iter=1000)), Xtr, ytr, cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=3), method='predict_proba')[:, 1]\ns = scores_fora_da_dobra(montar_pipeline(LogisticRegression(max_iter=1000)), Xtr, ytr, 3)", "expr": "bool(np.allclose(s, ref3))", "expected": true, "name": "Com a semente 3, as partições (e os scores) seguem a semente", "hint": "O embaralhamento das partições usa a semente recebida."},
  {"id": "limiar-arrays", "checkpoint": 2, "kind": "expr", "setup": "yp = [0, 0, 1, 0, 1, 1, 0, 0]\nsp = [0.1, 0.4, 0.35, 0.2, 0.8, 0.6, 0.55, 0.05]\nimport numpy as np", "expr": "escolher_limiar(np.array(yp), np.array(sp), 1, 5)", "expected": 0.35, "type": "float", "tolerance": 1e-12, "name": "Com arrays do numpy no lugar de listas, o mesmo limiar, como float"},
  {"id": "limiar-perfeito", "checkpoint": 2, "kind": "expr", "setup": "", "expr": "escolher_limiar([0, 0, 0, 1], [0.1, 0.2, 0.3, 0.9], 1, 5)", "expected": 0.9, "tolerance": 1e-12, "name": "Scores que separam perfeitamente: o limiar é o score do único inadimplente, com custo zero"},
  {"id": "final-outro-limiar", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\nf = lambda limiar: avaliar_final(montar_pipeline(LogisticRegression(max_iter=1000)), Xtr, ytr, Xte, yte, limiar, 1, 5)\nr = f(0.1)", "expr": "{k: v for k, v in r.items() if k != 'previstos'}", "expected": {"ap": 0.2320082593230156, "auc": 0.6874246685415829, "precisao": 0.19047619047619047, "recall": 0.631578947368421, "custo_por_cliente": 0.5733333333333334, "marcados": 63}, "tolerance": 1e-09, "name": "Limiar 0.1: mais marcados, mais recall e outro custo"},
  {"id": "final-previstos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\nf = lambda limiar: avaliar_final(montar_pipeline(LogisticRegression(max_iter=1000)), Xtr, ytr, Xte, yte, limiar, 1, 5)\nref = montar_pipeline(LogisticRegression(max_iter=1000)).fit(Xtr, ytr)\nesperado = (ref.predict_proba(Xte)[:, 1] >= 0.2).astype(int).tolist()\nr = f(0.2)", "expr": "r['previstos'] == esperado", "expected": true, "name": "previstos são as marcações score >= limiar do modelo ajustado no treino, na ordem do teste", "hint": "Compara-se com (predict_proba(X_teste)[:, 1] >= limiar) de um pipeline ajustado só com o treino."},
  {"id": "final-intacto", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom dados_credito import gerar_clientes\nfrom sklearn.linear_model import LogisticRegression\nD = limpar(gerar_clientes(600, 31))\nXtr, Xte, ytr, yte = dividir(D, 0)\np = montar_pipeline(LogisticRegression(max_iter=1000))\nr = avaliar_final(p, Xtr, ytr, Xte, yte, 0.2, 1, 5)", "expr": "hasattr(p.named_steps['modelo'], 'coef_')", "expected": false, "name": "O pipeline recebido não é ajustado: avaliar_final trabalha num clone", "hint": "clone(pipeline) cria uma cópia sem o que foi aprendido; ajuste a cópia."}
]
```

### Soluções erradas
```python name="scores no próprio treino"
import numpy as np
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return clone(pipeline).fit(X, y).predict_proba(X)[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return float(candidatos[int(np.argmin(custos))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python name="partições sem embaralhar"
import numpy as np
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return float(candidatos[int(np.argmin(custos))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python name="limiar fixo em 0,5"
import numpy as np
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return 0.5


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python name="empate fica com o maior limiar"
import numpy as np
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return float(candidatos[len(custos) - 1 - int(np.argmin(custos[::-1]))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python name="custos trocados"
import numpy as np
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fn, custo_fp) for limiar in candidatos]
    return float(candidatos[int(np.argmin(custos))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python name="escolhe o limiar de novo no teste"
import numpy as np
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return float(candidatos[int(np.argmin(custos))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    scores = modelo.predict_proba(X_teste)[:, 1]
    limiar = escolher_limiar(y_teste, scores, custo_fp, custo_fn)
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python name="marca pelo predict"
import numpy as np
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return float(candidatos[int(np.argmin(custos))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = modelo.predict(X_teste)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python name="ajusta com treino e teste"
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return float(candidatos[int(np.argmin(custos))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(pd.concat([X_treino, X_teste]), pd.concat([y_treino, y_teste]))
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python name="avalia no treino"
import numpy as np
from sklearn.base import clone
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict

from credito_base import ALVO, carregar, comparar_modelos, dividir, escolher_modelo, limpar, modelos_candidatos, montar_pipeline


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return float(candidatos[int(np.argmin(custos))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    X_teste, y_teste = X_treino, y_treino
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```

## Passo 7 · Exercício · Por região e o model card

O último produto do projeto é um texto: o *model card* que acompanha o modelo e diz o que ele faz, como foi medido, onde falha e o que ninguém deve concluir dele. Ele é gerado pelo código, a partir dos resultados, para que nenhum número seja copiado à mão e fique velho quando os dados mudarem.

Uma seção confere o resultado por região. A região não entra no modelo, mas a renda entra, e a renda típica muda de uma região para outra: a taxa de clientes marcados pode mudar também. Nos 500 clientes de teste, ela foi de 11,1 % na região E a 23,4 % na D. Só que D e E têm **3 inadimplentes cada** no teste: o recall de 0,667 em D e de 0,333 em E é a diferença de um cliente. O relatório mostra o $n$ e avisa quando há poucos positivos, em vez de deixar que um número desses vire conclusão.

Este é o relatório dos 2 000 clientes, gerado pelas funções de todos os passos:

```text
# Model card: previsão de inadimplência

## Comparação na validação cruzada (só o treino)
- baseline: AP 0.117 ± 0.001, AUC 0.500
- logistica: AP 0.348 ± 0.046, AUC 0.758
- floresta: AP 0.297 ± 0.033, AUC 0.715
- boosting: AP 0.279 ± 0.044, AUC 0.717
Modelo escolhido: logistica

## Limiar
Limiar 0.193, escolhido com scores fora da dobra do treino (custo FP 1, custo FN 5).

## Teste (usado uma vez)
- AP: 0.344
- AUC: 0.762
- precisão: 0.330
- recall: 0.508
- custo por cliente: 0.412
- marcados: 91

## Por região
- A: n 142, inadimplentes 24, marcados 17.6 %, recall 0.500
- B: n 129, inadimplentes 18, marcados 17.8 %, recall 0.500
- C: n 120, inadimplentes 11, marcados 19.2 %, recall 0.545
- D: n 64, inadimplentes 3, marcados 23.4 %, recall 0.667 (poucos inadimplentes)
- E: n 45, inadimplentes 3, marcados 11.1 %, recall 0.333 (poucos inadimplentes)

## Limitações
- Dados fictícios: os números não valem para clientes reais.
- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.
- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.
- A região não entra no modelo, mas a taxa de marcados vai de 11.1 % (E) a 23.4 % (D).
```

As funções dos passos 3 a 6 estão em `credito_base.py`, e as três limitações fixas, na lista `LIMITACOES`.

### Instruções
1. `resumo_por_regiao(y, previstos, regiao)` recebe os rótulos, as marcações (0 e 1) e a região de cada cliente (listas, arrays ou Series, alinhados **pela posição**) e devolve `{região: {"n", "inadimplentes", "taxa_marcados", "recall"}}`, com as regiões em ordem alfabética: o número de clientes e o de inadimplentes da região (`int`), a fração de marcados na região (`float`) e a fração de marcados entre os inadimplentes da região (`float`, ou `None` se a região não tem inadimplente).
2. `gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao)` devolve o texto no formato do exemplo acima, linha por linha, terminado por uma quebra de linha: `tabela` é a de `comparar_modelos`, `final` o dicionário de `avaliar_final` e `por_regiao` o de `resumo_por_regiao`. Os números da comparação, do limiar e do teste têm 3 casas decimais; a taxa de marcados vai em porcentagem com 1 casa; os custos e os marcados, como recebidos.
3. Na seção por região, `recall None` vira o texto `recall indefinido`, e uma região com menos de 10 inadimplentes ganha ` (poucos inadimplentes)` no fim da linha. As `LIMITACOES` vêm depois do título `## Limitações`, e a última linha cita a menor e a maior taxa de marcados entre as regiões, com o nome de cada uma (em empate, a primeira em ordem alfabética).

### Código inicial
```python
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    pass


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    pass
```
```python path=credito_base.py
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_val_predict, cross_val_score, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)


COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return float(candidatos[int(np.argmin(custos))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python path=dados_credito.py
import numpy as np
import pandas as pd

CONTRATOS = ["pessoal", "consignado", "cartao", "veiculo"]
REGIOES = ["A", "B", "C", "D", "E"]


def gerar_clientes(n=2000, semente=2026):
    rng = np.random.default_rng(semente)
    regiao = rng.choice(REGIOES, n, p=[0.3, 0.25, 0.2, 0.15, 0.1])
    deslocamento = np.select([regiao == "A", regiao == "E"], [0.25, -0.3], 0.0)
    renda = np.round(np.exp(rng.normal(8.0 + deslocamento, 0.5, n)), 2)
    comprometimento = np.round(rng.beta(2.0, 5.0, n) * 1.2, 3)
    atrasos = rng.poisson(0.6, n)
    meses = rng.integers(0, 241, n)
    parcelas = rng.integers(0, 7, n)
    contrato = rng.choice(CONTRATOS, n, p=[0.35, 0.25, 0.3, 0.1]).astype(object)
    efeito = np.select([contrato == "cartao", contrato == "consignado"], [0.6, -0.8], 0.0)
    z = (-2.9 + 4.0 * (comprometimento - 0.34) + 0.7 * atrasos - 0.8 * (np.log(renda) - 8.0)
         - 0.006 * (meses - 120) + 0.15 * (parcelas - 3) + efeito)
    inadimplente = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(np.int64)
    dias = np.where(inadimplente == 1, rng.integers(31, 181, n), 0)
    regularizado = (inadimplente == 0) & (rng.random(n) < 0.03)
    dias = np.where(regularizado, rng.integers(1, 16, n), dias)
    sujo = rng.random(n)
    contrato = np.where(sujo < 0.04, np.char.upper(contrato.astype(str)), contrato).astype(object)
    contrato = np.where((sujo >= 0.04) & (sujo < 0.07), np.char.add(contrato.astype(str), " "), contrato).astype(object)
    renda = np.where(rng.random(n) < 0.05, np.nan, renda)
    comprometimento = np.where(rng.random(n) < 0.04, np.nan, comprometimento)
    contrato[rng.random(n) < 0.03] = None
    return pd.DataFrame({
        "id_cliente": rng.permutation(n) + 100001,
        "renda_mensal": renda,
        "comprometimento": comprometimento,
        "atrasos_12m": atrasos,
        "meses_relacionamento": meses,
        "parcelas_em_aberto": parcelas,
        "tipo_contrato": contrato,
        "regiao": regiao,
        "dias_em_cobranca": dias,
        "inadimplente": inadimplente,
    })


def escrever_csv(caminho, n=2000, semente=2026):
    gerar_clientes(n, semente).to_csv(caminho, index=False)
```

### Solução
```python
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    y = np.asarray(y)
    previstos = np.asarray(previstos)
    regiao = np.asarray(regiao)
    resumo = {}
    for nome in sorted(set(regiao.tolist())):
        no_grupo = regiao == nome
        positivos = no_grupo & (y == 1)
        resumo[str(nome)] = {
            "n": int(no_grupo.sum()),
            "inadimplentes": int(positivos.sum()),
            "taxa_marcados": float(previstos[no_grupo].mean()),
            "recall": float(previstos[positivos].mean()) if positivos.any() else None,
        }
    return resumo


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    linhas = ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)"]
    for nome, linha in tabela.iterrows():
        linhas.append(f"- {nome}: AP {linha['ap_media']:.3f} ± {linha['ap_desvio']:.3f}, AUC {linha['auc_media']:.3f}")
    linhas += [f"Modelo escolhido: {escolhido}", "", "## Limiar",
               f"Limiar {limiar:.3f}, escolhido com scores fora da dobra do treino (custo FP {custo_fp}, custo FN {custo_fn}).",
               "", "## Teste (usado uma vez)",
               f"- AP: {final['ap']:.3f}", f"- AUC: {final['auc']:.3f}",
               f"- precisão: {final['precisao']:.3f}", f"- recall: {final['recall']:.3f}",
               f"- custo por cliente: {final['custo_por_cliente']:.3f}", f"- marcados: {final['marcados']}",
               "", "## Por região"]
    for nome, g in por_regiao.items():
        recall = "recall indefinido" if g["recall"] is None else f"recall {g['recall']:.3f}"
        linha = f"- {nome}: n {g['n']}, inadimplentes {g['inadimplentes']}, marcados {100 * g['taxa_marcados']:.1f} %, {recall}"
        if g["inadimplentes"] < 10:
            linha += " (poucos inadimplentes)"
        linhas.append(linha)
    menor = min(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    maior = max(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    linhas += ["", "## Limitações", *LIMITACOES,
               f"- A região não entra no modelo, mas a taxa de marcados vai de "
               f"{100 * por_regiao[menor]['taxa_marcados']:.1f} % ({menor}) a {100 * por_regiao[maior]['taxa_marcados']:.1f} % ({maior})."]
    return "\n".join(linhas) + "\n"
```
```python path=credito_base.py
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.compose import ColumnTransformer
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import HistGradientBoostingClassifier, RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import GridSearchCV, RepeatedStratifiedKFold, StratifiedKFold, cross_val_predict, cross_val_score, cross_validate, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

ALVO = "inadimplente"
DESCARTAR = ["id_cliente", "dias_em_cobranca"]


def carregar(caminho):
    return pd.read_csv(caminho)


def explorar(df):
    ausentes = df.isna().sum()
    numericas = df.select_dtypes("number").drop(columns=ALVO)
    correlacoes = numericas.corrwith(df[ALVO]).abs()
    suspeitas = correlacoes[correlacoes >= 0.5].sort_values(ascending=False)
    return {
        "linhas": len(df),
        "taxa_inadimplencia": float(df[ALVO].mean()),
        "ausentes": {coluna: int(n) for coluna, n in ausentes.items() if n > 0},
        "identificadores": [coluna for coluna in df.columns if df[coluna].nunique() == len(df)],
        "suspeitas": suspeitas.index.tolist(),
    }


def limpar(df):
    limpo = df.drop(columns=DESCARTAR)
    limpo["tipo_contrato"] = limpo["tipo_contrato"].str.strip().str.lower()
    return limpo


def dividir(df, semente):
    X = df.drop(columns=ALVO)
    y = df[ALVO]
    return train_test_split(X, y, test_size=0.25, stratify=y, random_state=semente)


COLUNAS_NUM = ["renda_mensal", "comprometimento", "atrasos_12m", "meses_relacionamento", "parcelas_em_aberto"]
COLUNAS_CAT = ["tipo_contrato"]


def montar_pipeline(modelo, imputador=None):
    if imputador is None:
        imputador = SimpleImputer(strategy="median")
    numericas = Pipeline([("imputar", imputador), ("escalar", StandardScaler())])
    categoricas = Pipeline([
        ("imputar", SimpleImputer(strategy="most_frequent")),
        ("codificar", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ])
    prep = ColumnTransformer([("num", numericas, COLUNAS_NUM), ("cat", categoricas, COLUNAS_CAT)])
    return Pipeline([("prep", prep), ("modelo", modelo)])


def avaliar_cv(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    notas = cross_val_score(pipeline, X, y, cv=cv, scoring="average_precision")
    return {"ap_media": float(notas.mean()), "ap_desvio": float(notas.std()), "notas": notas.tolist()}


def baseline(X, y, semente):
    return avaliar_cv(montar_pipeline(DummyClassifier(strategy="prior")), X, y, semente)


def modelos_candidatos(semente):
    return {
        "baseline": DummyClassifier(strategy="prior"),
        "logistica": LogisticRegression(max_iter=1000),
        "floresta": RandomForestClassifier(n_estimators=30, min_samples_leaf=5, random_state=semente),
        "boosting": HistGradientBoostingClassifier(max_iter=50, random_state=semente),
    }


def comparar_modelos(X, y, semente, candidatos=None):
    if candidatos is None:
        candidatos = modelos_candidatos(semente)
    cv = RepeatedStratifiedKFold(n_splits=3, n_repeats=2, random_state=semente)
    linhas = {}
    for nome, modelo in candidatos.items():
        r = cross_validate(montar_pipeline(modelo), X, y, cv=cv, scoring=["average_precision", "roc_auc"])
        ap = r["test_average_precision"]
        linhas[nome] = {
            "ap_media": float(ap.mean()),
            "ap_desvio": float(ap.std()),
            "auc_media": float(r["test_roc_auc"].mean()),
        }
    return pd.DataFrame.from_dict(linhas, orient="index")


def escolher_modelo(tabela):
    return str(tabela["ap_media"].idxmax())


def buscar_hiperparametros(pipeline, grade, X, y, semente):
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=semente)
    busca = GridSearchCV(pipeline, grade, cv=cv, scoring="average_precision")
    busca.fit(X, y)
    return {"melhores": busca.best_params_, "ap": float(busca.best_score_)}


def custo_total(y, scores, limiar, custo_fp, custo_fn):
    y = np.asarray(y)
    marcados = np.asarray(scores, dtype=float) >= limiar
    return float(custo_fp * np.sum(marcados & (y == 0)) + custo_fn * np.sum(~marcados & (y == 1)))


def scores_fora_da_dobra(pipeline, X, y, semente):
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=semente)
    return cross_val_predict(pipeline, X, y, cv=cv, method="predict_proba")[:, 1]


def escolher_limiar(y, scores, custo_fp, custo_fn):
    candidatos = np.unique(np.asarray(scores, dtype=float))
    custos = [custo_total(y, scores, limiar, custo_fp, custo_fn) for limiar in candidatos]
    return float(candidatos[int(np.argmin(custos))])


def avaliar_final(pipeline, X_treino, y_treino, X_teste, y_teste, limiar, custo_fp, custo_fn):
    modelo = clone(pipeline).fit(X_treino, y_treino)
    scores = modelo.predict_proba(X_teste)[:, 1]
    previstos = (scores >= limiar).astype(int)
    return {
        "ap": float(average_precision_score(y_teste, scores)),
        "auc": float(roc_auc_score(y_teste, scores)),
        "precisao": float(precision_score(y_teste, previstos, zero_division=0)),
        "recall": float(recall_score(y_teste, previstos, zero_division=0)),
        "custo_por_cliente": custo_total(y_teste, scores, limiar, custo_fp, custo_fn) / len(y_teste),
        "marcados": int(previstos.sum()),
        "previstos": previstos.tolist(),
    }
```
```python path=dados_credito.py
import numpy as np
import pandas as pd

CONTRATOS = ["pessoal", "consignado", "cartao", "veiculo"]
REGIOES = ["A", "B", "C", "D", "E"]


def gerar_clientes(n=2000, semente=2026):
    rng = np.random.default_rng(semente)
    regiao = rng.choice(REGIOES, n, p=[0.3, 0.25, 0.2, 0.15, 0.1])
    deslocamento = np.select([regiao == "A", regiao == "E"], [0.25, -0.3], 0.0)
    renda = np.round(np.exp(rng.normal(8.0 + deslocamento, 0.5, n)), 2)
    comprometimento = np.round(rng.beta(2.0, 5.0, n) * 1.2, 3)
    atrasos = rng.poisson(0.6, n)
    meses = rng.integers(0, 241, n)
    parcelas = rng.integers(0, 7, n)
    contrato = rng.choice(CONTRATOS, n, p=[0.35, 0.25, 0.3, 0.1]).astype(object)
    efeito = np.select([contrato == "cartao", contrato == "consignado"], [0.6, -0.8], 0.0)
    z = (-2.9 + 4.0 * (comprometimento - 0.34) + 0.7 * atrasos - 0.8 * (np.log(renda) - 8.0)
         - 0.006 * (meses - 120) + 0.15 * (parcelas - 3) + efeito)
    inadimplente = (rng.random(n) < 1 / (1 + np.exp(-z))).astype(np.int64)
    dias = np.where(inadimplente == 1, rng.integers(31, 181, n), 0)
    regularizado = (inadimplente == 0) & (rng.random(n) < 0.03)
    dias = np.where(regularizado, rng.integers(1, 16, n), dias)
    sujo = rng.random(n)
    contrato = np.where(sujo < 0.04, np.char.upper(contrato.astype(str)), contrato).astype(object)
    contrato = np.where((sujo >= 0.04) & (sujo < 0.07), np.char.add(contrato.astype(str), " "), contrato).astype(object)
    renda = np.where(rng.random(n) < 0.05, np.nan, renda)
    comprometimento = np.where(rng.random(n) < 0.04, np.nan, comprometimento)
    contrato[rng.random(n) < 0.03] = None
    return pd.DataFrame({
        "id_cliente": rng.permutation(n) + 100001,
        "renda_mensal": renda,
        "comprometimento": comprometimento,
        "atrasos_12m": atrasos,
        "meses_relacionamento": meses,
        "parcelas_em_aberto": parcelas,
        "tipo_contrato": contrato,
        "regiao": regiao,
        "dias_em_cobranca": dias,
        "inadimplente": inadimplente,
    })


def escrever_csv(caminho, n=2000, semente=2026):
    gerar_clientes(n, semente).to_csv(caminho, index=False)
```

### Dicas
1. `np.asarray` em cada entrada alinha tudo pela posição; uma máscara `regiao == nome` seleciona os clientes de uma região.
2. `tabela.iterrows()` percorre as linhas da comparação com o nome do modelo, e `f"{x:.3f}"` escreve um número com 3 casas.
3. `min(por_regiao, key=...)` devolve a chave de menor valor da função, e a primeira em caso de empate.

### Verificação
```json
[
  {"id": "regiao-pequeno", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimport pandas as pd\nyg = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0]\npg = [1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0]\nrg = ['B', 'B', 'B', 'B', 'B', 'B', 'A', 'A', 'A', 'A', 'C', 'C']\n", "expr": "resumo_por_regiao(yg, pg, rg)", "expected": {"A": {"n": 4, "inadimplentes": 1, "taxa_marcados": 0.5, "recall": 1.0}, "B": {"n": 6, "inadimplentes": 2, "taxa_marcados": 0.3333333333333333, "recall": 0.5}, "C": {"n": 2, "inadimplentes": 0, "taxa_marcados": 0.5, "recall": null}}, "tolerance": 1e-09, "name": "12 clientes em 3 regiões: n, inadimplentes, taxa de marcados e recall de cada uma; C não tem inadimplentes", "hint": "O recall de uma região divide os marcados entre os inadimplentes da região pelo número desses inadimplentes; sem nenhum, é None."},
  {"id": "regiao-series", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimport pandas as pd\nyg = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0]\npg = [1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0]\nrg = ['B', 'B', 'B', 'B', 'B', 'B', 'A', 'A', 'A', 'A', 'C', 'C']\nys = pd.Series(yg, index=range(100, 112))\nrs = pd.Series(rg, index=range(100, 112))", "expr": "resumo_por_regiao(ys, np.array(pg), rs) == resumo_por_regiao(yg, pg, rg)", "expected": true, "name": "Com Series de outro índice e um array, o resultado é o mesmo", "hint": "Alinhe pela posição (np.asarray), não pelo índice do pandas: y_teste mantém o índice original e as marcações vêm numa lista."},
  {"id": "regiao-tipos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimport pandas as pd\nyg = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0]\npg = [1, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 0]\nrg = ['B', 'B', 'B', 'B', 'B', 'B', 'A', 'A', 'A', 'A', 'C', 'C']\ng = resumo_por_regiao(yg, pg, rg)", "expr": "[list(g), [type(v).__name__ for v in g['B'].values()], list(g['B'])]", "expected": [["A", "B", "C"], ["int", "int", "float", "float"], ["n", "inadimplentes", "taxa_marcados", "recall"]], "name": "Regiões em ordem alfabética, com n e inadimplentes int, taxa e recall float, nesta ordem"},
  {"id": "inicio", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.1173, 0.34841, 0.29687, 0.27853], 'ap_desvio': [0.0009, 0.04601, 0.03292, 0.04374], 'auc_media': [0.5, 0.75823, 0.71512, 0.71711]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nF = {'ap': 0.34384, 'auc': 0.76164, 'precisao': 0.32967, 'recall': 0.50847, 'custo_por_cliente': 0.412, 'marcados': 91, 'previstos': []}\nG = {'A': {'n': 150, 'inadimplentes': 15, 'taxa_marcados': 0.16, 'recall': 0.6}, 'E': {'n': 40, 'inadimplentes': 6, 'taxa_marcados': 0.25, 'recall': 0.5}, 'Z': {'n': 5, 'inadimplentes': 0, 'taxa_marcados': 0.2, 'recall': None}}\nr = gerar_relatorio(T, 'logistica', 0.19297, 1, 5, F, G)\n", "expr": "[type(r).__name__, r.splitlines()[:4]]", "expected": ["str", ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)", "- baseline: AP 0.117 ± 0.001, AUC 0.500"]], "name": "O relatório é um texto que começa pelo título e pela comparação, com a baseline na primeira linha", "hint": "Siga o modelo do enunciado linha por linha; números com 3 casas decimais."},
  {"id": "tabela", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.1173, 0.34841, 0.29687, 0.27853], 'ap_desvio': [0.0009, 0.04601, 0.03292, 0.04374], 'auc_media': [0.5, 0.75823, 0.71512, 0.71711]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nF = {'ap': 0.34384, 'auc': 0.76164, 'precisao': 0.32967, 'recall': 0.50847, 'custo_por_cliente': 0.412, 'marcados': 91, 'previstos': []}\nG = {'A': {'n': 150, 'inadimplentes': 15, 'taxa_marcados': 0.16, 'recall': 0.6}, 'E': {'n': 40, 'inadimplentes': 6, 'taxa_marcados': 0.25, 'recall': 0.5}, 'Z': {'n': 5, 'inadimplentes': 0, 'taxa_marcados': 0.2, 'recall': None}}\nr = gerar_relatorio(T, 'logistica', 0.19297, 1, 5, F, G)\n", "expr": "'- logistica: AP 0.348 ± 0.046, AUC 0.758\\n- floresta: AP 0.297 ± 0.033, AUC 0.715\\n- boosting: AP 0.279 ± 0.044, AUC 0.717\\nModelo escolhido: logistica\\n' in r", "expected": true, "name": "Uma linha por candidato com AP média ± desvio e AUC, e o modelo escolhido", "hint": "Use f'{valor:.3f}' em todos os números da comparação."},
  {"id": "limiar", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.1173, 0.34841, 0.29687, 0.27853], 'ap_desvio': [0.0009, 0.04601, 0.03292, 0.04374], 'auc_media': [0.5, 0.75823, 0.71512, 0.71711]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nF = {'ap': 0.34384, 'auc': 0.76164, 'precisao': 0.32967, 'recall': 0.50847, 'custo_por_cliente': 0.412, 'marcados': 91, 'previstos': []}\nG = {'A': {'n': 150, 'inadimplentes': 15, 'taxa_marcados': 0.16, 'recall': 0.6}, 'E': {'n': 40, 'inadimplentes': 6, 'taxa_marcados': 0.25, 'recall': 0.5}, 'Z': {'n': 5, 'inadimplentes': 0, 'taxa_marcados': 0.2, 'recall': None}}\nr = gerar_relatorio(T, 'logistica', 0.19297, 1, 5, F, G)\n", "expr": "'## Limiar\\nLimiar 0.193, escolhido com scores fora da dobra do treino (custo FP 1, custo FN 5).\\n' in r", "expected": true, "name": "A seção do limiar, com o limiar e os dois custos", "hint": "Os custos entram como foram recebidos, FP antes de FN."},
  {"id": "teste", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.1173, 0.34841, 0.29687, 0.27853], 'ap_desvio': [0.0009, 0.04601, 0.03292, 0.04374], 'auc_media': [0.5, 0.75823, 0.71512, 0.71711]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nF = {'ap': 0.34384, 'auc': 0.76164, 'precisao': 0.32967, 'recall': 0.50847, 'custo_por_cliente': 0.412, 'marcados': 91, 'previstos': []}\nG = {'A': {'n': 150, 'inadimplentes': 15, 'taxa_marcados': 0.16, 'recall': 0.6}, 'E': {'n': 40, 'inadimplentes': 6, 'taxa_marcados': 0.25, 'recall': 0.5}, 'Z': {'n': 5, 'inadimplentes': 0, 'taxa_marcados': 0.2, 'recall': None}}\nr = gerar_relatorio(T, 'logistica', 0.19297, 1, 5, F, G)\n", "expr": "'## Teste (usado uma vez)\\n- AP: 0.344\\n- AUC: 0.762\\n- precisão: 0.330\\n- recall: 0.508\\n- custo por cliente: 0.412\\n- marcados: 91\\n' in r", "expected": true, "name": "A seção do teste, com os números de avaliar_final"},
  {"id": "regioes", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.1173, 0.34841, 0.29687, 0.27853], 'ap_desvio': [0.0009, 0.04601, 0.03292, 0.04374], 'auc_media': [0.5, 0.75823, 0.71512, 0.71711]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nF = {'ap': 0.34384, 'auc': 0.76164, 'precisao': 0.32967, 'recall': 0.50847, 'custo_por_cliente': 0.412, 'marcados': 91, 'previstos': []}\nG = {'A': {'n': 150, 'inadimplentes': 15, 'taxa_marcados': 0.16, 'recall': 0.6}, 'E': {'n': 40, 'inadimplentes': 6, 'taxa_marcados': 0.25, 'recall': 0.5}, 'Z': {'n': 5, 'inadimplentes': 0, 'taxa_marcados': 0.2, 'recall': None}}\nr = gerar_relatorio(T, 'logistica', 0.19297, 1, 5, F, G)\n", "expr": "'## Por região\\n- A: n 150, inadimplentes 15, marcados 16.0 %, recall 0.600\\n- E: n 40, inadimplentes 6, marcados 25.0 %, recall 0.500 (poucos inadimplentes)\\n- Z: n 5, inadimplentes 0, marcados 20.0 %, recall indefinido (poucos inadimplentes)\\n' in r", "expected": true, "name": "Uma linha por região, com o aviso quando há menos de 10 inadimplentes e o recall indefinido", "hint": "A taxa de marcados vai em porcentagem com 1 casa; recall None vira o texto 'recall indefinido'."},
  {"id": "limitacoes", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.1173, 0.34841, 0.29687, 0.27853], 'ap_desvio': [0.0009, 0.04601, 0.03292, 0.04374], 'auc_media': [0.5, 0.75823, 0.71512, 0.71711]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nF = {'ap': 0.34384, 'auc': 0.76164, 'precisao': 0.32967, 'recall': 0.50847, 'custo_por_cliente': 0.412, 'marcados': 91, 'previstos': []}\nG = {'A': {'n': 150, 'inadimplentes': 15, 'taxa_marcados': 0.16, 'recall': 0.6}, 'E': {'n': 40, 'inadimplentes': 6, 'taxa_marcados': 0.25, 'recall': 0.5}, 'Z': {'n': 5, 'inadimplentes': 0, 'taxa_marcados': 0.2, 'recall': None}}\nr = gerar_relatorio(T, 'logistica', 0.19297, 1, 5, F, G)\n", "expr": "r.endswith('## Limitações\\n' + '\\n'.join(LIMITACOES) + '\\n- A região não entra no modelo, mas a taxa de marcados vai de 16.0 % (A) a 25.0 % (E).\\n')", "expected": true, "name": "O relatório termina com as limitações e a amplitude da taxa de marcados entre as regiões", "hint": "Menor e maior taxa de marcados entre as regiões, com o nome de cada uma; as três limitações fixas vêm antes."},
  {"id": "outros-numeros", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\nT2 = pd.DataFrame({'ap_media': [0.0951, 0.2104, 0.26338], 'ap_desvio': [0.0012, 0.03175, 0.0281], 'auc_media': [0.5, 0.69, 0.73049]}, index=['baseline', 'logistica', 'boosting'])\nF2 = {'ap': 0.25, 'auc': 0.7126, 'precisao': 0.2, 'recall': 0.75, 'custo_por_cliente': 0.5333, 'marcados': 120, 'previstos': []}\nG2 = {'norte': {'n': 300, 'inadimplentes': 30, 'taxa_marcados': 0.3, 'recall': 0.8}, 'sul': {'n': 100, 'inadimplentes': 12, 'taxa_marcados': 0.3, 'recall': 0.5833333}}\nr2 = gerar_relatorio(T2, 'boosting', 0.08, 2, 7, F2, G2)\n", "expr": "r2.splitlines()", "expected": ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)", "- baseline: AP 0.095 ± 0.001, AUC 0.500", "- logistica: AP 0.210 ± 0.032, AUC 0.690", "- boosting: AP 0.263 ± 0.028, AUC 0.730", "Modelo escolhido: boosting", "", "## Limiar", "Limiar 0.080, escolhido com scores fora da dobra do treino (custo FP 2, custo FN 7).", "", "## Teste (usado uma vez)", "- AP: 0.250", "- AUC: 0.713", "- precisão: 0.200", "- recall: 0.750", "- custo por cliente: 0.533", "- marcados: 120", "", "## Por região", "- norte: n 300, inadimplentes 30, marcados 30.0 %, recall 0.800", "- sul: n 100, inadimplentes 12, marcados 30.0 %, recall 0.583", "", "## Limitações", "- Dados fictícios: os números não valem para clientes reais.", "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.", "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.", "- A região não entra no modelo, mas a taxa de marcados vai de 30.0 % (norte) a 30.0 % (norte)."], "name": "Outra tabela, outro modelo escolhido, outros custos e outras regiões: o relatório inteiro muda junto", "hint": "Todo número e nome do relatório sai dos argumentos; nada é digitado no texto."},
  {"id": "regiao-sem-marcados", "checkpoint": 1, "kind": "expr", "setup": "", "expr": "resumo_por_regiao([1, 1, 0, 0, 1], [0, 0, 0, 1, 1], ['N', 'N', 'N', 'S', 'S'])", "expected": {"N": {"n": 3, "inadimplentes": 2, "taxa_marcados": 0.0, "recall": 0.0}, "S": {"n": 2, "inadimplentes": 1, "taxa_marcados": 1.0, "recall": 1.0}}, "tolerance": 1e-09, "name": "Região com inadimplentes e nenhum marcado: recall 0.0 (definido), diferente de None", "hint": "None é só para a região sem nenhum inadimplente."},
  {"id": "regiao-alfabetica", "checkpoint": 1, "kind": "expr", "setup": "", "expr": "list(resumo_por_regiao([0, 1, 0, 1], [0, 1, 1, 0], ['E', 'B', 'D', 'B']))", "expected": ["B", "D", "E"], "name": "As regiões saem em ordem alfabética, não na ordem em que aparecem"},
  {"id": "fim", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.1173, 0.34841, 0.29687, 0.27853], 'ap_desvio': [0.0009, 0.04601, 0.03292, 0.04374], 'auc_media': [0.5, 0.75823, 0.71512, 0.71711]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nF = {'ap': 0.34384, 'auc': 0.76164, 'precisao': 0.32967, 'recall': 0.50847, 'custo_por_cliente': 0.412, 'marcados': 91, 'previstos': []}\nG = {'A': {'n': 150, 'inadimplentes': 15, 'taxa_marcados': 0.16, 'recall': 0.6}, 'E': {'n': 40, 'inadimplentes': 6, 'taxa_marcados': 0.25, 'recall': 0.5}, 'Z': {'n': 5, 'inadimplentes': 0, 'taxa_marcados': 0.2, 'recall': None}}\nr = gerar_relatorio(T, 'logistica', 0.19297, 1, 5, F, G)\n", "expr": "[r.endswith('\\n'), r.endswith('\\n\\n'), r.count('\\n## ')]", "expected": [true, false, 5], "name": "O texto tem as 5 seções e termina com uma única quebra de linha"},
  {"id": "dez-inadimplentes", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.1173, 0.34841, 0.29687, 0.27853], 'ap_desvio': [0.0009, 0.04601, 0.03292, 0.04374], 'auc_media': [0.5, 0.75823, 0.71512, 0.71711]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nF = {'ap': 0.34384, 'auc': 0.76164, 'precisao': 0.32967, 'recall': 0.50847, 'custo_por_cliente': 0.412, 'marcados': 91, 'previstos': []}\nG = {'A': {'n': 150, 'inadimplentes': 15, 'taxa_marcados': 0.16, 'recall': 0.6}, 'E': {'n': 40, 'inadimplentes': 6, 'taxa_marcados': 0.25, 'recall': 0.5}, 'Z': {'n': 5, 'inadimplentes': 0, 'taxa_marcados': 0.2, 'recall': None}}\nr = gerar_relatorio(T, 'logistica', 0.19297, 1, 5, F, G)\nG3 = {'A': {'n': 90, 'inadimplentes': 10, 'taxa_marcados': 0.2, 'recall': 0.7}, 'B': {'n': 60, 'inadimplentes': 9, 'taxa_marcados': 0.1, 'recall': 0.4444444}}\nr3 = gerar_relatorio(T, 'logistica', 0.19297, 1, 5, F, G3)", "expr": "['- A: n 90, inadimplentes 10, marcados 20.0 %, recall 0.700\\n' in r3, '- B: n 60, inadimplentes 9, marcados 10.0 %, recall 0.444 (poucos inadimplentes)\\n' in r3]", "expected": [true, true], "name": "Com 10 inadimplentes não há aviso; com 9, há", "hint": "O aviso vale para menos de 10 inadimplentes."},
  {"id": "empate-amplitude", "checkpoint": 3, "kind": "expr", "setup": "import pandas as pd\nT2 = pd.DataFrame({'ap_media': [0.0951, 0.2104, 0.26338], 'ap_desvio': [0.0012, 0.03175, 0.0281], 'auc_media': [0.5, 0.69, 0.73049]}, index=['baseline', 'logistica', 'boosting'])\nF2 = {'ap': 0.25, 'auc': 0.7126, 'precisao': 0.2, 'recall': 0.75, 'custo_por_cliente': 0.5333, 'marcados': 120, 'previstos': []}\nG2 = {'norte': {'n': 300, 'inadimplentes': 30, 'taxa_marcados': 0.3, 'recall': 0.8}, 'sul': {'n': 100, 'inadimplentes': 12, 'taxa_marcados': 0.3, 'recall': 0.5833333}}\nr2 = gerar_relatorio(T2, 'boosting', 0.08, 2, 7, F2, G2)\n", "expr": "r2.splitlines()[-1]", "expected": "- A região não entra no modelo, mas a taxa de marcados vai de 30.0 % (norte) a 30.0 % (norte).", "name": "Duas regiões com a mesma taxa: a primeira em ordem alfabética nos dois extremos"},
  {"id": "secoes-ordem", "checkpoint": 2, "kind": "expr", "setup": "import pandas as pd\nT = pd.DataFrame({'ap_media': [0.1173, 0.34841, 0.29687, 0.27853], 'ap_desvio': [0.0009, 0.04601, 0.03292, 0.04374], 'auc_media': [0.5, 0.75823, 0.71512, 0.71711]}, index=['baseline', 'logistica', 'floresta', 'boosting'])\nF = {'ap': 0.34384, 'auc': 0.76164, 'precisao': 0.32967, 'recall': 0.50847, 'custo_por_cliente': 0.412, 'marcados': 91, 'previstos': []}\nG = {'A': {'n': 150, 'inadimplentes': 15, 'taxa_marcados': 0.16, 'recall': 0.6}, 'E': {'n': 40, 'inadimplentes': 6, 'taxa_marcados': 0.25, 'recall': 0.5}, 'Z': {'n': 5, 'inadimplentes': 0, 'taxa_marcados': 0.2, 'recall': None}}\nr = gerar_relatorio(T, 'logistica', 0.19297, 1, 5, F, G)\n", "expr": "[r.index(t) for t in ['## Comparação', 'Modelo escolhido', '## Limiar', '## Teste', '## Por região', '## Limitações']] == sorted(r.index(t) for t in ['## Comparação', 'Modelo escolhido', '## Limiar', '## Teste', '## Por região', '## Limitações'])", "expected": true, "name": "As seções aparecem na ordem do modelo"}
]
```

### Soluções erradas
```python name="recall dividido pelo tamanho da região"
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    y = np.asarray(y)
    previstos = np.asarray(previstos)
    regiao = np.asarray(regiao)
    resumo = {}
    for nome in sorted(set(regiao.tolist())):
        no_grupo = regiao == nome
        positivos = no_grupo & (y == 1)
        resumo[str(nome)] = {
            "n": int(no_grupo.sum()),
            "inadimplentes": int(positivos.sum()),
            "taxa_marcados": float(previstos[no_grupo].mean()),
            "recall": float(previstos[positivos].sum() / no_grupo.sum()) if positivos.any() else None,
        }
    return resumo


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    linhas = ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)"]
    for nome, linha in tabela.iterrows():
        linhas.append(f"- {nome}: AP {linha['ap_media']:.3f} ± {linha['ap_desvio']:.3f}, AUC {linha['auc_media']:.3f}")
    linhas += [f"Modelo escolhido: {escolhido}", "", "## Limiar",
               f"Limiar {limiar:.3f}, escolhido com scores fora da dobra do treino (custo FP {custo_fp}, custo FN {custo_fn}).",
               "", "## Teste (usado uma vez)",
               f"- AP: {final['ap']:.3f}", f"- AUC: {final['auc']:.3f}",
               f"- precisão: {final['precisao']:.3f}", f"- recall: {final['recall']:.3f}",
               f"- custo por cliente: {final['custo_por_cliente']:.3f}", f"- marcados: {final['marcados']}",
               "", "## Por região"]
    for nome, g in por_regiao.items():
        recall = "recall indefinido" if g["recall"] is None else f"recall {g['recall']:.3f}"
        linha = f"- {nome}: n {g['n']}, inadimplentes {g['inadimplentes']}, marcados {100 * g['taxa_marcados']:.1f} %, {recall}"
        if g["inadimplentes"] < 10:
            linha += " (poucos inadimplentes)"
        linhas.append(linha)
    menor = min(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    maior = max(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    linhas += ["", "## Limitações", *LIMITACOES,
               f"- A região não entra no modelo, mas a taxa de marcados vai de "
               f"{100 * por_regiao[menor]['taxa_marcados']:.1f} % ({menor}) a {100 * por_regiao[maior]['taxa_marcados']:.1f} % ({maior})."]
    return "\n".join(linhas) + "\n"
```
```python name="região sem inadimplentes com recall zero"
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    y = np.asarray(y)
    previstos = np.asarray(previstos)
    regiao = np.asarray(regiao)
    resumo = {}
    for nome in sorted(set(regiao.tolist())):
        no_grupo = regiao == nome
        positivos = no_grupo & (y == 1)
        resumo[str(nome)] = {
            "n": int(no_grupo.sum()),
            "inadimplentes": int(positivos.sum()),
            "taxa_marcados": float(previstos[no_grupo].mean()),
            "recall": float(previstos[positivos].mean()) if positivos.any() else 0.0,
        }
    return resumo


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    linhas = ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)"]
    for nome, linha in tabela.iterrows():
        linhas.append(f"- {nome}: AP {linha['ap_media']:.3f} ± {linha['ap_desvio']:.3f}, AUC {linha['auc_media']:.3f}")
    linhas += [f"Modelo escolhido: {escolhido}", "", "## Limiar",
               f"Limiar {limiar:.3f}, escolhido com scores fora da dobra do treino (custo FP {custo_fp}, custo FN {custo_fn}).",
               "", "## Teste (usado uma vez)",
               f"- AP: {final['ap']:.3f}", f"- AUC: {final['auc']:.3f}",
               f"- precisão: {final['precisao']:.3f}", f"- recall: {final['recall']:.3f}",
               f"- custo por cliente: {final['custo_por_cliente']:.3f}", f"- marcados: {final['marcados']}",
               "", "## Por região"]
    for nome, g in por_regiao.items():
        recall = "recall indefinido" if g["recall"] is None else f"recall {g['recall']:.3f}"
        linha = f"- {nome}: n {g['n']}, inadimplentes {g['inadimplentes']}, marcados {100 * g['taxa_marcados']:.1f} %, {recall}"
        if g["inadimplentes"] < 10:
            linha += " (poucos inadimplentes)"
        linhas.append(linha)
    menor = min(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    maior = max(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    linhas += ["", "## Limitações", *LIMITACOES,
               f"- A região não entra no modelo, mas a taxa de marcados vai de "
               f"{100 * por_regiao[menor]['taxa_marcados']:.1f} % ({menor}) a {100 * por_regiao[maior]['taxa_marcados']:.1f} % ({maior})."]
    return "\n".join(linhas) + "\n"
```
```python name="modelo escolhido digitado"
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    y = np.asarray(y)
    previstos = np.asarray(previstos)
    regiao = np.asarray(regiao)
    resumo = {}
    for nome in sorted(set(regiao.tolist())):
        no_grupo = regiao == nome
        positivos = no_grupo & (y == 1)
        resumo[str(nome)] = {
            "n": int(no_grupo.sum()),
            "inadimplentes": int(positivos.sum()),
            "taxa_marcados": float(previstos[no_grupo].mean()),
            "recall": float(previstos[positivos].mean()) if positivos.any() else None,
        }
    return resumo


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    linhas = ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)"]
    for nome, linha in tabela.iterrows():
        linhas.append(f"- {nome}: AP {linha['ap_media']:.3f} ± {linha['ap_desvio']:.3f}, AUC {linha['auc_media']:.3f}")
    linhas += ["Modelo escolhido: logistica", "", "## Limiar",
               f"Limiar {limiar:.3f}, escolhido com scores fora da dobra do treino (custo FP {custo_fp}, custo FN {custo_fn}).",
               "", "## Teste (usado uma vez)",
               f"- AP: {final['ap']:.3f}", f"- AUC: {final['auc']:.3f}",
               f"- precisão: {final['precisao']:.3f}", f"- recall: {final['recall']:.3f}",
               f"- custo por cliente: {final['custo_por_cliente']:.3f}", f"- marcados: {final['marcados']}",
               "", "## Por região"]
    for nome, g in por_regiao.items():
        recall = "recall indefinido" if g["recall"] is None else f"recall {g['recall']:.3f}"
        linha = f"- {nome}: n {g['n']}, inadimplentes {g['inadimplentes']}, marcados {100 * g['taxa_marcados']:.1f} %, {recall}"
        if g["inadimplentes"] < 10:
            linha += " (poucos inadimplentes)"
        linhas.append(linha)
    menor = min(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    maior = max(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    linhas += ["", "## Limitações", *LIMITACOES,
               f"- A região não entra no modelo, mas a taxa de marcados vai de "
               f"{100 * por_regiao[menor]['taxa_marcados']:.1f} % ({menor}) a {100 * por_regiao[maior]['taxa_marcados']:.1f} % ({maior})."]
    return "\n".join(linhas) + "\n"
```
```python name="duas casas na comparação"
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    y = np.asarray(y)
    previstos = np.asarray(previstos)
    regiao = np.asarray(regiao)
    resumo = {}
    for nome in sorted(set(regiao.tolist())):
        no_grupo = regiao == nome
        positivos = no_grupo & (y == 1)
        resumo[str(nome)] = {
            "n": int(no_grupo.sum()),
            "inadimplentes": int(positivos.sum()),
            "taxa_marcados": float(previstos[no_grupo].mean()),
            "recall": float(previstos[positivos].mean()) if positivos.any() else None,
        }
    return resumo


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    linhas = ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)"]
    for nome, linha in tabela.iterrows():
        linhas.append(f"- {nome}: AP {linha['ap_media']:.2f} ± {linha['ap_desvio']:.2f}, AUC {linha['auc_media']:.2f}")
    linhas += [f"Modelo escolhido: {escolhido}", "", "## Limiar",
               f"Limiar {limiar:.3f}, escolhido com scores fora da dobra do treino (custo FP {custo_fp}, custo FN {custo_fn}).",
               "", "## Teste (usado uma vez)",
               f"- AP: {final['ap']:.3f}", f"- AUC: {final['auc']:.3f}",
               f"- precisão: {final['precisao']:.3f}", f"- recall: {final['recall']:.3f}",
               f"- custo por cliente: {final['custo_por_cliente']:.3f}", f"- marcados: {final['marcados']}",
               "", "## Por região"]
    for nome, g in por_regiao.items():
        recall = "recall indefinido" if g["recall"] is None else f"recall {g['recall']:.3f}"
        linha = f"- {nome}: n {g['n']}, inadimplentes {g['inadimplentes']}, marcados {100 * g['taxa_marcados']:.1f} %, {recall}"
        if g["inadimplentes"] < 10:
            linha += " (poucos inadimplentes)"
        linhas.append(linha)
    menor = min(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    maior = max(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    linhas += ["", "## Limitações", *LIMITACOES,
               f"- A região não entra no modelo, mas a taxa de marcados vai de "
               f"{100 * por_regiao[menor]['taxa_marcados']:.1f} % ({menor}) a {100 * por_regiao[maior]['taxa_marcados']:.1f} % ({maior})."]
    return "\n".join(linhas) + "\n"
```
```python name="custos trocados no texto"
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    y = np.asarray(y)
    previstos = np.asarray(previstos)
    regiao = np.asarray(regiao)
    resumo = {}
    for nome in sorted(set(regiao.tolist())):
        no_grupo = regiao == nome
        positivos = no_grupo & (y == 1)
        resumo[str(nome)] = {
            "n": int(no_grupo.sum()),
            "inadimplentes": int(positivos.sum()),
            "taxa_marcados": float(previstos[no_grupo].mean()),
            "recall": float(previstos[positivos].mean()) if positivos.any() else None,
        }
    return resumo


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    linhas = ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)"]
    for nome, linha in tabela.iterrows():
        linhas.append(f"- {nome}: AP {linha['ap_media']:.3f} ± {linha['ap_desvio']:.3f}, AUC {linha['auc_media']:.3f}")
    linhas += [f"Modelo escolhido: {escolhido}", "", "## Limiar",
               f"Limiar {limiar:.3f}, escolhido com scores fora da dobra do treino (custo FP {custo_fn}, custo FN {custo_fp}).",
               "", "## Teste (usado uma vez)",
               f"- AP: {final['ap']:.3f}", f"- AUC: {final['auc']:.3f}",
               f"- precisão: {final['precisao']:.3f}", f"- recall: {final['recall']:.3f}",
               f"- custo por cliente: {final['custo_por_cliente']:.3f}", f"- marcados: {final['marcados']}",
               "", "## Por região"]
    for nome, g in por_regiao.items():
        recall = "recall indefinido" if g["recall"] is None else f"recall {g['recall']:.3f}"
        linha = f"- {nome}: n {g['n']}, inadimplentes {g['inadimplentes']}, marcados {100 * g['taxa_marcados']:.1f} %, {recall}"
        if g["inadimplentes"] < 10:
            linha += " (poucos inadimplentes)"
        linhas.append(linha)
    menor = min(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    maior = max(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    linhas += ["", "## Limitações", *LIMITACOES,
               f"- A região não entra no modelo, mas a taxa de marcados vai de "
               f"{100 * por_regiao[menor]['taxa_marcados']:.1f} % ({menor}) a {100 * por_regiao[maior]['taxa_marcados']:.1f} % ({maior})."]
    return "\n".join(linhas) + "\n"
```
```python name="taxa de marcados sem porcentagem"
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    y = np.asarray(y)
    previstos = np.asarray(previstos)
    regiao = np.asarray(regiao)
    resumo = {}
    for nome in sorted(set(regiao.tolist())):
        no_grupo = regiao == nome
        positivos = no_grupo & (y == 1)
        resumo[str(nome)] = {
            "n": int(no_grupo.sum()),
            "inadimplentes": int(positivos.sum()),
            "taxa_marcados": float(previstos[no_grupo].mean()),
            "recall": float(previstos[positivos].mean()) if positivos.any() else None,
        }
    return resumo


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    linhas = ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)"]
    for nome, linha in tabela.iterrows():
        linhas.append(f"- {nome}: AP {linha['ap_media']:.3f} ± {linha['ap_desvio']:.3f}, AUC {linha['auc_media']:.3f}")
    linhas += [f"Modelo escolhido: {escolhido}", "", "## Limiar",
               f"Limiar {limiar:.3f}, escolhido com scores fora da dobra do treino (custo FP {custo_fp}, custo FN {custo_fn}).",
               "", "## Teste (usado uma vez)",
               f"- AP: {final['ap']:.3f}", f"- AUC: {final['auc']:.3f}",
               f"- precisão: {final['precisao']:.3f}", f"- recall: {final['recall']:.3f}",
               f"- custo por cliente: {final['custo_por_cliente']:.3f}", f"- marcados: {final['marcados']}",
               "", "## Por região"]
    for nome, g in por_regiao.items():
        recall = "recall indefinido" if g["recall"] is None else f"recall {g['recall']:.3f}"
        linha = f"- {nome}: n {g['n']}, inadimplentes {g['inadimplentes']}, marcados {g['taxa_marcados']:.1f} %, {recall}"
        if g["inadimplentes"] < 10:
            linha += " (poucos inadimplentes)"
        linhas.append(linha)
    menor = min(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    maior = max(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    linhas += ["", "## Limitações", *LIMITACOES,
               f"- A região não entra no modelo, mas a taxa de marcados vai de "
               f"{100 * por_regiao[menor]['taxa_marcados']:.1f} % ({menor}) a {100 * por_regiao[maior]['taxa_marcados']:.1f} % ({maior})."]
    return "\n".join(linhas) + "\n"
```
```python name="sem o aviso de poucos inadimplentes"
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    y = np.asarray(y)
    previstos = np.asarray(previstos)
    regiao = np.asarray(regiao)
    resumo = {}
    for nome in sorted(set(regiao.tolist())):
        no_grupo = regiao == nome
        positivos = no_grupo & (y == 1)
        resumo[str(nome)] = {
            "n": int(no_grupo.sum()),
            "inadimplentes": int(positivos.sum()),
            "taxa_marcados": float(previstos[no_grupo].mean()),
            "recall": float(previstos[positivos].mean()) if positivos.any() else None,
        }
    return resumo


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    linhas = ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)"]
    for nome, linha in tabela.iterrows():
        linhas.append(f"- {nome}: AP {linha['ap_media']:.3f} ± {linha['ap_desvio']:.3f}, AUC {linha['auc_media']:.3f}")
    linhas += [f"Modelo escolhido: {escolhido}", "", "## Limiar",
               f"Limiar {limiar:.3f}, escolhido com scores fora da dobra do treino (custo FP {custo_fp}, custo FN {custo_fn}).",
               "", "## Teste (usado uma vez)",
               f"- AP: {final['ap']:.3f}", f"- AUC: {final['auc']:.3f}",
               f"- precisão: {final['precisao']:.3f}", f"- recall: {final['recall']:.3f}",
               f"- custo por cliente: {final['custo_por_cliente']:.3f}", f"- marcados: {final['marcados']}",
               "", "## Por região"]
    for nome, g in por_regiao.items():
        recall = "recall indefinido" if g["recall"] is None else f"recall {g['recall']:.3f}"
        linha = f"- {nome}: n {g['n']}, inadimplentes {g['inadimplentes']}, marcados {100 * g['taxa_marcados']:.1f} %, {recall}"
        linhas.append(linha)
    menor = min(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    maior = max(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    linhas += ["", "## Limitações", *LIMITACOES,
               f"- A região não entra no modelo, mas a taxa de marcados vai de "
               f"{100 * por_regiao[menor]['taxa_marcados']:.1f} % ({menor}) a {100 * por_regiao[maior]['taxa_marcados']:.1f} % ({maior})."]
    return "\n".join(linhas) + "\n"
```
```python name="sem as limitações fixas"
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    y = np.asarray(y)
    previstos = np.asarray(previstos)
    regiao = np.asarray(regiao)
    resumo = {}
    for nome in sorted(set(regiao.tolist())):
        no_grupo = regiao == nome
        positivos = no_grupo & (y == 1)
        resumo[str(nome)] = {
            "n": int(no_grupo.sum()),
            "inadimplentes": int(positivos.sum()),
            "taxa_marcados": float(previstos[no_grupo].mean()),
            "recall": float(previstos[positivos].mean()) if positivos.any() else None,
        }
    return resumo


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    linhas = ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)"]
    for nome, linha in tabela.iterrows():
        linhas.append(f"- {nome}: AP {linha['ap_media']:.3f} ± {linha['ap_desvio']:.3f}, AUC {linha['auc_media']:.3f}")
    linhas += [f"Modelo escolhido: {escolhido}", "", "## Limiar",
               f"Limiar {limiar:.3f}, escolhido com scores fora da dobra do treino (custo FP {custo_fp}, custo FN {custo_fn}).",
               "", "## Teste (usado uma vez)",
               f"- AP: {final['ap']:.3f}", f"- AUC: {final['auc']:.3f}",
               f"- precisão: {final['precisao']:.3f}", f"- recall: {final['recall']:.3f}",
               f"- custo por cliente: {final['custo_por_cliente']:.3f}", f"- marcados: {final['marcados']}",
               "", "## Por região"]
    for nome, g in por_regiao.items():
        recall = "recall indefinido" if g["recall"] is None else f"recall {g['recall']:.3f}"
        linha = f"- {nome}: n {g['n']}, inadimplentes {g['inadimplentes']}, marcados {100 * g['taxa_marcados']:.1f} %, {recall}"
        if g["inadimplentes"] < 10:
            linha += " (poucos inadimplentes)"
        linhas.append(linha)
    menor = min(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    maior = max(por_regiao, key=lambda nome: por_regiao[nome]["taxa_marcados"])
    linhas += ["", "## Limitações",
               f"- A região não entra no modelo, mas a taxa de marcados vai de "
               f"{100 * por_regiao[menor]['taxa_marcados']:.1f} % ({menor}) a {100 * por_regiao[maior]['taxa_marcados']:.1f} % ({maior})."]
    return "\n".join(linhas) + "\n"
```
```python name="amplitude pela ordem alfabética"
import numpy as np

from credito_base import avaliar_final, comparar_modelos, dividir, escolher_limiar, limpar, scores_fora_da_dobra

LIMITACOES = [
    "- Dados fictícios: os números não valem para clientes reais.",
    "- O modelo aprende com decisões e atrasos do passado; se a política de crédito mudar, ele precisa ser medido de novo.",
    "- O custo de cada erro é uma suposição do projeto; com outros custos, o limiar muda.",
]


def resumo_por_regiao(y, previstos, regiao):
    y = np.asarray(y)
    previstos = np.asarray(previstos)
    regiao = np.asarray(regiao)
    resumo = {}
    for nome in sorted(set(regiao.tolist())):
        no_grupo = regiao == nome
        positivos = no_grupo & (y == 1)
        resumo[str(nome)] = {
            "n": int(no_grupo.sum()),
            "inadimplentes": int(positivos.sum()),
            "taxa_marcados": float(previstos[no_grupo].mean()),
            "recall": float(previstos[positivos].mean()) if positivos.any() else None,
        }
    return resumo


def gerar_relatorio(tabela, escolhido, limiar, custo_fp, custo_fn, final, por_regiao):
    linhas = ["# Model card: previsão de inadimplência", "", "## Comparação na validação cruzada (só o treino)"]
    for nome, linha in tabela.iterrows():
        linhas.append(f"- {nome}: AP {linha['ap_media']:.3f} ± {linha['ap_desvio']:.3f}, AUC {linha['auc_media']:.3f}")
    linhas += [f"Modelo escolhido: {escolhido}", "", "## Limiar",
               f"Limiar {limiar:.3f}, escolhido com scores fora da dobra do treino (custo FP {custo_fp}, custo FN {custo_fn}).",
               "", "## Teste (usado uma vez)",
               f"- AP: {final['ap']:.3f}", f"- AUC: {final['auc']:.3f}",
               f"- precisão: {final['precisao']:.3f}", f"- recall: {final['recall']:.3f}",
               f"- custo por cliente: {final['custo_por_cliente']:.3f}", f"- marcados: {final['marcados']}",
               "", "## Por região"]
    for nome, g in por_regiao.items():
        recall = "recall indefinido" if g["recall"] is None else f"recall {g['recall']:.3f}"
        linha = f"- {nome}: n {g['n']}, inadimplentes {g['inadimplentes']}, marcados {100 * g['taxa_marcados']:.1f} %, {recall}"
        if g["inadimplentes"] < 10:
            linha += " (poucos inadimplentes)"
        linhas.append(linha)
    menor = list(por_regiao)[0]
    maior = list(por_regiao)[-1]
    linhas += ["", "## Limitações", *LIMITACOES,
               f"- A região não entra no modelo, mas a taxa de marcados vai de "
               f"{100 * por_regiao[menor]['taxa_marcados']:.1f} % ({menor}) a {100 * por_regiao[maior]['taxa_marcados']:.1f} % ({maior})."]
    return "\n".join(linhas) + "\n"
```

## Passo 8 · Quiz · Autoavaliação do projeto

### Pergunta
Uma colega roda o mesmo fluxo, mas escolhe o limiar com os scores do **teste**: chega a 0,183 e a um custo de 0,384 por cliente no teste. O seu fluxo escolheu 0,193 com os scores fora da dobra do treino e mediu 0,412 no teste. Qual custo deve ir para o model card como estimativa para clientes novos?
- [ ] 0,384, porque é o menor custo e o limiar 0,183 é melhor
- [x] 0,412, porque o limiar foi fixado antes de o teste ser usado; o 0,384 foi otimizado nos próprios 500 clientes que ele mede
- [ ] A média dos dois, 0,398, para equilibrar os dois fluxos
- [ ] Nenhum dos dois: o custo só pode ser medido na validação cruzada
> Escolher o limiar olhando o teste ajusta a decisão ao acaso daqueles 500 clientes, e o custo medido nos mesmos clientes fica otimista; em clientes novos, esse ganho não se repete. A média mistura uma medida honesta com uma contaminada. E a validação cruzada escolhe o limiar, mas a estimativa final é a do teste, usado uma vez com tudo já decidido.

### Pergunta
Um gestor lê a validação cruzada pela acurácia: a logística tem 0,888 e a baseline, que não marca ninguém, 0,883. Ele conclui que o modelo "quase não serve". O que os outros números do projeto dizem?
- [ ] O gestor tem razão: 0,5 ponto de acurácia não paga o custo de manter um modelo
- [ ] A conclusão está certa, mas porque a AUC da logística (0,758) também é baixa
- [x] Com 12 % de inadimplentes, a acurácia é quase toda dos 88 % de negativos; a AP sobe de 0,117 para 0,348 e, no teste, o custo cai de 0,590 (baseline) para 0,412 por cliente
- [ ] A baseline deveria ser descartada, porque um modelo constante não tem acurácia definida
> A acurácia mede acertos com o limiar 0,5, e o modelo que nunca marca ninguém já acerta 88 %. A pergunta do negócio é ordenar os clientes pelo risco e decidir com os custos: é o que a AP e o custo medem, e nos dois a logística é bem melhor que a baseline. A AUC de 0,758 é moderada, mas não é argumento para descartar o modelo; e a baseline tem acurácia definida, é justamente a régua.

### Pergunta
No relatório, a região D tem recall 0,667 e a região E, 0,333, e as duas têm 3 inadimplentes no teste. Alguém propõe escrever no model card: "o modelo encontra metade dos inadimplentes da região E, comparado à região D". O que fazer?
- [ ] Publicar a frase: os números foram calculados pelo código e não há erro de conta
- [ ] Incluir a região como atributo do modelo, para que ele aprenda a diferença
- [ ] Tirar a seção por região do relatório, porque a região não entra no modelo
- [x] Não publicar a conclusão: com 3 inadimplentes em cada região, a diferença é de um cliente; o relatório mostra o n, avisa que há poucos positivos e registra a diferença na taxa de marcados (11,1 % contra 23,4 %), que se apoia em 45 e 64 clientes
> O recall de um grupo com 3 positivos só pode valer 0, 1/3, 2/3 ou 1: a diferença entre D e E é um cliente encontrado a mais, e a frase transformaria acaso em conclusão. Pôr a região no modelo não corrige uma medida incerta e usa um atributo que a financeira decidiu não usar. Tirar a seção esconderia justamente o que ela serve para vigiar: a região fica fora do modelo, mas a renda carrega parte dela.
