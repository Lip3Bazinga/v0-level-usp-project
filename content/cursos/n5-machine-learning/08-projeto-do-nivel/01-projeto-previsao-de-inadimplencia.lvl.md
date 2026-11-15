---
slug: n5-m8-01-projeto-previsao-de-inadimplencia
titulo: 'Projeto final: previsão de inadimplência'
descricao: Construa, valide e documente um modelo que prevê inadimplência em um conjunto de dados de crédito, com pipeline, validação honesta, escolha de limiar por custo e análise de justiça.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 300
tempo_min: 240
publicada: false
projeto: true
solucao_apos_tentativas: 3
objetivos:
- Montar um pipeline completo (pré-processamento, modelo, busca de hiperparâmetros) reprodutível e sem vazamento
- Comparar ao menos três famílias de modelos com validação cruzada e uma baseline, reportando incerteza
- Escolher o limiar de decisão pelo custo do negócio e avaliar métricas por grupo
- Entregar funções com assinaturas fixas e um relatório (model card) gerado pelo código
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Projeto exigido para o certificado. Dados: conjunto sintético-realista de 30 000 clientes (renda, idade, histórico, tipo de contrato, região, atrasos anteriores, alvo `inadimplente` com 8 % de positivos) fornecido com dicionário. Funções exigidas: `carregar(caminho)`, `dividir(df, semente)` (estratificado, teste intocado), `montar_pipeline(modelo)` (ColumnTransformer + modelo), `comparar_modelos(X, y)` (logística, floresta, HGB + baseline, com CV estratificada repetida), `buscar_hiperparametros(pipeline, X, y)`, `escolher_limiar(y, scores, custo_fp, custo_fn)`, `avaliar_final(pipeline, X_teste, y_teste, limiar)`, `justica_por_grupo(...)`, `gerar_model_card(resultados) -> str`. Critérios: PR-AUC mínima no teste, sem vazamento (teste automático), limiar justificado, relatório com limitações.

**Passos previstos.** Leitura (problema, dados, custo dos erros, critérios) → carregar e dividir (`expr`) → pipeline e baseline (`expr` + `tolerance`) → comparação com CV (`call` DataFrame com colunas fixas) → busca (`call`) → limiar por custo (`call`) → avaliação final e justiça (`call` + `tolerance`) → model card (`call` com `match: contains`) → quiz de autoavaliação.

**Erros comuns a cobrir.** Tocar no teste mais de uma vez; reamostrar antes de dividir; limiar 0,5 por padrão; comparar modelos sem baseline; model card sem limitações e sem métricas por grupo.
