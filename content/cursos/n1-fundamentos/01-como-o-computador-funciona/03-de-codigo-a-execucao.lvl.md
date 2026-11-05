---
slug: n1-m1-03-de-codigo-a-execucao
titulo: De código a execução
descricao: 'Código-fonte, compilador, interpretador e o bytecode do Python: o que acontece quando você aperta Executar.'
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 80
tempo_min: 30
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Diferenciar código-fonte, código de máquina e bytecode
- Explicar a diferença entre compilar e interpretar com um exemplo de cada
- Descrever o caminho de um arquivo .py até a execução pela máquina virtual do Python
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Linguagens de programação como ponte entre pessoas e CPU. Compilador (C, Go, Rust): traduz tudo antes, gera um executável. Interpretador: executa aos poucos. O Python fica no meio: compila para bytecode (os arquivos `.pyc` em `__pycache__`) e a máquina virtual do CPython executa esse bytecode. Mostrar `dis.dis` de uma função de duas linhas como curiosidade (sem exigir leitura detalhada). Explicar por que "Python é lento" quase nunca importa para quem está começando e o que o botão Executar da plataforma faz (CPython compilado para WebAssembly rodando no navegador).

**Passos previstos.** Leitura (compilador vs. interpretador, com a analogia do tradutor de livro vs. intérprete simultâneo) → Leitura (bytecode e a VM do Python; o que é `__pycache__`) → Quiz de 3 perguntas → Exercício leve: completar um programa de uma linha e observar que o erro de sintaxe aparece antes de qualquer linha rodar (verificação `io`).

**Erros comuns a cobrir.** Achar que Python "não compila"; confundir o arquivo `.py` com o programa já traduzido; achar que o navegador "entende Python" sozinho.
