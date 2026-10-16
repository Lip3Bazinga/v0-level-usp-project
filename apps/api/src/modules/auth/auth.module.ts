import { Global, Module } from "@nestjs/common"
import { APP_GUARD } from "@nestjs/core"
import { AuthController } from "./auth.controller"
import { AuthRepository } from "./auth.repository"
import { AuthService } from "./auth.service"
import { PasswordService } from "./password.service"
import { SessionGuard } from "./session.guard"

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, PasswordService, { provide: APP_GUARD, useClass: SessionGuard }],
  exports: [AuthService, PasswordService, AuthRepository],
})
export class AuthModule {}
