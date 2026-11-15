---
slug: n7-m5-04-falhas-de-agentes-e-guardrails
titulo: Falhas de agentes e guardrails
descricao: Taxonomia de falhas (loops, ações destrutivas, alucinação de ferramenta, custo descontrolado), guardrails de entrada e saída, orçamento, confirmação humana e testes de agentes.
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
- Classificar falhas de agentes em um rastro e aplicar o guardrail adequado
- Implementar orçamento (passos, tokens, tempo) e confirmação humana para ações sensíveis
- Escrever testes de agentes com cenários fixos e ferramentas simuladas
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Catálogo de falhas com exemplos de rastros; guardrails: validação de entrada (tamanho, tema), de saída (formato, dados sensíveis), orçamento, lista de ferramentas permitidas por contexto, confirmação humana (`humano_no_circuito` como função injetável); testes com cenários (`unittest`) e ferramentas falsas que registram chamadas; métricas de agentes (taxa de sucesso, passos médios, custo).

**Exercícios previstos.** `classificar_falha(rastro)` (`call`); `Orcamento(passos, tokens)` que levanta `OrcamentoEstourado` (`expr` + `raises`); `com_confirmacao(acao, confirmar)` (`expr`); suíte `unittest` de cenários para o agente da secretaria (`unittest expect: pass` + mutante sem limite de passos `expect: fail`); quiz.

**Erros comuns a cobrir.** Guardrail só na entrada; confirmação automática 'para testar' que vai para produção; testes que chamam o LLM real (não determinísticos); medir sucesso sem olhar o custo.
