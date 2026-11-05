---
slug: n2-m1-06-dataclasses
titulo: Dataclasses
descricao: 'Classes de dados sem boilerplate: @dataclass, valores padrão, field, frozen, ordem e comparação.'
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
- Declarar classes de dados com @dataclass e anotações de tipo
- Usar field(default_factory=...) para listas e dicionários padrão
- Aplicar frozen=True e order=True e explicar o que cada um gera
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O que `@dataclass` gera (`__init__`, `__repr__`, `__eq__`); anotações de tipo como declaração dos campos; valores padrão e `field(default_factory=list)`; `frozen=True` (imutável, hasheável, usável em conjuntos); `order=True` para ordenar por campos; `asdict`; `__post_init__` para validação; quando usar dataclass vs classe comum vs dicionário.

**Exercícios previstos.** `Ponto` frozen com `distancia(outro)` (`expr` + `raises FrozenInstanceError` ao tentar atribuir); `Tarefa` com `tags: list = field(default_factory=list)` e teste de independência (`expr`); `Aluno` com `order=True` ordenando por `(nota, nome)` (`expr`); `Pedido` com `__post_init__` validando `quantidade > 0` (`raises ValueError`); quiz sobre `default_factory` e `__eq__` gerado.

**Erros comuns a cobrir.** `tags: list = []` (`ValueError: mutable default`); campo sem anotação de tipo (não vira campo); esquecer o decorador; comparar instâncias esperando identidade.
