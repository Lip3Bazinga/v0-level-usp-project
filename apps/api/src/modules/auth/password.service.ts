import { Injectable } from "@nestjs/common"
import { randomUUID } from "node:crypto"
import { Algorithm, hash, verify } from "@node-rs/argon2"
import bcrypt from "bcryptjs"

/** Parâmetros OWASP para argon2id (19 MiB, 2 iterações, 1 via). */
const ARGON_OPTS = { algorithm: Algorithm.Argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const

@Injectable()
export class PasswordService {
  private dummy?: Promise<string>

  hash(password: string): Promise<string> {
    return hash(password, ARGON_OPTS)
  }

  /** Aceita argon2id e bcrypt (hashes migrados do Supabase Auth). */
  async verify(storedHash: string | null | undefined, password: string): Promise<boolean> {
    if (!storedHash) {
      // Mesmo custo de uma verificação real: não revela se o e-mail existe.
      this.dummy ??= this.hash(randomUUID())
      await verify(await this.dummy, password).catch(() => false)
      return false
    }
    try {
      if (storedHash.startsWith("$argon2")) return await verify(storedHash, password)
      if (/^\$2[aby]\$/.test(storedHash)) return await bcrypt.compare(password, storedHash)
    } catch {
      return false
    }
    return false
  }

  /** Hashes legados (bcrypt) são trocados por argon2id no próximo login. */
  needsRehash(storedHash: string): boolean {
    return !storedHash.startsWith("$argon2id$")
  }
}
