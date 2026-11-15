---
slug: n1-m2-03-numeros-e-operadores
titulo: Números e operadores
descricao: Soma, subtração, multiplicação, divisão, divisão inteira, resto e potência, com precedência e arredondamento.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Usar +, -, *, /, //, % e ** e prever o tipo do resultado
- Aplicar a precedência dos operadores e usar parênteses para alterá-la
- Resolver problemas simples com resto da divisão (par/ímpar, dígitos, troco)
---

## Passo 1 · Leitura · Os sete operadores

O Python funciona como uma calculadora. Os sinais que fazem as contas se chamam **operadores**, e são sete:

| Operador | O que faz | Exemplo | Resultado | Tipo |
|---|---|---|---|---|
| `+` | soma | `7 + 2` | `9` | `int` |
| `-` | subtração | `7 - 2` | `5` | `int` |
| `*` | multiplicação | `7 * 2` | `14` | `int` |
| `/` | divisão | `7 / 2` | `3.5` | `float` |
| `//` | divisão inteira | `7 // 2` | `3` | `int` |
| `%` | resto da divisão | `7 % 2` | `1` | `int` |
| `**` | potência | `7 ** 2` | `49` | `int` |

A divisão com `/` **sempre** devolve `float`, mesmo quando a conta é exata: `6 / 2` é `3.0`. Nos outros operadores, dois `int` dão `int`; se um dos números for `float`, o resultado é `float`: `7 + 2.0` é `9.0`.

#### Divisão inteira e resto

`//` e `%` são as duas partes da divisão que você fazia à mão: o quociente e o que sobra. Dividir $a$ por $b$ é achar o quociente $q$ e o resto $r$ tais que $a = b \cdot q + r$. Para 7 dividido por 2, $7 = 2 \cdot 3 + 1$: por isso `7 // 2` é `3` e `7 % 2` é `1`. O `%` não tem nada a ver com porcentagem.

#### Precedência

Como na matemática, o Python não calcula da esquerda para a direita. Primeiro vem `**`; depois `*`, `/`, `//` e `%`; por último `+` e `-`. Parênteses mudam a ordem: o que está dentro deles é calculado antes. Na dúvida, use parênteses.

Um exemplo com potência: R\$ 1000 aplicados a 1 % ao mês, por 12 meses. A fórmula dos juros compostos dá o montante $M$ a partir do capital $C$, da taxa $i$ e do número de meses $n$:

$$
M = C \cdot (1 + i)^n
$$

```python
montante = 1000 * (1 + 0.01) ** 12
print(montante)            # 1126.8250301319697
print(round(montante, 2))  # 1126.83
```

A potência é `**`. O sinal `^` existe em Python, mas faz outra operação.

#### round, abs e +=

- `round(x, casas)` arredonda `x` para o número de casas decimais indicado, como acima.
- `abs(x)` devolve o valor sem o sinal: `abs(-5)` é `5`.
- `total += 5` é um atalho para `total = total + 5`. Existem também `-=`, `*=` e `/=`.

## Passo 2 · Previsão · Quem vem primeiro

Antes de digitar qualquer conta, leia este programa e preveja o resultado de cada linha. Digite exatamente o que ele mostra, um resultado por linha.

### Código
```python
print(2 + 3 * 4)
print((2 + 3) * 4)
print(7 // 2)
print(7 % 2)
print(2 ** 3)
```

### Dicas
1. Multiplicação e divisão vêm antes da soma, a não ser que haja parênteses.
2. `//` joga fora a parte decimal da divisão, e `%` devolve o que sobrou.

### Saída esperada
```text
14
20
3
1
8
```

## Passo 3 · Exercício · Seis contas
modo: lacunas

Cada linha do programa abaixo faz uma conta, e falta um pedaço em cada uma: o operador, um dos valores ou o número de casas. Complete as lacunas para que a saída seja exatamente esta:

```
3.5
3
1
1024
14
2.33
```

As três primeiras linhas dividem 7 por 2 de três jeitos diferentes. A quarta eleva 2 à décima potência. Na quinta, a lacuna é a soma de 3 com 4, que precisa ser calculada **antes** da multiplicação por 2. A sexta arredonda o resultado de 7 dividido por 3.

### Instruções
1. Complete as três divisões de 7 por 2, nesta ordem: a divisão normal (`3.5`), a divisão inteira (`3`) e o resto (`1`).
2. Complete a potência (`1024`) e a conta da quinta linha, em que 3 + 4 é somado antes de multiplicar (`14`).
   Dica: sem parênteses, a multiplicação é feita primeiro.
3. Complete o arredondamento para duas casas decimais (`2.33`).

### Código inicial
```python
print(7 ___ 2)
print(7 ___ 2)
print(7 ___ 2)
print(2 ___ 10)
print(___ * 2)
print(round(7 / 3, ___))
```

### Solução
```python
print(7 / 2)
print(7 // 2)
print(7 % 2)
print(2 ** 10)
print((3 + 4) * 2)
print(round(7 / 3, 2))
```

### Dicas
1. `/` é a divisão normal, `//` é a divisão inteira e `%` é o resto.
2. A potência é `**`. Na quinta linha, a soma vai dentro de parênteses.
3. O segundo valor do `round` é o número de casas decimais que você quer manter.

### Verificação
```json
[
  { "id": "tres-divisoes", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "^3\\.5\\n3\\n1\\n", "match": "regex",
    "name": "As três divisões de 7 por 2", "hint": "A ordem é: divisão normal, divisão inteira, resto. Cada uma usa um operador diferente." },
  { "id": "potencia-e-parenteses", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "\\n1024\\n14\\n", "match": "regex",
    "name": "A potência e a conta com parênteses", "hint": "A quarta linha é uma potência. Na quinta, a soma 3 + 4 precisa acontecer antes da multiplicação." },
  { "id": "seis-contas", "checkpoint": 3, "kind": "io", "stdin": "", "expected_stdout": "3.5\n3\n1\n1024\n14\n2.33\n", "match": "exact",
    "name": "As seis linhas da saída", "hint": "Compare cada linha com o enunciado. A última tem exatamente duas casas decimais." }
]
```

### Soluções erradas
```python name="soma sem parênteses"
print(7 / 2)
print(7 // 2)
print(7 % 2)
print(2 ** 10)
print(3 + 4 * 2)
print(round(7 / 3, 2))
```
```python name="divisão normal no lugar da inteira"
print(7 / 2)
print(7 / 2)
print(7 % 2)
print(2 ** 10)
print((3 + 4) * 2)
print(round(7 / 3, 2))
```
```python name="circunflexo como potência"
print(7 / 2)
print(7 // 2)
print(7 % 2)
print(2 ^ 10)
print((3 + 4) * 2)
print(round(7 / 3, 2))
```
```python name="arredonda sem casas decimais"
print(7 / 2)
print(7 // 2)
print(7 % 2)
print(2 ** 10)
print((3 + 4) * 2)
print(round(7 / 3, 0))
```

## Passo 4 · Exercício · Segundos em h:m:s

Um cronômetro marcou 7384 segundos. Quanto é isso em horas, minutos e segundos? A divisão inteira e o resto resolvem: `//` responde "quantas vezes cabe" e `%` responde "quanto sobra".

Uma hora tem 3600 segundos e um minuto tem 60. Primeiro descubra quantas horas inteiras cabem no total. O que sobrar é menos de uma hora: dele saem os minutos. O que sobrar dos minutos são os segundos.

Para conferir sua resposta: $7384 = 2 \cdot 3600 + 3 \cdot 60 + 4$, ou seja, 2 horas, 3 minutos e 4 segundos.

Faça as contas com `//` e `%` a partir de `total_segundos`; não digite os resultados prontos. Você pode criar variáveis auxiliares, como uma para guardar o que sobra das horas.

### Instruções
1. Crie `horas`: quantas horas inteiras cabem em `total_segundos`.
   Dica: use `//` para ficar com um número inteiro.
2. Crie `minutos`: quantos minutos inteiros cabem no que **sobra** depois de tirar as horas.
3. Crie `segundos`: o que sobra depois de tirar as horas e os minutos.

### Código inicial
```python
total_segundos = 7384

# Calcule horas, minutos e segundos a partir de total_segundos

```

### Solução
```python
total_segundos = 7384

# Calcule horas, minutos e segundos a partir de total_segundos
horas = total_segundos // 3600
resto = total_segundos % 3600
minutos = resto // 60
segundos = resto % 60
```

### Dicas
1. Uma hora tem 3600 segundos: `total_segundos // 3600` diz quantas horas inteiras cabem.
2. O que sobra das horas é `total_segundos % 3600`. Guarde esse valor em uma variável e divida por 60 para achar os minutos.
3. Os segundos são o resto da divisão desse mesmo valor por 60.

### Verificação
```json
[
  { "id": "horas", "checkpoint": 1, "kind": "variable", "variable": "horas", "expected": 2, "type": "int",
    "name": "horas é um número inteiro com as horas completas", "hint": "Use a divisão inteira por 3600. A divisão com / devolve um número com casas decimais." },
  { "id": "minutos", "checkpoint": 2, "kind": "variable", "variable": "minutos", "expected": 3, "type": "int",
    "name": "minutos conta só o que sobrou das horas", "hint": "Tire as horas primeiro: os minutos saem do resto da divisão por 3600, não do total." },
  { "id": "segundos", "checkpoint": 3, "kind": "variable", "variable": "segundos", "expected": 4, "type": "int",
    "name": "segundos é o que sobra dos minutos", "hint": "É o resto da divisão por 60 do que sobrou das horas." },
  { "id": "total-intacto", "checkpoint": 1, "kind": "variable", "variable": "total_segundos", "expected": 7384, "type": "int",
    "name": "total_segundos continua valendo 7384", "hint": "Não altere a primeira linha do programa." }
]
```

### Soluções erradas
```python name="divisão normal em vez da inteira"
total_segundos = 7384
horas = total_segundos / 3600
resto = total_segundos % 3600
minutos = resto / 60
segundos = resto % 60
```
```python name="minutos sem tirar as horas"
total_segundos = 7384
horas = total_segundos // 3600
minutos = total_segundos // 60
segundos = total_segundos % 60
```
```python name="segundos é o resto das horas"
total_segundos = 7384
horas = total_segundos // 3600
resto = total_segundos % 3600
minutos = resto // 60
segundos = resto
```

## Passo 5 · Quiz · Operadores

### Pergunta
Quanto vale `7 // 2`?
- [ ] `3.5`
- [x] `3`
- [ ] `4`
- [ ] `1`
> `//` é a divisão inteira: fica só o quociente, sem a parte decimal e sem arredondar para cima. `3.5` é o resultado de `7 / 2`, e `1` é o resto, `7 % 2`.

### Pergunta
Quanto vale `7 % 2`?
- [ ] `3.5`
- [ ] `0.07`
- [ ] `3`
- [x] `1`
> `%` devolve o resto da divisão: 7 dividido por 2 dá 3 e sobra 1. O sinal não calcula porcentagem. Um uso comum: `n % 2` vale `0` quando `n` é par e `1` quando é ímpar.

### Pergunta
Quanto vale `2 ** 3 * 2`?
- [ ] `64`
- [x] `16`
- [ ] `12`
- [ ] `10`
> A potência vem antes da multiplicação: `2 ** 3` é 8, e 8 vezes 2 é 16. Daria 64 se a conta fosse `2 ** (3 * 2)`.

## Passo 6 · Exercício · Troco em notas

Um caixa eletrônico precisa entregar R\$ 186 usando o menor número possível de notas. As notas disponíveis são de 50, 20, 10, 5 e 1 real. A estratégia é sempre a mesma: usar o máximo que der da maior nota e repetir o raciocínio com o valor que ainda falta.

Com `//` você descobre quantas notas cabem; com `%`, quanto ainda falta entregar. Veja o começo: `186 // 50` é 3 (três notas de 50) e `186 % 50` é 36 (ainda faltam R\$ 36). As notas de 20 são calculadas sobre os 36, não sobre os 186.

O mesmo `%` serve para separar os dígitos de um número: `186 % 10` é `6`, o último dígito, e `186 // 10` é `18`, o número sem ele.

Calcule a quantidade de cada nota a partir de `valor`, guardando em `notas_50`, `notas_20`, `notas_10`, `notas_5` e `notas_1`. Não digite as quantidades prontas. Uma variável auxiliar para "o que falta" ajuda bastante.

### Instruções
1. Crie `notas_50` com a quantidade de notas de 50 que cabem em `valor` e calcule quanto ainda falta.
2. Crie `notas_20` e `notas_10`, cada uma calculada sobre o que faltava depois da nota anterior.
   Dica: depois de cada nota, o valor que falta é o resto da divisão.
3. Crie `notas_5` e `notas_1` do mesmo jeito.

### Código inicial
```python
valor = 186

# Calcule notas_50, notas_20, notas_10, notas_5 e notas_1

```

### Solução
```python
valor = 186

# Calcule notas_50, notas_20, notas_10, notas_5 e notas_1
notas_50 = valor // 50
falta = valor % 50
notas_20 = falta // 20
falta = falta % 20
notas_10 = falta // 10
falta = falta % 10
notas_5 = falta // 5
falta = falta % 5
notas_1 = falta
```

### Dicas
1. Sempre a maior nota primeiro: `valor // 50` diz quantas notas de 50 cabem.
2. Depois de cada nota, o valor que falta é o resto: `falta = valor % 50`, depois `falta = falta % 20`, e assim por diante.
3. Cada quantidade seguinte é calculada sobre `falta`, não sobre `valor`: `notas_20 = falta // 20`.

### Verificação
```json
[
  { "id": "notas-50", "checkpoint": 1, "kind": "variable", "variable": "notas_50", "expected": 3, "type": "int",
    "name": "notas_50: quantas notas de 50 cabem no valor", "hint": "Use a divisão inteira de valor por 50." },
  { "id": "notas-20", "checkpoint": 2, "kind": "variable", "variable": "notas_20", "expected": 1, "type": "int",
    "name": "notas_20 é calculada sobre o que falta", "hint": "Divida por 20 o que sobrou depois das notas de 50, não o valor inteiro." },
  { "id": "notas-10", "checkpoint": 2, "kind": "variable", "variable": "notas_10", "expected": 1, "type": "int",
    "name": "notas_10 é calculada sobre o que falta", "hint": "Atualize o que falta depois das notas de 20 e só então divida por 10." },
  { "id": "notas-5", "checkpoint": 3, "kind": "variable", "variable": "notas_5", "expected": 1, "type": "int",
    "name": "notas_5 é calculada sobre o que falta", "hint": "Divida por 5 o que sobrou depois das notas de 10." },
  { "id": "notas-1", "checkpoint": 3, "kind": "variable", "variable": "notas_1", "expected": 1, "type": "int",
    "name": "notas_1 é o que sobra no fim", "hint": "O que resta depois das notas de 5 é pago em notas de 1." }
]
```

### Soluções erradas
```python name="pula a nota de 20"
valor = 186
notas_50 = valor // 50
falta = valor % 50
notas_10 = falta // 10
falta = falta % 10
notas_5 = falta // 5
falta = falta % 5
notas_1 = falta
```
```python name="não atualiza o que falta"
valor = 186
notas_50 = valor // 50
notas_20 = valor // 20
notas_10 = valor // 10
notas_5 = valor // 5
notas_1 = valor // 1
```
```python name="divisão normal em vez da inteira"
valor = 186
notas_50 = valor / 50
falta = valor % 50
notas_20 = falta / 20
falta = falta % 20
notas_10 = falta / 10
falta = falta % 10
notas_5 = falta / 5
falta = falta % 5
notas_1 = falta
```
