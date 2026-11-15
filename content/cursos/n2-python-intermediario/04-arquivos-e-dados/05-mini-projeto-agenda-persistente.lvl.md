---
slug: n2-m4-05-mini-projeto-agenda-persistente
titulo: 'Mini-projeto: agenda de contatos persistente'
descricao: Uma agenda com classes, exceções próprias, exportação CSV e persistência JSON, pronta para virar o projeto do nível.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 150
tempo_min: 90
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Combinar classes, exceções próprias e persistência em JSON em um programa coeso
- Exportar e importar CSV mantendo os dados consistentes
- Separar domínio (classes) de persistência (módulo de arquivos) e de interface (menu)
---

## Passo 1 · Leitura · A especificação da agenda

Você vai construir uma agenda de contatos que **lembra** o que foi cadastrado entre uma execução e outra, usando o que viu nos módulos de classes, módulos, exceções e arquivos. O projeto tem três arquivos, e cada um tem uma responsabilidade só:

| Arquivo | Camada | Conteúdo |
|---|---|---|
| `contatos.py` | domínio | dataclass `Contato`, classe `Agenda`, exceções `ContatoDuplicado` e `ContatoNaoEncontrado` |
| `persistencia.py` | arquivos | `salvar_json`, `carregar_json`, `exportar_csv`, `importar_csv` |
| `main.py` | interface | `executar(caminho)`, o laço de comandos |

O domínio não sabe que arquivos existem; a persistência não lê teclado; a interface não valida e-mail. Separados assim, cada pedaço pode ser testado sozinho, e trocar JSON por um banco de dados mexe num arquivo só.

#### Regras do domínio

- **Nome:** sem espaços nas pontas; vazio é inválido.
- **Telefone:** aceita dígitos, espaços, parênteses e hífen; guardado só com os dígitos, que precisam ser 10 (fixo com DDD) ou 11 (celular com DDD). `(16) 99123-4567` vira `16991234567`.
- **E-mail:** sem espaços nas pontas e em minúsculas; precisa ter algo antes de um `@` e um ponto depois dele.
- Dado inválido levanta `ValueError` com a mensagem `nome vazio`, `telefone inválido` ou `e-mail inválido`.
- O e-mail identifica o contato: dois contatos podem ter o mesmo nome, mas não o mesmo e-mail.
- Listagens saem em ordem alfabética de nome, sem diferenciar maiúsculas.

#### Regras de persistência

A agenda é carregada do JSON ao abrir e salva **a cada alteração**, não só ao sair: se o programa cair no meio, nada do que já foi confirmado se perde. O CSV usa `;` e serve para trocar contatos com planilhas.

#### Uma sessão de exemplo

O programa lê um comando por linha; os dados de cada comando vêm nas linhas seguintes.

```text
entrada                saída
                       Agenda carregada: 0 contato(s)
adicionar
Ana Lima
(16) 99123-4567
Ana@USP.br             Adicionado: Ana Lima
adicionar
Caio
123
caio@usp.br            Erro: telefone inválido
listar                 Ana Lima | 16991234567 | ana@usp.br
sair                   Até logo!
```

Na próxima execução, o programa começa com `Agenda carregada: 1 contato(s)`. Os passos seguem a ordem das camadas: domínio, persistência e, por último, a interface.

## Passo 2 · Exercício · Contato e Agenda

Comece pelo domínio, em `contatos.py`. Nada aqui lê teclado ou arquivo.

```python
c = Contato("  Ana Lima ", "(16) 99123-4567", " Ana@USP.br ")
c.nome, c.telefone, c.email    # ('Ana Lima', '16991234567', 'ana@usp.br')
Contato("Caio", "123", "caio@usp.br")   # ValueError: telefone inválido

agenda = Agenda()
agenda.adicionar(c)
agenda.adicionar(Contato("Ana Clara", "1633334444", "ANA@usp.br"))
# ContatoDuplicado: já existe contato com o e-mail ana@usp.br
```

### Instruções
1. Em `contatos.py`, crie a dataclass `Contato` com os campos `nome`, `telefone` e `email`, que no `__post_init__` normaliza os três: nome sem espaços nas pontas, telefone só com os dígitos, e-mail sem espaços e em minúsculas.
2. Valide no `__post_init__` com as regras da especificação, levantando `ValueError("nome vazio")`, `ValueError("telefone inválido")` ou `ValueError("e-mail inválido")`.
   Dica: `email.partition("@")` devolve o que vem antes, o `@` (ou `""`) e o que vem depois.
3. Crie a classe `Agenda`, com o atributo `contatos` (lista, começa vazia) e o método `listar()`, que devolve os contatos em ordem alfabética de nome, sem diferenciar maiúsculas.
4. Crie a exceção `ContatoDuplicado` e o método `adicionar(contato)`, que a levanta com a mensagem `já existe contato com o e-mail <email>` quando o e-mail já está na agenda; senão, guarda o contato.

### Código inicial
```python
import contatos
import persistencia
```
```python path=contatos.py
from dataclasses import dataclass

# Domínio da agenda: ContatoDuplicado, Contato e Agenda.
```
```python path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    pass


def carregar_json(caminho):
    pass


def exportar_csv(caminho, agenda):
    pass


def importar_csv(caminho, agenda):
    pass
```

### Solução
```python
import contatos
import persistencia
```
```python path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())
```
```python path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    pass


def carregar_json(caminho):
    pass


def exportar_csv(caminho, agenda):
    pass


def importar_csv(caminho, agenda):
    pass
```

### Dicas
1. Normalize primeiro e valide depois: o telefone `"(16) 99123-4567"` só tem 11 dígitos depois de tirar o resto.
2. Antes de juntar os dígitos, confira se cada caractere é dígito ou um de `" ()-"`; uma letra torna o telefone inválido.
3. Como o e-mail já fica em minúsculas no `Contato`, comparar `existente.email == contato.email` basta para achar duplicados.

### Verificação
```json
[
  { "id": "normaliza", "checkpoint": 1, "kind": "expr",
    "setup": "from contatos import Contato\nc = Contato(\"  Ana Lima \", \"(16) 99123-4567\", \" Ana@USP.br \")",
    "expr": "[c.nome, c.telefone, c.email]", "expected": ["Ana Lima", "16991234567", "ana@usp.br"],
    "name": "Contato normaliza nome, telefone e e-mail", "hint": "No __post_init__, troque cada campo pela versão normalizada." },
  { "id": "fixo", "checkpoint": 1, "kind": "expr", "setup": "from contatos import Contato",
    "expr": "Contato(\"Bia Souza\", \"11 3091-0000\", \"bia@usp.br\").telefone", "expected": "1130910000",
    "name": "Telefone fixo com DDD (10 dígitos) é aceito" },
  { "id": "telefone-curto", "checkpoint": 2, "kind": "expr", "setup": "from contatos import Contato",
    "expr": "Contato(\"Caio\", \"9123-4567\", \"caio@usp.br\")", "raises": "ValueError", "message_contains": "telefone inválido",
    "name": "Telefone sem DDD é recusado" },
  { "id": "telefone-letra", "checkpoint": 2, "kind": "expr", "setup": "from contatos import Contato",
    "expr": "Contato(\"Caio\", \"16 9912a-4567\", \"caio@usp.br\")", "raises": "ValueError", "message_contains": "telefone inválido",
    "name": "Telefone com letra é recusado, mesmo com 10 dígitos", "hint": "Confira cada caractere antes de juntar os dígitos." },
  { "id": "email-sem-ponto", "checkpoint": 2, "kind": "expr", "setup": "from contatos import Contato",
    "expr": "Contato(\"Davi\", \"16991234567\", \"davi@usp\")", "raises": "ValueError", "message_contains": "e-mail inválido",
    "name": "E-mail sem ponto depois do @ é recusado" },
  { "id": "email-sem-arroba", "checkpoint": 2, "kind": "expr", "setup": "from contatos import Contato",
    "expr": "Contato(\"Davi\", \"16991234567\", \"davi.usp.br\")", "raises": "ValueError", "message_contains": "e-mail inválido",
    "name": "E-mail sem @ é recusado" },
  { "id": "nome-vazio", "checkpoint": 2, "kind": "expr", "setup": "from contatos import Contato",
    "expr": "Contato(\"   \", \"16991234567\", \"x@usp.br\")", "raises": "ValueError", "message_contains": "nome vazio",
    "name": "Nome só com espaços é recusado" },
  { "id": "lista-ordenada", "checkpoint": 3, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\na = Agenda()\nfor n, e in [(\"bia\", \"b@x.com\"), (\"Caio\", \"c@x.com\"), (\"Ana\", \"a@x.com\")]:\n    a.adicionar(Contato(n, \"1633334444\", e))",
    "expr": "[[c.nome for c in a.listar()], len(a.contatos)]", "expected": [["Ana", "bia", "Caio"], 3],
    "name": "listar devolve em ordem alfabética, sem diferenciar maiúsculas", "hint": "Ordene com key=lambda c: c.nome.lower()." },
  { "id": "duplicado", "checkpoint": 4, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\na = Agenda()\na.adicionar(Contato(\"Ana Lima\", \"16991234567\", \"ana@usp.br\"))",
    "expr": "a.adicionar(Contato(\"Ana Clara\", \"1633334444\", \" ANA@usp.br\"))", "raises": "ContatoDuplicado",
    "message_contains": "já existe contato com o e-mail ana@usp.br",
    "name": "Mesmo e-mail, com outra caixa e outro nome, é duplicado", "hint": "A duplicidade é pelo e-mail, não pelo nome." },
  { "id": "duplicado-nao-entra", "checkpoint": 4, "kind": "expr",
    "setup": "from contatos import Contato, Agenda, ContatoDuplicado\na = Agenda()\na.adicionar(Contato(\"Ana Lima\", \"16991234567\", \"ana@usp.br\"))\ntry:\n    a.adicionar(Contato(\"Outra\", \"1633334444\", \"ana@usp.br\"))\nexcept ContatoDuplicado:\n    pass",
    "expr": "[len(a.contatos), issubclass(ContatoDuplicado, Exception)]", "expected": [1, true],
    "name": "O contato duplicado não entra na agenda" },
  { "id": "mesmo-nome", "checkpoint": 4, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\na = Agenda()\na.adicionar(Contato(\"Ana Lima\", \"16991234567\", \"ana@usp.br\"))\na.adicionar(Contato(\"Ana Lima\", \"1633334444\", \"ana.lima@gmail.com\"))",
    "expr": "len(a.contatos)", "expected": 2,
    "name": "Dois contatos com o mesmo nome e e-mails diferentes são aceitos" }
]
```

### Soluções erradas
```python name="duplicidade verificada pelo nome"
import contatos
```
```python name="duplicidade verificada pelo nome" path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.nome == contato.nome:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())
```
```python name="não normaliza o e-mail"
import contatos
```
```python name="não normaliza o e-mail" path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())
```
```python name="telefone só conta os dígitos"
import contatos
```
```python name="telefone só conta os dígitos" path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())
```
```python name="e-mail só confere o @"
import contatos
```
```python name="e-mail só confere o @" path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        if "@" not in self.email:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())
```
```python name="listar diferencia maiúsculas"
import contatos
```
```python name="listar diferencia maiúsculas" path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome)
```

## Passo 3 · Exercício · Buscar e remover

Continue em `contatos.py`, no mesmo código do passo anterior. A agenda precisa achar e remover contatos:

- `buscar(termo)` devolve, na ordem de `listar()`, os contatos cujo **nome ou e-mail** contém o termo, sem diferenciar maiúsculas e ignorando espaços nas pontas do termo. Termo vazio devolve todos.
- `remover(email)` tira da agenda o contato com esse e-mail (sem diferenciar maiúsculas, ignorando espaços nas pontas) e o **devolve**. Se não houver, levanta a exceção nova `ContatoNaoEncontrado` com a mensagem `nenhum contato com o e-mail <email>`, com o e-mail já normalizado, e a agenda não muda.

```python
agenda.buscar("ANA")          # Ana Lima, Juliana Reis e quem tiver "ana" no e-mail
agenda.remover(" BIA@usp.br") # devolve o Contato de Bia Souza
agenda.remover("zeca@usp.br") # ContatoNaoEncontrado: nenhum contato com o e-mail zeca@usp.br
```

### Instruções
1. Em `Agenda`, escreva `buscar(termo)`, procurando no nome e no e-mail, sem diferenciar maiúsculas, com o resultado na ordem de `listar()`.
2. Escreva `remover(email)`, que normaliza o e-mail, tira o contato da lista e o devolve.
3. Crie `ContatoNaoEncontrado` e levante-a em `remover` quando nenhum contato tiver o e-mail.

### Solução
```python
import contatos
import persistencia
```
```python path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


class ContatoNaoEncontrado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())

    def buscar(self, termo):
        termo = termo.strip().lower()
        return [c for c in self.listar() if termo in c.nome.lower() or termo in c.email]

    def remover(self, email):
        email = email.strip().lower()
        for contato in self.contatos:
            if contato.email == email:
                self.contatos.remove(contato)
                return contato
        raise ContatoNaoEncontrado(f"nenhum contato com o e-mail {email}")
```
```python path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    pass


def carregar_json(caminho):
    pass


def exportar_csv(caminho, agenda):
    pass


def importar_csv(caminho, agenda):
    pass
```

### Dicas
1. Percorra `self.listar()` em vez de `self.contatos`: a ordem sai pronta.
2. O e-mail guardado já está em minúsculas; basta baixar o termo.
3. O `raise` fica depois do laço: só chega lá quem não achou nada.

### Verificação
```json
[
  { "id": "busca-nome", "checkpoint": 1, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\na = Agenda()\nfor n, e in [(\"Juliana Reis\", \"ju@ufscar.br\"), (\"Bia Souza\", \"bia@usp.br\"), (\"Ana Lima\", \"ana@usp.br\"), (\"Caio Prado\", \"caio.mariana@gmail.com\")]:\n    a.adicionar(Contato(n, \"1633334444\", e))",
    "expr": "[c.nome for c in a.buscar(\"ANA\")]", "expected": ["Ana Lima", "Caio Prado", "Juliana Reis"],
    "name": "buscar acha no nome e no e-mail, sem diferenciar maiúsculas, em ordem", "hint": "Compare o termo em minúsculas com o nome em minúsculas e com o e-mail." },
  { "id": "busca-email", "checkpoint": 1, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\na = Agenda()\nfor n, e in [(\"Juliana Reis\", \"ju@ufscar.br\"), (\"Bia Souza\", \"bia@usp.br\"), (\"Ana Lima\", \"ana@usp.br\")]:\n    a.adicionar(Contato(n, \"1633334444\", e))",
    "expr": "[c.nome for c in a.buscar(\"  USP.BR \")]", "expected": ["Ana Lima", "Bia Souza"],
    "name": "buscar ignora espaços nas pontas do termo e procura no e-mail" },
  { "id": "busca-vazia", "checkpoint": 1, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\na = Agenda()\nfor n, e in [(\"eva\", \"e@x.com\"), (\"Davi\", \"d@x.com\")]:\n    a.adicionar(Contato(n, \"1633334444\", e))",
    "expr": "[[c.nome for c in a.buscar(\"\")], a.buscar(\"zeca\")]", "expected": [["Davi", "eva"], []],
    "name": "Termo vazio devolve todos; termo sem resultado devolve lista vazia" },
  { "id": "remove", "checkpoint": 2, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\na = Agenda()\nfor n, e in [(\"Bia Souza\", \"bia@usp.br\"), (\"Ana Lima\", \"ana@usp.br\"), (\"Caio\", \"caio@usp.br\")]:\n    a.adicionar(Contato(n, \"1633334444\", e))\nr = a.remover(\" BIA@usp.br\")",
    "expr": "[type(r).__name__, r.nome, [c.nome for c in a.listar()]]", "expected": ["Contato", "Bia Souza", ["Ana Lima", "Caio"]],
    "name": "remover normaliza o e-mail, tira o contato e o devolve", "hint": "Normalize o e-mail recebido do mesmo jeito que o Contato faz." },
  { "id": "remove-inexistente", "checkpoint": 3, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\na = Agenda()\na.adicionar(Contato(\"Ana Lima\", \"1633334444\", \"ana@usp.br\"))",
    "expr": "a.remover(\"Zeca@usp.br\")", "raises": "ContatoNaoEncontrado", "message_contains": "nenhum contato com o e-mail zeca@usp.br",
    "name": "Remover e-mail que não existe levanta ContatoNaoEncontrado", "hint": "Levante a exceção depois do laço, quando nada foi encontrado." },
  { "id": "inexistente-nao-muda", "checkpoint": 3, "kind": "expr",
    "setup": "from contatos import Contato, Agenda, ContatoNaoEncontrado\na = Agenda()\nfor n, e in [(\"Ana Lima\", \"ana@usp.br\"), (\"Caio\", \"caio@usp.br\")]:\n    a.adicionar(Contato(n, \"1633334444\", e))\ntry:\n    a.remover(\"zeca@usp.br\")\nexcept ContatoNaoEncontrado:\n    pass",
    "expr": "[len(a.contatos), issubclass(ContatoNaoEncontrado, Exception)]", "expected": [2, true],
    "name": "A agenda não muda quando o e-mail não é encontrado" }
]
```

### Soluções erradas
```python name="busca diferencia maiúsculas"
import contatos
```
```python name="busca diferencia maiúsculas" path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


class ContatoNaoEncontrado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())

    def buscar(self, termo):
        termo = termo.strip()
        return [c for c in self.listar() if termo in c.nome or termo in c.email]

    def remover(self, email):
        email = email.strip().lower()
        for contato in self.contatos:
            if contato.email == email:
                self.contatos.remove(contato)
                return contato
        raise ContatoNaoEncontrado(f"nenhum contato com o e-mail {email}")
```
```python name="busca só no nome"
import contatos
```
```python name="busca só no nome" path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


class ContatoNaoEncontrado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())

    def buscar(self, termo):
        termo = termo.strip().lower()
        return [c for c in self.listar() if termo in c.nome.lower()]

    def remover(self, email):
        email = email.strip().lower()
        for contato in self.contatos:
            if contato.email == email:
                self.contatos.remove(contato)
                return contato
        raise ContatoNaoEncontrado(f"nenhum contato com o e-mail {email}")
```
```python name="busca fora de ordem"
import contatos
```
```python name="busca fora de ordem" path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


class ContatoNaoEncontrado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())

    def buscar(self, termo):
        termo = termo.strip().lower()
        return [c for c in self.contatos if termo in c.nome.lower() or termo in c.email]

    def remover(self, email):
        email = email.strip().lower()
        for contato in self.contatos:
            if contato.email == email:
                self.contatos.remove(contato)
                return contato
        raise ContatoNaoEncontrado(f"nenhum contato com o e-mail {email}")
```
```python name="remover devolve None em silêncio"
import contatos
```
```python name="remover devolve None em silêncio" path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


class ContatoNaoEncontrado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())

    def buscar(self, termo):
        termo = termo.strip().lower()
        return [c for c in self.listar() if termo in c.nome.lower() or termo in c.email]

    def remover(self, email):
        email = email.strip().lower()
        for contato in self.contatos:
            if contato.email == email:
                self.contatos.remove(contato)
                return contato
        return None
```
```python name="remover sem normalizar o e-mail"
import contatos
```
```python name="remover sem normalizar o e-mail" path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


class ContatoNaoEncontrado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())

    def buscar(self, termo):
        termo = termo.strip().lower()
        return [c for c in self.listar() if termo in c.nome.lower() or termo in c.email]

    def remover(self, email):
        for contato in self.contatos:
            if contato.email == email:
                self.contatos.remove(contato)
                return contato
        raise ContatoNaoEncontrado(f"nenhum contato com o e-mail {email}")
```

## Passo 4 · Exercício · Salvar e carregar em JSON

Agora a camada de arquivos, em `persistencia.py`. O `json` não sabe gravar um `Contato`; tente e você verá `TypeError: Object of type Contato is not JSON serializable`. Converta cada contato com `asdict` na ida e reconstrua com `Contato(...)` na volta, como na lição de JSON.

- `salvar_json(caminho, agenda)` grava uma **lista de objetos** JSON, um por contato, com as chaves `nome`, `telefone` e `email`, na ordem de `listar()`, com `indent=2` e acentos legíveis.
- `carregar_json(caminho)` devolve uma `Agenda` com os contatos do arquivo, reconstruídos como `Contato` e adicionados com `adicionar` (assim a validação e a regra de duplicidade valem também para o que veio do disco). Se o arquivo não existir, devolve uma `Agenda` vazia.

```text
[
  {
    "nome": "João Pereira",
    "telefone": "11988887777",
    "email": "joao@usp.br"
  }
]
```

### Instruções
1. Escreva `salvar_json(caminho, agenda)`, que grava a lista de dicionários dos contatos, na ordem de `listar()`, com `ensure_ascii=False` e `indent=2`.
2. Escreva `carregar_json(caminho)`, que lê o arquivo e devolve uma `Agenda` com objetos `Contato`, passando cada um por `adicionar`.
3. Se o arquivo não existir, `carregar_json` devolve uma `Agenda` vazia.

### Solução
```python
import contatos
import persistencia
```
```python path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


class ContatoNaoEncontrado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())

    def buscar(self, termo):
        termo = termo.strip().lower()
        return [c for c in self.listar() if termo in c.nome.lower() or termo in c.email]

    def remover(self, email):
        email = email.strip().lower()
        for contato in self.contatos:
            if contato.email == email:
                self.contatos.remove(contato)
                return contato
        raise ContatoNaoEncontrado(f"nenhum contato com o e-mail {email}")
```
```python path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    dados = [asdict(contato) for contato in agenda.listar()]
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def carregar_json(caminho):
    agenda = Agenda()
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
    except FileNotFoundError:
        return agenda
    for item in dados:
        agenda.adicionar(Contato(item["nome"], item["telefone"], item["email"]))
    return agenda


def exportar_csv(caminho, agenda):
    pass


def importar_csv(caminho, agenda):
    pass
```

### Dicas
1. `[asdict(c) for c in agenda.listar()]` já é uma lista que o `json` sabe gravar.
2. Depois do `json.load`, cada item é um dicionário: `Contato(item["nome"], item["telefone"], item["email"])` o transforma de volta.
3. Use `with`, `encoding="utf-8"` e trate só `FileNotFoundError`.

### Verificação
```json
[
  { "id": "salva", "checkpoint": 1, "kind": "expr",
    "setup": "import json\nfrom contatos import Contato, Agenda\nfrom persistencia import salvar_json\na = Agenda()\na.adicionar(Contato(\"Tiago\", \"1633334444\", \"t@usp.br\"))\na.adicionar(Contato(\"João Pereira\", \"(11) 98888-7777\", \"joao@usp.br\"))\nsalvar_json(\"ag.json\", a)\ntexto = open(\"ag.json\", encoding=\"utf-8\").read()",
    "expr": "[\"João\" in texto, texto.startswith(\"[\\n  {\\n    \"), json.loads(texto)]",
    "expected": [true, true, [{ "nome": "João Pereira", "telefone": "11988887777", "email": "joao@usp.br" }, { "nome": "Tiago", "telefone": "1633334444", "email": "t@usp.br" }]],
    "name": "Grava a lista de contatos em ordem, indentada e com acentos", "hint": "Converta cada contato com asdict e use ensure_ascii=False e indent=2." },
  { "id": "carrega", "checkpoint": 2, "kind": "expr",
    "setup": "from persistencia import carregar_json\nwith open(\"x.json\", \"w\", encoding=\"utf-8\") as f:\n    f.write('[{\"nome\": \"Eva Reis\", \"telefone\": \"(11) 3091-0000\", \"email\": \"EVA@usp.br\"}, {\"nome\": \"Davi\", \"telefone\": \"16991234567\", \"email\": \"davi@usp.br\"}]')\na = carregar_json(\"x.json\")",
    "expr": "[type(a).__name__, [type(c).__name__ for c in a.contatos], [c.telefone for c in a.listar()], [c.email for c in a.listar()]]",
    "expected": ["Agenda", ["Contato", "Contato"], ["16991234567", "1130910000"], ["davi@usp.br", "eva@usp.br"]],
    "name": "Carrega uma Agenda com objetos Contato normalizados", "hint": "Reconstrua cada dicionário como Contato e adicione à agenda." },
  { "id": "ida-e-volta", "checkpoint": 2, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\nfrom persistencia import salvar_json, carregar_json\na = Agenda()\nfor n, t, e in [(\"Íris Lopes\", \"16 3333-4444\", \"iris@usp.br\"), (\"Bruno\", \"(19) 99999-0000\", \"bruno@unicamp.br\")]:\n    a.adicionar(Contato(n, t, e))\nsalvar_json(\"rt.json\", a)\nb = carregar_json(\"rt.json\")",
    "expr": "[b.listar() == a.listar(), len(b.contatos)]", "expected": [true, 2],
    "name": "Salvar e carregar devolve os mesmos contatos" },
  { "id": "duplicado-no-arquivo", "checkpoint": 2, "kind": "expr",
    "setup": "from persistencia import carregar_json\nwith open(\"d.json\", \"w\", encoding=\"utf-8\") as f:\n    f.write('[{\"nome\": \"Ana\", \"telefone\": \"1633334444\", \"email\": \"ana@usp.br\"}, {\"nome\": \"Ana B\", \"telefone\": \"1633335555\", \"email\": \"ANA@usp.br\"}]')",
    "expr": "carregar_json(\"d.json\")", "raises": "ContatoDuplicado",
    "name": "Arquivo com e-mail repetido levanta ContatoDuplicado", "hint": "Passe cada contato carregado por agenda.adicionar." },
  { "id": "agenda-funciona", "checkpoint": 2, "kind": "expr",
    "setup": "from contatos import Contato\nfrom persistencia import carregar_json\nwith open(\"f.json\", \"w\", encoding=\"utf-8\") as f:\n    f.write('[{\"nome\": \"Lia\", \"telefone\": \"1633334444\", \"email\": \"lia@usp.br\"}]')\na = carregar_json(\"f.json\")",
    "expr": "a.adicionar(Contato(\"Lia Souza\", \"1633335555\", \"LIA@usp.br\"))", "raises": "ContatoDuplicado",
    "name": "A agenda carregada continua recusando duplicados" },
  { "id": "inexistente", "checkpoint": 3, "kind": "expr",
    "setup": "from persistencia import carregar_json\na = carregar_json(\"nunca.json\")",
    "expr": "[type(a).__name__, len(a.contatos)]", "expected": ["Agenda", 0],
    "name": "Arquivo inexistente dá uma Agenda vazia", "hint": "Trate FileNotFoundError devolvendo Agenda()." }
]
```

### Soluções erradas
```python name="grava os objetos direto no JSON"
import persistencia
```
```python name="grava os objetos direto no JSON" path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    dados = agenda.listar()
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def carregar_json(caminho):
    agenda = Agenda()
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
    except FileNotFoundError:
        return agenda
    for item in dados:
        agenda.adicionar(Contato(item["nome"], item["telefone"], item["email"]))
    return agenda
```
```python name="carrega dicionários sem reconstruir os contatos"
import persistencia
```
```python name="carrega dicionários sem reconstruir os contatos" path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    dados = [asdict(contato) for contato in agenda.listar()]
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def carregar_json(caminho):
    agenda = Agenda()
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
    except FileNotFoundError:
        return agenda
    agenda.contatos = dados
    return agenda
```
```python name="acentos viram códigos"
import persistencia
```
```python name="acentos viram códigos" path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    dados = [asdict(contato) for contato in agenda.listar()]
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, indent=2)


def carregar_json(caminho):
    agenda = Agenda()
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
    except FileNotFoundError:
        return agenda
    for item in dados:
        agenda.adicionar(Contato(item["nome"], item["telefone"], item["email"]))
    return agenda
```
```python name="não trata o arquivo inexistente"
import persistencia
```
```python name="não trata o arquivo inexistente" path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    dados = [asdict(contato) for contato in agenda.listar()]
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def carregar_json(caminho):
    agenda = Agenda()
    with open(caminho, encoding="utf-8") as arquivo:
        dados = json.load(arquivo)
    for item in dados:
        agenda.adicionar(Contato(item["nome"], item["telefone"], item["email"]))
    return agenda
```
```python name="reconstrói sem passar por adicionar"
import persistencia
```
```python name="reconstrói sem passar por adicionar" path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    dados = [asdict(contato) for contato in agenda.listar()]
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def carregar_json(caminho):
    agenda = Agenda()
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
    except FileNotFoundError:
        return agenda
    for item in dados:
        agenda.contatos.append(Contato(item["nome"], item["telefone"], item["email"]))
    return agenda
```

## Passo 5 · Exercício · Exportar e importar CSV

A secretaria do curso quer abrir a agenda no Excel e mandar de volta uma planilha com contatos novos. Termine `persistencia.py`:

- `exportar_csv(caminho, agenda)` grava um CSV com `;`, cabeçalho `nome;telefone;email` e um contato por linha, na ordem de `listar()`, e devolve quantos contatos escreveu.
- `importar_csv(caminho, agenda)` lê um CSV com `;` e as colunas `nome`, `telefone` e `email` (em qualquer ordem) e adiciona cada linha à agenda como `Contato`. Linha com dado inválido (`ValueError`) ou e-mail repetido (`ContatoDuplicado`) é **pulada**, sem interromper a importação. Devolve a tupla `(importados, ignorados)`.

```python
importar_csv("planilha.csv", agenda)   # (2, 3): duas linhas entraram, três foram puladas
```

### Instruções
1. Escreva `exportar_csv(caminho, agenda)` com `csv.DictWriter`, `;`, cabeçalho e os contatos na ordem de `listar()`, devolvendo a quantidade escrita.
2. Escreva `importar_csv(caminho, agenda)` com `csv.DictReader` e `;`, criando um `Contato` por linha e adicionando-o à agenda.
3. Pule as linhas que levantarem `ValueError` ou `ContatoDuplicado`, contando-as, e devolva `(importados, ignorados)`.

### Solução
```python
import contatos
import persistencia
```
```python path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


class ContatoNaoEncontrado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())

    def buscar(self, termo):
        termo = termo.strip().lower()
        return [c for c in self.listar() if termo in c.nome.lower() or termo in c.email]

    def remover(self, email):
        email = email.strip().lower()
        for contato in self.contatos:
            if contato.email == email:
                self.contatos.remove(contato)
                return contato
        raise ContatoNaoEncontrado(f"nenhum contato com o e-mail {email}")
```
```python path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    dados = [asdict(contato) for contato in agenda.listar()]
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def carregar_json(caminho):
    agenda = Agenda()
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
    except FileNotFoundError:
        return agenda
    for item in dados:
        agenda.adicionar(Contato(item["nome"], item["telefone"], item["email"]))
    return agenda


def exportar_csv(caminho, agenda):
    contatos = agenda.listar()
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "telefone", "email"], delimiter=";")
        escritor.writeheader()
        for contato in contatos:
            escritor.writerow(asdict(contato))
    return len(contatos)


def importar_csv(caminho, agenda):
    importados = 0
    ignorados = 0
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=";"):
            try:
                agenda.adicionar(Contato(linha["nome"], linha["telefone"], linha["email"]))
                importados += 1
            except (ValueError, ContatoDuplicado):
                ignorados += 1
    return importados, ignorados
```

### Dicas
1. Abra os dois arquivos com `newline=""` e `encoding="utf-8"`.
2. `asdict(contato)` tem exatamente as chaves do cabeçalho.
3. Um `try` em volta de cada linha, dentro do laço, deixa a importação seguir depois de uma linha ruim.

### Verificação
```json
[
  { "id": "exporta", "checkpoint": 1, "kind": "expr",
    "setup": "import csv\nfrom contatos import Contato, Agenda\nfrom persistencia import exportar_csv\na = Agenda()\nfor n, t, e in [(\"Tiago\", \"1633334444\", \"t@usp.br\"), (\"Souza; Ana\", \"(16) 99123-4567\", \"ana@usp.br\"), (\"bia\", \"11 3091-0000\", \"bia@usp.br\")]:\n    a.adicionar(Contato(n, t, e))\nn = exportar_csv(\"ag.csv\", a)\nwith open(\"ag.csv\", encoding=\"utf-8\", newline=\"\") as f:\n    linhas = list(csv.reader(f, delimiter=\";\"))",
    "expr": "[n, linhas]",
    "expected": [3, [["nome", "telefone", "email"], ["bia", "1130910000", "bia@usp.br"], ["Souza; Ana", "16991234567", "ana@usp.br"], ["Tiago", "1633334444", "t@usp.br"]]],
    "name": "Exporta cabeçalho e contatos em ordem, separados por ;", "hint": "Use DictWriter com delimiter=\";\" e percorra agenda.listar()." },
  { "id": "exporta-vazia", "checkpoint": 1, "kind": "expr",
    "setup": "from contatos import Agenda\nfrom persistencia import exportar_csv\nn = exportar_csv(\"v.csv\", Agenda())",
    "expr": "[n, open(\"v.csv\", encoding=\"utf-8\").read().strip()]", "expected": [0, "nome;telefone;email"],
    "name": "Agenda vazia exporta só o cabeçalho" },
  { "id": "importa", "checkpoint": 3, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\nfrom persistencia import importar_csv\na = Agenda()\na.adicionar(Contato(\"Ana Lima\", \"16991234567\", \"ana@usp.br\"))\nwith open(\"p.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write(\"nome;telefone;email\\nBia Souza;(11) 3091-0000;BIA@usp.br\\nCaio;123;caio@usp.br\\nAna Clara;16988887777;ana@usp.br\\nDavi;16991234567;davi.usp.br\\nEva Reis;16 99123-4567;eva@usp.br\\n\")\nr = importar_csv(\"p.csv\", a)",
    "expr": "[list(r), type(r).__name__, [c.email for c in a.listar()]]",
    "expected": [[2, 3], "tuple", ["ana@usp.br", "bia@usp.br", "eva@usp.br"]],
    "name": "Importa as linhas válidas e pula inválidas e duplicadas", "hint": "Capture ValueError e ContatoDuplicado dentro do laço e conte as puladas." },
  { "id": "importa-colunas", "checkpoint": 2, "kind": "expr",
    "setup": "from contatos import Agenda\nfrom persistencia import importar_csv\na = Agenda()\nwith open(\"c.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write('email;nome;telefone\\nlia@usp.br;\"Lia; monitora\";1633334444\\n')\nr = importar_csv(\"c.csv\", a)",
    "expr": "[list(r), [(c.nome, c.telefone) for c in a.contatos], type(a.contatos[0]).__name__]",
    "expected": [[1, 0], [["Lia; monitora", "1633334444"]], "Contato"],
    "name": "Importa com as colunas em outra ordem e campo entre aspas" },
  { "id": "ida-e-volta", "checkpoint": 2, "kind": "expr",
    "setup": "from contatos import Contato, Agenda\nfrom persistencia import exportar_csv, importar_csv\na = Agenda()\nfor n, t, e in [(\"Íris\", \"16 3333-4444\", \"iris@usp.br\"), (\"Bruno\", \"(19) 99999-0000\", \"bruno@unicamp.br\")]:\n    a.adicionar(Contato(n, t, e))\nexportar_csv(\"rt.csv\", a)\nb = Agenda()\nr = importar_csv(\"rt.csv\", b)",
    "expr": "[list(r), b.listar() == a.listar()]", "expected": [[2, 0], true],
    "name": "Exportar e importar numa agenda nova devolve os mesmos contatos" }
]
```

### Soluções erradas
```python name="exporta com vírgula"
import persistencia
```
```python name="exporta com vírgula" path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def exportar_csv(caminho, agenda):
    contatos = agenda.listar()
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "telefone", "email"])
        escritor.writeheader()
        for contato in contatos:
            escritor.writerow(asdict(contato))
    return len(contatos)


def importar_csv(caminho, agenda):
    importados = 0
    ignorados = 0
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=";"):
            try:
                agenda.adicionar(Contato(linha["nome"], linha["telefone"], linha["email"]))
                importados += 1
            except (ValueError, ContatoDuplicado):
                ignorados += 1
    return importados, ignorados
```
```python name="exporta fora de ordem"
import persistencia
```
```python name="exporta fora de ordem" path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def exportar_csv(caminho, agenda):
    contatos = agenda.contatos
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "telefone", "email"], delimiter=";")
        escritor.writeheader()
        for contato in contatos:
            escritor.writerow(asdict(contato))
    return len(contatos)


def importar_csv(caminho, agenda):
    importados = 0
    ignorados = 0
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=";"):
            try:
                agenda.adicionar(Contato(linha["nome"], linha["telefone"], linha["email"]))
                importados += 1
            except (ValueError, ContatoDuplicado):
                ignorados += 1
    return importados, ignorados
```
```python name="importação para na primeira linha ruim"
import persistencia
```
```python name="importação para na primeira linha ruim" path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def exportar_csv(caminho, agenda):
    contatos = agenda.listar()
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "telefone", "email"], delimiter=";")
        escritor.writeheader()
        for contato in contatos:
            escritor.writerow(asdict(contato))
    return len(contatos)


def importar_csv(caminho, agenda):
    importados = 0
    ignorados = 0
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=";"):
            agenda.adicionar(Contato(linha["nome"], linha["telefone"], linha["email"]))
            importados += 1
    return importados, ignorados
```
```python name="pula só os inválidos, não os duplicados"
import persistencia
```
```python name="pula só os inválidos, não os duplicados" path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def exportar_csv(caminho, agenda):
    contatos = agenda.listar()
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "telefone", "email"], delimiter=";")
        escritor.writeheader()
        for contato in contatos:
            escritor.writerow(asdict(contato))
    return len(contatos)


def importar_csv(caminho, agenda):
    importados = 0
    ignorados = 0
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=";"):
            try:
                agenda.adicionar(Contato(linha["nome"], linha["telefone"], linha["email"]))
                importados += 1
            except ValueError:
                ignorados += 1
    return importados, ignorados
```
```python name="importa dicionários em vez de contatos"
import persistencia
```
```python name="importa dicionários em vez de contatos" path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def exportar_csv(caminho, agenda):
    contatos = agenda.listar()
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "telefone", "email"], delimiter=";")
        escritor.writeheader()
        for contato in contatos:
            escritor.writerow(asdict(contato))
    return len(contatos)


def importar_csv(caminho, agenda):
    importados = 0
    ignorados = 0
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=";"):
            try:
                agenda.contatos.append(dict(linha))
                importados += 1
            except (ValueError, ContatoDuplicado):
                ignorados += 1
    return importados, ignorados
```

## Passo 6 · Exercício · O laço de comandos

Falta a interface, em `main.py`. Escreva `executar(caminho="agenda.json")` e chame-a no fim do arquivo, protegida pelo guarda `if __name__ == "__main__":`.

Ao começar, `executar` carrega a agenda de `caminho` e imprime `Agenda carregada: N contato(s)`. Depois lê um comando por linha com `input()` (sem texto de pergunta), sem diferenciar maiúsculas e ignorando espaços nas pontas:

| Comando | Lê depois | Imprime |
|---|---|---|
| `adicionar` | nome, telefone e e-mail, uma linha cada | `Adicionado: <nome>` ou `Erro: <mensagem da exceção>` |
| `buscar` | o termo | cada contato como `<nome> \| <telefone> \| <email>`, ou `Nenhum contato encontrado` |
| `remover` | o e-mail | `Removido: <nome>` ou `Erro: <mensagem da exceção>` |
| `listar` | nada | cada contato no mesmo formato, ou `Agenda vazia` |
| `exportar` | o nome do arquivo CSV | `Exportado: N contato(s) em <arquivo>` |
| `sair` | nada | `Até logo!` e termina |
| qualquer outro | nada | `Comando inválido` |

Duas regras de robustez:

- depois de cada `adicionar` ou `remover` que deu certo, a agenda é **salva** em `caminho`, na hora;
- se a entrada acabar sem `sair` (o `input()` levanta `EOFError`), o programa se despede como se fosse `sair`.

### Instruções
1. Carregue a agenda com `carregar_json(caminho)`, anuncie quantos contatos ela tem e repita a leitura de comandos até `sair` ou o fim da entrada.
2. Implemente `adicionar`, `buscar`, `remover` e `listar` com as mensagens da tabela, transformando `ValueError`, `ContatoDuplicado` e `ContatoNaoEncontrado` em `Erro: <mensagem>`.
3. Salve com `salvar_json` logo depois de cada alteração bem-sucedida.
4. Implemente `exportar`, `sair`, o comando inválido e o fim da entrada.

### Solução
```python
from contatos import Contato, ContatoDuplicado, ContatoNaoEncontrado
from persistencia import carregar_json, exportar_csv, salvar_json


def mostrar(contatos):
    for contato in contatos:
        print(f"{contato.nome} | {contato.telefone} | {contato.email}")


def executar(caminho="agenda.json"):
    agenda = carregar_json(caminho)
    print(f"Agenda carregada: {len(agenda.contatos)} contato(s)")
    while True:
        try:
            comando = input().strip().lower()
        except EOFError:
            comando = "sair"
        if comando == "sair":
            print("Até logo!")
            return
        elif comando == "adicionar":
            nome = input()
            telefone = input()
            email = input()
            try:
                contato = Contato(nome, telefone, email)
                agenda.adicionar(contato)
                salvar_json(caminho, agenda)
                print(f"Adicionado: {contato.nome}")
            except (ValueError, ContatoDuplicado) as erro:
                print(f"Erro: {erro}")
        elif comando == "buscar":
            encontrados = agenda.buscar(input())
            if encontrados:
                mostrar(encontrados)
            else:
                print("Nenhum contato encontrado")
        elif comando == "remover":
            try:
                contato = agenda.remover(input())
                salvar_json(caminho, agenda)
                print(f"Removido: {contato.nome}")
            except ContatoNaoEncontrado as erro:
                print(f"Erro: {erro}")
        elif comando == "listar":
            if agenda.contatos:
                mostrar(agenda.listar())
            else:
                print("Agenda vazia")
        elif comando == "exportar":
            destino = input().strip()
            quantidade = exportar_csv(destino, agenda)
            print(f"Exportado: {quantidade} contato(s) em {destino}")
        else:
            print("Comando inválido")


if __name__ == "__main__":
    executar()
```
```python path=contatos.py
from dataclasses import dataclass


class ContatoDuplicado(Exception):
    pass


class ContatoNaoEncontrado(Exception):
    pass


@dataclass
class Contato:
    nome: str
    telefone: str
    email: str

    def __post_init__(self):
        self.nome = self.nome.strip()
        if self.nome == "":
            raise ValueError("nome vazio")
        for caractere in self.telefone:
            if not (caractere.isdigit() or caractere in " ()-"):
                raise ValueError("telefone inválido")
        digitos = "".join(c for c in self.telefone if c.isdigit())
        if len(digitos) not in (10, 11):
            raise ValueError("telefone inválido")
        self.telefone = digitos
        self.email = self.email.strip().lower()
        usuario, arroba, dominio = self.email.partition("@")
        if usuario == "" or arroba == "" or "." not in dominio:
            raise ValueError("e-mail inválido")


class Agenda:
    def __init__(self):
        self.contatos = []

    def adicionar(self, contato):
        for existente in self.contatos:
            if existente.email == contato.email:
                raise ContatoDuplicado(f"já existe contato com o e-mail {contato.email}")
        self.contatos.append(contato)

    def listar(self):
        return sorted(self.contatos, key=lambda c: c.nome.lower())

    def buscar(self, termo):
        termo = termo.strip().lower()
        return [c for c in self.listar() if termo in c.nome.lower() or termo in c.email]

    def remover(self, email):
        email = email.strip().lower()
        for contato in self.contatos:
            if contato.email == email:
                self.contatos.remove(contato)
                return contato
        raise ContatoNaoEncontrado(f"nenhum contato com o e-mail {email}")
```
```python path=persistencia.py
import csv
import json
from dataclasses import asdict

from contatos import Agenda, Contato, ContatoDuplicado


def salvar_json(caminho, agenda):
    dados = [asdict(contato) for contato in agenda.listar()]
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(dados, arquivo, ensure_ascii=False, indent=2)


def carregar_json(caminho):
    agenda = Agenda()
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
    except FileNotFoundError:
        return agenda
    for item in dados:
        agenda.adicionar(Contato(item["nome"], item["telefone"], item["email"]))
    return agenda


def exportar_csv(caminho, agenda):
    contatos = agenda.listar()
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "telefone", "email"], delimiter=";")
        escritor.writeheader()
        for contato in contatos:
            escritor.writerow(asdict(contato))
    return len(contatos)


def importar_csv(caminho, agenda):
    importados = 0
    ignorados = 0
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=";"):
            try:
                agenda.adicionar(Contato(linha["nome"], linha["telefone"], linha["email"]))
                importados += 1
            except (ValueError, ContatoDuplicado):
                ignorados += 1
    return importados, ignorados
```

### Dicas
1. `print(f"Erro: {erro}")` mostra a mensagem da exceção capturada com `except (...) as erro`.
2. Ponha o `input()` do comando dentro de um `try` com `except EOFError`.
3. Salvar só no `sair` perde tudo se o programa cair no meio: chame `salvar_json` dentro do ramo de cada alteração.

### Verificação
```json
[
  { "id": "adiciona-lista", "checkpoint": 2, "kind": "io",
    "stdin": "adicionar\nAna Lima\n(16) 99123-4567\nAna@USP.br\nadicionar\nbia souza\n11 3091-0000\nbia@usp.br\nlistar\nsair\n",
    "expected_stdout": "Agenda carregada: 0 contato(s)\nAdicionado: Ana Lima\nAdicionado: bia souza\nAna Lima | 16991234567 | ana@usp.br\nbia souza | 1130910000 | bia@usp.br\nAté logo!",
    "name": "Adiciona dois contatos e lista em ordem", "hint": "Confira as mensagens da tabela, letra por letra." },
  { "id": "erros", "checkpoint": 2, "kind": "io",
    "stdin": "adicionar\nAna Lima\n16991234567\nana@usp.br\nadicionar\nAna Clara\n(16) 98888-0000\nANA@usp.br\nadicionar\nCaio\n123\ncaio@usp.br\nadicionar\nDavi\n11 3091-0000\ndavi.usp.br\nadicionar\n   \n11 3091-0000\nx@usp.br\nlistar\nsair\n",
    "expected_stdout": "Agenda carregada: 0 contato(s)\nAdicionado: Ana Lima\nErro: já existe contato com o e-mail ana@usp.br\nErro: telefone inválido\nErro: e-mail inválido\nErro: nome vazio\nAna Lima | 16991234567 | ana@usp.br\nAté logo!",
    "name": "Dados inválidos e duplicados viram mensagens de erro, sem derrubar o programa", "hint": "Capture ValueError e ContatoDuplicado no adicionar." },
  { "id": "busca-remove", "checkpoint": 2, "kind": "io",
    "stdin": "adicionar\nJuliana Reis\n1633334444\nju@ufscar.br\nadicionar\nBia Souza\n1633335555\nbia@usp.br\nadicionar\nAna Lima\n16991234567\nana@usp.br\nbuscar\nANA\nbuscar\nzeca\nremover\nBIA@usp.br\nremover\nzeca@usp.br\nlistar\nvoar\nsair\n",
    "expected_stdout": "Agenda carregada: 0 contato(s)\nAdicionado: Juliana Reis\nAdicionado: Bia Souza\nAdicionado: Ana Lima\nAna Lima | 16991234567 | ana@usp.br\nJuliana Reis | 1633334444 | ju@ufscar.br\nNenhum contato encontrado\nRemovido: Bia Souza\nErro: nenhum contato com o e-mail zeca@usp.br\nAna Lima | 16991234567 | ana@usp.br\nJuliana Reis | 1633334444 | ju@ufscar.br\nComando inválido\nAté logo!",
    "name": "buscar, remover e comando inválido" },
  { "id": "fim-da-entrada", "checkpoint": 4, "kind": "io", "stdin": "  LISTAR \nbuscar\nana\n",
    "expected_stdout": "Agenda carregada: 0 contato(s)\nAgenda vazia\nNenhum contato encontrado\nAté logo!",
    "name": "Comando com maiúsculas e espaços funciona; fim da entrada se despede", "hint": "Trate EOFError no input() do comando." },
  { "id": "exportar", "checkpoint": 4, "kind": "io",
    "stdin": "adicionar\nTiago\n1633334444\nt@usp.br\nadicionar\nAna Lima\n16991234567\nana@usp.br\nexportar\nturma.csv\nsair\n",
    "expected_stdout": "Agenda carregada: 0 contato(s)\nAdicionado: Tiago\nAdicionado: Ana Lima\nExportado: 2 contato(s) em turma.csv\nAté logo!",
    "name": "exportar anuncia quantos contatos foram exportados" },
  { "id": "exportar-arquivo", "checkpoint": 4, "kind": "expr",
    "stdin": "adicionar\nTiago\n1633334444\nt@usp.br\nadicionar\nAna Lima\n16991234567\nana@usp.br\nexportar\nturma.csv\nsair\n",
    "expr": "open(\"turma.csv\", encoding=\"utf-8\").read().splitlines()",
    "expected": ["nome;telefone;email", "Ana Lima;16991234567;ana@usp.br", "Tiago;1633334444;t@usp.br"],
    "name": "O CSV exportado tem os contatos em ordem" },
  { "id": "duas-sessoes", "checkpoint": 1, "kind": "expr",
    "stdin": "adicionar\nEva Reis\n(11) 98888-7777\neva@usp.br\nsair\nlistar\nremover\neva@usp.br\nsair\nlistar\n",
    "setup": "from persistencia import carregar_json\nexecutar()\nexecutar()",
    "expr": "len(carregar_json(\"agenda.json\").contatos)", "expected": 0,
    "expected_stdout": "Agenda carregada: 1 contato(s)\nEva Reis | 11988887777 | eva@usp.br\nRemovido: Eva Reis\nAté logo!\nAgenda carregada: 0 contato(s)\nAgenda vazia\nAté logo!",
    "match": "trimmed",
    "name": "A próxima execução encontra o que a anterior salvou", "hint": "Carregue de caminho ao começar e salve a cada alteração." },
  { "id": "salva-na-hora", "checkpoint": 3, "kind": "expr",
    "setup": "import json\n_linhas = iter([\"adicionar\", \"Ana Lima\", \"(16) 99123-4567\", \"ana@usp.br\", \"adicionar\", \"Bia Souza\", \"1633335555\", \"bia@usp.br\", \"remover\", \"ana@usp.br\"])\ndef input(prompt=\"\"):\n    try:\n        return next(_linhas)\n    except StopIteration:\n        raise RuntimeError(\"queda de energia\")\ntry:\n    executar(\"queda.json\")\nexcept RuntimeError:\n    pass",
    "expr": "[c[\"email\"] for c in json.load(open(\"queda.json\", encoding=\"utf-8\"))]", "expected": ["bia@usp.br"],
    "name": "Se o programa cair no meio, as alterações já confirmadas estão salvas", "hint": "Chame salvar_json logo depois de cada adicionar e remover que deram certo." }
]
```

### Soluções erradas
```python name="salva só ao sair"
from contatos import Contato, ContatoDuplicado, ContatoNaoEncontrado
from persistencia import carregar_json, exportar_csv, salvar_json


def mostrar(contatos):
    for contato in contatos:
        print(f"{contato.nome} | {contato.telefone} | {contato.email}")


def executar(caminho="agenda.json"):
    agenda = carregar_json(caminho)
    print(f"Agenda carregada: {len(agenda.contatos)} contato(s)")
    while True:
        try:
            comando = input().strip().lower()
        except EOFError:
            comando = "sair"
        if comando == "sair":
            salvar_json(caminho, agenda)
            print("Até logo!")
            return
        elif comando == "adicionar":
            nome = input()
            telefone = input()
            email = input()
            try:
                contato = Contato(nome, telefone, email)
                agenda.adicionar(contato)
                print(f"Adicionado: {contato.nome}")
            except (ValueError, ContatoDuplicado) as erro:
                print(f"Erro: {erro}")
        elif comando == "buscar":
            encontrados = agenda.buscar(input())
            if encontrados:
                mostrar(encontrados)
            else:
                print("Nenhum contato encontrado")
        elif comando == "remover":
            try:
                contato = agenda.remover(input())
                print(f"Removido: {contato.nome}")
            except ContatoNaoEncontrado as erro:
                print(f"Erro: {erro}")
        elif comando == "listar":
            if agenda.contatos:
                mostrar(agenda.listar())
            else:
                print("Agenda vazia")
        elif comando == "exportar":
            destino = input().strip()
            quantidade = exportar_csv(destino, agenda)
            print(f"Exportado: {quantidade} contato(s) em {destino}")
        else:
            print("Comando inválido")


if __name__ == "__main__":
    executar()
```
```python name="não carrega a agenda ao abrir"
from contatos import Agenda, Contato, ContatoDuplicado, ContatoNaoEncontrado
from persistencia import carregar_json, exportar_csv, salvar_json


def mostrar(contatos):
    for contato in contatos:
        print(f"{contato.nome} | {contato.telefone} | {contato.email}")


def executar(caminho="agenda.json"):
    agenda = Agenda()
    print(f"Agenda carregada: {len(agenda.contatos)} contato(s)")
    while True:
        try:
            comando = input().strip().lower()
        except EOFError:
            comando = "sair"
        if comando == "sair":
            print("Até logo!")
            return
        elif comando == "adicionar":
            nome = input()
            telefone = input()
            email = input()
            try:
                contato = Contato(nome, telefone, email)
                agenda.adicionar(contato)
                salvar_json(caminho, agenda)
                print(f"Adicionado: {contato.nome}")
            except (ValueError, ContatoDuplicado) as erro:
                print(f"Erro: {erro}")
        elif comando == "buscar":
            encontrados = agenda.buscar(input())
            if encontrados:
                mostrar(encontrados)
            else:
                print("Nenhum contato encontrado")
        elif comando == "remover":
            try:
                contato = agenda.remover(input())
                salvar_json(caminho, agenda)
                print(f"Removido: {contato.nome}")
            except ContatoNaoEncontrado as erro:
                print(f"Erro: {erro}")
        elif comando == "listar":
            if agenda.contatos:
                mostrar(agenda.listar())
            else:
                print("Agenda vazia")
        elif comando == "exportar":
            destino = input().strip()
            quantidade = exportar_csv(destino, agenda)
            print(f"Exportado: {quantidade} contato(s) em {destino}")
        else:
            print("Comando inválido")


if __name__ == "__main__":
    executar()
```
```python name="não trata o fim da entrada"
from contatos import Contato, ContatoDuplicado, ContatoNaoEncontrado
from persistencia import carregar_json, exportar_csv, salvar_json


def mostrar(contatos):
    for contato in contatos:
        print(f"{contato.nome} | {contato.telefone} | {contato.email}")


def executar(caminho="agenda.json"):
    agenda = carregar_json(caminho)
    print(f"Agenda carregada: {len(agenda.contatos)} contato(s)")
    while True:
        comando = input().strip().lower()
        if comando == "sair":
            print("Até logo!")
            return
        elif comando == "adicionar":
            nome = input()
            telefone = input()
            email = input()
            try:
                contato = Contato(nome, telefone, email)
                agenda.adicionar(contato)
                salvar_json(caminho, agenda)
                print(f"Adicionado: {contato.nome}")
            except (ValueError, ContatoDuplicado) as erro:
                print(f"Erro: {erro}")
        elif comando == "buscar":
            encontrados = agenda.buscar(input())
            if encontrados:
                mostrar(encontrados)
            else:
                print("Nenhum contato encontrado")
        elif comando == "remover":
            try:
                contato = agenda.remover(input())
                salvar_json(caminho, agenda)
                print(f"Removido: {contato.nome}")
            except ContatoNaoEncontrado as erro:
                print(f"Erro: {erro}")
        elif comando == "listar":
            if agenda.contatos:
                mostrar(agenda.listar())
            else:
                print("Agenda vazia")
        elif comando == "exportar":
            destino = input().strip()
            quantidade = exportar_csv(destino, agenda)
            print(f"Exportado: {quantidade} contato(s) em {destino}")
        else:
            print("Comando inválido")


if __name__ == "__main__":
    executar()
```
```python name="erro de validação derruba o programa"
from contatos import Contato, ContatoDuplicado, ContatoNaoEncontrado
from persistencia import carregar_json, exportar_csv, salvar_json


def mostrar(contatos):
    for contato in contatos:
        print(f"{contato.nome} | {contato.telefone} | {contato.email}")


def executar(caminho="agenda.json"):
    agenda = carregar_json(caminho)
    print(f"Agenda carregada: {len(agenda.contatos)} contato(s)")
    while True:
        try:
            comando = input().strip().lower()
        except EOFError:
            comando = "sair"
        if comando == "sair":
            print("Até logo!")
            return
        elif comando == "adicionar":
            nome = input()
            telefone = input()
            email = input()
            try:
                contato = Contato(nome, telefone, email)
                agenda.adicionar(contato)
                salvar_json(caminho, agenda)
                print(f"Adicionado: {contato.nome}")
            except ContatoDuplicado as erro:
                print(f"Erro: {erro}")
        elif comando == "buscar":
            encontrados = agenda.buscar(input())
            if encontrados:
                mostrar(encontrados)
            else:
                print("Nenhum contato encontrado")
        elif comando == "remover":
            try:
                contato = agenda.remover(input())
                salvar_json(caminho, agenda)
                print(f"Removido: {contato.nome}")
            except ContatoNaoEncontrado as erro:
                print(f"Erro: {erro}")
        elif comando == "listar":
            if agenda.contatos:
                mostrar(agenda.listar())
            else:
                print("Agenda vazia")
        elif comando == "exportar":
            destino = input().strip()
            quantidade = exportar_csv(destino, agenda)
            print(f"Exportado: {quantidade} contato(s) em {destino}")
        else:
            print("Comando inválido")


if __name__ == "__main__":
    executar()
```
```python name="comando diferencia maiúsculas e espaços"
from contatos import Contato, ContatoDuplicado, ContatoNaoEncontrado
from persistencia import carregar_json, exportar_csv, salvar_json


def mostrar(contatos):
    for contato in contatos:
        print(f"{contato.nome} | {contato.telefone} | {contato.email}")


def executar(caminho="agenda.json"):
    agenda = carregar_json(caminho)
    print(f"Agenda carregada: {len(agenda.contatos)} contato(s)")
    while True:
        try:
            comando = input()
        except EOFError:
            comando = "sair"
        if comando == "sair":
            print("Até logo!")
            return
        elif comando == "adicionar":
            nome = input()
            telefone = input()
            email = input()
            try:
                contato = Contato(nome, telefone, email)
                agenda.adicionar(contato)
                salvar_json(caminho, agenda)
                print(f"Adicionado: {contato.nome}")
            except (ValueError, ContatoDuplicado) as erro:
                print(f"Erro: {erro}")
        elif comando == "buscar":
            encontrados = agenda.buscar(input())
            if encontrados:
                mostrar(encontrados)
            else:
                print("Nenhum contato encontrado")
        elif comando == "remover":
            try:
                contato = agenda.remover(input())
                salvar_json(caminho, agenda)
                print(f"Removido: {contato.nome}")
            except ContatoNaoEncontrado as erro:
                print(f"Erro: {erro}")
        elif comando == "listar":
            if agenda.contatos:
                mostrar(agenda.listar())
            else:
                print("Agenda vazia")
        elif comando == "exportar":
            destino = input().strip()
            quantidade = exportar_csv(destino, agenda)
            print(f"Exportado: {quantidade} contato(s) em {destino}")
        else:
            print("Comando inválido")


if __name__ == "__main__":
    executar()
```

## Passo 7 · Quiz · Revisão do módulo

### Pergunta
Por que a agenda salva o arquivo depois de cada alteração, e não só quando o usuário digita `sair`?
- [ ] Porque o `json.dump` só funciona com um contato por vez
- [x] Porque, se o programa cair ou a entrada acabar no meio, tudo o que foi feito desde a abertura se perderia
- [ ] Porque o arquivo JSON fica corrompido se ficar aberto por muito tempo
- [ ] Porque o `with` fecha o arquivo sozinho no fim do programa
> Salvar só no fim concentra todo o risco num ponto que pode nunca ser alcançado. Salvar a cada alteração custa uma gravação a mais e garante que o que foi confirmado ao usuário está no disco.

### Pergunta
Uma versão de `carregar_json` faz `agenda.contatos = json.load(arquivo)` e devolve a agenda. O que acontece no primeiro `listar` do menu?
- [ ] Funciona, porque o `json` reconstrói os objetos `Contato`
- [x] Quebra com `AttributeError: 'dict' object has no attribute 'nome'`, porque os contatos voltaram como dicionários
- [ ] Mostra a agenda vazia
- [ ] Quebra com `JSONDecodeError`
> O `json.load` devolve só tipos do JSON: listas e dicionários. Sem reconstruir cada item como `Contato`, o código que espera `contato.nome` quebra, e a validação e a regra de duplicidade não valem para o que veio do arquivo.

### Pergunta
Por que `Contato`, `Agenda` e as exceções ficam em `contatos.py`, separados da leitura de arquivos e do menu?
- [ ] Porque o Python exige uma classe por arquivo
- [ ] Porque dataclasses não podem ser usadas no mesmo arquivo que `input()`
- [x] Porque assim cada camada pode ser testada e trocada sozinha: as regras da agenda não dependem de onde os dados são guardados nem de como o usuário digita
- [ ] Porque o `json` só consegue importar classes de outro módulo
> É a separação em camadas: domínio, persistência e interface. Os testes deste projeto exercitaram `Agenda` sem arquivo nenhum e `persistencia` sem menu, e trocar o JSON por outro formato mexeria só em `persistencia.py`.
