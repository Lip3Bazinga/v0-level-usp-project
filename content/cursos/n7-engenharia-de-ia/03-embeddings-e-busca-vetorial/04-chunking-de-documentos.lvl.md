---
slug: n7-m3-04-chunking-de-documentos
titulo: Chunking de documentos
descricao: 'Dividir documentos em trechos: por tamanho, por parágrafos/títulos, com sobreposição, preservando metadados; avaliar o efeito do chunking na recuperação.'
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar estratégias de chunking (fixo com sobreposição, por estrutura markdown, por sentenças)
- Anexar metadados (fonte, título, posição) a cada trecho para citação
- Medir o efeito do tamanho do trecho na recuperação com um conjunto de perguntas e respostas
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que dividir (limite de contexto, precisão da recuperação); tamanho em tokens vs caracteres; sobreposição; dividir por títulos markdown e parágrafos (reaproveita strings do Nível 1); sentenças com regras simples; metadados para citar; avaliação com o corpus da secretaria (fornecido: regimento, calendário, FAQ) e 30 perguntas com o trecho correto anotado.

**Exercícios previstos.** `chunk_fixo(texto, tamanho, sobreposicao)` (`call`); `chunk_por_markdown(texto)` devolvendo trechos com títulos (`call`); `chunk_por_sentencas(texto, max_chars)` (`call`); `avaliar_chunking(estrategia, corpus, perguntas)` devolvendo recall@3 (`call` + `tolerance`); quiz.

**Erros comuns a cobrir.** Cortar no meio de uma palavra/sentença; perder o título do trecho (ambiguidade); sobreposição maior que o trecho; trechos enormes que diluem a similaridade.
