# Plano do Nível 1 — Fundamentos de programação e de computação

Este é o plano de autoria do Nível 1 da trilha **Python: do zero à IA**. Ele é dirigido a quem vai
escrever o conteúdo real das lições (os arquivos `*.lvl.md` de cada módulo já existem com o
frontmatter completo e um passo de roteiro, que deve ser **substituído** pelos passos descritos
aqui). Cada lição abaixo traz: slug, título, objetivos, conceitos e a **sequência de passos, um a
um**, com o tipo de cada passo (Leitura, Exercício — código, lacunas ou ordenar —, Previsão, Quiz),
o conceito, os recursos de apresentação que o passo usa (diagrama Mermaid, bloco `visualizar`,
fórmula) e, nos exercícios, as instruções (que viram os *checkpoints*), a verificação, as soluções
erradas e as dicas.

Formato dos arquivos: `content/README.md` (§3 inteira; recursos de apresentação em §3.5–§3.7) e
`docs/v2/curso-e-passos.md` §6. Exemplo com todos os recursos:
`content/exemplo/cursos/curso-exemplo/m1-primeiros-passos/03-recursos-de-apresentacao.lvl.md`.
Limites do contrato: `packages/contracts/src/content-bundle.ts` (título 3–160, descrição ≤ 1000,
objetivos ≤ 10, passos ≤ 50, dicas ≤ 3 por passo, casos de teste ≤ 100 por passo).

## Como usar este plano

1. Abra o arquivo da lição (`content/cursos/n1-fundamentos/<módulo>/<NN>-<slug>.lvl.md`).
2. Mantenha o frontmatter (slug, `xp`, `tempo_min`, objetivos). Não renomeie arquivos nem slugs.
3. Substitua o corpo pelos passos **na ordem e com os tipos listados** na lição
   (`## Passo N · Leitura|Exercício|Previsão|Quiz · Título`). O título do passo pode ser lapidado;
   o tipo, o modo e a ordem não mudam sem atualizar este plano e a tabela de dosagem.
4. Em cada exercício: `### Instruções` (lista numerada = checkpoints), `### Código inicial`
   (não existe no `modo: ordenar`), `### Solução`, `### Dicas` (até 3), `### Verificação` (JSON de
   `TestCase[]`) e `### Soluções erradas` (**pelo menos duas**, as listadas em "Erradas").
5. Rode `pnpm content:check` (lint) e `pnpm content:verify --curso n1-fundamentos` (a solução
   aprova, o código inicial reprova, cada solução errada reprova, cada `Previsão` reproduz a saída,
   cada bloco `visualizar` roda sem erro). O `content:build` precisa do executor (`RUNNER_URL`,
   `RUNNER_TOKEN`) porque todo módulo tem `Previsão`.

## Como usar os recursos de apresentação neste nível

O público é o iniciante absoluto. Cada recurso entra onde ajuda a entender, não em todo passo.

### Regras

- **Diagrama (bloco `mermaid`)** — para processo ou estrutura: hardware, caminho do código até a
  execução, sistema operacional, fluxo de `if`/`while`, pilha de chamadas, etapas de um projeto.
  Concentração no módulo 1. Use sempre `flowchart` (ou `sequenceDiagram` onde indicado), com no
  máximo ~8 nós e rótulos curtos em pt-BR; texto com parênteses, colchetes ou aspas vai entre
  aspas (`A["print(i)"]`). O lint só confere a estrutura: valide cada diagrama em
  https://mermaid.live antes de entregar.
- **Visualizador (bloco `python visualizar`)** — quando o estado muda a cada linha: reatribuição,
  laços, listas, chamadas de função, recursão. Concentração nos módulos 3 a 6. Até 60 linhas (aqui
  todos têm até 12), **sem `input()`**, precisa rodar sem erro e não pode ser a solução de um
  exercício da mesma lição. A narrativa diz o que observar ("veja `total` mudar a cada volta").
  A primeira aparição (lição `n1-m2-02`) explica o botão "Visualizar".
- **Fórmula (KaTeX)** — só onde há conta: unidades e binário (módulo 1), divisão e resto, média,
  IMC, juros compostos, somatórios, fatorial, cifra de César. `$…$` no meio do texto, `$$…$$` em
  bloco; texto com acento em `\text{…}`. **Todo `$` fora de código é fórmula**: dinheiro na
  narrativa se escreve `R\$ 25,00`; dentro de bloco de código e entre crases o cifrão fica como é
  (`"R$ 25,00"`). A fórmula acompanha a explicação em palavras, nunca a substitui.
- **`modo: lacunas` e `modo: ordenar`** — andaime. No começo de cada módulo (lição 01 e, quase
  sempre, 02) os primeiros exercícios são `lacunas` ou `ordenar`, **antes** de qualquer exercício
  de código livre do módulo; depois reaparecem só quando uma construção nova estreia. `lacunas`:
  a solução é o código inicial com cada `___` preenchido na mesma linha. `ordenar`: sem
  `### Código inicial`, solução em um único bloco com ≥ 3 linhas e indentação em múltiplos de 4
  espaços, `### Distratores` com 1 ou 2 linhas (opcional). Os mini-projetos (lições `n1-m3-05`,
  `n1-m4-07`, `n1-m7-05`) e o projeto do nível (`n1-m9-01`) têm **só exercícios de código livre**.
- **Passo `Previsão`** — pelo menos um por módulo, de preferência **antes** da explicação do
  comportamento ou logo depois da leitura. Só código determinístico: sem `input()`, sem `random`,
  sem hora, terminando **sem erro** (não dá para "prever uma exceção": erro vira pergunta de quiz),
  com saída de até 8 linhas (o formato aceita 20). Nunca imprima um `set` ou algo de ordem não
  garantida (use `sorted`). Escreva `### Saída esperada` no arquivo, copiada deste plano: o build
  confere com a execução real. Evite saídas em que espaços no começo da linha sejam o ponto.
- **Imagem (`assets/`)** — nenhuma neste nível: tudo o que seria figura está resolvido com Mermaid
  ou tabela Markdown, porque imagem exige criar e manter um SVG. Se alguma for criada depois,
  texto alternativo é obrigatório e este plano precisa ser atualizado.
- **Vídeo** — **não indicar** nesta etapa (não há como garantir que um endereço existe). Vídeo é
  opcional e fica para depois; quando entrar, usa `::video[título](url)` com `> Resumo:` e a
  narrativa continua fazendo sentido sem ele.
- **Limites que valem em todo passo:** até 3 dicas; exercício com pelo menos 2 soluções erradas;
  quiz com 2 ou 3 perguntas, cada uma com exatamente uma correta e explicação (`> …`); leitura com
  ≥ 200 caracteres e ≤ 400 palavras; cada passo vale 10 XP além do `xp` da lição.

### Notação usada nas lições

Cada passo aparece como `Passo N · Tipo · Título`. Em exercício, o tipo traz o modo:
`Exercício (código)`, `Exercício (lacunas)` ou `Exercício (ordenar)`. Os recursos do passo vêm
marcados com **Mermaid:**, **Visualizar:** e **Fórmula:**; a ausência do marcador significa que o
passo não usa o recurso. Blocos de código deste plano marcados como *Visualizar* ou *Previsão* foram
executados no CPython e podem ser copiados; os de *lacunas* mostram o código inicial. "Erradas" são
as soluções erradas obrigatórias; "Dicas" são as `### Dicas` (até 3).

### Dosagem por módulo

Quantas vezes cada recurso aparece (confira ao terminar cada módulo; se mudar um passo, atualize a linha):

| Módulo | Lições | Mermaid | Visualizar | Passos com fórmula | Exercício (lacunas) | Exercício (ordenar) | Exercício (código) | Previsão | Imagens (assets) |
|---|---|---|---|---|---|---|---|---|---|
| 1 · Como o computador funciona | 5 | 9 | 0 | 3 | 2 | 1 | 3 | 1 | 0 |
| 2 · Primeiros passos em Python | 6 | 2 | 1 | 3 | 4 | 2 | 12 | 5 | 0 |
| 3 · Decisões: condicionais | 5 | 4 | 3 | 2 | 2 | 1 | 10 | 4 | 0 |
| 4 · Repetição: laços | 7 | 4 | 7 | 4 | 3 | 2 | 17 | 6 | 0 |
| 5 · Coleções | 7 | 2 | 6 | 2 | 4 | 2 | 15 | 7 | 0 |
| 6 · Funções | 7 | 2 | 6 | 5 | 3 | 1 | 15 | 7 | 0 |
| 7 · Strings e texto | 5 | 3 | 2 | 1 | 2 | 1 | 13 | 4 | 0 |
| 8 · Erros, testes e depuração | 4 | 4 | 2 | 0 | 2 | 1 | 10 | 2 | 0 |
| 9 · Projeto do nível | 1 | 2 | 1 | 0 | 0 | 0 | 5 | 1 | 0 |
| **Total** | **47** | **32** | **28** | **20** | **22** | **11** | **100** | **37** | **0** |

Leitura da tabela: diagramas pesam no módulo 1; o visualizador pesa nos módulos 3 a 6; `lacunas` e
`ordenar` somam de 3 a 6 por módulo (1 a 8) e ficam nas primeiras lições; todo módulo tem `Previsão`; o
módulo 9 não tem `lacunas` nem `ordenar`.

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
- **`variable`** para exercícios de "preencha o valor" (conversões, leitura de traceback) e para
  estados finais de listas/dicionários. Prever a saída de um programa é papel do passo `Previsão`,
  não de um exercício com `variable`. Informe `type` quando o tipo é o ponto.
- **`expr`** para conferir efeitos colaterais (a lista original não mudou), chamar funções de
  teste do aluno com implementações injetadas no `setup` (mutantes com `raises: AssertionError`) e
  para `__doc__`.
- **`tolerance`** em todo caso com float (`call`, `variable`, `expr`): 0,01 para duas casas, 0,05
  para uma casa. Nunca compare float com igualdade exata.
- **Pelo menos duas soluções erradas por exercício**, uma para cada erro comum listado em "Erradas".
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

- **Recursos do módulo:** diagramas em todas as lições (é o módulo dos diagramas); fórmulas nas lições 01 e 02; sem visualizador (o aluno ainda não escreve programas com estado); `lacunas` nas lições 01 e 02, `ordenar` na 05; `Previsão` na 05 (o teste de mesa).
- **Assets a criar:** nenhum.

### n1-m1-01-hardware-bits-e-bytes · Hardware, bits e bytes

- **Arquivo:** `01-como-o-computador-funciona/01-hardware-bits-e-bytes.lvl.md` · lição guiada · 80 XP · 30 min
- **Objetivos:** Nomear as partes principais de um computador (CPU, RAM, armazenamento, entrada e saída) e a função de cada uma · Explicar o que é um bit e um byte e converter entre KB, MB e GB · Descrever, em linhas gerais, como texto e imagens são guardados como números
- **Conceitos:** CPU, RAM, armazenamento, entrada/saída; bit, byte, KB/MB/GB; ASCII/Unicode; pixel RGB.
- **Passos (4):**
  1. **Passo 1 · Leitura · As partes do computador** — CPU (quem calcula), RAM (o que está em uso agora, some ao desligar), armazenamento (o que fica guardado), entrada e saída. Analogia da cozinha: cozinheiro, bancada, despensa. **Mermaid:** `flowchart LR` com 5 nós — `Entrada (teclado, mouse)` → `CPU` → `Saída (tela, som)`; `CPU` ⇄ `RAM (memória de trabalho)`; `CPU` ⇄ `Armazenamento (SSD, HD)`. Mostra por onde o dado passa quando você abre um arquivo e digita nele.
  2. **Passo 2 · Leitura · Bits, bytes e como tudo vira número** — bit (0 ou 1), byte, unidades; texto como números (ASCII/Unicode); pixel como três números (R, G, B) em tabela Markdown de 3 cores. **Fórmula:** `$1\ \text{byte} = 8\ \text{bits}$`, `$2^8 = 256$` valores por byte e `$1\ \text{KB} = 2^{10} = 1024\ \text{bytes}$` (com a nota de que no dia a dia se arredonda para 1000). **Mermaid:** `flowchart LR` — `"letra A"` → `"número 65"` → `"bits 01000001"`: o caminho de um caractere até a memória.
  3. **Passo 3 · Quiz · Fixando o hardware** — 3 perguntas: qual componente guarda o que está em uso agora (RAM); quantos bits tem um byte (8); 1 MB tem aproximadamente quantos KB (1024 — só uma opção plausível, a convenção está no texto).
  4. **Passo 4 · Exercício (lacunas) · Primeiro contato com o Verificar** — o código inicial já traz os dois `print`; o aluno executa, lê a saída e preenche duas lacunas. Instruções: 1) execute e observe os dois valores impressos; 2) preencha `codigo_a` com o número que apareceu para `"A"`; 3) preencha `letra_66` com a letra que apareceu, entre aspas. Verificação: `variable codigo_a == 65 (type int)`, `variable letra_66 == "B" (type str)`. Erradas: `codigo_a = "65"` (texto); `codigo_a = 66`. Dicas: 1) `ord` dá o número da letra; 2) o valor de `codigo_a` é um número, sem aspas; 3) `chr(66)` mostra a letra de código 66.
     ```python
     print(ord("A"))
     print(chr(66))
     codigo_a = ___
     letra_66 = ___
     ```
- **Erros comuns:** RAM vs armazenamento; `ord(A)` sem aspas (NameError).

### n1-m1-02-binario-e-hexadecimal · Binário e hexadecimal

- **Arquivo:** `01-como-o-computador-funciona/02-binario-e-hexadecimal.lvl.md` · lição guiada · 90 XP · 40 min
- **Objetivos:** Converter um número decimal pequeno para binário e de volta, à mão · Ler um número hexadecimal e explicar por que ele é uma abreviação do binário · Usar os prefixos 0b e 0x e as funções bin() e hex() do Python para conferir conversões
- **Conceitos:** base posicional, potências de 2, divisões sucessivas, hexadecimal como grupos de 4 bits, prefixos `0b`/`0x`, `bin()`, `hex()`, `int(texto, base)`.
- **Passos (5):**
  1. **Passo 1 · Leitura · Base 10 e base 2** — cada posição vale uma potência da base; tabela das potências de 2 (1 a 128); conversão por divisões sucessivas com o exemplo do 37 em tabela (quociente, resto). **Fórmula:** `$37 = 3 \cdot 10^1 + 7 \cdot 10^0$` e, em bloco, `$$100101_2 = 1 \cdot 2^5 + 0 \cdot 2^4 + 0 \cdot 2^3 + 1 \cdot 2^2 + 0 \cdot 2^1 + 1 \cdot 2^0 = 37$$`. **Mermaid:** `flowchart TD` do algoritmo — `"divida n por 2"` → `"anote o resto"` → `{"quociente é 0?"}` —não→ `"n vira o quociente"` → volta; —sim→ `"leia os restos de baixo para cima"`.
  2. **Passo 2 · Exercício (lacunas) · Conversões à mão** — Instruções: 1) converta 10, 37 e 255 para binário e preencha as três primeiras lacunas, só com os dígitos (sem prefixo); 2) converta `110101` para decimal e preencha `valor`. Verificação: `variable` × 4 (`"1010"`, `"100101"`, `"11111111"`, `53` com `type int`). Erradas: binário invertido (`dez = "0101"`); `valor = "53"` (texto). Dicas: 1) divida por 2 e anote os restos; 2) leia os restos de baixo para cima; 3) para voltar ao decimal, some as potências de 2 das posições com 1. Se o lint recusar lacuna dentro de aspas, deixe a lacuna inteira (`dez = ___`) e peça as aspas na instrução.
     ```python
     dez = "___"
     trinta_e_sete = "___"
     duzentos_cinquenta_e_cinco = "___"
     valor = ___
     ```
  3. **Passo 3 · Leitura · Hexadecimal: binário abreviado** — 16 símbolos (0–9, a–f); tabela dígito hexa ↔ 4 bits; cores `#ff0000`; prefixos `0b` e `0x`; `bin()`, `hex()`, `int(texto, base)`. **Fórmula:** `$\text{ff}_{16} = 15 \cdot 16^1 + 15 \cdot 16^0 = 255$`.
  4. **Passo 4 · Exercício (código) · Conferindo com o Python** — Instruções: 1) imprima `bin(37)`; 2) imprima `hex(255)`; 3) imprima `int("ff", 16)`; 4) imprima `0b1010 + 0x10`. Saída exata no enunciado (`0b100101`, `0xff`, `255`, `26`). Verificação: `io` exato, um caso por checkpoint com `contains` + um caso final com a saída inteira. Erradas: `int("ff")` sem base (ValueError); `print(bin(37)[2:])` (tira o prefixo). Dicas: 1) `bin` e `hex` devolvem texto com prefixo; 2) `int` precisa saber a base do texto.
  5. **Passo 5 · Quiz · Bases** — 3 perguntas: quantos valores cabem em 8 bits (256); maior número com 4 bits (15); por que hexa é usado (cada dígito = 4 bits).
- **Erros comuns:** ler restos na ordem errada; `0b` como parte do número; `int("1011")` sem base.

### n1-m1-03-de-codigo-a-execucao · De código a execução

- **Arquivo:** `01-como-o-computador-funciona/03-de-codigo-a-execucao.lvl.md` · lição guiada · 80 XP · 30 min
- **Objetivos:** Diferenciar código-fonte, código de máquina e bytecode · Explicar a diferença entre compilar e interpretar com um exemplo de cada · Descrever o caminho de um arquivo .py até a execução pela máquina virtual do Python
- **Conceitos:** código-fonte, código de máquina, compilador, interpretador, bytecode, máquina virtual, `__pycache__`, WebAssembly (a plataforma).
- **Passos (4):**
  1. **Passo 1 · Leitura · Compilar e interpretar** — linguagem como ponte entre pessoa e CPU; analogia do tradutor de livro (compilador) e do intérprete simultâneo (interpretador). **Mermaid:** `flowchart LR` com dois `subgraph` — "Compilada (C, Rust)": `"código-fonte"` → `"compilador"` → `"executável"` → `"CPU"`; "Interpretada": `"código-fonte"` → `"interpretador"` → `"CPU"` (rótulo da aresta: "uma instrução por vez").
  2. **Passo 2 · Leitura · O caminho do Python** — o Python compila para bytecode e a máquina virtual executa; o que é `__pycache__`; o que o botão Executar da plataforma faz (CPython em WebAssembly no navegador); por que um erro de sintaxe impede todas as linhas. **Mermaid:** `flowchart LR` — `"programa.py"` → `"compilador do Python"` → `"bytecode (.pyc)"` → `"máquina virtual"` → `"CPU"`, com uma aresta lateral do compilador para `"SyntaxError: nada roda"`.
  3. **Passo 3 · Quiz · Compilador ou interpretador?** — 3 perguntas: o que o compilador faz (traduz tudo antes); o que é bytecode (instruções para a máquina virtual do Python); por que um erro de sintaxe impede o programa inteiro (a tradução para bytecode falha antes de executar).
  4. **Passo 4 · Exercício (código) · O erro que aparece antes de rodar** — código inicial com três `print` e parêntese faltando na linha 3. Instruções: 1) execute e observe que nenhuma linha roda; 2) conserte a linha 3; 3) execute de novo e confira as três linhas. Verificação: `io` exato (`Linha 1`, `Linha 2`, `Linha 3`). Erradas: apagar a linha 3; consertar trocando o texto para `Linha três`. Dicas: 1) leia a mensagem `SyntaxError` e o número da linha; 2) conte os parênteses que abrem e os que fecham.
- **Erros comuns:** achar que Python não compila; achar que o navegador executa Python nativamente.

### n1-m1-04-sistema-operacional-e-terminal · Sistema operacional e terminal

- **Arquivo:** `01-como-o-computador-funciona/04-sistema-operacional-e-terminal.lvl.md` · lição guiada · 80 XP · 35 min
- **Objetivos:** Explicar o papel do sistema operacional (processos, arquivos, dispositivos) em uma frase para cada · Usar os comandos básicos do terminal para listar, entrar em pastas e executar um arquivo .py · Instalar o Python e um editor no seu próprio computador seguindo um roteiro por sistema
- **Conceitos:** processo, sistema de arquivos, caminho absoluto/relativo, extensão, terminal, `cd`, `ls`/`dir`, `pwd`, `python arquivo.py`, instalação.
- **Passos (5):**
  1. **Passo 1 · Leitura · O que o sistema operacional faz** — três papéis: processos, arquivos, dispositivos. **Mermaid:** `flowchart TD` em três camadas — `"Programas (navegador, editor, Python)"` → `"Sistema operacional (processos, arquivos, dispositivos)"` → `"Hardware (CPU, RAM, disco, tela)"`: nenhum programa fala direto com o hardware.
  2. **Passo 2 · Leitura · Pastas, caminhos e terminal** — caminho absoluto e relativo, extensão; tabela de comandos Linux/macOS × Windows (`ls`/`dir`, `cd`, `pwd`/`cd`, `python arquivo.py`). **Mermaid:** `flowchart TD` como árvore de pastas — `"/home/ana"` → `"Documentos"` e `"projetos"`; `"projetos"` → `"jogo.py"` e `"notas.txt"`. O texto usa a árvore para mostrar `/home/ana/projetos/jogo.py` (absoluto) e `projetos/jogo.py` (relativo a `/home/ana`).
  3. **Passo 3 · Quiz · Terminal** — 3 perguntas: o que `cd ..` faz; qual comando executa um arquivo Python; caminho absoluto vs relativo.
  4. **Passo 4 · Leitura · Instalando o Python no seu computador** — roteiro numerado por sistema (Windows, macOS, Linux), como conferir com `python --version`, `python` vs `python3`, como sair do modo interativo. Sem recurso de apresentação (vídeo fica para depois).
  5. **Passo 5 · Exercício (código) · Comandos em variáveis** — Instruções: 1) `listar_linux = "ls"`; 2) `listar_windows = "dir"`; 3) `rodar = "python jogo.py"`; 4) `voltar = "cd .."`. Verificação: `variable` × 4 com os textos exatos. Erradas: `rodar = "python jogo"` (sem extensão); `voltar = "cd.."` (sem espaço). Dicas: 1) o comando inclui a extensão do arquivo; 2) há um espaço entre `cd` e `..`.
- **Erros comuns:** ficar preso no modo interativo; terminal na pasta errada; `python` vs `python3`.

### n1-m1-05-o-que-e-um-algoritmo · O que é um algoritmo

- **Arquivo:** `01-como-o-computador-funciona/05-o-que-e-um-algoritmo.lvl.md` · lição guiada · 90 XP · 40 min
- **Objetivos:** Definir algoritmo e reconhecer entrada, processamento e saída em um exemplo do dia a dia · Escrever um algoritmo simples em pseudocódigo e representá-lo em fluxograma · Executar um teste de mesa, linha a linha, anotando o valor de cada variável
- **Conceitos:** algoritmo, entrada/processamento/saída, pseudocódigo, fluxograma, teste de mesa, condição de parada.
- **Passos (5):**
  1. **Passo 1 · Leitura · Algoritmo: entrada, processamento e saída** — definição; passos sem ambiguidade; condição de parada ("repita até ficar bom" não serve). **Mermaid:** `flowchart LR` — `"Entrada: três notas"` → `"Processamento: somar e dividir por 3"` → `"Saída: a média"`.
  2. **Passo 2 · Exercício (ordenar) · Ordene os passos do café** — o aluno ordena cinco `print`, um por passo da receita (sem indentação). Instruções: 1) coloque os passos na ordem em que o café coado é feito; 2) deixe de fora a linha que não faz parte. Solução (5 linhas): `print("Ferver a água")`, `print("Colocar o pó no filtro")`, `print("Despejar a água sobre o pó")`, `print("Esperar o café coar")`, `print("Servir o café")`. Distratores: `print("Servir a água fria")`. Verificação: `io` exato com as cinco linhas (a ordem certa está no enunciado em forma de regra: "a água ferve primeiro; só se serve depois de coar"). Erradas: despejar antes de ferver; servir antes de coar. Dicas: 1) comece pelo passo que não depende de nenhum outro; 2) o último passo é servir.
  3. **Passo 3 · Leitura · Pseudocódigo, fluxograma e teste de mesa** — o mesmo algoritmo em pseudocódigo e em fluxograma; símbolos (retângulo = ação, losango = decisão); teste de mesa em tabela Markdown (uma coluna por variável, uma linha por instrução). **Mermaid:** `flowchart TD` com decisão — `"colocar a água no fogo"` → `{"a água ferveu?"}` —não→ `"esperar um minuto"` → volta à decisão; —sim→ `"despejar sobre o pó"` → `"servir"`.
  4. **Passo 4 · Previsão · Teste de mesa** — o aluno faz o teste de mesa no papel e digita as três linhas. Substitui o antigo exercício de `variable` (`a_final`, `b_final`, `c_final`). Dicas: 1) uma coluna por variável, uma linha por instrução; 2) `c` usa os valores de `a` e `b` **depois** das atualizações.
     ```python
     a = 3
     b = a * 2
     a = a + b
     b = b - 1
     c = a - b
     print(a)
     print(b)
     print(c)
     ```
     ```text
     9
     5
     4
     ```
  5. **Passo 5 · Quiz · Algoritmos** — 3 perguntas: o que falta em "repita até ficar bom" (critério objetivo de parada); qual símbolo do fluxograma é decisão (losango); o que é o teste de mesa.
- **Erros comuns:** passos ambíguos; esquecer a parada; usar o valor antigo de uma variável já atualizada.

## Módulo 2 · Primeiros passos em Python

print, variáveis e tipos, números e operadores, strings e f-strings, input e conversões, erros comuns e depuração.

- **Recursos do módulo:** `lacunas`/`ordenar` nas lições 01 a 05 (o aluno ainda não tem fluência para a página em branco); uma `Previsão` por lição de 01 a 05; o visualizador estreia na 02 (reatribuição); fórmulas onde há conta (resto da divisão, juros, média); dois diagramas (fluxo do `input`, escolha do erro).
- **Assets a criar:** nenhum.

### n1-m2-01-ola-python · Olá, Python

- **Arquivo:** `02-primeiros-passos-em-python/01-ola-python.lvl.md` · lição guiada · 100 XP · 35 min
- **Objetivos:** Escrever e executar um programa que imprime texto com print() · Usar aspas corretamente e imprimir várias linhas · Escrever comentários e explicar por que o Python os ignora
- **Conceitos:** `print`, strings entre aspas, uma linha por `print`, `print()` vazio, comentários `#`, ordem de execução, `sep`/`end` (curiosidade).
- **Passos (6):**
  1. **Passo 1 · Leitura · Seu primeiro programa** — `print`, texto entre aspas, execução de cima para baixo, `print()` vazio, comentários. Um bloco de código ilustrativo com a saída logo abaixo. Sem recurso de apresentação.
  2. **Passo 2 · Exercício (lacunas) · Olá, mundo** — Instruções: 1) complete o primeiro `print` para exibir exatamente `Olá, mundo!`; 2) complete o segundo para exibir `Eu estou aprendendo Python`. Verificação: `io` (`trimmed`, duas linhas), `source calls print`. Erradas: `Ola mundo` sem acento e vírgula; os dois textos no mesmo `print`. Dicas: 1) o texto vai entre aspas; 2) cada `print` escreve uma linha.
     ```python
     print(___)
     print(___)
     ```
  3. **Passo 3 · Exercício (ordenar) · Cartão de visita** — saída exata dada no enunciado: `Ana Souza`, `Ciência da Computação`, linha em branco, `Ribeirão Preto`. Instruções: 1) monte as linhas na ordem da saída; 2) use a linha que pula uma linha no lugar certo. Solução (4 linhas): `print("Ana Souza")`, `print("Ciência da Computação")`, `print()`, `print("Ribeirão Preto")`. Distratores: `print "Ana Souza"`. Verificação: `io` com `match: exact` na saída inteira (a linha em branco conta). Erradas: sem o `print()` vazio; `print()` no fim. Dicas: 1) `print()` sem nada dentro escreve uma linha em branco; 2) a linha em branco fica entre o curso e a cidade.
  4. **Passo 4 · Previsão · O que este programa imprime** — comentário não executa; `print()` vazio vira linha em branco. Dicas: 1) tudo depois de `#` é ignorado; 2) a linha em branco do meio faz parte da resposta.
     ```python
     print("Primeira")
     # print("Segunda")
     print()
     print("Terceira")
     ```
     ```text
     Primeira

     Terceira
     ```
  5. **Passo 5 · Quiz · print e aspas** — 2 perguntas: qual função exibe texto (`print`); o que acontece com `print(Olá)` (NameError: sem aspas o Python procura um nome).
  6. **Passo 6 · Exercício (código) · Conserte o programa** — primeiro código livre do módulo. Código inicial com uma string sem a aspa final e um `#` dentro de aspas que parece comentário. Verificação: `io` exato com as três linhas do enunciado. Erradas: apagar a linha com erro; tirar o `#` do texto. Dicas: 1) cada string abre e fecha com o mesmo tipo de aspas; 2) `#` dentro de aspas é texto, não comentário.
- **Erros comuns:** `Print`, aspas misturadas, `print "x"`, texto diferente do pedido.

### n1-m2-02-variaveis-e-tipos · Variáveis e tipos

- **Arquivo:** `02-primeiros-passos-em-python/02-variaveis-e-tipos.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Criar variáveis com nomes válidos e descritivos e reatribuir valores · Identificar o tipo de um valor (int, float, str, bool) e conferir com type() · Prever o resultado de trocar o valor de uma variável ao longo do programa
- **Conceitos:** atribuição `=`, nomes válidos (snake_case, sem dígito inicial, sem reservadas), `int`, `float`, `str`, `bool`, `type()`, reatribuição.
- **Passos (7):**
  1. **Passo 1 · Leitura · Variáveis: nomes para valores** — `=` guarda, não compara; nomes válidos; reatribuição. Apresenta o botão "Visualizar" (primeira aparição no nível): "avance linha a linha e veja o valor de `saldo` mudar". **Visualizar:**
     ```python
     saldo = 100
     saldo = saldo + 50
     preco = 30
     saldo = saldo - preco
     print(saldo)
     ```
  2. **Passo 2 · Exercício (lacunas) · Ficha de cadastro** — Instruções: 1) `nome` recebe o texto `Ana`; 2) `idade` recebe o número 20; 3) `altura` recebe 1.68; 4) `estudante` recebe verdadeiro. Verificação: `variable` × 4 com `type` (`str`, `int`, `float`, `bool`). Erradas: `idade = "20"`; `estudante = "True"`. Dicas: 1) texto usa aspas, número não; 2) `True` começa com T maiúsculo.
     ```python
     nome = ___
     idade = ___
     altura = ___
     estudante = ___
     print(nome, idade, altura, estudante)
     ```
  3. **Passo 3 · Leitura · Tipos: int, float, str e bool** — tabela tipo × exemplo × para que serve; `type()`; `"42"` não é `42`.
  4. **Passo 4 · Exercício (código) · Qual é o tipo** — imprimir `type()` de `42`, `3.14`, `"42"`, `False` (saída exata no enunciado: `<class 'int'>` …). Verificação: `io` exato. Erradas: imprimir o valor e não o tipo; `type("False")` (dá `str`). Dicas: 1) `print(type(42))`; 2) aspas mudam o tipo.
  5. **Passo 5 · Previsão · A cópia não acompanha** — `y` guarda o valor que `x` tinha naquele momento. Dicas: 1) faça o teste de mesa com duas colunas; 2) `y = x` copia o valor, não cria um vínculo.
     ```python
     x = 5
     y = x
     x = x + 1
     print(x)
     print(y)
     ```
     ```text
     6
     5
     ```
  6. **Passo 6 · Exercício (código) · A variável muda** — código inicial com `saldo = 100`. Instruções: 1) some 50; 2) subtraia 30; 3) dobre. Verificação: `variable saldo == 240`. Erradas: `saldo + 50` sem reatribuir (fica 100); dobrar antes de subtrair. Dicas: 1) `saldo = saldo + 50` guarda o novo valor; 2) siga a ordem das instruções.
  7. **Passo 7 · Quiz · Variáveis e tipos** — 3 perguntas: nome válido (`total_2` vs `2total`); tipo de `"10"` (`str`); o que `x = x + 1` faz.
- **Erros comuns:** número entre aspas; nome com espaço; `=` como comparação.

### n1-m2-03-numeros-e-operadores · Números e operadores

- **Arquivo:** `02-primeiros-passos-em-python/03-numeros-e-operadores.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Usar +, -, *, /, //, % e ** e prever o tipo do resultado · Aplicar a precedência dos operadores e usar parênteses para alterá-la · Resolver problemas simples com resto da divisão (par/ímpar, dígitos, troco)
- **Conceitos:** `+ - * / // % **`, precedência, parênteses, `round`, `abs`, `+=`.
- **Passos (6):**
  1. **Passo 1 · Leitura · Os sete operadores** — tabela operador × exemplo × resultado × tipo; precedência e parênteses; `round`, `abs`, `+=`. **Fórmula:** divisão inteira e resto, `$a = b \cdot q + r$`, com `$7 = 2 \cdot 3 + 1$` ligando `7 // 2` e `7 % 2`; e juros compostos como exemplo de `**`, `$$M = C \cdot (1 + i)^n$$`, ao lado de `1000 * (1 + 0.01) ** 12` (R\$ 1000 a 1 % ao mês por 12 meses).
  2. **Passo 2 · Previsão · Quem vem primeiro** — antes de o aluno digitar qualquer conta. Dicas: 1) multiplicação e divisão vêm antes de soma; 2) `//` joga fora a parte decimal e `%` devolve o que sobrou.
     ```python
     print(2 + 3 * 4)
     print((2 + 3) * 4)
     print(7 // 2)
     print(7 % 2)
     print(2 ** 3)
     ```
     ```text
     14
     20
     3
     1
     8
     ```
  3. **Passo 3 · Exercício (lacunas) · Seis contas** — o resultado esperado de cada linha está no enunciado (`3.5`, `3`, `1`, `1024`, `14`, `2.33`); o aluno completa operador ou operando. Instruções: 1) complete as três divisões de 7 por 2 (normal, inteira, resto); 2) complete a potência e a conta com parênteses; 3) complete o arredondamento para duas casas. Verificação: `io` exato com as seis linhas. Erradas: `3 + 4 * 2` sem parênteses (11); `/` no lugar de `//`. Dicas: 1) `//` é a divisão inteira e `%` é o resto; 2) `**` é potência; 3) o segundo argumento de `round` é o número de casas.
     ```python
     print(7 ___ 2)
     print(7 ___ 2)
     print(7 ___ 2)
     print(2 ___ 10)
     print(___ * 2)
     print(round(7 / 3, ___))
     ```
  4. **Passo 4 · Exercício (código) · Segundos em h:m:s** — código inicial `total_segundos = 7384`. Instruções: 1) `horas` com `//`; 2) `minutos` a partir do resto; 3) `segundos`. **Fórmula:** `$7384 = 2 \cdot 3600 + 3 \cdot 60 + 4$` no enunciado, como conferência. Verificação: `variable horas == 2`, `minutos == 3`, `segundos == 4` (`type int`). Erradas: usar `/` (floats); `minutos = total_segundos // 60` sem tirar as horas (123). Dicas: 1) 1 h = 3600 s; 2) o que sobra das horas se divide por 60; 3) o que sobra dos minutos são os segundos.
  5. **Passo 5 · Quiz · Operadores** — 3 perguntas: `7 // 2`; `7 % 2`; `2 ** 3 * 2` (16).
  6. **Passo 6 · Exercício (código) · Troco em notas** — `valor = 186`; calcular `notas_50`, `notas_20`, `notas_10`, `notas_5`, `notas_1` com `//` e `%` em cadeia. Verificação: `variable` × 5 (3, 1, 1, 1, 1). Erradas: pular a nota de 20; não atualizar o resto entre uma nota e outra. Dicas: 1) sempre a maior nota primeiro; 2) depois de cada nota, o valor que falta é o resto.
- **Erros comuns:** `/` devolvendo float; `^` como potência; `%` como porcentagem.

### n1-m2-04-strings-e-f-strings · Strings e f-strings

- **Arquivo:** `02-primeiros-passos-em-python/04-strings-e-f-strings.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Concatenar e repetir strings e medir o tamanho com len() · Montar mensagens com f-strings incluindo expressões e variáveis · Formatar números com casas decimais fixas dentro de uma f-string
- **Conceitos:** concatenação, repetição, `len`, `TypeError` texto+número, f-string com variáveis e expressões, `:.2f`.
- **Passos (7):**
  1. **Passo 1 · Leitura · Juntar, repetir e medir** — `+`, `*`, `len`; por que `"Idade: " + 20` dá `TypeError`. Sem recurso de apresentação.
  2. **Passo 2 · Exercício (código) · Nome completo** — `nome = "Ana"`, `sobrenome = "Souza"`. Instruções: 1) `completo` com um espaço entre os dois; 2) `tamanho = len(completo)`; 3) imprima `completo`. Verificação: `variable completo == "Ana Souza"`, `variable tamanho == 9`, `io contains`. Erradas: sem o espaço (`AnaSouza`); `tamanho = 8` digitado à mão. Dicas: 1) `" "` é uma string com um espaço; 2) `len` conta o espaço também.
  3. **Passo 3 · Leitura · f-strings** — `f"..."`, chaves com variável e com expressão, `:.2f`. No texto, valores em reais levam barra: R\$ 37,50.
  4. **Passo 4 · Previsão · O que a f-string monta** — Dicas: 1) o que está entre chaves é calculado antes de virar texto; 2) `:.2f` sempre mostra duas casas.
     ```python
     nome = "Bia"
     nota = 8.5
     print(f"{nome} tirou {nota}")
     print(f"Dobro: {nota * 2}")
     print(f"Preço: {12.5:.2f}")
     print("-" * 10)
     ```
     ```text
     Bia tirou 8.5
     Dobro: 17.0
     Preço: 12.50
     ----------
     ```
  5. **Passo 5 · Exercício (lacunas) · Recibo** — `produto = "Caderno"`, `preco = 12.5`, `quantidade = 3`; saída exata `Caderno x3: R$ 37.50`. Instruções: 1) complete o nome do produto e a quantidade; 2) complete a conta do total com duas casas. Verificação: `io` exato + `source uses f_string`. Erradas: total sem `:.2f` (`37.5`); sem o `f` antes das aspas. Dicas: 1) dentro das chaves cabe uma conta; 2) `:.2f` vem depois da expressão, ainda dentro das chaves.
     ```python
     produto = "Caderno"
     preco = 12.5
     quantidade = 3
     print(f"{___} x{___}: R$ {___:.2f}")
     ```
  6. **Passo 6 · Quiz · Strings** — 2 perguntas: `"Idade: " + 20` (TypeError); o que `f"{2 + 3}"` produz (`"5"`).
  7. **Passo 7 · Exercício (código) · Título decorado** — imprimir `"=" * 20`, o título `RELATÓRIO DE NOTAS` e `"=" * 20` (saída exata no enunciado). Verificação: `io` exato. Erradas: 19 sinais digitados à mão; título em minúsculas. Dicas: 1) `*` repete texto; 2) são três `print`.
- **Erros comuns:** esquecer o `f`; `:.2f` fora das chaves.

### n1-m2-05-input-e-conversoes · input e conversões

- **Arquivo:** `02-primeiros-passos-em-python/05-input-e-conversoes.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Ler texto do usuário com input() e explicar por que o resultado é sempre uma string · Converter entradas com int() e float() e prever quando a conversão falha · Escrever um programa completo que lê dados, calcula e imprime um resultado formatado
- **Conceitos:** `input()` devolve `str`, prompt, `int()`, `float()`, `str()`, `ValueError`, ponto decimal.
- **Passos (6):**
  1. **Passo 1 · Leitura · Conversando com o programa** — `input()` sempre devolve texto; conversão com `int()` e `float()`; `ValueError`; ponto decimal. **Mermaid:** `flowchart LR` — `"teclado"` → `"input(): sempre texto"` → `"int() ou float()"` → `"conta"` → `"print()"`.
  2. **Passo 2 · Previsão · Texto ou número?** — sem `input()`: as "entradas" já estão em variáveis de texto. Dicas: 1) `+` entre dois textos junta, não soma; 2) `float` sempre mostra a parte decimal.
     ```python
     a = "3"
     b = "4"
     print(a + b)
     print(int(a) + int(b))
     print(float(a) * 2)
     ```
     ```text
     34
     7
     6.0
     ```
  3. **Passo 3 · Exercício (ordenar) · Olá, você** — lê nome e cidade (dois `input()` sem texto de prompt) e imprime `Olá, Ana de Ribeirão Preto!`. Instruções: 1) leia o nome e depois a cidade; 2) imprima a saudação com os dois. Solução (3 linhas): `nome = input()`, `cidade = input()`, `print(f"Olá, {nome} de {cidade}!")`. Distratores: `print("Olá, nome de cidade!")`, `nome = input`. Verificação: `io` com `stdin "Ana\nRibeirão Preto\n"` e um segundo caso (`Caio\nSão Paulo\n`). Erradas: ler a cidade antes do nome; `input("Nome: ")` com prompt (altera a saída — o enunciado avisa que o prompt fica vazio). Dicas: 1) cada `input()` lê uma linha; 2) a primeira linha digitada é o nome.
  4. **Passo 4 · Exercício (código) · Soma e média** — lê dois números (podem ter decimais) e imprime, com duas casas, `Soma: 7.50` e `Média: 3.75` (para as entradas `2.5` e `5`). **Fórmula:** `$\text{média} = \dfrac{a + b}{2}$` no enunciado. Verificação: `io` com dois `stdin` (`2.5\n5\n`; `10\n4\n` → `Soma: 14.00`, `Média: 7.00`). Erradas: `int(input())` (ValueError com `2.5`); sem conversão (concatena os textos); `a + b / 2` sem parênteses. Dicas: 1) `float(input())`; 2) some antes de dividir: use parênteses; 3) `:.2f` nas duas linhas.
  5. **Passo 5 · Quiz · input** — 2 perguntas: tipo do que `input()` devolve (`str`); `int("3.5")` (ValueError).
  6. **Passo 6 · Exercício (código) · Idade em dias** — lê ano de nascimento e ano atual (inteiros), imprime `Você tem aproximadamente 7300 dias` (anos × 365). Verificação: `io` com dois cenários (`2006\n2026\n` → 7300; `2000\n2026\n` → 9490). Erradas: `float` gerando `7300.0`; subtrair na ordem errada (negativo). Dicas: 1) use `int`; 2) idade = ano atual − ano de nascimento.
- **Erros comuns:** aritmética com texto; vírgula decimal.

### n1-m2-06-erros-comuns-e-depuracao · Erros comuns e depuração

- **Arquivo:** `02-primeiros-passos-em-python/06-erros-comuns-e-depuracao.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Reconhecer SyntaxError, NameError e TypeError pela mensagem e pela causa típica · Localizar a linha do erro usando o número informado pelo Python · Consertar programas curtos com um erro de cada tipo
- **Conceitos:** `SyntaxError`, `NameError`, `TypeError`; linha e seta da mensagem; `print` para inspecionar.
- **Passos (5):**
  1. **Passo 1 · Leitura · Três erros que todo mundo comete** — uma mensagem real de cada erro, com a linha e a seta anotadas; "leia a última linha primeiro". **Mermaid:** `flowchart TD` de escolha — `{"alguma linha chegou a rodar?"}` —não→ `"SyntaxError: o texto do programa está malformado"`; —sim→ `{"o que a última linha da mensagem diz?"}` → `"NameError: nome que não existe"` ou `"TypeError: operação entre tipos que não combinam"`.
  2. **Passo 2 · Exercício (código) · Bug de sintaxe** — programa de 4 linhas com aspas não fechadas. Verificação: `io` exato. Erradas: apagar a linha com erro; fechar com o tipo de aspa errado. Dicas: 1) a seta aponta onde o Python se perdeu; 2) conte as aspas da linha.
  3. **Passo 3 · Exercício (código) · Bug de nome** — `nome_completo` definido, `nome_compelto` usado. Verificação: `io` exato + `variable nome_completo`. Erradas: renomear a definição para o nome errado (a variável pedida some); criar uma segunda variável vazia com o nome errado. Dicas: 1) compare os dois nomes letra por letra; 2) corrija o uso, não a definição.
  4. **Passo 4 · Exercício (código) · Bug de tipo** — `idade = input()` seguido de `idade + 1`; saída `Ano que vem: 21`. Verificação: `io` com dois `stdin`. Erradas: `idade + "1"` (vira `201`); `int(idade + 1)` (o erro continua). Dicas: 1) `input()` devolve texto; 2) converta antes de somar.
  5. **Passo 5 · Quiz · Qual é o erro?** — 3 perguntas, um trecho de código em cada: qual erro ele gera (`SyntaxError`, `NameError`, `TypeError`). É aqui que entra "prever o erro", que não cabe em `Previsão`.
- **Erros comuns:** corrigir o sintoma; apagar o código com erro.

## Módulo 3 · Decisões: condicionais

Booleanos e comparações, if/elif/else, operadores lógicos, aninhamento e o mini-projeto da calculadora de IMC.

- **Recursos do módulo:** fluxograma Mermaid para cada forma de decisão (if/else, cadeia de elif, triagem aninhada, etapas do IMC); visualizador nas lições 02, 03 e 04 (ver qual bloco executa); `lacunas`/`ordenar` nas lições 01 a 03; `Previsão` nas lições 01 a 04; fórmula do IMC e a notação de intervalo.
- **Assets a criar:** nenhum.

### n1-m3-01-booleanos-e-comparacoes · Booleanos e comparações

- **Arquivo:** `03-decisoes-condicionais/01-booleanos-e-comparacoes.lvl.md` · lição guiada · 90 XP · 35 min
- **Objetivos:** Avaliar expressões com ==, !=, <, >, <= e >= e prever True ou False · Diferenciar = (atribuição) de == (comparação) · Guardar o resultado de uma comparação em uma variável booleana e usá-la
- **Conceitos:** `bool`, `== != < > <= >=`, comparação de strings, `=` vs `==`, variáveis booleanas, valores "falsos".
- **Passos (4):**
  1. **Passo 1 · Leitura · Perguntas com resposta sim ou não** — tabela dos seis operadores; `=` guarda, `==` pergunta; comparação de textos (ordem alfabética, maiúsculas contam); `5 == 5.0` e `"10" == 10`. Sem recurso de apresentação além da tabela.
  2. **Passo 2 · Previsão · Verdadeiro ou falso** — substitui o antigo exercício de imprimir oito comparações (era digitar e rodar; agora o aluno prevê). Dicas: 1) texto e número nunca são iguais; 2) maiúscula e minúscula são letras diferentes; 3) `>=` aceita o igual.
     ```python
     print(5 > 3)
     print(5 == 5.0)
     print("a" < "b")
     print("Ana" == "ana")
     print(10 != 10)
     print(3 >= 3)
     print("10" == 10)
     print(len("abc") == 3)
     ```
     ```text
     True
     True
     True
     False
     False
     True
     False
     True
     ```
  3. **Passo 3 · Exercício (lacunas) · Flags** — `idade = 16`, `saldo = 50.0`, `preco = 49.9`. Instruções: 1) `pode_votar` é verdadeiro a partir dos 16; 2) `pode_comprar` é verdadeiro quando o saldo cobre o preço; 3) `eh_adulto` é verdadeiro a partir dos 18. Verificação: `variable` × 3 com `type: bool` (`True`, `True`, `False`). Erradas: `pode_votar = "True"` (texto); `idade > 16` em vez de `>=` (dá `False` na borda). Dicas: 1) a comparação já devolve `True` ou `False`; 2) "a partir de" inclui o próprio valor.
     ```python
     idade = 16
     saldo = 50.0
     preco = 49.9
     pode_votar = idade ___ 16
     pode_comprar = ___ >= ___
     eh_adulto = idade ___ ___
     ```
  4. **Passo 4 · Quiz · Comparações** — 3 perguntas: `"a" < "b"`; `5 == 5.0`; diferença entre `=` e `==`.
- **Erros comuns:** `if x = 5`; `"10" == 10`; maiúsculas.
- **Nota:** o plano antigo usava `idade = 17`; aqui o código inicial usa `idade = 16` para que a solução errada com `>` reprove.

### n1-m3-02-if-e-else · if e else

- **Arquivo:** `03-decisoes-condicionais/02-if-e-else.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Escrever um if/else com indentação correta e prever qual bloco executa · Explicar por que a indentação faz parte da sintaxe do Python · Resolver problemas de duas saídas (par/ímpar, aprovado/reprovado, maior de dois)
- **Conceitos:** `if cond:`, bloco indentado, `else`, dois-pontos, fluxograma, `def` + `return` mínimo.
- **Passos (6):**
  1. **Passo 1 · Leitura · Dois caminhos** — `if`, dois-pontos, bloco indentado, `else`; a linha fora do bloco roda sempre; apresentação mínima de `def` + `return` ("uma receita com nome que devolve um valor"). **Mermaid:** `flowchart TD` — `{"nota >= 6?"}` —sim→ `"situacao = Aprovado"`; —não→ `"situacao = Reprovado"`; os dois → `"print(situacao)"`. **Visualizar** (o aluno troca a nota e vê o outro caminho):
     ```python
     nota = 5.5
     if nota >= 6:
         situacao = "Aprovado"
     else:
         situacao = "Reprovado"
     print(situacao)
     ```
  2. **Passo 2 · Exercício (ordenar) · Par ou ímpar** — lê um inteiro e imprime `par` ou `ímpar`. Instruções: 1) leia o número; 2) teste o resto da divisão por 2; 3) imprima `par` em um caminho e `ímpar` no outro, com a indentação certa. Solução (5 linhas): `n = int(input())`, `if n % 2 == 0:`, `    print("par")`, `else:`, `    print("ímpar")`. Distratores: `if n % 2 = 0:`. Verificação: `io` com `stdin` 4, 7 e 0; `source uses if`. Erradas: `n % 2 == 1` no `if` com as saídas na mesma ordem (inverte); sem `else` (nada impresso no ímpar). Dicas: 1) `% 2` dá 0 nos pares; 2) o que está dentro do `if` e do `else` fica um nível à direita.
  3. **Passo 3 · Previsão · Qual bloco executa** — Dicas: 1) só um dos dois blocos roda; 2) a última linha não está indentada.
     ```python
     idade = 16
     if idade >= 18:
         print("Pode dirigir")
     else:
         print("Não pode dirigir")
     print("Fim")
     ```
     ```text
     Não pode dirigir
     Fim
     ```
  4. **Passo 4 · Exercício (código) · Maior de dois** — `def maior(a, b)` devolvendo o maior (o esqueleto do `def` vem no código inicial com `pass`). Verificação: `call` (3, 5), (9, 2), (4, 4), (-1, -5). Erradas: `print` em vez de `return` (devolve `None`); devolver sempre `a`. Dicas: 1) `return` entrega o valor a quem chamou; 2) compare `a` com `b` no `if`.
  5. **Passo 5 · Quiz · if e else** — 2 perguntas: o que falta em `if x > 5` (dois-pontos); quando roda a linha que está fora do bloco (sempre).
  6. **Passo 6 · Exercício (código) · Aprovação** — lê a nota (float) e imprime `Aprovado` se ≥ 6.0, senão `Reprovado`. Verificação: `io` com 6.0, 5.9, 9.5. Erradas: `> 6` (reprova quem tirou 6); `int(input())` (falha com 5.9). Dicas: 1) a borda 6.0 é aprovada; 2) a nota pode ter casas decimais.
- **Erros comuns:** indentação, `else` com condição.

### n1-m3-03-elif-e-cadeias-de-decisao · elif e cadeias de decisão

- **Arquivo:** `03-decisoes-condicionais/03-elif-e-cadeias-de-decisao.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Escrever cadeias if/elif/else com várias faixas de valores · Explicar por que a ordem das condições muda o resultado · Converter uma tabela de faixas (nota, idade, temperatura) em código
- **Conceitos:** `elif`, só o primeiro verdadeiro executa, ordem das faixas, `else` como resto.
- **Passos (6):**
  1. **Passo 1 · Leitura · Mais de dois caminhos** — `elif`; só o primeiro bloco verdadeiro roda; tabela de faixas (nota → conceito) ao lado do código. **Mermaid:** `flowchart TD` em cascata — `{"nota >= 9?"}` —sim→ `"A"`; —não→ `{"nota >= 7?"}` —sim→ `"B"`; —não→ `{"nota >= 5?"}` —sim→ `"C"`; —não→ `"D"`. **Visualizar** (faixas de frete, para não entregar o exercício do conceito):
     ```python
     distancia = 12
     if distancia <= 5:
         frete = 5.0
     elif distancia <= 20:
         frete = 12.0
     else:
         frete = 25.0
     print(frete)
     ```
  2. **Passo 2 · Previsão · A ordem importa** — antes da explicação de por que se começa pela faixa mais alta. Dicas: 1) o Python para no primeiro teste verdadeiro; 2) 9.5 também é maior que 5.
     ```python
     nota = 9.5
     if nota >= 5:
         conceito = "C"
     elif nota >= 7:
         conceito = "B"
     elif nota >= 9:
         conceito = "A"
     else:
         conceito = "D"
     print(conceito)
     ```
     ```text
     C
     ```
  3. **Passo 3 · Exercício (lacunas) · Conceito** — `conceito(nota)`: ≥ 9 `"A"`, ≥ 7 `"B"`, ≥ 5 `"C"`, senão `"D"`. Instruções: 1) complete a faixa do `"A"`; 2) complete a palavra que encadeia a segunda condição; 3) complete a faixa e o retorno do `"C"`. Verificação: `call` com 10, 9, 8.99, 7, 6.5, 5, 4.9, 0. Erradas: `if`s independentes atribuindo a uma variável (o último vence); faixas em ordem crescente com `>=` (tudo ≥ 5 vira `"C"`). Dicas: 1) comece pela faixa mais alta; 2) `elif` só é testado se os anteriores falharam.
     ```python
     def conceito(nota):
         if nota >= ___:
             return "A"
         ___ nota >= 7:
             return "B"
         elif nota >= ___:
             return ___
         else:
             return "D"
     ```
  4. **Passo 4 · Exercício (código) · Temperatura** — lê float; `< 15` imprime `frio`, `< 28` imprime `agradável`, senão `quente`. Verificação: `io` com 10, 15, 27.9, 28. Erradas: `<= 15` (15 vira frio); três `if` independentes (10 imprime duas linhas). Dicas: 1) use `elif` para a segunda faixa; 2) 15 já é agradável.
  5. **Passo 5 · Quiz · Cadeias** — 3 perguntas: "o que imprime" com faixas em ordem errada; `elif` sem `if` antes (SyntaxError); quantos blocos de uma cadeia podem rodar (um).
  6. **Passo 6 · Exercício (código) · Ingresso** — `preco_ingresso(idade)`: negativo → `None`; até 12 → 20.0; 13–59 → 40.0; 60+ → 20.0. Verificação: `call` com -1, 0, 12, 13, 59, 60. Erradas: esquecer o negativo (devolve 20.0); `< 12` (12 anos paga inteira). Dicas: 1) trate o valor inválido primeiro; 2) confira as bordas 12, 13, 59 e 60.
- **Erros comuns:** vários `if`, sobreposição, borda.

### n1-m3-04-and-or-not-e-aninhamento · and, or, not e aninhamento

- **Arquivo:** `03-decisoes-condicionais/04-and-or-not-e-aninhamento.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Combinar comparações com and, or e not e prever o resultado pela tabela-verdade · Usar in para testar se um valor está em um texto ou lista · Decidir entre aninhar ifs e combinar condições, mantendo o código legível
- **Conceitos:** `and`, `or`, `not`, precedência, `in`, `0 <= x <= 10`, aninhamento, curto-circuito.
- **Passos (6):**
  1. **Passo 1 · Leitura · Juntando condições** — tabelas-verdade de `and`, `or` e `not` em Markdown; precedência (`not`, depois `and`, depois `or`); `in`; comparação encadeada. **Fórmula:** o intervalo `$0 \le x \le 10$` da matemática ao lado de `0 <= x <= 10` e de `x >= 0 and x <= 10`.
  2. **Passo 2 · Previsão · Expressões lógicas** — substitui o antigo exercício de imprimir seis expressões. Dicas: 1) resolva primeiro o `not`, depois o `and`, por último o `or`; 2) `0 < 5 < 3` são duas comparações ligadas por `and`.
     ```python
     print(True and False)
     print(not True or True)
     print(5 > 3 and 2 > 1)
     print("a" in "casa")
     print(not (1 == 1))
     print(0 < 5 < 3)
     ```
     ```text
     False
     True
     True
     True
     False
     False
     ```
  3. **Passo 3 · Exercício (código) · Regras** — `pode_dirigir(idade, tem_cnh)` (≥ 18 e CNH) e `ano_bissexto(ano)` (divisível por 4 e não por 100, ou divisível por 400). Verificação: `call` com (18, True), (18, False), (17, True); 1900, 2000, 2024, 2023. Erradas: bissexto só com `% 4` (1900 passa); `or` no lugar de `and` em `pode_dirigir`. Dicas: 1) escreva a regra em português primeiro; 2) use parênteses para separar as duas partes do bissexto.
  4. **Passo 4 · Leitura · Aninhar ou combinar?** — `if` dentro de `if`; quando um `and` deixa mais claro; no máximo dois níveis. **Mermaid:** `flowchart TD` da triagem — `{"gravidade alta?"}` —sim→ `"prioridade 1"`; —não→ `{"idade >= 60 ou idade < 2?"}` —sim→ `"prioridade 2"`; —não→ `"prioridade 3"`. **Visualizar** (aninhado, com outro tema, para ver o `else` interno):
     ```python
     chovendo = True
     tem_guarda_chuva = False
     if chovendo:
         if tem_guarda_chuva:
             plano = "vou a pé"
         else:
             plano = "vou de ônibus"
     else:
         plano = "vou de bicicleta"
     print(plano)
     ```
  5. **Passo 5 · Exercício (código) · Triagem** — `prioridade(idade, gravidade)`: gravidade `"alta"` → 1; senão idade ≥ 60 ou < 2 → 2; senão 3. Verificação: `call` com 6 casos (`(30, "alta")`, `(70, "alta")`, `(70, "baixa")`, `(1, "baixa")`, `(60, "media")`, `(30, "baixa")`). Erradas: `idade > 60` (60 anos cai em 3); aninhado sem o `else` interno (devolve `None`). Dicas: 1) trate o caso mais urgente primeiro; 2) toda combinação precisa chegar a um `return`.
  6. **Passo 6 · Quiz · Lógica** — 3 perguntas: por que `x == 1 or 2` é sempre verdadeiro; uma linha da tabela do `and`; quando aninhar e quando usar `and`.
- **Erros comuns:** `or 2`, parênteses, aninhamento profundo.

### n1-m3-05-mini-projeto-calculadora-de-imc · Mini-projeto: calculadora de IMC

- **Arquivo:** `03-decisoes-condicionais/05-mini-projeto-calculadora-de-imc.lvl.md` · lição guiada · 150 XP · 90 min
- **Objetivos:** Dividir um problema em funções pequenas (calcular, classificar, formatar) · Validar entradas e dar mensagens claras para valores inválidos · Entregar um programa que passa em todos os casos de verificação do enunciado
- **Conceitos:** decomposição em funções, validação, arredondamento, bordas de faixas, formato de saída.
- **Passos (6):** mini-projeto — só exercícios de código livre, sem `Previsão`.
  1. **Passo 1 · Leitura · O que você vai construir** — especificação completa, tabela de faixas e 4 exemplos de entrada e saída. **Fórmula:** `$$\text{IMC} = \frac{\text{peso}}{\text{altura}^2}$$` com o exemplo `$\dfrac{70}{1{,}75^2} \approx 22{,}9$` (peso em kg, altura em metros). **Mermaid:** `flowchart TD` das etapas — `"ler peso e altura"` → `{"entrada_valida?"}` —não→ `"Entrada inválida."`; —sim→ `"calcular_imc"` → `"classificar_imc"` → `"imprimir IMC e faixa"`.
  2. **Passo 2 · Exercício (código) · calcular_imc(peso, altura)** — devolve `round(peso / altura ** 2, 1)`. Verificação: `call` (70, 1.75) → 22.9, (90, 1.8) → 27.8, (58, 1.62) → 22.1, com `tolerance 0.001`. Erradas: `peso / altura * 2` (sem elevar ao quadrado); sem arredondar (22.857 reprova com a tolerância pequena). Dicas: 1) a altura é elevada ao quadrado com `** 2`; 2) `round(x, 1)` deixa uma casa.
  3. **Passo 3 · Exercício (código) · classificar_imc(imc)** — `< 18.5` `"abaixo do peso"`, `< 25` `"peso normal"`, `< 30` `"sobrepeso"`, senão `"obesidade"`. Verificação: `call` com 18.4, 18.5, 24.9, 25.0, 29.9, 30.0. Erradas: `<=` nas faixas (18.5 vira abaixo do peso); faixas em `if` independentes. Dicas: 1) a borda pertence à faixa de cima; 2) use `elif`.
  4. **Passo 4 · Exercício (código) · entrada_valida(peso, altura)** — `True` se `0 < peso <= 400` e `0.5 <= altura <= 2.6`. Verificação: `call` com 6 casos (altura 175 → False; peso 0 → False; peso 400 → True). Erradas: validar só o peso (altura em centímetros passa); `or` no lugar de `and`. Dicas: 1) altura em metros é menor que 3; 2) as duas condições precisam valer ao mesmo tempo.
  5. **Passo 5 · Exercício (código) · Programa principal** — lê peso e altura (floats), imprime `Entrada inválida.` ou `IMC: 22.9 - peso normal`. Verificação: `io` × 4 (`70\n1.75`, `90\n1.8`, `70\n175`, `-5\n1.7`). Erradas: calcular antes de validar; IMC com duas casas (`22.86`). Dicas: 1) valide antes de calcular; 2) chame as três funções que você já escreveu.
  6. **Passo 6 · Quiz · Revisão do módulo** — 3 perguntas: ordem das faixas; `and` em validação; `elif` contra `if` independentes.
- **Erros comuns:** `altura * 2`; `>=` vs `>`; conversão da entrada.

## Módulo 4 · Repetição: laços

while, for e range, acumuladores, break e continue, laços aninhados, padrões de contagem e busca, e o jogo de adivinhação.

- **Recursos do módulo:** visualizador em toda lição de conceito (01 a 06) — é o módulo em que ver o estado mudar mais ajuda; `Previsão` nas lições 01 a 06; `lacunas`/`ordenar` nas lições 01 a 04; fluxogramas do `while`, do `while True` + `break`, da busca e do jogo; fórmulas da soma de 1 a n, da média, dos juros compostos, do fatorial e de n × m.
- **Assets a criar:** nenhum.

### n1-m4-01-while · Repetição com while

- **Arquivo:** `04-repeticao-lacos/01-while.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Escrever um while com variável de controle, condição e atualização · Prever quantas vezes um laço executa fazendo o teste de mesa · Identificar e corrigir um laço infinito
- **Conceitos:** `while cond:`, inicialização/condição/atualização, teste de mesa por iteração, laço infinito, sentinela.
- **Passos (6):**
  1. **Passo 1 · Leitura · Um if que volta** — as três partes (inicialização, condição, atualização); teste de mesa em tabela (uma linha por volta); laço infinito e por que o Executar para por tempo. **Mermaid:** `flowchart TD` — `"i = 1"` → `{"i <= 3?"}` —sim→ `"print(i)"` → `"i += 1"` → volta à decisão; —não→ `"print fim"`. **Visualizar:**
     ```python
     i = 1
     while i <= 3:
         print(i)
         i += 1
     print("fim")
     ```
  2. **Passo 2 · Previsão · Quantas voltas?** — Dicas: 1) anote o valor de `i` a cada volta; 2) o laço para quando a condição fica falsa, e `i` guarda o valor que a tornou falsa.
     ```python
     i = 0
     while i < 5:
         print(i)
         i += 2
     print("i vale", i)
     ```
     ```text
     0
     2
     4
     i vale 6
     ```
  3. **Passo 3 · Exercício (lacunas) · De 1 a 10** — imprime 1 a 10, um por linha. Instruções: 1) comece o contador no primeiro número a imprimir; 2) complete a condição para o 10 ser impresso; 3) complete a atualização. Verificação: `io` exato; `source uses while`; `source not_uses for`. Erradas: começar em 0 (imprime 0 a 10); `i < 10` (para no 9). Dicas: 1) o primeiro número impresso é 1; 2) `<=` inclui o 10; 3) sem atualização o laço não termina.
     ```python
     i = ___
     while i ___ 10:
         print(i)
         i ___ 1
     ```
  4. **Passo 4 · Exercício (ordenar) · Contagem regressiva** — lê `n`, imprime de `n` até 1 e depois `Fogo!`. Instruções: 1) leia `n`; 2) repita enquanto `n` for pelo menos 1, imprimindo e diminuindo; 3) imprima `Fogo!` uma vez, depois do laço. Solução (5 linhas): `n = int(input())`, `while n >= 1:`, `    print(n)`, `    n -= 1`, `print("Fogo!")`. Distratores: `n += 1`, `while n > 1:`. Verificação: `io` com 3 e com 1. Erradas: `print("Fogo!")` dentro do laço; `while n > 1` (não imprime o 1). Dicas: 1) o que se repete fica indentado; 2) `Fogo!` aparece uma vez só.
  5. **Passo 5 · Quiz · while** — 3 perguntas: quantas voltas dá `i = 0; while i < 5: i += 2` (3); o que falta num laço que nunca termina (a atualização); diferença entre `while` e `if`.
  6. **Passo 6 · Exercício (código) · Soma até zero** — primeiro código livre do módulo. Lê inteiros até 0 e imprime `Soma: X`. Verificação: `io` com `5\n3\n0` (8) e `0` (0). Erradas: ler só uma vez, fora do laço (laço infinito ou soma errada); imprimir a soma dentro do laço. Dicas: 1) leia o primeiro número antes do `while`; 2) leia o próximo no fim de cada volta; 3) o `print` vem depois do laço.
- **Erros comuns:** não atualizar; `=` na condição; off-by-one.

### n1-m4-02-for-e-range · for e range

- **Arquivo:** `04-repeticao-lacos/02-for-e-range.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Usar range com um, dois e três argumentos e prever a sequência gerada · Escolher entre for e while conforme o problema · Percorrer os caracteres de uma string com for
- **Conceitos:** `range(n)`, `range(a, b)`, `range(a, b, passo)`, passo negativo, `for` sobre string, `list(range())`.
- **Passos (6):**
  1. **Passo 1 · Leitura · Repetir uma quantidade conhecida** — tabela `range(...)` × sequência gerada (cinco linhas); fim exclusivo; `for` sobre texto; quando escolher `for` ou `while`. **Visualizar:**
     ```python
     for i in range(2, 11, 4):
         print(i)
     for letra in "USP":
         print(letra)
     ```
  2. **Passo 2 · Previsão · O que o range gera** — Dicas: 1) o fim nunca é incluído; 2) com passo negativo a sequência desce.
     ```python
     for i in range(3):
         print(i)
     for i in range(10, 0, -3):
         print(i)
     ```
     ```text
     0
     1
     2
     10
     7
     4
     1
     ```
  3. **Passo 3 · Exercício (lacunas) · Pares e regressiva** — imprime os pares de 2 a 20 e depois de 10 a 1. Instruções: 1) complete o primeiro `range` (começo, fim, passo) para 2, 4, …, 20; 2) complete o segundo para 10, 9, …, 1. Verificação: `io` exato; `source uses for`. Erradas: `range(2, 20, 2)` (para em 18); `range(10, 1, -1)` (para em 2). Dicas: 1) o fim é exclusivo: pare um passo depois do último; 2) para descer, o passo é negativo.
     ```python
     for i in range(___, ___, ___):
         print(i)
     for i in range(___, ___, ___):
         print(i)
     ```
  4. **Passo 4 · Exercício (código) · soma_ate(n)** — soma 1..n com `for`. **Fórmula:** no enunciado, como conferência, `$$1 + 2 + \dots + n = \frac{n(n+1)}{2}$$` (para 100 dá 5050) — a função deve usar o laço, não a fórmula. Verificação: `call` 1, 5, 100, 0 (→ 0); `source uses for`; `source not_uses while`. Erradas: `range(n)` (soma até n − 1); `range(1, n)`. Dicas: 1) comece o total em 0; 2) `range(1, n + 1)` inclui o n.
  5. **Passo 5 · Quiz · range** — 3 perguntas: `list(range(5))`; `list(range(1, 10, 3))`; última linha impressa por `for i in range(3): print(i)`.
  6. **Passo 6 · Exercício (código) · conta_vogais(palavra)** — `for letra in palavra`, conta `aeiou` em minúsculas e maiúsculas. Verificação: `call` `"banana"` → 3, `"PYTHON"` → 1, `""` → 0. Erradas: só minúsculas (`"PYTHON"` → 0); devolver dentro do laço na primeira vogal. Dicas: 1) `letra.lower() in "aeiou"`; 2) o `return` vem depois do laço.
- **Erros comuns:** fim exclusivo; `range(len())` desnecessário.

### n1-m4-03-acumuladores-e-contadores · Acumuladores e contadores

- **Arquivo:** `04-repeticao-lacos/03-acumuladores-e-contadores.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Implementar somatório, contagem e média com acumuladores inicializados corretamente · Encontrar o maior e o menor valor de uma sequência sem usar max() e min() · Explicar onde inicializar o acumulador e por que
- **Conceitos:** acumulador fora do laço, `+=`, contador, média, maior/menor com primeiro elemento, acumulador de texto.
- **Passos (7):**
  1. **Passo 1 · Leitura · Guardar entre uma volta e outra** — acumulador de soma, contador, média; por que a variável nasce antes do laço; lista apresentada só como "valores entre colchetes" (o módulo 5 aprofunda). **Fórmula:** `$$\bar{x} = \frac{x_1 + x_2 + \dots + x_n}{n}$$`. **Visualizar** ("veja `total` e `contador` crescerem a cada volta"):
     ```python
     notas = [7, 8, 7.5]
     total = 0
     contador = 0
     for nota in notas:
         total += nota
         contador += 1
     print(total / contador)
     ```
  2. **Passo 2 · Previsão · Onde o acumulador começa** — o erro clássico, antes de ser explicado. Dicas: 1) a linha `total = 0` está dentro do laço: ela roda em toda volta; 2) só a última volta sobrevive.
     ```python
     for i in range(1, 4):
         total = 0
         total += i
     print(total)
     ```
     ```text
     3
     ```
  3. **Passo 3 · Exercício (lacunas) · Média das notas** — lê `n` e depois `n` notas; imprime `Média: 7.50`. Instruções: 1) comece o acumulador; 2) repita `n` vezes somando cada nota; 3) divida pelo número de notas. Verificação: `io` com `3\n7\n8\n7.5` (`Média: 7.50`) e `1\n10` (`Média: 10.00`). Erradas: `total = 0` dentro do laço; dividir por `n + 1`. Dicas: 1) o acumulador de soma começa em 0; 2) o laço roda `n` vezes; 3) a média divide pela quantidade lida.
     ```python
     n = int(input())
     total = ___
     for i in range(___):
         nota = float(input())
         total ___ nota
     print(f"Média: {total / ___:.2f}")
     ```
  4. **Passo 4 · Exercício (código) · Maior e menor** — `maior_de(lista)` e `menor_de(lista)` sem `max`/`min`. Verificação: `call` com `[3, -7, 12, 0]`, `[-5, -2]`, `[4]`; `source not_calls max`, `not_calls min`. Erradas: `maior = 0` (falha com `[-5, -2]`); comparação invertida em `menor_de`. Dicas: 1) comece com o primeiro elemento da lista; 2) troque o candidato só quando achar um melhor.
  5. **Passo 5 · Quiz · Acumuladores** — 2 perguntas: onde inicializar o acumulador; por que `maior = 0` falha com negativos.
  6. **Passo 6 · Leitura · Acumulador de produto: juros e fatorial** — o mesmo padrão com multiplicação: o valor neutro é 1, não 0. **Fórmula:** juros compostos `$$M_n = C \cdot (1 + i)^n$$` (o saldo de cada mês é o do mês anterior vezes `$1 + i$`) e o fatorial `$n! = 1 \cdot 2 \cdot 3 \cdots n$`. **Visualizar** (R\$ 1000 a 1 % ao mês, três meses):
     ```python
     saldo = 1000.0
     for mes in range(1, 4):
         saldo = saldo * 1.01
         print(mes, round(saldo, 2))
     ```
  7. **Passo 7 · Exercício (código) · Fatorial iterativo** — `fatorial(n)` com produto acumulado. Verificação: `call` 0 → 1, 1 → 1, 5 → 120, 10 → 3628800; `source uses for`. Erradas: produto começando em 0 (sempre 0); `range(1, n)` (falta o n). Dicas: 1) o produto começa em 1; 2) `range(1, n + 1)` inclui o n; 3) com `n = 0` o laço não roda e a resposta já é 1.
- **Erros comuns:** inicialização, divisão por zero.
- **Nota:** o passo 6 (leitura curta) é novo: ele abriga os juros compostos pedidos na diretriz e prepara o fatorial.

### n1-m4-04-break-e-continue · break e continue

- **Arquivo:** `04-repeticao-lacos/04-break-e-continue.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Usar break para encerrar um laço antes da condição e continue para pular uma iteração · Escrever o padrão while True + break para repetir até uma entrada válida · Reescrever um laço com flag booleana usando break e vice-versa
- **Conceitos:** `break`, `continue`, `while True` + `break`, validação de entrada, flag vs `break`.
- **Passos (6):**
  1. **Passo 1 · Leitura · Sair antes e pular a vez** — `break`, `continue`, `while True` + `break`; a mesma busca com flag e com `break`. **Mermaid:** `flowchart TD` do `while True` — `"ler a nota"` → `{"entre 0 e 10?"}` —não→ `"Nota inválida, tente de novo."` → volta a ler; —sim→ `"break"` → `"Nota registrada"`. **Visualizar** (só `break`):
     ```python
     numeros = [4, 7, 10, 3]
     for n in numeros:
         if n > 8:
             print("achei", n)
             break
         print("passei por", n)
     ```
  2. **Passo 2 · Previsão · Pula ou sai?** — Dicas: 1) `continue` pula só a volta atual; 2) `break` encerra o laço inteiro.
     ```python
     for i in range(1, 10):
         if i == 3:
             continue
         if i == 6:
             break
         print(i)
     ```
     ```text
     1
     2
     4
     5
     ```
  3. **Passo 3 · Exercício (ordenar) · Até digitar fim** — lê linhas até `fim`; imprime `Lidos: N` (o `fim` não conta). Instruções: 1) comece o contador; 2) repita para sempre, lendo uma linha por volta; 3) saia quando a linha for `fim`, antes de contar; 4) imprima o total depois do laço. Solução (7 linhas): `lidos = 0`, `while True:`, `    linha = input()`, `    if linha == "fim":`, `        break`, `    lidos += 1`, `print(f"Lidos: {lidos}")`. Distratores: `continue`, `lidos = 1`. Verificação: `io` com `a\nb\nfim` (`Lidos: 2`) e `fim` (`Lidos: 0`). Erradas: contar antes de testar (conta o `fim`); `print` dentro do laço. Dicas: 1) teste antes de contar; 2) o `break` fica dois níveis à direita, dentro do `if`.
  4. **Passo 4 · Exercício (código) · Pulando múltiplos de 3** — imprime 1 a 20 pulando os múltiplos de 3, com `continue`. Verificação: `io` exato; `source uses for`. Erradas: condição invertida (imprime só os múltiplos); `break` no lugar de `continue` (para no 2). Dicas: 1) `i % 3 == 0` identifica o múltiplo; 2) o `print` vem depois do `if`.
  5. **Passo 5 · Quiz · break e continue** — 3 perguntas: de qual laço o `break` sai (do mais interno); o que acontece com `continue` antes de `i += 1` num `while` (laço infinito); `break` fora de laço (SyntaxError).
  6. **Passo 6 · Exercício (código) · Nota válida** — pede até receber um número entre 0 e 10; para inválidos imprime `Nota inválida, tente de novo.`; ao final `Nota registrada: 8.5`. Verificação: `io` com `11\n-1\n8.5` e com `10`. Erradas: aceitar 11 (`<= 11`); não repetir (um `if` em vez de laço). Dicas: 1) `while True` e `break` quando a nota for válida; 2) a mensagem de erro fica no caminho do inválido; 3) 0 e 10 são válidos.
- **Erros comuns:** `break` no `if` sem laço; laço infinito com `continue`.

### n1-m4-05-lacos-aninhados · Laços aninhados

- **Arquivo:** `04-repeticao-lacos/05-lacos-aninhados.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Escrever laços aninhados e prever a ordem em que os pares (i, j) aparecem · Calcular quantas vezes o bloco interno executa · Montar saídas em grade (tabuada, triângulo de asteriscos) com print e end
- **Conceitos:** laço interno roda inteiro por iteração do externo, pares `(i, j)`, `end=" "`, contagem n × m.
- **Passos (6):**
  1. **Passo 1 · Leitura · Um laço dentro do outro** — o interno roda inteiro a cada volta do externo; tabela dos pares `(i, j)`; `end=""` e `print()` para montar grades. **Fórmula:** externo com `$n$` voltas e interno com `$m$` voltas executam o bloco `$n \times m$` vezes (`$3 \times 4 = 12$`). **Visualizar** ("repare que `j` recomeça toda vez que `i` muda"):
     ```python
     for i in range(1, 3):
         for j in range(1, 4):
             print(i, j)
     ```
  2. **Passo 2 · Previsão · Linha por linha** — Dicas: 1) `end=" "` mantém a escrita na mesma linha; 2) o `print()` sem nada fecha a linha a cada volta do laço de fora.
     ```python
     for i in range(2):
         for j in range(3):
             print(i + j, end=" ")
         print()
     ```
     ```text
     0 1 2
     1 2 3
     ```
  3. **Passo 3 · Exercício (código) · Tabuada do 1 ao 3** — formato `1 x 1 = 1` … até `x 10`, com uma linha em branco entre as tabuadas (layout completo no enunciado). Verificação: `io` com `match: exact`. Erradas: sem a linha em branco entre as tabuadas; a mesma variável nos dois laços. Dicas: 1) laço de fora = a tabuada, laço de dentro = o multiplicador; 2) o `print()` vazio fica no laço de fora.
  4. **Passo 4 · Exercício (código) · Triângulo** — lê `n` e imprime linhas com 1, 2, …, n asteriscos. Verificação: `io` com 3 e com 1. Erradas: `range(n)` (primeira linha vazia e falta a última); `n` asteriscos em todas as linhas. Dicas: 1) a linha `i` tem `i` asteriscos; 2) `"*" * i` ou um laço interno com `end=""`.
  5. **Passo 5 · Quiz · Aninhados** — 3 perguntas: ordem dos pares `(i, j)`; quantas vezes o bloco interno roda em 3 × 4 (12); o que imprime um trecho curto.
  6. **Passo 6 · Exercício (código) · pares_que_somam(lista, alvo)** — conta os pares de posições `i < j` cuja soma é o alvo. Verificação: `call` `([1, 2, 3, 4], 5)` → 2, `([2, 2, 2], 4)` → 3, `([], 1)` → 0. Erradas: contar `(i, j)` e `(j, i)` (dobro); incluir `i == j`. Dicas: 1) percorra as posições com `range(len(lista))`; 2) o laço de dentro começa em `i + 1`.
- **Erros comuns:** mesma variável nos dois laços; `end`.

### n1-m4-06-padroes-de-busca-e-contagem · Padrões de busca e contagem

- **Arquivo:** `04-repeticao-lacos/06-padroes-de-busca-e-contagem.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Implementar busca do primeiro elemento que satisfaz uma condição, com flag ou break · Contar ocorrências e verificar 'todos' e 'algum' com laços · Reconhecer esses padrões em problemas novos e escolher o adequado
- **Conceitos:** flag existe?, primeiro índice com `break`, contador com `if`, todos/algum, `eh_primo`.
- **Passos (6):**
  1. **Passo 1 · Leitura · Quatro padrões que se repetem** — existe algum?, onde está o primeiro?, quantos são?, todos são?; tabela padrão × valor inicial × o que muda no laço. **Mermaid:** `flowchart TD` da busca — `"posição = -1"` → `{"ainda há itens?"}` —sim→ `{"o item serve?"}` —sim→ `"guardar a posição e parar"`; —não→ `"próximo item"` → volta; `{"ainda há itens?"}` —não→ `"devolver a posição"`. **Visualizar** (padrão "algum", com flag):
     ```python
     numeros = [3, 8, -2, 5]
     tem_negativo = False
     for n in numeros:
         if n < 0:
             tem_negativo = True
             break
     print(tem_negativo)
     ```
  2. **Passo 2 · Exercício (código) · primeiro_negativo(lista)** — índice do primeiro negativo ou −1. Verificação: `call` `[3, -1, -5]` → 1, `[1, 2]` → −1, `[]` → −1. Erradas: devolver o valor em vez do índice; devolver o último negativo (sem parar). Dicas: 1) percorra as posições com `range(len(lista))`; 2) pare assim que achar; 3) se o laço terminar sem achar, a resposta é −1.
  3. **Passo 3 · Previsão · O return apressado** — antes do exercício de "todos". Dicas: 1) `return` encerra a função na hora; 2) a função decide olhando só o primeiro item.
     ```python
     def todos_pares(lista):
         for n in lista:
             if n % 2 == 0:
                 return True
             else:
                 return False

     print(todos_pares([2, 3, 5]))
     print(todos_pares([1, 2, 4]))
     ```
     ```text
     True
     False
     ```
  4. **Passo 4 · Exercício (código) · conta_pares e todos_positivos** — Verificação: `call` `conta_pares([2, 3, 4])` → 2, `conta_pares([])` → 0; `todos_positivos([1, 2, 3])` → True, `[1, -2]` → False, `[]` → True (a lista vazia é explicada no enunciado: nenhum item contraria a regra). Erradas: `return True` dentro do laço; `todos_positivos([])` devolvendo False. Dicas: 1) só dá para dizer "todos" depois de ver todos; 2) um único item que falha já decide o `False`.
  5. **Passo 5 · Quiz · Padrões** — 3 perguntas: valor inicial da flag em "todos" (True); o que o `break` faz na busca; diferença entre contador e acumulador.
  6. **Passo 6 · Exercício (código) · eh_primo(n)** — testa divisores de 2 a n − 1 e para no primeiro. Verificação: `call` 0 → False, 1 → False, 2 → True, 9 → False, 17 → True, 25 → False. Erradas: `eh_primo(1)` devolvendo True; decidir pelo primeiro divisor testado (9 vira primo porque 2 não divide). Dicas: 1) números menores que 2 não são primos; 2) achou um divisor, não é primo; 3) só depois do laço dá para devolver True.
- **Erros comuns:** retorno precoce; lista vazia.

### n1-m4-07-projeto-jogo-de-adivinhacao · Mini-projeto: jogo de adivinhação

- **Arquivo:** `04-repeticao-lacos/07-projeto-jogo-de-adivinhacao.lvl.md` · lição guiada · 150 XP · 90 min
- **Objetivos:** Montar um jogo completo combinando while, if/elif/else, contadores e validação de entrada · Separar a regra (avaliar um palpite) da interação (ler e imprimir) · Usar o módulo random com semente fixa para obter resultados reproduzíveis
- **Conceitos:** `random.randint`, `random.seed`, regra vs interação, tentativas, validação.
- **Passos (6):** mini-projeto — só exercícios de código livre; sem `Previsão` e sem visualizador (o jogo usa `input()` e `random`).
  1. **Passo 1 · Leitura · As regras do jogo** — regras, mensagens exatas e 3 partidas de exemplo (entrada e saída completas). **Mermaid:** `flowchart TD` do jogo — `"sortear o segredo"` → `{"ainda há tentativas?"}` —não→ `"Você perdeu."`; —sim→ `"ler o palpite"` → `{"entre 1 e 100?"}` —não→ `"avisar e pedir de novo"` → volta; —sim→ `{"acertou?"}` —sim→ `"Acertou em N tentativas!"`; —não→ `"dizer maior ou menor"` → volta.
  2. **Passo 2 · Exercício (código) · avaliar_palpite(palpite, segredo)** — `"maior"` se o segredo é maior que o palpite, `"menor"` se é menor, `"acertou"` se é igual. Verificação: `call` (50, 70) → `"maior"`, (80, 70) → `"menor"`, (70, 70) → `"acertou"`. Erradas: maior e menor invertidos; `"acertou"` só no `else` de um teste `>=` (70, 70 vira `"maior"`). Dicas: 1) a dica fala do segredo em relação ao palpite; 2) teste a igualdade primeiro.
  3. **Passo 3 · Exercício (código) · Laço de tentativas com segredo fixo** — `segredo = 42`, 5 tentativas; mensagens exatas (`Tentativa 1 de 5:`, `O número é maior.`, `O número é menor.`, `Acertou em 3 tentativas!`, `Você perdeu. O número era 42.`). Verificação: `io` × 3 (`42`; `10\n50\n42`; `1\n2\n3\n4\n5`). Erradas: não parar ao acertar; contador começando em 0 nas mensagens (`Tentativa 0 de 5:`). Dicas: 1) `break` ao acertar; 2) a mensagem de derrota só aparece se as 5 tentativas acabarem.
  4. **Passo 4 · Exercício (código) · Validação** — continua o código do passo anterior (sem `### Código inicial`): palpites fora de 1..100 imprimem `Digite um número entre 1 e 100.` e não consomem tentativa. Verificação: `io` com `0\n101\n42` → `Acertou em 1 tentativas!` (o enunciado fixa o texto, sem tratar o plural). Erradas: consumir tentativa no palpite inválido; aceitar 0. Dicas: 1) valide antes de contar; 2) `continue` volta ao começo do laço.
  5. **Passo 5 · Exercício (código) · Versão final** — `import random`, `random.seed(42)`, `segredo = random.randint(1, 100)`; o enunciado informa o segredo gerado com essa semente (o autor roda no executor e registra o valor). Verificação: `io` + `source imports random` + `source calls seed`. Erradas: `seed` dentro do laço; sem `seed` (segredo diferente a cada execução). Dicas: 1) a semente vem antes do `randint`; 2) sorteie uma vez só, antes do laço.
  6. **Passo 6 · Quiz · Revisão do módulo** — 3 perguntas: para que serve a semente; `break` contra flag; por que validar antes de contar.
- **Erros comuns:** comparar texto com número; mensagens fora do padrão.

## Módulo 5 · Coleções

Listas, métodos e fatias, percorrendo, tuplas, dicionários, conjuntos e compreensões.

- **Recursos do módulo:** visualizador em seis das sete lições (ver a lista, a tupla e o dicionário mudarem; cópia contra referência); `Previsão` em todas as lições; `lacunas`/`ordenar` nas lições 01 a 03 e na estreia de dicionários (05) e compreensões (07); dois diagramas (duas variáveis para a mesma lista; chave → valor); fórmulas da média ponderada e das operações de conjunto.
- **Assets a criar:** nenhum.

### n1-m5-01-listas · Listas

- **Arquivo:** `05-colecoes/01-listas.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Criar listas, acessar elementos por índice positivo e negativo e alterar posições · Usar len(), append() e in e prever IndexError · Explicar que uma lista pode mudar (mutável) e o que isso implica
- **Conceitos:** lista, índice 0, negativo, `len`, `append`, `in`, atribuição por índice, `IndexError`, mutabilidade.
- **Passos (6):**
  1. **Passo 1 · Leitura · Vários valores em uma variável** — colchetes, índice a partir de 0, índice negativo, `len`, `append`, `in`, troca por índice, `IndexError`. Tabela Markdown com os índices positivos e negativos de uma lista de 4 itens. **Visualizar** ("veja a lista crescer e a posição 0 mudar"):
     ```python
     compras = ["pão", "queijo", "suco"]
     compras.append("leite")
     compras[0] = "pão integral"
     ultimo = compras[-1]
     print(len(compras), ultimo)
     ```
  2. **Passo 2 · Previsão · Índices** — Dicas: 1) o primeiro índice é 0; 2) `-1` é o último; 3) a lista impressa aparece com colchetes, aspas simples e vírgulas.
     ```python
     letras = ["a", "b", "c", "d"]
     print(letras[0])
     print(letras[-1])
     print(len(letras))
     letras[1] = "z"
     print(letras)
     print("c" in letras)
     ```
     ```text
     a
     d
     4
     ['a', 'z', 'c', 'd']
     True
     ```
  3. **Passo 3 · Exercício (lacunas) · Lista de compras** — Instruções: 1) acrescente `"leite"` ao fim; 2) troque o **segundo** item por `"lentilha"`; 3) imprima o último item. Verificação: `variable compras == ["arroz", "lentilha", "café", "leite"]`, `io contains leite`. Erradas: índice 2 no lugar de 1 (troca o terceiro); `compras = compras.append("leite")` (vira `None`). Dicas: 1) o método que acrescenta ao fim é `append`; 2) o segundo item tem índice 1; 3) o último é `-1`.
     ```python
     compras = ["arroz", "feijão", "café"]
     compras.___("leite")
     compras[___] = "lentilha"
     print(compras[___])
     ```
  4. **Passo 4 · Exercício (código) · ultimo_e_primeiro(lista)** — devolve `[ultimo, primeiro]`. Verificação: `call` `[1, 2, 3]` → `[3, 1]`, `[7]` → `[7, 7]`, `["a", "b"]` → `["b", "a"]`. Erradas: `lista[len(lista)]` (IndexError); devolver `[primeiro, ultimo]`. Dicas: 1) `lista[-1]` é o último; 2) monte a resposta com colchetes.
  5. **Passo 5 · Quiz · Listas** — 3 perguntas: `lista[-1]`; `len([])` (0); `lista[3]` numa lista de 3 itens (IndexError).
  6. **Passo 6 · Exercício (ordenar) · Lendo n números** — lê `n` e depois `n` inteiros, monta a lista e a imprime (`[3, 5, 8]`). Instruções: 1) leia `n` e crie a lista vazia; 2) repita `n` vezes: leia, converta e acrescente; 3) imprima a lista depois do laço. Solução (6 linhas): `n = int(input())`, `numeros = []`, `for i in range(n):`, `    numero = int(input())`, `    numeros.append(numero)`, `print(numeros)`. Distratores: `numeros.append(input())`. Verificação: `io` com `3\n3\n5\n8` e `1\n-4`. Erradas: guardar textos (`['3', '5', '8']`); `print` dentro do laço. Dicas: 1) a lista nasce vazia, antes do laço; 2) converta antes do `append`.
- **Erros comuns:** `append` com dois argumentos; `append` devolve `None`.

### n1-m5-02-metodos-e-fatias · Métodos de lista e fatias

- **Arquivo:** `05-colecoes/02-metodos-e-fatias.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Usar os métodos mais comuns de lista e prever o que cada um devolve · Extrair partes de uma lista com fatias, inclusive invertendo com passo negativo · Diferenciar sort() de sorted() e cópia de referência
- **Conceitos:** `insert`, `remove`, `pop`, `sort`/`sorted`, `reverse`, `index`, `count`, fatias, passo, cópia vs referência.
- **Passos (7):**
  1. **Passo 1 · Leitura · Métodos que mudam a lista** — tabela método × o que faz × o que devolve (`insert`, `remove`, `pop`, `sort`, `reverse`, `index`, `count`); destaque para os que devolvem `None`. Sem outro recurso.
  2. **Passo 2 · Exercício (ordenar) · Sequência de operações** — a fila começa `["Bia", "Caio", "Davi"]` e precisa terminar `["Ana", "Bia", "Eva"]`, com `saiu == "Davi"`. Instruções: 1) crie a fila e ponha `"Ana"` na frente; 2) tire `"Caio"`; 3) tire o último, guardando em `saiu`; 4) acrescente `"Eva"`. Solução (5 linhas, sem indentação): `fila = ["Bia", "Caio", "Davi"]`, `fila.insert(0, "Ana")`, `fila.remove("Caio")`, `saiu = fila.pop()`, `fila.append("Eva")`. Distratores: `saiu = fila.pop(0)`. Verificação: `variable fila == ["Ana", "Bia", "Eva"]`, `variable saiu == "Davi"`. Erradas: `append("Eva")` antes do `pop()` (sai a Eva); `pop(0)` (sai a Ana). Dicas: 1) `pop()` sem índice tira o último; 2) a ordem das operações muda o resultado.
  3. **Passo 3 · Leitura · Fatias e cópias** — `lista[a:b]`, `lista[:b]`, `lista[a:]`, `lista[::2]`, `lista[::-1]` em tabela; `b = a` não copia. **Mermaid:** `flowchart LR` — `a` e `b` apontando para o mesmo nó `"[1, 2, 3, 4]"`, e `c` apontando para outro nó `"[1, 2, 3]"`: duas variáveis, uma lista só. **Visualizar** ("repare que `a` e `b` mostram a mesma lista"):
     ```python
     a = [1, 2, 3]
     b = a
     c = a[:]
     a.append(4)
     print(b)
     print(c)
     ```
  4. **Passo 4 · Previsão · sort, sorted e fatias** — Dicas: 1) `sorted` devolve uma lista nova; `sort` muda a própria lista; 2) um método que só altera a lista devolve `None`; 3) o fim da fatia é exclusivo.
     ```python
     numeros = [3, 1, 2]
     ordenada = sorted(numeros)
     print(numeros)
     print(ordenada)
     resultado = numeros.sort()
     print(numeros)
     print(resultado)
     print(numeros[::-1])
     print(numeros[1:])
     ```
     ```text
     [3, 1, 2]
     [1, 2, 3]
     [1, 2, 3]
     None
     [3, 2, 1]
     [2, 3]
     ```
  5. **Passo 5 · Exercício (código) · Fatias** — `metade_inicial(lista)`, `inverter(lista)` (lista nova, sem `reverse`), `a_cada_dois(lista)`. Verificação: `call` com `[1, 2, 3, 4, 5]` (→ `[1, 2]`, `[5, 4, 3, 2, 1]`, `[1, 3, 5]`) e `[]`; `expr` conferindo que a original não mudou; `source not_calls reverse`. Erradas: `lista.reverse()` seguido de `return lista` (altera a original); `return lista.reverse()` (devolve `None`). Dicas: 1) `[::-1]` percorre de trás para frente; 2) a metade é `len(lista) // 2`.
  6. **Passo 6 · Quiz · Métodos e fatias** — 3 perguntas: o que `lista.sort()` devolve (`None`); tamanho de `lista[1:3]` (2); depois de `b = a`, `a.append(9)` aparece em `b`? (sim).
  7. **Passo 7 · Exercício (código) · remover_se_existir(lista, item)** — remove e devolve `True`; se o item não está, devolve `False` sem erro. Verificação: `call` + `expr` conferindo a lista depois da chamada. Erradas: `remove` sem checar (ValueError); devolver `True` sempre. Dicas: 1) `if item in lista`; 2) cada caminho tem o seu `return`.
- **Erros comuns:** `lista = lista.sort()`; cópia por referência.

### n1-m5-03-percorrendo-listas · Percorrendo listas

- **Arquivo:** `05-colecoes/03-percorrendo-listas.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Percorrer listas com for, enumerate e zip e escolher a forma adequada · Construir uma nova lista a partir de outra (filtrar e transformar) com laço · Explicar por que remover itens enquanto percorre dá errado e como evitar
- **Conceitos:** `for x in`, `enumerate(start=1)`, `zip`, construir lista nova, `sum/min/max`, remover durante iteração.
- **Passos (7):**
  1. **Passo 1 · Leitura · Três jeitos de percorrer** — `for item in lista`, `enumerate` (posição + item), `zip` (duas listas lado a lado); o padrão "lista nova que começa vazia"; `sum`, `min`, `max`. **Visualizar** ("veja `aprovados` crescer só quando a nota passa"):
     ```python
     nomes = ["Ana", "Bia", "Caio"]
     notas = [8, 6, 9]
     aprovados = []
     for nome, nota in zip(nomes, notas):
         if nota >= 7:
             aprovados.append(nome)
     print(aprovados)
     ```
  2. **Passo 2 · Exercício (lacunas) · Ranking** — `nomes = ["Ana", "Bia", "Caio"]` → `1. Ana`, `2. Bia`, `3. Caio`. Instruções: 1) complete a variável que recebe a posição; 2) faça a contagem começar em 1; 3) complete o que vai antes do ponto. Verificação: `io` exato. Erradas: `start=0` (começa em `0. Ana`); posição e nome trocados no `for`. Dicas: 1) `enumerate` entrega primeiro a posição, depois o item; 2) `start=1` muda o primeiro número.
     ```python
     nomes = ["Ana", "Bia", "Caio"]
     for ___, nome in enumerate(nomes, start=___):
         print(f"{___}. {nome}")
     ```
  3. **Passo 3 · Exercício (código) · apenas_pares e dobrados** — duas funções que devolvem listas novas. Verificação: `call` `[1, 2, 3, 4]` → `[2, 4]` e `[2, 4, 6, 8]`; `[]` → `[]`. Erradas: `print` em vez de acumular (devolve `None`); `return` dentro do laço (só o primeiro item). Dicas: 1) comece com `resultado = []`; 2) `append` dentro do laço, `return` depois dele.
  4. **Passo 4 · Exercício (código) · media_ponderada(notas, pesos)** — com `zip`. **Fórmula:** `$$\bar{x}_p = \frac{\sum n_i \cdot p_i}{\sum p_i}$$` e o exemplo `$\dfrac{8 \cdot 2 + 6 \cdot 1}{2 + 1} \approx 7{,}33$`. Verificação: `call` `([8, 6], [2, 1])` → 7.333… e `([10, 5, 6], [1, 1, 2])` → 6.75, `tolerance 0.01`. Erradas: dividir pela quantidade de notas; somar nota + peso em vez de multiplicar. Dicas: 1) acumule `nota * peso`; 2) divida pela soma dos pesos.
  5. **Passo 5 · Previsão · Remover enquanto percorre** — antes da explicação do problema. Dicas: 1) depois de um `remove`, os itens seguintes andam uma posição para trás; 2) o laço segue para a posição seguinte e pula um item.
     ```python
     numeros = [-1, -2, 3]
     for n in numeros:
         if n < 0:
             numeros.remove(n)
     print(numeros)
     ```
     ```text
     [-2, 3]
     ```
  6. **Passo 6 · Quiz · Percorrendo** — 3 perguntas: por que construir uma lista nova em vez de remover no `for`; o que `enumerate` entrega em cada volta; o que `zip` faz com listas de tamanhos diferentes (para na menor).
  7. **Passo 7 · Exercício (código) · remover_negativos(lista)** — devolve uma lista nova sem alterar a original. Verificação: `call` (`[-1, -2, 3]` → `[3]`, `[]` → `[]`) + `expr` (`setup: original = [1, -2, 3]; r = remover_negativos(original)`, `expr: original`, esperado `[1, -2, 3]`). Erradas: `remove` dentro do `for` (sobra `-2`); filtrar certo mas alterando a lista recebida. Dicas: 1) construa outra lista; 2) guarde só os que não são negativos (o zero fica).
- **Erros comuns:** alterar durante iteração; alterar a entrada.

### n1-m5-04-tuplas-e-desempacotamento · Tuplas e desempacotamento

- **Arquivo:** `05-colecoes/04-tuplas-e-desempacotamento.lvl.md` · lição guiada · 90 XP · 35 min
- **Objetivos:** Criar tuplas e explicar quando preferir uma tupla a uma lista · Desempacotar tuplas em variáveis, inclusive em laços · Devolver mais de um valor de uma função com tupla
- **Conceitos:** tupla imutável, `(x,)`, desempacotamento, troca `a, b = b, a`, lista de tuplas, retorno múltiplo.
- **Passos (5):**
  1. **Passo 1 · Leitura · Um grupo fixo de valores** — tupla, imutabilidade, `(x,)`, desempacotamento, troca, lista de tuplas, função que devolve dois valores. **Visualizar:**
     ```python
     a = 1
     b = 2
     a, b = b, a
     ponto = (3, 4)
     x, y = ponto
     print(a, b, x, y)
     ```
  2. **Passo 2 · Previsão · Desempacotando no laço** — Dicas: 1) cada volta recebe uma tupla e a separa em duas variáveis; 2) `(5,)` com vírgula é uma tupla de um item.
     ```python
     itens = [("Caneta", 3), ("Lápis", 2)]
     total = 0
     for nome, qtd in itens:
         print(nome, qtd)
         total += qtd
     print(total)
     t = (5,)
     print(len(t))
     ```
     ```text
     Caneta 3
     Lápis 2
     5
     1
     ```
  3. **Passo 3 · Exercício (código) · trocar(a, b) e min_max(lista)** — `trocar` devolve `(b, a)`; `min_max` devolve `(menor, maior)`. Verificação: `call` com `type: tuple` (o JSON não distingue lista de tupla, por isso o `type`). Erradas: devolver lista (`[b, a]`); dois `return` seguidos (só o primeiro vale). Dicas: 1) `return b, a` já devolve uma tupla; 2) `min` e `max` estão liberados aqui.
  4. **Passo 4 · Exercício (código) · Nota fiscal** — `itens = [("Caderno", 12.5, 2), ("Caneta", 3.0, 5)]`; imprimir `Caderno: R$ 25.00`, `Caneta: R$ 15.00` e `Total: R$ 40.00`. Verificação: `io` exato. Erradas: sem `:.2f` (`25.0`); total sem multiplicar pela quantidade (`15.50`). Dicas: 1) `for nome, preco, qtd in itens`; 2) acumule o subtotal de cada item; 3) `:.2f` nas três linhas.
  5. **Passo 5 · Quiz · Tuplas** — 3 perguntas: dá para trocar um item de uma tupla? (não: TypeError); `(1)` é int, `(1,)` é tupla; desempacotar 3 valores em 2 variáveis (ValueError).
- **Erros comuns:** `t[0] = x`; lista vs tupla no retorno.

### n1-m5-05-dicionarios · Dicionários

- **Arquivo:** `05-colecoes/05-dicionarios.lvl.md` · lição guiada · 120 XP · 50 min
- **Objetivos:** Criar dicionários, consultar, inserir e atualizar valores por chave · Usar get(), in, keys(), values() e items() e prever KeyError · Construir um contador de frequências com dicionário
- **Conceitos:** chave → valor, `KeyError`, `get`, `in`, atualizar, `del`, `items()`, contagem, aninhado, chaves imutáveis.
- **Passos (8):**
  1. **Passo 1 · Leitura · Do nome ao valor** — chave → valor; consultar, inserir, atualizar, `del`; `KeyError` e `get`. **Mermaid:** `flowchart LR` com três pares — `"chave Ana"` → `"valor 8"`, `"chave Bia"` → `"valor 6"`, `"chave Caio"` → `"valor 9"`: quem procura pela chave chega direto ao valor, sem percorrer. **Visualizar:**
     ```python
     notas = {"Ana": 8}
     notas["Bia"] = 6
     notas["Ana"] = 9
     falta = notas.get("Caio", 0)
     print(notas, falta)
     ```
  2. **Passo 2 · Exercício (lacunas) · Estoque** — Instruções: 1) atualize o arroz para 8; 2) inclua o café com 3; 3) apague o feijão. Verificação: `variable estoque == {"arroz": 8, "café": 3}`. Erradas: `estoque.append(...)` (AttributeError); apagar o arroz em vez do feijão. Dicas: 1) inserir e atualizar usam a mesma forma: `d[chave] = valor`; 2) a palavra que apaga uma chave é `del`.
     ```python
     estoque = {"arroz": 10, "feijão": 5}
     estoque[___] = 8
     estoque["café"] = ___
     ___ estoque["feijão"]
     ```
  3. **Passo 3 · Exercício (código) · frequencia(lista)** — conta quantas vezes cada item aparece. Verificação: `call` `["a", "b", "a"]` → `{"a": 2, "b": 1}`, `[]` → `{}`. Erradas: `d[x] += 1` sem inicializar (KeyError); `d[x] = 1` sempre (não acumula). Dicas: 1) `d.get(x, 0)` devolve 0 quando a chave ainda não existe; 2) some 1 ao que já havia.
  4. **Passo 4 · Leitura · Percorrendo um dicionário** — `for chave in d`, `values()`, `items()`, `sorted(d)`; dicionário dentro de dicionário; chave precisa ser imutável. Sem recurso além dos exemplos.
  5. **Passo 5 · Previsão · Chaves em ordem** — Dicas: 1) `sorted(d)` devolve as chaves em ordem alfabética; 2) `in` procura nas chaves; 3) `get` com segundo argumento não dá erro.
     ```python
     idades = {"Bia": 35, "Ana": 20}
     idades["Caio"] = 27
     for nome in sorted(idades):
         print(nome, idades[nome])
     print(len(idades))
     print("Davi" in idades)
     print(idades.get("Davi", 0))
     ```
     ```text
     Ana 20
     Bia 35
     Caio 27
     3
     False
     0
     ```
  6. **Passo 6 · Exercício (código) · Relatório ordenado** — a partir de um dicionário dado no código inicial, imprimir `produto: quantidade` em ordem alfabética das chaves. Verificação: `io` exato. Erradas: ordem de inserção; ordenar pelos valores. Dicas: 1) `sorted(d)` percorre as chaves em ordem; 2) busque o valor com `d[chave]`.
  7. **Passo 7 · Quiz · Dicionários** — 3 perguntas: quando acontece `KeyError`; o que `get` devolve com valor padrão; o que `for x in d` percorre (as chaves).
  8. **Passo 8 · Exercício (código) · inverter(d)** — troca chaves e valores (os valores são únicos). Verificação: `call` `{"a": 1, "b": 2}` → `{1: "a", 2: "b"}`, `{}` → `{}`. Erradas: devolver lista de tuplas; devolver o próprio dicionário. Dicas: 1) comece com um dicionário vazio; 2) `for chave, valor in d.items()`.
- **Erros comuns:** `for k, v in d` sem `items()`; lista como chave.

### n1-m5-06-conjuntos · Conjuntos

- **Arquivo:** `05-colecoes/06-conjuntos.lvl.md` · lição guiada · 90 XP · 35 min
- **Objetivos:** Criar conjuntos, adicionar e remover elementos e explicar por que não há repetição nem ordem · Aplicar união, interseção e diferença para resolver problemas de comparação de grupos · Converter entre lista e conjunto para remover duplicatas preservando o que for necessário
- **Conceitos:** `set`, `set()`, `add`, `discard`, `in`, `| & - ^`, `set(lista)`, `sorted(set(...))`.
- **Passos (5):**
  1. **Passo 1 · Leitura · Sem repetição e sem ordem** — `{...}`, `set()` (e por que `{}` é dicionário), `add`, `discard`, `in`; as operações com o exemplo das duas turmas em tabela (operação × símbolo × resultado). **Fórmula:** a notação da matemática ao lado do Python — `$A \cup B$` é `a | b`, `$A \cap B$` é `a & b`, `$A - B$` é `a - b`.
  2. **Passo 2 · Previsão · Operações de conjunto** — todo conjunto é impresso com `sorted`, porque a ordem de um `set` não é garantida. Dicas: 1) um conjunto guarda cada valor uma vez só; 2) `&` fica com o que está nos dois; `-` tira do primeiro o que está no segundo.
     ```python
     numeros = [3, 1, 3, 2, 1]
     unicos = set(numeros)
     print(len(unicos))
     print(sorted(unicos))
     a = {1, 2, 3}
     b = {3, 4}
     print(sorted(a & b))
     print(sorted(a | b))
     print(sorted(a - b))
     ```
     ```text
     3
     [1, 2, 3]
     [3]
     [1, 2, 3, 4]
     [1, 2]
     ```
  3. **Passo 3 · Exercício (código) · sem_repetidos e tem_repetidos** — Verificação: `call` `[3, 1, 3, 2]` → `[1, 2, 3]` (com `type: list`) e `True`; `[]` → `[]` e `False`. Erradas: devolver o `set` em vez da lista ordenada; `tem_repetidos` comparando a lista com ela mesma (sempre False). Dicas: 1) `sorted(set(lista))` devolve uma lista em ordem; 2) se há repetidos, o conjunto é menor que a lista.
  4. **Passo 4 · Exercício (código) · Turmas** — `python = {"ana", "bia", "caio"}`, `calculo = {"bia", "davi"}`; `ambos(a, b)`, `apenas_a(a, b)`, `pelo_menos_um(a, b)` devolvendo listas ordenadas. Verificação: `call` (→ `["bia"]`, `["ana", "caio"]`, `["ana", "bia", "caio", "davi"]`). Erradas: `b - a` em `apenas_a`; `|` em `ambos`. Dicas: 1) `&`, `-` e `|`; 2) `sorted(...)` transforma o resultado em lista ordenada.
  5. **Passo 5 · Quiz · Conjuntos** — 3 perguntas: `{}` cria o quê (dicionário); `len({1, 1, 2})` (2); conjunto tem índice? (não).
- **Erros comuns:** `remove` de item ausente; indexar conjunto.

### n1-m5-07-compreensoes · Compreensões de lista e de dicionário

- **Arquivo:** `05-colecoes/07-compreensoes.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Reescrever laços de transformação e filtro como compreensões de lista · Escrever compreensões de dicionário e de conjunto · Reconhecer quando uma compreensão fica ilegível e voltar ao laço
- **Conceitos:** `[expr for x in it if cond]`, dict/set comprehension, legibilidade, gerador entre parênteses.
- **Passos (6):**
  1. **Passo 1 · Leitura · O laço em uma linha** — as três partes (o que guardar, de onde vem, filtro opcional), com o laço e a compreensão lado a lado; compreensão de dicionário e de conjunto; quando voltar ao laço. **Visualizar** ("as duas listas terminam iguais"):
     ```python
     numeros = [1, 2, 3, 4]
     quadrados = []
     for n in numeros:
         if n % 2 == 0:
             quadrados.append(n * n)
     mesma_coisa = [n * n for n in numeros if n % 2 == 0]
     print(quadrados, mesma_coisa)
     ```
  2. **Passo 2 · Exercício (lacunas) · Reescreva** — três funções (`quadrados`, `pares`, `maiusculas`) já vêm no formato de compreensão, com uma parte faltando em cada. Instruções: 1) complete o que `quadrados` guarda; 2) complete o filtro de `pares`; 3) complete a transformação e a variável de `maiusculas`. Verificação: `call` de cada uma (`[1, 2, 3]` → `[1, 4, 9]`; `[1, 2, 3, 4]` → `[2, 4]`; `["oi", "usp"]` → `["OI", "USP"]`) + `source uses list_comprehension` com `function` de cada. Erradas: `quadrados` devolvendo `n * 2`; `pares` com `n % 2 == 1`. Dicas: 1) a expressão que vem primeiro é o que entra na lista; 2) o filtro é uma condição depois do `for`.
     ```python
     def quadrados(numeros):
         return [___ for n in numeros]


     def pares(numeros):
         return [n for n in numeros if ___]


     def maiusculas(palavras):
         return [___ for ___ in palavras]
     ```
  3. **Passo 3 · Exercício (código) · tamanhos(palavras)** — devolve `{"casa": 4, "sol": 3}`. Verificação: `call` + `source uses dict_comprehension`. Erradas: lista de tuplas; chave e valor trocados. Dicas: 1) a compreensão de dicionário usa chaves e `chave: valor`; 2) o valor é `len(p)`.
  4. **Passo 4 · Previsão · Leia a compreensão** — Dicas: 1) leia de trás para frente: de onde vem, qual o filtro, o que guarda; 2) o dicionário aparece com chaves, aspas simples e dois-pontos.
     ```python
     print([x * 2 for x in range(3)])
     print([x for x in range(6) if x % 2 == 1])
     print({p: len(p) for p in ["oi", "olá"]})
     print([p[0] for p in ["Ana", "Bia"]])
     ```
     ```text
     [0, 2, 4]
     [1, 3, 5]
     {'oi': 2, 'olá': 3}
     ['A', 'B']
     ```
  5. **Passo 5 · Quiz · Compreensões** — 3 perguntas: o que `[x * 2 for x in range(3)]` produz; onde fica o `if` de filtro (depois do `for`); o que os parênteses no lugar dos colchetes criam (um gerador, não uma tupla).
  6. **Passo 6 · Exercício (código) · quadrados_impares(n) e iniciais(nomes)** — Verificação: `call` (5 → `[1, 9, 25]`; `["Ana Souza", "Bia Lima"]` → `["A", "B"]`) + `source uses list_comprehension` em cada função. Erradas: `if` antes do `for` (SyntaxError); `range(n)` em `quadrados_impares` (falta o 5). Dicas: 1) o filtro vem depois do `for`; 2) `range(1, n + 1)` inclui o n.
- **Erros comuns:** ordem do `if`; efeito colateral dentro da compreensão.

## Módulo 6 · Funções

Definir e chamar, parâmetros e retorno, escopo, argumentos padrão e nomeados, docstrings e assert, recursão e funções como valores.

- **Recursos do módulo:** visualizador em seis das sete lições (o salto para dentro da função, os quadros local e global, a pilha da recursão); `Previsão` em todas as lições; `ordenar` na 01 e `lacunas` nas 02, 06 e 07; dois diagramas (chamada e retorno; pilha da recursão); fórmulas de Celsius para Fahrenheit, do desconto e das definições recursivas.
- **Assets a criar:** nenhum.

### n1-m6-01-definir-e-chamar · Definir e chamar funções

- **Arquivo:** `06-funcoes/01-definir-e-chamar.lvl.md` · lição guiada · 100 XP · 40 min
- **Estado:** lição **já escrita e verificada** com 4 passos (Leitura → Exercício → Exercício → Quiz). O plano abaixo acrescenta um bloco `visualizar` à leitura e dois passos novos (2 e 3); os passos atuais 2, 3 e 4 viram 4, 5 e 6 sem mudança de conteúdo. Como o primeiro exercício passa a ser um passo novo, o atual "Linha e cabeçalho" mantém o seu `### Código inicial`.
- **Objetivos:** Definir funções com def e chamá-las pelo nome · Explicar a diferença entre definir e executar uma função · Organizar um programa repetitivo em funções reutilizáveis
- **Conceitos:** `def`, chamada, definição não executa, ordem, repetição eliminada, nomes verbais.
- **Passos (6):**
  1. **Passo 1 · Leitura · Uma receita com nome** — texto atual, mantido. Acrescentar, depois do parágrafo "Chamar é escrever o nome com parênteses", o **Visualizar** ("veja a execução pular para dentro da função e voltar"):
     ```python
     def mostrar_menu():
         print("1 - Cadastrar aluno")
         print("2 - Sair")


     print("Bem-vindo ao sistema do RU")
     mostrar_menu()
     print("Até a próxima!")
     mostrar_menu()
     ```
  2. **Passo 2 · Previsão · Definir não executa** — novo. Dicas: 1) o `def` só guarda a receita; 2) cada chamada executa o corpo inteiro e volta para a linha seguinte.
     ```python
     def avisar():
         print("dentro da função")


     print("início")
     avisar()
     print("meio")
     avisar()
     print("fim")
     ```
     ```text
     início
     dentro da função
     meio
     dentro da função
     fim
     ```
  3. **Passo 3 · Exercício (ordenar) · Monte o programa do aviso** — novo. Saída exata no enunciado: `Início`, `Atenção!`, `O RU fecha às 14h`, `Fim`. Instruções: 1) defina `mostrar_aviso` com os dois `print` do aviso dentro dela; 2) no programa principal, imprima `Início`, chame a função e imprima `Fim`. Solução (6 linhas): `def mostrar_aviso():`, `    print("Atenção!")`, `    print("O RU fecha às 14h")`, `print("Início")`, `mostrar_aviso()`, `print("Fim")`. Distratores: `mostrar_aviso`. Verificação: `io` exato; `source defines_function mostrar_aviso`; `source calls mostrar_aviso`. Erradas: definir sem chamar (falta o aviso); os dois `print` do aviso fora da função, antes de `Início`. Dicas: 1) o corpo da função fica um nível à direita; 2) a chamada tem parênteses.
  4. **Passo 4 · Exercício (código) · Linha e cabeçalho** — passo atual 2, mantido: `linha()` imprime 20 traços; `cabecalho()` chama `linha()`, imprime `RELATÓRIO`, chama `linha()`; o programa chama `cabecalho()`. Verificação: `io` exato; `source defines_function linha`, `defines_function cabecalho`, `calls cabecalho`. Erradas: definir sem chamar; 19 traços. Dicas: a definição sozinha não imprime nada.
  5. **Passo 5 · Exercício (código) · Refatore a repetição** — passo atual 3, mantido: três blocos iguais de 3 linhas viram `saudar()` chamada 3 vezes. Verificação: `io` exato + `defines_function saudar` + `calls saudar`. Erradas: manter os blocos; chamar só uma vez. Dicas: copie o bloco uma vez para dentro do `def`.
  6. **Passo 6 · Quiz · Definir ou executar?** — passo atual 4, mantido (3 perguntas): o nome sem parênteses não chama; chamar antes do `def` (NameError); `def` define, não executa.
- **Erros comuns:** chamada sem parênteses; indentação.

### n1-m6-02-parametros-e-retorno · Parâmetros e retorno

- **Arquivo:** `06-funcoes/02-parametros-e-retorno.lvl.md` · lição guiada · 120 XP · 50 min
- **Objetivos:** Definir funções com parâmetros e chamá-las com argumentos · Devolver valores com return e usá-los em expressões e outras chamadas · Explicar a diferença entre imprimir e devolver e prever o valor de uma função sem return
- **Conceitos:** parâmetros, argumentos, `return`, `None`, usar retorno em expressões, retorno múltiplo, `print` ≠ `return`.
- **Passos (7):**
  1. **Passo 1 · Leitura · O que entra e o que sai** — parâmetro (nome na definição) e argumento (valor na chamada); `return` entrega o valor e encerra a função; o retorno usado em contas e em outras chamadas. **Mermaid:** `sequenceDiagram` com dois participantes, `Programa` e `area_retangulo` — `Programa->>area_retangulo: base = 3, altura = 4` e `area_retangulo-->>Programa: devolve 12`. **Visualizar** ("veja o quadro da função aparecer com `base` e `altura` e sumir depois do `return`"):
     ```python
     def area_retangulo(base, altura):
         area = base * altura
         return area


     sala = area_retangulo(3, 4)
     total = sala + area_retangulo(2, 2)
     print(total)
     ```
  2. **Passo 2 · Exercício (lacunas) · Três funções** — `area_retangulo(base, altura)`, `celsius_para_fahrenheit(c)`, `eh_maior_de_idade(idade)`. **Fórmula:** `$F = C \cdot \dfrac{9}{5} + 32$` no enunciado. Instruções: 1) complete a conta da área; 2) complete a palavra que devolve o valor; 3) complete o nome do parâmetro. Verificação: `call` com 3 casos cada (`tolerance 0.01` no float; `type: bool` na terceira). Erradas: `print` no lugar de `return` em `celsius_para_fahrenheit`; `base + altura` na área. Dicas: 1) área do retângulo é base vezes altura; 2) quem devolve é `return`; 3) o parâmetro tem o nome usado no corpo.
     ```python
     def area_retangulo(base, altura):
         return ___ * ___


     def celsius_para_fahrenheit(c):
         ___ c * 9 / 5 + 32


     def eh_maior_de_idade(___):
         return idade >= 18
     ```
  3. **Passo 3 · Leitura · Imprimir não é devolver** — `print` mostra na tela; `return` entrega para quem chamou; função sem `return` devolve `None`; o que vem depois do `return` não roda. Sem recurso além de dois trechos comparados.
  4. **Passo 4 · Previsão · print ou return?** — Dicas: 1) a primeira função imprime, mas não devolve nada; 2) o que uma função sem `return` devolve tem nome: `None`.
     ```python
     def dobro_print(n):
         print(n * 2)


     def dobro_return(n):
         return n * 2


     a = dobro_print(5)
     b = dobro_return(5)
     print(a)
     print(b)
     ```
     ```text
     10
     None
     10
     ```
  5. **Passo 5 · Exercício (código) · Conserte: print vira return** — três funções dadas com `print`. Verificação: `call` + `source not_calls print`. Erradas: manter o `print` e acrescentar `return` (reprova no `not_calls`); `return print(...)` (devolve `None`). Dicas: 1) quem imprime é quem chama a função; 2) troque a palavra, mantenha a conta.
  6. **Passo 6 · Quiz · Parâmetros e retorno** — 3 perguntas: o que devolve uma função sem `return` (`None`); a linha depois do `return` roda? (não); diferença entre `print` e `return`.
  7. **Passo 7 · Exercício (código) · dividir(a, b)** — devolve `(quociente, resto)`. Verificação: `call` com `type: tuple`: (17, 5) → `[3, 2]`, (10, 2) → `[5, 0]`. Erradas: devolver lista; devolver `(resto, quociente)`. Dicas: 1) `//` e `%`; 2) `return x, y` devolve os dois de uma vez.
- **Erros comuns:** retorno não usado; número de argumentos.

### n1-m6-03-escopo · Escopo de variáveis

- **Arquivo:** `06-funcoes/03-escopo.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Diferenciar variáveis locais e globais e prever NameError e UnboundLocalError · Passar dados por parâmetro e devolver por return em vez de usar variáveis globais · Explicar o que a palavra-chave global faz e por que raramente é boa ideia
- **Conceitos:** local, global, `UnboundLocalError`, `global` (evitar), entra por parâmetro e sai por `return`.
- **Passos (5):**
  1. **Passo 1 · Leitura · Cada função tem as suas variáveis** — variável local nasce na chamada e some no retorno; a global é lida, mas uma atribuição dentro da função cria outra variável; `global` existe e por que evitar. **Visualizar** ("há dois `x`: um no quadro global, outro no quadro de `dobrar`"):
     ```python
     def dobrar(x):
         x = x * 2
         resultado = x
         return resultado


     x = 5
     y = dobrar(x)
     print(x, y)
     ```
  2. **Passo 2 · Previsão · A global mudou?** — substitui o antigo exercício "O que imprime" (`saida_1`…`saida_3` em variáveis); os casos que terminam em erro (`NameError`, `UnboundLocalError`) vão para o quiz. Dicas: 1) o `total` de dentro da função é outra variável; 2) faça o teste de mesa com dois quadros.
     ```python
     total = 10


     def somar(valor):
         total = valor + 1
         return total


     print(somar(5))
     print(total)
     ```
     ```text
     6
     10
     ```
  3. **Passo 3 · Exercício (código) · Sem global** — código inicial com `saldo = 100` e `depositar(valor)` usando `global saldo`. Reescrever como `depositar(saldo, valor)`, que devolve o novo saldo. Verificação: `call depositar(100, 50) == 150` + `expr` (`setup: depositar(100, 50)`, `expr: saldo`, esperado 100). Erradas: manter o `global` com a assinatura nova; devolver só `valor`. Dicas: 1) o saldo entra por parâmetro; 2) devolva o novo valor em vez de alterar o de fora.
  4. **Passo 4 · Quiz · Escopo** — 3 perguntas: usar fora da função uma variável criada dentro dela (NameError); `x = 5; dobrar(x)` muda o `x` de fora? (não); o que acontece em `contador += 1` dentro de uma função sem `global` (UnboundLocalError).
  5. **Passo 5 · Exercício (código) · aplicar_desconto(preco, percentual)** — função pura. **Fórmula:** `$$\text{preço final} = \text{preço} \cdot \left(1 - \frac{p}{100}\right)$$` no enunciado (R\$ 200,00 com 25 % sai por R\$ 150,00). Verificação: `call` (200, 25) → 150.0, (80, 0) → 80.0, (50, 100) → 0.0, `tolerance 0.01`. Erradas: `preco - percentual` (subtrai o número); `preco * percentual / 100` (devolve o desconto, não o preço final). Dicas: 1) o percentual vira fração dividindo por 100; 2) tudo o que a função precisa chega pelos parâmetros.
- **Erros comuns:** usar `global` para "resolver"; mesmo nome dentro e fora.

### n1-m6-04-argumentos-padrao-e-nomeados · Argumentos padrão e nomeados

- **Arquivo:** `06-funcoes/04-argumentos-padrao-e-nomeados.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Definir parâmetros com valor padrão e chamar funções omitindo-os · Usar argumentos nomeados para deixar chamadas legíveis e fora de ordem · Explicar por que uma lista como valor padrão causa bugs e como evitar
- **Conceitos:** valor padrão, padrões no fim, argumentos nomeados, padrão mutável, `None` como sentinela.
- **Passos (5):**
  1. **Passo 1 · Leitura · Parâmetros opcionais** — valor padrão; padrões sempre no fim; argumento nomeado; posicionais antes dos nomeados. Sem recurso além dos exemplos de chamada.
  2. **Passo 2 · Previsão · Qual valor cada parâmetro recebe** — Dicas: 1) quem não é informado usa o padrão; 2) com nomes, a ordem não importa.
     ```python
     def potencia(base, expoente=2):
         return base ** expoente


     print(potencia(3))
     print(potencia(2, 5))
     print(potencia(expoente=3, base=2))
     ```
     ```text
     9
     32
     8
     ```
  3. **Passo 3 · Exercício (código) · formatar_preco(valor, moeda="R$", casas=2)** — devolve `"R$ 10.50"`. Verificação: `call` (10.5), (10.5, "US$"), (10.5, casas=1) com `kwargs`, (3, moeda="€", casas=0). Erradas: `casas` fixo em 2 no corpo (ignora o parâmetro); moeda fixa `"R$"` no corpo. Dicas: 1) os padrões ficam na linha do `def`; 2) `f"{valor:.{casas}f}"` usa a variável como número de casas.
  4. **Passo 4 · Exercício (código) · Lista padrão** — consertar `adicionar_tarefa(tarefa, lista=[])`. A narrativa mostra o defeito no **Visualizar** ("a mesma lista aparece nas duas chamadas"):
     ```python
     def adicionar_tarefa(tarefa, lista=[]):
         lista.append(tarefa)
         return lista


     a = adicionar_tarefa("estudar")
     b = adicionar_tarefa("lavar a louça")
     print(a)
     print(b)
     ```
     Verificação: `expr` (`setup: a = adicionar_tarefa("x"); b = adicionar_tarefa("y")`, `expr: b`, esperado `["y"]`) + `call` com lista informada (`("z", ["x"])` → `["x", "z"]`). Erradas: manter `lista=[]`; criar sempre uma lista nova, ignorando a que foi passada. Dicas: 1) use `lista=None` no `def`; 2) crie a lista dentro da função quando ela for `None`.
  5. **Passo 5 · Quiz · Padrões e nomes** — 3 perguntas: parâmetro com padrão antes de um obrigatório (SyntaxError); chamada com nomes fora de ordem funciona?; por que `[]` como padrão é compartilhado entre as chamadas.
- **Erros comuns:** nomeado antes de posicional; `TypeError` de nome inexistente.

### n1-m6-05-docstrings-e-assert · Docstrings e assert

- **Arquivo:** `06-funcoes/05-docstrings-e-assert.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Escrever docstrings curtas com o que a função recebe e devolve · Escrever testes com assert para casos normais e de borda · Explicar como um assert que falha ajuda a achar o erro
- **Conceitos:** docstring, `help`, `assert cond, msg`, função `testar_x()`, casos de borda, teste antes do código.
- **Passos (7):**
  1. **Passo 1 · Leitura · Documentar com docstring** — três aspas na primeira linha do corpo; o que recebe e o que devolve; `help()` e `__doc__`; diferença para comentário. Sem recurso de apresentação.
  2. **Passo 2 · Exercício (código) · Documente** — acrescentar docstrings a `dobro(n)` e `eh_par(n)` dizendo o que devolvem. Verificação: `expr dobro.__doc__` com `type: str`; `expr "devolve" in dobro.__doc__.lower()` esperado `True`; o mesmo para `eh_par`; `call` conferindo que as funções continuam certas. Erradas: comentário `#` no lugar da docstring (`__doc__` é `None`); docstring depois do `return`. Dicas: 1) a docstring é a primeira linha do corpo, entre três aspas; 2) use a palavra "devolve".
  3. **Passo 3 · Leitura · Testar com assert** — `assert condição, mensagem`; assert que passa não imprime nada; função `testar_x()` com casos típicos e de borda. Tabela caso × entrada × esperado para `eh_par`. Sem outro recurso.
  4. **Passo 4 · Previsão · Assert em silêncio** — Dicas: 1) um `assert` verdadeiro não mostra nada; 2) função sem docstring tem `__doc__` igual a `None`.
     ```python
     def eh_par(n):
         return n % 2 == 0


     def testar():
         assert eh_par(2)
         assert not eh_par(3)
         print("todos os testes passaram")


     testar()
     print(eh_par.__doc__)
     ```
     ```text
     todos os testes passaram
     None
     ```
  5. **Passo 5 · Exercício (código) · testar_eh_par()** — pelo menos 4 asserts (0, 2, 3, -4). Verificação: `source defines_function testar_eh_par`; `expr` chamando `testar_eh_par()` com `eh_par` correta (não levanta exceção: `type: NoneType`); `expr` com `setup` redefinindo `eh_par = lambda n: n % 2 == 1` e `raises: AssertionError`; idem com `lambda n: n > 0`. Erradas: suíte com um único `assert eh_par(2)` (não pega o mutante `n > 0`); suíte sem o zero e sem negativos. Dicas: 1) teste um par, um ímpar, o zero e um negativo; 2) para "não é par", use `assert not eh_par(3)`.
  6. **Passo 6 · Quiz · Docstrings e assert** — 3 perguntas: por que `assert (x, "msg")` nunca falha (tupla não vazia é verdadeira); docstring contra comentário; o que faz um assert falhar.
  7. **Passo 7 · Exercício (código) · arredondar_nota(nota)** — arredonda para o 0,5 mais próximo e precisa passar nos asserts do enunciado (regra explícita, com exemplos: 6.2 → 6.0, 6.3 → 6.5, 6.8 → 7.0). Verificação: `call` com `tolerance 0.001`, **sem** casos de empate exato (6.25, 6.75), porque `round` do Python arredonda empates para o par. Erradas: `round(nota)` (arredonda para inteiro); `int(nota * 2) / 2` (sempre para baixo). Dicas: 1) dobre a nota, arredonde e divida por 2; 2) rode os asserts do enunciado antes de verificar.
- **Erros comuns:** float com `==`; não chamar o teste.

### n1-m6-06-recursao-introdutoria · Recursão: funções que chamam a si mesmas

- **Arquivo:** `06-funcoes/06-recursao-introdutoria.lvl.md` · lição guiada · 120 XP · 50 min
- **Objetivos:** Identificar caso base e caso recursivo em uma definição · Escrever funções recursivas simples (fatorial, soma, potência, inversão de string) · Rastrear as chamadas na pilha e explicar o RecursionError
- **Conceitos:** caso base, caso recursivo, pilha de chamadas, `RecursionError`, recursão vs laço.
- **Passos (6):**
  1. **Passo 1 · Leitura · Uma função que chama a si mesma** — caso base e caso recursivo com `soma_ate(n)`; a pilha de chamadas; o que acontece sem caso base (`RecursionError`). **Fórmula:** `$$S(n) = n + S(n - 1), \qquad S(0) = 0$$`. **Mermaid:** `flowchart TD` da pilha — `"soma_ate(3)"` → `"soma_ate(2)"` → `"soma_ate(1)"` → `"soma_ate(0)"`, com as arestas de volta rotuladas `"devolve 0"`, `"devolve 1"`, `"devolve 3"`, `"devolve 6"`: a descida empilha, a subida calcula. **Visualizar** ("conte os quadros empilhados antes do primeiro `return`"):
     ```python
     def soma_ate(n):
         if n == 0:
             return 0
         return n + soma_ate(n - 1)


     print(soma_ate(3))
     ```
  2. **Passo 2 · Previsão · Ida e volta** — Dicas: 1) o que vem antes da chamada recursiva roda na ida; o que vem depois roda na volta; 2) a última chamada a entrar é a primeira a terminar.
     ```python
     def contagem(n):
         if n == 0:
             print("Fogo!")
             return
         print(n)
         contagem(n - 1)
         print("voltei", n)


     contagem(2)
     ```
     ```text
     2
     1
     Fogo!
     voltei 1
     voltei 2
     ```
  3. **Passo 3 · Exercício (lacunas) · fatorial(n)** — **Fórmula:** `$$n! = n \cdot (n - 1)!, \qquad 0! = 1$$` no enunciado. Instruções: 1) complete o caso base (para qual `n` e qual valor); 2) complete a chamada recursiva. Verificação: `call` 0 → 1, 1 → 1, 5 → 120, 10 → 3628800; `source uses recursion`; `source not_uses for`, `not_uses while`. Erradas: versão com laço; caso base `n == 1` (com 0 não para: RecursionError). Dicas: 1) a fórmula diz quanto vale o fatorial de 0; 2) a função chama a si mesma pelo próprio nome.
     ```python
     def fatorial(n):
         if n == ___:
             return ___
         return n * ___(n - 1)
     ```
  4. **Passo 4 · Exercício (código) · soma_lista(lista) e inverter(texto)** — Verificação: `call` (`[1, 2, 3]` → 6, `[]` → 0; `"abc"` → `"cba"`, `""` → `""`); `source uses recursion` com `function` de cada. Erradas: `return soma_lista(lista[1:])` sem somar `lista[0]` (sempre 0); `inverter` sem caso base para texto vazio (IndexError). Dicas: 1) a lista vazia soma 0; 2) soma = primeiro item + soma do resto; 3) o inverso é o inverso do resto seguido da primeira letra.
  5. **Passo 5 · Quiz · Recursão** — 3 perguntas: o que acontece numa recursão sem caso base (RecursionError); quantas chamadas `fatorial(4)` faz (5); o que imprime um trecho curto.
  6. **Passo 6 · Exercício (código) · potencia(base, expoente)** — expoente ≥ 0. **Fórmula:** `$b^e = b \cdot b^{e-1}$` e `$b^0 = 1$` no enunciado. Verificação: `call` (2, 0) → 1, (2, 10) → 1024, (5, 3) → 125; `source uses recursion`. Erradas: caso base `expoente == 1` (falha com 0); `base ** expoente` sem recursão. Dicas: 1) qualquer número elevado a 0 é 1; 2) diminua o expoente de 1 em 1.
- **Erros comuns:** esquecer o `return` na chamada recursiva.

### n1-m6-07-funcoes-como-valores · Funções como valores: lambda, map, filter e sorted

- **Arquivo:** `06-funcoes/07-funcoes-como-valores.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Guardar uma função em variável e passá-la como argumento para outra função · Escrever lambdas de uma expressão e saber quando preferir def · Usar map, filter e sorted(key=...) para transformar, filtrar e ordenar coleções
- **Conceitos:** função como valor, passar função, `lambda`, `map`, `filter`, `sorted(key=)`, `reverse=True`.
- **Passos (6):**
  1. **Passo 1 · Leitura · Função também é valor** — o nome sem parênteses é a própria função; guardar em variável e passar como argumento; `lambda` de uma expressão; `map`, `filter`, `sorted(key=...)`. **Visualizar** ("`operacao` e `dobro` apontam para a mesma função"):
     ```python
     def dobro(x):
         return x * 2


     operacao = dobro
     print(operacao(4))
     triplo = lambda x: x * 3
     print(triplo(4))
     print(list(map(dobro, [1, 2, 3])))
     ```
  2. **Passo 2 · Exercício (código) · aplicar_a_todos(funcao, lista)** — devolve a lista com `funcao(x)` de cada item. Verificação: `expr` (`setup: def triplo(x): return x * 3`, `expr: aplicar_a_todos(triplo, [1, 2])`, esperado `[3, 6]`); `expr` com `len` e `["ab", "c"]` (→ `[2, 1]`); lista vazia. Erradas: chamar `funcao()` sem argumento (TypeError); devolver a lista original. Dicas: 1) dentro do laço, chame `funcao(x)`; 2) guarde cada resultado em uma lista nova.
  3. **Passo 3 · Previsão · Ordenar, filtrar e transformar** — Dicas: 1) sem `key`, as tuplas são ordenadas pelo primeiro item; 2) `filter` mantém a ordem original; 3) as tuplas aparecem com parênteses e aspas simples.
     ```python
     alunos = [("Caio", 7), ("Ana", 9), ("Bia", 8)]
     print(sorted(alunos))
     print(sorted(alunos, key=lambda a: a[1]))
     print(list(filter(lambda a: a[1] >= 8, alunos)))
     print(list(map(lambda a: a[0], alunos)))
     ```
     ```text
     [('Ana', 9), ('Bia', 8), ('Caio', 7)]
     [('Caio', 7), ('Bia', 8), ('Ana', 9)]
     [('Ana', 9), ('Bia', 8)]
     ['Caio', 'Ana', 'Bia']
     ```
  4. **Passo 4 · Exercício (lacunas) · map e filter** — `dobrados(lista)` com `map` e `positivos(lista)` com `filter`. Instruções: 1) complete a expressão da lambda de `dobrados`; 2) complete o nome da função que filtra. Verificação: `call` (`[1, -2, 3]` → `[2, -4, 6]` e `[1, 3]`; `[0, 5]` → `[0, 10]` e `[5]`; `[]`) + `source uses lambda` + `source calls map`, `calls filter`. Erradas: compreensão de lista no lugar de `map` (reprova no `calls map`); `x >= 0` em `positivos` com zero na lista do caso. Dicas: 1) a lambda diz o que fazer com cada `x`; 2) quem escolhe os itens que passam no teste é `filter`.
     ```python
     def dobrados(lista):
         return list(map(lambda x: ___, lista))


     def positivos(lista):
         return list(___(lambda x: x > 0, lista))
     ```
  5. **Passo 5 · Quiz · Funções como valores** — 3 perguntas: `lambda` pode ter `return`? (não, é uma expressão só); diferença entre passar `f` e passar `f()`; o que `map` devolve sem `list` (um objeto preguiçoso, não uma lista).
  6. **Passo 6 · Exercício (código) · Ordenação por critério** — `por_nota(alunos)` (tuplas `(nome, nota)`, nota decrescente) e `por_nome(alunos)`. Verificação: `call` + `source uses lambda`. Erradas: `sorted(alunos)` em `por_nota` (ordena por nome); sem `reverse=True` (crescente). Dicas: 1) `key=lambda a: a[1]` ordena pela nota; 2) `reverse=True` inverte a ordem.
- **Erros comuns:** `key=nota()`.

## Módulo 7 · Strings e texto

Métodos de string, formatação avançada, split e join, análise de texto e o mini-projeto analisador de texto.

- **Recursos do módulo:** `Previsão` nas lições 01 a 04 (texto é o assunto em que "o que isto imprime?" mais rende); `lacunas` nas lições 01 e 02 e `ordenar` na 03; visualizador em `split`/`join` e na cifra de César; três diagramas de transformação em etapas; fórmula só na cifra de César.
- **Assets a criar:** nenhum.

### n1-m7-01-metodos-de-string · Métodos de string

- **Arquivo:** `07-strings-e-texto/01-metodos-de-string.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Aplicar os métodos mais usados de string e encadear chamadas · Explicar por que os métodos devolvem uma nova string em vez de alterar a original · Normalizar entradas do usuário (espaços, maiúsculas) antes de comparar
- **Conceitos:** imutabilidade, `upper/lower/strip/replace/find/startswith/endswith/count/isdigit/title`, encadeamento, normalização.
- **Passos (6):**
  1. **Passo 1 · Leitura · Texto não muda: métodos devolvem outro texto** — tabela método × o que devolve × exemplo (dez métodos); imutabilidade; encadeamento `.strip().lower()`. Sem outro recurso.
  2. **Passo 2 · Previsão · O texto original muda?** — antes de o aluno usar qualquer método. Dicas: 1) a segunda linha chama o método, mas não guarda o resultado; 2) `find` devolve −1 quando não acha.
     ```python
     texto = "Bom Dia"
     texto.upper()
     print(texto)
     print(texto.lower().replace("o", "0"))
     print(texto.find("z"))
     print(texto.count("o"))
     print(texto.startswith("Bom"))
     ```
     ```text
     Bom Dia
     b0m dia
     -1
     1
     True
     ```
  3. **Passo 3 · Exercício (lacunas) · normalizar(texto) e eh_sim(resposta)** — Instruções: 1) complete os dois métodos de `normalizar` (tirar espaços das pontas e pôr em minúsculas); 2) complete a outra resposta aceita por `eh_sim`. Verificação: `call` `normalizar("  SIM ")` → `"sim"`; `eh_sim` True para `"s"`, `"Sim"`, `" SIM"`, False para `"não"` e `""`. Erradas: `normalizar` só com `lower()` (os espaços ficam); `eh_sim` comparando sem normalizar (`" SIM"` falha). Dicas: 1) `strip` tira os espaços das pontas; 2) `lower` põe em minúsculas; 3) a resposta curta para "sim" é `"s"`.
     ```python
     def normalizar(texto):
         return texto.___().___()


     def eh_sim(resposta):
         return normalizar(resposta) in [___, "sim"]
     ```
  4. **Passo 4 · Exercício (código) · censurar(texto, palavra) e contar_ocorrencias(texto, trecho)** — a palavra vira asteriscos do mesmo tamanho. Verificação: `call` (`("que droga de dia", "droga")` → `"que ***** de dia"`; `("banana", "an")` → 2; trecho ausente → 0). Erradas: `replace` com `"***"` fixo; `censurar` sem devolver o resultado do `replace`. Dicas: 1) `"*" * len(palavra)`; 2) `replace` devolve o texto novo.
  5. **Passo 5 · Quiz · Métodos** — 3 perguntas: o que acontece com `texto.upper()` sem atribuir; o que `find` devolve quando não acha (−1); `strip` tira espaços do meio? (não).
  6. **Passo 6 · Exercício (código) · cpf_valido_formato(cpf)** — remove `.` e `-` e exige 11 dígitos. Verificação: `call` `"123.456.789-00"` → True, `"12345678900"` → True, `"123"` → False, `"abc.def.ghi-jk"` → False. Erradas: não remover a pontuação (`isdigit` falha no CPF pontuado); conferir só o tamanho (letras passam). Dicas: 1) limpe com dois `replace`; 2) depois confira `isdigit()` e `len`.
- **Erros comuns:** `texto[0] = "A"`; `find` vs `index`.

### n1-m7-02-formatacao-de-texto · Formatação de texto e relatórios

- **Arquivo:** `07-strings-e-texto/02-formatacao-de-texto.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Usar os especificadores de formato de f-strings (largura, alinhamento, zeros, milhar, casas, porcentagem) · Montar uma tabela alinhada em texto a partir de uma lista de registros · Formatar valores monetários no padrão brasileiro
- **Conceitos:** `{:>10}`, `{:<}`, `{:^}`, `{:08.2f}`, `{:,}`, `{:.1%}`, `ljust/rjust/center/zfill`, tabela.
- **Passos (6):**
  1. **Passo 1 · Leitura · O que vem depois dos dois-pontos** — tabela especificador × exemplo × resultado (largura, `<`, `>`, `^`, zeros, `,`, `.2f`, `%`); os resultados aparecem entre colchetes para os espaços ficarem visíveis. Sem outro recurso. No texto, valores em reais levam barra (R\$ 1.234,50).
  2. **Passo 2 · Previsão · Largura e casas** — os colchetes delimitam os espaços; aqui os espaços do meio contam. Dicas: 1) `>6` empurra o texto para a direita em 6 posições; 2) `05d` completa com zeros até 5 dígitos; 3) `.1%` multiplica por 100 e põe o sinal.
     ```python
     print(f"[{'abc':>6}]")
     print(f"[{'abc':<6}]")
     print(f"{42:05d}")
     print(f"{3.14159:.2f}")
     print(f"{0.256:.1%}")
     ```
     ```text
     [   abc]
     [abc   ]
     00042
     3.14
     25.6%
     ```
  3. **Passo 3 · Exercício (lacunas) · Quatro formatos** — adaptação do antigo "Sete formatos" (os outros três viraram a `Previsão`). A saída exata está no enunciado: `[  USP  ]`, `1,234,567`, `[    7.50]`, `50%`. Instruções: 1) centralize `USP` em 7 posições; 2) separe os milhares; 3) mostre 7.5 com duas casas em 8 posições; 4) mostre 0.5 como porcentagem sem casas. Verificação: `io` com `match: exact`. Erradas: `>7` no lugar de `^7`; `.2f` sem a largura 8. Dicas: 1) `^` centraliza; 2) a vírgula separa milhares; 3) a largura vem antes do ponto: `8.2f`.
     ```python
     print(f"[{'USP':___}]")
     print(f"{1234567:___}")
     print(f"[{7.5:___}]")
     print(f"{0.5:___}")
     ```
  4. **Passo 4 · Exercício (código) · formatar_reais(valor)** — `1234.5` → `"R$ 1.234,50"`. Verificação: `call` com 0 (`"R$ 0,00"`), 1234.5, 1000000 (`"R$ 1.000.000,00"`). Erradas: padrão americano (`R$ 1,234.50`); trocar `,` por `.` e depois `.` por `,` sem símbolo intermediário (vira tudo vírgula). Dicas: 1) formate primeiro com `:,.2f`; 2) troque em três etapas, usando um símbolo temporário; 3) acrescente `R$ ` na frente.
  5. **Passo 5 · Quiz · Formatos** — 3 perguntas: o que faz `{:>5}`; o que faz `{:,}`; o que `f"{0.5:.0%}"` produz.
  6. **Passo 6 · Exercício (código) · tabela(produtos)** — lista de tuplas → cabeçalho + linhas (`Produto` em 10 à esquerda, `Qtd` em 5 à direita, `Preço` em 10 à direita com 2 casas); layout exato no enunciado. Verificação: `io` com `match: exact` (via `expr` com `expected_stdout` chamando `tabela(...)`). Erradas: espaços digitados à mão (desalinha com nomes de outro tamanho); preço sem `.2f`. Dicas: 1) use as mesmas larguras no cabeçalho e nas linhas; 2) `<10`, `>5` e `>10.2f`.
- **Erros comuns:** esquecer o `f`; largura menor que o texto.

### n1-m7-03-split-e-join · split, join e linhas

- **Arquivo:** `07-strings-e-texto/03-split-e-join.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Separar strings com split (espaços, vírgulas, separadores arbitrários) e juntar com join · Processar um texto com várias linhas usando splitlines e laços · Converter uma linha de valores separados por vírgula em números e calcular com eles
- **Conceitos:** `split()`, `split(sep)`, `join`, `splitlines`, CSV simples, conversão de campos.
- **Passos (6):**
  1. **Passo 1 · Leitura · Quebrar e juntar** — `split()` sem argumento, `split(sep)`, `join` (o separador é quem chama), `splitlines`; campos de um CSV são textos e precisam de conversão. **Mermaid:** `flowchart LR` — `"texto: Ana,20"` → `"split(',')"` → `"lista: ['Ana', '20']"` → `"';'.join(lista)"` → `"texto: Ana;20"`. **Visualizar** ("`campos` é uma lista de textos; a idade só vira número depois do `int`"):
     ```python
     linha = "Ana,20,Ribeirão Preto"
     campos = linha.split(",")
     idade = int(campos[1])
     de_volta = " | ".join(campos)
     print(idade + 1, de_volta)
     ```
  2. **Passo 2 · Previsão · O que o split devolve** — Dicas: 1) `split()` sem argumento ignora espaços repetidos; `split(" ")` não; 2) as listas aparecem com colchetes e aspas simples.
     ```python
     print("a,b,c".split(","))
     print("um  dois".split())
     print("um  dois".split(" "))
     print("-".join(["x", "y", "z"]))
     print("l1\nl2".splitlines())
     ```
     ```text
     ['a', 'b', 'c']
     ['um', 'dois']
     ['um', '', 'dois']
     x-y-z
     ['l1', 'l2']
     ```
  3. **Passo 3 · Exercício (código) · inverter_palavras(frase) e iniciais(nome)** — Verificação: `call` `"o rato roeu"` → `"roeu rato o"`; `"o  rato"` (dois espaços) → `"rato o"`; `"Ana Clara Souza"` → `"A.C.S."`. Erradas: `split(" ")` (com dois espaços sobra um item vazio); `iniciais` sem o ponto final. Dicas: 1) `split()` sem argumento; 2) `" ".join(lista[::-1])`; 3) cada inicial é seguida de um ponto.
  4. **Passo 4 · Exercício (ordenar) · CSV em variável** — o programa calcula `media_idade` (27.33) e `nome_mais_longo` (`"Caio"`) a partir do texto. Instruções: 1) crie `dados` e separe as linhas, pulando o cabeçalho; 2) para cada linha, separe nome e idade, some a idade e guarde o nome se for o mais longo até agora; 3) depois do laço, calcule a média com duas casas. Solução (10 linhas): `dados = "nome,idade\nAna,20\nBia,35\nCaio,27"`, `linhas = dados.splitlines()[1:]`, `soma = 0`, `nome_mais_longo = ""`, `for linha in linhas:`, `    nome, idade = linha.split(",")`, `    soma += int(idade)`, `    if len(nome) > len(nome_mais_longo):`, `        nome_mais_longo = nome`, `media_idade = round(soma / len(linhas), 2)`. Distratores: `linhas = dados.splitlines()`, `    soma += idade`. Verificação: `variable media_idade == 27.33` (`tolerance 0.01`), `variable nome_mais_longo == "Caio"`. Erradas: incluir o cabeçalho (ValueError em `int("idade")`); dividir por 4. Dicas: 1) o cabeçalho é a primeira linha: a fatia `[1:]` pula; 2) a média só é calculada depois do laço; 3) a linha que guarda o nome fica dentro do `if`.
  5. **Passo 5 · Quiz · split e join** — 3 perguntas: `"a,b".split(",")`; por que `",".join([1, 2])` dá TypeError; diferença entre `split()` e `split(" ")`.
  6. **Passo 6 · Exercício (código) · para_csv(registros)** — lista de tuplas → `"Ana;20\nBia;35"`. Verificação: `call` (dois registros; um registro; lista vazia → `""`). Erradas: `join` com inteiros (TypeError); `\n` sobrando no fim. Dicas: 1) converta cada campo com `str` antes de juntar; 2) junte os campos com `";"` e as linhas com `"\n"`.
- **Erros comuns:** ordem do `join`; `\n` no fim das linhas.

### n1-m7-04-analise-de-texto · Análise de texto

- **Arquivo:** `07-strings-e-texto/04-analise-de-texto.lvl.md` · lição guiada · 120 XP · 50 min
- **Objetivos:** Calcular frequência de palavras e de letras combinando split, dicionários e normalização · Implementar verificações de texto (palíndromo, anagrama) ignorando acentos simples, espaços e maiúsculas · Usar ord() e chr() para deslocar letras e implementar a cifra de César
- **Conceitos:** normalizar → separar → contar; pontuação; palíndromo; anagrama; `ord/chr`; `% 26`; `max(d, key=d.get)`.
- **Passos (7):**
  1. **Passo 1 · Leitura · Normalizar, separar, contar** — as três etapas de quase toda análise de texto; como tirar pontuação; `max(d, key=d.get)`; palíndromo e anagrama. **Mermaid:** `flowchart LR` — `"Oi, oi! Tudo bem?"` → `"minúsculas"` → `"sem pontuação"` → `"split: 4 palavras"` → `"dicionário: oi 2, tudo 1, bem 1"`.
  2. **Passo 2 · Exercício (código) · frequencia_de_palavras(texto)** — minúsculas e sem os sinais `.,!?;:`. Verificação: `call` `"Oi, oi! Tudo bem?"` → `{"oi": 2, "tudo": 1, "bem": 1}`; `""` → `{}`. Erradas: sem `lower` (`Oi` e `oi` separados); pontuação grudada (`oi,`). Dicas: 1) troque cada sinal por espaço; 2) `split()` sem argumento; 3) conte com `get(palavra, 0) + 1`.
  3. **Passo 3 · Exercício (código) · eh_palindromo(frase) e sao_anagramas(a, b)** — ignoram espaços e maiúsculas. Verificação: `call` (`"A base do teto desaba"` → True, `"Python"` → False; `("amor", "Roma")` → True, `("amor", "amar")` → False). Erradas: comparar sem tirar os espaços; anagrama comparando só os tamanhos. Dicas: 1) limpe o texto antes de comparar; 2) um texto invertido é `texto[::-1]`; 3) dois anagramas têm as mesmas letras em ordem: `sorted`.
  4. **Passo 4 · Leitura · Letras são números: a cifra de César** — `ord` e `chr`; deslocar a letra `k` posições e dar a volta no fim do alfabeto. **Fórmula:** `$$c = (p + k) \bmod 26$$`, com `$p$` a posição da letra (a = 0, …, z = 25); exemplo: y está na posição 24 e `$(24 + 3) \bmod 26 = 1$`, que é b. **Visualizar** ("acompanhe uma letra só passar pelas quatro contas"):
     ```python
     letra = "y"
     k = 3
     posicao = ord(letra) - ord("a")
     nova = (posicao + k) % 26
     cifrada = chr(nova + ord("a"))
     print(letra, "->", cifrada)
     ```
  5. **Passo 5 · Previsão · ord, chr e resto** — Dicas: 1) `ord("a")` é 97 e as letras seguintes vêm em sequência; 2) o resto por 26 faz a conta "dar a volta".
     ```python
     print(ord("a"))
     print(chr(ord("a") + 2))
     print((25 + 3) % 26)
     print(sorted("roma") == sorted("amor"))
     print("arara" == "arara"[::-1])
     ```
     ```text
     97
     c
     2
     True
     True
     ```
  6. **Passo 6 · Exercício (código) · cifrar(texto, k) e decifrar(texto, k)** — só letras sem acento; preserva maiúsculas, espaços e pontuação. Verificação: `call` (`("abc xyz", 3)` → `"def abc"`; `("Ola", 1)` → `"Pmb"`); `expr decifrar(cifrar("Bom dia", 5), 5)` esperado `"Bom dia"`. Erradas: sem `% 26` (`z` vira símbolo); cifrar o espaço. Dicas: 1) trabalhe com a posição em relação a `ord("a")` ou `ord("A")`; 2) o que não é letra passa sem mudar; 3) decifrar é cifrar com `-k`.
  7. **Passo 7 · Quiz · Texto** — 3 perguntas: quanto vale `ord("a")` em relação a `ord("b")`; por que o `% 26`; o que é um anagrama.
- **Erros comuns:** acentos (o enunciado evita); `max` de dicionário sem `key`.

### n1-m7-05-projeto-analisador-de-texto · Mini-projeto: analisador de texto

- **Arquivo:** `07-strings-e-texto/05-projeto-analisador-de-texto.lvl.md` · lição guiada · 150 XP · 90 min
- **Objetivos:** Combinar funções de string, dicionários, ordenação e formatação em um programa completo · Produzir um relatório com layout exato a partir de um texto de entrada · Testar cada função isoladamente antes de montar o programa principal
- **Conceitos:** integração de strings, dicionários, ordenação com desempate, formatação, leitura até sentinela.
- **Passos (6):** mini-projeto — só exercícios de código livre, sem `Previsão`.
  1. **Passo 1 · Leitura · O que você vai construir** — especificação, layout exato do relatório e um exemplo completo de entrada e saída. **Mermaid:** `flowchart TD` das etapas — `"ler linhas até FIM"` → `"texto completo"` → três ramos `"estatisticas"`, `"top_palavras"`, `"buscar"` → `"relatório no layout exato"`.
  2. **Passo 2 · Exercício (código) · estatisticas(texto)** — devolve `{"caracteres": n, "palavras": n, "linhas": n, "frases": n}` (frase = trecho não vazio terminado em `.`, `!` ou `?`). Verificação: `call` com dois textos (um de uma linha, um de três linhas com linha vazia no meio). Erradas: contar trecho vazio como frase; contar caracteres sem as quebras de linha quando o enunciado as inclui. Dicas: 1) troque `!` e `?` por `.` e separe por `.`; 2) descarte os trechos vazios com `strip`.
  3. **Passo 3 · Exercício (código) · top_palavras(texto, n)** — lista de tuplas `(palavra, freq)` por frequência decrescente e, em empate, ordem alfabética. Verificação: `call` com empate entre duas palavras. Erradas: sem desempate; ordem crescente de frequência. Dicas: 1) reaproveite a contagem da lição anterior; 2) `key=lambda p: (-p[1], p[0])`; 3) a fatia `[:n]` pega as primeiras.
  4. **Passo 4 · Exercício (código) · buscar(texto, termo)** — números das linhas (a partir de 1) que contêm o termo, sem diferenciar maiúsculas. Verificação: `call` (termo em duas linhas; termo ausente → `[]`). Erradas: sensível a maiúsculas; numeração a partir de 0. Dicas: 1) `lower` nos dois lados; 2) `enumerate(linhas, start=1)`.
  5. **Passo 5 · Exercício (código) · Programa principal** — lê linhas até `FIM` e imprime o relatório no layout do passo 1. Verificação: `io` × 2. Erradas: incluir `FIM` no texto; relatório com linha em branco a mais. Dicas: 1) guarde as linhas em uma lista e junte com `"\n".join`; 2) chame as três funções já prontas.
  6. **Passo 6 · Quiz · Revisão do módulo** — 3 perguntas: por que normalizar antes de contar; como desempatar numa ordenação; `split()` contra `splitlines()`.
- **Erros comuns:** desempate; layout.

## Módulo 8 · Erros, testes e depuração

Tipos de erro e tracebacks, try/except, assert e testes simples, e estratégias de depuração.

- **Recursos do módulo:** diagramas para classificar um erro, ler a cadeia de chamadas de um traceback, seguir o caminho de `try/except/else/finally` e o roteiro de depuração; visualizador como ferramenta de depuração (lições 02 e 04); `lacunas` nas lições 01 e 03 e `ordenar` na 02; `Previsão` nas lições 02 e 04 (sempre com código que termina sem erro).
- **Assets a criar:** nenhum.

### n1-m8-01-tipos-de-erro-e-tracebacks · Tipos de erro e como ler um traceback

- **Arquivo:** `08-erros-testes-e-depuracao/01-tipos-de-erro-e-tracebacks.lvl.md` · lição guiada · 100 XP · 40 min
- **Objetivos:** Classificar um problema como erro de sintaxe, de execução ou de lógica · Reconhecer as exceções mais comuns pela mensagem e pela causa · Ler um traceback com várias chamadas e apontar a linha responsável
- **Conceitos:** sintaxe/execução/lógica; `ValueError`, `TypeError`, `ZeroDivisionError`, `IndexError`, `KeyError`, `NameError`, `AttributeError`; traceback de baixo para cima.
- **Passos (6):**
  1. **Passo 1 · Leitura · Três famílias de erro** — sintaxe, execução (exceção) e lógica; tabela exceção × causa típica × exemplo de uma linha (sete exceções). **Mermaid:** `flowchart TD` de classificação — `{"o programa começou a rodar?"}` —não→ `"erro de sintaxe"`; —sim→ `{"parou com uma mensagem de erro?"}` —sim→ `"erro de execução: uma exceção"`; —não→ `{"a resposta está certa?"}` —não→ `"erro de lógica"`; —sim→ `"sem erro"`.
  2. **Passo 2 · Exercício (lacunas) · Qual exceção** — cinco trechos no enunciado (`int("abc")`, `[1, 2][5]`, `{"a": 1}["b"]`, `10 / 0`, `"5" + 5`); o aluno preenche o nome exato de cada exceção. Instruções: 1) preencha `erro_1` e `erro_2`; 2) preencha `erro_3` e `erro_4`; 3) preencha `erro_5`. Verificação: `variable` × 5 (`"ValueError"`, `"IndexError"`, `"KeyError"`, `"ZeroDivisionError"`, `"TypeError"`). Erradas: `IndexError` e `KeyError` trocados; `erro_5 = "ValueError"`. Dicas: 1) rode cada trecho no editor e leia a última linha da mensagem; 2) lista usa posição (índice), dicionário usa chave. Mesma observação da lição `n1-m1-02` sobre lacuna dentro de aspas.
     ```python
     erro_1 = "___"
     erro_2 = "___"
     erro_3 = "___"
     erro_4 = "___"
     erro_5 = "___"
     ```
  3. **Passo 3 · Leitura · Lendo um traceback** — um traceback real de três níveis, com cada parte anotada (`Traceback (most recent call last)`, arquivo, linha, função, a última linha com o tipo e a mensagem); leitura de baixo para cima. **Mermaid:** `flowchart TD` da cadeia de chamadas do exemplo — `"programa principal, linha 12"` → `"relatorio(), linha 8"` → `"media(), linha 3: o erro acontece aqui"`: o traceback lista as chamadas na mesma ordem, e a última é onde o erro ocorreu.
  4. **Passo 4 · Exercício (código) · Leia o traceback** — traceback de três níveis no enunciado (outro, não o da leitura); registrar `linha_do_erro` (int) e `funcao_do_erro` (str). Verificação: `variable` × 2 com `type`. Erradas: a linha da chamada mais externa; o nome da função que chamou, não a que falhou. Dicas: 1) a última entrada da cadeia é onde o erro aconteceu; 2) a linha aparece depois da palavra `line`.
  5. **Passo 5 · Quiz · Erros** — 3 perguntas: a que família pertence "resposta errada sem mensagem" (lógica); o que quer dizer `most recent call last`; `KeyError` contra `IndexError`.
  6. **Passo 6 · Exercício (código) · Dois bugs** — `media_segura(lista)` com `ZeroDivisionError` na lista vazia (deve devolver 0.0) e um erro de lógica (`len(lista) - 1`). Verificação: `call` `[]` → 0.0, `[4, 6]` → 5.0, `[7]` → 7.0, `tolerance 0.001`. Erradas: corrigir só a lista vazia (a média continua errada); corrigir só o divisor (a lista vazia continua quebrando). Dicas: 1) trate a lista vazia primeiro; 2) teste com `[4, 6]` e faça a conta à mão.
- **Erros comuns:** ler só a primeira linha do traceback.

### n1-m8-02-try-e-except · try e except

- **Arquivo:** `08-erros-testes-e-depuracao/02-try-e-except.lvl.md` · lição guiada · 120 XP · 50 min
- **Objetivos:** Envolver código arriscado em try/except e capturar exceções específicas · Usar else e finally e explicar quando cada bloco executa · Repetir a leitura de uma entrada até ela ser válida usando try/except dentro de um laço
- **Conceitos:** `try/except Tipo`, múltiplos `except`, `except:` nu, `else`, `finally`, `as e`, `raise`, leitura robusta.
- **Passos (7):**
  1. **Passo 1 · Leitura · Tentar e tratar** — `try`/`except Tipo`; só o trecho arriscado vai dentro do `try`; por que capturar a exceção específica e não `except:` nu. **Visualizar** ("na segunda volta a execução pula do `int` direto para o `except`"):
     ```python
     entradas = ["42", "abc"]
     for texto in entradas:
         try:
             numero = int(texto)
             print("número:", numero)
         except ValueError:
             print("não é número:", texto)
     print("fim")
     ```
  2. **Passo 2 · Exercício (ordenar) · para_inteiro(texto)** — devolve o número ou `None`. Instruções: 1) monte a função com o `int(texto)` dentro do `try`; 2) capture só o `ValueError` e devolva `None` nesse caso. Solução (5 linhas): `def para_inteiro(texto):`, `    try:`, `        return int(texto)`, `    except ValueError:`, `        return None`. Distratores: `    except:`. Verificação: `call` `"42"` → 42, `"4.2"` → None, `"abc"` → None; `source uses try`; `source catches ValueError`. Erradas: `except:` nu (reprova em `catches ValueError`); `int(texto)` fora do `try`. Dicas: 1) `try` e `except` ficam no mesmo nível; 2) o que cada um faz fica um nível à direita.
  3. **Passo 3 · Exercício (código) · dividir_seguro(a, b)** — devolve `None` na divisão por zero. Verificação: `call` (10, 2) → 5.0, (1, 0) → None + `source catches ZeroDivisionError`. Erradas: `if b == 0` sem `try` (o enunciado pede tratar a exceção; reprova em `catches`); `except ValueError` (não captura). Dicas: 1) a divisão vai dentro do `try`; 2) o nome da exceção está na mensagem de `10 / 0`.
  4. **Passo 4 · Leitura · else, finally e raise** — quando cada bloco roda; `except Tipo as e`; `raise ValueError("mensagem")` para avisar quem chamou. **Mermaid:** `flowchart TD` — `"try"` → `{"deu exceção?"}` —sim→ `"except"`; —não→ `"else"`; os dois → `"finally: roda sempre"` → `"segue o programa"`.
  5. **Passo 5 · Previsão · Quais blocos rodam** — o código trata a exceção, então termina sem erro. Dicas: 1) `else` só roda quando não houve exceção; 2) `finally` roda nas duas chamadas.
     ```python
     def testar(divisor):
         try:
             resultado = 10 / divisor
         except ZeroDivisionError:
             print("divisão por zero")
         else:
             print("resultado:", resultado)
         finally:
             print("fim do teste")


     testar(2)
     testar(0)
     ```
     ```text
     resultado: 5.0
     fim do teste
     divisão por zero
     fim do teste
     ```
  6. **Passo 6 · Exercício (código) · Idade válida** — lê até receber um inteiro entre 0 e 120; mensagens `Digite um número inteiro.` e `Idade fora do intervalo.`; ao final `Idade: 30`. Verificação: `io` com `abc\n200\n30` e com `0`. Erradas: sem `break` (não termina); converter fora do `try` (quebra com `abc`). Dicas: 1) `while True` + `try` + `break`; 2) depois de converter, confira o intervalo; 3) cada problema tem a sua mensagem.
  7. **Passo 7 · Quiz · try e except** — 3 perguntas: a ordem dos blocos `try/except/else/finally`; por que `except:` nu é ruim; quando o `finally` roda.
- **Erros comuns:** `try` envolvendo tudo; `except Exception` genérico.

### n1-m8-03-assert-e-testes-simples · assert e testes simples

- **Arquivo:** `08-erros-testes-e-depuracao/03-assert-e-testes-simples.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Escrever funções de teste com assert cobrindo casos típicos, de borda e inválidos · Interpretar uma falha de assert e localizar o defeito na função testada · Implementar uma função a partir dos testes dados (test-first)
- **Conceitos:** lista de casos antes, borda, mensagem no assert, `testar_x()`, mutantes.
- **Passos (5):**
  1. **Passo 1 · Leitura · Primeiro os casos, depois o código** — tabela de casos (típico, borda, inválido) para `media`; mensagem no `assert`; como ler a falha de um `assert`; o que é um "mutante" (uma versão defeituosa que os testes devem pegar). Sem outro recurso.
  2. **Passo 2 · Exercício (lacunas) · media(lista)** — os asserts do enunciado definem o comportamento (`[]` → `None`, `[5]` → 5.0, `[1, 2]` → 1.5). Instruções: 1) complete o teste da lista vazia e o que devolver nesse caso; 2) complete o divisor. Verificação: `call` com os três casos (`type: NoneType` no primeiro; `tolerance 0.001` nos outros). Erradas: sem o tratamento da lista vazia (ZeroDivisionError); devolver 0 na lista vazia. Dicas: 1) a lista vazia tem tamanho 0; 2) o primeiro assert diz o que devolver nesse caso; 3) a média divide pela quantidade de itens.
     ```python
     def media(lista):
         if len(lista) == ___:
             return ___
         return sum(lista) / ___
     ```
  3. **Passo 3 · Exercício (código) · testar_eh_palindromo()** — asserts exigidos (`"arara"`, `"abc"`, `""`, `"Ana"` com maiúsculas ignoradas). Verificação: `source defines_function`; `expr` com implementação correta no `setup` (sem erro); `expr` com o mutante `lambda s: s == s[::-1]` (não ignora maiúsculas) e `raises: AssertionError`; mutante `lambda s: True` idem. Erradas: só casos positivos (não pega `lambda s: True`); sem o caso `"Ana"` (não pega o mutante das maiúsculas). Dicas: 1) inclua um caso que deve dar False; 2) inclua um caso com maiúscula e minúscula misturadas.
  4. **Passo 4 · Quiz · Testes** — 3 perguntas: por que não comparar float com `==`; por que `assert (x, "msg")` passa sempre; por que testar a borda.
  5. **Passo 5 · Exercício (código) · Ache o bug** — `contar_vogais` com dois defeitos (`"aeiou"` sem tratar maiúsculas e `range(len(s) - 1)`); os testes dados no enunciado apontam quais casos falham. Verificação: `call` (`"Abacaxi"` → 4, `"casa"` → 2, `""` → 0). Erradas: corrigir só as maiúsculas (a última letra continua de fora); corrigir só o `range`. Dicas: 1) rode os testes e leia qual falha primeiro; 2) um caso que termina em vogal mostra o segundo defeito.
- **Erros comuns:** esquecer de chamar o teste.

### n1-m8-04-depuracao · Depuração: encontrando o bug

- **Arquivo:** `08-erros-testes-e-depuracao/04-depuracao.lvl.md` · lição guiada · 110 XP · 45 min
- **Objetivos:** Seguir um roteiro de depuração (reproduzir, isolar, inspecionar, corrigir, testar de novo) · Usar print estratégico e o teste de mesa para localizar bugs de lógica · Corrigir programas com bugs plantados sem reescrevê-los do zero
- **Conceitos:** reproduzir, isolar, inspecionar (`print(f"{x=}")`), reduzir, teste de mesa, não deixar prints.
- **Passos (7):**
  1. **Passo 1 · Leitura · Um roteiro para achar o bug** — os cinco passos; `print(f"{x=}")`; o visualizador como teste de mesa automático; tirar os `print` de inspeção antes de entregar. **Mermaid:** `flowchart LR` em ciclo — `"reproduzir"` → `"isolar"` → `"inspecionar"` → `"corrigir"` → `"testar de novo"` → `{"passou?"}` —não→ volta a `"isolar"`; —sim→ `"pronto"`.
  2. **Passo 2 · Previsão · O print de inspeção** — Dicas: 1) o `=` dentro das chaves mostra a expressão e o valor; 2) texto aparece com aspas simples nesse formato.
     ```python
     x = 3
     nome = "Ana"
     print(f"{x=}")
     print(f"{nome=}")
     print(f"{x * 2=}")
     ```
     ```text
     x=3
     nome='Ana'
     x * 2=6
     ```
  3. **Passo 3 · Exercício (código) · Bug 1: um a menos** — `media` dividindo por `len(lista) - 1`. Verificação: `call` `[2, 2]` → 2.0, `[1, 2, 3]` → 2.0, `tolerance 0.001`. Erradas: `len(lista) + 1`; devolver a soma sem dividir. Dicas: 1) teste com `[2, 2]`: a média tem de ser 2; 2) imprima o divisor.
  4. **Passo 4 · Exercício (código) · Bug 2: acumulador no lugar errado** — `soma_pares` zera `total` dentro do `for`. A narrativa traz o programa com defeito no **Visualizar** ("avance e veja `total` voltar a zero a cada volta"):
     ```python
     def soma_pares(numeros):
         for n in numeros:
             total = 0
             if n % 2 == 0:
                 total += n
         return total


     print(soma_pares([2, 4, 5]))
     ```
     Verificação: `call` `[2, 4, 5]` → 6, `[1, 3]` → 0, `[]` → 0. Erradas: mover `total = 0` para dentro do `if`; tirar a linha `total = 0` (NameError). Dicas: 1) o acumulador nasce antes do laço; 2) com a lista vazia a função ainda precisa devolver 0.
  5. **Passo 5 · Exercício (código) · Bug 3: and e or** — `senha_valida` com `len(senha) >= 8 and tem_digito or tem_maiuscula` sem parênteses (a regra é: 8 ou mais caracteres e, além disso, dígito ou maiúscula). Verificação: `call` com 4 casos (`"Ab"` → False; `"abcdefgh"` → False; `"abcdefg1"` → True; `"Abcdefgh"` → True). Erradas: parênteses em volta do `and` (não muda nada); trocar o `or` por `and` (exige os dois). Dicas: 1) monte a tabela-verdade com `"Ab"`; 2) o `and` é avaliado antes do `or`: use parênteses.
  6. **Passo 6 · Quiz · Depuração** — 3 perguntas: qual o primeiro passo do roteiro (reproduzir); por que um `print` esquecido reprova uma verificação de saída; por que não apagar o teste que falha.
  7. **Passo 7 · Exercício (código) · Bug 4: altera a entrada** — `ordenada(lista)` usa `lista.sort()` e devolve `lista`; deve devolver uma lista nova. Verificação: `call` `[3, 1, 2]` → `[1, 2, 3]` + `expr` (`setup: original = [3, 1, 2]; r = ordenada(original)`, `expr: original`, esperado `[3, 1, 2]`). Erradas: `return lista.sort()` (devolve `None`); copiar depois de ordenar. Dicas: 1) `sorted` devolve uma lista nova; 2) confira a lista original depois da chamada.
- **Erros comuns:** mudar linhas ao acaso.

## Módulo 9 · Projeto do nível

O projeto final: um gerenciador de tarefas em modo texto com menu, prioridades, busca e relatório.

- **Recursos do módulo:** dois diagramas (quem chama quem; o laço do menu), um bloco `visualizar` com o estado (lista de dicionários) e uma `Previsão` sobre a regra dos ids. Todos os exercícios são de **código livre**: sem `lacunas` e sem `ordenar`.
- **Assets a criar:** nenhum.

### n1-m9-01-gerenciador-de-tarefas · Projeto final: gerenciador de tarefas em modo texto

- **Arquivo:** `09-projeto-do-nivel/01-gerenciador-de-tarefas.lvl.md` · projeto do nível (`projeto: true`) · 300 XP · 240 min
- **Objetivos:** Projetar um programa com estado (lista de dicionários) manipulado por funções puras e testáveis · Implementar um menu interativo com validação de entrada e mensagens exatas · Aplicar listas, dicionários, funções, strings, laços, condicionais e try/except em um único programa · Entregar um programa que passa em todos os casos de verificação (funções e interação completa)
- **Conceitos:** estado em lista de dicionários, funções que recebem o estado por parâmetro, validação com `ValueError`, ordenação com chave, relatório formatado, menu com `while True`.
- **Especificação:** seção **Projeto final** abaixo (assinaturas, layout do relatório, menu, exemplo de sessão). Os passos 3 a 7 continuam o mesmo `main.py`: só o passo 3 tem `### Código inicial`; os seguintes o omitem (o aluno segue do código do passo anterior).
- **Passos (8):**
  1. **Passo 1 · Leitura · O que você vai construir** — objetivo, formato de uma tarefa, a lista das funções exigidas, layout do relatório, menu e a sessão de exemplo completa (sem abreviar o menu). **Mermaid:** `flowchart TD` de quem chama quem — `"executar(): lê, chama e imprime"` → `"criar_tarefa"`, `"listar"`, `"concluir"`, `"remover"`, `"buscar"`, `"relatorio"` e `"ordenar_por_prioridade"` → todos apontando para `"tarefas: lista de dicionários"`. Mostra que só `executar` fala com o usuário. **Visualizar** ("o estado do programa inteiro é esta lista"):
     ```python
     tarefas = []
     tarefas.append({"id": 1, "titulo": "Estudar", "prioridade": "alta", "concluida": False})
     tarefas.append({"id": 2, "titulo": "Lavar a louça", "prioridade": "media", "concluida": False})
     tarefas[1]["concluida"] = True
     pendentes = [t for t in tarefas if not t["concluida"]]
     print(len(tarefas), len(pendentes))
     ```
  2. **Passo 2 · Previsão · Qual é o próximo id?** — prepara a regra "ids não são reaproveitados" antes de `criar_tarefa`. Dicas: 1) `pop(1)` tira a tarefa da posição 1; 2) compare os dois jeitos de calcular o próximo id: pelo tamanho e pelo maior id.
     ```python
     tarefas = [{"id": 1}, {"id": 2}, {"id": 3}]
     tarefas.pop(1)
     ids = [t["id"] for t in tarefas]
     print(ids)
     print(len(tarefas) + 1)
     print(max(ids) + 1)
     ```
     ```text
     [1, 3]
     3
     4
     ```
  3. **Passo 3 · Exercício (código) · criar_tarefa** — estrutura do arquivo e `criar_tarefa(tarefas, titulo, prioridade="media")`. Instruções: 1) calcule o id (maior id + 1, ou 1 na lista vazia); 2) valide título (`strip`, não vazio) e prioridade, levantando `ValueError`; 3) acrescente a tarefa à lista e devolva o dicionário. Verificação: `call` com dois cenários; `expr` com `raises ValueError` × 2; `expr` conferindo o id depois de uma remoção e `len(tarefas)`. Erradas: id = `len(tarefas) + 1` (reaproveita ids); sem `strip` no título; aceitar a prioridade `"urgente"`. Dicas: 1) o próximo id é o `max` dos ids + 1, ou 1 se não houver tarefas; 2) valide antes de inserir; 3) `raise ValueError("...")` interrompe a função.
  4. **Passo 4 · Exercício (código) · listar, concluir e remover** — Instruções: 1) `listar` devolve uma lista nova (todas ou só as pendentes), em ordem de id; 2) `concluir` marca e devolve `True`, ou `False` se o id não existe; 3) `remover` tira a tarefa e devolve `True`, ou `False`. Verificação: `call` + `expr` (a verificação altera o retorno de `listar` e confere que a original ficou intacta). Erradas: `listar` devolvendo a própria lista; `concluir` levantando exceção em id inexistente; `remover` por posição em vez de id. Dicas: 1) construa a lista de resposta com um laço ou compreensão; 2) procure a tarefa comparando `t["id"]`; 3) se o laço terminar sem achar, devolva `False`.
  5. **Passo 5 · Exercício (código) · buscar e ordenar_por_prioridade** — Instruções: 1) `buscar` ignora maiúsculas e os espaços nas pontas do termo; 2) `ordenar_por_prioridade` devolve uma lista nova, `alta` antes de `media` antes de `baixa`, com empate decidido pelo id. Verificação: `call` (busca com maiúsculas trocadas; ordenação com empate) + `source calls sorted`. Erradas: busca sensível a maiúsculas; ordenação alfabética da prioridade (`alta`, `baixa`, `media`); sem desempate por id. Dicas: 1) `lower()` nos dois lados da comparação; 2) um dicionário `{"alta": 0, "media": 1, "baixa": 2}` dá a ordem; 3) a chave de ordenação pode ser uma tupla `(ordem, id)`.
  6. **Passo 6 · Exercício (código) · relatorio** — devolve o texto no layout da especificação, sem `print`. Verificação: `call` com a lista vazia, só pendentes e mista (string exata). Erradas: linha em branco no fim; `[X]` maiúsculo; contagem de pendentes e concluídas trocada. Dicas: 1) monte uma lista de linhas e junte com `"\n".join`; 2) a segunda linha tem três contagens; 3) `[x]` para concluída, `[ ]` para pendente.
  7. **Passo 7 · Exercício (código) · executar: o menu** — a narrativa traz o **Mermaid:** `flowchart TD` do laço — `"imprimir o menu"` → `"ler a opção"` → `{"qual opção?"}` —0→ `"Até logo!"` (fim); —1 a 6→ `"chamar a função e imprimir o resultado"` → volta ao menu; —outra→ `"Opção inválida."` → volta ao menu. Instruções: 1) imprima o menu antes de cada leitura; 2) trate as opções 1 a 6 com as mensagens exatas; 3) trate id não numérico com `try/except ValueError`; 4) encerre na opção 0 e repita depois de opção inválida. Verificação: `io` em 4 sessões (fluxo feliz da especificação; opção inválida seguida de `0`; concluir id inexistente e id não numérico; buscar sem resultado). Erradas: menu impresso uma vez só; `int(input())` sem tratamento; não repetir depois de opção inválida. Dicas: 1) um `while True` com `break` na opção 0; 2) converta o id dentro de `try/except ValueError`; 3) uma função `mostrar_menu()` chamada antes de cada `input()`.
  8. **Passo 8 · Quiz · Autoavaliação** — 3 perguntas: por que as funções recebem `tarefas` por parâmetro; por que os ids não são reaproveitados; por que `listar` devolve uma lista nova.
- **Erros comuns:** alterar a lista global dentro das funções; mensagens fora do padrão; menu que não se repete.

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

