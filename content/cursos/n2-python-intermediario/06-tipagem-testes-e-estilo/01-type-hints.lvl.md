---
slug: n2-m6-01-type-hints
titulo: Type hints e verificação estática
descricao: Anotar parâmetros, retornos e variáveis, usar Optional, Union, list[int], dict[str, float], TypedDict e Protocol, e rodar o mypy.
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
- Anotar funções e classes com os tipos embutidos e genéricos (list[int], dict[str, float], Optional)
- Explicar que as anotações não são verificadas em tempo de execução e para que serve o mypy
- Ler um erro do mypy e corrigir o código ou a anotação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Sintaxe das anotações; `int | None`; `list[str]`, `dict[str, float]`, `tuple[int, int]`, `Callable`; `TypedDict` e `Protocol` em um exemplo cada; `mypy` no terminal e o que ele pega (o ambiente de verificação não roda o mypy: a lição mostra saídas reais e verifica as anotações via `__annotations__` com `expr`); por que tipar ajuda o editor e a leitura.

**Exercícios previstos.** Anotar quatro funções dadas (`expr` conferindo `f.__annotations__["return"]`); corrigir uma função cuja anotação diz `int` mas devolve `str` (`expr` + `call`); `buscar(lista, alvo) -> int | None` com uso correto do `None` (`call`); quiz com três saídas do mypy para interpretar.

**Erros comuns a cobrir.** Achar que a anotação converte ou valida; `List` de `typing` quando `list` basta (3.9+); `Optional[int]` sem tratar o `None`; anotar `self`.
