---
slug: n2-m6-02-pep-8-e-codigo-limpo
titulo: PEP 8 e código limpo
descricao: Nomes, espaçamento, tamanho de funções, comentários úteis, ferramentas (ruff, black) e refatorações pequenas.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 35
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Aplicar as regras principais da PEP 8 (nomes, indentação, linhas, importações)
- Refatorar funções longas em funções pequenas com nomes que dizem o que fazem
- Usar um formatador e um linter e explicar a diferença entre eles
---

## Passo 1 · Leitura · Código é lido mais vezes do que escrito

Você escreve uma função uma vez e a lê dezenas de vezes: ao corrigir um defeito, ao mudar uma regra, ao explicar para o grupo. Compare:

```python
def C(L,m):
    r=[]
    for x in L:
        if x[1]>=m: r.append(x[0])
    return r
```

```python
def filtrar_aprovados(alunos, nota_minima):
    aprovados = []
    for nome, nota in alunos:
        if nota >= nota_minima:
            aprovados.append(nome)
    return aprovados
```

As duas fazem a mesma coisa. Na segunda, você entende o que ela faz sem ler o corpo.

A **PEP 8** é o guia de estilo oficial do Python (as PEPs são os documentos que propõem e registram mudanças na linguagem). Ela não muda o que o programa faz; ela faz todo código Python **parecer igual**, para que você gaste a atenção no que importa. As regras que você vai usar todo dia:

| Regra | Exemplo |
|---|---|
| funções, variáveis, métodos e atributos em `snake_case` | `calcular_imc`, `nota_final` |
| classes em `PascalCase` | `ContaBancaria`, `Aluno` |
| constantes em maiúsculas, no topo do módulo | `NOTA_MINIMA = 6.0` |
| indentação de 4 espaços, nunca tab | |
| linhas de até 79 caracteres (muitos projetos usam 99) | |
| importações no topo, em grupos: biblioteca padrão, terceiros, módulos do projeto | `import json` antes de `import requests` |
| um espaço em volta de `=`, `+=`, `==`, `and`… | `total = total + nota` |
| sem espaço em volta do `=` de argumento nomeado | `print(x, end="")` |
| duas linhas em branco entre funções e classes do módulo | |
| comparação com `None` usando `is` | `if nota is None:` |

#### Nomes que revelam a intenção

O nome mais útil diz **o que** a coisa guarda ou faz: `alunos_aprovados`, e não `lista2`; `preco_com_desconto`, e não `temp`. Nomes de uma letra cabem em laços curtos e em matemática (`x`, `y`, `i`); fora disso, obrigam o leitor a decorar o que cada letra significa.

#### O erro comum: estilo misturado

Quem vem de outras linguagens escreve `calcularMedia` ou `NotaFinal`. O programa funciona, mas para quem lê Python, `NotaFinal` parece uma classe e `calcularMedia` destoa de toda a biblioteca padrão. Num projeto com nomes misturados, ninguém lembra como cada coisa se chama, e cada `import` vira consulta.

## Passo 2 · Exercício · Renomeie no padrão

O código abaixo funciona, mas cada nome segue um estilo. Renomeie tudo para a PEP 8, sem mudar o comportamento:

| Hoje | Vira |
|---|---|
| `CalcularIMC(Peso, Altura)` | `calcular_imc(peso, altura)` |
| `class aluno` | `class Aluno` |
| `Nome`, `NotaFinal` (parâmetros e atributos) | `nome`, `nota_final` |
| `EstaAprovado()` | `esta_aprovado()` |
| `notaMinima` | `NOTA_MINIMA`, no topo do arquivo |

Os nomes antigos não podem continuar existindo: quem usa o seu código precisa de um nome só para cada coisa.

### Instruções
1. Renomeie a função e os seus parâmetros: `calcular_imc(peso, altura)`.
   Dica: quem chama pode usar os nomes dos parâmetros, como em `calcular_imc(peso=70, altura=1.75)`.
2. Renomeie a classe, os parâmetros do `__init__` e os atributos para `Aluno`, `nome` e `nota_final`.
3. Renomeie o método para `esta_aprovado` e a constante para `NOTA_MINIMA`, definida no topo do arquivo.

### Código inicial
```python
def CalcularIMC(Peso, Altura):
    return Peso / Altura ** 2


class aluno:
    def __init__(self, Nome, NotaFinal):
        self.Nome = Nome
        self.NotaFinal = NotaFinal

    def EstaAprovado(self):
        return self.NotaFinal >= notaMinima


notaMinima = 6.0
```

### Solução
```python
NOTA_MINIMA = 6.0


def calcular_imc(peso, altura):
    return peso / altura ** 2


class Aluno:
    def __init__(self, nome, nota_final):
        self.nome = nome
        self.nota_final = nota_final

    def esta_aprovado(self):
        return self.nota_final >= NOTA_MINIMA
```

### Dicas
1. Funções, parâmetros, métodos e atributos usam letras minúsculas com `_` entre as palavras.
2. Classes começam com maiúscula em cada palavra; constantes são todas maiúsculas.
3. Ao renomear um atributo, troque também todos os lugares que o usam, como o `self.NotaFinal` dentro do método.

### Verificação
```json
[
  { "id": "imc-nomeado", "checkpoint": 1, "kind": "call", "function": "calcular_imc", "args": [], "kwargs": { "peso": 72.0, "altura": 1.8 },
    "expected": 22.222, "tolerance": 0.001, "name": "calcular_imc(peso=72.0, altura=1.8)",
    "hint": "Os parâmetros também seguem a PEP 8: peso e altura, em minúsculas." },
  { "id": "imc-posicional", "checkpoint": 1, "kind": "call", "function": "calcular_imc", "args": [50.0, 1.6], "expected": 19.531, "tolerance": 0.001,
    "name": "calcular_imc(50.0, 1.6) continua calculando o IMC" },
  { "id": "aluno-nomeado", "checkpoint": 2, "kind": "expr", "setup": "a = Aluno(nome=\"Bia\", nota_final=7.5)",
    "expr": "[a.nome, a.nota_final]", "expected": ["Bia", 7.5], "name": "Aluno(nome=..., nota_final=...) guarda nome e nota_final",
    "hint": "Renomeie os parâmetros do __init__ e os atributos em self." },
  { "id": "aprovado", "checkpoint": 3, "kind": "expr", "expr": "[Aluno(\"Ana\", 6.0).esta_aprovado(), Aluno(\"Caio\", 5.9).esta_aprovado()]",
    "expected": [true, false], "name": "esta_aprovado compara com a nota mínima" },
  { "id": "constante", "checkpoint": 3, "kind": "variable", "variable": "NOTA_MINIMA", "expected": 6.0, "type": "float", "name": "NOTA_MINIMA vale 6.0" },
  { "id": "usa-constante", "checkpoint": 3, "kind": "expr", "setup": "NOTA_MINIMA = 8.0", "expr": "Aluno(\"Davi\", 7.0).esta_aprovado()", "expected": false,
    "name": "esta_aprovado usa NOTA_MINIMA", "hint": "O método precisa ler a constante renomeada." },
  { "id": "sem-nomes-antigos", "checkpoint": 3, "kind": "expr",
    "expr": "[nome for nome in ['CalcularIMC', 'aluno', 'notaMinima'] if nome in globals()] + [nome for nome in ['EstaAprovado', 'Nome', 'NotaFinal'] if hasattr(Aluno(\"Eva\", 9.0), nome)]",
    "expected": [], "name": "Os nomes antigos não existem mais", "hint": "Renomeie em vez de criar um nome novo ao lado do antigo." }
]
```

### Soluções erradas
```python name="esquece os parâmetros da função"
NOTA_MINIMA = 6.0


def calcular_imc(Peso, Altura):
    return Peso / Altura ** 2


class Aluno:
    def __init__(self, nome, nota_final):
        self.nome = nome
        self.nota_final = nota_final

    def esta_aprovado(self):
        return self.nota_final >= NOTA_MINIMA
```
```python name="camelCase no lugar de snake_case"
NOTA_MINIMA = 6.0


def calcular_imc(peso, altura):
    return peso / altura ** 2


class Aluno:
    def __init__(self, nome, notaFinal):
        self.nome = nome
        self.notaFinal = notaFinal

    def estaAprovado(self):
        return self.notaFinal >= NOTA_MINIMA
```
```python name="constante em minúsculas"
nota_minima = 6.0


def calcular_imc(peso, altura):
    return peso / altura ** 2


class Aluno:
    def __init__(self, nome, nota_final):
        self.nome = nome
        self.nota_final = nota_final

    def esta_aprovado(self):
        return self.nota_final >= nota_minima
```
```python name="cria nomes novos e mantém os antigos"
NOTA_MINIMA = 6.0


def CalcularIMC(Peso, Altura):
    return Peso / Altura ** 2


def calcular_imc(peso, altura):
    return CalcularIMC(peso, altura)


class Aluno:
    def __init__(self, nome, nota_final):
        self.nome = nome
        self.nota_final = nota_final

    def esta_aprovado(self):
        return self.nota_final >= NOTA_MINIMA
```

## Passo 3 · Leitura · Uma função, uma tarefa

Uma função de 40 linhas que lê os dados, calcula, filtra e monta o texto faz quatro coisas. Para mudar o texto, você precisa entender o cálculo; para testar o cálculo, precisa montar um texto inteiro. A regra prática: **uma função faz uma coisa**, e o nome dela diz qual. Se você precisa de "e" para descrever a função ("calcula a média **e** filtra **e** formata"), ela está fazendo coisas demais.

Refatorar é mudar a estrutura do código **sem mudar o comportamento**. Um jeito seguro: identifique os blocos da função longa, mova cada um para uma função com um nome que diga o que ele faz e deixe a função original chamando as novas. O resultado deve ser exatamente o mesmo de antes.

```python
def montar_relatorio(alunos, nota_minima):
    media = calcular_media([nota for _, nota in alunos])
    aprovados = filtrar_aprovados(alunos, nota_minima)
    ...
```

Lida de cima, a função principal conta a história; os detalhes ficam nas funções menores, que você testa uma de cada vez.

#### Números mágicos

`if peso > 30:` — por que 30? Um número solto no código, sem nome, é um **número mágico**: quem lê não sabe o que ele significa, e quem precisa mudá-lo tem de achar todas as cópias. Dê um nome a ele numa constante no topo do módulo:

```python
PESO_MAXIMO_KG = 30

if peso > PESO_MAXIMO_KG:
    raise ValueError(f"peso acima de {PESO_MAXIMO_KG} kg")
```

Agora a regra muda em um lugar só, e a mensagem de erro acompanha.

#### Comentários que explicam o porquê

Um comentário que repete o código não ajuda e envelhece mal:

```python
total += 1  # soma 1 no total
```

O código já diz **o que** faz. O comentário útil diz **por que**, aquilo que o código não consegue dizer:

```python
# A secretaria arredonda para cima a partir de 0,05: 5,95 vira 6,0.
nota = arredondar_nota(nota)
```

Antes de escrever um comentário, veja se um nome melhor resolve: `# preço com 10% de desconto` em cima de `p = v * 0.9` pede, na verdade, `preco_com_desconto = valor * (1 - DESCONTO)`.

## Passo 4 · Exercício · Quebre a função f

A função `f` funciona, mas tem nomes de uma letra e faz tudo sozinha. Ela recebe uma lista de pares `(nome, nota)` e a nota mínima, e devolve um relatório:

```text
média da turma: 7.2
aprovados: 2 de 3
- Ana
- Caio
```

Refatore em três funções e apague `f`:

- `calcular_media(notas)`: recebe uma lista de números e devolve a média; lista vazia dá `0.0`.
- `filtrar_aprovados(alunos, nota_minima)`: devolve os nomes com nota maior ou igual à mínima, na ordem da lista.
- `montar_relatorio(alunos, nota_minima)`: devolve exatamente o texto que `f` devolvia, **usando as duas funções acima** em vez de repetir as contas.

### Instruções
1. Escreva `calcular_media(notas)`, que recebe só as notas.
2. Escreva `filtrar_aprovados(alunos, nota_minima)`.
3. Escreva `montar_relatorio(alunos, nota_minima)` chamando as outras duas, com o mesmo texto de `f`, e apague `f`.
   Dica: `[nota for _, nota in alunos]` separa as notas dos pares.

### Código inicial
```python
def f(l, m):
    t = 0
    for x in l:
        t += x[1]
    if len(l) > 0:
        md = t / len(l)
    else:
        md = 0.0
    a = []
    for x in l:
        if x[1] >= m:
            a.append(x[0])
    s = "média da turma: " + str(round(md, 1)) + "\n"
    s += "aprovados: " + str(len(a)) + " de " + str(len(l)) + "\n"
    for n in a:
        s += "- " + n + "\n"
    return s
```

### Solução
```python
def calcular_media(notas):
    if not notas:
        return 0.0
    return sum(notas) / len(notas)


def filtrar_aprovados(alunos, nota_minima):
    return [nome for nome, nota in alunos if nota >= nota_minima]


def montar_relatorio(alunos, nota_minima):
    media = calcular_media([nota for _, nota in alunos])
    aprovados = filtrar_aprovados(alunos, nota_minima)
    linhas = [
        f"média da turma: {round(media, 1)}",
        f"aprovados: {len(aprovados)} de {len(alunos)}",
    ]
    for nome in aprovados:
        linhas.append(f"- {nome}")
    return "\n".join(linhas) + "\n"
```

### Dicas
1. Cada bloco de `f` vira uma função: o primeiro calcula a média, o segundo filtra, o último monta o texto.
2. `calcular_media` recebe números, não pares: quem separa as notas é `montar_relatorio`.
3. Compare o seu texto com o de `f` caractere por caractere: a média vai com `round(media, 1)` e toda linha termina com `\n`.

### Verificação
```json
[
  { "id": "media", "checkpoint": 1, "kind": "call", "function": "calcular_media", "args": [[8.0, 6.5, 7.0]], "expected": 7.1666, "tolerance": 0.001,
    "name": "calcular_media([8.0, 6.5, 7.0])", "hint": "A função recebe só a lista de notas." },
  { "id": "media-vazia", "checkpoint": 1, "kind": "call", "function": "calcular_media", "args": [[]], "expected": 0.0, "type": "float",
    "name": "calcular_media([]) é 0.0", "hint": "Lista vazia não tem média: devolva 0.0, como f fazia." },
  { "id": "filtra", "checkpoint": 2, "kind": "call", "function": "filtrar_aprovados", "args": [[["Ana", 9.0], ["Bia", 5.5], ["Caio", 6.0]], 6.0],
    "expected": ["Ana", "Caio"], "name": "filtrar_aprovados mantém a ordem e aceita a nota igual à mínima",
    "hint": "Nota igual à mínima também aprova." },
  { "id": "filtra-ninguem", "checkpoint": 2, "kind": "call", "function": "filtrar_aprovados", "args": [[["Davi", 4.0]], 5.0], "expected": [],
    "name": "filtrar_aprovados sem aprovados devolve lista vazia" },
  { "id": "relatorio", "checkpoint": 3, "kind": "call", "function": "montar_relatorio", "args": [[["Ana", 8.0], ["Bia", 5.5], ["Caio", 8.1]], 6.0],
    "expected": "média da turma: 7.2\naprovados: 2 de 3\n- Ana\n- Caio\n", "name": "montar_relatorio reproduz o texto de f",
    "hint": "Confira o arredondamento da média e o \\n no fim de cada linha." },
  { "id": "relatorio-vazio", "checkpoint": 3, "kind": "call", "function": "montar_relatorio", "args": [[], 6.0],
    "expected": "média da turma: 0.0\naprovados: 0 de 0\n", "name": "montar_relatorio de uma turma vazia" },
  { "id": "reusa-media", "checkpoint": 3, "kind": "expr", "setup": "calcular_media = lambda notas: 9.9",
    "expr": "montar_relatorio([(\"Eva\", 7.0)], 6.0).splitlines()[0]", "expected": "média da turma: 9.9",
    "name": "montar_relatorio usa calcular_media", "hint": "Chame calcular_media em vez de refazer a conta dentro de montar_relatorio." },
  { "id": "reusa-filtro", "checkpoint": 3, "kind": "expr", "setup": "filtrar_aprovados = lambda alunos, nota_minima: [\"Zeca\"]",
    "expr": "montar_relatorio([(\"Eva\", 7.0), (\"Davi\", 3.0)], 6.0).splitlines()[1:]", "expected": ["aprovados: 1 de 2", "- Zeca"],
    "name": "montar_relatorio usa filtrar_aprovados", "hint": "Chame filtrar_aprovados em vez de repetir o laço." },
  { "id": "sem-f", "checkpoint": 3, "kind": "expr", "expr": "'f' in globals()", "expected": false, "name": "A função f foi apagada" }
]
```

### Soluções erradas
```python name="montar_relatorio repete as contas"
def calcular_media(notas):
    if not notas:
        return 0.0
    return sum(notas) / len(notas)


def filtrar_aprovados(alunos, nota_minima):
    return [nome for nome, nota in alunos if nota >= nota_minima]


def montar_relatorio(alunos, nota_minima):
    notas = [nota for _, nota in alunos]
    media = sum(notas) / len(notas) if notas else 0.0
    aprovados = [nome for nome, nota in alunos if nota >= nota_minima]
    texto = f"média da turma: {round(media, 1)}\naprovados: {len(aprovados)} de {len(alunos)}\n"
    for nome in aprovados:
        texto += f"- {nome}\n"
    return texto
```
```python name="filtro com > deixa de fora a nota igual à mínima"
def calcular_media(notas):
    if not notas:
        return 0.0
    return sum(notas) / len(notas)


def filtrar_aprovados(alunos, nota_minima):
    return [nome for nome, nota in alunos if nota > nota_minima]


def montar_relatorio(alunos, nota_minima):
    media = calcular_media([nota for _, nota in alunos])
    aprovados = filtrar_aprovados(alunos, nota_minima)
    linhas = [
        f"média da turma: {round(media, 1)}",
        f"aprovados: {len(aprovados)} de {len(alunos)}",
    ]
    for nome in aprovados:
        linhas.append(f"- {nome}")
    return "\n".join(linhas) + "\n"
```
```python name="calcular_media quebra na lista vazia"
def calcular_media(notas):
    return sum(notas) / len(notas)


def filtrar_aprovados(alunos, nota_minima):
    return [nome for nome, nota in alunos if nota >= nota_minima]


def montar_relatorio(alunos, nota_minima):
    media = calcular_media([nota for _, nota in alunos])
    aprovados = filtrar_aprovados(alunos, nota_minima)
    linhas = [
        f"média da turma: {round(media, 1)}",
        f"aprovados: {len(aprovados)} de {len(alunos)}",
    ]
    for nome in aprovados:
        linhas.append(f"- {nome}")
    return "\n".join(linhas) + "\n"
```
```python name="calcular_media recebe os pares"
def calcular_media(alunos):
    if not alunos:
        return 0.0
    return sum(nota for _, nota in alunos) / len(alunos)


def filtrar_aprovados(alunos, nota_minima):
    return [nome for nome, nota in alunos if nota >= nota_minima]


def montar_relatorio(alunos, nota_minima):
    media = calcular_media(alunos)
    aprovados = filtrar_aprovados(alunos, nota_minima)
    linhas = [
        f"média da turma: {round(media, 1)}",
        f"aprovados: {len(aprovados)} de {len(alunos)}",
    ]
    for nome in aprovados:
        linhas.append(f"- {nome}")
    return "\n".join(linhas) + "\n"
```
```python name="esquece o \n da última linha"
def calcular_media(notas):
    if not notas:
        return 0.0
    return sum(notas) / len(notas)


def filtrar_aprovados(alunos, nota_minima):
    return [nome for nome, nota in alunos if nota >= nota_minima]


def montar_relatorio(alunos, nota_minima):
    media = calcular_media([nota for _, nota in alunos])
    aprovados = filtrar_aprovados(alunos, nota_minima)
    linhas = [
        f"média da turma: {round(media, 1)}",
        f"aprovados: {len(aprovados)} de {len(alunos)}",
    ]
    for nome in aprovados:
        linhas.append(f"- {nome}")
    return "\n".join(linhas)
```

## Passo 5 · Previsão · is None ou == None?

A PEP 8 pede `is None`, e não `== None`. O motivo aparece quando uma classe define o próprio `__eq__`: o `==` pergunta ao objeto se ele é igual, e o objeto pode responder o que quiser; o `is` pergunta se é **o mesmo objeto**, e ninguém muda essa resposta. Leia o programa e digite exatamente o que ele imprime.

### Código
```python
class Sempre:
    def __eq__(self, outro):
        return True


s = Sempre()
print(s == None)
print(s is None)
valor = 0
print(valor == None, valor is None)
print(not valor)
```

### Dicas
1. `s == None` chama o `__eq__` de `Sempre`, que responde `True` para qualquer comparação.
2. Só existe um `None` no programa; `s` é outro objeto.
3. `0` não é `None`, mas é falso: `not 0` é `True`. Por isso `if not valor:` não serve para testar "faltou o valor".

### Saída esperada
```text
True
False
False False
True
```

## Passo 6 · Exercício · Dê nome aos números mágicos

A transportadora da papelaria cobra o frete assim: uma taxa fixa de R\$ 12,50, mais R\$ 0,45 por quilômetro, mais R\$ 1,20 por quilo **acima de 10 kg**; pacotes acima de 30 kg são recusados. A função funciona, mas os números estão soltos no código. Tire cada um para uma constante no topo do arquivo, com estes nomes:

| Constante | Valor |
|---|---|
| `TAXA_FIXA` | `12.5` |
| `CUSTO_POR_KM` | `0.45` |
| `PESO_SEM_ADICIONAL_KG` | `10` |
| `CUSTO_POR_KG_EXTRA` | `1.2` |
| `PESO_MAXIMO_KG` | `30` |

A função precisa **usar** as constantes, inclusive na mensagem de erro: se a transportadora mudar o limite para 40 kg, basta trocar uma linha.

### Instruções
1. Crie as cinco constantes no topo do arquivo, com os nomes e os valores da tabela.
2. Troque cada número solto de `calcular_frete` pela constante correspondente, sem mudar o resultado.
3. Use `PESO_MAXIMO_KG` também na mensagem do `ValueError`.

### Código inicial
```python
def calcular_frete(peso, distancia):
    if peso > 30:
        raise ValueError("peso acima de 30 kg")
    valor = 12.5 + distancia * 0.45
    if peso > 10:
        valor += (peso - 10) * 1.2
    return round(valor, 2)
```

### Solução
```python
TAXA_FIXA = 12.5
CUSTO_POR_KM = 0.45
PESO_SEM_ADICIONAL_KG = 10
CUSTO_POR_KG_EXTRA = 1.2
PESO_MAXIMO_KG = 30


def calcular_frete(peso, distancia):
    if peso > PESO_MAXIMO_KG:
        raise ValueError(f"peso acima de {PESO_MAXIMO_KG} kg")
    valor = TAXA_FIXA + distancia * CUSTO_POR_KM
    if peso > PESO_SEM_ADICIONAL_KG:
        valor += (peso - PESO_SEM_ADICIONAL_KG) * CUSTO_POR_KG_EXTRA
    return round(valor, 2)
```

### Dicas
1. Constantes ficam fora da função, no topo do arquivo, em letras maiúsculas.
2. O `10` aparece duas vezes na função: as duas viram a mesma constante.
3. A mensagem de erro vira uma f-string com a constante dentro.

### Verificação
```json
[
  { "id": "constantes", "checkpoint": 1, "kind": "expr", "expr": "[TAXA_FIXA, CUSTO_POR_KM, PESO_SEM_ADICIONAL_KG, CUSTO_POR_KG_EXTRA, PESO_MAXIMO_KG]",
    "expected": [12.5, 0.45, 10, 1.2, 30], "name": "As cinco constantes com os valores da tabela", "hint": "Confira os nomes, em maiúsculas, e os valores." },
  { "id": "frete-curto", "checkpoint": 2, "kind": "call", "function": "calcular_frete", "args": [5, 10], "expected": 17.0, "tolerance": 0.001,
    "name": "calcular_frete(5, 10) continua 17.0" },
  { "id": "frete-pesado", "checkpoint": 2, "kind": "call", "function": "calcular_frete", "args": [20, 100], "expected": 69.5, "tolerance": 0.001,
    "name": "calcular_frete(20, 100) continua 69.5" },
  { "id": "frete-limite", "checkpoint": 2, "kind": "call", "function": "calcular_frete", "args": [30, 0], "expected": 36.5, "tolerance": 0.001,
    "name": "30 kg ainda é aceito" },
  { "id": "usa-taxa", "checkpoint": 2, "kind": "expr", "setup": "TAXA_FIXA = 100.0\nCUSTO_POR_KM = 1.0", "expr": "calcular_frete(5, 10)",
    "expected": 110.0, "tolerance": 0.001, "name": "A função usa TAXA_FIXA e CUSTO_POR_KM", "hint": "Troque o 12.5 e o 0.45 pelas constantes." },
  { "id": "usa-adicional", "checkpoint": 2, "kind": "expr", "setup": "PESO_SEM_ADICIONAL_KG = 0\nCUSTO_POR_KG_EXTRA = 2.0", "expr": "calcular_frete(4, 0)",
    "expected": 20.5, "tolerance": 0.001, "name": "A função usa PESO_SEM_ADICIONAL_KG e CUSTO_POR_KG_EXTRA",
    "hint": "O 10 aparece duas vezes: troque as duas cópias." },
  { "id": "acima", "checkpoint": 3, "kind": "expr", "expr": "calcular_frete(31, 5)", "raises": "ValueError", "message_contains": "peso acima de 30 kg",
    "name": "Pacote de 31 kg é recusado" },
  { "id": "usa-maximo", "checkpoint": 3, "kind": "expr", "setup": "PESO_MAXIMO_KG = 40", "expr": "calcular_frete(41, 0)",
    "raises": "ValueError", "message_contains": "peso acima de 40 kg", "name": "Limite e mensagem acompanham PESO_MAXIMO_KG",
    "hint": "Use a constante no if e dentro da mensagem (f-string)." },
  { "id": "aceita-novo-maximo", "checkpoint": 3, "kind": "expr", "setup": "PESO_MAXIMO_KG = 40", "expr": "calcular_frete(35, 0)",
    "expected": 42.5, "tolerance": 0.001, "name": "Com PESO_MAXIMO_KG = 40, um pacote de 35 kg passa" }
]
```

### Soluções erradas
```python name="cria as constantes mas não as usa"
TAXA_FIXA = 12.5
CUSTO_POR_KM = 0.45
PESO_SEM_ADICIONAL_KG = 10
CUSTO_POR_KG_EXTRA = 1.2
PESO_MAXIMO_KG = 30


def calcular_frete(peso, distancia):
    if peso > 30:
        raise ValueError("peso acima de 30 kg")
    valor = 12.5 + distancia * 0.45
    if peso > 10:
        valor += (peso - 10) * 1.2
    return round(valor, 2)
```
```python name="troca só uma das cópias do 10"
TAXA_FIXA = 12.5
CUSTO_POR_KM = 0.45
PESO_SEM_ADICIONAL_KG = 10
CUSTO_POR_KG_EXTRA = 1.2
PESO_MAXIMO_KG = 30


def calcular_frete(peso, distancia):
    if peso > PESO_MAXIMO_KG:
        raise ValueError(f"peso acima de {PESO_MAXIMO_KG} kg")
    valor = TAXA_FIXA + distancia * CUSTO_POR_KM
    if peso > PESO_SEM_ADICIONAL_KG:
        valor += (peso - 10) * CUSTO_POR_KG_EXTRA
    return round(valor, 2)
```
```python name="mensagem de erro com o número fixo"
TAXA_FIXA = 12.5
CUSTO_POR_KM = 0.45
PESO_SEM_ADICIONAL_KG = 10
CUSTO_POR_KG_EXTRA = 1.2
PESO_MAXIMO_KG = 30


def calcular_frete(peso, distancia):
    if peso > PESO_MAXIMO_KG:
        raise ValueError("peso acima de 30 kg")
    valor = TAXA_FIXA + distancia * CUSTO_POR_KM
    if peso > PESO_SEM_ADICIONAL_KG:
        valor += (peso - PESO_SEM_ADICIONAL_KG) * CUSTO_POR_KG_EXTRA
    return round(valor, 2)
```
```python name="constantes dentro da função"
def calcular_frete(peso, distancia):
    TAXA_FIXA = 12.5
    CUSTO_POR_KM = 0.45
    PESO_SEM_ADICIONAL_KG = 10
    CUSTO_POR_KG_EXTRA = 1.2
    PESO_MAXIMO_KG = 30
    if peso > PESO_MAXIMO_KG:
        raise ValueError(f"peso acima de {PESO_MAXIMO_KG} kg")
    valor = TAXA_FIXA + distancia * CUSTO_POR_KM
    if peso > PESO_SEM_ADICIONAL_KG:
        valor += (peso - PESO_SEM_ADICIONAL_KG) * CUSTO_POR_KG_EXTRA
    return round(valor, 2)
```

## Passo 7 · Leitura · Formatador e linter

Conferir cada espaço e cada linha em branco à mão é trabalho de máquina. Duas ferramentas fazem isso por você, e elas fazem coisas diferentes.

O **formatador** reescreve o arquivo no estilo padrão: espaços, quebras de linha, linhas em branco, aspas. Ele **não muda o que o código faz**, só a aparência. O mais conhecido é o **black**; o **ruff** também formata, com `ruff format`. Para este arquivo:

```python
import os
def media(notas):
    if notas == None:
        return 0
    total=0
    for n in notas: total+=n
    return total/len(notas)
```

`python -m black notas.py` responde `reformatted notas.py` e deixa assim:

```python
import os


def media(notas):
    if notas == None:
        return 0
    total = 0
    for n in notas:
        total += n
    return total / len(notas)
```

Repare no que **não** mudou: o `import os` que ninguém usa e o `== None` continuam lá. Isso é trabalho do **linter**, que lê o código e aponta problemas sem reescrevê-lo. Com as regras de estilo (`E`) e de erros prováveis (`F`) ligadas:

```text
python -m ruff check --select E,F --output-format concise notas.py
notas.py:1:8: F401 [*] `os` imported but unused
notas.py:5:17: E711 Comparison to `None` should be `cond is None`
Found 2 errors.
[*] 1 fixable with `--fix` (1 unsafe fix available with `--fix --unsafe-fixes`).
```

Cada linha traz **arquivo:linha:coluna**, o código da regra e a explicação. O `[*]` marca o que o ruff sabe corrigir sozinho com `--fix`. Os outros, como a comparação com `None`, você corrige à mão, porque a correção pode mudar o comportamento (lembre do `__eq__` do passo 5).

#### Como usar no dia a dia

Rode o formatador sempre que salvar (os editores fazem isso por você com uma opção) e o linter antes de cada commit. Num projeto em grupo, todo mundo usa a mesma configuração, guardada no `pyproject.toml`, e as discussões sobre espaço e aspas acabam: a ferramenta decide. Este ambiente não roda o black nem o ruff; no seu computador eles se instalam com `python -m pip install black ruff`, dentro do ambiente virtual do projeto.

## Passo 8 · Quiz · Estilo

### Pergunta
Qual trecho segue a PEP 8 em todos os nomes?
- [ ] `class contaCorrente:` com o método `def Depositar(self, Valor):`
- [ ] `TaxaJuros = 0.02` e `def calcularJuros(saldo):`
- [x] `TAXA_JUROS = 0.02`, `class ContaCorrente:` e `def calcular_juros(saldo):`
- [ ] `taxa_juros = 0.02` como constante e `class conta_corrente:`
> Constante em maiúsculas, classe em `PascalCase`, função e parâmetros em `snake_case`. O Python aceita qualquer um dos nomes; a convenção existe para que o nome já diga o que a coisa é.

### Pergunta
Qual comentário vale a pena manter?
- [ ] `i += 1  # incrementa i`
- [ ] `# percorre a lista de alunos` em cima de `for aluno in alunos:`
- [x] `# O ENEM divulga as notas com uma casa decimal; arredondamos igual para comparar.` em cima de `nota = round(nota, 1)`
- [ ] `# função que calcula` em cima de `def calcular_frete(peso, distancia):`
> Os outros repetem o que o código já diz. O comentário útil registra o **porquê**, uma informação que não está no código e que alguém vai precisar ao pensar em mudar aquela linha.

### Pergunta
Depois de rodar o black num arquivo, o ruff ainda aponta o erro `F401` no `import os`, que ninguém usa. Por quê?
- [ ] Porque o black estragou a importação ao reformatar
- [x] Porque o formatador só muda a aparência do código; achar importações sem uso e outros problemas é trabalho do linter
- [ ] Porque o ruff e o black usam versões diferentes da PEP 8
- [ ] Porque importações nunca podem ser corrigidas automaticamente
> O formatador garante o estilo visual sem mudar o comportamento, e apagar uma importação seria mudar o código. O linter aponta problemas; o `[*]` indica que este o ruff corrige sozinho com `ruff check --fix`.
