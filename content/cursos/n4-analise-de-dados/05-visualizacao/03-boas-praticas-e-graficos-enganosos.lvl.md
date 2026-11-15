---
slug: n4-m5-03-boas-praticas-e-graficos-enganosos
titulo: Boas práticas e gráficos enganosos
descricao: Eixos truncados, escalas duplas, proporções, cores, rótulos e títulos que afirmam algo; checklist antes de publicar.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- matplotlib
xp: 90
tempo_min: 35
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Identificar os truques mais comuns de gráficos enganosos e corrigi-los
- Aplicar um checklist de legibilidade (título com mensagem, unidades, fonte, cores acessíveis)
- Reescrever um gráfico ruim em um bom mantendo os mesmos dados
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Galeria de erros com exemplos reais da imprensa brasileira (eixos truncados em barras, escala dupla, área vs comprimento, 3D, cores sem contraste); título que afirma a conclusão; unidades e fonte; daltonismo e paletas seguras; o checklist; anotações (`ax.annotate`) para destacar um ponto.

**Exercícios previstos.** `corrigir_eixo(ax)` garantindo `ax.get_ylim()[0] == 0` em barras (`expr`); `grafico_com_mensagem(df)` com título e anotação (`expr` conferindo `ax.texts`); quiz com cinco gráficos descritos para apontar o problema.

**Erros comuns a cobrir.** Truncar o eixo em barras; usar vermelho/verde como única distinção; título genérico ('Gráfico 1'); legenda cobrindo os dados.
