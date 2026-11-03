import { Global, Module } from "@nestjs/common"
import { ENV } from "@/config/config.module"
import type { Env } from "@/config/env"
import { MailService } from "./mail.service"
import { MAIL_TRANSPORT, createMailTransport, type MailTransport } from "./mail.transport"

@Global()
@Module({
  providers: [
    { provide: MAIL_TRANSPORT, inject: [ENV], useFactory: (env: Env): MailTransport | null => createMailTransport(env) },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
