---
slug: n2-m4-05-mini-projeto-agenda-persistente
titulo: 'Mini-projeto: agenda de contatos persistente'
descricao: Uma agenda com classes, exceções próprias, exportação CSV e persistência JSON, pronta para virar o projeto do nível.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 150
tempo_min: 90
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Combinar classes, exceções próprias e persistência em JSON em um programa coeso
- Exportar e importar CSV mantendo os dados consistentes
- Separar domínio (classes) de persistência (módulo de arquivos) e de interface (menu)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Arquitetura em três camadas com arquivos separados: `contatos.py` (dataclass `Contato`, classe `Agenda` com adicionar/remover/buscar e `ContatoDuplicado`), `persistencia.py` (`salvar_json`, `carregar_json`, `exportar_csv`), `main.py` (menu). Validação de telefone e e-mail simples. Carregar na abertura, salvar a cada alteração.

**Exercícios previstos.** `Agenda.adicionar` com duplicidade por e-mail (`expr` + `raises ContatoDuplicado`); `buscar(termo)` por nome ou e-mail insensível a maiúsculas (`expr`); `salvar_json`/`carregar_json` preservando acentos (`expr`); `exportar_csv` com `;` (`expr` lendo o arquivo); menu principal com `io` em duas sessões; quiz de revisão do módulo.

**Erros comuns a cobrir.** Persistir objetos direto no JSON (`TypeError`); carregar o arquivo e não reconstruir as dataclasses; duplicidade verificada só pelo nome; salvar só ao sair (perda em erro).
