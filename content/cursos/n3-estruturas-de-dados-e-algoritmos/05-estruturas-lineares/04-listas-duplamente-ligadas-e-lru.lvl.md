---
slug: n3-m5-04-listas-duplamente-ligadas-e-lru
titulo: Listas duplamente ligadas e cache LRU
descricao: Nós com anterior e próximo, sentinelas, remoção O(1) dado o nó, e a combinação dicionário + lista dupla que implementa um cache LRU.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar uma lista duplamente ligada com sentinelas e remoção O(1) a partir do nó
- Combinar dicionário e lista dupla para implementar um cache LRU com get/put O(1)
- Explicar como OrderedDict e functools.lru_cache usam a mesma ideia
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `anterior`/`proximo`, sentinelas de início e fim eliminando casos especiais; `mover_para_frente(no)` e `remover(no)` O(1); o cache LRU: dicionário chave → nó, lista ordenada por uso; `get` move para a frente, `put` insere/evicta a cauda; `OrderedDict.move_to_end`; `lru_cache` do módulo 'decoradores' explicado por dentro; aplicação: cache de páginas, memoização com limite.

**Exercícios previstos.** Classe `ListaDupla` com sentinelas (`expr` com inserções/remoções e percurso nos dois sentidos); `CacheLRU(capacidade)` com `get`/`put` (`expr` com a sequência clássica de operações e a ordem de eviction); teste de desempenho com 10^5 operações (`expr` com limite de tempo; versão com `list` reprova); `historico_de_navegacao` com lista dupla (voltar/avançar) (`expr`); quiz.

**Erros comuns a cobrir.** Atualizar só um dos dois ponteiros; esquecer de mover para a frente no `get`; evictar antes de verificar se a chave já existe; usar lista do Python e `remove` (O(n)).
