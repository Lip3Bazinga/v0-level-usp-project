---
slug: n6-m6-02-modelo-de-bigramas
titulo: Modelo de linguagem por bigramas (makemore)
descricao: Contar pares de caracteres, suavização, amostrar nomes novos, avaliar com log-verossimilhança negativa, e depois o mesmo modelo como uma rede de uma camada treinada por gradiente.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 130
tempo_min: 55
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Construir o modelo de bigramas por contagem, com suavização, e amostrar sequências
- Avaliar modelos de linguagem com NLL média e perplexidade
- Treinar o bigrama como rede neural (one-hot → logits → softmax) e mostrar que converge para as contagens
---

## Passo 1 · Leitura · Contar pares

O modelo de linguagem mais simples que existe olha um caractere e chuta o próximo. Ele se chama modelo de **bigramas** (pares de tokens vizinhos), e treiná-lo é contar: quantas vezes cada caractere `b` veio logo depois de cada caractere `a` nos dados de treino.

As contagens moram numa matriz $C$ de forma $(V, V)$: a linha é o caractere atual, a coluna é o próximo. Cada nome ganha um `.` no começo e outro no fim antes da contagem, e por isso duas partes da matriz têm significado próprio: a linha 0 conta **com que letra os nomes começam**, e a coluna 0 conta **depois de que letra eles terminam**.

```python
nome = "ana"
texto = "." + nome + "."
print(list(zip(texto, texto[1:])))
# [('.', 'a'), ('a', 'n'), ('n', 'a'), ('a', '.')]
```

Um nome de $k$ letras rende $k + 1$ pares. Sem o `.` final, o modelo nunca aprenderia a parar, e sem o inicial, não saberia por onde começar.

Dividir cada linha pela soma dela transforma contagens em probabilidades condicionais:

$$P(b \mid a) = \frac{C_{ab}}{\sum_{c} C_{ac}}$$

Cada linha de $P$ é uma distribuição sobre o próximo caractere e soma 1. As colunas não somam 1, e normalizar por elas responderia outra pergunta (qual caractere veio antes).

Nos 800 nomes de treino do `nomes.txt` há 5 145 pares. Depois do `.`, a letra mais comum é `m`, com $P(\text{m} \mid \text{.}) = 0{,}098$; depois de `m`, vem `a` com probabilidade $0{,}299$; e depois de `a`, o nome acaba com probabilidade $0{,}28$. Das $21 \times 21 = 441$ células, 262 ficam zeradas: como o gerador monta sílabas de consoante e vogal, pares como `br` nunca aparecem.

Para somar 1 em muitas células de uma vez, o caminho é `np.add.at(C, (linhas, colunas), 1)`, a mesma função do backward do embedding: num nome como `banana`, o par `an` aparece duas vezes, e `C[linhas, colunas] += 1` contaria uma só.

O modelo é fraco de propósito. Ele esquece tudo o que veio antes do último caractere, e as próximas lições aumentam essa memória passo a passo: um contexto fixo de alguns caracteres, depois um estado que atravessa a sequência inteira.

## Passo 2 · Previsão · Os bigramas de dois nomes

O código conta os pares de `ana` e `ada` num dicionário e imprime em ordem. Lembre que o `.` vem antes das letras na ordenação. Escreva a saída antes de rodar.

### Código

```python
nomes = ["ana", "ada"]
contagens = {}
for nome in nomes:
    texto = "." + nome + "."
    for a, b in zip(texto, texto[1:]):
        contagens[(a, b)] = contagens.get((a, b), 0) + 1

for a, b in sorted(contagens):
    print(a + b, contagens[(a, b)])
print(sum(contagens.values()))
```

### Dicas

1. Cada nome de 3 letras rende 4 pares.
2. Os dois nomes começam e terminam com a mesma letra.
3. A última linha soma todas as contagens.

### Saída esperada

```text
.a 2
a. 2
ad 1
an 1
da 1
na 1
8
```

## Passo 3 · Exercício · contar_bigramas(nomes, stoi)

modo: lacunas

Complete a função que monta a matriz de contagens. Linha: caractere atual; coluna: próximo caractere.

### Instruções

1. Complete a lista `ids` com os índices do nome cercado pelo `.` no começo e no fim.
2. Complete a chamada de `np.add.at` com as linhas (caractere atual) e as colunas (próximo caractere) de todos os pares do nome.

### Código inicial

```python
import numpy as np


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in ___]
        np.add.at(C, (___, ___), 1)
    return C
```

### Solução

```python
import numpy as np


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        np.add.at(C, (ids[:-1], ids[1:]), 1)
    return C
```

### Dicas

1. O texto percorrido tem dois caracteres a mais que o nome.
2. Os caracteres atuais são todos menos o último; os próximos são todos menos o primeiro.
3. As duas fatias precisam ter o mesmo tamanho: um par para cada posição.

### Verificação

```json
[
  {"id": "ana-ada", "checkpoint": 2, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.adn')}", "expr": "contar_bigramas(['ana', 'ada'], _stoi).tolist()", "expected": [[0, 2, 0, 0], [2, 0, 1, 1], [0, 1, 0, 0], [0, 1, 0, 0]], "name": "Contagens de ['ana', 'ada'] com o vocabulário '.adn'", "hint": "São os 8 pares do passo anterior, com a linha do caractere atual e a coluna do próximo."},
  {"id": "forma", "checkpoint": 2, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abcde')}", "expr": "list(contar_bigramas(['abc'], _stoi).shape)", "expected": [6, 6], "name": "A matriz tem forma (V, V), mesmo com caracteres que não aparecem"},
  {"id": "total-de-pares", "checkpoint": 1, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abil')}", "expr": "int(contar_bigramas(['bia', 'lia', 'abil', 'a'], _stoi).sum())", "expected": 15, "name": "Um nome de k letras rende k + 1 pares", "hint": "Cada nome recebe um '.' no começo e outro no fim."},
  {"id": "linha-do-ponto", "checkpoint": 1, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abil')}", "expr": "contar_bigramas(['bia', 'lia', 'abil', 'bal'], _stoi)[0].tolist()", "expected": [0, 1, 2, 0, 1], "name": "A linha 0 conta as letras que começam os nomes", "hint": "O primeiro par de cada nome é ('.', primeira letra)."},
  {"id": "coluna-do-ponto", "checkpoint": 1, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abil')}", "expr": "contar_bigramas(['bia', 'lia', 'abil', 'bal'], _stoi)[:, 0].tolist()", "expected": [0, 2, 0, 0, 2], "name": "A coluna 0 conta as letras que terminam os nomes", "hint": "O último par de cada nome é (última letra, '.')."},
  {"id": "par-repetido-no-nome", "checkpoint": 2, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.abn')}", "expr": "contar_bigramas(['banana'], _stoi).tolist()", "expected": [[0, 0, 1, 0], [1, 0, 0, 2], [0, 1, 0, 0], [0, 2, 0, 0]], "name": "Em 'banana', os pares 'an' e 'na' contam duas vezes cada"},
  {"id": "direcao", "checkpoint": 2, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.ab')}\n_C = contar_bigramas(['ab'], _stoi)", "expr": "[int(_C[1, 2]), int(_C[2, 1])]", "expected": [1, 0], "name": "Em 'ab', a contagem fica em C[a, b] e não em C[b, a]", "hint": "A linha é o caractere atual e a coluna é o próximo."},
  {"id": "uma-letra", "checkpoint": 1, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.a')}", "expr": "contar_bigramas(['a'], _stoi).tolist()", "expected": [[0, 1], [1, 0]], "name": "Um nome de uma letra rende os pares '.a' e 'a.'"},
  {"id": "sem-nomes", "checkpoint": 2, "kind": "expr", "setup": "_stoi = {c: i for i, c in enumerate('.ab')}", "expr": "contar_bigramas([], _stoi).tolist()", "expected": [[0, 0, 0], [0, 0, 0], [0, 0, 0]], "name": "Lista vazia devolve a matriz de zeros"}
]
```

### Soluções erradas

```python name="sem o ponto final"
import numpy as np


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome]
        np.add.at(C, (ids[:-1], ids[1:]), 1)
    return C
```

```python name="sem o ponto inicial"
import numpy as np


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in nome + "."]
        np.add.at(C, (ids[:-1], ids[1:]), 1)
    return C
```

```python name="nome sem nenhum ponto"
import numpy as np


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in nome]
        np.add.at(C, (ids[:-1], ids[1:]), 1)
    return C
```

```python name="linha e coluna trocadas"
import numpy as np


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        np.add.at(C, (ids[1:], ids[:-1]), 1)
    return C
```

```python name="pares pulando um caractere"
import numpy as np


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        np.add.at(C, (ids[:-2], ids[2:]), 1)
    return C
```

```python name="cada caractere pareado com ele mesmo"
import numpy as np


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        np.add.at(C, (ids[:-1], ids[:-1]), 1)
    return C
```

## Passo 4 · Leitura · Probabilidades, NLL e perplexidade

Um modelo de linguagem é bom quando dá probabilidade alta ao que de fato aconteceu. A medida é a **log-verossimilhança negativa média** (NLL), a mesma entropia cruzada da classificação, calculada sobre todos os $N$ pares de um conjunto de nomes (os `.` das pontas entram na conta):

$$\text{NLL} = -\frac{1}{N} \sum_{i=1}^{N} \ln P(b_i \mid a_i)$$

Um modelo que não sabe nada dá $1/V$ a cada caractere e tem NLL de $\ln V$; com $V = 21$, isso é $3{,}04$. A **perplexidade** é a mesma medida numa escala mais fácil de ler:

$$\text{PP} = e^{\text{NLL}}$$

Ela é o número de opções igualmente prováveis entre as quais o modelo estaria em dúvida: 21 para o modelo que não sabe nada, 1 para um que acerta sempre com certeza.

Medido com o `nomes.txt` (contagens nos 800 primeiros nomes, validação nos 100 seguintes): o bigrama tem NLL de $2{,}1203$ no treino e $2{,}1250$ na validação, perplexidade $8{,}37$. Um modelo que só usa a frequência de cada letra, sem olhar a anterior, fica em $2{,}6849$. Saber o caractere anterior reduz a dúvida de 21 opções para cerca de 8.

O problema aparece num nome que foge do padrão do treino. O par `br` tem contagem zero, então $P(\text{r} \mid \text{b}) = 0$, e `np.log(0)` devolve `-inf` sem aviso:

```python
print(nll_media(P, ["bruma"], stoi))    # inf
```

Um único par impossível torna a NLL infinita, por melhor que o modelo seja no resto. A **suavização** soma uma constante $s$ a todas as contagens antes de normalizar:

$$P(b \mid a) = \frac{C_{ab} + s}{\sum_{c} (C_{ac} + s)}$$

Com $s = 1$, a NLL de `bruma` cai de infinito para $2{,}7768$. Há um preço: a validação sobe de $2{,}1250$ para $2{,}1684$, porque a suavização tira probabilidade de pares comuns para dar aos que nunca ocorrem. Quanto maior o $s$, mais o modelo se aproxima do uniforme.

As linhas de $P$ também servem para **amostrar**: comece no `.`, sorteie o próximo caractere com as probabilidades da linha atual e repita até sair o `.`. Se as probabilidades da linha não somam 1 (matriz normalizada pelas colunas, por exemplo), o sorteio recusa:

```text
ValueError: Probabilities do not sum to 1. See Notes section of docstring for more information.
```

## Passo 5 · Exercício · Normalizar, avaliar e amostrar

Com a matriz de contagens pronta (o arquivo `bigramas.py` traz `contar_bigramas` e as funções de apoio), escreva o resto do modelo. O bloco no fim do código roda o modelo nos nomes quando você clica em "Executar".

### Instruções

1. Escreva `probabilidades(C, suavizacao)`: some `suavizacao` a todas as contagens e divida cada **linha** pela soma dela. Devolva um array novo de `float`; não altere `C`.
2. Escreva `nll_media(P, nomes, stoi)`: a média de $-\ln P(b \mid a)$ sobre todos os pares de todos os nomes, com o `.` no começo e no fim de cada um. Devolva um `float` (`inf` se algum par tiver probabilidade zero).
3. Escreva `perplexidade(P, nomes, stoi)`: $e^{\text{NLL}}$, como `float`.
4. Escreva `amostrar(P, itos, rng, n)`: devolva uma lista de `n` nomes. Cada nome começa no índice 0; a cada caractere, faça **um** sorteio `rng.choice(V, p=P[i])`, com `i` o índice atual; se sair 0, o nome acabou (o `.` não entra no nome); senão, acrescente o caractere e continue.

### Código inicial

```python
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas


def probabilidades(C, suavizacao):
    pass


def nll_media(P, nomes, stoi):
    pass


def perplexidade(P, nomes, stoi):
    pass


def amostrar(P, itos, rng, n):
    pass


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    P = probabilidades(contar_bigramas(treino, stoi), 1.0)
    print("NLL de validação:", round(nll_media(P, validacao, stoi), 4))
    print("perplexidade:", round(perplexidade(P, validacao, stoi), 2))
    print(amostrar(P, itos, np.random.default_rng(0), 8))
```

```python path=bigramas.py
import numpy as np


def carregar_nomes(caminho="nomes.txt"):
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.read().split()


def construir_vocabulario(textos):
    itos = ["."] + sorted(set("".join(textos)) - {"."})
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        np.add.at(C, (ids[:-1], ids[1:]), 1)
    return C


def montar_pares(nomes, stoi):
    X, Y = [], []
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        X += ids[:-1]
        Y += ids[1:]
    return np.array(X), np.array(Y)
```

```text path=nomes.txt
efedi
nilema
vitupa
ebara
mine
nanuta
itinar
rate
nufo
zasa
salamam
otere
lele
nalo
cipe
areta
falina
nolado
acoteni
jige
rabora
nale
cecene
itata
jitilur
fitage
liviba
saracu
imeradi
pama
sodomer
olifi
geda
juleri
jepome
vonare
tomo
mevala
tosadi
vera
lage
oderer
bise
nisi
rase
tive
repube
nefitam
mibala
lade
mimeci
gabame
sisu
cemagan
nibema
notar
migili
dimo
icora
paca
icate
terelus
gipota
simo
icevede
remogul
gane
doreda
avabe
sepolan
rerore
nipatim
asapi
vajo
evamuve
sive
manada
lisa
elasa
molis
tateba
rigo
namami
igejido
lare
ocaba
devi
madan
divu
toni
lelala
bateda
mare
todire
cevase
todenal
leso
sipaces
merate
evera
negitil
nose
gode
emarare
momisil
vece
neso
biril
seliri
noromi
mazalum
agepoca
lacemu
nilara
duvomi
vesapi
sisado
luti
ejusapa
taril
odapanel
tobi
eramefa
esafesam
papi
nido
nave
idina
lerebum
jenen
beluli
tece
lano
nimeje
penam
maruga
lave
mino
rivi
icasita
loma
dedo
ulemeja
roce
masu
cogava
daje
cise
lale
baca
mazili
meli
etamo
mofer
apusa
teso
vatita
telil
donilo
namofu
boma
ecesan
lifivi
cepa
madire
diba
dana
levita
lora
vetimir
dobe
domi
pesatas
fane
nepo
erigi
sodo
nade
tije
banaso
tasa
roloci
giti
emele
dari
afesota
sunagol
asatara
ajesenor
maneri
sirela
vinebe
tejaca
nojida
sopa
jalasis
nacaca
ilani
nevijem
inemape
mani
besemar
nilu
lirema
zonoti
nivel
damir
fazide
nicen
edeniros
elabava
lava
bara
mena
javelal
sebenan
rete
asefaje
pesi
mezo
amope
taces
lepane
tedebir
atita
alocini
acacetu
mazabe
enile
roze
darara
cesa
abatime
bovore
bicavus
letar
asacipel
vesa
degacur
janasi
rilino
mesife
jane
rudege
nulata
micanam
lozera
romapa
ceci
zitises
emosam
lasoden
igaceza
lilel
jefu
ronave
vaje
muza
ramapa
ilagon
tima
samal
majanes
fore
labi
vuros
laro
pana
pifoga
bibipa
meco
motes
taje
lica
enanica
bavaman
gasolir
jerel
nedi
ajepo
doro
batiri
jenide
lotifu
cote
acolas
bile
rufarom
moma
otelasa
loleco
meve
mosasa
padede
jofo
tirice
marale
vace
dene
vadel
mage
lesi
rasi
volani
lomefin
binani
tenefi
cina
riram
palenun
tamava
citone
minos
magada
atemavin
milici
gamece
nemo
iretimo
vili
serara
gedar
seta
geresi
laramo
fivi
deravas
nager
naro
emupevu
riso
foteras
mufani
asileta
joli
cepal
bajale
bucalam
nena
aruvo
loramem
mero
zamom
loves
corone
degoten
elitaves
terovis
ranama
samipa
rofiro
orisujim
sital
nafem
geneme
line
ranipo
rebem
gosi
naveme
nera
rila
remamu
cedimo
emafam
miral
dolozis
tani
lalamas
nemafa
turovi
lonen
leveta
sanete
tici
deni
nige
runebe
molica
cide
cilane
pemel
sesemo
bura
gana
mojavom
ecagu
geman
tela
mece
resi
tina
jiti
pamom
jiji
pasecas
rapa
neno
codere
mivel
viza
afase
raname
dede
sini
ereli
pabilil
afacemi
tesodis
alerene
roreva
catam
papeges
lela
sarur
jicira
delil
zalo
veto
vomiso
jolegi
saseje
vifeje
agara
jabi
rara
sepevo
mone
mevama
mifolo
adona
bogere
ribo
imenaros
geso
delape
vasa
misa
amage
ariteca
dizina
ocaleba
bojime
cenar
catiga
olaciji
lemiga
osete
acejucal
peta
rigaro
vena
nolili
menoga
mami
zanim
savuga
rabe
alajam
lalima
naru
regera
upase
aromun
muja
bozi
milale
omimive
jina
amale
joname
nozatu
dite
abumebe
atasen
capam
bete
acali
jipan
taconi
teroce
ivaga
rimu
lomimam
averiras
cobe
narudas
abonir
limepa
tatida
suci
odolala
pefo
natel
noceti
rarelan
jeto
gofi
madi
irarima
vilogul
rotar
napoda
sevoto
dibira
nide
dafive
araseri
nofe
mozoram
utimis
ejoligi
belacam
fomo
manitir
dacices
opoda
alaren
gemos
memele
mitin
ogopese
mireco
amefuti
raso
efadera
tuva
asedaco
tidoba
sita
efosa
nelesi
ceja
lurale
ponono
olone
cabafi
para
tedire
emasago
reli
ripin
rajo
nifa
vemo
tetife
mivaco
bere
rale
navogos
faladis
eteci
ragaco
lena
jisube
mopeso
efemafo
doladin
vani
rafigi
sovinal
gani
lisemam
mira
rajera
egupoti
nafamam
redora
ralapo
iseniro
genene
muriti
divama
narel
ecezonan
tasata
riro
epecan
leral
taligo
nana
tanema
mejara
tera
famapo
evetata
semom
sofema
rapasis
fanuta
zodena
lema
rotu
dopa
gafe
leragel
rala
mima
jora
muvi
fefa
mabimi
zanun
emutama
lebeni
adize
zolal
ezepa
jaren
marena
vepa
lifisa
ubamilem
rego
bomafu
ranaba
ditice
masosa
sobima
otelana
loge
leba
nerur
repato
seca
atamuta
dipici
vara
zabasim
dolal
rebis
imagen
meruras
cazelo
tasare
gomil
nisas
momoge
ilicaco
nalon
tovalim
dicore
vovotu
omipil
lari
baverim
tala
polavam
turanol
sodaja
lana
jala
larame
inidor
baga
lusapo
toribe
varonel
afeno
nitar
nite
jamago
jaba
somemo
zaba
ninade
oraco
iletenir
radi
bane
caterer
navi
ucigimum
nela
itele
itefa
ulano
ubara
atisege
asaro
pural
etemeju
pasama
ideme
maponol
fege
tipeder
epajare
jecel
rapaci
rena
volel
pisula
ipitis
samas
mamim
rarace
levo
casiga
jodomi
seli
volom
reri
nilige
gadin
lasiti
biran
etane
nalate
dapa
etena
rutadol
mapa
maro
nala
lata
idadin
jime
dimi
sutesi
nelelo
cevare
gotuba
telusa
efoco
tacedi
riru
aredipa
telesi
omafi
temon
nizo
tilepi
ebelate
seci
nafe
rinere
tesono
sanata
firavu
gima
tami
tomam
dafafe
dalevo
dasasa
lila
itaroren
obimo
cepede
mimile
rava
febelal
resolas
acarano
dolas
niram
icaluse
radan
alinaca
tazalam
tanodi
ibive
mita
tigadal
binama
nedeli
napele
erapes
senora
ralo
titi
lerin
dovilo
ejova
anita
jetames
dane
sinil
balera
razalos
ligedo
emadir
leli
ceziro
adezeta
beve
arorome
nogamol
gezi
erani
sina
cule
dipana
zalarer
midar
lice
atami
eciladi
socesi
bapi
asari
rocuca
ateremi
ricor
odosa
razifi
isodapa
pocem
come
nonace
navater
nidi
narir
pagata
dabato
imamel
neginir
alova
golapa
conamo
mavaci
lemago
onorana
unacila
ludase
casoti
nememi
nutome
metas
sobelu
madabe
meca
evemalo
aloma
elafebo
nisilil
tejiti
label
dose
seri
rirale
satebil
lipese
avocisi
romen
ranorar
ralel
mededor
lalatar
rebe
zepana
nenasa
aparara
selem
mirim
dedipo
rule
fene
nopa
rovan
acame
cila
emevana
larer
coti
dime
mafi
pideso
metem
toril
patedi
badom
niracin
lepa
bopice
agitole
latemi
fomi
misam
sarase
caseja
osamajer
camica
milal
adado
mafara
baleli
lire
afene
ladosi
raja
moraca
tiralo
nuresol
narede
emana
neceva
bidote
alasene
cipa
odiso
ufilu
erone
sate
ereleti
sozasu
neman
meri
pafager
nivi
ajolanom
dirida
fifa
nure
visumu
tatori
vazo
dosi
gami
nupune
tidur
iredace
sajedem
cacavom
segedim
laji
roseril
erogil
tapa
ticire
etinel
gamena
molal
daro
sisi
faner
tase
gara
demera
ragi
talenu
time
linim
gebegel
ileve
ebefaso
neme
oretu
etalame
nema
tegor
dariga
mivil
ananezu
adaram
caci
sivabi
ture
janon
rine
cemas
rupa
sevi
duje
pafide
bisebi
cira
tadota
navoca
niseno
nidoger
repi
gare
locutus
babele
ride
leseva
egamiru
izugan
rofanor
odile
mabeba
veras
nivafi
gavemi
mana
bavinar
ecuba
tatoma
sipate
nobo
noda
libelo
mujano
pitos
icolevo
bicesu
magasa
cedaca
```

### Solução

```python
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas


def probabilidades(C, suavizacao):
    S = C + suavizacao
    return S / S.sum(axis=1, keepdims=True)


def nll_media(P, nomes, stoi):
    total, pares = 0.0, 0
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        total -= float(np.log(P[ids[:-1], ids[1:]]).sum())
        pares += len(ids) - 1
    return total / pares


def perplexidade(P, nomes, stoi):
    return float(np.exp(nll_media(P, nomes, stoi)))


def amostrar(P, itos, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        i, nome = 0, ""
        while True:
            i = int(rng.choice(V, p=P[i]))
            if i == 0:
                break
            nome += itos[i]
        nomes.append(nome)
    return nomes


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino, validacao = nomes[:800], nomes[800:900]
    stoi, itos = construir_vocabulario(treino)
    P = probabilidades(contar_bigramas(treino, stoi), 1.0)
    print("NLL de validação:", round(nll_media(P, validacao, stoi), 4))
    print("perplexidade:", round(perplexidade(P, validacao, stoi), 2))
    print(amostrar(P, itos, np.random.default_rng(0), 8))
```

```python path=bigramas.py
import numpy as np


def carregar_nomes(caminho="nomes.txt"):
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.read().split()


def construir_vocabulario(textos):
    itos = ["."] + sorted(set("".join(textos)) - {"."})
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        np.add.at(C, (ids[:-1], ids[1:]), 1)
    return C


def montar_pares(nomes, stoi):
    X, Y = [], []
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        X += ids[:-1]
        Y += ids[1:]
    return np.array(X), np.array(Y)
```

```text path=nomes.txt
efedi
nilema
vitupa
ebara
mine
nanuta
itinar
rate
nufo
zasa
salamam
otere
lele
nalo
cipe
areta
falina
nolado
acoteni
jige
rabora
nale
cecene
itata
jitilur
fitage
liviba
saracu
imeradi
pama
sodomer
olifi
geda
juleri
jepome
vonare
tomo
mevala
tosadi
vera
lage
oderer
bise
nisi
rase
tive
repube
nefitam
mibala
lade
mimeci
gabame
sisu
cemagan
nibema
notar
migili
dimo
icora
paca
icate
terelus
gipota
simo
icevede
remogul
gane
doreda
avabe
sepolan
rerore
nipatim
asapi
vajo
evamuve
sive
manada
lisa
elasa
molis
tateba
rigo
namami
igejido
lare
ocaba
devi
madan
divu
toni
lelala
bateda
mare
todire
cevase
todenal
leso
sipaces
merate
evera
negitil
nose
gode
emarare
momisil
vece
neso
biril
seliri
noromi
mazalum
agepoca
lacemu
nilara
duvomi
vesapi
sisado
luti
ejusapa
taril
odapanel
tobi
eramefa
esafesam
papi
nido
nave
idina
lerebum
jenen
beluli
tece
lano
nimeje
penam
maruga
lave
mino
rivi
icasita
loma
dedo
ulemeja
roce
masu
cogava
daje
cise
lale
baca
mazili
meli
etamo
mofer
apusa
teso
vatita
telil
donilo
namofu
boma
ecesan
lifivi
cepa
madire
diba
dana
levita
lora
vetimir
dobe
domi
pesatas
fane
nepo
erigi
sodo
nade
tije
banaso
tasa
roloci
giti
emele
dari
afesota
sunagol
asatara
ajesenor
maneri
sirela
vinebe
tejaca
nojida
sopa
jalasis
nacaca
ilani
nevijem
inemape
mani
besemar
nilu
lirema
zonoti
nivel
damir
fazide
nicen
edeniros
elabava
lava
bara
mena
javelal
sebenan
rete
asefaje
pesi
mezo
amope
taces
lepane
tedebir
atita
alocini
acacetu
mazabe
enile
roze
darara
cesa
abatime
bovore
bicavus
letar
asacipel
vesa
degacur
janasi
rilino
mesife
jane
rudege
nulata
micanam
lozera
romapa
ceci
zitises
emosam
lasoden
igaceza
lilel
jefu
ronave
vaje
muza
ramapa
ilagon
tima
samal
majanes
fore
labi
vuros
laro
pana
pifoga
bibipa
meco
motes
taje
lica
enanica
bavaman
gasolir
jerel
nedi
ajepo
doro
batiri
jenide
lotifu
cote
acolas
bile
rufarom
moma
otelasa
loleco
meve
mosasa
padede
jofo
tirice
marale
vace
dene
vadel
mage
lesi
rasi
volani
lomefin
binani
tenefi
cina
riram
palenun
tamava
citone
minos
magada
atemavin
milici
gamece
nemo
iretimo
vili
serara
gedar
seta
geresi
laramo
fivi
deravas
nager
naro
emupevu
riso
foteras
mufani
asileta
joli
cepal
bajale
bucalam
nena
aruvo
loramem
mero
zamom
loves
corone
degoten
elitaves
terovis
ranama
samipa
rofiro
orisujim
sital
nafem
geneme
line
ranipo
rebem
gosi
naveme
nera
rila
remamu
cedimo
emafam
miral
dolozis
tani
lalamas
nemafa
turovi
lonen
leveta
sanete
tici
deni
nige
runebe
molica
cide
cilane
pemel
sesemo
bura
gana
mojavom
ecagu
geman
tela
mece
resi
tina
jiti
pamom
jiji
pasecas
rapa
neno
codere
mivel
viza
afase
raname
dede
sini
ereli
pabilil
afacemi
tesodis
alerene
roreva
catam
papeges
lela
sarur
jicira
delil
zalo
veto
vomiso
jolegi
saseje
vifeje
agara
jabi
rara
sepevo
mone
mevama
mifolo
adona
bogere
ribo
imenaros
geso
delape
vasa
misa
amage
ariteca
dizina
ocaleba
bojime
cenar
catiga
olaciji
lemiga
osete
acejucal
peta
rigaro
vena
nolili
menoga
mami
zanim
savuga
rabe
alajam
lalima
naru
regera
upase
aromun
muja
bozi
milale
omimive
jina
amale
joname
nozatu
dite
abumebe
atasen
capam
bete
acali
jipan
taconi
teroce
ivaga
rimu
lomimam
averiras
cobe
narudas
abonir
limepa
tatida
suci
odolala
pefo
natel
noceti
rarelan
jeto
gofi
madi
irarima
vilogul
rotar
napoda
sevoto
dibira
nide
dafive
araseri
nofe
mozoram
utimis
ejoligi
belacam
fomo
manitir
dacices
opoda
alaren
gemos
memele
mitin
ogopese
mireco
amefuti
raso
efadera
tuva
asedaco
tidoba
sita
efosa
nelesi
ceja
lurale
ponono
olone
cabafi
para
tedire
emasago
reli
ripin
rajo
nifa
vemo
tetife
mivaco
bere
rale
navogos
faladis
eteci
ragaco
lena
jisube
mopeso
efemafo
doladin
vani
rafigi
sovinal
gani
lisemam
mira
rajera
egupoti
nafamam
redora
ralapo
iseniro
genene
muriti
divama
narel
ecezonan
tasata
riro
epecan
leral
taligo
nana
tanema
mejara
tera
famapo
evetata
semom
sofema
rapasis
fanuta
zodena
lema
rotu
dopa
gafe
leragel
rala
mima
jora
muvi
fefa
mabimi
zanun
emutama
lebeni
adize
zolal
ezepa
jaren
marena
vepa
lifisa
ubamilem
rego
bomafu
ranaba
ditice
masosa
sobima
otelana
loge
leba
nerur
repato
seca
atamuta
dipici
vara
zabasim
dolal
rebis
imagen
meruras
cazelo
tasare
gomil
nisas
momoge
ilicaco
nalon
tovalim
dicore
vovotu
omipil
lari
baverim
tala
polavam
turanol
sodaja
lana
jala
larame
inidor
baga
lusapo
toribe
varonel
afeno
nitar
nite
jamago
jaba
somemo
zaba
ninade
oraco
iletenir
radi
bane
caterer
navi
ucigimum
nela
itele
itefa
ulano
ubara
atisege
asaro
pural
etemeju
pasama
ideme
maponol
fege
tipeder
epajare
jecel
rapaci
rena
volel
pisula
ipitis
samas
mamim
rarace
levo
casiga
jodomi
seli
volom
reri
nilige
gadin
lasiti
biran
etane
nalate
dapa
etena
rutadol
mapa
maro
nala
lata
idadin
jime
dimi
sutesi
nelelo
cevare
gotuba
telusa
efoco
tacedi
riru
aredipa
telesi
omafi
temon
nizo
tilepi
ebelate
seci
nafe
rinere
tesono
sanata
firavu
gima
tami
tomam
dafafe
dalevo
dasasa
lila
itaroren
obimo
cepede
mimile
rava
febelal
resolas
acarano
dolas
niram
icaluse
radan
alinaca
tazalam
tanodi
ibive
mita
tigadal
binama
nedeli
napele
erapes
senora
ralo
titi
lerin
dovilo
ejova
anita
jetames
dane
sinil
balera
razalos
ligedo
emadir
leli
ceziro
adezeta
beve
arorome
nogamol
gezi
erani
sina
cule
dipana
zalarer
midar
lice
atami
eciladi
socesi
bapi
asari
rocuca
ateremi
ricor
odosa
razifi
isodapa
pocem
come
nonace
navater
nidi
narir
pagata
dabato
imamel
neginir
alova
golapa
conamo
mavaci
lemago
onorana
unacila
ludase
casoti
nememi
nutome
metas
sobelu
madabe
meca
evemalo
aloma
elafebo
nisilil
tejiti
label
dose
seri
rirale
satebil
lipese
avocisi
romen
ranorar
ralel
mededor
lalatar
rebe
zepana
nenasa
aparara
selem
mirim
dedipo
rule
fene
nopa
rovan
acame
cila
emevana
larer
coti
dime
mafi
pideso
metem
toril
patedi
badom
niracin
lepa
bopice
agitole
latemi
fomi
misam
sarase
caseja
osamajer
camica
milal
adado
mafara
baleli
lire
afene
ladosi
raja
moraca
tiralo
nuresol
narede
emana
neceva
bidote
alasene
cipa
odiso
ufilu
erone
sate
ereleti
sozasu
neman
meri
pafager
nivi
ajolanom
dirida
fifa
nure
visumu
tatori
vazo
dosi
gami
nupune
tidur
iredace
sajedem
cacavom
segedim
laji
roseril
erogil
tapa
ticire
etinel
gamena
molal
daro
sisi
faner
tase
gara
demera
ragi
talenu
time
linim
gebegel
ileve
ebefaso
neme
oretu
etalame
nema
tegor
dariga
mivil
ananezu
adaram
caci
sivabi
ture
janon
rine
cemas
rupa
sevi
duje
pafide
bisebi
cira
tadota
navoca
niseno
nidoger
repi
gare
locutus
babele
ride
leseva
egamiru
izugan
rofanor
odile
mabeba
veras
nivafi
gavemi
mana
bavinar
ecuba
tatoma
sipate
nobo
noda
libelo
mujano
pitos
icolevo
bicesu
magasa
cedaca
```

### Dicas

1. `S.sum(axis=1, keepdims=True)` devolve a soma de cada linha numa coluna, pronta para dividir.
2. Na NLL, some os logaritmos de todos os pares e divida pelo número total de pares, não pelo número de nomes.
3. Na amostragem, o índice sorteado vira o índice atual do sorteio seguinte.

### Verificação

```json
[
  {"id": "linhas-normalizadas", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_C = np.array([[0, 3, 1], [2, 2, 4], [5, 0, 5]])", "expr": "probabilidades(_C, 0).tolist()", "expected": [[0.0, 0.75, 0.25], [0.25, 0.25, 0.5], [0.5, 0.0, 0.5]], "tolerance": 1e-12, "name": "Sem suavização, cada linha é dividida pela soma dela", "hint": "Some ao longo do eixo 1, não do eixo 0."},
  {"id": "suavizacao-um", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_C = np.array([[0, 3, 1], [2, 2, 4], [5, 0, 5]])", "expr": "probabilidades(_C, 1.0).tolist()", "expected": [[0.14285714285714285, 0.5714285714285714, 0.2857142857142857], [0.2727272727272727, 0.2727272727272727, 0.45454545454545453], [0.46153846153846156, 0.07692307692307693, 0.46153846153846156]], "tolerance": 1e-12, "name": "Com suavização 1, a célula zerada passa a ter probabilidade positiva", "hint": "A suavização entra nas contagens antes da divisão."},
  {"id": "contagens-intactas", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_C = np.array([[0, 3, 1], [2, 2, 4], [5, 0, 5]])\n_P = probabilidades(_C, 0.5)", "expr": "[_C.tolist(), _P.dtype.kind, [round(float(s), 12) for s in _P.sum(axis=1)]]", "expected": [[[0, 3, 1], [2, 2, 4], [5, 0, 5]], "f", [1.0, 1.0, 1.0]], "name": "C não é alterada, P é float e cada linha soma 1"},
  {"id": "nll-um-nome", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_itos = ['.', 'a', 'b', 'c']\n_stoi = {c: i for i, c in enumerate(_itos)}\n_P = np.array([[0.0, 0.5, 0.3, 0.2], [0.4, 0.1, 0.3, 0.2], [0.25, 0.25, 0.25, 0.25], [0.7, 0.1, 0.1, 0.1]])", "expr": "nll_media(_P, ['ab'], _stoi)", "expected": 1.0944714486685907, "tolerance": 1e-12, "name": "NLL de 'ab': média de três pares ('.a', 'ab', 'b.')", "hint": "O par final (última letra, '.') também entra."},
  {"id": "nll-dois-nomes", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_itos = ['.', 'a', 'b', 'c']\n_stoi = {c: i for i, c in enumerate(_itos)}\n_P = np.array([[0.0, 0.5, 0.3, 0.2], [0.4, 0.1, 0.3, 0.2], [0.25, 0.25, 0.25, 0.25], [0.7, 0.1, 0.1, 0.1]])", "expr": "nll_media(_P, ['abca', 'c'], _stoi)", "expected": 1.2097718610352577, "tolerance": 1e-12, "name": "Dois nomes de tamanhos diferentes: média sobre os 7 pares", "hint": "Divida a soma pelo total de pares, não faça a média das médias de cada nome."},
  {"id": "nll-par-impossivel", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_itos = ['.', 'a', 'b', 'c']\n_stoi = {c: i for i, c in enumerate(_itos)}\n_P = np.array([[0.0, 0.5, 0.3, 0.2], [0.5, 0.0, 0.5, 0.0], [0.25, 0.25, 0.25, 0.25], [0.7, 0.1, 0.1, 0.1]])", "expr": "nll_media(_P, ['ba', 'aa'], _stoi) == float('inf')", "expected": true, "name": "Um par de probabilidade zero deixa a NLL infinita"},
  {"id": "perplexidade-uniforme", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_itos = ['.', 'a', 'b', 'c', 'd']\n_stoi = {c: i for i, c in enumerate(_itos)}\n_P = np.full((5, 5), 0.2)", "expr": "perplexidade(_P, ['abd', 'cc'], _stoi)", "expected": 4.999999999999998, "tolerance": 1e-09, "name": "Modelo uniforme com V = 5 tem perplexidade 5", "hint": "A perplexidade é e elevado à NLL."},
  {"id": "perplexidade-valor", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_itos = ['.', 'a', 'b', 'c']\n_stoi = {c: i for i, c in enumerate(_itos)}\n_P = np.array([[0.0, 0.5, 0.3, 0.2], [0.4, 0.1, 0.3, 0.2], [0.25, 0.25, 0.25, 0.25], [0.7, 0.1, 0.1, 0.1]])", "expr": "perplexidade(_P, ['ab'], _stoi)", "expected": 2.987603164371443, "tolerance": 1e-09, "name": "Perplexidade de 'ab' no modelo de quatro tokens"},
  {"id": "amostrar-semente-zero", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n_itos = ['.', 'a', 'b', 'c']\n_P = np.array([[0.0, 0.5, 0.3, 0.2], [0.4, 0.1, 0.3, 0.2], [0.25, 0.25, 0.25, 0.25], [0.7, 0.1, 0.1, 0.1]])", "expr": "amostrar(_P, _itos, np.random.default_rng(0), 6)", "expected": ["ba", "acc", "bbcb", "c", "b", "c"], "name": "Seis nomes com default_rng(0): um sorteio por caractere, na ordem", "hint": "Um rng.choice(V, p=P[i]) por caractere, inclusive o que sorteia o '.' final."},
  {"id": "amostrar-sementes", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\n_itos = ['.', 'a', 'b', 'c']\n_P = np.array([[0.0, 0.5, 0.3, 0.2], [0.4, 0.1, 0.3, 0.2], [0.25, 0.25, 0.25, 0.25], [0.7, 0.1, 0.1, 0.1]])\n_a = amostrar(_P, _itos, np.random.default_rng(5), 12)\n_b = amostrar(_P, _itos, np.random.default_rng(5), 12)\n_c = amostrar(_P, _itos, np.random.default_rng(6), 12)", "expr": "[len(_a), _a == _b, _a != _c, len(set(_a)) > 1, any('.' in s for s in _a)]", "expected": [12, true, true, true, false], "name": "12 nomes: mesma semente repete, outra semente muda, os nomes variam e não têm '.'", "hint": "Sorteie com as probabilidades; escolher sempre o mais provável gera o mesmo nome toda vez."},
  {"id": "nomes-validacao", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom bigramas import carregar_nomes, construir_vocabulario, contar_bigramas\n_nomes = carregar_nomes()\n_stoi, _itos = construir_vocabulario(_nomes[:800])\n_P = probabilidades(contar_bigramas(_nomes[:800], _stoi), 1.0)", "expr": "[nll_media(_P, _nomes[800:900], _stoi), perplexidade(_P, _nomes[800:900], _stoi)]", "expected": [2.1683678710228675, 8.744001050579685], "tolerance": 1e-09, "name": "nomes.txt com suavização 1: NLL e perplexidade de validação"},
  {"id": "nomes-amostra", "checkpoint": 4, "kind": "expr", "setup": "import numpy as np\nfrom bigramas import carregar_nomes, construir_vocabulario, contar_bigramas\n_nomes = carregar_nomes()\n_stoi, _itos = construir_vocabulario(_nomes[:800])\n_P = probabilidades(contar_bigramas(_nomes[:800], _stoi), 0)", "expr": "amostrar(_P, _itos, np.random.default_rng(0), 4)", "expected": ["na", "aromimor", "s", "rasebe"], "name": "nomes.txt sem suavização: quatro nomes amostrados com default_rng(0)"}
]
```

### Soluções erradas

```python name="normaliza pelas colunas"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas


def probabilidades(C, suavizacao):
    S = C + suavizacao
    return S / S.sum(axis=0, keepdims=True)


def nll_media(P, nomes, stoi):
    total, pares = 0.0, 0
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        total -= float(np.log(P[ids[:-1], ids[1:]]).sum())
        pares += len(ids) - 1
    return total / pares


def perplexidade(P, nomes, stoi):
    return float(np.exp(nll_media(P, nomes, stoi)))


def amostrar(P, itos, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        i, nome = 0, ""
        while True:
            i = int(rng.choice(V, p=P[i]))
            if i == 0:
                break
            nome += itos[i]
        nomes.append(nome)
    return nomes
```

```python name="suavização depois de normalizar"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas


def probabilidades(C, suavizacao):
    return C / C.sum(axis=1, keepdims=True) + suavizacao


def nll_media(P, nomes, stoi):
    total, pares = 0.0, 0
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        total -= float(np.log(P[ids[:-1], ids[1:]]).sum())
        pares += len(ids) - 1
    return total / pares


def perplexidade(P, nomes, stoi):
    return float(np.exp(nll_media(P, nomes, stoi)))


def amostrar(P, itos, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        i, nome = 0, ""
        while True:
            i = int(rng.choice(V, p=P[i]))
            if i == 0:
                break
            nome += itos[i]
        nomes.append(nome)
    return nomes
```

```python name="NLL sem o par do ponto final"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas


def probabilidades(C, suavizacao):
    S = C + suavizacao
    return S / S.sum(axis=1, keepdims=True)


def nll_media(P, nomes, stoi):
    total, pares = 0.0, 0
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome]
        total -= float(np.log(P[ids[:-1], ids[1:]]).sum())
        pares += len(ids) - 1
    return total / pares


def perplexidade(P, nomes, stoi):
    return float(np.exp(nll_media(P, nomes, stoi)))


def amostrar(P, itos, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        i, nome = 0, ""
        while True:
            i = int(rng.choice(V, p=P[i]))
            if i == 0:
                break
            nome += itos[i]
        nomes.append(nome)
    return nomes
```

```python name="NLL dividida pelo número de nomes"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas


def probabilidades(C, suavizacao):
    S = C + suavizacao
    return S / S.sum(axis=1, keepdims=True)


def nll_media(P, nomes, stoi):
    total = 0.0
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        total -= float(np.log(P[ids[:-1], ids[1:]]).sum())
    return total / len(nomes)


def perplexidade(P, nomes, stoi):
    return float(np.exp(nll_media(P, nomes, stoi)))


def amostrar(P, itos, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        i, nome = 0, ""
        while True:
            i = int(rng.choice(V, p=P[i]))
            if i == 0:
                break
            nome += itos[i]
        nomes.append(nome)
    return nomes
```

```python name="perplexidade com 10 elevado à NLL"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas


def probabilidades(C, suavizacao):
    S = C + suavizacao
    return S / S.sum(axis=1, keepdims=True)


def nll_media(P, nomes, stoi):
    total, pares = 0.0, 0
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        total -= float(np.log(P[ids[:-1], ids[1:]]).sum())
        pares += len(ids) - 1
    return total / pares


def perplexidade(P, nomes, stoi):
    return float(10 ** nll_media(P, nomes, stoi))


def amostrar(P, itos, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        i, nome = 0, ""
        while True:
            i = int(rng.choice(V, p=P[i]))
            if i == 0:
                break
            nome += itos[i]
        nomes.append(nome)
    return nomes
```

```python name="amostra com argmax"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas


def probabilidades(C, suavizacao):
    S = C + suavizacao
    return S / S.sum(axis=1, keepdims=True)


def nll_media(P, nomes, stoi):
    total, pares = 0.0, 0
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        total -= float(np.log(P[ids[:-1], ids[1:]]).sum())
        pares += len(ids) - 1
    return total / pares


def perplexidade(P, nomes, stoi):
    return float(np.exp(nll_media(P, nomes, stoi)))


def amostrar(P, itos, rng, n):
    nomes = []
    for _ in range(n):
        i, nome = 0, ""
        while True:
            i = int(np.argmax(P[i]))
            if i == 0:
                break
            nome += itos[i]
        nomes.append(nome)
    return nomes
```

```python name="um sorteio só para o nome todo"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas


def probabilidades(C, suavizacao):
    S = C + suavizacao
    return S / S.sum(axis=1, keepdims=True)


def nll_media(P, nomes, stoi):
    total, pares = 0.0, 0
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        total -= float(np.log(P[ids[:-1], ids[1:]]).sum())
        pares += len(ids) - 1
    return total / pares


def perplexidade(P, nomes, stoi):
    return float(np.exp(nll_media(P, nomes, stoi)))


def amostrar(P, itos, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        nome = ""
        for i in rng.choice(V, size=20, p=P[0]):
            if i == 0:
                break
            nome += itos[int(i)]
        nomes.append(nome)
    return nomes
```

```python name="ponto final entra no nome"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas


def probabilidades(C, suavizacao):
    S = C + suavizacao
    return S / S.sum(axis=1, keepdims=True)


def nll_media(P, nomes, stoi):
    total, pares = 0.0, 0
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        total -= float(np.log(P[ids[:-1], ids[1:]]).sum())
        pares += len(ids) - 1
    return total / pares


def perplexidade(P, nomes, stoi):
    return float(np.exp(nll_media(P, nomes, stoi)))


def amostrar(P, itos, rng, n):
    V = len(itos)
    nomes = []
    for _ in range(n):
        i, nome = 0, ""
        while True:
            i = int(rng.choice(V, p=P[i]))
            nome += itos[i]
            if i == 0:
                break
        nomes.append(nome)
    return nomes
```

## Passo 6 · Leitura · O bigrama como rede

Contar resolve o bigrama, mas não se estende: com um contexto de 3 caracteres, a tabela teria $21^3 = 9\,261$ linhas, quase todas vazias. Para crescer, o modelo precisa ser uma rede treinada por gradiente. Vale a pena escrever primeiro o próprio bigrama desse jeito, porque já se sabe aonde o treino deve chegar.

A rede tem uma camada só, sem viés: a entrada é o one-hot do caractere atual, os pesos são uma matriz $W$ de forma $(V, V)$, e a saída são os logits do próximo caractere. Como one-hot vezes matriz é indexar, o forward é `W[X]`, seguido da softmax e da NLL média:

```python
Z = W[X]                                   # (n, V): uma linha de logits por par
P = np.exp(Z - Z.max(axis=1, keepdims=True))
P /= P.sum(axis=1, keepdims=True)
perda = -np.log(P[np.arange(n), Y]).mean()
```

O gradiente dos logits é o de sempre, $(P - \text{onehot}(Y)) / n$, e o de $W$ é o backward do embedding: cada linha de $W$ acumula, com `np.add.at`, os gradientes dos pares em que aquele caractere foi a entrada.

Linha por linha, a rede resolve um problema separado: escolher os logits que melhor explicam os caracteres que vieram depois de `a`. A NLL de uma linha é mínima quando a softmax devolve exatamente as frequências observadas, ou seja, quando $W_{ab} = \ln C_{ab}$ mais uma constante por linha. **O mínimo da perda é a tabela de contagens**, e nenhum bigrama fica abaixo dela no treino.

Medido nos 5 145 pares de treino, com $W$ começando em zero e taxa 50: a perda começa em $3{,}0445$ (que é $\ln 21$), chega a $2{,}1376$ em 100 passos e a $2{,}1258$ em 300, encostando por cima nos $2{,}1203$ das contagens. Cada passo custa 2,5 ms; contar leva um instante. A rede não ganha nada aqui, e esse é o ponto: a mesma receita (logits, softmax, NLL, gradiente) continua valendo quando a entrada passa a ser um contexto maior, e a contagem não.

A suavização também tem equivalente. Somar à perda uma penalidade $\lambda \sum W^2$ puxa os logits para zero, e logits iguais são a distribuição uniforme: é o mesmo efeito de aumentar $s$.

## Passo 7 · Exercício · Bigrama por gradiente

Treine o bigrama como uma rede de uma camada, com descida de gradiente em lote cheio. O `bigramas.py` agora traz `montar_pares(nomes, stoi)`, que devolve os arrays `X` (caractere atual) e `Y` (próximo caractere).

### Instruções

1. Escreva `treinar_bigrama(X, Y, V, passos, taxa, W0)`. Comece de uma **cópia** de `W0` (forma `(V, V)`). Em cada passo, calcule os logits `W[X]`, a softmax de cada linha e a NLL média dos alvos `Y`, e guarde a perda (como `float`) em `historico` **antes** de atualizar os pesos.
2. Calcule o gradiente: `dZ = (P - onehot(Y)) / n` e `dW` acumulando cada linha de `dZ` na linha `X[i]` de `dW` (índices repetidos somam). Atualize `W -= taxa * dW`.
3. Devolva `(W, historico)`, com `historico` de tamanho `passos`. `W0` não pode ser alterado.

### Código inicial

```python
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas, montar_pares


def treinar_bigrama(X, Y, V, passos, taxa, W0):
    pass


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino = nomes[:800]
    stoi, itos = construir_vocabulario(treino)
    X, Y = montar_pares(treino, stoi)
    W, historico = treinar_bigrama(X, Y, len(itos), 100, 50.0, np.zeros((len(itos), len(itos))))
    print("perda inicial:", round(historico[0], 4), "perda no passo 100:", round(historico[-1], 4))
```

```python path=bigramas.py
import numpy as np


def carregar_nomes(caminho="nomes.txt"):
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.read().split()


def construir_vocabulario(textos):
    itos = ["."] + sorted(set("".join(textos)) - {"."})
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        np.add.at(C, (ids[:-1], ids[1:]), 1)
    return C


def montar_pares(nomes, stoi):
    X, Y = [], []
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        X += ids[:-1]
        Y += ids[1:]
    return np.array(X), np.array(Y)
```

```text path=nomes.txt
efedi
nilema
vitupa
ebara
mine
nanuta
itinar
rate
nufo
zasa
salamam
otere
lele
nalo
cipe
areta
falina
nolado
acoteni
jige
rabora
nale
cecene
itata
jitilur
fitage
liviba
saracu
imeradi
pama
sodomer
olifi
geda
juleri
jepome
vonare
tomo
mevala
tosadi
vera
lage
oderer
bise
nisi
rase
tive
repube
nefitam
mibala
lade
mimeci
gabame
sisu
cemagan
nibema
notar
migili
dimo
icora
paca
icate
terelus
gipota
simo
icevede
remogul
gane
doreda
avabe
sepolan
rerore
nipatim
asapi
vajo
evamuve
sive
manada
lisa
elasa
molis
tateba
rigo
namami
igejido
lare
ocaba
devi
madan
divu
toni
lelala
bateda
mare
todire
cevase
todenal
leso
sipaces
merate
evera
negitil
nose
gode
emarare
momisil
vece
neso
biril
seliri
noromi
mazalum
agepoca
lacemu
nilara
duvomi
vesapi
sisado
luti
ejusapa
taril
odapanel
tobi
eramefa
esafesam
papi
nido
nave
idina
lerebum
jenen
beluli
tece
lano
nimeje
penam
maruga
lave
mino
rivi
icasita
loma
dedo
ulemeja
roce
masu
cogava
daje
cise
lale
baca
mazili
meli
etamo
mofer
apusa
teso
vatita
telil
donilo
namofu
boma
ecesan
lifivi
cepa
madire
diba
dana
levita
lora
vetimir
dobe
domi
pesatas
fane
nepo
erigi
sodo
nade
tije
banaso
tasa
roloci
giti
emele
dari
afesota
sunagol
asatara
ajesenor
maneri
sirela
vinebe
tejaca
nojida
sopa
jalasis
nacaca
ilani
nevijem
inemape
mani
besemar
nilu
lirema
zonoti
nivel
damir
fazide
nicen
edeniros
elabava
lava
bara
mena
javelal
sebenan
rete
asefaje
pesi
mezo
amope
taces
lepane
tedebir
atita
alocini
acacetu
mazabe
enile
roze
darara
cesa
abatime
bovore
bicavus
letar
asacipel
vesa
degacur
janasi
rilino
mesife
jane
rudege
nulata
micanam
lozera
romapa
ceci
zitises
emosam
lasoden
igaceza
lilel
jefu
ronave
vaje
muza
ramapa
ilagon
tima
samal
majanes
fore
labi
vuros
laro
pana
pifoga
bibipa
meco
motes
taje
lica
enanica
bavaman
gasolir
jerel
nedi
ajepo
doro
batiri
jenide
lotifu
cote
acolas
bile
rufarom
moma
otelasa
loleco
meve
mosasa
padede
jofo
tirice
marale
vace
dene
vadel
mage
lesi
rasi
volani
lomefin
binani
tenefi
cina
riram
palenun
tamava
citone
minos
magada
atemavin
milici
gamece
nemo
iretimo
vili
serara
gedar
seta
geresi
laramo
fivi
deravas
nager
naro
emupevu
riso
foteras
mufani
asileta
joli
cepal
bajale
bucalam
nena
aruvo
loramem
mero
zamom
loves
corone
degoten
elitaves
terovis
ranama
samipa
rofiro
orisujim
sital
nafem
geneme
line
ranipo
rebem
gosi
naveme
nera
rila
remamu
cedimo
emafam
miral
dolozis
tani
lalamas
nemafa
turovi
lonen
leveta
sanete
tici
deni
nige
runebe
molica
cide
cilane
pemel
sesemo
bura
gana
mojavom
ecagu
geman
tela
mece
resi
tina
jiti
pamom
jiji
pasecas
rapa
neno
codere
mivel
viza
afase
raname
dede
sini
ereli
pabilil
afacemi
tesodis
alerene
roreva
catam
papeges
lela
sarur
jicira
delil
zalo
veto
vomiso
jolegi
saseje
vifeje
agara
jabi
rara
sepevo
mone
mevama
mifolo
adona
bogere
ribo
imenaros
geso
delape
vasa
misa
amage
ariteca
dizina
ocaleba
bojime
cenar
catiga
olaciji
lemiga
osete
acejucal
peta
rigaro
vena
nolili
menoga
mami
zanim
savuga
rabe
alajam
lalima
naru
regera
upase
aromun
muja
bozi
milale
omimive
jina
amale
joname
nozatu
dite
abumebe
atasen
capam
bete
acali
jipan
taconi
teroce
ivaga
rimu
lomimam
averiras
cobe
narudas
abonir
limepa
tatida
suci
odolala
pefo
natel
noceti
rarelan
jeto
gofi
madi
irarima
vilogul
rotar
napoda
sevoto
dibira
nide
dafive
araseri
nofe
mozoram
utimis
ejoligi
belacam
fomo
manitir
dacices
opoda
alaren
gemos
memele
mitin
ogopese
mireco
amefuti
raso
efadera
tuva
asedaco
tidoba
sita
efosa
nelesi
ceja
lurale
ponono
olone
cabafi
para
tedire
emasago
reli
ripin
rajo
nifa
vemo
tetife
mivaco
bere
rale
navogos
faladis
eteci
ragaco
lena
jisube
mopeso
efemafo
doladin
vani
rafigi
sovinal
gani
lisemam
mira
rajera
egupoti
nafamam
redora
ralapo
iseniro
genene
muriti
divama
narel
ecezonan
tasata
riro
epecan
leral
taligo
nana
tanema
mejara
tera
famapo
evetata
semom
sofema
rapasis
fanuta
zodena
lema
rotu
dopa
gafe
leragel
rala
mima
jora
muvi
fefa
mabimi
zanun
emutama
lebeni
adize
zolal
ezepa
jaren
marena
vepa
lifisa
ubamilem
rego
bomafu
ranaba
ditice
masosa
sobima
otelana
loge
leba
nerur
repato
seca
atamuta
dipici
vara
zabasim
dolal
rebis
imagen
meruras
cazelo
tasare
gomil
nisas
momoge
ilicaco
nalon
tovalim
dicore
vovotu
omipil
lari
baverim
tala
polavam
turanol
sodaja
lana
jala
larame
inidor
baga
lusapo
toribe
varonel
afeno
nitar
nite
jamago
jaba
somemo
zaba
ninade
oraco
iletenir
radi
bane
caterer
navi
ucigimum
nela
itele
itefa
ulano
ubara
atisege
asaro
pural
etemeju
pasama
ideme
maponol
fege
tipeder
epajare
jecel
rapaci
rena
volel
pisula
ipitis
samas
mamim
rarace
levo
casiga
jodomi
seli
volom
reri
nilige
gadin
lasiti
biran
etane
nalate
dapa
etena
rutadol
mapa
maro
nala
lata
idadin
jime
dimi
sutesi
nelelo
cevare
gotuba
telusa
efoco
tacedi
riru
aredipa
telesi
omafi
temon
nizo
tilepi
ebelate
seci
nafe
rinere
tesono
sanata
firavu
gima
tami
tomam
dafafe
dalevo
dasasa
lila
itaroren
obimo
cepede
mimile
rava
febelal
resolas
acarano
dolas
niram
icaluse
radan
alinaca
tazalam
tanodi
ibive
mita
tigadal
binama
nedeli
napele
erapes
senora
ralo
titi
lerin
dovilo
ejova
anita
jetames
dane
sinil
balera
razalos
ligedo
emadir
leli
ceziro
adezeta
beve
arorome
nogamol
gezi
erani
sina
cule
dipana
zalarer
midar
lice
atami
eciladi
socesi
bapi
asari
rocuca
ateremi
ricor
odosa
razifi
isodapa
pocem
come
nonace
navater
nidi
narir
pagata
dabato
imamel
neginir
alova
golapa
conamo
mavaci
lemago
onorana
unacila
ludase
casoti
nememi
nutome
metas
sobelu
madabe
meca
evemalo
aloma
elafebo
nisilil
tejiti
label
dose
seri
rirale
satebil
lipese
avocisi
romen
ranorar
ralel
mededor
lalatar
rebe
zepana
nenasa
aparara
selem
mirim
dedipo
rule
fene
nopa
rovan
acame
cila
emevana
larer
coti
dime
mafi
pideso
metem
toril
patedi
badom
niracin
lepa
bopice
agitole
latemi
fomi
misam
sarase
caseja
osamajer
camica
milal
adado
mafara
baleli
lire
afene
ladosi
raja
moraca
tiralo
nuresol
narede
emana
neceva
bidote
alasene
cipa
odiso
ufilu
erone
sate
ereleti
sozasu
neman
meri
pafager
nivi
ajolanom
dirida
fifa
nure
visumu
tatori
vazo
dosi
gami
nupune
tidur
iredace
sajedem
cacavom
segedim
laji
roseril
erogil
tapa
ticire
etinel
gamena
molal
daro
sisi
faner
tase
gara
demera
ragi
talenu
time
linim
gebegel
ileve
ebefaso
neme
oretu
etalame
nema
tegor
dariga
mivil
ananezu
adaram
caci
sivabi
ture
janon
rine
cemas
rupa
sevi
duje
pafide
bisebi
cira
tadota
navoca
niseno
nidoger
repi
gare
locutus
babele
ride
leseva
egamiru
izugan
rofanor
odile
mabeba
veras
nivafi
gavemi
mana
bavinar
ecuba
tatoma
sipate
nobo
noda
libelo
mujano
pitos
icolevo
bicesu
magasa
cedaca
```

### Solução

```python
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas, montar_pares


def treinar_bigrama(X, Y, V, passos, taxa, W0):
    W = W0.copy()
    n = X.shape[0]
    historico = []
    for _ in range(passos):
        Z = W[X]
        Z = Z - Z.max(axis=1, keepdims=True)
        P = np.exp(Z)
        P /= P.sum(axis=1, keepdims=True)
        historico.append(float(-np.log(P[np.arange(n), Y]).mean()))
        dZ = P
        dZ[np.arange(n), Y] -= 1.0
        dW = np.zeros_like(W)
        np.add.at(dW, X, dZ / n)
        W -= taxa * dW
    return W, historico


if __name__ == "__main__":
    nomes = carregar_nomes()
    treino = nomes[:800]
    stoi, itos = construir_vocabulario(treino)
    X, Y = montar_pares(treino, stoi)
    W, historico = treinar_bigrama(X, Y, len(itos), 100, 50.0, np.zeros((len(itos), len(itos))))
    print("perda inicial:", round(historico[0], 4), "perda no passo 100:", round(historico[-1], 4))
```

```python path=bigramas.py
import numpy as np


def carregar_nomes(caminho="nomes.txt"):
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.read().split()


def construir_vocabulario(textos):
    itos = ["."] + sorted(set("".join(textos)) - {"."})
    stoi = {c: i for i, c in enumerate(itos)}
    return stoi, itos


def contar_bigramas(nomes, stoi):
    V = len(stoi)
    C = np.zeros((V, V), dtype=np.int64)
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        np.add.at(C, (ids[:-1], ids[1:]), 1)
    return C


def montar_pares(nomes, stoi):
    X, Y = [], []
    for nome in nomes:
        ids = [stoi[c] for c in "." + nome + "."]
        X += ids[:-1]
        Y += ids[1:]
    return np.array(X), np.array(Y)
```

```text path=nomes.txt
efedi
nilema
vitupa
ebara
mine
nanuta
itinar
rate
nufo
zasa
salamam
otere
lele
nalo
cipe
areta
falina
nolado
acoteni
jige
rabora
nale
cecene
itata
jitilur
fitage
liviba
saracu
imeradi
pama
sodomer
olifi
geda
juleri
jepome
vonare
tomo
mevala
tosadi
vera
lage
oderer
bise
nisi
rase
tive
repube
nefitam
mibala
lade
mimeci
gabame
sisu
cemagan
nibema
notar
migili
dimo
icora
paca
icate
terelus
gipota
simo
icevede
remogul
gane
doreda
avabe
sepolan
rerore
nipatim
asapi
vajo
evamuve
sive
manada
lisa
elasa
molis
tateba
rigo
namami
igejido
lare
ocaba
devi
madan
divu
toni
lelala
bateda
mare
todire
cevase
todenal
leso
sipaces
merate
evera
negitil
nose
gode
emarare
momisil
vece
neso
biril
seliri
noromi
mazalum
agepoca
lacemu
nilara
duvomi
vesapi
sisado
luti
ejusapa
taril
odapanel
tobi
eramefa
esafesam
papi
nido
nave
idina
lerebum
jenen
beluli
tece
lano
nimeje
penam
maruga
lave
mino
rivi
icasita
loma
dedo
ulemeja
roce
masu
cogava
daje
cise
lale
baca
mazili
meli
etamo
mofer
apusa
teso
vatita
telil
donilo
namofu
boma
ecesan
lifivi
cepa
madire
diba
dana
levita
lora
vetimir
dobe
domi
pesatas
fane
nepo
erigi
sodo
nade
tije
banaso
tasa
roloci
giti
emele
dari
afesota
sunagol
asatara
ajesenor
maneri
sirela
vinebe
tejaca
nojida
sopa
jalasis
nacaca
ilani
nevijem
inemape
mani
besemar
nilu
lirema
zonoti
nivel
damir
fazide
nicen
edeniros
elabava
lava
bara
mena
javelal
sebenan
rete
asefaje
pesi
mezo
amope
taces
lepane
tedebir
atita
alocini
acacetu
mazabe
enile
roze
darara
cesa
abatime
bovore
bicavus
letar
asacipel
vesa
degacur
janasi
rilino
mesife
jane
rudege
nulata
micanam
lozera
romapa
ceci
zitises
emosam
lasoden
igaceza
lilel
jefu
ronave
vaje
muza
ramapa
ilagon
tima
samal
majanes
fore
labi
vuros
laro
pana
pifoga
bibipa
meco
motes
taje
lica
enanica
bavaman
gasolir
jerel
nedi
ajepo
doro
batiri
jenide
lotifu
cote
acolas
bile
rufarom
moma
otelasa
loleco
meve
mosasa
padede
jofo
tirice
marale
vace
dene
vadel
mage
lesi
rasi
volani
lomefin
binani
tenefi
cina
riram
palenun
tamava
citone
minos
magada
atemavin
milici
gamece
nemo
iretimo
vili
serara
gedar
seta
geresi
laramo
fivi
deravas
nager
naro
emupevu
riso
foteras
mufani
asileta
joli
cepal
bajale
bucalam
nena
aruvo
loramem
mero
zamom
loves
corone
degoten
elitaves
terovis
ranama
samipa
rofiro
orisujim
sital
nafem
geneme
line
ranipo
rebem
gosi
naveme
nera
rila
remamu
cedimo
emafam
miral
dolozis
tani
lalamas
nemafa
turovi
lonen
leveta
sanete
tici
deni
nige
runebe
molica
cide
cilane
pemel
sesemo
bura
gana
mojavom
ecagu
geman
tela
mece
resi
tina
jiti
pamom
jiji
pasecas
rapa
neno
codere
mivel
viza
afase
raname
dede
sini
ereli
pabilil
afacemi
tesodis
alerene
roreva
catam
papeges
lela
sarur
jicira
delil
zalo
veto
vomiso
jolegi
saseje
vifeje
agara
jabi
rara
sepevo
mone
mevama
mifolo
adona
bogere
ribo
imenaros
geso
delape
vasa
misa
amage
ariteca
dizina
ocaleba
bojime
cenar
catiga
olaciji
lemiga
osete
acejucal
peta
rigaro
vena
nolili
menoga
mami
zanim
savuga
rabe
alajam
lalima
naru
regera
upase
aromun
muja
bozi
milale
omimive
jina
amale
joname
nozatu
dite
abumebe
atasen
capam
bete
acali
jipan
taconi
teroce
ivaga
rimu
lomimam
averiras
cobe
narudas
abonir
limepa
tatida
suci
odolala
pefo
natel
noceti
rarelan
jeto
gofi
madi
irarima
vilogul
rotar
napoda
sevoto
dibira
nide
dafive
araseri
nofe
mozoram
utimis
ejoligi
belacam
fomo
manitir
dacices
opoda
alaren
gemos
memele
mitin
ogopese
mireco
amefuti
raso
efadera
tuva
asedaco
tidoba
sita
efosa
nelesi
ceja
lurale
ponono
olone
cabafi
para
tedire
emasago
reli
ripin
rajo
nifa
vemo
tetife
mivaco
bere
rale
navogos
faladis
eteci
ragaco
lena
jisube
mopeso
efemafo
doladin
vani
rafigi
sovinal
gani
lisemam
mira
rajera
egupoti
nafamam
redora
ralapo
iseniro
genene
muriti
divama
narel
ecezonan
tasata
riro
epecan
leral
taligo
nana
tanema
mejara
tera
famapo
evetata
semom
sofema
rapasis
fanuta
zodena
lema
rotu
dopa
gafe
leragel
rala
mima
jora
muvi
fefa
mabimi
zanun
emutama
lebeni
adize
zolal
ezepa
jaren
marena
vepa
lifisa
ubamilem
rego
bomafu
ranaba
ditice
masosa
sobima
otelana
loge
leba
nerur
repato
seca
atamuta
dipici
vara
zabasim
dolal
rebis
imagen
meruras
cazelo
tasare
gomil
nisas
momoge
ilicaco
nalon
tovalim
dicore
vovotu
omipil
lari
baverim
tala
polavam
turanol
sodaja
lana
jala
larame
inidor
baga
lusapo
toribe
varonel
afeno
nitar
nite
jamago
jaba
somemo
zaba
ninade
oraco
iletenir
radi
bane
caterer
navi
ucigimum
nela
itele
itefa
ulano
ubara
atisege
asaro
pural
etemeju
pasama
ideme
maponol
fege
tipeder
epajare
jecel
rapaci
rena
volel
pisula
ipitis
samas
mamim
rarace
levo
casiga
jodomi
seli
volom
reri
nilige
gadin
lasiti
biran
etane
nalate
dapa
etena
rutadol
mapa
maro
nala
lata
idadin
jime
dimi
sutesi
nelelo
cevare
gotuba
telusa
efoco
tacedi
riru
aredipa
telesi
omafi
temon
nizo
tilepi
ebelate
seci
nafe
rinere
tesono
sanata
firavu
gima
tami
tomam
dafafe
dalevo
dasasa
lila
itaroren
obimo
cepede
mimile
rava
febelal
resolas
acarano
dolas
niram
icaluse
radan
alinaca
tazalam
tanodi
ibive
mita
tigadal
binama
nedeli
napele
erapes
senora
ralo
titi
lerin
dovilo
ejova
anita
jetames
dane
sinil
balera
razalos
ligedo
emadir
leli
ceziro
adezeta
beve
arorome
nogamol
gezi
erani
sina
cule
dipana
zalarer
midar
lice
atami
eciladi
socesi
bapi
asari
rocuca
ateremi
ricor
odosa
razifi
isodapa
pocem
come
nonace
navater
nidi
narir
pagata
dabato
imamel
neginir
alova
golapa
conamo
mavaci
lemago
onorana
unacila
ludase
casoti
nememi
nutome
metas
sobelu
madabe
meca
evemalo
aloma
elafebo
nisilil
tejiti
label
dose
seri
rirale
satebil
lipese
avocisi
romen
ranorar
ralel
mededor
lalatar
rebe
zepana
nenasa
aparara
selem
mirim
dedipo
rule
fene
nopa
rovan
acame
cila
emevana
larer
coti
dime
mafi
pideso
metem
toril
patedi
badom
niracin
lepa
bopice
agitole
latemi
fomi
misam
sarase
caseja
osamajer
camica
milal
adado
mafara
baleli
lire
afene
ladosi
raja
moraca
tiralo
nuresol
narede
emana
neceva
bidote
alasene
cipa
odiso
ufilu
erone
sate
ereleti
sozasu
neman
meri
pafager
nivi
ajolanom
dirida
fifa
nure
visumu
tatori
vazo
dosi
gami
nupune
tidur
iredace
sajedem
cacavom
segedim
laji
roseril
erogil
tapa
ticire
etinel
gamena
molal
daro
sisi
faner
tase
gara
demera
ragi
talenu
time
linim
gebegel
ileve
ebefaso
neme
oretu
etalame
nema
tegor
dariga
mivil
ananezu
adaram
caci
sivabi
ture
janon
rine
cemas
rupa
sevi
duje
pafide
bisebi
cira
tadota
navoca
niseno
nidoger
repi
gare
locutus
babele
ride
leseva
egamiru
izugan
rofanor
odile
mabeba
veras
nivafi
gavemi
mana
bavinar
ecuba
tatoma
sipate
nobo
noda
libelo
mujano
pitos
icolevo
bicesu
magasa
cedaca
```

### Dicas

1. `W[X]` tem forma `(n, V)`: uma linha de logits para cada par.
2. Subtrair 1 em `P[np.arange(n), Y]` e dividir por `n` dá o gradiente dos logits.
3. O gradiente de `W` é o backward do embedding da lição anterior: `np.add.at(dW, X, dZ)`.

### Verificação

```json
[
  {"id": "perda-inicial-ln-v", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X = np.array([0, 1, 2, 0, 2, 3, 1])\n_Y = np.array([1, 2, 0, 2, 3, 0, 0])\n_W, _h = treinar_bigrama(_X, _Y, 4, 1, 0.5, np.zeros((4, 4)))", "expr": "_h[0]", "expected": 1.3862943611198906, "tolerance": 1e-12, "name": "Com W0 de zeros e V = 4, a primeira perda é ln 4", "hint": "A perda é registrada antes da atualização dos pesos."},
  {"id": "um-passo", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_X = np.array([0, 1, 0, 2])\n_Y = np.array([1, 0, 2, 0])\n_W, _h = treinar_bigrama(_X, _Y, 3, 1, 1.0, np.zeros((3, 3)))", "expr": "_W.tolist()", "expected": [[-0.16666666666666666, 0.08333333333333336, 0.08333333333333336], [0.16666666666666669, -0.08333333333333333, -0.08333333333333333], [0.16666666666666669, -0.08333333333333333, -0.08333333333333333]], "tolerance": 1e-10, "name": "Um passo com taxa 1 a partir de zeros (o índice 0 aparece duas vezes em X)", "hint": "A linha 0 de dW soma os gradientes dos dois pares que começam em 0; tudo dividido por n = 4."},
  {"id": "tres-passos-historico", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_X = np.array([0, 1, 2, 0, 2, 3, 1])\n_Y = np.array([1, 2, 0, 2, 3, 0, 0])\n_W0 = np.random.default_rng(0).normal(0, 1, (4, 4))\n_W, _h = treinar_bigrama(_X, _Y, 4, 3, 0.5, _W0)", "expr": "_h", "expected": [1.6273266777830135, 1.5870641410542847, 1.5483677340107662], "tolerance": 1e-10, "name": "Histórico de três passos com W0 sorteado", "hint": "Cada perda é a NLL média com os pesos de antes do passo."},
  {"id": "tres-passos-pesos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_X = np.array([0, 1, 2, 0, 2, 3, 1])\n_Y = np.array([1, 2, 0, 2, 3, 0, 0])\n_W0 = np.random.default_rng(0).normal(0, 1, (4, 4))\n_W, _h = treinar_bigrama(_X, _Y, 4, 3, 0.5, _W0)", "expr": "_W.tolist()", "expected": [[0.03200068190902647, 0.0038529255726290623, 0.6900502686908035, 0.013044249225954187], [-0.35393634842325783, 0.2884219729045237, 1.3243747613543078, 0.8181463041721796], [-0.5829709125349342, -1.3157287460344302, -0.7174755346232493, 0.06507000314946021], [-2.1244717005724487, -0.3204677247997718, -1.2831179756242097, -0.7939433395314669]], "tolerance": 1e-10, "name": "Pesos depois de três passos com W0 sorteado"},
  {"id": "w0-intacto", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_X = np.array([0, 1, 0, 2])\n_Y = np.array([1, 0, 2, 0])\n_W0 = np.random.default_rng(1).normal(0, 1, (3, 3))\n_copia = _W0.copy()\n_W, _h = treinar_bigrama(_X, _Y, 3, 5, 1.0, _W0)", "expr": "[bool(np.array_equal(_W0, _copia)), bool(_W is not _W0), list(_W.shape)]", "expected": [true, true, [3, 3]], "name": "W0 fica intacto e W é um array novo de forma (V, V)", "hint": "Comece de W0.copy()."},
  {"id": "tamanho-do-historico", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_X = np.array([0, 1, 0, 2])\n_Y = np.array([1, 0, 2, 0])\n_W0 = np.random.default_rng(1).normal(0, 1, (3, 3))\n_Wa, _ha = treinar_bigrama(_X, _Y, 3, 7, 1.0, _W0)\n_Wb, _hb = treinar_bigrama(_X, _Y, 3, 0, 1.0, _W0)", "expr": "[len(_ha), all(type(v) is float for v in _ha), _hb, bool(np.array_equal(_Wb, _W0))]", "expected": [7, true, [], true], "name": "historico tem um float por passo; com 0 passos, lista vazia e pesos iguais a W0"},
  {"id": "linha-nao-usada", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_X = np.array([0, 1, 0, 1])\n_Y = np.array([1, 0, 2, 3])\n_W0 = np.random.default_rng(2).normal(0, 1, (4, 4))\n_W, _h = treinar_bigrama(_X, _Y, 4, 4, 1.0, _W0)", "expr": "[bool(np.array_equal(_W[2], _W0[2])), bool(np.array_equal(_W[3], _W0[3])), bool(np.array_equal(_W[0], _W0[0]))]", "expected": [true, true, false], "name": "Linhas de caracteres que nunca são entrada não mudam", "hint": "Só as linhas indexadas por X recebem gradiente."},
  {"id": "perda-cai", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\n_X = np.array([0, 1, 2, 0, 2, 3, 1])\n_Y = np.array([1, 2, 0, 2, 3, 0, 0])\n_W, _h = treinar_bigrama(_X, _Y, 4, 30, 1.0, np.zeros((4, 4)))", "expr": "[bool(_h[i + 1] < _h[i]) for i in range(0, 29, 7)]", "expected": [true, true, true, true, true], "name": "A perda cai ao longo de 30 passos", "hint": "Confira o sinal da atualização: W -= taxa * dW."},
  {"id": "chega-nas-contagens", "checkpoint": 3, "kind": "expr", "setup": "import numpy as np\nfrom bigramas import carregar_nomes, construir_vocabulario, contar_bigramas, montar_pares\n_nomes = carregar_nomes()[:200]\n_stoi, _itos = construir_vocabulario(_nomes)\n_V = len(_itos)\n_X, _Y = montar_pares(_nomes, _stoi)\n_C = contar_bigramas(_nomes, _stoi)\n_Pc = _C / _C.sum(axis=1, keepdims=True)\n_ref = float(-np.log(_Pc[_X, _Y]).mean())\n_W, _h = treinar_bigrama(_X, _Y, _V, 100, 50.0, np.zeros((_V, _V)))\n_P = np.exp(_W - _W.max(axis=1, keepdims=True))\n_P = _P / _P.sum(axis=1, keepdims=True)\n_final = float(-np.log(_P[_X, _Y]).mean())", "expr": "[bool(_final >= _ref - 1e-9), bool(_final - _ref < 0.03)]", "expected": [true, true], "name": "200 nomes, 100 passos, taxa 50: a NLL fica a menos de 0,03 da NLL das contagens, sem passar dela", "hint": "A solução chega a 0,018 da NLL das contagens. Se a sua fica longe, confira se índices repetidos acumulam em dW."},
  {"id": "nomes-historico", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom bigramas import carregar_nomes, construir_vocabulario, montar_pares\n_nomes = carregar_nomes()[:200]\n_stoi, _itos = construir_vocabulario(_nomes)\n_V = len(_itos)\n_X, _Y = montar_pares(_nomes, _stoi)\n_W, _h = treinar_bigrama(_X, _Y, _V, 3, 50.0, np.zeros((_V, _V)))", "expr": "_h", "expected": [3.044522437723423, 2.726703915006254, 2.5744929348686205], "tolerance": 1e-10, "name": "200 nomes: as três primeiras perdas, a partir de ln 21"}
]
```

### Soluções erradas

```python name="indexação direta não acumula repetidos"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas, montar_pares


def treinar_bigrama(X, Y, V, passos, taxa, W0):
    W = W0.copy()
    n = X.shape[0]
    historico = []
    for _ in range(passos):
        Z = W[X]
        Z = Z - Z.max(axis=1, keepdims=True)
        P = np.exp(Z)
        P /= P.sum(axis=1, keepdims=True)
        historico.append(float(-np.log(P[np.arange(n), Y]).mean()))
        dZ = P
        dZ[np.arange(n), Y] -= 1.0
        dW = np.zeros_like(W)
        dW[X] += dZ / n
        W -= taxa * dW
    return W, historico
```

```python name="gradiente sem dividir por n"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas, montar_pares


def treinar_bigrama(X, Y, V, passos, taxa, W0):
    W = W0.copy()
    n = X.shape[0]
    historico = []
    for _ in range(passos):
        Z = W[X]
        Z = Z - Z.max(axis=1, keepdims=True)
        P = np.exp(Z)
        P /= P.sum(axis=1, keepdims=True)
        historico.append(float(-np.log(P[np.arange(n), Y]).mean()))
        dZ = P
        dZ[np.arange(n), Y] -= 1.0
        dW = np.zeros_like(W)
        np.add.at(dW, X, dZ)
        W -= taxa * dW
    return W, historico
```

```python name="W0 alterado no lugar"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas, montar_pares


def treinar_bigrama(X, Y, V, passos, taxa, W0):
    W = W0
    n = X.shape[0]
    historico = []
    for _ in range(passos):
        Z = W[X]
        Z = Z - Z.max(axis=1, keepdims=True)
        P = np.exp(Z)
        P /= P.sum(axis=1, keepdims=True)
        historico.append(float(-np.log(P[np.arange(n), Y]).mean()))
        dZ = P
        dZ[np.arange(n), Y] -= 1.0
        dW = np.zeros_like(W)
        np.add.at(dW, X, dZ / n)
        W -= taxa * dW
    return W, historico
```

```python name="perda registrada depois da atualização"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas, montar_pares


def treinar_bigrama(X, Y, V, passos, taxa, W0):
    W = W0.copy()
    n = X.shape[0]
    historico = []
    for _ in range(passos):
        Z = W[X]
        Z = Z - Z.max(axis=1, keepdims=True)
        P = np.exp(Z)
        P /= P.sum(axis=1, keepdims=True)
        dZ = P.copy()
        dZ[np.arange(n), Y] -= 1.0
        dW = np.zeros_like(W)
        np.add.at(dW, X, dZ / n)
        W -= taxa * dW
        Z = W[X]
        Z = Z - Z.max(axis=1, keepdims=True)
        P = np.exp(Z)
        P /= P.sum(axis=1, keepdims=True)
        historico.append(float(-np.log(P[np.arange(n), Y]).mean()))
    return W, historico
```

```python name="sinal da atualização trocado"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas, montar_pares


def treinar_bigrama(X, Y, V, passos, taxa, W0):
    W = W0.copy()
    n = X.shape[0]
    historico = []
    for _ in range(passos):
        Z = W[X]
        Z = Z - Z.max(axis=1, keepdims=True)
        P = np.exp(Z)
        P /= P.sum(axis=1, keepdims=True)
        historico.append(float(-np.log(P[np.arange(n), Y]).mean()))
        dZ = P
        dZ[np.arange(n), Y] -= 1.0
        dW = np.zeros_like(W)
        np.add.at(dW, X, dZ / n)
        W += taxa * dW
    return W, historico
```

```python name="gradiente sem subtrair o alvo"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas, montar_pares


def treinar_bigrama(X, Y, V, passos, taxa, W0):
    W = W0.copy()
    n = X.shape[0]
    historico = []
    for _ in range(passos):
        Z = W[X]
        Z = Z - Z.max(axis=1, keepdims=True)
        P = np.exp(Z)
        P /= P.sum(axis=1, keepdims=True)
        historico.append(float(-np.log(P[np.arange(n), Y]).mean()))
        dZ = P
        dW = np.zeros_like(W)
        np.add.at(dW, X, dZ / n)
        W -= taxa * dW
    return W, historico
```

```python name="softmax normalizada pelas colunas"
import numpy as np

from bigramas import carregar_nomes, construir_vocabulario, contar_bigramas, montar_pares


def treinar_bigrama(X, Y, V, passos, taxa, W0):
    W = W0.copy()
    n = X.shape[0]
    historico = []
    for _ in range(passos):
        Z = W[X]
        Z = Z - Z.max(axis=0, keepdims=True)
        P = np.exp(Z)
        P /= P.sum(axis=0, keepdims=True)
        historico.append(float(-np.log(P[np.arange(n), Y]).mean()))
        dZ = P
        dZ[np.arange(n), Y] -= 1.0
        dW = np.zeros_like(W)
        np.add.at(dW, X, dZ / n)
        W -= taxa * dW
    return W, historico
```

## Passo 8 · Quiz · Perplexidade

### Pergunta

No `nomes.txt`, o bigrama por contagem tem NLL de validação $2{,}1250$ (logaritmo natural). Um colega relata "perplexidade 133" para o mesmo modelo. O que aconteceu, e qual é o valor certo?

- [ ] Está certo: a perplexidade é $10^{\text{NLL}}$, e $10^{2{,}125} \approx 133$.
- [ ] Ele usou a NLL de treino; com a de validação, a perplexidade sobe para 21.
- [x] Ele calculou $10^{\text{NLL}}$ com uma NLL em logaritmo natural; o certo é $e^{2{,}1250} \approx 8{,}37$, perto de 8 opções igualmente prováveis por caractere.
- [ ] Ele esqueceu de dividir pelo número de pares; o certo é $2{,}1250 / 21 \approx 0{,}10$.

> A base da exponencial tem de ser a mesma do logaritmo da NLL: com `np.log`, é $e$. O valor 133 passa de 21, a perplexidade de quem não sabe nada com $V = 21$, o que já denuncia o erro. A NLL de treino ($2{,}1203$) daria $8{,}33$, não 21. Dividir a NLL por $V$ não tem significado: ela já é uma média por par.

### Pergunta

Dois modelos de bigramas foram avaliados nos mesmos 100 nomes de validação e num nome novo, `bruma`, cujo par `br` não aparece no treino.

| suavização | NLL de validação | NLL de `bruma` |
|---|---|---|
| 0 | 2,1250 | `inf` |
| 1 | 2,1684 | 2,7768 |

Qual leitura está correta?

- [ ] O modelo sem suavização é melhor em tudo: `inf` significa que ele tem certeza de que `bruma` não é um nome.
- [x] A suavização piora um pouco a validação porque tira probabilidade dos pares comuns, mas evita que um único par inédito torne a perda infinita.
- [ ] O `inf` vem de um erro de divisão por zero na normalização, e a suavização só esconde o defeito.
- [ ] A suavização 1 é pior nos dois casos, porque $2{,}7768 > 2{,}1250$.

> Probabilidade zero para algo possível é o pior erro que um modelo de linguagem pode cometer, e o `inf` impede até de comparar modelos. Ele não vem de divisão por zero: vem de `np.log(0)` num par com contagem zero. Comparar a NLL de `bruma` com a de validação mistura conjuntos diferentes; a comparação válida é linha a linha.

### Pergunta

O bigrama treinado por gradiente nos 5 145 pares de treino chega a NLL de treino $2{,}1376$ em 100 passos e $2{,}1258$ em 300. O bigrama por contagem tem $2{,}1203$ nos mesmos dados. Um colega propõe treinar por 10 000 passos para "passar das contagens". O que esperar?

- [ ] A NLL de treino cai abaixo de $2{,}1203$, porque o gradiente acha soluções que a contagem não acha.
- [ ] A NLL de treino volta a subir, porque a rede começa a decorar os nomes.
- [ ] A NLL de treino vai a zero, porque uma rede com 441 pesos decora 5 145 pares.
- [x] A NLL de treino se aproxima de $2{,}1203$ por cima e não passa: as frequências observadas são o mínimo dessa perda para qualquer modelo que só vê o caractere anterior.

> As duas formas descrevem o mesmo modelo, uma distribuição por linha, e as contagens normalizadas minimizam a NLL de treino dessa família. O gradiente só caminha até esse mínimo. Para ir abaixo é preciso mudar o modelo (mais contexto), não treinar mais. Em lote cheio com taxa estável, a perda de treino não volta a subir, e zero é impossível: depois de `a` vêm caracteres diferentes em nomes diferentes.
