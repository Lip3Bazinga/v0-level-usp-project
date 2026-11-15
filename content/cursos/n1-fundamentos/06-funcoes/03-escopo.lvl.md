---
slug: n1-m6-03-escopo
titulo: Escopo de variáveis
descricao: Variáveis locais e globais, por que uma função não enxerga a outra e por que evitar global.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Diferenciar variáveis locais e globais e prever NameError e UnboundLocalError
- Passar dados por parâmetro e devolver por return em vez de usar variáveis globais
- Explicar o que a palavra-chave global faz e por que raramente é boa ideia
---

## Passo 1 · Leitura · Cada função tem as suas variáveis

**Escopo** é a região do programa em que um nome de variável existe. Em Python há dois escopos que importam agora.

Uma variável criada **dentro** de uma função é **local**. Os parâmetros também são locais. Ela nasce quando a função é chamada e some quando a função termina. Fora da função, o nome não existe:

```python
def calcular():
    resultado = 42
    return resultado


calcular()
print(resultado)   # NameError: name 'resultado' is not defined
```

Uma variável criada **fora** de qualquer função é **global**. Uma função consegue **ler** uma global:

```python
taxa = 10


def mostrar_taxa():
    print(taxa)    # lê a global: imprime 10
```

Mas **atribuir** é diferente. Uma atribuição dentro da função cria uma variável local nova, mesmo que já exista uma global com o mesmo nome. As duas convivem, cada uma no seu quadro, e a global não muda. Veja no visualizador: há dois `x`, um no quadro global e outro no quadro de `dobrar`. O de dentro vira 10; o de fora continua 5.

```python visualizar
def dobrar(x):
    x = x * 2
    resultado = x
    return resultado


x = 5
y = dobrar(x)
print(x, y)
```

Essa regra explica um erro que confunde muita gente:

```python
contador = 0


def contar():
    contador += 1   # UnboundLocalError


contar()
```

Como a função atribui a `contador`, o Python trata `contador` como local na função inteira. Só que `contador += 1` precisa ler o valor antes de somar, e a local ainda não tem valor. O erro é `UnboundLocalError: cannot access local variable 'contador' where it is not associated with a value`.

Existe uma palavra que desliga essa regra. Escrever `global contador` no começo da função avisa que as atribuições valem para a variável de fora. Funciona, mas raramente é boa ideia: qualquer função pode mudar a variável sem ninguém perceber, o resultado passa a depender de quantas vezes e em que ordem as funções foram chamadas, e fica difícil testar cada função sozinha.

A regra prática deste curso: **o que a função precisa entra por parâmetro; o que ela produz sai por `return`.**

```python
def contar(contador):
    return contador + 1


contador = 0
contador = contar(contador)   # quem chama decide guardar o novo valor
```

## Passo 2 · Previsão · A global mudou?

Leia o programa com calma, sem executar, e digite exatamente o que ele imprime (uma linha de saída por linha da sua resposta). Há um `total` fora da função e uma atribuição a `total` dentro dela.

### Código
```python
total = 10


def somar(valor):
    total = valor + 1
    return total


print(somar(5))
print(total)
```

### Dicas
1. O `total` de dentro da função é outra variável: a atribuição cria uma local.
2. Faça o teste de mesa com dois quadros, um global e um de `somar`, e veja qual `total` cada `print` lê.

### Saída esperada
```text
6
10
```

## Passo 3 · Exercício · Sem global

O programa abaixo controla o saldo de uma conta com uma variável global, e a função `depositar(valor)` altera essa variável usando `global`. Ele funciona, mas a função só serve para aquela única conta, e ninguém que lê a chamada `depositar(50)` fica sabendo que `saldo` mudou.

Reescreva a função no estilo "entra por parâmetro, sai por `return`": `depositar(saldo, valor)` recebe o saldo atual e o valor do depósito e **devolve o novo saldo**, sem alterar nada fora dela. Exemplo: `depositar(100, 50)` devolve `150`.

Mantenha a linha `saldo = 100` no programa. Depois de uma chamada como `depositar(100, 50)`, a variável global `saldo` precisa continuar valendo `100`: quem quiser atualizar o saldo escreve `saldo = depositar(saldo, 50)`.

### Instruções
1. Mude a função para `depositar(saldo, valor)`: ela recebe o saldo atual como primeiro parâmetro e devolve o novo saldo com `return`.
2. Apague a linha `global saldo`: a função não pode alterar a variável global `saldo`, que continua valendo `100`.

### Código inicial
```python
saldo = 100


def depositar(valor):
    global saldo
    saldo = saldo + valor
```

### Solução
```python
saldo = 100


def depositar(saldo, valor):
    return saldo + valor
```

### Dicas
1. O saldo entra por parâmetro: dentro da função, `saldo` passa a ser uma variável local, separada da global.
2. Devolva o novo valor com `return` em vez de alterar a variável de fora. A linha `global saldo` deve sumir.

### Verificação
```json
[
  { "id": "depositar-100-50", "checkpoint": 1, "kind": "call", "function": "depositar", "args": [100, 50], "expected": 150,
    "name": "depositar(100, 50) é 150", "hint": "A função recebe dois argumentos (saldo e valor) e devolve a soma." },
  { "id": "depositar-0-20", "checkpoint": 1, "kind": "call", "function": "depositar", "args": [0, 20], "expected": 20,
    "name": "depositar(0, 20) é 20", "hint": "Use o saldo recebido por parâmetro, não a variável global." },
  { "id": "depositar-300-1", "checkpoint": 1, "kind": "call", "function": "depositar", "args": [300, 1], "expected": 301,
    "name": "depositar(300, 1) é 301" },
  { "id": "global-intacta", "checkpoint": 2, "kind": "expr", "setup": "depositar(100, 50)", "expr": "saldo", "expected": 100,
    "name": "A global saldo continua 100 depois de depositar(100, 50)", "hint": "A função não deve alterar a variável de fora: apague o global e devolva o resultado." },
  { "id": "global-intacta-2", "checkpoint": 2, "kind": "expr", "setup": "depositar(7, 3)\ndepositar(7, 3)", "expr": "saldo", "expected": 100,
    "name": "A global saldo continua 100 depois de duas chamadas" }
]
```

### Soluções erradas
```python name="assinatura nova, mas ainda usa global"
saldo = 100


def depositar(saldo_atual, valor):
    global saldo
    saldo = saldo_atual + valor
    return saldo
```
```python name="devolve só o valor depositado"
saldo = 100


def depositar(saldo, valor):
    return valor
```
```python name="calcula mas não devolve"
saldo = 100


def depositar(saldo, valor):
    saldo = saldo + valor
```
```python name="ignora o parâmetro e soma na global"
saldo = 100


def depositar(saldo_atual, valor):
    return saldo + valor
```

## Passo 4 · Quiz · Escopo

### Pergunta
O que acontece ao executar este programa?
```python
def calcular_media():
    media = (7 + 9) / 2


calcular_media()
print(media)
```
- [ ] Imprime `8.0`
- [ ] Imprime `None`
- [x] Dá `NameError: name 'media' is not defined`
- [ ] Dá `UnboundLocalError`
> `media` é local: nasce dentro de `calcular_media` e some quando a função termina. Fora dela, o nome não existe. Para usar o valor, a função precisa devolvê-lo com `return`.

### Pergunta
O que este programa imprime?
```python
def dobrar(x):
    x = x * 2
    return x


x = 5
dobrar(x)
print(x)
```
- [ ] `10`
- [x] `5`
- [ ] `None`
- [ ] `5` e depois `10`
> O `x` de dentro da função é uma variável local, separada do `x` de fora. A função devolve 10, mas o programa não guardou esse valor; o `x` global continua 5.

### Pergunta
O que acontece ao executar este programa?
```python
contador = 0


def registrar():
    contador += 1


registrar()
print(contador)
```
- [ ] Imprime `1`
- [ ] Imprime `0`
- [ ] Dá `NameError`, porque `contador` não existe dentro da função
- [x] Dá `UnboundLocalError`, porque a atribuição torna `contador` local e ele ainda não tem valor
> Como a função atribui a `contador`, o Python o trata como local. `contador += 1` tenta ler a local antes de ela receber um valor. O conserto recomendado é receber o contador por parâmetro e devolver o novo valor.

## Passo 5 · Exercício · aplicar_desconto(preco, percentual)

Uma função que só usa os parâmetros e só devolve o resultado é fácil de entender e de testar: para as mesmas entradas, ela dá sempre a mesma resposta. Escreva uma função assim.

`aplicar_desconto(preco, percentual)` devolve o preço final depois de um desconto de `percentual` por cento:

$$
\text{preço final} = \text{preço} \cdot \left(1 - \frac{p}{100}\right)
$$

Um produto de R\$ 200,00 com 25 % de desconto sai por R\$ 150,00, então `aplicar_desconto(200, 25)` devolve `150.0`. Com desconto de 0 %, o preço não muda; com 100 %, o preço final é `0.0`.

### Instruções
1. Defina `aplicar_desconto(preco, percentual)` e devolva o preço final, calculado só com os dois parâmetros, sem variáveis globais e sem `print`.

### Código inicial
```python
def aplicar_desconto(preco, percentual):
    pass
```

### Solução
```python
def aplicar_desconto(preco, percentual):
    return preco * (1 - percentual / 100)
```

### Dicas
1. O percentual vira fração quando você o divide por 100: 25 % é 0.25.
2. Tudo o que a função precisa chega pelos parâmetros. Calcule o desconto e subtraia do preço, ou multiplique o preço pelo que sobra.
3. A resposta pedida é o preço que a pessoa paga, não o valor do desconto.

### Verificação
```json
[
  { "id": "desconto-200-25", "checkpoint": 1, "kind": "call", "function": "aplicar_desconto", "args": [200, 25], "expected": 150.0, "tolerance": 0.01,
    "name": "aplicar_desconto(200, 25) é 150.0", "hint": "25 % de 200 é 50; o preço final é o que sobra." },
  { "id": "desconto-zero", "checkpoint": 1, "kind": "call", "function": "aplicar_desconto", "args": [80, 0], "expected": 80.0, "tolerance": 0.01,
    "name": "aplicar_desconto(80, 0) é 80.0", "hint": "Sem desconto, o preço final é o próprio preço." },
  { "id": "desconto-total", "checkpoint": 1, "kind": "call", "function": "aplicar_desconto", "args": [50, 100], "expected": 0.0, "tolerance": 0.01,
    "name": "aplicar_desconto(50, 100) é 0.0", "hint": "Com 100 % de desconto, o produto sai de graça." },
  { "id": "desconto-120-10", "checkpoint": 1, "kind": "call", "function": "aplicar_desconto", "args": [120, 10], "expected": 108.0, "tolerance": 0.01,
    "name": "aplicar_desconto(120, 10) é 108.0" },
  { "id": "desconto-centavos", "checkpoint": 1, "kind": "call", "function": "aplicar_desconto", "args": [19.9, 50], "expected": 9.95, "tolerance": 0.01,
    "name": "aplicar_desconto(19.9, 50) é 9.95" }
]
```

### Soluções erradas
```python name="subtrai o número do percentual direto do preço"
def aplicar_desconto(preco, percentual):
    return preco - percentual
```
```python name="devolve o valor do desconto, não o preço final"
def aplicar_desconto(preco, percentual):
    return preco * percentual / 100
```
```python name="imprime em vez de devolver"
def aplicar_desconto(preco, percentual):
    print(preco * (1 - percentual / 100))
```
```python name="esquece de dividir o percentual por 100"
def aplicar_desconto(preco, percentual):
    return preco * (1 - percentual)
```
