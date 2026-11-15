---
slug: n2-m1-02-metodos-e-str-repr
titulo: Métodos, __str__ e __repr__
descricao: Comportamento dentro da classe, métodos que chamam métodos e representações legíveis dos objetos.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever métodos que leem e alteram o estado do objeto e chamam outros métodos
- Implementar __str__ e __repr__ e explicar quando cada um é usado
- Usar atributos de classe para constantes e contadores compartilhados
---

## Passo 1 · Leitura · Métodos que conversam entre si

Um método é uma função que mora na classe e recebe o objeto como `self`. Com isso ele pode **ler** o estado (`self.saldo`), **alterar** o estado (`self.saldo -= valor`) e **chamar outros métodos** do mesmo objeto.

Chamar outro método evita repetir regra. Na conta abaixo, a regra "posso sacar esse valor?" fica num lugar só, e `sacar` pergunta a ela antes de mexer no saldo:

```python
class Conta:
    def __init__(self, titular, saldo):
        self.titular = titular
        self.saldo = saldo

    def pode_sacar(self, valor):
        return valor <= self.saldo

    def sacar(self, valor):
        if not self.pode_sacar(valor):
            return False
        self.saldo -= valor
        return True
```

Se amanhã o banco permitir cheque especial, só `pode_sacar` muda; `sacar` e qualquer outro método que pergunte a ela passam a seguir a regra nova.

Dentro da classe, o outro método é chamado **pelo objeto**: `self.pode_sacar(valor)`. Escrever só `pode_sacar(valor)` faz o Python procurar uma função solta com esse nome, que não existe:

```
NameError: name 'pode_sacar' is not defined
```

O método mora na classe, não no arquivo: sem o `self.`, ele não é encontrado.

#### Devolver ou alterar?

Repare que `sacar` faz as duas coisas: altera o saldo **e** devolve `True` ou `False`, para quem chamou saber se deu certo. Decida isso para cada método e escreva no enunciado: um método que só altera o objeto devolve `None` (como `list.append`), e quem usa o resultado de um método assim recebe `None` e se confunde. O tropeço típico é `numeros = numeros.sort()`: a lista é ordenada, mas a variável passa a valer `None`. Com seus métodos acontece o mesmo: se `depositar` não tem `return`, `novo = conta.depositar(50)` guarda `None`, e o erro só aparece adiante, quando alguém tenta usar `novo`.

## Passo 2 · Previsão · Como um objeto aparece

A classe `Livro` define dois métodos especiais, `__str__` e `__repr__`. Nenhum dos dois é chamado diretamente no programa: o próprio Python decide qual usar em cada situação.

Leia o programa sem executar e digite exatamente o que ele imprime. Se não souber, arrisque: o próximo passo explica.

### Código
```python
class Livro:
    def __init__(self, titulo, paginas):
        self.titulo = titulo
        self.paginas = paginas

    def __str__(self):
        return f"{self.titulo} ({self.paginas} p.)"

    def __repr__(self):
        return f"Livro('{self.titulo}', {self.paginas})"


livro = Livro("Dom Casmurro", 256)
estante = [livro, Livro("Iracema", 144)]
print(livro)
print(f"Lendo: {livro}")
print(estante)
print(repr(livro) == str(livro))
```

### Dicas
1. `print` de um objeto e um objeto dentro de f-string usam o mesmo método.
2. Uma lista, ao ser impressa, mostra cada item com o outro método.

### Saída esperada
```text
Dom Casmurro (256 p.)
Lendo: Dom Casmurro (256 p.)
[Livro('Dom Casmurro', 256), Livro('Iracema', 144)]
False
```

## Passo 3 · Leitura · __str__ para pessoas, __repr__ para quem programa

Sem esses métodos, imprimir um objeto mostra só o tipo e o endereço de memória, que não diz nada sobre o conteúdo:

```
<__main__.Livro object at 0x0000021C26538830>
```

Métodos com dois sublinhados antes e depois do nome, como `__init__`, são chamados de **métodos especiais** (ou *dunder*, de *double underscore*). Você não os chama diretamente: o Python os chama quando precisa.

| Método | Para quem | Quem chama |
|---|---|---|
| `__str__` | quem usa o programa | `print(obj)`, `str(obj)`, `f"{obj}"` |
| `__repr__` | quem programa | `repr(obj)`, o REPL, itens dentro de listas, tuplas e dicionários |

O `__str__` é a versão amigável: `Dom Casmurro (256 p.)`. O `__repr__` é a versão sem ambiguidade, de preferência parecida com o código que recria o objeto: `Livro('Dom Casmurro', 256)`. É ele que aparece quando você imprime uma lista de objetos ou investiga um erro, e as aspas mostram que o título é um texto.

Se a classe só tiver `__repr__`, o `print` usa o `__repr__` também. O contrário não vale: com só `__str__`, a lista continua mostrando endereços. Por isso, se for escrever um só, escreva o `__repr__`.

#### Os dois devolvem texto

`__str__` e `__repr__` **devolvem** uma string; quem imprime é o `print`. Um `__str__` que imprime em vez de devolver termina sem `return`, ou seja, devolve `None`, e o Python reclama na hora:

```python
def __str__(self):
    print(f"{self.titulo} ({self.paginas} p.)")   # errado: imprime e devolve None
```

```
TypeError: __str__ returned non-string (type NoneType)
```

## Passo 4 · Exercício · Conta bancária
modo: lacunas

Complete a classe `ContaBancaria`. A regra de saque fica em `pode_sacar`, e `sacar` pergunta a ela antes de mexer no saldo. O `__str__` mostra a conta para quem usa o programa, com o saldo em duas casas decimais:

```
Conta de Ana: R$ 150.00
```

### Instruções
1. `pode_sacar(valor)` devolve `True` só quando o valor é positivo e não passa do saldo.
2. `sacar(valor)` usa `pode_sacar`: se não puder, devolve `False` sem mexer no saldo; se puder, desconta e devolve `True`.
3. Complete o método especial que `print` e `str` usam, devolvendo o texto no formato `Conta de Ana: R$ 150.00`.

### Código inicial
```python
class ContaBancaria:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo

    def pode_sacar(self, valor):
        return 0 < valor <= ___

    def depositar(self, valor):
        self.saldo += valor

    def sacar(self, valor):
        if not ___.pode_sacar(valor):
            return False
        self.saldo -= valor
        return True

    def ___(self):
        return f"Conta de {self.titular}: R$ {___:.2f}"
```

### Solução
```python
class ContaBancaria:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo

    def pode_sacar(self, valor):
        return 0 < valor <= self.saldo

    def depositar(self, valor):
        self.saldo += valor

    def sacar(self, valor):
        if not self.pode_sacar(valor):
            return False
        self.saldo -= valor
        return True

    def __str__(self):
        return f"Conta de {self.titular}: R$ {self.saldo:.2f}"
```

### Dicas
1. O saldo é um atributo do objeto: dentro do método ele se escreve com `self.`.
2. Outro método do mesmo objeto também é chamado pelo `self`.
3. O método que `print` usa tem dois sublinhados antes e dois depois do nome.

### Verificação
```json
[
  { "id": "pode-limite", "checkpoint": 1, "kind": "expr", "setup": "c = ContaBancaria(\"Caio\", 80)",
    "expr": "(c.pode_sacar(80), c.pode_sacar(81), c.pode_sacar(0))", "expected": [true, false, false],
    "name": "Com saldo 80: pode sacar 80, não pode 81 nem 0" },
  { "id": "saca", "checkpoint": 2, "kind": "expr", "setup": "c = ContaBancaria(\"Davi\", 200)\nr = c.sacar(70)",
    "expr": "(r, c.saldo)", "expected": [true, 130], "name": "Saque de 70 com saldo 200" },
  { "id": "nao-saca", "checkpoint": 2, "kind": "expr", "setup": "c = ContaBancaria(\"Davi\", 50)\nr = c.sacar(51)",
    "expr": "(r, c.saldo)", "expected": [false, 50], "name": "Saque acima do saldo devolve False e não mexe no saldo",
    "hint": "Quando pode_sacar diz não, o método devolve False antes de descontar." },
  { "id": "str", "checkpoint": 3, "kind": "expr", "setup": "c = ContaBancaria(\"Eva\")\nc.depositar(1234.5)",
    "expr": "str(c)", "expected": "Conta de Eva: R$ 1234.50", "name": "str de uma conta com 1234.5",
    "hint": "O saldo aparece sempre com duas casas decimais." },
  { "id": "print", "checkpoint": 3, "kind": "expr", "setup": "c = ContaBancaria(\"Bia\", 7)\nc.sacar(2)",
    "expr": "print(c)", "expected_stdout": "Conta de Bia: R$ 5.00", "name": "print de uma conta com saldo 5",
    "hint": "print(conta) usa o __str__: ele precisa devolver o texto, não imprimir." },
  { "id": "fstring", "checkpoint": 3, "kind": "expr", "expr": "f\"[{ContaBancaria('Ana', 150)}]\"", "expected": "[Conta de Ana: R$ 150.00]",
    "name": "A conta dentro de uma f-string" }
]
```

### Soluções erradas
```python name="__str__ imprime em vez de devolver"
class ContaBancaria:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo

    def pode_sacar(self, valor):
        return 0 < valor <= self.saldo

    def depositar(self, valor):
        self.saldo += valor

    def sacar(self, valor):
        if not self.pode_sacar(valor):
            return False
        self.saldo -= valor
        return True

    def __str__(self):
        print(f"Conta de {self.titular}: R$ {self.saldo:.2f}")
```
```python name="chama pode_sacar sem self"
class ContaBancaria:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo

    def pode_sacar(self, valor):
        return 0 < valor <= self.saldo

    def depositar(self, valor):
        self.saldo += valor

    def sacar(self, valor):
        if not pode_sacar(valor):
            return False
        self.saldo -= valor
        return True

    def __str__(self):
        return f"Conta de {self.titular}: R$ {self.saldo:.2f}"
```
```python name="saldo sem as duas casas decimais"
class ContaBancaria:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo

    def pode_sacar(self, valor):
        return 0 < valor <= self.saldo

    def depositar(self, valor):
        self.saldo += valor

    def sacar(self, valor):
        if not self.pode_sacar(valor):
            return False
        self.saldo -= valor
        return True

    def __str__(self):
        return f"Conta de {self.titular}: R$ {self.saldo}"
```
```python name="sacar desconta mesmo sem saldo"
class ContaBancaria:
    def __init__(self, titular, saldo=0):
        self.titular = titular
        self.saldo = saldo

    def pode_sacar(self, valor):
        return 0 < valor <= self.saldo

    def depositar(self, valor):
        self.saldo += valor

    def sacar(self, valor):
        self.saldo -= valor
        return self.pode_sacar(valor)

    def __str__(self):
        return f"Conta de {self.titular}: R$ {self.saldo:.2f}"
```

## Passo 5 · Exercício · Produto com as duas representações

Escreva a classe `Produto(nome, preco)` com as duas representações e um método que cria um produto novo com desconto.

```python
caneta = Produto("Caneta", 2.5)
print(caneta)               # Caneta: R$ 2.50
print([caneta])             # [Produto('Caneta', 2.5)]
promo = caneta.com_desconto(20)
print(repr(promo))          # Produto('Caneta', 2.0)
print(caneta.preco)         # 2.5
```

O `__repr__` mostra o preço do jeito que o Python mostra o número (`2.5`, `3`, `90.0`), sem formatar.

### Instruções
1. Defina `Produto` com `__init__(self, nome, preco)` e os atributos `nome` e `preco`.
2. `__repr__` devolve o texto no formato `Produto('Caneta', 2.5)`, com o nome entre aspas simples.
3. `__str__` devolve o texto no formato `Caneta: R$ 2.50`, com o preço em duas casas decimais.
4. `com_desconto(percentual)` devolve um **novo** `Produto`, com o mesmo nome e o preço reduzido pelo percentual. O produto original não muda.

### Código inicial
```python
class Produto:
    def __init__(self, nome, preco):
        self.nome = nome
        self.preco = preco
```

### Solução
```python
class Produto:
    def __init__(self, nome, preco):
        self.nome = nome
        self.preco = preco

    def __repr__(self):
        return f"Produto('{self.nome}', {self.preco})"

    def __str__(self):
        return f"{self.nome}: R$ {self.preco:.2f}"

    def com_desconto(self, percentual):
        novo_preco = self.preco * (1 - percentual / 100)
        return Produto(self.nome, novo_preco)
```

### Dicas
1. Dentro da f-string do `__repr__`, as aspas simples em volta do nome são texto comum.
2. Um desconto de 20% deixa o preço em 80% do original.
3. Para criar um objeto novo dentro de um método, chame a classe: `Produto(...)`.

### Verificação
```json
[
  { "id": "atributos", "checkpoint": 1, "kind": "expr", "setup": "p = Produto(\"Régua\", 4)", "expr": "(p.nome, p.preco)",
    "expected": ["Régua", 4], "name": "Produto guarda nome e preço" },
  { "id": "repr", "checkpoint": 2, "kind": "expr", "expr": "repr(Produto(\"Borracha\", 1.25))", "expected": "Produto('Borracha', 1.25)",
    "name": "repr de Produto(\"Borracha\", 1.25)", "hint": "Nome entre aspas simples, preço como o Python mostra o número." },
  { "id": "repr-inteiro", "checkpoint": 2, "kind": "expr", "expr": "repr(Produto(\"Lápis\", 3))", "expected": "Produto('Lápis', 3)",
    "name": "repr com preço inteiro", "hint": "No __repr__ o preço não é formatado com casas decimais." },
  { "id": "lista", "checkpoint": 2, "kind": "expr", "expr": "print([Produto(\"Cola\", 6), Produto(\"Tesoura\", 12.9)])",
    "expected_stdout": "[Produto('Cola', 6), Produto('Tesoura', 12.9)]", "name": "Lista de produtos impressa",
    "hint": "Uma lista mostra os itens com o __repr__." },
  { "id": "str", "checkpoint": 3, "kind": "expr", "expr": "str(Produto(\"Borracha\", 1.25))", "expected": "Borracha: R$ 1.25",
    "name": "str de Produto(\"Borracha\", 1.25)" },
  { "id": "print", "checkpoint": 3, "kind": "expr", "expr": "print(Produto(\"Régua\", 4))", "expected_stdout": "Régua: R$ 4.00",
    "name": "print de Produto(\"Régua\", 4)", "hint": "No __str__ o preço tem sempre duas casas decimais." },
  { "id": "desconto-tipo", "checkpoint": 4, "kind": "expr", "expr": "Produto(\"Estojo\", 30).com_desconto(10)", "type": "Produto",
    "name": "com_desconto devolve um Produto", "hint": "Devolva um objeto Produto, não só o número do preço." },
  { "id": "desconto", "checkpoint": 4, "kind": "expr", "setup": "p = Produto(\"Mochila\", 120)\nn = p.com_desconto(25)",
    "expr": "(n.nome, round(n.preco, 2), p.preco)", "expected": ["Mochila", 90.0, 120],
    "name": "25% de desconto em 120 dá 90 e o original continua 120",
    "hint": "Calcule o preço novo e crie outro Produto; não altere o self." }
]
```

### Soluções erradas
```python name="só __str__: a lista mostra endereços"
class Produto:
    def __init__(self, nome, preco):
        self.nome = nome
        self.preco = preco

    def __str__(self):
        return f"{self.nome}: R$ {self.preco:.2f}"

    def com_desconto(self, percentual):
        return Produto(self.nome, self.preco * (1 - percentual / 100))
```
```python name="__repr__ sem as aspas no nome"
class Produto:
    def __init__(self, nome, preco):
        self.nome = nome
        self.preco = preco

    def __repr__(self):
        return f"Produto({self.nome}, {self.preco})"

    def __str__(self):
        return f"{self.nome}: R$ {self.preco:.2f}"

    def com_desconto(self, percentual):
        return Produto(self.nome, self.preco * (1 - percentual / 100))
```
```python name="__str__ e __repr__ trocados"
class Produto:
    def __init__(self, nome, preco):
        self.nome = nome
        self.preco = preco

    def __str__(self):
        return f"Produto('{self.nome}', {self.preco})"

    def __repr__(self):
        return f"{self.nome}: R$ {self.preco:.2f}"

    def com_desconto(self, percentual):
        return Produto(self.nome, self.preco * (1 - percentual / 100))
```
```python name="com_desconto altera o próprio produto"
class Produto:
    def __init__(self, nome, preco):
        self.nome = nome
        self.preco = preco

    def __repr__(self):
        return f"Produto('{self.nome}', {self.preco})"

    def __str__(self):
        return f"{self.nome}: R$ {self.preco:.2f}"

    def com_desconto(self, percentual):
        self.preco = self.preco * (1 - percentual / 100)
        return self
```

## Passo 6 · Leitura · Atributos de classe: constantes e contadores

Um atributo escrito no corpo da classe pertence à classe e é o mesmo para todos os objetos. Ele serve bem para duas coisas.

**Constantes do tipo**, como uma taxa que vale para todas as contas. Mudar a taxa na classe muda para todo mundo, num lugar só:

```python
class Conta:
    taxa_saque = 2.0

    def custo_saque(self, valor):
        return valor + Conta.taxa_saque
```

**Contadores compartilhados**, como o próximo número de matrícula. O ponto delicado é **como alterar**:

```python
class Aluno:
    proxima_matricula = 1

    def __init__(self, nome):
        self.nome = nome
        self.matricula = Aluno.proxima_matricula
        Aluno.proxima_matricula += 1
```

`Aluno("Ana")` recebe a matrícula 1, `Aluno("Bia")` a 2, e assim por diante: cada `__init__` lê o valor da classe e aumenta o valor da classe.

#### O engano: alterar pela instância

Trocar `Aluno.proxima_matricula += 1` por `self.proxima_matricula += 1` parece igual, mas não é. **Ler** `self.proxima_matricula` encontra o valor da classe, porque o objeto não tem um próprio. **Atribuir** a `self.proxima_matricula` cria um atributo novo, só naquele objeto, e o da classe nunca muda. Resultado: todos os alunos ficam com a matrícula 1.

Regra: para ler, `self.atributo` ou `Classe.atributo` funcionam. Para alterar um atributo de classe, escreva sempre `Classe.atributo = ...`.

#### Métodos que devolvem self

Um método que altera o objeto pode terminar com `return self`. Assim a chamada devolve o próprio objeto, e dá para encadear:

```python
pedido.adicionar("café", 4.5).adicionar("pão", 3.5)
```

A segunda chamada é feita sobre o que a primeira devolveu. Se `adicionar` não tiver `return self`, ele devolve `None`, e o encadeamento quebra com `AttributeError: 'NoneType' object has no attribute 'adicionar'`.

## Passo 7 · Exercício · Pedidos numerados

A lanchonete do bandejão numera os pedidos em sequência e cobra uma taxa de serviço igual para todos. Escreva a classe `Pedido`.

```python
p = Pedido("Ana")
p.adicionar("café", 4.5).adicionar("pão de queijo", 5.5)
print(p.id, p.total())     # 1 11.0
print(p)                   # Pedido 1 (Ana): R$ 11.00
print(Pedido("Bia").id)    # 2
```

### Instruções
1. A classe tem dois atributos de classe: `proximo_id = 1` e `taxa_servico = 0.1`. Cada pedido novo recebe em `id` o próximo número da sequência (1, 2, 3…) e guarda o `cliente`.
2. `adicionar(item, preco)` guarda o item na lista do próprio pedido e devolve o próprio pedido, para permitir encadear chamadas.
3. `total()` devolve a soma dos preços acrescida da taxa de serviço da classe.
   Dica: se alguém mudar `Pedido.taxa_servico`, o total de qualquer pedido precisa acompanhar.
4. `__str__` devolve o texto no formato `Pedido 1 (Ana): R$ 11.00`.

### Código inicial
```python
class Pedido:
    proximo_id = 1
    taxa_servico = 0.1

    def __init__(self, cliente):
        self.cliente = cliente
```

### Solução
```python
class Pedido:
    proximo_id = 1
    taxa_servico = 0.1

    def __init__(self, cliente):
        self.cliente = cliente
        self.id = Pedido.proximo_id
        Pedido.proximo_id += 1
        self.itens = []

    def adicionar(self, item, preco):
        self.itens.append((item, preco))
        return self

    def total(self):
        soma = 0
        for _, preco in self.itens:
            soma += preco
        return soma * (1 + Pedido.taxa_servico)

    def __str__(self):
        return f"Pedido {self.id} ({self.cliente}): R$ {self.total():.2f}"
```

### Dicas
1. O número do pedido é lido da classe e a classe é atualizada: `Pedido.proximo_id`, não `self.proximo_id`, na hora de somar 1.
2. A lista de itens é de cada pedido, então nasce no `__init__`.
3. O `__str__` pode chamar `self.total()` em vez de refazer a conta.

### Verificação
```json
[
  { "id": "ids", "checkpoint": 1, "kind": "expr", "setup": "a = Pedido(\"Caio\")\nb = Pedido(\"Davi\")\nc = Pedido(\"Eva\")",
    "expr": "(a.id, b.id, c.id, Pedido.proximo_id, b.cliente)", "expected": [1, 2, 3, 4, "Davi"],
    "name": "Três pedidos recebem os ids 1, 2 e 3",
    "hint": "Se todos ficam com o mesmo id, você está alterando o atributo pelo objeto, e não pela classe." },
  { "id": "itens-separados", "checkpoint": 2, "kind": "expr", "setup": "a = Pedido(\"A\")\nb = Pedido(\"B\")\na.adicionar(\"suco\", 6)",
    "expr": "(a.total() > 0, b.total())", "expected": [true, 0],
    "name": "Itens de um pedido não aparecem em outro" },
  { "id": "encadeia", "checkpoint": 2, "kind": "expr", "setup": "p = Pedido(\"Bia\")",
    "expr": "p.adicionar(\"bolo\", 7) is p", "expected": true,
    "name": "adicionar devolve o próprio pedido", "hint": "Termine adicionar com return self." },
  { "id": "total", "checkpoint": 3, "kind": "expr", "expr": "Pedido(\"Davi\").adicionar(\"café\", 3).adicionar(\"misto\", 9).adicionar(\"água\", 3).total()",
    "expected": 16.5, "tolerance": 1e-9, "name": "Total de 3 + 9 + 3 com 10% de taxa" },
  { "id": "taxa-da-classe", "checkpoint": 3, "kind": "expr", "setup": "Pedido.taxa_servico = 0.5\np = Pedido(\"Eva\")\np.adicionar(\"x\", 10)",
    "expr": "p.total()", "expected": 15.0, "tolerance": 1e-9,
    "name": "O total usa a taxa guardada na classe", "hint": "Não escreva 0.1 no cálculo: leia a taxa do atributo de classe." },
  { "id": "str", "checkpoint": 4, "kind": "expr", "setup": "Pedido(\"Ana\")\np = Pedido(\"Caio\")\np.adicionar(\"pastel\", 8).adicionar(\"caldo\", 4)",
    "expr": "str(p)", "expected": "Pedido 2 (Caio): R$ 13.20", "name": "str do segundo pedido" }
]
```

### Soluções erradas
```python name="soma 1 pelo objeto: todos ficam com id 1"
class Pedido:
    proximo_id = 1
    taxa_servico = 0.1

    def __init__(self, cliente):
        self.cliente = cliente
        self.id = self.proximo_id
        self.proximo_id += 1
        self.itens = []

    def adicionar(self, item, preco):
        self.itens.append((item, preco))
        return self

    def total(self):
        soma = 0
        for _, preco in self.itens:
            soma += preco
        return soma * (1 + Pedido.taxa_servico)

    def __str__(self):
        return f"Pedido {self.id} ({self.cliente}): R$ {self.total():.2f}"
```
```python name="adicionar sem return self"
class Pedido:
    proximo_id = 1
    taxa_servico = 0.1

    def __init__(self, cliente):
        self.cliente = cliente
        self.id = Pedido.proximo_id
        Pedido.proximo_id += 1
        self.itens = []

    def adicionar(self, item, preco):
        self.itens.append((item, preco))

    def total(self):
        soma = 0
        for _, preco in self.itens:
            soma += preco
        return soma * (1 + Pedido.taxa_servico)

    def __str__(self):
        return f"Pedido {self.id} ({self.cliente}): R$ {self.total():.2f}"
```
```python name="taxa de 10% escrita direto na conta"
class Pedido:
    proximo_id = 1
    taxa_servico = 0.1

    def __init__(self, cliente):
        self.cliente = cliente
        self.id = Pedido.proximo_id
        Pedido.proximo_id += 1
        self.itens = []

    def adicionar(self, item, preco):
        self.itens.append((item, preco))
        return self

    def total(self):
        soma = 0
        for _, preco in self.itens:
            soma += preco
        return soma * 1.1

    def __str__(self):
        return f"Pedido {self.id} ({self.cliente}): R$ {self.total():.2f}"
```
```python name="lista de itens na classe, compartilhada"
class Pedido:
    proximo_id = 1
    taxa_servico = 0.1
    itens = []

    def __init__(self, cliente):
        self.cliente = cliente
        self.id = Pedido.proximo_id
        Pedido.proximo_id += 1

    def adicionar(self, item, preco):
        self.itens.append((item, preco))
        return self

    def total(self):
        soma = 0
        for _, preco in self.itens:
            soma += preco
        return soma * (1 + Pedido.taxa_servico)

    def __str__(self):
        return f"Pedido {self.id} ({self.cliente}): R$ {self.total():.2f}"
```

## Passo 8 · Quiz · Métodos e representações

### Pergunta
A classe `Ponto` define só `__repr__`, que devolve `Ponto(1, 2)`. O que `print(p)` mostra?
- [ ] `<__main__.Ponto object at 0x...>`, porque falta o `__str__`
- [x] `Ponto(1, 2)`, porque sem `__str__` o `print` usa o `__repr__`
- [ ] Nada: o `print` levanta `TypeError`
- [ ] `p`
> Quando falta `__str__`, `str(obj)` recorre ao `__repr__`. O contrário não acontece: com só `__str__`, listas e o `repr` continuam mostrando o endereço. Por isso o `__repr__` é o primeiro a escrever.

### Pergunta
`Produto` tem `__str__` devolvendo `Caneta: R$ 2.50` e `__repr__` devolvendo `Produto('Caneta', 2.5)`. O que `print([caneta])` mostra?
- [ ] `[Caneta: R$ 2.50]`
- [x] `[Produto('Caneta', 2.5)]`
- [ ] `Caneta: R$ 2.50`
- [ ] `['Caneta: R$ 2.50']`
> O `print` converte a lista com `str`, e a lista monta o próprio texto chamando `repr` em cada item. Dentro de coleções, quem aparece é sempre o `__repr__`.

### Pergunta
Uma classe tem `total = 0` no corpo e, no `__init__`, a linha `self.total += 1`. Depois de criar três objetos, quanto vale `Classe.total`?
- [x] `0`
- [ ] `3`
- [ ] `1`
- [ ] Dá `AttributeError`, porque o objeto não tem `total`
> `self.total += 1` lê o `total` da classe (0) e grava o resultado num atributo novo do objeto. A classe nunca é alterada e continua com 0; cada objeto fica com o seu `total` igual a 1. Para alterar o atributo de classe, escreva `Classe.total += 1`.
