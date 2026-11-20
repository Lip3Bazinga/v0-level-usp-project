# Terminal no navegador (Fase F, item 5)

Terminal para o aluno rodar o código sem o botão "Executar": `python arquivo.py`, `python` (REPL),
`ls`, `cat`, `clear`, `pip list` e `help`. É xterm.js sobre o **mesmo** Pyodide e o **mesmo** worker do
"Executar" e do Visualizar. O resultado é só pedagógico; a correção oficial continua no servidor.

## Decisão: sem COOP/COEP e sem SharedArrayBuffer

`input()` precisa esperar o aluno digitar com o Python parado no meio da execução, e Ctrl+C precisa
interromper um laço. A solução clássica é `SharedArrayBuffer` + `Atomics.wait` (e `setInterruptBuffer` do
Pyodide), que só existe em página com isolamento de origem cruzada (`Cross-Origin-Opener-Policy:
same-origin` + `Cross-Origin-Embedder-Policy`). Avaliação do custo no LevelUSP:

| Opção | Efeito |
|---|---|
| COEP `require-corp` | Todo recurso de outra origem precisa de CORP/CORS. Quebra as imagens remotas (a CSP libera `img-src https:`) e os iframes de vídeo. Descartada. |
| COEP `credentialless` | Imagens e demais recursos sem credencial continuam carregando. Mas um documento isolado só pode incorporar iframes que também sejam compatíveis com COEP, e YouTube e Vimeo não enviam o cabeçalho. O atributo `<iframe credentialless>` resolve só no Chromium; Firefox e Safari bloqueiam o vídeo. Como os vídeos das aulas (`::video[...]`, `VIDEO_FRAME_ORIGINS` em `next.config.mjs`) são conteúdo central, o risco não compensa. |
| Só uma rota com COOP/COEP | Não serve: o terminal fica na mesma página do player (com vídeo), e o isolamento vale para o documento de topo inteiro. |
| **Sem cabeçalhos (escolhida)** | Nenhum cabeçalho global muda; vídeos, imagens e login ficam como estão. |

Como o terminal funciona sem `SharedArrayBuffer`:

- **`input()` (suspensão de pilha, JSPI).** O Python roda dentro de `callPromising` e `input()` usa
  `pyodide.ffi.run_sync` sobre uma Promise que só resolve quando a página manda `term-input`. Enquanto
  espera, o worker continua recebendo mensagens (a resposta `term-input` não passa pela fila de
  comandos). Funciona onde o navegador tem JSPI (Chrome/Edge atuais; o runtime detecta com
  `can_run_sync()`). É o caminho testado em Node com o Pyodide real.
- **`input()` (reexecução, navegadores sem JSPI).** `input()` interrompe o programa (`_NeedInput`), a página
  pede a linha ao aluno e o programa roda de novo com as respostas já dadas; o que ele já imprimiu não é
  repetido (contagem de caracteres) e o `random` usa a mesma semente. Limites: efeitos colaterais
  repetem (um `open("a", "a")` acrescenta de novo; relógio e rede mudam) e programas com `except:` puro
  podem engolir a interrupção. No REPL esse caminho não existe: `input()` mostra um erro que manda usar
  `python arquivo.py`.
- **Ctrl+C e o botão "Parar".** Mata o worker (igual ao "Parar" do Executar) e sobe outro. No REPL as
  variáveis são perdidas e o terminal avisa. Ctrl+C no prompt só descarta a linha (ou o bloco incompleto).

Se um dia o isolamento for necessário (por exemplo, Ctrl+C sem perder o REPL), a rota é COOP
`same-origin` + COEP `credentialless` com os vídeos em `<iframe credentialless>`, medindo antes o
suporte do Firefox e do Safari. Não é preciso hoje.

## Estrutura

- `src/lib/python/terminal-execution.ts` (worker): código Python do terminal, carregado no escopo do
  harness do Executar (reaproveita `/work`, o corte de saída de 64 000 caracteres, o traceback só com
  quadros do aluno e a coleta de figuras do matplotlib). Sincroniza os arquivos da lição em `/work` a
  cada comando (o que o programa criou continua; o que saiu da lição é removido) e usa `code.InteractiveConsole` no REPL.
- `src/lib/python/worker-protocol.ts`, `python-worker.ts`: comandos `term-*` no mesmo worker.
- `src/lib/python/terminal-client.ts`: lado da página (um comando por vez, saída em blocos).
- `src/lib/terminal/`: `line-editor.ts` (teclas, histórico), `shell.ts` (comandos, `help`, `pip list`),
  `terminal-session.ts` (fases prompt/busy/input, REPL, Ctrl+C), `library-manifest.provisional.ts`.
- `src/hooks/use-terminal.ts` e `src/components/terminal/`: xterm.js carregado por `import()` dinâmico
  dentro de um componente `next/dynamic` (fora do bundle inicial) e `ConsoleTerminalTabs`, o ponto de
  encaixe em `exercise-step.tsx`.

## Acessibilidade

xterm em `screenReaderMode`, rótulo pt-BR na entrada, Tab nunca é capturado (WCAG 2.1.2: o foco sai
do terminal), botão "Parar" e abas Console/Terminal com setas. Gráficos do matplotlib num painel ao
lado com texto alternativo e aviso em região `status`. Em REPL, o gráfico só aparece quando a linha
chama `show(`.

## Pendências e riscos

- **Manifesto de bibliotecas.** O `pip list` lê `library-manifest.provisional.ts` (versões do
  `pyodide-lock.json`, conferidas por teste). Quando o manifesto do item 1 existir em
  `@levelusp/contracts`, trocar só o corpo de `listBrowserLibraries()` para filtrar `browser: true`.
- **Worker único.** O terminal divide o worker com o Executar: um programa esperando `input()` bloqueia o
  "Executar" até o aluno responder ou apertar Ctrl+C. O Executar tem tempo limite (reinicia o worker),
  o terminal não: quem para é Ctrl+C/"Parar".
- **Bibliotecas.** O terminal usa o que a lição já instalou (as de `lesson.libraries`, via `usePython`);
  `pip install` é recusado com explicação.
- **Navegadores.** O caminho de reexecução (sem JSPI) tem teste com o Pyodide real, mas nenhum teste
  manual em Firefox e Safari foi feito aqui. Sem e2e (Playwright) para o terminal.
- **Encaixe.** Só o player de exercícios (`exercise-step.tsx`) ganhou a aba. A página `/lesson/[id]` e o
  `/ide` continuam só com Console. O item 4 (Executar por nível) deve ligar o terminal onde o botão for bloqueado.
