---
slug: n2-m3-04-logging
titulo: 'logging: registrar o que o programa faz'
descricao: Substituir prints de depuração por logging com níveis, formatação e handlers.
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
- Configurar o módulo logging com níveis e formato
- Escolher o nível certo (debug, info, warning, error, exception) em cada situação
- Registrar exceções com traceback usando logging.exception
---

## Passo 1 · Leitura · Do print ao logging

Um script roda toda noite e importa as vendas do dia. Para depurar, você encheu o código de `print("chegou aqui", valor)`. Funciona no seu computador, mas vira problema quando o script está em produção (rodando sozinho, de verdade):

- para desligar os prints de depuração, é preciso apagar ou comentar cada um;
- eles se misturam com a saída que importa, e não dá para saber o que é detalhe e o que é alarme;
- o que um `print` mostra não diz de onde a mensagem veio nem quão grave ela é.

O módulo `logging` resolve os três. Cada mensagem tem um **nível de gravidade**, e uma única linha de configuração decide a partir de qual nível as mensagens aparecem:

| Nível | Use para | Exemplo |
|---|---|---|
| `DEBUG` | detalhes para quem está depurando | `valor lido: '12,50'` |
| `INFO` | marcos normais do programa | `142 vendas importadas` |
| `WARNING` | algo estranho, mas o programa segue | `venda com valor zero ignorada` |
| `ERROR` | uma operação falhou | `linha 7 inválida` |
| `CRITICAL` | o programa não consegue continuar | `banco de dados inacessível` |

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
log = logging.getLogger("importador")

log.debug("valor lido: %r", "12,50")
log.info("%d vendas importadas", 142)
```

```
INFO:importador:142 vendas importadas
```

- `basicConfig` configura o registro: `level` é o nível mínimo exibido (o `debug` acima ficou de fora) e `format` monta cada linha com campos como `%(levelname)s` (o nível), `%(name)s` (o nome do logger) e `%(message)s` (a mensagem).
- `getLogger("importador")` cria um *logger*, o objeto que registra as mensagens, com um nome que aparece na linha. Num módulo, o costume é `getLogger(__name__)`: cada arquivo ganha o próprio nome.
- Os valores vão **separados** da mensagem, com `%s`, `%d` ou `%r` marcando onde entram, como em `log.info("%d vendas importadas", 142)`.

Por padrão os registros vão para a saída de erro (`stderr`), separados do que o programa imprime.

#### O erro comum: registrar antes de configurar

Sem configuração, o nível mínimo é `WARNING`. A armadilha: `logging.info(...)` chamado **antes** do `basicConfig` configura o registro sozinho, com esse padrão, e o seu `basicConfig` posterior é **ignorado** sem aviso. Chame `basicConfig` uma vez, no começo do programa, antes de qualquer mensagem.

## Passo 2 · Previsão · Quais mensagens passam

Este programa manda as mensagens para a saída normal (`stream=sys.stdout`), para você ver o que passa pelo filtro. Repare no segundo `basicConfig`. Leia o código sem executar e digite exatamente o que ele imprime.

### Código
```python
import logging
import sys

logging.basicConfig(stream=sys.stdout, level=logging.WARNING, format="%(levelname)s - %(name)s - %(message)s")
log = logging.getLogger("caixa")

log.debug("gaveta aberta")
log.info("venda: %s reais", 12)
log.warning("moedas de 1 real: só %d", 3)
log.error("cartão recusado")

logging.basicConfig(level=logging.DEBUG)
log.info("venda: %s reais", 5)
log.critical("caixa travou")
print("fim do turno")
```

### Dicas
1. Com `level=logging.WARNING`, só passam `WARNING`, `ERROR` e `CRITICAL`.
2. O segundo `basicConfig` encontra o registro já configurado.
3. O `%d` e o `%s` são trocados pelos valores passados depois da mensagem.

### Saída esperada
```text
WARNING - caixa - moedas de 1 real: só 3
ERROR - caixa - cartão recusado
CRITICAL - caixa - caixa travou
fim do turno
```

## Passo 3 · Exercício · Fechamento do caixa com níveis
modo: lacunas

A função `fechar_caixa(vendas)` soma as vendas do dia. Venda com valor zero ou negativo é ignorada. Antes, cada caso tinha um `print`; agora cada mensagem tem o seu nível:

- o registro de **cada venda** é detalhe de depuração;
- uma **venda ignorada** é estranha, mas o fechamento segue;
- o **total do dia** é um marco normal.

O programa deve mostrar do nível `INFO` para cima. Com `fechar_caixa([10, -3, 5])`, os registros ficam:

```
WARNING | caixa | venda ignorada: -3
INFO | caixa | total do dia: 15
```

Complete as três lacunas (`___`). A correção lê o que o `logging` registra; não use `print`.

### Instruções
1. Configure o registro para mostrar a partir de `INFO`.
2. Registre a venda ignorada com o nível de "algo estranho, mas segue".
3. Registre cada venda válida com o nível de depuração, que fica oculto nessa configuração.

### Código inicial
```python
import logging

logging.basicConfig(level=logging.___, format="%(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("caixa")


def fechar_caixa(vendas):
    total = 0
    for valor in vendas:
        if valor <= 0:
            log.___("venda ignorada: %s", valor)
            continue
        log.___("venda registrada: %s", valor)
        total += valor
    log.info("total do dia: %s", total)
    return total
```

### Solução
```python
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("caixa")


def fechar_caixa(vendas):
    total = 0
    for valor in vendas:
        if valor <= 0:
            log.warning("venda ignorada: %s", valor)
            continue
        log.debug("venda registrada: %s", valor)
        total += valor
    log.info("total do dia: %s", total)
    return total
```

### Dicas
1. Os nomes dos níveis em `logging` são em maiúsculas (`logging.INFO`); os métodos do logger, em minúsculas (`log.info`).
2. Com o nível mínimo em `INFO`, as mensagens `debug` não aparecem, e é isso que se quer para o detalhe de cada venda.
3. Confira a tabela da leitura: "estranho, mas o programa segue" é `WARNING`.

### Verificação
```json
[
  { "id": "sem-print", "checkpoint": 1, "kind": "source", "rule": { "type": "not_calls", "name": "print" },
    "name": "Não usa print", "hint": "Registre tudo pelo logger." },
  { "id": "total", "checkpoint": 1, "kind": "call", "function": "fechar_caixa", "args": [[20, 0, 7, -1]], "expected": 27,
    "name": "fechar_caixa([20, 0, 7, -1]) devolve 27" },
  { "id": "nivel-info", "checkpoint": 1, "kind": "expr",
    "setup": "import logging, sys\nfor h in logging.getLogger().handlers:\n    h.setStream(sys.stdout)",
    "expr": "fechar_caixa([4, 6])", "expected_stdout": "INFO | caixa | total do dia: 10", "match": "trimmed",
    "name": "Sem vendas estranhas, só o total aparece", "hint": "O nível mínimo precisa deixar o INFO passar e esconder o DEBUG." },
  { "id": "ignoradas", "checkpoint": 2, "kind": "expr",
    "setup": "import logging, sys\nfor h in logging.getLogger().handlers:\n    h.setStream(sys.stdout)",
    "expr": "fechar_caixa([20, 0, 7, -1])",
    "expected_stdout": "WARNING | caixa | venda ignorada: 0\nWARNING | caixa | venda ignorada: -1\nINFO | caixa | total do dia: 27", "match": "trimmed",
    "name": "Vendas ignoradas aparecem como WARNING, antes do total" },
  { "id": "debug-oculto", "checkpoint": 3, "kind": "expr",
    "setup": "import logging, sys\nfor h in logging.getLogger().handlers:\n    h.setStream(sys.stdout)\nlogging.getLogger().setLevel(logging.DEBUG)",
    "expr": "fechar_caixa([8, -2])",
    "expected_stdout": "DEBUG | caixa | venda registrada: 8\nWARNING | caixa | venda ignorada: -2\nINFO | caixa | total do dia: 8", "match": "trimmed",
    "name": "Cada venda válida é registrada como DEBUG", "hint": "O detalhe de cada venda é o nível de depuração." }
]
```

### Soluções erradas
```python name="nível mínimo DEBUG mostra o detalhe"
import logging

logging.basicConfig(level=logging.DEBUG, format="%(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("caixa")


def fechar_caixa(vendas):
    total = 0
    for valor in vendas:
        if valor <= 0:
            log.warning("venda ignorada: %s", valor)
            continue
        log.debug("venda registrada: %s", valor)
        total += valor
    log.info("total do dia: %s", total)
    return total
```
```python name="nível mínimo WARNING esconde o total"
import logging

logging.basicConfig(level=logging.WARNING, format="%(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("caixa")


def fechar_caixa(vendas):
    total = 0
    for valor in vendas:
        if valor <= 0:
            log.warning("venda ignorada: %s", valor)
            continue
        log.debug("venda registrada: %s", valor)
        total += valor
    log.info("total do dia: %s", total)
    return total
```
```python name="níveis trocados"
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
log = logging.getLogger("caixa")


def fechar_caixa(vendas):
    total = 0
    for valor in vendas:
        if valor <= 0:
            log.debug("venda ignorada: %s", valor)
            continue
        log.warning("venda registrada: %s", valor)
        total += valor
    log.info("total do dia: %s", total)
    return total
```

## Passo 4 · Leitura · Registrar exceções

Quando uma operação falha dentro de um `except`, você quer duas coisas no registro: a sua mensagem, dizendo **o que** o programa tentava fazer, e o traceback, dizendo **onde** quebrou. `log.exception` faz as duas:

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
log = logging.getLogger("importador")


def converter(texto):
    try:
        return int(texto)
    except ValueError:
        log.exception("não deu para converter %r", texto)
        return None
```

`converter("doze")` registra:

```
ERROR:importador:não deu para converter 'doze'
Traceback (most recent call last):
  File "main.py", line 9, in converter
    return int(texto)
ValueError: invalid literal for int() with base 10: 'doze'
```

`log.exception` registra com nível `ERROR` e acrescenta o traceback da exceção que está sendo tratada. Por isso ela só faz sentido **dentro** de um `except`. Já `log.error("não deu para converter %r", texto)` registraria só a primeira linha, sem pista de onde o erro nasceu.

#### Onde except Exception faz sentido

Na lição sobre a hierarquia você viu que `except Exception:` engole defeitos. Há um lugar em que ele é a escolha certa: no topo de um laço de tarefas **independentes**, em que uma falha não pode derrubar as outras. A condição é não ficar em silêncio: registre com `log.exception`, e o traceback completo fica guardado para quem for investigar.

#### Valores separados ou f-string?

`log.debug(f"lido {valor}")` também funciona. A diferença: a f-string monta o texto **sempre**, mesmo quando o nível `DEBUG` está desligado e a mensagem vai ser descartada. Com `log.debug("lido %s", valor)`, o texto só é montado se a mensagem for exibida. Em código que roda milhões de vezes, isso pesa; prefira os valores separados.

#### O que nunca registrar

Registros são lidos por muita gente e guardados por muito tempo. Senha, número de cartão e CPF completo não entram neles: `log.info("login de %s com senha %s", usuario, senha)` é um vazamento de dados esperando para acontecer. Registre o usuário e o resultado (`login de ana: senha incorreta`), nunca o segredo.

## Passo 5 · Exercício · Importar pedidos sem parar no erro

A papelaria recebe pedidos como linhas de texto `produto;quantidade;preço`. Escreva `processar(linhas)`, que soma o valor de todos os pedidos válidos e registra os problemas sem parar. Use o logger `"pedidos"`, configurado para mostrar a partir de `INFO` com o formato `%(levelname)s:%(message)s`.

Para cada linha, numerando a partir de 1:

| Situação | Registro | Continua? |
|---|---|---|
| não tem 3 campos, ou a quantidade não é inteira, ou o preço não é número | `ERROR` `linha 2 inválida: 'lápis;x;1.00'` (a linha com aspas) | sim |
| quantidade menor ou igual a zero | `WARNING` `linha 3 ignorada: quantidade 0` | sim |
| válida | `DEBUG` `linha 1: caneta x 3`, e o valor `quantidade * preço` entra no total | sim |

No fim, registre em `INFO` quantas linhas foram válidas e quantas tiveram problema, como em `2 linhas válidas, 3 com problema`, e devolva o total arredondado com `round(total, 2)`.

### Instruções
1. Configure o registro e crie o logger `"pedidos"`; não use `print`.
2. Separe cada linha com `split(";")` e converta dentro de um `try`. Se der `ValueError`, registre o `ERROR` e siga para a próxima linha.
   Dica: `produto, qtd, preco = partes` também levanta `ValueError` quando o número de campos não é 3.
3. Quantidade menor ou igual a zero gera o `WARNING` e a linha é pulada; as válidas somam no total e geram o `DEBUG`.
4. Registre o resumo em `INFO` e devolva o total arredondado.

### Código inicial
```python
import logging


def processar(linhas):
    """Soma quantidade * preço das linhas válidas e registra os problemas."""
    pass
```

### Solução
```python
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(message)s")
log = logging.getLogger("pedidos")


def processar(linhas):
    """Soma quantidade * preço das linhas válidas e registra os problemas."""
    total = 0.0
    validas = 0
    problemas = 0
    for numero, linha in enumerate(linhas, start=1):
        try:
            produto, texto_qtd, texto_preco = linha.split(";")
            quantidade = int(texto_qtd)
            preco = float(texto_preco)
        except ValueError:
            log.error("linha %d inválida: %r", numero, linha)
            problemas += 1
            continue
        if quantidade <= 0:
            log.warning("linha %d ignorada: quantidade %d", numero, quantidade)
            problemas += 1
            continue
        log.debug("linha %d: %s x %d", numero, produto, quantidade)
        total += quantidade * preco
        validas += 1
    log.info("%d linhas válidas, %d com problema", validas, problemas)
    return round(total, 2)
```

### Dicas
1. `enumerate(linhas, start=1)` entrega o número da linha junto com o texto.
2. Coloque no `try` só a separação e as conversões; o resto fica fora dele.
3. `%r` escreve a linha com aspas, como no exemplo da tabela.

### Verificação
```json
[
  { "id": "sem-print", "checkpoint": 1, "kind": "source", "rule": { "type": "not_calls", "name": "print" },
    "name": "Não usa print", "hint": "Registre tudo pelo logger." },
  { "id": "total-misto", "checkpoint": 2, "kind": "call", "function": "processar",
    "args": [["giz;4;1.25", "cola;dois;3.00", "tinta;1;8.90", "papel;5"]], "expected": 13.9, "tolerance": 1e-9,
    "name": "Linhas inválidas não entram no total", "hint": "Só quantidade * preço das linhas válidas é somado." },
  { "id": "log-erros", "checkpoint": 2, "kind": "expr",
    "setup": "import logging, sys\nfor h in logging.getLogger().handlers:\n    h.setStream(sys.stdout)",
    "expr": "processar([\"giz;4;1.25\", \"cola;dois;3.00\", \"tinta;1;8.90\", \"papel;5\", \"clipe;1;0,50\"])",
    "expected_stdout": "ERROR:linha 2 inválida: 'cola;dois;3.00'\nERROR:linha 4 inválida: 'papel;5'\nERROR:linha 5 inválida: 'clipe;1;0,50'\nINFO:2 linhas válidas, 3 com problema",
    "match": "trimmed", "name": "Cada linha inválida gera um ERROR com o número e a linha",
    "hint": "O try fica dentro do laço, e a mensagem usa %d para o número e %r para a linha." },
  { "id": "log-aviso", "checkpoint": 3, "kind": "expr",
    "setup": "import logging, sys\nfor h in logging.getLogger().handlers:\n    h.setStream(sys.stdout)",
    "expr": "processar([\"régua;0;4.00\", \"compasso;-2;12.00\", \"caneta;2;3.50\"])",
    "expected_stdout": "WARNING:linha 1 ignorada: quantidade 0\nWARNING:linha 2 ignorada: quantidade -2\nINFO:1 linhas válidas, 2 com problema",
    "match": "trimmed", "name": "Quantidade zero ou negativa gera WARNING e é pulada" },
  { "id": "total-aviso", "checkpoint": 3, "kind": "call", "function": "processar",
    "args": [["régua;0;4.00", "compasso;-2;12.00", "caneta;2;3.50"]], "expected": 7.0, "tolerance": 1e-9,
    "name": "Quantidades não positivas não entram no total" },
  { "id": "log-debug", "checkpoint": 3, "kind": "expr",
    "setup": "import logging, sys\nfor h in logging.getLogger().handlers:\n    h.setStream(sys.stdout)\nlogging.getLogger().setLevel(logging.DEBUG)",
    "expr": "processar([\"caneta;2;3.50\", \"cola;1;4.00\"])",
    "expected_stdout": "DEBUG:linha 1: caneta x 2\nDEBUG:linha 2: cola x 1\nINFO:2 linhas válidas, 0 com problema",
    "match": "trimmed", "name": "Linhas válidas geram DEBUG, oculto no nível INFO",
    "hint": "O detalhe de cada linha válida é DEBUG; o nível configurado é INFO." },
  { "id": "vazia", "checkpoint": 4, "kind": "expr",
    "setup": "import logging, sys\nfor h in logging.getLogger().handlers:\n    h.setStream(sys.stdout)",
    "expr": "processar([])", "expected": 0.0, "expected_stdout": "INFO:0 linhas válidas, 0 com problema", "match": "trimmed",
    "name": "Sem linhas: total 0.0 e o resumo em INFO", "hint": "Configure o nível mínimo para INFO, senão o resumo não aparece." },
  { "id": "arredonda", "checkpoint": 4, "kind": "call", "function": "processar",
    "args": [["bloco;3;0.1", "lápis;3;0.2"]], "expected": 0.9, "type": "float", "tolerance": 1e-12,
    "name": "O total vem arredondado em 2 casas" }
]
```

### Soluções erradas
```python name="try em volta do laço: para no primeiro erro"
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(message)s")
log = logging.getLogger("pedidos")


def processar(linhas):
    total = 0.0
    validas = 0
    problemas = 0
    numero = 0
    try:
        for numero, linha in enumerate(linhas, start=1):
            produto, texto_qtd, texto_preco = linha.split(";")
            quantidade = int(texto_qtd)
            preco = float(texto_preco)
            if quantidade <= 0:
                log.warning("linha %d ignorada: quantidade %d", numero, quantidade)
                problemas += 1
                continue
            log.debug("linha %d: %s x %d", numero, produto, quantidade)
            total += quantidade * preco
            validas += 1
    except ValueError:
        log.error("linha %d inválida: %r", numero, linhas[numero - 1])
        problemas += 1
    log.info("%d linhas válidas, %d com problema", validas, problemas)
    return round(total, 2)
```
```python name="esquece o level: o resumo INFO some"
import logging

logging.basicConfig(format="%(levelname)s:%(message)s")
log = logging.getLogger("pedidos")


def processar(linhas):
    total = 0.0
    validas = 0
    problemas = 0
    for numero, linha in enumerate(linhas, start=1):
        try:
            produto, texto_qtd, texto_preco = linha.split(";")
            quantidade = int(texto_qtd)
            preco = float(texto_preco)
        except ValueError:
            log.error("linha %d inválida: %r", numero, linha)
            problemas += 1
            continue
        if quantidade <= 0:
            log.warning("linha %d ignorada: quantidade %d", numero, quantidade)
            problemas += 1
            continue
        log.debug("linha %d: %s x %d", numero, produto, quantidade)
        total += quantidade * preco
        validas += 1
    log.info("%d linhas válidas, %d com problema", validas, problemas)
    return round(total, 2)
```
```python name="print no lugar do logging"
def processar(linhas):
    total = 0.0
    validas = 0
    problemas = 0
    for numero, linha in enumerate(linhas, start=1):
        try:
            produto, texto_qtd, texto_preco = linha.split(";")
            quantidade = int(texto_qtd)
            preco = float(texto_preco)
        except ValueError:
            print(f"ERROR:linha {numero} inválida: {linha!r}")
            problemas += 1
            continue
        if quantidade <= 0:
            print(f"WARNING:linha {numero} ignorada: quantidade {quantidade}")
            problemas += 1
            continue
        total += quantidade * preco
        validas += 1
    print(f"INFO:{validas} linhas válidas, {problemas} com problema")
    return round(total, 2)
```
```python name="linha inválida como WARNING"
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(message)s")
log = logging.getLogger("pedidos")


def processar(linhas):
    total = 0.0
    validas = 0
    problemas = 0
    for numero, linha in enumerate(linhas, start=1):
        try:
            produto, texto_qtd, texto_preco = linha.split(";")
            quantidade = int(texto_qtd)
            preco = float(texto_preco)
        except ValueError:
            log.warning("linha %d inválida: %r", numero, linha)
            problemas += 1
            continue
        if quantidade <= 0:
            log.warning("linha %d ignorada: quantidade %d", numero, quantidade)
            problemas += 1
            continue
        log.debug("linha %d: %s x %d", numero, produto, quantidade)
        total += quantidade * preco
        validas += 1
    log.info("%d linhas válidas, %d com problema", validas, problemas)
    return round(total, 2)
```

## Passo 6 · Exercício · Tarefas noturnas com traceback

O script noturno roda uma lista de tarefas independentes: backup, relatório, envio de e-mails. Uma tarefa que quebra não pode impedir as outras, e quem for investigar de manhã precisa do traceback.

Escreva `executar(tarefas)`, que recebe uma lista de pares `(nome, funcao)` e chama cada função, sem argumentos, na ordem. Use o logger `"tarefas"`, com nível mínimo `INFO` e o formato `%(levelname)s:%(name)s:%(message)s`:

- tarefa que termina bem: `INFO` `tarefa backup concluída`;
- tarefa que levanta qualquer `Exception`: registro com traceback, `ERROR` `tarefa relatorio falhou`, e o laço segue.

A função devolve a lista com os nomes das tarefas que falharam, na ordem. Um Ctrl+C (`KeyboardInterrupt`) não é falha de tarefa: ele deve interromper tudo.

### Instruções
1. Configure o registro e o logger `"tarefas"`, percorra as tarefas e chame cada função.
2. Capture `Exception` em volta de **cada** chamada e registre a falha com `log.exception`, para o traceback entrar no registro.
   Dica: só `log.exception` acrescenta o traceback; `log.error` registra só a mensagem.
3. Registre as tarefas concluídas em `INFO` e devolva os nomes das que falharam.

### Código inicial
```python
import logging


def executar(tarefas):
    falharam = []
    for nome, funcao in tarefas:
        funcao()
    return falharam
```

### Solução
```python
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
log = logging.getLogger("tarefas")


def executar(tarefas):
    falharam = []
    for nome, funcao in tarefas:
        try:
            funcao()
        except Exception:
            log.exception("tarefa %s falhou", nome)
            falharam.append(nome)
        else:
            log.info("tarefa %s concluída", nome)
    return falharam
```

### Dicas
1. O `try` envolve uma chamada por vez, dentro do laço.
2. `log.exception("tarefa %s falhou", nome)` vai dentro do `except`.
3. `except Exception:` deixa passar o `KeyboardInterrupt`, que fica fora dessa família.

### Verificação
```json
[
  { "id": "falharam", "checkpoint": 1, "kind": "expr",
    "setup": "def limpar():\n    pass\n\ndef somar():\n    return sum([1, \"2\"])\n\ndef agenda():\n    return [][0]",
    "expr": "executar([(\"limpeza\", limpar), (\"soma\", somar), (\"agenda\", agenda)])", "expected": ["soma", "agenda"],
    "name": "Devolve as tarefas que falharam, e as seguintes ainda rodam", "hint": "O try fica dentro do laço, em volta de uma chamada." },
  { "id": "todas-ok", "checkpoint": 1, "kind": "expr", "setup": "feitas = []\ndef a():\n    feitas.append(\"a\")\n\ndef b():\n    feitas.append(\"b\")",
    "expr": "[executar([(\"a\", a), (\"b\", b)]), feitas]", "expected": [[], ["a", "b"]], "name": "Sem falhas, todas rodam na ordem" },
  { "id": "erro-msg", "checkpoint": 2, "kind": "expr",
    "setup": "import logging, sys\nfor h in logging.getLogger().handlers:\n    h.setStream(sys.stdout)\ndef somar():\n    return sum([1, \"2\"])",
    "expr": "executar([(\"soma\", somar)])", "expected_stdout": "ERROR:tarefas:tarefa soma falhou\nTraceback (most recent call last):", "match": "contains",
    "name": "A falha é registrada como ERROR, seguida do traceback", "hint": "Use log.exception dentro do except." },
  { "id": "erro-tipo", "checkpoint": 2, "kind": "expr",
    "setup": "import logging, sys\nfor h in logging.getLogger().handlers:\n    h.setStream(sys.stdout)\ndef agenda():\n    return [][0]",
    "expr": "executar([(\"agenda\", agenda)])", "expected_stdout": "IndexError: list index out of range", "match": "contains",
    "name": "O registro termina com o tipo e a mensagem da exceção" },
  { "id": "ctrl-c", "checkpoint": 2, "kind": "expr",
    "setup": "def parar():\n    raise KeyboardInterrupt",
    "expr": "executar([(\"parar\", parar)])", "raises": "KeyboardInterrupt",
    "name": "KeyboardInterrupt interrompe tudo", "hint": "Capture Exception, não BaseException." },
  { "id": "info-ok", "checkpoint": 3, "kind": "expr",
    "setup": "import logging, sys\nfor h in logging.getLogger().handlers:\n    h.setStream(sys.stdout)\ndef limpar():\n    pass\n\ndef agenda():\n    return [][0]",
    "expr": "executar([(\"limpeza\", limpar), (\"agenda\", agenda), (\"backup\", limpar)])",
    "expected_stdout": "^INFO:tarefas:tarefa limpeza concluída\\nERROR:tarefas:tarefa agenda falhou\\n[\\s\\S]*IndexError: list index out of range\\nINFO:tarefas:tarefa backup concluída\\s*$", "match": "regex",
    "name": "Tarefas concluídas aparecem em INFO, na ordem", "hint": "Registre a conclusão no else do try, com nível INFO." }
]
```

### Soluções erradas
```python name="log.error sem traceback"
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
log = logging.getLogger("tarefas")


def executar(tarefas):
    falharam = []
    for nome, funcao in tarefas:
        try:
            funcao()
        except Exception:
            log.error("tarefa %s falhou", nome)
            falharam.append(nome)
        else:
            log.info("tarefa %s concluída", nome)
    return falharam
```
```python name="captura BaseException e engole o Ctrl+C"
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
log = logging.getLogger("tarefas")


def executar(tarefas):
    falharam = []
    for nome, funcao in tarefas:
        try:
            funcao()
        except BaseException:
            log.exception("tarefa %s falhou", nome)
            falharam.append(nome)
        else:
            log.info("tarefa %s concluída", nome)
    return falharam
```
```python name="try em volta do laço"
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
log = logging.getLogger("tarefas")


def executar(tarefas):
    falharam = []
    nome = None
    try:
        for nome, funcao in tarefas:
            funcao()
            log.info("tarefa %s concluída", nome)
    except Exception:
        log.exception("tarefa %s falhou", nome)
        falharam.append(nome)
    return falharam
```
```python name="engole em silêncio"
import logging

logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
log = logging.getLogger("tarefas")


def executar(tarefas):
    falharam = []
    for nome, funcao in tarefas:
        try:
            funcao()
        except Exception:
            falharam.append(nome)
        else:
            log.info("tarefa %s concluída", nome)
    return falharam
```

## Passo 7 · Quiz · Níveis e configuração

### Pergunta
O programa abaixo não mostra nada. Por quê?
```python
import logging

logging.info("iniciando")
logging.basicConfig(level=logging.INFO)
logging.info("pronto")
```
- [ ] `logging.info` só funciona dentro de funções
- [ ] Faltou `stream=sys.stdout` no `basicConfig`
- [x] O primeiro `logging.info` configurou o registro com o padrão `WARNING`, e o `basicConfig` seguinte foi ignorado
- [ ] `basicConfig` precisa vir depois de todas as mensagens
> Chamar `logging.info` sem configuração aplica o `basicConfig` padrão, com nível `WARNING`. Um `basicConfig` posterior não faz nada quando o registro já está configurado, e nenhum `INFO` passa.

### Pergunta
O script lê 500 linhas de um arquivo e uma delas tem um preço inválido; a linha é pulada e o resto é importado. Qual o nível mais adequado para registrar essa linha?
- [ ] `DEBUG`, porque é um detalhe da importação
- [ ] `INFO`, porque o programa continuou
- [x] `ERROR`, porque aquela operação (importar a linha) falhou, mesmo que o programa siga
- [ ] `CRITICAL`, porque um dado foi perdido
> `ERROR` marca uma operação que falhou. `CRITICAL` é para quando o programa não consegue continuar, e `INFO`/`DEBUG` esconderiam um problema que alguém precisa ver.

### Pergunta
Qual a vantagem de `log.debug("lido %s", valor)` sobre `log.debug(f"lido {valor}")`?
- [ ] A f-string não funciona com `logging`
- [x] Com os valores separados, o texto só é montado se a mensagem for exibida; a f-string monta sempre, mesmo com `DEBUG` desligado
- [ ] Os valores separados escondem dados sensíveis automaticamente
- [ ] Nenhuma: as duas formas são processadas exatamente do mesmo jeito
> As duas registram a mesma mensagem. A diferença é de custo: a f-string é avaliada antes da chamada, e o `logging` só monta `"lido %s" % valor` depois de decidir que a mensagem passa pelo nível.
