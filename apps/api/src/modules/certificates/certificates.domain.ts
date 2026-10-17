import { randomInt } from "node:crypto"

/** Sem caracteres ambíguos (0/O, 1/I/L) — o código é digitado à mão. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

/** Código de verificação legível: LVL-XXXX-XXXX (31^8 ≈ 2^39,6 combinações). */
export function generateVerificationCode(rand: (max: number) => number = randomInt): string {
  const block = () => Array.from({ length: 4 }, () => CODE_ALPHABET[rand(CODE_ALPHABET.length)]).join("")
  return `LVL-${block()}-${block()}`
}

/**
 * Normaliza o código digitado/colado (espaços, caixa). Aceita também os
 * códigos legados (ex.: LU-XXXXX-XXXXX). Devolve null se não for plausível.
 */
export function normalizeCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase()
  return /^[A-Z0-9][A-Z0-9-]{3,63}$/.test(code) ? code : null
}

/** "87.5" → "87,5%". */
export function formatScore(score: number): string {
  return `${score.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
}

/** Data por extenso no fuso de São Paulo: "16 de outubro de 2026". */
export function formatIssuedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })
}

/** URL pública de verificação. */
export function verificationUrl(appOrigin: string, code: string): string {
  return `${appOrigin.replace(/\/+$/, "")}/certificado/${encodeURIComponent(code)}`
}
