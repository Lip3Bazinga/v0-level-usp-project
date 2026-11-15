---
slug: n5-m7-04-etica-e-vies-em-modelos
titulo: Ética, justiça e viés em modelos
descricao: Vieses nos dados e no rótulo, métricas de justiça por grupo (paridade demográfica, igualdade de oportunidade), atributos proxy, explicabilidade e LGPD aplicada a modelos.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- scikit-learn
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Medir disparidades de desempenho e de decisão entre grupos
- Identificar atributos proxy e discutir trade-offs entre critérios de justiça
- Relacionar decisões automatizadas com a LGPD (direito à revisão, finalidade, minimização)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Casos reais (crédito, recrutamento, reconhecimento facial); de onde vem o viés (amostra, rótulo histórico, proxy como CEP); métricas por grupo (taxa de positivos, FPR/FNR por grupo); impossibilidade de satisfazer todos os critérios; mitigação (reponderar, limiar por grupo, remover proxies) e seus limites; LGPD art. 20 (revisão de decisões automatizadas), finalidade e minimização; documentação de modelo (model card).

**Exercícios previstos.** `metricas_por_grupo(y, y_pred, grupo)` (`call` + `tolerance`); `paridade_demografica(y_pred, grupo)` e `igualdade_de_oportunidade(y, y_pred, grupo)` (`call`); `detectar_proxies(X, atributo_sensivel)` por correlação/AUC (`call`); `limiares_por_grupo(y, scores, grupo)` igualando TPR (`call`); quiz sobre LGPD e sobre trade-offs.

**Erros comuns a cobrir.** Remover o atributo sensível e achar que resolveu; comparar grupos sem olhar o n; otimizar um critério e piorar outro sem perceber; não documentar limitações.
