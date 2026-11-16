import csv, sys, statistics as st
from collections import Counter, defaultdict
rows = list(csv.DictReader(open(sys.argv[1], encoding="utf-8"), delimiter=";"))
print("TP_ESCOLA:", Counter(r["TP_ESCOLA"] for r in rows))
print("presença MT:", Counter(r["TP_PRESENCA_MT"] for r in rows))
print("Q006:", sorted(Counter(r["Q006"] for r in rows).items()))
ok = [r for r in rows if r["TP_PRESENCA_MT"] == "1" and r["NU_NOTA_MT"] and r["TP_ESCOLA"] in ("2", "3")]
print("válidos MT com escola:", len(ok), Counter(r["TP_ESCOLA"] for r in ok))
m = {e: st.mean(float(r["NU_NOTA_MT"]) for r in ok if r["TP_ESCOLA"] == e) for e in ("2", "3")}
print("média MT pública/privada:", round(m["2"], 1), round(m["3"], 1), "dif", round(m["3"] - m["2"], 1))
# controle pela renda: diferença dentro de faixas agrupadas de Q006
faixa = lambda q: "baixa(A-C)" if q <= "C" else ("media(D-H)" if q <= "H" else "alta(I-Q)")
g = defaultdict(list)
for r in ok: g[(faixa(r["Q006"]), r["TP_ESCOLA"])].append(float(r["NU_NOTA_MT"]))
difs = []
for f in ("baixa(A-C)", "media(D-H)", "alta(I-Q)"):
    a, b = g[(f, "2")], g[(f, "3")]
    d = st.mean(b) - st.mean(a); difs.append((d, len(a) + len(b)))
    print(f, "n pub", len(a), "n priv", len(b), "dif", round(d, 1))
print("dif média ponderada dentro das faixas:", round(sum(d * n for d, n in difs) / sum(n for _, n in difs), 1))
# regressão MT ~ privada + renda (Q006 como ordinal 0..16), mínimos quadrados à mão
import itertools
X = [(1.0, 1.0 if r["TP_ESCOLA"] == "3" else 0.0, float(ord(r["Q006"]) - ord("A"))) for r in ok]
y = [float(r["NU_NOTA_MT"]) for r in ok]
def ols(X, y):
    k = len(X[0]); A = [[sum(x[i] * x[j] for x in X) for j in range(k)] for i in range(k)]; b = [sum(x[i] * yy for x, yy in zip(X, y)) for i in range(k)]
    for i in range(k):
        p = A[i][i]
        for j in range(i + 1, k):
            f = A[j][i] / p; A[j] = [aj - f * ai for aj, ai in zip(A[j], A[i])]; b[j] -= f * b[i]
    c = [0.0] * k
    for i in reversed(range(k)): c[i] = (b[i] - sum(A[i][j] * c[j] for j in range(i + 1, k))) / A[i][i]
    return c
print("coef privada sem renda:", round(ols([x[:2] for x in X], y)[1], 1), "| com renda:", [round(v, 1) for v in ols(X, y)])
