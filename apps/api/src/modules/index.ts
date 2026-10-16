import { AuditModule } from "./audit/audit.module"
import { AuthModule } from "./auth/auth.module"
import { GamificationModule } from "./gamification/gamification.module"
import { HealthModule } from "./health/health.module"
import { LearningModule } from "./learning/learning.module"
import { UsersModule } from "./users/users.module"

/**
 * Módulos de funcionalidade. Cada um é dono do seu pedaço do domínio:
 * controller (HTTP fino) → service (regras) → repository (SQL via Drizzle).
 */
export const FEATURE_MODULES = [
  HealthModule,
  AuditModule,
  GamificationModule,
  AuthModule,
  UsersModule,
  LearningModule,
]
