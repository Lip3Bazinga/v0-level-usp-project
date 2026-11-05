---
slug: n3-m2-03-analise-de-lacos-e-recursoes
titulo: Análise de laços e recursões simples
descricao: Contar operações em laços simples, aninhados e dependentes, e montar a recorrência de uma função recursiva.
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
- Derivar o custo de laços aninhados e dependentes (triangulares) contando iterações
- Analisar laços que dividem o problema (i *= 2) como logarítmicos
- Escrever a recorrência de uma função recursiva simples e resolvê-la por expansão
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Contagem de iterações: laço simples (n), aninhado (n·m), triangular (n(n−1)/2 → Θ(n²)), laço com passo multiplicativo (log n), laço dentro de laço logarítmico (n log n); funções chamadas dentro de laços (custo escondido de `in` e `insert(0)`); recorrências T(n) = T(n−1) + 1 (linear), T(n) = T(n−1) + n (quadrática), T(n) = 2T(n/2) + n (n log n) resolvidas por expansão/árvore de recursão; Teorema Mestre citado como tabela para os três casos usuais.

**Exercícios previstos.** `contar_iteracoes(n)` para quatro trechos dados, implementados fielmente com contador (`call` com n e valor exato); `classificar_trecho(codigo_id)` associando cada trecho à classe (`call`); `resolver_recorrencia(tipo, n)` calculando T(n) numericamente a partir da recorrência (`call`); `custo_escondido(lista)` reescrevendo uma função quadrática 'disfarçada' (`in` dentro de laço) para linear com `set` (`call` com n = 50 000 e limite de tempo); quiz.

**Erros comuns a cobrir.** Contar o laço triangular como n²/2 e dizer 'não é O(n²)'; esquecer o custo de operações 'de uma linha' (`lista.pop(0)`, `in`); recorrência sem o custo fora da chamada recursiva.
