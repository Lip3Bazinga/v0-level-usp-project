import { type CanActivate, type ExecutionContext, Injectable } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import type { UserRole } from "@levelusp/contracts"
import { IS_PUBLIC, OPTIONAL_AUTH, ROLES } from "@/common/decorators/auth.decorators"
import { Forbidden, Unauthorized } from "@/common/errors/app-error"
import { type AuthenticatedRequest, SESSION_COOKIE } from "@/common/http/request"
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

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()]
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)
    const optional = this.reflector.getAllAndOverride<boolean>(OPTIONAL_AUTH, targets)
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, targets)

    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>()
    const token = (req.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE]
    if (token && (!isPublic || optional)) {
      req.user = (await this.auth.resolveSession(token)) ?? undefined
    }
    if (isPublic || optional) return true
    if (!req.user) throw Unauthorized()
    if (roles?.length && !roles.includes(req.user.role)) throw Forbidden()
    return true
  }
}
