---
slug: n5-m1-04-funcoes-de-custo-e-otimizacao
titulo: Funções de custo e otimização
descricao: Custo como medida de erro, convexidade, mínimos locais e globais, gradiente descendente em 1D e 2D, taxa de aprendizado e critérios de parada.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Definir funções de custo (MSE, MAE, logística) e explicar o que cada uma penaliza
- Implementar gradiente descendente genérico com taxa de aprendizado e critério de parada
- Diagnosticar divergência e lentidão pela curva de custo e ajustar a taxa
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Custo médio sobre os dados; convexidade (MSE em modelo linear é convexa) vs não convexa (redes); gradiente descendente genérico (`for passo in range(n): x -= taxa * grad(x)`); o efeito da taxa (pequena: lento; grande: oscila/diverge); parada por tolerância; a curva de custo como ferramenta de diagnóstico; funções-teste (Rosenbrock) e mínimos locais.

**Exercícios previstos.** `gradiente_descendente(grad, x0, taxa, passos, tol)` devolvendo trajetória (`call` + `tolerance`); `mse`, `mae`, `perda_logistica` vetorizadas (`call`); `diagnosticar_taxa(historico)` devolvendo `"diverge"`, `"lento"` ou `"ok"` (`call`); minimizar Rosenbrock a partir de dois pontos (`call` + `tolerance` ampla); quiz sobre convexidade.

**Erros comuns a cobrir.** Taxa de aprendizado fixa demais sem olhar a curva; atualizar `x` com `+`; parar por número de passos sem checar convergência; custo não dividido por n (gradiente explode com n grande).
