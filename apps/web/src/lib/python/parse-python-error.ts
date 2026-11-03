/** Erro do Python traduzido para quem está começando, com a mensagem original preservada. */
export interface ParsedPythonError {
  title: string
  explanation: string
  hint: string
  original: string
}

interface ErrorPattern {
  pattern: RegExp
  title: string
  explanation: (match: RegExpMatchArray) => string
  hint: (match: RegExpMatchArray) => string
}

const ERROR_PATTERNS: readonly ErrorPattern[] = [
  {
    pattern: /SyntaxError: invalid syntax/,
    title: "Erro de Sintaxe",
    explanation: () =>
      "O Python encontrou algo inesperado no seu codigo. Geralmente isso acontece quando falta algum simbolo como dois-pontos (:), parenteses ou aspas.",
    hint: () =>
      "Verifique se todas as aspas e parenteses estao fechados corretamente e se ha dois-pontos apos if, for, def, etc.",
  },
  {
    pattern: /SyntaxError: (?:unterminated (?:triple-quoted )?string literal|EOL while scanning string literal)/,
    title: "String nao fechada",
    explanation: () =>
      "Voce comecou uma string (texto) com aspas mas esqueceu de fecha-la.",
    hint: () =>
      'Certifique-se de que toda string tenha aspas de abertura e fechamento: "texto" ou \'texto\'.',
  },
  {
    pattern: /SyntaxError: expected ':'/,
    title: "Faltou dois-pontos",
    explanation: () =>
      "Linhas que abrem um bloco (if, elif, else, for, while, def, class, try, with) terminam com dois-pontos (:).",
    hint: () => "Coloque ':' no fim da linha indicada, por exemplo: if idade >= 18:",
  },
  {
    pattern: /SyntaxError: '([([{])' was never closed/,
    title: "Simbolo aberto e nao fechado",
    explanation: (match) => `Voce abriu '${match[1]}' e nao fechou antes do fim do codigo.`,
    hint: () => "Confira se cada '(' tem um ')', cada '[' tem um ']' e cada '{' tem um '}'.",
  },
  {
    pattern: /NameError: name '(exit|quit)' is not defined/,
    title: "exit() nao disponivel",
    explanation: (match) =>
      `Aqui o Python roda sem o modulo site, entao ${match[1]}() nao existe (nem no Executar, nem no Verificar).`,
    hint: () => "Para encerrar o programa use sys.exit() (depois de import sys), ou reorganize o codigo com return/break.",
  },
  {
    pattern: /NameError: name '(\w+)' is not defined(?:\. Did you mean: '(\w+)'\?)?/,
    title: "Variavel nao encontrada",
    explanation: (match) =>
      `O Python nao reconhece '${match[1]}'. Isso significa que essa variavel ou funcao ainda nao foi criada.`,
    hint: (match) =>
      match[2]
        ? `Voce quis dizer '${match[2]}'? Confira maiusculas, minusculas e a grafia do nome.`
        : `Verifique se voce escreveu '${match[1]}' corretamente (incluindo maiusculas e minusculas) e se a variavel foi criada antes de ser usada.`,
  },
  {
    pattern: /TypeError: unsupported operand type\(s\) for (.+): '(\w+)' and '(\w+)'/,
    title: "Tipos incompativeis",
    explanation: (match) =>
      `Voce tentou usar o operador '${match[1]}' entre um valor do tipo '${match[2]}' e um do tipo '${match[3]}', o que nao e permitido.`,
    hint: () =>
      "Converta os valores para o mesmo tipo antes de operar. Use int(), float() ou str() para converter.",
  },
  {
    pattern: /TypeError: can only concatenate str \(not "(\w+)"\) to str/,
    title: "Nao e possivel juntar texto com numero",
    explanation: (match) =>
      `Voce tentou juntar (concatenar) um texto com um valor do tipo '${match[1]}'. O Python nao permite isso diretamente.`,
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
    pattern: /IndexError: (?:list|string|tuple|range object) index out of range/,
    title: "Indice fora do alcance",
    explanation: () =>
      "Voce tentou acessar uma posicao da lista que nao existe. Lembre-se: listas comecam na posicao 0.",
    hint: () =>
      "Se uma lista tem 3 itens, os indices validos sao 0, 1 e 2. Use len(lista) para verificar o tamanho.",
  },
  {
    pattern: /KeyError: (.+)/,
    title: "Chave nao encontrada",
    explanation: (match) =>
      `A chave ${match[1]} nao existe no dicionario. Voce tentou acessar um dado que nao foi cadastrado.`,
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
    explanation: (match) =>
      `Voce tentou converter '${match[1]}' para um numero inteiro, mas esse valor nao e um numero valido.`,
    hint: () =>
      "Certifique-se de que o texto que voce esta convertendo contenha apenas digitos. Use .strip() para remover espacos extras.",
  },
  {
    pattern: /AttributeError: '(\w+)' object has no attribute '(\w+)'/,
    title: "Atributo nao encontrado",
    explanation: (match) =>
      `Objetos do tipo '${match[1]}' nao possuem o atributo ou metodo '${match[2]}'.`,
    hint: (match) =>
      `Verifique a documentacao do tipo '${match[1]}' para ver os metodos disponiveis. Pode ser um erro de digitacao.`,
  },
  {
    pattern: /(?:ModuleNotFoundError|ImportError): No module named '([\w.]+)'/,
    title: "Modulo nao encontrado",
    explanation: (match) =>
      `O modulo '${match[1]}' nao esta disponivel neste ambiente.`,
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
    pattern: /TypeError: ([\w.]+)\(\) takes (\d+) positional argument[s]? but (\d+) (?:was|were) given/,
    title: "Numero errado de argumentos",
    explanation: (match) =>
      `A funcao '${match[1]}' espera ${match[2]} argumento(s), mas voce passou ${match[3]}.`,
    hint: (match) =>
      `Verifique a definicao da funcao '${match[1]}' e passe exatamente ${match[2]} argumento(s).`,
  },
  {
    pattern: /EOFError: EOF when reading a line/,
    title: "input() sem entrada",
    explanation: () =>
      "O programa chamou input(), mas nao havia nenhuma linha de entrada para ler. O botao Executar roda o programa sem teclado: todo input() recebe 'fim da entrada'.",
    hint: () =>
      "Para testar no Executar, troque temporariamente o input() por um valor fixo (ex.: nome = \"Ana\"). No Verificar, as entradas vem dos casos de teste.",
  },
]

function matchPattern(text: string): { errorPattern: ErrorPattern; match: RegExpMatchArray } | null {
  for (const errorPattern of ERROR_PATTERNS) {
    const match = text.match(errorPattern.pattern)
    if (match) return { errorPattern, match }
  }
  return null
}

/**
 * Procura os padrões primeiro na última linha do traceback (onde o Python põe o
 * tipo do erro) e só depois no texto inteiro: assim uma linha de código citada
 * no traceback não "rouba" a explicação do erro de verdade.
 */
export function parsePythonError(rawError: string): ParsedPythonError {
  const lines = rawError.trim().split("\n")
  const errorLine = lines[lines.length - 1] || rawError

  const found = matchPattern(errorLine) ?? matchPattern(rawError)
  if (found) {
    const { errorPattern, match } = found
    return { title: errorPattern.title, explanation: errorPattern.explanation(match), hint: errorPattern.hint(match), original: rawError }
  }

  return {
    title: "Erro na execucao",
    explanation:
      "O Python encontrou um problema ao executar seu codigo. Leia a mensagem original abaixo para mais detalhes.",
    hint: "Releia seu codigo com atencao e verifique se tudo esta escrito corretamente.",
    original: rawError,
  }
}
