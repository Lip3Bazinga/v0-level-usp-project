---
slug: n2-m1-07-metodos-especiais
titulo: 'Métodos especiais: objetos que se comportam como nativos'
descricao: '__eq__, __lt__, __len__, __getitem__, __contains__, __add__ e __iter__: faça sua classe funcionar com ==, len(), in, + e for.'
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
- Implementar comparação e ordenação com __eq__ e __lt__ (e functools.total_ordering)
- Fazer uma classe se comportar como coleção com __len__, __getitem__, __contains__ e __iter__
- Sobrecarregar operadores aritméticos com __add__ e __mul__ devolvendo novos objetos
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O protocolo dos dunders: `__eq__` (e `__hash__` quando igualdade muda), `__lt__` + `total_ordering`, `__len__`, `__getitem__` (que habilita `for` e fatias), `__contains__`, `__iter__`, `__add__`/`__mul__`/`__radd__`, `__bool__`. `NotImplemented` para tipos incompatíveis. Exemplo guia: `Vetor2D` e `Baralho`.

**Exercícios previstos.** `Dinheiro` com `__eq__`, `__lt__`, `__add__` e `__repr__` (`expr` com `sorted` e `sum`); `Baralho` com `__len__`, `__getitem__` e `__contains__` percorrido com `for` e fatiado (`expr`); `Vetor2D` com `__add__`, `__mul__` por escalar, `__eq__` e `__abs__` (`expr` com `tolerance`); quiz sobre `NotImplemented` vs `NotImplementedError` e sobre `__hash__`.

**Erros comuns a cobrir.** `__eq__` devolvendo `True` para tipos diferentes sem checar; `__lt__` sem `total_ordering` e usar `>`; `__getitem__` sem `IndexError` (laço `for` infinito); `__add__` alterando `self` em vez de devolver um objeto novo.
