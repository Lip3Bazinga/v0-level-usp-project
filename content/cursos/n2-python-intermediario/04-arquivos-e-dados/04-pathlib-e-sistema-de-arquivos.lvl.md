---
slug: n2-m4-04-pathlib-e-sistema-de-arquivos
titulo: pathlib e o sistema de arquivos
descricao: 'Caminhos como objetos: montar, listar, criar pastas, checar existência e percorrer árvores com Path.'
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
- Construir caminhos com Path e / de forma portável entre sistemas
- Listar, filtrar por extensão e percorrer pastas com iterdir, glob e rglob
- Criar, renomear e remover arquivos e pastas com segurança (exists, mkdir(parents, exist_ok))
---

## Passo 1 · Leitura · Caminhos como objetos

Até aqui os caminhos dos arquivos eram textos: `"vendas.csv"`, `"dados/2025/notas.csv"`. Montar caminhos assim é frágil. O Windows separa pastas com `\`, o Linux e o macOS com `/`, e um `pasta + "/" + nome` esquece uma barra ou põe duas com facilidade. Para separar o nome da extensão, você acabaria com `split(".")`, que erra em `notas.final.csv`.

O módulo `pathlib` trata o caminho como um **objeto** `Path`, que sabe montar e desmontar a si mesmo:

```python
from pathlib import Path

base = Path("dados")
arquivo = base / "2025" / "notas.csv"   # o / junta pedaços do caminho
print(arquivo)            # dados/2025/notas.csv  (no Windows: dados\2025\notas.csv)
print(arquivo.name)       # notas.csv   nome com extensão
print(arquivo.stem)       # notas       nome sem a última extensão
print(arquivo.suffix)     # .csv        a última extensão, com o ponto
print(arquivo.parent)     # dados/2025  a pasta que contém o arquivo
```

O operador `/` aqui não divide nada: entre um `Path` e um texto, ele junta os dois com o separador certo do sistema. O mesmo código funciona no Windows e no Linux. O executor desta plataforma roda em Linux, por isso as saídas usam `/`.

#### Perguntas e atalhos

| Método | Faz |
|---|---|
| `p.exists()` | `True` se existe arquivo ou pasta nesse caminho |
| `p.is_file()` / `p.is_dir()` | existe **e** é arquivo / pasta |
| `p.read_text(encoding="utf-8")` | abre, lê tudo e fecha |
| `p.write_text(texto, encoding="utf-8")` | abre em `"w"`, grava e fecha |
| `p.with_suffix(".json")` | o mesmo caminho com outra extensão |
| `Path.cwd()` | a pasta de trabalho atual |

`read_text` e `write_text` são o `with open(...)` da lição 1 numa linha, para quando você quer o arquivo inteiro. Um `Path` também vai direto no `open`: `open(arquivo, encoding="utf-8")`.

#### Relativo e absoluto

`Path("dados/notas.csv")` é **relativo**: o Python o completa a partir de `Path.cwd()`, a pasta de onde o programa foi executado, que nem sempre é a pasta do arquivo `.py`. `Path("/home/ana/dados/notas.csv")` é **absoluto**: começa da raiz e não depende de onde o programa roda.

#### O erro comum: a barra entre dois textos

O `/` só junta caminhos quando pelo menos um dos lados já é `Path`. Entre dois textos, ele é a divisão de sempre:

```
TypeError: unsupported operand type(s) for /: 'str' and 'str'
```

Comece sempre por `Path(...)`: `Path("dados") / "notas.csv"`.

## Passo 2 · Previsão · As partes de um caminho

O programa monta um caminho com `/` e pergunta por cada parte dele. Nenhum arquivo é criado. Leia sem executar e digite exatamente o que ele imprime, lembrando que o executor roda em Linux.

### Código
```python
from pathlib import Path

p = Path("dados") / "2025" / "notas.final.csv"
print(p)
print(p.name, p.stem, p.suffix)
print(p.parent)
print(p.with_suffix(".json").name)
print(p.exists())
```

### Dicas
1. `stem` tira só a **última** extensão; `suffix` é só a última, com o ponto.
2. `parent` é o caminho sem o último pedaço.
3. Montar um `Path` não cria nada no disco.

### Saída esperada
```text
dados/2025/notas.final.csv
notas.final.csv notas.final .csv
dados/2025
notas.final.json
False
```

## Passo 3 · Leitura · Listar, criar, mover e apagar

#### Listar o que há numa pasta

```python
pasta = Path("fotos")
for item in pasta.iterdir():          # tudo o que está direto na pasta
    print(item.name, item.is_file())

list(pasta.glob("*.jpg"))              # direto na pasta, nome terminando em .jpg
list(pasta.rglob("*.jpg"))             # na pasta e em todas as subpastas
```

`iterdir`, `glob` e `rglob` devolvem objetos `Path`, **em ordem nenhuma garantida**: se a ordem importa, use `sorted`. E eles devolvem pastas também: uma pasta chamada `antigas.jpg` aparece no `glob("*.jpg")`. Filtre com `is_file()` quando só arquivos interessam.

No Linux, `glob("*.jpg")` diferencia maiúsculas: `PRAIA.JPG` fica de fora. Para filtrar extensão sem depender disso, compare `item.suffix.lower() == ".jpg"`.

#### Criar pastas

```python
Path("relatorios/2025/marco").mkdir(parents=True, exist_ok=True)
```

`parents=True` cria as pastas intermediárias que faltarem. `exist_ok=True` aceita que a pasta já exista. Sem ele, a segunda execução do programa quebra:

```
FileExistsError: [Errno 17] File exists: 'relatorios/2025/marco'
```

#### Renomear, mover e apagar

`origem.rename(destino)` renomeia e, se o destino estiver em outra pasta, move. Atenção ao destino: ele é um caminho completo. `arquivo.rename("novo.txt")` leva o arquivo para a **pasta de trabalho**, não para a pasta onde ele estava. Para só trocar o nome, use `arquivo.rename(arquivo.parent / "novo.txt")`.

`arquivo.unlink()` apaga um arquivo e `pasta.rmdir()` apaga uma pasta **vazia**. Não há lixeira: confira com `is_file()` antes de apagar, para não tentar apagar uma pasta ou algo que não existe. Para copiar arquivos ou apagar uma pasta com tudo dentro, o módulo `shutil` tem `shutil.copy` e `shutil.rmtree`, que exigem ainda mais cuidado.

## Passo 4 · Exercício · Fotos por extensão
modo: ordenar

Arraste as linhas para montar `listar_por_extensao(pasta, extensao)` e ajuste a indentação. A função devolve, em ordem alfabética, os **nomes** dos arquivos que estão direto na pasta e têm a extensão pedida, sem diferenciar maiúsculas: `.jpg` encontra `aula.jpg` e `PRAIA.JPG`. Pastas ficam de fora, mesmo que o nome termine em `.jpg`. Duas linhas estão sobrando.

```python
listar_por_extensao("fotos", ".jpg")   # ['PRAIA.JPG', 'aula.jpg']
```

### Instruções
1. Percorra o que está direto na pasta com `iterdir`.
2. Guarde o nome dos itens que são arquivos e cuja extensão, em minúsculas, é igual à pedida, também em minúsculas.
3. Devolva os nomes em ordem alfabética.

### Solução
```python
from pathlib import Path


def listar_por_extensao(pasta, extensao):
    nomes = []
    for item in Path(pasta).iterdir():
        if item.is_file() and item.suffix.lower() == extensao.lower():
            nomes.append(item.name)
    return sorted(nomes)
```

### Distratores
```python
for item in Path(pasta).glob("*" + extensao):
nomes.append(item.stem)
```

### Verificação
```json
[
  { "id": "jpg", "checkpoint": 2, "kind": "expr",
    "setup": "b = Path(\"fotos\")\nb.mkdir()\nfor n in [\"praia.JPG\", \"aula.jpg\", \"notas.txt\", \"zebra.jpeg\", \"b.jpg\"]:\n    (b / n).write_text(\"x\", encoding=\"utf-8\")\n(b / \"velhas.jpg\").mkdir()\n(b / \"velhas.jpg\" / \"c.jpg\").write_text(\"x\", encoding=\"utf-8\")",
    "expr": "listar_por_extensao(\"fotos\", \".jpg\")", "expected": ["aula.jpg", "b.jpg", "praia.JPG"],
    "name": "Acha .jpg e .JPG, sem pastas e sem subpastas", "hint": "Compare a extensão em minúsculas e confira se o item é arquivo." },
  { "id": "maiuscula", "checkpoint": 2, "kind": "expr",
    "setup": "b = Path(\"docs\")\nb.mkdir()\nfor n in [\"ata.txt\", \"Leia.TXT\", \"ata.md\", \"txt\"]:\n    (b / n).write_text(\"x\", encoding=\"utf-8\")",
    "expr": "listar_por_extensao(\"docs\", \".TXT\")", "expected": ["Leia.TXT", "ata.txt"],
    "name": "A extensão pedida também pode vir em maiúsculas" },
  { "id": "ordem", "checkpoint": 3, "kind": "expr",
    "setup": "b = Path(\"csvs\")\nb.mkdir()\nfor n in [\"zeta.csv\", \"alfa.csv\", \"meio.csv\", \"beta.csv\"]:\n    (b / n).write_text(\"x\", encoding=\"utf-8\")",
    "expr": "listar_por_extensao(\"csvs\", \".csv\")", "expected": ["alfa.csv", "beta.csv", "meio.csv", "zeta.csv"],
    "name": "Nomes em ordem alfabética" },
  { "id": "nenhum", "checkpoint": 1, "kind": "expr",
    "setup": "Path(\"vazia\").mkdir()\n(Path(\"vazia\") / \"a.png\").write_text(\"x\", encoding=\"utf-8\")",
    "expr": "listar_por_extensao(\"vazia\", \".jpg\")", "expected": [], "type": "list",
    "name": "Sem arquivos da extensão, devolve lista vazia" }
]
```

### Soluções erradas
```python name="glob diferencia maiúsculas e pega pastas"
from pathlib import Path


def listar_por_extensao(pasta, extensao):
    nomes = []
    for item in Path(pasta).glob("*" + extensao):
        nomes.append(item.name)
    return sorted(nomes)
```
```python name="não filtra as pastas"
from pathlib import Path


def listar_por_extensao(pasta, extensao):
    nomes = []
    for item in Path(pasta).iterdir():
        if item.suffix.lower() == extensao.lower():
            nomes.append(item.name)
    return sorted(nomes)
```
```python name="rglob entra nas subpastas"
from pathlib import Path


def listar_por_extensao(pasta, extensao):
    nomes = []
    for item in Path(pasta).rglob("*"):
        if item.is_file() and item.suffix.lower() == extensao.lower():
            nomes.append(item.name)
    return sorted(nomes)
```
```python name="compara a extensão sem lower"
from pathlib import Path


def listar_por_extensao(pasta, extensao):
    nomes = []
    for item in Path(pasta).iterdir():
        if item.is_file() and item.suffix == extensao:
            nomes.append(item.name)
    return sorted(nomes)
```
```python name="devolve o nome sem extensão"
from pathlib import Path


def listar_por_extensao(pasta, extensao):
    nomes = []
    for item in Path(pasta).iterdir():
        if item.is_file() and item.suffix.lower() == extensao.lower():
            nomes.append(item.stem)
    return sorted(nomes)
```

## Passo 5 · Exercício · Organizar a pasta de downloads

A pasta de downloads virou uma bagunça. Escreva `organizar_por_extensao(pasta)`, que move cada **arquivo** que está direto na pasta para uma subpasta com o nome da extensão, sem o ponto e em minúsculas:

```text
antes                      depois
downloads/                 downloads/
    aula.PDF                   pdf/aula.PDF
    foto.jpg                   jpg/foto.jpg
    LEIAME                     outros/LEIAME
    projetos/x.py              projetos/x.py
```

- arquivo sem extensão vai para `outros`;
- subpastas que já estão lá ficam onde estão, com o conteúdo intacto, e uma subpasta que já existe com o nome certo é reaproveitada;
- a função devolve um dicionário `{subpasta: quantidade de arquivos movidos}`, e rodá-la de novo na pasta já organizada não move nada (devolve `{}`).

### Instruções
1. Percorra os itens da pasta e trate só os arquivos; as subpastas não se movem.
   Dica: guarde a lista com `sorted(pasta.iterdir())` antes de começar a mover.
2. Descubra o nome da subpasta: a extensão sem o ponto, em minúsculas, ou `outros` se não houver extensão. Crie-a sem quebrar se ela já existir.
3. Mova o arquivo para dentro da subpasta, mantendo o nome, e conte os movidos por subpasta no dicionário devolvido.

### Código inicial
```python
from pathlib import Path


def organizar_por_extensao(pasta):
    pass
```

### Solução
```python
from pathlib import Path


def organizar_por_extensao(pasta):
    pasta = Path(pasta)
    movidos = {}
    for item in sorted(pasta.iterdir()):
        if not item.is_file():
            continue
        if item.suffix:
            nome = item.suffix[1:].lower()
        else:
            nome = "outros"
        destino = pasta / nome
        destino.mkdir(exist_ok=True)
        item.rename(destino / item.name)
        movidos[nome] = movidos.get(nome, 0) + 1
    return movidos
```

### Dicas
1. `item.suffix[1:]` tira o ponto do começo da extensão.
2. `mkdir(exist_ok=True)` não quebra quando a pasta já existe.
3. O destino do `rename` é `pasta / nome / item.name`: o caminho completo, não só o nome.

### Verificação
```json
[
  { "id": "arvore", "checkpoint": 3, "kind": "expr",
    "setup": "d = Path(\"dl\")\n(d / \"txt\").mkdir(parents=True)\n(d / \"projetos\").mkdir()\n(d / \"txt\" / \"velho.txt\").write_text(\"v\", encoding=\"utf-8\")\n(d / \"projetos\" / \"x.py\").write_text(\"p\", encoding=\"utf-8\")\nfor n in [\"a.txt\", \"B.TXT\", \"foto.jpg\", \"LEIAME\"]:\n    (d / n).write_text(n, encoding=\"utf-8\")\nr = organizar_por_extensao(\"dl\")",
    "expr": "sorted(p.relative_to(d).as_posix() for p in d.rglob(\"*\") if p.is_file())",
    "expected": ["jpg/foto.jpg", "outros/LEIAME", "projetos/x.py", "txt/B.TXT", "txt/a.txt", "txt/velho.txt"],
    "name": "Cada arquivo vai para a subpasta da extensão; subpastas ficam onde estão", "hint": "Mova só arquivos, para pasta / extensão / nome." },
  { "id": "contagem", "checkpoint": 3, "kind": "expr",
    "setup": "d = Path(\"dl\")\nd.mkdir()\nfor n in [\"a.csv\", \"b.CSV\", \"c.csv\", \"mapa.png\", \"Makefile\"]:\n    (d / n).write_text(\"x\", encoding=\"utf-8\")\nr = organizar_por_extensao(d)",
    "expr": "r", "expected": { "csv": 3, "png": 1, "outros": 1 },
    "name": "Devolve quantos arquivos foram para cada subpasta" },
  { "id": "minusculas", "checkpoint": 2, "kind": "expr",
    "setup": "d = Path(\"dl\")\nd.mkdir()\n(d / \"AULA.PDF\").write_text(\"x\", encoding=\"utf-8\")\n(d / \"lista.pdf\").write_text(\"y\", encoding=\"utf-8\")\norganizar_por_extensao(\"dl\")",
    "expr": "sorted(p.name for p in d.iterdir())", "expected": ["pdf"],
    "name": "PDF e pdf vão para a mesma subpasta pdf, sem ponto", "hint": "Tire o ponto e passe para minúsculas." },
  { "id": "conteudo", "checkpoint": 3, "kind": "expr",
    "setup": "d = Path(\"dl\")\nd.mkdir()\n(d / \"ata.md\").write_text(\"Reunião de 10/03\", encoding=\"utf-8\")\norganizar_por_extensao(\"dl\")",
    "expr": "[(d / \"md\" / \"ata.md\").read_text(encoding=\"utf-8\"), (d / \"ata.md\").exists(), Path(\"ata.md\").exists()]",
    "expected": ["Reunião de 10/03", false, false],
    "name": "O arquivo é movido para dentro da subpasta, com o conteúdo", "hint": "O destino do rename precisa incluir a pasta e a subpasta." },
  { "id": "de-novo", "checkpoint": 1, "kind": "expr",
    "setup": "d = Path(\"dl\")\nd.mkdir()\nfor n in [\"a.txt\", \"b.txt\", \"NOTAS\"]:\n    (d / n).write_text(\"x\", encoding=\"utf-8\")\norganizar_por_extensao(\"dl\")\nsegunda = organizar_por_extensao(\"dl\")",
    "expr": "[segunda, sorted(p.relative_to(d).as_posix() for p in d.rglob(\"*\") if p.is_file())]",
    "expected": [{}, ["outros/NOTAS", "txt/a.txt", "txt/b.txt"]],
    "name": "Rodar de novo na pasta organizada não move nada", "hint": "Pule tudo o que não for arquivo." }
]
```

### Soluções erradas
```python name="mkdir sem exist_ok"
from pathlib import Path


def organizar_por_extensao(pasta):
    pasta = Path(pasta)
    movidos = {}
    for item in sorted(pasta.iterdir()):
        if not item.is_file():
            continue
        if item.suffix:
            nome = item.suffix[1:].lower()
        else:
            nome = "outros"
        destino = pasta / nome
        destino.mkdir()
        item.rename(destino / item.name)
        movidos[nome] = movidos.get(nome, 0) + 1
    return movidos
```
```python name="move as subpastas também"
from pathlib import Path


def organizar_por_extensao(pasta):
    pasta = Path(pasta)
    movidos = {}
    for item in sorted(pasta.iterdir()):
        if item.suffix:
            nome = item.suffix[1:].lower()
        else:
            nome = "outros"
        destino = pasta / nome
        if item == destino:
            continue
        destino.mkdir(exist_ok=True)
        item.rename(destino / item.name)
        movidos[nome] = movidos.get(nome, 0) + 1
    return movidos
```
```python name="não passa para minúsculas"
from pathlib import Path


def organizar_por_extensao(pasta):
    pasta = Path(pasta)
    movidos = {}
    for item in sorted(pasta.iterdir()):
        if not item.is_file():
            continue
        if item.suffix:
            nome = item.suffix[1:]
        else:
            nome = "outros"
        destino = pasta / nome
        destino.mkdir(exist_ok=True)
        item.rename(destino / item.name)
        movidos[nome] = movidos.get(nome, 0) + 1
    return movidos
```
```python name="subpasta com o ponto"
from pathlib import Path


def organizar_por_extensao(pasta):
    pasta = Path(pasta)
    movidos = {}
    for item in sorted(pasta.iterdir()):
        if not item.is_file():
            continue
        nome = item.suffix.lower() or "outros"
        destino = pasta / nome
        destino.mkdir(exist_ok=True)
        item.rename(destino / item.name)
        movidos[nome] = movidos.get(nome, 0) + 1
    return movidos
```
```python name="rename só com o nome leva o arquivo para a pasta de trabalho"
from pathlib import Path


def organizar_por_extensao(pasta):
    pasta = Path(pasta)
    movidos = {}
    for item in sorted(pasta.iterdir()):
        if not item.is_file():
            continue
        if item.suffix:
            nome = item.suffix[1:].lower()
        else:
            nome = "outros"
        destino = pasta / nome
        destino.mkdir(exist_ok=True)
        item.rename(item.name)
        movidos[nome] = movidos.get(nome, 0) + 1
    return movidos
```

## Passo 6 · Exercício · Renomear fotos em lote

Depois da viagem, as fotos têm nomes como `IMG_2041.JPG` e `foto (3).png`. Escreva `renomear_em_lote(pasta, prefixo)`, que renomeia os **arquivos** que estão direto na pasta para `<prefixo>-01<extensão>`, `<prefixo>-02<extensão>` e assim por diante:

- a numeração segue a ordem alfabética dos nomes antigos, **sem diferenciar maiúsculas**;
- o número tem sempre dois dígitos (`01`, `02`… `12`);
- a extensão é mantida, em minúsculas;
- os arquivos continuam **na mesma pasta**, e subpastas não são renomeadas;
- a função devolve a lista dos nomes novos, na ordem da numeração.

```python
# fotos/ tem b.JPG, a.png, C.txt e a subpasta extras/
renomear_em_lote("fotos", "ferias")
# ['ferias-01.png', 'ferias-02.jpg', 'ferias-03.txt']
```

Pode supor que nenhum arquivo da pasta já usa o prefixo.

### Instruções
1. Separe os arquivos da pasta (sem as subpastas) e ordene-os pelo nome em minúsculas.
   Dica: `sorted(lista, key=lambda p: p.name.lower())`.
2. Monte cada nome novo com o prefixo, o número com dois dígitos e a extensão em minúsculas.
   Dica: `f"{3:02d}"` é `"03"`.
3. Renomeie cada arquivo dentro da própria pasta e devolva a lista dos nomes novos.

### Código inicial
```python
from pathlib import Path


def renomear_em_lote(pasta, prefixo):
    pass
```

### Solução
```python
from pathlib import Path


def renomear_em_lote(pasta, prefixo):
    pasta = Path(pasta)
    arquivos = [item for item in pasta.iterdir() if item.is_file()]
    arquivos = sorted(arquivos, key=lambda p: p.name.lower())
    novos = []
    for numero, arquivo in enumerate(arquivos, start=1):
        novo_nome = f"{prefixo}-{numero:02d}{arquivo.suffix.lower()}"
        arquivo.rename(pasta / novo_nome)
        novos.append(novo_nome)
    return novos
```

### Dicas
1. `enumerate(arquivos, start=1)` dá o número e o arquivo a cada volta, começando em 1.
2. `arquivo.rename(novo_nome)` sozinho leva o arquivo para a pasta de trabalho: junte a pasta ao nome novo.
3. Sem `key`, o `sorted` põe todas as maiúsculas antes das minúsculas.

### Verificação
```json
[
  { "id": "nomes", "checkpoint": 2, "kind": "expr",
    "setup": "d = Path(\"fotos\")\n(d / \"extras\").mkdir(parents=True)\n(d / \"extras\" / \"z.txt\").write_text(\"z\", encoding=\"utf-8\")\nfor n in [\"b.JPG\", \"a.png\", \"C.txt\"]:\n    (d / n).write_text(\"conteúdo \" + n, encoding=\"utf-8\")\nr = renomear_em_lote(\"fotos\", \"ferias\")",
    "expr": "r", "expected": ["ferias-01.png", "ferias-02.jpg", "ferias-03.txt"],
    "name": "Nomes novos na ordem alfabética, ignorando maiúsculas", "hint": "Ordene pelo nome em minúsculas e baixe a extensão." },
  { "id": "arvore", "checkpoint": 3, "kind": "expr",
    "setup": "d = Path(\"fotos\")\n(d / \"extras\").mkdir(parents=True)\n(d / \"extras\" / \"z.txt\").write_text(\"z\", encoding=\"utf-8\")\nfor n in [\"b.JPG\", \"a.png\", \"C.txt\"]:\n    (d / n).write_text(\"conteúdo \" + n, encoding=\"utf-8\")\nrenomear_em_lote(\"fotos\", \"ferias\")",
    "expr": "[sorted(p.relative_to(d).as_posix() for p in d.rglob(\"*\")), (d / \"ferias-02.jpg\").read_text(encoding=\"utf-8\"), sorted(p.name for p in Path(\".\").glob(\"ferias-*\"))]",
    "expected": [["extras", "extras/z.txt", "ferias-01.png", "ferias-02.jpg", "ferias-03.txt"], "conteúdo b.JPG", []],
    "name": "Os arquivos ficam na mesma pasta, com o conteúdo, e a subpasta não muda", "hint": "O destino do rename é pasta / nome_novo." },
  { "id": "dois-digitos", "checkpoint": 2, "kind": "expr",
    "setup": "d = Path(\"scan\")\nd.mkdir()\nfor i in range(12):\n    (d / f\"pagina{i:03d}.PDF\").write_text(\"x\", encoding=\"utf-8\")\nr = renomear_em_lote(\"scan\", \"apostila\")",
    "expr": "[len(r), r[0], r[8], r[11]]", "expected": [12, "apostila-01.pdf", "apostila-09.pdf", "apostila-12.pdf"],
    "name": "Número sempre com dois dígitos, começando em 01" },
  { "id": "sem-extensao", "checkpoint": 2, "kind": "expr",
    "setup": "d = Path(\"misto\")\nd.mkdir()\n(d / \"LEIAME\").write_text(\"x\", encoding=\"utf-8\")\n(d / \"dados.Csv\").write_text(\"x\", encoding=\"utf-8\")\nr = renomear_em_lote(\"misto\", \"arq\")",
    "expr": "[r, sorted(p.name for p in d.iterdir())]", "expected": [["arq-01.csv", "arq-02"], ["arq-01.csv", "arq-02"]],
    "name": "Arquivo sem extensão fica sem extensão" },
  { "id": "vazia", "checkpoint": 3, "kind": "expr",
    "setup": "Path(\"nada\").mkdir()\n(Path(\"nada\") / \"sub\").mkdir()",
    "expr": "[renomear_em_lote(\"nada\", \"x\"), sorted(p.name for p in Path(\"nada\").iterdir())]", "expected": [[], ["sub"]],
    "name": "Pasta só com subpasta: nada é renomeado" }
]
```

### Soluções erradas
```python name="rename só com o nome novo"
from pathlib import Path


def renomear_em_lote(pasta, prefixo):
    pasta = Path(pasta)
    arquivos = [item for item in pasta.iterdir() if item.is_file()]
    arquivos = sorted(arquivos, key=lambda p: p.name.lower())
    novos = []
    for numero, arquivo in enumerate(arquivos, start=1):
        novo_nome = f"{prefixo}-{numero:02d}{arquivo.suffix.lower()}"
        arquivo.rename(novo_nome)
        novos.append(novo_nome)
    return novos
```
```python name="ordena diferenciando maiúsculas"
from pathlib import Path


def renomear_em_lote(pasta, prefixo):
    pasta = Path(pasta)
    arquivos = sorted(item for item in pasta.iterdir() if item.is_file())
    novos = []
    for numero, arquivo in enumerate(arquivos, start=1):
        novo_nome = f"{prefixo}-{numero:02d}{arquivo.suffix.lower()}"
        arquivo.rename(pasta / novo_nome)
        novos.append(novo_nome)
    return novos
```
```python name="renomeia as subpastas também"
from pathlib import Path


def renomear_em_lote(pasta, prefixo):
    pasta = Path(pasta)
    itens = sorted(pasta.iterdir(), key=lambda p: p.name.lower())
    novos = []
    for numero, item in enumerate(itens, start=1):
        novo_nome = f"{prefixo}-{numero:02d}{item.suffix.lower()}"
        item.rename(pasta / novo_nome)
        novos.append(novo_nome)
    return novos
```
```python name="número sem zero à esquerda"
from pathlib import Path


def renomear_em_lote(pasta, prefixo):
    pasta = Path(pasta)
    arquivos = [item for item in pasta.iterdir() if item.is_file()]
    arquivos = sorted(arquivos, key=lambda p: p.name.lower())
    novos = []
    for numero, arquivo in enumerate(arquivos, start=1):
        novo_nome = f"{prefixo}-{numero}{arquivo.suffix.lower()}"
        arquivo.rename(pasta / novo_nome)
        novos.append(novo_nome)
    return novos
```
```python name="mantém a extensão em maiúsculas"
from pathlib import Path


def renomear_em_lote(pasta, prefixo):
    pasta = Path(pasta)
    arquivos = [item for item in pasta.iterdir() if item.is_file()]
    arquivos = sorted(arquivos, key=lambda p: p.name.lower())
    novos = []
    for numero, arquivo in enumerate(arquivos, start=1):
        novo_nome = f"{prefixo}-{numero:02d}{arquivo.suffix}"
        arquivo.rename(pasta / novo_nome)
        novos.append(novo_nome)
    return novos
```
```python name="numeração começa em 00"
from pathlib import Path


def renomear_em_lote(pasta, prefixo):
    pasta = Path(pasta)
    arquivos = [item for item in pasta.iterdir() if item.is_file()]
    arquivos = sorted(arquivos, key=lambda p: p.name.lower())
    novos = []
    for numero, arquivo in enumerate(arquivos):
        novo_nome = f"{prefixo}-{numero:02d}{arquivo.suffix.lower()}"
        arquivo.rename(pasta / novo_nome)
        novos.append(novo_nome)
    return novos
```

## Passo 7 · Quiz · Caminhos sem tropeço

### Pergunta
O que `Path("relatorios") / "2025" / "vendas.csv"` produz?
- [ ] O número resultante de dividir os textos
- [x] Um `Path` com o caminho `relatorios/2025/vendas.csv`, com o separador do sistema
- [ ] `TypeError`, porque não dá para usar `/` com texto
- [ ] O texto `"relatorios/2025/vendas.csv"`, igual em qualquer sistema
> Com um `Path` à esquerda, o `/` junta os pedaços e devolve outro `Path`. No Windows ele aparece com `\`. O `TypeError` acontece só entre dois textos: `"relatorios" / "2025"`.

### Pergunta
Um programa cria a pasta de saída com `Path("saida").mkdir()`. Na primeira execução funciona; na segunda, quebra. Qual é a correção?
- [ ] Apagar a pasta no fim de cada execução
- [ ] Trocar por `Path("saida").mkdir(parents=True)`
- [x] Trocar por `Path("saida").mkdir(exist_ok=True)`
- [ ] Trocar por `Path("saida").touch()`
> Sem `exist_ok=True`, criar uma pasta que já existe levanta `FileExistsError`. `parents=True` resolve outro problema: pastas intermediárias que faltam.

### Pergunta
O arquivo `fotos/IMG_01.jpg` existe e o programa roda na pasta do projeto. Para onde vai o arquivo depois de `Path("fotos/IMG_01.jpg").rename("praia.jpg")`?
- [ ] `fotos/praia.jpg`: o `rename` só troca o nome
- [x] `praia.jpg` na pasta de trabalho, fora de `fotos`
- [ ] Nada acontece: o `rename` exige um `Path`, não um texto
- [ ] Ele é copiado, e o original continua em `fotos`
> O destino do `rename` é um caminho completo, e `"praia.jpg"` é relativo à pasta de trabalho. Para renomear no lugar: `p.rename(p.parent / "praia.jpg")`.
