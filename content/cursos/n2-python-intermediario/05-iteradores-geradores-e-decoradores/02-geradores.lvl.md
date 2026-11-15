---
slug: n2-m5-02-geradores
titulo: Geradores com yield
descricao: 'Funções que pausam e retomam: produzir sequências sob demanda, ler arquivos grandes e encadear etapas.'
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
- Escrever funções geradoras com yield e explicar o estado suspenso entre chamadas
- Processar arquivos e sequências grandes de forma preguiçosa (lazy)
- Encadear geradores em um pipeline (ler → filtrar → transformar)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `yield` transforma a função em gerador; `next` executa até o próximo `yield`; geradores são iteradores; memória constante vs lista inteira; `yield from`; pipeline de geradores (ler linhas → filtrar → converter → somar); `send` apenas citado. Exemplo central: processar um log de 1 milhão de linhas sem carregá-lo (o projeto 2 do nível).

**Exercícios previstos.** `pares_ate(n)` (`expr` com `type: generator` + `list`); `fibonacci()` infinito com `islice` (`expr`); `ler_registros(caminho)` gerador que converte linhas de um CSV simples em dicionários (`expr` + `source uses yield`); pipeline `filtrar(gerador, cond)` → `somar_campo` (`expr`); quiz sobre `return` em gerador e sobre consumo único.

**Erros comuns a cobrir.** Chamar a função geradora e esperar uma lista; `return valor` achando que devolve o valor; percorrer o gerador duas vezes; `print` em vez de `yield` dentro do gerador.
