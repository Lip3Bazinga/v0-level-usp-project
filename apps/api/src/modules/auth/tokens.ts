import { createHash, randomBytes } from "node:crypto"

/** Token opaco de 256 bits (base64url) — vai no cookie; o banco guarda só o hash. */
export function newToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}
