---
slug: n2-m6-04-pytest-e-tdd
titulo: pytest e TDD na prática
descricao: Testes como funções, assert simples, parametrização e fixtures; o ciclo vermelho-verde-refatora em um exercício guiado.
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
- Escrever testes no estilo pytest (funções, assert, pytest.raises, parametrize, fixtures)
- Converter uma suíte unittest para pytest e explicar as diferenças
- 'Aplicar o ciclo TDD: teste que falha → implementação mínima → refatoração'
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `pytest` não está no sandbox: a lição é leitura com saídas reais + exercícios em `unittest` que reproduzem o ciclo TDD. Conteúdo: `assert` com introspecção, `pytest.raises`, `@pytest.mark.parametrize`, fixtures, `conftest.py`, cobertura (`pytest --cov`) em uma frase; o ciclo TDD com o kata `FizzBuzz` e depois `carrinho de compras`.

**Exercícios previstos.** Quiz de 4 perguntas sobre pytest (descoberta de testes, parametrize, raises, fixture); TDD guiado: passo 1 escreve os testes (`unittest` `expect: fail` com `target` e `implementation` vazia: os testes precisam falhar), passo 2 implementa `calcular_total(carrinho, cupom)` (`call` + a própria suíte passando: `unittest` `expect: pass`), passo 3 refatora mantendo os testes (`call` + `unittest`).

**Erros comuns a cobrir.** Implementar antes do teste; teste que não falha primeiro; parametrizar com casos redundantes; fixtures com estado compartilhado.
