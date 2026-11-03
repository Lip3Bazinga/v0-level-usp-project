import { randomInt } from "node:crypto"
import { SAO_PAULO_TIME_ZONE } from "@/common/time/time"

/** Sem caracteres ambíguos (0/O, 1/I/L) — o código é digitado à mão. */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const CODE_BLOCK_LENGTH = 4

/** Código de verificação legível: LVL-XXXX-XXXX (31^8 ≈ 2^39,6 combinações). */
export function generateVerificationCode(randomBelow: (max: number) => number = randomInt): string {
  const block = (): string => Array.from({ length: CODE_BLOCK_LENGTH }, () => CODE_ALPHABET.charAt(randomBelow(CODE_ALPHABET.length))).join("")
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
  return new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: SAO_PAULO_TIME_ZONE })
}

/** URL pública de verificação. */
export function verificationUrl(appOrigin: string, code: string): string {
  return `${appOrigin.replace(/\/+$/, "")}/certificado/${encodeURIComponent(code)}`
}
