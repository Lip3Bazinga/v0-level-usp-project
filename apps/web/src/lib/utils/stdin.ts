const INPUT_CALL = /(?<![\w.])input\s*\(/

/**
 * Se o código chama `input()`. É só uma pista para a interface abrir o campo "Entrada (stdin)":
 * olha o texto, então um `input(` dentro de um comentário ou de uma string também conta.
 */
export function callsInput(code: string): boolean {
  return INPUT_CALL.test(code)
}

/** Quantas linhas o texto da entrada oferece a `input()` (a última não precisa terminar em quebra de linha). */
export function countStdinLines(stdin: string): number {
  if (stdin === "") return 0
  const lines = stdin.split("\n")
  return lines.at(-1) === "" ? lines.length - 1 : lines.length
}
