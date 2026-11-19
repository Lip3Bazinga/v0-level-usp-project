---
slug: n2-m4-03-json
titulo: 'JSON: dados estruturados'
descricao: Serializar e desserializar com json.dumps, loads, dump e load; tipos suportados e indentação.
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
- Converter entre dicionários/listas e texto JSON com dumps/loads e arquivos com dump/load
- Mapear os tipos do JSON para os do Python e tratar o que não é serializável
- Persistir o estado de um programa em um arquivo JSON e recarregá-lo
---

## Passo 1 · Leitura · Um formato que todo programa entende

Um arquivo com um item por linha guarda bem uma lista de textos. Mas o estado de um programa costuma ser mais rico: uma lista de tarefas, cada uma com título, prazo, se está feita e as etiquetas. Inventar um formato próprio para isso dá trabalho e quebra fácil. O formato que o mundo inteiro adotou é o **JSON** (*JavaScript Object Notation*): é o que as APIs da web devolvem, o que muitos programas usam como arquivo de configuração e o que você vai usar para salvar dados estruturados.

JSON é texto, e se parece muito com dicionários e listas do Python:

```text
{"titulo": "Lista de cálculo", "feita": false, "prazo": null, "notas": [7.5, 9]}
```

O módulo `json` converte nos dois sentidos. Converter um objeto Python em texto se chama **serializar**; o caminho de volta, **desserializar**.

| Função | De | Para |
|---|---|---|
| `json.dumps(obj)` | objeto Python | texto (*dump string*) |
| `json.loads(texto)` | texto | objeto Python (*load string*) |
| `json.dump(obj, arquivo)` | objeto Python | arquivo aberto para escrita |
| `json.load(arquivo)` | arquivo aberto para leitura | objeto Python |

O `s` do fim é de *string*: com `s`, trabalha com texto; sem `s`, com arquivo.

#### Os tipos de cada lado

| Python | JSON |
|---|---|
| `dict` | objeto `{...}` (chaves sempre texto) |
| `list` e `tuple` | lista `[...]` |
| `str` | texto, **sempre** com aspas duplas |
| `int` e `float` | número |
| `True` / `False` | `true` / `false` |
| `None` | `null` |

A tabela tem consequências na volta: uma tupla volta como **lista**, e uma chave numérica volta como **texto** (`{2025: "x"}` vira `{"2025": "x"}`).

#### O erro comum: JSON com aspas simples

`json.loads("{'nome': 'Ana'}")` falha, porque o JSON só aceita aspas duplas:

```
json.decoder.JSONDecodeError: Expecting property name enclosed in double quotes: line 1 column 2 (char 1)
```

Isso acontece quando alguém escreve o arquivo à mão, ou grava `str(dicionario)` em vez de `json.dumps(dicionario)`. O `str` produz a representação do Python, que **parece** JSON mas não é.

## Passo 2 · Previsão · Ida e volta

O programa serializa um dicionário com uma tupla, um booleano, um `None` e uma chave numérica, e depois o desserializa. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import json

aluno = {"nome": "Ana", "notas": (7, 9), "bolsista": True, "apelido": None, 2025: "ingresso"}
texto = json.dumps(aluno)
print(texto)
volta = json.loads(texto)
print(volta["notas"], volta["2025"])
print(volta == aluno)
```

### Dicas
1. Use a tabela de tipos: `True`, `None` e a tupla mudam de cara no texto JSON.
2. Toda chave de objeto JSON é texto.
3. A volta não reconstrói a tupla nem a chave `2025` como número.

### Saída esperada
```text
{"nome": "Ana", "notas": [7, 9], "bolsista": true, "apelido": null, "2025": "ingresso"}
[7, 9] ingresso
False
```

## Passo 3 · Exercício · Salvar e carregar as tarefas
modo: lacunas

Uma lista de tarefas precisa sobreviver entre uma execução e outra. Complete as quatro lacunas (`___`) para que:

- `salvar_tarefas(caminho, tarefas)` grave a lista em JSON legível, indentado com 2 espaços e com os acentos escritos como acentos;
- `carregar_tarefas(caminho)` devolva a lista salva, ou uma lista vazia se o arquivo ainda não existir.

Por padrão, `json.dump` troca cada letra acentuada por um código: `"Revisão"` vira `"Revis\u00e3o"`. Funciona, mas o arquivo fica ilegível para quem o abre. `ensure_ascii=False` grava o acento como ele é.

### Instruções
1. Em `salvar_tarefas`, use `json.dump` passando o arquivo aberto, com `ensure_ascii=False` e `indent=2`.
2. Em `carregar_tarefas`, devolva o conteúdo lido do arquivo com a função do `json` que lê de arquivo.
3. Se o arquivo não existir, `carregar_tarefas` devolve `[]`.

### Código inicial
```python
import json


def salvar_tarefas(caminho, tarefas):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(tarefas, ___, ensure_ascii=___, indent=2)


def carregar_tarefas(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            return json.___(arquivo)
    except ___:
        return []
```

### Solução
```python
import json


def salvar_tarefas(caminho, tarefas):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(tarefas, arquivo, ensure_ascii=False, indent=2)


def carregar_tarefas(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            return json.load(arquivo)
    except FileNotFoundError:
        return []
```

### Dicas
1. `json.dump` precisa saber **onde** escrever: o segundo argumento é o arquivo.
2. Para ler de um arquivo aberto, a função não tem `s` no nome.
3. Qual exceção o `open` levanta quando o arquivo não existe?

### Verificação
```json
[
  { "id": "texto", "checkpoint": 1, "kind": "expr",
    "setup": "salvar_tarefas(\"t.json\", [{\"titulo\": \"Revisão de cálculo\", \"feita\": False}])",
    "expr": "open(\"t.json\", encoding=\"utf-8\").read()",
    "expected": "[\n  {\n    \"titulo\": \"Revisão de cálculo\",\n    \"feita\": false\n  }\n]",
    "name": "O arquivo é JSON indentado com 2 espaços e acentos legíveis", "hint": "Passe ensure_ascii=False e indent=2 para o json.dump." },
  { "id": "ida-e-volta", "checkpoint": 2, "kind": "expr",
    "setup": "tarefas = [{\"titulo\": \"Ler capítulo 3\", \"feita\": True, \"prazo\": None, \"tags\": [\"física\", \"leitura\"]}, {\"titulo\": \"Lista 2\", \"feita\": False, \"prazo\": \"2025-04-10\", \"tags\": []}]\nsalvar_tarefas(\"v.json\", tarefas)\nvolta = carregar_tarefas(\"v.json\")",
    "expr": "[volta == tarefas, type(volta).__name__]", "expected": [true, "list"],
    "name": "Salvar e carregar devolve a mesma lista", "hint": "carregar_tarefas devolve o objeto Python, não o texto." },
  { "id": "le-arquivo", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"pronto.json\", \"w\", encoding=\"utf-8\") as f:\n    f.write('[{\"titulo\": \"Comprar café\", \"feita\": false}, {\"titulo\": \"Pagar R$ 12\", \"feita\": true}]')",
    "expr": "carregar_tarefas(\"pronto.json\")", "expected": [{ "titulo": "Comprar café", "feita": false }, { "titulo": "Pagar R$ 12", "feita": true }],
    "name": "Carrega um arquivo JSON escrito por outro programa" },
  { "id": "inexistente", "checkpoint": 3, "kind": "call", "function": "carregar_tarefas", "args": ["nunca-salvo.json"],
    "expected": [], "type": "list", "name": "Arquivo que não existe dá lista vazia", "hint": "Trate só a exceção de arquivo não encontrado." },
  { "id": "encoding", "checkpoint": 1, "kind": "expr",
    "setup": "_open_real = open\n_abertos = []\ndef open(*args, **kwargs):\n    arquivo = _open_real(*args, **kwargs)\n    _abertos.append((str(kwargs.get(\"encoding\")).lower().replace(\"-\", \"\"), arquivo))\n    return arquivo\nsalvar_tarefas(\"e.json\", [])\ncarregar_tarefas(\"e.json\")",
    "expr": "[len(_abertos), sorted(set(e for e, a in _abertos)), all(a.closed for e, a in _abertos)]",
    "expected": [2, ["utf8"], true], "name": "Abre com encoding utf-8 e fecha o arquivo" }
]
```

### Soluções erradas
```python name="acentos viram códigos (ensure_ascii padrão)"
import json


def salvar_tarefas(caminho, tarefas):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(tarefas, arquivo, indent=2)


def carregar_tarefas(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            return json.load(arquivo)
    except FileNotFoundError:
        return []
```
```python name="json.dump sem o arquivo"
import json


def salvar_tarefas(caminho, tarefas):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(tarefas)


def carregar_tarefas(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            return json.load(arquivo)
    except FileNotFoundError:
        return []
```
```python name="carrega o texto em vez do objeto"
import json


def salvar_tarefas(caminho, tarefas):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(tarefas, arquivo, ensure_ascii=False, indent=2)


def carregar_tarefas(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            return arquivo.read()
    except FileNotFoundError:
        return []
```
```python name="grava str() em vez de JSON"
import json


def salvar_tarefas(caminho, tarefas):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        arquivo.write(str(tarefas))


def carregar_tarefas(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            return json.load(arquivo)
    except FileNotFoundError:
        return []
```
```python name="não trata o arquivo inexistente"
import json


def salvar_tarefas(caminho, tarefas):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        json.dump(tarefas, arquivo, ensure_ascii=False, indent=2)


def carregar_tarefas(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        return json.load(arquivo)
```

## Passo 4 · Leitura · O que não vira JSON

A tabela de tipos do passo 1 é a lista completa. Qualquer outra coisa faz o `json.dumps` desistir:

```python
from datetime import date

json.dumps({"prova": date(2025, 6, 20)})
```

```
TypeError: Object of type date is not JSON serializable
```

O mesmo vale para conjuntos (`Object of type set is not JSON serializable`) e para objetos das suas classes, inclusive dataclasses. Não existe conversão automática porque o JSON não tem como dizer, na volta, que aquele texto era uma data ou aquela lista era um conjunto.

#### Converta na ida, reconstrua na volta

A solução é você decidir a representação. Para uma dataclass, `asdict` (do módulo `dataclasses`) faz o primeiro passo: devolve um dicionário com os campos. Depois, troque o que o JSON não conhece:

| Python | Na ida | Na volta |
|---|---|---|
| `date` | `data.isoformat()` → `"2025-06-20"` | `date.fromisoformat(texto)` |
| `set` | `sorted(conjunto)` → lista ordenada | `set(lista)` |
| dataclass | `asdict(objeto)` → `dict` | `Classe(**dicionario)` |

```python
from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class Prova:
    materia: str
    data: date


p = Prova("Cálculo", date(2025, 6, 20))
d = asdict(p)                       # {'materia': 'Cálculo', 'data': date(...)}
d["data"] = p.data.isoformat()
texto = json.dumps(d, ensure_ascii=False)

volta = json.loads(texto)
volta["data"] = date.fromisoformat(volta["data"])
p2 = Prova(**volta)                 # p2 == p
```

`Prova(**volta)` desempacota o dicionário em argumentos nomeados: é o mesmo que `Prova(materia=..., data=...)`.

O formato `AAAA-MM-DD` (ISO 8601) é o padrão para datas em JSON: qualquer linguagem o entende, e textos nesse formato ficam em ordem cronológica quando ordenados. Para o conjunto, `sorted` em vez de `list` deixa o arquivo igual a cada gravação, o que facilita comparar versões.

#### O erro comum: carregar e esquecer de reconstruir

`json.load` devolve só dicionários, listas e textos. Se você carregar e usar direto, `volta["data"]` é o texto `"2025-06-20"`, e uma conta como `volta["data"] - date.today()` quebra longe dali, com `TypeError: unsupported operand type(s) for -: 'str' and 'datetime.date'`. Reconstrua os objetos logo depois de carregar.

O atalho `json.dumps(obj, default=str)` converte o que não é serializável com `str`. Para datas o resultado coincide com o ISO, mas um conjunto vira o texto `"{'a', 'b'}"`, que nunca mais volta a ser conjunto.

## Passo 5 · Exercício · Eventos do calendário

O calendário da semana acadêmica guarda cada evento numa dataclass com uma data e um conjunto de etiquetas. Escreva as duas conversões:

- `evento_para_json(evento)` devolve um **texto** JSON com as chaves `nome`, `data`, `vagas` e `tags`: a data no formato `AAAA-MM-DD`, as etiquetas como lista em ordem alfabética, e os acentos legíveis;
- `evento_de_json(texto)` faz o caminho inverso e devolve um `Evento` com `data` do tipo `date` e `tags` do tipo `set`.

```python
e = Evento("Semana da Física", date(2025, 10, 6), 120, {"palestra", "aberto"})
evento_para_json(e)
# '{"nome": "Semana da Física", "data": "2025-10-06", "vagas": 120, "tags": ["aberto", "palestra"]}'
evento_de_json(evento_para_json(e)) == e   # True
```

### Instruções
1. Em `evento_para_json`, converta o evento em dicionário com `asdict` e troque `data` pelo texto ISO e `tags` pela lista ordenada.
2. Devolva o texto com `json.dumps` e `ensure_ascii=False`.
3. Em `evento_de_json`, desserialize o texto, reconstrua `data` com `date.fromisoformat` e `tags` como conjunto, e devolva um `Evento`.

### Código inicial
```python
import json
from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class Evento:
    nome: str
    data: date
    vagas: int
    tags: set


def evento_para_json(evento):
    pass


def evento_de_json(texto):
    pass
```

### Solução
```python
import json
from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class Evento:
    nome: str
    data: date
    vagas: int
    tags: set


def evento_para_json(evento):
    dados = asdict(evento)
    dados["data"] = evento.data.isoformat()
    dados["tags"] = sorted(evento.tags)
    return json.dumps(dados, ensure_ascii=False)


def evento_de_json(texto):
    dados = json.loads(texto)
    dados["data"] = date.fromisoformat(dados["data"])
    dados["tags"] = set(dados["tags"])
    return Evento(**dados)
```

### Dicas
1. `asdict(evento)` ainda tem a `date` e o `set` dentro: troque os dois antes do `dumps`.
2. `sorted(conjunto)` devolve uma lista ordenada.
3. `Evento(**dados)` cria o evento a partir do dicionário, desde que as chaves sejam os nomes dos campos.

### Verificação
```json
[
  { "id": "estrutura", "checkpoint": 1, "kind": "expr",
    "setup": "e = Evento(\"Feira de Ciências\", date(2025, 11, 3), 40, {\"palestra\", \"ciência\", \"aberto\"})",
    "expr": "json.loads(evento_para_json(e))",
    "expected": { "nome": "Feira de Ciências", "data": "2025-11-03", "vagas": 40, "tags": ["aberto", "ciência", "palestra"] },
    "name": "Data em AAAA-MM-DD e tags como lista ordenada", "hint": "Use isoformat() na data e sorted() no conjunto." },
  { "id": "texto", "checkpoint": 2, "kind": "expr",
    "setup": "t = evento_para_json(Evento(\"Mostra de Música\", date(2026, 1, 9), 0, set()))",
    "expr": "[type(t).__name__, \"Música\" in t, json.loads(t)[\"tags\"]]", "expected": ["str", true, []],
    "name": "Devolve um texto JSON com os acentos legíveis", "hint": "dumps devolve texto; ensure_ascii=False mantém o acento." },
  { "id": "volta-tipos", "checkpoint": 3, "kind": "expr",
    "setup": "e = evento_de_json('{\"nome\": \"Oficina de Python\", \"data\": \"2025-08-15\", \"vagas\": 25, \"tags\": [\"prática\", \"iniciante\"]}')",
    "expr": "[type(e).__name__, e.nome, type(e.data).__name__, e.data.month, e.data.day, type(e.tags).__name__, sorted(e.tags), e.vagas]",
    "expected": ["Evento", "Oficina de Python", "date", 8, 15, "set", ["iniciante", "prática"], 25],
    "name": "evento_de_json reconstrói Evento com date e set", "hint": "Depois do loads, data é texto e tags é lista: converta os dois." },
  { "id": "ida-e-volta", "checkpoint": 3, "kind": "expr",
    "setup": "e = Evento(\"Café com Ciência\", date(2025, 12, 31), 15, {\"debate\", \"café\"})",
    "expr": "evento_de_json(evento_para_json(e)) == e", "expected": true,
    "name": "Ida e volta devolve um evento igual ao original" },
  { "id": "conta-com-data", "checkpoint": 3, "kind": "expr",
    "setup": "e = evento_de_json(evento_para_json(Evento(\"Prova\", date(2025, 6, 20), 30, {\"cálculo\"})))",
    "expr": "(e.data - date(2025, 6, 1)).days", "expected": 19,
    "name": "A data reconstruída funciona em contas com datas" }
]
```

### Soluções erradas
```python name="dumps direto do asdict"
import json
from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class Evento:
    nome: str
    data: date
    vagas: int
    tags: set


def evento_para_json(evento):
    return json.dumps(asdict(evento), ensure_ascii=False)


def evento_de_json(texto):
    dados = json.loads(texto)
    dados["data"] = date.fromisoformat(dados["data"])
    dados["tags"] = set(dados["tags"])
    return Evento(**dados)
```
```python name="atalho default=str"
import json
from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class Evento:
    nome: str
    data: date
    vagas: int
    tags: set


def evento_para_json(evento):
    return json.dumps(asdict(evento), ensure_ascii=False, default=str)


def evento_de_json(texto):
    dados = json.loads(texto)
    dados["data"] = date.fromisoformat(dados["data"])
    dados["tags"] = set(dados["tags"])
    return Evento(**dados)
```
```python name="data no formato brasileiro"
import json
from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class Evento:
    nome: str
    data: date
    vagas: int
    tags: set


def evento_para_json(evento):
    dados = asdict(evento)
    dados["data"] = evento.data.strftime("%d/%m/%Y")
    dados["tags"] = sorted(evento.tags)
    return json.dumps(dados, ensure_ascii=False)


def evento_de_json(texto):
    dados = json.loads(texto)
    dados["data"] = date.fromisoformat(dados["data"])
    dados["tags"] = set(dados["tags"])
    return Evento(**dados)
```
```python name="carrega e não reconstrói"
import json
from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class Evento:
    nome: str
    data: date
    vagas: int
    tags: set


def evento_para_json(evento):
    dados = asdict(evento)
    dados["data"] = evento.data.isoformat()
    dados["tags"] = sorted(evento.tags)
    return json.dumps(dados, ensure_ascii=False)


def evento_de_json(texto):
    return Evento(**json.loads(texto))
```
```python name="tags voltam como lista"
import json
from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class Evento:
    nome: str
    data: date
    vagas: int
    tags: set


def evento_para_json(evento):
    dados = asdict(evento)
    dados["data"] = evento.data.isoformat()
    dados["tags"] = sorted(evento.tags)
    return json.dumps(dados, ensure_ascii=False)


def evento_de_json(texto):
    dados = json.loads(texto)
    dados["data"] = date.fromisoformat(dados["data"])
    return Evento(**dados)
```
```python name="acentos viram códigos"
import json
from dataclasses import dataclass, asdict
from datetime import date


@dataclass
class Evento:
    nome: str
    data: date
    vagas: int
    tags: set


def evento_para_json(evento):
    dados = asdict(evento)
    dados["data"] = evento.data.isoformat()
    dados["tags"] = sorted(evento.tags)
    return json.dumps(dados)


def evento_de_json(texto):
    dados = json.loads(texto)
    dados["data"] = date.fromisoformat(dados["data"])
    dados["tags"] = set(dados["tags"])
    return Evento(**dados)
```

## Passo 6 · Leitura · Carregar, alterar, salvar

Um programa que guarda estado em JSON segue sempre o mesmo ciclo: **carrega** o arquivo ao abrir, **altera** os dados na memória e **salva** de novo. O ponto frágil é o primeiro passo, porque o arquivo pode não estar como você espera:

| Situação | O que o `json.load` faz |
|---|---|
| arquivo ainda não existe (primeira execução) | o `open` levanta `FileNotFoundError` |
| arquivo vazio (o programa caiu no meio da gravação) | `JSONDecodeError: Expecting value: line 1 column 1 (char 0)` |
| arquivo editado à mão, com aspas simples ou vírgula sobrando | `JSONDecodeError` |
| JSON válido, mas de outro formato (uma lista onde você esperava um objeto) | carrega sem erro, e o erro aparece depois |

`json.JSONDecodeError` é uma subclasse de `ValueError`, então os dois `except` funcionam; o primeiro deixa claro o que você espera. Para a última linha da tabela não há exceção: confira você mesmo com `isinstance`.

```python
import json

PADRAO = {"tema": "claro", "fonte": 14}


def carregar_preferencias(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            dados = json.load(arquivo)
    except (FileNotFoundError, json.JSONDecodeError):
        return dict(PADRAO)
    if not isinstance(dados, dict):
        return dict(PADRAO)
    return dados
```

`isinstance(valor, dict)` responde se o valor é um dicionário. E `dict(PADRAO)` devolve uma **cópia**: se a função devolvesse o próprio `PADRAO`, quem alterasse o resultado alteraria o padrão do programa inteiro, e a próxima chamada já viria modificada.

#### O erro comum: confiar no que veio do disco

O arquivo é uma entrada como outra qualquer, igual ao que o usuário digita no `input()`. Pode estar velho (de uma versão anterior do programa, com chaves que não existem mais), incompleto ou corrompido. Um `except Exception: pass` em volta de tudo esconde o problema; tratar cada caso com o valor certo resolve.

## Passo 7 · Exercício · Configurações com valores padrão

Um programa tem configurações padrão e deixa o usuário mudar algumas, que ficam num arquivo JSON. Escreva `mesclar_configuracoes(padrao, caminho)`, que devolve um **dicionário novo** com:

- todas as chaves de `padrao`;
- para cada chave que também aparece no arquivo, o valor do arquivo;
- nenhuma chave que exista só no arquivo (sobra de uma versão antiga do programa).

Se o arquivo não existir, estiver vazio ou corrompido, ou não contiver um objeto JSON, devolva uma cópia de `padrao`. Em nenhum caso altere o dicionário `padrao` recebido.

```python
padrao = {"tema": "claro", "fonte": 14, "som": True}
# configuracoes.json contém {"fonte": 18, "idioma_antigo": "pt"}
mesclar_configuracoes(padrao, "configuracoes.json")
# {'tema': 'claro', 'fonte': 18, 'som': True}
```

### Instruções
1. Comece de uma cópia de `padrao` e troque os valores das chaves que aparecem no arquivo, ignorando as que não existem em `padrao`.
2. Se o arquivo não existir, estiver vazio ou com JSON inválido, devolva a cópia do padrão.
   Dica: trate `FileNotFoundError` e `json.JSONDecodeError`.
3. Se o JSON carregado não for um dicionário, devolva a cópia do padrão; nunca altere `padrao`.

### Código inicial
```python
import json


def mesclar_configuracoes(padrao, caminho):
    pass
```

### Solução
```python
import json


def mesclar_configuracoes(padrao, caminho):
    resultado = dict(padrao)
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            salvo = json.load(arquivo)
    except (FileNotFoundError, json.JSONDecodeError):
        return resultado
    if not isinstance(salvo, dict):
        return resultado
    for chave in padrao:
        if chave in salvo:
            resultado[chave] = salvo[chave]
    return resultado
```

### Dicas
1. `dict(padrao)` cria a cópia; altere só ela.
2. Percorra as chaves de `padrao` e pergunte se cada uma está no que foi carregado.
3. `isinstance(salvo, dict)` diz se o arquivo tinha um objeto JSON.

### Verificação
```json
[
  { "id": "mescla", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"c.json\", \"w\", encoding=\"utf-8\") as f:\n    f.write('{\"fonte\": 18, \"tema\": \"escuro\"}')\nr = mesclar_configuracoes({\"tema\": \"claro\", \"fonte\": 14, \"som\": True}, \"c.json\")",
    "expr": "r", "expected": { "tema": "escuro", "fonte": 18, "som": true },
    "name": "Valores do arquivo substituem os do padrão" },
  { "id": "ignora-extras", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"c.json\", \"w\", encoding=\"utf-8\") as f:\n    f.write('{\"idioma_antigo\": \"pt\", \"som\": false}')\nr = mesclar_configuracoes({\"tema\": \"claro\", \"som\": True}, \"c.json\")",
    "expr": "r", "expected": { "tema": "claro", "som": false },
    "name": "Chaves que só existem no arquivo são ignoradas", "hint": "Percorra as chaves do padrão, não as do arquivo." },
  { "id": "inexistente", "checkpoint": 2, "kind": "expr",
    "setup": "p = {\"tema\": \"claro\", \"fonte\": 14}\nr = mesclar_configuracoes(p, \"nao-existe.json\")",
    "expr": "[r, r is p]", "expected": [{ "tema": "claro", "fonte": 14 }, false],
    "name": "Arquivo inexistente devolve uma cópia do padrão", "hint": "Devolva uma cópia, não o próprio dicionário recebido." },
  { "id": "corrompido", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"c.json\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"{'tema': 'escuro'}\")\nr = mesclar_configuracoes({\"tema\": \"claro\"}, \"c.json\")",
    "expr": "r", "expected": { "tema": "claro" },
    "name": "JSON inválido (aspas simples) devolve o padrão", "hint": "Trate json.JSONDecodeError." },
  { "id": "vazio", "checkpoint": 2, "kind": "expr",
    "setup": "open(\"c.json\", \"w\", encoding=\"utf-8\").close()\nr = mesclar_configuracoes({\"fonte\": 12}, \"c.json\")",
    "expr": "r", "expected": { "fonte": 12 }, "name": "Arquivo vazio devolve o padrão" },
  { "id": "nao-objeto", "checkpoint": 3, "kind": "expr",
    "setup": "with open(\"c.json\", \"w\", encoding=\"utf-8\") as f:\n    f.write('[\"tema\", \"escuro\"]')\nr = mesclar_configuracoes({\"tema\": \"claro\"}, \"c.json\")",
    "expr": "r", "expected": { "tema": "claro" },
    "name": "Arquivo com uma lista em vez de objeto devolve o padrão", "hint": "Confira com isinstance se o que carregou é um dicionário." },
  { "id": "nao-altera", "checkpoint": 3, "kind": "expr",
    "setup": "with open(\"c.json\", \"w\", encoding=\"utf-8\") as f:\n    f.write('{\"fonte\": 20, \"novo\": 1}')\np = {\"tema\": \"claro\", \"fonte\": 14}\nr = mesclar_configuracoes(p, \"c.json\")\nr[\"tema\"] = \"alterado\"",
    "expr": "p", "expected": { "tema": "claro", "fonte": 14 },
    "name": "O dicionário padrão nunca é alterado", "hint": "Trabalhe numa cópia de padrao." }
]
```

### Soluções erradas
```python name="altera o próprio padrão"
import json


def mesclar_configuracoes(padrao, caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            salvo = json.load(arquivo)
    except (FileNotFoundError, json.JSONDecodeError):
        return padrao
    if not isinstance(salvo, dict):
        return padrao
    for chave in padrao:
        if chave in salvo:
            padrao[chave] = salvo[chave]
    return padrao
```
```python name="trata só o arquivo inexistente"
import json


def mesclar_configuracoes(padrao, caminho):
    resultado = dict(padrao)
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            salvo = json.load(arquivo)
    except FileNotFoundError:
        return resultado
    if not isinstance(salvo, dict):
        return resultado
    for chave in padrao:
        if chave in salvo:
            resultado[chave] = salvo[chave]
    return resultado
```
```python name="junta tudo, inclusive chaves velhas"
import json


def mesclar_configuracoes(padrao, caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            salvo = json.load(arquivo)
    except (FileNotFoundError, json.JSONDecodeError):
        return dict(padrao)
    if not isinstance(salvo, dict):
        return dict(padrao)
    return {**padrao, **salvo}
```
```python name="não confere se é dicionário"
import json


def mesclar_configuracoes(padrao, caminho):
    resultado = dict(padrao)
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            salvo = json.load(arquivo)
    except (FileNotFoundError, json.JSONDecodeError):
        return resultado
    for chave, valor in salvo.items():
        if chave in padrao:
            resultado[chave] = valor
    return resultado
```
```python name="devolve só o que estava no arquivo"
import json


def mesclar_configuracoes(padrao, caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            salvo = json.load(arquivo)
    except (FileNotFoundError, json.JSONDecodeError):
        return dict(padrao)
    if not isinstance(salvo, dict):
        return dict(padrao)
    return salvo
```

## Passo 8 · Quiz · JSON na prática

### Pergunta
Qual linha grava o dicionário `dados` no arquivo `arquivo`, aberto com `open("d.json", "w", encoding="utf-8")`?
- [ ] `json.dumps(dados, arquivo)`
- [ ] `json.dump(dados)`
- [x] `json.dump(dados, arquivo)`
- [ ] `arquivo.write(str(dados))`
> `dump` (sem `s`) escreve num arquivo e precisa recebê-lo como segundo argumento. `dumps` devolve o texto sem gravar nada; `str(dados)` grava a representação do Python, com aspas simples, que não é JSON válido.

### Pergunta
O que este código imprime?
```python
import json

print(json.loads('{"nota": null, "aprovado": true}'))
```
- [ ] `{"nota": null, "aprovado": true}`
- [x] `{'nota': None, 'aprovado': True}`
- [ ] `{'nota': 'null', 'aprovado': 'true'}`
- [ ] Dá erro, porque `null` e `true` não existem em Python
> `loads` converte cada valor JSON no tipo do Python: `null` vira `None` e `true` vira `True`. O `print` mostra o dicionário do Python, com aspas simples.

### Pergunta
Um programa salva `{"tags": {"python", "dados"}}` com `json.dump`. O que acontece?
- [ ] O conjunto é salvo como lista e volta como conjunto
- [ ] O conjunto é salvo como lista e volta como lista
- [x] `TypeError: Object of type set is not JSON serializable`, e é preciso converter o conjunto antes, por exemplo com `sorted`
- [ ] O conjunto é ignorado e o arquivo fica com `{"tags": null}`
> O JSON não tem tipo conjunto, e o `json` não converte sozinho. Converta na ida (`sorted(tags)`) e reconstrua na volta (`set(lista)`).
