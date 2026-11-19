---
slug: n7-m3-02-busca-knn-em-numpy
titulo: Busca por vizinhos mais próximos em numpy
descricao: Busca exata por força bruta vetorizada, top-k com argpartition, busca em lote, filtros por metadados e o custo em função do número de documentos.
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
- Implementar busca exata vetorizada com top-k eficiente (argpartition)
- Combinar busca vetorial com filtros por metadados
- Medir o custo da busca exata e estimar quando um índice aproximado é necessário
---

## Passo 1 · Leitura · Força bruta vetorizada e o seu custo

Na lição anterior os documentos viraram linhas normalizadas de uma matriz $E$ ($N \times d$) e a consulta virou um vetor unitário $q$. A busca **exata** dos $k$ vizinhos mais próximos (*kNN*, de *k nearest neighbors*) compara $q$ com **todos** os documentos e fica com os $k$ maiores cossenos. É força bruta, e em numpy ela é uma linha:

```python
import numpy as np

# laço em Python: um produto interno por documento, interpretado linha a linha
scores = np.array([float(E[i] @ q) for i in range(len(E))])

# vetorizado: um único produto matriz-vetor, feito em código compilado
scores = E @ q                  # forma (N,)

# lote de M consultas (Q tem forma M x d)
S = Q @ E.T                     # forma (M, N): linha j = scores da consulta j
```

As duas versões fazem as mesmas contas, mas a vetorizada costuma ser dezenas de vezes mais rápida, porque o laço passa pelo interpretador a cada documento e o produto de matrizes roda em rotinas compiladas que usam vários números por instrução. Com um lote de consultas o ganho é maior, porque cada linha de $E$ lida da memória serve às $M$ consultas.

#### Quanto custa

Cada produto interno em dimensão $d$ faz $d$ multiplicações e $d$ somas, e a busca exata faz um por documento:

$$
\text{FLOPs} = 2 \cdot N \cdot d, \qquad T_{\text{ms}} = \frac{2 \cdot N \cdot d}{G \cdot 10^9} \cdot 10^3
$$

onde $G$ é quantos bilhões de operações de ponto flutuante por segundo a máquina sustenta. O custo é $O(N \cdot d)$: dobrar a base dobra o tempo de **cada** consulta.

A memória também conta. O índice inteiro fica na RAM: $N \cdot d$ números. Em `float32` são 4 bytes por número; o padrão do numpy é `float64`, com 8.

Um exemplo com números redondos e uma máquina hipotética de 20 GFLOP/s: um milhão de trechos em dimensão 768 dão $1{,}5 \cdot 10^9$ operações, cerca de 77 ms por consulta, e 3 GB em `float32`. Com 10 consultas por segundo, a busca ocupa 0,77 s de CPU a cada segundo. Para 3 000 trechos, a mesma conta dá 0,2 ms. É essa conta, e não a moda, que diz quando a busca exata deixa de servir (lição 03).

## Passo 2 · Previsão · argsort, argpartition e empates

Os scores abaixo têm um empate em `0.90`. O programa usa `kind="stable"`, que mantém a ordem original entre valores iguais. Leia sem executar e digite o que ele imprime.

### Código
```python
import numpy as np

scores = np.array([0.30, 0.90, 0.75, 0.90, 0.10])

print(np.argsort(scores, kind="stable")[:2].tolist())
print(np.argsort(scores, kind="stable")[::-1][:2].tolist())
print(np.argsort(-scores, kind="stable")[:2].tolist())

parte = np.argpartition(-scores, 2)[:3]
print(sorted(parte.tolist()))
```

### Dicas
1. `argsort` devolve os **índices** em ordem crescente de valor.
2. Inverter com `[::-1]` inverte também a ordem dos dois índices empatados.
3. `argpartition(-scores, 2)` garante que as 3 primeiras posições são os índices dos 3 maiores scores, em alguma ordem: por isso o programa ordena os índices antes de imprimir.

### Saída esperada
```text
[4, 0]
[3, 1]
[1, 3]
[1, 2, 3]
```

## Passo 3 · Leitura · Top-k em tempo linear, com empates resolvidos

A busca não quer a ordem dos $N$ scores, só os $k$ maiores. Ordenar tudo com `argsort` custa $O(N \log N)$. O `np.argpartition` faz o que o **quickselect** do Nível 3 faz: em tempo linear, coloca na posição $k-1$ o elemento que estaria lá se o vetor fosse ordenado, com todos os menores antes e os maiores depois, **sem ordenar cada lado**. Depois, basta ordenar os $k$ escolhidos:

$$
O(N) + O(k \log k) \quad \text{em vez de} \quad O(N \log N)
$$

Com $N = 10^6$ e $k = 5$, a diferença é jogar fora o trabalho de ordenar quase um milhão de scores que ninguém vai ver. (O `heapq.nlargest` do Nível 3, em $O(N \log k)$, também serve, mas trabalha com objetos Python, um por vez.)

Dois cuidados que a Previsão mostrou:

- **Direção.** `np.argsort(scores)[:k]` pega os $k$ **menores**. Para os maiores, ordene `-scores`.
- **Empates.** `np.argsort` sem `kind="stable"` não promete nada sobre a ordem dos iguais, e `[::-1]` inverte a ordem deles. Um sistema de busca precisa de uma regra, senão a mesma consulta pode devolver resultados em ordens diferentes depois de uma reindexação, e testes automáticos ficam instáveis. A regra deste módulo: **no empate, vence o menor índice**.

O empate mais traiçoeiro é na fronteira. Com scores `[0.5, 0.9, 0.5, 0.5]` e $k = 2$, três documentos empatam no segundo lugar, e o `argpartition` escolhe qualquer um deles. Para aplicar a regra, descubra o score do $k$-ésimo colocado, pegue **todos** os que têm score maior ou igual a ele, ordene esses de forma estável e corte em $k$:

```python
limiar = s[np.argpartition(-s, k - 1)[k - 1]]   # score do k-ésimo maior
candidatos = np.flatnonzero(s >= limiar)        # todos os que alcançam esse score
```

Os candidatos são $k$ mais os empatados na fronteira, em geral um punhado: o custo continua $O(N)$.

## Passo 4 · Exercício · top_k com desempate
modo: ordenar

Monte `top_k(scores, k)`, que devolve a lista dos índices dos `k` maiores scores, do maior para o menor, com empates resolvidos pelo **menor índice**. Se `k` passar do tamanho do vetor, devolve todos os índices; se `k <= 0` ou o vetor for vazio, devolve `[]`. Duas linhas estão sobrando.

### Instruções
1. Limite `k` ao tamanho do vetor e trate `k <= 0`.
2. Ache o score do `k`-ésimo maior com `argpartition` e junte todos os índices com score maior ou igual a ele.
3. Ordene esses candidatos do maior para o menor score, de forma estável, e devolva os `k` primeiros.

### Solução
```python
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()
```

### Distratores
```python
    limiar = s[np.argpartition(-s, k)[k]]
    ordem = candidatos[np.argsort(s[candidatos], kind="stable")]
```

### Dicas
1. `argpartition(-s, k - 1)` põe na posição `k - 1` o índice do `k`-ésimo maior (contando do zero).
2. `np.flatnonzero(mascara)` devolve os índices onde a máscara é verdadeira, em ordem crescente.
3. Ordenar `-s[candidatos]` deixa o maior score primeiro; `kind="stable"` preserva a ordem crescente de índice entre os empatados.

### Verificação
```json
[
  { "id": "basico", "checkpoint": 3, "kind": "call", "function": "top_k", "args": [[0.2, 0.95, 0.1, 0.7, 0.85, 0.4], 3],
    "expected": [1, 4, 3], "name": "Os 3 maiores, do maior para o menor" },
  { "id": "negativos", "checkpoint": 3, "kind": "call", "function": "top_k", "args": [[-0.5, -0.1, -0.9, -0.3], 2],
    "expected": [1, 3], "name": "Funciona com scores negativos (cosseno vai de -1 a 1)" },
  { "id": "empate-dentro", "checkpoint": 3, "kind": "call", "function": "top_k", "args": [[0.3, 0.8, 0.8, 0.1], 2],
    "expected": [1, 2], "name": "Empate entre os escolhidos: o menor índice primeiro",
    "hint": "Inverter um argsort crescente também inverte os empates." },
  { "id": "empate-fronteira", "checkpoint": 2, "kind": "call", "function": "top_k", "args": [[0.5, 0.9, 0.5, 0.5, 0.1, 0.5], 2],
    "expected": [1, 0], "name": "Empate na fronteira do corte: vence o menor índice",
    "hint": "Pegue todos os que alcançam o score do k-ésimo, não só os k que o argpartition escolheu." },
  { "id": "empate-fronteira-2", "checkpoint": 2, "kind": "call", "function": "top_k", "args": [[0.2, 0.7, 0.7, 0.9, 0.7, 0.7, 0.7, 0.7], 3],
    "expected": [3, 1, 2], "name": "Vários empatados na fronteira" },
  { "id": "empate-fronteira-longo", "checkpoint": 2, "kind": "expr", "setup": "v = [0.5] * 30 + [0.9]",
    "expr": "top_k(v, 3)", "expected": [30, 0, 1], "name": "31 scores, 30 empatados: os de menor índice completam o top-3",
    "hint": "O argpartition escolhe qualquer um dos empatados." },
  { "id": "empate-alternado", "checkpoint": 2, "kind": "expr", "setup": "v = [0.2, 0.5] * 15",
    "expr": "top_k(v, 4)", "expected": [1, 3, 5, 7], "name": "Scores alternados: os 4 primeiros 0.5 da lista" },
  { "id": "k-grande", "checkpoint": 1, "kind": "call", "function": "top_k", "args": [[0.3, 0.9, 0.5], 10],
    "expected": [1, 2, 0], "name": "k maior que o vetor devolve todos, em ordem" },
  { "id": "vazio", "checkpoint": 1, "kind": "expr", "expr": "[top_k([1.0, 2.0], 0), top_k([], 3)]",
    "expected": [[], []], "name": "k = 0 ou vetor vazio devolvem []" },
  { "id": "grande", "checkpoint": 3, "kind": "expr", "setup": "v = [(i * 37) % 1000 for i in range(1000)]",
    "expr": "top_k(v, 5) == sorted(range(1000), key=lambda i: -v[i])[:5]", "expected": true,
    "name": "Com 1000 scores, os 5 maiores em ordem" }
]
```

### Soluções erradas
```python name="pega os k menores"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    return np.argsort(s, kind="stable")[:k].tolist()
```
```python name="argpartition sem ordenar os k"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    return sorted(np.argpartition(-s, k - 1)[:k].tolist())
```
```python name="inverte o argsort crescente"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    return np.argsort(s, kind="stable")[::-1][:k].tolist()
```
```python name="ignora o empate na fronteira"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    idx = np.argpartition(-s, k - 1)[:k]
    return idx[np.argsort(-s[idx], kind="stable")].tolist()
```
```python name="k maior que o vetor quebra o argpartition"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    if k <= 0 or len(s) == 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()
```

## Passo 5 · Exercício · Busca em lote e quanto ela custa

O serviço de busca da secretaria recebe várias perguntas ao mesmo tempo. Escreva duas funções:

1. `buscar_em_lote(E, Q, k)`: `E` tem uma linha por documento ($N \times d$) e `Q` uma linha por consulta ($M \times d$). **Não suponha que as linhas chegam normalizadas.** Devolva uma lista com $M$ listas: a lista $j$ traz os índices dos `k` documentos de maior cosseno com a consulta $j$, na regra de `top_k` (já pronta no código inicial). Calcule todos os scores com **um** produto de matrizes.
2. `estimar_busca_exata(n_docs, dim, gflops, consultas_por_segundo, bytes_por_valor=4)`: devolve um dicionário com
   - `"ms_por_consulta"`: $\frac{2 \cdot N \cdot d}{G \cdot 10^9} \cdot 10^3$;
   - `"memoria_mb"`: $N \cdot d \cdot \text{bytes\_por\_valor} / 10^6$ (megabytes decimais);
   - `"nucleos"`: quantos núcleos de CPU ficam ocupados só com a busca, `ms_por_consulta * consultas_por_segundo / 1000`. Acima de 1, um núcleo não dá conta da carga.

Exemplo: `estimar_busca_exata(1_000_000, 768, 20, 10)` devolve `{"ms_por_consulta": 76.8, "memoria_mb": 3072.0, "nucleos": 0.768}` (valores de ponto flutuante podem diferir na última casa).

### Instruções
1. Normalize `E` e `Q` por linha, com o vetor nulo continuando nulo.
2. Calcule a matriz de scores com forma $M \times N$ e aplique `top_k` a cada linha.
3. Calcule o tempo por consulta em milissegundos, contando 2 operações por coordenada.
4. Calcule a memória em megabytes e os núcleos ocupados.

### Código inicial
```python
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def buscar_em_lote(E, Q, k):
    pass


def estimar_busca_exata(n_docs, dim, gflops, consultas_por_segundo, bytes_por_valor=4):
    pass


if __name__ == "__main__":
    base = [[1.0, 0.0], [0.0, 1.0], [0.8, 0.6]]
    print(buscar_em_lote(base, [[1.0, 0.0], [0.0, 2.0]], 2))
    print(estimar_busca_exata(1_000_000, 768, 20, 10))
```

### Solução
```python
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar_linhas(matriz):
    arr = np.asarray(matriz, dtype=float)
    normas = np.linalg.norm(arr, axis=1, keepdims=True)
    return arr / np.where(normas == 0, 1.0, normas)


def buscar_em_lote(E, Q, k):
    S = normalizar_linhas(Q) @ normalizar_linhas(E).T
    return [top_k(linha, k) for linha in S]


def estimar_busca_exata(n_docs, dim, gflops, consultas_por_segundo, bytes_por_valor=4):
    ms = 2 * n_docs * dim / (gflops * 1e9) * 1000
    return {
        "ms_por_consulta": ms,
        "memoria_mb": n_docs * dim * bytes_por_valor / 1e6,
        "nucleos": ms * consultas_por_segundo / 1000,
    }


if __name__ == "__main__":
    base = [[1.0, 0.0], [0.0, 1.0], [0.8, 0.6]]
    print(buscar_em_lote(base, [[1.0, 0.0], [0.0, 2.0]], 2))
    print(estimar_busca_exata(1_000_000, 768, 20, 10))
```

### Dicas
1. Se `Q` é $M \times d$ e `E` é $N \times d$, `Q @ E.T` é $M \times N$: uma linha por consulta.
2. Os documentos podem ter comprimentos diferentes: sem normalizar, o mais comprido ganha.
3. GFLOP/s é $10^9$ operações por segundo, e um segundo tem 1000 ms.

### Verificação
```json
[
  { "id": "lote", "checkpoint": 2, "kind": "call", "function": "buscar_em_lote",
    "args": [[[1.0, 0.0], [0.0, 1.0], [0.8, 0.6]], [[1.0, 0.0], [0.0, 1.0]], 2], "expected": [[0, 2], [1, 2]],
    "name": "Duas consultas, duas listas de top-2" },
  { "id": "forma", "checkpoint": 2, "kind": "call", "function": "buscar_em_lote",
    "args": [[[1.0, 0.0], [0.0, 1.0], [0.8, 0.6]], [[0.6, 0.8]], 2], "expected": [[2, 1]],
    "name": "Uma consulta e três documentos dão uma lista só",
    "hint": "O resultado tem uma lista por consulta, não por documento." },
  { "id": "normaliza-docs", "checkpoint": 1, "kind": "call", "function": "buscar_em_lote",
    "args": [[[10.0, 0.0], [1.0, 1.0]], [[1.0, 1.0]], 1], "expected": [[1]],
    "name": "O documento comprido não ganha só pelo comprimento",
    "hint": "As linhas de E podem não estar normalizadas." },
  { "id": "nulo", "checkpoint": 1, "kind": "call", "function": "buscar_em_lote",
    "args": [[[0.0, 0.0], [-1.0, 0.0], [0.0, 1.0]], [[1.0, 0.0], [0.0, 0.0]], 2], "expected": [[0, 2], [0, 1]],
    "name": "Vetores nulos (documento ou consulta) têm score 0, sem nan" },
  { "id": "empate", "checkpoint": 2, "kind": "call", "function": "buscar_em_lote",
    "args": [[[0.0, 1.0], [2.0, 0.0], [1.0, 0.0]], [[3.0, 0.0]], 2], "expected": [[1, 2]],
    "name": "Empate no score: menor índice primeiro" },
  { "id": "estimativa-milhao", "checkpoint": 3, "kind": "call", "function": "estimar_busca_exata",
    "args": [1000000, 768, 20, 10], "expected": { "ms_por_consulta": 76.8, "memoria_mb": 3072.0, "nucleos": 0.768 }, "tolerance": 1e-6,
    "name": "Um milhão de trechos em dimensão 768 a 20 GFLOP/s, 10 consultas por segundo" },
  { "id": "estimativa-pequena", "checkpoint": 4, "kind": "call", "function": "estimar_busca_exata",
    "args": [50000, 384, 10, 500], "expected": { "ms_por_consulta": 3.84, "memoria_mb": 76.8, "nucleos": 1.92 }, "tolerance": 1e-6,
    "name": "50 mil trechos e 500 consultas por segundo já ocupam quase 2 núcleos" },
  { "id": "estimativa-float64", "checkpoint": 4, "kind": "call", "function": "estimar_busca_exata",
    "args": [100000, 1024, 50, 100], "kwargs": { "bytes_por_valor": 8 },
    "expected": { "ms_por_consulta": 4.096, "memoria_mb": 819.2, "nucleos": 0.4096 }, "tolerance": 1e-6,
    "name": "Em float64 (8 bytes) a memória dobra",
    "hint": "Use o bytes_por_valor recebido." }
]
```

### Soluções erradas
```python name="E @ Q.T: uma lista por documento"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar_linhas(matriz):
    arr = np.asarray(matriz, dtype=float)
    normas = np.linalg.norm(arr, axis=1, keepdims=True)
    return arr / np.where(normas == 0, 1.0, normas)


def buscar_em_lote(E, Q, k):
    S = normalizar_linhas(E) @ normalizar_linhas(Q).T
    return [top_k(linha, k) for linha in S]


def estimar_busca_exata(n_docs, dim, gflops, consultas_por_segundo, bytes_por_valor=4):
    ms = 2 * n_docs * dim / (gflops * 1e9) * 1000
    return {
        "ms_por_consulta": ms,
        "memoria_mb": n_docs * dim * bytes_por_valor / 1e6,
        "nucleos": ms * consultas_por_segundo / 1000,
    }
```
```python name="supõe linhas já normalizadas"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def buscar_em_lote(E, Q, k):
    S = np.asarray(Q, dtype=float) @ np.asarray(E, dtype=float).T
    return [top_k(linha, k) for linha in S]


def estimar_busca_exata(n_docs, dim, gflops, consultas_por_segundo, bytes_por_valor=4):
    ms = 2 * n_docs * dim / (gflops * 1e9) * 1000
    return {
        "ms_por_consulta": ms,
        "memoria_mb": n_docs * dim * bytes_por_valor / 1e6,
        "nucleos": ms * consultas_por_segundo / 1000,
    }
```
```python name="esquece as somas (só d operações)"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar_linhas(matriz):
    arr = np.asarray(matriz, dtype=float)
    normas = np.linalg.norm(arr, axis=1, keepdims=True)
    return arr / np.where(normas == 0, 1.0, normas)


def buscar_em_lote(E, Q, k):
    S = normalizar_linhas(Q) @ normalizar_linhas(E).T
    return [top_k(linha, k) for linha in S]


def estimar_busca_exata(n_docs, dim, gflops, consultas_por_segundo, bytes_por_valor=4):
    ms = n_docs * dim / (gflops * 1e9) * 1000
    return {
        "ms_por_consulta": ms,
        "memoria_mb": n_docs * dim * bytes_por_valor / 1e6,
        "nucleos": ms * consultas_por_segundo / 1000,
    }
```
```python name="tempo em segundos"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar_linhas(matriz):
    arr = np.asarray(matriz, dtype=float)
    normas = np.linalg.norm(arr, axis=1, keepdims=True)
    return arr / np.where(normas == 0, 1.0, normas)


def buscar_em_lote(E, Q, k):
    S = normalizar_linhas(Q) @ normalizar_linhas(E).T
    return [top_k(linha, k) for linha in S]


def estimar_busca_exata(n_docs, dim, gflops, consultas_por_segundo, bytes_por_valor=4):
    ms = 2 * n_docs * dim / (gflops * 1e9)
    return {
        "ms_por_consulta": ms,
        "memoria_mb": n_docs * dim * bytes_por_valor / 1e6,
        "nucleos": ms * consultas_por_segundo / 1000,
    }
```
```python name="memória com 4 bytes fixos e MiB"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar_linhas(matriz):
    arr = np.asarray(matriz, dtype=float)
    normas = np.linalg.norm(arr, axis=1, keepdims=True)
    return arr / np.where(normas == 0, 1.0, normas)


def buscar_em_lote(E, Q, k):
    S = normalizar_linhas(Q) @ normalizar_linhas(E).T
    return [top_k(linha, k) for linha in S]


def estimar_busca_exata(n_docs, dim, gflops, consultas_por_segundo, bytes_por_valor=4):
    ms = 2 * n_docs * dim / (gflops * 1e9) * 1000
    return {
        "ms_por_consulta": ms,
        "memoria_mb": n_docs * dim * 4 / 1024 ** 2,
        "nucleos": ms * consultas_por_segundo / 1000,
    }
```

## Passo 6 · Exercício · Índice exato com filtro de metadados

Um trecho do regimento não é só um vetor: ele tem metadados, como `{"curso": "grad", "ano": 2026, "fonte": "regimento.md"}`. Pedidos como "só documentos da pós-graduação" combinam busca vetorial com **filtro**, e há duas formas de fazer isso:

- **Pós-filtro:** pega os top-$k$ do índice inteiro e depois descarta os que não passam no filtro. Se a pós-graduação tem 2 % dos trechos, os 5 melhores do índice inteiro provavelmente são todos da graduação, e a busca devolve **zero** resultados, mesmo havendo dezenas de trechos da pós.
- **Pré-filtro:** primeiro uma máscara escolhe os documentos que passam no filtro; o top-$k$ roda só entre eles. Sempre devolve até $k$ resultados válidos.

Na busca exata, pré-filtrar é simples e barato. (Nos índices aproximados da próxima lição o problema volta, porque eles não olham todos os documentos.)

Escreva a classe `IndiceExato`:

- `adicionar(vetor, metadados)` normaliza o vetor (o vetor nulo continua nulo), guarda **uma cópia** dos metadados e devolve o id do documento: 0, 1, 2…
- `buscar(consulta, k=3, filtro=None)` considera só os documentos cujos metadados têm `metadados.get(chave) == valor` para **todas** as chaves do `filtro` (`None` ou `{}` = todos) e devolve os `k` melhores pela regra de `top_k`, como `[{"id": int, "score": round(cosseno, 4), "metadados": dict}]`. Nenhum documento passou no filtro: `[]`.

### Instruções
1. Em `adicionar`, normalize o vetor, guarde uma cópia dos metadados e devolva o id sequencial.
2. Em `buscar`, filtre os ids **antes** de escolher os `k` melhores, exigindo todas as chaves do filtro.
3. Pontue só os filtrados contra a consulta normalizada e devolva os resultados no formato pedido, com o id global de cada documento.

### Código inicial
```python
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


class IndiceExato:
    def __init__(self):
        pass

    def adicionar(self, vetor, metadados):
        pass

    def buscar(self, consulta, k=3, filtro=None):
        pass


if __name__ == "__main__":
    indice = IndiceExato()
    indice.adicionar([1.0, 0.0], {"curso": "pos", "titulo": "Regimento da pós"})
    indice.adicionar([0.9, 0.1], {"curso": "pos", "titulo": "Bolsas da pós"})
    indice.adicionar([0.8, 0.6], {"curso": "grad", "titulo": "Matrícula na graduação"})
    print(indice.buscar([1.0, 0.0], k=2, filtro={"curso": "grad"}))
```

### Solução
```python
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar(vetor):
    v = np.asarray(vetor, dtype=float)
    norma = np.linalg.norm(v)
    return v / norma if norma > 0 else v


class IndiceExato:
    def __init__(self):
        self.vetores = []
        self.metadados = []

    def adicionar(self, vetor, metadados):
        self.vetores.append(normalizar(vetor))
        self.metadados.append(dict(metadados))
        return len(self.vetores) - 1

    def buscar(self, consulta, k=3, filtro=None):
        filtro = filtro or {}
        ids = [
            i for i, meta in enumerate(self.metadados)
            if all(meta.get(chave) == valor for chave, valor in filtro.items())
        ]
        if not ids:
            return []
        scores = np.vstack([self.vetores[i] for i in ids]) @ normalizar(consulta)
        return [
            {"id": ids[p], "score": round(float(scores[p]), 4), "metadados": dict(self.metadados[ids[p]])}
            for p in top_k(scores, k)
        ]


if __name__ == "__main__":
    indice = IndiceExato()
    indice.adicionar([1.0, 0.0], {"curso": "pos", "titulo": "Regimento da pós"})
    indice.adicionar([0.9, 0.1], {"curso": "pos", "titulo": "Bolsas da pós"})
    indice.adicionar([0.8, 0.6], {"curso": "grad", "titulo": "Matrícula na graduação"})
    print(indice.buscar([1.0, 0.0], k=2, filtro={"curso": "grad"}))
```

### Dicas
1. `top_k` devolve posições dentro da lista filtrada; o id do documento é `ids[posicao]`.
2. `dict(metadados)` cria uma cópia: se quem chamou alterar o dicionário depois, o índice não muda.
3. `all(...)` sobre os pares do filtro exige todas as chaves; um filtro vazio passa em todo documento.

### Verificação
```json
[
  { "id": "ids", "checkpoint": 1, "kind": "expr",
    "setup": "indice = IndiceExato()\nids = [indice.adicionar([1.0, 0.0], {}), indice.adicionar([0.0, 1.0], {}), indice.adicionar([1.0, 1.0], {})]",
    "expr": "ids", "expected": [0, 1, 2], "name": "adicionar devolve ids sequenciais a partir de 0" },
  { "id": "sem-filtro", "checkpoint": 3, "kind": "expr",
    "setup": "indice = IndiceExato()\nindice.adicionar([3.0, 4.0], {'tipo': 'A'})\nindice.adicionar([0.0, 5.0], {'tipo': 'B'})\nindice.adicionar([6.0, 8.0], {'tipo': 'A'})\nres = indice.buscar([3.0, 4.0], k=2)",
    "expr": "[[r['id'], r['score']] for r in res]", "expected": [[0, 1.0], [2, 1.0]], "tolerance": 1e-6,
    "name": "Sem filtro: mesma direção dá score 1, empate pelo menor id" },
  { "id": "normaliza", "checkpoint": 1, "kind": "expr",
    "setup": "indice = IndiceExato()\nindice.adicionar([10.0, 0.0], {})\nindice.adicionar([1.0, 1.0], {})\nres = indice.buscar([1.0, 1.0], k=1)",
    "expr": "[[r['id'], r['score']] for r in res]", "expected": [[1, 1.0]], "tolerance": 1e-6,
    "name": "Os documentos são normalizados ao adicionar",
    "hint": "Sem normalizar, o vetor mais comprido ganha." },
  { "id": "pre-filtro", "checkpoint": 2, "kind": "expr",
    "setup": "indice = IndiceExato()\nindice.adicionar([1.0, 0.0], {'curso': 'pos'})\nindice.adicionar([0.99, 0.01], {'curso': 'pos'})\nindice.adicionar([0.98, 0.02], {'curso': 'pos'})\nindice.adicionar([0.6, 0.8], {'curso': 'grad'})\nindice.adicionar([0.8, 0.6], {'curso': 'grad'})\nres = indice.buscar([1.0, 0.0], k=2, filtro={'curso': 'grad'})",
    "expr": "[[r['id'], r['score']] for r in res]", "expected": [[4, 0.8], [3, 0.6]], "tolerance": 1e-6,
    "name": "O filtro acha os documentos da categoria mesmo fora do top-k geral",
    "hint": "Filtre antes de escolher os k melhores." },
  { "id": "todas-as-chaves", "checkpoint": 2, "kind": "expr",
    "setup": "indice = IndiceExato()\nindice.adicionar([1.0, 0.0], {'curso': 'grad', 'ano': 2025})\nindice.adicionar([0.9, 0.1], {'curso': 'grad', 'ano': 2026})\nindice.adicionar([1.0, 0.0], {'curso': 'pos', 'ano': 2026})\nres = indice.buscar([1.0, 0.0], k=3, filtro={'curso': 'grad', 'ano': 2026})",
    "expr": "[r['id'] for r in res]", "expected": [1], "name": "O filtro exige todas as chaves" },
  { "id": "nenhum", "checkpoint": 2, "kind": "expr",
    "setup": "indice = IndiceExato()\nindice.adicionar([1.0, 0.0], {'curso': 'grad'})",
    "expr": "[indice.buscar([1.0, 0.0], filtro={'curso': 'pos'}), IndiceExato().buscar([1.0, 0.0])]", "expected": [[], []],
    "name": "Nenhum documento passa no filtro, ou índice vazio: []" },
  { "id": "copia", "checkpoint": 1, "kind": "expr",
    "setup": "indice = IndiceExato()\nmeta = {'curso': 'pos', 'titulo': 'Bolsas'}\nindice.adicionar([1.0, 0.0], meta)\nmeta['curso'] = 'grad'\nres = indice.buscar([1.0, 0.0], filtro={'curso': 'pos'})",
    "expr": "[r['metadados'] for r in res]", "expected": [{ "curso": "pos", "titulo": "Bolsas" }],
    "name": "Mudar o dicionário depois de adicionar não muda o índice",
    "hint": "Guarde uma cópia dos metadados." }
]
```

### Soluções erradas
```python name="pós-filtro depois do top-k geral"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar(vetor):
    v = np.asarray(vetor, dtype=float)
    norma = np.linalg.norm(v)
    return v / norma if norma > 0 else v


class IndiceExato:
    def __init__(self):
        self.vetores = []
        self.metadados = []

    def adicionar(self, vetor, metadados):
        self.vetores.append(normalizar(vetor))
        self.metadados.append(dict(metadados))
        return len(self.vetores) - 1

    def buscar(self, consulta, k=3, filtro=None):
        filtro = filtro or {}
        if not self.vetores:
            return []
        scores = np.vstack(self.vetores) @ normalizar(consulta)
        resultado = []
        for i in top_k(scores, k):
            meta = self.metadados[i]
            if all(meta.get(chave) == valor for chave, valor in filtro.items()):
                resultado.append({"id": i, "score": round(float(scores[i]), 4), "metadados": dict(meta)})
        return resultado
```
```python name="guarda o vetor sem normalizar"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar(vetor):
    v = np.asarray(vetor, dtype=float)
    norma = np.linalg.norm(v)
    return v / norma if norma > 0 else v


class IndiceExato:
    def __init__(self):
        self.vetores = []
        self.metadados = []

    def adicionar(self, vetor, metadados):
        self.vetores.append(np.asarray(vetor, dtype=float))
        self.metadados.append(dict(metadados))
        return len(self.vetores) - 1

    def buscar(self, consulta, k=3, filtro=None):
        filtro = filtro or {}
        ids = [
            i for i, meta in enumerate(self.metadados)
            if all(meta.get(chave) == valor for chave, valor in filtro.items())
        ]
        if not ids:
            return []
        scores = np.vstack([self.vetores[i] for i in ids]) @ normalizar(consulta)
        return [
            {"id": ids[p], "score": round(float(scores[p]), 4), "metadados": dict(self.metadados[ids[p]])}
            for p in top_k(scores, k)
        ]
```
```python name="devolve a posição na lista filtrada como id"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar(vetor):
    v = np.asarray(vetor, dtype=float)
    norma = np.linalg.norm(v)
    return v / norma if norma > 0 else v


class IndiceExato:
    def __init__(self):
        self.vetores = []
        self.metadados = []

    def adicionar(self, vetor, metadados):
        self.vetores.append(normalizar(vetor))
        self.metadados.append(dict(metadados))
        return len(self.vetores) - 1

    def buscar(self, consulta, k=3, filtro=None):
        filtro = filtro or {}
        ids = [
            i for i, meta in enumerate(self.metadados)
            if all(meta.get(chave) == valor for chave, valor in filtro.items())
        ]
        if not ids:
            return []
        scores = np.vstack([self.vetores[i] for i in ids]) @ normalizar(consulta)
        return [
            {"id": p, "score": round(float(scores[p]), 4), "metadados": dict(self.metadados[ids[p]])}
            for p in top_k(scores, k)
        ]
```
```python name="filtro com any: basta uma chave"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar(vetor):
    v = np.asarray(vetor, dtype=float)
    norma = np.linalg.norm(v)
    return v / norma if norma > 0 else v


class IndiceExato:
    def __init__(self):
        self.vetores = []
        self.metadados = []

    def adicionar(self, vetor, metadados):
        self.vetores.append(normalizar(vetor))
        self.metadados.append(dict(metadados))
        return len(self.vetores) - 1

    def buscar(self, consulta, k=3, filtro=None):
        ids = [
            i for i, meta in enumerate(self.metadados)
            if not filtro or any(meta.get(chave) == valor for chave, valor in filtro.items())
        ]
        if not ids:
            return []
        scores = np.vstack([self.vetores[i] for i in ids]) @ normalizar(consulta)
        return [
            {"id": ids[p], "score": round(float(scores[p]), 4), "metadados": dict(self.metadados[ids[p]])}
            for p in top_k(scores, k)
        ]
```
```python name="guarda o mesmo dicionário recebido"
import numpy as np


def top_k(scores, k):
    s = np.asarray(scores, dtype=float)
    k = min(k, len(s))
    if k <= 0:
        return []
    limiar = s[np.argpartition(-s, k - 1)[k - 1]]
    candidatos = np.flatnonzero(s >= limiar)
    ordem = candidatos[np.argsort(-s[candidatos], kind="stable")]
    return ordem[:k].tolist()


def normalizar(vetor):
    v = np.asarray(vetor, dtype=float)
    norma = np.linalg.norm(v)
    return v / norma if norma > 0 else v


class IndiceExato:
    def __init__(self):
        self.vetores = []
        self.metadados = []

    def adicionar(self, vetor, metadados):
        self.vetores.append(normalizar(vetor))
        self.metadados.append(metadados)
        return len(self.vetores) - 1

    def buscar(self, consulta, k=3, filtro=None):
        filtro = filtro or {}
        ids = [
            i for i, meta in enumerate(self.metadados)
            if all(meta.get(chave) == valor for chave, valor in filtro.items())
        ]
        if not ids:
            return []
        scores = np.vstack([self.vetores[i] for i in ids]) @ normalizar(consulta)
        return [
            {"id": ids[p], "score": round(float(scores[p]), 4), "metadados": dict(self.metadados[ids[p]])}
            for p in top_k(scores, k)
        ]
```

## Passo 7 · Quiz · Busca exata, top-k e filtros

### Pergunta
Um serviço calcula `scores = E @ q` para $N = 500\,000$ trechos e devolve `np.argsort(-scores)[:5]`. Um colega propõe trocar por `argpartition` seguido da ordenação dos 5 escolhidos. O que muda?
- [ ] O resultado fica aproximado: `argpartition` pode deixar de fora um dos 5 maiores.
- [x] O resultado é o mesmo conjunto (com a regra de empate tratada), e a seleção cai de $O(N \log N)$ para $O(N + k \log k)$.
- [ ] Nada: os dois ordenam o vetor inteiro.
- [ ] O custo de `E @ q` cai de $O(N \cdot d)$ para $O(N)$.
> `argpartition` é exato: garante os $k$ maiores, só não os ordena entre si. O produto `E @ q` continua $O(N \cdot d)$ e, com $d$ na casa das centenas, costuma pesar mais que a seleção; a troca economiza a ordenação desnecessária.

### Pergunta
A busca com `filtro={"curso": "pos"}` devolve 1 resultado quando você pede `k = 5`, embora existam 40 trechos da pós-graduação. O índice tem 100 000 trechos, quase todos da graduação. Qual é a causa mais provável?
- [ ] O `k` precisa ser maior que o número de cursos.
- [ ] Os trechos da pós não foram normalizados.
- [x] O filtro está sendo aplicado depois do top-5 do índice inteiro, e só um trecho da pós estava entre os 5 melhores gerais.
- [ ] O cosseno dos trechos da pós é negativo e eles são descartados.
> Com pós-filtro, o top-$k$ é escolhido antes de olhar os metadados; quando a categoria é rara, quase nenhum dos $k$ passa no filtro. Pré-filtrar escolhe primeiro os 40 trechos da pós e devolve os 5 melhores entre eles.

### Pergunta
A secretaria tem 3 000 trechos de normas em dimensão 384 e recebe no pico 20 perguntas por segundo. Na máquina dela, a busca sustenta 10 GFLOP/s. Qual decisão a conta do Passo 1 apoia?
- [x] Busca exata: cerca de 0,23 ms por consulta e 4,6 MB em `float32`, com recall de 100 % e nada para ajustar.
- [ ] Índice aproximado, porque toda busca vetorial em produção precisa de um.
- [ ] Busca exata, mas só se os vetores forem guardados em `float64`, para não perder recall.
- [ ] Índice aproximado, porque 20 consultas por segundo ocupariam vários núcleos.
> $2 \cdot 3000 \cdot 384 = 2{,}3 \cdot 10^6$ operações, ou 0,23 ms a 10 GFLOP/s; 20 consultas por segundo ocupam menos de 1 % de um núcleo. Um índice aproximado só traria perda de recall e parâmetros para ajustar. `float32` não muda o ranking de forma relevante e usa metade da memória.
