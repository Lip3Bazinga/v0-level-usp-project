---
slug: n2-m1-02-metodos-e-str-repr
titulo: Métodos, __str__ e __repr__
descricao: Comportamento dentro da classe, métodos que chamam métodos e representações legíveis dos objetos.
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
- Escrever métodos que leem e alteram o estado do objeto e chamam outros métodos
- Implementar __str__ e __repr__ e explicar quando cada um é usado
- Usar atributos de classe para constantes e contadores compartilhados
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Métodos como funções que recebem o objeto; métodos que chamam `self.outro_metodo()`; `__str__` (para pessoas: `print`, `f-string`) e `__repr__` (para quem programa: no REPL e em listas); atributo de classe (`taxa = 0.1`, contador de instâncias); métodos que devolvem `self` para encadear (breve).

**Exercícios previstos.** `ContaBancaria` com `depositar`, `sacar` (sem saldo negativo, devolvendo `False`) e `__str__` no formato `Conta de Ana: R$ 150.00` (`expr` + `expected_stdout`); `Produto` com `__repr__` `Produto('Caneta', 2.5)` e lista impressa (`expr`); `Pedido` com atributo de classe `proximo_id` gerando ids sequenciais (`expr`); quiz com `print(obj)` vs `repr(obj)` e `[obj]`.

**Erros comuns a cobrir.** `__str__` que imprime em vez de devolver; `__repr__` ausente mostrando `<__main__.Produto object at 0x...>`; alterar atributo de classe via instância criando atributo de instância; esquecer `self` ao chamar outro método.
