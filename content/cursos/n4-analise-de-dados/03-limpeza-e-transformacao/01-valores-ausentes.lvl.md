---
slug: n4-m3-01-valores-ausentes
titulo: Valores ausentes
descricao: NaN, None e NA; isna, dropna, fillna (constante, média, mediana, ffill), e a decisão de remover ou imputar.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Detectar e contar valores ausentes por coluna e por linha
- Aplicar estratégias de remoção e imputação e justificar a escolha
- Explicar como NaN afeta somas, médias e comparações
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Representações (`np.nan`, `None`, `pd.NA`), `isna().sum()`, proporção por coluna; `dropna(how, thresh, subset)`; `fillna` com constante/média/mediana/por grupo, `ffill`/`bfill` em séries temporais; `NaN` ignorado em `mean` mas propagado em aritmética; `NaN != NaN`; sinalizar ausência com coluna booleana antes de imputar; viés da imputação pela média.

**Exercícios previstos.** `relatorio_ausentes(df)` (`call` dicionário coluna → proporção, `tolerance`); `imputar(df, estrategia)` (`expr`); `preencher_por_grupo(df, coluna, grupo)` com mediana do grupo (`expr`); `remover_linhas_quase_vazias(df, minimo)` com `thresh` (`expr`); quiz sobre `NaN == NaN` e sobre `mean` com ausentes.

**Erros comuns a cobrir.** `df[df.col == np.nan]` (sempre vazio); `dropna()` sem `subset` apagando metade da tabela; imputar antes de separar treino/teste (gancho para o Nível 5); `fillna` sem atribuir o resultado.
