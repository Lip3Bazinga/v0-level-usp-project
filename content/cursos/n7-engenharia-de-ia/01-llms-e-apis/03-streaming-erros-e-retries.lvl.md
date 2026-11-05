---
slug: n7-m1-03-streaming-erros-e-retries
titulo: Streaming, erros, timeouts e retries
descricao: Consumir respostas em fluxo, tratar limites de taxa (429), timeouts e falhas transitórias com backoff exponencial e jitter, idempotência e orçamento de tentativas.
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Consumir um fluxo de tokens (gerador) e montar a resposta incrementalmente
- Implementar retry com backoff exponencial e jitter para erros transitórios, sem repetir em erros permanentes
- Aplicar timeouts e orçamento total de tentativas e registrar falhas com logging
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `completar_stream` do simulado como gerador de pedaços (reaproveita geradores do Nível 2); classes de erro (`ErroDeTaxa`, `ErroDeServidor`, `ErroDeRequisicao`) e quais se repetem; backoff `base * 2**n + jitter`, teto; timeout por chamada e orçamento total; idempotência; decorador `@com_retries` (reaproveita decoradores); o simulado pode ser configurado para falhar nas primeiras N chamadas.

**Exercícios previstos.** `consumir_stream(gerador)` (`call`); `calcular_espera(tentativa, base, teto, semente)` (`call` + `tolerance`); decorador `com_retries(max_tentativas)` que repete só em transitórios (`expr` com simulado falhando 2 vezes e depois com erro permanente esperando `raises`); `orcamento_de_tempo(...)` (`expr`); quiz sobre 429 vs 400.

**Erros comuns a cobrir.** Repetir em erro 400 (permanente); backoff sem jitter (tempestade de retries); `except Exception` engolindo tudo; stream consumido duas vezes.
