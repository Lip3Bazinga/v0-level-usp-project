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

## Passo 1 · Leitura · Trocar exatidão por velocidade, e medir quanto se perdeu

A conta da lição anterior diz quando a busca exata deixa de servir: quando o tempo por consulta passa do orçamento de latência, quando os núcleos ocupados passam do que você tem, ou quando $N \cdot d$ números não cabem na memória. A saída é um **índice aproximado** (*ANN*, de *approximate nearest neighbors*): uma estrutura que, para cada consulta, olha só uma **fração** dos vetores, escolhida de um jeito esperto. Fica mais rápido, mas às vezes um vizinho verdadeiro fica de fora.

"Às vezes" precisa virar número. A referência é a própria busca exata: para cada consulta de um conjunto de teste, compare os $k$ resultados do índice com os $k$ da força bruta.

$$
\text{Recall@}k = \frac{\left|R^{(k)}_{\text{aprox}} \cap R^{(k)}_{\text{exato}}\right|}{\left|R^{(k)}_{\text{exato}}\right|}
$$

e tire a média sobre as consultas. Recall@10 de 0,95 quer dizer que, em média, 9,5 dos 10 vizinhos verdadeiros aparecem.

```python
exato = [4, 9, 1]          # top-3 da força bruta
aprox = [4, 1, 7]          # top-3 do índice
recall = len(set(aprox) & set(exato)) / len(exato)    # 2/3
```

Três cuidados:

- **O denominador é o exato.** Se o índice devolve menos de $k$ resultados (acontece quando ele olha poucos vetores), o que faltou conta como perdido.
- **Recall@k mede o índice, não a relevância.** Ele compara com a busca exata no mesmo espaço de embeddings. Se o modelo de embedding acha o trecho errado, a busca exata também acha, e o recall é 1. A qualidade da recuperação para o usuário se mede com perguntas e respostas esperadas (módulo de RAG).
- **Use consultas parecidas com as reais**, de preferência uma amostra delas, e não os próprios documentos: um documento sempre é o vizinho mais próximo de si mesmo.

Todo índice aproximado tem algum parâmetro que regula **quanto ele olha**. Olhar mais aumenta o recall e o tempo. Escolher o parâmetro é medir essa curva e ficar com o ponto mais barato que atinge o recall exigido, que é o que você vai fazer nesta lição.

## Passo 2 · Leitura · IVF: dividir o espaço e sondar poucas listas

O **IVF** (*inverted file index*) usa o k-means do Nível 5. Na construção:

1. **Treino:** o k-means agrupa os vetores (ou uma amostra deles) em `nlist` grupos; cada grupo tem um centróide.
2. **Listas invertidas:** cada vetor vai para a lista do centróide mais próximo. Cada lista é uma **célula de Voronoi**: a região do espaço mais perto daquele centróide que de qualquer outro.

Na busca, a consulta é comparada com os `nlist` centróides, e só os vetores das `nprobe` listas mais próximas são pontuados:

```mermaid
flowchart LR
    A["Consulta q"] --> B["Compara com os nlist centróides"]
    B --> C["Escolhe as nprobe listas mais próximas"]
    C --> D["Pontua só os vetores dessas listas"]
    D --> E["Top-k aproximado"]
```

Com listas de tamanho parecido, o custo por consulta cai de $N \cdot d$ para

$$
\underbrace{\text{nlist} \cdot d}_{\text{centróides}} + \underbrace{\frac{\text{nprobe}}{\text{nlist}} \cdot N \cdot d}_{\text{vetores das listas}}
$$

Com $N = 10^6$, `nlist = 1000` e `nprobe = 10`, são cerca de 11 000 produtos internos em vez de um milhão. Uma regra prática comum é começar com `nlist` perto de $\sqrt{N}$ e ajustar pela medição.

Para embeddings normalizados, o k-means usa o **cosseno**: cada vetor vai para o centróide de maior produto interno, e o centróide novo é a média do grupo **normalizada de novo** (*k-means esférico*). Dois detalhes de implementação que derrubam índices reais: um grupo pode ficar **vazio** numa iteração (a média de zero vetores é `nan`; mantenha o centróide antigo), e inicializar com "os primeiros `nlist` vetores" só funciona se os dados não vierem ordenados por assunto.

O erro do IVF tem uma origem só: um vizinho verdadeiro que caiu **do outro lado da fronteira** de uma célula que não foi sondada. Aumentar `nprobe` resolve, ao custo de pontuar mais vetores. Com `nprobe = nlist`, todos os vetores são pontuados: o recall é 1, e o índice ficou mais lento que a força bruta, porque ainda compara com os centróides.

## Passo 3 · Previsão · O vizinho do outro lado da fronteira

Dois centróides, em 0° e 90°, e três documentos unitários no plano. A consulta está em 40°: mais perto do centróide de 0°, mas o documento mais parecido com ela está em 50°. Leia sem executar e digite o que o programa imprime.

### Código
```python
import numpy as np


def unit(graus):
    r = np.radians(graus)
    return np.array([np.cos(r), np.sin(r)])


centroides = np.array([unit(0), unit(90)])
docs = np.array([unit(10), unit(50), unit(80)])
listas = np.argmax(docs @ centroides.T, axis=1)
print(listas.tolist())

q = unit(40)
print("exato:", int(np.argmax(docs @ q)))
for nprobe in [1, 2]:
    sondadas = np.argsort(-(centroides @ q), kind="stable")[:nprobe]
    candidatos = [i for i in range(len(docs)) if listas[i] in sondadas]
    melhor = candidatos[int(np.argmax(docs[candidatos] @ q))]
    print(nprobe, candidatos, melhor)
```

### Dicas
1. Entre vetores unitários, o produto interno é o cosseno do ângulo entre eles: quanto menor o ângulo, maior o valor.
2. O documento em 50° está a 40° do centróide de 90° e a 50° do centróide de 0°.
3. Com `nprobe = 1`, só a lista do centróide mais próximo da consulta é pontuada.

### Saída esperada
```text
[0, 1, 1]
exato: 1
1 [0] 0
2 [0, 1, 2] 1
```

## Passo 4 · Exercício · Implementando o IndiceIVF

Escreva a classe `IndiceIVF(nlist, nprobe=1)` para vetores comparados por cosseno. As funções `top_k` (com a regra de empate da lição 02) e `normalizar_linhas` já estão no código inicial.

- `treinar(E, iteracoes=5)`: normaliza as linhas de `E`, inicializa `self.centroides` com as primeiras `nlist` linhas e repete `iteracoes` vezes: atribui cada vetor ao centróide de **maior produto interno** (`np.argmax(..., axis=1)`, que no empate fica com o primeiro) e troca cada centróide pela média normalizada dos seus vetores. **Grupo vazio mantém o centróide antigo.**
- `adicionar(E)`: normaliza, guarda os vetores em `self.vetores` e coloca o **id global** de cada um em `self.listas[c]`, a lista do centróide de maior produto interno. Pode ser chamado mais de uma vez: os ids continuam de onde pararam (0, 1, 2… na primeira chamada; 3, 4… na seguinte, se a primeira teve 3 vetores).
- `buscar(q, k=3)`: escolhe os `self.nprobe` centróides mais próximos de `q` com `top_k`, junta os ids dessas listas em **ordem crescente**, pontua só esses vetores e devolve a tupla `(ids, avaliados)`: os ids globais dos `k` melhores pela regra de `top_k` e quantos vetores foram pontuados. Nenhum candidato: `([], 0)`.

### Instruções
1. Implemente `treinar` com o k-means esférico, mantendo o centróide de um grupo vazio.
2. Implemente `adicionar` com ids globais que continuam entre chamadas.
3. Em `buscar`, sonde as `nprobe` listas mais próximas e pontue só os vetores delas.
4. Devolva os ids globais (não a posição entre os candidatos) e o número de avaliados.

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


def normalizar_linhas(matriz):
    arr = np.asarray(matriz, dtype=float)
    normas = np.linalg.norm(arr, axis=1, keepdims=True)
    return arr / np.where(normas == 0, 1.0, normas)


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = np.zeros((0, 0))
        self.listas = {c: [] for c in range(nlist)}

    def treinar(self, E, iteracoes=5):
        pass

    def adicionar(self, E):
        pass

    def buscar(self, q, k=3):
        pass


if __name__ == "__main__":
    graus = [0, 120, 240, 10, 130, 250, 50, 110, 230]
    base = [[np.cos(np.radians(g)), np.sin(np.radians(g))] for g in graus]
    ivf = IndiceIVF(nlist=3, nprobe=1)
    ivf.treinar(base)
    ivf.adicionar(base)
    print(ivf.listas)
    consulta = [np.cos(np.radians(72)), np.sin(np.radians(72))]
    print(ivf.buscar(consulta, k=2))
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


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = np.zeros((0, 0))
        self.listas = {c: [] for c in range(nlist)}

    def treinar(self, E, iteracoes=5):
        X = normalizar_linhas(E)
        self.centroides = X[: self.nlist].copy()
        for _ in range(iteracoes):
            atribuicao = np.argmax(X @ self.centroides.T, axis=1)
            for c in range(self.nlist):
                membros = X[atribuicao == c]
                if len(membros) > 0:
                    media = membros.mean(axis=0)
                    norma = np.linalg.norm(media)
                    if norma > 0:
                        self.centroides[c] = media / norma

    def adicionar(self, E):
        X = normalizar_linhas(E)
        inicio = len(self.vetores)
        self.vetores = X if inicio == 0 else np.vstack([self.vetores, X])
        for deslocamento, c in enumerate(np.argmax(X @ self.centroides.T, axis=1)):
            self.listas[int(c)].append(inicio + deslocamento)

    def buscar(self, q, k=3):
        vq = normalizar_linhas([q])[0]
        sondadas = top_k(self.centroides @ vq, self.nprobe)
        candidatos = sorted(i for c in sondadas for i in self.listas[c])
        if not candidatos:
            return ([], 0)
        scores = self.vetores[candidatos] @ vq
        return ([candidatos[p] for p in top_k(scores, k)], len(candidatos))


if __name__ == "__main__":
    graus = [0, 120, 240, 10, 130, 250, 50, 110, 230]
    base = [[np.cos(np.radians(g)), np.sin(np.radians(g))] for g in graus]
    ivf = IndiceIVF(nlist=3, nprobe=1)
    ivf.treinar(base)
    ivf.adicionar(base)
    print(ivf.listas)
    consulta = [np.cos(np.radians(72)), np.sin(np.radians(72))]
    print(ivf.buscar(consulta, k=2))
```

### Dicas
1. `X[atribuicao == c]` seleciona as linhas do grupo `c`; se não houver nenhuma, não mexa no centróide.
2. Em `adicionar`, o id global é a quantidade de vetores que já existiam mais a posição do vetor no lote.
3. `top_k` devolve posições dentro do vetor que recebeu; converta a posição de volta com `candidatos[posicao]`.

### Verificação
```json
[
  { "id": "listas", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\ndef unit(g):\n    return [float(np.cos(np.radians(g))), float(np.sin(np.radians(g)))]\nbase = [unit(g) for g in [0, 120, 240, 10, 130, 250, 50, 110, 230]]\nivf = IndiceIVF(3)\nivf.treinar(base)\nivf.adicionar(base)",
    "expr": "sorted(sorted(l) for l in ivf.listas.values())", "expected": [[0, 3, 6], [1, 4, 7], [2, 5, 8]],
    "name": "Três grupos de três vetores, um por região do plano" },
  { "id": "uma-lista", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\ndef unit(g):\n    return [float(np.cos(np.radians(g))), float(np.sin(np.radians(g)))]\nbase = [unit(g) for g in [0, 120, 240, 10, 130, 250, 50, 110, 230]]\nivf = IndiceIVF(3, nprobe=1)\nivf.treinar(base)\nivf.adicionar(base)",
    "expr": "ivf.buscar(unit(3), k=2)", "expected": [[0, 3], 3],
    "name": "Com nprobe=1, pontua só os 3 vetores da lista mais próxima e devolve ids globais",
    "hint": "Os ids da resposta são os ids do documento, não a posição entre os candidatos." },
  { "id": "fronteira", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\ndef unit(g):\n    return [float(np.cos(np.radians(g))), float(np.sin(np.radians(g)))]\nbase = [unit(g) for g in [0, 120, 240, 10, 130, 250, 50, 110, 230]]\nivf = IndiceIVF(3, nprobe=1)\nivf.treinar(base)\nivf.adicionar(base)\num = ivf.buscar(unit(72), k=2)\nivf.nprobe = 2\ndois = ivf.buscar(unit(72), k=2)",
    "expr": "[um, dois]", "expected": [[[7, 1], 3], [[6, 7], 6]],
    "name": "Perto da fronteira, nprobe=1 perde o vizinho verdadeiro e nprobe=2 o recupera",
    "hint": "Sonde as nprobe listas cujos centróides têm maior produto interno com a consulta." },
  { "id": "todas", "checkpoint": 4, "kind": "expr",
    "setup": "import numpy as np\ndef unit(g):\n    return [float(np.cos(np.radians(g))), float(np.sin(np.radians(g)))]\nbase = [unit(g) for g in [0, 120, 240, 10, 130, 250, 50, 110, 230]]\nivf = IndiceIVF(3, nprobe=3)\nivf.treinar(base)\nivf.adicionar(base)",
    "expr": "[ivf.buscar(unit(187), k=3), ivf.buscar(unit(302), k=2)]", "expected": [[[8, 2, 4], 9], [[5, 0], 9]],
    "name": "Com nprobe = nlist, o resultado é o da busca exata e todos os vetores são avaliados" },
  { "id": "dois-lotes", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\ndef unit(g):\n    return [float(np.cos(np.radians(g))), float(np.sin(np.radians(g)))]\nbase = [unit(g) for g in [0, 120, 240, 10, 130, 250, 50, 110, 230]]\nivf = IndiceIVF(3, nprobe=1)\nivf.treinar(base)\nivf.adicionar(base[:6])\nivf.adicionar(base[6:])",
    "expr": "[sorted(sorted(l) for l in ivf.listas.values()), ivf.buscar(unit(48), k=1)]", "expected": [[[0, 3, 6], [1, 4, 7], [2, 5, 8]], [[6], 3]],
    "name": "adicionar em dois lotes continua os ids globais",
    "hint": "O segundo lote começa no id igual à quantidade de vetores já guardados." },
  { "id": "grupo-vazio", "checkpoint": 1, "kind": "expr",
    "setup": "import numpy as np\ndados = [[1, 0], [1, 0], [0, 1], [0.9, 0.1], [0.1, 0.9], [0.8, 0.2]]\nivf = IndiceIVF(3, nprobe=1)\nivf.treinar(dados)\nivf.adicionar(dados)",
    "expr": "[bool(np.isnan(ivf.centroides).any()), ivf.buscar([0.2, 1.0], k=2)]", "expected": [false, [[4, 2], 2]],
    "name": "Um grupo que fica vazio mantém o centróide antigo, sem nan",
    "hint": "Os dois primeiros vetores são iguais: o segundo centróide nunca ganha um vetor." }
]
```

### Soluções erradas
```python name="devolve a posição entre os candidatos"
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


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = np.zeros((0, 0))
        self.listas = {c: [] for c in range(nlist)}

    def treinar(self, E, iteracoes=5):
        X = normalizar_linhas(E)
        self.centroides = X[: self.nlist].copy()
        for _ in range(iteracoes):
            atribuicao = np.argmax(X @ self.centroides.T, axis=1)
            for c in range(self.nlist):
                membros = X[atribuicao == c]
                if len(membros) > 0:
                    media = membros.mean(axis=0)
                    self.centroides[c] = media / np.linalg.norm(media)

    def adicionar(self, E):
        X = normalizar_linhas(E)
        inicio = len(self.vetores)
        self.vetores = X if inicio == 0 else np.vstack([self.vetores, X])
        for deslocamento, c in enumerate(np.argmax(X @ self.centroides.T, axis=1)):
            self.listas[int(c)].append(inicio + deslocamento)

    def buscar(self, q, k=3):
        vq = normalizar_linhas([q])[0]
        sondadas = top_k(self.centroides @ vq, self.nprobe)
        candidatos = sorted(i for c in sondadas for i in self.listas[c])
        if not candidatos:
            return ([], 0)
        scores = self.vetores[candidatos] @ vq
        return (top_k(scores, k), len(candidatos))
```
```python name="sonda sempre uma lista só"
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


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = np.zeros((0, 0))
        self.listas = {c: [] for c in range(nlist)}

    def treinar(self, E, iteracoes=5):
        X = normalizar_linhas(E)
        self.centroides = X[: self.nlist].copy()
        for _ in range(iteracoes):
            atribuicao = np.argmax(X @ self.centroides.T, axis=1)
            for c in range(self.nlist):
                membros = X[atribuicao == c]
                if len(membros) > 0:
                    media = membros.mean(axis=0)
                    self.centroides[c] = media / np.linalg.norm(media)

    def adicionar(self, E):
        X = normalizar_linhas(E)
        inicio = len(self.vetores)
        self.vetores = X if inicio == 0 else np.vstack([self.vetores, X])
        for deslocamento, c in enumerate(np.argmax(X @ self.centroides.T, axis=1)):
            self.listas[int(c)].append(inicio + deslocamento)

    def buscar(self, q, k=3):
        vq = normalizar_linhas([q])[0]
        melhor = int(np.argmax(self.centroides @ vq))
        candidatos = sorted(self.listas[melhor])
        if not candidatos:
            return ([], 0)
        scores = self.vetores[candidatos] @ vq
        return ([candidatos[p] for p in top_k(scores, k)], len(candidatos))
```
```python name="sonda as listas mais distantes"
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


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = np.zeros((0, 0))
        self.listas = {c: [] for c in range(nlist)}

    def treinar(self, E, iteracoes=5):
        X = normalizar_linhas(E)
        self.centroides = X[: self.nlist].copy()
        for _ in range(iteracoes):
            atribuicao = np.argmax(X @ self.centroides.T, axis=1)
            for c in range(self.nlist):
                membros = X[atribuicao == c]
                if len(membros) > 0:
                    media = membros.mean(axis=0)
                    self.centroides[c] = media / np.linalg.norm(media)

    def adicionar(self, E):
        X = normalizar_linhas(E)
        inicio = len(self.vetores)
        self.vetores = X if inicio == 0 else np.vstack([self.vetores, X])
        for deslocamento, c in enumerate(np.argmax(X @ self.centroides.T, axis=1)):
            self.listas[int(c)].append(inicio + deslocamento)

    def buscar(self, q, k=3):
        vq = normalizar_linhas([q])[0]
        sondadas = np.argsort(self.centroides @ vq)[: self.nprobe].tolist()
        candidatos = sorted(i for c in sondadas for i in self.listas[c])
        if not candidatos:
            return ([], 0)
        scores = self.vetores[candidatos] @ vq
        return ([candidatos[p] for p in top_k(scores, k)], len(candidatos))
```
```python name="média de grupo vazio vira nan"
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


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = np.zeros((0, 0))
        self.listas = {c: [] for c in range(nlist)}

    def treinar(self, E, iteracoes=5):
        X = normalizar_linhas(E)
        self.centroides = X[: self.nlist].copy()
        for _ in range(iteracoes):
            atribuicao = np.argmax(X @ self.centroides.T, axis=1)
            for c in range(self.nlist):
                media = X[atribuicao == c].mean(axis=0)
                self.centroides[c] = media / np.linalg.norm(media)

    def adicionar(self, E):
        X = normalizar_linhas(E)
        inicio = len(self.vetores)
        self.vetores = X if inicio == 0 else np.vstack([self.vetores, X])
        for deslocamento, c in enumerate(np.argmax(X @ self.centroides.T, axis=1)):
            self.listas[int(c)].append(inicio + deslocamento)

    def buscar(self, q, k=3):
        vq = normalizar_linhas([q])[0]
        sondadas = top_k(self.centroides @ vq, self.nprobe)
        candidatos = sorted(i for c in sondadas for i in self.listas[c])
        if not candidatos:
            return ([], 0)
        scores = self.vetores[candidatos] @ vq
        return ([candidatos[p] for p in top_k(scores, k)], len(candidatos))
```
```python name="cada lote recomeça os ids em 0"
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


class IndiceIVF:
    def __init__(self, nlist, nprobe=1):
        self.nlist = nlist
        self.nprobe = nprobe
        self.centroides = None
        self.vetores = np.zeros((0, 0))
        self.listas = {c: [] for c in range(nlist)}

    def treinar(self, E, iteracoes=5):
        X = normalizar_linhas(E)
        self.centroides = X[: self.nlist].copy()
        for _ in range(iteracoes):
            atribuicao = np.argmax(X @ self.centroides.T, axis=1)
            for c in range(self.nlist):
                membros = X[atribuicao == c]
                if len(membros) > 0:
                    media = membros.mean(axis=0)
                    self.centroides[c] = media / np.linalg.norm(media)

    def adicionar(self, E):
        X = normalizar_linhas(E)
        inicio = len(self.vetores)
        self.vetores = X if inicio == 0 else np.vstack([self.vetores, X])
        for i, c in enumerate(np.argmax(X @ self.centroides.T, axis=1)):
            self.listas[int(c)].append(i)

    def buscar(self, q, k=3):
        vq = normalizar_linhas([q])[0]
        sondadas = top_k(self.centroides @ vq, self.nprobe)
        candidatos = sorted(i for c in sondadas for i in self.listas[c])
        if not candidatos:
            return ([], 0)
        scores = self.vetores[candidatos] @ vq
        return ([candidatos[p] for p in top_k(scores, k)], len(candidatos))
```

## Passo 5 · Exercício · Curva recall × custo e escolha de nprobe

Com o índice pronto, falta escolher `nprobe`. Escreva três funções:

1. `recall_em_k(aproximados, exatos)`: duas listas com uma lista de ids por consulta; devolve a média de $|\text{aprox} \cap \text{exato}| / |\text{exato}|$ (sem consultas: `0.0`).
2. `curva_recall_custo(indice, E, consultas, nprobes, k=3)`: calcula o gabarito exato de cada consulta (cosseno contra todas as linhas de `E`, com `top_k`); para cada `p` de `nprobes`, ajusta `indice.nprobe = p`, roda `indice.buscar(q, k)` em todas as consultas e registra `{"nprobe": p, "recall": ..., "fracao_avaliada": ...}`, onde `fracao_avaliada` é o total de vetores avaliados dividido por `len(consultas) * len(E)`. Arredonde os dois números com `round(..., 4)`. No fim, **devolva `indice.nprobe` ao valor que ele tinha** antes da medição.
3. `escolher_nprobe(curva, recall_minimo)`: devolve o **menor** `nprobe` da curva cujo recall é maior ou igual a `recall_minimo` (a curva pode vir em qualquer ordem), ou `None`.

O índice é qualquer objeto com o atributo `nprobe` e o método `buscar(q, k)` que devolve `(ids, avaliados)`, como o `IndiceIVF` do passo anterior. A verificação usa um índice pronto, com listas fixas.

### Instruções
1. Implemente `recall_em_k` dividindo pelo tamanho do resultado exato de cada consulta.
2. Em `curva_recall_custo`, compare cada `nprobe` com o gabarito da busca exata e meça a fração avaliada.
3. Restaure o `nprobe` original do índice ao terminar.
4. Implemente `escolher_nprobe` pelo menor `nprobe` que atinge o recall mínimo.

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


def normalizar_linhas(matriz):
    arr = np.asarray(matriz, dtype=float)
    normas = np.linalg.norm(arr, axis=1, keepdims=True)
    return arr / np.where(normas == 0, 1.0, normas)


def recall_em_k(aproximados, exatos):
    pass


def curva_recall_custo(indice, E, consultas, nprobes, k=3):
    pass


def escolher_nprobe(curva, recall_minimo):
    pass


if __name__ == "__main__":
    print(recall_em_k([[0, 2, 5], [1, 2, 3]], [[0, 1, 2], [1, 2, 3]]))
    curva = [
        {"nprobe": 1, "recall": 0.81, "fracao_avaliada": 0.05},
        {"nprobe": 4, "recall": 0.96, "fracao_avaliada": 0.18},
        {"nprobe": 16, "recall": 0.995, "fracao_avaliada": 0.61},
    ]
    print(escolher_nprobe(curva, 0.95))
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


def recall_em_k(aproximados, exatos):
    if not exatos:
        return 0.0
    total = 0.0
    for aprox, exato in zip(aproximados, exatos):
        total += len(set(aprox) & set(exato)) / len(set(exato))
    return total / len(exatos)


def curva_recall_custo(indice, E, consultas, nprobes, k=3):
    base = normalizar_linhas(E)
    Q = normalizar_linhas(consultas)
    exatos = [top_k(base @ q, k) for q in Q]
    original = indice.nprobe
    curva = []
    for p in nprobes:
        indice.nprobe = p
        aproximados = []
        avaliados = 0
        for q in Q:
            ids, n = indice.buscar(q, k)
            aproximados.append(ids)
            avaliados += n
        curva.append({
            "nprobe": p,
            "recall": round(recall_em_k(aproximados, exatos), 4),
            "fracao_avaliada": round(avaliados / (len(Q) * len(base)), 4),
        })
    indice.nprobe = original
    return curva


def escolher_nprobe(curva, recall_minimo):
    bons = [ponto["nprobe"] for ponto in curva if ponto["recall"] >= recall_minimo]
    return min(bons) if bons else None


if __name__ == "__main__":
    print(recall_em_k([[0, 2, 5], [1, 2, 3]], [[0, 1, 2], [1, 2, 3]]))
    curva = [
        {"nprobe": 1, "recall": 0.81, "fracao_avaliada": 0.05},
        {"nprobe": 4, "recall": 0.96, "fracao_avaliada": 0.18},
        {"nprobe": 16, "recall": 0.995, "fracao_avaliada": 0.61},
    ]
    print(escolher_nprobe(curva, 0.95))
```

### Dicas
1. Se o índice devolveu menos de `k` ids, o que faltou conta como perdido: o denominador é o exato.
2. Guarde `indice.nprobe` numa variável antes do laço e devolva o valor no fim.
3. Em `escolher_nprobe`, filtre os pontos que atingem o recall e fique com o menor `nprobe` entre eles.

### Verificação
```json
[
  { "id": "recall-medio", "checkpoint": 1, "kind": "call", "function": "recall_em_k",
    "args": [[[0, 2, 5], [1, 2, 3]], [[0, 1, 2], [1, 2, 3]]], "expected": 0.833333, "tolerance": 1e-5,
    "name": "Média do recall de duas consultas (2/3 e 1)" },
  { "id": "recall-curto", "checkpoint": 1, "kind": "call", "function": "recall_em_k",
    "args": [[[0], [5, 6]], [[0, 1], [5, 6]]], "expected": 0.75, "tolerance": 1e-9,
    "name": "Resultado aproximado mais curto que k conta o que faltou como perdido",
    "hint": "Divida pelo tamanho do exato, não do aproximado." },
  { "id": "recall-vazio", "checkpoint": 1, "kind": "call", "function": "recall_em_k", "args": [[], []], "expected": 0.0,
    "name": "Sem consultas, recall 0.0" },
  { "id": "curva", "checkpoint": 2, "kind": "expr",
    "setup": "import numpy as np\ndef unit(g):\n    return [float(np.cos(np.radians(g))), float(np.sin(np.radians(g)))]\nclass IndiceFixo:\n    def __init__(self, E, centroides, listas):\n        self.E = np.asarray(E, dtype=float)\n        self.C = np.asarray(centroides, dtype=float)\n        self.listas = listas\n        self.nprobe = 1\n    def buscar(self, q, k=3):\n        q = np.asarray(q, dtype=float)\n        ordem = np.argsort(-(self.C @ q), kind='stable')[:self.nprobe]\n        cand = sorted(i for c in ordem for i in self.listas[int(c)])\n        s = self.E[cand] @ q\n        return ([cand[int(p)] for p in np.argsort(-s, kind='stable')[:k]], len(cand))\nbase = [unit(g) for g in [0, 120, 240, 10, 130, 250, 50, 110, 230]]\nindice = IndiceFixo(base, [unit(19.7), unit(120), unit(240)], {0: [0, 3, 6], 1: [1, 4, 7], 2: [2, 5, 8]})\nconsultas = [unit(g) for g in [3, 72, 187, 302, 127]]\ncurva = curva_recall_custo(indice, base, consultas, [1, 2, 3], k=2)",
    "expr": "curva", "expected": [
      { "nprobe": 1, "recall": 0.8, "fracao_avaliada": 0.3333 },
      { "nprobe": 2, "recall": 1.0, "fracao_avaliada": 0.6667 },
      { "nprobe": 3, "recall": 1.0, "fracao_avaliada": 1.0 }], "tolerance": 1e-6,
    "name": "Curva com nprobe 1, 2 e 3 sobre um índice de 9 vetores em 3 listas",
    "hint": "Ajuste indice.nprobe antes de cada rodada de buscas." },
  { "id": "curva-restaura", "checkpoint": 3, "kind": "expr",
    "setup": "import numpy as np\ndef unit(g):\n    return [float(np.cos(np.radians(g))), float(np.sin(np.radians(g)))]\nclass IndiceFixo:\n    def __init__(self, E, centroides, listas):\n        self.E = np.asarray(E, dtype=float)\n        self.C = np.asarray(centroides, dtype=float)\n        self.listas = listas\n        self.nprobe = 1\n    def buscar(self, q, k=3):\n        q = np.asarray(q, dtype=float)\n        ordem = np.argsort(-(self.C @ q), kind='stable')[:self.nprobe]\n        cand = sorted(i for c in ordem for i in self.listas[int(c)])\n        s = self.E[cand] @ q\n        return ([cand[int(p)] for p in np.argsort(-s, kind='stable')[:k]], len(cand))\nbase = [unit(g) for g in [0, 120, 240, 10, 130, 250, 50, 110, 230]]\nindice = IndiceFixo(base, [unit(19.7), unit(120), unit(240)], {0: [0, 3, 6], 1: [1, 4, 7], 2: [2, 5, 8]})\nindice.nprobe = 2\ncurva = curva_recall_custo(indice, base, [unit(72)], [1, 3], k=1)",
    "expr": "[curva, indice.nprobe]",
    "expected": [[{ "nprobe": 1, "recall": 0.0, "fracao_avaliada": 0.3333 }, { "nprobe": 3, "recall": 1.0, "fracao_avaliada": 1.0 }], 2],
    "tolerance": 1e-6, "name": "Medir não muda o índice: o nprobe original volta no fim" },
  { "id": "escolhe", "checkpoint": 4, "kind": "call", "function": "escolher_nprobe",
    "args": [[{ "nprobe": 16, "recall": 0.995, "fracao_avaliada": 0.61 }, { "nprobe": 1, "recall": 0.81, "fracao_avaliada": 0.05 },
              { "nprobe": 4, "recall": 0.96, "fracao_avaliada": 0.18 }, { "nprobe": 8, "recall": 0.98, "fracao_avaliada": 0.33 }], 0.95],
    "expected": 4, "name": "O menor nprobe que atinge o recall, com a curva fora de ordem" },
  { "id": "escolhe-borda", "checkpoint": 4, "kind": "call", "function": "escolher_nprobe",
    "args": [[{ "nprobe": 2, "recall": 0.9, "fracao_avaliada": 0.1 }, { "nprobe": 6, "recall": 0.95, "fracao_avaliada": 0.3 }], 0.95],
    "expected": 6, "name": "Recall igual ao mínimo serve" },
  { "id": "escolhe-nenhum", "checkpoint": 4, "kind": "call", "function": "escolher_nprobe",
    "args": [[{ "nprobe": 2, "recall": 0.7, "fracao_avaliada": 0.1 }], 0.9], "expected": null,
    "name": "Nenhum ponto atinge o recall: None" }
]
```

### Soluções erradas
```python name="divide pelo tamanho do aproximado"
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


def recall_em_k(aproximados, exatos):
    if not exatos:
        return 0.0
    total = 0.0
    for aprox, exato in zip(aproximados, exatos):
        total += len(set(aprox) & set(exato)) / max(len(set(aprox)), 1)
    return total / len(exatos)


def curva_recall_custo(indice, E, consultas, nprobes, k=3):
    base = normalizar_linhas(E)
    Q = normalizar_linhas(consultas)
    exatos = [top_k(base @ q, k) for q in Q]
    original = indice.nprobe
    curva = []
    for p in nprobes:
        indice.nprobe = p
        aproximados = []
        avaliados = 0
        for q in Q:
            ids, n = indice.buscar(q, k)
            aproximados.append(ids)
            avaliados += n
        curva.append({
            "nprobe": p,
            "recall": round(recall_em_k(aproximados, exatos), 4),
            "fracao_avaliada": round(avaliados / (len(Q) * len(base)), 4),
        })
    indice.nprobe = original
    return curva


def escolher_nprobe(curva, recall_minimo):
    bons = [ponto["nprobe"] for ponto in curva if ponto["recall"] >= recall_minimo]
    return min(bons) if bons else None
```
```python name="esquece de ajustar o nprobe"
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


def recall_em_k(aproximados, exatos):
    if not exatos:
        return 0.0
    total = 0.0
    for aprox, exato in zip(aproximados, exatos):
        total += len(set(aprox) & set(exato)) / len(set(exato))
    return total / len(exatos)


def curva_recall_custo(indice, E, consultas, nprobes, k=3):
    base = normalizar_linhas(E)
    Q = normalizar_linhas(consultas)
    exatos = [top_k(base @ q, k) for q in Q]
    curva = []
    for p in nprobes:
        aproximados = []
        avaliados = 0
        for q in Q:
            ids, n = indice.buscar(q, k)
            aproximados.append(ids)
            avaliados += n
        curva.append({
            "nprobe": p,
            "recall": round(recall_em_k(aproximados, exatos), 4),
            "fracao_avaliada": round(avaliados / (len(Q) * len(base)), 4),
        })
    return curva


def escolher_nprobe(curva, recall_minimo):
    bons = [ponto["nprobe"] for ponto in curva if ponto["recall"] >= recall_minimo]
    return min(bons) if bons else None
```
```python name="compara o índice com ele mesmo"
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


def recall_em_k(aproximados, exatos):
    if not exatos:
        return 0.0
    total = 0.0
    for aprox, exato in zip(aproximados, exatos):
        total += len(set(aprox) & set(exato)) / len(set(exato))
    return total / len(exatos)


def curva_recall_custo(indice, E, consultas, nprobes, k=3):
    base = normalizar_linhas(E)
    Q = normalizar_linhas(consultas)
    original = indice.nprobe
    curva = []
    for p in nprobes:
        indice.nprobe = p
        aproximados = []
        avaliados = 0
        for q in Q:
            ids, n = indice.buscar(q, k)
            aproximados.append(ids)
            avaliados += n
        curva.append({
            "nprobe": p,
            "recall": round(recall_em_k(aproximados, aproximados), 4),
            "fracao_avaliada": round(avaliados / (len(Q) * len(base)), 4),
        })
    indice.nprobe = original
    return curva


def escolher_nprobe(curva, recall_minimo):
    bons = [ponto["nprobe"] for ponto in curva if ponto["recall"] >= recall_minimo]
    return min(bons) if bons else None
```
```python name="deixa o índice com o último nprobe"
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


def recall_em_k(aproximados, exatos):
    if not exatos:
        return 0.0
    total = 0.0
    for aprox, exato in zip(aproximados, exatos):
        total += len(set(aprox) & set(exato)) / len(set(exato))
    return total / len(exatos)


def curva_recall_custo(indice, E, consultas, nprobes, k=3):
    base = normalizar_linhas(E)
    Q = normalizar_linhas(consultas)
    exatos = [top_k(base @ q, k) for q in Q]
    curva = []
    for p in nprobes:
        indice.nprobe = p
        aproximados = []
        avaliados = 0
        for q in Q:
            ids, n = indice.buscar(q, k)
            aproximados.append(ids)
            avaliados += n
        curva.append({
            "nprobe": p,
            "recall": round(recall_em_k(aproximados, exatos), 4),
            "fracao_avaliada": round(avaliados / (len(Q) * len(base)), 4),
        })
    return curva


def escolher_nprobe(curva, recall_minimo):
    bons = [ponto["nprobe"] for ponto in curva if ponto["recall"] >= recall_minimo]
    return min(bons) if bons else None
```
```python name="fica com o primeiro da lista que atinge o recall"
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


def recall_em_k(aproximados, exatos):
    if not exatos:
        return 0.0
    total = 0.0
    for aprox, exato in zip(aproximados, exatos):
        total += len(set(aprox) & set(exato)) / len(set(exato))
    return total / len(exatos)


def curva_recall_custo(indice, E, consultas, nprobes, k=3):
    base = normalizar_linhas(E)
    Q = normalizar_linhas(consultas)
    exatos = [top_k(base @ q, k) for q in Q]
    original = indice.nprobe
    curva = []
    for p in nprobes:
        indice.nprobe = p
        aproximados = []
        avaliados = 0
        for q in Q:
            ids, n = indice.buscar(q, k)
            aproximados.append(ids)
            avaliados += n
        curva.append({
            "nprobe": p,
            "recall": round(recall_em_k(aproximados, exatos), 4),
            "fracao_avaliada": round(avaliados / (len(Q) * len(base)), 4),
        })
    indice.nprobe = original
    return curva


def escolher_nprobe(curva, recall_minimo):
    for ponto in curva:
        if ponto["recall"] >= recall_minimo:
            return ponto["nprobe"]
    return None
```
```python name="recall estritamente maior que o mínimo"
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


def recall_em_k(aproximados, exatos):
    if not exatos:
        return 0.0
    total = 0.0
    for aprox, exato in zip(aproximados, exatos):
        total += len(set(aprox) & set(exato)) / len(set(exato))
    return total / len(exatos)


def curva_recall_custo(indice, E, consultas, nprobes, k=3):
    base = normalizar_linhas(E)
    Q = normalizar_linhas(consultas)
    exatos = [top_k(base @ q, k) for q in Q]
    original = indice.nprobe
    curva = []
    for p in nprobes:
        indice.nprobe = p
        aproximados = []
        avaliados = 0
        for q in Q:
            ids, n = indice.buscar(q, k)
            aproximados.append(ids)
            avaliados += n
        curva.append({
            "nprobe": p,
            "recall": round(recall_em_k(aproximados, exatos), 4),
            "fracao_avaliada": round(avaliados / (len(Q) * len(base)), 4),
        })
    indice.nprobe = original
    return curva


def escolher_nprobe(curva, recall_minimo):
    bons = [ponto["nprobe"] for ponto in curva if ponto["recall"] > recall_minimo]
    return min(bons) if bons else None
```

## Passo 6 · Leitura · HNSW, LSH e quantização de produto

O IVF é o índice mais fácil de entender, não o único. Três outras ideias aparecem em quase todo banco vetorial, e você vai encontrá-las como parâmetros de configuração.

#### HNSW: um grafo para navegar

O **HNSW** (*hierarchical navigable small world*) liga cada vetor a algumas dezenas de vizinhos próximos (o parâmetro `M`), formando um grafo. A busca é **gulosa**: começa num nó de entrada e pula sempre para o vizinho mais perto da consulta, até não melhorar mais. Para não andar devagar num grafo enorme, há **camadas**: cada vetor entra nas camadas de cima com probabilidade cada vez menor, então as camadas altas têm poucos nós ligados por arestas longas, como vias expressas. A busca atravessa as camadas de cima para chegar perto do alvo e refina na camada de baixo, que tem todos os vetores. O parâmetro `ef_search` é o tamanho da lista de candidatos mantida nessa descida: maior, mais recall e mais tempo. O HNSW costuma dar recall alto com pouca latência e aceita inserções sem retreinar, mas guarda as arestas além dos vetores, o que aumenta a memória.

#### LSH: hiperplanos aleatórios

O **LSH** (*locality-sensitive hashing*) sorteia $b$ hiperplanos pela origem e guarda, para cada vetor, um bit por hiperplano: de que lado ele ficou. Dois vetores com ângulo $\theta$ entre si caem do mesmo lado de um hiperplano aleatório com probabilidade

$$
P(\text{mesmo bit}) = 1 - \frac{\theta}{\pi}
$$

então vetores parecidos tendem a ter a mesma assinatura e cair no mesmo balde. Na busca, só o balde da consulta é pontuado; várias tabelas com hiperplanos diferentes reduzem a chance de perder um vizinho.

#### Quantização de produto: menos memória

A **quantização de produto** (*PQ*) ataca a memória, não o tempo de varredura. Cada vetor de dimensão $d$ é cortado em $m$ pedaços de $d/m$ coordenadas; para cada pedaço há um dicionário (*codebook*) de até 256 centróides, aprendido com k-means. O vetor passa a ser guardado como $m$ códigos de **1 byte**: o índice do centróide mais próximo de cada pedaço.

```python
d, m = 768, 96
float32 = d * 4          # 3072 bytes por vetor
pq = m * 1               # 96 bytes por vetor: 32 vezes menos
```

A distância passa a ser calculada contra os centróides, não contra o vetor original, então ela é aproximada e o recall cai. Na prática, PQ aparece combinada com IVF (IVF-PQ): as listas guardam códigos, e os melhores candidatos são **re-pontuados** com os vetores exatos guardados à parte, quando a memória permite.

## Passo 7 · Exercício · Quantização de produto: codificar e reconstruir

Escreva três funções:

1. `codificar_pq(E, codebooks)`: `E` tem uma linha por vetor ($N \times d$); `codebooks` é uma lista de $m$ dicionários, e `codebooks[j]` tem os centróides do pedaço `j` (forma $K \times d/m$). Se `d` não for divisível por `m`, levante `ValueError` com uma mensagem que contenha `"divisível"`. Para cada vetor e cada pedaço `j` (colunas de `j * d/m` até `(j + 1) * d/m`), o código é o índice do centróide de **menor distância euclidiana** (no empate, o menor índice). Devolva a matriz de códigos como lista de listas de `int`.
2. `reconstruir_pq(codigos, codebooks)`: devolve, para cada linha de códigos, o vetor aproximado formado pelos centróides escolhidos, concatenados na ordem dos pedaços, como lista de listas de `float`.
3. `compressao(dim, m, bytes_por_valor=4)`: quantas vezes o vetor original (`dim` números de `bytes_por_valor` bytes) é maior que os `m` códigos de 1 byte.

Exemplo: com `d = 4`, `m = 2` e os dois dicionários `[[1, 1], [-1, -1]]`, o vetor `[0.9, 1.2, -0.8, -1.1]` vira os códigos `[0, 1]`, que reconstroem `[1.0, 1.0, -1.0, -1.0]`.

### Instruções
1. Valide a divisão de `d` por `m` e calcule o tamanho de cada pedaço.
2. Codifique cada pedaço pelo centróide de menor distância euclidiana do seu próprio dicionário.
3. Reconstrua cada vetor concatenando os centróides indicados pelos códigos.
4. Calcule a taxa de compressão.

### Código inicial
```python
import numpy as np


def codificar_pq(E, codebooks):
    pass


def reconstruir_pq(codigos, codebooks):
    pass


def compressao(dim, m, bytes_por_valor=4):
    pass


if __name__ == "__main__":
    livros = [[[1.0, 1.0], [-1.0, -1.0]], [[1.0, 1.0], [-1.0, -1.0]]]
    codigos = codificar_pq([[0.9, 1.2, -0.8, -1.1]], livros)
    print(codigos, reconstruir_pq(codigos, livros))
    print(compressao(768, 96))
```

### Solução
```python
import numpy as np


def codificar_pq(E, codebooks):
    X = np.asarray(E, dtype=float)
    m = len(codebooks)
    if X.shape[1] % m != 0:
        raise ValueError("a dimensão precisa ser divisível pelo número de pedaços")
    tamanho = X.shape[1] // m
    codigos = np.zeros((X.shape[0], m), dtype=int)
    for j in range(m):
        pedaco = X[:, j * tamanho:(j + 1) * tamanho]
        centros = np.asarray(codebooks[j], dtype=float)
        distancias = np.linalg.norm(pedaco[:, None, :] - centros[None, :, :], axis=2)
        codigos[:, j] = np.argmin(distancias, axis=1)
    return codigos.tolist()


def reconstruir_pq(codigos, codebooks):
    vetores = []
    for linha in codigos:
        partes = [np.asarray(codebooks[j], dtype=float)[c] for j, c in enumerate(linha)]
        vetores.append(np.concatenate(partes).tolist())
    return vetores


def compressao(dim, m, bytes_por_valor=4):
    return dim * bytes_por_valor / m


if __name__ == "__main__":
    livros = [[[1.0, 1.0], [-1.0, -1.0]], [[1.0, 1.0], [-1.0, -1.0]]]
    codigos = codificar_pq([[0.9, 1.2, -0.8, -1.1]], livros)
    print(codigos, reconstruir_pq(codigos, livros))
    print(compressao(768, 96))
```

### Dicas
1. Com `d = 6` e `m = 2`, cada pedaço tem 3 coordenadas: o pedaço 1 vai da coluna 3 à 5.
2. O centróide de maior produto interno não é o mais próximo quando os centróides têm normas diferentes.
3. Cada pedaço usa o **seu** dicionário, `codebooks[j]`, também na reconstrução.

### Verificação
```json
[
  { "id": "exemplo", "checkpoint": 2, "kind": "call", "function": "codificar_pq",
    "args": [[[0.9, 1.2, -0.8, -1.1], [-1.0, -0.7, 1.3, 0.9]], [[[1.0, 1.0], [-1.0, -1.0]], [[1.0, 1.0], [-1.0, -1.0]]]],
    "expected": [[0, 1], [1, 0]], "name": "Dois vetores, dois pedaços de 2 coordenadas" },
  { "id": "pedaco-3", "checkpoint": 1, "kind": "call", "function": "codificar_pq",
    "args": [[[1.0, 0.1, 0.0, 5.0, 5.0, 4.0], [0.0, 1.0, 1.0, -1.0, 0.0, 0.0]],
             [[[1, 0, 0], [0, 1, 1], [3, 3, 3]], [[5, 5, 5], [0, 0, 0], [-1, 0, 0]]]],
    "expected": [[0, 0], [1, 2]], "name": "d = 6 e m = 2: pedaços de 3 coordenadas, dicionários de 3 centróides",
    "hint": "O tamanho do pedaço é d / m, não m." },
  { "id": "euclidiana", "checkpoint": 2, "kind": "call", "function": "codificar_pq",
    "args": [[[1.0, 0.0, 0.0, 1.0]], [[[0.9, 0.0], [3.0, 0.5]], [[0.0, 1.0], [0.0, 0.2]]]],
    "expected": [[0, 0]], "name": "O código é o centróide mais próximo, não o de maior produto interno",
    "hint": "Compare distâncias euclidianas." },
  { "id": "nao-divisivel", "checkpoint": 1, "kind": "expr", "expr": "codificar_pq([[1.0, 2.0, 3.0, 4.0, 5.0]], [[[0, 0]], [[0, 0]]])",
    "raises": "ValueError", "message_contains": "divisível", "name": "d = 5 com m = 2 é recusado" },
  { "id": "reconstroi", "checkpoint": 3, "kind": "call", "function": "reconstruir_pq",
    "args": [[[0, 0], [1, 2]], [[[1, 0, 0], [0, 1, 1], [3, 3, 3]], [[5, 5, 5], [0, 0, 0], [-1, 0, 0]]]],
    "expected": [[1.0, 0.0, 0.0, 5.0, 5.0, 5.0], [0.0, 1.0, 1.0, -1.0, 0.0, 0.0]], "tolerance": 1e-9,
    "name": "Reconstrução concatena o centróide de cada pedaço, do seu dicionário" },
  { "id": "ida-e-volta", "checkpoint": 3, "kind": "expr",
    "setup": "livros = [[[0.0, 0.0], [2.0, 2.0], [4.0, 0.0]], [[1.0, -1.0], [0.0, 3.0]]]\nE = [[2.1, 1.8, 0.2, 2.5], [3.7, 0.4, 0.9, -1.2]]",
    "expr": "reconstruir_pq(codificar_pq(E, livros), livros)", "expected": [[2.0, 2.0, 0.0, 3.0], [4.0, 0.0, 1.0, -1.0]], "tolerance": 1e-9,
    "name": "Codificar e reconstruir devolve o centróide mais próximo de cada pedaço" },
  { "id": "compressao", "checkpoint": 4, "kind": "expr",
    "expr": "[compressao(768, 96), compressao(1024, 128, bytes_por_valor=2)]", "expected": [32.0, 16.0], "tolerance": 1e-9,
    "name": "768 floats de 4 bytes em 96 códigos: 32 vezes; 1024 de 2 bytes em 128: 16 vezes" }
]
```

### Soluções erradas
```python name="pega o centróide mais distante"
import numpy as np


def codificar_pq(E, codebooks):
    X = np.asarray(E, dtype=float)
    m = len(codebooks)
    if X.shape[1] % m != 0:
        raise ValueError("a dimensão precisa ser divisível pelo número de pedaços")
    tamanho = X.shape[1] // m
    codigos = np.zeros((X.shape[0], m), dtype=int)
    for j in range(m):
        pedaco = X[:, j * tamanho:(j + 1) * tamanho]
        centros = np.asarray(codebooks[j], dtype=float)
        distancias = np.linalg.norm(pedaco[:, None, :] - centros[None, :, :], axis=2)
        codigos[:, j] = np.argmax(distancias, axis=1)
    return codigos.tolist()


def reconstruir_pq(codigos, codebooks):
    vetores = []
    for linha in codigos:
        partes = [np.asarray(codebooks[j], dtype=float)[c] for j, c in enumerate(linha)]
        vetores.append(np.concatenate(partes).tolist())
    return vetores


def compressao(dim, m, bytes_por_valor=4):
    return dim * bytes_por_valor / m
```
```python name="maior produto interno no lugar da distância"
import numpy as np


def codificar_pq(E, codebooks):
    X = np.asarray(E, dtype=float)
    m = len(codebooks)
    if X.shape[1] % m != 0:
        raise ValueError("a dimensão precisa ser divisível pelo número de pedaços")
    tamanho = X.shape[1] // m
    codigos = np.zeros((X.shape[0], m), dtype=int)
    for j in range(m):
        pedaco = X[:, j * tamanho:(j + 1) * tamanho]
        centros = np.asarray(codebooks[j], dtype=float)
        codigos[:, j] = np.argmax(pedaco @ centros.T, axis=1)
    return codigos.tolist()


def reconstruir_pq(codigos, codebooks):
    vetores = []
    for linha in codigos:
        partes = [np.asarray(codebooks[j], dtype=float)[c] for j, c in enumerate(linha)]
        vetores.append(np.concatenate(partes).tolist())
    return vetores


def compressao(dim, m, bytes_por_valor=4):
    return dim * bytes_por_valor / m
```
```python name="fatia com m no lugar do tamanho do pedaço"
import numpy as np


def codificar_pq(E, codebooks):
    X = np.asarray(E, dtype=float)
    m = len(codebooks)
    if X.shape[1] % m != 0:
        raise ValueError("a dimensão precisa ser divisível pelo número de pedaços")
    codigos = np.zeros((X.shape[0], m), dtype=int)
    for j in range(m):
        pedaco = X[:, j * m:(j + 1) * m]
        centros = np.asarray(codebooks[j], dtype=float)
        distancias = np.linalg.norm(pedaco[:, None, :] - centros[None, :, :], axis=2)
        codigos[:, j] = np.argmin(distancias, axis=1)
    return codigos.tolist()


def reconstruir_pq(codigos, codebooks):
    vetores = []
    for linha in codigos:
        partes = [np.asarray(codebooks[j], dtype=float)[c] for j, c in enumerate(linha)]
        vetores.append(np.concatenate(partes).tolist())
    return vetores


def compressao(dim, m, bytes_por_valor=4):
    return dim * bytes_por_valor / m
```
```python name="não valida a divisão e descarta colunas"
import numpy as np


def codificar_pq(E, codebooks):
    X = np.asarray(E, dtype=float)
    m = len(codebooks)
    tamanho = X.shape[1] // m
    codigos = np.zeros((X.shape[0], m), dtype=int)
    for j in range(m):
        pedaco = X[:, j * tamanho:(j + 1) * tamanho]
        centros = np.asarray(codebooks[j], dtype=float)
        distancias = np.linalg.norm(pedaco[:, None, :] - centros[None, :, :], axis=2)
        codigos[:, j] = np.argmin(distancias, axis=1)
    return codigos.tolist()


def reconstruir_pq(codigos, codebooks):
    vetores = []
    for linha in codigos:
        partes = [np.asarray(codebooks[j], dtype=float)[c] for j, c in enumerate(linha)]
        vetores.append(np.concatenate(partes).tolist())
    return vetores


def compressao(dim, m, bytes_por_valor=4):
    return dim * bytes_por_valor / m
```
```python name="reconstrói tudo com o primeiro dicionário"
import numpy as np


def codificar_pq(E, codebooks):
    X = np.asarray(E, dtype=float)
    m = len(codebooks)
    if X.shape[1] % m != 0:
        raise ValueError("a dimensão precisa ser divisível pelo número de pedaços")
    tamanho = X.shape[1] // m
    codigos = np.zeros((X.shape[0], m), dtype=int)
    for j in range(m):
        pedaco = X[:, j * tamanho:(j + 1) * tamanho]
        centros = np.asarray(codebooks[j], dtype=float)
        distancias = np.linalg.norm(pedaco[:, None, :] - centros[None, :, :], axis=2)
        codigos[:, j] = np.argmin(distancias, axis=1)
    return codigos.tolist()


def reconstruir_pq(codigos, codebooks):
    livro = np.asarray(codebooks[0], dtype=float)
    return [np.concatenate([livro[c] for c in linha]).tolist() for linha in codigos]


def compressao(dim, m, bytes_por_valor=4):
    return dim * bytes_por_valor / m
```
```python name="compressão sem os bytes por valor"
import numpy as np


def codificar_pq(E, codebooks):
    X = np.asarray(E, dtype=float)
    m = len(codebooks)
    if X.shape[1] % m != 0:
        raise ValueError("a dimensão precisa ser divisível pelo número de pedaços")
    tamanho = X.shape[1] // m
    codigos = np.zeros((X.shape[0], m), dtype=int)
    for j in range(m):
        pedaco = X[:, j * tamanho:(j + 1) * tamanho]
        centros = np.asarray(codebooks[j], dtype=float)
        distancias = np.linalg.norm(pedaco[:, None, :] - centros[None, :, :], axis=2)
        codigos[:, j] = np.argmin(distancias, axis=1)
    return codigos.tolist()


def reconstruir_pq(codigos, codebooks):
    vetores = []
    for linha in codigos:
        partes = [np.asarray(codebooks[j], dtype=float)[c] for j, c in enumerate(linha)]
        vetores.append(np.concatenate(partes).tolist())
    return vetores


def compressao(dim, m, bytes_por_valor=4):
    return dim / m
```

## Passo 8 · Quiz · IVF, HNSW e quantização

### Pergunta
Num IVF com `nlist = 256`, alguém sobe `nprobe` para 256 "para garantir o recall". O que acontece?
- [ ] A busca fica 256 vezes mais rápida que a exata.
- [x] O recall vira o da busca exata, mas a consulta fica um pouco mais lenta que a força bruta: todos os vetores são pontuados e ainda há a comparação com os 256 centróides.
- [ ] O recall continua aproximado, porque o k-means pode ter errado o grupo de alguns vetores.
- [ ] O índice passa a pontuar só os centróides, e a busca fica exata e rápida.
> Todo vetor está em alguma lista; sondando todas, todos são pontuados e o resultado é o exato. O ganho do IVF vem de sondar poucas listas ($\text{nprobe} \ll \text{nlist}$), aceitando perder vizinhos que caem do outro lado das fronteiras.

### Pergunta
No HNSW, para que servem as camadas superiores, com poucos nós e arestas longas?
- [ ] Guardar cópias dos vetores para o caso de falha da camada de baixo.
- [x] Levar a busca gulosa rapidamente para a região certa do espaço, antes de refinar entre os vizinhos próximos na camada de baixo.
- [ ] Guardar os centróides do k-means, como no IVF.
- [ ] Comprimir os vetores em códigos de 1 byte.
> Sem as camadas altas, a busca gulosa daria muitos passos curtos até chegar perto do alvo. As arestas longas funcionam como vias expressas; a camada de baixo, com todos os vetores, faz o refino. `ef_search` regula quantos candidatos são mantidos nessa descida.

### Pergunta
Um índice IVF-PQ com 96 códigos por vetor (dimensão 768) tem recall@10 de 0,78 contra a busca exata, mesmo com `nprobe` alto. O que mais provavelmente ajuda?
- [ ] Aumentar `nprobe` mais ainda.
- [ ] Trocar o cosseno pela distância euclidiana.
- [x] Re-pontuar os melhores candidatos (por exemplo, os 100 primeiros) com os vetores originais, ou usar mais pedaços por vetor, aceitando mais memória.
- [ ] Diminuir `nlist` para 1.
> Se aumentar `nprobe` não resolve, o erro vem da quantização: as distâncias calculadas contra os centróides de cada pedaço são aproximadas e trocam a ordem dos vizinhos. Re-pontuar uma lista curta com os vetores exatos, ou usar códigos mais finos, devolve a precisão com custo controlado.
