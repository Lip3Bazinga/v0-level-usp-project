---
slug: n2-m3-04-logging
titulo: 'logging: registrar o que o programa faz'
descricao: Substituir prints de depuração por logging com níveis, formatação e handlers.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 35
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Configurar o módulo logging com níveis e formato
- Escolher o nível certo (debug, info, warning, error, exception) em cada situação
- Registrar exceções com traceback usando logging.exception
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que `print` não serve para diagnóstico em produção; `logging.basicConfig(level, format)`; `getLogger(__name__)`; os cinco níveis e quando usar; `logger.exception` dentro do `except`; handlers para arquivo e console (breve); a verificação lê o que foi registrado via um handler de memória configurado no `setup` (`expr` com `expected_stdout` capturando o `StreamHandler` para stdout).

**Exercícios previstos.** Trocar os `print` de uma função por `logger.info`/`logger.warning` com o formato exato pedido (`expr` + `expected_stdout` + `source not_calls print`); `processar(itens)` registrando `error` para itens inválidos e seguindo (`expr`); `logger.exception` com traceback ao capturar erro (`expr` com `expected_stdout` `match: contains`); quiz sobre níveis e sobre `basicConfig` chamado duas vezes.

**Erros comuns a cobrir.** `logging.info` antes do `basicConfig` com nível padrão `WARNING` (nada aparece); f-string no log em vez de parâmetros (aceitável, explicar a diferença); `print` misturado; logar dados sensíveis (senha) — gancho para o Nível 7.
