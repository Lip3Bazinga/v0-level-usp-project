---
slug: n7-m6-03-privacidade-e-lgpd
titulo: Privacidade e LGPD em sistemas com IA
descricao: Dados pessoais e sensíveis, bases legais, minimização, anonimização e pseudonimização, retenção, direitos do titular, envio de dados a provedores e registro de tratamento.
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Identificar dados pessoais e sensíveis em entradas, prompts, logs e memórias
- Implementar minimização, mascaramento e políticas de retenção no pipeline
- Mapear os requisitos da LGPD (base legal, finalidade, direitos do titular, transferência) para decisões de projeto
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Conceitos da LGPD (dados pessoais, sensíveis, titular, controlador/operador, bases legais, finalidade, minimização, art. 20 revisão de decisões automatizadas); onde dados vazam em sistemas com LLM (prompts, logs, cache, memória, provedor externo); mascaramento de CPF/e-mail/telefone antes de enviar; retenção e exclusão; relatório de impacto em uma página; o caso da secretaria (dados de alunos).

**Exercícios previstos.** `detectar_dados_pessoais(texto)` por padrões (CPF, e-mail, telefone, nome+matrícula) (`call`); `mascarar(texto)` reversível por mapa local (`call` + roundtrip); `politica_de_retencao(registros, dias, hoje)` (`call`); `classificar_tratamento(descricao)` apontando base legal e requisitos (`call`); quiz sobre a LGPD.

**Erros comuns a cobrir.** Logar prompts completos com dados pessoais; mascarar só na saída; 'anonimizar' removendo só o nome; enviar dados sensíveis ao provedor sem base legal e sem contrato.
