---
slug: n3-m2-02-notacao-big-o
titulo: Notação Big-O
descricao: Definição informal e formal de O, Ω e Θ, regras práticas (descartar constantes e termos menores) e as classes mais comuns.
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
- Enunciar a definição de O(g(n)) e justificar por que 3n² + 10n é O(n²)
- Classificar funções de custo nas classes O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ)
- Diferenciar O (limite superior), Ω (inferior) e Θ (justo) e usar cada uma corretamente
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Big-O como "no máximo proporcional a, para n grande"; constantes c e n₀ com um exemplo numérico; regras: soma → domina o maior, produto → multiplica, descartar constantes; Ω e Θ; a tabela das classes com exemplos de operações do Python (`lista[i]` O(1), `x in lista` O(n), `x in set` O(1) médio, `sorted` O(n log n), `lista.insert(0, x)` O(n)) — base para as escolhas de estrutura do resto do curso.

**Exercícios previstos.** `simplificar_custo(termos)` que recebe termos como `[(3, "n^2"), (10, "n"), (5, "1")]` e devolve a classe (`call`); `classe_de_operacao(operacao)` para uma lista de operações do Python (`call`); `verificar_big_o(f, g, c, n0, ate)` testando numericamente f(n) ≤ c·g(n) (`call`); quiz com cinco expressões para classificar.

**Erros comuns a cobrir.** Achar que O(n) significa 'exatamente n operações'; descartar o log (O(n log n) ≠ O(n)); dizer que uma função é O(n²) e achar que isso prova que ela é lenta (O é limite superior); esquecer que `in` em lista é linear.
