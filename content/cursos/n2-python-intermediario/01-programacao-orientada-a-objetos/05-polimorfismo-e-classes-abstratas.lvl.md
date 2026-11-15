---
slug: n2-m1-05-polimorfismo-e-classes-abstratas
titulo: Polimorfismo e classes abstratas
descricao: Interfaces implícitas (duck typing), classes abstratas com abc e o padrão 'estratégia' com objetos intercambiáveis.
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
- Escrever código que funciona com qualquer objeto que tenha os métodos esperados (duck typing)
- Definir classes abstratas com ABC e @abstractmethod e explicar quando usá-las
- Substituir cadeias de if/elif por polimorfismo
---

## Passo 1 · Leitura · A cadeia de if que só cresce

A lanchonete aceita três formas de pagamento, e o valor final depende de qual foi escolhida:

```python
def cobrar(tipo, valor):
    if tipo == "pix":
        return valor * 0.95
    elif tipo == "boleto":
        return valor + 3.5
    elif tipo == "cartao":
        return valor
    raise ValueError(f"tipo desconhecido: {tipo}")
```

No dia em que entrar o vale-refeição, alguém precisa abrir essa função e acrescentar um `elif`. E não só essa: a função que gera o recibo, a que calcula o prazo e a que monta o relatório têm a mesma cadeia de `if`. Esquecer uma delas é um erro que só aparece em produção. E um `"Pix"` com maiúscula cai no `raise`.

**Polimorfismo** é a saída: em vez de perguntar o tipo e decidir o que fazer, você pede ao objeto e **ele** sabe o que fazer. Cada forma de pagamento vira uma classe com o mesmo método:

```python
class Pix:
    def cobrar(self, valor):
        return valor * 0.95


class Boleto:
    def cobrar(self, valor):
        return valor + 3.5


for forma in [Pix(), Boleto()]:
    print(forma.cobrar(100))
```

A linha `forma.cobrar(100)` é sempre a mesma; o comportamento muda conforme o objeto. Para aceitar o vale-refeição, basta escrever uma classe nova com `cobrar`. Nenhum código existente precisa mudar.

#### Duck typing

Repare que `Pix` e `Boleto` não herdam de nenhuma classe em comum. O laço funciona porque os dois **têm** o método `cobrar`, e isso basta. O Python não confere o tipo antes da chamada: ele procura o método no objeto na hora de chamar. Se encontrar, chama; se não, levanta `AttributeError`.

É o *duck typing*: "se anda como pato e grasna como pato, é um pato". O que importa é o que o objeto **sabe fazer**, não de que classe ele vem. O conjunto de métodos que o código espera (aqui, só `cobrar(valor)`) funciona como uma **interface**: um combinado implícito entre quem chama e quem é chamado.

O erro que desfaz o polimorfismo é voltar a perguntar o tipo dentro da função genérica:

```python
def fechar_conta(forma, valor):
    if isinstance(forma, Pix):       # de novo a cadeia de if
        ...
```

Assim, uma classe nova volta a exigir mudança nesta função. Se a função genérica precisa saber o tipo, o comportamento ainda não está no lugar certo.

## Passo 2 · Previsão · A mesma chamada, quatro respostas

O laço no fim do programa chama `apresentar()` em quatro objetos. Alguns herdam de `Pato`, outros não; alguns sobrescrevem `falar`, outros não. `type(self).__name__` é o nome da classe do objeto.

Leia o programa sem executar e digite exatamente o que ele imprime.

### Código
```python
class Pato:
    def falar(self):
        return "quack"

    def apresentar(self):
        return f"{type(self).__name__}: {self.falar()}"


class Pinguim(Pato):
    pass


class Papagaio(Pato):
    def __init__(self, frase):
        self.frase = frase

    def falar(self):
        return self.frase + "!"


class Robo:
    def falar(self):
        return "bip"

    def apresentar(self):
        return "Robo diz " + self.falar()


for ser in [Pato(), Pinguim(), Papagaio("Olá"), Robo()]:
    print(ser.apresentar())
```

### Dicas
1. `Pinguim` não escreve nada: tudo vem de `Pato`, mas `type(self)` é a classe do objeto, não a classe onde o método foi escrito.
2. `Papagaio` herda `apresentar`, e o `self.falar()` dentro dele encontra o `falar` do papagaio.
3. `Robo` não herda de `Pato`, mas tem os dois métodos: o laço não percebe a diferença.

### Saída esperada
```text
Pato: quack
Pinguim: quack
Papagaio: Olá!
Robo diz bip
```

## Passo 3 · Exercício · Notificadores

O sistema de avisos da faculdade manda mensagens por canais diferentes. Cada canal é uma classe com o método `enviar(mensagem)`, que **imprime** o envio. A função `notificar_todos` não sabe e não quer saber quais canais existem: ela chama `enviar` em cada um.

```python
canais = [Email("ana@usp.br"), Sms("16 99999-0000")]
total = notificar_todos(canais, "Reunião às 14h no bloco B")
```

imprime

```
E-mail para ana@usp.br: Reunião às 14h no bloco B
SMS para 16 99999-0000: Reunião às 14h no...
```

e `total` vale `2`.

### Instruções
1. `Email(endereco)` tem `enviar(mensagem)`, que imprime `E-mail para <endereço>: <mensagem>`.
2. `Sms(numero)` tem `enviar(mensagem)`, que imprime `SMS para <número>: <mensagem>`. SMS é curto: mensagem com mais de 20 caracteres vira os 17 primeiros seguidos de `...`.
3. `notificar_todos(canais, mensagem)` chama `enviar` em cada canal, na ordem da lista, e devolve quantos envios fez. Ela precisa funcionar com **qualquer** objeto que tenha `enviar`, inclusive canais que ainda não existem.

### Código inicial
```python
class Email:
    def __init__(self, endereco):
        self.endereco = endereco


class Sms:
    def __init__(self, numero):
        self.numero = numero


def notificar_todos(canais, mensagem):
    pass
```

### Solução
```python
class Email:
    def __init__(self, endereco):
        self.endereco = endereco

    def enviar(self, mensagem):
        print(f"E-mail para {self.endereco}: {mensagem}")


class Sms:
    LIMITE = 20

    def __init__(self, numero):
        self.numero = numero

    def enviar(self, mensagem):
        if len(mensagem) > Sms.LIMITE:
            mensagem = mensagem[:Sms.LIMITE - 3] + "..."
        print(f"SMS para {self.numero}: {mensagem}")


def notificar_todos(canais, mensagem):
    enviados = 0
    for canal in canais:
        canal.enviar(mensagem)
        enviados += 1
    return enviados
```

### Dicas
1. Os dois `enviar` têm a mesma assinatura: `enviar(self, mensagem)`.
2. Fatias de string (`texto[:17]`) cortam a mensagem; só corte quando passar de 20 caracteres.
3. `notificar_todos` não usa `if` nem `isinstance`: ela confia que cada canal sabe enviar.

### Verificação
```json
[
  { "id": "email", "checkpoint": 1, "kind": "expr", "expr": "Email(\"bia@usp.br\").enviar(\"Prova amanhã\")",
    "expected_stdout": "E-mail para bia@usp.br: Prova amanhã", "name": "E-mail para bia@usp.br",
    "hint": "enviar imprime; não precisa devolver nada." },
  { "id": "sms-curto", "checkpoint": 2, "kind": "expr", "expr": "Sms(\"11 91234-5678\").enviar(\"Aula cancelada hoje!\")",
    "expected_stdout": "SMS para 11 91234-5678: Aula cancelada hoje!",
    "name": "SMS com exatamente 20 caracteres não é cortado", "hint": "Só corte mensagens com MAIS de 20 caracteres." },
  { "id": "sms-longo", "checkpoint": 2, "kind": "expr", "expr": "Sms(\"16 98888-1111\").enviar(\"Entrega do relatório hoje\")",
    "expected_stdout": "SMS para 16 98888-1111: Entrega do relató...", "name": "SMS longo é cortado com ...",
    "hint": "A mensagem cortada tem 20 caracteres no total, contando os três pontos." },
  { "id": "todos", "checkpoint": 3, "kind": "expr", "expr": "notificar_todos([Sms(\"19 3333-4444\"), Email(\"caio@usp.br\")], \"Oi\")",
    "expected_stdout": "SMS para 19 3333-4444: Oi\nE-mail para caio@usp.br: Oi", "name": "Dois canais, na ordem da lista" },
  { "id": "conta", "checkpoint": 3, "kind": "expr", "expr": "notificar_todos([Email(\"a@b.c\"), Email(\"d@e.f\"), Sms(\"1\")], \"x\")",
    "expected": 3, "name": "notificar_todos devolve quantos envios fez" },
  { "id": "vazia", "checkpoint": 3, "kind": "expr", "expr": "notificar_todos([], \"x\")", "expected": 0,
    "name": "Lista vazia: 0 envios" },
  { "id": "canal-novo", "checkpoint": 3, "kind": "expr",
    "setup": "class Mural:\n    def enviar(self, mensagem):\n        print(\"Mural:\", mensagem)",
    "expr": "notificar_todos([Mural(), Email(\"eva@usp.br\")], \"Festa junina\")",
    "expected_stdout": "Mural: Festa junina\nE-mail para eva@usp.br: Festa junina",
    "name": "Funciona com um canal novo, que não é Email nem Sms",
    "hint": "Não pergunte o tipo do canal: chame canal.enviar(mensagem) em todos." }
]
```

### Soluções erradas
```python name="notificar_todos pergunta o tipo de cada canal"
class Email:
    def __init__(self, endereco):
        self.endereco = endereco

    def enviar(self, mensagem):
        print(f"E-mail para {self.endereco}: {mensagem}")


class Sms:
    def __init__(self, numero):
        self.numero = numero

    def enviar(self, mensagem):
        if len(mensagem) > 20:
            mensagem = mensagem[:17] + "..."
        print(f"SMS para {self.numero}: {mensagem}")


def notificar_todos(canais, mensagem):
    enviados = 0
    for canal in canais:
        if isinstance(canal, Email) or isinstance(canal, Sms):
            canal.enviar(mensagem)
            enviados += 1
    return enviados
```
```python name="SMS sem corte"
class Email:
    def __init__(self, endereco):
        self.endereco = endereco

    def enviar(self, mensagem):
        print(f"E-mail para {self.endereco}: {mensagem}")


class Sms:
    def __init__(self, numero):
        self.numero = numero

    def enviar(self, mensagem):
        print(f"SMS para {self.numero}: {mensagem}")


def notificar_todos(canais, mensagem):
    enviados = 0
    for canal in canais:
        canal.enviar(mensagem)
        enviados += 1
    return enviados
```
```python name="corta com 20 caracteres mais os três pontos"
class Email:
    def __init__(self, endereco):
        self.endereco = endereco

    def enviar(self, mensagem):
        print(f"E-mail para {self.endereco}: {mensagem}")


class Sms:
    def __init__(self, numero):
        self.numero = numero

    def enviar(self, mensagem):
        if len(mensagem) >= 20:
            mensagem = mensagem[:20] + "..."
        print(f"SMS para {self.numero}: {mensagem}")


def notificar_todos(canais, mensagem):
    enviados = 0
    for canal in canais:
        canal.enviar(mensagem)
        enviados += 1
    return enviados
```
```python name="enviar devolve o texto em vez de imprimir"
class Email:
    def __init__(self, endereco):
        self.endereco = endereco

    def enviar(self, mensagem):
        return f"E-mail para {self.endereco}: {mensagem}"


class Sms:
    def __init__(self, numero):
        self.numero = numero

    def enviar(self, mensagem):
        if len(mensagem) > 20:
            mensagem = mensagem[:17] + "..."
        return f"SMS para {self.numero}: {mensagem}"


def notificar_todos(canais, mensagem):
    enviados = 0
    for canal in canais:
        canal.enviar(mensagem)
        enviados += 1
    return enviados
```

## Passo 4 · Leitura · Classes abstratas

Duck typing confia que cada objeto tem o método certo. Quando várias classes precisam seguir o mesmo combinado, vale escrever o combinado no código: uma **classe abstrata**, que existe só para ser herdada e declara os métodos que toda subclasse é obrigada a ter.

O módulo `abc` (de *abstract base classes*) traz as duas peças: a classe `ABC`, de onde a classe abstrata herda, e o decorador `@abstractmethod`, que marca o método obrigatório.

```python
from abc import ABC, abstractmethod


class Pagamento(ABC):
    @abstractmethod
    def cobrar(self, valor):
        """Devolve o valor final a cobrar."""

    def recibo(self, valor):
        return f"Total: R$ {self.cobrar(valor):.2f}"


class Pix(Pagamento):
    def cobrar(self, valor):
        return valor * 0.95
```

O método abstrato não precisa de corpo: a docstring basta. Ele diz **o que** toda forma de pagamento faz, e cada subclasse diz **como**. Repare que `recibo` é um método comum, herdado pronto, que chama `cobrar`: a base pode usar um método que ela mesma não implementa.

#### O que o Python garante

Uma classe com algum método abstrato não implementado **não pode ser instanciada**:

```python
Pagamento()
```

```
TypeError: Can't instantiate abstract class Pagamento without an implementation for abstract method 'cobrar'
```

O mesmo vale para uma subclasse que esqueceu o método. Repare **quando** o erro aparece: na criação do objeto, não na definição da classe. Uma `class Boleto(Pagamento)` sem `cobrar` é aceita; o `TypeError` vem em `Boleto()`. Ainda assim, é bem mais cedo do que um `AttributeError` no meio de uma compra.

Os dois ingredientes são necessários. Sem `@abstractmethod`, o método é comum e `Pagamento()` funciona. Sem herdar de `ABC`, o decorador não tem efeito nenhum.

#### Abstrata ou duck typing?

Use classe abstrata quando você controla a hierarquia e quer que o esquecimento de um método apareça logo, com uma mensagem clara, ou quando a base tem métodos prontos para herdar (como `recibo`). Para funções que só chamam um método, duck typing basta: `notificar_todos` aceita qualquer coisa com `enviar`, inclusive objetos de classes que não são suas.

## Passo 5 · Exercício · Formas de pagamento
modo: lacunas

Complete a hierarquia de pagamentos. `Pagamento` é abstrata e obriga cada subclasse a ter `cobrar(valor)`; o `recibo` é escrito uma vez só, na base, e usa o `cobrar` de cada subclasse. Cada classe tem um atributo de classe `nome`, usado no recibo.

As regras: Pix tem 5% de desconto; boleto tem taxa fixa de R\$ 3,50; cartão em até 3 parcelas não tem juros, e acima disso tem 10% de acréscimo.

### Instruções
1. Faça `Pagamento` herdar da classe base de classes abstratas, importada do módulo `abc`.
2. Marque `cobrar` como método abstrato: nem `Pagamento` nem uma subclasse sem `cobrar` podem ser instanciadas.
3. Complete `recibo`, que usa o `cobrar` do próprio objeto.
4. Complete o `Cartao`: a assinatura do método que ele implementa.

### Código inicial
```python
from abc import ___, abstractmethod


class Pagamento(___):
    nome = "Pagamento"

    @___
    def cobrar(self, valor):
        """Devolve o valor final a cobrar."""

    def recibo(self, valor):
        return f"{self.nome}: R$ {self.___(valor):.2f}"


class Pix(Pagamento):
    nome = "Pix"

    def cobrar(self, valor):
        return valor * 0.95


class Boleto(Pagamento):
    nome = "Boleto"

    def cobrar(self, valor):
        return valor + 3.5


class Cartao(Pagamento):
    nome = "Cartão"

    def __init__(self, parcelas):
        self.parcelas = parcelas

    def ___(self, valor):
        if self.parcelas <= 3:
            return valor
        return valor * 1.1
```

### Solução
```python
from abc import ABC, abstractmethod


class Pagamento(ABC):
    nome = "Pagamento"

    @abstractmethod
    def cobrar(self, valor):
        """Devolve o valor final a cobrar."""

    def recibo(self, valor):
        return f"{self.nome}: R$ {self.cobrar(valor):.2f}"


class Pix(Pagamento):
    nome = "Pix"

    def cobrar(self, valor):
        return valor * 0.95


class Boleto(Pagamento):
    nome = "Boleto"

    def cobrar(self, valor):
        return valor + 3.5


class Cartao(Pagamento):
    nome = "Cartão"

    def __init__(self, parcelas):
        self.parcelas = parcelas

    def cobrar(self, valor):
        if self.parcelas <= 3:
            return valor
        return valor * 1.1
```

### Dicas
1. Do módulo `abc` vêm duas coisas: a classe base e o decorador. As duas aparecem no `import`.
2. O decorador vai na linha de cima do método obrigatório.
3. Para a subclasse deixar de ser abstrata, o método dela precisa ter exatamente o nome do método abstrato.

### Verificação
```json
[
  { "id": "abstrata", "checkpoint": 1, "kind": "expr", "expr": "Pagamento()", "raises": "TypeError",
    "name": "Pagamento() não pode ser instanciada", "hint": "A classe precisa herdar de ABC e ter o método marcado como abstrato." },
  { "id": "subclasse-incompleta", "checkpoint": 2, "kind": "expr",
    "setup": "class ValeRefeicao(Pagamento):\n    nome = \"VR\"", "expr": "ValeRefeicao()", "raises": "TypeError",
    "name": "Subclasse sem cobrar não pode ser instanciada", "hint": "Marque cobrar com @abstractmethod." },
  { "id": "subclasse-completa", "checkpoint": 2, "kind": "expr",
    "setup": "class Cortesia(Pagamento):\n    def cobrar(self, valor):\n        return 0",
    "expr": "Cortesia().recibo(80)", "expected": "Pagamento: R$ 0.00",
    "name": "Subclasse nova com cobrar funciona e herda o recibo" },
  { "id": "pix", "checkpoint": 3, "kind": "expr", "expr": "Pix().recibo(10)", "expected": "Pix: R$ 9.50",
    "name": "Recibo do Pix de 10" },
  { "id": "boleto", "checkpoint": 3, "kind": "expr", "expr": "(Boleto().cobrar(100), Boleto().recibo(20))",
    "expected": [103.5, "Boleto: R$ 23.50"], "name": "Boleto de 100 e recibo do boleto de 20" },
  { "id": "cartao-sem-juros", "checkpoint": 4, "kind": "expr", "expr": "Cartao(3).cobrar(300)", "expected": 300,
    "name": "Cartão em 3 parcelas não tem juros" },
  { "id": "cartao-com-juros", "checkpoint": 4, "kind": "expr", "expr": "Cartao(6).recibo(50)", "expected": "Cartão: R$ 55.00",
    "name": "Recibo do cartão em 6 parcelas" },
  { "id": "polimorfico", "checkpoint": 4, "kind": "expr", "expr": "[round(p.cobrar(200), 2) for p in [Pix(), Boleto(), Cartao(4)]]",
    "expected": [190.0, 203.5, 220.0], "name": "A mesma chamada em três formas de pagamento" }
]
```

### Soluções erradas
```python name="esquece o @abstractmethod"
from abc import ABC, abstractmethod


class Pagamento(ABC):
    nome = "Pagamento"

    def cobrar(self, valor):
        """Devolve o valor final a cobrar."""

    def recibo(self, valor):
        return f"{self.nome}: R$ {self.cobrar(valor):.2f}"


class Pix(Pagamento):
    nome = "Pix"

    def cobrar(self, valor):
        return valor * 0.95


class Boleto(Pagamento):
    nome = "Boleto"

    def cobrar(self, valor):
        return valor + 3.5


class Cartao(Pagamento):
    nome = "Cartão"

    def __init__(self, parcelas):
        self.parcelas = parcelas

    def cobrar(self, valor):
        if self.parcelas <= 3:
            return valor
        return valor * 1.1
```
```python name="não herda de ABC: o decorador fica sem efeito"
from abc import ABC, abstractmethod


class Pagamento:
    nome = "Pagamento"

    @abstractmethod
    def cobrar(self, valor):
        """Devolve o valor final a cobrar."""

    def recibo(self, valor):
        return f"{self.nome}: R$ {self.cobrar(valor):.2f}"


class Pix(Pagamento):
    nome = "Pix"

    def cobrar(self, valor):
        return valor * 0.95


class Boleto(Pagamento):
    nome = "Boleto"

    def cobrar(self, valor):
        return valor + 3.5


class Cartao(Pagamento):
    nome = "Cartão"

    def __init__(self, parcelas):
        self.parcelas = parcelas

    def cobrar(self, valor):
        if self.parcelas <= 3:
            return valor
        return valor * 1.1
```
```python name="Cartao implementa um método com outro nome"
from abc import ABC, abstractmethod


class Pagamento(ABC):
    nome = "Pagamento"

    @abstractmethod
    def cobrar(self, valor):
        """Devolve o valor final a cobrar."""

    def recibo(self, valor):
        return f"{self.nome}: R$ {self.cobrar(valor):.2f}"


class Pix(Pagamento):
    nome = "Pix"

    def cobrar(self, valor):
        return valor * 0.95


class Boleto(Pagamento):
    nome = "Boleto"

    def cobrar(self, valor):
        return valor + 3.5


class Cartao(Pagamento):
    nome = "Cartão"

    def __init__(self, parcelas):
        self.parcelas = parcelas

    def calcular(self, valor):
        if self.parcelas <= 3:
            return valor
        return valor * 1.1
```
```python name="recibo pergunta o tipo em vez de chamar cobrar"
from abc import ABC, abstractmethod


class Pagamento(ABC):
    nome = "Pagamento"

    @abstractmethod
    def cobrar(self, valor):
        """Devolve o valor final a cobrar."""

    def recibo(self, valor):
        if isinstance(self, Pix):
            total = valor * 0.95
        elif isinstance(self, Boleto):
            total = valor + 3.5
        else:
            total = valor
        return f"{self.nome}: R$ {total:.2f}"


class Pix(Pagamento):
    nome = "Pix"

    def cobrar(self, valor):
        return valor * 0.95


class Boleto(Pagamento):
    nome = "Boleto"

    def cobrar(self, valor):
        return valor + 3.5


class Cartao(Pagamento):
    nome = "Cartão"

    def __init__(self, parcelas):
        self.parcelas = parcelas

    def cobrar(self, valor):
        if self.parcelas <= 3:
            return valor
        return valor * 1.1
```

## Passo 6 · Exercício · Frete sem if

Esta função calcula o frete de uma loja, e cada transportadora nova aumenta a cadeia de `if`:

```python
def calcular_frete(tipo, peso):
    if tipo == "sedex":
        return 20 + 5 * peso
    elif tipo == "pac":
        if peso > 30:
            raise ValueError("PAC aceita até 30 kg")
        return 12 + 2 * peso
    elif tipo == "retirada":
        return 0
```

Reescreva com polimorfismo, no padrão **estratégia**: cada transportadora é um objeto com `calcular(peso)`, e a `CalculadoraDeFrete` recebe uma transportadora e delega o cálculo a ela. Trocar de transportadora é trocar o objeto, sem tocar na calculadora.

```python
calc = CalculadoraDeFrete(Pac())
print(calc.cotar(4))            # 20
calc.trocar(Sedex())
print(calc.cotar(4))            # 40
print(type(mais_barata([Sedex(), Pac()], 3)).__name__)   # Pac
```

### Instruções
1. Crie as classes `Sedex`, `Pac` e `Retirada`, cada uma com `calcular(peso)` seguindo as regras da função acima (o PAC levanta `ValueError` acima de 30 kg).
2. `CalculadoraDeFrete(transportadora)` guarda a transportadora; `cotar(peso)` devolve o frete calculado por ela; `trocar(nova)` passa a usar outra transportadora.
3. `mais_barata(transportadoras, peso)` devolve a **transportadora** (o objeto, não o valor) com o menor frete para aquele peso.
4. Nada disso pode perguntar o tipo da transportadora: qualquer objeto com `calcular(peso)` precisa funcionar.

### Código inicial
```python
def calcular_frete(tipo, peso):
    if tipo == "sedex":
        return 20 + 5 * peso
    elif tipo == "pac":
        if peso > 30:
            raise ValueError("PAC aceita até 30 kg")
        return 12 + 2 * peso
    elif tipo == "retirada":
        return 0
```

### Solução
```python
class Sedex:
    def calcular(self, peso):
        return 20 + 5 * peso


class Pac:
    LIMITE_KG = 30

    def calcular(self, peso):
        if peso > Pac.LIMITE_KG:
            raise ValueError("PAC aceita até 30 kg")
        return 12 + 2 * peso


class Retirada:
    def calcular(self, peso):
        return 0


class CalculadoraDeFrete:
    def __init__(self, transportadora):
        self.transportadora = transportadora

    def cotar(self, peso):
        return self.transportadora.calcular(peso)

    def trocar(self, nova):
        self.transportadora = nova


def mais_barata(transportadoras, peso):
    return min(transportadoras, key=lambda t: t.calcular(peso))
```

### Dicas
1. A calculadora guarda a transportadora num atributo e, em `cotar`, chama o `calcular` dela.
2. `trocar` só reatribui o atributo.
3. Em `mais_barata`, `min` aceita `key=`: a função que diz quanto cada transportadora cobra.

### Verificação
```json
[
  { "id": "classes", "checkpoint": 1, "kind": "source", "rule": { "type": "defines_class", "name": "Pac" },
    "name": "Define a classe Pac" },
  { "id": "sedex", "checkpoint": 1, "kind": "expr", "expr": "(Sedex().calcular(3), Sedex().calcular(0.5))", "expected": [35, 22.5],
    "name": "Sedex para 3 kg e 0.5 kg" },
  { "id": "pac", "checkpoint": 1, "kind": "expr", "expr": "(Pac().calcular(2.5), Pac().calcular(30))", "expected": [17.0, 72],
    "name": "PAC para 2.5 kg e no limite de 30 kg" },
  { "id": "pac-limite", "checkpoint": 1, "kind": "expr", "expr": "Pac().calcular(30.5)", "raises": "ValueError",
    "name": "PAC recusa 30.5 kg" },
  { "id": "retirada", "checkpoint": 1, "kind": "expr", "expr": "Retirada().calcular(80)", "expected": 0,
    "name": "Retirada não cobra frete" },
  { "id": "cotar", "checkpoint": 2, "kind": "expr", "setup": "calc = CalculadoraDeFrete(Sedex())", "expr": "calc.cotar(1)",
    "expected": 25, "name": "Calculadora com Sedex para 1 kg" },
  { "id": "trocar", "checkpoint": 2, "kind": "expr", "setup": "calc = CalculadoraDeFrete(Pac())\nantes = calc.cotar(5)\ncalc.trocar(Retirada())",
    "expr": "(antes, calc.cotar(5))", "expected": [22, 0], "name": "Trocar a transportadora muda a cotação" },
  { "id": "mais-barata", "checkpoint": 3, "kind": "expr", "expr": "type(mais_barata([Sedex(), Pac()], 7)).__name__", "expected": "Pac",
    "name": "Para 7 kg o PAC é mais barato que o Sedex", "hint": "Devolva o objeto da transportadora, não o valor do frete." },
  { "id": "estrategia-nova", "checkpoint": 4, "kind": "expr",
    "setup": "class Drone:\n    def calcular(self, peso):\n        return 50\n\ncalc = CalculadoraDeFrete(Sedex())\ncalc.trocar(Drone())",
    "expr": "(calc.cotar(9), type(mais_barata([Sedex(), Drone()], 10)).__name__)", "expected": [50, "Drone"],
    "name": "Uma transportadora nova, criada depois, funciona sem mudar nada",
    "hint": "Se você pergunta o tipo da transportadora, uma classe nova fica de fora. Chame calcular(peso) direto." }
]
```

### Soluções erradas
```python name="calculadora com cadeia de isinstance"
class Sedex:
    def calcular(self, peso):
        return 20 + 5 * peso


class Pac:
    def calcular(self, peso):
        if peso > 30:
            raise ValueError("PAC aceita até 30 kg")
        return 12 + 2 * peso


class Retirada:
    def calcular(self, peso):
        return 0


class CalculadoraDeFrete:
    def __init__(self, transportadora):
        self.transportadora = transportadora

    def cotar(self, peso):
        t = self.transportadora
        if isinstance(t, Sedex):
            return 20 + 5 * peso
        elif isinstance(t, Pac):
            return 12 + 2 * peso
        return 0

    def trocar(self, nova):
        self.transportadora = nova


def mais_barata(transportadoras, peso):
    return min(transportadoras, key=lambda t: t.calcular(peso))
```
```python name="PAC sem o limite de peso"
class Sedex:
    def calcular(self, peso):
        return 20 + 5 * peso


class Pac:
    def calcular(self, peso):
        return 12 + 2 * peso


class Retirada:
    def calcular(self, peso):
        return 0


class CalculadoraDeFrete:
    def __init__(self, transportadora):
        self.transportadora = transportadora

    def cotar(self, peso):
        return self.transportadora.calcular(peso)

    def trocar(self, nova):
        self.transportadora = nova


def mais_barata(transportadoras, peso):
    return min(transportadoras, key=lambda t: t.calcular(peso))
```
```python name="trocar cria uma variável local"
class Sedex:
    def calcular(self, peso):
        return 20 + 5 * peso


class Pac:
    def calcular(self, peso):
        if peso > 30:
            raise ValueError("PAC aceita até 30 kg")
        return 12 + 2 * peso


class Retirada:
    def calcular(self, peso):
        return 0


class CalculadoraDeFrete:
    def __init__(self, transportadora):
        self.transportadora = transportadora

    def cotar(self, peso):
        return self.transportadora.calcular(peso)

    def trocar(self, nova):
        transportadora = nova


def mais_barata(transportadoras, peso):
    return min(transportadoras, key=lambda t: t.calcular(peso))
```
```python name="mais_barata devolve o valor em vez da transportadora"
class Sedex:
    def calcular(self, peso):
        return 20 + 5 * peso


class Pac:
    def calcular(self, peso):
        if peso > 30:
            raise ValueError("PAC aceita até 30 kg")
        return 12 + 2 * peso


class Retirada:
    def calcular(self, peso):
        return 0


class CalculadoraDeFrete:
    def __init__(self, transportadora):
        self.transportadora = transportadora

    def cotar(self, peso):
        return self.transportadora.calcular(peso)

    def trocar(self, nova):
        self.transportadora = nova


def mais_barata(transportadoras, peso):
    return min(t.calcular(peso) for t in transportadoras)
```

## Passo 7 · Quiz · Polimorfismo

### Pergunta
A função `tocar_todos(instrumentos)` chama `i.tocar()` em cada item. Um objeto de uma classe `Apito`, que não herda de nenhuma classe sua mas tem o método `tocar()`, entra na lista. O que acontece?
- [ ] `TypeError`, porque `Apito` não herda de `Instrumento`
- [x] Funciona: o Python só procura o método `tocar` no objeto na hora da chamada
- [ ] O `Apito` é ignorado em silêncio
- [ ] Só funciona se a função usar `isinstance(i, Apito)`
> Isso é duck typing: o que importa é o objeto ter o método chamado. Se o `Apito` não tivesse `tocar`, o erro seria `AttributeError`, na hora da chamada.

### Pergunta
`Relatorio` herda de `ABC` e tem `gerar` marcado com `@abstractmethod`. `class Mensal(Relatorio)` esqueceu de implementar `gerar`. Quando o erro aparece?
- [ ] Na linha `class Mensal(Relatorio):`, ao definir a classe
- [x] Em `Mensal()`, ao criar o objeto, com `TypeError`
- [ ] Só quando alguém chamar `gerar()`, com `AttributeError`
- [ ] Nunca: o Python ignora o método que falta
> A definição da classe é aceita. O `TypeError: Can't instantiate abstract class Mensal ...` aparece na criação do objeto, antes de qualquer método ser usado.

### Pergunta
Qual versão de `total_de_frete` deixa de funcionar quando alguém cria a classe `Motoboy` com `calcular(peso)`?
- [ ] `return sum(t.calcular(peso) for t in transportadoras)`
- [x] Uma que faz `if isinstance(t, Sedex): ... elif isinstance(t, Pac): ...` para cada transportadora
- [ ] `return sum([t.calcular(peso) for t in transportadoras])`
- [ ] Um laço `for` que acumula `t.calcular(peso)` num total
> Perguntar o tipo dentro da função genérica desfaz o polimorfismo: cada classe nova exige mudar a função, e o `Motoboy` cai fora de todos os `if`. As outras versões só chamam `calcular` e aceitam qualquer transportadora.
