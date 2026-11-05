---
slug: n1-m2-06-erros-comuns-e-depuracao
titulo: Erros comuns e depuração
descricao: 'SyntaxError, NameError e TypeError: como ler a mensagem, achar a linha e consertar sem chutar.'
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Reconhecer SyntaxError, NameError e TypeError pela mensagem e pela causa típica
- Localizar a linha do erro usando o número informado pelo Python
- Consertar programas curtos com um erro de cada tipo
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** As três mensagens que o iniciante mais vê: `SyntaxError` (o Python nem começou: parêntese, aspas, dois-pontos), `NameError` (nome não definido: erro de digitação ou variável usada antes de existir) e `TypeError` (misturar tipos). Anatomia da mensagem: arquivo, linha, seta, tipo e texto. Estratégia: ler de baixo para cima, ir à linha, conferir a linha anterior. `print()` para espiar valores (depuração por impressão).

**Passos previstos.** Leitura (os três erros, com um exemplo real de cada) → Exercício "conserte o bug 1" (SyntaxError: aspas) com `io` exata → Exercício "conserte o bug 2" (NameError: variável com nome trocado) → Exercício "conserte o bug 3" (TypeError: `input` sem conversão) → Quiz (3 perguntas: qual erro aparece em cada trecho).

**Erros comuns a cobrir.** Consertar o sintoma mudando o `print` em vez da causa; apagar a linha com erro; trocar o nome da variável só em um lugar (o caso `source not_calls`/`variable` detecta); confundir aviso com erro.
