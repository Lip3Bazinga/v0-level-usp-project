---
slug: n2-m1-06-dataclasses
titulo: Dataclasses
descricao: 'Classes de dados sem boilerplate: @dataclass, valores padrão, field, frozen, ordem e comparação.'
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
- Declarar classes de dados com @dataclass e anotações de tipo
- Usar field(default_factory=...) para listas e dicionários padrão
- Aplicar frozen=True e order=True e explicar o que cada um gera
---

## Passo 1 · Leitura · Classes que só guardam dados

Muitas classes existem principalmente para guardar dados: um ponto, uma nota, um item de pedido. Para que um `Ponto` seja útil, você escreve sempre os mesmos três métodos:

```python
class Ponto:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Ponto(x={self.x}, y={self.y})"

    def __eq__(self, outro):
        return (self.x, self.y) == (outro.x, outro.y)
```

São doze linhas em que o nome de cada campo aparece quatro vezes. Acrescentar um campo `z` exige mexer nos três métodos, e esquecer um deles (o `__eq__`, quase sempre) cria um bug silencioso. Esse código repetitivo e sem ideia nova tem nome: *boilerplate*.

O decorador `@dataclass`, do módulo `dataclasses`, escreve esses métodos por você:

```python
from dataclasses import dataclass


@dataclass
class Ponto:
    x: float
    y: float
```

Os campos são declarados no corpo da classe com **anotações de tipo**: `nome: tipo`. A partir delas, o decorador gera:

- `__init__(self, x, y)`, com os parâmetros na ordem da declaração;
- `__repr__`, que mostra `Ponto(x=1.5, y=2)`;
- `__eq__`, que compara campo a campo: dois pontos com as mesmas coordenadas são iguais.

Três detalhes:

**A anotação não é conferida.** `x: float` documenta a intenção, mas `Ponto("a", "b")` é aceito sem erro. O Python não verifica tipos ao rodar.

**Sem anotação, não é campo.** Uma linha `cor = "azul"` no corpo vira atributo de classe, fora do `__init__`, do `__repr__` e do `__eq__`.

**Valor padrão vem por último.** `valor: float = 0.0` torna o campo opcional, mas campos com padrão precisam vir depois dos campos sem padrão, como nos parâmetros de função. Fora dessa ordem, a classe nem é criada:

```
TypeError: non-default argument 'b' follows default argument 'a'
```

Os métodos gerados são métodos comuns: você continua escrevendo os seus (`distancia`, `area`) normalmente, no corpo da classe.

## Passo 2 · Previsão · O que o @dataclass escreveu

`Nota` é uma dataclass; `NotaComum` é uma classe comum com o mesmo `__init__`. Nenhuma das duas escreve `__repr__` ou `__eq__` à mão.

Leia o programa sem executar e digite exatamente o que ele imprime.

### Código
```python
from dataclasses import dataclass


@dataclass
class Nota:
    aluno: str
    valor: float = 0.0


class NotaComum:
    def __init__(self, aluno, valor=0.0):
        self.aluno = aluno
        self.valor = valor


a = Nota("Ana", 9.5)
b = Nota("Ana", 9.5)
print(a)
print(Nota("Bia"))
print(a == b)
print(NotaComum("Ana", 9.5) == NotaComum("Ana", 9.5))
b.valor = 10
print(a == b, [Nota("Caio", 7)])
```

### Dicas
1. O `__repr__` gerado mostra o nome da classe e cada campo como `nome=valor`; textos aparecem entre aspas.
2. Sem `__eq__`, o `==` de uma classe comum só é `True` quando os dois lados são o mesmo objeto.
3. O `__eq__` gerado compara os campos no momento da comparação.

### Saída esperada
```text
Nota(aluno='Ana', valor=9.5)
Nota(aluno='Bia', valor=0.0)
True
False
False [Nota(aluno='Caio', valor=7)]
```

## Passo 3 · Leitura · frozen e order

O decorador aceita opções entre parênteses. Duas mudam bastante o que a classe sabe fazer.

#### frozen=True: objetos imutáveis

```python
@dataclass(frozen=True)
class Ponto:
    x: float
    y: float
```

Depois de criado, um ponto congelado não muda. `p.x = 10` levanta:

```
dataclasses.FrozenInstanceError: cannot assign to field 'x'
```

Para "mover" o ponto, crie outro: `Ponto(p.x + 1, p.y)`. Parece limitação, mas evita uma classe inteira de bugs: um ponto guardado numa lista ou passado para uma função não muda pelas suas costas.

De brinde, objetos congelados ganham `__hash__` e podem ir para conjuntos e virar chaves de dicionário. Uma dataclass comum, mutável, não pode: `{Ponto(1, 2)}` dá `TypeError: cannot use 'Ponto' as a set element (unhashable type: 'Ponto')`.

#### order=True: ordenação pelos campos

```python
@dataclass(order=True)
class Candidato:
    nota: float
    nome: str
```

`order=True` gera `<`, `<=`, `>` e `>=`, que comparam os campos **na ordem em que foram declarados**, como tuplas: primeiro `nota`; em caso de empate, `nome`. Com isso, `sorted(candidatos)`, `min` e `max` funcionam direto. Sem `order=True`, `sorted` falha com `TypeError: '<' not supported between instances of 'Candidato' and 'Candidato'`.

A ordem da declaração **é** o critério. Declarar `nome` antes de `nota` ordena por nome.

#### Tirando um campo da comparação

Às vezes um campo não deve contar na igualdade nem na ordem, como um número de inscrição. `field(compare=False)` faz isso:

```python
from dataclasses import dataclass, field


@dataclass(order=True)
class Candidato:
    nota: float
    nome: str
    inscricao: str = field(compare=False)
```

`Candidato(8, "Ana", "001") == Candidato(8, "Ana", "999")` é `True`: a inscrição continua no `__init__` e no `__repr__`, mas fica fora do `==` e do `<`.

## Passo 4 · Exercício · Ponto congelado
modo: lacunas

Complete a dataclass `Ponto`, congelada. Como ela é imutável, "deslocar" um ponto devolve um ponto **novo**, e o original fica como estava.

A distância entre dois pontos é

$$
d = \sqrt{(x_1 - x_2)^2 + (y_1 - y_2)^2}
$$

### Instruções
1. Importe o decorador e aplique-o à classe, com a opção que torna os objetos imutáveis.
2. Declare o campo `x` com a anotação de tipo `float`, como o `y`.
3. Complete `deslocar(dx, dy)`, que devolve um novo ponto deslocado e não altera o original.

### Código inicial
```python
from dataclasses import ___


@___(frozen=___)
class Ponto:
    x: ___
    y: float

    def distancia(self, outro):
        return ((self.x - outro.x) ** 2 + (self.y - outro.y) ** 2) ** 0.5

    def deslocar(self, dx, dy):
        return ___(self.x + dx, self.y + dy)
```

### Solução
```python
from dataclasses import dataclass


@dataclass(frozen=True)
class Ponto:
    x: float
    y: float

    def distancia(self, outro):
        return ((self.x - outro.x) ** 2 + (self.y - outro.y) ** 2) ** 0.5

    def deslocar(self, dx, dy):
        return Ponto(self.x + dx, self.y + dy)
```

### Dicas
1. O decorador e o módulo têm quase o mesmo nome: `from dataclasses import ...`.
2. A opção de imutabilidade recebe um booleano.
3. Para criar um objeto novo, chame a própria classe.

### Verificação
```json
[
  { "id": "repr", "checkpoint": 1, "kind": "expr", "expr": "repr(Ponto(1.5, -2))", "expected": "Ponto(x=1.5, y=-2)",
    "name": "repr gerado de Ponto(1.5, -2)", "hint": "O @dataclass gera o __repr__ a partir dos campos." },
  { "id": "igualdade", "checkpoint": 1, "kind": "expr", "expr": "(Ponto(3, 4) == Ponto(3, 4), Ponto(3, 4) == Ponto(4, 3))",
    "expected": [true, false], "name": "Pontos iguais são ==, pontos trocados não" },
  { "id": "congelado", "checkpoint": 1, "kind": "expr", "setup": "p = Ponto(1, 2)\np.x = 10", "expr": "p.x",
    "raises": "FrozenInstanceError", "name": "Atribuir a p.x é recusado", "hint": "Use a opção frozen do decorador." },
  { "id": "conjunto", "checkpoint": 1, "kind": "expr", "expr": "len({Ponto(1, 2), Ponto(1, 2), Ponto(2, 1)})", "expected": 2,
    "name": "Pontos congelados entram em um conjunto, sem repetição" },
  { "id": "campo-x", "checkpoint": 2, "kind": "expr", "expr": "{nome: tipo.__name__ for nome, tipo in Ponto.__annotations__.items()}", "expected": { "x": "float", "y": "float" },
    "name": "x e y anotados como float" },
  { "id": "distancia", "checkpoint": 2, "kind": "expr", "expr": "Ponto(2, -1).distancia(Ponto(-4, 7))", "expected": 10.0, "tolerance": 1e-9,
    "name": "Distância entre (2, -1) e (-4, 7)" },
  { "id": "desloca", "checkpoint": 3, "kind": "expr", "setup": "p = Ponto(1, 1)\nq = p.deslocar(2, -3)",
    "expr": "(repr(q), repr(p))", "expected": ["Ponto(x=3, y=-2)", "Ponto(x=1, y=1)"],
    "name": "deslocar(2, -3) cria um ponto novo e o original não muda" }
]
```

### Soluções erradas
```python name="sem frozen: o ponto pode ser alterado"
from dataclasses import dataclass


@dataclass
class Ponto:
    x: float
    y: float

    def distancia(self, outro):
        return ((self.x - outro.x) ** 2 + (self.y - outro.y) ** 2) ** 0.5

    def deslocar(self, dx, dy):
        return Ponto(self.x + dx, self.y + dy)
```
```python name="x sem anotação de tipo"
from dataclasses import dataclass


@dataclass(frozen=True)
class Ponto:
    x = 0.0
    y: float

    def distancia(self, outro):
        return ((self.x - outro.x) ** 2 + (self.y - outro.y) ** 2) ** 0.5

    def deslocar(self, dx, dy):
        return Ponto(self.x + dx, self.y + dy)
```
```python name="deslocar devolve uma tupla"
from dataclasses import dataclass


@dataclass(frozen=True)
class Ponto:
    x: float
    y: float

    def distancia(self, outro):
        return ((self.x - outro.x) ** 2 + (self.y - outro.y) ** 2) ** 0.5

    def deslocar(self, dx, dy):
        return (self.x + dx, self.y + dy)
```

## Passo 5 · Exercício · Lista de chamada por nota

A coordenação quer ordenar os alunos por nota, desempatando pelo nome, sem escrever nenhuma comparação à mão. A matrícula aparece no `repr`, mas não conta nem para igualdade nem para ordem: dois registros do mesmo aluno com a mesma nota são iguais, mesmo que a matrícula tenha sido digitada diferente.

```python
turma = [Aluno(7.5, "Caio", "123"), Aluno(9, "Ana", "456"), Aluno(7.5, "Bia", "789")]
print(ordem_de_chamada(turma))   # ['Bia', 'Caio', 'Ana']
print(melhor(turma))             # Aluno(nota=9, nome='Ana', matricula='456')
```

### Instruções
1. Declare a dataclass `Aluno` com os campos `nota` (`float`), `nome` (`str`) e `matricula` (`str`), nessa ordem, com `<`, `<=`, `>` e `>=` gerados.
2. A `matricula` fica fora da igualdade e da ordem.
3. `ordem_de_chamada(alunos)` devolve a lista dos **nomes**, da menor nota para a maior, com empates em ordem alfabética.
4. `melhor(alunos)` devolve o **aluno** com a maior nota; no empate, o de nome que vem por último em ordem alfabética.
   Dica: com a ordem gerada, `sorted`, `min` e `max` funcionam direto nos objetos.

### Código inicial
```python
from dataclasses import dataclass, field


class Aluno:
    pass
```

### Solução
```python
from dataclasses import dataclass, field


@dataclass(order=True)
class Aluno:
    nota: float
    nome: str
    matricula: str = field(compare=False)


def ordem_de_chamada(alunos):
    return [aluno.nome for aluno in sorted(alunos)]


def melhor(alunos):
    return max(alunos)
```

### Dicas
1. A ordem de declaração dos campos é o critério de ordenação: a nota precisa vir primeiro.
2. `field(compare=False)` tira um campo da comparação, mas ele continua sendo campo.
3. `max(alunos)` usa a mesma ordem que `sorted`.

### Verificação
```json
[
  { "id": "repr", "checkpoint": 1, "kind": "expr", "expr": "repr(Aluno(8.5, \"Davi\", \"321\"))",
    "expected": "Aluno(nota=8.5, nome='Davi', matricula='321')", "name": "repr de um aluno",
    "hint": "Declare os três campos, nessa ordem, com anotações de tipo." },
  { "id": "menor", "checkpoint": 1, "kind": "expr",
    "expr": "(Aluno(6, \"Zé\", \"1\") < Aluno(7, \"Ana\", \"2\"), Aluno(7, \"Bia\", \"1\") < Aluno(7, \"Caio\", \"2\"), Aluno(9, \"Ana\", \"1\") >= Aluno(8, \"Zé\", \"2\"))",
    "expected": [true, true, true], "name": "Compara primeiro a nota e, no empate, o nome",
    "hint": "Use a opção order e declare a nota antes do nome." },
  { "id": "igual-sem-matricula", "checkpoint": 2, "kind": "expr", "expr": "(Aluno(8, \"Eva\", \"111\") == Aluno(8, \"Eva\", \"999\"), Aluno(8, \"Eva\", \"1\") < Aluno(8, \"Eva\", \"2\"))",
    "expected": [true, false], "name": "A matrícula não conta na igualdade nem na ordem" },
  { "id": "chamada", "checkpoint": 3, "kind": "expr",
    "expr": "ordem_de_chamada([Aluno(5, \"Davi\", \"1\"), Aluno(10, \"Eva\", \"2\"), Aluno(5, \"Caio\", \"3\"), Aluno(7.5, \"Ana\", \"4\")])",
    "expected": ["Caio", "Davi", "Ana", "Eva"], "name": "Ordem de chamada de quatro alunos" },
  { "id": "chamada-vazia", "checkpoint": 3, "kind": "expr", "expr": "ordem_de_chamada([])", "expected": [],
    "name": "Turma vazia" },
  { "id": "melhor", "checkpoint": 4, "kind": "expr",
    "expr": "repr(melhor([Aluno(9.5, \"Bia\", \"1\"), Aluno(9.5, \"Davi\", \"2\"), Aluno(3, \"Zé\", \"3\")]))",
    "expected": "Aluno(nota=9.5, nome='Davi', matricula='2')", "name": "Melhor aluno com empate na nota",
    "hint": "Devolva o objeto Aluno inteiro, não só o nome." }
]
```

### Soluções erradas
```python name="nome declarado antes da nota"
from dataclasses import dataclass, field


@dataclass(order=True)
class Aluno:
    nome: str
    nota: float
    matricula: str = field(compare=False)


def ordem_de_chamada(alunos):
    return [aluno.nome for aluno in sorted(alunos)]


def melhor(alunos):
    return max(alunos)
```
```python name="sem order=True"
from dataclasses import dataclass, field


@dataclass
class Aluno:
    nota: float
    nome: str
    matricula: str = field(compare=False)


def ordem_de_chamada(alunos):
    return [aluno.nome for aluno in sorted(alunos, key=lambda a: a.nota)]


def melhor(alunos):
    return max(alunos, key=lambda a: a.nota)
```
```python name="matrícula entra na comparação"
from dataclasses import dataclass, field


@dataclass(order=True)
class Aluno:
    nota: float
    nome: str
    matricula: str


def ordem_de_chamada(alunos):
    return [aluno.nome for aluno in sorted(alunos)]


def melhor(alunos):
    return max(alunos)
```
```python name="melhor devolve só o nome"
from dataclasses import dataclass, field


@dataclass(order=True)
class Aluno:
    nota: float
    nome: str
    matricula: str = field(compare=False)


def ordem_de_chamada(alunos):
    return [aluno.nome for aluno in sorted(alunos)]


def melhor(alunos):
    return max(alunos).nome
```

## Passo 6 · Leitura · Listas como padrão e validação

#### O padrão mutável

Uma tarefa com uma lista de etiquetas, vazia por padrão, parece simples:

```python
@dataclass
class Tarefa:
    titulo: str
    tags: list = []
```

Mas a classe nem chega a ser criada:

```
ValueError: mutable default <class 'list'> for field tags is not allowed: use default_factory
```

O motivo é o mesmo da lista no corpo da classe, que você viu na primeira lição do módulo: um `[]` escrito ali é criado **uma vez**, e todas as tarefas acabariam dividindo a mesma lista. A dataclass recusa isso de propósito e diz a saída: `default_factory`, uma função que é chamada **a cada objeto novo** para fabricar o valor padrão.

```python
from dataclasses import dataclass, field


@dataclass
class Tarefa:
    titulo: str
    tags: list = field(default_factory=list)
```

`list` é a função que cria uma lista vazia, então cada tarefa ganha a sua. O mesmo vale para dicionários (`default_factory=dict`) e conjuntos (`default_factory=set`).

#### Validar com __post_init__

O `__init__` é gerado, então onde fica a validação? No `__post_init__`, um método que o `__init__` gerado chama logo depois de preencher os campos:

```python
@dataclass
class Item:
    nome: str
    quantidade: int

    def __post_init__(self):
        if self.quantidade <= 0:
            raise ValueError(f"quantidade inválida: {self.quantidade}")
```

`Item("caneta", 0)` levanta o `ValueError` na criação. O `__post_init__` também pode ajustar campos, como tirar espaços de um texto.

#### asdict e quando usar cada coisa

`asdict(obj)`, do mesmo módulo, converte a dataclass num dicionário com os campos, pronto para virar JSON ou ir para uma tabela.

- **Dicionário**: dados soltos e de formato variável, como uma linha lida de um arquivo.
- **Dataclass**: um tipo com campos conhecidos, que você quer comparar, ordenar e imprimir bem, com pouca regra de negócio.
- **Classe comum**: muito comportamento e invariantes protegidas por properties, como a conta bancária.

## Passo 7 · Exercício · Tarefas com etiquetas

Escreva a dataclass `Tarefa` de um gerenciador de tarefas. Cada tarefa tem a própria lista de etiquetas, e tarefas inválidas são recusadas na criação.

```python
t = Tarefa("  Ler capítulo 3 ", 1)
t.marcar("cálculo")
t.marcar("cálculo")
print(t)                    # Tarefa(titulo='Ler capítulo 3', prioridade=1, tags=['cálculo'])
print(exportar([t]))        # [{'titulo': 'Ler capítulo 3', 'prioridade': 1, 'tags': ['cálculo']}]
```

### Instruções
1. Declare a dataclass `Tarefa` com `titulo` (`str`), `prioridade` (`int`, padrão 3) e `tags` (`list`, padrão lista vazia própria de cada tarefa).
2. No `__post_init__`, tire os espaços das pontas do título; título vazio (depois disso) ou prioridade fora de 1 a 5 levantam `ValueError`.
3. `marcar(tag)` acrescenta a etiqueta à lista, sem repetir uma etiqueta que já está lá.
4. A função `exportar(tarefas)` devolve uma lista de dicionários, um por tarefa, com os três campos.
   Dica: `asdict` faz a conversão de uma tarefa.

### Código inicial
```python
from dataclasses import dataclass, field, asdict


@dataclass
class Tarefa:
    titulo: str
```

### Solução
```python
from dataclasses import dataclass, field, asdict


@dataclass
class Tarefa:
    titulo: str
    prioridade: int = 3
    tags: list = field(default_factory=list)

    def __post_init__(self):
        self.titulo = self.titulo.strip()
        if not self.titulo:
            raise ValueError("o título não pode ser vazio")
        if not 1 <= self.prioridade <= 5:
            raise ValueError(f"prioridade fora de 1 a 5: {self.prioridade}")

    def marcar(self, tag):
        if tag not in self.tags:
            self.tags.append(tag)


def exportar(tarefas):
    return [asdict(tarefa) for tarefa in tarefas]
```

### Dicas
1. `tags: list = []` é recusado pela dataclass; o padrão vem de `field(...)`.
2. No `__post_init__` os campos já estão preenchidos: leia e altere `self.titulo` e `self.prioridade`.
3. `exportar` cabe numa compreensão de lista.

### Verificação
```json
[
  { "id": "padroes", "checkpoint": 1, "kind": "expr", "setup": "t = Tarefa(\"Revisar código\")", "expr": "(t.titulo, t.prioridade, t.tags)",
    "expected": ["Revisar código", 3, []], "name": "Tarefa só com título usa os padrões" },
  { "id": "independentes", "checkpoint": 1, "kind": "expr", "setup": "a = Tarefa(\"A\")\nb = Tarefa(\"B\")\na.tags.append(\"usp\")",
    "expr": "(a.tags, b.tags)", "expected": [["usp"], []], "name": "Cada tarefa tem a sua lista de etiquetas",
    "hint": "O padrão precisa ser fabricado a cada objeto: field(default_factory=list)." },
  { "id": "strip", "checkpoint": 2, "kind": "expr", "expr": "Tarefa(\"   Pagar o RU  \", 2).titulo", "expected": "Pagar o RU",
    "name": "Os espaços das pontas do título são removidos" },
  { "id": "vazio", "checkpoint": 2, "kind": "expr", "expr": "Tarefa(\"    \")", "raises": "ValueError",
    "name": "Título só com espaços é recusado", "hint": "Confira o título depois de tirar os espaços." },
  { "id": "prioridade-alta", "checkpoint": 2, "kind": "expr", "expr": "Tarefa(\"x\", 6)", "raises": "ValueError",
    "name": "Prioridade 6 é recusada" },
  { "id": "prioridade-zero", "checkpoint": 2, "kind": "expr", "expr": "Tarefa(\"x\", 0)", "raises": "ValueError",
    "name": "Prioridade 0 é recusada" },
  { "id": "prioridade-bordas", "checkpoint": 2, "kind": "expr", "expr": "(Tarefa(\"x\", 1).prioridade, Tarefa(\"y\", 5).prioridade)",
    "expected": [1, 5], "name": "Prioridades 1 e 5 são aceitas" },
  { "id": "marcar", "checkpoint": 3, "kind": "expr", "setup": "t = Tarefa(\"Estudar\")\nfor tag in [\"prova\", \"física\", \"prova\", \"urgente\", \"física\"]:\n    t.marcar(tag)",
    "expr": "t.tags", "expected": ["prova", "física", "urgente"], "name": "marcar não repete etiquetas" },
  { "id": "exportar", "checkpoint": 4, "kind": "expr", "setup": "a = Tarefa(\"Ler\", 1, [\"usp\"])\nb = Tarefa(\"Correr\")",
    "expr": "exportar([a, b])",
    "expected": [{ "titulo": "Ler", "prioridade": 1, "tags": ["usp"] }, { "titulo": "Correr", "prioridade": 3, "tags": [] }],
    "name": "exportar devolve um dicionário por tarefa" }
]
```

### Soluções erradas
```python name="lista vazia como padrão direto"
from dataclasses import dataclass, field, asdict


@dataclass
class Tarefa:
    titulo: str
    prioridade: int = 3
    tags: list = []

    def __post_init__(self):
        self.titulo = self.titulo.strip()
        if not self.titulo:
            raise ValueError("o título não pode ser vazio")
        if not 1 <= self.prioridade <= 5:
            raise ValueError("prioridade fora de 1 a 5")

    def marcar(self, tag):
        if tag not in self.tags:
            self.tags.append(tag)


def exportar(tarefas):
    return [asdict(tarefa) for tarefa in tarefas]
```
```python name="confere o título antes de tirar os espaços"
from dataclasses import dataclass, field, asdict


@dataclass
class Tarefa:
    titulo: str
    prioridade: int = 3
    tags: list = field(default_factory=list)

    def __post_init__(self):
        if not self.titulo:
            raise ValueError("o título não pode ser vazio")
        self.titulo = self.titulo.strip()
        if not 1 <= self.prioridade <= 5:
            raise ValueError("prioridade fora de 1 a 5")

    def marcar(self, tag):
        if tag not in self.tags:
            self.tags.append(tag)


def exportar(tarefas):
    return [asdict(tarefa) for tarefa in tarefas]
```
```python name="prioridade 5 recusada"
from dataclasses import dataclass, field, asdict


@dataclass
class Tarefa:
    titulo: str
    prioridade: int = 3
    tags: list = field(default_factory=list)

    def __post_init__(self):
        self.titulo = self.titulo.strip()
        if not self.titulo:
            raise ValueError("o título não pode ser vazio")
        if not 1 <= self.prioridade < 5:
            raise ValueError("prioridade fora de 1 a 5")

    def marcar(self, tag):
        if tag not in self.tags:
            self.tags.append(tag)


def exportar(tarefas):
    return [asdict(tarefa) for tarefa in tarefas]
```
```python name="marcar repete etiquetas"
from dataclasses import dataclass, field, asdict


@dataclass
class Tarefa:
    titulo: str
    prioridade: int = 3
    tags: list = field(default_factory=list)

    def __post_init__(self):
        self.titulo = self.titulo.strip()
        if not self.titulo:
            raise ValueError("o título não pode ser vazio")
        if not 1 <= self.prioridade <= 5:
            raise ValueError("prioridade fora de 1 a 5")

    def marcar(self, tag):
        self.tags.append(tag)


def exportar(tarefas):
    return [asdict(tarefa) for tarefa in tarefas]
```
```python name="exportar devolve textos"
from dataclasses import dataclass, field, asdict


@dataclass
class Tarefa:
    titulo: str
    prioridade: int = 3
    tags: list = field(default_factory=list)

    def __post_init__(self):
        self.titulo = self.titulo.strip()
        if not self.titulo:
            raise ValueError("o título não pode ser vazio")
        if not 1 <= self.prioridade <= 5:
            raise ValueError("prioridade fora de 1 a 5")

    def marcar(self, tag):
        if tag not in self.tags:
            self.tags.append(tag)


def exportar(tarefas):
    return [str(tarefa) for tarefa in tarefas]
```

## Passo 8 · Quiz · Dataclasses

### Pergunta
Numa dataclass, por que `tags: list = []` é recusado e `tags: list = field(default_factory=list)` é aceito?
- [ ] Porque dataclasses não aceitam listas como campo
- [x] Porque `[]` seria uma lista única dividida por todos os objetos; `default_factory` chama `list()` para cada objeto novo
- [ ] Porque `field` é obrigatório em todo campo com valor padrão
- [ ] Porque a anotação `list` exige uma lista com pelo menos um item
> O `[]` escrito na classe é criado uma vez só. A dataclass recusa esse padrão mutável e pede `default_factory`, uma função chamada a cada criação de objeto.

### Pergunta
`p1 = Produto("caneta", 2.5)` e `p2 = Produto("caneta", 2.5)`, em que `Produto` é uma dataclass comum. Quanto vale `p1 == p2`?
- [ ] `False`, porque são dois objetos diferentes
- [x] `True`, porque o `__eq__` gerado compara os campos
- [ ] Dá `TypeError`, porque falta `order=True`
- [ ] Depende de `frozen=True`
> O `@dataclass` gera `__eq__` sempre, comparando campo a campo. `order=True` só acrescenta `<`, `<=`, `>` e `>=`; `frozen=True` só proíbe alterações.

### Pergunta
Com `@dataclass(order=True)` e os campos declarados como `nome: str` e depois `idade: int`, como `sorted(pessoas)` ordena?
- [ ] Pela idade, porque números são comparados antes de textos
- [x] Pelo nome e, em caso de nome igual, pela idade
- [ ] Na ordem em que os objetos foram criados
- [ ] Não ordena: é preciso passar `key=`
> A comparação gerada segue a ordem de declaração dos campos, como uma tupla `(nome, idade)`. Para ordenar pela idade, ela precisa ser declarada primeiro.
