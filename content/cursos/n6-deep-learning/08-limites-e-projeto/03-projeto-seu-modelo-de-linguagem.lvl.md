---
slug: n6-m8-03-projeto-seu-modelo-de-linguagem
titulo: 'Projeto final: seu próprio modelo de linguagem'
descricao: 'Do tokenizador à geração: construa, treine, avalie e documente um modelo de linguagem em numpy sobre um corpus em português, com testes de gradiente, curvas, amostragem e um relatório de limitações.'
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 300
tempo_min: 240
publicada: true
projeto: true
solucao_apos_tentativas: 3
objetivos:
- Integrar tokenizador BPE, embeddings, blocos transformer, treino com Adam e geração em um pacote coeso
- Validar cada componente com verificação numérica de gradientes e testes de causalidade
- Treinar dentro de um orçamento de tempo e reportar perda de validação, perplexidade e amostras
- Documentar limitações, vieses observados e escolhas de projeto em um relatório gerado pelo código
---

## Passo 1 · Leitura · O que você vai construir

Este é o projeto do nível: um modelo de linguagem completo em numpy, do texto cru ao relatório. Cada peça já apareceu no curso. O trabalho agora é fazê-las funcionar juntas, com contratos fixos entre elas.

```mermaid
flowchart LR
    A["tokenizador"] --> B["lotes"]
    B --> C["modelo"]
    C --> D["treino"]
    D --> E["geração e avaliação"]
    E --> F["relatório"]
```

| Passo | Peça | Funções |
|---|---|---|
| 3 | tokenizador | `treinar_bpe`, `codificar`, `decodificar`, `taxa_de_compressao`, `preparar` |
| 4 | modelo | `contar_parametros`, `montar`, `forward`, `perda_e_gradientes` |
| 5 | treino | `gerar_lote`, `cortar_gradientes`, `Adam`, `treinar`, `salvar`, `carregar` |
| 6 | geração e avaliação | `gerar`, `perplexidade`, `teste_de_causalidade` |
| 7 | relatório | `gerar_relatorio` |

A partir do passo 5, o que você escreveu antes chega pronto em arquivos de apoio (`modelo.py`, `tokenizador.py`), na versão de referência, para que um erro antigo não contamine o passo novo.

**Dados.** O `corpus.py` gera as frases da vila. O treino é `gerar_corpus(1500, 0)` e a validação é `gerar_corpus(150, 1)`, com outra semente.

**Tokenizador.** É o BPE do módulo 7 com uma troca: a base são os caracteres distintos do texto de treino, e não os 256 bytes. O corpus tem 29 caracteres; com 40 mesclagens, $V = 69$. Com a base de bytes seriam 296 tokens e 32 096 parâmetros, quase metade deles em linhas de embedding que nunca aparecem no texto.

**Modelo.** $T = 16$, $d = 32$, 4 cabeças e 1 bloco: 17 568 parâmetros.

```python
config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
base, merges, ids_treino, ids_val = preparar(texto_treino, texto_val, 40)
params = montar(config, 0)
historico = treinar(params, ids_treino, config_de_treino, 600, 0, perda_e_gradientes)
print(perplexidade(params, ids_val, 16))
```

**Critérios.** Os gradientes conferem com a diferença central (erro relativo abaixo de $10^{-6}$ por array); o futuro não vaza para o passado; a perplexidade de validação fica abaixo de 60 % da perplexidade de um bigrama de tokens; as amostras se repetem com a mesma semente; o relatório traz a perplexidade de validação e as limitações.

**Como trabalhar.** Faça os passos na ordem. Em cada um, o "Executar" roda o bloco principal com uma demonstração, e a verificação confere cada função com casos pequenos: formas, valores calculados à mão, uma referência escrita de outro jeito e defeitos plantados. Quando um caso falhar, leia o nome dele antes de mexer no código: ele diz qual comportamento não bateu. Os contratos são rígidos de propósito: as chaves do dicionário de parâmetros, a ordem dos sorteios e o formato do relatório precisam ser exatamente os do enunciado, porque é isso que permite carregar os pesos pré-treinados no seu código.

**Orçamento.** O corretor executa o `main.py` inteiro em cada caso, incluindo o bloco `if __name__ == "__main__":`. O treino de 600 passos leva 4,1 s no executor: cabe no "Executar" e não cabe na verificação. Deixe no bloco principal só uma demonstração curta. Os passos 6 e 7 usam pesos pré-treinados com esses 600 passos, que chegam à perplexidade de validação 1,82, contra 4,33 do bigrama.

## Passo 2 · Previsão · Ida e volta de um tokenizador minúsculo

A base tem 7 caracteres, e três mesclagens foram escritas à mão: `"pa"`, `"o "` e, por cima das duas, `"o pa"`. O código codifica `"o pato parou"`, mostra os tokens e decodifica de volta. Aplique as mesclagens na ordem, uma de cada vez, antes de executar.

### Código

```python
base = [" ", "a", "o", "p", "r", "t", "u"]
merges = [((3, 1), 7), ((2, 0), 8), ((8, 7), 9)]


def mesclar(ids, par, novo_id):
    saida, i = [], 0
    while i < len(ids):
        if i < len(ids) - 1 and (ids[i], ids[i + 1]) == par:
            saida.append(novo_id)
            i += 2
        else:
            saida.append(ids[i])
            i += 1
    return saida


texto = "o pato parou"
ids = [base.index(c) for c in texto]
for par, novo_id in merges:
    ids = mesclar(ids, par, novo_id)
print(ids)

pedacos = list(base)
for (a, b), novo_id in merges:
    pedacos.append(pedacos[a] + pedacos[b])
print([pedacos[i] for i in ids])
print("".join(pedacos[i] for i in ids) == texto, len(texto) / len(ids))
```

### Dicas

1. Comece pelos ids dos caracteres: `o` é 2, o espaço é 0, `p` é 3, `a` é 1.
2. A terceira mesclagem junta os tokens 8 e 7, que só existem depois das duas primeiras.
3. O `o` de `parou` não é seguido de espaço, então fica como caractere solto.

### Saída esperada

```text
[9, 5, 9, 4, 2, 6]
['o pa', 't', 'o pa', 'r', 'o', 'u']
True 2.0
```

## Passo 3 · Exercício · Tokenizador

Escreva o tokenizador do projeto: um BPE sobre **caracteres**. `contar_pares` e `mesclar` são as do módulo 7 e já vêm prontas.

- `treinar_bpe(texto, n_mesclas)` devolve `(base, merges)`. `base` é a lista ordenada dos caracteres distintos do texto, e o id de cada caractere é a posição dele na base. `merges` é uma lista de `((a, b), novo_id)`: a cada rodada, o par de tokens vizinhos mais frequente vira um token novo, com id `len(base) + k` na rodada `k`. No empate, vence o menor par (comparação de tuplas). Se não sobrar nenhum par, o treino para antes de `n_mesclas`.
- `codificar(texto, base, merges)` devolve a lista de ids: os caracteres trocados pelos ids da base e, depois, cada mesclagem aplicada na ordem do treino. Um caractere fora da base levanta `ValueError`.
- `decodificar(ids, base, merges)` devolve o texto. A ida e volta é exata.
- `taxa_de_compressao(texto, base, merges)` devolve os caracteres por token: `len(texto)` dividido pelo número de tokens. O texto vazio levanta `ValueError`.
- `preparar(texto_treino, texto_val, n_mesclas)` devolve `(base, merges, ids_treino, ids_val)`, com os ids em arrays do numpy de inteiros. A base e as mesclagens são aprendidas **só** com o texto de treino; a validação é apenas codificada.

### Instruções

1. `treinar_bpe`: monte a base, converta o texto em ids e repita `n_mesclas` vezes: contar os pares, escolher o mais frequente (no empate, o menor), mesclar e registrar.
2. `codificar`: ids da base, depois todas as mesclagens na ordem; caractere desconhecido levanta `ValueError`.
3. `decodificar`: cada token novo vale a concatenação dos textos das suas duas partes.
4. `taxa_de_compressao`: caracteres divididos por tokens, com `ValueError` para o texto vazio.
5. `preparar`: treine o BPE só no texto de treino e codifique os dois textos em arrays de inteiros.

### Código inicial

```python
import numpy as np


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
    # devolve (base, merges)
    pass


def codificar(texto, base, merges):
    # devolve a lista de ids
    pass


def decodificar(ids, base, merges):
    # devolve o texto
    pass


def taxa_de_compressao(texto, base, merges):
    # caracteres por token
    pass


def preparar(texto_treino, texto_val, n_mesclas):
    # devolve (base, merges, ids_treino, ids_val)
    pass


if __name__ == "__main__":
    import corpus

    treino, val = corpus.gerar_corpus(60, 0), corpus.gerar_corpus(10, 1)
    print(preparar(treino, val, 40))
```
```python path=corpus.py
"""Corpus do curso: frases geradas por uma gramática pequena sobre uma vila fictícia."""
import numpy as np

SUJEITOS = ["a padeira", "o ferreiro", "a tecelã", "o pescador", "a moleira", "o pastor", "a oleira", "o barqueiro"]
VERBOS = ["leva", "guarda", "vende", "procura", "conserta", "divide"]
OBJETOS = ["o pão", "a rede", "o barco", "a lenha", "o queijo", "a farinha", "o cesto", "o azeite"]
LUGARES = ["na praça", "no moinho", "na ponte", "no porto", "na feira", "no celeiro"]
TEMPOS = ["de manhã", "à tarde", "à noite", "até o almoço", "antes da chuva", "depois da festa"]


def gerar_corpus(n_frases=1500, semente=0):
    """Devolve n_frases frases, uma por linha; metade delas termina com um tempo."""
    rng = np.random.default_rng(semente)
    frases = []
    for _ in range(n_frases):
        partes = [str(rng.choice(SUJEITOS)), str(rng.choice(VERBOS)), str(rng.choice(OBJETOS)), str(rng.choice(LUGARES))]
        if rng.random() < 0.5:
            partes.append(str(rng.choice(TEMPOS)))
        frases.append(" ".join(partes) + ".")
    return "\n".join(frases) + "\n"


def vocabulario(texto):
    """Caracteres distintos do texto, em ordem."""
    return sorted(set(texto))


def codificar(texto, vocab):
    """Texto -> array de ids (posição de cada caractere em vocab)."""
    para_id = {c: i for i, c in enumerate(vocab)}
    return np.array([para_id[c] for c in texto], dtype=np.intp)


def decodificar(ids, vocab):
    """Ids -> texto."""
    return "".join(vocab[int(i)] for i in ids)


def carregar(n_frases=1500, semente=0, fracao_treino=0.9):
    """Devolve (vocab, ids_treino, ids_val): os últimos 10 % do texto ficam para validação."""
    texto = gerar_corpus(n_frases, semente)
    vocab = vocabulario(texto)
    ids = codificar(texto, vocab)
    corte = int(len(ids) * fracao_treino)
    return vocab, ids[:corte], ids[corte:]
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
import numpy as np


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
    base = sorted(set(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = len(base) + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    for c in texto:
        if c not in para_id:
            raise ValueError(f"caractere fora do vocabulário: {c!r}")
    ids = [para_id[c] for c in texto]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(pedacos[a] + pedacos[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(texto) / len(codificar(texto, base, merges))


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val


if __name__ == "__main__":
    import corpus

    treino, val = corpus.gerar_corpus(60, 0), corpus.gerar_corpus(10, 1)
    base, merges, ids_treino, ids_val = preparar(treino, val, 40)
    print(len(base) + len(merges), len(ids_treino), round(taxa_de_compressao(val, base, merges), 2))
    print(repr(decodificar(ids_val[:12], base, merges)))
```
```python path=corpus.py
"""Corpus do curso: frases geradas por uma gramática pequena sobre uma vila fictícia."""
import numpy as np

SUJEITOS = ["a padeira", "o ferreiro", "a tecelã", "o pescador", "a moleira", "o pastor", "a oleira", "o barqueiro"]
VERBOS = ["leva", "guarda", "vende", "procura", "conserta", "divide"]
OBJETOS = ["o pão", "a rede", "o barco", "a lenha", "o queijo", "a farinha", "o cesto", "o azeite"]
LUGARES = ["na praça", "no moinho", "na ponte", "no porto", "na feira", "no celeiro"]
TEMPOS = ["de manhã", "à tarde", "à noite", "até o almoço", "antes da chuva", "depois da festa"]


def gerar_corpus(n_frases=1500, semente=0):
    """Devolve n_frases frases, uma por linha; metade delas termina com um tempo."""
    rng = np.random.default_rng(semente)
    frases = []
    for _ in range(n_frases):
        partes = [str(rng.choice(SUJEITOS)), str(rng.choice(VERBOS)), str(rng.choice(OBJETOS)), str(rng.choice(LUGARES))]
        if rng.random() < 0.5:
            partes.append(str(rng.choice(TEMPOS)))
        frases.append(" ".join(partes) + ".")
    return "\n".join(frases) + "\n"


def vocabulario(texto):
    """Caracteres distintos do texto, em ordem."""
    return sorted(set(texto))


def codificar(texto, vocab):
    """Texto -> array de ids (posição de cada caractere em vocab)."""
    para_id = {c: i for i, c in enumerate(vocab)}
    return np.array([para_id[c] for c in texto], dtype=np.intp)


def decodificar(ids, vocab):
    """Ids -> texto."""
    return "".join(vocab[int(i)] for i in ids)


def carregar(n_frases=1500, semente=0, fracao_treino=0.9):
    """Devolve (vocab, ids_treino, ids_val): os últimos 10 % do texto ficam para validação."""
    texto = gerar_corpus(n_frases, semente)
    vocab = vocabulario(texto)
    ids = codificar(texto, vocab)
    corte = int(len(ids) * fracao_treino)
    return vocab, ids[:corte], ids[corte:]
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

1. `min(contagem, key=lambda p: (-contagem[p], p))` escolhe o par mais frequente e, no empate, o menor.
2. Para decodificar, construa uma lista de textos: os da base e, para cada mesclagem, a soma dos textos das duas partes (que podem ser tokens novos).
3. Se a validação entrar no treino do BPE, a perplexidade de validação deixa de medir texto novo.

### Verificação

```json
[
  {"id": "base-ordenada", "checkpoint": 1, "kind": "expr", "expr": "[treinar_bpe(\"o pato parou\", 0)[0], len(treinar_bpe(\"o pato parou\", 0)[1])]", "expected": [[" ", "a", "o", "p", "r", "t", "u"], 0], "name": "A base são os caracteres distintos, em ordem; sem mesclagens, a lista fica vazia"},
  {"id": "mais-frequente", "checkpoint": 1, "kind": "expr", "expr": "[[list(p), n] for p, n in treinar_bpe(\"xyxyxy ab\", 1)[1]]", "expected": [[[3, 4], 5]], "name": "O par mais frequente vence, mesmo sendo o maior", "hint": "\"xy\" aparece 3 vezes; os outros pares, no máximo 2."},
  {"id": "empate-menor-par", "checkpoint": 1, "kind": "expr", "expr": "[[list(p), n] for p, n in treinar_bpe(\"dcba\", 1)[1]]", "expected": [[[1, 0], 4]], "name": "Com todos os pares empatados, vence o menor par", "hint": "Os pares são (3, 2), (2, 1) e (1, 0); o menor é (1, 0), que não é o primeiro do texto."},
  {"id": "tres-mesclas", "checkpoint": 1, "kind": "expr", "expr": "[[list(p), n] for p, n in treinar_bpe(\"o pato parou o pato\", 3)[1]]", "expected": [[[0, 3], 7], [[2, 7], 8], [[8, 1], 9]], "name": "Três mesclagens em \"o pato parou o pato\""},
  {"id": "ids-novos", "checkpoint": 1, "kind": "expr", "setup": "with open(\"fabulas.txt\", encoding=\"utf-8\") as _arq:\n    _fab = _arq.read()\n_b, _m = treinar_bpe(_fab, 40)\n", "expr": "[n - len(_b) for _, n in _m][:5] + [len(_m)]", "expected": [0, 1, 2, 3, 4, 40], "name": "Os tokens novos são numerados a partir de len(base)", "hint": "A base de caracteres não tem 256 itens: o primeiro id novo é len(base)."},
  {"id": "para-cedo", "checkpoint": 1, "kind": "expr", "expr": "[[list(p), n] for p, n in treinar_bpe(\"aaaa\", 10)[1]]", "expected": [[[0, 0], 1], [[1, 1], 2]], "name": "\"aaaa\" só permite duas mesclagens, e a segunda junta dois tokens novos"},
  {"id": "codificar-exemplo", "checkpoint": 2, "kind": "expr", "setup": "_base = [\" \", \"a\", \"o\", \"p\", \"r\", \"t\", \"u\"]\n_m = [((3, 1), 7), ((2, 0), 8), ((8, 7), 9)]\n", "expr": "codificar(\"o pato parou\", _base, _m)", "expected": [9, 5, 9, 4, 2, 6], "name": "O exemplo da Previsão: 12 caracteres viram 6 tokens"},
  {"id": "codificar-sem-mesclas", "checkpoint": 2, "kind": "expr", "setup": "_base = [\" \", \"a\", \"o\", \"p\", \"r\", \"t\", \"u\"]\n_m = [((3, 1), 7), ((2, 0), 8), ((8, 7), 9)]\n", "expr": "codificar(\"pato\", _base, [])", "expected": [3, 1, 5, 2], "name": "Sem mesclagens, os ids são as posições na base"},
  {"id": "codificar-ordem", "checkpoint": 2, "kind": "expr", "expr": "codificar(\"abcbc\", [\"a\", \"b\", \"c\"], [((0, 1), 3), ((3, 2), 4), ((1, 2), 5)])", "expected": [4, 5], "name": "As mesclagens são aplicadas na ordem do treino", "hint": "(1, 2) só é tentado depois de (0, 1) e de (3, 2)."},
  {"id": "codificar-vazio", "checkpoint": 2, "kind": "expr", "setup": "_base = [\" \", \"a\", \"o\", \"p\", \"r\", \"t\", \"u\"]\n_m = [((3, 1), 7), ((2, 0), 8), ((8, 7), 9)]\n", "expr": "codificar(\"\", _base, _m)", "expected": [], "name": "O texto vazio vira a lista vazia"},
  {"id": "codificar-desconhecido", "checkpoint": 2, "kind": "expr", "setup": "_base = [\" \", \"a\", \"o\", \"p\", \"r\", \"t\", \"u\"]\n_m = [((3, 1), 7), ((2, 0), 8), ((8, 7), 9)]\n", "expr": "codificar(\"o gato\", _base, _m)", "raises": "ValueError", "name": "Um caractere fora da base levanta ValueError", "hint": "O \"g\" não está na base: avise em vez de pular o caractere."},
  {"id": "decodificar-exemplo", "checkpoint": 3, "kind": "expr", "setup": "_base = [\" \", \"a\", \"o\", \"p\", \"r\", \"t\", \"u\"]\n_m = [((3, 1), 7), ((2, 0), 8), ((8, 7), 9)]\n", "expr": "decodificar([9, 5, 9, 4, 2, 6], _base, _m)", "expected": "o pato parou", "name": "Os 6 tokens da Previsão voltam a ser o texto", "hint": "O token 9 é feito dos tokens 8 e 7, que também são novos."},
  {"id": "decodificar-array", "checkpoint": 3, "kind": "expr", "setup": "_base = [\" \", \"a\", \"o\", \"p\", \"r\", \"t\", \"u\"]\n_m = [((3, 1), 7), ((2, 0), 8), ((8, 7), 9)]\nimport numpy as np\n", "expr": "decodificar(np.array([8, 7, 6]), _base, _m)", "expected": "o pau", "name": "decodificar aceita um array do numpy"},
  {"id": "ida-e-volta-fabulas", "checkpoint": 3, "kind": "expr", "setup": "with open(\"fabulas.txt\", encoding=\"utf-8\") as _arq:\n    _fab = _arq.read()\n_b, _m = treinar_bpe(_fab, 40)\n", "expr": "[decodificar(codificar(_fab, _b, _m), _b, _m) == _fab, len(codificar(_fab, _b, _m))]", "expected": [true, 1752], "name": "Ida e volta exata nas fábulas, com 40 mesclagens"},
  {"id": "taxa-exemplo", "checkpoint": 4, "kind": "expr", "setup": "_base = [\" \", \"a\", \"o\", \"p\", \"r\", \"t\", \"u\"]\n_m = [((3, 1), 7), ((2, 0), 8), ((8, 7), 9)]\n", "expr": "taxa_de_compressao(\"o pato parou\", _base, _m)", "expected": 2.0, "tolerance": 1e-12, "name": "12 caracteres em 6 tokens: 2 caracteres por token"},
  {"id": "taxa-sem-mesclas", "checkpoint": 4, "kind": "expr", "setup": "_base = [\" \", \"a\", \"o\", \"p\", \"r\", \"t\", \"u\"]\n_m = [((3, 1), 7), ((2, 0), 8), ((8, 7), 9)]\n", "expr": "taxa_de_compressao(\"pato\", _base, [])", "expected": 1.0, "tolerance": 1e-12, "name": "Sem mesclagens, a taxa é 1"},
  {"id": "taxa-fabulas", "checkpoint": 4, "kind": "expr", "setup": "with open(\"fabulas.txt\", encoding=\"utf-8\") as _arq:\n    _fab = _arq.read()\n_b, _m = treinar_bpe(_fab, 40)\n", "expr": "taxa_de_compressao(_fab, _b, _m)", "expected": 1.542808219178082, "tolerance": 1e-09, "name": "Taxa de compressão das fábulas com 40 mesclagens"},
  {"id": "taxa-vazia", "checkpoint": 4, "kind": "expr", "setup": "_base = [\" \", \"a\", \"o\", \"p\", \"r\", \"t\", \"u\"]\n_m = [((3, 1), 7), ((2, 0), 8), ((8, 7), 9)]\n", "expr": "taxa_de_compressao(\"\", _base, _m)", "raises": "ValueError", "name": "O texto vazio levanta ValueError"},
  {"id": "preparar-so-treino", "checkpoint": 5, "kind": "expr", "setup": "_tr, _va = \"abababab cdcd\", \"cdcdcdcdcdcdcdcd ab\"\n_r = preparar(_tr, _va, 1)\n", "expr": "[_r[0], [[list(p), n] for p, n in _r[1]]]", "expected": [[" ", "a", "b", "c", "d"], [[[1, 2], 5]]], "name": "A mesclagem vem do treino, mesmo com outro par dominando a validação", "hint": "No treino o par mais frequente é \"ab\"; em treino mais validação seria \"cd\"."},
  {"id": "preparar-ids", "checkpoint": 5, "kind": "expr", "setup": "_tr, _va = \"abababab cdcd\", \"cdcdcdcdcdcdcdcd ab\"\n_r = preparar(_tr, _va, 1)\n", "expr": "[_r[2].tolist(), _r[3].tolist()]", "expected": [[5, 5, 5, 5, 0, 3, 4, 3, 4], [3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 3, 4, 0, 5]], "name": "Os dois textos são codificados com o tokenizador do treino"},
  {"id": "preparar-arrays", "checkpoint": 5, "kind": "expr", "setup": "_tr, _va = \"abababab cdcd\", \"cdcdcdcdcdcdcdcd ab\"\n_r = preparar(_tr, _va, 1)\nimport numpy as np\n", "expr": "[[type(a).__name__, bool(np.issubdtype(a.dtype, np.integer)), a.ndim] for a in _r[2:]]", "expected": [["ndarray", true, 1], ["ndarray", true, 1]], "name": "ids_treino e ids_val são arrays de inteiros de uma dimensão"},
  {"id": "preparar-val-desconhecido", "checkpoint": 5, "kind": "expr", "expr": "preparar(\"abab\", \"abz\", 1)", "raises": "ValueError", "name": "Caractere da validação que não existe no treino levanta ValueError", "hint": "A base vem só do treino; o \"z\" não tem id."},
  {"id": "preparar-corpus", "checkpoint": 5, "kind": "expr", "setup": "import corpus\n_tr, _va = corpus.gerar_corpus(80, 0), corpus.gerar_corpus(10, 1)\n_b, _m, _itr, _iva = preparar(_tr, _va, 40)\n", "expr": "[len(_b), len(_m), len(_itr), len(_iva), decodificar(_iva, _b, _m) == _va]", "expected": [29, 40, 1669, 219, true], "name": "80 frases do corpus com 40 mesclagens: tamanhos e volta exata da validação"}
]
```

### Soluções erradas

```python name="tokenizador treinado com a validação"
import numpy as np


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
    base = sorted(set(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = len(base) + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    for c in texto:
        if c not in para_id:
            raise ValueError(f"caractere fora do vocabulário: {c!r}")
    ids = [para_id[c] for c in texto]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(pedacos[a] + pedacos[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(texto) / len(codificar(texto, base, merges))


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino + texto_val, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val


if __name__ == "__main__":
    import corpus

    treino, val = corpus.gerar_corpus(60, 0), corpus.gerar_corpus(10, 1)
    base, merges, ids_treino, ids_val = preparar(treino, val, 40)
    print(len(base) + len(merges), len(ids_treino), round(taxa_de_compressao(val, base, merges), 2))
    print(repr(decodificar(ids_val[:12], base, merges)))
```

```python name="empate decidido pelo primeiro par visto"
import numpy as np


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
    base = sorted(set(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = max(contagem, key=contagem.get)
        novo_id = len(base) + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    for c in texto:
        if c not in para_id:
            raise ValueError(f"caractere fora do vocabulário: {c!r}")
    ids = [para_id[c] for c in texto]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(pedacos[a] + pedacos[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(texto) / len(codificar(texto, base, merges))


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val


if __name__ == "__main__":
    import corpus

    treino, val = corpus.gerar_corpus(60, 0), corpus.gerar_corpus(10, 1)
    base, merges, ids_treino, ids_val = preparar(treino, val, 40)
    print(len(base) + len(merges), len(ids_treino), round(taxa_de_compressao(val, base, merges), 2))
    print(repr(decodificar(ids_val[:12], base, merges)))
```

```python name="ids novos a partir de 256"
import numpy as np


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
    base = sorted(set(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = 256 + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    for c in texto:
        if c not in para_id:
            raise ValueError(f"caractere fora do vocabulário: {c!r}")
    ids = [para_id[c] for c in texto]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(pedacos[a] + pedacos[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(texto) / len(codificar(texto, base, merges))


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val


if __name__ == "__main__":
    import corpus

    treino, val = corpus.gerar_corpus(60, 0), corpus.gerar_corpus(10, 1)
    base, merges, ids_treino, ids_val = preparar(treino, val, 40)
    print(len(base) + len(merges), len(ids_treino), round(taxa_de_compressao(val, base, merges), 2))
    print(repr(decodificar(ids_val[:12], base, merges)))
```

```python name="base na ordem em que os caracteres aparecem"
import numpy as np


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
    base = list(dict.fromkeys(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = len(base) + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    for c in texto:
        if c not in para_id:
            raise ValueError(f"caractere fora do vocabulário: {c!r}")
    ids = [para_id[c] for c in texto]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(pedacos[a] + pedacos[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(texto) / len(codificar(texto, base, merges))


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val


if __name__ == "__main__":
    import corpus

    treino, val = corpus.gerar_corpus(60, 0), corpus.gerar_corpus(10, 1)
    base, merges, ids_treino, ids_val = preparar(treino, val, 40)
    print(len(base) + len(merges), len(ids_treino), round(taxa_de_compressao(val, base, merges), 2))
    print(repr(decodificar(ids_val[:12], base, merges)))
```

```python name="codificar aplica as mesclagens de trás para frente"
import numpy as np


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
    base = sorted(set(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = len(base) + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    for c in texto:
        if c not in para_id:
            raise ValueError(f"caractere fora do vocabulário: {c!r}")
    ids = [para_id[c] for c in texto]
    for par, novo_id in reversed(merges):
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(pedacos[a] + pedacos[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(texto) / len(codificar(texto, base, merges))


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val


if __name__ == "__main__":
    import corpus

    treino, val = corpus.gerar_corpus(60, 0), corpus.gerar_corpus(10, 1)
    base, merges, ids_treino, ids_val = preparar(treino, val, 40)
    print(len(base) + len(merges), len(ids_treino), round(taxa_de_compressao(val, base, merges), 2))
    print(repr(decodificar(ids_val[:12], base, merges)))
```

```python name="codificar pula o caractere desconhecido"
import numpy as np


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
    base = sorted(set(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = len(base) + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto if c in para_id]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(pedacos[a] + pedacos[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(texto) / len(codificar(texto, base, merges))


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val


if __name__ == "__main__":
    import corpus

    treino, val = corpus.gerar_corpus(60, 0), corpus.gerar_corpus(10, 1)
    base, merges, ids_treino, ids_val = preparar(treino, val, 40)
    print(len(base) + len(merges), len(ids_treino), round(taxa_de_compressao(val, base, merges), 2))
    print(repr(decodificar(ids_val[:12], base, merges)))
```

```python name="decodificar monta os tokens novos só com a base"
import numpy as np


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
    base = sorted(set(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = len(base) + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    for c in texto:
        if c not in para_id:
            raise ValueError(f"caractere fora do vocabulário: {c!r}")
    ids = [para_id[c] for c in texto]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(base[a] + base[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(texto) / len(codificar(texto, base, merges))


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val


if __name__ == "__main__":
    import corpus

    treino, val = corpus.gerar_corpus(60, 0), corpus.gerar_corpus(10, 1)
    base, merges, ids_treino, ids_val = preparar(treino, val, 40)
    print(len(base) + len(merges), len(ids_treino), round(taxa_de_compressao(val, base, merges), 2))
    print(repr(decodificar(ids_val[:12], base, merges)))
```

```python name="taxa de compressão invertida"
import numpy as np


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
    base = sorted(set(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = len(base) + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    for c in texto:
        if c not in para_id:
            raise ValueError(f"caractere fora do vocabulário: {c!r}")
    ids = [para_id[c] for c in texto]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(pedacos[a] + pedacos[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(codificar(texto, base, merges)) / len(texto)


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val


if __name__ == "__main__":
    import corpus

    treino, val = corpus.gerar_corpus(60, 0), corpus.gerar_corpus(10, 1)
    base, merges, ids_treino, ids_val = preparar(treino, val, 40)
    print(len(base) + len(merges), len(ids_treino), round(taxa_de_compressao(val, base, merges), 2))
    print(repr(decodificar(ids_val[:12], base, merges)))
```

## Passo 4 · Exercício · Modelo

Escreva o mini-GPT do projeto. A configuração é um dicionário com `"V"` (vocabulário), `"T"` (contexto), `"d"` (dimensão) e `"blocos"`. O número de cabeças é fixo: `CABECAS = 4`. Os parâmetros ficam num dicionário de arrays com estas chaves, em que `i` é o índice do bloco, a partir de 0:

| chave | forma | início |
|---|---|---|
| `tok`, `pos` | `(V, d)`, `(T, d)` | normal, desvio 0,1 |
| `b{i}.ln1_g`, `b{i}.ln2_g`, `lnf_g` | `(d,)` | uns |
| `b{i}.ln1_b`, `b{i}.ln2_b`, `lnf_b` | `(d,)` | zeros |
| `b{i}.Wq`, `b{i}.Wk`, `b{i}.Wv`, `b{i}.Wo` | `(d, d)` | normal, desvio $d^{-1/2}$ |
| `b{i}.W1`, `b{i}.c1` | `(d, 4d)`, `(4d,)` | normal com desvio $\sqrt{2/d}$; zeros |
| `b{i}.W2`, `b{i}.c2` | `(4d, d)`, `(d,)` | normal com desvio $(4d)^{-1/2}$; zeros |
| `Ws` | `(d, V)` | normal, desvio $0{,}1 \cdot d^{-1/2}$ |

O forward é o do módulo 7, com a normalização antes de cada subcamada:

1. $x = \text{tok}[\text{ids}] + \text{pos}[:T']$, em que $T'$ é o comprimento recebido (pode ser menor que o contexto);
2. em cada bloco: $a = \text{LN}_1(x)$; atenção causal de 4 cabeças com $Q = aW_q$, $K = aW_k$, $V = aW_v$, pontuações divididas por $\sqrt{d/4}$ e o futuro mascarado; $x = x + \text{atenção} \cdot W_o$; $m = \text{LN}_2(x)$; $x = x + \text{ReLU}(mW_1 + c_1)W_2 + c_2$;
3. $\text{logits} = \text{LN}_f(x)\,W_s$.

A LayerNorm age no último eixo: $g \cdot (x - \mu) / \sqrt{\sigma^2 + 10^{-5}} + b$.

- `contar_parametros(config)` devolve o total de números do modelo, calculado só com a configuração.
- `montar(config, semente)` cria `rng = np.random.default_rng(semente)` e devolve o dicionário de parâmetros com as chaves, as formas e os inícios da tabela.
- `forward(params, ids)` recebe `ids` de forma `(B, T')` e devolve os logits `(B, T', V)`. O número de blocos sai das chaves de `params`.
- `perda_e_gradientes(params, ids, alvos)` devolve `(perda, grads)`: a entropia cruzada média sobre as $B \cdot T'$ posições, como `float`, e um dicionário com as mesmas chaves e formas de `params`.

Nenhuma função altera `params`.

### Instruções

1. `contar_parametros`: some os tamanhos de todos os arrays da tabela, para `blocos` blocos.
2. `montar`: um gerador com a semente, as matrizes sorteadas com o desvio da tabela, ganhos em um e vieses em zero.
3. `forward`: embeddings mais posições, os blocos com atenção causal e MLP, a normalização final e a projeção.
4. `perda_e_gradientes`: softmax com entropia cruzada média e o backward de cada operação, na ordem inversa.

### Código inicial

```python
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    # total de números do modelo, calculado só a partir de config
    pass


def montar(config, semente):
    # dicionário de arrays com as chaves e as formas da tabela
    pass


def forward(params, ids):
    # ids (B, T) -> logits (B, T, V)
    pass


def perda_e_gradientes(params, ids, alvos):
    # (perda, grads): entropia cruzada média e um gradiente por parâmetro
    pass


if __name__ == "__main__":
    config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
    params = montar(config, 0)
    ids = np.random.default_rng(0).integers(0, 69, (4, 17))
    print(contar_parametros(config))
    print(perda_e_gradientes(params, ids[:, :-1], ids[:, 1:]))
```

### Solução

```python
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)


if __name__ == "__main__":
    config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
    params = montar(config, 0)
    ids = np.random.default_rng(0).integers(0, 69, (4, 17))
    perda, grads = perda_e_gradientes(params, ids[:, :-1], ids[:, 1:])
    print(contar_parametros(config), forward(params, ids[:, :-1]).shape, round(perda, 3))
```

### Dicas

1. Cada bloco tem $12d^2 + 9d$ números: quatro matrizes $d \times d$, duas de $4d^2$, dois pares de LayerNorm e os vieses $4d$ e $d$.
2. Guarde no forward o que o backward usa: as entradas normalizadas, $Q$, $K$, $V$, os pesos de atenção e a pré-ativação da ReLU.
3. Um token que aparece duas vezes no lote recebe dois gradientes: use `np.add.at` no embedding. As posições além de $T'$ ficam com gradiente zero.

### Verificação

```json
[
  {"id": "contar-projeto", "checkpoint": 1, "kind": "call", "function": "contar_parametros", "args": [{"V": 69, "T": 16, "d": 32, "blocos": 1}], "expected": 17568, "name": "A configuração do projeto tem 17 568 parâmetros"},
  {"id": "contar-dois-blocos", "checkpoint": 1, "kind": "call", "function": "contar_parametros", "args": [{"V": 29, "T": 16, "d": 32, "blocos": 2}], "expected": 27584, "name": "V = 29 com 2 blocos: 27 584 parâmetros", "hint": "Só a parte dos blocos é multiplicada pelo número de blocos."},
  {"id": "contar-pequeno", "checkpoint": 1, "kind": "call", "function": "contar_parametros", "args": [{"V": 5, "T": 4, "d": 8, "blocos": 1}], "expected": 968, "name": "V = 5, T = 4, d = 8, 1 bloco", "hint": "As posições (T · d) e as duas LayerNorm de cada bloco entram na conta."},
  {"id": "contar-sem-blocos", "checkpoint": 1, "kind": "call", "function": "contar_parametros", "args": [{"V": 10, "T": 3, "d": 4, "blocos": 0}], "expected": 100, "name": "Sem blocos sobram os embeddings, a normalização final e a projeção"},
  {"id": "montar-formas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_p = montar({\"V\": 11, \"T\": 6, \"d\": 8, \"blocos\": 1}, 0)\n", "expr": "sorted([k, list(v.shape)] for k, v in _p.items())", "expected": [["Ws", [8, 11]], ["b0.W1", [8, 32]], ["b0.W2", [32, 8]], ["b0.Wk", [8, 8]], ["b0.Wo", [8, 8]], ["b0.Wq", [8, 8]], ["b0.Wv", [8, 8]], ["b0.c1", [32]], ["b0.c2", [8]], ["b0.ln1_b", [8]], ["b0.ln1_g", [8]], ["b0.ln2_b", [8]], ["b0.ln2_g", [8]], ["lnf_b", [8]], ["lnf_g", [8]], ["pos", [6, 8]], ["tok", [11, 8]]], "name": "As 17 chaves e as formas de um modelo de 1 bloco"},
  {"id": "montar-conta", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_c = {\"V\": 69, \"T\": 16, \"d\": 32, \"blocos\": 2}\n_p = montar(_c, 0)\n", "expr": "[len(_p), int(sum(v.size for v in _p.values())) == contar_parametros(_c)]", "expected": [29, true], "name": "Com 2 blocos são 29 arrays, e a soma dos tamanhos bate com contar_parametros"},
  {"id": "montar-normalizacoes", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_c = {\"V\": 69, \"T\": 16, \"d\": 32, \"blocos\": 2}\n_p = montar(_c, 0)\n", "expr": "[bool(all((_p[k] == 1).all() for k in _p if k.endswith(\"_g\"))), bool(all((_p[k] == 0).all() for k in _p if k.endswith(\"_b\") or k.endswith(\".c1\") or k.endswith(\".c2\")))]", "expected": [true, true], "name": "Ganhos da LayerNorm em 1; vieses da LayerNorm e do MLP em 0"},
  {"id": "montar-desvios", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_c = {\"V\": 69, \"T\": 16, \"d\": 32, \"blocos\": 2}\n_p = montar(_c, 0)\n_alvo = {\"tok\": 0.1, \"pos\": 0.1, \"b0.Wq\": 32 ** -0.5, \"b1.Wo\": 32 ** -0.5, \"b0.W1\": (2 / 32) ** 0.5, \"b1.W2\": 128 ** -0.5, \"Ws\": 0.1 * 32 ** -0.5}\n", "expr": "[bool(abs(_p[k].std() - s) < 5 * s / (2 * _p[k].size) ** 0.5 and abs(_p[k].mean()) < 5 * s / _p[k].size ** 0.5) for k, s in _alvo.items()]", "expected": [true, true, true, true, true, true, true], "name": "Média 0 e desvio da tabela em tok, pos, Wq, Wo, W1, W2 e Ws (5 erros padrão)", "hint": "Confira o desvio de cada matriz: d^(-1/2) na atenção, sqrt(2/d) em W1, (4d)^(-1/2) em W2 e 0,1·d^(-1/2) em Ws."},
  {"id": "montar-semente", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_c = {\"V\": 11, \"T\": 6, \"d\": 8, \"blocos\": 1}\n", "expr": "[bool(np.array_equal(montar(_c, 3)[\"Ws\"], montar(_c, 3)[\"Ws\"])), bool(np.array_equal(montar(_c, 3)[\"Ws\"], montar(_c, 4)[\"Ws\"]))]", "expected": [true, false], "name": "A mesma semente repete os pesos; outra semente muda"},
  {"id": "forward-forma", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n_p = _criar(11, 6, 8, 1, 1)\n_X, _Y = _lote(11, 3, 6, 2)\n", "expr": "list(forward(_p, _X).shape)", "expected": [3, 6, 11], "name": "Logits com forma (B, T, V)"},
  {"id": "forward-referencia", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n\n\ndef _ln(x, g, b):\n    return g * (x - x.mean(-1, keepdims=True)) / np.sqrt(x.var(-1, keepdims=True) + 1e-5) + b\n\n\ndef _ref(p, ids):\n    B, T = ids.shape\n    d = p[\"tok\"].shape[1]\n    dh = d // 4\n    x = p[\"tok\"][ids] + p[\"pos\"][:T]\n    i = 0\n    while f\"b{i}.Wq\" in p:\n        a = _ln(x, p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"])\n        Q, K, Vv = a @ p[f\"b{i}.Wq\"], a @ p[f\"b{i}.Wk\"], a @ p[f\"b{i}.Wv\"]\n        o = np.zeros_like(x)\n        for c in range(4):\n            s = slice(c * dh, (c + 1) * dh)\n            S = Q[..., s] @ K[..., s].transpose(0, 2, 1) / np.sqrt(dh)\n            for t in range(T):\n                e = np.exp(S[:, t, :t + 1] - S[:, t, :t + 1].max(-1, keepdims=True))\n                o[:, t, s] = np.einsum(\"bj,bjk->bk\", e / e.sum(-1, keepdims=True), Vv[:, :t + 1, s])\n        x = x + o @ p[f\"b{i}.Wo\"]\n        m = _ln(x, p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"])\n        x = x + np.maximum(m @ p[f\"b{i}.W1\"] + p[f\"b{i}.c1\"], 0.0) @ p[f\"b{i}.W2\"] + p[f\"b{i}.c2\"]\n        i += 1\n    return _ln(x, p[\"lnf_g\"], p[\"lnf_b\"]) @ p[\"Ws\"]\n\n\ndef _perda_ref(p, ids, alvos):\n    L = _ref(p, ids)\n    Z = L - L.max(-1, keepdims=True)\n    lp = Z - np.log(np.exp(Z).sum(-1, keepdims=True))\n    B, T = ids.shape\n    return float(-lp[np.arange(B)[:, None], np.arange(T), alvos].mean())\n_p = _criar(11, 6, 8, 1, 1)\n_X, _Y = _lote(11, 3, 6, 2)\n", "expr": "bool(np.allclose(forward(_p, _X), _ref(_p, _X), atol=1e-10))", "expected": true, "name": "Logits iguais aos da referência num modelo pequeno (1 bloco, d = 8)", "hint": "A referência calcula a atenção cabeça por cabeça e posição por posição, olhando só para o passado."},
  {"id": "forward-dois-blocos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n\n\ndef _ln(x, g, b):\n    return g * (x - x.mean(-1, keepdims=True)) / np.sqrt(x.var(-1, keepdims=True) + 1e-5) + b\n\n\ndef _ref(p, ids):\n    B, T = ids.shape\n    d = p[\"tok\"].shape[1]\n    dh = d // 4\n    x = p[\"tok\"][ids] + p[\"pos\"][:T]\n    i = 0\n    while f\"b{i}.Wq\" in p:\n        a = _ln(x, p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"])\n        Q, K, Vv = a @ p[f\"b{i}.Wq\"], a @ p[f\"b{i}.Wk\"], a @ p[f\"b{i}.Wv\"]\n        o = np.zeros_like(x)\n        for c in range(4):\n            s = slice(c * dh, (c + 1) * dh)\n            S = Q[..., s] @ K[..., s].transpose(0, 2, 1) / np.sqrt(dh)\n            for t in range(T):\n                e = np.exp(S[:, t, :t + 1] - S[:, t, :t + 1].max(-1, keepdims=True))\n                o[:, t, s] = np.einsum(\"bj,bjk->bk\", e / e.sum(-1, keepdims=True), Vv[:, :t + 1, s])\n        x = x + o @ p[f\"b{i}.Wo\"]\n        m = _ln(x, p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"])\n        x = x + np.maximum(m @ p[f\"b{i}.W1\"] + p[f\"b{i}.c1\"], 0.0) @ p[f\"b{i}.W2\"] + p[f\"b{i}.c2\"]\n        i += 1\n    return _ln(x, p[\"lnf_g\"], p[\"lnf_b\"]) @ p[\"Ws\"]\n\n\ndef _perda_ref(p, ids, alvos):\n    L = _ref(p, ids)\n    Z = L - L.max(-1, keepdims=True)\n    lp = Z - np.log(np.exp(Z).sum(-1, keepdims=True))\n    B, T = ids.shape\n    return float(-lp[np.arange(B)[:, None], np.arange(T), alvos].mean())\n_p = _criar(7, 5, 8, 2, 3)\n_X, _Y = _lote(7, 2, 5, 4)\n", "expr": "bool(np.allclose(forward(_p, _X), _ref(_p, _X), atol=1e-10))", "expected": true, "name": "Logits iguais aos da referência com 2 blocos"},
  {"id": "forward-projeto", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n\n\ndef _ln(x, g, b):\n    return g * (x - x.mean(-1, keepdims=True)) / np.sqrt(x.var(-1, keepdims=True) + 1e-5) + b\n\n\ndef _ref(p, ids):\n    B, T = ids.shape\n    d = p[\"tok\"].shape[1]\n    dh = d // 4\n    x = p[\"tok\"][ids] + p[\"pos\"][:T]\n    i = 0\n    while f\"b{i}.Wq\" in p:\n        a = _ln(x, p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"])\n        Q, K, Vv = a @ p[f\"b{i}.Wq\"], a @ p[f\"b{i}.Wk\"], a @ p[f\"b{i}.Wv\"]\n        o = np.zeros_like(x)\n        for c in range(4):\n            s = slice(c * dh, (c + 1) * dh)\n            S = Q[..., s] @ K[..., s].transpose(0, 2, 1) / np.sqrt(dh)\n            for t in range(T):\n                e = np.exp(S[:, t, :t + 1] - S[:, t, :t + 1].max(-1, keepdims=True))\n                o[:, t, s] = np.einsum(\"bj,bjk->bk\", e / e.sum(-1, keepdims=True), Vv[:, :t + 1, s])\n        x = x + o @ p[f\"b{i}.Wo\"]\n        m = _ln(x, p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"])\n        x = x + np.maximum(m @ p[f\"b{i}.W1\"] + p[f\"b{i}.c1\"], 0.0) @ p[f\"b{i}.W2\"] + p[f\"b{i}.c2\"]\n        i += 1\n    return _ln(x, p[\"lnf_g\"], p[\"lnf_b\"]) @ p[\"Ws\"]\n\n\ndef _perda_ref(p, ids, alvos):\n    L = _ref(p, ids)\n    Z = L - L.max(-1, keepdims=True)\n    lp = Z - np.log(np.exp(Z).sum(-1, keepdims=True))\n    B, T = ids.shape\n    return float(-lp[np.arange(B)[:, None], np.arange(T), alvos].mean())\n_p = _criar(69, 16, 32, 1, 5)\n_X, _Y = _lote(69, 4, 16, 6)\n", "expr": "bool(np.allclose(forward(_p, _X), _ref(_p, _X), atol=1e-10))", "expected": true, "name": "Logits iguais aos da referência na configuração do projeto"},
  {"id": "forward-contexto-curto", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n\n\ndef _ln(x, g, b):\n    return g * (x - x.mean(-1, keepdims=True)) / np.sqrt(x.var(-1, keepdims=True) + 1e-5) + b\n\n\ndef _ref(p, ids):\n    B, T = ids.shape\n    d = p[\"tok\"].shape[1]\n    dh = d // 4\n    x = p[\"tok\"][ids] + p[\"pos\"][:T]\n    i = 0\n    while f\"b{i}.Wq\" in p:\n        a = _ln(x, p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"])\n        Q, K, Vv = a @ p[f\"b{i}.Wq\"], a @ p[f\"b{i}.Wk\"], a @ p[f\"b{i}.Wv\"]\n        o = np.zeros_like(x)\n        for c in range(4):\n            s = slice(c * dh, (c + 1) * dh)\n            S = Q[..., s] @ K[..., s].transpose(0, 2, 1) / np.sqrt(dh)\n            for t in range(T):\n                e = np.exp(S[:, t, :t + 1] - S[:, t, :t + 1].max(-1, keepdims=True))\n                o[:, t, s] = np.einsum(\"bj,bjk->bk\", e / e.sum(-1, keepdims=True), Vv[:, :t + 1, s])\n        x = x + o @ p[f\"b{i}.Wo\"]\n        m = _ln(x, p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"])\n        x = x + np.maximum(m @ p[f\"b{i}.W1\"] + p[f\"b{i}.c1\"], 0.0) @ p[f\"b{i}.W2\"] + p[f\"b{i}.c2\"]\n        i += 1\n    return _ln(x, p[\"lnf_g\"], p[\"lnf_b\"]) @ p[\"Ws\"]\n\n\ndef _perda_ref(p, ids, alvos):\n    L = _ref(p, ids)\n    Z = L - L.max(-1, keepdims=True)\n    lp = Z - np.log(np.exp(Z).sum(-1, keepdims=True))\n    B, T = ids.shape\n    return float(-lp[np.arange(B)[:, None], np.arange(T), alvos].mean())\n_p = _criar(11, 6, 8, 1, 1)\n_X, _Y = _lote(11, 3, 6, 2)\n", "expr": "[list(forward(_p, _X[:, :2]).shape), bool(np.allclose(forward(_p, _X[:, :2]), _ref(_p, _X[:, :2]), atol=1e-10))]", "expected": [[3, 2, 11], true], "name": "Sequência mais curta que o contexto: usa as primeiras posições", "hint": "Some pos[:T'], não a matriz inteira."},
  {"id": "forward-causal", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n_p = _criar(11, 6, 8, 1, 1)\n_X, _Y = _lote(11, 3, 6, 2)\n_X2 = _X.copy()\n_X2[:, 4] = (_X2[:, 4] + 1) % 11\n", "expr": "[bool(np.allclose(forward(_p, _X)[:, :4], forward(_p, _X2)[:, :4], atol=1e-12)), bool(np.allclose(forward(_p, _X)[:, 4:], forward(_p, _X2)[:, 4:], atol=1e-12))]", "expected": [true, false], "name": "Trocar o token 4 não muda os logits das posições 0 a 3, e muda os seguintes", "hint": "A máscara causal entra antes da softmax, com -inf nas posições futuras."},
  {"id": "perda-referencia", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n\n\ndef _ln(x, g, b):\n    return g * (x - x.mean(-1, keepdims=True)) / np.sqrt(x.var(-1, keepdims=True) + 1e-5) + b\n\n\ndef _ref(p, ids):\n    B, T = ids.shape\n    d = p[\"tok\"].shape[1]\n    dh = d // 4\n    x = p[\"tok\"][ids] + p[\"pos\"][:T]\n    i = 0\n    while f\"b{i}.Wq\" in p:\n        a = _ln(x, p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"])\n        Q, K, Vv = a @ p[f\"b{i}.Wq\"], a @ p[f\"b{i}.Wk\"], a @ p[f\"b{i}.Wv\"]\n        o = np.zeros_like(x)\n        for c in range(4):\n            s = slice(c * dh, (c + 1) * dh)\n            S = Q[..., s] @ K[..., s].transpose(0, 2, 1) / np.sqrt(dh)\n            for t in range(T):\n                e = np.exp(S[:, t, :t + 1] - S[:, t, :t + 1].max(-1, keepdims=True))\n                o[:, t, s] = np.einsum(\"bj,bjk->bk\", e / e.sum(-1, keepdims=True), Vv[:, :t + 1, s])\n        x = x + o @ p[f\"b{i}.Wo\"]\n        m = _ln(x, p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"])\n        x = x + np.maximum(m @ p[f\"b{i}.W1\"] + p[f\"b{i}.c1\"], 0.0) @ p[f\"b{i}.W2\"] + p[f\"b{i}.c2\"]\n        i += 1\n    return _ln(x, p[\"lnf_g\"], p[\"lnf_b\"]) @ p[\"Ws\"]\n\n\ndef _perda_ref(p, ids, alvos):\n    L = _ref(p, ids)\n    Z = L - L.max(-1, keepdims=True)\n    lp = Z - np.log(np.exp(Z).sum(-1, keepdims=True))\n    B, T = ids.shape\n    return float(-lp[np.arange(B)[:, None], np.arange(T), alvos].mean())\n_p = _criar(11, 6, 8, 1, 1)\n_X, _Y = _lote(11, 3, 6, 2)\n", "expr": "abs(perda_e_gradientes(_p, _X, _Y)[0] - _perda_ref(_p, _X, _Y)) < 1e-10", "expected": true, "name": "A perda é a entropia cruzada média sobre todas as posições"},
  {"id": "perda-inicial", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n_c = {\"V\": 69, \"T\": 16, \"d\": 32, \"blocos\": 1}\n_ids = np.random.default_rng(0).integers(0, 69, (8, 17))\n", "expr": "abs(perda_e_gradientes(montar(_c, 0), _ids[:, :-1], _ids[:, 1:])[0] - float(np.log(69))) < 0.05", "expected": true, "name": "Com os pesos de montar, a perda inicial fica perto de ln 69", "hint": "Ws começa pequeno: os logits iniciais são quase iguais."},
  {"id": "grads-formas", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n_p = _criar(7, 5, 8, 2, 3)\n_X, _Y = _lote(7, 2, 5, 4)\n", "expr": "(lambda g: [sorted(g) == sorted(_p), all(g[k].shape == _p[k].shape for k in _p)])(perda_e_gradientes(_p, _X, _Y)[1])", "expected": [true, true], "name": "Um gradiente por parâmetro, com a mesma forma"},
  {"id": "checagem-numerica", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n\n\ndef _ln(x, g, b):\n    return g * (x - x.mean(-1, keepdims=True)) / np.sqrt(x.var(-1, keepdims=True) + 1e-5) + b\n\n\ndef _ref(p, ids):\n    B, T = ids.shape\n    d = p[\"tok\"].shape[1]\n    dh = d // 4\n    x = p[\"tok\"][ids] + p[\"pos\"][:T]\n    i = 0\n    while f\"b{i}.Wq\" in p:\n        a = _ln(x, p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"])\n        Q, K, Vv = a @ p[f\"b{i}.Wq\"], a @ p[f\"b{i}.Wk\"], a @ p[f\"b{i}.Wv\"]\n        o = np.zeros_like(x)\n        for c in range(4):\n            s = slice(c * dh, (c + 1) * dh)\n            S = Q[..., s] @ K[..., s].transpose(0, 2, 1) / np.sqrt(dh)\n            for t in range(T):\n                e = np.exp(S[:, t, :t + 1] - S[:, t, :t + 1].max(-1, keepdims=True))\n                o[:, t, s] = np.einsum(\"bj,bjk->bk\", e / e.sum(-1, keepdims=True), Vv[:, :t + 1, s])\n        x = x + o @ p[f\"b{i}.Wo\"]\n        m = _ln(x, p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"])\n        x = x + np.maximum(m @ p[f\"b{i}.W1\"] + p[f\"b{i}.c1\"], 0.0) @ p[f\"b{i}.W2\"] + p[f\"b{i}.c2\"]\n        i += 1\n    return _ln(x, p[\"lnf_g\"], p[\"lnf_b\"]) @ p[\"Ws\"]\n\n\ndef _perda_ref(p, ids, alvos):\n    L = _ref(p, ids)\n    Z = L - L.max(-1, keepdims=True)\n    lp = Z - np.log(np.exp(Z).sum(-1, keepdims=True))\n    B, T = ids.shape\n    return float(-lp[np.arange(B)[:, None], np.arange(T), alvos].mean())\n\n\n\ndef _checar(p, ids, alvos, grads, por_array=4, h=1e-5):\n    rng = np.random.default_rng(0)\n    ok = []\n    for chave in p:\n        plano, a, n = p[chave].reshape(-1), [], []\n        for j in rng.choice(plano.size, min(por_array, plano.size), replace=False):\n            v = plano[j]\n            plano[j] = v + h\n            mais = _perda_ref(p, ids, alvos)\n            plano[j] = v - h\n            menos = _perda_ref(p, ids, alvos)\n            plano[j] = v\n            n.append((mais - menos) / (2 * h))\n            a.append(grads[chave].reshape(-1)[j])\n        a, n = np.array(a), np.array(n)\n        ok.append(bool(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8) < 1e-6))\n    return ok\n_p = _criar(11, 6, 8, 1, 1)\n_X, _Y = _lote(11, 3, 6, 2)\n", "expr": "_checar(_p, _X, _Y, perda_e_gradientes(_p, _X, _Y)[1])", "expected": [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], "name": "Diferença central em 4 números de cada array (1 bloco): erro relativo abaixo de 1e-6", "hint": "A lista segue a ordem das chaves: tok, pos, ln1_g, ln1_b, Wq, Wk, Wv, Wo, ln2_g, ln2_b, W1, c1, W2, c2, lnf_g, lnf_b, Ws."},
  {"id": "checagem-dois-blocos", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n\n\ndef _ln(x, g, b):\n    return g * (x - x.mean(-1, keepdims=True)) / np.sqrt(x.var(-1, keepdims=True) + 1e-5) + b\n\n\ndef _ref(p, ids):\n    B, T = ids.shape\n    d = p[\"tok\"].shape[1]\n    dh = d // 4\n    x = p[\"tok\"][ids] + p[\"pos\"][:T]\n    i = 0\n    while f\"b{i}.Wq\" in p:\n        a = _ln(x, p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"])\n        Q, K, Vv = a @ p[f\"b{i}.Wq\"], a @ p[f\"b{i}.Wk\"], a @ p[f\"b{i}.Wv\"]\n        o = np.zeros_like(x)\n        for c in range(4):\n            s = slice(c * dh, (c + 1) * dh)\n            S = Q[..., s] @ K[..., s].transpose(0, 2, 1) / np.sqrt(dh)\n            for t in range(T):\n                e = np.exp(S[:, t, :t + 1] - S[:, t, :t + 1].max(-1, keepdims=True))\n                o[:, t, s] = np.einsum(\"bj,bjk->bk\", e / e.sum(-1, keepdims=True), Vv[:, :t + 1, s])\n        x = x + o @ p[f\"b{i}.Wo\"]\n        m = _ln(x, p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"])\n        x = x + np.maximum(m @ p[f\"b{i}.W1\"] + p[f\"b{i}.c1\"], 0.0) @ p[f\"b{i}.W2\"] + p[f\"b{i}.c2\"]\n        i += 1\n    return _ln(x, p[\"lnf_g\"], p[\"lnf_b\"]) @ p[\"Ws\"]\n\n\ndef _perda_ref(p, ids, alvos):\n    L = _ref(p, ids)\n    Z = L - L.max(-1, keepdims=True)\n    lp = Z - np.log(np.exp(Z).sum(-1, keepdims=True))\n    B, T = ids.shape\n    return float(-lp[np.arange(B)[:, None], np.arange(T), alvos].mean())\n\n\n\ndef _checar(p, ids, alvos, grads, por_array=4, h=1e-5):\n    rng = np.random.default_rng(0)\n    ok = []\n    for chave in p:\n        plano, a, n = p[chave].reshape(-1), [], []\n        for j in rng.choice(plano.size, min(por_array, plano.size), replace=False):\n            v = plano[j]\n            plano[j] = v + h\n            mais = _perda_ref(p, ids, alvos)\n            plano[j] = v - h\n            menos = _perda_ref(p, ids, alvos)\n            plano[j] = v\n            n.append((mais - menos) / (2 * h))\n            a.append(grads[chave].reshape(-1)[j])\n        a, n = np.array(a), np.array(n)\n        ok.append(bool(np.linalg.norm(a - n) / max(np.linalg.norm(a) + np.linalg.norm(n), 1e-8) < 1e-6))\n    return ok\n_p = _criar(7, 5, 8, 2, 3)\n_X, _Y = _lote(7, 2, 5, 4)\n", "expr": "_checar(_p, _X, _Y, perda_e_gradientes(_p, _X, _Y)[1])", "expected": [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], "name": "Diferença central com 2 blocos"},
  {"id": "grad-posicoes-livres", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n_p = _criar(11, 6, 8, 1, 1)\n_X, _Y = _lote(11, 3, 6, 2)\n", "expr": "(lambda g: [bool((g[\"pos\"][3:] == 0).all()), bool((g[\"pos\"][:3] != 0).any())])(perda_e_gradientes(_p, _X[:, :3], _Y[:, :3])[1])", "expected": [true, true], "name": "Com T' = 3, as posições 3 em diante têm gradiente zero"},
  {"id": "params-intactos", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n_p = _criar(11, 6, 8, 1, 1)\n_X, _Y = _lote(11, 3, 6, 2)\n_c0 = {k: v.copy() for k, v in _p.items()}\n_l = forward(_p, _X)\n_r = perda_e_gradientes(_p, _X, _Y)\n", "expr": "all(bool(np.array_equal(_p[k], _c0[k])) for k in _c0)", "expected": true, "name": "forward e perda_e_gradientes não alteram os parâmetros"},
  {"id": "perda-cai", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n\n\ndef _criar(V, T, d, blocos, semente):\n    rng = np.random.default_rng(semente)\n    p = {\"tok\": rng.normal(0, 0.1, (V, d)), \"pos\": rng.normal(0, 0.1, (T, d))}\n    for i in range(blocos):\n        p[f\"b{i}.ln1_g\"], p[f\"b{i}.ln1_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        for nome in (\"Wq\", \"Wk\", \"Wv\", \"Wo\"):\n            p[f\"b{i}.{nome}\"] = rng.normal(0, d ** -0.5, (d, d))\n        p[f\"b{i}.ln2_g\"], p[f\"b{i}.ln2_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n        p[f\"b{i}.W1\"], p[f\"b{i}.c1\"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), rng.normal(0, 0.1, 4 * d)\n        p[f\"b{i}.W2\"], p[f\"b{i}.c2\"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), rng.normal(0, 0.1, d)\n    p[\"lnf_g\"], p[\"lnf_b\"] = 1 + rng.normal(0, 0.1, d), rng.normal(0, 0.1, d)\n    p[\"Ws\"] = rng.normal(0, d ** -0.5, (d, V))\n    return p\n\n\ndef _lote(V, B, T, semente):\n    ids = np.random.default_rng(semente).integers(0, V, (B, T + 1))\n    return ids[:, :-1], ids[:, 1:]\n_p = _criar(11, 6, 8, 1, 1)\n_X, _Y = _lote(11, 3, 6, 2)\n_antes = perda_e_gradientes(_p, _X, _Y)[0]\nfor _ in range(40):\n    _g = perda_e_gradientes(_p, _X, _Y)[1]\n    for _k in _p:\n        _p[_k] -= 0.2 * _g[_k]\n", "expr": "bool(perda_e_gradientes(_p, _X, _Y)[0] < _antes / 2)", "expected": true, "name": "40 passos de descida com os seus gradientes cortam a perda pela metade"}
]
```

### Soluções erradas

```python name="máscara causal ausente"
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh)
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)


if __name__ == "__main__":
    config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
    params = montar(config, 0)
    ids = np.random.default_rng(0).integers(0, 69, (4, 17))
    perda, grads = perda_e_gradientes(params, ids[:, :-1], ids[:, 1:])
    print(contar_parametros(config), forward(params, ids[:, :-1]).shape, round(perda, 3))
```

```python name="LayerNorm no eixo do tempo"
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)


if __name__ == "__main__":
    config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
    params = montar(config, 0)
    ids = np.random.default_rng(0).integers(0, 69, (4, 17))
    perda, grads = perda_e_gradientes(params, ids[:, :-1], ids[:, 1:])
    print(contar_parametros(config), forward(params, ids[:, :-1]).shape, round(perda, 3))
```

```python name="gradiente sem dividir por B·T"
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits, cache)


if __name__ == "__main__":
    config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
    params = montar(config, 0)
    ids = np.random.default_rng(0).integers(0, 69, (4, 17))
    perda, grads = perda_e_gradientes(params, ids[:, :-1], ids[:, 1:])
    print(contar_parametros(config), forward(params, ids[:, :-1]).shape, round(perda, 3))
```

```python name="contagem sem as posições"
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)


if __name__ == "__main__":
    config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
    params = montar(config, 0)
    ids = np.random.default_rng(0).integers(0, 69, (4, 17))
    perda, grads = perda_e_gradientes(params, ids[:, :-1], ids[:, 1:])
    print(contar_parametros(config), forward(params, ids[:, :-1]).shape, round(perda, 3))
```

```python name="gradiente do embedding com indexação direta"
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    g["tok"][ids] += dx
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)


if __name__ == "__main__":
    config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
    params = montar(config, 0)
    ids = np.random.default_rng(0).integers(0, 69, (4, 17))
    perda, grads = perda_e_gradientes(params, ids[:, :-1], ids[:, 1:])
    print(contar_parametros(config), forward(params, ids[:, :-1]).shape, round(perda, 3))
```

```python name="ReLU não desfeita no backward"
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = dx @ P["W2"].T
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)


if __name__ == "__main__":
    config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
    params = montar(config, 0)
    ids = np.random.default_rng(0).integers(0, 69, (4, 17))
    perda, grads = perda_e_gradientes(params, ids[:, :-1], ids[:, 1:])
    print(contar_parametros(config), forward(params, ids[:, :-1]).shape, round(perda, 3))
```

```python name="ganhos da LayerNorm sorteados"
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = rng.normal(0, 0.1, d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)


if __name__ == "__main__":
    config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
    params = montar(config, 0)
    ids = np.random.default_rng(0).integers(0, 69, (4, 17))
    perda, grads = perda_e_gradientes(params, ids[:, :-1], ids[:, 1:])
    print(contar_parametros(config), forward(params, ids[:, :-1]).shape, round(perda, 3))
```

```python name="Ws com o desvio das outras matrizes"
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)


if __name__ == "__main__":
    config = {"V": 69, "T": 16, "d": 32, "blocos": 1}
    params = montar(config, 0)
    ids = np.random.default_rng(0).integers(0, 69, (4, 17))
    perda, grads = perda_e_gradientes(params, ids[:, :-1], ids[:, 1:])
    print(contar_parametros(config), forward(params, ids[:, :-1]).shape, round(perda, 3))
```

## Passo 5 · Exercício · Treino

Escreva o laço de treino. O `modelo.py` deste passo é a referência do passo 4, e `perda_e_grads` chega por argumento: os casos passam a função do `modelo.py` ou uma versão falsa. Para caber no orçamento, os casos treinam com os ids de **caracteres** de `corpus.carregar(200, 0)`; o laço é o mesmo para os ids do BPE.

- `gerar_lote(ids, T, B, rng)` sorteia os começos com uma única chamada `rng.integers(0, len(ids) - T, B)` e devolve `(X, Y)` de forma `(B, T)`: `X` são as janelas de `T` tokens e `Y` são as mesmas janelas **deslocadas de um token**.
- `cortar_gradientes(grads, norma_max)` devolve um dicionário novo. Se a norma global (a raiz da soma dos quadrados de **todos** os arrays) passar de `norma_max`, todos os gradientes são multiplicados por `norma_max / norma`; senão, saem com os mesmos valores. O dicionário recebido não é alterado.
- `Adam(taxa, beta1=0.9, beta2=0.999, eps=1e-8)` tem o método `passo(params, grads)`, que recebe dois dicionários com as mesmas chaves e atualiza os arrays de `params` **no lugar**, com as médias $m$ e $v$ corrigidas pelo viés: $\theta \leftarrow \theta - \text{taxa} \cdot \hat m / (\sqrt{\hat v} + \text{eps})$. Cada instância tem o seu estado.
- `treinar(params, ids, config, passos, semente, perda_e_grads)` cria `rng = np.random.default_rng(semente)` e um `Adam(config["taxa"])` uma vez. Em cada passo: `gerar_lote(ids, config["T"], config["lote"], rng)`, `perda_e_grads(params, X, Y)`, corte com `config["norma_max"]` e um passo do Adam. Devolve o histórico: a lista com a perda de cada passo, como `float`.
- `salvar(params, caminho)` grava o dicionário num arquivo `.npz` e `carregar(caminho)` devolve um dicionário com as mesmas chaves e os mesmos arrays.

### Instruções

1. `gerar_lote`: um sorteio de `B` começos; `Y` é `X` um token adiante.
2. `cortar_gradientes`: norma global de todos os arrays, e a mesma escala para todos quando ela passa do limite.
3. `Adam`: `t`, `m` e `v` por instância, correção de viés e atualização no lugar.
4. `treinar`: um gerador e um otimizador para o treino inteiro; lote, perda e gradientes, corte, passo do Adam; histórico de perdas.
5. `salvar` e `carregar`: ida e volta por um arquivo `.npz`.

### Código inicial

```python
import numpy as np


class Adam:
    def __init__(self, taxa, beta1=0.9, beta2=0.999, eps=1e-8):
        pass

    def passo(self, params, grads):
        # atualiza os arrays de params no lugar
        pass


def gerar_lote(ids, T, B, rng):
    # devolve (X, Y), os dois de forma (B, T)
    pass


def cortar_gradientes(grads, norma_max):
    # devolve um dicionário novo
    pass


def treinar(params, ids, config, passos, semente, perda_e_grads):
    # devolve a lista com a perda de cada passo
    pass


def salvar(params, caminho):
    pass


def carregar(caminho):
    pass


if __name__ == "__main__":
    import corpus
    from modelo import montar, perda_e_gradientes

    vocab, ids_treino, ids_val = corpus.carregar(200, 0)
    config = {"V": len(vocab), "T": 16, "d": 32, "blocos": 1, "lote": 16, "taxa": 0.01, "norma_max": 1.0}
    params = montar(config, 0)
    PASSOS = 5  # no "Executar", experimente 600; volte a 5 antes de verificar
    print(treinar(params, ids_treino, config, PASSOS, 0, perda_e_gradientes))
```
```python path=modelo.py
"""Modelo de referência do projeto (a solução do passo 4)."""
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)
```
```python path=corpus.py
"""Corpus do curso: frases geradas por uma gramática pequena sobre uma vila fictícia."""
import numpy as np

SUJEITOS = ["a padeira", "o ferreiro", "a tecelã", "o pescador", "a moleira", "o pastor", "a oleira", "o barqueiro"]
VERBOS = ["leva", "guarda", "vende", "procura", "conserta", "divide"]
OBJETOS = ["o pão", "a rede", "o barco", "a lenha", "o queijo", "a farinha", "o cesto", "o azeite"]
LUGARES = ["na praça", "no moinho", "na ponte", "no porto", "na feira", "no celeiro"]
TEMPOS = ["de manhã", "à tarde", "à noite", "até o almoço", "antes da chuva", "depois da festa"]


def gerar_corpus(n_frases=1500, semente=0):
    """Devolve n_frases frases, uma por linha; metade delas termina com um tempo."""
    rng = np.random.default_rng(semente)
    frases = []
    for _ in range(n_frases):
        partes = [str(rng.choice(SUJEITOS)), str(rng.choice(VERBOS)), str(rng.choice(OBJETOS)), str(rng.choice(LUGARES))]
        if rng.random() < 0.5:
            partes.append(str(rng.choice(TEMPOS)))
        frases.append(" ".join(partes) + ".")
    return "\n".join(frases) + "\n"


def vocabulario(texto):
    """Caracteres distintos do texto, em ordem."""
    return sorted(set(texto))


def codificar(texto, vocab):
    """Texto -> array de ids (posição de cada caractere em vocab)."""
    para_id = {c: i for i, c in enumerate(vocab)}
    return np.array([para_id[c] for c in texto], dtype=np.intp)


def decodificar(ids, vocab):
    """Ids -> texto."""
    return "".join(vocab[int(i)] for i in ids)


def carregar(n_frases=1500, semente=0, fracao_treino=0.9):
    """Devolve (vocab, ids_treino, ids_val): os últimos 10 % do texto ficam para validação."""
    texto = gerar_corpus(n_frases, semente)
    vocab = vocabulario(texto)
    ids = codificar(texto, vocab)
    corte = int(len(ids) * fracao_treino)
    return vocab, ids[:corte], ids[corte:]
```

### Solução

```python
import numpy as np


class Adam:
    def __init__(self, taxa, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa, self.beta1, self.beta2, self.eps = taxa, beta1, beta2, eps
        self.t = 0
        self.m = {}
        self.v = {}

    def passo(self, params, grads):
        self.t += 1
        for chave in params:
            g = grads[chave]
            self.m[chave] = self.beta1 * self.m.get(chave, 0.0) + (1 - self.beta1) * g
            self.v[chave] = self.beta2 * self.v.get(chave, 0.0) + (1 - self.beta2) * g * g
            m_c = self.m[chave] / (1 - self.beta1 ** self.t)
            v_c = self.v[chave] / (1 - self.beta2 ** self.t)
            params[chave] -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def cortar_gradientes(grads, norma_max):
    norma = float(np.sqrt(sum((g ** 2).sum() for g in grads.values())))
    if norma <= norma_max:
        return dict(grads)
    return {chave: g * (norma_max / norma) for chave, g in grads.items()}


def treinar(params, ids, config, passos, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(config["taxa"])
    historico = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, config["T"], config["lote"], rng)
        perda, grads = perda_e_grads(params, X, Y)
        otimizador.passo(params, cortar_gradientes(grads, config["norma_max"]))
        historico.append(float(perda))
    return historico


def salvar(params, caminho):
    np.savez(caminho, **params)


def carregar(caminho):
    with np.load(caminho) as dados:
        return {chave: dados[chave] for chave in dados.files}


if __name__ == "__main__":
    import corpus
    from modelo import montar, perda_e_gradientes

    vocab, ids_treino, ids_val = corpus.carregar(200, 0)
    config = {"V": len(vocab), "T": 16, "d": 32, "blocos": 1, "lote": 16, "taxa": 0.01, "norma_max": 1.0}
    params = montar(config, 0)
    PASSOS = 5  # no "Executar", experimente 600; volte a 5 antes de verificar
    historico = treinar(params, ids_treino, config, PASSOS, 0, perda_e_gradientes)
    print(round(historico[0], 3), round(historico[-1], 3))
```
```python path=modelo.py
"""Modelo de referência do projeto (a solução do passo 4)."""
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)
```
```python path=corpus.py
"""Corpus do curso: frases geradas por uma gramática pequena sobre uma vila fictícia."""
import numpy as np

SUJEITOS = ["a padeira", "o ferreiro", "a tecelã", "o pescador", "a moleira", "o pastor", "a oleira", "o barqueiro"]
VERBOS = ["leva", "guarda", "vende", "procura", "conserta", "divide"]
OBJETOS = ["o pão", "a rede", "o barco", "a lenha", "o queijo", "a farinha", "o cesto", "o azeite"]
LUGARES = ["na praça", "no moinho", "na ponte", "no porto", "na feira", "no celeiro"]
TEMPOS = ["de manhã", "à tarde", "à noite", "até o almoço", "antes da chuva", "depois da festa"]


def gerar_corpus(n_frases=1500, semente=0):
    """Devolve n_frases frases, uma por linha; metade delas termina com um tempo."""
    rng = np.random.default_rng(semente)
    frases = []
    for _ in range(n_frases):
        partes = [str(rng.choice(SUJEITOS)), str(rng.choice(VERBOS)), str(rng.choice(OBJETOS)), str(rng.choice(LUGARES))]
        if rng.random() < 0.5:
            partes.append(str(rng.choice(TEMPOS)))
        frases.append(" ".join(partes) + ".")
    return "\n".join(frases) + "\n"


def vocabulario(texto):
    """Caracteres distintos do texto, em ordem."""
    return sorted(set(texto))


def codificar(texto, vocab):
    """Texto -> array de ids (posição de cada caractere em vocab)."""
    para_id = {c: i for i, c in enumerate(vocab)}
    return np.array([para_id[c] for c in texto], dtype=np.intp)


def decodificar(ids, vocab):
    """Ids -> texto."""
    return "".join(vocab[int(i)] for i in ids)


def carregar(n_frases=1500, semente=0, fracao_treino=0.9):
    """Devolve (vocab, ids_treino, ids_val): os últimos 10 % do texto ficam para validação."""
    texto = gerar_corpus(n_frases, semente)
    vocab = vocabulario(texto)
    ids = codificar(texto, vocab)
    corte = int(len(ids) * fracao_treino)
    return vocab, ids[:corte], ids[corte:]
```

### Dicas

1. O alvo da posição `t` é o token da posição `t + 1`: `ids[i + 1:i + T + 1]`.
2. No Adam, $\hat m = m / (1 - \beta_1^t)$ e $\hat v = v / (1 - \beta_2^t)$, com $t$ contando os passos a partir de 1.
3. `np.savez(caminho, **params)` grava um array por chave; ao ler com `np.load`, copie os arrays para um dicionário comum.

### Verificação

```json
[
  {"id": "lote-formas", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n", "expr": "[list(a.shape) for a in gerar_lote(np.arange(100), 8, 5, np.random.default_rng(0))]", "expected": [[5, 8], [5, 8]], "name": "X e Y têm forma (B, T)"},
  {"id": "lote-deslocado", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n", "expr": "(lambda X, Y: bool((Y == X + 1).all()))(*gerar_lote(np.arange(100), 8, 5, np.random.default_rng(1)))", "expected": true, "name": "Com ids = 0, 1, 2, …, cada alvo é a entrada mais 1", "hint": "Y começa um token depois de X."},
  {"id": "lote-literal", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n", "expr": "gerar_lote(np.arange(50), 4, 3, np.random.default_rng(0))[0].tolist()", "expected": [[39, 40, 41, 42], [29, 30, 31, 32], [23, 24, 25, 26]], "name": "Os começos saem de rng.integers(0, len(ids) - T, B)"},
  {"id": "lote-limite", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n", "expr": "[a.tolist() for a in gerar_lote(np.arange(6), 5, 8, np.random.default_rng(0))]", "expected": [[[0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4]], [[1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5], [1, 2, 3, 4, 5]]], "name": "Com 6 tokens e T = 5, o único começo possível é 0", "hint": "O último começo válido é len(ids) - T - 1, para o alvo caber."},
  {"id": "lote-um-sorteio", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_r1, _r2 = np.random.default_rng(5), np.random.default_rng(5)\n_l = gerar_lote(np.arange(100), 8, 5, _r1)\n_c = _r2.integers(0, 92, 5)\n", "expr": "int(_r1.integers(0, 1000)) == int(_r2.integers(0, 1000))", "expected": true, "name": "O gerador é consumido por uma chamada só"},
  {"id": "corte-global", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_g = {\"a\": np.array([3.0, 0.0]), \"b\": np.array([[0.0, 4.0]])}\n", "expr": "[cortar_gradientes(_g, 1.0)[k].tolist() for k in (\"a\", \"b\")]", "expected": [[0.6, 0.0], [[0.0, 0.8]]], "tolerance": 1e-12, "name": "Norma global 5 e limite 1: tudo é multiplicado por 0,2", "hint": "A norma junta os dois arrays: sqrt(3² + 4²) = 5."},
  {"id": "corte-metade", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_g = {\"a\": np.array([3.0, 0.0]), \"b\": np.array([[0.0, 4.0]])}\n", "expr": "[cortar_gradientes(_g, 2.5)[k].tolist() for k in (\"a\", \"b\")]", "expected": [[1.5, 0.0], [[0.0, 2.0]]], "tolerance": 1e-12, "name": "Limite 2,5: tudo é multiplicado por 0,5"},
  {"id": "corte-abaixo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_g = {\"a\": np.array([3.0, 0.0]), \"b\": np.array([[0.0, 4.0]])}\n", "expr": "[cortar_gradientes(_g, 10.0)[k].tolist() for k in (\"a\", \"b\")]", "expected": [[3.0, 0.0], [[0.0, 4.0]]], "tolerance": 1e-12, "name": "Norma abaixo do limite: os valores não mudam"},
  {"id": "corte-entrada-intacta", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_g = {\"a\": np.array([3.0, 0.0]), \"b\": np.array([[0.0, 4.0]])}\n_r = cortar_gradientes(_g, 1.0)\n", "expr": "[_g[\"a\"].tolist(), _g[\"b\"].tolist(), _r is _g, sorted(_r)]", "expected": [[3.0, 0.0], [[0.0, 4.0]], false, ["a", "b"]], "name": "O dicionário recebido fica intacto e o devolvido é outro"},
  {"id": "adam-um-passo", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_p = {\"w\": np.array([1.0, -2.0]), \"b\": np.array([0.5])}\n_g = {\"w\": np.array([0.3, -0.1]), \"b\": np.array([4.0])}\n_o = Adam(0.1)\n_o.passo(_p, _g)\n", "expr": "[_p[\"w\"].tolist(), _p[\"b\"].tolist()]", "expected": [[0.9000000033333332, -1.900000009999999], [0.40000000025]], "tolerance": 1e-10, "name": "No primeiro passo, cada número anda quase exatamente a taxa", "hint": "Com a correção de viés, m̂ = g e v̂ = g² no primeiro passo."},
  {"id": "adam-tres-passos", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_p = {\"w\": np.array([1.0, -2.0]), \"b\": np.array([0.5])}\n_g = {\"w\": np.array([0.3, -0.1]), \"b\": np.array([4.0])}\n_o = Adam(0.1)\nfor _f in (1.0, -0.5, 2.0):\n    _o.passo(_p, {k: _f * v for k, v in _g.items()})\n", "expr": "[_p[\"w\"].tolist(), _p[\"b\"].tolist()]", "expected": [[0.8075551421228052, -1.8075551543513813], [0.3075551364670882]], "tolerance": 1e-10, "name": "Três passos com gradientes diferentes"},
  {"id": "adam-instancias", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_p = {\"w\": np.array([1.0, -2.0]), \"b\": np.array([0.5])}\n_g = {\"w\": np.array([0.3, -0.1]), \"b\": np.array([4.0])}\n_o1, _o2 = Adam(0.1), Adam(0.1)\n_q = {k: v.copy() for k, v in _p.items()}\n_o1.passo(_p, _g)\n_o1.passo(_p, _g)\n_o2.passo(_q, {k: -v for k, v in _g.items()})\n", "expr": "[_q[\"w\"].tolist(), _q[\"b\"].tolist()]", "expected": [[1.0999999966666667, -2.099999990000001], [0.5999999997500001]], "tolerance": 1e-10, "name": "Dois otimizadores não dividem estado", "hint": "m, v e t são criados no __init__, um conjunto por instância."},
  {"id": "adam-no-lugar", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_p = {\"w\": np.array([1.0, -2.0]), \"b\": np.array([0.5])}\n_g = {\"w\": np.array([0.3, -0.1]), \"b\": np.array([4.0])}\n_w = _p[\"w\"]\nAdam(0.1).passo(_p, _g)\n", "expr": "[_w is _p[\"w\"], bool((_w != np.array([1.0, -2.0])).all())]", "expected": [true, true], "name": "Os arrays de params são atualizados no lugar"},
  {"id": "adam-gradiente-zero", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_p = {\"w\": np.array([1.0, -2.0]), \"b\": np.array([0.5])}\n_g = {\"w\": np.array([0.3, -0.1]), \"b\": np.array([4.0])}\n_o = Adam(0.1)\n_o.passo(_p, {\"w\": np.zeros(2), \"b\": np.zeros(1)})\n", "expr": "[_p[\"w\"].tolist(), _p[\"b\"].tolist()]", "expected": [[1.0, -2.0], [0.5]], "name": "Gradiente zero não move o parâmetro nem gera nan"},
  {"id": "treinar-injetado", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n_cfg = {\"V\": 12, \"T\": 4, \"d\": 8, \"blocos\": 1, \"lote\": 3, \"taxa\": 0.1, \"norma_max\": 1.0}\n_ids = np.arange(40) % 12\n_p = {\"w\": np.array([1.0, -2.0, 0.5]), \"u\": np.array([[0.25]])}\n_vistos = []\ndef _falso(params, X, Y):\n    _vistos.append((X.copy(), Y.copy()))\n    escala = 100.0 if len(_vistos) == 1 else 0.5\n    return 2.5, {\"w\": escala * np.array([0.6, 0.0, -0.8]) * 0.6, \"u\": escala * np.array([[0.8]])}\n_h = treinar(_p, _ids, _cfg, 6, 0, _falso)\n", "expr": "[_h, len(_vistos), list(_vistos[0][0].shape), bool((_vistos[0][1] == (_vistos[0][0] + 1) % 12).all())]", "expected": [[2.5, 2.5, 2.5, 2.5, 2.5, 2.5], 6, [3, 4], true], "name": "treinar chama a função recebida uma vez por passo, com lotes de config", "hint": "Use o argumento perda_e_grads, não uma função importada."},
  {"id": "treinar-lotes", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n_cfg = {\"V\": 12, \"T\": 4, \"d\": 8, \"blocos\": 1, \"lote\": 3, \"taxa\": 0.1, \"norma_max\": 1.0}\n_ids = np.arange(40) % 12\n_p = {\"w\": np.array([1.0, -2.0, 0.5]), \"u\": np.array([[0.25]])}\n_vistos = []\ndef _falso(params, X, Y):\n    _vistos.append((X.copy(), Y.copy()))\n    escala = 100.0 if len(_vistos) == 1 else 0.5\n    return 2.5, {\"w\": escala * np.array([0.6, 0.0, -0.8]) * 0.6, \"u\": escala * np.array([[0.8]])}\n_h = treinar(_p, _ids, _cfg, 3, 7, _falso)\n", "expr": "[v[0].tolist() for v in _vistos]", "expected": [[[10, 11, 0, 1], [10, 11, 0, 1], [0, 1, 2, 3]], [[8, 9, 10, 11], [8, 9, 10, 11], [3, 4, 5, 6]], [[6, 7, 8, 9], [8, 9, 10, 11], [1, 2, 3, 4]]], "name": "Os lotes dos 3 primeiros passos com a semente 7", "hint": "Um gerador só, criado antes do laço: cada passo sorteia um lote novo."},
  {"id": "treinar-corte-e-adam", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n_cfg = {\"V\": 12, \"T\": 4, \"d\": 8, \"blocos\": 1, \"lote\": 3, \"taxa\": 0.1, \"norma_max\": 1.0}\n_ids = np.arange(40) % 12\n_p = {\"w\": np.array([1.0, -2.0, 0.5]), \"u\": np.array([[0.25]])}\n_vistos = []\ndef _falso(params, X, Y):\n    _vistos.append((X.copy(), Y.copy()))\n    escala = 100.0 if len(_vistos) == 1 else 0.5\n    return 2.5, {\"w\": escala * np.array([0.6, 0.0, -0.8]) * 0.6, \"u\": escala * np.array([[0.8]])}\n_h = treinar(_p, _ids, _cfg, 2, 0, _falso)\n", "expr": "[_p[\"w\"].tolist(), _p[\"u\"].tolist()]", "expected": [[0.8067820421724744, -2.0, 0.6932179593409292], [[0.05678203884298638]]], "tolerance": 1e-10, "name": "Dois passos com gradientes de norma 100 e 0,5: corte global e depois Adam", "hint": "O gradiente do primeiro passo é cortado para norma 1 antes de entrar nas médias do Adam."},
  {"id": "treinar-tres-passos", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nimport corpus\nimport modelo\n_vocab, _tr, _va = corpus.carregar(200, 0)\n_cfg = {\"V\": len(_vocab), \"T\": 16, \"d\": 32, \"blocos\": 1, \"lote\": 16, \"taxa\": 0.01, \"norma_max\": 1.0}\n_p = modelo.montar(_cfg, 0)\n", "expr": "treinar(_p, _tr, _cfg, 3, 0, modelo.perda_e_gradientes)", "expected": [3.370507663783645, 3.1594738775763034, 2.9908114502317606], "tolerance": 1e-08, "name": "As 3 primeiras perdas com o modelo de referência"},
  {"id": "treinar-perda-cai", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nimport corpus\nimport modelo\n_vocab, _tr, _va = corpus.carregar(200, 0)\n_cfg = {\"V\": len(_vocab), \"T\": 16, \"d\": 32, \"blocos\": 1, \"lote\": 16, \"taxa\": 0.01, \"norma_max\": 1.0}\n_p = modelo.montar(_cfg, 0)\n_h = treinar(_p, _tr, _cfg, 60, 0, modelo.perda_e_gradientes)\n", "expr": "[len(_h), bool(_h[0] > 3.0), bool(sum(_h[-10:]) / 10 < 2.3)]", "expected": [60, true, true], "name": "60 passos: a perda sai de perto de ln 29 e a média dos 10 últimos fica abaixo de 2,3", "hint": "A solução chega a 1,81. Confira a correção de viés do Adam e se os parâmetros são atualizados no lugar."},
  {"id": "treinar-semente", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nimport corpus\nimport modelo\n_vocab, _tr, _va = corpus.carregar(200, 0)\n_cfg = {\"V\": len(_vocab), \"T\": 16, \"d\": 32, \"blocos\": 1, \"lote\": 16, \"taxa\": 0.01, \"norma_max\": 1.0}\n_h = [treinar(modelo.montar(_cfg, 0), _tr, _cfg, 3, s, modelo.perda_e_gradientes) for s in (4, 4, 5)]\n", "expr": "[_h[0] == _h[1], _h[0] == _h[2]]", "expected": [true, false], "name": "A mesma semente repete o histórico; outra semente muda"},
  {"id": "ida-e-volta", "checkpoint": 5, "kind": "expr", "setup": "import numpy as np\nimport modelo\n_p = modelo.montar({\"V\": 11, \"T\": 6, \"d\": 8, \"blocos\": 1}, 0)\nsalvar(_p, \"pesos.npz\")\n_q = carregar(\"pesos.npz\")\n", "expr": "[type(_q).__name__, sorted(_q) == sorted(_p), all(bool(np.array_equal(_q[k], _p[k])) for k in _p)]", "expected": ["dict", true, true], "name": "salvar e carregar devolvem as mesmas chaves e os mesmos arrays"},
  {"id": "carregar-treinavel", "checkpoint": 5, "kind": "expr", "setup": "import numpy as np\n_p = {\"w\": np.array([1.0, -2.0]), \"b\": np.array([0.5])}\nsalvar(_p, \"pesos.npz\")\n_q = carregar(\"pesos.npz\")\nAdam(0.1).passo(_q, {\"w\": np.array([0.3, -0.1]), \"b\": np.array([4.0])})\n", "expr": "[bool(np.allclose(_q[\"w\"], [0.9, -1.9], atol=1e-6)), _p[\"w\"].tolist()]", "expected": [true, [1.0, -2.0]], "name": "Os pesos carregados podem continuar o treino, sem mexer nos originais"}
]
```

### Soluções erradas

```python name="alvo não deslocado"
import numpy as np


class Adam:
    def __init__(self, taxa, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa, self.beta1, self.beta2, self.eps = taxa, beta1, beta2, eps
        self.t = 0
        self.m = {}
        self.v = {}

    def passo(self, params, grads):
        self.t += 1
        for chave in params:
            g = grads[chave]
            self.m[chave] = self.beta1 * self.m.get(chave, 0.0) + (1 - self.beta1) * g
            self.v[chave] = self.beta2 * self.v.get(chave, 0.0) + (1 - self.beta2) * g * g
            m_c = self.m[chave] / (1 - self.beta1 ** self.t)
            v_c = self.v[chave] / (1 - self.beta2 ** self.t)
            params[chave] -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i:i + T] for i in inicios])
    return X, Y


def cortar_gradientes(grads, norma_max):
    norma = float(np.sqrt(sum((g ** 2).sum() for g in grads.values())))
    if norma <= norma_max:
        return dict(grads)
    return {chave: g * (norma_max / norma) for chave, g in grads.items()}


def treinar(params, ids, config, passos, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(config["taxa"])
    historico = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, config["T"], config["lote"], rng)
        perda, grads = perda_e_grads(params, X, Y)
        otimizador.passo(params, cortar_gradientes(grads, config["norma_max"]))
        historico.append(float(perda))
    return historico


def salvar(params, caminho):
    np.savez(caminho, **params)


def carregar(caminho):
    with np.load(caminho) as dados:
        return {chave: dados[chave] for chave in dados.files}


if __name__ == "__main__":
    import corpus
    from modelo import montar, perda_e_gradientes

    vocab, ids_treino, ids_val = corpus.carregar(200, 0)
    config = {"V": len(vocab), "T": 16, "d": 32, "blocos": 1, "lote": 16, "taxa": 0.01, "norma_max": 1.0}
    params = montar(config, 0)
    PASSOS = 5  # no "Executar", experimente 600; volte a 5 antes de verificar
    historico = treinar(params, ids_treino, config, PASSOS, 0, perda_e_gradientes)
    print(round(historico[0], 3), round(historico[-1], 3))
```

```python name="começo sorteado pode passar do fim"
import numpy as np


class Adam:
    def __init__(self, taxa, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa, self.beta1, self.beta2, self.eps = taxa, beta1, beta2, eps
        self.t = 0
        self.m = {}
        self.v = {}

    def passo(self, params, grads):
        self.t += 1
        for chave in params:
            g = grads[chave]
            self.m[chave] = self.beta1 * self.m.get(chave, 0.0) + (1 - self.beta1) * g
            self.v[chave] = self.beta2 * self.v.get(chave, 0.0) + (1 - self.beta2) * g * g
            m_c = self.m[chave] / (1 - self.beta1 ** self.t)
            v_c = self.v[chave] / (1 - self.beta2 ** self.t)
            params[chave] -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T + 1, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def cortar_gradientes(grads, norma_max):
    norma = float(np.sqrt(sum((g ** 2).sum() for g in grads.values())))
    if norma <= norma_max:
        return dict(grads)
    return {chave: g * (norma_max / norma) for chave, g in grads.items()}


def treinar(params, ids, config, passos, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(config["taxa"])
    historico = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, config["T"], config["lote"], rng)
        perda, grads = perda_e_grads(params, X, Y)
        otimizador.passo(params, cortar_gradientes(grads, config["norma_max"]))
        historico.append(float(perda))
    return historico


def salvar(params, caminho):
    np.savez(caminho, **params)


def carregar(caminho):
    with np.load(caminho) as dados:
        return {chave: dados[chave] for chave in dados.files}


if __name__ == "__main__":
    import corpus
    from modelo import montar, perda_e_gradientes

    vocab, ids_treino, ids_val = corpus.carregar(200, 0)
    config = {"V": len(vocab), "T": 16, "d": 32, "blocos": 1, "lote": 16, "taxa": 0.01, "norma_max": 1.0}
    params = montar(config, 0)
    PASSOS = 5  # no "Executar", experimente 600; volte a 5 antes de verificar
    historico = treinar(params, ids_treino, config, PASSOS, 0, perda_e_gradientes)
    print(round(historico[0], 3), round(historico[-1], 3))
```

```python name="clipping por valor"
import numpy as np


class Adam:
    def __init__(self, taxa, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa, self.beta1, self.beta2, self.eps = taxa, beta1, beta2, eps
        self.t = 0
        self.m = {}
        self.v = {}

    def passo(self, params, grads):
        self.t += 1
        for chave in params:
            g = grads[chave]
            self.m[chave] = self.beta1 * self.m.get(chave, 0.0) + (1 - self.beta1) * g
            self.v[chave] = self.beta2 * self.v.get(chave, 0.0) + (1 - self.beta2) * g * g
            m_c = self.m[chave] / (1 - self.beta1 ** self.t)
            v_c = self.v[chave] / (1 - self.beta2 ** self.t)
            params[chave] -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def cortar_gradientes(grads, norma_max):
    return {chave: np.clip(g, -norma_max, norma_max) for chave, g in grads.items()}


def treinar(params, ids, config, passos, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(config["taxa"])
    historico = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, config["T"], config["lote"], rng)
        perda, grads = perda_e_grads(params, X, Y)
        otimizador.passo(params, cortar_gradientes(grads, config["norma_max"]))
        historico.append(float(perda))
    return historico


def salvar(params, caminho):
    np.savez(caminho, **params)


def carregar(caminho):
    with np.load(caminho) as dados:
        return {chave: dados[chave] for chave in dados.files}


if __name__ == "__main__":
    import corpus
    from modelo import montar, perda_e_gradientes

    vocab, ids_treino, ids_val = corpus.carregar(200, 0)
    config = {"V": len(vocab), "T": 16, "d": 32, "blocos": 1, "lote": 16, "taxa": 0.01, "norma_max": 1.0}
    params = montar(config, 0)
    PASSOS = 5  # no "Executar", experimente 600; volte a 5 antes de verificar
    historico = treinar(params, ids_treino, config, PASSOS, 0, perda_e_gradientes)
    print(round(historico[0], 3), round(historico[-1], 3))
```

```python name="Adam sem correção de viés"
import numpy as np


class Adam:
    def __init__(self, taxa, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa, self.beta1, self.beta2, self.eps = taxa, beta1, beta2, eps
        self.t = 0
        self.m = {}
        self.v = {}

    def passo(self, params, grads):
        self.t += 1
        for chave in params:
            g = grads[chave]
            self.m[chave] = self.beta1 * self.m.get(chave, 0.0) + (1 - self.beta1) * g
            self.v[chave] = self.beta2 * self.v.get(chave, 0.0) + (1 - self.beta2) * g * g
            m_c = self.m[chave]
            v_c = self.v[chave]
            params[chave] -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def cortar_gradientes(grads, norma_max):
    norma = float(np.sqrt(sum((g ** 2).sum() for g in grads.values())))
    if norma <= norma_max:
        return dict(grads)
    return {chave: g * (norma_max / norma) for chave, g in grads.items()}


def treinar(params, ids, config, passos, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(config["taxa"])
    historico = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, config["T"], config["lote"], rng)
        perda, grads = perda_e_grads(params, X, Y)
        otimizador.passo(params, cortar_gradientes(grads, config["norma_max"]))
        historico.append(float(perda))
    return historico


def salvar(params, caminho):
    np.savez(caminho, **params)


def carregar(caminho):
    with np.load(caminho) as dados:
        return {chave: dados[chave] for chave in dados.files}


if __name__ == "__main__":
    import corpus
    from modelo import montar, perda_e_gradientes

    vocab, ids_treino, ids_val = corpus.carregar(200, 0)
    config = {"V": len(vocab), "T": 16, "d": 32, "blocos": 1, "lote": 16, "taxa": 0.01, "norma_max": 1.0}
    params = montar(config, 0)
    PASSOS = 5  # no "Executar", experimente 600; volte a 5 antes de verificar
    historico = treinar(params, ids_treino, config, PASSOS, 0, perda_e_gradientes)
    print(round(historico[0], 3), round(historico[-1], 3))
```

```python name="estado do Adam na classe"
import numpy as np


class Adam:
    m = {}
    v = {}

    def __init__(self, taxa, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa, self.beta1, self.beta2, self.eps = taxa, beta1, beta2, eps
        self.t = 0

    def passo(self, params, grads):
        self.t += 1
        for chave in params:
            g = grads[chave]
            self.m[chave] = self.beta1 * self.m.get(chave, 0.0) + (1 - self.beta1) * g
            self.v[chave] = self.beta2 * self.v.get(chave, 0.0) + (1 - self.beta2) * g * g
            m_c = self.m[chave] / (1 - self.beta1 ** self.t)
            v_c = self.v[chave] / (1 - self.beta2 ** self.t)
            params[chave] -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def cortar_gradientes(grads, norma_max):
    norma = float(np.sqrt(sum((g ** 2).sum() for g in grads.values())))
    if norma <= norma_max:
        return dict(grads)
    return {chave: g * (norma_max / norma) for chave, g in grads.items()}


def treinar(params, ids, config, passos, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(config["taxa"])
    historico = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, config["T"], config["lote"], rng)
        perda, grads = perda_e_grads(params, X, Y)
        otimizador.passo(params, cortar_gradientes(grads, config["norma_max"]))
        historico.append(float(perda))
    return historico


def salvar(params, caminho):
    np.savez(caminho, **params)


def carregar(caminho):
    with np.load(caminho) as dados:
        return {chave: dados[chave] for chave in dados.files}


if __name__ == "__main__":
    import corpus
    from modelo import montar, perda_e_gradientes

    vocab, ids_treino, ids_val = corpus.carregar(200, 0)
    config = {"V": len(vocab), "T": 16, "d": 32, "blocos": 1, "lote": 16, "taxa": 0.01, "norma_max": 1.0}
    params = montar(config, 0)
    PASSOS = 5  # no "Executar", experimente 600; volte a 5 antes de verificar
    historico = treinar(params, ids_treino, config, PASSOS, 0, perda_e_gradientes)
    print(round(historico[0], 3), round(historico[-1], 3))
```

```python name="treino sem clipping"
import numpy as np


class Adam:
    def __init__(self, taxa, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa, self.beta1, self.beta2, self.eps = taxa, beta1, beta2, eps
        self.t = 0
        self.m = {}
        self.v = {}

    def passo(self, params, grads):
        self.t += 1
        for chave in params:
            g = grads[chave]
            self.m[chave] = self.beta1 * self.m.get(chave, 0.0) + (1 - self.beta1) * g
            self.v[chave] = self.beta2 * self.v.get(chave, 0.0) + (1 - self.beta2) * g * g
            m_c = self.m[chave] / (1 - self.beta1 ** self.t)
            v_c = self.v[chave] / (1 - self.beta2 ** self.t)
            params[chave] -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def cortar_gradientes(grads, norma_max):
    norma = float(np.sqrt(sum((g ** 2).sum() for g in grads.values())))
    if norma <= norma_max:
        return dict(grads)
    return {chave: g * (norma_max / norma) for chave, g in grads.items()}


def treinar(params, ids, config, passos, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(config["taxa"])
    historico = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, config["T"], config["lote"], rng)
        perda, grads = perda_e_grads(params, X, Y)
        otimizador.passo(params, grads)
        historico.append(float(perda))
    return historico


def salvar(params, caminho):
    np.savez(caminho, **params)


def carregar(caminho):
    with np.load(caminho) as dados:
        return {chave: dados[chave] for chave in dados.files}


if __name__ == "__main__":
    import corpus
    from modelo import montar, perda_e_gradientes

    vocab, ids_treino, ids_val = corpus.carregar(200, 0)
    config = {"V": len(vocab), "T": 16, "d": 32, "blocos": 1, "lote": 16, "taxa": 0.01, "norma_max": 1.0}
    params = montar(config, 0)
    PASSOS = 5  # no "Executar", experimente 600; volte a 5 antes de verificar
    historico = treinar(params, ids_treino, config, PASSOS, 0, perda_e_gradientes)
    print(round(historico[0], 3), round(historico[-1], 3))
```

```python name="gerador recriado a cada passo"
import numpy as np


class Adam:
    def __init__(self, taxa, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa, self.beta1, self.beta2, self.eps = taxa, beta1, beta2, eps
        self.t = 0
        self.m = {}
        self.v = {}

    def passo(self, params, grads):
        self.t += 1
        for chave in params:
            g = grads[chave]
            self.m[chave] = self.beta1 * self.m.get(chave, 0.0) + (1 - self.beta1) * g
            self.v[chave] = self.beta2 * self.v.get(chave, 0.0) + (1 - self.beta2) * g * g
            m_c = self.m[chave] / (1 - self.beta1 ** self.t)
            v_c = self.v[chave] / (1 - self.beta2 ** self.t)
            params[chave] -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def cortar_gradientes(grads, norma_max):
    norma = float(np.sqrt(sum((g ** 2).sum() for g in grads.values())))
    if norma <= norma_max:
        return dict(grads)
    return {chave: g * (norma_max / norma) for chave, g in grads.items()}


def treinar(params, ids, config, passos, semente, perda_e_grads):
    otimizador = Adam(config["taxa"])
    historico = []
    for _ in range(passos):
        rng = np.random.default_rng(semente)
        X, Y = gerar_lote(ids, config["T"], config["lote"], rng)
        perda, grads = perda_e_grads(params, X, Y)
        otimizador.passo(params, cortar_gradientes(grads, config["norma_max"]))
        historico.append(float(perda))
    return historico


def salvar(params, caminho):
    np.savez(caminho, **params)


def carregar(caminho):
    with np.load(caminho) as dados:
        return {chave: dados[chave] for chave in dados.files}


if __name__ == "__main__":
    import corpus
    from modelo import montar, perda_e_gradientes

    vocab, ids_treino, ids_val = corpus.carregar(200, 0)
    config = {"V": len(vocab), "T": 16, "d": 32, "blocos": 1, "lote": 16, "taxa": 0.01, "norma_max": 1.0}
    params = montar(config, 0)
    PASSOS = 5  # no "Executar", experimente 600; volte a 5 antes de verificar
    historico = treinar(params, ids_treino, config, PASSOS, 0, perda_e_gradientes)
    print(round(historico[0], 3), round(historico[-1], 3))
```

```python name="treinar ignora a função recebida"
import numpy as np


class Adam:
    def __init__(self, taxa, beta1=0.9, beta2=0.999, eps=1e-8):
        self.taxa, self.beta1, self.beta2, self.eps = taxa, beta1, beta2, eps
        self.t = 0
        self.m = {}
        self.v = {}

    def passo(self, params, grads):
        self.t += 1
        for chave in params:
            g = grads[chave]
            self.m[chave] = self.beta1 * self.m.get(chave, 0.0) + (1 - self.beta1) * g
            self.v[chave] = self.beta2 * self.v.get(chave, 0.0) + (1 - self.beta2) * g * g
            m_c = self.m[chave] / (1 - self.beta1 ** self.t)
            v_c = self.v[chave] / (1 - self.beta2 ** self.t)
            params[chave] -= self.taxa * m_c / (np.sqrt(v_c) + self.eps)


def gerar_lote(ids, T, B, rng):
    inicios = rng.integers(0, len(ids) - T, B)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    return X, Y


def cortar_gradientes(grads, norma_max):
    norma = float(np.sqrt(sum((g ** 2).sum() for g in grads.values())))
    if norma <= norma_max:
        return dict(grads)
    return {chave: g * (norma_max / norma) for chave, g in grads.items()}


def treinar(params, ids, config, passos, semente, perda_e_grads):
    rng = np.random.default_rng(semente)
    otimizador = Adam(config["taxa"])
    historico = []
    for _ in range(passos):
        X, Y = gerar_lote(ids, config["T"], config["lote"], rng)
        from modelo import perda_e_gradientes
        perda, grads = perda_e_gradientes(params, X, Y)
        otimizador.passo(params, cortar_gradientes(grads, config["norma_max"]))
        historico.append(float(perda))
    return historico


def salvar(params, caminho):
    np.savez(caminho, **params)


def carregar(caminho):
    with np.load(caminho) as dados:
        return {chave: dados[chave] for chave in dados.files}


if __name__ == "__main__":
    import corpus
    from modelo import montar, perda_e_gradientes

    vocab, ids_treino, ids_val = corpus.carregar(200, 0)
    config = {"V": len(vocab), "T": 16, "d": 32, "blocos": 1, "lote": 16, "taxa": 0.01, "norma_max": 1.0}
    params = montar(config, 0)
    PASSOS = 5  # no "Executar", experimente 600; volte a 5 antes de verificar
    historico = treinar(params, ids_treino, config, PASSOS, 0, perda_e_gradientes)
    print(round(historico[0], 3), round(historico[-1], 3))
```

## Passo 6 · Exercício · Geração e avaliação

Agora o modelo é usado. O `pesos_projeto.txt` traz o modelo do projeto treinado por 600 passos, e `carregar_pesos()` (em `pesos.py`) devolve `(config, base, merges, params)`. O `forward` é o do `modelo.py` de referência.

- `gerar(params, ids, n, temperatura, top_k, semente)` devolve uma lista de `int`: os ids recebidos seguidos de `n` ids novos. Crie `rng = np.random.default_rng(semente)` uma vez. Para cada token novo, rode o `forward` nos últimos `T` ids (um lote de 1, com `T` igual ao número de linhas de `params["pos"]`) e use os logits da última posição. Com `temperatura == 0`, o próximo token é o `argmax`, sem sorteio. Senão, divida os logits pela temperatura; se `top_k` não for `None`, mantenha só os `top_k` maiores (no empate, o de menor índice) e troque os outros por `-inf`; aplique a softmax e sorteie com `rng.choice(len(probs), p=probs)`. A sequência recebida não é alterada.
- `perplexidade(params, ids, T)` usa janelas sem sobreposição: os começos são `0, T, 2T, …` enquanto `i + T + 1 <= len(ids)`; a entrada é `ids[i:i + T]` e o alvo é `ids[i + 1:i + T + 1]`. A perda é a média de $-\ln p(\text{alvo})$ sobre todas as posições de todas as janelas, e a perplexidade é $e^{\text{perda}}$, como `float`. Com menos de `T + 1` tokens, levante `ValueError`.
- `teste_de_causalidade(params, forward)` recebe o forward a testar. Monte `ids = np.arange(T) % V` (com `T` e `V` tirados de `params["pos"]` e `params["tok"]`) e calcule os logits desse lote de 1. Para cada posição `t` de 1 a `T - 1`, troque **só** o token `t` por `(ids[t] + 1) % V` e confira, com `np.allclose(..., atol=1e-10)`, que os logits das posições `0` a `t - 1` não mudaram. Devolva `True` se nenhuma troca alterou o passado e `False` caso contrário (um `bool` do Python).

Com os pesos pré-treinados, a perplexidade de validação é 1,82; a de um bigrama de tokens com suavização, treinado no mesmo texto, é 4,33.

### Instruções

1. `gerar`: um gerador para a sequência toda, contexto cortado em `T`, logits da última posição, e a escolha por `argmax` ou por temperatura, top-k, softmax e sorteio.
2. `perplexidade`: janelas de `T` tokens sem sobreposição, alvo deslocado de um token, média do logaritmo natural e `np.exp` no fim.
3. `teste_de_causalidade`: uma troca por posição, comparando só as posições anteriores à troca.

### Código inicial

```python
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    # devolve a lista com os ids recebidos e mais n ids gerados
    pass


def perplexidade(params, ids, T):
    # e elevado à perda média das janelas sem sobreposição
    pass


def teste_de_causalidade(params, forward):
    # True se trocar um token nunca muda os logits das posições anteriores
    pass


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(gerar(params, comeco, 12, 0.8, 10, 0))
    print(teste_de_causalidade(params, forward))
```
```python path=modelo.py
"""Modelo de referência do projeto (a solução do passo 4)."""
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)
```
```python path=tokenizador.py
"""Tokenizador de referência do projeto (a solução do passo 3)."""
import numpy as np


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
    base = sorted(set(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = len(base) + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    for c in texto:
        if c not in para_id:
            raise ValueError(f"caractere fora do vocabulário: {c!r}")
    ids = [para_id[c] for c in texto]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(pedacos[a] + pedacos[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(texto) / len(codificar(texto, base, merges))


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val
```
```python path=corpus.py
"""Corpus do curso: frases geradas por uma gramática pequena sobre uma vila fictícia."""
import numpy as np

SUJEITOS = ["a padeira", "o ferreiro", "a tecelã", "o pescador", "a moleira", "o pastor", "a oleira", "o barqueiro"]
VERBOS = ["leva", "guarda", "vende", "procura", "conserta", "divide"]
OBJETOS = ["o pão", "a rede", "o barco", "a lenha", "o queijo", "a farinha", "o cesto", "o azeite"]
LUGARES = ["na praça", "no moinho", "na ponte", "no porto", "na feira", "no celeiro"]
TEMPOS = ["de manhã", "à tarde", "à noite", "até o almoço", "antes da chuva", "depois da festa"]


def gerar_corpus(n_frases=1500, semente=0):
    """Devolve n_frases frases, uma por linha; metade delas termina com um tempo."""
    rng = np.random.default_rng(semente)
    frases = []
    for _ in range(n_frases):
        partes = [str(rng.choice(SUJEITOS)), str(rng.choice(VERBOS)), str(rng.choice(OBJETOS)), str(rng.choice(LUGARES))]
        if rng.random() < 0.5:
            partes.append(str(rng.choice(TEMPOS)))
        frases.append(" ".join(partes) + ".")
    return "\n".join(frases) + "\n"


def vocabulario(texto):
    """Caracteres distintos do texto, em ordem."""
    return sorted(set(texto))


def codificar(texto, vocab):
    """Texto -> array de ids (posição de cada caractere em vocab)."""
    para_id = {c: i for i, c in enumerate(vocab)}
    return np.array([para_id[c] for c in texto], dtype=np.intp)


def decodificar(ids, vocab):
    """Ids -> texto."""
    return "".join(vocab[int(i)] for i in ids)


def carregar(n_frases=1500, semente=0, fracao_treino=0.9):
    """Devolve (vocab, ids_treino, ids_val): os últimos 10 % do texto ficam para validação."""
    texto = gerar_corpus(n_frases, semente)
    vocab = vocabulario(texto)
    ids = codificar(texto, vocab)
    corte = int(len(ids) * fracao_treino)
    return vocab, ids[:corte], ids[corte:]
```
```python path=pesos.py
"""Leitura dos pesos pré-treinados do projeto."""
import base64
import json

import numpy as np


def carregar_pesos(caminho="pesos_projeto.txt"):
    """Devolve (config, base, merges, params) do modelo treinado pelo curso por 600 passos.

    A linha 1 do arquivo é um JSON com a configuração, o tokenizador e as formas dos arrays;
    a linha 2 guarda todos os pesos em float16, codificados em base64.
    """
    with open(caminho, encoding="utf-8") as arq:
        cabecalho = json.loads(arq.readline())
        plano = np.frombuffer(base64.b64decode(arq.readline().strip()), dtype=np.float16).astype(np.float64)
    merges = [((a, b), novo_id) for (a, b), novo_id in cabecalho["merges"]]
    params, i = {}, 0
    for chave, forma in cabecalho["formas"]:
        n = int(np.prod(forma))
        params[chave] = plano[i:i + n].reshape(forma).copy()
        i += n
    return cabecalho["config"], cabecalho["base"], merges, params
```
```text path=pesos_projeto.txt
{"config": {"V": 69, "T": 16, "d": 32, "blocos": 1}, "base": ["\n", " ", ".", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "z", "à", "ã", "ç", "é"], "merges": [[[3, 1], 29], [[16, 1], 30], [[7, 11], 31], [[2, 0], 32], [[31, 19], 33], [[7, 1], 34], [[3, 19], 35], [[30, 17], 36], [[6, 34], 37], [[15, 10], 38], [[29, 17], 39], [[30, 15], 40], [[16, 19], 41], [[13, 33], 42], [[7, 20], 43], [[29, 8], 44], [[14, 16], 45], [[32, 29], 46], [[29, 30], 47], [[16, 15], 48], [[11, 38], 49], [[7, 19], 50], [[21, 7], 51], [[5, 7], 52], [[13, 7], 53], [[3, 6], 54], [[18, 22], 55], [[29, 15], 56], [[32, 36], 57], [[41, 1], 58], [[32, 30], 59], [[4, 35], 60], [[39, 19], 61], [[35, 6], 62], [[21, 34], 63], [[30, 3], 64], [[33, 30], 65], [[42, 29], 66], [[33, 29], 67], [[1, 6], 68]], "formas": [["tok", [69, 32]], ["pos", [16, 32]], ["b0.ln1_g", [32]], ["b0.ln1_b", [32]], ["b0.Wq", [32, 32]], ["b0.Wk", [32, 32]], ["b0.Wv", [32, 32]], ["b0.Wo", [32, 32]], ["b0.ln2_g", [32]], ["b0.ln2_b", [32]], ["b0.W1", [32, 128]], ["b0.c1", [128]], ["b0.W2", [128, 32]], ["b0.c2", [32]], ["lnf_g", [32]], ["lnf_b", [32]], ["Ws", [32, 69]]]}
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
```

### Solução

```python
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        logits = forward(params, np.array([ids[-T:]]))[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = logits / temperatura
            if top_k is not None:
                mantidos = np.argsort(-logits, kind="stable")[:top_k]
                filtrados = np.full(logits.shape, -np.inf)
                filtrados[mantidos] = logits[mantidos]
                logits = filtrados
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def perplexidade(params, ids, T):
    if len(ids) < T + 1:
        raise ValueError("a sequência precisa de pelo menos T + 1 tokens")
    inicios = range(0, len(ids) - T, T)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    logits = forward(params, X)
    Z = logits - logits.max(-1, keepdims=True)
    log_probs = Z - np.log(np.exp(Z).sum(-1, keepdims=True))
    linhas, colunas = np.arange(len(X))[:, None], np.arange(T)
    perda = -log_probs[linhas, colunas, Y].mean()
    return float(np.exp(perda))


def teste_de_causalidade(params, forward):
    T, V = params["pos"].shape[0], params["tok"].shape[0]
    ids = np.arange(T) % V
    original = forward(params, ids[None])[0]
    for t in range(1, T):
        trocado = ids.copy()
        trocado[t] = (trocado[t] + 1) % V
        novo = forward(params, trocado[None])[0]
        if not np.allclose(novo[:t], original[:t], atol=1e-10):
            return False
    return True


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(repr(decodificar(gerar(params, comeco, 12, 0.8, 10, 0), base, merges)))
    print(teste_de_causalidade(params, forward))
```
```python path=modelo.py
"""Modelo de referência do projeto (a solução do passo 4)."""
import numpy as np

CABECAS = 4
EPS = 1e-5


def contar_parametros(config):
    V, T, d, blocos = config["V"], config["T"], config["d"], config["blocos"]
    por_bloco = 12 * d * d + 9 * d
    return V * d + T * d + blocos * por_bloco + 2 * d + d * V


def montar(config, semente):
    V, T, d = config["V"], config["T"], config["d"]
    rng = np.random.default_rng(semente)
    p = {"tok": rng.normal(0, 0.1, (V, d)), "pos": rng.normal(0, 0.1, (T, d))}
    for i in range(config["blocos"]):
        p[f"b{i}.ln1_g"], p[f"b{i}.ln1_b"] = np.ones(d), np.zeros(d)
        for nome in ("Wq", "Wk", "Wv", "Wo"):
            p[f"b{i}.{nome}"] = rng.normal(0, d ** -0.5, (d, d))
        p[f"b{i}.ln2_g"], p[f"b{i}.ln2_b"] = np.ones(d), np.zeros(d)
        p[f"b{i}.W1"], p[f"b{i}.c1"] = rng.normal(0, (2 / d) ** 0.5, (d, 4 * d)), np.zeros(4 * d)
        p[f"b{i}.W2"], p[f"b{i}.c2"] = rng.normal(0, (4 * d) ** -0.5, (4 * d, d)), np.zeros(d)
    p["lnf_g"], p["lnf_b"] = np.ones(d), np.zeros(d)
    p["Ws"] = rng.normal(0, 0.1 * d ** -0.5, (d, V))
    return p


def _norma(x, g, b):
    xc = x - x.mean(-1, keepdims=True)
    s = np.sqrt((xc ** 2).mean(-1, keepdims=True) + EPS)
    return g * (xc / s) + b, (xc / s, s, g)


def _norma_volta(dy, cache):
    xh, s, g = cache
    dxh = dy * g
    dx = (dxh - dxh.mean(-1, keepdims=True) - xh * (dxh * xh).mean(-1, keepdims=True)) / s
    return dx, (dy * xh).sum((0, 1)), dy.sum((0, 1))


def _dividir(x):
    B, T, d = x.shape
    return x.reshape(B, T, CABECAS, d // CABECAS).transpose(0, 2, 1, 3)


def _juntar(x):
    B, h, T, dh = x.shape
    return x.transpose(0, 2, 1, 3).reshape(B, T, h * dh)


def _n_blocos(params):
    return sum(1 for chave in params if chave.endswith(".Wq"))


def _forward(params, ids):
    B, T = ids.shape
    x = params["tok"][ids] + params["pos"][:T]
    dh = x.shape[-1] // CABECAS
    futuro = np.triu(np.ones((T, T), dtype=bool), 1)
    blocos = []
    for i in range(_n_blocos(params)):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1 = _norma(x, P["ln1_g"], P["ln1_b"])
        q, k, v = _dividir(a @ P["Wq"]), _dividir(a @ P["Wk"]), _dividir(a @ P["Wv"])
        S = np.where(futuro, -np.inf, q @ k.transpose(0, 1, 3, 2) / np.sqrt(dh))
        A = np.exp(S - S.max(-1, keepdims=True))
        A = A / A.sum(-1, keepdims=True)
        o = _juntar(A @ v)
        x = x + o @ P["Wo"]
        m, ln2 = _norma(x, P["ln2_g"], P["ln2_b"])
        z = m @ P["W1"] + P["c1"]
        r = np.maximum(z, 0.0)
        x = x + r @ P["W2"] + P["c2"]
        blocos.append((a, ln1, q, k, v, A, o, m, ln2, z, r))
    f, lnf = _norma(x, params["lnf_g"], params["lnf_b"])
    return f @ params["Ws"], (ids, blocos, f, lnf)


def forward(params, ids):
    return _forward(params, ids)[0]


def _backward(params, dlogits, cache):
    ids, blocos, f, lnf = cache
    B, T = ids.shape
    dh = f.shape[-1] // CABECAS
    plano = lambda a: a.reshape(B * T, -1)
    g = {"Ws": plano(f).T @ plano(dlogits)}
    dx, g["lnf_g"], g["lnf_b"] = _norma_volta(dlogits @ params["Ws"].T, lnf)
    for i in reversed(range(len(blocos))):
        P = {chave.split(".")[1]: v for chave, v in params.items() if chave.startswith(f"b{i}.")}
        a, ln1, q, k, v, A, o, m, ln2, z, r = blocos[i]
        g[f"b{i}.W2"], g[f"b{i}.c2"] = plano(r).T @ plano(dx), dx.sum((0, 1))
        dz = (dx @ P["W2"].T) * (z > 0)
        g[f"b{i}.W1"], g[f"b{i}.c1"] = plano(m).T @ plano(dz), dz.sum((0, 1))
        dm, g[f"b{i}.ln2_g"], g[f"b{i}.ln2_b"] = _norma_volta(dz @ P["W1"].T, ln2)
        dx = dx + dm
        g[f"b{i}.Wo"] = plano(o).T @ plano(dx)
        dAv = _dividir(dx @ P["Wo"].T)
        dA = dAv @ v.transpose(0, 1, 3, 2)
        dS = A * (dA - (dA * A).sum(-1, keepdims=True)) / np.sqrt(dh)
        dq, dk, dv = _juntar(dS @ k), _juntar(dS.transpose(0, 1, 3, 2) @ q), _juntar(A.transpose(0, 1, 3, 2) @ dAv)
        for nome, dp in (("Wq", dq), ("Wk", dk), ("Wv", dv)):
            g[f"b{i}.{nome}"] = plano(a).T @ plano(dp)
        da, g[f"b{i}.ln1_g"], g[f"b{i}.ln1_b"] = _norma_volta(dq @ P["Wq"].T + dk @ P["Wk"].T + dv @ P["Wv"].T, ln1)
        dx = dx + da
    g["tok"] = np.zeros_like(params["tok"])
    np.add.at(g["tok"], ids, dx)
    g["pos"] = np.zeros_like(params["pos"])
    g["pos"][:T] = dx.sum(0)
    return g


def perda_e_gradientes(params, ids, alvos):
    B, T = ids.shape
    logits, cache = _forward(params, ids)
    Z = logits - logits.max(-1, keepdims=True)
    P = np.exp(Z)
    P = P / P.sum(-1, keepdims=True)
    linhas, colunas = np.arange(B)[:, None], np.arange(T)
    perda = float(-np.log(P[linhas, colunas, alvos]).mean())
    dlogits = P.copy()
    dlogits[linhas, colunas, alvos] -= 1.0
    return perda, _backward(params, dlogits / (B * T), cache)
```
```python path=tokenizador.py
"""Tokenizador de referência do projeto (a solução do passo 3)."""
import numpy as np


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
    base = sorted(set(texto))
    para_id = {c: i for i, c in enumerate(base)}
    ids = [para_id[c] for c in texto]
    merges = []
    for k in range(n_mesclas):
        contagem = contar_pares(ids)
        if not contagem:
            break
        par = min(contagem, key=lambda p: (-contagem[p], p))
        novo_id = len(base) + k
        ids = mesclar(ids, par, novo_id)
        merges.append((par, novo_id))
    return base, merges


def codificar(texto, base, merges):
    para_id = {c: i for i, c in enumerate(base)}
    for c in texto:
        if c not in para_id:
            raise ValueError(f"caractere fora do vocabulário: {c!r}")
    ids = [para_id[c] for c in texto]
    for par, novo_id in merges:
        ids = mesclar(ids, par, novo_id)
    return ids


def decodificar(ids, base, merges):
    pedacos = list(base)
    for (a, b), _novo_id in merges:
        pedacos.append(pedacos[a] + pedacos[b])
    return "".join(pedacos[int(i)] for i in ids)


def taxa_de_compressao(texto, base, merges):
    if not texto:
        raise ValueError("texto vazio")
    return len(texto) / len(codificar(texto, base, merges))


def preparar(texto_treino, texto_val, n_mesclas):
    base, merges = treinar_bpe(texto_treino, n_mesclas)
    ids_treino = np.array(codificar(texto_treino, base, merges), dtype=np.intp)
    ids_val = np.array(codificar(texto_val, base, merges), dtype=np.intp)
    return base, merges, ids_treino, ids_val
```
```python path=corpus.py
"""Corpus do curso: frases geradas por uma gramática pequena sobre uma vila fictícia."""
import numpy as np

SUJEITOS = ["a padeira", "o ferreiro", "a tecelã", "o pescador", "a moleira", "o pastor", "a oleira", "o barqueiro"]
VERBOS = ["leva", "guarda", "vende", "procura", "conserta", "divide"]
OBJETOS = ["o pão", "a rede", "o barco", "a lenha", "o queijo", "a farinha", "o cesto", "o azeite"]
LUGARES = ["na praça", "no moinho", "na ponte", "no porto", "na feira", "no celeiro"]
TEMPOS = ["de manhã", "à tarde", "à noite", "até o almoço", "antes da chuva", "depois da festa"]


def gerar_corpus(n_frases=1500, semente=0):
    """Devolve n_frases frases, uma por linha; metade delas termina com um tempo."""
    rng = np.random.default_rng(semente)
    frases = []
    for _ in range(n_frases):
        partes = [str(rng.choice(SUJEITOS)), str(rng.choice(VERBOS)), str(rng.choice(OBJETOS)), str(rng.choice(LUGARES))]
        if rng.random() < 0.5:
            partes.append(str(rng.choice(TEMPOS)))
        frases.append(" ".join(partes) + ".")
    return "\n".join(frases) + "\n"


def vocabulario(texto):
    """Caracteres distintos do texto, em ordem."""
    return sorted(set(texto))


def codificar(texto, vocab):
    """Texto -> array de ids (posição de cada caractere em vocab)."""
    para_id = {c: i for i, c in enumerate(vocab)}
    return np.array([para_id[c] for c in texto], dtype=np.intp)


def decodificar(ids, vocab):
    """Ids -> texto."""
    return "".join(vocab[int(i)] for i in ids)


def carregar(n_frases=1500, semente=0, fracao_treino=0.9):
    """Devolve (vocab, ids_treino, ids_val): os últimos 10 % do texto ficam para validação."""
    texto = gerar_corpus(n_frases, semente)
    vocab = vocabulario(texto)
    ids = codificar(texto, vocab)
    corte = int(len(ids) * fracao_treino)
    return vocab, ids[:corte], ids[corte:]
```
```python path=pesos.py
"""Leitura dos pesos pré-treinados do projeto."""
import base64
import json

import numpy as np


def carregar_pesos(caminho="pesos_projeto.txt"):
    """Devolve (config, base, merges, params) do modelo treinado pelo curso por 600 passos.

    A linha 1 do arquivo é um JSON com a configuração, o tokenizador e as formas dos arrays;
    a linha 2 guarda todos os pesos em float16, codificados em base64.
    """
    with open(caminho, encoding="utf-8") as arq:
        cabecalho = json.loads(arq.readline())
        plano = np.frombuffer(base64.b64decode(arq.readline().strip()), dtype=np.float16).astype(np.float64)
    merges = [((a, b), novo_id) for (a, b), novo_id in cabecalho["merges"]]
    params, i = {}, 0
    for chave, forma in cabecalho["formas"]:
        n = int(np.prod(forma))
        params[chave] = plano[i:i + n].reshape(forma).copy()
        i += n
    return cabecalho["config"], cabecalho["base"], merges, params
```
```text path=pesos_projeto.txt
{"config": {"V": 69, "T": 16, "d": 32, "blocos": 1}, "base": ["\n", " ", ".", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "z", "à", "ã", "ç", "é"], "merges": [[[3, 1], 29], [[16, 1], 30], [[7, 11], 31], [[2, 0], 32], [[31, 19], 33], [[7, 1], 34], [[3, 19], 35], [[30, 17], 36], [[6, 34], 37], [[15, 10], 38], [[29, 17], 39], [[30, 15], 40], [[16, 19], 41], [[13, 33], 42], [[7, 20], 43], [[29, 8], 44], [[14, 16], 45], [[32, 29], 46], [[29, 30], 47], [[16, 15], 48], [[11, 38], 49], [[7, 19], 50], [[21, 7], 51], [[5, 7], 52], [[13, 7], 53], [[3, 6], 54], [[18, 22], 55], [[29, 15], 56], [[32, 36], 57], [[41, 1], 58], [[32, 30], 59], [[4, 35], 60], [[39, 19], 61], [[35, 6], 62], [[21, 34], 63], [[30, 3], 64], [[33, 30], 65], [[42, 29], 66], [[33, 29], 67], [[1, 6], 68]], "formas": [["tok", [69, 32]], ["pos", [16, 32]], ["b0.ln1_g", [32]], ["b0.ln1_b", [32]], ["b0.Wq", [32, 32]], ["b0.Wk", [32, 32]], ["b0.Wv", [32, 32]], ["b0.Wo", [32, 32]], ["b0.ln2_g", [32]], ["b0.ln2_b", [32]], ["b0.W1", [32, 128]], ["b0.c1", [128]], ["b0.W2", [128, 32]], ["b0.c2", [32]], ["lnf_g", [32]], ["lnf_b", [32]], ["Ws", [32, 69]]]}
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
```

### Dicas

1. `ids[-T:]` corta o contexto; sem o corte, `pos[:T']` não tem linhas para um texto mais longo que `T`.
2. A perda está em logaritmo natural, então a perplexidade é `np.exp(perda)`. Um modelo que dá a mesma probabilidade a todos os tokens tem perplexidade `V`.
3. Trocar só o último token testa uma única fronteira entre passado e futuro. O laço precisa passar por todas as posições.

### Verificação

```json
[
  {"id": "gerar-tamanho", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n_g = gerar(_p, _c, 12, 1.0, None, 0)\n", "expr": "[len(_g), _g[:3], all(type(i) is int for i in _g), all(0 <= i < 69 for i in _g)]", "expected": [15, [39, 54, 67], true, true], "name": "3 ids recebidos mais 12 gerados, todos int dentro do vocabulário"},
  {"id": "gerar-guloso", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n", "expr": "gerar(_p, _c, 12, 0, None, 0)", "expected": [39, 54, 67, 6, 11, 23, 11, 37, 30, 55, 31, 12, 40, 30, 45], "name": "Temperatura 0: os 12 tokens mais prováveis depois de \"a padeira \""},
  {"id": "guloso-sem-sorteio", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n", "expr": "gerar(_p, _c, 12, 0, 5, 0) == gerar(_p, _c, 12, 0, None, 99)", "expected": true, "name": "Com temperatura 0, a semente e o top-k não mudam o resultado"},
  {"id": "gerar-amostra", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n", "expr": "gerar(_p, _c, 12, 0.8, 10, 0)", "expected": [39, 54, 67, 6, 11, 23, 11, 37, 64, 24, 31, 63, 15, 44, 33], "name": "Amostra com temperatura 0,8, top-k 10 e semente 0", "hint": "Um rng.choice por token, com o gerador criado uma vez antes do laço."},
  {"id": "gerar-sem-top-k", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n", "expr": "gerar(_p, _c, 12, 1.5, None, 3)", "expected": [39, 54, 67, 5, 48, 20, 50, 21, 29, 36, 26, 40, 30, 45, 49], "name": "Amostra com temperatura 1,5, sem top-k, semente 3", "hint": "A temperatura divide os logits."},
  {"id": "gerar-reprodutivel", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n", "expr": "[gerar(_p, _c, 30, 1.0, None, 7) == gerar(_p, _c, 30, 1.0, None, 7), gerar(_p, _c, 30, 1.0, None, 7) == gerar(_p, _c, 30, 1.0, None, 8)]", "expected": [true, false], "name": "A mesma semente repete a amostra; outra semente muda"},
  {"id": "top-k-um", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n", "expr": "gerar(_p, _c, 12, 2.0, 1, 5) == gerar(_p, _c, 12, 0, None, 0)", "expected": true, "name": "top-k 1 escolhe sempre o mais provável, com qualquer temperatura"},
  {"id": "top-k-restringe", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n_g = gerar(_p, _c, 20, 5.0, 2, 1)\n", "expr": "all(_g[i] in np.argsort(-_fw(_p, np.array([_g[max(0, i - 16):i]]))[0, -1], kind=\"stable\")[:2] for i in range(3, len(_g)))", "expected": true, "name": "Com top-k 2 e temperatura 5, todo token gerado está entre os 2 mais prováveis"},
  {"id": "contexto-cortado", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n_longo = [int(i) for i in np.arange(40) % 60]\n_g = gerar(_p, _longo, 5, 0, None, 0)\n", "expr": "[len(_g), _g[40:] == gerar(_p, _longo[-16:], 5, 0, None, 0)[16:]]", "expected": [45, true], "name": "Com 40 ids de entrada, só os 16 últimos entram no forward", "hint": "O modelo tem 16 posições: corte o contexto antes de cada forward."},
  {"id": "gerar-zero", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n_a = np.array(_c)\n_g = gerar(_p, _a, 0, 1.0, None, 0)\n", "expr": "[_g, type(_g).__name__, _a.tolist()]", "expected": [[39, 54, 67], "list", [39, 54, 67]], "name": "n = 0 devolve os ids recebidos, como lista, e aceita um array"},
  {"id": "entrada-intacta", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n_g = gerar(_p, _c, 8, 1.0, None, 0)\n", "expr": "[_c, len(_g)]", "expected": [[39, 54, 67], 11], "name": "A lista recebida não cresce"},
  {"id": "ppl-validacao", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\nimport corpus\nimport tokenizador\n_val = np.array(tokenizador.codificar(corpus.gerar_corpus(150, 1), _base, _merges))\n", "expr": "perplexidade(_p, _val, 16)", "expected": 1.8204395239214008, "tolerance": 1e-06, "name": "Perplexidade de validação dos pesos pré-treinados: 1,82"},
  {"id": "ppl-abaixo-do-bigrama", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\nimport corpus\nimport tokenizador\n_val = np.array(tokenizador.codificar(corpus.gerar_corpus(150, 1), _base, _merges))\n", "expr": "bool(perplexidade(_p, _val, 16) < 0.6 * 4.33)", "expected": true, "name": "A perplexidade fica abaixo de 60 % da do bigrama (4,33)"},
  {"id": "ppl-uniforme", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\nimport corpus\nimport tokenizador\n_val = np.array(tokenizador.codificar(corpus.gerar_corpus(150, 1), _base, _merges))\n_z = {k: np.zeros_like(v) for k, v in _p.items()}\n", "expr": "perplexidade(_z, _val, 16)", "expected": 69.0, "tolerance": 1e-09, "name": "Pesos zerados dão logits iguais: a perplexidade é V = 69", "hint": "A perda é ln 69, e e^(ln 69) = 69. A base do logaritmo e a da potência precisam ser a mesma."},
  {"id": "ppl-tres-janelas", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\nimport corpus\nimport tokenizador\n_val = np.array(tokenizador.codificar(corpus.gerar_corpus(150, 1), _base, _merges))\n", "expr": "[perplexidade(_p, _val[:49], 16), perplexidade(_p, _val[:50], 16), perplexidade(_p, _val[:64], 16)]", "expected": [2.608794402220116, 2.608794402220116, 2.608794402220116], "tolerance": 1e-06, "name": "49, 50 e 64 tokens dão as mesmas 3 janelas", "hint": "A quarta janela só existe a partir de 65 tokens, porque o alvo precisa de um token a mais."},
  {"id": "ppl-uma-janela", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\nimport corpus\nimport tokenizador\n_val = np.array(tokenizador.codificar(corpus.gerar_corpus(150, 1), _base, _merges))\n", "expr": "perplexidade(_p, _val[:17], 16)", "expected": 5.997199478812801, "tolerance": 1e-06, "name": "Com exatamente T + 1 tokens há uma janela"},
  {"id": "ppl-outro-T", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\nimport corpus\nimport tokenizador\n_val = np.array(tokenizador.codificar(corpus.gerar_corpus(150, 1), _base, _merges))\n", "expr": "perplexidade(_p, _val[:200], 8)", "expected": 2.2274462322764736, "tolerance": 1e-06, "name": "Janelas de 8 tokens nos 200 primeiros tokens da validação"},
  {"id": "ppl-curta", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\nimport corpus\nimport tokenizador\n_val = np.array(tokenizador.codificar(corpus.gerar_corpus(150, 1), _base, _merges))\n", "expr": "perplexidade(_p, _val[:16], 16)", "raises": "ValueError", "name": "Com T tokens não há alvo para a última posição: ValueError"},
  {"id": "causal-referencia", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n\ndef _vaza_tudo(p, ids):\n    return _fw(p, ids) + p[\"tok\"][ids].mean(1, keepdims=True) @ p[\"Ws\"]\ndef _vaza_ponto(p, ids):\n    saida = _fw(p, ids).copy()\n    if ids.shape[1] > 4:\n        saida[:, 3] += p[\"tok\"][ids[:, 4]] @ p[\"Ws\"]\n    return saida\ndef _vaza_ultimo(p, ids):\n    saida = _fw(p, ids).copy()\n    if ids.shape[1] > 1:\n        saida[:, 0] += p[\"tok\"][ids[:, -1]] @ p[\"Ws\"]\n    return saida\ndef _so_atual(p, ids):\n    return p[\"tok\"][ids] @ p[\"Ws\"]\n", "expr": "[teste_de_causalidade(_p, _fw), type(teste_de_causalidade(_p, _fw)).__name__]", "expected": [true, "bool"], "name": "O forward de referência passa no teste, e a resposta é um bool"},
  {"id": "causal-sem-mascara", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n\ndef _vaza_tudo(p, ids):\n    return _fw(p, ids) + p[\"tok\"][ids].mean(1, keepdims=True) @ p[\"Ws\"]\ndef _vaza_ponto(p, ids):\n    saida = _fw(p, ids).copy()\n    if ids.shape[1] > 4:\n        saida[:, 3] += p[\"tok\"][ids[:, 4]] @ p[\"Ws\"]\n    return saida\ndef _vaza_ultimo(p, ids):\n    saida = _fw(p, ids).copy()\n    if ids.shape[1] > 1:\n        saida[:, 0] += p[\"tok\"][ids[:, -1]] @ p[\"Ws\"]\n    return saida\ndef _so_atual(p, ids):\n    return p[\"tok\"][ids] @ p[\"Ws\"]\n", "expr": "teste_de_causalidade(_p, _vaza_tudo)", "expected": false, "name": "Um forward em que toda posição vê a sequência inteira é reprovado"},
  {"id": "causal-vazamento-pontual", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n\ndef _vaza_tudo(p, ids):\n    return _fw(p, ids) + p[\"tok\"][ids].mean(1, keepdims=True) @ p[\"Ws\"]\ndef _vaza_ponto(p, ids):\n    saida = _fw(p, ids).copy()\n    if ids.shape[1] > 4:\n        saida[:, 3] += p[\"tok\"][ids[:, 4]] @ p[\"Ws\"]\n    return saida\ndef _vaza_ultimo(p, ids):\n    saida = _fw(p, ids).copy()\n    if ids.shape[1] > 1:\n        saida[:, 0] += p[\"tok\"][ids[:, -1]] @ p[\"Ws\"]\n    return saida\ndef _so_atual(p, ids):\n    return p[\"tok\"][ids] @ p[\"Ws\"]\n", "expr": "teste_de_causalidade(_p, _vaza_ponto)", "expected": false, "name": "Um forward em que só a posição 3 vê o token 4 é reprovado", "hint": "Trocar apenas o último token não revela esse vazamento: troque cada posição."},
  {"id": "causal-vazamento-longe", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n\ndef _vaza_tudo(p, ids):\n    return _fw(p, ids) + p[\"tok\"][ids].mean(1, keepdims=True) @ p[\"Ws\"]\ndef _vaza_ponto(p, ids):\n    saida = _fw(p, ids).copy()\n    if ids.shape[1] > 4:\n        saida[:, 3] += p[\"tok\"][ids[:, 4]] @ p[\"Ws\"]\n    return saida\ndef _vaza_ultimo(p, ids):\n    saida = _fw(p, ids).copy()\n    if ids.shape[1] > 1:\n        saida[:, 0] += p[\"tok\"][ids[:, -1]] @ p[\"Ws\"]\n    return saida\ndef _so_atual(p, ids):\n    return p[\"tok\"][ids] @ p[\"Ws\"]\n", "expr": "teste_de_causalidade(_p, _vaza_ultimo)", "expected": false, "name": "Um forward em que a posição 0 vê o último token é reprovado", "hint": "Depois de trocar o token t, compare todas as posições de 0 a t - 1, não só a vizinha."},
  {"id": "causal-so-o-proprio-token", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom pesos import carregar_pesos\nfrom modelo import forward as _fw\n_cfg, _base, _merges, _p = carregar_pesos()\n_c = [39, 54, 67]\n\ndef _vaza_tudo(p, ids):\n    return _fw(p, ids) + p[\"tok\"][ids].mean(1, keepdims=True) @ p[\"Ws\"]\ndef _vaza_ponto(p, ids):\n    saida = _fw(p, ids).copy()\n    if ids.shape[1] > 4:\n        saida[:, 3] += p[\"tok\"][ids[:, 4]] @ p[\"Ws\"]\n    return saida\ndef _vaza_ultimo(p, ids):\n    saida = _fw(p, ids).copy()\n    if ids.shape[1] > 1:\n        saida[:, 0] += p[\"tok\"][ids[:, -1]] @ p[\"Ws\"]\n    return saida\ndef _so_atual(p, ids):\n    return p[\"tok\"][ids] @ p[\"Ws\"]\n", "expr": "teste_de_causalidade(_p, _so_atual)", "expected": true, "name": "Um forward em que cada posição só vê o próprio token é causal", "hint": "A posição trocada pode mudar; só as anteriores precisam ficar iguais."}
]
```

### Soluções erradas

```python name="geração sem cortar o contexto"
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        logits = forward(params, np.array([ids]))[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = logits / temperatura
            if top_k is not None:
                mantidos = np.argsort(-logits, kind="stable")[:top_k]
                filtrados = np.full(logits.shape, -np.inf)
                filtrados[mantidos] = logits[mantidos]
                logits = filtrados
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def perplexidade(params, ids, T):
    if len(ids) < T + 1:
        raise ValueError("a sequência precisa de pelo menos T + 1 tokens")
    inicios = range(0, len(ids) - T, T)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    logits = forward(params, X)
    Z = logits - logits.max(-1, keepdims=True)
    log_probs = Z - np.log(np.exp(Z).sum(-1, keepdims=True))
    linhas, colunas = np.arange(len(X))[:, None], np.arange(T)
    perda = -log_probs[linhas, colunas, Y].mean()
    return float(np.exp(perda))


def teste_de_causalidade(params, forward):
    T, V = params["pos"].shape[0], params["tok"].shape[0]
    ids = np.arange(T) % V
    original = forward(params, ids[None])[0]
    for t in range(1, T):
        trocado = ids.copy()
        trocado[t] = (trocado[t] + 1) % V
        novo = forward(params, trocado[None])[0]
        if not np.allclose(novo[:t], original[:t], atol=1e-10):
            return False
    return True


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(repr(decodificar(gerar(params, comeco, 12, 0.8, 10, 0), base, merges)))
    print(teste_de_causalidade(params, forward))
```

```python name="temperatura multiplicando os logits"
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        logits = forward(params, np.array([ids[-T:]]))[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = logits * temperatura
            if top_k is not None:
                mantidos = np.argsort(-logits, kind="stable")[:top_k]
                filtrados = np.full(logits.shape, -np.inf)
                filtrados[mantidos] = logits[mantidos]
                logits = filtrados
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def perplexidade(params, ids, T):
    if len(ids) < T + 1:
        raise ValueError("a sequência precisa de pelo menos T + 1 tokens")
    inicios = range(0, len(ids) - T, T)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    logits = forward(params, X)
    Z = logits - logits.max(-1, keepdims=True)
    log_probs = Z - np.log(np.exp(Z).sum(-1, keepdims=True))
    linhas, colunas = np.arange(len(X))[:, None], np.arange(T)
    perda = -log_probs[linhas, colunas, Y].mean()
    return float(np.exp(perda))


def teste_de_causalidade(params, forward):
    T, V = params["pos"].shape[0], params["tok"].shape[0]
    ids = np.arange(T) % V
    original = forward(params, ids[None])[0]
    for t in range(1, T):
        trocado = ids.copy()
        trocado[t] = (trocado[t] + 1) % V
        novo = forward(params, trocado[None])[0]
        if not np.allclose(novo[:t], original[:t], atol=1e-10):
            return False
    return True


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(repr(decodificar(gerar(params, comeco, 12, 0.8, 10, 0), base, merges)))
    print(teste_de_causalidade(params, forward))
```

```python name="gerador recriado a cada token"
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        rng = np.random.default_rng(semente)
        logits = forward(params, np.array([ids[-T:]]))[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = logits / temperatura
            if top_k is not None:
                mantidos = np.argsort(-logits, kind="stable")[:top_k]
                filtrados = np.full(logits.shape, -np.inf)
                filtrados[mantidos] = logits[mantidos]
                logits = filtrados
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def perplexidade(params, ids, T):
    if len(ids) < T + 1:
        raise ValueError("a sequência precisa de pelo menos T + 1 tokens")
    inicios = range(0, len(ids) - T, T)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    logits = forward(params, X)
    Z = logits - logits.max(-1, keepdims=True)
    log_probs = Z - np.log(np.exp(Z).sum(-1, keepdims=True))
    linhas, colunas = np.arange(len(X))[:, None], np.arange(T)
    perda = -log_probs[linhas, colunas, Y].mean()
    return float(np.exp(perda))


def teste_de_causalidade(params, forward):
    T, V = params["pos"].shape[0], params["tok"].shape[0]
    ids = np.arange(T) % V
    original = forward(params, ids[None])[0]
    for t in range(1, T):
        trocado = ids.copy()
        trocado[t] = (trocado[t] + 1) % V
        novo = forward(params, trocado[None])[0]
        if not np.allclose(novo[:t], original[:t], atol=1e-10):
            return False
    return True


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(repr(decodificar(gerar(params, comeco, 12, 0.8, 10, 0), base, merges)))
    print(teste_de_causalidade(params, forward))
```

```python name="perplexidade com 10 elevado à perda"
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        logits = forward(params, np.array([ids[-T:]]))[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = logits / temperatura
            if top_k is not None:
                mantidos = np.argsort(-logits, kind="stable")[:top_k]
                filtrados = np.full(logits.shape, -np.inf)
                filtrados[mantidos] = logits[mantidos]
                logits = filtrados
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def perplexidade(params, ids, T):
    if len(ids) < T + 1:
        raise ValueError("a sequência precisa de pelo menos T + 1 tokens")
    inicios = range(0, len(ids) - T, T)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    logits = forward(params, X)
    Z = logits - logits.max(-1, keepdims=True)
    log_probs = Z - np.log(np.exp(Z).sum(-1, keepdims=True))
    linhas, colunas = np.arange(len(X))[:, None], np.arange(T)
    perda = -log_probs[linhas, colunas, Y].mean()
    return float(10 ** perda)


def teste_de_causalidade(params, forward):
    T, V = params["pos"].shape[0], params["tok"].shape[0]
    ids = np.arange(T) % V
    original = forward(params, ids[None])[0]
    for t in range(1, T):
        trocado = ids.copy()
        trocado[t] = (trocado[t] + 1) % V
        novo = forward(params, trocado[None])[0]
        if not np.allclose(novo[:t], original[:t], atol=1e-10):
            return False
    return True


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(repr(decodificar(gerar(params, comeco, 12, 0.8, 10, 0), base, merges)))
    print(teste_de_causalidade(params, forward))
```

```python name="perplexidade com o alvo não deslocado"
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        logits = forward(params, np.array([ids[-T:]]))[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = logits / temperatura
            if top_k is not None:
                mantidos = np.argsort(-logits, kind="stable")[:top_k]
                filtrados = np.full(logits.shape, -np.inf)
                filtrados[mantidos] = logits[mantidos]
                logits = filtrados
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def perplexidade(params, ids, T):
    if len(ids) < T + 1:
        raise ValueError("a sequência precisa de pelo menos T + 1 tokens")
    inicios = range(0, len(ids) - T, T)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i:i + T] for i in inicios])
    logits = forward(params, X)
    Z = logits - logits.max(-1, keepdims=True)
    log_probs = Z - np.log(np.exp(Z).sum(-1, keepdims=True))
    linhas, colunas = np.arange(len(X))[:, None], np.arange(T)
    perda = -log_probs[linhas, colunas, Y].mean()
    return float(np.exp(perda))


def teste_de_causalidade(params, forward):
    T, V = params["pos"].shape[0], params["tok"].shape[0]
    ids = np.arange(T) % V
    original = forward(params, ids[None])[0]
    for t in range(1, T):
        trocado = ids.copy()
        trocado[t] = (trocado[t] + 1) % V
        novo = forward(params, trocado[None])[0]
        if not np.allclose(novo[:t], original[:t], atol=1e-10):
            return False
    return True


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(repr(decodificar(gerar(params, comeco, 12, 0.8, 10, 0), base, merges)))
    print(teste_de_causalidade(params, forward))
```

```python name="perplexidade com janelas sobrepostas"
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        logits = forward(params, np.array([ids[-T:]]))[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = logits / temperatura
            if top_k is not None:
                mantidos = np.argsort(-logits, kind="stable")[:top_k]
                filtrados = np.full(logits.shape, -np.inf)
                filtrados[mantidos] = logits[mantidos]
                logits = filtrados
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def perplexidade(params, ids, T):
    if len(ids) < T + 1:
        raise ValueError("a sequência precisa de pelo menos T + 1 tokens")
    inicios = range(0, len(ids) - T)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    logits = forward(params, X)
    Z = logits - logits.max(-1, keepdims=True)
    log_probs = Z - np.log(np.exp(Z).sum(-1, keepdims=True))
    linhas, colunas = np.arange(len(X))[:, None], np.arange(T)
    perda = -log_probs[linhas, colunas, Y].mean()
    return float(np.exp(perda))


def teste_de_causalidade(params, forward):
    T, V = params["pos"].shape[0], params["tok"].shape[0]
    ids = np.arange(T) % V
    original = forward(params, ids[None])[0]
    for t in range(1, T):
        trocado = ids.copy()
        trocado[t] = (trocado[t] + 1) % V
        novo = forward(params, trocado[None])[0]
        if not np.allclose(novo[:t], original[:t], atol=1e-10):
            return False
    return True


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(repr(decodificar(gerar(params, comeco, 12, 0.8, 10, 0), base, merges)))
    print(teste_de_causalidade(params, forward))
```

```python name="teste de causalidade só troca o último token"
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        logits = forward(params, np.array([ids[-T:]]))[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = logits / temperatura
            if top_k is not None:
                mantidos = np.argsort(-logits, kind="stable")[:top_k]
                filtrados = np.full(logits.shape, -np.inf)
                filtrados[mantidos] = logits[mantidos]
                logits = filtrados
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def perplexidade(params, ids, T):
    if len(ids) < T + 1:
        raise ValueError("a sequência precisa de pelo menos T + 1 tokens")
    inicios = range(0, len(ids) - T, T)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    logits = forward(params, X)
    Z = logits - logits.max(-1, keepdims=True)
    log_probs = Z - np.log(np.exp(Z).sum(-1, keepdims=True))
    linhas, colunas = np.arange(len(X))[:, None], np.arange(T)
    perda = -log_probs[linhas, colunas, Y].mean()
    return float(np.exp(perda))


def teste_de_causalidade(params, forward):
    T, V = params["pos"].shape[0], params["tok"].shape[0]
    ids = np.arange(T) % V
    original = forward(params, ids[None])[0]
    for t in range(T - 1, T):
        trocado = ids.copy()
        trocado[t] = (trocado[t] + 1) % V
        novo = forward(params, trocado[None])[0]
        if not np.allclose(novo[:t], original[:t], atol=1e-10):
            return False
    return True


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(repr(decodificar(gerar(params, comeco, 12, 0.8, 10, 0), base, merges)))
    print(teste_de_causalidade(params, forward))
```

```python name="teste de causalidade compara só a posição vizinha"
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        logits = forward(params, np.array([ids[-T:]]))[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = logits / temperatura
            if top_k is not None:
                mantidos = np.argsort(-logits, kind="stable")[:top_k]
                filtrados = np.full(logits.shape, -np.inf)
                filtrados[mantidos] = logits[mantidos]
                logits = filtrados
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def perplexidade(params, ids, T):
    if len(ids) < T + 1:
        raise ValueError("a sequência precisa de pelo menos T + 1 tokens")
    inicios = range(0, len(ids) - T, T)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    logits = forward(params, X)
    Z = logits - logits.max(-1, keepdims=True)
    log_probs = Z - np.log(np.exp(Z).sum(-1, keepdims=True))
    linhas, colunas = np.arange(len(X))[:, None], np.arange(T)
    perda = -log_probs[linhas, colunas, Y].mean()
    return float(np.exp(perda))


def teste_de_causalidade(params, forward):
    T, V = params["pos"].shape[0], params["tok"].shape[0]
    ids = np.arange(T) % V
    original = forward(params, ids[None])[0]
    for t in range(1, T):
        trocado = ids.copy()
        trocado[t] = (trocado[t] + 1) % V
        novo = forward(params, trocado[None])[0]
        if not np.allclose(novo[t - 1], original[t - 1], atol=1e-10):
            return False
    return True


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(repr(decodificar(gerar(params, comeco, 12, 0.8, 10, 0), base, merges)))
    print(teste_de_causalidade(params, forward))
```

```python name="teste de causalidade inclui a posição trocada"
import numpy as np

from modelo import forward


def gerar(params, ids, n, temperatura, top_k, semente):
    rng = np.random.default_rng(semente)
    T = params["pos"].shape[0]
    ids = [int(i) for i in ids]
    for _ in range(n):
        logits = forward(params, np.array([ids[-T:]]))[0, -1]
        if temperatura == 0:
            proximo = int(np.argmax(logits))
        else:
            logits = logits / temperatura
            if top_k is not None:
                mantidos = np.argsort(-logits, kind="stable")[:top_k]
                filtrados = np.full(logits.shape, -np.inf)
                filtrados[mantidos] = logits[mantidos]
                logits = filtrados
            probs = np.exp(logits - logits.max())
            probs = probs / probs.sum()
            proximo = int(rng.choice(len(probs), p=probs))
        ids.append(proximo)
    return ids


def perplexidade(params, ids, T):
    if len(ids) < T + 1:
        raise ValueError("a sequência precisa de pelo menos T + 1 tokens")
    inicios = range(0, len(ids) - T, T)
    X = np.stack([ids[i:i + T] for i in inicios])
    Y = np.stack([ids[i + 1:i + T + 1] for i in inicios])
    logits = forward(params, X)
    Z = logits - logits.max(-1, keepdims=True)
    log_probs = Z - np.log(np.exp(Z).sum(-1, keepdims=True))
    linhas, colunas = np.arange(len(X))[:, None], np.arange(T)
    perda = -log_probs[linhas, colunas, Y].mean()
    return float(np.exp(perda))


def teste_de_causalidade(params, forward):
    T, V = params["pos"].shape[0], params["tok"].shape[0]
    ids = np.arange(T) % V
    original = forward(params, ids[None])[0]
    for t in range(1, T):
        trocado = ids.copy()
        trocado[t] = (trocado[t] + 1) % V
        novo = forward(params, trocado[None])[0]
        if not np.allclose(novo[:t + 1], original[:t + 1], atol=1e-10):
            return False
    return True


if __name__ == "__main__":
    from pesos import carregar_pesos
    from tokenizador import codificar, decodificar

    config, base, merges, params = carregar_pesos()
    comeco = codificar("a padeira ", base, merges)
    print(repr(decodificar(gerar(params, comeco, 12, 0.8, 10, 0), base, merges)))
    print(teste_de_causalidade(params, forward))
```

## Passo 7 · Exercício · Relatório

Um modelo sem relatório é um número solto. Escreva `gerar_relatorio(resultados)`, que recebe um dicionário com as medidas do projeto e devolve o texto abaixo, linha por linha, sem quebra de linha no fim. O exemplo usa os números medidos com os pesos pré-treinados.

```text
RELATÓRIO DO MODELO
Parâmetros: 17568
Treino: 600 passos em 4.1 s
Perplexidade de validação: 1.82
Perplexidade do bigrama: 4.33
Razão modelo/bigrama: 0.42
Critério (razão abaixo de 0.60): aprovado
Amostras:
1. a padeira divide o azeite na feira. / a padeira guarda
2. a padeira divide o barco no celeiro. / o queiro conserta o pão na feira
3. a padeira divide o queijo na ponte. / o pastor guarda o barco na praça.
Viés observado: "a padeira" abre 13.5 % das frases do treino e 97.5 % das amostras
Limitações:
- O modelo continua textos plausíveis; ele não confere fatos.
- O contexto tem 16 tokens; o que ficou antes disso não é visto.
- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia.
```

As chaves de `resultados` são `"parametros"`, `"passos"`, `"tempo_s"`, `"perplexidade_val"`, `"perplexidade_bigrama"`, `"contexto"`, `"amostras"` (lista de 3 textos) e `"vies"` (dicionário com `"trecho"`, `"treino"` e `"amostras"`, as duas últimas em fração). As regras:

- o tempo sai com 1 casa decimal; as perplexidades e a razão, com 2; as porcentagens do viés, com 1;
- a razão é a perplexidade de validação dividida pela do bigrama. O critério é `aprovado` quando a razão, **sem arredondar**, é menor que 0,6, e `reprovado` caso contrário;
- em cada amostra, os espaços e as quebras de linha das pontas saem, e cada quebra de linha interna vira ` / `;
- as três linhas de limitações são fixas, a não ser pelo tamanho do contexto;
- se faltar qualquer chave, ou se as amostras não forem exatamente 3, a função levanta `ValueError`. Um relatório sem a perplexidade de validação não é emitido.

O viés do exemplo foi medido em 40 amostras geradas a partir do token de fim de frase, com temperatura 1: 39 começaram por "a padeira", que abre 203 das 1 500 frases do treino. O dicionário recebido não é alterado.

### Instruções

1. Valide primeiro: todas as chaves presentes e exatamente 3 amostras, senão `ValueError`.
2. Monte as linhas de parâmetros, treino, perplexidades, razão e critério, com as casas decimais pedidas.
3. Acrescente as amostras numeradas, a linha do viés e as três limitações, e junte tudo com quebras de linha.

### Código inicial

```python
def gerar_relatorio(resultados):
    # devolve o texto do relatório, no formato do enunciado
    pass


if __name__ == "__main__":
    resultados = {
        "parametros": 17568,
        "passos": 600,
        "tempo_s": 4.11,
        "perplexidade_val": 1.8204,
        "perplexidade_bigrama": 4.3342,
        "contexto": 16,
        "amostras": [
            "a padeira divide o azeite na feira.\na padeira guarda",
            "a padeira divide o barco no celeiro.\no queiro conserta o pão na feira",
            "a padeira divide o queijo na ponte.\no pastor guarda o barco na praça.\n",
        ],
        "vies": {"trecho": "a padeira", "treino": 0.135, "amostras": 0.975},
    }
    print(gerar_relatorio(resultados))
```

### Solução

```python
OBRIGATORIAS = ("parametros", "passos", "tempo_s", "perplexidade_val", "perplexidade_bigrama", "contexto", "amostras", "vies")


def gerar_relatorio(resultados):
    for chave in OBRIGATORIAS:
        if chave not in resultados:
            raise ValueError(f"relatório sem a chave {chave}")
    amostras = resultados["amostras"]
    if len(amostras) != 3:
        raise ValueError("o relatório leva exatamente 3 amostras")
    razao = resultados["perplexidade_val"] / resultados["perplexidade_bigrama"]
    vies = resultados["vies"]
    linhas = [
        "RELATÓRIO DO MODELO",
        f"Parâmetros: {resultados['parametros']}",
        f"Treino: {resultados['passos']} passos em {resultados['tempo_s']:.1f} s",
        f"Perplexidade de validação: {resultados['perplexidade_val']:.2f}",
        f"Perplexidade do bigrama: {resultados['perplexidade_bigrama']:.2f}",
        f"Razão modelo/bigrama: {razao:.2f}",
        f"Critério (razão abaixo de 0.60): {'aprovado' if razao < 0.6 else 'reprovado'}",
        "Amostras:",
    ]
    for i, amostra in enumerate(amostras, start=1):
        linhas.append(f"{i}. " + " / ".join(amostra.strip().split("\n")))
    linhas.append(
        f"Viés observado: \"{vies['trecho']}\" abre {100 * vies['treino']:.1f} % das frases do treino"
        f" e {100 * vies['amostras']:.1f} % das amostras"
    )
    linhas.append("Limitações:")
    linhas.append("- O modelo continua textos plausíveis; ele não confere fatos.")
    linhas.append(f"- O contexto tem {resultados['contexto']} tokens; o que ficou antes disso não é visto.")
    linhas.append("- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia.")
    return "\n".join(linhas)


if __name__ == "__main__":
    resultados = {
        "parametros": 17568,
        "passos": 600,
        "tempo_s": 4.11,
        "perplexidade_val": 1.8204,
        "perplexidade_bigrama": 4.3342,
        "contexto": 16,
        "amostras": [
            "a padeira divide o azeite na feira.\na padeira guarda",
            "a padeira divide o barco no celeiro.\no queiro conserta o pão na feira",
            "a padeira divide o queijo na ponte.\no pastor guarda o barco na praça.\n",
        ],
        "vies": {"trecho": "a padeira", "treino": 0.135, "amostras": 0.975},
    }
    print(gerar_relatorio(resultados))
```

### Dicas

1. `f"{valor:.2f}"` formata com duas casas; a comparação do critério usa o valor antes da formatação.
2. `amostra.strip().split("\n")` separa as linhas de uma amostra já sem as pontas.
3. `"\n".join(linhas)` não deixa quebra de linha no fim.

### Verificação

```json
[
  {"id": "relatorio-completo", "checkpoint": 3, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n_t = gerar_relatorio(_r)\n_l = _t.split(\"\\n\")\n", "expr": "_t", "expected": "RELATÓRIO DO MODELO\nParâmetros: 17568\nTreino: 600 passos em 4.1 s\nPerplexidade de validação: 1.82\nPerplexidade do bigrama: 4.33\nRazão modelo/bigrama: 0.42\nCritério (razão abaixo de 0.60): aprovado\nAmostras:\n1. a padeira divide o azeite na feira. / a padeira guarda\n2. a padeira divide o barco no celeiro. / o queiro conserta o pão na feira\n3. a padeira divide o queijo na ponte. / o pastor guarda o barco na praça.\nViés observado: \"a padeira\" abre 13.5 % das frases do treino e 97.5 % das amostras\nLimitações:\n- O modelo continua textos plausíveis; ele não confere fatos.\n- O contexto tem 16 tokens; o que ficou antes disso não é visto.\n- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia.", "name": "O relatório do enunciado, inteiro"},
  {"id": "numero-de-linhas", "checkpoint": 3, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n_t = gerar_relatorio(_r)\n_l = _t.split(\"\\n\")\n", "expr": "[len(_l), _l[0], _t.endswith(\"\\n\")]", "expected": [16, "RELATÓRIO DO MODELO", false], "name": "16 linhas, começando pelo título e sem quebra de linha no fim"},
  {"id": "parametros-e-treino", "checkpoint": 2, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n_t = gerar_relatorio(_r)\n_l = _t.split(\"\\n\")\n", "expr": "_l[1:3]", "expected": ["Parâmetros: 17568", "Treino: 600 passos em 4.1 s"], "name": "Linhas de parâmetros e de treino"},
  {"id": "tempo-uma-casa", "checkpoint": 2, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_com(passos=60, tempo_s=4)).split(\"\\n\")[2]", "expected": "Treino: 60 passos em 4.0 s", "name": "Tempo inteiro também sai com uma casa decimal"},
  {"id": "perplexidades", "checkpoint": 2, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n_t = gerar_relatorio(_r)\n_l = _t.split(\"\\n\")\n", "expr": "_l[3:5]", "expected": ["Perplexidade de validação: 1.82", "Perplexidade do bigrama: 4.33"], "name": "A perplexidade de validação e a do bigrama, com 2 casas", "hint": "O relatório sem a perplexidade de validação é o erro que este passo cobra."},
  {"id": "razao-e-criterio", "checkpoint": 2, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n_t = gerar_relatorio(_r)\n_l = _t.split(\"\\n\")\n", "expr": "_l[5:7]", "expected": ["Razão modelo/bigrama: 0.42", "Critério (razão abaixo de 0.60): aprovado"], "name": "Razão 0,42: aprovado"},
  {"id": "criterio-reprovado", "checkpoint": 2, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_com(perplexidade_val=3.0, perplexidade_bigrama=4.0)).split(\"\\n\")[5:7]", "expected": ["Razão modelo/bigrama: 0.75", "Critério (razão abaixo de 0.60): reprovado"], "name": "Razão 0,75: reprovado"},
  {"id": "criterio-no-limite", "checkpoint": 2, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_com(perplexidade_val=3.0, perplexidade_bigrama=5.0)).split(\"\\n\")[5:7]", "expected": ["Razão modelo/bigrama: 0.60", "Critério (razão abaixo de 0.60): reprovado"], "name": "Razão exatamente 0,6: reprovado", "hint": "O critério é \"menor que\", não \"menor ou igual\"."},
  {"id": "criterio-sem-arredondar", "checkpoint": 2, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_com(perplexidade_val=2.985, perplexidade_bigrama=5.0)).split(\"\\n\")[5:7]", "expected": ["Razão modelo/bigrama: 0.60", "Critério (razão abaixo de 0.60): aprovado"], "name": "Razão 0,597 aparece como 0.60 e é aprovada", "hint": "Compare a razão antes de arredondar."},
  {"id": "amostras", "checkpoint": 3, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n_t = gerar_relatorio(_r)\n_l = _t.split(\"\\n\")\n", "expr": "_l[7:11]", "expected": ["Amostras:", "1. a padeira divide o azeite na feira. / a padeira guarda", "2. a padeira divide o barco no celeiro. / o queiro conserta o pão na feira", "3. a padeira divide o queijo na ponte. / o pastor guarda o barco na praça."], "name": "As amostras numeradas, com as quebras de linha trocadas por \" / \""},
  {"id": "amostra-pontas", "checkpoint": 3, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_com(amostras=[\"  o pastor leva o pão.  \\n\\n\", \"\\na\\nb\\nc\", \"x\"])).split(\"\\n\")[8:11]", "expected": ["1. o pastor leva o pão.", "2. a / b / c", "3. x"], "name": "Espaços e quebras das pontas saem; as internas viram \" / \""},
  {"id": "vies", "checkpoint": 3, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n_t = gerar_relatorio(_r)\n_l = _t.split(\"\\n\")\n", "expr": "_l[11]", "expected": "Viés observado: \"a padeira\" abre 13.5 % das frases do treino e 97.5 % das amostras", "name": "A linha do viés observado, com as porcentagens"},
  {"id": "vies-porcentagens", "checkpoint": 3, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_com(vies={\"trecho\": \"o pastor\", \"treino\": 0.5, \"amostras\": 1 / 3})).split(\"\\n\")[11]", "expected": "Viés observado: \"o pastor\" abre 50.0 % das frases do treino e 33.3 % das amostras", "name": "Frações 0,5 e 1/3 viram 50.0 % e 33.3 %"},
  {"id": "limitacoes", "checkpoint": 3, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n_t = gerar_relatorio(_r)\n_l = _t.split(\"\\n\")\n", "expr": "_l[12:]", "expected": ["Limitações:", "- O modelo continua textos plausíveis; ele não confere fatos.", "- O contexto tem 16 tokens; o que ficou antes disso não é visto.", "- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia."], "name": "O título e as três limitações fecham o relatório"},
  {"id": "contexto-outro", "checkpoint": 3, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_com(contexto=32)).split(\"\\n\")[14]", "expected": "- O contexto tem 32 tokens; o que ficou antes disso não é visto.", "name": "O tamanho do contexto vem de resultados"},
  {"id": "sem-perplexidade-val", "checkpoint": 1, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_sem(\"perplexidade_val\"))", "raises": "ValueError", "name": "Sem a perplexidade de validação: ValueError", "hint": "Confira as chaves antes de montar o texto; um KeyError não é a resposta pedida."},
  {"id": "sem-vies", "checkpoint": 1, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_sem(\"vies\"))", "raises": "ValueError", "name": "Sem o viés observado: ValueError"},
  {"id": "sem-contexto", "checkpoint": 1, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_sem(\"contexto\"))", "raises": "ValueError", "name": "Sem o tamanho do contexto: ValueError"},
  {"id": "duas-amostras", "checkpoint": 1, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_com(amostras=[\"a\", \"b\"]))", "raises": "ValueError", "name": "Duas amostras: ValueError"},
  {"id": "quatro-amostras", "checkpoint": 1, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n", "expr": "gerar_relatorio(_com(amostras=[\"a\", \"b\", \"c\", \"d\"]))", "raises": "ValueError", "name": "Quatro amostras: ValueError"},
  {"id": "entrada-intacta", "checkpoint": 3, "kind": "expr", "setup": "import copy\n_r = {\"parametros\": 17568, \"passos\": 600, \"tempo_s\": 4.11, \"perplexidade_val\": 1.8204, \"perplexidade_bigrama\": 4.3342, \"contexto\": 16, \"amostras\": [\"a padeira divide o azeite na feira.\\na padeira guarda\", \"a padeira divide o barco no celeiro.\\no queiro conserta o pão na feira\", \"a padeira divide o queijo na ponte.\\no pastor guarda o barco na praça.\\n\"], \"vies\": {\"trecho\": \"a padeira\", \"treino\": 0.135, \"amostras\": 0.975}}\n_r0 = copy.deepcopy(_r)\ndef _com(**troca):\n    novo = copy.deepcopy(_r0)\n    novo.update(troca)\n    return novo\ndef _sem(chave):\n    novo = copy.deepcopy(_r0)\n    del novo[chave]\n    return novo\n_t = gerar_relatorio(_r)\n_l = _t.split(\"\\n\")\n", "expr": "_r == _r0", "expected": true, "name": "O dicionário recebido continua como estava"}
]
```

### Soluções erradas

```python name="relatório sem a perplexidade de validação"
OBRIGATORIAS = ("parametros", "passos", "tempo_s", "perplexidade_val", "perplexidade_bigrama", "contexto", "amostras", "vies")


def gerar_relatorio(resultados):
    for chave in OBRIGATORIAS:
        if chave not in resultados:
            raise ValueError(f"relatório sem a chave {chave}")
    amostras = resultados["amostras"]
    if len(amostras) != 3:
        raise ValueError("o relatório leva exatamente 3 amostras")
    razao = resultados["perplexidade_val"] / resultados["perplexidade_bigrama"]
    vies = resultados["vies"]
    linhas = [
        "RELATÓRIO DO MODELO",
        f"Parâmetros: {resultados['parametros']}",
        f"Treino: {resultados['passos']} passos em {resultados['tempo_s']:.1f} s",
        f"Perplexidade do bigrama: {resultados['perplexidade_bigrama']:.2f}",
        f"Razão modelo/bigrama: {razao:.2f}",
        f"Critério (razão abaixo de 0.60): {'aprovado' if razao < 0.6 else 'reprovado'}",
        "Amostras:",
    ]
    for i, amostra in enumerate(amostras, start=1):
        linhas.append(f"{i}. " + " / ".join(amostra.strip().split("\n")))
    linhas.append(
        f"Viés observado: \"{vies['trecho']}\" abre {100 * vies['treino']:.1f} % das frases do treino"
        f" e {100 * vies['amostras']:.1f} % das amostras"
    )
    linhas.append("Limitações:")
    linhas.append("- O modelo continua textos plausíveis; ele não confere fatos.")
    linhas.append(f"- O contexto tem {resultados['contexto']} tokens; o que ficou antes disso não é visto.")
    linhas.append("- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia.")
    return "\n".join(linhas)


if __name__ == "__main__":
    resultados = {
        "parametros": 17568,
        "passos": 600,
        "tempo_s": 4.11,
        "perplexidade_val": 1.8204,
        "perplexidade_bigrama": 4.3342,
        "contexto": 16,
        "amostras": [
            "a padeira divide o azeite na feira.\na padeira guarda",
            "a padeira divide o barco no celeiro.\no queiro conserta o pão na feira",
            "a padeira divide o queijo na ponte.\no pastor guarda o barco na praça.\n",
        ],
        "vies": {"trecho": "a padeira", "treino": 0.135, "amostras": 0.975},
    }
    print(gerar_relatorio(resultados))
```

```python name="relatório sem as limitações"
OBRIGATORIAS = ("parametros", "passos", "tempo_s", "perplexidade_val", "perplexidade_bigrama", "contexto", "amostras", "vies")


def gerar_relatorio(resultados):
    for chave in OBRIGATORIAS:
        if chave not in resultados:
            raise ValueError(f"relatório sem a chave {chave}")
    amostras = resultados["amostras"]
    if len(amostras) != 3:
        raise ValueError("o relatório leva exatamente 3 amostras")
    razao = resultados["perplexidade_val"] / resultados["perplexidade_bigrama"]
    vies = resultados["vies"]
    linhas = [
        "RELATÓRIO DO MODELO",
        f"Parâmetros: {resultados['parametros']}",
        f"Treino: {resultados['passos']} passos em {resultados['tempo_s']:.1f} s",
        f"Perplexidade de validação: {resultados['perplexidade_val']:.2f}",
        f"Perplexidade do bigrama: {resultados['perplexidade_bigrama']:.2f}",
        f"Razão modelo/bigrama: {razao:.2f}",
        f"Critério (razão abaixo de 0.60): {'aprovado' if razao < 0.6 else 'reprovado'}",
        "Amostras:",
    ]
    for i, amostra in enumerate(amostras, start=1):
        linhas.append(f"{i}. " + " / ".join(amostra.strip().split("\n")))
    linhas.append(
        f"Viés observado: \"{vies['trecho']}\" abre {100 * vies['treino']:.1f} % das frases do treino"
        f" e {100 * vies['amostras']:.1f} % das amostras"
    )
    return "\n".join(linhas)


if __name__ == "__main__":
    resultados = {
        "parametros": 17568,
        "passos": 600,
        "tempo_s": 4.11,
        "perplexidade_val": 1.8204,
        "perplexidade_bigrama": 4.3342,
        "contexto": 16,
        "amostras": [
            "a padeira divide o azeite na feira.\na padeira guarda",
            "a padeira divide o barco no celeiro.\no queiro conserta o pão na feira",
            "a padeira divide o queijo na ponte.\no pastor guarda o barco na praça.\n",
        ],
        "vies": {"trecho": "a padeira", "treino": 0.135, "amostras": 0.975},
    }
    print(gerar_relatorio(resultados))
```

```python name="critério com a razão arredondada"
OBRIGATORIAS = ("parametros", "passos", "tempo_s", "perplexidade_val", "perplexidade_bigrama", "contexto", "amostras", "vies")


def gerar_relatorio(resultados):
    for chave in OBRIGATORIAS:
        if chave not in resultados:
            raise ValueError(f"relatório sem a chave {chave}")
    amostras = resultados["amostras"]
    if len(amostras) != 3:
        raise ValueError("o relatório leva exatamente 3 amostras")
    razao = resultados["perplexidade_val"] / resultados["perplexidade_bigrama"]
    vies = resultados["vies"]
    linhas = [
        "RELATÓRIO DO MODELO",
        f"Parâmetros: {resultados['parametros']}",
        f"Treino: {resultados['passos']} passos em {resultados['tempo_s']:.1f} s",
        f"Perplexidade de validação: {resultados['perplexidade_val']:.2f}",
        f"Perplexidade do bigrama: {resultados['perplexidade_bigrama']:.2f}",
        f"Razão modelo/bigrama: {razao:.2f}",
        f"Critério (razão abaixo de 0.60): {'aprovado' if round(razao, 2) < 0.6 else 'reprovado'}",
        "Amostras:",
    ]
    for i, amostra in enumerate(amostras, start=1):
        linhas.append(f"{i}. " + " / ".join(amostra.strip().split("\n")))
    linhas.append(
        f"Viés observado: \"{vies['trecho']}\" abre {100 * vies['treino']:.1f} % das frases do treino"
        f" e {100 * vies['amostras']:.1f} % das amostras"
    )
    linhas.append("Limitações:")
    linhas.append("- O modelo continua textos plausíveis; ele não confere fatos.")
    linhas.append(f"- O contexto tem {resultados['contexto']} tokens; o que ficou antes disso não é visto.")
    linhas.append("- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia.")
    return "\n".join(linhas)


if __name__ == "__main__":
    resultados = {
        "parametros": 17568,
        "passos": 600,
        "tempo_s": 4.11,
        "perplexidade_val": 1.8204,
        "perplexidade_bigrama": 4.3342,
        "contexto": 16,
        "amostras": [
            "a padeira divide o azeite na feira.\na padeira guarda",
            "a padeira divide o barco no celeiro.\no queiro conserta o pão na feira",
            "a padeira divide o queijo na ponte.\no pastor guarda o barco na praça.\n",
        ],
        "vies": {"trecho": "a padeira", "treino": 0.135, "amostras": 0.975},
    }
    print(gerar_relatorio(resultados))
```

```python name="critério com menor ou igual"
OBRIGATORIAS = ("parametros", "passos", "tempo_s", "perplexidade_val", "perplexidade_bigrama", "contexto", "amostras", "vies")


def gerar_relatorio(resultados):
    for chave in OBRIGATORIAS:
        if chave not in resultados:
            raise ValueError(f"relatório sem a chave {chave}")
    amostras = resultados["amostras"]
    if len(amostras) != 3:
        raise ValueError("o relatório leva exatamente 3 amostras")
    razao = resultados["perplexidade_val"] / resultados["perplexidade_bigrama"]
    vies = resultados["vies"]
    linhas = [
        "RELATÓRIO DO MODELO",
        f"Parâmetros: {resultados['parametros']}",
        f"Treino: {resultados['passos']} passos em {resultados['tempo_s']:.1f} s",
        f"Perplexidade de validação: {resultados['perplexidade_val']:.2f}",
        f"Perplexidade do bigrama: {resultados['perplexidade_bigrama']:.2f}",
        f"Razão modelo/bigrama: {razao:.2f}",
        f"Critério (razão abaixo de 0.60): {'aprovado' if razao <= 0.6 else 'reprovado'}",
        "Amostras:",
    ]
    for i, amostra in enumerate(amostras, start=1):
        linhas.append(f"{i}. " + " / ".join(amostra.strip().split("\n")))
    linhas.append(
        f"Viés observado: \"{vies['trecho']}\" abre {100 * vies['treino']:.1f} % das frases do treino"
        f" e {100 * vies['amostras']:.1f} % das amostras"
    )
    linhas.append("Limitações:")
    linhas.append("- O modelo continua textos plausíveis; ele não confere fatos.")
    linhas.append(f"- O contexto tem {resultados['contexto']} tokens; o que ficou antes disso não é visto.")
    linhas.append("- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia.")
    return "\n".join(linhas)


if __name__ == "__main__":
    resultados = {
        "parametros": 17568,
        "passos": 600,
        "tempo_s": 4.11,
        "perplexidade_val": 1.8204,
        "perplexidade_bigrama": 4.3342,
        "contexto": 16,
        "amostras": [
            "a padeira divide o azeite na feira.\na padeira guarda",
            "a padeira divide o barco no celeiro.\no queiro conserta o pão na feira",
            "a padeira divide o queijo na ponte.\no pastor guarda o barco na praça.\n",
        ],
        "vies": {"trecho": "a padeira", "treino": 0.135, "amostras": 0.975},
    }
    print(gerar_relatorio(resultados))
```

```python name="chave ausente vira KeyError"
OBRIGATORIAS = ("parametros", "passos", "tempo_s", "perplexidade_val", "perplexidade_bigrama", "contexto", "amostras", "vies")


def gerar_relatorio(resultados):
    amostras = resultados["amostras"]
    if len(amostras) != 3:
        raise ValueError("o relatório leva exatamente 3 amostras")
    razao = resultados["perplexidade_val"] / resultados["perplexidade_bigrama"]
    vies = resultados["vies"]
    linhas = [
        "RELATÓRIO DO MODELO",
        f"Parâmetros: {resultados['parametros']}",
        f"Treino: {resultados['passos']} passos em {resultados['tempo_s']:.1f} s",
        f"Perplexidade de validação: {resultados['perplexidade_val']:.2f}",
        f"Perplexidade do bigrama: {resultados['perplexidade_bigrama']:.2f}",
        f"Razão modelo/bigrama: {razao:.2f}",
        f"Critério (razão abaixo de 0.60): {'aprovado' if razao < 0.6 else 'reprovado'}",
        "Amostras:",
    ]
    for i, amostra in enumerate(amostras, start=1):
        linhas.append(f"{i}. " + " / ".join(amostra.strip().split("\n")))
    linhas.append(
        f"Viés observado: \"{vies['trecho']}\" abre {100 * vies['treino']:.1f} % das frases do treino"
        f" e {100 * vies['amostras']:.1f} % das amostras"
    )
    linhas.append("Limitações:")
    linhas.append("- O modelo continua textos plausíveis; ele não confere fatos.")
    linhas.append(f"- O contexto tem {resultados['contexto']} tokens; o que ficou antes disso não é visto.")
    linhas.append("- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia.")
    return "\n".join(linhas)


if __name__ == "__main__":
    resultados = {
        "parametros": 17568,
        "passos": 600,
        "tempo_s": 4.11,
        "perplexidade_val": 1.8204,
        "perplexidade_bigrama": 4.3342,
        "contexto": 16,
        "amostras": [
            "a padeira divide o azeite na feira.\na padeira guarda",
            "a padeira divide o barco no celeiro.\no queiro conserta o pão na feira",
            "a padeira divide o queijo na ponte.\no pastor guarda o barco na praça.\n",
        ],
        "vies": {"trecho": "a padeira", "treino": 0.135, "amostras": 0.975},
    }
    print(gerar_relatorio(resultados))
```

```python name="aceita qualquer número de amostras"
OBRIGATORIAS = ("parametros", "passos", "tempo_s", "perplexidade_val", "perplexidade_bigrama", "contexto", "amostras", "vies")


def gerar_relatorio(resultados):
    for chave in OBRIGATORIAS:
        if chave not in resultados:
            raise ValueError(f"relatório sem a chave {chave}")
    amostras = resultados["amostras"]
    razao = resultados["perplexidade_val"] / resultados["perplexidade_bigrama"]
    vies = resultados["vies"]
    linhas = [
        "RELATÓRIO DO MODELO",
        f"Parâmetros: {resultados['parametros']}",
        f"Treino: {resultados['passos']} passos em {resultados['tempo_s']:.1f} s",
        f"Perplexidade de validação: {resultados['perplexidade_val']:.2f}",
        f"Perplexidade do bigrama: {resultados['perplexidade_bigrama']:.2f}",
        f"Razão modelo/bigrama: {razao:.2f}",
        f"Critério (razão abaixo de 0.60): {'aprovado' if razao < 0.6 else 'reprovado'}",
        "Amostras:",
    ]
    for i, amostra in enumerate(amostras, start=1):
        linhas.append(f"{i}. " + " / ".join(amostra.strip().split("\n")))
    linhas.append(
        f"Viés observado: \"{vies['trecho']}\" abre {100 * vies['treino']:.1f} % das frases do treino"
        f" e {100 * vies['amostras']:.1f} % das amostras"
    )
    linhas.append("Limitações:")
    linhas.append("- O modelo continua textos plausíveis; ele não confere fatos.")
    linhas.append(f"- O contexto tem {resultados['contexto']} tokens; o que ficou antes disso não é visto.")
    linhas.append("- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia.")
    return "\n".join(linhas)


if __name__ == "__main__":
    resultados = {
        "parametros": 17568,
        "passos": 600,
        "tempo_s": 4.11,
        "perplexidade_val": 1.8204,
        "perplexidade_bigrama": 4.3342,
        "contexto": 16,
        "amostras": [
            "a padeira divide o azeite na feira.\na padeira guarda",
            "a padeira divide o barco no celeiro.\no queiro conserta o pão na feira",
            "a padeira divide o queijo na ponte.\no pastor guarda o barco na praça.\n",
        ],
        "vies": {"trecho": "a padeira", "treino": 0.135, "amostras": 0.975},
    }
    print(gerar_relatorio(resultados))
```

```python name="quebras de linha das amostras mantidas"
OBRIGATORIAS = ("parametros", "passos", "tempo_s", "perplexidade_val", "perplexidade_bigrama", "contexto", "amostras", "vies")


def gerar_relatorio(resultados):
    for chave in OBRIGATORIAS:
        if chave not in resultados:
            raise ValueError(f"relatório sem a chave {chave}")
    amostras = resultados["amostras"]
    if len(amostras) != 3:
        raise ValueError("o relatório leva exatamente 3 amostras")
    razao = resultados["perplexidade_val"] / resultados["perplexidade_bigrama"]
    vies = resultados["vies"]
    linhas = [
        "RELATÓRIO DO MODELO",
        f"Parâmetros: {resultados['parametros']}",
        f"Treino: {resultados['passos']} passos em {resultados['tempo_s']:.1f} s",
        f"Perplexidade de validação: {resultados['perplexidade_val']:.2f}",
        f"Perplexidade do bigrama: {resultados['perplexidade_bigrama']:.2f}",
        f"Razão modelo/bigrama: {razao:.2f}",
        f"Critério (razão abaixo de 0.60): {'aprovado' if razao < 0.6 else 'reprovado'}",
        "Amostras:",
    ]
    for i, amostra in enumerate(amostras, start=1):
        linhas.append(f"{i}. " + amostra)
    linhas.append(
        f"Viés observado: \"{vies['trecho']}\" abre {100 * vies['treino']:.1f} % das frases do treino"
        f" e {100 * vies['amostras']:.1f} % das amostras"
    )
    linhas.append("Limitações:")
    linhas.append("- O modelo continua textos plausíveis; ele não confere fatos.")
    linhas.append(f"- O contexto tem {resultados['contexto']} tokens; o que ficou antes disso não é visto.")
    linhas.append("- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia.")
    return "\n".join(linhas)


if __name__ == "__main__":
    resultados = {
        "parametros": 17568,
        "passos": 600,
        "tempo_s": 4.11,
        "perplexidade_val": 1.8204,
        "perplexidade_bigrama": 4.3342,
        "contexto": 16,
        "amostras": [
            "a padeira divide o azeite na feira.\na padeira guarda",
            "a padeira divide o barco no celeiro.\no queiro conserta o pão na feira",
            "a padeira divide o queijo na ponte.\no pastor guarda o barco na praça.\n",
        ],
        "vies": {"trecho": "a padeira", "treino": 0.135, "amostras": 0.975},
    }
    print(gerar_relatorio(resultados))
```

```python name="viés em fração, sem multiplicar por 100"
OBRIGATORIAS = ("parametros", "passos", "tempo_s", "perplexidade_val", "perplexidade_bigrama", "contexto", "amostras", "vies")


def gerar_relatorio(resultados):
    for chave in OBRIGATORIAS:
        if chave not in resultados:
            raise ValueError(f"relatório sem a chave {chave}")
    amostras = resultados["amostras"]
    if len(amostras) != 3:
        raise ValueError("o relatório leva exatamente 3 amostras")
    razao = resultados["perplexidade_val"] / resultados["perplexidade_bigrama"]
    vies = resultados["vies"]
    linhas = [
        "RELATÓRIO DO MODELO",
        f"Parâmetros: {resultados['parametros']}",
        f"Treino: {resultados['passos']} passos em {resultados['tempo_s']:.1f} s",
        f"Perplexidade de validação: {resultados['perplexidade_val']:.2f}",
        f"Perplexidade do bigrama: {resultados['perplexidade_bigrama']:.2f}",
        f"Razão modelo/bigrama: {razao:.2f}",
        f"Critério (razão abaixo de 0.60): {'aprovado' if razao < 0.6 else 'reprovado'}",
        "Amostras:",
    ]
    for i, amostra in enumerate(amostras, start=1):
        linhas.append(f"{i}. " + " / ".join(amostra.strip().split("\n")))
    linhas.append(
        f"Viés observado: \"{vies['trecho']}\" abre {vies['treino']:.1f} % das frases do treino"
        f" e {vies['amostras']:.1f} % das amostras"
    )
    linhas.append("Limitações:")
    linhas.append("- O modelo continua textos plausíveis; ele não confere fatos.")
    linhas.append(f"- O contexto tem {resultados['contexto']} tokens; o que ficou antes disso não é visto.")
    linhas.append("- As proporções do corpus se repetem nas amostras, e a temperatura baixa as amplia.")
    return "\n".join(linhas)


if __name__ == "__main__":
    resultados = {
        "parametros": 17568,
        "passos": 600,
        "tempo_s": 4.11,
        "perplexidade_val": 1.8204,
        "perplexidade_bigrama": 4.3342,
        "contexto": 16,
        "amostras": [
            "a padeira divide o azeite na feira.\na padeira guarda",
            "a padeira divide o barco no celeiro.\no queiro conserta o pão na feira",
            "a padeira divide o queijo na ponte.\no pastor guarda o barco na praça.\n",
        ],
        "vies": {"trecho": "a padeira", "treino": 0.135, "amostras": 0.975},
    }
    print(gerar_relatorio(resultados))
```

## Passo 8 · Quiz · Autoavaliação do projeto

### Pergunta

Duas versões do projeto diferem numa linha do preparo dos dados:

```python
base, merges = treinar_bpe(texto_treino, 40)                 # versão A
base, merges = treinar_bpe(texto_treino + texto_val, 40)     # versão B
```

As duas treinam e geram texto sem erro. Qual versão vai para o relatório?

- [ ] A versão B, porque com mais texto as mesclagens representam melhor a língua.
- [ ] Qualquer uma: o tokenizador não tem pesos treinados por gradiente, então não há vazamento.
- [x] A versão A: na B, as mesclagens foram escolhidas olhando a validação, e o número deixa de medir texto novo.
- [ ] A versão B, desde que o modelo seja treinado só com `ids_treino`.

> As mesclagens são aprendidas dos dados, como os pesos: escolhê-las com a validação é vazamento, e a perplexidade medida deixa de valer para um texto que o projeto nunca viu. Mais texto ajudaria se viesse de outra fonte, e não da validação. Não ter gradiente não impede o vazamento, porque a contagem de pares também é ajuste aos dados. Treinar o modelo só com `ids_treino` não desfaz a escolha das mesclagens.

### Pergunta

Num treino do projeto, a perda cai de 4,23 para 0,005 em 100 passos. A geração com temperatura 0 a partir de "a padeira " devolve "a padeira eira eira eira eira", e a perplexidade de validação passa de 100 000. Qual linha explica os três sintomas?

- [x] `Y = np.stack([ids[i:i + T] for i in inicios])` em `gerar_lote`
- [ ] `return float(10 ** perda)` em `perplexidade`
- [ ] `inicios = rng.integers(0, len(ids) - T + 1, B)` em `gerar_lote`
- [ ] `otimizador.passo(params, grads)` sem o corte dos gradientes em `treinar`

> Com o alvo igual à entrada, o modelo aprende a copiar o token atual: a perda de treino vai a quase zero, a geração repete o último token e a validação, que cobra o próximo token, é péssima. A potência de base 10 muda a perplexidade reportada, mas não a perda de treino nem as amostras. O começo sorteado um a mais dá erro de forma quando cai no fim do texto, e não esses números. A falta do corte deixa o treino mais instável, sem fazer o modelo copiar a entrada.

### Pergunta

Duas pessoas avaliam os mesmos pesos na mesma validação. A perda média é 0,599 nas duas contas. Uma reporta perplexidade 1,82 e a outra, 3,97. De onde vem a diferença?

- [ ] A segunda usou janelas com sobreposição, que contam os mesmos tokens várias vezes.
- [x] A segunda calculou `10 ** perda`, mas a perda está em logaritmo natural: o correto é `np.exp(perda)`.
- [ ] A primeira esqueceu de multiplicar a perda pelo número de tokens antes da exponencial.
- [ ] As duas estão certas: a perplexidade depende da semente da amostragem.

> $e^{0{,}599} = 1{,}82$ e $10^{0{,}599} = 3{,}97$: a perda vem de `np.log`, então a base da potência é $e$. A sobreposição mudaria a perda média, que aqui é a mesma nas duas contas. Multiplicar pelo número de tokens daria a exponencial da soma, um número enorme, e não 1,82. A perplexidade não envolve sorteio: é uma média sobre a validação inteira.
