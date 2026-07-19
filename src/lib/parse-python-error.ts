interface ParsedError {
  title: string
  explanation: string
  hint: string
  original: string
}

const ERROR_PATTERNS: {
  pattern: RegExp
  title: string
  explanation: (match: RegExpMatchArray) => string
  hint: (match: RegExpMatchArray) => string
}[] = [
  {
    pattern: /SyntaxError: invalid syntax/,
    title: "Erro de Sintaxe",
    explanation: () =>
      "O Python encontrou algo inesperado no seu codigo. Geralmente isso acontece quando falta algum simbolo como dois-pontos (:), parenteses ou aspas.",
    hint: () =>
      "Verifique se todas as aspas e parenteses estao fechados corretamente e se ha dois-pontos apos if, for, def, etc.",
  },
  {
    pattern: /SyntaxError: EOL while scanning string literal/,
    title: "String nao fechada",
    explanation: () =>
      "Voce comecou uma string (texto) com aspas mas esqueceu de fecha-la.",
    hint: () =>
      'Certifique-se de que toda string tenha aspas de abertura e fechamento: "texto" ou \'texto\'.',
  },
  {
    pattern: /NameError: name '(\w+)' is not defined/,
    title: "Variavel nao encontrada",
    explanation: (m) =>
      `O Python nao reconhece '${m[1]}'. Isso significa que essa variavel ou funcao ainda nao foi criada.`,
    hint: (m) =>
      `Verifique se voce escreveu '${m[1]}' corretamente (incluindo maiusculas e minusculas) e se a variavel foi criada antes de ser usada.`,
  },
  {
    pattern: /TypeError: unsupported operand type\(s\) for (.+): '(\w+)' and '(\w+)'/,
    title: "Tipos incompativeis",
    explanation: (m) =>
      `Voce tentou usar o operador '${m[1]}' entre um valor do tipo '${m[2]}' e um do tipo '${m[3]}', o que nao e permitido.`,
    hint: () =>
      "Converta os valores para o mesmo tipo antes de operar. Use int(), float() ou str() para converter.",
  },
  {
    pattern: /TypeError: can only concatenate str \(not "(\w+)"\) to str/,
    title: "Nao e possivel juntar texto com numero",
    explanation: (m) =>
      `Voce tentou juntar (concatenar) um texto com um valor do tipo '${m[1]}'. O Python nao permite isso diretamente.`,
    hint: () =>
      'Use f-strings para combinar texto e variaveis: f"Valor: {variavel}" ou converta com str().',
  },
  {
    pattern: /IndentationError: (.+)/,
    title: "Erro de Indentacao",
    explanation: () =>
      "O Python usa espacos no inicio das linhas para organizar o codigo. Algo esta fora do lugar.",
    hint: () =>
      "Use 4 espacos para indentar o codigo dentro de if, for, def e outros blocos. Nao misture espacos com tabs.",
  },
  {
    pattern: /IndexError: list index out of range/,
    title: "Indice fora do alcance",
    explanation: () =>
      "Voce tentou acessar uma posicao da lista que nao existe. Lembre-se: listas comecam na posicao 0.",
    hint: () =>
      "Se uma lista tem 3 itens, os indices validos sao 0, 1 e 2. Use len(lista) para verificar o tamanho.",
  },
  {
    pattern: /KeyError: (.+)/,
    title: "Chave nao encontrada",
    explanation: (m) =>
      `A chave ${m[1]} nao existe no dicionario. Voce tentou acessar um dado que nao foi cadastrado.`,
    hint: () =>
      'Use .get("chave", valor_padrao) para acessar chaves de forma segura, ou verifique com "if chave in dicionario".',
  },
  {
    pattern: /ZeroDivisionError/,
    title: "Divisao por zero",
    explanation: () =>
      "Voce tentou dividir um numero por zero, o que e impossivel na matematica e na programacao.",
    hint: () =>
      "Antes de dividir, verifique se o divisor e diferente de zero: if divisor != 0.",
  },
  {
    pattern: /ValueError: invalid literal for int\(\) with base 10: '(.+)'/,
    title: "Valor invalido para conversao",
    explanation: (m) =>
      `Voce tentou converter '${m[1]}' para um numero inteiro, mas esse valor nao e um numero valido.`,
    hint: () =>
      "Certifique-se de que o texto que voce esta convertendo contenha apenas digitos. Use .strip() para remover espacos extras.",
  },
  {
    pattern: /AttributeError: '(\w+)' object has no attribute '(\w+)'/,
    title: "Atributo nao encontrado",
    explanation: (m) =>
      `Objetos do tipo '${m[1]}' nao possuem o atributo ou metodo '${m[2]}'.`,
    hint: (m) =>
      `Verifique a documentacao do tipo '${m[1]}' para ver os metodos disponiveis. Pode ser um erro de digitacao.`,
  },
  {
    pattern: /ImportError: No module named '(\w+)'/,
    title: "Modulo nao encontrado",
    explanation: (m) =>
      `O modulo '${m[1]}' nao esta disponivel neste ambiente.`,
    hint: () =>
      "Verifique se o nome do modulo esta correto. Nem todos os modulos Python estao disponiveis no navegador.",
  },
  {
    pattern: /RecursionError/,
    title: "Recursao infinita",
    explanation: () =>
      "Sua funcao ficou chamando a si mesma sem parar, criando um loop infinito de chamadas.",
    hint: () =>
      "Verifique se sua funcao recursiva tem um caso base (condicao de parada) correto.",
  },
  {
    pattern: /TypeError: (\w+)\(\) takes (\d+) positional argument[s]? but (\d+) (?:was|were) given/,
    title: "Numero errado de argumentos",
    explanation: (m) =>
      `A funcao '${m[1]}' espera ${m[2]} argumento(s), mas voce passou ${m[3]}.`,
    hint: (m) =>
      `Verifique a definicao da funcao '${m[1]}' e passe exatamente ${m[2]} argumento(s).`,
  },
]

export function parsePythonError(rawError: string): ParsedError {
  // Extrai a ultima linha relevante do traceback
  const lines = rawError.trim().split("\n")
  const errorLine = lines[lines.length - 1] || rawError

  for (const { pattern, title, explanation, hint } of ERROR_PATTERNS) {
    const match = errorLine.match(pattern) || rawError.match(pattern)
    if (match) {
      return {
        title,
        explanation: explanation(match),
        hint: hint(match),
        original: rawError,
      }
    }
  }

  // Fallback generico
  return {
    title: "Erro na execucao",
    explanation:
      "O Python encontrou um problema ao executar seu codigo. Leia a mensagem original abaixo para mais detalhes.",
    hint: "Releia seu codigo com atencao e verifique se tudo esta escrito corretamente.",
    original: rawError,
  }
}
