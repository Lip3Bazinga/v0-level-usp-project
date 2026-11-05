---
slug: n7-m4-01-pipeline-rag-completo
titulo: Pipeline RAG completo
descricao: Indexar, recuperar, montar o prompt com os trechos e gerar a resposta com citações; o esqueleto que o projeto final estende.
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
- Montar o pipeline indexar → recuperar → montar prompt → gerar com o cliente simulado
- Construir prompts que restringem a resposta aos trechos e pedem citação de fonte
- Tratar o caso 'não há informação suficiente' em vez de inventar
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Classe `RAG(indice, cliente, prompt)`: `indexar(documentos)`, `responder(pergunta, k)`; prompt com trechos numerados e instrução de citar `[n]`; o simulado responde a partir dos trechos (regra: extrai a sentença mais similar e cita) e devolve 'não encontrei' quando a similaridade está abaixo do limiar — permitindo verificação; orçamento de contexto; registro das fontes na resposta.

**Exercícios previstos.** `montar_prompt_rag(pergunta, trechos)` (`call` estrutura); classe `RAG` com `responder` devolvendo texto, fontes e trechos usados (`expr` nas 30 perguntas com acurácia ≥ limiar); `responder_ou_recusar(rag, pergunta, limiar)` (`expr`); `respeitar_orcamento(trechos, limite_tokens)` (`call`); quiz sobre citação.

**Erros comuns a cobrir.** Prompt sem restrição ('responda com base nos trechos') permitindo invenção; trechos sem identificação (citações impossíveis); k grande estourando o contexto; recusar nunca (sempre responder).
