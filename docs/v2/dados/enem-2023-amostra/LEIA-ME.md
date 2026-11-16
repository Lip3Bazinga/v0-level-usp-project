# Amostra do ENEM 2023 — projeto do Nível 4

Dados do projeto `n4-m7-01-projeto-analise-de-dados-reais` (decisão do Filipe, 2026-11-16).

- **Fonte:** Microdados do ENEM 2023, Instituto Nacional de Estudos e Pesquisas Educacionais Anísio
  Teixeira (INEP), <https://download.inep.gov.br/microdados/microdados_enem_2023.zip>, baixado em
  2026-11-16 (sha256 do zip: `19512b7e29c9c8e940554396969722081341caa275c245a6c9d2d559c5d13a0a`).
  Dados públicos e anonimizados pelo INEP; a amostra não traz número de inscrição.
- **Recorte (`amostra.py`):** inscritos que concluíam o ensino médio em 2023 (`TP_ST_CONCLUSAO == 2`,
  1 401 164 no arquivo — só eles respondem o tipo de escola), 3 000 sorteados por reservoir sampling com
  `random.Random(2023)`, na ordem original. Colunas: `SG_UF_PROVA`, `TP_ESCOLA` (2 pública, 3 privada),
  `Q006` (renda mensal da família, faixas A–Q do questionário), `TP_PRESENCA_MT` (0 faltou, 1 presente,
  2 eliminado), `NU_NOTA_MT`, `NU_NOTA_LC`, `NU_NOTA_REDACAO`. Separador `;`, decimal `.`, UTF-8.
- **Tamanho:** 65 358 caracteres (limite do formato: 100 000 por arquivo de passo).
- **O que os dados mostram (`confere.py`):** 700 faltosos em matemática (notas em branco) e 2 eliminados;
  média de matemática 499,2 (pública, n = 1 804) contra 633,8 (privada, n = 494), diferença de 134,6;
  dentro de faixas de renda a diferença cai para 71–90 (ponderada: 80,4) e, numa regressão com a renda
  como ordinal, o coeficiente da escola privada é 70,3 — diminui, mas não desaparece.
- **Refazer:** `python -I amostra.py microdados_enem_2023.zip enem_amostra.csv 3000`.
