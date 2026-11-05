---
slug: n6-m8-03-projeto-seu-modelo-de-linguagem
titulo: 'Projeto final: seu próprio modelo de linguagem'
descricao: 'Do tokenizador à geração: construa, treine, avalie e documente um modelo de linguagem em numpy sobre um corpus em português, com testes de gradiente, curvas, amostragem e um relatório de limitações.'
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 300
tempo_min: 240
publicada: false
projeto: true
solucao_apos_tentativas: 3
objetivos:
- Integrar tokenizador BPE, embeddings, blocos transformer, treino com Adam e geração em um pacote coeso
- Validar cada componente com verificação numérica de gradientes e testes de causalidade
- Treinar dentro de um orçamento de tempo e reportar perda de validação, perplexidade e amostras
- Documentar limitações, vieses observados e escolhas de projeto em um relatório gerado pelo código
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Projeto exigido para o certificado. Corpus fornecido (textos em português de domínio público, ~300 KB) e um orçamento de treino de 3 minutos no sandbox. Módulos e funções exigidas: `tokenizador.py` (`treinar_bpe`, `codificar`, `decodificar`), `modelo.py` (`montar(config)`, `forward(params, ids) -> logits`, `backward(...)`, `contar_parametros`), `treino.py` (`gerar_lote`, `treinar(config) -> historico`, com Adam, clipping e checkpoint), `geracao.py` (`gerar(params, prompt, n, temperatura, top_k, semente)`), `avaliacao.py` (`perplexidade(params, texto)`, `teste_de_causalidade(params)`, `grad_check(params)`) e `relatorio.py` (`gerar_relatorio(resultados) -> str`). Critérios: grad check < 1e-5, causalidade válida, perplexidade de validação abaixo do limiar do bigrama por margem definida, amostras determinísticas por semente, relatório com limitações e vieses.

**Passos previstos.** Leitura (especificação, corpus, orçamento, critérios) → tokenizador (`call` roundtrip e compressão) → modelo com grad check (`call`) → treino com histórico e checkpoint (`call` + limite de tempo) → geração e avaliação (`call` + `tolerance`) → relatório (`call` com `match: contains`) → quiz de autoavaliação.

**Erros comuns a cobrir.** Modelo grande demais para o orçamento; tokenizador treinado com o texto de validação; alvo não deslocado; avaliar perplexidade com `exp` da perda média em base errada; relatório sem perplexidade de validação.
