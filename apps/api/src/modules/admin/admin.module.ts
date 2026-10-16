import { Module } from "@nestjs/common"
import { AccountModule } from "../account/account.module"
import { AdminBadgesController } from "./admin-badges.controller"
import { AdminController } from "./admin.controller"
import { AdminRepository } from "./admin.repository"
import { AdminService } from "./admin.service"

/**
 * Administração (🛡️ admin). Aprovações de professor e bibliotecas ficam nos
 * módulos teacher-requests e library (rotas /admin/* com @Roles("admin")).
 */
@Module({
  imports: [AccountModule],
  controllers: [AdminController, AdminBadgesController],
  providers: [AdminRepository, AdminService],
})
export class AdminModule {}
