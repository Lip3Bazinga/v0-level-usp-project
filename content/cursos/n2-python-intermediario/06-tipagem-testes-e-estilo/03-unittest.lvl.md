---
slug: n2-m6-03-unittest
titulo: Testes automatizados com unittest
descricao: TestCase, asserções, setUp, testes de exceção e a organização de uma suíte de testes.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever classes TestCase com métodos test_ e as asserções adequadas (assertEqual, assertAlmostEqual, assertRaises, assertIn)
- Usar setUp para preparar objetos comuns e organizar testes por comportamento
- Escrever testes que detectam defeitos (matam mutantes) e não só confirmam o caso feliz
---

## Passo 1 · Leitura · Do assert solto ao unittest

No Nível 1 você testou funções assim:

```python
def testar_media():
    assert media([6, 8]) == 7.0, "dois valores"
    assert media([5]) == 5.0, "um valor"
    assert media([]) is None, "lista vazia"
```

Funciona, mas tem dois problemas. O primeiro `assert` que falha **para tudo**: se o primeiro caso quebra, você não sabe se os outros dois passam. E a mensagem diz só o que você escreveu; o valor que a função devolveu de fato fica escondido.

O módulo `unittest`, da biblioteca padrão, resolve os dois. Cada caso vira um **método** de uma classe que herda de `unittest.TestCase`:

```python
import unittest


class TestMedia(unittest.TestCase):
    def test_dois_valores(self):
        self.assertEqual(media([6, 8]), 7.0)

    def test_um_valor(self):
        self.assertEqual(media([5]), 5.0)

    def test_lista_vazia(self):
        self.assertIsNone(media([]))
```

No terminal, `python -m unittest` procura os arquivos `test*.py` da pasta, roda **todos** os métodos cujo nome começa com `test` e mostra um resumo. Com uma `media` que devolve `0` na lista vazia:

```text
.F.
======================================================================
FAIL: test_lista_vazia (test_notas.TestMedia.test_lista_vazia)
----------------------------------------------------------------------
Traceback (most recent call last):
  File "C:\projeto\test_notas.py", line 18, in test_lista_vazia
    self.assertIsNone(media([]))
    ~~~~~~~~~~~~~~~~~^^^^^^^^^^^
AssertionError: 0 is not None

----------------------------------------------------------------------
Ran 3 tests in 0.001s

FAILED (failures=1)
```

A primeira linha tem um caractere por teste: `.` passou, `F` falhou. Os outros dois rodaram mesmo com a falha, e a mensagem mostra **o valor obtido**: `0 is not None`.

#### As asserções do dia a dia

| Método | Passa quando |
|---|---|
| `assertEqual(a, b)` | `a == b` (mostra os dois valores se falhar) |
| `assertTrue(x)` / `assertFalse(x)` | `x` é verdadeiro / falso |
| `assertIsNone(x)` | `x is None` |
| `assertIn(item, colecao)` | `item in colecao` |
| `assertAlmostEqual(a, b)` | `a` e `b` são iguais até a 7ª casa decimal |
| `assertRaises(Erro)` | o bloco `with` levanta `Erro` |

```python
def test_percentual_invalido(self):
    with self.assertRaises(ValueError):
        aplicar_desconto(10.0, 120)
```

#### Dois erros comuns

- **Método sem o prefixo `test`.** `def media_vazia(self):` não roda, e não aparece nenhum aviso: o resumo só mostra um teste a menos.
- **`assertEqual` com `float`.** `10.1 * 0.7` dá `7.069999999999999`, e `assertEqual(..., 7.07)` falha mesmo com a conta certa. Para decimais, use `assertAlmostEqual`.

Nesta plataforma, a verificação roda a sua classe de testes como o `python -m unittest` faria: não escreva `unittest.main()` no arquivo.

## Passo 2 · Exercício · Sua primeira suíte
modo: lacunas

Complete as lacunas (`___`) da suíte de `aplicar_desconto(preco, percentual)`, que devolve o preço com o desconto e recusa percentuais fora de 0 a 100. Uma **suíte** é o conjunto de testes de uma classe.

A verificação vai rodar os seus testes contra a função correta (todos precisam passar) e contra versões com defeito, os **mutantes** (algum teste precisa falhar em cada uma).

### Instruções
1. Faça a classe herdar de `TestCase` e dê ao primeiro método um nome que o `unittest` encontre: `test_sem_desconto`.
2. Escolha a asserção certa para comparar `aplicar_desconto(50.0, 50)` com `25.0`.
3. Escolha a asserção certa para o desconto que dá um número com casas decimais.
   Dica: `10.1 * 0.7` dá `7.069999999999999`.
4. Complete o `with` que exige `ValueError` para o percentual 120.

### Código inicial
```python
import unittest


def aplicar_desconto(preco, percentual):
    if not 0 <= percentual <= 100:
        raise ValueError("percentual fora de 0 a 100")
    return preco * (1 - percentual / 100)


class TestAplicarDesconto(unittest.___):
    def ___(self):
        self.assertEqual(aplicar_desconto(80.0, 0), 80.0)

    def test_metade(self):
        self.___(aplicar_desconto(50.0, 50), 25.0)

    def test_desconto_quebrado(self):
        self.___(aplicar_desconto(10.1, 30), 7.07)

    def test_percentual_invalido(self):
        with self.___(ValueError):
            aplicar_desconto(10.0, 120)
```

### Solução
```python
import unittest


def aplicar_desconto(preco, percentual):
    if not 0 <= percentual <= 100:
        raise ValueError("percentual fora de 0 a 100")
    return preco * (1 - percentual / 100)


class TestAplicarDesconto(unittest.TestCase):
    def test_sem_desconto(self):
        self.assertEqual(aplicar_desconto(80.0, 0), 80.0)

    def test_metade(self):
        self.assertEqual(aplicar_desconto(50.0, 50), 25.0)

    def test_desconto_quebrado(self):
        self.assertAlmostEqual(aplicar_desconto(10.1, 30), 7.07)

    def test_percentual_invalido(self):
        with self.assertRaises(ValueError):
            aplicar_desconto(10.0, 120)
```

### Dicas
1. O `unittest` só roda métodos cujo nome começa com `test`, em classes que herdam de `unittest.TestCase`.
2. Para decimais que podem ter resto de arredondamento, a asserção tem `Almost` no nome.
3. A asserção de exceção é usada com `with` e recebe a classe da exceção.

### Verificação
```json
[
  { "id": "referencia", "checkpoint": 1, "kind": "unittest", "test_class": "TestAplicarDesconto", "target": "aplicar_desconto",
    "implementation": "def aplicar_desconto(preco, percentual):\n    if not 0 <= percentual <= 100:\n        raise ValueError('percentual fora de 0 a 100')\n    return preco * (1 - percentual / 100)\n",
    "expect": "pass", "min_tests": 4, "name": "Os quatro testes rodam e passam com a função correta",
    "hint": "Confira se todos os métodos começam com test e se a asserção do decimal tolera o arredondamento." },
  { "id": "suite-propria", "checkpoint": 1, "kind": "unittest", "test_class": "TestAplicarDesconto", "expect": "pass", "min_tests": 4,
    "name": "A suíte também passa com a função do seu arquivo" },
  { "id": "mutante-devolve-desconto", "checkpoint": 2, "kind": "unittest", "test_class": "TestAplicarDesconto", "target": "aplicar_desconto",
    "implementation": "def aplicar_desconto(preco, percentual):\n    if not 0 <= percentual <= 100:\n        raise ValueError('percentual fora de 0 a 100')\n    return preco * percentual / 100\n",
    "expect": "fail", "name": "Pega a versão que devolve o valor do desconto em vez do preço" },
  { "id": "mutante-trunca", "checkpoint": 3, "kind": "unittest", "test_class": "TestAplicarDesconto", "target": "aplicar_desconto",
    "implementation": "def aplicar_desconto(preco, percentual):\n    if not 0 <= percentual <= 100:\n        raise ValueError('percentual fora de 0 a 100')\n    return float(int(preco * (1 - percentual / 100)))\n",
    "expect": "fail", "name": "Pega a versão que corta os centavos" },
  { "id": "mutante-sem-validacao", "checkpoint": 4, "kind": "unittest", "test_class": "TestAplicarDesconto", "target": "aplicar_desconto",
    "implementation": "def aplicar_desconto(preco, percentual):\n    return preco * (1 - percentual / 100)\n",
    "expect": "fail", "name": "Pega a versão que aceita percentual acima de 100" }
]
```

### Soluções erradas
```python name="assertEqual com decimal"
import unittest


def aplicar_desconto(preco, percentual):
    if not 0 <= percentual <= 100:
        raise ValueError("percentual fora de 0 a 100")
    return preco * (1 - percentual / 100)


class TestAplicarDesconto(unittest.TestCase):
    def test_sem_desconto(self):
        self.assertEqual(aplicar_desconto(80.0, 0), 80.0)

    def test_metade(self):
        self.assertEqual(aplicar_desconto(50.0, 50), 25.0)

    def test_desconto_quebrado(self):
        self.assertEqual(aplicar_desconto(10.1, 30), 7.07)

    def test_percentual_invalido(self):
        with self.assertRaises(ValueError):
            aplicar_desconto(10.0, 120)
```
```python name="método sem o prefixo test"
import unittest


def aplicar_desconto(preco, percentual):
    if not 0 <= percentual <= 100:
        raise ValueError("percentual fora de 0 a 100")
    return preco * (1 - percentual / 100)


class TestAplicarDesconto(unittest.TestCase):
    def sem_desconto(self):
        self.assertEqual(aplicar_desconto(80.0, 0), 80.0)

    def test_metade(self):
        self.assertEqual(aplicar_desconto(50.0, 50), 25.0)

    def test_desconto_quebrado(self):
        self.assertAlmostEqual(aplicar_desconto(10.1, 30), 7.07)

    def test_percentual_invalido(self):
        with self.assertRaises(ValueError):
            aplicar_desconto(10.0, 120)
```
```python name="assertTrue no lugar de assertRaises"
import unittest


def aplicar_desconto(preco, percentual):
    if not 0 <= percentual <= 100:
        raise ValueError("percentual fora de 0 a 100")
    return preco * (1 - percentual / 100)


class TestAplicarDesconto(unittest.TestCase):
    def test_sem_desconto(self):
        self.assertEqual(aplicar_desconto(80.0, 0), 80.0)

    def test_metade(self):
        self.assertEqual(aplicar_desconto(50.0, 50), 25.0)

    def test_desconto_quebrado(self):
        self.assertAlmostEqual(aplicar_desconto(10.1, 30), 7.07)

    def test_percentual_invalido(self):
        with self.assertTrue(ValueError):
            aplicar_desconto(10.0, 120)
```
```python name="herda de TestSuite"
import unittest


def aplicar_desconto(preco, percentual):
    if not 0 <= percentual <= 100:
        raise ValueError("percentual fora de 0 a 100")
    return preco * (1 - percentual / 100)


class TestAplicarDesconto(unittest.TestSuite):
    def test_sem_desconto(self):
        self.assertEqual(aplicar_desconto(80.0, 0), 80.0)

    def test_metade(self):
        self.assertEqual(aplicar_desconto(50.0, 50), 25.0)

    def test_desconto_quebrado(self):
        self.assertAlmostEqual(aplicar_desconto(10.1, 30), 7.07)

    def test_percentual_invalido(self):
        with self.assertRaises(ValueError):
            aplicar_desconto(10.0, 120)
```

## Passo 3 · Exercício · Testes que pegam defeitos no CPF

Agora a suíte é toda sua. A função `validar_cpf(texto)` do código inicial está correta: ela aceita o CPF com ou sem pontuação, confere os dois dígitos verificadores (os dois últimos, calculados a partir dos nove primeiros) e recusa CPFs com os 11 dígitos iguais, que passam na conta mas não existem.

Use estes exemplos, já conferidos:

| Chamada | Esperado | Por quê |
|---|---|---|
| `validar_cpf("529.982.247-25")` | `True` | válido, com pontuação |
| `validar_cpf("52998224725")` | `True` | válido, só dígitos |
| `validar_cpf("529.982.247-24")` | `False` | primeiro verificador certo, segundo errado |
| `validar_cpf("529.982.247-15")` | `False` | primeiro verificador errado |
| `validar_cpf("111.111.111-11")` | `False` | todos os dígitos iguais |
| `validar_cpf("5299822472")` | `False` | só 10 dígitos |

A verificação roda a sua suíte contra a função correta e contra cinco mutantes: um que aceita tudo, um que só confere o tamanho, um que esquece dos dígitos repetidos, um que recusa a pontuação e um que confere só o primeiro verificador. Escreva **um teste por comportamento**, com um nome que diga qual é.

### Instruções
1. Escreva a classe `TestValidarCpf` com pelo menos 4 métodos `test_`, que passam com a função correta.
2. Cubra os CPFs válidos, com e sem pontuação.
3. Cubra os inválidos: cada verificador errado, os dígitos repetidos e o tamanho errado.
   Dica: um mutante que aceita tudo passa em qualquer teste que só espera `True`.

### Código inicial
```python
import unittest


def validar_cpf(texto):
    digitos = [int(c) for c in texto if c.isdigit()]
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return False
    for tamanho in (9, 10):
        pesos = range(tamanho + 1, 1, -1)
        soma = sum(d * p for d, p in zip(digitos[:tamanho], pesos))
        if digitos[tamanho] != soma * 10 % 11 % 10:
            return False
    return True


class TestValidarCpf(unittest.TestCase):
    pass
```

### Solução
```python
import unittest


def validar_cpf(texto):
    digitos = [int(c) for c in texto if c.isdigit()]
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return False
    for tamanho in (9, 10):
        pesos = range(tamanho + 1, 1, -1)
        soma = sum(d * p for d, p in zip(digitos[:tamanho], pesos))
        if digitos[tamanho] != soma * 10 % 11 % 10:
            return False
    return True


class TestValidarCpf(unittest.TestCase):
    def test_valido_com_pontuacao(self):
        self.assertTrue(validar_cpf("529.982.247-25"))

    def test_valido_so_digitos(self):
        self.assertTrue(validar_cpf("52998224725"))

    def test_segundo_verificador_errado(self):
        self.assertFalse(validar_cpf("529.982.247-24"))

    def test_primeiro_verificador_errado(self):
        self.assertFalse(validar_cpf("529.982.247-15"))

    def test_digitos_repetidos(self):
        self.assertFalse(validar_cpf("111.111.111-11"))

    def test_tamanho_errado(self):
        self.assertFalse(validar_cpf("5299822472"))
```

### Dicas
1. Um teste que só confere CPFs válidos não pega o mutante que aceita tudo: inclua os inválidos.
2. Para cada linha da tabela, pergunte qual mutante ela derruba. O de `"111.111.111-11"` derruba o que esquece os repetidos.
3. Use `assertTrue` e `assertFalse`: a função devolve um booleano.

### Verificação
```json
[
  { "id": "referencia", "checkpoint": 1, "kind": "unittest", "test_class": "TestValidarCpf", "target": "validar_cpf",
    "implementation": "def validar_cpf(texto):\n    digitos = [int(c) for c in texto if c.isdigit()]\n    if len(digitos) != 11 or len(set(digitos)) == 1:\n        return False\n    for tamanho in (9, 10):\n        soma = sum(d * p for d, p in zip(digitos[:tamanho], range(tamanho + 1, 1, -1)))\n        if digitos[tamanho] != soma * 10 % 11 % 10:\n            return False\n    return True\n",
    "expect": "pass", "min_tests": 4, "name": "Pelo menos 4 testes, todos passando com a função correta",
    "hint": "Confira os valores esperados na tabela do enunciado." },
  { "id": "mutante-recusa-pontuacao", "checkpoint": 2, "kind": "unittest", "test_class": "TestValidarCpf", "target": "validar_cpf",
    "implementation": "def validar_cpf(texto):\n    if not texto.isdigit():\n        return False\n    digitos = [int(c) for c in texto]\n    if len(digitos) != 11 or len(set(digitos)) == 1:\n        return False\n    for tamanho in (9, 10):\n        soma = sum(d * p for d, p in zip(digitos[:tamanho], range(tamanho + 1, 1, -1)))\n        if digitos[tamanho] != soma * 10 % 11 % 10:\n            return False\n    return True\n",
    "expect": "fail", "name": "Pega a versão que recusa CPF com pontuação", "hint": "Teste um CPF válido escrito com pontos e traço." },
  { "id": "mutante-aceita-tudo", "checkpoint": 3, "kind": "unittest", "test_class": "TestValidarCpf", "target": "validar_cpf",
    "implementation": "def validar_cpf(texto):\n    return True\n",
    "expect": "fail", "name": "Pega a versão que aceita tudo", "hint": "Inclua casos que devem dar False." },
  { "id": "mutante-so-tamanho", "checkpoint": 3, "kind": "unittest", "test_class": "TestValidarCpf", "target": "validar_cpf",
    "implementation": "def validar_cpf(texto):\n    return len([c for c in texto if c.isdigit()]) == 11\n",
    "expect": "fail", "name": "Pega a versão que só confere o tamanho", "hint": "Teste um CPF de 11 dígitos com um verificador errado." },
  { "id": "mutante-repetidos", "checkpoint": 3, "kind": "unittest", "test_class": "TestValidarCpf", "target": "validar_cpf",
    "implementation": "def validar_cpf(texto):\n    digitos = [int(c) for c in texto if c.isdigit()]\n    if len(digitos) != 11:\n        return False\n    for tamanho in (9, 10):\n        soma = sum(d * p for d, p in zip(digitos[:tamanho], range(tamanho + 1, 1, -1)))\n        if digitos[tamanho] != soma * 10 % 11 % 10:\n            return False\n    return True\n",
    "expect": "fail", "name": "Pega a versão que aceita os 11 dígitos iguais", "hint": "Dígitos todos iguais passam na conta dos verificadores." },
  { "id": "mutante-primeiro-dv", "checkpoint": 3, "kind": "unittest", "test_class": "TestValidarCpf", "target": "validar_cpf",
    "implementation": "def validar_cpf(texto):\n    digitos = [int(c) for c in texto if c.isdigit()]\n    if len(digitos) != 11 or len(set(digitos)) == 1:\n        return False\n    soma = sum(d * p for d, p in zip(digitos[:9], range(10, 1, -1)))\n    return digitos[9] == soma * 10 % 11 % 10\n",
    "expect": "fail", "name": "Pega a versão que confere só o primeiro verificador", "hint": "Teste um CPF com o primeiro verificador certo e o segundo errado." }
]
```

### Soluções erradas
```python name="só casos válidos"
import unittest


def validar_cpf(texto):
    digitos = [int(c) for c in texto if c.isdigit()]
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return False
    for tamanho in (9, 10):
        pesos = range(tamanho + 1, 1, -1)
        soma = sum(d * p for d, p in zip(digitos[:tamanho], pesos))
        if digitos[tamanho] != soma * 10 % 11 % 10:
            return False
    return True


class TestValidarCpf(unittest.TestCase):
    def test_valido_com_pontuacao(self):
        self.assertTrue(validar_cpf("529.982.247-25"))

    def test_valido_so_digitos(self):
        self.assertTrue(validar_cpf("52998224725"))

    def test_outro_valido(self):
        self.assertTrue(validar_cpf("529 982 247 25"))

    def test_valido_de_novo(self):
        self.assertEqual(validar_cpf("52998224725"), True)
```
```python name="esquece os dígitos repetidos"
import unittest


def validar_cpf(texto):
    digitos = [int(c) for c in texto if c.isdigit()]
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return False
    for tamanho in (9, 10):
        pesos = range(tamanho + 1, 1, -1)
        soma = sum(d * p for d, p in zip(digitos[:tamanho], pesos))
        if digitos[tamanho] != soma * 10 % 11 % 10:
            return False
    return True


class TestValidarCpf(unittest.TestCase):
    def test_valido_com_pontuacao(self):
        self.assertTrue(validar_cpf("529.982.247-25"))

    def test_valido_so_digitos(self):
        self.assertTrue(validar_cpf("52998224725"))

    def test_segundo_verificador_errado(self):
        self.assertFalse(validar_cpf("529.982.247-24"))

    def test_primeiro_verificador_errado(self):
        self.assertFalse(validar_cpf("529.982.247-15"))

    def test_tamanho_errado(self):
        self.assertFalse(validar_cpf("5299822472"))
```
```python name="erra só o primeiro verificador"
import unittest


def validar_cpf(texto):
    digitos = [int(c) for c in texto if c.isdigit()]
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return False
    for tamanho in (9, 10):
        pesos = range(tamanho + 1, 1, -1)
        soma = sum(d * p for d, p in zip(digitos[:tamanho], pesos))
        if digitos[tamanho] != soma * 10 % 11 % 10:
            return False
    return True


class TestValidarCpf(unittest.TestCase):
    def test_valido_com_pontuacao(self):
        self.assertTrue(validar_cpf("529.982.247-25"))

    def test_valido_so_digitos(self):
        self.assertTrue(validar_cpf("52998224725"))

    def test_primeiro_verificador_errado(self):
        self.assertFalse(validar_cpf("529.982.247-15"))

    def test_digitos_repetidos(self):
        self.assertFalse(validar_cpf("111.111.111-11"))

    def test_tamanho_errado(self):
        self.assertFalse(validar_cpf("5299822472"))
```
```python name="sem CPF com pontuação"
import unittest


def validar_cpf(texto):
    digitos = [int(c) for c in texto if c.isdigit()]
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return False
    for tamanho in (9, 10):
        pesos = range(tamanho + 1, 1, -1)
        soma = sum(d * p for d, p in zip(digitos[:tamanho], pesos))
        if digitos[tamanho] != soma * 10 % 11 % 10:
            return False
    return True


class TestValidarCpf(unittest.TestCase):
    def test_valido_so_digitos(self):
        self.assertTrue(validar_cpf("52998224725"))

    def test_segundo_verificador_errado(self):
        self.assertFalse(validar_cpf("52998224724"))

    def test_primeiro_verificador_errado(self):
        self.assertFalse(validar_cpf("52998224715"))

    def test_digitos_repetidos(self):
        self.assertFalse(validar_cpf("11111111111"))
```
```python name="espera o resultado errado"
import unittest


def validar_cpf(texto):
    digitos = [int(c) for c in texto if c.isdigit()]
    if len(digitos) != 11 or len(set(digitos)) == 1:
        return False
    for tamanho in (9, 10):
        pesos = range(tamanho + 1, 1, -1)
        soma = sum(d * p for d, p in zip(digitos[:tamanho], pesos))
        if digitos[tamanho] != soma * 10 % 11 % 10:
            return False
    return True


class TestValidarCpf(unittest.TestCase):
    def test_valido_com_pontuacao(self):
        self.assertTrue(validar_cpf("529.982.247-25"))

    def test_valido_so_digitos(self):
        self.assertTrue(validar_cpf("52998224725"))

    def test_segundo_verificador_errado(self):
        self.assertFalse(validar_cpf("529.982.247-24"))

    def test_primeiro_verificador_errado(self):
        self.assertFalse(validar_cpf("529.982.247-15"))

    def test_digitos_repetidos(self):
        self.assertTrue(validar_cpf("111.111.111-11"))
```

## Passo 4 · Leitura · setUp e um teste por comportamento

Para testar uma `ContaBancaria`, quase todo teste começa igual: criar uma conta com saldo conhecido. Em vez de repetir essa linha, escreva o método `setUp`, que o `unittest` chama **antes de cada teste**:

```python
class TestContaBancaria(unittest.TestCase):
    def setUp(self):
        self.conta = ContaBancaria("Ana", 100.0)

    def test_deposito_soma_ao_saldo(self):
        self.conta.depositar(50.0)
        self.assertEqual(self.conta.saldo, 150.0)

    def test_saque_acima_do_saldo_e_recusado(self):
        with self.assertRaises(SaldoInsuficiente):
            self.conta.sacar(500.0)
```

Cada teste recebe uma conta **nova**, com 100 de saldo, mesmo que o teste anterior tenha depositado ou sacado. Se precisar desfazer algo depois de cada teste (apagar um arquivo criado, por exemplo), o método é `tearDown`, que roda depois de cada teste, mesmo quando ele falha.

#### Testes independentes

A ordem em que os testes rodam não é a ordem em que você os escreveu: o `unittest` roda em ordem alfabética do nome. Um teste que depende de outro ter rodado antes (uma conta criada no nível da classe, que um teste deixa com 150 e o seguinte espera 150) passa ou falha conforme os nomes. Por isso o estado vai no `setUp`, e cada teste prepara tudo de que precisa.

#### Um teste por comportamento

Dê a cada teste **um** comportamento, e diga qual no nome: `test_saque_acima_do_saldo_e_recusado` falhando já conta o que quebrou, sem você abrir o código. Um `test_conta` com dez asserções para no primeiro erro e esconde os outros nove.

Teste o **comportamento** que quem usa a classe vê (o saldo depois do saque, a exceção levantada), não detalhes internos, como o nome de uma variável dentro do método. Assim você pode reescrever o método sem reescrever os testes.

#### Asserção com mensagem útil

`self.assertTrue(conta.saldo == 150)` falha com `AssertionError: False is not true`, que não diz nada. `self.assertEqual(conta.saldo, 150)` falha com `AssertionError: 100.0 != 150`, que mostra os dois valores. Prefira sempre a asserção específica.

## Passo 5 · Previsão · Quando o setUp roda

Este programa roda uma suíte de dois testes direto no código, sem o terminal (o `stream=io.StringIO()` esconde o relatório do `unittest`, para sobrarem só os `print`). Leia com atenção a ordem dos métodos e digite exatamente o que ele imprime.

### Código
```python
import io
import unittest


class TestOrdem(unittest.TestCase):
    def setUp(self):
        print("setUp")

    def test_b(self):
        print("test_b")

    def test_a(self):
        print("test_a")

    def tearDown(self):
        print("tearDown")


suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestOrdem)
resultado = unittest.TextTestRunner(stream=io.StringIO()).run(suite)
print(resultado.testsRun, resultado.wasSuccessful())
```

### Dicas
1. O `setUp` e o `tearDown` rodam uma vez para **cada** teste, não uma vez para a classe.
2. Os testes rodam em ordem alfabética do nome do método.
3. A última linha mostra quantos testes rodaram e se todos passaram.

### Saída esperada
```text
setUp
test_a
tearDown
setUp
test_b
tearDown
2 True
```

## Passo 6 · Exercício · A suíte da conta bancária

Escreva `TestContaBancaria` para a classe do código inicial, com um `setUp` que cria `self.conta = ContaBancaria("Ana", 100.0)` e **um teste para cada comportamento** da tabela:

| Comportamento | Exemplo |
|---|---|
| depositar soma ao saldo | depositar 50.0 deixa 150.0 |
| depósito zero ou negativo levanta `ValueError` | `depositar(0)` e `depositar(-10)` |
| sacar desconta do saldo | sacar 30.0 deixa 70.0 |
| sacar o saldo inteiro é permitido | sacar 100.0 deixa 0.0 |
| saque acima do saldo levanta `SaldoInsuficiente` | `sacar(100.01)` |
| saque recusado não muda o saldo | depois do `sacar(500.0)` recusado, o saldo continua 100.0 |

A verificação troca a `ContaBancaria` por versões com defeito, uma para cada linha da tabela, e roda a sua suíte contra cada uma: em todas, algum teste seu precisa falhar.

### Instruções
1. Crie a classe `TestContaBancaria` com o `setUp` que prepara a conta da Ana.
2. Teste o depósito: a soma e a recusa de zero e de valor negativo.
3. Teste o saque: o desconto, o saque do saldo inteiro, a exceção `SaldoInsuficiente` e o saldo intacto depois da recusa.
   Dica: para o saldo intacto, faça o saque dentro de `with self.assertRaises(...)` e confira o saldo depois do `with`.

### Código inicial
```python
import unittest


class SaldoInsuficiente(Exception):
    pass


class ContaBancaria:
    def __init__(self, titular, saldo=0.0):
        self.titular = titular
        self.saldo = saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self.saldo += valor

    def sacar(self, valor):
        if valor > self.saldo:
            raise SaldoInsuficiente(f"saldo {self.saldo}, saque {valor}")
        self.saldo -= valor


class TestContaBancaria(unittest.TestCase):
    pass
```

### Solução
```python
import unittest


class SaldoInsuficiente(Exception):
    pass


class ContaBancaria:
    def __init__(self, titular, saldo=0.0):
        self.titular = titular
        self.saldo = saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self.saldo += valor

    def sacar(self, valor):
        if valor > self.saldo:
            raise SaldoInsuficiente(f"saldo {self.saldo}, saque {valor}")
        self.saldo -= valor


class TestContaBancaria(unittest.TestCase):
    def setUp(self):
        self.conta = ContaBancaria("Ana", 100.0)

    def test_deposito_soma_ao_saldo(self):
        self.conta.depositar(50.0)
        self.assertEqual(self.conta.saldo, 150.0)

    def test_deposito_zero_ou_negativo_e_recusado(self):
        with self.assertRaises(ValueError):
            self.conta.depositar(0)
        with self.assertRaises(ValueError):
            self.conta.depositar(-10)

    def test_saque_desconta_do_saldo(self):
        self.conta.sacar(30.0)
        self.assertEqual(self.conta.saldo, 70.0)

    def test_saque_do_saldo_inteiro(self):
        self.conta.sacar(100.0)
        self.assertEqual(self.conta.saldo, 0.0)

    def test_saque_acima_do_saldo_levanta_excecao(self):
        with self.assertRaises(SaldoInsuficiente):
            self.conta.sacar(100.01)

    def test_saque_recusado_nao_muda_o_saldo(self):
        with self.assertRaises(SaldoInsuficiente):
            self.conta.sacar(500.0)
        self.assertEqual(self.conta.saldo, 100.0)
```

### Dicas
1. Dentro dos testes, use sempre `self.conta`, criada de novo pelo `setUp` antes de cada um.
2. Para a exceção do saque, passe a classe exata, `SaldoInsuficiente`: um `assertRaises(Exception)` aceita qualquer erro, até o errado.
3. O depósito de zero e o de valor negativo são dois limites diferentes: teste os dois.

### Verificação
```json
[
  { "id": "usa-setup", "checkpoint": 1, "kind": "source", "rule": { "type": "defines_function", "name": "setUp" },
    "name": "A suíte usa setUp", "hint": "Crie a conta da Ana no método setUp." },
  { "id": "referencia", "checkpoint": 1, "kind": "expr",
    "setup": "import io, unittest\nclass ContaBancaria:\n    def __init__(self, titular, saldo=0.0):\n        self.titular = titular\n        self.saldo = saldo\n    def depositar(self, valor):\n        if valor <= 0:\n            raise ValueError('positivo')\n        self.saldo += valor\n    def sacar(self, valor):\n        if valor > self.saldo:\n            raise SaldoInsuficiente('sem saldo')\n        self.saldo -= valor\nr = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestContaBancaria))",
    "expr": "[r.wasSuccessful(), r.testsRun >= 6]", "expected": [true, true],
    "name": "Pelo menos 6 testes, todos passando com a conta correta", "hint": "Um teste por linha da tabela; confira os saldos esperados." },
  { "id": "mutante-deposito-negativo", "checkpoint": 2, "kind": "expr",
    "setup": "import io, unittest\nclass ContaBancaria:\n    def __init__(self, titular, saldo=0.0):\n        self.titular = titular\n        self.saldo = saldo\n    def depositar(self, valor):\n        self.saldo += valor\n    def sacar(self, valor):\n        if valor > self.saldo:\n            raise SaldoInsuficiente('sem saldo')\n        self.saldo -= valor\nr = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestContaBancaria))",
    "expr": "r.wasSuccessful()", "expected": false, "name": "Pega o depósito que aceita valor negativo" },
  { "id": "mutante-deposito-zero", "checkpoint": 2, "kind": "expr",
    "setup": "import io, unittest\nclass ContaBancaria:\n    def __init__(self, titular, saldo=0.0):\n        self.titular = titular\n        self.saldo = saldo\n    def depositar(self, valor):\n        if valor < 0:\n            raise ValueError('positivo')\n        self.saldo += valor\n    def sacar(self, valor):\n        if valor > self.saldo:\n            raise SaldoInsuficiente('sem saldo')\n        self.saldo -= valor\nr = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestContaBancaria))",
    "expr": "r.wasSuccessful()", "expected": false, "name": "Pega o depósito que aceita zero", "hint": "Zero é o limite: teste depositar(0)." },
  { "id": "mutante-saldo-negativo", "checkpoint": 3, "kind": "expr",
    "setup": "import io, unittest\nclass ContaBancaria:\n    def __init__(self, titular, saldo=0.0):\n        self.titular = titular\n        self.saldo = saldo\n    def depositar(self, valor):\n        if valor <= 0:\n            raise ValueError('positivo')\n        self.saldo += valor\n    def sacar(self, valor):\n        self.saldo -= valor\nr = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestContaBancaria))",
    "expr": "r.wasSuccessful()", "expected": false, "name": "Pega o saque que deixa o saldo negativo" },
  { "id": "mutante-maior-ou-igual", "checkpoint": 3, "kind": "expr",
    "setup": "import io, unittest\nclass ContaBancaria:\n    def __init__(self, titular, saldo=0.0):\n        self.titular = titular\n        self.saldo = saldo\n    def depositar(self, valor):\n        if valor <= 0:\n            raise ValueError('positivo')\n        self.saldo += valor\n    def sacar(self, valor):\n        if valor >= self.saldo:\n            raise SaldoInsuficiente('sem saldo')\n        self.saldo -= valor\nr = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestContaBancaria))",
    "expr": "r.wasSuccessful()", "expected": false, "name": "Pega o saque que recusa o saldo inteiro", "hint": "Teste sacar exatamente o saldo." },
  { "id": "mutante-desconta-antes", "checkpoint": 3, "kind": "expr",
    "setup": "import io, unittest\nclass ContaBancaria:\n    def __init__(self, titular, saldo=0.0):\n        self.titular = titular\n        self.saldo = saldo\n    def depositar(self, valor):\n        if valor <= 0:\n            raise ValueError('positivo')\n        self.saldo += valor\n    def sacar(self, valor):\n        self.saldo -= valor\n        if self.saldo < 0:\n            raise SaldoInsuficiente('sem saldo')\nr = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestContaBancaria))",
    "expr": "r.wasSuccessful()", "expected": false, "name": "Pega o saque recusado que mesmo assim desconta", "hint": "Depois de um saque recusado, confira o saldo." },
  { "id": "mutante-valueerror", "checkpoint": 3, "kind": "expr",
    "setup": "import io, unittest\nclass ContaBancaria:\n    def __init__(self, titular, saldo=0.0):\n        self.titular = titular\n        self.saldo = saldo\n    def depositar(self, valor):\n        if valor <= 0:\n            raise ValueError('positivo')\n        self.saldo += valor\n    def sacar(self, valor):\n        if valor > self.saldo:\n            raise ValueError('sem saldo')\n        self.saldo -= valor\nr = unittest.TextTestRunner(stream=io.StringIO()).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestContaBancaria))",
    "expr": "r.wasSuccessful()", "expected": false, "name": "Pega o saque que levanta a exceção errada", "hint": "Exija SaldoInsuficiente, não uma exceção qualquer." }
]
```

### Soluções erradas
```python name="assertRaises(Exception) aceita a exceção errada"
import unittest


class SaldoInsuficiente(Exception):
    pass


class ContaBancaria:
    def __init__(self, titular, saldo=0.0):
        self.titular = titular
        self.saldo = saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self.saldo += valor

    def sacar(self, valor):
        if valor > self.saldo:
            raise SaldoInsuficiente(f"saldo {self.saldo}, saque {valor}")
        self.saldo -= valor


class TestContaBancaria(unittest.TestCase):
    def setUp(self):
        self.conta = ContaBancaria("Ana", 100.0)

    def test_deposito_soma_ao_saldo(self):
        self.conta.depositar(50.0)
        self.assertEqual(self.conta.saldo, 150.0)

    def test_deposito_zero_ou_negativo_e_recusado(self):
        with self.assertRaises(ValueError):
            self.conta.depositar(0)
        with self.assertRaises(ValueError):
            self.conta.depositar(-10)

    def test_saque_desconta_do_saldo(self):
        self.conta.sacar(30.0)
        self.assertEqual(self.conta.saldo, 70.0)

    def test_saque_do_saldo_inteiro(self):
        self.conta.sacar(100.0)
        self.assertEqual(self.conta.saldo, 0.0)

    def test_saque_acima_do_saldo_levanta_excecao(self):
        with self.assertRaises(Exception):
            self.conta.sacar(100.01)

    def test_saque_recusado_nao_muda_o_saldo(self):
        with self.assertRaises(Exception):
            self.conta.sacar(500.0)
        self.assertEqual(self.conta.saldo, 100.0)
```
```python name="não confere o saldo depois da recusa"
import unittest


class SaldoInsuficiente(Exception):
    pass


class ContaBancaria:
    def __init__(self, titular, saldo=0.0):
        self.titular = titular
        self.saldo = saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self.saldo += valor

    def sacar(self, valor):
        if valor > self.saldo:
            raise SaldoInsuficiente(f"saldo {self.saldo}, saque {valor}")
        self.saldo -= valor


class TestContaBancaria(unittest.TestCase):
    def setUp(self):
        self.conta = ContaBancaria("Ana", 100.0)

    def test_deposito_soma_ao_saldo(self):
        self.conta.depositar(50.0)
        self.assertEqual(self.conta.saldo, 150.0)

    def test_deposito_zero_ou_negativo_e_recusado(self):
        with self.assertRaises(ValueError):
            self.conta.depositar(0)
        with self.assertRaises(ValueError):
            self.conta.depositar(-10)

    def test_saque_desconta_do_saldo(self):
        self.conta.sacar(30.0)
        self.assertEqual(self.conta.saldo, 70.0)

    def test_saque_do_saldo_inteiro(self):
        self.conta.sacar(100.0)
        self.assertEqual(self.conta.saldo, 0.0)

    def test_saque_acima_do_saldo_levanta_excecao(self):
        with self.assertRaises(SaldoInsuficiente):
            self.conta.sacar(100.01)

    def test_saque_muito_acima(self):
        with self.assertRaises(SaldoInsuficiente):
            self.conta.sacar(500.0)
```
```python name="testa só o depósito negativo, não o zero"
import unittest


class SaldoInsuficiente(Exception):
    pass


class ContaBancaria:
    def __init__(self, titular, saldo=0.0):
        self.titular = titular
        self.saldo = saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self.saldo += valor

    def sacar(self, valor):
        if valor > self.saldo:
            raise SaldoInsuficiente(f"saldo {self.saldo}, saque {valor}")
        self.saldo -= valor


class TestContaBancaria(unittest.TestCase):
    def setUp(self):
        self.conta = ContaBancaria("Ana", 100.0)

    def test_deposito_soma_ao_saldo(self):
        self.conta.depositar(50.0)
        self.assertEqual(self.conta.saldo, 150.0)

    def test_deposito_negativo_e_recusado(self):
        with self.assertRaises(ValueError):
            self.conta.depositar(-10)

    def test_saque_desconta_do_saldo(self):
        self.conta.sacar(30.0)
        self.assertEqual(self.conta.saldo, 70.0)

    def test_saque_do_saldo_inteiro(self):
        self.conta.sacar(100.0)
        self.assertEqual(self.conta.saldo, 0.0)

    def test_saque_acima_do_saldo_levanta_excecao(self):
        with self.assertRaises(SaldoInsuficiente):
            self.conta.sacar(100.01)

    def test_saque_recusado_nao_muda_o_saldo(self):
        with self.assertRaises(SaldoInsuficiente):
            self.conta.sacar(500.0)
        self.assertEqual(self.conta.saldo, 100.0)
```
```python name="sem o saque do saldo inteiro"
import unittest


class SaldoInsuficiente(Exception):
    pass


class ContaBancaria:
    def __init__(self, titular, saldo=0.0):
        self.titular = titular
        self.saldo = saldo

    def depositar(self, valor):
        if valor <= 0:
            raise ValueError("o depósito precisa ser positivo")
        self.saldo += valor

    def sacar(self, valor):
        if valor > self.saldo:
            raise SaldoInsuficiente(f"saldo {self.saldo}, saque {valor}")
        self.saldo -= valor


class TestContaBancaria(unittest.TestCase):
    def setUp(self):
        self.conta = ContaBancaria("Ana", 100.0)

    def test_deposito_soma_ao_saldo(self):
        self.conta.depositar(50.0)
        self.assertEqual(self.conta.saldo, 150.0)

    def test_deposito_zero_ou_negativo_e_recusado(self):
        with self.assertRaises(ValueError):
            self.conta.depositar(0)
        with self.assertRaises(ValueError):
            self.conta.depositar(-10)

    def test_saque_desconta_do_saldo(self):
        self.conta.sacar(30.0)
        self.assertEqual(self.conta.saldo, 70.0)

    def test_saque_pequeno(self):
        self.conta.sacar(1.0)
        self.assertEqual(self.conta.saldo, 99.0)

    def test_saque_acima_do_saldo_levanta_excecao(self):
        with self.assertRaises(SaldoInsuficiente):
            self.conta.sacar(100.01)

    def test_saque_recusado_nao_muda_o_saldo(self):
        with self.assertRaises(SaldoInsuficiente):
            self.conta.sacar(500.0)
        self.assertEqual(self.conta.saldo, 100.0)
```

## Passo 7 · Exercício · O teste que passa por engano

A suíte de `media(notas)` do código inicial passa inteira, e mesmo assim não protege nada. Ela tem três defeitos, um em cada teste:

- um teste usa `assertTrue` com dois argumentos: o segundo argumento de `assertTrue` é a **mensagem** de erro, então o teste só confere se o primeiro valor é verdadeiro;
- outro compara a função com ela mesma, o que é sempre igual;
- e um método nunca roda.

A função `media` está correta: ela devolve a média e levanta `ValueError` para a lista vazia. Corrija **os testes**, mantendo os mesmos casos e sem mexer na função. A verificação roda a sua suíte contra versões de `media` com defeito: uma que divide sempre por 2, uma que usa a divisão inteira `//` e uma que devolve `0.0` para a lista vazia.

### Instruções
1. Faça o teste das três notas comparar `media([6, 7, 8])` com `7.0`.
2. Faça o teste das duas notas comparar `media([1, 2])` com o valor que você calcula de cabeça, `1.5`.
3. Faça o teste da lista vazia rodar.
   Dica: confira o nome do método.

### Código inicial
```python
import unittest


def media(notas):
    if not notas:
        raise ValueError("lista vazia não tem média")
    return sum(notas) / len(notas)


class TestMedia(unittest.TestCase):
    def test_tres_notas(self):
        self.assertTrue(media([6, 7, 8]), 7.0)

    def test_duas_notas(self):
        self.assertEqual(media([1, 2]), media([1, 2]))

    def media_vazia(self):
        with self.assertRaises(ValueError):
            media([])
```

### Solução
```python
import unittest


def media(notas):
    if not notas:
        raise ValueError("lista vazia não tem média")
    return sum(notas) / len(notas)


class TestMedia(unittest.TestCase):
    def test_tres_notas(self):
        self.assertEqual(media([6, 7, 8]), 7.0)

    def test_duas_notas(self):
        self.assertEqual(media([1, 2]), 1.5)

    def test_media_vazia(self):
        with self.assertRaises(ValueError):
            media([])
```

### Dicas
1. `assertTrue(10.5, 7.0)` passa: `10.5` é verdadeiro e `7.0` vira só a mensagem. A asserção que compara dois valores é outra.
2. O valor esperado de um teste vem de fora do código testado: calcule à mão.
3. Métodos que não começam com `test` não rodam e não dão aviso.

### Verificação
```json
[
  { "id": "referencia", "checkpoint": 3, "kind": "unittest", "test_class": "TestMedia", "target": "media",
    "implementation": "def media(notas):\n    if not notas:\n        raise ValueError('lista vazia')\n    return sum(notas) / len(notas)\n",
    "expect": "pass", "min_tests": 3, "name": "Os três testes rodam e passam com a média correta", "hint": "Os três métodos precisam começar com test." },
  { "id": "mutante-divide-por-2", "checkpoint": 1, "kind": "unittest", "test_class": "TestMedia", "target": "media",
    "implementation": "def media(notas):\n    if not notas:\n        raise ValueError('lista vazia')\n    return sum(notas) / 2\n",
    "expect": "fail", "name": "Pega a média que divide sempre por 2", "hint": "O teste das três notas precisa comparar o resultado com 7.0." },
  { "id": "mutante-divisao-inteira", "checkpoint": 2, "kind": "unittest", "test_class": "TestMedia", "target": "media",
    "implementation": "def media(notas):\n    if not notas:\n        raise ValueError('lista vazia')\n    return sum(notas) // len(notas)\n",
    "expect": "fail", "name": "Pega a média com divisão inteira", "hint": "Compare media([1, 2]) com um valor fixo, não com a própria função." },
  { "id": "mutante-vazia-zero", "checkpoint": 3, "kind": "unittest", "test_class": "TestMedia", "target": "media",
    "implementation": "def media(notas):\n    if not notas:\n        return 0.0\n    return sum(notas) / len(notas)\n",
    "expect": "fail", "name": "Pega a média que devolve 0.0 para a lista vazia", "hint": "O teste da lista vazia está escrito, mas não roda." },
  { "id": "suite-propria", "checkpoint": 3, "kind": "unittest", "test_class": "TestMedia", "expect": "pass", "min_tests": 3,
    "name": "A suíte passa com a sua media", "hint": "Corrija os testes, não a função." }
]
```

### Soluções erradas
```python name="corrige só o prefixo"
import unittest


def media(notas):
    if not notas:
        raise ValueError("lista vazia não tem média")
    return sum(notas) / len(notas)


class TestMedia(unittest.TestCase):
    def test_tres_notas(self):
        self.assertTrue(media([6, 7, 8]), 7.0)

    def test_duas_notas(self):
        self.assertEqual(media([1, 2]), media([1, 2]))

    def test_media_vazia(self):
        with self.assertRaises(ValueError):
            media([])
```
```python name="mantém o assertTrue com dois argumentos"
import unittest


def media(notas):
    if not notas:
        raise ValueError("lista vazia não tem média")
    return sum(notas) / len(notas)


class TestMedia(unittest.TestCase):
    def test_tres_notas(self):
        self.assertTrue(media([6, 7, 8]), 7.0)

    def test_duas_notas(self):
        self.assertEqual(media([1, 2]), 1.5)

    def test_media_vazia(self):
        with self.assertRaises(ValueError):
            media([])
```
```python name="mantém a comparação da função com ela mesma"
import unittest


def media(notas):
    if not notas:
        raise ValueError("lista vazia não tem média")
    return sum(notas) / len(notas)


class TestMedia(unittest.TestCase):
    def test_tres_notas(self):
        self.assertEqual(media([6, 7, 8]), 7.0)

    def test_duas_notas(self):
        self.assertEqual(media([1, 2]), media([1, 2]))

    def test_media_vazia(self):
        with self.assertRaises(ValueError):
            media([])
```
```python name="apaga o teste da lista vazia"
import unittest


def media(notas):
    if not notas:
        raise ValueError("lista vazia não tem média")
    return sum(notas) / len(notas)


class TestMedia(unittest.TestCase):
    def test_tres_notas(self):
        self.assertEqual(media([6, 7, 8]), 7.0)

    def test_duas_notas(self):
        self.assertEqual(media([1, 2]), 1.5)
```

## Passo 8 · Quiz · Asserções

### Pergunta
Os dois testes abaixo falham com a mesma `media` defeituosa. Por que o segundo é melhor?
```python
self.assertTrue(media([6, 8]) == 7.0)
self.assertEqual(media([6, 8]), 7.0)
```
- [ ] Porque `assertEqual` roda mais rápido
- [ ] Porque `assertTrue` não funciona com números
- [x] Porque, ao falhar, `assertEqual` mostra os dois valores (`14.0 != 7.0`), e `assertTrue` mostra só `False is not true`
- [ ] Porque `assertEqual` corrige pequenas diferenças de arredondamento
> A asserção específica explica a falha. Com `assertTrue(a == b)`, a comparação vira um booleano antes de chegar ao `unittest`, e os valores se perdem.

### Pergunta
`self.assertEqual(0.1 + 0.2, 0.3)` falha. Qual é a correção?
- [ ] `self.assertTrue(0.1 + 0.2, 0.3)`
- [x] `self.assertAlmostEqual(0.1 + 0.2, 0.3)`
- [ ] `self.assertEqual(round(0.1 + 0.2), round(0.3))`
- [ ] `self.assertIn(0.3, [0.1 + 0.2])`
> `0.1 + 0.2` dá `0.30000000000000004`. `assertAlmostEqual` compara até a 7ª casa decimal. A versão com `assertTrue` passa sempre, e arredondar para inteiro compara `0` com `0`, o que aceitaria quase qualquer conta.

### Pergunta
A suíte tem `conta = ContaBancaria("Ana", 100.0)` no corpo da classe (fora de qualquer método), e os testes usam `self.conta`. `test_deposito` deposita 50; `test_saldo_inicial` espera 100. O que acontece?
- [ ] Os dois passam, porque cada teste recebe uma cópia da conta
- [x] `test_deposito` roda antes, por ordem alfabética, e deixa a conta compartilhada com 150: `test_saldo_inicial` falha
- [ ] O `unittest` recusa atributos no corpo da classe
- [ ] Os dois falham, porque a conta só existe no `setUp`
> Um atributo no corpo da classe é criado uma vez e compartilhado por todos os testes. O resultado passa a depender da ordem dos nomes. Criar a conta no `setUp` dá a cada teste um objeto novo.
