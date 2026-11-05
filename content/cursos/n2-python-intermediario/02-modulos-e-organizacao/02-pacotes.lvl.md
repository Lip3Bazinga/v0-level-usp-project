---
slug: n2-m2-02-pacotes
titulo: Pacotes e estrutura de projeto
descricao: Pastas com __init__.py, importações relativas e absolutas e a estrutura de um projeto Python pequeno.
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
- Organizar módulos em um pacote com __init__.py e importar com caminho pontilhado
- Diferenciar importação absoluta e relativa e escolher a absoluta por padrão
- Descrever a estrutura básica de um projeto (src, tests, README, requirements)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Pacote = pasta com `__init__.py`; `from loja.estoque import Produto`; o que colocar no `__init__.py` (reexportar nomes); importações relativas (`from .precos import ...`) e por que preferir absolutas; subpacotes; layout de projeto (`src/`, `tests/`, `README.md`, `requirements.txt`, `pyproject.toml` em uma frase).

**Exercícios previstos.** Montar o pacote `loja/` com `estoque.py` e `precos.py` e um `main.py` que os usa (arquivos múltiplos; `expr` com `setup: from loja.estoque import Produto`); reexportar no `__init__.py` para permitir `from loja import Produto` (`expr`); corrigir importações relativas quebradas (`expr`); quiz sobre `__init__.py` vazio e sobre nomes de pacotes.

**Erros comuns a cobrir.** Esquecer `__init__.py` (funciona como namespace package, mas confunde — explicar); importação relativa em script executado diretamente (`ImportError: attempted relative import`); nome do pacote com hífen; dependência circular entre módulos do pacote.
