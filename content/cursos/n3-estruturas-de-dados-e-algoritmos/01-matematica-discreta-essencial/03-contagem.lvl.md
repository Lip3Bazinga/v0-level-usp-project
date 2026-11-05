---
slug: n3-m1-03-contagem
titulo: 'Contagem: permutações, combinações e o princípio da casa dos pombos'
descricao: Regras da soma e do produto, fatorial, arranjos, combinações, triângulo de Pascal e estimativas de 'quantas possibilidades existem'.
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
- Aplicar as regras da soma e do produto para contar possibilidades
- Calcular permutações, arranjos e combinações e implementá-los sem estouro
- Usar contagem para estimar o custo de força bruta (senhas, caixeiro viajante) e o limite da casa dos pombos
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Regras da soma e do produto; permutações (n!), arranjos e combinações (C(n, k)) com `math.comb`/`math.perm` e implementação própria por Pascal (`C(n,k) = C(n-1,k-1) + C(n-1,k)`) — gancho para programação dinâmica; explosão combinatória (quantas senhas de 8 caracteres? quantas rotas para 15 cidades?); casa dos pombos (duas pessoas com o mesmo número de amigos numa festa; colisões de hash).

**Exercícios previstos.** `combinacoes(n, k)` via Pascal com memoização (`call` com n = 60); `contar_senhas(alfabeto, tamanho, sem_repetir)` (`call`); `anagramas_distintos(palavra)` com letras repetidas (`call` para `"banana"` = 60); `tempo_forca_bruta(n, por_segundo)` devolvendo anos (`call` com `tolerance`); quiz sobre arranjo vs combinação.

**Erros comuns a cobrir.** Usar arranjo quando a ordem não importa; `math.factorial` em n grande para C(n,k) (ok em Python, mas explicar overflow em outras linguagens); dividir por repetições erradas em anagramas.
