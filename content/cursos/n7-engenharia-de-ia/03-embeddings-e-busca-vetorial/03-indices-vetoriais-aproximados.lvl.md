---
slug: n7-m3-03-indices-vetoriais-aproximados
titulo: 'Índices vetoriais aproximados: IVF, HNSW e quantização'
descricao: Por que busca exata não escala, particionamento por clusters (IVF com k-means do Nível 5), grafos de proximidade (HNSW) como leitura, quantização de produto, e a troca recall × velocidade.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar um índice IVF simples (k-means + busca em nprobe partições) e medir recall contra a busca exata
- Descrever o HNSW e a quantização de produto em linhas gerais
- Escolher parâmetros (nlist, nprobe) pela troca recall × latência
---

## Passo 1 · Leitura · Escalando para milhões de vetores: IVF, HNSW e PQ

Quando um banco vetorial cresce para dezenas de milhões de documentos, comparar a consulta $q$ com todos os $N$ vetores a cada pergunta torna-se inviável em latência e CPU. Entram em cena os **índices de vizinhos mais próximos aproximados** (*Approximate Nearest Neighbors* — ANN), que trocam uma pequena fração de *recall* por ganhos de velocidade de $10\times$ a $100\times$.

Para medir a qualidade de qualquer índice aproximado, usamos como gabarito o conjunto $R_{\text{exato}}^{(k)}$ dos $k$ vizinhos reais devolvidos pela busca exata e calculamos o **Recall@k**:

$$\text{Recall@}k = \frac{\left|R_{\text{aprox}}^{(k)} \cap R_{\text{exato}}^{(k)}\right|}{\left|R_{\text{exato}}^{(k)}\right|}$$

Três famílias de estruturas dominam os bancos vetoriais modernos (como FAISS e `pgvector`):

1. **IVF (*Inverted File Index*):** usa o algoritmo *k-means* (que você aprendeu no Nível 5) para dividir o espaço em `nlist` regiões (centróides). Cada documento é guardado na lista invertida do seu centróide mais próximo. Na hora da busca, em vez de varrer as `nlist` partições, comparamos a consulta $q$ com os `nlist` centróides e inspecionamos apenas os documentos das **`nprobe` partições mais próximas** ($1 \le \text{nprobe} \le \text{nlist}$):

```mermaid
flowchart LR
    A["Consulta q"] --> B["Compara com nlist centróides"]
    B --> C["Seleciona nprobe listas mais próximas"]
    C --> D["Pontua apenas vetores dessas listas"]
    D --> E["Top-k aproximado"]
```

Quando `nprobe` aumenta, inspecionamos mais partições: o $\text{Recall@}k$ sobe (chegando a $1{,}0$ quando $\text{nprobe} = \text{nlist}$, que degenera na busca exata com sobrecarga extra!), mas a latência também aumenta.

2. **HNSW (*Hierarchical Navigable Small World*):** constrói um grafo de proximidade em múltiplas camadas. As camadas superiores têm poucos nós e arestas longas (servindo como "vias expressas" para atravessar o espaço rapidamente); a cada camada inferior, o grafo fica mais denso até refinar a vizinhança local na camada base (`efSearch` controla a largura da busca). Oferece altíssimo *recall* em baixa latência, porém consome mais memória RAM para guardar as arestas do grafo.
3. **Quantização de Produto (*Product Quantization* — PQ):** para comprimir a memória, divide cada vetor de dimensão $d$ em $m$ subvetores de dimensão $d/m$. Cada subespaço tem um pequeno livro de códigos (*codebook*) com $K$ centróides; assim, cada subvetor é substituído por um único inteiro (o índice do centróide mais próximo no *codebook* daquela fatia).

## Passo 2 · Exercício · Medindo recall@k e quantizando subvetores

Implemente duas funções fundamentais para avaliar e comprimir índices vetoriais:

1. `recall_em_k(resultados_aprox, resultados_exatos)`: recebe duas listas de listas (cada sublista contém os índices retornados para uma consulta) e devolve a média de $\frac{|\text{set}(a) \cap \text{set}(e)|}{|\text{set}(e)|}$ ao longo de todas as consultas como `float`.
2. `quantizar_subvetores(E, codebooks)`:
   - `E` é uma matriz $N \times d$ de vetores; `codebooks` é uma lista de $m$ matrizes, onde `codebooks[j]` tem forma $(K, d/m)$ com os centróides da $j$-ésima fatia.
   - Para cada vetor de `E` e para cada fatia $j \in \{0, \dots, m-1\}$ (colunas `j * sub_d` até `(j + 1) * sub_d`), encontre o índice (`int`, de `0` a `K - 1`) do centróide em `codebooks[j]` que tem a **menor distância euclidiana** (`np.linalg.norm(centros - subvetor, axis=1)`) até o subvetor.
   - Retorne a matriz de códigos inteiros $N \times m$ como `list[list[int]]`.

### Instruções

1. Em `recall_em_k(resultados_aprox, resultados_exatos)`, calcule para cada par `(aprox, exato)` a razão `len(set(aprox) & set(exato)) / len(set(exato))` e retorne a média como `float`.
2. Em `quantizar_subvetores(E, codebooks)`, divida cada linha de `E` em $m = \text{len(codebooks)}$ fatias iguais e substitua cada fatia pelo índice `int(np.argmin(distancias))` do centróide mais próximo em `codebooks[j]`.

### Código inicial

```python
import numpy as np


def recall_em_k(resultados_aprox, resultados_exatos):
    # Calcule o recall médio das consultas contra o gabarito exato
    pass


def quantizar_subvetores(E, codebooks):
    # Substitua cada subvetor pelo índice do centróide mais próximo em codebooks[j]
    pass


if __name__ == "__main__":
    print("Recall:", recall_em_k([[0, 2, 5], [1, 4, 3]], [[0, 1, 2], [1, 2, 3]]))
    mat = [[1.1, 0.9, -1.0, -0.8]]
    cbs = [
        [[1.0, 1.0], [-1.0, -1.0]],
        [[1.0, 1.0], [-1.0, -1.0]],
    ]
    print("Códigos PQ:", quantizar_subvetores(mat, cbs))
```

### Solução

```python
import numpy as np


def recall_em_k(resultados_aprox, resultados_exatos):
    if not resultados_exatos:
        return 0.0
    soma = 0.0
    for aprox, exato in zip(resultados_aprox, resultados_exatos):
        conj_exato = set(exato)
        if not conj_exato:
            continue
        soma += len(set(aprox) & conj_exato) / len(conj_exato)
    return float(soma / len(resultados_exatos))


def quantizar_subvetores(E, codebooks):
    mat = np.asarray(E, dtype=float)
    m = len(codebooks)
    sub_d = mat.shape[1] // m
    codigos = []
    for vetor in mat:
        linha_codigos = []
        for j in range(m):
            fatia = vetor[j * sub_d : (j + 1) * sub_d]
            centros = np.asarray(codebooks[j], dtype=float)
            dists = np.linalg.norm(centros - fatia, axis=1)
            linha_codigos.append(int(np.argmin(dists)))
        codigos.append(linha_codigos)
    return codigos


if __name__ == "__main__":
    print("Recall:", recall_em_k([[0, 2, 5], [1, 4, 3]], [[0, 1, 2], [1, 2, 3]]))
    mat = [[1.1, 0.9, -1.0, -0.8]]
    cbs = [
        [[1.0, 1.0], [-1.0, -1.0]],
        [[1.0, 1.0], [-1.0, -1.0]],
    ]
    print("Códigos PQ:", quantizar_subvetores(mat, cbs))
```

### Dicas

1. No `recall_em_k`, divida o tamanho da interseção por `len(set(exato))` (e nunca pelo tamanho da união).
2. Na quantização de produto, queremos o centróide de **menor distância** euclidiana (`np.argmin(dists)`).

### Verificação

```json
[
  {
    "id": "recall-medio",
    "name": "Calcula o recall@k médio corretamente em múltiplas consultas",
    "checkpoint": 1,
    "kind": "call",
    "function": "recall_em_k",
    "args": [
      [[0, 2, 5], [1, 2, 3]],
      [[0, 1, 2], [1, 2, 3]]
    ],
    "expected": 0.8333333333333333,
    "tolerance": 1e-6
  },
  {
    "id": "pq-codigos",
    "name": "Quantiza cada subvetor pelo índice do centróide mais próximo",
    "checkpoint": 2,
    "kind": "call",
    "function": "quantizar_subvetores",
    "args": [
      [
        [0.9, 1.1, -0.9, -1.2],
        [-0.8, -1.0, 1.2, 0.8]
      ],
      [
        [[1.0, 1.0], [-1.0, -1.0]],
        [[1.0, 1.0], [-1.0, -1.0]]
      ]
    ],
    "expected": [[0, 1], [1, 0]]
  }
]
```

### Soluções erradas

```python name="Usa índice de Jaccard (dividindo pela união) em vez de Recall@k"
import numpy as np


def recall_em_k(resultados_aprox, resultados_exatos):
    soma = 0.0
    for a, e in zip(resultados_aprox, resultados_exatos):
        sa, se = set(a), set(e)
        soma += len(sa & se) / len(sa | se)
    return float(soma / len(resultados_exatos))


def quantizar_subvetores(E, codebooks):
    mat = np.asarray(E, dtype=float)
    m = len(codebooks)
    sub_d = mat.shape[1] // m
    return [
        [
            int(np.argmin(np.linalg.norm(np.asarray(codebooks[j]) - v[j * sub_d : (j + 1) * sub_d], axis=1)))
            for j in range(m)
        ]
        for v in mat
    ]
```

```python name="Escolhe o centróide mais distante (argmax) na quantização"
import numpy as np


def recall_em_k(resultados_aprox, resultados_exatos):
    soma = sum(len(set(a) & set(e)) / len(set(e)) for a, e in zip(resultados_aprox, resultados_exatos))
    return float(soma / len(resultados_exatos))


def quantizar_subvetores(E, codebooks):
    mat = np.asarray(E, dtype=float)
    m = len(codebooks)
    sub_d = mat.shape[1] // m
    return [
        [
            int(np.argmax(np.linalg.norm(np.asarray(codebooks[j]) - v[j * sub_d : (j + 1) * sub_d], axis=1)))
            for j in range(m)
        ]
        for v in mat
    ]
```

## Passo 3 · Exercício · Implementando o IndiceIVF

Vamos construir um `IndiceIVF(nlist, nprobe=1)` completo sobre vetores normalizados:

- `treinar(self, E, iteracoes=5)`:
  - Recebe a matriz normalizada `E` ($N \times d$).
  - Inicializa `self.centroides` de forma determinística copiando os primeiros `self.nlist` vetores de `E`: `E[:self.nlist].copy()`.
  - Por `iteracoes` rodadas: atribui cada vetor de `E` ao centróide de **maior produto interno** (`np.argmax(E @ self.centroides.T, axis=1)`); para cada centróide `c` de `0` a `nlist - 1` que recebeu pelo menos um vetor, atualiza `self.centroides[c]` como a média dos vetores atribuídos a ele e normaliza `self.centroides[c]` pela norma L2.
- `adicionar(self, E)`:
  - Guarda os vetores de `E` e coloca o índice global `i` de cada vetor na lista invertida `self.listas[c]` do centróide `c` de maior produto interno com `E[i]`.
- `buscar(self, q, k=3)`:
  - Seleciona os `self.nprobe` centróides de maior produto interno com `q`.
  - Reúne todos os índices globais de documentos presentes nas listas invertidas desses `nprobe` centróides.
  - Calcula o produto interno de `q` apenas com esses documentos candidatos e retorna a tupla `(top_k_ids, num_candidatos_avaliados)`, onde `top_k_ids` é a lista dos `k` melhores índices globais (`list[int]`) em ordem decrescente de score e `num_candidatos_avaliados` é o inteiro com o total de candidatos inspecionados nas `nprobe` partições.

### Instruções

1. Implemente `treinar(self, E, iteracoes=5)` inicializando `self.centroides = mat[:self.nlist].copy()` e refinando por k-means esférico (média + normalização L2).
2. Implemente `adicionar(self, E)` distribuindo cada índice global `0 .. N-1` na lista invertida do centróide mais similar.
3. Implemente `buscar(self, q, k=3)` inspecionando apenas as `self.nprobe` listas mais próximas de `q` e retornando `(top_k_ids, len(candidatos))`.

### Código inicial

```python
import numpy as np


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = None
        self.listas = {c: [] for c in range(nlist)}

    def treinar(self, E, iteracoes=5):
        # Inicialize centroides com E[:nlist] e refine por k-means normalizado
        pass

    def adicionar(self, E):
        # Atribua cada índice global i de E à lista do centróide mais próximo
        pass

    def buscar(self, q, k=3):
        # Inspecione as nprobe partições mais próximas e retorne (top_k_ids, n_avaliados)
        pass


if __name__ == "__main__":
     base = np.array([
        [1.0, 0.0], [0.98, 0.2], [0.95, -0.3],
        [0.0, 1.0], [0.2, 0.98], [-0.2, 0.98],
        [-1.0, 0.0], [-0.98, 0.2], [-0.95, -0.3],
    ])
    base = base / np.linalg.norm(base, axis=1, keepdims=True)
    ivf = IndiceIVF(nlist=3, nprobe=1)
    ivf.treinar(base)
    ivf.adicionar(base)
    print(ivf.buscar([1.0, 0.0], k=2))
```

### Solução

```python
import numpy as np


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = None
        self.listas = {c: [] for c in range(nlist)}

    def treinar(self, E, iteracoes=5):
        mat = np.asarray(E, dtype=float)
        self.centroides = mat[: self.nlist].copy()
        for _ in range(iteracoes):
            atrib = np.argmax(mat @ self.centroides.T, axis=1)
            for c in range(self.nlist):
                membros = mat[atrib == c]
                if len(membros) > 0:
                    media = np.mean(membros, axis=0)
                    norma = np.linalg.norm(media)
                    if norma > 0:
                        self.centroides[c] = media / norma

    def adicionar(self, E):
        mat = np.asarray(E, dtype=float)
        self.vetores = mat
        self.listas = {c: [] for c in range(self.nlist)}
        atrib = np.argmax(mat @ self.centroides.T, axis=1)
        for idx_global, c in enumerate(atrib):
            self.listas[int(c)].append(int(idx_global))

    def buscar(self, q, k=3):
        vq = np.asarray(q, dtype=float)
        nq = np.linalg.norm(vq)
        if nq > 0:
            vq = vq / nq

        scores_c = self.centroides @ vq
        melhores_c = np.argsort(-scores_c)[: self.nprobe]

        candidatos = []
        for c in melhores_c:
            candidatos.extend(self.listas[int(c)])

        if not candidatos:
            return ([], 0)

        sub_mat = self.vetores[candidatos]
        scores = sub_mat @ vq
        ordem_local = np.argsort(-scores)[:k]
        top_ids = [int(candidatos[int(pos)]) for pos in ordem_local]
        return (top_ids, int(len(candidatos)))


if __name__ == "__main__":
    base = np.array([
        [1.0, 0.0], [0.98, 0.2], [0.95, -0.3],
        [0.0, 1.0], [0.2, 0.98], [-0.2, 0.98],
        [-1.0, 0.0], [-0.98, 0.2], [-0.95, -0.3],
    ])
    base = base / np.linalg.norm(base, axis=1, keepdims=True)
    ivf = IndiceIVF(nlist=3, nprobe=1)
    ivf.treinar(base)
    ivf.adicionar(base)
    print(ivf.buscar([1.0, 0.0], k=2))
```

### Dicas

1. Guarde o índice global `idx_global` dentro de `self.listas[c]` em `adicionar`. Na hora de `buscar`, converta a posição local dentro de `candidatos` de volta para o índice global com `candidatos[pos]`.
2. Selecionar os centróides mais próximos em `buscar` deve usar `np.argsort(-scores_c)[:self.nprobe]`.

### Verificação

```json
[
  {
    "id": "ivf-nprobe-1-economiza",
    "name": "IndiceIVF com nprobe=1 encontra os vizinhos avaliando apenas uma fração da base",
    "checkpoint": 3,
    "kind": "expr",
    "setup": "base = np.array([[1.0, 0.0], [0.0, 1.0], [-1.0, 0.0], [0.99, 0.1], [0.1, 0.99], [-0.99, 0.1], [0.98, -0.1], [-0.1, 0.98], [-0.98, -0.1]])\nbase = base / np.linalg.norm(base, axis=1, keepdims=True)\nivf = IndiceIVF(nlist=3, nprobe=1)\nivf.treinar(base)\nivf.adicionar(base)\nids, avaliados = ivf.buscar([1.0, 0.0], k=2)",
    "expr": "[ids, avaliados]",
    "expected": [[0, 3], 3]
  },
  {
    "id": "ivf-nprobe-cresce",
    "name": "Aumentar nprobe amplia o número de candidatos avaliados",
    "checkpoint": 3,
    "kind": "expr",
    "setup": "base = np.array([[1.0, 0.0], [0.0, 1.0], [-1.0, 0.0], [0.99, 0.1], [0.1, 0.99], [-0.99, 0.1]])\nbase = base / np.linalg.norm(base, axis=1, keepdims=True)\nivf = IndiceIVF(nlist=3, nprobe=2)\nivf.treinar(base)\nivf.adicionar(base)\nids, avaliados = ivf.buscar([1.0, 0.0], k=2)",
    "expr": "avaliados",
    "expected": 4
  }
]
```

### Soluções erradas

```python name="Devolve o índice local dentro de candidatos em vez do índice global do documento"
import numpy as np


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = None
        self.listas = {c: [] for c in range(nlist)}

    def treinar(self, E, iteracoes=5):
        mat = np.asarray(E, dtype=float)
        self.centroides = mat[: self.nlist].copy()

    def adicionar(self, E):
        mat = np.asarray(E, dtype=float)
        self.vetores = mat
        self.listas = {c: [] for c in range(self.nlist)}
        for i, c in enumerate(np.argmax(mat @ self.centroides.T, axis=1)):
            self.listas[int(c)].append(int(i))

    def buscar(self, q, k=3):
        vq = np.asarray(q, dtype=float)
        melhores_c = np.argsort(-(self.centroides @ vq))[: self.nprobe]
        candidatos = []
        for c in melhores_c:
            candidatos.extend(self.listas[int(c)])
        scores = self.vetores[candidatos] @ vq
        ordem_local = np.argsort(-scores)[:k]
        return ([int(p) for p in ordem_local], len(candidatos))
```

```python name="Inspeciona sempre todas as partições ignorando self.nprobe"
import numpy as np


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = None

    def treinar(self, E, iteracoes=5):
        self.centroides = np.asarray(E, dtype=float)[: self.nlist].copy()

    def adicionar(self, E):
        self.vetores = np.asarray(E, dtype=float)

    def buscar(self, q, k=3):
        vq = np.asarray(q, dtype=float)
        scores = self.vetores @ vq
        return ([int(i) for i in np.argsort(-scores)[:k]], len(self.vetores))
```

## Passo 4 · Exercício · Curva recall × custo e escolha de nprobe

Para escolher o melhor `nprobe` em produção, traçamos a curva que mostra, para cada valor de `nprobe` em uma lista `nprobes`, qual é o `recall@k` médio em relação à busca exata e qual fração da base total $N$ foi inspecionada (`avaliados / N`).

Implemente `curva_recall_custo(indice, E_base, consultas, nprobes, k=3)`:
- Primeiro, calcule os resultados exatos de `consultas` sobre `E_base` (para cada `q`, os `k` índices de maior produto interno `E_base @ q`).
- Para cada `p` em `nprobes`: configure `indice.nprobe = p`, execute `indice.buscar(q, k=k)` para todas as `consultas`, calcule o `recall` médio contra os resultados exatos e a `fracao_avaliada` média (`media_avaliados / len(E_base)`).
- Retorne uma lista de dicionários `[{"nprobe": int(p), "recall": round(float(recall), 6), "fracao_avaliada": round(float(fracao), 6)}]`.

### Instruções

1. Calcule o gabarito exato de top-`k` índices para cada consulta em `consultas` usando `E_base`.
2. Para cada `p` em `nprobes`, ajuste `indice.nprobe = p`, chame `indice.buscar(q, k=k)` para cada consulta e meça o `recall` médio e a `fracao_avaliada` média (`avaliados / len(E_base)`).

### Código inicial

```python
import numpy as np


def curva_recall_custo(indice, E_base, consultas, nprobes, k=3):
    # Meça recall e fracao_avaliada para cada nprobe na lista nprobes
    pass


if __name__ == "__main__":
    print("Pronto para medir a curva recall x custo.")
```

### Solução

```python
import numpy as np


def curva_recall_custo(indice, E_base, consultas, nprobes, k=3):
    mat_base = np.asarray(E_base, dtype=float)
    mat_q = np.asarray(consultas, dtype=float)
    n_total = len(mat_base)

    exatos = []
    for vq in mat_q:
        scores_exatos = mat_base @ vq
        exatos.append(set(np.argsort(-scores_exatos)[:k].tolist()))

    relatorio = []
    for p in nprobes:
        indice.nprobe = int(p)
        soma_recall = 0.0
        soma_fracao = 0.0
        for vq, conj_exato in zip(mat_q, exatos):
            ids_aprox, avaliados = indice.buscar(vq, k=k)
            soma_recall += len(set(ids_aprox) & conj_exato) / len(conj_exato)
            soma_fracao += avaliados / n_total

        m = len(mat_q)
        relatorio.append(
            {
                "nprobe": int(p),
                "recall": round(float(soma_recall / m), 6),
                "fracao_avaliada": round(float(soma_fracao / m), 6),
            }
        )
    return relatorio


if __name__ == "__main__":
    print("Pronto para medir a curva recall x custo.")
```

### Dicas

1. Não se esqueça de atualizar `indice.nprobe = int(p)` a cada iteração do laço sobre `nprobes`.
2. A fração avaliada de uma consulta é `avaliados / len(E_base)`; quando `nprobe == nlist`, todas as partições são visitadas e tanto `recall` quanto `fracao_avaliada` atingem `1.0`.

### Verificação

```json
[
  {
    "id": "curva-monotona",
    "name": "Calcula recall e fração avaliada crescentes com nprobe até atingir 1.0",
    "checkpoint": 2,
    "kind": "expr",
    "setup": "class IndSim:\n    def __init__(self, E):\n        self.E = np.asarray(E, dtype=float)\n        self.nprobe = 1\n    def buscar(self, q, k=2):\n        limite = int(len(self.E) * (self.nprobe / 2))\n        sub = self.E[:limite]\n        s = sub @ np.asarray(q, dtype=float)\n        return (np.argsort(-s)[:k].tolist(), limite)\nE = [[1.0, 0.0], [0.0, 1.0], [0.99, 0.1], [0.1, 0.99]]\nQ = [[1.0, 0.0], [0.0, 1.0]]\nres = curva_recall_custo(IndSim(E), E, Q, [1, 2], k=2)",
    "expr": "res",
    "expected": [
      {"nprobe": 1, "recall": 0.5, "fracao_avaliada": 0.5},
      {"nprobe": 2, "recall": 1.0, "fracao_avaliada": 1.0}
    ],
    "tolerance": 1e-6
  }
]
```

### Soluções erradas

```python name="Esquece de atualizar indice.nprobe dentro do laço"
import numpy as np


def curva_recall_custo(indice, E_base, consultas, nprobes, k=3):
    mat_base = np.asarray(E_base, dtype=float)
    mat_q = np.asarray(consultas, dtype=float)
    exatos = [set(np.argsort(-(mat_base @ vq))[:k].tolist()) for vq in mat_q]
    relatorio = []
    for p in nprobes:
        soma_recall = 0.0
        soma_frac = 0.0
        for vq, ex in zip(mat_q, exatos):
            ids, av = indice.buscar(vq, k=k)
            soma_recall += len(set(ids) & ex) / len(ex)
            soma_frac += av / len(mat_base)
        relatorio.append(
            {
                "nprobe": int(p),
                "recall": round(float(soma_recall / len(mat_q)), 6),
                "fracao_avaliada": round(float(soma_frac / len(mat_q)), 6),
            }
        )
    return relatorio
```

```python name="Compara o resultado aproximado consigo mesmo dando sempre recall 1.0"
import numpy as np


def curva_recall_custo(indice, E_base, consultas, nprobes, k=3):
    relatorio = []
    for p in nprobes:
        indice.nprobe = int(p)
        soma_frac = 0.0
        for vq in consultas:
            _, av = indice.buscar(vq, k=k)
            soma_frac += av / len(E_base)
        relatorio.append(
            {
                "nprobe": int(p),
                "recall": 1.0,
                "fracao_avaliada": round(float(soma_frac / len(consultas)), 6),
            }
        )
    return relatorio
```

## Passo 5 · Quiz · IVF, HNSW e quantização

### Pergunta

Em um índice IVF com `nlist = 256` partições, o que acontece se você configurar `nprobe = 256`?

- [ ] A busca fica 256 vezes mais rápida que a busca exata.
- [x] O índice inspeciona todas as 256 partições (100 % dos vetores), obtendo recall igual ao da busca exata, porém sendo mais lento que a busca exata por ter a sobrecarga adicional de avaliar os centróides e percorrer listas encadeadas.
- [ ] O índice apaga metade dos documentos para economizar memória.
- [ ] O recall cai para zero.

> O ganho de velocidade do IVF vem de descartar a maioria das partições ($\text{nprobe} \ll \text{nlist}$). Quando $\text{nprobe} = \text{nlist}$, visitamos todos os vetores sem nenhum ganho de poda.

### Pergunta

Por que um documento que é o verdadeiro vizinho mais próximo da consulta $q$ pode deixar de ser encontrado por um índice IVF quando `nprobe = 1`?

- [ ] Porque a norma L2 do documento muda durante a busca.
- [x] Porque $q$ pode cair perto da fronteira entre duas células de Voronoi: o centróide mais próximo de $q$ é o da região A, mas o documento relevante está logo do outro lado da fronteira, na região B, que não foi inspecionada com `nprobe = 1`.
- [ ] Porque o k-means ordena os vetores em ordem alfabética.
- [ ] Porque `nprobe = 1` desativa o produto interno.

> Vetores próximos da fronteira entre clusters podem ficar em partições vizinhas. Aumentar `nprobe` para inspecionar também o 2º ou 3º centróide mais próximo resolve quase todos esses casos de borda.

### Pergunta

Qual é a principal finalidade da **Quantização de Produto (PQ)** em um banco de dados vetorial?

- [ ] Aumentar a dimensão dos embeddings de 768 para 4 096.
- [x] Comprimir os vetores em memória dividindo-os em $m$ subvetores e representando cada subvetor pelo código inteiro de um centróide local, reduzindo drasticamente o uso de RAM.
- [ ] Substituir o tokenizador de texto do LLM.
- [ ] Transformar buscas aproximadas em buscas 100 % exatas sem perda.

> A quantização de produto troca precisão contínua dos floats de 32 bits por códigos curtos de 1 byte por subvetor, comprimindo índices de dezenas de gigabytes para caberem inteiros na RAM.
