---
slug: n6-m7-06-geracao-de-texto-e-amostragem
titulo: Geração de texto e amostragem
descricao: Decodificação autoregressiva, temperatura, top-k, top-p (nucleus), busca gulosa vs amostragem, repetição e o que 'alucinação' significa em um modelo de próximo token.
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
- Implementar a geração autoregressiva com janela de contexto deslizante
- Implementar temperatura, top-k e top-p e observar o efeito na diversidade e na coerência
- Explicar por que o modelo 'inventa' e relacionar isso com a distribuição de próximo token
---

## Passo 1 · Leitura · Um token por vez

Um modelo de linguagem treinado não devolve texto. Ele devolve, para um contexto, uma distribuição de probabilidade sobre o próximo token. Gerar texto é usar essa distribuição num laço, e o modelo é **autorregressivo**: cada token escolhido entra no contexto da escolha seguinte.

```python
ids = list(inicio)
for _ in range(n):
    contexto = np.array([ids[-T:]])            # os últimos T tokens, como lote de 1
    logits, _ = forward(params, contexto)       # (1, T', V)
    probs = softmax(logits[0, -1])              # só a última posição interessa
    ids.append(int(rng.choice(len(probs), p=probs)))
```

Três detalhes do laço.

**Só a última posição.** O forward devolve logits para todas as posições do contexto, porque foi assim que o modelo treinou. Na geração, as previsões das posições anteriores são de tokens que já existem, e só a última linha é usada.

**A janela desliza.** O modelo tem $T$ posições (16, no mini-GPT do curso), e a matriz de posições não tem linha para a décima sétima. Quando o texto passa de $T$ tokens, o contexto é cortado nos $T$ mais recentes, e o que ficou para trás deixa de existir para o modelo. Passar o texto inteiro dá erro de forma:

```text
ValueError: operands could not be broadcast together with shapes (1,29,32) (16,32)
```

**Amostrar, não só escolher.** O `rng.choice` sorteia um token com as probabilidades do modelo. Com um gerador criado a partir de uma semente, o mesmo começo produz sempre o mesmo texto, e outra semente produz outro. O começo é o texto que você fornece: os ids iniciais são o contexto das primeiras escolhas, e tudo o que vem depois é continuação deles.

O bloco abaixo executa três voltas do laço com um "modelo" que é uma tabela escrita à mão, sempre escolhendo o token mais provável. Acompanhe como o último caractere de `texto` decide a linha da tabela consultada.

```python visualizar
tabela = {
    "a": {"b": 0.9, ".": 0.1},
    "b": {"a": 0.7, ".": 0.3},
    ".": {"a": 1.0},
}
texto = "a"
for passo in range(3):
    ultimo = texto[-1]
    probs = tabela[ultimo]
    escolhido = max(probs, key=probs.get)
    texto = texto + escolhido
    print(passo, ultimo, escolhido, texto)
```

O custo é um forward por token gerado. Com os pesos pré-treinados desta lição, 100 caracteres saem em 23 ms no executor.

## Passo 2 · Previsão · Temperatura

A temperatura divide os logits antes da softmax. O código aplica três temperaturas aos logits `[2, 1, 0]`. Preveja a direção de cada mudança antes de calcular: qual temperatura concentra a probabilidade no primeiro token, e qual espalha.

### Código

```python
import numpy as np


def softmax(z):
    e = np.exp(z - z.max())
    return e / e.sum()


logits = np.array([2.0, 1.0, 0.0])
for t in (1.0, 0.5, 2.0):
    probs = softmax(logits / t)
    print(t, np.round(probs, 3).tolist(), int(np.argmax(probs)))
```

### Dicas

1. Com temperatura 0,5, os logits viram `[4, 2, 0]`: as diferenças dobram.
2. Com temperatura 2, os logits viram `[1, 0.5, 0]`: as diferenças caem pela metade.
3. A ordem dos tokens não muda com a temperatura, só a distância entre as probabilidades. Use $e \approx 2{,}718$ e $e^2 \approx 7{,}389$.

### Saída esperada

```text
1.0 [0.665, 0.245, 0.09] 0
0.5 [0.867, 0.117, 0.016] 0
2.0 [0.506, 0.307, 0.186] 0
```

## Passo 3 · Exercício · Temperatura e top-k
modo: lacunas

Complete os dois filtros que atuam sobre os logits de uma posição (um array de uma dimensão), antes da softmax.

`aplicar_temperatura(logits, t)` devolve os logits divididos pela temperatura `t` (positiva). `top_k(logits, k)` devolve um array novo com os `k` maiores logits mantidos e todos os outros trocados por `-inf`, para que a softmax dê probabilidade zero a eles. Em caso de empate, fica o token de menor índice (o `np.argsort` com `kind="stable"` sobre os logits negados já ordena assim). Nenhuma das duas altera o array recebido.

### Instruções

1. `aplicar_temperatura`: divida os logits por `t`.
2. `top_k`: ordene os índices do maior logit para o menor, fique com os `k` primeiros e preencha o resto com `-inf`.

### Código inicial

```python
import numpy as np


def aplicar_temperatura(logits, t):
    return ___


def top_k(logits, k):
    ordem = np.argsort(___, kind="stable")
    mantidos = ___
    filtrados = np.full(logits.shape, ___)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


if __name__ == "__main__":
    logits = np.array([2.0, 1.0, 0.0, 3.0])
    print(aplicar_temperatura(logits, 0.5).tolist())
    print(top_k(logits, 2).tolist())
```

### Solução

```python
import numpy as np


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


if __name__ == "__main__":
    logits = np.array([2.0, 1.0, 0.0, 3.0])
    print(aplicar_temperatura(logits, 0.5).tolist())
    print(top_k(logits, 2).tolist())
```

### Dicas

1. Temperatura menor que 1 aumenta as diferenças entre os logits; maior que 1 diminui.
2. `np.argsort` ordena do menor para o maior: negar os logits inverte a ordem.
3. O array de saída começa inteiro em `-inf` e recebe de volta só os logits mantidos.

### Verificação

```json
[
  {"id": "temperatura-meio", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "aplicar_temperatura(np.array([2.0, 1.0, 0.0]), 0.5).tolist()", "expected": [4.0, 2.0, 0.0], "tolerance": 1e-12, "name": "Temperatura 0,5 dobra os logits", "hint": "Os logits são divididos pela temperatura."},
  {"id": "temperatura-dois", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "aplicar_temperatura(np.array([2.0, 1.0, -4.0]), 2.0).tolist()", "expected": [1.0, 0.5, -2.0], "tolerance": 1e-12, "name": "Temperatura 2 divide os logits por 2"},
  {"id": "temperatura-um", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_z = np.array([1.0, 3.0, 2.0, 0.0, 2.5])\n", "expr": "aplicar_temperatura(_z, 1.0).tolist()", "expected": [1.0, 3.0, 2.0, 0.0, 2.5], "tolerance": 1e-12, "name": "Temperatura 1 não muda nada"},
  {"id": "top-2", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_z = np.array([1.0, 3.0, 2.0, 0.0, 2.5])\n_r = top_k(_z, 2)", "expr": "[np.isneginf(_r).tolist(), _r[np.isfinite(_r)].tolist()]", "expected": [[true, false, true, true, false], [3.0, 2.5]], "name": "k = 2 mantém 3,0 e 2,5 e troca o resto por -inf", "hint": "Os mantidos são os k maiores, e os outros valem -inf (não 0)."},
  {"id": "top-1", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_z = np.array([1.0, 3.0, 2.0, 0.0, 2.5])\n_r = top_k(_z, 1)", "expr": "[np.isneginf(_r).tolist(), float(_r[1])]", "expected": [[true, false, true, true, true], 3.0], "name": "k = 1 mantém só o maior"},
  {"id": "top-todos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_z = np.array([1.0, 3.0, 2.0, 0.0, 2.5])\n", "expr": "top_k(_z, 5).tolist()", "expected": [1.0, 3.0, 2.0, 0.0, 2.5], "name": "k igual ao tamanho mantém tudo"},
  {"id": "top-empate", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_r = top_k(np.array([1.0, 5.0, 5.0, 5.0, 0.0]), 2)", "expr": "np.isneginf(_r).tolist()", "expected": [true, false, false, true, true], "name": "No empate, ficam os tokens de menor índice", "hint": "A ordenação estável dos logits negados põe os empatados em ordem de índice."},
  {"id": "top-negativos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_r = top_k(np.array([-3.0, -1.0, -2.0]), 2)", "expr": "[np.isneginf(_r).tolist(), _r[np.isfinite(_r)].tolist()]", "expected": [[true, false, false], [-1.0, -2.0]], "name": "Com logits negativos, os maiores são os mais próximos de zero"},
  {"id": "top-softmax", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_z = np.array([1.0, 3.0, 2.0, 0.0, 2.5])\n_r = top_k(_z, 3)\n_e = np.exp(_r - _r.max())\n_q = _e / _e.sum()", "expr": "[bool(abs(_q.sum() - 1.0) < 1e-12), int((_q > 0).sum()), float(_q[0])]", "expected": [true, 3, 0.0], "name": "Depois da softmax, só 3 tokens têm probabilidade positiva"},
  {"id": "entrada-intacta", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_z = np.array([1.0, 3.0, 2.0, 0.0, 2.5])\n_c = _z.copy()\ntop_k(_z, 2)\naplicar_temperatura(_z, 0.5)", "expr": "bool(np.array_equal(_z, _c))", "expected": true, "name": "Os logits recebidos não são alterados"}
]
```

### Soluções erradas

```python name="temperatura multiplicada"
import numpy as np


def aplicar_temperatura(logits, t):
    return logits * t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


if __name__ == "__main__":
    logits = np.array([2.0, 1.0, 0.0, 3.0])
    print(aplicar_temperatura(logits, 0.5).tolist())
    print(top_k(logits, 2).tolist())
```

```python name="temperatura subtraída"
import numpy as np


def aplicar_temperatura(logits, t):
    return logits - t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


if __name__ == "__main__":
    logits = np.array([2.0, 1.0, 0.0, 3.0])
    print(aplicar_temperatura(logits, 0.5).tolist())
    print(top_k(logits, 2).tolist())
```

```python name="top-k mantém os k menores"
import numpy as np


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


if __name__ == "__main__":
    logits = np.array([2.0, 1.0, 0.0, 3.0])
    print(aplicar_temperatura(logits, 0.5).tolist())
    print(top_k(logits, 2).tolist())
```

```python name="fora do top-k vira 0 no lugar de -inf"
import numpy as np


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, 0.0)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


if __name__ == "__main__":
    logits = np.array([2.0, 1.0, 0.0, 3.0])
    print(aplicar_temperatura(logits, 0.5).tolist())
    print(top_k(logits, 2).tolist())
```

```python name="mantém k + 1 tokens"
import numpy as np


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k + 1]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


if __name__ == "__main__":
    logits = np.array([2.0, 1.0, 0.0, 3.0])
    print(aplicar_temperatura(logits, 0.5).tolist())
    print(top_k(logits, 2).tolist())
```

```python name="descarta os k maiores"
import numpy as np


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[k:]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


if __name__ == "__main__":
    logits = np.array([2.0, 1.0, 0.0, 3.0])
    print(aplicar_temperatura(logits, 0.5).tolist())
    print(top_k(logits, 2).tolist())
```

## Passo 4 · Leitura · Top-p

O top-k tem um defeito: o número de candidatos razoáveis muda de uma posição para outra, e `k` é fixo. Os pesos pré-treinados desta lição mostram isso. Depois de `a padei`, o modelo dá 0,988 de probabilidade ao `r`: só existe uma continuação sensata, e um `k = 5` deixaria entrar quatro letras que formam palavras inexistentes. Depois de `a padeira `, começa um verbo, e a probabilidade se espalha: `p` 0,242, `c` 0,158, `g` 0,137, `d` 0,122, `v` 0,115, e ainda sobram outras. Agora um `k = 2` cortaria verbos legítimos.

O **top-p** (ou amostragem por núcleo) deixa a própria distribuição decidir quantos tokens ficam. Em vez de um número de tokens, você fixa uma massa de probabilidade $p$:

1. ordene os tokens do mais provável para o menos provável;
2. acumule as probabilidades nessa ordem;
3. mantenha os tokens até o primeiro em que a soma acumulada chega a $p$, **incluindo** esse;
4. zere os demais e divida pelo total, para a soma voltar a 1.

```python
probs = np.array([0.5, 0.25, 0.125, 0.125])
ordem = np.argsort(-probs, kind="stable")
acumulada = np.cumsum(probs[ordem])           # [0.5, 0.75, 0.875, 1.0]
n = int(np.searchsorted(acumulada, 0.7)) + 1  # 2 tokens: 0.75 é a primeira soma >= 0.7
```

Com $p = 0{,}7$, ficam os dois primeiros tokens, e depois de renormalizar as probabilidades são $0{,}5/0{,}75 = 2/3$ e $0{,}25/0{,}75 = 1/3$. Com $p = 0{,}5$, o primeiro token sozinho já chega lá e é o único mantido. Com $p = 1$, nada é cortado.

No modelo da lição, com $p = 0{,}9$, o núcleo tem **1** token depois de `a padei`, **2** depois de `a padeira leva ` (`o` e `a`, os dois artigos) e **8** depois de `a padeira `. O filtro aperta onde o modelo tem certeza e afrouxa onde há escolha de verdade.

Dois cuidados na implementação. A soma acumulada só faz sentido **depois de ordenar**: acumular na ordem dos índices corta tokens prováveis que por acaso têm índice alto. E o token que cruza o limiar fica dentro: se ele fosse excluído, um token com probabilidade 0,988 seria descartado com $p = 0{,}9$, e não sobraria nada para sortear.

Temperatura, top-k e top-p podem ser combinados, sempre nesta ordem: temperatura nos logits, filtros, softmax e sorteio.

## Passo 5 · Exercício · `top_p(probs, p)`

Escreva `top_p(probs, p)`, que recebe um array de probabilidades de uma dimensão (somando 1) e um limiar `p` entre 0 e 1, e devolve um array novo, do mesmo tamanho, com a distribuição filtrada e renormalizada:

- ordene os tokens da maior probabilidade para a menor (empate: menor índice primeiro);
- acumule as probabilidades nessa ordem;
- mantenha os tokens até o primeiro em que a soma acumulada é **maior ou igual** a `p`, incluindo esse; se a soma nunca chegar a `p` (por arredondamento, com `p = 1`), mantenha todos;
- os tokens cortados ficam com probabilidade 0, e o resultado é dividido pela soma do que sobrou.

O array recebido não é alterado.

### Instruções

1. Ordene os índices por probabilidade decrescente e calcule a soma acumulada nessa ordem.
2. Encontre quantos tokens ficam: até o primeiro em que a acumulada chega a `p`, com esse incluído, sem passar do tamanho do array.
3. Monte o array de saída com zeros fora do núcleo e renormalize.

### Código inicial

```python
import numpy as np


def top_p(probs, p):
    # ordenar, acumular, manter até o primeiro que chega a p (incluído), renormalizar
    pass


if __name__ == "__main__":
    probs = np.array([0.5, 0.25, 0.125, 0.125])
    print(top_p(probs, 0.7).tolist())
    print(top_p(probs, 1.0).tolist())
```

### Solução

```python
import numpy as np


def top_p(probs, p):
    ordem = np.argsort(-probs, kind="stable")
    acumulada = np.cumsum(probs[ordem])
    n = min(int(np.searchsorted(acumulada, p)) + 1, len(probs))
    mantidos = ordem[:n]
    filtradas = np.zeros_like(probs)
    filtradas[mantidos] = probs[mantidos]
    return filtradas / filtradas.sum()


if __name__ == "__main__":
    probs = np.array([0.5, 0.25, 0.125, 0.125])
    print(top_p(probs, 0.7).tolist())
    print(top_p(probs, 1.0).tolist())
```

### Dicas

1. `np.argsort(-probs, kind="stable")` dá a ordem pedida, com os empates em ordem de índice.
2. `np.searchsorted(acumulada, p)` devolve o primeiro índice em que `acumulada >= p`.
3. A saída tem as probabilidades nas posições originais, não na ordem ordenada.

### Verificação

```json
[
  {"id": "exemplo-leitura", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_q = np.array([0.5, 0.25, 0.125, 0.125])\n_e = np.exp(np.random.default_rng(61).normal(0.0, 1.5, 29))\n_m = _e / _e.sum()\ndef _ref(probs, p):\n    ordem = sorted(range(len(probs)), key=lambda i: (-probs[i], i))\n    soma, mantidos = 0.0, []\n    for i in ordem:\n        mantidos.append(i)\n        soma += float(probs[i])\n        if soma >= p:\n            break\n    saida = np.zeros(len(probs))\n    for i in mantidos:\n        saida[i] = probs[i]\n    return saida / saida.sum()\n", "expr": "top_p(_q, 0.7).tolist()", "expected": [0.6666666666666666, 0.3333333333333333, 0.0, 0.0], "tolerance": 1e-12, "name": "[0,5, 0,25, 0,125, 0,125] com p = 0,7: ficam dois tokens, com 2/3 e 1/3"},
  {"id": "limiar-exato", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_q = np.array([0.5, 0.25, 0.125, 0.125])\n_e = np.exp(np.random.default_rng(61).normal(0.0, 1.5, 29))\n_m = _e / _e.sum()\ndef _ref(probs, p):\n    ordem = sorted(range(len(probs)), key=lambda i: (-probs[i], i))\n    soma, mantidos = 0.0, []\n    for i in ordem:\n        mantidos.append(i)\n        soma += float(probs[i])\n        if soma >= p:\n            break\n    saida = np.zeros(len(probs))\n    for i in mantidos:\n        saida[i] = probs[i]\n    return saida / saida.sum()\n", "expr": "[top_p(_q, 0.5).tolist(), top_p(_q, 0.75).tolist()]", "expected": [[1.0, 0.0, 0.0, 0.0], [0.6666666666666666, 0.3333333333333333, 0.0, 0.0]], "tolerance": 1e-12, "name": "Soma acumulada igual a p já basta: p = 0,5 mantém 1 token e p = 0,75 mantém 2", "hint": "O corte é no primeiro token em que a acumulada é maior ou igual a p."},
  {"id": "token-que-cruza", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "top_p(np.array([0.01, 0.98, 0.01]), 0.9).tolist()", "expected": [0.0, 1.0, 0.0], "tolerance": 1e-12, "name": "O token que cruza o limiar fica: [0,01, 0,98, 0,01] com p = 0,9 mantém o do meio", "hint": "Se o token que cruza fosse excluído, não sobraria nenhum."},
  {"id": "fora-de-ordem", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "top_p(np.array([0.125, 0.5, 0.125, 0.25]), 0.7).tolist()", "expected": [0.0, 0.6666666666666666, 0.0, 0.3333333333333333], "tolerance": 1e-12, "name": "Com as probabilidades fora de ordem, ficam os dois maiores, nas posições originais", "hint": "Acumule depois de ordenar, e devolva cada probabilidade ao seu índice."},
  {"id": "p-um", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_q = np.array([0.5, 0.25, 0.125, 0.125])\n_e = np.exp(np.random.default_rng(61).normal(0.0, 1.5, 29))\n_m = _e / _e.sum()\ndef _ref(probs, p):\n    ordem = sorted(range(len(probs)), key=lambda i: (-probs[i], i))\n    soma, mantidos = 0.0, []\n    for i in ordem:\n        mantidos.append(i)\n        soma += float(probs[i])\n        if soma >= p:\n            break\n    saida = np.zeros(len(probs))\n    for i in mantidos:\n        saida[i] = probs[i]\n    return saida / saida.sum()\n", "expr": "[bool(np.allclose(top_p(_m, 1.0), _m, atol=1e-12)), top_p(_q, 1.0).tolist()]", "expected": [true, [0.5, 0.25, 0.125, 0.125]], "tolerance": 1e-12, "name": "p = 1 mantém todos os tokens", "hint": "Se a acumulada nunca chega a p por arredondamento, o número de mantidos é o tamanho do array."},
  {"id": "empate", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np", "expr": "top_p(np.array([0.25, 0.25, 0.25, 0.25]), 0.5).tolist()", "expected": [0.5, 0.5, 0.0, 0.0], "tolerance": 1e-12, "name": "Quatro tokens empatados com p = 0,5: ficam os dois de menor índice"},
  {"id": "referencia", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_q = np.array([0.5, 0.25, 0.125, 0.125])\n_e = np.exp(np.random.default_rng(61).normal(0.0, 1.5, 29))\n_m = _e / _e.sum()\ndef _ref(probs, p):\n    ordem = sorted(range(len(probs)), key=lambda i: (-probs[i], i))\n    soma, mantidos = 0.0, []\n    for i in ordem:\n        mantidos.append(i)\n        soma += float(probs[i])\n        if soma >= p:\n            break\n    saida = np.zeros(len(probs))\n    for i in mantidos:\n        saida[i] = probs[i]\n    return saida / saida.sum()\n", "expr": "[bool(np.allclose(top_p(_m, p), _ref(_m, p), atol=1e-12)) for p in (0.1, 0.5, 0.8, 0.95)]", "expected": [true, true, true, true], "name": "Igual à referência numa distribuição de 29 tokens, para p = 0,1, 0,5, 0,8 e 0,95"},
  {"id": "soma-um", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_q = np.array([0.5, 0.25, 0.125, 0.125])\n_e = np.exp(np.random.default_rng(61).normal(0.0, 1.5, 29))\n_m = _e / _e.sum()\ndef _ref(probs, p):\n    ordem = sorted(range(len(probs)), key=lambda i: (-probs[i], i))\n    soma, mantidos = 0.0, []\n    for i in ordem:\n        mantidos.append(i)\n        soma += float(probs[i])\n        if soma >= p:\n            break\n    saida = np.zeros(len(probs))\n    for i in mantidos:\n        saida[i] = probs[i]\n    return saida / saida.sum()\n", "expr": "[bool(abs(top_p(_m, p).sum() - 1.0) < 1e-12) for p in (0.2, 0.6, 0.9)]", "expected": [true, true, true], "name": "O resultado soma 1", "hint": "Divida pelo total das probabilidades mantidas."},
  {"id": "nucleo-cresce", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_q = np.array([0.5, 0.25, 0.125, 0.125])\n_e = np.exp(np.random.default_rng(61).normal(0.0, 1.5, 29))\n_m = _e / _e.sum()\ndef _ref(probs, p):\n    ordem = sorted(range(len(probs)), key=lambda i: (-probs[i], i))\n    soma, mantidos = 0.0, []\n    for i in ordem:\n        mantidos.append(i)\n        soma += float(probs[i])\n        if soma >= p:\n            break\n    saida = np.zeros(len(probs))\n    for i in mantidos:\n        saida[i] = probs[i]\n    return saida / saida.sum()\n", "expr": "[int((top_p(_m, p) > 0).sum()) for p in (0.1, 0.5, 0.8, 0.95)]", "expected": [1, 1, 6, 14], "name": "O número de tokens mantidos cresce com p"},
  {"id": "entrada-intacta", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_q = np.array([0.5, 0.25, 0.125, 0.125])\n_e = np.exp(np.random.default_rng(61).normal(0.0, 1.5, 29))\n_m = _e / _e.sum()\ndef _ref(probs, p):\n    ordem = sorted(range(len(probs)), key=lambda i: (-probs[i], i))\n    soma, mantidos = 0.0, []\n    for i in ordem:\n        mantidos.append(i)\n        soma += float(probs[i])\n        if soma >= p:\n            break\n    saida = np.zeros(len(probs))\n    for i in mantidos:\n        saida[i] = probs[i]\n    return saida / saida.sum()\n_c = _q.copy()\n_r = top_p(_q, 0.7)", "expr": "[bool(np.array_equal(_q, _c)), _r is not _q]", "expected": [true, true], "name": "O array recebido não é alterado"}
]
```

### Soluções erradas

```python name="top-p sem ordenar"
import numpy as np


def top_p(probs, p):
    ordem = np.arange(len(probs))
    acumulada = np.cumsum(probs[ordem])
    n = min(int(np.searchsorted(acumulada, p)) + 1, len(probs))
    mantidos = ordem[:n]
    filtradas = np.zeros_like(probs)
    filtradas[mantidos] = probs[mantidos]
    return filtradas / filtradas.sum()


if __name__ == "__main__":
    probs = np.array([0.5, 0.25, 0.125, 0.125])
    print(top_p(probs, 0.7).tolist())
    print(top_p(probs, 1.0).tolist())
```

```python name="sem renormalizar"
import numpy as np


def top_p(probs, p):
    ordem = np.argsort(-probs, kind="stable")
    acumulada = np.cumsum(probs[ordem])
    n = min(int(np.searchsorted(acumulada, p)) + 1, len(probs))
    mantidos = ordem[:n]
    filtradas = np.zeros_like(probs)
    filtradas[mantidos] = probs[mantidos]
    return filtradas


if __name__ == "__main__":
    probs = np.array([0.5, 0.25, 0.125, 0.125])
    print(top_p(probs, 0.7).tolist())
    print(top_p(probs, 1.0).tolist())
```

```python name="exclui o token que cruza o limiar"
import numpy as np


def top_p(probs, p):
    ordem = np.argsort(-probs, kind="stable")
    acumulada = np.cumsum(probs[ordem])
    n = min(int(np.searchsorted(acumulada, p)), len(probs))
    mantidos = ordem[:n]
    filtradas = np.zeros_like(probs)
    filtradas[mantidos] = probs[mantidos]
    return filtradas / filtradas.sum()


if __name__ == "__main__":
    probs = np.array([0.5, 0.25, 0.125, 0.125])
    print(top_p(probs, 0.7).tolist())
    print(top_p(probs, 1.0).tolist())
```

```python name="corte só quando a soma passa de p"
import numpy as np


def top_p(probs, p):
    ordem = np.argsort(-probs, kind="stable")
    acumulada = np.cumsum(probs[ordem])
    n = min(int(np.searchsorted(acumulada, p, side="right")) + 1, len(probs))
    mantidos = ordem[:n]
    filtradas = np.zeros_like(probs)
    filtradas[mantidos] = probs[mantidos]
    return filtradas / filtradas.sum()


if __name__ == "__main__":
    probs = np.array([0.5, 0.25, 0.125, 0.125])
    print(top_p(probs, 0.7).tolist())
    print(top_p(probs, 1.0).tolist())
```

```python name="ordena da menor para a maior"
import numpy as np


def top_p(probs, p):
    ordem = np.argsort(probs, kind="stable")
    acumulada = np.cumsum(probs[ordem])
    n = min(int(np.searchsorted(acumulada, p)) + 1, len(probs))
    mantidos = ordem[:n]
    filtradas = np.zeros_like(probs)
    filtradas[mantidos] = probs[mantidos]
    return filtradas / filtradas.sum()


if __name__ == "__main__":
    probs = np.array([0.5, 0.25, 0.125, 0.125])
    print(top_p(probs, 0.7).tolist())
    print(top_p(probs, 1.0).tolist())
```

```python name="devolve na ordem ordenada, não nos índices originais"
import numpy as np


def top_p(probs, p):
    ordem = np.argsort(-probs, kind="stable")
    acumulada = np.cumsum(probs[ordem])
    n = min(int(np.searchsorted(acumulada, p)) + 1, len(probs))
    mantidos = ordem[:n]
    filtradas = np.zeros_like(probs)
    filtradas[:n] = probs[mantidos]
    return filtradas / filtradas.sum()


if __name__ == "__main__":
    probs = np.array([0.5, 0.25, 0.125, 0.125])
    print(top_p(probs, 0.7).tolist())
    print(top_p(probs, 1.0).tolist())
```

```python name="mantém os tokens com probabilidade acima de p"
import numpy as np


def top_p(probs, p):
    ordem = np.argsort(-probs, kind="stable")
    acumulada = np.cumsum(probs[ordem])
    n = min(int(np.searchsorted(acumulada, p)) + 1, len(probs))
    mantidos = ordem[probs[ordem] >= min(p, probs.max())]
    filtradas = np.zeros_like(probs)
    filtradas[mantidos] = probs[mantidos]
    return filtradas / filtradas.sum()


if __name__ == "__main__":
    probs = np.array([0.5, 0.25, 0.125, 0.125])
    print(top_p(probs, 0.7).tolist())
    print(top_p(probs, 1.0).tolist())
```

## Passo 6 · Leitura · Guloso, repetição e invenção

Com o laço e os filtros, dá para comparar estratégias no mini-GPT pré-treinado (1 bloco, 600 passos). Todos os textos abaixo começam em `a ` e foram gerados no executor.

**Guloso** (sempre o token mais provável):

```text
a ponte.
a moleira conserta o cesto na ponte.
a moleira conserta o cesto na ponte.
```

A segunda linha se repete para sempre. O guloso é determinístico: quando o contexto volta a um estado já visto, a continuação é a mesma, e o texto entra num ciclo. Em 3 000 caracteres, saem 80 cópias da mesma frase.

**Temperatura 0,5:**

```text
a ponte.
o pastor na ponte.
o ferreira procura o guarda o cesto na ponte.
```

**Temperatura 1,5:**

```text
a poncura oita.
o pasta o naço.
o barca rede marde no pascado guarda o barcura àrde.
```

A temperatura troca coerência por variedade. A fração de trigramas de caracteres distintos, em quatro textos de 100 caracteres, sobe de 0,10 no guloso para 0,36 com temperatura 0,5, 0,42 com 1,0 e 0,49 com 1,5. No outro sentido, com temperatura 1,5 quase nenhuma palavra existe.

```python
def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    return len(set(trigramas)) / len(trigramas)
```

**Invenção.** A frase preferida do guloso, `a moleira conserta o cesto na ponte.`, é gramatical e convincente, e **não existe** no texto de treino. Com temperatura 0,5, de 65 linhas geradas, 12 são frases corretas da gramática, 10 delas diferentes entre si, e só 1 dessas 10 aparece no corpus. As outras 9 são afirmações novas sobre a vila, escritas no mesmo tom das verdadeiras.

Não há defeito nenhum aí. O modelo foi treinado para dar probabilidade alta a continuações **plausíveis**, e é só isso que ele sabe fazer. Ele não guarda uma lista dos fatos que leu, e nada na geração consulta uma. Uma frase verdadeira e uma inventada com a mesma forma saem pelo mesmo caminho, com a mesma fluência. Num modelo grande, esse comportamento recebe o nome de alucinação: o texto continua plausível onde deixou de ser verdadeiro.

O próximo módulo volta a esse limite, e o Nível 7 mostra como dar ao modelo documentos para consultar.

## Passo 7 · Exercício · `gerar(params, ids, n, temperatura, k, semente, forward)`

Escreva o laço de geração e a medida de diversidade. Os arquivos de apoio são `gpt.py` e `pesos_gpt.txt` (os pesos do mini-GPT de 1 bloco); `aplicar_temperatura`, `top_k` e a lista `VOCAB` (os 29 caracteres, na ordem dos ids) já estão no arquivo.

`gerar(params, ids, n, temperatura, k, semente, forward)` devolve uma lista de `int`: os ids iniciais (uma lista não vazia) seguidos de `n` ids novos. O procedimento é fixo:

- crie `rng = np.random.default_rng(semente)` uma vez; o tamanho do contexto é `T = params["pos"].shape[0]`;
- a cada token, chame `forward(params, contexto)` com `contexto` um array `(1, T')` com os últimos `T` ids (ou todos, se houver menos de `T`); a função devolve `(logits, cache)`, e os logits que interessam são os da última posição, `logits[0, -1]`;
- se `temperatura == 0`, o próximo token é o `argmax` dos logits (guloso), sem sorteio;
- senão, aplique a temperatura, depois o `top_k` com `k` (se `k` não for `None`), depois a softmax, e sorteie com `rng.choice(len(probs), p=probs)`.

`diversidade(textos)` recebe uma lista de strings e devolve a fração de trigramas de caracteres distintos: junte os trigramas (janelas de 3 caracteres seguidos) de todos os textos, sem formar trigramas que atravessem de um texto para outro, e divida o número de trigramas diferentes pelo total. Sem nenhum trigrama, devolva `0.0`.

### Instruções

1. `gerar`: gerador criado uma vez; a cada token, contexto com os últimos `T` ids, forward, logits da última posição; guloso se a temperatura for 0, senão temperatura, `top_k`, softmax e `rng.choice`; devolva os ids iniciais mais os novos.
2. `diversidade`: trigramas de cada texto, todos numa lista só; distintos dividido pelo total, e `0.0` se não houver trigramas.

### Código inicial

```python
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    # devolve a lista de ids: os iniciais seguidos de n novos
    pass


def diversidade(textos):
    # fração de trigramas de caracteres distintos, contando todos os textos
    pass


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```
```python path=gpt.py
"""Mini-GPT de referência do curso: forward e backward em numpy.

params é um dicionário de arrays. Chaves: "tok" (V, d), "pos" (T, d), por bloco i
"b{i}.ln1_g", "b{i}.ln1_b", "b{i}.Wq", "b{i}.Wk", "b{i}.Wv", "b{i}.Wo", "b{i}.ln2_g",
"b{i}.ln2_b", "b{i}.W1", "b{i}.c1", "b{i}.W2", "b{i}.c2", e no fim "lnf_g", "lnf_b", "Ws" (d, V).
"""
import base64
import json

import numpy as np


def criar_params(V, T, d, n_blocos, semente=0):
    """Sorteia os parâmetros de um mini-GPT (pré-norm, MLP 4d com ReLU)."""
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(n_blocos):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def contar_parametros(params):
    """Total de números em todos os arrays de params."""
    return int(sum(a.size for a in params.values()))


def _ln(x, g, b, eps=1e-5):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + eps)
    return g * (xc / s) + b, (xc / s, s, g)


def _ln_back(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x, h):
    B, T, d = x.shape
    return x.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def forward(params, ids, h=4):
    """ids (B, T) de inteiros -> (logits (B, T, V), cache). T pode ser menor que o contexto."""
    B, T = ids.shape
    n_blocos = sum(1 for k in params if k.endswith(".Wq"))
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // h
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(n_blocos):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1 = _ln(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"], h), _dividir(a @ P["Wk"], h), _dividir(a @ P["Wv"], h)
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _ln(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _ln(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf, h)


def backward(params, dlogits, cache):
    """Gradientes de todos os parâmetros (dicionário com as mesmas chaves), dado dL/dlogits."""
    ids, blocos, f, lnf, h = cache
    B, T = ids.shape
    dh = f.shape[-1] // h
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _ln_back(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _ln_back(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T, h)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _ln_back(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def carregar_pesos(caminho="pesos_gpt.txt"):
    """Lê os pesos pré-treinados: linha 1 com [chave, forma] em JSON, linha 2 com float16 em base64."""
    with open(caminho, encoding="utf-8") as arq:
        formas = json.loads(arq.readline())
        plano = np.frombuffer(base64.b64decode(arq.readline().strip()), dtype=np.float16).astype(np.float64)
    params, i = {}, 0
    for chave, forma in formas:
        n = int(np.prod(forma))
        params[chave] = plano[i:i + n].reshape(forma).copy()
        i += n
    return params
```
```text path=pesos_gpt.txt
[["tok", [29, 32]], ["pos", [16, 32]], ["b0.ln1_g", [32]], ["b0.ln1_b", [32]], ["b0.Wq", [32, 32]], ["b0.Wk", [32, 32]], ["b0.Wv", [32, 32]], ["b0.Wo", [32, 32]], ["b0.ln2_g", [32]], ["b0.ln2_b", [32]], ["b0.W1", [32, 128]], ["b0.c1", [128]], ["b0.W2", [128, 32]], ["b0.c2", [32]], ["lnf_g", [32]], ["lnf_b", [32]], ["Ws", [32, 29]]]
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
```

### Solução

```python
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```
```python path=gpt.py
"""Mini-GPT de referência do curso: forward e backward em numpy.

params é um dicionário de arrays. Chaves: "tok" (V, d), "pos" (T, d), por bloco i
"b{i}.ln1_g", "b{i}.ln1_b", "b{i}.Wq", "b{i}.Wk", "b{i}.Wv", "b{i}.Wo", "b{i}.ln2_g",
"b{i}.ln2_b", "b{i}.W1", "b{i}.c1", "b{i}.W2", "b{i}.c2", e no fim "lnf_g", "lnf_b", "Ws" (d, V).
"""
import base64
import json

import numpy as np


def criar_params(V, T, d, n_blocos, semente=0):
    """Sorteia os parâmetros de um mini-GPT (pré-norm, MLP 4d com ReLU)."""
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(n_blocos):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def contar_parametros(params):
    """Total de números em todos os arrays de params."""
    return int(sum(a.size for a in params.values()))


def _ln(x, g, b, eps=1e-5):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + eps)
    return g * (xc / s) + b, (xc / s, s, g)


def _ln_back(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x, h):
    B, T, d = x.shape
    return x.reshape(B, T, h, d // h).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def forward(params, ids, h=4):
    """ids (B, T) de inteiros -> (logits (B, T, V), cache). T pode ser menor que o contexto."""
    B, T = ids.shape
    n_blocos = sum(1 for k in params if k.endswith(".Wq"))
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // h
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(n_blocos):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1 = _ln(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"], h), _dividir(a @ P["Wk"], h), _dividir(a @ P["Wv"], h)
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _ln(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _ln(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf, h)


def backward(params, dlogits, cache):
    """Gradientes de todos os parâmetros (dicionário com as mesmas chaves), dado dL/dlogits."""
    ids, blocos, f, lnf, h = cache
    B, T = ids.shape
    dh = f.shape[-1] // h
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _ln_back(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {k.split(".")[1]: v for k, v in params.items() if k.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _ln_back(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T, h)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _ln_back(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def carregar_pesos(caminho="pesos_gpt.txt"):
    """Lê os pesos pré-treinados: linha 1 com [chave, forma] em JSON, linha 2 com float16 em base64."""
    with open(caminho, encoding="utf-8") as arq:
        formas = json.loads(arq.readline())
        plano = np.frombuffer(base64.b64decode(arq.readline().strip()), dtype=np.float16).astype(np.float64)
    params, i = {}, 0
    for chave, forma in formas:
        n = int(np.prod(forma))
        params[chave] = plano[i:i + n].reshape(forma).copy()
        i += n
    return params
```
```text path=pesos_gpt.txt
[["tok", [29, 32]], ["pos", [16, 32]], ["b0.ln1_g", [32]], ["b0.ln1_b", [32]], ["b0.Wq", [32, 32]], ["b0.Wk", [32, 32]], ["b0.Wv", [32, 32]], ["b0.Wo", [32, 32]], ["b0.ln2_g", [32]], ["b0.ln2_b", [32]], ["b0.W1", [32, 128]], ["b0.c1", [128]], ["b0.W2", [128, 32]], ["b0.c2", [32]], ["lnf_g", [32]], ["lnf_b", [32]], ["Ws", [32, 29]]]
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
```

### Dicas

1. `ids[-T:]` devolve os últimos `T` itens, ou a lista inteira se ela for menor.
2. A temperatura age nos logits, antes da softmax. Dividir probabilidades por `t` e renormalizar não muda nada.
3. Um texto de comprimento `c` tem `c - 2` trigramas (nenhum, se `c < 3`).

### Verificação

```json
[
  {"id": "tamanho-e-prefixo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_tab = np.random.default_rng(51).normal(0.0, 1.5, (6, 6))\n_cic = np.zeros((6, 6))\n_cic[np.arange(6), (np.arange(6) + 1) % 6] = 3.0\n_p = {\"pos\": np.zeros((4, 2)), \"tab\": _tab}\n_pc = {\"pos\": np.zeros((4, 2)), \"tab\": _cic}\n_vistos = []\ndef _fw(p, X):\n    _vistos.append(np.array(X).copy())\n    if X.shape[1] > p[\"pos\"].shape[0]:\n        raise ValueError(\"contexto maior que T\")\n    return p[\"tab\"][X], None\n_ciclo = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]\n_e = [1, 2]\n_r = gerar(_p, _e, 10, 1.0, None, 0, _fw)", "expr": "[type(_r) is list, len(_r), _r[:2], all(type(i) is int and 0 <= i < 6 for i in _r), _e]", "expected": [true, 12, [1, 2], true, [1, 2]], "name": "Devolve uma lista de int com os 2 ids iniciais mais 10 novos, sem alterar a lista recebida"},
  {"id": "amostra", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_tab = np.random.default_rng(51).normal(0.0, 1.5, (6, 6))\n_cic = np.zeros((6, 6))\n_cic[np.arange(6), (np.arange(6) + 1) % 6] = 3.0\n_p = {\"pos\": np.zeros((4, 2)), \"tab\": _tab}\n_pc = {\"pos\": np.zeros((4, 2)), \"tab\": _cic}\n_vistos = []\ndef _fw(p, X):\n    _vistos.append(np.array(X).copy())\n    if X.shape[1] > p[\"pos\"].shape[0]:\n        raise ValueError(\"contexto maior que T\")\n    return p[\"tab\"][X], None\n_ciclo = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]\n", "expr": "gerar(_p, [1], 12, 1.0, None, 3, _fw)", "expected": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], "name": "Amostra de 12 tokens de um modelo de tabela, com semente 3", "hint": "Um gerador para a geração inteira e um rng.choice(len(probs), p=probs) por token, com os logits da última posição."},
  {"id": "guloso", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_tab = np.random.default_rng(51).normal(0.0, 1.5, (6, 6))\n_cic = np.zeros((6, 6))\n_cic[np.arange(6), (np.arange(6) + 1) % 6] = 3.0\n_p = {\"pos\": np.zeros((4, 2)), \"tab\": _tab}\n_pc = {\"pos\": np.zeros((4, 2)), \"tab\": _cic}\n_vistos = []\ndef _fw(p, X):\n    _vistos.append(np.array(X).copy())\n    if X.shape[1] > p[\"pos\"].shape[0]:\n        raise ValueError(\"contexto maior que T\")\n    return p[\"tab\"][X], None\n_ciclo = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]\n", "expr": "[gerar(_pc, [0], 12, 0, None, 0, _fw) == _ciclo, gerar(_pc, [0], 12, 0, None, 9, _fw) == _ciclo]", "expected": [true, true], "name": "Com temperatura 0, o texto segue o argmax e não depende da semente"},
  {"id": "semente", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_tab = np.random.default_rng(51).normal(0.0, 1.5, (6, 6))\n_cic = np.zeros((6, 6))\n_cic[np.arange(6), (np.arange(6) + 1) % 6] = 3.0\n_p = {\"pos\": np.zeros((4, 2)), \"tab\": _tab}\n_pc = {\"pos\": np.zeros((4, 2)), \"tab\": _cic}\n_vistos = []\ndef _fw(p, X):\n    _vistos.append(np.array(X).copy())\n    if X.shape[1] > p[\"pos\"].shape[0]:\n        raise ValueError(\"contexto maior que T\")\n    return p[\"tab\"][X], None\n_ciclo = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]\n", "expr": "[gerar(_p, [1], 20, 1.0, None, 5, _fw) == gerar(_p, [1], 20, 1.0, None, 5, _fw), gerar(_p, [1], 20, 1.0, None, 5, _fw) != gerar(_p, [1], 20, 1.0, None, 6, _fw)]", "expected": [true, true], "name": "Mesma semente, mesmo texto; outra semente, outro texto"},
  {"id": "contexto-cortado", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_tab = np.random.default_rng(51).normal(0.0, 1.5, (6, 6))\n_cic = np.zeros((6, 6))\n_cic[np.arange(6), (np.arange(6) + 1) % 6] = 3.0\n_p = {\"pos\": np.zeros((4, 2)), \"tab\": _tab}\n_pc = {\"pos\": np.zeros((4, 2)), \"tab\": _cic}\n_vistos = []\ndef _fw(p, X):\n    _vistos.append(np.array(X).copy())\n    if X.shape[1] > p[\"pos\"].shape[0]:\n        raise ValueError(\"contexto maior que T\")\n    return p[\"tab\"][X], None\n_ciclo = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]\n_r = gerar(_p, [1, 2], 10, 1.0, None, 0, _fw)", "expr": "[max(x.shape[1] for x in _vistos), list(_vistos[0].shape), _vistos[-1][0].tolist() == _r[-5:-1]]", "expected": [4, [1, 2], true], "name": "O contexto nunca passa de T = 4 e é sempre o fim do texto", "hint": "Passe ao forward só os últimos T ids, como um lote de 1."},
  {"id": "temperatura-baixa", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_tab = np.random.default_rng(51).normal(0.0, 1.5, (6, 6))\n_cic = np.zeros((6, 6))\n_cic[np.arange(6), (np.arange(6) + 1) % 6] = 3.0\n_p = {\"pos\": np.zeros((4, 2)), \"tab\": _tab}\n_pc = {\"pos\": np.zeros((4, 2)), \"tab\": _cic}\n_vistos = []\ndef _fw(p, X):\n    _vistos.append(np.array(X).copy())\n    if X.shape[1] > p[\"pos\"].shape[0]:\n        raise ValueError(\"contexto maior que T\")\n    return p[\"tab\"][X], None\n_ciclo = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]\n", "expr": "gerar(_pc, [0], 12, 0.05, None, 7, _fw) == _ciclo", "expected": true, "name": "Com temperatura 0,05, a amostra coincide com o guloso", "hint": "A temperatura divide os logits antes da softmax."},
  {"id": "temperatura-alta", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_tab = np.random.default_rng(51).normal(0.0, 1.5, (6, 6))\n_cic = np.zeros((6, 6))\n_cic[np.arange(6), (np.arange(6) + 1) % 6] = 3.0\n_p = {\"pos\": np.zeros((4, 2)), \"tab\": _tab}\n_pc = {\"pos\": np.zeros((4, 2)), \"tab\": _cic}\n_vistos = []\ndef _fw(p, X):\n    _vistos.append(np.array(X).copy())\n    if X.shape[1] > p[\"pos\"].shape[0]:\n        raise ValueError(\"contexto maior que T\")\n    return p[\"tab\"][X], None\n_ciclo = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]\n_r = gerar(_pc, [0], 300, 100.0, None, 1, _fw)\n_segue = sum(1 for a, b in zip(_r, _r[1:]) if b == (a + 1) % 6) / 300", "expr": "bool(_segue < 0.4)", "expected": true, "name": "Com temperatura 100, o token mais provável é escolhido em menos de 40 % das vezes", "hint": "Com temperatura positiva, o token é sorteado, não o argmax."},
  {"id": "top-k", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_tab = np.random.default_rng(51).normal(0.0, 1.5, (6, 6))\n_cic = np.zeros((6, 6))\n_cic[np.arange(6), (np.arange(6) + 1) % 6] = 3.0\n_p = {\"pos\": np.zeros((4, 2)), \"tab\": _tab}\n_pc = {\"pos\": np.zeros((4, 2)), \"tab\": _cic}\n_vistos = []\ndef _fw(p, X):\n    _vistos.append(np.array(X).copy())\n    if X.shape[1] > p[\"pos\"].shape[0]:\n        raise ValueError(\"contexto maior que T\")\n    return p[\"tab\"][X], None\n_ciclo = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]\n_r = gerar(_p, [1], 200, 5.0, 2, 2, _fw)\n_top2 = np.argsort(-_tab, axis=1, kind=\"stable\")[:, :2].tolist()", "expr": "[gerar(_pc, [0], 12, 1.0, 1, 4, _fw) == _ciclo, all(b in _top2[a] for a, b in zip(_r, _r[1:]))]", "expected": [true, true], "name": "Com k = 1 a amostra é o guloso; com k = 2, todo token está entre os 2 mais prováveis", "hint": "O top_k entra depois da temperatura e antes da softmax."},
  {"id": "gerador-da-semente", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_tab = np.random.default_rng(51).normal(0.0, 1.5, (6, 6))\n_cic = np.zeros((6, 6))\n_cic[np.arange(6), (np.arange(6) + 1) % 6] = 3.0\n_p = {\"pos\": np.zeros((4, 2)), \"tab\": _tab}\n_pc = {\"pos\": np.zeros((4, 2)), \"tab\": _cic}\n_vistos = []\ndef _fw(p, X):\n    _vistos.append(np.array(X).copy())\n    if X.shape[1] > p[\"pos\"].shape[0]:\n        raise ValueError(\"contexto maior que T\")\n    return p[\"tab\"][X], None\n_ciclo = [0, 1, 2, 3, 4, 5, 0, 1, 2, 3, 4, 5, 0]\nnp.random.seed(1)\n_a = gerar(_p, [1], 20, 1.0, None, 5, _fw)\nnp.random.seed(2)\n_b = gerar(_p, [1], 20, 1.0, None, 5, _fw)", "expr": "_a == _b", "expected": true, "name": "O sorteio usa o gerador criado com a semente, não o np.random global"},
  {"id": "pesos-guloso", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimport gpt\n_p = gpt.carregar_pesos(\"pesos_gpt.txt\")\n_ini = [VOCAB.index(c) for c in \"a \"]\n", "expr": "\"\".join(VOCAB[i] for i in gerar(_p, _ini, 44, 0, None, 0, gpt.forward))", "expected": "a ponte.\na moleira conserta o cesto na ponte.\n", "name": "Guloso com os pesos pré-treinados: o texto da leitura", "hint": "São 46 caracteres: o contexto passa de T = 16 e precisa ser cortado."},
  {"id": "pesos-amostra", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nimport gpt\n_p = gpt.carregar_pesos(\"pesos_gpt.txt\")\n_ini = [VOCAB.index(c) for c in \"a \"]\n_a = gerar(_p, _ini, 40, 0.8, 5, 3, gpt.forward)\n_b = gerar(_p, _ini, 40, 0.8, 5, 3, gpt.forward)", "expr": "[len(_a), _a == _b, all(0 <= i < 29 for i in _a)]", "expected": [42, true, true], "name": "Amostra com os pesos pré-treinados: 42 ids válidos, reprodutível"},
  {"id": "diversidade-exemplo", "checkpoint": 2, "kind": "call", "function": "diversidade", "args": [["abcabc"]], "expected": 0.75, "tolerance": 1e-12, "name": "\"abcabc\" tem 4 trigramas, 3 distintos: 0,75"},
  {"id": "diversidade-dois-textos", "checkpoint": 2, "kind": "call", "function": "diversidade", "args": [["abc", "abc", "abd"]], "expected": 0.6666666666666666, "tolerance": 1e-12, "name": "Três textos de 3 letras: 3 trigramas, 2 distintos", "hint": "Um trigrama não atravessa de um texto para o seguinte."},
  {"id": "diversidade-curtos", "checkpoint": 2, "kind": "expr", "expr": "[diversidade([]), diversidade([\"ab\", \"c\"]), diversidade([\"aaaa\"])]", "expected": [0.0, 0.0, 0.5], "tolerance": 1e-12, "name": "Sem trigramas, 0.0; \"aaaa\" tem 2 trigramas iguais"}
]
```

### Soluções erradas

```python name="temperatura aplicada depois da softmax"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            probs = probs / temperatura
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="contexto não cortado em T"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="np.random global no lugar do rng da semente"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(np.random.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="argmax com temperatura, ignora a amostragem"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(np.argmax(probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="top-k ignorado"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="contexto com os primeiros T tokens"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[:T]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="devolve só os tokens novos"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids[-n:]


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="gerador recriado a cada token"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        rng = np.random.default_rng(semente)
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="logits da primeira posição do contexto"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, 0]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="diversidade com trigramas atravessando textos"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    junto = "".join(textos)
    trigramas = [junto[i:i + 3] for i in range(len(junto) - 2)]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="diversidade contando caracteres"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [c for t in textos for c in t]
    if not trigramas:
        return 0.0
    return len(set(trigramas)) / len(trigramas)


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

```python name="diversidade sem dividir pelo total"
import numpy as np

import gpt

VOCAB = sorted("\n .abcdefghijlmnopqrstuvzàãçé")


def aplicar_temperatura(logits, t):
    return logits / t


def top_k(logits, k):
    ordem = np.argsort(-logits, kind="stable")
    mantidos = ordem[:k]
    filtrados = np.full(logits.shape, -np.inf)
    filtrados[mantidos] = logits[mantidos]
    return filtrados


def gerar(params, ids, n, temperatura, k, semente, forward):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        contexto = np.array([ids[-T:]])
        logits, _cache = forward(params, contexto)
        logits = logits[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = aplicar_temperatura(logits, temperatura)
            if k is not None:
                logits = top_k(logits, k)
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def diversidade(textos):
    trigramas = [t[i:i + 3] for t in textos for i in range(len(t) - 2)]
    if not trigramas:
        return 0.0
    return float(len(set(trigramas)))


if __name__ == "__main__":
    params = gpt.carregar_pesos("pesos_gpt.txt")
    inicio = [VOCAB.index(c) for c in "a "]
    for temperatura in (0, 0.5, 1.0):
        ids = gerar(params, inicio, 60, temperatura, None, 0, gpt.forward)
        print(temperatura, repr("".join(VOCAB[i] for i in ids)))
```

## Passo 8 · Quiz · Temperatura

### Pergunta

Os logits do próximo token são `[2, 1, 0]`. Com temperatura 1, a softmax dá `[0.665, 0.245, 0.09]`; com 0,5, `[0.867, 0.117, 0.016]`; com 2, `[0.506, 0.307, 0.186]`. Uma pessoa calcula a softmax primeiro, divide as probabilidades por 0,5 e renormaliza. O que ela obtém?

- [ ] `[0.867, 0.117, 0.016]`, o mesmo que dividir os logits
- [x] `[0.665, 0.245, 0.09]`: dividir todas as probabilidades pelo mesmo número e renormalizar devolve a distribuição original
- [ ] `[0.506, 0.307, 0.186]`, porque dividir probabilidades equivale a multiplicar a temperatura
- [ ] Um erro, porque as probabilidades passam de 1

> Dividir por 0,5 dobra todas as probabilidades, e a renormalização desfaz exatamente isso: a temperatura não teve efeito nenhum. Para mudar a forma da distribuição, a divisão precisa acontecer nos logits, antes da exponencial; não há equivalência com outra temperatura; e a renormalização impede qualquer erro de soma.

### Pergunta

Com os pesos pré-treinados da lição, a geração gulosa produz `a moleira conserta o cesto na ponte.` 80 vezes seguidas em 3 000 caracteres. A fração de trigramas distintos é 0,10 no guloso e 0,42 com temperatura 1,0. Por que o guloso repete?

- [ ] Porque o modelo decorou essa frase, que é a mais frequente do corpus
- [ ] Porque o guloso usa sempre a mesma semente
- [ ] Porque o contexto de 16 tokens é curto demais para o modelo aprender outras frases
- [x] Porque a escolha é determinística: quando o contexto volta a um estado já visto, a continuação é a mesma, e o texto entra num ciclo

> O argmax não tem sorteio, então o mesmo contexto leva sempre ao mesmo token, e depois de um fim de linha o modelo volta ao mesmo ponto. A frase repetida nem existe no corpus, então não foi decorada; o guloso não usa semente nenhuma; e com temperatura o mesmo modelo, com o mesmo contexto de 16, produz frases variadas.

### Pergunta

Com temperatura 0,5, o modelo gera `a tecelã conserta o cesto na ponte.`. A frase segue a gramática do corpus, mas não aparece nas 1 500 frases de treino. Uma leitora pergunta se a tecelã "realmente" consertou o cesto. Qual é a resposta correta sobre o que o modelo fez?

- [ ] O modelo consultou as frases de treino e combinou duas delas, então a afirmação é verdadeira em parte
- [ ] O modelo errou, e um treino mais longo eliminaria frases que não estão no corpus
- [x] O modelo produziu a continuação mais plausível caractere a caractere; ele não guarda nem consulta uma lista de fatos, e uma frase inventada sai com a mesma fluência de uma frase do treino
- [ ] O modelo só gera frases que viu, então a frase está no corpus e a busca falhou

> A geração é um sorteio da distribuição de próximo token, que mede plausibilidade local e nada mais; nenhuma etapa verifica se a frase foi vista. Não há consulta ao corpus durante a geração; treinar mais deixa o modelo melhor na gramática, o que produz ainda mais frases novas e bem formadas, não menos; e gerar combinações inéditas é o comportamento normal de um modelo de linguagem.
