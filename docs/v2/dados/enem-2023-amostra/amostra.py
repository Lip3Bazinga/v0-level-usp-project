"""Amostra do ENEM 2023 (INEP) para o projeto do N4.

Fonte: microdados do ENEM 2023, INEP — https://download.inep.gov.br/microdados/microdados_enem_2023.zip
(sha256 do zip baixado em 2026-11-16: 19512b7e29c9c8e940554396969722081341caa275c245a6c9d2d559c5d13a0a).
Recorte: inscritos que concluíam o ensino médio em 2023 (TP_ST_CONCLUSAO == 2), sorteados por reservoir
sampling com random.Random(2023); só as colunas abaixo, na ordem original das linhas sorteadas.
Uso: python -I amostra.py microdados_enem_2023.zip enem_amostra.csv 3000
"""
import csv, io, random, sys, zipfile

COLUNAS = ["SG_UF_PROVA", "TP_ESCOLA", "Q006", "TP_PRESENCA_MT", "NU_NOTA_MT", "NU_NOTA_LC", "NU_NOTA_REDACAO"]
caminho_zip, saida, n = sys.argv[1], sys.argv[2], int(sys.argv[3])
rng = random.Random(2023)
z = zipfile.ZipFile(caminho_zip)
nome = next(x for x in z.namelist() if x.endswith("MICRODADOS_ENEM_2023.csv"))
reservatorio, vistos = [], 0
with z.open(nome) as f:
    leitor = csv.reader(io.TextIOWrapper(f, encoding="latin-1", newline=""), delimiter=";")
    cab = next(leitor)
    idx = {c: cab.index(c) for c in COLUNAS + ["TP_ST_CONCLUSAO"]}
    for linha in leitor:
        if linha[idx["TP_ST_CONCLUSAO"]] != "2":
            continue
        registro = (vistos, [linha[idx[c]] for c in COLUNAS])
        if vistos < n:
            reservatorio.append(registro)
        else:
            j = rng.randrange(vistos + 1)
            if j < n:
                reservatorio[j] = registro
        vistos += 1
reservatorio.sort(key=lambda r: r[0])
with open(saida, "w", encoding="utf-8", newline="") as out:
    w = csv.writer(out, delimiter=";", lineterminator="\n")
    w.writerow(COLUNAS)
    for _, valores in reservatorio:
        w.writerow(valores)
print(f"concluintes 2023 no arquivo: {vistos}; amostra: {len(reservatorio)}")
