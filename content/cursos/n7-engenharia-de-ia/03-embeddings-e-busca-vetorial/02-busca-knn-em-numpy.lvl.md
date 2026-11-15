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

## Passo 1 · Leitura · Busca exata vetorizada, argpartition e filtros

Quando temos $N$ documentos representados pela matriz de embeddings normalizados $E \in \mathbb{R}^{N \times d}$ e uma consulta normalizada $q \in \mathbb{R}^d$, calcular a similaridade com todos os documentos em um laço `for` em Python puro é ordens de grandeza mais lento do que executar uma única multiplicação matriz-vetor `scores = E @ q` em `numpy` (ou `S = E @ Q.T` para um lote de $M$ consultas de uma vez):

$$S = E Q^\top \in \mathbb{R}^{N \times M}, \qquad T_{\text{exata}}(N, d) \approx c \cdot N \cdot d$$

Depois de calcular o vetor `scores` de tamanho $N$, queremos apenas os $k$ maiores elementos (tipicamente $k = 3$ ou $k = 5$, enquanto $N$ pode ser $100\,000$). Se usarmos `np.argsort(scores)`, ordenaremos todos os $N$ elementos com custo $O(N \log N)$. Como você viu no Nível 3, podemos fazer melhor usando `np.argpartition`:

1. `candidatos = np.argpartition(scores, -k)[-k:]` encontra os $k$ índices de maior pontuação em **tempo linear $O(N)$**, sem perder tempo ordenando os outros $N - k$ documentos descartados.
2. Como `argpartition` não garante a ordem relativa dentro dos $k$ escolhidos, ordenamos apenas esse subconjunto minúsculo de tamanho $k$ em $O(k \log k)$: `ordem = candidatos[np.argsort(-scores[candidatos])]`.

Outro requisito constante na secretaria acadêmica é **filtrar por metadados** (por exemplo, buscar apenas em documentos onde `{"curso": "BCC"}` ou `{"ano": 2026}`). Há duas formas de combinar filtro e busca vetorial:
- **Pós-filtragem (errada quando o filtro é seletivo):** busca os top-$k$ globais no índice inteiro e depois descarta os que não batem com o filtro. Se apenas 2 % dos documentos forem do curso `"BCC"`, os top-5 globais podem ser todos de outros cursos, e sua busca devolverá uma lista vazia mesmo havendo dezenas de documentos de `"BCC"` no banco!
- **Pré-filtragem (correta):** aplica primeiro uma máscara booleana para selecionar os documentos que cumprem o filtro de metadados e executa o top-$k$ apenas entre eles, garantindo até $k$ resultados válidos.

## Passo 2 · Previsão · argpartition separa, mas não ordena os top-k

Veja na prática a diferença entre os índices brutos devolvidos por `np.argpartition(scores, -k)[-k:]` e os índices após a etapa final de ordenação dos $k$ candidatos.

### Código

```python
import numpy as np

scores = np.array([0.15, 0.92, 0.40, 0.85, 0.78, 0.10])
k = 3

particao = np.argpartition(scores, -k)[-k:]
ordenados = particao[np.argsort(-scores[particao])]

print("Conjunto top-3:", sorted(particao.tolist()))
print("Ordenados por score:", ordenados.tolist())
print("Maiores scores:", [round(float(scores[i]), 2) for i in ordenados])
```

### Dicas

1. Os 3 maiores valores em `scores` estão nos índices `1` (`0.92`), `3` (`0.85`) e `4` (`0.78`), logo `sorted(particao.tolist())` é `[1, 3, 4]`.
2. Depois de ordenar em ordem decrescente de score, a sequência exata é `[1, 3, 4]`.

### Saída esperada

```text
Conjunto top-3: [1, 3, 4]
Ordenados por score: [1, 3, 4]
Maiores scores: [0.92, 0.85, 0.78]
```

## Passo 3 · Exercício · Top-k eficiente com argpartition

modo: ordenar

Ordene as linhas para implementar `top_k(scores, k)`. A função converte `scores` para `np.asarray`, trata o caso em que `k >= len(arr)` e, para `k < len(arr)`, seleciona os `k` maiores com `np.argpartition(arr, -k)[-k:]` e os ordena do maior para o menor score, devolvendo uma lista de inteiros.

### Instruções

1. Se `k <= 0` ou `len(arr) == 0`, retorne `[]`; se `k >= len(arr)`, retorne todos os índices ordenados por `np.argsort(-arr)`.
2. Quando `k < len(arr)`, separe os `k` maiores índices com `np.argpartition(arr, -k)[-k:]`.
3. Ordene esses `k` índices em ordem decrescente de score e converta para lista com `.tolist()`.

### Solução

```python
import numpy as np


def top_k(scores, k):
    arr = np.asarray(scores, dtype=float)
    if k <= 0 or len(arr) == 0:
        return []
    if k >= len(arr):
        return np.argsort(-arr).tolist()
    idx = np.argpartition(arr, -k)[-k:]
    ordem = idx[np.argsort(-arr[idx])]
    return ordem.tolist()
```

### Dicas

1. Trate primeiro os casos de borda (`k <= 0 or len(arr) == 0` e `k >= len(arr)`), pois `np.argpartition(arr, -k)` exige `k <= len(arr)`.
2. Depois de obter `idx = np.argpartition(arr, -k)[-k:]`, ordene `idx` usando `idx[np.argsort(-arr[idx])]`.

### Verificação

```json
[
  {
    "id": "topk-padrao",
    "name": "Retorna os k maiores índices em ordem estritamente decrescente de score",
    "checkpoint": 3,
    "kind": "call",
    "function": "top_k",
    "args": [[0.2, 0.95, 0.1, 0.7, 0.85, 0.4], 3],
    "expected": [1, 4, 3]
  },
  {
    "id": "topk-maior-que-n",
    "name": "Funciona quando k é maior ou igual ao tamanho do vetor",
    "checkpoint": 1,
    "kind": "call",
    "function": "top_k",
    "args": [[0.3, 0.9, 0.5], 10],
    "expected": [1, 2, 0]
  },
  {
    "id": "topk-vazio-ou-zero",
    "name": "Retorna lista vazia quando k é 0 ou scores é vazio",
    "checkpoint": 1,
    "kind": "expr",
    "expr": "[top_k([1.0, 2.0], 0), top_k([], 3)]",
    "expected": [[], []]
  }
]
```

### Soluções erradas

```python name="Seleciona os k menores índices em vez dos k maiores"
import numpy as np


def top_k(scores, k):
    arr = np.asarray(scores, dtype=float)
    if k <= 0 or len(arr) == 0:
        return []
    return np.argsort(arr)[:k].tolist()
```

```python name="Devolve os índices de argpartition sem ordenar os k candidatos entre si"
import numpy as np


def top_k(scores, k):
    arr = np.asarray(scores, dtype=float)
    if k <= 0 or len(arr) == 0:
        return []
    if k >= len(arr):
        return list(range(len(arr)))
    idx = np.argpartition(arr, -k)[-k:]
    return sorted(idx.tolist())
```

## Passo 4 · Exercício · Classe IndiceExato com pré-filtro de metadados

Implemente a classe `IndiceExato` que armazena embeddings normalizados e metadados, realizando **pré-filtragem** antes da seleção dos top-$k$:

- `adicionar(self, vetor, metadados)`: normaliza `vetor` pela norma L2 (se a norma for $> 0$), armazena o vetor e uma cópia de `metadados` (`dict`), e retorna o `id` inteiro do documento (sequencial a partir de `0`).
- `buscar(self, consulta, k=3, filtro=None)`:
  - Normaliza o vetor `consulta`.
  - Seleciona os documentos candidatos: se `filtro` for `None` ou `{}` vazio, todos os documentos são candidatos; se `filtro` for um dicionário `{"chave": valor, ...}`, apenas os documentos cujos `metadados` possuem `metadados.get(chave) == valor` para **todas** as chaves do `filtro` entram como candidatos (se nenhum documento atender ao filtro, retorne `[]`).
  - Calcula o score de similaridade de cosseno apenas para os candidatos filtrados e retorna os top-`k` em ordem decrescente de score como uma lista de dicionários:
    `[{"id": int, "score": round(float(score), 6), "metadados": dict}]`.

### Instruções

1. Em `adicionar(self, vetor, metadados)`, normalize `vetor` para norma L2 unitária e guarde-o junto com `metadados`.
2. Em `buscar(self, consulta, k=3, filtro=None)`, filtre primeiro os índices que satisfazem todos os pares `chave: valor` de `filtro`.
3. Calcule os produtos internos com `consulta` normalizada e retorne os `k` melhores resultados no formato `{"id": int, "score": round(float(score), 6), "metadados": dict}`.

### Código inicial

```python
import numpy as np


class IndiceExato:
    def __init__(self):
        # Inicialize listas de vetores e metadados
        pass

    def adicionar(self, vetor, metadados):
        # Normalize o vetor, salve metadados e retorne o id (0, 1, 2...)
        pass

    def buscar(self, consulta, k=3, filtro=None):
        # Aplique pré-filtro de metadados, pontue e devolva os top-k
        pass


if __name__ == "__main__":
    idx = IndiceExato()
    idx.adicionar([1.0, 0.0], {"setor": "pos", "titulo": "Regimento Pós"})
    idx.adicionar([0.9, 0.1], {"setor": "pos", "titulo": "Bolsas Pós"})
    idx.adicionar([0.8, 0.6], {"setor": "grad", "titulo": "Matrícula Grad"})
    print(idx.buscar([1.0, 0.0], k=2, filtro={"setor": "grad"}))
```

### Solução

```python
import numpy as np


class IndiceExato:
    def __init__(self):
        self._vetores = []
        self._metadados = []

    def _normalizar(self, v):
        arr = np.asarray(v, dtype=float)
        n = np.linalg.norm(arr)
        return arr / n if n > 0 else arr

    def adicionar(self, vetor, metadados):
        doc_id = len(self._vetores)
        self._vetores.append(self._normalizar(vetor))
        self._metadados.append(dict(metadados))
        return doc_id

    def buscar(self, consulta, k=3, filtro=None):
        if k <= 0 or not self._vetores:
            return []
        ids_validos = []
        for doc_id, meta in enumerate(self._metadados):
            if filtro:
                if not all(meta.get(ch) == val for ch, val in filtro.items()):
                    continue
            ids_validos.append(doc_id)

        if not ids_validos:
            return []

        q = self._normalizar(consulta)
        sub_mat = np.vstack([self._vetores[i] for i in ids_validos])
        scores = sub_mat @ q

        if k >= len(ids_validos):
            ordem_local = np.argsort(-scores)
        else:
            part = np.argpartition(scores, -k)[-k:]
            ordem_local = part[np.argsort(-scores[part])]

        resultados = []
        for pos in ordem_local:
            doc_id = int(ids_validos[int(pos)])
            resultados.append(
                {
                    "id": doc_id,
                    "score": round(float(scores[int(pos)]), 6),
                    "metadados": dict(self._metadados[doc_id]),
                }
            )
        return resultados


if __name__ == "__main__":
    idx = IndiceExato()
    idx.adicionar([1.0, 0.0], {"setor": "pos", "titulo": "Regimento Pós"})
    idx.adicionar([0.9, 0.1], {"setor": "pos", "titulo": "Bolsas Pós"})
    idx.adicionar([0.8, 0.6], {"setor": "grad", "titulo": "Matrícula Grad"})
    print(idx.buscar([1.0, 0.0], k=2, filtro={"setor": "grad"}))
```

### Dicas

1. Faça a filtragem de metadados **antes** de selecionar os `k` maiores scores. Se você pegar os top-`k` globais primeiro e filtrar depois, documentos da categoria filtrada com score menor que outros setores serão perdidos!
2. Lembre-se de mapear o índice local da submatriz filtrada de volta para o `doc_id` global usando `ids_validos[pos]`.

### Verificação

```json
[
  {
    "id": "busca-sem-filtro",
    "name": "Retorna os documentos mais similares normalizando vetores e consulta",
    "checkpoint": 1,
    "kind": "expr",
    "setup": "idx = IndiceExato()\nidx.adicionar([3.0, 4.0], {'tipo': 'A'})\nidx.adicionar([0.0, 5.0], {'tipo': 'B'})\nidx.adicionar([6.0, 8.0], {'tipo': 'A'})\nres = idx.buscar([3.0, 4.0], k=2)",
    "expr": "[[r['id'] for r in res], res[0]['score']]",
    "expected": [[0, 2], 1.0],
    "tolerance": 1e-6
  },
  {
    "id": "busca-pre-filtro-seletivo",
    "name": "Pré-filtro encontra documentos da categoria mesmo quando não estão no top-k global",
    "checkpoint": 2,
    "kind": "expr",
    "setup": "idx = IndiceExato()\nidx.adicionar([1.0, 0.0], {'curso': 'pos'})\nidx.adicionar([0.99, 0.01], {'curso': 'pos'})\nidx.adicionar([0.98, 0.02], {'curso': 'pos'})\nidx.adicionar([0.6, 0.8], {'curso': 'grad'})\nidx.adicionar([0.8, 0.6], {'curso': 'grad'})\nres = idx.buscar([1.0, 0.0], k=2, filtro={'curso': 'grad'})",
    "expr": "[[r['id'], r['score']] for r in res]",
    "expected": [[4, 0.8], [3, 0.6]],
    "tolerance": 1e-6
  }
]
```

### Soluções erradas

```python name="Faz pós-filtragem depois de pegar os top-k globais e perde resultados"
import numpy as np


class IndiceExato:
    def __init__(self):
        self._vetores = []
        self._metadados = []

    def adicionar(self, vetor, metadados):
        v = np.asarray(vetor, dtype=float)
        self._vetores.append(v / np.linalg.norm(v))
        self._metadados.append(dict(metadados))
        return len(self._vetores) - 1

    def buscar(self, consulta, k=3, filtro=None):
        q = np.asarray(consulta, dtype=float)
        q = q / np.linalg.norm(q)
        mat = np.vstack(self._vetores)
        scores = mat @ q
        top_global = np.argsort(-scores)[:k]
        res = []
        for i in top_global:
            meta = self._metadados[int(i)]
            if filtro and not all(meta.get(c) == v for c, v in filtro.items()):
                continue
            res.append({"id": int(i), "score": round(float(scores[int(i)]), 6), "metadados": meta})
        return res
```

```python name="Ignora o dicionário de filtro passado na busca"
import numpy as np


class IndiceExato:
    def __init__(self):
        self._vetores = []
        self._metadados = []

    def adicionar(self, vetor, metadados):
        v = np.asarray(vetor, dtype=float)
        self._vetores.append(v / np.linalg.norm(v))
        self._metadados.append(dict(metadados))
        return len(self._vetores) - 1

    def buscar(self, consulta, k=3, filtro=None):
        q = np.asarray(consulta, dtype=float)
        q = q / np.linalg.norm(q)
        mat = np.vstack(self._vetores)
        scores = mat @ q
        top_global = np.argsort(-scores)[:k]
        return [
            {"id": int(i), "score": round(float(scores[int(i)]), 6), "metadados": self._metadados[int(i)]}
            for i in top_global
        ]
```

## Passo 5 · Exercício · Busca em lote e estimativa de tempo

Quando um servidor recebe $M$ consultas ao mesmo tempo, calcular `S = E @ Q.T` aproveita as instruções SIMD/BLAS do processador muito melhor do que executar $M$ buscas separadas.

Implemente:
1. `buscar_em_lote(E, Q, k)`: recebe a matriz de documentos normalizados `E` ($N \times d$) e a matriz de consultas normalizadas `Q` ($M \times d$), e devolve uma lista de $M$ listas, onde a $j$-ésima lista contém os `k` índices (`int`) de documentos mais similares à consulta $j$ (em ordem decrescente de similaridade).
2. `tempo_por_consulta_ms(n_docs, dim, gflops=20.0)`: estima o tempo em **milissegundos** de uma busca exata por força bruta considerando que cada produto interno de dimensão `dim` realiza $2 \cdot \text{dim}$ operações de ponto flutuante (1 multiplicação + 1 soma por coordenada):

$$T_{\text{ms}} = \frac{2 \cdot N_{\text{docs}} \cdot d}{\text{gflops} \cdot 10^9} \times 10^3$$

### Instruções

1. Em `buscar_em_lote(E, Q, k)`, calcule a matriz de pontuações `scores = mat_q @ mat_e.T` (de forma $M \times N$) e para cada linha selecione os `k` melhores índices em ordem decrescente.
2. Em `tempo_por_consulta_ms(n_docs, dim, gflops=20.0)`, aplique a fórmula `(2.0 * n_docs * dim) / (gflops * 1e9) * 1000.0` e retorne como `float`.

### Código inicial

```python
import numpy as np


def buscar_em_lote(E, Q, k):
    # Calcule os top-k índices de E para cada consulta de Q
    pass


def tempo_por_consulta_ms(n_docs, dim, gflops=20.0):
    # Estime o tempo em milissegundos para 2 * n_docs * dim FLOPs
    pass


if __name__ == "__main__":
    base = [[1.0, 0.0], [0.0, 1.0], [0.7071, 0.7071]]
    consultas = [[1.0, 0.0], [0.0, 1.0]]
    print(buscar_em_lote(base, consultas, 2))
    print("1M docs x 768d (ms):", tempo_por_consulta_ms(1_000_000, 768, 20.0))
```

### Solução

```python
import numpy as np


def buscar_em_lote(E, Q, k):
    mat_e = np.asarray(E, dtype=float)
    mat_q = np.asarray(Q, dtype=float)
    scores_lote = mat_q @ mat_e.T
    resultados = []
    n = mat_e.shape[0]
    for scores in scores_lote:
        if k >= n:
            ordem = np.argsort(-scores)
        else:
            part = np.argpartition(scores, -k)[-k:]
            ordem = part[np.argsort(-scores[part])]
        resultados.append([int(i) for i in ordem])
    return resultados


def tempo_por_consulta_ms(n_docs, dim, gflops=20.0):
    flops = 2.0 * n_docs * dim
    segundos = flops / (gflops * 1e9)
    return float(segundos * 1000.0)


if __name__ == "__main__":
    base = [[1.0, 0.0], [0.0, 1.0], [0.7071, 0.7071]]
    consultas = [[1.0, 0.0], [0.0, 1.0]]
    print(buscar_em_lote(base, consultas, 2))
    print("1M docs x 768d (ms):", tempo_por_consulta_ms(1_000_000, 768, 20.0))
```

### Dicas

1. Se `mat_e` tem forma $(N, d)$ e `mat_q` tem forma $(M, d)$, então `mat_q @ mat_e.T` tem forma $(M, N)$, onde cada linha corresponde a uma consulta.
2. Em `tempo_por_consulta_ms`, `1 GFLOP/s = 1e9 FLOP/s` e `1 segundo = 1000 ms`.

### Verificação

```json
[
  {
    "id": "lote-duas-consultas",
    "name": "buscar_em_lote retorna os top-k corretos para múltiplas consultas",
    "checkpoint": 1,
    "kind": "call",
    "function": "buscar_em_lote",
    "args": [
      [[1.0, 0.0], [0.0, 1.0], [0.8, 0.6]],
      [[1.0, 0.0], [0.0, 1.0]],
      2
    ],
    "expected": [[0, 2], [1, 2]]
  },
  {
    "id": "tempo-1m-docs",
    "name": "Estima 76.8 ms para 1 milhão de documentos de dimensão 768 a 20 GFLOP/s",
    "checkpoint": 2,
    "kind": "call",
    "function": "tempo_por_consulta_ms",
    "args": [1000000, 768, 20.0],
    "expected": 76.8,
    "tolerance": 1e-6
  }
]
```

### Soluções erradas

```python name="Ordena os resultados de cada consulta em ordem crescente de score"
import numpy as np


def buscar_em_lote(E, Q, k):
    mat_e = np.asarray(E, dtype=float)
    mat_q = np.asarray(Q, dtype=float)
    scores_lote = mat_q @ mat_e.T
    return [[int(i) for i in np.argsort(s)[:k]] for s in scores_lote]


def tempo_por_consulta_ms(n_docs, dim, gflops=20.0):
    return float((2.0 * n_docs * dim) / (gflops * 1e9) * 1000.0)
```

```python name="Esquece de converter segundos para milissegundos em tempo_por_consulta_ms"
import numpy as np


def buscar_em_lote(E, Q, k):
    mat_e = np.asarray(E, dtype=float)
    mat_q = np.asarray(Q, dtype=float)
    scores_lote = mat_q @ mat_e.T
    return [[int(i) for i in np.argsort(-s)[:k]] for s in scores_lote]


def tempo_por_consulta_ms(n_docs, dim, gflops=20.0):
    return float((2.0 * n_docs * dim) / (gflops * 1e9))
```

## Passo 6 · Quiz · Busca exata e filtragem

### Pergunta

Por que usar `np.argpartition(scores, -k)[-k:]` seguido da ordenação desses `k` elementos é mais rápido do que `np.argsort(-scores)[:k]` quando $N = 500\,000$ e $k = 5$?

- [ ] Porque `argpartition` roda na placa de som do computador.
- [x] Porque `argpartition` encontra os $k$ maiores elementos em tempo linear $O(N)$ sem gastar $O(N \log N)$ ordenando os outros $499\,995$ documentos irrelevantes.
- [ ] Porque `argsort` só funciona para listas de até 100 elementos.
- [ ] Porque `argpartition` reduz a dimensão $d$ dos embeddings.

> Ordenar meio milhão de números quando você só quer saber quais são os 5 maiores realiza trabalho desnecessário. `argpartition` particiona em $O(N)$ e só ordenamos os $k = 5$ vencedores em $O(k \log k)$.

### Pergunta

Qual é o defeito de aplicar um filtro de metadados (ex.: `curso == "Matemática"`) **depois** de selecionar os top-$k$ vetores mais similares do índice inteiro?

- [ ] O produto interno passa a dar números complexos.
- [x] Se os documentos de `"Matemática"` representarem uma fração pequena do corpus, os top-$k$ globais podem pertencer todos a outros cursos, fazendo a busca retornar zero resultados mesmo existindo documentos relevantes de `"Matemática"`.
- [ ] A pré-filtragem sempre consome mais memória que o índice inteiro.
- [ ] Não há diferença: pré-filtragem e pós-filtragem devolvem sempre os mesmos documentos.

> Pós-filtrar após um corte top-$k$ pequeno causa queda severa de *recall* sempre que o predicado do filtro é seletivo.

### Pergunta

Para uma base pequena de $3\,000$ artigos e normas da secretaria acadêmica (vetores de dimensão $384$), qual abordagem de busca vetorial é a mais indicada?

- [ ] Construir um cluster distribuído de 16 máquinas com índice aproximado complexo.
- [x] Busca exata vetorizada em memória (`E @ q`), que leva menos de $1\text{ ms}$, tem $100\%$ de *recall* e não exige ajuste nem retreinamento de índice.
- [ ] Busca manual com expressões regulares sem embeddings.
- [ ] Quantizar os vetores para 1 bit.

> Até dezenas de milhares de vetores, uma multiplicação matriz-vetor em `numpy` leva poucos milissegundos com $100\%$ de precisão exata, evitando a complexidade operacional de índices aproximados sem necessidade.
