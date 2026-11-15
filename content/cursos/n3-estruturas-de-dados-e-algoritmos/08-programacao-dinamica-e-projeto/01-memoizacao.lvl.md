---
slug: n3-m8-01-memoizacao
titulo: 'Memoização: recursão sem repetir trabalho'
descricao: Subproblemas sobrepostos, memoização com dicionário e lru_cache, Fibonacci, caminhos em grade e troco.
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
- Identificar subproblemas sobrepostos e subestrutura ótima em um problema recursivo
- Aplicar memoização manual e com lru_cache e comparar o número de chamadas
- Resolver caminhos em grade, troco mínimo e escadas com memoização
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Fibonacci com contagem de chamadas (exponencial → linear); a receita: função recursiva correta → dicionário de resultados → `lru_cache`; as duas propriedades (sobreposição, subestrutura ótima); caminhos em grade com obstáculos; troco mínimo com moedas arbitrárias (o guloso falha com [1, 3, 4]); escadas com passos 1 ou 2; limite de recursão e quando ir para a tabela (próxima lição).

**Exercícios previstos.** `fib_memo(n)` com contador de chamadas (`call` com n = 500); `caminhos_na_grade(grade)` com obstáculos (`call`); `troco_minimo(moedas, valor)` devolvendo −1 se impossível (`call` com o caso [1, 3, 4] e 6); `formas_de_subir(n, passos)` (`call`); quiz sobre quando memoizar.

**Erros comuns a cobrir.** Memoizar função com argumento mutável (lista) sem converter em tupla; chave do dicionário incompleta (ignorar um parâmetro); `lru_cache` em método com `self` mutável; recursão profunda demais para n = 10^4 (ir para tabela).
