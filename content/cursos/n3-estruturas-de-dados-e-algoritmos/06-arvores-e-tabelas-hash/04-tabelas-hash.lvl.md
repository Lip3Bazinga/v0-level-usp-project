---
slug: n3-m6-04-tabelas-hash
titulo: Tabelas hash do zero
descricao: Funções de hash, encadeamento separado, endereçamento aberto, fator de carga e redimensionamento; por que dict e set são O(1) e quando não são.
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
- Implementar uma tabela hash com encadeamento separado, redimensionamento e as operações get/put/delete
- Explicar fator de carga, colisões, endereçamento aberto (sondagem linear) e o custo amortizado
- Relacionar __hash__/__eq__ do Python com o uso de objetos como chaves
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Função de hash (polinomial para strings) e `hash()` do Python; buckets com listas; fator de carga e redimensionar ao passar de 0,75; sondagem linear com marcadores de remoção; ataques por colisão (por que o Python randomiza o hash de strings); `__hash__`/`__eq__` consistentes e chaves imutáveis; comparação: `dict` do CPython usa endereçamento aberto; contagem de colisões como experimento.

**Exercícios previstos.** `hash_polinomial(texto, base, modulo)` (`call`); classe `TabelaHash` com encadeamento e redimensionamento (`expr` com 10^5 inserções e limite de tempo; `expr` conferindo `len(tabela.buckets)` após crescer); `TabelaHashAberta` com sondagem linear e remoção (`expr`); `contar_colisoes(chaves, tamanho)` (`call`); classe `Ponto` com `__hash__`/`__eq__` usável em `set` (`expr`); quiz.

**Erros comuns a cobrir.** Hash que ignora a ordem das letras (anagramas colidem); redimensionar sem reinserir (índices mudam); remoção em sondagem aberta quebrando a cadeia de busca sem o marcador; `__eq__` sem `__hash__` tornando a classe não hasheável.
