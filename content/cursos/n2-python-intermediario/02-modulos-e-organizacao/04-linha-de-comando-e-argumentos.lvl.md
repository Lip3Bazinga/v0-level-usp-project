---
slug: n2-m2-04-linha-de-comando-e-argumentos
titulo: Scripts de linha de comando
descricao: sys.argv e argparse para programas que recebem argumentos, códigos de saída e saída de erro.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Ler argumentos da linha de comando com sys.argv e com argparse
- Separar a lógica (funções testáveis) da camada de linha de comando
- Usar sys.exit com códigos e escrever mensagens de erro em stderr
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `sys.argv` e seus limites; `argparse` com argumentos posicionais, opcionais, tipos e `--help` automático; `sys.exit(1)` e códigos de saída; `print(..., file=sys.stderr)`; o padrão `main(args)` + `if __name__ == "__main__"` para manter a lógica testável (a verificação chama `main(["--n", "3"])` diretamente via `expr`).

**Exercícios previstos.** `main(argv)` que soma números passados como argumentos e devolve o código de saída (`expr` com `main(["1", "2"])` + `expected_stdout`); conversor de temperaturas com `argparse` (`--para f`) chamado via `expr` com lista de argumentos; tratamento de argumento inválido devolvendo 2 e mensagem em stderr (`expr`); quiz sobre `argv[0]` e `--help`.

**Erros comuns a cobrir.** `sys.argv[1]` sem checar o tamanho (`IndexError`); `int(argv[1])` sem tratar `ValueError`; lógica misturada com `print` (não testável); esquecer que `argparse` já converte tipos quando `type=int`.
