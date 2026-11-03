/**
 * Envia um e-mail de teste com a MESMA configuração da API (SMTP_URL, MAIL_FROM,
 * tempos-limite, TLS e novas tentativas).
 *
 *   dev:        pnpm --filter @levelusp/api mail:test destino@exemplo.com
 *   container:  docker compose exec api node dist/cli/mail-test.js destino@exemplo.com
 *   VM:         infra/scripts/levelusp-vm.sh mail-test destino@exemplo.com
 *
 * Sai com código 0 se o servidor SMTP aceitou a mensagem.
 */
import "reflect-metadata"
import { existsSync } from "node:fs"
import { loadEnv } from "@/config/env"
import { MailService } from "@/infra/mail/mail.service"
import { createMailTransport } from "@/infra/mail/mail.transport"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const LOCAL_ENV_FILE = ".env"

function print(line: string): void {
  process.stdout.write(`${line}\n`)
}

function fail(line: string): never {
  process.stderr.write(`${line}\n`)
  process.exit(1)
}

/** Nome da classe e mensagem do erro, sem a pilha (pode conter a URL com senha em versões antigas). */
function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  const responseCode: unknown = Reflect.get(error, "responseCode")
  return `${error.name}: ${error.message}${typeof responseCode === "number" ? ` (resposta SMTP ${responseCode})` : ""}`
}

async function main(): Promise<void> {
  const recipient = process.argv[2]
  if (!recipient || !EMAIL_PATTERN.test(recipient)) fail("Uso: mail:test <email-de-destino>")
  if (existsSync(LOCAL_ENV_FILE)) process.loadEnvFile(LOCAL_ENV_FILE)

  const env = loadEnv()
  const transport = createMailTransport(env)
  if (!transport) fail("SMTP_URL não está definido: a API só registraria o e-mail no log. Configure SMTP_URL e rode de novo.")

  const mail = new MailService(env, transport)
  const host = new URL(env.SMTP_URL ?? "").host
  print(`Conectando a ${host} (TLS obrigatório: ${env.SMTP_REQUIRE_TLS ? "sim" : "não"}, tempo-limite ${env.SMTP_TIMEOUT_MS} ms)…`)
  await mail.verifyConnection()
  print("Conexão e autenticação OK. Enviando…")
  await mail.send({
    to: recipient,
    subject: "LevelUSP — e-mail de teste",
    text: `Este é um e-mail de teste do LevelUSP (${env.APP_ENV}).\n\nSe chegou, o SMTP está funcionando. Os links da plataforma usarão ${env.PUBLIC_BASE_URL}.\n`,
  })
  print(`Enviado para ${recipient} a partir de ${env.MAIL_FROM}. Confira a caixa de entrada e o spam.`)
}

main().catch((error: unknown) => fail(`Falha no envio: ${describeError(error)}`))
