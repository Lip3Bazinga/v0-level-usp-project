---
slug: n1-m3-01-booleanos-e-comparacoes
titulo: Booleanos e comparações
descricao: True e False, os operadores de comparação e como uma expressão vira uma resposta sim/não.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 35
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Avaliar expressões com ==, !=, <, >, <= e >= e prever True ou False
- Diferenciar = (atribuição) de == (comparação)
- Guardar o resultado de uma comparação em uma variável booleana e usá-la
---

## Passo 1 · Leitura · Perguntas com resposta sim ou não

Até aqui seus programas faziam sempre a mesma coisa, linha após linha. Para um programa decidir algo, ele primeiro precisa fazer uma pergunta cuja resposta seja sim ou não. No Python, essas respostas são os dois valores do tipo `bool`, que você já conhece: `True` (verdadeiro) e `False` (falso).

Uma **comparação** é uma expressão que devolve um desses dois valores. São seis operadores:

| Operador | Pergunta | Exemplo | Resultado |
|---|---|---|---|
| `==` | é igual a? | `7 == 7` | `True` |
| `!=` | é diferente de? | `7 != 7` | `False` |
| `<` | é menor que? | `3 < 5` | `True` |
| `>` | é maior que? | `3 > 5` | `False` |
| `<=` | é menor ou igual a? | `5 <= 5` | `True` |
| `>=` | é maior ou igual a? | `4 >= 5` | `False` |

#### Um sinal guarda, dois sinais perguntam

`=` e `==` fazem coisas diferentes. Com um sinal só, você **guarda** um valor em uma variável. Com dois, você **pergunta** se dois valores são iguais:

```python
idade = 18           # guarda 18 na variável idade
print(idade == 18)   # pergunta: idade é igual a 18? Imprime True
```

O resultado de uma comparação é um valor como qualquer outro, então pode ser guardado em uma variável:

```python
nota = 7.5
aprovado = nota >= 6   # a comparação dá True, e True é guardado
print(aprovado)        # True
```

Variáveis assim costumam ter nomes que soam como perguntas: `aprovado`, `tem_estoque`, `eh_maior`.

#### Comparando textos

Textos também podem ser comparados. A igualdade exige que os dois sejam idênticos, letra por letra, e maiúsculas contam: `"Ana" == "ana"` é `False`. Já `<` e `>` seguem a ordem alfabética: `"a" < "b"` é `True`, porque `a` vem antes de `b`. Um detalhe: para o Python, todas as letras maiúsculas vêm antes das minúsculas, então `"Z" < "a"` é `True`.

#### Tipos diferentes

Um número inteiro e um decimal de mesmo valor são iguais: `5 == 5.0` é `True`. Mas um texto nunca é igual a um número, mesmo que pareça: `"10" == 10` é `False`. Isso importa porque `input()` sempre devolve texto. Converta com `int()` ou `float()` antes de comparar.

## Passo 2 · Previsão · Verdadeiro ou falso

Leia o programa abaixo sem executar. Cada linha imprime o resultado de uma comparação: `True` ou `False`. Digite as oito linhas da saída, na ordem.

### Código
```python
print(5 > 3)
print(5 == 5.0)
print("a" < "b")
print("Ana" == "ana")
print(10 != 10)
print(3 >= 3)
print("10" == 10)
print(len("abc") == 3)
```

### Dicas
1. Um texto e um número nunca são iguais, mesmo quando o texto é formado por dígitos.
2. Letra maiúscula e letra minúscula são caracteres diferentes para o Python.
3. `>=` também é verdadeiro quando os dois lados são iguais. E `!=` pergunta se os lados são diferentes.

### Saída esperada
```text
True
True
True
False
False
True
False
True
```

## Passo 3 · Exercício · Flags
modo: lacunas

Uma variável booleana que registra uma resposta sim ou não costuma ser chamada de *flag* (bandeira, em inglês): ou está levantada (`True`) ou está abaixada (`False`).

O programa abaixo tem os dados de uma pessoa: a idade, o saldo na carteira e o preço de um produto. Complete as lacunas (`___`) para criar três flags. Cada uma deve receber o resultado de uma comparação, e não um valor escrito à mão.

### Instruções
1. Complete `pode_votar`: verdadeiro quando a idade é 16 ou mais (no Brasil, o voto é permitido a partir dos 16 anos).
   Dica: "a partir de 16" inclui o próprio 16.
2. Complete `pode_comprar`: verdadeiro quando o saldo é maior ou igual ao preço.
3. Complete `eh_adulto`: verdadeiro quando a idade é 18 ou mais.

### Código inicial
```python
idade = 16
saldo = 50.0
preco = 49.9
pode_votar = idade ___ 16
pode_comprar = ___ >= ___
eh_adulto = idade ___ ___
```

### Solução
```python
idade = 16
saldo = 50.0
preco = 49.9
pode_votar = idade >= 16
pode_comprar = saldo >= preco
eh_adulto = idade >= 18
```

### Dicas
1. A comparação já devolve `True` ou `False`. Não escreva esses valores à mão, e nunca entre aspas.
2. "A partir de" e "ou mais" incluem o próprio valor: o operador precisa aceitar o igual.
3. Na segunda linha, a ordem importa: quem precisa ser maior ou igual é o saldo, não o preço.

### Verificação
```json
[
  { "id": "pode-votar", "checkpoint": 1, "kind": "variable", "variable": "pode_votar", "expected": true, "type": "bool",
    "name": "Com 16 anos, pode_votar é True", "hint": "A idade é exatamente 16. O operador que você escolheu aceita o igual? O valor precisa ser um booleano, não um texto." },
  { "id": "pode-comprar", "checkpoint": 2, "kind": "variable", "variable": "pode_comprar", "expected": true, "type": "bool",
    "name": "Saldo 50.0 cobre o preço 49.9", "hint": "Confira qual variável ficou de cada lado do >=." },
  { "id": "eh-adulto", "checkpoint": 3, "kind": "variable", "variable": "eh_adulto", "expected": false, "type": "bool",
    "name": "Com 16 anos, eh_adulto é False", "hint": "A maioridade começa aos 18, não aos 16." }
]
```

### Soluções erradas
```python name="True escrito como texto"
idade = 16
saldo = 50.0
preco = 49.9
pode_votar = "True"
pode_comprar = "True"
eh_adulto = "False"
```
```python name="maior que 16 em vez de maior ou igual"
idade = 16
saldo = 50.0
preco = 49.9
pode_votar = idade > 16
pode_comprar = saldo >= preco
eh_adulto = idade > 18
```
```python name="saldo e preço trocados de lado"
idade = 16
saldo = 50.0
preco = 49.9
pode_votar = idade >= 16
pode_comprar = preco >= saldo
eh_adulto = idade >= 18
```
```python name="adulto com a mesma regra do voto"
idade = 16
saldo = 50.0
preco = 49.9
pode_votar = idade >= 16
pode_comprar = saldo >= preco
eh_adulto = idade >= 16
```

## Passo 4 · Quiz · Comparações

### Pergunta
O que este código imprime?
```python
print("a" < "b")
```
- [x] `True`, porque textos são comparados pela ordem alfabética e `a` vem antes de `b`
- [ ] `False`, porque os dois textos têm o mesmo tamanho
- [ ] Um erro, porque `<` só funciona com números
- [ ] `a`, porque o menor dos dois textos é devolvido
> `<` e `>` funcionam com textos e seguem a ordem alfabética. O resultado de uma comparação é sempre `True` ou `False`.

### Pergunta
Qual é o resultado de `5 == 5.0`?
- [ ] `False`, porque um é `int` e o outro é `float`
- [x] `True`, porque os dois números têm o mesmo valor
- [ ] Um erro, porque não se comparam tipos diferentes
- [ ] `5.0`, porque o Python converte o inteiro
> Inteiro e decimal de mesmo valor são iguais. Quem nunca é igual a um número é um texto: `"5" == 5` é `False`.

### Pergunta
Qual é a diferença entre `x = 5` e `x == 5`?
- [ ] Nenhuma: as duas formas guardam 5 em `x`
- [ ] `x = 5` pergunta se `x` vale 5, e `x == 5` guarda 5 em `x`
- [x] `x = 5` guarda 5 em `x`, e `x == 5` pergunta se `x` vale 5 e devolve `True` ou `False`
- [ ] `x == 5` guarda 5 em `x` duas vezes
> Um sinal é atribuição: muda a variável. Dois sinais são comparação: não mudam nada, só respondem `True` ou `False`.
