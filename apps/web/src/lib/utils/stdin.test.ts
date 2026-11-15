import { describe, expect, it } from "vitest"
import { callsInput, countStdinLines } from "./stdin"

describe("callsInput", () => {
  it.each([
    ["nome = input()", true],
    ["idade = int(input('Idade: '))", true],
    ["x = input ()", true],
    ["print('oi')", false],
    ["entrada = 3", false],
    ["meu_input(1)", false],
    ["leitor.input()", false],
    ["", false],
  ])("%s → %s", (code, expected) => {
    expect(callsInput(code)).toBe(expected)
  })
})

describe("countStdinLines", () => {
  it.each([
    ["", 0],
    ["Ana", 1],
    ["Ana\n", 1],
    ["Ana\n20", 2],
    ["Ana\n\n20\n", 3],
  ])("%j → %i", (stdin, expected) => {
    expect(countStdinLines(stdin)).toBe(expected)
  })
})
