---
slug: n2-m4-01-ler-e-escrever-texto
titulo: Ler e escrever arquivos de texto
descricao: open, modos, with, leitura linha a linha, escrita e append, encoding UTF-8.
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
- Abrir arquivos com with nos modos r, w e a e explicar o que cada modo faz com o conteúdo
- Ler linha a linha sem carregar tudo na memória e remover o \n
- Escrever e anexar texto com encoding UTF-8 explícito
---

## Passo 1 · Leitura · Dados que sobrevivem ao programa

Tudo o que seus programas guardaram até aqui morava em variáveis, e variáveis somem quando o programa termina. A lista de compras que você montou, as notas digitadas, o placar do jogo: fechou, perdeu. Para os dados sobreviverem, o programa precisa gravá-los num **arquivo** e lê-los de volta na próxima vez.

A porta de entrada é `open(caminho, modo, encoding=...)`. Ela devolve um objeto arquivo, e o `with` (o gerenciador de contexto do módulo anterior) garante que ele seja fechado no fim do bloco, mesmo que aconteça uma exceção no meio:

```python
with open("compras.txt", "w", encoding="utf-8") as arquivo:
    arquivo.write("café\n")
    arquivo.write("pão de queijo\n")

with open("compras.txt", encoding="utf-8") as arquivo:
    conteudo = arquivo.read()
print(conteudo)
```

O caminho `"compras.txt"` é **relativo**: o arquivo fica na pasta em que o programa roda, que aqui é a pasta do seu projeto.

#### Os modos

| Modo | Para quê | Se o arquivo já existe | Se não existe |
|---|---|---|---|
| `"r"` (padrão) | ler | lê do começo | `FileNotFoundError` |
| `"w"` | escrever | **apaga tudo** e começa vazio | cria |
| `"a"` | anexar | escreve **depois** do que já havia | cria |
| `"x"` | criar | `FileExistsError` | cria |

#### Por que fechar importa

O Python não grava cada `write` no disco na hora: junta os pedaços num *buffer* (uma área de espera na memória) e grava de uma vez ao fechar. Um arquivo aberto com `arquivo = open(...)` e nunca fechado pode ficar **vazio ou pela metade** no disco. O `with` fecha por você em qualquer saída do bloco.

#### O erro comum: esquecer o encoding

O *encoding* é a regra que transforma letras em bytes. Sem `encoding="utf-8"`, o Python usa o padrão do sistema, que no Windows costuma ser outro. O arquivo gravado num computador vira `cafÃ©` no outro. Escreva sempre `encoding="utf-8"` ao abrir texto: é uma linha a mais que evita o acento quebrado.

## Passo 2 · Previsão · w apaga, a anexa

O programa grava um diário em três etapas, com modos diferentes, e lê o arquivo duas vezes. Leia sem executar e digite exatamente o que ele imprime. Atenção ao que `write` faz (e ao que ele **não** faz) com as quebras de linha.

### Código
```python
with open("diario.txt", "w", encoding="utf-8") as f:
    f.write("seg: estudei")
    f.write("ter: descansei\n")
with open("diario.txt", "a", encoding="utf-8") as f:
    f.write("qua: revisei\n")
with open("diario.txt", encoding="utf-8") as f:
    print(f.read())
with open("diario.txt", "w", encoding="utf-8") as f:
    f.write("qui: prova\n")
with open("diario.txt", encoding="utf-8") as f:
    print(len(f.readlines()))
```

### Dicas
1. `write` grava exatamente o texto que recebe: não acrescenta `\n` sozinho.
2. O texto lido termina em `\n`, e o `print` ainda põe outra quebra depois dele.
3. O último `"w"` apaga tudo o que havia antes de gravar.

### Saída esperada
```text
seg: estudeiter: descansei
qua: revisei

1
```

## Passo 3 · Exercício · Salvar e carregar uma lista
modo: lacunas

O padrão mais comum com arquivos de texto: um item por linha. Complete as quatro lacunas (`___`) para que `salvar_lista` grave a lista e `carregar_lista` a devolva igual:

```python
salvar_lista("compras.txt", ["café", "pão de queijo"])
# o arquivo fica com o texto "café\npão de queijo\n"
carregar_lista("compras.txt")   # ['café', 'pão de queijo']
```

Ao percorrer um arquivo com `for linha in arquivo:`, cada `linha` vem **com** o `\n` do fim. `linha.rstrip("\n")` tira só essa quebra.

### Instruções
1. `salvar_lista(caminho, itens)` grava cada item numa linha terminada por `\n`, substituindo o que o arquivo tinha antes.
2. `carregar_lista(caminho)` devolve a lista de linhas do arquivo, sem o `\n` do fim de cada uma.
3. As duas abrem o arquivo com `with` e `encoding="utf-8"`.

### Código inicial
```python
def salvar_lista(caminho, itens):
    with open(caminho, ___, encoding="utf-8") as arquivo:
        for item in itens:
            arquivo.write(___)


def carregar_lista(caminho):
    itens = []
    with open(caminho, encoding=___) as arquivo:
        for linha in arquivo:
            itens.append(___)
    return itens
```

### Solução
```python
def salvar_lista(caminho, itens):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        for item in itens:
            arquivo.write(item + "\n")


def carregar_lista(caminho):
    itens = []
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            itens.append(linha.rstrip("\n"))
    return itens
```

### Dicas
1. Qual modo começa o arquivo do zero? Releia a tabela de modos.
2. `write` não quebra a linha sozinho: some o `\n` ao item.
3. `rstrip("\n")` devolve a linha sem a quebra do fim.

### Verificação
```json
[
  { "id": "grava", "checkpoint": 1, "kind": "expr", "setup": "salvar_lista(\"feira.txt\", [\"açaí\", \"pão de queijo\", \"maçã\"])",
    "expr": "open(\"feira.txt\", encoding=\"utf-8\").read()", "expected": "açaí\npão de queijo\nmaçã\n",
    "name": "Cada item vira uma linha terminada por \\n", "hint": "write não acrescenta a quebra de linha." },
  { "id": "substitui", "checkpoint": 1, "kind": "expr",
    "setup": "salvar_lista(\"turma.txt\", [\"Ana\", \"Bia\", \"Caio\"])\nsalvar_lista(\"turma.txt\", [\"Davi\"])",
    "expr": "open(\"turma.txt\", encoding=\"utf-8\").read()", "expected": "Davi\n",
    "name": "Salvar de novo substitui o conteúdo anterior", "hint": "Um dos modos apaga o arquivo antes de escrever; outro escreve depois do fim." },
  { "id": "vazia", "checkpoint": 1, "kind": "expr", "setup": "salvar_lista(\"nada.txt\", [])",
    "expr": "open(\"nada.txt\", encoding=\"utf-8\").read()", "expected": "",
    "name": "Lista vazia cria um arquivo vazio" },
  { "id": "carrega", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"fila.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"Eva\\nCaio Souza\\nJoão\\n\")",
    "expr": "carregar_lista(\"fila.txt\")", "expected": ["Eva", "Caio Souza", "João"],
    "name": "carregar_lista devolve as linhas sem o \\n", "hint": "Cada linha lida termina com \\n; tire só essa quebra." },
  { "id": "sem-final", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"notas.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"7,5\\n9\\n10\")",
    "expr": "carregar_lista(\"notas.txt\")", "expected": ["7,5", "9", "10"],
    "name": "Arquivo cuja última linha não tem \\n também é lido certo" },
  { "id": "ida-e-volta", "checkpoint": 2, "kind": "expr",
    "setup": "salvar_lista(\"ida.txt\", [\"1º lugar\", \"\", \"Ribeirão Preto\"])",
    "expr": "carregar_lista(\"ida.txt\")", "expected": ["1º lugar", "", "Ribeirão Preto"],
    "name": "Salvar e carregar devolve a mesma lista, inclusive com linha vazia no meio" },
  { "id": "with-encoding", "checkpoint": 3, "kind": "expr",
    "setup": "_open_real = open\n_abertos = []\ndef open(*args, **kwargs):\n    arquivo = _open_real(*args, **kwargs)\n    _abertos.append((str(kwargs.get(\"encoding\")).lower().replace(\"-\", \"\"), arquivo))\n    return arquivo\nsalvar_lista(\"e.txt\", [\"é\"])\ncarregar_lista(\"e.txt\")",
    "expr": "[len(_abertos), sorted(set(e for e, a in _abertos)), all(a.closed for e, a in _abertos)]",
    "expected": [2, ["utf8"], true],
    "name": "As duas funções abrem com encoding utf-8 e fecham o arquivo", "hint": "Use with open(..., encoding=\"utf-8\") nas duas." }
]
```

### Soluções erradas
```python name="modo a: acumula em vez de substituir"
def salvar_lista(caminho, itens):
    with open(caminho, "a", encoding="utf-8") as arquivo:
        for item in itens:
            arquivo.write(item + "\n")


def carregar_lista(caminho):
    itens = []
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            itens.append(linha.rstrip("\n"))
    return itens
```
```python name="write sem a quebra de linha"
def salvar_lista(caminho, itens):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        for item in itens:
            arquivo.write(item)


def carregar_lista(caminho):
    itens = []
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            itens.append(linha.rstrip("\n"))
    return itens
```
```python name="readlines sem tirar o \n"
def salvar_lista(caminho, itens):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        for item in itens:
            arquivo.write(item + "\n")


def carregar_lista(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.readlines()
```
```python name="split no texto inteiro deixa um item vazio no fim"
def salvar_lista(caminho, itens):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        for item in itens:
            arquivo.write(item + "\n")


def carregar_lista(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        return arquivo.read().split("\n")
```
```python name="sem encoding"
def salvar_lista(caminho, itens):
    with open(caminho, "w") as arquivo:
        for item in itens:
            arquivo.write(item + "\n")


def carregar_lista(caminho):
    itens = []
    with open(caminho) as arquivo:
        for linha in arquivo:
            itens.append(linha.rstrip("\n"))
    return itens
```
```python name="sem with: o arquivo nunca é fechado"
def salvar_lista(caminho, itens):
    arquivo = open(caminho, "w", encoding="utf-8")
    for item in itens:
        arquivo.write(item + "\n")


def carregar_lista(caminho):
    itens = []
    arquivo = open(caminho, encoding="utf-8")
    for linha in arquivo:
        itens.append(linha.rstrip("\n"))
    return itens
```

## Passo 4 · Leitura · Linha a linha, e o arquivo que não existe

Há três jeitos de ler um arquivo aberto, e eles não são equivalentes:

| Forma | Devolve | Memória |
|---|---|---|
| `arquivo.read()` | um texto com o arquivo inteiro | o arquivo todo de uma vez |
| `arquivo.readlines()` | uma lista de linhas, cada uma com `\n` | o arquivo todo de uma vez |
| `for linha in arquivo:` | uma linha por volta, com `\n` | só a linha atual |

Para um arquivo de 2 GB de registros de acesso, os dois primeiros tentam pôr 2 GB na memória. O `for` lê uma linha, você processa, ele descarta e lê a próxima. Por isso, quando o trabalho é linha a linha (contar, filtrar, somar), percorra o arquivo com `for`.

```python
total = 0
with open("vendas.txt", encoding="utf-8") as arquivo:
    for linha in arquivo:
        if linha.strip() == "":
            continue
        total += float(linha)
```

#### O erro comum: linha "vazia" que não é vazia

Uma linha em branco no meio do arquivo chega como `"\n"`, e uma linha só com espaços chega como `"   \n"`. Nenhuma das duas é igual a `""`. Teste `linha.strip() == ""`: `strip()` tira espaços, tabulações e quebras das duas pontas.

#### Quando o arquivo não existe

Abrir para leitura um arquivo que não existe levanta uma exceção:

```
FileNotFoundError: [Errno 2] No such file or directory: 'vendas.txt'
```

Num programa que guarda dados entre execuções, isso é **normal** na primeira vez: ainda não há nada salvo. Trate com o `try`/`except` que você já conhece e decida o valor que faz sentido:

```python
try:
    with open("placar.txt", encoding="utf-8") as arquivo:
        recorde = int(arquivo.read())
except FileNotFoundError:
    recorde = 0
```

Repare que o `except` pega só `FileNotFoundError`. Um `except Exception` também esconderia um arquivo corrompido (`ValueError` no `int`), que é um problema de verdade.

## Passo 5 · Exercício · Contar a lista de presença

A monitoria anota a presença num arquivo, um nome por linha. Quem digita deixa linhas em branco e linhas só com espaços no meio, e no primeiro dia do semestre o arquivo ainda nem existe. O projeto tem um exemplo, `presenca.txt`, para você testar.

Escreva `contar_linhas_nao_vazias(caminho)`, que devolve quantas linhas têm algum caractere que não seja espaço, tabulação ou quebra de linha:

```python
contar_linhas_nao_vazias("presenca.txt")   # 4
contar_linhas_nao_vazias("nao-existe.txt") # 0
```

### Instruções
1. Percorra o arquivo linha a linha com `with` e `encoding="utf-8"`, contando as linhas não vazias.
   Dica: `linha.strip()` tira espaços, tabulações e o `\n` das pontas.
2. Ignore as linhas em branco e as que só têm espaços ou tabulações.
3. Se o arquivo não existir, devolva `0` em vez de deixar a exceção subir.

### Código inicial
```python
def contar_linhas_nao_vazias(caminho):
    pass
```
```text path=presenca.txt
Ana Lima

Bia Souza
   
Caio Mendes
	
Davi Rocha
```

### Solução
```python
def contar_linhas_nao_vazias(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            total = 0
            for linha in arquivo:
                if linha.strip() != "":
                    total += 1
            return total
    except FileNotFoundError:
        return 0
```
```text path=presenca.txt
Ana Lima

Bia Souza
   
Caio Mendes
	
Davi Rocha
```

### Dicas
1. Comece um contador em zero e some 1 a cada linha que, depois de `strip()`, não fica vazia.
2. `"   \n".strip()` é `""`; `"\n"` sozinho também.
3. Envolva a abertura em `try` e trate só `FileNotFoundError`.

### Verificação
```json
[
  { "id": "basico", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"p1.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"Eva\\nJoão\\nLia\\n\")",
    "expr": "contar_linhas_nao_vazias(\"p1.txt\")", "expected": 3, "type": "int",
    "name": "Três nomes, três linhas" },
  { "id": "brancos", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"p2.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"Ana\\n\\nBia\\n   \\nCaio\\n\\t\\n\\n\")",
    "expr": "contar_linhas_nao_vazias(\"p2.txt\")", "expected": 3, "type": "int",
    "name": "Linhas em branco e só com espaços ou tabulações não contam", "hint": "Uma linha só com espaços chega como \"   \\n\"." },
  { "id": "sem-final", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"p3.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"\\n\\nDavi\")",
    "expr": "contar_linhas_nao_vazias(\"p3.txt\")", "expected": 1, "type": "int",
    "name": "Última linha sem \\n também conta" },
  { "id": "vazio", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"p4.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"\")",
    "expr": "contar_linhas_nao_vazias(\"p4.txt\")", "expected": 0, "type": "int",
    "name": "Arquivo vazio tem 0 linhas" },
  { "id": "grande", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"p5.txt\", \"w\", encoding=\"utf-8\") as f:\n    for i in range(600):\n        f.write(f\"aluno {i}\\n\" if i % 3 else \"  \\n\")",
    "expr": "contar_linhas_nao_vazias(\"p5.txt\")", "expected": 400, "type": "int",
    "name": "Arquivo com 600 linhas, um terço em branco" },
  { "id": "inexistente", "checkpoint": 3, "kind": "call", "function": "contar_linhas_nao_vazias", "args": ["nao-existe.txt"],
    "expected": 0, "type": "int", "name": "Arquivo inexistente devolve 0", "hint": "Trate FileNotFoundError e devolva um número." },
  { "id": "with-encoding", "checkpoint": 1, "kind": "expr",
    "setup": "_open_real = open\n_abertos = []\ndef open(*args, **kwargs):\n    arquivo = _open_real(*args, **kwargs)\n    _abertos.append((str(kwargs.get(\"encoding\")).lower().replace(\"-\", \"\"), arquivo))\n    return arquivo\nwith _open_real(\"p6.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"Íris\\n\")\nn = contar_linhas_nao_vazias(\"p6.txt\")",
    "expr": "[n, len(_abertos), sorted(set(e for e, a in _abertos)), all(a.closed for e, a in _abertos)]",
    "expected": [1, 1, ["utf8"], true],
    "name": "Abre com encoding utf-8 e fecha o arquivo", "hint": "Use with open(caminho, encoding=\"utf-8\")." }
]
```

### Soluções erradas
```python name="conta todas as linhas"
def contar_linhas_nao_vazias(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            return len(arquivo.readlines())
    except FileNotFoundError:
        return 0
```
```python name="compara com \n e conta linhas só com espaços"
def contar_linhas_nao_vazias(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            total = 0
            for linha in arquivo:
                if linha != "\n":
                    total += 1
            return total
    except FileNotFoundError:
        return 0
```
```python name="não trata o arquivo inexistente"
def contar_linhas_nao_vazias(caminho):
    with open(caminho, encoding="utf-8") as arquivo:
        total = 0
        for linha in arquivo:
            if linha.strip() != "":
                total += 1
        return total
```
```python name="trata o erro mas devolve None"
def contar_linhas_nao_vazias(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            total = 0
            for linha in arquivo:
                if linha.strip() != "":
                    total += 1
            return total
    except FileNotFoundError:
        print("arquivo não encontrado")
```
```python name="conta as quebras de linha do texto"
def contar_linhas_nao_vazias(caminho):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            return arquivo.read().strip().count("\n") + 1
    except FileNotFoundError:
        return 0
```

## Passo 6 · Exercício · Livro de ocorrências

O laboratório mantém um livro de ocorrências em texto. Cada registro ocupa uma linha, numerada: `1. Porta destrancada`, `2. Monitor 4 sem imagem`. Quem chega depois precisa continuar a numeração **sem apagar** o que já estava lá.

Escreva `anexar_registro(caminho, texto)`:

```python
anexar_registro("ocorrencias.txt", "Porta destrancada")       # devolve 1
anexar_registro("ocorrencias.txt", "Monitor 4 sem imagem")    # devolve 2
# o arquivo fica: "1. Porta destrancada\n2. Monitor 4 sem imagem\n"
```

O número do registro novo é a quantidade de linhas não vazias que o arquivo já tem, mais 1. Se o arquivo ainda não existe, o registro novo é o 1 e o arquivo é criado.

### Instruções
1. Conte as linhas não vazias que o arquivo já tem; se ele não existir, considere zero.
2. Acrescente ao fim do arquivo a linha `"<número>. <texto>\n"`, preservando tudo o que já estava escrito.
   Dica: há um modo de `open` que escreve depois do fim e cria o arquivo se ele não existir.
3. Devolva o número do registro gravado. Use `with` e `encoding="utf-8"` em toda abertura.

### Código inicial
```python
def anexar_registro(caminho, texto):
    pass
```

### Solução
```python
def anexar_registro(caminho, texto):
    existentes = 0
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            for linha in arquivo:
                if linha.strip() != "":
                    existentes += 1
    except FileNotFoundError:
        existentes = 0
    numero = existentes + 1
    with open(caminho, "a", encoding="utf-8") as arquivo:
        arquivo.write(f"{numero}. {texto}\n")
    return numero
```

### Dicas
1. São duas aberturas: uma para contar (leitura) e outra para escrever (anexar).
2. Na contagem, reaproveite a ideia do passo anterior, com `try`/`except FileNotFoundError`.
3. O modo `"w"` apagaria os registros antigos.

### Verificação
```json
[
  { "id": "cria", "checkpoint": 2, "kind": "expr", "setup": "n = anexar_registro(\"livro.txt\", \"Porta destrancada\")",
    "expr": "[n, open(\"livro.txt\", encoding=\"utf-8\").read()]", "expected": [1, "1. Porta destrancada\n"],
    "name": "Arquivo novo: registro 1 criado", "hint": "Se o arquivo não existe, conte zero linhas e crie-o ao anexar." },
  { "id": "preserva", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"livro.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"1. Luz queimada\\n2. Cadeira quebrada\\n\")\nn = anexar_registro(\"livro.txt\", \"Ar-condicionado pingando\")",
    "expr": "[n, open(\"livro.txt\", encoding=\"utf-8\").read()]",
    "expected": [3, "1. Luz queimada\n2. Cadeira quebrada\n3. Ar-condicionado pingando\n"],
    "name": "Registro novo vai depois dos antigos, que continuam lá", "hint": "O modo de escrita não pode apagar o arquivo." },
  { "id": "sequencia", "checkpoint": 3, "kind": "expr",
    "setup": "r = [anexar_registro(\"seq.txt\", t) for t in [\"Ana entrou\", \"Bia saiu\", \"Caio esqueceu a chave\"]]",
    "expr": "[r, open(\"seq.txt\", encoding=\"utf-8\").read().splitlines()]",
    "expected": [[1, 2, 3], ["1. Ana entrou", "2. Bia saiu", "3. Caio esqueceu a chave"]],
    "name": "Três chamadas seguidas numeram 1, 2 e 3" },
  { "id": "ignora-brancos", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"b.txt\", \"w\", encoding=\"utf-8\") as f:\n    f.write(\"1. Vazamento\\n\\n   \\n\")\nn = anexar_registro(\"b.txt\", \"Tomada solta\")",
    "expr": "[n, open(\"b.txt\", encoding=\"utf-8\").read()]", "expected": [2, "1. Vazamento\n\n   \n2. Tomada solta\n"],
    "name": "Linhas em branco não entram na numeração", "hint": "Conte só as linhas que não ficam vazias depois de strip()." },
  { "id": "acentos", "checkpoint": 3, "kind": "expr",
    "setup": "_open_real = open\n_abertos = []\ndef open(*args, **kwargs):\n    arquivo = _open_real(*args, **kwargs)\n    _abertos.append((str(kwargs.get(\"encoding\")).lower().replace(\"-\", \"\"), arquivo))\n    return arquivo\nanexar_registro(\"a.txt\", \"Projetor sem conexão\")\nanexar_registro(\"a.txt\", \"Ação concluída\")",
    "expr": "[sorted(set(e for e, a in _abertos)), all(a.closed for e, a in _abertos), _open_real(\"a.txt\", encoding=\"utf-8\").read()]",
    "expected": [["utf8"], true, "1. Projetor sem conexão\n2. Ação concluída\n"],
    "name": "Toda abertura usa encoding utf-8 e fecha o arquivo", "hint": "Use with e encoding=\"utf-8\" nas duas aberturas." }
]
```

### Soluções erradas
```python name="modo w apaga os registros antigos"
def anexar_registro(caminho, texto):
    existentes = 0
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            for linha in arquivo:
                if linha.strip() != "":
                    existentes += 1
    except FileNotFoundError:
        existentes = 0
    numero = existentes + 1
    with open(caminho, "w", encoding="utf-8") as arquivo:
        arquivo.write(f"{numero}. {texto}\n")
    return numero
```
```python name="não trata o arquivo que ainda não existe"
def anexar_registro(caminho, texto):
    existentes = 0
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            if linha.strip() != "":
                existentes += 1
    numero = existentes + 1
    with open(caminho, "a", encoding="utf-8") as arquivo:
        arquivo.write(f"{numero}. {texto}\n")
    return numero
```
```python name="conta também as linhas em branco"
def anexar_registro(caminho, texto):
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            existentes = len(arquivo.readlines())
    except FileNotFoundError:
        existentes = 0
    numero = existentes + 1
    with open(caminho, "a", encoding="utf-8") as arquivo:
        arquivo.write(f"{numero}. {texto}\n")
    return numero
```
```python name="esquece o \n e gruda os registros"
def anexar_registro(caminho, texto):
    existentes = 0
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            for linha in arquivo:
                if linha.strip() != "":
                    existentes += 1
    except FileNotFoundError:
        existentes = 0
    numero = existentes + 1
    with open(caminho, "a", encoding="utf-8") as arquivo:
        arquivo.write(f"{numero}. {texto}")
    return numero
```
```python name="numera a partir do total de linhas sem somar 1"
def anexar_registro(caminho, texto):
    existentes = 0
    try:
        with open(caminho, encoding="utf-8") as arquivo:
            for linha in arquivo:
                if linha.strip() != "":
                    existentes += 1
    except FileNotFoundError:
        existentes = 0
    with open(caminho, "a", encoding="utf-8") as arquivo:
        arquivo.write(f"{existentes}. {texto}\n")
    return existentes
```

## Passo 7 · Quiz · Modos e with

### Pergunta
O arquivo `tarefas.txt` tem três linhas. O programa abaixo roda uma vez. O que o arquivo contém depois?
```python
with open("tarefas.txt", "w", encoding="utf-8") as f:
    f.write("lavar a louça\n")
```
- [ ] As três linhas antigas e, depois delas, `lavar a louça`
- [x] Só a linha `lavar a louça`
- [ ] `lavar a louça` e, depois dela, as três linhas antigas
- [ ] Nada muda: o Python levanta `FileExistsError` porque o arquivo já existe
> O modo `"w"` apaga o conteúdo ao abrir. Para escrever depois do que já existe, use `"a"`. Quem levanta `FileExistsError` é o modo `"x"`.

### Pergunta
Qual a vantagem de `with open(...) as f:` sobre `f = open(...)` seguido de `f.close()` no fim?
- [ ] O `with` lê o arquivo mais rápido
- [ ] O `with` escolhe o encoding certo automaticamente
- [x] O arquivo é fechado mesmo se uma exceção interromper o bloco, e o que foi escrito chega ao disco
- [ ] Com `with` não é preciso informar o modo
> Se uma exceção acontecer entre o `open` e o `close`, o `close` nunca roda. O `with` fecha em qualquer saída, como um `finally`, e fechar é o que grava no disco o que ficou no buffer.

### Pergunta
O arquivo `nomes.txt` contém `Ana\nBia\n`. O que este código imprime?
```python
with open("nomes.txt", encoding="utf-8") as f:
    for linha in f:
        print(linha)
```
- [ ] `Ana` e `Bia`, uma em cada linha, sem linhas em branco
- [x] `Ana`, uma linha em branco, `Bia` e outra linha em branco
- [ ] `['Ana\n', 'Bia\n']`
- [ ] `Ana\nBia\n`, numa linha só
> Cada `linha` já termina com `\n`, e o `print` acrescenta outra quebra. Por isso aparece uma linha em branco depois de cada nome. `linha.rstrip("\n")` resolve.
