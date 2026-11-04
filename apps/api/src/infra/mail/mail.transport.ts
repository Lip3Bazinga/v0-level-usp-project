import nodemailer from "nodemailer"
import type { SMTPTransportOptions } from "nodemailer/lib/smtp-transport"
import type { Env } from "@/config/env"

/** Token de injeção do transporte SMTP (substituído por um falso nos testes). */
export const MAIL_TRANSPORT = Symbol("MAIL_TRANSPORT")

/** Mensagem pronta para o transporte SMTP (remetente já resolvido). */
export interface OutgoingMail {
  from: string
  to: string
  subject: string
  text: string
}

/** O que o `MailService` usa do nodemailer (interface pequena: troca fácil nos testes). */
export interface MailTransport {
  sendMail(message: OutgoingMail): Promise<unknown>
  verify(): Promise<unknown>
}

type SmtpEnv = Pick<Env, "SMTP_URL" | "SMTP_REQUIRE_TLS" | "SMTP_TIMEOUT_MS">

/**
 * Opções do SMTP a partir da URL:
 *  - `smtps://…:465` → TLS desde o início (`secure`, definido pela própria URL);
 *  - `smtp://…:587`  → STARTTLS; com `SMTP_REQUIRE_TLS` o envio falha se o servidor
 *    não oferecer TLS (senha e links de redefinição nunca trafegam em claro).
 * Os tempos-limite padrão do nodemailer chegam a 10 minutos; aqui são curtos para
 * que um SMTP fora do ar não segure conexões nem atrase as novas tentativas.
 */
export function buildSmtpOptions(env: SmtpEnv & { SMTP_URL: string }): SMTPTransportOptions {
  const isImplicitTls = env.SMTP_URL.startsWith("smtps://")
  return {
    url: env.SMTP_URL,
    requireTLS: !isImplicitTls && env.SMTP_REQUIRE_TLS,
    connectionTimeout: env.SMTP_TIMEOUT_MS,
    greetingTimeout: env.SMTP_TIMEOUT_MS,
    socketTimeout: env.SMTP_TIMEOUT_MS,
    dnsTimeout: env.SMTP_TIMEOUT_MS,
  }
}

/** `null` sem SMTP configurado: o `MailService` registra o e-mail no log. */
export function createMailTransport(env: SmtpEnv): MailTransport | null {
  if (!env.SMTP_URL) return null
  return nodemailer.createTransport(buildSmtpOptions({ ...env, SMTP_URL: env.SMTP_URL }))
}
