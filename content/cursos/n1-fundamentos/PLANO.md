# Plano do Nível 1 — Fundamentos de programação e de computação

Este é o plano de autoria do Nível 1 da trilha **Python: do zero à IA**. Ele é dirigido a quem vai
escrever o conteúdo real das lições (os arquivos `*.lvl.md` de cada módulo já existem com o
frontmatter completo e um passo de roteiro, que deve ser **substituído** pelos passos descritos
aqui). Cada lição abaixo traz: slug, título, objetivos, conceitos, a sequência de passos sugerida,
a ideia de cada exercício com suas instruções (que viram os *checkpoints* numerados), os tipos de
verificação a usar, os erros comuns que devem virar *soluções erradas* e as dicas.

Formato dos arquivos: `docs/v2/curso-e-passos.md` §6.1. Limites do contrato:
`packages/contracts/src/content-bundle.ts` (título 3–160, descrição ≤ 1000, objetivos ≤ 10,
passos ≤ 50, dicas ≤ 3 por passo, casos de teste ≤ 100 por passo).

## Como usar este plano

1. Abra o arquivo da lição (`content/cursos/n1-fundamentos/<módulo>/<NN>-<slug>.lvl.md`).
2. Mantenha o frontmatter (ajuste `xp`/`tempo_min` só se a lição final ficar muito diferente).
3. Substitua o corpo pelos passos na ordem sugerida (`## Passo N · Leitura|Exercício|Quiz · Título`).
4. Em cada exercício: `### Instruções` (lista numerada = checkpoints), `### Código inicial`,
   `### Solução`, `### Dicas` (até 3), `### Verificação` (JSON de `TestCase[]`) e
   `### Soluções erradas` (pelo menos uma, de preferência as listadas em "Erros comuns").
5. Rode `pnpm content:check` (lint) e `pnpm content:verify --curso n1-fundamentos` (a solução
   aprova, o código inicial reprova, cada solução errada reprova).

## Voz e estilo

- **Você**, direto, sem rodeios. Frases curtas. Nada de promessas de conteúdo futuro, marcadores de
  pendência deixados no texto ou texto de preenchimento: o que está publicado está pronto.
- **Um conceito novo por passo.** Se o passo precisa de dois conceitos, são dois passos.
- **Exemplos brasileiros e concretos:** notas de 0 a 10, R$ com vírgula na saída formatada quando a
  lição for sobre formatação (e ponto nos cálculos), CPF, CEP, nomes comuns (Ana, Bia, Caio, Davi,
  Eva), cidades (Ribeirão Preto, São Paulo), ENEM, IMC, troco, tabuada, fila do RU.
- **Sem jargão sem definição.** A primeira vez que uma palavra técnica aparece, ela é explicada na
  mesma frase ou na seguinte ("*traceback*, o relatório de erro que o Python imprime").
- **Progressão:** cada exercício usa só o que já foi ensinado (nesta lição ou nas anteriores).
  Funções (`def`/`return`) aparecem de forma mínima a partir do módulo 3 — apenas "uma receita com
  nome que devolve um valor" — e são ensinadas de verdade no módulo 6.
- **Leitura curta (≤ 400 palavras por passo de leitura)**, com um bloco de código ilustrativo e,
  quando couber, um teste de mesa em tabela.
- **Quizzes de 2–3 perguntas** por lição, com explicação em cada pergunta (`> explicação`),
  misturando "o que imprime", conceito e "qual é o erro".
- **Mini-projetos** (IMC, adivinhação, analisador de texto) começam com a especificação completa
  e exemplos de entrada/saída antes do primeiro exercício.
- **Mensagens de erro e saídas** aparecem no texto exatamente como o Python as mostra.

## Regras de verificação

- **Toda saída esperada é dada no enunciado, caractere por caractere**, inclusive acentos,
  pontuação, espaços e número de casas decimais. O aluno nunca precisa adivinhar formato.
- **Prefira `call` a `io` quando houver função.** `io` fica para programas interativos (menus,
  leitura com `input`) e para os primeiros exercícios de `print`. Em `io`, use `match: "trimmed"`
  (padrão) e dê o `stdin` completo no enunciado como "Exemplo de execução".
- **`input()` sem texto de prompt** nos exercícios com `io` (o enunciado avisa), para a saída
  comparada não depender do prompt. Quando o prompt for parte do que se ensina, use `match: "contains"`
  ou `regex`.
- **`source`** para exigir ou proibir construções (`uses while` + `not_uses for`, `uses recursion`,
  `uses list_comprehension` com `function`, `calls`/`not_calls`, `defines_function`, `catches`).
  Use sempre que o objetivo da lição for a construção, não só o resultado.
- **`variable`** para exercícios de "preencha o valor" (conversões, teste de mesa, previsões de
  saída) e para estados finais de listas/dicionários. Informe `type` quando o tipo é o ponto.
- **`expr`** para conferir efeitos colaterais (a lista original não mudou), chamar funções de
  teste do aluno com implementações injetadas no `setup` (mutantes com `raises: AssertionError`) e
  para `__doc__`.
- **`tolerance`** em todo caso com float (`call`, `variable`, `expr`): 0,01 para duas casas, 0,05
  para uma casa. Nunca compare float com igualdade exata.
- **Casos de borda sempre:** lista vazia, zero, negativo, um elemento, iguais, bordas de faixa
  (`>=` vs `>`). Cada erro comum listado vira uma solução errada que **precisa reprovar** em
  `content:verify`.
- **Ids de caso** curtos e estáveis (`saida-1`, `borda-vazia`); `name` legível para o aluno;
  `hint` sem revelar o valor esperado (a menos que o enunciado já o mostre).
- **Nada de aleatoriedade sem semente**; quando usar `random`, o enunciado fixa `random.seed(...)`
  e o autor registra o resultado real obtido no runner.
- **Dicas** (até 3): a 1ª relembra o conceito, a 2ª aponta o lugar do erro, a 3ª quase mostra a
  solução. A solução é liberada após 3 tentativas (D5) e vale metade do XP.

## Estrutura do nível

9 módulos · 47 lições (1 projeto de nível + 3 mini-projetos de módulo) · 38,6 h de lições + prova (1 h) · 5200 XP · prova com 40 questões (20 por tentativa).

| # | Módulo | Lições | Minutos | XP |
|---|---|---|---|---|
| 1 | Como o computador funciona (`como-o-computador-funciona`) | 5 | 175 | 420 |
| 2 | Primeiros passos em Python (`primeiros-passos-em-python`) | 6 | 250 | 630 |
| 3 | Decisões: condicionais (`decisoes-condicionais`) | 5 | 255 | 560 |
| 4 | Repetição: laços (`repeticao-lacos`) | 7 | 345 | 780 |
| 5 | Coleções (`colecoes`) | 7 | 295 | 730 |
| 6 | Funções (`funcoes`) | 7 | 305 | 750 |
| 7 | Strings e texto (`strings-e-texto`) | 5 | 270 | 590 |
| 8 | Erros, testes e depuração (`erros-testes-e-depuracao`) | 4 | 180 | 440 |
| 9 | Projeto do nível (`projeto-do-nivel`) | 1 | 240 | 300 |

## Módulo 1 · Como o computador funciona

Hardware, bits e bytes, binário e hexadecimal, o caminho do código até a execução, sistema operacional, terminal e algoritmos.

### n1-m1-01-hardware-bits-e-bytes · Hardware, bits e bytes

- **Arquivo:** `01-como-o-computador-funciona/01-hardware-bits-e-bytes.lvl.md` · lição guiada · 80 XP · 30 min
- **Objetivos:** Nomear as partes principais de um computador (CPU, RAM, armazenamento, entrada e saída) e a função de cada uma · Explicar o que é um bit e um byte e converter entre KB, MB e GB · Descrever, em linhas gerais, como texto e imagens são guardados como números
- **Conceitos:** CPU, RAM, armazenamento, entrada/saída; bit, byte, KB/MB/GB; ASCII/Unicode; pixel RGB.
- **Passos:** Leitura → Leitura → Quiz → Exercício.
- **Exercício 1 · Primeiro contato com o Verificar** — o editor já vem com `print(ord("A"))` e `print(chr(66))`. Instruções: 1) execute e observe; 2) crie `codigo_a` com o número que apareceu para `"A"`; 3) crie `letra_66` com a letra que apareceu para 66. Verificação: `variable codigo_a == 65 (type int)`, `variable letra_66 == "B" (type str)`. Soluções erradas: `codigo_a = "65"` (texto), `codigo_a = 66`. Dicas: 1) `ord` dá o número da letra; 2) o valor é um número, sem aspas; 3) `chr(66)` mostra a letra de código 66.
- **Quiz (3):** qual componente guarda o que está em uso agora (RAM); quantos bits tem um byte (8); 1 MB tem quantos KB aproximadamente (1024/1000 — aceitar a convenção explicada no texto, só uma opção plausível).
- **Erros comuns:** RAM vs armazenamento; `ord(A)` sem aspas (NameError).

### n1-m1-02-binario-e-hexadecimal · Binário e hexadecimal

- **Arquivo:** `01-como-o-computador-funciona/02-binario-e-hexadecimal.lvl.md` · lição guiada · 90 XP · 40 min
- **Objetivos:** Converter um número decimal pequeno para binário e de volta, à mão · Ler um número hexadecimal e explicar por que ele é uma abreviação do binário · Usar os prefixos 0b e 0x e as funções bin() e hex() do Python para conferir conversões
- **Conceitos:** base posicional, potências de 2, divisões sucessivas, hexadecimal como grupos de 4 bits, prefixos `0b`/`0x`, `bin()`, `hex()`, `int(texto, base)`.
- **Passos:** Leitura → Exercício → Leitura → Exercício → Quiz.
- **Exercício 1 · Conversões à mão** — Instruções: 1) converta 10, 37 e 255 para binário e guarde como texto em `dez`, `trinta_e_sete`, `duzentos_cinquenta_e_cinco` (sem o prefixo); 2) converta `"110101"` para decimal em `valor`. Verificação: `variable` × 4 (`"1010"`, `"100101"`, `"11111111"`, `53`). Erradas: binário invertido (`"0101"`), `valor = "53"`. Dicas: divida por 2 e anote os restos; leia os restos de baixo para cima.
- **Exercício 2 · Conferindo com o Python** — Instruções: 1) imprima `bin(37)`; 2) imprima `hex(255)`; 3) imprima `int("ff", 16)`; 4) imprima `0b1010 + 0x10`. Saída esperada exata no enunciado (`0b100101`, `0xff`, `255`, `26`). Verificação: `io` exato. Erradas: `int("ff")` (ValueError), `print(bin(37)[2:])`. Dicas: `bin` e `hex` devolvem texto com prefixo; `int` precisa da base.
- **Quiz (3):** quantos valores diferentes cabem em 8 bits (256); maior número com 4 bits (15); por que hexa (cada dígito = 4 bits).
- **Erros comuns:** ler restos na ordem errada; `0b` como parte do número; `int("1011")` sem base.

### n1-m1-03-de-codigo-a-execucao · De código a execução

- **Arquivo:** `01-como-o-computador-funciona/03-de-codigo-a-execucao.lvl.md` · lição guiada · 80 XP · 30 min
- **Objetivos:** Diferenciar código-fonte, código de máquina e bytecode · Explicar a diferença entre compilar e interpretar com um exemplo de cada · Descrever o caminho de um arquivo .py até a execução pela máquina virtual do Python
- **Conceitos:** código-fonte, código de máquina, compilador, interpretador, bytecode, máquina virtual, `__pycache__`, WebAssembly (a plataforma).
- **Passos:** Leitura → Leitura → Quiz → Exercício.
- **Exercício 1 · O erro que aparece antes de rodar** — código inicial com três `print` e um erro de sintaxe na linha 3 (parêntese faltando). Instruções: 1) execute e observe que nenhuma linha roda; 2) conserte a linha 3; 3) execute de novo. Verificação: `io` exato (`Linha 1`, `Linha 2`, `Linha 3`). Erradas: apagar a linha 3; trocar o texto. Dicas: leia a mensagem `SyntaxError`; conte parênteses.
- **Quiz (3):** o que o compilador faz (traduz tudo antes); o que é bytecode (instruções para a VM do Python); por que um erro de sintaxe impede o programa inteiro (a compilação para bytecode falha antes de executar).
- **Erros comuns:** achar que Python não compila; achar que o navegador executa Python nativamente.

### n1-m1-04-sistema-operacional-e-terminal · Sistema operacional e terminal

- **Arquivo:** `01-como-o-computador-funciona/04-sistema-operacional-e-terminal.lvl.md` · lição guiada · 80 XP · 35 min
- **Objetivos:** Explicar o papel do sistema operacional (processos, arquivos, dispositivos) em uma frase para cada · Usar os comandos básicos do terminal para listar, entrar em pastas e executar um arquivo .py · Instalar o Python e um editor no seu próprio computador seguindo um roteiro por sistema
- **Conceitos:** processo, sistema de arquivos, caminho absoluto/relativo, extensão, terminal, `cd`, `ls`/`dir`, `pwd`, `python arquivo.py`, instalação.
- **Passos:** Leitura → Leitura → Quiz → Leitura → Exercício.
- **Exercício 1 · Comandos em variáveis** — Instruções: 1) `listar_linux = "ls"`; 2) `listar_windows = "dir"`; 3) `rodar = "python jogo.py"`; 4) `voltar = "cd .."`. Verificação: `variable` × 4 com os textos exatos do enunciado. Erradas: `rodar = "python jogo"`, `voltar = "cd.."`. Dicas: o comando inclui a extensão; há espaço entre `cd` e `..`.
- **Quiz (3):** o que `cd ..` faz; qual comando executa um arquivo Python; caminho absoluto vs relativo.
- **Erros comuns:** ficar preso no REPL; terminal na pasta errada; `python` vs `python3`.

### n1-m1-05-o-que-e-um-algoritmo · O que é um algoritmo

- **Arquivo:** `01-como-o-computador-funciona/05-o-que-e-um-algoritmo.lvl.md` · lição guiada · 90 XP · 40 min
- **Objetivos:** Definir algoritmo e reconhecer entrada, processamento e saída em um exemplo do dia a dia · Escrever um algoritmo simples em pseudocódigo e representá-lo em fluxograma · Executar um teste de mesa, linha a linha, anotando o valor de cada variável
- **Conceitos:** algoritmo, entrada/processamento/saída, pseudocódigo, fluxograma, teste de mesa, condição de parada.
- **Passos:** Leitura → Exercício → Leitura → Exercício → Quiz.
- **Exercício 1 · Ordene os passos** — enunciado lista 5 passos embaralhados e numerados para fazer café coado; o aluno grava `ordem = [...]` com os números na sequência correta. Verificação: `variable ordem == [3, 1, 4, 5, 2]` (a ordem exata vem do enunciado). Erradas: ordem com a água fria antes de ferver. Dicas: comece pelo que não depende de nada; o último passo é servir.
- **Exercício 2 · Teste de mesa** — pseudocódigo de 6 linhas (`a ← 3`, `b ← a * 2`, `a ← a + b`, `b ← b - 1`, `c ← a - b`). O aluno grava `a_final`, `b_final`, `c_final`. Verificação: `variable` × 3 (9, 5, 4). Erradas: avaliar `c` com o `b` antigo. Dicas: uma coluna por variável, uma linha por instrução.
- **Quiz (3):** o que falta em "repita até ficar bom" (critério objetivo); qual símbolo do fluxograma é decisão (losango); o que é o teste de mesa.
- **Erros comuns:** passos ambíguos; esquecer a parada; atualizar antes de avaliar.

## Módulo 2 · Primeiros passos em Python

print, variáveis e tipos, números e operadores, strings e f-strings, input e conversões, erros comuns e depuração.

### n1-m2-01-ola-python · Olá, Python

- **Arquivo:** `02-primeiros-passos-em-python/01-ola-python.lvl.md` · lição guiada · 100 XP · 35 min
- **Objetivos:** Escrever e executar um programa que imprime texto com print() · Usar aspas corretamente e imprimir várias linhas · Escrever comentários e explicar por que o Python os ignora
- **Conceitos:** `print`, strings entre aspas, uma linha por `print`, `print()` vazio, comentários `#`, ordem de execução, `sep`/`end` (curiosidade).
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Olá, mundo** — Instruções: 1) imprima exatamente `Olá, mundo!`; 2) na linha seguinte imprima `Eu estou aprendendo Python`. Verificação: `io` (`match: trimmed`, saída de duas linhas), `source calls print`. Erradas: sem aspas; `Ola mundo` sem acento/vírgula; tudo em um `print`. Dicas: texto entre aspas; cada `print` é uma linha.
- **Exercício 2 · Cartão de visita** — saída exata de 3 linhas dada no enunciado (nome fictício `Ana Souza`, curso, cidade) com uma linha em branco entre a 2ª e a 3ª. Verificação: `io` exato. Erradas: sem a linha em branco; aspas erradas. Dicas: `print()` sem nada pula linha.
- **Exercício 3 · Conserte o programa** — código inicial com aspas faltando e um comentário no meio de uma string. Verificação: `io` exato. Erradas: apagar linhas. Dicas: cada string abre e fecha com o mesmo tipo de aspas; `#` dentro de aspas é texto.
- **Quiz (2):** função que exibe texto (`print`); o que acontece com `print(Olá)` (NameError).
- **Erros comuns:** `Print`, aspas misturadas, `print "x"`, texto diferente do pedido.

### n1-m2-02-variaveis-e-tipos · Variáveis e tipos

- **Arquivo:** `02-primeiros-passos-em-python/02-variaveis-e-tipos.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Criar variáveis com nomes válidos e descritivos e reatribuir valores · Identificar o tipo de um valor (int, float, str, bool) e conferir com type() · Prever o resultado de trocar o valor de uma variável ao longo do programa
- **Conceitos:** atribuição `=`, nomes válidos (snake_case, sem dígito inicial, sem reservadas), `int`, `float`, `str`, `bool`, `type()`, reatribuição.
- **Passos:** Leitura → Exercício → Leitura → Exercício → Exercício → Quiz.
- **Exercício 1 · Ficha de cadastro** — Instruções: 1) `nome = "Ana"`; 2) `idade = 20` (número); 3) `altura = 1.68`; 4) `estudante = True`; 5) imprima as quatro. Verificação: `variable` × 4 com `type` (`str`, `int`, `float`, `bool`). Erradas: `idade = "20"`; `estudante = "True"`. Dicas: números não usam aspas; `True` com T maiúsculo.
- **Exercício 2 · Qual é o tipo** — imprimir `type()` de `42`, `3.14`, `"42"`, `False` (saída exata: `<class 'int'>` …). Verificação: `io` exato. Erradas: imprimir o valor e não o tipo. Dicas: `print(type(42))`.
- **Exercício 3 · A variável muda** — código inicial com `saldo = 100`; instruções: 1) some 50; 2) subtraia 30; 3) dobre. Verificação: `variable saldo == 240`. Erradas: esquecer de reatribuir (`saldo + 50`); ordem trocada. Dicas: `saldo = saldo + 50`.
- **Quiz (3):** nome válido (`total_2` vs `2total`); tipo de `"10"` (`str`); o que `x = x + 1` faz.
- **Erros comuns:** número entre aspas; nome com espaço; `=` como comparação.

### n1-m2-03-numeros-e-operadores · Números e operadores

- **Arquivo:** `02-primeiros-passos-em-python/03-numeros-e-operadores.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Usar +, -, *, /, //, % e ** e prever o tipo do resultado · Aplicar a precedência dos operadores e usar parênteses para alterá-la · Resolver problemas simples com resto da divisão (par/ímpar, dígitos, troco)
- **Conceitos:** `+ - * / // % **`, precedência, parênteses, `round`, `abs`, `+=`.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Seis contas** — imprimir `7 / 2`, `7 // 2`, `7 % 2`, `2 ** 10`, `(3 + 4) * 2`, `round(7 / 3, 2)` (saída exata: `3.5`, `3`, `1`, `1024`, `14`, `2.33`). Verificação: `io` exato. Erradas: `3 + 4 * 2`; `7 / 2` como `3`. Dicas: `//` é a divisão inteira; `**` é potência.
- **Exercício 2 · Segundos em h:m:s** — código inicial `total_segundos = 7384`. Instruções: 1) `horas` com `//`; 2) `minutos` do resto; 3) `segundos`. Verificação: `variable horas == 2`, `minutos == 3`, `segundos == 4` (`type int`). Erradas: usar `/` (floats); minutos sem o resto. Dicas: 1 h = 3600 s; o que sobra divide por 60.
- **Exercício 3 · Troco em notas** — `valor = 186`; calcular `notas_50`, `notas_20`, `notas_10`, `notas_5`, `notas_1` com `//` e `%` em cadeia. Verificação: `variable` × 5 (3, 1, 1, 1, 1). Erradas: pular uma denominação. Dicas: sempre a maior nota primeiro.
- **Quiz (3):** `7 // 2`; `7 % 2`; `2 ** 3 * 2` (16).
- **Erros comuns:** `/` devolvendo float; `^`; `%` como porcentagem.

### n1-m2-04-strings-e-f-strings · Strings e f-strings

- **Arquivo:** `02-primeiros-passos-em-python/04-strings-e-f-strings.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Concatenar e repetir strings e medir o tamanho com len() · Montar mensagens com f-strings incluindo expressões e variáveis · Formatar números com casas decimais fixas dentro de uma f-string
- **Conceitos:** concatenação, repetição, `len`, `TypeError` texto+número, f-string com variáveis e expressões, `:.2f`.
- **Passos:** Leitura → Exercício → Leitura → Exercício → Quiz → Exercício.
- **Exercício 1 · Nome completo** — `nome = "Ana"`, `sobrenome = "Souza"`. Instruções: 1) `completo` com espaço entre; 2) `tamanho = len(completo)`; 3) imprima `completo`. Verificação: `variable completo == "Ana Souza"`, `variable tamanho == 9`, `io contains`. Erradas: sem espaço; `tamanho = 8`. Dicas: `" "` é uma string com espaço.
- **Exercício 2 · Recibo** — `produto = "Caderno"`, `preco = 12.5`, `quantidade = 3`. Imprimir `Caderno x3: R$ 37.50`. Verificação: `io` exato + `source uses f_string`. Erradas: `str(preco * quantidade)` sem `:.2f` (`37.5`); sem `f`. Dicas: `{preco * quantidade:.2f}`.
- **Exercício 3 · Título decorado** — imprimir `"=" * 20`, o título, `"=" * 20` (saída exata). Verificação: `io` exato. Erradas: contar os `=` à mão errado. Dicas: `*` repete texto.
- **Quiz (2):** `"Idade: " + 20` (TypeError); o que `f"{2 + 3}"` produz.
- **Erros comuns:** esquecer o `f`; `:.2f` fora da f-string.

### n1-m2-05-input-e-conversoes · input e conversões

- **Arquivo:** `02-primeiros-passos-em-python/05-input-e-conversoes.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Ler texto do usuário com input() e explicar por que o resultado é sempre uma string · Converter entradas com int() e float() e prever quando a conversão falha · Escrever um programa completo que lê dados, calcula e imprime um resultado formatado
- **Conceitos:** `input()` devolve `str`, prompt, `int()`, `float()`, `str()`, `ValueError`, ponto decimal.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Olá, você** — ler nome e cidade (dois `input` sem texto de prompt, para a saída ficar limpa) e imprimir `Olá, Ana de Ribeirão Preto!`. Verificação: `io` com `stdin "Ana\nRibeirão Preto\n"`, mais um segundo caso. Erradas: prompt no `input` (altera a saída — explicar no enunciado que o prompt deve ser vazio). Dicas: cada `input()` lê uma linha.
- **Exercício 2 · Soma e média** — ler dois números (podem ter decimais) e imprimir `Soma: 7.5` e `Média: 3.75` com `:.2f` (`Soma: 7.50`, `Média: 3.75`). Verificação: `io` com dois `stdin`. Erradas: `int(input())` com `2.5` (ValueError); sem conversão (concatena). Dicas: `float(input())`.
- **Exercício 3 · Idade em dias** — ler ano de nascimento e ano atual (inteiros), imprimir `Você tem aproximadamente 7300 dias` (anos × 365). Verificação: `io` com dois cenários. Erradas: `float` gerando `7300.0`. Dicas: use `int`.
- **Quiz (2):** tipo de `input()`; `int("3.5")` (ValueError).
- **Erros comuns:** aritmética com texto; vírgula decimal.

### n1-m2-06-erros-comuns-e-depuracao · Erros comuns e depuração

- **Arquivo:** `02-primeiros-passos-em-python/06-erros-comuns-e-depuracao.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Reconhecer SyntaxError, NameError e TypeError pela mensagem e pela causa típica · Localizar a linha do erro usando o número informado pelo Python · Consertar programas curtos com um erro de cada tipo
- **Conceitos:** `SyntaxError`, `NameError`, `TypeError`; linha e seta da mensagem; `print` para inspecionar.
- **Passos:** Leitura → Exercício → Exercício → Exercício → Quiz.
- **Exercício 1 · Bug de sintaxe** — programa de 4 linhas com aspas não fechadas. Verificação: `io` exato. Erradas: apagar a linha. Dicas: a seta aponta onde o Python se perdeu; conte as aspas.
- **Exercício 2 · Bug de nome** — `nome_completo` definido, `nome_compelto` usado. Verificação: `io` exato + `variable nome_completo` presente. Erradas: renomear só um lado criando outra variável. Dicas: compare letra por letra.
- **Exercício 3 · Bug de tipo** — `idade = input()` seguido de `idade + 1`. Verificação: `io` com `stdin`. Erradas: `str(idade + 1)`. Dicas: converta antes de somar.
- **Quiz (3):** três trechos, qual erro cada um gera.
- **Erros comuns:** corrigir o sintoma; apagar o código com erro.

## Módulo 3 · Decisões: condicionais

Booleanos e comparações, if/elif/else, operadores lógicos, aninhamento e o mini-projeto da calculadora de IMC.

### n1-m3-01-booleanos-e-comparacoes · Booleanos e comparações

- **Arquivo:** `03-decisoes-condicionais/01-booleanos-e-comparacoes.lvl.md` · lição guiada · 90 XP · 35 min
- **Objetivos:** Avaliar expressões com ==, !=, <, >, <= e >= e prever True ou False · Diferenciar = (atribuição) de == (comparação) · Guardar o resultado de uma comparação em uma variável booleana e usá-la
- **Conceitos:** `bool`, `== != < > <= >=`, comparação de strings, `=` vs `==`, variáveis booleanas, valores "falsos".
- **Passos:** Leitura → Exercício → Exercício → Quiz.
- **Exercício 1 · Verdadeiro ou falso** — imprimir oito comparações dadas (`5 > 3`, `5 == 5.0`, `"a" < "b"`, `"Ana" == "ana"`, `10 != 10`, `3 >= 3`, `"10" == 10`, `len("abc") == 3`). Verificação: `io` exato. Erradas: digitar o resultado à mão com erro; usar `=`. Dicas: `print(5 > 3)` imprime o resultado da comparação.
- **Exercício 2 · Flags** — `idade = 17`, `saldo = 50.0`, `preco = 49.9`. Criar `pode_votar` (idade ≥ 16), `pode_comprar` (saldo ≥ preco), `eh_adulto` (idade ≥ 18). Verificação: `variable` × 3 com `type: bool`. Erradas: `"True"`; `>` em vez de `>=`. Dicas: a comparação já devolve `True`/`False`.
- **Quiz (3):** `"a" < "b"`; `5 == 5.0`; diferença `=`/`==`.
- **Erros comuns:** `if x = 5`; `"10" == 10`; maiúsculas.

### n1-m3-02-if-e-else · if e else

- **Arquivo:** `03-decisoes-condicionais/02-if-e-else.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Escrever um if/else com indentação correta e prever qual bloco executa · Explicar por que a indentação faz parte da sintaxe do Python · Resolver problemas de duas saídas (par/ímpar, aprovado/reprovado, maior de dois)
- **Conceitos:** `if cond:`, bloco indentado, `else`, dois-pontos, fluxograma, `def` + `return` mínimo.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Par ou ímpar** — ler um inteiro e imprimir `par` ou `ímpar`. Verificação: `io` com `stdin` 4, 7, 0; `source uses if`. Erradas: `n % 2 == 1` para par; sem `else` imprimindo nada no ímpar. Dicas: `% 2`.
- **Exercício 2 · Maior de dois** — `def maior(a, b)` devolvendo o maior. Verificação: `call` (3,5), (9,2), (4,4), (-1,-5). Erradas: `print` em vez de `return`; `>` sem tratar iguais (devolve `b` — aceitar, pois iguais tanto faz; incluir caso só para igualdade de valor). Dicas: `return` entrega o valor.
- **Exercício 3 · Aprovação** — ler nota (float) e imprimir `Aprovado` se ≥ 6.0, senão `Reprovado`. Verificação: `io` com 6.0, 5.9, 9.5. Erradas: `> 6`. Dicas: borda inclusiva.
- **Quiz (2):** o que falta em `if x > 5` (dois-pontos); o que acontece com a linha fora do bloco.
- **Erros comuns:** indentação, `else` com condição.

### n1-m3-03-elif-e-cadeias-de-decisao · elif e cadeias de decisão

- **Arquivo:** `03-decisoes-condicionais/03-elif-e-cadeias-de-decisao.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Escrever cadeias if/elif/else com várias faixas de valores · Explicar por que a ordem das condições muda o resultado · Converter uma tabela de faixas (nota, idade, temperatura) em código
- **Conceitos:** `elif`, só o primeiro verdadeiro executa, ordem das faixas, `else` como resto.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Conceito** — `conceito(nota)`: ≥ 9 `"A"`, ≥ 7 `"B"`, ≥ 5 `"C"`, senão `"D"`. Verificação: `call` com 10, 9, 8.99, 7, 6.5, 5, 4.9, 0. Erradas: `if`s independentes (último vence); ordem crescente com `>=` (tudo vira `"C"`). Dicas: comece pela faixa mais alta.
- **Exercício 2 · Temperatura** — ler float; `< 15` `frio`, `< 28` `agradável`, senão `quente`. Verificação: `io` com 10, 15, 27.9, 28. Erradas: borda errada. Dicas: use `elif`.
- **Exercício 3 · Ingresso** — `preco_ingresso(idade)`: até 12 → 20.0; 13–59 → 40.0; 60+ → 20.0; negativo → `None`. Verificação: `call` com -1, 0, 12, 13, 59, 60. Erradas: esquecer negativo. Dicas: trate o inválido primeiro.
- **Quiz (3):** "o que imprime" com ordem errada; `elif` sem `if`; quantos blocos podem rodar (um).
- **Erros comuns:** vários `if`, sobreposição, borda.

### n1-m3-04-and-or-not-e-aninhamento · and, or, not e aninhamento

- **Arquivo:** `03-decisoes-condicionais/04-and-or-not-e-aninhamento.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Combinar comparações com and, or e not e prever o resultado pela tabela-verdade · Usar in para testar se um valor está em um texto ou lista · Decidir entre aninhar ifs e combinar condições, mantendo o código legível
- **Conceitos:** `and`, `or`, `not`, precedência, `in`, `0 <= x <= 10`, aninhamento, curto-circuito.
- **Passos:** Leitura → Exercício → Exercício → Leitura → Exercício → Quiz.
- **Exercício 1 · Expressões lógicas** — imprimir seis expressões (`True and False`, `not True or True`, `5 > 3 and 2 > 1`, `"a" in "casa"`, `not (1 == 1)`, `0 < 5 < 3`). Verificação: `io` exato. Erradas: precedência de `not`. Dicas: avalie de dentro para fora.
- **Exercício 2 · Regras** — `pode_dirigir(idade, tem_cnh)` (≥ 18 e CNH) e `ano_bissexto(ano)` (divisível por 4 e não por 100, ou por 400). Verificação: `call` com (18, True), (18, False), (17, True); 1900, 2000, 2024, 2023. Erradas: bissexto só `% 4`. Dicas: escreva a regra em português primeiro.
- **Exercício 3 · Triagem** — `prioridade(idade, gravidade)`: gravidade `"alta"` → 1; senão idade ≥ 60 ou < 2 → 2; senão 3. Verificação: `call` com matriz de 6 casos. Erradas: aninhar e esquecer o `else` interno. Dicas: trate o caso mais urgente primeiro.
- **Quiz (3):** `x == 1 or 2`; tabela do `and`; quando aninhar vs `and`.
- **Erros comuns:** `or 2`, parênteses, aninhamento profundo.

### n1-m3-05-mini-projeto-calculadora-de-imc · Mini-projeto: calculadora de IMC

- **Arquivo:** `03-decisoes-condicionais/05-mini-projeto-calculadora-de-imc.lvl.md` · lição guiada · 150 XP · 90 min
- **Objetivos:** Dividir um problema em funções pequenas (calcular, classificar, formatar) · Validar entradas e dar mensagens claras para valores inválidos · Entregar um programa que passa em todos os casos de verificação do enunciado
- **Conceitos:** decomposição em funções, validação, arredondamento, bordas de faixas, formato de saída.
- **Passos:** Leitura (especificação com tabela e 4 exemplos completos) → Exercício → Exercício → Exercício → Exercício → Quiz.
- **Exercício 1 · `calcular_imc(peso, altura)`** — devolve `round(peso / altura ** 2, 1)`. Verificação: `call` (70, 1.75) → 22.9, (90, 1.8) → 27.8, (58, 1.62) → 22.1, com `tolerance 0.001` (a função arredonda, então o esperado é exato; a tolerância pequena só absorve ruído de float). Erradas: sem elevar ao quadrado; sem arredondar (22.857 reprova com a tolerância pequena). Dicas: altura ao quadrado; `round(x, 1)`.
- **Exercício 2 · `classificar_imc(imc)`** — `< 18.5` `"abaixo do peso"`, `< 25` `"peso normal"`, `< 30` `"sobrepeso"`, senão `"obesidade"`. Verificação: `call` com 18.4, 18.5, 24.9, 25.0, 29.9, 30.0. Erradas: `<=`. Dicas: bordas pertencem à faixa de cima.
- **Exercício 3 · `entrada_valida(peso, altura)`** — `True` se `0 < peso <= 400` e `0.5 <= altura <= 2.6`. Verificação: `call` com 6 casos (altura 175 → False). Erradas: esquecer altura em cm. Dicas: altura em metros é menor que 3.
- **Exercício 4 · Programa principal** — lê peso e altura (floats), imprime `Entrada inválida.` ou `IMC: 22.9 - peso normal`. Verificação: `io` × 4 (`70\n1.75`, `90\n1.8`, `70\n175`, `-5\n1.7`). Erradas: validar depois de calcular; formato com duas casas. Dicas: uma função para cada passo.
- **Quiz (3):** revisão do módulo (ordem das faixas; `and`; `elif`).
- **Erros comuns:** `altura * 2`; `>=` vs `>`; conversão da entrada.

## Módulo 4 · Repetição: laços

while, for e range, acumuladores, break e continue, laços aninhados, padrões de contagem e busca, e o jogo de adivinhação.

### n1-m4-01-while · Repetição com while

- **Arquivo:** `04-repeticao-lacos/01-while.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Escrever um while com variável de controle, condição e atualização · Prever quantas vezes um laço executa fazendo o teste de mesa · Identificar e corrigir um laço infinito
- **Conceitos:** `while cond:`, inicialização/condição/atualização, teste de mesa por iteração, laço infinito, sentinela.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · De 1 a 10** — imprimir 1..10, um por linha, com `while`. Verificação: `io` exato; `source uses while`; `source not_uses for`. Erradas: 0..9; 1..9; `for`. Dicas: comece em 1; `<= 10`.
- **Exercício 2 · Contagem regressiva** — ler `n` e imprimir de `n` até 1 e depois `Fogo!`. Verificação: `io` com 3 e 1. Erradas: parar em 0 ou não imprimir `Fogo!`. Dicas: decremente dentro do laço.
- **Exercício 3 · Soma até zero** — ler inteiros até 0 e imprimir `Soma: X`. Verificação: `io` com `5\n3\n0` e `0`. Erradas: somar o 0 (inofensivo) mas contar; não parar. Dicas: leia antes de testar.
- **Quiz (3):** quantas iterações `i = 0; while i < 5: i += 2` (3); o que falta num laço sem atualização; `while` vs `if`.
- **Erros comuns:** não atualizar; `=`; off-by-one.

### n1-m4-02-for-e-range · for e range

- **Arquivo:** `04-repeticao-lacos/02-for-e-range.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Usar range com um, dois e três argumentos e prever a sequência gerada · Escolher entre for e while conforme o problema · Percorrer os caracteres de uma string com for
- **Conceitos:** `range(n)`, `range(a, b)`, `range(a, b, passo)`, passo negativo, `for` sobre string, `list(range())`.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Pares e regressiva** — imprimir pares de 2 a 20 e depois de 10 a 1 com `range` de passo. Verificação: `io` exato; `source uses for`. Erradas: `range(2, 20, 2)` (para em 18); `range(10, 1, -1)` (para em 2). Dicas: fim exclusivo.
- **Exercício 2 · `soma_ate(n)`** — soma 1..n com `for`. Verificação: `call` 1, 5, 100, 0 (→ 0); `source not_uses while`. Erradas: `range(n)` (soma até n−1). Dicas: `range(1, n + 1)`.
- **Exercício 3 · `conta_vogais(palavra)`** — `for letra in palavra`, conta `aeiou` (minúsculas e maiúsculas). Verificação: `call` `"banana"` → 3, `"PYTHON"` → 1, `""` → 0. Erradas: só minúsculas. Dicas: `letra.lower() in "aeiou"`.
- **Quiz (3):** `list(range(5))`; `range(1, 10, 3)`; última linha de `for i in range(3): print(i)`.
- **Erros comuns:** fim exclusivo; `range(len())` desnecessário.

### n1-m4-03-acumuladores-e-contadores · Acumuladores e contadores

- **Arquivo:** `04-repeticao-lacos/03-acumuladores-e-contadores.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Implementar somatório, contagem e média com acumuladores inicializados corretamente · Encontrar o maior e o menor valor de uma sequência sem usar max() e min() · Explicar onde inicializar o acumulador e por que
- **Conceitos:** acumulador fora do laço, `+=`, contador, média, maior/menor com primeiro elemento, acumulador de texto.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Média das notas** — ler `n` e depois `n` notas; imprimir `Média: 7.50`. Verificação: `io` com `3\n7\n8\n7.5` e `1\n10`. Erradas: acumulador dentro do laço; dividir por `n + 1`. Dicas: inicialize antes.
- **Exercício 2 · Maior e menor** — `maior_de(lista)` e `menor_de(lista)` sem `max`/`min`. Verificação: `call` com `[3, -7, 12, 0]`, `[-5, -2]`, `[4]`; `source not_calls max`, `not_calls min`. Erradas: `maior = 0` (falha com negativos). Dicas: comece com o primeiro elemento.
- **Exercício 3 · Fatorial iterativo** — `fatorial(n)` com produto acumulado. Verificação: `call` 0 → 1, 1 → 1, 5 → 120, 10 → 3628800. Erradas: produto começando em 0; `range(1, n)`. Dicas: produto neutro é 1.
- **Quiz (2):** onde inicializar; por que `maior = 0` falha.
- **Erros comuns:** inicialização, divisão por zero.

### n1-m4-04-break-e-continue · break e continue

- **Arquivo:** `04-repeticao-lacos/04-break-e-continue.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Usar break para encerrar um laço antes da condição e continue para pular uma iteração · Escrever o padrão while True + break para repetir até uma entrada válida · Reescrever um laço com flag booleana usando break e vice-versa
- **Conceitos:** `break`, `continue`, `while True` + `break`, validação de entrada, flag vs `break`.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Até digitar fim** — ler linhas até `fim`; imprimir `Lidos: N`. Verificação: `io` com `a\nb\nfim` e `fim`. Erradas: contar o `fim`. Dicas: teste antes de contar.
- **Exercício 2 · Pulando múltiplos de 3** — imprimir 1..20 pulando múltiplos de 3 com `continue`. Verificação: `io` exato; `source uses for`. Erradas: pular os não múltiplos. Dicas: `if i % 3 == 0: continue`.
- **Exercício 3 · Nota válida** — pedir até ser um número entre 0 e 10; para inválidos imprimir `Nota inválida, tente de novo.`; ao final `Nota registrada: 8.5`. Verificação: `io` com `11\n-1\n8.5`. Erradas: aceitar 11; não repetir. Dicas: `while True` e `break` quando válido.
- **Quiz (3):** `break` sai de qual laço; `continue` antes de `i += 1` num `while`; `break` fora de laço.
- **Erros comuns:** `break` no `if` sem laço; laço infinito com `continue`.

### n1-m4-05-lacos-aninhados · Laços aninhados

- **Arquivo:** `04-repeticao-lacos/05-lacos-aninhados.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Escrever laços aninhados e prever a ordem em que os pares (i, j) aparecem · Calcular quantas vezes o bloco interno executa · Montar saídas em grade (tabuada, triângulo de asteriscos) com print e end
- **Conceitos:** laço interno roda inteiro por iteração do externo, pares `(i, j)`, `end=" "`, contagem n × m.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Tabuada 1 a 3** — formato `1 x 1 = 1` … com linha em branco entre tabuadas (layout no enunciado). Verificação: `io` exato. Erradas: sem linha em branco; variável única. Dicas: externo = tabuada, interno = multiplicador.
- **Exercício 2 · Triângulo** — ler `n`, imprimir linhas com 1..n asteriscos. Verificação: `io` com 3 e 1. Erradas: `range(n)` (0 asteriscos na primeira linha). Dicas: `"*" * i` ou laço interno com `end=""`.
- **Exercício 3 · `pares_que_somam(lista, alvo)`** — conta pares `i < j` com soma igual ao alvo. Verificação: `call` `([1, 2, 3, 4], 5)` → 2, `([2, 2, 2], 4)` → 3, `([], 1)` → 0. Erradas: contar `(i, j)` e `(j, i)`; incluir `i == j`. Dicas: `for j in range(i + 1, n)`.
- **Quiz (3):** ordem dos pares; quantas vezes o interno roda para 3 × 4; o que imprime um trecho.
- **Erros comuns:** mesma variável nos dois laços; `end`.

### n1-m4-06-padroes-de-busca-e-contagem · Padrões de busca e contagem

- **Arquivo:** `04-repeticao-lacos/06-padroes-de-busca-e-contagem.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Implementar busca do primeiro elemento que satisfaz uma condição, com flag ou break · Contar ocorrências e verificar 'todos' e 'algum' com laços · Reconhecer esses padrões em problemas novos e escolher o adequado
- **Conceitos:** flag existe?, primeiro índice com `break`, contador com `if`, todos/algum, `eh_primo`.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · `primeiro_negativo(lista)`** — índice do primeiro negativo ou −1. Verificação: `call` `[3, -1, -5]` → 1, `[1, 2]` → −1, `[]` → −1. Erradas: devolver o valor em vez do índice; devolver o último. Dicas: `enumerate` ou `range(len())`; pare ao achar.
- **Exercício 2 · `conta_pares` e `todos_positivos`** — Verificação: `call` com `[2, 3, 4]` → 2; `[1, 2, 3]` → True, `[1, -2]` → False, `[]` → True (vacuidade explicada no enunciado). Erradas: `return True` dentro do laço. Dicas: só decida `True` depois do laço.
- **Exercício 3 · `eh_primo(n)`** — divisores de 2 a n−1 com `break`. Verificação: `call` 1 → False, 2 → True, 9 → False, 17 → True, 25 → False, 0 → False. Erradas: `eh_primo(1)` True; `range(2, n)` sem tratar 2. Dicas: números menores que 2 não são primos.
- **Quiz (3):** valor inicial da flag em "todos"; o que `break` faz na busca; contador vs acumulador.
- **Erros comuns:** retorno precoce; lista vazia.

### n1-m4-07-projeto-jogo-de-adivinhacao · Mini-projeto: jogo de adivinhação

- **Arquivo:** `04-repeticao-lacos/07-projeto-jogo-de-adivinhacao.lvl.md` · lição guiada · 150 XP · 90 min
- **Objetivos:** Montar um jogo completo combinando while, if/elif/else, contadores e validação de entrada · Separar a regra (avaliar um palpite) da interação (ler e imprimir) · Usar o módulo random com semente fixa para obter resultados reproduzíveis
- **Conceitos:** `random.randint`, `random.seed`, regra vs interação, tentativas, validação.
- **Passos:** Leitura (regras + 3 partidas de exemplo) → Exercício → Exercício → Exercício → Exercício → Quiz.
- **Exercício 1 · `avaliar_palpite(palpite, segredo)`** — `"maior"` se o segredo é maior que o palpite, `"menor"`, `"acertou"`. Verificação: `call` (50, 70) → `"maior"`, (80, 70) → `"menor"`, (70, 70) → `"acertou"`. Erradas: inverter maior/menor. Dicas: a dica fala do segredo em relação ao palpite.
- **Exercício 2 · Laço de tentativas com segredo fixo** — `segredo = 42`, 5 tentativas; mensagens exatas (`Tentativa 1 de 5:`, `O número é maior.`, `Acertou em 3 tentativas!`, `Você perdeu. O número era 42.`). Verificação: `io` × 3 (`42`; `10\n50\n42`; `1\n2\n3\n4\n5`). Erradas: contagem errada; não parar ao acertar. Dicas: `break` ao acertar.
- **Exercício 3 · Validação** — palpites fora de 1..100 imprimem `Digite um número entre 1 e 100.` e não consomem tentativa. Verificação: `io` com `0\n101\n42` → acerta em 1 tentativa. Erradas: consumir tentativa. Dicas: `continue` antes de contar.
- **Exercício 4 · Versão final** — `import random`, `random.seed(42)`, `segredo = random.randint(1, 100)`; o enunciado informa o segredo gerado com essa semente (o autor deve rodar no runner e registrar). Verificação: `io` + `source imports random` + `source calls seed`. Erradas: `seed` dentro do laço; sem `seed`. Dicas: a semente vai antes do `randint`.
- **Quiz (3):** por que a semente; `break` vs flag; validação antes de contar.
- **Erros comuns:** comparar texto com número; mensagens fora do padrão.

## Módulo 5 · Coleções

Listas, métodos e fatias, percorrendo, tuplas, dicionários, conjuntos e compreensões.

### n1-m5-01-listas · Listas

- **Arquivo:** `05-colecoes/01-listas.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Criar listas, acessar elementos por índice positivo e negativo e alterar posições · Usar len(), append() e in e prever IndexError · Explicar que uma lista pode mudar (mutável) e o que isso implica
- **Conceitos:** lista, índice 0, negativo, `len`, `append`, `in`, atribuição por índice, `IndexError`, mutabilidade.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Lista de compras** — `compras = ["arroz", "feijão", "café"]`; 1) `append("leite")`; 2) trocar o 2º por `"lentilha"`; 3) imprimir o último. Verificação: `variable compras == [...]`, `io contains leite`. Erradas: `compras[2] = ...` (3º); `compras = compras.append(...)`. Dicas: o segundo item é o índice 1.
- **Exercício 2 · `ultimo_e_primeiro(lista)`** — devolve `[ultimo, primeiro]`. Verificação: `call` `[1, 2, 3]` → `[3, 1]`, `[7]` → `[7, 7]`. Erradas: `lista[len(lista)]`. Dicas: `[-1]`.
- **Exercício 3 · Lendo n números** — ler `n` e depois `n` inteiros, montar a lista e imprimi-la (`[3, 5, 8]`). Verificação: `io`. Erradas: guardar strings (`['3', '5']`). Dicas: converta antes do `append`.
- **Quiz (3):** `lista[-1]`; `len([])`; `lista[3]` com 3 itens (IndexError).
- **Erros comuns:** `append` com dois argumentos; `append` devolve `None`.

### n1-m5-02-metodos-e-fatias · Métodos de lista e fatias

- **Arquivo:** `05-colecoes/02-metodos-e-fatias.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Usar os métodos mais comuns de lista e prever o que cada um devolve · Extrair partes de uma lista com fatias, inclusive invertendo com passo negativo · Diferenciar sort() de sorted() e cópia de referência
- **Conceitos:** `insert`, `remove`, `pop`, `sort`/`sorted`, `reverse`, `index`, `count`, fatias, passo, cópia vs referência.
- **Passos:** Leitura → Exercício → Leitura → Exercício → Quiz → Exercício.
- **Exercício 1 · Sequência de operações** — `fila = ["Bia", "Caio", "Davi"]`; 1) `insert(0, "Ana")`; 2) remover `"Caio"`; 3) `pop()` do último guardando em `saiu`; 4) `append("Eva")`. Verificação: `variable fila == ["Ana", "Bia", "Eva"]`, `variable saiu == "Davi"`. Erradas: `pop(0)`. Dicas: `pop()` sem índice tira o último.
- **Exercício 2 · Fatias** — `metade_inicial(lista)`, `inverter(lista)` (nova lista, sem `reverse`), `a_cada_dois(lista)`. Verificação: `call` com `[1, 2, 3, 4, 5]`; `source not_calls reverse`. Erradas: `lista.reverse()` (altera a original e devolve `None`). Dicas: `[::-1]`; `len(lista) // 2`.
- **Exercício 3 · `remover_se_existir(lista, item)`** — remove e devolve `True`, senão `False`, sem exceção. Verificação: `call` + `expr` conferindo a lista após a chamada. Erradas: `remove` sem checar (ValueError). Dicas: `if item in lista`.
- **Quiz (3):** `lista.sort()` devolve; `[1:3]` tamanho; `b = a` e `a.append` afeta `b`?.
- **Erros comuns:** `lista = lista.sort()`; cópia por referência.

### n1-m5-03-percorrendo-listas · Percorrendo listas

- **Arquivo:** `05-colecoes/03-percorrendo-listas.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Percorrer listas com for, enumerate e zip e escolher a forma adequada · Construir uma nova lista a partir de outra (filtrar e transformar) com laço · Explicar por que remover itens enquanto percorre dá errado e como evitar
- **Conceitos:** `for x in`, `enumerate(start=1)`, `zip`, construir lista nova, `sum/min/max`, remover durante iteração.
- **Passos:** Leitura → Exercício → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Ranking** — `nomes = ["Ana", "Bia", "Caio"]` → `1. Ana` … Verificação: `io` exato. Erradas: começar em 0. Dicas: `enumerate(nomes, start=1)`.
- **Exercício 2 · `apenas_pares` e `dobrados`** — listas novas. Verificação: `call` `[1, 2, 3, 4]` → `[2, 4]` / `[2, 4, 6, 8]`; `[]` → `[]`. Erradas: `print` em vez de acumular. Dicas: comece com `resultado = []`.
- **Exercício 3 · `media_ponderada(notas, pesos)`** — `zip`. Verificação: `call` `([8, 6], [2, 1])` → 7.333…, `tolerance 0.01`. Erradas: dividir pelo número de notas em vez da soma dos pesos. Dicas: divida pela soma dos pesos.
- **Exercício 4 · `remover_negativos(lista)`** — devolve nova lista sem alterar a original. Verificação: `call` + `expr` (`setup: original = [1, -2, 3]; r = remover_negativos(original)`, `expr: original`, esperado `[1, -2, 3]`). Erradas: `remove` dentro do `for` (pula `[-1, -2]`). Dicas: construa outra lista.
- **Quiz (3):** "o que imprime" ao remover no `for`; `enumerate` ordem; `zip` com tamanhos diferentes.
- **Erros comuns:** alterar durante iteração; alterar a entrada.

### n1-m5-04-tuplas-e-desempacotamento · Tuplas e desempacotamento

- **Arquivo:** `05-colecoes/04-tuplas-e-desempacotamento.lvl.md` · lição guiada · 90 XP · 35 min
- **Objetivos:** Criar tuplas e explicar quando preferir uma tupla a uma lista · Desempacotar tuplas em variáveis, inclusive em laços · Devolver mais de um valor de uma função com tupla
- **Conceitos:** tupla imutável, `(x,)`, desempacotamento, troca `a, b = b, a`, lista de tuplas, retorno múltiplo.
- **Passos:** Leitura → Exercício → Exercício → Quiz.
- **Exercício 1 · `trocar(a, b)` e `min_max(lista)`** — `trocar` devolve `(b, a)`; `min_max` devolve `(menor, maior)`. Verificação: `call` com `type: tuple` (JSON vira lista, por isso o `type`). Erradas: devolver lista; `return b; return a`. Dicas: `return b, a` já é tupla.
- **Exercício 2 · Nota fiscal** — `itens = [("Caderno", 12.5, 2), ("Caneta", 3.0, 5)]`; imprimir `Caderno: R$ 25.00` … e `Total: R$ 40.00`. Verificação: `io` exato. Erradas: `for item in itens: item[0]...` tudo bem, mas sem `:.2f`. Dicas: `for nome, preco, qtd in itens`.
- **Quiz (3):** tupla muda?; `(1)` é int; desempacotar 3 em 2.
- **Erros comuns:** `t[0] = x`; lista vs tupla no retorno.

### n1-m5-05-dicionarios · Dicionários

- **Arquivo:** `05-colecoes/05-dicionarios.lvl.md` · lição guiada · 120 XP · 50 min
- **Objetivos:** Criar dicionários, consultar, inserir e atualizar valores por chave · Usar get(), in, keys(), values() e items() e prever KeyError · Construir um contador de frequências com dicionário
- **Conceitos:** chave → valor, `KeyError`, `get`, `in`, atualizar, `del`, `items()`, contagem, aninhado, chaves imutáveis.
- **Passos:** Leitura → Exercício → Exercício → Leitura → Exercício → Quiz → Exercício.
- **Exercício 1 · Estoque** — `estoque = {"arroz": 10, "feijão": 5}`; 1) `estoque["arroz"] = 8`; 2) inserir `"café": 3`; 3) `del estoque["feijão"]`. Verificação: `variable estoque == {"arroz": 8, "café": 3}`. Erradas: `estoque.append`. Dicas: inserir e atualizar usam a mesma sintaxe.
- **Exercício 2 · `frequencia(lista)`** — Verificação: `call` `["a", "b", "a"]` → `{"a": 2, "b": 1}`, `[]` → `{}`. Erradas: `d[x] += 1` sem inicializar (KeyError). Dicas: `get(x, 0)`.
- **Exercício 3 · Relatório ordenado** — imprimir `produto: quantidade` em ordem alfabética das chaves. Verificação: `io` exato. Erradas: ordem de inserção. Dicas: `sorted(d)`.
- **Exercício 4 · `inverter(d)`** — chaves ↔ valores (valores únicos). Verificação: `call`. Erradas: devolver lista de tuplas. Dicas: `{v: k for k, v in d.items()}` ou laço.
- **Quiz (3):** `KeyError`; `get` com padrão; `for x in d` percorre chaves.
- **Erros comuns:** `for k, v in d` sem `items()`; lista como chave.

### n1-m5-06-conjuntos · Conjuntos

- **Arquivo:** `05-colecoes/06-conjuntos.lvl.md` · lição guiada · 90 XP · 35 min
- **Objetivos:** Criar conjuntos, adicionar e remover elementos e explicar por que não há repetição nem ordem · Aplicar união, interseção e diferença para resolver problemas de comparação de grupos · Converter entre lista e conjunto para remover duplicatas preservando o que for necessário
- **Conceitos:** `set`, `set()`, `add`, `discard`, `in`, `| & - ^`, `set(lista)`, `sorted(set(...))`.
- **Passos:** Leitura → Exercício → Exercício → Quiz.
- **Exercício 1 · `sem_repetidos` e `tem_repetidos`** — Verificação: `call` `[3, 1, 3, 2]` → `[1, 2, 3]` / True; `[]` → `[]` / False. Erradas: devolver `set`. Dicas: `sorted(set(lista))`; compare `len`.
- **Exercício 2 · Turmas** — `python = {"ana", "bia", "caio"}`, `calculo = {"bia", "davi"}`; `ambos(a, b)`, `apenas_a(a, b)`, `pelo_menos_um(a, b)` devolvendo listas ordenadas. Verificação: `call`. Erradas: `a - b` invertido. Dicas: `&`, `-`, `|` e `sorted`.
- **Quiz (3):** `{}` é dict; `len({1, 1, 2})` = 2; conjunto tem índice? (não).
- **Erros comuns:** `remove` de ausente; indexar conjunto.

### n1-m5-07-compreensoes · Compreensões de lista e de dicionário

- **Arquivo:** `05-colecoes/07-compreensoes.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Reescrever laços de transformação e filtro como compreensões de lista · Escrever compreensões de dicionário e de conjunto · Reconhecer quando uma compreensão fica ilegível e voltar ao laço
- **Conceitos:** `[expr for x in it if cond]`, dict/set comprehension, legibilidade, gerador entre parênteses.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Reescreva** — três funções dadas com laços (`quadrados`, `pares`, `maiusculas`) devem ser reescritas com compreensão. Verificação: `call` + `source uses list_comprehension` (com `function` de cada) + `source not_uses for` (`function` de cada). Erradas: manter o laço. Dicas: a expressão vem primeiro.
- **Exercício 2 · `tamanhos(palavras)`** — `{"casa": 4, ...}`. Verificação: `call` + `source uses dict_comprehension`. Erradas: lista de tuplas. Dicas: `{p: len(p) for p in palavras}`.
- **Exercício 3 · `quadrados_impares(n)` e `iniciais(nomes)`** — Verificação: `call` (5 → `[1, 9, 25]`; `["Ana Souza", "Bia Lima"]` → `["A", "B"]`). Erradas: `if` na posição errada. Dicas: o filtro vem depois do `for`.
- **Quiz (3):** o que `[x * 2 for x in range(3)]` produz; `if` antes vs depois do `for`; parênteses geram o quê.
- **Erros comuns:** ordem do `if`; efeito colateral.

## Módulo 6 · Funções

Definir e chamar, parâmetros e retorno, escopo, argumentos padrão e nomeados, docstrings e assert, recursão e funções como valores.

### n1-m6-01-definir-e-chamar · Definir e chamar funções

- **Arquivo:** `06-funcoes/01-definir-e-chamar.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Definir funções com def e chamá-las pelo nome · Explicar a diferença entre definir e executar uma função · Organizar um programa repetitivo em funções reutilizáveis
- **Conceitos:** `def`, chamada, definição não executa, ordem, repetição eliminada, nomes verbais.
- **Passos:** Leitura → Exercício → Exercício → Quiz.
- **Exercício 1 · `linha()` e `cabecalho()`** — `linha()` imprime 20 traços; `cabecalho()` chama `linha()`, imprime `RELATÓRIO`, chama `linha()`; o programa chama `cabecalho()`. Verificação: `io` exato; `source defines_function linha`, `defines_function cabecalho`, `calls cabecalho`. Erradas: definir sem chamar; 19 traços. Dicas: a definição sozinha não imprime nada.
- **Exercício 2 · Refatore** — programa com três blocos iguais de 3 linhas (saudação) → `saudar()` chamada 3 vezes. Verificação: `io` exato + `defines_function saudar` + `calls saudar`. Erradas: manter os blocos. Dicas: copie o bloco uma vez para dentro do `def`.
- **Quiz (3):** `nome` sem parênteses não chama; chamar antes do `def` (NameError); `def` define, não executa.
- **Erros comuns:** chamada sem parênteses; indentação.

### n1-m6-02-parametros-e-retorno · Parâmetros e retorno

- **Arquivo:** `06-funcoes/02-parametros-e-retorno.lvl.md` · lição guiada · 120 XP · 50 min
- **Objetivos:** Definir funções com parâmetros e chamá-las com argumentos · Devolver valores com return e usá-los em expressões e outras chamadas · Explicar a diferença entre imprimir e devolver e prever o valor de uma função sem return
- **Conceitos:** parâmetros, argumentos, `return`, `None`, usar retorno em expressões, retorno múltiplo, `print` ≠ `return`.
- **Passos:** Leitura → Exercício → Leitura → Exercício → Quiz → Exercício.
- **Exercício 1 · Três funções** — `area_retangulo(base, altura)`, `celsius_para_fahrenheit(c)` (`c * 9 / 5 + 32`), `eh_maior_de_idade(idade)`. Verificação: `call` com 3 casos cada (`tolerance 0.01` no float). Erradas: `print`. Dicas: `return` entrega o valor.
- **Exercício 2 · Conserte: print → return** — três funções dadas com `print`. Verificação: `call` + `source not_calls print`. Erradas: manter `print` e adicionar `return` (reprova o `not_calls`). Dicas: quem imprime é quem chama.
- **Exercício 3 · `dividir(a, b)`** — devolve `(quociente, resto)`. Verificação: `call` `type: tuple` (17, 5) → `[3, 2]`. Erradas: lista. Dicas: `return a // b, a % b`.
- **Quiz (3):** função sem `return` devolve `None`; linha após `return` não roda; `print` vs `return`.
- **Erros comuns:** retorno não usado; número de argumentos.

### n1-m6-03-escopo · Escopo de variáveis

- **Arquivo:** `06-funcoes/03-escopo.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Diferenciar variáveis locais e globais e prever NameError e UnboundLocalError · Passar dados por parâmetro e devolver por return em vez de usar variáveis globais · Explicar o que a palavra-chave global faz e por que raramente é boa ideia
- **Conceitos:** local, global, `UnboundLocalError`, `global` (evitar), entra por parâmetro e sai por `return`.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · O que imprime** — três programas curtos no enunciado; o aluno registra `saida_1`, `saida_2`, `saida_3` com o texto impresso (ou `"erro"`). Verificação: `variable` × 3. Erradas: achar que a função alterou a global. Dicas: faça o teste de mesa com dois quadros.
- **Exercício 2 · Sem global** — código inicial com `saldo = 100` e `def depositar(valor): global saldo; saldo += valor`. Reescrever como `depositar(saldo, valor)` devolvendo o novo saldo. Verificação: `call depositar(100, 50) == 150` + `expr` (`setup: depositar(100, 50)`, `expr: saldo`, esperado 100). Erradas: manter `global`. Dicas: devolva o novo valor.
- **Exercício 3 · `aplicar_desconto(preco, percentual)`** — puro. Verificação: `call` com `tolerance`. Dicas: nenhuma variável de fora.
- **Quiz (3):** variável local fora da função; `x = 5; dobrar(x)` muda `x`?; para que serve `global`.
- **Erros comuns:** usar `global` para "resolver"; mesmo nome dentro/fora.

### n1-m6-04-argumentos-padrao-e-nomeados · Argumentos padrão e nomeados

- **Arquivo:** `06-funcoes/04-argumentos-padrao-e-nomeados.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Definir parâmetros com valor padrão e chamar funções omitindo-os · Usar argumentos nomeados para deixar chamadas legíveis e fora de ordem · Explicar por que uma lista como valor padrão causa bugs e como evitar
- **Conceitos:** valor padrão, padrões no fim, argumentos nomeados, padrão mutável, `None` como sentinela.
- **Passos:** Leitura → Exercício → Exercício → Quiz.
- **Exercício 1 · `formatar_preco(valor, moeda="R$", casas=2)`** — devolve `"R$ 10.50"`. Verificação: `call` (10.5), (10.5, "US$"), (10.5, casas=1), (3, moeda="€", casas=0). Erradas: padrão na ordem errada. Dicas: `f"{moeda} {valor:.{casas}f}"`.
- **Exercício 2 · Lista padrão** — consertar `adicionar_tarefa(tarefa, lista=[])`. Verificação: `expr` (`setup: a = adicionar_tarefa("x"); b = adicionar_tarefa("y")`, `expr: b`, esperado `["y"]`) + `call`. Erradas: manter `[]`. Dicas: `lista=None` e criar dentro.
- **Quiz (3):** padrão antes de obrigatório; nomeado fora de ordem; por que `[]` como padrão é compartilhado.
- **Erros comuns:** nomeado antes de posicional; `TypeError` de nome inexistente.

### n1-m6-05-docstrings-e-assert · Docstrings e assert

- **Arquivo:** `06-funcoes/05-docstrings-e-assert.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Escrever docstrings curtas com o que a função recebe e devolve · Escrever testes com assert para casos normais e de borda · Explicar como um assert que falha ajuda a achar o erro
- **Conceitos:** docstring, `help`, `assert cond, msg`, função `testar_x()`, casos de borda, teste antes do código.
- **Passos:** Leitura → Exercício → Leitura → Exercício → Quiz → Exercício.
- **Exercício 1 · Documente** — adicionar docstrings a `dobro(n)` e `eh_par(n)` mencionando o que devolvem. Verificação: `expr` `dobro.__doc__` com `type: str` e `expr "devolve" in dobro.__doc__.lower()` esperado `True`. Erradas: comentário `#`. Dicas: três aspas na primeira linha da função.
- **Exercício 2 · `testar_eh_par()`** — pelo menos 4 asserts (0, 2, 3, -4). Verificação: `source defines_function testar_eh_par`; `expr` chamando `testar_eh_par()` com `eh_par` correta (sem exceção, `expected_stdout` vazio ou `expected null`); `expr` com `setup` redefinindo `eh_par = lambda n: n % 2 == 1` esperando `raises: AssertionError`; idem com `lambda n: n > 0`. Erradas: suíte com um único `assert eh_par(2)` (não mata o mutante `n > 0`); suíte sem o zero e sem negativos. Dicas: inclua 0, um ímpar e um negativo.
- **Exercício 3 · `arredondar_nota(nota)`** — passar nos asserts do enunciado (arredonda para o 0.5 mais próximo; regra explícita). Verificação: `call`. Dicas: `round(nota * 2) / 2`.
- **Quiz (3):** `assert (x, "msg")`; docstring vs comentário; o que faz um assert falhar.
- **Erros comuns:** float com `==`; não chamar o teste.

### n1-m6-06-recursao-introdutoria · Recursão: funções que chamam a si mesmas

- **Arquivo:** `06-funcoes/06-recursao-introdutoria.lvl.md` · lição guiada · 120 XP · 50 min
- **Objetivos:** Identificar caso base e caso recursivo em uma definição · Escrever funções recursivas simples (fatorial, soma, potência, inversão de string) · Rastrear as chamadas na pilha e explicar o RecursionError
- **Conceitos:** caso base, caso recursivo, pilha de chamadas, `RecursionError`, recursão vs laço.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · `fatorial(n)`** — recursivo. Verificação: `call` 0, 1, 5, 10; `source uses recursion`; `source not_uses for`, `not_uses while`. Erradas: laço; sem caso base (RecursionError). Dicas: `fatorial(0)` é 1.
- **Exercício 2 · `soma_lista(lista)` e `inverter(texto)`** — Verificação: `call` (`[]` → 0; `"abc"` → `"cba"`, `""` → `""`); `source uses recursion`. Erradas: `return soma_lista(lista[1:])` sem somar `lista[0]`. Dicas: primeiro elemento + resto.
- **Exercício 3 · `potencia(base, expoente)`** — expoente ≥ 0. Verificação: `call` (2, 0) → 1, (2, 10) → 1024, (5, 3) → 125; `source uses recursion`. Erradas: caso base `expoente == 1` falhando em 0. Dicas: `expoente == 0` → 1.
- **Quiz (3):** o que falta numa recursão sem base; quantas chamadas `fatorial(4)` faz (5); o que imprime um trecho.
- **Erros comuns:** esquecer `return` na chamada recursiva.

### n1-m6-07-funcoes-como-valores · Funções como valores: lambda, map, filter e sorted

- **Arquivo:** `06-funcoes/07-funcoes-como-valores.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Guardar uma função em variável e passá-la como argumento para outra função · Escrever lambdas de uma expressão e saber quando preferir def · Usar map, filter e sorted(key=...) para transformar, filtrar e ordenar coleções
- **Conceitos:** função como valor, passar função, `lambda`, `map`, `filter`, `sorted(key=)`, `reverse=True`.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · `aplicar_a_todos(funcao, lista)`** — devolve lista com `funcao(x)`. Verificação: `expr` (`setup: def triplo(x): return x * 3`, `expr: aplicar_a_todos(triplo, [1, 2])`, esperado `[3, 6]`); `expr` com `len` e `["ab", "c"]`. Erradas: chamar `funcao` sem argumento. Dicas: `funcao(x)` dentro do laço.
- **Exercício 2 · map/filter** — `dobrados(lista)` com `map` + lambda e `positivos(lista)` com `filter` + lambda. Verificação: `call` + `source uses lambda` + `source calls map`, `calls filter`. Erradas: compreensão. Dicas: `list(map(lambda x: x * 2, lista))`.
- **Exercício 3 · Ordenação por critério** — `por_nota(alunos)` (tuplas `(nome, nota)`, decrescente) e `por_nome(alunos)`. Verificação: `call` + `source uses lambda`. Erradas: `sorted(alunos)` (ordena por nome); sem `reverse`. Dicas: `key=lambda a: a[1]`.
- **Quiz (3):** `lambda` com `return`; passar `f()` vs `f`; `map` sem `list`.
- **Erros comuns:** `key=nota()`.

## Módulo 7 · Strings e texto

Métodos de string, formatação avançada, split e join, análise de texto e o mini-projeto analisador de texto.

### n1-m7-01-metodos-de-string · Métodos de string

- **Arquivo:** `07-strings-e-texto/01-metodos-de-string.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Aplicar os métodos mais usados de string e encadear chamadas · Explicar por que os métodos devolvem uma nova string em vez de alterar a original · Normalizar entradas do usuário (espaços, maiúsculas) antes de comparar
- **Conceitos:** imutabilidade, `upper/lower/strip/replace/find/startswith/endswith/count/isdigit/title`, encadeamento, normalização.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · `normalizar(texto)` e `eh_sim(resposta)`** — Verificação: `call` `"  SIM "` → `"sim"`; `eh_sim` True para `"s"`, `"Sim"`, `" SIM"`, False para `"não"`, `""`. Erradas: `texto.strip()` sem atribuir. Dicas: encadeie `.strip().lower()`.
- **Exercício 2 · `censurar(texto, palavra)` e `contar_ocorrencias(texto, trecho)`** — asteriscos do mesmo tamanho. Verificação: `call`. Erradas: `replace` com `"***"` fixo. Dicas: `"*" * len(palavra)`.
- **Exercício 3 · `cpf_valido_formato(cpf)`** — remove `.` e `-`, exige 11 dígitos. Verificação: `call` `"123.456.789-00"` → True, `"123"` → False, `"abc.def.ghi-jk"` → False. Erradas: não remover pontuação. Dicas: `isdigit` depois de limpar.
- **Quiz (3):** `texto.upper()` sem atribuir; `find` ausente devolve −1; `strip` só nas pontas.
- **Erros comuns:** `texto[0] = "A"`; `find` vs `index`.

### n1-m7-02-formatacao-de-texto · Formatação de texto e relatórios

- **Arquivo:** `07-strings-e-texto/02-formatacao-de-texto.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Usar os especificadores de formato de f-strings (largura, alinhamento, zeros, milhar, casas, porcentagem) · Montar uma tabela alinhada em texto a partir de uma lista de registros · Formatar valores monetários no padrão brasileiro
- **Conceitos:** `{:>10}`, `{:<}`, `{:^}`, `{:08.2f}`, `{:,}`, `{:.1%}`, `ljust/rjust/center/zfill`, tabela.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Sete formatos** — imprimir `[{'abc':>6}]`, `[{'abc':<6}]`, `[{'abc':^7}]`, `{3.14159:.2f}`, `{42:05d}`, `{1234567:,}`, `{0.256:.1%}` com as saídas exatas no enunciado. Verificação: `io` exato. Erradas: largura sem alinhamento. Dicas: a tabela de especificadores está na leitura.
- **Exercício 2 · `formatar_reais(valor)`** — `1234.5` → `"R$ 1.234,50"`. Verificação: `call` com 0, 1234.5, 1000000. Erradas: padrão americano. Dicas: formate com `,` e `.` e troque com `replace` em duas etapas.
- **Exercício 3 · `tabela(produtos)`** — lista de tuplas → cabeçalho + linhas (`Produto` 10 à esquerda, `Qtd` 5 à direita, `Preço` 10 à direita com 2 casas). Verificação: `io` exato (layout no enunciado). Erradas: espaços manuais. Dicas: use a mesma largura no cabeçalho.
- **Quiz (3):** `{:>5}`; `{:,}`; `{:.0%}`.
- **Erros comuns:** esquecer o `f`; largura menor que o texto.

### n1-m7-03-split-e-join · split, join e linhas

- **Arquivo:** `07-strings-e-texto/03-split-e-join.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Separar strings com split (espaços, vírgulas, separadores arbitrários) e juntar com join · Processar um texto com várias linhas usando splitlines e laços · Converter uma linha de valores separados por vírgula em números e calcular com eles
- **Conceitos:** `split()`, `split(sep)`, `join`, `splitlines`, CSV simples, conversão de campos.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · `inverter_palavras(frase)` e `iniciais(nome)`** — Verificação: `call` `"o rato roeu"` → `"roeu rato o"`; `"Ana Clara Souza"` → `"A.C.S."`. Erradas: `split(" ")` com espaços duplos. Dicas: `" ".join(lista[::-1])`.
- **Exercício 2 · CSV em variável** — `dados = "nome,idade\nAna,20\nBia,35\nCaio,27"`; calcular `media_idade` (27.33 arredondado a 2) e `nome_mais_longo`. Verificação: `variable` × 2 (`tolerance`). Erradas: contar o cabeçalho. Dicas: `splitlines()[1:]`.
- **Exercício 3 · `para_csv(registros)`** — lista de tuplas → `"Ana;20\nBia;35"`. Verificação: `call`. Erradas: `join` com ints (TypeError). Dicas: converta com `str` antes de juntar.
- **Quiz (3):** `"a,b".split(",")`; `",".join([1, 2])`; `split()` vs `split(" ")`.
- **Erros comuns:** ordem do `join`; `\n` no fim das linhas.

### n1-m7-04-analise-de-texto · Análise de texto

- **Arquivo:** `07-strings-e-texto/04-analise-de-texto.lvl.md` · lição guiada · 120 XP · 50 min
- **Objetivos:** Calcular frequência de palavras e de letras combinando split, dicionários e normalização · Implementar verificações de texto (palíndromo, anagrama) ignorando acentos simples, espaços e maiúsculas · Usar ord() e chr() para deslocar letras e implementar a cifra de César
- **Conceitos:** normalizar → separar → contar; pontuação; palíndromo; anagrama; `ord/chr`; `% 26`; `max(d, key=d.get)`.
- **Passos:** Leitura → Exercício → Exercício → Leitura → Exercício → Quiz.
- **Exercício 1 · `frequencia_de_palavras(texto)`** — minúsculas, remover `.,!?;:` listados. Verificação: `call` com `"Oi, oi! Tudo bem?"` → `{"oi": 2, "tudo": 1, "bem": 1}`. Erradas: sem `lower`; pontuação grudada. Dicas: substitua cada sinal por espaço.
- **Exercício 2 · `eh_palindromo(frase)` e `sao_anagramas(a, b)`** — ignorar espaços e maiúsculas. Verificação: `call` (`"A base do teto desaba"` → True; `"amor"`, `"roma"` → True). Erradas: comparar sem limpar. Dicas: `sorted` para anagramas.
- **Exercício 3 · `cifrar(texto, k)` / `decifrar(texto, k)`** — só letras, preserva caixa e espaços. Verificação: `call` (`"abc xyz"`, 3) → `"def abc"`; `("Ola", 1)` → `"Pmb"`; `decifrar(cifrar(t, k), k) == t` via `expr`. Erradas: sem `% 26`; cifrar espaço. Dicas: trabalhe em relação a `ord("a")`/`ord("A")`.
- **Quiz (3):** `ord("a")`; por que `% 26`; o que é anagrama.
- **Erros comuns:** acentos (o enunciado evita); `max` de dicionário sem `key`.

### n1-m7-05-projeto-analisador-de-texto · Mini-projeto: analisador de texto

- **Arquivo:** `07-strings-e-texto/05-projeto-analisador-de-texto.lvl.md` · lição guiada · 150 XP · 90 min
- **Objetivos:** Combinar funções de string, dicionários, ordenação e formatação em um programa completo · Produzir um relatório com layout exato a partir de um texto de entrada · Testar cada função isoladamente antes de montar o programa principal
- **Conceitos:** integração de strings, dicionários, ordenação com desempate, formatação, leitura até sentinela.
- **Passos:** Leitura (especificação + exemplo completo) → Exercício → Exercício → Exercício → Exercício → Quiz.
- **Exercício 1 · `estatisticas(texto)`** — devolve `{"caracteres": n, "palavras": n, "linhas": n, "frases": n}` (frases = trechos terminados em `.`, `!` ou `?`, não vazios). Verificação: `call` com dois textos. Erradas: linha vazia como frase. Dicas: `split` por pontuação e filtre vazios.
- **Exercício 2 · `top_palavras(texto, n)`** — lista de tuplas `(palavra, freq)` por frequência decrescente, desempate alfabético. Verificação: `call`. Erradas: sem desempate. Dicas: `sorted(..., key=lambda p: (-p[1], p[0]))`.
- **Exercício 3 · `buscar(texto, termo)`** — números das linhas (a partir de 1) que contêm o termo, insensível a maiúsculas. Verificação: `call`. Erradas: sensível a caixa. Dicas: `lower` dos dois lados.
- **Exercício 4 · Programa principal** — lê linhas até `FIM`, imprime o relatório no layout exato. Verificação: `io` × 2. Erradas: incluir `FIM` no texto. Dicas: monte o texto com `"\n".join`.
- **Quiz (3):** revisão do módulo.
- **Erros comuns:** desempate; layout.

## Módulo 8 · Erros, testes e depuração

Tipos de erro e tracebacks, try/except, assert e testes simples, e estratégias de depuração.

### n1-m8-01-tipos-de-erro-e-tracebacks · Tipos de erro e como ler um traceback

- **Arquivo:** `08-erros-testes-e-depuracao/01-tipos-de-erro-e-tracebacks.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Classificar um problema como erro de sintaxe, de execução ou de lógica · Reconhecer as exceções mais comuns pela mensagem e pela causa · Ler um traceback com várias chamadas e apontar a linha responsável
- **Conceitos:** sintaxe/execução/lógica; `ValueError`, `TypeError`, `ZeroDivisionError`, `IndexError`, `KeyError`, `NameError`, `AttributeError`; traceback de baixo para cima.
- **Passos:** Leitura → Exercício → Leitura → Exercício → Quiz → Exercício.
- **Exercício 1 · Qual exceção** — cinco trechos no enunciado; registrar `erro_1` … `erro_5` com o nome exato. Verificação: `variable` × 5. Erradas: `IndexError` por `KeyError`. Dicas: rode cada trecho no editor.
- **Exercício 2 · Leia o traceback** — traceback de três níveis no enunciado; registrar `linha_do_erro` e `funcao_do_erro`. Verificação: `variable` × 2. Erradas: pegar a linha da chamada mais externa. Dicas: a última entrada da cadeia é onde o erro aconteceu.
- **Exercício 3 · Dois bugs** — `media_segura(lista)` com `ZeroDivisionError` em lista vazia (devolver 0.0) e erro de lógica (`len(lista) - 1`). Verificação: `call`. Dicas: trate o vazio primeiro.
- **Quiz (3):** família de "resposta errada sem erro"; `most recent call last`; `KeyError` vs `IndexError`.
- **Erros comuns:** ler só a primeira linha do traceback.

### n1-m8-02-try-e-except · try e except

- **Arquivo:** `08-erros-testes-e-depuracao/02-try-e-except.lvl.md` · lição guiada · 120 XP · 50 min
- **Objetivos:** Envolver código arriscado em try/except e capturar exceções específicas · Usar else e finally e explicar quando cada bloco executa · Repetir a leitura de uma entrada até ela ser válida usando try/except dentro de um laço
- **Conceitos:** `try/except Tipo`, múltiplos `except`, `except:` nu, `else`, `finally`, `as e`, `raise`, leitura robusta.
- **Passos:** Leitura → Exercício → Exercício → Leitura → Exercício → Quiz.
- **Exercício 1 · `para_inteiro(texto)`** — número ou `None`. Verificação: `call` `"42"` → 42, `"4.2"` → None, `"abc"` → None; `source uses try`; `source catches ValueError`. Erradas: `except:` nu (reprova em `catches ValueError`); `int(texto)` fora do `try`. Dicas: só o `int()` vai dentro do `try`.
- **Exercício 2 · `dividir_seguro(a, b)`** — `None` em divisão por zero. Verificação: `call` + `source catches ZeroDivisionError`. Erradas: `if b == 0` sem `try` (o enunciado exige tratar a exceção; reprova em `catches`). Dicas: capture a exceção específica.
- **Exercício 3 · Idade válida** — ler até inteiro entre 0 e 120; mensagens `Digite um número inteiro.` e `Idade fora do intervalo.`; ao final `Idade: 30`. Verificação: `io` com `abc\n200\n30`. Erradas: sem `break`; sem tratar intervalo. Dicas: `while True` + `try` + `break`.
- **Quiz (3):** ordem `try/except/else/finally`; por que `except:` nu é ruim; quando `finally` roda.
- **Erros comuns:** `try` envolvendo tudo; `except Exception` genérico.

### n1-m8-03-assert-e-testes-simples · assert e testes simples

- **Arquivo:** `08-erros-testes-e-depuracao/03-assert-e-testes-simples.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Escrever funções de teste com assert cobrindo casos típicos, de borda e inválidos · Interpretar uma falha de assert e localizar o defeito na função testada · Implementar uma função a partir dos testes dados (test-first)
- **Conceitos:** lista de casos antes, borda, mensagem no assert, `testar_x()`, mutantes.
- **Passos:** Leitura → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · `media(lista)`** — passar nos asserts do enunciado (`[]` → `None`, `[5]` → 5.0, `[1, 2]` → 1.5). Verificação: `call`. Erradas: `ZeroDivisionError` em vazio. Dicas: trate `[]` antes.
- **Exercício 2 · `testar_eh_palindromo()`** — asserts exigidos (`"arara"`, `"abc"`, `""`, `"Ana"` com caixa ignorada). Verificação: `source defines_function`; `expr` com implementação correta no `setup` (sem erro); `expr` com mutante `lambda s: s == s[::-1]` (sem ignorar caixa) esperando `raises: AssertionError`; mutante `lambda s: True` idem. Erradas: só casos positivos (não mata `lambda s: True`). Dicas: inclua um caso que deve ser False.
- **Exercício 3 · Ache o bug** — `contar_vogais` com `"aeiou"` sem tratar maiúsculas e `range(len(s) - 1)`. Verificação: `call`. Dicas: rode os testes dados e leia qual falha.
- **Quiz (3):** float com `==`; assert com tupla; por que testar borda.
- **Erros comuns:** esquecer de chamar o teste.

### n1-m8-04-depuracao · Depuração: encontrando o bug

- **Arquivo:** `08-erros-testes-e-depuracao/04-depuracao.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Seguir um roteiro de depuração (reproduzir, isolar, inspecionar, corrigir, testar de novo) · Usar print estratégico e o teste de mesa para localizar bugs de lógica · Corrigir programas com bugs plantados sem reescrevê-los do zero
- **Conceitos:** reproduzir, isolar, inspecionar (`print(f"{x=}")`), reduzir, teste de mesa, não deixar prints.
- **Passos:** Leitura → Exercício → Exercício → Exercício → Quiz → Exercício.
- **Exercício 1 · Bug 1 (off-by-one)** — `media` dividindo por `len(lista) - 1`. Verificação: `call`. Dicas: teste com `[2, 2]`.
- **Exercício 2 · Bug 2 (acumulador no laço)** — `soma_pares` zera `total` dentro do `for`. Verificação: `call`. Dicas: imprima `total` a cada volta.
- **Exercício 3 · Bug 3 (and/or)** — `senha_valida` exige `len >= 8 and tem_digito or tem_maiuscula` sem parênteses. Verificação: `call` com 4 casos. Dicas: tabela-verdade.
- **Exercício 4 · Bug 4 (altera a entrada)** — `ordenada(lista)` usa `lista.sort()` e devolve `lista`; deve devolver nova. Verificação: `call` + `expr` conferindo a original. Dicas: `sorted`.
- **Quiz (3):** primeiro passo do roteiro; `print` esquecido reprova `io`; por que não apagar o teste.
- **Erros comuns:** mudar linhas ao acaso.

## Módulo 9 · Projeto do nível

O projeto final: um gerenciador de tarefas em modo texto com menu, prioridades, busca e relatório.

### n1-m9-01-gerenciador-de-tarefas · Projeto final: gerenciador de tarefas em modo texto

- **Arquivo:** `09-projeto-do-nivel/01-gerenciador-de-tarefas.lvl.md` · projeto do nível · 300 XP · 240 min
- **Objetivos:** Projetar um programa com estado (lista de dicionários) manipulado por funções puras e testáveis · Implementar um menu interativo com validação de entrada e mensagens exatas · Aplicar listas, dicionários, funções, strings, laços, condicionais e try/except em um único programa · Entregar um programa que passa em todos os casos de verificação (funções e interação completa)
Ver a seção **Projeto final** abaixo (especificação completa, assinaturas, exemplos e casos de verificação).

## Projeto final — Gerenciador de tarefas em modo texto (especificação completa)

**Arquivo:** `09-projeto-do-nivel/01-gerenciador-de-tarefas.lvl.md` · slug `n1-m9-01-gerenciador-de-tarefas` ·
`projeto: true` · 300 XP · 240 min. Exigido para o certificado (D4).

### Objetivo

Um programa em um único arquivo `main.py` que gerencia uma lista de tarefas em modo texto. O estado é
uma **lista de dicionários**; cada tarefa é `{"id": int, "titulo": str, "prioridade": str, "concluida": bool}`,
com `prioridade` em `"alta"`, `"media"` ou `"baixa"`. Toda a lógica fica em funções que **recebem a
lista `tarefas` como parâmetro** (nada de variável global alterada dentro das funções), para que a
verificação `call`/`expr` as exercite isoladamente. O menu (`executar()`) só lê, chama funções e imprime.

### Funções exigidas (nome e assinatura exatos)

| Função | Comportamento | Verificação |
|---|---|---|
| `criar_tarefa(tarefas, titulo, prioridade="media") -> dict` | Cria a tarefa com `id` = maior id existente + 1 (1 se a lista está vazia; ids **não** são reaproveitados após remoção), `concluida=False`, acrescenta à lista e devolve o dicionário. `titulo` com `strip()`; título vazio ou prioridade inválida levantam `ValueError`. | `call` (retorno) + `expr` (`len(tarefas)`, id após remoção) + `raises ValueError` |
| `listar(tarefas, apenas_pendentes=False) -> list` | Devolve **nova lista** com as tarefas (todas ou só pendentes) na ordem de id. Não altera a entrada. | `call` + `expr` (entrada intacta) |
| `concluir(tarefas, id_tarefa) -> bool` | Marca `concluida=True`; devolve `False` se o id não existe. | `call` + `expr` |
| `remover(tarefas, id_tarefa) -> bool` | Remove a tarefa; devolve `False` se o id não existe. | `call` + `expr` |
| `buscar(tarefas, termo) -> list` | Tarefas cujo título contém o termo, **sem diferenciar maiúsculas** e ignorando espaços nas pontas do termo. | `call` |
| `ordenar_por_prioridade(tarefas) -> list` | Nova lista ordenada por prioridade (`alta` < `media` < `baixa`) e, em empate, por id crescente. | `call` + `source uses lambda` ou `calls sorted` |
| `relatorio(tarefas) -> str` | Texto no layout abaixo (sem `print`). | `call` (string exata) |
| `executar()` | Menu interativo (abaixo). | `io` (4 sessões) |

### Layout do relatório (`relatorio`)

```
RELATÓRIO DE TAREFAS
Total: 3 | Pendentes: 2 | Concluídas: 1
[ ] 1 (alta) Estudar para a prova
[x] 2 (media) Lavar a louça
[ ] 3 (baixa) Organizar a estante
```

Linhas separadas por `\n`, sem linha em branco no final; com a lista vazia o relatório tem só as duas
primeiras linhas (`Total: 0 | Pendentes: 0 | Concluídas: 0`). As tarefas aparecem em ordem de id.

### Menu (`executar`)

Saída exata (o `input()` é chamado **sem texto de prompt**; o menu é impresso com `print` antes):

```
=== GERENCIADOR DE TAREFAS ===
1 - Adicionar tarefa
2 - Listar tarefas
3 - Concluir tarefa
4 - Remover tarefa
5 - Buscar tarefa
6 - Relatório
0 - Sair
```

- Opção `1`: lê o título e a prioridade (duas linhas); imprime `Tarefa 1 criada.` ou `Prioridade inválida.`
  (sem criar) ou `Título vazio.`.
- Opção `2`: imprime cada tarefa no formato `[ ] 1 (alta) Estudar para a prova`; com a lista vazia imprime `Nenhuma tarefa.`.
- Opções `3` e `4`: leem o id; imprimem `Tarefa 2 concluída.` / `Tarefa 2 removida.` ou `Tarefa não encontrada.`;
  id não numérico imprime `Id inválido.` (usar `try/except ValueError`).
- Opção `5`: lê o termo; imprime as tarefas encontradas no mesmo formato da opção 2 ou `Nenhuma tarefa encontrada.`.
- Opção `6`: imprime `relatorio(tarefas)`.
- Opção `0`: imprime `Até logo!` e encerra. Qualquer outra entrada: `Opção inválida.` e o menu é exibido de novo.
- O menu é reimpresso antes de cada leitura de opção.

### Exemplo de sessão

Entrada (`stdin`, uma resposta por linha):
```
1
Estudar para a prova
alta
1
Lavar a louça
media
3
2
6
0
```

Saída esperada (`MENU` abaixo representa as 8 linhas do menu, impressas por extenso a cada vez):
```
MENU
Tarefa 1 criada.
MENU
Tarefa 2 criada.
MENU
Tarefa 2 concluída.
MENU
RELATÓRIO DE TAREFAS
Total: 2 | Pendentes: 1 | Concluídas: 1
[ ] 1 (alta) Estudar para a prova
[x] 2 (media) Lavar a louça
MENU
Até logo!
```

O enunciado da lição traz a saída completa, linha por linha, sem a abreviação `MENU`.

### Passos sugeridos

1. **Leitura** — especificação, exemplos e critérios (esta seção, adaptada ao aluno).
2. **Exercício** — estrutura e `criar_tarefa` (`call` com dois cenários, `raises ValueError` × 2,
   `expr` conferindo ids após `remover`). Erradas: id = `len(tarefas) + 1` (reaproveita ids), sem `strip`,
   aceitar prioridade `"urgente"`.
3. **Exercício** — `listar`, `concluir`, `remover` (`call` + `expr`). Erradas: `listar` devolvendo a própria lista
   (a verificação altera o retorno e confere a original), `concluir` em id inexistente levantando exceção,
   `remover` por posição em vez de id.
4. **Exercício** — `buscar` e `ordenar_por_prioridade` (`call`). Erradas: busca sensível a maiúsculas; ordenação
   alfabética da prioridade (`alta`, `baixa`, `media`); sem desempate por id.
5. **Exercício** — `relatorio` (`call` com lista vazia, só pendentes, mistas). Erradas: linha em branco no fim,
   `[X]` maiúsculo, contagem errada.
6. **Exercício** — `executar()` com `io` em 4 sessões: fluxo feliz (acima); opção inválida seguida de `0`;
   concluir id inexistente e id não numérico; buscar sem resultado. Erradas: menu impresso uma vez só;
   `int(input())` sem tratamento; não repetir após opção inválida.
7. **Quiz** — 3 perguntas de autoavaliação (por que receber `tarefas` por parâmetro; por que não reaproveitar
   ids; por que `listar` devolve uma nova lista).

### Dicas por passo (até 3 cada)

- `criar_tarefa`: "o próximo id é `max` dos ids + 1, ou 1 se não houver tarefas"; "valide antes de inserir";
  "`raise ValueError('...')` interrompe a função".
- `executar`: "um `while True` com `break` na opção 0"; "converta o id dentro de `try/except ValueError`";
  "imprima o menu com uma função `mostrar_menu()` chamada antes de cada `input()`".
