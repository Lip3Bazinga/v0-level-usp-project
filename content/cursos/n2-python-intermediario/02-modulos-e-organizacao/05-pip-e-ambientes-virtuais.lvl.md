---
slug: n2-m2-05-pip-e-ambientes-virtuais
titulo: pip, ambientes virtuais e dependências
descricao: Instalar pacotes de terceiros, isolar projetos com venv e registrar dependências em requirements.txt.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 80
tempo_min: 30
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar e ativar um ambiente virtual com venv no Windows, Linux e macOS
- Instalar, listar e remover pacotes com pip e congelar versões em requirements.txt
- Explicar por que cada projeto deve ter seu próprio ambiente
---

## Passo 1 · Leitura · Um projeto, um ambiente

A biblioteca padrão é grande, mas não tem tudo. Para baixar páginas da web, analisar planilhas ou treinar um modelo, você usa **pacotes de terceiros**, escritos por outras pessoas e publicados no **PyPI** (*Python Package Index*, em pypi.org), o repositório público de pacotes Python. Quem baixa e instala esses pacotes é o **pip**, o instalador que vem com o Python:

```text
python -m pip install requests
```

Até aqui, parece simples. O problema aparece no segundo projeto. Imagine:

| Projeto | Precisa de |
|---|---|
| trabalho de Estatística (do semestre passado) | `pandas` 1.5 |
| projeto de iniciação científica (novo) | `pandas` 2.2 |

Instalando tudo direto no Python do computador, a instalação **global**, só pode existir uma versão de cada pacote. Instalar a 2.2 para o projeto novo troca a 1.5 de lugar, e o trabalho antigo, que funcionava, quebra sem você ter mexido nele. Com o tempo, o Python global vira uma gaveta de pacotes de que ninguém lembra a origem.

Pior ainda é instalar no Python do sistema com permissão de administrador (`sudo pip install ...` no Linux ou no macOS). Muitos sistemas usam esse Python nas próprias ferramentas, e trocar um pacote dele pode quebrá-las. Por isso as distribuições Linux recentes recusam a instalação com `error: externally-managed-environment`.

#### A solução: ambiente virtual

Um **ambiente virtual** é uma pasta dentro do projeto com um Python próprio e uma área de pacotes só dele. O que você instala com o ambiente ativo vai para essa pasta e não afeta nenhum outro projeto. Cada projeto tem o seu, com as versões de que precisa:

```text
estatistica/
    .venv/          <- pandas 1.5 mora aqui
    analise.py
iniciacao/
    .venv/          <- pandas 2.2 mora aqui
    modelo.py
```

O módulo que cria ambientes virtuais vem na biblioteca padrão e se chama `venv`. Se algo der errado, apagar a pasta `.venv` e criar de novo resolve; o seu código não está lá dentro.

O ambiente desta plataforma, onde os exercícios rodam, não tem acesso à internet, então os comandos desta lição são para você repetir no seu computador. Os exercícios modelam em Python o que o pip faz com versões e dependências.

## Passo 2 · Leitura · Criar, ativar e usar o venv

Siga este roteiro na pasta do seu projeto, num terminal.

**1. Criar o ambiente** (uma vez por projeto):

```text
python -m venv .venv
```

O `-m venv` roda o módulo `venv` e `.venv` é o nome da pasta criada (o nome é convenção; o ponto deixa a pasta oculta no Linux e no macOS). No Linux e no macOS, o comando costuma ser `python3`; no Windows, `py -m venv .venv` também funciona.

**2. Ativar o ambiente** (em todo terminal novo):

| Sistema | Comando |
|---|---|
| Windows, PowerShell | `.venv\Scripts\Activate.ps1` |
| Windows, Prompt de Comando | `.venv\Scripts\activate.bat` |
| Linux e macOS | `source .venv/bin/activate` |

Ativado, o terminal mostra o nome do ambiente no começo da linha, como `(.venv) PS C:\iniciacao>`, e o comando `python` passa a ser o do ambiente. No PowerShell, se aparecer que a execução de scripts está desabilitada no sistema, rode uma vez `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` e tente de novo.

**3. Instalar e usar.** Com o ambiente ativo, `python -m pip install requests` instala dentro do `.venv`.

**4. Desativar**, quando terminar: `deactivate`.

#### Os três tropeços mais comuns

- **Terminal novo, ambiente desativado.** A ativação vale só para o terminal em que foi feita. Abrir outro e rodar `python analise.py` usa o Python global, e o pacote "some": `ModuleNotFoundError: No module named 'requests'`. Olhe sempre se o `(.venv)` está no começo da linha.
- **O pip de outro Python.** Num computador com mais de um Python, o comando `pip` sozinho pode ser de um Python diferente do comando `python`. Escrever `python -m pip` garante que o pip é o do Python que vai rodar o programa. Use sempre essa forma.
- **Enviar o `.venv` junto com o código.** A pasta tem milhares de arquivos e só funciona no computador em que foi criada. Ela fica de fora do controle de versão: no arquivo `.gitignore`, escreva uma linha `.venv/`. Quem baixar o projeto cria o próprio ambiente.

## Passo 3 · Quiz · O ambiente certo

### Pergunta
A Ana criou o `.venv`, ativou, instalou o `requests` e o programa funcionou. No dia seguinte, abriu um terminal novo, rodou `python app.py` e recebeu `ModuleNotFoundError: No module named 'requests'`. O que aconteceu?
- [ ] O pacote foi apagado ao fechar o terminal
- [x] O ambiente não está ativo no terminal novo, então o `python` usado é o global, que não tem o pacote
- [ ] O `requests` precisa ser instalado de novo todo dia
- [ ] O `.venv` só funciona no Linux
> A ativação vale por terminal. Ativando de novo (`.venv\Scripts\Activate.ps1` ou `source .venv/bin/activate`), o `python` volta a ser o do ambiente, com o pacote instalado.

### Pergunta
Por que é melhor escrever `python -m pip install pandas` do que `pip install pandas`?
- [ ] Porque o comando `pip` sozinho não existe no Windows
- [ ] Porque `-m` instala uma versão mais nova
- [x] Porque garante que o pacote é instalado no mesmo Python que o comando `python` executa
- [ ] Porque `-m` instala o pacote em todos os ambientes ao mesmo tempo
> Com vários Pythons no computador, `pip` e `python` podem apontar para instalações diferentes. `python -m pip` usa o pip do próprio Python que roda o programa.

### Pergunta
Dois projetos no mesmo computador precisam de versões diferentes do `pandas`. Qual é a solução certa?
- [ ] Instalar a versão mais nova globalmente, porque ela é compatível com todo código antigo
- [ ] Instalar com `sudo pip install` para ter permissão de manter duas versões
- [x] Criar um ambiente virtual em cada projeto e instalar em cada um a versão de que ele precisa
- [ ] Trocar a versão com `pip install` toda vez que mudar de projeto
> Uma instalação de Python guarda uma versão de cada pacote. Ambientes virtuais dão a cada projeto a sua própria área de pacotes, sem interferência.

## Passo 4 · Leitura · pip e requirements.txt

Com o ambiente ativo, os comandos do dia a dia são poucos:

| Comando | O que faz |
|---|---|
| `python -m pip install requests` | instala a versão mais recente e as dependências dela |
| `python -m pip install "requests==2.32.3"` | instala exatamente essa versão |
| `python -m pip list` | lista o que está instalado no ambiente |
| `python -m pip uninstall requests` | remove o pacote |
| `python -m pip freeze > requirements.txt` | grava a lista exata de versões num arquivo |
| `python -m pip install -r requirements.txt` | instala tudo o que está no arquivo |

Depois de instalar só o `requests`, o `pip freeze` mostra também os pacotes **de que ele depende**, cada um com a versão exata:

```text
certifi==2024.8.30
charset-normalizer==3.4.0
idna==3.10
requests==2.32.3
urllib3==2.2.3
```

O `>` do terminal manda essa saída para o arquivo `requirements.txt`, que vai junto com o código. Em outra máquina (a sua, daqui a um ano, ou a de quem corrige o trabalho), basta criar um ambiente novo, ativar e rodar `python -m pip install -r requirements.txt` para reconstruir **o mesmo** conjunto de pacotes.

#### Por que fixar as versões

Um `requirements.txt` só com nomes (`requests`, sem versão) instala a versão mais recente do dia. Daqui a seis meses, ela pode ter mudado de comportamento, e o projeto que funcionava deixa de funcionar sem que ninguém tenha mexido no código. Com `==`, a instalação é reproduzível: hoje, amanhã e em qualquer computador.

#### Ferramentas mais novas

`pip` e `venv` são o básico e vêm com o Python. Ferramentas como **uv** e **Poetry** fazem os dois trabalhos num comando só: criam o ambiente, resolvem as versões e gravam um arquivo de travamento (*lock file*) com tudo fixado. O uv é escrito em Rust e instala muito mais rápido. A ideia por trás é a mesma desta lição: um ambiente por projeto e versões registradas num arquivo.

## Passo 5 · Exercício · Leia a saída do pip freeze

Antes de entregar um trabalho, o Caio quer conferir o `requirements.txt` de forma automática. Escreva `dependencias_fixas(texto)`, que recebe o conteúdo do arquivo e devolve um dicionário com o nome de cada pacote e a versão fixada.

Regras:

- Linhas vazias, ou só com espaços, e linhas que começam com `#` (comentários) são ignoradas.
- As demais linhas têm o formato `nome==versão`. Ignore espaços nas pontas da linha e em volta do nome e da versão.
- O nome vai para o dicionário em minúsculas, porque o pip não diferencia `Flask` de `flask`.
- Uma linha sem `==`, como `flask>=3.0` ou `numpy`, não tem versão fixa: levante `ValueError` com a mensagem `sem versão fixa: ` seguida da linha sem os espaços das pontas.

Exemplo: `"Flask==3.0.3\n# web\nidna==3.10\n"` vira `{"flask": "3.0.3", "idna": "3.10"}`.

### Instruções
1. Percorra as linhas do texto, ignorando as vazias e os comentários.
2. Separe nome e versão em cada linha com `==` e monte o dicionário, com o nome em minúsculas e sem espaços sobrando.
3. Levante `ValueError("sem versão fixa: <linha>")` quando uma linha não tiver `==`.

### Código inicial
```python
def dependencias_fixas(texto):
    pass
```

### Solução
```python
def dependencias_fixas(texto):
    versoes = {}
    for linha in texto.splitlines():
        linha = linha.strip()
        if linha == "" or linha.startswith("#"):
            continue
        if "==" not in linha:
            raise ValueError(f"sem versão fixa: {linha}")
        nome, versao = linha.split("==")
        versoes[nome.strip().lower()] = versao.strip()
    return versoes
```

### Dicas
1. `texto.splitlines()` separa as linhas; `strip()` tira os espaços das pontas.
2. `linha.split("==")` devolve uma lista com duas partes: o nome e a versão.
3. Teste a falta de `==` antes de separar: assim você sabe exatamente qual linha citar na mensagem.

### Verificação
```json
[
  { "id": "freeze", "checkpoint": 2, "kind": "call", "function": "dependencias_fixas",
    "args": ["certifi==2024.8.30\ncharset-normalizer==3.4.0\nidna==3.10\nrequests==2.32.3\nurllib3==2.2.3\n"],
    "expected": { "certifi": "2024.8.30", "charset-normalizer": "3.4.0", "idna": "3.10", "requests": "2.32.3", "urllib3": "2.2.3" }, "type": "dict",
    "name": "Lê a saída de um pip freeze", "hint": "A versão é tudo o que vem depois de ==." },
  { "id": "comentarios", "checkpoint": 1, "kind": "call", "function": "dependencias_fixas",
    "args": ["# dependências do trabalho\n\nnumpy==2.1.2\n   \n# fim\n"], "expected": { "numpy": "2.1.2" }, "type": "dict",
    "name": "Ignora comentários e linhas vazias", "hint": "Linhas só com espaços também contam como vazias." },
  { "id": "vazio", "checkpoint": 1, "kind": "call", "function": "dependencias_fixas", "args": [""], "expected": {}, "type": "dict",
    "name": "Texto vazio dá dicionário vazio" },
  { "id": "minusculas-espacos", "checkpoint": 2, "kind": "call", "function": "dependencias_fixas",
    "args": ["  Flask == 3.0.3  \nPyYAML==6.0.2\n"], "expected": { "flask": "3.0.3", "pyyaml": "6.0.2" }, "type": "dict",
    "name": "Nome em minúsculas e sem espaços sobrando", "hint": "Tire os espaços do nome e da versão, e passe o nome para minúsculas." },
  { "id": "sem-versao", "checkpoint": 3, "kind": "expr", "expr": "dependencias_fixas('idna==3.10\\nflask>=3.0\\n')",
    "raises": "ValueError", "message_contains": "sem versão fixa: flask>=3.0",
    "name": "Linha com >= levanta ValueError citando a linha", "hint": "Só == fixa uma versão." },
  { "id": "so-nome", "checkpoint": 3, "kind": "expr", "expr": "dependencias_fixas('  numpy  \\n')",
    "raises": "ValueError", "message_contains": "sem versão fixa: numpy",
    "name": "Linha só com o nome levanta ValueError" }
]
```

### Soluções erradas
```python name="não ignora comentários"
def dependencias_fixas(texto):
    versoes = {}
    for linha in texto.splitlines():
        linha = linha.strip()
        if linha == "":
            continue
        if "==" not in linha:
            raise ValueError(f"sem versão fixa: {linha}")
        nome, versao = linha.split("==")
        versoes[nome.strip().lower()] = versao.strip()
    return versoes
```
```python name="não passa o nome para minúsculas"
def dependencias_fixas(texto):
    versoes = {}
    for linha in texto.splitlines():
        linha = linha.strip()
        if linha == "" or linha.startswith("#"):
            continue
        if "==" not in linha:
            raise ValueError(f"sem versão fixa: {linha}")
        nome, versao = linha.split("==")
        versoes[nome.strip()] = versao.strip()
    return versoes
```
```python name="ignora linhas sem versão em vez de recusar"
def dependencias_fixas(texto):
    versoes = {}
    for linha in texto.splitlines():
        linha = linha.strip()
        if linha == "" or linha.startswith("#") or "==" not in linha:
            continue
        nome, versao = linha.split("==")
        versoes[nome.strip().lower()] = versao.strip()
    return versoes
```
```python name="separa por = simples"
def dependencias_fixas(texto):
    versoes = {}
    for linha in texto.splitlines():
        linha = linha.strip()
        if linha == "" or linha.startswith("#"):
            continue
        if "=" not in linha:
            raise ValueError(f"sem versão fixa: {linha}")
        partes = linha.split("=")
        versoes[partes[0].strip().lower()] = partes[-1].strip()
    return versoes
```

## Passo 6 · Exercício · Compare versões como o pip

Quase todo pacote numera as versões no formato **MAJOR.MINOR.PATCH** (*versionamento semântico*): `2.32.3` é a versão maior 2, menor 32, correção 3. A convenção diz o que esperar de cada atualização:

- **PATCH** (`2.32.3` para `2.32.4`): só correções de defeitos. Atualizar é seguro.
- **MINOR** (`2.32` para `2.33`): recursos novos, sem quebrar o que existia.
- **MAJOR** (`2.x` para `3.0`): mudanças que podem quebrar o seu código.

Por isso é comum pedir uma faixa: `>=2.31,<3` quer dizer "a 2.31 ou mais nova, mas ainda da série 2".

Comparar versões parece fácil, mas como texto dá errado: `"2.10.0" > "2.9.3"` é `False`, porque a comparação de strings vai caractere por caractere e `"1"` vem antes de `"9"`. O certo é comparar **números**, parte por parte, e tuplas fazem exatamente isso: `(2, 10, 0) > (2, 9, 3)` é `True`. Outro detalhe: `2.0` e `2.0.0` são a mesma versão, mas `(2, 0) == (2, 0, 0)` é `False`; complete com zeros até ter três partes.

Escreva duas funções:

- `versao_para_tupla(versao)`: `"2.10.0"` vira `(2, 10, 0)`; `"3"` vira `(3, 0, 0)`.
- `atende(instalada, requisito)`: diz se a versão instalada satisfaz o requisito. O requisito tem uma ou mais condições separadas por vírgula, com os operadores `==`, `>=` ou `<`, e pode ter espaços depois da vírgula. Todas as condições precisam valer. Exemplo: `atende("2.31.0", ">=2.0, <3")` é `True`.

### Instruções
1. Escreva `versao_para_tupla`, devolvendo uma tupla de três inteiros (complete com zeros quando faltarem partes).
2. Em `atende`, compare a versão instalada com cada condição usando as tuplas, para os operadores `==`, `>=` e `<`.
3. Trate requisitos com várias condições separadas por vírgula: devolva `True` só se todas valerem.

### Código inicial
```python
def versao_para_tupla(versao):
    pass


def atende(instalada, requisito):
    pass
```

### Solução
```python
def versao_para_tupla(versao):
    partes = [int(parte) for parte in versao.split(".")]
    while len(partes) < 3:
        partes.append(0)
    return tuple(partes)


def atende(instalada, requisito):
    atual = versao_para_tupla(instalada)
    for condicao in requisito.split(","):
        condicao = condicao.strip()
        if condicao.startswith("=="):
            valida = atual == versao_para_tupla(condicao[2:])
        elif condicao.startswith(">="):
            valida = atual >= versao_para_tupla(condicao[2:])
        else:
            valida = atual < versao_para_tupla(condicao[1:])
        if not valida:
            return False
    return True
```

### Dicas
1. `versao.split(".")` dá as partes como texto; converta cada uma com `int` e complete com zeros até três.
2. Teste o operador com `startswith` e corte a condição com uma fatia para sobrar só a versão.
3. Para várias condições, percorra `requisito.split(",")` e devolva `False` na primeira que falhar.

### Verificação
```json
[
  { "id": "tupla-3", "checkpoint": 1, "kind": "call", "function": "versao_para_tupla", "args": ["2.10.0"], "expected": [2, 10, 0], "type": "tuple",
    "name": "versao_para_tupla('2.10.0') é (2, 10, 0)", "hint": "Converta cada parte para int e devolva uma tupla." },
  { "id": "tupla-1", "checkpoint": 1, "kind": "call", "function": "versao_para_tupla", "args": ["3"], "expected": [3, 0, 0], "type": "tuple",
    "name": "versao_para_tupla('3') é (3, 0, 0)", "hint": "Complete com zeros até ter três partes." },
  { "id": "maior-dois-digitos", "checkpoint": 2, "kind": "call", "function": "atende", "args": ["2.10.0", ">=2.9.3"], "expected": true, "type": "bool",
    "name": "2.10.0 atende >=2.9.3", "hint": "Compare números, não texto." },
  { "id": "igual", "checkpoint": 2, "kind": "call", "function": "atende", "args": ["2.32.3", "==2.32.3"], "expected": true, "type": "bool",
    "name": "2.32.3 atende ==2.32.3" },
  { "id": "igual-nao", "checkpoint": 2, "kind": "call", "function": "atende", "args": ["2.32.4", "==2.32.3"], "expected": false, "type": "bool",
    "name": "2.32.4 não atende ==2.32.3" },
  { "id": "igual-zeros", "checkpoint": 2, "kind": "call", "function": "atende", "args": ["2.0.0", "==2.0"], "expected": true, "type": "bool",
    "name": "2.0.0 atende ==2.0", "hint": "2.0 e 2.0.0 são a mesma versão." },
  { "id": "menor", "checkpoint": 2, "kind": "call", "function": "atende", "args": ["1.26.18", "<2"], "expected": true, "type": "bool",
    "name": "1.26.18 atende <2" },
  { "id": "menor-nao", "checkpoint": 2, "kind": "call", "function": "atende", "args": ["10.1.0", "<9"], "expected": false, "type": "bool",
    "name": "10.1.0 não atende <9" },
  { "id": "faixa-ok", "checkpoint": 3, "kind": "call", "function": "atende", "args": ["2.31.0", ">=2.0, <3"], "expected": true, "type": "bool",
    "name": "2.31.0 atende >=2.0, <3" },
  { "id": "faixa-major", "checkpoint": 3, "kind": "call", "function": "atende", "args": ["3.0.0", ">=2.0,<3"], "expected": false, "type": "bool",
    "name": "3.0.0 não atende >=2.0,<3", "hint": "Todas as condições precisam valer, inclusive a depois da vírgula." },
  { "id": "faixa-abaixo", "checkpoint": 3, "kind": "call", "function": "atende", "args": ["1.9.9", ">=2.0,<3"], "expected": false, "type": "bool",
    "name": "1.9.9 não atende >=2.0,<3" }
]
```

### Soluções erradas
```python name="compara as versões como texto"
def versao_para_tupla(versao):
    partes = [int(parte) for parte in versao.split(".")]
    while len(partes) < 3:
        partes.append(0)
    return tuple(partes)


def atende(instalada, requisito):
    for condicao in requisito.split(","):
        condicao = condicao.strip()
        if condicao.startswith("=="):
            valida = instalada == condicao[2:]
        elif condicao.startswith(">="):
            valida = instalada >= condicao[2:]
        else:
            valida = instalada < condicao[1:]
        if not valida:
            return False
    return True
```
```python name="não completa com zeros"
def versao_para_tupla(versao):
    return tuple(int(parte) for parte in versao.split("."))


def atende(instalada, requisito):
    atual = versao_para_tupla(instalada)
    for condicao in requisito.split(","):
        condicao = condicao.strip()
        if condicao.startswith("=="):
            valida = atual == versao_para_tupla(condicao[2:])
        elif condicao.startswith(">="):
            valida = atual >= versao_para_tupla(condicao[2:])
        else:
            valida = atual < versao_para_tupla(condicao[1:])
        if not valida:
            return False
    return True
```
```python name="só olha a primeira condição"
def versao_para_tupla(versao):
    partes = [int(parte) for parte in versao.split(".")]
    while len(partes) < 3:
        partes.append(0)
    return tuple(partes)


def atende(instalada, requisito):
    atual = versao_para_tupla(instalada)
    condicao = requisito.split(",")[0].strip()
    if condicao.startswith("=="):
        return atual == versao_para_tupla(condicao[2:])
    if condicao.startswith(">="):
        return atual >= versao_para_tupla(condicao[2:])
    return atual < versao_para_tupla(condicao[1:])
```
```python name="não tira os espaços depois da vírgula"
def versao_para_tupla(versao):
    partes = [int(parte) for parte in versao.split(".")]
    while len(partes) < 3:
        partes.append(0)
    return tuple(partes)


def atende(instalada, requisito):
    atual = versao_para_tupla(instalada)
    for condicao in requisito.split(","):
        if condicao.startswith("=="):
            valida = atual == versao_para_tupla(condicao[2:])
        elif condicao.startswith(">="):
            valida = atual >= versao_para_tupla(condicao[2:])
        else:
            valida = atual < versao_para_tupla(condicao[1:])
        if not valida:
            return False
    return True
```

## Passo 7 · Quiz · Dependências

### Pergunta
O que `python -m pip freeze > requirements.txt` grava no arquivo?
- [ ] Só os pacotes que você instalou com `pip install`, sem versões
- [x] Todos os pacotes instalados no ambiente ativo, inclusive as dependências deles, cada um com a versão exata (`nome==versão`)
- [ ] O código-fonte dos pacotes, para usar sem internet
- [ ] A lista de módulos da biblioteca padrão que o projeto importa
> O `freeze` lista o ambiente inteiro com versões fixas, incluindo pacotes que vieram como dependência (como o `idna`, que vem com o `requests`). É isso que torna a instalação reproduzível.

### Pergunta
A Bia baixou o projeto do grupo, que tem um `requirements.txt`. Qual sequência prepara o computador dela para rodar o projeto?
- [ ] Copiar a pasta `.venv` do colega e rodar o programa
- [ ] `python -m pip install requirements.txt` no Python global
- [x] Criar um ambiente com `python -m venv .venv`, ativá-lo e rodar `python -m pip install -r requirements.txt`
- [ ] Instalar cada pacote com a versão mais recente, um por um
> O `.venv` não é transportável e nem deveria estar no repositório. Um ambiente novo mais o `-r requirements.txt` reconstrói exatamente as mesmas versões. Sem o `-r`, o pip tentaria instalar um pacote chamado `requirements.txt`.

### Pergunta
O `requirements.txt` tem `requests==2.32.3` e saiu a versão `3.0.0`. Pelo versionamento semântico, o que se espera da atualização?
- [ ] Nada muda: a versão 3.0.0 só corrige defeitos
- [ ] Recursos novos, sem nenhum risco para o código existente
- [x] Mudanças que podem quebrar o código que usava a série 2, por isso o projeto não deve atualizar sem testar
- [ ] O pip vai atualizar sozinho na próxima instalação, porque `==` aceita versões maiores
> Mudança no número MAJOR sinaliza incompatibilidade possível. Com `==2.32.3`, o pip instala exatamente essa versão; atualizar para a 3.0.0 é uma decisão que pede testes.
