---
slug: n5-m4-06-vies-variancia-e-curvas-de-aprendizado
titulo: Viés, variância e curvas de aprendizado
descricao: A decomposição do erro, sub e sobreajuste, curvas de validação por hiperparâmetro e curvas de aprendizado por tamanho do treino, e o que fazer em cada diagnóstico.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Explicar a decomposição viés-variância e reconhecê-la em curvas de treino/validação
- Gerar curvas de validação e de aprendizado com scikit-learn e diagnosticar o modelo
- Escolher a ação adequada (mais dados, regularizar, simplificar, mais atributos) a partir do diagnóstico
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Erro = viés² + variância + ruído, com simulação (ajustar polinômios a amostras diferentes e medir a variação); `validation_curve`, `learning_curve`; leitura das curvas (gap grande = variância; ambas altas = viés); tabela de ações; regularização como controle de variância; o 'double descent' citado como curiosidade.

**Exercícios previstos.** `simular_vies_variancia(grau, n_amostras, semente)` (`call` + `tolerance` ampla); `curva_de_validacao(pipeline, X, y, parametro, valores)` (`call`); `curva_de_aprendizado(pipeline, X, y, tamanhos)` (`call`); `diagnostico(erro_treino, erro_validacao)` devolvendo `"vies"`, `"variancia"` ou `"ok"` (`call`); `acao_recomendada(diagnostico)` (`call`); quiz.

**Erros comuns a cobrir.** Ler 'erro de treino baixo' como bom sinal sozinho; mais dados para resolver viés; curvas com apenas 3 pontos; confundir variância do modelo com variância dos dados.
