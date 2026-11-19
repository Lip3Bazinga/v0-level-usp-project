---
slug: n2-m5-06-args-kwargs-e-assinaturas
titulo: '*args, **kwargs e assinaturas flexíveis'
descricao: Funções com número variável de argumentos, desempacotamento em chamadas e parâmetros somente-nomeados.
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
- Definir funções com *args e **kwargs e repassá-los a outras funções
- Desempacotar listas e dicionários em chamadas com * e **
- Usar parâmetros somente-nomeados (após *) e somente-posicionais (antes de /)
---

## Passo 1 · Leitura · Quantos argumentos?

`print("Ana")`, `print("Ana", "Bia")` e `print("Ana", "Bia", "Caio", sep=", ")` chamam a mesma função com números diferentes de argumentos. Os envolucros da lição de decoradores faziam o mesmo com `*args, **kwargs`. Agora é a hora de entender essa notação.

Um parâmetro com **um asterisco** recolhe todos os argumentos posicionais que sobraram numa **tupla**. Com **dois asteriscos**, recolhe os argumentos nomeados que sobraram num **dicionário**:

```python
def inscrever(curso, *alunos, **opcoes):
    print(curso, alunos, opcoes)


inscrever("Python", "Ana", "Bia", turno="noite", vagas=30)
# Python ('Ana', 'Bia') {'turno': 'noite', 'vagas': 30}
```

Os nomes `args` e `kwargs` (de *keyword arguments*) são só costume; o que importa são os asteriscos. Use nomes que digam o que chega: `*alunos`, `**opcoes`. Sem nada sobrando, a tupla e o dicionário chegam vazios.

#### A ordem dos parâmetros

Numa definição, os tipos de parâmetro aparecem sempre nesta ordem:

| Ordem | Tipo | Exemplo |
|---|---|---|
| 1 | posicionais, com ou sem padrão | `curso`, `vagas=30` |
| 2 | o recolhedor de posicionais | `*alunos` |
| 3 | os que só aceitam nome | `turno="dia"` |
| 4 | o recolhedor de nomeados | `**opcoes` |

Tudo o que vem **depois** de `*alunos` só pode ser passado pelo nome, porque o `*alunos` já engoliu todos os posicionais. É assim que o `sep` do `print` funciona.

#### Os dois erros comuns

**`**kwargs` antes de outro parâmetro.** Nada pode vir depois do recolhedor de nomeados:

```python
def inscrever(curso, **opcoes, *alunos):
```

```
SyntaxError: arguments cannot follow var-keyword argument
```

**Um parâmetro com padrão antes de `*args`.** Ele não é pulado: o primeiro argumento vai para ele.

```python
def juntar(sep=" ", *palavras):
    return sep.join(palavras)


juntar("bom", "dia")   # 'dia': sep recebeu "bom"
```

A correção é pôr `sep` **depois** de `*palavras`, onde ele só pode ser passado pelo nome: `def juntar(*palavras, sep=" ")`.

## Passo 2 · Previsão · Quem recebe o quê

A função `mostrar` tem todos os tipos de parâmetro. Ela é chamada de quatro jeitos, dois deles com `*` e `**` na **chamada**: `*lista` espalha os itens da lista como argumentos posicionais, e `**dicionario` espalha os pares como argumentos nomeados. Leia sem executar e digite exatamente o que o programa imprime.

### Código
```python
def mostrar(a, b=0, *resto, sep="-", **extras):
    print(a, b, resto, sep, extras)


mostrar(1)
mostrar(1, 2, 3, 4)
mostrar(*[5, 6], sep="+", cor="azul")
dados = {"a": 7, "sep": "/"}
mostrar(**dados)
```

### Dicas
1. Os posicionais preenchem `a` e `b` primeiro; só o que sobra vai para `resto`, que é uma tupla.
2. `*[5, 6]` equivale a escrever `mostrar(5, 6, ...)`.
3. `**dados` equivale a `mostrar(a=7, sep="/")`. Um nome que existe como parâmetro não vai para `extras`.

### Saída esperada
```text
1 0 () - {}
1 2 (3, 4) - {}
5 6 () + {'cor': 'azul'}
7 0 () / {}
```

## Passo 3 · Exercício · media com quantas notas vierem
modo: ordenar

Monte `media(*notas, casas=1)`: ela recebe quantas notas vierem, separadas por vírgula, e devolve a média arredondada para `casas` casas decimais. Sem nenhuma nota, devolve `None`.

```python
media(7, 8, 10)            # 8.3
media(7, 8, 10, casas=2)   # 8.33
media()                    # None
```

Arraste as linhas e ajuste a indentação. Uma linha está sobrando.

### Instruções
1. Recolha as notas com um parâmetro de asterisco e deixe `casas` depois dele, só por nome.
2. Sem notas, devolva `None`.
3. Com notas, devolva a média arredondada para `casas` casas.

### Solução
```python
def media(*notas, casas=1):
    if not notas:
        return None
    return round(sum(notas) / len(notas), casas)
```

### Distratores
```python
def media(casas=1, *notas):
```

### Verificação
```json
[
  { "id": "tres", "checkpoint": 1, "kind": "call", "function": "media", "args": [7, 8, 10], "expected": 8.3, "tolerance": 1e-9,
    "name": "media(7, 8, 10) é 8.3", "hint": "As notas chegam todas no parâmetro com asterisco." },
  { "id": "uma", "checkpoint": 1, "kind": "call", "function": "media", "args": [9], "expected": 9.0, "tolerance": 1e-9,
    "name": "media(9) é 9.0" },
  { "id": "desempacota", "checkpoint": 1, "kind": "expr", "setup": "notas = [6, 7, 8, 5]", "expr": "media(*notas)", "expected": 6.5,
    "tolerance": 1e-9, "name": "media(*lista) espalha a lista em notas" },
  { "id": "vazia", "checkpoint": 2, "kind": "call", "function": "media", "args": [], "expected": null, "type": "NoneType",
    "name": "media() sem notas é None", "hint": "Uma tupla vazia é falsa." },
  { "id": "casas", "checkpoint": 3, "kind": "call", "function": "media", "args": [7, 8, 10], "kwargs": { "casas": 2 }, "expected": 8.33,
    "tolerance": 1e-9, "name": "media(7, 8, 10, casas=2) é 8.33" },
  { "id": "casas-zero", "checkpoint": 3, "kind": "call", "function": "media", "args": [4, 5], "kwargs": { "casas": 0 }, "expected": 4.0,
    "tolerance": 1e-9, "name": "media(4, 5, casas=0) é 4.0" }
]
```

### Soluções erradas
```python name="casas antes de *notas"
def media(casas=1, *notas):
    if not notas:
        return None
    return round(sum(notas) / len(notas), casas)
```
```python name="recebe uma lista em vez de várias notas"
def media(notas, casas=1):
    if not notas:
        return None
    return round(sum(notas) / len(notas), casas)
```
```python name="sem notas devolve 0"
def media(*notas, casas=1):
    if not notas:
        return 0
    return round(sum(notas) / len(notas), casas)
```
```python name="ignora casas"
def media(*notas, casas=1):
    if not notas:
        return None
    return sum(notas) / len(notas)
```

## Passo 4 · Exercício · montar_url com **parametros

Um sistema de busca da biblioteca monta endereços com filtros opcionais:

```python
montar_url("https://acervo.exemplo.br/busca", autor="Machado", ano=1899)
# 'https://acervo.exemplo.br/busca?ano=1899&autor=Machado'
```

Escreva `montar_url(base, **parametros)`. As regras:

- cada parâmetro vira `nome=valor`, e os pares são unidos por `&`, depois de um `?`;
- os pares saem em **ordem alfabética** do nome, para que a mesma busca gere sempre o mesmo endereço;
- parâmetros com valor `None` são ignorados (o filtro não foi preenchido);
- sem nenhum parâmetro útil, devolve só a `base`, sem `?`.

### Instruções
1. Recolha os filtros num parâmetro de dois asteriscos e monte `nome=valor` com o valor convertido para texto.
2. Junte os pares com `&`, em ordem alfabética do nome, depois de `?`.
3. Ignore os valores `None`; sem pares, devolva só a base.

### Código inicial
```python
def montar_url(base, parametros):
    pass
```

### Solução
```python
def montar_url(base, **parametros):
    pares = [f"{nome}={valor}" for nome, valor in sorted(parametros.items()) if valor is not None]
    if not pares:
        return base
    return base + "?" + "&".join(pares)
```

### Dicas
1. `parametros` é um dicionário comum: `sorted(parametros.items())` dá os pares em ordem de nome.
2. Teste `valor is not None`, e não só `valor`: `0` e `False` são filtros válidos.
3. Decida o `?` depois de saber se sobrou algum par.

### Verificação
```json
[
  { "id": "dois", "checkpoint": 1, "kind": "call", "function": "montar_url", "args": ["https://acervo.exemplo.br/busca"],
    "kwargs": { "autor": "Machado", "ano": 1899 }, "expected": "https://acervo.exemplo.br/busca?ano=1899&autor=Machado", "type": "str",
    "name": "Dois filtros, em ordem alfabética", "hint": "Os valores precisam virar texto." },
  { "id": "um", "checkpoint": 1, "kind": "call", "function": "montar_url", "args": ["/notas"], "kwargs": { "turma": "B" },
    "expected": "/notas?turma=B", "name": "Um filtro só" },
  { "id": "ordem", "checkpoint": 2, "kind": "call", "function": "montar_url", "args": ["/busca"],
    "kwargs": { "q": "python", "pagina": 2, "idioma": "pt" }, "expected": "/busca?idioma=pt&pagina=2&q=python",
    "name": "Três filtros saem em ordem alfabética", "hint": "Ordene pelo nome do parâmetro." },
  { "id": "desempacota", "checkpoint": 2, "kind": "expr", "setup": "filtros = {\"curso\": \"BCC\", \"ano\": 2026}",
    "expr": "montar_url(\"/alunos\", **filtros)", "expected": "/alunos?ano=2026&curso=BCC",
    "name": "Aceita um dicionário espalhado com **" },
  { "id": "sem", "checkpoint": 3, "kind": "call", "function": "montar_url", "args": ["/inicio"], "expected": "/inicio",
    "name": "Sem filtros, só a base, sem ?", "hint": "Só acrescente ? quando houver pares." },
  { "id": "none", "checkpoint": 3, "kind": "call", "function": "montar_url", "args": ["/busca"],
    "kwargs": { "autor": null, "q": "dom casmurro" }, "expected": "/busca?q=dom casmurro",
    "name": "Filtros com None são ignorados" },
  { "id": "todos-none", "checkpoint": 3, "kind": "call", "function": "montar_url", "args": ["/busca"],
    "kwargs": { "autor": null, "ano": null }, "expected": "/busca", "name": "Só filtros None: só a base" },
  { "id": "zero", "checkpoint": 3, "kind": "call", "function": "montar_url", "args": ["/estoque"],
    "kwargs": { "minimo": 0, "ativo": false }, "expected": "/estoque?ativo=False&minimo=0",
    "name": "0 e False são filtros válidos", "hint": "Compare com None, não use o valor como condição." }
]
```

### Soluções erradas
```python name="não ordena os pares"
def montar_url(base, **parametros):
    pares = [f"{nome}={valor}" for nome, valor in parametros.items() if valor is not None]
    if not pares:
        return base
    return base + "?" + "&".join(pares)
```
```python name="põe ? mesmo sem filtros"
def montar_url(base, **parametros):
    pares = [f"{nome}={valor}" for nome, valor in sorted(parametros.items()) if valor is not None]
    return base + "?" + "&".join(pares)
```
```python name="não ignora None"
def montar_url(base, **parametros):
    pares = [f"{nome}={valor}" for nome, valor in sorted(parametros.items())]
    if not pares:
        return base
    return base + "?" + "&".join(pares)
```
```python name="descarta 0 e False junto com None"
def montar_url(base, **parametros):
    pares = [f"{nome}={valor}" for nome, valor in sorted(parametros.items()) if valor]
    if not pares:
        return base
    return base + "?" + "&".join(pares)
```

## Passo 5 · Leitura · Repassar argumentos e forçar nomes

#### Repassar com * e **

Uma função que recebe argumentos para entregar a outra os recolhe com `*args, **kwargs` e os **espalha** de volta na chamada:

```python
def aplicar(funcao, *args, **kwargs):
    return funcao(*args, **kwargs)


aplicar(round, 3.14159, ndigits=2)   # round(3.14159, ndigits=2) → 3.14
```

O erro clássico é esquecer os asteriscos na chamada. `funcao(args)` passa **a tupla inteira** como um único argumento: `aplicar(pow, 2, 3)` viraria `pow((2, 3))`, e o `pow` reclama que falta o segundo número. Na definição, o `*` recolhe; na chamada, o `*` espalha. O mesmo vale para `**`: só espalha dicionários com chaves de texto, porque viram nomes de parâmetros. `f(**{1: "a"})` dá `TypeError: keywords must be strings`.

#### Parâmetros que só aceitam nome: *

Considere `criar_usuario("ana", True)`. Quem lê não sabe o que é esse `True`. Um `*` sozinho na definição obriga quem chama a escrever o nome de tudo o que vem depois:

```python
def criar_usuario(nome, *, admin=False):
    ...


criar_usuario("ana", admin=True)   # claro
criar_usuario("ana", True)
```

```
TypeError: criar_usuario() takes 1 positional argument but 2 were given
```

Use em opções booleanas e em parâmetros fáceis de trocar de lugar.

#### Parâmetros que só aceitam posição: /

O contrário também existe. Tudo antes de uma `/` só pode ser passado por posição:

```python
def criar_usuario(nome, /, *, admin=False):
    ...


criar_usuario(nome="ana")
```

```
TypeError: criar_usuario() got some positional-only arguments passed as keyword arguments: 'nome'
```

Isso deixa o autor livre para renomear o parâmetro sem quebrar quem chama, e permite que `**extras` aceite uma chave chamada `nome` sem conflito. Várias funções embutidas são assim: `len(obj=[1])` dá erro.

#### Curiosidade: inspect.signature

O módulo `inspect` mostra a assinatura de qualquer função, com `*` e `/` incluídos:

```python
import inspect

print(inspect.signature(criar_usuario))   # (nome, /, *, admin=False)
```

## Passo 6 · Exercício · aplicar_em_lote e criar_usuario

Duas funções que usam o que a leitura mostrou:

- `aplicar_em_lote(funcao, lista_de_args, **comuns)` chama `funcao` uma vez para cada tupla de `lista_de_args`, espalhando a tupla como argumentos posicionais e repassando os mesmos argumentos nomeados `comuns` em todas as chamadas. Devolve a lista de resultados.

```python
aplicar_em_lote(pow, [(2, 3), (5, 2)])                     # [8, 25]
aplicar_em_lote(round, [(3.14159,), (2.71828,)], ndigits=2)  # [3.14, 2.72]
```

- `criar_usuario(nome, /, *, admin=False, **extras)` devolve um dicionário com `"nome"`, `"admin"` e todos os extras. `nome` só por posição; `admin` só por nome.

```python
criar_usuario("bia", admin=True, curso="BCC")
# {'nome': 'bia', 'admin': True, 'curso': 'BCC'}
```

### Instruções
1. `aplicar_em_lote` chama `funcao` com os itens de cada tupla espalhados como argumentos posicionais e devolve a lista dos resultados.
2. `aplicar_em_lote` repassa os argumentos nomeados `comuns` a todas as chamadas.
3. `criar_usuario` devolve o dicionário com `nome`, `admin` e os extras.
4. Em `criar_usuario`, `admin` só pode ser passado pelo nome e `nome` só pela posição.

### Código inicial
```python
def aplicar_em_lote(funcao, lista_de_args):
    pass


def criar_usuario(nome, admin=False):
    pass
```

### Solução
```python
def aplicar_em_lote(funcao, lista_de_args, **comuns):
    return [funcao(*argumentos, **comuns) for argumentos in lista_de_args]


def criar_usuario(nome, /, *, admin=False, **extras):
    return {"nome": nome, "admin": admin, **extras}
```

### Dicas
1. `funcao(argumentos)` passaria a tupla inteira como um único argumento.
2. `{"a": 1, **outro}` monta um dicionário novo com as chaves de `outro` incluídas.
3. Na assinatura de `criar_usuario`, a `/` vem logo depois de `nome` e o `*` antes de `admin`.

### Verificação
```json
[
  { "id": "lote-pow", "checkpoint": 1, "kind": "expr", "expr": "aplicar_em_lote(pow, [(2, 3), (5, 2), (10, 0)])", "expected": [8, 25, 1],
    "name": "aplicar_em_lote(pow, ...) espalha cada tupla", "hint": "Espalhe a tupla com * na chamada." },
  { "id": "lote-um", "checkpoint": 1, "kind": "expr", "expr": "aplicar_em_lote(len, [(\"Ana\",), ([1, 2],)])", "expected": [3, 2],
    "name": "Tuplas de um item só" },
  { "id": "lote-vazio", "checkpoint": 1, "kind": "expr", "expr": "aplicar_em_lote(max, [])", "expected": [],
    "name": "Lista vazia, nenhuma chamada" },
  { "id": "lote-comuns", "checkpoint": 2, "kind": "expr", "expr": "aplicar_em_lote(round, [(3.14159,), (2.71828,)], ndigits=2)",
    "expected": [3.14, 2.72], "tolerance": 1e-9,
    "name": "Repassa ndigits=2 a todas as chamadas", "hint": "Recolha com ** e espalhe com ** na chamada." },
  { "id": "lote-sorted", "checkpoint": 2, "kind": "expr", "expr": "aplicar_em_lote(sorted, [([3, 1, 2],), ([\"b\", \"a\"],)], reverse=True)",
    "expected": [[3, 2, 1], ["b", "a"]], "name": "sorted com reverse=True em todas" },
  { "id": "usuario", "checkpoint": 3, "kind": "expr", "expr": "criar_usuario(\"ana\")", "expected": { "nome": "ana", "admin": false },
    "name": "criar_usuario(\"ana\") tem admin False" },
  { "id": "usuario-extras", "checkpoint": 3, "kind": "expr", "expr": "criar_usuario(\"bia\", admin=True, curso=\"BCC\", ano=2)",
    "expected": { "nome": "bia", "admin": true, "curso": "BCC", "ano": 2 },
    "name": "Os extras entram no dicionário", "hint": "Recolha os extras com ** e junte-os ao dicionário." },
  { "id": "admin-posicional", "checkpoint": 4, "kind": "expr", "expr": "criar_usuario(\"ana\", True)", "raises": "TypeError",
    "name": "admin passado por posição é recusado", "hint": "Um * na assinatura obriga o nome dos parâmetros seguintes." },
  { "id": "nome-nomeado", "checkpoint": 4, "kind": "expr", "expr": "criar_usuario(nome=\"ana\")", "raises": "TypeError",
    "name": "nome passado pelo nome é recusado", "hint": "Uma / na assinatura obriga a posição dos parâmetros anteriores." }
]
```

### Soluções erradas
```python name="passa a tupla sem espalhar"
def aplicar_em_lote(funcao, lista_de_args, **comuns):
    return [funcao(argumentos, **comuns) for argumentos in lista_de_args]


def criar_usuario(nome, /, *, admin=False, **extras):
    return {"nome": nome, "admin": admin, **extras}
```
```python name="não repassa os argumentos comuns"
def aplicar_em_lote(funcao, lista_de_args, **comuns):
    return [funcao(*argumentos) for argumentos in lista_de_args]


def criar_usuario(nome, /, *, admin=False, **extras):
    return {"nome": nome, "admin": admin, **extras}
```
```python name="admin aceita posição"
def aplicar_em_lote(funcao, lista_de_args, **comuns):
    return [funcao(*argumentos, **comuns) for argumentos in lista_de_args]


def criar_usuario(nome, /, admin=False, **extras):
    return {"nome": nome, "admin": admin, **extras}
```
```python name="nome aceita ser passado pelo nome"
def aplicar_em_lote(funcao, lista_de_args, **comuns):
    return [funcao(*argumentos, **comuns) for argumentos in lista_de_args]


def criar_usuario(nome, *, admin=False, **extras):
    return {"nome": nome, "admin": admin, **extras}
```
```python name="esquece os extras"
def aplicar_em_lote(funcao, lista_de_args, **comuns):
    return [funcao(*argumentos, **comuns) for argumentos in lista_de_args]


def criar_usuario(nome, /, *, admin=False, **extras):
    return {"nome": nome, "admin": admin}
```

## Passo 7 · Quiz · Assinaturas

### Pergunta
Qual destas definições é válida em Python?
- [ ] `def f(**opcoes, *itens):`
- [ ] `def f(*itens, **opcoes, limite=10):`
- [x] `def f(base, *itens, limite=10, **opcoes):`
- [ ] `def f(*itens, base, **opcoes, /):`
> A ordem é: posicionais, `*itens`, os que só aceitam nome, `**opcoes`. Nada pode vir depois de `**opcoes`, e a `/` só pode aparecer antes do `*`.

### Pergunta
O que `registrar("erro", "disco", "cheio")` devolve?
```python
def registrar(nivel, *partes):
    return juntar(partes)


def juntar(*textos):
    return len(textos)
```
- [ ] `3`
- [ ] `2`
- [x] `1`
- [ ] `0`
> `juntar(partes)` passa a tupla `("disco", "cheio")` como **um** argumento, então `textos` é uma tupla com um item só. Para repassar os itens, a chamada precisa espalhar: `juntar(*partes)`, que daria 2.

### Pergunta
Com `def agendar(dia, *, hora=8):`, qual chamada funciona?
- [ ] `agendar("segunda", 10)`
- [x] `agendar("segunda", hora=10)`
- [ ] `agendar(hora=10)`
- [ ] `agendar("segunda", 10, hora=10)`
> O `*` sozinho obriga `hora` a ser passada pelo nome. `agendar("segunda", 10)` dá `TypeError: agendar() takes 1 positional argument but 2 were given`, e `agendar(hora=10)` esquece o `dia`, que é obrigatório.
