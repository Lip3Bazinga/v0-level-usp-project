import { Global, Module } from "@nestjs/common"
import { GamificationRepository } from "./gamification.repository"
import { GamificationService } from "./gamification.service"

@Global()
@Module({ providers: [GamificationRepository, GamificationService], exports: [GamificationService] })
export class GamificationModule {}
