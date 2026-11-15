---
slug: n7-m1-05-escolha-de-modelos-e-multimodalidade
titulo: Escolha de modelos, multimodalidade e modelos abertos
descricao: Famílias de modelos, abertos vs fechados, rodar localmente (quantização), entrada de imagens e áudio, e um método para escolher por avaliação própria em vez de ranking.
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 80
tempo_min: 30
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Comparar modelos abertos e fechados em custo, privacidade, controle e qualidade
- Explicar quantização e os requisitos para rodar um modelo localmente
- Montar um procedimento de escolha baseado em um conjunto de avaliação próprio
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Leitura com quiz e um exercício: catálogo de famílias (sem nomes que envelhecem: descrever por porte e licença); modelos abertos, pesos e licenças; quantização (16 → 4 bits) e memória necessária (`parametros × bits / 8`); inferência local (CPU/GPU) e servidores; entrada multimodal (imagens, áudio) e seus custos; rankings públicos e seus vieses; o método: 30 exemplos reais + rubrica (gancho para o módulo de avaliação).

**Exercícios previstos.** `memoria_necessaria(n_params, bits)` (`call` + `tolerance`); `roda_local(n_params, bits, memoria_gb)` (`call`); `pontuar_opcoes(opcoes, pesos)` por critérios ponderados (`call`); quiz de 5 perguntas.

**Erros comuns a cobrir.** Escolher pelo ranking geral e não pela tarefa; ignorar privacidade dos dados enviados a terceiros; subestimar memória por esquecer o cache de contexto.
