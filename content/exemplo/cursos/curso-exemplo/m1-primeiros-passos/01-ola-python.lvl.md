---
slug: exemplo-m1-01-ola-python
titulo: Olá, Python
descricao: Seu primeiro programa e como o Python o executa.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 25
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
  - Executar um programa Python e ler a saída
  - Explicar o que `print` faz
---

## Passo 1 · Leitura · O que é um programa

Um programa é uma lista de instruções que o computador executa de cima para baixo,
uma de cada vez. Em Python, cada linha costuma ser uma instrução: quando você roda
o arquivo, o interpretador lê a primeira linha, executa, passa para a segunda, e
assim por diante até o fim.

A instrução mais simples é `print`, que escreve um texto na tela:

```python
print("Olá, mundo!")
```

O texto entre aspas é uma *string*. Tudo o que você colocar entre as aspas aparece
exatamente assim na saída, inclusive espaços e acentos. Nos próximos passos você
vai escrever e verificar o seu primeiro programa.

## Passo 2 · Exercício · Seu primeiro print

Escreva um programa de duas linhas usando `print`.

### Instruções
1. Use `print()` para exibir exatamente `Olá, mundo!`.
   Dica: o texto vai entre aspas.
2. Na linha seguinte, exiba o texto `Aprendendo Python`.

### Código inicial
```python
# Escreva seu código abaixo
```

### Solução
```python
print("Olá, mundo!")
print("Aprendendo Python")
```

### Dicas
1. `print` recebe o texto entre aspas: `print("texto")`.
2. Cada `print` escreve em uma linha nova.

### Verificação
```json
[
  { "id": "saida", "checkpoint": 1, "kind": "io", "stdin": "", "expected_stdout": "Olá, mundo!", "match": "contains",
    "name": "Exibe Olá, mundo!", "hint": "A saída precisa ter exatamente o texto Olá, mundo! (com vírgula e exclamação)." },
  { "id": "duas-linhas", "checkpoint": 2, "kind": "io", "stdin": "", "expected_stdout": "Olá, mundo!\nAprendendo Python", "match": "trimmed",
    "name": "Duas linhas, na ordem certa", "hint": "Use um print para cada linha." },
  { "id": "usa-print", "checkpoint": 1, "kind": "source", "rule": { "type": "calls", "name": "print" }, "name": "Usa print()" }
]
```

### Soluções erradas
```python name="sem aspas"
print(Olá, mundo!)
```
```python name="texto diferente"
print("Ola mundo")
print("Aprendendo Python")
```
```python name="tudo em uma linha"
print("Olá, mundo! Aprendendo Python")
```

## Passo 3 · Quiz · Fixando

### Pergunta
Qual função exibe texto na tela?
- [ ] `show()`
- [x] `print()`
- [ ] `echo()`
> `print()` escreve na saída padrão.

### Pergunta
O que acontece com o texto entre aspas em `print("Olá")`?
- [x] Aparece exatamente como foi escrito
- [ ] É convertido para maiúsculas
- [ ] É ignorado pelo Python
