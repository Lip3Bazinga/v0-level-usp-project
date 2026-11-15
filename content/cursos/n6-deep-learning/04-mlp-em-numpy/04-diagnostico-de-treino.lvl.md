---
slug: n6-m4-04-diagnostico-de-treino
titulo: Diagnóstico de treino
descricao: Ler curvas de perda e acurácia, razão atualização/peso, estatísticas de gradiente por camada, gradientes que somem e explodem, clipping e um checklist de depuração de redes.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Interpretar curvas de treino e diagnosticar taxa alta/baixa, sobreajuste e dados ruins
- Medir razão de atualização por peso e normas de gradiente por camada e agir sobre elas
- Aplicar clipping de gradiente e o checklist de depuração
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Galeria de curvas (taxa alta: perda sobe/oscila; baixa: linear lenta; sobreajuste: validação sobe; bug: perda constante); razão `|Δw|/|w|` ≈ 1e-3 como alvo (CS231n); normas de gradiente por camada (soma em camadas iniciais); clipping por norma; checklist (semente, sanidade, lote pequeno, taxa, inicialização, dados embaralhados, rótulos alinhados).

**Exercícios previstos.** `diagnosticar_curva(historico)` devolvendo o problema (`call` com históricos sintéticos); `razao_atualizacao(params, atualizacoes)` (`call` + `tolerance`); `normas_de_gradiente(grads)` por camada e detecção de 'somem' (`call`); `clip_por_norma(grads, max_norma)` (`call`); `encontrar_bug(config_id)` em quatro treinos com bug plantado (rótulos desalinhados, sem embaralhar, taxa 10, sem normalizar) (`call`); quiz.

**Erros comuns a cobrir.** Interpretar oscilação como ruído inevitável; clipping por valor em vez de norma; diagnosticar sem fixar a semente (resultados mudam); corrigir dois hiperparâmetros ao mesmo tempo.
