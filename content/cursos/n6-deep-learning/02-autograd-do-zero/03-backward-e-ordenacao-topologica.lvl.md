---
slug: n6-m2-03-backward-e-ordenacao-topologica
titulo: backward e ordenação topológica
descricao: 'O método backward: ordenar o grafo topologicamente (DFS do Nível 3), zerar gradientes, definir grad=1 na saída e chamar _backward na ordem inversa.'
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar backward com ordenação topológica e explicar por que a ordem importa
- Verificar os gradientes do autograd contra diferenças finitas em expressões variadas
- Zerar gradientes entre iterações e explicar o acúmulo acidental
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que cada nó precisa ter o gradiente completo antes de propagar (ordem topológica reversa); DFS pós-ordem; `grad = 1.0` da saída; `zero_grad`; verificação numérica automatizada; grafo com variável repetida funcionando; limites da recursão em grafos grandes (iterativa opcional).

**Exercícios previstos.** `ordem_topologica(raiz)` (`expr` conferindo que cada nó aparece depois dos filhos); `Valor.backward()` com gradientes corretos em cinco expressões (`expr` + `tolerance` comparando com numérico); `zerar_gradientes(nos)` e demonstração do acúmulo (`expr`); quiz sobre a ordem.

**Erros comuns a cobrir.** Chamar `_backward` em ordem direta; não zerar gradientes entre `backward`s; `grad` da saída esquecido em 0; ordenação por BFS (errada para grafos com caminhos de tamanhos diferentes).
