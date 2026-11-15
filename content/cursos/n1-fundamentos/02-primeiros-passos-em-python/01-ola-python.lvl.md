---
slug: n1-m2-01-ola-python
titulo: Olá, Python
descricao: 'Seu primeiro programa: print, texto entre aspas, várias linhas e comentários.'
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 35
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever e executar um programa que imprime texto com print()
- Usar aspas corretamente e imprimir várias linhas
- Escrever comentários e explicar por que o Python os ignora
---

## Passo 1 · Leitura · Seu primeiro programa

Um programa em Python é um texto com instruções, uma por linha. O Python lê esse texto **de cima para baixo** e executa uma linha de cada vez. A primeira instrução que você vai aprender é a que faz o programa mostrar algo na tela: `print`.

```python
# Meu primeiro programa
print("Bom dia!")
print("Hoje tem aula de Python.")
print()
print('Até amanhã.')  # aspas simples também valem
```

Saída:

```
Bom dia!
Hoje tem aula de Python.

Até amanhã.
```

Compare o programa com a saída, linha por linha.

**`print(...)` exibe o que está entre os parênteses.** O nome é sempre em minúsculas e os parênteses são obrigatórios. `Print("oi")` e `print "oi"` são erros.

**Texto vai entre aspas.** As aspas avisam ao Python: "isto é um texto, mostre exatamente assim". Elas não aparecem na saída. Um texto entre aspas se chama **string**. Você pode usar aspas duplas (`"..."`) ou simples (`'...'`), desde que abra e feche com o mesmo tipo.

**Cada `print` escreve uma linha.** Três `print` com texto, três linhas na tela, na mesma ordem em que foram escritos. Se você trocar duas linhas do programa de lugar, a saída troca junto.

**`print()` vazio escreve uma linha em branco.** Sem nada entre os parênteses, o Python só pula a linha. É assim que se separa um bloco de texto de outro.

**Tudo depois de `#` é comentário.** O Python ignora o que vem depois do `#` até o fim da linha. O comentário é um recado para quem lê o código: você daqui a um mês, ou um colega. A primeira linha do exemplo é só comentário e não produz saída. Na última, o `print` roda normalmente e o Python despreza apenas o trecho depois do `#`.

Há uma exceção: um `#` **dentro das aspas** faz parte do texto. `print("Sala #3")` mostra `Sala #3`.

Um detalhe a mais: `print` aceita vários valores separados por vírgula e coloca um espaço entre eles. `print("Nota:", 10)` mostra `Nota: 10`. Esse espaço e a quebra de linha no fim podem ser trocados com `sep` e `end`, como em `print("a", "b", sep="-")`, que mostra `a-b`. É só uma curiosidade por enquanto.

O computador segue o texto ao pé da letra. Ele não corrige acento, maiúscula nem pontuação. Se o enunciado pede `Olá, mundo!`, então `Ola mundo` é outra resposta.

## Passo 2 · Exercício · Olá, mundo
modo: lacunas

É tradição: o primeiro programa de quem aprende uma linguagem mostra "Olá, mundo!" na tela. O código abaixo já tem os dois `print`; falta o que vai dentro dos parênteses. Troque cada `___` pelo texto pedido, **com as aspas**.

A saída deve ser exatamente esta:

```
Olá, mundo!
Eu estou aprendendo Python
```

### Instruções
1. Complete o primeiro `print` para exibir exatamente `Olá, mundo!` (com acento, vírgula e ponto de exclamação).
   Dica: o texto começa e termina com aspas.
2. Complete o segundo `print` para exibir exatamente `Eu estou aprendendo Python`.

### Código inicial
```python
print(___)
print(___)
```

### Solução
```python
print("Olá, mundo!")
print("Eu estou aprendendo Python")
```

### Dicas
1. Texto vai entre aspas: sem elas, o Python não entende que é um texto.
2. Cada `print` escreve uma linha. São dois textos, um em cada `print`.
3. A primeira lacuna vira `"Olá, mundo!"`, com as aspas. Faça o mesmo na segunda, com a outra frase.

### Verificação
```json
[
  { "id": "chama-print", "checkpoint": 1, "kind": "source", "rule": { "type": "calls", "name": "print" },
    "name": "O programa usa print", "hint": "Mantenha os dois print e troque só as lacunas." },
  { "id": "ola-mundo", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "Olá, mundo!", "match": "contains",
    "name": "Exibe Olá, mundo!", "hint": "Confira o acento em Olá, a vírgula, o espaço e o ponto de exclamação." },
  { "id": "duas-linhas", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "Olá, mundo!\nEu estou aprendendo Python",
    "name": "Duas linhas, na ordem certa", "hint": "A saída tem duas linhas: uma para cada print. Compare letra por letra com o enunciado." }
]
```

### Soluções erradas
```python name="texto sem acento, vírgula e exclamação"
print("Ola mundo")
print("Eu estou aprendendo Python")
```
```python name="os dois textos no mesmo print"
print("Olá, mundo!", "Eu estou aprendendo Python")
```
```python name="texto sem aspas"
print(Olá, mundo!)
print(Eu estou aprendendo Python)
```

## Passo 3 · Exercício · Cartão de visita
modo: ordenar

As linhas de um programa estão embaralhadas. Arraste-as para a ordem certa, de modo que o programa mostre este cartão de visita, com uma linha em branco antes da cidade:

```
Ana Souza
Ciência da Computação

Ribeirão Preto
```

Uma das linhas está sobrando: ela tem um erro e não faz parte da resposta. Nenhuma linha precisa de indentação (recuo) neste exercício.

### Instruções
1. Monte as linhas na ordem em que os textos aparecem na saída: nome, curso e cidade.
2. Coloque a linha que pula uma linha no lugar certo: entre o curso e a cidade.

### Solução
```python
print("Ana Souza")
print("Ciência da Computação")
print()
print("Ribeirão Preto")
```

### Distratores
```python
print "Ana Souza"
```

### Dicas
1. O Python executa de cima para baixo: a primeira linha do programa produz a primeira linha da saída.
2. `print()` sem nada dentro escreve uma linha em branco.
3. A linha em branco fica entre o curso e a cidade. A linha sem parênteses é a que sobra.

### Verificação
```json
[
  { "id": "nome-primeiro", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "^Ana Souza\\nCiência da Computação\\n", "match": "regex",
    "name": "Começa com o nome e depois o curso", "hint": "A primeira linha da saída é o nome; a segunda é o curso." },
  { "id": "cartao", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "Ana Souza\nCiência da Computação\n\nRibeirão Preto\n", "match": "exact",
    "name": "Cartão completo, com a linha em branco no lugar", "hint": "São quatro linhas de saída, e a terceira é a linha em branco." }
]
```

### Soluções erradas
```python name="sem o print() vazio"
print("Ana Souza")
print("Ciência da Computação")
print("Ribeirão Preto")
```
```python name="print() vazio no fim"
print("Ana Souza")
print("Ciência da Computação")
print("Ribeirão Preto")
print()
```
```python name="linha em branco depois do nome"
print("Ana Souza")
print()
print("Ciência da Computação")
print("Ribeirão Preto")
```

## Passo 4 · Previsão · O que este programa imprime

Leia o programa abaixo sem executar. Digite exatamente o que ele mostra na tela, uma linha da saída em cada linha da sua resposta.

### Código
```python
print("Primeira")
# print("Segunda")
print()
print("Terceira")
```

### Dicas
1. Tudo o que vem depois de `#` é ignorado, mesmo que pareça código.
2. A linha em branco do meio faz parte da resposta.

### Saída esperada
```text
Primeira

Terceira
```

## Passo 5 · Quiz · print e aspas

### Pergunta
Qual instrução mostra o texto `Bom dia` na tela?
- [ ] `Print("Bom dia")`
- [x] `print("Bom dia")`
- [ ] `print "Bom dia"`
- [ ] `# print("Bom dia")`
> O nome é `print`, em minúsculas e com parênteses. `Print` com maiúscula é outro nome, que o Python não conhece; sem parênteses é erro de sintaxe; e a linha que começa com `#` é um comentário, que não executa.

### Pergunta
O que acontece ao executar este programa?
```python
print(Olá)
```
- [ ] Mostra `Olá` na tela
- [ ] Mostra `"Olá"`, com as aspas
- [x] Dá erro: `NameError: name 'Olá' is not defined`
- [ ] Não mostra nada, porque falta o texto
> Sem aspas, o Python não trata `Olá` como texto: ele procura algo que tenha esse **nome**. Como nada foi criado com esse nome, o programa para com `NameError`. Com aspas, `print("Olá")`, funciona.

## Passo 6 · Exercício · Conserte o programa

Agora o editor é todo seu. O programa abaixo deveria mostrar a lista de compras, mas não roda: o Python para antes de executar a primeira linha, com a mensagem `SyntaxError: unterminated string literal`, que quer dizer "texto sem fim". Alguém esqueceu de fechar uma string.

Conserte o programa para que a saída seja exatamente esta:

```
Lista de compras
Item #1: arroz
Item #2: feijão
```

Atenção ao `#` das duas últimas linhas: ele parece o começo de um comentário, mas veja onde está antes de mexer.

### Instruções
1. Corrija a linha com erro para que o programa volte a rodar e mostre `Lista de compras`.
   Dica: toda string abre e fecha com o mesmo tipo de aspas.
2. Deixe as três linhas da saída exatamente como no enunciado, sem apagar nem alterar os textos.

### Código inicial
```python
print("Lista de compras)
print("Item #1: arroz")
print("Item #2: feijão")
```

### Solução
```python
print("Lista de compras")
print("Item #1: arroz")
print("Item #2: feijão")
```

### Dicas
1. Cada string abre e fecha com o mesmo tipo de aspas. Conte as aspas de cada linha.
2. Um `#` dentro das aspas é texto, não comentário: as duas últimas linhas já estão certas.
3. Falta uma aspa dupla na primeira linha, logo depois de `compras` e antes do parêntese.

### Verificação
```json
[
  { "id": "primeira-linha", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "^Lista de compras\\n", "match": "regex",
    "name": "O programa roda e começa com Lista de compras", "hint": "Feche a string da primeira linha; não apague a linha." },
  { "id": "lista-completa", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "Lista de compras\nItem #1: arroz\nItem #2: feijão",
    "name": "As três linhas, iguais às do enunciado", "hint": "Os itens levam o # no texto. Compare cada linha com o enunciado." }
]
```

### Soluções erradas
```python name="apaga a linha com erro"
print("Item #1: arroz")
print("Item #2: feijão")
```
```python name="tira o # do texto"
print("Lista de compras")
print("Item 1: arroz")
print("Item 2: feijão")
```
```python name="fecha com aspas simples"
print("Lista de compras')
print("Item #1: arroz")
print("Item #2: feijão")
```
