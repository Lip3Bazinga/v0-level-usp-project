---
slug: n2-m7-01-projeto-biblioteca
titulo: 'Projeto 1: biblioteca com empréstimos'
descricao: Sistema de biblioteca com classes, herança, exceções próprias, persistência em JSON e relatórios, organizado em pacote e testado.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 300
tempo_min: 180
publicada: false
projeto: true
solucao_apos_tentativas: 3
objetivos:
- Modelar um domínio com classes, herança e exceções próprias (Item → Livro/Revista, Usuario, Emprestimo, Biblioteca)
- Persistir e recarregar o estado completo em JSON preservando os tipos
- Organizar o código em um pacote com módulos e uma suíte unittest que cobre as regras de negócio
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Projeto exigido para o certificado. Especificação: pacote `biblioteca/` com `modelos.py` (dataclasses `Livro`, `Revista` herdando de `Item`; `Usuario` com limite de 3 empréstimos), `erros.py` (`ItemIndisponivel`, `LimiteDeEmprestimos`, `ItemNaoEncontrado`), `servico.py` (classe `Biblioteca` com `cadastrar`, `emprestar`, `devolver` com multa por atraso de R\$ 1,00/dia, `relatorio_atrasados(data)`), `persistencia.py` (`salvar`/`carregar` JSON) e `tests/test_servico.py` (`unittest`, mínimo 8 testes). Datas via `datetime.date` com data de referência passada por parâmetro (sem `date.today()` para ser testável).

**Passos previstos.** Leitura (especificação, regras, exemplos de uso e critérios) → modelos e exceções (`expr` + `raises`) → `emprestar`/`devolver` com regras (`expr` em cenários: limite, indisponível, atraso) → persistência ida e volta (`expr`) → relatório (`call`) → suíte de testes (`unittest` `expect: pass` com `min_tests: 8` e mutantes `expect: fail`: ignora limite, ignora atraso, não marca devolução) → quiz de autoavaliação.

**Erros comuns a cobrir.** `date.today()` hardcoded; multa calculada com dias negativos; estado duplicado (lista de empréstimos no usuário e na biblioteca divergindo); JSON sem reconstruir as subclasses certas (`Livro` vs `Revista`); testes sem `setUp` repetindo cadastro.
