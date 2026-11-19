---
slug: n2-m1-03-encapsulamento-e-properties
titulo: Encapsulamento e properties
descricao: Proteger o estado com atributos privados, validar com setters e expor valores calculados com @property.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Usar a convenção _privado e explicar o que o Python garante e o que não garante
- Criar propriedades com @property e @x.setter para validar atribuições
- Levantar ValueError em atribuições inválidas e testar esse comportamento
---

## Passo 1 · Leitura · Quem protege o saldo?

A classe `Conta` da lição anterior tinha um método `sacar` que recusava saque acima do saldo. Mas nada impede outro trecho do programa de passar por cima dele:

```python
conta = Conta("Ana", 100)
conta.saldo = -500        # ninguém reclama
```

Toda classe tem regras que precisam valer o tempo todo: saldo nunca negativo, idade nunca menor que zero, temperatura nunca abaixo do zero absoluto. Essas regras se chamam **invariantes**. Se qualquer linha do programa pode escrever direto no atributo, a invariante depende da boa vontade de todo mundo, e um bug em outro arquivo quebra a sua classe.

**Encapsular** é fazer o objeto controlar o próprio estado: quem está fora usa os métodos, e os métodos garantem as regras.

#### O que o Python oferece

O Python não tem atributos realmente privados. Ele tem duas convenções:

- **Um sublinhado: `self._saldo`.** Quer dizer "isto é interno, não mexa de fora". O Python não impede o acesso; é um combinado entre programadores, respeitado pelos editores e pelas ferramentas de análise. É o que você vai usar.
- **Dois sublinhados: `self.__saldo`.** O Python troca o nome por `_Conta__saldo` (*name mangling*, a troca de nome). De fora, `conta.__saldo` dá `AttributeError: 'Conta' object has no attribute '__saldo'`, mas `conta._Conta__saldo` funciona. Serve para evitar colisão de nomes entre uma classe e as subclasses dela, não para segurança.

```python
class Conta:
    def __init__(self, titular, saldo):
        self.titular = titular
        self._saldo = saldo       # interno: só os métodos da classe mexem

    def sacar(self, valor):
        if valor > self._saldo:
            raise ValueError("saldo insuficiente")
        self._saldo -= valor
```

Repare no `raise`: em vez de devolver `False`, o método **levanta uma exceção**. Um `False` pode ser ignorado sem querer; uma exceção não tratada para o programa e mostra o problema. Para regras que nunca devem ser violadas, a exceção é a escolha mais segura.

Falta resolver uma coisa: com o saldo em `_saldo`, como o código de fora **lê** o saldo sem precisar mexer num atributo interno? É o assunto do próximo passo.

## Passo 2 · Leitura · @property: um método que se lê como atributo

O decorador `@property`, escrito na linha acima de um método, transforma esse método em algo que se **lê como atributo**, sem parênteses. Um **decorador** é uma linha com `@` que modifica a função logo abaixo dela.

```python
class Conta:
    def __init__(self, titular, saldo):
        self.titular = titular
        self._saldo = saldo

    @property
    def saldo(self):
        return self._saldo


conta = Conta("Ana", 100)
print(conta.saldo)        # 100, sem parênteses
```

Ler `conta.saldo` executa o método e devolve `self._saldo`. Como a classe não diz como **escrever** em `saldo`, a atribuição é recusada:

```
AttributeError: property 'saldo' of 'Conta' object has no setter
```

O saldo virou **somente leitura** para quem está fora. Dentro da classe, os métodos continuam alterando `self._saldo`.

#### Valores calculados

Property também serve para valores que dependem de outros atributos. A área de um retângulo não precisa ser guardada: é calculada na hora, e nunca fica desatualizada quando um lado muda.

```python
class Retangulo:
    def __init__(self, largura, altura):
        self.largura = largura
        self.altura = altura

    @property
    def area(self):
        return self.largura * self.altura
```

`r.area` devolve o número. Já `r.area()` dá erro, porque `r.area` já é o número, e um número não pode ser chamado:

```
TypeError: 'int' object is not callable
```

Use property para o que soa como uma **característica** do objeto (`area`, `saldo`, `nome_completo`) e é barato de calcular. Para uma **ação** (`sacar`, `depositar`) ou algo demorado, use um método comum, com parênteses.

## Passo 3 · Previsão · Quem passa pelo setter

Uma property também pode ter um **setter**: um segundo método, marcado com `@preco.setter`, que o Python executa quando alguém **atribui** a `preco`. Os dois métodos imprimem uma mensagem para você enxergar quando cada um roda.

Leia o programa sem executar e digite exatamente o que ele imprime. Atenção à linha do `__init__` e à linha `p.preco = p.preco + 5`.

### Código
```python
class Produto:
    def __init__(self, nome, preco):
        self.nome = nome
        self.preco = preco

    @property
    def preco(self):
        print("lendo preço")
        return self._preco

    @preco.setter
    def preco(self, valor):
        print("validando", valor)
        if valor < 0:
            raise ValueError("preço negativo")
        self._preco = valor


p = Produto("Caderno", 20)
p.preco = p.preco + 5
try:
    p.preco = -1
except ValueError as erro:
    print("erro:", erro)
print(p._preco)
```

### Dicas
1. `self.preco = preco` no `__init__` também é uma atribuição a `preco`.
2. Em `p.preco = p.preco + 5`, o lado direito é calculado antes da atribuição.
3. O setter levanta a exceção antes de chegar ao `self._preco = valor`.

### Saída esperada
```text
validando 20
lendo preço
validando 25
validando -1
erro: preço negativo
25
```

## Passo 4 · Leitura · Setter com validação

O setter é o porteiro do atributo. A forma completa:

```python
class Pessoa:
    def __init__(self, nome, idade):
        self.nome = nome
        self.idade = idade          # passa pelo setter

    @property
    def idade(self):
        return self._idade

    @idade.setter
    def idade(self, valor):
        if valor < 0:
            raise ValueError(f"idade inválida: {valor}")
        self._idade = valor
```

Os dois métodos depois do `__init__` têm o **mesmo nome**, `idade`: o primeiro, com `@property`, é a leitura; o segundo, com `@idade.setter`, é a escrita. O valor de verdade fica em `_idade`.

Três detalhes que fazem a diferença:

**O `__init__` usa `self.idade`, sem sublinhado.** Assim o valor inicial também passa pela validação, e `Pessoa("Caio", -3)` já é recusado. Escrever `self._idade = idade` no `__init__` pula o porteiro: a regra vale para mudanças, mas não para o nascimento do objeto.

**O setter grava em `self._idade`, com sublinhado.** Se gravar em `self.idade`, a atribuição chama o próprio setter, que chama o setter de novo, sem fim, até o Python desistir:

```
RecursionError: maximum recursion depth exceeded
```

**A mensagem do erro diz o que está errado.** `ValueError("idade inválida: -3")` ajuda quem vai ler o traceback; `ValueError("erro")` não ajuda ninguém.

#### Testando a recusa

Para ter certeza de que a validação funciona, teste o caso proibido e confira que a exceção aparece, com `try`/`except`:

```python
p = Pessoa("Bia", 20)
try:
    p.idade = -1
except ValueError as erro:
    print("recusado:", erro)
print(p.idade)              # 20: o valor antigo continua lá
```

É assim que a plataforma corrige os próximos exercícios: ela tenta a atribuição inválida e exige que o seu código levante a exceção certa.

## Passo 5 · Exercício · Temperatura
modo: lacunas

A classe `Temperatura` guarda a temperatura em graus Celsius e não aceita valores abaixo do zero absoluto, −273,15 °C. A temperatura em Fahrenheit não é guardada: é calculada a partir dos Celsius.

$$
F = C \times \frac{9}{5} + 32
$$

Complete as lacunas (`___`).

### Instruções
1. Transforme o primeiro `celsius` em property de leitura e o segundo em setter.
2. No setter, levante `ValueError` para valores abaixo do zero absoluto e guarde os válidos no atributo interno.
   Dica: o setter não pode gravar em `self.celsius`, senão chama a si mesmo.
3. Complete `fahrenheit`, uma property somente leitura calculada a partir dos Celsius.

### Código inicial
```python
class Temperatura:
    ZERO_ABSOLUTO = -273.15

    def __init__(self, celsius):
        self.celsius = celsius

    @___
    def celsius(self):
        return self._celsius

    @celsius.___
    def celsius(self, valor):
        if valor < Temperatura.ZERO_ABSOLUTO:
            raise ___("abaixo do zero absoluto")
        self.___ = valor

    @property
    def fahrenheit(self):
        return ___ * 9 / 5 + 32
```

### Solução
```python
class Temperatura:
    ZERO_ABSOLUTO = -273.15

    def __init__(self, celsius):
        self.celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, valor):
        if valor < Temperatura.ZERO_ABSOLUTO:
            raise ValueError("abaixo do zero absoluto")
        self._celsius = valor

    @property
    def fahrenheit(self):
        return self._celsius * 9 / 5 + 32
```

### Dicas
1. Os decoradores são `@property` e `@nome.setter`, com o nome da property antes do ponto.
2. O valor fica guardado no atributo com sublinhado, o mesmo que a leitura devolve.
3. Em `fahrenheit`, os Celsius do objeto vêm de `self`.

### Verificação
```json
[
  { "id": "decorador", "checkpoint": 1, "kind": "source", "rule": { "type": "decorator", "name": "property" },
    "name": "Usa @property" },
  { "id": "le", "checkpoint": 1, "kind": "expr", "expr": "Temperatura(25).celsius", "expected": 25,
    "name": "Temperatura(25).celsius é 25" },
  { "id": "altera", "checkpoint": 1, "kind": "expr", "setup": "t = Temperatura(10)\nt.celsius = 37.5", "expr": "t.celsius",
    "expected": 37.5, "name": "Atribuir 37.5 a celsius" },
  { "id": "recusa-criacao", "checkpoint": 2, "kind": "expr", "expr": "Temperatura(-300)", "raises": "ValueError",
    "name": "Temperatura(-300) é recusada", "hint": "O __init__ atribui a self.celsius: a validação do setter vale também na criação." },
  { "id": "recusa-atribuicao", "checkpoint": 2, "kind": "expr", "setup": "t = Temperatura(0)\nt.celsius = -273.16", "expr": "t.celsius",
    "raises": "ValueError", "name": "Atribuir -273.16 é recusado" },
  { "id": "mantem", "checkpoint": 2, "kind": "expr", "setup": "t = Temperatura(12)\ntry:\n    t.celsius = -500\nexcept ValueError:\n    pass",
    "expr": "t.celsius", "expected": 12, "name": "Depois de uma atribuição recusada, o valor antigo continua" },
  { "id": "limite", "checkpoint": 2, "kind": "expr", "expr": "Temperatura(-273.15).celsius", "expected": -273.15, "tolerance": 1e-9,
    "name": "O zero absoluto em si é aceito", "hint": "Só valores abaixo de -273.15 são recusados." },
  { "id": "fahrenheit", "checkpoint": 3, "kind": "expr", "expr": "Temperatura(37).fahrenheit", "expected": 98.6, "tolerance": 1e-9,
    "name": "37 °C em Fahrenheit", "hint": "fahrenheit é property: lido sem parênteses." },
  { "id": "fahrenheit-atualiza", "checkpoint": 3, "kind": "expr", "setup": "t = Temperatura(0)\nt.celsius = -40", "expr": "t.fahrenheit",
    "expected": -40.0, "tolerance": 1e-9, "name": "fahrenheit acompanha a mudança de celsius" },
  { "id": "fahrenheit-leitura", "checkpoint": 3, "kind": "expr", "setup": "t = Temperatura(20)\nt.fahrenheit = 100", "expr": "t.celsius",
    "raises": "AttributeError", "name": "fahrenheit é somente leitura" }
]
```

### Soluções erradas
```python name="setter grava em self.celsius e chama a si mesmo"
class Temperatura:
    ZERO_ABSOLUTO = -273.15

    def __init__(self, celsius):
        self.celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, valor):
        if valor < Temperatura.ZERO_ABSOLUTO:
            raise ValueError("abaixo do zero absoluto")
        self.celsius = valor

    @property
    def fahrenheit(self):
        return self._celsius * 9 / 5 + 32
```
```python name="valida só no __init__, sem property"
class Temperatura:
    ZERO_ABSOLUTO = -273.15

    def __init__(self, celsius):
        if celsius < Temperatura.ZERO_ABSOLUTO:
            raise ValueError("abaixo do zero absoluto")
        self.celsius = celsius

    @property
    def fahrenheit(self):
        return self.celsius * 9 / 5 + 32
```
```python name="__init__ grava direto no atributo interno e pula a validação"
class Temperatura:
    ZERO_ABSOLUTO = -273.15

    def __init__(self, celsius):
        self._celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, valor):
        if valor < Temperatura.ZERO_ABSOLUTO:
            raise ValueError("abaixo do zero absoluto")
        self._celsius = valor

    @property
    def fahrenheit(self):
        return self._celsius * 9 / 5 + 32
```
```python name="fahrenheit como método comum"
class Temperatura:
    ZERO_ABSOLUTO = -273.15

    def __init__(self, celsius):
        self.celsius = celsius

    @property
    def celsius(self):
        return self._celsius

    @celsius.setter
    def celsius(self, valor):
        if valor < Temperatura.ZERO_ABSOLUTO:
            raise ValueError("abaixo do zero absoluto")
        self._celsius = valor

    def fahrenheit(self):
        return self._celsius * 9 / 5 + 32
```

## Passo 6 · Exercício · Saldo protegido

Reescreva a conta bancária com o saldo protegido. Ninguém de fora consegue atribuir ao saldo, e operações inválidas **levantam** `ValueError` em vez de devolver `False`:

```python
c = ContaBancaria("Ana", 100)
c.sacar(30)
print(c.saldo)        # 70
c.saldo = 1000        # AttributeError: property 'saldo' of 'ContaBancaria' object has no setter
c.sacar(999)          # ValueError: saldo insuficiente
```

### Instruções
1. `ContaBancaria(titular, saldo_inicial=0)` guarda o titular e o saldo num atributo interno. Saldo inicial negativo levanta `ValueError`.
2. `saldo` é uma property **somente leitura**: lê o saldo, e atribuir a ela levanta `AttributeError`.
3. `depositar(valor)` soma ao saldo; valor zero ou negativo levanta `ValueError`.
4. `sacar(valor)` desconta do saldo; acima do saldo levanta `ValueError` com a mensagem `saldo insuficiente`, e o saldo não muda. Valor zero ou negativo também levanta `ValueError`.

### Código inicial
```python
class ContaBancaria:
    def __init__(self, titular, saldo_inicial=0):
        self.titular = titular
        self.saldo = saldo_inicial
```

### Solução
```python
class ContaBancaria:
    def __init__(self, titular, saldo_inicial=0):
        if saldo_inicial < 0:
            raise ValueError("saldo inicial negativo")
        self.titular = titular
        self._saldo = saldo_inicial

    @property
    def saldo(self):
        return self._saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self._saldo += valor

    def sacar(self, valor):
        if valor <= 0:
            raise ValueError("o saque precisa ser positivo")
        if valor > self._saldo:
            raise ValueError("saldo insuficiente")
        self._saldo -= valor
```

### Dicas
1. Uma property sem setter já recusa a atribuição sozinha: não é preciso escrever nada para isso.
2. Dentro da classe, os métodos alteram o atributo interno, com sublinhado.
3. Confira o saldo antes de descontar: se a exceção vier depois do desconto, o saldo já mudou.

### Verificação
```json
[
  { "id": "cria", "checkpoint": 1, "kind": "expr", "expr": "ContaBancaria(\"Bia\", 250).saldo", "expected": 250,
    "name": "Conta criada com 250" },
  { "id": "cria-padrao", "checkpoint": 1, "kind": "expr", "expr": "ContaBancaria(\"Bia\").saldo", "expected": 0,
    "name": "Saldo inicial padrão é 0" },
  { "id": "cria-negativa", "checkpoint": 1, "kind": "expr", "expr": "ContaBancaria(\"Bia\", -1)", "raises": "ValueError",
    "name": "Saldo inicial negativo é recusado" },
  { "id": "somente-leitura", "checkpoint": 2, "kind": "expr", "setup": "c = ContaBancaria(\"Caio\", 10)", "expr": "setattr(c, \"saldo\", 5000)",
    "raises": "AttributeError", "name": "Atribuir ao saldo é recusado",
    "hint": "saldo precisa ser uma property sem setter." },
  { "id": "deposita", "checkpoint": 3, "kind": "expr", "setup": "c = ContaBancaria(\"Davi\", 40)\nc.depositar(15.5)", "expr": "c.saldo",
    "expected": 55.5, "tolerance": 1e-9, "name": "Depósito de 15.5 em 40" },
  { "id": "deposito-zero", "checkpoint": 3, "kind": "expr", "setup": "c = ContaBancaria(\"Davi\", 40)", "expr": "c.depositar(0)",
    "raises": "ValueError", "name": "Depósito de 0 é recusado" },
  { "id": "deposito-negativo", "checkpoint": 3, "kind": "expr", "setup": "c = ContaBancaria(\"Davi\", 40)", "expr": "c.depositar(-20)",
    "raises": "ValueError", "name": "Depósito negativo é recusado" },
  { "id": "saca", "checkpoint": 4, "kind": "expr", "setup": "c = ContaBancaria(\"Eva\", 80)\nc.sacar(80)", "expr": "c.saldo",
    "expected": 0, "name": "Sacar todo o saldo deixa 0" },
  { "id": "insuficiente", "checkpoint": 4, "kind": "expr", "setup": "c = ContaBancaria(\"Eva\", 80)", "expr": "c.sacar(80.01)",
    "raises": "ValueError", "message_contains": "insuficiente", "name": "Saque acima do saldo levanta ValueError('saldo insuficiente')",
    "hint": "A mensagem da exceção precisa explicar o motivo." },
  { "id": "nao-muda", "checkpoint": 4, "kind": "expr", "setup": "c = ContaBancaria(\"Eva\", 80)\ntry:\n    c.sacar(500)\nexcept ValueError:\n    pass",
    "expr": "c.saldo", "expected": 80, "name": "Saque recusado não altera o saldo" },
  { "id": "saque-negativo", "checkpoint": 4, "kind": "expr", "setup": "c = ContaBancaria(\"Eva\", 80)", "expr": "c.sacar(-10)",
    "raises": "ValueError", "name": "Saque negativo é recusado", "hint": "Sacar -10 aumentaria o saldo." }
]
```

### Soluções erradas
```python name="saldo como atributo comum"
class ContaBancaria:
    def __init__(self, titular, saldo_inicial=0):
        if saldo_inicial < 0:
            raise ValueError("saldo inicial negativo")
        self.titular = titular
        self.saldo = saldo_inicial

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self.saldo += valor

    def sacar(self, valor):
        if valor <= 0:
            raise ValueError("o saque precisa ser positivo")
        if valor > self.saldo:
            raise ValueError("saldo insuficiente")
        self.saldo -= valor
```
```python name="sacar devolve False em vez de levantar"
class ContaBancaria:
    def __init__(self, titular, saldo_inicial=0):
        if saldo_inicial < 0:
            raise ValueError("saldo inicial negativo")
        self.titular = titular
        self._saldo = saldo_inicial

    @property
    def saldo(self):
        return self._saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self._saldo += valor

    def sacar(self, valor):
        if valor <= 0 or valor > self._saldo:
            return False
        self._saldo -= valor
        return True
```
```python name="mensagem vaga no saque"
class ContaBancaria:
    def __init__(self, titular, saldo_inicial=0):
        if saldo_inicial < 0:
            raise ValueError("saldo inicial negativo")
        self.titular = titular
        self._saldo = saldo_inicial

    @property
    def saldo(self):
        return self._saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self._saldo += valor

    def sacar(self, valor):
        if valor <= 0 or valor > self._saldo:
            raise ValueError("operação inválida")
        self._saldo -= valor
```
```python name="desconta antes de conferir"
class ContaBancaria:
    def __init__(self, titular, saldo_inicial=0):
        if saldo_inicial < 0:
            raise ValueError("saldo inicial negativo")
        self.titular = titular
        self._saldo = saldo_inicial

    @property
    def saldo(self):
        return self._saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self._saldo += valor

    def sacar(self, valor):
        if valor <= 0:
            raise ValueError("o saque precisa ser positivo")
        self._saldo -= valor
        if self._saldo < 0:
            raise ValueError("saldo insuficiente")
```
```python name="não valida o valor do saque"
class ContaBancaria:
    def __init__(self, titular, saldo_inicial=0):
        if saldo_inicial < 0:
            raise ValueError("saldo inicial negativo")
        self.titular = titular
        self._saldo = saldo_inicial

    @property
    def saldo(self):
        return self._saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self._saldo += valor

    def sacar(self, valor):
        if valor > self._saldo:
            raise ValueError("saldo insuficiente")
        self._saldo -= valor
```

## Passo 7 · Exercício · Idade validada

Escreva a classe `Pessoa(nome, idade)` em que a idade é sempre um número inteiro de 0 a 150, desde a criação do objeto, e que responde se a pessoa é adulta (18 anos ou mais).

```python
p = Pessoa("Caio", 17)
print(p.eh_adulto)       # False
p.fazer_aniversario()
print(p.idade, p.eh_adulto)   # 18 True
p.idade = 17.5           # TypeError
p.idade = -2             # ValueError
```

### Instruções
1. `idade` é uma property com setter. O setter levanta `TypeError` se o valor não for `int`, e `ValueError` se estiver fora do intervalo de 0 a 150.
   Dica: `isinstance(valor, int)` responde se o valor é inteiro.
2. A validação vale também na criação: `Pessoa("Bia", -1)` é recusado.
3. `eh_adulto` é uma property somente leitura que devolve `True` a partir dos 18 anos.
4. `fazer_aniversario()` soma 1 à idade, passando pela mesma validação.

### Código inicial
```python
class Pessoa:
    def __init__(self, nome, idade):
        self.nome = nome
        self.idade = idade
```

### Solução
```python
class Pessoa:
    def __init__(self, nome, idade):
        self.nome = nome
        self.idade = idade

    @property
    def idade(self):
        return self._idade

    @idade.setter
    def idade(self, valor):
        if not isinstance(valor, int):
            raise TypeError("idade precisa ser um número inteiro")
        if valor < 0 or valor > 150:
            raise ValueError(f"idade fora do intervalo: {valor}")
        self._idade = valor

    @property
    def eh_adulto(self):
        return self.idade >= 18

    def fazer_aniversario(self):
        self.idade = self.idade + 1
```

### Dicas
1. O `__init__` do código inicial já atribui a `self.idade`: com a property e o setter definidos, a criação passa pela validação.
2. Confira o tipo antes do intervalo; um texto nem pode ser comparado com 0.
3. `fazer_aniversario` pode atribuir a `self.idade`, sem sublinhado, para usar o setter.

### Verificação
```json
[
  { "id": "le", "checkpoint": 1, "kind": "expr", "setup": "p = Pessoa(\"Davi\", 33)\np.idade = 34", "expr": "p.idade", "expected": 34,
    "name": "Atribuir 34 à idade" },
  { "id": "decorador", "checkpoint": 1, "kind": "source", "rule": { "type": "decorator", "name": "property" },
    "name": "Usa @property" },
  { "id": "tipo", "checkpoint": 1, "kind": "expr", "setup": "p = Pessoa(\"Davi\", 33)", "expr": "setattr(p, \"idade\", 17.5)",
    "raises": "TypeError", "name": "Idade 17.5 levanta TypeError", "hint": "Confira se o valor é int antes de aceitar." },
  { "id": "texto", "checkpoint": 1, "kind": "expr", "setup": "p = Pessoa(\"Davi\", 33)", "expr": "setattr(p, \"idade\", \"40\")",
    "raises": "TypeError", "name": "Idade \"40\" (texto) levanta TypeError" },
  { "id": "acima", "checkpoint": 1, "kind": "expr", "setup": "p = Pessoa(\"Davi\", 33)", "expr": "setattr(p, \"idade\", 151)",
    "raises": "ValueError", "name": "Idade 151 levanta ValueError" },
  { "id": "bordas", "checkpoint": 1, "kind": "expr", "setup": "a = Pessoa(\"Ana\", 0)\nb = Pessoa(\"Bia\", 150)", "expr": "(a.idade, b.idade)",
    "expected": [0, 150], "name": "0 e 150 são idades válidas" },
  { "id": "criacao", "checkpoint": 2, "kind": "expr", "expr": "Pessoa(\"Eva\", -1)", "raises": "ValueError",
    "name": "Pessoa(\"Eva\", -1) é recusada", "hint": "O __init__ precisa passar pelo setter." },
  { "id": "adulto", "checkpoint": 3, "kind": "expr", "expr": "(Pessoa(\"Ana\", 18).eh_adulto, Pessoa(\"Bia\", 17).eh_adulto, Pessoa(\"Caio\", 64).eh_adulto)",
    "expected": [true, false, true], "name": "eh_adulto com 18, 17 e 64 anos", "hint": "eh_adulto é lido sem parênteses e 18 já é adulto." },
  { "id": "adulto-leitura", "checkpoint": 3, "kind": "expr", "setup": "p = Pessoa(\"Ana\", 30)", "expr": "setattr(p, \"eh_adulto\", False)",
    "raises": "AttributeError", "name": "eh_adulto é somente leitura" },
  { "id": "aniversario", "checkpoint": 4, "kind": "expr", "setup": "p = Pessoa(\"Caio\", 17)\np.fazer_aniversario()", "expr": "(p.idade, p.eh_adulto)",
    "expected": [18, true], "name": "Aniversário aos 17 anos" },
  { "id": "aniversario-limite", "checkpoint": 4, "kind": "expr", "setup": "p = Pessoa(\"Davi\", 150)", "expr": "p.fazer_aniversario()",
    "raises": "ValueError", "name": "Aniversário aos 150 passa do limite", "hint": "fazer_aniversario precisa usar o setter, não o atributo interno." }
]
```

### Soluções erradas
```python name="valida só no __init__"
class Pessoa:
    def __init__(self, nome, idade):
        if not isinstance(idade, int):
            raise TypeError("idade precisa ser um inteiro")
        if idade < 0 or idade > 150:
            raise ValueError("idade fora do intervalo")
        self.nome = nome
        self.idade = idade

    @property
    def eh_adulto(self):
        return self.idade >= 18

    def fazer_aniversario(self):
        self.idade = self.idade + 1
```
```python name="eh_adulto como método comum"
class Pessoa:
    def __init__(self, nome, idade):
        self.nome = nome
        self.idade = idade

    @property
    def idade(self):
        return self._idade

    @idade.setter
    def idade(self, valor):
        if not isinstance(valor, int):
            raise TypeError("idade precisa ser um inteiro")
        if valor < 0 or valor > 150:
            raise ValueError("idade fora do intervalo")
        self._idade = valor

    def eh_adulto(self):
        return self.idade >= 18

    def fazer_aniversario(self):
        self.idade = self.idade + 1
```
```python name="maior que 18 em vez de maior ou igual"
class Pessoa:
    def __init__(self, nome, idade):
        self.nome = nome
        self.idade = idade

    @property
    def idade(self):
        return self._idade

    @idade.setter
    def idade(self, valor):
        if not isinstance(valor, int):
            raise TypeError("idade precisa ser um inteiro")
        if valor < 0 or valor > 150:
            raise ValueError("idade fora do intervalo")
        self._idade = valor

    @property
    def eh_adulto(self):
        return self.idade > 18

    def fazer_aniversario(self):
        self.idade = self.idade + 1
```
```python name="aniversário altera o atributo interno e pula a validação"
class Pessoa:
    def __init__(self, nome, idade):
        self.nome = nome
        self.idade = idade

    @property
    def idade(self):
        return self._idade

    @idade.setter
    def idade(self, valor):
        if not isinstance(valor, int):
            raise TypeError("idade precisa ser um inteiro")
        if valor < 0 or valor > 150:
            raise ValueError("idade fora do intervalo")
        self._idade = valor

    @property
    def eh_adulto(self):
        return self.idade >= 18

    def fazer_aniversario(self):
        self._idade += 1
```
```python name="não confere o tipo"
class Pessoa:
    def __init__(self, nome, idade):
        self.nome = nome
        self.idade = idade

    @property
    def idade(self):
        return self._idade

    @idade.setter
    def idade(self, valor):
        if valor < 0 or valor > 150:
            raise ValueError("idade fora do intervalo")
        self._idade = valor

    @property
    def eh_adulto(self):
        return self.idade >= 18

    def fazer_aniversario(self):
        self.idade = self.idade + 1
```

## Passo 8 · Quiz · Encapsulamento

### Pergunta
O que acontece com `conta._saldo = 0`, feito de fora da classe?
- [ ] O Python levanta `AttributeError`, porque o atributo é privado
- [x] A atribuição funciona: o sublinhado é só uma convenção que pede para não mexer
- [ ] O Python cria um atributo novo chamado `_Conta_saldo`
- [ ] Dá `SyntaxError`
> O Python não impede o acesso a `_saldo`. O sublinhado avisa que o atributo é interno, e quem respeita o combinado usa os métodos e as properties. A troca de nome (*name mangling*) só acontece com dois sublinhados.

### Pergunta
A classe `Circulo` tem `area` definida com `@property` e sem setter. O que `c.area = 10` faz?
- [ ] Guarda 10 na área até o raio mudar
- [ ] Muda o raio para que a área fique 10
- [x] Levanta `AttributeError`, porque a property não tem setter
- [ ] Nada: a atribuição é ignorada em silêncio
> Uma property sem setter é somente leitura. A atribuição levanta `AttributeError: property 'area' of 'Circulo' object has no setter`.

### Pergunta
Este setter trava o programa com `RecursionError`. Por quê?
```python
@nota.setter
def nota(self, valor):
    if not 0 <= valor <= 10:
        raise ValueError("nota fora do intervalo")
    self.nota = valor
```
- [ ] Porque a comparação `0 <= valor <= 10` não é permitida em Python
- [x] Porque `self.nota = valor` chama o próprio setter de novo, sem fim
- [ ] Porque o setter precisa terminar com `return valor`
- [ ] Porque falta o `@property` em cima do setter
> Atribuir a `self.nota` dentro do setter de `nota` dispara o setter outra vez. O valor precisa ir para o atributo interno: `self._nota = valor`.
