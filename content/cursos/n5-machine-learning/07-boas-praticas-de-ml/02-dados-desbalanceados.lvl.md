---
slug: n5-m7-02-dados-desbalanceados
titulo: Dados desbalanceados
descricao: class_weight, reamostragem (oversampling/undersampling), limiar e métricas adequadas, e por que não reamostrar o conjunto de validação.
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
- Aplicar class_weight e reamostragem corretamente (só no treino) e medir o efeito
- Escolher métricas e limiares para classes raras
- Explicar quando o desbalanceamento é um problema e quando não é
---

## Passo 1 · Leitura · Quando 1 % é positivo

Uma carteira digital fictícia quer marcar transações suspeitas de fraude. De cada mil transações, dez são fraudes. Uma regressão logística treinada com esses dados minimiza a perda média de todas as linhas, e 99 % das linhas dizem "normal": o caminho mais barato é empurrar todas as probabilidades para perto de zero. No limiar 0,5, quase nada é marcado. A acurácia sai perto de 99 % e o recall da fraude, perto de zero, como você viu na m3-02.

O desbalanceamento em si não é o defeito. Um modelo que **ordena** bem as transações (AUC e AP altas) continua útil: basta escolher o limiar certo. O problema aparece em três situações: quando a decisão usa o limiar padrão 0,5, quando a métrica é a acurácia, e quando há **poucos positivos em números absolutos** (dez fraudes não ensinam muita coisa, qualquer que seja a proporção). Com cem mil fraudes entre dez milhões de transações, a proporção é a mesma, mas o modelo tem exemplos de sobra.

A primeira ferramenta é dar mais peso aos erros na classe rara. O `class_weight="balanced"` dá a cada classe $c$ o peso

$$
w_c = \frac{n}{k \cdot n_c}
$$

com $n$ linhas, $k$ classes e $n_c$ linhas da classe $c$. Com 990 normais e 10 fraudes, cada fraude pesa 50 e cada normal, cerca de 0,505: as duas classes passam a somar o mesmo peso total. Para a perda, é como se cada fraude aparecesse 50 vezes, sem cópia nenhuma na memória.

```python
from sklearn.linear_model import LogisticRegression

sem = LogisticRegression().fit(X_treino, y_treino)
com = LogisticRegression(class_weight="balanced").fit(X_treino, y_treino)
```

O efeito é deslocar as probabilidades para cima: mais transações passam de 0,5, o recall sobe e a precisão cai. As probabilidades do modelo com pesos deixam de ser calibradas: um 0,7 dele não quer dizer 70 % de chance de fraude. Na regressão logística, a mudança fica quase toda no intercepto; a ordem dos scores muda pouco, e por isso a AUC quase não muda. Em boa parte dos casos, mover o limiar do modelo sem pesos faz o mesmo papel. Árvores, florestas e a `HistGradientBoostingClassifier` aceitam o mesmo parâmetro.

Os dados desta lição são transações fictícias geradas com `default_rng`, com cerca de 5 % de fraudes.

## Passo 2 · Previsão · Os pesos e o modelo que sempre diz "não"

O programa calcula os pesos do `class_weight="balanced"` para 990 negativos e 10 positivos e avalia um modelo que sempre responde a classe mais frequente. A `balanced_accuracy_score` é a média dos recalls das duas classes. Leia sem executar e digite o que o programa imprime.

### Código
```python
import numpy as np
from sklearn.dummy import DummyClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, recall_score
from sklearn.utils.class_weight import compute_class_weight

y = np.array([0] * 990 + [1] * 10)
X = np.zeros((1000, 1))
pesos = compute_class_weight("balanced", classes=np.array([0, 1]), y=y)
print(pesos.round(4).tolist())
print(round(float(pesos[y].sum()), 6))

p = DummyClassifier(strategy="most_frequent").fit(X, y).predict(X)
print(accuracy_score(y, p), recall_score(y, p), balanced_accuracy_score(y, p))
```

### Dicas
1. O peso de cada classe é $n / (k \cdot n_c)$, com $k = 2$ classes.
2. O `pesos[y]` dá a cada linha o peso da sua classe; some 990 pesos de uma classe e 10 da outra.
3. O modelo acerta todos os negativos e nenhum positivo.

### Saída esperada
```text
[0.5051, 50.0]
1000.0
0.99 0.0 0.5
```

## Passo 3 · Exercício · O efeito do class_weight
modo: lacunas

Complete as lacunas (`___`) da função que mede, no mesmo teste, o recall e a precisão das fraudes com e sem `class_weight="balanced"`. O arquivo `transacoes.py` gera transações fictícias: `X, y = gerar_transacoes(1000, 2)`.

### Instruções
1. Divide com `train_test_split(X, y, test_size=0.3, random_state=semente)`, **estratificado** pelo alvo, para o teste ter a proporção de fraudes do conjunto inteiro.
2. Treina duas `LogisticRegression` **só com o treino**: uma sem pesos (`class_weight=None`) e outra com `class_weight="balanced"`.
3. Devolve `{"sem": {"recall": ..., "precisao": ...}, "com": {...}}`, com o recall e a precisão da classe 1 nas previsões do teste (precisão 0.0 quando nada é marcado: `zero_division=0`).

### Código inicial
```python
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split


def efeito_class_weight(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=___, random_state=semente)
    resultado = {}
    for nome, pesos in [("sem", None), ("com", ___)]:
        modelo = LogisticRegression(class_weight=pesos).fit(___, ___)
        p = modelo.predict(X_te)
        resultado[nome] = {"recall": ___, "precisao": ___}
    return resultado
```
```python path=transacoes.py
import numpy as np


def gerar_transacoes(n, semente, taxa_positivos=0.05):
    rng = np.random.default_rng(semente)
    y = (rng.random(n) < taxa_positivos).astype(int)
    X = rng.normal(0, 1, (n, 4))
    X[:, 0] += 1.5 * y
    X[:, 1] -= 1.0 * y
    return X.round(3), y
```

### Solução
```python
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split


def efeito_class_weight(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=semente)
    resultado = {}
    for nome, pesos in [("sem", None), ("com", "balanced")]:
        modelo = LogisticRegression(class_weight=pesos).fit(X_tr, y_tr)
        p = modelo.predict(X_te)
        resultado[nome] = {"recall": recall_score(y_te, p), "precisao": precision_score(y_te, p, zero_division=0)}
    return resultado
```
```python path=transacoes.py
import numpy as np


def gerar_transacoes(n, semente, taxa_positivos=0.05):
    rng = np.random.default_rng(semente)
    y = (rng.random(n) < taxa_positivos).astype(int)
    X = rng.normal(0, 1, (n, 4))
    X[:, 0] += 1.5 * y
    X[:, 1] -= 1.0 * y
    return X.round(3), y
```

### Dicas
1. O `stratify` recebe o vetor cujas proporções devem ser mantidas nos dois lados.
2. O teste só é usado para medir: os dois modelos aprendem com as mesmas linhas de treino.
3. O `recall_score` e o `precision_score` medem a classe 1 por padrão.

### Verificação
```json
[
  {"id": "recall-sem", "checkpoint": 3, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(1000, 2)\nr = efeito_class_weight(X, y, 0)\n", "expr": "r['sem']['recall']", "expected": 0.08333333333333333, "tolerance": 1e-09, "name": "Sem pesos: o recall das fraudes no teste", "hint": "O recall é da classe 1 (fraude), medido nas previsões do teste."},
  {"id": "recall-com", "checkpoint": 2, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(1000, 2)\nr = efeito_class_weight(X, y, 0)\n", "expr": "r['com']['recall']", "expected": 0.9166666666666666, "tolerance": 1e-09, "name": "Com class_weight=\"balanced\": o recall das fraudes no teste", "hint": "O segundo modelo usa class_weight=\"balanced\"."},
  {"id": "precisao-sem", "checkpoint": 3, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(1000, 2)\nr = efeito_class_weight(X, y, 0)\n", "expr": "r['sem']['precisao']", "expected": 0.3333333333333333, "tolerance": 1e-09, "name": "Sem pesos: a precisão no teste"},
  {"id": "precisao-com", "checkpoint": 3, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(1000, 2)\nr = efeito_class_weight(X, y, 0)\n", "expr": "r['com']['precisao']", "expected": 0.21153846153846154, "tolerance": 1e-09, "name": "Com pesos: a precisão cai", "hint": "A precisão é a fração de fraudes entre as transações marcadas."},
  {"id": "troca", "checkpoint": 2, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(1000, 2)\nr = efeito_class_weight(X, y, 0)\n", "expr": "[r['com']['recall'] > r['sem']['recall'], r['com']['precisao'] < r['sem']['precisao']]", "expected": [true, true], "name": "Os pesos trocam precisão por recall"},
  {"id": "outra-semente", "checkpoint": 1, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(800, 5)\nr = efeito_class_weight(X, y, 3)", "expr": "[round(r['sem']['recall'], 9), round(r['com']['recall'], 9)]", "expected": [0.3125, 0.75], "tolerance": 1e-09, "name": "800 transações, divisão da semente 3", "hint": "A divisão é estratificada: o teste mantém a proporção de fraudes do conjunto inteiro."},
  {"id": "estratificado", "checkpoint": 1, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(400, 9)\nr = efeito_class_weight(X, y, 1)", "expr": "[round(r['sem']['precisao'], 9), round(r['com']['recall'], 9)]", "expected": [0.0, 0.75], "tolerance": 1e-09, "name": "400 transações com poucas fraudes: a divisão estratificada da semente 1"},
  {"id": "formato", "checkpoint": 3, "kind": "expr", "setup": "from transacoes import gerar_transacoes\nX, y = gerar_transacoes(1000, 2)\nr = efeito_class_weight(X, y, 0)\n", "expr": "[sorted(r), sorted(r['sem']), type(r['com']['recall']).__name__]", "expected": [["com", "sem"], ["precisao", "recall"], "float"], "name": "Devolve {\"sem\": {...}, \"com\": {...}} com recall e precisão como float"}
]
```

### Soluções erradas
```python name="divisão sem estratificar"
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split


def efeito_class_weight(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=None, random_state=semente)
    resultado = {}
    for nome, pesos in [("sem", None), ("com", "balanced")]:
        modelo = LogisticRegression(class_weight=pesos).fit(X_tr, y_tr)
        p = modelo.predict(X_te)
        resultado[nome] = {"recall": recall_score(y_te, p), "precisao": precision_score(y_te, p, zero_division=0)}
    return resultado
```
```python name="treina com o conjunto inteiro"
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split


def efeito_class_weight(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=semente)
    resultado = {}
    for nome, pesos in [("sem", None), ("com", "balanced")]:
        modelo = LogisticRegression(class_weight=pesos).fit(X, y)
        p = modelo.predict(X_te)
        resultado[nome] = {"recall": recall_score(y_te, p), "precisao": precision_score(y_te, p, zero_division=0)}
    return resultado
```
```python name="recall da classe normal"
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split


def efeito_class_weight(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=semente)
    resultado = {}
    for nome, pesos in [("sem", None), ("com", "balanced")]:
        modelo = LogisticRegression(class_weight=pesos).fit(X_tr, y_tr)
        p = modelo.predict(X_te)
        resultado[nome] = {"recall": recall_score(y_te, p, pos_label=0), "precisao": precision_score(y_te, p, zero_division=0)}
    return resultado
```
```python name="acurácia no lugar do recall"
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split


def efeito_class_weight(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=semente)
    resultado = {}
    for nome, pesos in [("sem", None), ("com", "balanced")]:
        modelo = LogisticRegression(class_weight=pesos).fit(X_tr, y_tr)
        p = modelo.predict(X_te)
        resultado[nome] = {"recall": accuracy_score(y_te, p), "precisao": precision_score(y_te, p, zero_division=0)}
    return resultado
```
```python name="precisão e recall trocados"
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split


def efeito_class_weight(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=semente)
    resultado = {}
    for nome, pesos in [("sem", None), ("com", "balanced")]:
        modelo = LogisticRegression(class_weight=pesos).fit(X_tr, y_tr)
        p = modelo.predict(X_te)
        resultado[nome] = {"recall": precision_score(y_te, p, zero_division=0), "precisao": recall_score(y_te, p)}
    return resultado
```
```python name="pesos iguais nos dois modelos"
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score
from sklearn.model_selection import train_test_split


def efeito_class_weight(X, y, semente):
    X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3, stratify=y, random_state=semente)
    resultado = {}
    for nome, pesos in [("sem", None), ("com", None)]:
        modelo = LogisticRegression(class_weight=pesos).fit(X_tr, y_tr)
        p = modelo.predict(X_te)
        resultado[nome] = {"recall": recall_score(y_te, p), "precisao": precision_score(y_te, p, zero_division=0)}
    return resultado
```

## Passo 4 · Leitura · Reamostrar só o treino

A segunda ferramenta mexe nos dados em vez da perda. O **oversampling** sorteia linhas da classe rara **com reposição** e as acrescenta até as classes empatarem; o **undersampling** descarta linhas da classe comum até o mesmo empate. O oversampling repete informação (o modelo vê as mesmas fraudes várias vezes, e uma árvore funda decora cada uma); o undersampling joga informação fora, e com 990 normais e 10 fraudes sobrariam 20 linhas.

O **SMOTE** tenta criar exemplos novos em vez de repetir: sorteia uma fraude $x_i$, sorteia uma das suas $k$ fraudes vizinhas mais próximas, $x_{\text{viz}}$, e cria um ponto no segmento entre as duas:

$$
x_{\text{novo}} = x_i + \lambda\,(x_{\text{viz}} - x_i), \qquad \lambda \sim \text{Uniforme}(0, 1)
$$

A biblioteca que costuma trazer essas técnicas, a `imbalanced-learn`, não está instalada aqui: `import imblearn` dá `ModuleNotFoundError: No module named 'imblearn'`. Com o numpy, cada uma cabe em poucas linhas, e é o que o próximo exercício pede.

```python
rng = np.random.default_rng(0)
idx_fraude = np.flatnonzero(y_treino == 1)
extras = rng.choice(idx_fraude, size=falta, replace=True)       # com reposição
X_bal = np.vstack([X_treino, X_treino[extras]])
y_bal = np.concatenate([y_treino, y_treino[extras]])
```

A regra que importa é **onde** reamostrar: **só no treino, e depois de dividir**. Reamostrar a tabela inteira antes de dividir põe cópias da mesma fraude dos dois lados, o vazamento por duplicatas da lição anterior: o modelo reconhece a cópia no teste e o recall medido sobe sem motivo. E o teste ou a validação **nunca** são reamostrados: eles precisam ter a proporção do mundo real, porque é nessa proporção que a precisão e a AP serão observadas em produção. Uma validação com 50 % de fraudes mede a precisão de um mundo que não existe.

Na validação cruzada, a reamostragem entra **dentro** de cada partição: divide, reamostra só as linhas de treino daquela partição, ajusta, mede nas linhas de validação intactas. Fora do laço, cada fraude sintética do SMOTE carrega informação de duas fraudes reais, que podem estar justamente na validação.

## Passo 5 · Exercício · Oversampling e SMOTE

Escreva as duas reamostragens com o numpy, para um problema de duas classes.

### Instruções
1. `oversampling(X, y, semente)` descobre a classe rara pelas contagens (pode ser a 0 ou a 1), sorteia com `rng = np.random.default_rng(semente)` e `rng.choice(posicoes_da_classe_rara, size=falta, replace=True)` as linhas que faltam para as classes empatarem e devolve `(X_novo, y_novo)`: as linhas originais seguidas das cópias sorteadas.
2. `smote_simplificado(X, y, k, semente)` cria o mesmo número de pontos **sintéticos** da classe rara: para cada um, sorteia um exemplo raro $x_i$, sorteia um dos seus `k` vizinhos mais próximos (distância euclidiana, procurados **só entre os exemplos raros** e sem contar o próprio ponto) e devolve o ponto $x_i + \lambda\,(x_{\text{viz}} - x_i)$ com $\lambda$ sorteado entre 0 e 1. Devolve as linhas originais seguidas dos sintéticos, com o rótulo da classe rara.
3. As duas funções usam um gerador criado com a `semente`: a mesma semente dá o mesmo resultado.

### Código inicial
```python
import numpy as np


def oversampling(X, y, semente):
    pass


def smote_simplificado(X, y, k, semente):
    pass
```

### Solução
```python
import numpy as np


def oversampling(X, y, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    extras = rng.choice(np.flatnonzero(y == minoria), size=falta, replace=True)
    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])


def smote_simplificado(X, y, k, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    Xm = X[y == minoria]
    distancias = np.linalg.norm(Xm[:, None, :] - Xm[None, :, :], axis=2)
    vizinhos = np.argsort(distancias, axis=1)[:, 1:k + 1]
    i = rng.integers(0, len(Xm), size=falta)
    j = vizinhos[i, rng.integers(0, k, size=falta)]
    lam = rng.random((falta, 1))
    sinteticos = Xm[i] + lam * (Xm[j] - Xm[i])
    return np.vstack([X, sinteticos]), np.concatenate([y, np.full(falta, minoria)])
```

### Dicas
1. O `np.unique(y, return_counts=True)` devolve as classes e quantas linhas cada uma tem; o `argmin` das contagens aponta a rara.
2. Com broadcasting, `Xm[:, None, :] - Xm[None, :, :]` tem todas as diferenças entre pares; a norma no último eixo dá a matriz de distâncias, e a primeira coluna do `argsort` de cada linha é o próprio ponto.
3. O `rng.integers(0, k, size=falta)` escolhe uma coluna da matriz de vizinhos para cada ponto sorteado; o `rng.random((falta, 1))` dá um $\lambda$ por ponto, pronto para o broadcasting.

### Verificação
```json
[
  {"id": "over-contagem", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = np.vstack([rng.normal(0, 1, (40, 2)), rng.normal(1.2, 0.8, (12, 2))]).round(3)\ny = np.array([0] * 40 + [1] * 12)\nXb, yb = oversampling(X, y, 0)", "expr": "[len(Xb), int((yb == 0).sum()), int((yb == 1).sum())]", "expected": [80, 40, 40], "name": "Oversampling: 28 cópias de exemplos raros, e as classes empatam em 40", "hint": "Sorteie com reposição quantas linhas faltam para a classe rara alcançar a comum."},
  {"id": "over-copias", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = np.vstack([rng.normal(0, 1, (40, 2)), rng.normal(1.2, 0.8, (12, 2))]).round(3)\ny = np.array([0] * 40 + [1] * 12)\nXb, yb = oversampling(X, y, 0)", "expr": "[bool((Xb[:52] == X).all()), all(any((linha == X[y == 1]).all(axis=1)) for linha in Xb[52:])]", "expected": [true, true], "name": "As linhas originais vêm primeiro, e cada extra é a cópia de uma linha rara"},
  {"id": "over-valores", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = np.vstack([rng.normal(0, 1, (40, 2)), rng.normal(1.2, 0.8, (12, 2))]).round(3)\ny = np.array([0] * 40 + [1] * 12)\nXb, yb = oversampling(X, y, 0)", "expr": "Xb[52:57].tolist()", "expected": [[1.953, -0.028], [0.199, 1.259], [0.808, 1.328], [1.24, 0.479], [1.24, 0.479]], "tolerance": 1e-09, "name": "Semente 0: as 5 primeiras cópias sorteadas", "hint": "Use rng.choice sobre as posições da classe rara, com size=falta e replace=True."},
  {"id": "over-minoria-zero", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = np.vstack([rng.normal(0, 1, (40, 2)), rng.normal(1.2, 0.8, (12, 2))]).round(3)\ny = np.array([0] * 40 + [1] * 12)\nXb, yb = oversampling(X, 1 - y, 0)", "expr": "[int((yb == 0).sum()), int((yb == 1).sum())]", "expected": [40, 40], "name": "A classe rara pode ser a 0", "hint": "Descubra a classe rara pelas contagens, sem supor que é a 1."},
  {"id": "smote-contagem", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = np.vstack([rng.normal(0, 1, (40, 2)), rng.normal(1.2, 0.8, (12, 2))]).round(3)\ny = np.array([0] * 40 + [1] * 12)\nXs, ys = smote_simplificado(X, y, 3, 0)", "expr": "[len(Xs), int((ys == 1).sum()), bool((Xs[:52] == X).all())]", "expected": [80, 40, true], "name": "SMOTE: 28 pontos sintéticos depois das linhas originais"},
  {"id": "smote-segmento", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = np.vstack([rng.normal(0, 1, (40, 2)), rng.normal(1.2, 0.8, (12, 2))]).round(3)\ny = np.array([0] * 40 + [1] * 12)\ndef no_segmento(Xo, yo, sint, k):\n    Xm = Xo[yo == 1]\n    d = np.linalg.norm(Xm[:, None, :] - Xm[None, :, :], axis=2)\n    viz = np.argsort(d, axis=1)[:, 1:k + 1]\n    ok = []\n    for s in sint:\n        achou = False\n        for a in range(len(Xm)):\n            for b in viz[a]:\n                v = Xm[b] - Xm[a]\n                t = float((s - Xm[a]) @ v / (v @ v))\n                if -1e-9 <= t <= 1 + 1e-9 and np.linalg.norm(Xm[a] + t * v - s) < 1e-9:\n                    achou = True\n        ok.append(achou)\n    return all(ok)\nXs, ys = smote_simplificado(X, y, 3, 0)", "expr": "no_segmento(X, y, Xs[52:], 3)", "expected": true, "name": "Cada ponto sintético está no segmento entre um exemplo raro e um dos seus 3 vizinhos raros mais próximos", "hint": "Os vizinhos são procurados só entre os exemplos da classe rara, e lambda fica entre 0 e 1."},
  {"id": "smote-k1", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = np.vstack([rng.normal(0, 1, (40, 2)), rng.normal(1.2, 0.8, (12, 2))]).round(3)\ny = np.array([0] * 40 + [1] * 12)\ndef no_segmento(Xo, yo, sint, k):\n    Xm = Xo[yo == 1]\n    d = np.linalg.norm(Xm[:, None, :] - Xm[None, :, :], axis=2)\n    viz = np.argsort(d, axis=1)[:, 1:k + 1]\n    ok = []\n    for s in sint:\n        achou = False\n        for a in range(len(Xm)):\n            for b in viz[a]:\n                v = Xm[b] - Xm[a]\n                t = float((s - Xm[a]) @ v / (v @ v))\n                if -1e-9 <= t <= 1 + 1e-9 and np.linalg.norm(Xm[a] + t * v - s) < 1e-9:\n                    achou = True\n        ok.append(achou)\n    return all(ok)\nXs, ys = smote_simplificado(X, y, 1, 4)", "expr": "no_segmento(X, y, Xs[52:], 1)", "expected": true, "name": "Com k = 1, só o vizinho mais próximo serve", "hint": "Use os k vizinhos mais próximos, não todos os exemplos da classe rara."},
  {"id": "smote-novos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = np.vstack([rng.normal(0, 1, (40, 2)), rng.normal(1.2, 0.8, (12, 2))]).round(3)\ny = np.array([0] * 40 + [1] * 12)\nXs, ys = smote_simplificado(X, y, 3, 0)", "expr": "any(any((s == X).all(axis=1)) for s in Xs[52:])", "expected": false, "name": "Nenhum ponto sintético é cópia de um ponto original", "hint": "O próprio ponto não é vizinho dele mesmo: a distância zero fica fora da lista."},
  {"id": "reprodutivel", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nrng = np.random.default_rng(8)\nX = np.vstack([rng.normal(0, 1, (40, 2)), rng.normal(1.2, 0.8, (12, 2))]).round(3)\ny = np.array([0] * 40 + [1] * 12)\n", "expr": "[smote_simplificado(X, y, 3, 5)[0].tolist() == smote_simplificado(X, y, 3, 5)[0].tolist(), smote_simplificado(X, y, 3, 5)[0].tolist() == smote_simplificado(X, y, 3, 6)[0].tolist(), oversampling(X, y, 2)[0].tolist() == oversampling(X, y, 2)[0].tolist()]", "expected": [true, false, true], "name": "A mesma semente repete o resultado; outra semente sorteia outros pontos", "hint": "Crie o gerador com default_rng(semente) dentro de cada função."}
]
```

### Soluções erradas
```python name="oversampling sem reposição"
import numpy as np


def oversampling(X, y, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    extras = rng.choice(np.flatnonzero(y == minoria), size=falta, replace=False)
    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])


def smote_simplificado(X, y, k, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    Xm = X[y == minoria]
    distancias = np.linalg.norm(Xm[:, None, :] - Xm[None, :, :], axis=2)
    vizinhos = np.argsort(distancias, axis=1)[:, 1:k + 1]
    i = rng.integers(0, len(Xm), size=falta)
    j = vizinhos[i, rng.integers(0, k, size=falta)]
    lam = rng.random((falta, 1))
    sinteticos = Xm[i] + lam * (Xm[j] - Xm[i])
    return np.vstack([X, sinteticos]), np.concatenate([y, np.full(falta, minoria)])
```
```python name="sorteia entre todas as linhas"
import numpy as np


def oversampling(X, y, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    extras = rng.choice(len(y), size=falta, replace=True)
    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])


def smote_simplificado(X, y, k, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    Xm = X[y == minoria]
    distancias = np.linalg.norm(Xm[:, None, :] - Xm[None, :, :], axis=2)
    vizinhos = np.argsort(distancias, axis=1)[:, 1:k + 1]
    i = rng.integers(0, len(Xm), size=falta)
    j = vizinhos[i, rng.integers(0, k, size=falta)]
    lam = rng.random((falta, 1))
    sinteticos = Xm[i] + lam * (Xm[j] - Xm[i])
    return np.vstack([X, sinteticos]), np.concatenate([y, np.full(falta, minoria)])
```
```python name="supõe que a classe rara é a 1"
import numpy as np


def oversampling(X, y, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = 1
    falta = contagens.max() - contagens.min()
    extras = rng.choice(np.flatnonzero(y == minoria), size=falta, replace=True)
    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])


def smote_simplificado(X, y, k, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    Xm = X[y == minoria]
    distancias = np.linalg.norm(Xm[:, None, :] - Xm[None, :, :], axis=2)
    vizinhos = np.argsort(distancias, axis=1)[:, 1:k + 1]
    i = rng.integers(0, len(Xm), size=falta)
    j = vizinhos[i, rng.integers(0, k, size=falta)]
    lam = rng.random((falta, 1))
    sinteticos = Xm[i] + lam * (Xm[j] - Xm[i])
    return np.vstack([X, sinteticos]), np.concatenate([y, np.full(falta, minoria)])
```
```python name="vizinhos de qualquer classe"
import numpy as np


def oversampling(X, y, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    extras = rng.choice(np.flatnonzero(y == minoria), size=falta, replace=True)
    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])


def smote_simplificado(X, y, k, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    Xm = X[y == minoria]
    distancias = np.linalg.norm(Xm[:, None, :] - X[None, :, :], axis=2)
    vizinhos = np.argsort(distancias, axis=1)[:, 1:k + 1]
    i = rng.integers(0, len(Xm), size=falta)
    j = vizinhos[i, rng.integers(0, k, size=falta)]
    lam = rng.random((falta, 1))
    sinteticos = Xm[i] + lam * (X[j] - Xm[i])
    return np.vstack([X, sinteticos]), np.concatenate([y, np.full(falta, minoria)])
```
```python name="o próprio ponto como vizinho"
import numpy as np


def oversampling(X, y, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    extras = rng.choice(np.flatnonzero(y == minoria), size=falta, replace=True)
    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])


def smote_simplificado(X, y, k, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    Xm = X[y == minoria]
    distancias = np.linalg.norm(Xm[:, None, :] - Xm[None, :, :], axis=2)
    vizinhos = np.argsort(distancias, axis=1)[:, :k]
    i = rng.integers(0, len(Xm), size=falta)
    j = vizinhos[i, rng.integers(0, k, size=falta)]
    lam = rng.random((falta, 1))
    sinteticos = Xm[i] + lam * (Xm[j] - Xm[i])
    return np.vstack([X, sinteticos]), np.concatenate([y, np.full(falta, minoria)])
```
```python name="lambda sem limite"
import numpy as np


def oversampling(X, y, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    extras = rng.choice(np.flatnonzero(y == minoria), size=falta, replace=True)
    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])


def smote_simplificado(X, y, k, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    Xm = X[y == minoria]
    distancias = np.linalg.norm(Xm[:, None, :] - Xm[None, :, :], axis=2)
    vizinhos = np.argsort(distancias, axis=1)[:, 1:k + 1]
    i = rng.integers(0, len(Xm), size=falta)
    j = vizinhos[i, rng.integers(0, k, size=falta)]
    lam = rng.normal(0.5, 0.5, (falta, 1))
    sinteticos = Xm[i] + lam * (Xm[j] - Xm[i])
    return np.vstack([X, sinteticos]), np.concatenate([y, np.full(falta, minoria)])
```
```python name="vizinhos sem o limite k"
import numpy as np


def oversampling(X, y, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    extras = rng.choice(np.flatnonzero(y == minoria), size=falta, replace=True)
    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])


def smote_simplificado(X, y, k, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    Xm = X[y == minoria]
    distancias = np.linalg.norm(Xm[:, None, :] - Xm[None, :, :], axis=2)
    vizinhos = np.argsort(distancias, axis=1)[:, 1:]
    i = rng.integers(0, len(Xm), size=falta)
    j = vizinhos[i, rng.integers(0, len(Xm) - 1, size=falta)]
    lam = rng.random((falta, 1))
    sinteticos = Xm[i] + lam * (Xm[j] - Xm[i])
    return np.vstack([X, sinteticos]), np.concatenate([y, np.full(falta, minoria)])
```
```python name="gerador sem a semente"
import numpy as np


def oversampling(X, y, semente):
    rng = np.random.default_rng(semente)
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    extras = rng.choice(np.flatnonzero(y == minoria), size=falta, replace=True)
    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])


def smote_simplificado(X, y, k, semente):
    rng = np.random.default_rng()
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    classes, contagens = np.unique(y, return_counts=True)
    minoria = classes[contagens.argmin()]
    falta = contagens.max() - contagens.min()
    Xm = X[y == minoria]
    distancias = np.linalg.norm(Xm[:, None, :] - Xm[None, :, :], axis=2)
    vizinhos = np.argsort(distancias, axis=1)[:, 1:k + 1]
    i = rng.integers(0, len(Xm), size=falta)
    j = vizinhos[i, rng.integers(0, k, size=falta)]
    lam = rng.random((falta, 1))
    sinteticos = Xm[i] + lam * (Xm[j] - Xm[i])
    return np.vstack([X, sinteticos]), np.concatenate([y, np.full(falta, minoria)])
```

## Passo 6 · Leitura · Métricas e limiar para a classe rara

Com 1 % de positivos, a acurácia diz quase nada: o modelo que nunca marca nada tem 99 %. A AUC, como você viu na m3-03, pode parecer ótima mesmo com muitos alarmes falsos. A métrica que acompanha o problema é a **precisão média** (AP), cujo valor ao acaso é a proporção de positivos: 0,01, e não 0,5.

Muitas operações têm uma **capacidade fixa**: a equipe de análise consegue revisar 50 transações por dia, não "todas com score acima de 0,5". A pergunta passa a ser "das $k$ transações de maior score, quantas são fraude?":

$$
\text{precisão@}k = \frac{\#\{\text{fraudes entre os } k \text{ maiores scores}\}}{k}, \qquad \text{recall@}k = \frac{\#\{\text{fraudes entre os } k \text{ maiores scores}\}}{\#\{\text{fraudes}\}}
$$

As duas usam só a **ordem** dos scores, como a AUC e a AP, e por isso não mudam com o `class_weight` quando a ordem não muda.

```python
ordem = np.argsort(-scores, kind="stable")[:k]     # posições dos k maiores scores
precisao_em_k = y[ordem].mean()
```

Depois de balancear (com pesos ou com reamostragem), o limiar 0,5 perde o sentido original. O modelo aprendeu com uma proporção de 50 % que não existe, e as probabilidades saem infladas: no teste do passo 3, a logística com `class_weight="balanced"` marcou 52 transações e a sem pesos, 3, no mesmo limiar, com AUCs quase iguais (0,968 e 0,966). O limiar é um hiperparâmetro como outro qualquer: escolha-o nos scores da **validação**, pelo custo (m3-03) ou pela capacidade da equipe, e meça uma vez no teste. Se o negócio precisa de probabilidades calibradas, o modelo sem pesos (ou uma calibração, com o `CalibratedClassifierCV`) é o ponto de partida.

Um resumo prático do que comparar, sempre na validação com a proporção real:

- modelo sem pesos, limiar escolhido na validação;
- `class_weight="balanced"`, limiar escolhido na validação;
- oversampling ou SMOTE **dentro** de cada partição, limiar escolhido na validação.

Muitas vezes os três dão AP parecida, e o mais simples vence. O ganho do balanceamento costuma estar no limiar, não na ordem.

## Passo 7 · Exercício · Validação com reamostragem correta

Escreva a validação cruzada que reamostra só o treino de cada partição e a função que põe lado a lado as métricas de um conjunto de scores.

### Instruções
1. `cv_com_reamostragem(modelo, X, y, k, semente, reamostrar)` divide com `StratifiedKFold(n_splits=k, shuffle=True, random_state=semente)`. Em cada partição, chama `reamostrar(X_treino, y_treino, semente)` **só com as linhas de treino** e ajusta um `clone(modelo)` com o resultado.
2. Mede a AP (`average_precision_score`) nas linhas de validação **sem reamostrar**, com a probabilidade da classe 1 (`predict_proba(...)[:, 1]`), e devolve a lista das `k` notas (floats).
3. `comparar_metricas(y, scores, k)` devolve `{"acuracia", "recall", "ap", "precisao_em_k"}`: acurácia e recall com o limiar 0,5 (positivo quando `score >= 0.5`; recall 0.0 se não houver positivo marcado), a AP dos scores e a fração de positivos entre os `k` maiores scores (empates pela posição, com `np.argsort(-scores, kind="stable")`).

### Código inicial
```python
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, recall_score
from sklearn.model_selection import StratifiedKFold

from transacoes import gerar_transacoes


def cv_com_reamostragem(modelo, X, y, k, semente, reamostrar):
    pass


def comparar_metricas(y, scores, k):
    pass
```
```python path=transacoes.py
import numpy as np


def gerar_transacoes(n, semente, taxa_positivos=0.05):
    rng = np.random.default_rng(semente)
    y = (rng.random(n) < taxa_positivos).astype(int)
    X = rng.normal(0, 1, (n, 4))
    X[:, 0] += 1.5 * y
    X[:, 1] -= 1.0 * y
    return X.round(3), y
```

### Solução
```python
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, recall_score
from sklearn.model_selection import StratifiedKFold

from transacoes import gerar_transacoes


def cv_com_reamostragem(modelo, X, y, k, semente, reamostrar):
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    notas = []
    for treino, validacao in StratifiedKFold(n_splits=k, shuffle=True, random_state=semente).split(X, y):
        X_bal, y_bal = reamostrar(X[treino], y[treino], semente)
        m = clone(modelo).fit(X_bal, y_bal)
        scores = m.predict_proba(X[validacao])[:, 1]
        notas.append(float(average_precision_score(y[validacao], scores)))
    return notas


def comparar_metricas(y, scores, k):
    y, scores = np.asarray(y), np.asarray(scores, dtype=float)
    p = (scores >= 0.5).astype(int)
    ordem = np.argsort(-scores, kind="stable")[:k]
    return {
        "acuracia": float(accuracy_score(y, p)),
        "recall": float(recall_score(y, p, zero_division=0)),
        "ap": float(average_precision_score(y, scores)),
        "precisao_em_k": float(y[ordem].mean()),
    }
```
```python path=transacoes.py
import numpy as np


def gerar_transacoes(n, semente, taxa_positivos=0.05):
    rng = np.random.default_rng(semente)
    y = (rng.random(n) < taxa_positivos).astype(int)
    X = rng.normal(0, 1, (n, 4))
    X[:, 0] += 1.5 * y
    X[:, 1] -= 1.0 * y
    return X.round(3), y
```

### Dicas
1. O `split(X, y)` do `StratifiedKFold` devolve, em cada volta, as posições de treino e de validação daquela partição.
2. A reamostragem e o `fit` usam as mesmas linhas, as de treino reamostradas; a validação só passa pelo `predict_proba`.
3. A AP e a precisão@k comparam a ordem dos scores com os rótulos verdadeiros; elas não usam o limiar.

### Verificação
```json
[
  {"id": "espiao", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 4, 0.1)\ndef duplicar_raros(X, y, semente):\n    rng = np.random.default_rng(semente)\n    raros = np.flatnonzero(y == 1)\n    extras = rng.choice(raros, size=(y == 0).sum() - len(raros), replace=True)\n    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])\nvistos = []\ndef espiao(X, y, semente):\n    vistos.append(len(X))\n    return duplicar_raros(X, y, semente)\nr = cv_com_reamostragem(LogisticRegression(), X, y, 5, 0, espiao)", "expr": "vistos", "expected": [240, 240, 240, 240, 240], "name": "A reamostragem roda 5 vezes, cada uma só com as 240 linhas de treino da partição", "hint": "Divida primeiro; reamostre dentro do laço, só as linhas de treino. A validação não passa pela reamostragem."},
  {"id": "modelo-balanceado", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 4, 0.1)\ndef duplicar_raros(X, y, semente):\n    rng = np.random.default_rng(semente)\n    raros = np.flatnonzero(y == 1)\n    extras = rng.choice(raros, size=(y == 0).sum() - len(raros), replace=True)\n    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])\nfrom sklearn.linear_model import LogisticRegression\najustes = []\nclass Espiao(LogisticRegression):\n    def fit(self, X, y, sample_weight=None):\n        ajustes.append(round(float(np.mean(y)), 3))\n        return super().fit(X, y, sample_weight)\nr = cv_com_reamostragem(Espiao(), X, y, 5, 0, duplicar_raros)", "expr": "ajustes", "expected": [0.5, 0.5, 0.5, 0.5, 0.5], "name": "O modelo de cada partição é ajustado com o treino já reamostrado (50 % de positivos)", "hint": "O modelo aprende com o resultado da reamostragem, um clone por partição."},
  {"id": "notas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 4, 0.1)\ndef duplicar_raros(X, y, semente):\n    rng = np.random.default_rng(semente)\n    raros = np.flatnonzero(y == 1)\n    extras = rng.choice(raros, size=(y == 0).sum() - len(raros), replace=True)\n    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])\nr = cv_com_reamostragem(LogisticRegression(), X, y, 5, 0, duplicar_raros)", "expr": "r", "expected": [0.7928571428571428, 0.4939668174962293, 0.46412037037037035, 0.6764705882352942, 0.400529009257662], "tolerance": 1e-09, "name": "300 transações, 5 partições, semente 0: a AP de cada partição", "hint": "A AP usa a probabilidade da classe 1 (predict_proba) nas linhas de validação, que não são reamostradas."},
  {"id": "outra-semente", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom transacoes import gerar_transacoes\nX, y = gerar_transacoes(300, 4, 0.1)\ndef duplicar_raros(X, y, semente):\n    rng = np.random.default_rng(semente)\n    raros = np.flatnonzero(y == 1)\n    extras = rng.choice(raros, size=(y == 0).sum() - len(raros), replace=True)\n    return np.vstack([X, X[extras]]), np.concatenate([y, y[extras]])\nr = cv_com_reamostragem(LogisticRegression(), X, y, 3, 2, duplicar_raros)", "expr": "r", "expected": [0.7847222222222221, 0.1853650557597926, 0.5797112833403155], "tolerance": 1e-09, "name": "3 partições estratificadas da semente 2", "hint": "As partições são de um StratifiedKFold embaralhado com a semente."},
  {"id": "acuracia", "checkpoint": 3, "kind": "call", "function": "comparar_metricas", "args": [[0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], [0.1, 0.05, 0.5, 0.3, 0.02, 0.2, 0.38, 0.15, 0.55, 0.01, 0.08, 0.12, 0.25, 0.03, 0.62, 0.04, 0.09, 0.4, 0.06, 0.11], 3], "expected": {"acuracia": 0.9, "recall": 0.6666666666666666, "ap": 0.7555555555555555, "precisao_em_k": 0.6666666666666666}, "tolerance": 1e-09, "name": "Nos 20 scores do exemplo: acurácia, recall, AP e precisão@3", "hint": "Acurácia e recall usam o limiar 0.5 (score >= 0.5); AP e precisão@k usam só a ordem."},
  {"id": "precisao-em-k", "checkpoint": 3, "kind": "expr", "setup": "r = comparar_metricas([0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], [0.1, 0.05, 0.5, 0.3, 0.02, 0.2, 0.38, 0.15, 0.55, 0.01, 0.08, 0.12, 0.25, 0.03, 0.62, 0.04, 0.09, 0.4, 0.06, 0.11], 5)", "expr": "r['precisao_em_k']", "expected": 0.6, "tolerance": 1e-09, "name": "precisão@5: das 5 maiores notas, 3 são positivas", "hint": "Ordene os scores do maior para o menor e olhe os k primeiros."},
  {"id": "nada-marcado", "checkpoint": 3, "kind": "call", "function": "comparar_metricas", "args": [[0, 0, 0, 1, 0, 0, 0, 0, 0, 1], [0.1, 0.2, 0.05, 0.3, 0.1, 0.0, 0.15, 0.2, 0.1, 0.4], 2], "expected": {"acuracia": 0.8, "recall": 0.0, "ap": 1.0, "precisao_em_k": 1.0}, "tolerance": 1e-09, "name": "Nenhum score passa de 0.5: acurácia alta, recall zero, e a ordem ainda é perfeita", "hint": "Sem nenhum positivo marcado, o recall é 0.0; a AP e a precisão@k não dependem do limiar."},
  {"id": "tipos", "checkpoint": 3, "kind": "expr", "setup": "r = comparar_metricas([0, 1, 0, 1], [0.2, 0.9, 0.6, 0.4], 2)", "expr": "[sorted(r), [type(v).__name__ for v in r.values()]]", "expected": [["acuracia", "ap", "precisao_em_k", "recall"], ["float", "float", "float", "float"]], "name": "Devolve um dicionário com quatro floats"}
]
```

### Soluções erradas
```python name="reamostra antes de dividir"
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, recall_score
from sklearn.model_selection import StratifiedKFold

from transacoes import gerar_transacoes


def cv_com_reamostragem(modelo, X, y, k, semente, reamostrar):
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    X, y = reamostrar(X, y, semente)
    notas = []
    for treino, validacao in StratifiedKFold(n_splits=k, shuffle=True, random_state=semente).split(X, y):
        m = clone(modelo).fit(X[treino], y[treino])
        scores = m.predict_proba(X[validacao])[:, 1]
        notas.append(float(average_precision_score(y[validacao], scores)))
    return notas


def comparar_metricas(y, scores, k):
    y, scores = np.asarray(y), np.asarray(scores, dtype=float)
    p = (scores >= 0.5).astype(int)
    ordem = np.argsort(-scores, kind="stable")[:k]
    return {
        "acuracia": float(accuracy_score(y, p)),
        "recall": float(recall_score(y, p, zero_division=0)),
        "ap": float(average_precision_score(y, scores)),
        "precisao_em_k": float(y[ordem].mean()),
    }
```
```python name="reamostra também a validação"
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, recall_score
from sklearn.model_selection import StratifiedKFold

from transacoes import gerar_transacoes


def cv_com_reamostragem(modelo, X, y, k, semente, reamostrar):
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    notas = []
    for treino, validacao in StratifiedKFold(n_splits=k, shuffle=True, random_state=semente).split(X, y):
        X_bal, y_bal = reamostrar(X[treino], y[treino], semente)
        m = clone(modelo).fit(X_bal, y_bal)
        X_val, y_val = reamostrar(X[validacao], y[validacao], semente)
        scores = m.predict_proba(X_val)[:, 1]
        notas.append(float(average_precision_score(y_val, scores)))
    return notas


def comparar_metricas(y, scores, k):
    y, scores = np.asarray(y), np.asarray(scores, dtype=float)
    p = (scores >= 0.5).astype(int)
    ordem = np.argsort(-scores, kind="stable")[:k]
    return {
        "acuracia": float(accuracy_score(y, p)),
        "recall": float(recall_score(y, p, zero_division=0)),
        "ap": float(average_precision_score(y, scores)),
        "precisao_em_k": float(y[ordem].mean()),
    }
```
```python name="AP com os rótulos previstos"
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, recall_score
from sklearn.model_selection import StratifiedKFold

from transacoes import gerar_transacoes


def cv_com_reamostragem(modelo, X, y, k, semente, reamostrar):
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    notas = []
    for treino, validacao in StratifiedKFold(n_splits=k, shuffle=True, random_state=semente).split(X, y):
        X_bal, y_bal = reamostrar(X[treino], y[treino], semente)
        m = clone(modelo).fit(X_bal, y_bal)
        scores = m.predict(X[validacao])
        notas.append(float(average_precision_score(y[validacao], scores)))
    return notas


def comparar_metricas(y, scores, k):
    y, scores = np.asarray(y), np.asarray(scores, dtype=float)
    p = (scores >= 0.5).astype(int)
    ordem = np.argsort(-scores, kind="stable")[:k]
    return {
        "acuracia": float(accuracy_score(y, p)),
        "recall": float(recall_score(y, p, zero_division=0)),
        "ap": float(average_precision_score(y, scores)),
        "precisao_em_k": float(y[ordem].mean()),
    }
```
```python name="partições sem estratificar"
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, recall_score
from sklearn.model_selection import KFold as StratifiedKFold

from transacoes import gerar_transacoes


def cv_com_reamostragem(modelo, X, y, k, semente, reamostrar):
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    notas = []
    for treino, validacao in StratifiedKFold(n_splits=k, shuffle=True, random_state=semente).split(X, y):
        X_bal, y_bal = reamostrar(X[treino], y[treino], semente)
        m = clone(modelo).fit(X_bal, y_bal)
        scores = m.predict_proba(X[validacao])[:, 1]
        notas.append(float(average_precision_score(y[validacao], scores)))
    return notas


def comparar_metricas(y, scores, k):
    y, scores = np.asarray(y), np.asarray(scores, dtype=float)
    p = (scores >= 0.5).astype(int)
    ordem = np.argsort(-scores, kind="stable")[:k]
    return {
        "acuracia": float(accuracy_score(y, p)),
        "recall": float(recall_score(y, p, zero_division=0)),
        "ap": float(average_precision_score(y, scores)),
        "precisao_em_k": float(y[ordem].mean()),
    }
```
```python name="treina sem reamostrar"
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, recall_score
from sklearn.model_selection import StratifiedKFold

from transacoes import gerar_transacoes


def cv_com_reamostragem(modelo, X, y, k, semente, reamostrar):
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    notas = []
    for treino, validacao in StratifiedKFold(n_splits=k, shuffle=True, random_state=semente).split(X, y):
        X_bal, y_bal = reamostrar(X[treino], y[treino], semente)
        m = clone(modelo).fit(X[treino], y[treino])
        scores = m.predict_proba(X[validacao])[:, 1]
        notas.append(float(average_precision_score(y[validacao], scores)))
    return notas


def comparar_metricas(y, scores, k):
    y, scores = np.asarray(y), np.asarray(scores, dtype=float)
    p = (scores >= 0.5).astype(int)
    ordem = np.argsort(-scores, kind="stable")[:k]
    return {
        "acuracia": float(accuracy_score(y, p)),
        "recall": float(recall_score(y, p, zero_division=0)),
        "ap": float(average_precision_score(y, scores)),
        "precisao_em_k": float(y[ordem].mean()),
    }
```
```python name="precisão@k com os menores scores"
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, recall_score
from sklearn.model_selection import StratifiedKFold

from transacoes import gerar_transacoes


def cv_com_reamostragem(modelo, X, y, k, semente, reamostrar):
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    notas = []
    for treino, validacao in StratifiedKFold(n_splits=k, shuffle=True, random_state=semente).split(X, y):
        X_bal, y_bal = reamostrar(X[treino], y[treino], semente)
        m = clone(modelo).fit(X_bal, y_bal)
        scores = m.predict_proba(X[validacao])[:, 1]
        notas.append(float(average_precision_score(y[validacao], scores)))
    return notas


def comparar_metricas(y, scores, k):
    y, scores = np.asarray(y), np.asarray(scores, dtype=float)
    p = (scores >= 0.5).astype(int)
    ordem = np.argsort(scores, kind="stable")[:k]
    return {
        "acuracia": float(accuracy_score(y, p)),
        "recall": float(recall_score(y, p, zero_division=0)),
        "ap": float(average_precision_score(y, scores)),
        "precisao_em_k": float(y[ordem].mean()),
    }
```
```python name="limiar estrito"
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, recall_score
from sklearn.model_selection import StratifiedKFold

from transacoes import gerar_transacoes


def cv_com_reamostragem(modelo, X, y, k, semente, reamostrar):
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    notas = []
    for treino, validacao in StratifiedKFold(n_splits=k, shuffle=True, random_state=semente).split(X, y):
        X_bal, y_bal = reamostrar(X[treino], y[treino], semente)
        m = clone(modelo).fit(X_bal, y_bal)
        scores = m.predict_proba(X[validacao])[:, 1]
        notas.append(float(average_precision_score(y[validacao], scores)))
    return notas


def comparar_metricas(y, scores, k):
    y, scores = np.asarray(y), np.asarray(scores, dtype=float)
    p = (scores > 0.5).astype(int)
    ordem = np.argsort(-scores, kind="stable")[:k]
    return {
        "acuracia": float(accuracy_score(y, p)),
        "recall": float(recall_score(y, p, zero_division=0)),
        "ap": float(average_precision_score(y, scores)),
        "precisao_em_k": float(y[ordem].mean()),
    }
```
```python name="precisão@k dividida pelos positivos"
import numpy as np
from sklearn.base import clone
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, average_precision_score, recall_score
from sklearn.model_selection import StratifiedKFold

from transacoes import gerar_transacoes


def cv_com_reamostragem(modelo, X, y, k, semente, reamostrar):
    X, y = np.asarray(X, dtype=float), np.asarray(y)
    notas = []
    for treino, validacao in StratifiedKFold(n_splits=k, shuffle=True, random_state=semente).split(X, y):
        X_bal, y_bal = reamostrar(X[treino], y[treino], semente)
        m = clone(modelo).fit(X_bal, y_bal)
        scores = m.predict_proba(X[validacao])[:, 1]
        notas.append(float(average_precision_score(y[validacao], scores)))
    return notas


def comparar_metricas(y, scores, k):
    y, scores = np.asarray(y), np.asarray(scores, dtype=float)
    p = (scores >= 0.5).astype(int)
    ordem = np.argsort(-scores, kind="stable")[:k]
    return {
        "acuracia": float(accuracy_score(y, p)),
        "recall": float(recall_score(y, p, zero_division=0)),
        "ap": float(average_precision_score(y, scores)),
        "precisao_em_k": float(y[ordem].sum() / y.sum()),
    }
```

## Passo 8 · Quiz · Reamostrar a validação

### Pergunta
Uma analista faz SMOTE na tabela inteira, depois `cross_val_score(modelo, X_smote, y_smote, cv=5, scoring="recall")`, e obtém recall 0,93. Em produção, o recall fica em 0,55. O que aconteceu?
- [ ] O SMOTE cria pontos ruins; com oversampling simples o recall de produção seria 0,93
- [ ] Cinco partições são poucas para dados desbalanceados
- [x] A validação de cada partição contém pontos sintéticos criados a partir de fraudes que estão no treino (e vice-versa), e tem 50 % de positivos; a reamostragem precisa acontecer dentro de cada partição, só no treino
- [ ] O recall é a métrica errada; com a AUC o resultado de produção seria igual ao da validação
> Cada ponto sintético fica num segmento entre duas fraudes reais; com a reamostragem antes de dividir, o modelo é avaliado em vizinhos quase idênticos do que viu, e numa proporção de classes que não existe. O oversampling simples faria pior (cópias exatas dos dois lados). O número de partições e a métrica não corrigem o vazamento.

### Pergunta
Um modelo de fraude com `class_weight="balanced"` marca 600 transações por dia no limiar 0,5, e a equipe só consegue revisar 50. O que fazer?
- [ ] Retreinar sem `class_weight`, porque os pesos estragaram o modelo
- [ ] Reamostrar o conjunto de validação para 50 % de fraudes e escolher o limiar ali
- [x] Manter o modelo e subir o limiar, escolhido nos scores da validação (com a proporção real) para que cerca de 50 transações por dia passem dele, e medir a precisão@50 no teste
- [ ] Trocar a métrica de avaliação para a acurácia, que não depende do limiar
> Os pesos deslocam as probabilidades para cima; a ordem das transações quase não muda. O que precisa mudar é o limiar, escolhido na validação, que tem a proporção real de fraudes. Retreinar sem pesos daria uma ordem parecida e ainda exigiria escolher o limiar; uma validação reamostrada mediria uma proporção que não existe; e a acurácia depende do limiar, e com fraude rara diz quase nada.

### Pergunta
Num problema com 30 % de positivos e 200 000 linhas, um colega propõe aplicar oversampling "porque os dados estão desbalanceados". O modelo atual tem AP 0,81 e o limiar foi escolhido pelo custo na validação. O que esperar?
- [x] Provavelmente pouco ganho: com dezenas de milhares de positivos o modelo já tem exemplos de sobra, e o limiar por custo já faz o ajuste que o balanceamento faria
- [ ] Um ganho grande na AP, porque toda base desbalanceada precisa ser equilibrada antes do treino
- [ ] Uma piora garantida, porque o oversampling sempre causa vazamento
- [ ] Nenhuma diferença possível, porque a AP não depende dos dados de treino
> O desbalanceamento atrapalha quando há poucos positivos em números absolutos, quando se usa o limiar 0,5 ou quando a métrica é a acurácia; nenhum dos três ocorre aqui. Feito só no treino, o oversampling não vaza, mas raramente melhora a ordem dos scores. A AP depende do modelo, que depende dos dados de treino.
