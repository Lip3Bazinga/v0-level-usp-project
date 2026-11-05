---
slug: n7-m2-04-saida-estruturada-em-escala
titulo: 'Saída estruturada em escala: lotes, validação e custo'
descricao: Processar centenas de itens com prompts em lote, validar e corrigir saídas, medir taxa de falha, paralelismo e limites de taxa, e cache de respostas.
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Processar um lote de itens com validação por item, reparo e relatório de falhas
- Implementar cache de respostas por hash do prompt e medir a economia
- Respeitar limites de taxa com uma fila simples e estimar o tempo total
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Loop sobre itens com `try/except` por item, acumulação de falhas, reparo limitado; cache em dicionário/arquivo JSON por `sha256(prompt)`; limites de taxa (tokens por minuto) com janela deslizante (reaproveita deque do Nível 3); paralelismo com `concurrent.futures` citado (no sandbox roda sequencial); relatório final (sucessos, falhas, custo, tempo estimado).

**Exercícios previstos.** `processar_lote(cliente, itens, schema)` devolvendo resultados e falhas (`expr`); classe `Cache` com `obter/guardar` e contagem de acertos (`expr`); `limitador_de_taxa(limite_por_minuto)` simulado com relógio injetado (`expr`); `relatorio_de_lote(resultados)` (`call`); quiz sobre cache e idempotência.

**Erros comuns a cobrir.** Parar o lote na primeira falha; cache sem incluir os parâmetros no hash; estourar o limite de taxa e não esperar; não registrar quais itens falharam.
