import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { UserRole } from "@levelusp/contracts"
import { IS_PUBLIC, OPTIONAL_AUTH, ROLES } from "@/common/decorators/auth.decorators"
import { Forbidden, Unauthorized } from "@/common/errors/app-error"
import { type AuthenticatedRequest, readSessionCookie } from "@/common/http/request"
import { AuthService } from "./auth.service"

/**
 * Guard global: toda rota exige sessão, exceto as marcadas com @Public().
 * Também aplica @Roles(). Deny-by-default — esquecer um decorator fecha a rota,
 * não abre.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()]
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)
    const isOptionalAuth = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH, targets)
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, targets)

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = readSessionCookie(request)
    if (token && (!isPublic || isOptionalAuth)) {
      request.user = (await this.auth.resolveSession(token)) ?? undefined
    }
    if (isPublic || isOptionalAuth) return true
    if (!request.user) throw Unauthorized()
    if (roles?.length && !roles.includes(request.user.role)) throw Forbidden()
    return true
  }
}
