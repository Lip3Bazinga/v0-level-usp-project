---
slug: n6-m4-03-regularizacao-l2-dropout-e-parada-antecipada
titulo: 'Regularização: L2, dropout e parada antecipada'
descricao: Sobreajuste em redes, penalidade L2 no gradiente, dropout invertido com forward/backward e modo de avaliação, aumento de dados simples e parada antecipada com paciência.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar L2 e dropout (invertido) com os modos de treino e avaliação
- Implementar parada antecipada com paciência e restauração do melhor estado
- Medir o efeito de cada técnica na diferença entre treino e validação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Diagnóstico de sobreajuste com uma rede grande em poucos dados; L2 (termo no gradiente, não regularizar vieses); dropout invertido (máscara, escala 1/(1−p), backward com a mesma máscara, desligado na avaliação); aumento de dados (deslocar dígitos em 1 pixel); parada antecipada; combinação e ordem de experimentação.

**Exercícios previstos.** `dropout_forward(X, p, modo, semente)` e `dropout_backward(dout, cache)` (`call` + verificação da escala e da máscara); `perda_com_l2(perda, params, lam)` e gradiente (`call`); `parada_antecipada(historico_val, paciencia)` devolvendo a época de parada (`call`); `deslocar_imagens(X, dx, dy)` (`call`); `experimento_regularizacao(config)` reduzindo o gap treino-validação (`call` + `tolerance`); quiz sobre dropout em avaliação.

**Erros comuns a cobrir.** Dropout ativo na avaliação; não escalar (ou escalar na avaliação); regularizar vieses; parada antecipada sem restaurar o melhor estado; aumento de dados aplicado à validação.
