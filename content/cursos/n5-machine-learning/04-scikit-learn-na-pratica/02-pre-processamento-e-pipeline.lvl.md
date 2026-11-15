---
slug: n5-m4-02-pre-processamento-e-pipeline
titulo: Pré-processamento e Pipeline
descricao: StandardScaler, MinMaxScaler, OneHotEncoder, OrdinalEncoder, SimpleImputer, ColumnTransformer e Pipeline para evitar vazamento e repetição.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Montar um ColumnTransformer com tratamentos diferentes para colunas numéricas e categóricas
- Encadear pré-processamento e modelo em um Pipeline e ajustar tudo com um único fit
- Explicar como o Pipeline evita vazamento de dados na validação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Transformadores de escala, codificação (`handle_unknown="ignore"`), imputação; `ColumnTransformer` por tipo de coluna; `Pipeline([("prep", ...), ("modelo", ...)])`; `make_pipeline`; acessar etapas (`named_steps`); `set_output(transform="pandas")`; por que o pipeline é a unidade que vai para a validação cruzada e para produção (Nível 7).

**Exercícios previstos.** `montar_preprocessador(colunas_num, colunas_cat)` (`expr` conferindo o shape da saída em um DataFrame fixo); `pipeline_completo(...)` com logística (`expr` com `score` ≥ limiar); `nomes_das_colunas_apos_prep(pipeline)` (`call`); detectar vazamento em um código sem pipeline (`call` devolvendo as linhas com problema) ; quiz sobre `handle_unknown`.

**Erros comuns a cobrir.** `OneHotEncoder` sem `handle_unknown` quebrando no teste; imputar antes de dividir; esquecer `remainder`; acessar coeficientes sem `named_steps`.
