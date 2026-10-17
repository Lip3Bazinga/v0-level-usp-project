import { createHash, randomBytes } from "node:crypto"

const TOKEN_BYTES = 32

/** Token opaco de 256 bits (base64url) — vai no cookie; o banco guarda só o hash. */
export function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
