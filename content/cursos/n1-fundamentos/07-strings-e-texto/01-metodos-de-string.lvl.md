---
slug: n1-m7-01-metodos-de-string
titulo: Métodos de string
descricao: upper, lower, strip, replace, find, startswith, count e a imutabilidade das strings.
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
- Aplicar os métodos mais usados de string e encadear chamadas
- Explicar por que os métodos devolvem uma nova string em vez de alterar a original
- Normalizar entradas do usuário (espaços, maiúsculas) antes de comparar
---

## Passo 1 · Leitura · Texto não muda: métodos devolvem outro texto

Você já junta textos com `+` e monta frases com f-strings. Agora vai transformar texto: pôr em maiúsculas, tirar espaços, trocar um trecho por outro. Isso se faz com **métodos**, funções que pertencem a um valor e são chamadas com um ponto: `texto.upper()`.

Os dez métodos de string mais usados:

| Método | O que devolve | Exemplo | Resultado |
|---|---|---|---|
| `upper()` | o texto em maiúsculas | `"ação".upper()` | `"AÇÃO"` |
| `lower()` | o texto em minúsculas | `"ÁRVORE".lower()` | `"árvore"` |
| `title()` | cada palavra com inicial maiúscula | `"são paulo".title()` | `"São Paulo"` |
| `strip()` | o texto sem os espaços das pontas | `"  oi  ".strip()` | `"oi"` |
| `replace(a, b)` | o texto com cada `a` trocado por `b` | `"1,5".replace(",", ".")` | `"1.5"` |
| `find(trecho)` | a posição da primeira ocorrência, ou `-1` | `"banana".find("na")` | `2` |
| `count(trecho)` | quantas vezes o trecho aparece | `"banana".count("an")` | `2` |
| `startswith(t)` | `True` se o texto começa com `t` | `"Bom dia".startswith("Bom")` | `True` |
| `endswith(t)` | `True` se o texto termina com `t` | `"foto.png".endswith(".png")` | `True` |
| `isdigit()` | `True` se há só dígitos (e pelo menos um) | `"2026".isdigit()` | `True` |

Repare que as letras acentuadas acompanham: `"ação".upper()` devolve `"AÇÃO"`.

#### Strings são imutáveis

Uma string, depois de criada, não muda. Nenhum método altera o texto original: todos **devolvem um texto novo**. Se você não guardar o resultado, ele se perde.

```python
cidade = "ribeirão preto"
cidade.title()            # devolve "Ribeirão Preto", mas ninguém guardou
print(cidade)             # ribeirão preto
cidade = cidade.title()   # agora a variável aponta para o texto novo
print(cidade)             # Ribeirão Preto
```

Pelo mesmo motivo, não dá para trocar uma letra pela posição: `cidade[0] = "R"` dá `TypeError: 'str' object does not support item assignment`.

#### Encadear métodos

Como cada método devolve uma string, você pode chamar outro método logo em seguida. A leitura é da esquerda para a direita:

```python
resposta = "  SIM "
print(resposta.strip().lower())   # sim
```

Primeiro `strip()` devolve `"SIM"`; depois `lower()`, aplicado a esse resultado, devolve `"sim"`. Limpar um texto assim antes de comparar chama-se **normalizar**: para o Python, `"SIM"`, `"sim"` e `" sim"` são três textos diferentes, e quem digita não tem esse cuidado.

## Passo 2 · Previsão · O texto original muda?

Leia o programa com calma, sem executar, e digite exatamente o que ele imprime. Preste atenção em quais linhas guardam ou imprimem o resultado do método e quais não.

### Código
```python
texto = "Bom Dia"
texto.upper()
print(texto)
print(texto.lower().replace("o", "0"))
print(texto.find("z"))
print(texto.count("o"))
print(texto.startswith("Bom"))
```

### Dicas
1. A segunda linha chama o método, mas não guarda o resultado em lugar nenhum.
2. `find` devolve `-1` quando não acha o trecho.

### Saída esperada
```text
Bom Dia
b0m dia
-1
1
True
```

## Passo 3 · Exercício · normalizar(texto) e eh_sim(resposta)
modo: lacunas

Um programa pergunta "Deseja continuar?" e cada pessoa responde de um jeito: `s`, `Sim`, ` SIM`. Complete as lacunas (`___`) das duas funções. `normalizar` limpa o texto; `eh_sim` usa `normalizar` para decidir se a resposta vale como "sim".

### Instruções
1. Complete os dois métodos de `normalizar`, para ela devolver o texto sem os espaços das pontas e em minúsculas. Exemplo: `normalizar("  SIM ")` devolve `"sim"`.
   Dica: são dois métodos da tabela, um em cada lacuna.
2. Complete a outra resposta aceita por `eh_sim`: além de `"sim"`, a função aceita a forma curta, com uma letra só.
   Dica: a resposta já chega normalizada na comparação; escreva a letra em minúscula, entre aspas.

### Código inicial
```python
def normalizar(texto):
    return texto.___().___()


def eh_sim(resposta):
    return normalizar(resposta) in [___, "sim"]
```

### Solução
```python
def normalizar(texto):
    return texto.strip().lower()


def eh_sim(resposta):
    return normalizar(resposta) in ["s", "sim"]
```

### Dicas
1. `strip` tira os espaços das pontas.
2. `lower` põe em minúsculas.
3. A resposta curta para "sim" é `"s"`.

### Verificação
```json
[
  { "id": "normalizar-sim", "checkpoint": 1, "kind": "call", "function": "normalizar", "args": ["  SIM "], "expected": "sim", "type": "str",
    "name": "normalizar(\"  SIM \") é \"sim\"", "hint": "São duas limpezas: os espaços das pontas e as maiúsculas." },
  { "id": "normalizar-acento", "checkpoint": 1, "kind": "call", "function": "normalizar", "args": [" São Paulo  "], "expected": "são paulo", "type": "str",
    "name": "normalizar(\" São Paulo  \") é \"são paulo\"", "hint": "O espaço do meio fica; só os das pontas saem. As letras com acento também ficam minúsculas." },
  { "id": "normalizar-maiusculas-acento", "checkpoint": 1, "kind": "call", "function": "normalizar", "args": ["NÃO"], "expected": "não", "type": "str",
    "name": "normalizar(\"NÃO\") é \"não\"" },
  { "id": "sim-curto", "checkpoint": 2, "kind": "call", "function": "eh_sim", "args": ["s"], "expected": true, "type": "bool",
    "name": "eh_sim(\"s\") é True", "hint": "A forma curta de sim é uma letra só, em minúscula." },
  { "id": "sim-inicial-maiuscula", "checkpoint": 2, "kind": "call", "function": "eh_sim", "args": ["Sim"], "expected": true, "type": "bool",
    "name": "eh_sim(\"Sim\") é True" },
  { "id": "sim-com-espaco", "checkpoint": 2, "kind": "call", "function": "eh_sim", "args": [" SIM"], "expected": true, "type": "bool",
    "name": "eh_sim(\" SIM\") é True", "hint": "A resposta precisa ser normalizada antes da comparação." },
  { "id": "s-maiusculo-espaco", "checkpoint": 2, "kind": "call", "function": "eh_sim", "args": ["S "], "expected": true, "type": "bool",
    "name": "eh_sim(\"S \") é True" },
  { "id": "nao", "checkpoint": 2, "kind": "call", "function": "eh_sim", "args": ["não"], "expected": false, "type": "bool",
    "name": "eh_sim(\"não\") é False" },
  { "id": "vazio", "checkpoint": 2, "kind": "call", "function": "eh_sim", "args": [""], "expected": false, "type": "bool",
    "name": "eh_sim(\"\") é False" }
]
```

### Soluções erradas
```python name="normalizar só com lower: os espaços ficam"
def normalizar(texto):
    return texto.lower()


def eh_sim(resposta):
    return normalizar(resposta) in ["s", "sim"]
```
```python name="eh_sim compara sem normalizar"
def normalizar(texto):
    return texto.strip().lower()


def eh_sim(resposta):
    return resposta in ["s", "sim"]
```
```python name="normalizar com upper em vez de lower"
def normalizar(texto):
    return texto.strip().upper()


def eh_sim(resposta):
    return normalizar(resposta) in ["s", "sim"]
```
```python name="forma curta em maiúscula"
def normalizar(texto):
    return texto.strip().lower()


def eh_sim(resposta):
    return normalizar(resposta) in ["S", "sim"]
```

## Passo 4 · Exercício · censurar(texto, palavra) e contar_ocorrencias(texto, trecho)

O moderador de um fórum de turma quer esconder palavras indesejadas sem mudar o tamanho da mensagem: cada palavra censurada vira asteriscos, um por letra. Ele também quer saber quantas vezes um trecho aparece em um texto.

Exemplos:

```
censurar("que droga de dia", "droga")   devolve   "que ***** de dia"
contar_ocorrencias("banana", "an")      devolve   2
```

### Instruções
1. Defina `censurar(texto, palavra)`, que devolve o texto com todas as ocorrências de `palavra` trocadas por asteriscos, na mesma quantidade de letras da palavra. Se a palavra não aparece, o texto volta igual.
   Dica: multiplicar um texto por um número repete o texto.
2. Defina `contar_ocorrencias(texto, trecho)`, que devolve quantas vezes `trecho` aparece em `texto` (um inteiro; `0` se não aparece).
   Dica: um dos métodos da tabela faz exatamente essa conta.

### Código inicial
```python
def censurar(texto, palavra):
    pass


def contar_ocorrencias(texto, trecho):
    pass
```

### Solução
```python
def censurar(texto, palavra):
    asteriscos = "*" * len(palavra)
    return texto.replace(palavra, asteriscos)


def contar_ocorrencias(texto, trecho):
    return texto.count(trecho)
```

### Dicas
1. `"*" * len(palavra)` monta os asteriscos no tamanho certo, qualquer que seja a palavra.
2. `replace` não altera `texto`: ele devolve o texto novo, e é esse resultado que a função precisa devolver com `return`.
3. Para contar, `texto.count(trecho)` já devolve o inteiro pedido.

### Verificação
```json
[
  { "id": "censura-droga", "checkpoint": 1, "kind": "call", "function": "censurar", "args": ["que droga de dia", "droga"], "expected": "que ***** de dia",
    "name": "censurar(\"que droga de dia\", \"droga\")", "hint": "A palavra tem 5 letras; conte os asteriscos da sua resposta." },
  { "id": "censura-curta", "checkpoint": 1, "kind": "call", "function": "censurar", "args": ["o pão do dia", "pão"], "expected": "o *** do dia",
    "name": "censurar(\"o pão do dia\", \"pão\")", "hint": "A quantidade de asteriscos depende do tamanho da palavra recebida." },
  { "id": "censura-acento", "checkpoint": 1, "kind": "call", "function": "censurar", "args": ["que preguiça", "preguiça"], "expected": "que ********",
    "name": "censurar(\"que preguiça\", \"preguiça\")", "hint": "Use len(palavra): letras com acento e cedilha contam como uma letra cada." },
  { "id": "censura-duas", "checkpoint": 1, "kind": "call", "function": "censurar", "args": ["chato, muito chato", "chato"], "expected": "*****, muito *****",
    "name": "Censura todas as ocorrências" },
  { "id": "censura-ausente", "checkpoint": 1, "kind": "call", "function": "censurar", "args": ["bom dia", "droga"], "expected": "bom dia",
    "name": "Sem a palavra, o texto volta igual" },
  { "id": "conta-banana", "checkpoint": 2, "kind": "call", "function": "contar_ocorrencias", "args": ["banana", "an"], "expected": 2, "type": "int",
    "name": "contar_ocorrencias(\"banana\", \"an\")", "hint": "A resposta é a quantidade de vezes, não a posição." },
  { "id": "conta-arara", "checkpoint": 2, "kind": "call", "function": "contar_ocorrencias", "args": ["arara azul", "a"], "expected": 4, "type": "int",
    "name": "contar_ocorrencias(\"arara azul\", \"a\")" },
  { "id": "conta-ausente", "checkpoint": 2, "kind": "call", "function": "contar_ocorrencias", "args": ["banana", "x"], "expected": 0, "type": "int",
    "name": "Trecho ausente devolve 0", "hint": "Devolva o inteiro 0, não -1 nem False." }
]
```

### Soluções erradas
```python name="três asteriscos fixos"
def censurar(texto, palavra):
    return texto.replace(palavra, "***")


def contar_ocorrencias(texto, trecho):
    return texto.count(trecho)
```
```python name="censurar não devolve o resultado do replace"
def censurar(texto, palavra):
    texto.replace(palavra, "*" * len(palavra))
    return texto


def contar_ocorrencias(texto, trecho):
    return texto.count(trecho)
```
```python name="contar com find: devolve a posição"
def censurar(texto, palavra):
    return texto.replace(palavra, "*" * len(palavra))


def contar_ocorrencias(texto, trecho):
    return texto.find(trecho)
```
```python name="contar com in: devolve True ou False"
def censurar(texto, palavra):
    return texto.replace(palavra, "*" * len(palavra))


def contar_ocorrencias(texto, trecho):
    return trecho in texto
```

## Passo 5 · Quiz · Métodos

### Pergunta
O que este programa imprime?
```python
nome = "ana"
nome.upper()
print(nome)
```
- [ ] `ANA`, porque `upper()` alterou a variável
- [x] `ana`, porque `upper()` devolveu um texto novo que ninguém guardou
- [ ] `Ana`, porque `upper()` só muda a primeira letra
- [ ] Nada: o programa dá erro na segunda linha
> Strings são imutáveis. Para ficar com o resultado é preciso guardar: `nome = nome.upper()`.

### Pergunta
Quanto vale `"banana".find("x")`?
- [ ] `0`
- [ ] `False`
- [x] `-1`
- [ ] Nada: dá erro, porque o trecho não existe
> `find` devolve a posição da primeira ocorrência ou `-1` quando não acha. O `0` é uma posição válida: a do primeiro caractere. Quem dá erro (`ValueError`) nessa situação é o método parecido `index`.

### Pergunta
Quanto vale `"  bom  dia  ".strip()`?
- [ ] `"bomdia"`
- [ ] `"bom dia"`
- [x] `"bom  dia"`
- [ ] `"  bom  dia  "`
> `strip` só tira os espaços das pontas. Os dois espaços do meio continuam lá.

## Passo 6 · Exercício · cpf_valido_formato(cpf)

Um formulário de matrícula recebe o CPF digitado de dois jeitos: com pontuação (`123.456.789-00`) ou só com os números (`12345678900`). Antes de qualquer outra conferência, o sistema checa o **formato**: tirando os pontos e o traço, precisam sobrar exatamente 11 caracteres, todos dígitos.

A função não confere se o CPF existe, só o formato.

### Instruções
1. Defina `cpf_valido_formato(cpf)`. Dentro dela, monte um texto sem os pontos (`.`) e sem o traço (`-`) do CPF recebido.
   Dica: trocar um caractere por `""` (texto vazio) é o mesmo que apagá-lo.
2. Devolva `True` se o texto limpo tem só dígitos e exatamente 11 caracteres; senão, devolva `False`.
   Dica: são duas condições, e as duas precisam valer.

### Código inicial
```python
def cpf_valido_formato(cpf):
    pass
```

### Solução
```python
def cpf_valido_formato(cpf):
    limpo = cpf.replace(".", "").replace("-", "")
    return limpo.isdigit() and len(limpo) == 11
```

### Dicas
1. Limpe com dois `replace` encadeados: um para o ponto, outro para o traço.
2. Guarde o texto limpo em uma variável: `cpf` continua com a pontuação, porque strings não mudam.
3. Depois confira `limpo.isdigit()` e `len(limpo) == 11`, unidos por `and`.

### Verificação
```json
[
  { "id": "define", "checkpoint": 1, "kind": "source", "rule": { "type": "defines_function", "name": "cpf_valido_formato" },
    "name": "Define cpf_valido_formato" },
  { "id": "pontuado", "checkpoint": 1, "kind": "call", "function": "cpf_valido_formato", "args": ["123.456.789-00"], "expected": true, "type": "bool",
    "name": "\"123.456.789-00\" é válido", "hint": "Tire os pontos e o traço antes de conferir os dígitos." },
  { "id": "so-numeros", "checkpoint": 2, "kind": "call", "function": "cpf_valido_formato", "args": ["12345678900"], "expected": true, "type": "bool",
    "name": "\"12345678900\" é válido" },
  { "id": "curto", "checkpoint": 2, "kind": "call", "function": "cpf_valido_formato", "args": ["123"], "expected": false, "type": "bool",
    "name": "\"123\" não é válido", "hint": "Só dígitos não basta: precisam ser exatamente 11." },
  { "id": "dez-digitos", "checkpoint": 2, "kind": "call", "function": "cpf_valido_formato", "args": ["123.456.789-0"], "expected": false, "type": "bool",
    "name": "\"123.456.789-0\" não é válido", "hint": "Conte os dígitos depois de tirar a pontuação." },
  { "id": "doze-digitos", "checkpoint": 2, "kind": "call", "function": "cpf_valido_formato", "args": ["123456789001"], "expected": false, "type": "bool",
    "name": "\"123456789001\" não é válido" },
  { "id": "letras", "checkpoint": 2, "kind": "call", "function": "cpf_valido_formato", "args": ["abc.def.ghi-jk"], "expected": false, "type": "bool",
    "name": "\"abc.def.ghi-jk\" não é válido", "hint": "Onze caracteres não bastam: todos precisam ser dígitos." },
  { "id": "vazio", "checkpoint": 2, "kind": "call", "function": "cpf_valido_formato", "args": [""], "expected": false, "type": "bool",
    "name": "Texto vazio não é válido" }
]
```

### Soluções erradas
```python name="não remove a pontuação"
def cpf_valido_formato(cpf):
    return cpf.isdigit() and len(cpf) == 11
```
```python name="confere só o tamanho: letras passam"
def cpf_valido_formato(cpf):
    limpo = cpf.replace(".", "").replace("-", "")
    return len(limpo) == 11
```
```python name="confere só os dígitos: qualquer tamanho passa"
def cpf_valido_formato(cpf):
    limpo = cpf.replace(".", "").replace("-", "")
    return limpo.isdigit()
```
```python name="replace sem guardar o resultado"
def cpf_valido_formato(cpf):
    cpf.replace(".", "")
    cpf.replace("-", "")
    return cpf.isdigit() and len(cpf) == 11
```
