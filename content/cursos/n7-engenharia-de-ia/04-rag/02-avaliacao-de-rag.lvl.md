---
slug: n7-m4-02-avaliacao-de-rag
titulo: 'Avaliação de RAG: recuperação e resposta'
descricao: Recall@k, MRR e precisão da recuperação; fidelidade (a resposta está apoiada nos trechos?), relevância e correção da resposta; construção do conjunto de avaliação.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular recall@k, MRR e precisão@k para a etapa de recuperação
- Avaliar fidelidade e correção das respostas com regras e com um juiz simulado
- Construir e manter um conjunto de avaliação com perguntas, trechos esperados e respostas de referência
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Separar a avaliação em etapas; métricas de recuperação (reaproveita o Nível 5); fidelidade por sobreposição com os trechos e por juiz (o simulado tem um modo 'juiz' com rubrica); correção contra referência (correspondência de fatos-chave); matriz de erros (recuperou errado × gerou errado); o conjunto de 30 perguntas e como ampliá-lo.

**Exercícios previstos.** `recall_em_k`, `mrr`, `precisao_em_k` (`call` + `tolerance`); `fidelidade_por_sobreposicao(resposta, trechos)` (`call`); `julgar(cliente_juiz, pergunta, resposta, referencia)` (`expr`); `relatorio_de_avaliacao(rag, conjunto)` com tabela por etapa (`expr`); quiz sobre fidelidade vs correção.

**Erros comuns a cobrir.** Avaliar só a resposta final (não saber se o erro é da recuperação); juiz com o mesmo prompt do gerador; conjunto de avaliação com perguntas só fáceis; métricas sem intervalo de incerteza em 30 exemplos.
