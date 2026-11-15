---
slug: n2-m2-01-import-e-modulos-proprios
titulo: import e módulos próprios
descricao: 'Dividir o programa em arquivos: criar um módulo, importar funções e entender o que acontece na importação.'
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
- Criar um módulo próprio em outro arquivo e importá-lo de três formas (import, from-import, as)
- Explicar o que o Python executa ao importar e por que o código de topo roda uma vez
- Usar if __name__ == '__main__' para separar biblioteca de script
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Módulo = arquivo `.py`; `import utils`, `from utils import f`, `import numpy as np` (a forma que o Nível 4 usa); a importação executa o módulo uma vez (`sys.modules`); `__name__`; o padrão `if __name__ == "__main__":`; organização de um projeto em `main.py` + módulos. Na plataforma, exercícios com múltiplos arquivos (`path=utils.py`).

**Exercícios previstos.** Criar `conversoes.py` com `celsius_para_fahrenheit` e `km_para_milhas` e usar em `main.py` (`expr` com `setup: from conversoes import ...`); mover funções de um `main.py` inchado para `texto.py` mantendo a saída (`io` + `source imports texto`); adicionar o guarda `__main__` a um módulo que imprime ao ser importado (`expr` importando e exigindo `expected_stdout` vazio); quiz sobre `from x import *` e sobre `as`.

**Erros comuns a cobrir.** Nomear o arquivo como um módulo da biblioteca (`random.py`) e quebrar o `import random`; importação circular; `from modulo import funcao` e depois alterar uma variável do módulo esperando efeito; esquecer o guarda e rodar código de teste ao importar.
