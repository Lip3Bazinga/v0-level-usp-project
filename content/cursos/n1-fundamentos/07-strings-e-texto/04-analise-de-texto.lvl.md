---
slug: n1-m7-04-analise-de-texto
titulo: Análise de texto
descricao: Contar palavras e frequências, detectar palíndromos, contar vogais e implementar a cifra de César com ord e chr.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Calcular frequência de palavras e de letras combinando split, dicionários e normalização
- Implementar verificações de texto (palíndromo, anagrama) ignorando acentos simples, espaços e maiúsculas
- Usar ord() e chr() para deslocar letras e implementar a cifra de César
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Pipeline de análise: normalizar → separar → contar; remoção de pontuação com `replace` ou com `isalpha`; palíndromo com fatia invertida; anagrama com `sorted`; `ord`/`chr` e a aritmética das letras (`(ord(c) - ord("a") + k) % 26`); palavra mais frequente com `max(d, key=d.get)`.

**Passos previstos.** Leitura (pipeline e normalização) → Exercício: `frequencia_de_palavras(texto)` ignorando maiúsculas e pontuação listada (`call`) → Exercício: `eh_palindromo(frase)` e `sao_anagramas(a, b)` (`call` com "Socorram-me, subi no ônibus em Marrocos" simplificado sem acentos) → Leitura (ord e chr) → Exercício: `cifrar(texto, k)` e `decifrar(texto, k)` preservando espaços e maiúsculas (`call`) → Quiz (3 perguntas).

**Erros comuns a cobrir.** Contar `"Casa"` e `"casa"` separadamente; deixar pontuação grudada na palavra; deslocar além de `z` sem `% 26`; cifrar também os espaços; comparar palíndromo sem remover espaços.
