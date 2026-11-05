---
slug: n1-m5-07-compreensoes
titulo: Compreensões de lista e de dicionário
descricao: Criar listas e dicionários em uma linha a partir de outra coleção, com filtro, sem perder a legibilidade.
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
- Reescrever laços de transformação e filtro como compreensões de lista
- Escrever compreensões de dicionário e de conjunto
- Reconhecer quando uma compreensão fica ilegível e voltar ao laço
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** A forma `[expressao for x in colecao if condicao]` lida como frase; equivalência com o laço de acumulador; compreensão de dicionário `{k: v for ...}` e de conjunto; aninhadas só como leitura (e o alerta de legibilidade); `sum(x for x in ...)` como gosto de geradores (Nível 2).

**Passos previstos.** Leitura (compreensões) → Exercício: reescrever três laços dados como compreensões (`call` + `source uses list_comprehension` e `not_uses for` dentro da função) → Exercício: `tamanhos(palavras)` → dicionário palavra → tamanho com `dict_comprehension` (`call` + `source`) → Quiz (3 perguntas, duas "o que produz") → Exercício: `quadrados_impares(n)` e `iniciais(nomes)` (`call`).

**Erros comuns a cobrir.** Colocar o `if` antes do `for` (sintaxe de `if/else` condicional vs filtro); parênteses em vez de colchetes (vira gerador — explicar); compreensão com efeito colateral (`print` dentro); laços triplos ilegíveis.
