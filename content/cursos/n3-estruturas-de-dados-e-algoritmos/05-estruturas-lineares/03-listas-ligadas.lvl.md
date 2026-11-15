---
slug: n3-m5-03-listas-ligadas
titulo: Listas ligadas simples
descricao: 'Nós e ponteiros: inserção e remoção no início, no fim e no meio, percurso, busca, inversão in-place e detecção de ciclo.'
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar uma lista ligada com classes No e ListaLigada e as operações básicas com custos corretos
- Inverter uma lista ligada in-place e detectar ciclos (Floyd)
- Comparar lista ligada e list do Python em custo de inserção, remoção e acesso
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `No(valor, proximo)`; cabeça (e cauda para append O(1)); inserir no início O(1), no fim, após um nó; remover por valor (ponteiro anterior); percurso e `__iter__`; `__len__` mantido como contador; inversão com três ponteiros; tartaruga e lebre para ciclo; encontrar o k-ésimo do fim com dois ponteiros; comparação com `list` (acesso O(n) vs O(1)). Desenhos passo a passo das trocas de ponteiro.

**Exercícios previstos.** Classe `ListaLigada` com `inserir_inicio`, `inserir_fim`, `remover`, `buscar`, `__iter__`, `__len__` (`expr` em sequência); `inverter()` in-place (`expr` com `source not_calls reversed`); `tem_ciclo(cabeca)` (`expr` com `setup` criando ciclo); `k_esimo_do_fim(cabeca, k)` (`expr`); `intercalar_ordenadas(a, b)` em listas ligadas (`expr`); quiz sobre custos.

**Erros comuns a cobrir.** Perder a referência ao resto ao inverter; remover a cabeça sem tratar o caso especial; `append` O(n) sem cauda quando o enunciado exige O(1); laço infinito ao percorrer lista com ciclo.
