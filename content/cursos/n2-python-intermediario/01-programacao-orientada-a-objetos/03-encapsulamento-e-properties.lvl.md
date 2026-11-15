---
slug: n2-m1-03-encapsulamento-e-properties
titulo: Encapsulamento e properties
descricao: Proteger o estado com atributos privados, validar com setters e expor valores calculados com @property.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Usar a convenção _privado e explicar o que o Python garante e o que não garante
- Criar propriedades com @property e @x.setter para validar atribuições
- Levantar ValueError em atribuições inválidas e testar esse comportamento
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que esconder o estado (invariantes: saldo nunca negativo, idade nunca < 0); `_atributo` por convenção e `__atributo` com name mangling (citado); `@property` para atributo calculado (`area`, `nome_completo`) e para leitura; `@x.setter` com validação e `raise ValueError`; property sem setter gera `AttributeError` ao atribuir. Relação com a verificação `expr` (`raises`).

**Exercícios previstos.** `Temperatura` com `celsius` validado (≥ −273.15) e `fahrenheit` calculado (`expr` + `raises ValueError`); `ContaBancaria` reescrita com `saldo` somente leitura (`setattr` deve levantar `AttributeError`; `sacar(999)` deve levantar `ValueError` com `insuficiente` na mensagem — `message_contains`); `Pessoa` com `idade` validada e `eh_adulto` (`expr`); quiz sobre `_` vs `__` e property sem setter.

**Erros comuns a cobrir.** Recursão infinita no setter (`self.x = x` dentro do setter de `x`); validar só no `__init__` e não no setter; `@property` com parênteses na chamada (`obj.area()` → `TypeError`); mensagens de erro vagas.
