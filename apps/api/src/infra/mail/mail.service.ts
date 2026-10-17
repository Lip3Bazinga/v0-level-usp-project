import { Inject, Injectable, Logger } from "@nestjs/common"
import nodemailer, { type Transporter } from "nodemailer"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"

export interface MailMessage {
  to: string
  subject: string
  text: string
}

/**
 * Envio de e-mail. Sem SMTP configurado (dev/homolog no notebook), o conteúdo
 * vai para o log — o admin consegue repassar links de redefinição de senha.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private readonly transport: Transporter | null

  constructor(@Inject(ENV) private readonly env: Env) {
    this.transport = env.SMTP_URL ? nodemailer.createTransport(env.SMTP_URL) : null
  }

  async send(msg: MailMessage): Promise<void> {
    if (!this.transport) {
      this.logger.warn({ to: msg.to, subject: msg.subject, text: msg.text }, "SMTP não configurado — e-mail registrado no log")
      return
    }
    await this.transport.sendMail({ from: this.env.MAIL_FROM, ...msg })
  }
}
