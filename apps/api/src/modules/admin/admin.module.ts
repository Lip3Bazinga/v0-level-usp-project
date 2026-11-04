import { Module } from "@nestjs/common"
import { AccountModule } from "../account/account.module"
import { UsersModule } from "../users/users.module"
import { AdminBadgesController } from "./admin-badges.controller"
import { AdminController } from "./admin.controller"
import { AdminRepository } from "./admin.repository"
import { AdminService } from "./admin.service"

/**
 * Administração. Aprovações de professor e bibliotecas ficam nos módulos
 * teacher-requests e library (rotas /admin/* com @Roles("admin")).
 */
@Module({
  imports: [AccountModule, UsersModule],
  controllers: [AdminController, AdminBadgesController],
  providers: [AdminRepository, AdminService],
})
export class AdminModule {}
