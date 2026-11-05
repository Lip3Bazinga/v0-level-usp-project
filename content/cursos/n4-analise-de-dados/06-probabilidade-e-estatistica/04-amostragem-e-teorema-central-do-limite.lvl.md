---
slug: n4-m6-04-amostragem-e-teorema-central-do-limite
titulo: Amostragem e o Teorema Central do Limite
descricao: População e amostra, viés de seleção, distribuição amostral da média, erro padrão e o TCL demonstrado por simulação.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scipy
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Diferenciar população, amostra, parâmetro e estatística e reconhecer vieses de amostragem
- Simular a distribuição amostral da média e mostrar o TCL para populações não normais
- Calcular o erro padrão e explicar como ele diminui com n
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Amostra aleatória simples, estratificada; vieses (sobrevivência, resposta voluntária, as pesquisas eleitorais); distribuição amostral; TCL por simulação com população exponencial e uniforme (histogramas das médias para n = 2, 10, 50); erro padrão σ/√n; por que √n (quadruplicar a amostra para dobrar a precisão).

**Exercícios previstos.** `distribuicao_amostral(populacao, n, repeticoes, semente)` devolvendo média e desvio das médias (`call` + `tolerance`); `erro_padrao(amostra)` (`call`); `tamanho_para_erro(sigma, erro_desejado)` (`call`); `amostra_estratificada(df, estrato, n_por_estrato, semente)` (`expr`); quiz sobre vieses.

**Erros comuns a cobrir.** Confundir desvio da amostra com erro padrão; achar que o TCL diz que os dados ficam normais; amostra grande com viés (não resolve).
