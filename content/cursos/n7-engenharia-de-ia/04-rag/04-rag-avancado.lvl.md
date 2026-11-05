---
slug: n7-m4-04-rag-avancado
titulo: 'RAG avançado: reformulação, roteamento, citações verificáveis e conversa'
descricao: Reescrever a pergunta com histórico, decompor perguntas compostas, rotear entre índices, verificar citações contra os trechos e manter conversas com memória de curto prazo.
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
- Reformular perguntas com base no histórico e decompor perguntas compostas em subconsultas
- Rotear consultas entre índices/ferramentas por classificação
- Verificar que cada citação aponta para um trecho que apoia a afirmação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** 'E no semestre seguinte?' precisa do histórico (reformulação com o simulado); decomposição (múltiplas recuperações e fusão); roteamento (calendário vs regimento vs FAQ) por classificação; verificação de citação (a sentença citada está no trecho `[n]`?); memória de conversa limitada; falhas típicas e métricas da lição anterior aplicadas a cada técnica.

**Exercícios previstos.** `reformular(cliente, historico, pergunta)` (`expr`); `decompor(cliente, pergunta)` devolvendo subperguntas (`expr`); `rotear(cliente, pergunta, indices)` (`expr`); `verificar_citacoes(resposta, trechos)` devolvendo citações sem apoio (`call`); `rag_conversacional(rag, historico, pergunta)` (`expr`); quiz.

**Erros comuns a cobrir.** Reformular sem o histórico (perde o referente); decompor perguntas simples (custo); roteamento sem opção 'nenhum'; aceitar citação `[n]` sem conferir o conteúdo.
