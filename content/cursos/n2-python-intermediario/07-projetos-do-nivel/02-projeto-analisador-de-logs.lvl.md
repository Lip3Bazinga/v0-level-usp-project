---
slug: n2-m7-02-projeto-analisador-de-logs
titulo: 'Projeto 2: analisador de logs'
descricao: Ferramenta de linha de comando que processa logs grandes com geradores, agrega estatísticas, detecta anomalias e exporta relatórios, com testes e decoradores.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 300
tempo_min: 240
publicada: false
projeto: true
solucao_apos_tentativas: 3
objetivos:
- Processar arquivos grandes linha a linha com um pipeline de geradores e memória constante
- Extrair campos de linhas de log com parsing robusto e tratar linhas malformadas sem interromper o processamento
- Agregar estatísticas (requisições por minuto, erros por rota, percentis de latência) e exportar em CSV e JSON
- Entregar um programa de linha de comando testado com unittest e instrumentado com decoradores
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Projeto exigido para o certificado. Entrada: arquivo de log no formato `2026-03-01T10:15:02 INFO GET /api/cursos 200 123ms` (um arquivo de exemplo com 2 000 linhas, algumas malformadas, acompanha o enunciado). Funções exigidas: `ler_linhas(caminho)` (gerador), `parsear(linha) -> Registro | None` (dataclass), `filtrar_por_nivel(registros, nivel)`, `contar_por_rota(registros)`, `percentil(valores, p)`, `requisicoes_por_minuto(registros)`, `detectar_picos(contagens, limiar)`, `exportar_csv(caminho, tabela)`, `exportar_json(caminho, resumo)`, `main(argv)` com `argparse` (`--nivel`, `--rota`, `--saida`). Decorador `@cronometrar` registrando com `logging`. Suíte com no mínimo 8 testes.

**Passos previstos.** Leitura (especificação, formato, exemplos de saída e critérios) → gerador de leitura e `parsear` tolerante (`expr` + `call`) → agregações (`call` com dados pequenos e `tolerance` no percentil) → detecção de picos (`call`) → exportações (`expr` lendo os arquivos) → `main(argv)` (`expr` + `expected_stdout`) → suíte (`unittest` pass + 3 mutantes) → quiz de autoavaliação.

**Erros comuns a cobrir.** `readlines()` carregando tudo; `parsear` lançando exceção em linha malformada; percentil sem ordenar ou com índice fora da lista; contagem por minuto usando string crua em vez de truncar a data; `main` imprimindo em vez de devolver código de saída.
