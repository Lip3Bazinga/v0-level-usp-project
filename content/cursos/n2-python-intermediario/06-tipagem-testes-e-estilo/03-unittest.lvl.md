---
slug: n2-m6-03-unittest
titulo: Testes automatizados com unittest
descricao: TestCase, asserções, setUp, testes de exceção e a organização de uma suíte de testes.
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
- Escrever classes TestCase com métodos test_ e as asserções adequadas (assertEqual, assertAlmostEqual, assertRaises, assertIn)
- Usar setUp para preparar objetos comuns e organizar testes por comportamento
- Escrever testes que detectam defeitos (matam mutantes) e não só confirmam o caso feliz
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Da função `testar_x()` com `assert` do Nível 1 para `unittest`: `TestCase`, nomes `test_...`, `assertEqual`/`assertTrue`/`assertAlmostEqual`/`assertRaises`/`assertIn`; `setUp`/`tearDown`; `python -m unittest`; um teste por comportamento; a ideia de mutante (a plataforma roda a suíte do aluno contra implementações defeituosas: verificação `unittest` com `expect: fail`).

**Exercícios previstos.** Suíte para `validar_cpf` que a referência passa e quatro mutantes reprovam (`unittest` `expect: pass` com `min_tests: 4` + `expect: fail` × 4); suíte para `ContaBancaria` com `setUp` e `assertRaises(SaldoInsuficiente)` (`unittest` × mutantes); corrigir um teste que passa por engano (asserção errada) (`unittest`); quiz sobre `assertEqual` vs `assertTrue` e sobre floats.

**Erros comuns a cobrir.** Métodos sem prefixo `test_` (não rodam); `assertTrue(a == b)` sem mensagem útil; float com `assertEqual`; testes dependentes entre si; testar implementação em vez de comportamento.
