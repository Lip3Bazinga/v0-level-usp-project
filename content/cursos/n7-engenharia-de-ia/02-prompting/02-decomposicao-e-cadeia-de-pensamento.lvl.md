---
slug: n7-m2-02-decomposicao-e-cadeia-de-pensamento
titulo: Decomposição de tarefas e cadeia de pensamento
descricao: Dividir tarefas complexas em etapas, pedir raciocínio antes da resposta, autoverificação, e quando encadear várias chamadas em vez de uma.
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
- Decompor uma tarefa em subtarefas encadeadas com prompts específicos
- Aplicar cadeia de pensamento e autoverificação e medir o efeito em problemas de várias etapas
- Decidir entre uma chamada longa e uma cadeia de chamadas curtas por custo e confiabilidade
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Pipelines de prompts (extrair → normalizar → classificar → redigir); cadeia de pensamento ('explique passo a passo antes de responder') e por que ajuda em aritmética e lógica; separar raciocínio da resposta final (formato); autoverificação (gerar e checar); custo da cadeia; o simulado implementa um 'solucionador' de problemas de várias etapas que só acerta quando o prompt pede passos e formato.

**Exercícios previstos.** `pipeline_de_atendimento(cliente, mensagem)` com três etapas e saída estruturada (`expr`); `resolver_com_passos(cliente, problema)` com acurácia maior que sem passos nos casos fornecidos (`expr`); `extrair_resposta_final(texto)` por delimitador (`call`); `custo_de_pipeline(etapas, precos)` (`call`); quiz.

**Erros comuns a cobrir.** Pedir raciocínio e usar o texto inteiro como resposta; etapas que perdem informação (não passar o contexto adiante); cadeia sem tratamento de falha em uma etapa.
