import { Inject, Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { isTransientMailError, withRetry } from "./mail-retry"
import { MAIL_TRANSPORT, type MailTransport } from "./mail.transport"

/** E-mail em texto puro (os links de senha vão no corpo). */
export interface MailMessage {
  to: string
  subject: string
  text: string
}

/** Espera antes da 2ª tentativa (depois 2×, 4×…). */
const RETRY_BASE_DELAY_MS = 1_000

/** Só o domínio do destinatário vai para o log de falhas (o e-mail é dado pessoal). */
function recipientDomain(address: string): string {
  return address.split("@").pop() ?? "?"
}

/**
 * Envio de e-mail. Sem SMTP configurado (dev/homolog no notebook), o conteúdo
 * vai para o log — o admin consegue repassar links de redefinição de senha.
 * Falhas sobem para quem chamou: cabe ao service decidir a resposta HTTP
 * (nunca a mensagem interna do SMTP).
 */
@Injectable()
export class MailService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailService.name)

  constructor(
    @Inject(ENV) private readonly env: Env,
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport | null,
  ) {}

  /** Confere a conexão SMTP na partida, só para registrar no log (não bloqueia a API). */
  onApplicationBootstrap(): void {
    if (!this.transport) {
      if (this.env.APP_ENV === "prod") this.logger.warn("SMTP_URL não definido em produção: links de senha e convite irão para o log da API")
      return
    }
    void this.verifyConnection().then(
      () => this.logger.log("SMTP conectado e autenticado"),
      (error: unknown) => this.logger.error({ err: error }, "SMTP configurado, mas a conexão de teste falhou — e-mails de senha e convite não serão entregues"),
    )
  }

  get isConfigured(): boolean {
    return this.transport !== null
  }

  /** Abre uma conexão, negocia TLS e autentica, sem enviar nada. */
  async verifyConnection(): Promise<void> {
    if (this.transport) await this.transport.verify()
  }

  async send(message: MailMessage): Promise<void> {
    const transport = this.transport
    if (!transport) {
      this.logger.warn({ to: message.to, subject: message.subject, text: message.text }, "SMTP não configurado — e-mail registrado no log")
      return
    }
    await withRetry(() => transport.sendMail({ from: this.env.MAIL_FROM, ...message }), {
      maxAttempts: this.env.MAIL_MAX_ATTEMPTS,
      baseDelayMs: RETRY_BASE_DELAY_MS,
      shouldRetry: isTransientMailError,
      onRetry: (error, failedAttempt) =>
        this.logger.warn({ err: error, attempt: failedAttempt, domain: recipientDomain(message.to) }, "falha temporária no SMTP; tentando de novo"),
    })
  }
}
