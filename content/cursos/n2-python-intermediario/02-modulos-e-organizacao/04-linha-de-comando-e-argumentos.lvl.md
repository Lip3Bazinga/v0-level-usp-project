---
slug: n2-m2-04-linha-de-comando-e-argumentos
titulo: Scripts de linha de comando
descricao: sys.argv e argparse para programas que recebem argumentos, códigos de saída e saída de erro.
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
- Ler argumentos da linha de comando com sys.argv e com argparse
- Separar a lógica (funções testáveis) da camada de linha de comando
- Usar sys.exit com códigos e escrever mensagens de erro em stderr
---

## Passo 1 · Leitura · Programas que recebem argumentos

Os programas que você escreveu até aqui perguntam tudo com `input()`. Isso trava qualquer automação: um script que converte 300 arquivos não pode parar e esperar alguém digitar. Programas de terminal recebem os dados **na mesma linha do comando**:

```text
python soma.py 3 4.5
```

O Python guarda essa linha, já separada por espaços, na lista `sys.argv` (*argument vector*):

```python
import sys

print(sys.argv)   # ['soma.py', '3', '4.5']
```

Três detalhes importam. `sys.argv[0]` é o nome do script, e não o primeiro argumento: os dados começam em `sys.argv[1]`, por isso é comum usar a fatia `sys.argv[1:]`. Todos os itens são **texto**: `'3' + '4.5'` dá `'34.5'`, então converta com `int` ou `float`. E nada garante que a pessoa digitou o que você esperava. Sem argumentos, `sys.argv[1]` dá `IndexError: list index out of range`; com `python soma.py tres`, o `float` dá `ValueError: could not convert string to float: 'tres'`.

#### Código de saída e saída de erro

Quando um programa termina, ele devolve ao sistema um número, o **código de saída**: `0` quer dizer "deu certo" e qualquer outro número quer dizer "deu errado" (por convenção, `2` é "uso incorreto"). Outros programas e scripts de automação leem esse número para decidir se continuam. Você escolhe o código com `sys.exit(codigo)`.

As mensagens de erro vão para a **saída de erro** (*stderr*), um canal separado da saída normal (*stdout*): `print("erro: ...", file=sys.stderr)`. Assim, quem redireciona os resultados para um arquivo, com `python soma.py 3 4 > resultado.txt`, recebe só os dados, e o erro continua aparecendo na tela.

#### O formato que permite testar

```python
import sys


def main(argv):
    ...                 # lê argv, faz o trabalho, devolve o código
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

A função `main` recebe a lista de argumentos **como parâmetro** em vez de ler `sys.argv` lá dentro. No terminal, o guarda passa `sys.argv[1:]`. Num teste, ou em outro arquivo, você chama `main(["3", "4.5"])` direto, sem terminal nenhum. Nos exercícios desta lição é assim que tudo é verificado: o `main.py` importa o seu script e chama `main` com listas de argumentos.

## Passo 2 · Exercício · Um somador de terminal
modo: lacunas

O `soma.py` soma os números passados na linha de comando. Ele segue o formato `main(argv)` e trata os dois erros clássicos: nenhum argumento e argumento que não é número. O `main.py` simula três execuções no terminal chamando `soma.main` com listas diferentes; rode para ver os códigos de saída.

### Instruções
1. Complete o teste que detecta a lista de argumentos vazia.
2. Complete o canal da mensagem de uso: ela é uma mensagem de erro.
3. Complete a lista que é convertida em números e o erro que o `float` levanta com um texto inválido.
4. Complete o código de saída de quando tudo dá certo.
   Dica: só um número significa sucesso.

### Código inicial
```python
import soma

for argv in (["2", "3.5"], [], ["7", "sete"]):
    print("$ python soma.py", *argv)
    codigo = soma.main(argv)
    print("código de saída:", codigo)
```
```python path=soma.py
import sys


def main(argv):
    if len(argv) == ___:
        print("uso: soma.py NUMERO [NUMERO ...]", file=sys.___)
        return 2
    try:
        numeros = [float(texto) for texto in ___]
    except ___:
        print("erro: todos os argumentos precisam ser números", file=sys.stderr)
        return 1
    print(f"Soma: {sum(numeros):g}")
    return ___


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

### Solução
```python
import soma

for argv in (["2", "3.5"], [], ["7", "sete"]):
    print("$ python soma.py", *argv)
    codigo = soma.main(argv)
    print("código de saída:", codigo)
```
```python path=soma.py
import sys


def main(argv):
    if len(argv) == 0:
        print("uso: soma.py NUMERO [NUMERO ...]", file=sys.stderr)
        return 2
    try:
        numeros = [float(texto) for texto in argv]
    except ValueError:
        print("erro: todos os argumentos precisam ser números", file=sys.stderr)
        return 1
    print(f"Soma: {sum(numeros):g}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

### Dicas
1. Uma lista vazia tem tamanho zero.
2. `sys.stdout` é a saída normal e `sys.stderr` é a saída de erro.
3. Os argumentos chegam pelo parâmetro de `main`, e não por `sys.argv`.

### Verificação
```json
[
  { "id": "vazio", "checkpoint": 1, "kind": "expr",
    "setup": "import contextlib, io as _io, sys\n_saida, _erros = _io.StringIO(), _io.StringIO()\nsys.stderr = _erros\nwith contextlib.redirect_stdout(_saida):\n    _codigo = soma.main([])",
    "expr": "(_codigo, _saida.getvalue())", "expected": [2, ""],
    "name": "Sem argumentos, devolve 2 e não imprime na saída normal", "hint": "Uma lista vazia tem tamanho zero." },
  { "id": "uso-stderr", "checkpoint": 2, "kind": "expr",
    "setup": "import io as _io, sys\n_erros = _io.StringIO()\nsys.stderr = _erros\nsoma.main([])",
    "expr": "_erros.getvalue()", "expected": "uso: soma.py NUMERO [NUMERO ...]\n",
    "name": "A mensagem de uso vai para stderr", "hint": "Mensagens de erro vão para a saída de erro." },
  { "id": "invalido", "checkpoint": 3, "kind": "expr",
    "setup": "import io as _io, sys\n_erros = _io.StringIO()\nsys.stderr = _erros\n_codigo = soma.main(['10', 'dez'])",
    "expr": "(_codigo, _erros.getvalue())", "expected": [1, "erro: todos os argumentos precisam ser números\n"],
    "name": "Argumento que não é número devolve 1 com mensagem em stderr", "hint": "Qual exceção o float levanta com um texto inválido?" },
  { "id": "soma-tres", "checkpoint": 3, "kind": "expr", "expr": "soma.main(['1.5', '2', '4'])", "expected": 0, "expected_stdout": "Soma: 7.5",
    "name": "soma.main(['1.5', '2', '4']) imprime Soma: 7.5", "hint": "Converta os itens da lista recebida por main." },
  { "id": "soma-negativo", "checkpoint": 4, "kind": "expr", "expr": "soma.main(['-3', '10'])", "expected": 0, "expected_stdout": "Soma: 7",
    "name": "soma.main(['-3', '10']) imprime Soma: 7 e devolve 0" },
  { "id": "como-script", "checkpoint": 4, "kind": "expr",
    "setup": "import runpy, sys\nsys.argv = ['soma.py', '20', '22']",
    "expr": "runpy.run_path('soma.py', run_name='__main__')", "raises": "SystemExit", "message_contains": "0", "expected_stdout": "Soma: 42",
    "name": "Executado como script, soma os argumentos e sai com código 0" }
]
```

### Soluções erradas
```python name="mensagem de uso na saída normal" path=soma.py
import sys


def main(argv):
    if len(argv) == 0:
        print("uso: soma.py NUMERO [NUMERO ...]", file=sys.stdout)
        return 2
    try:
        numeros = [float(texto) for texto in argv]
    except ValueError:
        print("erro: todos os argumentos precisam ser números", file=sys.stderr)
        return 1
    print(f"Soma: {sum(numeros):g}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```
```python name="lê sys.argv em vez do parâmetro" path=soma.py
import sys


def main(argv):
    if len(argv) == 0:
        print("uso: soma.py NUMERO [NUMERO ...]", file=sys.stderr)
        return 2
    try:
        numeros = [float(texto) for texto in sys.argv[1:]]
    except ValueError:
        print("erro: todos os argumentos precisam ser números", file=sys.stderr)
        return 1
    print(f"Soma: {sum(numeros):g}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```
```python name="captura a exceção errada" path=soma.py
import sys


def main(argv):
    if len(argv) == 0:
        print("uso: soma.py NUMERO [NUMERO ...]", file=sys.stderr)
        return 2
    try:
        numeros = [float(texto) for texto in argv]
    except TypeError:
        print("erro: todos os argumentos precisam ser números", file=sys.stderr)
        return 1
    print(f"Soma: {sum(numeros):g}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```
```python name="devolve 1 quando dá certo" path=soma.py
import sys


def main(argv):
    if len(argv) == 0:
        print("uso: soma.py NUMERO [NUMERO ...]", file=sys.stderr)
        return 2
    try:
        numeros = [float(texto) for texto in argv]
    except ValueError:
        print("erro: todos os argumentos precisam ser números", file=sys.stderr)
        return 1
    print(f"Soma: {sum(numeros):g}")
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

## Passo 3 · Leitura · argparse: argumentos com nome, tipo e ajuda

Com `sys.argv`, cada validação é escrita na mão. Quando o programa ganha opções, como `--para c` ou `--casas 2`, em qualquer ordem e com valores padrão, o código de leitura fica maior que o programa. O módulo `argparse` da biblioteca padrão faz esse trabalho:

```python
import argparse

parser = argparse.ArgumentParser(prog="conversor", description="Converte temperaturas.")
parser.add_argument("valor", type=float, help="temperatura a converter")
parser.add_argument("--para", choices=["c", "f"], default="f", help="escala de destino")
parser.add_argument("--casas", type=int, default=1, help="casas decimais")

args = parser.parse_args(["100", "--casas", "2"])
print(args.valor, args.para, args.casas)   # 100.0 f 2
```

- Um nome **sem traços** (`"valor"`) é um argumento **posicional**: obrigatório, identificado pela posição.
- Um nome **com dois traços** (`"--para"`) é uma **opção**: pode faltar (vale o `default`) e pode vir em qualquer posição.
- `type=float` converte o texto. Você não precisa mais chamar `float(...)`: `args.valor` já chega como número.
- `choices` limita os valores aceitos.
- `parse_args(lista)` lê a lista que você passar. Sem argumento, `parse_args()` lê `sys.argv[1:]` sozinho, o que é ótimo no terminal e péssimo para testar. Por isso, dentro de `main(argv)`, escreva sempre `parser.parse_args(argv)`.

O resultado é um objeto com um atributo por argumento, com o nome sem os traços.

#### O que o argparse faz sozinho

Ele cria a opção `--help` (ou `-h`), que imprime a ajuda montada a partir dos `help=` e encerra com código 0:

```text
usage: conversor [-h] [--para {c,f}] [--casas CASAS] valor
```

E trata os erros de uso: falta de argumento obrigatório, tipo inválido ou valor fora de `choices`. Nesses casos, imprime a linha de uso e o erro **em stderr** e encerra com o código **2**:

```text
usage: conversor [-h] [--para {c,f}] [--casas CASAS] valor
conversor: error: argument valor: invalid float value: 'abc'
```

Atenção: "encerrar" quer dizer levantar a exceção `SystemExit`. Chamando `main(["abc"])` de outro arquivo, essa exceção sobe até quem chamou, como qualquer outra.

## Passo 4 · Previsão · O que o argparse entrega

Use o mesmo parser do passo anterior. Leia o programa e digite exatamente o que ele imprime. Repare na ordem das opções na segunda chamada e nos tipos.

### Código
```python
import argparse

parser = argparse.ArgumentParser(prog="conversor")
parser.add_argument("valor", type=float)
parser.add_argument("--para", choices=["c", "f"], default="f")
parser.add_argument("--casas", type=int, default=1)

a = parser.parse_args(["37"])
print(a.valor, a.para, a.casas)
b = parser.parse_args(["--casas", "0", "--para", "c", "98.5"])
print(b.valor + 1, b.para, b.casas * 2)
print(type(a.valor).__name__, type(b.casas).__name__)
```

### Dicas
1. Uma opção que não aparece na lista recebe o `default`.
2. `type=float` transforma `"37"` em número de ponto flutuante, que é impresso com `.0`.
3. As opções podem vir antes do posicional; o argparse identifica cada uma pelo nome.

### Saída esperada
```text
37.0 f 1
99.5 c 0
float int
```

## Passo 5 · Exercício · Conversor de temperatura com argparse

O `conversor.py` já tem a conta (`converter`) e a formatação (`formatar`). Falta a camada de linha de comando. O uso esperado é:

```text
python conversor.py VALOR [--para {c,f}] [--casas N]
```

- `VALOR` é a temperatura, um número (pode ser negativo).
- `--para f` (o padrão) converte de Celsius para Fahrenheit; `--para c` converte de Fahrenheit para Celsius.
- `--casas` é o número de casas decimais, 1 por padrão.

`main(argv)` imprime o resultado de `formatar(...)` e devolve 0. Exemplos: `main(["100"])` imprime `212.0 °F`; `main(["212", "--para", "c"])` imprime `100.0 °C`. Os erros de uso ficam por conta do argparse.

### Instruções
1. Em `main`, crie um `ArgumentParser` com o posicional `valor` (tipo `float`) e as opções `--para` (só `c` ou `f`, padrão `f`) e `--casas` (tipo `int`, padrão 1). Escreva um `help=` para cada um.
2. Leia os argumentos com `parse_args(argv)`, usando a lista recebida.
3. Imprima `formatar(converter(...), ...)` com os valores lidos e devolva 0.

### Código inicial
```python
import conversor

for argv in (["100"], ["212", "--para", "c"], ["36.6", "--casas", "2"]):
    print("$ python conversor.py", *argv)
    print("código de saída:", conversor.main(argv))
```
```python path=conversor.py
import argparse
import sys


def converter(valor, para):
    """Converte para Fahrenheit (para="f") ou para Celsius (para="c")."""
    if para == "f":
        return valor * 9 / 5 + 32
    return (valor - 32) * 5 / 9


def formatar(valor, para, casas):
    return f"{valor:.{casas}f} °{para.upper()}"


def main(argv):
    pass


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

### Solução
```python
import conversor

for argv in (["100"], ["212", "--para", "c"], ["36.6", "--casas", "2"]):
    print("$ python conversor.py", *argv)
    print("código de saída:", conversor.main(argv))
```
```python path=conversor.py
import argparse
import sys


def converter(valor, para):
    """Converte para Fahrenheit (para="f") ou para Celsius (para="c")."""
    if para == "f":
        return valor * 9 / 5 + 32
    return (valor - 32) * 5 / 9


def formatar(valor, para, casas):
    return f"{valor:.{casas}f} °{para.upper()}"


def main(argv):
    parser = argparse.ArgumentParser(prog="conversor", description="Converte temperaturas entre Celsius e Fahrenheit.")
    parser.add_argument("valor", type=float, help="temperatura a converter")
    parser.add_argument("--para", choices=["c", "f"], default="f", help="escala de destino (padrão: f)")
    parser.add_argument("--casas", type=int, default=1, help="casas decimais (padrão: 1)")
    args = parser.parse_args(argv)
    print(formatar(converter(args.valor, args.para), args.para, args.casas))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

### Dicas
1. `add_argument("valor", type=float)` cria o posicional; `add_argument("--para", choices=[...], default=...)` cria a opção.
2. Passe `argv` para `parse_args`: sem ele, o argparse lê `sys.argv`, e não a lista que `main` recebeu.
3. Os valores ficam em `args.valor`, `args.para` e `args.casas`.

### Verificação
```json
[
  { "id": "padrao-f", "checkpoint": 1, "kind": "expr", "expr": "conversor.main(['100'])", "expected": 0, "expected_stdout": "212.0 °F",
    "name": "main(['100']) imprime 212.0 °F", "hint": "Sem --para, o padrão é converter para Fahrenheit." },
  { "id": "para-c", "checkpoint": 1, "kind": "expr", "expr": "conversor.main(['--para', 'c', '50'])", "expected": 0, "expected_stdout": "10.0 °C",
    "name": "--para c antes do valor converte para Celsius" },
  { "id": "negativo-casas", "checkpoint": 1, "kind": "expr", "expr": "conversor.main(['-40', '--para', 'c', '--casas', '2'])", "expected": 0, "expected_stdout": "-40.00 °C",
    "name": "Valor negativo com --casas 2" },
  { "id": "casas-zero", "checkpoint": 1, "kind": "expr", "expr": "conversor.main(['36.6', '--casas', '0'])", "expected": 0, "expected_stdout": "98 °F",
    "name": "--casas 0 tira as casas decimais" },
  { "id": "tipo-invalido", "checkpoint": 1, "kind": "expr", "expr": "conversor.main(['quente'])", "raises": "SystemExit", "message_contains": "2",
    "name": "Valor que não é número encerra com código 2", "hint": "Declare o tipo do posicional: o argparse rejeita o texto sozinho." },
  { "id": "escala-invalida", "checkpoint": 1, "kind": "expr", "expr": "conversor.main(['10', '--para', 'k'])", "raises": "SystemExit", "message_contains": "2",
    "name": "Escala fora de c e f encerra com código 2", "hint": "Use choices para limitar os valores de --para." },
  { "id": "ajuda", "checkpoint": 1, "kind": "expr", "expr": "conversor.main(['--help'])", "raises": "SystemExit",
    "expected_stdout": "casas decimais", "match": "contains",
    "name": "--help mostra a ajuda de --casas", "hint": "Escreva um help= para cada argumento." },
  { "id": "usa-argv", "checkpoint": 2, "kind": "expr", "setup": "import sys\nsys.argv = ['conversor.py', '0']",
    "expr": "conversor.main(['25'])", "expected": 0, "expected_stdout": "77.0 °F",
    "name": "main usa a lista recebida, e não sys.argv", "hint": "Passe argv para parse_args." },
  { "id": "devolve-zero", "checkpoint": 3, "kind": "expr", "expr": "conversor.main(['212', '--para', 'c', '--casas', '3'])", "expected": 0, "type": "int",
    "expected_stdout": "100.000 °C", "name": "main devolve 0 depois de imprimir o resultado" },
  { "id": "usa-argparse", "checkpoint": 1, "kind": "source", "rule": { "type": "calls", "name": "ArgumentParser" },
    "name": "Cria um ArgumentParser" }
]
```

### Soluções erradas
```python name="parse_args sem a lista" path=conversor.py
import argparse
import sys


def converter(valor, para):
    """Converte para Fahrenheit (para="f") ou para Celsius (para="c")."""
    if para == "f":
        return valor * 9 / 5 + 32
    return (valor - 32) * 5 / 9


def formatar(valor, para, casas):
    return f"{valor:.{casas}f} °{para.upper()}"


def main(argv):
    parser = argparse.ArgumentParser(prog="conversor")
    parser.add_argument("valor", type=float, help="temperatura a converter")
    parser.add_argument("--para", choices=["c", "f"], default="f", help="escala de destino (padrão: f)")
    parser.add_argument("--casas", type=int, default=1, help="casas decimais (padrão: 1)")
    args = parser.parse_args()
    print(formatar(converter(args.valor, args.para), args.para, args.casas))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```
```python name="sem type=float no valor" path=conversor.py
import argparse
import sys


def converter(valor, para):
    """Converte para Fahrenheit (para="f") ou para Celsius (para="c")."""
    if para == "f":
        return valor * 9 / 5 + 32
    return (valor - 32) * 5 / 9


def formatar(valor, para, casas):
    return f"{valor:.{casas}f} °{para.upper()}"


def main(argv):
    parser = argparse.ArgumentParser(prog="conversor")
    parser.add_argument("valor", help="temperatura a converter")
    parser.add_argument("--para", choices=["c", "f"], default="f", help="escala de destino (padrão: f)")
    parser.add_argument("--casas", type=int, default=1, help="casas decimais (padrão: 1)")
    args = parser.parse_args(argv)
    print(formatar(converter(args.valor, args.para), args.para, args.casas))
    return 0
```
```python name="--para sem padrão e sem choices"
import conversor

for argv in (["100", "--para", "f"], ["212", "--para", "c"]):
    print("$ python conversor.py", *argv)
    print("código de saída:", conversor.main(argv))
```
```python name="--para sem padrão e sem choices" path=conversor.py
import argparse
import sys


def converter(valor, para):
    """Converte para Fahrenheit (para="f") ou para Celsius (para="c")."""
    if para == "f":
        return valor * 9 / 5 + 32
    return (valor - 32) * 5 / 9


def formatar(valor, para, casas):
    return f"{valor:.{casas}f} °{para.upper()}"


def main(argv):
    parser = argparse.ArgumentParser(prog="conversor")
    parser.add_argument("valor", type=float, help="temperatura a converter")
    parser.add_argument("--para", help="escala de destino")
    parser.add_argument("--casas", type=int, default=1, help="casas decimais (padrão: 1)")
    args = parser.parse_args(argv)
    print(formatar(converter(args.valor, args.para), args.para, args.casas))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

## Passo 6 · Exercício · Separe a lógica da linha de comando

O `media_cli.py` abaixo funciona no terminal quando tudo dá certo, mas é impossível de testar e de reaproveitar: lê `sys.argv` direto no topo do arquivo, mistura a conta com os `print` e quebra com qualquer entrada errada. Basta importá-lo, como faz o `main.py`, para ele estourar um `ZeroDivisionError`. Reescreva o **`media_cli.py`** em camadas:

- **lógica**: `calcular_media(notas)` devolve a média (um `float`) e `situacao(media)` devolve `"aprovado"` para média 5 ou mais e `"reprovado"` abaixo disso. Nenhuma das duas imprime nada.
- **linha de comando**: `main(argv)` recebe a lista de argumentos, valida, chama a lógica, imprime e devolve o código de saída.

| Caso | Saída normal | stderr | Código |
|---|---|---|---|
| `main(["7", "8.5", "6"])` | `Média: 7.2 (aprovado)` | nada | 0 |
| `main([])` | nada | `uso: media_cli.py NOTA [NOTA ...]` | 2 |
| `main(["7", "oito"])` | nada | `erro: nota inválida: oito` | 1 |
| `main(["7", "11"])` | nada | `erro: nota fora de 0 a 10: 11` | 1 |

### Instruções
1. Escreva `calcular_media(notas)` e `situacao(media)`, sem `print`.
2. Escreva `main(argv)` para o caso de sucesso: imprima a média com uma casa decimal e a situação, como na tabela, e devolva 0.
3. Trate os erros de `main` como na tabela: mensagens exatamente iguais em `sys.stderr` e códigos 2 e 1. Na nota inválida e na nota fora da faixa, a mensagem cita o primeiro argumento com problema, como foi digitado.
4. No fim do arquivo, coloque o guarda `__main__` chamando `sys.exit(main(sys.argv[1:]))`.

### Código inicial
```python
import media_cli

for argv in (["7", "8.5", "6"], [], ["7", "oito"], ["7", "11"]):
    print("$ python media_cli.py", *argv)
    print("código de saída:", media_cli.main(argv))
```
```python path=media_cli.py
import sys

notas = [float(x) for x in sys.argv[1:]]
media = sum(notas) / len(notas)
if media >= 5:
    print(f"Média: {media:.1f} (aprovado)")
else:
    print(f"Média: {media:.1f} (reprovado)")
```

### Solução
```python
import media_cli

for argv in (["7", "8.5", "6"], [], ["7", "oito"], ["7", "11"]):
    print("$ python media_cli.py", *argv)
    print("código de saída:", media_cli.main(argv))
```
```python path=media_cli.py
import sys


def calcular_media(notas):
    return sum(notas) / len(notas)


def situacao(media):
    if media >= 5:
        return "aprovado"
    return "reprovado"


def main(argv):
    if len(argv) == 0:
        print("uso: media_cli.py NOTA [NOTA ...]", file=sys.stderr)
        return 2
    notas = []
    for texto in argv:
        try:
            nota = float(texto)
        except ValueError:
            print(f"erro: nota inválida: {texto}", file=sys.stderr)
            return 1
        if nota < 0 or nota > 10:
            print(f"erro: nota fora de 0 a 10: {texto}", file=sys.stderr)
            return 1
        notas.append(nota)
    media = calcular_media(notas)
    print(f"Média: {media:.1f} ({situacao(media)})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```

### Dicas
1. Comece pelas duas funções de lógica: elas só recebem e devolvem valores.
2. Em `main`, valide antes de calcular: primeiro a lista vazia, depois cada argumento, convertendo um por vez dentro de um `try`.
3. Cada erro tem a sua mensagem em `sys.stderr` e o seu `return`; o `print` do resultado só acontece quando tudo passou.

### Verificação
```json
[
  { "id": "media-pura", "checkpoint": 1, "kind": "expr",
    "setup": "import contextlib, io as _io\n_saida = _io.StringIO()\nwith contextlib.redirect_stdout(_saida):\n    _media = media_cli.calcular_media([7, 8.5, 6])",
    "expr": "(round(_media, 4), _saida.getvalue())", "expected": [7.1667, ""],
    "name": "calcular_media devolve a média sem imprimir", "hint": "A função de lógica devolve com return; quem imprime é main." },
  { "id": "media-inteiros", "checkpoint": 1, "kind": "expr", "expr": "media_cli.calcular_media([10, 4])", "expected": 7.0, "type": "float",
    "name": "calcular_media([10, 4]) é 7.0" },
  { "id": "situacao", "checkpoint": 1, "kind": "expr", "expr": "[media_cli.situacao(v) for v in (5, 4.99, 9.5)]",
    "expected": ["aprovado", "reprovado", "aprovado"], "name": "situacao com média 5 é aprovado" },
  { "id": "main-sucesso", "checkpoint": 2, "kind": "expr", "expr": "media_cli.main(['10', '9'])", "expected": 0, "expected_stdout": "Média: 9.5 (aprovado)",
    "name": "main(['10', '9']) imprime Média: 9.5 (aprovado)" },
  { "id": "main-reprovado", "checkpoint": 2, "kind": "expr", "expr": "media_cli.main(['3', '4', '2.5'])", "expected": 0, "expected_stdout": "Média: 3.2 (reprovado)",
    "name": "main(['3', '4', '2.5']) imprime Média: 3.2 (reprovado)" },
  { "id": "main-vazio", "checkpoint": 3, "kind": "expr",
    "setup": "import contextlib, io as _io, sys\n_saida, _erros = _io.StringIO(), _io.StringIO()\nsys.stderr = _erros\nwith contextlib.redirect_stdout(_saida):\n    _codigo = media_cli.main([])",
    "expr": "(_codigo, _saida.getvalue(), _erros.getvalue())", "expected": [2, "", "uso: media_cli.py NOTA [NOTA ...]\n"],
    "name": "Sem argumentos: uso em stderr e código 2" },
  { "id": "main-invalida", "checkpoint": 3, "kind": "expr",
    "setup": "import contextlib, io as _io, sys\n_saida, _erros = _io.StringIO(), _io.StringIO()\nsys.stderr = _erros\nwith contextlib.redirect_stdout(_saida):\n    _codigo = media_cli.main(['9', 'nove', '8'])",
    "expr": "(_codigo, _saida.getvalue(), _erros.getvalue())", "expected": [1, "", "erro: nota inválida: nove\n"],
    "name": "Nota que não é número: mensagem em stderr e código 1", "hint": "Converta dentro de um try e capture o erro do float." },
  { "id": "main-faixa", "checkpoint": 3, "kind": "expr",
    "setup": "import contextlib, io as _io, sys\n_saida, _erros = _io.StringIO(), _io.StringIO()\nsys.stderr = _erros\nwith contextlib.redirect_stdout(_saida):\n    _codigo = media_cli.main(['-1', '8'])",
    "expr": "(_codigo, _saida.getvalue(), _erros.getvalue())", "expected": [1, "", "erro: nota fora de 0 a 10: -1\n"],
    "name": "Nota fora de 0 a 10: mensagem em stderr e código 1", "hint": "Confira as duas pontas da faixa." },
  { "id": "como-script", "checkpoint": 4, "kind": "expr", "setup": "import runpy, sys\nsys.argv = ['media_cli.py', '6', '5']",
    "expr": "runpy.run_path('media_cli.py', run_name='__main__')", "raises": "SystemExit", "message_contains": "0", "expected_stdout": "Média: 5.5 (aprovado)",
    "name": "Executado como script, usa os argumentos e sai com código 0", "hint": "O guarda chama sys.exit(main(sys.argv[1:]))." }
]
```

### Soluções erradas
```python name="lógica imprime em vez de devolver" path=media_cli.py
import sys


def calcular_media(notas):
    media = sum(notas) / len(notas)
    print(f"Média: {media:.1f}")
    return media


def situacao(media):
    if media >= 5:
        return "aprovado"
    return "reprovado"


def main(argv):
    if len(argv) == 0:
        print("uso: media_cli.py NOTA [NOTA ...]", file=sys.stderr)
        return 2
    notas = []
    for texto in argv:
        try:
            nota = float(texto)
        except ValueError:
            print(f"erro: nota inválida: {texto}", file=sys.stderr)
            return 1
        if nota < 0 or nota > 10:
            print(f"erro: nota fora de 0 a 10: {texto}", file=sys.stderr)
            return 1
        notas.append(nota)
    media = calcular_media(notas)
    print(f"Média: {media:.1f} ({situacao(media)})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```
```python name="não trata texto que não é número"
import media_cli

for argv in (["7", "8.5", "6"], [], ["7", "11"]):
    print("$ python media_cli.py", *argv)
    print("código de saída:", media_cli.main(argv))
```
```python name="não trata texto que não é número" path=media_cli.py
import sys


def calcular_media(notas):
    return sum(notas) / len(notas)


def situacao(media):
    if media >= 5:
        return "aprovado"
    return "reprovado"


def main(argv):
    if len(argv) == 0:
        print("uso: media_cli.py NOTA [NOTA ...]", file=sys.stderr)
        return 2
    notas = [float(texto) for texto in argv]
    for nota in notas:
        if nota < 0 or nota > 10:
            print(f"erro: nota fora de 0 a 10: {nota}", file=sys.stderr)
            return 1
    media = calcular_media(notas)
    print(f"Média: {media:.1f} ({situacao(media)})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```
```python name="erros na saída normal" path=media_cli.py
import sys


def calcular_media(notas):
    return sum(notas) / len(notas)


def situacao(media):
    if media >= 5:
        return "aprovado"
    return "reprovado"


def main(argv):
    if len(argv) == 0:
        print("uso: media_cli.py NOTA [NOTA ...]")
        return 2
    notas = []
    for texto in argv:
        try:
            nota = float(texto)
        except ValueError:
            print(f"erro: nota inválida: {texto}")
            return 1
        if nota < 0 or nota > 10:
            print(f"erro: nota fora de 0 a 10: {texto}")
            return 1
        notas.append(nota)
    media = calcular_media(notas)
    print(f"Média: {media:.1f} ({situacao(media)})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```
```python name="não confere a faixa de 0 a 10" path=media_cli.py
import sys


def calcular_media(notas):
    return sum(notas) / len(notas)


def situacao(media):
    if media >= 5:
        return "aprovado"
    return "reprovado"


def main(argv):
    if len(argv) == 0:
        print("uso: media_cli.py NOTA [NOTA ...]", file=sys.stderr)
        return 2
    notas = []
    for texto in argv:
        try:
            nota = float(texto)
        except ValueError:
            print(f"erro: nota inválida: {texto}", file=sys.stderr)
            return 1
        notas.append(nota)
    media = calcular_media(notas)
    print(f"Média: {media:.1f} ({situacao(media)})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
```
```python name="sem o guarda: nada roda como script" path=media_cli.py
import sys


def calcular_media(notas):
    return sum(notas) / len(notas)


def situacao(media):
    if media >= 5:
        return "aprovado"
    return "reprovado"


def main(argv):
    if len(argv) == 0:
        print("uso: media_cli.py NOTA [NOTA ...]", file=sys.stderr)
        return 2
    notas = []
    for texto in argv:
        try:
            nota = float(texto)
        except ValueError:
            print(f"erro: nota inválida: {texto}", file=sys.stderr)
            return 1
        if nota < 0 or nota > 10:
            print(f"erro: nota fora de 0 a 10: {texto}", file=sys.stderr)
            return 1
        notas.append(nota)
    media = calcular_media(notas)
    print(f"Média: {media:.1f} ({situacao(media)})")
    return 0
```

## Passo 7 · Quiz · Linha de comando

### Pergunta
O comando `python notas.py ana 7.5` roda um script que faz `print(sys.argv[1] * 2)`. O que aparece?
- [ ] `15.0`
- [ ] `notas.pynotas.py`
- [x] `anaana`
- [ ] `7.57.5`
> `sys.argv[0]` é o nome do script, então `sys.argv[1]` é `'ana'`. Como todo item de `sys.argv` é texto, `* 2` repete a string.

### Pergunta
Um parser tem `parser.add_argument("--vezes", type=int, default=1)`. O que acontece com `parser.parse_args(["--vezes", "tres"])`?
- [ ] `args.vezes` vale `"tres"`, e o erro aparece só quando o programa fizer conta com ele
- [ ] `args.vezes` vale `1`, o padrão, porque o valor era inválido
- [x] O argparse imprime o uso e o erro em stderr e encerra com `SystemExit` de código 2
- [ ] O Python levanta `ValueError: invalid literal for int()` com o traceback completo
> Com `type=int`, o argparse tenta converter e, se não conseguir, trata como erro de uso: mensagem em stderr e código 2, sem traceback. Para quem usa o programa, a mensagem é muito mais clara.

### Pergunta
Por que se escreve `def main(argv)` e `sys.exit(main(sys.argv[1:]))` no guarda, em vez de ler `sys.argv` dentro de `main`?
- [ ] Porque `sys.argv` só existe dentro do guarda `__main__`
- [x] Porque assim `main` pode ser chamada com qualquer lista, em um teste ou por outro módulo, sem depender do terminal
- [ ] Porque `sys.exit` não funciona dentro de funções
- [ ] Porque o argparse exige receber a lista por parâmetro
> `sys.argv` existe em qualquer lugar, mas ler direto dele amarra a função ao terminal. Recebendo a lista por parâmetro, `main(["7", "8"])` funciona num teste, num notebook ou chamada por outro script.
