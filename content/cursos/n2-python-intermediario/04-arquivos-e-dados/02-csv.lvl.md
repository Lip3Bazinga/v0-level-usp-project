---
slug: n2-m4-02-csv
titulo: CSV com o módulo csv
descricao: Ler e escrever tabelas com csv.reader, DictReader e DictWriter, separadores e conversão de tipos.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Ler CSV com reader e DictReader e converter campos numéricos
- Escrever CSV com writer e DictWriter, inclusive com ponto e vírgula
- Agregar dados de um CSV (totais, médias, agrupamento) sem pandas
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Por que não usar `split(",")` (aspas, vírgulas no campo); `csv.reader` e `csv.DictReader`; `delimiter=";"` para o padrão brasileiro do Excel; `newline=""` na escrita; `DictWriter` com `fieldnames` e `writeheader`; conversões (`float(linha["preco"].replace(",", "."))`); agregação com dicionário. Preparação direta para o pandas do Nível 4.

**Exercícios previstos.** `total_por_categoria(caminho)` a partir de `vendas.csv` fornecido (`call`); `exportar_relatorio(caminho, registros)` com `DictWriter` e `;` (`expr` lendo o arquivo gerado); `filtrar_csv(entrada, saida, coluna, valor)` (`expr`); quiz sobre `newline=""` e `DictReader`.

**Erros comuns a cobrir.** Linhas em branco extras no Windows sem `newline=""`; cabeçalho lido como dado com `reader`; `float("12,50")`; esquecer `delimiter`.
