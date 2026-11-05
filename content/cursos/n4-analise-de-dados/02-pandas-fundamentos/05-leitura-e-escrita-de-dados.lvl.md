---
slug: n4-m2-05-leitura-e-escrita-de-dados
titulo: 'Leitura e escrita: CSV, JSON e Excel'
descricao: read_csv com separador, decimal, encoding, parse_dates, dtype e usecols; read_json; to_csv; o que fazer quando o arquivo 'não abre'.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Ler CSVs brasileiros (sep=';', decimal=',', encoding latin-1) e datas com parse_dates
- Controlar dtypes e colunas na leitura e escrever CSV/JSON de volta
- Diagnosticar problemas comuns de leitura (cabeçalho, linhas de rodapé, milhares)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `read_csv(sep, decimal, thousands, encoding, parse_dates, dayfirst, dtype, usecols, skiprows, na_values)`; `read_json` (orient); `to_csv(index=False)`; `io.StringIO` para dados embutidos (como os exercícios fazem, pois não há rede); Excel citado (`openpyxl` não disponível no sandbox); checar `dtypes` depois de ler.

**Exercícios previstos.** `carregar_vendas(texto_csv)` com `;`, `,` decimal e datas `dd/mm/aaaa` resultando em dtypes exatos (`expr` conferindo `dtypes.astype(str).to_dict()`); `ler_com_rodape(texto)` pulando linhas (`expr`); `exportar(df)` devolvendo o CSV como texto com `;` e sem índice (`call` comparando string); `ler_json_registros(texto)` (`expr`); quiz sobre `dayfirst` e `encoding`.

**Erros comuns a cobrir.** Datas lidas como texto (sem `parse_dates`); `decimal` esquecido deixando números como `object`; `index=True` gerando coluna `Unnamed: 0`; `latin-1` vs `utf-8`.
