---
slug: n4-m7-01-projeto-analise-de-dados-reais
titulo: 'Projeto final: análise de dados reais'
descricao: 'Da pergunta à conclusão: carregue um conjunto de dados público (amostra do ENEM/IBGE fornecida), limpe, explore, visualize, teste uma hipótese e escreva um relatório reprodutível.'
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scipy
- matplotlib
xp: 300
tempo_min: 240
publicada: false
projeto: true
solucao_apos_tentativas: 3
objetivos:
- Conduzir uma análise exploratória completa a partir de uma pergunta definida
- Limpar e transformar dados reais (tipos, ausentes, outliers, categorias) de forma documentada
- Produzir um painel de gráficos e um teste de hipótese com interpretação em linguagem clara
- Entregar funções com assinaturas fixas e um relatório em markdown gerado pelo código
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Projeto exigido para o certificado. Dados: amostra (20 000 linhas, anonimizada) de microdados do ENEM com notas, UF, tipo de escola, renda familiar e faixa etária, fornecida como arquivo junto com um dicionário de variáveis (sem rede: o arquivo acompanha o enunciado). Funções exigidas: `carregar(caminho) -> DataFrame` (tipos e categorias corretos), `limpar(df)` (ausentes, notas zero por ausência, faixas), `resumo_por_grupo(df, grupo)`, `painel(df) -> Figure` com 4 gráficos definidos, `testar_diferenca(df, grupo_a, grupo_b)` (Welch com d de Cohen e IC), `regressao_renda_nota(df)`, `gerar_relatorio(df) -> str` (markdown com números preenchidos). O relatório precisa responder à pergunta: 'a diferença de notas entre escola pública e privada se mantém ao controlar a renda?'.

**Passos previstos.** Leitura (pergunta, dicionário de variáveis, critérios) → carregar e limpar (`expr` conferindo dtypes e contagens) → resumo por grupo (`expr` + `tolerance`) → painel (`expr` conferindo os 4 eixos, títulos e tipos) → teste e tamanho de efeito (`call` + `tolerance`) → regressão com controle (`call`) → relatório (`call` com `match: contains` para os números-chave) → quiz de autoavaliação sobre as conclusões.

**Erros comuns a cobrir.** Tratar nota 0 (ausente na prova) como nota válida; comparar grupos sem olhar o n e a dispersão; concluir causalidade; painel com eixos truncados; relatório com números digitados à mão em vez de calculados.
