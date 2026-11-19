---
slug: n2-m4-02-csv
titulo: CSV com o módulo csv
descricao: Ler e escrever tabelas com csv.reader, DictReader e DictWriter, separadores e conversão de tipos.
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
- Ler CSV com reader e DictReader e converter campos numéricos
- Escrever CSV com writer e DictWriter, inclusive com ponto e vírgula
- Agregar dados de um CSV (totais, médias, agrupamento) sem pandas
---

## Passo 1 · Leitura · Por que não basta um split

CSV (*comma-separated values*, valores separados por vírgula) é o formato de tabela mais comum que existe: toda planilha exporta, todo sistema importa. Cada linha é uma linha da tabela, e os campos são separados por um caractere:

```text
produto,preco
Caderno,18.5
"Caneta, azul",2.25
```

A tentação é ler com `linha.split(",")`. Funciona até o dia em que um campo tem vírgula dentro. Para isso o CSV põe o campo entre aspas, e o `split` não sabe disso: `'"Caneta, azul",2.25'.split(",")` dá três pedaços, `['"Caneta', ' azul"', '2.25']`, e a tabela desalinha.

O módulo `csv` da biblioteca padrão entende aspas, separadores e quebras de linha:

```python
import csv

with open("produtos.csv", encoding="utf-8", newline="") as arquivo:
    leitor = csv.reader(arquivo)
    cabecalho = next(leitor)          # ['produto', 'preco']
    for linha in leitor:
        print(linha)                  # ['Caneta, azul', '2.25']
```

`csv.reader` entrega cada linha como lista de textos. A primeira linha é o **cabeçalho**, e o `reader` não sabe disso: se você não consumi-la com `next`, ela chega no laço como se fosse um produto.

#### DictReader: campos pelo nome

`csv.DictReader` usa o cabeçalho como chaves e entrega cada linha como dicionário: `linha["preco"]` em vez de `linha[1]`. O código fica legível e não quebra se alguém trocar a ordem das colunas.

#### Tudo chega como texto

O `csv` não adivinha tipos: `"2.25"` é texto e precisa de `float(...)`. No Brasil há mais um detalhe. O Excel em português salva CSV com **ponto e vírgula** como separador, porque a vírgula é o separador decimal:

```text
produto;preco
Caderno;18,50
```

Leia com `csv.DictReader(arquivo, delimiter=";")` e troque a vírgula antes de converter. Sem a troca:

```
ValueError: could not convert string to float: '18,50'
```

O `newline=""` no `open` deixa o próprio `csv` cuidar das quebras de linha, inclusive as que aparecem dentro de um campo entre aspas. Use sempre ao abrir um CSV, para ler ou escrever.

## Passo 2 · Previsão · reader, aspas e DictReader

O programa grava um CSV pequeno, com um campo entre aspas, e o lê de dois jeitos. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import csv

with open("itens.csv", "w", encoding="utf-8", newline="") as f:
    f.write('produto,preco\n"Caneta, azul",2.5\nLápis,1\n')
with open("itens.csv", encoding="utf-8", newline="") as f:
    for linha in csv.reader(f):
        print(len(linha), linha[0])
with open("itens.csv", encoding="utf-8", newline="") as f:
    precos = [linha["preco"] for linha in csv.DictReader(f)]
print(precos)
print(sum(float(p) for p in precos))
```

### Dicas
1. O `reader` não pula o cabeçalho: ele também é uma linha.
2. A vírgula entre aspas faz parte do campo; as aspas não aparecem no valor.
3. O `DictReader` usa o cabeçalho como chaves, e os valores continuam sendo textos.

### Saída esperada
```text
2 produto
2 Caneta, azul
2 Lápis
['2.5', '1']
3.5
```

## Passo 3 · Exercício · Total por categoria
modo: lacunas

A cantina exporta as vendas do dia no padrão do Excel brasileiro: ponto e vírgula como separador e vírgula como decimal. O projeto traz um exemplo, `vendas.csv`. Complete as três lacunas (`___`) para que `total_por_categoria(caminho)` devolva um dicionário com a soma dos valores de cada categoria:

```python
total_por_categoria("vendas.csv")
# {'papelaria': 20.75, 'cantina': 11.0}
```

### Instruções
1. Leia o arquivo com `csv.DictReader` usando `;` como separador.
2. Converta o campo `valor` para `float`, trocando a vírgula decimal por ponto.
3. Acumule o valor no total da categoria, começando de zero na primeira vez que ela aparece.

### Código inicial
```python
import csv


def total_por_categoria(caminho):
    totais = {}
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=___):
            valor = float(linha["valor"].replace(___, "."))
            categoria = linha["categoria"]
            totais[categoria] = ___
    return totais
```
```text path=vendas.csv
data;categoria;descricao;valor
10/03/2025;papelaria;"Caderno; capa dura";18,50
10/03/2025;cantina;Pão de queijo;4,50
10/03/2025;papelaria;Caneta;2,25
10/03/2025;cantina;Suco de laranja;6,50
```

### Solução
```python
import csv


def total_por_categoria(caminho):
    totais = {}
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=";"):
            valor = float(linha["valor"].replace(",", "."))
            categoria = linha["categoria"]
            totais[categoria] = totais.get(categoria, 0) + valor
    return totais
```
```text path=vendas.csv
data;categoria;descricao;valor
10/03/2025;papelaria;"Caderno; capa dura";18,50
10/03/2025;cantina;Pão de queijo;4,50
10/03/2025;papelaria;Caneta;2,25
10/03/2025;cantina;Suco de laranja;6,50
```

### Dicas
1. O separador vai como texto: o mesmo caractere que aparece entre os campos do arquivo.
2. `"18,50".replace(",", ".")` é `"18.50"`, que o `float` aceita.
3. `totais.get(categoria, 0)` devolve o total atual ou zero se a categoria ainda não apareceu.

### Verificação
```json
[
  { "id": "soma", "checkpoint": 3, "kind": "expr",
    "setup": "with open(\"dia.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write(\"data;categoria;descricao;valor\\n05/03;cantina;Pão de queijo;4,50\\n05/03;papelaria;Lápis;2,25\\n06/03;cantina;Suco;6,75\\n06/03;cantina;Bolo;3,00\\n\")",
    "expr": "total_por_categoria(\"dia.csv\")", "expected": { "cantina": 14.25, "papelaria": 2.25 },
    "name": "Soma os valores de cada categoria", "hint": "Some ao total que a categoria já tinha, em vez de substituí-lo." },
  { "id": "aspas", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"q.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write('data;categoria;descricao;valor\\n01/04;livraria;\"Box; volumes 1 a 3\";120,00\\n01/04;livraria;\"Marcador \"\"USP\"\"\";1,50\\n')",
    "expr": "total_por_categoria(\"q.csv\")", "expected": { "livraria": 121.5 },
    "name": "Campo entre aspas com ; dentro não desalinha a tabela", "hint": "Deixe o módulo csv separar os campos." },
  { "id": "decimal", "checkpoint": 2, "kind": "expr",
    "setup": "with open(\"d.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write(\"data;categoria;descricao;valor\\n02/04;xerox;Cópias;0,75\\n02/04;xerox;Encadernação;7\\n\")",
    "expr": "[total_por_categoria(\"d.csv\"), type(total_por_categoria(\"d.csv\")[\"xerox\"]).__name__]",
    "expected": [{ "xerox": 7.75 }, "float"],
    "name": "Converte 0,75 e 7 para float", "hint": "float não aceita vírgula decimal." },
  { "id": "colunas-trocadas", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"t.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write(\"valor;descricao;categoria\\n10,25;Café;cantina\\n5,50;Régua;papelaria\\n\")",
    "expr": "total_por_categoria(\"t.csv\")", "expected": { "cantina": 10.25, "papelaria": 5.5 },
    "name": "Funciona com as colunas em outra ordem" },
  { "id": "so-cabecalho", "checkpoint": 1, "kind": "expr",
    "setup": "with open(\"v.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write(\"data;categoria;descricao;valor\\n\")",
    "expr": "total_por_categoria(\"v.csv\")", "expected": {},
    "name": "Arquivo só com o cabeçalho dá um dicionário vazio" }
]
```

### Soluções erradas
```python name="esquece o delimiter"
import csv


def total_por_categoria(caminho):
    totais = {}
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo):
            valor = float(linha["valor"].replace(",", "."))
            categoria = linha["categoria"]
            totais[categoria] = totais.get(categoria, 0) + valor
    return totais
```
```python name="float direto na vírgula"
import csv


def total_por_categoria(caminho):
    totais = {}
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=";"):
            valor = float(linha["valor"])
            categoria = linha["categoria"]
            totais[categoria] = totais.get(categoria, 0) + valor
    return totais
```
```python name="substitui o total em vez de somar"
import csv


def total_por_categoria(caminho):
    totais = {}
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        for linha in csv.DictReader(arquivo, delimiter=";"):
            valor = float(linha["valor"].replace(",", "."))
            categoria = linha["categoria"]
            totais[categoria] = valor
    return totais
```
```python name="split no ; em vez do módulo csv"
def total_por_categoria(caminho):
    totais = {}
    with open(caminho, encoding="utf-8") as arquivo:
        cabecalho = arquivo.readline().strip().split(";")
        for texto in arquivo:
            linha = dict(zip(cabecalho, texto.strip().split(";")))
            valor = float(linha["valor"].replace(",", "."))
            categoria = linha["categoria"]
            totais[categoria] = totais.get(categoria, 0) + valor
    return totais
```
```python name="posições fixas das colunas"
import csv


def total_por_categoria(caminho):
    totais = {}
    with open(caminho, encoding="utf-8", newline="") as arquivo:
        leitor = csv.reader(arquivo, delimiter=";")
        next(leitor)
        for linha in leitor:
            valor = float(linha[3].replace(",", "."))
            categoria = linha[1]
            totais[categoria] = totais.get(categoria, 0) + valor
    return totais
```

## Passo 4 · Leitura · Escrever CSV com DictWriter

Escrever é o caminho inverso, e o módulo `csv` cuida de pôr aspas onde precisa. Com dicionários, use `csv.DictWriter`:

```python
import csv

alunos = [
    {"nome": "Ana", "curso": "Física", "nota": "8,5"},
    {"nome": "Silva, Bia", "curso": "Química", "nota": "7,0"},
]
with open("turma.csv", "w", encoding="utf-8", newline="") as arquivo:
    escritor = csv.DictWriter(arquivo, fieldnames=["nome", "curso", "nota"], delimiter=";")
    escritor.writeheader()
    for aluno in alunos:
        escritor.writerow(aluno)
```

```text
nome;curso;nota
Ana;Física;8,5
"Silva, Bia";Química;7,0
```

- `fieldnames` diz **quais** colunas e **em que ordem**. É obrigatório: o `DictWriter` não tem como adivinhar a ordem.
- `writeheader()` escreve a linha do cabeçalho; sem ele, o arquivo começa direto nos dados e quem for ler com `DictReader` vai usar o primeiro aluno como cabeçalho.
- `writerow(dicionario)` escreve uma linha. Um dicionário com chave que não está em `fieldnames` levanta `ValueError: dict contains fields not in fieldnames: 'idade'`.
- Para listas há o `csv.writer`, com `writerow(["Ana", "Física", "8,5"])`.

#### Números no formato brasileiro

O `csv` escreve cada valor com `str(valor)`: o `float` `8.5` vira `8.5`, com ponto. Se o arquivo vai para o Excel em português, formate antes: `f"{nota:.1f}".replace(".", ",")` dá `"8,5"`.

#### O erro comum: esquecer o newline=""

O `csv` termina cada linha com `\r\n`, o padrão do formato. No Windows, um `open` sem `newline=""` ainda traduz o `\n` para `\r\n`, e cada linha sai com `\r\r\n`. No Excel isso aparece como uma **linha em branco entre cada linha da tabela**. No Linux e no macOS o defeito não aparece, e por isso passa despercebido até o arquivo chegar a um colega com Windows. Abra CSV sempre com `newline=""`.

## Passo 5 · Exercício · Relatório de notas para o Excel

A coordenação quer as médias da turma numa planilha. Escreva `exportar_relatorio(caminho, alunos)`. Cada aluno é um dicionário com `nome`, `nota1` e `nota2` (números). O arquivo gerado tem:

- separador `;` e as colunas `nome`, `media` e `situacao`, nessa ordem, com cabeçalho;
- `media` com uma casa decimal e **vírgula**: média 7.25 vira `7,2`, média 6 vira `6,0`;
- `situacao` igual a `aprovado` se a média for 5 ou mais, senão `reprovado`.

A função devolve quantos alunos foram escritos.

```python
exportar_relatorio("relatorio.csv", [{"nome": "Ana", "nota1": 7, "nota2": 8}])
```

```text
nome;media;situacao
Ana;7,5;aprovado
```

### Instruções
1. Abra o arquivo com `with`, `"w"`, `encoding="utf-8"` e `newline=""`, e escreva com `csv.DictWriter` usando `;` e as colunas `nome`, `media`, `situacao`, começando pelo cabeçalho.
2. Calcule a média de cada aluno e escreva-a com uma casa decimal e vírgula.
   Dica: `f"{valor:.1f}"` formata com uma casa; depois troque o ponto pela vírgula.
3. Preencha `situacao` (`aprovado` com média 5 ou mais) e devolva a quantidade de alunos escritos.

### Código inicial
```python
import csv


def exportar_relatorio(caminho, alunos):
    pass
```

### Solução
```python
import csv


def exportar_relatorio(caminho, alunos):
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "media", "situacao"], delimiter=";")
        escritor.writeheader()
        for aluno in alunos:
            media = (aluno["nota1"] + aluno["nota2"]) / 2
            situacao = "aprovado" if media >= 5 else "reprovado"
            escritor.writerow({
                "nome": aluno["nome"],
                "media": f"{media:.1f}".replace(".", ","),
                "situacao": situacao,
            })
    return len(alunos)
```

### Dicas
1. Monte, para cada aluno, um dicionário com exatamente as três chaves de `fieldnames`.
2. `f"{6:.1f}"` é `"6.0"`; o `replace` troca o ponto pela vírgula.
3. O limite é inclusivo: média exatamente 5 é aprovado.

### Verificação
```json
[
  { "id": "linhas", "checkpoint": 1, "kind": "expr",
    "setup": "import csv\nn = exportar_relatorio(\"r.csv\", [{\"nome\": \"Ana\", \"nota1\": 7, \"nota2\": 8}, {\"nome\": \"Caio\", \"nota1\": 3, \"nota2\": 4}])\nwith open(\"r.csv\", encoding=\"utf-8\", newline=\"\") as f:\n    linhas = list(csv.reader(f, delimiter=\";\"))",
    "expr": "linhas", "expected": [["nome", "media", "situacao"], ["Ana", "7,5", "aprovado"], ["Caio", "3,5", "reprovado"]],
    "name": "Cabeçalho e uma linha por aluno, separados por ;", "hint": "Use delimiter=\";\" e chame writeheader() antes das linhas." },
  { "id": "formato", "checkpoint": 2, "kind": "expr",
    "setup": "import csv\nexportar_relatorio(\"f.csv\", [{\"nome\": \"Bia\", \"nota1\": 6, \"nota2\": 6}, {\"nome\": \"Davi\", \"nota1\": 9.5, \"nota2\": 10}, {\"nome\": \"Eva\", \"nota1\": 8.5, \"nota2\": 6}])\nwith open(\"f.csv\", encoding=\"utf-8\", newline=\"\") as f:\n    medias = [linha[\"media\"] for linha in csv.DictReader(f, delimiter=\";\")]",
    "expr": "medias", "expected": ["6,0", "9,8", "7,2"],
    "name": "Média com uma casa decimal e vírgula", "hint": "Formate com uma casa antes de trocar o ponto." },
  { "id": "limite", "checkpoint": 3, "kind": "expr",
    "setup": "import csv\nexportar_relatorio(\"l.csv\", [{\"nome\": \"Lia\", \"nota1\": 4, \"nota2\": 6}, {\"nome\": \"Rui\", \"nota1\": 4.8, \"nota2\": 5}])\nwith open(\"l.csv\", encoding=\"utf-8\", newline=\"\") as f:\n    situacoes = [linha[\"situacao\"] for linha in csv.DictReader(f, delimiter=\";\")]",
    "expr": "situacoes", "expected": ["aprovado", "reprovado"],
    "name": "Média exatamente 5 é aprovado; 4,9 é reprovado" },
  { "id": "aspas", "checkpoint": 1, "kind": "expr",
    "setup": "import csv\nexportar_relatorio(\"a.csv\", [{\"nome\": \"Souza; João\", \"nota1\": 10, \"nota2\": 9}])\nwith open(\"a.csv\", encoding=\"utf-8\", newline=\"\") as f:\n    linhas = list(csv.reader(f, delimiter=\";\"))",
    "expr": "linhas[1]", "expected": ["Souza; João", "9,5", "aprovado"],
    "name": "Nome com ; dentro continua num campo só", "hint": "Deixe o csv.DictWriter escrever; ele põe as aspas." },
  { "id": "retorno", "checkpoint": 3, "kind": "expr",
    "setup": "n0 = exportar_relatorio(\"z.csv\", [])\nn3 = exportar_relatorio(\"t.csv\", [{\"nome\": x, \"nota1\": 5, \"nota2\": 5} for x in \"ABC\"])\nvazio = open(\"z.csv\", encoding=\"utf-8\").read().strip()",
    "expr": "[n0, n3, vazio]", "expected": [0, 3, "nome;media;situacao"],
    "name": "Devolve quantos alunos escreveu; turma vazia só tem o cabeçalho" },
  { "id": "newline", "checkpoint": 1, "kind": "expr",
    "setup": "_open_real = open\n_usos = []\ndef open(*args, **kwargs):\n    _usos.append([kwargs.get(\"newline\"), str(kwargs.get(\"encoding\")).lower().replace(\"-\", \"\")])\n    return _open_real(*args, **kwargs)\nexportar_relatorio(\"n.csv\", [{\"nome\": \"Ana\", \"nota1\": 7, \"nota2\": 8}])",
    "expr": "_usos", "expected": [["", "utf8"]],
    "name": "Abre o arquivo com newline=\"\" e encoding utf-8", "hint": "Sem newline=\"\", o Excel no Windows mostra linhas em branco entre os dados." }
]
```

### Soluções erradas
```python name="média com ponto"
import csv


def exportar_relatorio(caminho, alunos):
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "media", "situacao"], delimiter=";")
        escritor.writeheader()
        for aluno in alunos:
            media = (aluno["nota1"] + aluno["nota2"]) / 2
            situacao = "aprovado" if media >= 5 else "reprovado"
            escritor.writerow({"nome": aluno["nome"], "media": round(media, 1), "situacao": situacao})
    return len(alunos)
```
```python name="sem writeheader"
import csv


def exportar_relatorio(caminho, alunos):
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "media", "situacao"], delimiter=";")
        for aluno in alunos:
            media = (aluno["nota1"] + aluno["nota2"]) / 2
            situacao = "aprovado" if media >= 5 else "reprovado"
            escritor.writerow({"nome": aluno["nome"], "media": f"{media:.1f}".replace(".", ","), "situacao": situacao})
    return len(alunos)
```
```python name="vírgula como separador"
import csv


def exportar_relatorio(caminho, alunos):
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "media", "situacao"])
        escritor.writeheader()
        for aluno in alunos:
            media = (aluno["nota1"] + aluno["nota2"]) / 2
            situacao = "aprovado" if media >= 5 else "reprovado"
            escritor.writerow({"nome": aluno["nome"], "media": f"{media:.1f}".replace(".", ","), "situacao": situacao})
    return len(alunos)
```
```python name="monta as linhas com join, sem aspas"
def exportar_relatorio(caminho, alunos):
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        arquivo.write("nome;media;situacao\r\n")
        for aluno in alunos:
            media = (aluno["nota1"] + aluno["nota2"]) / 2
            situacao = "aprovado" if media >= 5 else "reprovado"
            arquivo.write(";".join([aluno["nome"], f"{media:.1f}".replace(".", ","), situacao]) + "\r\n")
    return len(alunos)
```
```python name="esquece o newline"
import csv


def exportar_relatorio(caminho, alunos):
    with open(caminho, "w", encoding="utf-8") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "media", "situacao"], delimiter=";")
        escritor.writeheader()
        for aluno in alunos:
            media = (aluno["nota1"] + aluno["nota2"]) / 2
            situacao = "aprovado" if media >= 5 else "reprovado"
            escritor.writerow({"nome": aluno["nome"], "media": f"{media:.1f}".replace(".", ","), "situacao": situacao})
    return len(alunos)
```
```python name="aprovado só acima de 5"
import csv


def exportar_relatorio(caminho, alunos):
    with open(caminho, "w", encoding="utf-8", newline="") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=["nome", "media", "situacao"], delimiter=";")
        escritor.writeheader()
        for aluno in alunos:
            media = (aluno["nota1"] + aluno["nota2"]) / 2
            situacao = "aprovado" if media > 5 else "reprovado"
            escritor.writerow({"nome": aluno["nome"], "media": f"{media:.1f}".replace(".", ","), "situacao": situacao})
    return len(alunos)
```

## Passo 6 · Exercício · Filtrar um CSV

A secretaria tem um CSV com todos os inscritos de um evento e quer um arquivo só com os de uma cidade, ou só os de um curso. Escreva `filtrar_csv(entrada, saida, coluna, valor)`:

- lê `entrada` (separador `;`) e grava em `saida` (também `;`) o cabeçalho e **só** as linhas em que `coluna` é igual a `valor`;
- a comparação ignora maiúsculas e espaços nas pontas: `"  são paulo "` casa com `"São Paulo"`;
- o arquivo de saída mantém as colunas na **mesma ordem** da entrada, sejam elas quais forem;
- se `coluna` não existir no cabeçalho, levanta `ValueError` com a mensagem `coluna inexistente: <coluna>`;
- devolve quantas linhas foram copiadas.

```python
filtrar_csv("inscritos.csv", "ribeirao.csv", "cidade", "ribeirão preto")   # 2
```

### Instruções
1. Leia a entrada com `csv.DictReader` e escreva a saída com `csv.DictWriter`, os dois com `;`, usando como `fieldnames` as colunas da própria entrada.
   Dica: depois de criado, o `DictReader` tem o atributo `fieldnames` com o cabeçalho.
2. Copie só as linhas em que a coluna, sem espaços nas pontas e em minúsculas, é igual ao valor tratado do mesmo jeito; o cabeçalho é escrito sempre.
3. Levante `ValueError("coluna inexistente: <coluna>")` se a coluna não estiver no cabeçalho, e devolva quantas linhas foram copiadas.

### Código inicial
```python
import csv


def filtrar_csv(entrada, saida, coluna, valor):
    pass
```

### Solução
```python
import csv


def filtrar_csv(entrada, saida, coluna, valor):
    alvo = valor.strip().lower()
    copiadas = 0
    with open(entrada, encoding="utf-8", newline="") as origem:
        leitor = csv.DictReader(origem, delimiter=";")
        colunas = leitor.fieldnames
        if coluna not in colunas:
            raise ValueError(f"coluna inexistente: {coluna}")
        with open(saida, "w", encoding="utf-8", newline="") as destino:
            escritor = csv.DictWriter(destino, fieldnames=colunas, delimiter=";")
            escritor.writeheader()
            for linha in leitor:
                if linha[coluna].strip().lower() == alvo:
                    escritor.writerow(linha)
                    copiadas += 1
    return copiadas
```

### Dicas
1. `leitor.fieldnames` é a lista do cabeçalho, na ordem do arquivo.
2. Chame `writeheader()` antes do laço, fora de qualquer `if`.
3. Teste a coluna antes de abrir a saída: assim um erro não deixa arquivo pela metade.

### Verificação
```json
[
  { "id": "filtra", "checkpoint": 2, "kind": "expr",
    "setup": "import csv\nwith open(\"in.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write(\"nome;cidade;curso\\nAna;Ribeirão Preto;Física\\nBia;São Paulo;Química\\nCaio;ribeirão preto ;Física\\nDavi;Campinas;Física\\n\")\nn = filtrar_csv(\"in.csv\", \"out.csv\", \"cidade\", \" Ribeirão Preto\")\nwith open(\"out.csv\", encoding=\"utf-8\", newline=\"\") as f:\n    linhas = list(csv.reader(f, delimiter=\";\"))",
    "expr": "[n, linhas]", "expected": [2, [["nome", "cidade", "curso"], ["Ana", "Ribeirão Preto", "Física"], ["Caio", "ribeirão preto ", "Física"]]],
    "name": "Copia só as linhas da cidade, ignorando maiúsculas e espaços nas pontas", "hint": "Trate do mesmo jeito o valor da linha e o valor procurado." },
  { "id": "outra-coluna", "checkpoint": 2, "kind": "expr",
    "setup": "import csv\nwith open(\"in.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write(\"nome;cidade;curso\\nAna;Ribeirão Preto;Física\\nBia;São Paulo;Química\\nEva;Santos;QUÍMICA\\n\")\nn = filtrar_csv(\"in.csv\", \"q.csv\", \"curso\", \"química\")\nwith open(\"q.csv\", encoding=\"utf-8\", newline=\"\") as f:\n    nomes = [l[\"nome\"] for l in csv.DictReader(f, delimiter=\";\")]",
    "expr": "[n, nomes]", "expected": [2, ["Bia", "Eva"]], "name": "Filtra por qualquer coluna pedida" },
  { "id": "ordem-colunas", "checkpoint": 1, "kind": "expr",
    "setup": "import csv\nwith open(\"e.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write('turno;email;nome;obs\\nnoite;lia@usp.br;Lia;\"chega; às 19h\"\\ntarde;rui@usp.br;Rui;\\n')\nfiltrar_csv(\"e.csv\", \"s.csv\", \"turno\", \"NOITE\")\nwith open(\"s.csv\", encoding=\"utf-8\", newline=\"\") as f:\n    linhas = list(csv.reader(f, delimiter=\";\"))",
    "expr": "linhas", "expected": [["turno", "email", "nome", "obs"], ["noite", "lia@usp.br", "Lia", "chega; às 19h"]],
    "name": "Mantém as colunas da entrada, na mesma ordem", "hint": "Use as colunas que o DictReader leu, não uma lista fixa." },
  { "id": "nenhuma", "checkpoint": 2, "kind": "expr",
    "setup": "import csv\nwith open(\"in.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write(\"nome;cidade\\nAna;Santos\\n\")\nn = filtrar_csv(\"in.csv\", \"nada.csv\", \"cidade\", \"Bauru\")\nwith open(\"nada.csv\", encoding=\"utf-8\", newline=\"\") as f:\n    linhas = list(csv.reader(f, delimiter=\";\"))",
    "expr": "[n, linhas]", "expected": [0, [["nome", "cidade"]]],
    "name": "Sem nenhuma linha igual, a saída tem só o cabeçalho", "hint": "O cabeçalho é escrito sempre, antes do laço." },
  { "id": "coluna-inexistente", "checkpoint": 3, "kind": "expr",
    "setup": "with open(\"in.csv\", \"w\", encoding=\"utf-8\", newline=\"\") as f:\n    f.write(\"nome;cidade\\nAna;Santos\\n\")",
    "expr": "filtrar_csv(\"in.csv\", \"x.csv\", \"estado\", \"SP\")", "raises": "ValueError", "message_contains": "coluna inexistente: estado",
    "name": "Coluna que não existe levanta ValueError", "hint": "Compare a coluna com o cabeçalho antes de copiar." }
]
```

### Soluções erradas
```python name="colunas fixas na saída"
import csv


def filtrar_csv(entrada, saida, coluna, valor):
    alvo = valor.strip().lower()
    copiadas = 0
    with open(entrada, encoding="utf-8", newline="") as origem:
        leitor = csv.DictReader(origem, delimiter=";")
        if coluna not in leitor.fieldnames:
            raise ValueError(f"coluna inexistente: {coluna}")
        with open(saida, "w", encoding="utf-8", newline="") as destino:
            escritor = csv.DictWriter(destino, fieldnames=["nome", "cidade", "curso"], delimiter=";")
            escritor.writeheader()
            for linha in leitor:
                if linha[coluna].strip().lower() == alvo:
                    escritor.writerow(linha)
                    copiadas += 1
    return copiadas
```
```python name="comparação sensível a maiúsculas e espaços"
import csv


def filtrar_csv(entrada, saida, coluna, valor):
    copiadas = 0
    with open(entrada, encoding="utf-8", newline="") as origem:
        leitor = csv.DictReader(origem, delimiter=";")
        if coluna not in leitor.fieldnames:
            raise ValueError(f"coluna inexistente: {coluna}")
        with open(saida, "w", encoding="utf-8", newline="") as destino:
            escritor = csv.DictWriter(destino, fieldnames=leitor.fieldnames, delimiter=";")
            escritor.writeheader()
            for linha in leitor:
                if linha[coluna] == valor:
                    escritor.writerow(linha)
                    copiadas += 1
    return copiadas
```
```python name="cabeçalho só quando há linha copiada"
import csv


def filtrar_csv(entrada, saida, coluna, valor):
    alvo = valor.strip().lower()
    copiadas = 0
    with open(entrada, encoding="utf-8", newline="") as origem:
        leitor = csv.DictReader(origem, delimiter=";")
        if coluna not in leitor.fieldnames:
            raise ValueError(f"coluna inexistente: {coluna}")
        with open(saida, "w", encoding="utf-8", newline="") as destino:
            escritor = csv.DictWriter(destino, fieldnames=leitor.fieldnames, delimiter=";")
            for linha in leitor:
                if linha[coluna].strip().lower() == alvo:
                    if copiadas == 0:
                        escritor.writeheader()
                    escritor.writerow(linha)
                    copiadas += 1
    return copiadas
```
```python name="não confere a coluna (KeyError no lugar de ValueError)"
import csv


def filtrar_csv(entrada, saida, coluna, valor):
    alvo = valor.strip().lower()
    copiadas = 0
    with open(entrada, encoding="utf-8", newline="") as origem:
        leitor = csv.DictReader(origem, delimiter=";")
        with open(saida, "w", encoding="utf-8", newline="") as destino:
            escritor = csv.DictWriter(destino, fieldnames=leitor.fieldnames, delimiter=";")
            escritor.writeheader()
            for linha in leitor:
                if linha[coluna].strip().lower() == alvo:
                    escritor.writerow(linha)
                    copiadas += 1
    return copiadas
```
```python name="conta o cabeçalho como linha copiada"
import csv


def filtrar_csv(entrada, saida, coluna, valor):
    alvo = valor.strip().lower()
    copiadas = 1
    with open(entrada, encoding="utf-8", newline="") as origem:
        leitor = csv.DictReader(origem, delimiter=";")
        if coluna not in leitor.fieldnames:
            raise ValueError(f"coluna inexistente: {coluna}")
        with open(saida, "w", encoding="utf-8", newline="") as destino:
            escritor = csv.DictWriter(destino, fieldnames=leitor.fieldnames, delimiter=";")
            escritor.writeheader()
            for linha in leitor:
                if linha[coluna].strip().lower() == alvo:
                    escritor.writerow(linha)
                    copiadas += 1
    return copiadas
```

## Passo 7 · Quiz · CSV sem surpresas

### Pergunta
O arquivo `notas.csv` tem a linha `nome,nota` e depois duas linhas de alunos. O que este código imprime?
```python
import csv

with open("notas.csv", encoding="utf-8", newline="") as f:
    print(len(list(csv.reader(f))))
```
- [ ] 2, porque o `reader` pula o cabeçalho
- [x] 3, porque o `reader` entrega o cabeçalho como uma linha comum
- [ ] 6, um item para cada campo
- [ ] Dá erro, porque falta `next(leitor)`
> Quem trata a primeira linha como cabeçalho é o `DictReader`. Com `csv.reader`, o cabeçalho chega como a primeira lista, e você o consome com `next` se não quiser processá-lo.

### Pergunta
Uma planilha exportada pelo Excel em português tem a linha `Caneta;2,50`. Lida com `csv.DictReader(arquivo)`, sem mais argumentos, o que acontece com `float(linha["preco"])`?
- [ ] Funciona e devolve `2.5`
- [ ] Devolve `2.5`, mas só depois de `replace(",", ".")`
- [x] Dá erro antes da conversão: sem `delimiter=";"`, a linha inteira vira um campo só, e a chave `preco` nem existe
- [ ] Devolve `"2,50"` como texto
> O separador padrão é a vírgula. Com `;` no arquivo, o `DictReader` vê uma coluna só, `produto;preco`, e `linha["preco"]` levanta `KeyError`. Corrigido o `delimiter`, ainda falta trocar a vírgula decimal antes do `float`.

### Pergunta
Um colega gerou um CSV no Linux, abrindo o arquivo sem `newline=""`, e ficou perfeito. No Windows, o mesmo programa gera um arquivo que o Excel mostra com uma linha em branco entre cada linha de dados. Por quê?
- [ ] O Windows não suporta o módulo `csv`
- [ ] O `DictWriter` só funciona com `delimiter=";"` no Windows
- [x] O `csv` já termina as linhas com `\r\n` e, sem `newline=""`, o Windows ainda converte o `\n`, gerando `\r\r\n`
- [ ] Faltou `encoding="utf-8"`
> No Windows, um arquivo de texto aberto sem `newline=""` traduz cada `\n` em `\r\n`. Somado ao `\r\n` do `csv`, sobra um `\r` a mais, que o Excel lê como linha vazia. `newline=""` desliga essa tradução.
