---
slug: n2-m1-01-classes-e-objetos
titulo: Classes e objetos
descricao: 'O molde e a peça: definir uma classe, criar instâncias e guardar estado em atributos.'
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Definir uma classe com __init__ e criar vários objetos independentes
- Diferenciar classe, instância, atributo e método
- Explicar o papel de self em cada método
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que agrupar dados e comportamento (um dicionário `{"nome", "saldo"}` mais funções soltas vs. uma classe `Conta`); `class`, `__init__`, `self`, atributos de instância, criação de objetos e independência entre eles; `type()` de um objeto; convenção `PascalCase`. Diagrama simples de classe com atributos e métodos.

**Exercícios previstos.** `Aluno` com `nome`, `matricula`, `notas` (lista vazia) e método `adicionar_nota` (`expr` criando dois alunos e conferindo que as listas são independentes); `Retangulo` com `area()` e `perimetro()` (`expr`); `Contador` com `incrementar()` e `valor` (`expr` com várias chamadas); quiz sobre `self` e sobre atributo de classe vs de instância.

**Erros comuns a cobrir.** Esquecer `self` na assinatura (`TypeError: takes 0 positional arguments`); atribuir `nome = nome` sem `self.`; lista como atributo de classe compartilhada entre instâncias; chamar o método pela classe sem instância.
