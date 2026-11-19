---
slug: n6-m8-02-limitacoes-alucinacao-vies-e-interpretabilidade
titulo: 'Limitações: alucinação, viés e interpretabilidade'
descricao: Por que modelos de próximo token inventam, de onde vem o viés, o que se consegue interpretar (atenção, sondas, neurônios) e o que não, e implicações para uso responsável.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 90
tempo_min: 35
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Explicar a alucinação a partir do objetivo de treino e identificar situações de risco
- Descrever fontes de viés em dados e em ajuste fino e formas de medição
- Descrever técnicas de interpretabilidade (atenção, sondas lineares, ativação de neurônios) e seus limites
---

## Passo 1 · Leitura · Por que o modelo inventa

O mini-GPT foi treinado com um objetivo só: dar probabilidade alta ao próximo token do texto de treino. Nada nesse objetivo fala de verdade. O modelo não consulta uma base de fatos; ele calcula, a partir dos pesos, qual continuação é **plausível** depois do contexto. Quando o contexto é parecido com o treino, plausível e correto costumam coincidir. Quando não é, o modelo responde do mesmo jeito.

O corpus do curso tem padeira, ferreiro e pescador, e nenhum astronauta. Veja as três letras mais prováveis depois de cada começo, com os pesos pré-treinados da lição anterior:

```python
print(mais_provaveis("o ferreiro vende "))     # [('a', 0.505), ('o', 0.457), ('f', 0.012)]
print(mais_provaveis("o astronauta vende "))   # [('a', 0.505), ('o', 0.457), ('f', 0.012)]
print(mais_provaveis("antes da "))             # [('f', 0.66), ('c', 0.249), ('p', 0.057)]
```

As duas primeiras linhas são iguais. Escolhendo sempre a letra mais provável, o modelo escreve "o astronauta vende a farinha na", com a mesma segurança com que fala do ferreiro. Não existe um sinal de "nunca vi isso": a softmax sempre soma 1, e alguma continuação fica com a maior fatia. Essa resposta fluente sobre o que o modelo não tem como saber é o que se chama de **invenção**, ou **alucinação**.

A terceira linha mostra um erro sobre algo que o modelo viu. A gramática do corpus só escreve "antes da chuva" e "depois da festa". O modelo completa "antes da" com "festa", e dá 0,66 à primeira letra. Ele aprendeu que "da" costuma vir antes de "festa" e não ligou a palavra a "antes". A frase gerada é bem formada e falsa nas regras do corpus.

Daí vem a **calibração**. Um modelo é calibrado quando, entre as respostas dadas com probabilidade 0,7, perto de 70 % estão certas. A probabilidade que o modelo dá mede o quanto a continuação combina com o treino, e não a chance de a frase ser verdadeira. Um modelo pode acertar muito e ser mal calibrado, ou errar com probabilidade alta, como no exemplo. Acurácia e calibração são medidas diferentes, e as duas precisam de um gabarito externo.

Um modelo grande tem o mesmo objetivo e a mesma softmax. A escala reduz os erros sobre o que aparece muito no treino e não cria a verificação que o objetivo não pede.

## Passo 2 · Previsão · Completar com o mais provável

O "modelo" abaixo só conta. Para cada frase, ele guarda a última palavra duas vezes: sob o contexto inteiro e sob a palavra anterior. Ao completar, usa o contexto inteiro se já o viu; senão, recua para a última palavra do começo. A resposta vem com a fração das contagens que ela recebeu.

Preveja as duas linhas. O astronauta não aparece em nenhuma frase.

### Código

```python
frases = [
    "o padeiro vende pão",
    "o padeiro vende pão",
    "o padeiro vende pão",
    "o padeiro vende bolo",
    "o ferreiro vende pregos",
    "o pescador vende peixe",
]

contagem = {}
for frase in frases:
    palavras = frase.split()
    contexto, ultima = " ".join(palavras[:-1]), palavras[-1]
    for chave in (contexto, palavras[-2]):
        contagem.setdefault(chave, {})
        contagem[chave][ultima] = contagem[chave].get(ultima, 0) + 1


def completar(comeco):
    chave = comeco if comeco in contagem else comeco.split()[-1]
    opcoes = contagem[chave]
    melhor = max(opcoes, key=opcoes.get)
    return melhor, round(opcoes[melhor] / sum(opcoes.values()), 2)


print(*completar("o padeiro vende"))
print(*completar("o astronauta vende"))
```

### Dicas

1. "o padeiro vende" foi visto quatro vezes: três com "pão" e uma com "bolo".
2. "o astronauta vende" não é chave do dicionário, então o modelo usa a chave "vende", que juntou as seis frases.
3. O modelo não avisa que recuou: a segunda resposta sai no mesmo formato da primeira.

### Saída esperada

```text
pão 0.75
pão 0.5
```

## Passo 3 · Exercício · Medir acertos de fatos
modo: lacunas

Para saber quanto um modelo inventa, é preciso um gabarito. A gramática do corpus fornece um: depois de "antes da" vem sempre "chuva", depois de "depois da" vem "festa", depois de "até o" vem "almoço", e depois de "de" vem "manhã".

Complete `taxa_de_acerto(completar, fatos)`. `fatos` é um dicionário que leva cada começo à resposta certa, e `completar` é uma função que recebe um começo e devolve o texto que o modelo escreveu. A função devolve a fração dos fatos em que a resposta do modelo é igual à do gabarito, depois de **normalizar os espaços** dos dois lados: sem espaços nas pontas e com um espaço só entre as palavras (quebras de linha contam como espaço). Maiúsculas e minúsculas são diferentes. Sem nenhum fato, a taxa é `0.0`.

O completador é injetado: os casos passam completadores falsos, com respostas fixas. Medido com o mini-GPT da lição anterior, em começos como "o pastor leva o queijo na feira antes da ", o resultado foi 0,5: ele acertou "festa" e "almoço" e errou "chuva" e "manhã".

### Instruções

1. `normalizar`: tire os espaços das pontas e deixe um só entre as palavras.
2. `taxa_de_acerto`: chame o completador com cada começo, compare as respostas normalizadas e devolva os acertos divididos pelo número de fatos.

### Código inicial

```python
def normalizar(texto):
    return ___


def taxa_de_acerto(completar, fatos):
    if not fatos:
        return 0.0
    acertos = 0
    for comeco, resposta in fatos.items():
        if normalizar(completar(___)) == normalizar(resposta):
            acertos += 1
    return ___


if __name__ == "__main__":
    fatos = {"antes da": "chuva", "depois da": "festa", "até o": "almoço"}
    respostas = {"antes da": "festa", "depois da": " festa", "até o": "almoço"}
    print(taxa_de_acerto(lambda comeco: respostas[comeco], fatos))
```

### Solução

```python
def normalizar(texto):
    return " ".join(texto.split())


def taxa_de_acerto(completar, fatos):
    if not fatos:
        return 0.0
    acertos = 0
    for comeco, resposta in fatos.items():
        if normalizar(completar(comeco)) == normalizar(resposta):
            acertos += 1
    return acertos / len(fatos)


if __name__ == "__main__":
    fatos = {"antes da": "chuva", "depois da": "festa", "até o": "almoço"}
    respostas = {"antes da": "festa", "depois da": " festa", "até o": "almoço"}
    print(taxa_de_acerto(lambda comeco: respostas[comeco], fatos))
```

### Dicas

1. `texto.split()` sem argumentos separa por qualquer sequência de espaços e quebras de linha, e já descarta as pontas.
2. O completador recebe o começo (a chave do dicionário), não a resposta.
3. A taxa é uma fração entre 0 e 1: acertos sobre o total de fatos.

### Verificação

```json
[
  {"id": "tres-de-quatro", "checkpoint": 2, "kind": "expr", "setup": "_fatos = {\"antes da\": \"chuva\", \"depois da\": \"festa\", \"até o\": \"almoço\", \"de\": \"manhã\"}\n_tab = {\"antes da\": \"festa\", \"depois da\": \"festa\", \"até o\": \" almoço \", \"de\": \"manhã\\n\"}\n_falso = lambda comeco: _tab[comeco]\n", "expr": "taxa_de_acerto(_falso, _fatos)", "expected": 0.75, "tolerance": 1e-12, "name": "Três acertos em quatro fatos, dois deles com espaços sobrando", "hint": "\" almoço \" e \"manhã\\n\" contam como acerto depois de normalizar."},
  {"id": "tudo-certo", "checkpoint": 2, "kind": "expr", "setup": "_fatos = {\"antes da\": \"chuva\", \"depois da\": \"festa\", \"até o\": \"almoço\", \"de\": \"manhã\"}\n", "expr": "taxa_de_acerto(lambda comeco: _fatos[comeco], _fatos)", "expected": 1.0, "tolerance": 1e-12, "name": "Um completador que sabe todos os fatos tem taxa 1"},
  {"id": "tudo-errado", "checkpoint": 2, "kind": "expr", "setup": "_fatos = {\"antes da\": \"chuva\", \"depois da\": \"festa\", \"até o\": \"almoço\", \"de\": \"manhã\"}\n", "expr": "taxa_de_acerto(lambda comeco: \"farinha\", _fatos)", "expected": 0.0, "tolerance": 1e-12, "name": "Um completador que responde sempre \"farinha\" tem taxa 0"},
  {"id": "um-de-tres", "checkpoint": 2, "kind": "expr", "setup": "_f = {\"a\": \"chuva\", \"b\": \"festa\", \"c\": \"almoço\"}", "expr": "taxa_de_acerto(lambda comeco: \"festa\", _f)", "expected": 0.3333333333333333, "tolerance": 1e-12, "name": "Um acerto em três fatos: 1/3", "hint": "Divida os acertos pelo número de fatos."},
  {"id": "espacos-internos", "checkpoint": 1, "kind": "expr", "expr": "taxa_de_acerto(lambda comeco: \"  de   manhã\\n\", {\"feira\": \"de manhã\"})", "expected": 1.0, "tolerance": 1e-12, "name": "Espaços repetidos entre as palavras são reduzidos a um", "hint": "Tirar só as pontas não basta."},
  {"id": "gabarito-com-espacos", "checkpoint": 1, "kind": "expr", "expr": "taxa_de_acerto(lambda comeco: \"festa\", {\"depois da\": \" festa \"})", "expected": 1.0, "tolerance": 1e-12, "name": "O gabarito também é normalizado"},
  {"id": "palavras-coladas", "checkpoint": 1, "kind": "expr", "expr": "taxa_de_acerto(lambda comeco: \"demanhã\", {\"feira\": \"de manhã\"})", "expected": 0.0, "tolerance": 1e-12, "name": "\"demanhã\" não é \"de manhã\"", "hint": "Normalizar não é apagar os espaços: um espaço entre as palavras fica."},
  {"id": "normalizar-direto", "checkpoint": 1, "kind": "call", "function": "normalizar", "args": ["  a  padeira\tleva \n o pão "], "expected": "a padeira leva o pão", "name": "normalizar deixa um espaço entre as palavras e nenhum nas pontas"},
  {"id": "maiusculas", "checkpoint": 2, "kind": "expr", "expr": "taxa_de_acerto(lambda comeco: \"Chuva\", {\"antes da\": \"chuva\"})", "expected": 0.0, "tolerance": 1e-12, "name": "\"Chuva\" e \"chuva\" são respostas diferentes"},
  {"id": "recebe-o-comeco", "checkpoint": 2, "kind": "expr", "setup": "_fatos = {\"antes da\": \"chuva\", \"depois da\": \"festa\", \"até o\": \"almoço\", \"de\": \"manhã\"}\n_vistos = []\ndef _espia(comeco):\n    _vistos.append(comeco)\n    return \"\"\n", "expr": "[taxa_de_acerto(_espia, _fatos), sorted(_vistos)]", "expected": [0.0, ["antes da", "até o", "de", "depois da"]], "name": "O completador é chamado uma vez com cada começo"},
  {"id": "sem-fatos", "checkpoint": 2, "kind": "expr", "expr": "taxa_de_acerto(lambda comeco: \"festa\", {})", "expected": 0.0, "tolerance": 1e-12, "name": "Sem fatos, a taxa é 0.0"}
]
```

### Soluções erradas

```python name="compara sem normalizar"
def normalizar(texto):
    return texto


def taxa_de_acerto(completar, fatos):
    if not fatos:
        return 0.0
    acertos = 0
    for comeco, resposta in fatos.items():
        if normalizar(completar(comeco)) == normalizar(resposta):
            acertos += 1
    return acertos / len(fatos)


if __name__ == "__main__":
    fatos = {"antes da": "chuva", "depois da": "festa", "até o": "almoço"}
    respostas = {"antes da": "festa", "depois da": " festa", "até o": "almoço"}
    print(taxa_de_acerto(lambda comeco: respostas[comeco], fatos))
```

```python name="tira só os espaços das pontas"
def normalizar(texto):
    return texto.strip()


def taxa_de_acerto(completar, fatos):
    if not fatos:
        return 0.0
    acertos = 0
    for comeco, resposta in fatos.items():
        if normalizar(completar(comeco)) == normalizar(resposta):
            acertos += 1
    return acertos / len(fatos)


if __name__ == "__main__":
    fatos = {"antes da": "chuva", "depois da": "festa", "até o": "almoço"}
    respostas = {"antes da": "festa", "depois da": " festa", "até o": "almoço"}
    print(taxa_de_acerto(lambda comeco: respostas[comeco], fatos))
```

```python name="apaga todos os espaços"
def normalizar(texto):
    return "".join(texto.split())


def taxa_de_acerto(completar, fatos):
    if not fatos:
        return 0.0
    acertos = 0
    for comeco, resposta in fatos.items():
        if normalizar(completar(comeco)) == normalizar(resposta):
            acertos += 1
    return acertos / len(fatos)


if __name__ == "__main__":
    fatos = {"antes da": "chuva", "depois da": "festa", "até o": "almoço"}
    respostas = {"antes da": "festa", "depois da": " festa", "até o": "almoço"}
    print(taxa_de_acerto(lambda comeco: respostas[comeco], fatos))
```

```python name="ignora maiúsculas"
def normalizar(texto):
    return " ".join(texto.lower().split())


def taxa_de_acerto(completar, fatos):
    if not fatos:
        return 0.0
    acertos = 0
    for comeco, resposta in fatos.items():
        if normalizar(completar(comeco)) == normalizar(resposta):
            acertos += 1
    return acertos / len(fatos)


if __name__ == "__main__":
    fatos = {"antes da": "chuva", "depois da": "festa", "até o": "almoço"}
    respostas = {"antes da": "festa", "depois da": " festa", "até o": "almoço"}
    print(taxa_de_acerto(lambda comeco: respostas[comeco], fatos))
```

```python name="completador chamado com a resposta"
def normalizar(texto):
    return " ".join(texto.split())


def taxa_de_acerto(completar, fatos):
    if not fatos:
        return 0.0
    acertos = 0
    for comeco, resposta in fatos.items():
        if normalizar(completar(resposta)) == normalizar(resposta):
            acertos += 1
    return acertos / len(fatos)


if __name__ == "__main__":
    fatos = {"antes da": "chuva", "depois da": "festa", "até o": "almoço"}
    respostas = {"antes da": "festa", "depois da": " festa", "até o": "almoço"}
    print(taxa_de_acerto(lambda comeco: respostas[comeco], fatos))
```

```python name="devolve a contagem de acertos"
def normalizar(texto):
    return " ".join(texto.split())


def taxa_de_acerto(completar, fatos):
    if not fatos:
        return 0.0
    acertos = 0
    for comeco, resposta in fatos.items():
        if normalizar(completar(comeco)) == normalizar(resposta):
            acertos += 1
    return acertos


if __name__ == "__main__":
    fatos = {"antes da": "chuva", "depois da": "festa", "até o": "almoço"}
    respostas = {"antes da": "festa", "depois da": " festa", "até o": "almoço"}
    print(taxa_de_acerto(lambda comeco: respostas[comeco], fatos))
```

```python name="devolve a taxa de erro"
def normalizar(texto):
    return " ".join(texto.split())


def taxa_de_acerto(completar, fatos):
    if not fatos:
        return 0.0
    acertos = 0
    for comeco, resposta in fatos.items():
        if normalizar(completar(comeco)) == normalizar(resposta):
            acertos += 1
    return (len(fatos) - acertos) / len(fatos)


if __name__ == "__main__":
    fatos = {"antes da": "chuva", "depois da": "festa", "até o": "almoço"}
    respostas = {"antes da": "festa", "depois da": " festa", "até o": "almoço"}
    print(taxa_de_acerto(lambda comeco: respostas[comeco], fatos))
```

```python name="divisão invertida"
def normalizar(texto):
    return " ".join(texto.split())


def taxa_de_acerto(completar, fatos):
    if not fatos:
        return 0.0
    acertos = 0
    for comeco, resposta in fatos.items():
        if normalizar(completar(comeco)) == normalizar(resposta):
            acertos += 1
    return len(fatos) / acertos


if __name__ == "__main__":
    fatos = {"antes da": "chuva", "depois da": "festa", "até o": "almoço"}
    respostas = {"antes da": "festa", "depois da": " festa", "até o": "almoço"}
    print(taxa_de_acerto(lambda comeco: respostas[comeco], fatos))
```

## Passo 4 · Leitura · De onde vem o viés

Um modelo de linguagem aprende as proporções do texto de treino junto com todo o resto. Se uma forma aparece três vezes mais que outra nos dados, ela sai três vezes mais na geração, e o modelo não tem como saber se essa proporção é desejável.

O `nomes.txt` do módulo 6 foi gerado em dois estilos: 750 dos 1 000 nomes terminam em vogal e 250 em consoante. O modelo de bigramas treinado nele gerou 1 000 nomes com temperatura 1, e 738 terminaram em vogal. A proporção dos dados foi **reproduzida**.

Com temperatura menor que 1, a proporção é **ampliada**. A temperatura eleva cada probabilidade a $1/T$ e renormaliza:

$$q_i = \frac{p_i^{1/T}}{\sum_j p_j^{1/T}}$$

Para dois estilos com probabilidades 0,75 e 0,25 e $T = 0{,}5$, a conta dá $0{,}5625 / (0{,}5625 + 0{,}0625) = 0{,}90$. No modelo de bigramas, em que a temperatura age letra por letra, a fração medida em 1 000 nomes foi 0,862 com $T = 0{,}5$ e 0,958 com $T = 0{,}25$. O estilo minoritário, que era um quarto dos dados, quase desaparece. Quem gera com temperatura baixa para ter respostas "mais seguras" também está apagando o que é menos frequente.

Medir viés é estimar uma proporção, e proporção estimada tem intervalo de confiança, como no Nível 4:

```python
p, n = 0.738, 1000
margem = 1.96 * (p * (1 - p) / n) ** 0.5
print(round(p - margem, 3), round(p + margem, 3))    # 0.711 0.765
```

O intervalo contém 0,75: com 1 000 nomes, não há evidência de que o modelo mudou a proporção. Com 50 nomes, a margem é de 0,12, e duas amostras de 50 com $T = 0{,}5$ deram 0,74 e 0,90. A primeira, sozinha, sugeriria que a temperatura não tem efeito. Com amostra pequena, o ruído é do tamanho do efeito que se quer medir.

Três consequências práticas. O viés nasce nos dados, e escolher os dados é a primeira decisão sobre ele. O ajuste fino desloca as proporções na direção dos exemplos novos, mas não apaga o que o pré-treino aprendeu: o viés antigo reaparece fora do formato ajustado. E toda afirmação sobre viés precisa dizer o tamanho da amostra e o intervalo.

## Passo 5 · Exercício · Viés nos dados e na geração

Duas medidas: a proporção dos estilos numa lista de nomes e o que a temperatura faz com uma proporção.

`proporcao_por_estilo(nomes)` recebe uma lista de nomes em minúsculas, sem acentos, e devolve um dicionário com as chaves `"vogal"` e `"consoante"`: a fração dos nomes que termina em vogal (`a`, `e`, `i`, `o`, `u`) e a fração que termina em consoante. A conta é sobre **as amostras**: um nome que aparece três vezes conta três vezes. A lista vazia devolve as duas frações iguais a `0.0`.

`proporcao_com_temperatura(probs, temperatura)` recebe as probabilidades dos estilos (uma lista ou um array que soma 1) e devolve, como `float`, a fração que o estilo **majoritário** passa a ter depois da temperatura: cada probabilidade elevada a `1 / temperatura`, e o resultado renormalizado para somar 1. Temperatura menor ou igual a zero levanta `ValueError`. O array recebido não é alterado.

O `nomes.txt` é o do módulo 6. Com ele, a primeira função devolve 0,75 e 0,25.

### Instruções

1. `proporcao_por_estilo`: conte os nomes pela última letra e divida pelo total de nomes da lista.
2. `proporcao_com_temperatura`: valide a temperatura, eleve a `1 / temperatura`, renormalize e devolva a maior fração.

### Código inicial

```python
import numpy as np


def proporcao_por_estilo(nomes):
    # fração dos nomes que termina em vogal e fração que termina em consoante
    pass


def proporcao_com_temperatura(probs, temperatura):
    # eleve a 1/temperatura, renormalize e devolva a maior fração
    pass


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, proporcao_com_temperatura([0.75, 0.25], t))
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


def proporcao_por_estilo(nomes):
    if not nomes:
        return {"vogal": 0.0, "consoante": 0.0}
    vogais = sum(1 for nome in nomes if nome[-1] in "aeiou")
    return {"vogal": vogais / len(nomes), "consoante": (len(nomes) - vogais) / len(nomes)}


def proporcao_com_temperatura(probs, temperatura):
    if temperatura <= 0:
        raise ValueError("a temperatura deve ser positiva")
    q = np.asarray(probs, dtype=float) ** (1.0 / temperatura)
    q = q / q.sum()
    return float(q.max())


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, round(proporcao_com_temperatura([0.75, 0.25], t), 3))
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

1. A última letra de um nome é `nome[-1]`.
2. Depois de elevar a `1 / temperatura`, os números não somam mais 1: divida pela soma.
3. O estilo majoritário é o de maior probabilidade, em qualquer posição do array.

### Verificação

```json
[
  {"id": "nomes-do-curso", "checkpoint": 1, "kind": "expr", "setup": "with open(\"nomes.txt\", encoding=\"utf-8\") as _arq:\n    _nomes = _arq.read().split()\n", "expr": "[proporcao_por_estilo(_nomes)[\"vogal\"], proporcao_por_estilo(_nomes)[\"consoante\"]]", "expected": [0.75, 0.25], "tolerance": 1e-12, "name": "nomes.txt: 0,75 em vogal e 0,25 em consoante"},
  {"id": "lista-curta", "checkpoint": 1, "kind": "expr", "expr": "proporcao_por_estilo([\"nilema\", \"itinar\", \"zasa\", \"otere\", \"vitupa\"])[\"vogal\"]", "expected": 0.8, "tolerance": 1e-12, "name": "Quatro de cinco nomes terminam em vogal", "hint": "O que decide o estilo é a última letra, não a primeira."},
  {"id": "repetidos-contam", "checkpoint": 1, "kind": "expr", "expr": "proporcao_por_estilo([\"zasa\", \"zasa\", \"zasa\", \"itinar\"])[\"vogal\"]", "expected": 0.75, "tolerance": 1e-12, "name": "Nomes repetidos contam todas as vezes", "hint": "A proporção é sobre as amostras, não sobre os nomes distintos."},
  {"id": "chaves", "checkpoint": 1, "kind": "expr", "expr": "sorted(proporcao_por_estilo([\"zasa\", \"itinar\"]))", "expected": ["consoante", "vogal"], "name": "O dicionário tem as chaves \"vogal\" e \"consoante\""},
  {"id": "so-consoantes", "checkpoint": 1, "kind": "expr", "expr": "[proporcao_por_estilo([\"itinar\", \"salamam\"])[k] for k in (\"vogal\", \"consoante\")]", "expected": [0.0, 1.0], "tolerance": 1e-12, "name": "Só nomes terminados em consoante: 0 e 1"},
  {"id": "lista-vazia", "checkpoint": 1, "kind": "expr", "expr": "[proporcao_por_estilo([])[k] for k in (\"vogal\", \"consoante\")]", "expected": [0.0, 0.0], "tolerance": 1e-12, "name": "A lista vazia devolve 0.0 nas duas frações"},
  {"id": "temperatura-um", "checkpoint": 2, "kind": "call", "function": "proporcao_com_temperatura", "args": [[0.75, 0.25], 1.0], "expected": 0.75, "tolerance": 1e-12, "name": "Temperatura 1 não muda a proporção"},
  {"id": "temperatura-meio", "checkpoint": 2, "kind": "call", "function": "proporcao_com_temperatura", "args": [[0.75, 0.25], 0.5], "expected": 0.9, "tolerance": 1e-12, "name": "Temperatura 0,5 leva 0,75 a 0,90", "hint": "0,5625 e 0,0625 não somam 1: renormalize."},
  {"id": "temperatura-dois", "checkpoint": 2, "kind": "call", "function": "proporcao_com_temperatura", "args": [[0.75, 0.25], 2.0], "expected": 0.6339745962155613, "tolerance": 1e-12, "name": "Temperatura 2 aproxima as frações", "hint": "O expoente é 1 / temperatura."},
  {"id": "majoritario-no-fim", "checkpoint": 2, "kind": "call", "function": "proporcao_com_temperatura", "args": [[0.2, 0.8], 0.5], "expected": 0.9411764705882353, "tolerance": 1e-12, "name": "O estilo majoritário pode estar em qualquer posição"},
  {"id": "tres-estilos", "checkpoint": 2, "kind": "call", "function": "proporcao_com_temperatura", "args": [[0.3, 0.5, 0.2], 0.5], "expected": 0.6578947368421053, "tolerance": 1e-12, "name": "Três estilos com temperatura 0,5"},
  {"id": "array-intacto", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_p = np.array([0.75, 0.25])\n_r = proporcao_com_temperatura(_p, 0.25)", "expr": "[_r, _p.tolist()]", "expected": [0.9878048780487805, [0.75, 0.25]], "tolerance": 1e-12, "name": "Com um array do numpy, o resultado sai e o array fica como estava"},
  {"id": "temperatura-zero", "checkpoint": 2, "kind": "expr", "expr": "proporcao_com_temperatura([0.75, 0.25], 0)", "raises": "ValueError", "name": "Temperatura 0 levanta ValueError"},
  {"id": "temperatura-negativa", "checkpoint": 2, "kind": "expr", "expr": "proporcao_com_temperatura([0.75, 0.25], -1.0)", "raises": "ValueError", "name": "Temperatura negativa levanta ValueError"}
]
```

### Soluções erradas

```python name="proporção sobre os nomes distintos"
import numpy as np


def proporcao_por_estilo(nomes):
    if not nomes:
        return {"vogal": 0.0, "consoante": 0.0}
    nomes = sorted(set(nomes))
    vogais = sum(1 for nome in nomes if nome[-1] in "aeiou")
    return {"vogal": vogais / len(nomes), "consoante": (len(nomes) - vogais) / len(nomes)}


def proporcao_com_temperatura(probs, temperatura):
    if temperatura <= 0:
        raise ValueError("a temperatura deve ser positiva")
    q = np.asarray(probs, dtype=float) ** (1.0 / temperatura)
    q = q / q.sum()
    return float(q.max())


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, round(proporcao_com_temperatura([0.75, 0.25], t), 3))
```

```python name="estilo decidido pela primeira letra"
import numpy as np


def proporcao_por_estilo(nomes):
    if not nomes:
        return {"vogal": 0.0, "consoante": 0.0}
    vogais = sum(1 for nome in nomes if nome[0] in "aeiou")
    return {"vogal": vogais / len(nomes), "consoante": (len(nomes) - vogais) / len(nomes)}


def proporcao_com_temperatura(probs, temperatura):
    if temperatura <= 0:
        raise ValueError("a temperatura deve ser positiva")
    q = np.asarray(probs, dtype=float) ** (1.0 / temperatura)
    q = q / q.sum()
    return float(q.max())


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, round(proporcao_com_temperatura([0.75, 0.25], t), 3))
```

```python name="lista vazia levanta ZeroDivisionError"
import numpy as np


def proporcao_por_estilo(nomes):
    vogais = sum(1 for nome in nomes if nome[-1] in "aeiou")
    return {"vogal": vogais / len(nomes), "consoante": (len(nomes) - vogais) / len(nomes)}


def proporcao_com_temperatura(probs, temperatura):
    if temperatura <= 0:
        raise ValueError("a temperatura deve ser positiva")
    q = np.asarray(probs, dtype=float) ** (1.0 / temperatura)
    q = q / q.sum()
    return float(q.max())


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, round(proporcao_com_temperatura([0.75, 0.25], t), 3))
```

```python name="temperatura sem renormalizar"
import numpy as np


def proporcao_por_estilo(nomes):
    if not nomes:
        return {"vogal": 0.0, "consoante": 0.0}
    vogais = sum(1 for nome in nomes if nome[-1] in "aeiou")
    return {"vogal": vogais / len(nomes), "consoante": (len(nomes) - vogais) / len(nomes)}


def proporcao_com_temperatura(probs, temperatura):
    if temperatura <= 0:
        raise ValueError("a temperatura deve ser positiva")
    q = np.asarray(probs, dtype=float) ** (1.0 / temperatura)
    return float(q.max())


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, round(proporcao_com_temperatura([0.75, 0.25], t), 3))
```

```python name="expoente igual à temperatura"
import numpy as np


def proporcao_por_estilo(nomes):
    if not nomes:
        return {"vogal": 0.0, "consoante": 0.0}
    vogais = sum(1 for nome in nomes if nome[-1] in "aeiou")
    return {"vogal": vogais / len(nomes), "consoante": (len(nomes) - vogais) / len(nomes)}


def proporcao_com_temperatura(probs, temperatura):
    if temperatura <= 0:
        raise ValueError("a temperatura deve ser positiva")
    q = np.asarray(probs, dtype=float) ** temperatura
    q = q / q.sum()
    return float(q.max())


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, round(proporcao_com_temperatura([0.75, 0.25], t), 3))
```

```python name="probabilidades divididas pela temperatura"
import numpy as np


def proporcao_por_estilo(nomes):
    if not nomes:
        return {"vogal": 0.0, "consoante": 0.0}
    vogais = sum(1 for nome in nomes if nome[-1] in "aeiou")
    return {"vogal": vogais / len(nomes), "consoante": (len(nomes) - vogais) / len(nomes)}


def proporcao_com_temperatura(probs, temperatura):
    if temperatura <= 0:
        raise ValueError("a temperatura deve ser positiva")
    q = np.asarray(probs, dtype=float) / temperatura
    q = q / q.sum()
    return float(q.max())


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, round(proporcao_com_temperatura([0.75, 0.25], t), 3))
```

```python name="devolve a fração do primeiro estilo"
import numpy as np


def proporcao_por_estilo(nomes):
    if not nomes:
        return {"vogal": 0.0, "consoante": 0.0}
    vogais = sum(1 for nome in nomes if nome[-1] in "aeiou")
    return {"vogal": vogais / len(nomes), "consoante": (len(nomes) - vogais) / len(nomes)}


def proporcao_com_temperatura(probs, temperatura):
    if temperatura <= 0:
        raise ValueError("a temperatura deve ser positiva")
    q = np.asarray(probs, dtype=float) ** (1.0 / temperatura)
    q = q / q.sum()
    return float(q[0])


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, round(proporcao_com_temperatura([0.75, 0.25], t), 3))
```

```python name="temperatura não é validada"
import numpy as np


def proporcao_por_estilo(nomes):
    if not nomes:
        return {"vogal": 0.0, "consoante": 0.0}
    vogais = sum(1 for nome in nomes if nome[-1] in "aeiou")
    return {"vogal": vogais / len(nomes), "consoante": (len(nomes) - vogais) / len(nomes)}


def proporcao_com_temperatura(probs, temperatura):
    q = np.asarray(probs, dtype=float) ** (1.0 / temperatura)
    q = q / q.sum()
    return float(q.max())


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, round(proporcao_com_temperatura([0.75, 0.25], t), 3))
```

```python name="temperatura aplicada no array recebido"
import numpy as np


def proporcao_por_estilo(nomes):
    if not nomes:
        return {"vogal": 0.0, "consoante": 0.0}
    vogais = sum(1 for nome in nomes if nome[-1] in "aeiou")
    return {"vogal": vogais / len(nomes), "consoante": (len(nomes) - vogais) / len(nomes)}


def proporcao_com_temperatura(probs, temperatura):
    if temperatura <= 0:
        raise ValueError("a temperatura deve ser positiva")
    q = np.asarray(probs, dtype=float)
    q **= 1.0 / temperatura
    q /= q.sum()
    return float(q.max())


if __name__ == "__main__":
    with open("nomes.txt", encoding="utf-8") as arq:
        nomes = arq.read().split()
    print(proporcao_por_estilo(nomes))
    for t in (1.0, 0.5, 0.25):
        print(t, round(proporcao_com_temperatura([0.75, 0.25], t), 3))
```

## Passo 6 · Leitura · O que dá para interpretar

Os pesos de um modelo estão todos à vista, e mesmo assim é difícil dizer por que ele deu uma resposta. Três técnicas ajudam, e cada uma tem um limite claro.

**Pesos de atenção.** A matriz $A$ do módulo 7 diz quanto cada posição entrou na média ponderada de outra. Ela mostra para onde a média olhou, e não quanto cada token contribuiu para a saída, porque a saída depende também dos valores que foram somados:

```python
A = np.array([0.70, 0.20, 0.10])                     # pesos da última posição
V = np.array([[1.0, 0.0], [0.0, 5.0], [0.0, 0.0]])   # valores das três posições
print(A @ V)                                          # [0.7 1. ]
```

O token com peso 0,20 pesou mais no resultado que o de peso 0,70. Depois da atenção ainda vêm o MLP, as conexões residuais e, num modelo real, outros blocos e cabeças. Um mapa de atenção é uma descrição de uma etapa do cálculo. Ele não é uma explicação causal: para afirmar que um token causou a saída, é preciso intervir (trocar o token e medir o que muda).

**Sondas lineares.** Uma sonda é um classificador simples, como a regressão logística do Nível 5, treinado para ler uma informação nos estados escondidos. Nos estados do mini-GPT, uma sonda que responde "o caractere desta posição é uma vogal?" chegou a 0,98 de acurácia em estados que não usou no treino. Parece mostrar que o modelo "sabe" o que é vogal. A mesma sonda, nos estados de um mini-GPT com pesos sorteados, que nunca treinou, chegou a 0,87. A informação já estava nos embeddings de entrada, e a sonda a recuperou. Uma sonda mede se a informação é **recuperável** dos estados; ela não mostra que o modelo a usa. O controle obrigatório é repetir a sonda com os rótulos embaralhados: nos mesmos estados, a acurácia ficou entre 0,43 e 0,60, perto do acaso.

**Neurônios.** Com mais conceitos do que dimensões, a rede sobrepõe vários em cada neurônio, e o mesmo neurônio responde a coisas sem relação entre si. São os neurônios **polissêmicos**.

Para quem usa um modelo, as três lições deste texto são as mesmas do Nível 7: conferir os fatos em outra fonte, desconfiar da confiança e medir antes de afirmar.

## Passo 7 · Exercício · Uma sonda linear

O arquivo `estados.txt` guarda 240 estados escondidos do mini-GPT pré-treinado: o vetor de 32 números da última posição de 240 trechos do texto de validação, depois da normalização final. O rótulo é 1 quando o caractere dessa posição é uma vogal, e há 120 de cada. `carregar_estados()` devolve `(estados, rotulos)`, já em ordem embaralhada.

Escreva a sonda em duas funções.

`treinar_logistica(X, y, passos, taxa)` treina uma regressão logística por descida de gradiente em lote cheio e devolve `(w, b)`. `w` começa como um array de zeros com uma entrada por coluna de `X`, e `b` começa em `0.0`. Em cada passo, com $p = \sigma(Xw + b)$ e $n$ exemplos:

$$w \leftarrow w - \text{taxa} \cdot \frac{X^\top (p - y)}{n} \qquad b \leftarrow b - \text{taxa} \cdot \text{média}(p - y)$$

`sonda_linear(estados, rotulos, passos, taxa)` treina nos primeiros 75 % dos estados (`corte = int(0.75 * len(estados))`) e devolve, como `float`, a acurácia nos estados **restantes**. A sonda prevê 1 quando a probabilidade é pelo menos 0,5. Os arrays recebidos não são alterados.

### Instruções

1. `treinar_logistica`: `w` e `b` em zero, e `passos` atualizações com o gradiente médio de todos os exemplos.
2. `sonda_linear`: treine com os estados antes do corte e meça a acurácia só nos estados depois dele.

### Código inicial

```python
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    # w e b começam em zero; cada passo usa todos os exemplos
    pass


def sonda_linear(estados, rotulos, passos, taxa):
    # treine nos primeiros 75 % e devolva a acurácia nos estados restantes
    pass


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(sonda_linear(estados, rotulos, 200, 0.5))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(sonda_linear(estados, embaralhados, 200, 0.5))
```
```python path=estados.py
"""Estados escondidos do mini-GPT do curso, guardados para a sonda."""
import base64
import json

import numpy as np


def carregar_estados(caminho="estados.txt"):
    """Devolve (estados (240, 32), rotulos (240,)): rótulo 1 quando o caractere da posição é uma vogal."""
    with open(caminho, encoding="utf-8") as arq:
        cabecalho = json.loads(arq.readline())
        plano = np.frombuffer(base64.b64decode(arq.readline().strip()), dtype=np.float16).astype(np.float64)
    return plano.reshape(cabecalho["forma"]), np.array(cabecalho["rotulos"])
```
```text path=estados.txt
{"forma": [240, 32], "rotulos": [1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1]}
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
```

### Solução

```python
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(passos):
        p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
        erro = p - y
        w = w - taxa * (X.T @ erro) / n
        b = b - taxa * float(erro.mean())
    return w, b


def sonda_linear(estados, rotulos, passos, taxa):
    corte = int(0.75 * len(estados))
    w, b = treinar_logistica(estados[:corte], rotulos[:corte], passos, taxa)
    previsoes = (estados[corte:] @ w + b) >= 0
    return float((previsoes == (rotulos[corte:] == 1)).mean())


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(round(sonda_linear(estados, rotulos, 200, 0.5), 3))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(round(sonda_linear(estados, embaralhados, 200, 0.5), 3))
```
```python path=estados.py
"""Estados escondidos do mini-GPT do curso, guardados para a sonda."""
import base64
import json

import numpy as np


def carregar_estados(caminho="estados.txt"):
    """Devolve (estados (240, 32), rotulos (240,)): rótulo 1 quando o caractere da posição é uma vogal."""
    with open(caminho, encoding="utf-8") as arq:
        cabecalho = json.loads(arq.readline())
        plano = np.frombuffer(base64.b64decode(arq.readline().strip()), dtype=np.float16).astype(np.float64)
    return plano.reshape(cabecalho["forma"]), np.array(cabecalho["rotulos"])
```
```text path=estados.txt
{"forma": [240, 32], "rotulos": [1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1]}
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
```

### Dicas

1. A sigmoide é `1 / (1 + np.exp(-z))`, e probabilidade de pelo menos 0,5 é o mesmo que $z \ge 0$.
2. O gradiente de `w` é `X.T @ (p - y) / n`; o de `b` é a média de `p - y`.
3. Acurácia medida nos estados do treino não diz se a informação se generaliza: use `estados[corte:]`.

### Verificação

```json
[
  {"id": "zero-passos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X = np.array([[1.0, 2.0], [3.0, -1.0], [-1.5, 0.5], [0.5, -2.0], [2.0, 2.5]])\n_y = np.array([1, 1, 0, 0, 1])\n", "expr": "[treinar_logistica(_X, _y, 0, 0.5)[0].tolist(), float(treinar_logistica(_X, _y, 0, 0.5)[1])]", "expected": [[0.0, 0.0], 0.0], "name": "Sem passos, w e b ficam em zero"},
  {"id": "um-passo", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X = np.array([[1.0, 2.0], [3.0, -1.0], [-1.5, 0.5], [0.5, -2.0], [2.0, 2.5]])\n_y = np.array([1, 1, 0, 0, 1])\n", "expr": "[treinar_logistica(_X, _y, 1, 0.5)[0].tolist(), float(treinar_logistica(_X, _y, 1, 0.5)[1])]", "expected": [[0.35, 0.25], 0.05], "tolerance": 1e-12, "name": "Um passo a partir de zero, com 5 exemplos", "hint": "No primeiro passo todas as probabilidades valem 0,5. O gradiente é dividido pelo número de exemplos."},
  {"id": "tres-passos", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X = np.array([[1.0, 2.0], [3.0, -1.0], [-1.5, 0.5], [0.5, -2.0], [2.0, 2.5]])\n_y = np.array([1, 1, 0, 0, 1])\n", "expr": "[treinar_logistica(_X, _y, 3, 0.5)[0].tolist(), float(treinar_logistica(_X, _y, 3, 0.5)[1])]", "expected": [[0.6896534860301273, 0.4983513609349557], 0.022336715336038232], "tolerance": 1e-12, "name": "Três passos com taxa 0,5"},
  {"id": "vies-muda", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\n_X = np.array([[1.0, 2.0], [3.0, -1.0], [-1.5, 0.5], [0.5, -2.0], [2.0, 2.5]])\n_y = np.array([1, 1, 0, 0, 1])\n", "expr": "float(treinar_logistica(_X, _y, 1, 1.0)[1])", "expected": 0.1, "tolerance": 1e-12, "name": "Com 3 rótulos 1 em 5, o viés sobe no primeiro passo", "hint": "O viés também é atualizado, com a média de p - y."},
  {"id": "forma-de-w", "checkpoint": 1, "kind": "expr", "setup": "import numpy as np\nfrom estados import carregar_estados\n_X, _y = carregar_estados()\n", "expr": "list(treinar_logistica(_X, _y, 2, 0.5)[0].shape)", "expected": [32], "name": "Com os estados da lição, w tem 32 entradas"},
  {"id": "sonda-pequena", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\n_X = np.array([[2.0, 1.0], [-2.0, -1.0], [1.5, 2.0], [-1.0, -2.0], [2.5, 0.5], [-2.5, -0.5], [1.0, 1.0], [2.0, 2.0]])\n_y = np.array([1, 0, 1, 0, 1, 0, 1, 0])\n", "expr": "sonda_linear(_X, _y, 50, 0.5)", "expected": 0.5, "tolerance": 1e-12, "name": "8 exemplos: treina com 6 e acerta 1 dos 2 restantes", "hint": "Os 6 primeiros são separáveis; o último exemplo tem o rótulo trocado. A acurácia é medida só nos 2 últimos."},
  {"id": "sonda-estados", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom estados import carregar_estados\n_X, _y = carregar_estados()\n", "expr": "sonda_linear(_X, _y, 200, 0.5)", "expected": 0.9833333333333333, "tolerance": 1e-09, "name": "Estados da lição, 200 passos: 59 acertos em 60", "hint": "A acurácia nos 180 estados do treino é outra (0,989)."},
  {"id": "sonda-poucos-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom estados import carregar_estados\n_X, _y = carregar_estados()\n", "expr": "sonda_linear(_X, _y, 20, 0.5)", "expected": 0.9333333333333333, "tolerance": 1e-09, "name": "Estados da lição, 20 passos"},
  {"id": "sonda-zero-passos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom estados import carregar_estados\n_X, _y = carregar_estados()\n", "expr": "sonda_linear(_X, _y, 0, 0.5)", "expected": 0.5833333333333334, "tolerance": 1e-09, "name": "Sem treino, a sonda prevê 1 para todos: 35 acertos em 60", "hint": "Com w e b em zero, a probabilidade é 0,5, e 0,5 já conta como 1."},
  {"id": "rotulos-embaralhados", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom estados import carregar_estados\n_X, _y = carregar_estados()\n_ys = np.random.default_rng(3).permutation(_y)\n", "expr": "sonda_linear(_X, _ys, 200, 0.5)", "expected": 0.43333333333333335, "tolerance": 1e-09, "name": "Com os rótulos embaralhados, a acurácia fica perto do acaso"},
  {"id": "embaralhados-no-acaso", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom estados import carregar_estados\n_X, _y = carregar_estados()\n_acc = [sonda_linear(_X, np.random.default_rng(s).permutation(_y), 200, 0.5) for s in range(4)]\n", "expr": "bool(0.4 <= sum(_acc) / 4 <= 0.6)", "expected": true, "name": "Quatro embaralhamentos: a acurácia média fica entre 0,4 e 0,6"},
  {"id": "arrays-intactos", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np\nfrom estados import carregar_estados\n_X, _y = carregar_estados()\n_X0, _y0 = _X.copy(), _y.copy()\n_r = sonda_linear(_X, _y, 5, 0.5)\n", "expr": "[bool(np.array_equal(_X, _X0)), bool(np.array_equal(_y, _y0))]", "expected": [true, true], "name": "Estados e rótulos continuam como estavam"}
]
```

### Soluções erradas

```python name="acurácia medida nos estados do treino"
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(passos):
        p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
        erro = p - y
        w = w - taxa * (X.T @ erro) / n
        b = b - taxa * float(erro.mean())
    return w, b


def sonda_linear(estados, rotulos, passos, taxa):
    corte = int(0.75 * len(estados))
    w, b = treinar_logistica(estados[:corte], rotulos[:corte], passos, taxa)
    previsoes = (estados[:corte] @ w + b) >= 0
    return float((previsoes == (rotulos[:corte] == 1)).mean())


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(round(sonda_linear(estados, rotulos, 200, 0.5), 3))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(round(sonda_linear(estados, embaralhados, 200, 0.5), 3))
```

```python name="acurácia medida em todos os estados"
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(passos):
        p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
        erro = p - y
        w = w - taxa * (X.T @ erro) / n
        b = b - taxa * float(erro.mean())
    return w, b


def sonda_linear(estados, rotulos, passos, taxa):
    corte = int(0.75 * len(estados))
    w, b = treinar_logistica(estados[:corte], rotulos[:corte], passos, taxa)
    previsoes = (estados @ w + b) >= 0
    return float((previsoes == (rotulos == 1)).mean())


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(round(sonda_linear(estados, rotulos, 200, 0.5), 3))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(round(sonda_linear(estados, embaralhados, 200, 0.5), 3))
```

```python name="treina com todos os estados"
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(passos):
        p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
        erro = p - y
        w = w - taxa * (X.T @ erro) / n
        b = b - taxa * float(erro.mean())
    return w, b


def sonda_linear(estados, rotulos, passos, taxa):
    corte = int(0.75 * len(estados))
    w, b = treinar_logistica(estados, rotulos, passos, taxa)
    previsoes = (estados[corte:] @ w + b) >= 0
    return float((previsoes == (rotulos[corte:] == 1)).mean())


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(round(sonda_linear(estados, rotulos, 200, 0.5), 3))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(round(sonda_linear(estados, embaralhados, 200, 0.5), 3))
```

```python name="treina com 25 % e avalia em 75 %"
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(passos):
        p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
        erro = p - y
        w = w - taxa * (X.T @ erro) / n
        b = b - taxa * float(erro.mean())
    return w, b


def sonda_linear(estados, rotulos, passos, taxa):
    corte = int(0.25 * len(estados))
    w, b = treinar_logistica(estados[:corte], rotulos[:corte], passos, taxa)
    previsoes = (estados[corte:] @ w + b) >= 0
    return float((previsoes == (rotulos[corte:] == 1)).mean())


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(round(sonda_linear(estados, rotulos, 200, 0.5), 3))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(round(sonda_linear(estados, embaralhados, 200, 0.5), 3))
```

```python name="gradiente sem dividir pelo número de exemplos"
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(passos):
        p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
        erro = p - y
        w = w - taxa * (X.T @ erro)
        b = b - taxa * float(erro.mean())
    return w, b


def sonda_linear(estados, rotulos, passos, taxa):
    corte = int(0.75 * len(estados))
    w, b = treinar_logistica(estados[:corte], rotulos[:corte], passos, taxa)
    previsoes = (estados[corte:] @ w + b) >= 0
    return float((previsoes == (rotulos[corte:] == 1)).mean())


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(round(sonda_linear(estados, rotulos, 200, 0.5), 3))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(round(sonda_linear(estados, embaralhados, 200, 0.5), 3))
```

```python name="viés não é atualizado"
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(passos):
        p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
        erro = p - y
        w = w - taxa * (X.T @ erro) / n
    return w, b


def sonda_linear(estados, rotulos, passos, taxa):
    corte = int(0.75 * len(estados))
    w, b = treinar_logistica(estados[:corte], rotulos[:corte], passos, taxa)
    previsoes = (estados[corte:] @ w + b) >= 0
    return float((previsoes == (rotulos[corte:] == 1)).mean())


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(round(sonda_linear(estados, rotulos, 200, 0.5), 3))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(round(sonda_linear(estados, embaralhados, 200, 0.5), 3))
```

```python name="sinal trocado na atualização"
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(passos):
        p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
        erro = p - y
        w = w + taxa * (X.T @ erro) / n
        b = b + taxa * float(erro.mean())
    return w, b


def sonda_linear(estados, rotulos, passos, taxa):
    corte = int(0.75 * len(estados))
    w, b = treinar_logistica(estados[:corte], rotulos[:corte], passos, taxa)
    previsoes = (estados[corte:] @ w + b) >= 0
    return float((previsoes == (rotulos[corte:] == 1)).mean())


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(round(sonda_linear(estados, rotulos, 200, 0.5), 3))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(round(sonda_linear(estados, embaralhados, 200, 0.5), 3))
```

```python name="probabilidade 0,5 conta como classe 0"
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(passos):
        p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
        erro = p - y
        w = w - taxa * (X.T @ erro) / n
        b = b - taxa * float(erro.mean())
    return w, b


def sonda_linear(estados, rotulos, passos, taxa):
    corte = int(0.75 * len(estados))
    w, b = treinar_logistica(estados[:corte], rotulos[:corte], passos, taxa)
    previsoes = (estados[corte:] @ w + b) > 0
    return float((previsoes == (rotulos[corte:] == 1)).mean())


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(round(sonda_linear(estados, rotulos, 200, 0.5), 3))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(round(sonda_linear(estados, embaralhados, 200, 0.5), 3))
```

```python name="limiar 0,5 aplicado ao logit"
import numpy as np

from estados import carregar_estados


def treinar_logistica(X, y, passos, taxa):
    n, d = X.shape
    w, b = np.zeros(d), 0.0
    for _ in range(passos):
        p = 1.0 / (1.0 + np.exp(-(X @ w + b)))
        erro = p - y
        w = w - taxa * (X.T @ erro) / n
        b = b - taxa * float(erro.mean())
    return w, b


def sonda_linear(estados, rotulos, passos, taxa):
    corte = int(0.75 * len(estados))
    w, b = treinar_logistica(estados[:corte], rotulos[:corte], passos, taxa)
    previsoes = (estados[corte:] @ w + b) >= 0.5
    return float((previsoes == (rotulos[corte:] == 1)).mean())


if __name__ == "__main__":
    estados, rotulos = carregar_estados()
    print(round(sonda_linear(estados, rotulos, 200, 0.5), 3))
    embaralhados = np.random.default_rng(0).permutation(rotulos)
    print(round(sonda_linear(estados, embaralhados, 200, 0.5), 3))
```

## Passo 8 · Quiz · Atenção não é explicação

### Pergunta

Numa cabeça de atenção, a última posição distribui os pesos $[0{,}80,\ 0{,}15,\ 0{,}05]$ entre três tokens. Um relatório conclui: "o modelo deu a resposta por causa do primeiro token, que recebeu 80 % da atenção". O que os pesos permitem afirmar?

- [ ] Que o primeiro token causou a resposta, porque 0,80 é maior que os outros pesos somados.
- [x] Que o primeiro token teve o maior peso na média dessa cabeça; para falar de causa, é preciso trocar o token e medir a mudança na saída.
- [ ] Nada, porque pesos de atenção são sorteados a cada execução.
- [ ] Que os outros dois tokens foram ignorados pelo modelo.

> Os pesos descrevem a média ponderada de uma cabeça. A saída depende também dos valores somados, do MLP, das conexões residuais e das outras cabeças, então peso alto não é causa: a evidência causal vem de uma intervenção. Os pesos não são sorteados (o forward é determinístico). E 0,15 e 0,05 não são zero: um valor grande com peso pequeno pode dominar a soma.

### Pergunta

Uma sonda linear foi treinada para ler, nos estados escondidos, se o caractere da posição é uma vogal. Os resultados, sempre em estados fora do treino da sonda:

| estados | rótulos | acurácia |
|---|---|---|
| modelo treinado | corretos | 0,98 |
| modelo com pesos sorteados | corretos | 0,87 |
| modelo treinado | embaralhados | 0,52 |

Qual conclusão os três números sustentam?

- [ ] O modelo treinado usa o conceito de vogal para prever o próximo caractere.
- [ ] A sonda está com defeito, porque um modelo sem treino não poderia passar de 0,5.
- [x] A informação é recuperável dos estados, e boa parte dela já vem da entrada; os números não mostram que o modelo a usa.
- [ ] O controle com rótulos embaralhados prova que o modelo treinado não representa vogais.

> A sonda mede o que dá para ler nos estados. Como um modelo que nunca treinou chega a 0,87, a informação já está nos embeddings de entrada, e 0,98 não demonstra uso. O resultado sem treino não é defeito: vetores diferentes por caractere bastam para um classificador linear. O controle embaralhado (0,52, perto do acaso) mostra que a sonda não decora rótulos; ele não diz nada contra a representação.

### Pergunta

Um modelo respondeu 200 perguntas de um teste com gabarito. Em todas, a probabilidade que ele deu à própria resposta ficou perto de 0,9. Conferindo o gabarito, 120 respostas estavam certas. O que esse resultado mostra?

- [ ] O modelo está bem calibrado, porque a confiança foi constante.
- [ ] O modelo acerta 90 % das vezes; o gabarito deve ter erros.
- [ ] A acurácia é 0,9 e a calibração é 0,6.
- [x] O modelo é confiante demais: com probabilidade 0,9, a fração de acertos foi 0,6.

> Calibrado seria acertar perto de 90 % das respostas dadas com 0,9; a fração medida foi $120/200 = 0{,}6$. Confiança constante não é calibração: ela precisa coincidir com a taxa de acertos. A probabilidade do modelo não é evidência contra o gabarito, que é a referência externa. E a acurácia é a fração de acertos (0,6); 0,9 é a confiança declarada.
