---
slug: n2-m4-04-pathlib-e-sistema-de-arquivos
titulo: pathlib e o sistema de arquivos
descricao: 'Caminhos como objetos: montar, listar, criar pastas, checar existência e percorrer árvores com Path.'
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
- Construir caminhos com Path e / de forma portável entre sistemas
- Listar, filtrar por extensão e percorrer pastas com iterdir, glob e rglob
- Criar, renomear e remover arquivos e pastas com segurança (exists, mkdir(parents, exist_ok))
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `Path("dados") / "entrada.csv"`; `.name`, `.stem`, `.suffix`, `.parent`; `exists`, `is_file`, `mkdir(parents=True, exist_ok=True)`; `read_text`/`write_text`; `iterdir`, `glob("*.txt")`, `rglob`; `rename`, `unlink`; `shutil` em uma frase; caminhos absolutos vs relativos ao diretório de trabalho (`Path.cwd()`).

**Exercícios previstos.** `organizar_por_extensao(pasta)` que move arquivos para subpastas pelo sufixo (`expr` com `setup` criando arquivos e checando a estrutura final); `maior_arquivo(pasta)` (`expr`); `renomear_em_lote(pasta, prefixo)` (`expr`); quiz sobre `/` com `Path` e sobre `exist_ok`.

**Erros comuns a cobrir.** Concatenar caminhos com `+` e barras literais; `mkdir` sem `exist_ok` em pasta existente (`FileExistsError`); `glob` sem considerar maiúsculas na extensão; apagar sem checar `is_file`.
