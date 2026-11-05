---
slug: n1-m7-02-formatacao-de-texto
titulo: Formatação de texto e relatórios
descricao: Alinhamento, largura fixa, zeros à esquerda, separador de milhar, porcentagem e tabelas alinhadas com f-strings.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Usar os especificadores de formato de f-strings (largura, alinhamento, zeros, milhar, casas, porcentagem)
- Montar uma tabela alinhada em texto a partir de uma lista de registros
- Formatar valores monetários no padrão brasileiro
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `{valor:>10}`, `{:<}`, `{:^}`, `{:08.2f}`, `{:,}` e o truque para vírgula brasileira (`replace`), `{:.1%}`, `{:d}`; `ljust`/`rjust`/`center` e `zfill`; cabeçalho + linhas de uma tabela; `print` com `sep` e `end`. Exemplo central: extrato bancário alinhado.

**Passos previstos.** Leitura (especificadores) → Exercício: imprimir sete valores com os formatos pedidos (`io` exato) → Exercício: `formatar_reais(valor)` devolvendo `R$ 1.234,56` (`call`) → Quiz (3 perguntas) → Exercício: `tabela(produtos)` imprimindo cabeçalho e linhas alinhadas em colunas de larguras fixas (`io` exato com o layout no enunciado).

**Erros comuns a cobrir.** Esquecer o `f`; `{:.2f}` em string; largura menor que o conteúdo (não corta — explicar); milhar com vírgula no padrão americano quando se pede o brasileiro; alinhar com espaços manuais.
