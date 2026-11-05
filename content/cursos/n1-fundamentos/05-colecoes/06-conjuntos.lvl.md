---
slug: n1-m5-06-conjuntos
titulo: Conjuntos
descricao: 'Coleções sem repetição: remover duplicatas, união, interseção e diferença, e testes de pertinência rápidos.'
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
- Criar conjuntos, adicionar e remover elementos e explicar por que não há repetição nem ordem
- Aplicar união, interseção e diferença para resolver problemas de comparação de grupos
- Converter entre lista e conjunto para remover duplicatas preservando o que for necessário
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `set` com chaves ou `set()` (e por que `{}` é dicionário); `add`, `remove`/`discard`; `in`; `|`, `&`, `-`, `^`; `set(lista)` para tirar repetidos e `sorted(set(lista))` para devolver em ordem; conjuntos como forma de responder "quem fez A e B?" e "quem fez A mas não B?".

**Passos previstos.** Leitura (conjuntos) → Exercício: `sem_repetidos(lista)` devolvendo lista ordenada sem duplicatas e `tem_repetidos(lista)` (`call`) → Exercício: dados dois conjuntos de alunos (Python e Cálculo), devolver os que fazem os dois, só um e pelo menos um (`call` com `type: list` e ordenação definida no enunciado) → Quiz (3 perguntas: `{}` é o quê; `len({1, 1, 2})`; conjunto tem índice?).

**Erros comuns a cobrir.** `conjunto[0]` (TypeError); `{}` para conjunto vazio; `remove` de ausente (`KeyError`) em vez de `discard`; devolver conjunto quando o enunciado pede lista ordenada.
