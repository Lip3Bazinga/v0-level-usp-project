---
slug: n7-m5-01-loop-de-agente-react
titulo: O loop de agente (ReAct)
descricao: 'Pensar → agir → observar até responder: o loop com limite de passos, o formato das ações, parsing robusto e o rastro (trace) de cada execução.'
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar o loop ReAct com ferramentas, limite de passos e rastro completo
- Interpretar as ações do modelo com parsing robusto e tratar ações inválidas
- Explicar por que agentes falham (loops, ações inválidas, respostas prematuras) e como o rastro ajuda
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O padrão Thought/Action/Observation; ferramentas como funções com descrição; o simulado implementa um 'planejador' que escolhe ferramentas pelo nome e argumentos quando o prompt expõe as descrições; limite de passos e parada; rastro como lista de eventos; parsing com regex tolerante e reparo; ferramentas da secretaria (consultar calendário, buscar no regimento, calcular prazo).

**Exercícios previstos.** `interpretar_acao(texto)` (`call` com casos malformados → `None`); classe `Agente(cliente, ferramentas, max_passos)` com `executar(pergunta) -> (resposta, rastro)` (`expr` nos casos fornecidos); `resumir_rastro(rastro)` (`call`); `detectar_loop(rastro)` (`call`); quiz.

**Erros comuns a cobrir.** Sem limite de passos; executar ação não registrada; perder a observação entre passos; aceitar 'resposta final' sem ter usado ferramenta quando era necessária.
