import { describe, expect, it } from "vitest"
import { toCsv } from "./csv"

describe("toCsv", () => {
  it("neutraliza injeção de fórmula em campos de texto (=, +, -, @, TAB, CR)", () => {
    const csv = toCsv([
      { nome: '=HYPERLINK("https://evil.example","clique")' },
      { nome: "+1+cmd|' /C calc'!A0" },
      { nome: "-2+3" },
      { nome: "@SUM(A1:A2)" },
      { nome: "\t=1+1" },
      { nome: "\r=1+1" },
    ])
    const cells = csv.split("\n").slice(1)
    expect(cells).toEqual(['"\'=HYPERLINK(""https://evil.example"",""clique"")"', "\"'+1+cmd|' /C calc'!A0\"", '"\'-2+3"', '"\'@SUM(A1:A2)"', '"\'\t=1+1"', '"\'\r=1+1"'])
  })

  it("mantém números (inclusive negativos) e textos comuns intactos", () => {
    expect(toCsv([{ xp: -5, nome: "Ana", data: "2026-11-03" }])).toBe('xp,nome,data\n"-5","Ana","2026-11-03"')
  })

  it("escapa aspas e devolve vazio sem linhas", () => {
    expect(toCsv([{ nome: 'Diz "oi"' }])).toBe('nome\n"Diz ""oi"""')
    expect(toCsv([])).toBe("")
  })
})
