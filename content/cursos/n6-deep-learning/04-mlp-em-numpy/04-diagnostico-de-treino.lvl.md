---
slug: n6-m4-04-diagnostico-de-treino
titulo: Diagnóstico de treino
descricao: Ler curvas de perda e acurácia, razão atualização/peso, estatísticas de gradiente por camada, gradientes que somem e explodem, clipping e um checklist de depuração de redes.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Interpretar curvas de treino e diagnosticar taxa alta/baixa, sobreajuste e dados ruins
- Medir razão de atualização por peso e normas de gradiente por camada e agir sobre elas
- Aplicar clipping de gradiente e o checklist de depuração
---

## Passo 1 · Leitura · Uma galeria de curvas

Uma rede com defeito raramente dá erro: ela roda até o fim e entrega números ruins. O primeiro instrumento de diagnóstico é o par de curvas que todo treino produz, a perda de **treino** e a de **validação** por época. As cinco curvas abaixo foram medidas no executor com os dígitos do módulo, a rede 64 → 32 → 10 e o Adam, mudando uma coisa por vez. A referência é $\ln 10 \approx 2{,}30$, a perda de quem chuta entre dez classes.

```text
caso                épocas  treino           validação
taxa 0,01           8       1.500 -> 0.019   0.738 -> 0.086
taxa 1,0            8       inf              inf
taxa 0,0001         8       2.960 -> 2.442   2.921 -> 2.465
100 imagens         12      2.520 -> 0.006   1.634 -> 1.375 (época 3) -> 1.584
pesos zerados       6       2.305 -> 2.304   (não medida)
```

A primeira linha é o treino saudável: as duas perdas caem juntas, e a validação termina no seu menor valor. Com **taxa alta demais**, a perda sobe ou vira `inf` e `nan`, em silêncio; uma perda final maior que a inicial já é sinal de divergência. Com **taxa baixa demais**, a curva desce quase em linha reta e, no fim do treino, ainda está acima da metade do valor inicial: faltou passo, e não capacidade.

No **sobreajuste**, o treino vai a zero enquanto a validação passa por um mínimo e volta a subir: aqui, 1,375 na época 3 e 1,584 no fim, 15 % acima. O sinal só aparece comparando a validação final com o **mínimo** dela; contra o valor inicial (1,634), a mesma curva parece ter melhorado.

A última linha é uma curva **estagnada**, a assinatura mais comum de defeito. Com todos os pesos em zero, as ativações são zero, nenhum gradiente chega às matrizes e a perda fica em $\ln 10$ para sempre.

```python
queda = treino[0] - treino[-1]
estagnada = queda < 0.01 * treino[0]          # caiu menos de 1 %
sobreajuste = validacao[-1] > 1.1 * min(validacao)
```

A ordem das perguntas importa. Uma curva que divergiu também tem validação ruim, e uma curva estagnada também está "acima da metade": primeiro se descarta a divergência, depois a estagnação, depois o sobreajuste, e só então a taxa baixa.

## Passo 2 · Previsão · A razão atualização/peso

Uma medida simples de quanto um passo mexe na rede é a razão entre o tamanho da atualização, $\lVert \Delta w \rVert$, e o tamanho do peso, $\lVert w \rVert$. O programa calcula essa razão para três taxas, com $\Delta w = -\text{taxa} \cdot g$, e a imprime em notação científica sem casas decimais. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

w = np.array([3.0, 4.0])
g = np.array([0.3, 0.4])
for taxa in [1.0, 0.01, 0.0001]:
    delta = -taxa * g
    razao = np.linalg.norm(delta) / np.linalg.norm(w)
    print(f"{taxa} {razao:.0e}")
```

### Dicas
1. A norma de `[3, 4]` é 5, e a de `[0.3, 0.4]` é 0,5.
2. A norma não liga para o sinal: multiplicar por `-taxa` multiplica a norma por `taxa`.
3. O formato `.0e` escreve 0,001 como `1e-03`.

### Saída esperada
```text
1.0 1e-01
0.01 1e-03
0.0001 1e-05
```

## Passo 3 · Exercício · Diagnosticar uma curva
modo: lacunas

Complete as lacunas (`___`) de `diagnosticar_curva`, que recebe as perdas de treino e de validação por época (duas listas do mesmo tamanho) e devolve um diagnóstico. As regras são testadas nesta ordem, e vale a primeira que acertar.

### Instruções
1. `"diverge"`: algum valor do treino não é finito, ou a perda de treino final é maior que a inicial.
2. `"estagnada"`: a queda da perda de treino, do começo ao fim, é menor que 1 % da perda inicial.
3. `"sobreajuste"`: a perda de validação final é maior que 1,1 vez o menor valor que a validação atingiu.
4. `"taxa_baixa"`: a perda de treino final ainda é maior que a metade da inicial. Se nenhuma regra acertar, o diagnóstico é `"ok"`.

### Código inicial
```python
import numpy as np


def diagnosticar_curva(treino, validacao):
    if not np.all(np.isfinite(treino)) or ___:
        return "diverge"
    queda = ___
    if queda < 0.01 * treino[0]:
        return "estagnada"
    if validacao[-1] > 1.1 * ___:
        return "sobreajuste"
    if ___ > 0.5 * treino[0]:
        return "taxa_baixa"
    return "ok"
```

### Solução
```python
import numpy as np


def diagnosticar_curva(treino, validacao):
    if not np.all(np.isfinite(treino)) or treino[-1] > treino[0]:
        return "diverge"
    queda = treino[0] - treino[-1]
    if queda < 0.01 * treino[0]:
        return "estagnada"
    if validacao[-1] > 1.1 * min(validacao):
        return "sobreajuste"
    if treino[-1] > 0.5 * treino[0]:
        return "taxa_baixa"
    return "ok"
```

### Dicas
1. `treino[0]` é a primeira época e `treino[-1]`, a última.
2. A queda é positiva quando a perda diminui.
3. O sobreajuste aparece contra o melhor ponto da validação, que pode estar no meio do treino.

### Verificação
```json
[
  {"id": "saudavel", "checkpoint": 4, "kind": "call", "function": "diagnosticar_curva", "args": [[1.5, 0.426, 0.181, 0.1, 0.062, 0.042, 0.031, 0.019], [0.738, 0.318, 0.188, 0.144, 0.118, 0.114, 0.089, 0.086]], "expected": "ok", "name": "O treino com taxa 0,01 da leitura: as duas perdas caem até o fim"},
  {"id": "perda-infinita", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n", "expr": "diagnosticar_curva([2.9, float('inf'), float('inf')], [2.8, float('inf'), float('inf')])", "expected": "diverge", "name": "Uma perda de treino infinita é divergência"},
  {"id": "nan-no-meio", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n", "expr": "diagnosticar_curva([2.3, float('nan'), 1.0], [2.3, 2.0, 1.1])", "expected": "diverge", "name": "Um nan no meio do histórico de treino é divergência, mesmo com o último valor finito", "hint": "Basta um valor não finito em qualquer época."},
  {"id": "perda-sobe", "checkpoint": 1, "kind": "call", "function": "diagnosticar_curva", "args": [[2.3, 4.0, 6.0, 5.9], [2.3, 4.1, 6.2, 6.0]], "expected": "diverge", "name": "A perda de treino termina acima de onde começou", "hint": "Compare o fim com o começo do treino, e não com a época anterior."},
  {"id": "ultimo-passo-sobe", "checkpoint": 1, "kind": "call", "function": "diagnosticar_curva", "args": [[2.0, 1.0, 0.5, 0.52], [2.1, 1.2, 0.71, 0.7]], "expected": "ok", "name": "Uma subida pequena na última época, depois de uma queda grande, não é divergência", "hint": "Divergir é terminar acima do valor inicial."},
  {"id": "pesos-zerados", "checkpoint": 2, "kind": "call", "function": "diagnosticar_curva", "args": [[2.305, 2.304, 2.304, 2.304, 2.304, 2.304], [2.303, 2.303, 2.303, 2.303, 2.303, 2.303]], "expected": "estagnada", "name": "A curva dos pesos zerados: a perda caiu menos de 1 % do valor inicial", "hint": "A queda é a perda inicial menos a final."},
  {"id": "queda-de-meio-por-cento", "checkpoint": 2, "kind": "call", "function": "diagnosticar_curva", "args": [[2.0, 1.995, 1.99], [2.0, 2.0, 2.0]], "expected": "estagnada", "name": "Uma queda de 0,5 % ainda é estagnação"},
  {"id": "cem-imagens", "checkpoint": 3, "kind": "call", "function": "diagnosticar_curva", "args": [[2.52, 0.838, 0.422, 0.154, 0.114, 0.067, 0.04, 0.022, 0.016, 0.016, 0.007, 0.006], [1.634, 1.523, 1.391, 1.375, 1.419, 1.521, 1.543, 1.513, 1.51, 1.516, 1.55, 1.584]], "expected": "sobreajuste", "name": "A curva das 100 imagens: a validação termina mais de 10 % acima do seu mínimo", "hint": "Compare a validação final com o menor valor que ela atingiu."},
  {"id": "dentro-da-margem", "checkpoint": 3, "kind": "call", "function": "diagnosticar_curva", "args": [[2.0, 1.0, 0.5], [1.0, 0.8, 0.85]], "expected": "ok", "name": "Uma validação 6 % acima do mínimo ainda está dentro da margem de 10 %"},
  {"id": "taxa-0001", "checkpoint": 4, "kind": "call", "function": "diagnosticar_curva", "args": [[2.96, 2.879, 2.786, 2.729, 2.662, 2.571, 2.549, 2.442], [2.921, 2.842, 2.769, 2.701, 2.637, 2.576, 2.52, 2.465]], "expected": "taxa_baixa", "name": "A curva da taxa 0,0001: a perda de treino final ainda está acima da metade da inicial"},
  {"id": "validacao-alta-no-minimo", "checkpoint": 4, "kind": "call", "function": "diagnosticar_curva", "args": [[2.0, 0.8, 0.3], [2.2, 1.9, 1.8]], "expected": "ok", "name": "Treino bem abaixo da metade e validação no seu mínimo: nada a apontar", "hint": "A regra da taxa baixa olha a perda de treino."},
  {"id": "sobreajuste-antes-da-taxa", "checkpoint": 3, "kind": "call", "function": "diagnosticar_curva", "args": [[2.671, 2.254, 2.144, 2.064, 1.987, 1.908, 1.866, 1.794], [2.404, 2.443, 2.477, 2.524, 2.585, 2.632, 2.762, 2.762]], "expected": "sobreajuste", "name": "Treino caindo devagar com a validação subindo: o sobreajuste é perguntado antes da taxa baixa"}
]
```

### Soluções erradas
```python name="validação final contra a inicial"
import numpy as np


def diagnosticar_curva(treino, validacao):
    if not np.all(np.isfinite(treino)) or treino[-1] > treino[0]:
        return "diverge"
    queda = treino[0] - treino[-1]
    if queda < 0.01 * treino[0]:
        return "estagnada"
    if validacao[-1] > 1.1 * validacao[0]:
        return "sobreajuste"
    if treino[-1] > 0.5 * treino[0]:
        return "taxa_baixa"
    return "ok"
```
```python name="validação contra o máximo dela"
import numpy as np


def diagnosticar_curva(treino, validacao):
    if not np.all(np.isfinite(treino)) or treino[-1] > treino[0]:
        return "diverge"
    queda = treino[0] - treino[-1]
    if queda < 0.01 * treino[0]:
        return "estagnada"
    if validacao[-1] > 1.1 * max(validacao):
        return "sobreajuste"
    if treino[-1] > 0.5 * treino[0]:
        return "taxa_baixa"
    return "ok"
```
```python name="compara a validação com o treino"
import numpy as np


def diagnosticar_curva(treino, validacao):
    if not np.all(np.isfinite(treino)) or treino[-1] > treino[0]:
        return "diverge"
    queda = treino[0] - treino[-1]
    if queda < 0.01 * treino[0]:
        return "estagnada"
    if validacao[-1] > 1.1 * treino[-1]:
        return "sobreajuste"
    if treino[-1] > 0.5 * treino[0]:
        return "taxa_baixa"
    return "ok"
```
```python name="divergência só pelo último passo"
import numpy as np


def diagnosticar_curva(treino, validacao):
    if not np.all(np.isfinite(treino)) or treino[-1] > treino[-2]:
        return "diverge"
    queda = treino[0] - treino[-1]
    if queda < 0.01 * treino[0]:
        return "estagnada"
    if validacao[-1] > 1.1 * min(validacao):
        return "sobreajuste"
    if treino[-1] > 0.5 * treino[0]:
        return "taxa_baixa"
    return "ok"
```
```python name="queda com o sinal trocado"
import numpy as np


def diagnosticar_curva(treino, validacao):
    if not np.all(np.isfinite(treino)) or treino[-1] > treino[0]:
        return "diverge"
    queda = treino[-1] - treino[0]
    if queda < 0.01 * treino[0]:
        return "estagnada"
    if validacao[-1] > 1.1 * min(validacao):
        return "sobreajuste"
    if treino[-1] > 0.5 * treino[0]:
        return "taxa_baixa"
    return "ok"
```
```python name="taxa baixa pela perda de validação"
import numpy as np


def diagnosticar_curva(treino, validacao):
    if not np.all(np.isfinite(treino)) or treino[-1] > treino[0]:
        return "diverge"
    queda = treino[0] - treino[-1]
    if queda < 0.01 * treino[0]:
        return "estagnada"
    if validacao[-1] > 1.1 * min(validacao):
        return "sobreajuste"
    if validacao[-1] > 0.5 * treino[0]:
        return "taxa_baixa"
    return "ok"
```
```python name="taxa baixa pela perda inicial"
import numpy as np


def diagnosticar_curva(treino, validacao):
    if not np.all(np.isfinite(treino)) or treino[-1] > treino[0]:
        return "diverge"
    queda = treino[0] - treino[-1]
    if queda < 0.01 * treino[0]:
        return "estagnada"
    if validacao[-1] > 1.1 * min(validacao):
        return "sobreajuste"
    if treino[0] > 0.5 * treino[0]:
        return "taxa_baixa"
    return "ok"
```

## Passo 4 · Leitura · Normas de gradiente e clipping

As curvas dizem **que** algo vai mal; para saber **onde**, olha-se dentro do passo. A primeira medida é a norma do gradiente de cada camada, juntando o peso e o viés:

$$
\lVert g_c \rVert = \sqrt{\sum dW_c^2 + \sum db_c^2}
$$

Medido numa rede de cinco camadas (64 → 32 → 32 → 32 → 32 → 10), num lote de 32 dígitos, da primeira camada para a última:

```text
pesos com desvio 0,05:  4.8e-03  9.2e-03  3.8e-02  1.9e-01  9.5e-01
pesos com desvio 1,0:   1.2e+03  1.5e+03  2.5e+03  3.5e+03  4.6e+03   (perda inf)
desvio raiz(2 / d_in):  2.9e+00  2.8e+00  3.8e+00  5.1e+00  5.1e+00
```

Na primeira linha os gradientes **somem**: cada camada de volta multiplica o sinal por pesos pequenos, e a primeira camada recebe 200 vezes menos que a última. Ela quase não aprende. Na segunda eles **explodem**. Na terceira, a inicialização do módulo 3 mantém as normas na mesma ordem de grandeza.

A segunda medida é a do passo anterior: a razão $\lVert \Delta W \rVert / \lVert W \rVert$ de cada camada, em que $\Delta W$ é o que o otimizador somou ao peso. A regra prática mais citada põe o alvo perto de $10^{-3}$. Muito acima, os pesos mudam mais rápido do que a rede consegue acompanhar; muito abaixo, o treino se arrasta. Nos dígitos, o primeiro passo do Adam deu $6 \cdot 10^{-4}$ com taxa 0,0001 e $6 \cdot 10^{-2}$ com taxa 0,01, que aqui ainda treina bem: a regra é um ponto de partida, e não uma lei.

Contra gradientes que explodem de vez em quando, o remédio é o **clipping pela norma global**, a de todos os gradientes juntos:

$$
\lVert g \rVert = \sqrt{\sum_c \lVert g_c \rVert^2}, \qquad g \leftarrow g \cdot \min\!\left(1, \frac{\tau}{\lVert g \rVert}\right)
$$

```python
fator = min(1.0, max_norma / norma_global)
grads = [(dW * fator, db * fator) for dW, db in grads]
```

Todos os gradientes recebem o **mesmo** fator, então a direção do passo não muda, só o tamanho; abaixo do limite $\tau$, nada acontece. Duas variantes parecidas fazem outra coisa. O corte por valor, `np.clip(g, -τ, τ)`, achata só as entradas grandes e entorta a direção. E cortar cada camada pela própria norma muda a proporção entre as camadas.

## Passo 5 · Exercício · Medir e cortar

Escreva as três medidas da leitura. `grads` e `atualizacoes` são listas de pares de arrays, uma camada por par, como `params = [(W, b), ...]`.

### Instruções
1. `normas_de_gradiente(grads)` devolve uma lista com um `float` por camada: a raiz da soma dos quadrados de `dW` e de `db` juntos.
2. `razao_atualizacao(params, atualizacoes)` recebe `atualizacoes = [(ΔW, Δb), ...]`, o que foi somado a cada parâmetro num passo, e devolve uma lista com $\lVert \Delta W \rVert / \lVert W \rVert$ de cada camada (só as matrizes de pesos; os vieses ficam fora).
3. `clip_por_norma(grads, max_norma)` devolve uma lista nova de pares: se a norma **global** (todos os gradientes de todas as camadas juntos) passar de `max_norma`, todos são multiplicados por `max_norma / norma`; se não passar, saem com os mesmos valores. `grads` não é alterado.

### Código inicial
```python
import numpy as np


def normas_de_gradiente(grads):
    pass


def razao_atualizacao(params, atualizacoes):
    pass


def clip_por_norma(grads, max_norma):
    pass
```

### Solução
```python
import numpy as np


def normas_de_gradiente(grads):
    return [float(np.sqrt((dW ** 2).sum() + (db ** 2).sum())) for dW, db in grads]


def razao_atualizacao(params, atualizacoes):
    return [float(np.linalg.norm(dW) / np.linalg.norm(W)) for (W, b), (dW, db) in zip(params, atualizacoes)]


def clip_por_norma(grads, max_norma):
    norma = float(np.sqrt(sum((dW ** 2).sum() + (db ** 2).sum() for dW, db in grads)))
    fator = min(1.0, max_norma / norma) if norma > 0 else 1.0
    return [(dW * fator, db * fator) for dW, db in grads]
```

### Dicas
1. `(dW ** 2).sum() + (db ** 2).sum()` é o quadrado da norma de uma camada; a norma global soma esses quadrados antes da raiz.
2. `np.linalg.norm(M)` de uma matriz já é a raiz da soma dos quadrados de todos os números dela.
3. `min(1.0, max_norma / norma)` dá um fator que só diminui; trate a norma zero à parte.

### Verificação
```json
[
  {"id": "normas-valores", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\ngrads = [(np.array([[2.0, 0.0], [0.0, 1.0]]), np.array([2.0, 0.0])), (np.array([[4.0], [0.0]]), np.array([0.0]))]\n", "expr": "normas_de_gradiente(grads)", "expected": [3.0, 4.0], "tolerance": 1e-12, "name": "Camada com dW de quadrados somando 5 e db somando 4: norma 3; a outra camada: norma 4", "hint": "A norma da camada junta o peso e o viés debaixo da mesma raiz."},
  {"id": "normas-tipo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(3)\ngrads = [(r.normal(size=(6, 5)), r.normal(size=5)), (r.normal(size=(5, 4)), r.normal(size=4)), (r.normal(size=(4, 3)), r.normal(size=3))]\nns = normas_de_gradiente(grads)", "expr": "[type(ns).__name__, len(ns), all(isinstance(v, float) for v in ns)]", "expected": ["list", 3, true], "name": "Uma lista com um float por camada"},
  {"id": "normas-referencia", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(3)\ngrads = [(r.normal(size=(6, 5)), r.normal(size=5)), (r.normal(size=(5, 4)), r.normal(size=4)), (r.normal(size=(4, 3)), r.normal(size=3))]\n_ref = [float(np.linalg.norm(np.concatenate([dW.ravel(), db.ravel()]))) for dW, db in grads]", "expr": "bool(np.allclose(normas_de_gradiente(grads), _ref, atol=1e-12))", "expected": true, "name": "Numa rede 6 → 5 → 4 → 3 sorteada, cada norma bate com a de dW e db juntos num vetor só"},
  {"id": "razao-valores", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[3.0, 4.0]]), np.array([100.0, 100.0])), (np.array([[0.0], [2.0]]), np.array([50.0]))]\natualizacoes = [(np.array([[-0.003, -0.004]]), np.array([30.0, 40.0])), (np.array([[0.2], [0.0]]), np.array([-5.0]))]\n", "expr": "razao_atualizacao(params, atualizacoes)", "expected": [0.001, 0.1], "tolerance": 1e-12, "name": "‖ΔW‖ / ‖W‖ por camada: 0,005 / 5 e 0,2 / 2", "hint": "A razão usa só as matrizes de pesos: a atualização em cima, o peso embaixo."},
  {"id": "razao-tipo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nparams = [(np.array([[3.0, 4.0]]), np.array([100.0, 100.0])), (np.array([[0.0], [2.0]]), np.array([50.0]))]\natualizacoes = [(np.array([[-0.003, -0.004]]), np.array([30.0, 40.0])), (np.array([[0.2], [0.0]]), np.array([-5.0]))]\nrz = razao_atualizacao(params, atualizacoes)", "expr": "[type(rz).__name__, len(rz), all(isinstance(v, float) for v in rz)]", "expected": ["list", 2, true], "name": "Uma lista com um float por camada"},
  {"id": "clip-reduz", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ngrads = [(np.array([[2.0, 0.0], [0.0, 1.0]]), np.array([2.0, 0.0])), (np.array([[4.0], [0.0]]), np.array([0.0]))]\nnovos = clip_por_norma(grads, 2.5)", "expr": "[novos[0][0].tolist(), novos[0][1].tolist(), novos[1][0].tolist(), novos[1][1].tolist()]", "expected": [[[1.0, 0.0], [0.0, 0.5]], [1.0, 0.0], [[2.0], [0.0]], [0.0]], "tolerance": 1e-12, "name": "Norma global 5 com limite 2,5: todos os gradientes caem pela metade", "hint": "A norma global junta todas as camadas: aqui, a raiz de 3² + 4²."},
  {"id": "clip-norma-final", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(3)\ngrads = [(r.normal(size=(6, 5)), r.normal(size=5)), (r.normal(size=(5, 4)), r.normal(size=4)), (r.normal(size=(4, 3)), r.normal(size=3))]\nnovos = clip_por_norma(grads, 1.0)\n_n = float(np.sqrt(sum((dW ** 2).sum() + (db ** 2).sum() for dW, db in novos)))", "expr": "bool(abs(_n - 1.0) < 1e-12)", "expected": true, "name": "Depois do corte com limite 1, a norma global dos gradientes é 1", "hint": "Um fator só, calculado com a norma de tudo junto."},
  {"id": "clip-abaixo-do-limite", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ngrads = [(np.array([[2.0, 0.0], [0.0, 1.0]]), np.array([2.0, 0.0])), (np.array([[4.0], [0.0]]), np.array([0.0]))]\nnovos = clip_por_norma(grads, 10.0)", "expr": "all(np.array_equal(a, c) and np.array_equal(e, f) for (a, e), (c, f) in zip(novos, grads))", "expected": true, "name": "Com norma global 5 e limite 10, os gradientes saem iguais", "hint": "O fator nunca passa de 1: o corte não aumenta gradientes pequenos."},
  {"id": "clip-direcao", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(3)\ngrads = [(r.normal(size=(6, 5)), r.normal(size=5)), (r.normal(size=(5, 4)), r.normal(size=4)), (r.normal(size=(4, 3)), r.normal(size=3))]\nnovos = clip_por_norma(grads, 0.5)\n_f = novos[0][0][0, 0] / grads[0][0][0, 0]", "expr": "bool(all(np.allclose(a, c * _f, atol=1e-12) and np.allclose(e, f * _f, atol=1e-12) for (a, e), (c, f) in zip(novos, grads)))", "expected": true, "name": "Todos os números, de todas as camadas, são multiplicados pelo mesmo fator", "hint": "Cortar valor por valor, ou camada por camada, muda a direção do passo."},
  {"id": "clip-entrada-intacta", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ngrads = [(np.array([[2.0, 0.0], [0.0, 1.0]]), np.array([2.0, 0.0])), (np.array([[4.0], [0.0]]), np.array([0.0]))]\ncopias = [(dW.copy(), db.copy()) for dW, db in grads]\nnovos = clip_por_norma(grads, 2.5)", "expr": "[all(np.array_equal(a, c) and np.array_equal(e, f) for (a, e), (c, f) in zip(grads, copias)), type(novos).__name__, [[list(dW.shape), list(db.shape)] for dW, db in novos]]", "expected": [true, "list", [[[2, 2], [2]], [[2, 1], [1]]]], "name": "Os gradientes recebidos não mudam, e a saída é uma lista de pares com as mesmas formas", "hint": "Multiplique criando arrays novos."},
  {"id": "clip-gradiente-zero", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\ngrads = [(np.zeros((2, 2)), np.zeros(2))]\nnovos = clip_por_norma(grads, 1.0)", "expr": "[novos[0][0].tolist(), novos[0][1].tolist()]", "expected": [[[0.0, 0.0], [0.0, 0.0]], [0.0, 0.0]], "name": "Gradientes todos zero continuam zero, sem nan", "hint": "Com norma zero não há o que cortar."}
]
```

### Soluções erradas
```python name="corte por valor"
import numpy as np


def normas_de_gradiente(grads):
    return [float(np.sqrt((dW ** 2).sum() + (db ** 2).sum())) for dW, db in grads]


def razao_atualizacao(params, atualizacoes):
    return [float(np.linalg.norm(dW) / np.linalg.norm(W)) for (W, b), (dW, db) in zip(params, atualizacoes)]


def clip_por_norma(grads, max_norma):
    norma = float(np.sqrt(sum((dW ** 2).sum() + (db ** 2).sum() for dW, db in grads)))
    fator = min(1.0, max_norma / norma) if norma > 0 else 1.0
    return [(np.clip(dW, -max_norma, max_norma), np.clip(db, -max_norma, max_norma)) for dW, db in grads]
```
```python name="corte pela norma de cada camada"
import numpy as np


def normas_de_gradiente(grads):
    return [float(np.sqrt((dW ** 2).sum() + (db ** 2).sum())) for dW, db in grads]


def razao_atualizacao(params, atualizacoes):
    return [float(np.linalg.norm(dW) / np.linalg.norm(W)) for (W, b), (dW, db) in zip(params, atualizacoes)]


def clip_por_norma(grads, max_norma):
    novos = []
    for dW, db in grads:
        norma = float(np.sqrt((dW ** 2).sum() + (db ** 2).sum()))
        fator = min(1.0, max_norma / norma) if norma > 0 else 1.0
        novos.append((dW * fator, db * fator))
    return novos
```
```python name="corta no lugar, nos gradientes recebidos"
import numpy as np


def normas_de_gradiente(grads):
    return [float(np.sqrt((dW ** 2).sum() + (db ** 2).sum())) for dW, db in grads]


def razao_atualizacao(params, atualizacoes):
    return [float(np.linalg.norm(dW) / np.linalg.norm(W)) for (W, b), (dW, db) in zip(params, atualizacoes)]


def clip_por_norma(grads, max_norma):
    norma = float(np.sqrt(sum((dW ** 2).sum() + (db ** 2).sum() for dW, db in grads)))
    fator = min(1.0, max_norma / norma) if norma > 0 else 1.0
    for dW, db in grads:
        dW *= fator
        db *= fator
    return grads
```
```python name="sempre leva a norma ao limite"
import numpy as np


def normas_de_gradiente(grads):
    return [float(np.sqrt((dW ** 2).sum() + (db ** 2).sum())) for dW, db in grads]


def razao_atualizacao(params, atualizacoes):
    return [float(np.linalg.norm(dW) / np.linalg.norm(W)) for (W, b), (dW, db) in zip(params, atualizacoes)]


def clip_por_norma(grads, max_norma):
    norma = float(np.sqrt(sum((dW ** 2).sum() + (db ** 2).sum() for dW, db in grads)))
    fator = max_norma / norma if norma > 0 else 1.0
    return [(dW * fator, db * fator) for dW, db in grads]
```
```python name="razão invertida"
import numpy as np


def normas_de_gradiente(grads):
    return [float(np.sqrt((dW ** 2).sum() + (db ** 2).sum())) for dW, db in grads]


def razao_atualizacao(params, atualizacoes):
    return [float(np.linalg.norm(W) / np.linalg.norm(dW)) for (W, b), (dW, db) in zip(params, atualizacoes)]


def clip_por_norma(grads, max_norma):
    norma = float(np.sqrt(sum((dW ** 2).sum() + (db ** 2).sum() for dW, db in grads)))
    fator = min(1.0, max_norma / norma) if norma > 0 else 1.0
    return [(dW * fator, db * fator) for dW, db in grads]
```
```python name="razão com os vieses"
import numpy as np


def normas_de_gradiente(grads):
    return [float(np.sqrt((dW ** 2).sum() + (db ** 2).sum())) for dW, db in grads]


def razao_atualizacao(params, atualizacoes):
    return [float(np.sqrt((dW ** 2).sum() + (db ** 2).sum()) / np.sqrt((W ** 2).sum() + (b ** 2).sum())) for (W, b), (dW, db) in zip(params, atualizacoes)]


def clip_por_norma(grads, max_norma):
    norma = float(np.sqrt(sum((dW ** 2).sum() + (db ** 2).sum() for dW, db in grads)))
    fator = min(1.0, max_norma / norma) if norma > 0 else 1.0
    return [(dW * fator, db * fator) for dW, db in grads]
```
```python name="normas sem a raiz"
import numpy as np


def normas_de_gradiente(grads):
    return [float((dW ** 2).sum() + (db ** 2).sum()) for dW, db in grads]


def razao_atualizacao(params, atualizacoes):
    return [float(np.linalg.norm(dW) / np.linalg.norm(W)) for (W, b), (dW, db) in zip(params, atualizacoes)]


def clip_por_norma(grads, max_norma):
    norma = float(np.sqrt(sum((dW ** 2).sum() + (db ** 2).sum() for dW, db in grads)))
    fator = min(1.0, max_norma / norma) if norma > 0 else 1.0
    return [(dW * fator, db * fator) for dW, db in grads]
```
```python name="normas só com os pesos"
import numpy as np


def normas_de_gradiente(grads):
    return [float(np.linalg.norm(dW)) for dW, db in grads]


def razao_atualizacao(params, atualizacoes):
    return [float(np.linalg.norm(dW) / np.linalg.norm(W)) for (W, b), (dW, db) in zip(params, atualizacoes)]


def clip_por_norma(grads, max_norma):
    norma = float(np.sqrt(sum((dW ** 2).sum() + (db ** 2).sum() for dW, db in grads)))
    fator = min(1.0, max_norma / norma) if norma > 0 else 1.0
    return [(dW * fator, db * fator) for dW, db in grads]
```

## Passo 6 · Leitura · O checklist

Depurar uma rede é caro quando se muda tudo ao mesmo tempo. O hábito que funciona é uma lista curta, sempre na mesma ordem, em que cada item custa segundos e elimina uma família de defeitos.

1. **Fixe a semente.** Sem ela, duas execuções dão curvas diferentes e não dá para saber se uma mudança ajudou ou se foi o sorteio.
2. **Confira os dados.** Os rótulos são inteiros de $0$ a $k - 1$ e estão alinhados com as imagens? As entradas foram padronizadas? Um rótulo igual a $k$ para o treino com `IndexError: index 10 is out of bounds for axis 1 with size 10`; um rótulo $-1$ não dá erro nenhum, porque o numpy lê índice negativo como "o último", e a rede treina com o alvo errado.
3. **Confira a perda inicial.** Antes do primeiro passo, uma rede que não sabe nada deveria chutar, e a perda fica perto de $\ln k$. Medido nos dígitos padronizados: 2,3026 com pesos zerados e 3,00 com a inicialização $\sqrt{2/d_\text{in}}$, as duas na vizinhança de $\ln 10$. Com os pixels em 0–255, a perda inicial foi `inf`.
4. **Decore um lote.** Treine em 32 exemplos só. Uma rede sem defeito decora: aqui a perda foi de 3,41 a 0,005 em 40 épocas, com 32 acertos em 32. Se nem isso acontece, o problema está no forward, no backward ou nos rótulos, e não nos hiperparâmetros.
5. **Ajuste a taxa** olhando a curva e a razão atualização/peso.
6. **Embaralhe a cada época** e, se a validação decepcionar, volte ao item 2: rótulos desalinhados deixam o treino cair devagar (2,67 → 1,79 em oito épocas, a rede decora) enquanto a validação **sobe acima** de $\ln 10$ (2,40 → 2,76).

```python
esperado = np.log(k)                          # logaritmo natural: 2.3026 para k = 10
longe = abs(perda_inicial - esperado) > 0.5 * esperado
finito = np.all(np.isfinite(historico))       # pega inf e nan; np.isnan sozinho deixa inf passar
```

Vários itens podem virar código que roda **antes** do treino e devolve a lista do que encontrou. É o que o próximo exercício faz, com limites simples: entradas com valor absoluto acima de 10 contam como não normalizadas, e a perda inicial pode se afastar de $\ln k$ em até metade dele.

A regra que amarra tudo: **uma mudança por vez**. Trocar a taxa e a inicialização juntas e ver a curva melhorar não diz qual das duas resolveu, nem se a outra atrapalhou.

## Passo 7 · Exercício · Auditar um treino

Escreva `auditar`, que examina os sinais de um treino sem rodá-lo: os dados `X` (uma linha por exemplo), os rótulos `y` (array de inteiros), o número de classes `k`, a perda medida antes do primeiro passo e o histórico de perdas por época. Ela devolve a lista dos problemas encontrados, **nesta ordem**.

### Instruções
1. `"rotulos_fora"`: algum rótulo é menor que 0 ou maior que $k - 1$.
2. `"sem_normalizar"`: o maior valor absoluto de `X` passa de 10.
3. `"perda_inicial"`: `perda_inicial` não é finita, ou a distância dela até $\ln k$ é maior que metade de $\ln k$.
4. `"perda_nao_finita"`: algum valor de `historico` não é finito. Sem nenhum problema, a função devolve uma lista vazia; `X` e `y` não são alterados.

### Código inicial
```python
import numpy as np


def auditar(X, y, k, perda_inicial, historico):
    pass
```

### Solução
```python
import numpy as np


def auditar(X, y, k, perda_inicial, historico):
    problemas = []
    if np.any(y < 0) or np.any(y >= k):
        problemas.append("rotulos_fora")
    if np.abs(X).max() > 10:
        problemas.append("sem_normalizar")
    esperado = np.log(k)
    if not np.isfinite(perda_inicial) or abs(perda_inicial - esperado) > 0.5 * esperado:
        problemas.append("perda_inicial")
    if not np.all(np.isfinite(historico)):
        problemas.append("perda_nao_finita")
    return problemas
```

### Dicas
1. Comece com uma lista vazia e acrescente cada nome com `append`, na ordem das instruções.
2. `np.log` é o logaritmo natural; `abs(a - b)` mede a distância para os dois lados.
3. `np.isfinite` devolve `False` para `inf` e para `nan`; aplique ao histórico inteiro.

### Verificação
```json
[
  {"id": "limpo", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\n", "expr": "auditar(X, y, 4, 1.4, h)", "expected": [], "name": "Um treino sem nenhum dos quatro problemas devolve uma lista vazia"},
  {"id": "rotulo-igual-a-k", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\ny = y.copy()\ny[3] = 4", "expr": "auditar(X, y, 4, 1.4, h)", "expected": ["rotulos_fora"], "name": "Com k = 4, um rótulo 4 está fora", "hint": "Os rótulos válidos vão de 0 a k − 1."},
  {"id": "rotulo-negativo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\ny = y.copy()\ny[0] = -1", "expr": "auditar(X, y, 4, 1.4, h)", "expected": ["rotulos_fora"], "name": "Um rótulo −1 está fora, mesmo sem dar erro de índice", "hint": "Confira os dois lados da faixa."},
  {"id": "pixels-0-255", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\nX = r.uniform(0, 255, size=(20, 6))", "expr": "auditar(X, y, 4, 1.4, h)", "expected": ["sem_normalizar"], "name": "Entradas de 0 a 255 não foram normalizadas"},
  {"id": "valor-muito-negativo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\nX = X.copy()\nX[2, 1] = -50.0", "expr": "auditar(X, y, 4, 1.4, h)", "expected": ["sem_normalizar"], "name": "Um valor −50 também conta: o limite é no valor absoluto", "hint": "Use o maior valor absoluto de X."},
  {"id": "perda-inicial-alta", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\n", "expr": "auditar(X, y, 4, 5.0, h)", "expected": ["perda_inicial"], "name": "Com k = 4, uma perda inicial de 5,0 está longe de ln 4 ≈ 1,39"},
  {"id": "perda-inicial-baixa", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\n", "expr": "auditar(X, y, 4, 0.1, h)", "expected": ["perda_inicial"], "name": "Uma perda inicial de 0,1 também está longe, para baixo", "hint": "A distância até ln k vale para os dois lados."},
  {"id": "perda-inicial-infinita", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\n", "expr": "auditar(X, y, 4, float('inf'), h)", "expected": ["perda_inicial"], "name": "Uma perda inicial infinita é apontada"},
  {"id": "dez-classes", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\ny10 = np.arange(20) % 10", "expr": "[auditar(X, y10, 10, 2.3, h), auditar(X, y10, 10, 3.0, h), auditar(X, y10, 10, 3.6, h)]", "expected": [[], [], ["perda_inicial"]], "name": "Com k = 10: 2,3 e 3,0 estão dentro da margem de ln 10 ≈ 2,30; 3,6 está fora", "hint": "O logaritmo é o natural, e a margem é metade de ln k."},
  {"id": "nan-no-meio", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\n", "expr": "auditar(X, y, 4, 1.4, [1.4, float('nan'), 0.9])", "expected": ["perda_nao_finita"], "name": "Um nan no meio do histórico é apontado, mesmo com o último valor finito"},
  {"id": "inf-no-historico", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\n", "expr": "auditar(X, y, 4, 1.4, [1.4, 2.0, float('inf')])", "expected": ["perda_nao_finita"], "name": "Um inf no histórico é apontado", "hint": "`np.isfinite` pega inf e nan."},
  {"id": "todos", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\ny = y.copy()\ny[5] = 7\nX = X * 100", "expr": "auditar(X, y, 4, 9.0, [9.0, float('nan')])", "expected": ["rotulos_fora", "sem_normalizar", "perda_inicial", "perda_nao_finita"], "name": "Os quatro problemas juntos saem na ordem do enunciado"},
  {"id": "entradas-intactas", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nr = np.random.default_rng(4)\nX = r.normal(size=(20, 6))\ny = np.arange(20) % 4\nh = [1.4, 1.0, 0.7]\nX0, y0 = X.copy(), y.copy()\nres = auditar(X, y, 4, 1.4, h)", "expr": "[type(res).__name__, bool(np.array_equal(X, X0)), bool(np.array_equal(y, y0))]", "expected": ["list", true, true], "name": "Devolve uma lista e não altera X nem y"}
]
```

### Soluções erradas
```python name="logaritmo na base 10"
import numpy as np


def auditar(X, y, k, perda_inicial, historico):
    problemas = []
    if np.any(y < 0) or np.any(y >= k):
        problemas.append("rotulos_fora")
    if np.abs(X).max() > 10:
        problemas.append("sem_normalizar")
    esperado = np.log10(k)
    if not np.isfinite(perda_inicial) or abs(perda_inicial - esperado) > 0.5 * esperado:
        problemas.append("perda_inicial")
    if not np.all(np.isfinite(historico)):
        problemas.append("perda_nao_finita")
    return problemas
```
```python name="aceita o rótulo igual a k"
import numpy as np


def auditar(X, y, k, perda_inicial, historico):
    problemas = []
    if np.any(y < 0) or np.any(y > k):
        problemas.append("rotulos_fora")
    if np.abs(X).max() > 10:
        problemas.append("sem_normalizar")
    esperado = np.log(k)
    if not np.isfinite(perda_inicial) or abs(perda_inicial - esperado) > 0.5 * esperado:
        problemas.append("perda_inicial")
    if not np.all(np.isfinite(historico)):
        problemas.append("perda_nao_finita")
    return problemas
```
```python name="não confere rótulos negativos"
import numpy as np


def auditar(X, y, k, perda_inicial, historico):
    problemas = []
    if np.any(y >= k):
        problemas.append("rotulos_fora")
    if np.abs(X).max() > 10:
        problemas.append("sem_normalizar")
    esperado = np.log(k)
    if not np.isfinite(perda_inicial) or abs(perda_inicial - esperado) > 0.5 * esperado:
        problemas.append("perda_inicial")
    if not np.all(np.isfinite(historico)):
        problemas.append("perda_nao_finita")
    return problemas
```
```python name="maior valor sem o valor absoluto"
import numpy as np


def auditar(X, y, k, perda_inicial, historico):
    problemas = []
    if np.any(y < 0) or np.any(y >= k):
        problemas.append("rotulos_fora")
    if X.max() > 10:
        problemas.append("sem_normalizar")
    esperado = np.log(k)
    if not np.isfinite(perda_inicial) or abs(perda_inicial - esperado) > 0.5 * esperado:
        problemas.append("perda_inicial")
    if not np.all(np.isfinite(historico)):
        problemas.append("perda_nao_finita")
    return problemas
```
```python name="perda inicial só quando é alta"
import numpy as np


def auditar(X, y, k, perda_inicial, historico):
    problemas = []
    if np.any(y < 0) or np.any(y >= k):
        problemas.append("rotulos_fora")
    if np.abs(X).max() > 10:
        problemas.append("sem_normalizar")
    esperado = np.log(k)
    if not np.isfinite(perda_inicial) or perda_inicial - esperado > 0.5 * esperado:
        problemas.append("perda_inicial")
    if not np.all(np.isfinite(historico)):
        problemas.append("perda_nao_finita")
    return problemas
```
```python name="histórico conferido só no último valor"
import numpy as np


def auditar(X, y, k, perda_inicial, historico):
    problemas = []
    if np.any(y < 0) or np.any(y >= k):
        problemas.append("rotulos_fora")
    if np.abs(X).max() > 10:
        problemas.append("sem_normalizar")
    esperado = np.log(k)
    if not np.isfinite(perda_inicial) or abs(perda_inicial - esperado) > 0.5 * esperado:
        problemas.append("perda_inicial")
    if not np.isfinite(historico[-1]):
        problemas.append("perda_nao_finita")
    return problemas
```
```python name="só procura nan no histórico"
import numpy as np


def auditar(X, y, k, perda_inicial, historico):
    problemas = []
    if np.any(y < 0) or np.any(y >= k):
        problemas.append("rotulos_fora")
    if np.abs(X).max() > 10:
        problemas.append("sem_normalizar")
    esperado = np.log(k)
    if not np.isfinite(perda_inicial) or abs(perda_inicial - esperado) > 0.5 * esperado:
        problemas.append("perda_inicial")
    if np.any(np.isnan(historico)):
        problemas.append("perda_nao_finita")
    return problemas
```
```python name="problemas fora da ordem"
import numpy as np


def auditar(X, y, k, perda_inicial, historico):
    problemas = []
    if not np.all(np.isfinite(historico)):
        problemas.append("perda_nao_finita")
    if np.any(y < 0) or np.any(y >= k):
        problemas.append("rotulos_fora")
    if np.abs(X).max() > 10:
        problemas.append("sem_normalizar")
    esperado = np.log(k)
    if not np.isfinite(perda_inicial) or abs(perda_inicial - esperado) > 0.5 * esperado:
        problemas.append("perda_inicial")
    return problemas
```

## Passo 8 · Quiz · Um hiperparâmetro por vez

### Pergunta
Um treino com taxa 0,0001 termina oito épocas com a perda em 2,44 (começou em 2,96). A pessoa muda **três** coisas de uma vez: taxa para 0,01, rede de 32 para 128 neurônios e lote de 32 para 8. A perda final cai para 0,02. O que dá para concluir?
- [ ] Que a rede maior era necessária para o problema
- [ ] Que as três mudanças ajudaram, cada uma um pouco
- [x] Só que a combinação funciona; para saber o que resolveu, é preciso mudar uma coisa por vez a partir do treino original
- [ ] Que o lote menor foi o responsável, porque dá mais passos por época
> Com três mudanças juntas, a melhora não pode ser atribuída a nenhuma delas: uma pode ter resolvido sozinha e outra pode até ter atrapalhado. Nesta lição, só a taxa 0,01, com a rede de 32 neurônios e o lote 32, já leva a perda a 0,019. Nada no experimento mostra que a rede maior era necessária, que as três ajudaram ou que o lote foi a causa: essas são hipóteses que só um teste isolado confirma.

### Pergunta
As normas de gradiente por camada de uma rede de cinco camadas, no primeiro lote, e a perda média de treino em cinco épocas de descida do gradiente com taxa 0,01:

```text
normas:  4.8e-03  9.2e-03  3.8e-02  1.9e-01  9.5e-01
perda:   2.303  2.303  2.303  2.303  2.303
```

Qual é a primeira coisa a mudar?
- [ ] Ligar o clipping pela norma global com limite 1
- [x] A inicialização: os pesos estão pequenos demais, e o gradiente some no caminho até as primeiras camadas
- [ ] Aumentar o número de épocas, porque cinco é pouco para uma rede funda
- [ ] Acrescentar dropout, porque a rede é funda
> A norma cai 200 vezes da última camada para a primeira, o quadro medido com pesos de desvio 0,05: as primeiras camadas quase não recebem sinal, e a curva fica colada em $\ln 10$. O clipping só diminui gradientes grandes; com norma global abaixo de 1, ele não faz nada. Mais épocas repetem o que as cinco primeiras mostraram: a perda não saiu de 2,303 nem na terceira casa. O dropout combate sobreajuste, e essa rede ainda nem começou a aprender.

### Pergunta
Num treino, a perda fica entre 0,4 e 0,6 por várias épocas e, de repente, um lote produz um gradiente com norma global 850; a perda salta para 37 e nunca mais volta. As normas dos outros lotes ficam abaixo de 3. Qual ajuste ataca exatamente esse defeito, sem mudar o resto do treino?
- [ ] `np.clip` em cada gradiente com limites $-5$ e $5$
- [ ] Dividir a taxa de aprendizado por 100
- [x] Clipping pela norma global com limite 5: o lote de norma 850 dá um passo 170 vezes menor, na mesma direção, e os outros não mudam
- [ ] Cortar cada camada pela própria norma, com limite 5
> O defeito é um passo isolado grande demais. O clipping pela norma global encolhe só esse passo e preserva a direção; lotes com norma abaixo de 5 passam intactos. O corte por valor achata as entradas maiores e deixa as outras, o que muda a direção do passo. Dividir a taxa por 100 atrasa todos os passos para evitar um. O corte por camada muda a proporção entre as camadas e ainda permite uma norma global acima do limite.
