-- LevelUSP: Seed de lições iniciais para demo/MVP
-- Execute no SQL Editor do Supabase após rodar schema.sql

-- ═══════════════════════════════════════════════════════════════
-- Módulo: Python Básico
-- ═══════════════════════════════════════════════════════════════

INSERT INTO lessons (title, slug, module, "order", difficulty, content_markdown, starter_code, hidden_tests, xp_reward, time_limit, published)
VALUES

-- Lição 1: Olá Mundo
(
  'Olá, Mundo!',
  'ola-mundo',
  'Python Básico',
  1,
  'iniciante',
  '# Olá, Mundo!

Sua primeira missão é simples: faça o Python dizer **"Olá, Mundo!"**.

## O que você vai aprender
- Como usar a função `print()`
- Como executar um programa Python

## Instrução
Use a função `print()` para exibir a mensagem exata:

```
Olá, Mundo!
```

> **Dica:** Lembre-se de usar aspas ao redor do texto!',

  '# Escreva seu código abaixo
',

  'import unittest
import io, sys

class TestOlaMundo(unittest.TestCase):
    def test_output(self):
        captured = io.StringIO()
        sys.stdout = captured
        exec(open("/dev/stdin").read() if False else compile(user_code, "<string>", "exec"))
        sys.stdout = sys.__stdout__
        self.assertIn("Olá, Mundo!", captured.getvalue())

# Runner simplificado - o worker já lida com isso
assert "print" in user_code, "Use a função print() para exibir a mensagem."
import io, sys
captured = io.StringIO()
old_stdout = sys.stdout
sys.stdout = captured
exec(user_code)
sys.stdout = old_stdout
output = captured.getvalue().strip()
assert output == "Olá, Mundo!", f"Esperado: Olá, Mundo! | Recebido: {output}"
print("TESTS_PASSED")',

  50,
  300,
  true
),

-- Lição 2: Variáveis
(
  'Variáveis e Tipos',
  'variaveis-e-tipos',
  'Python Básico',
  2,
  'iniciante',
  '# Variáveis e Tipos de Dados

Variáveis são como **caixas** onde guardamos informações.

## Tipos básicos
- `str` → texto: `"Olá"`
- `int` → número inteiro: `42`
- `float` → número decimal: `3.14`
- `bool` → verdadeiro/falso: `True`, `False`

## Instrução
Crie três variáveis:
1. `nome` com seu nome (texto)
2. `idade` com um número inteiro
3. `nota` com um número decimal

Depois, imprima cada uma usando `print()`.

> O output deve ter **exatamente 3 linhas**, uma para cada variável.',

  '# Crie as variáveis abaixo
nome = ""
idade = 0
nota = 0.0

# Imprima cada uma
',

  'assert isinstance(nome, str) and len(nome) > 0, "A variável nome deve ser uma string não vazia."
assert isinstance(idade, int), "A variável idade deve ser um número inteiro (int)."
assert isinstance(nota, float), "A variável nota deve ser um número decimal (float)."
import io, sys
captured = io.StringIO()
old_stdout = sys.stdout
sys.stdout = captured
exec(user_code)
sys.stdout = old_stdout
lines = [l for l in captured.getvalue().strip().split("\n") if l.strip()]
assert len(lines) == 3, f"Esperado 3 linhas de output, recebido {len(lines)}."
print("TESTS_PASSED")',

  75,
  300,
  true
),

-- Lição 3: Condicionais
(
  'Condicionais: if, elif, else',
  'condicionais-if-elif-else',
  'Python Básico',
  3,
  'iniciante',
  '# Condicionais

Condicionais permitem que seu programa tome **decisões**.

## Sintaxe
```python
if condição:
    # código se verdadeiro
elif outra_condição:
    # código alternativo
else:
    # código se nenhuma condição for verdadeira
```

## Instrução
Crie uma função `classificar_nota(nota)` que recebe um número e retorna:
- `"A"` se nota >= 9
- `"B"` se nota >= 7
- `"C"` se nota >= 5
- `"D"` se nota < 5',

  'def classificar_nota(nota):
    # Escreva sua lógica aqui
    pass
',

  'result_a = classificar_nota(10)
assert result_a == "A", f"classificar_nota(10) deveria retornar A, retornou {result_a}"
result_a2 = classificar_nota(9)
assert result_a2 == "A", f"classificar_nota(9) deveria retornar A, retornou {result_a2}"
result_b = classificar_nota(7.5)
assert result_b == "B", f"classificar_nota(7.5) deveria retornar B, retornou {result_b}"
result_c = classificar_nota(5)
assert result_c == "C", f"classificar_nota(5) deveria retornar C, retornou {result_c}"
result_d = classificar_nota(3)
assert result_d == "D", f"classificar_nota(3) deveria retornar D, retornou {result_d}"
print("TESTS_PASSED")',

  100,
  600,
  true
),

-- Lição 4: Loops
(
  'Loops: for e while',
  'loops-for-while',
  'Python Básico',
  4,
  'intermediario',
  '# Loops

Loops permitem **repetir** blocos de código.

## for loop
```python
for i in range(5):
    print(i)  # imprime 0, 1, 2, 3, 4
```

## while loop
```python
contador = 0
while contador < 5:
    print(contador)
    contador += 1
```

## Instrução
Crie uma função `soma_ate(n)` que retorna a soma de todos os números de 1 até `n` (inclusive).

Exemplo: `soma_ate(5)` → `15` (1+2+3+4+5)',

  'def soma_ate(n):
    # Escreva sua lógica aqui
    pass
',

  'assert soma_ate(1) == 1, f"soma_ate(1) deveria retornar 1, retornou {soma_ate(1)}"
assert soma_ate(5) == 15, f"soma_ate(5) deveria retornar 15, retornou {soma_ate(5)}"
assert soma_ate(10) == 55, f"soma_ate(10) deveria retornar 55, retornou {soma_ate(10)}"
assert soma_ate(100) == 5050, f"soma_ate(100) deveria retornar 5050, retornou {soma_ate(100)}"
print("TESTS_PASSED")',

  100,
  600,
  true
),

-- Lição 5: Listas
(
  'Listas e Operações',
  'listas-e-operacoes',
  'Python Básico',
  5,
  'intermediario',
  '# Listas

Listas são coleções **ordenadas** de elementos.

## Criando listas
```python
frutas = ["maçã", "banana", "laranja"]
numeros = [1, 2, 3, 4, 5]
```

## Operações comuns
- `lista.append(x)` — adiciona ao final
- `lista.remove(x)` — remove primeira ocorrência
- `len(lista)` — tamanho da lista
- `lista[0]` — primeiro elemento
- `lista[-1]` — último elemento

## Instrução
Crie uma função `estatisticas(numeros)` que recebe uma lista de números e retorna um **dicionário** com:
- `"soma"`: soma de todos os elementos
- `"media"`: média dos elementos
- `"maior"`: maior valor
- `"menor"`: menor valor',

  'def estatisticas(numeros):
    # Escreva sua lógica aqui
    pass
',

  'r = estatisticas([1, 2, 3, 4, 5])
assert r["soma"] == 15, f"soma deveria ser 15, é {r[''soma'']}"
assert r["media"] == 3.0, f"media deveria ser 3.0, é {r[''media'']}"
assert r["maior"] == 5, f"maior deveria ser 5, é {r[''maior'']}"
assert r["menor"] == 1, f"menor deveria ser 1, é {r[''menor'']}"
r2 = estatisticas([10, 20, 30])
assert r2["soma"] == 60
assert r2["media"] == 20.0
assert r2["maior"] == 30
assert r2["menor"] == 10
print("TESTS_PASSED")',

  125,
  600,
  true
);
