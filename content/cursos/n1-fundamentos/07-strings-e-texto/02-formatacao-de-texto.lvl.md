---
slug: n1-m7-02-formatacao-de-texto
titulo: Formatação de texto e relatórios
descricao: Alinhamento, largura fixa, zeros à esquerda, separador de milhar, porcentagem e tabelas alinhadas com f-strings.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Usar os especificadores de formato de f-strings (largura, alinhamento, zeros, milhar, casas, porcentagem)
- Montar uma tabela alinhada em texto a partir de uma lista de registros
- Formatar valores monetários no padrão brasileiro
---

## Passo 1 · Leitura · O que vem depois dos dois-pontos

Você já escreveu `f"{preco:.2f}"` para mostrar duas casas decimais. O trecho depois dos dois-pontos, dentro das chaves, chama-se **especificador de formato**: ele não muda o valor, só diz como o valor vira texto. Com ele você controla largura, alinhamento, zeros, separador de milhar, casas decimais e porcentagem.

Na tabela, os resultados com espaços aparecem entre colchetes para você enxergar onde os espaços ficam:

| Especificador | O que faz | Exemplo | Resultado |
|---|---|---|---|
| `10` | ocupa pelo menos 10 posições | `f"[{'Ana':10}]"` | `[Ana       ]` |
| `<10` | alinha à esquerda em 10 posições | `f"[{'Ana':<10}]"` | `[Ana       ]` |
| `>10` | alinha à direita em 10 posições | `f"[{'Ana':>10}]"` | `[       Ana]` |
| `^9` | centraliza em 9 posições | `f"[{'Ana':^9}]"` | `[   Ana   ]` |
| `03d` | inteiro com zeros à esquerda, 3 dígitos | `f"{7:03d}"` | `007` |
| `,` | separa os milhares com vírgula | `f"{1234567:,}"` | `1,234,567` |
| `.2f` | duas casas decimais | `f"{3.14159:.2f}"` | `3.14` |
| `.1%` | multiplica por 100 e põe `%`, com uma casa | `f"{0.256:.1%}"` | `25.6%` |

Quatro detalhes evitam surpresas:

- **A largura é um mínimo.** Sobrando espaço, o Python completa; faltando, ele não corta: `f"[{'Ribeirão':>5}]"` dá `[Ribeirão]`.
- **Sem `<` nem `>`, texto fica à esquerda e número fica à direita.** `f"[{42:6}]"` dá `[    42]`.
- **Os pedaços se combinam, sempre nesta ordem:** alinhamento, largura, vírgula, casas. `f"[{1234.5:>12,.2f}]"` dá `[    1,234.50]`.
- **Letras acentuadas ocupam uma posição cada**, como as outras: `Preço` tem 5 caracteres.

O separador de milhar do Python segue o padrão americano: vírgula nos milhares e ponto nas casas. No Brasil é o contrário: R\$ 1.234,50. Transformar um no outro é um dos exercícios desta lição.

As strings também têm métodos de alinhamento, que servem para a mesma coisa quando o valor já é texto:

```python
print("Ana".ljust(6) + "|")     # Ana   |
print("Ana".rjust(6) + "|")     #    Ana|
print("[" + "Ana".center(7) + "]")   # [  Ana  ]
print("7".zfill(3))             # 007
```

Para que tudo isso? Para **colunas**. Se cada linha de um relatório usa as mesmas larguras, os valores ficam um embaixo do outro, qualquer que seja o tamanho de cada nome ou número.

## Passo 2 · Previsão · Largura e casas

Leia o programa, sem executar, e digite exatamente o que ele imprime. Os colchetes das duas primeiras linhas marcam onde o texto começa e termina: os espaços entre eles contam.

### Código
```python
print(f"[{'abc':>6}]")
print(f"[{'abc':<6}]")
print(f"{42:05d}")
print(f"{3.14159:.2f}")
print(f"{0.256:.1%}")
```

### Dicas
1. `>6` empurra o texto para a direita dentro de 6 posições: como `abc` tem 3 letras, sobram 3 espaços antes.
2. `05d` completa com zeros à esquerda até dar 5 dígitos.
3. `.1%` multiplica por 100, deixa uma casa e põe o sinal de porcentagem.

### Saída esperada
```text
[   abc]
[abc   ]
00042
3.14
25.6%
```

## Passo 3 · Exercício · Quatro formatos
modo: lacunas

Complete o especificador de formato de cada linha (`___`) para o programa imprimir exatamente isto:

```
[  USP  ]
1,234,567
[    7.50]
50%
```

Conte as posições entre os colchetes: são 7 na primeira linha e 8 na terceira.

### Instruções
1. Na primeira linha, centralize `USP` em 7 posições.
2. Na segunda linha, separe os milhares de 1234567.
3. Na terceira linha, mostre 7.5 com duas casas decimais, ocupando 8 posições.
   Dica: a largura vem antes do ponto.
4. Na quarta linha, mostre 0.5 como porcentagem, sem casas decimais.

### Código inicial
```python
print(f"[{'USP':___}]")
print(f"{1234567:___}")
print(f"[{7.5:___}]")
print(f"{0.5:___}")
```

### Solução
```python
print(f"[{'USP':^7}]")
print(f"{1234567:,}")
print(f"[{7.5:8.2f}]")
print(f"{0.5:.0%}")
```

### Dicas
1. `^` centraliza; depois dele vem a largura.
2. A vírgula, sozinha, separa os milhares.
3. A largura vem antes do ponto: `8.2f`. Na porcentagem, o número de casas vem entre o ponto e o `%`.

### Verificação
```json
[
  { "id": "centralizado", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "[  USP  ]", "match": "contains",
    "name": "USP centralizado em 7 posições", "hint": "Devem sobrar dois espaços de cada lado de USP." },
  { "id": "milhares", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "1,234,567", "match": "contains",
    "name": "1234567 com separador de milhar" },
  { "id": "largura-e-casas", "checkpoint": 3, "kind": "io", "stdin": "", "expected_stdout": "[    7.50]", "match": "contains",
    "name": "7.5 com duas casas em 8 posições", "hint": "São dois pedidos no mesmo especificador: a largura e as casas." },
  { "id": "porcentagem", "checkpoint": 4, "kind": "io", "stdin": "", "expected_stdout": "\n50%", "match": "regex",
    "name": "0.5 como porcentagem sem casas", "hint": "A saída é 50%, sem ponto nem casas decimais." },
  { "id": "saida-exata", "checkpoint": 4, "kind": "io", "stdin": "", "expected_stdout": "[  USP  ]\n1,234,567\n[    7.50]\n50%\n", "match": "exact",
    "name": "As quatro linhas, caractere por caractere", "hint": "Compare cada linha com o enunciado, inclusive os espaços dentro dos colchetes." }
]
```

### Soluções erradas
```python name="alinha à direita em vez de centralizar"
print(f"[{'USP':>7}]")
print(f"{1234567:,}")
print(f"[{7.5:8.2f}]")
print(f"{0.5:.0%}")
```
```python name="duas casas sem a largura 8"
print(f"[{'USP':^7}]")
print(f"{1234567:,}")
print(f"[{7.5:.2f}]")
print(f"{0.5:.0%}")
```
```python name="porcentagem com uma casa"
print(f"[{'USP':^7}]")
print(f"{1234567:,}")
print(f"[{7.5:8.2f}]")
print(f"{0.5:.1%}")
```
```python name="milhares com sublinhado em vez de vírgula"
print(f"[{'USP':^7}]")
print(f"{1234567:_}")
print(f"[{7.5:8.2f}]")
print(f"{0.5:.0%}")
```

## Passo 4 · Exercício · formatar_reais(valor)

O caixa de uma papelaria precisa mostrar valores no padrão brasileiro: ponto nos milhares, vírgula nos centavos e `R$ ` na frente.

```
formatar_reais(1234.5)    devolve   "R$ 1.234,50"
formatar_reais(0)         devolve   "R$ 0,00"
formatar_reais(1000000)   devolve   "R$ 1.000.000,00"
```

O Python só sabe formatar no padrão americano (`1,234.50`). O caminho é formatar assim e depois trocar os sinais. Cuidado com a troca: se você trocar as vírgulas por pontos e, em seguida, os pontos por vírgulas, a segunda troca desfaz a primeira e tudo vira vírgula. A saída é fazer a troca em três etapas, passando por um símbolo temporário que não aparece no número, como `"X"`.

### Instruções
1. Defina `formatar_reais(valor)`. Dentro dela, formate o valor com separador de milhar e duas casas decimais (padrão americano).
   Dica: os dois pedidos vão no mesmo especificador, na ordem da leitura.
2. Troque os sinais para o padrão brasileiro e devolva o texto com `R$ ` na frente (cifrão, R maiúsculo e um espaço).
   Dica: vírgula vira temporário; ponto vira vírgula; temporário vira ponto.

### Código inicial
```python
def formatar_reais(valor):
    pass
```

### Solução
```python
def formatar_reais(valor):
    americano = f"{valor:,.2f}"
    brasileiro = americano.replace(",", "X").replace(".", ",").replace("X", ".")
    return "R$ " + brasileiro
```

### Dicas
1. Formate primeiro com `:,.2f` e guarde o texto em uma variável.
2. Troque em três etapas, com três `replace` encadeados e um símbolo temporário.
3. Acrescente `"R$ "` na frente do resultado e devolva com `return`: a função devolve o texto, não imprime.

### Verificação
```json
[
  { "id": "zero", "checkpoint": 1, "kind": "call", "function": "formatar_reais", "args": [0], "expected": "R$ 0,00", "type": "str",
    "name": "formatar_reais(0)", "hint": "Sempre duas casas, com vírgula antes dos centavos, e R$ com um espaço na frente." },
  { "id": "centavos", "checkpoint": 1, "kind": "call", "function": "formatar_reais", "args": [49.9], "expected": "R$ 49,90", "type": "str",
    "name": "formatar_reais(49.9)", "hint": "São sempre duas casas decimais: 49.9 tem 90 centavos." },
  { "id": "arredonda", "checkpoint": 1, "kind": "call", "function": "formatar_reais", "args": [999.999], "expected": "R$ 1.000,00", "type": "str",
    "name": "formatar_reais(999.999) arredonda para duas casas" },
  { "id": "milhar", "checkpoint": 2, "kind": "call", "function": "formatar_reais", "args": [1234.5], "expected": "R$ 1.234,50", "type": "str",
    "name": "formatar_reais(1234.5)", "hint": "No padrão brasileiro o ponto separa os milhares e a vírgula separa os centavos." },
  { "id": "milhao", "checkpoint": 2, "kind": "call", "function": "formatar_reais", "args": [1000000], "expected": "R$ 1.000.000,00", "type": "str",
    "name": "formatar_reais(1000000)", "hint": "Todos os separadores de milhar viram ponto; só o último sinal é vírgula." }
]
```

### Soluções erradas
```python name="padrão americano"
def formatar_reais(valor):
    return "R$ " + f"{valor:,.2f}"
```
```python name="troca direta: tudo vira vírgula"
def formatar_reais(valor):
    texto = f"{valor:,.2f}"
    return "R$ " + texto.replace(",", ".").replace(".", ",")
```
```python name="sem separador de milhar"
def formatar_reais(valor):
    return "R$ " + f"{valor:.2f}".replace(".", ",")
```
```python name="sem o espaço depois do cifrão"
def formatar_reais(valor):
    texto = f"{valor:,.2f}"
    return "R$" + texto.replace(",", "X").replace(".", ",").replace("X", ".")
```
```python name="imprime em vez de devolver"
def formatar_reais(valor):
    texto = f"{valor:,.2f}"
    print("R$ " + texto.replace(",", "X").replace(".", ",").replace("X", "."))
```

## Passo 5 · Quiz · Formatos

### Pergunta
O que `f"[{'oi':>5}]"` produz?
- [ ] `[oi   ]`
- [x] `[   oi]`
- [ ] `[>>>oi]`
- [ ] `[oi]`
> `>5` alinha à direita em 5 posições. `oi` tem 2 letras, então sobram 3 espaços antes.

### Pergunta
O que `f"{1500000:,}"` produz?
- [ ] `1.500.000`
- [ ] `1500000,`
- [x] `1,500,000`
- [ ] `1,500,000.00`
> A vírgula no especificador separa os milhares no padrão americano, com vírgulas. As casas decimais só aparecem se você pedir, com `.2f`.

### Pergunta
O que `f"{0.5:.0%}"` produz?
- [ ] `0.5%`
- [ ] `50.0%`
- [ ] `0%`
- [x] `50%`
> O `%` multiplica o valor por 100 e acrescenta o sinal; o `.0` pede zero casas decimais.

## Passo 6 · Exercício · tabela(produtos)

A papelaria quer imprimir o estoque em colunas. Cada produto chega como uma tupla `(nome, quantidade, preço)`, e a função `tabela` **imprime** um cabeçalho e uma linha por produto, com estas larguras:

- `Produto`: 10 posições, alinhado à esquerda;
- `Qtd`: 5 posições, alinhado à direita;
- `Preço`: 10 posições, alinhado à direita, com duas casas decimais (aqui com ponto, o padrão do Python).

Para `tabela([("Caneta", 3, 2.5), ("Caderno", 12, 18.9)])`, a saída é exatamente:

```
Produto     Qtd     Preço
Caneta        3      2.50
Caderno      12     18.90
```

Com uma lista vazia, a função imprime só o cabeçalho.

### Instruções
1. Defina `tabela(produtos)` e imprima o cabeçalho com as palavras `Produto`, `Qtd` e `Preço` nas larguras e nos alinhamentos de cada coluna.
   Dica: texto entre aspas também aceita especificador: `{'Qtd':>5}`.
2. Para cada tupla da lista, imprima uma linha com o nome, a quantidade e o preço nas mesmas larguras, o preço com duas casas.
   Dica: o `for` pode desempacotar a tupla em três variáveis.

### Código inicial
```python
def tabela(produtos):
    pass
```

### Solução
```python
def tabela(produtos):
    print(f"{'Produto':<10}{'Qtd':>5}{'Preço':>10}")
    for nome, qtd, preco in produtos:
        print(f"{nome:<10}{qtd:>5}{preco:>10.2f}")
```

### Dicas
1. Use as mesmas larguras no cabeçalho e nas linhas; é isso que alinha as colunas, não os espaços digitados à mão.
2. As chaves ficam coladas umas nas outras: o espaço entre as colunas vem da largura.
3. Os especificadores das linhas são `<10`, `>5` e `>10.2f`.

### Verificação
```json
[
  { "id": "cabecalho", "checkpoint": 1, "kind": "expr", "expr": "tabela([])", "expected_stdout": "Produto     Qtd     Preço\n", "match": "exact",
    "name": "Lista vazia: só o cabeçalho", "hint": "O cabeçalho usa <10, >5 e >10, e é impresso antes do laço." },
  { "id": "exemplo", "checkpoint": 2, "kind": "expr", "expr": "tabela([(\"Caneta\", 3, 2.5), (\"Caderno\", 12, 18.9)])",
    "expected_stdout": "Produto     Qtd     Preço\nCaneta        3      2.50\nCaderno      12     18.90\n", "match": "exact",
    "name": "O exemplo do enunciado, caractere por caractere", "hint": "Confira as larguras (10, 5 e 10) e as duas casas do preço." },
  { "id": "outros-tamanhos", "checkpoint": 2, "kind": "expr", "expr": "tabela([(\"Apontador\", 100, 1), (\"Mochila\", 1, 129.99), (\"Lápis\", 24, 0.75)])",
    "expected_stdout": "Produto     Qtd     Preço\nApontador   100      1.00\nMochila       1    129.99\nLápis        24      0.75\n", "match": "exact",
    "name": "Nomes e números de outros tamanhos continuam alinhados", "hint": "Espaços digitados à mão só funcionam para um tamanho de nome; quem alinha é a largura do especificador." }
]
```

### Soluções erradas
```python name="espaços digitados à mão"
def tabela(produtos):
    print("Produto     Qtd     Preço")
    for nome, qtd, preco in produtos:
        print(f"{nome}        {qtd}      {preco:.2f}")
```
```python name="preço sem as duas casas"
def tabela(produtos):
    print(f"{'Produto':<10}{'Qtd':>5}{'Preço':>10}")
    for nome, qtd, preco in produtos:
        print(f"{nome:<10}{qtd:>5}{preco:>10}")
```
```python name="sem cabeçalho"
def tabela(produtos):
    for nome, qtd, preco in produtos:
        print(f"{nome:<10}{qtd:>5}{preco:>10.2f}")
```
```python name="quantidade alinhada à esquerda"
def tabela(produtos):
    print(f"{'Produto':<10}{'Qtd':<5}{'Preço':>10}")
    for nome, qtd, preco in produtos:
        print(f"{nome:<10}{qtd:<5}{preco:>10.2f}")
```
```python name="cabeçalho repetido dentro do laço"
def tabela(produtos):
    for nome, qtd, preco in produtos:
        print(f"{'Produto':<10}{'Qtd':>5}{'Preço':>10}")
        print(f"{nome:<10}{qtd:>5}{preco:>10.2f}")
```
