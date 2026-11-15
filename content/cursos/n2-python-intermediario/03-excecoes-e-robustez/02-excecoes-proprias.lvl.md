---
slug: n2-m3-02-excecoes-proprias
titulo: Exceções próprias
descricao: Definir sua própria hierarquia de erros para que quem chama possa reagir a cada situação.
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
- Definir classes de exceção com uma base comum por domínio (ErroDaLoja → EstoqueInsuficiente)
- Anexar dados à exceção (atributos) e usá-los no tratamento
- Documentar quais exceções uma função levanta
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `class ErroDaLoja(Exception)`, subclasses específicas, atributos extras (`self.faltam = faltam`) e `__str__` personalizado; capturar pela base ou pela específica; exceções como parte do contrato da função (docstring `Raises:`); quando usar exceção vs devolver `None`/`False` (regra: situação excepcional vs resultado esperado).

**Exercícios previstos.** Hierarquia `ErroBancario` → `SaldoInsuficiente` (com `saldo` e `valor`) e `ContaBloqueada`, usada em `Conta.sacar` (`expr` + `raises SaldoInsuficiente`, `message_contains`); `Estoque.retirar` com `EstoqueInsuficiente.faltam` lido no `except` (`expr`); `processar_pedidos` que continua após falhas registrando quais falharam (`call`); quiz sobre herdar de `Exception` e sobre capturar pela base.

**Erros comuns a cobrir.** Herdar de `BaseException`; esquecer `super().__init__(mensagem)` e perder a mensagem; usar exceções para controle de fluxo normal; capturar a específica depois da base (o bloco nunca roda).
