import { Module } from "@nestjs/common"
import { UsersModule } from "../users/users.module"
import { AccountController } from "./account.controller"
import { AccountRepository } from "./account.repository"
import { AccountService } from "./account.service"

@Module({
  imports: [UsersModule],
  controllers: [AccountController],
  providers: [AccountRepository, AccountService],
  exports: [AccountService, AccountRepository],
})
export class AccountModule {}
