---
slug: n2-m1-04-heranca-e-super
titulo: Herança e super()
descricao: 'Reaproveitar e estender classes: subclasses, sobrescrita de métodos, super() e isinstance.'
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
- Criar subclasses que herdam e sobrescrevem métodos da classe base
- Chamar o construtor e os métodos da base com super()
- Usar isinstance e issubclass e explicar a ordem de resolução de métodos em uma frase
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `class Gato(Animal)`; tudo que a base tem a subclasse tem; sobrescrever `falar()`; `super().__init__(...)` para não repetir inicialização; estender em vez de substituir (`super().descricao() + ...`); `isinstance`/`issubclass`; MRO em uma frase e `Classe.__mro__` como curiosidade; quando herança é a ferramenta errada (composição, com um exemplo).

**Exercícios previstos.** `Funcionario` → `Gerente` com bônus no `salario_total()` usando `super()` (`expr`); `Forma` → `Circulo`/`Quadrado` com `area()` e lista polimórfica somando áreas (`expr` com `tolerance`); `Veiculo` → `Carro` com atributo extra e `__str__` estendido (`expr` + `expected_stdout`); quiz com `isinstance` em hierarquia de dois níveis.

**Erros comuns a cobrir.** Esquecer `super().__init__` e perder atributos (`AttributeError`); chamar `Base.__init__(self, ...)` e `super()` misturados; sobrescrever com assinatura incompatível; herdar só para "reaproveitar um método" quando composição bastaria.
