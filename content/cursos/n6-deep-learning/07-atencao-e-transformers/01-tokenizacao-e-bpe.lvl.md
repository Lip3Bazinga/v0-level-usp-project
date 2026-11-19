---
slug: n6-m7-01-tokenizacao-e-bpe
titulo: Tokenização e BPE do zero
descricao: 'De caracteres a subpalavras: o algoritmo Byte Pair Encoding, treino do vocabulário, codificação e decodificação, e por que a tokenização explica várias esquisitices dos LLMs.'
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
- Implementar o treino do BPE (contar pares, mesclar o mais frequente) e a codificação/decodificação
- Medir a compressão (caracteres por token) e o efeito do tamanho do vocabulário
- Explicar efeitos da tokenização em LLMs (contagem de letras, línguas, números)
---

## Passo 1 · Leitura · Nem caracteres, nem palavras

Uma rede neural trabalha com números, e um texto precisa virar uma sequência de inteiros antes de entrar nela. Cada inteiro é um **token**, e a escolha do que conta como token decide o tamanho de duas coisas ao mesmo tempo: o do vocabulário e o das sequências.

Com **caracteres**, o vocabulário é minúsculo (o corpus deste módulo tem 29 símbolos), mas as sequências ficam longas. Uma frase de 40 letras ocupa 40 posições, e você vai ver nas próximas lições que o custo da atenção cresce com o quadrado do comprimento. Além disso, o modelo gasta capacidade reaprendendo que `q` costuma vir seguido de `u`.

Com **palavras**, as sequências ficam curtas, mas o vocabulário não fecha: `cantar`, `cantava`, `cantaríamos`, nomes próprios, erros de digitação. Qualquer palavra fora da lista vira um símbolo de "desconhecido", e a informação se perde.

O meio do caminho são as **subpalavras**: pedaços frequentes ganham um token próprio, e o que é raro continua sendo escrito com pedaços menores. O algoritmo mais usado para montar esses pedaços é o BPE (*Byte Pair Encoding*), e a versão desta lição parte dos **bytes** do texto em UTF-8.

```python
print(list("ção".encode("utf-8")))  # [195, 167, 195, 163, 111]
print(len("ção"), len("ção".encode("utf-8")))  # 3 5
```

Em UTF-8, as letras sem acento ocupam um byte (o `o` é 111) e as acentuadas do português ocupam dois (`ç` é 195 seguido de 167, `ã` é 195 seguido de 163). Como um byte vale de 0 a 255, o vocabulário inicial tem exatamente **256 tokens** e nenhum texto fica de fora: qualquer caractere, de qualquer língua, é uma sequência de bytes.

A partir daí, o BPE repete uma operação só: achar o par de tokens vizinhos mais frequente e trocá-lo por um token novo, de número 256, depois 257, e assim por diante. Cada troca encurta a sequência e aumenta o vocabulário em um. O texto das fábulas desta lição tem 2 703 caracteres e 2 777 bytes; depois de 100 mesclagens, ele cabe em 1 413 tokens.

## Passo 2 · Previsão · Uma mesclagem

O código conta os pares de bytes vizinhos de `"banana bandana"`, escolhe o mais frequente e faz uma mesclagem. Antes de rodar, conte os pares à mão: quantas vezes aparece `an`, e quantas `na`.

### Código

```python
texto = "banana bandana"
ids = list(texto.encode("utf-8"))
print(len(ids))

contagem = {}
for a, b in zip(ids, ids[1:]):
    contagem[(a, b)] = contagem.get((a, b), 0) + 1

par = max(contagem, key=contagem.get)
print(bytes(par).decode("utf-8"), contagem[par])
print(contagem[(ord("n"), ord("a"))], contagem[(ord("b"), ord("a"))])

novos = []
i = 0
while i < len(ids):
    if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
        novos.append(256)
        i += 2
    else:
        novos.append(ids[i])
        i += 1
print(len(novos))
print(novos[:4])
```

### Dicas

1. O texto tem 14 caracteres, todos sem acento: um byte cada.
2. Cada mesclagem troca dois tokens por um: a sequência encolhe uma posição por ocorrência do par.
3. Os códigos são `b` = 98, `a` = 97 e `n` = 110.

### Saída esperada

```text
14
an 4
3 2
10
[98, 256, 256, 97]
```

## Passo 3 · Exercício · Contar e mesclar
modo: lacunas

As duas peças do BPE são uma contagem e uma troca. `contar_pares(ids)` devolve um dicionário que leva cada par de vizinhos `(a, b)` ao número de vezes em que ele aparece. `mesclar(ids, par, novo_id)` percorre a lista da esquerda para a direita e devolve uma lista nova em que cada ocorrência do par virou `novo_id`.

A mesclagem não reaproveita um token já usado: em `[97, 97, 97]` com o par `(97, 97)`, os dois primeiros viram o token novo e o terceiro sobra, e o resultado é `[256, 97]`. Complete as lacunas.

### Instruções

1. Em `contar_pares`, emparelhe cada token com o vizinho da direita e acumule a contagem de cada par.
2. Em `mesclar`, reconheça o par na posição `i` sem ler além do fim da lista e, quando mesclar, avance o tanto certo para não reaproveitar um token.

### Código inicial

```python
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ___):
        contagem[par] = ___
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if ___:
            saida.append(novo_id)
            i += ___
        else:
            saida.append(ids[i])
            i += 1
    return saida


if __name__ == "__main__":
    ids = list("banana bandana".encode("utf-8"))
    print(contar_pares(ids)[(97, 110)])
    print(mesclar(ids, (97, 110), 256))
```

### Solução

```python
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


if __name__ == "__main__":
    ids = list("banana bandana".encode("utf-8"))
    print(contar_pares(ids)[(97, 110)])
    print(mesclar(ids, (97, 110), 256))
```

### Dicas

1. `zip(ids, ids[1:])` percorre os pares `(ids[0], ids[1])`, `(ids[1], ids[2])` e assim por diante.
2. O par só pode começar em `i` se existir a posição `i + 1`.
3. Depois de uma mesclagem, os dois tokens do par já foram consumidos.

### Verificação

```json
[
  {"id": "contar-banana", "checkpoint": 1, "kind": "expr", "expr": "sorted([list(p), n] for p, n in contar_pares([98, 97, 110, 97, 110, 97]).items())", "expected": [[[97, 110], 2], [[98, 97], 1], [[110, 97], 2]], "name": "Pares de \"banana\": ba 1, an 2, na 2", "hint": "Cada par de vizinhos conta uma vez por ocorrência."},
  {"id": "contar-aaa", "checkpoint": 1, "kind": "expr", "expr": "contar_pares([97, 97, 97]) == {(97, 97): 2}", "expected": true, "name": "Na contagem, [97, 97, 97] tem o par (97, 97) duas vezes", "hint": "A contagem olha todos os vizinhos, mesmo os que se sobrepõem."},
  {"id": "contar-curto", "checkpoint": 1, "kind": "expr", "expr": "[contar_pares([]), contar_pares([7])]", "expected": [{}, {}], "name": "Lista com menos de dois tokens não tem pares"},
  {"id": "contar-chaves", "checkpoint": 1, "kind": "expr", "expr": "all(isinstance(p, tuple) and len(p) == 2 for p in contar_pares([1, 2, 3, 1, 2]))", "expected": true, "name": "As chaves são tuplas (a, b)"},
  {"id": "contar-ordem", "checkpoint": 1, "kind": "expr", "expr": "[contar_pares([1, 2, 1]).get((1, 2), 0), contar_pares([1, 2, 1]).get((2, 1), 0), contar_pares([1, 2, 1]).get((1, 1), 0)]", "expected": [1, 1, 0], "name": "(1, 2) e (2, 1) são pares diferentes, e (1, 1) não aparece em [1, 2, 1]"},
  {"id": "mesclar-banana", "checkpoint": 2, "kind": "expr", "expr": "mesclar([98, 97, 110, 97, 110, 97], (97, 110), 256)", "expected": [98, 256, 256, 97], "name": "\"banana\" com o par an vira b, 256, 256, a"},
  {"id": "mesclar-aaa", "checkpoint": 2, "kind": "expr", "expr": "mesclar([97, 97, 97], (97, 97), 256)", "expected": [256, 97], "name": "Sem sobreposição: [97, 97, 97] vira [256, 97]", "hint": "Depois de mesclar na posição i, a próxima posição a olhar é i + 2."},
  {"id": "mesclar-aaaa", "checkpoint": 2, "kind": "expr", "expr": "mesclar([97, 97, 97, 97], (97, 97), 300)", "expected": [300, 300], "name": "[97, 97, 97, 97] vira dois tokens novos"},
  {"id": "mesclar-fim", "checkpoint": 2, "kind": "expr", "expr": "mesclar([5, 6, 5], (5, 6), 256)", "expected": [256, 5], "name": "O último token, sem vizinho, é copiado", "hint": "Na última posição não existe ids[i + 1]."},
  {"id": "mesclar-ausente", "checkpoint": 2, "kind": "expr", "expr": "mesclar([1, 2, 3], (2, 1), 256)", "expected": [1, 2, 3], "name": "Par que não aparece: a lista sai igual", "hint": "O par (2, 1) não é o par (1, 2)."},
  {"id": "mesclar-primeiro", "checkpoint": 2, "kind": "expr", "expr": "mesclar([1, 3, 1, 2], (1, 2), 256)", "expected": [1, 3, 256], "name": "Só mescla quando os dois tokens batem com o par", "hint": "Compare ids[i] e ids[i + 1] com o par inteiro."},
  {"id": "mesclar-copia", "checkpoint": 2, "kind": "expr", "setup": "_ids = [1, 2, 1, 2]\n_r = mesclar(_ids, (1, 2), 9)", "expr": "[_ids, _r]", "expected": [[1, 2, 1, 2], [9, 9]], "name": "A lista de entrada não é alterada"}
]
```

### Soluções erradas

```python name="pares sem deslocar a segunda lista"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


if __name__ == "__main__":
    ids = list("banana bandana".encode("utf-8"))
    print(contar_pares(ids)[(97, 110)])
    print(mesclar(ids, (97, 110), 256))
```

```python name="contagem que não acumula"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


if __name__ == "__main__":
    ids = list("banana bandana".encode("utf-8"))
    print(contar_pares(ids)[(97, 110)])
    print(mesclar(ids, (97, 110), 256))
```

```python name="avança uma posição só depois de mesclar"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 1
        else:
            saida.append(ids[i])
            i += 1
    return saida


if __name__ == "__main__":
    ids = list("banana bandana".encode("utf-8"))
    print(contar_pares(ids)[(97, 110)])
    print(mesclar(ids, (97, 110), 256))
```

```python name="compara só o primeiro token do par"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and ids[i] == par[0]:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


if __name__ == "__main__":
    ids = list("banana bandana".encode("utf-8"))
    print(contar_pares(ids)[(97, 110)])
    print(mesclar(ids, (97, 110), 256))
```

```python name="lê além do fim da lista"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


if __name__ == "__main__":
    ids = list("banana bandana".encode("utf-8"))
    print(contar_pares(ids)[(97, 110)])
    print(mesclar(ids, (97, 110), 256))
```

```python name="pares com salto de duas posições"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[2:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


if __name__ == "__main__":
    ids = list("banana bandana".encode("utf-8"))
    print(contar_pares(ids)[(97, 110)])
    print(mesclar(ids, (97, 110), 256))
```

## Passo 4 · Leitura · Treinar o vocabulário

Treinar um tokenizador BPE é repetir contagem e mesclagem um número fixo de vezes. Não há gradiente nem perda: o "modelo" que sai do treino é a lista das mesclagens, na ordem em que foram feitas.

```python
ids = list(texto.encode("utf-8"))
merges = []
for k in range(n_mesclas):
    contagem = contar_pares(ids)          # recontar a cada volta
    par = ...                             # o mais frequente
    ids = mesclar(ids, par, 256 + k)
    merges.append((par, 256 + k))
```

Três detalhes decidem se duas pessoas chegam ao mesmo vocabulário.

**Recontar a cada volta.** Depois de uma mesclagem, os pares mudam: em `"aaabdaaabac"`, a primeira troca cria o token 256 no lugar de `aa`, e só então aparecem os pares `(256, 97)` e `(256, 257)`. Um token novo pode entrar em mesclagens seguintes, e é assim que pedaços longos se formam: no texto das fábulas, o token de `que ` (com o espaço) nasce da junção de `qu` com `e `, dois tokens criados antes.

**O desempate.** Quando dois pares têm a mesma contagem, é preciso uma regra, ou o resultado depende de como cada um escreveu o laço. Nesta lição, vence **o par menor na ordem das tuplas**: `(97, 98)` vem antes de `(97, 110)`, que vem antes de `(256, 97)`. No exemplo acima, depois da primeira mesclagem, `(97, 98)` e `(256, 97)` aparecem duas vezes cada um, e o escolhido é `(97, 98)`. Um jeito de escrever a regra é ordenar pela contagem negativa e depois pelo par: `min(contagem, key=lambda p: (-contagem[p], p))`.

**Quando parar.** Se a sequência ficar com um token só, não há mais pares, e o treino termina antes de `n_mesclas`.

No texto das fábulas, as primeiras mesclagens são `a `, `e `, `o `, `ar` e `qu`: letras seguidas de espaço e pares comuns do português. Com 50 mesclagens, os 2 777 bytes viram 1 723 tokens (1,61 byte por token); com 200, viram 1 066 (2,61). O ganho por mesclagem diminui, porque os pares que restam são cada vez mais raros.

O vocabulário é treinado só com o texto de treino. Medir a compressão no mesmo texto que gerou as mesclagens dá um número otimista, do mesmo jeito que a acurácia de treino.

## Passo 5 · Exercício · `treinar_bpe(texto, n_mesclas)`

Escreva `treinar_bpe(texto, n_mesclas)`, que treina o vocabulário sobre os bytes UTF-8 de `texto` e devolve a lista das mesclagens na ordem em que foram feitas. Cada item é uma tupla `((a, b), novo_id)`: o par mesclado e o número do token criado. O primeiro token novo é o 256, o seguinte é o 257, e assim por diante.

A cada volta, o par escolhido é o mais frequente na sequência atual. Em caso de empate, vence o menor par na ordem das tuplas. Se não houver mais pares, o treino para e a lista sai com menos de `n_mesclas` itens. As funções `contar_pares` e `mesclar` do passo anterior já estão no arquivo, e `fabulas.txt` traz o texto usado num dos casos.

### Instruções

1. Comece pelos bytes do texto e repita até `n_mesclas` vezes: recontar os pares, escolher o mais frequente (empate: o menor par), mesclar e registrar `((a, b), novo_id)` com ids a partir de 256.
2. Pare antes se a sequência não tiver mais pares, e devolva a lista das mesclagens feitas.

### Código inicial

```python
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    # devolva a lista de ((a, b), novo_id), na ordem das mesclagens
    pass


if __name__ == "__main__":
    for par, novo_id in treinar_bpe("aaabdaaabac", 3):
        print(par, novo_id)
```
```text path=fabulas.txt
A formiga e o grão de areia

Uma formiga carregava um grão de areia para o alto do formigueiro. A cigarra, que cantava na sombra, perguntou por que ela não escolhia um grão menor.
— Porque o formigueiro não se faz com o grão que eu escolho, e sim com o grão que falta — respondeu a formiga.
A cigarra riu e continuou a cantar. Quando a chuva chegou, a água desceu pela encosta e parou diante do formigueiro, onde cada grão estava no lugar em que fazia falta.
Moral: o trabalho que parece pequeno é medido pelo que sustenta.

A raposa e o espelho d'água

Uma raposa encontrou uma lagoa tão calma que mostrava o céu inteiro. Viu ali outra raposa, com um peixe na boca, e quis o peixe da outra.
— Solta o que é meu — disse a raposa para a lagoa.
A lagoa não respondeu. A raposa abriu a boca para morder a outra raposa, e o peixe que ela mesma carregava caiu na água e nadou para longe.
Uma garça, que assistia de uma pedra, comentou baixinho:
— Quem briga com o próprio reflexo perde duas vezes: o que queria e o que tinha.
Moral: a cobiça não enxerga o que já está na boca.

O sapo e a lanterna

Numa noite sem lua, um sapo encontrou uma lanterna esquecida na estrada. Achou que a luz era dele e passou a noite mandando nos vaga-lumes.
— Apaguem-se — dizia o sapo —, porque agora a claridade tem dono.
Os vaga-lumes, sem discutir, voaram para a mata. De manhã, o azeite da lanterna acabou. O sapo ficou no escuro e chamou pelos vaga-lumes, mas eles já iluminavam outro caminho.
Moral: quem toma emprestada a luz dos outros não deve mandar em quem brilha sozinho.

A tartaruga e a ponte

Os bichos da vila queriam atravessar o rio, e cada um tinha pressa. A lebre propôs uma ponte de galhos finos, que ficaria pronta num dia. A tartaruga propôs uma ponte de pedra, que levaria um mês.
— Um mês é tempo demais — disse a lebre.
A ponte de galhos ficou pronta no dia seguinte e caiu na primeira cheia. A lebre fez outra, que também caiu. No fim do mês, a lebre tinha feito quatro pontes e não tinha nenhuma. A tartaruga pôs a última pedra e atravessou devagar, sem molhar os pés.
Moral: a pressa conta os dias, e a paciência conta as cheias.

O galo e o relógio

Um galo se orgulhava de acordar a fazenda. Um dia, o fazendeiro trouxe da cidade um relógio que tocava sozinho. O galo, ofendido, decidiu cantar mais cedo que o relógio, e depois mais cedo ainda, até cantar no meio da noite.
Ninguém mais sabia quando era hora de levantar. O fazendeiro guardou o relógio na gaveta e pediu ao galo que voltasse a cantar com o sol.
— Eu só queria ser o primeiro — disse o galo.
— Ser o primeiro não adianta, se ninguém pode confiar na hora — respondeu o fazendeiro.
Moral: vale mais ser certo do que ser adiantado.
```

### Solução

```python
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    ids = list(texto.encode("utf-8"))
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = 256 + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return merges


if __name__ == "__main__":
    for par, novo_id in treinar_bpe("aaabdaaabac", 3):
        print(par, novo_id)
```
```text path=fabulas.txt
A formiga e o grão de areia

Uma formiga carregava um grão de areia para o alto do formigueiro. A cigarra, que cantava na sombra, perguntou por que ela não escolhia um grão menor.
— Porque o formigueiro não se faz com o grão que eu escolho, e sim com o grão que falta — respondeu a formiga.
A cigarra riu e continuou a cantar. Quando a chuva chegou, a água desceu pela encosta e parou diante do formigueiro, onde cada grão estava no lugar em que fazia falta.
Moral: o trabalho que parece pequeno é medido pelo que sustenta.

A raposa e o espelho d'água

Uma raposa encontrou uma lagoa tão calma que mostrava o céu inteiro. Viu ali outra raposa, com um peixe na boca, e quis o peixe da outra.
— Solta o que é meu — disse a raposa para a lagoa.
A lagoa não respondeu. A raposa abriu a boca para morder a outra raposa, e o peixe que ela mesma carregava caiu na água e nadou para longe.
Uma garça, que assistia de uma pedra, comentou baixinho:
— Quem briga com o próprio reflexo perde duas vezes: o que queria e o que tinha.
Moral: a cobiça não enxerga o que já está na boca.

O sapo e a lanterna

Numa noite sem lua, um sapo encontrou uma lanterna esquecida na estrada. Achou que a luz era dele e passou a noite mandando nos vaga-lumes.
— Apaguem-se — dizia o sapo —, porque agora a claridade tem dono.
Os vaga-lumes, sem discutir, voaram para a mata. De manhã, o azeite da lanterna acabou. O sapo ficou no escuro e chamou pelos vaga-lumes, mas eles já iluminavam outro caminho.
Moral: quem toma emprestada a luz dos outros não deve mandar em quem brilha sozinho.

A tartaruga e a ponte

Os bichos da vila queriam atravessar o rio, e cada um tinha pressa. A lebre propôs uma ponte de galhos finos, que ficaria pronta num dia. A tartaruga propôs uma ponte de pedra, que levaria um mês.
— Um mês é tempo demais — disse a lebre.
A ponte de galhos ficou pronta no dia seguinte e caiu na primeira cheia. A lebre fez outra, que também caiu. No fim do mês, a lebre tinha feito quatro pontes e não tinha nenhuma. A tartaruga pôs a última pedra e atravessou devagar, sem molhar os pés.
Moral: a pressa conta os dias, e a paciência conta as cheias.

O galo e o relógio

Um galo se orgulhava de acordar a fazenda. Um dia, o fazendeiro trouxe da cidade um relógio que tocava sozinho. O galo, ofendido, decidiu cantar mais cedo que o relógio, e depois mais cedo ainda, até cantar no meio da noite.
Ninguém mais sabia quando era hora de levantar. O fazendeiro guardou o relógio na gaveta e pediu ao galo que voltasse a cantar com o sol.
— Eu só queria ser o primeiro — disse o galo.
— Ser o primeiro não adianta, se ninguém pode confiar na hora — respondeu o fazendeiro.
Moral: vale mais ser certo do que ser adiantado.
```

### Dicas

1. A contagem precisa ser refeita depois de cada mesclagem, porque os pares mudam.
2. `min` com uma chave `(-contagem[p], p)` escolhe a maior contagem e, no empate, o menor par.
3. Um dicionário vazio de pares significa que a sequência tem um token só (ou nenhum).

### Verificação

```json
[
  {"id": "exemplo-classico", "checkpoint": 1, "kind": "expr", "setup": "_r = lambda t, n: [[list(p), i] for p, i in treinar_bpe(t, n)]", "expr": "_r(\"aaabdaaabac\", 3)", "expected": [[[97, 97], 256], [[97, 98], 257], [[256, 257], 258]], "name": "\"aaabdaaabac\" com 3 mesclagens: aa, depois ab, depois (256, 257)", "hint": "Depois da primeira mesclagem, (97, 98) e (256, 97) empatam com 2: vence o menor par."},
  {"id": "banana", "checkpoint": 1, "kind": "expr", "setup": "_r = lambda t, n: [[list(p), i] for p, i in treinar_bpe(t, n)]", "expr": "_r(\"banana bandana\", 3)", "expected": [[[97, 110], 256], [[98, 256], 257], [[256, 97], 258]], "name": "\"banana bandana\" com 3 mesclagens", "hint": "A primeira é an (4 vezes). Reconte os pares antes da segunda."},
  {"id": "empate-menor-par", "checkpoint": 1, "kind": "expr", "setup": "_r = lambda t, n: [[list(p), i] for p, i in treinar_bpe(t, n)]", "expr": "_r(\"dcba\", 1)", "expected": [[[98, 97], 256]], "name": "Todos os pares empatados: vence (98, 97), o menor", "hint": "O desempate é pelo valor do par, não pela posição em que ele aparece no texto."},
  {"id": "empate-dois-niveis", "checkpoint": 1, "kind": "expr", "setup": "_r = lambda t, n: [[list(p), i] for p, i in treinar_bpe(t, n)]", "expr": "_r(\"cbcbabab\", 2)", "expected": [[[97, 98], 256], [[99, 98], 257]], "name": "Empate entre (97, 98) e (99, 98) com 2 ocorrências: vence (97, 98)", "hint": "Compare as tuplas inteiras: (97, 98) < (98, 97) < (99, 98)."},
  {"id": "ids-a-partir-de-256", "checkpoint": 1, "kind": "expr", "expr": "[i for _, i in treinar_bpe(\"o rato roeu a roupa do rei\", 5)]", "expected": [256, 257, 258, 259, 260], "name": "Os tokens novos são 256, 257, 258, ...", "hint": "Os ids de 0 a 255 já pertencem aos bytes."},
  {"id": "tipos", "checkpoint": 1, "kind": "expr", "expr": "all(isinstance(p, tuple) and len(p) == 2 and isinstance(i, int) for p, i in treinar_bpe(\"banana\", 2))", "expected": true, "name": "Cada item é ((a, b), novo_id), com o par em tupla"},
  {"id": "acentos-em-bytes", "checkpoint": 1, "kind": "expr", "setup": "_r = lambda t, n: [[list(p), i] for p, i in treinar_bpe(t, n)]", "expr": "_r(\"ção ção\", 2)", "expected": [[[163, 111], 256], [[167, 195], 257]], "name": "\"ção ção\" é mesclado em bytes, não em caracteres", "hint": "Use texto.encode(\"utf-8\"): o ç vale os bytes 195 e 167."},
  {"id": "fabulas-compressao", "checkpoint": 1, "kind": "expr", "setup": "_t = open(\"fabulas.txt\", encoding=\"utf-8\").read()\n_m = treinar_bpe(_t, 40)\n_ids = list(_t.encode(\"utf-8\"))\nfor _p, _i in _m:\n    _ids = mesclar(_ids, _p, _i)", "expr": "len(_ids)", "expected": 1812, "name": "40 mesclagens nas fábulas: número de tokens depois de aplicá-las"},
  {"id": "fabulas-primeiras", "checkpoint": 1, "kind": "expr", "setup": "_t = open(\"fabulas.txt\", encoding=\"utf-8\").read()\n_m = treinar_bpe(_t, 40)\n_ids = list(_t.encode(\"utf-8\"))\nfor _p, _i in _m:\n    _ids = mesclar(_ids, _p, _i)", "expr": "[list(p) for p, _ in _m[:5]]", "expected": [[97, 32], [101, 32], [111, 32], [97, 114], [113, 117]], "name": "As 5 primeiras mesclagens das fábulas", "hint": "As primeiras são letras seguidas de espaço: (97, 32), (101, 32), (111, 32)."},
  {"id": "zero-mesclas", "checkpoint": 2, "kind": "expr", "expr": "treinar_bpe(\"banana\", 0)", "expected": [], "name": "n_mesclas = 0 devolve a lista vazia"},
  {"id": "para-sem-pares", "checkpoint": 2, "kind": "expr", "setup": "_r = lambda t, n: [[list(p), i] for p, i in treinar_bpe(t, n)]", "expr": "_r(\"aaaa\", 10)", "expected": [[[97, 97], 256], [[256, 256], 257]], "name": "\"aaaa\" só permite 2 mesclagens, mesmo pedindo 10", "hint": "Quando sobra um token só, contar_pares devolve um dicionário vazio."},
  {"id": "texto-de-um-byte", "checkpoint": 2, "kind": "expr", "expr": "[treinar_bpe(\"a\", 3), treinar_bpe(\"\", 3)]", "expected": [[], []], "name": "Texto com menos de dois bytes não tem o que mesclar"}
]
```

### Soluções erradas

```python name="desempate pela primeira ocorrência no texto"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    ids = list(texto.encode("utf-8"))
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = max(contagem, key=contagem.get)
        novo_id = 256 + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return merges


if __name__ == "__main__":
    for par, novo_id in treinar_bpe("aaabdaaabac", 3):
        print(par, novo_id)
```

```python name="novo_id começando em 255"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    ids = list(texto.encode("utf-8"))
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = 255 + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return merges


if __name__ == "__main__":
    for par, novo_id in treinar_bpe("aaabdaaabac", 3):
        print(par, novo_id)
```

```python name="desempate pelo par maior"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    ids = list(texto.encode("utf-8"))
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = max(contagem, key=lambda p: (contagem[p], p))
        novo_id = 256 + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return merges


if __name__ == "__main__":
    for par, novo_id in treinar_bpe("aaabdaaabac", 3):
        print(par, novo_id)
```

```python name="não para quando acabam os pares"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    ids = list(texto.encode("utf-8"))
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = 256 + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return merges


if __name__ == "__main__":
    for par, novo_id in treinar_bpe("aaabdaaabac", 3):
        print(par, novo_id)
```

```python name="mescla caracteres no lugar de bytes"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    ids = [ord(c) for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = 256 + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return merges


if __name__ == "__main__":
    for par, novo_id in treinar_bpe("aaabdaaabac", 3):
        print(par, novo_id)
```

```python name="não guarda a sequência mesclada"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    ids = list(texto.encode("utf-8"))
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = 256 + k
        mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return merges


if __name__ == "__main__":
    for par, novo_id in treinar_bpe("aaabdaaabac", 3):
        print(par, novo_id)
```

```python name="conta os pares uma vez só, antes do laço"
def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    ids = list(texto.encode("utf-8"))
    merges = []
    contagem = contar_pares(ids)
    for k in range(n_mesclas):
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = 256 + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return merges


if __name__ == "__main__":
    for par, novo_id in treinar_bpe("aaabdaaabac", 3):
        print(par, novo_id)
```

## Passo 6 · Leitura · Codificar, decodificar e as esquisitices

Com a lista de mesclagens pronta, o tokenizador tem duas operações.

**Codificar** um texto novo é refazer o treino sem contar nada: começar pelos bytes e aplicar cada mesclagem **na ordem em que foi aprendida**. A ordem importa porque as mesclagens tardias usam tokens criados pelas anteriores. O par `(256, 257)` só existe na sequência depois que o 256 e o 257 foram criados.

**Decodificar** é o caminho de volta: cada token vale uma sequência de bytes. Os 256 primeiros valem um byte, e cada token novo vale a concatenação dos bytes das suas duas partes.

```python
vocab = {i: bytes([i]) for i in range(256)}
for (a, b), novo_id in merges:
    vocab[novo_id] = vocab[a] + vocab[b]
texto = b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")
```

O `errors="replace"` existe porque nem toda sequência de tokens é um texto válido. O `ç` ocupa dois bytes, e um modelo pode gerar só o primeiro. Sem o argumento, a decodificação para com:

```text
UnicodeDecodeError: 'utf-8' codec can't decode byte 0xc3 in position 0: unexpected end of data
```

Com ele, o pedaço inválido vira o caractere `�` e o resto do texto aparece.

A tokenização explica alguns comportamentos estranhos de modelos de linguagem:

- **Contar letras.** O modelo recebe números de tokens, não letras. Com 100 mesclagens treinadas nas fábulas, `"a formiga respondeu"` vira 9 tokens, entre eles `formi` e `ga `. Perguntar quantas vezes a letra `r` aparece numa palavra exige que o modelo saiba como cada token se escreve, o que ele só aprende de modo indireto.
- **Números.** `"1234567"` não tem pares frequentes nas fábulas e fica em 7 tokens, um por dígito. Em vocabulários grandes, os números são cortados em pedaços de tamanhos variados, e a aritmética sofre com isso.
- **Línguas.** O mesmo tokenizador gasta 10 tokens em `"a raposa e a lagoa"` (18 bytes) e 18 em `"the fox and the lake"` (20 bytes), porque foi treinado em português. Um vocabulário treinado sobretudo em outra língua cobra mais tokens de quem escreve com acentos: `"coração"` tem 7 letras, 9 bytes e 6 tokens.

A medida usada para comparar tokenizadores é a **taxa de compressão**: bytes do texto divididos pelo número de tokens.

## Passo 7 · Exercício · Ida e volta

Escreva as três funções que usam um vocabulário já treinado. `merges` é a lista devolvida por `treinar_bpe`: tuplas `((a, b), novo_id)` na ordem do treino.

- `codificar(texto, merges)` devolve a lista de tokens: os bytes UTF-8 do texto com cada mesclagem aplicada na ordem.
- `decodificar(ids, merges)` devolve o texto. A volta precisa ser exata (`decodificar(codificar(t, merges), merges) == t`), e uma sequência de bytes inválida não pode levantar erro: use `errors="replace"`.
- `taxa_de_compressao(texto, merges)` devolve os bytes do texto divididos pelo número de tokens (o texto nunca é vazio).

O arquivo `bpe.py` traz `contar_pares`, `mesclar` e `treinar_bpe` dos passos anteriores.

### Instruções

1. `codificar`: comece pelos bytes UTF-8 e aplique todas as mesclagens, na ordem da lista.
2. `decodificar`: monte os bytes de cada token (os novos são a concatenação das duas partes, que também podem ser tokens novos) e decodifique com `errors="replace"`.
3. `taxa_de_compressao`: bytes do texto divididos pelo número de tokens da codificação.

### Código inicial

```python
from bpe import mesclar, treinar_bpe


def codificar(texto, merges):
    # bytes do texto, depois cada mesclagem na ordem do treino
    pass


def decodificar(ids, merges):
    # cada token vale uma sequência de bytes; junte tudo e decodifique com errors="replace"
    pass


def taxa_de_compressao(texto, merges):
    # bytes do texto por token
    pass


if __name__ == "__main__":
    fabulas = open("fabulas.txt", encoding="utf-8").read()
    merges = treinar_bpe(fabulas, 100)
    ids = codificar("a formiga respondeu", merges)
    print(len(ids), decodificar(ids, merges))
    print(round(taxa_de_compressao(fabulas, merges), 3))
```
```python path=bpe.py
"""BPE sobre bytes: as funções escritas nos passos anteriores."""


def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    ids = list(texto.encode("utf-8"))
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = 256 + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return merges
```
```text path=fabulas.txt
A formiga e o grão de areia

Uma formiga carregava um grão de areia para o alto do formigueiro. A cigarra, que cantava na sombra, perguntou por que ela não escolhia um grão menor.
— Porque o formigueiro não se faz com o grão que eu escolho, e sim com o grão que falta — respondeu a formiga.
A cigarra riu e continuou a cantar. Quando a chuva chegou, a água desceu pela encosta e parou diante do formigueiro, onde cada grão estava no lugar em que fazia falta.
Moral: o trabalho que parece pequeno é medido pelo que sustenta.

A raposa e o espelho d'água

Uma raposa encontrou uma lagoa tão calma que mostrava o céu inteiro. Viu ali outra raposa, com um peixe na boca, e quis o peixe da outra.
— Solta o que é meu — disse a raposa para a lagoa.
A lagoa não respondeu. A raposa abriu a boca para morder a outra raposa, e o peixe que ela mesma carregava caiu na água e nadou para longe.
Uma garça, que assistia de uma pedra, comentou baixinho:
— Quem briga com o próprio reflexo perde duas vezes: o que queria e o que tinha.
Moral: a cobiça não enxerga o que já está na boca.

O sapo e a lanterna

Numa noite sem lua, um sapo encontrou uma lanterna esquecida na estrada. Achou que a luz era dele e passou a noite mandando nos vaga-lumes.
— Apaguem-se — dizia o sapo —, porque agora a claridade tem dono.
Os vaga-lumes, sem discutir, voaram para a mata. De manhã, o azeite da lanterna acabou. O sapo ficou no escuro e chamou pelos vaga-lumes, mas eles já iluminavam outro caminho.
Moral: quem toma emprestada a luz dos outros não deve mandar em quem brilha sozinho.

A tartaruga e a ponte

Os bichos da vila queriam atravessar o rio, e cada um tinha pressa. A lebre propôs uma ponte de galhos finos, que ficaria pronta num dia. A tartaruga propôs uma ponte de pedra, que levaria um mês.
— Um mês é tempo demais — disse a lebre.
A ponte de galhos ficou pronta no dia seguinte e caiu na primeira cheia. A lebre fez outra, que também caiu. No fim do mês, a lebre tinha feito quatro pontes e não tinha nenhuma. A tartaruga pôs a última pedra e atravessou devagar, sem molhar os pés.
Moral: a pressa conta os dias, e a paciência conta as cheias.

O galo e o relógio

Um galo se orgulhava de acordar a fazenda. Um dia, o fazendeiro trouxe da cidade um relógio que tocava sozinho. O galo, ofendido, decidiu cantar mais cedo que o relógio, e depois mais cedo ainda, até cantar no meio da noite.
Ninguém mais sabia quando era hora de levantar. O fazendeiro guardou o relógio na gaveta e pediu ao galo que voltasse a cantar com o sol.
— Eu só queria ser o primeiro — disse o galo.
— Ser o primeiro não adianta, se ninguém pode confiar na hora — respondeu o fazendeiro.
Moral: vale mais ser certo do que ser adiantado.
```

### Solução

```python
from bpe import mesclar, treinar_bpe


def codificar(texto, merges):
    ids = list(texto.encode("utf-8"))
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, merges):
    vocab = {i: bytes([i]) for i in range(256)}
    for (a, b), novo_id in merges:
        vocab[novo_id] = vocab[a] + vocab[b]
    return b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")


def taxa_de_compressao(texto, merges):
    return len(texto.encode("utf-8")) / len(codificar(texto, merges))


if __name__ == "__main__":
    fabulas = open("fabulas.txt", encoding="utf-8").read()
    merges = treinar_bpe(fabulas, 100)
    ids = codificar("a formiga respondeu", merges)
    print(len(ids), decodificar(ids, merges))
    print(round(taxa_de_compressao(fabulas, merges), 3))
```
```python path=bpe.py
"""BPE sobre bytes: as funções escritas nos passos anteriores."""


def contar_pares(ids):
    contagem = {}
    for par in zip(ids, ids[1:]):
        contagem[par] = contagem.get(par, 0) + 1
    return contagem


def mesclar(ids, par, novo_id):
    saida = []
    i = 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


def treinar_bpe(texto, n_mesclas):
    ids = list(texto.encode("utf-8"))
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = 256 + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return merges
```
```text path=fabulas.txt
A formiga e o grão de areia

Uma formiga carregava um grão de areia para o alto do formigueiro. A cigarra, que cantava na sombra, perguntou por que ela não escolhia um grão menor.
— Porque o formigueiro não se faz com o grão que eu escolho, e sim com o grão que falta — respondeu a formiga.
A cigarra riu e continuou a cantar. Quando a chuva chegou, a água desceu pela encosta e parou diante do formigueiro, onde cada grão estava no lugar em que fazia falta.
Moral: o trabalho que parece pequeno é medido pelo que sustenta.

A raposa e o espelho d'água

Uma raposa encontrou uma lagoa tão calma que mostrava o céu inteiro. Viu ali outra raposa, com um peixe na boca, e quis o peixe da outra.
— Solta o que é meu — disse a raposa para a lagoa.
A lagoa não respondeu. A raposa abriu a boca para morder a outra raposa, e o peixe que ela mesma carregava caiu na água e nadou para longe.
Uma garça, que assistia de uma pedra, comentou baixinho:
— Quem briga com o próprio reflexo perde duas vezes: o que queria e o que tinha.
Moral: a cobiça não enxerga o que já está na boca.

O sapo e a lanterna

Numa noite sem lua, um sapo encontrou uma lanterna esquecida na estrada. Achou que a luz era dele e passou a noite mandando nos vaga-lumes.
— Apaguem-se — dizia o sapo —, porque agora a claridade tem dono.
Os vaga-lumes, sem discutir, voaram para a mata. De manhã, o azeite da lanterna acabou. O sapo ficou no escuro e chamou pelos vaga-lumes, mas eles já iluminavam outro caminho.
Moral: quem toma emprestada a luz dos outros não deve mandar em quem brilha sozinho.

A tartaruga e a ponte

Os bichos da vila queriam atravessar o rio, e cada um tinha pressa. A lebre propôs uma ponte de galhos finos, que ficaria pronta num dia. A tartaruga propôs uma ponte de pedra, que levaria um mês.
— Um mês é tempo demais — disse a lebre.
A ponte de galhos ficou pronta no dia seguinte e caiu na primeira cheia. A lebre fez outra, que também caiu. No fim do mês, a lebre tinha feito quatro pontes e não tinha nenhuma. A tartaruga pôs a última pedra e atravessou devagar, sem molhar os pés.
Moral: a pressa conta os dias, e a paciência conta as cheias.

O galo e o relógio

Um galo se orgulhava de acordar a fazenda. Um dia, o fazendeiro trouxe da cidade um relógio que tocava sozinho. O galo, ofendido, decidiu cantar mais cedo que o relógio, e depois mais cedo ainda, até cantar no meio da noite.
Ninguém mais sabia quando era hora de levantar. O fazendeiro guardou o relógio na gaveta e pediu ao galo que voltasse a cantar com o sol.
— Eu só queria ser o primeiro — disse o galo.
— Ser o primeiro não adianta, se ninguém pode confiar na hora — respondeu o fazendeiro.
Moral: vale mais ser certo do que ser adiantado.
```

### Dicas

1. Para codificar, `mesclar` faz todo o trabalho: uma chamada por item de `merges`.
2. Um dicionário de token para `bytes` resolve a decodificação: preencha os 256 primeiros e depois percorra `merges` na ordem.
3. A taxa usa `len(texto.encode("utf-8"))`, que é diferente de `len(texto)` quando há acentos.

### Verificação

```json
[
  {"id": "codificar-exemplo", "checkpoint": 1, "kind": "expr", "setup": "_M = [((97, 97), 256), ((97, 98), 257), ((256, 257), 258)]", "expr": "codificar(\"aaabdaaabac\", _M)", "expected": [258, 100, 258, 97, 99], "name": "\"aaabdaaabac\" com as 3 mesclagens vira 5 tokens", "hint": "Aplique (97, 97), depois (97, 98), depois (256, 257)."},
  {"id": "codificar-sem-mesclas", "checkpoint": 1, "kind": "expr", "expr": "codificar(\"ção\", [])", "expected": [195, 167, 195, 163, 111], "name": "Sem mesclagens, os tokens são os bytes UTF-8", "hint": "O ç e o ã ocupam dois bytes cada um."},
  {"id": "codificar-ordem", "checkpoint": 1, "kind": "expr", "setup": "_M = [((97, 98), 256), ((256, 99), 257), ((98, 99), 258)]", "expr": "codificar(\"abcbc\", _M)", "expected": [257, 258], "name": "A ordem do treino decide: (98, 99) só é tentado depois de (256, 99)", "hint": "Percorra merges do primeiro ao último item."},
  {"id": "codificar-fabulas", "checkpoint": 1, "kind": "expr", "setup": "from bpe import treinar_bpe\n_t = open(\"fabulas.txt\", encoding=\"utf-8\").read()\n_m = treinar_bpe(_t, 60)", "expr": "codificar(\"a tartaruga atravessou a ponte de pedra\", _m)", "expected": [256, 116, 259, 116, 259, 117, 103, 256, 97, 116, 269, 118, 268, 115, 291, 256, 272, 263, 257, 283, 112, 101, 100, 269], "name": "Uma frase nova com 60 mesclagens treinadas nas fábulas"},
  {"id": "decodificar-bytes", "checkpoint": 2, "kind": "expr", "expr": "decodificar([112, 195, 163, 111], [])", "expected": "pão", "name": "Bytes simples voltam a ser texto"},
  {"id": "decodificar-mesclas", "checkpoint": 2, "kind": "expr", "setup": "_M = [((97, 97), 256), ((97, 98), 257), ((256, 257), 258)]", "expr": "decodificar([258, 100, 257], _M)", "expected": "aaabdab", "name": "O token 258 vale os bytes de 256 seguidos dos de 257", "hint": "As partes de um token novo podem ser tokens novos: guarde os bytes de cada um em ordem."},
  {"id": "decodificar-invalido", "checkpoint": 2, "kind": "expr", "expr": "decodificar([111, 195], [])", "expected": "o�", "name": "Um byte solto de um caractere de dois bytes vira o caractere de substituição", "hint": "Passe errors=\"replace\" para o decode."},
  {"id": "ida-e-volta-fabulas", "checkpoint": 2, "kind": "expr", "setup": "from bpe import treinar_bpe\n_t = open(\"fabulas.txt\", encoding=\"utf-8\").read()\n_m = treinar_bpe(_t, 60)", "expr": "decodificar(codificar(_t, _m), _m) == _t", "expected": true, "name": "Ida e volta exata no texto das fábulas"},
  {"id": "ida-e-volta-novo", "checkpoint": 2, "kind": "expr", "setup": "from bpe import treinar_bpe\n_t = open(\"fabulas.txt\", encoding=\"utf-8\").read()\n_m = treinar_bpe(_t, 60)", "expr": "decodificar(codificar(\"Órgãos, pêssegos e avós: 100% útil?\", _m), _m)", "expected": "Órgãos, pêssegos e avós: 100% útil?", "name": "Ida e volta num texto com caracteres que não estavam no treino"},
  {"id": "taxa-exemplo", "checkpoint": 3, "kind": "expr", "setup": "_M = [((97, 97), 256), ((97, 98), 257), ((256, 257), 258)]", "expr": "taxa_de_compressao(\"aaabdaaabac\", _M)", "expected": 2.2, "tolerance": 1e-12, "name": "11 bytes em 5 tokens: 2,2 bytes por token"},
  {"id": "taxa-em-bytes", "checkpoint": 3, "kind": "expr", "expr": "taxa_de_compressao(\"ção ção\", [])", "expected": 1.0, "tolerance": 1e-12, "name": "Sem mesclagens, a taxa é 1 mesmo com acentos", "hint": "O numerador é o número de bytes, não de caracteres."},
  {"id": "taxa-fabulas", "checkpoint": 3, "kind": "expr", "setup": "from bpe import treinar_bpe\n_t = open(\"fabulas.txt\", encoding=\"utf-8\").read()\n_m = treinar_bpe(_t, 60)", "expr": "taxa_de_compressao(_t, _m)", "expected": 1.6871202916160388, "tolerance": 1e-09, "name": "Taxa das fábulas com 60 mesclagens"}
]
```

### Soluções erradas

```python name="mesclas aplicadas fora da ordem do treino"
from bpe import mesclar, treinar_bpe


def codificar(texto, merges):
    ids = list(texto.encode("utf-8"))
    for par, novo_id in reversed(merges):
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, merges):
    vocab = {i: bytes([i]) for i in range(256)}
    for (a, b), novo_id in merges:
        vocab[novo_id] = vocab[a] + vocab[b]
    return b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")


def taxa_de_compressao(texto, merges):
    return len(texto.encode("utf-8")) / len(codificar(texto, merges))


if __name__ == "__main__":
    fabulas = open("fabulas.txt", encoding="utf-8").read()
    merges = treinar_bpe(fabulas, 100)
    ids = codificar("a formiga respondeu", merges)
    print(len(ids), decodificar(ids, merges))
    print(round(taxa_de_compressao(fabulas, merges), 3))
```

```python name="decodificar sem errors replace"
from bpe import mesclar, treinar_bpe


def codificar(texto, merges):
    ids = list(texto.encode("utf-8"))
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, merges):
    vocab = {i: bytes([i]) for i in range(256)}
    for (a, b), novo_id in merges:
        vocab[novo_id] = vocab[a] + vocab[b]
    return b"".join(vocab[i] for i in ids).decode("utf-8")


def taxa_de_compressao(texto, merges):
    return len(texto.encode("utf-8")) / len(codificar(texto, merges))


if __name__ == "__main__":
    fabulas = open("fabulas.txt", encoding="utf-8").read()
    merges = treinar_bpe(fabulas, 100)
    ids = codificar("a formiga respondeu", merges)
    print(len(ids), decodificar(ids, merges))
    print(round(taxa_de_compressao(fabulas, merges), 3))
```

```python name="taxa em caracteres por token"
from bpe import mesclar, treinar_bpe


def codificar(texto, merges):
    ids = list(texto.encode("utf-8"))
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, merges):
    vocab = {i: bytes([i]) for i in range(256)}
    for (a, b), novo_id in merges:
        vocab[novo_id] = vocab[a] + vocab[b]
    return b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")


def taxa_de_compressao(texto, merges):
    return len(texto) / len(codificar(texto, merges))


if __name__ == "__main__":
    fabulas = open("fabulas.txt", encoding="utf-8").read()
    merges = treinar_bpe(fabulas, 100)
    ids = codificar("a formiga respondeu", merges)
    print(len(ids), decodificar(ids, merges))
    print(round(taxa_de_compressao(fabulas, merges), 3))
```

```python name="taxa invertida, tokens por byte"
from bpe import mesclar, treinar_bpe


def codificar(texto, merges):
    ids = list(texto.encode("utf-8"))
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, merges):
    vocab = {i: bytes([i]) for i in range(256)}
    for (a, b), novo_id in merges:
        vocab[novo_id] = vocab[a] + vocab[b]
    return b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")


def taxa_de_compressao(texto, merges):
    return len(codificar(texto, merges)) / len(texto.encode("utf-8"))


if __name__ == "__main__":
    fabulas = open("fabulas.txt", encoding="utf-8").read()
    merges = treinar_bpe(fabulas, 100)
    ids = codificar("a formiga respondeu", merges)
    print(len(ids), decodificar(ids, merges))
    print(round(taxa_de_compressao(fabulas, merges), 3))
```

```python name="decodificar não desfaz mesclas de mesclas"
from bpe import mesclar, treinar_bpe


def codificar(texto, merges):
    ids = list(texto.encode("utf-8"))
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, merges):
    vocab = {i: bytes([i]) for i in range(256)}
    for (a, b), novo_id in merges:
        vocab[novo_id] = bytes([a % 256, b % 256])
    return b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")


def taxa_de_compressao(texto, merges):
    return len(texto.encode("utf-8")) / len(codificar(texto, merges))


if __name__ == "__main__":
    fabulas = open("fabulas.txt", encoding="utf-8").read()
    merges = treinar_bpe(fabulas, 100)
    ids = codificar("a formiga respondeu", merges)
    print(len(ids), decodificar(ids, merges))
    print(round(taxa_de_compressao(fabulas, merges), 3))
```

```python name="codificar parte de caracteres, não de bytes"
from bpe import mesclar, treinar_bpe


def codificar(texto, merges):
    ids = [ord(c) for c in texto]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, merges):
    vocab = {i: bytes([i]) for i in range(256)}
    for (a, b), novo_id in merges:
        vocab[novo_id] = vocab[a] + vocab[b]
    return b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")


def taxa_de_compressao(texto, merges):
    return len(texto.encode("utf-8")) / len(codificar(texto, merges))


if __name__ == "__main__":
    fabulas = open("fabulas.txt", encoding="utf-8").read()
    merges = treinar_bpe(fabulas, 100)
    ids = codificar("a formiga respondeu", merges)
    print(len(ids), decodificar(ids, merges))
    print(round(taxa_de_compressao(fabulas, merges), 3))
```

```python name="decodificar junta as partes na ordem trocada"
from bpe import mesclar, treinar_bpe


def codificar(texto, merges):
    ids = list(texto.encode("utf-8"))
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, merges):
    vocab = {i: bytes([i]) for i in range(256)}
    for (a, b), novo_id in merges:
        vocab[novo_id] = vocab[b] + vocab[a]
    return b"".join(vocab[i] for i in ids).decode("utf-8", errors="replace")


def taxa_de_compressao(texto, merges):
    return len(texto.encode("utf-8")) / len(codificar(texto, merges))


if __name__ == "__main__":
    fabulas = open("fabulas.txt", encoding="utf-8").read()
    merges = treinar_bpe(fabulas, 100)
    ids = codificar("a formiga respondeu", merges)
    print(len(ids), decodificar(ids, merges))
    print(round(taxa_de_compressao(fabulas, merges), 3))
```

## Passo 8 · Quiz · Tokens e letras

### Pergunta

Um tokenizador BPE foi treinado em bytes com 3 mesclagens, nesta ordem: `((97, 97), 256)`, `((97, 98), 257)`, `((256, 257), 258)`. Quantos tokens tem a codificação de `"aaab"` (bytes 97, 97, 97, 98)?

- [ ] 3 tokens: `[256, 97, 98]`, porque depois da primeira mesclagem sobram um `a` e um `b` soltos
- [ ] 2 tokens: `[256, 257]`, porque a terceira mesclagem só vale durante o treino
- [x] 1 token: `[258]`, porque as mesclagens são aplicadas na ordem e a terceira junta o 256 com o 257
- [ ] 4 tokens: nenhuma mesclagem se aplica a um texto que não estava no treino

> Aplicando na ordem: `(97, 97)` dá `[256, 97, 98]`, `(97, 98)` dá `[256, 257]` e `(256, 257)` dá `[258]`. Parar em 3 tokens ignora a segunda mesclagem; parar em 2 ignora a terceira, que vale para qualquer texto; e as mesclagens se aplicam a qualquer sequência de bytes, vista no treino ou não.

### Pergunta

Nas fábulas da lição, 50 mesclagens levam 2 777 bytes a 1 723 tokens, e 200 mesclagens levam a 1 066 tokens. O mesmo vocabulário de 200 mesclagens, aplicado a 2 580 bytes de frases de outro texto em português (como `a padeira leva o pão na praça.`), que não participou do treino, produz 1 424 tokens: 1,81 byte por token. O que explica a diferença para os 2,61 das fábulas?

- [x] As mesclagens foram escolhidas pelos pares frequentes das fábulas; num texto com outras palavras, muitas delas não se aplicam, e a taxa medida no próprio texto de treino é otimista
- [ ] A função de codificar tem um defeito, porque a taxa de compressão de um vocabulário é a mesma em qualquer texto
- [ ] O segundo texto tem outro tamanho, e a taxa de compressão cai sempre que o texto cresce
- [ ] Com 200 mesclagens, o vocabulário ficou grande demais e passou a gastar mais de um token por byte

> O vocabulário guarda os pares frequentes do texto de treino, e a compressão em outro texto depende de quanto ele se parece com o treino. A taxa não é uma constante do vocabulário; não depende do tamanho do texto, e sim do conteúdo; e 1,81 byte por token ainda é mais de um byte por token, nunca menos (no pior caso, cada byte é um token e a taxa é 1).

### Pergunta

Um modelo de linguagem que usa subpalavras erra ao responder quantas vezes a letra `r` aparece numa palavra comprida. Qual é a explicação ligada à tokenização?

- [ ] O tokenizador apaga as letras repetidas da palavra antes de entregá-la ao modelo
- [x] A palavra chega ao modelo como alguns números de tokens, e as letras dentro de cada token não estão visíveis na entrada
- [ ] O modelo recebe os bytes um por um e perde a conta porque a sequência fica longa
- [ ] Letras acentuadas ocupam dois bytes, e por isso toda contagem de letras sai dobrada

> A entrada do modelo são ids de tokens como `formi` e `ga `, e nada na entrada diz que letras cada id contém. O BPE não apaga nada (a volta é exata); com subpalavras, o modelo justamente não vê bytes um por um; e os dois bytes de uma letra acentuada não dobram contagem nenhuma, só mudam o número de tokens.
